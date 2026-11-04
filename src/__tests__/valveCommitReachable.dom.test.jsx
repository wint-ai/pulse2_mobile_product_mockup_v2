// @vitest-environment happy-dom
//
// THE COMMIT CONTROL ON /valves HAS TO BE REACHABLE, NOT MERELY RENDERED.
//
// 2026-11-04, the owner, on a screenshot of /valves/100 Meridian Plaza:
// "I can't open and close the valve because it's overlapped. So fix it.
// Currently it can't be used."
//
// WHAT HAD HAPPENED. TabBar stopped reserving a column on 2026-11-04 ("and it
// needs to be completely floating"): its host is `relative shrink-0 h-0` and
// the pill hangs off that anchor, covering the bottom TAB_BAR_FOOTPRINT (77px)
// of every screen. Seventeen scroll bodies were given TAB_BAR_CLEARANCE of
// bottom padding in that pass. This screen has something no other screen has —
// a bottom-pinned CONTROL, the selection strip, with the two commit buttons in
// it — and a control at the bottom of the page column is a different element
// from a scroll body. It was missed, so `Close N valves` shipped underneath the
// tab bar. Measured in Chromium at 393x852 before the fix: the button occupied
// y 803->835 against a pill at y 775->840, and `document.elementFromPoint` at
// the button's own centre returned a tab-bar button. Playwright refused to
// click it at all.
//
// WHY THIS FILE EXISTS ALONGSIDE valveManagementScreen.dom.test.jsx. That suite
// checks selection, reach, counts and the deep link, and every one of its
// assertions stayed GREEN through this defect: the button was in the document,
// enabled, correctly numbered and `fireEvent.click` fired its handler. A click
// test cannot tell "covered" from "working", because happy-dom has no layout
// engine, no hit testing and no `elementFromPoint` — it dispatches straight at
// the node whatever is painted over it.
//
// SO THE INVARIANT IS PINNED STRUCTURALLY, AND IT IS ONE SENTENCE:
//
//     WHATEVER IS LAST IN THE PAGE COLUMN RESERVES AT LEAST
//     TAB_BAR_CLEARANCE BELOW ITSELF — and when the screen has a commit
//     control, the commit control is inside that last element.
//
// Both halves are needed. The reservation alone would pass on a screen that
// put its buttons somewhere else; the containment alone would pass on the
// broken screen. Every number is read from `tabBarMetrics`, so moving the pill
// moves this test with it.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { UserProvider } from '@/context/UserContext'
import ValveManagementScreen from '@/v2/pages/ValveManagementScreen'
import { SYSTEMS } from '@/data/systems'
import { clearValveCommands } from '@/data/valveCommandStore'
import { summariseValves } from '@/v2/components/valveScope'
import { TAB_BAR_CLEARANCE, TAB_BAR_FOOTPRINT } from '@/components/tabBarMetrics'

/* A scope with systems but ZERO valves, so the selection strip is not mounted
   and the SCROLLER is the bottom-most element. Picked by predicate rather than
   by name, after valveManagementScreen.dom.test.jsx, so it survives the
   catalog moving under this file. */
const inScope = (name) =>
  SYSTEMS.filter(
    (s) => s.l4Name === name || s.l3Name === name || s.l2Name === name || s.l1Name === name,
  )
const ZERO_VALVE_SCOPE = ['45 Cedarline Way', '510 Lakeview Dr', '30 Dogwood Dr'].find((n) => {
  const list = inScope(n)
  return list.length > 0 && summariseValves(list).valveTotal === 0
})

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  clearValveCommands()
  /* pushBridge.publish POSTs to ntfy.sh; this is its kill switch. */
  localStorage.setItem('pulse2-bridge-disabled', '1')
  localStorage.setItem('pulse2-persona-id', 'wint-admin')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderAt(path) {
  return render(
    <UserProvider>
      <MemoryRouter initialEntries={[path]}>
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

/* THE PAGE COLUMN — the flex column that runs to the frame's bottom edge. The
   screen root is `flex:1 / column`; its first child is the column that holds
   the header, the filter row, the scroller and the strip. The sheets, the
   drawer and TabBar are `absolute`/zero-height siblings of that column and are
   deliberately NOT in it, which is why the column's last child is what the
   pill is actually over. */
const column = (c) => c.querySelector('[data-name="valve-management-screen"] > div')
const lastInColumn = (c) => {
  const kids = [...column(c).children]
  return kids[kids.length - 1]
}
const strip = (c) => c.querySelector('[data-name="valve-selection-strip"]')
const scroller = (c) => c.querySelector('[data-name="valve-rows"]')
const commitButtons = (c) =>
  [...c.querySelectorAll('[data-name="valve-action-bar"] button')].filter((b) =>
    /^(Close|Open) /.test(b.textContent || ''),
  )

/** Tick the fleet select-all, which is how a user builds a selection fastest
 *  and the only gesture that reaches the action half in one press. */
const selectAll = (c) => fireEvent.click(c.querySelector('[data-name="valve-select-all"]'))

/** The space a node reserves under itself, in px, from its INLINE style.
 *  happy-dom resolves no stylesheet, so a Tailwind class would read as nothing;
 *  both of the declarations this screen uses for the job are inline values. */
const reservedBelow = (el) => {
  const mb = parseFloat(el.style.marginBottom || '0') || 0
  const pb = parseFloat(el.style.paddingBottom || '0') || 0
  return mb + pb
}

const ROUTES = [
  ['the fleet route', '/valves'],
  ['the scoped route', '/valves/100 Meridian Plaza'],
]

describe('the bulk commit control clears the floating tab bar', () => {
  it.each(ROUTES)('%s puts the commit buttons inside the strip', (_label, path) => {
    const { container } = renderAt(path)
    selectAll(container)

    const bar = strip(container)
    expect(bar, 'the selection strip is not mounted, so there is nothing to commit with').not.toBeNull()

    const buttons = commitButtons(container)
    expect(buttons.length, 'expected a Close and an Open button').toBe(2)
    for (const b of buttons) {
      expect(
        bar.contains(b),
        `"${b.textContent.trim()}" is outside the selection strip, so the strip's `
          + 'clearance does not protect it and it can sit under the tab bar',
      ).toBe(true)
    }
  })

  it.each(ROUTES)('%s leaves the strip last in the page column', (_label, path) => {
    const { container } = renderAt(path)
    selectAll(container)
    expect(
      lastInColumn(container),
      'something is mounted below the selection strip in the page column. The '
        + 'strip reserves the pill\'s footprint for ITSELF; anything after it is '
        + 'back under the bar.',
    ).toBe(strip(container))
  })

  it.each(ROUTES)('%s reserves the full clearance under the strip', (_label, path) => {
    const { container } = renderAt(path)
    selectAll(container)

    const reserved = reservedBelow(strip(container))
    expect(
      reserved,
      `the selection strip reserves ${reserved}px below itself. The pill covers the `
        + `bottom ${TAB_BAR_FOOTPRINT}px of the frame and the strip is the bottom-most `
        + `element of the page column, so anything under ${TAB_BAR_CLEARANCE} leaves the `
        + 'commit buttons behind the tab bar - which is exactly how this screen '
        + 'shipped unusable on 2026-11-04. Take the number from tabBarMetrics.',
    ).toBeGreaterThanOrEqual(TAB_BAR_CLEARANCE)
  })

  it('still pays the clearance on the SCROLLER when no strip is mounted', () => {
    expect(ZERO_VALVE_SCOPE, 'no zero-valve scope in the catalog to test with').toBeTruthy()
    const { container } = renderAt(`/valves/${ZERO_VALVE_SCOPE}`)

    expect(strip(container), 'a scope with no valves must not draw a selection strip').toBeNull()
    expect(lastInColumn(container)).toBe(scroller(container))
    expect(
      reservedBelow(scroller(container)),
      'with no strip the SCROLLER is the bottom-most element, so it owes the full '
        + 'clearance itself - this is the house rule every other screen follows.',
    ).toBeGreaterThanOrEqual(TAB_BAR_CLEARANCE)
  })

  it('does not double-pay: the scroller drops its padding once the strip has it', () => {
    /* Not tidiness. The strip takes TAB_BAR_CLEARANCE of column for its
       clearance; if the scroller kept its own on top, the list would lose that
       height twice and ~2 rows of a 44px list with it. Measured at 393x852:
       484px of usable scroll on /valves before the fix and 488px after. */
    const { container } = renderAt('/valves')
    selectAll(container)
    expect(reservedBelow(scroller(container))).toBe(0)
  })

  it('fixes the overlap by position, never by stacking', () => {
    /* The strip must keep LOSING to the drawer (z-10/11) and to the two sheets
       (z-50 / z-[300]). Lifting it over the pill would make the button visible
       and still leave it under the bar's hit area, and it would break the one
       ordering this screen's safety rests on. */
    const { container } = renderAt('/valves')
    selectAll(container)
    expect(
      strip(container).className,
      'the selection strip carries a z-index. The overlap is fixed by moving the '
        + 'strip out of the pill\'s band, not by painting over it.',
    ).not.toMatch(/(?:^|\s)z-(?:\[\d+px?\]|[1-9]\d*)(?:\s|$)/)
    expect(strip(container).style.zIndex || '').toBe('')
  })
})

/* ── THE HEADER, SAME PASS ────────────────────────────────────────────────
   The owner, same day: "I see that we still have the old version of header
   above in some places, so you need to make sure we don't use the same
   navigation on the header." /valves was drawing AppHeaderBar's OLD shape — a
   bordered title pill with a chevron-down that opened the drawer. Passing
   `onOpenNav` is what moves the door to the 40x40 PanelLeft button and makes
   the title inert; there is no separate prop for either half, which is exactly
   why it is worth pinning. */
describe('/valves draws the current header', () => {
  it.each(ROUTES)('%s hangs the drawer on the nav button, once', (_label, path) => {
    const { container } = renderAt(path)
    const doors = container.querySelectorAll('[aria-label="Switch location"]')
    expect(
      doors.length,
      'exactly one element per route may answer to `Switch location` - it is what '
        + 'drawerLocationHighlight.dom.test.jsx:66 opens the drawer by.',
    ).toBe(1)
    expect(doors[0].getAttribute('data-name')).toBe('app-nav')
  })

  it.each(ROUTES)('%s makes the title an inert readout', (_label, path) => {
    const { container } = renderAt(path)
    const title = container.querySelector('[data-name="app-scope"]')
    expect(title, 'the bar must still name the scope').not.toBeNull()
    expect(title.tagName, 'the scope name is a readout, not a control').not.toBe('BUTTON')
    expect(title.getAttribute('role')).toBeNull()
    expect(title.getAttribute('tabindex')).toBeNull()
    expect(title.getAttribute('aria-haspopup')).toBeNull()
    expect(title.textContent.trim().length).toBeGreaterThan(0)
  })

  it.each(ROUTES)('%s keeps the back control', (_label, path) => {
    /* The owner's standing rule - "x and back can't live in parallel ... It
       needs to be back" - and this screen is pushed from the overview. The
       leading slot and the trailing nav slot are different slots; adopting the
       nav button must not cost the back step. */
    const { container } = renderAt(path)
    expect(container.querySelector('[data-name="app-back"]')).not.toBeNull()
  })

  it('opens the drawer from the nav button', () => {
    const { container } = renderAt('/valves')
    const door = container.querySelector('[aria-label="Switch location"]')
    fireEvent.click(door)
    /* WintSidebarV2 is a dialog inside the page - no portal, because Phone.jsx
       is a fixed 393x852 overflow-hidden frame. */
    expect(container.querySelector('[role="dialog"]')).not.toBeNull()
  })
})
