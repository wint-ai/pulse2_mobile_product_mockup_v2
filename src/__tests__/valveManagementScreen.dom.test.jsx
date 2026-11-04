// @vitest-environment happy-dom
//
// ValveManagementScreen — the dedicated screen where valves are MANAGED:
// per-system select / deselect, filtering by location / valve state /
// connectivity, then one bulk open or close.
//
// WHAT THESE TESTS ARE FOR. The owner's binding requirement is a BELIEF, not a
// pixel: "we have a kind of an offline devices that Valve cannot be shut off
// ... to not let him think that this Valve will take place on this operation
// that he wants to." Plus: "We need to understand the context of systems."
// So the load-bearing assertions below are:
//   · the ACTION BUTTON'S NUMBER is `willAct`, and when an offline system is
//     in the selection that number is SMALLER than the selection — and the bar
//     says so on its face;
//   · every row carries the system's NAME *and* its LOCATION CONTEXT;
//   · an offline row is still selectable, shows its LAST-KNOWN state LABELLED
//     as last-known, and is named BY NAME in the confirm sheet;
//   · a no-valve row is `aria-disabled` and NOT `disabled`, with the reason in
//     its accessible name;
//   · SELECT-ALL AFTER FILTERING selects the filtered set, not everything.
//
// THE FIXTURES ARE THE REAL DATASET, deliberately, unlike
// valveManagementCard.dom.test.jsx which inlines its own. This file is about a
// SCREEN wired to a ROUTE, and the thing most worth pinning is that
// /valves/:locationName resolves the same scope /location/:locationName does.
// Every number below is therefore derived from `SYSTEMS` at run time rather
// than hardcoded, so a change to the catalog cannot make this file assert a
// stale count — only the SHAPE of the relationships is hardcoded.
//
// ── WHAT THIS FILE CANNOT TEST, AND DOES NOT PRETEND TO ──────────────────
// happy-dom has NO LAYOUT ENGINE, no `elementFromPoint` and no hit testing.
// `getBoundingClientRect()` is all zeros and `fireEvent.click(row)` dispatches
// straight at the node regardless of what is painted over it. So nothing here
// can catch: a 56px row that is actually 31px tall; the sticky action bar
// covering the last row; the scroll container failing to engage; the filter
// sheet's scrim failing to cover the page beneath it; or the dE 7.6
// deuteranopia pair (index.css:358) being legible in practice. What IS
// assertable is the ATOM that decides each of those, so that is what is
// pinned. The rest belongs in a browser and is reported as unverified.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, screen, within, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { UserProvider } from '@/context/UserContext'
import ValveManagementScreen from '@/v2/pages/ValveManagementScreen'
import { SYSTEMS } from '@/data/systems'
import { clearValveCommands, getBulkValveHistory } from '@/data/valveCommandStore'
import {
  VALVE_CATEGORIES,
  canActuate,
  isReachable,
  isSelectable,
  summariseValves,
  valveCategoryOf,
} from '@/v2/components/valveScope'

/* The sheet's inhibitive arming delay (BulkValveConfirmSheet.jsx:145). The
   screen does not pass `skipArmingDelay`, deliberately — the delay is the
   feature — so a test that confirms has to wait it out on fake timers, the
   same way bulkValveConfirmSheet.dom.test.jsx does. */
const ARMING_DELAY_MS = 800

/* ── real scopes from the dataset, never invented ───────────────────────── */

/** 320 Summit Blvd: 5 systems — 1 Valve Error, 1 Open-but-OFFLINE, 1 Open and
 *  reachable, 2 with no valve. The one scope where the exclusion is visually
 *  dramatic, which is exactly why the brief named it. */
const SCOPE = '320 Summit Blvd'
const inScope = (name) =>
  SYSTEMS.filter(
    (s) => s.l4Name === name || s.l3Name === name || s.l2Name === name || s.l1Name === name,
  )

const SCOPED = inScope(SCOPE)
const OFFLINE_SYS = SCOPED.find((s) => !isReachable(s) && valveCategoryOf(s) !== 'none')
const NO_VALVE_SYS = SCOPED.find((s) => valveCategoryOf(s) === 'none')
const ACTIONABLE_SYS = SCOPED.find((s) => canActuate(s) && s.valve === 'open')
const ERROR_SYS = SCOPED.find((s) => valveCategoryOf(s) === 'error')
/** The connectivity the scope's ONE Valve Error system is NOT, so that
 *  `state=error` plus this connectivity is guaranteed to match zero rows.
 *  Derived, never hardcoded — see the fixture note at the top of this file. */
const EMPTY_COMBO_CONNECTIVITY = isReachable(ERROR_SYS) ? 'Offline' : 'Online'

/** A scope with systems but ZERO valves. Picked by predicate, not by name, so
 *  it survives the catalog moving under this file. */
const ZERO_VALVE_SCOPE = ['45 Cedarline Way', '510 Lakeview Dr', '30 Dogwood Dr'].find((n) => {
  const list = inScope(n)
  return list.length > 0 && summariseValves(list).valveTotal === 0
})

/* ── console classification, after routeSmoke.dom.test.jsx ──────────────── */
const FATAL = [
  /element type is invalid/i,
  /is not defined/i,
  /is not a function/i,
  /cannot read propert/i,
  /rendered (more|fewer) hooks/i,
  /invalid hook call/i,
  /maximum update depth exceeded/i,
  /the above error occurred in/i,
  /each child in a list should have a unique/i,
  /validatedomnesting/i,
]
let captured = []

beforeEach(() => {
  captured = []
  localStorage.clear()
  sessionStorage.clear()
  clearValveCommands()
  /* pushBridge.publish POSTs to ntfy.sh over HTTP (pushBridge.js:130-137). The
     screen fires it after a write for the CROSS-DEVICE relay; this kill switch
     (pushBridge.js:117-120) keeps the suite off the network. The same-tab
     repaint does not go through it — see the screen's header. */
  localStorage.setItem('pulse2-bridge-disabled', '1')
  localStorage.setItem('pulse2-persona-id', 'wint-admin')
  for (const level of ['error', 'warn']) {
    vi.spyOn(console, level).mockImplementation((...args) => {
      captured.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '))
    })
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function expectNoReactError() {
  const bad = captured.filter((t) => FATAL.some((re) => re.test(t)))
  expect(bad).toEqual([])
}

/** Echoes the current path so a navigation assertion has something to read. */
function PathProbe() {
  const { pathname } = useLocation()
  return <div data-testid="path">{decodeURIComponent(pathname)}</div>
}

function renderAt(path, { entries } = {}) {
  const initialEntries = entries ?? [path]
  return render(
    <UserProvider>
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
        <PathProbe />
        <Routes>
          <Route path="/valves" element={<ValveManagementScreen />} />
          <Route path="/valves/:locationName" element={<ValveManagementScreen />} />
          <Route path="/location/:locationName" element={<div>LOCATION OVERVIEW</div>} />
          <Route path="/" element={<div>HOME</div>} />
        </Routes>
      </MemoryRouter>
    </UserProvider>,
  )
}

/* THE ROW IS THE <li data-valve-row>, and the control inside it is the shadcn
   <Checkbox>, which Radix renders as a `<button role="checkbox">` carrying
   `data-slot="checkbox"`. The two are queried separately on purpose: the ROW
   is what holds the name, the location context and the state badge, and the
   BOX is what holds the a11y state (`aria-checked`, `aria-disabled`). Pressing
   the row is what a user does, so that is what the interaction tests click. */
const rows = (container) => [...container.querySelectorAll('[data-valve-row]')]
const rowFor = (container, id) => container.querySelector(`[data-valve-row="${id}"]`)
const boxFor = (container, id) =>
  container.querySelector(`[data-valve-row="${id}"] [data-slot="checkbox"]`)
const actionBar = (container) => container.querySelector('[data-name="valve-action-bar"]')
const selectAllBar = (container) => container.querySelector('[data-name="valve-select-all"]')

/* ── THE ONE DOOR (2026-11-04) ────────────────────────────────────────────
   The owner, verbatim: "I want to hide everything under filters. I had it some
   of them are filters and some of them are not. Use the shadcn filters, don't
   invent something that looks from different app. Make search for locations,
   all the rest doesn't need any search. Make it easy to use."

   The valve-state chips used to sit ON the page beside the Filters button -
   the one filter outside the filter surface, and the row overflowed besides
   (measured at 643px of chips in a ~268px slot, which is the clipped chip in
   his screenshot). They are now a group INSIDE the shared
   `src/v2/components/FilterSheet.jsx`, which /alerts opened the same day, so
   the app has ONE filter pattern rather than two that look alike.

   TWO THINGS CHANGED SHAPE AND BOTH ARE PINNED BELOW RATHER THAN ASSUMED:
     · the surface has to be OPENED and the choice committed with APPLY, which
       is the draft/apply contract location and connectivity always obeyed;
     · a state option is a shadcn `Checkbox` row named `<state>, <n> systems`,
       not a radio chip. It is MULTI-select now - `Open` plus `Closed` in one
       pass was impossible before - and "nothing ticked" is how this app has
       always spelled "no constraint", so the old `All` chip has no successor
       and `noStateFilter()` below is what replaces reading it.

   EVERY ASSERTION STANDING BEHIND THESE HELPERS IS THE ONE IT ALWAYS WAS.
   Nothing about reach, counts, selection or the deep link is re-expressed -
   only the route to the control. */
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function openFilters() {
  fireEvent.click(screen.getByRole('button', { name: /^Filters/ }))
  return screen.getByRole('dialog', { name: 'Filter valves' })
}

/** One option box inside the open surface, by the word it starts with. The
 *  accessible name carries the count after a comma ("Open, 74 systems"), which
 *  is why this anchors on the comma rather than on an exact string - the
 *  fixtures are the real catalog and its counts move. */
const optionBox = (sheet, label) =>
  within(sheet).getByRole('checkbox', { name: new RegExp(`^${esc(label)},`) })

/** Open, tick one valve state, Apply. The old chip tap, in three gestures. */
function applyState(name) {
  const sheet = openFilters()
  fireEvent.click(optionBox(sheet, name))
  fireEvent.click(within(sheet).getByRole('button', { name: 'Apply filter' }))
}

/** Read a state option's ticked state without changing anything. Cancels
 *  rather than applies, so the act of LOOKING can never apply a filter. */
function readState(name) {
  const sheet = openFilters()
  const checked = optionBox(sheet, name).getAttribute('aria-checked')
  fireEvent.click(within(sheet).getByRole('button', { name: 'Cancel' }))
  return checked
}

/** The successor to "the All chip is pressed": NOTHING in the valve-state
 *  group is ticked, which is this app's empty-set-means-all rule. */
function noStateFilter() {
  const sheet = openFilters()
  const group = sheet.querySelector('[data-name="filter-group-state"]')
  const boxes = [...group.querySelectorAll('[data-slot="checkbox"]')]
  const none = boxes.length > 0 && boxes.every((b) => b.getAttribute('aria-checked') === 'false')
  fireEvent.click(within(sheet).getByRole('button', { name: 'Cancel' }))
  return none
}

/** Drive the confirm sheet all the way to DISPATCH, on fake timers.
 *
 *  The sheet's commit button no longer dispatches on click (2026-11-02): the
 *  click STARTS a cancel window — WCAG G164, "the user may amend or cancel a
 *  request" — and `onConfirm` fires when that countdown reaches zero, 8s at
 *  the small tier. THE SCREEN IS UNCHANGED by that and deliberately so: it
 *  still hands the sheet `onConfirm={commit}`, and it passes neither
 *  `skipArmingDelay` nor `skipHold`, for the same reason it never passed the
 *  first one — the delay IS the feature on the one control in this app that
 *  shuts water off in occupied buildings.
 *
 *  Advanced in ONE-SECOND STEPS rather than one big jump: the countdown
 *  schedules each next tick from an effect, and effects only flush at the end
 *  of an `act()`, so a single `advanceTimersByTime(9000)` would fire the first
 *  tick and then find nothing else scheduled. Stops as soon as the dispatch
 *  lands, and is bounded so a sheet that never dispatches fails the assertion
 *  rather than hanging. The sheet's tier constants are ITS business; this
 *  helper does not name them. */
function spendTheCancelWindow(container) {
  for (let i = 0; i < 40; i += 1) {
    if (container.querySelector('[data-name="valve-result"]')) return
    act(() => {
      vi.advanceTimersByTime(1000)
    })
  }
}

describe('ValveManagementScreen — routing and scope', () => {
  it('renders at /valves over the whole fleet', () => {
    const { container } = renderAt('/valves')
    expect(screen.getByRole('heading', { name: 'Valve management' })).toBeTruthy()
    expect(screen.getAllByText('All Accounts').length).toBeGreaterThan(0)
    // Paged, not unbounded — and it SAYS what it is not drawing.
    expect(rows(container).length).toBeLessThan(SYSTEMS.length)
    expect(screen.getByText(new RegExp(`Showing \\d+ of ${SYSTEMS.length}\\b`))).toBeTruthy()
    // and it says that select-all is NOT limited to the drawn rows
    expect(screen.getByText(/select-all covers all \d+/)).toBeTruthy()
    expectNoReactError()
  })

  it('renders at /valves/:locationName scoped to exactly that location', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    expect(rows(container).length).toBe(SCOPED.length)
    for (const s of SCOPED) expect(rowFor(container, s.id)).toBeTruthy()
    // and nothing from outside the scope
    const outside = SYSTEMS.find((s) => !SCOPED.includes(s))
    expect(rowFor(container, outside.id)).toBeNull()
    expectNoReactError()
  })

  it('a name that matches nothing is an EMPTY scope, not the fleet', () => {
    // HomeAllAccounts.jsx:545-549 — the opposite was a shipped bug.
    const { container } = renderAt('/valves/Nowhere%20At%20All')
    expect(rows(container).length).toBe(0)
    expect(screen.getByText(/Nothing in Nowhere At All/)).toBeTruthy()
    expect(actionBar(container)).toBeNull()
    expectNoReactError()
  })
})

describe('ValveManagementScreen — one row per system, with its context', () => {
  /* THE CONTEXT MOVED, 2026-11-02; IT WAS NOT DROPPED. The old row repeated
     `path · last known: X · Last seen Y` on a wrapping second line — 61px for
     EVERY row, with the same address restated for every system at it. The path
     is now drawn ONCE in the header of the LOCATION CARD that holds the run of
     rows it describes (redesign point 4, recut as cards 2026-11-03), which is
     what lets the row be one line and is most of why the list went from ~4.9
     visible rows to a browser-measured 10.
     The owner's requirement is unchanged and is asserted on both routes below:
     "We need to understand the context of systems." A sighted user reads the
     path off the card header; someone tabbing between checkboxes never sees
     that header, so it is ALSO spelled into each row's accessible name. */
  it('draws one row per system; the name is on the row and the location path is on its group header AND in its accessible name', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    expect(rows(container).length).toBe(SCOPED.length)

    for (const s of SCOPED) {
      const row = rowFor(container, s.id)
      expect(within(row).getByText(s.name)).toBeTruthy()

      // THE HEADER ABOVE THE RUN carries the path, once.
      const header = row.closest('section')?.querySelector('h2')
      expect(header).toBeTruthy()
      expect(header.textContent).toContain(s.l4Name)
      expect(header.textContent).toContain(s.l2Name)

      // AND THE ROW'S OWN ACCESSIBLE NAME still carries it, for the user who
      // never sees that header.
      const name = boxFor(container, s.id).getAttribute('aria-label')
      expect(name).toContain(s.name)
      expect(name).toContain(s.l4Name)
      expect(name).toContain(s.l2Name)
    }
    expectNoReactError()
  })

  /* ── THE 2026-11-03 PASS: ONE CARD PER LOCATION ────────────────────────
     The owner: "when we go to manage valves, this components looks kind of an
     odd... There looks a bit odd." Measured in a real browser at 393x852, the
     row list was the ONE surface in this app with no card surface at all: the
     rows sat directly on the `--app-bg` gradient under a full-bleed opaque
     white sticky band. Each location is now a house-chassis card.
     happy-dom has no layout engine, so what is assertable here is the CLASS
     that decides it — the pixels were checked in the browser. */
  it('every location group is a house-chassis card, not a bare run of rows', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    const cards = [...container.querySelectorAll('[data-name="valve-location-card"]')]
    expect(cards.length).toBeGreaterThan(0)
    // Every drawn row lives inside one of those cards; none is loose.
    expect(rows(container).length).toBe(SCOPED.length)
    for (const row of rows(container)) {
      expect(row.closest('[data-name="valve-location-card"]')).toBeTruthy()
    }
    for (const card of cards) {
      const cls = String(card.className)
      // The canonical chassis — `ValveManagementCard.jsx`'s CARD constant.
      expect(cls).toMatch(/\bbg-surface-card\b/)
      expect(cls).toMatch(/\bborder-card\b/)
      expect(cls).toMatch(/\brounded-\[18px\]/)
      expect(cls).toMatch(/\boverflow-hidden\b/)
      // The rules stop short of the corner rather than running into it.
      expect(cls).toMatch(/item-separator\]\]:mx-4/)
    }
    expectNoReactError()
  })

  /* STICKY WAS DROPPED, DELIBERATELY AND ON THE RECORD (2026-11-03).
     It is pinned by a test so it cannot come back by accident and so the
     reversal is visible to whoever next reads this file: the card's border is
     a stronger, always-present grouping cue than a floating band, and the
     chassis's own `overflow-hidden` — which is what clips the last row's hover
     fill to the 18px corner — makes an inner `position: sticky` INERT, because
     an `overflow: hidden` ancestor becomes the sticky element's scroll
     container and that box never scrolls. A header that reads as sticky in the
     source and does nothing in the browser is worse than an honest static one.
     `fixed` remains forbidden for the original reason: it would escape
     Phone.jsx's 393x852 overflow:hidden frame. */
  it('the group header is a quiet label inside the card — not sticky, never fixed', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    const header = container.querySelector('[data-name="valve-location-card"] h2')
    expect(header).toBeTruthy()
    const cls = String(header.className)
    expect(cls).not.toMatch(/\bsticky\b/)
    expect(cls).not.toMatch(/\bfixed\b/)
    // And it no longer paints an opaque full-bleed band of its own.
    expect(cls).not.toMatch(/\bbg-card\b/)
    expect(cls).not.toMatch(/\bborder-y\b/)
    // It IS the quiet in-card header: secondary ink, badge size.
    expect(cls).toMatch(/\btext-xs\b/)
    expect(cls).toMatch(/\btext-muted-foreground\b/)
    expectNoReactError()
  })

  /* THE THREE COLUMNS SHARE A CENTRE LINE. `ItemActions` carried `self-start`,
     which top-aligned the state readout against a centre-aligned checkbox and
     title — measured at 1.63px of rise per row, which reads as a wobble down a
     45px-row list. Measured at 0 after the fix. */
  it('the state readout is centred on the row, not top-aligned', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    const actions = [...container.querySelectorAll('[data-valve-row] [data-slot="item-actions"]')]
    expect(actions.length).toBe(SCOPED.length)
    for (const el of actions) {
      expect(String(el.className)).not.toMatch(/\bself-start\b/)
    }
    expectNoReactError()
  })

  /* ONE CARD TREATMENT ON THE SCREEN. While the list had no card surface, the
     selection strip was the only card-shaped thing on it — which made the
     inconsistency louder, not quieter. It now wears the same chassis. */
  it('the selection strip wears the same chassis as the location cards', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    const strip = container.querySelector('[data-name="valve-selection-strip"]')
    expect(strip).toBeTruthy()
    const cls = String(strip.className)
    expect(cls).toMatch(/\bbg-surface-card\b/)
    expect(cls).toMatch(/\bborder-card\b/)
    expect(cls).toMatch(/\brounded-\[18px\]/)
    // The old one-off treatment is gone.
    expect(cls).not.toMatch(/\brounded-xl\b/)
    expect(cls).not.toMatch(/\bshadow-sm\b/)
    expectNoReactError()
  })

  it('a no-valve row is aria-disabled with its reason in the accessible name, and is NOT disabled', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    const row = rowFor(container, NO_VALVE_SYS.id)
    const box = boxFor(container, NO_VALVE_SYS.id)

    expect(row.getAttribute('data-selectable')).toBe('false')
    expect(box.getAttribute('aria-disabled')).toBe('true')
    // A `disabled` control is skipped outright by some assistive tech, so the
    // user never learns WHY — which here is the most useful thing it says.
    expect(box.hasAttribute('disabled')).toBe(false)
    expect(box.disabled).toBe(false)
    expect(box.getAttribute('data-disabled')).toBeNull()

    const name = box.getAttribute('aria-label')
    expect(name).toContain('No valve installed')
    expect(name).toMatch(/not selectable/i)
    expect(name).toContain(NO_VALVE_SYS.name)

    // And pressing it — the row OR the box — selects nothing.
    fireEvent.click(row)
    fireEvent.click(box)
    expect(box.getAttribute('aria-checked')).toBe('false')
    expect(actionBar(container)).toBeNull()
    expectNoReactError()
  })

  it('an offline row shows its last-known state LABELLED as last-known, and stays selectable', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    const row = rowFor(container, OFFLINE_SYS.id)

    expect(row.textContent).toContain('Offline')
    /* Case-insensitive since 2026-11-02: the qualifier is `ValveStateReadout`'s
       now, and it spells it sentence-case at the head of its own phrase —
       "Last known: Open" — rather than mid-sentence on a context line. The
       BEHAVIOUR pinned here is unchanged and is the point: an offline row
       states a last-known reading AS last-known, never as a live one. */
    expect(row.textContent).toMatch(/[Ll]ast known:/)
    // the state word itself is VALVE_CATEGORIES', not a local invention
    expect(row.textContent).toContain('Open')
    expect(row.textContent).toMatch(/Last seen/)
    // the product never says "Unreachable"
    expect(row.textContent).not.toMatch(/unreachable/i)

    /* THE ENCODING BUG THAT THIS REDESIGN FIXED, pinned so it cannot come
       back. The old row drew `{reachable ? <StateBadge/> : <OfflineBadge/>}` —
       ONE slot — so an offline row showed NO VALVE STATE AT ALL, and tapping
       the "Open" filter produced rows badged "Offline", contradicting the
       filter that produced them. The two dimensions are now orthogonal and
       both are always present: position owns hue and the word, connectivity
       owns the word "Offline", the age, and the row's ink step. */
    const readout = row.querySelector('[data-slot="valve-state"]')
    expect(readout).toBeTruthy()
    expect(readout.getAttribute('data-state')).toBe(valveCategoryOf(OFFLINE_SYS))
    expect(readout.getAttribute('data-certainty')).toBe('last-known')
    // connectivity is NOT a second coloured dot: exactly one swatch in the row
    expect(row.querySelectorAll('[data-slot="valve-swatch"]').length).toBe(1)

    // Still selectable — the user may legitimately want it in the set.
    const box = boxFor(container, OFFLINE_SYS.id)
    expect(box.getAttribute('aria-disabled')).toBeNull()
    expect(box.getAttribute('role')).toBe('checkbox')
    fireEvent.click(row)
    expect(box.getAttribute('aria-checked')).toBe('true')
    expectNoReactError()
  })
})

describe('ValveManagementScreen — the number rule', () => {
  it('selecting a system updates the count and the action button shows willAct', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    expect(actionBar(container)).toBeNull()

    fireEvent.click(rowFor(container, ACTIONABLE_SYS.id))
    const bar = actionBar(container)
    expect(bar).toBeTruthy()
    expect(bar.textContent).toContain('1 selected')
    expect(within(bar).getByRole('button', { name: 'Close 1 valve' })).toBeTruthy()
    expectNoReactError()
  })

  it('an OFFLINE system in the selection makes willAct SMALLER than the selection, and the bar says so', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)

    fireEvent.click(rowFor(container, ACTIONABLE_SYS.id))
    fireEvent.click(rowFor(container, OFFLINE_SYS.id))

    const bar = actionBar(container)
    expect(bar.textContent).toContain('2 selected')
    // THE WHOLE POINT: the button's number is willAct (1), not the
    // selection (2).
    expect(within(bar).getByRole('button', { name: 'Close 1 valve' })).toBeTruthy()
    expect(within(bar).queryByRole('button', { name: 'Close 2 valves' })).toBeNull()
    // and the secondary says its own willAct, which here is 0 and disabled
    const openBtn = within(bar).getByRole('button', { name: /^Open \d+$/ })
    expect(openBtn.textContent).toBe('Open 0')
    expect(openBtn.disabled).toBe(true)
    // and the difference is stated on the bar's own face, before the sheet
    expect(bar.textContent).toContain('1 offline')
    expect(bar.textContent).toMatch(/excluded/)
    expectNoReactError()
  })

  it('lists the offline system BY NAME in the confirm sheet', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    fireEvent.click(rowFor(container, ACTIONABLE_SYS.id))
    fireEvent.click(rowFor(container, OFFLINE_SYS.id))
    fireEvent.click(within(actionBar(container)).getByRole('button', { name: 'Close 1 valve' }))

    const sheet = screen.getByRole('alertdialog')
    expect(within(sheet).getByText(new RegExp(OFFLINE_SYS.name))).toBeTruthy()
    // no portal: the sheet is inside the rendered container
    expect(container.contains(sheet)).toBe(true)
    expectNoReactError()
  })

  it('confirming records a COMMAND over willAct only, and says "commanded"', () => {
    vi.useFakeTimers()
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    fireEvent.click(rowFor(container, ACTIONABLE_SYS.id))
    fireEvent.click(rowFor(container, OFFLINE_SYS.id))
    fireEvent.click(within(actionBar(container)).getByRole('button', { name: 'Close 1 valve' }))

    // the sheet's inhibitive arming delay is the feature; wait it out
    act(() => {
      vi.advanceTimersByTime(ARMING_DELAY_MS + 50)
    })
    const sheet = screen.getByRole('alertdialog')
    /* THE TAP PATH IS NOW TWO ACTS BEHIND A DISCLOSURE. The sheet's
       primary commit is a slide (SlideToConfirm); the button these tests
       press is the SC 2.5.7 non-drag alternative, and below the top tier it
       lives behind the "Cannot slide?" escape hatch with the acknowledgement
       checkbox as the first of its two single-pointer acts. A single tap
       would satisfy the letter of 2.5.7 and destroy the control, which is
       why the button stays inert until the box is ticked. Open the hatch,
       tick, then press. */
    fireEvent.click(within(sheet).getByRole('button', { name: 'Cannot slide?' }))
    fireEvent.click(within(sheet).getByRole('checkbox'))
    fireEvent.click(within(sheet).getByRole('button', { name: /^Close 1 valve/ }))
    spendTheCancelWindow(container)

    const banner = container.querySelector('[data-name="valve-result"]')
    expect(banner).toBeTruthy()
    // "commanded", never "closed": this app records a command and never hears
    // back from the hardware.
    expect(banner.textContent).toContain('commanded to close')
    expect(banner.textContent).toMatch(/not commanded/)
    expect(banner.textContent).toContain('offline')
    expectNoReactError()
  })
})

describe('ValveManagementScreen — filtering and select-all', () => {
  it('a state filter narrows the rows', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    expect(rows(container).length).toBe(SCOPED.length)
    expect(noStateFilter()).toBe(true)

    applyState('Valve Error')
    const errored = SCOPED.filter((s) => valveCategoryOf(s) === 'error')
    expect(rows(container).length).toBe(errored.length)
    expect(rows(container).length).toBeLessThan(SCOPED.length)
    expect(readState('Valve Error')).toBe('true')
    expectNoReactError()
  })

  it('?state= seeds the state filter, and an unknown value falls back to All', () => {
    // The overview card deep-links in with ?state=<VALVE_CATEGORIES key>.
    const open = SCOPED.filter((s) => valveCategoryOf(s) === 'open')
    const a = renderAt(`/valves/${encodeURIComponent(SCOPE)}?state=open`)
    expect(rows(a.container).length).toBe(open.length)
    // The seeded state is ticked inside the surface...
    expect(readState('Open')).toBe('true')
    // ...and NAMED on the one control left on the page, so a user who lands on
    // 2 rows out of 5 can read why without opening anything.
    expect(
      a.container.querySelector('[data-name="filter-trigger-summary"]').textContent,
    ).toBe('Open')
    expect(screen.getByRole('button', { name: 'Filters (1 active)' })).toBeTruthy()
    cleanup()

    // An unknown value must NOT render an empty list — it falls back to All.
    const b = renderAt(`/valves/${encodeURIComponent(SCOPE)}?state=banana`)
    expect(rows(b.container).length).toBe(SCOPED.length)
    expect(noStateFilter()).toBe(true)
    // nothing to summarise, so no summary badge and the plain name
    expect(b.container.querySelector('[data-name="filter-trigger-summary"]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Filters' })).toBeTruthy()
    expectNoReactError()
  })

  it('filtering BY LOCATION narrows the rows, and every option carries its count', () => {
    const { container } = renderAt('/valves')
    const before = rows(container).length

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    const sheet = screen.getByRole('dialog', { name: 'Filter valves' })
    // no portal
    expect(container.contains(sheet)).toBe(true)

    const option = within(sheet).getByRole('checkbox', { name: new RegExp(`^${SCOPE}`) })
    // "A checkbox that silently returns nothing is the complaint this whole
    // tab started from" — SystemsFilterSheet.jsx:245-247. The count is drawn
    // beside the box, so the row around it is what carries the text. The row
    // is a shadcn <Item> now rather than a hand-rolled <li>.
    expect(option.closest('[data-slot="item"]').textContent).toContain(String(SCOPED.length))
    // ...and it is said aloud too, in this screen's own units.
    expect(option.getAttribute('aria-label')).toBe(
      `${SCOPE}, ${SCOPED.length} ${SCOPED.length === 1 ? 'system' : 'systems'}`,
    )

    fireEvent.click(option)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Apply filter' }))

    expect(rows(container).length).toBe(SCOPED.length)
    expect(rows(container).length).toBeLessThan(before)
    expectNoReactError()
  })

  it('SELECT ALL AFTER FILTERING selects the filtered set, not everything', () => {
    const { container } = renderAt('/valves')

    // Narrow to one location first.
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    const sheet = screen.getByRole('dialog', { name: 'Filter valves' })
    fireEvent.click(within(sheet).getByRole('checkbox', { name: new RegExp(`^${SCOPE}`) }))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Apply filter' }))

    const selectable = SCOPED.filter((s) => valveCategoryOf(s) !== 'none')
    // The control is NUMBERED — never a bare "Select all".
    const selectAll = screen.getByRole('checkbox', {
      name: `Select all ${selectable.length} matching`,
    })
    expect(selectAll.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(selectAll)
    expect(selectAll.getAttribute('aria-checked')).toBe('true')

    const bar = actionBar(container)
    expect(bar.textContent).toContain(`${selectable.length} selected`)
    // NOT the fleet: the whole fleet has far more selectable systems.
    const fleetSelectable = SYSTEMS.filter((s) => valveCategoryOf(s) !== 'none').length
    expect(selectable.length).toBeLessThan(fleetSelectable)
    expect(bar.textContent).not.toContain(`${fleetSelectable} selected`)
    expectNoReactError()
  })

  it('select-all goes mixed when only some of the matching set is selected', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    fireEvent.click(rowFor(container, ACTIONABLE_SYS.id))

    const selectable = SCOPED.filter((s) => valveCategoryOf(s) !== 'none')
    const selectAll = screen.getByRole('checkbox', {
      name: `Select all ${selectable.length} matching`,
    })
    // ARIA mixed-checkbox convention.
    expect(selectAll.getAttribute('aria-checked')).toBe('mixed')
    expectNoReactError()
  })

  it('a selection hidden by a later filter is kept, and the bar says how many', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    fireEvent.click(rowFor(container, ACTIONABLE_SYS.id))
    expect(actionBar(container).textContent).toContain('1 selected')

    // Narrow to a state the selected system is not in.
    applyState('Valve Error')
    expect(rowFor(container, ACTIONABLE_SYS.id)).toBeNull()

    const bar = actionBar(container)
    expect(bar.textContent).toContain('1 selected')
    expect(bar.textContent).toContain('1 hidden by the filter')
    expectNoReactError()
  })
})

describe('ValveManagementScreen — empty states and chrome', () => {
  it('a scope with ZERO valves renders an honest empty state and no action bar', () => {
    expect(ZERO_VALVE_SCOPE).toBeTruthy()
    const { container } = renderAt(`/valves/${encodeURIComponent(ZERO_VALVE_SCOPE)}`)

    expect(screen.getByText('No valves in this scope.')).toBeTruthy()
    expect(screen.getByText(/metering-only/)).toBeTruthy()
    expect(actionBar(container)).toBeNull()
    // no select-all either — there is nothing it could widen to
    expect(screen.queryByRole('checkbox', { name: /^Select all/ })).toBeNull()
    expectNoReactError()
  })

  it('back returns to where the user came from — and it is BACK, never an X', () => {
    const { container } = renderAt(null, {
      entries: [`/location/${SCOPE}`, `/valves/${SCOPE}`],
    })
    expect(screen.getByTestId('path').textContent).toBe(`/valves/${SCOPE}`)

    const back = screen.getByRole('button', { name: 'Back' })
    expect(back).toBeTruthy()
    // "x and back can't live in parallel, only one exists."
    expect(within(container).queryByRole('button', { name: /^close$/i })).toBeNull()

    fireEvent.click(back)
    expect(screen.getByTestId('path').textContent).toBe(`/location/${SCOPE}`)
    expectNoReactError()
  })

  it('nothing escapes the phone frame — no portal, no fixed positioning', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)

    // Open both sheets in turn and assert each renders INSIDE the container,
    // mirroring accountScreenV2.dom.test.jsx:344.
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    const filterSheet = screen.getByRole('dialog', { name: 'Filter valves' })
    expect(container.contains(filterSheet)).toBe(true)
    expect(filterSheet.className).toMatch(/\babsolute\b/)
    expect(filterSheet.className).toMatch(/\binset-0\b/)
    expect(filterSheet.className).not.toMatch(/\bfixed\b/)
    fireEvent.click(within(filterSheet).getByRole('button', { name: 'Cancel' }))

    fireEvent.click(rowFor(container, ACTIONABLE_SYS.id))
    fireEvent.click(within(actionBar(container)).getByRole('button', { name: 'Close 1 valve' }))
    const confirm = screen.getByRole('alertdialog')
    expect(container.contains(confirm)).toBe(true)

    for (const el of container.querySelectorAll('[style]')) {
      expect(el.getAttribute('style') || '').not.toMatch(/position:\s*fixed/)
    }
    expectNoReactError()
  })

  it('every valve swatch keeps its text label — the secondary encoding is mandatory', () => {
    /* index.css:358-367: --valve-error against --valve-open is dE 7.6 under
       deuteranopia, legal ONLY with secondary encoding; under `contrast`
       --valve-open and --valve-closed are two greens.

       THE SECONDARY ENCODING IS THE WORD, AND SINCE 2026-11-02 IT IS THE WORD
       ALONE. The `<ValveStatus>` glyph was dropped rather than recoloured,
       because it was CONTRADICTING the swatch it sat 6px from: that component
       is deliberately non-themeable (26 frozen paint attributes, the Figma
       export verbatim), and for the same state the two disagreed — blue glyph
       for Open beside a green swatch, and the error glyph was the
       `--destructive` red that index.css:376-381 explicitly rejected for this
       palette as dE 2.3 from the open green under deuteranopia. Two encodings
       of one fact that disagree are worse than one encoding. The word is also
       the only cue that survives at 6px, in every theme, and in a screen
       reader — so `ValveStateReadout` has no prop and no variant that removes
       it, and that is what is pinned here. See that file's header in full. */
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    for (const s of SCOPED) {
      if (!isReachable(s)) continue
      const row = rowFor(container, s.id)
      const key = valveCategoryOf(s)
      const label = { error: 'Valve Error', open: 'Open', closed: 'Closed', none: 'No valve installed' }[key]
      // the WORD is present…
      expect(row.textContent).toContain(label)
      // …beside exactly one swatch, which carries the key as data
      const readout = row.querySelector('[data-slot="valve-state"]')
      expect(readout).toBeTruthy()
      expect(readout.getAttribute('data-state')).toBe(key)
      expect(readout.getAttribute('data-certainty')).toBe(key === 'none' ? 'not-applicable' : 'live')
      expect(row.querySelectorAll('[data-slot="valve-swatch"]').length).toBe(1)
    }
    expectNoReactError()
  })
})

/* The three refinements the owner ruled on, pinned so they cannot drift back.
   Each is about a number or a signal the user reads BEFORE committing, which
   is the only moment this screen can still help. */

describe('ValveManagementScreen - the select-all control says exactly what it selects', () => {
  it('states the rows it cannot select instead of a bare row count beside the number', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    const bar = selectAllBar(container)
    expect(bar).toBeTruthy()

    const selectable = SCOPED.filter((s) => valveCategoryOf(s) !== 'none')
    const unselectable = SCOPED.length - selectable.length
    expect(unselectable).toBeGreaterThan(0)

    // The control still states WHAT IT SELECTS, with its number.
    expect(bar.textContent).toContain(`Select all ${selectable.length} matching`)

    /* AND THE REST OF THE DRAWN ROWS ARE ACCOUNTED FOR. The bar used to carry
       a `5 rows` badge beside `Select all 3 matching`: two numbers of
       different kinds, adjacent, with nothing saying which was which. The
       badge is gone and the difference is a sentence naming the rows and the
       reason, in VALVE_CATEGORIES' own words. */
    expect(bar.textContent).toContain(
      `${unselectable} of ${SCOPED.length} rows shown can\u2019t be selected - No valve installed`,
    )
    // the standalone row-count badge is gone
    expect(bar.textContent).not.toMatch(/\d+ rows$/)
    // and the copy is literal: never "No valve", never "Fault"
    expect(bar.textContent).not.toMatch(/No valve(?! installed)/)
    expectNoReactError()
  })

  it('says nothing extra when every drawn row can be selected', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    // Narrow to a state whose rows are all selectable.
    applyState('Open')

    const bar = selectAllBar(container)
    expect(bar.textContent).toMatch(/^Select all \d+ matching$/)
    expect(bar.textContent).not.toMatch(/can\u2019t be selected/)
    expectNoReactError()
  })

  it('still means select-all-MATCHING, not select-all-rendered, and keeps its count', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    const selectable = SCOPED.filter((s) => valveCategoryOf(s) !== 'none')

    const selectAll = screen.getByRole('checkbox', {
      name: `Select all ${selectable.length} matching`,
    })
    fireEvent.click(selectAll)
    expect(actionBar(container).textContent).toContain(`${selectable.length} selected`)
    expectNoReactError()
  })
})

/* ── THE 2026-11-02 REDESIGN ─────────────────────────────────────────────
   The owner: "once someone wants to manage valves, the UI looks very odd...
   It needs to be much more clear, much more easy to understand to open, close
   the valves, to see statuses. Currently it's kind of a mess. It needs to be
   much more simple."

   The measured problem was 509px of fixed chrome in 808px of usable frame —
   ~4.9 visible rows for a 103-system fleet, i.e. 60% of the screen was
   furniture. The assertions below pin the structural decisions that bought
   the rows back, so none of them can be undone by a later tightening. They
   are all STRUCTURE, never geometry: happy-dom has no layout engine and
   `getBoundingClientRect()` is all zeros, so this file cannot and does not
   assert a single pixel. */
describe('ValveManagementScreen - the counts and the filter are one control', () => {
  it('each state option carries its own count, and the summary card that drew them twice is gone', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    const summary = summariseValves(SCOPED)
    const sheet = openFilters()

    /* The category list used to be drawn THREE times before the user reached a
       row: the summary card's legend, the chip row, and the filter sheet's
       "Valve state" group. UK Analysis Function: "Do not use a key, label the
       categories themselves." So the control IS the readout and IS the filter.
       WHERE that one drawing lives moved on 2026-11-04 - from the page to
       inside the filter surface - and the rule it exists for did not: the
       counts and the filter are still ONE control and there is still exactly
       one of it. */
    let summed = 0
    for (const c of VALVE_CATEGORIES) {
      const total = summary.byCategory[c.key].total
      if (total === 0) continue
      summed += total
      const box = optionBox(sheet, c.label)
      // The count is beside the word, on the row.
      expect(box.closest('[data-slot="item"]').textContent).toContain(String(total))
      // ...and in the accessible name, in units, so it is not read as a digit
      // glued to the word. Copy standard §4: never let two counts abut.
      expect(box.getAttribute('aria-label')).toBe(
        `${c.label}, ${total} ${total === 1 ? 'system' : 'systems'}`,
      )
      // THE WORD IS NEVER DROPPED. index.css:358-367 - --valve-error against
      // --valve-open is dE 7.6 under deuteranopia, legal ONLY with secondary
      // encoding, and the word is that encoding.
      expect(box.closest('[data-slot="item"]').textContent).toContain(c.label)
    }

    /* THE SCOPE TOTAL IS STILL DERIVABLE, which is the whole reason the `none`
       category keeps a filter of its own: "a breakdown missing a part is a lie
       about the whole". The `All 103` chip that used to state it outright is
       gone with the chip row - flagged to the owner - but every part is here
       and they sum to it. */
    expect(summed).toBe(summary.total)

    // The 166px card — the single largest piece of chrome — is gone.
    expect(container.querySelector('[data-name="valve-summary"]')).toBeNull()
    expectNoReactError()
  })

  it('draws the four category words EXACTLY ONCE, and it is inside the one filter surface', () => {
    /* RE-EXPRESSED 2026-11-04, NOT RELAXED. This test used to assert that the
       sheet does NOT carry a "Valve state" group, because at the time the
       chips were on the page and a group here would have been the category
       list's THIRD drawing. The owner has since moved every filter behind one
       door - "I want to hide everything under filters" - so the sheet is now
       where that ONE drawing lives. The invariant being pinned is unchanged:
       the four words appear once on the way to a row, never two or three
       times. */
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)

    // On the page at rest: no state control at all, and exactly ONE control
    // on the filter row - the shared trigger. "Some of them are filters and
    // some of them are not" is what that pins against.
    expect(screen.queryByRole('radio')).toBeNull()
    expect(container.querySelector('[data-name="filter-group-state"]')).toBeNull()
    const row = container.querySelector('[data-name="valve-filter-row"]')
    expect(row.querySelectorAll('button').length).toBe(1)
    expect(row.querySelector('[data-name="valve-filter-trigger"]')).toBeTruthy()

    const sheet = openFilters()
    // All three axes are first-class here, and the state group is one of them.
    expect(within(sheet).getByText('Valve state')).toBeTruthy()
    expect(within(sheet).getByText('Location')).toBeTruthy()
    expect(within(sheet).getByText('Connectivity')).toBeTruthy()

    // Each category word is drawn ONCE inside the surface, not once per group.
    for (const c of VALVE_CATEGORIES) {
      if (summariseValves(SCOPED).byCategory[c.key].total === 0) continue
      expect(
        within(sheet).getAllByRole('checkbox', { name: new RegExp(`^${esc(c.label)},`) }).length,
      ).toBe(1)
    }
    expectNoReactError()
  })
})

/* ── THE 2026-11-04 PASS - ONE DOOR, AND A SEARCH BEHIND IT ──────────────
   The owner, verbatim: "I want to hide everything under filters. I had it some
   of them are filters and some of them are not. Use the shadcn filters, don't
   invent something that looks from different app. Make search for locations,
   all the rest doesn't need any search. Make it easy to use."

   Four instructions, four groups of assertions. The surface itself is the
   shared `src/v2/components/FilterSheet.jsx`, so these pin what THIS SCREEN
   asks of it - the three axes, the search on exactly one of them, and the
   draft/apply contract holding over a filter that can stop water. */
describe('ValveManagementScreen - the one filter door', () => {
  const locationGroup = (sheet) => sheet.querySelector('[data-name="filter-group-location"]')
  const optionRows = (group) => [...group.querySelectorAll('[data-slot="item"]')]

  it('opens the surface from the one control on the row, inside the frame', () => {
    const { container } = renderAt('/valves')

    const row = container.querySelector('[data-name="valve-filter-row"]')
    expect(row).toBeTruthy()
    // ONE control on the row. The chip scroller beside it is gone.
    expect(row.querySelectorAll('button').length).toBe(1)
    expect(container.querySelector('[data-slot="toggle-group"]')).toBeNull()

    const sheet = openFilters()
    // NO PORTAL: Phone.jsx is a fixed 393x852 overflow-hidden frame, so a
    // Radix Popover/Dialog/Sheet would paint outside it.
    expect(container.contains(sheet)).toBe(true)
    expect(sheet.className).toMatch(/\babsolute\b/)
    expect(sheet.className).toMatch(/\binset-0\b/)
    expect(sheet.className).not.toMatch(/\bfixed\b/)
    expectNoReactError()
  })

  it('searches LOCATIONS only, narrows the list, and says that it is narrowed', () => {
    renderAt('/valves')
    const sheet = openFilters()

    // "all the rest doesn't need any search" - exactly one search box, and it
    // is the one over the long list.
    const boxes = within(sheet).getAllByRole('searchbox')
    expect(boxes.length).toBe(1)
    expect(locationGroup(sheet).contains(boxes[0])).toBe(true)
    expect(boxes[0].getAttribute('aria-label')).toBe('Search locations')

    const before = optionRows(locationGroup(sheet)).length
    expect(before).toBeGreaterThan(5)

    fireEvent.change(boxes[0], { target: { value: 'harborview' } })

    const after = optionRows(locationGroup(sheet))
    expect(after.length).toBeGreaterThan(0)
    expect(after.length).toBeLessThan(before)
    for (const r of after) expect(r.textContent.toLowerCase()).toContain('harborview')

    /* A FILTERED LIST SAYS IT IS FILTERED. Copy standard §4 - a silent cut
       reads as "this is everything", and here it would read as "this account
       only has four locations". */
    const note = locationGroup(sheet).querySelector('[data-name="filter-search-note-location"]')
    expect(note.textContent).toBe(`Showing ${after.length} of ${before}`)

    // A term that matches nothing says so rather than drawing an empty box.
    fireEvent.change(boxes[0], { target: { value: 'zzzzz' } })
    expect(optionRows(locationGroup(sheet)).length).toBe(0)
    expect(within(sheet).getByText('No locations match this search.')).toBeTruthy()
    expectNoReactError()
  })

  it('the search narrows what is DRAWN, never what is PICKED', () => {
    /* The dangerous version of a search over a filter: you tick a location,
       type something that hides it, press Apply, and the filter you committed
       is not the one you built. */
    const { container } = renderAt('/valves')
    const sheet = openFilters()

    const option = within(sheet).getByRole('checkbox', { name: new RegExp(`^${SCOPE}`) })
    fireEvent.click(option)

    const search = within(sheet).getByRole('searchbox', { name: 'Search locations' })
    fireEvent.change(search, { target: { value: 'harborview' } })
    // It is off screen now...
    expect(within(sheet).queryByRole('checkbox', { name: new RegExp(`^${SCOPE}`) })).toBeNull()

    fireEvent.click(within(sheet).getByRole('button', { name: 'Apply filter' }))
    // ...and still the filter that was applied.
    expect(rows(container).length).toBe(SCOPED.length)
    expectNoReactError()
  })

  it("a group's select-all reaches the options on screen, which under a search is fewer", () => {
    /* THE NUMBER ON A CONTROL IS WHAT THE CONTROL WILL DO. A select-all that
       silently swept in thirteen hidden locations would be the same class of
       footgun this screen exists to close one level up. */
    const { container } = renderAt('/valves')
    const sheet = openFilters()

    const allLocations = optionRows(locationGroup(sheet)).length
    const search = within(sheet).getByRole('searchbox', { name: 'Search locations' })
    fireEvent.change(search, { target: { value: 'harborview' } })
    const matching = optionRows(locationGroup(sheet)).length
    expect(matching).toBeLessThan(allLocations)

    // The box is numbered for the search, not for the group.
    const selectAll = within(sheet).getByRole('checkbox', {
      name: `Select all ${matching} location options`,
    })
    fireEvent.click(selectAll)
    for (const r of optionRows(locationGroup(sheet))) {
      expect(r.querySelector('[data-slot="checkbox"]').getAttribute('aria-checked')).toBe('true')
    }

    fireEvent.click(within(sheet).getByRole('button', { name: 'Apply filter' }))
    // Only the matching locations were taken, never the whole group.
    const drawn = new Set(
      rows(container).map((r) => {
        const s = SYSTEMS.find((x) => x.id === r.getAttribute('data-valve-row'))
        return s.l4Name || s.l3Name || s.l2Name || s.l1Name
      }),
    )
    expect(drawn.size).toBe(matching)
    for (const name of drawn) expect(name.toLowerCase()).toContain('harborview')
    expectNoReactError()
  })

  it('is draft-until-Apply: Cancel abandons the edit and leaves the list alone', () => {
    const { container } = renderAt('/valves')
    const before = rows(container).length

    const sheet = openFilters()
    fireEvent.click(optionBox(sheet, 'Valve Error'))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Cancel' }))

    expect(rows(container).length).toBe(before)
    expect(container.querySelector('[data-name="filter-trigger-summary"]')).toBeNull()
    // and a re-open does not resurrect the abandoned draft
    expect(noStateFilter()).toBe(true)
    expectNoReactError()
  })

  it('the valve state axis is MULTI-select now, and the trigger counts every axis', () => {
    /* It was a single-select chip row on the page. Behind the door it is a
       checkbox group like the other two, which is an ADDITION - Open plus
       Closed in one pass was impossible before - and `matchesFilter` already
       read `filter.state` as a set. */
    const { container } = renderAt('/valves')
    const sheet = openFilters()
    fireEvent.click(optionBox(sheet, 'Open'))
    fireEvent.click(optionBox(sheet, 'Closed'))
    fireEvent.click(optionBox(sheet, 'Online'))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Apply filter' }))

    const expected = SYSTEMS.filter(
      (s) => ['open', 'closed'].includes(valveCategoryOf(s)) && isReachable(s),
    )
    expect(expected.length).toBeGreaterThan(0)
    for (const r of rows(container)) {
      const s = SYSTEMS.find((x) => x.id === r.getAttribute('data-valve-row'))
      expect(['open', 'closed']).toContain(valveCategoryOf(s))
      expect(isReachable(s)).toBe(true)
    }

    // THREE constraints, so the trigger states the number, not one of them.
    expect(screen.getByRole('button', { name: 'Filters (3 active)' })).toBeTruthy()
    expect(container.querySelector('[data-name="filter-trigger-summary"]').textContent).toBe(
      '3 filters',
    )
    expectNoReactError()
  })

  it('Clear all filters empties every axis and is itself a draft action', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}?state=open`)
    const openCount = SCOPED.filter((s) => valveCategoryOf(s) === 'open').length
    expect(rows(container).length).toBe(openCount)

    const sheet = openFilters()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Clear all filters' }))
    // Nothing has happened to the list yet — Clear is a draft action, the same
    // as every tick on this surface, so one gesture cannot both clear and
    // commit behind the user's back.
    expect(rows(container).length).toBe(openCount)

    fireEvent.click(within(sheet).getByRole('button', { name: 'Apply filter' }))
    expect(rows(container).length).toBe(SCOPED.length)
    expect(container.querySelector('[data-name="filter-trigger-summary"]')).toBeNull()
    expectNoReactError()
  })

  it('the ?state= deep link still lands, with the surface shut', () => {
    /* ValveManagementCard's legend rows navigate here with ?state=<key>. The
       filter moving behind a door must not make the link open one. */
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}?state=error`)
    const errored = SCOPED.filter((s) => valveCategoryOf(s) === 'error')
    expect(errored.length).toBeGreaterThan(0)
    expect(rows(container).length).toBe(errored.length)
    // The surface is NOT open...
    expect(screen.queryByRole('dialog', { name: 'Filter valves' })).toBeNull()
    // ...and the page says what it is filtered to.
    expect(container.querySelector('[data-name="filter-trigger-summary"]').textContent).toBe(
      'Valve Error',
    )
    expectNoReactError()
  })

  it('keeps the two bulk-safety invariants while a filter is on', () => {
    /* Rule 0 of this screen: filtering never touches the selection, and the
       offline exclusion is never hidden by it. */
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    fireEvent.click(rowFor(container, OFFLINE_SYS.id))
    fireEvent.click(rowFor(container, ACTIONABLE_SYS.id))
    expect(actionBar(container).textContent).toContain('2 selected')

    applyState('Open')

    // The selection survived the filter...
    expect(actionBar(container).textContent).toContain('2 selected')
    // ...and the offline one is still visibly excluded from what will act.
    expect(actionBar(container).textContent).toMatch(/1 offline[^.]*excluded/)
    const close = within(actionBar(container)).getByRole('button', { name: /^Close \d+ valve/ })
    expect(close.textContent).toContain('Close 1 valve')
    expectNoReactError()
  })
})

describe('ValveManagementScreen - the "No valve installed" dead end', () => {
  /* THE DECISION, recorded here as well as in the screen: the CHIP stays, the
     DEAD END goes. The chip row is now the part-to-whole breakdown as well as
     the filter, and a breakdown missing a part is a lie about the whole — so
     the count has to be there. What used to be wrong was the DESTINATION: a
     list where every row is inert, under a "Select all 0 matching" with a
     disabled checkbox and a note restating the filter just applied. */
  it('offers no select-all at all when nothing in the filtered set can be selected, and says why', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    applyState('No valve installed')

    const noValve = SCOPED.filter((s) => valveCategoryOf(s) === 'none')
    expect(noValve.length).toBeGreaterThan(0)
    expect(rows(container).length).toBe(noValve.length)

    // No disabled control that could never do anything.
    expect(screen.queryByRole('checkbox', { name: /^Select all/ })).toBeNull()
    expect(selectAllBar(container)).toBeNull()

    // One sentence instead, naming the reason in VALVE_CATEGORIES' own words.
    const note = container.querySelector('[data-name="valve-none-selectable"]')
    expect(note).toBeTruthy()
    expect(note.textContent).toContain('No valve installed')
    expect(note.textContent).toContain(String(noValve.length))
    // and the copy stays literal: never "No valve", never "Fault"
    expect(note.textContent).not.toMatch(/No valve(?! installed)/)

    // The rows themselves are unchanged: still drawn, still aria-disabled.
    for (const s of noValve) {
      expect(rowFor(container, s.id).getAttribute('data-selectable')).toBe('false')
    }
    expectNoReactError()
  })
})

describe('ValveManagementScreen - the selection strip', () => {
  /* THE CASE NAIVE IMPLEMENTATIONS DROP. Filter down to nothing with a
     selection live and the bulk bar unmounts, taking the only route to acting
     on that selection with it. The action half is keyed on the SELECTION,
     which no filter touches. */
  it('stays mounted and actionable when the filter matches nothing but a selection exists', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    fireEvent.click(rowFor(container, ACTIONABLE_SYS.id))
    expect(actionBar(container).textContent).toContain('1 selected')

    // state=error AND the connectivity that system is not — zero rows, by
    // construction rather than by a hardcoded count. Both axes now live on the
    // one surface, so this is a single open / tick / tick / Apply.
    const sheet = openFilters()
    fireEvent.click(optionBox(sheet, 'Valve Error'))
    fireEvent.click(optionBox(sheet, EMPTY_COMBO_CONNECTIVITY))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Apply filter' }))

    expect(rows(container).length).toBe(0)
    expect(screen.getByText('No systems match this filter.')).toBeTruthy()

    // THE BAR IS STILL THERE AND STILL ACTS.
    const bar = actionBar(container)
    expect(bar).toBeTruthy()
    expect(bar.textContent).toContain('1 selected')
    expect(bar.textContent).toContain('1 hidden by the filter')
    expect(within(bar).getByRole('button', { name: 'Close 1 valve' }).disabled).toBe(false)
    // and no select-all, because there is nothing matching to select
    expect(screen.queryByRole('checkbox', { name: /^Select all/ })).toBeNull()
    expectNoReactError()
  })

  it('the hidden count is itself the control that clears the filter', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    fireEvent.click(rowFor(container, ACTIONABLE_SYS.id))
    applyState('Valve Error')
    expect(rowFor(container, ACTIONABLE_SYS.id)).toBeNull()

    /* A number that reports a problem and offers no way out of it makes the
       user hunt for the filter that caused it. */
    const unhide = within(actionBar(container)).getByRole('button', {
      name: '1 hidden by the filter',
    })
    fireEvent.click(unhide)

    expect(rows(container).length).toBe(SCOPED.length)
    expect(rowFor(container, ACTIONABLE_SYS.id)).toBeTruthy()
    // It clears EVERYTHING, the state axis included — and the one control left
    // on the page stops naming a filter, because there is none.
    expect(container.querySelector('[data-name="filter-trigger-summary"]')).toBeNull()
    expect(noStateFilter()).toBe(true)
    const bar = actionBar(container)
    // the selection was never touched — only what was hiding it
    expect(bar.textContent).toContain('1 selected')
    expect(bar.textContent).not.toMatch(/hidden by the filter/)
    expectNoReactError()
  })

  it('says why the tri-state box is empty while a selection is live', () => {
    /* `toggleAllMatching` only ever touches the FILTERED selectable set, so
       with a selection outside the filter the box reads unchecked while the
       half below reads "1 selected". Separately correct, together baffling. */
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    fireEvent.click(rowFor(container, ACTIONABLE_SYS.id))
    applyState('Valve Error')

    const bar = selectAllBar(container)
    expect(bar).toBeTruthy()
    expect(within(bar).getByRole('checkbox').getAttribute('aria-checked')).toBe('false')
    expect(bar.textContent).toMatch(/None of the 1 you have selected is in this filter/)
    expect(actionBar(container).textContent).toContain('1 selected')
    expectNoReactError()
  })

  it('is ONE surface: select-all and the actions are halves of the same strip', () => {
    /* They used to be two separately-bordered hand-rolled cards at a radius no
       real <Card> in this app uses, 48px apart, costing 140px of chrome
       between them. */
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    fireEvent.click(rowFor(container, ACTIONABLE_SYS.id))

    const strip = container.querySelector('[data-name="valve-selection-strip"]')
    expect(strip).toBeTruthy()
    expect(strip.contains(selectAllBar(container))).toBe(true)
    expect(strip.contains(actionBar(container))).toBe(true)
    expectNoReactError()
  })
})

describe('ValveManagementScreen - the action bar has a real hierarchy', () => {
  it('commits through the design system destructive variant, not the standard primary', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    fireEvent.click(rowFor(container, ACTIONABLE_SYS.id))

    const bar = actionBar(container)
    const close = within(bar).getByRole('button', { name: 'Close 1 valve' })
    /* This is the control ValveManagementCard.jsx:721 reserves the red for:
       "that red is reserved for the control that actually shuts water off,
       and that control is on the screen this opens". Plain primary made it
       identical to every other action in the app. */
    expect(close.getAttribute('data-variant')).toBe('destructive')

    const open = within(bar).getByRole('button', { name: /^Open \d+$/ })
    expect(open.getAttribute('data-variant')).toBe('outline')
    expectNoReactError()
  })

  it('is not a full-width slab, and the count stays in the label (GOV.UK: colour is never alone)', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    fireEvent.click(rowFor(container, ACTIONABLE_SYS.id))

    const close = within(actionBar(container)).getByRole('button', { name: 'Close 1 valve' })
    // sized to its label, not stretched across the bar
    expect(String(close.className)).not.toMatch(/flex-1/)
    expect(String(close.className)).not.toMatch(/w-full/)
    // the count rides in the label - the thumb passes over the number
    expect(close.textContent).toBe('Close 1 valve')
    // and a non-colour glyph rides with it, without touching the a11y name
    const glyph = close.querySelector('svg')
    expect(glyph).toBeTruthy()
    expect(glyph.getAttribute('aria-hidden')).toBe('true')
    expectNoReactError()
  })
})

describe('ValveManagementScreen - the sheet is told it is acting over a SELECTION', () => {
  /* HYPHEN, NOT AN EM-DASH. The sheet's copy moved to '-' under the
     project-wide rule (pulse2_mobile_product_sandbox/CLAUDE.md:268,
     "Hyphens in UI copy, not em-dashes"); this fixture is pinned to
     the shipped string, so it moves with it. */
  const SELECTION_LINE = 'Only the systems you selected - not every system here'

  it('names the scope plainly and says the selection is a subset', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    fireEvent.click(rowFor(container, ACTIONABLE_SYS.id))
    fireEvent.click(within(actionBar(container)).getByRole('button', { name: 'Close 1 valve' }))

    const sheet = screen.getByRole('alertdialog')
    expect(within(sheet).getByText(SCOPE)).toBeTruthy()
    expect(within(sheet).getByText(SELECTION_LINE)).toBeTruthy()
    /* Neither scope-wide sentence is true of a selection. */
    expect(within(sheet).queryByText('Every system at this location')).toBeNull()
    expect(within(sheet).queryByText('Every system in this account')).toBeNull()
    /* And the workaround that printed "N of M systems selected" directly above
       the headline count is gone from the sheet. */
    expect(sheet.textContent).not.toMatch(/of \d+ systems selected/)
    expectNoReactError()
  })

  it('the unscoped fleet route says the same thing, never "Every system in this account"', () => {
    const { container } = renderAt('/valves')
    const firstActionable = rows(container)
      .map((r) => r.getAttribute('data-valve-row'))
      .map((id) => SYSTEMS.find((s) => s.id === id))
      .find((s) => s && canActuate(s) && s.valve === 'open')
    expect(firstActionable).toBeTruthy()

    fireEvent.click(rowFor(container, firstActionable.id))
    fireEvent.click(
      within(actionBar(container)).getByRole('button', { name: /^Close \d+ valve/ }),
    )

    const sheet = screen.getByRole('alertdialog')
    expect(within(sheet).getByText(SELECTION_LINE)).toBeTruthy()
    expect(within(sheet).queryByText('Every system in this account')).toBeNull()
    expectNoReactError()
  })

  /* THE RICHER LABEL SURVIVES WHERE IT IS MORE HONEST. The batch row is read
     later with no screen around it; "320 Summit Blvd" alone would say the
     batch covered the location, and it did not. */
  it('still writes the selection-aware label into the batch record', () => {
    vi.useFakeTimers()
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    fireEvent.click(rowFor(container, ACTIONABLE_SYS.id))
    fireEvent.click(rowFor(container, OFFLINE_SYS.id))
    fireEvent.click(within(actionBar(container)).getByRole('button', { name: 'Close 1 valve' }))

    act(() => {
      vi.advanceTimersByTime(ARMING_DELAY_MS + 50)
    })
    const sheet = screen.getByRole('alertdialog')
    /* THE TAP PATH IS NOW TWO ACTS BEHIND A DISCLOSURE. The sheet's
       primary commit is a slide (SlideToConfirm); the button these tests
       press is the SC 2.5.7 non-drag alternative, and below the top tier it
       lives behind the "Cannot slide?" escape hatch with the acknowledgement
       checkbox as the first of its two single-pointer acts. A single tap
       would satisfy the letter of 2.5.7 and destroy the control, which is
       why the button stays inert until the box is ticked. Open the hatch,
       tick, then press. */
    fireEvent.click(within(sheet).getByRole('button', { name: 'Cannot slide?' }))
    fireEvent.click(within(sheet).getByRole('checkbox'))
    fireEvent.click(within(sheet).getByRole('button', { name: /^Close 1 valve/ }))
    spendTheCancelWindow(container)

    const [batch] = getBulkValveHistory()
    expect(batch).toBeTruthy()
    expect(batch.scopeLabel).toBe(`${SCOPE} \u00b7 2 of ${SCOPED.length} systems selected`)
    expectNoReactError()
  })
})

/* ══ SELECT-ALL AT TWO SCOPES (2026-11-03) ════════════════════════════════
   The owner, verbatim: "I want select all for the entire for all systems, and
   select all per location."

   The FLEET select-all is the strip and is covered above and unchanged. This
   block covers the second scope — the box in each location card's header —
   and, above all, the thing that makes two select-alls safe rather than
   confusing: EACH ONE'S REACH IS EXACT, STATED, AND THE SAME EVERY TIME.

   The per-location box reaches every SELECTABLE system at that location that
   matches the CURRENT FILTER, including any below the PAGE_SIZE cut. That is
   the same reach rule the fleet strip follows ("select-all covers all N"), and
   the number on screen IS that reach — which is what the badge assertions
   below pin. */

/** The leaf location a system is grouped under — `ValveManagementScreen`'s own
 *  `leafLocationOf`, restated here rather than imported because the screen does
 *  not export it. If it is ever exported, both should take it from there. */
const leafOf = (s) => s?.l4Name || s?.l3Name || s?.l2Name || s?.l1Name || 'Unassigned'

const locationCards = (c) => [...c.querySelectorAll('[data-name="valve-location-card"]')]
const locationHeader = (c, key) =>
  c.querySelector(`[data-location="${key}"] [data-name="valve-location-select-all"]`)
const locationBox = (c, key) => locationHeader(c, key)?.querySelector('[data-slot="checkbox"]')
/** Ids currently ticked, read off the DOM rather than off component state. */
const checkedIds = (c) =>
  rows(c)
    .filter(
      (r) => r.querySelector('[data-slot="checkbox"]')?.getAttribute('aria-checked') === 'true',
    )
    .map((r) => r.getAttribute('data-valve-row'))

describe('ValveManagementScreen - select-all at two scopes', () => {
  it('every location card carries its own select-all, and a location with nothing selectable carries none', () => {
    const { container } = renderAt('/valves')
    const cards = locationCards(container)
    expect(cards.length).toBeGreaterThan(1)

    for (const card of cards) {
      const key = card.getAttribute('data-location')
      const drawn = [...card.querySelectorAll('[data-valve-row]')].map((r) =>
        r.getAttribute('data-valve-row'),
      )
      const anySelectable = drawn.some((id) => isSelectable(SYSTEMS.find((s) => s.id === id)))
      const box = locationBox(container, key)
      if (anySelectable) {
        expect(box).toBeTruthy()
        // The 44px target is the WHOLE header, not the 18px box.
        expect(String(locationHeader(container, key).className)).toMatch(/\bmin-h-11\b/)
      } else {
        /* NO DEAD END. A card of "No valve installed" rows gets no box rather
           than a disabled one that can only ever select 0 — the same decision
           `showSelectAll` makes for the fleet strip. */
        expect(box).toBeNull()
      }
    }
    expectNoReactError()
  })

  it('a location select-all selects THAT location only, and leaves every other location alone', () => {
    const { container } = renderAt('/valves')
    const card = locationCards(container).find((c) =>
      locationBox(container, c.getAttribute('data-location')),
    )
    const key = card.getAttribute('data-location')

    const expected = SYSTEMS.filter((s) => leafOf(s) === key && isSelectable(s)).map((s) => s.id)
    expect(expected.length).toBeGreaterThan(0)

    fireEvent.click(locationBox(container, key))

    const ticked = checkedIds(container)
    // Everything at this location that CAN be selected now is.
    for (const id of expected) expect(ticked).toContain(id)
    // And nothing outside it.
    for (const id of ticked) expect(leafOf(SYSTEMS.find((s) => s.id === id))).toBe(key)
    // A no-valve system at the SAME location is never swept in.
    const noValveHere = SYSTEMS.find((s) => leafOf(s) === key && !isSelectable(s))
    if (noValveHere) expect(ticked).not.toContain(noValveHere.id)

    // The action bar is derived from `selectedIds`, so it must agree.
    expect(actionBar(container)).toBeTruthy()
    expect(within(actionBar(container)).getByText(`${expected.length} selected`)).toBeTruthy()
    expectNoReactError()
  })

  it('the location box goes INDETERMINATE when only some of its systems are selected', () => {
    const { container } = renderAt('/valves')
    const card = locationCards(container).find((c) => {
      const key = c.getAttribute('data-location')
      return (
        locationBox(container, key) &&
        SYSTEMS.filter((s) => leafOf(s) === key && isSelectable(s)).length > 1
      )
    })
    const key = card.getAttribute('data-location')
    const box = locationBox(container, key)
    expect(box.getAttribute('aria-checked')).toBe('false')

    const one = SYSTEMS.find((s) => leafOf(s) === key && isSelectable(s))
    fireEvent.click(rowFor(container, one.id))
    expect(box.getAttribute('aria-checked')).toBe('mixed')

    // Pressing the header from `mixed` completes the location rather than clearing it.
    fireEvent.click(box)
    expect(box.getAttribute('aria-checked')).toBe('true')
    // And pressing it again clears exactly that location.
    fireEvent.click(box)
    expect(box.getAttribute('aria-checked')).toBe('false')
    expect(checkedIds(container).length).toBe(0)
    expectNoReactError()
  })

  it('a location select-all RESPECTS THE ACTIVE FILTER and never reaches a row the user cannot see', () => {
    const { container } = renderAt('/valves')
    // Narrow to one valve state. The state group is a <ToggleGroup
    // type="single"> inside the filter surface, so Radix gives its items
    // role="radio" inside a role="radiogroup" - not role="button".
    const open = VALVE_CATEGORIES.find((c) => c.key === 'open')
    applyState(open.label)

    const card = locationCards(container).find((c) =>
      locationBox(container, c.getAttribute('data-location')),
    )
    const key = card.getAttribute('data-location')
    fireEvent.click(locationBox(container, key))

    const ticked = checkedIds(container)
    expect(ticked.length).toBeGreaterThan(0)
    for (const id of ticked) {
      const s = SYSTEMS.find((x) => x.id === id)
      expect(leafOf(s)).toBe(key)
      // Nothing outside the filter was swept in.
      expect(valveCategoryOf(s)).toBe('open')
    }
    // A system at the SAME location in a DIFFERENT state is untouched.
    const otherState = SYSTEMS.find(
      (s) => leafOf(s) === key && isSelectable(s) && valveCategoryOf(s) !== 'open',
    )
    if (otherState) expect(ticked).not.toContain(otherState.id)
    expectNoReactError()
  })

  it('the badge on a location header IS that box reach, not the number of rows drawn under it', () => {
    const { container } = renderAt('/valves')
    for (const card of locationCards(container)) {
      const key = card.getAttribute('data-location')
      const header = locationHeader(container, key)
      const box = locationBox(container, key)
      if (!box) continue
      const reach = SYSTEMS.filter((s) => leafOf(s) === key && isSelectable(s)).length
      // The visible count states the reach...
      expect(header.textContent).toContain(String(reach))
      // ...and so does the accessible name, with the scope spelled out, so the
      // user can never be unsure WHICH select-all they are on.
      const name = box.getAttribute('aria-label')
      expect(name).toMatch(new RegExp(`^Select all ${reach} system`))
      expect(name).toContain(key)
    }
    expectNoReactError()
  })

  it('the fleet strip and the location boxes stay consistent with each other', () => {
    const { container } = renderAt('/valves')
    const fleetBox = selectAllBar(container).querySelector('[data-slot="checkbox"]')

    // Fleet select-all ticks every location box that exists.
    fireEvent.click(fleetBox)
    expect(fleetBox.getAttribute('aria-checked')).toBe('true')
    for (const card of locationCards(container)) {
      const box = locationBox(container, card.getAttribute('data-location'))
      if (box) expect(box.getAttribute('aria-checked')).toBe('true')
    }

    // Clearing ONE location drops the fleet box to mixed, not to unchecked.
    const firstKey = locationCards(container)
      .map((c) => c.getAttribute('data-location'))
      .find((k) => locationBox(container, k))
    fireEvent.click(locationBox(container, firstKey))
    expect(locationBox(container, firstKey).getAttribute('aria-checked')).toBe('false')
    expect(fleetBox.getAttribute('aria-checked')).toBe('mixed')
    expectNoReactError()
  })
})

/* ══ PROJECT COPY STANDARD ════════════════════════════════════════════════
   Two rules from the private sandbox, binding project-wide and applied to this
   screen on 2026-11-03:
     · `CLAUDE.md:268` / `DESIGN-GUIDE-FOR-CLAUDE.md:49` - hyphens in UI copy,
       never em-dashes. `aria-label`s count: they are read aloud.
     · `docs/wint-format-standards.md` - the thousands separator is a comma.

   THE FIRST RULE IS PINNED AT THE SOURCE, NOT IN THE DOM, AND THAT IS
   DELIBERATE. A DOM sweep for em-dashes on this screen returns 58 hits that
   are NOT this file's to fix: the demo fleet's own system names carry them
   (`Basement Supply — Floor 29`, from `src/data/systems.js`) and so does
   `MobileHeaderBar`'s avatar label. Asserting over the rendered tree would
   therefore either fail on other people's files or need a deny-list that rots.
   Scanning THIS file's source with comments stripped tests exactly the thing
   the rule is about - the strings this screen authors - and nothing else.
   CODE COMMENTS ARE NOT UI COPY and are stripped before the check. */
describe('ValveManagementScreen - project copy standard', () => {
  /* Read off disk relative to the vitest root rather than via
     `import.meta.url`: Vite rewrites that to an http:// URL under the DOM
     environment, which `readFileSync` cannot take. */
  const SCREEN_SRC = readFileSync(
    resolve(process.cwd(), 'src/v2/pages/ValveManagementScreen.jsx'),
    'utf8',
  )

  /** The file with every comment removed, so only code and the string literals
   *  it renders are left. */
  const codeOnly = SCREEN_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('authors no em-dash in any string it renders or announces', () => {
    const offending = codeOnly
      .split('\n')
      .map((line, i) => [i + 1, line])
      .filter(([, line]) => line.includes('—'))
    expect(offending).toEqual([])
    // and the sweep is real: the comments it stripped DID contain them.
    expect(SCREEN_SRC.includes('—')).toBe(true)
  })

  it('renders the hyphen form in the sentences that used to carry an em-dash', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    // The select-all's exclusion clause.
    expect(selectAllBar(container).textContent).toContain(
      "rows shown can’t be selected - No valve installed",
    )
    // The no-valve row's accessible name.
    expect(boxFor(container, NO_VALVE_SYS.id).getAttribute('aria-label')).toContain(
      'No valve installed - not selectable',
    )
    // The offline row's.
    expect(boxFor(container, OFFLINE_SYS.id).getAttribute('aria-label')).toContain(
      'System is offline - excluded from bulk actions',
    )
    expectNoReactError()
  })

  it('renders counts through a comma-grouping formatter, which is what makes 1,000 readable', () => {
    /* The owner's own framing is "shut off valve for around 1000 valve", so
       this is the format the feature is sized for. The demo fleet is only
       three digits, so what is pinned here is that the counts go through the
       FORMATTER rather than being interpolated bare - a four-digit fleet would
       otherwise print `1000` on the one control in this app that cuts water
       off. The formatter itself is asserted first so the test still means
       something if the fleet never grows. */
    expect((1000).toLocaleString('en-US')).toBe('1,000')
    // No count is interpolated bare: every one goes through `num()`.
    expect(codeOnly).toMatch(/const num = \(n\) => Number\(n\)\.toLocaleString\('en-US'\)/)
    for (const bare of [
      '${selectedCount} selected',
      '${filtered.length} rows shown',
      '${summary.total}}',
      'Showing ${shown.length}',
    ]) {
      expect(codeOnly).not.toContain(bare)
    }

    renderAt('/valves')
    expect(screen.getAllByText(SYSTEMS.length.toLocaleString('en-US')).length).toBeGreaterThan(0)
    expect(
      screen.getByText(
        new RegExp(`Showing [\\d,]+ of ${SYSTEMS.length.toLocaleString('en-US')}\\b`),
      ),
    ).toBeTruthy()
    expectNoReactError()
  })
})
