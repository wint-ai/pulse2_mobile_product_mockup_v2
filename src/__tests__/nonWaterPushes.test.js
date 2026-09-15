// Tests for the other notification categories (not water events):
// Valve, Power, Communication, Sensors. These are in the V10.9 catalogue
// and the pusher can fire them - they need to update localStorage correctly
// and clear correctly on the closure variants.

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
const { getSystemById, SYSTEMS } = await import('../data/systems.js');
import { APT_CLEAR, APT_WITH_EVENT, HAPPY_PATH_APT } from './fixtures';

const SYS = HAPPY_PATH_APT;

beforeEach(() => {
  globalThis.localStorage = makeStorageStub();
});

describe('Valve error push', () => {
  it('sets a valve-error sim alert', () => {
    applyPushEvent({ type: 'push', payload: { type: 'valve-error', systemId: SYS, title: 'Valve error - Apt 47' } });
    const sim = getSimulatedAlert(SYS);
    expect(sim.type).toBe('valve-error');
    expect(sim.label).toBe('Valve error - Apt 47');
  });

  it('valve-error-cleared closure pushes wipe the alert', () => {
    applyPushEvent({ type: 'push', payload: { type: 'valve-error', systemId: SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'valve-error-cleared', systemId: SYS } });
    expect(getSimulatedAlert(SYS)).toBeNull();
  });
});

describe('Power push', () => {
  it('power-lost sets a power-lost sim alert', () => {
    applyPushEvent({ type: 'push', payload: { type: 'power-lost', systemId: SYS, title: 'AC Power disconnected' } });
    expect(getSimulatedAlert(SYS).type).toBe('power-lost');
  });

  it('power-restored clears the alert', () => {
    applyPushEvent({ type: 'push', payload: { type: 'power-lost', systemId: SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'power-restored', systemId: SYS } });
    expect(getSimulatedAlert(SYS)).toBeNull();
  });
});

describe('Communication push', () => {
  it('offline sets an offline sim alert', () => {
    applyPushEvent({ type: 'push', payload: { type: 'offline', systemId: SYS, title: 'System offline' } });
    expect(getSimulatedAlert(SYS).type).toBe('offline');
  });

  it('online closure clears the alert', () => {
    applyPushEvent({ type: 'push', payload: { type: 'offline', systemId: SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'online', systemId: SYS } });
    expect(getSimulatedAlert(SYS)).toBeNull();
  });
});

describe('Sensor pushes', () => {
  it('valve-reconnected clears the alert', () => {
    applyPushEvent({ type: 'push', payload: { type: 'valve-error', systemId: SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'valve-reconnected', systemId: SYS } });
    expect(getSimulatedAlert(SYS)).toBeNull();
  });

  it('meter-reconnected clears the alert', () => {
    applyPushEvent({ type: 'push', payload: { type: 'offline', systemId: SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'meter-reconnected', systemId: SYS } });
    expect(getSimulatedAlert(SYS)).toBeNull();
  });
});

describe('all non-water push types are recognized (no falling through to null)', () => {
  const ACTIVE_TYPES = ['valve-error', 'offline', 'power-lost'];
  const CLOSURE_TYPES = ['online', 'power-restored', 'valve-error-cleared',
                         'valve-reconnected', 'meter-reconnected',
                         'valve-disconnected', 'meter-disconnected',
                         'valve-closed-by-user'];

  ACTIVE_TYPES.forEach(type => {
    it(`${type} creates a sim alert`, () => {
      const result = applyPushEvent({ type: 'push', payload: { type, systemId: SYS } });
      expect(result).toBe(true); // applyPushEvent reports it mutated state
      expect(getSimulatedAlert(SYS)).toBeTruthy();
    });
  });

  CLOSURE_TYPES.forEach(type => {
    it(`${type} is a recognized closure push`, () => {
      const result = applyPushEvent({ type: 'push', payload: { type, systemId: SYS } });
      expect(result).toBe(true);
    });
  });
});

// ─── System page overlay: non-water pushes must surface on sys.power/comm/valve ─
// Rami 2026-06-06: "AC power push does not make itself to the water system
// page" - drawer + alerts list showed the alert via sys.alert.label, but the
// System page's Power / Comm / Valve pills stayed in their pre-push state.
// getSystemById now overlays sys.power = 'ac-lost', sys.comm = 'offline',
// sys.valve = 'error' from the sim alert type.

describe('non-water sim alerts overlay the System page state pills', () => {
  const TEST_SYS = APT_WITH_EVENT;

  it('power-lost push flips sys.power to "ac-lost"', () => {
    applyPushEvent({ type: 'push', payload: { type: 'power-lost', systemId: TEST_SYS } });
    expect(getSystemById(TEST_SYS).power).toBe('ac-lost');
  });

  it('power-restored push clears the overlay (back to static "ac")', () => {
    applyPushEvent({ type: 'push', payload: { type: 'power-lost', systemId: TEST_SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'power-restored', systemId: TEST_SYS } });
    expect(getSystemById(TEST_SYS).power).toBe('ac');
  });

  it('offline push flips sys.comm to "offline"', () => {
    applyPushEvent({ type: 'push', payload: { type: 'offline', systemId: TEST_SYS } });
    expect(getSystemById(TEST_SYS).comm).toBe('offline');
  });

  it('online closure restores sys.comm to "online"', () => {
    applyPushEvent({ type: 'push', payload: { type: 'offline', systemId: TEST_SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'online', systemId: TEST_SYS } });
    expect(getSystemById(TEST_SYS).comm).toBe('online');
  });

  it('valve-error push flips sys.valve to "error"', () => {
    // Pick a system whose static valve is NOT error so we can detect the overlay.
    applyPushEvent({ type: 'push', payload: { type: 'valve-error', systemId: TEST_SYS } });
    expect(getSystemById(TEST_SYS).valve).toBe('error');
  });

  it('valve-closed-by-user (VC_OK_01) flips sys.valve to "closed" WITHOUT creating an alert', () => {
    // Per project rule: "Valve closed is NOT an issue."
    // The user expects the Valve widget to reflect the close, but the
    // drawer dot should not turn red and /alerts should not list anything new.
    // Pick a clean system to avoid static-alert interference.
    const CLEAN = SYSTEMS_FOR_CLEAN_TESTING();
    applyPushEvent({ type: 'push', payload: { type: 'valve-closed-by-user', systemId: CLEAN } });
    const sys = getSystemById(CLEAN);
    expect(sys.valve).toBe('closed');
    // No alert was created
    expect(sys.alert).toBeNull();
  });
});

// Helper: find a system with no static alert in mock data so we can test
// behaviors in isolation (the mock-data IIFE forces ~2/location offline,
// so we have to find one dynamically).
function SYSTEMS_FOR_CLEAN_TESTING() {
  const clean = SYSTEMS.find(s => !s.alert && s.comm === 'online' && !s.offline && s.valve === 'open');
  if (!clean) throw new Error('no clean system in mock data');
  return clean.id;
}

// ─── Resolved water event tombstones sys.alert ────────────────────────────
// Rami 2026-06-06: "when water system event is resolved - it should no
// longer be on the water system detailed page". End of Leak makes sys.alert
// null so isWaterEvent guard hides the widget. Lifecycle stays on Activity.

describe('resolved water event tombstones sys.alert', () => {
  const TEST_SYS = APT_WITH_EVENT;

  it('Warning -> End of Leak: sys.alert is null after resolution', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning',     severity: 'High Flow', systemId: TEST_SYS } });
    expect(getSystemById(TEST_SYS).alert).not.toBeNull();
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'End of Leak', severity: 'High Flow', systemId: TEST_SYS } });
    expect(getSystemById(TEST_SYS).alert).toBeNull();
  });

  it('resolution suppresses even a STATIC water alert on the same system', () => {
    // This system has a static leak-low alert.. After the
    // sim End of Leak, the tombstone must keep that hidden too - otherwise
    // closing out a tested event would bounce back to the pre-existing leak.
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning',     severity: 'High Flow', systemId: TEST_SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'End of Leak', severity: 'High Flow', systemId: TEST_SYS } });
    expect(getSystemById(TEST_SYS).alert).toBeNull();
  });

  // CRITICAL: this is the test that catches "user can't re-test after End
  // of Leak". If a fresh Warning push after resolution doesn't un-tombstone
  // the system, the demo is broken until someone clears localStorage.
  it('Warning after End of Leak un-tombstones the system (new event starts cleanly)', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning',     severity: 'High Flow', systemId: TEST_SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'End of Leak', severity: 'High Flow', systemId: TEST_SYS } });
    expect(getSystemById(TEST_SYS).alert).toBeNull(); // tombstoned

    // New event starts
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: TEST_SYS, flowRate: '15 L/min', volume: '2 L' } });
    const sys = getSystemById(TEST_SYS);
    expect(sys.alert).not.toBeNull();
    expect(sys.alert.type).toBe('leak-high');
    expect(sys.alert.phase).toBe('warning');
    expect(sys.alert.resolved).toBeUndefined();
    expect(sys.alert.flowRate).toBe('15 L/min');
  });

  // Same shape for non-water alerts: power-lost AFTER power-restored should
  // re-activate. Easy invariant to break if a future refactor caches.
  it('power-lost after power-restored re-activates the alert', () => {
    applyPushEvent({ type: 'push', payload: { type: 'power-lost',     systemId: TEST_SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'power-restored', systemId: TEST_SYS } });
    expect(getSystemById(TEST_SYS).power).toBe('ac');
    applyPushEvent({ type: 'push', payload: { type: 'power-lost',     systemId: TEST_SYS } });
    expect(getSystemById(TEST_SYS).power).toBe('ac-lost');
  });

  // Tombstone is per-system, not global - resolving Sea View must NOT hide
  // active alerts on other systems.
  it('tombstone is per-system - resolving Sea View leaves Leumi untouched', () => {
    const SEA  = APT_WITH_EVENT;
    const LEUM = APT_CLEAR;
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SEA  } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'Low Flow',  systemId: LEUM } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'End of Leak', severity: 'High Flow', systemId: SEA } });
    expect(getSystemById(SEA).alert).toBeNull();
    expect(getSystemById(LEUM).alert).not.toBeNull();
    expect(getSystemById(LEUM).alert.type).toBe('leak-low');
  });
});
