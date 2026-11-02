// @vitest-environment happy-dom
//
// Checkbox — THE TRI-STATE HALF, pinned.
//
// WHY THIS FILE EXISTS. Stock shadcn's checkbox styles only
// `data-[state=checked]` and renders `<CheckIcon/>` from its Indicator
// unconditionally. Radix renders the Indicator for `indeterminate` TOO
// (`checked="indeterminate"` is its own third value), so stock draws A
// CHECKMARK ON AN UNFILLED, TRANSPARENT BOX for "some selected" — it reads as
// "none selected" to the eye while announcing `aria-checked="mixed"` to a
// screen reader. The two channels disagree, and the sighted one is the one
// that is wrong.
//
// That matters here more than it would elsewhere. `src/components/ui/checkbox.jsx`
// already records why: on `ValveManagementScreen` a user who misreads which
// valves are selected "can commit a bulk shutoff over a set they never chose".
// Select-all is the control that makes `indeterminate` reachable, so this is
// pinned BEFORE select-all ships rather than after.
//
// The pattern being implemented against is the W3C APG tri-state checkbox:
// three values, `aria-checked="mixed"` for the middle one. Radix emits that
// for us; what this file proves is that the component's PAINT and its GLYPH
// agree with it.
//
// WHAT IS DELIBERATELY NOT ASSERTED: anything about rendered appearance.
// happy-dom has no layout engine and no CSS cascade — `getBoundingClientRect()`
// returns zeros and computed colours are not resolved. These assertions are on
// the class LIST and on which glyph is in the tree, which is the most a DOM
// test can honestly claim.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'

import { Checkbox } from '@/components/ui/checkbox'

afterEach(() => {
  cleanup()
})

/** The Radix root is the `<button role="checkbox">`. */
const box = () => screen.getByRole('checkbox')

/** lucide-react stamps its icon name into the class list, which is the only
 *  handle an SVG without a title gives a test. */
const glyphNames = () =>
  [...box().querySelectorAll('svg')].map((svg) => svg.getAttribute('class') || '')

describe('Checkbox tri-state', () => {
  it('announces mixed and reports state=indeterminate when checked="indeterminate"', () => {
    render(<Checkbox checked="indeterminate" onCheckedChange={() => {}} aria-label="Select all" />)
    expect(box()).toHaveAttribute('aria-checked', 'mixed')
    expect(box()).toHaveAttribute('data-state', 'indeterminate')
  })

  it('FILLS the box in the indeterminate state — the bug was a check on a transparent box', () => {
    render(<Checkbox checked="indeterminate" onCheckedChange={() => {}} aria-label="Select all" />)
    const cls = box().getAttribute('class')
    // The fill, its border and its ink all have to move together; a fill
    // without the foreground swap leaves the glyph invisible on the primary.
    expect(cls).toContain('data-[state=indeterminate]:bg-primary')
    expect(cls).toContain('data-[state=indeterminate]:border-primary')
    expect(cls).toContain('data-[state=indeterminate]:text-primary-foreground')
  })

  it('draws a MINUS in the indeterminate state, never a check', () => {
    render(<Checkbox checked="indeterminate" onCheckedChange={() => {}} aria-label="Select all" />)
    const names = glyphNames()
    expect(names.length).toBe(1)
    expect(names[0]).toMatch(/minus/)
    expect(names[0]).not.toMatch(/\bcheck\b/)
  })

  it('still draws a CHECK when fully checked, and still fills', () => {
    render(<Checkbox checked onCheckedChange={() => {}} aria-label="Select all" />)
    expect(box()).toHaveAttribute('aria-checked', 'true')
    expect(box()).toHaveAttribute('data-state', 'checked')
    const names = glyphNames()
    expect(names.length).toBe(1)
    expect(names[0]).toMatch(/check/)
    expect(names[0]).not.toMatch(/minus/)
    expect(box().getAttribute('class')).toContain('data-[state=checked]:bg-primary')
  })

  it('shows NO glyph when unchecked — Radix does not render the Indicator', () => {
    render(<Checkbox checked={false} onCheckedChange={() => {}} aria-label="Select all" />)
    expect(box()).toHaveAttribute('aria-checked', 'false')
    expect(box()).toHaveAttribute('data-state', 'unchecked')
    expect(glyphNames()).toEqual([])
  })

  it('keeps the unchecked box FILL-FREE, which is how all four themes tell the two apart', () => {
    // `checkbox.jsx`'s divergence #1: the distinction is FILL vs NO FILL, not
    // one fill against another, because under `contrast` every surface token
    // is saturated and a filled unchecked box reads as checked.
    render(<Checkbox checked={false} onCheckedChange={() => {}} aria-label="Select all" />)
    const cls = box().getAttribute('class')
    expect(cls).toContain('bg-transparent')
    expect(cls).not.toContain('dark:bg-input/30')
  })

  it('does not regress the aria-disabled affordance the live /valves screen uses', () => {
    render(<Checkbox checked={false} aria-disabled="true" aria-label="No valve installed" />)
    const cls = box().getAttribute('class')
    expect(cls).toContain('aria-disabled:border-dashed')
    expect(box()).toHaveAttribute('aria-disabled', 'true')
  })
})
