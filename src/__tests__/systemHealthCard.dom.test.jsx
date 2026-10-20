// @vitest-environment happy-dom
//
// SystemHealthCard — the Account/Location "System health" card
// (Figma 199323:12124 in the alert frame, 199371:137037 in the calm one; the
// two emits are byte-identical for this card, so there is one state to test).
//
// What is worth asserting here, and why:
//   - the headline count, because the node freezes 244 while the progress bar
//     freezes 48 and the component resolves that to ONE `total`;
//   - the progress PROPORTION, because Figma froze the red segment at a
//     literal `w-[18px]` and this build re-derives it as flex-grow. If that
//     ever regresses to a fixed width the bar silently stops meaning anything;
//   - each counter rendering and firing onSelectIssue with its own key;
//   - the all-healthy state, which has no Figma emit at all — the red segment
//     has to disappear rather than render a 1px sliver, and the leading count
//     has to stop being red (this design system's zero-is-not-red rule).

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SystemHealthCard from '@/v2/components/SystemHealthCard'

afterEach(cleanup)

const ALERTING = {
  total: 48,
  healthy: 45,
  valveErrors: 1,
  offline: 1,
  noPower: 1,
}

const segments = (container) => ({
  red: container.querySelector('[data-segment="attention"]'),
  green: container.querySelector('[data-segment="healthy"]'),
})

describe('SystemHealthCard — headline', () => {
  it('renders the fleet count and its unit', () => {
    const { container } = render(<SystemHealthCard {...ALERTING} />)
    const row = container.querySelector('[data-node-id="199359:128708"]')
    expect(row.textContent).toBe('48 systems')
  })

  it('groups a large fleet count the way the design system does', () => {
    const { container } = render(<SystemHealthCard total={3431} healthy={3431} />)
    expect(container.querySelector('[data-node-id="199359:128708"]').textContent)
      .toBe('3,431 systems')
  })

  it('says "system" for a fleet of one', () => {
    const { container } = render(<SystemHealthCard total={1} healthy={1} />)
    expect(container.querySelector('[data-node-id="199359:128708"]').textContent)
      .toBe('1 system')
  })

  it('keeps the card heading and the Show all control', async () => {
    const onShowAll = vi.fn()
    render(<SystemHealthCard {...ALERTING} onShowAll={onShowAll} />)
    expect(screen.getByText('System health')).toBeTruthy()

    const showAll = screen.getByRole('button', { name: /show all systems/i })
    await userEvent.click(showAll)
    expect(onShowAll).toHaveBeenCalledTimes(1)
  })
})

describe('SystemHealthCard — progress bar', () => {
  it('splits the track in the attention : healthy proportion', () => {
    const { container } = render(<SystemHealthCard {...ALERTING} />)
    const { red, green } = segments(container)

    // 3 need attention, 45 healthy. Figma froze this exact pair as an 18px red
    // segment on a 301.378px track — 3/48 of it.
    expect(red.style.flexGrow).toBe('3')
    expect(green.style.flexGrow).toBe('45')
    expect(red.style.flexBasis).toBe('0px')
    expect(green.style.flexBasis).toBe('0px')
  })

  it('states the proportion in words and in its accessible name', () => {
    const { container } = render(<SystemHealthCard {...ALERTING} />)
    expect(screen.getByLabelText('45 of 48 systems healthy')).toBeTruthy()
    expect(container.querySelector('[data-node-id="199360:129783"]').textContent)
      .toBe('3 / 48 need attention')
  })

  it('paints the leading count red only while something needs attention', () => {
    const { container } = render(<SystemHealthCard {...ALERTING} />)
    const lead = container.querySelector('[data-node-id="199360:129783"] span')
    expect(lead.className).toContain('text-[#e7000b]')
  })

  it('moves with the numbers rather than staying at the frozen 18px', () => {
    const { container } = render(<SystemHealthCard total={10} healthy={4} />)
    const { red, green } = segments(container)
    expect(red.style.flexGrow).toBe('6')
    expect(green.style.flexGrow).toBe('4')
  })

  it('clamps healthy to the fleet size', () => {
    const { container } = render(<SystemHealthCard total={5} healthy={9} />)
    expect(segments(container).red).toBeNull()
    expect(container.querySelector('[data-node-id="199360:129783"]').textContent)
      .toBe('0 / 5 need attention')
  })
})

describe('SystemHealthCard — counters', () => {
  it('renders all three with their counts', () => {
    render(<SystemHealthCard {...ALERTING} valveErrors={4} offline={2} noPower={7} />)
    expect(screen.getByRole('button', { name: 'Valve errors: 4' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Offline systems: 2' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Disconnected power: 7' })).toBeTruthy()

    // The label is real text, not a colour cue.
    expect(screen.getByText('Valve errors')).toBeTruthy()
    expect(screen.getByText('Offline')).toBeTruthy()
    expect(screen.getByText('No power')).toBeTruthy()
  })

  it('keeps the node order: valve errors, offline, no power', () => {
    const { container } = render(<SystemHealthCard {...ALERTING} />)
    const row = container.querySelector('[data-node-id="199323:13029"]')
    const names = [...row.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))
    expect(names).toEqual(['Valve errors: 1', 'Offline systems: 1', 'Disconnected power: 1'])
  })

  it('fires onSelectIssue with the issue key', async () => {
    const onSelectIssue = vi.fn()
    render(<SystemHealthCard {...ALERTING} onSelectIssue={onSelectIssue} />)

    await userEvent.click(screen.getByRole('button', { name: 'Valve errors: 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Offline systems: 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Disconnected power: 1' }))

    expect(onSelectIssue.mock.calls.map(([k]) => k))
      .toEqual(['valveErrors', 'offline', 'noPower'])
  })

  it('does not throw when no handler is wired', async () => {
    render(<SystemHealthCard {...ALERTING} />)
    await userEvent.click(screen.getByRole('button', { name: 'Offline systems: 1' }))
  })

  it('every counter is a real button with a tappable box', () => {
    const { container } = render(<SystemHealthCard {...ALERTING} />)
    const row = container.querySelector('[data-node-id="199323:13029"]')
    const tiles = [...row.querySelectorAll('button')]
    expect(tiles).toHaveLength(3)
    for (const tile of tiles) {
      expect(tile.getAttribute('type')).toBe('button')
      // 3 + (43 - 8) + 20 + 7 = 65px, past the 48dp minimum. Asserted on the
      // classes because happy-dom does not lay anything out.
      expect(tile.className).toContain('pt-[3px]')
      expect(tile.className).toContain('pb-[7px]')
      expect(tile.querySelector('[class*="h-[43px]"]')).toBeTruthy()
    }
  })
})

describe('SystemHealthCard — all healthy / empty', () => {
  it('drops the red segment and rounds the green on both ends', () => {
    const { container } = render(
      <SystemHealthCard total={48} healthy={48} valveErrors={0} offline={0} noPower={0} />,
    )
    const { red, green } = segments(container)
    expect(red).toBeNull()
    expect(green).toBeTruthy()
    expect(green.className).toContain('rounded-[9068757px]')
    expect(green.className).not.toContain('rounded-br-')
  })

  it('stops painting the leading zero red', () => {
    const { container } = render(<SystemHealthCard total={48} healthy={48} />)
    const lead = container.querySelector('[data-node-id="199360:129783"] span')
    expect(lead.className).not.toContain('text-[#e7000b]')
    expect(lead.className).toContain('text-[#314158]')
    expect(container.querySelector('[data-node-id="199360:129783"]').textContent)
      .toBe('0 / 48 need attention')
  })

  it('still renders all three counters at zero', () => {
    render(<SystemHealthCard total={48} healthy={48} />)
    expect(screen.getByRole('button', { name: 'Valve errors: 0' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Offline systems: 0' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Disconnected power: 0' })).toBeTruthy()
  })

  it('renders an empty fleet without a sliver of either colour', () => {
    const { container } = render(<SystemHealthCard />)
    const { red, green } = segments(container)
    expect(red).toBeNull()
    expect(green.style.flexGrow).toBe('1')
    expect(container.querySelector('[data-node-id="199359:128708"]').textContent)
      .toBe('0 systems')
  })
})

describe('SystemHealthCard — Figma class fidelity', () => {
  // The repo's standing trap: cn() is tailwind-merge, which drops a `leading-`
  // written BEFORE a font-size atom. Figma emits alphabetically, i.e. leading
  // first, so every atom in the component has its line-height moved last. If
  // anyone "tidies" them back into Figma order these assertions go red.
  it('keeps every line-height through tailwind-merge', () => {
    const { container } = render(<SystemHealthCard {...ALERTING} />)

    const heading = container.querySelector('[data-node-id="199323:12128"]')
    expect(heading.className).toContain(String.raw`leading-[var(--text\/sm\/lh,20px)]`)
    expect(heading.className).toContain(String.raw`text-[length:var(--text\/sm\/size,14px)]`)

    const count = container.querySelector('[data-node-id="199359:128708"]')
    expect(count.className).toContain('leading-[0]')
    expect(count.className).toContain('text-[22px]')

    const label = container.querySelector('[data-node-id="199360:129783"]')
    expect(label.className).toContain('leading-[0]')
    expect(label.className).toContain(String.raw`text-[length:var(--text\/lg\/size,18px)]`)
  })

  it('carries the escaped var() token classes verbatim into the DOM', () => {
    const { container } = render(<SystemHealthCard {...ALERTING} />)

    const row = container.querySelector('[data-node-id="199359:128709"]')
    expect(row.className).toContain(String.raw`bg-[var(--colors\/slate\/100,#f1f5f9)]`)
    expect(row.className).toContain('h-[53px]')
    expect(row.className).toContain('rounded-[12px]')
    expect(row.className).toContain('pl-[15px]')

    const bar = container.querySelector('[data-node-id="199360:129779"]')
    expect(bar.className).toContain('gap-[1.622px]')
    expect(bar.className).toContain('h-[15px]')

    expect(segments(container).red.className)
      .toContain(String.raw`bg-[var(--colors\/red\/700,#c10007)]`)

    const card = container.firstElementChild
    expect(card.className).toContain('gap-[15px]')
    expect(card.className).toContain('rounded-[var(--rounded-3xl,22px)]')
    expect(card.getAttribute('data-name')).toBe('IOT overview')
  })

  it('references no figma.com asset URL', () => {
    const { container } = render(<SystemHealthCard {...ALERTING} />)
    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(container.innerHTML).not.toContain('figma.com')
    // Every glyph is a local inline SVG: sensor, valve, wifi, power, arrow.
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(5)
  })
})
