/**
 * `reduceFlowPoints` and `flowMilestones` — the two halves of the 2026-11-04
 * rework of EventFocusOverlay's event chart.
 *
 * ITS OWN FILE because recharts renders nothing under happy-dom, which is the
 * standing reason every decision about WHAT this chart plots lives in
 * `eventFlowSeries.js` as a pure function. A DOM test of the chart would pass
 * vacuously; these do not.
 *
 * THE TEST THAT MATTERS is "a one-minute crossing survives every ladder step".
 * The reducer exists because a ten-hour event draws 618 samples into a 311px
 * plot; the one thing it may not cost is the sample that crossed a level. The
 * measurement that ruled out a moving average is in the module header — a
 * 1,180 L/h one-minute spike flattens to 700 at a 2-minute window and 307 at
 * ten — so the guarantee is asserted here rather than assumed.
 */
import { describe, it, expect } from 'vitest'
import {
  FLOW_BUCKET_LADDER,
  buildEventFlowSeries,
  flowMilestones,
  flowTickInterval,
  reduceFlowPoints,
} from '@/v2/components/eventFlowSeries'

/** One sample a minute from `startClock`, flat at `base`, with spikes injected. */
function synth({ minutes, base = 220, startClock = '09:00', spikes = {} }) {
  const [h, m] = startClock.split(':').map(Number)
  const out = []
  for (let i = 0; i <= minutes; i++) {
    const tod = (h * 60 + m + i) % 1440
    out.push({
      minute: i,
      label: `${String(Math.floor(tod / 60)).padStart(2, '0')}:${String(tod % 60).padStart(2, '0')}`,
      lph: spikes[i] ?? base,
    })
  }
  return out
}

describe('reduceFlowPoints', () => {
  it('does not reduce at all below the ceiling - a 45-minute event is untouched', () => {
    const { points } = buildEventFlowSeries({ key: 'k', durationMin: 45, startClock: '10:18' })
    const r = reduceFlowPoints(points)
    expect(r.bucketMinutes).toBe(1)
    expect(r.points).toBe(points)
  })

  it('leaves five hours alone and reduces past it', () => {
    // 300 points is ~1 per pixel on this chart's 311px plot. Under it, 2x is
    // not a problem worth spending samples on.
    const justUnder = reduceFlowPoints(synth({ minutes: 290 }))
    expect(justUnder.bucketMinutes).toBe(1)
    const over = reduceFlowPoints(synth({ minutes: 600 }))
    expect(over.bucketMinutes).toBeGreaterThan(1)
    expect(over.points.length).toBeLessThanOrEqual(300)
  })

  it('picks the SMALLEST ladder step that fits, and only ladder steps', () => {
    for (const minutes of [600, 900, 1200, 1439]) {
      const { bucketMinutes, points } = reduceFlowPoints(synth({ minutes }))
      expect(FLOW_BUCKET_LADDER, `${minutes}m`).toContain(bucketMinutes)
      expect(points.length, `${minutes}m`).toBeLessThanOrEqual(300)
      const smaller = FLOW_BUCKET_LADDER[FLOW_BUCKET_LADDER.indexOf(bucketMinutes) - 1]
      if (smaller) {
        // Anything smaller would have overflowed - this IS the smallest that fits.
        expect(Math.ceil((minutes + 1) / smaller) * 2, `${minutes}m`).toBeGreaterThan(300)
      }
    }
  })

  /* THE ONE THE REDUCER EXISTS FOR. A single minute at 1,180 L/h on a 220
     baseline against a 1,000 L/h shut-off level: the bucket MAXIMUM is a real
     sample, so the crossing is retained by construction at every step of the
     ladder, not by luck. A moving average loses it at every window from two
     minutes up. */
  it('keeps a ONE-MINUTE threshold crossing at every step of the ladder', () => {
    const THRESHOLD = 1000
    const SPIKE_AT = 337
    for (const bucketMinutes of FLOW_BUCKET_LADDER) {
      const raw = synth({ minutes: 600, base: 220, spikes: { [SPIKE_AT]: 1180 } })
      const { points, bucketMinutes: chosen } = reduceFlowPoints(raw, { bucketMinutes })
      expect(chosen, `step ${bucketMinutes}`).toBe(bucketMinutes)

      // The crossing is still drawn...
      expect(Math.max(...points.map(p => p.lph)), `step ${bucketMinutes}`)
        .toBeGreaterThanOrEqual(THRESHOLD)
      // ...and it is the REAL sample, at its own minute, not an average.
      const spike = points.find(p => p.lph === 1180)
      expect(spike, `step ${bucketMinutes}`).toBeDefined()
      expect(spike.minute, `step ${bucketMinutes}`).toBe(SPIKE_AT)
      expect(spike.label, `step ${bucketMinutes}`).toBe(raw[SPIKE_AT].label)
    }
  })

  /* The reason the buckets are cut on the wall clock and not on n/n_out:
     count-proportional buckets re-cut on every arriving sample, which moved
     the drawn line by up to 96-140px on a 185px chart - on settled history an
     hour old, not only at the live edge. */
  it('is anchored to the wall clock, so an arriving sample does not move settled history', () => {
    const base = synth({ minutes: 700, startClock: '09:00' })
    const a = reduceFlowPoints(base.slice(0, 601))
    const b = reduceFlowPoints(base.slice(0, 602))
    expect(a.bucketMinutes).toBe(b.bucketMinutes)
    // Every retained point of the shorter run, bar its own forced live edge,
    // is retained at the same minute in the longer one.
    const bMinutes = new Set(b.points.map(p => p.minute))
    const settled = a.points.slice(0, -1).filter(p => p.minute < 580)
    expect(settled.length).toBeGreaterThan(50)
    for (const p of settled) expect(bMinutes.has(p.minute), `minute ${p.minute}`).toBe(true)
  })

  it('keeps the first and the LIVE EDGE, and stays in timestamp order', () => {
    const raw = synth({ minutes: 620 })
    const { points } = reduceFlowPoints(raw)
    expect(points[0].minute).toBe(raw[0].minute)
    expect(points.at(-1).minute).toBe(raw.at(-1).minute)
    for (let i = 1; i < points.length; i++) {
      expect(points[i].minute).toBeGreaterThan(points[i - 1].minute)
    }
  })

  it('survives a window with no wall clock, and degenerate input', () => {
    const noClock = Array.from({ length: 700 }, (_, i) => ({ minute: i, label: `+${i}m`, lph: 10 + (i % 7) }))
    const { points, bucketMinutes } = reduceFlowPoints(noClock)
    expect(bucketMinutes).toBeGreaterThan(1)
    expect(points.length).toBeLessThanOrEqual(300)
    expect(reduceFlowPoints([]).points).toEqual([])
    expect(reduceFlowPoints(null).points).toEqual([])
    expect(reduceFlowPoints(undefined).bucketMinutes).toBe(1)
  })
})

describe('flowTickInterval past an hour', () => {
  it('steps past 60 minutes instead of falling through to it', () => {
    // A ten-hour window asked for an hourly tick and recharts then dropped
    // whichever labels collided, which is how the axis came to read 02:00 ..
    // 10:00 with the first and last hours missing.
    const tenHours = synth({ minutes: 610 })
    const step = flowTickInterval(tenHours)
    expect(step).toBeGreaterThan(60)
    expect(611 / step).toBeLessThanOrEqual(7)
  })

  it('is unchanged for the windows it already handled', () => {
    for (const [durationMin, expected] of [[20, 5], [45, 10], [120, 30]]) {
      const { points } = buildEventFlowSeries({ key: 'k', durationMin, startClock: '10:18' })
      expect(flowTickInterval(points), `${durationMin}m`).toBe(expected)
    }
  })
})

describe('flowMilestones - the owner`s four, chosen per event', () => {
  const DETECTED = '2026-11-04T08:00:00.000Z'
  const build = o => buildEventFlowSeries({ key: 'm', durationMin: 120, startClock: '08:00', ...o })

  it('draws Event detected alone on a leak that has only just been found', () => {
    const { points, marks } = build({ detectLagMin: 3 })
    const record = { detectedAtIso: DETECTED, endedAtIso: null, milestones: [{ kind: 'detected', atIso: DETECTED }] }
    const ms = flowMilestones({ points, marks, record })
    expect(ms.map(m => m.label)).toEqual(['Event detected'])
  })

  it('adds Ongoing once the record says it continued, and never Ended', () => {
    const { points, marks } = build({ detectLagMin: 3 })
    const record = {
      detectedAtIso: DETECTED,
      endedAtIso: null,
      milestones: [
        { kind: 'detected', atIso: DETECTED },
        { kind: 'continues', atIso: '2026-11-04T09:00:00.000Z' },
      ],
    }
    const ms = flowMilestones({ points, marks, record })
    expect(ms.map(m => m.label)).toEqual(['Event detected', 'Ongoing'])
    expect(ms.map(m => m.label)).not.toContain('Ended')
    // +60 minutes from detection, which sits at minute 3 on this chart.
    expect(ms.find(m => m.key === 'ongoing').minute).toBe(63)
  })

  /* HIS ORDER IS THE CHRONOLOGICAL ONE for an event that lived through all
     four, which is the only reading of "max 4" under which four is reachable:
     detected, reached the shut-off level, carried on, ended. */
  it('reaches all four, in the owner`s order, on an event that lived through them', () => {
    const { points, marks } = buildEventFlowSeries({
      key: 'four', durationMin: 240, detectLagMin: 3, shutoffMin: 120, startClock: '08:00',
    })
    const record = {
      detectedAtIso: DETECTED,
      endedAtIso: '2026-11-04T10:10:00.000Z',
      milestones: [{ kind: 'continues', atIso: '2026-11-04T09:00:00.000Z' }],
    }
    const ms = flowMilestones({ points, marks, record, isEnded: true })
    expect(ms.map(m => m.label)).toEqual([
      'Event detected', 'Ongoing', 'Shut-off level', 'Ended',
    ])
    expect(ms.length).toBe(4)
  })

  it('has NO Shut-off level on a leak that never reached shut-off', () => {
    const { points, marks } = build({ detectLagMin: 3, shutoffMin: null })
    const record = { detectedAtIso: DETECTED, endedAtIso: null, milestones: [] }
    expect(flowMilestones({ points, marks, record }).map(m => m.key)).not.toContain('shutoff')
  })

  it('draws Shut-off level where the water actually stopped', () => {
    const { points, marks } = build({ detectLagMin: 3, shutoffMin: 20 })
    const record = { detectedAtIso: DETECTED, endedAtIso: null, milestones: [] }
    const ms = flowMilestones({ points, marks, record })
    expect(ms.map(m => m.label)).toEqual(['Event detected', 'Shut-off level'])
    expect(ms.find(m => m.key === 'shutoff').minute).toBe(23)
  })

  it('marks Ended at the end of the window when the record was tombstoned', () => {
    // A concluded event reached through the overlay's third branch has no
    // record left to read - only the fact that it ended.
    const { points, marks } = build({ detectLagMin: 3, shutoffMin: 20 })
    const ms = flowMilestones({ points, marks, record: null, isEnded: true })
    expect(ms.map(m => m.label)).toEqual(['Event detected', 'Shut-off level', 'Ended'])
    expect(ms.find(m => m.key === 'ended').minute).toBe(points.at(-1).minute)
  })

  it('never draws more than four, whatever the record carries', () => {
    const { points, marks } = build({ detectLagMin: 3, shutoffMin: 20 })
    const record = {
      detectedAtIso: DETECTED,
      endedAtIso: '2026-11-04T09:30:00.000Z',
      milestones: [
        { kind: 'continues', atIso: '2026-11-04T08:30:00.000Z' },
        { kind: 'on-it', atIso: '2026-11-04T08:20:00.000Z' },
        { kind: 'alert-sent', atIso: DETECTED },
        { kind: 'volume-milestone', atIso: '2026-11-04T09:00:00.000Z' },
      ],
    }
    expect(flowMilestones({ points, marks, record, isEnded: true }).length).toBeLessThanOrEqual(4)
  })

  /* CDC documents the failure mode a snapped annotation has: it DISAPPEARS
     when the reducer drops its sample. The milestone keeps its own minute and
     reads its y from the FULL series, so reduction cannot delete it. */
  it('survives reduction - a milestone is not snapped to a retained sample', () => {
    const { points, marks } = buildEventFlowSeries({
      key: 'long', durationMin: 600, detectLagMin: 3, startClock: '08:00',
    })
    const record = {
      detectedAtIso: DETECTED,
      endedAtIso: null,
      milestones: [{ kind: 'continues', atIso: '2026-11-04T09:07:00.000Z' }],
    }
    const ms = flowMilestones({ points, marks, record })
    const reduced = reduceFlowPoints(points)
    expect(reduced.bucketMinutes).toBeGreaterThan(1)
    expect(ms.map(m => m.key)).toContain('ongoing')
    for (const m of ms) {
      expect(Number.isFinite(m.minute)).toBe(true)
      expect(Number.isFinite(m.lph)).toBe(true)
      expect(m.at).toMatch(/^\d{2}:\d{2}$/)
    }
  })

  it('returns nothing rather than guessing when there are no points', () => {
    expect(flowMilestones({ points: [], marks: [], record: null })).toEqual([])
    expect(flowMilestones({})).toEqual([])
  })
})
