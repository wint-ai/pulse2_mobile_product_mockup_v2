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
import {
  currentGranularity,
  openConsumptionChart,
  pickGranularity,
} from './helpers/consumptionChart'

afterEach(cleanup)

const sys = SYSTEMS[0]

const mountHome = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <HomeAllAccounts />
    </MemoryRouter>,
  )

/* The system page keeps the chart behind the hero's "See more"; the home
   screen does not. Opening it here keeps both halves of PLS-WC-03 asserting
   the same thing. */
const mountSystem = () => {
  const r = render(
    <MemoryRouter initialEntries={[`/system/${sys.id}`]}>
      <Routes><Route path="/system/:systemId" element={<SystemPageV2Screen />} /></Routes>
    </MemoryRouter>,
  )
  openConsumptionChart(r.container)
  return r
}

/* §2's metric labels name the selected grouping's period, so "Monthly Avg L"
   on first paint is the grouping stating itself.

   PLS-WC-03 IS STILL PINNED THE SAME WAY, through a different control. The
   grouping used to be an inline segmented control and the rule was read off
   it as radio[name=Month][aria-checked=true] / radio[name=Day] not checked.
   The owner asked for a dropdown instead — "so it's less overwhelmed",
   "like we have in top usage" — so there are no radios left to check. The
   selected grouping now shows on the dropdown's trigger, which is the one
   place it is visible at rest, so that is where the default is asserted: the
   card must OPEN reading Month, and must not open reading Day. The menu is
   not opened at all, because a default the viewer has to open a menu to see
   is not the default this rule is about. */
const opensOnMonthly = (container) => {
  const view = within(container)
  expect(view.getAllByText('Monthly Avg L').length).toBeGreaterThan(0)
  expect(view.getAllByText('Peak Month L').length).toBeGreaterThan(0)
  expect(currentGranularity(container)).toBe('Month')
  expect(currentGranularity(container)).not.toBe('Day')
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
    pickGranularity(container, 'Day')
    expect(view.getAllByText('Daily Avg L').length).toBeGreaterThan(0)
    expect(currentGranularity(container)).toBe('Day')
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
