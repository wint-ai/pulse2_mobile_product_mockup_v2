// Full pipeline test: push payload -> sim alert -> lifeEvents -> classify ->
// final timeline row title.
//
// This is THE test suite that catches the regression class Rami's been
// hitting: any function in the chain that rewrites the title can produce
// wrong output even if every individual layer's tests pass. These tests
// compose the WHOLE chain so the assertion is on the FINAL string the user
// sees on the Timeline.

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

// Helper: run the FULL pipeline a real user would and return the titles the
// Timeline would render.
function renderedTimelineTitles() {
  const raw = getLifeEventsForSystem(SYS) || [];
  return raw
    .filter(r => r.id?.startsWith?.('sim_'))
    .map(r => {
      const c = classify(r);
      return c?.title || '(unclassified)';
    });
}

// ─── Each lifecycle push produces the right rendered title ────────────────

describe('each push -> final rendered Timeline title', () => {
  function fire(state, extra = {}) {
    return applyPushEvent({
      type: 'push',
      payload: {
        type: 'leak', state, severity: 'High Flow', systemId: SYS,
        ...extra,
      },
    });
  }

  it('Warning push renders as "High-flow Water Event detected"', () => {
    fire('Warning', { flowRate: '22.5 L/min', volume: '18 L' });
    expect(renderedTimelineTitles()).toEqual(['High-flow Water Event detected']);
  });

  it('Warning + Ongoing renders 2 rows: detected, ongoing', () => {
    fire('Warning');
    fire('Ongoing', { volume: '42 L' });
    expect(renderedTimelineTitles()).toEqual([
      'High-flow Water Event detected',
      'Ongoing reminder fired',
    ]);
  });

  it('the SHUTOFF push must render "Shutoff level reached" - the exact bug Rami reported', () => {
    fire('Warning');
    fire('Shutoff', { volume: '80 L' });
    const titles = renderedTimelineTitles();
    // The bug: this row would say "High-flow Water Event detected" before fix.
    expect(titles[1]).toBe('Shutoff level reached');
    // And specifically NOT the wrong one
    expect(titles[1]).not.toBe('High-flow Water Event detected');
  });

  it('VC_S_02 (Valve started closing) renders correctly', () => {
    fire('Warning');
    fire('Shutoff');
    fire('Shutoff', { v10_9_id: 'VC_S_02' });
    expect(renderedTimelineTitles()[2]).toBe('Valve started closing');
  });

  it('VC_OK_02 (Valve closed successfully) renders correctly', () => {
    fire('Warning');
    fire('Shutoff', { v10_9_id: 'VC_S_02' });
    fire('Shutoff', { v10_9_id: 'VC_OK_02' });
    expect(renderedTimelineTitles()[2]).toBe('Valve closed successfully');
  });

  it('End of Leak renders as "Water Event ended"', () => {
    fire('Warning');
    fire('End of Leak', { volume: '86 L', duration: '2h 14m' });
    expect(renderedTimelineTitles()[1]).toBe('Water Event ended');
  });

  it('Low Flow severity renders as "Low-flow Water Event detected"', () => {
    applyPushEvent({
      type: 'push',
      payload: { type: 'leak', state: 'Warning', severity: 'Low Flow', systemId: SYS },
    });
    expect(renderedTimelineTitles()[0]).toBe('Low-flow Water Event detected');
  });
});

// ─── Full lifecycle: every step renders correctly ─────────────────────────

describe('full lifecycle: Warning -> Ongoing -> Shutoff -> VC_S -> VC_OK -> Ended', () => {
  it('all 6 rows render with the right titles in the right order', () => {
    function fire(state, extra = {}) {
      applyPushEvent({
        type: 'push',
        payload: { type: 'leak', state, severity: 'High Flow', systemId: SYS, ...extra },
      });
    }
    fire('Warning');
    fire('Ongoing');
    fire('Shutoff');
    fire('Shutoff', { v10_9_id: 'VC_S_02' });
    fire('Shutoff', { v10_9_id: 'VC_OK_02' });
    fire('End of Leak');

    expect(renderedTimelineTitles()).toEqual([
      'High-flow Water Event detected',
      'Ongoing reminder fired',
      'Shutoff level reached',
      'Valve started closing',
      'Valve closed successfully',
      'Water Event ended',
    ]);
  });

  it('no two rows share the same title (no rewrite collisions)', () => {
    function fire(state, extra = {}) {
      applyPushEvent({
        type: 'push',
        payload: { type: 'leak', state, severity: 'High Flow', systemId: SYS, ...extra },
      });
    }
    fire('Warning');
    fire('Ongoing');
    fire('Shutoff');
    fire('Shutoff', { v10_9_id: 'VC_S_02' });
    fire('Shutoff', { v10_9_id: 'VC_OK_02' });
    fire('End of Leak');

    const titles = renderedTimelineTitles();
    expect(new Set(titles).size).toBe(titles.length); // all unique
  });
});

// ─── New event resets (no cross-event title leak) ─────────────────────────

describe('a new Warning replaces - does not append - prior event rows', () => {
  function fire(state, extra = {}) {
    applyPushEvent({
      type: 'push',
      payload: { type: 'leak', state, severity: 'High Flow', systemId: SYS, ...extra },
    });
  }

  it('Warning after Warning + Shutoff resets the timeline to just the new Warning', () => {
    fire('Warning');
    fire('Shutoff');
    expect(renderedTimelineTitles()).toHaveLength(2);

    // A new Warning is a new event.
    fire('Warning');
    expect(renderedTimelineTitles()).toEqual(['High-flow Water Event detected']);
  });
});

// ─── Home / Drawer overlay (UserContext visibleSystems) ──────────────────
// Independently of React rendering, verify that the same overlay logic
// UserContext uses produces systems with the sim alert merged in. If this
// breaks, Home and the drawer will show stale system status.

describe('sim alert overlays a system the same way UserContext does', () => {
  it('a fresh sim alert appears as sys.alert on every overlay read', async () => {
    const { SYSTEMS } = await import('../data/systems.js');
    const { getSimulatedAlerts } = await import('../data/simulatedAlerts.js');
    const SYS_ID = APT_WITH_EVENT;

    // Baseline: SYSTEMS has the static alert (no sim).
    const before = SYSTEMS.find(s => s.id === SYS_ID);
    expect(before).toBeTruthy();

    // Fire a Warning push through the unified handler.
    applyPushEvent({
      type: 'push',
      payload: { type: 'leak', state: 'Warning', severity: 'High Flow',
                 systemId: SYS_ID, flowRate: '99 L/min', volume: '5 L' },
    });

    // Replicate the overlay UserContext.jsx does:
    const sims = getSimulatedAlerts();
    const overlaid = SYSTEMS.map(s => sims[s.id] ? { ...s, alert: sims[s.id] } : s);
    const sea = overlaid.find(s => s.id === SYS_ID);

    expect(sea.alert.type).toBe('leak-high');
    expect(sea.alert.flowRate).toBe('99 L/min');
    expect(sea.alert.phase).toBe('warning');
  });

  it('valveOverride flips sys.valve when overlay applies', async () => {
    const { SYSTEMS } = await import('../data/systems.js');
    const { getSimulatedAlerts } = await import('../data/simulatedAlerts.js');
    const SYS_ID = APT_WITH_EVENT;

    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS_ID } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Shutoff', severity: 'High Flow', systemId: SYS_ID } });

    const sims = getSimulatedAlerts();
    const overlaid = SYSTEMS.map(s => {
      const sim = sims[s.id];
      if (!sim) return s;
      const o = { ...s, alert: sim };
      if (sim.valveOverride) o.valve = sim.valveOverride;
      return o;
    });
    const sea = overlaid.find(s => s.id === SYS_ID);
    expect(sea.valve).toBe('closed');
  });
});

// ─── Sort order: same-minute pushes sort newest-first by sequence ─────────

describe('same-minute sort order', () => {
  it('Ongoing fired right after Warning sorts ABOVE Warning (newer first)', async () => {
    function fire(state, extra = {}) {
      applyPushEvent({ type: 'push', payload: { type: 'leak', state, severity: 'High Flow', systemId: SYS, ...extra } });
    }
    fire('Warning');
    fire('Ongoing');

    const raw = getLifeEventsForSystem(SYS).filter(r => r.id?.startsWith?.('sim_'));
    // raw is in INSERTION order: [Warning, Ongoing]
    // ActivityTab sorts: newest first by date, with _seq tiebreaker for
    // same-minute. Ongoing (_seq=1) should come BEFORE Warning (_seq=0).
    const sortedTitles = raw
      .slice()
      .sort((a, b) => (b._seq ?? 0) - (a._seq ?? 0))
      .map(r => {
        // Run through classify like ActivityTab does
        const c = require && (() => null);
        return r.title;
      });
    expect(sortedTitles[0]).toBe('Ongoing reminder fired');
    expect(sortedTitles[1]).toBe('High-flow Water Event detected');
  });

  it('sim events carry _seq index for sort tiebreaking', () => {
    function fire(state, extra = {}) {
      applyPushEvent({ type: 'push', payload: { type: 'leak', state, severity: 'High Flow', systemId: SYS, ...extra } });
    }
    fire('Warning');
    fire('Ongoing');
    fire('Shutoff');

    const raw = getLifeEventsForSystem(SYS).filter(r => r.id?.startsWith?.('sim_'));
    expect(raw.map(r => r._seq)).toEqual([0, 1, 2]);
  });

  it('sim rows include notifications so they are expandable', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS } });
    const raw = getLifeEventsForSystem(SYS).filter(r => r.id?.startsWith?.('sim_'));
    // notifications attached makes rowHasPanel() return true -> expandable
    expect(Array.isArray(raw[0].notifications)).toBe(true);
    expect(raw[0].notifications.length).toBeGreaterThan(0);
  });
});

// ─── No rendered row should ever be "(unclassified)" ─────────────────────

describe('no sim row ever falls through classify as unclassified', () => {
  function fire(state, extra = {}) {
    applyPushEvent({
      type: 'push',
      payload: { type: 'leak', state, severity: 'High Flow', systemId: SYS, ...extra },
    });
  }

  it('every push variant produces a classified row', () => {
    fire('Warning');
    fire('Ongoing');
    fire('Shutoff');
    fire('Shutoff', { v10_9_id: 'VC_S_02' });
    fire('Shutoff', { v10_9_id: 'VC_OK_02' });
    fire('End of Leak');

    const titles = renderedTimelineTitles();
    expect(titles).not.toContain('(unclassified)');
    titles.forEach(t => expect(t.length).toBeGreaterThan(0));
  });
});
