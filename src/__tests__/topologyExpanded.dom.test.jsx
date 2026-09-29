// @vitest-environment happy-dom
//
// The expanded Open loop card — Figma "System page_mobile" 198629:63118, its
// Topology child 198736:153302. The sibling frame "System tab_mobile"
// (198379:80447) draws the same screen with this card collapsed; the two
// frames differ in nothing else, so this card IS the delta between them.
//
// The point of the variant is that it DESCRIBES the system: serial, power,
// connectivity, the unit itself, and the valve's state. These tests pin that
// description, and pin the two places where the comp had to give way to the
// data (one device, not two; no control without an action behind it).

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import TopologyExpandedCard from '@/v2/components/TopologyExpandedCard'

afterEach(cleanup)

const device = (over = {}) => ({
  id: 'd1',
  name: 'Supply',
  serial: '4471822',
  valve: 'open',
  comm: 'online',
  power: 'ac',
  ...over,
})

describe('the expanded topology card', () => {
  it('describes the device: name, serial, power, connectivity and valve', () => {
    const { container } = render(
      <TopologyExpandedCard title="Water Line - General Line" devices={[device()]} />,
    )
    const view = within(container)

    expect(view.getByText('Water Line - General Line')).toBeTruthy()

    /* Scoped to the device card: PipeTopology letters its own SUPPLY and
       RETURN legs on the schematic above, so an unscoped getByText('Supply')
       matches the diagram as well as the device. */
    const card = within(container.querySelector('[data-device-id="d1"]'))
    expect(card.getByText('Supply')).toBeTruthy()
    expect(card.getByText('SN 4471822')).toBeTruthy()
    expect(card.getByText('AC')).toBeTruthy()
    expect(card.getByText('Connected')).toBeTruthy()
    expect(card.getByText('Open')).toBeTruthy()

    // The unit photo is decorative — the words above carry the meaning.
    const photo = container.querySelector('img')
    expect(photo, 'the card should draw the unit').toBeTruthy()
    expect(photo.getAttribute('aria-hidden')).toBe('true')
  })

  it('reads the real state rather than the comp constants', () => {
    // Figma draws two devices, both "SN 4471822", both "Open", both AC and
    // Connected. Every one of those is a prop.
    const { container } = render(
      <TopologyExpandedCard
        devices={[device({ serial: '9900011', valve: 'closed', comm: 'offline', power: 'ac-lost' })]}
      />,
    )
    const view = within(container)

    expect(view.getByText('SN 9900011')).toBeTruthy()
    expect(view.getByText('Closed')).toBeTruthy()
    expect(view.getByText('Offline')).toBeTruthy()
    expect(view.getByText('AC lost')).toBeTruthy()
  })

  it('says "No valve" for a metering-only system rather than guessing', () => {
    // buildTree.js records that 20 of the 53 MRG systems genuinely have none.
    const { container } = render(<TopologyExpandedCard devices={[device({ valve: null })]} />)
    expect(within(container).getByText('No valve')).toBeTruthy()
  })

  it('withholds the valve controls when the host has no action behind them', () => {
    // Nothing in this app can actually close a valve — ValveControlCard keeps
    // its state in component-local useState on the v1 screens. A button that
    // does nothing is the defect this codebase refuses everywhere else.
    const { container } = render(<TopologyExpandedCard devices={[device()]} />)
    const view = within(container)

    expect(view.queryByRole('button', { name: 'Close valve' })).toBeNull()
    expect(view.queryByRole('button', { name: 'Close all valves' })).toBeNull()
  })

  it('offers them, once wired, and only where they can do something', () => {
    const closed = []
    const { container, rerender } = render(
      <TopologyExpandedCard
        devices={[device()]}
        onCloseValve={(d) => closed.push(d.id)}
        onCloseAll={() => closed.push('all')}
      />,
    )
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: 'Close valve' }))
    expect(closed).toEqual(['d1'])

    // An already-closed valve has nothing to close, so the per-device control
    // goes and the card-level one is disabled rather than merely dimmed.
    rerender(
      <TopologyExpandedCard
        devices={[device({ valve: 'closed' })]}
        onCloseValve={() => {}}
        onCloseAll={() => {}}
      />,
    )
    expect(within(container).queryByRole('button', { name: 'Close valve' })).toBeNull()
    expect(within(container).getByRole('button', { name: 'Close all valves' }).disabled).toBe(true)
  })

  it('collapses only when the host owns that state', () => {
    const { container, rerender } = render(<TopologyExpandedCard devices={[device()]} />)
    expect(within(container).queryByRole('button', { name: /Close$/ })).toBeNull()

    const collapsed = []
    rerender(<TopologyExpandedCard devices={[device()]} onCollapse={() => collapsed.push(1)} />)
    fireEvent.click(within(container).getByRole('button', { name: 'Close' }))
    expect(collapsed).toEqual([1])
  })

  it('draws one card per device, and nothing at all with none', () => {
    const { container, rerender } = render(
      <TopologyExpandedCard devices={[device(), device({ id: 'd2', name: 'Return' })]} />,
    )
    expect(container.querySelectorAll('[data-device-id]')).toHaveLength(2)
    expect(
      within(container.querySelector('[data-device-id="d2"]')).getByText('Return'),
    ).toBeTruthy()

    rerender(<TopologyExpandedCard devices={[]} />)
    expect(container.querySelectorAll('[data-device-id]')).toHaveLength(0)
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })
})
