// Figma-exported glyphs with no Lucide equivalent, recoloured to currentColor.
//
// The design draws on five icon sets (Huge, Phosphor, Tabler, Remix, Lucide).
// Rather than take four dependencies for ~17 glyphs, the non-Lucide ones are
// exported here as project-owned SVG components. `waves` and the droplet family
// carry Wint's domain meaning (flow, high/low, leak) and are worth owning.
//
// Lucide still covers everything it already has — power-off, bell-dot, x,
// chevrons-up-down, star. Import those from lucide-react as usual.
//
// Every component takes `size` (default 24) and `className`; colour comes from
// the surrounding text colour, so tint with text-* utilities.

// ── Home / overlay ─────────────────────────────────────────────────────────
export { default as Menu10 } from './Menu10'
export { default as CustomerSupport } from './CustomerSupport'
export { default as Smile } from './Smile'
export { default as Waves } from './Waves'
export { default as WifiDisconnected02 } from './WifiDisconnected02'
export { default as MessageBlocked } from './MessageBlocked'
export { default as DropletDown } from './DropletDown'
export { default as Droplets } from './Droplets'
export { default as DropletShare } from './DropletShare'
export { default as CloseFill } from './CloseFill'
export { default as Warning } from './Warning'
export { default as Funnel } from './Funnel'

// ── Side menu (Figma 198378:73797) ─────────────────────────────────────────
// These four are what the frame actually specifies. The first build guessed
// Lucide lookalikes (Briefcase, MapPin, Search, ChevronDown) because the design
// context came back as sparse metadata; these are the real glyphs.
export { default as Briefcase08 } from './Briefcase08'
export { default as PinLocation03 } from './PinLocation03'
export { default as Search01 } from './Search01'
export { default as ArrowDropDownLine } from './ArrowDropDownLine'
export { default as CaretDown } from './CaretDown'
export { default as ArrowsInLineVertical } from './ArrowsInLineVertical'
export { default as FunnelSimple } from './FunnelSimple'
