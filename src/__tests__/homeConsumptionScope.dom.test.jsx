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
    const { series } = getFleetConsumptionSeries(SYSTEMS ?? [], 'D', 0)
    const expected = fmtL(series.reduce((sum, p) => sum + p.litres, 0))

    const { container } = mount()
    const view = within(container)

    expect(view.getAllByText('Total L').length).toBeGreaterThan(0)
    expect(view.getAllByText(expected).length, `fleet total ${expected}`).toBeGreaterThan(0)
  })

  it('keeps the granularity control behind the funnel', () => {
    const { container } = mount()
    const view = within(container)

    expect(view.queryByRole('dialog', { name: 'Consumption scope' })).toBeNull()
    for (const name of ['Year', 'Month', 'Day', 'Hour']) {
      expect(view.queryByRole('radio', { name })).toBeNull()
    }

    fireEvent.click(view.getByRole('button', { name: 'Consumption scope' }))

    expect(view.getByRole('dialog', { name: 'Consumption scope' })).toBeTruthy()
    for (const name of ['Year', 'Month', 'Day', 'Hour']) {
      expect(view.getByRole('radio', { name })).toBeTruthy()
    }
  })

  it('switches granularity without emptying the chart', () => {
    const { container } = mount()
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: 'Consumption scope' }))
    fireEvent.click(view.getByRole('radio', { name: 'Month' }))

    // The regression this replaces: Y / M / H used to land on the empty state.
    expect(view.queryByText(/Nothing flowed in yet/i)).toBeNull()
    expect(view.getAllByText('Monthly Avg L').length).toBeGreaterThan(0)
  })
})
