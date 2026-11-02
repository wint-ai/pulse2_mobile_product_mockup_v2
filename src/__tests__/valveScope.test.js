// valveScope — the one place that answers "what is this valve, and may I
// command it?".
//
// The load-bearing test here is the owner's hard requirement: AN OFFLINE
// SYSTEM IS COUNTED AT ITS REAL LAST-KNOWN STATE BUT IS NEVER ACTIONABLE AND
// NEVER IN willAct. A user who believes an unreachable valve closed because a
// confirm sheet counted it is the single failure this module exists to
// prevent, so it is pinned from both ends: the chart still sees it, the
// command never does.
//
// Fixtures are built inline and `SYSTEMS` is deliberately NOT imported: the
// demo tree is regenerated whenever upstream data changes, and a test that
// asserts on it is asserting on this week's fixture rather than on the rule.

import { describe, it, expect } from 'vitest'

import {
  VALVE_CATEGORIES,
  valveCategoryOf,
  isReachable,
  canActuate,
  blockedReasonOf,
  summariseValves,
  targetsFor,
  targetsForSelection,
} from '../v2/components/valveScope.js'

/** The shape buildTree.js:528-552 produces, trimmed to the fields this module
 *  reads. `offline` mirrors `comm` exactly as buildTree.js:548 sets it. */
function sys(id, valve, { comm = 'online', ...rest } = {}) {
  return { id, name: `System ${id}`, valve, comm, offline: comm === 'offline', ...rest }
}

const ALL_KEYS = VALVE_CATEGORIES.map((c) => c.key)

describe('VALVE_CATEGORIES', () => {
  it('is bad-state first, in the order PRD 03c:113 locks', () => {
    expect(ALL_KEYS).toEqual(['error', 'open', 'closed', 'none'])
  })

  it('uses the design vocabulary verbatim, not the PRD shorthand', () => {
    const labels = Object.fromEntries(VALVE_CATEGORIES.map((c) => [c.key, c.label]))
    expect(labels).toEqual({
      error: 'Valve Error',
      open: 'Open',
      closed: 'Closed',
      none: 'No valve installed',
    })
  })
})

describe('valveCategoryOf — every value in the domain lands somewhere', () => {
  it("'open' is open", () => {
    expect(valveCategoryOf(sys('a', 'open'))).toBe('open')
  })

  it("'closed' is closed", () => {
    expect(valveCategoryOf(sys('b', 'closed'))).toBe('closed')
  })

  it("'error' is error", () => {
    expect(valveCategoryOf(sys('c', 'error'))).toBe('error')
  })

  // The fifth value (pushEvents.js:153). It renders as OPEN today at
  // ValveStatus.jsx:113; on a control that cuts water that is the one answer
  // that can mislead, so it counts as closed.
  it("'closing' counts as closed, never as open", () => {
    expect(valveCategoryOf(sys('d', 'closing'))).toBe('closed')
  })

  // ValveControlCard.jsx:199 defaults a null valve to 'closed'. Not here.
  it('null is none — never invented into a state', () => {
    expect(valveCategoryOf(sys('e', null))).toBe('none')
    expect(valveCategoryOf(sys('f', undefined))).toBe('none')
    expect(valveCategoryOf(null)).toBe('none')
  })

  it('an unrecognised value is error, not none — there IS hardware', () => {
    expect(valveCategoryOf(sys('g', 'wedged'))).toBe('error')
  })
})

describe('isReachable', () => {
  it('is false on comm offline and on the offline mirror alone', () => {
    expect(isReachable(sys('a', 'open', { comm: 'offline' }))).toBe(false)
    expect(isReachable({ id: 'b', valve: 'open', offline: true })).toBe(false)
  })

  it('is true online, and treats an absent comm as reachable', () => {
    expect(isReachable(sys('c', 'open'))).toBe(true)
    expect(isReachable({ id: 'd', valve: 'open' })).toBe(true)
  })

  it('is false for a missing system', () => {
    expect(isReachable(null)).toBe(false)
  })
})

describe('canActuate — exactly four blocking reasons', () => {
  it('is true for a plain online open valve', () => {
    const s = sys('ok', 'open')
    expect(blockedReasonOf(s)).toBeNull()
    expect(canActuate(s)).toBe(true)
  })

  it("blocks a valveless system with 'no-valve'", () => {
    const s = sys('nv', null)
    expect(blockedReasonOf(s)).toBe('no-valve')
    expect(canActuate(s)).toBe(false)
  })

  it("blocks an offline system with 'offline' (ValveControlCard.jsx:248-253)", () => {
    const s = sys('off', 'open', { comm: 'offline' })
    expect(blockedReasonOf(s)).toBe('offline')
    expect(canActuate(s)).toBe(false)
  })

  it("blocks a faulted valve with 'error'", () => {
    const s = sys('err', 'error')
    expect(blockedReasonOf(s)).toBe('error')
    expect(canActuate(s)).toBe(false)
  })

  it("blocks a valve in transition with 'closing'", () => {
    const s = sys('cl', 'closing')
    expect(blockedReasonOf(s)).toBe('closing')
    expect(canActuate(s)).toBe(false)
  })

  // The labelled hole: nothing in this repo couples power to actuation. If
  // this test ever fails, someone invented a rule — go and ask the owner.
  it('does NOT block on lost AC power or on battery', () => {
    expect(canActuate(sys('p1', 'open', { power: 'ac-lost' }))).toBe(true)
    expect(canActuate(sys('p2', 'open', { power: 'battery' }))).toBe(true)
  })

  it('reports no-valve ahead of offline, and offline ahead of valve state', () => {
    expect(blockedReasonOf(sys('x', null, { comm: 'offline' }))).toBe('no-valve')
    expect(blockedReasonOf(sys('y', 'error', { comm: 'offline' }))).toBe('offline')
  })

  it('blocks a missing system rather than throwing', () => {
    expect(canActuate(undefined)).toBe(false)
  })
})

describe('summariseValves', () => {
  const scope = [
    sys('o1', 'open'),
    sys('o2', 'open'),
    sys('o3', 'open', { comm: 'offline' }), // offline, last known OPEN
    sys('c1', 'closed'),
    sys('c2', 'closing'),
    sys('e1', 'error'),
    sys('e2', 'error', { comm: 'offline' }),
    sys('n1', null),
    sys('n2', null, { comm: 'offline' }),
  ]

  it('counts every system in scope exactly once', () => {
    const s = summariseValves(scope)
    expect(s.total).toBe(9)
    const summed = ALL_KEYS.reduce((n, k) => n + s.byCategory[k].total, 0)
    expect(summed).toBe(s.total)
  })

  // THE OWNER'S REQUIREMENT, as a test. The offline open valve is still in the
  // open slice at its last-known state — hiding it would understate the scope
  // — and is still excluded from everything that can be commanded.
  it('counts an offline system at its real state but never as actionable', () => {
    const { byCategory, offlineTotal, actionableTotal } = summariseValves(scope)

    expect(byCategory.open.total).toBe(3)
    expect(byCategory.open.offline).toBe(1)
    expect(byCategory.open.actionable).toBe(2)

    expect(byCategory.error.total).toBe(2)
    expect(byCategory.error.offline).toBe(1)
    expect(byCategory.error.actionable).toBe(0)

    // o3, e2, n2 — offline is counted across every valve state.
    expect(offlineTotal).toBe(3)
    // o1, o2, c1 only: closing, error, offline and valveless are all out.
    expect(actionableTotal).toBe(3)
  })

  it("files 'closing' under closed and keeps it out of actionable", () => {
    const { byCategory } = summariseValves(scope)
    expect(byCategory.closed.total).toBe(2) // c1 + c2
    expect(byCategory.closed.actionable).toBe(1) // c1 only
  })

  it('never makes a valveless system actionable, and excludes it from valveTotal', () => {
    const { byCategory, valveTotal } = summariseValves(scope)
    expect(byCategory.none.total).toBe(2)
    expect(byCategory.none.actionable).toBe(0)
    expect(valveTotal).toBe(7)
  })

  it('summarises a scope with no valve-bearing systems without throwing', () => {
    const s = summariseValves([sys('n1', null), sys('n2', null)])
    expect(s.total).toBe(2)
    expect(s.valveTotal).toBe(0)
    expect(s.actionableTotal).toBe(0)
    expect(s.byCategory.none.total).toBe(2)
  })

  it('summarises an empty scope, and a non-array, without throwing', () => {
    for (const input of [[], undefined, null, 'nope']) {
      const s = summariseValves(input)
      expect(s.total).toBe(0)
      expect(s.valveTotal).toBe(0)
      expect(s.actionableTotal).toBe(0)
      expect(s.offlineTotal).toBe(0)
    }
  })

  it('a null or undefined entry in the array does not throw', () => {
    const s = summariseValves([sys('o1', 'open'), null, undefined, sys('n1', null)])
    expect(s.total).toBe(2)
    expect(s.actionableTotal).toBe(1)
    expect(s.byCategory.none.total).toBe(1)
  })
})

describe('targetsFor', () => {
  const offline = sys('off', 'open', { comm: 'offline' })
  const plain = sys('ok', 'open')
  const valveless = sys('nv', null)
  const faulted = sys('err', 'error')
  const transit = sys('cl', 'closing')
  const already = sys('shut', 'closed')
  const scope = [offline, plain, valveless, faulted, transit, already]

  it('puts an offline selected system in skipped.offline and never in willAct', () => {
    const { selected, willAct, skipped } = targetsFor(scope, ['open'], 'close')

    expect(selected.map((s) => s.id)).toEqual(['off', 'ok'])
    expect(skipped.offline.map((s) => s.id)).toEqual(['off'])
    expect(willAct.map((s) => s.id)).toEqual(['ok'])
    expect(willAct).not.toContain(offline)
  })

  it('willAct.length !== selected.length whenever anything is skipped', () => {
    const { selected, willAct, skipped } = targetsFor(scope, ALL_KEYS, 'close')

    expect(selected).toHaveLength(6)
    expect(willAct.map((s) => s.id)).toEqual(['ok'])
    expect(willAct.length).not.toBe(selected.length)

    expect(skipped.offline.map((s) => s.id)).toEqual(['off'])
    expect(skipped.noValve.map((s) => s.id)).toEqual(['nv'])
    expect(skipped.faulted.map((s) => s.id)).toEqual(['err'])
    expect(skipped.closing.map((s) => s.id)).toEqual(['cl'])
    expect(skipped.alreadyInState.map((s) => s.id)).toEqual(['shut'])
  })

  it('partitions selected exactly — nothing counted twice, nothing lost', () => {
    const { selected, willAct, skipped } = targetsFor(scope, ALL_KEYS, 'open')
    const bucketed = Object.values(skipped).reduce((n, b) => n + b.length, 0)
    expect(willAct.length + bucketed).toBe(selected.length)
  })

  // The bucket names recordBulkValveCommand({ skipped }) expects
  // (valveCommandStore.js:82). A rename here silently drops a bucket there.
  it('names its skip buckets exactly as the command store does', () => {
    const { skipped } = targetsFor([], ['open'], 'close')
    expect(Object.keys(skipped).sort()).toEqual(
      ['alreadyInState', 'closing', 'faulted', 'noValve', 'offline'],
    )
  })

  it('skips a valve already in the commanded state, in both directions', () => {
    const closeIt = targetsFor([already, plain], ALL_KEYS, 'close')
    expect(closeIt.skipped.alreadyInState.map((s) => s.id)).toEqual(['shut'])
    expect(closeIt.willAct.map((s) => s.id)).toEqual(['ok'])

    const openIt = targetsFor([already, plain], ALL_KEYS, 'open')
    expect(openIt.skipped.alreadyInState.map((s) => s.id)).toEqual(['ok'])
    expect(openIt.willAct.map((s) => s.id)).toEqual(['shut'])
  })

  it('accepts selectedKeys as a Set as well as an array', () => {
    const asSet = targetsFor(scope, new Set(['open']), 'close')
    const asArray = targetsFor(scope, ['open'], 'close')
    expect(asSet.willAct.map((s) => s.id)).toEqual(asArray.willAct.map((s) => s.id))
  })

  it('selects nothing when no category is selected', () => {
    expect(targetsFor(scope, [], 'close').selected).toEqual([])
    expect(targetsFor(scope, undefined, 'close').willAct).toEqual([])
  })

  it('selects nothing for an action that is not open or close', () => {
    const r = targetsFor(scope, ALL_KEYS, 'retry')
    expect(r.selected).toEqual([])
    expect(r.willAct).toEqual([])
    expect(r.skipped.alreadyInState).toEqual([])
  })

  it('a null or undefined system in the array does not throw', () => {
    const r = targetsFor([plain, null, undefined, offline], ALL_KEYS, 'close')
    expect(r.selected.map((s) => s.id)).toEqual(['ok', 'off'])
    expect(r.willAct.map((s) => s.id)).toEqual(['ok'])
  })

  it('returns systems, not ids — the sheet lists offline ones by name', () => {
    const { skipped } = targetsFor(scope, ALL_KEYS, 'close')
    expect(skipped.offline[0].name).toBe('System off')
  })
})

// targetsForSelection is targetsFor keyed on SYSTEM ID instead of on chart
// category: the overview card selects whole slices, ValveManagementScreen
// selects individual systems. It lived in that screen for one change and has
// been moved here beside its twin, because the actuation rule is compared at
// exactly ONE site and a copy of the partition in a page is the defect this
// module exists to prevent. These mirror the targetsFor block above
// one-for-one, so a rule that drifts between the two fails here.
describe('targetsForSelection', () => {
  const offline = sys('off', 'open', { comm: 'offline' })
  const plain = sys('ok', 'open')
  const valveless = sys('nv', null)
  const faulted = sys('err', 'error')
  const transit = sys('cl', 'closing')
  const already = sys('shut', 'closed')
  const scope = [offline, plain, valveless, faulted, transit, already]
  const ALL_IDS = scope.map((s) => s.id)

  // THE LOAD-BEARING ONE. The owner's hard requirement, per system.
  it('puts a selected offline system in skipped.offline and NEVER in willAct', () => {
    const { selected, willAct, skipped } = targetsForSelection(scope, ['off', 'ok'], 'close')

    expect(selected.map((s) => s.id)).toEqual(['off', 'ok'])
    expect(skipped.offline.map((s) => s.id)).toEqual(['off'])
    expect(willAct.map((s) => s.id)).toEqual(['ok'])
    expect(willAct).not.toContain(offline)
  })

  it('keeps the offline system out of willAct in the OPEN direction too', () => {
    const offlineClosed = sys('offc', 'closed', { comm: 'offline' })
    const { willAct, skipped } = targetsForSelection([offlineClosed, already], ['offc', 'shut'], 'open')

    expect(skipped.offline.map((s) => s.id)).toEqual(['offc'])
    expect(willAct.map((s) => s.id)).toEqual(['shut'])
  })

  it('willAct.length !== selected.length whenever anything is skipped', () => {
    const { selected, willAct, skipped } = targetsForSelection(scope, ALL_IDS, 'close')

    expect(selected).toHaveLength(6)
    expect(willAct.map((s) => s.id)).toEqual(['ok'])
    expect(willAct.length).not.toBe(selected.length)

    expect(skipped.offline.map((s) => s.id)).toEqual(['off'])
    expect(skipped.noValve.map((s) => s.id)).toEqual(['nv'])
    expect(skipped.faulted.map((s) => s.id)).toEqual(['err'])
    expect(skipped.closing.map((s) => s.id)).toEqual(['cl'])
    expect(skipped.alreadyInState.map((s) => s.id)).toEqual(['shut'])
  })

  it('partitions selected exactly — nothing counted twice, nothing lost', () => {
    const { selected, willAct, skipped } = targetsForSelection(scope, ALL_IDS, 'open')
    const bucketed = Object.values(skipped).reduce((n, b) => n + b.length, 0)
    expect(willAct.length + bucketed).toBe(selected.length)
  })

  // The bucket names recordBulkValveCommand({ skipped }) expects
  // (valveCommandStore.js:82), and the names BulkValveConfirmSheet's props
  // are built from. Identical to targetsFor's, which is why both callers can
  // feed the same store and the same sheet.
  it('names its skip buckets exactly as the command store does', () => {
    const { skipped } = targetsForSelection([], ['ok'], 'close')
    expect(Object.keys(skipped).sort()).toEqual(
      ['alreadyInState', 'closing', 'faulted', 'noValve', 'offline'],
    )
  })

  it('skips a valve already in the commanded state, in both directions', () => {
    const closeIt = targetsForSelection([already, plain], ['shut', 'ok'], 'close')
    expect(closeIt.skipped.alreadyInState.map((s) => s.id)).toEqual(['shut'])
    expect(closeIt.willAct.map((s) => s.id)).toEqual(['ok'])

    const openIt = targetsForSelection([already, plain], ['shut', 'ok'], 'open')
    expect(openIt.skipped.alreadyInState.map((s) => s.id)).toEqual(['ok'])
    expect(openIt.willAct.map((s) => s.id)).toEqual(['shut'])
  })

  it('accepts selectedIds as a Set as well as an array', () => {
    const asSet = targetsForSelection(scope, new Set(['off', 'ok']), 'close')
    const asArray = targetsForSelection(scope, ['off', 'ok'], 'close')
    expect(asSet.willAct.map((s) => s.id)).toEqual(asArray.willAct.map((s) => s.id))
    expect(asSet.selected.map((s) => s.id)).toEqual(asArray.selected.map((s) => s.id))
  })

  it('selects nothing when nothing is selected', () => {
    expect(targetsForSelection(scope, [], 'close').selected).toEqual([])
    expect(targetsForSelection(scope, undefined, 'close').willAct).toEqual([])
  })

  it('selects nothing for an action that is not open or close', () => {
    const r = targetsForSelection(scope, ALL_IDS, 'retry')
    expect(r.selected).toEqual([])
    expect(r.willAct).toEqual([])
    expect(r.skipped.alreadyInState).toEqual([])
  })

  it('a null or undefined system in the array does not throw', () => {
    const r = targetsForSelection([plain, null, undefined, offline], ALL_IDS, 'close')
    expect(r.selected.map((s) => s.id)).toEqual(['ok', 'off'])
    expect(r.willAct.map((s) => s.id)).toEqual(['ok'])
  })

  it('returns systems, not ids — the sheet lists offline ones by name', () => {
    const { skipped } = targetsForSelection(scope, ALL_IDS, 'close')
    expect(skipped.offline[0].name).toBe('System off')
  })

  it('ignores an id that matches no system in the scope', () => {
    const r = targetsForSelection(scope, ['ok', 'ghost'], 'close')
    expect(r.selected.map((s) => s.id)).toEqual(['ok'])
    expect(r.willAct.map((s) => s.id)).toEqual(['ok'])
  })

  // The two selectors share one partition. Select the same systems by id that
  // a category key would select, and the answers must be identical — if they
  // ever diverge, the rule has been copied rather than called.
  it('agrees with targetsFor when the two select the same systems', () => {
    const byKey = targetsFor(scope, ALL_KEYS, 'close')
    const byId = targetsForSelection(scope, byKey.selected.map((s) => s.id), 'close')

    expect(byId.willAct.map((s) => s.id)).toEqual(byKey.willAct.map((s) => s.id))
    for (const bucket of Object.keys(byKey.skipped)) {
      expect(byId.skipped[bucket].map((s) => s.id)).toEqual(
        byKey.skipped[bucket].map((s) => s.id),
      )
    }
  })
})
