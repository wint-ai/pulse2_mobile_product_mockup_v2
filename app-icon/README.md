# Pulse 2 app icon

Vector rebuild of the Pulse 2 mark (the supplied PNG was only 138px, too small to ship).

- `pulse2-app-icon.svg` — master, square full-bleed. Use this for everything.
- `pulse2-app-icon-1024-square.png` — 1024x1024, no rounding, no alpha needed. **iOS App Store / AppIcon source.**
- `pulse2-app-icon-rounded.svg` / `pulse2-app-icon-1024.png` — pre-rounded (r = 232/1024 = 22.7%) for web, docs, marketing only.

Notes for the developer
- iOS: supply the SQUARE asset; the system applies the mask. Do not ship a pre-rounded icon.
- Android adaptive: use the square art as the background layer (108dp), art is full-bleed and safe under the 66dp mask.
- Colors: base #66B5F9 -> #3E95F6, mid wave #1B79F8 -> #0C5CF3, deep wave #0F5FF5 -> #0745EE, highlight #A9DCFD.
