/**
 * Canonical test systems for the MRG dataset.
 *
 * Tests used to hardcode fixture ids ('ct1', 'dl_apt_sea_view', …). Those
 * systems are gone with the Suffolk/Heathrow/Tidhar fixtures, and hardcoding
 * new ids would put us straight back where we were: a dataset refresh would
 * silently break 70 tests again.
 *
 * So these are selected by MEANING. Only the four apartment ids are literal,
 * because the web's own demo rule fixes them (see upstream/parity.js):
 * Apartment 2 of any Residential building is High Flow, Apartment 5 is Low
 * Flow, and Buildings D and E are all-clear.
 */
import { SYSTEMS } from '../data/systems';

/** Residential apartment with an active High Flow event. Owned by tenant-2apts. */
export const APT_WITH_EVENT = 'esrt-bldg-A-apt-2';

/** Residential apartment with an active Low Flow event. */
export const APT_LOW_FLOW = 'esrt-bldg-A-apt-5';

/**
 * All-clear apartment in Building E, valve open. Owned by tenant-2apts
 * alongside APT_WITH_EVENT. Isolation tests assert its valve is NOT 'closed',
 * so it must be an open-valve system.
 */
export const APT_CLEAR = 'esrt-bldg-E-apt-7';

/**
 * The tenant-1apt (happy path) persona's apartment: clean, and inside Building A
 * so the same apartment is visible to both its tenant and its building manager.
 * Residential apartments carry no device errors (the web has no CRM record for
 * them), so any Building A apartment other than 2 and 5 is fully clear.
 */
export const HAPPY_PATH_APT = 'esrt-bldg-A-apt-3';

function pick(label, predicate) {
  const hit = SYSTEMS.find(predicate);
  if (!hit) throw new Error(`test fixture "${label}" matched no system in the MRG dataset`);
  return hit.id;
}

/** A commercial (Office) system with an active High Flow event. */
export const OFFICE_HIGH_FLOW = pick(
  'OFFICE_HIGH_FLOW',
  s => s.l2 === 'esrt-office' && s.alert?.type === 'leak-high' && s.valve !== null,
);

/**
 * A system whose STATIC state is a Low Flow event with its valve in error.
 * Several tests need both at once: a static leak-low alert to be overridden by
 * a simulated high-flow push, and a non-leak secondary issue that must survive
 * the leak being tombstoned.
 */
export const LOW_FLOW_VALVE_ERROR = pick(
  'LOW_FLOW_VALVE_ERROR',
  s => s.alert?.type === 'leak-low' && s.valve === 'error',
);

/** A commercial system with no active alert at all. */
export const OFFICE_CLEAR = pick(
  'OFFICE_CLEAR',
  s => s.l2 === 'esrt-office' && !s.alert && s.valve !== null && s.comm === 'online',
);

/** The leaf location (L4) that OFFICE_HIGH_FLOW belongs to. */
export const OFFICE_LOCATION_ID = SYSTEMS.find(s => s.id === OFFICE_HIGH_FLOW).l4;
