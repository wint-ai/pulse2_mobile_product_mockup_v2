/**
 * Pipe topology, and the device configuration each type carries.
 *
 * THE THREE TYPES are Water line, Open loop and Closed loop. They are not a
 * label — each comes with a different number of meters, valves and VMAs, and
 * that count is what decides how many units the System page draws.
 *
 * WHERE THE COUNTS COME FROM — the design, not a guess. PipeTopology.jsx is
 * traced from Figma 198453:40480, which ships six symbols:
 *
 *     Water Line With Valve    198453:40479   Water Line No Valve    198453:40481
 *     Open Loop With Valves    198453:40511   Open Loop No Valve     198453:40586
 *     Closed Loop With Valves  198453:40749   Closed Loop No Valve   198453:40849
 *
 * Its `WaterLine` draws ONE valve and ONE sensor. Its `Loop` draws TWO valves
 * and TWO sensors, one pair on the supply leg and one on the return. The only
 * difference between open and closed is the junction glyph — that file's own
 * docblock says so: "Closed loop is open loop without the junction glyph, that
 * is the whole difference between them in the design."
 *
 * The plural names ("With Valves") and the doubled glyphs are the design
 * stating the configuration outright, which is why the loop card in Figma
 * draws two device blocks and the water-line card draws one.
 *
 * WHICH SYSTEMS ARE LOOPS. The sandbox PRD settles this rather than leaving it
 * to inference: docs/PRD/04h-info-tab.md defines `specs.*` as "Pipe topology ·
 * Valve model · Monitored environment · Meter model", and its worked example
 * (docs/PRD/HTMLs/info-tab.html) is *Cooling Tower #1 · Tower One · Suffolk*
 * carrying `Pipe topology: Looped` and `Monitored environment: Outdoor ·
 * cooling`. That system is `ct1` in systemDetails.js. A cooling tower is an
 * OPEN loop — it is open to atmosphere and loses water to evaporation, which
 * is exactly why it is metered on both legs.
 *
 * All three types are populated by the real dataset: the cooling towers are
 * open loops, the HVAC and chiller loops are closed ones, and everything else
 * is a single run. Nothing here is invented to fill a type — see
 * pipeTopologyOf below for how each system is resolved.
 */

export const PIPE_TOPOLOGY = {
  WATER_LINE: 'Water line',
  OPEN_LOOP: 'Open loop',
  CLOSED_LOOP: 'Closed loop',
}

/**
 * The configuration each topology carries.
 *
 * `legs` names the monitored runs, in the order the card draws them. Its
 * length IS the VMA count: a VMA is the unit that houses one leg's meter and
 * valve, so one leg is one unit.
 */
export const TOPOLOGY_CONFIG = {
  [PIPE_TOPOLOGY.WATER_LINE]: {
    legs: ['Supply'],
    meters: 1,
    valves: 1,
    vmas: 1,
    junction: false,
    /* The schematic PipeTopology.jsx draws for this type. */
    schematic: 'water-line',
  },
  [PIPE_TOPOLOGY.OPEN_LOOP]: {
    legs: ['Supply', 'Return'],
    meters: 2,
    valves: 2,
    vmas: 2,
    junction: true,
    schematic: 'open-loop',
  },
  [PIPE_TOPOLOGY.CLOSED_LOOP]: {
    legs: ['Supply', 'Return'],
    meters: 2,
    valves: 2,
    vmas: 2,
    junction: false,
    schematic: 'closed-loop',
  },
}

/** Nothing piped means nothing to draw — not a topology with zero devices. */
export const NO_PIPING = 'No Piping Monitored'

export function configFor(pipeTopology) {
  return TOPOLOGY_CONFIG[pipeTopology] ?? TOPOLOGY_CONFIG[PIPE_TOPOLOGY.WATER_LINE]
}

/**
 * Resolve a system's pipe topology.
 *
 * READ THIS BEFORE CHANGING IT. systemDetails.js keys SYSTEM_DETAILS_MAP by
 * legacy ids — `ct1`, `msl`, `t5ct` — and the dataset's systems are `ws-9623`
 * and friends. Not one key matches, so every one of the 103 systems fell
 * through to getDefaultDetails() and reported "Water Line - Single Apartment".
 * That is why the System page drew a single unit on every system in the app,
 * including the cooling towers, and why the loop card never appeared. The
 * legacy `topology` string is therefore NOT a usable signal: it is the same
 * default everywhere.
 *
 * The system NAME is real upstream data, so the type is read from that:
 *
 *   Cooling Tower Blowdown / Makeup  -> OPEN loop. A cooling tower is open to
 *       atmosphere and loses water to evaporation, which is why it is metered
 *       on both legs. The sandbox PRD's own looped example is a cooling tower:
 *       docs/PRD/HTMLs/info-tab.html documents "Cooling Tower #1 · Tower One ·
 *       Suffolk" with `Pipe topology: Looped`.
 *   HVAC Loop / Chiller Loop         -> CLOSED loop. A sealed hydronic circuit,
 *       supply and return, no junction to atmosphere.
 *   everything else                  -> WATER LINE, a single run.
 *
 * Boiler Makeup stays a water line on purpose: makeup is the feed INTO a
 * closed loop, not the loop itself, and it is metered as one run.
 *
 * A record may still declare `pipeTopology` outright, and that wins.
 */
const OPEN_LOOP_NAME = /cooling tower/i
const CLOSED_LOOP_NAME = /\b(hvac|chiller|chilled water|heating)\b.*\bloop\b|\bloop\b.*\b(hvac|chiller)\b/i

export function pipeTopologyOf(details, name = '') {
  const declared = details?.pipeTopology
  if (declared && TOPOLOGY_CONFIG[declared]) return declared
  if ((details?.topology ?? '') === NO_PIPING) return null

  const label = String(name || '')
  if (OPEN_LOOP_NAME.test(label)) return PIPE_TOPOLOGY.OPEN_LOOP
  if (CLOSED_LOOP_NAME.test(label)) return PIPE_TOPOLOGY.CLOSED_LOOP

  /* The legacy string is the same default on every system, so it can only
     ever confirm a cooling tower that the name already caught. Kept for the
     hand-written rows, which do carry real values. */
  if (OPEN_LOOP_NAME.test(details?.topology ?? '')) return PIPE_TOPOLOGY.OPEN_LOOP
  return PIPE_TOPOLOGY.WATER_LINE
}

/**
 * The units a system is monitored by — one per leg.
 *
 * A system record holds a single `waterSystemId`, so only the first leg can
 * carry a real serial. The rest are left null rather than given a derived
 * number: a fabricated serial on screen is worse than an absent one, and the
 * card already renders a unit without it.
 */
export function unitsFor(details, { valve, comm, power, serial, idPrefix = 'sys', name = '' } = {}) {
  const topology = pipeTopologyOf(details, name)
  if (!topology) return []
  return configFor(topology).legs.map((leg, i) => ({
    id: `${idPrefix}-${leg.toLowerCase()}`,
    name: leg,
    serial: i === 0 ? (serial ?? null) : null,
    valve,
    comm,
    power,
    /* Carried through so the Info tab's `specs.*` rows have their source in
       one place rather than being re-derived per screen. */
    meter: details?.meter ?? null,
    valveModel: details?.valve ?? null,
    deviceFamily: details?.deviceType ?? null,
  }))
}
