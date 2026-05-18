# Bloodline Protocol

Bloodline Protocol is a realtime browser prototype for a co-op vampire investigation game.

## Current Build

- Browser client served from `public/`
- Node/Express backend in `server/`
- Socket.IO realtime lobbies
- Saved browser profiles with names, titles, colors, and loadouts
- Host-owned rooms with ready checks and host-only contract controls
- Server-owned match state for players, loadouts, movement, evidence, wards, fear, moon, funds, and results
- Render-ready `render.yaml`

## Render Setup

Create a Render **Web Service** connected to this GitHub repo.

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`

You do not need Postgres for this first version. The server stores active match state in memory. Add Postgres later for accounts, progression, unlocks, cosmetics, and match history.

## Local Development

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:4173
```

## Roadmap

1. Add server-side vampire movement and hunt events.
2. Add richer match results and post-game rewards.
3. Replace the 2D board with a 3D WebGL vertical slice.
4. Add persistence with Postgres when progression exists.
5. Prepare a portal-friendly build for sites like CrazyGames.
