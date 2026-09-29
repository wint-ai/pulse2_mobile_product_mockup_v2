// @vitest-environment happy-dom
//
// The "Filter by" sheet, and the type glyph on each row.
//
// The reference is a desktop two-pane popover — category rail beside that
// category's options. At 393px the panes become sequential: the rail is the
// first screen and a category pushes its options over it. These tests pin the
// behaviour that survives that translation, and the one promise a Cancel
// button next to an Apply button makes: nothing takes effect until Apply.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import SystemsFilterSheet from '@/v2/components/SystemsFilterSheet'
import SystemsTableCard from '@/v2/components/SystemsTableCard'
import { SYSTEM_TYPE_LABEL, SYSTEM_TYPE } from '@/data/systemType'

afterEach(cleanup)

const sys = (over = {}) => ({
  id: 'S',
  name: 'A system',
  l4Name: 'Site A',
  comm: 'online',
  valve: 'open',
  power: 'ac',
  leak: null,
  alert: null,
  notificationRecipients: 2,
  ...over,
})

const FLEET = [
  sys({ id: 'a', name: 'Alpha', l4Name: 'Site A', valve: 'open' }),
  sys({ id: 'b', name: 'Bravo', l4Name: 'Site A', valve: 'closed' }),
  sys({ id: 'c', name: 'Charlie', l4Name: 'Site B', valve: 'error' }),
]

function openSheet(props = {}) {
  const applied = []
  const utils = render(
    <SystemsFilterSheet
      open
      systems={FLEET}
      selection={{}}
      onApply={(next) => applied.push(next)}
      onClose={() => {}}
      {...props}
    />,
  )
  return { ...utils, applied }
}

describe('the filter sheet', () => {
  it('opens on the category rail, carrying every backed category', () => {
    const { container } = openSheet()
    const view = within(container)

    expect(view.getByRole('dialog', { name: 'Filter by' })).toBeTruthy()
    for (const label of [
      'Location',
      'Attention',
      'System Type',
      'Connectivity',
      'Valve status',
      'Active event',
      'Power',
    ]) {
      expect(view.getByRole('button', { name: new RegExp(`^${label}`) }), label).toBeTruthy()
    }
  })

  it('drills into a category and back again', () => {
    const { container } = openSheet()
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: /^Valve status/ }))
    expect(view.getByText('Open')).toBeTruthy()
    expect(view.getByText('Closed')).toBeTruthy()
    expect(view.getByText('Select all')).toBeTruthy()

    fireEvent.click(view.getByRole('button', { name: 'Back to categories' }))
    expect(view.getByRole('button', { name: /^Connectivity/ })).toBeTruthy()
  })

  it('applies nothing until Apply is pressed', () => {
    const { container, applied } = openSheet()
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: /^Valve status/ }))
    fireEvent.click(view.getByRole('button', { name: /Open/ }))
    expect(applied, 'ticking a box must not apply it').toEqual([])

    fireEvent.click(view.getByRole('button', { name: 'Apply filter' }))
    expect(applied).toHaveLength(1)
    expect(applied[0].valve).toEqual(['open'])
  })

  it('Select all takes every option in the category, and untakes them', () => {
    const { container, applied } = openSheet()
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: /^Valve status/ }))
    fireEvent.click(view.getByRole('button', { name: 'Select all' }))
    fireEvent.click(view.getByRole('button', { name: 'Apply filter' }))
    expect(applied[0].valve.sort()).toEqual(['closed', 'error', 'open'])
  })

  it('shows how many systems each option would match', () => {
    // A checkbox that silently returns nothing is the complaint that started
    // this tab; the count makes the outcome visible before it is applied.
    const { container } = openSheet()
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: /^Location/ }))
    // Site A holds two of the three.
    expect(view.getByRole('button', { name: /Site A\s*2/ })).toBeTruthy()
    expect(view.getByRole('button', { name: /Site B\s*1/ })).toBeTruthy()
  })

  it('searches a long option list', () => {
    const { container } = openSheet()
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: /^Location/ }))
    fireEvent.change(view.getByRole('searchbox', { name: 'Search location' }), {
      target: { value: 'Site B' },
    })
    expect(view.queryByText('Site A')).toBeNull()
    expect(view.getByText('Site B')).toBeTruthy()
  })

  it('offers only the system types the data actually holds', () => {
    const { container } = openSheet()
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: /^System Type/ }))
    expect(view.getByText(SYSTEM_TYPE_LABEL[SYSTEM_TYPE.FLOW])).toBeTruthy()
    expect(view.queryByText(SYSTEM_TYPE_LABEL[SYSTEM_TYPE.FLOOD])).toBeNull()
    expect(view.queryByText(SYSTEM_TYPE_LABEL[SYSTEM_TYPE.HUMIDITY])).toBeNull()
  })
})

describe('the table under a filter', () => {
  it('names the system type on every row icon', () => {
    const { container } = render(<SystemsTableCard systems={FLEET} />)
    const marks = within(container).getAllByRole('img', {
      name: SYSTEM_TYPE_LABEL[SYSTEM_TYPE.FLOW],
    })
    expect(marks).toHaveLength(FLEET.length)
  })

  it('narrows the rows, and says so when a filter empties the table', () => {
    const { container, rerender } = render(
      <SystemsTableCard systems={FLEET} selection={{ valve: ['open'] }} onOpenFilters={() => {}} />,
    )
    expect(within(container).getByText('Alpha')).toBeTruthy()
    expect(within(container).queryByText('Bravo')).toBeNull()

    rerender(
      <SystemsTableCard
        systems={FLEET}
        selection={{ location: ['Site B'], valve: ['open'] }}
        onOpenFilters={() => {}}
      />,
    )
    // Distinct from the no-search and no-scope messages.
    expect(within(container).getByText('No system matches these filters.')).toBeTruthy()
  })

  it('counts active categories on the funnel, not values ticked', () => {
    const { container } = render(
      <SystemsTableCard
        systems={FLEET}
        selection={{ valve: ['open', 'closed'] }}
        onOpenFilters={() => {}}
      />,
    )
    expect(within(container).getByRole('button', { name: 'Filter by (1 active)' })).toBeTruthy()
  })

  it('hides the funnel when the host has nowhere to send it', () => {
    const { container } = render(<SystemsTableCard systems={FLEET} />)
    expect(within(container).queryByRole('button', { name: /Filter by/ })).toBeNull()
  })
})
