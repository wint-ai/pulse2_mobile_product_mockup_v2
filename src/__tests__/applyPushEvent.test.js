// Tests for the unified push event handler.
//
// applyPushEvent is the ONLY writer of localStorage for push events. Both the
// sender (ControlPanel) and the receiver (PushNotifications) route their
// events through it. These tests cover every push type Rami can fire and
// verify the resulting localStorage state.

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

const { applyPushEvent, applyDemoReset } = await import('../lib/pushEvents.js');
const { getSimulatedAlert } = await import('../data/simulatedAlerts.js');
const { getSimulatedEvents } = await import('../data/simulatedEvents.js');
const { ignoreIncident, isIgnored } = await import('../data/ignoredIncidents.js');
const { startInvestigating, isInvestigating } = await import('../data/investigatingStore.js');
import { APT_CLEAR, APT_WITH_EVENT } from './fixtures';

const SYS = 'test_sys_1';

function pushPayload(state, extra = {}) {
  return {
    type: 'push',
    payload: {
      type: 'leak',
      state,
      severity: 'High Flow',
      systemId: SYS,
      ...extra,
    },
  };
}

beforeEach(() => {
  globalThis.localStorage = makeStorageStub();
});

// ─── Water event lifecycle (the core flow) ──────────────────────────────────

describe('water event lifecycle through applyPushEvent', () => {
  it('Warning sets sim alert with phase=warning + starts events log', () => {
    applyPushEvent(pushPayload('Warning', {
      v10_9_id: 'WA_01', flowRate: '22.5 L/min', volume: '18 L',
    }));
    const sim = getSimulatedAlert(SYS);
    expect(sim).toBeTruthy();
    expect(sim.type).toBe('leak-high');
    expect(sim.phase).toBe('warning');
    expect(sim.flowRate).toBe('22.5 L/min');
    expect(sim.volume).toBe('18 L');
    expect(getSimulatedEvents(SYS)).toHaveLength(1);
    expect(getSimulatedEvents(SYS)[0].title).toMatch(/High-flow Water Event detected/);
  });

  it('Ongoing preserves startedAt + appends row + updates phase', () => {
    applyPushEvent(pushPayload('Warning', { flowRate: '22.5 L/min', volume: '18 L' }));
    const warningSim = getSimulatedAlert(SYS);
    const originalStart = warningSim.startedAt;

    applyPushEvent(pushPayload('Ongoing', { volume: '42 L' }));
    const sim = getSimulatedAlert(SYS);
    expect(sim.startedAt).toBe(originalStart); // preserved
    expect(sim.phase).toBe('ongoing');
    expect(sim.volume).toBe('42 L');
    expect(getSimulatedEvents(SYS)).toHaveLength(2);
    expect(getSimulatedEvents(SYS)[1].title).toMatch(/Ongoing reminder/);
  });

  it('Shutoff sets valveOverride=closed + appends row', () => {
    applyPushEvent(pushPayload('Warning', { flowRate: '22.5 L/min', volume: '18 L' }));
    applyPushEvent(pushPayload('Shutoff', { volume: '80 L' }));
    const sim = getSimulatedAlert(SYS);
    expect(sim.phase).toBe('shutoff');
    expect(sim.valveOverride).toBe('closed');
    expect(getSimulatedEvents(SYS)).toHaveLength(2);
    expect(getSimulatedEvents(SYS)[1].title).toMatch(/Shutoff level reached/);
  });

  it('VC_S_02 (valve closing) sets valveOverride=closing', () => {
    applyPushEvent(pushPayload('Warning', { flowRate: '22.5 L/min', volume: '18 L' }));
    applyPushEvent(pushPayload('Shutoff', { v10_9_id: 'VC_S_02' }));
    const sim = getSimulatedAlert(SYS);
    expect(sim.valveOverride).toBe('closing');
    const log = getSimulatedEvents(SYS);
    expect(log[log.length - 1].title).toMatch(/Valve started closing/);
  });

  it('VC_OK_02 (valve closed) sets valveOverride=closed', () => {
    applyPushEvent(pushPayload('Warning', { flowRate: '22.5 L/min', volume: '18 L' }));
    applyPushEvent(pushPayload('Shutoff', { v10_9_id: 'VC_S_02' }));
    applyPushEvent(pushPayload('Shutoff', { v10_9_id: 'VC_OK_02' }));
    const sim = getSimulatedAlert(SYS);
    expect(sim.valveOverride).toBe('closed');
    const log = getSimulatedEvents(SYS);
    expect(log[log.length - 1].title).toMatch(/Valve closed successfully/);
  });

  it('End of Leak marks resolved=true + preserves full events log', () => {
    applyPushEvent(pushPayload('Warning', { flowRate: '22.5 L/min', volume: '18 L' }));
    applyPushEvent(pushPayload('Ongoing', { volume: '42 L' }));
    applyPushEvent(pushPayload('Shutoff', { volume: '80 L' }));
    applyPushEvent(pushPayload('End of Leak', { volume: '86 L', duration: '2h 14m' }));
    const sim = getSimulatedAlert(SYS);
    expect(sim.resolved).toBe(true);
    expect(sim.phase).toBe('ended');
    const log = getSimulatedEvents(SYS);
    expect(log).toHaveLength(4);
    expect(log[3].title).toMatch(/Water Event ended/);
  });

  it('full lifecycle (W -> O -> S -> VC_S -> VC_OK -> E) leaves 6 events', () => {
    applyPushEvent(pushPayload('Warning'));
    applyPushEvent(pushPayload('Ongoing'));
    applyPushEvent(pushPayload('Shutoff'));
    applyPushEvent(pushPayload('Shutoff', { v10_9_id: 'VC_S_02' }));
    applyPushEvent(pushPayload('Shutoff', { v10_9_id: 'VC_OK_02' }));
    applyPushEvent(pushPayload('End of Leak'));
    const sim = getSimulatedAlert(SYS);
    expect(getSimulatedEvents(SYS)).toHaveLength(6);
    expect(sim.resolved).toBe(true);
  });
});

// ─── New Warning clears prior flags (the bug Rami kept hitting) ─────────────

describe('Warning clears prior Ignored / Investigating flags', () => {
  it('clearing Ignored on the same system when a new Warning fires', () => {
    // Old event was ignored
    ignoreIncident(SYS, { ignoredBy: 'Sarah' });
    expect(isIgnored(SYS)).toBe(true);

    // New Warning push
    applyPushEvent(pushPayload('Warning'));

    expect(isIgnored(SYS)).toBe(false);
  });

  it('clearing Investigating on the same system when a new Warning fires', () => {
    startInvestigating(SYS, { actor: 'Sarah' });
    expect(isInvestigating(SYS)).toBe(true);

    applyPushEvent(pushPayload('Warning'));

    expect(isInvestigating(SYS)).toBe(false);
  });

  it('Ongoing / Shutoff / Ended do NOT clear prior Ignored', () => {
    applyPushEvent(pushPayload('Warning'));
    ignoreIncident(SYS, { ignoredBy: 'Sarah' });
    expect(isIgnored(SYS)).toBe(true);

    // Subsequent pushes for the SAME event should NOT clear the ignore.
    applyPushEvent(pushPayload('Ongoing'));
    expect(isIgnored(SYS)).toBe(true);
    applyPushEvent(pushPayload('Shutoff'));
    expect(isIgnored(SYS)).toBe(true);
    applyPushEvent(pushPayload('End of Leak'));
    expect(isIgnored(SYS)).toBe(true);
  });

  it('a new Warning resets the events log (new event)', () => {
    applyPushEvent(pushPayload('Warning'));
    applyPushEvent(pushPayload('Ongoing'));
    applyPushEvent(pushPayload('Shutoff'));
    expect(getSimulatedEvents(SYS)).toHaveLength(3);

    // Second event starts on the same system
    applyPushEvent(pushPayload('Warning'));
    const sim = getSimulatedAlert(SYS);
    expect(getSimulatedEvents(SYS)).toHaveLength(1);
    expect(sim.phase).toBe('warning');
    expect(sim.valveOverride).toBeUndefined();
  });
});

// ─── Non-water alerts ───────────────────────────────────────────────────────

describe('non-water alerts', () => {
  it('valve-error sets a valve-error sim alert', () => {
    applyPushEvent({ type: 'push', payload: { type: 'valve-error', systemId: SYS, title: 'Valve Error' } });
    const sim = getSimulatedAlert(SYS);
    expect(sim.type).toBe('valve-error');
    expect(sim.label).toBe('Valve Error');
  });

  it('offline sets an offline sim alert', () => {
    applyPushEvent({ type: 'push', payload: { type: 'offline', systemId: SYS, title: 'Device offline' } });
    const sim = getSimulatedAlert(SYS);
    expect(sim.type).toBe('offline');
  });

  it('power-lost sets a power-lost sim alert', () => {
    applyPushEvent({ type: 'push', payload: { type: 'power-lost', systemId: SYS, title: 'AC power lost' } });
    const sim = getSimulatedAlert(SYS);
    expect(sim.type).toBe('power-lost');
  });
});

// ─── Closure pushes ─────────────────────────────────────────────────────────

describe('closure pushes clear the sim alert', () => {
  it('online clears an offline sim alert', () => {
    applyPushEvent({ type: 'push', payload: { type: 'offline', systemId: SYS, title: 'offline' } });
    expect(getSimulatedAlert(SYS)).toBeTruthy();
    applyPushEvent({ type: 'push', payload: { type: 'online', systemId: SYS } });
    expect(getSimulatedAlert(SYS)).toBeNull();
  });

  it('power-restored clears a power-lost sim alert', () => {
    applyPushEvent({ type: 'push', payload: { type: 'power-lost', systemId: SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'power-restored', systemId: SYS } });
    expect(getSimulatedAlert(SYS)).toBeNull();
  });

  it('valve-error-cleared clears a valve-error sim alert', () => {
    applyPushEvent({ type: 'push', payload: { type: 'valve-error', systemId: SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'valve-error-cleared', systemId: SYS } });
    expect(getSimulatedAlert(SYS)).toBeNull();
  });
});

// ─── Demo reset ─────────────────────────────────────────────────────────────

describe('applyDemoReset wipes all demo state', () => {
  it('removes sim alerts, ignored, investigating, tags', () => {
    applyPushEvent(pushPayload('Warning'));
    ignoreIncident(SYS);
    startInvestigating(SYS, { actor: 'Sarah' });
    expect(getSimulatedAlert(SYS)).toBeTruthy();
    expect(isIgnored(SYS)).toBe(true);
    expect(isInvestigating(SYS)).toBe(true);

    applyDemoReset();

    expect(getSimulatedAlert(SYS)).toBeNull();
    expect(isIgnored(SYS)).toBe(false);
    expect(isInvestigating(SYS)).toBe(false);
  });
});

// ─── Idempotency / safety ──────────────────────────────────────────────────

// ─── End-to-end: applyPushEvent + getLifeEventsForSystem ──────────────────
// Mirrors what the React app does: ControlPanel fires applyPushEvent, then
// the user navigates to the System page Timeline tab which calls
// getLifeEventsForSystem. The timeline row MUST appear.

describe('end-to-end: push -> Timeline row appears', () => {
  // Use a real system from the static mock data so getLifeEventsForSystem
  // has a base cache to merge into.
  const REAL_SYS = APT_WITH_EVENT;

  it('after a Warning push, the Timeline shows the new event', async () => {
    const { getLifeEventsForSystem } = await import('../data/lifeEvents.js');

    // Baseline: count existing rows on this system (static history etc).
    const before = getLifeEventsForSystem(REAL_SYS) || [];
    const beforeSim = before.filter(r => r.id?.startsWith?.('sim_')).length;
    expect(beforeSim).toBe(0);

    // Fire a Warning push end-to-end through the unified handler.
    applyPushEvent({
      type: 'push',
      payload: {
        type: 'leak', state: 'Warning', severity: 'High Flow',
        systemId: REAL_SYS, v10_9_id: 'WA_01',
        flowRate: '22.5 L/min', volume: '18 L',
      },
    });

    // The Timeline (getLifeEventsForSystem) must now include the row.
    const after = getLifeEventsForSystem(REAL_SYS) || [];
    const afterSim = after.filter(r => r.id?.startsWith?.('sim_'));
    expect(afterSim.length).toBe(1);
    expect(afterSim[0].title).toMatch(/High-flow Water Event detected/);
    expect(afterSim[0].detail).toMatch(/22.5 L/);
  });

  it('after Warning -> Ongoing -> Shutoff, Timeline shows all 3 rows', async () => {
    const { getLifeEventsForSystem } = await import('../data/lifeEvents.js');

    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: REAL_SYS, flowRate: '22 L/min', volume: '18 L' } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Ongoing', severity: 'High Flow', systemId: REAL_SYS, volume: '42 L' } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Shutoff', severity: 'High Flow', systemId: REAL_SYS, volume: '80 L' } });

    const rows = getLifeEventsForSystem(REAL_SYS).filter(r => r.id?.startsWith?.('sim_'));
    expect(rows.length).toBe(3);
    expect(rows.map(r => r.title)).toEqual([
      'High-flow Water Event detected',
      'Ongoing reminder fired',
      'Shutoff level reached',
    ]);
  });

  it('full lifecycle leaves 6 rows on the Timeline', async () => {
    const { getLifeEventsForSystem } = await import('../data/lifeEvents.js');

    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning',  severity: 'High Flow', systemId: REAL_SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Ongoing',  severity: 'High Flow', systemId: REAL_SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Shutoff',  severity: 'High Flow', systemId: REAL_SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Shutoff',  severity: 'High Flow', systemId: REAL_SYS, v10_9_id: 'VC_S_02' } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Shutoff',  severity: 'High Flow', systemId: REAL_SYS, v10_9_id: 'VC_OK_02' } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'End of Leak', severity: 'High Flow', systemId: REAL_SYS } });

    const rows = getLifeEventsForSystem(REAL_SYS).filter(r => r.id?.startsWith?.('sim_'));
    expect(rows.length).toBe(6);
  });
});

describe('safety checks', () => {
  it('ignores non-push events', () => {
    const before = getSimulatedAlert(SYS);
    applyPushEvent({ type: 'data-changed' });
    applyPushEvent({ type: 'phone-persona' });
    applyPushEvent(null);
    applyPushEvent(undefined);
    applyPushEvent({});
    const after = getSimulatedAlert(SYS);
    expect(after).toEqual(before);
  });

  it('ignores push events without systemId', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning' } });
    expect(getSimulatedAlert(SYS)).toBeNull();
  });

  it('returns true when state was mutated, false otherwise', () => {
    expect(applyPushEvent(pushPayload('Warning'))).toBe(true);
    expect(applyPushEvent({ type: 'data-changed' })).toBe(false);
    expect(applyPushEvent({ type: 'push', payload: { type: 'unknown-thing', systemId: SYS } })).toBe(false);
  });
});

// ─── Mock-suppressed flag set by Clear button ─────────────────────────────
// applyDemoReset() flips localStorage 'pulse2-mock-suppressed' = '1' so
// every system reads as clean (no pre-populated alerts, no incidents, no
// history) until the user clears localStorage entirely.

describe('applyDemoReset sets mock-suppressed flag (Rami 2026-06-06)', () => {
  it('sets the mock-suppressed localStorage flag', async () => {
    const { isMockSuppressed } = await import('../data/systems.js');
    expect(isMockSuppressed()).toBe(false);
    applyDemoReset();
    expect(isMockSuppressed()).toBe(true);
  });

  it('suppressed: getSystemById returns alert=null even for systems with static alerts', async () => {
    const { getSystemById } = await import('../data/systems.js');
    // This system has a static leak-low alert.
    const before = getSystemById(APT_WITH_EVENT);
    expect(before.alert).not.toBeNull();
    applyDemoReset();
    const after = getSystemById(APT_WITH_EVENT);
    expect(after.alert).toBeNull();
  });

  it('suppressed: every status field on every system reads as clean', async () => {
    const { getSystemById, SYSTEMS } = await import('../data/systems.js');
    applyDemoReset();
    // Walk every static system that has SOMETHING bad in mock data and
    // verify the overlay surface shows it as healthy.
    const dirty = SYSTEMS.filter(s =>
      s.alert || s.valve === 'error' || s.valve === 'closed' ||
      s.valve === 'disconnected' || s.comm === 'offline' ||
      s.power === 'ac-lost' || s.power === 'battery' || s.offline === true);
    expect(dirty.length).toBeGreaterThan(0); // sanity - some mock systems ARE dirty
    for (const s of dirty) {
      const overlaid = getSystemById(s.id);
      expect(overlaid.alert).toBeNull();
      if (s.valve != null) expect(overlaid.valve).toBe('open');
      expect(overlaid.comm).toBe('online');
      if (s.power != null) expect(overlaid.power).toBe('ac');
      expect(overlaid.offline).toBe(false);
    }
  });

  it('suppressed + Warning push: that one system shows the push, others stay clean', async () => {
    const { getSystemById } = await import('../data/systems.js');
    applyDemoReset();
    // Fire on Sea View specifically (the default SYS=test_sys_1 isn't a
    // real system in mock data, so the alert overlay can't be observed).
    applyPushEvent({
      type: 'push',
      payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: APT_WITH_EVENT },
    });
    expect(getSystemById(APT_WITH_EVENT).alert).not.toBeNull();
    // Leumi Tower had a static alert too - should still be suppressed.
    expect(getSystemById(APT_CLEAR).alert).toBeNull();
  });
});
