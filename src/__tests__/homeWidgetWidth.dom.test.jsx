// @vitest-environment happy-dom
//
// "all widgets needs to be same width" / "no way we are changing widget width
// size due differant selection inside the widget".
//
// The Body wrapper that stacks the home cards is `flex flex-col items-start`.
// In a column flex, items-start makes a child size to its OWN content unless
// the child says w-full. Four of the six cards said it; the two built on the
// shadcn <Card> did not, and src/components/ui/card.jsx supplies no width of
// its own — so those two were content-width.
//
// On the consumption card that was visible as the widget RESIZING: its content
// width changes with the grouping (24 hourly buckets vs 12 monthly ones, and a
// caption reading "Oct 2025 - Sep 2026" vs "2026"), so picking a different
// segment moved the card's edges.
//
// happy-dom does no layout, so offsetWidth cannot catch this. The class
// contract is the assertable thing, and it is the thing that was wrong.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import WaterConsumptionCardV2 from '@/v2/components/WaterConsumptionCardV2'
import SystemsHealthCard from '@/v2/components/SystemsHealthCard'
import InsightsCard from '@/v2/components/InsightsCard'
import ActiveWaterEventsCard from '@/v2/components/ActiveWaterEventsCard'

afterEach(cleanup)

const SERIES = [
  { day: 'Sep 1', litres: 1200 },
  { day: 'Sep 2', litres: 1400 },
  { day: 'Sep 3', litres: 900 },
]

const consumption = (period, monthLabel) => (
  <WaterConsumptionCardV2
    data={SERIES}
    period={period}
    monthLabel={monthLabel}
    onPeriodChange={() => {}}
    onMonthChange={() => {}}
  />
)

/** The card's own outermost element. */
const rootOf = (container) => container.firstElementChild

describe('every home widget spans the stack', () => {
  it.each([
    ['WaterConsumptionCardV2', consumption('M', 'Oct 2025 - Sep 2026')],
    [
      'SystemsHealthCard',
      <SystemsHealthCard
        healthy={{ percent: 50 }}
        stats={{ requireAttention: 52, total: 103 }}
        issues={{ offline: 10, valve: 12, power: 10, recipients: 4 }}
        systemTypes={{ topology: 103, flood: 0, humidity: 0 }}
      />,
    ],
    ['InsightsCard', <InsightsCard rows={[]} />],
    ['ActiveWaterEventsCard', <ActiveWaterEventsCard events={[]} />],
  ])('%s carries w-full on its root', (_name, element) => {
    const { container } = render(element)
    expect(String(rootOf(container).className)).toContain('w-full')
  })
})

describe('the consumption card does not resize with the segment picked', () => {
  // The four groupings put genuinely different content in the card — 24 bars
  // against 12, "Sunday, September 27, 2026" against "N / A". None of that may
  // reach the card's own width.
  it.each([
    ['H', 'Sunday, September 27, 2026'],
    ['D', 'September 2026'],
    ['M', 'Oct 2025 - Sep 2026'],
    ['Y', 'N / A'],
  ])('is w-full on %s', (period, label) => {
    const { container } = render(consumption(period, label))
    const cls = String(rootOf(container).className)
    expect(cls, `${period} root`).toContain('w-full')
    // No intrinsic width may be set alongside it, or w-full is not the winner.
    expect(cls, `${period} must not pin its own width`).not.toMatch(/(?:^|\s)w-\[/)
  })

  it('keeps the header inset equal to the body inset', () => {
    // px-24 on the header over px-16 on cardContent put the title 8px outside
    // the toggle track it sits above — the "positions look broken" report.
    const { container } = render(consumption('M', 'Oct 2025 - Sep 2026'))
    // The class is spelled `px-[var(--component\/card\/padding,16px)]` — a real
    // backslash in the attribute — so scan the strings rather than write a CSS
    // selector that has to escape it twice over.
    const boxes = [...container.querySelectorAll('*')]
      .map((el) => String(el.className))
      .filter((cls) => cls.includes('card\\/padding'))

    expect(boxes.length, 'header and content both use the padding token').toBeGreaterThan(1)
    for (const cls of boxes) {
      expect(cls, 'inset fallback must be 16').not.toContain('padding,24px')
    }
  })
})
