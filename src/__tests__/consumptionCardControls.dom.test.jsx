// @vitest-environment happy-dom
//
// The control area of the v2 consumption card, against PRD v2.
//
// Four things the card got wrong and that only show up in the markup:
//   §2          Yearly hid the whole caption row, so the control area changed
//               height between groupings. Yearly's label is plain text, not a
//               missing row.
//   PLS-WC-09   The step chevrons were operable and inert at the ends of the
//               series. "A control that looks operable and does nothing is the
//               same defect as a picker that cannot reach eleven months in
//               twelve."
//   §3.4        There was no Today.
//   PLS-WC-19   The metrics row rendered three zeros over a window with no
//               data, where the empty state says more.
//
// Nothing here touches the plot: recharts needs real layout, so nothing inside
// it renders under happy-dom. The bars' own contract is asserted on
// chartScale's exported functions instead.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import WaterConsumptionCardV2 from '@/v2/components/WaterConsumptionCardV2'

afterEach(cleanup)

const SERIES = [
  { day: 'Jun 1', litres: 1200, key: { kind: 'day', y: 2026, m: 5, d: 1 } },
  { day: 'Jun 2', litres: 1400, key: { kind: 'day', y: 2026, m: 5, d: 2 } },
  { day: 'Jun 3', litres: 900, key: { kind: 'day', y: 2026, m: 5, d: 3 } },
]

const card = (props = {}) =>
  render(
    <WaterConsumptionCardV2
      data={SERIES}
      period="D"
      monthLabel="June 2026"
      onPeriodChange={() => {}}
      onMonthChange={() => {}}
      {...props}
    />,
  )

describe('Yearly keeps the caption row (§2)', () => {
  it('prints the period label as plain text, with no stepper around it', () => {
    const { container } = card({ period: 'Y', monthLabel: 'N / A' })
    const view = within(container)

    // The row is there — the control area does not change height on Yearly...
    expect(view.getByText('N / A')).toBeTruthy()
    // ...but nothing in it is a control, so it is not a "Period" group either.
    expect(view.queryByRole('group', { name: 'Period' })).toBeNull()
    expect(view.queryByRole('button', { name: 'Previous period' })).toBeNull()
    expect(view.queryByRole('button', { name: 'Next period' })).toBeNull()
  })

  it('still offers the stepper at every other grouping', () => {
    for (const period of ['H', 'D', 'M']) {
      const { container } = card({ period })
      expect(
        within(container).getByRole('button', { name: 'Previous period' }),
        `no stepper at ${period}`,
      ).toBeTruthy()
      cleanup()
    }
  })
})

describe('step controls are unavailable at the ends (PLS-WC-09, §3.2)', () => {
  it('defaults to operable, so a caller that has not been updated is unchanged', () => {
    const { container } = card()
    const view = within(container)
    expect(view.getByRole('button', { name: 'Previous period' }).disabled).toBe(false)
    expect(view.getByRole('button', { name: 'Next period' }).disabled).toBe(false)
  })

  it('carries the disabled ATTRIBUTE, not just a dimmed look', () => {
    const { container } = card({ canStepPrev: false, canStepNext: false })
    const view = within(container)
    expect(view.getByRole('button', { name: 'Previous period' }).disabled).toBe(true)
    expect(view.getByRole('button', { name: 'Next period' }).disabled).toBe(true)
  })

  it('does not step past the end it is disabled at', () => {
    const steps = []
    const { container } = card({ canStepPrev: false, onMonthChange: (d) => steps.push(d) })
    fireEvent.click(within(container).getByRole('button', { name: 'Previous period' }))
    fireEvent.click(within(container).getByRole('button', { name: 'Next period' }))
    expect(steps).toEqual([1])
  })
})

describe('Today (§3.4, §16)', () => {
  const NAME = 'Jump to today, hour by hour.'

  it('is withheld rather than drawn dead when the host owns no handler', () => {
    const { container } = card()
    expect(within(container).queryByRole('button', { name: NAME })).toBeNull()
  })

  it('jumps when selected', () => {
    let jumps = 0
    const { container } = card({ onToday: () => { jumps += 1 } })
    fireEvent.click(within(container).getByRole('button', { name: NAME }))
    expect(jumps).toBe(1)
  })

  it('is unavailable when already at today, hour by hour', () => {
    let jumps = 0
    const { container } = card({ canToday: false, onToday: () => { jumps += 1 } })
    const btn = within(container).getByRole('button', { name: NAME })
    expect(btn.disabled).toBe(true)
    fireEvent.click(btn)
    expect(jumps).toBe(0)
  })

  it('is offered at every grouping, Yearly included', () => {
    for (const period of ['H', 'D', 'M', 'Y']) {
      const { container } = card({ period, onToday: () => {} })
      expect(
        within(container).getByRole('button', { name: NAME }),
        `no Today at ${period}`,
      ).toBeTruthy()
      cleanup()
    }
  })
})

describe('metrics are hidden when the window has no data (PLS-WC-19, §6)', () => {
  it('shows all three over a window that has readings', () => {
    const { container } = card()
    const view = within(container)
    expect(view.getByText('Total L')).toBeTruthy()
    expect(view.getByText('Daily Avg L')).toBeTruthy()
    expect(view.getByText('Peak Day L')).toBeTruthy()
  })

  it('hides them over a window the period has not reached (PLS-WC-17)', () => {
    const unreached = SERIES.map((row) => ({ ...row, litres: null }))
    const { container } = card({ data: unreached })
    const view = within(container)
    expect(view.queryByText('Total L')).toBeNull()
    expect(view.queryByText('Daily Avg L')).toBeNull()
    expect(view.queryByText('Peak Day L')).toBeNull()
  })

  it('hides them rather than reporting three zeros over an all-zero window', () => {
    const zeroed = SERIES.map((row) => ({ ...row, litres: 0 }))
    const { container } = card({ data: zeroed })
    const text = (container.textContent || '').replace(/\s+/g, ' ')
    expect(within(container).queryByText('Total L')).toBeNull()
    expect(text).not.toMatch(/\b0 Total/)
  })

  it('keeps the controls up so the viewer can steer out of it', () => {
    const unreached = SERIES.map((row) => ({ ...row, litres: null }))
    const { container } = card({ data: unreached })
    const view = within(container)
    expect(view.getByRole('radio', { name: 'Month' })).toBeTruthy()
    expect(view.getByRole('button', { name: 'Previous period' })).toBeTruthy()
  })
})
