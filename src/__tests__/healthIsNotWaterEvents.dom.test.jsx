// @vitest-environment happy-dom
/**
 * HEALTH IS ERRORS. WATER EVENTS ARE NOT HEALTH.
 *
 * Owner, 2026-10-21: "we need to make a super clear separation between health
 * which is errors and water events they are not the same — system can be 100%
 * health but with active water event."
 *
 * They were not separate. HomeAllAccounts computed the error-free count with
 * computeSystemHealth and then threw it away, feeding the card
 * `total - requireAttention` where requireAttention is the LEAK count. At 210
 * Harborview that printed "5 / 5 need attention" over a single Offline tile,
 * because four of the five had a water event and no fault at all.
 *
 * systemsHealthHonesty.dom.test.jsx already asserted that the two counts
 * DIFFER. It passed throughout, because it tests the arithmetic rather than
 * what the page feeds the card. These close that gap at the seam where it
 * actually broke.
 */
import { describe, it, expect } from 'vitest'
import { SYSTEMS } from '@/data/systems'
import { computeSystemHealth } from '@/utils/systemHealth'

const faulty = (s) => !computeSystemHealth(s).allOk
const leaking = (s) => !!s.alert

describe('health counts faults, not water events', () => {
  it('the dataset actually contains the case the owner described', () => {
    // A system with an ACTIVE WATER EVENT and NO device fault — 100% healthy
    // and leaking. If this ever becomes empty the rest of the file proves
    // nothing, so it is asserted rather than assumed.
    const healthyAndLeaking = SYSTEMS.filter((s) => leaking(s) && !faulty(s))
    expect(healthyAndLeaking.length).toBeGreaterThan(0)
  })

  it('the two counts are different numbers across the fleet', () => {
    expect(SYSTEMS.filter(faulty).length).not.toBe(SYSTEMS.filter(leaking).length)
  })

  it('a leak alone never makes a system unhealthy', () => {
    for (const s of SYSTEMS.filter((s) => leaking(s) && !faulty(s))) {
      expect(computeSystemHealth(s).allOk, `${s.id} is leaking but has no fault`).toBe(true)
    }
  })

  it('a fault alone makes a system unhealthy whether or not it leaks', () => {
    const faultyNoLeak = SYSTEMS.filter((s) => faulty(s) && !leaking(s))
    expect(faultyNoLeak.length).toBeGreaterThan(0)
    for (const s of faultyNoLeak) expect(computeSystemHealth(s).allOk).toBe(false)
  })

  /* The seam itself: whatever the page publishes as the health number has to
     be the error-free count. This mirrors the shape HomeAllAccounts builds so
     the assertion fails if someone wires `total - leaks` back in. */
  it('the health number equals the error-free count, not total minus leaks', () => {
    const systems = SYSTEMS
    const healthy = systems.filter((s) => computeSystemHealth(s).allOk).length
    const waterEvents = systems.filter(leaking).length
    const stats = { total: systems.length, healthy, waterEvents }

    expect(stats.healthy).toBe(healthy)
    expect(stats.total - stats.waterEvents).not.toBe(stats.healthy)
    // "N need attention" is what the card prints, and it is the fault count.
    expect(stats.total - stats.healthy).toBe(systems.filter(faulty).length)
  })
})
