/**
 * The system-type taxonomy — Flow Monitoring / Flood Sensor / Humidity Sensor.
 *
 * These three are the product's own categories, not this table's invention:
 * SystemsHealthCard has drawn them as the "Systems types" chips since
 * 198601:62957, labelled Topology / Flood / Humidity.
 *
 * WHAT THIS DATASET ACTUALLY HOLDS
 * Every record in mrg-snapshot.json carries a water meter — `meterType` is one
 * of EMAG, Impeller, Ultrasonic, "UltraSonic clamp on" — and not one carries a
 * flood or a humidity device. That is why HomeAllAccounts reports
 * `{ topology: systems.length, flood: 0, humidity: 0 }` and documents "ASK for
 * a sensor dataset rather than synthesise one".
 *
 * So `systemTypeOf` returning FLOW for everything today is the TRUTH about the
 * data, not a placeholder standing in for a field nobody wired. `systemType`
 * on the record is read first so a dataset that does declare types drives the
 * icons and the filter without touching this file.
 */

export const SYSTEM_TYPE = {
  FLOW: 'flow',
  FLOOD: 'flood',
  HUMIDITY: 'humidity',
}

/** Canonical order — the order the filter lists them in. */
export const SYSTEM_TYPE_ORDER = [SYSTEM_TYPE.FLOW, SYSTEM_TYPE.FLOOD, SYSTEM_TYPE.HUMIDITY]

export const SYSTEM_TYPE_LABEL = {
  [SYSTEM_TYPE.FLOW]: 'Flow Monitoring',
  [SYSTEM_TYPE.FLOOD]: 'Flood Sensor',
  [SYSTEM_TYPE.HUMIDITY]: 'Humidity Sensor',
}

/**
 * ONE SENTENCE PER TYPE, FOR THE "WHAT IS THIS?" TAP.
 *
 * Owner, 2026-10-22: "one click here showing wht this type is / two clicks
 * redirect you as now". The hero chips (SystemsOverviewHero) carry an icon and
 * a number and NO text at all, so a viewer who does not already know the
 * taxonomy has nothing to read. These sentences are what the first tap shows.
 *
 * WHERE THE WORDS COME FROM, because they are not a product claim and must not
 * grow into one. Figma has no explainer anywhere near these chips — 199414:130115
 * holds the wave, the numeral, the three icon+number frames and the health card,
 * and nothing else, hidden layers included — and the sandbox PRDs never define
 * the three types either ("System type" there is Tenant vs Standard, a different
 * axis). So every clause below is traceable to something this repo already
 * knows, and nothing else:
 *   flow      systemType.js' own header: every record in mrg-snapshot.json
 *             carries a water meter (EMAG / Impeller / Ultrasonic / clamp-on).
 *             "most also carry a valve" is systemFilters.js' note that
 *             buildTree.js records 20 of the 53 MRG systems as metering-only
 *             and genuinely valveless — i.e. the other 33 have one.
 *   flood     the name, plus the fact that the dataset carries no flood device
 *             and therefore no behaviour to describe. It is stated as what it
 *             is NOT measuring, which is the honest limit of what is known.
 *   humidity  the same.
 * If the owner has real copy for the two sensor types, it replaces these two
 * strings and nothing else moves.
 */
export const SYSTEM_TYPE_BLURB = {
  [SYSTEM_TYPE.FLOW]:
    'A metered water line. The meter reads flow, and most of these also carry a valve that can shut the line off.',
  [SYSTEM_TYPE.FLOOD]:
    'A spot sensor that reports water reaching somewhere it should not. It measures no flow.',
  [SYSTEM_TYPE.HUMIDITY]:
    'A spot sensor that reports how damp its own spot is. It measures no flow.',
}

export function systemTypeOf(system) {
  const declared = system?.systemType
  if (declared && SYSTEM_TYPE_LABEL[declared]) return declared
  return SYSTEM_TYPE.FLOW
}
