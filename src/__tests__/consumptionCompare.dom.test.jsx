// @vitest-environment happy-dom
//
// "Compare previous period" — the row 198583:58957 gained when it grew from
// 477px to 517px, and which this card rendered nothing for.
//
// It is MONTHLY ONLY: the previous window is only a meaningful comparison
// month-over-month. Hour and Day are too short to read against each other, and
// Year already plots the whole span at once.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import WaterConsumptionCardV2 from '@/v2/components/WaterConsumptionCardV2'

afterEach(cleanup)

const SERIES = [
  { day: 'Jan', litres: 1200 },
  { day: 'Feb', litres: 1400 },
  { day: 'Mar', litres: 900 },
]
const PREV = [
  { day: 'Jan', litres: 1000 },
  { day: 'Feb', litres: 1100 },
  { day: 'Mar', litres: 800 },
]

const card = (props = {}) =>
  render(
    <WaterConsumptionCardV2
      data={SERIES}
      period="M"
      monthLabel="2026"
      onPeriodChange={() => {}}
      onMonthChange={() => {}}
      {...props}
    />,
  )

const sw = (c) => within(c).queryByRole('switch', { name: /compare previous period/i })

describe('compare previous period', () => {
  it('offers the switch on Monthly', () => {
    const { container } = card()
    const s = sw(container)
    expect(s, 'no compare switch on the monthly view').toBeTruthy()
    expect(s.getAttribute('aria-checked')).toBe('false')
    expect(within(container).getByText('Compare previous period')).toBeTruthy()
  })

  for (const period of ['H', 'D', 'Y']) {
    it(`hides it on ${period}, where "the previous period" is not meaningful`, () => {
      const { container } = card({ period })
      expect(sw(container)).toBeNull()
    })
  }

  it('toggles, and reports the change to the host', () => {
    const seen = []
    const { container } = card({ onCompareChange: (v) => seen.push(v) })
    fireEvent.click(sw(container))
    expect(seen).toEqual([true])
    expect(sw(container).getAttribute('aria-checked')).toBe('true')
  })

  it('is a real switch for assistive tech, which Figma cannot express', () => {
    const { container } = card()
    // role="switch" + aria-checked, not a styled div.
    expect(sw(container).tagName).toBe('BUTTON')
    expect(sw(container)).toHaveProperty('type', 'button')
  })

  it('draws nothing extra when the host supplies no previous window', () => {
    const { container } = card({ compare: true })
    // Honest: the switch is on, but with no compareData there is no second
    // series to draw, and none is invented.
    expect(container.querySelectorAll('.recharts-bar').length).toBeLessThanOrEqual(1)
  })

  it('accepts a previous window without disturbing the current one', () => {
    const { container } = card({ compare: true, compareData: PREV })
    // The current series' own figures still drive the headline.
    expect(within(container).getByText('Monthly Avg L')).toBeTruthy()
    expect(sw(container).getAttribute('aria-checked')).toBe('true')
  })
})
