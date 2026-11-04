// @vitest-environment happy-dom
//
// THE EVENT SCREEN IS FOR WATER EVENTS ONLY — owner, 2026-11-03, on a
// screenshot of this screen rendering a valve malfunction:
//
//   "How could this option available this screen and flow is also for water
//    events like high flow event, low flow event, flood detector event, not
//    for valve malfunction or disconnection power or stuff like that. This is
//    not a possible option. I want to make sure this is not"
//
// THIS IS THE SECOND REVERSAL OF THIS BEHAVIOUR IN TWO DAYS. On 2026-11-02 the
// opposite was required — View "redirect the user to the push content", with
// "any push notification" explicitly admitting no exceptions — and
// focusEventDeepLink.dom.test.jsx asserted the fault case in those words. Both
// the old reasoning and the new rule are kept in SystemPageV2Screen's note on
// ?focus=event; this file pins the behaviour.
//
// WHAT REPLACED IT, and it is the owner's choice rather than an invention: a
// FAULT PUSH ROUTES TO THE SYSTEM PAGE. The link PushNotifications builds is
// unchanged; the destination declines to open the overlay and leaves the user
// on /system/:id, which already renders faults. So every assertion about a
// fault below has TWO halves — the overlay does not open, AND the page the
// user is left on is a real page. "Does not open" alone would be satisfied by
// a blank screen, which is the other half of the reported bug.
//
// WHY A FILE OF ITS OWN: the rule is not a property of the deep link, it is a
// property of the SURFACE, and a guard on one door and not the others is the
// bug restated. All four doors are driven here:
//
//   1. ?focus=event          — the View button on every push
//   2. the alert card tap    — pointer
//   3. its keyboard proxy    — the transparent <button> beside the card
//   4. the Events Timeline row drill-down
//
// AND THE CONCLUDED PATH MUST SURVIVE. The End-of-Leak push carries
// ?focus=event and arrives AFTER the event ended, when `system.alert` has
// already been tombstoned to null (systems.js:191-194). A gate written as
// `Boolean(system.alert)` re-breaks it; a gate written as
// `isWaterEvent(alert) || hasConcludedEvent(id)` re-admits every fault, since
// generateIncidents builds one closed incident for EVERY system. The live
// alert has to be asked first. Both halves are measured below.
//
// Fixtures come OUT of the live dataset, never hard-coded.

import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, cleanup, screen, within, act, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { UserProvider } from '@/context/UserContext'
import PushNotifications from '@/components/PushNotifications'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import { SYSTEMS } from '@/data/systems'
import { PUSH_CATALOG } from '@/data/pushCatalog'
import { firePushCard } from '@/lib/pushSimFire'
import { getSimulatedAlert } from '@/data/simulatedAlerts'

/* PushNotifications opens the ntfy.sh bridge on mount and happy-dom ships no
   EventSource. Stubbed inert, exactly as pushTagToSheet.dom.test.jsx does. */
class InertEventSource {
  constructor() { this.readyState = 0 }
  addEventListener() {}
  removeEventListener() {}
  close() {}
}
globalThis.EventSource = globalThis.EventSource || InertEventSource

const WATER = new Set(['leak-high', 'leak-low'])

const liveWater = SYSTEMS.find(s => WATER.has(s.alert?.type))
const faulted = SYSTEMS.find(s => s.alert && !WATER.has(s.alert.type))
/* No live alert at all, so its only event is its own closed one — the shape
   the End-of-Leak push leaves behind. */
const quiet = SYSTEMS.find(s => !s.alert)
/* The push fixtures need a valve for V_ER to be eligible. */
const faultedValve = SYSTEMS.find(s => s.alert && !WATER.has(s.alert.type) && s.valve != null)
const leakyForPush = SYSTEMS.find(s => WATER.has(s.alert?.type) && s.valve != null)

const LE_01 = PUSH_CATALOG.find(c => c.id === 'LE_01')
const V_ER = PUSH_CATALOG.find(c => c.id === 'V_ER')

beforeEach(() => { try { localStorage.clear() } catch { /* ignore */ } })
afterEach(cleanup)

/* The overlay scrim carries its own accessible name, separate from the
   header close control, so this matches the overlay and nothing else. */
const overlayIsOpen = () =>
  Boolean(screen.queryByRole('button', { name: 'Close event' }))

const mount = (sys, search = '') =>
  render(
    <MemoryRouter initialEntries={[`/system/${sys.id}${search}`]}>
      <Routes>
        <Route path="/system/:systemId" element={<SystemPageV2Screen />} />
      </Routes>
    </MemoryRouter>,
  )

/** The alert card keyboard proxy — `Open <event title>`. */
const cardOpeners = () => screen.queryAllByRole('button', { name: /^Open / })
/** Every Events Timeline row drill control the page drew, in row order. */
const rowDrills = (container) => [...container.querySelectorAll('[data-name="Open event"]')]

describe('the fixtures exist', () => {
  it('the dataset carries a live leak, a fault and an alert-free system', () => {
    // Asserted rather than assumed: if any goes empty the rest proves nothing.
    expect(liveWater, 'SYSTEMS has no live water event').toBeTruthy()
    expect(faulted, 'SYSTEMS has no fault-only system').toBeTruthy()
    expect(quiet, 'SYSTEMS has no alert-free system').toBeTruthy()
    expect(faultedValve, 'SYSTEMS has no fault-only system with a valve').toBeTruthy()
    expect(leakyForPush, 'SYSTEMS has no leaking system with a valve').toBeTruthy()
    expect(V_ER, 'the push catalog has no valve-error card').toBeTruthy()
    expect(LE_01, 'the push catalog has no End-of-Leak card').toBeTruthy()
  })
})

// ─── DOOR 1: ?focus=event ───────────────────────────────────────────────────

describe('door 1 — the ?focus=event deep link', () => {
  it('opens on a LIVE water event', () => {
    mount(liveWater, '?focus=event')
    expect(overlayIsOpen(), 'a live leak is exactly what this screen is for').toBe(true)
  })

  it('opens on a CONCLUDED water event — the End-of-Leak timing', () => {
    /* `system.alert` is null here, which is the state the End-of-Leak push
       lands in. The gate must fall through to the overlay own concluded
       resolver rather than reading `Boolean(system.alert)` and refusing. */
    const { container } = mount(quiet, '?focus=event')
    expect(overlayIsOpen(), 'View must still land inside an ended event').toBe(true)
    expect(container.firstChild, 'and the system page must still render').toBeTruthy()
  })

  it('does NOT open on a device fault', () => {
    mount(faulted, '?focus=event')
    expect(
      overlayIsOpen(),
      'a valve error / power loss / offline is not a water event',
    ).toBe(false)
  })

  it('leaves the fault on a usable System page, not a blank one', () => {
    /* THE HALF THAT IS EASY TO FORGET. The owner replacement behaviour is
       "route to the System page", and the System page is where a fault is
       already reported. If closing the route produced an empty screen the
       bug would simply have moved. */
    const { container } = mount(faulted, '?focus=event')
    expect(container.firstChild, 'the system page must render').toBeTruthy()
    expect(
      /* queryAllByText: the page prints the system name more than once
         (the header bar and the breadcrumb), which is a page that rendered,
         not an ambiguity to resolve. */
      screen.queryAllByText(faulted.name).length,
      'the user is left on the fault system own page, named',
    ).toBeGreaterThan(0)
    expect(
      screen.queryByText('Events Timeline'),
      'with the card that reports the fault still on it',
    ).toBeTruthy()
  })

  it('reaches no water-event flow on a fault', () => {
    mount(faulted, '?focus=event')
    expect(
      within(document.body).queryByText('Ignore this water event?'),
      'a device fault is not a water event to ignore',
    ).toBeNull()
    expect(
      within(document.body).queryByText('Unusual, no issue'),
      'and the feedback flow is water-only too',
    ).toBeNull()
  })

  it('still strips the param on a refusal, as it does on an open', () => {
    /* The param contract is unchanged — the overlay declines, the URL is
       still cleaned, so a refresh cannot replay a link that did nothing. */
    mount(faulted, '?focus=event')
    expect(window.location.search).not.toContain('focus=')
  })
})

// ─── DOOR 2 + 3: the alert card, pointer and keyboard ───────────────────────

describe('doors 2 and 3 — the alert card and its keyboard proxy', () => {
  it('a water event draws a tappable card that opens the event', () => {
    mount(liveWater)
    const openers = cardOpeners()
    expect(openers.length, 'the live water card is the original way in').toBeGreaterThan(0)
    fireEvent.click(openers[0])
    expect(overlayIsOpen()).toBe(true)
  })

  it('the pointer tap on the card body opens it too', () => {
    const { container } = mount(liveWater)
    const card = container.querySelector('[data-node-id="198379:80460"] > div')
    expect(card, 'the carousel drew no card wrapper to tap').toBeTruthy()
    fireEvent.click(card)
    expect(overlayIsOpen()).toBe(true)
  })

  it('a fault draws no alert card at all, so neither door exists', () => {
    /* The gate here is upstream, in `alertCardsFor` — owner, 2026-10-18:
       "only water events shall appear here in this card / not others." The
       openers still carry `eventFocusAllowed` belt-and-braces; what is pinned
       is the outcome, which is that there is nothing on a fault page to tap
       into the event screen. */
    const { container } = mount(faulted)
    expect(cardOpeners().length, 'a fault must offer no card to open').toBe(0)
    expect(
      container.querySelector('[data-node-id="198379:80460"] > div'),
      'and no card body to tap either',
    ).toBeNull()
    expect(overlayIsOpen()).toBe(false)
  })
})

// ─── DOOR 4: the Events Timeline row drill-down ─────────────────────────────

describe('door 4 — the Events Timeline row drill-down', () => {
  it('a water row still drills into the event', () => {
    const { container } = mount(liveWater)
    const drills = rowDrills(container)
    expect(drills.length, 'the timeline must still offer the drill-down').toBeGreaterThan(0)
    fireEvent.click(drills[0])
    expect(overlayIsOpen()).toBe(true)
  })

  it('a FAULTING system offers no drill-down on its ended water row', () => {
    /* THE SUBTLE ONE, and the reason the mapper gate changed rather than only
       the handler. A faulting system still HAS a closed water incident —
       generateIncidents builds one for every system — so the ended water row
       is still drawn and `hasConcludedEvent` is still true for it. Under the
       old gate that row kept its chevron, and the new handler would then have
       refused the tap: a control that visibly does nothing, which is the
       exact defect the drill-down was built to avoid. A row must not
       advertise a tap the surface will not honour. */
    const { container } = mount(faulted)
    expect(rowDrills(container).length, 'a faulting system opens no event screen').toBe(0)
  })

  it('an alert-free system still drills into its concluded event', () => {
    /* The fault gate must not catch the ordinary ended-event case with it. */
    const { container } = mount(quiet)
    const drills = rowDrills(container)
    expect(drills.length, 'an ended water event is still reachable').toBeGreaterThan(0)
    fireEvent.click(drills[0])
    expect(overlayIsOpen()).toBe(true)
  })
})

// ─── THE PUSH ITSELF, DRIVEN ────────────────────────────────────────────────

/* Every URL the router passed through, in order. The System page STRIPS its
   own params on arrival, so recording them as they go by is the only way to
   see which deep link a tap actually produced. */
let visited = []
function LocationProbe() {
  const loc = useLocation()
  useEffect(() => { visited.push(loc.pathname + loc.search) }, [loc])
  return null
}

function mountPhone(sys) {
  visited = []
  return render(
    <UserProvider>
      <MemoryRouter initialEntries={[`/system/${sys.id}`]}>
        <PushNotifications>
          <LocationProbe />
          <Routes>
            <Route path="/system/:systemId" element={<SystemPageV2Screen />} />
          </Routes>
        </PushNotifications>
      </MemoryRouter>
    </UserProvider>,
  )
}

const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })

describe('the push CTA, driven rather than assumed', () => {
  it('View on a FAULT push still links to ?focus=event, and lands on nothing', async () => {
    /* THE LINK IS NOT WHAT CHANGED. PushNotifications still builds
       /system/{id}?focus=event for every push — "any push notification" gets
       View, and the owner did not take the button away, he took the
       DESTINATION away. So this pins both halves at once: the URL is still
       produced, and the page it reaches declines to open the event screen. */
    mountPhone(faultedValve)
    await act(async () => { firePushCard(V_ER, faultedValve) })
    await flush()

    const view = await screen.findAllByText('View')
    await act(async () => { fireEvent.click(view[0]) })
    await flush()

    expect(
      visited.filter(u => u.includes('focus=event')).length,
      'the push contract is unchanged — View still deep-links to the event',
    ).toBeGreaterThan(0)
    expect(
      overlayIsOpen(),
      'but a fault must land on the System page, not on the event screen',
    ).toBe(false)
    expect(
      screen.queryAllByText(faultedValve.name).length,
      'and it must land on a real page',
    ).toBeGreaterThan(0)
  })

  it('the End-of-Leak push still opens its concluded event — NOT re-broken', async () => {
    /* THE REGRESSION THIS WHOLE FILE IS MOST AT RISK OF CAUSING. LE_01 marks
       the event resolved and applySimOverlay tombstones `system.alert` to
       null, so a water-only gate written on the live alert alone refuses the
       very push it was meant to serve. Driven through the simulator, not
       asserted on a hand-built fixture. */
    mountPhone(leakyForPush)
    await act(async () => { firePushCard(LE_01, leakyForPush) })
    await flush()
    expect(getSimulatedAlert(leakyForPush.id)?.resolved, 'precondition').toBe(true)
    cleanup()

    mount(leakyForPush, '?focus=event')
    expect(
      overlayIsOpen(),
      'the ended water event must still open — this is the End-of-Leak push',
    ).toBe(true)
  })
})
