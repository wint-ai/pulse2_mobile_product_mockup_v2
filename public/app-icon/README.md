# Pulse 2 app icon

Source: Figma *Pulse 2.0 Shadcn*, node `199768:86534` ("Group 1", 69x69) — the
variant that carries the **"wint" wordmark over the wave**. Regenerated
2026-10-31.

### Which node, and why this one

There are two 69x69 marks side by side on that canvas:

| node | contents |
| --- | --- |
| `199761:86507` "Frame 2138883529" | wave only, **no wordmark** |
| `199768:86534` "Group 1" | the same wave, shifted down 24u, **plus the wordmark** |

The icon was built from `199761:86507` on 2026-10-29 and the owner then asked
why the wordmark was missing. `199761:86507` was re-read live on 2026-10-31 and
still has no wordmark — it is not that the design changed. The owner's
description ("the wint waves … with the blue wint") names `199768:86534`, so
that is now the source of truth. Note the wave is **not** in the same place in
the two nodes: `86507` puts the image box at y=-21, `86534` at y=3, i.e. the
wave drops 24u to make room for the wordmark. Compositing the wordmark onto the
old art would have been wrong.

### Composition (69x69 frame)

- ground `#ddf1ff`, corner radius `18` (26.1%)
- wave: a 1596x1030 **image fill** placed at x=-57, y=3, 183x118,
  `object-fit: cover`, `mix-blend-mode: multiply`, `isolation: isolate`
- wordmark: **vector**, at x=9, y=23, 52x29.25 (viewBox 51.8808x29.3038,
  `preserveAspectRatio="none"`). Letters `#0D2363`; the droplet over the "t" is
  white. This is *not* `public/wint-logo.svg`, which is a different colourway
  (`#20294C` letters, `#0B95F8` droplet) — take the icon's colours from the node.

Scale linearly to the target size. Rendering this recipe at 69px matches
Figma's own render of the node with a mean delta of **1.18/255**.

### Files

- `pulse2-app-icon.svg` — master, square full-bleed. Use this for everything.
- `pulse2-app-icon-1024-square.png` — 1024x1024, no rounding, opaque.
  **iOS App Store / AppIcon source.**
- `pulse2-app-icon-rounded.svg` / `pulse2-app-icon-1024.png` — pre-rounded
  (r = 18/69 = 26.1%) for web, docs, marketing.
- `pulse2-app-icon-512.png`, `pulse2-app-icon-192.png` — square, opaque;
  `purpose: "any"` in `public/manifest.json`.
- `pulse2-app-icon-512-maskable.png`, `pulse2-app-icon-192-maskable.png` —
  square, opaque; `purpose: "maskable"`. See below.
- `../apple-touch-icon.png` — 180x180, square, opaque; iOS "Add to Home Screen".
- `../favicon.svg` — byte-copy of `pulse2-app-icon-rounded.svg`; referenced by
  `index.html` and the manifest.

### "any" and "maskable" are now two different pictures — keep them that way

A `maskable` icon is cropped by the platform; the only area guaranteed to
survive is the centred circle of 80% diameter. The wordmark as designed spans
x 9→61 of 69, so its corners sit at radius 27.97u against the 27.6u allowed —
the ends of the "w" and the bar of the "t" get shaved. That is exactly why the
wordmark was dropped in the previous pass.

The fix is two assets, not one compromise:

- **`any`** (192/512/1024-square, apple-touch, favicon) — the full mark at the
  design's own geometry, wordmark 52u wide. Shown uncropped.
- **`maskable`** (192/512) — wave still full-bleed (it is abstract and survives
  any crop), wordmark scaled to **46.2u** and re-centred on the frame centre so
  its corner radius is 26.51u, inside the 27.6u safe circle with ~4% margin.
  Checked by rendering the circle and squircle crops at 192 and 512.

`1024-square` is **no longer** declared `any maskable`. It is the iOS source and
must stay un-padded; one asset cannot do both jobs now that there is text in the
mark.

### Small sizes

The wordmark holds up at 512, 192 and 180. At a 32px browser tab it reads as a
dark smudge rather than letters, and at 16px it is mud — unavoidable for a
four-letter wordmark 75% of the icon wide. `favicon.svg` carries the full mark
anyway, because the home-screen and manifest icons are what the owner is
looking at. If the tab favicon matters more, the alternative is a wave-only
`favicon-32.png` declared alongside it — that is a product call, not a
technical one.

### Regenerating

The wave is an image fill, so there is no vector for it and the SVGs embed a
composited raster (256px ground+wave, smooth-scaled) with the wordmark laid
over it as real paths. That keeps the wordmark crisp at any size while the
gradient costs ~32 KB.

`index.html` references `/favicon.svg`, `/apple-touch-icon.png` and
`/manifest.json` at absolute root paths. That is **correct** — Vite rewrites
them to the `base` prefix at build time, and `dist/index.html` ships
`/pulse2_mobile_product_mockup_v2/favicon.svg`. Do not "fix" them.
