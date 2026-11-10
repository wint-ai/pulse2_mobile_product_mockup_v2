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
import { ignoreIncident } from '@/data/ignoredIncidents'

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

  /* ── WHERE "Ended" SITS — 2026-11-10 ────────────────────────────────────
     The assertion above only asks that the word is on the screen somewhere,
     which it was when AlertCard drew it and still is now that the hero mark
     does. This one pins WHICH node, because the owner's ruling is about the
     layout and not about the word: the ended state draws the same hero mark
     and stat block the live and ignored states draw, with the existing pill
     moved into the mark's `status` slot. If a later pass moves the pill back
     into a card, the layouts fork again and this fails. */
  it('draws the frame’s hero mark and tiles, with Ended in the mark', () => {
    const { container } = mountOverlay(quiet)
    const mark = container.querySelector('[data-node-id="200067:37406"]')
    expect(mark, 'the hero mark').toBeTruthy()
    expect(container.querySelector('[data-node-id="200067:37413"]'), 'the stat block').toBeTruthy()
    expect(
      container.querySelector('[data-node-id="199683:24869"]'),
      'the ended event is still drawing the superseded bordered card',
    ).toBeNull()
    expect(mark.querySelector('[data-node-id="199683:24876"]').textContent).toBe('Ended')
  })

  /* A live event's row carries `status: 'Ongoing'` and the frame draws no
     pill for it, so the slot must stay EMPTY on the other two states — which
     is what keeps them pixel-identical to before this change. The live case
     is pinned in eventFocusOverlay.dom.test.jsx beside the ignored one; here
     it is the fixture that proves the gate is `isEnded` and not "always". */
  it('spends no status slot on an event that has not ended', () => {
    const { container } = mountOverlay(leaky)
    const mark = container.querySelector('[data-node-id="200067:37406"]')
    expect(mark, 'the hero mark').toBeTruthy()
    expect(
      mark.querySelector('[data-node-id="199683:24876"]'),
      'a running event grew a status pill',
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

/* ── WHERE `ignored-overlay` LIVES NOW — 2026-11-10 ────────────────────────
   THE LAYOUT RULING MOVED IT. On 2026-11-10 the owner ruled that a state is a
   state of one page ("ignored is just a state of the same page ... layout
   needs to be always the same in all screens"), and an IGNORED LIVE event
   stopped drawing AlertCard: it draws the frame's hero mark + stat block, the
   same block a live event draws. AlertCard's `ignored-overlay` shell is NOT
   deleted — 199772:144341 is a real drawing of a real state — and this is the
   branch that still reaches it: an event that is BOTH ignored and ENDED.

   WHY ENDED STILL CARRIES THE CARD AT ALL, and this is the one place that
   change deliberately STOPPED rather than unified: a concluded row carries
   `status: 'Ended'`, and AlertCard's status pill is the only thing on this
   surface that says the event is over (the test above pins exactly that).
   The hero mark has no status slot; giving it one would invent a slot for a
   state no frame covers, and writing "Event Ended" into the ignored strip
   would invent a string. Both are Rule 0 / no-invented-state-labels. It is an
   OPEN QUESTION for the owner, not a settled design — and the moment they say
   where "Ended" goes, the component's gate loses its `&& !isEnded` and this
   test is the one that will notice. */
describe('an ignored AND ended event draws the unified block too', () => {
  /* ── REWRITTEN 2026-11-10, AND THE FAILURE WAS THE POINT ────────────────
     This test was the tripwire the note above promised ("the moment they say
     where 'Ended' goes, the component's gate loses its `&& !isEnded` and this
     test is the one that will notice"). The owner has ruled, the gate has
     lost it, and this file fired exactly as designed.

     WHAT IT USED TO ASSERT, kept verbatim so the swap is auditable:

       describe('an ignored AND ended event keeps the ignored-overlay shell')
         it('draws the card, its ignored shell, and the Event Ignored strip')
           expect(container.querySelector('[data-node-id="199772:144519"]'),
             'the ignored-overlay shell became unreachable').toBeTruthy()
           expect(container.querySelector('[data-node-id="200067:37406"]'),
             'the ended branch quietly adopted the hero mark and dropped the
              Ended pill').toBeNull()

     Both are now inverted, and the second one's WORRY is what this version
     pins instead: the hero mark was adopted, and the Ended pill was NOT
     dropped — it moved into the mark's new `status` slot. That is the whole
     of the owner's ruling, and it is asserted positively below rather than
     left to the absence of the card. */
  it('draws the hero mark and the stat block, not the ignored-overlay card', () => {
    ignoreIncident(quiet.id, { ignoredBy: 'Marcus Ellery' })
    const { container } = mountOverlay(quiet)
    expect(overlayIsOpen()).toBe(true)
    expect(container.querySelector('[data-node-id="200067:37406"]'), 'the hero mark').toBeTruthy()
    expect(container.querySelector('[data-node-id="200067:37413"]'), 'the stat block').toBeTruthy()
    /* 199772:144519 is AlertCard's own marker for the overlaid shell. */
    expect(
      container.querySelector('[data-node-id="199772:144519"]'),
      'the ignored+ended event is still drawing the superseded bordered card',
    ).toBeNull()
    /* The strip is unmoved — it is still a scroller child at the gutter,
       where 199755:33270 puts it. Only the thing beside it changed. */
    const strip = container.querySelector('[data-node-id="199755:29744"]')
    expect(strip, 'the Event Ignored strip').toBeTruthy()
    expect(strip.textContent).toBe('Event Ignored')
  })

  /* THE THING THE OLD TEST WAS PROTECTING. It would not let the ended branch
     adopt the hero mark because doing so dropped the only statement on the
     screen that the event is over. It is not dropped; this is where it went,
     and this assertion is what stops it being lost in some later pass. */
  it('still says the event is over, from inside the hero mark', () => {
    ignoreIncident(quiet.id, { ignoredBy: 'Marcus Ellery' })
    const { container } = mountOverlay(quiet)
    const mark = container.querySelector('[data-node-id="200067:37406"]')
    const pill = mark.querySelector('[data-node-id="199683:24876"]')
    expect(pill, 'the Ended pill is not in the hero mark').toBeTruthy()
    /* THE EXACT STRING, not a match. "Ended" already ships — it is
       SystemPageV2Screen:669's label for a resolved row and
       EventsTimelineCard's BADGE_TONE.ended — and the ruling turned on the
       pill reusing it rather than anything new being written. A regex here
       would let "Event Ended" or "Ended 3d ago" through, and either would be
       the invented state label wint-ui-copy forbids. */
    expect(pill.textContent).toBe('Ended')
    /* And it is the ONLY one, on a screen that no longer draws the card. */
    expect(within(container).queryAllByText('Ended')).toHaveLength(1)
  })

  /* ── RULE 0: WHERE `ignored-overlay` WENT ───────────────────────────────
     It is NOT deleted — AlertCard.jsx still carries it and this change edited
     no line of that file. What changed is which events reach it. `ignored` on
     this surface is `isWater && isIgnored(id)`, and the water branch now
     draws the unified block in every one of its three states, so no WATER
     event reaches the shell any more.

     THE PATH THAT REMAINS is a FAULT on a system that also carries an ignore:
     `alertRow.ignored` is `isIgnored(systemId)` read straight off the store
     (eventAlertRow.js:238) with no water gate of its own, while the call site
     picks the variant from that field. Pinned here so the claim is measured
     rather than asserted in a comment — and FLAGGED in the report, because a
     fault wearing an ignored shell because of a previous WATER event is odd
     on its face and is the owner's call, not this change's. */
  it('leaves ignored-overlay reachable — by a fault on an ignored system', () => {
    ignoreIncident(faulted.id, { ignoredBy: 'Marcus Ellery' })
    const { container } = mountOverlay(faulted)
    expect(overlayIsOpen()).toBe(true)
    expect(
      container.querySelector('[data-node-id="199772:144519"]'),
      'the ignored-overlay shell is now unreachable from anywhere',
    ).toBeTruthy()
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
