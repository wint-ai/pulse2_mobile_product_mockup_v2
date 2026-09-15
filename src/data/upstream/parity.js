/**
 * parity.js — the web app's deterministic state functions, ported verbatim.
 *
 * This is the file that makes side-by-side comparison actually work. The web
 * app does not store per-system status; it DERIVES it from the system id with
 * a stable hash. Port the hash faithfully and both apps independently arrive at
 * the same answer for the same system — no shared backend, no synced fixtures.
 *
 * Upstream source (read-only reference, do not edit there):
 *   pulse2_product_sandbox/src/system-page/data/eventsTimelineMockData.ts
 *   pulse2_product_sandbox/src/demoMode.ts
 *
 * If the web changes these functions, re-port them here and re-run the parity
 * test (src/__tests__/upstream-parity.test.js), which pins known id→state pairs.
 */
import snapshot from './mrg-snapshot.json';

export const MRG_ACCOUNT_ID = snapshot.rootAccountId;
export const ALL_CLEAR_LOCATION_IDS = snapshot.allClearLocationIds;

/**
 * Stable 32-bit hash. Verbatim from the web (`stableHash` in mockData.ts and
 * the inline loop in systemEventType). Must not be "improved" — its exact
 * output is the contract between the two apps.
 */
export function stableHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** web: demoMode.ts isAllClearDemoSystem */
export function isAllClearDemoSystem(systemId) {
  return ALL_CLEAR_LOCATION_IDS.some(
    id => systemId === id || systemId.startsWith(`${id}-`),
  );
}

/**
 * web: eventsTimelineMockData.ts systemEventType
 * Returns 'high' | 'low' | 'none'.
 */
export function systemEventType(systemId) {
  // An all-clear location stays clear at every level below it.
  if (isAllClearDemoSystem(systemId)) return 'none';
  // Every other Residential building has exactly two apartments with an active
  // event: Apartment 2 = high flow, Apartment 5 = low flow.
  if (systemId.startsWith('esrt-bldg-')) {
    if (systemId.endsWith('-apt-2')) return 'high';
    if (systemId.endsWith('-apt-5')) return 'low';
    return 'none';
  }
  const m = stableHash(systemId) % 3;
  return m === 0 ? 'none' : m === 1 ? 'high' : 'low';
}

/** web: eventsTimelineMockData.ts systemHasActiveLeak */
export function systemHasActiveLeak(systemId) {
  return systemEventType(systemId) !== 'none';
}

/** web: eventsTimelineMockData.ts RESOLUTIONS */
const RESOLUTIONS = [
  'Resolved by plumber',
  'Fixture repaired on site',
  'Flow returned to normal',
  'Valve reopened after inspection',
  'Closed by facilities team',
];

/**
 * web: eventsTimelineMockData.ts resolvedVariant
 * The one fully-closed incident every system carries, deterministically varied.
 */
export function resolvedVariant(systemId) {
  const h = stableHash(systemId);

  const isHigh = h % 5 !== 0; // ~80% high flow, matching what closes most often
  // 12h – ~5 weeks back, so the list spans days not one afternoon.
  const detectedHoursAgo = 12 + (h % 820);
  const durationHours = 1 + (h % 11);
  const durationMins = h % 60;
  const flowLph = isHigh ? 120 + (h % 480) : 18 + (h % 34);

  return {
    title: isHigh ? 'High Flow Anomaly' : 'Low Flow Anomaly',
    severity: isHigh ? 'critical' : 'warning',
    level: isHigh ? 'HIGH_FLOW' : 'LOW_FLOW',
    detectedHoursAgo,
    resolvedHoursAgo: Math.max(1, detectedHoursAgo - durationHours),
    flowLph,
    warnVolume: 20 + (h % 70),
    totalVolume: Math.round(flowLph * (durationHours + durationMins / 60)),
    warnDuration: `${5 + (h % 25)}m`,
    totalDuration: `${durationHours}h ${String(durationMins).padStart(2, '0')}m`,
    resolutionLabel: RESOLUTIONS[h % RESOLUTIONS.length],
  };
}

/** web: eventsTimelineMockData.ts — incidentId format, shared across lifecycle rows. */
export function incidentIdFor(systemId, incidentNum = '01') {
  return `ANM-2026-${systemId}-${incidentNum}`;
}

// ── Status enum bridges ──────────────────────────────────────────────────────
// The mobile app speaks lowercase shorthand; the web speaks SCREAMING_CASE.
// Both directions are kept here so a comparison harness can translate either
// way without re-deriving the mapping at each call site.

export const VALVE_TO_WEB = { open: 'OPEN', closed: 'CLOSED', error: 'ERROR' };
export const VALVE_FROM_WEB = { OPEN: 'open', CLOSED: 'closed', ERROR: 'error', N_A: 'open' };

export const COMM_TO_WEB = { online: 'OK', offline: 'LOST' };
export const COMM_FROM_WEB = { OK: 'online', LOST: 'offline' };

export const POWER_TO_WEB = { ac: 'AC_PLUGGED', 'ac-lost': 'AC_UNPLUGGED', battery: 'BATTERY' };
export const POWER_FROM_WEB = { AC_PLUGGED: 'ac', AC_UNPLUGGED: 'ac-lost', BATTERY: 'battery' };

/** mobile `leak` shorthand → the web's two-field representation. */
export function leakToWeb(leak) {
  if (leak === 'high') return { leakStatus: 'ACTIVE', leakLevel: 'HIGH_FLOW' };
  if (leak === 'low') return { leakStatus: 'ACTIVE', leakLevel: 'LOW_FLOW' };
  return { leakStatus: 'NONE', leakLevel: null };
}

/** web's two-field representation → mobile `leak` shorthand. */
export function leakFromWeb(leakStatus, leakLevel) {
  if (leakStatus !== 'ACTIVE') return null;
  return leakLevel === 'LOW_FLOW' ? 'low' : 'high';
}

/** `systemEventType` result → mobile `leak` shorthand. */
export function eventTypeToLeak(eventType) {
  return eventType === 'none' ? null : eventType;
}
