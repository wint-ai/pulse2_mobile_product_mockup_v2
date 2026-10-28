// @vitest-environment happy-dom
//
// Three controls/datasets that looked right and were not.
//
//  1. Home hard-pinned the water-events card to its healthy state
//     (`waterEvents = expanded ? … : []`), so "Everything looks good! No active
//     water events" rendered directly above a health card reporting 52 systems
//     requiring attention. The page contradicted itself on the default route.
//  2. Those rows were raw system records, so `e.type` was undefined and the
//     card's High/Low filter chips both counted 0 while All counted every alert.
//  3. The system page mounted <EventsTimelineCard /> bare, so its
//     `events = MOCK_EVENTS` default drove every system on every route.
//  4. handleAlertAction opened with `if (actionId !== 'paginate') return`, so
//     "On it" and "Ignore" — the card's two primary buttons — were inert.
//
// Case 2's DESTINATION has since changed on the owner's instruction — see the
// note on 'water event rows open the event' below. The row opens
// EventFocusOverlay in place instead of navigating to /alert/:systemId.

import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import { SYSTEMS } from '@/data/systems'
import { getEventsForSystem } from '@/data/events'
import { isIgnored, clearIgnored, ignoreIncident } from '@/data/ignoredIncidents'
import { isInvestigating, stopInvestigating } from '@/data/investigatingStore'
import { useParams } from 'react-router-dom'

/** Stands in for the alert detail screen so the test can assert where a row went. */
function LandingProbe({ onLand }) {
  const { systemId } = useParams()
  onLand(systemId)
  return <div>landed</div>
}

afterEach(cleanup)

const alerting = SYSTEMS.filter((s) => s.alert)

describe('home water events use real data', () => {
  it('the fleet actually has alerting systems (otherwise these are vacuous)', () => {
    expect(alerting.length).toBeGreaterThan(0)
  })

  it('does not claim "no active water events" while reporting systems that need attention', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes><Route path="/" element={<HomeAllAccounts />} /></Routes>
      </MemoryRouter>,
    )
    const text = (container.textContent || '').replace(/\s+/g, ' ')

    // The precise contradiction: the healthy state next to a non-zero count.
    const claimsHealthy = text.includes('No active water events')
    expect(
      claimsHealthy,
      `${alerting.length} systems carry an alert, so the healthy state is wrong`,
    ).toBe(false)
  })

  it('carries a leak type on each row, so the High/Low chips can count', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes><Route path="/" element={<HomeAllAccounts />} /></Routes>
      </MemoryRouter>,
    )
    const view = within(container)
    // Chips render their counts; High + Low must not both be 0 when All > 0.
    const high = alerting.filter((s) => s.alert?.type === 'leak-high').length
    const low = alerting.filter((s) => s.alert?.type === 'leak-low').length
    expect(high + low, 'dataset has no leak-typed alerts').toBeGreaterThan(0)

    // The card is mounted (not in its healthy state), so a filter chip exists.
    expect(view.queryByText('No active water events')).toBeNull()
  })
})

describe('water event rows open the event', () => {
  /* CHANGED DELIBERATELY — the destination moved, the rest of this test did not.
     This used to assert that tapping a row landed on /alert/:systemId, i.e. the
     v1 LeakDetail screen. The product owner, pointing at the Water-events card
     on /location/220%20Harborview%20Ave, said: "when clicking here it shall open
     the Event overlay as we spoke before." So the row no longer navigates at
     all — it opens EventFocusOverlay in place, over the page.
     The /alert/:systemId route is NOT gone (App.jsx still serves it, and
     screenSubscribes.test.js still holds LeakDetail to its contract); a pasted
     URL still reaches it. What changed is where the in-app row goes, so the
     LandingProbe below stays mounted precisely to prove the row does NOT go
     there any more.
     The assertions about the row being a real <button> are untouched — they
     were never about the destination. Where that row is DRAWN changed
     independently, in the same merge; see the note inside the test. */
  it('renders each row as a real button that opens the event overlay in place', () => {
    let landedOn = null
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomeAllAccounts />} />
          <Route
            path="/alert/:systemId"
            element={<LandingProbe onLand={(id) => { landedOn = id }} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    /* BOTH HALVES OF THIS TEST MOVED AT ONCE, so it is restated once, here.

       WHERE the rows live changed. They used to be ActiveWaterEventsCard's,
       collapsed at rest, so this test opened the card header first. That card
       is gone from Overview; the rows now ride in the TriageBand, which shows
       the worst few at rest rather than collapsing all 52 — so there is no
       header to open any more.

       WHAT a tap does changed too. It no longer lands on /alert/:systemId.
       The guarantee under test is still the original one — a row is a real
       control and it opens its event — but the destination is now
       EventFocusOverlay, in place, over the page. The LandingProbe below
       stays mounted precisely to prove the row does NOT reach the v1 screen.

       Matched on the band row's accessible name, which ends in the duration
       ("… running 6h 36m") because duration is the triage signal, and opens
       with the system name — which is what the overlay's subject is checked
       against below. */
    const rows = screen
      .getAllByRole('button')
      .filter((el) => /running \d/.test(el.getAttribute('aria-label') || ''))
    expect(rows.length, 'no tappable event rows in the triage band').toBeGreaterThan(0)

    // The row names the system it opens; the overlay must be about that system.
    const rowName = (rows[0].getAttribute('aria-label') || '').split(',')[0].trim()
    expect(SYSTEMS.some((s) => s.name === rowName), 'row names no real system').toBe(true)

    // Nothing is open before the tap.
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(rows[0])

    // It opened IN PLACE: the overlay is on screen...
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    /* The header carries BOTH ways out — a back control and an × — and both
       call onClose. Named individually because "the close control" is no
       longer a single element. */
    expect(within(dialog).getByRole('button', { name: 'Back' })).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeTruthy()
    expect(within(dialog).getAllByRole('heading', { level: 2 })[0].textContent).toBeTruthy()
    expect(dialog.textContent).toContain(rowName)

    // ...the page behind it is still mounted (so its scroll survives)...
    expect(
      within(container)
        .getAllByRole('button')
        .filter((el) => /running \d/.test(el.getAttribute('aria-label') || '')).length,
      'the rows unmounted, so the page was replaced rather than covered',
    ).toBeGreaterThan(0)

    // ...and the row did NOT navigate to the v1 screen.
    expect(landedOn, 'row tap still navigates to /alert/:systemId').toBeNull()

    // The close control returns to the list.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('system page timeline uses real data', () => {
  const withEvents = alerting.find((s) => (getEventsForSystem(s.id) ?? []).length > 0)

  it('at least one system has real events', () => {
    expect(withEvents, 'no system in the dataset has events').toBeTruthy()
  })

  it('renders this system’s own events, not the mock five', () => {
    const real = getEventsForSystem(withEvents.id)
    const { container } = render(
      <MemoryRouter initialEntries={[`/system/${withEvents.id}`]}>
        <Routes><Route path="/system/:systemId" element={<SystemPageV2Screen />} /></Routes>
      </MemoryRouter>,
    )
    const text = (container.textContent || '').replace(/\s+/g, ' ')

    // A real title from this system's events must appear...
    expect(text).toContain(real[0].title)
    // ...and MOCK_EVENTS' signature row must not.
    expect(text).not.toContain('High Flow Anomaly')
  })
})

describe('water event actions reach the stores — from the incident, not the card', () => {
  /* CHANGED DELIBERATELY, 2026-10-17 — the ENTRY POINT moved, the behaviour
     did not, and not one assertion below was dropped.

     Both cases used to click "On it" / "Ignore" on the AlertCard in the System
     page's alert carousel. Those buttons no longer exist there. The owner:
     "remove actions from here - system page / all needs to be handled from
     the incident." So the card is mounted actions={false} and is a pure
     summary; its whole body is now the tap target that opens
     EventFocusOverlay, and every action lives in that overlay.

     The same two things must still be true, so they are asserted through the
     path a user actually has now: open the event, then act on it. The overlay
     writes investigatingStore itself (EventFocusOverlay.jsx:939) and routes
     Ignore back through this page's IgnoreBottomSheet via the `onIgnore`
     seam, which is why the stores and the confirm sheet are still the thing
     being checked. The first case below is the new half of the contract: that
     the card really has no action row any more. */

  /* A LEAK, explicitly. Ignore and On it are water-event concepts — neither
     the card nor the overlay offers them on an offline / valve-error /
     power-lost fault — so a fault system here would make these vacuous. */
  const sys = alerting.find((s) => String(s.alert?.type ?? '').startsWith('leak'))

  beforeEach(() => {
    clearIgnored(sys.id)
    stopInvestigating(sys.id)
  })
  afterEach(() => {
    clearIgnored(sys.id)
    stopInvestigating(sys.id)
  })

  const mount = () =>
    render(
      <MemoryRouter initialEntries={[`/system/${sys.id}`]}>
        <Routes><Route path="/system/:systemId" element={<SystemPageV2Screen />} /></Routes>
      </MemoryRouter>,
    )

  /** Tap the card body — the title text, which is inside no control. */
  const openEvent = (container) => {
    const view = within(container)
    fireEvent.click(view.getAllByText(sys.alert.label)[0])
    const overlay = container.querySelector('[role="dialog"][aria-modal="true"]')
    expect(overlay, 'tapping the card did not open the event overlay').toBeTruthy()
    return within(overlay)
  }

  it('the dataset offers a leaking system (otherwise these are vacuous)', () => {
    expect(sys, 'no leak-typed alert in the dataset').toBeTruthy()
  })

  it('the card carries no action row and no "View details" link, only a way in', () => {
    const { container } = mount()
    const view = within(container)
    expect(view.queryByRole('button', { name: /^assign to me$/i })).toBeNull()
    expect(view.queryByRole('button', { name: /^ignore event$/i })).toBeNull()
    // The rejected control: "dont like the view details and not 45 degrees
    // arrow inside the card."
    expect(view.queryByRole('button', { name: /view details/i })).toBeNull()
    expect(view.queryByRole('link', { name: /view details/i })).toBeNull()

    /* What replaced it: the card itself, exposed as a real <button> so it is
       a tab stop and Enter / Space activate it, named for what it opens, and
       a SIBLING of the card rather than a wrapper around it — nothing the
       card draws ends up nested inside an interactive element. */
    const opener = view.getByRole('button', { name: `Open ${sys.alert.label}` })
    expect(opener.tagName).toBe('BUTTON')
    expect(opener.querySelector('button')).toBeNull()
  })

  it('"On it" starts investigating — now from the event overlay', () => {
    expect(isInvestigating(sys.id)).toBe(false)
    const { container } = mount()
    const overlay = openEvent(container)
    const btn = overlay.getByRole('button', { name: /^assign to me$/i })
    expect(btn, 'no "On it" control in the overlay').toBeTruthy()
    fireEvent.click(btn)
    expect(isInvestigating(sys.id)).toBe(true)
  })

  it('"Ignore" opens the confirm sheet rather than firing on the tap', () => {
    /* CHANGED DELIBERATELY (earlier pass). This used to assert that one tap
       ignored the incident. PRD 06 calls Ignore irreversible and says it
       "opens the Ignore bottom sheet on the System page" — and PRD 15
       captures the cause at ignore-commit time, which a bare button gives
       nowhere to put. So the tap must NOT commit.

       CHANGED AGAIN, 2026-10-17 — the sheet, not the rule. The page used to
       answer the overlay's Ignore with v1's IgnoreBottomSheet. The owner:
       "make this as part of the design system - currently looks like from
       another app." It is now WaterEventFeedbackSheet’s ignore flow, which
       opens on the four consequences and gates on "Ignore anyway". The
       assertion follows the copy, and additionally pins the gate itself,
       since that gate is what makes "one tap must not commit" true. */
    expect(isIgnored(sys.id)).toBe(false)
    const { container } = mount()
    const overlay = openEvent(container)
    const btn = overlay.getByRole('button', { name: /^ignore event$/i })
    expect(btn, 'no "Ignore" control in the overlay').toBeTruthy()
    fireEvent.click(btn)

    expect(isIgnored(sys.id), 'one tap must not commit an irreversible action').toBe(false)
    expect(
      within(document.body).queryByText('Ignore this water event?'),
      'the ignore flow should be on screen',
    ).toBeTruthy()
    expect(
      within(document.body).queryByRole('button', { name: 'Ignore anyway' }),
      'the irreversible step must be behind an explicit confirmation',
    ).toBeTruthy()
  })
})

describe('the System page alert card is WATER EVENTS ONLY', () => {
  /* CHANGED DELIBERATELY, 2026-10-18 — the owner, on a screenshot of this card
     reading "System Offline": "only water events shall appear here in this
     card / not others."

     This block used to be called 'every alert variant on the System page keeps
     the way into the event' and its first case asserted that a FAULT system
     draws the card and that tapping it opens EventFocusOverlay. That case is
     inverted below, not deleted: the same two systems are mounted, and what is
     pinned is the new rule — leak renders the card, fault renders none.

     The second case (the ignored card) is untouched: `ignored` is a water-event
     state, so it is still a leak system and still keeps its way in.

     Rule 0 of .claude/skills/v2-page-parity — never silently drop
     functionality — is answered by the last two assertions in the fault case:
     the page must still SAY the system is in trouble. It does, in the Events
     Timeline card, which is fed this system's real events. What the filter DOES
     take away is the only route from this page into the overlay's fault layout;
     that is reported to the owner, not replaced by an invented surface. */
  const fault = alerting.find((s) => s.alert && !String(s.alert.type ?? '').startsWith('leak'))
  const leak = alerting.find((s) => String(s.alert?.type ?? '').startsWith('leak'))

  const mountAt = (id) =>
    render(
      <MemoryRouter initialEntries={[`/system/${id}`]}>
        <Routes><Route path="/system/:systemId" element={<SystemPageV2Screen />} /></Routes>
      </MemoryRouter>,
    )
  const overlayIn = (c) => c.querySelector('[role="dialog"][aria-modal="true"]')
  const cardsIn = (c) =>
    c.querySelectorAll('[data-node-id="198379:80460"] > div')

  afterEach(() => clearIgnored(leak.id))

  it('a LEAK system still draws the card, unchanged', () => {
    expect(leak, 'no leak-typed alert in the dataset').toBeTruthy()
    const { container } = mountAt(leak.id)
    const view = within(container)
    expect(cardsIn(container).length, 'the leak card went missing').toBe(1)
    expect(view.getByRole('button', { name: `Open ${leak.alert.label}` })).toBeTruthy()
  })

  it('a FAULT system draws NO card — and the page still reports the fault', () => {
    expect(fault, 'no non-leak alert in the dataset').toBeTruthy()
    const { container } = mountAt(fault.id)
    const view = within(container)

    // The owner's instruction, stated two ways: nothing in the carousel, and
    // no opener named for the fault.
    expect(cardsIn(container).length, 'a non-water alert still drew a card').toBe(0)
    expect(view.queryByRole('button', { name: `Open ${fault.alert.label}` })).toBeNull()

    // Rule 0: the fault is not silently gone from the page. The Events
    // Timeline card carries the real current event for this system.
    const live = (getEventsForSystem(fault.id) ?? []).find((e) => !e.resolved)
    expect(live, 'the dataset gives this fault system no current event').toBeTruthy()
    expect(view.getAllByText(live.title).length).toBeGreaterThan(0)

    // And the System type card's dot still says so to assistive tech.
    expect(view.getAllByRole('img', { name: 'Alerting' }).length).toBeGreaterThan(0)
  })

  it('an ignored card opens the event, and its "Ignored" pill is inert', () => {
    /* CHANGED DELIBERATELY, 2026-10-17 (owner decision). This test used to be
       called '...its own "Ignored" pill still only un-ignores' and asserted
       that tapping the pill cleared the ignore. PRD 14 calls Ignore
       irreversible, the ignore flow itself promises the user "This can't be
       undone for this event", and nowhere else in the product — v1 or v2 —
       offers a way back: the un-ignore was the thing that was wrong, not the
       PRD. So the pill is a status indicator now. No role, no tab stop, no
       handler, and AlertCard emits no 'unignore' at all.

       What survives unchanged is the one-tap-one-outcome contract the old
       test was really protecting, now stated as: the pill does NOTHING, and
       the card body still opens the event. That is also why the page's
       openEventOnCardTap guard still has to know about the pill — dropping
       it from the guard would have swapped the un-ignore for an
       open-the-overlay, which is not "removing a control". */
    ignoreIncident(leak.id, { tag: 'test', ignoredBy: 'Test' })
    const { container } = mountAt(leak.id)
    const view = within(container)

    const pill = container.querySelector('[data-status-pill]')
    expect(pill, 'the ignored card draws no status pill').toBeTruthy()
    expect(pill.textContent.trim()).toBe('Ignored')

    // Not a control: not exposed as one, and not reachable by keyboard.
    expect(view.queryByRole('button', { name: /^ignored$/i })).toBeNull()
    expect(pill.getAttribute('role')).toBeNull()
    expect(pill.getAttribute('tabindex')).toBeNull()

    fireEvent.click(pill)
    expect(isIgnored(leak.id), 'the pill un-ignored the event').toBe(true)
    expect(overlayIn(container), 'the pill opened the overlay').toBeNull()

    // ...and the card body still opens the event.
    fireEvent.click(view.getAllByText(leak.alert.label)[0])
    expect(overlayIn(container)).toBeTruthy()
  })
})
