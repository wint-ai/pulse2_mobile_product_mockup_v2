/**
 * Chart scale + density helpers — PRD §13, §14, §17, §18.
 *
 * Its own module for the same reason chartAxis.js is: a component file may only
 * export components (react-refresh/only-export-components), and these have to
 * be importable by tests. recharts needs real layout, so nothing inside the
 * plot renders under happy-dom — the ladder, the label cadence and the bucket
 * names can only be asserted on the functions themselves.
 */

/**
 * PLS-WC-26 / §14.1 — the step ladder.
 *
 * The ladder this replaced was 1 / 2 / 2.5 / 5 / 10, which is coarse enough to
 * waste half the plot: an 85,000 peak asks for a step of 21,250, the coarse
 * ladder rounds that to 25,000 only by luck and to 50,000 the moment the peak
 * reaches 100,001 — putting a 100K series under a 200K axis. The dense ladder
 * keeps the top bar near the top of the plot at every magnitude.
 */
const STEP_LADDER = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

/**
 * Round `raw` up to the next ladder value, scaled by the appropriate power of
 * ten. §14.1: `raw <= 0 -> 1`.
 *
 * The 1e-9 slack is not cosmetic: 40000 / 4 / 10^4 is 0.9999999999999999 on
 * some inputs, and without it a step that should land on 1 climbs to 1.2 and
 * the whole ladder reads 12K / 24K / 36K / 48K instead of 10K / 20K / 30K / 40K.
 */
export function niceStep(raw) {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  const normalised = raw / magnitude
  const rung = STEP_LADDER.find((v) => normalised <= v + 1e-9) ?? 10
  return rung * magnitude
}

/**
 * §14.1 — five ticks, a zero floor, and a top no bar can exceed.
 *
 * `peak` is the largest value across EVERY series drawn (the comparison and the
 * return flow included), floored at 1 so an all-zero window still has a scale.
 * Ticks are returned low-to-high because that is the order recharts wants; the
 * PRD lists them high-to-low, which is the order they are drawn in.
 */
export function niceScale(peak, divisions = 4) {
  const safePeak = Math.max(1, Number.isFinite(peak) ? peak : 0)
  const step = niceStep(safePeak / divisions)
  return {
    domainMax: step * divisions,
    ticks: Array.from({ length: divisions + 1 }, (_, i) => i * step),
  }
}

/**
 * PLS-WC-31 / §14.6 — a label on bucket `i` when `i % labelEvery === 0`.
 *
 * The cadence this replaced was `ceil(count / 8) - 1`, which is a *ceiling*:
 * it jumps from every bucket to every 2nd between 8 and 9 buckets and stays
 * there to 16, so a 12-bar monthly chart and a 16-bar one drew the same six
 * labels. `round(count / 13)` targets a constant density instead.
 */
export function xLabelEvery(bucketCount) {
  if (!(bucketCount > 0)) return 1
  return Math.max(1, Math.round(bucketCount / 13))
}

/**
 * §13 — bar value labels thin to the SLOT, not to a bucket count. A fixed
 * "14 buckets or fewer" rule means the same chart gains and loses its numbers
 * depending on how many days a month happens to have.
 */
export function valueLabelEvery(slotWidth) {
  if (!(slotWidth > 0)) return Infinity
  return Math.max(1, Math.ceil(26 / slotWidth))
}

/** §13 — 12px, dropping to 10px when the slot is under 40px. */
export function valueLabelFontSize(slotWidth) {
  return slotWidth > 0 && slotWidth < 40 ? 10 : 12
}

/**
 * PLS-WC-36 — value labels appear only when exactly one series carries a value
 * per bucket. A comparison still qualifies (the grey bar is a reference, not a
 * second reading); a supply/return pair does not — one number over two bars
 * names neither of them.
 */
export function showsValueLabels(valueCarryingSeriesCount) {
  return valueCarryingSeriesCount === 1
}

/** What one step finer is called, for the drill-down hint. §2 "Opens into". */
const FINER_BUCKET = { Y: 'month', M: 'day', D: 'hour' }

/**
 * §3.5 / PLS-WC-14 — a bucket opens when a finer grouping exists (so: not
 * Hourly) AND it has a reading (so: not a day the month has not reached).
 */
export function isBucketOpenable(row, period) {
  if (!FINER_BUCKET[period]) return false
  const litres = row?.litres
  return litres !== null && litres !== undefined
}

/**
 * §18 — `Jun 26: 18,432 litres. Show by day.` when openable, `Jun 26: 18,432
 * litres` when not. PLS-WC-24: a bucket with no reading says so; it never
 * reports zero. PLS-WC-38: it still reports, because a bucket that cannot be
 * opened stays reachable.
 */
export function bucketAccessibleName(row, period) {
  const label = String(row?.day ?? '')
  const litres = row?.litres
  if (litres === null || litres === undefined) return `${label}: No reading yet`
  const value = `${label}: ${Math.round(litres).toLocaleString('en-US')} litres`
  if (!isBucketOpenable(row, period)) return value
  return `${value}. Show by ${FINER_BUCKET[period]}.`
}

/**
 * PLS-WC-40 / §17 — reduced motion renders bars at full height with no
 * transition. Guarded twice over: happy-dom has no layout for recharts to
 * animate against, and a host without matchMedia must not throw here.
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches === true
  } catch {
    return false
  }
}
