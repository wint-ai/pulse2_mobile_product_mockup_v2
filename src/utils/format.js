// Wint format standards — shared formatters
// Based on wint-format-standards-skill.md

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Timezone helpers ────────────────────────────────────────────────────────

/**
 * Return TZ offset in minutes (positive = east of UTC) for `date` interpreted in `tz`.
 */
export function tzOffsetMinutes(date, tz) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime()) || !tz) return 0;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(d).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  const utcOfWall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return (utcOfWall - d.getTime()) / 60000;
}

/**
 * Short TZ abbreviation (e.g. 'GMT', 'BST', 'IDT') for `date` in `tz`.
 */
export function tzAbbrev(date, tz) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime()) || !tz) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, timeZoneName: 'short',
    hour: 'numeric',
  }).formatToParts(d);
  return parts.find(p => p.type === 'timeZoneName')?.value || '';
}

/**
 * Return true when `tzA` and `tzB` resolve to the same UTC offset at `date`.
 * Accounts for DST differences across zones.
 */
export function sameTzAtMoment(date, tzA, tzB) {
  if (tzA === tzB) return true;
  return tzOffsetMinutes(date, tzA) === tzOffsetMinutes(date, tzB);
}

/**
 * Best-effort browser/client TZ.
 */
export function getClientTz() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}

/**
 * Parse a possibly-naive event timestamp as an absolute Date.
 * - If `naive` already has an offset (Z or ±HH:MM), parse natively.
 * - Otherwise, treat the wall-clock as system-local and use `systemTz` to compute the absolute moment.
 */
export function parseEventInstant(naive, systemTz) {
  if (!naive) return null;
  const hasOffset = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(naive);
  if (hasOffset) {
    const d = new Date(naive);
    return isNaN(d.getTime()) ? null : d;
  }
  // Treat the naive string as the wall-clock in systemTz.
  // Step 1: parse as if UTC to get a candidate Date.
  const utcCandidate = new Date(naive + 'Z');
  if (isNaN(utcCandidate.getTime())) return null;
  // Step 2: compute the system-tz offset for that candidate moment.
  const offsetMin = tzOffsetMinutes(utcCandidate, systemTz);
  // Step 3: shift back by the offset to get the true absolute moment.
  return new Date(utcCandidate.getTime() - offsetMin * 60000);
}

/**
 * Format an instant in a specific TZ, mirroring the contexts of `formatDate`.
 */
export function formatDateInTz(instant, tz, context = 'alert') {
  if (!instant) return '—';
  const d = typeof instant === 'string' ? new Date(instant) : instant;
  if (!d || isNaN(d.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(d).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  const day = parseInt(parts.day, 10);
  const mon = parts.month;
  const year = parts.year;
  const hh = parts.hour === '24' ? '00' : parts.hour;
  const mm = parts.minute;
  const ss = parts.second;
  switch (context) {
    case 'alert':       return `${mon} ${day} · ${hh}:${mm}`;
    case 'table':       return `${mon} ${day}, ${year}`;
    case 'table_time':  return `${mon} ${day}, ${year} · ${hh}:${mm}`;
    case 'tooltip':     return `${mon} ${day}, ${year} ${hh}:${mm}:${ss}`;
    case 'kpi':         return `${mon} ${day}`;
    case 'chart_day':   return `${mon} ${day}`;
    case 'chart_hour':  return `${hh}:${mm}`;
    case 'chart_month': return `${mon} ${year}`;
    default:            return `${mon} ${day} · ${hh}:${mm}`;
  }
}

// ── Date formatting ─────────────────────────────────────────────────────────

/**
 * Format a Date for mobile display
 * @param {Date|string} date - Date object or ISO string
 * @param {'alert'|'table'|'table_time'|'tooltip'|'kpi'|'chart_day'|'chart_hour'|'chart_month'} context
 * @returns {string}
 */
export function formatDate(date, context = 'alert') {
  if (!date) return '\u2014';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '\u2014';

  const day = d.getDate();
  const mon = MONTH_ABBR[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');

  switch (context) {
    case 'alert':       // Mobile alert card: Mar 4 · 14:35
      return `${mon} ${day} \u00B7 ${hh}:${mm}`;
    case 'table':       // Table without time: Mar 4, 2026
      return `${mon} ${day}, ${year}`;
    case 'table_time':  // Table with time: Mar 4, 2026 · 14:35
      return `${mon} ${day}, ${year} \u00B7 ${hh}:${mm}`;
    case 'tooltip':     // Full precision: Mar 4, 2026 14:35:07
      return `${mon} ${day}, ${year} ${hh}:${mm}:${ss}`;
    case 'kpi':         // KPI tile: Mar 4
      return `${mon} ${day}`;
    case 'chart_day':   // Chart axis day: Mar 4
      return `${mon} ${day}`;
    case 'chart_hour':  // Chart axis hour: 14:35
      return `${hh}:${mm}`;
    case 'chart_month': // Chart axis month: Mar 2026
      return `${mon} ${year}`;
    default:
      return `${mon} ${day} \u00B7 ${hh}:${mm}`;
  }
}

/* `resolveEventClock` WAS HERE -- deleted 2026-11-04.
 *
 * It was added that morning for one reason: the dataset's active-event record
 * carried `startedAt` as a BARE WALL CLOCK with no day on it, so a card that
 * wanted to print a date had to RECOVER one -- by walking the event's `age`
 * back from now, or, failing that, by assuming the clock's most recent
 * occurrence. Both are guesses, and the second one is how a ten-hour event
 * could be dated to the wrong day entirely.
 *
 * The record now carries `detectedAtIso`, a full ISO instant (buildTree.js
 * `buildEventRecord`), and the bare clock beside it is FORMATTED FROM that
 * instant rather than rolled separately. There is nothing left to recover, so
 * the recovery is gone rather than left behind as a path that can still be
 * taken. `parseDuration`, which it used, is kept -- it has other callers.
 */

/**
 * Format a date for display, with "Just now" for < 1 minute
 * @param {Date|string} date
 * @param {'alert'|'table_time'} context
 * @returns {string}
 */
export function formatTimeAgo(date, context = 'alert') {
  if (!date) return '\u2014';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '\u2014';

  const now = new Date();
  const diffMs = now - d;

  // < 1 minute: "Just now"
  if (diffMs < 60000) return 'Just now';

  // >= 1 minute: absolute date and time
  return formatDate(d, context);
}

/**
 * Format a "last seen" timestamp for the offline/health indicator UI.
 *   Today 09:41 · Yesterday 14:30 · Mar 25, 09:41 · Unknown
 * Lifted out of SystemDetail.jsx so TenantOverview and other surfaces
 * can use the same wording.
 */
export function formatLastSeen(isoStr) {
  if (!isoStr) return 'Unknown';
  const d = new Date(isoStr);
  const now = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${time}`;
}

// ── Duration formatting ─────────────────────────────────────────────────────

/**
 * Format duration in seconds to compact string
 * @param {number|null} totalSeconds
 * @returns {string}
 */
export function formatDuration(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined) return '\u2014';
  if (totalSeconds === 0) return '0s';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  // Under 1 minute: show seconds only
  if (totalSeconds < 60) return `${seconds}s`;

  const parts = [];
  if (days > 0)    parts.push(`${days}d`);
  if (hours > 0)   parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ');
}

/**
 * Parse a duration string like "3h 11m" or "1d 2h 30m" to seconds
 * @param {string} str
 * @returns {number}
 */
export function parseDuration(str) {
  if (!str) return 0;
  let total = 0;
  const dMatch = str.match(/(\d+)d/);
  const hMatch = str.match(/(\d+)h/);
  const mMatch = str.match(/(\d+)m/);
  const sMatch = str.match(/(\d+)s/);
  if (dMatch) total += parseInt(dMatch[1]) * 86400;
  if (hMatch) total += parseInt(hMatch[1]) * 3600;
  if (mMatch) total += parseInt(mMatch[1]) * 60;
  if (sMatch) total += parseInt(sMatch[1]);
  return total;
}

// ── Value formatting ────────────────────────────────────────────────────────

const UNIT_DECIMALS = {
  'L':    { min: 0, max: 0 },
  'Gal':  { min: 1, max: 1 },
  'm³':   { min: 1, max: 2 },
  'L/h':  { min: 1, max: 1 },
  'GPM':  { min: 1, max: 1 },
  'm³/h': { min: 1, max: 2 },
  '°C':   { min: 1, max: 1 },
  '°F':   { min: 1, max: 1 },
};

const SHORTEN_CONTEXTS = new Set(['chart_axis', 'kpi', 'alert', 'push']);

/**
 * Format a numeric value with unit
 * @param {number|null} value
 * @param {string} unit - 'L', 'L/h', 'GPM', 'm³', '°C', etc.
 * @param {'inline'|'table'|'chart_axis'|'kpi'|'tooltip'|'alert'|'push'} context
 * @returns {string}
 */
export function formatValue(value, unit = 'L', context = 'inline') {
  if (value === null || value === undefined) return '\u2014';

  const unitDec = UNIT_DECIMALS[unit] || { min: 0, max: 1 };
  const absVal = Math.abs(value);

  if (value === 0) {
    const space = unit.startsWith('°') ? '' : ' ';
    return `0${space}${unit}`;
  }

  let decimals;
  if (absVal < 0.01) decimals = 3;
  else if (absVal < 0.1) decimals = 2;
  else decimals = unitDec.max;

  // KPI precision cap
  if (context === 'kpi') decimals = Math.min(decimals, 1);

  // K/M shortening
  let displayValue = value;
  let suffix = '';
  if (SHORTEN_CONTEXTS.has(context) && absVal >= 10000) {
    if (absVal >= 1000000) {
      displayValue = value / 1000000;
      suffix = 'M';
      decimals = 1;
    } else {
      displayValue = value / 1000;
      suffix = 'K';
      decimals = 1;
    }
  }

  // Whole number rule
  if (suffix === '' && Number.isInteger(displayValue)) decimals = 0;

  const formatted = displayValue.toFixed(decimals);

  let result;
  if (suffix === '') {
    const [intPart, decPart] = formatted.split('.');
    const withCommas = parseInt(intPart).toLocaleString('en-US');
    result = decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
  } else {
    result = `${formatted}${suffix}`;
  }

  // Chart axis: value only, no unit
  if (context === 'chart_axis') return result;

  const space = unit.startsWith('°') ? '' : ' ';
  return `${result}${space}${unit}`;
}

// ── Date range formatting ───────────────────────────────────────────────────

/**
 * Format a date range
 * @param {Date} start
 * @param {Date} end
 * @param {'full'|'chart'} context - 'full' includes year, 'chart' omits year
 * @returns {string}
 */
export function formatDateRange(start, end, context = 'full') {
  const sMonth = MONTH_ABBR[start.getMonth()];
  const eMonth = MONTH_ABBR[end.getMonth()];
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (context === 'chart') {
    return `${sMonth} ${start.getDate()} \u2013 ${eMonth} ${end.getDate()}`;
  }

  if (sameMonth) {
    return `${sMonth} ${start.getDate()}\u2013${end.getDate()}, ${end.getFullYear()}`;
  }
  if (sameYear) {
    return `${sMonth} ${start.getDate()} \u2013 ${eMonth} ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${sMonth} ${start.getDate()}, ${start.getFullYear()} \u2013 ${eMonth} ${end.getDate()}, ${end.getFullYear()}`;
}
