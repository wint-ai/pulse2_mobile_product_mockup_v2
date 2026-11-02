/**
 * ValveManagementScreen — where valves are actually MANAGED.
 *
 * DESIGN SOURCE: none. A survey walked every page of the Figma file and found
 * no valve-management, bulk-action, multi-select or status-breakdown frame to
 * transcribe. This screen is net-new from the design system, structurally like
 * `AccountScreenV2.jsx:4`, `BulkValveConfirmSheet.jsx:4` and
 * `ValveManagementCard.jsx:5`. EVERY VISIBLE STRING BELOW IS NEW COPY AWAITING
 * THE OWNER'S APPROVAL and is marked `NEW COPY` at its site. The exceptions,
 * which are NOT new and must not be reworded here:
 *   · the four valve words — `Valve Error` · `Open` · `Closed` ·
 *     `No valve installed` — come from `VALVE_CATEGORIES` (`valveScope.js`),
 *     which takes them verbatim from Figma board 199535:96542;
 *   · the offline words — `Offline` / `System is offline` — are the product's
 *     own (`src/i18n/locales/en.json:348-355`). "Unreachable" appears nowhere
 *     in this product and is never introduced here.
 * No `t()`: only 2 of 36 v2 components use i18n and no v2 valve surface does.
 *
 * ── WHY THIS SCREEN EXISTS ───────────────────────────────────────────────
 * The owner, verbatim: "i dont like the way its built. the widget needs to be
 * display only for managing valve i want to open a dedicated screen so user
 * can select/deselect specific valves can filter per location / etc. main
 * widget is display only".
 *
 * So `ValveManagementCard` becomes a readout and THIS is the control surface:
 * per-SYSTEM select / deselect, filtering by location, by valve state and by
 * connectivity, then one bulk open or close over exactly what was selected.
 *
 * His earlier framing still binds and is the reason for most of the rules
 * below: "this is like a super dangerous operations when user can shut off
 * valve for around 1000 valve or 100 valves. So we need some pop-up messages,
 * and we need to select deselect. We need to understand the context of
 * systems." And: "we have a kind of an offline devices that Valve cannot be
 * shut off. So we need to explain the user this situation somehow and to not
 * let him think that this Valve will take place on this operation that he
 * wants to."
 *
 * ── BUILT ON `src/components/ui/`, NOT HAND-ROLLED ───────────────────────
 * The first cut of this screen drew its own pills, its own tick box, its own
 * card and its own badges, and the owner's verdict was "why you didnt used the
 * shad cn components fot this it looks very bad". He is right, and it is not a
 * taste call: a bespoke control cannot inherit a token change, a focus ring
 * fix or a theme, so it drifts out of the design system the moment either
 * moves. The presentation is now the house kit, and the mapping is:
 *
 *   <Card> / <CardHeader> / <CardTitle> / <CardDescription> / <CardContent>
 *                                   the page header + summary, and the result
 *   <Badge variant="outline">        every valve-state readout and the Offline
 *                                   readout — the swatch, the glyph and the
 *                                   word travel inside ONE badge
 *   <ToggleGroup type="single">      the quick state filter. The house
 *                                   precedent is `AccountScreenV2`'s
 *                                   SegmentedPicker (`:256-283`), which is
 *                                   inline and portals nothing
 *   <Checkbox>                       every tick box, including the row's and
 *                                   the select-all's (see below)
 *   <Separator>                      every rule between rows and sections
 *   <Button>                         the actions, the filter control, Show
 *                                   more, Dismiss
 *
 * THE ONE PRIMITIVE ADDED: `src/components/ui/checkbox.jsx`. Its own header
 * carries the argument in full; in short, `radix-ui@^1.6.7` is already a
 * dependency and already exports `Checkbox`, and Radix's Checkbox renders
 * INLINE — it portals nothing — so the `AccountScreenV2.jsx:644-656`
 * prohibition, which exists because `Select` and `DropdownMenu` portal out of
 * `Phone.jsx`'s fixed 393x852 `overflow:hidden` frame, does not reach it. No
 * other primitive was added. Still forbidden and still absent: `Select`,
 * `DropdownMenu`, `Popover`, Radix `Dialog`. Both sheets stay
 * `absolute inset-0` inside the page.
 *
 * ── WHAT THIS SCREEN IS NOT ALLOWED TO KNOW ──────────────────────────────
 * It derives NOTHING about valves. `valveScope.js` is the single source of
 * what a state means and what may be commanded; this file asks
 * `valveCategoryOf` / `isReachable` / `canActuate` / `blockedReasonOf` /
 * `summariseValves` and renders the answer. A second copy of the actuation
 * rule living in a screen is the exact defect that module was extracted to
 * prevent (`valveScope.js:12-18`).
 *
 * IT ADDS NOTHING. `targetsFor(systems, selectedKeys, action)` partitions by
 * CATEGORY key, because the overview card selects whole chart slices; this
 * screen selects INDIVIDUAL systems, so it calls the per-system twin,
 * `targetsForSelection(systems, selectedIds, action)`. That function and its
 * `BUCKET_OF_REASON` naming table NOW LIVE IN `valveScope.js` beside
 * `targetsFor`, sharing one `partition` with it. They spent one change living
 * here, and a second copy of the partition sitting in a page is the precise
 * defect that module was extracted to prevent (`valveScope.js:12-18`).
 *
 * ── THE NUMBER RULE, WHICH IS MOST OF THE FEATURE ────────────────────────
 * THE ACTION BUTTON'S NUMBER IS `willAct.length`, NEVER `selected.size`. When
 * they differ the action bar states the difference on its own face, BEFORE the
 * confirm sheet — by the sheet the user has already decided. An offline system
 * stays SELECTABLE (the user may legitimately want it in the set, and it may
 * come back) but is excluded from the count and is listed BY NAME in the
 * sheet.
 *
 * THE BAR HAS A PRIMARY AND A SECONDARY, NOT TWO EQUAL SLABS, AND THE PRIMARY
 * IS `destructive` AT CONTENT WIDTH. It drew two full-width buttons at first,
 * one a saturated red block beside a disabled twin; then plain primary blue,
 * which was the opposite error — the button that shuts off water in occupied
 * buildings looking like every other action in the app. The settled answer is
 * the design system's own `destructive` variant (Figma set 6716:46634) sized
 * to its label rather than to the bar: same ink, a third of the area. Open is
 * an `outline` secondary pushed to the far end with `ml-auto`; a disabled one
 * recedes on `<Button>`'s own `disabled:opacity-50`. GOV.UK's rule — "do not
 * only rely on the red colour of a warning button" — is satisfied by three
 * non-colour cues: the count in the label, the `DropletOff` glyph, and the
 * exclusion line above the buttons. The confirmation still carries its own
 * `destructive` commit button; the bar is now unmistakable as well, which it
 * was not. The full argument sits at the button.
 *
 * ── SELECTION IS GLOBAL TO THE SCOPE, NOT TO THE FILTER ──────────────────
 * Selecting rows, then narrowing the filter, does NOT deselect what scrolled
 * out of view — silently dropping a selection the user made is the same class
 * of lie as counting a valve that will not move. So the action bar counts
 * EVERY selected system in the scope and, when some of them are hidden by the
 * current filter, says how many on its face.
 *
 * SELECT-ALL MEANS SELECT-ALL-MATCHING-THE-CURRENT-FILTER, AND SAYS THE
 * NUMBER. Gmail and Shopify both solve this footgun by making the widening
 * control explicit and numbered; the label is literally
 * `Select all {n} matching`, never a bare "Select all". `n` counts SELECTABLE
 * matches, because a "No valve installed" row can never join a selection.
 * AND THE ROWS THAT ARE NOT IN `n` ARE ACCOUNTED FOR ON THE CONTROL ITSELF.
 * The bar carried a `5 rows` badge beside `Select all 3 matching` — two
 * numbers of different kinds, adjacent, on the one control that acts in bulk,
 * with nothing saying which was which. The badge is gone, because the rows are
 * on screen and it restated what the eye already had, and the difference it
 * was hiding is now a sentence naming the rows and the reason they cannot
 * join: "2 of 5 rows shown can't be selected — No valve installed". It
 * appears only when there IS a difference.
 * It is also THE MOST DANGEROUS CONTROL ON THE SCREEN — it is what lets one
 * press stage 81 valves — so it is given its own bordered bar with a title
 * weight rather than being a line of text among the rows. Indeterminate is
 * Radix's own `checked="indeterminate"`, which emits `aria-checked="mixed"`.
 *
 * ── THE `?state=` DEEP LINK ──────────────────────────────────────────────
 * The overview card links in with `?state=<VALVE_CATEGORIES key>`, e.g.
 * `/valves/320%20Summit%20Blvd?state=open`. That param seeds the `state`
 * filter group, which already keys on exactly those four strings, so a tap on
 * the card's Open row lands here with Open already applied. An unknown or
 * absent value falls back to All rather than to an empty list — a deep link
 * that renders nothing is indistinguishable from a broken scope, and this
 * screen already has one honest empty state too many to add a fake one.
 * Re-seeded on every change of `location.search`, so arriving from a second
 * link without unmounting re-applies.
 *
 * ── SCALE ────────────────────────────────────────────────────────────────
 * Two locked PRD decisions apply: "Don't load 1000 systems at once"
 * (`00-index.md:89`) and lazy loading / virtual scrolling for long lists
 * (`01-overview.md:60-63`), with a 500-system memory budget
 * (`16-technical-requirements.md:191`). The demo fleet is 103 systems so
 * nothing visibly breaks — but an unbounded list is not shipped. Rows are
 * PAGED at `PAGE_SIZE`, and the page SAYS WHAT IS NOT DRAWN with an explicit
 * control to draw more. A silent truncation reads as "this is everything"
 * when it is not.
 * WHAT IS DROPPED IS ONLY THE DRAWING. Select-all-matching selects all
 * MATCHING systems, not all RENDERED ones, and the action bar counts the
 * whole selection — that gap is the footgun above and is closed by
 * construction: nothing on this screen derives a number from `shown`.
 *
 * ── COLOUR IS NEVER THE ONLY CUE. THIS IS NOT OPTIONAL ───────────────────
 * `index.css:358-367` records a standing accessibility WARN: `--valve-error`
 * against `--valve-open` is ΔE 7.6 under deuteranopia, legal ONLY WITH
 * SECONDARY ENCODING. Under `contrast` it is worse in a second way —
 * `--valve-open` is `oklch(0.85 0.25 140)` and `--valve-closed`
 * `oklch(0.85 0.25 110)`: same lightness, same chroma, 30° apart, i.e. two
 * greens. THE `<ValveStatus>` GLYPH AND THE TEXT LABEL BESIDE EVERY SWATCH
 * ARE THEREFORE MANDATORY on every row and in the summary, and must never be
 * dropped to tighten a layout. `StateBadge` below carries all three inside one
 * `<Badge>` precisely so no future tightening can drop two of them; there is
 * no compact row variant that loses either.
 *
 * ── CHROME: BACK, NOT X ──────────────────────────────────────────────────
 * The owner's standing rule: "x and back can't live in parallel, only one
 * exists. It needs to be back. If back is an option, and x if not." This
 * screen is PUSHED from the overview, so it gets back — `MobileHeaderBar`,
 * the same chrome `SystemPageV2Screen.jsx:1514` draws for a pushed screen,
 * which also carries the only door into the navigation drawer.
 *
 * ── REPAINT AFTER A WRITE — ALL THREE, FOR THREE REASONS ─────────────────
 * `pushBridge.publish` (`pushBridge.js:130`) POSTs to ntfy.sh over HTTP and
 * never touches the local channel: it is the cross-DEVICE relay. The same-tab
 * wake is `channel.postMessage` on `BroadcastChannel('pulse2-push')`
 * (precedent `pushSimFire.js:50-53`, consumed at `UserContext.jsx:47`), and a
 * BroadcastChannel does NOT receive its own messages
 * (`PushNotifications.jsx:102`), so a local state bump is required as well.
 * `ValveManagementCard.jsx:999-1005` does all three; this is the same three.
 *
 * ── APP-SHELL CONTRACT (`scripts/check-shell-contract.mjs`) ──────────────
 * Root is `flex:1 / minHeight:0 / column`; the ROW LIST is the single
 * `flex:1 / overflowY:auto / minHeight:0` element; header, summary, filter bar
 * and action bar are `shrink-0` siblings; `TabBar` is mounted; the drawer is
 * wired. No viewport-height class — `Phone.jsx` is a fixed frame and 100vh is
 * simply clipped. No negative horizontal margins, so there is nothing for the
 * `bleed-needs-a-bleeding-scroller` rule to catch.
 */
import { useCallback, useId, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { DropletOff, SlidersHorizontal, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import TabBar from '@/components/TabBar'
import MobileHeaderBar from '@/v2/components/MobileHeaderBar'
import WintSidebarV2 from '@/v2/components/WintSidebarV2'
import ValveStatus from '@/v2/components/ValveStatus'
import BulkValveConfirmSheet from '@/v2/components/BulkValveConfirmSheet'
import {
  VALVE_CATEGORIES,
  blockedReasonOf,
  canActuate,
  isReachable,
  summariseValves,
  targetsForSelection,
  valveCategoryOf,
} from '@/v2/components/valveScope'
import { effectiveValveState, recordBulkValveCommand } from '@/data/valveCommandStore'
import { formatLastSeen } from '@/utils/format'
import { publish } from '@/lib/pushBridge'
import { SYSTEMS } from '@/data/systems'
import { getAccountById } from '@/data/accounts'

/* The same-tab wake. Module-level, like `ValveManagementCard.jsx:202` — one
   channel per module, not one per render. Guarded because some environments
   do not have it, and a missing channel must not take the screen down: the
   local `tick` bump below is what actually repaints THIS page. */
const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pulse2-push') : null

/* How many rows are DRAWN at once, and how many more each press adds. See the
   SCALE note in the header: this bounds the DOM, never the selection and never
   a count. 40 fills the 393x852 frame about three times over. */
const PAGE_SIZE = 40

/* The trailing fade on the quick-filter scroller, and the padding that must
   match it. See the scroller itself for the whole argument; in short, this is
   an ALPHA ramp and not a colour, so it is theme-proof by construction and is
   the one place in this file where a literal `#000` is not a token violation.
   24px is a little under half a chip's minimum width, which is enough for a
   clipped chip to read as fading rather than as cut. */
const CHIP_FADE_WIDTH = '24px'
const CHIP_FADE = `linear-gradient(to right, #000 0, #000 calc(100% - ${CHIP_FADE_WIDTH}), transparent 100%)`

const ALL_LABELS = Object.fromEntries(VALVE_CATEGORIES.map((c) => [c.key, c.label]))
const CATEGORY_KEYS = VALVE_CATEGORIES.map((c) => c.key)

/* The glyph beside each swatch — `ValveStatus.jsx` is the product's own valve
   artwork, already drawn to Figma 197639:253443 for exactly these states, so
   this screen introduces no new iconography. THESE GLYPHS ARE THE SECONDARY
   ENCODING the palette's compliance depends on (index.css:358). */
const GLYPH = { error: 'error', open: 'open', closed: 'closed', none: 'no-valve' }

/* Registered Tailwind colours, `index.css:866-868`. A colour utility naming a
   token this repo does not define falls through to stock Tailwind and freezes
   across all four themes; these three are `inline` in @theme so they follow
   whichever theme is set on an ancestor. `none` is deliberately NOT one of
   them — see `Swatch`. */
const SEG_CLASS = {
  error: 'bg-valve-error',
  open: 'bg-valve-open',
  closed: 'bg-valve-closed',
  none: 'bg-border',
}

/* Singular / plural without a formatter — there is no i18n on this surface and
   `Intl.PluralRules` for two English forms is ceremony. Same call as
   `ValveManagementCard.jsx:318`. */
const plural = (n, one, many) => (n === 1 ? one : many)

// ── Scope resolution ───────────────────────────────────────────────────────
/* THE SAME PREDICATES `HomeAllAccounts.jsx:503-518` USES, in the same shape,
   so the two screens cannot disagree about what a scope contains. Copied
   rather than imported because `HomeAllAccounts` does not export them and is
   another agent's file this change may not touch; if either is ever exported,
   both call sites should take it from there. */

/** All three location levels, not only l4. `buildTree.js` documents l3 as the
 *  level the MRG export leaves unused, and a dataset that populates it should
 *  scope on it rather than silently miss. */
function matchesLocationName(s, name) {
  return s.l4Name === name || s.l3Name === name || s.l2Name === name || s.l1Name === name
}

/** Accounts are routable by name too: `s.account` is a Salesforce id and
 *  `getAccountById` resolves the name beside it. A parent account rolls its
 *  children up. */
function matchesAccountName(s, name) {
  const acct = getAccountById(s.account)
  if (!acct) return false
  if (acct.name === name) return true
  return getAccountById(acct.parentId)?.name === name
}

/** The leaf location a system sits in — what the location filter offers and
 *  what the first half of a row's context line names. */
function leafLocationOf(system) {
  return system?.l4Name || system?.l3Name || system?.l2Name || system?.l1Name || 'Unassigned'
}

/** THE CONTEXT OF A SYSTEM, which the owner asked for by name: "We need to
 *  understand the context of systems." A row that is only a name is not enough
 *  to decide whether to cut its water, so every row carries its location path
 *  — the leaf, then the next level up that exists. */
function locationPathOf(system) {
  const parts = [system?.l4Name, system?.l3Name, system?.l2Name, system?.l1Name].filter(Boolean)
  return parts.slice(0, 2).join(' · ')
}

/** A "No valve installed" row is NEVER selectable: there is nothing to
 *  command. Asked of `valveCategoryOf` rather than of `system.valve`. */
function isSelectable(system) {
  return valveCategoryOf(system) !== 'none'
}

// ── Filtering ──────────────────────────────────────────────────────────────
/* An EMPTY array means "no constraint", which is `SystemsFilterSheet`'s own
   semantics — a group with nothing ticked matches everything rather than
   nothing. */
const EMPTY_FILTER = { location: [], state: [], connectivity: [] }

const CONNECTIVITY_OPTIONS = [
  /* NEW COPY: "Online". "Offline" is the product's own word
     (`en.json:348-355`); "Unreachable" is never used in this product. */
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
]

const connectivityOf = (s) => (isReachable(s) ? 'online' : 'offline')

function matchesFilter(system, filter) {
  if (filter.location.length > 0 && !filter.location.includes(leafLocationOf(system))) return false
  if (filter.state.length > 0 && !filter.state.includes(valveCategoryOf(system))) return false
  if (filter.connectivity.length > 0 && !filter.connectivity.includes(connectivityOf(system))) {
    return false
  }
  return true
}

const filterCount = (filter) =>
  filter.location.length + filter.state.length + filter.connectivity.length

/** `?state=` → the state filter's value. Only the four `VALVE_CATEGORIES`
 *  keys are honoured; anything else is All. See the deep-link note in the
 *  header for why an unknown value must not render an empty list. */
function stateFromSearch(search) {
  const raw = new URLSearchParams(search || '').get('state')
  return raw && CATEGORY_KEYS.includes(raw) ? [raw] : []
}

/** Options for one filter group, each WITH THE NUMBER OF SYSTEMS IT WOULD
 *  YIELD. `SystemsFilterSheet.jsx:245-247` states why in as many words — "A
 *  checkbox that silently returns nothing is the complaint this whole tab
 *  started from". Counts are scope-wide and independent of the other groups,
 *  exactly as `filterOptions(systems, categoryId)` computes them there, so a
 *  count never moves under the user while they are ticking. */
function optionsWithCounts(systems, keyOf, labelOf, order) {
  const counts = new Map()
  for (const s of systems) {
    const key = keyOf(s)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const keys = order
    ? order.filter((k) => counts.has(k))
    : [...counts.keys()].sort((a, b) => String(a).localeCompare(String(b)))
  return keys.map((value) => ({ value, label: labelOf(value), count: counts.get(value) || 0 }))
}

// ── Atoms ──────────────────────────────────────────────────────────────────

/* The colour chip. `aria-hidden` because it says nothing the glyph and the
   label beside it do not already say — and it is never the only cue. */
function Swatch({ categoryKey }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'size-[8px] shrink-0 rounded-full',
        /* `none` IS AN OUTLINE, NOT A FILL. It is the absence of hardware, not
           a state, so it must not read as a fourth colour in the same system
           as the three real ones. The browser pass made this concrete: under
           `contrast` every neutral token is saturated, so a filled `bg-border`
           chip came out orange and sat beside the pink and the green looking
           like a state of its own. Hollow reads as "nothing here" in all four
           themes. */
        categoryKey === 'none'
          ? 'border border-solid border-border bg-transparent'
          : SEG_CLASS[categoryKey],
      )}
    />
  )
}

/* THE STATE READOUT — one `<Badge variant="outline">` carrying the swatch, the
   glyph and the word. The three travel inside a single component precisely so
   no future tightening can drop two of them and leave the colour carrying the
   meaning on its own (index.css:358-367). `outline` rather than a filled
   variant: a filled badge per state would need four new colour pairs, and the
   swatch already says which state this is. */
function StateBadge({ categoryKey, className }) {
  return (
    <Badge variant="outline" className={cn('shrink-0 gap-[5px] border-border', className)}>
      <Swatch categoryKey={categoryKey} />
      <ValveStatus state={GLYPH[categoryKey]} size={13} className="shrink-0" />
      {ALL_LABELS[categoryKey]}
    </Badge>
  )
}

/* The OFFLINE readout, in the same badge chassis so it lands on the same
   baseline as the state badges it replaces. NO FILL AND NO VALVE COLOUR:
   reachability is not a valve state, and giving it one would file it under the
   same visual system as the three that are. "Offline" is the product's own
   word (`en.json:350`). */
function OfflineBadge() {
  return (
    <Badge variant="outline" className="shrink-0 gap-[5px] border-border text-muted-foreground">
      <WifiOff size={13} aria-hidden="true" className="shrink-0" />
      Offline
    </Badge>
  )
}

/* ── The summary card ─────────────────────────────────────────────────────
   COMPACT, not the big donut: the donut is the overview card's job and this
   screen's job is the list below it. The page title lives in this card's
   header — `<CardTitle>` / `<CardDescription>` is the house pair for a title
   over its scope, and it stops the title floating as raw text under the
   `MobileHeaderBar`.

   The bar is `role="img"` with the whole readout in its label and every
   segment `aria-hidden` — nothing here is a control, and a segment at this
   height could never be a 44px target anyway. */
function SummaryCard({ summary, title, scopeLabel }) {
  const { byCategory, total, valveTotal, actionableTotal, offlineTotal } = summary
  const present = VALVE_CATEGORIES.filter((c) => byCategory[c.key].total > 0)
  const readout = present.map((c) => `${byCategory[c.key].total} ${c.label}`).join(', ')

  return (
    <Card className="w-full gap-2 py-3" data-name="valve-summary">
      <CardHeader className="gap-0.5 px-3">
        {/* NEW COPY: the screen title. The house page-title weight is
            `AccountScreenV2.jsx:432-437`'s — 18/24, bold, -0.3px — on a token
            ink rather than that file's pre-tokenisation `text-slate-900`. */}
        {/* `<CardTitle>` is a `<div data-slot="card-title">`, so the real
            heading is spelled inside it. shadcn's component carries the type
            scale; the page still owes the document ONE `<h1>`, and a screen
            whose title has no heading role is a screen a rotor cannot find. */}
        <CardTitle className="text-[18px] font-bold leading-[24px] tracking-[-0.3px]">
          <h1 className="truncate">{title}</h1>
        </CardTitle>
        <CardDescription className="truncate text-[13px] leading-[18px]">
          {scopeLabel}
        </CardDescription>
      </CardHeader>

      {/* AN EMPTY SCOPE GETS THE HEADER AND NOTHING ELSE. "0 with a valve ·
          0 can be commanded" under a bar with no segments is three ways of
          saying the same nothing; the empty state in the scroller below says
          it once, in a sentence. */}
      {total === 0 ? null : (
      <CardContent className="flex flex-col gap-2 px-3">
        {(
          <>
            <div
              role="img"
              /* NEW COPY: the sentence frame. The state words inside it are
                 VALVE_CATEGORIES'. */
              aria-label={`Valve states across ${total} ${plural(total, 'system', 'systems')}: ${readout}.`}
              className="flex h-[6px] w-full overflow-hidden rounded-full bg-muted"
            >
              {present.map((c) => (
                <span
                  key={c.key}
                  aria-hidden="true"
                  className={cn('h-full', SEG_CLASS[c.key])}
                  /* A minimum width so a 2-of-103 slice is still visible. It
                     overstates a tiny slice by a pixel or two; a slice you
                     cannot see at all overstates it by all of it. */
                  style={{ flexGrow: byCategory[c.key].total, flexBasis: 0, minWidth: 6 }}
                />
              ))}
            </div>

            <ul className="flex flex-wrap items-center gap-[6px]">
              {present.map((c) => (
                <li key={c.key} className="flex items-center gap-[4px]">
                  <StateBadge categoryKey={c.key} />
                  <span className="text-[12px] font-semibold leading-[16px] text-foreground">
                    {byCategory[c.key].total}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* NEW COPY. "with a valve" is a count of SYSTEMS that have one, not of
            physical valves — valveScope.js's header is explicit that a system
            can hold more than one. "can be commanded" is `actionableTotal`,
            i.e. what a bulk action could reach RIGHT NOW, and is the number the
            action bar will be measured against. */}
        <p className="text-[12px] leading-[16px] text-muted-foreground">
          {`${valveTotal} with a valve · ${actionableTotal} can be commanded`}
          {offlineTotal > 0 ? ` · ${offlineTotal} offline` : ''}
        </p>
      </CardContent>
      )}
    </Card>
  )
}

/* ── One system row ───────────────────────────────────────────────────────
   ONE SYSTEM PER ROW, on a three-track grid so the box, the name, the state
   badge and the context line all sit on the same rhythm instead of being
   pushed around by whichever string is longest:

     [ box ] [ name ............... ] [ state badge ]
     [     ] [ location path · last-known · last seen ]

   THE WHOLE ROW IS THE TARGET, not the 18px box. The row's press handler
   defers to the `<Checkbox>` when the press landed on it — the same
   `closest()` guard `SystemPageV2Screen.jsx:1461-1464` uses so a card can be
   tappable without stealing its own controls' clicks. There is deliberately
   no chevron: a `>` promises a drill-down, and pressing this row ticks a box.

   EVERY ROW CARRIES ITS CONTEXT — name AND location path. The owner asked for
   exactly this: "We need to understand the context of systems."

   AN OFFLINE ROW stays SELECTABLE and says three things: that it is Offline,
   what its LAST-KNOWN state is (labelled as last-known, because that is all we
   can honestly claim), and when we last heard from it via `formatLastSeen`
   (`src/utils/format.js:175-189`) — the existing formatter, reused, never a
   second one. */
function SystemRow({ system, checked, onToggle, separated }) {
  const categoryKey = valveCategoryOf(system)
  const selectable = isSelectable(system)
  const reachable = isReachable(system)
  const actionable = canActuate(system)
  const path = locationPathOf(system)
  const name = system.name || system.title || system.id

  /* NEW COPY: "Last seen ". `formatLastSeen` returns 'Unknown' for a missing
     timestamp and "Last seen Unknown" is worse than the bare word, so that
     case falls back to the Offline badge alone. */
  const lastSeen = system.lastSeen ? `Last seen ${formatLastSeen(system.lastSeen)}` : null

  /* NEW COPY: "last known: ". The valve word after it is VALVE_CATEGORIES'. */
  const lastKnown =
    !reachable && categoryKey !== 'none' ? `last known: ${ALL_LABELS[categoryKey]}` : null

  const context = [path, lastKnown, !reachable ? lastSeen : null].filter(Boolean).join(' · ')

  /* NEW COPY, both branches. The reason rides in the accessible NAME, because
     the name is the only thing a screen-reader user gets before deciding
     whether to press. On a selectable row the trailing clause names the thing
     the button's number is about to be smaller because of. */
  const label = selectable
    ? `${name}, ${context}. ${
        actionable
          ? ''
          : reachable
            ? 'Excluded from bulk actions.'
            : 'System is offline — excluded from bulk actions, last-known state shown.'
      }`.trim()
    : `${name}, ${path}. No valve installed — not selectable, there is no valve here to command.`

  const press = (e) => {
    if (!selectable) return
    /* The box handles its own press; without this guard a click on it would
       toggle twice and land back where it started. */
    if (e.target?.closest?.('[data-slot="checkbox"]')) return
    onToggle()
  }

  /* THE PRESS HANDLER IS ON THE <li>, NOT ON THE GRID INSIDE IT, so the whole
     row — rule included — is one target and a press anywhere in it bubbles to
     one place. The `<Separator>` is the li's first child rather than a sibling
     because a `<ul>` may only hold `<li>`, and a stray `<hr>` between list
     items is a DOM-nesting error that React reports and the row test asserts
     never happens. */
  return (
    <li
      data-valve-row={system.id}
      data-selectable={selectable ? 'true' : 'false'}
      onClick={press}
      className={cn('flex w-full flex-col', selectable ? 'cursor-pointer' : 'cursor-default')}
    >
      {separated ? <Separator /> : null}
      <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-[10px] gap-y-[2px] px-[2px] py-[10px]">
        <Checkbox
          /* `aria-disabled`, NOT the `disabled` attribute, on a no-valve row.
             A disabled control is skipped outright by some assistive tech, so
             the user never learns WHY it cannot be used — which on this row is
             the single most useful thing it has to say. It stays focusable and
             announced; being controlled at `false` with no change handler is
             what makes it inert. */
          checked={selectable ? checked : false}
          onCheckedChange={selectable ? onToggle : undefined}
          aria-disabled={selectable ? undefined : 'true'}
          aria-label={label}
          className="row-span-2 self-start"
        />

        <span
          className={cn(
            'col-start-2 row-start-1 min-w-0 truncate text-[14px] leading-[20px]',
            selectable ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {name}
        </span>

        {/* THE STATUS. On an offline row the valve badge is replaced by the
            Offline badge, because reachability is the fact that dominates
            (valveScope.js's precedence note) and the last-known valve state
            moves to the context line where it can be LABELLED as last-known. */}
        <span className="col-start-3 row-start-1 justify-self-end">
          {reachable ? <StateBadge categoryKey={categoryKey} /> : <OfflineBadge />}
        </span>

        {/* THE CONTEXT LINE WRAPS; IT DOES NOT TRUNCATE. The browser pass
            caught this: an offline row's line is "<path> · last known: Open ·
            Last seen Yesterday 02:26", and at 393px `truncate` cut it at
            "Last seen …" — dropping the one fact that tells the user how stale
            the last-known state is. The NAME above may still truncate (a name
            is identifiable from its head); the context may not, because its
            tail is where the load-bearing part lives. */}
        <span className="col-start-2 col-span-2 row-start-2 text-[12px] leading-[16px] text-muted-foreground">
          {context}
        </span>
      </div>
    </li>
  )
}

/* ── The filter sheet ─────────────────────────────────────────────────────
   `absolute inset-0` INSIDE the page — no portal, for the reason in the
   header. Draft/apply after `SystemsFilterSheet.jsx:62-77`: the draft is
   re-seeded WHEN THE SHEET OPENS, not on every change, so a Cancel followed by
   a re-open does not resurrect an abandoned draft and an edit mid-session is
   not wiped. Editing the live filter as the viewer ticks would make Cancel a
   lie.

   EVERY OPTION SHOWS HOW MANY SYSTEMS IT WOULD YIELD
   (`SystemsFilterSheet.jsx:245-247`). */
function ValveFilterSheet({ open, groups, selection, onApply, onClose }) {
  const [draft, setDraft] = useState(selection)
  const [seededFor, setSeededFor] = useState(null)

  /* Re-seed on the OPEN transition, during render rather than in an effect: an
     effect here would run a render late and flash the previous draft. */
  if (open && seededFor !== selection) {
    setSeededFor(selection)
    setDraft(selection)
  }
  if (!open && seededFor !== null) setSeededFor(null)

  if (!open) return null

  const toggle = (groupId, value) => {
    const picked = draft[groupId] ?? []
    const next = picked.includes(value) ? picked.filter((v) => v !== value) : [...picked, value]
    setDraft({ ...draft, [groupId]: next })
  }

  const toggleGroup = (group) => {
    const picked = draft[group.id] ?? []
    const values = group.options.map((o) => o.value)
    const all = values.length > 0 && values.every((v) => picked.includes(v))
    setDraft({ ...draft, [group.id]: all ? [] : values })
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Filter valves"
      data-name="valve-filter-sheet"
    >
      {/* Scrim. A tap outside is a Cancel, not an Apply. */}
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-foreground/45"
      />

      <div className="relative flex max-h-[78%] flex-col overflow-hidden rounded-t-[16px] bg-card">
        <div className="shrink-0 px-[16px] py-[12px]">
          {/* NEW COPY */}
          <h2 className="text-[16px] font-semibold leading-[22px] text-foreground">Filter valves</h2>
        </div>
        <Separator />

        <div className="flex flex-col overflow-y-auto">
          {groups.map((group, index) => {
            const picked = draft[group.id] ?? []
            const values = group.options.map((o) => o.value)
            const all = values.length > 0 && values.every((v) => picked.includes(v))
            const some = values.some((v) => picked.includes(v))
            return (
              <section key={group.id}>
                {index > 0 ? <Separator /> : null}
                <div className="flex items-center justify-between px-[16px] pt-[12px]">
                  <h3 className="text-[13px] font-semibold leading-[18px] text-foreground">
                    {group.label}
                  </h3>
                  {/* A `<label>` only forwards a click to a LABELABLE element,
                      and Radix's Checkbox is a `<button role="checkbox">` — so
                      the forward is explicit, with the same guard the rows use
                      so a press ON the box does not toggle twice. Without it
                      the only hit target would be the 18px box itself, which
                      is under every touch-target floor there is. */}
                  <span
                    role="presentation"
                    onClick={(e) => {
                      if (e.target?.closest?.('[data-slot="checkbox"]')) return
                      toggleGroup(group)
                    }}
                    className="flex cursor-pointer items-center gap-[8px] py-[4px]"
                  >
                    <Checkbox
                      checked={all ? true : some ? 'indeterminate' : false}
                      onCheckedChange={() => toggleGroup(group)}
                      /* NEW COPY — numbered, like every other select-all here. */
                      aria-label={`Select all ${group.options.length} ${group.label.toLowerCase()} options`}
                    />
                    <span className="text-[12px] leading-[16px] text-muted-foreground">
                      {`All ${group.options.length}`}
                    </span>
                  </span>
                </div>
                <ul className="flex flex-col py-[4px]">
                  {group.options.length === 0 ? (
                    /* NEW COPY */
                    <li className="px-[16px] py-[12px] text-[13px] leading-[18px] text-muted-foreground">
                      Nothing to filter by here.
                    </li>
                  ) : (
                    group.options.map((o) => (
                      <li
                        key={String(o.value)}
                        /* The whole 44px row is the target, not the 18px box —
                           see the note on the group's select-all above. */
                        onClick={(e) => {
                          if (e.target?.closest?.('[data-slot="checkbox"]')) return
                          toggle(group.id, o.value)
                        }}
                      >
                        <div className="flex min-h-[44px] w-full cursor-pointer items-center gap-[12px] px-[16px] py-[10px] text-left hover:bg-accent">
                          <Checkbox
                            checked={picked.includes(o.value)}
                            onCheckedChange={() => toggle(group.id, o.value)}
                            aria-label={`${o.label}, ${o.count} ${plural(o.count, 'system', 'systems')}`}
                          />
                          <span className="min-w-0 flex-1 truncate text-[14px] leading-[20px] text-foreground">
                            {o.label}
                          </span>
                          {/* The count is ours. A checkbox that silently
                              returns nothing is the complaint the house sheet
                              started from. */}
                          <Badge variant="secondary" className="shrink-0 tabular-nums">
                            {o.count}
                          </Badge>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            )
          })}
        </div>

        <Separator />
        <div className="flex shrink-0 items-center justify-end gap-[8px] px-[16px] py-[12px]">
          {/* NEW COPY: "Clear all". "Cancel" and "Apply filter" are the house
              sheet's own words, kept identical. */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mr-auto text-muted-foreground"
            onClick={() => setDraft(EMPTY_FILTER)}
          >
            Clear all
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={() => onApply(draft)}>
            Apply filter
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function ValveManagementScreen() {
  const navigate = useNavigate()
  /* `key === 'default'` is react-router's marker for the FIRST entry in the
     history stack, in BrowserRouter and MemoryRouter alike. It is how this
     screen knows whether there is a "where the user came from" to go back to;
     when there is not, back goes to the scope's own overview rather than being
     a control that does nothing. */
  const { key: historyKey, search } = useLocation()
  const { locationName } = useParams()

  const scopeName = locationName ? decodeURIComponent(locationName) : null
  /* "All Accounts" is HomeAllAccounts' own unscoped title, reused so the two
     screens name the fleet the same way. */
  const scopeLabel = scopeName ?? 'All Accounts'

  /* For `aria-describedby` on the select-all box, so a screen reader gets the
     same accounting the sighted user does. `useId`, not a literal, because a
     literal id is a duplicate waiting for a second mount. */
  const selectAllNoteId = useId()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filter, setFilter] = useState(() => ({ ...EMPTY_FILTER, state: stateFromSearch(search) }))
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [renderLimit, setRenderLimit] = useState(PAGE_SIZE)
  const [pending, setPending] = useState(null)
  const [result, setResult] = useState(null)
  const [tick, setTick] = useState(0)

  /* `?state=` RE-SEEDS THE STATE GROUP. Seeded in the initialiser above for
     the first render, and re-seeded here when the query string changes under a
     mounted screen — arriving from a second link on the same route does not
     unmount, so an initialiser alone would leave the old filter in force. Done
     during render rather than in an effect, which is React's own
     derive-from-props pattern and avoids a frame of the stale list. Only the
     `state` group is touched: a location or connectivity choice the user made
     by hand is theirs, not the link's. */
  const [seededSearch, setSeededSearch] = useState(search)
  if (seededSearch !== search) {
    setSeededSearch(search)
    setFilter((prev) => ({ ...prev, state: stateFromSearch(search) }))
    setRenderLimit(PAGE_SIZE)
  }

  /* THE ROUTE IS THE SCOPE, resolved by NAME exactly as
     `HomeAllAccounts.jsx:516-543` resolves it. A NAME THAT MATCHES NOTHING
     YIELDS AN EMPTY SCOPE, NOT THE FLEET (`:545-549`) — falling back to the
     fleet is what produced a shipped bug there: fleet numbers under a
     location's name, which reads as truth and is not. */
  const scopedSystems = useMemo(() => {
    const all = SYSTEMS ?? []
    if (!scopeName) return all
    return all.filter((s) => matchesLocationName(s, scopeName) || matchesAccountName(s, scopeName))
  }, [scopeName])

  /* Commanded state wins over the system's own `valve`, resolved HERE because
     this screen is what wrote the commands and so is what must read back
     correctly after one. `valveScope.js:21-25` says a caller wanting commanded
     state honoured resolves it FIRST and hands the resolved systems in; this is
     that call site. `SYSTEMS` is never mutated — every entry is a fresh object.
     `tick` is in the deps so a write re-resolves, and is read for no other
     reason. */
  const systems = useMemo(() => {
    void tick
    return scopedSystems
      .filter((s) => !!s && typeof s === 'object')
      .map((s) => ({ ...s, valve: effectiveValveState(s) }))
  }, [scopedSystems, tick])

  const summary = useMemo(() => summariseValves(systems), [systems])

  const filtered = useMemo(() => systems.filter((s) => matchesFilter(s, filter)), [systems, filter])
  const selectableFiltered = useMemo(() => filtered.filter(isSelectable), [filtered])
  /* THE GAP BETWEEN THE TWO NUMBERS, DERIVED RATHER THAN DRAWN TWICE. The bar
     used to print "Select all 3 matching" beside a badge reading "5 rows":
     two numbers with different meanings, adjacent, on the one control that
     acts in bulk, and nothing on the bar said which was which. The badge is
     gone — the rows are on screen, so it restated what the eye already had —
     and the 2 it was silently hiding is now a sentence that says what those
     rows are and why they are not in the count. */
  const unselectableFiltered = filtered.length - selectableFiltered.length
  const shown = useMemo(() => filtered.slice(0, renderLimit), [filtered, renderLimit])

  const groups = useMemo(
    () => [
      {
        id: 'location',
        /* NEW COPY: the three group names. */
        label: 'Location',
        options: optionsWithCounts(systems, leafLocationOf, (v) => v),
      },
      {
        id: 'state',
        label: 'Valve state',
        options: optionsWithCounts(systems, valveCategoryOf, (v) => ALL_LABELS[v], CATEGORY_KEYS),
      },
      {
        /* CONNECTIVITY IS THE AXIS THE WHOLE FEATURE TURNS ON, so it is a
           first-class filter and not an afterthought: "show me only the
           offline ones" is how a user audits what a bulk action will miss. */
        id: 'connectivity',
        label: 'Connectivity',
        options: optionsWithCounts(
          systems,
          connectivityOf,
          (v) => CONNECTIVITY_OPTIONS.find((o) => o.value === v)?.label ?? v,
          CONNECTIVITY_OPTIONS.map((o) => o.value),
        ),
      },
    ],
    [systems],
  )

  const closeTargets = useMemo(
    () => targetsForSelection(systems, selectedIds, 'close'),
    [systems, selectedIds],
  )
  const openTargets = useMemo(
    () => targetsForSelection(systems, selectedIds, 'open'),
    [systems, selectedIds],
  )
  const pendingTargets = pending ? (pending.action === 'close' ? closeTargets : openTargets) : null

  const selectedCount = closeTargets.selected.length
  const hiddenSelected = selectedCount - filtered.filter((s) => selectedIds.has(s.id)).length

  /* The exclusions that hold WHATEVER the action is — offline, no valve,
     Valve Error, closing. `alreadyInState` is action-dependent and is carried
     by the difference between the two button numbers and by the sheet. */
  const blockedSelected = closeTargets.selected.filter((s) => !canActuate(s))

  /* THE LABEL THE BATCH RECORD GETS — AND ONLY THE BATCH RECORD.
     This screen used to hand this richer string to the sheet as well, because
     the sheet's second line could only say "Every system at this location" /
     "Every system in this account" and NEITHER is true of a selection. That
     workaround is gone: the sheet now has a 'selection' kind and states the
     fact itself, in the sentence whose job it is, so the sheet gets the plain
     scope name back and the two numbers stop competing on one line.

     THE RECORD KEEPS THE RICH LABEL, which is the one place it was always
     more honest than a bare scope name. `recordBulkValveCommand` writes a
     durable row read later with no screen around it; "320 Summit Blvd" alone
     would say the batch covered the location, and it did not. This string
     says what it covered. */
  const batchScopeLabel = `${scopeLabel} · ${selectedCount} of ${summary.total} ${plural(summary.total, 'system', 'systems')} selected`

  const toggle = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const allMatchingSelected =
    selectableFiltered.length > 0 && selectableFiltered.every((s) => selectedIds.has(s.id))
  const someMatchingSelected = selectableFiltered.some((s) => selectedIds.has(s.id))

  const toggleAllMatching = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const all = selectableFiltered.length > 0 && selectableFiltered.every((s) => next.has(s.id))
      for (const s of selectableFiltered) {
        if (all) next.delete(s.id)
        else next.add(s.id)
      }
      return next
    })
  }, [selectableFiltered])

  const applyFilter = useCallback((next) => {
    setFilter(next)
    setFilterOpen(false)
    /* A new filter is a new list; keeping a raised cap because the previous
       list was long would defeat the bound. */
    setRenderLimit(PAGE_SIZE)
  }, [])

  const setStateChip = useCallback((keys) => {
    setFilter((prev) => ({ ...prev, state: keys }))
    setRenderLimit(PAGE_SIZE)
  }, [])

  const goBack = useCallback(() => {
    if (historyKey && historyKey !== 'default') {
      navigate(-1)
      return
    }
    navigate(scopeName ? `/location/${encodeURIComponent(scopeName)}` : '/')
  }, [historyKey, navigate, scopeName])

  const commit = useCallback(() => {
    if (!pending || !pendingTargets) return
    const { action } = pending
    const { willAct, skipped, selected } = pendingTargets

    const batch = recordBulkValveCommand({
      action,
      systemIds: willAct.map((s) => s.id),
      /* The store wants IDS; `targetsForSelection` hands back SYSTEMS, because
         the confirm sheet lists the offline ones BY NAME and an id would have
         nothing to print. One mapping, here, at the single call site. */
      skipped: Object.fromEntries(
        Object.entries(skipped).map(([bucket, list]) => [bucket, list.map((s) => s.id)]),
      ),
      scopeLabel: batchScopeLabel,
    })

    /* A persistent, addressable record — NOT a toast. */
    setResult({
      action,
      recorded: batch !== null,
      commanded: willAct.length,
      attemptedOver: selected.length,
      buckets: Object.entries(skipped)
        .filter(([, list]) => list.length > 0)
        .map(([bucket, list]) => ({ bucket, count: list.length })),
    })
    setPending(null)
    setSelectedIds(new Set())

    /* Repaint — all three, for the three different reasons in the header. */
    setTick((n) => n + 1)
    try {
      channel?.postMessage({ type: 'data-changed' })
    } catch {
      /* no channel in this environment — the local bump above still stands */
    }
    publish({ type: 'data-changed' })
  }, [pending, pendingTargets, batchScopeLabel])

  const activeFilters = filterCount(filter)
  const hasValves = summary.valveTotal > 0
  /* THE ACTION BAR APPEARS ON THE FIRST SELECTION and never before it. A scope
     with zero valves therefore never shows one, which is the honest shape:
     there is no action to offer. */
  const showActionBar = hasValves && selectedCount > 0

  /* The quick-filter's value for `<ToggleGroup type="single">`. Nothing ticked
     is 'all'; exactly one state is that state. A MULTI-state selection can only
     arrive from the sheet, and no single chip is true of it — the group then
     shows nothing pressed and the `Filters · n` badge is what says a filter is
     in force. */
  const chipValue = filter.state.length === 0 ? 'all' : filter.state.length === 1 ? filter.state[0] : ''

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--app-bg)',
        position: 'relative',
      }}
      data-name="valve-management-screen"
    >
      <div
        className="content-stretch flex flex-col items-start gap-[8px] px-4 py-2 relative w-full"
        style={{ flex: 1, minHeight: 0 }}
      >
        {/* FIXED CHROME — a shrink-0 sibling of the scroller, not a sticky
            child. BACK, not X: this screen is pushed from the overview. The
            chevron-down on the scope slot is the door into the navigation
            drawer, which is how `SystemPageV2Screen.jsx:1514` satisfies the
            shell contract's burger rule without drawing a burger. */}
        <div className="w-full shrink-0">
          <MobileHeaderBar
            label={scopeLabel}
            onBack={goBack}
            backLabel="Back"
            onOpenTree={() => setDrawerOpen(true)}
          />
        </div>

        <div className="w-full shrink-0">
          <SummaryCard summary={summary} title="Valve management" scopeLabel={scopeLabel} />
        </div>

        {/* QUICK FILTERS + the full sheet. The chips are a single-select
            `<ToggleGroup>` over the categories present in this scope, plus All;
            anything richer — location, connectivity, several states at once —
            lives in the sheet behind the Button on the right.

            THE FILTER CONTROL IS NOT A CHIP AND DOES NOT PRETEND TO BE ONE. It
            opens a sheet rather than selecting a value, so it is a `<Button>`
            outside the group. It also does not scroll with the chips: the
            browser pass showed `ml-auto` inside an overflowing scroller pushing
            it past the 393px edge, leaving the only door to location and
            connectivity filtering off screen. */}
        {hasValves ? (
          <div className="flex w-full shrink-0 items-center gap-[8px]">
            {/* THE SCROLLER, AND THE THREE THINGS THAT MAKE ITS OVERFLOW
                LEGIBLE RATHER THAN BROKEN. The browser pass showed a chip
                sliced in half at the trailing edge, showing only its leading
                dot: that reads as a rendering fault, not as "there is more".

                1. A TRAILING ALPHA MASK. The last `--fade` of the scroller
                   ramps to transparent, so a chip that runs past the edge
                   fades out instead of being guillotined. It is SELF-
                   REGULATING: when the chips fit, the last `--fade` of the
                   box is empty space and the mask has nothing to act on, so
                   no state and no ResizeObserver is needed to switch it off.
                   THIS IS NOT A COLOUR. A mask reads only the ALPHA channel —
                   `#000` here is opaque-ness, not black — so it carries no
                   token, cannot fall through to stock Tailwind, and is
                   identical under all four themes. Spelled in `style` rather
                   than as an arbitrary utility because the value needs real
                   whitespace inside `calc()`, which Tailwind's underscore
                   escaping makes unreadable.
                2. TRAILING PADDING EQUAL TO THE FADE, on the group below, so
                   that at the end of the scroll range the final chip sits
                   clear of the ramp and is drawn at full opacity. Without it
                   the last chip would stay half-faded with nothing left to
                   scroll to, which is its own small lie.
                3. SNAP, `proximity` not `mandatory`: a flick lands a chip
                   against the left edge rather than mid-chip, so the resting
                   state is whole chips plus one fading partial. `proximity`
                   leaves a deliberate small scroll alone; `mandatory` would
                   fight the thumb.

                No scrollbar, in either engine, and the page itself still does
                not scroll sideways — none of the three changes layout
                width. */}
            <div
              className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{
                scrollSnapType: 'x proximity',
                maskImage: CHIP_FADE,
                WebkitMaskImage: CHIP_FADE,
              }}
            >
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={2}
                value={chipValue}
                /* Radix single-select emits '' when the pressed item is pressed
                   again. Here that is a real state — it means All — so unlike
                   AccountScreenV2's SegmentedPicker it is honoured rather than
                   ignored. */
                onValueChange={(v) => setStateChip(!v || v === 'all' ? [] : [v])}
                aria-label="Filter by valve state"
                /* `gap-[6px]` spelled explicitly as well as `spacing={2}`:
                   ToggleGroup's own gap is the arbitrary
                   `gap-[--spacing(var(--gap))]`, and a chip row that silently
                   lost its gutter would read as the segmented bar this is
                   deliberately not. twMerge keeps the later class. */
                className="gap-[6px]"
                style={{ paddingRight: CHIP_FADE_WIDTH }}
              >
                {/* NEW COPY: "All". The four after it are VALVE_CATEGORIES'. */}
                <ToggleGroupItem value="all" className={CHIP}>
                  All
                </ToggleGroupItem>
                {VALVE_CATEGORIES.filter((c) => summary.byCategory[c.key].total > 0).map((c) => (
                  <ToggleGroupItem key={c.key} value={c.key} className={CHIP}>
                    <Swatch categoryKey={c.key} />
                    {c.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFilterOpen(true)}
              /* NEW COPY */
              aria-label={activeFilters > 0 ? `Filters — ${activeFilters} active` : 'Filters'}
              className={cn('shrink-0', activeFilters > 0 && 'border-primary text-primary')}
            >
              <SlidersHorizontal aria-hidden="true" />
              Filters
              {activeFilters > 0 ? (
                <Badge className="ml-0.5 px-1.5 tabular-nums">{activeFilters}</Badge>
              ) : null}
            </Button>
          </div>
        ) : null}

        {/* SELECT ALL MATCHING — numbered, never bare, and given its own
            bordered bar. It is the most dangerous control on the screen: one
            press stages every matching valve, so it gets the weight of a
            decision rather than the weight of a caption. */}
        {hasValves ? (
          <div
            className={cn(
              'flex w-full shrink-0 items-center gap-[10px] rounded-lg border border-solid border-border bg-card px-[10px] py-[8px]',
              selectableFiltered.length > 0 && 'cursor-pointer',
            )}
            data-name="valve-select-all"
            onClick={(e) => {
              /* The whole bar is the target. The box handles its own press —
                 without this guard a click on it would toggle twice and land
                 back where it started. A `<label htmlFor>` would not work here:
                 a label only forwards to a LABELABLE element, and Radix's
                 Checkbox is a `<button role="checkbox">`. */
              if (e.target?.closest?.('[data-slot="checkbox"]')) return
              if (selectableFiltered.length > 0) toggleAllMatching()
            }}
          >
            <Checkbox
              checked={allMatchingSelected ? true : someMatchingSelected ? 'indeterminate' : false}
              onCheckedChange={toggleAllMatching}
              disabled={selectableFiltered.length === 0}
              /* NEW COPY. The NUMBER is the point — a bare "Select all" whose
                 scope is ambiguous is the footgun this label exists to close.
                 It counts SELECTABLE matches: a "No valve installed" row can
                 never join a selection. */
              aria-label={`Select all ${selectableFiltered.length} matching`}
              aria-describedby={unselectableFiltered > 0 ? selectAllNoteId : undefined}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <span className="truncate text-[14px] font-semibold leading-[20px] text-foreground">
                {`Select all ${selectableFiltered.length} matching`}
              </span>
              {/* NEW COPY, AND THE WHOLE POINT OF THIS LINE: the rows that are
                  drawn but CANNOT be selected are accounted for, not silently
                  absent from the number above. "No valve installed" is
                  `VALVE_CATEGORIES`' own word, quoted verbatim — it is the
                  only reason a drawn row is unselectable (`isSelectable`), so
                  the sentence can name the reason instead of gesturing at it.
                  Nothing is shown when every drawn row is selectable: then the
                  number above already covers all of them and a second line
                  would be noise on the screen's most dangerous control. */}
              {unselectableFiltered > 0 ? (
                <span
                  id={selectAllNoteId}
                  className="text-[12px] leading-[16px] text-muted-foreground"
                >
                  {`${unselectableFiltered} of ${filtered.length} rows shown can’t be selected — No valve installed`}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ── THE ONE SCROLLING REGION ──────────────────────────────────── */}
        <div
          className="w-full pb-[8px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
          data-name="valve-rows"
        >
          {result ? <ResultBanner result={result} onDismiss={() => setResult(null)} /> : null}

          {summary.total === 0 ? (
            /* NEW COPY. An empty scope is a real state — the drawer
               deliberately keeps locations with no systems — and saying so is
               the whole reason a non-matching name does not fall back to the
               fleet. */
            <p className="px-[4px] py-[24px] text-center text-[14px] leading-[20px] text-muted-foreground">
              {`Nothing in ${scopeLabel}. No systems are scoped here, so there is nothing to command.`}
            </p>
          ) : !hasValves ? (
            /* NEW COPY. "metering-only" is the word ValveManagementCard uses
               for the same fact, kept identical so the two surfaces agree. */
            <Card className="w-full py-4" data-name="valve-empty">
              <CardContent className="flex flex-col gap-[6px]">
                <p className="text-[14px] font-medium leading-[20px] text-foreground">
                  No valves in this scope.
                </p>
                <p className="text-[13px] leading-[18px] text-muted-foreground">
                  {`All ${summary.total} ${plural(summary.total, 'system is', 'systems are')} metering-only — there is nothing here to open or close.`}
                </p>
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            /* NEW COPY */
            <p className="px-[4px] py-[24px] text-center text-[14px] leading-[20px] text-muted-foreground">
              No systems match this filter.
            </p>
          ) : (
            <>
              <ul className="flex w-full flex-col">
                {shown.map((s, i) => (
                  <SystemRow
                    key={s.id}
                    system={s}
                    separated={i > 0}
                    checked={selectedIds.has(s.id)}
                    onToggle={() => toggle(s.id)}
                  />
                ))}
              </ul>

              {filtered.length > shown.length ? (
                /* SAY WHAT IS NOT DRAWN. A silent truncation reads as "this is
                   everything" when it is not. The first cut said it in two
                   sentences that read like a code comment; the FACT is the
                   same and the words are fewer. NEW COPY. */
                <div className="flex flex-col items-center gap-[8px] px-[4px] pt-[14px]">
                  <p className="text-[12px] leading-[16px] text-muted-foreground">
                    {`Showing ${shown.length} of ${filtered.length} · select-all covers all ${selectableFiltered.length}`}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRenderLimit((n) => n + PAGE_SIZE)}
                  >
                    {`Show ${Math.min(PAGE_SIZE, filtered.length - shown.length)} more`}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* ── THE ACTION BAR ────────────────────────────────────────────────
            THE NUMBER ON EACH BUTTON IS THAT ACTION'S `willAct`, never the
            selection. When they differ the line above states the difference on
            its face, here, before the confirm sheet. A primary and a
            secondary, not two slabs — see the header. */}
        {showActionBar ? (
          <div
            className="flex w-full shrink-0 flex-col gap-[8px] rounded-lg border border-solid border-border bg-card px-[10px] py-[10px]"
            data-name="valve-action-bar"
          >
            <p className="text-[13px] leading-[18px] text-foreground">
              {/* NEW COPY */}
              <span className="font-semibold">{`${selectedCount} selected`}</span>
              {hiddenSelected > 0 ? (
                <span className="text-muted-foreground">{` · ${hiddenSelected} hidden by the filter`}</span>
              ) : null}
              {blockedSelected.length > 0 ? (
                <span className="text-muted-foreground">{` · ${excludedSentence(blockedSelected)}`}</span>
              ) : null}
            </p>
            <div className="flex w-full items-center gap-[8px]">
              <Button
                type="button"
                /* THE VARIANT IS `destructive`, AND THE FOOTPRINT IS NOT A
                   SLAB. This control shuts water off in occupied buildings.
                   Plain primary said nothing about that — it was the same
                   blue as every other action in the app — and the
                   full-width saturated red block it replaced said it far too
                   loudly, as a wall of colour sitting above a disabled twin.

                   The design system's own answer is the `destructive` Button
                   variant (Figma set 6716:46634, which carries it in every
                   size); this product expresses danger through that variant
                   rather than through a red dialog, and there is no
                   destructive AlertDialog and no type-to-confirm anywhere in
                   the file. The repo had already WRITTEN DOWN that this is
                   the button it means: `ValveManagementCard.jsx:721` keeps
                   the card's entry button off `destructive` because "`that
                   red is reserved for the control that actually shuts water
                   off, and that control is on the screen this opens`", and a
                   test pins it. This is that control.

                   So: the real variant, at content width instead of
                   `flex-1`. Same ink, a third of the area — unmistakable
                   without being a wall. It still reads as the primary against
                   an `outline` secondary: filled beats hollow, and its label
                   is the longer of the two.

                   GOV.UK: "do not only rely on the red colour of a warning
                   button to communicate the serious nature of the action."
                   Three non-colour cues carry it here. The COUNT is in the
                   label, so the thumb passes over the number to commit and
                   the control is polymorphic, which is what defeats
                   habituation. The GLYPH is `DropletOff` — water, stopped,
                   which is the physical act rather than a generic hazard
                   triangle; `aria-hidden`, so the accessible name stays
                   exactly `Close N valves`. And the LINE ABOVE already states
                   the selection and every exclusion before the sheet is ever
                   opened. */
                variant="destructive"
                className="shrink-0"
                disabled={closeTargets.willAct.length === 0}
                onClick={() => setPending({ action: 'close' })}
              >
                <DropletOff aria-hidden="true" />
                {`Close ${closeTargets.willAct.length} ${plural(closeTargets.willAct.length, 'valve', 'valves')}`}
              </Button>
              {/* THE SECONDARY, AND IT IS PUSHED AWAY FROM THE PRIMARY. The
                  two are not equals in this moment — usually one of them is
                  disabled — and sitting them shoulder to shoulder at equal
                  width was what made them look like a pair of choices. `ml-auto`
                  puts the gap of the bar between them, so the reach to Open is
                  a deliberate one and the red one is not something the thumb
                  brushes on its way past. */}
              <Button
                type="button"
                variant="outline"
                className="ml-auto shrink-0"
                disabled={openTargets.willAct.length === 0}
                onClick={() => setPending({ action: 'open' })}
              >
                {`Open ${openTargets.willAct.length}`}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <ValveFilterSheet
        open={filterOpen}
        groups={groups}
        selection={filter}
        onApply={applyFilter}
        onClose={() => setFilterOpen(false)}
      />

      {/* The confirmation. `absolute inset-0` inside this page — no portal. Its
          ~800ms arming delay, its Escape-to-cancel and its exclusion buckets
          sitting ABOVE the confirm button are all deliberate, and nothing here
          works around any of them. */}
      <BulkValveConfirmSheet
        action={pending ? pending.action : null}
        scopeLabel={scopeLabel}
        /* ALWAYS 'selection', on every route this screen serves. It acts over
           what the user ticked, never over a whole scope — that is what the
           screen IS — so neither of the sheet's scope-wide sentences is ever
           true here, scoped route or unscoped. The old `scopeKind` derivation
           ('location' | 'account', from which half of the name match hit) is
           gone with the workaround it fed: it had exactly one consumer, which
           was that sentence, and the sentence no longer wants it. */
        scopeKind="selection"
        willActCount={pendingTargets ? pendingTargets.willAct.length : 0}
        offlineSystems={
          pendingTargets
            ? pendingTargets.skipped.offline.map((s) => ({
                id: s.id,
                name: s.name,
                /* NEW COPY: the "Last seen " prefix. `formatLastSeen` returns
                   'Unknown' for a missing timestamp and "Last seen Unknown" is
                   worse than the sheet's own fallback word, so that case falls
                   through to it. */
                lastSeenLabel: s.lastSeen ? `Last seen ${formatLastSeen(s.lastSeen)}` : 'Offline',
              }))
            : []
        }
        noValveCount={pendingTargets ? pendingTargets.skipped.noValve.length : 0}
        faultedCount={pendingTargets ? pendingTargets.skipped.faulted.length : 0}
        closingCount={pendingTargets ? pendingTargets.skipped.closing.length : 0}
        alreadyInStateCount={pendingTargets ? pendingTargets.skipped.alreadyInState.length : 0}
        onConfirm={commit}
        onCancel={() => setPending(null)}
      />

      <WintSidebarV2 open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <TabBar activeTab="home" />
    </div>
  )
}

/* ── Small pieces, below the screen so the screen reads top-down ────────── */

/* The chip geometry for a `<ToggleGroupItem>`. `shrink` has to be spelled to
   beat the item's own `shrink-0` — the same trick `AccountScreenV2.jsx:272`
   records — and the pressed treatment is that file's, so the two segmented
   controls in this app look like one control. */
const CHIP = cn(
  'h-[32px] shrink-0 snap-start gap-[6px] rounded-full px-[12px] cursor-pointer',
  'text-[12px] font-medium leading-[16px] text-foreground',
  'data-[state=on]:border-primary data-[state=on]:bg-secondary data-[state=on]:text-primary',
)

/* NEW COPY, all of it. The exclusion clause on the action bar's face, built
   from `blockedReasonOf`'s answer for each selected system — never re-derived.
   Phrased in systems, because that is what this screen counts
   (`valveScope.js`: a system is not one valve). */
function excludedSentence(blocked) {
  const counts = { offline: 0, 'no-valve': 0, error: 0, closing: 0 }
  for (const s of blocked) {
    const reason = blockedReasonOf(s)
    if (reason && reason in counts) counts[reason] += 1
  }
  const parts = []
  if (counts.offline) parts.push(`${counts.offline} offline`)
  if (counts.error) parts.push(`${counts.error} in Valve Error`)
  if (counts.closing) parts.push(`${counts.closing} already closing`)
  if (counts['no-valve']) parts.push(`${counts['no-valve']} with no valve installed`)
  return `${parts.join(' · ')} excluded`
}

/* NEW COPY. "COMMANDED", never "closed": this app records a command and never
   hears back from the hardware, so "4 valves closed" would be exactly the
   false confidence the feature exists to prevent. The record is persistent and
   dismissible, not a toast. */
const BUCKET_WORD = {
  offline: 'offline',
  noValve: 'no valve installed',
  faulted: 'in Valve Error',
  closing: 'already closing',
  alreadyInState: 'already in that state',
}

function ResultBanner({ result, onDismiss }) {
  const verb = result.action === 'close' ? 'close' : 'open'
  const skippedCount = result.attemptedOver - result.commanded
  return (
    <Card role="status" className="mb-[10px] w-full gap-2 py-3" data-name="valve-result">
      <CardContent className="flex flex-col gap-[6px] px-3">
        <p className="text-[14px] font-medium leading-[20px] text-foreground">
          {result.commanded === 0
            ? `Nothing was commanded to ${verb}.`
            : `${result.commanded} ${plural(result.commanded, 'valve', 'valves')} commanded to ${verb}.`}
        </p>
        {skippedCount > 0 ? (
          <p className="text-[12px] leading-[16px] text-muted-foreground">
            {`${skippedCount} of ${result.attemptedOver} selected ${plural(skippedCount, 'was', 'were')} not commanded: ${result.buckets
              .map((b) => `${b.count} ${BUCKET_WORD[b.bucket]}`)
              .join(' · ')}.`}
          </p>
        ) : null}
        {!result.recorded ? (
          <p className="text-[12px] leading-[16px] text-muted-foreground">
            The command could not be recorded.
          </p>
        ) : null}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto self-start px-0 py-0"
          onClick={onDismiss}
        >
          Dismiss
        </Button>
      </CardContent>
    </Card>
  )
}
