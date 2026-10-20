// @vitest-environment happy-dom
//
// §2 — the period label between the arrows IS the sub-selector, and it must
// change with the grouping:
//
//   Hourly   Sun, May 3, 2026   (§2 writes it "Sunday, May 3, 2026")
//   Daily    June 2026
//   Monthly  Jun 2025 - May 2026
//   Yearly   N / A          (plain text, not a control)
//
// HOURLY IS ABBREVIATED IN THE CONTROL since 2026-10-20, and this file's
// Hourly shape assertion moved with it. The owner screenshotted the control
// reading "Tuesday, October 20, 2" and asked "why text cutted / make it looks
// always same size between arrows."
//
// §2's premise for the long form is that the period label "is a control with
// room". Measured in Chrome at the control's own type (Figtree 500, 14px),
// it is not: the longest long-form Hourly label is 210.6px of text and the gap
// between the two chevrons is 165px at a 393px frame and 132px at 360px. No
// arrangement of that row fits it — the row itself is only 278px wide at
// 360px. "Wed, Sep 20, 2026" is 121.9px and fits at both.
//
// Only the CONTROL abbreviates. consumptionView.label is untouched and still
// carries §2's long form, which is what the System page's hero caption prints
// and what the tooltip heading reads, so nothing else in the app changed.
//
// The rule this file exists to protect is unchanged and still asserted below:
// each grouping reads a DIFFERENT, correctly-shaped label, and none of them is
// a bare year.
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
import { render, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import { pickGranularity } from './helpers/consumptionChart'

afterEach(cleanup)

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes><Route path="/" element={<HomeAllAccounts />} /></Routes>
    </MemoryRouter>,
  )

/* The grouping used to be picked by clicking one of four radios. It is a
   dropdown now — the owner asked for it, "so it's less overwhelmed", naming
   the top-usage pill as the pattern — so picking means open-then-choose.
   The rule under test is untouched: whatever the grouping, the caption row
   beside it must read a DIFFERENT, correctly-shaped period label. */
const captionAt = (container, view, grouping) => {
  pickGranularity(container, grouping)
  const group = container.querySelector('[aria-label="Period"]')
  return group ? group.textContent.trim() : null
}

describe('the period label tracks the grouping', () => {
  it('reads a full date at Hourly, a month at Daily, a range at Monthly', () => {
    const { container } = mount()
    const view = within(container)

    // "Mon, Sep 28, 2026" — weekday, month, day, year, all four still there
    // and all four still read off the day the window names. See the note at
    // the top for why the two names are abbreviated.
    expect(captionAt(container, view, 'Hour')).toMatch(
      /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, \d{4}$/,
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
    pickGranularity(container, 'Year')

    // §2: Yearly's label "is plain text", not a control.
    expect(container.querySelector('[aria-label="Period"]')).toBeNull()
    expect(within(container).getAllByText('N / A').length).toBeGreaterThan(0)
  })
})
