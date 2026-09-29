/**
 * The system-type glyph — Flow Monitoring / Flood Sensor / Humidity Sensor.
 *
 * These are the same three glyphs SystemsHealthCard draws on its "Systems
 * types" chips (198601:62957), so the two surfaces cannot drift apart: whatever
 * Topology / Flood / Humidity look like there, they look like here.
 */
import { BrandDrops, FloodLine, PhotoSensor3 } from '@/v2/icons'
import { SYSTEM_TYPE, SYSTEM_TYPE_LABEL, systemTypeOf } from '@/data/systemType'

export default function SystemTypeIcon({ system, type, size = 16, className }) {
  const kind = type ?? systemTypeOf(system)
  const title = SYSTEM_TYPE_LABEL[kind] ?? SYSTEM_TYPE_LABEL[SYSTEM_TYPE.FLOW]

  const Glyph =
    kind === SYSTEM_TYPE.FLOOD
      ? FloodLine
      : kind === SYSTEM_TYPE.HUMIDITY
        ? BrandDrops
        : PhotoSensor3

  /* role="img" + a title: the type is the only thing distinguishing two rows
     with the same name, so it has to reach a screen reader rather than being
     decoration. */
  return (
    <span role="img" aria-label={title} className={className}>
      <Glyph size={size} />
    </span>
  )
}
