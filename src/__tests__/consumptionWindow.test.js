// The window arithmetic behind the chart's controls — PRD §3.1-§3.6, §4.
//
// These are pure functions on purpose. recharts needs real layout, so nothing
// inside the plot renders under happy-dom and a bar cannot be clicked in a
// test; the only way to prove the drill-down lands on the right window is to
// prove the arithmetic that produces it, and then to run that arithmetic
// through the real data layer and look at the buckets that come back.

import { describe, it, expect } from 'vitest'
import {
  canJumpToToday,
  clampOffset,
  daysBetween,
  deriveSeriesBounds,
  drillTarget,
  footerLabelFor,
  monthIndex,
  offsetForPickedMonth,
  periodOffsetRange,
  pickerMin,
  pickerSelection,
  stepAvailability,
  windowMonthsOf,
} from '@/v2/lib/consumptionWindow'
import { getConsumptionSeries } from '@/data/consumptionSeries'
import { SYSTEMS } from '@/data/systems'

/* A series that runs 1 Jan 2024 to 27 Sep 2026, stated rather than derived so
   the expectations below can be read off it. */
const BOUNDS = {
  firstMonth: { y: 2024, m: 0 },
  lastMonth: { y: 2026, m: 8 },
  firstDay: { y: 2024, m: 0, d: 1 },
  lastDay: { y: 2026, m: 8, d: 27 },
}

const system = SYSTEMS[0]
const at = (period, offset) => getConsumptionSeries(system.id, system.name, period, offset)

describe('§2 — the picker footer names the newest window per grouping', () => {
  it('spells all three', () => {
    expect(footerLabelFor('H')).toBe('Latest')
    expect(footerLabelFor('D')).toBe('Latest month')
    expect(footerLabelFor('M')).toBe('Latest 12 months')
    // Yearly has no picker at all — the label is plain text.
    expect(footerLabelFor('Y')).toBeNull()
  })
})

describe('PLS-WC-06 — the ends of the series come from the series', () => {
  it('reads both ends off the buckets, not the clock', () => {
    const bounds = deriveSeriesBounds(at)
    expect(bounds).toBeTruthy()

    // The newest daily window is the month the last reading falls in.
    const newest = at('D', 0).series
    const anyKey = newest.find((row) => row.key)?.key
    expect(bounds.lastMonth).toEqual({ y: anyKey.y, m: anyKey.m })

    // §5: the current month is drawn at full length, so the last READING is
    // the last non-null bucket — never the last bucket.
    const lastRead = [...newest].reverse().find((row) => row.litres !== null)
    expect(bounds.lastDay).toEqual({ y: lastRead.key.y, m: lastRead.key.m, d: lastRead.key.d })

    // The model ships 730 contiguous days, so the two ends are 729 apart.
    expect(daysBetween(bounds.firstDay, bounds.lastDay)).toBe(729)
  })

  it('survives a scope with no series at all', () => {
    expect(deriveSeriesBounds(() => ({ series: [], label: '' }))).toBeNull()
  })
})

describe('PLS-WC-09 — stepping stops where the data stops', () => {
  it('Monthly steps back only while twelve buckets can still be filled', () => {
    // The oldest window ENDS eleven months after the series starts.
    const { min } = periodOffsetRange('M', BOUNDS)
    expect(min).toBe(monthIndex({ y: 2024, m: 11 }) - monthIndex(BOUNDS.lastMonth))

    expect(stepAvailability('M', 0, BOUNDS)).toEqual({ canStepPrev: true, canStepNext: false })
    expect(stepAvailability('M', min, BOUNDS)).toEqual({ canStepPrev: false, canStepNext: true })
    expect(stepAvailability('M', -1, BOUNDS)).toEqual({ canStepPrev: true, canStepNext: true })
  })

  it('Daily reaches the first month, Hourly the first day', () => {
    expect(periodOffsetRange('D', BOUNDS).min).toBe(-32)
    expect(periodOffsetRange('H', BOUNDS).min).toBe(-daysBetween(BOUNDS.firstDay, BOUNDS.lastDay))
  })

  it('Yearly does not step at all — its window is the whole series', () => {
    expect(stepAvailability('Y', 0, BOUNDS)).toEqual({ canStepPrev: false, canStepNext: false })
  })

  it('clamps rather than walking past either end', () => {
    expect(clampOffset('D', -9999, BOUNDS)).toBe(-32)
    expect(clampOffset('D', 5, BOUNDS)).toBe(0)
  })
})

describe('§3.4 — Today is unavailable when it would do nothing', () => {
  it('is offered everywhere but Hourly on the newest window', () => {
    expect(canJumpToToday('H', 0)).toBe(false)
    expect(canJumpToToday('H', -3)).toBe(true)
    expect(canJumpToToday('M', 0)).toBe(true)
    expect(canJumpToToday('Y', 0)).toBe(true)
  })
})

describe('§3.5 / PLS-WC-13 — a bucket targets its LAST reading', () => {
  it('opens a whole calendar year, not the year ending at it', () => {
    const target = drillTarget({ kind: 'year', y: 2025 }, BOUNDS)
    expect(target.period).toBe('M')
    // The window ENDS in December 2025, so it starts in January 2025. Aiming
    // at the first reading instead would end in January and be mostly 2024.
    expect(monthIndex(BOUNDS.lastMonth) + target.offset).toBe(monthIndex({ y: 2025, m: 11 }))
  })

  it('opens the running year on the last month that has a reading', () => {
    const target = drillTarget({ kind: 'year', y: 2026 }, BOUNDS)
    expect(target.offset).toBe(0)
  })

  it('opens a month into its own days and a day into its own hours', () => {
    expect(drillTarget({ kind: 'month', y: 2025, m: 2 }, BOUNDS)).toEqual({ period: 'D', offset: -18 })
    expect(drillTarget({ kind: 'day', y: 2026, m: 8, d: 20 }, BOUNDS)).toEqual({ period: 'H', offset: -7 })
  })

  it('has nothing below an hour, and nothing to do without a bucket', () => {
    expect(drillTarget({ kind: 'hour', y: 2026, m: 8, d: 20, h: 9 }, BOUNDS)).toBeNull()
    expect(drillTarget(null, BOUNDS)).toBeNull()
    expect(drillTarget({ kind: 'month', y: 2025, m: 2 }, null)).toBeNull()
  })

  it('clamps a bucket older than the series can fill', () => {
    const target = drillTarget({ kind: 'year', y: 2019 }, BOUNDS)
    expect(target.offset).toBe(periodOffsetRange('M', BOUNDS).min)
  })
})

describe('PLS-WC-07 — the drill-down resolves to the window it names', () => {
  const bounds = deriveSeriesBounds(at)

  it('a year opens its own twelve months', () => {
    const years = at('Y', 0).series.map((row) => row.key.y)
    // A year that has ended — the running one stops at the last reading.
    const whole = years[years.length - 2]

    const target = drillTarget({ kind: 'year', y: whole }, bounds)
    const window = at(target.period, target.offset).series
    expect(window).toHaveLength(12)
    expect(window[0].key).toMatchObject({ y: whole, m: 0 })
    expect(window[11].key).toMatchObject({ y: whole, m: 11 })
  })

  it('a month opens its own days', () => {
    const month = at('M', 0).series[3].key
    const target = drillTarget(month, bounds)
    const window = at(target.period, target.offset).series
    expect(window[0].key).toMatchObject({ kind: 'day', y: month.y, m: month.m })
    expect(window.every((row) => row.key.y === month.y && row.key.m === month.m)).toBe(true)
  })

  it('a day opens its own twenty-four hours', () => {
    const days = at('D', 0).series.filter((row) => row.litres !== null)
    const day = days[days.length - 3].key

    const target = drillTarget(day, bounds)
    const window = at(target.period, target.offset).series
    expect(window).toHaveLength(24)
    expect(window[0].key).toMatchObject({ kind: 'hour', y: day.y, m: day.m, d: day.d, h: 0 })
  })
})

describe('§3.3 — what the picker is told', () => {
  it('pre-selects the window’s LAST bucket', () => {
    expect(pickerSelection('M', -9, BOUNDS)).toEqual({ month: 11, year: 2025 })
    expect(pickerSelection('D', -1, BOUNDS)).toEqual({ month: 7, year: 2026 })
    expect(pickerSelection('H', -27, BOUNDS)).toEqual({ month: 7, year: 2026 })
    // Yearly has no picker.
    expect(pickerSelection('Y', 0, BOUNDS)).toBeNull()
  })

  it('round-trips a pick back to the same window', () => {
    const selection = pickerSelection('M', -9, BOUNDS)
    expect(offsetForPickedMonth('M', selection, BOUNDS)).toBe(-9)
    expect(offsetForPickedMonth('D', { month: 2, year: 2025 }, BOUNDS)).toBe(-18)
  })

  it('reads a picked month as its last day at Hourly', () => {
    // The month grid is the only grid MonthPickerSheet has; the last day of
    // the month it names is the honest reading of it.
    expect(offsetForPickedMonth('H', { month: 7, year: 2026 }, BOUNDS))
      .toBe(-daysBetween({ y: 2026, m: 7, d: 31 }, BOUNDS.lastDay))
  })

  it('marks every month the window covers, not just its end', () => {
    const months = windowMonthsOf(at('M', 0).series)
    expect(months).toHaveLength(12)
    expect(months[11]).toEqual(deriveSeriesBounds(at).lastMonth)
    // A grouping whose buckets are not months contributes none.
    expect(windowMonthsOf(at('D', 0).series)).toEqual([])
    expect(windowMonthsOf(undefined)).toEqual([])
  })

  it('offers the oldest month the series holds as its floor', () => {
    expect(pickerMin(BOUNDS)).toEqual({ y: 2024, m: 0 })
    expect(pickerMin(null)).toBeNull()
  })
})
