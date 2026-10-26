// @vitest-environment happy-dom
//
// EventFocusOverlay — the full-focus surface for a single event.
//
// It exists because eleven capabilities lived only on the v1 screen
// src/screens/leak/LeakDetail.jsx; six of them are the things a user DOES to
// close an event out. These tests pin the ones that are easy to lose again:
//
//   1. the two layouts are one component, and the fault layout is NOT the
//      water layout with the water bits hidden — it must carry no Ignore and
//      no On it, because neither means anything for a device fault (v1's
//      ErrorAlertDetail offers neither, and offering Ignore there was the
//      bug this surface replaces);
//   2. Stand down is offered only to the actor who claimed the event
//      (LeakDetail.jsx:362, PRD 04a:68-74), actually releases the claim, and
//      IGNORE STAYS BESIDE IT — claiming replaces On it, it does not withdraw
//      the right to ignore (2026-10-17 owner report);
//   3. the ignored state has NO action row (PRD 04a:146-154, locked
//      2026-06-15) and names who ignored it;
//   4. recipients come off the real incident, not a placeholder;
//   5. there is a real way out — Escape, and BOTH the back and the close
//      control the owner asked for (2026-10-17) — plus the one-hop route to
//      the system that v1's LeakDetail.jsx:207-210 had;
//   6. the collapsible sections are really collapsible: a real button with
//      aria-expanded, pointing at a real panel with aria-controls;
//   7. THE DESIGN-SYSTEM PASS (2026-10-17): the summary is the System page's
//      own AlertCard, the timeline is the app's own EventsTimelineCard fed the
//      INCIDENT's steps, and the valve is the app's own ValveStatusCard behind
//      a seam the PAGE owns — not three bespoke rebuilds of each.
//
// Every fixture is picked OUT of the live dataset rather than hard-coded, so a
// dataset refresh cannot quietly make these assertions vacuous.
//
// MemoryRouter: the header's "View System" control navigates, so the component
// now needs router context. Both real mount sites are inside the app router.

import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import EventFocusOverlay from '@/v2/components/EventFocusOverlay'
import { SYSTEMS } from '@/data/systems'
import { getActiveIncident, getNotification } from '@/data/incidents'
import { getSystemUnits } from '@/data/systemDetails'
import { isIgnored, ignoreIncident, clearIgnored } from '@/data/ignoredIncidents'
import { isInvestigating, startInvestigating, stopInvestigating } from '@/data/investigatingStore'
import { getCurrentActor } from '@/data/currentUser'

const WATER = new Set(['leak-high', 'leak-low'])

const hasValve = s => getSystemUnits(s).some(d => d.valve)

/** A water event that really does have an incident with recipients behind it. */
const leakSys = SYSTEMS.find(
  s => WATER.has(s.alert?.type) && (getNotification(getActiveIncident(s.id))?.recipients?.length ?? 0) > 0,
)

/** A non-leak fault — offline / valve-error / power-lost. */
const faultSys = SYSTEMS.find(s => s.alert && !WATER.has(s.alert.type))

/** A system carrying a WATER EVENT and a valve.
    `s.alert` alone was too loose: a device fault surfaces through the same
    field, so this resolved to whichever alerting system came first and only
    happened to be a leak while the dataset was dense enough. The 2026-10-25
    20%-per-location cap took the fleet from 23 active events to 9, the first
    hit became an AC Power Lost, and all nine tests below went looking for a
    valve control on a fault overlay. The fixture was always meant to be a
    leak — the block directly beneath says so about its own two cases — so
    this is the predicate being corrected, not relaxed. */
const valveSys = SYSTEMS.find(s => WATER.has(s.alert?.type) && hasValve(s))

/* buildTree.js records 20 MRG systems as genuinely metering-only. The two
   tests below need one carrying a WATER EVENT specifically, not any alert:
   both are about what the overlay does when the thing on screen is a leak and
   there is no valve to stop it with — the missing valve readout, and the "this
   is a metering-only system" line in the advice, which the fault layouts do
   not render at all.

   This asked only for `s.alert`, and passed for a year on luck: the first
   valveless alerting system in the fleet happened to be leaking. After the
   2026-10-22 rebuild of buildTree the first one is on AC power loss, so both
   tests started reading the power-fault layout and failed on copy that was
   never meant to be there. The predicate now says what the tests mean. */
const noValveSys = SYSTEMS.find(s => WATER.has(s.alert?.type) && !hasValve(s))

/** Clean every store this surface reads, so no test inherits another's claim. */
function resetStores(id) {
  if (!id) return
  stopInvestigating(id)
  clearIgnored(id)
}

const ALL_IDS = [leakSys?.id, faultSys?.id, valveSys?.id, noValveSys?.id]

beforeEach(() => {
  ALL_IDS.forEach(resetStores)
})

afterEach(() => {
  cleanup()
  ALL_IDS.forEach(resetStores)
})

const renderOverlay = (props = {}) =>
  render(
    <MemoryRouter>
      <EventFocusOverlay
        open
        systemId={props.system?.id ?? leakSys.id}
        onClose={() => {}}
        {...props}
      />
    </MemoryRouter>,
  )

/** The section header button, and the panel its aria-controls points at. */
function section(name) {
  const header = screen.getByRole('button', { name })
  const panelId = header.getAttribute('aria-controls')
  const panel = panelId ? document.getElementById(panelId) : null
  return { header, panel }
}

describe('the fixtures are real', () => {
  it('the dataset carries a water event with notified recipients', () => {
    expect(leakSys, 'no leak system with an incident — every water test below would be vacuous').toBeTruthy()
  })

  it('the dataset carries a non-leak fault', () => {
    expect(faultSys, 'no fault system — the fault-layout tests would be vacuous').toBeTruthy()
  })

  it('the dataset carries an alerting system with a valve, and one without', () => {
    expect(valveSys, 'no alerting system with a valve — the valve tests would be vacuous').toBeTruthy()
    expect(noValveSys, 'no metering-only system with a water event — the no-valve tests would be vacuous').toBeTruthy()
  })
})

describe('the two layouts', () => {
  it('renders the water-event layout for a leak', () => {
    renderOverlay()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    // The event label is the header title AND the AlertCard's own title.
    expect(screen.getAllByText(leakSys.alert.label).length).toBeGreaterThan(0)
    // The incident timeline is the water layout's spine, in the house card.
    expect(screen.getByText('Events Timeline')).toBeInTheDocument()
  })

  it('renders the fault layout for a non-leak fault', () => {
    renderOverlay({ system: faultSys })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // ErrorAlertDetail.jsx:112-116 — the severity is the fault summary's tell.
    const severities = screen.queryAllByText(/^(Critical|Warning)$/)
    expect(severities.length).toBeGreaterThan(0)
    // No per-incident timeline: v1's ErrorAlertDetail has none either, and a
    // fault has no incident to draw steps from.
    expect(screen.queryByText('Events Timeline')).toBeNull()
  })

  it('gives the fault an event id in the fault vocabulary, not a leak id', () => {
    renderOverlay({ system: faultSys })
    expect(screen.getByText(/^(off|ve|pwr|bat|evt)-\d{4}$/)).toBeInTheDocument()
    expect(screen.queryByText(/^lk-\d{4}$/)).toBeNull()
  })
})

/* The 2026-10-17 design-system pass: the owner's "use design as we have in the
   system page card view" / "events timeline use the same as we already use". */
describe('it reuses the app’s own components', () => {
  it('draws the summary with the System page’s AlertCard, from the same row', () => {
    renderOverlay()
    // AlertCard's own slots: the event title, the "Detected" meta row, the
    // lifecycle status pill, and the flow figure with its unit.
    expect(screen.getAllByText(leakSys.alert.label).length).toBeGreaterThan(0)
    expect(screen.getByText('Detected')).toBeInTheDocument()
    expect(screen.getByText(leakSys.alert.startedAt)).toBeInTheDocument()
    expect(screen.getByText('L/H flow rate')).toBeInTheDocument()
    // The figure is the alert's own flow rate with the unit stripped, exactly
    // as SystemPageV2Screen's alertCardsFor builds it.
    const rate = String(leakSys.alert.flowRate).replace(/[^\d,.]/g, '')
    expect(screen.getAllByText(rate).length).toBeGreaterThan(0)
  })

  it('does NOT draw AlertCard’s own action row — the footer is the only one', () => {
    renderOverlay({ onIgnore: () => {} })
    // One On it and one Ignore on the whole surface, not two of each.
    expect(screen.getAllByRole('button', { name: /^on it$/i })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /^ignore$/i })).toHaveLength(1)
  })

  it('feeds EventsTimelineCard the INCIDENT’s steps, not the system history', () => {
    const incident = getActiveIncident(leakSys.id)
    expect(incident.steps.length).toBeGreaterThan(0)
    renderOverlay()

    // Every incident begins with a detection and an alert send.
    expect(screen.getByText(/Water Event detected$/)).toBeInTheDocument()
    expect(screen.getByText('Alert Sent')).toBeInTheDocument()
    // Newest first, which is v1's locked order: the detection is LAST in the
    // store and therefore the bottom row here.
    const rows = [...document.querySelectorAll('[data-name="Activity feed item"]')]
    expect(rows).toHaveLength(incident.steps.length)
    expect(rows[rows.length - 1].textContent).toMatch(/Water Event detected/)
  })

  it('keeps the comms steps’ reach in the card’s own “n sent” chip', () => {
    const incident = getActiveIncident(leakSys.id)
    const sent = incident.steps.find(s => s.type === 'alert-sent')
    expect(sent.recipients.length).toBeGreaterThan(0)
    renderOverlay()
    expect(screen.getByText(`${sent.recipients.length} sent`)).toBeInTheDocument()
  })

  it('carries neither of the reference app features we do not have', () => {
    renderOverlay({ onIgnore: () => {} })
    expect(screen.queryByRole('button', { name: /turn off water/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /snooze/i })).toBeNull()
  })
})

/* There WAS an explanatory sentence under the summary ("Flow that never stops
   usually means a slow leak." and a line per event type). The owner cut it
   twice and then removed it outright on 2026-10-17 — the slot was the problem,
   not the wording. Pinned so it does not come back. */
describe('the plain-language line is gone', () => {
  it('asserts nothing about what the flow means, on any event type', () => {
    for (const system of [leakSys, faultSys, noValveSys]) {
      renderOverlay({ system })
      expect(
        screen.queryByText(/usually means|usually water|cannot be trusted|backup power/i),
        `interpretation copy came back on ${system.alert.type}`,
      ).toBeNull()
      cleanup()
    }
  })
})

/* THE MAIN ACTION (owner, 2026-10-17): "how the main action here in this flow
   is valve operation". Status readable at a glance, the action as the footer's
   solid primary, and every change behind v1's confirmation. */
describe('the valve', () => {
  it('shows the valve state as a READ-ONLY fact whenever the system has one', () => {
    // No seam passed: the readout is a fact about the SYSTEM, not about how
    // the mount is wired.
    renderOverlay({ system: valveSys })
    const readout = screen.getByRole('region', { name: 'Valve status' })
    expect(within(readout).getByText('Open')).toBeInTheDocument()
  })

  /* Owner, 2026-10-17: "now we have 2 valve CTA." ONE control is still the
     rule; 2026-10-25 changed which of the two survives. 199683:24849 and
     199394:78935 both draw "Close valve now" inside the Valve status panel
     and give the footer no valve action, so the card is interactive again and
     the footer primary is the one that went. The COUNT is what matters and it
     is unchanged. */
  it('has exactly ONE valve control, and it is in the Valve status panel', () => {
    renderOverlay({ system: valveSys, valve: { state: 'open', onIntent: () => {} } })
    // No switch anywhere: the status is a readout.
    expect(screen.queryByRole('switch')).toBeNull()
    const controls = screen.getAllByRole('button', { name: /valve now$/i })
    expect(controls).toHaveLength(1)
    // And it lives in the panel, not the footer — a stronger claim than the count.
    expect(screen.getByRole('region', { name: 'Valve status' })).toContainElement(controls[0])
  })

  /* With the valve out of the footer the solid slot is On it's again — it was
     demoted only because the valve sat above it. The owner's standing
     requirement, twice: "we need to keep the ignore and on it". Both survive
     the redraw whatever the frames draw. */
  it('keeps On it and Ignore in the footer, with On it back as the primary', () => {
    renderOverlay({ system: valveSys, onIgnore: () => {} })
    expect(screen.getByRole('button', { name: /^close valve now$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^on it$/i })).toHaveAttribute(
      'data-variant',
      'default',
    )
    expect(screen.getByRole('button', { name: /^ignore$/i })).toBeInTheDocument()
  })

  it('commits nothing on the tap — ValveConfirmSheet gates it, with v1’s copy', () => {
    const intents = []
    renderOverlay({
      system: valveSys,
      valve: { state: 'open', onIntent: a => intents.push(a) },
    })

    fireEvent.click(screen.getByRole('button', { name: /^close valve now$/i }))

    // v1's exact confirmation copy, from the shared component.
    expect(screen.getByText('Close the valve?')).toBeInTheDocument()
    expect(intents).toEqual([])

    fireEvent.click(screen.getByRole('button', { name: /yes, close valve/i }))
    // The card speaks state; the sheet speaks intent. The translation happens
    // here, and the PAGE commits it.
    expect(intents).toEqual(['close'])
    expect(screen.queryByText('Close the valve?')).toBeNull()
  })

  it('cancels cleanly, committing nothing', () => {
    const intents = []
    renderOverlay({ system: valveSys, valve: { state: 'open', onIntent: a => intents.push(a) } })
    fireEvent.click(screen.getByRole('button', { name: /^close valve now$/i }))
    expect(screen.getByText('Close the valve?')).toBeInTheDocument()
    // ValveConfirmSheet labels its scrim "Cancel" too, so take the button.
    const cancels = screen.getAllByRole('button', { name: /^cancel$/i })
    fireEvent.click(cancels[cancels.length - 1])
    expect(intents).toEqual([])
    expect(screen.queryByText('Close the valve?')).toBeNull()
  })

  it('reflects the state the PAGE holds, and offers the opposite action', () => {
    renderOverlay({ system: valveSys, valve: { state: 'closed', onIntent: () => {} } })
    const readout = screen.getByRole('region', { name: 'Valve status' })
    expect(within(readout).getByText('Closed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^open valve now$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^close valve now$/i })).toBeNull()
  })

  it('never contradicts the page: valve.state wins over a local confirmation', () => {
    renderOverlay({ system: valveSys, valve: { state: 'open', onIntent: () => {} } })
    fireEvent.click(screen.getByRole('button', { name: /^close valve now$/i }))
    fireEvent.click(screen.getByRole('button', { name: /yes, close valve/i }))
    // The page said "open" and has not changed its mind, so this surface still
    // says "open" — it does not flip behind the page's back.
    const readout = screen.getByRole('region', { name: 'Valve status' })
    expect(within(readout).getByText('Open')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^close valve now$/i })).toBeInTheDocument()
  })

  it('draws NO valve readout and NO valve action when the system has no valve', () => {
    renderOverlay({ system: noValveSys, valve: { state: 'open', onIntent: () => {} } })
    expect(screen.queryByRole('region', { name: 'Valve status' })).toBeNull()
    expect(screen.queryByRole('button', { name: /valve now$/i })).toBeNull()
    // …and the claim takes the solid slot back.
    expect(screen.getByRole('button', { name: /^on it$/i })).toHaveAttribute(
      'data-variant',
      'default',
    )
  })

  it('lets Escape cancel the confirmation without closing the event behind it', () => {
    let closed = 0
    renderOverlay({
      system: valveSys,
      onClose: () => { closed += 1 },
      valve: { state: 'open', onIntent: () => {} },
    })
    fireEvent.click(screen.getByRole('button', { name: /^close valve now$/i }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('Close the valve?')).toBeNull()
    expect(closed).toBe(0)
    // And the event itself is still dismissible once the sheet is gone.
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(closed).toBe(1)
  })
})

describe('find this system', () => {
  it('offers the section, with the device photo and the location', () => {
    renderOverlay()
    const { header, panel } = section(/^Find this system/)
    fireEvent.click(header)
    expect(panel.hidden).toBe(false)
    expect(within(panel).getByAltText(/wint device/i)).toBeInTheDocument()
    expect(within(panel).getAllByText(leakSys.name).length).toBeGreaterThan(0)
  })

  it('reads and writes notes through locationInfoStore, not its own state', async () => {
    const { getNotesOverride, setNotes } = await import('@/data/locationInfoStore')
    setNotes(leakSys.id, '')
    renderOverlay()
    fireEvent.click(section(/^Find this system/).header)

    const box = screen.getByLabelText('Notes')
    fireEvent.change(box, { target: { value: 'Riser cupboard, 2nd floor' } })
    expect(getNotesOverride(leakSys.id)).toBe('Riser cupboard, 2nd floor')
    setNotes(leakSys.id, '')
  })
})

describe('the collapsible sections', () => {
  it('wires each header to its own panel with aria-expanded / aria-controls', () => {
    renderOverlay()
    /* "Event details" is no longer a section on a water event — its four
       facts are a read-only strip at the top now (owner, 2026-10-18), so the
       accordion only exists on a fault. The wiring contract is the same for
       the sections that remain. */
    for (const name of [/^Event graph$/, /^Who was notified/, /^Find this system$/]) {
      const { header, panel } = section(name)
      expect(header).toHaveAttribute('aria-expanded')
      expect(panel, `no panel for ${name}`).toBeTruthy()
      expect(panel).toHaveAttribute('aria-labelledby', header.id)
    }
  })

  it('starts the sections collapsed on a water event', () => {
    renderOverlay()
    const graph = section(/^Event graph$/)
    expect(graph.header).toHaveAttribute('aria-expanded', 'false')
    expect(graph.panel.hidden).toBe(true)
  })

  /* SUPERSEDED 2026-10-21 — the owner removed the four-fact strip this
     asserted ("remove this from event overlay"). The strip had been promoted
     out of the accordion three days earlier on the grounds that those four
     ARE the event.
     What replaces the assertion is the reason the removal was safe: three of
     the four are still said on this surface, by the neighbours the strip was
     restating. That is the Rule 0 guarantee and it is worth keeping. The
     fourth, Detection, is genuinely gone and is reported to the owner rather
     than asserted here — a test that pinned its absence would just make the
     loss harder to reverse. */
  it('drops the fact strip, and the facts it restated are still said', () => {
    const { container } = renderOverlay()
    const text = container.textContent

    // The strip itself is gone — no labelled State / Flow level / Auto-shutoff.
    expect(screen.queryByText('Flow level')).toBeNull()
    expect(screen.queryByText('Auto-shutoff')).toBeNull()

    // State — the alert card's status pill still carries it.
    expect(text).toMatch(/Ongoing|Warning|Shut ?off/i)
    // Flow direction — the event's own title carries it.
    expect(text).toMatch(/High Flow|Low Flow/i)
    /* Auto-shutoff — the policy is stated in a sentence, and the component
       has THREE wordings for it, one per branch:
         valve + auto-shutoff   "Valve handling: ..."
         valve, shutoff off     "Valve handling: Manual only - ..."
         metering-only          "...metering-only, so the water cannot be
                                 shut off from the app." (EventFocusOverlay:503)
       Matching the words "shut off" passed only on the first. Matching
       "Valve handling" passed on the first two, which held while leakSys
       happened to resolve to a valved system — until the 2026-10-25 water-event
       cap thinned the fleet and the first leak with recipients became one of
       the 20 metering-only systems. The guarantee is that the fact SURVIVES
       the fact strip's removal, not which sentence carries it, so all three
       count. */
    expect(text).toMatch(/Valve handling|cannot be shut off/i)

    // And it still is not an accordion.
    expect(screen.queryByRole('button', { name: /^Event details$/ })).toBeNull()
  })

  it('toggles a section on its header', () => {
    renderOverlay()
    const { header, panel } = section(/^Who was notified/)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'true')
    expect(panel.hidden).toBe(false)
    fireEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(panel.hidden).toBe(true)
  })

  it('opens the facts by default on a fault, which has no timeline to read', () => {
    renderOverlay({ system: faultSys })
    const { header, panel } = section(/^Event details$/)
    expect(header).toHaveAttribute('aria-expanded', 'true')
    expect(panel.hidden).toBe(false)
  })
})

describe('a fault offers no water-event actions', () => {
  it('has no Ignore control', () => {
    // onIgnore is supplied, so its absence is a decision about faults and not
    // simply a missing handler.
    renderOverlay({ system: faultSys, onIgnore: () => {} })
    expect(screen.queryByRole('button', { name: /^ignore$/i })).toBeNull()
  })

  it('has no On it control', () => {
    renderOverlay({ system: faultSys, onIgnore: () => {} })
    expect(screen.queryByRole('button', { name: /^on it$/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /stand down/i })).toBeNull()
  })
})

describe('On it / Stand down / Ignore', () => {
  it('offers On it while unclaimed, and claiming reads back the actor', () => {
    const { rerender } = renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: /^on it$/i }))
    expect(isInvestigating(leakSys.id)).toBe(true)

    rerender(
      <MemoryRouter>
        <EventFocusOverlay open systemId={leakSys.id} onClose={() => {}} />
      </MemoryRouter>,
    )
    // "On it · {actor}" — LeakDetail.jsx:372-381.
    expect(screen.getByText(new RegExp(`On it · ${getCurrentActor()}`))).toBeInTheDocument()
  })

  it('does NOT offer Stand down when someone else holds the claim', () => {
    startInvestigating(leakSys.id, { actor: 'Dana Whitfield' })
    renderOverlay()
    expect(screen.getByText(/On it · Dana Whitfield/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /stand down/i })).toBeNull()
  })

  it('offers Stand down to the claiming actor, and it calls stopInvestigating', () => {
    startInvestigating(leakSys.id, { actor: getCurrentActor() })
    const onStandDown = []
    renderOverlay({ onStandDown: id => onStandDown.push(id) })

    fireEvent.click(screen.getByRole('button', { name: /stand down/i }))

    // The store is the assertion: Stand down means the claim is released.
    expect(isInvestigating(leakSys.id)).toBe(false)
    expect(onStandDown).toEqual([leakSys.id])
    // And the surface repaints back to the unclaimed offer.
    expect(screen.getByRole('button', { name: /^on it$/i })).toBeInTheDocument()
  })

  /* THE 2026-10-17 REPORT: a claimed event's footer showed only "Stand down".
     Claiming replaces On it; it does not withdraw the right to ignore. */
  it('keeps Ignore BESIDE Stand down once the event is claimed', () => {
    startInvestigating(leakSys.id, { actor: getCurrentActor() })
    renderOverlay({ onIgnore: () => {} })

    expect(screen.getByRole('button', { name: /stand down/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^ignore$/i })).toBeInTheDocument()
    // On it is spent, not duplicated.
    expect(screen.queryByRole('button', { name: /^on it$/i })).toBeNull()
  })

  it('still offers Ignore when SOMEONE ELSE holds the claim', () => {
    startInvestigating(leakSys.id, { actor: 'Dana Whitfield' })
    renderOverlay({ onIgnore: () => {} })
    expect(screen.getByRole('button', { name: /^ignore$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /stand down/i })).toBeNull()
  })

  /* The ONLY reason Ignore is ever absent on a live water event: the mount
     passed no handler, so the control has no destination. HomeAllAccounts does
     exactly this today — see the report. */
  it('draws no Ignore when the mount supplies no onIgnore', () => {
    startInvestigating(leakSys.id, { actor: getCurrentActor() })
    renderOverlay()
    expect(screen.getByRole('button', { name: /stand down/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^ignore$/i })).toBeNull()
  })
})

describe('the ignored state', () => {
  it('shows who ignored it and the captured reason, and drops the claim row', () => {
    ignoreIncident(leakSys.id, { tag: 'Scheduled irrigation', ignoredBy: 'Marcus Ellery' })
    expect(isIgnored(leakSys.id)).toBe(true)

    renderOverlay({ onIgnore: () => {} })

    expect(screen.getByText('Ignored by Marcus Ellery')).toBeInTheDocument()
    expect(screen.getByText('Scheduled irrigation')).toBeInTheDocument()

    // PRD 04a:146-154 — Ignore and On it are spent. (PRD 14) nothing un-ignores.
    expect(screen.queryByRole('button', { name: /^ignore$/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /^on it$/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /stand down/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /un-?ignore/i })).toBeNull()
  })

  /* DELIBERATE DEPARTURE from how PRD 04a:146-154 has been read — see the
     footer note in the component. "No action row" was written about the
     Ignore / On it row; the valve was never in that footer, and an ignored
     event is still a running water event somebody may need to stop. */
  it('KEEPS the valve action and the valve state once ignored', () => {
    ignoreIncident(valveSys.id, { ignoredBy: 'Marcus Ellery' })
    const intents = []
    renderOverlay({
      system: valveSys,
      onIgnore: () => {},
      valve: { state: 'open', onIntent: a => intents.push(a) },
    })

    expect(screen.getByRole('region', { name: 'Valve status' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^close valve now$/i }))
    fireEvent.click(screen.getByRole('button', { name: /yes, close valve/i }))
    expect(intents).toEqual(['close'])
  })

  it('still draws no footer at all on a FAULT', () => {
    renderOverlay({ system: faultSys, onIgnore: () => {} })
    expect(document.querySelector('[role="dialog"] footer')).toBeNull()
  })

  it('offers the Ignore control while the event is live', () => {
    const ignored = []
    renderOverlay({ onIgnore: id => ignored.push(id) })
    fireEvent.click(screen.getByRole('button', { name: /^ignore$/i }))
    // The overlay states the intent; the page owns the flow that commits it,
    // so the store must NOT have been written here.
    expect(ignored).toEqual([leakSys.id])
    expect(isIgnored(leakSys.id)).toBe(false)
  })
})

describe('who was notified', () => {
  it('lists the recipients from the real incident data', () => {
    const notification = getNotification(getActiveIncident(leakSys.id))
    expect(notification.recipients.length).toBeGreaterThan(0)

    renderOverlay()

    const { header, panel } = section(/^Who was notified/)
    // The count rides on the header, so it is readable while collapsed.
    expect(header.textContent).toContain(String(notification.recipients.length))
    for (const name of notification.recipients) {
      expect(within(panel).getAllByText(name).length).toBeGreaterThan(0)
    }
  })

  it('names the channels the alert went out on', () => {
    const notification = getNotification(getActiveIncident(leakSys.id))
    renderOverlay()
    const labels = { push: 'Push', email: 'Email', sms: 'SMS' }
    for (const ch of notification.channels) {
      expect(screen.getAllByText(labels[ch]).length).toBeGreaterThan(0)
    }
  })
})

/* Owner, 2026-10-17: "why incident is full screen and not like here in context".
   The house modal-sheet chrome, copied from SystemsFilterSheet.jsx:97. */
/* THE CHROME REVERSED, 2026-10-25. It was a bottom-anchored sheet, from the
   owner's 2026-10-17 note above. They reversed it with the 199683:24849
   redraw: "it needs to be full overlay, not like now" — the sheet left the
   page's tab row showing above it and the TabBar below, and the frame draws
   the event as the whole screen. The ruling that did NOT change is the one
   underneath both: it stays an `absolute inset-0` layer INSIDE the phone
   frame, never a portal, because a portalled overlay covers the browser
   window with the phone in the middle of it. That is what this now guards. */
describe('the overlay chrome', () => {
  it('fills the phone frame, and does so without portalling', () => {
    renderOverlay()
    const dialog = screen.getByRole('dialog')
    // The outer layer stays inside the phone frame — no portal.
    expect(dialog.className).toContain('absolute inset-0 z-50')
    expect(dialog.className).not.toContain('fixed')
    expect(dialog.className).not.toContain('justify-end')
    // The panel owns the full height; the sheet's cap and top radius are gone.
    const panel = dialog.querySelector('.h-full')
    expect(panel, 'no full-height panel').toBeTruthy()
    expect(panel.className).not.toContain('max-h-[85%]')
    expect(panel.className).not.toContain('rounded-t-')
  })

  it('dismisses on the scrim, which is named apart from the ×', () => {
    let closed = 0
    renderOverlay({ onClose: () => { closed += 1 } })
    const scrim = screen.getByRole('button', { name: 'Close event' })
    expect(scrim).not.toBe(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(scrim)
    expect(closed).toBe(1)
  })
})

describe('there is a way out', () => {
  it('offers BOTH the back and the close control, separately named', () => {
    renderOverlay()
    // The owner asked for both (2026-10-17). Distinct accessible names, so a
    // screen reader — and this test — can tell them apart.
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('dismisses on the back control', () => {
    let closed = 0
    renderOverlay({ onClose: () => { closed += 1 } })
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(closed).toBe(1)
  })

  it('dismisses on the close control', () => {
    let closed = 0
    renderOverlay({ onClose: () => { closed += 1 } })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(closed).toBe(1)
  })

  it('dismisses on Escape', () => {
    let closed = 0
    renderOverlay({ onClose: () => { closed += 1 } })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(closed).toBe(1)
  })

  it('renders nothing at all when closed, and unbinds Escape with it', () => {
    let closed = 0
    const { container } = render(
      <MemoryRouter>
        <EventFocusOverlay open={false} systemId={leakSys.id} onClose={() => { closed += 1 }} />
      </MemoryRouter>,
    )
    expect(container.firstChild).toBeNull()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(closed).toBe(0)
  })
})

/* A "View System" link (v1's LeakDetail.jsx:207-210) was added to the header on
   2026-10-17 and removed by the owner the same day — "remove the 'System' in
   blue" — along with the `hideViewSystem` prop that suppressed it. Pinned so it
   does not come back on a hunch. */
describe('the header carries nothing else', () => {
  it('has no View System link', () => {
    renderOverlay()
    expect(screen.queryByRole('button', { name: /view system/i })).toBeNull()
    expect(screen.queryByText('System')).toBeNull()
  })
})

/* Owner-requested 2026-10-17. Recharts draws NOTHING under happy-dom, so the
   assertions live on the pure module and on the section's own text — never on
   a chart internal, which would pass vacuously. */
describe('Event graph', () => {
  it('derives L/hour from the hourly buckets without arithmetic', async () => {
    const { toFlowRateSeries, peakFlowRate } = await import('@/v2/components/eventFlowSeries')
    // One bucket per hour, so litres-per-bucket IS litres-per-hour.
    const hourly = [
      { day: '00:00', litres: 12 },
      { day: '01:00', litres: 400 },
      // PLS-WC-17: an unreached bucket is DROPPED, never charted as zero.
      { day: '02:00', litres: null },
      { day: '03:00', litres: 95 },
    ]
    const points = toFlowRateSeries(hourly)
    expect(points).toEqual([
      { hour: '00:00', lph: 12 },
      { hour: '01:00', lph: 400 },
      { hour: '03:00', lph: 95 },
    ])
    expect(peakFlowRate(points)).toBe(400)
    expect(peakFlowRate([])).toBeNull()
    expect(toFlowRateSeries(null)).toEqual([])
  })

  /* REWRITTEN 2026-10-26. It asserted the hourly DAY series, which is what
     this section plotted for every event type. A water event now plots the
     INCIDENT at one point a minute — owner: "granularity needs to be minutely
     when avg event shown here is 45 minutes", "always show at least 10 min
     before event starts". The guarantee is the one it was written for and is
     unchanged: recharts draws nothing under happy-dom, so the section has to
     say something true in TEXT or this file can assert nothing about it. */
  it('plots the incident at minute resolution, with the pre-roll the owner asked for', async () => {
    const { buildEventFlowSeries } = await import('@/v2/components/eventFlowSeries')
    const { points } = buildEventFlowSeries({ key: 'k', peakLph: 120, durationMin: 45 })

    // One point a minute, 10 minutes of it before onset.
    expect(points[0].minute).toBe(-10)
    expect(points.filter(p => p.minute < 0)).toHaveLength(10)
    expect(points.at(-1).minute).toBe(45)
    for (let i = 1; i < points.length; i++) {
      expect(points[i].minute - points[i - 1].minute).toBe(1)
    }
    // The signature: a floor that never reaches zero once the event is running.
    const during = points.filter(p => p.minute >= 0)
    expect(Math.min(...during.map(p => p.lph))).toBeGreaterThan(0)
    // And a STEP, not a ramp — the first minute of the event is already up.
    const preMax = Math.max(...points.filter(p => p.minute < 0).map(p => p.lph))
    expect(during[0].lph).toBeGreaterThan(preMax)
  })

  it('is stable across calls, so the line does not animate under the user', async () => {
    const { buildEventFlowSeries } = await import('@/v2/components/eventFlowSeries')
    const a = buildEventFlowSeries({ key: 'same', peakLph: 90, durationMin: 20 })
    const b = buildEventFlowSeries({ key: 'same', peakLph: 90, durationMin: 20 })
    expect(a.points).toEqual(b.points)
  })

  it('marks started and detected, and shut-off only when a valve closed', async () => {
    const { buildEventFlowSeries } = await import('@/v2/components/eventFlowSeries')
    const running = buildEventFlowSeries({ key: 'r', durationMin: 45, detectLagMin: 3 })
    expect(running.marks.map(m => m.key)).toEqual(['started', 'detected'])
    expect(running.marks.find(m => m.key === 'started').minute).toBe(0)
    expect(running.marks.find(m => m.key === 'detected').minute).toBe(3)

    const closed = buildEventFlowSeries({
      key: 'c', durationMin: 45, detectLagMin: 3, shutoffMin: 2,
    })
    expect(closed.marks.map(m => m.key)).toEqual(['started', 'detected', 'shutoff'])
    expect(closed.marks.find(m => m.key === 'shutoff').minute).toBe(5)
    // After the valve closes the line falls back toward the floor.
    const atPlateau = closed.points.find(p => p.minute === 4).lph
    const afterClose = closed.points.find(p => p.minute === 12).lph
    expect(afterClose).toBeLessThan(atPlateau * 0.2)
  })

  it('still offers the section, and states the peak in text', () => {
    renderOverlay()
    const { header, panel } = section(/^Event graph$/)
    fireEvent.click(header)
    expect(panel.hidden).toBe(false)
    expect(within(panel).getByText(/L\/h peak/)).toBeInTheDocument()
  })
})

/* Owner-requested 2026-10-17. NEW COPY, pending sign-off — these assertions
   pin its SHAPE (short, imperative, no figures), not its wording. */
describe('What should I do', () => {
  it('gives a few short imperative steps with no restated figures', () => {
    renderOverlay()
    const { header, panel } = section(/^What should I do$/)
    fireEvent.click(header)
    const steps = [...panel.querySelectorAll('li')].map(li => li.textContent)
    expect(steps.length).toBeGreaterThan(0)
    expect(steps.length).toBeLessThanOrEqual(4)
    for (const step of steps) {
      expect(step.split(' ').length).toBeLessThanOrEqual(24)
      expect(step).not.toContain(leakSys.name)
    }
  })

  it('is the only advice section — "What happens next" was removed', () => {
    /* Six accordions was too many (owner, 2026-10-18). "What happens next"
       restated the active policy; the one line of it that changes what you do,
       Auto-shutoff, is in the facts strip at the top, and the policy in full
       is on the system page. */
    renderOverlay()
    expect(section(/^What should I do$/).header).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^What happens next$/ })).toBeNull()
  })

  it('tells a metering-only system that the water cannot be shut off from here', () => {
    renderOverlay({ system: noValveSys })
    const { header, panel } = section(/^What should I do$/)
    fireEvent.click(header)
    expect(within(panel).getByText(/metering-only/i)).toBeInTheDocument()
  })
})
