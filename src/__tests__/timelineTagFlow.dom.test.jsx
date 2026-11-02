// @vitest-environment happy-dom
//
// THE TIMELINE'S WAY INTO THE EVENT-ENDED FEEDBACK FLOW — owner, 2026-11-02:
//
//   "Okay, now we need to add another flow. Same flow as tell us more from the
//    push notification. Needs to be exists on the events timeline on the events
//    that calls like high flow or low flow ended. So user can get to the same
//    flow even the event is ended. Just add it there."
//
// PRD 15 §4.3 already named the Events Timeline the canonical surface for
// retrospective tagging, so this is the specified build. Until now the only
// door into WaterEventFeedbackSheet's `trigger="event-ended"` question was the
// LE_01 push's "Tell us more" CTA, which deep-links to
// /system/{id}?action=tag — a door that closes the moment the push is gone.
//
// FOUR THINGS ARE PINNED HERE, and the fourth is the one that protects what
// already worked:
//
//  1. The chip reaches the flow. With `onTagEvent` supplied the chip is a real
//     <button>, and on the System page tapping it opens the SAME sheet the
//     deep link opens — no route, no second mount.
//  2. The predicate. kind === 'water' && resolved, which on today's data is
//     exactly `type === 'leak-resolved'`. An ONGOING water row gets no chip; a
//     NON-WATER row gets no chip, ended or not — the sheet's five verdicts are
//     all about water and "Leak" / "Water Waste" are nonsense against a
//     connectivity or power row.
//  3. The chip does not toggle the row it sits in. A row may be expandable and
//     the chip must not fire the chevron: the same event-propagation class of
//     bug cost three rounds on the push card earlier this session.
//  4. WITH NO HANDLER THE CARD IS UNCHANGED. EventFocusOverlay mounts this
//     card too (its rows are one event's STEPS, not events) and passes no
//     handler; a bare mount passes none either. Both must keep today's inert
//     aria-disabled span, which is v2-page-parity Rule 0 in test form.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import EventsTimelineCard, { TAG_CHIP_LABEL } from '@/v2/components/EventsTimelineCard'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import { SYSTEMS } from '@/data/systems'
import { getEventsForSystem } from '@/data/events'

afterEach(cleanup)

/** Every chip the card drew as a real control, by accessible name. */
const tagButtons = (container) =>
  [...container.querySelectorAll('button')].filter((b) =>
    (b.textContent || '').trim().startsWith(TAG_CHIP_LABEL),
  )

describe('the Tag chip becomes a control only when the caller owns it', () => {
  const ROW = {
    id: 'ended-water',
    kind: 'water',
    title: 'High Flow Water Event',
    badge: { label: 'Ended', tone: 'ended' },
    description: 'Leak confirmed',
    timestamp: 'Apr 02, 2026 08:13:15',
    tag: TAG_CHIP_LABEL,
  }

  it('fires the handler with the row’s own id', () => {
    const calls = []
    const { container } = render(
      <EventsTimelineCard events={[ROW]} onTagEvent={(id) => calls.push(id)} />,
    )
    const [chip] = tagButtons(container)
    expect(chip, 'the chip should be a real button when a handler is supplied').toBeTruthy()
    fireEvent.click(chip)
    expect(calls).toEqual(['ended-water'])
  })

  it('is keyboard reachable, named, and a 44px target on a 24px pill', () => {
    const { container } = render(<EventsTimelineCard events={[ROW]} onTagEvent={() => {}} />)
    const [chip] = tagButtons(container)
    // A <button> is in the tab order by default; an explicit negative tabindex
    // would take it out again, and nothing here may do that.
    expect(chip.tagName).toBe('BUTTON')
    expect(chip.getAttribute('type')).toBe('button')
    expect(chip.hasAttribute('tabindex')).toBe(false)
    /* The name is composed from two strings that already exist — the chip's
       own label and the row's title — so several ended rows are distinguishable
       without anyone authoring copy. */
    expect(chip.getAttribute('aria-label')).toBe(`${TAG_CHIP_LABEL} ${ROW.title}`)

    /* THE HIT BOX. The pill stays the frame's h-[24px]; an `after:` pseudo
       takes the TAP area to 24+10+10 = 44px. happy-dom has no layout engine —
       getBoundingClientRect() returns zeros here — so this is asserted on the
       classes that produce it, which is also where it would silently regress.
       `overflow-visible` is load-bearing: BADGE_BASE carries `overflow-clip`,
       which clips the pseudo away and leaves a 24px target that still looks
       right. */
    expect(chip.className).toContain('after:inset-y-[-10px]')
    expect(chip.className).toContain('overflow-visible')
    expect(chip.className).not.toContain('overflow-clip')
    expect(chip.className).toContain('h-[24px]')
  })

  it('does NOT toggle the row it sits in', () => {
    const expandable = { ...ROW, steps: ['Closing 11:42 AM', 'Closed 11:43 AM'] }
    const toggles = []
    const { container } = render(
      <EventsTimelineCard
        events={[expandable]}
        onTagEvent={() => {}}
        onToggleExpanded={(next, id) => toggles.push([next, id])}
      />,
    )
    const view = within(container)
    const chevron = view.getByRole('button', { name: /^Show details for/ })
    expect(chevron.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(tagButtons(container)[0])
    expect(toggles, 'the chip must not reach the row’s expansion').toEqual([])
    expect(
      view.getByRole('button', { name: /^Show details for/ }).getAttribute('aria-expanded'),
      'the row opened on a tag tap',
    ).toBe('false')

    // The chevron itself still works — the guard did not disarm the row.
    fireEvent.click(chevron)
    expect(toggles).toEqual([[expandable.id, expandable.id]])
  })

  it('a row with no `tag` draws no chip at all, handler or not', () => {
    const { container } = render(
      <EventsTimelineCard events={[{ ...ROW, tag: undefined }]} onTagEvent={() => {}} />,
    )
    expect(tagButtons(container)).toHaveLength(0)
    expect(container.textContent).not.toContain(TAG_CHIP_LABEL)
  })
})

describe('with NO handler the card is exactly what it was', () => {
  /* EventFocusOverlay.jsx mounts this card with no `onTagEvent`, and so does
     every bare mount in eventsTimelineCard.dom.test.jsx. Rule 0: working
     behaviour is not altered without the owner's word. */
  it('the bare mount still draws the inert, aria-disabled span', () => {
    const { container } = render(<EventsTimelineCard />)
    expect(container.textContent).toContain(TAG_CHIP_LABEL)
    expect(tagButtons(container), 'the inert chip became tappable').toHaveLength(0)

    const inert = [...container.querySelectorAll('[aria-disabled="true"]')].filter((el) =>
      (el.textContent || '').includes(TAG_CHIP_LABEL),
    )
    expect(inert.length).toBeGreaterThan(0)
    expect(inert[0].tagName).not.toBe('BUTTON')
  })

  it('renders byte-for-byte the same markup as before the handler existed', () => {
    /* The two mounts differ ONLY in the prop. If the handler leaked into the
       default path this diff would be non-empty. */
    const { container: bare } = render(<EventsTimelineCard />)
    const bareHtml = bare.innerHTML
    cleanup()
    const { container: withHandler } = render(<EventsTimelineCard onTagEvent={() => {}} />)
    expect(withHandler.innerHTML).not.toBe(bareHtml)
    cleanup()
    const { container: bareAgain } = render(<EventsTimelineCard onTagEvent={undefined} />)
    expect(bareAgain.innerHTML).toBe(bareHtml)
  })
})

describe('the System page puts the chip on ended water events only', () => {
  /* generateEvents.js builds exactly ONE history event per system and it is
     always a resolved leak-high / leak-low, so every system route carries at
     least one qualifying row. CURRENT_EVENTS are always `resolved: false`. */
  const qualifying = (id) =>
    (getEventsForSystem(id) ?? []).filter(
      (e) => e.resolved && String(e.type ?? '').startsWith('leak'),
    )

  const sys = SYSTEMS.find((s) => qualifying(s.id).length > 0)

  const mountAt = (id) =>
    render(
      <MemoryRouter initialEntries={[`/system/${id}`]}>
        <Routes>
          <Route path="/system/:systemId" element={<SystemPageV2Screen />} />
        </Routes>
      </MemoryRouter>,
    )

  it('the dataset actually has an ended water event', () => {
    expect(sys, 'no system carries a resolved leak event').toBeTruthy()
  })

  it('chips exactly the rows the predicate matches — no more, no fewer', () => {
    const { container } = mountAt(sys.id)
    const named = tagButtons(container)
      .map((b) => b.getAttribute('aria-label'))
      .sort()
    const expected = qualifying(sys.id)
      .map((e) => `${TAG_CHIP_LABEL} ${e.title}`)
      .sort()
    expect(named).toEqual(expected)

    /* Stated the other way, which is the half that catches an over-broad
       predicate: every row that is NOT water-and-ended is unchipped. On this
       dataset that is every current event — and `_toLifeEventType` rewrites a
       resolved non-water row to valve-resolved / power-restored /
       device-online, none of which starts with 'leak', so the same assertion
       covers them if upstream ever emits one. */
    const unqualified = (getEventsForSystem(sys.id) ?? []).filter(
      (e) => !(e.resolved && String(e.type ?? '').startsWith('leak')),
    )
    for (const e of unqualified) {
      expect(
        named,
        `an unqualified row was chipped: ${e.type} / ${e.title}`,
      ).not.toContain(`${TAG_CHIP_LABEL} ${e.title}`)
    }
  })

  it('an ONGOING water event gets no chip', () => {
    const live = SYSTEMS.find((s) =>
      (getEventsForSystem(s.id) ?? []).some(
        (e) => !e.resolved && String(e.type ?? '').startsWith('leak'),
      ),
    )
    expect(live, 'no system has an ongoing leak').toBeTruthy()
    const { container } = mountAt(live.id)
    const ongoing = (getEventsForSystem(live.id) ?? []).filter(
      (e) => !e.resolved && String(e.type ?? '').startsWith('leak'),
    )
    const named = tagButtons(container).map((b) => b.getAttribute('aria-label'))
    for (const e of ongoing) {
      expect(named).not.toContain(`${TAG_CHIP_LABEL} ${e.title}`)
    }
  })

  it('a NON-WATER event gets no chip', () => {
    const fault = SYSTEMS.find((s) =>
      (getEventsForSystem(s.id) ?? []).some((e) => !String(e.type ?? '').startsWith('leak')),
    )
    expect(fault, 'no system carries a non-water event').toBeTruthy()
    const { container } = mountAt(fault.id)
    const nonWater = (getEventsForSystem(fault.id) ?? []).filter(
      (e) => !String(e.type ?? '').startsWith('leak'),
    )
    const named = tagButtons(container).map((b) => b.getAttribute('aria-label'))
    for (const e of nonWater) {
      expect(
        named,
        `a non-water row was chipped: ${e.type} / ${e.title}`,
      ).not.toContain(`${TAG_CHIP_LABEL} ${e.title}`)
    }
  })

  it('tapping the chip opens the SAME sheet ?action=tag opens', () => {
    /* journeyDeepLinks.dom.test.jsx pins 'Unusual, no issue' as the first
       screen of the event-ended flow, and it is unique across both flows and
       across the page behind the sheet. Same marker here on purpose: if the
       two entry points ever land somewhere different, one of the two tests
       breaks. */
    const { container } = mountAt(sys.id)
    const view = within(document.body)
    expect(view.queryByText('Unusual, no issue'), 'the sheet was already open').toBeNull()

    fireEvent.click(tagButtons(container)[0])

    expect(
      view.queryByText('Unusual, no issue'),
      'the chip should open the event-ended feedback flow',
    ).toBeTruthy()
    expect(
      view.queryByText('Ignore this water event?'),
      'the tag path must not open on the ignore gate',
    ).toBeNull()
  })
})
