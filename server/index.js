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

const profileColors = ["teal", "blue", "amber", "red"];
const profileTitles = ["New Blood", "Crypt Runner", "Ward Keeper", "Night Medic", "Relic Hunter"];
const contracts = [
  {
    name: "Ashbury Manor",
    objective: "Identify the bloodline, find the sealed crypt, and close the family coffin.",
    difficulty: "Standard",
    signs: ["Cold breath", "No reflection", "Claw marks"],
    vampire: "Strigoi",
    mapRows: [
      "############",
      "#S..#......#",
      "#...#..#...#",
      "#......#...#",
      "###.##...###",
      "#...C..#...#",
      "#..##..#...#",
      "#......K...#",
      "############"
    ],
    clueSpots: [{ x: 7, y: 1 }, { x: 5, y: 5 }, { x: 8, y: 7 }],
    cryptPosition: { x: 4, y: 5 },
    vampireStart: { x: 9, y: 1 }
  },
  {
    name: "Saint Orla's Hospice",
    objective: "Stabilize the ward, collect patient evidence, and seal the chapel ossuary.",
    difficulty: "Tense",
    signs: ["Rat swarm", "Grave soil", "Whispering walls"],
    vampire: "Nosferatu",
    mapRows: [
      "############",
      "#S.....#...#",
      "#.###..#.#.#",
      "#...#....#.#",
      "###.#.####.#",
      "#...#C.....#",
      "#.###..###.#",
      "#.....K....#",
      "############"
    ],
    clueSpots: [{ x: 6, y: 1 }, { x: 9, y: 5 }, { x: 5, y: 7 }],
    cryptPosition: { x: 5, y: 5 },
    vampireStart: { x: 10, y: 7 }
  },
  {
    name: "Blackwater Theatre",
    objective: "Trace the midnight performance, mark the stage relics, and bind the backstage coffin.",
    difficulty: "Aggressive",
    signs: ["Blood mist", "Candle snuff", "Ancient lullaby"],
    vampire: "Moroaica",
    mapRows: [
      "############",
      "#S....#....#",
      "#.##..#..#.#",
      "#......K.#.#",
      "#.####.#...#",
      "#....#.#C###",
      "###..#.....#",
      "#..........#",
      "############"
    ],
    clueSpots: [{ x: 5, y: 1 }, { x: 7, y: 3 }, { x: 2, y: 7 }],
    cryptPosition: { x: 8, y: 5 },
    vampireStart: { x: 9, y: 6 }
  },
  {
    name: "Greywick Station",
    objective: "Search the abandoned platform, map the possessed signal, and seal the baggage vault.",
    difficulty: "Hard",
    signs: ["Possessed voice", "Floating dust", "Black veins"],
    vampire: "Vetala",
    mapRows: [
      "############",
      "#S..#......#",
      "#.#.#.####.#",
      "#.#...#K...#",
      "#.#####.##.#",
      "#.....#C...#",
      "###.#.###..#",
      "#...#......#",
      "############"
    ],
    clueSpots: [{ x: 10, y: 1 }, { x: 7, y: 3 }, { x: 3, y: 7 }],
    cryptPosition: { x: 7, y: 5 },
    vampireStart: { x: 10, y: 5 }
  }
];
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
    objective: contract.objective,
    difficulty: contract.difficulty,
    vampire: contract.vampire,
    signs: contract.signs,
    mapRows: contract.mapRows,
    clueSpots: contract.clueSpots,
    cryptPosition: contract.cryptPosition,
    vampireStart: contract.vampireStart,
    phase: "lobby",
    fear: 18,
    moon: 45,
    funds: 640,
    players: {},
    logs: [`Lobby ${code} created.`],
    evidence: [],
    wards: [],
    vampirePosition: contract.vampireStart,
    threat: 0,
    result: null,
    rewards: null,
    tickCount: 0
  };
}

function publicRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    contract: room.contract,
    objective: room.objective,
    difficulty: room.difficulty,
    phase: room.phase,
    fear: room.fear,
    moon: room.moon,
    funds: room.funds,
    players: Object.values(room.players),
    logs: room.logs.slice(-12),
    signs: room.signs,
    mapRows: room.mapRows,
    clueSpots: room.clueSpots,
    cryptPosition: room.cryptPosition,
    vampireStart: room.vampireStart,
    evidence: room.evidence,
    wards: room.wards,
    vampirePosition: room.vampirePosition,
    threat: room.threat,
    result: room.result,
    rewards: room.rewards,
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
  room.objective = contract.objective;
  room.difficulty = contract.difficulty;
  room.vampire = contract.vampire;
  room.signs = contract.signs;
  room.mapRows = contract.mapRows;
  room.clueSpots = contract.clueSpots;
  room.cryptPosition = contract.cryptPosition;
  room.vampireStart = contract.vampireStart;
  room.phase = keepPhase;
  room.fear = 18;
  room.moon = 45;
  room.funds = 640;
  room.evidence = [];
  room.wards = [];
  room.vampirePosition = contract.vampireStart;
  room.threat = 0;
  room.result = null;
  room.rewards = null;
  room.tickCount = 0;
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
      const nextPosition = {
        x: Number(payload.position.x) || 1,
        y: Number(payload.position.y) || 1
      };
      if (isWalkable(room, nextPosition)) player.position = nextPosition;
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
    room.vampirePosition = room.vampireStart;
    room.threat = 0;
    room.result = null;
    room.rewards = null;
    room.tickCount = 0;
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

    const inCrypt = player.position?.x === room.cryptPosition.x && player.position?.y === room.cryptPosition.y;
    if (room.evidence.length >= 3 && inCrypt) {
      room.phase = "complete";
      room.result = "success";
      room.rewards = calculateRewards(room, true);
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

    if (payload.kind === "evidence") {
      const player = room.players[socket.id];
      const foundSign = findNearbySign(room, player);
      if (foundSign && !room.evidence.includes(foundSign)) {
        room.evidence.push(foundSign);
        room.funds += 90;
        room.fear = Math.max(0, room.fear - 6);
        room.threat = Math.min(100, room.threat + 6);
        addLog(room, `Evidence logged: ${foundSign}.`);
      } else {
        room.fear = Math.min(100, room.fear + 3);
        addLog(room, `${player?.name || "A hunter"} scans the dark but finds nothing certain.`);
      }
    }

    if (payload.kind === "ward") {
      room.wards.push({
        x: Number(payload.x) || 1,
        y: Number(payload.y) || 1
      });
      room.funds = Math.max(0, room.funds - 50);
      room.fear = Math.max(0, room.fear - 8);
      room.threat = Math.max(0, room.threat - 12);
      addLog(room, "A protective ward burns in the dark.");
    }

    if (payload.kind === "tick") {
      advanceHunt(room);
    }

    if (room.fear >= 100 || room.moon >= 100) {
      room.phase = "complete";
      room.result = "failed";
      room.rewards = calculateRewards(room, false);
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

function advanceHunt(room) {
  room.tickCount += 1;
  room.fear = Math.min(100, room.fear + 2);
  room.moon = Math.min(100, room.moon + 2);
  room.threat = Math.min(100, room.threat + 3 + room.evidence.length);

  const players = Object.values(room.players);
  if (players.length === 0) return;

  const target = nearestPlayer(room.vampirePosition, players);
  if (!target) return;

  const warded = room.wards.some((ward) => distance(ward, room.vampirePosition) <= 1);
  if (warded) {
    room.threat = Math.max(0, room.threat - 10);
    if (room.tickCount % 3 === 0) addLog(room, "A ward flares and the vampire recoils.");
  } else if (room.threat >= 18) {
    room.vampirePosition = nextStepToward(room, room.vampirePosition, target.position);
  }

  const proximity = distance(room.vampirePosition, target.position);
  if (proximity === 0) {
    room.fear = Math.min(100, room.fear + 20);
    room.threat = Math.max(0, room.threat - 15);
    addLog(room, `${target.name} is caught in the vampire's shadow.`);
  } else if (proximity === 1 && room.tickCount % 2 === 0) {
    room.fear = Math.min(100, room.fear + 10);
    addLog(room, `${target.name} hears movement right behind them.`);
  }

  if (room.threat >= 70 && room.tickCount % 4 === 0) {
    triggerHuntEvent(room, target);
  }
}

function findNearbySign(room, player) {
  if (!player?.position) return null;
  const radius = player.loadout === "occultist" ? 2 : 1;
  const clues = room.clueSpots.map((spot, index) => ({ ...spot, sign: room.signs[index] }));
  const clue = clues.find((item) => !room.evidence.includes(item.sign) && distance(item, player.position) <= radius);
  return clue?.sign || null;
}

function nearestPlayer(from, players) {
  return players
    .filter((player) => player.position)
    .sort((a, b) => distance(from, a.position) - distance(from, b.position))[0];
}

function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function nextStepToward(room, from, to) {
  const options = [
    { x: from.x + 1, y: from.y },
    { x: from.x - 1, y: from.y },
    { x: from.x, y: from.y + 1 },
    { x: from.x, y: from.y - 1 }
  ].filter((position) => isWalkableForRows(room.mapRows, position));

  return options.sort((a, b) => distance(a, to) - distance(b, to))[0] || from;
}

function isWalkable(room, position) {
  return isWalkableForRows(room.mapRows, position);
}

function isWalkableForRows(rows, position) {
  return rows[position.y]?.[position.x] && rows[position.y][position.x] !== "#";
}

function triggerHuntEvent(room, target) {
  const events = [
    {
      log: `The ${room.vampire} cuts the lights around ${target.name}.`,
      fear: 9,
      moon: 1,
      threat: -18
    },
    {
      log: "A blood trail appears across the floorboards.",
      fear: 6,
      moon: 3,
      threat: -12
    },
    {
      log: `${target.name}'s radio repeats their own voice back at them.`,
      fear: 12,
      moon: 0,
      threat: -20
    }
  ];
  const event = events[Math.floor(Math.random() * events.length)];
  room.fear = Math.min(100, room.fear + event.fear);
  room.moon = Math.min(100, room.moon + event.moon);
  room.threat = Math.max(0, room.threat + event.threat);
  addLog(room, event.log);
}

function calculateRewards(room, success) {
  const evidencePay = room.evidence.length * 120;
  const survivalBonus = success ? Math.max(0, 250 - room.fear) : 0;
  const speedBonus = success ? Math.max(0, 200 - room.moon) : 0;
  const total = room.funds + evidencePay + survivalBonus + speedBonus;
  return {
    success,
    evidencePay,
    survivalBonus,
    speedBonus,
    total,
    rank: total >= 1000 ? "S" : total >= 800 ? "A" : total >= 600 ? "B" : "C"
  };
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
