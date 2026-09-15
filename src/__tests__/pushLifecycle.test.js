// Push notification lifecycle wiring tests.
//
// Covers the integration points that were broken across the recent fix
// rounds:
//   1. Sim alert overlay applied to systems (getSystemById)
//   2. valveOverride applied so Shutoff renders correctly
//   3. Timeline grows with the simulatedEvents log (getLifeEventsForSystem)
//   4. Warning push resets the events log; other states append
//   5. Lifecycle: Warning -> Ongoing -> Shutoff -> Ended sequence preserves
//      startedAt and builds the events log correctly
//
// Strategy: stub localStorage globally, then drive the real exported APIs
// (applyPushEvent, getSystemById, getLifeEventsForSystem) the way the app
// does. We don't go through React; the wiring lives in the data layer.

import { describe, it, expect, beforeEach } from 'vitest';

// ─── localStorage stub ──────────────────────────────────────────────────────
function makeStorageStub() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
    clear: () => { data.clear(); },
    key: (i) => Array.from(data.keys())[i] || null,
    get length() { return data.size; },
    _data: data,
  };
}

globalThis.localStorage = makeStorageStub();

// ─── Imports (after stub is in place) ───────────────────────────────────────
const {
  setSimulatedAlert,
  getSimulatedAlert,
  clearSimulatedAlert,
  clearAllSimulatedAlerts,
  reloadSimulatedAlerts,
} = await import('../data/simulatedAlerts.js');
const {
  appendSimulatedEvent,
  getSimulatedEvents,
  clearAllSimulatedEvents,
} = await import('../data/simulatedEvents.js');
const { applyPushEvent } = await import('../lib/pushEvents.js');
const { getSystemById } = await import('../data/systems.js');
const { getLifeEventsForSystem } = await import('../data/lifeEvents.js');
import { LOW_FLOW_VALVE_ERROR } from './fixtures';

// Pick a system that exists in the static mock data for our tests.
const TEST_SYS_ID = LOW_FLOW_VALVE_ERROR; // static leak-low alert + valve in error

beforeEach(() => {
  globalThis.localStorage = makeStorageStub();
  clearAllSimulatedAlerts();
  clearAllSimulatedEvents();
  reloadSimulatedAlerts();
});

// ─── simulatedAlerts roundtrip ──────────────────────────────────────────────

describe('simulatedAlerts store', () => {
  it('round-trips a sim alert through localStorage', () => {
    setSimulatedAlert(TEST_SYS_ID, {
      type: 'leak-high',
      flowRate: '22.5 L/min',
      volume: '18 L',
      startedAt: '09:41',
      phase: 'warning',
    });
    reloadSimulatedAlerts();
    const got = getSimulatedAlert(TEST_SYS_ID);
    expect(got).toBeTruthy();
    expect(got.type).toBe('leak-high');
    expect(got.flowRate).toBe('22.5 L/min');
    expect(got.volume).toBe('18 L');
    expect(got.phase).toBe('warning');
  });

  it('clearSimulatedAlert removes the entry', () => {
    setSimulatedAlert(TEST_SYS_ID, { type: 'leak-high', startedAt: '09:41' });
    clearSimulatedAlert(TEST_SYS_ID);
    reloadSimulatedAlerts();
    expect(getSimulatedAlert(TEST_SYS_ID)).toBeNull();
  });
});

// ─── getSystemById overlay ──────────────────────────────────────────────────

describe('getSystemById sim alert overlay', () => {
  it('overlays the sim alert on top of static sys.alert', () => {
    setSimulatedAlert(TEST_SYS_ID, {
      type: 'leak-high',  // static is leak-low
      flowRate: '22.5 L/min',
      volume: '18 L',
      startedAt: '09:41',
      phase: 'warning',
    });
    const sys = getSystemById(TEST_SYS_ID);
    expect(sys.alert.type).toBe('leak-high');
    expect(sys.alert.phase).toBe('warning');
  });

  it('returns static state when no sim alert is set', () => {
    const sys = getSystemById(TEST_SYS_ID);
    // This system carries a static leak-low alert.
    expect(sys.alert.type).toBe('leak-low');
  });

  it('applies valveOverride from the sim alert to sys.valve', () => {
    // Without valveOverride - sys.valve stays 'error' (its static value)
    setSimulatedAlert(TEST_SYS_ID, { type: 'leak-high', phase: 'warning' });
    let sys = getSystemById(TEST_SYS_ID);
    expect(sys.valve).toBe('error');

    // With valveOverride='closed' - sys.valve flips to closed (drives the
    // Water Event widget into Shut-Off rendering via deriveLifecycle).
    setSimulatedAlert(TEST_SYS_ID, {
      type: 'leak-high', phase: 'shutoff', valveOverride: 'closed',
    });
    sys = getSystemById(TEST_SYS_ID);
    expect(sys.valve).toBe('closed');

    // With valveOverride='closing' - valve in transition.
    setSimulatedAlert(TEST_SYS_ID, {
      type: 'leak-high', phase: 'shutoff', valveOverride: 'closing',
    });
    sys = getSystemById(TEST_SYS_ID);
    expect(sys.valve).toBe('closing');
  });
});

// ─── lifeEvents (Activity timeline) reads from the simulatedEvents log ─────

describe('getLifeEventsForSystem with simulatedEvents log', () => {
  it('emits one timeline row per appended sim event', () => {
    appendSimulatedEvent(TEST_SYS_ID, { type: 'leak-detected-high', title: 'High-flow Water Event detected', timestamp: '09:41', detail: 'Flow 22.5 L/min, vol 18 L' });
    appendSimulatedEvent(TEST_SYS_ID, { type: 'leak-ongoing',       title: 'Ongoing reminder fired',         timestamp: '09:56', detail: 'Vol 42 L' });
    appendSimulatedEvent(TEST_SYS_ID, { type: 'leak-shutoff',       title: 'Shutoff level reached',          timestamp: '10:14', detail: 'Vol 80 L' });
    const rows = getLifeEventsForSystem(TEST_SYS_ID);
    const simRows = rows.filter(r => r.id.startsWith('sim_'));
    expect(simRows.length).toBe(3);
    const titles = simRows.map(r => r.title);
    expect(titles).toEqual(expect.arrayContaining([
      'High-flow Water Event detected',
      'Ongoing reminder fired',
      'Shutoff level reached',
    ]));
  });

  it('emits no sim row when no sim event has been appended', () => {
    const rows = getLifeEventsForSystem(TEST_SYS_ID);
    const simRows = rows.filter(r => r.id.startsWith('sim_'));
    expect(simRows.length).toBe(0);
  });

  it('marks the Water Event ended row as resolved', () => {
    appendSimulatedEvent(TEST_SYS_ID, { type: 'leak-detected-high', title: 'High-flow Water Event detected', timestamp: '09:41', detail: 'Detected' });
    appendSimulatedEvent(TEST_SYS_ID, { type: 'leak-resolved-we',   title: 'Water Event ended',              timestamp: '11:55', detail: 'Total 86 L' });
    const rows = getLifeEventsForSystem(TEST_SYS_ID);
    const resolvedRow = rows.find(r => r.title === 'Water Event ended');
    expect(resolvedRow).toBeTruthy();
    expect(resolvedRow.resolved).toBe(true);
  });
});

// ─── Lifecycle via applyPushEvent (end-to-end through the real handler) ────

describe('lifecycle: Warning -> Ongoing -> Shutoff -> Ended via applyPushEvent', () => {
  function push(state, extra = {}) {
    applyPushEvent({
      type: 'push',
      payload: { type: 'leak', state, severity: 'High Flow', systemId: TEST_SYS_ID, ...extra },
    });
  }

  it('Warning sets type, KPIs, and starts the events log', () => {
    push('Warning', { flowRate: '22.5 L/min', volume: '18 L' });
    const sim = getSimulatedAlert(TEST_SYS_ID);
    expect(sim.type).toBe('leak-high');
    expect(sim.phase).toBe('warning');
    expect(sim.flowRate).toBe('22.5 L/min');
    expect(sim.volume).toBe('18 L');
    expect(getSimulatedEvents(TEST_SYS_ID)).toHaveLength(1);
  });

  it('Ongoing preserves startedAt + leak type, appends to events', () => {
    push('Warning', { flowRate: '22.5 L/min', volume: '18 L' });
    const startedAt = getSimulatedAlert(TEST_SYS_ID).startedAt;
    push('Ongoing', { volume: '42 L' });
    const sim = getSimulatedAlert(TEST_SYS_ID);
    expect(sim.startedAt).toBe(startedAt);
    expect(sim.type).toBe('leak-high');
    expect(sim.phase).toBe('ongoing');
    expect(sim.volume).toBe('42 L');
    expect(getSimulatedEvents(TEST_SYS_ID)).toHaveLength(2);
  });

  it('Shutoff sets valveOverride, appends, drives widget Shut-Off', () => {
    push('Warning');
    push('Ongoing');
    push('Shutoff');
    const sim = getSimulatedAlert(TEST_SYS_ID);
    expect(sim.phase).toBe('shutoff');
    expect(sim.valveOverride).toBe('closed');
    expect(getSimulatedEvents(TEST_SYS_ID)).toHaveLength(3);
    const sys = getSystemById(TEST_SYS_ID);
    expect(sys.valve).toBe('closed');
  });

  it('Ended marks resolved=true, appends, preserves the full events log', () => {
    push('Warning');
    push('Ongoing');
    push('Shutoff');
    push('End of Leak', { volume: '86 L', duration: '2h 14m' });
    const sim = getSimulatedAlert(TEST_SYS_ID);
    expect(sim.resolved).toBe(true);
    expect(sim.phase).toBe('ended');
    expect(getSimulatedEvents(TEST_SYS_ID)).toHaveLength(4);
    const rows = getLifeEventsForSystem(TEST_SYS_ID);
    const simRows = rows.filter(r => r.id.startsWith('sim_'));
    expect(simRows).toHaveLength(4);
  });

  it('Activity timeline grows with each push', () => {
    push('Warning');
    let rows = getLifeEventsForSystem(TEST_SYS_ID).filter(r => r.id.startsWith('sim_'));
    expect(rows).toHaveLength(1);

    push('Ongoing');
    rows = getLifeEventsForSystem(TEST_SYS_ID).filter(r => r.id.startsWith('sim_'));
    expect(rows).toHaveLength(2);

    push('Shutoff');
    rows = getLifeEventsForSystem(TEST_SYS_ID).filter(r => r.id.startsWith('sim_'));
    expect(rows).toHaveLength(3);

    push('End of Leak');
    rows = getLifeEventsForSystem(TEST_SYS_ID).filter(r => r.id.startsWith('sim_'));
    expect(rows).toHaveLength(4);
  });
});

// ─── Sticky-state regressions ───────────────────────────────────────────────
// Catches 'first push looks like it was already ignored' and 'On it'
// propagation bugs from the last rounds.

describe('Warning resets stale lifecycle flags', () => {
  it('a new Warning wipes the prior events log + resets valveOverride', () => {
    // Prior event ended with shutoff + valve closed.
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: TEST_SYS_ID } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Shutoff', severity: 'High Flow', systemId: TEST_SYS_ID } });
    expect(getSimulatedEvents(TEST_SYS_ID)).toHaveLength(2);
    expect(getSimulatedAlert(TEST_SYS_ID).valveOverride).toBe('closed');

    // New Warning fires on the same system - reset.
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: TEST_SYS_ID } });
    const sim = getSimulatedAlert(TEST_SYS_ID);
    expect(sim.phase).toBe('warning');
    expect(sim.valveOverride).toBeUndefined();
    expect(getSimulatedEvents(TEST_SYS_ID)).toHaveLength(1);
    // System.valve falls back to static state since no valveOverride.
    const sys = getSystemById(TEST_SYS_ID);
    expect(sys.valve).not.toBe('closed');
  });
});

// ─── investigatingStore + ignoredIncidents reload behavior ──────────────────

describe('cross-tab store freshness', () => {
  it('isInvestigating re-reads from localStorage on every call', async () => {
    const { isInvestigating, startInvestigating, stopInvestigating } = await import('../data/investigatingStore.js');
    startInvestigating(TEST_SYS_ID, { actor: 'Sarah' });
    expect(isInvestigating(TEST_SYS_ID)).toBe(true);
    localStorage.removeItem('pulse2-investigating');
    expect(isInvestigating(TEST_SYS_ID)).toBe(false);
    stopInvestigating(TEST_SYS_ID);
  });

  it('isIgnored re-reads from localStorage on every call', async () => {
    const { isIgnored, ignoreIncident, clearIgnored } = await import('../data/ignoredIncidents.js');
    ignoreIncident(TEST_SYS_ID, { ignoredBy: 'Sarah' });
    expect(isIgnored(TEST_SYS_ID)).toBe(true);
    localStorage.removeItem('pulse2-ignored-incidents');
    expect(isIgnored(TEST_SYS_ID)).toBe(false);
    clearIgnored(TEST_SYS_ID);
  });
});
