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

export function systemTypeOf(system) {
  const declared = system?.systemType
  if (declared && SYSTEM_TYPE_LABEL[declared]) return declared
  return SYSTEM_TYPE.FLOW
}
