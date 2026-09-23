// @vitest-environment happy-dom
//
// The consumption card's Y / M / D / H segments and its period stepper are
// DISCLOSED on mobile, not inline.
//
// That is the Figma mobile variant, not a preference: on the desktop card
// (198424:63770) the CardAction slot holds four Toggle instances on the title
// row, but on the card that actually ships in the mobile system page
// (I198378:74362;119647:3846;149:2490) that same slot is hidden="true" and
// CardAction2 holds a single 57x32 Button whose only child is a 16px Phosphor
// funnel-simple glyph.
//
// These tests pin the three things that can regress silently: the controls are
// not in the DOM until the funnel is pressed, the funnel actually reveals
// them, and the stepper disappears on Y — where there is nothing to step.

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
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

const funnel = () => screen.getByRole('button', { name: 'Consumption scope' })

describe('consumption scope is behind the funnel', () => {
  it('does not render the granularity segments until the funnel is pressed', () => {
    renderCard()

    // The card is mounted and plotting — this is not an empty-state pass.
    expect(screen.getByText('Water consumption')).toBeTruthy()
    expect(funnel()).toBeTruthy()

    for (const name of ['Year', 'Month', 'Day', 'Hour']) {
      expect(screen.queryByRole('radio', { name })).toBeNull()
    }
    expect(screen.queryByRole('dialog', { name: 'Consumption scope' })).toBeNull()
  })

  it('reveals the segments and the stepper when the funnel is pressed', () => {
    renderCard()
    fireEvent.click(funnel())

    expect(screen.getByRole('dialog', { name: 'Consumption scope' })).toBeTruthy()
    for (const name of ['Year', 'Month', 'Day', 'Hour']) {
      expect(screen.getByRole('radio', { name })).toBeTruthy()
    }
    expect(screen.getByRole('group', { name: 'Period' })).toBeTruthy()
    expect(funnel().getAttribute('aria-expanded')).toBe('true')
  })

  it('closes again on a second press and on Escape', () => {
    renderCard()

    fireEvent.click(funnel())
    fireEvent.click(funnel())
    expect(screen.queryByRole('dialog', { name: 'Consumption scope' })).toBeNull()

    fireEvent.click(funnel())
    expect(screen.getByRole('dialog', { name: 'Consumption scope' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Consumption scope' })).toBeNull()
  })

  it('reports the granularity the viewer picks', () => {
    const picked = []
    renderCard({ onPeriodChange: (next) => picked.push(next) })

    fireEvent.click(funnel())
    fireEvent.click(screen.getByRole('radio', { name: 'Month' }))

    expect(picked).toEqual(['M'])
  })

  it('hides the stepper on Y, where there is no previous window to step to', () => {
    renderCard({ period: 'Y', monthLabel: '2024–2026' })
    fireEvent.click(funnel())

    // Still disclosed, still switchable — only the stepper is gone.
    expect(screen.getByRole('radio', { name: 'Year' })).toBeTruthy()

    const stepper = screen.getByRole('group', { name: 'Period' })
    expect(stepper.closest('.hidden')).not.toBeNull()
  })

  it('labels the headline figures for the bucket being plotted', () => {
    const { rerender } = renderCard()
    expect(screen.getByText('Daily Avg L')).toBeTruthy()
    expect(screen.getByText('Peak Day L')).toBeTruthy()

    rerender(
      <WaterConsumptionCardV2
        data={SERIES}
        period="M"
        monthLabel="2026"
        onPeriodChange={() => {}}
        onMonthChange={() => {}}
      />,
    )
    expect(screen.getByText('Monthly Avg L')).toBeTruthy()
    expect(screen.getByText('Peak Month L')).toBeTruthy()
  })
})
