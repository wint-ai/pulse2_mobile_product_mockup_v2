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
  previousSpanAligned,
  spanTotal,
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

/* ── The comparison span ────────────────────────────────────────────────────
 *
 * "compare is to last dates in previous month" — the owner, 2026-10-21, on
 * the System page hero.
 *
 * A month-to-date window is 21 days long on the 21st; the window before it is
 * a whole month. Comparing against all of it would say October's first three
 * weeks ran below September, which is only a statement about September having
 * thirty days. previousSpanAligned() cuts the previous window to the same
 * span, and the SHORT-MONTH RULE falls out of that cut rather than being
 * special-cased: it can only return rows that exist, so a 31-day span against
 * February comes back 28 long.
 *
 * Synthetic rows below where the calendar matters, because the dataset ends in
 * October 2026 and cannot be asked what 31 March does. The real data layer is
 * then used for the cases it CAN answer, so the two halves meet.
 */
const days = (y, m, from, to, litres = 10) => {
  const rows = []
  for (let d = from; d <= to; d += 1) rows.push({ day: `${m}/${d}`, litres, key: { kind: 'day', y, m, d } })
  return rows
}
/* A month drawn at its true length with the days it has not reached left null
   — §5 / PLS-WC-17, which is what makes the read rows the elapsed span. */
const monthToDate = (y, m, length, reached, litres = 10) =>
  days(y, m, 1, length, litres).map((row, i) => (i < reached ? row : { ...row, litres: null }))

describe('previousSpanAligned — the comparison is the same dates, not the same month', () => {
  it('cuts the previous month to the days the current one has reached', () => {
    const october = monthToDate(2026, 9, 31, 21)
    const september = days(2026, 8, 1, 30)

    const span = previousSpanAligned(october, september)

    expect(span).toHaveLength(21)
    expect(span[0].key).toEqual({ kind: 'day', y: 2026, m: 8, d: 1 })
    expect(span[20].key).toEqual({ kind: 'day', y: 2026, m: 8, d: 21 })
    // And it never reaches past the span into days October has not seen.
    expect(span.some((row) => row.key.d > 21)).toBe(false)
  })

  it('CLAMPS to a short previous month — 31 March compares against 1-28 February', () => {
    const march = monthToDate(2027, 2, 31, 31)
    const february = days(2027, 1, 1, 28)

    const span = previousSpanAligned(march, february)

    /* 31 read days, 28 available. The answer is February's whole length and
       not a 31-row array with three holes on the end, which is what asking
       for a 31st of February would otherwise produce. */
    expect(span).toHaveLength(28)
    expect(span[27].key).toEqual({ kind: 'day', y: 2027, m: 1, d: 28 })
  })

  it('takes the extra day in a leap February', () => {
    expect(previousSpanAligned(monthToDate(2028, 2, 31, 31), days(2028, 1, 1, 29))).toHaveLength(29)
  })

  it('is the whole previous window where the spans match — Monthly is unaffected', () => {
    const now = at('M', 0).series
    const before = at('M', -1).series
    const span = previousSpanAligned(now, before)
    // Twelve read buckets against twelve: the cut is a no-op, which is why
    // this change left the Monthly comparison exactly as it was.
    expect(span).toHaveLength(12)
    expect(span).toEqual(before)
  })

  it('says nothing rather than something wrong when either side is missing', () => {
    expect(previousSpanAligned([], days(2026, 8, 1, 30))).toEqual([])
    expect(previousSpanAligned(undefined, undefined)).toEqual([])
    expect(previousSpanAligned(monthToDate(2026, 9, 31, 0), days(2026, 8, 1, 30))).toEqual([])
    expect(previousSpanAligned(days(2026, 9, 1, 5), undefined)).toEqual([])
  })
})

describe('previousSpanAligned over the real series', () => {
  /* THE RULE, NOT ONE DAY OF IT. This asserted "October 1-21 against September
     1-21" with 21 written in four times, which was true on 21 October 2026 and
     red on the 22nd — month-to-date moves, and the suite had pinned a single
     day of it. The elapsed length is read off the current window now, and the
     previous month is read off the previous window, so the only thing stated
     is the alignment rule itself. */
  it('compares month-to-date against the same dates of the previous month', () => {
    const october = at('D', 0).series
    const september = at('D', -1).series
    const span = previousSpanAligned(october, september)

    const elapsed = october.filter((r) => r.litres != null).length
    const prev = september[0].key
    // The comparison is as long as the elapsed span, clamped to a previous
    // month that may be shorter (Mar 1–31 against Feb 1–28, pinned above).
    const covered = Math.min(elapsed, september.length)

    expect(elapsed).toBeGreaterThan(0)
    expect(span).toHaveLength(covered)
    expect(span[0].key).toMatchObject({ y: prev.y, m: prev.m, d: 1 })
    expect(span[covered - 1].key).toMatchObject({ y: prev.y, m: prev.m, d: covered })
    // And it really is the month before, not the one being plotted.
    expect(prev.y * 12 + prev.m).toBe(october[0].key.y * 12 + october[0].key.m - 1)
  })

  /* JANUARY IS NOT A SPECIAL CASE, and this is where that is proved end to
     end. The previous window is reached by asking the data layer for
     `offset - 1`, and bucketDaily steps a whole-month index (y * 12 + m)
     rather than a Date month, so January's predecessor is December of the
     PREVIOUS YEAR and nothing here had to know that.

     The offset that lands on January is derived, not written down: `-m` months
     back from the current window, or a full year back when today is already in
     January. It read `at('D', -9)` with y:2026 / y:2025 beside it, which was
     only true while today was in October 2026 — the same freeze that took out
     the five month-to-date assertions on 2026-10-22. (getSystemConsumption
     regenerates 730 days, so thirteen months back is always in range.) */
  it('crosses the year boundary — January compares against the previous December', () => {
    const here = at('D', 0).series[0].key
    const toJan = here.m === 0 ? -12 : -here.m

    const january = at('D', toJan).series
    const december = at('D', toJan - 1).series

    expect(january[0].key).toMatchObject({ m: 0, d: 1 })
    expect(december[0].key).toMatchObject({ m: 11, d: 1 })
    expect(december[0].key.y).toBe(january[0].key.y - 1)

    const span = previousSpanAligned(january, december)
    // A complete January: 31 read days against December's 31.
    expect(span).toHaveLength(31)
    expect(span[30].key).toMatchObject({ y: december[0].key.y, m: 11, d: 31 })
  })
})

describe('spanTotal', () => {
  it('sums only the buckets that carry a reading (PLS-WC-17)', () => {
    expect(spanTotal(monthToDate(2026, 9, 31, 21, 10))).toBe(210)
  })

  it('reports nothing, not zero, for a span with no reading at all', () => {
    expect(spanTotal(monthToDate(2026, 9, 31, 0))).toBeNull()
    expect(spanTotal([])).toBeNull()
    expect(spanTotal(undefined)).toBeNull()
  })

  it('still totals a span that is genuinely zero', () => {
    expect(spanTotal(days(2026, 9, 1, 3, 0))).toBe(0)
  })
})
