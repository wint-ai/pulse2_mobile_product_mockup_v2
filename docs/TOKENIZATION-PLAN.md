# Tokenization plan — paying down the token debt

**Status:** proposal, not started. **Measured at:** commit `f65e6fe` on `dev`, 2026-10-21.
**Scope of every count below:** `src/v2/` + `src/components/ui/`, comments stripped before matching, unless the line says otherwise.

---

## Why this, why now

The goal is **a properly tokenized codebase**. It is not a theme switcher.

That distinction was tested directly: v2 already had a 7-theme switcher and deliberately dropped it, so "add theming" is a request to re-add something this repo chose to remove. The ruling was explicit —

> Pay down the token debt — the real goal is a properly tokenized codebase; the picker is just how you'd prove it works. The hardcoded colours are the deliverable.

So the switch in Phase 2 is, first and foremost, **an instrument**. Its job is to make un-tokenized surfaces visible: if you flip the theme and a card does not move, that card is debt. Without it, "is this tokenized?" is answered by reading 27 files; with it, the answer is on screen in one click.

The owner has since ruled that the control also **ships** — a visible row in Account → Personal settings with three options, Light first. That does not change the goal, but it does split the theme set: **`light` / `dark` / `sand` are the product**, and a deliberately garish `contrast` theme stays out of the UI and does the measuring. Because all three shipped themes are *designed*, none of them is a reliable instrument — a missed surface reads as a design choice in any of them. `contrast` is the only one that cannot be mistaken for intent, which is why it survives every ruling. Phase 2 sets this out.

Two further rulings shape the work rather than the goal: **the non-default palettes are sourced from shadcn rather than hand-authored** (which pulls OKLCH forward into Phase 1), and **the Wint gradients survive on every theme with computed `color-mix()` stops** (Figma's geometry, shadcn's colour). The hardcoded colours are still the deliverable.

Everything in this plan is sequenced around that one idea: **build the measuring device early, then use it.**

---

## The finding that reframes the problem

The variable layer in `src/v2/` is **decorative**. It looks like a token system and behaves like none.

| | count |
|---|---|
| `var()` uses | **1,599** |
| distinct variable names referenced | **183** |
| of those, actually **defined** | **18** |
| **undefined** | **165** |
| uses that resolve to nothing | **1,515** |
| of those, carrying an inline literal fallback that therefore always wins | **1,504** |
| uses that actually resolve | **84** |

147 of the 165 undefined names use the Figma escaped-slash spelling — `--colors\/slate\/500`, `--font\/family\/sans`, `--text\/sm\/size`, `--component\/badge\/px` — and account for **1,333 uses across 27 files**.

The canonical specimen, `src/v2/components/AlertCard.jsx:161`:

```jsx
const META_LABEL = String.raw`… text-[color:var(--colors\/slate\/500,#62748e)] …`
```

`--colors/slate/500` is defined in **zero** files. The element is painted `#62748e`, always, by the fallback.

**State it plainly:** `src/index.css` could be rewritten from scratch today and roughly **94% of v2's colour, type and spacing would not move**. This is not "theming is broken." It is "the token layer does not exist yet." Everything that looks like a token is a comment with a hex next to it.

`--wint-blue-accent` makes the point on its own: used **44 times across 16 files**, documented at `src/index.css:27` as the source of `--primary` / `--ring` / `--accent-foreground` — and **defined nowhere**.

Top undefined names by use count:

| name | uses | | name | uses |
|---|---|---|---|---|
| `--p-0` | 79 | | `--colors/slate/100` | 45 |
| `--font/family/sans` | 57 | | `--colors/slate/500` | 45 |
| `--font/weight/font-medium` | 57 | | `--wint-blue-accent` | 44 |
| `--text/sm/lh` | 54 | | `--colors/slate/900` | 43 |
| `--text/sm/size` | 53 | | | |

### Why a `var()` fallback is not a safety net

Per MDN, the fallback fires when the property "hasn't been declared on a rule that applies to the element, and it isn't registered (with `@property`) with an `initial-value`" — <https://developer.mozilla.org/en-US/docs/Web/CSS/var>. There is **no warning, no console message, and no visual tell**. A hardcoded fallback is a second, invisible source of truth that wins silently whenever the token is missing. That is exactly how 1,504 call sites ended up looking tokenized while being hardcoded.

---

## The second finding: the semantic layer is a copy, not an alias

`src/index.css:62` is:

```css
--foreground: #0f172b;
```

not `var(--slate-900)`. Same for `--muted` (`src/index.css:67`), `--border`, `--input`, `--muted-foreground`, `--card`, `--popover`. Changing the neutral ramp moves **nothing** downstream — the ramp and the semantic layer are two independent hardcodings of the same numbers.

And v2 barely uses the semantic utilities anyway. Across all of `src/v2/`:

| utility | uses |
|---|---|
| `text-foreground` | **0** |
| `text-muted-foreground` | **0** |
| `border-border` | **0** |
| `bg-background` | 1 |
| `bg-muted` | 1 |
| raw `*-slate-NNN` utilities | **240** |
| bare hex literals | **469** |

The reason is recorded in git. `src/components/ui/card.jsx` was deliberately **de-tokenized** by commit `469314f`, titled:

> **v2/system-page: swap broken theme tokens for standard tailwind**

`src/components/ui/card.jsx:17` is now `bg-white text-slate-900 … border-slate-200/70`; `src/components/ui/card.jsx:52` is `text-slate-500`. Someone hit the broken token layer and routed around it, correctly, under delivery pressure. That commit title is the single best piece of evidence for why the semantic layer sits unoccupied — the layer was not ignored out of carelessness, it was abandoned because it did not work.

**This is the load-bearing reason Phase 1 comes first.** Until the token layer actually paints, every future author will make the same call `469314f` made, and will be right to.

---

## The rest of the debt, measured

### Raw literals

`src/v2/` + `src/components/ui/`: **469 bare hex** + **423 hex-as-`var()`-fallback** + **139 `rgb()`/`rgba()`**. Roughly **97 distinct bare hex values** for a nominally 9-colour system.

**Brand blue has at least five spellings:**

| hex | uses | note |
|---|---|---|
| `#0b81f8` | 7 | canonical — equals `--primary` (`src/index.css:76`) |
| `#0b95f8` | 8 | |
| `#0b82f8` | 6 | |
| `#2b7fff` | 10 | |
| `#1c85fe` | 1 | |

plus `#155dfc`, `#1a6fe0`, and `#6bb2fa` / `#6bb1fa` — two spellings of one near-identical colour. **Owner ruling needed** before Phase 3 (see Open questions).

**Slate re-spelled as hex instead of the token:**

`#62748e` ×46 · `#90a1b9` ×29 · `#45556c` ×18 · `#e2e8f0` ×13 · `#1d293d` ×9 · `#f1f5f9` ×6 · `#314158` ×5. Plus **`#cad5e2` ×12 — slate-300, which has no token at all.**

**Severity tokens exist and are ignored.** `src/index.css:91-94` declares `--severity-high: #DB4670`, `--severity-low: #F05C25`, `--danger: #A5455E`, `--success: #5C9E1A`. Call sites use the hexes instead: `#DB4670` ×10 across 6 files, `#5C9E1A` ×10 across 5, `#F05C25` ×3, `#A5455E` ×2 — while `bg-severity-high` / `text-severity-high` have **0 uses**.

**`#fafbfc` appears 66 times in 27 files** (41 of them as `bg-[#fafbfc]`). This is the house card surface, intentional and consistent — and it has **no token**. Confirmed: `fafbfc` does not appear in `src/index.css` at all.

**Worst files by bare hex count:** `EventOverlay.jsx` 32 · `TopologyCard.jsx` 31 · `EventOverlayV2.jsx` 31 · `AlertCard.jsx` 30 · `ValveStatus.jsx` 26 · `PipeTopology.jsx` 25 · `WintSidebarV2.jsx` 25.

**Inline `style={{}}`:** 2,001 repo-wide across 81 files; **161 in `src/v2/`**, of which **86 in 14 files are reachable from the three live routes** (`/`, `/system/:id`, `/account`). `src/v2/pages/AccountScreenV2.jsx` has **0** — it is the one fully-migrated v2 page and is the reference for what "done" looks like.

### SVG paint

**152 hardcoded `fill="#…"` / `stroke="#…"` attributes across 21 production files.**

- **91 of 152 are exactly equal to an existing token value** (`#62748e` ×30, `#90a1b9` ×15, `#45556c` ×14, `#314158` ×3, `#fb2c36` ×3, …). Mechanical.
- **~45 are generic UI glyphs** — chevrons, bells, funnels — that merely have a slate hex baked in. `ChevronDown12` in `src/v2/components/EventsTimelineCard.jsx:172-176` (`stroke="#62748E"` at `:175`), `Bell` in `src/v2/pages/SystemPageV2Screen.jsx:398-402` (`stroke="#90A1B9"` at `:401`), `FunnelSimple` in `src/v2/components/WintSidebarV2.jsx:166-170` (`stroke="#90A1B9"` at `:170`). These should become `currentColor`.
- **~40 are multi-colour domain glyphs** that cannot be expressed in `currentColor` and must be **declared non-themeable in writing** (Phase 5).

By contrast `src/v2/icons/` is healthy: **all 22 hand-authored components are pure `currentColor`** — the only hex anywhere in that directory is inside a comment. See *Corrections* at the end: the brief for this document listed `src/v2/icons/PhotoSensor3.jsx` as an exception; it is not.

**Worst files by SVG paint:** `ValveStatus.jsx` 26 · `TopologyCard.jsx` 19 · `WintSidebarV2.jsx` 15 · `SystemPageV2Screen.jsx` 15 · `PipeTopology.jsx` 14.

### Fonts — this one contains a live bug

`--font/family/sans` and `--font/family/heading` are referenced by **67 `font-[family-name:…]` utilities across 20 files** and are **defined nowhere**. The fallback that therefore wins is a string like `'Figtree:Medium'` or `'Geist:Regular'` — **which is not a real CSS family name**. The browser cannot match it, skips it, and lands on the hardcoded `'Figtree'` further down each stack.

> **Consequence: the 17 + 7 classes that say Geist render in Figtree.** The intent recorded at `src/index.css:2` — "Geist is used for the topology and chart axis labels" — is not happening. Geist reaches the screen only via `src/v2/components/PipeTopology.jsx:68` (an inline `fontFamily`) and the 5 `font-mono-label` uses.

**This is a standalone design-fidelity bug.** It is true whether or not any of this plan ships, and it should be reported as its own line item. Phase 1 fixes it as a side effect.

Two further font facts that constrain the design:

- `--font-sans` is declared **inside `@theme inline`** at `src/index.css:179` (the `@theme inline` block opens at `src/index.css:153` and is the only `@theme` block in the file). Tailwind therefore compiles `font-sans` to a literal — `.font-sans{font-family:Figtree,Inter,…}`, verified in the built CSS. **Overriding `--font-sans` at runtime would do nothing** to its 34–37 usages. The fix is to move that one declaration out of `@theme inline` into a plain `@theme`.
- The family stack is hardcoded a **third** time at `src/index.css:227` (`html, body, #root`).

### Dark mode / runtime switching, as it stands

`src/index.css:16` declares:

```css
@custom-variant dark (&:is(.dark *));
```

with a deliberate decision documented at `src/index.css:11-15`: bind `dark:` to an explicit `.dark` class rather than `prefers-color-scheme`, so the stock shadcn `dark:` utilities inside `button` / `sidebar` / `sheet` do not fire on a device that merely prefers dark.

> **That decision is correct and this plan preserves it.** Do not let anyone "fix" it into `@media (prefers-color-scheme: dark)`. The comment at `:11-15` says why; keep the comment.

The *implementation* has two defects:

1. **`&:is(.dark *)` is descendant-only.** `dark:` utilities on the `.dark` element itself never fire. Tailwind's documented form is `&:where(.dark, .dark *)`.
2. **`:is()` takes the specificity of its argument; `:where()` is always zero.** So today every `dark:` utility silently outranks its un-prefixed counterpart.

`.dark` at `src/index.css:243-252` redefines **only the 8 `sidebar-*` tokens**. `--background`, `--foreground`, `--primary`, `--border`, `--muted-foreground` are all absent. **It is not a disabled theme, it is a half-written one** that would render a broken screen if applied. The 11 `dark:` utilities that would fire are all stock shadcn (`button.jsx` ×7, `input.jsx` ×2, `toggle.jsx` ×1, `chart.jsx` ×1) — **0 in `src/v2/`**.

Nothing in the repo ever sets the class. Grepping `classList` / `documentElement` / `setProperty` across `src/` confirms it: the only `setProperty` calls are confetti geometry at `src/components/TagCelebration.jsx:59-61`.

`src/context/ThemeContext.jsx` (449 lines) holds the v1 7-theme engine (`dark, light, wint, gradient, ocean, midnight, portal`), persists `localStorage['pulse2-theme']`, and still wraps the tree (`ThemeProvider` imported at `src/App.jsx:7`, mounted at `src/App.jsx:570-583`). **41 non-test v1 files call `useTheme`; zero are reachable from v2.** `setTheme(` / `toggleTheme(` have **0 call sites** outside the context file. The one v1 module v2 mounts, `src/components/TabBar.jsx`, was fully migrated off it in `acf15a0`.

Zero OKLCH anywhere: `grep -c oklch src/` = 0. All tokens are hex/rgba; the only 8 `hsl()` calls are inside the dead `.dark` block.

### No preferences infrastructure exists

`src/context/` holds only `ThemeContext.jsx` (unused by v2) and `UserContext.jsx` (domain state).

In `src/v2/pages/AccountScreenV2.jsx`, `unitsKey` (`:317`), `pushOn` (`:309`) and `smsOn` (`:310`) are bare `useState` with no persistence and no readers. `axisUnitLabel(unitsKey)` at `src/v2/components/chartAxis.js:72` is called **with no argument** at `src/v2/components/WaterConsumptionCardV2.jsx:1025` — so it always returns `'liters'`. The Measurement Units picker is a visual stub.

**The one working precedent is i18n.** `src/i18n/index.js` has everything a preference needs and nothing it doesn't:

- `LANGUAGE_STORAGE_KEY = 'pulse2-language'` (`:7`)
- a `SUPPORTED_LANGUAGES` registry with `dir` metadata (`:10`)
- `detectInitialLanguage()` boot read (`:15`)
- `applyDirection(lng)` applied at boot (`:48`) and on change (`:51`)
- one call site: `src/v2/pages/AccountScreenV2.jsx:594` → `i18n.changeLanguage(code)`

**Copy that shape. Do not copy `ThemeContext`'s.**

---

## Mechanics this design is built on

These are load-bearing. Each constrains a decision below.

1. **`@theme` declarations must be top-level.** Tailwind: "required to be defined top-level and not nested under other selectors or media queries" — <https://tailwindcss.com/docs/theme>. You **cannot** write `@theme` inside `[data-theme="x"]`. Therefore: semantic tokens live as plain custom properties in `:root`, `@theme inline` only *maps* them, and a theme redefines the plain properties under an attribute selector.

2. **`@theme inline` is the hinge.** With `inline`, Tailwind writes the *referenced* value into the utility, so `.bg-primary` resolves `var(--primary)` against the element it is applied to, not against `:root`. That is what makes "redefine on an ancestor, everything beneath it changes" work with **zero per-component effort**. Without `inline`, the utility references the theme variable itself and resolution becomes surprising. Same source.

3. **The corollary is already visible in this repo.** `--font-sans` *is* inside `@theme inline` (`src/index.css:179`), which is exactly why `font-sans` compiled to a literal and is not overridable. The colour tokens are mapped correctly; the font token is the one mapped wrong. This is not theory — it is a worked example sitting in the file.

4. **Tailwind only emits theme variables it sees used.** `@theme static { … }` forces all of them out. Relevant if a theme introduces a token that no build-time class referenced. **Treat this as a thing to verify against the built CSS, not as a certainty.** Same source.

5. **tailwind-merge does not resolve arbitrary properties against their matching utilities** — explicitly, for bundle-size reasons. `[padding:1rem] p-8` keeps both. **Practical rule for this codebase: never express a themeable value as an arbitrary property; always go token → utility.**

6. **GitHub Pages is an advantage here, not a constraint.** `index.html` is a static file this repo controls, and `postbuild` already copies it to `404.html` (`package.json:9`). A **blocking inline `<script>` in `<head>`** that sets the theme attribute runs before the module bundle is even requested — zero flash, and strictly better than shadcn's own Vite recipe, which applies the class in a `useEffect` after mount. Note that `<meta name="theme-color">` at `index.html:9` is a hardcoded `#0B95F8` and would be wrong under any other palette.

7. **Radix portals render outside the app root.** shadcn's own docs site scopes its font themes to `.theme-x .theme-container, .theme-x [data-radix-popper-content-wrapper]` for precisely this reason. This repo uses `@radix-ui/react-dialog` plus shadcn `dialog` / `sheet` / `tooltip` / `sidebar`. **Put the attribute on `<html>` (`:root[data-theme]`) and the problem disappears.** A wrapper `<div>` would silently miss every dialog, sheet and tooltip — and those are exactly the surfaces nobody screenshots.

---

## The plan

Six phases. Each is independently shippable, each leaves the app green, each has an acceptance test. **The sequencing is the point** — in particular, the measuring instrument (Phase 2) is built *before* the bulk migration (Phases 3–5), not after.

### Phase 1 — Make the token layer real, in one file

**Touches only `src/index.css`. No component changes. No visual change intended.**

**a. Alias the semantic layer to the ramp instead of copying it.**

```css
--foreground: var(--slate-900);   /* was: #0f172b  — src/index.css:62 */
--muted:      var(--slate-100);   /* was: #f1f5f9  — src/index.css:67 */
/* …and --border, --input, --muted-foreground, --card, --popover */
```

After this the ramp is the single source. Today, changing `--slate-900` moves nothing.

**b. Add the ramp steps and surfaces the call sites actually need.**

- `--slate-300: #cad5e2` — 12 call sites use this hex today with no token to reach for.
- A token for the house card surface `#fafbfc` (66 uses across 27 files). Proposed name: `--surface-card`. **Naming is the owner's call** — see Open questions. Pick the name before Phase 4, because 66 call sites will take it.

**c. Define the 147 Figma escaped-slash names as aliases onto the real tokens.**

```css
--colors\/slate\/500: var(--slate-500);
--wint-blue-accent:   var(--primary);
--font\/family\/sans: var(--font-sans-stack);
/* …144 more */
```

**Argue this explicitly, because it looks like the wrong move and is the right one:**

It is one file. It is mechanical — the fallback hex in each call site tells you which token was meant. And it **flips 1,333 dead call sites to live in a single commit without touching a single component.**

It is a **temporary shim**: Phase 3 rewrites the call sites and Phase 4 deletes it. But it de-risks everything downstream, because from this commit on, **a theme change is visibly doing something and a regression is visible immediately** rather than at the end of a four-phase migration. Without it, Phases 3–5 are a long walk with no feedback. With it, every subsequent commit can be checked by loading `?theme=contrast`.

The shim is also self-liquidating by construction: the `token-exists` CI rule in Phase 6 cannot be turned on until the shim is gone, so there is a hard forcing function on deleting it.

**d. Fix `@custom-variant dark`:**

```css
@custom-variant dark (&:where(.dark, .dark *));
```

Why: `&:is(.dark *)` is descendant-only, so `dark:` on the `.dark` element itself never fires; and `:is()` carries its argument's specificity while `:where()` is always zero, so today `dark:` utilities silently outrank un-prefixed ones. **Keep the comment at `src/index.css:11-15` and keep the decoupling from `prefers-color-scheme`** — that decision is deliberate and correct.

**e. Fix the fonts.**

- Move `--font-sans` out of `@theme inline` (`src/index.css:179`) into a plain `@theme`, so it is overridable at runtime.
- Define `--font/family/sans` and `--font/family/heading` as real families, so the 67 `font-[family-name:…]` utilities stop falling through to `'Figtree:Medium'`-style non-families.
- Collapse the triplicate hardcoded stack at `src/index.css:227` onto the token.

**This step alone fixes the Geist bug** — the 24 classes that say Geist will start rendering in Geist. Expect a *visible* change on the topology and chart axis labels. That is the fix working, not a regression; screenshot before and after so nobody mistakes it.

**f. Convert the token layer to OKLCH.** *(Added by Ruling A — this was previously deferred.)*

Sourcing `dark` and `sand` from shadcn means adopting shadcn's colour space: its palettes ship in OKLCH, and mixing an OKLCH palette into hex tokens produces two notations for one ramp and a `color-mix()` whose behaviour depends on which side you wrote in which space. Convert the ~110 declarations in `src/index.css` once, here, rather than converting half of them in Phase 2 under time pressure.

**Be honest that this changes Phase 1's risk profile.** Phase 1 was a one-file edit with no visual intent; it is now a one-file edit **in a colour space this repo has zero of** — `grep -c oklch src/` returns **0**, and `color-mix()` likewise has no existing uses. Specifically:

- **Round-tripping hex → OKLCH is not always exact**, and this is a pixel-matched app. Convert, then diff the rendered output against `light` screenshots, and keep any stop that will not round-trip cleanly as a literal.
- **It breaks the 32 hardcoded hex assertions across 9 test files in `src/__tests__/` immediately** — sooner than the Phase 6 note anticipated, because those tests assert on computed colour. Budget for that here, in Phase 1, not in Phase 6.
- It is the one part of Phase 1 that can produce a visible regression, so it goes **last** within the phase, after (a)–(e) are green.

The upside is that it is the right moment: the token layer is being rewritten anyway, and converting 110 declarations in one file is far cheaper than converting them once call sites in Phases 3–4 start depending on them.

> **Acceptance test:** flipping one value in the ramp in `src/index.css` visibly repaints the app — today it does not — and the app under `light` is pixel-identical to its pre-conversion screenshots.

---

### Phase 2 — Four token sets, three selectable, plus the settings row

**Deliberately before the codemod**, because it is what makes the codemod's progress measurable.

`.dark` today declares 8 of ~60 needed tokens (`src/index.css:243-252`) and would render a broken screen if applied. Completing it, twice over, is the bulk of this phase.

#### The theme set

**Owner ruling: the theme control ships as a visible row in Account → Personal settings**, beside Language and Measurement units — **three options, Light first.** It is a real user-facing setting, not a debug affordance.

| key | `en` | `he` | source | ground | in the row |
|---|---|---|---|---|---|
| `light` | Light | בהיר | **Wint/Figma, unchanged** | `#F4F6F9` + the existing gradient, literal | **yes** (first) |
| `dark` | Dark | כהה | shadcn **Zinc** `.dark` | cool dark, gradient recoloured | **yes** |
| `sand` | Sand | חול | shadcn **Stone** light | warm light, gradient recoloured | **yes** |
| `contrast` | — | — | hand-authored, garish | irrelevant — it is not a design | **no** — `?theme=contrast` only |

Four token sets, three selectable. `light` is the existing `:root` and is **not** re-sourced, so the authoring work is `dark` + `sand` from shadcn, plus `contrast`, which needs no design at all.

**Why Zinc and Stone.** Zinc is the coolest surviving neutral and the closest in temperature to the slate ramp the app already uses, so `dark` reads as *this* app at night rather than a different product. Stone is warm, and **warm-vs-cool is what makes the third ground visibly different from both a cool near-white and a cool dark** — which was the requirement. Picking a third cool neutral would have produced three grounds and two visibly distinct ones.

#### Ruling A — palettes come from shadcn, not from us

**All palettes are sourced from shadcn rather than hand-authored.** The current offering, verified against <https://ui.shadcn.com/docs/theming>, is **seven base colors — Neutral, Stone, Zinc, Mauve, Olive, Mist, Taupe** — each shipped as a light `:root` + dark `.dark` pair, in **OKLCH**. `--background` light is `oklch(1 0 0)`, dark is `oklch(0.145 0 0)`, and dark borders use alpha: `oklch(1 0 0 / 10%)`. The token set is the standard one plus `--sidebar-*`, `--chart-1..5`, `--radius: 0.625rem` — and notably **no `--destructive-foreground`**, which this repo declares at `src/index.css:81` and will have to keep itself.

Three consequences, each of which lands somewhere else in this plan:

**1. OKLCH moves from deferred to required, and it lands in Phase 1.** It was in "what we are deliberately not doing"; that entry is now struck and the work folded into Phase 1. See Phase 1f.

**2. `components.json` declares a base color that no longer exists, and the docs say it cannot be changed.** `components.json:9` is `"baseColor": "slate"`. Slate is **not among the seven offered base colors**, and shadcn's docs state baseColor "cannot be changed after initialization." **This is a real obstacle and needs its own decision, not a line edit** — a modernised config most likely means running a scratch `init` in a throwaway branch and diffing the result against this repo's `src/index.css` and `components.json`, then porting deliberately. Do not hand-edit the field and assume the CLI agrees. Flagged in Open questions.

**3. shadcn has no gradient token of any kind.** Its ground is a single flat `--background`. This repo's ground is four layers including two stacked gradients. **shadcn therefore cannot supply the thing this app most needs a theme to supply** — which is what Ruling C exists to resolve.

#### Ruling B — Light stays Wint/Figma, and the asymmetry is deliberate

**The default Light theme is not replaced by a shadcn palette.** It keeps `#F4F6F9`, the Wint blue, and the Figma-matched values throughout. Only `dark` and `sand` are sourced from shadcn.

The consequence is an asymmetry that should be **stated as a property rather than discovered as a bug: pixel-parity with Figma is a property of `light` only.** Under `dark` or `sand` the app is *correct* — tokenized, coherent, legible — but it is no longer pixel-matched to a Figma frame, and no one should open a comparison and file the difference. This is precisely the shape the font research arrived at independently: parity becomes a property of one configuration, not of the app. Record it next to the themes, and keep every Figma-comparison screenshot on `light`.

It also means **`light` is the no-op choice and the regression baseline**: selecting it must change nothing, and anything that moves is a bug in the extraction rather than a theme.

#### Retraction — `field` is dropped, not renamed

The previous revision specified **`field`**: a high-contrast, high-legibility theme for a facility manager reading a leak alert in a plant room or direct sun, with a flat pure-white ground and the gradient removed.

**That theme is retracted.** shadcn offers **no high-contrast base color**, so sourcing palettes from shadcn (Ruling A) and shipping a legibility theme are incompatible without hand-authoring — which Ruling A forbids. The third option is now, honestly, **a third palette rather than a feature**: `sand` is a warm neutral that looks different, not a theme that solves a stated user problem.

**`sand` is not `field` renamed.** The concept was dropped. If outdoor legibility is a real product goal — and the user research reasoning for it was sound — it is **separate work with its own contrast testing** against WCAG ratios under measured conditions, and it will almost certainly need hand-authored values that no shadcn base color provides. Do not let `sand` stand in for it on a roadmap.

#### Requirement: each theme declares **four** background layers, not one

**Owner ruling: each theme must have a visibly different background.** That is a bigger requirement than it sounds, because **this app paints its ground in four separate places**, and only one of them is a shadcn token:

| layer | where it lives today | shape |
|---|---|---|
| `--background` | `src/index.css:61` — `#F4F6F9` | flat colour; the only one with a utility |
| `--app-bg` | **`src/index.css:110-116`** | **two stacked `linear-gradient`s; the first carries four `rgba()` stops** |
| `--tile-bg` | **`src/index.css:119-125`** | same shape — two stacked gradients, four `rgba()` stops |
| the card surface | the literal `#fafbfc`, **66 uses across 27 files** | flat colour, **no token today** — Phase 1b gives it one |

**A theme that redefines `--background` and forgets the other three produces exactly the half-changed screen this plan exists to prevent.** Treat all four as mandatory for every one of the four sets.

**Why this is a trap and not merely an oversight:** `--app-bg` and `--tile-bg` are **not in the `@theme inline` block** (`src/index.css:153-177` maps `--color-background` but neither of these). They therefore generate **no utilities at all** and sit outside the token-to-utility system that mechanic (2) describes — call sites reach them through arbitrary values and inline styles instead: `bg-[image:var(--app-bg)]` at `src/v2/pages/AccountScreenV2.jsx:389`, and `style={{ background: 'var(--app-bg)' }}` on five page roots (`HomeAccountOverview.jsx:91`, `HomeAllAccounts.jsx:1150`, `SystemPage.jsx:189, 208`, `SystemPageV2Screen.jsx:1311`). This is the same hazard as mechanic (5) — a themeable value expressed as an arbitrary property — and it is already in the inline-style count. **See mechanics (2) and (5); the point is not restated here, but it is now a hard requirement rather than an observation.**

#### Ruling C — the Wint gradients survive on every theme, with computed stops

shadcn has no gradient token, and this app's ground is mostly gradient. **The resolution is to keep Figma's geometry and take shadcn's colour.**

**Each gradient keeps its Figma geometry verbatim** — the angles, the stop positions, the alphas, exactly as they stand at `src/index.css:110-116` and `src/index.css:119-125`, including the non-ascending stop order that `src/index.css:100-109` spends ten lines justifying. **Only each stop's *colour* changes**, becoming a mix against that theme's shadcn `--background`:

```css
color-mix(in oklab, var(--background), <that theme's accent token> <pct>)
```

> **This is the whole point, so state it where nobody can miss it: the geometry is Figma's, the colour is shadcn's, and the mix is a mechanical function. No stop value is hand-picked.** That is what keeps three gradient pairs from becoming three bespoke design artefacts that drift apart — and it is what makes "add a fourth theme later" a cheap operation rather than another design round.

**`light` keeps its literal Figma stops unchanged**, per Ruling B. Only `dark` and `sand` compute theirs.

**Two caveats to carry into the implementation:**

- **`color-mix()` is Baseline widely available since May 2023**, and its default interpolation space is **oklab** — which is why `in oklab` above is the explicit form of the default rather than an exotic choice. Browser support is not the risk here.
- **`var()` substitutes at computed-value time**, so **a custom property holding an invalid value makes the entire `color-mix()` declaration invalid** — and an invalid `background-image` on a page root is a blank screen, not a slightly-off one. There is no partial failure and no console warning. **This is a direct argument for the Phase 6 `token-exists` rule covering gradient stops specifically**, and it is called out there.

Note that `color-mix()` has **zero existing uses in this repo** (`grep -rn color-mix src/`), the same as OKLCH. Both techniques arrive together in this plan, which is worth knowing when estimating.

#### Why the diagnostic theme still survives — and now carries more weight

With `field` retracted, the earlier argument snaps back into force and should be read as the primary justification for `contrast`, not a secondary one:

> **`sand` is a *designed* shadcn palette with plausible neutrals.** A surface stuck on `#fafbfc` **can** hide inside it — a warm near-white next to a cool near-white reads as a design choice, not as debt. The previous revision claimed a flat pure-white ground would expose it; that ground no longer exists, so that claim is withdrawn. **`contrast` is not designed** — it paints every token something violent, so nothing hides anywhere.

None of the three shipped themes is a reliable instrument. `dark` is too tasteful, `sand` is too plausible, and `light` is a no-op by definition. **The hidden `contrast` theme is now the only real measuring device in the plan**, which makes the Phase 6 rule that keeps it complete more important, not less.

Keeping it out of the row costs one line in the registry (`selectable: false`); a garish theme *in* the row would be the first thing a reviewer finds, and the row is meant to look like a product feature because it now *is* one.

> **Use `?theme=contrast` as the working check and the sign-off for every later phase.** Phases 3, 4 and 5 state this explicitly below. Signing a phase off against `dark` or `sand` will pass surfaces that are still hardcoded.

#### The control: a third `SegmentedPicker` row

The Personal settings card is `src/v2/pages/AccountScreenV2.jsx:581-613`, opening on `<SectionTitle>{t('more.personal_settings')}</SectionTitle>` at `:583`. It holds two rows that the new one copies exactly:

- **Language** — `src/v2/pages/AccountScreenV2.jsx:585-596` (icon + label at `:586-589`, picker at `:590-595`)
- **Measurement units** — `src/v2/pages/AccountScreenV2.jsx:600-611`, separated from Language by a `<Separator />` at `:598`

`SegmentedPicker` is **module-local to this file** — defined at `src/v2/pages/AccountScreenV2.jsx:252-279`, used only by those two rows. There is no import to add; the third row is a purely local change. Its signature is:

```jsx
function SegmentedPicker({ value, options, onChange, label })   // :252
```

with `options` as `{ value, label }` objects. Both call sites pass `label`, `value`, `options`, `onChange` in that order.

**Useful accident:** `SegmentedPicker`'s selected-state classes at `src/v2/pages/AccountScreenV2.jsx:271` are already semantic — `data-[state=on]:border-primary data-[state=on]:bg-secondary data-[state=on]:text-primary`. The picker will theme itself correctly for free. (Its resting state at `:270` is `text-slate-600`, raw — Phase 4 picks that up.)

**i18n consequence, concretely — and the insertion point is not where you would guess.** The row needs **four strings per locale**: a row label, plus one per selectable theme. `contrast` needs none, because it never appears in the UI.

The `more` block opens at **`:146`** in both `src/i18n/locales/en.json` and `src/i18n/locales/he.json` — the two files are line-for-line aligned through this section. The existing settings labels are `personal_settings` `:149`, `language` `:150`, `measurement_units` `:151`. **`:149-151` is those three existing labels, not free space.**

The precedent to copy is one line further down: `measurement_units` at `:151` is a flat row label whose *options* live in a nested `units` object at **`:152-156`**. A theme row has exactly that shape, so it mirrors it:

```jsonc
// after :156 (the close of "units"), before "notifications" at :157
"theme": "Theme",
"themes": { "light": "Light", "dark": "Dark", "sand": "Sand" },
```

and in `he.json` at the same point: `"theme": "ערכת נושא"`, `{ "light": "בהיר", "dark": "כהה", "sand": "חול" }`.

There are exactly two locales (`SUPPORTED_LANGUAGES`, `src/i18n/index.js:10-13`: `en` ltr, `he` rtl). **This screen has verified Hebrew/RTL** — the new row inherits that and must not regress it. Add both locales in the same commit; a row that renders an untranslated key in Hebrew is the obvious failure here.

> **One string needs a native speaker before it ships: חול.** The Hebrew above was chosen by an LLM. **בהיר** and **כהה** are the standard, safe renderings of Light and Dark and need no review. **חול** is the literal "sand" — whether it reads as a palette name rather than as the material is exactly the judgement a native speaker makes and an LLM does not. The row label ערכת נושא is conventional but was likewise not ruled on. Get both looked at; the other two are fine.

#### Constraint: the control must be inline, never a popover

**This is a constraint on the phase, not a footnote.** A `SegmentedPicker` is an inline `ToggleGroup`. A shadcn `Select` or `DropdownMenu` would be a Radix portal, and a Radix portal renders into `document.body` — **outside the phone frame entirely.**

`src/components/Phone.jsx:50-54` draws a fixed `393×852` frame with `overflow: 'hidden'`. A portal escapes it by design and renders across the whole browser window with the phone sitting in the middle of it.

This repo has hit that at least three times and has written the lesson down. `src/v2/components/ValveConfirmSheet.jsx:17-24`, verbatim:

> **WHY NOT THE SHADCN `<Sheet>`** — It was built on one first, and the sheet rendered across the whole browser window with the phone sitting in the middle of it. shadcn's Sheet is a Radix dialog that portals to `document.body`, and this app draws inside a fixed 393x852 frame (`src/components/Phone.jsx`) — a portal escapes that frame by design. Every sheet in this repo is therefore an `absolute inset-0` overlay inside the page instead: `SystemsFilterSheet:97`, `IgnoreBottomSheet`, `BottomSheet`.

`src/v2/components/SystemsFilterSheet.jsx:97` is the canonical workaround (`<div className="absolute inset-0 z-50 …">`), as is `src/v2/components/ValveConfirmSheet.jsx:86`.

**Use `SegmentedPicker` and the problem does not arise.** Record the reason at the call site, because "three options in a settings row should really be a dropdown" is exactly the kind of improvement someone makes later without knowing why it was not one already.

#### The switching mechanism

- `data-theme` attribute on `document.documentElement` — **on `<html>`, not a wrapper div**, so Radix portals are covered (mechanic 7). Note this is belt-and-braces given the constraint above: the *control* is inline, but `dialog` / `sheet` / `tooltip` / `sidebar` still portal, and they must theme too.
- A **blocking inline `<script>` in `<head>`** of `index.html` that reads storage and sets the attribute before the bundle is requested. Zero flash. Free on `404.html` via the existing `postbuild` (`package.json:9`).
- One namespaced `localStorage` key. **Follow `src/i18n/index.js` exactly** — storage key (`:7`), boot read (`:15`), registry with metadata (`:10`), apply-on-change (`:51`). It is the one working preference in this codebase and the row sits directly beside its UI.
- React holds only the theme *name*. No context full of colour values — that is the `ThemeContext` mistake, and it is why v1 has 1,840 inline styles.
- Set `<meta name="theme-color">` from JS on change; `index.html:9` is currently a hardcoded `#0B95F8`.

**A `?theme=` URL override, with two distinct purposes:**

1. It is the **only** way to reach the diagnostic `contrast` theme, which is absent from the row.
2. On the deployed Pages site it is a **shareable review link** — a reviewer can be sent a URL that opens directly in a given theme with no UI interaction at all. That matters for a mockup whose whole purpose is being sent to reviewers, and it means "show me this screen in dark mode" costs a link rather than a walkthrough.

#### Known seam: the phone chrome is still v1-themed

`src/components/Phone.jsx:2` imports `useTheme` from the v1 `ThemeContext`, and `DesktopFrame` paints the phone background (`:51`), the status-bar background and colour (`:71-72`) and the status-bar glyph fills (`:77-85`) from that v1 theme object. `<Phone>` wraps **all** routes including v2 (`src/App.jsx:572-581`, inside `<ThemeProvider>` at `:570-583`).

**The four-background requirement partly fixes this for free, and it is worth being precise about what is left.** The default v1 theme is `wint` (`src/context/ThemeContext.jsx:427`), and `WINT` already defers its frame to the app wash: `phoneBg: 'var(--app-bg)'` (`:172`) and `statusBarBg: 'transparent'` (`:170`), with a comment at `:167-169` explaining that a solid blue bar "was the most visible way the v2 screens read as *not the design*". So **once each theme redefines `--app-bg`, the phone frame follows automatically.**

What does **not** follow is small and specific:

- **`statusBarColor: '#0f172b'`** (`src/context/ThemeContext.jsx:171`) — a hardcoded near-black feeding all nine status-bar glyph fills at `src/components/Phone.jsx:77-85`. Under `dark` that is near-black on a dark ground: **invisible.**
- **`#DDE1E8`** (`src/components/Phone.jsx:48`) — the desktop page surround *outside* the phone. Stays light under every theme.

Two values, not twelve. Fix the first (it is a genuine defect under `dark`, not a seam); the second is review chrome and can be left deliberately. **Do not discover either during review.** This also qualifies the "v1 is latent, not blocking" position at the end of this document: `Phone.jsx` is a second v1 module v2 mounts, alongside `src/components/TabBar.jsx`.

> **Acceptance test:**
> 1. The row appears in Account → Personal settings with **Light first**, in both `en` and `he`, with no untranslated keys and no RTL regression.
> 2. **Selecting `light` changes nothing** — it is the no-op baseline, and any movement is a bug in the extraction.
> 3. `dark` and `sand` each repaint, survive a reload and a deep link, and **each shows a visibly different ground** — all four layers, with `--app-bg` and `--tile-bg` keeping their Figma geometry and taking computed `color-mix()` stops. Cool dark and warm light must be distinguishable from each other and from `light` at a glance.
> 4. `?theme=contrast` reaches a theme the row does not offer.
> 5. Under `?theme=contrast`, every surface tokenized so far repaints and every surface that is not is now *visibly* un-tokenized. **That last clause is the instrument.** From here, "how much is left?" is answered by looking.

---

### Phase 3 — The codemod: `var(--x, #hex)` → token, fallback deleted

**1,504 sites across 27 files.**

The fallback hex is the oracle: it tells you which token was meant. Most of this is mechanical — `var(--colors\/slate\/500,#62748e)` → the slate-500 token, fallback deleted.

**The judgement calls are the residue** — the ~97 distinct bare hex values that map to no named token. Two clusters need a decision, not a script:

- **Brand blue, five spellings.** `#0b81f8` ×7 is canonical (`--primary`, `src/index.css:76`); `#0b95f8` ×8, `#0b82f8` ×6, `#2b7fff` ×10, `#1c85fe` ×1, plus `#155dfc`, `#1a6fe0`, `#6bb2fa`/`#6bb1fa`. **Owner ruling needed before this phase starts** — if they are drift, they collapse to `--primary`; if `#2b7fff` is an intentional variant it needs its own token and a name.
- **Severity colours that have tokens and are ignored.** `src/index.css:91-94` already defines all four. 25 call sites spell the hex instead. This one is a straightforward fix with no ruling needed — but it is worth a visual check, because `bg-severity-high` has 0 uses and has therefore never been seen on screen.

**Then ban two-argument `var()` in `src/` in CI.** *That ban is the durable fix; the codemod is one-time.* Without the ban, the next Figma export reintroduces the pattern wholesale, and mechanic (5) — MDN's "no warning, no console message, no visual tell" — means nobody notices for months.

Work file-by-file, reloading under **`?theme=contrast`** after each file. With `field` retracted, none of the three shipped themes is divergent enough to be a reliable check — this is the one that is. A file that stops responding has a mistake in it, and you find out in minutes rather than at the end.

> **Acceptance test:** `grep -rn 'var(--[^)]*,' src/` returns nothing, and every one of the 27 files still repaints **under `?theme=contrast`**. Do not sign off against `dark` or `sand`; both are designed palettes and will pass surfaces that are still hardcoded.

---

### Phase 4 — Raw literals, and the shim's deletion

**469 bare hex + 139 `rgb()`/`rgba()` + 240 raw `*-slate-NNN` utilities** → semantic utilities or tokens. This is the largest and most judgement-heavy phase.

**Start with `src/components/ui/card.jsx`.** Re-tokenize `:17` and `:52` — two lines, **8 v2 importers**, wide blast radius. This is undoing `469314f` ("swap broken theme tokens for standard tailwind") now that the tokens are no longer broken. Reference that commit in the message; the symmetry is the explanation.

**Then collapse the hand-rolled card constants.** At least **13 `const CARD…` `String.raw` constants across 11 files**, each one a private re-implementation of `<Card>` built when `<Card>` was not usable:

`src/v2/components/ActivePolicyCard.jsx:108` · `src/v2/components/EventsTimelineCard.jsx:245,248,278` · `src/v2/components/InfoAccordion.jsx:128` · `src/v2/components/SystemHealthCard.jsx:108` · `src/v2/components/SystemTypeCard.jsx:94` · `src/v2/components/TriageBand.jsx:146` · `src/v2/components/ValveStatusCard.jsx:87` · `src/v2/components/EventFocusOverlay.jsx:340` · `src/v2/components/EventOverlay.jsx:62` · `src/v2/pages/AccountScreenV2.jsx:197`

Every one of them opens with `bg-[#fafbfc]`. **Once `<Card>` is tokenized again, these should collapse onto it.** That is the real win here — not 848 find-and-replaces, but deleting 13 divergent copies of one component. Expect pixel differences when they collapse; that is what the collapse is for, but it needs a visual pass per route, not a diff review.

**Then delete the Phase 1 shim.** The 147 escaped-slash aliases go; the `token-exists` CI rule from Phase 6 now has teeth. If deleting the shim breaks something, Phase 3 missed a call site — which is exactly the signal the shim was built to produce.

> **Acceptance test:** zero bare hex in `src/v2/`; the 147 aliases are gone from `src/index.css`; all three live routes render unchanged under `light` except where a `CARD` constant intentionally collapsed onto `<Card>`; and **under `?theme=contrast` every card surface repaints** — a card that does not move is a `bg-[#fafbfc]` that was missed. Check this under `contrast`, not under `sand`: a warm near-white sitting next to a cool near-white reads as a design choice, which is exactly how this surface has hidden across 66 call sites already.

---

### Phase 5 — SVG paint

**152 attributes across 21 production files.**

- **91 of 152 are exactly equal to an existing token value** — mechanical.
- **~45 generic glyphs → `currentColor`**, tinted at the call site. Chevrons, bells, funnels. Each needs a call-site decision about which text colour it inherits, so this is slower than it looks.
- **De-duplicate while you are in there.** **19 component names are defined in more than one file** — `LocationDot` ×5, `FloodLine` / `WifiConnected02` / `PhotoSensor3` / `Sparkline` ×3 each. "Chevron" is expressed **21 different ways** across file-local components, plus ~23 Lucide imports, plus 8 Material Symbols ligatures. Promote the survivors into `src/v2/icons/`, which already has the right contract: `size` + `className` + `currentColor`, and 22 of 22 components honour it.
- **Fix the module-local `PhotoSensor3` in `src/v2/components/WintSidebarV2.jsx`** — it hardcodes `stroke="#90A1B9"`. The clean copy already exists at `src/v2/icons/PhotoSensor3.jsx`, whose header comment (`:4-11`) documents the divergence and says "If the sidebar's copy ever changes shape, change this one too." Delete the local copy and import the shared one.

**Declare the domain glyphs non-themeable, in writing, in this repo.** Roughly 40 attributes are multi-colour domain artwork that cannot be expressed in `currentColor`:

- **The five valve states** in `src/v2/components/ValveStatus.jsx` — two-tone (ink + tint), one carrying a `strokeDasharray`.
- **The pipe-topology primitives** in `src/v2/components/PipeTopology.jsx` — pipes, sensors, junction, connectors, pixel-placed on a fixed 177×112 canvas. The file's own header (`src/v2/components/PipeTopology.jsx:1-16`) states why: "Every offset below is the ml-/mt- value Figma emits, not an approximation… a schematic that rewraps is no longer the same schematic."
- **The Wint drop family.**
- **`wint-vma-front.png`** — a 109 KB raster of the physical device.

Write this down **in the component files**, so that a future reader (or a future CI rule) does not file these as bugs. They are the product's visual identity, not un-migrated debt.

> **Acceptance test:** **under `?theme=contrast`** every generic glyph recolours; the declared domain glyphs do not and are annotated saying so, so the ones that stay put are a known, written-down list rather than a surprise; `src/v2/icons/` is the only place a shared glyph is defined.

---

### Phase 6 — The CI gates

This is the part that stops the debt coming back. Everything above is one-time; this is the ratchet.

A fourth checker alongside the existing `scripts/check-jsx-refs.mjs`, `scripts/check-shell-contract.mjs` and `scripts/check-text-overflow.mjs` — all three already wired into `npm test` (`package.json:11`). Rules:

| rule | what it fails on |
|---|---|
| `no-raw-color` | bare hex or `rgb()`/`rgba()` in `src/v2` (with an allowlist for declared domain glyphs) |
| `no-var-fallback` | any two-argument `var()` |
| `token-exists` | every `var(--x)` names a token declared somewhere — **including every `var()` inside a `color-mix()` gradient stop** |
| `themes-complete` | **all four sets** (`light`, `dark`, `sand`, `contrast`) declare every token the base set declares — **including all four background layers**, `--app-bg` and `--tile-bg` gradients among them |

> **`token-exists` must reach inside the gradient stops, and the reason is specific.** `var()` substitutes at computed-value time, so **a custom property holding an invalid value invalidates the whole `color-mix()` declaration** — and an invalid `background-image` on a page root is a blank screen, not a slightly-off one. There is no partial failure and no console warning. A rule that only checks `var()` in utilities will miss exactly the declarations whose failure mode is worst. See Ruling C in Phase 2.

> **Two things `themes-complete` must not quietly skip.**
>
> **The diagnostic theme.** `contrast` is the one set nobody looks at in normal use, so it is the one that rots first — and if it rots, the instrument stops working and every later phase's acceptance test silently becomes a no-op. **An un-selectable theme needs *more* CI protection than a shipped one, not less.**
>
> **The gradients.** `--app-bg` and `--tile-bg` are not in `@theme inline` and generate no utilities, so nothing else in the build will ever notice they are missing from a set. A naive "does every theme declare every `--color-*`?" rule passes a theme with no ground at all. **Check the four background layers by name.**

Plus a **theme-contract test**: render a sample of each surface under all four sets and assert the computed colour **actually changed** — including the computed `background-image` on the page roots, not only flat colours. Without this, theme-coverage regressions are invisible until someone takes a screenshot — and the whole history of this debt is that nobody takes the screenshot.

**Prerequisite to flag before this phase starts:**

> `scripts/check-text-overflow.mjs` currently reports **5 pre-existing failures, all in `src/v2/components/AlertCard.jsx`** (L606, L609, L624, L627, L630 — "has text-ellipsis/truncate but shrink-0 stops it engaging"), which makes `npm test` exit non-zero today. **That must be resolved before a new gate is added**, or the new gate's signal is lost in existing noise and people learn to ignore a red build.

**Also flag:** **9 test files in `src/__tests__/` assert on 32 hardcoded hex values.** They will need updating as Phases 3–5 land. Budget for it; do not discover it on the last day.

> **Acceptance test:** `npm test` is green, with the four new rules on, with the shim deleted, and with the theme-contract test asserting a real repaint.

---

## Free wins — sweep these up while you are in these files

Each is independent. None is blocked by anything above. Together they are a larger performance win than the rest of this document.

- **De-duplicate the Inter and Material Symbols loads.** Inter loads twice (`index.html:12` and `src/index.css:6`). Material Symbols loads twice (`index.html:14` and `src/index.css:7`).
- **Delete Urbanist.** Loaded from `index.html:13` on **every** page load, for exactly one `<span>`: `kpiFont` at `src/context/ThemeContext.jsx:411`, consumed at `src/screens/home/HomeManager.jsx:162`, on the v1 `/home-legacy` route, under the `portal` theme only. 27,752 B for one number on one screen in one theme.
- **Delete `public/icons.svg`.** It is the stock Vite-template sprite (`bluesky-icon`, …), referenced by nothing.
- **Material Symbols: 1,138,212 bytes for 28 ligatures on v1 screens only.** (Latin subset, measured 2026-10-21.) That is **2.1× the entire gzipped JS bundle** (532,518 B) and **9× all four text fonts combined**. It has **0 uses in `src/v2/`** — it renders 28 distinct ligatures across 38 v1 files, and it is downloaded on every v2 page load. Two options:
  - **(a) Cheap, partial:** delete the v2-side load (`src/index.css:7`) now, keeping `index.html:14` for v1. Minutes of work.
  - **(b) Complete:** migrate the 28 ligatures to Lucide (~21 KB raw, already a dependency) and drop the font entirely. **>1.1 MB off first load.**
  Option (b) is near-free if v1 is being retired anyway. **This is a larger performance win than anything else in this document.** Owner call — see Open questions.
- **The Geist/Figtree bug**, which Phase 1 fixes as a side effect. Worth tracking as its own design-fidelity item regardless of whether this plan ships.

For reference, all four text families are already variable fonts. Latin subsets measured: **Figtree 20,156 B · Urbanist 27,752 B · Geist 29,400 B · Inter 48,256 B** — all four together are **125,564 B, or 11% of Material Symbols alone.**

---

## What we are deliberately not doing

The original ask named theme, palette, **icons** and **fonts** as swappable from an in-app setting. Three independent research passes each concluded, separately, that icons and fonts should not ship as user settings. Here is why, briefly. This is a record of a decision, not an invitation to relitigate it.

**Swappable icon sets.** The design is a documented four-set collage. `src/v2/icons/index.js:3-6` says so outright — "The design draws on five icon sets (Huge, Phosphor, Tabler, Remix, Lucide). Rather than take four dependencies for ~17 glyphs, the non-Lucide ones are exported here as project-owned SVG components." Provenance comments give Huge 8, Phosphor 6, Tabler 5, Remix 3, across 13 distinct viewBoxes. **There is no single set to swap *from*.** And roughly 40% of distinct glyphs — valve, topology, device — exist in no public set, so a switch would change the chevrons and leave the product's visual identity untouched: maximum churn, minimum effect. shadcn's `iconLibrary` is a CLI codemod, not a runtime abstraction, and it reaches 4 files / 4 icons here. The only shipped runtime icon facade in the industry (Atlassian's, 2025) was a temporary migration scaffold, explicitly slated for deletion. **The real icon win is Phase 5 plus deleting Material Symbols** — and that one is worth 1.1 MB.

**Swappable fonts as a user setting.** Cheaper than icons — the hook half-exists by accident, since `--font/family/sans` is already referenced by 67 utilities. But this app pixel-matches Figma with **162 `whitespace-nowrap`**, **128 fixed `w-[…px]`** and **241 fixed `h-[…px]`**, and it has **shipped text-overflow bugs three times**; `scripts/check-text-overflow.mjs:4-10` names all three by name. A family change is that same failure mode arriving from a different cause, on every screen at once. **The mitigating fact, stated honestly:** 80 pinned `leading-[…px]` values mean *vertical* reflow is near-zero, so the risk is horizontal only. **This is a deferral on risk grounds, not an impossibility.** The condition under which it becomes viable is concrete: **extend `check-text-overflow.mjs` to render under each candidate family first.** Do that, get a clean run, then this is a small piece of work.

~~**OKLCH conversion.**~~ **Struck — this is now required, and it is in Phase 1f.** The original reasoning was that OKLCH changes 110 declarations in a pixel-matched app and breaks 32 hex test assertions in exchange for nothing this plan needs. The first two clauses still hold; the last no longer does. **Ruling A sources `dark` and `sand` from shadcn, whose palettes ship in OKLCH**, so the plan now needs it — and the `color-mix()` gradient stops of Ruling C need a single consistent colour space to mix in. The cost did not fall; the benefit arrived. See Phase 1f, where the raised risk is written up rather than hidden.

**v1.** 41 files on `useTheme`, 1,840 inline styles, a 449-line theme engine with 7 themes and `setTheme` called from nowhere. **No v1 *screen* is reachable from v2** — and `src/components/TabBar.jsx`, a v1 module v2 mounts, was migrated off `useTheme` in `acf15a0`. So the engine is latent, not blocking.

**One exception, and the settings ruling surfaced it:** `src/components/Phone.jsx` still calls `useTheme` (`:2`) and wraps every route including v2 (`src/App.jsx:572-581`). Its ~12 frame and status-bar values are the one piece of v1 theming that a shipped dark mode will visibly collide with. That is scoped in Phase 2 and is not a reason to take on the other 40 files.

**Any further v1→v2 port drags the rest in**, so this stays on the radar: if a v1 screen is being ported, its theme debt is part of that port's cost, not this plan's.

---

## Open questions for the owner

1. **Brand blue — intentional or drift?** Five spellings: `#0b81f8` ×7 (canonical), `#0b95f8` ×8, `#0b82f8` ×6, `#2b7fff` ×10, `#1c85fe` ×1, plus `#155dfc`, `#1a6fe0`, `#6bb2fa`/`#6bb1fa`. **Ruling needed before Phase 3** — it decides whether ~40 call sites collapse to one token or split across three.
2. **The `#fafbfc` card surface — what should the token be called?** 66 uses across 27 files will take the name. Proposed: `--surface-card`. Needed before Phase 4.
3. **Material Symbols — delete the v2 load now, or wait for v1 retirement and drop the font entirely?** 1.1 MB on every page load either way until one of the two happens.
4. ~~**Does the theme control ever go in Settings, or does it stay a dev instrument?**~~ ~~**What are the shipped themes called?**~~ **Both ruled.** The control ships as a `SegmentedPicker` row in Account → Personal settings with **three options, Light first** — `light` (Wint/Figma, unchanged) / `dark` (shadcn Zinc) / `sand` (shadcn Stone) — while the diagnostic `contrast` theme stays out of the row and is reachable only via `?theme=contrast`. Each has a visibly different ground across all four background layers. Phase 2 is written to all of that.

5. **`components.json` names a base color shadcn no longer offers, and says it cannot be changed. How do we modernise it?** `components.json:9` is `"baseColor": "slate"`; the seven current base colors are Neutral, Stone, Zinc, Mauve, Olive, Mist and Taupe, and the docs state baseColor "cannot be changed after initialization." **This needs a decision before Phase 2 sources anything from shadcn.** The likely answer is a scratch `init` in a throwaway branch, diffed against this repo's `src/index.css` and `components.json` and ported deliberately — not an in-place edit of the field. Worth half a day of investigation on its own.

6. **Live naming item: חול needs a native Hebrew speaker's review before it ships.** בהיר (Light) and כהה (Dark) are standard and safe. **חול is not reviewed** — it is the literal "sand", chosen by an LLM, and whether it reads as a palette name rather than as the material is exactly the judgement a native speaker makes. The proposed row label ערכת נושא is conventional but was likewise not ruled on. This blocks nothing before Phase 2 but must be settled before the row ships.

7. **Is outdoor legibility a real product goal?** The retracted `field` theme was built on a real observation — facility managers read leak alerts on phones in plant rooms and direct sun. `sand` does **not** address it and must not be recorded as if it does. If the answer is yes, it is separate work with its own contrast testing, and it will need hand-authored values no shadcn base color provides.

---

## Effort

Per phase, with the basis stated. These are working days for one implementer who knows the codebase.

| phase | basis | estimate |
|---|---|---|
| **1** — token layer real **+ OKLCH** | 1 file; ~147 generated alias lines + ~20 hand edits, all scripted from the fallback hexes so the cost is verification not typing — **plus (f), the OKLCH conversion of ~110 declarations**, which is mechanical to generate but needs a pixel diff against `light` screenshots and breaks 32 hex assertions in 9 test files on the spot. Ruling A moved this in from "deferred"; it roughly doubles the phase | **1.5–2.5 days** |
| **2** — four token sets + settings row | **Cheaper than the last revision, because Ruling A removed the design work.** `dark` and `sand` are *transcribed* from shadcn Zinc and Stone rather than designed; `light` is untouched; `contrast` needs no design. What remains is real but bounded: **two `color-mix()` gradient pairs** (`--app-bg` + `--tile-bg` for `dark` and `sand`), where the geometry is copied verbatim from `src/index.css:110-116` / `:119-125` and only the stop colours are computed — so the work is deriving **one mix formula** and checking it renders, not sampling eight stops by eye. Plus boot script, `?theme=` override, `theme-color` wiring, the `SegmentedPicker` row (copies `:600-611`, no import) and 2 locales × 4 strings. **Excludes** the `components.json` baseColor investigation, which is its own open question | **2–3 days** |
| **3** — `var()` codemod | 1,504 sites / 27 files. The codemod handles ~1,400 at near-zero marginal cost; the residue is the ~97 distinct unmapped hexes plus a visual pass per file at ~15 min × 27 | **2–3 days** |
| **4** — raw literals + shim deletion | 469 hex + 139 rgba + 240 slate utilities = 848 sites, plus 13 `CARD` constants across 11 files collapsing onto `<Card>` with 8 importers downstream. **Judgement, not mechanics** — most of the time goes on deciding which semantic token a literal meant, and on the visual pass after each collapse | **3–5 days** |
| **5** — SVG paint | 152 attributes: 91 mechanical, ~45 needing a call-site tint decision each, plus 19 duplicate component names to de-duplicate and promote | **1.5–2.5 days** |
| **6** — CI gates | 4 rules + the theme-contract test, **plus** clearing the 5 pre-existing `AlertCard.jsx` overflow failures and updating 32 hex assertions across 9 test files | **1.5–2 days** |
| **free wins** | (a) dedupe/delete only: **0.5 day**. (b) including the 28-ligature Lucide migration across 38 v1 files: **+1 day** | **0.5–1.5 days** |

**Total: roughly 12.5–19.5 working days**, plus an un-estimated `components.json` investigation (Open question 5), which should be timeboxed at half a day before Phase 2 starts.

**Be honest about the shape of that:** Phases 3–4 are still the largest block and are the only phases where the work is judgement rather than mechanics — a codemod cannot tell you whether `#2b7fff` was meant to be `--primary`. Phase 5 is medium and mostly mechanical; Phase 6 is small and high-leverage.

**Where the last three rulings moved the cost, since it is not where it looks:**

- **Phase 1 roughly doubled** (0.5–1 → 1.5–2.5 days). Ruling A pulled OKLCH in from "deferred", turning the one phase that was genuinely low-risk into the one that can produce a visible regression in a pixel-matched app. **This is now the riskiest small phase in the plan**, and it is worth doing with screenshots open.
- **Phase 2 came *down*** (3–4 → 2–3 days), which is counter-intuitive after three rulings added a theme, a settings row and a gradient requirement. The reason is Ruling A: sourcing palettes from shadcn **removed the design work**. The previous estimate was dominated by "someone has to choose three palettes and sample three gradient pairs by eye"; transcribing Zinc and Stone and deriving one `color-mix()` formula is engineering, not design. **The plan no longer needs a designer on its critical path** — that is the single biggest scheduling consequence of these rulings.

If the budget is cut, **cut from the back, not the front** — Phase 1 alone already turns a decorative token layer into a real one, and Phase 1 + 2 together give you three shippable themes and the instrument that makes the rest measurable whenever it gets scheduled.

---

## Corrections and supersessions, found while spot-checking

Recorded rather than silently adjusted, per the repo's documentation convention. **Items 1–6** are corrections to the research this plan was built on. **Items 7–13** record where owner rulings superseded what this document previously said, including two places where it argued the opposite.

1. **`src/v2/icons/PhotoSensor3.jsx` is clean, not the exception.** The brief listed it as the one `src/v2/icons/` component with hardcoded paint (`stroke="#90A1B9"`). It is not: `src/v2/icons/PhotoSensor3.jsx:27` is `stroke="currentColor"`, and the only `#90A1B9` in that file is **inside a comment at `:8`** explaining the divergence from the sidebar's copy. Grepping the whole of `src/v2/icons/` for paint attributes returns **zero** hits. **All 22 hand-authored icon components are pure `currentColor`** — 22/22, not 21/22. The hardcoded `stroke="#90A1B9"` lives in the **module-local, non-exported `PhotoSensor3` in `src/v2/components/WintSidebarV2.jsx`**, which is already counted in that file's 15 SVG-paint attributes. Phase 5 is written against the corrected location.

2. **Three SVG citations are off by one or two lines** — each points at the component's `<svg>` opening tag rather than the hardcoded attribute:
   - `EventsTimelineCard.jsx:174` is `<svg …>`; the `stroke="#62748E"` is at **`:175`**.
   - `SystemPageV2Screen.jsx:400` is `<svg …>`; the `stroke="#90A1B9"` is at **`:401`**.
   - `WintSidebarV2.jsx:168` is `<svg width={size} …>`; the `stroke="#90A1B9"` is at **`:170`**.
   The components and the hex values are correct in all three cases; only the line offsets were off. This document cites the component ranges plus the exact attribute line.

3. **`src/App.jsx:7` is the `ThemeProvider` *import*, not the wrap.** The provider actually wraps the tree at **`src/App.jsx:570-583`**. The substance of the claim — that `ThemeContext` still wraps the whole app — is correct.

4. **`src/v2/icons/index.js:3-4` under-cites the quoted comment.** The quoted sentence spans **`:3-6`**. The quote itself is accurate.

5. **Two line cites in the settings-row ruling were slightly off, both in the same direction** (pointing one line inside the block rather than at its opening):
   - The Personal settings section was cited as `AccountScreenV2.jsx:583`; `:583` is the `<SectionTitle>`. The `<Card>` opens at **`:582`** and the commented section at **`:581`**; the card closes at `:613`.
   - The Language row was cited as `:586-596`; `:586` is the inner icon+label `<div>`. The row's own wrapper opens at **`:585`**.
   - **Measurement units `:600-611` is exact.**

6. **`SegmentedPicker` is module-local, not a shared component.** It is defined at `src/v2/pages/AccountScreenV2.jsx:252-279` and used only by the two rows in that same file. This makes the third row cheaper than it looks — no import, no shared-component blast radius, no other call site to regress. Verified signature: `{ value, options, onChange, label }`, with `options` as `{ value, label }` objects. It is built on shadcn `ToggleGroup` (`type="single"`, `variant="outline"`), so it is inline and never portals — which is what makes it safe inside the phone frame.

7. **Phase 2 went one theme → two → four → four-with-`field`-retracted across five owner rulings, and the instrument survived every one of them by being split off rather than dropped.** Worth recording as a progression, because the shape of it is the useful part:

   - **As first written:** one deliberately garish theme on a dev/debug surface. Reasoning: the owner wanted an instrument, not a user-facing feature, so the control should stay off the product surface. **Overruled** — it ships in Account → Personal settings.
   - **After ruling 1:** two sets. The garish theme was not deleted; it was *split* into a presentable `dark` for the row and an un-selectable `contrast` for the measuring, reachable only via `?theme=contrast`.
   - **After ruling 2:** four sets, three selectable — `light` / `dark` / `field` in the row, `contrast` still hidden — each with a visibly different ground across all four background layers.
   - **After rulings A–C:** still four sets, three selectable, but **`field` is retracted and replaced by `sand`**, and the two non-default palettes are **sourced from shadcn rather than hand-authored**. `contrast` is unchanged and is now the *only* instrument in the plan.

   **The instrument was never the thing at stake; its delivery vehicle was.** Every ruling made the product surface bigger and the diagnostic more narrowly scoped, and `contrast` survived all of them because the argument for it is specific rather than general: **a *designed* theme always has plausible neutrals, so something can always hide in it.** That argument was briefly weakened when `field` was specified as flat pure white, and it came straight back when `field` was retracted — see item 6.

8. **A claim this document made, then withdrew, and has now restored.** The sequence is worth keeping because it shows how load-bearing the "designed themes are weak instruments" argument is:
   - **Originally:** a surface stuck on `#fafbfc` *can* hide inside a designed theme, so `contrast` is needed.
   - **Withdrawn under the four-background ruling:** `field` was specified as **flat pure white**, against which `#fafbfc` sits visibly dirty. The doc was amended to say `field` largely exposes it, and Phase 4's acceptance test was changed to name `field` rather than `contrast` for the card-surface check.
   - **Restored under Ruling A:** `field` is retracted. **`sand` is shadcn Stone — a warm near-white**, and a `#fafbfc` cool near-white sitting next to it reads as a design choice, not as debt. The original claim holds again, Phase 4's acceptance test is back on `contrast`, and the one-line rationale is written into it so this does not cycle a third time.

9. **`field` was dropped, not renamed to `sand`** — recorded explicitly in Phase 2 and as Open question 7. `field` was a legibility feature answering a stated user condition (phones in plant rooms and direct sun); `sand` is a warm neutral palette. shadcn offers no high-contrast base color, so Ruling A's "source from shadcn" and `field`'s "ship a legibility theme" are incompatible without hand-authoring. **The user problem `field` addressed is still unaddressed**, and the document says so rather than letting `sand` quietly inherit its justification on a roadmap.

10. **OKLCH moved from "deliberately not doing" to required, mid-document.** The original entry argued it was orthogonal: 110 declarations and 32 broken test assertions in a pixel-matched app, in exchange for nothing the plan needed. **Two of those three clauses still hold** — the cost did not fall, the benefit arrived. Ruling A sources palettes from shadcn, which ships OKLCH, and Ruling C's `color-mix()` stops need one consistent space to mix in. The entry is struck in place rather than deleted, and the raised risk is written into Phase 1f rather than buried: **Phase 1 went from the safest phase to the one most likely to produce a visible regression.**

11. **`--app-bg` / `--tile-bg` verified exactly as briefed.** `--app-bg` is `src/index.css:110-116` and `--tile-bg` is `src/index.css:119-125` — both exact. Both are **two stacked `linear-gradient`s whose first carries four `rgba()` stops**; also exact. Neither appears in `@theme inline` (`:153-177`), confirming they generate no utilities. **Stale comment found in passing, not fixed** (out of scope for this document, worth a one-line cleanup): `src/v2/pages/SystemPageV2Screen.jsx:1320` calls it "The five-stop wash" — it is four stops. `src/index.css:100-101` describes the same four correctly.

12. **The phone-chrome seam was overstated in the previous revision and is now corrected.** It claimed "~12 values" would not follow `data-theme`. In fact the default v1 theme already sets `phoneBg: 'var(--app-bg)'` and `statusBarBg: 'transparent'` (`src/context/ThemeContext.jsx:170-172`, default `wint` at `:427`), so **the frame follows `--app-bg` for free** once each theme declares one. The real residue is two values: `statusBarColor: '#0f172b'` (`src/context/ThemeContext.jsx:171`, feeding nine glyph fills at `src/components/Phone.jsx:77-85`, invisible under `dark`) and the `#DDE1E8` desktop surround at `src/components/Phone.jsx:48`. The first is a genuine defect; the second is review chrome.

13. **Verified against the repo for these rulings:** `components.json:9` is indeed `"baseColor": "slate"` (also `"style": "new-york"`, `"cssVariables": true`, `"iconLibrary": "lucide"`). `grep -c oklch src/` = **0** and `grep -rn color-mix src/` = **0** — **both techniques are new to this repo and arrive together**, which is worth knowing when estimating Phase 1 and Phase 2. `--app-bg` (`src/index.css:110-116`) and `--tile-bg` (`src/index.css:119-125`) confirmed again as two stacked `linear-gradient`s with four `rgba()` stops each; their geometry is what Ruling C preserves. Nothing in the three rulings contradicted a line in the file.

Everything else cited in this document was verified against the files at `f65e6fe` and matched: `src/index.css:2, 11-15, 16, 27, 62, 67, 76, 91-94, 153, 179, 227, 243-252`; `src/v2/components/AlertCard.jsx:161`; `src/components/ui/card.jsx:17, 52`; commit `469314f`'s title verbatim; `scripts/check-text-overflow.mjs:4-10`; `package.json:9, 11`; `index.html:9, 12, 13, 14`; `src/i18n/index.js:7, 10, 15, 48, 51`; `src/v2/pages/AccountScreenV2.jsx:197, 309, 310, 317, 594`; `src/v2/components/chartAxis.js:72`; `src/v2/components/WaterConsumptionCardV2.jsx:1025` (confirmed called with no argument); `src/v2/components/PipeTopology.jsx:1-16, 68`; `src/context/ThemeContext.jsx:411` and its 449 lines; `src/screens/home/HomeManager.jsx:162`; `src/components/TagCelebration.jsx:59-61`; all 11 `CARD` constant line numbers; and the 5 `check-text-overflow.mjs` failures, which are indeed all in `AlertCard.jsx` (L606, 609, 624, 627, 630). `#fafbfc` confirmed absent from `src/index.css`.
