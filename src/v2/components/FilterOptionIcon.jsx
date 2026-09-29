/**
 * The glyph beside a filter option.
 *
 * Every category gets one, not just System Type — a list of bare labels is
 * what "still no icons" was about.
 *
 * PROVENANCE, because these are deliberately NOT new drawings:
 *   valve        ValveStatus, the project's own Figma-exported valve glyph,
 *                which already speaks open / closed / error / no-valve. The
 *                filter's four values are exactly its four states.
 *   system type  SystemTypeIcon — the same three glyphs the health card draws
 *                on its "Systems types" chips.
 *   attention    Warning, the Figma glyph already used for a system in trouble.
 *   water events Waves, which carries Wint's leak meaning across the app.
 *   the rest     Lucide, which the icons index already names as the set to
 *                reach for when it has the glyph (wifi, power, battery, plug).
 *
 * Everything is tinted by the surrounding text colour, so the sheet decides
 * emphasis and this file only decides shape.
 */
import { Battery, CircleCheck, Plug, PowerOff, Wifi, WifiOff } from 'lucide-react'
import { PinLocation03, Warning, Waves } from '@/v2/icons'
import ValveStatus from '@/v2/components/ValveStatus'
import SystemTypeIcon from '@/v2/components/SystemTypeIcon'

/* systemFilters.js spells "no value here" as this sentinel. It is imported as
   a literal rather than exported from there because that module is the filter
   MODEL and this is presentation — the two agreeing on one string is cheaper
   than a cross-import that only carries a constant. */
const NONE = '__none__'

/** ValveStatus' state names, keyed by the filter's values. */
const VALVE_STATE = {
  open: 'open',
  closed: 'closed',
  error: 'error',
  [NONE]: 'no-valve',
}

export default function FilterOptionIcon({ categoryId, value, size = 16, className }) {
  const props = { size, className }

  switch (categoryId) {
    case 'location':
      return <PinLocation03 {...props} />

    case 'attention':
      return value === 'attention' ? <Warning {...props} /> : <CircleCheck {...props} />

    case 'type':
      return <SystemTypeIcon type={value} size={size} className={className} />

    case 'connectivity':
      return value === 'offline' ? <WifiOff {...props} /> : <Wifi {...props} />

    case 'valve':
      return <ValveStatus state={VALVE_STATE[value] ?? 'open'} size={size} className={className} />

    case 'power':
      if (value === 'ac-lost') return <PowerOff {...props} />
      if (value === 'battery') return <Battery {...props} />
      if (value === NONE) return <PowerOff {...props} />
      return <Plug {...props} />

    case 'event':
      if (value === 'leak-high' || value === 'leak-low') return <Waves {...props} />
      if (value === 'offline') return <WifiOff {...props} />
      if (value === 'valve-error')
        return <ValveStatus state="error" size={size} className={className} />
      if (value === 'power-lost') return <PowerOff {...props} />
      // No active event is the good case, and reads as one.
      return <CircleCheck {...props} />

    default:
      return null
  }
}
