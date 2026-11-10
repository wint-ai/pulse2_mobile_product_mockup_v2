// @vitest-environment happy-dom
//
// THE "View all water events" ROW HAS TO LAND ON THE EVENT — owner, 2026-11-10:
//
//   "it just don't redirect you to the right place ... I can just redirect from
//    active water events when I go to system page, nothing there. So once
//    clicking there, it needs to open the event page."
//
// HomeAllAccounts.jsx navigated the overlay's row to `/system/${id}` with no
// query. The system page opens its EventFocusOverlay only for `?focus=event`
// (SystemPageV2Screen.jsx:1666), so the row closed the list, routed, and left
// the user on a system page with the event surface SHUT. The tap "worked" and
// showed nothing — which is how it was reported, and why it is easy to mistake
// for a dead tap.
//
// Measured before the fix, WebKit `devices['iPhone 14']` 390x664 and Chromium
// 1280x900, /location/Office, all five rows, list on arrival and scrolled to
// the bottom: every row reached /system/ws-… with ZERO dialogs on the page.
// After: every row reaches the same id with the event overlay open.
//
// ── THE TWO THINGS PINNED HERE ───────────────────────────────────────────────
//
//  1. A WATER row carries `?focus=event`. This is also what makes the screen's
//     two event openers AGREE: TriageBand's in-page row (HomeAllAccounts
//     `onSelectEvent`, :2183) already opened the event itself, and the list's
//     row is the same gesture on the same data.
//
//  2. A FAULT row does NOT, and this half is the one that will rot first.
//     `eventFocusAllowed` on the system page is keyed to the SYSTEM, not to the
//     row that sent you, so it cannot tell these two rows apart — and this
//     overlay runs on the `alerts` dataset too, where a fault row and a water
//     row can name the same system. With the param sent unconditionally, the
//     fault row "Domestic Hot Water — Zone 2 — AC Unplugged" opened that
//     system's LOW FLOW event overlay, because it happens to be leaking as
//     well. That is a device fault reaching the event screen, which the owner
//     ruled out on 2026-11-03 ("this is not a possible option"), and it shows
//     the user an event they did not tap. The fault rows whose systems are NOT
//     leaking were unaffected, so the system-level guard hides this rather than
//     catching it — which is exactly why the row's own type decides.
//
// ── WHAT THIS FILE DOES NOT COVER ────────────────────────────────────────────
//
// IT CANNOT PROVE A TAP IS NOT DEAD. happy-dom composites nothing and has no
// hit-testing: `fireEvent.click` dispatches straight at the node, so an element
// painted underneath an opaque bar passes here exactly as it would if nothing
// covered it. The 2026-11-08 dead-tap could not have been caught by any test in
// this environment and this one is no different. What is assertable here is
// WHERE the handler goes; whether the row can be reached by a finger is a
// browser question, answered in WebKit at 390x664 (see the measurements above).
//
// It also does not assert the system page's own behaviour on arrival — that is
// focusEventDeepLink.dom.test.jsx's subject, and duplicating it here would make
// two files fail for one cause.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import { SYSTEMS } from '@/data/systems'

afterEach(cleanup)
// The page reads session sim state out of localStorage; a stray row from
// another suite would move which systems carry which alert.
beforeEach(() => localStorage.clear())

/* The page's own scope rule (HomeAllAccounts.scopedSystems), restated. */
const systemsAt = (name) =>
  SYSTEMS.filter(
    (s) => s.l4Name === name || s.l3Name === name || s.l2Name === name || s.l1Name === name,
  )

const isLeak = (s) => s.alert?.type === 'leak-high' || s.alert?.type === 'leak-low'

/* Where the router actually went, rendered as text so a wrong query string
   fails on its own terms rather than through a missing element. */
function Landing() {
  const { pathname, search } = useLocation()
  return <div data-testid="landing">{pathname + search}</div>
}

function mountAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<HomeAllAccounts />} />
        <Route path="/location/:locationName" element={<HomeAllAccounts />} />
        <Route path="/system/:systemId" element={<Landing />} />
      </Routes>
    </MemoryRouter>,
  )
}

const landedAt = () => screen.getByTestId('landing').textContent
const rowNamed = (name) => screen.getByRole('button', { name })

/* A location that holds at least one leaking system, so the water list has a
   row to open. Derived, not asserted as a literal: the dataset is generated. */
const LOCATION = 'Office'

describe('the water-events list row opens the event, not a bare system page', () => {
  it('a water row routes to /system/:id?focus=event', () => {
    const leaking = systemsAt(LOCATION).filter(isLeak)
    expect(leaking.length, `${LOCATION} holds no leaking system`).toBeGreaterThan(0)

    mountAt(`/location/${LOCATION}`)
    fireEvent.click(screen.getByRole('button', { name: /View all \d+ water events/ }))

    const rows = screen.getAllByRole('button', { name: /Open this system\./ })
    expect(rows.length).toBe(leaking.length)

    fireEvent.click(rows[0])

    const landed = landedAt()
    expect(landed).toMatch(/^\/system\/[^?]+\?focus=event$/)
    // and it is one of the systems this scope actually offered
    const id = landed.slice('/system/'.length).split('?')[0]
    expect(leaking.map((s) => s.id)).toContain(id)
  })

  /* ONE MOUNT, THE LAST ROW. This was a loop over every row, re-mounting the
     page each time; the page is expensive enough (five cards, two charts) that
     five mounts took 43s and blew vitest's 30s timeout under any real load.
     The LAST row is what the loop was actually buying — proof the param is not
     a first-row special case — and it costs one mount, the same as the test
     above. The row that straddles the tab strip is also the last one, so this
     is the one worth naming if only one can be. */
  it('the LAST water row carries the param too, not just the first', () => {
    mountAt(`/location/${LOCATION}`)
    fireEvent.click(screen.getByRole('button', { name: /View all \d+ water events/ }))

    const rows = screen.getAllByRole('button', { name: /Open this system\./ })
    expect(rows.length, 'the list needs more than one row to prove this').toBeGreaterThan(1)

    fireEvent.click(rows[rows.length - 1])

    expect(landedAt()).toMatch(/^\/system\/[^?]+\?focus=event$/)
  })

  /* THE HALF THAT KEEPS THE 2026-11-03 RULING. See the header: the param must
     be decided by the ROW, because the system page's guard cannot be. */
  it('a FAULT row on a LEAKING system routes to the bare system page', () => {
    const scoped = systemsAt(LOCATION)
    /* The regression needs a system that is BOTH leaking and faulted — on any
       other system the bug is invisible, because the system page's own
       water-only guard declines anyway. */
    const trap = scoped.find((s) => isLeak(s) && s.power === 'ac-lost')
    expect(
      trap,
      `${LOCATION} has no system that is both leaking and AC-unplugged, so this ` +
      'regression cannot be exercised here - pick another location rather than ' +
      'deleting the test',
    ).toBeTruthy()

    mountAt(`/location/${LOCATION}`)
    /* The screen offers more than one "Show all alerts" control (the health
       card's and the hero's). They open the same overlay on the same dataset,
       so the first is as good as any - but getByRole would throw on the
       ambiguity rather than pick, which is why this is explicit. */
    fireEvent.click(screen.getAllByRole('button', { name: /Show all alerts/ })[0])

    fireEvent.click(rowNamed(`${trap.name} — AC Unplugged. Open this system.`))

    expect(landedAt()).toBe(`/system/${trap.id}`)
  })
})
