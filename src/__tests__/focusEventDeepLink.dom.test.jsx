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
//   3. IT DOES NOT OPEN WHEN THERE IS NO EVENT, because the overlay would
//      paint nothing. This was measured rather than assumed — the first test
//      below mounts the overlay directly on an alert-free system and reads
//      what comes out. EventFocusOverlay resolves `alert ?? system.alert ??
//      null` and returns null when that is empty (EventFocusOverlay.jsx:1300):
//      it has no concluded-event layout. It matters because the End-of-Leak
//      push carries ?focus=event like every other push and arrives AFTER the
//      event ended, when `system.alert` can already be null — the same timing
//      the ?action=tag guard is written around. Opening there would navigate
//      the user to a screen that does not visibly change. Landing on the
//      system page instead is strictly better, and that is what is asserted.
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

describe('what EventFocusOverlay does with no event behind it', () => {
  it('renders NOTHING — it has no concluded-event layout', () => {
    /* THE MEASUREMENT THE GUARD IS BUILT ON. Not "renders an empty shell" and
       not "throws": `evt` resolves to null and the component returns null
       before it paints, so the host gets an empty container. An overlay that
       is "open" over this would be invisible, which is why the deep link
       refuses to open it. If this test ever fails because the overlay grew a
       real concluded-event view, the right fix is to DROP the `system.alert`
       half of the ?focus=event guard — not to patch this expectation. */
    const { container } = render(
      <MemoryRouter>
        <EventFocusOverlay open systemId={unalerted.id} onClose={() => {}} />
      </MemoryRouter>,
    )
    expect(container.innerHTML, 'the overlay paints nothing without an event').toBe('')
    expect(overlayIsOpen()).toBe(false)
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
    expect(
      within(document.body).queryByText('Was this worth alerting about?'),
      'the water question must not be asked about a device fault',
    ).toBeNull()
  })

  it('does NOT open when the event is already over — it lands on the page', () => {
    /* The End-of-Leak case. `system.alert` is null by the time the push is
       tapped, the overlay would paint nothing, so the user lands on the
       system page — which does still show the ended event in its own
       timeline. Strictly better than an invisible overlay. */
    const { container } = mount(unalerted, '?focus=event')
    expect(overlayIsOpen(), 'an empty overlay must not be opened').toBe(false)
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
    /* Rule 0. The two params are independent: the End-of-Leak push may carry
       both, and adding focus must not have swallowed the tag branch. On an
       alert-free system tag still opens (that is its narrower guard, written
       for exactly this push) and focus still declines. */
    mount(unalerted, '?action=tag&focus=event')
    expect(
      within(document.body).queryByText('Was this worth alerting about?'),
      'the end-of-leak tag link must still land',
    ).toBeTruthy()
    expect(overlayIsOpen()).toBe(false)
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
