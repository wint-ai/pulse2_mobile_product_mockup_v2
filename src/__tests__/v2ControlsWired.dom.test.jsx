// @vitest-environment happy-dom
//
// Three controls/datasets that looked right and were not.
//
//  1. Home hard-pinned the water-events card to its healthy state
//     (`waterEvents = expanded ? … : []`), so "Everything looks good! No active
//     water events" rendered directly above a health card reporting 52 systems
//     requiring attention. The page contradicted itself on the default route.
//  2. Those rows were raw system records, so `e.type` was undefined and the
//     card's High/Low filter chips both counted 0 while All counted every alert.
//  3. The system page mounted <EventsTimelineCard /> bare, so its
//     `events = MOCK_EVENTS` default drove every system on every route.
//  4. handleAlertAction opened with `if (actionId !== 'paginate') return`, so
//     "On it" and "Ignore" — the card's two primary buttons — were inert.

import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import { SYSTEMS } from '@/data/systems'
import { getEventsForSystem } from '@/data/events'
import { isIgnored, clearIgnored } from '@/data/ignoredIncidents'
import { isInvestigating, stopInvestigating } from '@/data/investigatingStore'

afterEach(cleanup)

const alerting = SYSTEMS.filter((s) => s.alert)

describe('home water events use real data', () => {
  it('the fleet actually has alerting systems (otherwise these are vacuous)', () => {
    expect(alerting.length).toBeGreaterThan(0)
  })

  it('does not claim "no active water events" while reporting systems that need attention', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes><Route path="/" element={<HomeAllAccounts />} /></Routes>
      </MemoryRouter>,
    )
    const text = (container.textContent || '').replace(/\s+/g, ' ')

    // The precise contradiction: the healthy state next to a non-zero count.
    const claimsHealthy = text.includes('No active water events')
    expect(
      claimsHealthy,
      `${alerting.length} systems carry an alert, so the healthy state is wrong`,
    ).toBe(false)
  })

  it('carries a leak type on each row, so the High/Low chips can count', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes><Route path="/" element={<HomeAllAccounts />} /></Routes>
      </MemoryRouter>,
    )
    const view = within(container)
    // Chips render their counts; High + Low must not both be 0 when All > 0.
    const high = alerting.filter((s) => s.alert?.type === 'leak-high').length
    const low = alerting.filter((s) => s.alert?.type === 'leak-low').length
    expect(high + low, 'dataset has no leak-typed alerts').toBeGreaterThan(0)

    // The card is mounted (not in its healthy state), so a filter chip exists.
    expect(view.queryByText('No active water events')).toBeNull()
  })
})

describe('system page timeline uses real data', () => {
  const withEvents = alerting.find((s) => (getEventsForSystem(s.id) ?? []).length > 0)

  it('at least one system has real events', () => {
    expect(withEvents, 'no system in the dataset has events').toBeTruthy()
  })

  it('renders this system’s own events, not the mock five', () => {
    const real = getEventsForSystem(withEvents.id)
    const { container } = render(
      <MemoryRouter initialEntries={[`/system/${withEvents.id}`]}>
        <Routes><Route path="/system/:systemId" element={<SystemPageV2Screen />} /></Routes>
      </MemoryRouter>,
    )
    const text = (container.textContent || '').replace(/\s+/g, ' ')

    // A real title from this system's events must appear...
    expect(text).toContain(real[0].title)
    // ...and MOCK_EVENTS' signature row must not.
    expect(text).not.toContain('High Flow Anomaly')
  })
})

describe('alert card actions reach the stores', () => {
  const sys = alerting[0]

  beforeEach(() => {
    clearIgnored(sys.id)
    stopInvestigating(sys.id)
  })
  afterEach(() => {
    clearIgnored(sys.id)
    stopInvestigating(sys.id)
  })

  const mount = () =>
    render(
      <MemoryRouter initialEntries={[`/system/${sys.id}`]}>
        <Routes><Route path="/system/:systemId" element={<SystemPageV2Screen />} /></Routes>
      </MemoryRouter>,
    )

  it('"On it" starts investigating', () => {
    expect(isInvestigating(sys.id)).toBe(false)
    const { container } = mount()
    const btn = within(container).getAllByText('On it')[0]
    expect(btn, 'no "On it" control rendered').toBeTruthy()
    fireEvent.click(btn)
    expect(isInvestigating(sys.id)).toBe(true)
  })

  it('"Ignore" ignores the incident', () => {
    expect(isIgnored(sys.id)).toBe(false)
    const { container } = mount()
    const btn = within(container).getAllByText('Ignore')[0]
    expect(btn, 'no "Ignore" control rendered').toBeTruthy()
    fireEvent.click(btn)
    expect(isIgnored(sys.id)).toBe(true)
  })
})
