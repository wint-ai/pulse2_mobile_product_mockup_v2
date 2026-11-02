/**
 * ValveManagementCard — a READ-ONLY donut readout of valve states across a
 * scope, plus the way in to the screen that manages them. Mounted at the
 * LOCATION level and the ACCOUNT level.
 *
 * ── WHAT WAS REMOVED FROM THIS FILE, BY WHOM, AND WHERE IT WENT ──────────
 * THIS CARD USED TO ACT. It carried per-category tick boxes, an action bar,
 * `BulkValveConfirmSheet`, a result panel and a retry, and it wrote through
 * `recordBulkValveCommand`. ALL OF THAT IS GONE FROM HERE — removed
 * 2026-11-02 on the owner's explicit instruction, quoted verbatim so the next
 * reader does not see a gutted card and "restore" it:
 *
 *   "i dont like the way its built. the widget needs to be display only for
 *    managing valve i want to open a dedicated screen so user can
 *    select/deselect specific valves can filter per location / etc. main
 *    widget is display only"
 *
 * `.claude/skills/v2-page-parity/SKILL.md:12-21` (Rule 0) forbids removing
 * working functionality WITHOUT the owner's explicit permission. That message
 * is the permission, for this card only. THE FUNCTION IS NOT DELETED FROM THE
 * PRODUCT: selection, per-location filtering, the confirm sheet and the
 * command write live on the dedicated screen, `src/v2/pages/ValveManagementScreen.jsx`,
 * reached by the routes this card links to:
 *     /valves                 fleet / unscoped
 *     /valves/:locationName   scoped, mirroring /location/:locationName
 * If those routes are dead, THAT is the regression — not this card.
 *
 * Everything that SHOWS state survived untouched: the donut (including the
 * two-circle evenodd annulus for the full ring), the four category rows with
 * their swatch / glyph / label / count / offline sub-count, the honest
 * denominator line, every empty and degenerate state, `effectiveValveState`
 * resolution, and the repaint wiring.
 *
 * DESIGN SOURCE: none. A survey walked every page of the Figma file and found
 * no valve-management, bulk-action or status-breakdown frame to transcribe.
 * This component is net-new from the design system, structurally like
 * `AccountScreenV2.jsx:4`. EVERY VISIBLE STRING BELOW IS NEW COPY AWAITING THE
 * OWNER'S APPROVAL and is marked `NEW COPY` at its site — including the entry
 * button's "Manage valves". The four STATE words are the exception: they come
 * from `VALVE_CATEGORIES` (`valveScope.js:82`), which takes them verbatim from
 * Figma board 199535:96542 — `Valve Error`, `Open`, `Closed`,
 * `No valve installed`. Do not reword those four here.
 *
 * ── WHAT THIS COMPONENT IS NOT ALLOWED TO KNOW ───────────────────────────
 * It derives NOTHING about valves. `valveScope.js` is the single source of
 * what a state means; this file calls `summariseValves` and renders the
 * answer. A second copy of that rule living in a component is the exact defect
 * that module was extracted to prevent (`valveScope.js:12-18`). It no longer
 * calls `targetsFor` at all — nothing here is sized against an action any
 * more; the screen owns that.
 *
 * ── THE OWNER'S OTHER REQUIREMENT SURVIVES THE STRIP ─────────────────────
 * "we have a kind of an offline devices that Valve cannot be shut off. So we
 * need to explain the user this situation somehow and to not let him think
 * that this Valve will take place on this operation that he wants to."
 *
 * Two of its three sites were the action bar and the result panel, and both
 * went to the screen with the action. THE THIRD IS HERE AND IS NOT NEGOTIABLE:
 *   · the ROW count INCLUDES offline systems and says so beside itself
 *     ("5 · 1 offline") — an offline system is still at its last-known state
 *     and still part of the scope;
 *   · the DENOMINATOR LINE states, side by side, how many systems carry a
 *     valve, how many can actually be commanded, and how many are offline. The
 *     gap between the first two numbers is the whole warning, and it is the
 *     reason this readout is still worth drawing with no buttons on it.
 *
 * ── THE ARCS ARE NOT CONTROLS. THE ROWS ARE — AND NOW THEY NAVIGATE. ─────
 * The owner asked for a pie chart and gets one — a donut with the total in
 * the hole — but nothing is wired to a wedge, and this is measured, not
 * preferred. At the real fleet mix in this dataset (74 open / 7 closed /
 * 2 error) the Error arc is about 4 degrees. The card is 361px inside the
 * 393px frame, so the ring band is ~28px (the band `DonutPlots` draws at
 * `HomeAllAccounts.jsx:276`, r 75 -> 46.85): NO arc reaches a 44px touch
 * target in the radial direction at ANY share, and along the arc a slice needs
 * >=11.5% before its length reaches 44px. Closed and Error never get there.
 * So every arc carries `pointer-events-none` + `aria-hidden`, the svg carries
 * `role="img"` with the whole readout in its label, and every interactive
 * element is a row at a guaranteed 48px.
 *
 * ── THE CHEVRON LEFT, AND THE CHEVRON IS BACK ────────────────────────────
 * This file's previous author removed the `>` on every row, with this
 * reasoning, which was RIGHT AT THE TIME:
 *   "A `>` promises a drill-down; pressing the row toggles a tick box. A
 *    control that looks like navigation and behaves like a checkbox is a worse
 *    defect than a missing affordance, and there is no drill-down destination
 *    to offer."
 * Both halves of that objection are now gone: the rows DO navigate, and there
 * IS a destination. The chevron is therefore restored — on the three rows that
 * navigate and on no others. It is recorded here rather than silently
 * re-added so the reversal reads as a decision and not as drift.
 *
 * "No valve installed" KEEPS NO CHEVRON and does not navigate: there is
 * nothing to manage there and the dedicated screen cannot act on it. It stays
 * `aria-disabled="true"` — never the `disabled` attribute, which some
 * assistive tech skips outright so the user never learns WHY — with the reason
 * inside its accessible name.
 *
 * ── THE DEEP LINK, AND A CAVEAT ──────────────────────────────────────────
 * Tapping a category row opens the screen ALREADY FILTERED to that category,
 * passed as `?state=<VALVE_CATEGORIES key>` — `error` | `open` | `closed`.
 * The key, not the label: the label is Figma's English and the key is the
 * contract `valveScope.js` already publishes to every other caller.
 *
 * OPEN, AND NEEDS RECONCILING — DO NOT READ THIS AS DONE. This card was
 * written while `ValveManagementScreen.jsx` did not yet exist on disk, so the
 * param name is DEFINED here rather than matched against it. The screen has
 * since landed, and as of 2026-11-02 IT DOES NOT READ THE QUERY STRING AT ALL:
 * it imports `useLocation` only for `key` (`:767`) and never touches
 * `location.search`. Checked in a browser, not inferred —
 * `/valves/320%20Summit%20Blvd` and `/valves/320%20Summit%20Blvd?state=open`
 * render the identical list with its "All" chip still selected.
 *
 * So the deep link currently lands on the right SCOPE and the wrong FILTER.
 * The names line up, which is the easy half: the screen's own filter group is
 * `id: 'state'` (`:840`) and its options are keyed by the same
 * VALVE_CATEGORIES keys. What is missing is one read of `?state=` into that
 * group's initial value, and it belongs in the screen, not here. If that
 * reconciliation picks a different key, change `STATE_PARAM` below — never the
 * four category keys, which are `valveScope.js`'s contract.
 *
 * ── WHY A HAND-ROLLED ARC GENERATOR AND NOT RECHARTS ─────────────────────
 * `recharts@3.8.0` is installed and `PieChart`/`Pie`/`Cell` are exported;
 * this would have been the repo's first `PieChart`. It was not taken, for
 * four reasons specific to this card:
 *   1. THE BOX NEVER CHANGES SIZE. The donut is a fixed 150x150 inside a card
 *      that is `w-full` by contract (`homeWidgetWidth.dom.test.jsx:80-82`).
 *      `ResponsiveContainer` exists to measure a box that moves; here it would
 *      install a ResizeObserver, measure 0x0 under happy-dom, and need
 *      `initialDimension` propped past it to render at all.
 *   2. THE MINIMUM-ARC FLOOR REWRITES THE VALUES BEFORE LAYOUT. recharts would
 *      receive values already massaged by `sweepsFor()` below, so its layout
 *      pass buys nothing that is not already computed.
 *   3. MAKING THE WEDGES INERT IS WORK, NOT A PROP. recharts v3 renders its
 *      own `<Surface>`/`<Sector>` tree with its own event wiring; stripping
 *      that back to `pointer-events: none` + `aria-hidden` is more code than
 *      the four `<path>` elements it would be stripping.
 *   4. THE COLOUR CONTRACT IS SIMPLER WITHOUT IT. `chart.jsx:4-26` is directly
 *      on point: this repo deliberately does not use recharts' `theme:` key,
 *      because that knows two modes while this app ships four, so a config
 *      entry names a TOKEN and the token is re-derived per theme. Honoured
 *      here in its shortest possible form — `fill="var(--valve-open)"` on the
 *      path, resolved by whichever theme is set on an ancestor, with no
 *      `ChartStyle` block and no `chart-N` indirection in between.
 * The cost is that this file owns the arc maths. It is ~25 lines, below.
 * `arcPath` and `sweepsFor` are deliberately NOT exported: a second export
 * beside the component costs the file its fast-refresh boundary
 * (`react-refresh/only-export-components`, which is an ERROR in this config —
 * `ValveStatus.jsx:108-110` records the same decision). They are therefore
 * tested through the rendered `d` attributes, not called directly.
 *
 * `DonutPlots` (`HomeAllAccounts.jsx:276`) is deliberately NOT reused: its
 * only prop is `className`, its five arcs are hardcoded path geometry with
 * five hardcoded hexes, and it cannot show different numbers. It is a picture.
 *
 * ── THE MINIMUM-ARC FLOOR, AND WHAT IT COSTS ─────────────────────────────
 * A 1.3% slice at this radius is a hairline nobody sees, and rounding a
 * non-zero count to zero area is the one thing a status chart may never do.
 * So any non-zero slice is clamped to MIN_SWEEP_DEG and the debt is taken
 * proportionally from the slices that have room above the floor.
 *
 * THE HONESTY COST, PLAINLY: below MIN_SWEEP_DEG/360 = 1.7% THE DONUT IS NO
 * LONGER TO SCALE. A 1-system Error slice and a 5-system Error slice in a
 * 400-system scope draw at the same width, and the slices that paid for them
 * draw slightly narrower than they are. That is a deliberate trade —
 * visible-but-not-to-scale beats invisible-and-exact for a state whose whole
 * job is to be noticed — and it is precisely why THE COUNT IN THE ROW IS THE
 * AUTHORITY and is always rendered as text, never encoded in area alone.
 *
 * ── THE SWATCH IS NEVER THE ONLY CUE, AND THIS IS NOT OPTIONAL ───────────
 * `index.css:358-367` records a standing accessibility WARN on this palette:
 * `--valve-error` against `--valve-open` is dE 7.6 under deuteranopia, inside
 * the 6-8 floor band rather than above it, which is legal ONLY WITH SECONDARY
 * ENCODING. The `<ValveStatus>` glyph and the text label beside every swatch
 * are therefore MANDATORY and must never be dropped to tighten this layout:
 * the palette's compliance is carried by them, not by the colour. Removing
 * either one makes this widget non-compliant, not merely plainer. The strip
 * above took the tick box and nothing else off the row — the glyph and the
 * label were deliberately left exactly where they were.
 *
 * (In the `contrast` theme the pair that actually bites is a different one:
 * --valve-open `oklch(0.85 0.25 140)` and --valve-closed `oklch(0.85 0.25 110)`
 * share lightness AND chroma and sit 30deg apart, so ON THE RING they read as
 * two greens. The glyph and the label carry it, which is exactly what they are
 * for, but the hue gap wants widening in `index.css` — which is not this
 * file's to change.)
 *
 * ── TOKENS, AND THE TRAP ─────────────────────────────────────────────────
 * A Tailwind colour utility naming a token this repo does not define falls
 * through to STOCK Tailwind and then freezes across all four themes — there is
 * no `--green-*` token at all, which is how >=3 invisible-in-dark defects got
 * in. Every colour used here was checked against all four blocks of
 * `src/index.css`: `:root`, `[data-theme='dark'], .dark`, `[data-theme='sand']`
 * and `[data-theme='contrast']`.
 *   --valve-open / --valve-closed / --valve-error  declared at :390-392,
 *     :1265-1267, :1430-1432, :1565-1567 and registered as Tailwind colours in
 *     `@theme inline` at :866-868, so `bg-valve-open` would resolve in all
 *     four. The arcs name the raw token instead, via a `fill` attribute, for
 *     reason 4 above; the swatches do the same so the two can never drift.
 *   --border, --foreground, --muted-foreground, --surface-card, --card,
 *     --primary, --ring  all four blocks, all pre-existing.
 * "No valve installed" gets NO FILL — a transparent wedge with a 1px --border
 * ring. Deliberate twice over: there is no themed neutral in this repo that
 * passes the chart validator's lightness band and chroma floor, and more
 * importantly "no valve" is a property of SYSTEMS while open/closed/error is a
 * property of VALVES. Offline likewise gets no fill: --muted-foreground ink
 * plus a glyph.
 *
 * ── HOUSE RULES OBSERVED ─────────────────────────────────────────────────
 * NO PORTAL. There is nothing left in this card that could portal — the
 * confirm sheet went with the action — but the rule stands and is restated so
 * it is not rediscovered: `ValveConfirmSheet.jsx:17-25`. This app draws in a
 * fixed 393x852 frame with `overflow: hidden` (`src/components/Phone.jsx`) and
 * a Radix portal escapes it by design, painting across the whole browser
 * window with the phone in the middle of it.
 *
 * NO `t()`. Only 2 of 36 v2 components use i18n and no v2 valve surface does;
 * a translated string here would be the only one in the stack.
 *
 * ── REPAINT — THE SAME THREE PATHS, FACING THE OTHER WAY ─────────────────
 * This card used to be the WRITER, so it PUBLISHED: `channel.postMessage` for
 * this tab, `pushBridge.publish` for other devices, and a local `setTick`
 * because a BroadcastChannel does not deliver a message to the object that
 * sent it (`PushNotifications.jsx:102`).
 *
 * IT IS NOT THE WRITER ANY MORE, so it cannot publish a change it does not
 * make; a surviving `publish()` call here would announce a write that never
 * happened. The three paths are therefore kept and INVERTED — this card is now
 * the LISTENER on the same three channels, which is what "the readout updates
 * after the dedicated screen commits" actually requires:
 *   - `channel` message on `BroadcastChannel('pulse2-push')` — the same-tab /
 *     same-machine wake. The screen's own channel object is a DIFFERENT object,
 *     so its `postMessage` does reach this one. Precedent:
 *     `useDataRefresh.js:7,30-33`, `pushSimFire.js:50-53`, `UserContext.jsx:47`.
 *   - the `storage` event — the CROSS-TAB wake, and the one that carries a
 *     cross-DEVICE push home: `pushBridge.publish` POSTs an envelope to ntfy.sh
 *     over HTTP (`pushBridge.js:130`) and never touches the local channel, so
 *     a relayed command lands as a store write that this listener hears.
 *     `useDataRefresh.js:15-18` is the same filter.
 *   - `setTick` — this card's OWN state, and it is not ceremony: `resolved`
 *     below is a `useMemo` keyed on `[systems, tick]`, and a bare re-render
 *     would hand back the cached, pre-command resolution. This is also why
 *     `useDataRefresh()` is not simply called instead: its tick is private to
 *     the hook, so it re-renders this card without invalidating that memo.
 *
 * ── PROPS ────────────────────────────────────────────────────────────────
 *   systems     Array of scoped systems. READ-ONLY — never mutated. Each is
 *               read only through `valveScope`, which wants
 *               `{ id, name, valve, comm | offline, lastSeen }`.
 *   scopeLabel  What the user sees in the header, e.g. "320 Summit Blvd" /
 *               "Acme Corp" / "All Accounts".
 *   className   Appended to the card shell.
 *
 *   scopeKind   ACCEPTED AND DELIBERATELY UNREAD. `HomeAllAccounts.jsx:589`
 *               derives it ('location' | 'account') from which half of the
 *               name match actually hit, and it existed for one consumer: the
 *               confirm sheet's "Every system at this location" / "...in this
 *               account" sentence. That sheet moved to the dedicated screen,
 *               which derives the same thing from the same route. The prop is
 *               left on the mount rather than ripped out of the page, because
 *               the derivation is correct, is covered by the page's own tests,
 *               and the screen may yet want it handed down. It is not
 *               destructured below so that it cannot be mistaken for live
 *               input.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import ValveStatus from '@/v2/components/ValveStatus'
import { VALVE_CATEGORIES, summariseValves } from '@/v2/components/valveScope'
import { effectiveValveState } from '@/data/valveCommandStore'

/* The same-tab wake. Module scope, one channel per module, exactly as
   `useDataRefresh.js:7` and `UserContext.jsx:47` do it. Guarded because the
   constructor does not exist in every environment this bundle is parsed in. */
const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pulse2-push') : null

/* Every channel event that COULD mean the data layer moved. Copied from
   `useDataRefresh.js:27-29` rather than narrowed to 'data-changed': a
   cross-device push arriving through the ntfy bridge is relayed as its RAW
   type and never wrapped in a 'data-changed' envelope, so a narrower set is a
   readout that silently stops updating on exactly the path that needed it. */
const REFRESH_TYPES = new Set(['data-changed', 'push', 'demo-reset', 'actor-changed'])

/* ── The deep link ────────────────────────────────────────────────────────
   The query key the dedicated screen is expected to read. See THE DEEP LINK
   in the header: defined here because the screen did not exist when this was
   written, and the one line to change if it disagrees. */
const STATE_PARAM = 'state'
const VALVES_ROUTE = '/valves'

/* react-router v6+ hands `useParams()` values back ALREADY DECODED, and
   `HomeAllAccounts.jsx:545` decodes again on top of that — harmless for every
   name in this dataset and the convention this page keeps, so it is kept here
   too so the two cannot disagree about what a route means. Guarded, which the
   page's version is not: `decodeURIComponent` THROWS on a lone '%', so a
   location named "50% Road" would take the card down rather than mis-link. */
function safeDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * The management screen's URL for this scope, optionally pre-filtered.
 *
 * `/valves` unscoped, `/valves/:locationName` scoped — mirroring
 * `/location/:locationName`, and ENCODED THE SAME WAY, so "320 Summit Blvd"
 * round-trips as `320%20Summit%20Blvd` rather than breaking the path on its
 * spaces.
 */
function valvesHref(locationParam, categoryKey) {
  const base = locationParam
    ? `${VALVES_ROUTE}/${encodeURIComponent(safeDecode(locationParam))}`
    : VALVES_ROUTE
  return categoryKey ? `${base}?${STATE_PARAM}=${encodeURIComponent(categoryKey)}` : base
}

/* ── Donut geometry ───────────────────────────────────────────────────────
   150x150 with the ring running outer r=75 to inner r=46.85 — the band the
   Figma donut on Home already draws (`HomeAllAccounts.jsx:276`), so the two
   rings read as the same object at the same size. */
const DONUT_PX = 150
const C = DONUT_PX / 2
const R_OUT = 75
const R_IN = 46.85

/* The floor, in degrees of the 360 ring. 6deg = 1.67% of the scope; at the
   band's mean radius (60.9px) that is ~6.4px of arc — small, but a shape
   rather than a hairline. See THE MINIMUM-ARC FLOOR in the header for what it
   costs and why the row count, not the arc, is the authority. */
const MIN_SWEEP_DEG = 6

/** Degrees clockwise from 12 o'clock -> a point on the circle. */
function polar(r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)]
}

const f = (n) => Number(n.toFixed(3))

/**
 * One ring segment as a closed path: outer arc clockwise, straight in, inner
 * arc back, close.
 *
 * A 360deg sweep is the special case every hand-rolled donut gets wrong — the
 * start and end points coincide, the arc degenerates, and the path collapses
 * to nothing, which is a BLANK CHART for the "every valve open" state, i.e.
 * the single most common state this card will ever draw. A full ring is drawn
 * instead as two circles under `fill-rule: evenodd`, which is the annulus.
 */
function arcPath(startDeg, sweepDeg) {
  if (sweepDeg >= 359.999) {
    return (
      `M ${C} ${f(C - R_OUT)} A ${R_OUT} ${R_OUT} 0 1 1 ${C} ${f(C + R_OUT)}` +
      ` A ${R_OUT} ${R_OUT} 0 1 1 ${C} ${f(C - R_OUT)} Z` +
      ` M ${C} ${f(C - R_IN)} A ${R_IN} ${R_IN} 0 1 0 ${C} ${f(C + R_IN)}` +
      ` A ${R_IN} ${R_IN} 0 1 0 ${C} ${f(C - R_IN)} Z`
    )
  }
  const end = startDeg + sweepDeg
  const large = sweepDeg > 180 ? 1 : 0
  const [x0, y0] = polar(R_OUT, startDeg)
  const [x1, y1] = polar(R_OUT, end)
  const [x2, y2] = polar(R_IN, end)
  const [x3, y3] = polar(R_IN, startDeg)
  return (
    `M ${f(x0)} ${f(y0)} A ${R_OUT} ${R_OUT} 0 ${large} 1 ${f(x1)} ${f(y1)}` +
    ` L ${f(x2)} ${f(y2)} A ${R_IN} ${R_IN} 0 ${large} 0 ${f(x3)} ${f(y3)} Z`
  )
}

/**
 * Counts -> sweeps in degrees, with the floor applied.
 *
 * Every non-zero count is lifted to MIN_SWEEP_DEG and the total debt is taken
 * from the slices that sit above the floor, in proportion to how far above it
 * they sit — so paying for a small slice can never push a payer below the
 * floor in turn. A ZERO count gets zero degrees and is not drawn at all: the
 * floor exists to stop a 1 from vanishing, never to invent a slice for a 0.
 *
 * `pay` is clamped to the pool. With four categories and a 6deg floor the pool
 * is at worst 360 - 4*6 = 336 against a debt of at most 3*6 = 18, so the clamp
 * cannot bind here; it is kept because a fifth category would tighten the
 * arithmetic and a ring that silently fails to close is worse than one that is
 * slightly off scale.
 */
function sweepsFor(counts) {
  const total = counts.reduce((a, b) => a + b, 0)
  if (total <= 0) return counts.map(() => 0)

  const out = counts.map((v) => (v / total) * 360)
  const lifted = out.map((d) => d > 0 && d < MIN_SWEEP_DEG)
  if (!lifted.some(Boolean)) return out

  let debt = 0
  for (let i = 0; i < out.length; i += 1) {
    if (lifted[i]) {
      debt += MIN_SWEEP_DEG - out[i]
      out[i] = MIN_SWEEP_DEG
    }
  }
  const excess = out.map((d, i) => (lifted[i] ? 0 : Math.max(0, d - MIN_SWEEP_DEG)))
  const pool = excess.reduce((a, b) => a + b, 0)
  if (pool <= 0) return out
  const pay = Math.min(debt, pool)
  for (let i = 0; i < out.length; i += 1) {
    if (excess[i] > 0) out[i] -= pay * (excess[i] / pool)
  }
  return out
}

/* Fill per category. `none` is the deliberate hole — see the TOKENS note. */
const FILL = {
  error: 'var(--valve-error)',
  open: 'var(--valve-open)',
  closed: 'var(--valve-closed)',
  none: 'none',
}

/* The glyph beside each swatch. `ValveStatus.jsx:112` is the product's own
   valve artwork, already drawn to Figma 197639:253443 for exactly these
   states, so this widget introduces no new iconography; its `no-valve` variant
   is the fourth key. These glyphs ARE the secondary encoding the palette's
   compliance depends on (index.css:358). */
const GLYPH = { error: 'error', open: 'open', closed: 'closed', none: 'no-valve' }

const LABEL_OF = Object.fromEntries(VALVE_CATEGORIES.map((c) => [c.key, c.label]))

/* Singular / plural without a formatter — there is no i18n on this surface and
   `Intl.PluralRules` for two English forms is ceremony. */
const plural = (n, one, many) => (n === 1 ? one : many)

/* The colour chip. `aria-hidden` because it says nothing the label beside it
   does not already say — and it is never the only cue (index.css:358). */
function Swatch({ categoryKey }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'size-[10px] shrink-0 rounded-full',
        categoryKey === 'none' && 'border border-solid border-border',
      )}
      style={categoryKey === 'none' ? undefined : { backgroundColor: FILL[categoryKey] }}
    />
  )
}

/* ── The donut ────────────────────────────────────────────────────────────
   `role="img"` with the whole readout in its label, and every path inert. The
   centre figure is NOT `tabular-nums`: tabular figures are for columns a
   reader scans down, and this is one centred number — proportional spacing
   reads better and is the design system's default. */
function Donut({ slices, centreCount, label }) {
  const sweeps = sweepsFor(slices.map((s) => s.count))
  /* Prefix sum without a running `let`: `react-hooks/immutability` treats a
     variable reassigned inside a render's map callback as an error, and with
     four slices the quadratic scan is free. */
  const drawn = slices.map((s, i) => ({
    ...s,
    start: sweeps.slice(0, i).reduce((a, b) => a + b, 0),
    sweep: sweeps[i],
  }))

  return (
    <div className="flex w-full shrink-0 items-center justify-center py-[6px]">
      <div className="relative" style={{ width: DONUT_PX, height: DONUT_PX }}>
        <svg
          width={DONUT_PX}
          height={DONUT_PX}
          viewBox={`0 0 ${DONUT_PX} ${DONUT_PX}`}
          fill="none"
          role="img"
          aria-label={label}
          focusable="false"
          className="block"
          data-name="valve-donut"
        >
          {drawn.map((s) =>
            s.sweep > 0 ? (
              <path
                key={s.key}
                d={arcPath(s.start, s.sweep)}
                fill={FILL[s.key]}
                fillRule="evenodd"
                stroke={s.key === 'none' ? 'var(--border)' : undefined}
                strokeWidth={s.key === 'none' ? 1 : undefined}
                /* Inert twice over: no hit target, and nothing for a reader to
                   land on. The svg's own label is the whole readout, and the
                   row below is the control. */
                className="pointer-events-none"
                aria-hidden="true"
                focusable="false"
                data-valve-slice={s.key}
              />
            ) : null,
          )}
        </svg>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        >
          <span className="font-sans text-[28px] font-semibold leading-[32px] text-foreground">
            {centreCount}
          </span>
          {/* NEW COPY. "systems", not "valves" — `valveScope.js:63-70` is
              explicit that one system can carry two valves, so every count on
              this card counts systems and says so. */}
          <span className="font-sans text-[12px] leading-[16px] text-muted-foreground">
            {plural(centreCount, 'system', 'systems')}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Chassis ──────────────────────────────────────────────────────────────
   The house card shell, copied from its siblings (`ActiveWaterEventsCard.jsx`
   :501, `EventsTimelineCard.jsx:296`, `InfoAccordion.jsx:139`).

   `w-full` AND NO INTRINSIC WIDTH, both pinned by
   `homeWidgetWidth.dom.test.jsx:80-82`: the Home stack is
   `flex flex-col items-start`, where a child without `w-full` sizes to its own
   content — which is how the consumption card came to RESIZE when the user
   changed its segment. A `w-[...]` here would beat `w-full` and reintroduce
   it.

   `px-6` — 24px, Tailwind step 6 — on the header AND on every body box, the
   equal inset `homeWidgetWidth.dom.test.jsx:106` exists to protect. A 16/24
   mix is the "positions look broken" report. */
const CARD = String.raw`bg-surface-card border border-solid border-card content-stretch flex flex-col items-start overflow-hidden relative rounded-[18px] shrink-0 w-full`

const FOCUS = 'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

function Header({ scopeLabel }) {
  return (
    <div
      className="flex w-full shrink-0 items-baseline justify-between gap-[12px] px-6 pb-[10px] pt-[16px]"
      data-name="valve-header"
    >
      {/* NEW COPY. "Valve status" is the phrase this product already uses for
          a valve readout (`ValveStatusCard`'s own title), kept so the widget
          and the System page name the same thing the same way. It is also now
          literally true of this card and of nothing else about it. */}
      <h3 className="font-sans text-[16px] font-semibold leading-[22px] text-foreground">
        Valve status
      </h3>
      {scopeLabel ? (
        <span className="min-w-0 truncate font-sans text-[13px] leading-[18px] text-muted-foreground">
          {scopeLabel}
        </span>
      ) : null}
    </div>
  )
}

/* ── One category row ─────────────────────────────────────────────────────
   48px minimum, and the ROW is the control — nothing smaller than the row is
   ever the hit target. The row NAVIGATES: it opens the dedicated management
   screen already filtered to this category, so "Valve Error · 2" lands on the
   two faulted ones rather than on a list to hunt through. See THE CHEVRON LEFT,
   AND THE CHEVRON IS BACK in the header for why the `>` is here again.

   EVERY ROW CARRIES ITS OWN OFFLINE SUB-COUNT. "How many of the OPEN valves
   are offline" is a cross-tab: a 2-D encoding would make the reader integrate
   it by eye, and as text beside the count it is free.

   The count INCLUDES the offline systems, by design: an offline system holds
   its last-known state and is genuinely part of the scope
   (`valveScope.js:53-59`). Only the DENOMINATOR line's "can be commanded"
   excludes them. */
function CategoryRow({ categoryKey, label, bucket, onOpen }) {
  const navigable = categoryKey !== 'none'

  const common = cn(
    'flex w-full items-center gap-[10px] px-0 text-left',
    FOCUS,
    navigable ? 'min-h-[48px] cursor-pointer' : 'min-h-[40px] cursor-default',
  )

  const body = (
    <>
      <Swatch categoryKey={categoryKey} />
      {/* MANDATORY SECONDARY ENCODING — index.css:358. Neither this glyph nor
          the label beside it may be dropped to tighten the row: --valve-error
          against --valve-open is dE 7.6 under deuteranopia, which is legal
          only with them. The tick box that used to sit left of this swatch is
          gone; the glyph and the label are not going anywhere. */}
      <ValveStatus state={GLYPH[categoryKey]} size={16} className="shrink-0" />
      <span
        className={cn(
          'min-w-0 flex-1 truncate font-sans text-[14px] leading-[20px]',
          navigable ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'shrink-0 font-sans text-[14px] font-semibold leading-[20px]',
          navigable ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {bucket.total}
      </span>
      {bucket.offline > 0 ? (
        /* Offline gets NO FILL — --muted-foreground ink plus a glyph. It is a
           reachability fact, not a valve state, and giving it a colour of its
           own would file it under the same visual system as the three states.
           NEW COPY: "{n} offline". */
        <span className="flex shrink-0 items-center gap-[3px] font-sans text-[12px] leading-[16px] text-muted-foreground">
          <WifiOff size={12} aria-hidden="true" />
          {`${bucket.offline} offline`}
        </span>
      ) : null}
      {navigable ? (
        <ChevronRight
          size={16}
          aria-hidden="true"
          className="shrink-0 text-muted-foreground"
          data-valve-chevron={categoryKey}
        />
      ) : null}
    </>
  )

  if (!navigable) {
    /* `aria-disabled`, NOT the `disabled` attribute. A disabled control is
       skipped outright by some assistive tech, so the user never learns WHY it
       cannot be used — which on this row is the single most useful thing it
       has to say. This stays focusable and announced, with the reason inside
       its accessible name; the press handler is simply not wired, and it gets
       NO CHEVRON because it has nowhere to go. */
    return (
      <li className="border-b border-solid border-border last:border-b-0">
        <button
          type="button"
          aria-disabled="true"
          /* NEW COPY. The reason rides in the accessible NAME, because the
             name is the only thing a screen-reader user gets before deciding
             whether to press. */
          aria-label={`${label}, ${bucket.total} ${plural(bucket.total, 'system', 'systems')}. Nothing to manage — there is no valve here to command.`}
          className={common}
          data-valve-row={categoryKey}
        >
          {body}
        </button>
      </li>
    )
  }

  return (
    <li className="border-b border-solid border-border last:border-b-0">
      <button
        type="button"
        onClick={() => onOpen(categoryKey)}
        /* NEW COPY. The destination is named in the accessible name, because a
           chevron is a sighted-only promise. The count stays in it so the row
           still answers "how many" when it is read rather than seen. */
        aria-label={`${label}: ${bucket.total} ${plural(bucket.total, 'system', 'systems')}${
          bucket.offline > 0 ? `, ${bucket.offline} offline` : ''
        }. Manage these valves.`}
        className={common}
        data-valve-row={categoryKey}
      >
        {body}
      </button>
    </li>
  )
}

/* ── One category, whole scope ────────────────────────────────────────────
   Every system in the same state. One series needs no legend — the headline
   names it — so there is nothing to choose between. The donut above is a full
   ring and the sentence carries the readout.

   The whole-scope-offline case lands here when it is also single-state, and it
   is drawn AT FULL COLOUR: last-known state is real information, and greying
   it out to signal unreachability is the bigger lie. The reachability line
   below says so in words instead.

   No action and no deep link here: with one category the entry control at the
   foot of the card already lands on the only filter there is. */
function SoloBody({ categoryKey, count, offline }) {
  return (
    <div className="mt-[6px] w-full border-t border-solid border-border pt-[12px]">
      <div className="flex items-center gap-[10px]">
        <Swatch categoryKey={categoryKey} />
        <ValveStatus state={GLYPH[categoryKey]} size={16} className="shrink-0" />
        {/* NEW COPY. The headline as a SENTENCE, because with one series there
            is no legend to read a label against. */}
        <p className="min-w-0 flex-1 font-sans text-[15px] leading-[20px] text-foreground">
          {categoryKey === 'none'
            ? `All ${count} ${plural(count, 'system is', 'systems are')} metering-only.`
            : `All ${count} ${plural(count, 'system is', 'systems are')} ${LABEL_OF[categoryKey]}.`}
        </p>
      </div>
      {offline > 0 ? (
        /* NEW COPY. Says the colour above is last-known, not live. */
        <p className="mt-[6px] flex items-center gap-[4px] font-sans text-[12px] leading-[16px] text-muted-foreground">
          <WifiOff size={12} aria-hidden="true" />
          {`${offline} of ${plural(count, 'it is', 'them are')} offline · last-known state shown`}
        </p>
      ) : null}
    </div>
  )
}

/* ── The way in ───────────────────────────────────────────────────────────
   The card's one control, and the only thing on it that is not a readout. It
   lives under its own rule at the foot of the card, on the same px-6 inset as
   the header and the body.

   `<Button>` with the DEFAULT variant. It is navigation now, not an actuation:
   `destructive` is reserved for the control that actually shuts water off, and
   that control is on the screen this opens. A destructive-red button that only
   changes route would habituate the user to the colour that matters.

   NEW COPY: "Manage valves" — awaiting the owner's approval like every other
   string on this card. */
function EntryBar({ onOpen }) {
  return (
    <div
      className="w-full shrink-0 border-t border-solid border-border px-6 py-[12px]"
      data-name="valve-entry"
    >
      <Button
        type="button"
        onClick={() => onOpen(null)}
        className="h-[44px] w-full rounded-xl text-sm font-semibold"
        data-valve-entry="true"
      >
        Manage valves
      </Button>
    </div>
  )
}

export default function ValveManagementCard({ systems = [], scopeLabel = '', className }) {
  const navigate = useNavigate()
  /* THE ROUTE IS THE SCOPE — `HomeAllAccounts.jsx:502-515` states that model
     for this whole page, so the card reads the scope off the route exactly as
     the page does rather than taking a handler prop. That keeps the page's
     mount untouched and keeps one answer to "what scope am I in".
     `scopeLabel` is deliberately NOT used to build the URL: on the unscoped
     routes it is the display string "All Accounts", which is not a location. */
  const { locationName } = useParams()

  const [tick, setTick] = useState(0)

  /* Repaint. See REPAINT in the header: three paths, all of them inbound now,
     and the tick is what invalidates the memo below. */
  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    const onMessage = (ev) => {
      if (ev?.data?.type && REFRESH_TYPES.has(ev.data.type)) bump()
    }
    const onStorage = (e) => {
      if (!e.key || e.key.startsWith('pulse2-')) bump()
    }
    channel?.addEventListener('message', onMessage)
    window.addEventListener('storage', onStorage)
    return () => {
      channel?.removeEventListener('message', onMessage)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const openScreen = (categoryKey) => navigate(valvesHref(locationName, categoryKey))

  /* Commanded state wins over the system's own `valve`, resolved HERE rather
     than relied on from the caller: `valveScope.js:21-25` says in as many words
     that a caller wanting commanded state honoured resolves it FIRST and hands
     the resolved systems in — this is that call site. It matters MORE now than
     it did when this card did the writing: the write happens on another screen,
     so without this the readout would report pre-command state after the user
     came back. `systems` is never mutated: every entry is a fresh object.
     `tick` is in the deps so a write elsewhere re-resolves, and is read for no
     other reason. */
  const resolved = useMemo(() => {
    void tick
    return (Array.isArray(systems) ? systems : [])
      .filter((s) => !!s && typeof s === 'object')
      .map((s) => ({ ...s, valve: effectiveValveState(s) }))
  }, [systems, tick])

  const summary = useMemo(() => summariseValves(resolved), [resolved])

  /* ── State 1: nothing in scope. Render nothing at all. ────────────────── */
  if (summary.total === 0) return null

  const { byCategory, valveTotal, actionableTotal, offlineTotal, total } = summary
  const rows = VALVE_CATEGORIES.filter((c) => byCategory[c.key].total > 0)

  /* ── State 2: systems, but ZERO valves anywhere. ──────────────────────── */
  if (valveTotal === 0) {
    return (
      <div className={cn(CARD, className)} data-name="valve-management">
        <Header scopeLabel={scopeLabel} />
        <div className="w-full px-6 pb-[18px]" data-name="valve-body">
          {/* NEW COPY, both lines. One honest sentence and its denominator —
              no donut of a single empty category, no rows, AND NO ENTRY
              CONTROL: there is nothing on the management screen for this scope
              to manage, so offering a way in would be a dead end with a
              chevron on it. Reachable from the live drawer today (Southbridge
              Health; 45 Cedarline Way, 510 Lakeview Dr, 30 Dogwood Dr), not an
              edge case. */}
          <p className="font-sans text-[15px] leading-[20px] text-foreground">
            No valves in this scope.
          </p>
          <p className="mt-[4px] font-sans text-[13px] leading-[18px] text-muted-foreground">
            {`All ${total} ${plural(total, 'system is', 'systems are')} metering-only.`}
          </p>
        </div>
      </div>
    )
  }

  const slices = VALVE_CATEGORIES.map((c) => ({ key: c.key, count: byCategory[c.key].total }))
  /* The donut's whole readout, as text, for the one `role="img"` that carries
     it. The arcs say nothing; this does. */
  const donutLabel =
    `Valve status across ${total} ${plural(total, 'system', 'systems')}: ` +
    rows
      .map((c) => {
        const b = byCategory[c.key]
        return b.offline > 0
          ? `${b.total} ${c.label}, ${b.offline} of them offline`
          : `${b.total} ${c.label}`
      })
      .join('. ') +
    '.'

  /* n = 1. A part-to-whole of one is a full ring that says nothing the single
     row does not say better, so the donut is dropped and the row stands alone.
     (A lone VALVE among valveless systems is a different case and keeps its
     donut: "1 with a valve, 9 without" is a real proportion, and `total > 1`
     is exactly that distinction.) */
  const drawDonut = total > 1

  /* Exactly one non-empty category: one series needs no legend — the headline
     names it — so the rows collapse to a sentence. */
  const soloKey = rows.length === 1 ? rows[0].key : null

  return (
    <div className={cn(CARD, className)} data-name="valve-management">
      <Header scopeLabel={scopeLabel} />

      <div className="w-full px-6 pb-[18px]" data-name="valve-body">
        {drawDonut ? <Donut slices={slices} centreCount={total} label={donutLabel} /> : null}

        {soloKey ? (
          <SoloBody
            categoryKey={soloKey}
            count={byCategory[soloKey].total}
            offline={byCategory[soloKey].offline}
          />
        ) : (
          <>
            <div className="mt-[6px] w-full border-t border-solid border-border" />
            <ul className="w-full">
              {rows.map((c) => (
                <CategoryRow
                  key={c.key}
                  categoryKey={c.key}
                  label={c.label}
                  bucket={byCategory[c.key]}
                  onOpen={openScreen}
                />
              ))}
            </ul>
            <div className="w-full border-t border-solid border-border" />

            {/* THE HONEST DENOMINATOR. NEW COPY. Three numbers that are
                routinely confused with each other and with the centre total,
                stated side by side so none of them can stand in for another.
                This line is the last survivor of the owner's offline
                requirement on this card, and it is why a readout with no
                buttons is still worth drawing. */}
            <p
              className="mt-[10px] font-sans text-[12px] leading-[16px] text-muted-foreground"
              /* Addressable, because the row counts abut it in `textContent`:
                 a "No valve installed" count of 2 immediately followed by
                 "3 systems with a valve" reads as "23 systems with a valve" to
                 any regex run over the card as a whole, and a test that parses
                 the wrong number still passes while asserting nothing. */
              data-name="valve-denominator"
            >
              {`${valveTotal} ${plural(valveTotal, 'system', 'systems')} with a valve`}
              {` · ${actionableTotal} can be commanded`}
              {offlineTotal > 0 ? ` · ${offlineTotal} offline` : ''}
            </p>
          </>
        )}
      </div>

      <EntryBar onOpen={openScreen} />
    </div>
  )
}
