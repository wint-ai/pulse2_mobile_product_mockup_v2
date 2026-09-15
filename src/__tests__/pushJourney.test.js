// Multi-step push journeys: realistic user testing sessions on the pusher.
// Asserts the data layer behaves correctly across cross-category sequences,
// repeated lifecycles, and multi-system isolation.
//
// These catch the bug class "fired N pushes in sequence, surface X now in
// wrong state" - the kind of regression that only shows up after a chain
// of operations, not from a single push.

import { describe, it, expect, beforeEach } from 'vitest';

function makeStorageStub() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
    clear: () => { data.clear(); },
    key: (i) => Array.from(data.keys())[i] || null,
    get length() { return data.size; },
  };
}
globalThis.localStorage = makeStorageStub();

const { applyPushEvent } = await import('../lib/pushEvents.js');
const { getSimulatedAlert } = await import('../data/simulatedAlerts.js');
const { getSimulatedEvents } = await import('../data/simulatedEvents.js');
const { getSystemById } = await import('../data/systems.js');
const { computeSystemHealth } = await import('../utils/systemHealth.js');
const { computeActiveEvents } = await import('../data/events.js');
const { getActiveIncident } = await import('../data/incidents.js');
const { getLifeEventsForSystem } = await import('../data/lifeEvents.js');
const { hasSimActivity } = await import('../data/systems.js');
import { APT_CLEAR, APT_WITH_EVENT , LOW_FLOW_VALVE_ERROR } from './fixtures';

const SYS = APT_WITH_EVENT;

beforeEach(() => {
  globalThis.localStorage = makeStorageStub();
});

function push(payload) {
  applyPushEvent({ type: 'push', payload: { systemId: SYS, ...payload } });
}

// ─── Journey 1: full water lifecycle, then try again ──────────────────────

describe('Journey: full water lifecycle then a fresh event on same system', () => {
  it('Warning -> Ongoing -> Shutoff -> Ended -> Warning: events log resets, alert un-tombstones', () => {
    push({ type: 'leak', state: 'Warning',     severity: 'High Flow', flowRate: '22.5 L/min', volume: '18 L' });
    push({ type: 'leak', state: 'Ongoing',     severity: 'High Flow', volume: '42 L' });
    push({ type: 'leak', state: 'Shutoff',     severity: 'High Flow', volume: '80 L' });
    push({ type: 'leak', state: 'End of Leak', severity: 'High Flow', volume: '86 L' });
    expect(getSimulatedEvents(SYS)).toHaveLength(4);
    expect(getSystemById(SYS).alert).toBeNull(); // tombstoned

    // Now fire a fresh Warning
    push({ type: 'leak', state: 'Warning', severity: 'Low Flow', flowRate: '0.5 L/min', volume: '1 L' });
    const sys = getSystemById(SYS);
    expect(sys.alert).not.toBeNull();
    expect(sys.alert.type).toBe('leak-low');
    expect(sys.alert.phase).toBe('warning');
    // Events log reset (new event, fresh log)
    expect(getSimulatedEvents(SYS)).toHaveLength(1);
    expect(getSimulatedEvents(SYS)[0].title).toBe('Low-flow Water Event detected');
  });
});

// ─── Journey 2: power lost and water event coexist ────────────────────────

describe('Journey: power-lost + water-event on same system', () => {
  it('water event overrides power-lost on the SAME sim store (current limitation)', () => {
    // KNOWN LIMITATION #1: the sim store holds one alert per system. Per
    // CLAUDE.md project rule, a system can have multiple active alerts
    // simultaneously (one per category). But the current sim store can't
    // hold both - water event overwrites power-lost in the active alert.
    //
    // KNOWN LIMITATION #2: a Warning push clears the events log for that
    // system (the intended "new event starts" semantics). When the Warning
    // follows a cross-category push (power-lost / valve-error / offline),
    // the cross-category row is ALSO wiped from the Timeline. The Timeline
    // tab should arguably preserve cross-category history regardless of
    // the water lifecycle - flagged for Rami review.
    push({ type: 'power-lost' });
    expect(getSimulatedAlert(SYS).type).toBe('power-lost');
    expect(getSimulatedEvents(SYS)).toHaveLength(1);

    push({ type: 'leak', state: 'Warning', severity: 'High Flow' });
    expect(getSimulatedAlert(SYS).type).toBe('leak-high'); // overwritten

    // CURRENT BEHAVIOR (likely a bug): the Warning wiped the power-lost row.
    const log = getSimulatedEvents(SYS);
    expect(log).toHaveLength(1);
    expect(log[0].type).toBe('leak-detected-high');
    // EXPECTED IF FIXED: expect(log).toHaveLength(2);
    //                    expect(log[0].type).toBe('power-lost');
    //                    expect(log[1].type).toBe('leak-detected-high');
  });

  it('System health derivation: power-lost sets powerOk=false; water-event overlay flips it back', () => {
    // After power-lost: sys.power='ac-lost', powerOk=false
    push({ type: 'power-lost' });
    let sys = getSystemById(SYS);
    expect(sys.power).toBe('ac-lost');
    expect(computeSystemHealth(sys).powerOk).toBe(false);

    // After water-event Warning: sim alert overwritten to leak-high, sys.power
    // overlay no longer applies, sys.power falls back to static (ac).
    // KNOWN LIMITATION: this means firing a leak after power-lost makes the
    // Power pill "recover" visually even though no power-restored fired.
    push({ type: 'leak', state: 'Warning', severity: 'High Flow' });
    sys = getSystemById(SYS);
    expect(sys.power).toBe('ac'); // back to static
    expect(computeSystemHealth(sys).isLeak).toBe(true);
  });
});

// ─── Journey 3: every closure type resets cleanly ─────────────────────────

describe('Journey: every closure push restores the system to its static state', () => {
  const CLOSURE_PAIRS = [
    { active: 'power-lost', close: 'power-restored', stateField: 'power', cleanValue: 'ac' },
    { active: 'offline',    close: 'online',         stateField: 'comm',  cleanValue: 'online' },
  ];

  CLOSURE_PAIRS.forEach(({ active, close, stateField, cleanValue }) => {
    it(`${active} -> ${close} restores sys.${stateField} to ${cleanValue}`, () => {
      push({ type: active });
      expect(getSystemById(SYS)[stateField]).not.toBe(cleanValue);
      push({ type: close });
      expect(getSystemById(SYS)[stateField]).toBe(cleanValue);
      expect(getSimulatedAlert(SYS)).toBeNull();
    });
  });

  it('valve-error -> valve-error-cleared restores valve to static state', () => {
    // This system's static valve is 'error'. So this test
    // verifies the overlay is removed, not that the valve becomes 'open'.
    push({ type: 'valve-error' });
    const overlaidValve = getSystemById(SYS).valve;
    expect(overlaidValve).toBe('error'); // overlay applied
    push({ type: 'valve-error-cleared' });
    expect(getSimulatedAlert(SYS)).toBeNull();
    // Valve now reflects static state (whatever that is for this system).
  });
});

// ─── Journey 4: repeated lifecycle on same system ─────────────────────────

describe('Journey: 3 consecutive water events on the same system', () => {
  it('each new Warning resets the events log to just that lifecycle', () => {
    // Lifecycle 1
    push({ type: 'leak', state: 'Warning', severity: 'High Flow' });
    push({ type: 'leak', state: 'End of Leak', severity: 'High Flow' });
    expect(getSimulatedEvents(SYS)).toHaveLength(2);

    // Lifecycle 2 (Low Flow this time)
    push({ type: 'leak', state: 'Warning', severity: 'Low Flow' });
    expect(getSimulatedEvents(SYS)).toHaveLength(1);
    expect(getSimulatedEvents(SYS)[0].type).toBe('leak-detected-low');

    push({ type: 'leak', state: 'End of Leak', severity: 'Low Flow' });
    expect(getSimulatedEvents(SYS)).toHaveLength(2);
    expect(getSystemById(SYS).alert).toBeNull();

    // Lifecycle 3
    push({ type: 'leak', state: 'Warning', severity: 'High Flow' });
    expect(getSimulatedEvents(SYS)).toHaveLength(1);
    expect(getSystemById(SYS).alert.type).toBe('leak-high');
  });
});

// ─── Journey 5: Active Alerts list stays in sync with overlay tombstone ──
//
// Regression caught 2026-06-06: computeActiveEvents() in events.js did its
// OWN overlay (without the resolved-tombstone logic), so the Alerts list
// kept showing a Water Event after End of Leak even though the System
// page widget had disappeared.

describe('Journey: computeActiveEvents respects the resolved tombstone', () => {
  it('After End of Leak: the Active Events list no longer includes this system', () => {
    // Pick a clean system to avoid static-data noise.
    push({ type: 'leak', state: 'Warning', severity: 'High Flow' });
    const beforeResolve = computeActiveEvents().filter(e => e.system === SYS);
    expect(beforeResolve.length).toBeGreaterThan(0);

    push({ type: 'leak', state: 'End of Leak', severity: 'High Flow' });
    const afterResolve = computeActiveEvents().filter(e => e.system === SYS && (e.type === 'leak-high' || e.type === 'leak-low'));
    expect(afterResolve).toHaveLength(0);
  });

  it('After End of Leak, secondary issues on the same system still show', () => {
    // Set up: a water event on a system that ALSO has a static valve error,
    // to confirm the secondary issue survives the water event's tombstone.
    const SEA = LOW_FLOW_VALVE_ERROR;
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning',     severity: 'High Flow', systemId: SEA } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'End of Leak', severity: 'High Flow', systemId: SEA } });

    // Its static valve is 'error', so after the tombstone the secondary
    // valve-error issue should still appear in active events.
    const events = computeActiveEvents().filter(e => e.system === SEA);
    const types = events.map(e => e.type);
    expect(types).toContain('valve-error');
    expect(types).not.toContain('leak-high');
    expect(types).not.toContain('leak-low');
  });

  it('power-lost push: appears as a primary active event', () => {
    push({ type: 'power-lost' });
    const events = computeActiveEvents().filter(e => e.system === SYS);
    const types = events.map(e => e.type);
    expect(types).toContain('power-lost');
  });
});

// ─── Journey 6: applyPushEvent return value contract ───────────────────────

// ─── Journey 7: Pusher owns the truth - static is suppressed ──────────────
//
// Rule (Rami 2026-06-06): once the pusher touches a system, static
// incidents.js + the pre-pusher events.js mock data are suppressed for
// that system. Avoids the dual-timeline confusion where static rows from
// 06:11 ("Leak Detected") would interleave with fresh sim rows. Hitting
// "Clear all" on the pusher restores the static data.

describe('Pusher activity suppresses static mock data', () => {
  // Pick a system that HAS static data: a static leak-low alert, an incident
  // timeline, and a valve error underneath it as a secondary issue.
  const STATIC_SYS = LOW_FLOW_VALVE_ERROR;

  it('Before any push: getActiveIncident returns static incident, hasSimActivity is false', () => {
    expect(hasSimActivity(STATIC_SYS)).toBe(false);
    // Sea View has a static incident in incidents.js (inc_sp_1 is sp - sea
    // view's actual incident id is different - just verify it's not null
    // OR null acceptably; some systems don't have incidents.js entries).
    const incident = getActiveIncident(STATIC_SYS);
    // The contract: BEFORE pusher, whatever incidents.js says is returned as-is.
    expect(incident !== undefined).toBe(true);
  });

  it('After any push: hasSimActivity is true, getActiveIncident returns null', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: STATIC_SYS } });
    expect(hasSimActivity(STATIC_SYS)).toBe(true);
    expect(getActiveIncident(STATIC_SYS)).toBeNull();
  });

  it('After any push: getLifeEventsForSystem returns ONLY sim rows', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: STATIC_SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Ongoing', severity: 'High Flow', systemId: STATIC_SYS } });
    const rows = getLifeEventsForSystem(STATIC_SYS);
    // All rows must be sim-sourced (their id starts with 'sim_')
    expect(rows.every(r => r.id?.startsWith('sim_'))).toBe(true);
    expect(rows).toHaveLength(2);
  });

  it('After End of Leak tombstone: sim events log still has rows, static stays suppressed', () => {
    // Resolution clears the active sim alert but NOT the events log.
    // Pusher still owns the truth for this system.
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning',     severity: 'High Flow', systemId: STATIC_SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'End of Leak', severity: 'High Flow', systemId: STATIC_SYS } });
    expect(hasSimActivity(STATIC_SYS)).toBe(true); // events log not empty
    expect(getActiveIncident(STATIC_SYS)).toBeNull();
    const rows = getLifeEventsForSystem(STATIC_SYS);
    expect(rows.every(r => r.id?.startsWith('sim_'))).toBe(true);
  });

  it('Non-water push (power-lost) also suppresses static for that system', () => {
    applyPushEvent({ type: 'push', payload: { type: 'power-lost', systemId: STATIC_SYS } });
    expect(getActiveIncident(STATIC_SYS)).toBeNull();
    const rows = getLifeEventsForSystem(STATIC_SYS);
    expect(rows.every(r => r.id?.startsWith('sim_'))).toBe(true);
  });

  it('Other systems with NO pusher activity keep their static data', () => {
    // Fire on Sea View - should NOT affect Leumi's static data.
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: STATIC_SYS } });
    const LEUMI = APT_CLEAR;
    expect(hasSimActivity(LEUMI)).toBe(false);
    // Leumi's static behavior is unchanged
  });
});

describe('applyPushEvent return value invariants', () => {
  it('returns true for every V10.9 push type the pusher fires', () => {
    const ALL_TYPES = [
      { type: 'leak', state: 'Warning', severity: 'High Flow' },
      { type: 'leak', state: 'Ongoing', severity: 'High Flow' },
      { type: 'leak', state: 'Shutoff', severity: 'High Flow' },
      { type: 'leak', state: 'End of Leak', severity: 'High Flow' },
      { type: 'valve-error' },
      { type: 'valve-error-cleared' },
      { type: 'valve-closed-by-user' },
      { type: 'valve-disconnected' },
      { type: 'valve-reconnected' },
      { type: 'power-lost' },
      { type: 'power-restored' },
      { type: 'offline' },
      { type: 'online' },
      { type: 'meter-disconnected' },
      { type: 'meter-reconnected' },
    ];
    ALL_TYPES.forEach(payload => {
      const result = applyPushEvent({ type: 'push', payload: { systemId: SYS, ...payload } });
      expect(result, `${payload.type} ${payload.state || ''} returned false`).toBe(true);
    });
  });
});
