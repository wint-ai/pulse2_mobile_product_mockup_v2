// @vitest-environment happy-dom
//
// ?focus=event — THE VIEW BUTTON'S DESTINATION.
//
// Owner, 2026-11-02, cutting the push CTA set to two: View "redirect the user
// to the push content". Not the page that contains the event — the event. So
// PushNotifications.jsx:930 navigates to /system/{id}?focus=event and
// SystemPageV2Screen opens EventFocusOverlay on arrival. Until this change
// that overlay existed only behind a tap on an alert card: `eventFocusOpen`
// was local state with no URL behind it, so the param was inert.
//
// Three things are pinned here, and the third is the reason the file exists.
//
//   1. IT OPENS ON A WATER EVENT. The ordinary case.
//
//   2. IT OPENS ON A FAULT. The case with no precedent on this page: the only
//      other deep-link action, ?action=ignore, is gated OUT on a fault because
//      ignoring a device fault was never a feature. View is the opposite rule
//      — "any push notification" has no exceptions, so valve errors, power
//      loss, offline and sensor pushes must all land inside their own event.
//      EventFocusOverlay has a dedicated fault layout for this; what it must
//      NOT do is reach the water-event sheets on the way in.
//
//   3. IT OPENS ON AN EVENT THAT HAS ALREADY ENDED. *** INVERTED 2026-11-02,
//      AND THE INVERSION IS THE POINT OF THE CHANGE. *** This file used to
//      assert the opposite, for a reason that was true when it was written:
//      EventFocusOverlay resolved `alert ?? system.alert ?? null`, returned
//      null when that was empty, and so had no concluded-event layout — the
//      deep link refused to open an overlay that would paint nothing, and the
//      first test below measured that emptiness rather than assuming it.
//
//      It matters because the End-of-Leak push carries ?focus=event like every
//      other push and arrives AFTER the event ended, when `system.alert` is
//      already tombstoned — the same timing the ?action=tag guard is written
//      around. That was precisely the symptom: the user tapped View, the app
//      navigated, and the screen did not change.
//
//      The overlay now HAS that layout, so both halves move together: the
//      measurement below now reads back a rendered concluded event instead of
//      an empty container, and the deep link opens. Neither assertion was
//      deleted — each is pinned on the new behaviour, so a regression in
//      either direction still fails here.
//
// Fixtures come OUT of the live dataset, never hard-coded, so a dataset
// refresh cannot make these vacuous.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import EventFocusOverlay from '@/v2/components/EventFocusOverlay'
import { SYSTEMS } from '@/data/systems'
import { clearIgnored } from '@/data/ignoredIncidents'

afterEach(cleanup)

const WATER = new Set(['leak-high', 'leak-low'])

const leaky = SYSTEMS.find(s => WATER.has(s.alert?.type))
const faulted = SYSTEMS.find(s => s.alert && !WATER.has(s.alert.type))
const unalerted = SYSTEMS.find(s => !s.alert)

const mount = (sys, search = '') =>
  render(
    <MemoryRouter initialEntries={[`/system/${sys.id}${search}`]}>
      <Routes>
        <Route path="/system/:systemId" element={<SystemPageV2Screen />} />
      </Routes>
    </MemoryRouter>,
  )

/* The overlay's scrim carries its own accessible name, separate from the
   header's × ("Close") and its "Back" — so this matches the overlay and
   nothing else on the page. */
const overlayIsOpen = () =>
  Boolean(screen.queryByRole('button', { name: 'Close event' }))

describe('the fixtures exist', () => {
  it('the dataset carries a leak, a fault and an alert-free system', () => {
    // Asserted rather than assumed: if any goes empty the rest proves nothing.
    expect(leaky, 'SYSTEMS has no water event').toBeTruthy()
    expect(faulted, 'SYSTEMS has no fault-only system').toBeTruthy()
    expect(unalerted, 'SYSTEMS has no alert-free system').toBeTruthy()
  })
})

describe('what EventFocusOverlay does with no CURRENT event behind it', () => {
  it('draws the concluded event — the layout the guard was waiting for', () => {
    /* THE MEASUREMENT, RE-TAKEN. It used to read back an empty container and
       that is what the ?focus=event guard was built on; it now reads back a
       rendered event. Still measured and not assumed: the overlay is mounted
       directly, with no page and no deep link in the way, and the DOM is read.

       A system with no live alert still HAS an event to show — its own closed
       incident (generateIncidents.js builds one for every system) and the
       matching HISTORY_EVENTS row. "Ended" is the status the card reports,
       and it is the word SystemPageV2Screen:669 and EventsTimelineCard's
       BADGE_TONE already use for a finished event. */
    const { container } = render(
      <MemoryRouter>
        <EventFocusOverlay open systemId={unalerted.id} onClose={() => {}} />
      </MemoryRouter>,
    )
    expect(container.innerHTML, 'the overlay draws the concluded event').not.toBe('')
    expect(overlayIsOpen()).toBe(true)
    expect(
      within(container).queryByText('Ended'),
      'the card reports the event as ended, not as ongoing',
    ).toBeTruthy()
    expect(
      within(container).queryByText('Ongoing'),
      'nothing on a finished event may still read Ongoing',
    ).toBeNull()
  })
})

describe('?focus=event opens the event itself', () => {
  it('opens the overlay on a water event', () => {
    mount(leaky, '?focus=event')
    expect(overlayIsOpen(), 'View should land inside the event, not beside it').toBe(true)
  })

  it('opens the overlay on a FAULT too — View has no exceptions', () => {
    /* The owner's rule is "any push notification" gets View, and the fault
       pushes (valve error, AC power lost, offline, sensor) are notifications
       like any other. This is the one branch with no precedent on this page:
       ?action=ignore is deliberately gated OUT here, and copying that gate
       onto focus would have left every non-water push with a dead button. */
    mount(faulted, '?focus=event')
    expect(overlayIsOpen(), 'a fault push must still open its own event').toBe(true)
  })

  it('reaches no water-event sheet on the way into a fault', () => {
    /* Rule 0 on the neighbouring guards: opening the overlay on a fault must
       not drag the water-only flows in with it. */
    mount(faulted, '?focus=event')
    expect(
      within(document.body).queryByText('Ignore this water event?'),
      'a device fault is not a water event to ignore',
    ).toBeNull()
    /* 2026-11-02: the event-ended flow's question is retired; its first
       screen is the five verdicts. The guard is the same guard — the water
       sheet must not reach a device fault — pinned on what it now draws. */
    expect(
      within(document.body).queryByText('Unusual, no issue'),
      'the water-event sheet must not open on a device fault',
    ).toBeNull()
  })

  it('opens when the event is already over — the End-of-Leak case', () => {
    /* INVERTED, NOT DELETED — see item 3 in the header. `system.alert` is null
       by the time this push is tapped, which is exactly when View used to do
       nothing visible. The overlay now draws the concluded event, so the
       second half of the ?focus=event guard came off with the reason for it.

       Its sibling is kept word for word: the page itself must still render
       underneath, because a broken overlay that takes the page with it is the
       failure neither version of this test would otherwise catch. */
    const { container } = mount(unalerted, '?focus=event')
    expect(overlayIsOpen(), 'View must land inside the ended event').toBe(true)
    expect(container.firstChild, 'the system page should still render').toBeTruthy()
  })

  it('does not open the overlay without the param', () => {
    mount(leaky)
    expect(overlayIsOpen()).toBe(false)
  })

  it('ignores an unrecognised focus value', () => {
    mount(leaky, '?focus=banana')
    expect(overlayIsOpen()).toBe(false)
  })

  it('strips the param so a refresh does not re-open what was dismissed', () => {
    // The same contract ?action= and ?pulse= have always had here.
    mount(leaky, '?focus=event')
    expect(window.location.search).not.toContain('focus=')
  })
})

describe('?focus=event leaves the existing deep links alone', () => {
  it('still opens the feedback question when tag rides along with it', () => {
    /* Rule 0. The two params are independent and must both be honoured in one
       arrival: the End-of-Leak push now sends BOTH (PushNotifications'
       'tag' branch), so the sheet lands on top of the event rather than on a
       bare System page. The overlay's half of that is asserted here; the
       layering itself is not something happy-dom can see, so what is pinned
       is that both are mounted and in the owner's required order. */
    mount(unalerted, '?action=tag&focus=event')
    expect(
      within(document.body).queryByText('Unusual, no issue'),
      'the end-of-leak tag link must still land',
    ).toBeTruthy()
    expect(overlayIsOpen(), 'and the event is now open underneath it').toBe(true)
  })

  it('still opens the ignore flow when ignore rides along with it', () => {
    // The ignore flow declines to open on an already-ignored system, so the
    // store is cleared first rather than trusted — journeyDeepLinks does the
    // same for the same reason.
    clearIgnored(leaky.id)
    mount(leaky, '?action=ignore&focus=event')
    expect(
      within(document.body).queryByText('Ignore this water event?'),
      'the ignore flow should open on arrival',
    ).toBeTruthy()
    expect(overlayIsOpen(), 'and the event opens underneath it').toBe(true)
  })
})
