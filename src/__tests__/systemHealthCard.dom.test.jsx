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

    /* 2026-10-22: this name was /show all systems/i. Owner: "view all opens
       the wrong area / currently systems tab / and it shall be open Active
       alerts overlay with all filter". The HANDLER moved on HomeAllAccounts,
       but the accessible NAME is this card's and had to move with it, or the
       control would announce a destination it no longer has. The visible word
       is still Figma's bare "Show all" and is unchanged. */
    const showAll = screen.getByRole('button', { name: /show all alerts/i })
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
    /* BACK TO THE FRAME'S OWN STRING, 2026-10-22. Two replacements stood
       here in one day — "All 48 systems protected · no water events", then
       d0619c5's "All 48 systems healthy" — and this file argued for the
       second on the grounds that the owner had ruled it. He ruled it OUT:
       "i want you to revert all new text work we made it looks and sound
       bad", then "make it like in figma". origin/dev's 573b57c reverted the
       lot against a fresh get_design_context on 199417:131529, which draws
       this sentence verbatim, and that is what is pinned.

       The GUARANTEE is untouched and is why the test exists: at zero the
       card says its state in words rather than drawing three noughts. The
       block at the foot of this file pins the row itself, by existence
       rather than by copy, so this is the only place a copy change can
       break — which is the point of putting it in exactly one place. */
    expect(screen.getByText('All of your systems are running!')).toBeTruthy()
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

       WARNING FOR A FEW HOURS ON 2026-10-22, AND BACK TO CRITICAL. The split
       was argued from TriageBand painting a live leak in the same red; the
       owner saw the result on `/` -- "why i still see this wierd boxes and
       not as in figma" -- and no frame draws amber here. 199417:134233,
       199417:132878 and 199414:130115 all paint the hot tile
       `from-[#fff1f1] to-[#ffe3e3]`, and --alert-surface-critical resolves
       through --red-100 to #ffe2e2 at `light`: that gradient's own end stop.
       The `not.toContain` is the half that matters, and it has swapped sides
       with its partner -- it fails if anyone repaints these tiles amber. */
    expect(by('Valve errors: 1').className).toContain('bg-alert-surface-critical')
    expect(by('Offline systems: 1').className).toContain('bg-alert-surface-critical')
    expect(by('Valve errors: 1').className).not.toContain('bg-alert-surface-warning')
    expect(by('Disconnected power: 0').className).toContain('bg-slate-100')
    expect(by('Disconnected power: 0').className).not.toContain('bg-alert-surface-critical')
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
   WHAT THE CARD SAYS WHEN IT IS NOT SHOWING THREE TILES.

   THIS BLOCK REPLACES "HEALTH AND WATER ARE TWO AXES, AND ALL FOUR CORNERS
   ARE REAL", 2026-10-22, and the four tests in it are named here so the
   deletion is not quiet:

     'healthy and dry: says so on both axes, in the success ground'
     'healthy and leaking: still 100% protected, and NOT painted all-clear'
     'unhealthy and dry: the dangerous one, and it is not quiet'
     'unhealthy and leaking: the risk line wins the row, the tiles still count'

   All four pinned a three-tone status row and the copy inside it — "All 10
   systems protected · 2 water events active", "N systems may miss a leak or
   fail to stop it", `data-status="water"` / `"risk"`, and
   `bg-alert-surface-success` / `bg-alert-surface-warning` as its grounds.
   None of that is in any frame. The owner, on a screenshot of `/`: "why i
   still see this wierd boxes and not as in figma". The row is gone, so tests
   that pinned its tones and its copy would have pinned it back.

   MERGE, 2026-10-22. origin/dev deleted the same three-tone row and rewrote
   these same four tests rather than dropping them, each one re-aimed at the
   ABSENCE of the row instead of at a sentence. Those rewrites are taken in
   below, at this side's names, with ONE of the four changed on its facts:
   origin/dev kept a `leaks === 0` term in the component's gate, so its
   "healthy and leaking" case expected NO row. This side removed the
   `waterEvents` prop outright — a water count is not a health input and the
   card no longer accepts one — so a healthy, leaking scope draws the row
   like any other healthy scope. The test is kept and re-aimed at what it was
   really for: a leak must not move a health figure. See the first test in
   this block for the strongest form of that.

   WHAT THEY GUARDED IS NOT LOST. Their real subject was that a water event
   must never be read as a health figure, and that lives in
   src/__tests__/healthIsNotWaterEvents.dom.test.jsx, which pins it at the
   data layer where the two numbers are actually computed. This card no longer
   takes a water count at all, which is a stronger guarantee than asserting
   that it ignores one — and the first test below pins exactly that.

   WHAT REPLACES THEM is the design's own answer: the all-clear row
   (199417:131529) drawn only when nothing is wrong, and the other-issues row
   (199338:52997) naming the fault kinds the three tiles do not show. */
describe('SystemHealthCard — the all-clear row and the other-issues row', () => {
  const textOf = (c) => (c.textContent || '').replace(/\s+/g, ' ')
  const clearRow = (c) => c.querySelector('[data-status="clear"]')
  const otherRow = (c) => c.querySelector('[data-other-issues]')
  const allButtons = (c) => [...c.querySelectorAll('button')]
    .map((b) => b.getAttribute('aria-label'))

  it('takes no water-event input, and says nothing about leaks in any state', () => {
    /* The card used to accept `waterEvents` and spend it on a sentence. The
       prop is gone. Passing one must therefore change NOTHING — if this ever
       fails, a water count has been wired back into a health card. */
    const dry = render(<SystemHealthCard total={10} healthy={8} offline={2} />)
    const dryHtml = dry.container.innerHTML
    cleanup()

    const wet = render(<SystemHealthCard total={10} healthy={8} offline={2} waterEvents={7} />)
    expect(wet.container.innerHTML).toBe(dryHtml)
    expect(textOf(wet.container)).not.toMatch(/water|leak|protected/i)
  })

  it('draws no status sentence over a faulted scope', () => {
    /* The owner's complaint, as an assertion. Three tiles and a bar, and no
       sentence we wrote underneath them. */
    const { container } = render(
      <SystemHealthCard total={10} healthy={6} offline={3} valveErrors={1} />,
    )
    expect(clearRow(container)).toBeNull()
    expect(textOf(container)).not.toMatch(/may miss a leak|fail to stop it/)
    expect(container.querySelector('[data-status="risk"]')).toBeNull()
    expect(container.querySelector('[data-status="water"]')).toBeNull()
  })

  it('all clear: the frame\'s sentence, on 199417:131529\'s own ground', () => {
    const { container } = render(<SystemHealthCard total={10} healthy={10} />)
    const row = clearRow(container)
    expect(row).toBeTruthy()
    expect(row.getAttribute('data-node-id')).toBe('199417:131574')
    /* The informational wash, not a success green. See CLEAR_ROW — the
       node's ground is a frozen #e8f5ff. origin/dev's revert kept the
       rework's `bg-alert-surface-success` under the reverted sentence; the
       green was minted for the tone split that the same commit deleted and
       is in no frame, so the ground stays this side's. Pinned both ways so
       that is not undone by accident. */
    expect(row.className).toContain('bg-accent')
    expect(row.className).not.toContain('bg-alert-surface-success')
    // The frame's sentence (573b57c), pinned verbatim. This and the quiet-
    // state test above are the only two copy pins on this row.
    expect(textOf(container)).toContain('All of your systems are running!')
    // ... and nothing is left over, so no second row.
    expect(otherRow(container)).toBeNull()
  })

  /* ORIGIN/DEV'S FOUR TONE TESTS, re-aimed. Each asserted a sentence before
     2026-10-22 and asserts the row's presence or absence now, which is the
     same guarantee with nothing left for a copy regression to hide behind. */

  it('healthy and leaking: the row still draws, and the leak moves no health figure', () => {
    /* origin/dev expected NO row here, because its gate kept a `leaks === 0`
       term. This card takes no water count at all, so the row draws — the
       claim it makes is about systems running, not about nothing leaking,
       and TriageBand on the same screen is what reports the leak. What the
       test was written for is below it and is unchanged. */
    const { container } = render(<SystemHealthCard total={10} healthy={10} waterEvents={2} />)
    expect(clearRow(container)).toBeTruthy()
    expect(textOf(container)).not.toMatch(/water|leak/i)

    const bar = container.querySelector('[data-node-id="199360:129783"]')
    expect(bar.textContent).toBe('0 / 10 need attention')
    expect(container.querySelector('[data-segment="attention"]')).toBeNull()
  })

  it('unhealthy and dry: the dangerous one, and it is not painted all-clear', () => {
    /* An offline system reports ZERO water events. On a screen of leak counts
       that reads like the good row; it is the worst one, because the ability
       to see a leak there is gone. The bar goes red and the tiles name the
       kind — the card does not ALSO claim everything is running. */
    const { container } = render(<SystemHealthCard total={10} healthy={7} offline={3} />)
    expect(clearRow(container)).toBeNull()
    expect(container.querySelector('[data-node-id="199360:129783"]').textContent)
      .toBe('3 / 10 need attention')
    expect(container.querySelector('[data-segment="attention"]')).toBeTruthy()
  })

  it('unhealthy and leaking: still no row, and the tiles still count faults only', () => {
    const { container } = render(
      <SystemHealthCard total={10} healthy={6} offline={3} valveErrors={1} waterEvents={2} />,
    )
    expect(clearRow(container)).toBeNull()
    expect(container.querySelector('[data-node-id="199360:129783"]').textContent)
      .toBe('4 / 10 need attention')
  })

  it('needs attention on a check that has no tile, and does not call that clear', () => {
    /* THE LIVE BUG THIS TEST WAS WRITTEN FOR, and it is still the same bug.
       The all-clear row's branch condition was `hotKinds.length === 0` —
       valve, offline, power — while `attention` is fleet - healthy over FOUR
       checks, the fourth being "has at least one alert recipient", which this
       card has no tile for. A scope whose only fault is a missing recipient
       therefore printed the all-clear line directly under a bar reading
       "1 / 10 need attention". REPRODUCIBLE ON /location/Building B, not on
       Building A as this comment claimed until 2026-10-22: Building A is 10
       of 10 healthy and draws the all-clear row correctly. Building B is 10
       systems with 2 missing a recipient and nothing else wrong, which is
       this test's scenario at its own numbers.

       2026-10-22, THE GUARD IS REAL AGAIN AND WAS PROVED SO. It had degraded
       to `not.toContain('protected')` plus a copy pin, both against a status
       row that has since been deleted. It now asserts on the ROW's existence
       rather than on a sentence, so it cannot be made vacuous by a copy
       change. Proved by reverting the component's gate to
       `hotKinds.length === 0` and re-running: this test fails on the first
       two expectations (clearRow is an element, and the all-clear line is
       present). Restored, and it passes.

       THE STRING BELOW MOVED IN THE 2026-10-22 MERGE and the assertion did
       not: it is `toBeNull` on the ROW that fails if the gate regresses, and
       the copy pin beside it is a second belt. That ordering is deliberate
       and is the whole lesson of this episode — do not re-pin this test to
       a sentence. */
    const { container } = render(
      <SystemHealthCard
        total={10}
        healthy={9}
        valveErrors={0}
        offline={0}
        noPower={0}
        noRecipients={1}
      />,
    )
    expect(clearRow(container)).toBeNull()
    expect(textOf(container)).not.toContain('All of your systems are running!')

    /* NOT CLAIMING ALL-CLEAR IS ONLY HALF OF IT. The fault also has to be
       VISIBLE, and with no tile for it the card would otherwise draw a bar
       and three nothings. Figma's own answer is this row. */
    expect(otherRow(container)).toBeTruthy()
    expect(textOf(container)).toContain('1 other issue · 1 no recipients')
    expect(container.querySelector('[data-node-id="199360:129783"]').textContent)
      .toBe('1 / 10 need attention')
    // and still no tiles, because no tiled kind has anything in it
    expect(allButtons(container).filter((n) => /: \d+$/.test(n || ''))).toHaveLength(0)
  })

  it('names what the tiles do not, beside tiles that are drawn', () => {
    /* 199414:130115 / 199417:132878 both draw tiles AND this row. "Other" is
       the kinds with no tile — see WHAT "OTHER ISSUES" MEANS HERE — so the
       three tiled counts never appear in it, however large they get. */
    const { container } = render(
      <SystemHealthCard
        total={48}
        healthy={34}
        valveErrors={1}
        offline={1}
        noPower={10}
        noRecipients={4}
      />,
    )
    const row = otherRow(container)
    expect(row).toBeTruthy()
    expect(row.getAttribute('data-node-id')).toBe('199338:52997')
    expect(textOf(row)).toBe('4 other issues · 4 no recipients')
    /* THE FRAME'S CONTRADICTION IS NOT REPRODUCED: 199338:52997 reads "10 no
       power" above a "No power 0" tile. No power has a tile here — it is
       showing 10 — so it is not "other" and gets no clause. */
    expect(textOf(row)).not.toContain('no power')
    expect(container.querySelector('[data-node-id="199323:13029"]')).toBeTruthy()
  })

  it('is slate, centred and not a control', () => {
    const { container } = render(
      <SystemHealthCard total={10} healthy={8} offline={1} valveErrors={1} noRecipients={1} />,
    )
    const row = otherRow(container)
    // 199417:132878's measured ground, as the token that paints it. The two
    // frames disagree here and OTHER_ROW records the measurement for both.
    expect(row.className).toContain('bg-slate-100')
    expect(row.className).toContain('rounded-[16px]')
    expect(row.className).toContain('justify-center')
    // No affordance in the node, so no affordance here.
    expect(row.querySelector('button')).toBeNull()
    expect(row.tagName).toBe('DIV')
    // 14px slate-600, the leading count semibold. Line-height AFTER the size
    // atom or tailwind-merge drops it — the repo's standing trap.
    const text = row.querySelector('p')
    expect(text.className).toContain('text-sm')
    expect(text.className).toContain('text-slate-600')
    expect(text.firstElementChild.className).toContain('font-semibold')
    expect(text.firstElementChild.className).toContain('leading-[20px]')
    expect(text.firstElementChild.textContent).toBe('1')
  })

  it('has no other-issues row when nothing is left over', () => {
    /* 199417:134233 — a solo tile and nothing under it. The row is gated on
       the DATA, not on the tile variant, which is what makes that frame and
       199417:132878 the same component. */
    const { container } = render(
      <SystemHealthCard total={48} healthy={47} valveErrors={1} noRecipients={0} />,
    )
    expect(otherRow(container)).toBeNull()
    expect(allButtons(container).filter((n) => /: \d+$/.test(n || ''))).toHaveLength(1)
  })

  it('pluralises the row on its own count', () => {
    const one = render(<SystemHealthCard total={10} healthy={9} noRecipients={1} />)
    expect(textOf(otherRow(one.container))).toBe('1 other issue · 1 no recipients')
    cleanup()
    const many = render(<SystemHealthCard total={10} healthy={7} noRecipients={3} />)
    expect(textOf(otherRow(many.container))).toBe('3 other issues · 3 no recipients')
  })

  it('the all-clear header control goes to the history it names', () => {
    /* The label switched to "Show past alerts" at 199417:131563 and kept
       calling onShowAll, which on HomeAllAccounts opened the Systems tab. */
    const onShowAll = vi.fn()
    const onShowPast = vi.fn()
    render(<SystemHealthCard total={10} healthy={10} onShowAll={onShowAll} onShowPast={onShowPast} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show past alerts' }))
    expect(onShowPast).toHaveBeenCalledTimes(1)
    expect(onShowAll).not.toHaveBeenCalled()
  })
})
