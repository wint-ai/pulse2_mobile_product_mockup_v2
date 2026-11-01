# Pulse 2 app icon

Source: Figma *Pulse 2.0 Shadcn*, file `YEmjkKS4xaA827Zm8w3oXx`, node
**`199761:86507`** ("Frame 2138883529", 69x69) — the node the owner's link
points at. Re-fetched live and rebuilt 2026-10-31; re-verified live again
2026-11-01 — unchanged, so the assets were left as built.

### Which node, and why this one

The owner's URL is
`figma.com/design/YEmjkKS4xaA827Zm8w3oXx/Pulse-2.0-Shadcn?node-id=199761-86507`.
That node contains **the wave only — there is no "wint" wordmark in it.** A
fresh `get_design_context` on 2026-10-31 (after the previous rebuild) returns
exactly the same two layers it did on 2026-10-29: the design did not change,
the earlier read was correct.

Checked a **third** time on 2026-11-01, prompted by an owner screenshot showing
a white "wint" wordmark on this frame. It is still not there. The live
`get_screenshot` came back **byte-identical (same MD5)** to the 2026-10-31 one,
and `get_metadata` confirms the frame's full child list:

```
<frame id="199761:86507" name="Frame 2138883529" width="69" height="69">
  <rounded-rectangle id="199761:86508" name="Screenshot 2026-08-19 at 23.50.31 1"
                     x="-57" y="-21" width="183" height="118" />
  <instance id="199761:86509" name="Tabler Icons / photo-sensor-3"
            x="9" y="9" width="51" height="51" hidden="true" />
</frame>
```

The second child is new information but changes nothing: it is a **hidden**
Tabler icon placeholder, it does not render, and it is not a wordmark. There is
still **no text layer and no vector layer** in this node.

Note also that the pale `#ddf1ff` ground is *not* what the node looks like —
the image fill covers the frame, so the node renders as a **saturated blue**
wave. A render that looks saturated blue is therefore not evidence that the
node changed.

A previous pass substituted the sibling node `199768:86534` ("Group 1"), which
*does* carry the wordmark, because the wordmark was assumed to be wanted. That
substitution was rejected. **This build takes `199761:86507` literally.** If the
wordmark is wanted, that is a request for a different node, and it should be
said so explicitly — do not composite one in.

| node | contents |
| --- | --- |
| `199761:86507` "Frame 2138883529" | wave only, **no wordmark** — *this is the source* |
| `199768:86534` "Group 1" | the same wave shifted down 24u, **plus the wordmark** |

### Composition (69x69 frame) — straight from the node

- ground `#ddf1ff`, corner radius `18` (26.1%), `overflow: clip`
- one child, `199761:86508` "Screenshot 2026-08-19 at 23.50.31 1": a 1596x1030
  **image fill**, box 183x118 at x=-57, y=-21 (i.e. horizontally centred,
  vertically centre +3.5), `object-fit: cover`, `mix-blend-mode: multiply`

The image box covers the whole frame, so `#ddf1ff` is only ever seen *through*
the multiply — it tints the pale top-left of the wave and nothing else. There
is no vector geometry and no text in this node.

Scale linearly to the target size: at size N, s = N/69.

### A note on colour

The assets are built from the node's own data: the `#ddf1ff` hex and the image
fill's stored pixels, multiplied in sRGB. Figma's **screenshot export of the
same node reads more saturated** (frame centre: export `25,129,255` vs node
data `57,127,247`) — green matches to within 1/255 and blue clips at 255, which
is the signature of a Display-P3 → sRGB conversion applied on export. The
shipped assets therefore match the file's data and the rest of the app's sRGB
palette, not Figma's P3 export. Baking the export's values instead is a
deliberate colour-management choice and would need the owner to ask for it.

### Files

- `pulse2-app-icon.svg` — master, square full-bleed.
- `pulse2-app-icon-rounded.svg` — pre-rounded (r = 18/69 = 26.1%), via a vector
  clip path so the corners stay crisp at any size.
- `../favicon.svg` — byte-copy of `pulse2-app-icon-rounded.svg`; referenced by
  `index.html` and `manifest.json`.
- `pulse2-app-icon-1024-square.png` — 1024x1024, no rounding, **RGB, no alpha**.
  iOS App Store / AppIcon source.
- `pulse2-app-icon-1024.png` — pre-rounded, RGBA, for web/docs/marketing.
- `pulse2-app-icon-512.png`, `pulse2-app-icon-192.png` — square, RGB, no alpha.
- `../apple-touch-icon.png` — 180x180, square, RGB, no alpha.

### "any" and "maskable" are now one asset again

The mark is full-bleed abstract art with no text and no element that has to
survive at a particular place. Every crop a platform can apply — the 80% safe
circle, a full-diameter circle, the squircle — leaves a correct-looking icon,
verified by rendering each crop. So the separate `-maskable` PNGs that the
previous (wordmark-bearing) build needed **no longer serve a purpose and have
been deleted**; `192` and `512` are declared `"any maskable"` in
`public/manifest.json`. `1024-square` stays `"any"` only, as the iOS source.

If the wordmark ever comes back into the icon, the split has to come back with
it: a wordmark 75% of the frame wide is clipped by the maskable safe circle.

### Small sizes

With the wordmark gone the mark is legible all the way down: at 32px and 16px
it reads as a blue rounded tile with a light-to-dark wave break. Nothing is lost
at favicon size, which was not true of the wordmark build.

### Regenerating

The wave is an image fill, so there is no vector for it: the SVGs embed a
composited 256px raster (ground + wave already multiplied) as a data URI,
upscaled by the renderer; the rounding is a vector clip path on top. ~35 KB.
The 1596x1030 source raster is downloaded from the node's asset URL (those URLs
expire after 7 days — re-fetch the node rather than reusing an old link).

`index.html` references `/favicon.svg`, `/apple-touch-icon.png` and
`/manifest.json` at absolute root paths. That is **correct** — Vite rewrites
them to the `base` prefix at build time, and `dist/index.html` ships
`/pulse2_mobile_product_mockup_v2/favicon.svg`. Do not "fix" them.
