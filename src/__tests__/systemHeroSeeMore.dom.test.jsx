// @vitest-environment happy-dom
//
// The System hero's "See more" is an ENTRY POINT, not a disclosure triangle.
//
// The owner's ask: "when user clicks on see more it redirect him the
// consumption chart with context of the date written above and with the
// compare to previous month". Three things have to hold for that to be true,
// and only the screen can prove any of them — the card is handed a window and
// plots it, so it cannot know whether the window matches the caption above it.
//
//   1. the caption and the chart name the SAME window (they share one
//      consumptionView, and this pins that they still do);
//   2. opening is DETERMINISTIC — a drill-down the user left behind does not
//      decide which window the control opens on;
//   3. the comparison is on when the chart opens, every time, and the user can
//      still switch it off from inside the card.
//
// And the half that is just as normative (§4): "See less" only closes. It must
// not revert the grouping or the period the user chose while it was open.
//
// WHY THE CARD IS WRAPPED. The drill is triggered by clicking a bar, and
// recharts draws no bars under happy-dom — there is no layout, so the plot has
// zero width and the bar shapes that carry role="button" are never rendered.
// consumptionDefaultAndReturn.dom.test.jsx hits the same wall and exercises
// ConsumptionReturnControl directly. Here the drill has to go through the
// SCREEN's handler, so the real card is rendered inside a wrapper that adds
// the one affordance recharts would otherwise provide: a button that calls
// `onDrillDown` with a real bucket key off the data the screen passed. Nothing
// is stubbed — the card below it is the production component, which is what
// makes the compare switch and the period controls below real assertions.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('@/v2/components/WaterConsumptionCardV2', async (importOriginal) => {
  const actual = await importOriginal()
  const { createElement: h, Fragment } = await import('react')
  const Real = actual.default
  return {
    ...actual,
    default: function CardWithDrillAffordance(props) {
      /* The last bucket of the window, which is the one the period label
         names — drillTarget() resolves a {kind:'month'} key to the Daily
         window for that month. */
      const last = props.data?.[props.data.length - 1]
      lastProps = props
      return h(
        Fragment,
        null,
        h(
          'button',
          {
            type: 'button',
            'data-testid': 'test-drill',
            disabled: !last?.key,
            onClick: () => props.onDrillDown?.(last.key),
          },
          'drill',
        ),
        h(Real, props),
      )
    },
  }
})

let lastProps = null

import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import { SYSTEMS } from '@/data/systems'
import { currentGranularity, pickGranularity } from './helpers/consumptionChart'

afterEach(() => {
  cleanup()
  lastProps = null
})

const sys = SYSTEMS[0]

const mount = () =>
  render(
    <MemoryRouter initialEntries={[`/system/${sys.id}`]}>
      <Routes><Route path="/system/:systemId" element={<SystemPageV2Screen />} /></Routes>
    </MemoryRouter>,
  )

const seeMore = (c) => within(c).getByRole('button', { name: 'See more' })
const seeLess = (c) => within(c).getByRole('button', { name: 'See less' })
const compareSwitch = (c) =>
  within(c).queryByRole('switch', { name: /compare previous period/i })

/* The caption the hero prints: "Water consumption" over the range.
   RE-POINTED IN THE 2026-10-20 MERGE. This used to match the whole caption
   block by its tone-dependent node id (calm 199296:50197 / alert
   199296:50721) and strip the "Water consumption" line off the front. The
   Figma reconciliation re-fetched those frames: the block is 199396:84051 for
   both tones now, and the range has a node of its own (199383:141633) under
   it. Matching the range node directly is what this assertion always meant,
   and it no longer has to guess the tone or peel a prefix. The old ids stay in
   the selector so the test keeps working against either generation of the
   component rather than silently passing on neither. */
const captionRange = (c) => {
  const range = c.querySelector('[data-node-id="199383:141633"]')
  const node = range
    ?? c.querySelector('[data-node-id="199396:84051"], [data-node-id="199296:50197"], [data-node-id="199296:50721"]')
  expect(node, 'the hero caption is missing').toBeTruthy()
  return node.textContent.replace(/^Water consumption\s*/, '').trim()
}

describe('the hero "See more" is an entry point into the chart', () => {
  it('opens the chart with the comparison already on', () => {
    const { container } = mount()
    expect(compareSwitch(container), 'the chart is mounted before "See more"').toBeNull()

    fireEvent.click(seeMore(container))

    const sw = compareSwitch(container)
    expect(sw, 'the chart did not open').toBeTruthy()
    expect(sw.getAttribute('aria-checked')).toBe('true')
    // And a real previous window is behind it, not an invented one.
    expect(lastProps.compare).toBe(true)
    expect(lastProps.compareData?.length).toBe(lastProps.data.length)
  })

  it('opens on the window the caption names, and keeps naming it', () => {
    const { container } = mount()
    fireEvent.click(seeMore(container))

    expect(captionRange(container)).toBe(lastProps.monthLabel)
    expect(lastProps.period).toBe('M')

    // One step back moves BOTH, because there is only one window.
    fireEvent.click(within(container).getByRole('button', { name: 'Previous period' }))
    expect(captionRange(container)).toBe(lastProps.monthLabel)
  })

  it('re-opens on the caption window after a drill-down, with nothing to return to', () => {
    const { container } = mount()
    fireEvent.click(seeMore(container))

    const opened = lastProps.monthLabel
    expect(lastProps.period).toBe('M')

    // Drill one level: Monthly -> the Daily window for that month (§3.5).
    fireEvent.click(within(container).getByTestId('test-drill'))
    expect(lastProps.period).toBe('D')
    expect(lastProps.monthLabel).not.toBe(opened)
    expect(within(container).getByTestId('consumption-return')).toBeTruthy()
    // The caption follows the chart down — they never disagree, which is the
    // reason the reset below is about determinism, not about a mismatch.
    expect(captionRange(container)).toBe(lastProps.monthLabel)

    fireEvent.click(seeLess(container))
    fireEvent.click(seeMore(container))

    expect(lastProps.period).toBe('M')
    expect(lastProps.monthLabel).toBe(opened)
    expect(captionRange(container)).toBe(opened)
    expect(currentGranularity(container)).toBe('Month')
    /* The trail went with the window. Clearing one without the other would
       leave "Back to Monthly" pointing at the window already on screen. */
    expect(within(container).queryByTestId('consumption-return')).toBeNull()
    expect(compareSwitch(container).getAttribute('aria-checked')).toBe('true')
  })

  it('turns the comparison on at every open, and lets the user turn it off', () => {
    const { container } = mount()
    fireEvent.click(seeMore(container))

    fireEvent.click(compareSwitch(container))
    expect(compareSwitch(container).getAttribute('aria-checked')).toBe('false')
    expect(lastProps.compareData).toBeNull()

    fireEvent.click(seeLess(container))
    fireEvent.click(seeMore(container))
    // Deterministic: a second open lands in the same place as the first.
    expect(compareSwitch(container).getAttribute('aria-checked')).toBe('true')
  })

  it('withholds the comparison where the series has no previous period', () => {
    const { container } = mount()
    fireEvent.click(seeMore(container))

    // Walk to the oldest window the series can fill (PLS-WC-09 stops us there).
    let guard = 60
    let prev = within(container).getByRole('button', { name: 'Previous period' })
    while (!prev.disabled && guard > 0) {
      fireEvent.click(prev)
      prev = within(container).getByRole('button', { name: 'Previous period' })
      guard -= 1
    }
    expect(guard, 'never reached the start of the series').toBeGreaterThan(0)

    fireEvent.click(seeLess(container))
    fireEvent.click(seeMore(container))

    /* bucketMonthly clamps its offset forward at the start of the series, so
       offset - 1 would hand back this very window. A comparison drawn from it
       is a copy of the reading, not a comparison, so the chart opens
       uncompared and says so by leaving the switch off. */
    expect(lastProps.period).toBe('M')
    expect(compareSwitch(container).getAttribute('aria-checked')).toBe('false')
    expect(lastProps.compareData).toBeNull()
    // Still the same one window, and still the caption's.
    expect(captionRange(container)).toBe(lastProps.monthLabel)
  })
})

describe('"See less" only closes (§4)', () => {
  it('does not revert a grouping the user picked while it was open', () => {
    const { container } = mount()
    fireEvent.click(seeMore(container))

    pickGranularity(container, 'Day')
    expect(currentGranularity(container)).toBe('Day')
    const picked = captionRange(container)
    expect(picked).toBe(lastProps.monthLabel)

    fireEvent.click(seeLess(container))
    // Closed, and the caption still reports the window the user chose.
    expect(compareSwitch(container)).toBeNull()
    expect(captionRange(container)).toBe(picked)

    /* And re-opening keeps it. Picking a grouping clears the trail itself
       (§3.1), so there is no drill to unwind and "See more" has nothing to
       reset — it must not quietly drag the user back to Monthly. PLS-WC-20
       then keeps the comparison off, because it is Monthly-only. */
    fireEvent.click(seeMore(container))
    expect(currentGranularity(container)).toBe('Day')
    expect(captionRange(container)).toBe(picked)
    expect(compareSwitch(container)).toBeNull()
  })
})
