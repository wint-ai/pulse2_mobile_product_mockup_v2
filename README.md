# Wint Pulse 2.0 — Mobile Mockup · v2 (UI exploration)

Working React + Vite mockup of the Wint Pulse 2.0 mobile app. A water-leak / system-monitoring app for facility managers, building managers, and tenants.

**This is the v2 UI exploration fork of [`pulse2_mobile_product_mockup`](https://github.com/wint-ai/pulse2_mobile_product_mockup).** Both repos are kept alive in parallel — the original repo continues to serve the current shipped mockup at its own URL, and this repo is where the new UI direction is prototyped without disturbing that demo.

All product requirements (PRDs), HTML design mockups, and design explorations still live in the private repo `wint-ai/pulse2_mobile_product_sandbox` (shared by both v1 and v2 forks).

## Live URLs

- **v2 mockup app (this repo):** https://wint-ai.github.io/pulse2_mobile_product_mockup_v2/
- **v2 push pusher:** https://wint-ai.github.io/pulse2_mobile_product_mockup_v2/push-panel
- **v1 mockup app (original, unchanged):** https://wint-ai.github.io/pulse2_mobile_product_mockup/

## Develop

```
npm install
npm run dev          # localhost:5173
npm test             # vitest run
```

## Deploy

```
npm run deploy       # builds + pushes dist/ to gh-pages branch
```

GitHub Pages serves the `gh-pages` branch automatically. Bundle lands at `https://wint-ai.github.io/pulse2_mobile_product_mockup_v2/` within ~1 minute.

## Source of truth

This is a working mockup for product review and demos — **not the production app**. Final visual design (theming, layout, polish) is the designer's call. The mockup encodes the binding product behavior described in the PRDs.

For PRDs, design history, and HTML mockup references, see the private repo `wint-ai/pulse2_mobile_product_sandbox`.

## Repo split

This repo was split out from `pulse2_mobile_product_sandbox` on 2026-06-12 to keep the deployable mockup public while keeping internal PRDs / design history private. Pre-split history is preserved on the sandbox repo at tag `pre-repo-split-2026-06-12`.
