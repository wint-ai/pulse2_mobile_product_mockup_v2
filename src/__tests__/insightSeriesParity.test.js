/**
 * The insight charts follow the WEB sandbox's generators, not a local one.
 *
 * Owner, 2026-10-21: "i want the insight charts to use same data and patterns
 * exactly as we have in pulse 2 sandbox project". What stood before derived a
 * series from the system's own consumption profile and drew a FLAT baseline at
 * the prior 28 days' mean, so every insight looked alike.
 *
 * These pin the properties that would silently rot if someone re-derived the
 * series locally again — the shape of each type, the sparsity, and the two
 * rules that are easy to lose.
 */
import { describe, it, expect } from 'vitest'
import { getInsightsForSystem, getInsightRows, INSIGHT_KIND } from '@/data/upstream/insightsModel'
import { SYSTEMS } from '@/data/systems'

const all = () => SYSTEMS.flatMap((s) => getInsightsForSystem(s))

describe('insight series follow the web', () => {
  it('background flow is 30 days of HOURLY samples with no expected line', () => {
    const bf = all().find((r) => r.kind === INSIGHT_KIND.BACKGROUND_FLOW)
    expect(bf, 'no background-flow insight in the fleet').toBeTruthy()
    // web: generateRawFlows(baseLph, 30, startIso) — days * 24.
    expect(bf.series).toHaveLength(30 * 24)
    // web InsightRow draws NO baseline for background flow. A fitted stand-in
    // here would be this app inventing an expectation the web never states.
    expect(bf.baseline).toBeNull()
    expect(Math.min(...bf.series)).toBeGreaterThanOrEqual(0.05)
  })

  it('a usage change plots actual against a PER-DAY expected, not a flat mean', () => {
    const uc = all().find((r) => r.kind === INSIGHT_KIND.USAGE_UP || r.kind === INSIGHT_KIND.USAGE_DOWN)
    expect(uc, 'no usage-change insight in the fleet').toBeTruthy()
    expect(uc.series).toHaveLength(uc.baseline.length)
    // The old model's baseline was one value repeated. This one moves.
    expect(new Set(uc.baseline).size).toBeGreaterThan(1)
  })

  it('the series is stable across calls — a chart must not animate under the user', () => {
    // Upstream's own generators for daily consumption call Math.random(), so
    // they reshuffle per call; ours take a seeded rng for exactly this reason.
    const sys = SYSTEMS.find((s) => getInsightsForSystem(s).length > 0)
    const a = getInsightsForSystem(sys)[0]
    const b = getInsightsForSystem(sys)[0]
    expect(a.series).toEqual(b.series)
    expect(a.baseline).toEqual(b.baseline)
  })

  it('insights are OCCASIONAL — most systems carry none', () => {
    // web synthInsightsForSystem: rng() < 0.16 and rng() < 0.13. The point is
    // that the feature does not read as noise; a model that gives nearly every
    // system something to say is the regression this guards.
    const withOne = new Set(all().map((r) => r.systemId))
    expect(withOne.size).toBeLessThan(SYSTEMS.length * 0.45)
    expect(withOne.size).toBeGreaterThan(0)
  })

  it('an all-clear location has no insights anywhere beneath it', () => {
    // web: synthInsightsForSystem returns [] for isAllClearDemoSystem. Buildings
    // C, D and E are the fully-healthy locations — a chart there would
    // contradict the card above it.
    const beneathClear = SYSTEMS.filter((s) => /^esrt-bldg-[CDE]/.test(s.id))
    expect(beneathClear.length).toBeGreaterThan(0)
    for (const s of beneathClear) expect(getInsightsForSystem(s)).toEqual([])
  })

  it('the card still fills, and with a mix of kinds', () => {
    const rows = getInsightRows(SYSTEMS, 4)
    expect(rows).toHaveLength(4)
    expect(new Set(rows.map((r) => r.kind)).size).toBeGreaterThan(1)
  })
})
