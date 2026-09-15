/**
 * consumptionModel.js — the WEB sandbox's per-system consumption model,
 * ported verbatim.
 *
 * Upstream: pulse2_product_sandbox/src/system-page/data/systemConsumption.ts
 *
 * This replaces a much weaker local model. The old src/data/consumption.js
 * picked a flat min/max band off the system NAME and filled 830 days with
 * seeded uniform noise inside it — no seasonality, no weekday rhythm, no
 * loop return line, and every system the same shape. The web models what
 * these installations actually do:
 *
 *   • magnitude scales with what is being monitored (a cooling tower dwarfs
 *     an apartment riser),
 *   • summer cooling load lifts cooling towers and HVAC loops; heating loops
 *     move the other way,
 *   • commercial lines drop at weekends, residential ones rise slightly,
 *   • a few short spikes per year stand in for real anomalies,
 *   • loops report supply AND return, the gap being makeup / blowdown.
 *
 * The hash, the noise function, the BASE_BY_MONITORING table and every
 * coefficient below are copied unchanged, so a given system id produces the
 * same series in both apps.
 *
 * ONE DELIBERATE DIVERGENCE — monitoring type.
 * Upstream reads it from getSystemConfigById() in mockHierarchy.ts, a table of
 * ~15 hand-written system configs. None of the MRG systems are in it, so for
 * this dataset the web itself falls through to 'General Line' and gives a
 * 420 L/day apartment the same 2600 L/day baseline as a commercial riser.
 * Rather than copy that, `monitoringFor` below infers the type from the
 * system's own name and upstream meter record, using the web's own vocabulary
 * and constants. If mockHierarchy ever covers these ids, switch to it.
 */

/** Upstream: FNV-1a. Not the same hash as parity.js — do not merge them. */
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Stable pseudo-random in [0,1) for a (system, day, channel) triple. */
function noise(systemId, key) {
  return (hash(`${systemId}|${key}`) % 100000) / 100000;
}

/** Litres/day baseline by what the system monitors. Upstream table, verbatim. */
const BASE_BY_MONITORING = {
  'Cooling Tower': 9500,
  'General Line': 2600,
  'Fire Protection': 320,
  'Multiple Apartments': 4200,
  'Single Apartment': 420,
  Apartment: 480,
  Riser: 1900,
  'HVAC CW': 5200,
  'HVAC HW': 3400,
  'HVAC CW (Chilled Water)': 5200,
  'HVAC HW (Hot Water)': 3400,
};

/**
 * Infer the upstream monitoring type from what we know about the system.
 * Names in the MRG export are descriptive ("Cooling Tower Makeup", "Fire Line
 * — Wing N", "HVAC Loop — Floor 14"), so they map cleanly onto the table above.
 */
export function monitoringFor(system) {
  if (!system) return 'General Line';
  if (system.homeAway || /apartment|\bapt\b/i.test(system.name || '')) return 'Apartment';
  const n = (system.name || '').toLowerCase();
  if (n.includes('cooling tower')) return 'Cooling Tower';
  if (n.includes('fire')) return 'Fire Protection';
  if (n.includes('chilled') || /\bcw\b/.test(n)) return 'HVAC CW (Chilled Water)';
  if (n.includes('hot water') || n.includes('hvac') || /\bhw\b/.test(n)) return 'HVAC HW (Hot Water)';
  if (n.includes('riser')) return 'Riser';
  return 'General Line';
}

/**
 * Loop systems report a return line. Upstream reads topology from the same
 * config table; here a cooling tower or an HVAC loop is treated as a loop,
 * which is what those installations are.
 */
export function topologyFor(system) {
  const m = monitoringFor(system);
  if (m === 'Cooling Tower') return 'Open Loop';
  if (m.startsWith('HVAC')) return 'Closed Loop';
  return 'Water Line';
}

/**
 * Whole-system consumption profile, deterministic per system id.
 * Upstream: getSystemConsumption.
 */
export function getSystemConsumption(systemId, system, days = 730) {
  const topology = topologyFor(system);
  const monitoring = monitoringFor(system);
  const isLoop = topology === 'Open Loop' || topology === 'Closed Loop';

  // Size the site: base profile x a stable per-system multiplier so two
  // cooling towers still differ.
  const base = BASE_BY_MONITORING[monitoring] ?? 2200;
  const scale = 0.55 + noise(systemId, 'scale') * 1.4; // ~0.55-1.95x
  const daily = [];

  // A handful of anomaly days per system (short high-flow excursions).
  const spikeDays = new Set();
  const spikeCount = 3 + (hash(`${systemId}|spikes`) % 4); // 3-6
  for (let i = 0; i < spikeCount; i++) {
    spikeDays.add(hash(`${systemId}|spike|${i}`) % days);
  }

  const coolingDriven = monitoring.includes('Cooling') || monitoring.includes('CW');
  const heatingDriven = monitoring.includes('HW');
  const residential = monitoring.includes('Apartment');

  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const month = d.getMonth();
    const dow = d.getDay();

    // Seasonality: cooling peaks mid-summer, heating peaks mid-winter,
    // everything else drifts gently.
    const summer = Math.cos(((month - 6) / 12) * Math.PI * 2); // +1 in Jul
    let seasonal = 1 + 0.1 * summer;
    if (coolingDriven) seasonal = 1 + 0.55 * summer;
    if (heatingDriven) seasonal = 1 - 0.35 * summer;

    // Weekly rhythm: commercial sites quieten at weekends, homes don't.
    const weekend = dow === 0 || dow === 6;
    const weekly = residential ? (weekend ? 1.08 : 0.98) : weekend ? 0.55 : 1.05;

    // Day-to-day jitter, stable per date.
    const jitter = 0.88 + noise(systemId, iso) * 0.24;

    let liters = base * scale * seasonal * weekly * jitter;
    if (spikeDays.has(i)) liters *= 1.8 + noise(systemId, `amp${i}`) * 1.4;

    if (isLoop) {
      // Return carries most of the water back; the gap is makeup/blowdown,
      // wider on cooling towers (evaporation) than on closed HVAC loops.
      const lossBase = topology === 'Closed Loop' ? 0.04 : 0.12;
      const loss = lossBase + noise(systemId, `loss|${iso}`) * lossBase;
      const supply = Math.round(liters);
      const ret = Math.round(supply * (1 - loss));
      daily.push({ date: iso, liters: supply, returnLiters: ret, deltaLiters: supply - ret });
    } else {
      daily.push({ date: iso, liters: Math.round(liters) });
    }
  }

  return { isLoop, topology, monitoring, daily };
}
