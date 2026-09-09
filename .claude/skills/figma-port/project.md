# Appendix D — repo facts for `pulse2_mobile_product_mockup_v2`

Sibling of the user-level `figma-port` SKILL.md. Filled in per the skill's Section 0 "First run" step.

## 1. Figma files

| File | fileKey | What's in it |
|---|---|---|
| shadcncraft_Pro-3_4_0 | `YEmjkKS4xaA827Zm8w3oXx` | shadcn/ui-based design system + the Pulse 2 mobile screens (Account Overview, Location Overview, System page) that we're porting to code. Same file holds both the library and the composed screens. |

**Which file is current when two disagree:** the shadcncraft file is the ONLY current file. The mobile screens live on the mobile-screens page inside it (parent node `198104:13777`).

## 2. Stack + styling

- **Framework / build:** React 19 + JSX (no TypeScript) + Vite 8 + React Router v7 (`BrowserRouter`, no basename — client-side navigation only; direct URL entry falls through the wildcard route to `/`).
- **Styling system:** Tailwind CSS v4 (via `@tailwindcss/vite`) + a small set of shadcn/ui primitives at `src/components/ui/` (Card, Button, Badge, Tabs, Separator). Custom design tokens live as CSS custom properties in `src/index.css` under `:root { --primary, --severity-high, --severity-low, --danger, --success, ... }`, plus a `@theme inline` block that maps them to Tailwind color utilities.
- **Tailwind in use?** Yes, v4. Use utilities freely.
  - **Do NOT re-add a `* { padding: 0 }` reset** in `src/index.css` — Tailwind v4's preflight already resets margin/padding/border to 0, and a second wildcard reset cascades AFTER the utilities layer and silently nukes every `.p-*`, `.px-*`, `.py-*`, `.m-*` on every element. This bit us once already (see commit `2d789ac`).
  - Custom theme tokens (`bg-severity-high` etc.) do NOT reliably compile into Tailwind utilities in the current `@theme inline` setup. Prefer standard utilities (`bg-white`, `border-slate-200`, `rounded-2xl`) plus inline `style={{ background: '#DB4670' }}` for the Wint palette until the theme layer is properly debugged.
- **shadcn/ui primitives available at:** `src/components/ui/` — Card, Button, Badge, Tabs, Separator. Add more by writing them directly (no shadcn CLI in use because init would need the theme layer working). `cn()` util at `src/lib/utils.js`. Path alias `@/` → `src/` (configured in `vite.config.js`).
- **Icon library:** `lucide-react`. Import icons directly (`import { Menu, Waves, ... } from 'lucide-react'`). If a Figma layer has no matching lucide glyph, drop the exported SVG under `src/v2/icons/` and inline it (`currentColor` for fill, no baked backgrounds).
- **Design tokens:** CSS custom properties in `src/index.css` (`--primary #0B95F8`, `--severity-high #DB4670`, `--severity-low #F05C25`, `--danger #A5455E`, `--success #5C9E1A`). Not yet reliably surfaced as Tailwind utilities — inline via `style` for now.
- **Font stack:** `Inter` (self-hosted via Google Fonts). Wint brand. Do NOT introduce Geist even though the shadcn kit uses it — keep the project's Inter.

## 3. Running + verifying

- **Dev server:** `npm run dev` on `http://localhost:5173/pulse2_mobile_product_mockup_v2/` (note the base path — Vite strips it from asset requests but the app URL is served at that path).
- **Deployed:** `https://wint-ai.github.io/pulse2_mobile_product_mockup_v2/` — `npm run deploy` builds + pushes to gh-pages branch, ~1 min propagation. Verify with `curl -s <url> | grep -oE 'index-[^\.]+\.(js|css)'` before claiming a bundle went live.
- **Password gate:** the deployed app requires `WINT2026` before any UI is reachable. For automated browser testing, set `sessionStorage['pulse2-demo-pw-ok'] = '1'` + `sessionStorage['pulse2-auth'] = 'true'` + `localStorage['pulse2-persona-id'] = JSON.stringify('wint-admin')` and skip the gate.
- **Typecheck:** none (no TypeScript). Rely on Vite build (`npm run build`) — it fails loudly on real JS errors. ESLint runs via `npm run lint` but has a lot of pre-existing v1 noise; filter to `src/v2/**` when checking.
- **Pre-existing noise to ignore when grepping build/lint output:** anything in `src/screens/**`, `src/components/*.jsx` (v1 components), and `src/data/**` — v1 legacy that we're not touching.
- **Assets from Figma get committed to:** `src/v2/icons/*.svg` (per component/screen where possible). Vet every SVG per the skill's §2.5 (drop baked `<rect>` backgrounds, rewrite `fill="var(--fill-0,#0B95F8)"` to `currentColor`).

## 4. Node map (append as we port)

| Surface | Node | Notes |
|---|---|---|
| System page (mobile) | `198213:73589` | first port, `src/v2/pages/SystemPage.jsx`. Water Event card + Open Loop + 5 Sensors + Water consumption + Insights + Events Timeline + Action Policy. Data hardcoded to match the Figma frame (Floor 26, 13,564 L/H). |
| Home — Account Overview (alerts) | `198235:82043` | `src/v2/pages/HomeAccountOverview.jsx` (default state — 25 water events, 8/3431 attention, red counters). |
| Home — Account Overview (healthy) | `198235:81421` | Same component, `healthy` state toggle — "Everything looks good!" illustration, 96%, all zeros, "Show past alerts" link. |
| Home — Account Overview (expanded water events) | `198229:74815` | Same component, `expanded` state toggle — 5-row events list under the Water Events card + "Show all". Tap any row → address expands inline. |
| Home — Location Overview | ? | not yet — need URL. |
| Home — Location expanded system address | `198266:338115` | not yet ported. |
| Consumption widget spec | `198246:83764` | reference only — used to derive Y/M/D/H bar chart behavior. Full sheet had `get_design_context` blow the SSE channel; sub-nodes needed for real port. |
| Mobile-screens page (parent) | `198104:13777` | the canvas containing all mobile-screen clusters — use `get_metadata` on this if you need to find a sibling frame. |

## 5. Known-good workflow patterns for THIS repo

- **Route the v2 screens at their primary paths** (`/`, `/system/:systemId`, etc.); keep v1 alive at `/v1/` and `/v1/system/:systemId` for A/B reference.
- **State toggles for demo variants** — put a tiny `Demo state` pill row at the top of the body so we can flip between alerts / healthy / expanded without wiring different data sources. See `HomeAccountOverview.jsx` for the pattern.
- **Deploy verification loop:** `npm run build` → `git add + commit + push` → `npm run deploy` → `until curl … | grep -q "<new-bundle>"; do sleep 15; done`. Never trust "Published"; always confirm the bundle propagated.
- **Browser-testing the deployed app:** set the sessionStorage auth flags via JS + `window.history.pushState('', '', '/system/ct1')` + `dispatchEvent(new PopStateEvent('popstate'))` to trigger React Router. `window.location.href = '/pulse2_mobile_product_mockup_v2/system/ct1'` hits the gh-pages 404 → 404.html trick and re-renders.
