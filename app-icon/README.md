# Pulse 2 app icon

Source: Figma *Pulse 2.0 Shadcn*, node `199761:86507` ("Frame 2138883529", 69x69).
Regenerated 2026-10-29, replacing the September vector rebuild.

The artwork is an **image fill**, not vector: a #ddf1ff frame with a 1596x1030
raster multiplied over it. The SVGs therefore embed a composited raster (256px,
smooth-scaled) rather than paths. There is no wordmark in this mark.

- `pulse2-app-icon.svg` — master, square full-bleed. Use this for everything.
- `pulse2-app-icon-1024-square.png` — 1024x1024, no rounding, opaque. **iOS App Store / AppIcon source.**
- `pulse2-app-icon-rounded.svg` / `pulse2-app-icon-1024.png` — pre-rounded (r = 18/69 = 26.1%) for web, docs, marketing only.
- `pulse2-app-icon-512.png`, `pulse2-app-icon-192.png` — square, opaque; wired in `public/manifest.json`.
- `../apple-touch-icon.png` — 180x180, square, opaque; iOS "Add to Home Screen".
- `../favicon.svg` — byte-copy of `pulse2-app-icon-rounded.svg`; referenced by `index.html` and the manifest.

Notes for the developer
- iOS: supply the SQUARE asset; the system applies the mask. Do not ship a pre-rounded icon.
- Android adaptive / maskable: `-1024-square` is declared `any maskable`. The art is
  abstract and full-bleed with no text, so it survives the 80% safe-zone circle crop
  with no padding added — checked by rendering the circle crop at 192.
- Rounding changed from r = 232/1024 (22.7%, the old rebuild) to the Figma radius
  18/69 = 26.1%.
- To regenerate: frame background #ddf1ff; place the source raster at x=-57, y=-21,
  183x118 within the 69x69 frame, `object-fit: cover`, `mix-blend-mode: multiply`,
  `isolation: isolate`; scale linearly to the target size.
- Rendered corner colors: TL #D7F1FF, TR #81D1FD, BL #0752FE, BR #4EA1FF.
