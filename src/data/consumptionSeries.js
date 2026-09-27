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

const MONTH_NAME = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Whole-month index, so arithmetic never goes through Date's day-overflow. */
const monthIndex = (y, m) => y * 12 + m;
const fromMonthIndex = (i) => ({ y: Math.floor(i / 12), m: ((i % 12) + 12) % 12 });

/** Days in a calendar month — day 0 of the next month is the last of this one. */
const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/* §14.7 axis tick text. Short by rule: the year lives in the period control
   above the chart, and the weekday is not what an axis is for. */
const hourTick = (h) => {
  const ampm = h < 12 ? 'AM' : 'PM';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve} ${ampm}`;
};
const dayTick = (m, d) => `${MONTH_SHORT[m]} ${d}`;
const monthTick = (y, m) => `${MONTH_SHORT[m]} ${String(y).slice(-2)}`;

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

  const at = parseISO(day.date);
  const series = weights.map((w, h) => ({
    day: hourTick(h),
    litres: Math.round((day.liters * w) / sum),
    key: { kind: 'hour', y: at.y, m: at.m, d: at.d, h },
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

  const byDay = new Map();
  for (const p of daily) {
    const at = parseISO(p.date);
    if (at.y === y && at.m === m) byDay.set(at.d, p.liters);
  }

  /* §5 / PLS-WC-17: the month is drawn at its TRUE length. A day the month has
     not reached is on the axis with litres === null — recharts draws no bar for
     a null, and deriveStats excludes nulls from the divisor. Filtering them out
     instead gives a 14-bar September that stops halfway along the axis, which
     reads as a chart that broke, and an average that looks like a halving. */
  const series = [];
  for (let d = 1; d <= daysInMonth(y, m); d += 1) {
    series.push({
      day: dayTick(m, d),
      litres: byDay.has(d) ? byDay.get(d) : null,
      key: { kind: 'day', y, m, d },
    });
  }

  return { series, label: `${MONTH_NAME[m]} ${y}`, unitLabel: 'Day' };
}

/**
 * §2 / PLS-WC-04 — Monthly is ROLLING: the twelve months ENDING at the
 * selection, not a calendar year.
 *
 * This is what makes one step mean one bucket (PLS-WC-05). With a calendar
 * year, a step moved twelve buckets at once, so the month grid offered twelve
 * choices that all resolved to the same window — the exact failure §3 names.
 *
 * §2 also requires the window to be drawn at full length: near the start of
 * the series it CLAMPS forward rather than drawing four bars on a twelve-bar
 * axis. The label still reports the true range, so nothing is implied about
 * data that is not there.
 */
function bucketMonthly(daily, offset) {
  const first = parseISO(daily[0].date);
  const last = parseISO(daily[daily.length - 1].date);

  const newestEnd = monthIndex(last.y, last.m);
  const oldestEnd = monthIndex(first.y, first.m) + 11; // 12 months need 11 back
  // Clamp so the window always holds twelve buckets.
  const end = Math.max(Math.min(newestEnd + Math.min(0, offset), newestEnd), oldestEnd);
  const start = end - 11;

  const totals = new Map();
  for (const p of daily) {
    const at = parseISO(p.date);
    const i = monthIndex(at.y, at.m);
    if (i < start || i > end) continue;
    totals.set(i, (totals.get(i) ?? 0) + p.liters);
  }

  const series = [];
  for (let i = start; i <= end; i += 1) {
    const { y, m } = fromMonthIndex(i);
    series.push({
      day: monthTick(y, m),
      litres: totals.get(i) ?? 0,
      key: { kind: 'month', y, m },
    });
  }

  const a = fromMonthIndex(start);
  const b = fromMonthIndex(end);
  return {
    series,
    label: `${MONTH_SHORT[a.m]} ${a.y} - ${MONTH_SHORT[b.m]} ${b.y}`,
    unitLabel: 'Month',
  };
}

function bucketYearly(daily) {
  const totals = new Map();
  for (const p of daily) {
    const { y } = parseISO(p.date);
    totals.set(y, (totals.get(y) ?? 0) + p.liters);
  }
  const years = [...totals.keys()].sort((a, b) => a - b);
  const series = years.map((y) => ({
    day: String(y),
    litres: totals.get(y),
    key: { kind: 'year', y },
  }));

  /* §2: Yearly's period label is the literal "N / A" and is PLAIN TEXT, not a
     control — the window is every year on record, so there is nothing to step
     to and no picker to open. The card renders it rather than hiding the row,
     so the control area does not change height between groupings. */
  return { series, label: 'N / A', unitLabel: 'Year' };
}

function bucketHourly(daily, offset, systemId, monitoring) {
  const index = daily.length - 1 + Math.min(0, offset);
  const day = daily[Math.max(0, index)];
  if (!day) return { series: [], label: '', unitLabel: 'Hour' };

  const at = parseISO(day.date);
  /* §2: "Sunday, May 3, 2026" — the period label is long-form because it is a
     control with room, unlike the axis ticks, which §14.7 keeps short. */
  const when = new Date(Date.UTC(at.y, at.m, at.d));
  const weekday = WEEKDAY_NAME[when.getUTCDay()];
  return {
    series: hourlyFromDay(systemId, monitoring, day),
    label: `${weekday}, ${MONTH_NAME[at.m]} ${at.d}, ${at.y}`,
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
  const keyOf = new Map();
  const order = [];
  let label = '';
  let unitLabel = 'Day';

  for (const system of systems ?? []) {
    const part = getConsumptionSeries(system.id, system.name, period, offset);
    if (part.label) label = part.label;
    unitLabel = part.unitLabel;
    for (const point of part.series) {
      if (!totals.has(point.day)) {
        order.push(point.day);
        keyOf.set(point.day, point.key);
        // Seed with null, not 0 — see below.
        totals.set(point.day, null);
      }
      /* PLS-WC-24: a bucket with no reading reports that, and never reports
         zero. A null contributes nothing and leaves the total null; the first
         real reading promotes it to a number. Seeding at 0 instead would turn
         every day the month has not reached into a genuine zero bar across the
         whole fleet. */
      if (point.litres === null || point.litres === undefined) continue;
      totals.set(point.day, (totals.get(point.day) ?? 0) + point.litres);
    }
  }

  /* Order is first-seen, which is already chronological: every system walks
     the same window and emits the same buckets in the same order. The old
     numeric re-sort was written when `day` was a bare day number; the ticks
     are now formatted strings ("Sep 1", "Jun 25", "12 AM") and Number() on
     those is NaN, so sorting by it silently did nothing. */
  return {
    series: order.map((day) => ({ day, litres: totals.get(day), key: keyOf.get(day) })),
    label,
    unitLabel,
  };
}
