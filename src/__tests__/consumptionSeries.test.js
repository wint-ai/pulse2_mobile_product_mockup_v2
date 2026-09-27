/**
 * The Y / M / D / H segments on the consumption card used to be a live control
 * with no series behind it: the model is daily-only, so three of the four
 * choices rendered "Nothing flowed in yet". These tests pin the two properties
 * that matter — every granularity returns bars, and the hourly view stays
 * consistent with the day it was split out of.
 */
import { describe, it, expect } from 'vitest'
import { getConsumptionSeries, getFleetConsumptionSeries } from '@/data/consumptionSeries'
import { getConsumption } from '@/data/consumption'
import { SYSTEMS } from '@/data/systems'

const sample = SYSTEMS.slice(0, 5)

describe('getConsumptionSeries', () => {
  it('returns a non-empty series for every granularity, for every sampled system', () => {
    for (const system of sample) {
      for (const period of ['H', 'D', 'M', 'Y']) {
        const { series, label } = getConsumptionSeries(system.id, system.name, period, 0)
        expect(series.length, `${system.id} @ ${period}`).toBeGreaterThan(0)
        expect(label, `${system.id} @ ${period} label`).not.toBe('')
        for (const point of series) {
          /* PRD v2 §5 / PLS-WC-17: a day the month has not reached sits on the
             axis with litres === null — no bar, excluded from the average.
             Only Daily can produce one. */
          if (point.litres === null) {
            expect(period, 'only Daily may hold unreached buckets').toBe('D')
            continue
          }
          expect(Number.isFinite(point.litres)).toBe(true)
          expect(point.litres).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('splits a day into 24 hours that sum to exactly that day', () => {
    for (const system of sample) {
      const { daily } = getConsumption(system.id, system.name)
      const lastDay = daily[daily.length - 1]
      const { series } = getConsumptionSeries(system.id, system.name, 'H', 0)

      expect(series).toHaveLength(24)
      const summed = series.reduce((t, p) => t + p.litres, 0)
      // Exact, not approximate: the residual is deliberately folded into the
      // tallest bucket so the H view can never contradict the D bar.
      expect(summed, `${system.id} hourly sum`).toBe(lastDay.liters)
    }
  })

  it('is deterministic — the same request twice gives the same numbers', () => {
    const a = getConsumptionSeries(sample[0].id, sample[0].name, 'H', 0)
    const b = getConsumptionSeries(sample[0].id, sample[0].name, 'H', 0)
    expect(a.series).toEqual(b.series)
  })

  it('Monthly is a ROLLING twelve months ending at the selection', () => {
    const system = sample[0]
    const { series, label } = getConsumptionSeries(system.id, system.name, 'M', 0)

    // PLS-WC-04. A calendar year gave a variable count and a bare "2026".
    expect(series).toHaveLength(12)
    expect(label, 'label must report the true range').toMatch(
      /^[A-Z][a-z]{2} \d{4} - [A-Z][a-z]{2} \d{4}$/,
    )

    // The last bucket is the newest month, and the first is eleven before it.
    const first = series[0].key
    const last = series[11].key
    expect(last.y * 12 + last.m - (first.y * 12 + first.m)).toBe(11)
  })

  it('each Monthly bucket totals the days of its own month', () => {
    const system = sample[0]
    const { daily } = getConsumption(system.id, system.name)
    const { series } = getConsumptionSeries(system.id, system.name, 'M', 0)

    for (const bucket of series) {
      const { y, m } = bucket.key
      const fromDays = daily
        .filter((p) => {
          const [py, pm] = p.date.split('-').map(Number)
          return py === y && pm - 1 === m
        })
        .reduce((sum, p) => sum + p.liters, 0)
      expect(bucket.litres, `${y}-${m + 1}`).toBe(fromDays)
    }
  })

  it('stepping Monthly moves ONE bucket, not a whole window', () => {
    // PLS-WC-05. With a calendar-year window a step moved twelve buckets, so
    // a twelve-month grid offered twelve choices resolving to one view.
    const system = sample[0]
    const now = getConsumptionSeries(system.id, system.name, 'M', 0)
    const prev = getConsumptionSeries(system.id, system.name, 'M', -1)

    const endNow = now.series[11].key
    const endPrev = prev.series[11].key
    expect(endNow.y * 12 + endNow.m - (endPrev.y * 12 + endPrev.m)).toBe(1)
    // Eleven of the twelve buckets are shared — that is what rolling means.
    const shared = prev.series.filter((p) =>
      now.series.some((q) => q.key.y === p.key.y && q.key.m === p.key.m),
    )
    expect(shared).toHaveLength(11)
  })

  it('steps backwards without running off the data, and clamps forward steps', () => {
    const system = sample[0]
    const now = getConsumptionSeries(system.id, system.name, 'D', 0)
    const prev = getConsumptionSeries(system.id, system.name, 'D', -1)
    const ahead = getConsumptionSeries(system.id, system.name, 'D', 3)

    expect(prev.series.length).toBeGreaterThan(0)
    expect(prev.label).not.toBe(now.label)
    // Forward is clamped to 0 rather than returning an empty future month.
    expect(ahead.label).toBe(now.label)
  })

  it('hourly ticks are a 12-hour clock (§14.7)', () => {
    const { series } = getConsumptionSeries(sample[0].id, sample[0].name, 'H', 0)
    const labels = series.map((p) => p.day)
    expect(labels[0]).toBe('12 AM')
    expect(labels[3]).toBe('3 AM')
    expect(labels[12]).toBe('12 PM')
    expect(labels[23]).toBe('11 PM')
    expect(labels).toHaveLength(24)
  })

  it('Daily draws the month at its true length, nulls for unreached days', () => {
    const system = sample[0]
    const { series, label } = getConsumptionSeries(system.id, system.name, 'D', 0)

    // §2: the Daily period label is the full month name.
    expect(label).toMatch(/^[A-Z][a-z]+ \d{4}$/)

    // §5: true length, so 28-31 buckets whatever the readings.
    expect(series.length).toBeGreaterThanOrEqual(28)
    expect(series.length).toBeLessThanOrEqual(31)

    // The newest month is partial, so it must carry at least one null.
    expect(series.some((p) => p.litres === null), 'current month should be partial').toBe(true)
    // §14.7: ticks read "Sep 1", never a bare number or a weekday.
    expect(series[0].day).toMatch(/^[A-Z][a-z]{2} 1$/)
  })

  it('Monthly ticks carry a two-digit year (§14.7)', () => {
    const { series } = getConsumptionSeries(sample[0].id, sample[0].name, 'M', 0)
    for (const p of series) expect(p.day).toMatch(/^[A-Z][a-z]{2} \d{2}$/)
  })

  it('Yearly reports N / A as its period label (§2)', () => {
    const { series, label } = getConsumptionSeries(sample[0].id, sample[0].name, 'Y', 0)
    expect(label).toBe('N / A')
    for (const p of series) expect(p.day).toMatch(/^\d{4}$/)
  })
})

describe('getFleetConsumptionSeries', () => {
  it('sums the fleet without dropping or duplicating a bucket', () => {
    const fleet = getFleetConsumptionSeries(sample, 'M', 0)
    expect(fleet.series.length).toBeGreaterThan(0)

    const perSystem = sample.map((s) => getConsumptionSeries(s.id, s.name, 'M', 0))
    const expected = new Map()
    for (const part of perSystem) {
      for (const point of part.series) {
        expected.set(point.day, (expected.get(point.day) ?? 0) + point.litres)
      }
    }

    expect(fleet.series).toHaveLength(expected.size)
    for (const point of fleet.series) {
      expect(point.litres).toBe(expected.get(point.day))
    }
  })

  it('keeps a null total when no system has a reading for that bucket', () => {
    // PLS-WC-24: never report zero for "no reading". Seeding the running total
    // at 0 turned every unreached day into a real zero bar across the fleet.
    const { series } = getFleetConsumptionSeries(sample, 'D', 0)
    expect(series.some((p) => p.litres === null), 'current month is partial').toBe(true)
    // And a real bucket is still a number, not null.
    expect(series.some((p) => typeof p.litres === 'number' && p.litres > 0)).toBe(true)
  })

  it('keeps buckets in the window order every system walks', () => {
    const { series } = getFleetConsumptionSeries(sample, 'D', 0)
    const one = getConsumptionSeries(sample[0].id, sample[0].name, 'D', 0)
    expect(series.map((p) => p.day)).toEqual(one.series.map((p) => p.day))
  })

  it('legacy: numeric ordering is no longer meaningful', () => {
    const { series } = getFleetConsumptionSeries(sample, 'D', 0)
    // `day` is now a formatted tick ("Sep 1"), so Number() is NaN and the old
    // sort assertion passed vacuously. Assert the tick shape instead.
    const days = series.map((p) => p.day)
    expect(days.every((d) => /^[A-Z][a-z]{2} \d{1,2}$/.test(d))).toBe(true)
  })
})
