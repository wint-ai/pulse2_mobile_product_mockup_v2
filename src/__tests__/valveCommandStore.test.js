// valveCommandStore — the first thing in this app that persists a valve state.
//
// The load-bearing test here is "skipped systems are NOT written as commanded
// states": a bulk close that skipped an offline system must leave that system
// reading as whatever it was. A valve reading closed when it is not is the one
// failure mode of this store that matters in the real world.

import { describe, it, expect, beforeEach } from 'vitest';

const KEY = 'pulse2-valve-commands';

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

const {
  getValveCommand,
  getAllValveCommands,
  effectiveValveState,
  recordBulkValveCommand,
  getBulkValveHistory,
  clearValveCommands,
  // The transient phase — 2026-11-08.
  VALVE_SEND_MS,
  VALVE_ACT_MS,
  VALVE_TRANSITION_MS,
  BULK_SETTLE_MS,
  valvePhaseAt,
  startValveCommand,
  getValveTransition,
  getAllValveTransitions,
  settleValveCommand,
  cancelValveCommand,
  bulkValvePhaseAt,
  getActiveBulkValveBatch,
  dismissBulkValveBatch,
} = await import('../data/valveCommandStore.js');

beforeEach(() => {
  globalThis.localStorage = makeStorageStub();
  clearValveCommands();
});

describe('round trip', () => {
  it('a bulk close over three systems reads each back as closed', () => {
    const batch = recordBulkValveCommand({
      action: 'close',
      systemIds: ['sys-a', 'sys-b', 'sys-c'],
      scopeLabel: 'Tel Aviv HQ',
    });

    expect(batch.id).toBeTruthy();
    expect(batch.at).toBeGreaterThan(0);
    expect(batch.state).toBe('closed');

    expect(getValveCommand('sys-a')).toBe('closed');
    expect(getValveCommand('sys-b')).toBe('closed');
    expect(getValveCommand('sys-c')).toBe('closed');
    expect(getAllValveCommands()).toEqual({
      'sys-a': 'closed', 'sys-b': 'closed', 'sys-c': 'closed',
    });
  });

  it('an open command writes "open", and a never-commanded system is undefined', () => {
    recordBulkValveCommand({ action: 'open', systemIds: ['sys-a'] });
    expect(getValveCommand('sys-a')).toBe('open');
    expect(getValveCommand('sys-untouched')).toBeUndefined();
  });

  it('ids and timestamps are minted in the store, not accepted from the caller', () => {
    const batch = recordBulkValveCommand({
      action: 'close', systemIds: ['sys-a'], id: 'caller-id', at: 1,
    });
    expect(batch.id).not.toBe('caller-id');
    expect(batch.id).toMatch(/^vb-\d+-[a-z0-9]+$/);
    expect(batch.at).not.toBe(1);
  });

  it('the actor is recorded and defaults to the current actor, never "System"', () => {
    const named = recordBulkValveCommand({
      action: 'close', systemIds: ['sys-a'], actor: 'Dana Levi',
    });
    expect(named.actor).toBe('Dana Levi');

    const defaulted = recordBulkValveCommand({ action: 'close', systemIds: ['sys-b'] });
    expect(defaulted.actor).toBe('You');
    expect(defaulted.actor).not.toBe('System');
  });

  it('rejects an action that is not open or close', () => {
    expect(recordBulkValveCommand({ action: 'shut', systemIds: ['sys-a'] })).toBeNull();
    expect(recordBulkValveCommand({})).toBeNull();
    expect(getBulkValveHistory()).toEqual([]);
  });
});

describe('effectiveValveState', () => {
  it('prefers the command over the system\'s own valve', () => {
    recordBulkValveCommand({ action: 'close', systemIds: ['sys-a'] });
    expect(effectiveValveState({ id: 'sys-a', valve: 'open' })).toBe('closed');
  });

  it('falls back to the system\'s own valve when there is no command', () => {
    expect(effectiveValveState({ id: 'sys-z', valve: 'open' })).toBe('open');
    expect(effectiveValveState({ id: 'sys-z', valve: 'closed' })).toBe('closed');
  });

  it('passes a null valve (a system with no valve) through untouched', () => {
    expect(effectiveValveState({ id: 'sys-novalve', valve: null })).toBeNull();
  });

  it('does not throw on a missing system', () => {
    expect(effectiveValveState(undefined)).toBeUndefined();
    expect(effectiveValveState(null)).toBeUndefined();
  });
});

describe('getBulkValveHistory', () => {
  it('returns newest first and carries the skipped sets', () => {
    recordBulkValveCommand({
      action: 'close', systemIds: ['sys-a'], scopeLabel: 'First',
      skipped: { offline: ['sys-off'] },
    });
    recordBulkValveCommand({
      action: 'open', systemIds: ['sys-b'], scopeLabel: 'Second',
      skipped: { noValve: ['sys-nv'], faulted: ['sys-f'] },
    });

    const history = getBulkValveHistory();
    expect(history).toHaveLength(2);
    expect(history[0].scopeLabel).toBe('Second');
    expect(history[1].scopeLabel).toBe('First');

    expect(history[1].skipped).toEqual({
      offline: ['sys-off'], noValve: [], faulted: [], closing: [], alreadyInState: [],
    });
    expect(history[0].skipped.noValve).toEqual(['sys-nv']);
    expect(history[0].skipped.faulted).toEqual(['sys-f']);
  });

  it('records all five skipped buckets even when the caller passes none', () => {
    const batch = recordBulkValveCommand({ action: 'close', systemIds: ['sys-a'] });
    expect(Object.keys(batch.skipped).sort()).toEqual(
      ['alreadyInState', 'closing', 'faulted', 'noValve', 'offline'],
    );
    for (const bucket of Object.values(batch.skipped)) expect(bucket).toEqual([]);
  });
});

describe('skipped systems are NOT commanded', () => {
  it('an offline system skipped by a bulk close still reads as its own state', () => {
    recordBulkValveCommand({
      action: 'close',
      systemIds: ['sys-a', 'sys-b'],
      skipped: {
        offline: ['sys-offline'],
        noValve: ['sys-novalve'],
        faulted: ['sys-faulted'],
        closing: ['sys-closing'],
        alreadyInState: ['sys-already'],
      },
    });

    // Not written as a commanded state...
    for (const id of ['sys-offline', 'sys-novalve', 'sys-faulted', 'sys-closing', 'sys-already']) {
      expect(getValveCommand(id)).toBeUndefined();
    }
    // ...and therefore still reads as whatever the system itself says.
    expect(effectiveValveState({ id: 'sys-offline', valve: 'open' })).toBe('open');

    expect(getAllValveCommands()).toEqual({ 'sys-a': 'closed', 'sys-b': 'closed' });
  });
});

describe('robustness', () => {
  it('a corrupt (non-JSON) value makes every reader return empty, not throw', () => {
    localStorage.setItem(KEY, 'not json at all {{{');

    expect(() => getValveCommand('sys-a')).not.toThrow();
    expect(getValveCommand('sys-a')).toBeUndefined();
    expect(getAllValveCommands()).toEqual({});
    expect(getBulkValveHistory()).toEqual([]);
    expect(effectiveValveState({ id: 'sys-a', valve: 'open' })).toBe('open');
  });

  it('a value of the wrong JSON shape is treated as empty', () => {
    for (const bad of ['"a string"', '[1,2,3]', 'null', '42']) {
      localStorage.setItem(KEY, bad);
      expect(getAllValveCommands()).toEqual({});
      expect(getBulkValveHistory()).toEqual([]);
    }
  });

  it('a states/batches field of the wrong type is ignored, not trusted', () => {
    localStorage.setItem(KEY, JSON.stringify({ states: ['nope'], batches: { nope: 1 } }));
    expect(getAllValveCommands()).toEqual({});
    expect(getBulkValveHistory()).toEqual([]);
  });

  it('a stored state that is not open/closed is rejected rather than returned', () => {
    localStorage.setItem(KEY, JSON.stringify({
      states: {
        'sys-good': 'closed',
        'sys-bogus': 'CLOSED',
        'sys-closing': 'closing',
        'sys-true': true,
        'sys-null': null,
        'sys-num': 1,
      },
      batches: [],
    }));

    expect(getValveCommand('sys-good')).toBe('closed');
    for (const id of ['sys-bogus', 'sys-closing', 'sys-true', 'sys-null', 'sys-num']) {
      expect(getValveCommand(id)).toBeUndefined();
    }
    expect(getAllValveCommands()).toEqual({ 'sys-good': 'closed' });

    // The one that matters: a junk stored value must not make a valve read
    // as closed. It falls back to the system's own state.
    expect(effectiveValveState({ id: 'sys-bogus', valve: 'open' })).toBe('open');
  });

  it('a non-object row in batches is dropped rather than returned', () => {
    localStorage.setItem(KEY, JSON.stringify({
      states: {}, batches: ['junk', null, 7, { id: 'vb-1', at: 1 }],
    }));
    const history = getBulkValveHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('vb-1');
  });
});

describe('the batch cap', () => {
  it('keeps the 50 most recent batches, newest first', () => {
    for (let i = 0; i < 60; i++) {
      recordBulkValveCommand({
        action: 'close', systemIds: [`sys-${i}`], scopeLabel: `batch-${i}`,
      });
    }

    const history = getBulkValveHistory();
    expect(history).toHaveLength(50);
    expect(history[0].scopeLabel).toBe('batch-59');
    expect(history[49].scopeLabel).toBe('batch-10');

    // Capping the history must not discard the commanded states — the
    // earliest systems are still closed.
    expect(getValveCommand('sys-0')).toBe('closed');
    expect(Object.keys(getAllValveCommands())).toHaveLength(60);
  });
});

describe('clearValveCommands', () => {
  it('wipes both the states and the batches', () => {
    recordBulkValveCommand({ action: 'close', systemIds: ['sys-a'] });
    clearValveCommands();
    expect(getAllValveCommands()).toEqual({});
    expect(getBulkValveHistory()).toEqual([]);
    expect(getValveCommand('sys-a')).toBeUndefined();
  });
});

/* ── THE TRANSIENT PHASE — 2026-11-08 ─────────────────────────────────────
 * Owner: "When shutting off valve [...] there is no any feedback that
 * something was happens." The three Figma frames (199683:25832 / :25851 /
 * :25870) are a sequence, and the load-bearing property is the one every
 * valve surface here already has: THE VALVE MUST NOT READ AS CLOSED UNTIL IT
 * IS. A command in flight leaves the position alone.
 *
 * The phase is DERIVED from elapsed time, so every assertion below is a pure
 * function of a number — no timers, no clock mocks, no flake.
 */
describe('the transient phase — valvePhaseAt', () => {
  it('walks the three Figma frames in order and then settles', () => {
    expect(valvePhaseAt(0)).toBe('sending');
    expect(valvePhaseAt(VALVE_SEND_MS - 1)).toBe('sending');
    expect(valvePhaseAt(VALVE_SEND_MS)).toBe('acting');
    expect(valvePhaseAt(VALVE_SEND_MS + VALVE_ACT_MS - 1)).toBe('acting');
    expect(valvePhaseAt(VALVE_SEND_MS + VALVE_ACT_MS)).toBe('verifying');
    expect(valvePhaseAt(VALVE_TRANSITION_MS - 1)).toBe('verifying');
    expect(valvePhaseAt(VALVE_TRANSITION_MS)).toBe('settled');
    expect(valvePhaseAt(VALVE_TRANSITION_MS * 10)).toBe('settled');
  });

  it('refuses a figure that does not place on the timeline', () => {
    expect(valvePhaseAt(-1)).toBeNull();
    expect(valvePhaseAt(NaN)).toBeNull();
    expect(valvePhaseAt('1200')).toBeNull();
    expect(valvePhaseAt(undefined)).toBeNull();
  });
});

describe('the transient phase — a command in flight', () => {
  it('does NOT move the valve while it is running', () => {
    const sys = { id: 'sys-flight', valve: 'open' };
    startValveCommand({ systemId: sys.id, action: 'close' });

    const now = Date.now();
    for (const t of [0, VALVE_SEND_MS, VALVE_SEND_MS + VALVE_ACT_MS, VALVE_TRANSITION_MS - 1]) {
      expect(effectiveValveState(sys, now + t)).toBe('open');
    }
    // And no commanded state has been written behind the scenes.
    expect(getValveCommand(sys.id)).toBeUndefined();
  });

  it('reads as commanded once the window has run, even before it is settled', () => {
    const sys = { id: 'sys-done', valve: 'open' };
    startValveCommand({ systemId: sys.id, action: 'close' });
    expect(effectiveValveState(sys, Date.now() + VALVE_TRANSITION_MS)).toBe('closed');
  });

  it('reports each phase through getValveTransition', () => {
    startValveCommand({ systemId: 'sys-seq', action: 'close' });
    const at = Date.now();
    const phaseAt = (t) => getValveTransition('sys-seq', at + t)?.phase;
    expect(phaseAt(0)).toBe('sending');
    expect(phaseAt(VALVE_SEND_MS + 1)).toBe('acting');
    expect(phaseAt(VALVE_SEND_MS + VALVE_ACT_MS + 1)).toBe('verifying');
    expect(phaseAt(VALVE_TRANSITION_MS)).toBe('settled');

    const live = getValveTransition('sys-seq', at);
    expect(live.action).toBe('close');
    expect(live.state).toBe('closed');
    expect(getValveTransition('nobody')).toBeNull();
  });

  it('survives being read back from storage — the reload case', async () => {
    startValveCommand({ systemId: 'sys-reload', action: 'close' });
    // A fresh module instance over the SAME storage is what a reload is.
    const fresh = await import('../data/valveCommandStore.js?reload=' + Math.random());
    const live = fresh.getValveTransition('sys-reload');
    expect(live).not.toBeNull();
    expect(live.phase).toBe('sending');
    expect(live.action).toBe('close');
  });

  it('settles exactly once and is idempotent after that', () => {
    startValveCommand({ systemId: 'sys-settle', action: 'close' });
    const at = Date.now();
    // Too early: nothing happens.
    expect(settleValveCommand('sys-settle', at)).toBeNull();
    expect(getValveCommand('sys-settle')).toBeUndefined();

    expect(settleValveCommand('sys-settle', at + VALVE_TRANSITION_MS)).toBe('closed');
    expect(getValveCommand('sys-settle')).toBe('closed');
    // The second caller — the other mounted card — gets null and breaks nothing.
    expect(settleValveCommand('sys-settle', at + VALVE_TRANSITION_MS)).toBeNull();
    expect(getValveCommand('sys-settle')).toBe('closed');
    expect(getValveTransition('sys-settle')).toBeNull();
  });

  it('opens as well as closes', () => {
    const sys = { id: 'sys-open', valve: 'closed' };
    startValveCommand({ systemId: sys.id, action: 'open' });
    expect(getValveTransition(sys.id).state).toBe('open');
    expect(effectiveValveState(sys, Date.now() + 10)).toBe('closed');
    expect(settleValveCommand(sys.id, Date.now() + VALVE_TRANSITION_MS)).toBe('open');
    expect(effectiveValveState(sys)).toBe('open');
  });

  it('rejects a start it cannot describe', () => {
    expect(startValveCommand({ systemId: 'x', action: 'toggle' })).toBeNull();
    expect(startValveCommand({ systemId: '', action: 'close' })).toBeNull();
    expect(startValveCommand({ action: 'close' })).toBeNull();
    expect(startValveCommand()).toBeNull();
    expect(getAllValveTransitions()).toEqual({});
  });

  /* THE HOUSE RULE: a stored value that does not validate is REJECTED, never
     repaired. A half-written pending entry must not drive a progress
     indicator, and must never be promoted into a commanded state. */
  it('rejects a stored pending entry that does not validate', () => {
    const stored = {
      states: {},
      pending: {
        'bad-action': { action: 'spin', at: Date.now() },
        'bad-at': { action: 'close', at: 'soon' },
        'from-the-future': { action: 'close', at: Date.now() + 60000 },
        'long-abandoned': { action: 'close', at: Date.now() - 60 * 60 * 1000 },
        'not-an-object': 'close',
      },
      batches: [],
    };
    globalThis.localStorage.setItem(KEY, JSON.stringify(stored));

    expect(getAllValveTransitions()).toEqual({});
    for (const id of Object.keys(stored.pending)) {
      expect(getValveTransition(id)).toBeNull();
      // Not promoted — swept.
      expect(settleValveCommand(id)).toBeNull();
      expect(getValveCommand(id)).toBeUndefined();
    }
  });

  it('cancels without recording a state', () => {
    startValveCommand({ systemId: 'sys-cancel', action: 'close' });
    cancelValveCommand('sys-cancel');
    expect(getValveTransition('sys-cancel')).toBeNull();
    expect(getValveCommand('sys-cancel')).toBeUndefined();
  });

  it('keeps the bulk batches when a single command is started', () => {
    recordBulkValveCommand({ action: 'close', systemIds: ['sys-a'], scopeLabel: 'HQ' });
    startValveCommand({ systemId: 'sys-b', action: 'close' });
    expect(getBulkValveHistory()).toHaveLength(1);
    expect(getValveCommand('sys-a')).toBe('closed');
  });

  it('is wiped by clearValveCommands', () => {
    startValveCommand({ systemId: 'sys-wipe', action: 'close' });
    clearValveCommands();
    expect(getValveTransition('sys-wipe')).toBeNull();
    expect(getAllValveTransitions()).toEqual({});
  });
});

/* ── THE BULK BATCH'S TWO PHASES ──────────────────────────────────────────
 * Owner: "on bulk actio keep it simple -dont need allstates". Running, then
 * settled. Nothing per system.
 */
describe('the bulk batch phase', () => {
  it('is running, then settled, and nothing else', () => {
    expect(bulkValvePhaseAt(0)).toBe('running');
    expect(bulkValvePhaseAt(BULK_SETTLE_MS - 1)).toBe('running');
    expect(bulkValvePhaseAt(BULK_SETTLE_MS)).toBe('settled');
    expect(bulkValvePhaseAt(NaN)).toBeNull();
  });

  it('reports the batch just written, with its elapsed figure', () => {
    const batch = recordBulkValveCommand({
      action: 'close',
      systemIds: ['a', 'b', 'c'],
      skipped: { offline: ['d'], noValve: ['e'] },
      scopeLabel: 'Tel Aviv HQ',
    });
    const view = getActiveBulkValveBatch(batch.at + 100);
    expect(view.id).toBe(batch.id);
    expect(view.phase).toBe('running');
    expect(view.systemIds).toEqual(['a', 'b', 'c']);
    expect(getActiveBulkValveBatch(batch.at + BULK_SETTLE_MS).phase).toBe('settled');
  });

  it('stops reporting a batch once it has been dismissed', () => {
    const batch = recordBulkValveCommand({ action: 'close', systemIds: ['a'] });
    expect(getActiveBulkValveBatch()).not.toBeNull();
    dismissBulkValveBatch(batch.id);
    expect(getActiveBulkValveBatch()).toBeNull();
    // The record itself survives — the history is not the banner.
    expect(getBulkValveHistory()).toHaveLength(1);
  });

  it('stops reporting a batch that is simply old news', () => {
    const batch = recordBulkValveCommand({ action: 'close', systemIds: ['a'] });
    expect(getActiveBulkValveBatch(batch.at + 60 * 60 * 1000)).toBeNull();
  });

  it('survives a reload mid-batch', async () => {
    recordBulkValveCommand({ action: 'close', systemIds: ['a', 'b'], scopeLabel: 'HQ' });
    const fresh = await import('../data/valveCommandStore.js?bulk=' + Math.random());
    const view = fresh.getActiveBulkValveBatch();
    expect(view).not.toBeNull();
    expect(view.phase).toBe('running');
    expect(view.scopeLabel).toBe('HQ');
  });
});
