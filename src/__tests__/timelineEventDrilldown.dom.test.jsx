// @vitest-environment happy-dom
//
// THE TIMELINE ROW'S DRILL-DOWN INTO THE EVENT SCREEN — owner, 2026-11-02:
//
//   "I want to add an option for users to go deep dive into any water events
//    from the timeline. To the event overlay or event screen, so once it's
//    done, so they can just get back to see what happened, so was notified, and
//    some stuff regarding the event. Maybe we can just do it clickable or just
//    show more or open, something that looks okay to add to events timeline."
//
// "any water event" is ONGOING OR ENDED, not only ended — which is the one way
// this predicate differs from the Tag chip's (timelineTagFlow.dom.test.jsx).
// The destination is the EventFocusOverlay the System page already mounts, via
// the same `setEventFocusOpen(true)` the ?focus=event deep link uses. No route
// and no second overlay mount.
//
// SIX THINGS ARE PINNED HERE:
//
//  1. THE ROW OPENS THE OVERLAY. Whole row, through one <button> with a
//     stretched `::after` — not a wrapper around the row, which would nest one
//     interactive element inside another (axe-core `nested-interactive`; React
//     Native #24515 documents iOS VoiceOver failing to REACH a control nested
//     in a tappable row while Android reaches it, i.e. it breaks per platform
//     instead of failing loudly).
//  2. THE `Tell us more` CHIP DOES NOT OPEN THE OVERLAY. This is the
//     sibling/propagation guarantee and the regression most likely to turn up
//     later: the chip and the drill control share a row, and a stretched hit
//     area that forgets to raise its siblings swallows the chip's taps
//     silently — it still LOOKS tappable.
//  3. A NON-WATER ROW IS NOT DRILLABLE. Not for the chip's reason (the
//     feedback sheet's verdicts being water-only) but because the DESTINATION
//     cannot show one: the overlay resolves a live event from `sys.alert` and a
//     concluded one from a leak-only resolver.
//  4. EACH ROW'S ACCESSIBLE NAME IS DISTINCT. generateEvents.js gives a
//     system's ongoing and ended water rows the SAME title, so the name is
//     composed from the title AND the badge — both strings already on screen,
//     neither authored here.
//  5. THE CARD WITH NO HANDLER IS UNCHANGED, to the byte. EventFocusOverlay
//     mounts this card too and passes no handler. v2-page-parity Rule 0.
//  6. THE TWO ROWS OPEN DIFFERENT EVENTS. The one that actually mattered: on a
//     system with a live leak the timeline draws two water rows, and the
//     overlay's own precedence is live-first, so before `focus` BOTH rows
//     opened the ongoing event. A drill-down that shows a different event than
//     the row that opened it is worse than no drill-down.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import EventsTimelineCard, { TAG_CHIP_LABEL } from '@/v2/components/EventsTimelineCard'
import { hasConcludedEvent } from '@/v2/components/concludedEvent'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import { SYSTEMS } from '@/data/systems'
import { getEventsForSystem, HISTORY_EVENTS } from '@/data/events'

afterEach(cleanup)

/** Every drill control the card drew, in row order. */
const drills = (container) => [...container.querySelectorAll('[data-name="Open event"]')]

const ONGOING = {
  id: 'live',
  kind: 'water',
  title: 'High Flow Water Event',
  badge: { label: 'Ongoing', tone: 'warning' },
  description: 'Leak confirmed',
  timestamp: 'Apr 2, 14:35',
  drillable: true,
}
/* Same TITLE on purpose — that is what the real dataset does
   (generateEvents.js:137 vs events.js TYPE_TITLE), and it is why the
   accessible name cannot be the title alone. */
const ENDED = {
  ...ONGOING,
  id: 'ended',
  badge: { label: 'Ended', tone: 'ended' },
  tag: TAG_CHIP_LABEL,
}

describe('the row becomes a navigation target only when the caller owns it', () => {
  it('fires the handler with the row’s own id and the row itself', () => {
    const calls = []
    const { container } = render(
      <EventsTimelineCard events={[ENDED]} onOpenEvent={(id, ev) => calls.push([id, ev.id])} />,
    )
    const [row] = drills(container)
    expect(row, 'a drillable row should carry a control').toBeTruthy()
    fireEvent.click(row)
    expect(calls).toEqual([['ended', 'ended']])
  })

  it('is a real <button>, keyboard reachable, and named from the row’s own strings', () => {
    const { container } = render(<EventsTimelineCard events={[ENDED]} onOpenEvent={() => {}} />)
    const [row] = drills(container)
    expect(row.tagName).toBe('BUTTON')
    expect(row.getAttribute('type')).toBe('button')
    expect(row.hasAttribute('tabindex')).toBe(false)
    expect(row.getAttribute('aria-label')).toBe('High Flow Water Event Ended')
  })

  it('gives two rows that share a TITLE two different names', () => {
    const { container } = render(
      <EventsTimelineCard events={[ONGOING, ENDED]} onOpenEvent={() => {}} />,
    )
    const named = drills(container).map((b) => b.getAttribute('aria-label'))
    expect(named).toEqual(['High Flow Water Event Ongoing', 'High Flow Water Event Ended'])
    expect(new Set(named).size, 'two rows resolved to one accessible name').toBe(named.length)
  })

  it('covers the whole row through a stretched pseudo-element, not a wrapper', () => {
    /* happy-dom has no layout engine — getBoundingClientRect() returns zeros —
       so the hit area is asserted on the classes that produce it, which is
       also where it would silently regress. */
    const { container } = render(
      <EventsTimelineCard events={[ONGOING, ENDED]} onOpenEvent={() => {}} />,
    )
    const [first, last] = drills(container)

    for (const row of [first, last]) {
      expect(row.className).toContain('after:absolute')
      expect(row.className).toContain("after:content-['']")
      expect(row.className).toContain('after:inset-x-0')
      expect(row.className).toContain('after:top-0')
      /* THE TRAP THE CHIP HIT, in its own form. The pseudo is positioned
         against the <li>, which carries `relative`; a `relative` on the BUTTON
         would make the button its own containing block and shrink the hit area
         back to the 24px glyph, still looking right. And an `overflow-clip`
         anywhere on the button would clip the pseudo away (BADGE_BASE carries
         exactly that, which is why the chip needs `overflow-visible`). */
      expect(row.className).not.toContain('relative')
      expect(row.className).not.toContain('overflow-clip')
    }

    /* TEXT_COL's pb-[24px] is the gap BETWEEN rows, not part of either. The
       hit area stops at the content on every row but the last, so the empty
       band between two rows does not open the upper one. */
    expect(first.className).toContain('after:bottom-[24px]')
    expect(last.className).toContain('after:bottom-0')

    // The row is not wrapped: the control is a SIBLING, inside the same <li>.
    const li = first.closest('li')
    expect(li).toBeTruthy()
    expect(first.parentElement).toBe(li)
    expect(li.closest('a, button')).toBeNull()
  })

  it('a row without `drillable` gets no control, handler or not', () => {
    const { container } = render(
      <EventsTimelineCard
        events={[{ ...ENDED, drillable: undefined }]}
        onOpenEvent={() => {}}
      />,
    )
    expect(drills(container)).toHaveLength(0)
  })
})

describe('the chip and the row are siblings, and neither fires the other', () => {
  it('tapping `Tell us more` does NOT open the event', () => {
    const opened = []
    const tagged = []
    const { container } = render(
      <EventsTimelineCard
        events={[ENDED]}
        onOpenEvent={(id) => opened.push(id)}
        onTagEvent={(id) => tagged.push(id)}
      />,
    )
    const chip = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent || '').trim().startsWith(TAG_CHIP_LABEL),
    )
    expect(chip, 'the chip should still be a real button').toBeTruthy()

    fireEvent.click(chip)
    expect(tagged).toEqual(['ended'])
    expect(opened, 'the chip reached the row’s drill-down').toEqual([])

    // And the row still opens — the guard did not disarm the drill-down.
    fireEvent.click(drills(container)[0])
    expect(opened).toEqual(['ended'])
  })

  it('raises the chip and the expand chevron above the stretched hit area', () => {
    /* Positioned siblings paint in DOM order and the drill button is LAST, so
       without `z-[1]` its pseudo sits on top of both controls and swallows
       their taps. The chip has always carried it (it needed one for its own
       44px pseudo); the chevron gets one only when the drill control exists,
       so the handler-absent markup is unchanged. */
    const expandable = { ...ENDED, steps: ['Closing 11:42 AM', 'Closed 11:43 AM'] }
    const { container } = render(
      <EventsTimelineCard events={[expandable]} onOpenEvent={() => {}} onTagEvent={() => {}} />,
    )
    const view = within(container)
    expect(view.getByRole('button', { name: /^Show details for/ }).className).toContain('z-[1]')
    const chip = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent || '').trim().startsWith(TAG_CHIP_LABEL),
    )
    expect(chip.className).toContain('z-[1]')
    cleanup()

    /* WITHOUT the drill handler the chevron must NOT gain the class — that is
       the byte-identity promise, stated on the one atom that is conditional. */
    const { container: bare } = render(
      <EventsTimelineCard events={[expandable]} onTagEvent={() => {}} />,
    )
    expect(
      within(bare).getByRole('button', { name: /^Show details for/ }).className,
    ).not.toContain('z-[1]')
  })

  it('expansion still works, and the row tap does not toggle it', () => {
    /* THE RULE when a row is both expandable and drillable: the ROW navigates,
       EXPANSION stays on its own chevron. They never share a gesture, so there
       is no race. No real System-page row carries `steps`, so this state is
       unreachable on live data — the component still needs a rule for it. */
    const expandable = { ...ENDED, steps: ['Closing 11:42 AM', 'Closed 11:43 AM'] }
    const toggles = []
    const opened = []
    const { container } = render(
      <EventsTimelineCard
        events={[expandable]}
        onOpenEvent={(id) => opened.push(id)}
        onToggleExpanded={(next, id) => toggles.push([next, id])}
      />,
    )
    const view = within(container)

    fireEvent.click(drills(container)[0])
    expect(opened).toEqual(['ended'])
    expect(toggles, 'the row tap reached the expansion').toEqual([])

    fireEvent.click(view.getByRole('button', { name: /^Show details for/ }))
    expect(toggles).toEqual([['ended', 'ended']])
    expect(opened, 'the chevron reached the drill-down').toEqual(['ended'])
  })
})

describe('with NO handler the card is exactly what it was', () => {
  it('renders byte-for-byte the same markup as before the drill-down existed', () => {
    const rows = [ONGOING, ENDED]
    const { container: bare } = render(<EventsTimelineCard events={rows} />)
    const bareHtml = bare.innerHTML
    cleanup()

    const { container: withHandler } = render(
      <EventsTimelineCard events={rows} onOpenEvent={() => {}} />,
    )
    expect(withHandler.innerHTML, 'the handler drew nothing').not.toBe(bareHtml)
    cleanup()

    const { container: bareAgain } = render(
      <EventsTimelineCard events={rows} onOpenEvent={undefined} />,
    )
    expect(bareAgain.innerHTML).toBe(bareHtml)
    cleanup()

    /* EventFocusOverlay's own mount passes neither handler and rows that carry
       no `drillable` at all — the bare mount stands in for it. */
    const { container: mock } = render(<EventsTimelineCard />)
    expect(drills(mock)).toHaveLength(0)
  })
})

describe('the System page drills into the row’s OWN event', () => {
  /* A system with a LIVE leak draws two water rows: the ongoing one from
     CURRENT_EVENTS and the closed one from HISTORY_EVENTS. That pair is the
     whole reason `focus` exists. */
  const WATER = new Set(['leak-high', 'leak-low'])
  const twoRowSys = SYSTEMS.find(
    (s) => WATER.has(s.alert?.type) && hasConcludedEvent(s.id),
  )

  const mountAt = (id) =>
    render(
      <MemoryRouter initialEntries={[`/system/${id}`]}>
        <Routes>
          <Route path="/system/:systemId" element={<SystemPageV2Screen />} />
        </Routes>
      </MemoryRouter>,
    )

  const byName = (container, re) =>
    drills(container).find((b) => re.test(b.getAttribute('aria-label') || ''))

  /* NOT getByRole('dialog'): WaterEventFeedbackSheet is a dialog too and the
     last test below is specifically about telling the two apart. The overlay
     labels itself `event-focus-title-<sysId>` (EventFocusOverlay, `titleId`),
     which is the one marker only it has. */
  const eventOverlay = (container) =>
    container.querySelector('[role="dialog"][aria-labelledby^="event-focus-title-"]')

  it('the dataset really has a system with an ongoing AND an ended water event', () => {
    expect(twoRowSys, 'no system carries a live leak with a resolvable history').toBeTruthy()
    const rows = getEventsForSystem(twoRowSys.id).filter((e) =>
      String(e.type ?? '').startsWith('leak'),
    )
    expect(rows.some((e) => !e.resolved)).toBe(true)
    expect(rows.some((e) => e.resolved)).toBe(true)
  })

  it('drills exactly the water rows — a non-water row carries no control', () => {
    const { container } = mountAt(twoRowSys.id)
    const named = drills(container).map((b) => b.getAttribute('aria-label'))
    const nonWater = getEventsForSystem(twoRowSys.id).filter(
      (e) => !String(e.type ?? '').startsWith('leak'),
    )
    for (const e of nonWater) {
      expect(
        named.some((n) => n.startsWith(e.title)),
        `a non-water row was made drillable: ${e.type} / ${e.title}`,
      ).toBe(false)
    }
    // ...and every name is still unique across the card.
    expect(new Set(named).size).toBe(named.length)
  })

  it('the ENDED row opens the ENDED event, not the ongoing one', () => {
    /* THE DISCRIMINATOR is the display Event ID. The concluded branch shows the
       HISTORY row's own id (generateEvents.js:145, the same id
       /events/system/:systemId lists); the live branch hashes the ACTIVE
       incident instead, so the two can never collide. Asserting on the id
       rather than on branch chrome means this test fails if the overlay ever
       resolves the wrong RECORD, which is the bug it is here to catch. */
    const historyId = HISTORY_EVENTS.find((e) => e.system === twoRowSys.id)?.eventId
    expect(historyId, 'the history row has no display id to assert on').toBeTruthy()

    const { container } = mountAt(twoRowSys.id)
    expect(eventOverlay(container), 'the overlay was already open').toBeNull()

    fireEvent.click(byName(container, /Ended$/))
    const dialog = eventOverlay(container)
    expect(dialog, 'the ended row did not open the overlay').toBeTruthy()
    expect(dialog.textContent, 'the ended row did not open the ended event').toContain(historyId)
  })

  it('the ONGOING row opens the ongoing event', () => {
    const historyId = HISTORY_EVENTS.find((e) => e.system === twoRowSys.id)?.eventId
    const { container } = mountAt(twoRowSys.id)

    fireEvent.click(byName(container, /Ongoing$/))
    const dialog = eventOverlay(container)
    expect(dialog, 'the ongoing row did not open the overlay').toBeTruthy()
    expect(
      dialog.textContent,
      'the ongoing row opened the ENDED event',
    ).not.toContain(historyId)
  })

  it('the `Tell us more` chip opens the feedback sheet, never the event', () => {
    /* The page-level half of the sibling guarantee. The chip sits in the same
       row as the drill control and must keep reaching the sheet; `Unusual, no
       issue` is the event-ended flow's first screen, the same marker
       timelineTagFlow and journeyDeepLinks already use. */
    const { container } = mountAt(twoRowSys.id)
    const chip = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent || '').trim().startsWith(TAG_CHIP_LABEL),
    )
    expect(chip, 'no ended water row carried the chip').toBeTruthy()

    fireEvent.click(chip)
    expect(within(document.body).queryByText('Unusual, no issue')).toBeTruthy()
    expect(eventOverlay(container), 'the chip opened the event overlay').toBeNull()
  })
})
