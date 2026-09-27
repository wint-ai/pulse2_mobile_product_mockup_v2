// @vitest-environment happy-dom
//
// HomeAllAccounts is the default route and had no test of its own, so a crash
// there would have reached the deployed site before anyone saw it. This is the
// smoke test plus the two things the consumption wiring can get wrong on this
// screen specifically: it must plot the FLEET (not the comp's traced series,
// and not one system's), and its scope control must stay closed until asked.

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import { getFleetConsumptionSeries } from '@/data/consumptionSeries'
import { SYSTEMS } from '@/data/systems'

afterEach(cleanup)

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <HomeAllAccounts />
    </MemoryRouter>,
  )

// The card's own formatter, duplicated deliberately — see the note in
// systemPageRouteData.dom.test.jsx.
function fmtL(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`
  return String(Math.round(n))
}

describe('home screen consumption', () => {
  it('renders at all', () => {
    expect(() => mount()).not.toThrow()
    expect(screen.getAllByText('Water consumption').length).toBeGreaterThan(0)
  })

  it('plots the fleet total, not the traced comp series', () => {
    // 'M', not 'D': PLS-WC-03 makes Monthly the default grouping, so the
    // newest MONTHLY window is what the card totals on first paint.
    const { series } = getFleetConsumptionSeries(SYSTEMS ?? [], 'M', 0)
    const expected = fmtL(series.reduce((sum, p) => sum + p.litres, 0))

    const { container } = mount()
    const view = within(container)

    expect(view.getAllByText('Total L').length).toBeGreaterThan(0)
    expect(view.getAllByText(expected).length, `fleet total ${expected}`).toBeGreaterThan(0)
  })

  it('shows the granularity segments inline, not behind a disclosure', () => {
    const { container } = mount()
    const view = within(container)

    /* The funnel disclosure was built from a card instance that has since been
       deleted from the Figma file; 198601:86152 "Water consumption_M" replaces
       it and puts the segments back inline as words. */
    for (const name of ['Hour', 'Day', 'Month', 'Year']) {
      expect(view.getAllByRole('radio', { name }).length).toBeGreaterThan(0)
    }
    expect(view.queryByRole('button', { name: 'Consumption scope' })).toBeNull()
  })

  it('switches granularity without emptying the chart', () => {
    const { container } = mount()
    const view = within(container)

    fireEvent.click(view.getAllByRole('radio', { name: 'Month' })[0])

    // The regression this replaces: Y / M / H used to land on the empty state.
    expect(view.queryByText(/Nothing flowed in yet/i)).toBeNull()
    expect(view.getAllByText('Monthly Avg L').length).toBeGreaterThan(0)
  })
})
