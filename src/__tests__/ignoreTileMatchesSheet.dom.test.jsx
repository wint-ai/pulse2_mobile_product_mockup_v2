// @vitest-environment happy-dom
/**
 * THE IGNORE TILE AND THE SHEET IT OPENS MUST AGREE.
 *
 * The bug this pins, found 2026-10-31: EventFocusOverlay gated its "Ignore
 * event" tile on `isWater && !ignored && Boolean(onIgnore)` and never looked
 * at `leakState`, which it computes two dozen lines above. The sheet the tile
 * leads to — WaterEventFeedbackSheet — refuses `trigger="ignore"` whenever
 * `eventState` is 'shutoff' and returns null.
 *
 * So on a water event whose valve has closed, the tile rendered, the user
 * tapped a card-sized destructive-looking control, the host set its
 * ignore-flow flag, and the sheet rendered NOTHING. No sheet, no message, no
 * state change. A silent dead end, in both v2 hosts (SystemPageV2Screen and
 * HomeAllAccounts), because both wire the same seam.
 *
 * The fix gates the tile on the sheet's OWN answer rather than on a second
 * hand-written 'ShutOff' comparison — the repo already spells this one
 * concept five ways ('ShutOff' / 'Shutoff' / 'shutoff' / 'Shut-off', against
 * 'warning'), and a sixth site is how a control and its destination drift
 * apart in the first place. `acceptsIgnore(eventStateFor(incident))` is that
 * answer, asked before the control is drawn instead of after it is tapped.
 *
 * WHAT THIS TEST ACCEPTS AS A VISIBLE CHANGE: on a ShutOff water event the
 * tile is gone. It is not a lost capability — it did nothing there — but it
 * is one fewer thing on screen, and that is asserted here deliberately so the
 * owner can see it and reverse it in one line if they disagree.
 *
 * THE FIXTURE IS SYNTHESISED, AND THAT IS THE POINT. The live dataset carries
 * no ShutOff water event at all, so the dead end is unreachable from the fleet
 * as it stands today and no existing test could have seen it.
 * `getActiveIncident` is wrapped to dress one, and the state is still produced
 * through the real `getLeakState` rather than stubbed at the call site.
 *
 * WHAT THE FIXTURE DRESSES CHANGED ON 2026-11-04, and only the fixture did.
 * The status used to be derived from WHICH STEPS an incident had, so appending
 * a `valve-closed` step was the whole synthesis. It is now carried on the
 * canonical event record (buildTree.js `buildEventRecord`) and projected onto
 * the incident as `leakState`, because deriving it from the steps meant the
 * pill was decided by a hash unrelated to the duration printed beside it. So
 * the fixture now sets BOTH: a record that says 'ShutOff' and the step that is
 * the display consequence of one. Setting only the step would describe an
 * incident the generator cannot produce — a closed valve on an event whose own
 * record says it is merely Ongoing — and the test would be pinning a shape
 * that does not exist.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'

/* Hoisted so the mock factory, which vitest lifts above the imports, can read
   a flag the tests below set. Without this the mock would have to decide once
   for the whole file and the "still drawn when Ongoing" half could not run. */
const ctl = vi.hoisted(() => ({ shutOff: false }))

vi.mock('@/data/incidents', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    /* Everything else — getLeakState above all — stays the real thing. Only
       the incident is dressed, and only while a test asks for it. */
    getActiveIncident: (id) => {
      const incident = actual.getActiveIncident(id)
      if (!incident || !ctl.shutOff) return incident
      return {
        ...incident,
        /* What the record says. `getLeakState` reads this first. */
        leakState: 'ShutOff',
        /* And the step a ShutOff record actually produces, so the timeline the
           overlay draws matches the state the pill reports. The stamp is the
           absolute form every step carries since `agoLabel` was deleted. */
        steps: [
          ...(incident.steps ?? []),
          { type: 'valve-closed', time: '15:02', timeAgo: 'Nov 4, 15:02', detail: 'Valve closed' },
        ],
      }
    },
  }
})

import { render, cleanup, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import EventFocusOverlay from '@/v2/components/EventFocusOverlay'
import WaterEventFeedbackSheet from '@/v2/components/WaterEventFeedbackSheet'
/* The gate the tile and the sheet now share. Its own module: eslint refuses a
   component file that also exports plain functions (react-refresh). */
import { acceptsIgnore, eventStateFor } from '@/v2/components/ignoreGate'
import { SYSTEMS } from '@/data/systems'
import { getActiveIncident, getLeakState } from '@/data/incidents'
import { clearIgnored } from '@/data/ignoredIncidents'
import { stopInvestigating } from '@/data/investigatingStore'

const WATER = new Set(['leak-high', 'leak-low'])
const leakSys = SYSTEMS.find((s) => WATER.has(s.alert?.type))

beforeEach(() => {
  ctl.shutOff = false
  if (leakSys) {
    clearIgnored(leakSys.id)
    stopInvestigating(leakSys.id)
  }
})

afterEach(() => {
  cleanup()
  ctl.shutOff = false
  if (leakSys) {
    clearIgnored(leakSys.id)
    stopInvestigating(leakSys.id)
  }
})

const renderOverlay = () =>
  render(
    <MemoryRouter>
      <EventFocusOverlay open systemId={leakSys.id} onClose={() => {}} onIgnore={() => {}} />
    </MemoryRouter>,
  )

const ignoreTile = () => screen.queryByRole('button', { name: /^ignore event$/i })

describe('the fixture really produces the two states', () => {
  it('the dataset carries a water event at all', () => {
    expect(leakSys, 'no water event in SYSTEMS — every test below would be vacuous').toBeTruthy()
  })

  it('reads ShutOff only while the flag is on', () => {
    expect(getLeakState(getActiveIncident(leakSys.id))).not.toBe('ShutOff')
    ctl.shutOff = true
    expect(
      getLeakState(getActiveIncident(leakSys.id)),
      'the synthesised valve-closed step must drive the real reducer to ShutOff',
    ).toBe('ShutOff')
  })
})

describe('the sheet is the authority, and it says no', () => {
  it('refuses the ignore flow on a shutoff event', () => {
    const { container } = render(
      <WaterEventFeedbackSheet open trigger="ignore" systemId={leakSys.id} eventState="shutoff" />,
    )
    expect(container.firstChild, 'the sheet renders nothing at all').toBeNull()
    expect(screen.queryByText('Ignore this water event?')).toBeNull()
  })

  it('renders the ignore flow on a warning event', () => {
    render(
      <WaterEventFeedbackSheet open trigger="ignore" systemId={leakSys.id} eventState="warning" />,
    )
    expect(screen.queryByText('Ignore this water event?')).toBeTruthy()
  })

  /* The derivation the tile now shares with the page, pinned so the two
     helpers cannot be "simplified" back into a literal at one of the sites. */
  it('eventStateFor speaks the vocabulary acceptsIgnore reads', () => {
    expect(eventStateFor(getActiveIncident(leakSys.id))).toBe('warning')
    expect(acceptsIgnore('warning')).toBe(true)
    ctl.shutOff = true
    expect(eventStateFor(getActiveIncident(leakSys.id))).toBe('shutoff')
    expect(acceptsIgnore('shutoff')).toBe(false)
  })

  it('a null incident is not a shutoff', () => {
    // getLeakState(null) is null, and the ?action=ignore deep link used to
    // ride that straight past the backstop. Pinned so it stays explicit.
    expect(eventStateFor(null)).toBe('warning')
  })
})

describe('the Ignore tile asks the sheet before it draws', () => {
  it('is drawn on a live, ignorable water event', () => {
    renderOverlay()
    expect(ignoreTile(), 'the Ongoing case must keep its Ignore tile').toBeTruthy()
  })

  /* THE REGRESSION ITSELF. Before the fix this tile was present and inert. */
  it('is NOT drawn once the valve has closed', () => {
    ctl.shutOff = true
    renderOverlay()
    expect(
      ignoreTile(),
      'a tile whose sheet returns null is a silent dead end, not a control',
    ).toBeNull()
  })

  /* REMOVED ON PURPOSE, AND ONLY THIS. A shutoff event keeps everything else
     it had; if this ever fails the gate was applied too widely. */
  it('takes nothing else away on a shutoff event', () => {
    ctl.shutOff = true
    renderOverlay()
    expect(
      screen.queryByRole('button', { name: /^assign to me$/i }),
      'the claim tile is not an ignore control and must survive',
    ).toBeTruthy()
    expect(screen.queryByText('Manage event'), 'the row keeps its heading').toBeTruthy()
  })

  /* The invariant stated once, over both states: the control exists exactly
     when its destination would render. This is the thing that broke. */
  it('agrees with the sheet in every state', () => {
    for (const shutOff of [false, true]) {
      cleanup()
      ctl.shutOff = shutOff
      const sheetWouldRender = acceptsIgnore(eventStateFor(getActiveIncident(leakSys.id)))
      renderOverlay()
      expect(
        Boolean(ignoreTile()),
        `tile and sheet disagree with shutOff=${shutOff}`,
      ).toBe(sheetWouldRender)
    }
  })
})
