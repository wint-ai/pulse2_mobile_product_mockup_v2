// @vitest-environment happy-dom
//
// The System tab on the location / account entity.
//
// Built from Figma "Table 16 - Pro Application Block", screenSize=Small
// (176511:26284). Its track is `minmax(0,1fr) 80px 56px`: an identity column,
// ONE badge column and an action cell. The content spec (198736:52372) is the
// desktop table and has EIGHT columns.
//
// ── WHAT CHANGED ON 2026-11-08, AND WHY THESE TESTS MOVED ────────────────
// The owner, on a screenshot: "the pagination below ... it's not the best
// practices for mobile app, I think something like show more needs to be
// there", and "we need to add a column management for the table".
//
// So two contracts in here are deliberately gone:
//
//   PAGING. `PAGE_SIZE = 6` with "Page 1 of 18" and « ‹ › » is a desktop
//   pattern on a 393px frame. The three tests that pinned it (page size, the
//   disabled ends, and the clamp that stopped a narrowed search stranding the
//   viewer on page 7 of 2) are rewritten below against the Show-more contract.
//   The LAST of those three is the one worth reading twice: the defect it
//   guarded — a narrowing search leaving the viewer looking at nothing — is
//   still a real defect, it just has a different shape now, so it is still
//   tested rather than dropped with the pager.
//
//   THE FIXED THIRD COLUMN. "System + Leak + a chevron" was a bet that one
//   field matters to every viewer, and the owner's screenshot lost that bet —
//   Leak was an em dash on four of five visible rows. The column set is the
//   viewer's now, so the test that pinned "the other five fields are behind
//   the disclosure" becomes "whatever is NOT a column is behind the
//   disclosure", which is the invariant that actually matters: the detail list
//   must never repeat a column the viewer can already see.
//
// Still pinned, unchanged: Water Flow and Life Cycle are never invented, a
// valveless system says "No valve" rather than showing a dash, and the cap on
// how many columns may sit beside System.

import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import SystemsTableCard from '@/v2/components/SystemsTableCard'
import {
  DEFAULT_DATA_COLUMNS,
  MAX_DATA_COLUMNS,
} from '@/v2/components/systemsTableColumns'

afterEach(cleanup)
// The column choice persists in localStorage, so one test's ticking would
// otherwise be the next test's starting state.
beforeEach(() => localStorage.clear())

const system = (over = {}) => ({
  id: 'S-1',
  name: 'Booster Pump 12',
  l4Name: '360 Magnolia Row',
  address: '352 Palmer Road, Ware MA 1082',
  leak: 'high',
  valve: 'open',
  comm: 'online',
  power: 'ac',
  ...over,
})

const many = (n) =>
  Array.from({ length: n }, (_, i) =>
    system({ id: `S-${i}`, name: `System ${i}`, leak: i % 2 ? 'low' : 'high' }),
  )

const headers = (container) =>
  [...container.querySelectorAll('thead th')]
    .map((th) => th.textContent.trim())
    .filter((t) => t && t !== 'Details')

describe('the systems table', () => {
  it('renders a real table, with System locked on and the default data columns beside it', () => {
    const { container } = render(<SystemsTableCard systems={[system()]} />)
    const view = within(container)

    // A real <table>, not a grid of divs: these rows are interactive and the
    // row/column relationship has to survive for a screen reader.
    expect(container.querySelector('table')).toBeTruthy()

    // System is the row's identity and is never optional.
    expect(view.getByRole('columnheader', { name: 'System' })).toBeTruthy()
    // The shipped default: Leak (the product's reason for existing) plus Comm
    // (populated on every record, so no row is ever blank).
    expect(headers(container)).toEqual(['System', 'Leak', 'Comm'])
    expect(DEFAULT_DATA_COLUMNS).toEqual(['leak', 'comm'])

    expect(view.getByText('Booster Pump 12')).toBeTruthy()
    expect(view.getByText('High')).toBeTruthy()
    expect(view.getByText('Online')).toBeTruthy()
  })

  it('keeps every field that is NOT a column behind the disclosure, and never repeats one', () => {
    const { container } = render(<SystemsTableCard systems={[system()]} />)
    const view = within(container)

    // Collapsed: the two hidden columns are nowhere.
    expect(view.queryByText('Valve state')).toBeNull()
    expect(view.queryByText('Power')).toBeNull()

    fireEvent.click(view.getByText('Booster Pump 12'))

    // The hidden ones appear...
    expect(view.getByText('Valve state')).toBeTruthy()
    expect(view.getByText('Open')).toBeTruthy()
    expect(view.getByText('Power')).toBeTruthy()
    expect(view.getByText('AC')).toBeTruthy()
    // ...and the street address, which no column ever carries.
    expect(view.getByText('352 Palmer Road, Ware MA 1082')).toBeTruthy()

    // THE NO-REPEAT RULE. Leak and Comm are visible columns, so the detail
    // list must not draw them again — `Online` stays a single occurrence.
    expect(view.getAllByText('Online')).toHaveLength(1)
    expect(view.queryByText('Leak')).toBeTruthy() // the column header only
    expect(container.querySelectorAll('thead th')).toHaveLength(4)

    // And it closes again.
    fireEvent.click(view.getByText('Booster Pump 12'))
    expect(view.queryByText('Valve state')).toBeNull()
  })

  it('does NOT invent Water Flow or Life Cycle', () => {
    // Both are in the desktop spec; neither has a field in the dataset and the
    // derivation rule is still owed. Absent beats fabricated — and that is why
    // neither is offered in the column chooser either.
    const { container } = render(<SystemsTableCard systems={[system()]} />)
    fireEvent.click(within(container).getByText('Booster Pump 12'))

    expect(within(container).queryByText(/water flow/i)).toBeNull()
    expect(within(container).queryByText(/life ?cycle/i)).toBeNull()

    fireEvent.click(within(container).getByRole('button', { name: 'Columns' }))
    expect(within(container).queryByText(/water flow/i)).toBeNull()
    expect(within(container).queryByText(/life ?cycle/i)).toBeNull()
  })

  it('reports a system with no valve as such, rather than as a dash', () => {
    // buildTree.js: 20 of the 53 MRG systems are metering-only and genuinely
    // carry valve: null. "No valve" is a fact; "—" reads as missing data.
    const { container } = render(<SystemsTableCard systems={[system({ valve: null })]} />)
    fireEvent.click(within(container).getByText('Booster Pump 12'))
    expect(within(container).getByText('No valve')).toBeTruthy()
  })

  it('shows a dash for a system with no leak, not an empty badge', () => {
    const { container } = render(<SystemsTableCard systems={[system({ leak: null })]} />)
    expect(within(container).queryByText('High')).toBeNull()
    expect(within(container).queryByText('Low')).toBeNull()
  })

  it('opens the system page from the expanded row', () => {
    const opened = []
    const { container } = render(
      <SystemsTableCard systems={[system()]} onOpenSystem={(s) => opened.push(s.id)} />,
    )
    fireEvent.click(within(container).getByText('Booster Pump 12'))
    fireEvent.click(within(container).getByRole('button', { name: 'Open system page' }))
    expect(opened).toEqual(['S-1'])
  })

  it('counts everything in scope on the header badge, not what is on screen', () => {
    // The badge meant "systems at this location" under the pager and still
    // does under Show more, independently of search, filters and batching.
    const { container } = render(<SystemsTableCard systems={many(14)} />)
    const view = within(container)
    expect(view.getByText('14')).toBeTruthy()
    expect(view.getByText('Showing 10 of 14')).toBeTruthy()
  })
})

describe('show more', () => {
  it('appends a batch at a time instead of paging, and says where you are', () => {
    const { container } = render(<SystemsTableCard systems={many(14)} />)
    const view = within(container)

    // No pager anywhere any more.
    expect(view.queryByText(/^Page \d+ of \d+$/)).toBeNull()
    expect(view.queryByRole('button', { name: 'Next page' })).toBeNull()
    expect(view.queryByRole('button', { name: 'Last page' })).toBeNull()

    expect(view.getByText('Showing 10 of 14')).toBeTruthy()
    expect(view.getByText('System 0')).toBeTruthy()
    expect(view.getByText('System 9')).toBeTruthy()
    expect(view.queryByText('System 10')).toBeNull()

    fireEvent.click(view.getByRole('button', { name: 'Show more' }))

    // APPENDED, not replaced: the row you were looking at is still there.
    expect(view.getByText('System 0')).toBeTruthy()
    expect(view.getByText('System 13')).toBeTruthy()
    expect(view.getByText('Showing 14 of 14')).toBeTruthy()
  })

  it('leaves no dangling control once the list is exhausted', () => {
    const { container } = render(<SystemsTableCard systems={many(14)} />)
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: 'Show more' }))
    expect(view.queryByRole('button', { name: 'Show more' })).toBeNull()
  })

  it('never draws the control when one batch already holds everything', () => {
    const { container } = render(<SystemsTableCard systems={many(4)} />)
    const view = within(container)
    expect(view.queryByRole('button', { name: 'Show more' })).toBeNull()
    expect(view.getByText('Showing 4 of 4')).toBeTruthy()
  })

  it('restarts at one batch when the search text changes', () => {
    // The defect the old page-clamp guarded, in its new shape: having expanded
    // the list, a narrowing search must not leave a stale, over-long window.
    const { container } = render(<SystemsTableCard systems={many(24)} />)
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: 'Show more' }))
    expect(view.getByText('Showing 20 of 24')).toBeTruthy()

    fireEvent.change(view.getByRole('searchbox', { name: 'Search systems' }), {
      target: { value: 'System 1' },
    })

    // "System 1", "System 1x" — 11 hits, so the window is back to one batch.
    expect(view.getByText('Showing 10 of 11 (filtered)')).toBeTruthy()
    expect(view.getByRole('button', { name: 'Show more' })).toBeTruthy()
  })

  it('restarts at one batch when the filter selection changes', () => {
    // 12 of the 24 carry valve: 'open', the other 12 'closed'.
    const fleet = many(24).map((s, i) => (i % 2 ? { ...s, valve: 'closed' } : s))
    const { container, rerender } = render(
      <SystemsTableCard systems={fleet} selection={{}} onOpenFilters={() => {}} />,
    )
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: 'Show more' }))
    expect(view.getByText('Showing 20 of 24')).toBeTruthy()

    rerender(
      <SystemsTableCard
        systems={fleet}
        selection={{ valve: ['open'] }}
        onOpenFilters={() => {}}
      />,
    )
    expect(view.getByText('Showing 10 of 12 (filtered)')).toBeTruthy()
  })

  it('says so when a search matches nothing, and distinguishes that from an empty scope', () => {
    const { container, rerender } = render(<SystemsTableCard systems={many(3)} />)
    const view = within(container)

    fireEvent.change(view.getByRole('searchbox', { name: 'Search systems' }), {
      target: { value: 'zzzz' },
    })
    expect(view.getByText(/No system matches/)).toBeTruthy()
    // A readout about nothing is worse than no readout.
    expect(view.queryByText(/^Showing /)).toBeNull()

    rerender(<SystemsTableCard systems={[]} />)
    expect(within(container).getByText('No systems at this location.')).toBeTruthy()
  })
})

describe('column management', () => {
  const openPanel = (container) => {
    fireEvent.click(within(container).getByRole('button', { name: 'Columns' }))
    return within(container).getByRole('group', { name: 'Columns' })
  }

  it('opens from the toolbar, beside the filter control', () => {
    const { container } = render(
      <SystemsTableCard systems={[system()]} onOpenFilters={() => {}} />,
    )
    const view = within(container)

    const trigger = view.getByRole('button', { name: 'Columns' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    // The filter control is untouched and still addressable by its own name.
    expect(view.getByRole('button', { name: 'Filter by' })).toBeTruthy()

    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(view.getByRole('group', { name: 'Columns' })).toBeTruthy()
  })

  it('offers only columns the dataset actually backs', () => {
    const { container } = render(<SystemsTableCard systems={[system()]} />)
    const panel = within(openPanel(container))

    for (const label of ['System', 'Leak', 'Valve state', 'Comm', 'Power']) {
      expect(panel.getByText(label), label).toBeTruthy()
    }
    // Location is the identity cell's sub-line, not a 76px column.
    expect(panel.queryByText('Location')).toBeNull()
    expect(panel.getAllByRole('checkbox')).toHaveLength(5)
  })

  it('shows a ticked column and hides an unticked one', () => {
    const { container } = render(<SystemsTableCard systems={[system()]} />)
    const panel = within(openPanel(container))

    expect(headers(container)).toEqual(['System', 'Leak', 'Comm'])

    // Off: Comm leaves the table and falls back into the disclosure.
    fireEvent.click(panel.getByText('Comm'))
    expect(headers(container)).toEqual(['System', 'Leak'])

    // On: Power joins it, in DATA_COLUMNS order rather than tick order.
    fireEvent.click(panel.getByText('Power'))
    expect(headers(container)).toEqual(['System', 'Leak', 'Power'])
    expect(within(container).getByText('AC')).toBeTruthy()
  })

  it('will not let System be hidden', () => {
    const { container } = render(<SystemsTableCard systems={[system()]} />)
    const panel = within(openPanel(container))

    const boxes = panel.getAllByRole('checkbox')
    // It is aria-disabled rather than disabled, so the reason stays reachable
    // by assistive tech instead of the control being skipped outright.
    expect(boxes[0].getAttribute('aria-disabled')).toBe('true')
    expect(boxes[0].getAttribute('aria-checked')).toBe('true')
    expect(panel.getByText('Always shown')).toBeTruthy()

    fireEvent.click(panel.getByText('System'))
    expect(headers(container)).toContain('System')
    expect(boxes[0].getAttribute('aria-checked')).toBe('true')
  })

  it('caps the data columns, and says so rather than ignoring the tap', () => {
    const { container } = render(<SystemsTableCard systems={[system()]} />)
    const panel = within(openPanel(container))

    expect(MAX_DATA_COLUMNS).toBe(2)
    expect(panel.getByText(`2 of ${MAX_DATA_COLUMNS} selected`)).toBeTruthy()

    // At the cap, the unticked boxes are blocked — and visibly so.
    const valve = panel.getAllByRole('checkbox')[2] // System, Leak, Valve state
    expect(valve.getAttribute('aria-disabled')).toBe('true')

    fireEvent.click(panel.getByText('Valve state'))
    expect(headers(container)).toEqual(['System', 'Leak', 'Comm'])

    // Free a slot and the same tap now works.
    fireEvent.click(panel.getByText('Leak'))
    expect(panel.getByText(`1 of ${MAX_DATA_COLUMNS} selected`)).toBeTruthy()
    expect(valve.getAttribute('aria-disabled')).toBeNull()
    fireEvent.click(panel.getByText('Valve state'))
    expect(headers(container)).toEqual(['System', 'Valve state', 'Comm'])
  })

  it('allows System on its own', () => {
    const { container } = render(<SystemsTableCard systems={[system()]} />)
    const panel = within(openPanel(container))

    fireEvent.click(panel.getByText('Leak'))
    fireEvent.click(panel.getByText('Comm'))
    expect(headers(container)).toEqual(['System'])
    expect(panel.getByText(`0 of ${MAX_DATA_COLUMNS} selected`)).toBeTruthy()

    // Everything then lives in the disclosure. Scoped to the TABLE: the
    // chooser is still open above it and lists the same four words.
    const table = within(container.querySelector('table'))
    fireEvent.click(table.getByText('Booster Pump 12'))
    for (const label of ['Leak', 'Valve state', 'Comm', 'Power']) {
      expect(table.getByText(label), label).toBeTruthy()
    }
    expect(table.getByText('Online')).toBeTruthy()
  })

  it('survives a remount — the choice is persisted, not component state', () => {
    const { container, unmount } = render(<SystemsTableCard systems={[system()]} />)
    const panel = within(openPanel(container))
    fireEvent.click(panel.getByText('Comm'))
    fireEvent.click(panel.getByText('Power'))
    expect(headers(container)).toEqual(['System', 'Leak', 'Power'])

    unmount()
    const second = render(<SystemsTableCard systems={[system()]} />)
    expect(headers(second.container)).toEqual(['System', 'Leak', 'Power'])
  })

  it('falls back to the default set when the stored value is corrupt, rather than throwing', () => {
    // House style, src/data/valveCommandStore.js: a stored value that does not
    // VALIDATE is treated as absent. A hand-edited key must not be able to
    // throw into the render tree, nor put an unknown id into a colgroup.
    for (const bad of ['not json at all', '{"leak":true}', '"leak"', '42', 'null']) {
      localStorage.setItem('pulse2-systems-columns', bad)
      const { container, unmount } = render(<SystemsTableCard systems={[system()]} />)
      expect(headers(container), bad).toEqual(['System', 'Leak', 'Comm'])
      unmount()
    }
  })

  it('rejects a stored array holding an id this build does not know', () => {
    // Filtering it down to what parses would turn ["nope"] into [], which is
    // indistinguishable from a deliberate "System only" — so a corrupt key
    // would quietly produce a bare table forever. It yields the default set.
    localStorage.setItem(
      'pulse2-systems-columns',
      JSON.stringify(['power', 'waterFlow', 'lifeCycle']),
    )
    const { container } = render(<SystemsTableCard systems={[system()]} />)
    expect(headers(container)).toEqual(['System', 'Leak', 'Comm'])
  })

  it('repairs an over-cap stored array instead of rejecting it', () => {
    // Every id is known; there are just too many — which is what a value
    // written by a build with a different cap would look like. Truncated in
    // DATA_COLUMNS order, not in stored order.
    localStorage.setItem(
      'pulse2-systems-columns',
      JSON.stringify(['power', 'valve', 'comm', 'leak']),
    )
    const { container } = render(<SystemsTableCard systems={[system()]} />)
    expect(headers(container)).toEqual(['System', 'Leak', 'Valve state'])
  })

  it('honours a stored empty array — System on its own is a real choice', () => {
    localStorage.setItem('pulse2-systems-columns', '[]')
    const { container } = render(<SystemsTableCard systems={[system()]} />)
    expect(headers(container)).toEqual(['System'])
  })
})
