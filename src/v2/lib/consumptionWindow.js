/**
 * consumptionWindow.js — the window arithmetic behind the water-consumption
 * card's controls.
 *
 * PRD_Water_Consumption_Chart_v2 §3.1-§3.6 and the normative keeps-and-resets
 * matrix in §4. The two screens that mount WaterConsumptionCardV2
 * (HomeAllAccounts, SystemPageV2Screen) own the grouping and the offset; this
 * module owns what a grouping and an offset MEAN, so the two screens cannot
 * drift apart and so the arithmetic can be tested without a chart — recharts
 * renders nothing under happy-dom, so anything chart-adjacent has to be a pure
 * function to be testable at all.
 *
 * It lives outside both pages because a component file may only export
 * components (react-refresh), and outside src/data because this is the view's
 * reading of the series, not the series itself.
 *
 * ── The one rule everything else follows ──────────────────────────────────
 * PLS-WC-06: offsets are measured from the LAST READING IN THE SERIES, never
 * from the clock. `deriveSeriesBounds` reads those bounds back out of the
 * series the data layer returns — off the `key` each row carries, not off the
 * period label, because the labels differ per grouping ("September 2026",
 * "Jun 2025 - May 2026", "N / A") and a parser for them is one more thing to
 * keep in step with src/data/consumptionSeries.js.
 *
 * ── What an offset means, per grouping (mirrors consumptionSeries.js) ──────
 *   Y   no offset at all — the window is every year on record.
 *   M   ROLLING: whole months back from the month of the last reading, and the
 *       window is the twelve months ENDING there.
 *   D   whole calendar months back from the month of the last reading.
 *   H   whole DAYS back from the day of the last reading.
 * 0 is always the newest window and offsets are never positive — there is no
 * data after the last reading.
 */

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Full names — §16 and §18 both want the name, never the initial. */
export const GROUPING_NAME = { H: 'Hourly', D: 'Daily', M: 'Monthly', Y: 'Yearly' }

/** §3.5 — one step finer. Hourly is the floor of the series, so it has none. */
export const FINER_GROUPING = { Y: 'M', M: 'D', D: 'H', H: null }

/**
 * §2 — the picker's footer names the newest window in the grouping's own
 * terms. Yearly has no picker (its label is plain text), hence null.
 */
export function footerLabelFor(period) {
  if (period === 'M') return 'Latest 12 months'
  if (period === 'D') return 'Latest month'
  if (period === 'H') return 'Latest'
  return null
}

/**
 * Whole-month index. Arithmetic never goes through Date, which overflows on
 * month stepping from the 31st.
 */
export const monthIndex = (ym) => ym.y * 12 + ym.m
export const fromMonthIndex = (i) => ({ y: Math.floor(i / 12), m: ((i % 12) + 12) % 12 })

/**
 * Whole days between two {y,m,d} dates, b - a. UTC on both sides, so no local
 * DST boundary can turn a day into 23 hours and round the wrong way.
 */
export function daysBetween(a, b) {
  const ms = Date.UTC(b.y, b.m, b.d) - Date.UTC(a.y, a.m, a.d)
  return Math.round(ms / 86400000)
}

/** A {y,m,d} date moved by whole days (delta is <= 0 everywhere here). */
export function shiftDays(date, delta) {
  const at = new Date(Date.UTC(date.y, date.m, date.d + delta))
  return { y: at.getUTCFullYear(), m: at.getUTCMonth(), d: at.getUTCDate() }
}

const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate()

const isReading = (row) => row && row.litres !== null && row.litres !== undefined

/**
 * The two ends of the series, read back out of the data layer.
 *
 * @param seriesAt (period, offset) => { series, label } — getConsumptionSeries
 *        or getFleetConsumptionSeries, already bound to the current scope.
 * @returns {{firstMonth,lastMonth,firstDay,lastDay}|null} null when the scope
 *          has no series at all, which every caller treats as "no window
 *          arithmetic is possible" rather than as an error.
 */
export function deriveSeriesBounds(seriesAt) {
  const dailyNewest = seriesAt('D', 0)
  const newestRows = dailyNewest?.series ?? []
  const anyDay = newestRows.find((row) => row?.key?.kind === 'day')?.key
  if (!anyDay) return null

  /* Daily is calendar-aligned, so every row of the newest window shares one
     month: the month the last reading falls in. */
  const lastMonth = { y: anyDay.y, m: anyDay.m }

  /* §5: the current month is drawn at its true length with the days it has
     not reached carrying litres === null, so the last READING is the last
     non-null row, not the last row. */
  let lastRead = null
  for (const row of newestRows) if (isReading(row) && row.key) lastRead = row.key
  const lastDay = lastRead
    ? { y: lastRead.y, m: lastRead.m, d: lastRead.d }
    : { ...lastMonth, d: 1 }

  /* Monthly clamps its window forward at the start of the series (§2: a window
     is always drawn at full length), so any deep offset lands on the oldest
     full window — whose FIRST bucket is the series' first month. Asking for it
     is how the oldest end is derived rather than guessed. */
  const oldestWindow = seriesAt('M', -1e6)
  const firstKey = (oldestWindow?.series ?? []).find((row) => row?.key?.kind === 'month')?.key
  const firstMonth = firstKey ? { y: firstKey.y, m: firstKey.m } : { ...lastMonth }

  const back = monthIndex(firstMonth) - monthIndex(lastMonth)
  const dailyOldest = back === 0 ? dailyNewest : seriesAt('D', back)
  const firstRead = (dailyOldest?.series ?? []).find((row) => isReading(row) && row.key)?.key
  const firstDay = firstRead
    ? { y: firstRead.y, m: firstRead.m, d: firstRead.d }
    : { ...firstMonth, d: 1 }

  return { firstMonth, lastMonth, firstDay, lastDay }
}

/**
 * PLS-WC-09 — how far back the series can actually fill this grouping.
 * `max` is always 0: there is nothing after the last reading.
 */
export function periodOffsetRange(period, bounds) {
  if (!bounds) return { min: 0, max: 0 }
  const last = monthIndex(bounds.lastMonth)
  const first = monthIndex(bounds.firstMonth)
  switch (period) {
    // §2: Yearly's window is the whole series, so it does not step at all.
    case 'Y': return { min: 0, max: 0 }
    /* Monthly needs twelve buckets, so the oldest window ENDS eleven months
       after the first — the same clamp bucketMonthly applies. */
    case 'M': return { min: Math.min(0, first + 11 - last), max: 0 }
    case 'D': return { min: Math.min(0, first - last), max: 0 }
    case 'H': return { min: -daysBetween(bounds.firstDay, bounds.lastDay), max: 0 }
    default: return { min: 0, max: 0 }
  }
}

/** Keep an offset inside what the series can fill. */
export function clampOffset(period, offset, bounds) {
  const { min, max } = periodOffsetRange(period, bounds)
  return Math.min(max, Math.max(min, offset))
}

/**
 * PLS-WC-09 / §3.2 — the step controls are UNAVAILABLE at each end rather than
 * operable and inert.
 */
export function stepAvailability(period, offset, bounds) {
  if (period === 'Y' || !bounds) return { canStepPrev: false, canStepNext: false }
  const { min } = periodOffsetRange(period, bounds)
  return { canStepPrev: offset > min, canStepNext: offset < 0 }
}

/** §3.4 — Today is unavailable when it would do nothing. */
export function canJumpToToday(period, offset) {
  return !(period === 'H' && offset === 0)
}

/**
 * §3.5 / PLS-WC-12-13 — opening a bucket.
 *
 * The window moves to the period containing that bucket's LAST reading, which
 * is what makes "open 2025" mean January-December 2025. Targeting the first
 * reading instead would give the twelve months ENDING in January 2025 — a
 * window that is mostly 2024, which §3.5 calls out by name.
 *
 * @param key the bucket key the series row carries:
 *        {kind:'year',y} | {kind:'month',y,m} | {kind:'day',y,m,d} | {kind:'hour',…}
 * @returns {{period,offset}|null} null when there is nothing below the bucket.
 */
export function drillTarget(key, bounds) {
  if (!key || !bounds) return null
  const last = monthIndex(bounds.lastMonth)

  if (key.kind === 'year') {
    /* December of that year, or the last reading's month when the year is the
       one still running — a rolling twelve-month window cannot end after the
       series does. */
    const end = Math.min(monthIndex({ y: key.y, m: 11 }), last)
    return { period: 'M', offset: clampOffset('M', end - last, bounds) }
  }
  if (key.kind === 'month') {
    // Daily is calendar-aligned, so that month IS the window.
    return { period: 'D', offset: clampOffset('D', monthIndex(key) - last, bounds) }
  }
  if (key.kind === 'day') {
    // Hourly steps in days back from the last reading.
    return { period: 'H', offset: clampOffset('H', -daysBetween(key, bounds.lastDay), bounds) }
  }
  return null
}

/**
 * §3.3 — what the picker shows as selected: the window's LAST bucket, which is
 * the bucket the period label names and the one a pick replaces. Returns the
 * sheet's own {month, year} shape, or null where there is no picker (Yearly).
 */
export function pickerSelection(period, offset, bounds) {
  if (!bounds || period === 'Y') return null
  if (period === 'H') {
    const shown = shiftDays(bounds.lastDay, clampOffset('H', offset, bounds))
    return { month: shown.m, year: shown.y }
  }
  const end = fromMonthIndex(monthIndex(bounds.lastMonth) + clampOffset(period, offset, bounds))
  return { month: end.m, year: end.y }
}

/**
 * §3.3 — applying a pick. MonthPickerSheet is a MONTH grid, so a pick names a
 * month and each grouping reads it its own way:
 *   M  the month the twelve-month window ends at
 *   D  the calendar month itself
 *   H  the last day of that month that carries a reading — the 248-wide day
 *      grid §2 specifies for Hourly does not exist in MonthPickerSheet, and
 *      the last day of the picked month is the honest reading of the grid that
 *      does. Written down rather than left to look deliberate.
 */
export function offsetForPickedMonth(period, selection, bounds) {
  if (!bounds || !selection) return 0
  if (period === 'Y') return 0
  const target = { y: selection.year, m: selection.month }
  if (period === 'H') {
    const day = monthIndex(target) >= monthIndex(bounds.lastMonth)
      ? bounds.lastDay
      : { ...target, d: daysInMonth(target.y, target.m) }
    return clampOffset('H', -daysBetween(day, bounds.lastDay), bounds)
  }
  return clampOffset(period, monthIndex(target) - monthIndex(bounds.lastMonth), bounds)
}

/**
 * §3.3 — every month the current window covers, so the grid marks the whole
 * window and not just its end: otherwise a twelve-bar chart is described by one
 * highlighted cell. Read off the plotted rows rather than recomputed, so the
 * marks cannot disagree with the bars.
 */
export function windowMonthsOf(series) {
  return (series ?? [])
    .map((row) => row?.key)
    .filter((key) => key?.kind === 'month')
    .map((key) => ({ y: key.y, m: key.m }))
}

/**
 * PLS-WC-08 — the oldest period the picker may offer, in the {y,m} shape the
 * cross-file contract spells for this prop (`max` predates it and stays
 * {month, year}).
 */
export function pickerMin(bounds) {
  return bounds ? { y: bounds.firstMonth.y, m: bounds.firstMonth.m } : null
}
