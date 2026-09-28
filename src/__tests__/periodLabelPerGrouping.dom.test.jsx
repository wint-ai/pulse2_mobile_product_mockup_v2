// @vitest-environment happy-dom
//
// §2 — the period label between the arrows IS the sub-selector, and it must
// change with the grouping:
//
//   Hourly   Sunday, May 3, 2026
//   Daily    June 2026
//   Monthly  Jun 2025 - May 2026
//   Yearly   N / A          (plain text, not a control)
//
// It shipped reading "2026" at Hourly, Daily AND Monthly. The trigger split
// the label on its last space and rendered only the tail — right for Figma's
// Variant2, which draws a bare year, but against a rolling Monthly label it
// turned "Oct 2025 - Sep 2026" into "2026", and since every other label also
// ends in a year they all collapsed to the same string. The sub-selector had
// simply stopped responding to the main one.
//
// The tests that existed asserted the caption ROW was present. None asserted
// what it said, which is why this was invisible to them.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'

afterEach(cleanup)

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes><Route path="/" element={<HomeAllAccounts />} /></Routes>
    </MemoryRouter>,
  )

const captionAt = (container, view, grouping) => {
  fireEvent.click(view.getAllByRole('radio', { name: grouping })[0])
  const group = container.querySelector('[aria-label="Period"]')
  return group ? group.textContent.trim() : null
}

describe('the period label tracks the grouping', () => {
  it('reads a full date at Hourly, a month at Daily, a range at Monthly', () => {
    const { container } = mount()
    const view = within(container)

    // "Monday, September 28, 2026" — weekday, full month, day, year.
    expect(captionAt(container, view, 'Hour')).toMatch(
      /^[A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2}, \d{4}$/,
    )
    // "September 2026" — full month name, no day.
    expect(captionAt(container, view, 'Day')).toMatch(/^[A-Z][a-z]+ \d{4}$/)
    // "Oct 2025 - Sep 2026" — the rolling window's true range.
    expect(captionAt(container, view, 'Month')).toMatch(
      /^[A-Z][a-z]{2} \d{4} - [A-Z][a-z]{2} \d{4}$/,
    )
  })

  it('gives every grouping a DIFFERENT label — the actual regression', () => {
    const { container } = mount()
    const view = within(container)
    const seen = ['Hour', 'Day', 'Month'].map((g) => captionAt(container, view, g))
    expect(new Set(seen).size, `all three read the same: ${seen.join(' / ')}`).toBe(3)
    // And none of them is a bare year.
    for (const label of seen) expect(label).not.toMatch(/^\d{4}$/)
  })

  it('drops the control entirely at Yearly, leaving N / A as plain text', () => {
    const { container } = mount()
    const view = within(container)
    fireEvent.click(view.getAllByRole('radio', { name: 'Year' })[0])

    // §2: Yearly's label "is plain text", not a control.
    expect(container.querySelector('[aria-label="Period"]')).toBeNull()
    expect(within(container).getAllByText('N / A').length).toBeGreaterThan(0)
  })
})
