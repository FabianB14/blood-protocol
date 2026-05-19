# Models

Drop GLB / glTF Binary files into the right subfolder. The server scans these
folders at startup; the client loads the first matching file per slot.

## hunters/

Already populated. Each `.glb` is rigged with humanoid skeleton + idle / walk
/ run animations. Players are deterministically assigned one per match by
their socket id.

## tents/

**Needs 1 file.** This is the staging-area centerpiece — visible while in the
lobby phase, before any hunt starts.

- Drop a single `tent.glb` here.
- Recommended: a small canvas A-frame or wedge tent, ~2 m wide, opening
  facing forward (towards -Z). Lit campfire / lanterns nearby work too.
- Suggested source: poly.pizza/u/Quaternius → search "tent" or "camp" —
  Quaternius has a CC0 "Camping Kit" with tents, crates, fire pits.
- Alternative: search Sketchfab for "low poly tent" filtered to CC.

When `tent.glb` exists the client renders it instead of the primitive
cone-tent placeholder.

## houses/

**Needs 1 file per contract you want to upgrade.** Filename matches the
contract id from `/api/contracts`:

- `ashbury.glb`        — Ashbury Manor
- `orla.glb`           — Saint Orla's Hospice
- `blackwater.glb`     — Blackwater Theatre
- `greywick.glb`       — Greywick Station
- `lazarus.glb`        — Lazarus Industries
- `wraithmoor.glb`     — Wraithmoor Sanitarium
- `ravenhall.glb`      — Ravenhall Estate (multi-floor — needs interior
  geometry for 2 floors plus a visible exterior with a door)

Each house should fit roughly inside a `48 × 12 × 36` m volume (12 × 9 grid
tiles × 4 m per tile). For Phasmo-style entry you'll want:

- A visible **exterior** the player can approach from a "spawn point"
  outside.
- A clearly-marked **front door** roughly at the map's spawn area.
- Interior **rooms** matching the tile layout of the contract's `mapRows`
  (or close enough that collision feels right).

For an MVP you can omit interior geometry — the existing grid-built walls
still render underneath. Use a house GLB just for the exterior + roof and
let the procedural interior fill in.

Sources to consider:
- **Synty POLYGON Horror Mansion** (paid, ~$30) — comes with a full mansion
  ready to drop in.
- **Sketchfab** filtered to CC — search "victorian house", "abandoned
  mansion", "haunted house low poly".
- Free: poly.pizza/u/Quaternius "Castle Kit" or "Halloween Kit" for stylized
  exteriors.

## vampires/

**Needs up to 10 files**, one per species. Filename matches the vampire id:

- `nosferatu.glb`
- `noble.glb`
- `shade_stalker.glb`
- `blood_alchemist.glb`
- `mist_walker.glb`
- `chronovampire.glb`
- `psychic_leech.glb`
- `feral.glb`
- `tech_hybrid.glb`
- `dreamweaver.glb`

Specs per model:
- Rigged humanoid (or near-humanoid). 1.8-2.0 m tall.
- Facing -Z by default.
- At least one idle animation. Walk + run animations are also used during
  pursuit and let the AI animate naturally.
- Color or material that fits the species (Nosferatu = pale, Tech Hybrid =
  half-metal, Feral = bestial, etc.). Tinting from the species color isn't
  applied to vampires yet.

If a specific vampire's GLB is missing, the client falls back to the
existing placeholder (cylindrical body, red eyes, faint halo).

Sources:
- **Mixamo** characters (with horror-style materials) work well — pick
  bony / robed / armored looks and export each as GLB via Blender.
- **Quaternius** has CC0 monster packs on poly.pizza — search "monster",
  "skeleton", "creature".
- **Sketchfab** CC-filtered: "vampire", "ghoul", "wraith", "lich",
  "necromancer".

## File size guidance

- Keep individual GLBs under 5 MB if possible. The browser caches them but
  the first download adds to the page load.
- Use **Draco compression** when exporting from Blender if your model is
  large — most modern Three.js setups handle it transparently (we may need
  to add the DracoLoader on the client if you go that route).

## trees/

**Optional.** Any `.glb` here is randomly placed around the perimeter of
the FOB instead of the primitive cone silhouettes that ship by default.
Drop as many variants as you like — each tree is rotated randomly and
scaled to ~5-8 m tall.

Sources:
- poly.pizza/u/Quaternius "Stylized Nature" or "Halloween Kit" packs
- KayKit nature packs
- Sketchfab → CC + low-poly tree

## streets/

**Optional.** Any `.glb` here is laid in a row along the approach corridor
between the FOB spawn and the door portal (z = 4 → -10, every 2 m).
Good for stone slabs, dirt roads, gravel tiles, broken paving.

Sources:
- Quaternius "Modular Road" or "Path Tile" packs
- Free dirt-path GLBs on Sketchfab

## grass/

**Optional.** Tufts scattered across the camp ground (50 placements per
build), avoiding the FOB props and the door corridor. Scaled to ~0.5 m.

Sources:
- Quaternius foliage packs (CC0)
- ambientCG has cutout-grass billboards if you want to skip 3D

## Folder summary

```
public/models/
  hunters/      [Adventurer.glb, Animated Woman.glb, ...]   already populated
  tents/        [tent.glb plus all FOB kit props]           already populated
  houses/       [ashbury.glb, ravenhall.glb, default.glb]   needs per-contract
  vampires/     [nosferatu.glb, noble.glb, ...]             needs up to 10
  trees/        [oak.glb, pine.glb, ...]                    optional ambience
  streets/      [stone_path.glb, ...]                       optional approach
  grass/        [tuft_001.glb, ...]                         optional ground cover
```
