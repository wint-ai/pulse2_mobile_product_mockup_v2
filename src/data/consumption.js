// Per-system consumption data with deterministic pseudo-random generation
// Seeded by system ID so output is stable across renders
import { systemHasActiveLeak } from './upstream/parity';

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed) {
  let t = seed + 0x6D2B79F5;
  return function () {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getBaseRange(systemId, name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('cooling') || lower.includes('chiller') || lower.includes('server hall')) {
    return { min: 800, max: 2200 };
  }
  if (lower.includes('main supply')) {
    return { min: 1500, max: 4000 };
  }
  if (lower.includes('dhw') || lower.includes('hot water')) {
    return { min: 200, max: 800 };
  }
  if (lower.includes('dcw') || lower.includes('cold water')) {
    return { min: 300, max: 1000 };
  }
  if (lower.includes('fire')) {
    return { min: 5, max: 30 };
  }
  if (lower.includes('irrigation') || lower.includes('garden')) {
    return { min: 100, max: 600 };
  }
  if (lower.includes('pool') || lower.includes('spa')) {
    return { min: 400, max: 1200 };
  }
  if (lower.includes('sump') || lower.includes('pump')) {
    return { min: 50, max: 300 };
  }
  if (lower.includes('boiler')) {
    return { min: 150, max: 500 };
  }
  if (lower.includes('hvac')) {
    return { min: 400, max: 1200 };
  }
  if (lower.includes('lab') || lower.includes('process')) {
    return { min: 200, max: 700 };
  }
  if (lower.includes('baggage')) {
    return { min: 300, max: 900 };
  }
  if (lower.includes('floor')) {
    return { min: 200, max: 800 };
  }
  if (lower.includes('apt') || lower.includes('apartment')) {
    return { min: 50, max: 300 };
  }
  return { min: 200, max: 1000 };
}

// Systems with an active water event get a spike on the most recent day.
// Derived from the same function the web uses (see upstream/parity.js) rather
// than a hand-kept id list, so the spike lands on exactly the systems the web
// shows as leaking.

export function getConsumption(systemId, systemName) {
  const seed = hashCode(systemId);
  const rand = seededRandom(seed);
  const range = getBaseRange(systemId, systemName || systemId);

  const today = new Date(2026, 3, 12); // Apr 12, 2026
  const daily = [];
  let total = 0;

  // Generate 27 months of daily data (Jan 2024 – Apr 2026) for YoY comparison
  const daysCount = 830; // ~27 months
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const dayOfWeek = d.getDay();
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1.0;

    let liters = Math.round((range.min + rand() * (range.max - range.min)) * weekendFactor);

    if (i === 0 && systemHasActiveLeak(systemId)) {
      liters = Math.round(liters * (1.8 + rand() * 0.7));
    }

    daily.push({ date: dateStr, liters });
    total += liters;
  }

  const mtd = total;
  const avgDaily = Math.round(total / 30);

  const last7 = daily.slice(-7).reduce((s, d) => s + d.liters, 0) / 7;
  const prev7 = daily.slice(-14, -7).reduce((s, d) => s + d.liters, 0) / 7;
  const trend = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;

  return { daily, mtd, trend, avgDaily };
}
