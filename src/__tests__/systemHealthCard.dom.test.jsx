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
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
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

/* THE FLEET-COUNT TESTS LIVE IN systemsOverviewHero.dom.test.jsx NOW.
   Three of them stood here — the count and its unit, the thousands grouping,
   and the singular for a fleet of one — against node 199359:128708. The
   2026-10-20 variants take that row out of the card and put it on the wave
   above (SystemsOverviewHero), so the assertions moved with it, unchanged.
   They were not deleted and they were not weakened: the same three cases run
   against the component that now owns the markup. */

describe('SystemHealthCard — headline', () => {
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
    // Phase 4: #e7000b is --red-600, so the pin is the token, not the hex.
    expect(lead.className).toContain('text-red-600')
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
    expect(lead.className).not.toContain('text-red-600')
    /* 199417:131529 greys the zero to #cad5e2 rather than leaving it at the
       slate-700 the sentence beside it uses. The guarantee is unchanged —
       zero is never red — only the node's answer for what it is instead.
       Phase 4: #cad5e2 is --slate-300, so the pin is the token. */
    expect(lead.className).toContain('text-slate-300')
    expect(container.querySelector('[data-node-id="199360:129783"]').textContent)
      .toBe('0 / 48 need attention')
  })

  /* SUPERSEDED BY 199417:131529, and worth saying why rather than editing
     quietly. This used to assert that all three counters still render at zero
     — the point being that the card must not hide its data when nothing is
     wrong. The all-clear frame answers that differently: it drops the three
     zeros and says the thing in words instead, which is more use to a reader
     than three noughts. So the guarantee is the same (the card still reports
     its state) and the assertion follows the node. */
  it('says it in words at zero rather than drawing three noughts', () => {
    render(<SystemHealthCard total={48} healthy={48} />)
    /* The wording changed on 2026-10-21 — "All of your systems are running!"
       claimed the whole fleet from a card gated on three tiles, and the owner
       on the replacement: "user dont knows the check". The GUARANTEE is the
       same one this test was written for: at zero the card says its state in
       words instead of drawing three noughts. It now also counts, and borrows
       the card's own title rather than naming the four PRD-09 checks.

       2026-10-22 it also names the OTHER axis. "All 48 systems healthy" is a
       true health statement that reads, on a home screen, as "nothing is
       happening" — and a fleet can be 100% protected while two pipes are open.
       The sentence is gated on both now, which is also what gates the success
       green. The water figure is the only one on this card and it touches no
       counter; see the component's note on the prop. */
    expect(screen.getByText(/All 48 systems protected/)).toBeTruthy()
    expect(screen.getByText(/no water events/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Valve errors:/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Offline systems:/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Disconnected power:/ })).toBeNull()
  })

  it('offers the history instead of "all" when there is no all to show', () => {
    render(<SystemHealthCard total={48} healthy={48} />)
    // 199417:131563 renames the control in this state.
    expect(screen.getByRole('button', { name: 'Show past alerts' })).toBeTruthy()
  })

  /* 199417:134216 — one kind with a count is drawn alone, across the card,
     rather than beside two zeros. See the variant note in the component for
     why this frame was followed over 199417:132861. */
  it('draws a lone fault kind on its own, full width', () => {
    const { container } = render(<SystemHealthCard total={48} healthy={47} valveErrors={1} />)
    const tiles = [...container.querySelectorAll('button')]
      .filter((b) => /: \d+$/.test(b.getAttribute('aria-label') || ''))
    expect(tiles).toHaveLength(1)
    expect(tiles[0].getAttribute('aria-label')).toBe('Valve errors: 1')
    expect(tiles[0].className).toContain('w-full')
  })

  /* THE TINT IS THE COUNT: red when a counter has something in it, slate when
     it does not. Both frames that draw three tiles agree on this. */
  it('tints a counter by whether it has anything in it', () => {
    const { container } = render(
      <SystemHealthCard total={48} healthy={46} valveErrors={1} offline={1} />,
    )
    const by = (name) => [...container.querySelectorAll('button')]
      .find((b) => b.getAttribute('aria-label') === name)
    /* The hot tile used to be pinned to `from-[#fff1f1]`, the literal half
       of a frozen light-red gradient. It is now the alert surface token, so
       the assertion pins the TOKEN — which is the thing that must not be
       lost — rather than a hex that only ever described `light`.

       WARNING, NOT CRITICAL, since 2026-10-22. Both cards on this screen used
       to paint their alarm in --alert-surface-critical, so red said "water is
       escaping" on TriageBand and "a device is broken" here. Critical is
       reserved for water now. The `not.toContain` is the half that matters:
       it fails if anyone puts the fault tiles back on the water colour. */
    expect(by('Valve errors: 1').className).toContain('bg-alert-surface-warning')
    expect(by('Offline systems: 1').className).toContain('bg-alert-surface-warning')
    expect(by('Valve errors: 1').className).not.toContain('bg-alert-surface-critical')
    expect(by('Disconnected power: 0').className).toContain('bg-slate-100')
    expect(by('Disconnected power: 0').className).not.toContain('bg-alert-surface-warning')
  })

  it('renders an empty fleet without a sliver of either colour', () => {
    const { container } = render(<SystemHealthCard />)
    const { red, green } = segments(container)
    expect(red).toBeNull()
    expect(green.style.flexGrow).toBe('1')
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
    expect(heading.className).toContain('leading-5')
    expect(heading.className).toContain('text-sm')

    const label = container.querySelector('[data-node-id="199360:129783"]')
    expect(label.className).toContain('leading-[0]')
    expect(label.className).toContain('text-lg')
  })

  it('carries the design values as theme utilities, with no var() fallback left', () => {
    const { container } = render(<SystemHealthCard {...ALERTING} />)

    /* The slate-100 fleet row that stood here is gone — see the note at the
       top of this file. Its atoms are asserted in the hero's own test. */
    const bar = container.querySelector('[data-node-id="199360:129779"]')
    expect(bar.className).toContain('gap-[1.622px]')
    expect(bar.className).toContain('h-[15px]')

    /* `bg-red-700` until 2026-10-22. --red-700 doubles as ink on a dark card
       and therefore has to lighten under `dark`, which dropped this bar's
       red-vs-green separation to 2.46:1 — the one thing a proportion bar is
       for. src/index.css had already minted --bar-fill-risk / --bar-fill-ok-*
       for exactly these call sites and nothing in src/ had ever consumed them.
       `light` is unchanged by construction (--bar-fill-risk IS var(--red-700)
       at :root), so this is a rename at this theme and a fix at the others. */
    expect(segments(container).red.className).toContain('bg-bar-fill-risk')
    expect(segments(container).green.className).toContain('from-bar-fill-ok-from')
    expect(segments(container).green.className).toContain('to-bar-fill-ok-to')

    const card = container.firstElementChild
    expect(card.className).toContain('gap-[15px]')
    expect(card.className).toContain('rounded-[22px]')
    // Phase 3: no two-argument var() survives in this component.
    expect(card.className).not.toContain('var(--')
    expect(card.getAttribute('data-name')).toBe('IOT overview')
  })

  it('references no figma.com asset URL', () => {
    const { container } = render(<SystemHealthCard {...ALERTING} />)
    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(container.innerHTML).not.toContain('figma.com')
    /* Every glyph is a local inline SVG: valve, wifi, power, arrow. Was five
       — the fifth was the fleet row's sensor, which went to the hero with the
       count. The hero's own test makes the same assertion over there. */
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(4)
  })
})

/* ───────────────────────────────────────────────────────────────────────────
   HEALTH AND WATER ARE TWO AXES, AND ALL FOUR CORNERS ARE REAL.

   Owner, 2026-10-22: "we don't have the separation between system health,
   which is the errors, and water events. Systems can be 100% healthy, but with
   water events, it's not counting on the same counter."

   src/__tests__/healthIsNotWaterEvents.dom.test.jsx pins the DATA half of that
   — that the two counts differ, and that a leak alone never makes a system
   unhealthy. It stops at the seam. These pin what the live card SAYS, because
   the card is where a reader meets the distinction, and because three of the
   four corners below had never been rendered: `attention` could not reach 0
   against the old dataset, so the all-clear branch was unreachable and nothing
   had ever checked what it claims.

   The bar, `healthy` and every tile are health-only in all four. The ONLY
   figure that crosses is the water count in the all-clear sentence, and only
   to stop that sentence being a true number making a false claim. */
describe('SystemHealthCard — health and water events are separate axes', () => {
  const textOf = (c) => (c.textContent || '').replace(/\s+/g, ' ')
  const row = (c) => c.querySelector('[data-status]')

  it('healthy and dry: says so on both axes, in the success ground', () => {
    const { container } = render(<SystemHealthCard total={10} healthy={10} waterEvents={0} />)
    expect(row(container).getAttribute('data-status')).toBe('clear')
    expect(row(container).className).toContain('bg-alert-surface-success')
    expect(textOf(container)).toContain('All 10 systems protected · no water events')
  })

  it('healthy and leaking: still 100% protected, and NOT painted all-clear', () => {
    /* The owner's exact sentence. The protection claim is true and is kept;
       what it must not do is wear the colour that means "nothing to do". */
    const { container } = render(<SystemHealthCard total={10} healthy={10} waterEvents={2} />)
    expect(row(container).getAttribute('data-status')).toBe('water')
    expect(row(container).className).not.toContain('bg-alert-surface-success')
    expect(textOf(container)).toContain('All 10 systems protected · 2 water events active')

    // And the health readout is untouched by the leak: 0 need attention.
    const bar = container.querySelector('[data-node-id="199360:129783"]')
    expect(bar.textContent).toBe('0 / 10 need attention')
    expect(container.querySelector('[data-segment="attention"]')).toBeNull()
  })

  it('unhealthy and dry: the dangerous one, and it is not quiet', () => {
    /* An offline system reports ZERO water events. On a screen of leak counts
       that reads like the good row; it is the worst one, because the ability
       to see a leak there is gone. The card says that in words. */
    const { container } = render(
      <SystemHealthCard total={10} healthy={7} offline={3} waterEvents={0} />,
    )
    expect(row(container).getAttribute('data-status')).toBe('risk')
    expect(row(container).className).toContain('bg-alert-surface-warning')
    expect(textOf(container)).toContain('3 systems may miss a leak or fail to stop it')
    expect(textOf(container)).not.toContain('protected')
  })

  it('unhealthy and leaking: the risk line wins the row, the tiles still count', () => {
    const { container } = render(
      <SystemHealthCard total={10} healthy={6} offline={3} valveErrors={1} waterEvents={2} />,
    )
    expect(row(container).getAttribute('data-status')).toBe('risk')
    expect(textOf(container)).toContain('4 systems may miss a leak or fail to stop it')
    expect(container.querySelector('[data-node-id="199360:129783"]').textContent)
      .toBe('4 / 10 need attention')
  })

  it('a water event NEVER moves a health number', () => {
    /* The whole defect in one assertion: render the same fleet with and
       without leaks and diff every health figure the card draws. */
    const dry = render(<SystemHealthCard total={10} healthy={8} offline={2} waterEvents={0} />)
    const barDry = dry.container.querySelector('[data-node-id="199360:129783"]').textContent
    const tileDry = dry.container.querySelector('[data-segment="attention"]').style.flexGrow
    cleanup()

    const wet = render(<SystemHealthCard total={10} healthy={8} offline={2} waterEvents={7} />)
    const barWet = wet.container.querySelector('[data-node-id="199360:129783"]').textContent
    const tileWet = wet.container.querySelector('[data-segment="attention"]').style.flexGrow

    expect(barWet).toBe(barDry)
    expect(tileWet).toBe(tileDry)
    expect(barWet).toBe('2 / 10 need attention')
  })

  it('needs attention on a check that has no tile, and does not call that clear', () => {
    /* THE LIVE BUG THIS BLOCK WAS WRITTEN FOR. The all-clear row was gated on
       `hotKinds.length === 0` — valve, offline, power — while `attention` is
       fleet - healthy over FOUR checks, the fourth being "has at least one
       alert recipient", which this card has no tile for. A scope whose only
       fault is a missing recipient therefore printed "All 10 systems healthy"
       directly under a bar reading "1 / 10 need attention".
       Reproducible on /location/Building A against today's dataset. */
    const { container } = render(
      <SystemHealthCard total={10} healthy={9} valveErrors={0} offline={0} noPower={0} />,
    )
    expect(row(container).getAttribute('data-status')).toBe('risk')
    expect(textOf(container)).not.toContain('protected')
    expect(textOf(container)).toContain('1 system may miss a leak or fail to stop it')
    expect(container.querySelector('[data-node-id="199360:129783"]').textContent)
      .toBe('1 / 10 need attention')
  })

  it('the all-clear header control goes to the history it names', () => {
    /* The label switched to "Show past alerts" at 199417:131563 and kept
       calling onShowAll, which on HomeAllAccounts opens the Systems tab. */
    const onShowAll = vi.fn()
    const onShowPast = vi.fn()
    render(<SystemHealthCard total={10} healthy={10} onShowAll={onShowAll} onShowPast={onShowPast} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show past alerts' }))
    expect(onShowPast).toHaveBeenCalledTimes(1)
    expect(onShowAll).not.toHaveBeenCalled()
  })
})
