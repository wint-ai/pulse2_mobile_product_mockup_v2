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

  it('monthly totals equal the sum of that month’s days', () => {
    const system = sample[0]
    const { daily } = getConsumption(system.id, system.name)
    const { series, label } = getConsumptionSeries(system.id, system.name, 'M', 0)

    const year = Number(label)
    const monthly = series.reduce((t, p) => t + p.litres, 0)
    const fromDays = daily
      .filter((p) => Number(p.date.slice(0, 4)) === year)
      .reduce((t, p) => t + p.liters, 0)

    expect(monthly).toBe(fromDays)
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

  it('hourly buckets carry two-digit hour labels 00..23', () => {
    const { series } = getConsumptionSeries(sample[0].id, sample[0].name, 'H', 0)
    expect(series.map((p) => p.day)).toEqual(
      Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0')),
    )
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

  it('keeps day buckets in numeric order, not string order', () => {
    const { series } = getFleetConsumptionSeries(sample, 'D', 0)
    const days = series.map((p) => Number(p.day))
    expect(days).toEqual([...days].sort((a, b) => a - b))
  })
})
