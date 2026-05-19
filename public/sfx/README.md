# SFX (audio) assets

Drop short audio files here. Formats: `.ogg` (preferred for web), `.mp3`,
or `.wav`. Audio implementation isn't wired up yet — the volume sliders in
Settings persist their values but don't drive anything. Once you drop a few
files in I'll add an `AudioListener` + per-effect playback.

## Expected files (when audio is wired in)

### Action sounds (one-shot, fired per event)

- `scan.ogg`             — generic device scan
- `scan_success.ogg`     — evidence confirmed
- `scan_fail.ogg`        — wrong tool
- `ward_ignite.ogg`      — ward placed / burning
- `relic_pickup.ogg`     — gold tinkle / item up
- `banish_chant.ogg`     — chant on banishment attempt
- `banish_success.ogg`   — triumphant resolve
- `banish_fail.ogg`      — wrong species or unmet ritual
- `door_open.ogg`        — entering the house
- `flashlight_click.ogg` — toggle
- `footstep_wood.ogg`    — looping during walk
- `footstep_stone.ogg`   — looping during walk inside crypts
- `ping.ogg`             — team marker drop

### Vampire sounds (looped or one-shot)

- `vampire_distant.ogg`  — low presence drone
- `vampire_breathing.ogg` — close-proximity breath
- `vampire_hiss.ogg`     — short hiss / scare
- `vampire_lunge.ogg`    — caught
- `heartbeat.ogg`        — rises with fear meter

### Ambience (long-loop, ducked during action)

- `ambient_house.ogg`    — house interior
- `ambient_outside.ogg`  — staging area
- `ambient_storm.ogg`    — optional weather

### Music (optional)

- `music_menu.ogg`       — title screen
- `music_hunt.ogg`       — during hunt, dynamic intensity

## Sources

- **freesound.org** — CC-licensed library, huge collection. Filter by CC0
  or CC-BY.
- **OpenGameArt.org** — game-specific SFX packs
- **Zapsplat** — free with account
- **GameDev Market** / **itch.io** — sound packs (paid + free)

Format notes:
- Keep files short (<5s) for actions, looped files <30s with seamless loops.
- Mono audio is fine for positional 3D (and uses half the bandwidth);
  stereo for music / ambience.
- Compress to ~96-128 kbps OGG. Browsers cache, so don't overdo size.
