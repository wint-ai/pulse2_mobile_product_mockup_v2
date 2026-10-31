// @vitest-environment happy-dom
//
// The drill-down hint in the consumption tooltip.
//
// WHY THE TOOLTIP IS RENDERED DIRECTLY AND NOT THROUGH THE CARD.
//
// recharts needs real layout, so nothing inside the plot renders under
// happy-dom — the sibling suites say so at the top of every file and assert
// the plot's contract on chartScale's exported functions instead. A tooltip
// reached by tapping a bar is therefore unreachable here. But the tooltip is
// plain divs once recharts has handed it a payload, so rendering the component
// with the payload recharts would have given it tests the real markup, which
// is what a unit test of bucketHintText alone cannot do: it would pass just as
// happily if the line were computed and never rendered.
//
// The gesture itself is NOT under test here and was not touched: one tap still
// shows the tooltip, two still drill, and a bar is still the systems-table
// filter target. This change adds a line of text and nothing else.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { ConsumptionTooltipContent } from '@/v2/components/WaterConsumptionCardV2'

afterEach(cleanup)

/* What recharts passes: one entry per drawn series, each carrying the whole
   row under `payload`. `config` is the card's chartConfig. */
const entry = (row) => ({
  dataKey: 'litres',
  name: 'litres',
  value: row.litres,
  color: 'var(--primary)',
  payload: row,
})

const CONFIG = { litres: { label: 'Litres' } }

const tip = (row, period) =>
  render(
    <ConsumptionTooltipContent
      active
      payload={[entry(row)]}
      label={row.day}
      labelFormatter={(value) => value}
      config={CONFIG}
      period={period}
    />,
  )

const JUNE = { day: 'Jun 26', litres: 18_432 }

describe('the tooltip still says what it always said', () => {
  it('keeps the period label and the reading', () => {
    tip(JUNE, 'M')
    expect(screen.getByText('Jun 26')).toBeTruthy()
    expect(screen.getByText('18,432')).toBeTruthy()
    expect(screen.getByText('Litres')).toBeTruthy()
  })

  it('renders nothing at all when recharts has not made it active', () => {
    const { container } = render(
      <ConsumptionTooltipContent active={false} payload={[entry(JUNE)]} period="M" />,
    )
    expect(container.firstChild).toBeNull()
  })
})

describe('the hint line, per level', () => {
  it('offers the month below a year', () => {
    tip({ day: '2024', litres: 5 }, 'Y')
    expect(screen.getByText('Double-tap to see by month')).toBeTruthy()
  })

  it('offers the day below a month', () => {
    tip(JUNE, 'M')
    expect(screen.getByText('Double-tap to see by day')).toBeTruthy()
  })

  it('offers the hour below a day', () => {
    tip({ day: 'Sep 1', litres: 5 }, 'D')
    expect(screen.getByText('Double-tap to see by hour')).toBeTruthy()
  })

  /* The half a screenshot cannot show, and the reason this file exists. */
  it('offers NOTHING at Hourly — the rung with nothing below it', () => {
    tip({ day: '14', litres: 5 }, 'H')
    expect(screen.queryByText(/Double-tap/)).toBeNull()
  })

  it('offers NOTHING on a bucket with no reading, which cannot be opened', () => {
    tip({ day: 'Sep 30', litres: null }, 'D')
    expect(screen.queryByText(/Double-tap/)).toBeNull()
  })

  /* A hint that wraps gains the tooltip a line of height AFTER recharts has
     measured the box to decide which side of the cursor to put it on, at a
     width where there is no room to grow. The 393px frame is where that
     bites, so the no-wrap is pinned rather than left to the stylesheet. */
  it('holds the hint to one line', () => {
    tip(JUNE, 'M')
    const hint = screen.getByText('Double-tap to see by day')
    expect(hint.className).toContain('whitespace-nowrap')
  })

  /* Tokens only. A Tailwind colour utility naming a token this repo does not
     define falls through to stock Tailwind and then freezes across all four
     themes with no warning, which is invisible in a test that only checks the
     text. --muted-foreground is defined by light, dark, sand AND contrast. */
  it('tints the hint with a defined token rather than a raw colour', () => {
    tip(JUNE, 'M')
    const hint = screen.getByText('Double-tap to see by day')
    expect(hint.className).toContain('text-muted-foreground')
    expect(hint.className).not.toMatch(/#[0-9a-f]{3,8}/i)
  })
})

describe('the hint under comparison', () => {
  /* Two series are drawn; only the current one is the drill target. The hint
     must appear once, not once per series. */
  it('appears exactly once when a comparison series is drawn', () => {
    const row = { day: 'Jun 26', litres: 18_432, prevLitres: 15_000 }
    render(
      <ConsumptionTooltipContent
        active
        payload={[
          entry(row),
          { dataKey: 'prevLitres', name: 'prevLitres', value: row.prevLitres, payload: row },
        ]}
        label={row.day}
        labelFormatter={(value) => value}
        config={{ litres: { label: 'This year' }, prevLitres: { label: 'Last year' } }}
        period="M"
      />,
    )
    expect(screen.getAllByText('Double-tap to see by day')).toHaveLength(1)
    expect(screen.getByText('15,000')).toBeTruthy()
  })
})
