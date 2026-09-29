// @vitest-environment happy-dom
//
// The System tab on the location / account entity.
//
// Built from Figma "Table 16 - Pro Application Block", screenSize=Small
// (176511:26284) — the only table in the shadcncraft library drawn at phone
// width. Its track is `minmax(0,1fr) 80px 56px`: an identity column, ONE badge
// column and a 56px action cell. The content spec (198736:52372) is the
// desktop table and has EIGHT columns, so the other five live behind the
// row disclosure. These tests pin that resolution, because the temptation on
// any future pass is to quietly add a column the mobile node has no room for.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import SystemsTableCard from '@/v2/components/SystemsTableCard'

afterEach(cleanup)

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

describe('the systems table', () => {
  it('renders a real table with the node’s two visible columns', () => {
    const { container } = render(<SystemsTableCard systems={[system()]} />)
    const view = within(container)

    // A real <table>, not a grid of divs: these rows are interactive and the
    // row/column relationship has to survive for a screen reader.
    expect(container.querySelector('table')).toBeTruthy()

    expect(view.getByRole('columnheader', { name: 'System' })).toBeTruthy()
    expect(view.getByRole('columnheader', { name: 'Leak' })).toBeTruthy()

    expect(view.getByText('Booster Pump 12')).toBeTruthy()
    expect(view.getByText('High')).toBeTruthy()
  })

  it('keeps the other five fields behind the disclosure, not in a column', () => {
    const { container } = render(<SystemsTableCard systems={[system()]} />)
    const view = within(container)

    // Collapsed: no Valve / Comm / Power anywhere.
    expect(view.queryByText('Valve state')).toBeNull()
    expect(view.queryByText('Comm')).toBeNull()

    fireEvent.click(view.getByText('Booster Pump 12'))

    expect(view.getByText('Valve state')).toBeTruthy()
    expect(view.getByText('Open')).toBeTruthy()
    expect(view.getByText('Online')).toBeTruthy()
    expect(view.getByText('AC')).toBeTruthy()
    expect(view.getByText('352 Palmer Road, Ware MA 1082')).toBeTruthy()

    // And it closes again.
    fireEvent.click(view.getByText('Booster Pump 12'))
    expect(view.queryByText('Valve state')).toBeNull()
  })

  it('does NOT invent Water Flow or Life Cycle', () => {
    // Both are in the desktop spec; neither has a field in the dataset and the
    // derivation rule is still owed. Absent beats fabricated.
    const { container } = render(<SystemsTableCard systems={[system()]} />)
    fireEvent.click(within(container).getByText('Booster Pump 12'))

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
})

describe('paging and search', () => {
  it('pages six at a time, per the node', () => {
    const { container } = render(<SystemsTableCard systems={many(14)} />)
    const view = within(container)

    expect(view.getByText('Page 1 of 3')).toBeTruthy()
    expect(view.getByText('System 0')).toBeTruthy()
    expect(view.queryByText('System 6')).toBeNull()

    fireEvent.click(view.getByRole('button', { name: 'Next page' }))
    expect(view.getByText('Page 2 of 3')).toBeTruthy()
    expect(view.getByText('System 6')).toBeTruthy()

    fireEvent.click(view.getByRole('button', { name: 'Last page' }))
    expect(view.getByText('Page 3 of 3')).toBeTruthy()
  })

  it('disables the pager at each end rather than dimming an operable control', () => {
    const { container } = render(<SystemsTableCard systems={many(14)} />)
    const view = within(container)

    expect(view.getByRole('button', { name: 'Previous page' }).disabled).toBe(true)
    expect(view.getByRole('button', { name: 'Next page' }).disabled).toBe(false)

    fireEvent.click(view.getByRole('button', { name: 'Last page' }))
    expect(view.getByRole('button', { name: 'Next page' }).disabled).toBe(true)
  })

  it('never strands the viewer on a page the filtered result no longer has', () => {
    // Page 3 of 3, then a search that leaves one row. Correcting this in an
    // effect paints the empty page first; it is clamped during render instead.
    const { container } = render(<SystemsTableCard systems={many(14)} />)
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: 'Last page' }))
    expect(view.getByText('Page 3 of 3')).toBeTruthy()

    fireEvent.change(view.getByRole('searchbox', { name: 'Search systems' }), {
      target: { value: 'System 11' },
    })

    expect(view.getByText('Page 1 of 1')).toBeTruthy()
    expect(view.getByText('System 11')).toBeTruthy()
  })

  it('says so when a search matches nothing, and distinguishes that from an empty scope', () => {
    const { container, rerender } = render(<SystemsTableCard systems={many(3)} />)
    const view = within(container)

    fireEvent.change(view.getByRole('searchbox', { name: 'Search systems' }), {
      target: { value: 'zzzz' },
    })
    expect(view.getByText(/No system matches/)).toBeTruthy()

    rerender(<SystemsTableCard systems={[]} />)
    expect(within(container).getByText('No systems at this location.')).toBeTruthy()
  })
})
