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

/* ── The incident trace ────────────────────────────────────────────────────
 * Everything above plots the SYSTEM'S DAY: 24 hourly buckets from the
 * consumption generator, which is why the line never looked like an event.
 * Its own note says so — "it is NOT a trace of the incident". What follows
 * replaces it for water events.
 *
 * OWNER SPEC, 2026-10-26: "granularity needs to be minutely when avg event
 * shown here is 45 minutes", and "always show at least 10 min before event
 * starts". So: one point a minute, a fixed 10-minute pre-roll, then the
 * event. A 45-minute event draws 55 points.
 *
 * THE SHAPE IS THE RESEARCH, not a guess. The signatures the leak-detection
 * literature agrees on, and what each one means here:
 *
 *   A STEP, NOT A RAMP. A burst starts abruptly — the plateau is what a
 *   meter sees, and the step is what makes it detectable against a typical
 *   load curve. The old background-flow generator ramps in over 4-12 hours,
 *   which is right for a creeping trickle and wrong for this.
 *
 *   THE FLOOR NEVER RETURNS TO ZERO while the event runs. This is the
 *   defining test in the field: with everything off, flow should reach zero,
 *   so a floor that never touches it means water is moving downstream of the
 *   meter. Utility smart-meter guidance and the metering patents both use it.
 *
 *   NORMAL DEMAND IS BURSTY, A LEAK IS CONSTANT. Before onset the line draws
 *   short draw-offs that fall back to the floor; during the event it holds a
 *   level. That contrast is the whole picture, and it is what makes the
 *   milestone markers legible rather than decorative.
 *
 * Seeded, so a re-render draws the same line. The app's own rule: an unseeded
 * series animates under the user as React re-renders the card.
 */

/** Mulberry32 off a string key — the same cheap deterministic rng the data layer uses. */
function seeded(key) {
  let h = 1779033703 ^ String(key).length
  for (let i = 0; i < String(key).length; i++) {
    h = Math.imul(h ^ String(key).charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clampInt = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(n)))

/**
 * One point a minute across [onset - preRollMin, end], plus the milestones.
 *
 * @param {object}  o
 * @param {string}  o.key           seed — the event id, so the line is stable
 * @param {number}  o.peakLph       the event's own flow rate; the plateau height
 * @param {number}  o.durationMin   how long the event has run
 * @param {number} [o.preRollMin]   minutes of normal demand before onset (>= 10)
 * @param {number} [o.detectLagMin] onset -> detected
 * @param {number} [o.shutoffMin]   detected -> valve closed; null if it never closed
 * @returns {{points: {minute:number,label:string,lph:number}[],
 *            marks: {key:string,minute:number,label:string}[]}}
 */
export function buildEventFlowSeries({
  key = 'event',
  peakLph = 120,
  durationMin = 45,
  preRollMin = 10,
  detectLagMin = 3,
  shutoffMin = null,
} = {}) {
  const rng = seeded(`eventflow|${key}|${peakLph}|${durationMin}`)
  /* The owner's floor, not a preference: "always show at least 10 min before
     event starts". A caller asking for less gets 10. */
  const pre = Math.max(10, Math.round(preRollMin))
  const dur = clampInt(durationMin, 1, 24 * 60)
  const plateau = Math.max(1, peakLph)

  /* The standing background draw. Never zero while the event runs — that is
     the whole signal — and small enough that the step is unmistakable. */
  const floor = Math.max(0.4, plateau * 0.02)

  const points = []
  const total = pre + dur
  /* Normal demand before onset: short draw-offs that FALL BACK. Drawn from the
     rng so two systems do not share a silhouette. */
  let burst = 0
  for (let m = 0; m <= total; m++) {
    const minute = m - pre
    let lph
    if (minute < 0) {
      // Pre-roll: a near-zero floor with occasional real draw-offs.
      if (burst > 0) burst -= 1
      else if (rng() < 0.18) burst = 1 + Math.floor(rng() * 2)
      const draw = burst > 0 ? plateau * (0.12 + 0.22 * rng()) : 0
      lph = floor * (0.3 + 0.5 * rng()) + draw
    } else if (shutoffMin != null && minute >= detectLagMin + shutoffMin) {
      /* Valve closed. Not instantly zero — a closing valve leaves the line in
         the pipe to drain, which is a short decay, then the floor. */
      const since = minute - (detectLagMin + shutoffMin)
      lph = floor * (0.3 + 0.4 * rng()) + plateau * 0.35 * Math.exp(-since / 1.6)
    } else {
      /* The plateau: held, with the few-percent buzz a real meter reads, and a
         very slight upward drift as the opening works itself wider. */
      const drift = 1 + 0.035 * (minute / Math.max(1, dur))
      lph = plateau * drift * (0.955 + 0.09 * rng())
    }
    points.push({
      minute,
      label: `${minute >= 0 ? '+' : '−'}${Math.abs(minute)}m`,
      lph: Math.round(lph * 10) / 10,
    })
  }

  /* The three the owner asked for, in the order they happen. A milestone is
     only emitted when its minute is inside the window — `shutoff` is absent on
     an event still running, which is most of them. */
  const marks = [
    { key: 'started', minute: 0, label: 'Leak started' },
    { key: 'detected', minute: clampInt(detectLagMin, 0, dur), label: 'Detected' },
  ]
  if (shutoffMin != null && detectLagMin + shutoffMin <= dur) {
    marks.push({
      key: 'shutoff',
      minute: clampInt(detectLagMin + shutoffMin, 0, dur),
      label: 'Valve shut off',
    })
  }
  return { points, marks }
}

/** "4m 30s" from minutes, for the card's time-to-shutoff readout. */
export function elapsedLabel(minutes) {
  if (minutes == null || !Number.isFinite(minutes)) return null
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}
