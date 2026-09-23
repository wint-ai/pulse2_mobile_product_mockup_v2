/**
 * consumptionSeries.js — the Y / M / D / H granularity behind the chart.
 *
 * Why this exists: the consumption card has always drawn four segments, but
 * the model behind it (upstream/consumptionModel.js) emits one point per day
 * and nothing else. Picking Year, Month or Hour therefore landed on "Nothing
 * flowed in yet" — a live-looking control with no series behind it, which is
 * worse than shipping no control at all.
 *
 * Y, M and D are plain re-bucketings of those real days: no new numbers, the
 * same litres summed over a different window. H is the one that cannot be, and
 * is handled explicitly in hourlyFromDay() below.
 *
 * `offset` walks backwards in whole periods from the newest day in the data:
 * 0 is the current window, -1 the one before it. Forward steps past 0 are
 * clamped — there is no data after today.
 */
import { getConsumption } from './consumption';
import { noise } from './upstream/consumptionModel';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM-DD' -> {y, m, d} with m zero-based. Parsed by hand rather than
    through the Date constructor so a UTC/local boundary cannot shift a day
    across a month edge and drop it out of its own bucket. */
function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
}

/* ── Hourly ────────────────────────────────────────────────────────────────
 *
 * The model has no intraday resolution, so H is a DISAGGREGATION of a real
 * day, not a new measurement: the 24 bars always sum to exactly the litres
 * that day already reported. The shape across those hours comes from what the
 * system monitors — an apartment stack peaks at breakfast and again in the
 * evening, an office runs flat through business hours, a cooling tower tracks
 * the afternoon heat, irrigation runs before dawn. Per-hour jitter is drawn
 * from the same seeded stream as the day itself, so the profile is stable for
 * a given system and date and never reshuffles between renders.
 */
const DIURNAL = {
  /* Homes: two peaks, and an overnight trough that is low but not zero —
     cisterns, softeners, the occasional 3am tap. */
  residential: [
    0.6, 0.4, 0.3, 0.3, 0.4, 0.9, 2.0, 3.2, 3.0, 2.1, 1.6, 1.4,
    1.5, 1.3, 1.2, 1.4, 1.9, 2.6, 3.1, 2.8, 2.2, 1.7, 1.2, 0.8,
  ],
  /* Offices and retail: near-nothing overnight, a plateau across the working
     day with a lunch bump. */
  commercial: [
    0.2, 0.15, 0.1, 0.1, 0.15, 0.4, 1.1, 2.2, 3.0, 3.1, 3.0, 3.2,
    3.4, 3.1, 3.0, 2.9, 2.6, 2.0, 1.2, 0.7, 0.5, 0.4, 0.3, 0.25,
  ],
  /* Cooling: makeup follows the load, which follows the afternoon. */
  cooling: [
    0.8, 0.7, 0.6, 0.6, 0.6, 0.7, 0.9, 1.2, 1.7, 2.2, 2.7, 3.2,
    3.6, 3.9, 4.0, 3.8, 3.4, 2.8, 2.1, 1.6, 1.3, 1.1, 1.0, 0.9,
  ],
  /* Heating: the mirror image — the morning warm-up carries the day. */
  heating: [
    1.2, 1.0, 0.9, 1.0, 1.6, 2.6, 3.4, 3.6, 3.1, 2.5, 2.0, 1.8,
    1.7, 1.6, 1.6, 1.8, 2.2, 2.7, 3.0, 2.8, 2.3, 1.9, 1.6, 1.3,
  ],
  /* Irrigation: one pre-dawn window, and effectively nothing else. */
  irrigation: [
    0.3, 0.3, 0.4, 3.0, 5.5, 5.0, 2.0, 0.5, 0.2, 0.15, 0.15, 0.15,
    0.15, 0.15, 0.15, 0.2, 0.3, 0.6, 1.2, 1.4, 0.8, 0.5, 0.4, 0.3,
  ],
  /* Fire lines, and anything unclassified: flat. A fire line that is not
     flowing should not be handed an invented rhythm. */
  flat: new Array(24).fill(1),
};

function diurnalFor(monitoring = '') {
  const m = String(monitoring).toLowerCase();
  if (m.includes('fire')) return DIURNAL.flat;
  if (m.includes('irrigation') || m.includes('garden')) return DIURNAL.irrigation;
  if (m.includes('cooling') || m.includes('cw') || m.includes('chiller')) return DIURNAL.cooling;
  if (m.includes('hw') || m.includes('hot water') || m.includes('heating')) return DIURNAL.heating;
  if (m.includes('apartment') || m.includes('residential') || m.includes('domestic')) return DIURNAL.residential;
  if (m.includes('office') || m.includes('retail') || m.includes('commercial')) return DIURNAL.commercial;
  return DIURNAL.flat;
}

/**
 * Split one day's real litres across 24 hours.
 * Guarantees sum(hours) === day.liters exactly: the tallest bucket absorbs the
 * rounding residual, so the H view can never disagree with the D bar it came
 * from.
 */
function hourlyFromDay(systemId, monitoring, day) {
  const shape = diurnalFor(monitoring);
  const weights = shape.map((w, h) => w * (0.85 + noise(systemId, `${day.date}|h${h}`) * 0.3));
  const sum = weights.reduce((t, w) => t + w, 0);

  const series = weights.map((w, h) => ({
    day: String(h).padStart(2, '0'),
    litres: Math.round((day.liters * w) / sum),
  }));

  const drift = day.liters - series.reduce((t, p) => t + p.litres, 0);
  if (drift !== 0) {
    let peak = 0;
    for (let i = 1; i < series.length; i++) if (series[i].litres > series[peak].litres) peak = i;
    series[peak].litres = Math.max(0, series[peak].litres + drift);
  }
  return series;
}

/* ── Bucketing ─────────────────────────────────────────────────────────────*/

function bucketDaily(daily, offset) {
  const last = parseISO(daily[daily.length - 1].date);
  /* Whole-month arithmetic on (year * 12 + month) rather than Date month
     stepping, which overflows: setMonth(-1) from the 31st lands in the wrong
     month entirely. */
  const target = last.y * 12 + last.m + Math.min(0, offset);
  const y = Math.floor(target / 12);
  const m = ((target % 12) + 12) % 12;

  const series = daily
    .filter((p) => {
      const at = parseISO(p.date);
      return at.y === y && at.m === m;
    })
    .map((p) => ({ day: parseISO(p.date).d, litres: p.liters }));

  return { series, label: `${MONTH_SHORT[m]} ${y}`, unitLabel: 'Day' };
}

function bucketMonthly(daily, offset) {
  const last = parseISO(daily[daily.length - 1].date);
  const y = last.y + Math.min(0, offset);

  const totals = new Map();
  for (const p of daily) {
    const at = parseISO(p.date);
    if (at.y !== y) continue;
    totals.set(at.m, (totals.get(at.m) ?? 0) + p.liters);
  }

  const series = [...totals.keys()]
    .sort((a, b) => a - b)
    .map((m) => ({ day: MONTH_SHORT[m], litres: totals.get(m) }));

  return { series, label: String(y), unitLabel: 'Month' };
}

function bucketYearly(daily) {
  const totals = new Map();
  for (const p of daily) {
    const { y } = parseISO(p.date);
    totals.set(y, (totals.get(y) ?? 0) + p.liters);
  }
  const years = [...totals.keys()].sort((a, b) => a - b);
  const series = years.map((y) => ({ day: String(y), litres: totals.get(y) }));

  /* The window is 730 days, so its first and last years are partial. The label
     carries the range rather than letting a half-year bar read as a short
     year. There is nothing to step through on Y, which is why the card hides
     the stepper for it instead of shipping one that does nothing. */
  const label = years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : String(years[0] ?? '');
  return { series, label, unitLabel: 'Year' };
}

function bucketHourly(daily, offset, systemId, monitoring) {
  const index = daily.length - 1 + Math.min(0, offset);
  const day = daily[Math.max(0, index)];
  if (!day) return { series: [], label: '', unitLabel: 'Hour' };

  const at = parseISO(day.date);
  return {
    series: hourlyFromDay(systemId, monitoring, day),
    label: `${MONTH_SHORT[at.m]} ${at.d}, ${at.y}`,
    unitLabel: 'Hour',
  };
}

/* ── Public API ────────────────────────────────────────────────────────────*/

/** One system's series at the requested granularity. */
export function getConsumptionSeries(systemId, systemName, period = 'D', offset = 0) {
  // getConsumption() memoises per id, so the fleet view is one generation
  // per system however many granularities the viewer steps through.
  const profile = getConsumption(systemId, systemName);
  const daily = profile.daily ?? [];
  if (!daily.length) return { series: [], label: '', unitLabel: 'Day' };

  switch (period) {
    case 'Y': return bucketYearly(daily);
    case 'M': return bucketMonthly(daily, offset);
    case 'H': return bucketHourly(daily, offset, systemId, profile.monitoring);
    default: return bucketDaily(daily, offset);
  }
}

/**
 * The same, summed across a set of systems, for the all-accounts home screen.
 * Buckets are matched on their x label, so a month one system has no data for
 * does not shift another system's bars sideways.
 */
export function getFleetConsumptionSeries(systems, period = 'D', offset = 0) {
  const totals = new Map();
  const order = [];
  let label = '';
  let unitLabel = 'Day';

  for (const system of systems ?? []) {
    const part = getConsumptionSeries(system.id, system.name, period, offset);
    if (part.label) label = part.label;
    unitLabel = part.unitLabel;
    for (const point of part.series) {
      if (!totals.has(point.day)) order.push(point.day);
      totals.set(point.day, (totals.get(point.day) ?? 0) + point.litres);
    }
  }

  /* Day numbers sort numerically; month and year labels keep first-seen order,
     which is already chronological because every system walks the same
     window. */
  const numeric = order.every((d) => typeof d === 'number' || /^\d+$/.test(String(d)));
  const keys = numeric ? [...order].sort((a, b) => Number(a) - Number(b)) : order;

  return { series: keys.map((day) => ({ day, litres: totals.get(day) })), label, unitLabel };
}
