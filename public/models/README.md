# Models

Drop rigged character `.glb` files in `hunters/` to replace the placeholder
capsule meshes that other players currently see.

## hunters/

The first `.glb` in this folder is used for every remote hunter (clones share
the GLB's skeleton via `SkeletonUtils.clone`). If multiple files are present,
the file named `default.glb` wins, else the alphabetically-first one.

### What a "good" hunter model looks like

- Single rigged humanoid, roughly 1.7-1.8 m tall, feet at y = 0
- Forward-facing along **-Z** (Three.js's default forward direction)
- Animations baked into the GLB. The loader looks for clip names containing:
  - `idle` (any case)
  - `walk` (or `walking`)
  - `run` (or `running`)
- Any other clips are ignored

### Where to get one

**KayKit Adventurers** (poly.pizza/u/KayKit) — CC0, ready-to-go GLB with all
three animations baked in. Stylized.

**Mixamo** (mixamo.com — free with an Adobe account) — pick a humanoid like
"Y Bot" or "Vanguard", download Idle / Walking / Running as separate FBX
files, then merge them into one GLB in Blender (drag the Y Bot in, drag each
animation in with "Append" → Action, save as `.glb`). Realistic.

**Quaternius "Ultimate Animated Character Pack"** on poly.pizza — CC0, GLB
with bundled animations.

### What happens if the folder is empty

The game falls back to the colored capsule + sphere head meshes so multiplayer
keeps working. No errors.

## Naming

The loader does **not** read filenames for any other meaning. You can have any
name. If you want a deterministic default when multiple models are present,
name one of them `default.glb`.
