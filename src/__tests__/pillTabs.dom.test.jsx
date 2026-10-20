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
//   · THE OWNER'S RULING HOLDS. Separately and explicitly: on 2026-10-20 the
//     owner chose the PALE BLUE — what sysA / sysB / locB draw — over locA's
//     newer dark-slate repaint. By Figma provenance alone slate is the
//     better-supported reading, so an agent re-deriving the colour from the
//     design will keep arriving at it. One test below pins the ruling so that
//     "fixing" it back fails loudly instead of silently shipping.
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

/* The fill and the ink are what diverged, so they are what is compared. Both
   are read as class atoms rather than computed colour: these are Tailwind
   arbitrary values resolved by a build step that does not run under happy-dom,
   so getComputedStyle would report nothing on either page and the comparison
   would pass vacuously. */
const fillAtom = (el) => (el.className.match(/\bbg-\[[^\]]*\]/) || [])[0]

/* The label span is the one carrying `text-center` — the inner content box and
   the Badge wrapper do not. Picking it by that rather than by position matters
   because the default pill nests the label one level deeper than the wide pill
   does. */
const labelSpan = (el) =>
  [...el.querySelectorAll('span')].find((s) => s.className.includes('text-center'))

/* Only the COLOUR atom. The label also carries `text-[14px]`, and a lazier
   `text-[…]` match would return the size on every tone and compare equal
   forever. */
const inkAtom = (el) => {
  const found = labelSpan(el).className.match(/\btext-\[(?:color:var\([^\]]*\)|#[0-9a-fA-F]{3,8})\]/)
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
     deliberately tone-SPECIFIC: it is here to fail if someone conforms the app
     to locA's newer slate repaint, which is what re-deriving the colour from
     Figma would suggest. Changing it takes the owner's word — see PillTabs'
     header. */
  it('ships the pale blue the owner ruled for, on both screens', () => {
    const expected = {
      fill: 'bg-[#c7e3ff]',
      ink: String.raw`text-[color:var(--wint-blue-accent,#0b81f8)]`,
      rest: String.raw`bg-[var(--colors\/slate\/200,#e2e8f0)]`,
    }

    renderLocationPage()
    expect(fillAtom(screen.getByRole('tab', { name: 'Overview' }))).toBe(expected.fill)
    expect(inkAtom(screen.getByRole('tab', { name: 'Overview' }))).toBe(expected.ink)
    expect(fillAtom(screen.getByRole('tab', { name: 'General Info' }))).toBe(expected.rest)
    cleanup()

    renderSystemPage()
    expect(fillAtom(screen.getByRole('tab', { name: 'Overview' }))).toBe(expected.fill)
    expect(inkAtom(screen.getByRole('tab', { name: 'Overview' }))).toBe(expected.ink)
    expect(fillAtom(screen.getByRole('tab', { name: 'General Info' }))).toBe(expected.rest)
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

describe('the tone variants', () => {
  const items = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]

  /* Both tones are real readings of the design — see PillTabs' header. 'blue'
     is what sysA / sysB / locB emit, three of the four frames, and is THE
     TREATMENT THE OWNER RULED FOR on 2026-10-20; it is the default and what
     both pages ship. 'slate' is locA, the one instance the designer has
     restyled since, kept whole because the Figma file is still
     self-contradictory and the designer may yet settle there. */
  it('defaults to the blue tone the owner ruled for', () => {
    render(<PillTabs items={items} value="a" onChange={() => {}} />)
    const selected = screen.getByRole('tab', { name: 'A' })
    expect(fillAtom(selected)).toBe('bg-[#c7e3ff]')
    expect(inkAtom(selected)).toBe(String.raw`text-[color:var(--wint-blue-accent,#0b81f8)]`)
    expect(fillAtom(screen.getByRole('tab', { name: 'B' })))
      .toBe(String.raw`bg-[var(--colors\/slate\/200,#e2e8f0)]`)
  })

  it('still carries the slate tone locA emits', () => {
    render(<PillTabs items={items} value="a" onChange={() => {}} tone="slate" />)
    const selected = screen.getByRole('tab', { name: 'A' })
    expect(fillAtom(selected)).toBe(String.raw`bg-[var(--colors\/slate\/500,#62748e)]`)
    expect(inkAtom(selected)).toBe('text-[#edf1fc]')
    expect(fillAtom(screen.getByRole('tab', { name: 'B' }))).toBe('bg-[#fafbfc]')
  })

  /* The escaped slash is the repo's standing trap: `\/` in a plain JS string
     collapses to a bare `/`, Tailwind reads it as an opacity modifier, and the
     utility silently never reaches the DOM. These classes are built with
     String.raw and joined by hand rather than through cn(), so the backslash
     must survive into the rendered attribute. */
  it('keeps the backslash in the token class names', () => {
    render(<PillTabs items={items} value="a" onChange={() => {}} />)
    const resting = screen.getByRole('tab', { name: 'B' })
    expect(resting.className).toContain(String.raw`rounded-[var(--component\/tabs\/trigger\/radius,14px)]`)
    expect(resting.className).not.toContain('--component/tabs/trigger/radius')
  })

  /* The wide pill is a different Figma component at radius 26, not the default
     pill with a prop — see PillTabs' header. */
  it('gives the wide pill its own radius', () => {
    render(
      <PillTabs
        items={[{ id: 'a', label: 'A' }, { id: 'w', label: 'W', pill: 'wide' }]}
        value="a"
        onChange={() => {}}
      />,
    )
    expect(screen.getByRole('tab', { name: 'W' }).className)
      .toContain(String.raw`rounded-[var(--component\/tabs\/list\/radius-horizontal,26px)]`)
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
