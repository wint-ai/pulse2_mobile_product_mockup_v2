// @vitest-environment happy-dom
//
// THE LOCATION LEVEL AND THE SYSTEM LEVEL MUST DESCRIBE THE SAME FLEET.
//
// ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// The owner, 2026-11-10, on the demo he shows customers:
//
//   "the aggregation on the location level in terms of water events, errors,
//    and stuff like that doesn't reflect the situation on the system level ...
//    I can find an alert on specific system on specific location, and when I go
//    to the system, it doesn't exist there. So it feels like everything is
//    randomly."
//
// It was not random. There were two fleets.
//
//   `SYSTEMS`                 is the GENERATOR'S output (upstream/buildTree).
//   `applySimOverlay(s, sim)` is what the app actually shows: the push
//                             simulator's pushed alerts, its End-of-Leak
//                             tombstones, and the "treat the fleet as clean"
//                             flag (`pulse2-mock-suppressed`).
//
// Every SYSTEM-level surface read the fleet through the overlay — getSystemById,
// the drawer, computeActiveEvents, /alerts, the tab badge. `HomeAllAccounts`,
// which serves BOTH `/` and `/location/:locationName`, built `scopedSystems`
// straight off `SYSTEMS` and skipped it. So the two levels answered "is this
// system alerting" from different data, and because both stores are sticky in
// localStorage, one demo session's pushes poisoned every session after it.
//
// ── WHAT THIS TEST ASSERTS, AND WHY IT IS NOT "EACH RETURNS SOMETHING" ──────
// The invariant is AGREEMENT between the two derivations, checked in the store
// states where they used to disagree. A test that only asserted each side was
// non-empty passed throughout the bug.
//
// It is a data-layer property, not a DOM one: `getOverlaidSystems()` is the
// list the location page walks and `getSystemById(id)` is the record the
// system page renders, so the fleet-wide list must carry, for every id, the
// same record the single lookup resolves. The last case guards the specific
// regression — the page reaching for `SYSTEMS` again — which no data assertion
// can see.

import { describe, it, expect, afterEach } from 'vitest'
/* The page's own source text, for the last case. `?raw` rather than fs +
   __dirname: this file runs under happy-dom, where `import.meta.url` is not a
   file: URL and `fileURLToPath` throws, and `__dirname` does not exist under
   this ESM config at all (eslint no-undef is an error). Vite resolves `?raw`
   the same way tabBarFloatingClearance already relies on. */
import homeAllAccountsSource from '@/v2/pages/HomeAllAccounts.jsx?raw'
import {
  SYSTEMS,
  getOverlaidSystems,
  getSystemById,
  setMockSuppressed,
} from '@/data/systems'
import { setSimulatedAlert, clearAllSimulatedAlerts } from '@/data/simulatedAlerts'
import { computeActiveEvents, computeConfigurationGaps } from '@/data/events'
import { computeSystemHealth } from '@/utils/systemHealth'

/** The fields that decide whether a system is alerting, and how. */
const STATE = (s) => ({
  alert: s?.alert?.type ?? null,
  age: s?.alert?.age ?? null,
  eventId: s?.alert?.eventId ?? null,
  valve: s?.valve ?? null,
  comm: s?.comm ?? null,
  power: s?.power ?? null,
  recipients: s?.notificationRecipients ?? 0,
})

/** HomeAllAccounts' own water-event predicate, over the list it walks. */
const locationWaterEvents = () =>
  getOverlaidSystems()
    .filter((s) => computeSystemHealth(s).isLeak)
    .map((s) => s.id)

/** The system page's own: `isWaterEvent(system.alert)` on getSystemById. */
const systemPageWaterEvents = () =>
  SYSTEMS.map((s) => getSystemById(s.id))
    .filter((s) => s?.alert?.type === 'leak-high' || s?.alert?.type === 'leak-low')
    .map((s) => s.id)

/* The four store states the demo actually reaches. The first is the shipped
   default; the other three are each one of the ways the owner saw the two
   levels disagree, and each failed before 2026-11-10. */
const SCENARIOS = {
  'default demo — no push, no suppression': () => {},

  'the pusher Clear-all flag': () => setMockSuppressed(true),

  'an alert pushed onto a clean system': () => {
    const clean = SYSTEMS.find((s) => !s.alert)
    setSimulatedAlert(clean.id, {
      type: 'leak-high',
      phase: 'warning',
      label: 'High Flow Water Event',
      flowRate: '120 L/h',
      volume: '400L',
      startedAt: '09:00',
      age: '1h 00m',
      resolved: false,
      events: [],
    })
  },

  'an End-of-Leak push tombstoning a live event': () => {
    const leaking = SYSTEMS.find((s) => s.alert?.type === 'leak-low')
    setSimulatedAlert(leaking.id, {
      type: 'leak-low',
      phase: 'ended',
      label: 'Low Flow Water Event',
      startedAt: '09:00',
      age: '3h 00m',
      resolved: true,
      events: [],
    })
  },
}

afterEach(() => {
  clearAllSimulatedAlerts()
  setMockSuppressed(false)
})

describe('the location level and the system level read one fleet', () => {
  for (const [name, arrange] of Object.entries(SCENARIOS)) {
    it(`agrees record for record: ${name}`, () => {
      arrange()

      const fleet = getOverlaidSystems()
      expect(fleet.length, 'empty fleet proves nothing').toBe(SYSTEMS.length)

      /* THE CORE INVARIANT. For every id, the record the LOCATION page walks
         must be the record the SYSTEM page renders. Before the fix this threw
         on the first suppressed or pushed system. */
      for (const s of fleet) {
        expect(STATE(s), `fleet list vs getSystemById disagree about ${s.id}`).toEqual(
          STATE(getSystemById(s.id)),
        )
      }
    })

    it(`lists the same water events on both levels: ${name}`, () => {
      arrange()
      /* The two surfaces' OWN predicates, not a shared helper: the location
         page asks computeSystemHealth().isLeak over its list, the system page
         asks isWaterEvent(system.alert) over getSystemById. They may only
         diverge on ignored events, and nothing here ignores one. */
      expect(locationWaterEvents().sort()).toEqual(systemPageWaterEvents().sort())
    })

    it(`every /alerts row stands on a system that has it: ${name}`, () => {
      arrange()
      const byId = new Map(getOverlaidSystems().map((s) => [s.id, s]))

      for (const ev of computeActiveEvents()) {
        const sys = byId.get(ev.system)
        expect(sys, `/alerts names ${ev.system}, which is not in the fleet`).toBeTruthy()
        /* A row is either the system's PRIMARY alert or one of the three
           secondary dimensions computeActiveEvents derives from device state.
           Either way the system itself must still be carrying it. */
        const standsUp =
          sys.alert?.type === ev.type ||
          (ev.type === 'valve-error' && sys.valve === 'error') ||
          (ev.type === 'offline' && sys.comm === 'offline') ||
          (ev.type === 'power-lost' && sys.power === 'ac-lost')
        expect(
          standsUp,
          `/alerts shows "${ev.type}" on ${ev.system}, whose own record says ` +
            `alert=${sys.alert?.type ?? 'none'} valve=${sys.valve} comm=${sys.comm} power=${sys.power}`,
        ).toBe(true)
      }

      for (const gap of computeConfigurationGaps()) {
        expect(
          byId.get(gap.system)?.notificationRecipients || 0,
          `/alerts claims ${gap.system} has no recipients, its own record disagrees`,
        ).toBe(0)
      }
    })

    it(`the water-event COUNT equals the rows beneath it: ${name}`, () => {
      arrange()
      /* HomeAllAccounts publishes `stats.waterEvents` as `activeWaterEvents
         .length` and the rows as `activeWaterEvents.map(...)`, so this is the
         property that a count and its list come off ONE filter — the "count
         disagrees with the rows beneath it" half of the same report. */
      const ids = locationWaterEvents()
      expect(ids.length).toBe(new Set(ids).size)
      expect(ids.length).toBe(
        getOverlaidSystems().filter((s) => computeSystemHealth(s).isLeak).length,
      )
    })
  }

  it('HomeAllAccounts derives its scope from the overlaid fleet, not from SYSTEMS', () => {
    /* A SOURCE ASSERTION, AND IT IS THE ONLY ONE THAT CATCHES THE REGRESSION.
       The bug was a single identifier on one line of one page. Every data
       assertion above passes with the page reading `SYSTEMS` again, because
       they never mount it. Rendering the page to prove this would need the
       whole app shell; reading the line is cheaper and more direct.
       It is deliberately narrow: it pins the ONE expression, not the file. */
    const src = homeAllAccountsSource
    const body = src.slice(src.indexOf('const scopedSystems = useMemo('))
    const line = body
      .slice(0, body.indexOf('}, [locationName, alertScope])'))
      .split('\n')
      .find((l) => /^\s*const all = /.test(l))

    expect(line, 'the `const all =` line in scopedSystems moved or was renamed').toBeTruthy()
    expect(
      line,
      'scopedSystems is reading the raw SYSTEMS again — that is the two-fleet bug this file exists for',
    ).toContain('getOverlaidSystems()')
  })
})
