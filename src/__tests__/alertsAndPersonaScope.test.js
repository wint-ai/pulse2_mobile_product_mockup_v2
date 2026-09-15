// Verifies that sim alerts make it into:
//   - the Alerts screen (computeActiveEvents)
//   - the persona's scope filter (visibleSystems)
//   - the System overlay (getSystemById)
//
// And that they DON'T leak across personas.

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
const { computeActiveEvents } = await import('../data/events.js');
const { SYSTEMS } = await import('../data/systems.js');
const { PERSONAS } = await import('../data/personas.js');
import { APT_CLEAR, APT_LOW_FLOW, APT_WITH_EVENT, HAPPY_PATH_APT, LOW_FLOW_VALVE_ERROR, OFFICE_HIGH_FLOW } from './fixtures';

beforeEach(() => {
  globalThis.localStorage = makeStorageStub();
});

const SEA_VIEW = LOW_FLOW_VALVE_ERROR; // static leak-low alert
const APT_47   = HAPPY_PATH_APT;       // the solo tenant's, inside Building A
const CT1      = OFFICE_HIGH_FLOW;     // an Office system with a High Flow event

describe('/alerts screen reflects sim alerts', () => {
  it('after a Warning push, computeActiveEvents includes it', () => {
    const before = computeActiveEvents().filter(e => e.system === SEA_VIEW || e.systemId === SEA_VIEW);
    applyPushEvent({
      type: 'push',
      payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SEA_VIEW,
                 flowRate: '99 L/min', volume: '5 L' },
    });
    const after = computeActiveEvents().filter(e => (e.system || e.systemId) === SEA_VIEW);
    // At least one event for Sea View now
    expect(after.length).toBeGreaterThan(0);
    // It's a high-flow leak event
    const leakEvent = after.find(e => e.type === 'leak-high');
    expect(leakEvent).toBeTruthy();
  });

  it('after firing on two systems, both events present in /alerts', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SEA_VIEW } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'Low Flow',  systemId: APT_47 } });
    const events = computeActiveEvents();
    expect(events.find(e => (e.system || e.systemId) === SEA_VIEW && e.type === 'leak-high')).toBeTruthy();
    expect(events.find(e => (e.system || e.systemId) === APT_47   && e.type === 'leak-low')).toBeTruthy();
  });

  it('clearing a sim alert removes it from /alerts', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SEA_VIEW } });
    expect(computeActiveEvents().some(e => (e.system || e.systemId) === SEA_VIEW && e.type === 'leak-high')).toBe(true);
    // online closure clears
    applyPushEvent({ type: 'push', payload: { type: 'online', systemId: SEA_VIEW } });
    expect(computeActiveEvents().some(e => (e.system || e.systemId) === SEA_VIEW && e.type === 'leak-high')).toBe(false);
  });
});

describe('persona scope filtering', () => {
  it('the two-apartment tenant sees exactly their two apartments', () => {
    const tenant = PERSONAS.find(p => p.id === 'tenant-2apts');
    const visible = SYSTEMS.filter(tenant.systemFilter).map(s => s.id);
    expect(visible).toContain(APT_WITH_EVENT);
    expect(visible).toContain(APT_CLEAR);
    expect(visible).not.toContain(OFFICE_HIGH_FLOW);
    expect(visible).not.toContain(HAPPY_PATH_APT);
  });

  it('the one-apartment tenant sees ONLY their apartment', () => {
    const soloTenant = PERSONAS.find(p => p.id === 'tenant-1apt');
    const visible = SYSTEMS.filter(soloTenant.systemFilter).map(s => s.id);
    expect(visible).toEqual([HAPPY_PATH_APT]);
  });

  it('the residential building manager sees every apartment in their building', () => {
    const manager = PERSONAS.find(p => p.id === 'building-manager-residential');
    const visible = SYSTEMS.filter(manager.systemFilter).map(s => s.id);
    expect(visible).toHaveLength(10); // Building A, Apartments 1-10
    expect(visible).toContain(APT_WITH_EVENT); // Apt 2, High Flow
    expect(visible).toContain(APT_LOW_FLOW);   // Apt 5, Low Flow
    expect(visible.every(id => id.startsWith('esrt-bldg-A-apt-'))).toBe(true);
    // The one-apartment tenant lives in this building, so their apartment is
    // in the manager's scope — that shared view is the point of the pairing.
    expect(visible).toContain(HAPPY_PATH_APT);
    // A different building's apartments are not.
    expect(visible).not.toContain(APT_CLEAR);
  });

  it('a sim alert on an Office system is NOT visible to a tenant (out of scope)', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: OFFICE_HIGH_FLOW } });
    const tenant = PERSONAS.find(p => p.id === 'tenant-2apts');
    const visible = SYSTEMS.filter(tenant.systemFilter).map(s => s.id);
    expect(visible).not.toContain(OFFICE_HIGH_FLOW);
    // The tenant's visibleSystems does not include the Office system
    // even though there's a sim alert on it.
  });

  it('a sim alert on a shared apartment IS visible to both its tenant and its building manager', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: APT_47 } });
    const soloTenant = PERSONAS.find(p => p.id === 'tenant-1apt');
    const manager = PERSONAS.find(p => p.id === 'building-manager-residential');
    expect(SYSTEMS.filter(soloTenant.systemFilter).map(s => s.id)).toContain(APT_47);
    expect(SYSTEMS.filter(manager.systemFilter).map(s => s.id)).toContain(APT_47);
  });
});

describe('static + sim alert on same system', () => {
  it('a static low-flow alert is overridden to high-flow by a sim Warning', () => {
    // Static alert (in mock data) is leak-low. After sim Warning fires
    // High Flow, getSystemById should return high-flow.
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SEA_VIEW } });
    const sys = SYSTEMS.find(s => s.id === SEA_VIEW);
    expect(sys.alert.type).toBe('leak-low'); // static still says low
    // (the overlay is applied by getSystemById, not on the raw SYSTEMS array)
    // Verify via getSystemById:
    return import('../data/systems.js').then(m => {
      const overlaid = m.getSystemById(SEA_VIEW);
      expect(overlaid.alert.type).toBe('leak-high'); // sim wins
    });
  });
});
