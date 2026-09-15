/**
 * systems.js — the fleet, imported from the WEB sandbox's MRG demo scope.
 *
 * The systems, their names, their ids and their location path all come from
 * `src/data/upstream/mrg-snapshot.json`, which mirrors what the web app shows
 * when `DEMO_MRG_ONLY` is on. Leak state is derived by the SAME deterministic
 * function the web uses (see upstream/parity.js), so the same system reads the
 * same way in both apps without any shared backend.
 *
 * Do not hand-add systems here. Change the web dataset, then re-run:
 *   node scripts/sync-upstream-data.mjs
 *
 * The helper functions below (sim overlay, widget/KPI rollups, tz) are app
 * behaviour, not data, and are unchanged from the pre-migration version.
 */
import { SYSTEMS_FROM_UPSTREAM } from './upstream/buildTree';
import { stableHash } from './upstream/parity';

export const SYSTEMS = SYSTEMS_FROM_UPSTREAM;

// ─── Enrichment ────────────────────────────────────────────────────────────
// Fields the app needs that upstream does not carry. All derived from the
// stable hash rather than Math.random(): a reload must not change what the
// screen says, or a side-by-side comparison against the web is meaningless.

const NOW = Date.now();
const HOUR = 3600000;
const MIN = 60000;

// Contacts for the MRG demo scope. Names are fictional, matching the
// anonymised upstream dataset.
const CONTACT_POOL = [
  { name: 'Dana Whitfield', email: 'd.whitfield@meridianrealty.com' },
  { name: 'Marcus Ellery', email: 'm.ellery@meridianrealty.com' },
  { name: 'Priya Raman', email: 'p.raman@meridianrealty.com' },
  { name: 'Alan Koster', email: 'a.koster@meridianrealty.com' },
  { name: 'Sofia Marchetti', email: 's.marchetti@meridianrealty.com' },
  { name: 'Grant Halloway', email: 'g.halloway@meridianrealty.com' },
  { name: 'Nadia Oyelaran', email: 'n.oyelaran@meridianrealty.com' },
  { name: 'Peter Vance', email: 'p.vance@meridianrealty.com' },
];

/**
 * Systems with nobody to notify — drives the "no recipients" health dimension
 * on Home. Deterministic ~6% slice rather than a hand-kept id list, so it
 * survives a dataset refresh.
 */
function hasNoRecipients(id) {
  return stableHash(`recipients:${id}`) % 17 === 0;
}

function addressFor(s) {
  if (s.l3Address) return s.l3Address;
  // No street address upstream for the Office sites — synthesize from the
  // breadcrumb so the Summary widget's second line is never empty.
  return [s.l4Name, s.l3Name, s.l2Name].filter(Boolean).join(', ');
}

SYSTEMS.forEach(s => {
  const h = stableHash(`enrich:${s.id}`);

  // lastSeen: offline systems last seen >24h ago. Online systems within the
  // last ~30 min so they comfortably clear the strictest WINT3 VMA 60-min
  // comm threshold — otherwise computeSystemHealth() flips them to "Offline"
  // even when their comm flag says online.
  if (s.offline || s.comm === 'offline') {
    s.lastSeen = new Date(NOW - 26 * HOUR - (h % 48) * HOUR).toISOString();
  } else {
    s.lastSeen = new Date(NOW - (h % 30) * MIN).toISOString();
  }

  s.address = addressFor(s);

  if (hasNoRecipients(s.id)) {
    s.notificationRecipients = 0;
    s.contacts = [];
  } else {
    const count = (h % 3) + 1;
    const start = h % CONTACT_POOL.length;
    s.contacts = [];
    for (let i = 0; i < count; i++) {
      s.contacts.push(CONTACT_POOL[(start + i) % CONTACT_POOL.length]);
    }
    s.notificationRecipients = s.contacts.length;
  }
});

// ─── Convenience exports ───────────────────────────────────────────────────

export const ALERT_CARDS = SYSTEMS.filter(s => s.alert !== null);

// Overlay any simulator-written alert onto the static system. Called from
// every screen, so simulator pushes show up in /alerts, /system, /alert.
import { getSimulatedAlert, reloadSimulatedAlerts } from './simulatedAlerts';
import { getSimulatedEvents } from './simulatedEvents';

// "Treat the fleet as clean" flag, set by the pusher's Clear button via
// applyDemoReset(). When set, every system that has NO sim alert reads as
// alert: null - the pre-populated mock incidents + historical events are
// suppressed everywhere they're read. New pushes still work on top: firing
// a Warning activates a sim alert for that one system; everything else
// stays clean. Sticky in localStorage; gone on a full storage clear.
const MOCK_SUPPRESSED_KEY = 'pulse2-mock-suppressed';
export function isMockSuppressed() {
  try { return localStorage.getItem(MOCK_SUPPRESSED_KEY) === '1'; }
  catch { return false; }
}
export function setMockSuppressed(yes) {
  try {
    if (yes) localStorage.setItem(MOCK_SUPPRESSED_KEY, '1');
    else localStorage.removeItem(MOCK_SUPPRESSED_KEY);
  } catch { /* ignore */ }
}

/**
 * Has the pusher touched this system? True if there's a sim alert OR any
 * row in the simulatedEvents log for this system.
 *
 * Rule (Rami 2026-06-06): once the pusher touches a system, the pusher
 * owns the truth for that system. Static mock incidents + lifecycle
 * events from incidents.js / events.js are suppressed so the Timeline
 * + Alert step lists don't show a confusing mix of static + sim rows.
 *
 * Hitting the pusher's "Clear all" button wipes both stores -> static
 * data comes back.
 */
export function hasSimActivity(systemId) {
  if (!systemId) return false;
  // Global "treat fleet as clean" flag also counts - it suppresses static
  // incidents + historical lifeEvents the same way per-system sim activity
  // does. So getActiveIncident + getLifeEventsForSystem stay clean without
  // any extra plumbing in those modules.
  if (isMockSuppressed()) return true;
  if (getSimulatedAlert(systemId)) return true;
  if (getSimulatedEvents(systemId).length > 0) return true;
  return false;
}

/**
 * Apply a single sim alert overlay to a static system.
 *
 * Exposed so consumers that already have the full SYSTEMS array + sims map
 * (UserContext.visibleSystems, computeActiveEvents) use the same logic and
 * never drift from getSystemById(). DRY single source of truth.
 *
 * Behavior:
 *   - No sim    -> static system unchanged
 *   - Resolved water-event sim (sim.resolved && leak-*) -> alert TOMBSTONED:
 *     returns { ...sys, alert: null }. Suppresses both sim AND any static
 *     water alert so the System page widget hides, drawer drops the red
 *     sub-line, active alert lists don't count it. Lifecycle still on Timeline.
 *   - Active sim -> { ...sys, alert: sim } plus implicit overlays:
 *       sim.valveOverride -> sys.valve
 *       sim.type === 'power-lost'  -> sys.power = 'ac-lost'
 *       sim.type === 'offline'     -> sys.comm  = 'offline'
 *       sim.type === 'valve-error' -> sys.valve = 'error'
 */
export function applySimOverlay(sys, sim) {
  if (!sim) {
    // "Treat fleet as clean": reset EVERY status field that could surface
    // a problem - not just sys.alert. Without this, a system whose static
    // mock data has valve='error', comm='offline', or power='ac-lost'
    // would keep showing those issues on the ProtectionStatusCard +
    // computeActiveEvents' secondary issues even after Clear, and the
    // fleet wouldn't actually look clean.
    //
    // Reset rules:
    //   alert  -> null
    //   valve  -> 'open' (or kept null on no-valve systems)
    //   comm   -> 'online'
    //   power  -> 'ac' (only when the system originally had power)
    //   offline -> false
    //
    // A new push (e.g. valve-error / offline / power-lost) overrides
    // these via the sim path below - so the clean baseline doesn't
    // block testing.
    if (isMockSuppressed()) {
      return {
        ...sys,
        alert: null,
        valve: sys.valve == null ? sys.valve : 'open',
        comm: 'online',
        power: sys.power == null ? sys.power : 'ac',
        offline: false,
        // computeSystemHealth prefers sys.lastSeen over sys.comm - if
        // mock data has a stale timestamp, it still reads as offline.
        // Mark lastSeen as "right now" so the threshold check passes.
        lastSeen: new Date().toISOString(),
        // Ensure at least one recipient so the "no recipients" dimension
        // doesn't fail health.
        notificationRecipients: Math.max(1, sys.notificationRecipients || 0),
      };
    }
    return sys;
  }

  // Resolved water event tombstones the alert (see header comment).
  if (sim.resolved && (sim.type === 'leak-high' || sim.type === 'leak-low')) {
    return { ...sys, alert: null };
  }

  // valveStateOnly sim entries (e.g. VC_OK_01 Valve closed by user) carry
  // a valve state change but are NOT alerts. Per project rule "Valve
  // closed is NOT an issue." Apply the valve override; leave sys.alert
  // untouched so the drawer doesn't go red and the Alerts list doesn't
  // pick it up.
  if (sim.valveStateOnly) {
    return { ...sys, valve: sim.valveOverride || sys.valve };
  }

  const overlaid = { ...sys, alert: sim };
  if (sim.valveOverride) overlaid.valve = sim.valveOverride;
  if (sim.type === 'power-lost')  overlaid.power = 'ac-lost';
  if (sim.type === 'offline') {
    overlaid.comm = 'offline';
    // Push lastSeen back so computeSystemHealth's threshold check agrees -
    // it prefers lastSeen over the flag, and if the static lastSeen is
    // recent it would compute isComm=true even when comm='offline'.
    // 90 min past = beyond the 60-min default threshold for WINT 3/VMA.
    overlaid.lastSeen = new Date(Date.now() - 90 * 60 * 1000).toISOString();
  }
  if (sim.type === 'valve-error') overlaid.valve = 'error';
  return overlaid;
}

export function getSystemById(id) {
  reloadSimulatedAlerts();
  const sys = SYSTEMS.find(s => s.id === id);
  if (!sys) return undefined;
  return applySimOverlay(sys, getSimulatedAlert(id));
}

export function isLeakDetectionEnabled(sys) {
  if (!sys) return false;
  if (sys.leakDetectionEnabled === false) return false;
  return !sys.offline;
}

// IANA timezone by upstream country name (the L1 node's name). MRG is a US
// portfolio; the Residential buildings are all NYC addresses.
const TZ_BY_COUNTRY_NAME = {
  'United States': 'America/New_York',
  'United Kingdom': 'Europe/London',
  Israel: 'Asia/Jerusalem',
  Germany: 'Europe/Berlin',
  France: 'Europe/Paris',
  Netherlands: 'Europe/Amsterdam',
  Ireland: 'Europe/Dublin',
  'United Arab Emirates': 'Asia/Dubai',
};

export function getSystemTz(sysOrId) {
  const sys = typeof sysOrId === 'string' ? getSystemById(sysOrId) : sysOrId;
  if (!sys) return 'UTC';
  if (sys.tz) return sys.tz;
  return TZ_BY_COUNTRY_NAME[sys.l1Name] || 'UTC';
}

export function computeWidgets(systems) {
  const online = systems.filter(s => s.comm === 'online').length;
  const offline = systems.filter(s => s.comm === 'offline').length;
  const offlineSystems = systems.filter(s => s.comm === 'offline').map(s => s.id);

  const valveSystems = systems.filter(s => s.valve !== null && s.comm === 'online');
  const open = valveSystems.filter(s => s.valve === 'open').length;
  const closed = valveSystems.filter(s => s.valve === 'closed').length;
  const error = valveSystems.filter(s => s.valve === 'error').length;
  const closedSystems = valveSystems.filter(s => s.valve === 'closed').map(s => s.id);
  const errorSystems = valveSystems.filter(s => s.valve === 'error').map(s => s.id);

  const commSystems = systems.filter(s => s.comm === 'online');
  const ac = commSystems.filter(s => s.power === 'ac').length;
  const acLost = commSystems.filter(s => s.power === 'ac-lost').length;
  const battery = commSystems.filter(s => s.power === 'battery').length;
  const acLostSystems = commSystems.filter(s => s.power === 'ac-lost').map(s => s.id);
  const batterySystems = commSystems.filter(s => s.power === 'battery').map(s => s.id);

  return {
    comm: { online, offline, offlineSystems },
    valves: { open, closed, error, closedSystems, errorSystems },
    power: { ac, acLost, battery, acLostSystems, batterySystems },
  };
}

export function computeKPIs(systems) {
  return {
    highFlows: systems.filter(s => s.alert?.type === 'leak-high').length,
    lowFlows: systems.filter(s => s.alert?.type === 'leak-low').length,
    insights: 0,
    errors: systems.filter(s => s.alert && s.alert.type !== 'leak-high' && s.alert.type !== 'leak-low').length,
    offline: systems.filter(s => s.offline).length,
  };
}

export const WIDGET_COUNTS = computeWidgets(SYSTEMS);
