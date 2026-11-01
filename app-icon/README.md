# Pulse 2 app icon

Source: Figma *Pulse 2.0 Shadcn*, file `YEmjkKS4xaA827Zm8w3oXx`, page **Brand**
(`197380:5986`). The icon is **two nodes**, not one:

| node | what it is |
| --- | --- |
| **`199761:86507`** "Frame 2138883529", 69x69 at canvas (-1975, 21857) | the rounded tile + wave |
| **`199761:86494`** "Logo", 52 x 29.25 at canvas (-1966, 21881) | the **white** "wint" wordmark + droplet |

Rebuilt 2026-11-01 from both.

### Why three earlier passes reported "there is no wordmark"

`199761:86494` is **not a child of the frame**. It is a free-floating sibling on
the Brand page that happens to sit exactly on top of the frame, at frame-local
`(9, 24)`. On the owner's canvas it looks like one icon. Fetched through the
MCP, `get_design_context`/`get_metadata`/`get_screenshot` on `199761:86507`
return only the frame's own two children — the image fill and a hidden Tabler
placeholder — so three separate passes correctly reported "wave only, no text
layer, no vector layer" and were all looking at an incomplete picture.

`get_metadata` on the **parent page** `197380:5986` is what shows it. The page
holds exactly three top-level items:

```
<canvas id="197380:5986" name="Brand">
  <frame    id="199761:86507" name="Frame 2138883529" x="-1975" y="21857" 69x69>   <- wave tile
  <instance id="199761:86494" name="Logo"             x="-1966" y="21881" 52x29.25> <- WHITE wordmark
  <frame    id="199768:86534" name="Group 1"          x="-2099" y="21857" 69x69>   <- navy variant
```

`199768:86534` "Group 1" is a **different** composition: the same wave pushed
down 24u with a **navy (`#0D2363`) wordmark** on the pale part. It is not what
the owner's canvas shows and is not what ships.

### Composition (69x69 frame)

- ground `#ddf1ff`, corner radius `18` (26.1%), `overflow: clip`
- wave `199761:86508` "Screenshot 2026-08-19 at 23.50.31 1": a 1596x1030 image
  fill, box 183x118 at `x=-57, y=-21`, `object-fit: cover`,
  `mix-blend-mode: multiply`. The box covers the whole frame, so `#ddf1ff` is
  only ever seen *through* the multiply.
- wordmark `199761:86494`: vector, viewBox `0 0 51.8808 29.3038`,
  `preserveAspectRatio="none"`, **every path `#ffffff`** (letters *and*
  droplet), drawn into a 52 x 29.25 box at frame-local `(9, 24)`.

Scale linearly to the target size: at size N, s = N/69.

The wave is **not** shifted down here — the wordmark is white and sits directly
on the saturated blue. (The 24u shift belongs to the navy `Group 1` variant,
which needs the pale ground for contrast.)

### A note on colour

Built from the node's own data: the `#ddf1ff` hex and the image fill's stored
pixels, multiplied in sRGB. Figma's screenshot export of the same node reads
more saturated (frame centre: export `25,129,255` vs node data `57,127,247`) —
the signature of a Display-P3 -> sRGB conversion applied on export. The shipped
assets match the file's data and the rest of the app's sRGB palette. Changing
that is a deliberate colour-management decision and needs the owner to ask.

### Files

- `pulse2-app-icon.svg` — master, square full-bleed.
- `pulse2-app-icon-rounded.svg` — pre-rounded (r = 18/69 = 26.1%) via a vector
  clip path, so the corners stay crisp at any size.
- `../favicon.svg` — byte-copy of `pulse2-app-icon-rounded.svg`; referenced by
  `index.html` and `manifest.json`.
- `pulse2-app-icon-1024-square.png` — 1024x1024, no rounding, **RGB, no alpha**.
  iOS App Store / AppIcon source, `"any"` only, never padded.
- `pulse2-app-icon-1024.png` — pre-rounded, RGBA, for web/docs/marketing.
- `pulse2-app-icon-512.png`, `pulse2-app-icon-192.png` — square, RGB, no alpha.
- `pulse2-app-icon-maskable-512.png`, `pulse2-app-icon-maskable-192.png` —
  square, RGB, no alpha, wordmark shrunk and recentred (see below).
- `../apple-touch-icon.png` — 180x180, square, RGB, no alpha.

In the SVGs the wave is an embedded 256px composited raster (ground + wave
already multiplied) and the **wordmark is real vector paths** on top, so the
type stays crisp at every size. ~22 KB — smaller than the wave-only build was.

### "any" and "maskable" are two different assets

The wordmark is 52 of 69 units wide (75%). Android's maskable safe zone is the
circle of diameter 80% of the icon — radius **27.60u** about the centre. The
wordmark at its design geometry has a corner radius of **32.46u**, so a
maskable crop shaves the ends off the type. The split is therefore mandatory
whenever the wordmark is in the icon:

- **`any`** — 192, 512, 1024-square, apple-touch, favicon: the full mark at the
  design's own geometry, wordmark 52 x 29.25 at (9, 24).
- **`maskable`** — 192 and 512 only: the wordmark scaled to **46.2u** wide
  (25.99u tall) and recentred on the frame centre, giving a corner radius of
  **26.50u** — inside the 27.60u safe circle with ~1.1u of margin. The wave
  stays full-bleed, so every crop still fills the tile.
- `1024-square` stays `"any"` only: it is the iOS App Store source and must
  stay unpadded.

If the icon ever goes back to wave-only art, the split can be collapsed again
(abstract full-bleed art survives any crop) — but not while the wordmark is in
it.

### Small sizes

At 512 and 192 the wordmark is clean and fully legible. At 180 (apple-touch) it
is still clearly "wint". At 32px the word is readable but tight — the letter
counters are 1-2px and the droplet is a 2px blob. At **16px the wordmark is not
legible**; it reads as a light smear across the lower half of a blue tile.

That is the known cost of a wordmarked favicon and it was accepted deliberately
so the home-screen icon carries the brand. If the 16px favicon ever matters
more than consistency, the standard remedy is to declare a separate wave-only
`favicon-32.png` / `favicon-16.png` in `index.html` alongside the wordmarked
`manifest.json` icons — that is an owner decision, not a build detail, and is
**not** shipped today.

### Regenerating

The wave is an image fill, so there is no vector for it: download the 1596x1030
source raster from the node's asset URL (those URLs expire after 7 days —
re-fetch the node rather than reusing an old link), composite ground + wave with
a multiply blend, then lay the white wordmark paths on top. The wordmark vector
is identical in shape to `public/wint-logo-white.svg` (same artwork, all-white
fills).

`index.html` references `/favicon.svg`, `/apple-touch-icon.png` and
`/manifest.json` at absolute root paths. That is **correct** — Vite rewrites
them to the `base` prefix at build time, and `dist/index.html` ships
`/pulse2_mobile_product_mockup_v2/favicon.svg`. Do not "fix" them.
