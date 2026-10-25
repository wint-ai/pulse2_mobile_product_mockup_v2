/**
 * NO LOCATION MAY HAVE MORE THAN 20% OF ITS SYSTEMS ON AN ACTIVE WATER EVENT.
 *
 * Owner, 2026-10-24: "i want to add another rule in any location / not more
 * than 20% of systems with active water events".
 *
 * It replaced a ceil(n/2) budget in buildTree.js whose own comment argued the
 * 50% ceiling should not bind water events at all. That argument is overruled,
 * and this file is what stops it being re-argued by accident: the budget is one
 * expression in a 600-line generator, and nothing else would notice it moving.
 *
 * WATER EVENTS ARE NOT ALL ALERTS. `s.alert` is also how a device fault
 * surfaces — buildAlert returns `offline`, `valve`, `power` types from the same
 * field — so counting `s.alert` here would measure health and water together
 * and the cap would read as violated when it is not. That mistake was made
 * while writing this: three sites appeared to sit at 40% until the predicate
 * was narrowed to the two leak types. Health is errors; water events are not
 * health (owner, 2026-10-21), and the predicate below is the whole of that
 * distinction.
 */
import { describe, it, expect } from 'vitest'
import { SYSTEMS } from '@/data/systems'
import { WATER_EVENT_SITE_CAP } from '@/data/upstream/buildTree'

const isWaterEvent = (s) => s.alert?.type === 'leak-high' || s.alert?.type === 'leak-low'

/** systems grouped by their location (l4), which is the "location" the rule names */
function bySite() {
  const sites = new Map()
  for (const s of SYSTEMS) {
    const key = s.l4Name || 'Unassigned Systems'
    if (!sites.has(key)) sites.set(key, [])
    sites.get(key).push(s)
  }
  return sites
}

describe('water events are capped at 20% of a location', () => {
  it('no location exceeds the cap', () => {
    const over = []
    for (const [name, systems] of bySite()) {
      const events = systems.filter(isWaterEvent).length
      const share = events / systems.length
      if (share > WATER_EVENT_SITE_CAP + 1e-9) {
        over.push(`${name}: ${events}/${systems.length} = ${Math.round(share * 100)}%`)
      }
    }
    expect(over, `locations above ${WATER_EVENT_SITE_CAP * 100}%:\n  ${over.join('\n  ')}`)
      .toEqual([])
  })

  it('the cap is floor, not round — round would allow 25% on a 4-system site', () => {
    /* Not a style preference: round(4 * 0.2) is 1, which is 25% and breaks the
       rule in the owner's own words. Floor is the only spelling that cannot
       exceed the cap, so it is pinned rather than left to whoever edits next. */
    for (const [, systems] of bySite()) {
      const allowed = Math.floor(systems.length * WATER_EVENT_SITE_CAP)
      expect(systems.filter(isWaterEvent).length).toBeLessThanOrEqual(allowed)
    }
  })

  it('the cap did not empty the dataset — water events still exist to look at', () => {
    /* The cap is a ceiling, not a target. A generator change that silently
       produced zero events everywhere would satisfy the rule above and make
       every water-event surface in the app untestable by hand. */
    const total = SYSTEMS.filter(isWaterEvent).length
    expect(total).toBeGreaterThan(0)
    const sitesWithOne = [...bySite().values()].filter((ss) => ss.some(isWaterEvent)).length
    expect(sitesWithOne).toBeGreaterThanOrEqual(3)
  })

  it('still contains a system that is leaking with no device fault', () => {
    /* The owner's 2026-10-21 case — "system can be 100% health but with active
       water event" — which healthIsNotWaterEvents.dom.test.jsx also guards.
       Repeated here because the cap is exactly the kind of change that could
       delete it: squeeze the event budget far enough and the only survivors
       are the ones that landed on already-faulted systems. */
    const healthyAndLeaking = SYSTEMS.filter(
      (s) => isWaterEvent(s) && s.comm !== 'offline' && s.valve !== 'error' && s.power === 'ac',
    )
    expect(healthyAndLeaking.length).toBeGreaterThan(0)
  })

  it('the ten-unit residential buildings keep their parity pair', () => {
    /* floor(10 * 0.2) is 2, which is exactly the Apartment 2 / Apartment 5
       high/low pair the residential branch in buildTree preserves. If the cap
       is ever lowered, this is the first thing it breaks, and the two apps stop
       agreeing on those buildings. */
    for (const [name, systems] of bySite()) {
      if (!/^Building [AB]$/.test(name)) continue
      expect(systems.length, name).toBe(10)
      expect(systems.filter(isWaterEvent).length, name).toBe(2)
    }
  })

  it('at least three locations stay completely free of water events', () => {
    // Owner, 2026-10-21: "i want at least 3 location fully healthy wo any
    // water events". Buildings C, D and E are the all-clear sites.
    const clear = [...bySite().values()].filter((ss) => !ss.some(isWaterEvent))
    expect(clear.length).toBeGreaterThanOrEqual(3)
  })
})
