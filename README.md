# Bloodline Protocol

Bloodline Protocol is a realtime browser prototype for a co-op vampire investigation game.

## Current Build

- Browser client served from `public/`
- Node/Express backend in `server/`
- Socket.IO realtime lobbies
- In-memory room state for players, loadouts, movement, evidence, wards, fear, moon, and funds
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

1. Harden realtime lobby and room ownership.
2. Move vampire AI and evidence rules fully server-side.
3. Add match results and replayable contracts.
4. Replace the 2D board with a 3D WebGL vertical slice.
5. Add persistence with Postgres when progression exists.
