// Tests the Ignore + On it user actions and their interaction with subsequent
// pushes. Real-world flow: user gets Warning, presses Ignore. Pusher fires
// Ongoing - phone should now show "Ignored · Sarah". Pusher fires NEW Warning
// (new event) - the ignore should be cleared.

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
const { ignoreIncident, isIgnored, clearIgnored } = await import('../data/ignoredIncidents.js');
const { startInvestigating, isInvestigating, stopInvestigating } = await import('../data/investigatingStore.js');
import { APT_WITH_EVENT } from './fixtures';

const SYS = APT_WITH_EVENT;

beforeEach(() => {
  globalThis.localStorage = makeStorageStub();
});

describe('Ignore flow', () => {
  it('after pressing Ignore, isIgnored returns true', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS } });
    ignoreIncident(SYS, { ignoredBy: 'Sarah' });
    expect(isIgnored(SYS)).toBe(true);
  });

  it('Ongoing reminder after Ignore does NOT clear the ignore', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS } });
    ignoreIncident(SYS, { ignoredBy: 'Sarah' });
    expect(isIgnored(SYS)).toBe(true);

    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Ongoing', severity: 'High Flow', systemId: SYS } });
    // Ongoing continues the same event - ignore should persist
    expect(isIgnored(SYS)).toBe(true);
  });

  it('a NEW Warning push (new event) DOES clear the ignore', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS } });
    ignoreIncident(SYS, { ignoredBy: 'Sarah' });
    expect(isIgnored(SYS)).toBe(true);

    // Fire ANOTHER Warning - this is a NEW event, the prior ignore should be wiped.
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS } });
    expect(isIgnored(SYS)).toBe(false);
  });

  it('applyDemoReset clears the ignore', () => {
    ignoreIncident(SYS);
    applyDemoReset();
    expect(isIgnored(SYS)).toBe(false);
  });
});

describe('On it flow', () => {
  it('after pressing On it, isInvestigating returns true', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS } });
    startInvestigating(SYS, { actor: 'Sarah' });
    expect(isInvestigating(SYS)).toBe(true);
  });

  it('Ongoing reminder preserves On it state (same event)', () => {
    startInvestigating(SYS, { actor: 'Sarah' });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Ongoing', severity: 'High Flow', systemId: SYS } });
    expect(isInvestigating(SYS)).toBe(true);
  });

  it('Shutoff push preserves On it (same event)', () => {
    startInvestigating(SYS, { actor: 'Sarah' });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Shutoff', severity: 'High Flow', systemId: SYS } });
    expect(isInvestigating(SYS)).toBe(true);
  });

  it('End of Leak preserves the investigation flag', () => {
    startInvestigating(SYS, { actor: 'Sarah' });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'End of Leak', severity: 'High Flow', systemId: SYS } });
    expect(isInvestigating(SYS)).toBe(true);
  });

  it('a NEW Warning clears prior investigating flag', () => {
    startInvestigating(SYS, { actor: 'Sarah' });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS } });
    expect(isInvestigating(SYS)).toBe(false);
  });

  it('toggleInvestigating: start then stop', () => {
    startInvestigating(SYS, { actor: 'Sarah' });
    expect(isInvestigating(SYS)).toBe(true);
    stopInvestigating(SYS);
    expect(isInvestigating(SYS)).toBe(false);
  });
});

describe('Combined flow: Warning -> Ignore -> new Warning resets', () => {
  it('full sequence: pristine -> active -> ignored -> new event -> active again', () => {
    expect(isIgnored(SYS)).toBe(false);
    expect(isInvestigating(SYS)).toBe(false);

    // First event
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS } });
    // User ignores it
    ignoreIncident(SYS, { ignoredBy: 'Sarah' });
    expect(isIgnored(SYS)).toBe(true);

    // Same event continues - Ongoing
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Ongoing', severity: 'High Flow', systemId: SYS } });
    expect(isIgnored(SYS)).toBe(true); // still ignored

    // Time passes, NEW event starts
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS } });
    expect(isIgnored(SYS)).toBe(false); // wiped - new event
  });
});
