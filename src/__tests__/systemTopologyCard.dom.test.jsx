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

    /* ONE valve, so no "Close all valves": the device row already offers the
       same action and the card never shows it twice. "all" is a lie on a
       single-valve system anyway. */
    expect(within(container).queryByRole('button', { name: 'Close all valves' })).toBeNull()

    // An already-closed valve has nothing left to close.
    rerender(
      <SystemTopologyCard
        expanded
        devices={[device({ valve: 'closed' })]}
        onCloseValve={() => {}}
        onCloseAll={() => {}}
      />,
    )
    expect(within(container).queryByRole('button', { name: 'Close valve' })).toBeNull()
  })

  it('names the card action for the number of valves it closes', () => {
    const two = [device(), device({ id: 'd2', name: 'Return' })]
    const { container, rerender } = render(
      <SystemTopologyCard expanded devices={two} onCloseAll={() => {}} />,
    )
    expect(within(container).getByRole('button', { name: 'Close all valves' })).toBeTruthy()

    // One valve is "Close valve" — and only while nothing else offers it.
    rerender(<SystemTopologyCard expanded devices={[device()]} onCloseAll={() => {}} />)
    expect(within(container).getByRole('button', { name: 'Close valve' })).toBeTruthy()
    expect(within(container).queryByRole('button', { name: 'Close all valves' })).toBeNull()
  })

  it('toggles with a caret and NO visible label', () => {
    /* The disclosure is its own component in Figma and carries no text — the
       caret is the whole control. "Close" / "Open" was this file's invention.
       The accessible name still has to exist, so it lives on aria-label. */
    const { container, rerender } = render(<SystemTopologyCard expanded devices={[device()]} />)
    expect(within(container).queryByRole('button', { name: 'Collapse' })).toBeNull()

    const taps = []
    rerender(<SystemTopologyCard expanded devices={[device()]} onToggle={() => taps.push('shut')} />)
    const close = within(container).getByRole('button', { name: 'Collapse' })
    expect(close.getAttribute('aria-expanded')).toBe('true')
    expect(close.textContent.trim(), 'the control carries no words').toBe('')
    fireEvent.click(close)
    expect(taps).toEqual(['shut'])

    rerender(<SystemTopologyCard devices={[device()]} onToggle={() => taps.push('open')} />)
    const open = within(container).getByRole('button', { name: 'Expand' })
    expect(open.getAttribute('aria-expanded')).toBe('false')
    expect(open.textContent.trim()).toBe('')
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
    expect(withClass(container, 'pl-[29px]').length, 'the pl-29 indent').toBeGreaterThan(0)
    /* Variant4 keeps w-201 on the badge box only — the photo moved into its
       own 87px column, so the two no longer share a width. */
    expect(withClass(container, 'w-[201px]').length).toBeGreaterThanOrEqual(1)
    expect(withClass(container, 'w-[87px]').length, 'the photo column').toBeGreaterThan(0)
  })

  it('opens the valve row with the speed badge and its 7.2px rule', () => {
    // Both were absent, which is most of why the row did not read as the comp.
    const { container } = renderOne()
    expect(withClass(container, 'size-[17.28px]').length, 'speed glyph').toBeGreaterThan(0)
    expect(withClass(container, 'w-[7.2px]').length, 'pill connector').toBeGreaterThan(0)
  })

  it('drops the branch rule from the name badge to the valve row', () => {
    const { container } = renderOne()
    /* 71 expanded, 41 collapsed. It was 197 until the card became Variant4
       (198756:60259) and the rule moved from the far left to between the photo
       and the details. */
    const rule = container.querySelector('[data-branch-rule="71"]')
    expect(rule, 'the 197px branch rule').toBeTruthy()
    // Anchored on the 24px name badge's centre line, and rotated into place.
    expect(String(rule.className)).toContain('left-[105px]')
    expect(withClass(rule, 'rotate-90').length, 'the node rotates this rule').toBeGreaterThan(0)
  })

  it('fits the unit photo the way the node does', () => {
    // object-cover in a 120x144 box under mix-blend-multiply — the source has
    // a near-white ground and no alpha, which is why the design multiplies it.
    const { container } = renderOne()
    const img = container.querySelector('img')
    expect(String(img.className)).toContain('object-cover')
    expect(String(img.parentElement.className)).toContain('mix-blend-multiply')
    // 81 x 97.273 since Variant4 moved it into the 87px left column.
    expect(String(img.parentElement.className)).toContain('h-[97.273px]')
    expect(String(img.parentElement.className)).toContain('w-[81px]')
  })
})

describe('the card always offers a way to close a valve', () => {
  it('keeps the footer on the COLLAPSED tile, which has no per-device button', () => {
    /* Suppressing the footer for a single valve is right on the expanded card,
       where the device row offers the same action. On the collapsed tile there
       is no such row, so suppressing it there left a card with no control at
       all. */
    const { container } = render(
      <SystemTopologyCard
        devices={[device()]}
        onCloseValve={() => {}}
        onCloseAll={() => {}}
      />,
    )
    expect(within(container).queryByRole('button', { name: 'Close valve' })).toBeTruthy()
  })
})

describe('a system with no valves', () => {
  it('offers no close control at all, rather than a dead one', () => {
    /* buildTree.js: 20 of the 53 MRG systems are metering-only and carry
       valve: null. A disabled "Close valve" on a card that has none is the
       dead control this repo refuses everywhere else — and Figma ships "No
       Valve" variants of every schematic for exactly this case. */
    const none = [device({ valve: null }), device({ id: 'd2', name: 'Return', valve: null })]
    const { container, rerender } = render(
      <SystemTopologyCard devices={none} onCloseValve={() => {}} onCloseAll={() => {}} />,
    )
    const view = within(container)

    expect(view.getAllByText('No valve')).toHaveLength(2)
    expect(view.queryByRole('button', { name: /Close/ })).toBeNull()

    // Expanded too.
    rerender(
      <SystemTopologyCard expanded devices={none} onCloseValve={() => {}} onCloseAll={() => {}} />,
    )
    expect(within(container).queryByRole('button', { name: /Close valve/ })).toBeNull()
  })
})
