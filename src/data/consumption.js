/**
 * consumption.js — per-system consumption, from the web sandbox's model.
 *
 * This used to pick a flat min/max band off the system name and fill 830 days
 * with seeded uniform noise inside it. Every system had the same silhouette,
 * there was no seasonality and no weekday rhythm, and loops had no return line.
 *
 * It now delegates to src/data/upstream/consumptionModel.js, which is the
 * web's systemConsumption.ts ported verbatim — see that file for what the
 * model does and for the one documented divergence.
 *
 * The exported shape is unchanged so every existing caller keeps working:
 * KPIDetailScreen reads `.mtd`, ConsumptionTab reads `.daily`, and both v2
 * system pages read `.daily`.
 */
import { SYSTEMS } from './systems';
import { getSystemConsumption, bucketConsumption } from './upstream/consumptionModel';

const byId = new Map(SYSTEMS.map(s => [s.id, s]));

/**
 * @param systemId   the system to profile
 * @param systemName kept for signature compatibility. The model reads the
 *                   system record itself; the name is only a fallback for ids
 *                   that aren't in the fleet.
 */
export function getConsumption(systemId, systemName) {
  const system = byId.get(systemId) || { id: systemId, name: systemName || systemId };
  const profile = getSystemConsumption(systemId, system, 730);
  const daily = profile.daily;

  const last30 = daily.slice(-30);
  const mtd = last30.reduce((t, d) => t + d.liters, 0);
  const avgDaily = Math.round(mtd / Math.max(1, last30.length));

  const last7 = daily.slice(-7).reduce((t, d) => t + d.liters, 0) / 7;
  const prev7 = daily.slice(-14, -7).reduce((t, d) => t + d.liters, 0) / 7;
  const trend = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;

  return {
    daily,
    mtd,
    trend,
    avgDaily,
    // Loops report water coming back; the gap is makeup / blowdown. Callers
    // that don't know about loops can ignore these — daily[].liters is still
    // the supply figure, exactly as before.
    isLoop: profile.isLoop,
    topology: profile.topology,
    monitoring: profile.monitoring,
  };
}

/**
 * A chart window for one system, in the shape WaterConsumptionCardV2 plots.
 *
 * Granularity uses the WEB's meaning of the selector, which is the period you
 * are looking AT, not the width of a bar:
 *   Y  12 months        M  30 days of a month
 *   D  24 hours of a day   H  5-minute slices of an hour
 *
 * The card ships 'D' as its default with 30 day-numbered bars, i.e. it treats
 * 'D' as "daily bars". That is the one place it disagrees with the web, so the
 * pages open on 'M' — a month of daily bars, which is what the card was already
 * drawing and what the comp shows.
 *
 * `offset` steps back one whole window, so the month stepper works for real
 * instead of replaying the same bars under a different heading.
 */
export function getConsumptionWindow(systemId, systemName, granularity = 'M', offset = 0) {
  const system = byId.get(systemId) || { id: systemId, name: systemName || systemId };
  const profile = getSystemConsumption(systemId, system, 730);
  return bucketConsumption(profile, granularity, offset).map(b => ({
    day: b.label,
    litres: b.supply,
    // Loops carry a return line; the card ignores these unless it plots them.
    returnLitres: b.return,
    deltaLitres: b.delta,
  }));
}

/** Label for the window the stepper is currently on. */
export function getConsumptionWindowLabel(systemId, systemName, granularity = 'M', offset = 0) {
  const system = byId.get(systemId) || { id: systemId, name: systemName || systemId };
  const profile = getSystemConsumption(systemId, system, 730);
  const buckets = bucketConsumption(profile, granularity, offset);
  if (!buckets.length) return '';
  const d = buckets[buckets.length - 1].date;
  if (granularity === 'Y') return String(d.getFullYear());
  if (granularity === 'M') return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
