const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const PORT = process.env.PORT || 4173;
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const loadouts = {
  occultist: "Occultist",
  sentinel: "Sentinel",
  medium: "Medium",
  alchemist: "Alchemist"
};

const contracts = [
  { name: "Ashbury Manor", signs: ["Cold breath", "No reflection", "Claw marks"], vampire: "Strigoi" },
  { name: "Saint Orla's Hospice", signs: ["Rat swarm", "Grave soil", "Whispering walls"], vampire: "Nosferatu" },
  { name: "Blackwater Theatre", signs: ["Blood mist", "Candle snuff", "Ancient lullaby"], vampire: "Moroaica" },
  { name: "Greywick Station", signs: ["Possessed voice", "Floating dust", "Black veins"], vampire: "Vetala" }
];

const profileColors = ["teal", "blue", "amber", "red"];
const profileTitles = ["New Blood", "Crypt Runner", "Ward Keeper", "Night Medic", "Relic Hunter"];
const rooms = new Map();

app.use(express.static(PUBLIC_DIR));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    rooms: rooms.size
  });
});

function makeCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i += 1) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }
  return code;
}

function makeRoom(code = makeCode()) {
  const contract = randomContract();
  return {
    code,
    hostId: null,
    contract: contract.name,
    vampire: contract.vampire,
    signs: contract.signs,
    phase: "lobby",
    fear: 18,
    moon: 45,
    funds: 640,
    players: {},
    logs: [`Lobby ${code} created.`],
    evidence: [],
    wards: [],
    result: null
  };
}

function publicRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    contract: room.contract,
    phase: room.phase,
    fear: room.fear,
    moon: room.moon,
    funds: room.funds,
    players: Object.values(room.players),
    logs: room.logs.slice(-12),
    signs: room.signs,
    evidence: room.evidence,
    wards: room.wards,
    result: room.result,
    revealedVampire: room.evidence.length >= 3 || room.phase === "complete" ? room.vampire : "Unknown"
  };
}

function getRoom(code) {
  const normalized = String(code || "").trim().toUpperCase();
  return rooms.get(normalized);
}

function emitRoom(room) {
  io.to(room.code).emit("room:state", publicRoom(room));
}

function addLog(room, message) {
  room.logs.push(message);
  room.logs = room.logs.slice(-24);
}

function randomContract() {
  return contracts[Math.floor(Math.random() * contracts.length)];
}

function sanitizeText(value, fallback, maxLength = 20) {
  const text = String(value || "").replace(/[^\w .'-]/g, "").trim();
  return (text || fallback).slice(0, maxLength);
}

function sanitizeChoice(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function isHost(socket, room) {
  return room.hostId === socket.id;
}

function requireHost(socket, room) {
  if (isHost(socket, room)) return true;
  socket.emit("notice", { type: "error", message: "Only the host can do that." });
  return false;
}

function assignNextHost(room) {
  Object.values(room.players).forEach((player) => {
    player.host = false;
  });
  const [nextHost] = Object.keys(room.players);
  room.hostId = nextHost || null;
  if (nextHost) room.players[nextHost].host = true;
}

function resetMatch(room, keepPhase = "lobby") {
  const contract = randomContract();
  room.contract = contract.name;
  room.vampire = contract.vampire;
  room.signs = contract.signs;
  room.phase = keepPhase;
  room.fear = 18;
  room.moon = 45;
  room.funds = 640;
  room.evidence = [];
  room.wards = [];
  room.result = null;
  Object.values(room.players).forEach((player) => {
    player.ready = false;
    player.position = { x: 1, y: 1 };
  });
}

io.on("connection", (socket) => {
  socket.on("room:create", (payload = {}, ack) => {
    let code = makeCode();
    while (rooms.has(code)) code = makeCode();

    const room = makeRoom(code);
    rooms.set(code, room);
    joinRoom(socket, room, payload);
    ack?.({ ok: true, room: publicRoom(room) });
  });

  socket.on("room:join", (payload = {}, ack) => {
    const code = String(payload.code || "").trim().toUpperCase();
    let room = getRoom(code);
    if (!room) {
      ack?.({ ok: false, message: "Room not found. Check the code or host a new lobby." });
      socket.emit("notice", { type: "error", message: "Room not found. Check the code or host a new lobby." });
      return;
    }

    joinRoom(socket, room, payload);
    ack?.({ ok: true, room: publicRoom(room) });
  });

  socket.on("player:update", (payload = {}) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || !room.players[socket.id]) return;

    const player = room.players[socket.id];
    if (payload.name) player.name = sanitizeText(payload.name, "Hunter");
    if (loadouts[payload.loadout]) player.loadout = payload.loadout;
    if (typeof payload.ready === "boolean") player.ready = payload.ready;
    if (payload.profile) {
      player.profile = {
        color: sanitizeChoice(payload.profile.color, profileColors, "teal"),
        title: sanitizeChoice(payload.profile.title, profileTitles, "New Blood")
      };
    }
    if (payload.position) {
      player.position = {
        x: Number(payload.position.x) || 1,
        y: Number(payload.position.y) || 1
      };
    }

    emitRoom(room);
  });

  socket.on("match:start", () => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    if (!requireHost(socket, room)) return;
    const players = Object.values(room.players);
    if (players.some((player) => !player.ready)) {
      addLog(room, "The host tried to start, but not everyone is ready.");
      emitRoom(room);
      return;
    }
    room.phase = "hunt";
    room.fear = 18;
    room.moon = 45;
    room.evidence = [];
    room.wards = [];
    room.result = null;
    addLog(room, "The van doors open. The hunt begins.");
    emitRoom(room);
  });

  socket.on("match:new-contract", () => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    if (!requireHost(socket, room)) return;
    resetMatch(room);
    addLog(room, `New contract loaded: ${room.contract}.`);
    emitRoom(room);
  });

  socket.on("match:seal", () => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;

    const inCrypt = player.position?.x === 4 && player.position?.y === 5;
    if (room.evidence.length >= 3 && inCrypt) {
      room.phase = "complete";
      room.result = "success";
      addLog(room, `${player.name} sealed the coffin. The ${room.vampire} is contained.`);
    } else {
      room.fear = Math.min(100, room.fear + 10);
      addLog(room, `${player.name} tried to seal too early. The manor pushes back.`);
    }
    emitRoom(room);
  });

  socket.on("match:event", (payload = {}) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    if (room.phase !== "hunt") return;

    if (payload.kind === "evidence" && room.signs.includes(payload.value) && !room.evidence.includes(payload.value)) {
      room.evidence.push(String(payload.value).slice(0, 32));
      room.funds += 90;
      room.fear = Math.max(0, room.fear - 6);
      addLog(room, `Evidence logged: ${payload.value}.`);
    }

    if (payload.kind === "ward") {
      room.wards.push({
        x: Number(payload.x) || 1,
        y: Number(payload.y) || 1
      });
      room.funds = Math.max(0, room.funds - 50);
      room.fear = Math.max(0, room.fear - 8);
      addLog(room, "A protective ward burns in the dark.");
    }

    if (payload.kind === "tick") {
      room.fear = Math.min(100, room.fear + 2);
      room.moon = Math.min(100, room.moon + 2);
    }

    if (room.fear >= 100 || room.moon >= 100) {
      room.phase = "complete";
      room.result = "failed";
      addLog(room, "The moon peaks. The bloodline escapes into the city.");
    }

    emitRoom(room);
  });

  socket.on("disconnect", () => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;

    const player = room.players[socket.id];
    delete room.players[socket.id];
    if (player) addLog(room, `${player.name} left the lobby.`);
    if (room.hostId === socket.id) assignNextHost(room);

    if (Object.keys(room.players).length === 0) {
      rooms.delete(room.code);
    } else {
      emitRoom(room);
    }
  });
});

function joinRoom(socket, room, payload) {
  leaveCurrentRoom(socket);

  socket.data.roomCode = room.code;
  socket.join(room.code);
  const isFirstPlayer = Object.keys(room.players).length === 0;
  room.players[socket.id] = {
    id: socket.id,
    name: sanitizeText(payload.name, "Hunter"),
    loadout: loadouts[payload.loadout] ? payload.loadout : "occultist",
    host: isFirstPlayer,
    ready: false,
    position: { x: 1, y: 1 },
    profile: {
      color: sanitizeChoice(payload.profile?.color, profileColors, "teal"),
      title: sanitizeChoice(payload.profile?.title, profileTitles, "New Blood")
    }
  };
  if (isFirstPlayer) room.hostId = socket.id;
  addLog(room, `${room.players[socket.id].name} joined the lobby.`);
  emitRoom(room);
}

function leaveCurrentRoom(socket) {
  const currentRoom = getRoom(socket.data.roomCode);
  if (!currentRoom || !currentRoom.players[socket.id]) return;

  const player = currentRoom.players[socket.id];
  delete currentRoom.players[socket.id];
  socket.leave(currentRoom.code);
  addLog(currentRoom, `${player.name} left the lobby.`);
  if (currentRoom.hostId === socket.id) assignNextHost(currentRoom);

  if (Object.keys(currentRoom.players).length === 0) {
    rooms.delete(currentRoom.code);
  } else {
    emitRoom(currentRoom);
  }
}

server.listen(PORT, () => {
  console.log(`Bloodline Protocol server listening on ${PORT}`);
});
