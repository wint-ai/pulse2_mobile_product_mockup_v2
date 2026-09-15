// Sim alerts on different systems must NOT leak across each other.
// Each system has its own entry in the sim store; pushes are keyed by sysId.

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
import { APT_CLEAR, APT_WITH_EVENT } from './fixtures';

beforeEach(() => {
  globalThis.localStorage = makeStorageStub();
});

describe('multi-system sim alert isolation', () => {
  it('two distinct systems hold independent sim alerts', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: APT_WITH_EVENT, flowRate: '99 L/min' } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'Low Flow', systemId: APT_CLEAR, flowRate: '0.5 L/h' } });

    const sea = getSimulatedAlert(APT_WITH_EVENT);
    const leumi = getSimulatedAlert(APT_CLEAR);
    expect(sea.type).toBe('leak-high');
    expect(sea.flowRate).toBe('99 L/min');
    expect(leumi.type).toBe('leak-low');
    expect(leumi.flowRate).toBe('0.5 L/h');
  });

  it('clearing one system does not affect the other', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: APT_WITH_EVENT } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: APT_CLEAR } });
    // Clear sea_view via 'online' closure
    applyPushEvent({ type: 'push', payload: { type: 'online', systemId: APT_WITH_EVENT } });
    expect(getSimulatedAlert(APT_WITH_EVENT)).toBeNull();
    expect(getSimulatedAlert(APT_CLEAR)).toBeTruthy();
  });

  it('getSystemById returns the right overlay per system', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Shutoff', severity: 'High Flow', systemId: APT_WITH_EVENT } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'Low Flow', systemId: APT_CLEAR } });
    const sea = getSystemById(APT_WITH_EVENT);
    const leumi = getSystemById(APT_CLEAR);
    expect(sea.valve).toBe('closed');         // Shutoff -> valveOverride
    expect(sea.alert.phase).toBe('shutoff');
    expect(leumi.alert.phase).toBe('warning');
    expect(leumi.valve).not.toBe('closed');   // no Shutoff on leumi
  });
});

describe('lifecycle on one system does not affect another', () => {
  it('fires full lifecycle on Sea View, Leumi stays untouched', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: APT_WITH_EVENT } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Ongoing', severity: 'High Flow', systemId: APT_WITH_EVENT } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Shutoff', severity: 'High Flow', systemId: APT_WITH_EVENT } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'End of Leak', severity: 'High Flow', systemId: APT_WITH_EVENT } });

    expect(getSimulatedEvents(APT_WITH_EVENT)).toHaveLength(4);
    expect(getSimulatedEvents(APT_CLEAR)).toHaveLength(0);
    expect(getSimulatedAlert(APT_CLEAR)).toBeNull();
  });
});
