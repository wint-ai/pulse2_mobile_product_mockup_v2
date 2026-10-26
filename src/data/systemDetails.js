// System details: topology, device info, meter, active policy, insights
// Modelled after the desktop pulse2_product_sandbox
import { SYSTEMS } from './systems';
import { getInsightsForSystem } from './upstream/insightsModel';
import { configFor, pipeTopologyOf, unitsFor } from './systemConfig';

export { PIPE_TOPOLOGY, NO_PIPING } from './systemConfig';

// ── Insights per system (seeded, deterministic) ─────────────────────────────

// ── System topology / device details ────────────────────────────────────────

/* Pipe topology and the device counts each type carries live in
   ./systemConfig — Water line / Open loop / Closed loop, with the meter, valve
   and VMA counts taken off the Figma schematics. */

const SYSTEM_DETAILS_MAP = {
  // Suffolk Construction – Tower One
  ct1: { topology: 'Water Line - Cooling Tower', deviceType: 'VMA', meter: 'Arad Octave 4"', valve: 'Toine 4"', status: 'online' },
  ct2: { topology: 'Water Line - Cooling Tower', deviceType: 'VMA', meter: 'Arad Octave 4"', valve: 'Toine 4"', status: 'online' },
  msl: { topology: 'Water Line - General Line', deviceType: 'VMA', meter: 'Arad Octave 4"', valve: 'Toine 4"', status: 'online' },
  dcw: { topology: 'Water Line - General Line', deviceType: 'VMA', meter: 'Neptune T-10 3/4"', valve: 'Apollo 70-100 1"', status: 'online' },
  dhw1: { topology: 'Water Line - General Line', deviceType: 'Flowless', meter: null, valve: null, status: 'online' },
  // Parking
  sp: { topology: 'No Piping Monitored', deviceType: 'Flowless', meter: null, valve: null, status: 'online' },
  irr: { topology: 'Water Line - General Line', deviceType: 'VMA', meter: 'Arad Octave 3/4"', valve: 'Toine 3/4"', status: 'online' },
  // Heathrow
  t5msl: { topology: 'Water Line - General Line', deviceType: 'VMA', meter: 'Arad Octave 4"', valve: 'Toine 4"', status: 'online' },
  t5ct: { topology: 'Water Line - Cooling Tower', deviceType: 'VMA', meter: 'Arad Octave 4"', valve: 'Toine 4"', status: 'online' },
  t5dcw: { topology: 'Water Line - General Line', deviceType: 'VMA', meter: 'Neptune T-10 3/4"', valve: 'Apollo 70-100 1"', status: 'online' },
  t5fire: { topology: 'Water Line - Fire Protection', deviceType: 'VMA', meter: 'Arad Octave 2"', valve: 'Toine 2"', status: 'online' },
  shc: { topology: 'Water Line - General Line', deviceType: 'VMA', meter: 'Arad Octave 3/4"', valve: 'Toine 3/4"', status: 'online' },
  bhs: { topology: 'Water Line - General Line', deviceType: 'VMA', meter: 'Arad Octave 1"', valve: 'Toine 1"', status: 'online' },
  ctt2: { topology: 'Water Line - Cooling Tower', deviceType: 'VMA', meter: 'Arad Octave 4"', valve: 'Toine 4"', status: 'online' },
  t2dcw: { topology: 'Water Line - General Line', deviceType: 'VMA', meter: 'Neptune T-10 3/4"', valve: 'Apollo 70-100 1"', status: 'online' },
  t2fire: { topology: 'Water Line - Fire Protection', deviceType: 'VMA', meter: 'Arad Octave 2"', valve: 'Toine 2"', status: 'online' },
  csf: { topology: 'Water Line - General Line', deviceType: 'VMA', meter: 'Arad Octave 3/4"', valve: 'Toine 3/4"', status: 'online' },
  f11a: { topology: 'Water Line - General Line', deviceType: 'VMA', meter: 'Neptune T-10 3/4"', valve: null, status: 'online' },
};

function getDefaultDetails() {
  return { topology: 'Water Line - Single Apartment', deviceType: 'VMA', meter: 'Arad Octave 3/4"', valve: 'Toine 3/4"', status: 'online' };
}

// ── Active policy per system ────────────────────────────────────────────────

// Policy types: working hours vs non-working hours
// Working hours: Fixed detection, auto shut-off OFF
// Non-working hours: Adaptive detection, auto shut-off ON
// Leak detection is always ON

// Policy schema (locked 2026-06-03):
//   • name              — 'Working hours' | 'Weekend'
//   • schedule          — display string like '8:00 AM – 5:00 PM'
//   • autoShutoff       — 'Enabled' | 'Disabled' | 'N/A'
//   • alert             — 'Active'  | 'Inactive'
//   • defaultValveState — 'Open'    | 'Closed' | 'N/A'
//   • detection         — 'Adaptive'| 'Fixed'
//
// activeUntil + leakDetection kept for back-compat with older callers; new UI
// uses the fields above.

// Some systems have no valve — auto shutoff / valve state collapse to 'N/A'.
// Metering-only systems — upstream records no valve_type for them. Derived from
// the fleet rather than a hand-kept id list so it survives a dataset refresh.
const NO_VALVE_SYSTEMS = new Set(
  SYSTEMS.filter(s => s.valve === null).map(s => s.id),
);

/* AUTO-CLOSE IS A PER-SYSTEM SETTING, not a time of day.
 *
 * It used to fall out of `kind`: Working hours -> Disabled, Weekend ->
 * Enabled. So between 08:00 and 18:00 EVERY system in the fleet read
 * Disabled, and outside those hours every system read Enabled — you could
 * never see the two states beside each other, and the auto-close countdown
 * (199683:24830, "Will activate in") was literally unreachable for ten hours
 * a day on all 103 systems. Owner, looking at a Disabled card: "its not
 * there."
 *
 * It is also wrong on its own terms. Whether a valve may close itself is a
 * commissioning decision made per system — a fire riser is configured not to,
 * a tenant kitchen feed is configured to — and it does not flip at 6pm.
 *
 * Seeded off the system id the same way the rest of the mock data is, so
 * roughly half the fleet carries it either way, at any hour, reproducibly.
 * The POLICY NAME and its schedule stay on the clock, because those really
 * are about working hours. */
function autoShutoffFor(systemId) {
  const id = String(systemId ?? '');
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 2 === 0;
}

function buildPolicy(kind, hasValve, systemId) {
  const auto = hasValve && autoShutoffFor(systemId);
  if (kind === 'working') {
    return {
      name: 'Working hours',
      schedule: '8:00 AM – 5:00 PM',
      autoShutoff: hasValve ? (auto ? 'Enabled' : 'Disabled') : 'N/A',
      alert: 'Active',
      defaultValveState: hasValve ? 'Open' : 'N/A',
      detection: 'Adaptive',
      // back-compat
      leakDetection: 'On',
    };
  }
  // weekend / non-working
  return {
    name: 'Weekend',
    schedule: '5:00 PM – Mon 8:00 AM',
    autoShutoff: hasValve ? (auto ? 'Enabled' : 'Disabled') : 'N/A',
    alert: 'Active',
    defaultValveState: hasValve ? 'Closed' : 'N/A',
    detection: 'Adaptive',
    leakDetection: 'On',
  };
}

function getPolicyForSystem(systemId) {
  const hour = new Date().getHours();
  const isWorkingHours = hour >= 8 && hour < 18;

  const now = new Date();
  let activeUntil;
  if (isWorkingHours) {
    activeUntil = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0);
  } else if (hour >= 18) {
    activeUntil = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0);
  } else {
    activeUntil = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0);
  }

  const hasValve = !NO_VALVE_SYSTEMS.has(systemId);
  const policy = buildPolicy(isWorkingHours ? 'working' : 'weekend', hasValve, systemId);
  return { ...policy, activeUntil: activeUntil.toISOString() };
}

function getNextPolicyForSystem(systemId) {
  const hour = new Date().getHours();
  const isWorkingHours = hour >= 8 && hour < 18;
  const hasValve = !NO_VALVE_SYSTEMS.has(systemId);
  // Next is the opposite of current.
  return buildPolicy(isWorkingHours ? 'weekend' : 'working', hasValve, systemId);
}

// ── Exports ─────────────────────────────────────────────────────────────────

/**
 * Insights for a system, in the web sandbox's model.
 *
 * The local generator this replaced invented titles from a six-entry template
 * list ("Night-time flow", "Consumption spike") with random values and no link
 * to the system's consumption, so the card showed template names where the web
 * shows the system name and could repeat a title twice in four rows.
 * See src/data/upstream/insightsModel.js.
 */
export function getSystemInsights(systemId) {
  return getInsightsForSystem(SYSTEMS.find(s => s.id === systemId));
}

export function getSystemTopology(systemId, systemName = '') {
  /* NOTE: SYSTEM_DETAILS_MAP is keyed by legacy ids (ct1, msl, t5ct) and the
     dataset's systems are ws-#### — not one key matches, so in practice every
     system takes the default. systemConfig.pipeTopologyOf therefore reads the
     system NAME, which is real. Left as-is rather than re-keyed: the map is
     still the shape the Info tab's `specs.*` rows expect, and re-pointing 18
     hand-written rows at ws- ids would be guesswork about which is which. */
  const details = SYSTEM_DETAILS_MAP[systemId] || getDefaultDetails();
  const pipeTopology = pipeTopologyOf(details, systemName);
  /* Resolved here rather than written into all 18 rows by hand, so a cooling
     tower cannot be added without its loop. The counts come with it, which is
     what the System page reads to decide how many units to draw.
     `monitoredEnvironment` is the other `specs.*` field the PRD names; only
     the cooling case is documented, so the rest stay null. */
  return {
    ...details,
    pipeTopology,
    config: pipeTopology ? configFor(pipeTopology) : null,
    monitoredEnvironment:
      details.monitoredEnvironment ??
      (/cooling tower/i.test(details.topology ?? '') ? 'Outdoor · cooling' : null),
  };
}

/**
 * The monitored units of a system — one per leg of its pipe topology, so a
 * water line yields one and either loop yields Supply + Return.
 */
export function getSystemUnits(system) {
  if (!system) return [];
  return unitsFor(getSystemTopology(system.id, system.name), {
    valve: system.valve,
    comm: system.comm,
    power: system.power,
    serial: system.upstream?.waterSystemId ?? null,
    idPrefix: system.id,
    name: system.name,
  });
}

export function getActivePolicy(systemId) {
  return getPolicyForSystem(systemId);
}

export function getNextPolicy(systemId) {
  return getNextPolicyForSystem(systemId);
}

/* ── Finding notes ─────────────────────────────────────────────────────────
 * Owner, 2026-10-26: "make sure for all systems we have photos and notes that
 * help find the systems."
 *
 * The Notes field defaulted to an empty textarea on every system, so the one
 * thing it exists for — telling the next engineer where the unit physically
 * is — was never answered. These are the mock defaults: a user override still
 * wins (locationInfoStore.getNotesOverride), and the moment anyone types their
 * own, theirs is what shows.
 *
 * Built from the system's OWN fields where they exist — its name, its
 * location, the device it carries — so the note names the real thing rather
 * than generic filler. The parts no dataset of ours holds (which level, which
 * bay, who keeps the key) are drawn from a stable hash of the system id, the
 * same way buildAlert fabricates flowRate and volume: reproducible, varied
 * between systems, and consistent for one system across reloads.
 */
const LEVELS = ['Level B2', 'Level B1', 'Ground floor', 'Level 2', 'Roof plant'];
const ACCESS = [
  'Access through the service corridor — key from building reception.',
  'Access via the loading bay stair; the plant room is the second door on the left.',
  'Door is badge-controlled — facilities can grant access on the day.',
  'Riser cupboard is unlocked during working hours, key from the duty engineer otherwise.',
];
const CONTACT = [
  'Call the site contact before isolating anything.',
  'Tell the duty engineer before closing the valve — this line feeds occupied floors.',
  'No notice needed out of hours; log it in the building book afterwards.',
  'Coordinate with the FM team: this riser is shared with the floor above.',
];

function noteHash(id) {
  let h = 0;
  const s = String(id ?? '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** A findability note for a system: where it is, how to get there, who to tell. */
export function getFindingNotes(system) {
  if (!system) return '';
  const h = noteHash(system.id);
  const level = LEVELS[h % LEVELS.length];
  const bay = 1 + ((h >> 3) % 6);
  const access = ACCESS[(h >> 5) % ACCESS.length];
  const contact = CONTACT[(h >> 7) % CONTACT.length];
  const where = system.l4Name ? `${level}, bay ${bay} — ${system.l4Name}` : `${level}, bay ${bay}`;
  const what = system.name ? `The unit sits on the ${system.name} line` : 'The unit sits on the main line';
  return [
    `${where}.`,
    `${what}, about 1.2 m above the valve set — the Wint box is the white one on the wall beside it.`,
    access,
    contact,
  ].join('\n');
}
