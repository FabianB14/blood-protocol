# Textures

Drop CC0 PBR texture packs from <https://ambientcg.com> here.

## Folders

| Folder | Surface | Suggested search |
| --- | --- | --- |
| `wall/` | Wall panels | `plaster` or `painted plaster` |
| `floor/` | Main floor | `wood floor` or `wood planks` |
| `crypt/` | Crypt floor (the red glowing tile) | `marble` or `stone tile` |
| `ceiling/` | Ceiling (optional, can be skipped) | `concrete` or reuse wall |

## What to download

On each ambientCG asset page, grab the **1K-JPG** or **2K-JPG** ZIP and unzip
its contents directly into the folder. Do **not** rename the files — the
loader recognises files by suffix.

A complete folder looks like this:

```
public/textures/wall/
  Plaster003_2K_Color.jpg
  Plaster003_2K_NormalGL.jpg
  Plaster003_2K_Roughness.jpg
  Plaster003_2K_AmbientOcclusion.jpg     (optional)
```

## What the loader uses

For each folder it looks for, in order:

- `*_Color.jpg` or `*_Color.png` — required (the visible color)
- `*_NormalGL.jpg` — optional (fake surface bumps for the flashlight)
- `*_Roughness.jpg` — optional (controls shine)
- `*_AmbientOcclusion.jpg` — optional (corner shadowing)

If `_Color` is missing the loader falls back to the current flat colour for
that surface, so you can fill these folders one at a time.
