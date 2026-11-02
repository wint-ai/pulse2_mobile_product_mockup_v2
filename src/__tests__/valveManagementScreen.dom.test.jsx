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
  it('draws one row per system, each carrying the name AND the location path', () => {
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    expect(rows(container).length).toBe(SCOPED.length)

    for (const s of SCOPED) {
      const row = rowFor(container, s.id)
      expect(within(row).getByText(s.name)).toBeTruthy()
      // THE CONTEXT. A row that is only a name is not enough to decide
      // whether to cut its water.
      expect(row.textContent).toContain(s.l4Name)
      expect(row.textContent).toContain(s.l2Name)
    }
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
    expect(row.textContent).toMatch(/last known:/)
    // the state word itself is VALVE_CATEGORIES', not a local invention
    expect(row.textContent).toContain('Open')
    expect(row.textContent).toMatch(/Last seen/)
    // the product never says "Unreachable"
    expect(row.textContent).not.toMatch(/unreachable/i)

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

  it('every valve swatch keeps its glyph and its text label — the secondary encoding is mandatory', () => {
    // index.css:358-367: --valve-error against --valve-open is dE 7.6 under
    // deuteranopia, legal ONLY with secondary encoding; under `contrast`
    // --valve-open and --valve-closed are two greens. The glyph and the label
    // are what carry the distinction, so they are pinned here.
    const { container } = renderAt(`/valves/${encodeURIComponent(SCOPE)}`)
    for (const s of SCOPED) {
      if (!isReachable(s)) continue
      const row = rowFor(container, s.id)
      const key = valveCategoryOf(s)
      const label = { error: 'Valve Error', open: 'Open', closed: 'Closed', none: 'No valve installed' }[key]
      // the WORD is present…
      expect(row.textContent).toContain(label)
      // …and so is the glyph beside it (ValveStatus renders an <svg>)
      expect(row.querySelectorAll('svg').length).toBeGreaterThan(0)
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

    const [batch] = getBulkValveHistory()
    expect(batch).toBeTruthy()
    expect(batch.scopeLabel).toBe(`${SCOPE} \u00b7 2 of ${SCOPED.length} systems selected`)
    expectNoReactError()
  })
})
