// @vitest-environment happy-dom
//
// Locked 2026-06-15 (PRD 14 § 2.3 + PRD 15 § 10.6 + PRD 04a):
// Ignored Water Events STAY on the Active tab. They're not moved to History
// the moment the user ignores them — they sit on Active with a muted
// treatment + Ignored pill until the underlying flow ends. Counts include
// them. The Water Event widget's Tag button stays visible (Ignore + On it
// go away).

import { describe, it, expect, beforeEach } from 'vitest';
import { computeActiveEvents, computeIgnoredEvents } from '../data/events';
import { ignoreIncident } from '../data/ignoredIncidents';
import { applyPushEvent } from '../lib/pushEvents';
import { APT_WITH_EVENT } from './fixtures';

beforeEach(() => {
  localStorage.clear();
});

describe('Ignored Water Events stay on Active (data layer)', () => {
  const SYS_ID = APT_WITH_EVENT;

  function setupActiveWarning() {
    applyPushEvent({
      type: 'push',
      payload: {
        type: 'leak', state: 'Warning', severity: 'High Flow',
        systemId: SYS_ID, flowRate: '22.5 L/min', volume: '18 L',
      },
    });
  }

  it('Active list INCLUDES a Water Event after Ignore (with ignored flag)', () => {
    setupActiveWarning();
    const beforeIgnore = computeActiveEvents().filter(e => e.system === SYS_ID);
    expect(beforeIgnore.length).toBeGreaterThan(0);
    expect(beforeIgnore.some(e => e.ignored)).toBe(false);

    ignoreIncident(SYS_ID, { tag: 'Filling pool', ignoredBy: 'Test User' });

    const afterIgnore = computeActiveEvents().filter(e => e.system === SYS_ID);
    expect(afterIgnore.length, 'ignored event still on Active').toBeGreaterThan(0);
    const ignoredEvt = afterIgnore.find(e => e.type === 'leak-high' || e.type === 'leak-low');
    expect(ignoredEvt, 'water event row still present').toBeTruthy();
    expect(ignoredEvt.ignored, 'event flagged ignored=true so row renders muted').toBe(true);
  });

  it('computeIgnoredEvents() is now a no-op (returns [])', () => {
    setupActiveWarning();
    ignoreIncident(SYS_ID, { tag: 'Test', ignoredBy: 'Test User' });
    expect(computeIgnoredEvents()).toEqual([]);
  });

  it('totalActiveCount semantics: ignored event still counts as a system needing attention', () => {
    setupActiveWarning();
    ignoreIncident(SYS_ID, { tag: 'Test', ignoredBy: 'Test User' });

    // The Alerts header sub-line counts unique systems across active events.
    // An ignored water event keeps the system in that count.
    const events = computeActiveEvents();
    const uniqueSystems = new Set(events.map(e => e.system || e.systemId).filter(Boolean));
    expect(uniqueSystems.has(SYS_ID)).toBe(true);
  });
});
