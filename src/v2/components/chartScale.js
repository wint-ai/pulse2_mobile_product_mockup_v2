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

/* §13's bar-value-label rules — valueLabelEvery, valueLabelFontSize and
   showsValueLabels — stood here until 2026-10-20, when the owner asked for the
   numbers above the bars to go ("remove numbers above bars it looks strange on
   mobile"). WaterConsumptionCardV2's renderBarShape was their only caller, so
   they were deleted with it rather than left as three exported functions no
   module imports. The reasoning they encoded — thin to the SLOT, not to a
   bucket count; measure against the label that will actually be drawn — is
   worth re-reading in git history before any value label comes back. */

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
 * The VISIBLE drill-down hint — the tooltip's third line.
 *
 * The web product solves the same discoverability problem with a tinted line
 * under the value reading `Click to see by day`. The owner asked for that hint
 * here and chose gesture-accurate wording over the web's: there is no cursor to
 * click with on a phone, and the gesture is a DOUBLE tap, not a single one. So
 * the shape is ported and the verb is not. Copy is the owner's, not invented.
 *
 * The noun comes from FINER_BUCKET — the same map bucketAccessibleName reads —
 * so the visible hint and the aria-label cannot drift apart and name different
 * levels. Everything else follows from isBucketOpenable, which means the two
 * cases that must NOT advertise a drill-down are handled by construction:
 *
 *   - Hourly, the terminal rung: FINER_BUCKET has no H, so there is no noun to
 *     put in the sentence and nothing below to open. Derived, not hard-coded —
 *     add a finer grouping to the map and the hint appears with it.
 *   - A bucket with no reading (a day the month has not reached): the drill
 *     would be refused, so promising it is a lie the bar cannot honour.
 *
 * Returns null rather than an empty string so the caller renders no element at
 * all — an empty line would still cost the tooltip its height.
 */
export function bucketHintText(row, period) {
  if (!isBucketOpenable(row, period)) return null
  return `Double-tap to see by ${FINER_BUCKET[period]}`
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

/* ── Bar geometry ──────────────────────────────────────────────────────────
 *
 * WHY THE BARS WERE HAIRLINES, and why these numbers are px and not percent.
 *
 * recharts' own `getBarPositions`
 * (state/selectors/combiners/combineAllBarPositions.js, v3.8.0) computes a bar
 * from the category band like this:
 *
 *     offset = getPercentValue(barCategoryGap, bandSize)
 *     size   = (bandSize - 2 * offset - (n - 1) * barGap) / n
 *
 * The gap is applied to BOTH SIDES of the band. So `barCategoryGap="42%"` — a
 * value this card carried in the belief that it left the bar 58% of its column
 * — leaves it 1 - 2 * 0.42 = 0.16 of the column, floored. That is one measured
 * pixel at every grouping the phone can actually draw:
 *
 *     Hour  slot 11.42 -> 1px      Day(31) slot 8.61 -> 1px
 *     Day(28) slot 9.54 -> 1px     Month   slot 22.83 -> 3px
 *
 * With a comparison bar beside it (n = 2) it is worse still: each bar gets
 * 0.08 of the column, and because `0.16 * slot - barGap <= 0` recharts zeroes
 * `barGap` as well — so the pair rendered TOUCHING, one 2px stripe with no
 * separation at all. Measured: 1px + 1px, gap 0.
 *
 * The fix is to stop expressing the gap as a share of a column whose size the
 * code cannot see. A NUMBER is passed through `getPercentValue` unchanged, so
 * `barCategoryGap={1}` is one pixel per side — the design system's 2px surface
 * gap between columns — and `barGap={2}` is a real 2px between the pair:
 *
 *     barWidth = clamp(floor((slot - 2 - (n - 1) * 2) / n), 6, 24)
 *
 * `maxBarSize={24}` is what applies the ceiling; recharts has no floor, so the
 * 6 is an assertion rather than a mechanism — see BAR_MIN_WIDTH.
 *
 * Do NOT reach for `barSize` to set this directly. `getBarPositions` takes a
 * different branch entirely when the first series carries a barSize: different
 * centring, a 0.9x shrink when the sum overflows the band, and barCategoryGap
 * ignored outright.
 */

/** barCategoryGap, in PIXELS PER SIDE. 1 + 1 is the 2px gap between columns. */
export const BAR_CATEGORY_GAP_PX = 1
/** barGap — the space between the current bar and its comparison, in px. */
export const BAR_GAP_PX = 2
/** maxBarSize. Above this a bar stops reading as a bar and starts as a block. */
export const BAR_MAX_WIDTH = 24
/**
 * The width below which the design system's 4px rounded data-end stops being
 * drawable — a bar narrower than this renders as a dome with no shaft.
 *
 * recharts cannot enforce a minimum, so nothing here widens a bar to reach it.
 * It is a floor on the SIZING RULE, and the test suite asserts that no
 * grouping x comparison state the product can produce falls under it. If one
 * ever does, that is a signal to drop buckets or scroll the plot — not to let
 * the chart quietly draw hairlines again.
 */
export const BAR_MIN_WIDTH = 6
/** The cap on the data-end radius. See barTopRadius. */
export const BAR_MAX_RADIUS = 8

/** The category step: one bucket's share of the plot, axis gutter excluded. */
export function bucketSlotWidth(plotWidth, bucketCount) {
  if (!(plotWidth > 0) || !(bucketCount > 0)) return 0
  return plotWidth / bucketCount
}

/**
 * What recharts will ACTUALLY draw, given `barCategoryGap={BAR_CATEGORY_GAP_PX}`,
 * `barGap={BAR_GAP_PX}` and `maxBarSize={BAR_MAX_WIDTH}`.
 *
 * Mirrors getBarPositions step for step, including the two details that are
 * easy to miss: the gap collapses to zero rather than producing a negative
 * bar, and the size is truncated (`originalSize >>= 0`) only once it is over 1.
 */
export function drawnBarWidth(slotWidth, seriesCount = 1) {
  const n = Math.max(1, Math.round(seriesCount))
  if (!(slotWidth > 0)) return 0
  let gap = BAR_GAP_PX
  if (slotWidth - 2 * BAR_CATEGORY_GAP_PX - (n - 1) * gap <= 0) gap = 0
  let size = (slotWidth - 2 * BAR_CATEGORY_GAP_PX - (n - 1) * gap) / n
  if (size > 1) size = Math.floor(size)
  return Math.max(0, Math.min(BAR_MAX_WIDTH, size))
}

/**
 * The sizing rule, floor included: `clamp(drawnBarWidth, 6, 24)`.
 *
 * Equal to drawnBarWidth at every width the product can produce — the floor
 * exists so a future grouping that breaks it fails a test instead of shipping.
 */
export function barWidthFor(slotWidth, seriesCount = 1) {
  const drawn = drawnBarWidth(slotWidth, seriesCount)
  return drawn > 0 ? Math.max(BAR_MIN_WIDTH, drawn) : 0
}

/**
 * The data-end radius.
 *
 * The card draws `radius={[100, 100, 0, 0]}`, which recharts clamps to
 * `min(width, height) / 2` — a half-round DOME. At the 3px bars that shipped
 * that was invisible; at 21-24px the dome is 10-12px of a bar that may only be
 * 20px tall, so it eats the top of every short reading and the whole series
 * looks flatter than it is. Bounding the radius keeps the comp's rounded
 * vocabulary and gives the bar back its shaft.
 */
export function barTopRadius(barWidth) {
  if (!(barWidth > 0)) return 0
  return Math.min(barWidth / 2, BAR_MAX_RADIUS)
}

/**
 * §19 — which bucket a POINTER landed on.
 *
 * The per-bucket rects stay the keyboard and screen-reader target, but at a
 * 9px Daily slot no mark can carry the 24px minimum touch size, and widening
 * them would make them overlap. So the whole plot is the pointer target and a
 * tap resolves to the nearest bucket: there is no dead space, no sub-target,
 * and the cursor band already shows which column a tap would take.
 *
 * @param x          pointer x, in the plot's own coordinate space
 * @param plotLeft   the plot's left edge (i.e. the y-axis width)
 */
export function nearestBucketIndex(x, plotLeft, slotWidth, bucketCount) {
  if (!(slotWidth > 0) || !(bucketCount > 0)) return -1
  const i = Math.floor((x - plotLeft) / slotWidth)
  return Math.min(bucketCount - 1, Math.max(0, i))
}
