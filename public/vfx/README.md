# VFX assets

Drop visual-effect assets here. The current placeholder VFX system in
`public/index.html` uses primitive Three.js geometries (rings, beams, glows)
for each effect kind. When you want to replace any of them with a real asset:

## Per-effect-kind sprite textures

Drop a `.png` (transparent background) named after the effect kind:

- `evidence_logged.png`   — green confirmation sweep
- `ward_ignite.png`        — amber/orange burst
- `relic_pickup.png`       — gold sparkle
- `banish_success.png`     — vertical light pillar / radiant burst
- `banish_fail.png`        — red flash
- `ritual_fizzle.png`      — dark red ripple
- `hunter_caught.png`      — red screen flash
- `vampire_appear.png`     — red expanding ring
- `door_portal.png`        — animated frame (looping sprite)

The client will animate these as alpha-blended billboards. Sprite size
suggested: 256×256 or 512×512 PNG.

## Particle textures (optional)

For particle effects (smoke, embers, mist, blood splatter), drop:

- `smoke.png`
- `ember.png`
- `mist.png`
- `blood.png`
- `dust.png`

The client will spawn small numbers of these as additive sprites for
ambient atmosphere.

## GLB-based VFX (optional)

If you have an animated VFX as a GLB (e.g. a particle system baked from
Blender, or an effect from Unity-converted asset), drop it here with a
descriptive name. The client doesn't auto-load these yet — tell me when
you have one and I'll wire it up.

## Sources

- **Kenney.nl** particle packs (CC0)
- **OpenGameArt** spell / fire / smoke sprites
- **Quaternius** stylized FX pack on poly.pizza
- Pixilart / Aseprite for custom sprite atlases
