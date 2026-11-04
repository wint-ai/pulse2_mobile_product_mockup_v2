// @vitest-environment happy-dom
//
// THE CONCLUDED EVENT — EventFocusOverlay's third branch.
//
// An ended water event is TOMBSTONED: applyPushEvent writes
// `{ phase:'ended', resolved:true }` (pushEvents.js:132-144) and
// applySimOverlay then nulls `system.alert` (systems.js:191-194). The overlay
// resolved `alert ?? system.alert ?? null` and returned null for that, so it
// had no concluded-event layout at all — which is one cause with three
// symptoms the owner reported separately:
//
//   1. "View" on the End-of-Leak push appeared to do nothing. SystemPageV2Screen
//      gated ?focus=event on `Boolean(system.alert)` precisely because opening
//      an overlay that paints nothing is worse than not navigating.
//   2. The feedback sheet was asked for as "an overlay on the event screen",
//      and there was no event screen to overlay once the event had ended.
//   3. Event history had nowhere to send a reader who wanted a past event.
//
// WHERE THE DATA COMES FROM, which is the thing this file pins hardest,
// because it is the decision everything else rests on. Two sources, in the
// order the "pusher owns truth" rule (incidents.js:14-21) already imposes
// everywhere else:
//
//   A. THE TOMBSTONED SIM RECORD, when the pusher has touched the system. It
//      is the SAME record the live branch was reading one push earlier, so the
//      concluded card is built from the same fields the live card was.
//   B. THE SYSTEM'S OWN CLOSED INCIDENT otherwise — generateIncidents builds
//      one for every system, and generateEvents builds the matching
//      HISTORY_EVENTS row off the same `resolvedVariant` seed, so the steps
//      and the figures describe one event. That row is also what
//      /events/system/:systemId lists, which is symptom 3's answer.
//
// Fixtures come OUT of the live dataset, never hard-coded, so a dataset
// refresh cannot make any of this vacuous.

import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, cleanup, screen, within, act, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { UserProvider } from '@/context/UserContext'
import PushNotifications from '@/components/PushNotifications'
import EventFocusOverlay from '@/v2/components/EventFocusOverlay'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import { SYSTEMS } from '@/data/systems'
import { PUSH_CATALOG } from '@/data/pushCatalog'
import { firePushCard } from '@/lib/pushSimFire'
import { getSimulatedAlert } from '@/data/simulatedAlerts'
import { startInvestigating } from '@/data/investigatingStore'

/* PushNotifications opens the ntfy.sh bridge on mount and happy-dom ships no
   EventSource. Stubbed inert, exactly as pushTagToSheet.dom.test.jsx does —
   the bridge is not what is under test. */
class InertEventSource {
  constructor() { this.readyState = 0 }
  addEventListener() {}
  removeEventListener() {}
  close() {}
}
globalThis.EventSource = globalThis.EventSource || InertEventSource

const WATER = new Set(['leak-high', 'leak-low'])
const LE_01 = PUSH_CATALOG.find(c => c.id === 'LE_01')

const leaky = SYSTEMS.find(s => WATER.has(s.alert?.type) && s.valve)
const faulted = SYSTEMS.find(s => s.alert && !WATER.has(s.alert.type))
/* No live alert — so the only event it has is its own closed one. */
const quiet = SYSTEMS.find(s => !s.alert && s.valve)

/* The sheet's first screen. Same marker pushTagToSheet uses, and for its
   reasons: unique across both feedback flows AND against the page behind it. */
const SHEET_MARKER = 'Unusual, no issue'

const overlayIsOpen = () =>
  Boolean(screen.queryByRole('button', { name: 'Close event' }))

/* Queries scoped to the overlay PANEL, not to the document. The System page
   behind it draws "Ended" itself — it is the badge on every resolved row of
   its own Events Timeline, which is where the word was sourced from — so an
   unscoped queryByText('Ended') matches the page and proves nothing about the
   overlay. The overlay root is the one `role="dialog"` on screen in these
   cases. */
const inOverlay = () => within(screen.getByRole('dialog'))

beforeEach(() => { try { localStorage.clear() } catch { /* ignore */ } })
afterEach(cleanup)

const mountOverlay = sys =>
  render(
    <MemoryRouter>
      <EventFocusOverlay open systemId={sys.id} onClose={() => {}} onIgnore={() => {}} />
    </MemoryRouter>,
  )

const mountPage = (sys, search = '') =>
  render(
    <MemoryRouter initialEntries={[`/system/${sys.id}${search}`]}>
      <Routes>
        <Route path="/system/:systemId" element={<SystemPageV2Screen />} />
      </Routes>
    </MemoryRouter>,
  )

describe('the fixtures exist', () => {
  it('the dataset carries a valved leak, a fault and a quiet valved system', () => {
    expect(leaky, 'SYSTEMS has no valved water event').toBeTruthy()
    expect(faulted, 'SYSTEMS has no fault-only system').toBeTruthy()
    expect(quiet, 'SYSTEMS has no alert-free valved system').toBeTruthy()
    expect(LE_01, 'the push catalog has no End-of-Leak card').toBeTruthy()
  })
})

// ─── 1. THE LAYOUT ──────────────────────────────────────────────────────────

describe('the concluded-event layout', () => {
  it('draws the event, reported as Ended', () => {
    const { container } = mountOverlay(quiet)
    expect(overlayIsOpen()).toBe(true)
    /* "Ended" is sourced, not written for this: SystemPageV2Screen:669 builds
       `{ label: 'Ended', tone: 'ended' }` for a resolved row on this very card
       and EventsTimelineCard's BADGE_TONE.ended carries the same word. */
    expect(within(container).queryByText('Ended')).toBeTruthy()
    /* getLeakState only knows the three ACTIVE states, so without the override
       a finished event would still report "Ongoing". */
    expect(
      within(container).queryByText('Ongoing'),
      'a finished event may not still report itself as ongoing',
    ).toBeNull()
  })

  it('carries the figures a reviewer came for', () => {
    /* The brief's own list: the flow trace, the event facts, duration and
       volume. All four are the alert card's, which is why no fact grid was
       re-added beside it — the card already tiles Flow Rate and Total with
       Duration on its own row, and restating them under a heading is the
       mistake a33aee8 removed the old four-fact strip for.

       Each tile is DROPPED rather than drawn empty when its value is missing
       (AlertCard: `data.total ?` / `data.eventId ?`), so finding the captions
       is proof the concluded source supplied the values. */
    const { container } = mountOverlay(quiet)
    const q = t => within(container).queryByText(t)
    expect(q('Flow Rate'), 'the event ran at a rate').toBeTruthy()
    expect(q('Total'), 'and lost a volume').toBeTruthy()
    expect(q('Duration'), 'over a span').toBeTruthy()
    /* The history row's own display id — the same one
       /events/system/:systemId shows for this event, which is what lets a
       reader who taps a past event there recognise where they landed. */
    expect(q('Event ID'), 'the closed event has an id of record').toBeTruthy()
  })

  it('keeps the sections someone reviewing a finished event wants', () => {
    const { container } = mountOverlay(quiet)
    const q = t => within(container).queryByText(t)
    /* The flow trace, the system's identity, who was told, how to find the
       device, and the event's own timeline. Every one of these is the SAME
       section the live branch draws — this branch reuses them, it does not
       re-implement them. */
    expect(q('Event details'), 'the event-details heading').toBeTruthy()
    expect(q('System details'), 'what leaked and where').toBeTruthy()
    expect(q('Event graph'), 'the flow trace').toBeTruthy()
    expect(q('Who was notified')).toBeTruthy()
    expect(q('Device details')).toBeTruthy()
    expect(q('Events Timeline')).toBeTruthy()
  })

  it('suppresses what is live-only', () => {
    const { container } = mountOverlay(quiet)
    const q = t => within(container).queryByText(t)
    /* ADVICE. Every bullet it returns is an instruction about water that is
       still running. Dropped whole rather than reworded — a rewording would
       be new copy, and this repo writes none. */
    expect(q('What should I do'), 'advice about stopping live water').toBeNull()
    /* THE VALVE. Not just its control: the card carries a live auto-close
       countdown, and counting down on a finished event would be a lie. */
    expect(
      within(container).queryByRole('region', { name: 'Valve status' }),
      'the valve card and its countdown belong to a live event',
    ).toBeNull()
    /* MANAGE EVENT. Ignore is a Warning-state action (PRD 06 + 14) and
       assigning a finished event claims nothing. */
    expect(q('Manage event'), 'no claim/ignore tiles on a finished event').toBeNull()
    expect(q('Assign to me')).toBeNull()
  })

  it('does not offer to hand back a claim left over from when it ran', () => {
    /* The store outlives the event. The strip is who is HANDLING it and the
       way to release it — both live acts. The timeline below still records
       the claim as an "Assigned" step, which is where the history belongs. */
    startInvestigating(quiet.id, { actor: 'Dana Weiss' })
    const { container } = mountOverlay(quiet)
    expect(within(container).queryByText(/Assigned to/)).toBeNull()
    expect(within(container).queryByRole('button', { name: 'Remove' })).toBeNull()
  })
})

// ─── 2. THE DEEP LINK, AFTER A REAL End-of-Leak PUSH ────────────────────────

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

describe('?focus=event after the event has actually ended', () => {
  it('LE_01 tombstones the alert — the precondition, measured not assumed', async () => {
    mountPhone(leaky)
    await act(async () => { firePushCard(LE_01, leaky) })
    await flush()
    const sim = getSimulatedAlert(leaky.id)
    expect(sim?.resolved, 'the push must mark the event resolved').toBe(true)
    expect(sim?.phase).toBe('ended')
    /* And the push's own duration is kept, so the card's Duration row has a
       real figure instead of a blank. */
    expect(sim?.age, 'the ended record carries the push duration').toBeTruthy()
    cleanup()
  })

  it('opens the overlay on the pushed, ended event', async () => {
    mountPhone(leaky)
    await act(async () => { firePushCard(LE_01, leaky) })
    await flush()
    cleanup()

    /* Fresh mount on the deep link the push's View button builds. This is the
       exact case the old guard refused: `system.alert` is null here. */
    mountPage(leaky, '?focus=event')
    expect(overlayIsOpen(), 'View must land inside the ended event').toBe(true)
    expect(inOverlay().queryByText('Ended')).toBeTruthy()
  })
})

// ─── 3. THE FEEDBACK SHEET, OVER THE EVENT ──────────────────────────────────

/* THE PUSH'S CTA, NOT THE TIMELINE'S CHIP. Both read `Tell us more` as of
   2026-11-02: the owner renamed the Events Timeline's Tag chip to match this
   push ("now when you add the close tag, it just confusing because in other
   places it calls tell us more"), and the System page behind the push card
   draws that chip on its ended water row. A bare findByText therefore finds two
   and throws. The chip is the only one inside the card's `data-name="Tag"`
   button, so excluding it names the push's own pill without pinning a class. */
async function pushCta() {
  const hits = await screen.findAllByText('Tell us more')
  const cta = hits.find(el => !el.closest('[data-name="Tag"]'))
  if (!cta) throw new Error('the push card drew no "Tell us more" CTA')
  return cta
}

describe('?action=tag lands on the event, not on the bare System page', () => {
  it('the End-of-Leak push now sends focus=event with the tag link', async () => {
    mountPhone(leaky)
    await act(async () => { firePushCard(LE_01, leaky) })
    await flush()
    const cta = await pushCta()
    await act(async () => { fireEvent.click(cta) })
    await flush()
    const tagged = visited.filter(u => u.includes('action=tag'))
    expect(tagged.length, '"Tell us more" must still deep-link').toBeGreaterThan(0)
    expect(
      tagged.every(u => u.includes('focus=event')),
      'the owner asked for "an overlay on the event screen"',
    ).toBe(true)
  })

  it('the sheet opens WITH the event view beneath it', async () => {
    mountPhone(leaky)
    await act(async () => { firePushCard(LE_01, leaky) })
    await flush()
    const cta = await pushCta()
    await act(async () => { fireEvent.click(cta) })
    await flush()
    expect(
      within(document.body).queryByText(SHEET_MARKER),
      'the feedback sheet must open',
    ).toBeTruthy()
    expect(overlayIsOpen(), 'and the event must be open underneath it').toBe(true)
    /* WHAT THIS CANNOT SEE, stated rather than implied: happy-dom computes no
       layout and does no hit-testing, so "beneath" is pinned as both being
       mounted in the owner's order and not as measured z-order. The sheet is
       `absolute inset-0 z-50` at page level, mounted after the frame root that
       holds the overlay at z-40, and reads nothing outside itself. */
  })
})

// ─── 4. RULE 0 — THE TWO BRANCHES THAT ALREADY WORKED ───────────────────────

describe('the live water branch is unchanged', () => {
  it('still draws the valve card, the advice and the manage-event tiles', () => {
    const { container } = mountOverlay(leaky)
    expect(overlayIsOpen()).toBe(true)
    expect(
      within(container).queryByRole('region', { name: 'Valve status' }),
      'the valve is the main action on a live event',
    ).toBeTruthy()
    expect(within(container).queryByText('What should I do')).toBeTruthy()
    expect(within(container).queryByText('Manage event')).toBeTruthy()
    expect(
      within(container).queryByText('Ended'),
      'a running event is not ended',
    ).toBeNull()
  })
})

describe('the fault branch is unchanged', () => {
  it('opens, and still reaches no water-event flow', () => {
    const { container } = mountOverlay(faulted)
    expect(overlayIsOpen()).toBe(true)
    /* v1's ErrorAlertDetail offers neither Ignore nor On it, and offering
       Ignore on a fault was the v2 bug this surface replaced. */
    expect(within(container).queryByText('Manage event')).toBeNull()
    expect(within(container).queryByText('Events Timeline')).toBeNull()
    expect(within(document.body).queryByText(SHEET_MARKER)).toBeNull()
  })

  it('?focus=event on a fault opens NOTHING — not even a concluded event', () => {
    /* INVERTED 2026-11-03. This asserted that the deep link "still opens the
       fault, never a concluded event"; the owner has since ruled the event
       screen water-only ("not for valve malfunction or disconnection power or
       stuff like that"), so the route is closed and the fault stays on the
       System page. The HALF THAT MATTERS TO THIS FILE is unchanged and is
       what is still pinned below: a fault must not fall through into the
       CONCLUDED layout. Every system carries a closed incident, so a gate
       written as `isWaterEvent(alert) || hasConcludedEvent(id)` would have
       opened last month's leak over a live valve error. The live alert is
       asked first and answers on its own.

       The overlay's own fault branch is NOT retired — it is still reachable
       by mounting the component directly, which the test above does, and
       which is why that one is left alone. What changed is the ROUTE. */
    mountPage(faulted, '?focus=event')
    expect(overlayIsOpen(), 'the event screen is for water events only').toBe(false)
    /* No panel at all, asked the way this file asks it everywhere else.
       NOT `queryByText('Ended')`: the System page behind draws that word
       itself, on every resolved row of its own Events Timeline (see the
       `inOverlay` note above), so an unscoped match would prove nothing. */
    expect(
      screen.queryByRole('dialog'),
      'nothing resolved a concluded event behind the refusal either',
    ).toBeNull()
  })
})
