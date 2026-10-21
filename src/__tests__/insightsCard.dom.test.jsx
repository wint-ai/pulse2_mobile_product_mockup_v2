// @vitest-environment happy-dom
//
// The Insights card, both layouts.
//
// The sparkline is a hand-drawn <svg> rather than a recharts plot for exactly
// the reason this file exists: recharts needs real layout and renders NOTHING
// under happy-dom, so a charted trace could not be asserted at all. The
// geometry therefore lives in insightsSparkline.js as pure functions, and the
// card is checked for the frame + the one thing Figma got wrong for a rise —
// the badge colour.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import InsightsCard from '@/v2/components/InsightsCard'
import {
  SPARK_W,
  SPARK_H,
  SPARK_PAD_Y,
  sparklinePath,
  sparkExtent,
  trendLine,
  toValues,
  formatChangePct,
  formatChangeLitres,
  changeDirection,
} from '@/v2/components/insightsSparkline'

afterEach(cleanup)

const SERIES = [
  { day: 'Sep 1', litres: 1200 },
  { day: 'Sep 2', litres: 1400 },
  { day: 'Sep 3', litres: 900 },
]

const rootOf = (container) => container.firstElementChild

describe('sparkline geometry', () => {
  it('reads both the shapes this app passes around', () => {
    expect(toValues([1, 2, 3])).toEqual([1, 2, 3])
    expect(toValues(SERIES)).toEqual([1200, 1400, 900])
    expect(toValues(null)).toEqual([])
  })

  it('drops a bucket with no reading rather than plotting it at zero', () => {
    // PLS-WC-24: null means "no reading", never 0.
    expect(toValues([{ litres: 10 }, { litres: null }, { litres: 30 }])).toEqual([10, 30])
  })

  it('runs edge to edge and puts the peak at the top of the frame', () => {
    const d = sparklinePath(SERIES)
    const xs = [...d.matchAll(/[ML] (-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])])
    expect(xs[0][0]).toBe(0)
    expect(xs[xs.length - 1][0]).toBe(SPARK_W)
    // 1400 is the max, so it sits at the top of the plot band.
    expect(xs[1][1]).toBeCloseTo(SPARK_PAD_Y, 5)
    // 900 is the min, so it sits at the bottom of it.
    expect(xs[2][1]).toBeCloseTo(SPARK_H - SPARK_PAD_Y, 5)
  })

  it('scales the baseline on the series own extent, not its own', () => {
    const extent = sparkExtent(SERIES, [500])
    expect(extent).toEqual({ lo: 500, hi: 1400 })
    // Sharing the scale is the whole point: the gap between the two traces is
    // the reading, and it means nothing if each is normalised separately.
    const low = sparklinePath([500, 500], extent)
    expect(low).toMatch(new RegExp(`${SPARK_H - SPARK_PAD_Y}`))
  })

  it('says nothing when there is nothing to plot', () => {
    expect(sparklinePath([])).toBeNull()
    expect(sparklinePath(undefined)).toBeNull()
  })

  it('sits a flat series mid-frame instead of pinning it to the floor', () => {
    const d = sparklinePath([5, 5, 5])
    expect(d).toContain(String(SPARK_H / 2))
  })

  it('fits a trend rather than inventing a second dataset', () => {
    // A perfectly linear series is its own trend.
    expect(trendLine([1, 2, 3, 4])).toEqual([1, 2, 3, 4])
    // Too short to have a direction: no line at all.
    expect(trendLine([7])).toEqual([])
  })
})

describe('figure formatting', () => {
  it('always states the sign, because the sign is the reading', () => {
    expect(formatChangePct(-12.5)).toBe('-12.5%')
    expect(formatChangePct(4)).toBe('+4%')
    expect(formatChangeLitres(-13564)).toBe('-13,564')
    expect(formatChangeLitres(13564)).toBe('+13,564')
  })

  it('leaves a caller-formatted string alone and drops a non-figure', () => {
    expect(formatChangePct('-12.5%')).toBe('-12.5%')
    expect(formatChangePct(null)).toBeNull()
    expect(formatChangeLitres(Number.NaN)).toBeNull()
  })

  it('reads direction out of either figure, formatted or not', () => {
    expect(changeDirection(-12.5)).toBe('down')
    expect(changeDirection(12.5)).toBe('up')
    expect(changeDirection(0)).toBe('flat')
    expect(changeDirection('-12.5%')).toBe('down')
    expect(changeDirection(undefined, '+13,564')).toBe('up')
  })
})

describe('the metric card (Figma 199296:50344 / 199296:51143)', () => {
  const card = (props) => render(<InsightsCard changePct={-12.5} changeLitres={-13564} series={SERIES} {...props} />)

  it('spans the stack in both tones', () => {
    // The alert node spells h-[198px] w-[366px]; those are Figma's absolute
    // frame numbers and pinning them would break the stack. See the card's
    // header note and homeWidgetWidth.dom.test.jsx.
    for (const tone of ['calm', 'alert']) {
      const { container } = card({ tone })
      const cls = String(rootOf(container).className)
      expect(cls, tone).toContain('w-full')
      expect(cls, tone).not.toMatch(/h-\[198px\]|w-\[366px\]/)
      cleanup()
    }
  })

  it('states the figures it was given and nothing it was not', () => {
    const { getByText, container } = card()
    expect(getByText('Insights')).toBeTruthy()
    expect(getByText('Usage change')).toBeTruthy()
    expect(getByText('-12.5%')).toBeTruthy()
    expect(getByText('-13,564')).toBeTruthy()
    expect(getByText('L')).toBeTruthy()
    /* Derived, not an exported raster: the trace is real markup. The stroke
       moved from a `stroke="#0B82F8"` presentation attribute to a `style`
       declaration, because the value is now var(--primary) and a
       presentation attribute never resolves var(). Pin the drawn path, not
       the colour. */
    expect(container.querySelector('[data-spark-points="series"] path[style*="--primary"]')).toBeTruthy()
  })

  it('keeps the frame when there is no series to draw', () => {
    const { container } = render(<InsightsCard changePct={-1} changeLitres={-2} />)
    expect(container.querySelector('[data-spark-points="empty"]')).toBeTruthy()
    expect(container.querySelector('[data-spark-points="empty"] path[style*="--primary"]')).toBeFalsy()
  })

  it('does not paint a RISE in water use green', () => {
    const { getByText: down } = card({ changePct: -12.5 })
    expect(String(down('-12.5%').parentElement.className)).toContain('bg-alert-surface-success')
    cleanup()
    const { getByText: up } = card({ changePct: 12.5, changeLitres: 13564 })
    const badge = String(up('+12.5%').parentElement.className)
    expect(badge).not.toContain('alert-surface-success')
    /* insightsModel.js INSIGHT_COLOR['usage-up'] — the repo's own increase
       red, which IS --destructive (#fb2c36). Phase 4 put the badge on the
       token: `text-destructive` on a `bg-destructive/8` wash, where the
       literal was `#fb2c36` on `rgba(251,44,54,0.08)`. Same colour, and it
       now follows the theme. */
    expect(badge).toContain('text-destructive')
    expect(badge).toContain('bg-destructive/8')
  })

  it('stamps the node id of the state it is drawing', () => {
    // Same sixteen nodes, two id ranges — the calm one must not be stamped on
    // an alert card.
    const { container } = card({ tone: 'alert' })
    expect(rootOf(container).getAttribute('data-node-id')).toBe('199296:51143')
    cleanup()
    const calm = card({ tone: 'calm' })
    expect(rootOf(calm.container).getAttribute('data-node-id')).toBe('199296:50344')
  })

  it('draws no control, because the frame has none', () => {
    const { container } = card()
    expect(container.querySelector('button')).toBeFalsy()
  })

  it('makes View all a real button when a caller has somewhere to send them', () => {
    const { getByRole } = card({ onViewAll: () => {} })
    expect(getByRole('button', { name: 'View all' }).getAttribute('type')).toBe('button')
  })
})

describe('the list layout is untouched', () => {
  const ROWS = [
    { title: 'Floor 26', addr: 'North', kind: 'Usage decreased', delta: '-12.5%', deltaTone: 'good', value: '16.1 L' },
  ]

  it('is what a caller passing rows still gets, empty array included', () => {
    const { container, getByText } = render(<InsightsCard rows={ROWS} />)
    expect(getByText('Floor 26')).toBeTruthy()
    expect(getByText('Usage decreased')).toBeTruthy()
    // The list shell, not the metric one.
    expect(String(rootOf(container).className)).toContain('overflow-clip')
    cleanup()
    const empty = render(<InsightsCard rows={[]} />)
    expect(String(rootOf(empty.container).className)).toContain('w-full')
    expect(empty.getByText('View all')).toBeTruthy()
  })

  it('still turns rows into real buttons when given a handler', () => {
    const { getByRole } = render(<InsightsCard rows={ROWS} onSelectRow={() => {}} />)
    expect(getByRole('button', { name: 'Open Floor 26' })).toBeTruthy()
  })
})
