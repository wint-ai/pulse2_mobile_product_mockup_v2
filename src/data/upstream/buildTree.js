/**
 * buildTree.js — turns the vendored MRG snapshot into the shapes this app
 * already consumes (SYSTEMS / ACCOUNT_HIERARCHIES / ACCOUNTS / SCOPES).
 *
 * Everything here is derived. Nothing is hand-maintained, which is the point:
 * the old data layer kept the hierarchy in three hand-written places (the tree
 * in hierarchy.js, the flat l1..l4 fields on every system, and the SCOPES list)
 * and they drifted. One source, three derived views.
 *
 * LEVEL MAPPING
 *   The web tree is three location levels deep:
 *     L1 Country ("United States")
 *     L2 Division ("Office" | "Residential")
 *     L3 Site/Building ("100 Meridian Plaza" | "Building A")
 *     → systems hang off L3
 *   This app's shape allows four. Rather than invent a level to fill L4, L3
 *   holds the deepest location and `l4`/`l4Name` are null. Call sites render
 *   `l4Name || l3Name`.
 */
import snapshot from './mrg-snapshot.json';
import { stableHash, systemEventType, eventTypeToLeak, resolvedVariant } from './parity';

export const SNAPSHOT_META = snapshot._meta;
export const ROOT_ACCOUNT_ID = snapshot.rootAccountId;

// ── Derived per-system hardware state ────────────────────────────────────────
// The web's CRM dataset carries no live valve/comm/power state — the web app
// derives what it shows from the system id. We do the same, with a salt per
// field so the three don't correlate. NOT parity-guaranteed with the web (the
// web has no published per-system value to match); leak state IS — it comes
// from the ported `systemEventType`.
function derived(id, salt, buckets) {
  return buckets[stableHash(`${salt}:${id}`) % buckets.length];
}

// Weighted by repetition: mostly healthy, with a few systems in each bad state
// so the fleet views have something to show.
const VALVE_BUCKETS = ['open', 'open', 'open', 'open', 'open', 'open', 'open', 'closed', 'error'];
const COMM_BUCKETS = ['online', 'online', 'online', 'online', 'online', 'online', 'online', 'online', 'offline'];
const POWER_BUCKETS = ['ac', 'ac', 'ac', 'ac', 'ac', 'ac', 'ac', 'ac', 'battery', 'ac-lost'];

function relativeAge(hoursAgo) {
  if (hoursAgo < 1) return `${Math.round(hoursAgo * 60)}m`;
  if (hoursAgo < 24) return `${Math.floor(hoursAgo)}h ${String(Math.round((hoursAgo % 1) * 60)).padStart(2, '0')}m`;
  const days = Math.floor(hoursAgo / 24);
  return `${days}d ${Math.round(hoursAgo % 24)}h`;
}

function clockFromHoursAgo(hoursAgo) {
  const d = new Date(Date.now() - hoursAgo * 3600000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * The active-event card for a system, or null when it has no active event.
 * Volume/flow use the same hash family the web uses for its resolved incidents,
 * so numbers are stable across reloads rather than random per render.
 */
function buildAlert(id, leak, valve, comm, power) {
  if (leak) {
    const h = stableHash(`active:${id}`);
    const hoursAgo = 1 + (h % 11) + (h % 60) / 60;
    const flowRate = leak === 'high' ? 120 + (h % 480) : 18 + (h % 34);
    const volume = Math.round(flowRate * hoursAgo);
    return {
      type: leak === 'high' ? 'leak-high' : 'leak-low',
      label: leak === 'high' ? 'High Flow Water Event' : 'Low Flow Water Event',
      age: relativeAge(hoursAgo),
      startedAt: clockFromHoursAgo(hoursAgo),
      volume: `${volume.toLocaleString('en-US')}L`,
      flowRate: `${flowRate} L/hour`,
    };
  }
  // Non-leak faults still surface as alerts, in the app's existing priority order.
  if (comm === 'offline') {
    const h = stableHash(`offline:${id}`);
    return { type: 'offline', label: 'System Offline', age: relativeAge(1 + (h % 40)), startedAt: clockFromHoursAgo(1 + (h % 40)), volume: null };
  }
  if (valve === 'error') {
    const h = stableHash(`valve:${id}`);
    return { type: 'valve-error', label: 'Valve error', age: relativeAge(1 + (h % 12)), startedAt: clockFromHoursAgo(1 + (h % 12)), volume: null };
  }
  if (power === 'ac-lost') {
    const h = stableHash(`power:${id}`);
    return { type: 'power-lost', label: 'AC Power Lost', age: relativeAge(1 + (h % 30)), startedAt: clockFromHoursAgo(1 + (h % 30)), volume: null };
  }
  return null;
}

// ── Walk the snapshot tree ───────────────────────────────────────────────────
const systems = [];
const hierarchyRoots = [];

const TYPE_FOR_DEPTH = ['level1', 'level2', 'level3', 'level4'];

function walk(node, ancestors) {
  if (node.type === 'system') {
    const [l1, l2, l3] = ancestors;
    const id = node.id;
    const leak = eventTypeToLeak(systemEventType(id));
    const isResidential = Boolean(node.system?.residential);
    // Upstream CRM records a valve_type per system, and 20 of the 53 MRG
    // systems genuinely have none — they are metering-only. `valve: null` is
    // the app's existing representation for that (computeWidgets and the
    // valve tab both filter on it), so honour the upstream fact rather than
    // inventing a valve. Residential apartments are synthetic and all have one.
    const hasValve = isResidential || Boolean(node.system?.valveType);
    const valve = hasValve ? derived(id, 'valve', VALVE_BUCKETS) : null;
    const comm = derived(id, 'comm', COMM_BUCKETS);
    const power = derived(id, 'power', POWER_BUCKETS);

    systems.push({
      id,
      account: node.system?.accountSfId || l3?.site?.accountSfId || ROOT_ACCOUNT_ID,
      name: node.name,

      l1: l1?.id ?? null, l1Name: l1?.name ?? null,
      l2: l2?.id ?? null, l2Name: l2?.name ?? null,
      l3: l3?.id ?? null, l3Name: l3?.name ?? null,
      l4: null, l4Name: null,

      // Street address of the deepest location, when upstream has one. The
      // Residential buildings carry real NYC addresses; the Office sites do
      // not (the CRM export has no street field), so those fall back to the
      // breadcrumb in `addressFor`.
      l3Address: l3?.address ?? null,

      valve,
      comm,
      power,
      leak,
      offline: comm === 'offline',
      alert: buildAlert(id, leak, valve, comm, power),

      // Residential apartments are tenant systems — they get Home/Away mode.
      homeAway: isResidential,

      // Upstream identity, carried through so a system is addressable by the
      // same id in both apps and deep links can be compared directly.
      upstream: {
        salesforceId: node.system?.salesforceId ?? null,
        waterSystemId: node.system?.waterSystemId ?? null,
        siteSfId: node.system?.siteSfId ?? null,
        accountSfId: node.system?.accountSfId ?? null,
        active: node.system?.active ?? true,
        valveType: node.system?.valveType ?? null,
        meterType: node.system?.meterType ?? null,
        residential: isResidential,
      },
      resolvedIncident: resolvedVariant(id),
    });
    return { id: node.id, name: node.name, type: 'system' };
  }

  const depth = ancestors.length;
  const out = {
    id: node.id,
    name: node.name,
    type: TYPE_FOR_DEPTH[depth] || 'level4',
    levelType: node.levelName || 'Location',
    ...(node.address ? { address: node.address } : {}),
    ...(node.site ? { site: node.site } : {}),
    children: [],
  };
  out.children = (node.children || []).map(child => walk(child, [...ancestors, node]));
  return out;
}

for (const country of snapshot.tree) hierarchyRoots.push(walk(country, []));

export const SYSTEMS_FROM_UPSTREAM = systems;

export const ACCOUNT_HIERARCHIES_FROM_UPSTREAM = {
  [ROOT_ACCOUNT_ID]: hierarchyRoots,
};

// ── Accounts ─────────────────────────────────────────────────────────────────
// Colour is presentational and has no upstream equivalent; assigned stably so
// a given account keeps its colour across rebuilds.
const ACCOUNT_COLORS = ['#04ADEF', '#7C3AED', '#DB4670', '#F05C25', '#A1D246', '#006340'];

function shortNameFor(name) {
  if (!name) return '';
  const cleaned = name.replace(/\s*\((.*?)\)\s*/g, ' ').trim();
  const paren = name.match(/\(([^)]+)\)/);
  if (paren) return paren[1];
  const words = cleaned.split(/\s+/);
  return words.length <= 2 ? cleaned : words.slice(0, 2).join(' ');
}

export const ACCOUNTS_FROM_UPSTREAM = snapshot.accounts.map(a => ({
  id: a.id,
  name: a.name,
  shortName: shortNameFor(a.name),
  industry: a.industry || a.type || '',
  color: ACCOUNT_COLORS[stableHash(a.id) % ACCOUNT_COLORS.length],
  parentId: a.parentId,
  // Upstream CRM carries no address/contact detail for these accounts. Left
  // empty rather than invented — the Info tab renders empty state for blanks.
  address: '',
  shippingAddress: '',
  contacts: [],
  notes: '',
  upstream: {
    status: a.status,
    type: a.type,
    region: a.region,
    numberOfActiveSites: a.numberOfActiveSites,
  },
}));

// ── Scopes (derived, not hand-maintained) ────────────────────────────────────
const systemsById = new Map(systems.map(s => [s.id, s]));

function collectSystems(node, acc = []) {
  if (node.type === 'system') {
    const s = systemsById.get(node.id);
    if (s) acc.push(s);
    return acc;
  }
  for (const child of node.children || []) collectSystems(child, acc);
  return acc;
}

const scopes = [
  {
    key: 'all',
    label: 'All locations',
    sub: `${systems.length} systems`,
    indent: 0,
    alerts: systems.filter(s => s.alert).length,
  },
];

function pushScopes(node, indent) {
  if (node.type === 'system') return;
  const under = collectSystems(node);
  const level = TYPE_FOR_DEPTH.indexOf(node.type) + 1;
  scopes.push({
    key: node.id,
    label: node.name,
    sub: `${under.length} system${under.length === 1 ? '' : 's'} · ${node.levelType} · L${level}`,
    indent,
    alerts: under.filter(s => s.alert).length,
  });
  for (const child of node.children || []) pushScopes(child, indent + 1);
}

for (const root of hierarchyRoots) pushScopes(root, 1);

export const SCOPES_FROM_UPSTREAM = scopes;
