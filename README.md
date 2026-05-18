# Bloodline Protocol

Bloodline Protocol is a realtime browser prototype for a co-op vampire investigation game.

## Current Build

- Browser client served from `public/`
- Node/Express backend in `server/`
- Socket.IO realtime lobbies
- Saved browser profiles with names, titles, colors, and loadouts
- Host-owned rooms with ready checks and host-only contract controls
- Server-owned match state for players, loadouts, movement, evidence, wards, fear, moon, funds, and results
- Server-side vampire pursuit, threat meter, hunt events, ward counterplay, and payout grades
- Server-selected contracts with unique objectives, difficulty labels, map layouts, clue locations, crypt rooms, and vampire start points
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

1. Add persistent player progression with Postgres.
2. Replace the 2D board with a 3D WebGL vertical slice.
3. Add cosmetics, unlockable tools, and account profiles.
4. Add private-room settings and difficulty modifiers.
5. Prepare a portal-friendly build for sites like CrazyGames.
