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
  "Ashbury Manor",
  "Saint Orla's Hospice",
  "Blackwater Theatre"
];

const vampires = ["Strigoi", "Nosferatu", "Moroaica", "Vetala"];
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
  return {
    code,
    contract: contracts[Math.floor(Math.random() * contracts.length)],
    vampire: vampires[Math.floor(Math.random() * vampires.length)],
    phase: "lobby",
    fear: 18,
    moon: 45,
    funds: 640,
    players: {},
    logs: [`Lobby ${code} created.`],
    evidence: [],
    wards: []
  };
}

function publicRoom(room) {
  return {
    code: room.code,
    contract: room.contract,
    phase: room.phase,
    fear: room.fear,
    moon: room.moon,
    funds: room.funds,
    players: Object.values(room.players),
    logs: room.logs.slice(-12),
    evidence: room.evidence,
    wards: room.wards,
    revealedVampire: room.evidence.length >= 3 ? room.vampire : "Unknown"
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
      room = makeRoom(code || "IRON");
      rooms.set(room.code, room);
    }

    joinRoom(socket, room, payload);
    ack?.({ ok: true, room: publicRoom(room) });
  });

  socket.on("player:update", (payload = {}) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || !room.players[socket.id]) return;

    const player = room.players[socket.id];
    if (payload.name) player.name = String(payload.name).slice(0, 20);
    if (loadouts[payload.loadout]) player.loadout = payload.loadout;
    if (typeof payload.ready === "boolean") player.ready = payload.ready;
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
    room.phase = "hunt";
    room.fear = 18;
    room.moon = 45;
    room.evidence = [];
    room.wards = [];
    addLog(room, "The van doors open. The hunt begins.");
    emitRoom(room);
  });

  socket.on("match:event", (payload = {}) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;

    if (payload.kind === "evidence" && payload.value && !room.evidence.includes(payload.value)) {
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

    emitRoom(room);
  });

  socket.on("disconnect", () => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;

    const player = room.players[socket.id];
    delete room.players[socket.id];
    if (player) addLog(room, `${player.name} left the lobby.`);

    if (Object.keys(room.players).length === 0) {
      rooms.delete(room.code);
    } else {
      emitRoom(room);
    }
  });
});

function joinRoom(socket, room, payload) {
  if (socket.data.roomCode) socket.leave(socket.data.roomCode);

  socket.data.roomCode = room.code;
  socket.join(room.code);
  room.players[socket.id] = {
    id: socket.id,
    name: String(payload.name || "Hunter").slice(0, 20),
    loadout: loadouts[payload.loadout] ? payload.loadout : "occultist",
    ready: false,
    position: { x: 1, y: 1 }
  };
  addLog(room, `${room.players[socket.id].name} joined the lobby.`);
  emitRoom(room);
}

server.listen(PORT, () => {
  console.log(`Bloodline Protocol server listening on ${PORT}`);
});
