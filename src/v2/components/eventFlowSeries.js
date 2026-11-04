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
 * ── WHAT EACH OF THE TWO LINES IS -- header corrected 2026-11-04 ──────────
 * THIS FILE EXPORTS TWO DIFFERENT SERIES and the note that used to sit here
 * described only one of them, in terms that read as if it described the file:
 *
 *   `buildEventFlowSeries` (below) IS a trace of the event -- one point a
 *   minute across the event's own window, anchored to its detection clock,
 *   with its own plateau, its detection lag and its valve close. It is drawn
 *   for a WATER EVENT and it is what EventFocusOverlay's graph plots.
 *
 *   `toFlowRateSeries` (just below this header) is NOT a trace of the event.
 *   It is the system's own measured consumption for the day, expressed as flow
 *   rate: the upstream generator distributes a day's total across a diurnal
 *   profile (consumptionSeries.js:113-131), so the curve is the system's real
 *   shape for that day and no event's clock is recorded in it. It is the
 *   FALLBACK the overlay uses for a FAULT, where there is no flow story.
 *
 * The old header claimed the first of those was the second. Reported rather
 * than papered over, which is what the sentence it replaces was trying to do
 * for a different fact.
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
 * @param {string} [o.startClock]    "HH:MM" of onset, so the axis reads in
 *                                   wall time rather than "+12m". Owner,
 *                                   2026-10-26: "x axis needs to be timestamps
 *                                   with the right spacing." 
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
  startClock = null,
} = {}) {
  const rng = seeded(`eventflow|${key}|${peakLph}|${durationMin}`)
  /* The owner's floor, not a preference: "always show at least 10 min before
     event starts". A caller asking for less gets 10. */
  const pre = Math.max(10, Math.round(preRollMin))
  /* THE WINDOW ENDS SHORTLY AFTER THE STORY DOES. A 45-minute window on an
     event whose valve shut at minute 5 spends 40 of its 56 points on a flat
     floor — the chart is then mostly nothing happening, which is the other
     half of "too overwhelmed": the part that matters is squeezed into the
     first fifth. Where a valve closed, the window runs to the close plus a
     10-minute tail — enough to show the line settle and stay down, which is
     the proof the valve worked. An event still running keeps its full
     duration, because there the plateau IS the story. */
  const closedAt = shutoffMin != null ? detectLagMin + shutoffMin : null
  const dur = clampInt(
    closedAt != null ? Math.min(durationMin, closedAt + 10) : durationMin,
    1,
    24 * 60,
  )
  const plateau = Math.max(1, peakLph)

  /* The standing background draw. Never zero while the event runs — that is
     the whole signal — and small enough that the step is unmistakable. */
  const floor = Math.max(0.4, plateau * 0.02)

  const points = []
  const total = pre + dur
  /* Normal demand before onset: short draw-offs that FALL BACK. Drawn from the
     rng so two systems do not share a silhouette. */
  let burst = 0
  let ou = 0
  for (let m = 0; m <= total; m++) {
    const minute = m - pre
    let lph
    if (minute < 0) {
      // Pre-roll: a near-zero floor with occasional real draw-offs.
      if (burst > 0) burst -= 1
      else if (rng() < 0.16) burst = 1 + Math.floor(rng() * 2)
      const draw = burst > 0 ? plateau * (0.1 + 0.18 * rng()) : 0
      lph = floor * (0.4 + 0.3 * rng()) + draw
    } else if (shutoffMin != null && minute >= detectLagMin + shutoffMin) {
      /* Valve closed. Not instantly zero — a closing valve leaves the line in
         the pipe to drain, which is a short decay, then the floor. */
      const since = minute - (detectLagMin + shutoffMin)
      lph = floor * (0.3 + 0.4 * rng()) + plateau * 0.35 * Math.exp(-since / 1.6)
    } else {
      /* The plateau: held, with the few-percent buzz a real meter reads, and a
         very slight upward drift as the opening works itself wider. */
      /* The buzz was +/-4.5%, which at one point a minute reads as a solid
         band rather than a plateau — owner: "chart now too overwhelmed, find
         the balance". Halved, and a 3-sample carry so consecutive minutes are
         correlated the way a real meter's are instead of resampling noise
         every point. */
      const drift = 1 + 0.03 * (minute / Math.max(1, dur))
      ou = ou * 0.72 + (rng() - 0.5) * 0.028
      lph = plateau * drift * (1 + ou)
    }
    points.push({
      minute,
      label: clockAt(startClock, minute),
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

/** "HH:MM" `base` advanced by `minute`; falls back to a relative label. */
function clockAt(base, minute) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(base ?? ''))
  if (!m) return `${minute >= 0 ? '+' : '−'}${Math.abs(minute)}m`
  const total = ((Number(m[1]) * 60 + Number(m[2]) + minute) % 1440 + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/**
 * Which points carry a tick. Minute data gives 55+ of them and recharts will
 * draw every label it is given, so the axis has to be told. Picks a round
 * step that lands 4-7 ticks in the window, and anchors them on the clock's own
 * round minutes rather than on the pre-roll's start, so the labels read 10:20,
 * 10:30, 10:40 instead of 10:18, 10:28, 10:38. Owner: "the right spacing".
 *
 * THE LADDER RUNS PAST AN HOUR — 2026-11-04. It stopped at 60 and fell through
 * to `?? 60` for anything longer, so a ten-hour event asked for a tick every
 * hour: eleven labels on a 311px axis, which recharts then thinned by dropping
 * whichever ones collided. The axis read 02:00 · 04:00 · 06:00 · 08:00 · 10:00
 * — a two-hour spacing nothing had chosen, with the first and last hours
 * silently gone. 120/180/240/360 are on the ladder now so the step is picked
 * here, where it can be asserted, instead of emerging from a collision test.
 */
const TICK_LADDER = [5, 10, 15, 30, 60, 120, 180, 240, 360]

export function flowTickInterval(points) {
  if (!Array.isArray(points) || points.length < 2) return 0
  /* THE SPAN IS THE WINDOW, NOT THE POINT COUNT. Once `reduceFlowPoints` has
     run, the array is far shorter than the minutes it covers, and a count-based
     span would ask for a 5-minute tick on a ten-hour axis. */
  const span = Math.abs(points.at(-1).minute - points[0].minute) + 1
  return TICK_LADDER.find(n => span / n <= 7) ?? TICK_LADDER.at(-1)
}

/** Minutes since midnight for "HH:MM", or null when the label is not a clock. */
function clockMinutes(label) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(label ?? ''))
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/**
 * The tick positions as MINUTES, for a numeric XAxis.
 *
 * The axis was a CATEGORY axis over the point labels, which is the one thing
 * research point 3 says not to do: on a category axis a ReferenceDot can only
 * sit on a category that is IN the data, so a milestone whose sample the
 * reducer dropped would silently vanish — exactly the failure CDC documents.
 * A numeric axis takes a data-domain value, so the milestone keeps its own
 * minute whatever the reducer did, and a tick at a round clock minute renders
 * even when no sample landed on it.
 */
export function flowTickMinutes(points) {
  if (!Array.isArray(points) || !points.length) return []
  const step = flowTickInterval(points)
  if (!step) return []
  const head = clockMinutes(points[0].label)
  const anchor = head == null ? 0 : head - points[0].minute
  const out = []
  const first = points[0].minute
  const last = points.at(-1).minute
  /* Walk the ROUND clock minutes inside the window rather than filtering the
     samples, so the tick does not depend on a sample having survived. */
  const startTod = Math.ceil((anchor + first) / step) * step
  for (let tod = startTod; anchor + last >= tod; tod += step) out.push(tod - anchor)
  return out
}

/** "HH:MM" for a chart minute, for the numeric axis' tickFormatter. */
export function flowClockFormatter(points) {
  const head = clockMinutes(points?.[0]?.label)
  if (head == null) return minute => `${minute >= 0 ? '+' : '−'}${Math.abs(minute)}m`
  const anchor = head - points[0].minute
  return minute => {
    const tod = (((anchor + minute) % 1440) + 1440) % 1440
    return `${String(Math.floor(tod / 60)).padStart(2, '0')}:${String(tod % 60).padStart(2, '0')}`
  }
}

/** The subset of labels that should carry a tick, for a CATEGORY XAxis. */
export function flowTicks(points) {
  if (!Array.isArray(points) || !points.length) return []
  const step = flowTickInterval(points)
  if (!step) return []
  return points
    .filter(p => {
      const mod = clockMinutes(p.label)
      /* MINUTE OF DAY, not minute of hour. `% step` on the minute field alone
         can only ever single out :00 once the step passes an hour, so a
         two-hour step would have tagged every hour. For every step at or under
         60 this is the same set it always picked, since each of those divides
         60 exactly. */
      return mod == null ? p.minute % step === 0 : mod % step === 0
    })
    .map(p => p.label)
}

/* ── REDUCTION: CLOCK-ANCHORED MIN/MAX ─────────────────────────────────────
 *
 * Owner, 2026-11-04: "i hate the way the event chart looks like". One measured
 * cause: a ten-hour event is 618 samples drawn into a 311px plot — about two
 * samples per pixel — so the plateau renders as a solid fuzzy band rather than
 * a line. This is the reducer that fixes it, and every choice in it was tested
 * against this product's own failure, not picked for elegance.
 *
 * WHY NOT A MOVING AVERAGE. Measured on the shape this app actually draws: a
 * one-minute 1,180 L/h spike on a ~220 L/h baseline against a 1,000 L/h
 * shut-off level. A moving average flattens that peak to 700 at a 2-minute
 * window, 535 at 3, 409 at 5 and 307 at 10. EVERY window from two minutes up
 * hides the crossing, 100% of the time. On a leak-safety product a smoothed
 * series is indefensible — not as the trace, and not as an overlay beside it.
 *
 * WHY MIN/MAX AND NOT LTTB OR M4. The bucket maximum is a REAL SAMPLE, so if
 * any minute in the window crossed a level the drawn line crosses it too —
 * guaranteed by construction rather than by luck. LTTB carries no such
 * guarantee and jittered twice as much when measured. M4's pixel guarantee
 * does not survive anti-aliased SVG, so it costs double the points for nothing.
 *
 * WHY THE BUCKET IS ANCHORED TO THE WALL CLOCK and not to `n/n_out`. Measured
 * at the real 311x185px with one sample a minute arriving: count-proportional
 * bucketing moved the drawn line on 296-299 of 300 ticks, worst case 96-140px
 * on a 185px-tall chart — and not only at the live edge, settled history an
 * hour old moved too, because every new sample re-cuts every bucket. Buckets
 * cut on `floor(wallClockMinute / bucketMinutes)` measured 0.00px of movement
 * on all 300 ticks: a sample landing now cannot change which bucket a sample
 * from an hour ago falls in. The peak VALUE is stable either way; what moves
 * is the line drawn between the points that were kept.
 *
 * THE LADDER is fixed, not continuous, for the same reason: a bucket width
 * that drifted with the point count would re-cut the buckets on every sample.
 * `bucketMinutes === 1` means no reduction happened at all.
 *
 * No dependency. This is the whole of it.
 */
export const FLOW_BUCKET_LADDER = [1, 2, 4, 8, 15, 30]

/**
 * @param {{minute:number,label:string,lph:number}[]} points one a minute.
 * @param {{maxPoints?:number, bucketMinutes?:number}} [o] `maxPoints` is the
 *   ceiling the ladder is chosen against — 300 by default, which is ~1 point
 *   per pixel on this chart's 311px plot and means NOTHING UNDER FIVE HOURS IS
 *   REDUCED. Below that, 600 points into 311px is a 2x problem, not a 100x
 *   one, and dropping half of a 45-minute event to fix it would be a bad
 *   trade. `bucketMinutes` forces a step instead of choosing one, which is
 *   what lets a test pin the crossing guarantee at EVERY rung rather than only
 *   at the rungs a given window happens to select. (Two is one of those: two
 *   points per two minutes is the input back, so the chooser can never land on
 *   it. It stays on the ladder because the ladder is the measured one, and an
 *   unreachable rung costs nothing.)
 * @returns {{points: typeof points, bucketMinutes: number}}
 */
export function reduceFlowPoints(points, { maxPoints = 300, bucketMinutes: forced } = {}) {
  if (!Array.isArray(points) || points.length <= 2) {
    return { points: Array.isArray(points) ? points : [], bucketMinutes: 1 }
  }
  if (forced == null && points.length <= maxPoints) return { points, bucketMinutes: 1 }

  /* THE ANCHOR. Chart minute 0 carries `startClock`, so minutes-of-day is
     `anchor + p.minute` and the bucket edge is a real clock edge. Without a
     clock the offsets are themselves a fixed anchor, which is the same
     guarantee by a different route. */
  const head = clockMinutes(points[0].label)
  const anchor = head == null ? 0 : head - points[0].minute

  const span = points.at(-1).minute - points[0].minute + 1
  const bucketMinutes =
    forced ??
    FLOW_BUCKET_LADDER.find(b => Math.ceil(span / b) * 2 <= maxPoints) ??
    FLOW_BUCKET_LADDER.at(-1)
  if (bucketMinutes === 1) return { points, bucketMinutes: 1 }

  const keep = new Set()
  let bucket = null
  let lo = 0
  let hi = 0
  const flush = () => {
    if (bucket === null) return
    keep.add(lo)
    keep.add(hi)
  }
  for (let i = 0; i < points.length; i++) {
    const b = Math.floor((anchor + points[i].minute) / bucketMinutes)
    if (b !== bucket) {
      flush()
      bucket = b
      lo = i
      hi = i
      continue
    }
    if (points[i].lph < points[lo].lph) lo = i
    if (points[i].lph > points[hi].lph) hi = i
  }
  flush()

  /* THE FIRST AND LAST SAMPLES ALWAYS SURVIVE. The last one is the LIVE EDGE —
     the most recent reading this system reported — and a chart of a running
     water event that stops short of the newest reading is the one thing it may
     not do. The first keeps the window's left edge where the axis says it is.
     Both are deterministic, so neither reintroduces the jitter the anchored
     buckets removed. */
  keep.add(0)
  keep.add(points.length - 1)

  return {
    points: [...keep].sort((a, b) => a - b).map(i => points[i]),
    bucketMinutes,
  }
}

/* ── THE ANNOTATION LAYER ──────────────────────────────────────────────────
 *
 * Owner, 2026-11-04: "anotations needs to have max 4 miles stones it depend
 * per event: event detected, Shut-off level, Ongoing, Ended".
 *
 * THOSE FOUR NAMES ARE HIS, verbatim, and they are the only four this draws.
 * `Leak started` — the old first mark — is gone with them: it is not on his
 * list, and the list is capped at four.
 *
 * WHICH of the four appear is a property of the event, which is the other half
 * of what he asked for:
 *
 *   Event detected   always. The instant detection fired.
 *   Shut-off level   only where the water actually stopped. An event that
 *                    never reached shut-off has no such instant, and nothing
 *                    is drawn for it rather than a guess at one.
 *   Ongoing          only where the record has stamped that the event carried
 *                    on past the alert (`continues`). A leak detected four
 *                    minutes ago has not "continued" yet, and nothing is drawn.
 *   Ended            only once the event has ended.
 *
 * In HIS order, which is also the chronological one for a long event: detected,
 * then it reached the shut-off level, then it went on, then it ended. So all
 * four are reachable together on an event that lived through all four, and the
 * usual live event draws two.
 *
 * EVERY INSTANT IS READ, NEVER RECOMPUTED. The minutes come from the series'
 * own `marks` (which the generator placed) and from the record's milestone
 * stamps, mapped onto the chart's clock through the detection instant the two
 * share. Two answers to "when did the valve shut" on one screen is a bug this
 * repo has already paid for once.
 *
 * AND THEY ANCHOR TO THE TIME AXIS, never to a retained data point. CDC's
 * charting guidance documents the failure mode: an annotation snapped to a
 * sample DISAPPEARS when the reducer drops that sample. recharts gets this
 * right for free — ReferenceDot and ReferenceLine take a data-domain value,
 * not a pixel — so the rule here is simply not to be clever: the milestone
 * keeps its own minute, and the y it is drawn at is looked up from the FULL
 * series, not from the reduced one.
 */
const MILESTONE_TONE = {
  detected: 'var(--severity-high)',
  shutoff: 'var(--success)',
  ongoing: 'var(--severity-high)',
  ended: 'var(--neutral-500)',
}

/** Chart minute of an ISO instant, against the instant chart-minute 0 carries. */
function minuteOf(iso, detectedAtIso, detectMinute) {
  if (!iso || !detectedAtIso) return null
  const t = Date.parse(iso)
  const d = Date.parse(detectedAtIso)
  if (!Number.isFinite(t) || !Number.isFinite(d)) return null
  return Math.round((t - d) / 60000) + detectMinute
}

/**
 * The owner's four, filtered to this event, in the order they happened.
 *
 * @param {object} o
 * @param {{minute:number,label:string,lph:number}[]} o.points  the FULL series.
 * @param {{key:string,minute:number}[]} [o.marks]  `buildEventFlowSeries().marks`.
 * @param {object} [o.record]  `sys.event` — milestones, detectedAtIso, endedAtIso.
 * @param {boolean} [o.isEnded]
 * @returns {{key:string,minute:number,label:string,tone:string,lph:number,at:string}[]}
 */
export function flowMilestones({ points, marks = [], record = null, isEnded = false } = {}) {
  if (!Array.isArray(points) || !points.length) return []
  const first = points[0].minute
  const last = points.at(-1).minute
  const inWindow = m => m != null && m >= first && m <= last
  const detectMinute = marks.find(m => m.key === 'detected')?.minute ?? 0
  const shutoffMinute = marks.find(m => m.key === 'shutoff')?.minute ?? null

  const out = []
  /* NEW COPY — the owner's own four words, awaiting his sign-off as rendered
     strings. Sentence case per the everyday register; these are readouts, not
     a surface where water stops. */
  if (inWindow(detectMinute)) {
    out.push({ key: 'detected', minute: detectMinute, label: 'Event detected' })
  }
  if (inWindow(shutoffMinute)) {
    out.push({ key: 'shutoff', minute: shutoffMinute, label: 'Shut-off level' })
  }
  const continues = record?.milestones?.find(m => m.kind === 'continues')
  const ongoingMinute = continues
    ? minuteOf(continues.atIso, record?.detectedAtIso, detectMinute)
    : null
  if (inWindow(ongoingMinute)) {
    out.push({ key: 'ongoing', minute: ongoingMinute, label: 'Ongoing' })
  }
  /* `endedAtIso` is the instant when the record carries one. A CONCLUDED event
     reached through the overlay's third branch has no record at all — the push
     tombstones it (concludedEvent.js) — so `isEnded` is the only fact left,
     and the honest place for the mark is the end of the window, which is where
     the trace stops. A guessed instant would be worse than the window's own. */
  const endedMinute =
    minuteOf(record?.endedAtIso, record?.detectedAtIso, detectMinute) ?? (isEnded ? last : null)
  if (inWindow(endedMinute)) {
    out.push({ key: 'ended', minute: endedMinute, label: 'Ended' })
  }

  return out
    .sort((a, b) => a.minute - b.minute)
    .slice(0, 4)
    .map(m => {
      /* The y is looked up in the FULL series on purpose — see the note above.
         Nearest sample, so a milestone whose own minute was reduced away still
         lands on the line rather than vanishing. */
      const at =
        points.find(p => p.minute === m.minute) ??
        points.reduce((best, p) =>
          Math.abs(p.minute - m.minute) < Math.abs(best.minute - m.minute) ? p : best,
        )
      return { ...m, tone: MILESTONE_TONE[m.key], lph: at.lph, at: at.label }
    })
}
