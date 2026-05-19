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
  occultist: { name: "Occultist", scanRadius: 3.4, wardCost: 60 },
  sentinel:  { name: "Sentinel",  scanRadius: 1.8, wardCost: 35 },
  medium:    { name: "Medium",    scanRadius: 2.6, wardCost: 50 },
  alchemist: { name: "Alchemist", scanRadius: 2.0, wardCost: 45 }
};

// The 10 canonical evidence types from the Nightfall design.
const evidenceTypes = {
  blood_traces: { id: "blood_traces", name: "Blood Traces",         description: "Glowing residue under UV light." },
  emf:          { id: "emf",          name: "EMF Readings",         description: "Electromagnetic field fluctuations." },
  thermal:      { id: "thermal",      name: "Thermal Anomalies",    description: "Cold spots or heat trails." },
  spectral:     { id: "spectral",     name: "Spectral Echoes",      description: "Psychic imprints and whispers." },
  physical:     { id: "physical",     name: "Physical Traces",      description: "Claw marks, bites, and scrapes." },
  ectoplasm:    { id: "ectoplasm",    name: "Ectoplasmic Residue",  description: "Supernatural slime or mist." },
  pheromones:   { id: "pheromones",   name: "Pheromone Signatures", description: "Territorial or hunting chemistry." },
  temporal:     { id: "temporal",     name: "Temporal Distortions", description: "Local time anomalies." },
  aura:         { id: "aura",         name: "Aura Imprints",        description: "Lingering energy signatures." },
  sonic:        { id: "sonic",        name: "Sonic Frequencies",    description: "Sounds outside human hearing." }
};

// One tool per evidence type. Bring a balanced kit or coordinate with the team.
const gearCatalog = {
  uv_flashlight:      { id: "uv_flashlight",      name: "UV Flashlight",         detects: "blood_traces", tag: "Reveals supernatural blood residue" },
  emf_reader:         { id: "emf_reader",         name: "EMF Reader",            detects: "emf",          tag: "Detects vampire EM fields" },
  thermal_camera:     { id: "thermal_camera",     name: "Thermal Camera",        detects: "thermal",      tag: "Cold spots and heat trails" },
  spirit_box:         { id: "spirit_box",         name: "Spirit Box",            detects: "spectral",     tag: "Captures psychic whispers" },
  field_kit:          { id: "field_kit",          name: "Alchemist Field Kit",   detects: "physical",     tag: "Analyzes claw and bite marks" },
  ectoplasm_detector: { id: "ectoplasm_detector", name: "Ectoplasm Detector",    detects: "ectoplasm",    tag: "Reacts to supernatural slime" },
  pheromone_analyzer: { id: "pheromone_analyzer", name: "Pheromone Analyzer",    detects: "pheromones",   tag: "Picks up territorial markers" },
  chronometer:        { id: "chronometer",        name: "Chronometer",           detects: "temporal",     tag: "Detects time anomalies" },
  aura_reader:        { id: "aura_reader",        name: "Aura Reader",           detects: "aura",         tag: "Sees lingering energy" },
  ultrasonic_mic:     { id: "ultrasonic_mic",     name: "Ultrasonic Microphone", detects: "sonic",        tag: "Records inhuman frequencies" }
};

// The 10 vampire species. Each has a unique 3-evidence canonical signature
// plus an optional 4th "tell" used only on Nightmare difficulty (3-of-4
// random signs are placed, which can leave confirmed evidence consistent
// with several species — players have to guess at banish time).
const vampireCatalog = [
  {
    id: "nosferatu", name: "Nosferatu",
    evidence: ["physical", "emf", "pheromones"], altEvidence: "thermal",
    banishment: "Mirror shards and blessed salt, performed in total darkness.",
    profile: "Aggressive, light-sensitive, overtly predatory. The classic 'first hunt' vampire.",
    lore: "The Nosferatu strain descends from the plague-priests of Borgo Vrânia, who clawed up from quarantine pits with the disease still on them. They climb walls and ceilings, breathe a fear pheromone that buckles the knees, and pace just outside the lantern light. Hunters report the same dream the night before a sighting: a long corridor, scraped along the ceiling. Light is their leash — sever it, and they hunt unbound."
  },
  {
    id: "noble", name: "Vampiric Noble",
    evidence: ["spectral", "physical", "aura"], altEvidence: "pheromones",
    banishment: "Personal belonging ritual at midnight, under moonlight.",
    profile: "Aristocratic. Charming, dangerous, surrounded by quiet luxury.",
    lore: "The Noble line are old money — courts, salons, royal physicians who never aged. They thrall the weak-willed with a glance and dissolve into bat-swarms when cornered. Most still keep the manners. A relic of their mortal life — a locket, a signet ring, a stained letter — anchors them to the world; until that anchor is destroyed under moonlight, no banishment holds. They speak first, before they feed."
  },
  {
    id: "shade_stalker", name: "Shade Stalker",
    evidence: ["thermal", "spectral", "blood_traces"], altEvidence: "aura",
    banishment: "Burn special incense, flood with bright light.",
    profile: "Near-invisible in darkness. Hunts through connected shadows.",
    lore: "Shade Stalkers don't walk between rooms — they fall into one shadow and rise from another, treating darkness like tunnels. A drop in air temperature and a whisper just behind your ear is usually the only warning. They drain life on contact and leave a residue under UV that looks like rust shaped like fingers. Burn the chrism, light every corner, and the shadow-tunnels collapse on them."
  },
  {
    id: "blood_alchemist", name: "Blood Alchemist",
    evidence: ["blood_traces", "physical", "pheromones"], altEvidence: "ectoplasm",
    banishment: "Holy water + its own blood; destroy its alchemical focus.",
    profile: "A vampire-scholar that has weaponized its own biology.",
    lore: "Cabaret of the Crimson Compass, 1881 — three medical students published a paper on transmuting blood to silver. Two were hanged. The third went missing, then started leaving alchemical sigils painted in his own arteries on basement walls. Blood Alchemists construct weapons out of their fluids and sense fresh wounds from across a city. Destroying their focus — an athanor, a still, a glass alembic at the lair's center — is the only way the rite holds."
  },
  {
    id: "mist_walker", name: "Mist Walker",
    evidence: ["ectoplasm", "emf", "thermal"], altEvidence: "aura",
    banishment: "Trap the mist in a prepared vessel; zero air currents.",
    profile: "Doesn't fight — seeps. Hard to corner, harder to confirm.",
    lore: "Mist Walkers are graveyard fog given purpose. They cross under doors, through keyholes, into your lungs while you sleep. Their touch induces hallucinations of being underwater. They can't be cut — they can only be condensed. Bring an iron vessel, seal every draft, and the mist is forced back into a body just long enough to bind."
  },
  {
    id: "chronovampire", name: "Chronovampire",
    evidence: ["temporal", "physical", "spectral"], altEvidence: "emf",
    banishment: "Synced cross-time actions using a mortal-past artifact.",
    profile: "Ancient and rare. Bends local time, ages victims with a touch.",
    lore: "The first Chronovampires were astronomer-priests who hung their souls on the wrong star. Time eddies around them — clocks unwind, dust freezes mid-fall, mortals age sixty years in a single touch. They see your next move three seconds before you do. The only working ritual requires two hunters acting in synchrony with a relic from the vampire's living years, severing its present from its future at the same instant."
  },
  {
    id: "psychic_leech", name: "Psychic Leech",
    evidence: ["aura", "spectral", "sonic"], altEvidence: "temporal",
    banishment: "Combined mental focus of the full team; break illusions.",
    profile: "Feeds on mental energy, not blood. Hardest species to identify.",
    lore: "Psychic Leeches don't bleed their victims — they sip from them, year after year, until the host can't remember their own name. They leave no physical trace; only auras and the same déjà vu in every survivor's testimony. Their projections are vivid enough to walk through. The full team must hold a single intention in their minds while the illusions break, or the rite splinters into nightmare."
  },
  {
    id: "feral", name: "Feral Bloodline",
    evidence: ["physical", "pheromones", "thermal"], altEvidence: "blood_traces",
    banishment: "Silver caging circle; calm the feral nature.",
    profile: "A vampire that has surrendered to the beast.",
    lore: "Every bloodline produces a few who let the beast win. The Feral strain are hunched, fast, animal-hot — their bite carries a rabies-adjacent infection that kills within days. They communicate in growls and scent. Cage them with silver, sing the calming verses your order memorized as a child, and the human shape returns long enough to die properly."
  },
  {
    id: "tech_hybrid", name: "Technological Hybrid",
    evidence: ["emf", "physical", "sonic"], altEvidence: "temporal",
    banishment: "Isolate from all tech; trigger an EMP at the climax.",
    profile: "A modern horror — half vampire, half machine.",
    lore: "Synthemata Industries' R&D wing went dark in 2019. Three of their engineers walked out four months later with parts of their nervous systems replaced and an appetite that no diet plan addressed. Technological Hybrids talk to electronics the way other vampires talk to bats. They corrupt evidence in real time, swap camera feeds, drain your radio. The EMP at the rite's peak silences them long enough for the holy work to finish."
  },
  {
    id: "dreamweaver", name: "Dreamweaver",
    evidence: ["spectral", "aura", "sonic"], altEvidence: "ectoplasm",
    banishment: "Lucid dream together; confront the vampire on its ground.",
    profile: "Hunts in sleep. Victims appear unharmed and unwakeable.",
    lore: "Dreamweavers live in REM the way you live in your apartment. They feed on nightmares, and they're patient — many of their victims simply lie in beds, hearts beating, faces serene, for decades. Solo hunters die in the dream and never come back. Only a full team, mid-lucid, can corner one on its own territory. Bring something familiar from the waking world to anchor yourself."
  }
];

function vampireFullPool(v) {
  return v.altEvidence ? [...v.evidence, v.altEvidence] : v.evidence.slice();
}
function vampireMatches(v, confirmedSigns, allowAlt) {
  const pool = allowAlt ? vampireFullPool(v) : v.evidence;
  return confirmedSigns.every((c) => pool.includes(c));
}

const vampireById = (id) => vampireCatalog.find((v) => v.id === id);

// Per-species banishment rituals. Each entry maps a vampireId to a
// human-facing requirements list (shown in the journal once the species is
// identified) plus a server-side check that runs at banish time.
//
// Player state used by these checks:
//   player.flashlight   — boolean, default true (client toggles with B)
//   player.hasRelic     — boolean, default false (auto-pickup on the vault tile)
//   player.lastMoveAt   — ms timestamp of the last accepted player:move
//
// Room state used:
//   room.wards          — array of placed ward tiles
//   room.threat         — current threat percent
//   room.cryptPosition  — tile coords of the crypt
const RITUAL_STILL_MS = 3000;
function ritualStillEnough(player) {
  return player.lastMoveAt && (Date.now() - player.lastMoveAt) >= RITUAL_STILL_MS;
}
function tileEq(a, b) { return a.x === b.x && a.y === b.y; }
function huntersOnTile(room, tile) {
  return Object.values(room.players).filter((p) => p.alive && tileEq(worldToTile(p.position), tile));
}
function wardsNearCrypt(room, radius) {
  const c = room.cryptPosition;
  return room.wards.filter((w) => Math.abs(w.x - c.x) + Math.abs(w.y - c.y) <= radius).length;
}

const rituals = {
  nosferatu: {
    name: "Mirror and Salt",
    requirements: ["Turn your flashlight off before sealing."],
    check: (room, player) => !player.flashlight || "Your flashlight is still burning.",
    hint: "B: toggle flashlight."
  },
  noble: {
    name: "Personal Effect",
    requirements: ["Pick up the Noble's relic from the vault.", "Seal during a midnight pulse (every full 25%-moon mark)."],
    check: (room, player) => {
      if (!player.hasRelic) return "You don't carry the relic.";
      // Midnight pulse: moon% mod 25 within 4 (so a 4% wide window every 25%)
      if ((room.moon % 25) > 4) return "It is not yet midnight — wait for the moon's pulse.";
      return true;
    },
    hint: "Walk over the glowing relic at the vault floor."
  },
  shade_stalker: {
    name: "Floodlight",
    requirements: ["Burn 2 or more wards within 2 tiles of the crypt before sealing."],
    check: (room) => wardsNearCrypt(room, 2) >= 2 || "Not enough wards flooding the crypt.",
    hint: "Place wards (Q) on adjacent tiles to the crypt."
  },
  blood_alchemist: {
    name: "Shatter the Focus",
    requirements: ["Burn a ward directly on the crypt tile."],
    check: (room) => room.wards.some((w) => tileEq(w, room.cryptPosition)) || "No ward is burning on the crypt itself.",
    hint: "Stand on the crypt and press Q before F."
  },
  mist_walker: {
    name: "Still the Air",
    requirements: ["Stand still in the crypt for 3 seconds, then seal."],
    check: (_room, player) => ritualStillEnough(player) || "Hold position for a few more seconds.",
    hint: "Stop moving for ~3 seconds before pressing F."
  },
  chronovampire: {
    name: "Synchronised Vow",
    requirements: ["Have at least 2 hunters standing on the crypt."],
    check: (room) => huntersOnTile(room, room.cryptPosition).length >= 2 || "Another hunter must join you at the crypt.",
    hint: "Coordinate with a teammate — both stand on the crypt."
  },
  psychic_leech: {
    name: "Unified Focus",
    requirements: ["All living hunters must be on the crypt at the moment of sealing."],
    check: (room) => {
      const alive = Object.values(room.players).filter((p) => p.alive);
      const here = huntersOnTile(room, room.cryptPosition);
      return here.length === alive.length || `${alive.length - here.length} hunter(s) still scattered.`;
    },
    hint: "Wait until the whole team is at the crypt."
  },
  feral: {
    name: "Cage and Calm",
    requirements: ["Drop the vampire's threat to 20% or lower before sealing."],
    check: (room) => room.threat <= 20 || "The beast is still too agitated — burn more wards.",
    hint: "Wards lower threat. Keep placing them until the meter falls."
  },
  tech_hybrid: {
    name: "EMP Silence",
    requirements: ["Turn your flashlight off.", "No wards may be burning when you seal."],
    check: (room, player) => {
      if (player.flashlight) return "Your flashlight is still on.";
      if (room.wards.length > 0) return "Wards are interfering — they must all be extinguished.";
      return true;
    },
    hint: "B turns the flashlight off. Avoid placing wards this match."
  },
  dreamweaver: {
    name: "Lucid Vigil",
    requirements: ["Stand still in the crypt for 3 seconds.", "Flashlight must be off (no waking light)."],
    check: (_room, player) => {
      if (player.flashlight) return "Lucid only in darkness — turn off your flashlight.";
      if (!ritualStillEnough(player)) return "Hold your position a little longer.";
      return true;
    },
    hint: "Flashlight off, hold still on the crypt."
  }
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
  },
  {
    id: "lazarus",
    name: "Lazarus Industries",
    objective: "Trace the corrupted servers, isolate the lab, and EMP the cradle in the lower vault.",
    level: 3,
    mapRows: [
      "############",
      "#S....#....#",
      "#.##...#.#.#",
      "#......#...#",
      "###....###.#",
      "#...C..#K..#",
      "#..##.....##",
      "#.....##...#",
      "############"
    ],
    clueSpots: [{ x: 7, y: 1 }, { x: 3, y: 3 }, { x: 8, y: 7 }],
    cryptPosition: { x: 4, y: 5 },
    vampireStart: { x: 10, y: 1 }
  },
  {
    id: "wraithmoor",
    name: "Wraithmoor Sanitarium",
    objective: "Map the patient ward, recover the dream journals, and break the leech's grip.",
    level: 3,
    mapRows: [
      "############",
      "#S..#..#...#",
      "#...#......#",
      "#.###.##.#.#",
      "#.....#....#",
      "#.###.#.#.##",
      "#C..#.#...K#",
      "#......##..#",
      "############"
    ],
    clueSpots: [{ x: 5, y: 1 }, { x: 9, y: 4 }, { x: 3, y: 7 }],
    cryptPosition: { x: 1, y: 6 },
    vampireStart: { x: 9, y: 6 }
  },
  {
    id: "ravenhall",
    name: "Ravenhall Estate",
    objective: "Slip through the ballroom, recover a personal effect, and complete the midnight rite.",
    level: 2,
    // Multi-floor: U on a lower floor and D on an upper floor at matching
    // (x, y) snap the player to the other floor when walked onto.
    floors: [
      {
        // Floor 0: ground level ballroom / drawing room
        mapRows: [
          "############",
          "#S.....#...#",
          "#.##.#.#.#.#",
          "#....#.U.#.#",
          "###.##.###.#",
          "#.....C....#",
          "#.##.###.#.#",
          "#K.........#",
          "############"
        ],
        stairs: [{ x: 7, y: 3, to: 1 }]
      },
      {
        // Floor 1: bedrooms over the ballroom. Inner walls form a closet
        // room (open for now; doors/closets land in a follow-up commit).
        mapRows: [
          "############",
          "#..........#",
          "#..####....#",
          "#..#..#D...#",
          "#..#..#....#",
          "#..####....#",
          "#..........#",
          "#..........#",
          "############"
        ],
        stairs: [{ x: 7, y: 3, to: 0 }]
      }
    ],
    clueSpots: [
      { x: 9, y: 1, floor: 0 },
      { x: 2, y: 7, floor: 0 },
      { x: 4, y: 4, floor: 1 }
    ],
    cryptPosition: { x: 6, y: 5, floor: 0 },
    vampireStart: { x: 9, y: 7, floor: 0 }
  }
];

const FLOOR_HEIGHT = 3.4;

// Some contracts predate the multi-floor schema. Wrap them in a single-floor
// floors array so the rest of the server can use one access pattern.
function normalizeContract(c) {
  if (c.floors) {
    // Defensive: ensure entity positions carry a floor index
    return c;
  }
  return {
    ...c,
    floors: [{ mapRows: c.mapRows, stairs: [] }],
    clueSpots: c.clueSpots.map((s) => ({ ...s, floor: 0 })),
    cryptPosition: { ...c.cryptPosition, floor: 0 },
    vampireStart: { ...c.vampireStart, floor: 0 }
  };
}
for (let i = 0; i < contracts.length; i += 1) contracts[i] = normalizeContract(contracts[i]);

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

app.get("/api/evidence-types", (_req, res) => {
  res.json(Object.values(evidenceTypes));
});

app.get("/api/vampires", (_req, res) => {
  // Public catalog: include the canonical signatures plus the altEvidence
  // "Nightmare-only tell" so the journal can show all four possibilities
  // and narrow suspects correctly when the host has picked Nightmare.
  // Profile and lore go out unconditionally — they're worldbuilding for the
  // journal even before a species is identified. Banishment text stays
  // hidden until reveal.
  res.json(vampireCatalog.map((v) => ({
    id: v.id, name: v.name,
    evidence: v.evidence, altEvidence: v.altEvidence || null,
    profile: v.profile || "", lore: v.lore || ""
  })));
});

app.get("/api/rituals", (_req, res) => {
  // The journal needs to display ritual requirements as soon as a suspect is
  // narrowed down; safe to publish — players still need the evidence to know
  // which species they're targeting.
  res.json(Object.fromEntries(
    Object.entries(rituals).map(([id, r]) => [id, {
      name: r.name,
      requirements: r.requirements,
      hint: r.hint
    }])
  ));
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

function scanModels() {
  const out = { hunters: [], tent: null, houses: {}, vampires: {} };
  const baseDir = path.join(PUBLIC_DIR, "models");
  const safeList = (sub) => {
    const dir = path.join(baseDir, sub);
    if (!fs.existsSync(dir)) return [];
    try { return fs.readdirSync(dir).filter((f) => /\.glb$/i.test(f)); }
    catch (_e) { return []; }
  };

  out.hunters = safeList("hunters")
    .sort((a, b) => a === "default.glb" ? -1 : b === "default.glb" ? 1 : a.localeCompare(b))
    .map((f) => `/models/hunters/${encodeURIComponent(f)}`);

  // Tent: prefer tent.glb, then any file starting with 'tent_', then any
  // glb that mentions tent. The user's military kit drops many props in
  // here (barrels, crates, tank, etc.) so a more selective pick keeps the
  // staging tent slot pointing at an actual tent.
  const tentFiles = safeList("tents");
  const tentFile =
    tentFiles.find((f) => f === "tent.glb") ||
    tentFiles.find((f) => /^tent[_-]?/i.test(f)) ||
    tentFiles.find((f) => /tent/i.test(f)) ||
    tentFiles[0];
  if (tentFile) out.tent = `/models/tents/${encodeURIComponent(tentFile)}`;
  // All other files in tents/ are loaded as scenery props — keyed by basename
  // (without extension) so buildPrepBase can place them by name.
  out.tents = {};
  for (const f of tentFiles) {
    out.tents[f] = `/models/tents/${encodeURIComponent(f)}`;
  }

  // Houses & vampires: keyed by basename (sans extension)
  for (const f of safeList("houses")) {
    const id = f.replace(/\.glb$/i, "");
    out.houses[id] = `/models/houses/${encodeURIComponent(f)}`;
  }
  for (const f of safeList("vampires")) {
    const id = f.replace(/\.glb$/i, "");
    out.vampires[id] = `/models/vampires/${encodeURIComponent(f)}`;
  }
  // Environment props — anything in trees/, streets/, grass/. The client
  // scatters them around the staging area + along approach roads.
  out.trees = {};
  out.streets = {};
  out.grass = {};
  for (const f of safeList("trees"))   out.trees[f]   = `/models/trees/${encodeURIComponent(f)}`;
  for (const f of safeList("streets")) out.streets[f] = `/models/streets/${encodeURIComponent(f)}`;
  for (const f of safeList("grass"))   out.grass[f]   = `/models/grass/${encodeURIComponent(f)}`;
  return out;
}

let cachedModels = scanModels();
app.get("/api/models", (_req, res) => res.json(cachedModels));

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
  // Spawn is always on floor 0 — that's where the safe room 'S' lives.
  const rows = contract.floors[0].mapRows;
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      if (rows[y][x] === "S") return tileToWorld({ x, y });
    }
  }
  return tileToWorld({ x: 1, y: 1 });
}

function computeRelicSpawn(room) {
  // Walk every floor looking for a vault (K). Returns the first found,
  // alongside the floor index so the client can render at the right height.
  for (let floor = 0; floor < room.floors.length; floor += 1) {
    const rows = room.floors[floor].mapRows;
    for (let y = 0; y < rows.length; y += 1) {
      for (let x = 0; x < rows[y].length; x += 1) {
        if (rows[y][x] === "K") {
          const w = tileToWorld({ x, y });
          return { tile: { x, y, floor }, world: w, claimed: false };
        }
      }
    }
  }
  return null;
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
    vampireId: null,
    vampire: "Unknown",
    signs: [],
    // floors: per-floor mapRows + stair links. mapRows still mirrors floor 0
    // so the existing collision and AI helpers (which only see floor 0 for
    // now) keep working.
    floors: contract.floors,
    mapRows: contract.floors[0].mapRows,
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
    allowAltEvidence: !!room.allowAltEvidence,
    phase: room.phase,
    fear: room.fear,
    moon: room.moon,
    funds: room.funds,
    players: Object.values(room.players).map(publicPlayer),
    logs: room.logs.slice(-14),
    signs: room.signs,
    mapRows: room.mapRows,
    floors: room.floors,
    floorHeight: FLOOR_HEIGHT,
    clueSpots: room.clueSpots,
    cryptPosition: room.cryptPosition,
    spawn: room.spawn,
    tile: TILE,
    evidence: room.evidence,
    wards: room.wards,
    relic: room.relic,
    vampirePosition: room.vampirePosition,
    vampireTile: room.vampireTile,
    threat: room.threat,
    result: room.result,
    rewards: room.rewards,
    vampireId: (room.evidence.length >= room.evidenceRequired || room.phase === "complete") ? room.vampireId : null,
    revealedVampire: (room.evidence.length >= room.evidenceRequired || room.phase === "complete") ? room.vampire : "Unknown",
    banishment: (room.evidence.length >= room.evidenceRequired || room.phase === "complete") ? (vampireById(room.vampireId)?.banishment || "") : ""
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
    equipped: player.equipped,
    flashlight: player.flashlight,
    hasRelic: player.hasRelic
  };
}

function getRoom(code) {
  return rooms.get(String(code || "").trim().toUpperCase());
}

function emitRoom(room) {
  io.to(room.code).emit("room:state", publicRoom(room));
}

// Broadcast a generic VFX placeholder. Clients map `kind` to an effect prefab
// and play it at (x, z). Keep payloads small — these fire frequently.
function emitEffect(room, kind, x, z, extra = {}) {
  io.to(room.code).emit("match:effect", { kind, x, z, ...extra });
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
  // Vampire and signs are now picked dynamically per match (see startHunt)
  room.vampireId = null;
  room.vampire = "Unknown";
  room.signs = [];
  room.floors = contract.floors;
  room.mapRows = contract.floors[0].mapRows;
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

function pickVampireForMatch() {
  return vampireCatalog[Math.floor(Math.random() * vampireCatalog.length)];
}

// Two-step hunt entry: match:start drops the team into the prep phase
// (walkable military base outside the house). They mill around with their
// gear, then any player invokes match:enter-house to actually start the
// timer / vampire AI / fear+moon climb. Phasmo-style "leave the truck and
// walk through the front door" flow.
function enterPrep(room) {
  room.phase = "prep";
  room.fear = 18;
  room.moon = 45;
  room.evidence = [];
  room.wards = [];
  room.threat = 0;
  room.result = null;
  room.rewards = null;
  room.tickCount = 0;
  // Pick the vampire NOW (so the journal is consistent through prep) but
  // don't activate the AI tick yet; the body stays out of view until hunt.
  const vampire = pickVampireForMatch();
  room.vampireId = vampire.id;
  room.vampire = vampire.name;
  const isNightmare = room.difficultyId === "nightmare";
  const pool = (isNightmare && vampire.altEvidence)
    ? [...vampire.evidence, vampire.altEvidence]
    : vampire.evidence.slice();
  room.signs = pool.sort(() => Math.random() - 0.5).slice(0, room.clueSpots.length);
  room.allowAltEvidence = isNightmare;

  applyDifficulty(room, room.difficultyId || DEFAULT_DIFFICULTY);
  Object.values(room.players).forEach((p) => {
    p.alive = true;
    // Prep spawn is OUTSIDE the contract grid; client renders the base at
    // negative-Z and the player walks south to reach the house door.
    p.position = { x: 0, y: 1.0, z: 14 };
    p.flashlight = true;
    p.hasRelic = false;
    p.lastMoveAt = Date.now();
  });
  room.relic = computeRelicSpawn(room);
  stopHunt(room);
  addLog(room, `The team rolls up to ${room.contract}. Suit up at the staging post.`);
}

function startHunt(room) {
  room.phase = "hunt";
  room.vampireTile = { ...room.vampireStart };
  room.vampirePosition = tileToWorld(room.vampireStart);

  // If we're entering hunt directly (from a legacy call) make sure the
  // vampire and signs are picked. enterPrep already does this so calls
  // routed through match:start -> match:enter-house just re-use them.
  if (!room.vampireId) {
    const vampire = pickVampireForMatch();
    room.vampireId = vampire.id;
    room.vampire = vampire.name;
    const isNightmare = room.difficultyId === "nightmare";
    const pool = (isNightmare && vampire.altEvidence)
      ? [...vampire.evidence, vampire.altEvidence]
      : vampire.evidence.slice();
    room.signs = pool.sort(() => Math.random() - 0.5).slice(0, room.clueSpots.length);
    room.allowAltEvidence = isNightmare;
  }

  applyDifficulty(room, room.difficultyId || DEFAULT_DIFFICULTY);
  Object.values(room.players).forEach((p) => {
    p.alive = true;
    p.position = { x: room.spawn.x, y: 1.0, z: room.spawn.z };
    p.flashlight = true;
    p.lastMoveAt = Date.now();
  });
  stopHunt(room);
  room.huntInterval = setInterval(() => advanceHunt(room), HUNT_TICK_MS);
  addLog(room, `The team crosses the threshold. ${room.difficulty} hunt begins.`);
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
    if (room.phase !== "hunt" && room.phase !== "prep") return;

    let next;
    const yaw = Number(payload.yaw) || 0;
    if (room.phase === "prep") {
      // Prep area lives outside the contract grid; clamp to a generous 60m
      // perimeter and skip wall collision entirely. The base is dressed
      // client-side.
      next = {
        x: clamp(Number(payload.x) || player.position.x, -30, 30),
        y: 1.0,
        z: clamp(Number(payload.z) || player.position.z, -10, 30)
      };
    } else {
      next = {
        x: clamp(Number(payload.x) || player.position.x, PLAYER_RADIUS, room.mapRows[0].length * TILE - PLAYER_RADIUS),
        y: 1.0,
        z: clamp(Number(payload.z) || player.position.z, PLAYER_RADIUS, room.mapRows.length * TILE - PLAYER_RADIUS)
      };
      if (collidesWithWalls(room, next)) {
        socket.emit("player:reject", { position: player.position, yaw: player.yaw });
        return;
      }
    }
    // Track motion for the "stand still" ritual conditions. Only count
    // movement that crosses a meaningful threshold so micro-jitter from
    // mouse-look doesn't keep resetting the timer.
    const dx = next.x - player.position.x;
    const dz = next.z - player.position.z;
    if ((dx * dx + dz * dz) > 0.04) player.lastMoveAt = Date.now();
    player.position = next;
    player.yaw = yaw;

    // Realtime broadcast to the rest of the room so other clients animate
    // this player without waiting for the periodic room:state. Sender is
    // excluded via socket.to(...). Payload is tiny.
    socket.to(room.code).emit("player:moved", {
      id: socket.id,
      x: next.x,
      z: next.z,
      yaw
    });

    // Auto-pickup relic when within range
    if (room.relic && !room.relic.claimed) {
      const rd = Math.hypot(next.x - room.relic.world.x, next.z - room.relic.world.z);
      if (rd < 1.5) {
        room.relic.claimed = true;
        player.hasRelic = true;
        addLog(room, `${player.name} pocketed the relic from the vault.`);
        emitEffect(room, "relic_pickup", room.relic.world.x, room.relic.world.z);
        emitRoom(room);
      }
    }
  });

  socket.on("player:flashlight", (payload = {}) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;
    player.flashlight = !!payload.on;
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
    // Start in the prep area; host triggers match:enter-house when team is
    // ready to actually breach the door. (This replaces the old direct
    // startHunt path so the staging post is part of the loop.)
    enterPrep(room);
    emitRoom(room);
  });

  socket.on("match:enter-house", () => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    // Any player in the prep area can trigger entry — usually the first
    // one to walk through the door portal. Host gets priority if a race
    // happens since match:start is host-gated.
    if (room.phase !== "prep") return;
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
    const nearby = findNearbyClue(room, player);
    if (!nearby) {
      room.fear = Math.min(100, room.fear + 2);
      addLog(room, `${player.name} scans the dark but finds nothing certain.`);
      emitRoom(room);
      return;
    }
    if (equipped.detects !== nearby.sign) {
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
    const signName = evidenceTypes[nearby.sign]?.name || nearby.sign;
    addLog(room, `Evidence logged: ${signName} (via ${equipped.name}).`);
    emitEffect(room, "evidence_logged", nearby.world.x, nearby.world.z);
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
    const wardWorld = tileToWorld(tile);
    room.wards.push({ x: tile.x, y: tile.y, world: wardWorld });
    room.funds = Math.max(0, room.funds - cost);
    room.fear = Math.max(0, room.fear - 8);
    room.threat = Math.max(0, room.threat - 12);
    addLog(room, `${player.name} burns a ward at [${tile.x}, ${tile.y}].`);
    emitEffect(room, "ward_ignite", wardWorld.x, wardWorld.z);
    emitRoom(room);
  });

  // Step 1: the client presses F at the crypt with enough evidence. We
  // respond with the list of suspects that still match the confirmed evidence
  // so the client can show its banish picker.
  socket.on("match:seal", () => {
    const room = getRoom(socket.data.roomCode);
    if (!room || room.phase !== "hunt") return;
    const player = room.players[socket.id];
    if (!player) return;
    const tile = worldToTile(player.position);
    const inCrypt = tile.x === room.cryptPosition.x && tile.y === room.cryptPosition.y;
    if (!inCrypt) {
      socket.emit("notice", { type: "error", message: "Stand on the crypt floor to seal it." });
      return;
    }
    if (room.evidence.length < room.evidenceRequired) {
      socket.emit("notice", { type: "error", message: `Need ${room.evidenceRequired} evidence first.` });
      return;
    }
    const confirmed = room.evidence;
    const suspects = vampireCatalog
      .filter((v) => vampireMatches(v, confirmed, room.allowAltEvidence))
      .map((v) => ({ id: v.id, name: v.name }));
    socket.emit("match:banish-prompt", { suspects });
  });

  // Step 2: the client submits a banishment attempt with a chosen species id.
  // Success requires (a) the pick matches the actual vampire AND (b) the
  // species-specific ritual conditions are met.
  socket.on("match:banish", (payload = {}) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || room.phase !== "hunt") return;
    const player = room.players[socket.id];
    if (!player) return;
    const tile = worldToTile(player.position);
    if (!tileEq(tile, room.cryptPosition)) {
      socket.emit("notice", { type: "error", message: "Step onto the crypt before banishing." });
      return;
    }
    if (room.evidence.length < room.evidenceRequired) {
      socket.emit("notice", { type: "error", message: `Need ${room.evidenceRequired} evidence first.` });
      return;
    }
    const pickId = String(payload.vampireId || "");
    const pick = vampireById(pickId);
    if (!pick) {
      socket.emit("notice", { type: "error", message: "No such bloodline." });
      return;
    }
    // Validate the pick is consistent with the confirmed evidence — keeps the
    // client honest if a tampered request comes in. Nightmare lets confirmed
    // signs come from the 4-evidence pool, so we use the allowAlt-aware
    // matcher here.
    if (!vampireMatches(pick, room.evidence, room.allowAltEvidence)) {
      socket.emit("notice", { type: "error", message: "Your evidence does not match that species." });
      return;
    }

    const cryptWorld = tileToWorld(room.cryptPosition);
    if (pick.id !== room.vampireId) {
      // Wrong species — banishment fails the whole contract, Phasmo-style.
      const correct = vampireById(room.vampireId);
      emitEffect(room, "banish_fail", cryptWorld.x, cryptWorld.z);
      finishMatch(room, false, `${player.name} performed the rite for the ${pick.name}, but it was a ${correct.name}.`);
      return;
    }

    // Right species — check the ritual conditions for it.
    const ritual = rituals[pick.id];
    const result = ritual ? ritual.check(room, player) : true;
    if (result !== true) {
      // Ritual unmet — punish but allow another attempt.
      room.fear = Math.min(100, room.fear + 12);
      socket.emit("notice", { type: "error", message: `Ritual incomplete: ${result}` });
      addLog(room, `${player.name} began the rite but the ${pick.name} resisted: ${result}`);
      emitEffect(room, "ritual_fizzle", cryptWorld.x, cryptWorld.z);
      emitRoom(room);
      return;
    }
    emitEffect(room, "banish_success", cryptWorld.x, cryptWorld.z);
    finishMatch(room, true, `${player.name} banished the ${pick.name} with the ${ritual.name} rite.`);
  });

  socket.on("match:ping", (payload = {}) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || room.phase !== "hunt") return;
    const player = room.players[socket.id];
    if (!player || !player.alive) return;
    const x = Number(payload.x);
    const z = Number(payload.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    // Server forwards pings to the room. No persistence — clients auto-fade.
    io.to(room.code).emit("room:ping", {
      x, z,
      from: player.id,
      name: player.name,
      color: player.profile?.color || "teal",
      at: Date.now()
    });
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

  socket.on("room:leave", (_payload = {}, ack) => {
    leaveCurrentRoom(socket);
    socket.emit("room:left");
    ack?.({ ok: true });
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
    equipped: 0,
    flashlight: true,
    hasRelic: false,
    lastMoveAt: Date.now()
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
      emitEffect(room, "hunter_caught", target.position.x, target.position.z);
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
      vampire: room.vampire,
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
  const playerFloor = floorFromY(player.position.y);
  // Only clues on the player's current floor count — you can't scan
  // through ceilings.
  const clues = room.clueSpots
    .map((spot, i) => ({ world: tileToWorld(spot), sign: room.signs[i], floor: spot.floor || 0 }))
    .filter((c) => c.floor === playerFloor);
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

function floorFromY(y) {
  if (typeof y !== "number") return 0;
  return Math.max(0, Math.floor((y - 0.5) / FLOOR_HEIGHT));
}

function defaultGearFor(loadoutId) {
  switch (loadoutId) {
    case "occultist": return ["aura_reader", "spirit_box", "uv_flashlight", "emf_reader"];
    case "sentinel":  return ["emf_reader", "uv_flashlight", "thermal_camera", "pheromone_analyzer"];
    case "medium":    return ["spirit_box", "ultrasonic_mic", "aura_reader", "chronometer"];
    case "alchemist": return ["field_kit", "ectoplasm_detector", "pheromone_analyzer", "thermal_camera"];
    default:          return ["uv_flashlight", "emf_reader", "spirit_box", "field_kit"];
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
  console.log(`Nightfall: Hunters' Crusade server listening on ${PORT}`);
});
