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
     is now drawn ONCE in a sticky header above the run of rows it describes
     (redesign point 4), which is what lets the row be one line and is most of
     why the list went from ~4.9 visible rows to ~11.
     The owner's requirement is unchanged and is asserted on both routes below:
     "We need to understand the context of systems." A sighted user reads the
     path off the sticky header; someone tabbing between checkboxes never sees
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

  /* THE HEADER IS STICKY AND IT IS NOT `fixed`. `position: fixed` would escape
     Phone.jsx's 393x852 overflow:hidden frame, which is the same prohibition
     that keeps both sheets off Radix portals. happy-dom has no layout engine,
     so what is assertable is the CLASS that decides it. */
  it('the group header is sticky inside the scroller, never fixed', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    const header = container.querySelector('[data-name="valve-rows"] section h2')
    expect(header).toBeTruthy()
    expect(String(header.className)).toMatch(/\bsticky\b/)
    expect(String(header.className)).not.toMatch(/\bfixed\b/)
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
  // The quick filter is a <ToggleGroup type="single">, so Radix gives its
  // items role="radio" inside a role="radiogroup" — not role="button".
  const chip = (name) => screen.getByRole('radio', { name })

  it('a state chip narrows the rows', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    expect(rows(container).length).toBe(SCOPED.length)
    expect(chip('All').getAttribute('aria-checked')).toBe('true')

    fireEvent.click(chip('Valve Error'))
    const errored = SCOPED.filter((s) => valveCategoryOf(s) === 'error')
    expect(rows(container).length).toBe(errored.length)
    expect(rows(container).length).toBeLessThan(SCOPED.length)
    expect(chip('Valve Error').getAttribute('aria-checked')).toBe('true')
    expectNoReactError()
  })

  it('?state= seeds the state filter, and an unknown value falls back to All', () => {
    // The overview card deep-links in with ?state=<VALVE_CATEGORIES key>.
    const open = SCOPED.filter((s) => valveCategoryOf(s) === 'open')
    const a = renderAt(`/valves/${encodeURIComponent(SCOPE)}?state=open`)
    expect(rows(a.container).length).toBe(open.length)
    expect(chip('Open').getAttribute('aria-checked')).toBe('true')
    cleanup()

    // An unknown value must NOT render an empty list — it falls back to All.
    const b = renderAt(`/valves/${encodeURIComponent(SCOPE)}?state=banana`)
    expect(rows(b.container).length).toBe(SCOPED.length)
    expect(chip('All').getAttribute('aria-checked')).toBe('true')
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
    // beside the box, so the row around it is what carries the text.
    expect(option.closest('li').textContent).toContain(String(SCOPED.length))

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
    fireEvent.click(screen.getByRole('radio', { name: 'Valve Error' }))
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
      `${unselectable} of ${SCOPED.length} rows shown can\u2019t be selected \u2014 No valve installed`,
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
    fireEvent.click(screen.getByRole('radio', { name: 'Open' }))

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
  it('each state chip carries its own count, and the summary card that drew them twice is gone', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    const summary = summariseValves(SCOPED)

    /* The category list used to be drawn THREE times before the user reached a
       row: the summary card's legend, the chip row, and the filter sheet's
       "Valve state" group. UK Analysis Function: "Do not use a key, label the
       categories themselves." So the chip IS the readout and IS the filter. */
    for (const c of VALVE_CATEGORIES) {
      const total = summary.byCategory[c.key].total
      if (total === 0) continue
      const el = screen.getByRole('radio', { name: c.label })
      expect(el.textContent).toContain(String(total))
      /* THE COUNT IS A DESCRIPTION, NOT PART OF THE NAME. A control whose
         accessible name changes every time the fleet does is a control nothing
         can address — and every name-based assertion in this file would churn
         with the catalog. */
      expect(el.getAttribute('aria-describedby')).toBeTruthy()
    }
    // "All" carries the scope total the same way.
    expect(screen.getByRole('radio', { name: 'All' }).textContent).toContain(
      String(summary.total),
    )

    // The 166px card — the single largest piece of chrome — is gone.
    expect(container.querySelector('[data-name="valve-summary"]')).toBeNull()
    expectNoReactError()
  })

  it('the filter sheet no longer draws the valve states a third time', () => {
    renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    const sheet = screen.getByRole('dialog', { name: 'Filter valves' })

    // The two axes the chips do NOT cover are still first-class here.
    expect(within(sheet).getByText('Location')).toBeTruthy()
    expect(within(sheet).getByText('Connectivity')).toBeTruthy()
    // The third drawing of the four category words is not.
    expect(within(sheet).queryByText('Valve state')).toBeNull()
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
    fireEvent.click(screen.getByRole('radio', { name: 'No valve installed' }))

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
    // construction rather than by a hardcoded count.
    fireEvent.click(screen.getByRole('radio', { name: 'Valve Error' }))
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }))
    const sheet = screen.getByRole('dialog', { name: 'Filter valves' })
    fireEvent.click(
      within(sheet).getByRole('checkbox', {
        name: new RegExp(`^${EMPTY_COMBO_CONNECTIVITY},`),
      }),
    )
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
    fireEvent.click(screen.getByRole('radio', { name: 'Valve Error' }))
    expect(rowFor(container, ACTIONABLE_SYS.id)).toBeNull()

    /* A number that reports a problem and offers no way out of it makes the
       user hunt for the filter that caused it. */
    const unhide = within(actionBar(container)).getByRole('button', {
      name: '1 hidden by the filter',
    })
    fireEvent.click(unhide)

    expect(rows(container).length).toBe(SCOPED.length)
    expect(rowFor(container, ACTIONABLE_SYS.id)).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'All' }).getAttribute('aria-checked')).toBe('true')
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
    fireEvent.click(screen.getByRole('radio', { name: 'Valve Error' }))

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
  const SELECTION_LINE = 'Only the systems you selected \u2014 not every system here'

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
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: /^Close 1 valve/ }),
    )
    spendTheCancelWindow(container)

    const [batch] = getBulkValveHistory()
    expect(batch).toBeTruthy()
    expect(batch.scopeLabel).toBe(`${SCOPE} \u00b7 2 of ${SCOPED.length} systems selected`)
    expectNoReactError()
  })
})
