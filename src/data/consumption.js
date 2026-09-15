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
import { getSystemConsumption } from './upstream/consumptionModel';

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
