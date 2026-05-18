const path = require("path");
const fs = require("fs");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 4173;
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const DATA_DIR = path.join(__dirname, "..", "data");
const LEADERBOARD_FILE = path.join(DATA_DIR, "leaderboard.json");
const PROFILES_FILE = path.join(DATA_DIR, "profiles.json");

const TILE = 4;
const PLAYER_RADIUS = 0.55;
const HUNT_TICK_MS = 1500;

const loadouts = {
  occultist: { name: "Occultist", scanRadius: 3.4, wardCost: 60, kit: ["Sanguine lens", "Ash chalk", "Silver bell", "Field journal"] },
  sentinel:  { name: "Sentinel",  scanRadius: 1.8, wardCost: 35, kit: ["Iron stakes", "Garlic wire", "UV lantern", "Salt rounds"] },
  medium:    { name: "Medium",    scanRadius: 2.6, wardCost: 50, kit: ["Spirit radio", "Veil candle", "Bone charm", "Red thread"] },
  alchemist: { name: "Alchemist", scanRadius: 2.0, wardCost: 45, kit: ["Hemlock serum", "Coagulant flask", "Mercury vial", "Tonic kit"] }
};

// Each gear item detects specific clue signs. To log a sign you must be near
// the clue mote with the matching gear EQUIPPED. Field journal is a utility
// (no detection but extra scan radius via the Occultist loadout etc).
const gearCatalog = {
  sanguine_lens: { id: "sanguine_lens", name: "Sanguine Lens",   detects: ["Claw marks", "Blood mist"],          tag: "UV / blood imaging" },
  spirit_radio:  { id: "spirit_radio",  name: "Spirit Radio",    detects: ["Possessed voice", "Whispering walls", "Ancient lullaby"], tag: "Captures dead voices" },
  cold_iron:     { id: "cold_iron",     name: "Cold Iron Rod",   detects: ["Cold breath", "Grave soil"],          tag: "Reads temperature drops" },
  mirror_shard:  { id: "mirror_shard",  name: "Mirror Shard",    detects: ["No reflection"],                       tag: "Catches missing reflections" },
  rat_lure:      { id: "rat_lure",      name: "Rat Lure",        detects: ["Rat swarm"],                           tag: "Bait for vermin signs" },
  wormwood:      { id: "wormwood",      name: "Wormwood Censer", detects: ["Floating dust", "Candle snuff"],       tag: "Smoke reveals movement" },
  black_salt:    { id: "black_salt",    name: "Black Salt Vial", detects: ["Black veins"],                         tag: "Reacts to corrupted flesh" },
  uv_lantern:    { id: "uv_lantern",    name: "UV Lantern",      detects: ["Claw marks", "Black veins"],           tag: "Reveals hidden marks" },
  field_journal: { id: "field_journal", name: "Field Journal",   detects: [],                                       tag: "Utility — tracks evidence" }
};

const difficulties = {
  amateur:    { id: "amateur",    name: "Amateur",    funds: 800, moonRate: 1.0, fearRate: 1.2, vampireThreshold: 32, gearSlots: 4, evidenceRequired: 3, rewardMult: 0.9 },
  standard:   { id: "standard",   name: "Standard",   funds: 640, moonRate: 1.4, fearRate: 1.5, vampireThreshold: 22, gearSlots: 3, evidenceRequired: 3, rewardMult: 1.0 },
  tense:      { id: "tense",      name: "Tense",      funds: 520, moonRate: 1.8, fearRate: 1.8, vampireThreshold: 16, gearSlots: 3, evidenceRequired: 3, rewardMult: 1.3 },
  aggressive: { id: "aggressive", name: "Aggressive", funds: 420, moonRate: 2.2, fearRate: 2.2, vampireThreshold: 12, gearSlots: 3, evidenceRequired: 2, rewardMult: 1.6 },
  nightmare:  { id: "nightmare",  name: "Nightmare",  funds: 320, moonRate: 2.8, fearRate: 2.6, vampireThreshold:  8, gearSlots: 2, evidenceRequired: 2, rewardMult: 2.3 }
};

const DEFAULT_DIFFICULTY = "standard";

const profileColors = ["teal", "blue", "amber", "red", "violet"];
const profileTitles = ["New Blood", "Crypt Runner", "Ward Keeper", "Night Medic", "Relic Hunter", "Bloodline Marshal"];

const contracts = [
  {
    id: "ashbury",
    name: "Ashbury Manor",
    objective: "Identify the bloodline, find the sealed crypt, and close the family coffin.",
    level: 1,
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
    id: "orla",
    name: "Saint Orla's Hospice",
    objective: "Stabilize the ward, collect patient evidence, and seal the chapel ossuary.",
    level: 2,
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
    id: "blackwater",
    name: "Blackwater Theatre",
    objective: "Trace the midnight performance, mark the stage relics, and bind the backstage coffin.",
    level: 3,
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
    id: "greywick",
    name: "Greywick Station",
    objective: "Search the abandoned platform, map the possessed signal, and seal the baggage vault.",
    level: 4,
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

const contractById = (id) => contracts.find((c) => c.id === id);
const rooms = new Map();
let leaderboard = loadJson(LEADERBOARD_FILE, []);
let profiles = loadJson(PROFILES_FILE, {});

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

app.get("/health", (_req, res) => res.json({ ok: true, rooms: rooms.size }));

app.get("/api/leaderboard", (req, res) => {
  const contract = String(req.query.contract || "all");
  const filtered = contract === "all" ? leaderboard : leaderboard.filter((e) => e.contractId === contract);
  res.json(filtered.slice(0, 50));
});

app.get("/api/profile/:clientId", (req, res) => {
  const profile = profiles[req.params.clientId] || { xp: 0, level: 1, contracts: 0, successes: 0 };
  res.json({ ...profile, level: levelFromXp(profile.xp || 0) });
});

app.get("/api/contracts", (_req, res) => {
  res.json(contracts.map((c) => ({ id: c.id, name: c.name, level: c.level })));
});

app.get("/api/gear", (_req, res) => {
  res.json(Object.values(gearCatalog));
});

app.get("/api/difficulties", (_req, res) => {
  res.json(Object.values(difficulties));
});

const TEX_SURFACES = ["wall", "floor", "crypt", "ceiling"];
const TEX_SUFFIXES = {
  color: "_Color",
  normal: "_NormalGL",
  roughness: "_Roughness",
  ao: "_AmbientOcclusion"
};

function scanTextures() {
  const out = {};
  for (const surface of TEX_SURFACES) {
    const dir = path.join(PUBLIC_DIR, "textures", surface);
    if (!fs.existsSync(dir)) { out[surface] = null; continue; }
    let files;
    try { files = fs.readdirSync(dir); } catch (_e) { out[surface] = null; continue; }
    const imgs = files.filter((f) => /\.(jpg|jpeg|png)$/i.test(f));
    const maps = {};
    for (const [key, suffix] of Object.entries(TEX_SUFFIXES)) {
      const match = imgs.find((f) => f.includes(suffix));
      if (match) maps[key] = `/textures/${surface}/${encodeURIComponent(match)}`;
    }
    out[surface] = maps.color ? maps : null;
  }
  return out;
}

let cachedTextures = scanTextures();
app.get("/api/textures", (_req, res) => res.json(cachedTextures));

function loadJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (_err) {
    return fallback;
  }
}

function saveJson(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to save", file, err.message);
  }
}

function levelFromXp(xp) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}

function makeCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i += 1) code += letters[Math.floor(Math.random() * letters.length)];
  return code;
}

function spawnPosition(contract) {
  const rows = contract.mapRows;
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      if (rows[y][x] === "S") return tileToWorld({ x, y });
    }
  }
  return tileToWorld({ x: 1, y: 1 });
}

function tileToWorld(tile) {
  return { x: (tile.x + 0.5) * TILE, z: (tile.y + 0.5) * TILE };
}

function worldToTile(pos) {
  return { x: Math.floor(pos.x / TILE), y: Math.floor(pos.z / TILE) };
}

function makeRoom(code = makeCode(), contractId, difficultyId) {
  const contract = contractId ? contractById(contractId) || contracts[0] : contracts[0];
  const diff = difficulties[difficultyId] || difficulties[DEFAULT_DIFFICULTY];
  return {
    code,
    hostId: null,
    contractId: contract.id,
    contract: contract.name,
    objective: contract.objective,
    level: contract.level,
    difficultyId: diff.id,
    difficulty: diff.name,
    evidenceRequired: diff.evidenceRequired,
    gearSlots: diff.gearSlots,
    vampireThreshold: diff.vampireThreshold,
    moonRate: diff.moonRate,
    fearRate: diff.fearRate,
    rewardMult: diff.rewardMult,
    vampire: contract.vampire,
    signs: contract.signs,
    mapRows: contract.mapRows,
    clueSpots: contract.clueSpots,
    cryptPosition: contract.cryptPosition,
    vampireStart: contract.vampireStart,
    spawn: spawnPosition(contract),
    phase: "lobby",
    fear: 18,
    moon: 45,
    funds: diff.funds,
    players: {},
    logs: [`Lobby ${code} created — ${diff.name} difficulty.`],
    evidence: [],
    wards: [],
    vampireTile: { ...contract.vampireStart },
    vampirePosition: tileToWorld(contract.vampireStart),
    threat: 0,
    result: null,
    rewards: null,
    tickCount: 0,
    huntInterval: null
  };
}

function publicRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    contractId: room.contractId,
    contract: room.contract,
    objective: room.objective,
    level: room.level,
    difficultyId: room.difficultyId,
    difficulty: room.difficulty,
    evidenceRequired: room.evidenceRequired,
    gearSlots: room.gearSlots,
    phase: room.phase,
    fear: room.fear,
    moon: room.moon,
    funds: room.funds,
    players: Object.values(room.players).map(publicPlayer),
    logs: room.logs.slice(-14),
    signs: room.signs,
    mapRows: room.mapRows,
    clueSpots: room.clueSpots,
    cryptPosition: room.cryptPosition,
    spawn: room.spawn,
    tile: TILE,
    evidence: room.evidence,
    wards: room.wards,
    vampirePosition: room.vampirePosition,
    vampireTile: room.vampireTile,
    threat: room.threat,
    result: room.result,
    rewards: room.rewards,
    revealedVampire: room.evidence.length >= room.evidenceRequired || room.phase === "complete" ? room.vampire : "Unknown"
  };
}

function publicPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    loadout: player.loadout,
    host: player.host,
    ready: player.ready,
    position: player.position,
    yaw: player.yaw,
    alive: player.alive,
    profile: player.profile,
    level: player.level,
    gear: player.gear,
    equipped: player.equipped
  };
}

function getRoom(code) {
  return rooms.get(String(code || "").trim().toUpperCase());
}

function emitRoom(room) {
  io.to(room.code).emit("room:state", publicRoom(room));
}

function emitTick(room) {
  io.to(room.code).emit("room:tick", {
    vampirePosition: room.vampirePosition,
    vampireTile: room.vampireTile,
    fear: room.fear,
    moon: room.moon,
    threat: room.threat,
    funds: room.funds,
    phase: room.phase
  });
}

function addLog(room, message) {
  room.logs.push(message);
  room.logs = room.logs.slice(-28);
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
  Object.values(room.players).forEach((p) => { p.host = false; });
  const [next] = Object.keys(room.players);
  room.hostId = next || null;
  if (next) room.players[next].host = true;
}

function applyContract(room, contract) {
  room.contractId = contract.id;
  room.contract = contract.name;
  room.objective = contract.objective;
  room.level = contract.level;
  room.vampire = contract.vampire;
  room.signs = contract.signs;
  room.mapRows = contract.mapRows;
  room.clueSpots = contract.clueSpots;
  room.cryptPosition = contract.cryptPosition;
  room.vampireStart = contract.vampireStart;
  room.spawn = spawnPosition(contract);
}

function applyDifficulty(room, diffId) {
  const diff = difficulties[diffId] || difficulties[DEFAULT_DIFFICULTY];
  room.difficultyId = diff.id;
  room.difficulty = diff.name;
  room.evidenceRequired = diff.evidenceRequired;
  room.gearSlots = diff.gearSlots;
  room.vampireThreshold = diff.vampireThreshold;
  room.moonRate = diff.moonRate;
  room.fearRate = diff.fearRate;
  room.rewardMult = diff.rewardMult;
  room.funds = diff.funds;
  // Trim each player's gear to the new slot count
  Object.values(room.players).forEach((p) => {
    if (Array.isArray(p.gear) && p.gear.length > diff.gearSlots) {
      p.gear = p.gear.slice(0, diff.gearSlots);
      if (p.equipped >= p.gear.length) p.equipped = 0;
    }
  });
}

function resetMatch(room, contractId, difficultyId) {
  const contract = contractId ? contractById(contractId) || contracts[0] : contracts[Math.floor(Math.random() * contracts.length)];
  applyContract(room, contract);
  if (difficultyId) applyDifficulty(room, difficultyId);
  else applyDifficulty(room, room.difficultyId || DEFAULT_DIFFICULTY);
  room.phase = "lobby";
  room.fear = 18;
  room.moon = 45;
  room.evidence = [];
  room.wards = [];
  room.vampireTile = { ...contract.vampireStart };
  room.vampirePosition = tileToWorld(contract.vampireStart);
  room.threat = 0;
  room.result = null;
  room.rewards = null;
  room.tickCount = 0;
  stopHunt(room);
  Object.values(room.players).forEach((p) => {
    p.ready = false;
    p.alive = true;
    p.position = { x: room.spawn.x, y: 1.0, z: room.spawn.z };
    p.yaw = 0;
  });
}

function startHunt(room) {
  room.phase = "hunt";
  room.fear = 18;
  room.moon = 45;
  room.evidence = [];
  room.wards = [];
  room.vampireTile = { ...room.vampireStart };
  room.vampirePosition = tileToWorld(room.vampireStart);
  room.threat = 0;
  room.result = null;
  room.rewards = null;
  room.tickCount = 0;
  // Pin difficulty defaults applied to current difficulty
  applyDifficulty(room, room.difficultyId || DEFAULT_DIFFICULTY);
  Object.values(room.players).forEach((p) => {
    p.alive = true;
    p.position = { x: room.spawn.x, y: 1.0, z: room.spawn.z };
  });
  stopHunt(room);
  room.huntInterval = setInterval(() => advanceHunt(room), HUNT_TICK_MS);
  addLog(room, `The van doors open. ${room.difficulty} hunt begins.`);
}

function stopHunt(room) {
  if (room.huntInterval) {
    clearInterval(room.huntInterval);
    room.huntInterval = null;
  }
}

io.on("connection", (socket) => {
  socket.on("room:create", (payload = {}, ack) => {
    let code = makeCode();
    while (rooms.has(code)) code = makeCode();
    const room = makeRoom(code, payload.contractId, payload.difficultyId);
    rooms.set(code, room);
    joinRoom(socket, room, payload);
    ack?.({ ok: true, room: publicRoom(room) });
  });

  socket.on("room:join", (payload = {}, ack) => {
    const code = String(payload.code || "").trim().toUpperCase();
    const room = getRoom(code);
    if (!room) {
      ack?.({ ok: false, message: "Room not found. Check the code or host a new lobby." });
      socket.emit("notice", { type: "error", message: "Room not found." });
      return;
    }
    joinRoom(socket, room, payload);
    ack?.({ ok: true, room: publicRoom(room) });
  });

  socket.on("player:update", (payload = {}) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;

    if (payload.name) player.name = sanitizeText(payload.name, "Hunter");
    if (loadouts[payload.loadout]) player.loadout = payload.loadout;
    if (typeof payload.ready === "boolean") player.ready = payload.ready;
    if (payload.profile) {
      player.profile = {
        color: sanitizeChoice(payload.profile.color, profileColors, "teal"),
        title: sanitizeChoice(payload.profile.title, profileTitles, "New Blood")
      };
    }
    if (Array.isArray(payload.gear)) {
      const cleaned = [];
      for (const id of payload.gear) {
        if (gearCatalog[id] && !cleaned.includes(id)) cleaned.push(id);
        if (cleaned.length >= room.gearSlots) break;
      }
      player.gear = cleaned;
      if (typeof player.equipped !== "number" || player.equipped >= cleaned.length) player.equipped = 0;
    }
    emitRoom(room);
  });

  socket.on("player:equip", (payload = {}) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;
    const idx = Number(payload.slot);
    if (Number.isInteger(idx) && idx >= 0 && idx < (player.gear?.length || 0)) {
      player.equipped = idx;
      // Light broadcast — equipped affects HUD on other clients minimally, so we batch via state on next tick
    }
  });

  socket.on("player:move", (payload = {}) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    const player = room.players[socket.id];
    if (!player || !player.alive) return;
    if (room.phase !== "hunt") return;

    const next = {
      x: clamp(Number(payload.x) || player.position.x, PLAYER_RADIUS, room.mapRows[0].length * TILE - PLAYER_RADIUS),
      y: 1.0,
      z: clamp(Number(payload.z) || player.position.z, PLAYER_RADIUS, room.mapRows.length * TILE - PLAYER_RADIUS)
    };
    const yaw = Number(payload.yaw) || 0;

    if (collidesWithWalls(room, next)) {
      socket.emit("player:reject", { position: player.position, yaw: player.yaw });
      return;
    }
    player.position = next;
    player.yaw = yaw;
  });

  socket.on("match:start", () => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    if (!requireHost(socket, room)) return;
    const players = Object.values(room.players);
    if (players.length === 0) return;
    if (players.some((p) => !p.ready)) {
      addLog(room, "The host tried to start, but not everyone is ready.");
      emitRoom(room);
      return;
    }
    startHunt(room);
    emitRoom(room);
  });

  socket.on("match:new-contract", (payload = {}) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    if (!requireHost(socket, room)) return;
    resetMatch(room, payload.contractId, payload.difficultyId);
    addLog(room, `New contract loaded: ${room.contract} on ${room.difficulty}.`);
    emitRoom(room);
  });

  socket.on("match:difficulty", (payload = {}) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    if (!requireHost(socket, room)) return;
    if (room.phase === "hunt") {
      socket.emit("notice", { type: "error", message: "Difficulty locked once the hunt starts." });
      return;
    }
    if (!difficulties[payload.difficultyId]) return;
    applyDifficulty(room, payload.difficultyId);
    addLog(room, `Difficulty set to ${room.difficulty}.`);
    emitRoom(room);
  });

  socket.on("match:scan", () => {
    const room = getRoom(socket.data.roomCode);
    if (!room || room.phase !== "hunt") return;
    const player = room.players[socket.id];
    if (!player || !player.alive) return;
    const equippedId = player.gear?.[player.equipped || 0];
    const equipped = equippedId ? gearCatalog[equippedId] : null;
    if (!equipped) {
      socket.emit("notice", { type: "error", message: "Equip a tool first (1-4 to switch)." });
      return;
    }
    if (equipped.detects.length === 0) {
      socket.emit("notice", { type: "info", message: `${equipped.name} is a utility — it can't log evidence.` });
      return;
    }
    const nearby = findNearbyClue(room, player);
    if (!nearby) {
      room.fear = Math.min(100, room.fear + 2);
      addLog(room, `${player.name} scans the dark but finds nothing certain.`);
      emitRoom(room);
      return;
    }
    if (!equipped.detects.includes(nearby.sign)) {
      socket.emit("notice", { type: "error", message: `${equipped.name} can't read this trace — try another tool.` });
      room.fear = Math.min(100, room.fear + 1);
      emitRoom(room);
      return;
    }
    if (room.evidence.includes(nearby.sign)) {
      socket.emit("notice", { type: "info", message: "Already logged." });
      return;
    }
    room.evidence.push(nearby.sign);
    room.funds += 90;
    room.fear = Math.max(0, room.fear - 6);
    room.threat = Math.min(100, room.threat + 6);
    addLog(room, `Evidence logged: ${nearby.sign} (via ${equipped.name}).`);
    emitRoom(room);
  });

  socket.on("match:ward", () => {
    const room = getRoom(socket.data.roomCode);
    if (!room || room.phase !== "hunt") return;
    const player = room.players[socket.id];
    if (!player || !player.alive) return;
    const tile = worldToTile(player.position);
    const cost = loadouts[player.loadout]?.wardCost || 50;
    if (room.funds < cost) {
      socket.emit("notice", { type: "error", message: "Not enough funds for a ward." });
      return;
    }
    room.wards.push({ x: tile.x, y: tile.y, world: tileToWorld(tile) });
    room.funds = Math.max(0, room.funds - cost);
    room.fear = Math.max(0, room.fear - 8);
    room.threat = Math.max(0, room.threat - 12);
    addLog(room, `${player.name} burns a ward at [${tile.x}, ${tile.y}].`);
    emitRoom(room);
  });

  socket.on("match:seal", () => {
    const room = getRoom(socket.data.roomCode);
    if (!room || room.phase !== "hunt") return;
    const player = room.players[socket.id];
    if (!player) return;
    const tile = worldToTile(player.position);
    const inCrypt = tile.x === room.cryptPosition.x && tile.y === room.cryptPosition.y;
    if (room.evidence.length >= room.evidenceRequired && inCrypt) {
      finishMatch(room, true, `${player.name} sealed the coffin. The ${room.vampire} is contained.`);
    } else if (!inCrypt) {
      socket.emit("notice", { type: "error", message: "Stand on the crypt floor to seal it." });
    } else {
      room.fear = Math.min(100, room.fear + 10);
      addLog(room, `${player.name} tried to seal too early. The manor pushes back.`);
      emitRoom(room);
    }
  });

  socket.on("match:chat", (payload = {}) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;
    const text = sanitizeText(payload.text, "", 80);
    if (!text) return;
    addLog(room, `${player.name}: ${text}`);
    emitRoom(room);
  });

  socket.on("disconnect", () => leaveCurrentRoom(socket));
});

function joinRoom(socket, room, payload) {
  leaveCurrentRoom(socket);
  socket.data.roomCode = room.code;
  socket.data.clientId = String(payload.clientId || "").slice(0, 40);
  socket.join(room.code);

  const isFirst = Object.keys(room.players).length === 0;
  const profile = profiles[socket.data.clientId] || { xp: 0, contracts: 0, successes: 0 };

  // Build initial gear: take the client's saved gear, validated, capped to slots
  const slots = room.gearSlots || difficulties[DEFAULT_DIFFICULTY].gearSlots;
  let gear = Array.isArray(payload.gear) ? payload.gear.filter((id) => gearCatalog[id]) : [];
  gear = [...new Set(gear)].slice(0, slots);
  if (gear.length === 0) gear = defaultGearFor(loadouts[payload.loadout] ? payload.loadout : "occultist").slice(0, slots);

  room.players[socket.id] = {
    id: socket.id,
    clientId: socket.data.clientId,
    name: sanitizeText(payload.name, "Hunter"),
    loadout: loadouts[payload.loadout] ? payload.loadout : "occultist",
    host: isFirst,
    ready: false,
    alive: true,
    position: { x: room.spawn.x, y: 1.0, z: room.spawn.z },
    yaw: 0,
    profile: {
      color: sanitizeChoice(payload.profile?.color, profileColors, "teal"),
      title: sanitizeChoice(payload.profile?.title, profileTitles, "New Blood")
    },
    level: levelFromXp(profile.xp || 0),
    gear,
    equipped: 0
  };
  if (isFirst) room.hostId = socket.id;
  addLog(room, `${room.players[socket.id].name} joined the lobby.`);
  emitRoom(room);
}

function leaveCurrentRoom(socket) {
  const room = getRoom(socket.data.roomCode);
  if (!room || !room.players[socket.id]) return;
  const player = room.players[socket.id];
  delete room.players[socket.id];
  socket.leave(room.code);
  addLog(room, `${player.name} left the lobby.`);
  if (room.hostId === socket.id) assignNextHost(room);
  if (Object.keys(room.players).length === 0) {
    stopHunt(room);
    rooms.delete(room.code);
  } else {
    emitRoom(room);
  }
}

function advanceHunt(room) {
  if (room.phase !== "hunt") return;
  room.tickCount += 1;
  room.fear = Math.min(100, room.fear + (room.fearRate || 1.5));
  room.moon = Math.min(100, room.moon + (room.moonRate || 1.8));
  room.threat = Math.min(100, room.threat + 1.4 + room.evidence.length * 0.7);

  const players = Object.values(room.players).filter((p) => p.alive);
  if (players.length === 0) {
    emitTick(room);
    return;
  }

  const target = nearestPlayer(room.vampirePosition, players);
  const targetTile = target ? worldToTile(target.position) : null;
  const warded = room.wards.some((w) => tileDistance(w, room.vampireTile) <= 1);
  if (warded) {
    room.threat = Math.max(0, room.threat - 6);
    if (room.tickCount % 3 === 0) addLog(room, "A ward flares and the vampire recoils.");
  } else if (room.threat >= (room.vampireThreshold || 22) && targetTile) {
    room.vampireTile = nextStepToward(room, room.vampireTile, targetTile);
    room.vampirePosition = tileToWorld(room.vampireTile);
  }

  if (target) {
    const dx = target.position.x - room.vampirePosition.x;
    const dz = target.position.z - room.vampirePosition.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < TILE * 0.6) {
      room.fear = Math.min(100, room.fear + 22);
      room.threat = Math.max(0, room.threat - 18);
      addLog(room, `${target.name} is caught in the vampire's shadow.`);
    } else if (dist < TILE * 1.4 && room.tickCount % 2 === 0) {
      room.fear = Math.min(100, room.fear + 8);
      addLog(room, `${target.name} hears movement right behind them.`);
    }
  }

  if (room.threat >= 75 && room.tickCount % 4 === 0 && target) {
    triggerHuntEvent(room, target);
  }

  if (room.fear >= 100 || room.moon >= 100) {
    finishMatch(room, false, "The moon peaks. The bloodline escapes into the city.");
    return;
  }

  emitTick(room);
  if (room.tickCount % 4 === 0) emitRoom(room);
}

function finishMatch(room, success, message) {
  room.phase = "complete";
  room.result = success ? "success" : "failed";
  room.rewards = calculateRewards(room, success);
  addLog(room, message);
  stopHunt(room);

  Object.values(room.players).forEach((player) => {
    if (!player.clientId) return;
    const prev = profiles[player.clientId] || { xp: 0, contracts: 0, successes: 0 };
    const gained = Math.floor((room.rewards.total || 0) / 5) + (success ? 60 : 10);
    profiles[player.clientId] = {
      xp: (prev.xp || 0) + gained,
      contracts: (prev.contracts || 0) + 1,
      successes: (prev.successes || 0) + (success ? 1 : 0),
      name: player.name
    };
    player.level = levelFromXp(profiles[player.clientId].xp);
  });
  saveJson(PROFILES_FILE, profiles);

  if (success) {
    const top = Object.values(room.players).slice().sort((a, b) => (a.id < b.id ? -1 : 1))[0];
    leaderboard.push({
      contractId: room.contractId,
      contract: room.contract,
      difficulty: room.difficulty,
      level: room.level,
      rank: room.rewards.rank,
      total: room.rewards.total,
      players: Object.values(room.players).map((p) => p.name),
      leader: top ? top.name : "Hunter",
      timestamp: Date.now()
    });
    leaderboard.sort((a, b) => b.total - a.total);
    leaderboard = leaderboard.slice(0, 200);
    saveJson(LEADERBOARD_FILE, leaderboard);
    io.emit("leaderboard:update");
  }

  emitRoom(room);
}

function findNearbyClue(room, player) {
  if (!player?.position) return null;
  const radius = loadouts[player.loadout]?.scanRadius || 2;
  const clues = room.clueSpots.map((spot, i) => ({ world: tileToWorld(spot), sign: room.signs[i] }));
  let best = null;
  let bestD = Infinity;
  for (const c of clues) {
    const dx = c.world.x - player.position.x;
    const dz = c.world.z - player.position.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d <= radius && d < bestD) { best = c; bestD = d; }
  }
  return best;
}

function defaultGearFor(loadoutId) {
  switch (loadoutId) {
    case "occultist": return ["sanguine_lens", "spirit_radio", "cold_iron", "field_journal"];
    case "sentinel":  return ["uv_lantern", "cold_iron", "black_salt", "rat_lure"];
    case "medium":    return ["spirit_radio", "mirror_shard", "wormwood", "field_journal"];
    case "alchemist": return ["black_salt", "wormwood", "cold_iron", "field_journal"];
    default:          return ["sanguine_lens", "spirit_radio", "cold_iron", "field_journal"];
  }
}

function nearestPlayer(from, players) {
  return players
    .map((p) => ({ player: p, d: Math.hypot(from.x - p.position.x, from.z - p.position.z) }))
    .sort((a, b) => a.d - b.d)[0]?.player;
}

function tileDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function nextStepToward(room, from, to) {
  const options = [
    { x: from.x + 1, y: from.y },
    { x: from.x - 1, y: from.y },
    { x: from.x, y: from.y + 1 },
    { x: from.x, y: from.y - 1 }
  ].filter((p) => isTileWalkable(room, p));
  return options.sort((a, b) => tileDistance(a, to) - tileDistance(b, to))[0] || from;
}

function isTileWalkable(room, tile) {
  const cell = room.mapRows[tile.y]?.[tile.x];
  return cell && cell !== "#";
}

function collidesWithWalls(room, pos) {
  const r = PLAYER_RADIUS;
  const probes = [
    { x: pos.x - r, z: pos.z - r },
    { x: pos.x + r, z: pos.z - r },
    { x: pos.x - r, z: pos.z + r },
    { x: pos.x + r, z: pos.z + r },
    { x: pos.x,     z: pos.z - r },
    { x: pos.x,     z: pos.z + r },
    { x: pos.x - r, z: pos.z     },
    { x: pos.x + r, z: pos.z     }
  ];
  for (const c of probes) {
    const tile = { x: Math.floor(c.x / TILE), y: Math.floor(c.z / TILE) };
    if (!isTileWalkable(room, tile)) return true;
  }
  return false;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function triggerHuntEvent(room, target) {
  const events = [
    { log: `The ${room.vampire} cuts the lights around ${target.name}.`, fear: 9, moon: 1, threat: -18 },
    { log: "A blood trail appears across the floorboards.", fear: 6, moon: 3, threat: -12 },
    { log: `${target.name}'s radio repeats their own voice back at them.`, fear: 12, moon: 0, threat: -20 }
  ];
  const ev = events[Math.floor(Math.random() * events.length)];
  room.fear = Math.min(100, room.fear + ev.fear);
  room.moon = Math.min(100, room.moon + ev.moon);
  room.threat = Math.max(0, room.threat + ev.threat);
  addLog(room, ev.log);
}

function calculateRewards(room, success) {
  const mult = room.rewardMult || 1.0;
  const evidencePay = Math.round(room.evidence.length * 120 * mult);
  const survivalBonus = success ? Math.round(Math.max(0, 250 - room.fear) * mult) : 0;
  const speedBonus = success ? Math.round(Math.max(0, 200 - room.moon) * mult) : 0;
  const levelBonus = success ? Math.round(room.level * 80 * mult) : 0;
  const total = Math.round(room.funds + evidencePay + survivalBonus + speedBonus + levelBonus);
  return {
    success,
    evidencePay,
    survivalBonus,
    speedBonus,
    levelBonus,
    rewardMult: mult,
    total,
    rank: total >= 1800 ? "S" : total >= 1400 ? "A" : total >= 1050 ? "B" : total >= 750 ? "C" : "D"
  };
}

server.listen(PORT, () => {
  console.log(`Bloodline Protocol server listening on ${PORT}`);
});
