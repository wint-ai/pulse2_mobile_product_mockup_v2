/**
 * Insights sparkline geometry + figure formatting.
 *
 * Its own module for the reason chartScale.js and chartAxis.js are: a component
 * file may only export components (react-refresh/only-export-components), and
 * these have to be importable by tests. The card's trace is a hand-drawn
 * <svg> rather than a recharts plot precisely so it CAN be asserted — recharts
 * renders nothing under happy-dom, so a chart internal is untestable here.
 *
 * The box is the Figma frame's own: 330x86, radius 4.31579, ground #F2F6FF,
 * both traces 2.15789 wide with round caps (node 199296:50358 / 199296:51157,
 * asset 2315f.svg). In the comp that frame is a flat exported SVG — one frozen
 * curve for every system on every route. These functions redraw it from the
 * system's real series instead.
 */

/** The comp's frame, to the pixel. */
export const SPARK_W = 330
export const SPARK_H = 86
/** The comp's trace clears the frame edge by ~5px top and bottom (y 5.2..81). */
export const SPARK_PAD_Y = 5
export const SPARK_RADIUS = 4.31579
export const SPARK_STROKE = 2.15789
/* THESE THREE ARE CSS VALUES, NOT SVG PRESENTATION-ATTRIBUTE VALUES.
   var() substitutes at computed-value time, which a `fill="…"` / `stroke="…"`
   attribute never reaches — so every consumer must apply them through
   `style={{ fill }}` / `style={{ stroke }}` (or a Tailwind fill- or stroke-
   utility), not as an attribute. InsightsCard does. Spelled as tokens because
   as literals they were frozen: #F2F6FF measured 17.4:1 against the dark card,
   a white slab with two traces on it. */
/* --secondary, NOT --accent, and the difference only shows under dark.
   Both are #f2f6ff in `light` — the exact literal this replaced, so `light`
   does not move either way. Under dark --accent is the LIGHTER zinc-700
   step (it has to be: it is also the hover tint), and the blue trace on it
   measures 2.77:1 — under the 3:1 a graphical object needs. --secondary is
   zinc-800 and takes the same trace to 3.96:1. A ground that data is drawn
   ON wants the darker step; the hover tint wants the lighter one. */
export const SPARK_GROUND = 'var(--secondary)'
/** Figma's own trace colours: the actual run, and the baseline it is judged on.
    #0B82F8 was the comp's blue — note it is NOT --primary #0b81f8, it was off
    by one in the green channel, which is how it survived every "is this the
    brand blue?" grep. It is --primary. #90A1B9 is --slate-400 exactly. */
export const SPARK_ACTUAL = 'var(--primary)'
export const SPARK_BASELINE = 'var(--slate-400)'

/**
 * Accept the shapes this app actually passes around: the bare number array a
 * caller may hand us, or getConsumptionSeries()'s `[{ day, litres }]`.
 *
 * PLS-WC-24: a bucket with no reading is null and means "no reading", never
 * zero — nulls are dropped rather than plotted at the floor, which would draw
 * a cliff the data never had.
 */
export function toValues(series) {
  if (!Array.isArray(series)) return []
  return series
    .map((point) => {
      if (typeof point === 'number') return point
      if (!point || typeof point !== 'object') return null
      const v = point.litres ?? point.value ?? point.y ?? point.total
      return typeof v === 'number' ? v : null
    })
    .filter((v) => Number.isFinite(v))
}

/**
 * The vertical scale both traces share. Scaling them apart would make the gap
 * between actual and baseline meaningless, which is the only thing the second
 * trace is there to show.
 */
export function sparkExtent(...seriesList) {
  const all = seriesList.flatMap((s) => toValues(s))
  if (!all.length) return null
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  return { lo, hi }
}

/**
 * One series as an SVG path across the frame, edge to edge like the comp's.
 *
 * Returns null — not an empty path and not a stand-in shape — when there is
 * nothing to plot. A card with no series draws the ground and says nothing.
 */
export function sparklinePath(series, extent, opts = {}) {
  const values = toValues(series)
  if (!values.length) return null
  const width = opts.width ?? SPARK_W
  const height = opts.height ?? SPARK_H
  const padY = opts.padY ?? SPARK_PAD_Y
  const lo = extent?.lo ?? Math.min(...values)
  const hi = extent?.hi ?? Math.max(...values)
  const span = hi - lo || 1
  const plot = height - padY * 2
  const stepX = values.length > 1 ? width / (values.length - 1) : 0

  return values
    .map((v, i) => {
      const x = values.length > 1 ? i * stepX : width / 2
      // Flat series sit mid-frame rather than pinned to the floor.
      const t = hi === lo ? 0.5 : (v - lo) / span
      const y = height - padY - t * plot
      return `${i === 0 ? 'M' : 'L'} ${round(x)} ${round(y)}`
    })
    .join(' ')
}

/**
 * The baseline trace, when a caller has no measured expectation to pass.
 *
 * A least-squares fit of the series itself — a derivation of the real numbers,
 * not an invented second dataset. It answers "where was this heading", which
 * is what the comp's grey line reads as. Fewer than two points have no trend,
 * so none is drawn.
 */
export function trendLine(series) {
  const values = toValues(series)
  const n = values.length
  if (n < 2) return []
  const meanX = (n - 1) / 2
  const meanY = values.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (values[i] - meanY)
    den += (i - meanX) ** 2
  }
  const slope = den === 0 ? 0 : num / den
  return values.map((_, i) => meanY + slope * (i - meanX))
}

function round(n) {
  return Number(n.toFixed(2))
}

/**
 * "-12.5%" — the comp's badge text. Always signed, because the sign IS the
 * reading; one decimal, as drawn. A string passes straight through so a caller
 * that already formatted the figure stays the source of truth, and null/NaN
 * returns null so the badge can be left out rather than render "NaN%".
 */
export function formatChangePct(pct) {
  if (typeof pct === 'string') return pct.trim() || null
  if (!Number.isFinite(pct)) return null
  const rounded = Number(pct.toFixed(1))
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

/**
 * "-13,564" — grouped, signed, whole litres. Same pass-through and same null
 * for a figure there is no value for.
 */
export function formatChangeLitres(litres) {
  if (typeof litres === 'string') return litres.trim() || null
  if (!Number.isFinite(litres)) return null
  const whole = Math.round(litres)
  const sign = whole > 0 ? '+' : whole < 0 ? '-' : ''
  return `${sign}${Math.abs(whole).toLocaleString('en-US')}`
}

/**
 * Which way the figure reads. A fall in water use is the good case here — it
 * is the one the comp draws, in green — and a rise is not green just because
 * green is what the comp exported. Zero and "no figure" are neither.
 */
export function changeDirection(pct, litres) {
  const n = firstNumber(pct, litres)
  if (n === null || n === 0) return 'flat'
  return n < 0 ? 'down' : 'up'
}

function firstNumber(...candidates) {
  for (const c of candidates) {
    if (Number.isFinite(c)) return c
    if (typeof c === 'string') {
      // "+12.5%" / "-13,564 L" — read the sign and magnitude out of the string
      // a caller pre-formatted, so a formatted figure still colours correctly.
      const m = c.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
      if (m) return c.trim().startsWith('-') ? -Math.abs(Number(m[0])) : Number(m[0])
    }
  }
  return null
}
