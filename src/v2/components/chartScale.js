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
export function xLabelEvery(bucketCount, slotWidth = 0, labelWidth = 0) {
  if (!(bucketCount > 0)) return 1
  const byDensity = Math.max(1, Math.round(bucketCount / 13))
  /* §19 tells the mobile build to CONFIRM the outcome at real widths, and at
     real widths density alone is not enough: 31 Daily buckets give labelEvery
     2, i.e. 15 labels of "Sep 15" (~42px) inside a ~300px plot. They ran into
     each other and the axis read "Se54Se5Se57Se58Se5".
     So the cadence is whichever is SPARSER — the PRD's constant density, or
     one label per label-width of space. §14.6's table is unchanged wherever
     the labels actually fit, which is every case it lists. */
  if (!(slotWidth > 0) || !(labelWidth > 0)) return byDensity
  const byWidth = Math.ceil((labelWidth + 6) / slotWidth)
  return Math.max(byDensity, byWidth)
}

/**
 * Approximate rendered width of a label, in px.
 *
 * Measuring text properly needs a canvas or a DOM pass per tick; these labels
 * are digits, a three-letter month and a suffix, all of which sit close to
 * 0.6em in the project's sans face. Deliberately a slight OVER-estimate:
 * erring wide costs one dropped label, erring narrow costs a collision.
 */
export function approxTextWidth(text, fontSize = 12) {
  return String(text ?? '').length * fontSize * 0.62
}

/**
 * §14.4 — the tick column is 23px and a long tick runs LEFT into the 26px
 * gutter rather than pushing the plot across. That works on the web card,
 * where the gutter is real estate the SVG owns. Here recharts clips at the
 * SVG viewport, so a tick wider than the column loses its leading digits —
 * "400K" rendered as "OOK", which is how this shipped.
 *
 * So the axis takes the width its widest tick actually needs, never less than
 * the designed 23 + margin. The plot shifts a few px on a wide ladder, which
 * is the trade the gutter was invented to avoid — but an unreadable axis is
 * strictly worse than a narrower plot.
 */
export function yAxisWidth(ticks, format, fontSize = 12, tickMargin = 14) {
  const widest = (ticks ?? []).reduce(
    (max, v) => Math.max(max, approxTextWidth(format ? format(v) : v, fontSize)),
    0,
  )
  return Math.ceil(Math.max(23, widest) + tickMargin)
}

/**
 * §13 — bar value labels thin to the SLOT, not to a bucket count. A fixed
 * "14 buckets or fewer" rule means the same chart gains and loses its numbers
 * depending on how many days a month happens to have.
 */
export function valueLabelEvery(slotWidth, labelWidth = 26) {
  if (!(slotWidth > 0)) return Infinity
  /* §13's constant is 26 — the width the PRD assumes a value label takes. A
     six-character value ("356.8K") is nearer 40px, so at an 11px Daily slot
     the 26 gave every 3rd bucket and the labels overlapped into
     "356.8K360.7K362.3K". The rule is unchanged; it is just measured against
     the label that will actually be drawn rather than a constant that assumed
     a shorter one. */
  return Math.max(1, Math.ceil(Math.max(26, labelWidth) / slotWidth))
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
