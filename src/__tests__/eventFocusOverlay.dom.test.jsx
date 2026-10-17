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

/** A system carrying an event AND a valve. */
const valveSys = SYSTEMS.find(s => s.alert && hasValve(s))

/** buildTree.js records 20 MRG systems as genuinely metering-only. */
const noValveSys = SYSTEMS.find(s => s.alert && !hasValve(s))

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
    expect(noValveSys, 'no metering-only alerting system — the no-valve test would be vacuous').toBeTruthy()
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

  /* Owner, 2026-10-17: "now we have 2 valve CTA." ValveStatusCard's switch was
     a second shutoff control beside the footer primary. One control only. */
  it('has exactly ONE valve control, and it is the footer primary', () => {
    renderOverlay({ system: valveSys, valve: { state: 'open', onIntent: () => {} } })
    // No switch anywhere: the status is a readout.
    expect(screen.queryByRole('switch')).toBeNull()
    expect(screen.getAllByRole('button', { name: /valve$/i })).toHaveLength(1)
  })

  it('makes the valve the solid primary, with On it demoted beside Ignore', () => {
    renderOverlay({ system: valveSys, onIgnore: () => {} })
    const close = screen.getByRole('button', { name: /^close valve$/i })
    expect(close).toBeInTheDocument()
    // The solid shadcn default; On it is now the secondary.
    expect(close).toHaveAttribute('data-variant', 'default')
    expect(screen.getByRole('button', { name: /^on it$/i })).toHaveAttribute(
      'data-variant',
      'secondary',
    )
  })

  it('commits nothing on the tap — ValveConfirmSheet gates it, with v1’s copy', () => {
    const intents = []
    renderOverlay({
      system: valveSys,
      valve: { state: 'open', onIntent: a => intents.push(a) },
    })

    fireEvent.click(screen.getByRole('button', { name: /^close valve$/i }))

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
    fireEvent.click(screen.getByRole('button', { name: /^close valve$/i }))
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
    expect(screen.getByRole('button', { name: /^open valve$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^close valve$/i })).toBeNull()
  })

  it('never contradicts the page: valve.state wins over a local confirmation', () => {
    renderOverlay({ system: valveSys, valve: { state: 'open', onIntent: () => {} } })
    fireEvent.click(screen.getByRole('button', { name: /^close valve$/i }))
    fireEvent.click(screen.getByRole('button', { name: /yes, close valve/i }))
    // The page said "open" and has not changed its mind, so this surface still
    // says "open" — it does not flip behind the page's back.
    const readout = screen.getByRole('region', { name: 'Valve status' })
    expect(within(readout).getByText('Open')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^close valve$/i })).toBeInTheDocument()
  })

  it('draws NO valve readout and NO valve action when the system has no valve', () => {
    renderOverlay({ system: noValveSys, valve: { state: 'open', onIntent: () => {} } })
    expect(screen.queryByRole('region', { name: 'Valve status' })).toBeNull()
    expect(screen.queryByRole('button', { name: /valve$/i })).toBeNull()
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
    fireEvent.click(screen.getByRole('button', { name: /^close valve$/i }))
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
    for (const name of [/^Event details$/, /^Who was notified/, /^Find this system$/]) {
      const { header, panel } = section(name)
      expect(header).toHaveAttribute('aria-expanded')
      expect(panel, `no panel for ${name}`).toBeTruthy()
      expect(panel).toHaveAttribute('aria-labelledby', header.id)
    }
  })

  it('starts the sections collapsed on a water event', () => {
    renderOverlay()
    const details = section(/^Event details$/)
    expect(details.header).toHaveAttribute('aria-expanded', 'false')
    expect(details.panel.hidden).toBe(true)
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
    fireEvent.click(screen.getByRole('button', { name: /^close valve$/i }))
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
describe('the sheet chrome', () => {
  it('is a bottom-anchored panel over a scrim, not a full-frame takeover', () => {
    renderOverlay()
    const dialog = screen.getByRole('dialog')
    // The outer layer stays inside the phone frame — no portal.
    expect(dialog.className).toContain('absolute inset-0 z-50')
    expect(dialog.className).toContain('justify-end')
    // The panel is capped so the page shows above it, with rounded top corners.
    const panel = dialog.querySelector('.rounded-t-\\[var\\(--rounded-2xl\\,18px\\)\\]')
    expect(panel, 'no bottom-anchored panel').toBeTruthy()
    expect(panel.className).toContain('max-h-[85%]')
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

  it('offers the section and plots this system’s real series', async () => {
    const { getConsumptionSeries } = await import('@/data/consumptionSeries')
    const { toFlowRateSeries, peakFlowRate } = await import('@/v2/components/eventFlowSeries')
    const expected = peakFlowRate(
      toFlowRateSeries(getConsumptionSeries(leakSys.id, leakSys.name, 'H', 0).series),
    )

    renderOverlay()
    const { header, panel } = section(/^Event graph$/)
    fireEvent.click(header)
    expect(panel.hidden).toBe(false)
    // The peak is stated in text, so the section says something true even
    // where the chart itself cannot render.
    expect(within(panel).getByText('L/h peak today')).toBeInTheDocument()
    expect(within(panel).getByText(expected.toLocaleString())).toBeInTheDocument()
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

  it('is distinct from "What happens next" — the user’s actions, not the system’s', () => {
    renderOverlay()
    expect(section(/^What should I do$/).header).toBeTruthy()
    expect(section(/^What happens next$/).header).toBeTruthy()
  })

  it('tells a metering-only system that the water cannot be shut off from here', () => {
    renderOverlay({ system: noValveSys })
    const { header, panel } = section(/^What should I do$/)
    fireEvent.click(header)
    expect(within(panel).getByText(/metering-only/i)).toBeInTheDocument()
  })
})
