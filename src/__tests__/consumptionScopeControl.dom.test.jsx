// @vitest-environment happy-dom
//
// The consumption card's granularity control, per the CURRENT mobile design.
//
// History, because this reversed once and the reason matters: the control was
// briefly a funnel-button disclosure, built from the mobile card instance
// I198378:74362;119647:3846;149:2490 where the Y/M/D/H CardAction slot is
// hidden="true" and CardAction2 holds a 57x32 funnel. That node has since been
// DELETED from the file. Its replacement is the component set 198601:86152
// "Water consumption_M" (198583:58957 Default + two variants), which puts the
// segments back inline, spells them as words, and reverses the order.
//
// So these tests pin the design as it is now:
//   - segments are visible at rest, no disclosure to open
//   - they read Hour / Day / Month / Year, in that order
//   - the stepper is a separate row, hidden on Year
//
// The period IDS are still H/D/M/Y — only the labels and order are the
// design's — so nothing in consumptionSeries.js moves.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import WaterConsumptionCardV2 from '@/v2/components/WaterConsumptionCardV2'

afterEach(cleanup)

const SERIES = [
  { day: 1, litres: 1200 },
  { day: 2, litres: 1400 },
  { day: 3, litres: 900 },
]

function renderCard(props = {}) {
  return render(
    <WaterConsumptionCardV2
      data={SERIES}
      period="D"
      monthLabel="Jun 2026"
      onPeriodChange={() => {}}
      onMonthChange={() => {}}
      {...props}
    />,
  )
}

describe('granularity segments are inline', () => {
  it('shows all four segments at rest, with no disclosure to open', () => {
    const { container } = renderCard()
    const view = within(container)

    expect(view.getByText('Water consumption')).toBeTruthy()
    for (const name of ['Hour', 'Day', 'Month', 'Year']) {
      expect(view.getByRole('radio', { name })).toBeTruthy()
    }

    // The funnel is gone, and so is the dialog it used to open.
    expect(view.queryByRole('button', { name: 'Consumption scope' })).toBeNull()
    expect(view.queryByRole('dialog', { name: 'Consumption scope' })).toBeNull()
  })

  it('reads Hour, Day, Month, Year in that order', () => {
    const { container } = renderCard()
    const labels = within(container)
      .getAllByRole('radio')
      .map((el) => el.textContent.trim())

    // The DESKTOP node (198424:63600) draws "Y M D H" — the reverse, as single
    // letters. Getting these two nodes mixed up is what made this wrong twice.
    expect(labels).toEqual(['Hour', 'Day', 'Month', 'Year'])
  })

  it('reports the granularity the viewer picks, still as H/D/M/Y ids', () => {
    const picked = []
    const { container } = renderCard({ onPeriodChange: (next) => picked.push(next) })

    fireEvent.click(within(container).getByRole('radio', { name: 'Month' }))
    expect(picked).toEqual(['M'])
  })

  it('shows the period stepper below the segments, and hides it on Year', () => {
    const { container, rerender } = renderCard()
    expect(within(container).getByRole('group', { name: 'Period' })).toBeTruthy()
    expect(within(container).getByText('Jun 2026')).toBeTruthy()

    rerender(
      <WaterConsumptionCardV2
        data={SERIES}
        period="Y"
        monthLabel="2024–2026"
        onPeriodChange={() => {}}
        onMonthChange={() => {}}
      />,
    )
    // Year plots the whole window at once — nothing to step to.
    expect(within(container).queryByRole('group', { name: 'Period' })).toBeNull()
  })

  it('steps the period from the chevrons', () => {
    const steps = []
    const { container } = renderCard({ onMonthChange: (d) => steps.push(d) })
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: 'Previous period' }))
    fireEvent.click(view.getByRole('button', { name: 'Next period' }))
    expect(steps).toEqual([-1, 1])
  })

  it('labels the headline figures for the bucket being plotted', () => {
    const { container, rerender } = renderCard()
    expect(within(container).getByText('Daily Avg L')).toBeTruthy()
    expect(within(container).getByText('Peak Day L')).toBeTruthy()

    rerender(
      <WaterConsumptionCardV2
        data={SERIES}
        period="M"
        monthLabel="2026"
        onPeriodChange={() => {}}
        onMonthChange={() => {}}
      />,
    )
    expect(within(container).getByText('Monthly Avg L')).toBeTruthy()
    expect(within(container).getByText('Peak Month L')).toBeTruthy()
  })
})
