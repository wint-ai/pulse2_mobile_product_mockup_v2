/**
 * EventOverlay — the full-surface "see everything" sheet (v2 mobile).
 *
 * Design source: Figma nodes
 *   198328:89886  Overlay_Water events       (dataset=water,  scope=account)
 *   198328:90116  Overlay_Alerts             (dataset=alerts, scope=account)
 *   198328:89685  water events, LOCATION     (dataset=water,  scope=location)
 *   198328:90254  alerts, LOCATION           (dataset=alerts, scope=location)
 *   198378:73254  Overlay_Alerts_history     (tab=history)
 *
 * Those five frames are 2 datasets x 2 scopes x 2 tabs of ONE surface, so this
 * is one component. `dataset` picks the type family (and therefore the chips),
 * `scope` decides whether a row carries its system name + address, `tab` picks
 * active vs. resolved.
 *
 * Known bug in the design, deliberately NOT reproduced: frame 198328:90254 is
 * titled "Active Alerts" but shows the water chips (High Flow / Low Flow). The
 * chips here come off `dataset`, so the alerts scope gets alert chips.
 */

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbSeparator, BreadcrumbEllipsis, BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { CloseFill, Waves, Warning, Funnel } from '@/v2/icons'

// ── Wint tokens (sampled off the Figma variables on these frames) ───────────
const SLATE_900  = '#0F172B'
const SLATE_800  = '#1D293D'
const SLATE_600  = '#45556C'
const SLATE_500  = '#62748E'
const SLATE_400  = '#90A1B9'
const SLATE_200  = '#E2E8F0'
const RED_600    = '#E7000B'
const RED_500    = '#FB2C36'
const RED_100    = '#FFE2E2'
const ORANGE_600 = '#F54900'
const ORANGE_100 = '#FFEDD4'
const CARD_BG    = '#FAFBFC'

// The overlay's own ground: a cool diagonal wash over white.
const SHEET_BG =
  'linear-gradient(131deg, rgba(233,238,248,0.8) 8%, rgba(227,235,249,0.8) 32%,' +
  ' rgba(228,235,250,0.8) 41%, rgba(212,226,255,0.8) 71%, rgba(233,237,243,0.8) 83%), #FFFFFF'

// ── Event type table ───────────────────────────────────────────────────────
// `type` strings match src/data/events.js so a real CURRENT_EVENTS slice can be
// passed straight in. Labels are the shorter ones the overlay frames use
// ("High Flow", not "High Flow Water Event").
//
// Icons follow the brief: Waves for the flow family, Warning for the alert
// family. The Figma rows draw a plug glyph for AC Unplugged and a valve glyph
// for Valve error; neither is in src/v2/icons and neither is worth a new
// dependency, so the alert family shares Warning.
const TYPES = {
  'leak-high':   { dataset: 'water',  label: 'High Flow',    Icon: Waves,   fg: RED_600,    bg: RED_100 },
  'leak-low':    { dataset: 'water',  label: 'Low Flow',     Icon: Waves,   fg: ORANGE_600, bg: ORANGE_100 },
  'power-lost':  { dataset: 'alerts', label: 'AC Unplugged', Icon: Warning, fg: RED_600,    bg: RED_100 },
  'valve-error': { dataset: 'alerts', label: 'Valve error',  Icon: Warning, fg: RED_600,    bg: RED_100 },
}

// Chip order per dataset — fixed, so a chip that currently matches nothing
// still renders and honestly reads 0.
const CHIP_ORDER = {
  water:  ['leak-high', 'leak-low'],
  alerts: ['power-lost', 'valve-error'],
}

const NOUN = {
  water:  { active: 'Active water events', history: 'Past water events' },
  alerts: { active: 'Active Alerts',       history: 'Past Alerts' },
}

// ── MOCK DATA ──────────────────────────────────────────────────────────────
// Stand-in for the `events` prop so the overlay renders standalone. Shaped
// after src/data/events.js (type / systemName / timestamp / durationSec /
// resolved) and named after real systems in src/data/systems.js, with the
// city + street split the overlay rows need. Replace by passing `events`.
const MOCK_EVENTS = [
  // water · active
  { id: 'e1',  type: 'leak-high', systemName: 'Cooling Tower #1',  city: 'Manchester',    address: '1775 Washington St, Hanover MA 2339', timestamp: '2026-04-02T08:13:15', durationSec: 23760, resolved: false },
  { id: 'e2',  type: 'leak-high', systemName: 'Cooling Tower T2',  city: 'Heathrow',      address: '333 Main Street, Tewksbury MA 1876',  timestamp: '2026-04-02T08:13:15', durationSec: 23760, resolved: false },
  { id: 'e3',  type: 'leak-high', systemName: 'Server Hall Cooling', city: 'Amsterdam',   address: '700 Oak Street, Brockton MA 2301',    timestamp: '2026-04-02T07:41:02', durationSec: 21600, resolved: false },
  { id: 'e4',  type: 'leak-low',  systemName: 'Sump Pump B1',      city: 'Manchester',    address: '301 Falls Blvd, Quincy MA 2169',      timestamp: '2026-04-02T08:18:44', durationSec: 3840,  resolved: false },
  { id: 'e5',  type: 'leak-low',  systemName: 'Main Supply CW',    city: 'London',        address: '25 Canada Square, Canary Wharf',      timestamp: '2026-04-02T06:02:10', durationSec: 9180,  resolved: false },
  { id: 'e6',  type: 'leak-low',  systemName: 'DCW Floors 1–18',   city: 'Manchester',    address: '1775 Washington St, Hanover MA 2339', timestamp: '2026-04-01T22:55:00', durationSec: 40320, resolved: false },
  // water · history
  { id: 'e7',  type: 'leak-high', systemName: 'Fire Riser 2',      city: 'San Francisco', address: '1775 Washington St, Hanover MA 2339', timestamp: '2026-03-28T04:12:09', durationSec: 5400,  resolved: true },
  { id: 'e8',  type: 'leak-low',  systemName: '360 Magnolia Row',  city: 'Los Angeles',   address: '333 Main Street, Tewksbury MA 1876',  timestamp: '2026-03-26T11:30:41', durationSec: 2700,  resolved: true },

  // alerts · active
  { id: 'a1',  type: 'power-lost',  systemName: 'Main Supply HQ',    city: 'Liverpool',   address: '12 Dock Road, Liverpool L3 4BQ',      timestamp: '2026-04-02T08:13:15', durationSec: 23760, resolved: false },
  { id: 'a2',  type: 'power-lost',  systemName: '751 Poplar Court',  city: 'Los Angeles', address: '700 Oak Street, Brockton MA 2301',    timestamp: '2026-04-02T05:47:31', durationSec: 32400, resolved: false },
  { id: 'a3',  type: 'valve-error', systemName: 'Cooling Tower #2',  city: 'Manchester',  address: '1775 Washington St, Hanover MA 2339', timestamp: '2026-04-02T08:35:00', durationSec: 2820,  resolved: false },
  // alerts · history
  { id: 'a4',  type: 'valve-error', systemName: 'DHW Ground Floor',  city: 'Liverpool',   address: '12 Dock Road, Liverpool L3 4BQ',      timestamp: '2026-03-30T03:49:12', durationSec: 19980, resolved: true },
  { id: 'a5',  type: 'power-lost',  systemName: 'Fire Riser 2',      city: 'San Francisco', address: '1775 Washington St, Hanover MA 2339', timestamp: '2026-03-29T14:02:55', durationSec: 7200, resolved: true },
]

// ── Formatting ─────────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n) => String(n).padStart(2, '0')

// Events may arrive already display-formatted (the v1 data carries both), so a
// non-ISO string passes through untouched rather than rendering "Invalid Date".
function formatStamp(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return `${MONTHS[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatDuration(ev) {
  if (ev.duration) return ev.duration
  if (ev.durationSec == null) return ''
  const h = Math.floor(ev.durationSec / 3600)
  const m = Math.round((ev.durationSec % 3600) / 60)
  return h ? `${h}h ${m}m` : `${m}m`
}

// ── Overlay ────────────────────────────────────────────────────────────────
export default function EventOverlay({
  open = true,
  onClose,
  dataset = 'water',
  scope = 'account',
  scopeName = 'Building A',
  events = MOCK_EVENTS,
}) {
  const [tab, setTab] = useState('active')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const family = CHIP_ORDER[dataset] ? dataset : 'water'

  // A water chip must not survive a switch to the alerts dataset — it would
  // match nothing and read as an empty list rather than a stale filter. Derived
  // rather than reset in an effect so the wrong list never renders even once.
  const activeFilter = TYPES[filter]?.dataset === family ? filter : 'all'

  const inDataset = events.filter((e) => TYPES[e.type]?.dataset === family)
  const inTab = inDataset.filter((e) => (tab === 'history' ? !!e.resolved : !e.resolved))
  const visible = activeFilter === 'all' ? inTab : inTab.filter((e) => e.type === activeFilter)

  const title = `${inTab.length} ${NOUN[family][tab]}`
  const isLocation = scope === 'location'

  return (
    <div className="absolute inset-0 z-40" role="dialog" aria-modal="true" aria-label={title}>
      {/* Scrim. The Figma frame is full-bleed and leaves no tap target outside
          the sheet, so the sheet is dropped 12px to keep "tap outside to
          dismiss" reachable alongside the X and Escape. */}
      <div className="absolute inset-0 bg-[rgba(15,23,43,0.35)]" onClick={onClose} />

      <div
        className="absolute inset-x-0 bottom-0 top-3 rounded-t-[26px] overflow-hidden flex flex-col"
        style={{ background: SHEET_BG }}
      >
        {/* Header — breadcrumb only in location scope; account scope implies it */}
        <div className="shrink-0 flex items-center gap-2 px-[18px] pt-3 pb-1">
          {isLocation && (
            <Breadcrumb className="min-w-0 flex-1">
              <BreadcrumbList className="gap-1.5 sm:gap-1.5 flex-nowrap text-sm" style={{ color: SLATE_500 }}>
                {/* Crumbs are inert: this overlay has no navigation prop, and a
                    link that silently does nothing is worse than plain text. */}
                <BreadcrumbItem><span>Home</span></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbEllipsis className="size-4" /></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="truncate" style={{ color: SLATE_800 }}>{scopeName}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto shrink-0 p-1 -mr-1 rounded-md"
            style={{ color: SLATE_900 }}
          >
            <CloseFill size={26} />
          </button>
        </div>

        {/* Title + controls — fixed chrome, outside the scroller */}
        <div className="shrink-0 px-[18px] pt-2 flex flex-col gap-[18px]">
          <div className="flex items-center gap-2">
            {/* Same construction as the Home water-events dot; resolved events
                aren't ongoing, so History shows it static and grey. */}
            <PulseDot
              size={27}
              color={tab === 'history' ? SLATE_400 : RED_500}
              tint={tab === 'history' ? 'rgba(144,161,185,0.18)' : 'rgba(251,44,54,0.14)'}
              pulse={tab === 'active'}
            />
            <h2 className="text-2xl font-medium tracking-[-0.6px] leading-8" style={{ color: SLATE_800 }}>
              {title}
            </h2>
          </div>

          {/* Active / History — a ToggleGroup in the design, not Tabs */}
          <ToggleGroup
            type="single"
            value={tab}
            // Radix single-select emits '' when the pressed item is re-pressed;
            // this switch has no "neither" state.
            onValueChange={(v) => { if (v) setTab(v) }}
            className="w-full rounded-[26px] overflow-hidden"
          >
            <ToggleGroupItem
              value="active"
              aria-label="Active events"
              className="flex-1 h-9 min-h-9 text-sm font-medium border border-[#E2E8F0] bg-[#F1F5F9] text-[#1D293D] hover:bg-[#E9EEF5] hover:text-[#1D293D] data-[state=on]:bg-[#DBEAFE] data-[state=on]:text-[#0B81F8] data-[state=on]:hover:bg-[#DBEAFE]"
            >
              Active
            </ToggleGroupItem>
            <ToggleGroupItem
              value="history"
              aria-label="Past events"
              className="flex-1 h-9 min-h-9 text-sm font-medium border-y border-r border-[#E2E8F0] bg-[#F1F5F9] text-[#1D293D] hover:bg-[#E9EEF5] hover:text-[#1D293D] data-[state=on]:bg-[#DBEAFE] data-[state=on]:text-[#0B81F8] data-[state=on]:hover:bg-[#DBEAFE]"
            >
              History
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Filter chips — this row is the only thing allowed to scroll
              sideways; the bleed keeps chips running under the sheet edge. */}
          <div className="-mx-[18px] px-[18px] overflow-x-auto [&::-webkit-scrollbar]:h-0">
            <div className="flex items-center gap-[3px] w-max pr-[18px]">
              <FilterChip
                selected={activeFilter === 'all'}
                onClick={() => setFilter('all')}
                label="All"
                count={inTab.length}
              />
              {CHIP_ORDER[family].map((type) => {
                const t = TYPES[type]
                return (
                  <FilterChip
                    key={type}
                    selected={activeFilter === type}
                    onClick={() => setFilter(type)}
                    label={t.label}
                    count={inTab.filter((e) => e.type === type).length}
                    Icon={t.Icon}
                    fg={t.fg}
                    bg={t.bg}
                  />
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-sm" style={{ color: SLATE_500 }}>
            <Funnel size={16} className="shrink-0" />
            {/* M is every event in this dataset, both tabs — the denominator
                the design's "Showing 8 of 62" implies. */}
            <span>Showing {visible.length} of {inDataset.length}</span>
          </div>
        </div>

        {/* The list owns the scroll — Phone.jsx never does */}
        <div className="px-[18px] pt-[14px] pb-5" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <Card className="rounded-[18px] border-white py-0 gap-0 px-4 shadow-[0_1px_2px_rgba(20,21,26,0.04)]" style={{ background: CARD_BG }}>
            {visible.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: SLATE_500 }}>
                No {tab === 'history' ? 'past' : 'active'} {family === 'water' ? 'water events' : 'alerts'} match this filter.
              </div>
            ) : (
              visible.map((ev, i) => (
                <EventRow key={ev.id ?? i} ev={ev} isLocation={isLocation} divider={i > 0} />
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

// Tinted disc + ping + solid core, same proportions as HomeAccountOverview's
// water-events dot (32 / 12 / 10).
function PulseDot({ size = 27, color = RED_500, tint = 'rgba(251,44,54,0.14)', pulse = true }) {
  const core = size * 0.3125
  const halo = size * 0.375
  return (
    <span
      className="shrink-0 rounded-full flex items-center justify-center relative"
      style={{ width: size, height: size, background: tint }}
    >
      {pulse && (
        <span
          className="rounded-full absolute animate-ping"
          style={{ width: halo, height: halo, background: color, opacity: 0.6 }}
        />
      )}
      <span className="rounded-full relative z-10" style={{ width: core, height: core, background: color }} />
    </span>
  )
}

function FilterChip({ selected, onClick, label, count, Icon, fg, bg }) {
  const ink = selected ? SLATE_800 : SLATE_600
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="shrink-0 h-9 flex items-center gap-[9px] rounded-full pl-[5px] pr-[11px] transition-colors"
      style={{ background: CARD_BG, border: `1px solid ${selected ? SLATE_600 : SLATE_200}` }}
    >
      <span className="flex items-center gap-1.5">
        {Icon ? (
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: bg, color: fg }}
          >
            <Icon size={13} />
          </span>
        ) : (
          // The "All" chip reuses the title dot, but static — two ping
          // animations on one screen reads as a glitch.
          <PulseDot size={24} pulse={false} />
        )}
        <span className="text-sm font-medium whitespace-nowrap" style={{ color: ink }}>{label}</span>
      </span>
      <span className="text-base font-bold tracking-[-0.4px]" style={{ color: ink }}>{count}</span>
    </button>
  )
}

function EventRow({ ev, isLocation, divider }) {
  const t = TYPES[ev.type] ?? { label: ev.type, Icon: Warning, fg: RED_600, bg: RED_100 }
  const { Icon } = t
  const meta = (
    <div className="flex items-center gap-[13px] text-xs">
      <span style={{ color: SLATE_500 }}>{formatStamp(ev.timestamp)}</span>
      <span style={{ color: SLATE_900 }}>{formatDuration(ev)}</span>
    </div>
  )

  // Rows are deliberately inert: the overlay's contract has no event-detail
  // callback, and the design gives the row no affordance (no chevron).
  return (
    <div
      className="flex items-center gap-[17px] py-4"
      style={divider ? { borderTop: `1px solid ${SLATE_200}` } : undefined}
    >
      <div className="shrink-0 flex flex-col items-center gap-[5px]">
        <span
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: t.bg, color: t.fg }}
        >
          <Icon size={21} />
        </span>
        {/* Account rows stack the severity under the disc so the name can own
            the first line; location rows have no name, so it moves up. */}
        {!isLocation && (
          <span className="text-xs font-medium whitespace-nowrap" style={{ color: t.fg }}>{t.label}</span>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-[7px]">
        {isLocation ? (
          <span className="text-sm font-medium" style={{ color: t.fg }}>{t.label}</span>
        ) : (
          <>
            <span className="text-sm font-semibold truncate" style={{ color: '#0A0A0A' }}>{ev.systemName}</span>
            <div className="flex items-center gap-[5px] text-xs" style={{ color: SLATE_500 }}>
              <span className="shrink-0">{ev.city}</span>
              <span className="w-px h-3 shrink-0" style={{ background: SLATE_200 }} />
              <span className="flex-1 min-w-0 truncate">{ev.address}</span>
            </div>
          </>
        )}
        {meta}
      </div>
    </div>
  )
}
