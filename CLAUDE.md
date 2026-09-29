# Pulse 2.0 Mockup — Project Notes for Claude

This file is read by any Claude Code session that opens this repo. **Read this first.**

---

## What this repo is

The deployable React + Vite mockup of the **Wint Pulse 2.0 mobile app** — a water-leak / system-monitoring app. **This repo is the mockup app only.** Everything else (PRDs, HTML design mockups, design explorations, history) lives in the **private** repo `wint-ai/pulse2_mobile_product_sandbox`.

This split exists for one reason: **the mockup needs to be public** (we share it with reviewers); **the PRDs / design history must stay private** (they contain internal product strategy + commercial context). GitHub Pages on a private repo can't gate visitors, so the public mockup gets its own public repo.

## Pair this repo with the sandbox

For anything substantive (PRDs, design rationale, decisions log, V11.0 notification spec, source of truth for behavior), open `wint-ai/pulse2_mobile_product_sandbox` alongside this repo. The product rules + conventions + open backlog + the "ASK before invent" rule are documented there.

Quick rule of thumb:
- **Touching JSX / React state / mock data** → this repo.
- **Touching PRDs, HTML mockups in `design-options/` or `docs/PRD/HTMLs/`** → sandbox repo.

## Deploy

```
npm run deploy       # = npm run build + npx gh-pages -d dist
```

Deployed at https://wint-ai.github.io/pulse2_mobile_product_mockup_v2/ — note the
`_v2`. This repo's remote is `pulse2_mobile_product_mockup_v2` and vite.config.js
sets `base: '/pulse2_mobile_product_mockup_v2/'`. The URL without the suffix is the
V1 repo and is a different, older site: polling it to confirm a deploy reports
failure forever while the real deploy has already succeeded. GH Pages usually serves the new build within ~1 minute. If you need to bust browser cache during a review, append `?v=N` to URLs.

The `postbuild` step writes `dist/404.html` (a copy of `index.html`) so deep links like `/push-panel`, `/control`, `/alert/...` resolve on GH Pages.

## Tests

```
npm test
```

345+ DOM tests covering Timeline, Home + drawer push behavior, WaterEventDetailsWidget, deep-link query params, AlertBanner per push, etc. Run before every deploy.

## Cross-references in source code

JSX files still reference PRD paths in comments (e.g. `// docs/PRD/04a-water-event-widget.md` or `// public/reviews/water-event-widget.html`). Those paths now live in the **sandbox** repo. Browse them on github.com (auth-gated) at `https://github.com/wint-ai/pulse2_mobile_product_sandbox/blob/main/docs/PRD/...` or clone the sandbox repo locally.

---

For the full project context (product rules, V11.0 notification spec, the "ASK before invent" rule, brand tokens, drawer behavior, etc.), read `wint-ai/pulse2_mobile_product_sandbox/CLAUDE.md`.
