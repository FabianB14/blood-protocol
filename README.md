# Bloodline Protocol

A realtime browser co-op vampire investigation game — first-person 3D, Phasmophobia-style. Hunt the bloodline, log three signs of evidence, and seal the coffin before fear or the moon hits 100%.

## Current Build

- **3D first-person client** built on Three.js (no install — loaded via importmap)
- WASD + mouse-look controls with server-validated wall collision
- **Server-driven hunt loop** (Node/Express + Socket.IO) at 1.5s ticks: vampire AI, threat, fear, moon, payout
- **4 contracts / levels** — Ashbury Manor, Saint Orla's Hospice, Blackwater Theatre, Greywick Station
- **4 loadouts** — Occultist, Sentinel, Medium, Alchemist, each with distinct scan radius and ward cost
- **Multiplayer lobbies** with shareable room codes (`?room=ABCD` invite links)
- **Persistent leaderboard** (`data/leaderboard.json`) and **per-browser profile XP/level** (`data/profiles.json`)
- Host-only contract picking + ready-up flow

## Controls

| Key | Action |
| --- | --- |
| WASD | Walk |
| Shift | Sprint |
| Mouse | Look around (click canvas to lock pointer) |
| E | Scan for evidence |
| Q | Burn a ward |
| F | Seal coffin (must stand on crypt floor with 3 evidence) |
| Tab | Open / close menu |
| Esc | Release pointer |

## Local Development

```bash
npm install
npm run dev
```

Then open <http://localhost:4173>.

## Render Setup

Render **Web Service** connected to this GitHub repo.

- Runtime: Node 20+
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`

> **Heads up:** on Render's free plan the container is ephemeral, so `data/leaderboard.json` and `data/profiles.json` reset when the dyno cycles. For durable scores, mount a persistent disk or swap the JSON files for Postgres / Redis.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Liveness check (returns room count) |
| `GET /api/contracts` | List of available contracts and difficulty levels |
| `GET /api/leaderboard?contract=<id\|all>` | Top scores (sorted by total payout) |
| `GET /api/profile/:clientId` | XP / level / contracts cleared for one browser profile |

## Roadmap

1. Replace primitive meshes with proper models + textures
2. Per-player voice radio (WebRTC mesh)
3. Procedural map generation per seed
4. Cosmetics + unlock progression tied to player level
5. Spectator camera once a hunter is downed

## Architecture Notes

- **Coordinates.** Maps live as character grids (`server/index.js`). Each tile is 4 world units. Clients build the 3D map by extruding `#` tiles into boxes; the server stays on the grid for AI/collision.
- **Authority.** Movement is sent client → server at ~15 Hz; the server validates against the grid and broadcasts hunt ticks to all clients. Other-player positions interpolate client-side.
- **Persistence.** Browser-generated `clientId` keys the player profile on disk so XP survives reconnects.
