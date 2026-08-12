# Nightfall: Hunters' Crusade — Unity

Unity port of the browser prototype in the repo root. The design layer
(10 vampires, 10 evidence types, rituals, difficulties, gear, 7 contract
maps) is generated as ScriptableObjects from a single canonical data file,
so it stays in lockstep with `server/index.js`.

## Requirements

- **Unity 6 LTS** (6000.0.x or newer) via Unity Hub, with the
  **Universal Render Pipeline** (URP)
- Optional but recommended: **Claude Code running locally** on the same
  machine, connected through [Unity MCP](https://docs.unity3d.com/Packages/com.unity.ai.assistant@2.0/manual/unity-mcp-overview.html)
  so the AI can drive the editor directly

## Getting started (recommended path)

The most reliable route — avoids any package-version drift:

1. Unity Hub → **New project** → **Universal 3D** template → name it
   whatever you like (e.g. `NightfallUnity`), any location outside this repo
2. Close Unity. Copy this folder's `Assets/Scripts` into the new project's
   `Assets/`
3. Reopen the project. Let it compile.
4. Menu bar → **Nightfall → Generate Game Data** — creates every
   ScriptableObject asset under `Assets/Data/` (evidence, gear, vampires,
   difficulties, loadouts, contracts) and runs validation
5. Menu bar → **Nightfall → Build Greybox From Selected Contract** with a
   Contract asset selected in the Project window — builds a walkable
   greybox of that map (walls, floors, clue/crypt/spawn markers, lights)
6. Drop the `PlayerController` prefab-less setup into the scene: create a
   Capsule, add `PlayerController`, parent the Main Camera to it at
   y ≈ 0.65, press Play. WASD + mouse look + Shift sprint + F flashlight.

### Alternate path: open this folder directly

`unity/` contains a minimal `Packages/manifest.json` and
`ProjectSettings/ProjectVersion.txt`, so Unity Hub can open it as a project
(Add → select the `unity/` folder). Unity will resolve/upgrade package
versions on first open. If URP isn't active afterwards: Edit → Project
Settings → Graphics → assign a URP Render Pipeline Asset (create one via
Assets → Create → Rendering → URP Asset with Universal Renderer).

## What's here

```
Assets/Scripts/
  Core/
    NightfallIds.cs        Enums: EvidenceId, VampireId, GearId, DifficultyId, LoadoutClass
    NightfallConstants.cs  Tile size, move speeds, timing constants (mirrors the web build)
    NightfallCatalog.cs    THE canonical data — all species, evidence, gear,
                           difficulties, loadouts, rituals, contract maps.
                           Pure C# (no UnityEngine) so it can also run
                           in a headless server context.
    DeductionEngine.cs     Suspect narrowing from confirmed evidence (pure C#)
    RewardCalculator.cs    Payout / rank math, ported from server/index.js
  Data/
    *SO.cs                 ScriptableObject wrappers for each catalog type
  Editor/
    NightfallDataGenerator.cs  Menu: Nightfall → Generate Game Data.
                               Materializes all catalog entries as .asset files
                               (idempotent — re-running updates in place) and
                               validates: unique 3-evidence signatures, gear
                               coverage of all 10 evidence types, contract
                               integrity.
    GreyboxBuilder.cs          Menu: Nightfall → Build Greybox From Selected
                               Contract. Tile grid → cubes/floors/markers.
  Gameplay/
    PlayerController.cs    First-person controller (CharacterController-based),
                           works with both the Input System package and legacy
                           input. Includes flashlight toggle.
```

## Multiplayer (not in this scaffold)

Decision pending between **Photon Fusion** (Asset Store, free ~100 CCU
tier, host-migration + voice ecosystem — what Phasmophobia's stack looks
like) and **Unity Netcode for GameObjects** (first-party). The
`NightfallCatalog` / `DeductionEngine` / `RewardCalculator` trio is
deliberately UnityEngine-free so the authoritative match logic can live
on whichever host model gets picked.

## Suggested first milestone

1. Generate data + build the Ashbury Manor greybox
2. PlayerController + URP flashlight with real-time shadows
3. Post-processing volume: vignette, film grain, low ambient
4. One networked walk-around (Fusion or NGO)

That slice will already look more like Phasmophobia than the browser
build can.
