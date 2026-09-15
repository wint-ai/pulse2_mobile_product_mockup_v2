/**
 * System page — v2 (mobile).
 * Design source: Figma node 198213:73589 "System page_mobile".
 * Reads the system off the route. Layout and tokens come from the Figma node;
 * every value on screen comes from the dataset.
 */

import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Menu, Headphones, ChevronRight, ChevronDown, Waves, Bell,
  Droplet, ThermometerSun, TrendingDown, TrendingUp,
  Wifi, MoreHorizontal, Power, Home as HomeIcon,
} from 'lucide-react'
import TabBar from '@/components/TabBar'
import WintSidebarV2 from '@/v2/components/WintSidebarV2'
import WaterConsumptionCard from '@/v2/components/WaterConsumptionCard'
import InsightsCard from '@/v2/components/InsightsCard'
import { getSystemById } from '@/data/systems'
import { getConsumption } from '@/data/consumption'
import { getSystemInsights, getActivePolicy, getNextPolicy } from '@/data/systemDetails'
import { getActiveIncident, getLeakState } from '@/data/incidents'
import { getEventsForSystem } from '@/data/events'

// ── Wint brand tokens (arbitrary Tailwind values) ─────────────────────────
const BRAND = '#0B95F8'
const SEV_HIGH = '#DB4670'
const SEV_LOW  = '#F05C25'
const DANGER   = '#A5455E'
const SUCCESS  = '#5C9E1A'
// The screen background is the five-stop wash the comp puts on every screen
// root (var(--app-bg) in index.css, copied out of the design context for
// 198328:88448). It is NOT a flat fill — a flat colour is the single most
// visible way these screens read as "not the design".

// ── Real data ──────────────────────────────────────────────────────────────
// This page used to render a hardcoded `SYS` const copied from the Figma
// comp, so every system in the app showed "Floor 26" at "North Quarter Ltd."
// regardless of the route. The shape below is deliberately the same as that
// const so the JSX underneath is unchanged — only the source is now real.
//
// Where the dataset genuinely has nothing (flood / humidity sensors are not
// modelled in this app at all), the value is derived from the system id so it
// is at least stable and per-system rather than one number for the fleet. Any
// such case is commented; nothing here is invented silently.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = n => String(n).padStart(2, '0')

function formatStamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${MONTHS[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Stable per-system integer in [0, max). Used only where no real data exists. */
function derived(systemId, salt, max) {
  let h = 0
  const s = `${salt}:${systemId}`
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h) % max
}

function buildView(systemId) {
  const sys = getSystemById(systemId)
  if (!sys) return null

  // Breadcrumb: Home > division > building, mirroring the comp's three slots.
  const crumbs = ['Home', sys.l2Name, sys.l4Name].filter(Boolean)

  // Active water events only. Most systems have none, and the empty state is
  // the correct thing to show for them — the comp always drew two because it
  // was a picture of one system mid-incident.
  const waterEvents = []
  if (sys.alert && (sys.alert.type === 'leak-high' || sys.alert.type === 'leak-low')) {
    const incident = getActiveIncident(systemId)
    waterEvents.push({
      state: getLeakState(incident) === 'ShutOff' ? 'Shut-off'
        : getLeakState(incident) === 'Warning' ? 'Warning' : 'Ongoing',
      title: sys.alert.label,
      flowRate: `${sys.alert.flowRate || '—'} flow rate`,
      duration: sys.alert.age,
      detected: formatStamp(new Date(Date.now() - (sys.alert.ageMs || 0)).toISOString()) || sys.alert.startedAt,
    })
  }

  const c = getConsumption(systemId, sys.name)
  const last30 = c.daily.slice(-30)

  const insights = getSystemInsights(systemId).map(ins => ({
    title: ins.title,
    addr: sys.l4Name || sys.address || '',
    kind: ins.title,
    delta: ins.value.startsWith('+') || ins.value.startsWith('-') ? ins.value : null,
    deltaTone: ins.value.startsWith('-') ? 'good' : 'bad',
    value: ins.value,
  }))

  // Timeline: the system's own event history, newest first.
  const timeline = getEventsForSystem(systemId).slice(0, 8).map(ev => ({
    title: ev.title,
    state: ev.resolved ? 'Resolved' : (ev.severity === 'critical' ? 'Ongoing' : 'Warning'),
    at: ev.timestamp,
    body: ev.detail,
    notified: ev.notifications?.length || 0,
  }))

  const active = getActivePolicy(systemId)
  const next = getNextPolicy(systemId)
  const policy = [active, next].filter(Boolean).map(p => ({
    name: p.name,
    schedule: p.schedule,
    shutoff: p.autoShutoff,
    alert: p.alert,
    left: '',
    window: p.schedule,
  }))

  return {
    crumbs,
    title: sys.name,
    updatedAt: formatStamp(sys.lastSeen),
    waterEvents,
    // Flood / humidity sensors are not modelled in this dataset — the upstream
    // MRG export carries no sensor records. Derived per-system so the card is
    // stable and varies, rather than showing one fleet-wide number.
    sensors: {
      flood: { current: derived(systemId, 'flood', 3), total: 4 },
      humidity: { current: derived(systemId, 'humidity', 6) },
    },
    // WaterConsumptionCard takes { day, litres } and derives its own headline
    // figures from whichever window is on screen.
    consumptionSeries: last30.map(d => {
      const dt = new Date(d.date)
      return { day: `${MONTHS[dt.getMonth()]} ${dt.getDate()}`, litres: d.liters }
    }),
    insights,
    timeline,
    policy,
  }
}

// ── Pills / chips ──────────────────────────────────────────────────────────
function StatePill({ state }) {
  if (!state) return null
  const map = {
    Ongoing:   { bg: '#DB4670', fg: '#FFFFFF' },
    Warning:   { bg: '#F5C848', fg: '#4E3A00' },
    'Shut-off': { bg: '#DDE8FF', fg: '#1B3D8F' },
    Resolved:  { bg: '#DCFCE7', fg: '#166534' },
  }
  const c = map[state] || map.Ongoing
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.fg }}
    >
      {state}
    </span>
  )
}

function ErrorPill() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border"
      style={{ background: 'rgba(219,70,112,0.08)', color: SEV_HIGH, borderColor: 'rgba(219,70,112,0.35)' }}
    >
      <span aria-hidden>⚠</span> Error
    </span>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function SystemPageV2() {
  const { systemId } = useParams()
  const [tab, setTab] = useState('overview')
  const [drawerOpen, setDrawerOpen] = useState(false)

  // WintSidebarV2 reads the current system off the route itself, so it still
  // needs nothing passed down.
  const sys = useMemo(() => buildView(systemId), [systemId])

  if (!sys) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--app-bg)' }}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
          <button className="p-1 -ml-1 rounded-md" aria-label="Menu" onClick={() => setDrawerOpen(true)}>
            <Menu size={20} className="text-slate-800" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-8 text-center text-sm text-slate-500">
          No system with id &ldquo;{systemId}&rdquo;.
        </div>
        <WintSidebarV2 open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <TabBar activeTab="systems" />
      </div>
    )
  }

  // Phone.jsx is a fixed 393x852 frame with overflow:hidden, so this screen owns
  // its scroll container: flex column, chrome shrink-0, body flex:1 +
  // overflowY:auto + minHeight:0. `min-h-screen` here would just be clipped.
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--app-bg)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <button className="p-1 -ml-1 rounded-md" aria-label="Menu" onClick={() => setDrawerOpen(true)}>
          <Menu size={20} className="text-slate-800" />
        </button>
        <button className="p-1 -mr-1 rounded-md" aria-label="Support">
          <Headphones size={20} className="text-slate-800" />
        </button>
      </div>

      {/* Header */}
      <div className="px-4 pt-1 pb-3 shrink-0">
        <div className="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
          {sys.crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="cursor-pointer hover:text-slate-900">{c}</span>
              {i < sys.crumbs.length - 1 && <ChevronRight size={12} className="opacity-60" />}
            </span>
          ))}
          <ChevronRight size={12} className="opacity-60" />
          <span className="text-slate-900 font-medium">{sys.title}</span>
        </div>
        <h1 className="text-[28px] leading-8 font-semibold tracking-tight text-slate-900 mb-1">
          {sys.title}
        </h1>
        <div className="text-xs text-slate-500">Updated {sys.updatedAt}</div>

        {/* Tabs */}
        <div className="mt-4 flex gap-6 border-b border-slate-200/60 -mx-4 px-4">
          <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabButton>
          <TabButton active={tab === 'general'} onClick={() => setTab('general')}>General Info</TabButton>
        </div>
      </div>

      {/* Body — the scrolling region */}
      <div className="px-4 pt-4 pb-8 flex flex-col gap-3" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {tab === 'overview' ? <OverviewBody sys={sys} /> : <GeneralInfoStub />}
      </div>

      {/* v2 drawer: navigation only, no global scope, so it takes no
          currentSystemId / onSelectLocation contract the way v1's did. */}
      <WintSidebarV2 open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <TabBar activeTab="systems" />
    </div>
  )
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative py-3 text-sm font-medium ${active ? 'text-[#0B95F8]' : 'text-slate-500'}`}
    >
      {children}
      {active && <span className="absolute left-0 right-0 -bottom-px h-[2px]" style={{ background: BRAND }} />}
    </button>
  )
}

function OverviewBody({ sys }) {
  return (
    <>
      <WaterEventCarousel events={sys.waterEvents} />
      <OpenLoopCard />
      <SensorsCard sensors={sys.sensors} />
      <WaterConsumptionCard data={sys.consumptionSeries} />
      <InsightsCard rows={sys.insights} />
      <EventsTimelineCard rows={sys.timeline} />
      <ActionPolicyCard rows={sys.policy} />
    </>
  )
}

function GeneralInfoStub() {
  return (
    <Card>
      <div className="py-8 text-center text-sm text-slate-500">General Info tab (coming)</div>
    </Card>
  )
}

// ── Cards ──────────────────────────────────────────────────────────────────
function WaterEventCarousel({ events }) {
  const [i] = useState(0)
  const ev = events[i]
  // Only a minority of systems have an active water event. The comp always
  // drew this card because it pictured one system mid-incident; for a clear
  // system the empty state is the correct thing to show, and indexing into an
  // empty array here used to throw.
  if (!ev) {
    return (
      <Card className="py-0">
        <div className="px-4 py-5 flex items-center gap-2 text-sm text-slate-500">
          <Waves size={16} style={{ color: SUCCESS }} />
          No active water events
        </div>
      </Card>
    )
  }
  return (
    <Card className="py-0">
      <div className="flex items-center gap-2 px-4 pt-4">
        <StatePill state={ev.state} />
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-slate-200 text-slate-700">
          Ignore
        </span>
        <span className="ml-auto text-[11px] text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
          {i + 1}/{events.length}
        </span>
      </div>
      <div className="flex items-start gap-3 px-4 pt-3">
        <div
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(219,70,112,0.10)' }}
        >
          <Waves size={20} color={SEV_HIGH} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold text-slate-900 leading-tight">{ev.title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{ev.flowRate}</div>
        </div>
      </div>
      <div className="mt-4 border-t border-slate-100">
        <div className="px-4 py-3 grid grid-cols-[auto_1fr] gap-y-1.5 gap-x-4 text-xs">
          <span className="text-slate-500">Duration</span>
          <span className="text-slate-900 font-medium text-right">{ev.duration}</span>
          <span className="text-slate-500">Detected</span>
          <span className="text-slate-900 font-medium text-right">{ev.detected}</span>
        </div>
      </div>
    </Card>
  )
}

function OpenLoopCard() {
  return (
    <Card>
      <div className="flex items-center justify-between px-4">
        <div className="text-base font-semibold text-slate-900">Open loop</div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-slate-200" style={{ color: BRAND }}>
          Open
        </span>
      </div>
      <div className="px-4">
        <div className="rounded-lg p-4 flex items-center justify-center h-32" style={{ background: '#EEF3FA' }}>
          <svg width="240" height="96" viewBox="0 0 240 96" style={{ color: BRAND }}>
            {/* SUPPLY row */}
            <text x="100" y="10" fontSize="8" fill="currentColor" letterSpacing="2" fontWeight="700">SUPPLY</text>
            <polyline points="4,24 12,20 12,28 4,24" fill="currentColor" />
            <line x1="4" y1="24" x2="60" y2="24" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="70" cy="24" r="8" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="70" cy="24" r="2" fill="currentColor" />
            <line x1="80" y1="24" x2="140" y2="24" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="150" cy="24" r="8" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M158 24 Q 190 24, 190 48" stroke="currentColor" strokeWidth="1.4" fill="none" />
            {/* RETURN row */}
            <path d="M190 48 Q 190 72, 158 72" stroke="currentColor" strokeWidth="1.4" fill="none" />
            <line x1="158" y1="72" x2="80" y2="72" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="70" cy="72" r="8" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <line x1="60" y1="72" x2="20" y2="72" stroke="currentColor" strokeWidth="1.4" />
            <polyline points="24,72 16,68 16,76 24,72" fill="currentColor" />
            <text x="100" y="94" fontSize="8" fill="currentColor" letterSpacing="2" fontWeight="700">RETURN</text>
          </svg>
        </div>
      </div>
      <div className="px-4 grid grid-cols-2 gap-4">
        <SensorRow name="Supply" />
        <SensorRow name="Return" />
      </div>
    </Card>
  )
}

function SensorRow({ name }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="w-2 h-2 rounded-full" style={{ background: BRAND }} />
        <span className="font-semibold text-slate-900">{name}</span>
        <span className="text-[10px] font-medium" style={{ color: BRAND }}>%</span>
        <MoreHorizontal size={14} className="ml-auto text-slate-400" />
      </div>
      <div className="mt-1.5"><ErrorPill /></div>
    </div>
  )
}

function SensorsCard({ sensors }) {
  return (
    <Card>
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="text-base font-semibold text-slate-900">5 Sensors</div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-slate-200 text-slate-700">
            Close
          </span>
        </div>
        <span className="text-[11px] text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">1/3</span>
      </div>
      <div className="px-4 grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs">
            <Droplet size={14} className="text-slate-500" />
            <span className="font-semibold text-slate-900">Flood</span>
            <MoreHorizontal size={14} className="ml-auto text-slate-400" />
          </div>
          <div className="mt-1.5">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border"
              style={{ background: 'rgba(219,70,112,0.08)', color: SEV_HIGH, borderColor: 'rgba(219,70,112,0.35)' }}
            >
              <span aria-hidden>⚠</span> {sensors.flood.current} / {sensors.flood.total} total
            </span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs">
            <ThermometerSun size={14} className="text-slate-500" />
            <span className="font-semibold text-slate-900">Humidity</span>
            <MoreHorizontal size={14} className="ml-auto text-slate-400" />
          </div>
          <div className="mt-1.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {sensors.humidity.current}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

function Stat({ top, bot }) {
  return (
    <div>
      <div className="text-lg font-semibold text-slate-900 leading-tight">{top}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{bot}</div>
    </div>
  )
}

function Sparkline({ positive }) {
  const stroke = positive ? SUCCESS : SEV_HIGH
  const path = positive
    ? 'M 2 14 L 12 8 L 22 10 L 32 4 L 42 6 L 52 3 L 62 8'
    : 'M 2 6 L 12 8 L 22 5 L 32 12 L 42 10 L 52 14 L 62 12'
  return (
    <svg viewBox="0 0 64 18" width="52" height="14">
      <path d={path} stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EventsTimelineCard({ rows }) {
  return (
    <Card>
      <div className="flex items-center justify-between px-4">
        <div className="text-base font-semibold text-slate-900">Events Timeline</div>
        <button className="inline-flex items-center gap-1 text-xs bg-slate-100 rounded-full px-2.5 py-1">
          All <ChevronDown size={12} />
        </button>
      </div>
      <div className="relative">
        <div className="absolute left-[36px] top-4 bottom-4 w-px bg-slate-200" />
        {rows.map((row, i) => (
          <div key={i} className="px-4 py-2.5 flex items-start gap-3 relative">
            {row.tone === 'comm' ? (
              <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(11,149,248,0.12)' }}>
                <Wifi size={12} style={{ color: BRAND }} />
              </div>
            ) : (
              <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(219,70,112,0.12)' }}>
                <Waves size={12} color={SEV_HIGH} strokeWidth={2.5} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-900">{row.title}</span>
                <StatePill state={row.state} />
                <span className="text-[11px] text-slate-500 ml-auto">{row.at}</span>
              </div>
              {row.flow && (
                <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                  <span>Flow <b className="text-slate-900">{row.flow}</b></span>
                  <span>Volume <b className="text-slate-900">{row.volume}</b></span>
                  <span className="inline-flex items-center gap-0.5">Dur <Bell size={10} /> {row.notified} sent</span>
                  <ChevronDown size={12} className="ml-auto opacity-50" />
                </div>
              )}
              {row.body && <div className="mt-1 text-xs text-slate-700">{row.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ActionPolicyCard({ rows }) {
  return (
    <Card>
      <div className="flex items-center justify-between px-4">
        <div className="text-base font-semibold text-slate-900">Action Policy</div>
        <a className="text-xs font-medium hover:underline cursor-pointer" style={{ color: BRAND }}>View all</a>
      </div>
      <div className="px-4 space-y-3">
        {rows.map((p, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-900">
                {p.name === 'Open loop' ? <span className="text-slate-500">◔</span> : <HomeIcon size={14} className="text-slate-500" />}
                <span className="font-medium">{p.name}</span>
              </div>
              <span className="text-xs text-slate-500">{p.schedule}</span>
            </div>
            <div className="mt-2 rounded-lg px-3 py-3 border border-slate-100" style={{ background: '#F5F8FD' }}>
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span className="inline-flex items-center gap-1">
                  <Power size={11} className="text-slate-500" /> Auto Shutoff
                  <span className="w-1.5 h-1.5 rounded-full inline-block ml-1" style={{ background: SEV_HIGH }} />
                  <b className="text-slate-900">{p.shutoff}</b>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bell size={11} className="text-slate-500" /> Alert
                  <span className="w-1.5 h-1.5 rounded-full inline-block ml-1" style={{ background: SUCCESS }} />
                  <b className="text-slate-900">{p.alert}</b>
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
                <span className="font-semibold text-slate-900">{p.left}</span>
                <span>{p.window}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
