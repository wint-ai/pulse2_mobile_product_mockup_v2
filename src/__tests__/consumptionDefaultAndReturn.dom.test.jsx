// @vitest-environment happy-dom
//
// Two things the screens own that the chart cannot prove about itself.
//
// PLS-WC-03 — Monthly is the default grouping at EVERY level. Both screens
// opened on Daily, which answers "what did this month look like, day by day"
// before the user has said which month they mean.
//
// PLS-WC-15 / §3.6 / §20.1 USED TO BE THE OTHER HALF of this file: a
// "‹ Back to Monthly" pill that restored the grouping AND the period a
// drill-down was opened from. The owner saw it on 2026-10-20 and said "what is
// back to monthly? remove it", so ConsumptionReturnControl and its mounts are
// gone and the tests below pin its ABSENCE instead — a rule, not a gap, so the
// next reader does not "restore" it. What that costs is asserted too, because
// it is the thing the owner traded away and it should be visible here rather
// than discovered: the grouping dropdown is now the only way back up out of a
// drill, and §3.1 makes it a RESET — it always lands on the newest window,
// never the one the drill was launched from.
//
// The drill itself is triggered by a bar and recharts draws no bars under
// happy-dom, so the post-drill absence is pinned in
// systemHeroSeeMore.dom.test.jsx, which supplies its own drill affordance; the
// arithmetic behind the drill is covered in consumptionWindow.test.js.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import { SYSTEMS } from '@/data/systems'
import {
  currentGranularity,
  expectConsumptionChartMounted,
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

/* BOTH PAGES NOW MOUNT THE CHART AT REST. The system page used to keep it
   behind the hero's "See more" and this mount clicked that control; the owner
   removed the gate on 2026-10-20 ("consumption chart shall be always
   visible"), so the two halves of PLS-WC-03 below now assert the same thing
   about two pages that reach the chart the same way. The check that replaced
   the click is what keeps that sentence true. */
const mountSystem = () => {
  const r = render(
    <MemoryRouter initialEntries={[`/system/${sys.id}`]}>
      <Routes><Route path="/system/:systemId" element={<SystemPageV2Screen />} /></Routes>
    </MemoryRouter>,
  )
  expectConsumptionChartMounted(r.container)
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

/* The window the chart is showing, read off the period trigger between the
   chevrons — the one place the window is spelled out at rest. */
const windowLabel = (container) =>
  within(container).getAllByRole('button', { name: 'Select period' })[0].textContent.trim()

describe('the "Back to Monthly" return control is gone (owner, 2026-10-20)', () => {
  /* "what is back to monthly? remove it." — the owner, on seeing the pill
     above the chart. Neither screen may render it again. */
  it('is not on the home screen', () => {
    expect(within(mountHome().container).queryByTestId('consumption-return')).toBeNull()
  })

  it('is not on a system page', () => {
    expect(within(mountSystem().container).queryByTestId('consumption-return')).toBeNull()
  })

  /* WHAT THE REMOVAL COST, pinned so it is read rather than rediscovered.
     §3.1 — the grouping dropdown always rebuilds on the NEWEST window. It was
     never a way back to a period you were looking at (§3.6); the pill was.
     With the pill gone it is the only one-tap control that changes the
     grouping, and this is what it does to the window. Verified in the browser
     on 2026-10-20: drilling from Nov 2024 - Oct 2025 into Oct 25 and then
     picking Month lands on Nov 2025 - Oct 2026. The window is still reachable
     — the period stepper and the Select period sheet both get there — just
     not in one tap. */
  it('and the grouping dropdown is a reset, not a way back to a window', () => {
    const { container } = mountHome()
    const newest = windowLabel(container)

    // Walk the window back; the chart is now showing something else.
    const prev = within(container).getAllByRole('button', { name: 'Previous period' })[0]
    fireEvent.click(prev)
    const moved = windowLabel(container)
    expect(moved).not.toBe(newest)

    // Re-picking the SAME grouping throws that window away.
    pickGranularity(container, 'Month')
    expect(windowLabel(container)).toBe(newest)
    expect(currentGranularity(container)).toBe('Month')
  })
})
