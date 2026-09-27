// @vitest-environment happy-dom
//
// MonthPickerSheet against the PRD rather than against the Figma frame.
//
// PRD "Water Consumption Chart v2":
//   §3.3  the window's LAST bucket is pre-selected, on its own year page, and
//         on Monthly every month the window covers is marked — not just its end
//   §2    the footer shortcut's copy is per grouping
//   §18   the sheet is a labelled dialog; dismissing changes nothing
//   PLS-WC-08  periods outside the series are unavailable at BOTH ends

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import MonthPickerSheet from '@/v2/components/MonthPickerSheet'
import {
  chipState,
  normalizePeriod,
  resolveBound,
  rollingWindowSerials,
  serial,
  windowSerials,
  yearNavState,
} from '@/v2/components/monthPickerModel'

afterEach(cleanup)

const JUN_2026 = { month: 5, year: 2026 }

/** Every month chip, in grid order, regardless of how it is labelled. */
const chips = (container) =>
  Array.from(container.querySelectorAll('button')).filter((b) =>
    /^[A-Z][a-z]{2}( \d{2})?$/.test((b.textContent || '').trim()),
  )

const chip = (container, text) =>
  chips(container).find((b) => (b.textContent || '').trim() === text)

const marked = (container) => chips(container).filter((b) => b.dataset.inWindow === 'true')
const selected = (container) => chips(container).filter((b) => b.getAttribute('aria-pressed') === 'true')

const mount = (props = {}) =>
  render(
    <MonthPickerSheet
      variant="window"
      open
      value={JUN_2026}
      max={JUN_2026}
      onClose={() => {}}
      onApply={() => {}}
      onSelectLatest12={() => {}}
      {...props}
    />,
  )

// ── The model ──────────────────────────────────────────────────────────────

describe('monthPickerModel', () => {
  it('reads both spellings of a period', () => {
    expect(normalizePeriod({ month: 5, year: 2026 })).toEqual({ month: 5, year: 2026 })
    expect(normalizePeriod({ m: 5, y: 2026 })).toEqual({ month: 5, year: 2026 })
    expect(normalizePeriod({ y: 2026 })).toBeNull()
    expect(normalizePeriod(null)).toBeNull()
  })

  it('fills a half-given bound from the fallback, and reports "no bound" as null', () => {
    expect(resolveBound({ month: 0 }, JUN_2026)).toEqual({ month: 0, year: 2026 })
    expect(resolveBound({ y: 2024 }, JUN_2026)).toEqual({ month: 5, year: 2024 })
    expect(resolveBound(undefined, JUN_2026)).toBeNull()
  })

  it('marks the window the card handed it, not twelve months derived backwards', () => {
    // A window clamped at the start of the series: four months, not twelve.
    const clamped = [{ y: 2026, m: 2 }, { y: 2026, m: 3 }, { y: 2026, m: 4 }, { y: 2026, m: 5 }]
    const set = windowSerials(JUN_2026, JUN_2026, clamped)
    expect(set.size).toBe(4)
    expect(set.has(serial(2, 2026))).toBe(true)
    expect(set.has(serial(1, 2026))).toBe(false)
  })

  it('derives the twelve months ending at the draft once the draft moves', () => {
    const clamped = [{ y: 2026, m: 5 }]
    const set = windowSerials({ month: 2, year: 2026 }, JUN_2026, clamped)
    expect(set.size).toBe(12)
    expect(set.has(serial(2, 2026))).toBe(true)
    expect(set.has(serial(3, 2025))).toBe(true)
    expect(set.has(serial(2, 2025))).toBe(false)
  })

  it('falls back to a rolling window when no windowMonths is given', () => {
    expect(windowSerials(JUN_2026, JUN_2026, undefined)).toEqual(
      rollingWindowSerials(serial(5, 2026)),
    )
  })

  it('keeps selected and in-window as two distinct states', () => {
    const end = serial(5, 2026)
    const win = rollingWindowSerials(end)
    const atEnd = chipState({ s: end, end, window: win, limit: end, floor: null })
    const inside = chipState({ s: serial(4, 2026), end, window: win, limit: end, floor: null })
    expect(atEnd).toMatchObject({ selected: true, inWindow: false })
    expect(inside).toMatchObject({ selected: false, inWindow: true })
  })

  it('disables at both ends (PLS-WC-08)', () => {
    const args = { end: serial(5, 2026), window: null, limit: serial(5, 2026), floor: serial(6, 2025) }
    expect(chipState({ ...args, s: serial(6, 2026) }).disabled).toBe(true)
    expect(chipState({ ...args, s: serial(5, 2025) }).disabled).toBe(true)
    expect(chipState({ ...args, s: serial(0, 2026) }).disabled).toBe(false)
  })

  it('stops the year stepper where the data stops', () => {
    const limit = serial(5, 2026)
    const floor = serial(6, 2025)
    expect(yearNavState(2026, limit, floor)).toEqual({ prevDisabled: false, nextDisabled: true })
    expect(yearNavState(2025, limit, floor)).toEqual({ prevDisabled: true, nextDisabled: false })
    expect(yearNavState(2026, null, null)).toEqual({ prevDisabled: false, nextDisabled: false })
  })
})

// ── The sheet ──────────────────────────────────────────────────────────────

describe('MonthPickerSheet — §3.3 pre-selection', () => {
  it('opens on the window\'s last bucket, on that bucket\'s year page', () => {
    const { container } = mount({ value: { month: 5, year: 2024 }, max: { month: 5, year: 2024 } })
    expect(within(container).getByText('2024')).toBeTruthy()
    const picked = selected(container)
    expect(picked).toHaveLength(1)
    expect((picked[0].textContent || '').trim()).toBe('Jun 24')
  })
})

describe('MonthPickerSheet — §3.3 the whole window is marked', () => {
  it('marks the eleven months leading up to the end, plus the end itself', () => {
    const { container } = mount()
    // Jul 25..Jun 26: on the 2026 page that is Jan..May marked and Jun selected.
    expect(marked(container).map((b) => b.textContent.trim())).toEqual([
      'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26',
    ])
    expect(selected(container)).toHaveLength(1)
    // The end of the window is NOT also drawn as in-window — two states, not one.
    expect(selected(container)[0].dataset.inWindow).toBeUndefined()
  })

  it('marks the other half of the window on the previous year page', () => {
    const { container } = mount()
    fireEvent.click(within(container).getByLabelText('Previous year'))
    expect(marked(container).map((b) => b.textContent.trim())).toEqual([
      'Jul 25', 'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25',
    ])
    expect(selected(container)).toHaveLength(0)
  })

  it('honours a clamped window rather than assuming twelve', () => {
    const { container } = mount({
      windowMonths: [{ y: 2026, m: 2 }, { y: 2026, m: 3 }, { y: 2026, m: 4 }, { y: 2026, m: 5 }],
    })
    expect(marked(container).map((b) => b.textContent.trim())).toEqual(['Mar 26', 'Apr 26', 'May 26'])
  })

  it('re-derives the window when the user picks a different end month', () => {
    const { container } = mount({
      windowMonths: [{ y: 2026, m: 4 }, { y: 2026, m: 5 }],
    })
    fireEvent.click(chip(container, 'Apr 26'))
    // May 25..Apr 26 — on this page, Jan..Mar marked and Apr selected.
    expect(marked(container).map((b) => b.textContent.trim())).toEqual(['Jan 26', 'Feb 26', 'Mar 26'])
    expect((selected(container)[0].textContent || '').trim()).toBe('Apr 26')
  })

  it('states the window in the accessible name, so colour is not the only carrier (§18)', () => {
    const { container } = mount()
    expect(chip(container, 'May 26').getAttribute('aria-label')).toBe(
      'May 26, within the selected window',
    )
    expect(chip(container, 'Jun 26').getAttribute('aria-label')).toBeNull()
  })

  it('does not mark a window on the simple (non-Monthly) frame', () => {
    const { container } = mount({ variant: 'simple', onSelectLatest12: undefined })
    expect(marked(container)).toHaveLength(0)
    expect(within(container).queryByText(/Pick the last month of the window/i)).toBeNull()
  })
})

describe('MonthPickerSheet — §2 footer copy', () => {
  it('says "Latest 12 months" unless told otherwise', () => {
    const { container } = mount()
    expect(within(container).getByText('Latest 12 months')).toBeTruthy()
  })

  it('takes the grouping\'s own copy', () => {
    const { container } = mount({ footerLabel: 'Latest month' })
    expect(within(container).getByText('Latest month')).toBeTruthy()
    expect(within(container).queryByText('Latest 12 months')).toBeNull()
  })

  it('appears on the simple frame when a caller wires the shortcut', () => {
    const onSelectLatest12 = vi.fn()
    const { container } = mount({ variant: 'simple', footerLabel: 'Latest', onSelectLatest12 })
    fireEvent.click(within(container).getByText('Latest'))
    expect(onSelectLatest12).toHaveBeenCalled()
  })
})

describe('MonthPickerSheet — PLS-WC-08 both ends', () => {
  it('disables months after the newest and before the oldest, and takes them out of the tab order', () => {
    const { container } = mount({ min: { y: 2026, m: 1 } })
    expect(chip(container, 'Jan 26').disabled).toBe(true)
    expect(chip(container, 'Jan 26').getAttribute('tabindex')).toBe('-1')
    expect(chip(container, 'Feb 26').disabled).toBe(false)
    expect(chip(container, 'Feb 26').getAttribute('tabindex')).toBeNull()
    expect(chip(container, 'Jul 26').disabled).toBe(true)
    expect(chip(container, 'Jul 26').getAttribute('tabindex')).toBe('-1')
  })

  it('reads min in either spelling', () => {
    const { container } = mount({ min: { month: 1, year: 2026 } })
    expect(chip(container, 'Jan 26').disabled).toBe(true)
    expect(chip(container, 'Feb 26').disabled).toBe(false)
  })

  it('stops the year stepper at each end rather than leaving a dead page', () => {
    const { container } = mount({ min: { y: 2025, m: 6 } })
    expect(within(container).getByLabelText('Next year').disabled).toBe(true)
    const prev = within(container).getByLabelText('Previous year')
    expect(prev.disabled).toBe(false)
    fireEvent.click(prev)
    expect(within(container).getByLabelText('Previous year').disabled).toBe(true)
  })

  it('leaves the simple frame unbounded when no bound is given', () => {
    const { container } = mount({ variant: 'simple', max: undefined, onSelectLatest12: undefined })
    expect(chips(container).some((b) => b.disabled)).toBe(false)
    expect(within(container).getByLabelText('Next year').disabled).toBe(false)
  })
})

describe('MonthPickerSheet — §18 dialog', () => {
  it('is a dialog named by its own title, described by its helper text', () => {
    const { container } = mount()
    const dialog = within(container).getByRole('dialog', { name: 'Select month' })
    const described = dialog.getAttribute('aria-describedby')
    expect(described).toBeTruthy()
    expect(container.querySelector(`#${CSS.escape(described)}`).textContent).toMatch(
      /Pick the last month of the window/i,
    )
  })

  it('takes focus when it opens', () => {
    const { container } = mount()
    expect(document.activeElement).toBe(within(container).getByRole('dialog'))
  })

  it('Escape closes and applies nothing (§3.3 "effect on dismiss: nothing changes")', () => {
    const onClose = vi.fn()
    const onApply = vi.fn()
    mount({ onClose, onApply })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onApply).not.toHaveBeenCalled()
  })

  it('the dismiss affordance closes and applies nothing', () => {
    const onClose = vi.fn()
    const onApply = vi.fn()
    const { container } = mount({ onClose, onApply })
    fireEvent.click(within(container).getByLabelText('Close month picker'))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onApply).not.toHaveBeenCalled()
  })

  it('Apply still commits the draft', () => {
    const onApply = vi.fn()
    const { container } = mount({ onApply })
    fireEvent.click(chip(container, 'Feb 26'))
    fireEvent.click(within(container).getByText('Apply'))
    expect(onApply).toHaveBeenCalledWith({ month: 1, year: 2026 })
  })

  it('renders nothing while closed', () => {
    const { container } = mount({ open: false })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })
})
