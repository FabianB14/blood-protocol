# CLAUDE.md — Nightfall: Hunters' Crusade

Co-op multiplayer vampire-hunting horror game (Phasmophobia-style deduction).
Formerly "Bloodline Protocol" — you may still see that name in old commits.

There are **two builds in this repo**:

| Build | Where | Status |
|---|---|---|
| Web prototype | `server/` + `public/` | Live on Render, playable, feature-rich |
| Unity 6 port | `unity/` | Scaffold: data pipeline + greybox + FPS controller |

The web build is the **design testbed** (fast iteration on rules/balance).
The Unity build is the **long-term target** (real lighting/shadows, audio
occlusion, Steam-quality feel). Both share one canonical game design.

## Golden rules

1. **Data lives in two places and MUST stay in sync**:
   `server/index.js` (web, source of truth today) and
   `unity/Assets/Scripts/Core/NightfallCatalog.cs` (Unity port of the same
   data). If you tune vampires/evidence/difficulties/maps in one, mirror the
   change in the other in the same session.
2. **Push to `main`.** The user tests on Render, which auto-deploys `main`.
   The branch `claude/vampire-game-3d-zajqZ` is historical; keep it
   fast-forwarded when convenient, never push to it *instead of* main.
3. **Syntax-check before committing.** No build step exists:
   - Server: `node --check server/index.js`
   - Client: extract the `<script type="module">` from `public/index.html`
     to a `.mjs` file and `node --check` it.
4. **Never commit** `unity/Library/`, `node_modules/`, or `data/*.json`
   (all gitignored — leave it that way).
5. **Model/asset filenames are load-bearing** (see Asset pipeline below).
   The server scans folders and keys behavior off exact filenames.
6. If `git push` fails with username/credential errors, the session git
   proxy is down: push via the GitHub MCP `push_files` tool instead, then
   `git fetch && git reset --hard origin/main` to re-sync local.

## Repo map

```
server/index.js        Node/Express + Socket.IO authoritative game server (~1400 lines)
public/index.html      Entire web client: Three.js 3D + HUD + menus (single file, ~3000 lines)
public/models/         GLB assets, scanned at server boot (see Asset pipeline)
public/textures/       ambientCG PBR sets: wall/ floor/ crypt/ ceiling/
public/vfx/  public/sfx/   Placeholder folders for effects/audio (READMEs inside)
data/                  Runtime JSON persistence (leaderboard, profiles) — gitignored
unity/                 Unity 6 (URP) project scaffold — see unity/README.md
render.yaml            Render web service config (health check: /health)
```

## Game design canon

### Core loop
Lobby → **prep** (walkable military base outside the house; enter via the
glowing door portal) → **hunt** (find evidence inside, deduce the species,
perform its ritual at the crypt) → complete (payout, XP, leaderboard).
Fail states: fear ≥ 100%, moon ≥ 100%, wrong species picked at banish.

### 10 evidence types ↔ 10 tools (1:1)
Blood Traces↔UV Flashlight · EMF Readings↔EMF Reader · Thermal↔Thermal
Camera · Spectral Echoes↔Spirit Box · Physical Traces↔Field Kit ·
Ectoplasm↔Ectoplasm Detector · Pheromones↔Pheromone Analyzer ·
Temporal↔Chronometer · Aura↔Aura Reader · Sonic↔Ultrasonic Mic.
Scanning a clue only logs evidence if the **matching tool is equipped**.

### 10 vampires — unique 3-evidence signatures (+Nightmare 4th tell)
| Species | Signature | Alt (Nightmare) | Ritual condition (server-checked) |
|---|---|---|---|
| Nosferatu | Physical·EMF·Pheromones | Thermal | flashlight off |
| Vampiric Noble | Spectral·Physical·Aura | Pheromones | carry vault relic + moon%25 ≤ 4 |
| Shade Stalker | Thermal·Spectral·Blood | Aura | ≥2 wards within 2 tiles of crypt |
| Blood Alchemist | Blood·Physical·Pheromones | Ectoplasm | ward on the crypt tile |
| Mist Walker | Ectoplasm·EMF·Thermal | Aura | stand still 3 s |
| Chronovampire | Temporal·Physical·Spectral | EMF | ≥2 hunters on crypt |
| Psychic Leech | Aura·Spectral·Sonic | Temporal | ALL living hunters on crypt |
| Feral Bloodline | Physical·Pheromones·Thermal | Blood | threat ≤ 20% |
| Technological Hybrid | EMF·Physical·Sonic | Temporal | flashlight off + zero wards |
| Dreamweaver | Spectral·Aura·Sonic | Ectoplasm | still 3 s + flashlight off |

Vampire is picked **randomly per match** (decoupled from map). Species name
is hidden from clients until evidence threshold met or match end. Full lore
text lives in both data files.

### Difficulties
| Id | Funds | Moon/Fear rate | Pursuit at threat | Gear slots | Evidence req | Payout | Alt evidence |
|---|---|---|---|---|---|---|---|
| amateur | 800 | 1.0/1.2 | 32% | 4 | 3 | 0.9× | – |
| standard | 640 | 1.4/1.5 | 22% | 3 | 3 | 1.0× | – |
| tense | 520 | 1.8/1.8 | 16% | 3 | 3 | 1.3× | – |
| aggressive | 420 | 2.2/2.2 | 12% | 3 | 2 | 1.6× | – |
| nightmare | 320 | 2.8/2.6 | 8% | 2 | 2 | 2.3× | 3-of-4 draw |

### Loadout classes
Occultist (scan 3.4 m, ward $60) · Sentinel (1.8 m, $35) ·
Medium (2.6 m, $50) · Alchemist (2.0 m, $45). Each has a 4-item default
gear list (`defaultGearFor` / `LoadoutDef.DefaultGear`).

### Payout math (must match in both builds)
`evidencePay = round(count × 120 × mult)`; survival `round(max(0,250−fear)×mult)`;
speed `round(max(0,200−moon)×mult)`; level `round(level×80×mult)` — success
only; `total = round(funds + all)`. Rank: S≥1800 A≥1400 B≥1050 C≥750 else D.
XP: `floor(total/5) + (success?60:10)`; level `floor(sqrt(xp/50))+1`.
Rounding is **.5 away from zero** (JS Math.round); Unity side uses
`MidpointRounding.AwayFromZero` deliberately.

### Contracts (7 maps, tile grids)
ashbury(1) · orla(2) · blackwater(3) · greywick(4) · lazarus(3) ·
wraithmoor(3) · **ravenhall(2, TWO floors + stairs)**. Grid chars:
`#` wall · `.` open · `S` spawn · `C` crypt · `K` vault · `U`/`D` stairs.
One tile = **4 m**; wall/floor height **3.4 m**; eye height 1.7 m;
walk 3.4 m/s, sprint 6.5 m/s, investigate ×0.5; player radius 0.55 m.

## Web build architecture

- **Server-authoritative.** 1.5 s hunt tick (`advanceHunt`): fear/moon climb,
  threat, vampire tile-pathing toward nearest hunter, hunt events.
  Movement: client sends `player:move` ~15 Hz; server validates against the
  tile grid (8-point collision) and broadcasts `player:moved` to peers.
- **Phases**: `lobby` (staging camp scene) → `prep` (FOB, movement allowed,
  relaxed clamp ±30 m, prop cylinder colliders client-side) → `hunt`
  (grid collision) → `complete`.
- **Key socket events**: room:create/join/leave, player:update/move/equip/
  flashlight, match:start (→prep), match:enter-house (→hunt), match:scan,
  match:ward, match:seal (→ banish-prompt w/ suspects), match:banish
  (validates species pick + ritual), match:ping, match:chat, match:effect
  (VFX broadcast), room:state / room:tick / room:ping / player:moved.
- **REST**: /health, /api/contracts, /api/gear, /api/difficulties,
  /api/evidence-types, /api/vampires, /api/rituals, /api/leaderboard,
  /api/profile/:clientId, /api/models, /api/textures.
- **Persistence**: `data/leaderboard.json`, `data/profiles.json` (browser
  clientId-keyed XP). Ephemeral on Render free tier — known limitation.
- **Client niceties that bite**: pointer lock needs a user gesture; a focused
  INPUT eats WASD (closeModal blurs); skinned GLBs need
  `frustumCulled = false` + forced-opaque materials or they render invisible;
  hunter GLBs face −Z so mesh yaw = camera yaw (no +π); vampire opacity is
  proximity+moon-driven (full <2.2 m, zero >6 m, moon ramp 65→95%, hard cut
  below 15% alpha).

## Unity build (unity/)

- **Pattern**: `NightfallCatalog.cs` (pure C#, no UnityEngine) → editor menu
  **Nightfall → Generate Game Data** materializes ~40 ScriptableObjects under
  `Assets/Data/` (idempotent) + validates signature uniqueness / gear
  coverage / map integrity. **Nightfall → Build Greybox From Selected
  Contract** turns a ContractSO's tile grid into a walkable scene.
- `DeductionEngine` / `RewardCalculator` are UnityEngine-free ports of the
  server logic — keep them in behavioral lockstep.
- `PlayerController`: CharacterController FPS, dual input paths
  (`#if ENABLE_INPUT_SYSTEM` polling Keyboard/Mouse.current, else legacy);
  auto-creates a shadow-casting spot flashlight. C# 9 only (Unity 6) — no
  file-scoped namespaces, no struct field initializers.
- **Recommended workflow**: fresh Unity Hub "Universal 3D" project, copy
  `unity/Assets/Scripts` in, run the generator. For editor-driving AI, run
  Claude Code locally with Unity MCP (this cloud session cannot reach a
  local Unity editor).
- **Milestone order**: greybox+flashlight → post-processing (vignette, grain,
  low ambient) → networked walk-around (Photon Fusion or NGO — undecided)
  → port match loop onto ScriptableObject data → art pass.

## Asset pipeline (web build)

Server scans these at boot; **exact filenames matter**:

```
public/models/hunters/    any .glb — rigged humanoids, idle/walk/run clips
                          (clip names matched by substring), assigned per
                          player by socket-id hash
public/models/vampires/   <species_id>.glb (e.g. nosferatu.glb) or default.glb
public/models/houses/     <contract_id>.glb or default.glb (prep-area exterior)
public/models/tents/      FOB kit; tent.glb / tent_*.glb preferred for the
                          tent slot, everything else placed by filename in
                          buildPrepBase (tank_001, tower_001, box_00N, ...)
public/models/trees|streets|grass/   scattered scenery (any .glb)
public/textures/<surface>/  ambientCG naming: *_Color, *_NormalGL,
                          *_Roughness, *_AmbientOcclusion (1K/2K JPG)
public/vfx/  public/sfx/  see their READMEs (audio system not wired yet;
                          Settings volume sliders persist but drive nothing)
```

GLB guidance: face −Z, ~1.8–2 m tall for characters, <5 MB each (Draco
compression supported — DRACOLoader is wired). Strip ambientCG zips of
.blend/.usdc/_NormalDX/_Displacement junk. Files missing the `.glb`
extension are valid glTF but invisible to the scanner — rename them.

### Free asset sources (both builds)
- **Mixamo** (free, Adobe login): characters + animation library. For Unity:
  import FBX directly, set rig to Humanoid, retarget — no Blender needed.
  For web: convert to GLB in Blender with animations included.
- **poly.pizza** (CC0 aggregate): Quaternius + Kenney packs — characters,
  monsters, camping/military props, trees, Halloween kit.
- **KayKit** (kaylousberg.itch.io, CC0): Dungeon Remastered, Adventurers,
  Skeletons — stylized but rigged and animation-complete.
- **Unity Asset Store free tier** (Unity build only): Unity "Starter Assets –
  First Person", Synty POLYGON Starter Pack; filter Price: Free.
- **ambientCG / Poly Haven** (CC0): PBR textures, HDRIs.
- **freesound.org / OpenGameArt** (check licenses): SFX + ambience.
- Paid but high-leverage later: Synty POLYGON Horror Mansion (~$30).

## Dev commands

```bash
npm install && npm run dev          # web build on http://localhost:4173
node --check server/index.js        # server syntax gate
# client syntax gate:
node -e "const fs=require('fs');const m=fs.readFileSync('public/index.html','utf8').match(/<script type=\"module\">([\s\S]*?)<\/script>/);fs.writeFileSync('/tmp/_c.mjs',m[1]);require('child_process').execSync('node --check /tmp/_c.mjs',{stdio:'inherit'})"
# multiplayer smoke test: npm i --no-save socket.io-client, script a client
# (room:create → ready → match:start → match:enter-house → scan/ward/banish),
# then npm uninstall socket.io-client
```

Deploy: Render auto-deploys `main` (`npm install` / `npm start`,
health `/health`). Client changes need a hard refresh (Ctrl/Cmd-Shift-R) —
tell the user this when shipping UI fixes.

## Current state & near-term roadmap

Done (web): full deduction loop (evidence→journal→banish w/ per-species
rituals), prep-base FOB with door-portal entry, 7 maps (1 multi-floor
render-only), 5 difficulties, gear hotbar, investigation mode, pings, text
chat, VFX placeholder system, touch controls + rotate overlay, title screen
+ settings (FOV/sensitivity/brightness live; volume sliders are stubs),
leaderboard + XP persistence, uploaded GLB integration.

Open (web): stair traversal gameplay for Ravenhall floor 1 (renders, can't
climb); doors/closets/hide mechanic (user picked: interactive doors that
block AI, closets as hide-points with loot, vampire door-slams); vampire
multi-floor pathfinding; audio system behind the volume sliders; real VFX
sprites; per-model forward-axis override if a future GLB faces +Z.

Open (Unity): everything past the scaffold — see milestone order above.

## Session/user conventions

- The user (Fabian) uploads assets via the GitHub web UI, so `git pull
  --rebase origin main` **before every work block** — the tree changes
  between sessions. Junk uploads happen (missing extensions, metadata
  files) — normalize filenames, delete junk, tell them what you renamed.
- They test on a live Render URL and on mobile; expect cache staleness and
  say "hard refresh" when relevant.
- Ship small, verify each change (syntax gates + socket smoke test),
  commit with detailed messages, push to main, summarize with a table of
  what changed + what to test + honest known-issues.
