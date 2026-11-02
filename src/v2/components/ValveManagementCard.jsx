/**
 * ValveManagementCard — a READ-ONLY readout of valve states across a scope,
 * plus the way in to the screen that manages them. Mounted at the LOCATION
 * level and the ACCOUNT level (`HomeAllAccounts.jsx:1358`).
 *
 * ══ 2026-11-02 — THE REDESIGN. READ THIS BEFORE CHANGING ANYTHING BELOW. ══
 *
 * The owner, 2026-11-02, verbatim:
 *   "the widget for valves looks too messy. Too much information, it's not
 *    organized well, it's too big... It doesn't feel like the ShadCN
 *    components... It needs to be much more clear, much more easy to
 *    understand to open, close the valves, to see statuses."
 *
 * He authorised implementation without further permission. What that bought,
 * measured rather than asserted:
 *   · the card was ~520px of the 808px usable frame — 64% of it;
 *   · it used ONE shadcn component in 906 lines;
 *   · 6 distinct `text-[Npx]` sizes and 12 distinct arbitrary spacing values.
 * It is now ~317px (the arithmetic is at the foot of this header), four shadcn
 * primitives deep, and on the 4px spacing scale.
 *
 * ── 1. THE DONUT IS GONE. THIS REVERSES AN EXPLICIT REQUEST BY THE OWNER. ──
 *
 * THE OWNER ASKED FOR A PIE CHART BY NAME. This file's previous header said so
 * — "The owner asked for a pie chart and gets one" — and the donut was built
 * to that instruction. Removing it is a DELIBERATE REVERSAL of an explicit
 * earlier request, taken under the "implement without permission"
 * authorisation above, and it is recorded here rather than quietly done so he
 * can overrule it cheaply. THE EVIDENCE, all of it from this file's own
 * measurements before the change:
 *
 *   a. IT WAS 162px — 31% OF A CARD WHOSE HEADLINE DEFECT IS ITS HEIGHT. The
 *      single biggest object on the card, spent on four numbers.
 *   b. IT WAS NOT TO SCALE, and the file admitted it: "below MIN_SWEEP_DEG/360
 *      = 1.7% THE DONUT IS NO LONGER TO SCALE. A 1-system Error slice and a
 *      5-system Error slice in a 400-system scope draw at the same width."
 *      Its own conclusion was "THE COUNT IN THE ROW IS THE AUTHORITY" — which
 *      is Few's degeneration argument in the file's own words: a donut that
 *      has to print its counts beside it has become "an awkwardly arranged
 *      equivalent of a table of labels and values". The table was already
 *      there. The donut was the decoration on top of it.
 *   c. IT WAS NOT TAPPABLE, and could not be made so. Measured here: at a
 *      361px card the ring band is ~28px, so NO arc reaches a 44px target
 *      radially at ANY share, and along the arc a slice needs >=11.5% before
 *      its length reaches 44px. Every arc therefore carried
 *      `pointer-events-none` + `aria-hidden`. 162px of pixels that could not
 *      be touched and said nothing to a screen reader.
 *   d. IT DID NOT ENCODE OFFLINE AT ALL — the one dimension this whole feature
 *      exists to surface ("we have a kind of an offline devices that Valve
 *      cannot be shut off", below). Offline is orthogonal to open/closed/error
 *      and cannot be a fifth wedge without lying about the total.
 *   e. SHRINKING IT WAS THE WORST AVAILABLE OPTION. A thinner ring is the
 *      geometry measured as materially harder to read, and smaller slices are
 *      both less discriminable AND less tappable. There was no smaller donut
 *      that fixed (b), (c) or (d).
 *
 * The replacement is warranted by the same sources the repo already follows:
 * the FT's visual vocabulary — "If the reader's interest is solely in the size
 * of the components, consider a magnitude-type chart instead"; the UK Analysis
 * Function — "Do not use a key, label the categories themselves" and "Aim for
 * a maximum of four categories within each stack", with the attention
 * categories at the ENDS because first and last are easiest to compare.
 *
 * HOW TO GET A RING BACK, IF HE WANTS ONE. Everything the donut needed is
 * still here: `slices` below is the same `[{key, count}]` array it consumed.
 * Restore `arcPath` / `sweepsFor` / `<Donut>` from git history
 * (`git log -p -- src/v2/components/ValveManagementCard.jsx`, the revision
 * before this one) and render `<Donut slices={slices} centreCount={total}
 * label={chartLabel} />` where `<SegmentedBar>` is rendered now. Nothing else
 * has to change — the stat tiles, the deep links and the denominator are
 * independent of the chart. Expect the card back at ~480px, and expect (b)
 * through (d) back with it.
 *
 * ── 2. WHAT REPLACED IT, AND WHY THE CHART IS NOW A CONTROL ───────────────
 *
 * ONE SEGMENTED BAR + A STAT ROW.
 *
 *   · `<SegmentedBar>` — full width, 10px tall, four segments, in
 *     VALVE_CATEGORIES order so the attention category (`error`) is at one end
 *     and the not-a-state category (`none`) at the other. NO LEGEND: the stat
 *     tiles under it carry the same chips in the same order, which is the
 *     "label the categories themselves" rule. It is DECORATIVE and says so —
 *     `aria-hidden`, `pointer-events-none`, no text of its own. Whatever
 *     replaces a chart here must not LOOK like a control unless it IS one;
 *     this one is not, so it does not.
 *   · `<StatTile>` x4 — the count as a large numeral, a colour chip, the
 *     category word, and the per-category offline sub-count. EACH ONE IS A
 *     BUTTON that opens the management screen already filtered to that
 *     category. Apple Home does exactly this ("Lights · 3 on"), where the
 *     count is both the readout and the filter entry.
 *
 * THAT IS THE WHOLE POINT: the chart is a CONTROL now instead of a decoration
 * — the single thing the donut could never be, at any size, for the geometric
 * reason in (c) above.
 *
 * THE BAR IS NOT EXACTLY TO SCALE EITHER, AND THIS IS CHEAPER AND HONEST. A
 * non-zero segment is floored at `min-w-1` (4px) so a 1-of-400 count cannot
 * round to invisible. The floor is applied by FLEXBOX, not by 25 lines of
 * sweep arithmetic: each segment is `basis-0` with `flexGrow: count`, so the
 * widths are exactly proportional and the min-width is taken out of the
 * others by the layout engine. The old `sweepsFor()` debt-redistribution
 * algorithm is deleted along with the geometry it served.
 *
 * ── 3. ONE STATE, ONE COLOUR CUE ──────────────────────────────────────────
 * Every row used to draw a `--valve-*` swatch ~6px from a `ValveStatus` glyph,
 * and for the SAME state they disagreed: open = green dot + BLUE glyph;
 * closed = blue dot + GREY glyph; error = pink dot + RED glyph. Worse,
 * `index.css:376-381` explicitly REJECTED that red (#fb2c36) as the valve
 * error colour — against the open green it measures dE 2.3 under deuteranopia
 * — so the palette's accessibility argument was being defeated six pixels from
 * where it was made.
 *
 * `<ValveStateReadout>` / `<ValveSwatch>` (`ValveStateReadout.jsx`) now carry
 * the one cue, and the WORD is the secondary encoding that keeps the palette
 * legal under `index.css:358-367` (dE 7.6, "legal ONLY WITH SECONDARY
 * ENCODING"). The word is not optional and there is no prop that removes it.
 * `ValveStatus.jsx` IS NOT TOUCHED — it is still the per-system card's
 * artwork and is out of this redesign's scope.
 *
 * DELETED FROM THIS FILE AND IMPORTED INSTEAD: the local `FILL`, `GLYPH`,
 * `LABEL_OF` and `Swatch` (the old `:424-452`). The old `Swatch` painted with
 * an inline `style={{backgroundColor}}`, which no theme can reach; the atom
 * uses the `bg-valve-*` token utilities (`index.css:866-868`) and therefore
 * follows all four.
 *
 * ── 4. THE SHADCN TELLS, SO THIS READS NATIVE ─────────────────────────────
 * `text-sm` body, `text-2xl` for the stat numerals only (shadcn's own stat
 * blocks do exactly that), and NO `text-[Npx]` anywhere. Secondary text is
 * always `text-muted-foreground` — never an opacity hack, never a grey
 * literal. The 4px scale: `gap-1 / gap-1.5 / gap-2 / px-6 / py-3 / pt-4`.
 * `rounded-md` on the tiles and the button, `rounded-full` on the chips and
 * the bar segments. `data-slot` on every part, inherited from the primitives.
 *
 * FOUR shadcn primitives now, where there was one:
 *   `<Item asChild size="sm">`   the stat tile's chassis — radius, border box,
 *                                `transition-colors`, `text-sm` and the
 *                                house focus ring, none of it hand-rolled.
 *                                Only the SIZE variant is overridden
 *                                (`flex-col items-start gap-1 px-2 py-1`),
 *                                because a stat tile stacks where a list row
 *                                does not.
 *   `<Separator>`                the rule above the entry bar, replacing a
 *                                hand-rolled `border-t`.
 *   `<Button>`                   unchanged, and still the DEFAULT variant.
 *   `<ValveStateReadout>` / `<ValveSwatch>`  the state atom.
 *
 * WHY NOT `<ItemGroup>` AND `<ItemSeparator>`. They are the right wrapper for
 * a vertical LIST of rows, and this card no longer has one: four stacked rows
 * is 195px where a 2x2 grid of tiles is 132px, and height is the defect under
 * repair. `ItemGroup` is `role="list" flex flex-col`; forcing a grid through
 * it would mean overriding both of its two declarations AND putting a
 * `<button>` directly inside a `role="list"`, which is invalid. A plain
 * `<ul>/<li>` grid with `<Item asChild>` on the tile keeps the semantics
 * correct and still takes the chassis from the primitive. The management
 * SCREEN is where `ItemGroup` + `ItemSeparator` belong; that file is not this
 * one's to write.
 *
 * WHY THE CHASSIS IS NOT `<Card>`. `card.jsx:40-68` settled this already and
 * the reasoning is unchanged: this app has TWO card surfaces — `<Card>` is
 * `--card` (white) with `rounded-2xl` and a two-layer shadow, the house
 * chassis is `--surface-card` (#fafbfc) with `rounded-[18px]` and no shadow.
 * Every one of this card's five stack neighbours is the house chassis.
 * Switching one of six would repaint it against the other five and move
 * pixels, which is a worse "doesn't feel like the ShadCN components" than the
 * radius it would fix. `rounded-[18px]` and the absent shadow are therefore
 * the two arbitrary values that stay, deliberately, and only on the shell.
 *
 * ── THE CHEVRON, THIRD TIME ───────────────────────────────────────────────
 * It was removed once (rows toggled a tick box, so a `>` promised a drill-down
 * that did not exist), restored when the rows became navigation, and it STAYS
 * now for the same reason it was restored: the tiles navigate, there is a
 * destination, and a tappable number with no affordance is the one way the
 * "chart is a control" win above could be lost. It is on exactly the three
 * tiles that navigate.
 *
 * ══ WHAT CAME INTO THE REDESIGN UNCHANGED (Rule 0) ═══════════════════════
 *
 * ── THIS CARD DOES NOT ACT, AND THAT IS THE OWNER'S INSTRUCTION ───────────
 *   "i dont like the way its built. the widget needs to be display only for
 *    managing valve i want to open a dedicated screen so user can
 *    select/deselect specific valves can filter per location / etc. main
 *    widget is display only"
 * Tick boxes, action bar, `BulkValveConfirmSheet`, result panel, retry and
 * `recordBulkValveCommand` left on 2026-11-02 for
 * `src/v2/pages/ValveManagementScreen.jsx`, reached by the routes this card
 * links to:
 *     /valves                 fleet / unscoped
 *     /valves/:locationName   scoped, mirroring /location/:locationName
 * If those routes are dead, THAT is the regression — not this card.
 * `.claude/skills/v2-page-parity/SKILL.md:12-21` (Rule 0) forbids removing
 * working functionality without the owner's explicit permission; the message
 * above is the permission, for this card only.
 *
 * ── THE OFFLINE REQUIREMENT, WHICH IS WHY A BUTTONLESS READOUT EARNS ITS SEAT
 *   "we have a kind of an offline devices that Valve cannot be shut off. So we
 *    need to explain the user this situation somehow and to not let him think
 *    that this Valve will take place on this operation that he wants to."
 * Two of its three sites went to the screen with the action. THE THIRD IS HERE
 * AND IS NOT NEGOTIABLE:
 *   · the TILE count INCLUDES offline systems and says so beside itself
 *     ("5 · 1 offline") — an offline system is still at its last-known state
 *     and still part of the scope;
 *   · the DENOMINATOR LINE states, side by side, how many systems carry a
 *     valve, how many can actually be commanded, and how many are offline. The
 *     gap between the first two numbers is the whole warning.
 * OFFLINE IS DELIBERATELY OUTSIDE THE FOUR BAR SEGMENTS. It is an orthogonal
 * dimension — an offline system is ALSO open, closed or in error — so folding
 * it in as a fifth segment would double-count the scope and is a dishonest
 * merge. It is a muted line instead, which is the only honest place for it.
 *
 * ── WHAT THIS COMPONENT IS NOT ALLOWED TO KNOW ───────────────────────────
 * It derives NOTHING about valves. `valveScope.js` is the single source of
 * what a state means; this file calls `summariseValves` and renders the
 * answer. A second copy of that rule living in a component is the exact defect
 * that module was extracted to prevent (`valveScope.js:12-18`).
 *
 * ── THE DEEP LINK, AND A CAVEAT ──────────────────────────────────────────
 * Tapping a stat tile opens the screen ALREADY FILTERED to that category,
 * passed as `?state=<VALVE_CATEGORIES key>` — `error` | `open` | `closed`.
 * The key, not the label: the label is Figma's English and the key is the
 * contract `valveScope.js` already publishes to every other caller.
 *
 * RECONCILED 2026-11-02, AND THE RECORD OF WHAT WAS WRONG IS KEPT. This card
 * was written while `ValveManagementScreen.jsx` did not exist on disk, so
 * `STATE_PARAM` was DEFINED here rather than matched against it. When the
 * screen first landed it imported `useLocation` for `key` only and never read
 * `location.search`, so the deep link arrived at the right SCOPE and the wrong
 * FILTER — `/valves/320%20Summit%20Blvd?state=open` rendered the identical
 * list with its "All" chip still selected. The screen's redesign closed that
 * in the same pass as this one: it now reads the param
 * (`ValveManagementScreen.jsx:408`, `new URLSearchParams(search).get('state')`)
 * and re-seeds on every change of `location.search`. The two ends of this
 * contract are therefore agreed as of this commit and NOT BY INFERENCE — the
 * read was checked in the file, and `valveWidgetMount.dom.test.jsx` drives the
 * press and asserts the resulting URL.
 * IF THE SCREEN EVER PICKS A DIFFERENT KEY, change `STATE_PARAM` below — never
 * the four category keys, which are `valveScope.js`'s published contract.
 *
 * ── "No valve installed" IS PRESENT, NOT ABSENT ──────────────────────────
 * It gets a tile, no chevron and no navigation: there is nothing to manage
 * there and the dedicated screen cannot act on it. It stays
 * `aria-disabled="true"` — never the `disabled` attribute, which some
 * assistive tech skips outright so the user never learns WHY — with the reason
 * inside its accessible name.
 *
 * ── TOKENS, AND THE TRAP ─────────────────────────────────────────────────
 * A Tailwind colour utility naming a token this repo does not define falls
 * through to STOCK Tailwind and then freezes across all four themes — there is
 * no `--green-*` token at all, which is how >=3 invisible-in-dark defects got
 * in. Every colour here was checked against all four blocks of `src/index.css`:
 * `:root`, `[data-theme='dark'], .dark`, `[data-theme='sand']`,
 * `[data-theme='contrast']`.
 *   --valve-open / --valve-closed / --valve-error  :390-392, :1265-1267,
 *     :1430-1432, :1565-1567, registered in `@theme inline` at :866-868, so
 *     `bg-valve-*` resolves in all four. The CHIPS get theirs from
 *     `ValveStateReadout`; the BAR SEGMENTS name the same three utilities
 *     locally (see `SEGMENT_FILL`).
 *   --border, --foreground, --muted-foreground, --surface-card, --card,
 *     --primary, --accent, --ring  all four blocks, all pre-existing.
 * `none` GETS NO FILL anywhere — a hollow chip and a 1px `--border` outline on
 * the bar. Deliberate twice over: there is no themed neutral that passes the
 * chart validator's lightness band and chroma floor (under `contrast` every
 * neutral is saturated, so a filled `bg-border` chip came out orange), and
 * "no valve" is a property of SYSTEMS while open/closed/error is a property of
 * VALVES.
 *
 * ── HOUSE RULES OBSERVED ─────────────────────────────────────────────────
 * NO PORTAL. `ValveConfirmSheet.jsx:17-25`: this app draws in a fixed 393x852
 * frame with `overflow: hidden` (`src/components/Phone.jsx`) and a Radix
 * portal escapes it by design. Nothing here portals — `<Separator>` is Radix
 * `Separator.Root`, which is inline, and `<Item asChild>` is `Slot.Root`.
 * NO `t()`. Only 2 of 36 v2 components use i18n and no v2 valve surface does.
 * NO NEW DEPENDENCIES.
 *
 * ── REPAINT — THREE INBOUND PATHS ────────────────────────────────────────
 * This card used to be the WRITER and PUBLISHED on three channels. It is the
 * LISTENER on the same three now, which is what "the readout updates after the
 * dedicated screen commits" actually requires:
 *   - `channel` message on `BroadcastChannel('pulse2-push')` — the same-tab /
 *     same-machine wake. The screen's channel object is a DIFFERENT object, so
 *     its `postMessage` does reach this one (`PushNotifications.jsx:102`).
 *     Precedent: `useDataRefresh.js:7,30-33`, `UserContext.jsx:47`.
 *   - the `storage` event — the CROSS-TAB wake, and the one that carries a
 *     cross-DEVICE push home: `pushBridge.publish` POSTs to ntfy.sh
 *     (`pushBridge.js:130`) and never touches the local channel, so a relayed
 *     command lands as a store write this listener hears.
 *   - `setTick` — this card's OWN state. `resolved` is a `useMemo` keyed on
 *     `[systems, tick]`, and a bare re-render would hand back the cached,
 *     pre-command resolution. `useDataRefresh()` cannot substitute: its tick is
 *     private to the hook, so it re-renders without invalidating that memo.
 *
 * ── PROPS ────────────────────────────────────────────────────────────────
 *   systems     Array of scoped systems. READ-ONLY — never mutated. Each is
 *               read only through `valveScope`, which wants
 *               `{ id, name, valve, comm | offline, lastSeen }`.
 *   scopeLabel  What the user sees in the header, e.g. "320 Summit Blvd" /
 *               "Acme Corp" / "All Accounts".
 *   className   Appended to the card shell.
 *   scopeKind   ACCEPTED AND DELIBERATELY UNREAD. `HomeAllAccounts.jsx:589`
 *               derives it ('location' | 'account') and it existed for one
 *               consumer: the confirm sheet's "Every system at this location"
 *               sentence. That sheet moved to the dedicated screen, which
 *               derives the same thing from the same route. It is not
 *               destructured below so it cannot be mistaken for live input.
 *
 * ── THE HEIGHT, AS ARITHMETIC. NOT MEASURED — THERE IS NO BROWSER HERE. ───
 * Summed from the class values below, worst case (all four categories present,
 * so the stat grid is two rows, and the denominator line wrapping to two):
 *     card border (1 top + 1 bottom)                            2
 *     header      pt-4 16 + text-sm leading-5 20 + pb-2  8     44
 *     bar         h-2.5                                        10
 *     stat grid   mt-3 12 + 2 rows x min-h-14 56 + gap-2  8   132
 *     denominator mt-3 12 + 2 x leading-5 20                   52
 *     body        pb-4                                         16
 *     separator                                                 1
 *     entry bar   py-3 12 + Button h-9 36 + py-3 12            60
 *                                                            ----
 *                                                             317px
 * Against the ~520px measured before this change, in an 808px usable frame:
 * 64% -> 39%, a 39% cut. The brief asked for "roughly half"; the remaining
 * ~55px of difference is the full-width "Manage valves" CTA, and demoting it
 * to a small header action would reach ~257px. That is a product decision
 * about the card's one control, not a layout decision, so it is the owner's
 * and it is not taken here.
 * happy-dom has no layout engine — `getBoundingClientRect()` returns zeros —
 * so NOTHING in the tests asserts this number and nothing here claims it was
 * seen. It is arithmetic over class values and should be checked in a browser.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Item } from '@/components/ui/item'
import { Separator } from '@/components/ui/separator'
import { ValveStateReadout, ValveSwatch } from '@/v2/components/ValveStateReadout'
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
   in the header: the one line to change if the screen disagrees. */
const STATE_PARAM = 'state'
const VALVES_ROUTE = '/valves'

/* The design's word for a category key. NOT a second `LABEL_OF` map — the old
   one was deleted with the rest of the local palette; this is a lookup into
   `VALVE_CATEGORIES`, which owns the vocabulary verbatim from Figma board
   199535:96542 (`Valve Error`, `Open`, `Closed`, `No valve installed`). The
   CHIP+WORD pair always comes from `<ValveStateReadout>`; this exists only for
   the two places that need the bare word inside a sentence. */
const labelOf = (key) => VALVE_CATEGORIES.find((c) => c.key === key)?.label ?? ''

/* Singular / plural without a formatter — there is no i18n on this surface and
   `Intl.PluralRules` for two English forms is ceremony. */
const plural = (n, one, many) => (n === 1 ? one : many)

/* Fill per BAR SEGMENT, as TOKEN UTILITIES — never an inline `style`, which is
   the defect the old local `FILL` map had (no theme can reach a style
   attribute). Three keys, not four: `none` falls through to the hollow
   outline, which is the same treatment `<ValveSwatch>` gives it and the same
   one the deleted donut gave its `none` wedge.

   WHY THIS IS NOT IMPORTED FROM `ValveStateReadout`: that atom owns the CHIP,
   which is fixed at `size-[10px]` and forwards no `style`, so it cannot be
   stretched into a proportional bar segment. Its class map is private on
   purpose. These are the same three `bg-valve-*` utilities from the same
   `@theme inline` registration (`index.css:866-868`), so the two cannot drift
   in COLOUR; if a fourth surface ever needs them, export the map from the atom
   rather than writing a third copy. */
const SEGMENT_FILL = {
  error: 'bg-valve-error',
  open: 'bg-valve-open',
  closed: 'bg-valve-closed',
}
const SEGMENT_HOLLOW = 'border border-solid border-border bg-transparent'

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

/* ── The segmented bar ────────────────────────────────────────────────────
   DECORATIVE, AND SAYS SO. `aria-hidden` because the stat tiles below carry
   every number and every word it could announce, and a screen reader that read
   both would read the whole scope twice. `pointer-events-none` because it is
   not the control — the tiles are, which is the point of the redesign.

   Proportions are `flexGrow: count` over `basis-0`, so the widths are exactly
   proportional with no percentage arithmetic and no sweep algorithm. `min-w-1`
   (4px) is the visibility floor: a non-zero count may never round to zero
   width, and flexbox takes the difference out of the segments that have room.
   The bar is therefore NOT exactly to scale below ~1.3% of a 313px span —
   stated plainly here because the donut's version of this was its central
   dishonesty. THE TILE COUNT IS THE AUTHORITY and is always text.

   `none` draws hollow rather than filled: it is the absence of hardware, not a
   fourth state, and under `contrast` every neutral token is saturated so a
   filled neutral reads as a state of its own. */
function SegmentedBar({ slices }) {
  return (
    <div
      data-name="valve-bar"
      aria-hidden="true"
      className="pointer-events-none flex h-2.5 w-full items-stretch gap-0.5"
    >
      {slices.map((s) => (
        <span
          key={s.key}
          data-valve-segment={s.key}
          style={{ flexGrow: s.count }}
          className={cn(
            'min-w-1 basis-0 rounded-full',
            SEGMENT_FILL[s.key] ?? SEGMENT_HOLLOW,
          )}
        />
      ))}
    </div>
  )
}

/* ── One stat tile ────────────────────────────────────────────────────────
   The count as a large numeral, the chip and the word under it, and the
   per-category offline sub-count beside the numeral. THE WHOLE TILE IS THE
   TARGET and it navigates: "Valve Error 2" lands on the two faulted ones
   rather than on a list to hunt through.

   `min-h-14` is 56px, comfortably over the 44px floor, and it is a SCALE step
   rather than the old `min-h-[48px]` literal. happy-dom cannot measure a
   target, so the class is what the test pins — as a rule ("at least 44px"),
   not as a string.

   THE COUNT INCLUDES THE OFFLINE SYSTEMS, by design: an offline system holds
   its last-known state and is genuinely part of the scope
   (`valveScope.js:53-59`). Only the denominator line's "can be commanded"
   excludes them. "How many of the OPEN valves are offline" is a cross-tab: a
   2-D encoding would make the reader integrate it by eye, and as text beside
   the numeral it costs no height at all.

   `<Item asChild size="sm">` gives the chassis — `rounded-md`, the transparent
   border box, `transition-colors`, `text-sm` and the house focus ring. Only
   the size variant is overridden, because a stat tile stacks where a list row
   does not. See WHY NOT ItemGroup in the header. */
function StatTile({ categoryKey, bucket, onOpen }) {
  const navigable = categoryKey !== 'none'
  const label = labelOf(categoryKey)
  const count = `${bucket.total} ${plural(bucket.total, 'system', 'systems')}`

  const shell = cn(
    'h-full w-full min-h-14 flex-col items-start gap-1 px-2 py-1 text-left',
    navigable
      ? 'cursor-pointer hover:bg-accent/50 active:bg-accent'
      : 'cursor-default',
  )

  return (
    <li className="min-w-0">
      <Item asChild size="sm" className={shell}>
        <button
          type="button"
          data-valve-row={categoryKey}
          /* `aria-disabled`, NOT the `disabled` attribute. A disabled control
             is skipped outright by some assistive tech, so the user never
             learns WHY it cannot be used — which on this tile is the single
             most useful thing it has to say. It stays focusable and announced,
             with the reason inside its accessible name; the press handler is
             simply not wired. */
          aria-disabled={navigable ? undefined : 'true'}
          onClick={navigable ? () => onOpen(categoryKey) : undefined}
          /* NEW COPY, both forms. The destination is named, because a chevron
             is a sighted-only promise, and the count stays in the name so the
             tile still answers "how many" when it is read rather than seen. */
          aria-label={
            navigable
              ? `${label}: ${count}${bucket.offline > 0 ? `, ${bucket.offline} offline` : ''}. Manage these valves.`
              : `${label}, ${count}. Nothing to manage — there is no valve here to command.`
          }
        >
          <span className="flex w-full items-center gap-1.5">
            {/* `tabular-nums` here and NOT on the old donut centre: these are
                four figures a reader scans DOWN a grid, which is exactly what
                tabular figures are for. */}
            <span
              className={cn(
                'text-2xl font-semibold leading-none tabular-nums',
                navigable ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {bucket.total}
            </span>
            {bucket.offline > 0 ? (
              /* Offline gets NO COLOUR of its own — muted ink, on the same
                 line as the numeral so it costs no height. It is a
                 reachability fact, not a valve state, and giving it a hue
                 would file it under the same visual system as the three
                 states. NEW COPY: "· {n} offline". */
              <span className="min-w-0 truncate text-sm leading-none text-muted-foreground">
                {`· ${bucket.offline} offline`}
              </span>
            ) : null}
            {navigable ? (
              <ChevronRight
                className="ml-auto size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
                data-valve-chevron={categoryKey}
              />
            ) : null}
          </span>
          {/* THE ONE COLOUR CUE AND ITS MANDATORY WORD — `ValveStateReadout`,
              never a local swatch and never a second glyph. index.css:358-367:
              --valve-error against --valve-open is dE 7.6 under deuteranopia,
              legal ONLY WITH SECONDARY ENCODING, and the WORD is that
              encoding. There is no prop that removes it. */}
          <ValveStateReadout
            categoryKey={categoryKey}
            className="w-full text-muted-foreground"
          />
        </button>
      </Item>
    </li>
  )
}

/* ── Chassis ──────────────────────────────────────────────────────────────
   The house card shell, shared verbatim with every sibling in the Home stack
   (`ActiveWaterEventsCard.jsx:501`, `EventsTimelineCard.jsx:296`,
   `InfoAccordion.jsx:139`). See WHY THE CHASSIS IS NOT `<Card>` in the header:
   `rounded-[18px]` and the absent shadow are the two arbitrary values kept on
   purpose, and only here.

   `w-full` AND NO INTRINSIC WIDTH, both pinned by
   `homeWidgetWidth.dom.test.jsx:80-82`: the Home stack is
   `flex flex-col items-start`, where a child without `w-full` sizes to its own
   content — which is how the consumption card came to RESIZE when the user
   changed its segment. A `w-[...]` here would beat `w-full` and reintroduce it.

   `px-6` — 24px, scale step 6 — on the header, the body AND the entry bar.
   That is the inset every sibling card uses, so the six cards' titles line up
   down the stack; a 16/24 mix is the "positions look broken" report. The stat
   tiles sit INSIDE that inset and carry their own `px-2`, which is the tile's
   padding, not a card inset. */
const CARD = String.raw`bg-surface-card border border-solid border-card content-stretch flex flex-col items-start overflow-hidden relative rounded-[18px] shrink-0 w-full`

function Header({ scopeLabel }) {
  return (
    <div
      className="flex w-full shrink-0 items-baseline justify-between gap-2 px-6 pb-2 pt-4"
      data-name="valve-header"
    >
      {/* NEW COPY. "Valve status" is the phrase this product already uses for
          a valve readout (`ValveStatusCard`'s own title), kept so the widget
          and the System page name the same thing the same way. */}
      <h3 className="text-sm font-semibold leading-5 text-foreground">Valve status</h3>
      {scopeLabel ? (
        <span className="min-w-0 truncate text-sm leading-5 text-muted-foreground">
          {scopeLabel}
        </span>
      ) : null}
    </div>
  )
}

/* ── One category, whole scope ────────────────────────────────────────────
   Every system in the same state. One series needs no legend — the sentence
   names it — so the tiles collapse to a line of prose and the grid is not
   drawn at all.

   The whole-scope-offline case lands here when it is also single-state, and it
   is drawn AT FULL COLOUR: last-known state is real information, and greying
   it out to signal unreachability is the bigger lie. The reachability line
   below says so in words instead.

   No deep link here: with one category the entry control at the foot of the
   card already lands on the only filter there is. `<ValveSwatch>` rather than
   `<ValveStateReadout>` because the word is already in the sentence beside it,
   which is exactly the condition that atom documents for exporting the chip
   alone. */
function SoloBody({ categoryKey, count, offline }) {
  return (
    <>
      <div className="mt-3 flex w-full items-center gap-2">
        <ValveSwatch categoryKey={categoryKey} />
        {/* NEW COPY. The headline as a SENTENCE, because with one series there
            is no legend to read a label against. */}
        <p className="min-w-0 flex-1 text-sm leading-5 text-foreground">
          {categoryKey === 'none'
            ? `All ${count} ${plural(count, 'system is', 'systems are')} metering-only.`
            : `All ${count} ${plural(count, 'system is', 'systems are')} ${labelOf(categoryKey)}.`}
        </p>
      </div>
      {offline > 0 ? (
        /* NEW COPY. Says the colour above is last-known, not live. */
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          {`${offline} of ${plural(count, 'it is', 'them are')} offline · last-known state shown`}
        </p>
      ) : null}
    </>
  )
}

/* ── The way in ───────────────────────────────────────────────────────────
   The card's one control, and the only thing on it that is not a readout.

   `<Button>` with the DEFAULT variant and the DEFAULT size — `h-9 px-4
   rounded-md`, straight off `button.jsx:49`, with nothing added but `w-full`.
   It is navigation now, not an actuation: `destructive` is reserved for the
   control that actually shuts water off, and that control is on the screen
   this opens. A destructive-red button that only changes route would habituate
   the user to the colour that matters.

   NEW COPY: "Manage valves" — awaiting the owner's approval like every other
   string on this card. */
function EntryBar({ onOpen }) {
  return (
    <div className="w-full shrink-0 px-6 py-3" data-name="valve-entry">
      <Button type="button" onClick={() => onOpen(null)} className="w-full" data-valve-entry="true">
        Manage valves
      </Button>
    </div>
  )
}

export default function ValveManagementCard({ systems = [], scopeLabel = '', className }) {
  const navigate = useNavigate()
  /* THE ROUTE IS THE SCOPE — `HomeAllAccounts.jsx:502-515` states that model
     for this whole page, so the card reads the scope off the route exactly as
     the page does rather than taking a handler prop. `scopeLabel` is
     deliberately NOT used to build the URL: on the unscoped routes it is the
     display string "All Accounts", which is not a location. */
  const { locationName } = useParams()

  const [tick, setTick] = useState(0)

  /* Repaint. See REPAINT in the header: three paths, all inbound now, and the
     tick is what invalidates the memo below. */
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
     the resolved systems in — this is that call site. It matters MORE now that
     the write happens on another screen, or the readout would report
     pre-command state after the user came back. `systems` is never mutated:
     every entry is a fresh object. `tick` is in the deps so a write elsewhere
     re-resolves, and is read for no other reason. */
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
        <div className="w-full px-6 pb-4" data-name="valve-body">
          {/* NEW COPY, both lines. One honest sentence and its denominator —
              no bar of a single empty category, no tiles, AND NO ENTRY
              CONTROL: there is nothing on the management screen for this scope
              to manage, so offering a way in would be a dead end with a
              chevron on it. Reachable from the live drawer today (Southbridge
              Health; 45 Cedarline Way, 510 Lakeview Dr, 30 Dogwood Dr), not an
              edge case. */}
          <p className="text-sm leading-5 text-foreground">No valves in this scope.</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {`All ${total} ${plural(total, 'system is', 'systems are')} metering-only.`}
          </p>
        </div>
      </div>
    )
  }

  /* Every category, zero counts included — a zero-count segment renders with
     `flexGrow: 0` and `min-w-1`, which is 4px of nothing, so the bar is
     filtered to the non-empty ones for the same reason the tiles are: the
     floor exists to stop a 1 from vanishing, never to invent a mark for a 0. */
  const slices = rows.map((c) => ({ key: c.key, count: byCategory[c.key].total }))

  /* n = 1. A part-to-whole of one says nothing the single sentence does not
     say better, so the bar is dropped. (A lone VALVE among valveless systems
     is a different case and keeps its bar: "1 with a valve, 9 without" is a
     real proportion, and `total > 1` is exactly that distinction.) */
  const drawBar = total > 1

  /* Exactly one non-empty category: one series needs no legend. */
  const soloKey = rows.length === 1 ? rows[0].key : null

  return (
    <div className={cn(CARD, className)} data-name="valve-management">
      <Header scopeLabel={scopeLabel} />

      <div className="w-full px-6 pb-4" data-name="valve-body">
        {drawBar ? <SegmentedBar slices={slices} /> : null}

        {soloKey ? (
          <SoloBody
            categoryKey={soloKey}
            count={byCategory[soloKey].total}
            offline={byCategory[soloKey].offline}
          />
        ) : (
          <>
            {/* THE CHART IS THE CONTROL. Two columns rather than four: at a
                361px card four columns leave ~78px per tile, and
                "No valve installed" is 18 characters — it would truncate to
                "No valve in…" on the one tile whose whole job is to say that
                nothing can be done there. Two columns give ~153px, where every
                one of the four design words fits on one line.

                A <ul>/<li> grid rather than <ItemGroup>: that primitive is
                `role="list" flex flex-col`, and a <button> directly inside a
                role="list" is invalid. See WHY NOT ItemGroup in the header. */}
            <ul className="mt-3 grid w-full grid-cols-2 gap-2" data-name="valve-stats">
              {rows.map((c) => (
                <StatTile
                  key={c.key}
                  categoryKey={c.key}
                  bucket={byCategory[c.key]}
                  onOpen={openScreen}
                />
              ))}
            </ul>

            {/* THE HONEST DENOMINATOR, AND THE PLACE OFFLINE LIVES. NEW COPY.
                Three numbers that are routinely confused with each other,
                stated side by side so none can stand in for another. The
                offline total is HERE and not in the bar: an offline system is
                also open, closed or in error, so a fifth segment would
                double-count the scope. This line is the last survivor of the
                owner's offline requirement on this card. */}
            <p
              className="mt-3 text-sm leading-5 text-muted-foreground"
              /* Addressable, because the tile counts abut it in `textContent`:
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

      {/* The house `<Separator>` — Radix `Separator.Root`, inline, no portal —
          rather than a hand-rolled `border-t` div. */}
      <Separator />
      <EntryBar onOpen={openScreen} />
    </div>
  )
}
