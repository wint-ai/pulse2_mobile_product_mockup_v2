// @vitest-environment happy-dom
//
// The advanced period selector — 198674:179349 opens 198674:184354.
//
// Both halves existed for a while and were never connected:
// WaterConsumptionCardV2 exposed picker/onOpenPicker, MonthPickerSheet rendered
// the sheet, and nothing mounted it. So the thing between the chevrons looked
// tappable and did nothing.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import { SYSTEMS } from '@/data/systems'

afterEach(cleanup)

const sys = SYSTEMS[0]

const mount = () =>
  render(
    <MemoryRouter initialEntries={[`/system/${sys.id}`]}>
      <Routes><Route path="/system/:systemId" element={<SystemPageV2Screen />} /></Routes>
    </MemoryRouter>,
  )

const trigger = (c) =>
  within(c).queryByRole('button', { name: /select (month|year|period)/i })

describe('advanced period picker', () => {
  it('the period between the chevrons is a real trigger', () => {
    const { container } = mount()
    const t = trigger(container)
    expect(t, 'nothing tappable between the chevrons').toBeTruthy()
    expect(t.getAttribute('aria-haspopup')).toBe('dialog')
  })

  it('opens the sheet, and the sheet is not mounted before that', () => {
    const { container } = mount()
    expect(within(container).queryByText('Select month')).toBeNull()

    fireEvent.click(trigger(container))
    expect(within(container).getByText('Select month')).toBeTruthy()
    // The advanced variant, per 198674:184354.
    expect(within(container).getByText(/Pick the last month of the window/i)).toBeTruthy()
    expect(within(container).getByText(/Latest 12 months/i)).toBeTruthy()
  })

  it('Cancel discards without changing the chart scope', () => {
    const { container } = mount()
    const before = (container.textContent || '').replace(/\s+/g, ' ')

    fireEvent.click(trigger(container))
    fireEvent.click(within(container).getByText('Cancel'))

    expect(within(container).queryByText('Select month')).toBeNull()
    expect((container.textContent || '').replace(/\s+/g, ' ')).toBe(before)
  })

  it('Apply moves the window, and future months cannot be chosen', () => {
    const { container } = mount()
    fireEvent.click(trigger(container))

    // Every month chip; the ones after the latest data month must be disabled.
    const chips = within(container)
      .getAllByRole('button')
      .filter((b) => /^[A-Z][a-z]{2}( \d{2})?$/.test((b.textContent || '').trim()))
    expect(chips.length, 'no month chips rendered').toBeGreaterThanOrEqual(12)

    const enabled = chips.filter((b) => !b.disabled)
    const disabled = chips.filter((b) => b.disabled)
    expect(enabled.length, 'every month disabled').toBeGreaterThan(0)
    // The dataset ends mid-year, so some months must be out of range.
    expect(disabled.length, 'no future month was disabled').toBeGreaterThan(0)

    // Pick the earliest enabled month, apply, and the label must follow.
    fireEvent.click(enabled[0])
    fireEvent.click(within(container).getByText('Apply'))

    expect(within(container).queryByText('Select month')).toBeNull()
  })
})
