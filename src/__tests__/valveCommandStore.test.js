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
