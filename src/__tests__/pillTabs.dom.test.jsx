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
// ⚠ NEITHER SCREEN DRAWS THE ROW ANY MORE — 2026-11-07. The restructure
//   replaced it with the More badge and a floating menu ("we are replacing
//   tabs with the more button"), so HomeAllAccounts and SystemPageV2Screen
//   no longer import PillTabs and the component is mounted nowhere. The
//   describe that rendered the two real pages and compared their rows is
//   REMOVED — its full note stands where it did, below the page helpers.
//   Everything that renders PillTabs DIRECTLY stays and still passes: the
//   owner's rulings on this control have not been withdrawn, only unmounted,
//   and this file is what keeps them enforced while it is dormant.
//
// So the assertions here are in two groups:
//
//   · THE TWO SCREENS AGREE. ⚠ REMOVED 2026-11-07 — see above. Described
//     here still because it is why this file is shaped the way it is. Not "each screen matches a hard-coded hex" —
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

import PillTabs from '@/v2/components/PillTabs'

/* ONE COMPONENT UNDER TEST, AND THAT IS THE WHOLE STORY OF THIS FILE NOW.
   It used to pull in the two real pages (HomeAllAccounts, SystemPageV2Screen),
   the SYSTEMS fixture and react-router as well, for two helpers —
   `renderLocationPage` / `renderSystemPage` — that mounted those pages so
   their tab rows could be compared against each other. Neither page draws a
   row since 2026-11-07; the helpers and the block that used them are gone,
   and those four dependencies with them. Everything below renders PillTabs
   directly.

   ⚠ THIS NOTE SITS BELOW THE LINE IT DESCRIBES, NOT ABOVE IT, AND THAT IS NOT
     A STYLE CHOICE. scripts/check-jsx-refs.mjs works out what a file DEFINES
     with a regex that does NOT skip comments — deliberately, per its own
     header, because stripping them ate real lines and turned one false
     positive into eight. That regex runs from the keyword that opens a module
     dependency to the next ` from '`, so prose using that keyword in
     lowercase, above a real one, swallows it whole and the component reads as
     undefined. Two drafts of this comment did exactly that. Keep prose that
     needs the word BELOW every real one. */

afterEach(cleanup)

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

/* ── `the two screens draw the same tab row` STOOD HERE — REMOVED 2026-11-07 ──
   FOUR TESTS, ALL RENDERING THE TWO REAL PAGES: that the selected pill was
   painted identically on both, that the resting pills were, that both shipped
   ruling 3's segmented control, and that both rows came from this one module
   rather than a per-page copy.

   WHY THEY ARE REMOVED AND NOT RE-AIMED. Their subject no longer exists. The
   owner replaced the row itself — "we are replacing tabs with the more button
   / needs to open as a floating component like in ios" — so HomeAllAccounts
   and SystemPageV2Screen draw NO tab row and do not import PillTabs.
   `getByRole('tab')` on either page throws, which is what these four were
   doing. There is no second screen left to compare the first against, and the
   divergence they were written to catch — two hand-rolled `TabTrigger` copies
   drifting apart — cannot recur while zero pages draw a row.

   THE MOUNT LAPSED, NOT THE GUARD. If a page ever draws this row again,
   restore this block rather than writing a new one: the property it pinned
   (the two screens AGREE, read off the real pages, rather than each matching
   a hard-coded hex) is still the right shape of test, and it is the one that
   caught the real bug.

   NOTHING ELSE IN THIS FILE MOVED. Every remaining test renders PillTabs
   directly and passes, so rulings 2 and 3 stay enforced while the component
   is dormant — including ruling 3's TRACK, whose four atoms were asserted
   ONLY here and are re-asserted in `the one ruled treatment` below, so this
   deletion costs no coverage. What does go with the mount is the
   `data-name="slot"` single-source marker, which only ever meant anything
   while two pages drew the row.

   ⚠ THE COMPONENT IS NOT DELETED, deliberately — see the DORMANT note at the
     top of src/v2/components/PillTabs.jsx. Retiring a file that carries a
     live owner ruling is the owner's call, not a cleanup pass's. */

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
  it('lifts the selected trigger out of the track, and leaves the resting one on it', () => {
    render(<PillTabs items={items} value="a" onChange={() => {}} />)
    const selected = screen.getByRole('tab', { name: 'A' })
    const resting = screen.getByRole('tab', { name: 'B' })

    expect(fillAtom(selected)).toBe('bg-card')
    expect(fillAtom(resting)).toBeUndefined()
    expect(borderAtom(selected)).toBe('border-primary')
    expect(borderAtom(resting)).toBe('border-transparent')
    expect(inkAtom(selected)).toBe('text-primary')
    expect(inkAtom(resting)).toBe('text-muted-foreground')
    expect(labelSpan(selected).className).toContain('font-semibold')
    expect(labelSpan(resting).className).toContain('font-medium')
    /* The two stacked drop shadows are the node's and are what makes the
       selected trigger read as lifted rather than merely outlined. */
    expect(selected.className).toContain('shadow-[0_1px_2px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.1)]')
    expect(resting.className).not.toContain('shadow-[')

    /* THE TRACK, which is the whole of what ruling 3 added over ruling 2's
       trackless lozenges: slate-200 at radius 10 with a 3px inset, on a 32px
       row. Asserted here since 2026-11-07 — it used to be pinned only by the
       removed two-screens block above, and a ruling with no test left is a
       ruling the next re-derivation from Figma quietly loses.

       TOKEN UTILITIES, NEVER THE NODE'S HEXES: the row has to follow all four
       themes and bg-[#fafbfc] could not. A hex creeping back in fails here. */
    const track = selected.closest('[data-name="Tabs"]')
    expect(track, 'the segmented track is gone - ruling 3 put the triggers IN one').toBeTruthy()
    expect(track.className).toContain('bg-slate-200')
    expect(track.className).toContain('rounded-lg')
    expect(track.className).toContain('p-[3px]')
    expect(track.className).toContain('h-[32px]')
    expect(selected.className).not.toMatch(/#[0-9a-fA-F]{6}/)
    expect(track.className).not.toMatch(/#[0-9a-fA-F]{6}/)
  })

  /* The `tone` prop is gone, and Phase 4 removed the leftover tone="blue"
     from both page files, so nothing passes it today. This stays as a
     regression guard: an unknown prop must be inert, not a silent fall-back
     to a treatment nobody ruled for. */
  it('ignores a leftover tone prop rather than repainting for it', () => {
    render(<PillTabs items={items} value="a" onChange={() => {}} tone="slate" />)
    const selected = screen.getByRole('tab', { name: 'A' })
    expect(fillAtom(selected)).toBe('bg-card')
    expect(borderAtom(selected)).toBe('border-primary')
  })

  /* Phase 3 (docs/TOKENIZATION-PLAN.md) retired the escaped Figma token names
     here, and ruling 2 collapsed the old 14px/26px per-pill radius split onto
     one 100px radius. An escaped `\/`, or a two-argument var(), reappearing
     means a call site was pasted back in from Figma without being tokenised. */
  it('carries one radius on every trigger, with no Figma token name left', () => {
    render(<PillTabs items={items} value="a" onChange={() => {}} />)
    const resting = screen.getByRole('tab', { name: 'B' })
    /* Ruling 3: the node's 8px trigger inside a 10px track. It was a 100px
       lozenge under ruling 2, which had no track to sit in. */
    expect(resting.className).toContain('rounded-md')
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

    expect(wide.className).toContain('rounded-md')
    expect(normal.className).toContain('rounded-md')
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
