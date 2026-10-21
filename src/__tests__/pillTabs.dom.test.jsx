// @vitest-environment happy-dom
//
// PillTabs — the pill tab row shared by the Location page and the System page.
//
// WHY THIS FILE EXISTS. The row was once two near-copies of a local
// `TabTrigger`, one per page, and the copy on SystemPageV2Screen carried a
// comment describing itself as "deliberately a near-copy" of the other. The
// designer then restyled ONE of the four Figma instances of the row, the copy
// on HomeAllAccounts was updated to match it, the other copy was not, and the
// owner ended up looking at a dark-slate selected tab on one screen and a pale
// blue one on the other and asking why.
//
// So the assertions here are in two groups:
//
//   · THE TWO SCREENS AGREE. Not "each screen matches a hard-coded hex" —
//     that would pass just as happily if both drifted together, and it would
//     have to be rewritten the next time the designer repaints the row. The
//     test reads the selected pill off BOTH real pages and demands they be the
//     same, which is the property that was actually violated. That assertion
//     is deliberately tone-agnostic and should stay that way.
//   · THE OWNER'S RULING HOLDS. Separately and explicitly. On 2026-10-20 the
//     owner chose the PALE BLUE — what sysA / sysB / locB drew — over locA's
//     dark-slate repaint. On 2026-10-21 the designer restyled locA AGAIN, to
//     an OUTLINED treatment, and the owner ruled for THAT, on both pages and
//     both states; locB and sysA still draw pale blue and are stale. The
//     ruling that this file pins is therefore ruling 2, the outlined one:
//     every trigger on the house card surface, selection expressed as a 1px
//     brand border plus a semibold brand label, 100px radius everywhere.
//     By Figma provenance alone the pale blue is still the better-supported
//     reading — three frames to one — so an agent re-deriving the colour from
//     the design will keep arriving back at it. These assertions make that
//     fail loudly instead of silently shipping. See PillTabs' header.
//   · THE CONTROL IS A TAB. role="tablist" / role="tab" / aria-selected, a
//     roving tabindex and arrow-key navigation. The old copies were bare
//     <button aria-current="page">, so screen-reader users were never told the
//     row was a tab set nor which tab was current.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import PillTabs from '@/v2/components/PillTabs'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import { SYSTEMS } from '@/data/systems'

afterEach(cleanup)

const renderLocationPage = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes><Route path="/" element={<HomeAllAccounts />} /></Routes>
    </MemoryRouter>,
  )

const renderSystemPage = () =>
  render(
    <MemoryRouter initialEntries={[`/system/${SYSTEMS[0].id}`]}>
      <Routes><Route path="/system/:systemId" element={<SystemPageV2Screen />} /></Routes>
    </MemoryRouter>,
  )

/* The fill, the border and the ink are what diverged, so they are what is
   compared. All are read as class atoms rather than computed colour: these are
   Tailwind utilities resolved by a build step that does not run under
   happy-dom, so getComputedStyle would report nothing on either page and the
   comparison would pass vacuously.

   Under ruling 2 the FILL is the same on every trigger — selection moved to
   the border — so fillAtom alone can no longer tell selected from resting.
   borderAtom is what carries that now, and both are asserted. */
const fillAtom = (el) =>
  (el.className.match(/\bbg-(?:\[[^\]]*\]|(?:surface-card|slate-\d{2,3}|primary|card|muted|white)\b)/) || [])[0]

const borderAtom = (el) =>
  (el.className.match(/\bborder-(?:\[[^\]]*\]|(?:primary|border|slate-\d{2,3}|transparent)\b)/) || [])[0] ?? null

/* The label span is the one carrying `text-center` — the inner content box and
   the Badge wrapper do not. Picking it by that rather than by position matters
   because the default pill nests the label one level deeper than the wide pill
   does. */
const labelSpan = (el) =>
  [...el.querySelectorAll('span')].find((s) => s.className.includes('text-center'))

/* Only the COLOUR atom. The label also carries the `text-sm` scale atom, and a
   lazier `text-…` match would return the size on every state and compare equal
   forever — so the colour names are listed explicitly. */
const inkAtom = (el) => {
  const found = labelSpan(el).className.match(
    /\btext-(?:\[(?:color:var\([^\]]*\)|#[0-9a-fA-F]{3,8})\]|(?:primary|foreground|muted-foreground|slate-\d{2,3}|white)\b)/,
  )
  return found ? found[0] : undefined
}

describe('the two screens draw the same tab row', () => {
  it('paints the selected tab identically on the Location and System pages', () => {
    renderLocationPage()
    const locationTab = screen.getByRole('tab', { name: 'Overview' })
    const locationFill = fillAtom(locationTab)
    const locationInk = inkAtom(locationTab)
    /* Both reads must actually have found something, or the comparison below
       would pass by matching undefined against undefined — which is exactly
       how a first draft of this test passed while the two pages still
       differed. */
    expect(locationFill, 'selected pill fill was not found at all').toBeDefined()
    expect(locationInk, 'selected pill ink was not found at all').toBeDefined()
    cleanup()

    renderSystemPage()
    const systemTab = screen.getByRole('tab', { name: 'Overview' })

    expect(fillAtom(systemTab), 'selected pill fill').toBe(locationFill)
    expect(inkAtom(systemTab), 'selected pill label colour').toBe(locationInk)
  })

  it('paints the resting tabs identically too', () => {
    renderLocationPage()
    const locationRest = fillAtom(screen.getByRole('tab', { name: 'General Info' }))
    cleanup()

    renderSystemPage()
    expect(fillAtom(screen.getByRole('tab', { name: 'General Info' }))).toBe(locationRest)
  })

  /* THE OWNER'S RULING, pinned. Unlike the two assertions above this one is
     deliberately treatment-SPECIFIC: it is here to fail if someone conforms
     the app back to the pale blue that locB and sysA still draw, which is what
     re-deriving the colour from Figma would suggest — three frames to one.
     Changing it takes the owner's word — see PillTabs' header, ruling 2.

     The values are asserted as TOKEN utilities, not as the node's hexes: the
     row has to follow the theme, and bg-[#fafbfc] / text-[#0b81f8] could not.
     A hex creeping back in fails here. */
  it('ships the outlined treatment the owner ruled for, on both screens', () => {
    const expected = {
      fill: 'bg-surface-card',        // every trigger, selected or not
      selectedBorder: 'border-primary',
      selectedInk: 'text-primary',
      restingInk: 'text-muted-foreground',
    }

    for (const renderPage of [renderLocationPage, renderSystemPage]) {
      renderPage()
      const selected = screen.getByRole('tab', { name: 'Overview' })
      const resting = screen.getByRole('tab', { name: 'General Info' })

      expect(fillAtom(selected)).toBe(expected.fill)
      expect(fillAtom(resting)).toBe(expected.fill)
      expect(borderAtom(selected)).toBe(expected.selectedBorder)
      expect(borderAtom(resting), 'a resting trigger carries no border').toBeNull()
      expect(inkAtom(selected)).toBe(expected.selectedInk)
      expect(inkAtom(resting)).toBe(expected.restingInk)
      expect(selected.className).toContain('rounded-[100px]')
      expect(resting.className).toContain('rounded-[100px]')
      // The ruling's whole point is that this is themeable.
      expect(selected.className).not.toMatch(/#[0-9a-fA-F]{6}/)
      cleanup()
    }
  })

  /* The guard that the duplication does not come back: exactly one module may
     define this row. If a page grows its own copy again, it will not be using
     PillTabs and the shared-instance marker below will go missing. */
  it('renders both rows from the one component', () => {
    renderLocationPage()
    expect(screen.getByRole('tablist').getAttribute('data-name')).toBe('slot')
    cleanup()

    renderSystemPage()
    expect(screen.getByRole('tablist').getAttribute('data-name')).toBe('slot')
  })
})

describe('tab semantics', () => {
  const items = [
    { id: 'overview', label: 'Overview' },
    { id: 'systems', label: 'Systems', count: 10, grow: false },
    { id: 'general', label: 'General Info', pill: 'wide' },
  ]

  const renderRow = (value = 'overview') => {
    const calls = []
    const utils = render(
      <PillTabs items={items} value={value} onChange={(id) => calls.push(id)} />,
    )
    return { ...utils, calls }
  }

  it('is a tablist of tabs, one of them selected', () => {
    renderRow()
    expect(screen.getByRole('tablist').getAttribute('aria-orientation')).toBe('horizontal')
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false'])
  })

  /* One tab stop for the whole row, per the WAI-ARIA tabs pattern — otherwise
     a keyboard user tabs through every trigger to get past the row. */
  it('is one tab stop, with the selected tab carrying it', () => {
    renderRow('systems')
    expect(screen.getAllByRole('tab').map((t) => t.tabIndex)).toEqual([-1, 0, -1])
  })

  it('moves and selects with the arrow keys, wrapping at both ends', () => {
    const { calls } = renderRow()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Overview' }), { key: 'ArrowRight' })
    expect(calls).toEqual(['systems'])

    // Wrapping backwards off the first tab lands on the last.
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Overview' }), { key: 'ArrowLeft' })
    expect(calls).toEqual(['systems', 'general'])
  })

  it('jumps to the ends with Home and End', () => {
    const { calls } = renderRow('systems')
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Systems' }), { key: 'End' })
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Systems' }), { key: 'Home' })
    expect(calls).toEqual(['general', 'overview'])
  })

  it('leaves other keys alone', () => {
    const { calls } = renderRow()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Overview' }), { key: 'ArrowDown' })
    expect(calls).toEqual([])
  })

  it('selects on click', () => {
    const { calls } = renderRow()
    fireEvent.click(screen.getByRole('tab', { name: 'General Info' }))
    expect(calls).toEqual(['general'])
  })

  /* The count is the Badge's business, not the tab's name — folding it in once
     renamed "Systems" to "Systems 10" and broke name-based lookup. */
  it('keeps the count out of the tab name and still announces it', () => {
    renderRow()
    const systems = screen.getByRole('tab', { name: 'Systems' })
    expect(within(systems).getByLabelText('10 systems')).toBeTruthy()
    expect(screen.queryByRole('tab', { name: 'Systems 10' })).toBeNull()
  })

  it('draws a badge only where a count was given', () => {
    const { container } = renderRow()
    expect(container.querySelectorAll('[aria-label$="systems"]')).toHaveLength(1)
  })
})

describe('the one ruled treatment', () => {
  const items = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]

  /* There is only one treatment now. Ruling 1 (2026-10-20, pale blue) and the
     `tone` prop that carried it — 'blue' for sysA/sysB/locB, 'slate' for
     locA's dark repaint — were superseded by ruling 2 on 2026-10-21 and are
     gone from the component. PillTabs' header keeps the reasoning for both;
     what is pinned here is the state that ships. */
  it('draws selection as a border on the house card surface, not as a fill', () => {
    render(<PillTabs items={items} value="a" onChange={() => {}} />)
    const selected = screen.getByRole('tab', { name: 'A' })
    const resting = screen.getByRole('tab', { name: 'B' })

    expect(fillAtom(selected)).toBe('bg-surface-card')
    expect(fillAtom(resting)).toBe('bg-surface-card')
    expect(borderAtom(selected)).toBe('border-primary')
    expect(borderAtom(resting)).toBeNull()
    expect(inkAtom(selected)).toBe('text-primary')
    expect(inkAtom(resting)).toBe('text-muted-foreground')
    expect(labelSpan(selected).className).toContain('font-semibold')
    expect(labelSpan(resting).className).toContain('font-medium')
  })

  /* The `tone` prop is gone, and Phase 4 removed the leftover tone="blue"
     from both page files, so nothing passes it today. This stays as a
     regression guard: an unknown prop must be inert, not a silent fall-back
     to a treatment nobody ruled for. */
  it('ignores a leftover tone prop rather than repainting for it', () => {
    render(<PillTabs items={items} value="a" onChange={() => {}} tone="slate" />)
    const selected = screen.getByRole('tab', { name: 'A' })
    expect(fillAtom(selected)).toBe('bg-surface-card')
    expect(borderAtom(selected)).toBe('border-primary')
  })

  /* Phase 3 (docs/TOKENIZATION-PLAN.md) retired the escaped Figma token names
     here, and ruling 2 collapsed the old 14px/26px per-pill radius split onto
     one 100px radius. An escaped `\/`, or a two-argument var(), reappearing
     means a call site was pasted back in from Figma without being tokenised. */
  it('carries one radius on every trigger, with no Figma token name left', () => {
    render(<PillTabs items={items} value="a" onChange={() => {}} />)
    const resting = screen.getByRole('tab', { name: 'B' })
    expect(resting.className).toContain('rounded-[100px]')
    expect(resting.className).not.toContain('var(--')
    expect(resting.className).not.toContain('\\/')
  })

  /* The wide pill is still a different Figma component from the default pill —
     see PillTabs' header — but under ruling 2 the difference is no longer the
     RADIUS: both are 100px. What is left is structural, and that is what this
     pins: the wide pill has no inner content box, so its label is a direct
     child of the button, and it carries its own gap-2 py-1. */
  it('keeps the wide pill structurally distinct, now at the shared radius', () => {
    render(
      <PillTabs
        items={[{ id: 'a', label: 'A' }, { id: 'w', label: 'W', pill: 'wide' }]}
        value="a"
        onChange={() => {}}
      />,
    )
    const wide = screen.getByRole('tab', { name: 'W' })
    const normal = screen.getByRole('tab', { name: 'A' })

    expect(wide.className).toContain('rounded-[100px]')
    expect(normal.className).toContain('rounded-[100px]')
    // The wide pill lays its own row out; the default pill is a column.
    expect(wide.className).toContain('gap-2 py-1')
    expect(wide.className).not.toContain('flex-col')
    expect(normal.className).toContain('flex-col')
    // No inner content box: the label is a direct child.
    expect(labelSpan(wide).parentElement).toBe(wide)
    expect(labelSpan(normal).parentElement).not.toBe(normal)
  })

  /* Geometry is per position, not per state: a trigger carrying a Badge is
     intrinsically wide and the node gives it shrink-0, so selecting a
     different tab must not make it grow. */
  it('keeps a shrink-0 trigger shrink-0 whether or not it is selected', () => {
    const row = [{ id: 'a', label: 'A' }, { id: 's', label: 'S', count: 3, grow: false }]
    const { rerender } = render(<PillTabs items={row} value="a" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'S' }).className).toContain('shrink-0')

    rerender(<PillTabs items={row} value="s" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'S' }).className).toContain('shrink-0')
    expect(screen.getByRole('tab', { name: 'S' }).className).not.toContain('flex-[1_0_0]')
  })
})
