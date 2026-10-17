// @vitest-environment happy-dom
//
// The v2 overlay's History tab must show REAL past events.
//
// It used to be guaranteed empty. HomeAllAccounts built `overlayEvents` purely
// from current system state, so every row it emitted carried `resolved: false`,
// and EventOverlayV2 builds its History tab from `!!e.resolved` — so "Show past
// events" and "Show past alerts" opened a tab that could not hold a row on any
// scope, for any persona. The data was there all along: v1's Alerts screen
// (src/screens/events/EventsScreen.jsx:169-174) builds its History from
// HISTORY_EVENTS + the resolved slice of CURRENT_EVENTS + two session sources,
// and v2 simply never read them.
//
// These tests pin the two halves of the fix:
//   1. History renders the real rows, counted off the data rather than a
//      literal — if the builder stops emitting resolved rows this goes to 0
//      and fails.
//   2. History is SCOPED exactly like Active. A location shows its own past
//      events, not the fleet's.
// Plus a guard that the Active tab is unchanged now that resolved rows travel
// in the same array.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import { SYSTEMS } from '@/data/systems'
import { HISTORY_EVENTS } from '@/data/events'

afterEach(cleanup)
// computePusherResolvedEvents() and computeIgnoredEvents() both read
// localStorage, so a stray sim row from another suite would move the counts.
beforeEach(() => localStorage.clear())

/* The page's own scope rule (HomeAllAccounts.scopedSystems), restated. */
const systemsAt = (name) =>
  SYSTEMS.filter(
    (s) => s.l4Name === name || s.l3Name === name || s.l2Name === name || s.l1Name === name,
  )

/* The past water events the generated history actually holds for a set of
   systems. Every expectation below is derived from this — never from a
   literal — so the tests stay true if the dataset grows or shrinks. */
const pastWaterEventsFor = (systems) => {
  const ids = new Set(systems.map((s) => s.id))
  return HISTORY_EVENTS.filter((e) => ids.has(e.system))
}

/* A location whose water card is in its HEALTHY state, which is the only state
   that renders the "Show past events" link at all — so this is the one entry
   point that reaches History in one tap, and the scope that proves the rows
   are filtered rather than the fleet's. Asserted below, not assumed. */
const QUIET_LOCATION = 'Building D'

function mountAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<HomeAllAccounts />} />
        <Route path="/location/:locationName" element={<HomeAllAccounts />} />
      </Routes>
    </MemoryRouter>,
  )
}

/* Rows are buttons only because HomeAllAccounts gives the overlay a
   destination; the aria-label is unique to EventOverlayV2's row. */
const overlayRows = () => screen.queryAllByRole('button', { name: /Open this system\./ })
const overlayTitle = () => screen.getByRole('heading', { level: 2 }).textContent

describe('EventOverlayV2 History shows the real past events', () => {
  it('fleet scope: History holds one row per past water event in the dataset', () => {
    const expected = pastWaterEventsFor(SYSTEMS)
    expect(expected.length, 'the dataset holds no history at all').toBeGreaterThan(0)

    mountAt('/')

    // The card opens collapsed; "Show all" is its footer once expanded.
    fireEvent.click(screen.getByRole('button', { name: /\d+ Water events/ }))
    fireEvent.click(screen.getByRole('button', { name: /Show all/ }))

    // Active first — untouched by the history rows now sharing the array.
    const activeCount = SYSTEMS.filter((s) => s.alert?.type?.startsWith('leak')).length
    expect(overlayTitle()).toBe(`${activeCount} Active water events`)
    expect(overlayRows().length).toBe(activeCount)
    expect(screen.getByText(`Showing ${activeCount} of ${activeCount}`)).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Past events'))

    expect(overlayRows().length).toBe(expected.length)
    expect(overlayTitle()).toBe(`${expected.length} Past water events`)
    // The thing this whole file exists to prevent.
    expect(screen.queryByText(/No past water events match this filter\./)).toBeNull()
  })

  it('"Show past events" opens History on real rows, scoped to the location', () => {
    const scoped = systemsAt(QUIET_LOCATION)
    const expected = pastWaterEventsFor(scoped)
    const fleet = pastWaterEventsFor(SYSTEMS)

    expect(scoped.length, `${QUIET_LOCATION} holds no systems`).toBeGreaterThan(0)
    expect(
      scoped.filter((s) => s.alert).length,
      `${QUIET_LOCATION} has active events, so the card never draws "Show past events"`,
    ).toBe(0)
    expect(expected.length).toBeGreaterThan(0)
    expect(expected.length, 'this location is not a narrower scope').toBeLessThan(fleet.length)

    mountAt(`/location/${encodeURIComponent(QUIET_LOCATION)}`)
    fireEvent.click(screen.getByRole('button', { name: 'Show past events' }))

    // It lands on History, not Active — the tab these links name.
    expect(overlayTitle()).toBe(`${expected.length} Past water events`)

    const rows = overlayRows()
    expect(rows.length).toBe(expected.length)

    // Every row names a system that is actually in this location.
    const names = new Set(scoped.map((s) => s.name))
    for (const row of rows) {
      const system = row.getAttribute('aria-label').split(' — ')[0]
      expect(names.has(system), `${system} is not in ${QUIET_LOCATION}`).toBe(true)
    }
  })
})
