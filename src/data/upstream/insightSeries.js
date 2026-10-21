/**
 * insightSeries.js — the WEB sandbox's insight series generators, ported.
 *
 * Upstream (read-only reference, never edited there):
 *   pulse2_product_sandbox/src/data/insightsMockData.ts
 *   read at commit eeb570b1c4ef, 2026-10-21
 *
 * WHY THIS FILE EXISTS. The mobile insight sparkline used to plot the system's
 * ordinary consumption window against a FLAT average — a straight dashed line
 * at the prior 28 days' mean. The old model said so itself: "a flat baseline
 * is the honest reduction of [a per-day expected] when we have no forecast
 * model". It made every insight look the same, and it looked nothing like the
 * web, whose series are shaped to tell the story the feature exists to tell:
 * a quiet baseline, an onset about 40% in, and a leak that worsens.
 *
 * Owner, 2026-10-21: "i want the insight charts to use same data and patterns
 * exactly as we have in pulse 2 sandbox project".
 *
 * WHAT EACH ONE FEEDS, read off the web's own InsightRow.tsx so the mobile
 * card plots exactly what the web card plots:
 *
 *   BACKGROUND_FLOW      spark    = rawFlows.map(f => f.backgroundFlow)
 *                        baseline = undefined — the web draws NO expected line
 *                                   for background flow, and neither do we
 *   WATER_USAGE_CHANGE   spark    = dailyConsumption.map(d => d.actual)
 *                        baseline = dailyConsumption.map(d => d.expected)
 *
 * ONE DELIBERATE DIVERGENCE, and it is forced.
 * `generateRawFlows` upstream is seeded and therefore reproducible. The other
 * two are NOT: they call `Math.random()` directly, so on the web a usage-change
 * series is different on every call. That is survivable in a page that builds
 * its details once and caches them (`generatedDetailsCache`), and fatal here —
 * React re-renders a card many times, and an unseeded series would animate
 * under the user. `generateDailyConsumption` below therefore takes an `rng`
 * and draws from it in the same order and over the same ranges. The SHAPE is
 * verbatim; only the source of randomness is ours.
 *
 * Everything else — the Ornstein-Uhlenbeck walk, the per-day swell depth and
 * peak hour, the smoothstep onset, the 0.55 -> 1.0 trend, the weekend dip, the
 * decaying night-time blips, every coefficient — is copied unchanged. If the
 * web changes them, re-port rather than re-deriving.
 */

/** Upstream: seededRng. Not the FNV-1a in consumptionModel.js, nor the h*31+c
 *  in parity.js — a third hash, kept separate on purpose. */
export function seededRng(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  };
}

/**
 * Background flow for one insight, sampled HOURLY. Upstream: generateRawFlows.
 *
 * The upstream docblock explains at length why it is built this way, and the
 * reasoning is worth keeping: an earlier version "gave itself away five times
 * over — a dead-flat baseline of uniform noise, a single-sample vertical wall
 * at onset, a sine with a period of exactly 24 hours to the sample, an
 * amplitude that grew perfectly linearly so every night set a new record, and
 * only six samples a day through a monotone spline". It read as a diagram of a
 * leak rather than a meter's record of one. The fixes that matter most, in
 * order: autocorrelated (Ornstein-Uhlenbeck) noise rather than an independent
 * draw per sample; hourly samples; per-day swell depth and peak hour; a trend
 * that is a ramp PLUS a slow walk so it plateaus and slips back; an onset that
 * ramps over hours from a plausible hour of day.
 */
export function generateRawFlows(baseLph, days, startDate) {
  const rng = seededRng(`bgflow|${startDate}|${days}|${baseLph}`);
  /** Box-Muller. Uniform noise reads as an even buzz; real variation is bell-shaped. */
  const gauss = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, rng()))) * Math.cos(2 * Math.PI * rng());

  const start = new Date(startDate);
  const onsetDay = Math.floor(days * 0.4);
  // Not midnight — a leak starts when something is used, so give it an hour.
  const onsetHour = onsetDay * 24 + 1 + Math.floor(rng() * 21);
  const rampHours = 4 + Math.floor(rng() * 8);
  const postHours = Math.max(1, days * 24 - onsetHour);

  // Per-day character, drawn once so a day stays internally consistent.
  const swellDepth = [];
  const peakHour = [];
  const dayLevel = [];
  let walk = 0;
  for (let d = 0; d < days; d++) {
    walk = walk * 0.72 + gauss() * 0.085;     // ~12% day-to-day, correlated
    swellDepth.push(0.16 + 0.13 * rng());
    peakHour.push(2.4 + 2.2 * (rng() - 0.5)); // the quiet hour drifts
    dayLevel.push(walk);
  }

  const flows = [];
  let ou = 0;
  let blip = 0;
  for (let i = 0; i < days * 24; i++) {
    const d = Math.floor(i / 24);
    const h = i % 24;
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    date.setHours(h, 0, 0, 0);

    ou = ou * 0.86 + gauss() * 0.045;         // ~9%, correlated over ~7 hours

    // Background flow is what is left when the building is quiet, so a
    // weekend — less draw-off, different routine — reads a little lower.
    const dow = date.getDay();
    const weekly = dow === 0 || dow === 6 ? 0.9 : 1;

    const swell = 1 + swellDepth[d] * Math.cos(((h - peakHour[d]) / 24) * Math.PI * 2);

    // Healthy: a real trickle with its own rhythm, plus the odd fixture used
    // in the night. Each blip decays over a few hours rather than being a
    // one-sample needle: a fixture that ran leaves a tail behind it.
    blip = blip * 0.55 + (rng() < 0.016 ? 0.6 + rng() * 1.7 : 0);
    const healthy = (0.34 + 0.22 * swell) * (1 + ou * 1.8) + blip;

    // Leaking: the ramp carries the story (0.55 -> 1.0 of baseLph, an 82%
    // rise) while the day walk is only ~12%, so the trend still reads clearly
    // even though individual days go the wrong way.
    const progress = Math.min(1, Math.max(0, (i - onsetHour) / postHours));
    const trend = 0.55 + 0.45 * (0.4 * progress + 0.6 * progress ** 1.5);
    const leaking = baseLph * trend * (1 + dayLevel[d]) * swell * weekly * (1 + ou);

    // Smoothstep across the onset, so neither end of the ramp has a corner.
    const t = Math.min(1, Math.max(0, (i - onsetHour) / rampHours));
    const mix = t * t * (3 - 2 * t);
    const flow = healthy * (1 - mix) + leaking * mix;

    flows.push({
      localDate: date.toISOString(),
      backgroundFlow: Math.max(0.05, Math.round(flow * 100) / 100),
    });
  }
  return flows;
}

/**
 * Daily actual-vs-expected for a usage change. Upstream:
 * generateDailyConsumption, with `Math.random()` replaced by the caller's
 * seeded `rng` — see the ONE DELIBERATE DIVERGENCE note at the top. The draw
 * ORDER and every range are unchanged, so the distribution is identical; only
 * the stream differs.
 */
export function generateDailyConsumption(
  baseExpected,
  multiplier,
  totalDays,
  eventStartDay,
  startDate,
  rng,
) {
  const data = [];
  const start = new Date(startDate);
  for (let d = 0; d < totalDays; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    const isEvent = d >= eventStartDay;
    const expected = baseExpected + (rng() * 40 - 20);
    const actual = isEvent
      ? expected * multiplier + (rng() * 60 - 30)
      : expected + (rng() * 40 - 20);
    data.push({
      date: date.toISOString().split('T')[0],
      actual: Math.round(actual),
      expected: Math.round(expected),
      isEventPeriod: isEvent,
    });
  }
  return data;
}
