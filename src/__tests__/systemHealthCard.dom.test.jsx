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
/* Imported so the segments' accessible names are pinned against the FILTER
   MODULE rather than against a copy of its strings. If anyone renames an
   option in the sheet, the bar's promise about where it lands breaks here. */
import { FILTER_CATEGORY_BY_ID } from '@/data/systemFilters'

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
    /* 9 well out of a fleet of 5 is nonsense input; what matters is that it
       does not produce a NEGATIVE attention count. It used to be read off the
       label ("0 / 5 need attention"); since the owner's 2026-11-04 rule a
       clamped fleet is an all-clear fleet and draws neither bar nor line, so
       the clamp is read off the all-clear state it lands in instead. A
       negative count would miss `attention === 0` and draw a bar. */
    const { container } = render(<SystemHealthCard total={5} healthy={9} />)
    expect(segments(container).red).toBeNull()
    expect(container.querySelector('[data-name="Progress Bar"]')).toBeNull()
    expect(container.querySelector('[data-node-id="199360:129783"]')).toBeNull()
    expect(container.querySelector('[data-status="clear"]')).toBeTruthy()
  })
})

describe('SystemHealthCard — the fault breakdown is GONE', () => {
  /* ── 2026-11-09, AND THIS DESCRIBE REPLACES ITS OPPOSITE ─────────────────
     What stood here asserted the three fault counters: their node order
     (valve errors, offline, no power), that each fired `onSelectIssue` with
     its key, and that each was a real button with a 43px tap box.

     Owner, over a screenshot of this card showing the bar, "2 / 5 need
     attention" and a "No power 2" tile beneath it: "remoive the error type
     from here / keep onlt the x out of y as in figma". Node 200067:41981,
     refetched the same day, draws the heading, the header action, one bar and
     one "x / y need attention" line - nothing else.

     ⚠ THIS IS THE THIRD RULING ON THESE TILES IN TWO DAYS: show how many but
     not which ("we are not showin wht the erros any more on main screens just
     how many of them") -> drop the boxes, keep the data -> drop the tiles.
     The newest wins, and the assertions below are what stops the previous two
     being restored from an older frame by someone reading this file's
     history. They are inverted on purpose, not deleted, for exactly that. */
  it('draws no fault counters at all, in any fault combination', () => {
    for (const props of [
      { valveErrors: 4, offline: 2, noPower: 7 },
      { valveErrors: 0, offline: 3, noPower: 0 },
      { valveErrors: 1, offline: 0, noPower: 0 },
    ]) {
      cleanup()
      const { container } = render(<SystemHealthCard {...ALERTING} {...props} />)
      for (const name of ['Valve errors', 'Offline systems', 'Disconnected power']) {
        expect(
          screen.queryByRole('button', { name: new RegExp(`^${name}:`) }),
          `${name} is back as a counter`,
        ).toBeNull()
      }
      expect(container.querySelector('[data-node-id="199323:13029"]'), 'the tile row is back').toBeNull()
      expect(container.textContent, 'a fault label is back on the card').not.toMatch(
        /Valve errors|Offline systems|Disconnected power/,
      )
    }
  })

  it('draws no other-issues row, whatever it is handed', () => {
    /* The row read "N other issues - N no recipients" off `noRecipients`.
       The prop is gone from the component, so passing it must be inert
       rather than quietly re-growing the row. */
    const { container } = render(
      <SystemHealthCard {...ALERTING} noRecipients={4} valveErrors={2} />,
    )
    expect(container.querySelector('[data-other-issues]')).toBeNull()
    expect(container.textContent).not.toMatch(/other issue|no recipients/i)
  })

  it('still announces the aggregate, so the bar is not the only cue', () => {
    /* The per-fault counts left the accessibility tree with the tiles, by
       instruction. What must NOT go with them is the fleet figure: colour and
       bar length are not an accessible cue on their own (wint-ui-copy §5). */
    const { container } = render(
      <SystemHealthCard {...ALERTING} total={48} healthy={45} valveErrors={3} />,
    )
    const bar = container.querySelector('[data-name="Progress Bar"]')
    expect(bar.getAttribute('aria-label')).toBe('45 of 48 systems healthy')
    expect(container.textContent).toMatch(/3\s*\/\s*48 need attention/)
  })
})

describe('SystemHealthCard — all healthy / empty', () => {
  /* ── NO BAR WHEN NOTHING NEEDS ATTENTION, 2026-11-04 ────────────────────
     Owner, verbatim, on a screenshot of a full green track above
     "0 / 5 need attention": "When all good, no progress bar. This is the rule
     you need to".

     THIS TEST USED TO ASSERT THE OPPOSITE - that the all-clear state drops the
     red segment and rounds the green on both ends - and it is reversed at the
     owner's ruling. The reading it was protecting is the reason: a track
     filled end to end beside a 0 asserts a measurement where there is nothing
     to measure, and at a glance it says "48 of 48 are bad".

     The expectation is built from the DATA (`healthy === total`, so attention
     is 0) rather than from a literal, so a fixture change cannot quietly turn
     this into an assertion about some other state. */
  it('draws no bar at all when nothing needs attention', () => {
    const total = 48
    const healthy = total // attention === 0, by construction
    const { container } = render(
      <SystemHealthCard total={total} healthy={healthy} valveErrors={0} offline={0} noPower={0} />,
    )
    expect(total - healthy, 'the fixture must actually be the zero case').toBe(0)
    const { red, green } = segments(container)
    expect(red).toBeNull()
    expect(green, 'a full green track beside a 0 reads as "all bad"').toBeNull()
    expect(container.querySelector('[data-name="Progress Bar"]')).toBeNull()
    // ... and the state says itself in words instead. 199922:85244's answer.
    expect(container.querySelector('[data-status="clear"]')).toBeTruthy()
  })

  it('draws the bar as soon as the count it represents is non-zero', () => {
    const total = 48
    const healthy = total - 1
    const { container } = render(<SystemHealthCard total={total} healthy={healthy} />)
    expect(total - healthy).toBeGreaterThan(0)
    expect(container.querySelector('[data-name="Progress Bar"]')).toBeTruthy()
    const { red, green } = segments(container)
    expect(red).toBeTruthy()
    expect(green).toBeTruthy()
    // The geometry of the non-zero states is untouched by the rule above.
    expect(red.style.flexGrow).toBe(String(total - healthy))
    expect(green.style.flexGrow).toBe(String(healthy))
  })

  /* SUPERSEDED BY THE OWNER'S 2026-11-04 RULE, "also remove the x out of y
     when all good". This asserted that the leading zero on
     "0 / 48 need attention" rendered slate-300 rather than red - a greyed
     zero rather than a red one. There is no line at all in that state now, so
     the strongest form of "zero is never red" is that no zero is drawn.
     What the old test guarded still has to hold one step up the scale, and
     that is the second half: a count of 1 IS red, so the branch that greys a
     zero has not been wired backwards. */
  it('draws no attention line at all when the count is zero', () => {
    const total = 48
    const { container } = render(<SystemHealthCard total={total} healthy={total} />)
    expect(container.querySelector('[data-node-id="199360:129783"]')).toBeNull()
    expect(container.textContent).not.toContain('need attention')
    expect(container.textContent).not.toMatch(/\b0 \//)
  })

  it('still paints a non-zero count red on the line it does draw', () => {
    const total = 48
    const healthy = total - 1
    const attention = total - healthy
    const { container } = render(<SystemHealthCard total={total} healthy={healthy} />)
    const line = container.querySelector('[data-node-id="199360:129783"]')
    expect(line.textContent).toBe(`${attention} / ${total} need attention`)
    expect(line.querySelector('span').className).toContain('text-red-600')
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

  /* THREE COMMENT BLOCKS STOOD HERE, one per removed test: the solo-tile
     variant (199417:134216), the red/slate ink switch, and the box-less
     affordance check from 2026-11-08. All three described the fault tiles,
     which 200067:41981 no longer draws - see the inverted assertions in
     'the fault breakdown is GONE' above. */

  it('renders an empty fleet with no bar at all, not a placeholder track', () => {
    /* An empty fleet was the one case where a zero-attention track was still
       drawn - `!showRed` handed the green segment the full width so the bar
       was never bare. The owner's rule covers it without a special case: 0
       over 0 systems is still nothing to measure, so the picture of it goes.
       This is a STRENGTHENING of what the test asked before (no sliver of
       either colour), not a reversal. */
    const { container } = render(<SystemHealthCard />)
    const { red, green } = segments(container)
    expect(red).toBeNull()
    expect(green).toBeNull()
    expect(container.querySelector('[data-name="Progress Bar"]')).toBeNull()
  })
})

/* THE SEGMENTS ARE CONTROLS, 2026-10-22. Owner, on a screenshot of the bar:
   "make these bars clcikable to systems table filtered".

   What is worth asserting here, and why:
     - that each segment raises the filter VALUE 'attention' / 'ok' rather
       than a word of its own, because those two are what
       src/data/systemFilters.js's `attention` category produces off
       `computeSystemHealth(s).allOk` -- the same predicate the host counts
       `healthy` with. A card that invented its own vocabulary is how the
       table and the bar that opened it start disagreeing;
     - that the accessible NAMES carry the filter module's own labels, for
       the same reason, and say where the press goes -- which since 2026-11-08
       is TWO DIFFERENT PLACES: ced0553 sent the red half to the alerts
       overlay and left the green half on the filtered table, so the red name
       ends "Show all alerts." and the green one "Show these systems.". The
       asymmetry is the point and is asserted, not tidied away;
     - the KEYBOARD, because a bar made of divs with onClick is the usual way
       this gets shipped and it is unreachable;
     - the NO-HANDLER case, which is the repo's standing rule: a card never
       promises an affordance its host has not wired. It is also what keeps
       the whole block above this one honest -- every test up there renders
       the card unwired, so if the plain branch ever stopped being a plain
       div they would all be asserting the wrong element;
     - that role="img" gives way to a group. role="img" is a LEAF and would
       hide both buttons from a screen reader however correct their markup.
   The GEOMETRY is pinned in the progress-bar block above and again here: the
   interactive branch must not move the flex-grow measurement or the radii. */
describe('SystemHealthCard — the progress bar as a pair of controls', () => {
  const ATTENTION_LABEL = FILTER_CATEGORY_BY_ID.attention.labelOf('attention')
  const OK_LABEL = FILTER_CATEGORY_BY_ID.attention.labelOf('ok')

  it('raises the half it draws, red to the alerts overlay and green to the table', async () => {
    const onSelectHealth = vi.fn()
    render(<SystemHealthCard {...ALERTING} onSelectHealth={onSelectHealth} />)

    const red = screen.getByRole('button', {
      name: 'Requires attention: 3 of 48 systems. Show all alerts.',
    })
    const green = screen.getByRole('button', {
      name: 'All systems good: 45 of 48 systems. Show these systems.',
    })

    await userEvent.click(red)
    expect(onSelectHealth).toHaveBeenLastCalledWith('attention')
    await userEvent.click(green)
    expect(onSelectHealth).toHaveBeenLastCalledWith('ok')
    expect(onSelectHealth).toHaveBeenCalledTimes(2)
  })

  /* The two values are not free text: they are the `attention` category's own
     valueOf output, so `{ attention: ['attention'] }` is a selection the
     filter sheet could have produced by hand. */
  it('raises values the filter module can actually apply', async () => {
    const onSelectHealth = vi.fn()
    const { container } = render(
      <SystemHealthCard {...ALERTING} onSelectHealth={onSelectHealth} />,
    )
    await userEvent.click(container.querySelector('[data-segment="attention"]'))
    await userEvent.click(container.querySelector('[data-segment="healthy"]'))

    const raised = onSelectHealth.mock.calls.map(([v]) => v)
    const category = FILTER_CATEGORY_BY_ID.attention
    expect(raised).toEqual(['attention', 'ok'])
    // Every raised value is one this category knows how to label and match.
    for (const v of raised) expect(typeof category.labelOf(v)).toBe('string')
  })

  it('names each segment with its count and the label it will land on', () => {
    const { container } = render(
      <SystemHealthCard {...ALERTING} onSelectHealth={() => {}} />,
    )
    const { red, green } = segments(container)
    // 'Requires attention' / 'All systems good' -- the sheet's own wording.
    expect(red.getAttribute('aria-label')).toBe(
      `${ATTENTION_LABEL}: 3 of 48 systems. Show all alerts.`,
    )
    expect(green.getAttribute('aria-label')).toBe(
      `${OK_LABEL}: 45 of 48 systems. Show these systems.`,
    )
    /* THE TWO HALVES NAME TWO DESTINATIONS, and that is deliberate -- see the
       block note above. Red goes to the alerts overlay (ced0553), so its name
       must say so, and it says it in the card's OWN words: the header button's
       accessible name, verbatim, which is the other control onto that overlay.
       Green still opens the filtered table and must NOT say "alert". */
    expect(red.getAttribute('aria-label')).toMatch(/alert/i)
    expect(red.getAttribute('aria-label')).toContain(
      screen.getByRole('button', { name: 'Show all alerts' }).getAttribute('aria-label'),
    )
    expect(green.getAttribute('aria-label')).not.toMatch(/alert/i)
  })

  it('is reachable and operable from the keyboard', async () => {
    const onSelectHealth = vi.fn()
    const { container } = render(
      <SystemHealthCard {...ALERTING} onSelectHealth={onSelectHealth} />,
    )
    const { red, green } = segments(container)

    // Real <button>s, so tab order and Enter/Space come for free -- which is
    // the whole reason these are not divs carrying onClick.
    expect(red.tagName).toBe('BUTTON')
    expect(green.tagName).toBe('BUTTON')

    await userEvent.tab() // the header's "Show all"
    await userEvent.tab()
    expect(document.activeElement).toBe(red)
    await userEvent.keyboard('{Enter}')
    expect(onSelectHealth).toHaveBeenLastCalledWith('attention')

    await userEvent.tab()
    expect(document.activeElement).toBe(green)
    await userEvent.keyboard(' ')
    expect(onSelectHealth).toHaveBeenLastCalledWith('ok')
  })

  it('shows focus with a token, not a hex, so all four themes move', () => {
    const { container } = render(
      <SystemHealthCard {...ALERTING} onSelectHealth={() => {}} />,
    )
    const { red, green } = segments(container)
    for (const seg of [red, green]) {
      expect(seg.className).toContain('focus-visible:ring-ring/50')
      expect(seg.className).toContain('hover:brightness-[0.97]')
      expect(seg.className).toContain('active:brightness-95')
      expect(seg.className).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    }
  })

  /* The 15px bar is not a tap target. `after:` grows the hit box without
     moving a drawn pixel: 5px above and below (all the room there is before
     the "Show all" button's own tap box and the label's line box), and 20px
     OUTWARD into the card's px-[20px] gutter -- never inward, because two hit
     boxes that overlap would send a press to the wrong half of the fleet. */
  it('grows the hit box outward only, never between the two segments', () => {
    const { container } = render(
      <SystemHealthCard {...ALERTING} onSelectHealth={() => {}} />,
    )
    const { red, green } = segments(container)
    for (const seg of [red, green]) {
      expect(seg.className).toContain('after:top-[-5px]')
      expect(seg.className).toContain('after:bottom-[-5px]')
    }
    expect(red.className).toContain('after:left-[-20px]')
    expect(red.className).toContain('after:right-0')
    expect(green.className).toContain('after:left-0')
    expect(green.className).toContain('after:right-[-20px]')
  })

  it('leaves the lone full-width segment overhanging both sides', () => {
    /* THE LONE SEGMENT IS THE RED ONE NOW. It used to be the green, taken
       from an all-clear fleet (48 of 48) - a state that draws no bar at all
       since the owner's 2026-11-04 rule. The only remaining way to hold the
       whole track alone is the other end of the same scale: nothing well. The
       guarantee is unchanged - a segment that owns the full width overhangs
       into the card's gutter on BOTH sides, never inward. */
    const { container } = render(
      <SystemHealthCard total={6} healthy={0} onSelectHealth={() => {}} />,
    )
    const { red, green } = segments(container)
    expect(green, 'nothing is well, so there is no green half').toBeNull()
    expect(red.className).toContain('after:left-[-20px]')
    expect(red.className).toContain('after:right-[-20px]')
  })

  it('keeps the measured proportion and the radii when it becomes a control', () => {
    const { container } = render(
      <SystemHealthCard {...ALERTING} onSelectHealth={() => {}} />,
    )
    const { red, green } = segments(container)
    // Figma's frozen w-[18px] is 3/48 of the track -- see the component header.
    expect(red.style.flexGrow).toBe('3')
    expect(green.style.flexGrow).toBe('45')
    expect(red.style.flexBasis).toBe('0px')
    expect(green.style.flexBasis).toBe('0px')
    expect(red.className).toContain('rounded-tl-[9068757px]')
    expect(green.className).toContain('rounded-br-[9068757px]')
    expect(red.className).toContain('bg-bar-fill-risk')
    expect(green.className).toContain('from-bar-fill-ok-from')
  })

  /* THE WRAPPER CANNOT STAY role="img". It is a leaf role: both buttons under
     it would be presentational and unreachable. */
  it('turns the picture into a labelled group once it holds controls', () => {
    const { container } = render(
      <SystemHealthCard {...ALERTING} onSelectHealth={() => {}} />,
    )
    const bar = container.querySelector('[data-node-id="199360:129779"]')
    expect(bar.getAttribute('role')).toBe('group')
    expect(bar.getAttribute('aria-label')).toBe('45 of 48 systems healthy')
  })

  it('stays a plain picture when the host has not wired it', () => {
    const { container } = render(<SystemHealthCard {...ALERTING} />)
    const { red, green } = segments(container)
    expect(red.tagName).toBe('DIV')
    expect(green.tagName).toBe('DIV')
    expect(red.getAttribute('aria-label')).toBeNull()
    expect(green.getAttribute('aria-label')).toBeNull()
    expect(red.className).not.toContain('cursor-pointer')
    expect(red.className).not.toContain('after:')

    const bar = container.querySelector('[data-node-id="199360:129779"]')
    expect(bar.getAttribute('role')).toBe('img')
    expect(bar.getAttribute('aria-label')).toBe('45 of 48 systems healthy')
    expect(bar.querySelector('button')).toBeNull()
  })

  /* A ZERO SEGMENT MUST NOT BE A CONTROL. Red at zero is not drawn at all, so
     there is nothing to press. Green at zero is drawn in exactly one case --
     an empty fleet -- and a control there would promise a table of nothing. */
  it('never offers a red control when nothing needs attention', () => {
    /* The guarantee is unchanged and is now carried by the bar's absence: a
       control promising "the systems that require attention" must never exist
       when there are none. The green half went with it under the owner's
       2026-11-04 rule - the note that used to stand here ("Green still
       navigates: show me the ones that are fine is a real ask") described a
       bar that is no longer drawn in this state. The ask itself survives
       elsewhere on the screen: the header button offers the history, and the
       Systems tab is one tap away. */
    const onSelectHealth = vi.fn()
    const { container } = render(
      <SystemHealthCard total={48} healthy={48} onSelectHealth={onSelectHealth} />,
    )
    const { red, green } = segments(container)
    expect(red).toBeNull()
    expect(green).toBeNull()
    expect(screen.queryByRole('button', { name: /Requires attention/ })).toBeNull()
    expect(screen.queryByRole('button', { name: new RegExp(OK_LABEL) })).toBeNull()
  })

  it("draws no placeholder track for an empty fleet to make pressable", () => {
    /* It used to draw an unpressable green placeholder at flexGrow 1 so the
       track was never bare. There is no track now - see the empty-fleet test
       in the all-healthy block - so what this pins is that nothing in the bar
       slot became a control on the way out. */
    const { container } = render(<SystemHealthCard onSelectHealth={() => {}} />)
    const { red, green } = segments(container)
    expect(red).toBeNull()
    expect(green).toBeNull()
    expect(container.querySelector('[data-node-id="199360:129779"]')).toBeNull()
  })

  it('makes the red segment full-width and pressable when nothing is well', () => {
    const onSelectHealth = vi.fn()
    const { container } = render(
      <SystemHealthCard total={6} healthy={0} onSelectHealth={onSelectHealth} />,
    )
    const { red, green } = segments(container)
    expect(green).toBeNull()
    expect(red.tagName).toBe('BUTTON')
    expect(red.className).toContain('rounded-[9068757px]')
    expect(red.className).toContain('after:left-[-20px]')
    expect(red.className).toContain('after:right-[-20px]')
    expect(red.getAttribute('aria-label')).toBe(
      `${ATTENTION_LABEL}: 6 of 6 systems. Show all alerts.`,
    )
  })

  it('follows the singular when the fleet is one', () => {
    /* `total={1} healthy={1}` stood here and draws no bar since 2026-11-04,
       so the singular is read off the one segment a one-system fleet can
       still draw: the red one, when that system is the one in trouble. The
       thing under test - "1 system", not "1 systems" - is unchanged. */
    const { container } = render(
      <SystemHealthCard total={1} healthy={0} onSelectHealth={() => {}} />,
    )
    expect(segments(container).red.getAttribute('aria-label')).toBe(
      `${ATTENTION_LABEL}: 1 of 1 system. Show all alerts.`,
    )
  })
})

describe('SystemHealthCard — Figma class fidelity', () => {
  // The repo's standing trap: cn() is tailwind-merge, which drops a `leading-`
  // written BEFORE a font-size atom. Figma emits alphabetically, i.e. leading
  // first, so every atom in the component has its line-height moved last. If
  // anyone "tidies" them back into Figma order these assertions go red.
  it('keeps every line-height through tailwind-merge', () => {
    const { container } = render(<SystemHealthCard {...ALERTING} />)

    /* 18/28 on Geist since 199922:85244 (was 14/20 on Figtree). The POINT of
       this assertion is unchanged and is the only reason it names a size at
       all: the leading has to survive cn(), which drops a `leading-` written
       before its font-size atom. */
    const heading = container.querySelector('[data-node-id="199323:12128"]')
    expect(heading.className).toContain('leading-[28px]')
    expect(heading.className).toContain('text-[18px]')
    /* The family is on the atom, NOT on the call site, and that is load-
       bearing rather than tidy: tailwind-merge does not know --font-mono-label
       is a font-family, so a `font-sans` left at the call site would ship two
       font-family declarations and let stylesheet order pick. */
    expect(heading.className).toContain('font-mono-label')
    expect(heading.className).not.toMatch(/(^|\s)font-sans(\s|$)/)

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
    /* Every glyph is a local inline SVG. The count has fallen twice: five →
       four when the fleet row's sensor went to the hero, and four → ONE on
       2026-11-09, when the valve, wifi and power glyphs went with the fault
       tiles. The arrow in the header action is the only glyph this card still
       draws in its fault state; the all-clear state adds the location dot.
       What this test is actually for is unchanged and is the line above: no
       figma.com asset URL, ever. */
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(1)
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
describe('SystemHealthCard — the all-clear row', () => {
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
    /* THE GROUND IS GREEN AGAIN, 2026-11-04, and this assertion is reversed
       with it. It used to pin `bg-accent` and forbid
       `bg-alert-surface-success`, on one stated ground: that green "is in no
       frame". The owner's account-dashboard frame 199922:85244 draws this row
       #d9fde2, so the premise is false now and the pin follows the evidence.
       A TOKEN, NOT THE LITERAL - --alert-surface-success is #dcfce7 in
       `light`, within (3,1,5) of the frame, and unlike a frozen hex it is
       redefined under dark and contrast. The forbidding half is kept, aimed
       at the literal instead: a raw hex here would be a light-mode green on
       all four themes. */
    expect(row.className).toContain('bg-alert-surface-success')
    expect(row.className, 'a frozen hex would not re-ground per theme')
      .not.toMatch(/#[0-9a-f]{3,8}\b/i)
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

    /* THE LEAK MOVES NO HEALTH FIGURE, which used to be read off the line
       ("0 / 10 need attention" with two leaks live). The line is gone in this
       state since the owner's 2026-11-04 rule, so the same guarantee is read
       off what replaced it: a fleet with 2 live water events and no device
       fault is still all-clear on THIS card, and nothing red is drawn. */
    expect(container.querySelector('[data-node-id="199360:129783"]')).toBeNull()
    expect(container.querySelector('[data-segment="attention"]')).toBeNull()
    expect(textOf(container)).not.toContain('need attention')
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
      />,
    )
    expect(clearRow(container)).toBeNull()
    expect(textOf(container)).not.toContain('All of your systems are running!')

    /* ── UPDATED 2026-11-09, AND THE GUARD IS INTACT ────────────────────────
       `noRecipients={1}` used to set the scenario up; the card no longer
       takes that prop. The scenario is unchanged and is now stated the way
       the card actually sees it: 9 healthy of 10 with all three TILED counts
       at zero. That is precisely the shape of the bug - `attention` is 1 and
       `hotKinds` is empty - so the gate is still under test, and still has
       to be `hotKinds.length === 0 && attention === 0` rather than
       `hotKinds.length === 0` alone.

       WHAT WENT: the second half asserted the other-issues row carried the
       untiled fault ("1 other issue - 1 no recipients"). 200067:41981 draws
       no such row. The fault is still VISIBLE - it is inside `attention`, so
       the bar and the line below it both count it - it is simply no longer
       itemised, which is the whole of the owner's ruling. */
    expect(container.querySelector('[data-other-issues]'), 'the other-issues row is back').toBeNull()
    expect(container.querySelector('[data-node-id="199360:129783"]').textContent)
      .toBe('1 / 10 need attention')
    expect(allButtons(container).filter((n) => /: \d+$/.test(n || ''))).toHaveLength(0)
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
