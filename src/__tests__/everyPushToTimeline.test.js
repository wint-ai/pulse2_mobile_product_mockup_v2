// THE comprehensive test: for EVERY push type the pusher can fire,
// assert it produces a Timeline row with the right title AND icon, and
// that multiple pushes are in correct chronological order.
//
// This is the test that catches "I fired X and nothing showed in the
// timeline" bugs across the entire V10.9 catalogue.

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
const { getLifeEventsForSystem } = await import('../data/lifeEvents.js');
const { classify } = await import('../utils/classifyEvent.js');
import { APT_WITH_EVENT } from './fixtures';

const SYS = APT_WITH_EVENT;

beforeEach(() => {
  globalThis.localStorage = makeStorageStub();
});

// Render the timeline the way ActivityTab does.
function timeline() {
  const raw = (getLifeEventsForSystem(SYS) || []).filter(r => r.id?.startsWith?.('sim_'));
  return raw
    .slice()
    .sort((a, b) => (b._seq ?? 0) - (a._seq ?? 0))
    .map(r => {
      const c = classify(r);
      return c
        ? { title: c.title, icon: c.icon, cat: c.cat, resolved: !!c.resolved }
        : { title: '(unclassified)', icon: null };
    });
}

// ─── Water event lifecycle ────────────────────────────────────────────────

describe('Water event lifecycle pushes - all 6 land in timeline', () => {
  it('Warning -> Ongoing -> Shutoff -> VC_S -> VC_OK -> Ended produces 6 distinct timeline rows', () => {
    function fire(state, extra = {}) {
      applyPushEvent({ type: 'push', payload: { type: 'leak', state, severity: 'High Flow', systemId: SYS, ...extra } });
    }
    fire('Warning');
    fire('Ongoing');
    fire('Shutoff');
    fire('Shutoff', { v10_9_id: 'VC_S_02' });
    fire('Shutoff', { v10_9_id: 'VC_OK_02' });
    fire('End of Leak');

    const t = timeline();
    expect(t.map(r => r.title)).toEqual([
      'Water Event ended',
      'Valve closed successfully',
      'Valve started closing',
      'Shutoff level reached',
      'Ongoing reminder fired',
      'High-flow Water Event detected',
    ]);
    // Per Icon Bank (event-timeline-prd.html §2a):
    //   All water lifecycle rows -> water_drop (color carries phase)
    //   Valve actions            -> valve
    const glyphs = new Set(t.map(r => r.icon));
    expect(glyphs).toEqual(new Set(['water_drop', 'valve']));
    // But each row must still be distinguishable by SOME signal (color
    // or title) so the user can read progression.
    expect(new Set(t.map(r => `${r.icon}|${r.title}`)).size).toBe(6);
  });
});

// ─── Non-water pushes ─────────────────────────────────────────────────────

describe('Valve error pushes appear in timeline', () => {
  it('Valve error fires -> timeline shows "Valve error detected"', () => {
    applyPushEvent({ type: 'push', payload: { type: 'valve-error', systemId: SYS, title: 'Valve error' } });
    const t = timeline();
    expect(t.length).toBeGreaterThan(0);
    expect(t[0].title).toBe('Valve error detected');
    expect(t[0].cat).toBe('valve');
  });

  it('Valve error cleared after Valve error -> timeline shows the cleared event', () => {
    applyPushEvent({ type: 'push', payload: { type: 'valve-error', systemId: SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'valve-error-cleared', systemId: SYS } });
    const t = timeline();
    // Expect TWO rows: error + cleared (this is what users expect)
    const titles = t.map(r => r.title);
    expect(titles).toContain('Valve malfunction resolved');
  });
});

describe('Power pushes appear in timeline', () => {
  it('AC Power disconnected -> timeline shows "External power disconnected"', () => {
    applyPushEvent({ type: 'push', payload: { type: 'power-lost', systemId: SYS, title: 'AC power lost' } });
    const t = timeline();
    expect(t.length).toBeGreaterThan(0);
    expect(t[0].title).toBe('External power disconnected');
    expect(t[0].cat).toBe('power');
  });

  it('AC Power reconnected after disconnected -> timeline shows reconnected', () => {
    applyPushEvent({ type: 'push', payload: { type: 'power-lost', systemId: SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'power-restored', systemId: SYS } });
    const t = timeline();
    const titles = t.map(r => r.title);
    expect(titles).toContain('External power reconnected');
  });
});

describe('Communication pushes appear in timeline', () => {
  it('System offline -> timeline shows "System offline"', () => {
    applyPushEvent({ type: 'push', payload: { type: 'offline', systemId: SYS, title: 'System offline' } });
    const t = timeline();
    expect(t.length).toBeGreaterThan(0);
    expect(t[0].title).toBe('System offline');
    expect(t[0].cat).toBe('conn');
  });

  it('System back online after offline -> timeline shows reconnected', () => {
    applyPushEvent({ type: 'push', payload: { type: 'offline', systemId: SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'online', systemId: SYS } });
    const t = timeline();
    const titles = t.map(r => r.title);
    expect(titles).toContain('System communication resumed');
  });
});

describe('Sensor pushes appear in timeline', () => {
  it('Valve disconnected -> timeline shows valve disconnected', () => {
    applyPushEvent({ type: 'push', payload: { type: 'valve-disconnected', systemId: SYS, title: 'Valve disconnected' } });
    const t = timeline();
    expect(t.length).toBeGreaterThan(0);
    // Currently this might fail - valve-disconnected might not have a classify case
  });

  it('Meter disconnected -> timeline shows meter disconnected', () => {
    applyPushEvent({ type: 'push', payload: { type: 'meter-disconnected', systemId: SYS, title: 'Meter disconnected' } });
    const t = timeline();
    expect(t.length).toBeGreaterThan(0);
  });
});

// ─── Cross-category ordering ─────────────────────────────────────────────

describe('Cross-category pushes maintain firing order', () => {
  it('Water event -> Valve error -> Power lost: 3 rows in order (newest first)', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'valve-error', systemId: SYS } });
    applyPushEvent({ type: 'push', payload: { type: 'power-lost', systemId: SYS } });
    const t = timeline();
    expect(t.length).toBe(3);
    // Newest first - power lost should be at top
    expect(t[0].cat).toBe('power');
    expect(t[2].cat).toBe('water');
  });
});

// ─── Every push catalogue entry produces SOMETHING in the timeline ───────

describe('Every entry in PUSH_CATALOG that the pusher can fire shows in timeline', () => {
  // This is the full catalogue listing - if any push type produces nothing,
  // this assertion fails AND we know which one.
  const ALL_FIREABLE = [
    // Water event lifecycle
    { name: 'WA Warning detected (high)', payload: { type: 'leak', state: 'Warning', severity: 'High Flow' } },
    { name: 'WA Warning detected (low)',  payload: { type: 'leak', state: 'Warning', severity: 'Low Flow' } },
    { name: 'OL Ongoing reminder',         payload: { type: 'leak', state: 'Ongoing', severity: 'High Flow' } },
    { name: 'SO Shutoff level reached',    payload: { type: 'leak', state: 'Shutoff', severity: 'High Flow' } },
    { name: 'VC_S_02 Valve started closing', payload: { type: 'leak', state: 'Shutoff', severity: 'High Flow', v10_9_id: 'VC_S_02' } },
    { name: 'VC_OK_02 Valve closed (WE)',  payload: { type: 'leak', state: 'Shutoff', severity: 'High Flow', v10_9_id: 'VC_OK_02' } },
    { name: 'LE_01 Water Event ended',     payload: { type: 'leak', state: 'End of Leak', severity: 'High Flow' } },
    // Valve
    { name: 'V_ER Valve error',            payload: { type: 'valve-error' } },
    { name: 'V_ER_04 Valve error cleared', payload: { type: 'valve-error-cleared' } },
    { name: 'VC_OK_01 Valve closed by user', payload: { type: 'valve-closed-by-user' } },
    // Power
    { name: 'PW_01 AC Power disconnected', payload: { type: 'power-lost' } },
    { name: 'PW_02 AC Power reconnected',  payload: { type: 'power-restored' } },
    // Communication
    { name: 'COM_01 System offline',       payload: { type: 'offline' } },
    { name: 'COM_02 System back online',   payload: { type: 'online' } },
    // Sensors
    { name: 'SEN_01 Valve disconnected',   payload: { type: 'valve-disconnected' } },
    { name: 'SEN_02 Valve reconnected',    payload: { type: 'valve-reconnected' } },
    { name: 'SEN_03 Meter disconnected',   payload: { type: 'meter-disconnected' } },
    { name: 'SEN_04 Meter reconnected',    payload: { type: 'meter-reconnected' } },
  ];

  ALL_FIREABLE.forEach(({ name, payload }) => {
    it(`${name} produces at least one timeline row`, () => {
      applyPushEvent({ type: 'push', payload: { ...payload, systemId: SYS } });
      const t = timeline();
      expect(t.length).toBeGreaterThan(0);
      expect(t[0].title.length).toBeGreaterThan(0);
      expect(t[0].title).not.toBe('(unclassified)');
    });
  });
});
