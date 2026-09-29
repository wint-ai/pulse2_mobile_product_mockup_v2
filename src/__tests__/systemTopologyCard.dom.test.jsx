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
import SystemTopologyCard from '@/v2/components/SystemTopologyCard'

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
      <SystemTopologyCard expanded title="Water Line - General Line" devices={[device()]} />,
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
      <SystemTopologyCard
        expanded
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
    const { container } = render(<SystemTopologyCard expanded devices={[device({ valve: null })]} />)
    expect(within(container).getByText('No valve')).toBeTruthy()
  })

  it('withholds the valve controls when the host has no action behind them', () => {
    // Nothing in this app can actually close a valve — ValveControlCard keeps
    // its state in component-local useState on the v1 screens. A button that
    // does nothing is the defect this codebase refuses everywhere else.
    const { container } = render(<SystemTopologyCard expanded devices={[device()]} />)
    const view = within(container)

    expect(view.queryByRole('button', { name: 'Close valve' })).toBeNull()
    expect(view.queryByRole('button', { name: 'Close all valves' })).toBeNull()
  })

  it('offers them, once wired, and only where they can do something', () => {
    const closed = []
    const { container, rerender } = render(
      <SystemTopologyCard
        expanded
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
      <SystemTopologyCard
        expanded
        devices={[device({ valve: 'closed' })]}
        onCloseValve={() => {}}
        onCloseAll={() => {}}
      />,
    )
    expect(within(container).queryByRole('button', { name: 'Close valve' })).toBeNull()
    expect(within(container).getByRole('button', { name: 'Close all valves' }).disabled).toBe(true)
  })

  it('toggles only when the host owns that state, and names the direction', () => {
    /* The collapsed node draws no control at all, which would leave a card you
       can close and never reopen — so the toggle is rendered in both states
       and says which way it goes. That is a deliberate deviation. */
    const { container, rerender } = render(<SystemTopologyCard expanded devices={[device()]} />)
    expect(within(container).queryByRole('button', { name: 'Close' })).toBeNull()

    const taps = []
    rerender(<SystemTopologyCard expanded devices={[device()]} onToggle={() => taps.push('shut')} />)
    const close = within(container).getByRole('button', { name: 'Close' })
    expect(close.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(close)
    expect(taps).toEqual(['shut'])

    rerender(<SystemTopologyCard devices={[device()]} onToggle={() => taps.push('open')} />)
    const open = within(container).getByRole('button', { name: 'Open' })
    expect(open.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(open)
    expect(taps).toEqual(['shut', 'open'])
  })

  it('draws the collapsed variant as side-by-side tiles, not the expanded card', () => {
    /* 198629:57165 is a different layout, not the expanded one shortened: two
       flex-1 tiles at h-82, status as ICON-ONLY 20px chips, no serial, no
       photo, no pipe schematic. */
    const { container } = render(
      <SystemTopologyCard devices={[device(), device({ id: 'd2' })]} onCloseAll={() => {}} />,
    )
    const view = within(container)

    expect(container.querySelectorAll('[data-device-id]')).toHaveLength(2)
    expect(container.querySelector('[data-expanded="false"]')).toBeTruthy()

    // The words and the unit belong to the expanded variant only.
    expect(view.queryByText('AC')).toBeNull()
    expect(view.queryByText('Connected')).toBeNull()
    expect(view.queryByText(/^SN /)).toBeNull()
    expect(container.querySelectorAll('img')).toHaveLength(0)

    // But the valve state and the card action are still there.
    expect(view.getAllByText('Open').length).toBe(2)
    expect(view.getByRole('button', { name: 'Close all valves' })).toBeTruthy()
    // And its rule is the short one.
    expect(container.querySelectorAll('[data-branch-rule="41"]')).toHaveLength(2)
  })

  it('draws one card per device, and nothing at all with none', () => {
    const { container, rerender } = render(
      <SystemTopologyCard expanded devices={[device(), device({ id: 'd2', name: 'Return' })]} />,
    )
    expect(container.querySelectorAll('[data-device-id]')).toHaveLength(2)
    expect(
      within(container.querySelector('[data-device-id="d2"]')).getByText('Return'),
    ).toBeTruthy()

    rerender(<SystemTopologyCard expanded devices={[]} />)
    expect(container.querySelectorAll('[data-device-id]')).toHaveLength(0)
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })
})

describe('the geometry the first pass got wrong', () => {
  /* "it needs to be pixel match with figma and its not" — it wasn't. Diffing
     against 198736:153302 turned up six misses, and every one of them is
     pinned here rather than left to the eye. */
  const renderOne = () => render(<SystemTopologyCard expanded devices={[device()]} />)

  /* Tailwind arbitrary values put brackets and dots in the class name, and
     escaping those for querySelector is all backslashes and no clarity. Scan
     the strings instead — same approach the health-card tests settled on. */
  const withClass = (container, token) =>
    [...container.querySelectorAll('*')].filter((el) =>
      String(el.className?.baseVal ?? el.className ?? '').includes(token),
    )

  it('paints the power and connectivity badges white', () => {
    // The node gives both `bg-white`; they were transparent on the #f2f6ff
    // panel, so they read as bare text rather than as badges.
    const { container } = renderOne()
    for (const label of ['AC', 'Connected']) {
      const badge = within(container).getByText(label).closest('div')
      expect(String(badge.className), label).toContain('bg-white')
    }
  })

  it('indents that row past the branch rule and holds it to the 201px column', () => {
    const { container } = renderOne()
    expect(withClass(container, 'pl-[20px]').length, 'the pl-20 indent').toBeGreaterThan(0)
    // The badges and the photo share one column width in the node.
    expect(withClass(container, 'w-[201px]').length).toBeGreaterThanOrEqual(2)
  })

  it('opens the valve row with the speed badge and its 7.2px rule', () => {
    // Both were absent, which is most of why the row did not read as the comp.
    const { container } = renderOne()
    expect(withClass(container, 'size-[17.28px]').length, 'speed glyph').toBeGreaterThan(0)
    expect(withClass(container, 'w-[7.2px]').length, 'pill connector').toBeGreaterThan(0)
  })

  it('drops the branch rule from the name badge to the valve row', () => {
    const { container } = renderOne()
    // 197 expanded, 41 collapsed — the rule spans whatever the variant holds.
    const rule = container.querySelector('[data-branch-rule="197"]')
    expect(rule, 'the 197px branch rule').toBeTruthy()
    // Anchored on the 24px name badge's centre line, and rotated into place.
    expect(String(rule.className)).toContain('left-[12px]')
    expect(withClass(rule, 'rotate-90').length, 'the node rotates this rule').toBeGreaterThan(0)
  })

  it('fits the unit photo the way the node does', () => {
    // object-cover in a 120x144 box under mix-blend-multiply — the source has
    // a near-white ground and no alpha, which is why the design multiplies it.
    const { container } = renderOne()
    const img = container.querySelector('img')
    expect(String(img.className)).toContain('object-cover')
    expect(String(img.parentElement.className)).toContain('mix-blend-multiply')
    expect(String(img.parentElement.className)).toContain('h-[144px]')
    expect(String(img.parentElement.className)).toContain('w-[120px]')
  })
})
