/**
 * Flow-rate series for EventFocusOverlay's "Event graph" — pure, and in its
 * own module for one reason: RECHARTS RENDERS NOTHING UNDER happy-dom.
 *
 * The chart itself is the design system's `ChartContainer` + recharts `<Line>`,
 * which means no assertion about the drawn line is possible in this repo's DOM
 * tests — they would pass vacuously or fail for the wrong reason. So every
 * decision about WHAT is plotted lives here, where a test can call it directly.
 * `insightsSparkline.js` exists beside `InsightsCard.jsx` for exactly the same
 * reason; this follows that pattern rather than inventing one.
 *
 * A component file may only export its component (the react-refresh rule this
 * repo lints with), which is the other half of why this is not inside
 * EventFocusOverlay.jsx.
 *
 * ── WHY L/hour NEEDS NO ARITHMETIC ────────────────────────────────────────
 * `getConsumptionSeries(id, name, 'H', 0)` returns ONE BUCKET PER HOUR of a
 * single day (consumptionSeries.js:113 hourlyFromDay — 24 points, each the
 * litres drawn in that hour). Litres per one-hour bucket IS litres per hour, so
 * the flow rate is the bucket value unchanged. No division, no unit guess. At
 * any other granularity ('D' is a day a bucket, 'M' a month) the same reading
 * would need dividing by the bucket's real length in hours, which is why this
 * is hourly-only and says so.
 *
 * ── WHAT THE LINE HONESTLY IS, AND IS NOT ─────────────────────────────────
 * It is the system's own measured consumption for the day the event is running
 * on, expressed as flow rate. It is NOT a trace of the incident: the upstream
 * generator distributes a day's total across a diurnal profile
 * (consumptionSeries.js:113-131), so the curve is the system's real shape for
 * that day and the incident's own clock is not separately recorded in it.
 * Reported rather than papered over.
 *
 * ── PLS-WC-17 ─────────────────────────────────────────────────────────────
 * A bucket the day has not reached carries `litres === null`. Those are
 * DROPPED, never plotted as zero: a null charted as 0 reads as the water
 * stopping, which is the opposite of what an ongoing event means. This rule has
 * bitten this repo before.
 */

/**
 * @param {{day: string, litres: number|null}[]} hourly
 *   `getConsumptionSeries(systemId, systemName, 'H', offset).series`.
 * @returns {{hour: string, lph: number}[]} one point per READ hour, in order.
 */
export function toFlowRateSeries(hourly) {
  if (!Array.isArray(hourly)) return []
  return hourly
    .filter(p => p && typeof p.litres === 'number' && Number.isFinite(p.litres))
    .map(p => ({ hour: String(p.day ?? ''), lph: p.litres }))
}

/**
 * The highest flow rate in the window, or null when nothing was read. Drawn as
 * the section's one figure so the chart is not the only way to read the peak —
 * and so there is something assertable when recharts draws nothing.
 */
export function peakFlowRate(points) {
  if (!Array.isArray(points) || points.length === 0) return null
  return points.reduce((max, p) => (p.lph > max ? p.lph : max), points[0].lph)
}
