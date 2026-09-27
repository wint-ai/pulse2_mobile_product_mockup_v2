// @vitest-environment happy-dom
//
// Two things the screens own that the chart cannot prove about itself.
//
// PLS-WC-03 — Monthly is the default grouping at EVERY level. Both screens
// opened on Daily, which answers "what did this month look like, day by day"
// before the user has said which month they mean.
//
// PLS-WC-15 / §3.6 / §20.1 — there must be a way back out of a drill-down that
// restores the grouping AND the period it was opened from, and it must not be
// on screen when there is nothing to return to. The drill itself is triggered
// by a bar, and recharts draws no bars under happy-dom, so the control is
// exercised directly; the arithmetic behind the drill is covered in
// consumptionWindow.test.js.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, within, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import ConsumptionReturnControl from '@/v2/components/ConsumptionReturnControl'
import { SYSTEMS } from '@/data/systems'

afterEach(cleanup)

const sys = SYSTEMS[0]

const mountHome = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <HomeAllAccounts />
    </MemoryRouter>,
  )

const mountSystem = () =>
  render(
    <MemoryRouter initialEntries={[`/system/${sys.id}`]}>
      <Routes><Route path="/system/:systemId" element={<SystemPageV2Screen />} /></Routes>
    </MemoryRouter>,
  )

/* §2's metric labels name the selected grouping's period, so "Monthly Avg L"
   on first paint is the grouping stating itself. */
const opensOnMonthly = (container) => {
  const view = within(container)
  expect(view.getAllByText('Monthly Avg L').length).toBeGreaterThan(0)
  expect(view.getAllByText('Peak Month L').length).toBeGreaterThan(0)
  expect(view.getAllByRole('radio', { name: 'Month' })[0].getAttribute('aria-checked')).toBe('true')
  expect(view.getAllByRole('radio', { name: 'Day' })[0].getAttribute('aria-checked')).not.toBe('true')
}

describe('PLS-WC-03 — Monthly is the default grouping', () => {
  it('on the home screen', () => {
    opensOnMonthly(mountHome().container)
  })

  it('on a system page', () => {
    opensOnMonthly(mountSystem().container)
  })

  it('and Daily is still reachable from it', () => {
    const { container } = mountHome()
    const view = within(container)
    fireEvent.click(view.getAllByRole('radio', { name: 'Day' })[0])
    expect(view.getAllByText('Daily Avg L').length).toBeGreaterThan(0)
    // §3.1 rebuilds the window; it must not land on the empty state.
    expect(view.queryByText(/Nothing flowed in yet/i)).toBeNull()
  })
})

describe('§3.6 / PLS-WC-15 — the return control', () => {
  it('is absent until something has been opened', () => {
    const { container } = render(<ConsumptionReturnControl toPeriod={null} onReturn={() => {}} />)
    expect(container.firstChild).toBeNull()
    // And absent on a screen nobody has drilled into.
    expect(within(mountHome().container).queryByTestId('consumption-return')).toBeNull()
  })

  it('names the view it returns to, and returns to it', () => {
    const onReturn = vi.fn()
    render(<ConsumptionReturnControl toPeriod="Y" onReturn={onReturn} />)

    const control = screen.getByTestId('consumption-return')
    // §18: the full grouping name, never the initial.
    expect(control.textContent).toContain('Back to Yearly')
    expect(control.getAttribute('aria-label')).toMatch(/Yearly/)

    fireEvent.click(control)
    expect(onReturn).toHaveBeenCalledTimes(1)
  })
})
