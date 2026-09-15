// System details: topology, device info, meter, active policy, insights
// Modelled after the desktop pulse2_product_sandbox
import { SYSTEMS } from './systems';
import { getInsightsForSystem } from './upstream/insightsModel';

// ── Insights per system (seeded, deterministic) ─────────────────────────────

// ── System topology / device details ────────────────────────────────────────

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

function getDefaultDetails(systemId) {
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

function buildPolicy(kind, hasValve) {
  if (kind === 'working') {
    return {
      name: 'Working hours',
      schedule: '8:00 AM – 5:00 PM',
      autoShutoff: hasValve ? 'Disabled' : 'N/A',
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
    autoShutoff: hasValve ? 'Enabled' : 'N/A',
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
  const policy = buildPolicy(isWorkingHours ? 'working' : 'weekend', hasValve);
  return { ...policy, activeUntil: activeUntil.toISOString() };
}

function getNextPolicyForSystem(systemId) {
  const hour = new Date().getHours();
  const isWorkingHours = hour >= 8 && hour < 18;
  const hasValve = !NO_VALVE_SYSTEMS.has(systemId);
  // Next is the opposite of current.
  return buildPolicy(isWorkingHours ? 'weekend' : 'working', hasValve);
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

export function getSystemTopology(systemId) {
  return SYSTEM_DETAILS_MAP[systemId] || getDefaultDetails(systemId);
}

export function getActivePolicy(systemId) {
  return getPolicyForSystem(systemId);
}

export function getNextPolicy(systemId) {
  return getNextPolicyForSystem(systemId);
}
