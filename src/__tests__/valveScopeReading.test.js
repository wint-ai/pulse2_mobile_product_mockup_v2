// valveScope — the two 2026-11-02 additions, pinned separately.
//
// `valveScope.test.js` (440 lines) is the regression proof for the EXISTING
// semantics and is deliberately left untouched by the valve redesign: if the
// four `blockedReasonOf` reasons, their precedence, `canActuate`, `partition`
// or the five bucket names had moved, that file would say so. This one covers
// only what was ADDED:
//
//  · `isSelectable`, MOVED IN from `ValveManagementScreen.jsx:315-317` where
//    it was a fifth eligibility concept living outside the module. Same two
//    lines; these cases pin that it is the same answer.
//  · `valveCertaintyOf` / `valveReadingOf`, NEW — the third token for "we are
//    not looking at this right now". The point of them is a belief: an offline
//    system reads "last known: open", never "open". The owner's hard
//    requirement is about exactly that belief ("to not let him think that this
//    valve will take place on this operation that he wants to").
//
// Fixtures inline, `SYSTEMS` not imported — same reason the sibling file
// gives.

import { describe, it, expect } from 'vitest'

import {
  VALVE_CATEGORIES,
  valveCategoryOf,
  isReachable,
  isSelectable,
  canActuate,
  valveCertaintyOf,
  valveReadingOf,
} from '../v2/components/valveScope.js'

/** The shape buildTree.js:528-552 produces, trimmed to the fields read here. */
function sys(id, valve, { comm = 'online', ...rest } = {}) {
  return { id, name: `System ${id}`, valve, comm, offline: comm === 'offline', ...rest }
}

describe('isSelectable', () => {
  it('is false for a system with no valve, and for nothing else', () => {
    expect(isSelectable(sys('a', null))).toBe(false)
    expect(isSelectable(sys('a', undefined))).toBe(false)
    expect(isSelectable(sys('a', 'open'))).toBe(true)
    expect(isSelectable(sys('a', 'closed'))).toBe(true)
    expect(isSelectable(sys('a', 'closing'))).toBe(true)
    expect(isSelectable(sys('a', 'error'))).toBe(true)
  })

  it('keeps an OFFLINE system selectable — it may come back', () => {
    const s = sys('a', 'open', { comm: 'offline' })
    expect(isSelectable(s)).toBe(true)
    // …and is therefore NOT the same question as canActuate, which is the
    // distinction the move into this module is there to preserve.
    expect(canActuate(s)).toBe(false)
  })

  it('keeps a FAULTED system selectable, for the same reason', () => {
    expect(isSelectable(sys('a', 'error'))).toBe(true)
    expect(canActuate(sys('a', 'error'))).toBe(false)
  })

  it('is exactly `valveCategoryOf(s) !== "none"` for every category', () => {
    const fixtures = [
      sys('a', 'error'),
      sys('b', 'open'),
      sys('c', 'closed'),
      sys('d', null),
      sys('e', 'closing'),
      sys('f', 'banana'),
    ]
    for (const s of fixtures) {
      expect(isSelectable(s)).toBe(valveCategoryOf(s) !== 'none')
    }
  })

  it('does not throw on a missing system', () => {
    expect(isSelectable(undefined)).toBe(false)
    expect(isSelectable(null)).toBe(false)
  })
})

describe('valveCertaintyOf', () => {
  it('is live for a reachable system with a valve', () => {
    expect(valveCertaintyOf(sys('a', 'open'))).toBe('live')
    expect(valveCertaintyOf(sys('a', 'closed'))).toBe('live')
    expect(valveCertaintyOf(sys('a', 'error'))).toBe('live')
  })

  it('is last-known the moment the device is unreachable', () => {
    expect(valveCertaintyOf(sys('a', 'open', { comm: 'offline' }))).toBe('last-known')
    // `offline` is comm's mirror; either field alone has to be enough.
    expect(valveCertaintyOf({ id: 'a', valve: 'closed', offline: true })).toBe('last-known')
  })

  it('is not-applicable when there is no valve — known absent, not unknown', () => {
    expect(valveCertaintyOf(sys('a', null))).toBe('not-applicable')
  })

  it('answers not-applicable BEFORE last-known, matching blockedReasonOf precedence', () => {
    expect(valveCertaintyOf(sys('a', null, { comm: 'offline' }))).toBe('not-applicable')
  })

  it('tracks isReachable exactly for every system that has a valve', () => {
    for (const valve of ['open', 'closed', 'closing', 'error']) {
      for (const comm of ['online', 'offline']) {
        const s = sys('a', valve, { comm })
        expect(valveCertaintyOf(s)).toBe(isReachable(s) ? 'live' : 'last-known')
      }
    }
  })

  it('does not throw on a missing system', () => {
    expect(valveCertaintyOf(undefined)).toBe('not-applicable')
  })
})

describe('valveReadingOf', () => {
  it('returns the category, the certainty and the design vocabulary together', () => {
    expect(valveReadingOf(sys('a', 'open'))).toEqual({
      categoryKey: 'open',
      certainty: 'live',
      label: 'Open',
    })
    expect(valveReadingOf(sys('a', 'open', { comm: 'offline' }))).toEqual({
      categoryKey: 'open',
      certainty: 'last-known',
      label: 'Open',
    })
  })

  it('KEEPS THE OFFLINE SYSTEM AT ITS REAL LAST-KNOWN STATE — the category does not change', () => {
    // The owner's requirement cuts both ways: an offline valve must not be
    // counted into an operation, AND it must not be erased from the scope.
    // Certainty is the only field reachability may touch.
    const online = valveReadingOf(sys('a', 'closed'))
    const offline = valveReadingOf(sys('a', 'closed', { comm: 'offline' }))
    expect(offline.categoryKey).toBe(online.categoryKey)
    expect(offline.label).toBe(online.label)
    expect(offline.certainty).not.toBe(online.certainty)
  })

  it("uses VALVE_CATEGORIES' labels verbatim, never a re-spelling", () => {
    for (const { key, label } of VALVE_CATEGORIES) {
      const valve = key === 'none' ? null : key
      expect(valveReadingOf(sys('a', valve)).label).toBe(label)
    }
    // Figma 199535:96542's exact words, which three surfaces have to quote.
    expect(valveReadingOf(sys('a', 'error')).label).toBe('Valve Error')
    expect(valveReadingOf(sys('a', null)).label).toBe('No valve installed')
  })

  it("files 'closing' as closed, exactly as valveCategoryOf does", () => {
    expect(valveReadingOf(sys('a', 'closing'))).toEqual({
      categoryKey: 'closed',
      certainty: 'live',
      label: 'Closed',
    })
  })

  it('files an unrecognised valve value as error, not as none', () => {
    expect(valveReadingOf(sys('a', 'banana')).categoryKey).toBe('error')
  })

  it('does not throw on a missing system', () => {
    expect(valveReadingOf(undefined)).toEqual({
      categoryKey: 'none',
      certainty: 'not-applicable',
      label: 'No valve installed',
    })
  })

  it('is PURE — it does not mutate the system it is handed', () => {
    const s = sys('a', 'open', { comm: 'offline' })
    const before = JSON.stringify(s)
    valveReadingOf(s)
    expect(JSON.stringify(s)).toBe(before)
  })
})
