/**
 * System page — v2 (mobile).
 * Design source: Figma node 198213:73589 "System page_mobile".
 * First pass: layout + main cards. Data is mock-hardcoded to match the reference.
 */

import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Menu, Headphones, ChevronRight, ChevronDown, Waves, Bell,
  Droplet, ThermometerSun, Filter, TrendingDown, TrendingUp,
  Wifi, MoreHorizontal, Power, Home as HomeIcon,
} from 'lucide-react'
import NavigationDrawer from '@/components/NavigationDrawer'
import TabBar from '@/components/TabBar'

// ── Wint brand tokens (arbitrary Tailwind values) ─────────────────────────
const BRAND = '#0B95F8'
const SEV_HIGH = '#DB4670'
const SEV_LOW  = '#F05C25'
const DANGER   = '#A5455E'
const SUCCESS  = '#5C9E1A'
const PAGE_BG  = '#F4F6F9'
const HEADER_BG = '#EDF2F7'

// ── Mock data (matches the Figma reference) ────────────────────────────────
const SYS = {
  crumbs: ['Home', '...', 'North Quarter Ltd.'],
  title: 'Floor 26',
  updatedAt: 'Apr 02, 2026 08:13:15',
  waterEvents: [
    { state: 'Ongoing', title: 'High flow event', flowRate: '13,564 L/H flow rate', duration: '6h 36m', detected: 'Apr 02, 2026 08:13:15' },
    { state: 'Warning', title: 'Low flow event', flowRate: '820 L/H flow rate', duration: '2h 04m', detected: 'Apr 02, 2026 12:45:00' },
  ],
  sensors: {
    flood: { current: 1, total: 4 },
    humidity: { current: 4 },
  },
  consumption: {
    total: '1.8K', totalUnit: 'Total L',
    avg: '12.4K', avgUnit: 'Monthly Avg L',
    peak: '28.7K', peakUnit: 'Peak Month L',
  },
  insights: [
    { title: 'Domestic Hot 9', addr: '352 Palmer..', kind: 'Usage change', delta: '-12.5%', deltaTone: 'good', value: '-13,564 L' },
    { title: 'Domestic Hot 9', addr: '300 Colon..', kind: 'Background flow', delta: null, value: '16.1 L/H' },
    { title: '23 Arroyo Resid...', addr: '300 Colony', kind: 'Usage change', delta: '+12.5%', deltaTone: 'bad', value: '+13,564 L' },
    { title: 'Chiller Makeup 26', addr: '300 Colo..', kind: 'Usage change', delta: '-12.5%', deltaTone: 'good', value: '13,564 L' },
  ],
  timeline: [
    { title: 'High Flow Anomaly', state: 'Ongoing', at: 'Apr 02, 2026 08:13:15', flow: '1180 L/h', volume: '8,420', notified: 4, body: 'Leak confirmed — flow sustained above thres...' },
    { title: 'High Flow Anomaly', state: 'Warning', at: 'Apr 02, 2026 08:13:15', flow: '1180 L/h', volume: '8,420', notified: 4, body: 'Leak confirmed — flow sustained above thres...' },
    { title: 'High Flow Anomaly', state: 'Shut-off', at: 'Apr 02, 2026 08:13:15', flow: '1180 L/h', volume: '8,420', notified: 4, body: 'Auto shut-off triggered — valve failed to clos...' },
    { title: 'Connectivity Restored', state: null, tone: 'comm', at: 'Apr 02, 2026 08:13:15' },
  ],
  policy: [
    { name: 'Open loop', schedule: 'Working hours', shutoff: 'Off', alert: 'On', left: '2HR left', window: '20:15 – 23:59' },
    { name: 'Sensors', schedule: 'Working hours', shutoff: 'Off', alert: 'On', left: '2HR left', window: '20:15 – 23:59' },
  ],
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

  // Phone.jsx is a fixed 393x852 frame with overflow:hidden, so this screen owns
  // its scroll container: flex column, chrome shrink-0, body flex:1 +
  // overflowY:auto + minHeight:0. `min-h-screen` here would just be clipped.
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: PAGE_BG }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0" style={{ background: HEADER_BG }}>
        <button className="p-1 -ml-1 rounded-md" aria-label="Menu" onClick={() => setDrawerOpen(true)}>
          <Menu size={20} className="text-slate-800" />
        </button>
        <button className="p-1 -mr-1 rounded-md" aria-label="Support">
          <Headphones size={20} className="text-slate-800" />
        </button>
      </div>

      {/* Header */}
      <div className="px-4 pt-1 pb-3 shrink-0" style={{ background: HEADER_BG }}>
        <div className="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
          {SYS.crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="cursor-pointer hover:text-slate-900">{c}</span>
              {i < SYS.crumbs.length - 1 && <ChevronRight size={12} className="opacity-60" />}
            </span>
          ))}
          <ChevronRight size={12} className="opacity-60" />
          <span className="text-slate-900 font-medium">{SYS.title}</span>
        </div>
        <h1 className="text-[28px] leading-8 font-semibold tracking-tight text-slate-900 mb-1">
          {SYS.title}
        </h1>
        <div className="text-xs text-slate-500">Updated {SYS.updatedAt}</div>

        {/* Tabs */}
        <div className="mt-4 flex gap-6 border-b border-slate-200/60 -mx-4 px-4">
          <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabButton>
          <TabButton active={tab === 'general'} onClick={() => setTab('general')}>General Info</TabButton>
        </div>
      </div>

      {/* Body — the scrolling region */}
      <div className="px-4 pt-4 pb-8 flex flex-col gap-3" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {tab === 'overview' ? <OverviewBody /> : <GeneralInfoStub />}
      </div>

      {/* currentSystemId drives the drawer's system-row highlight + path
          expansion — same contract v1 SystemDetail uses. */}
      <NavigationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectLocation={() => setDrawerOpen(false)}
        currentSystemId={systemId}
      />

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

function OverviewBody() {
  return (
    <>
      <WaterEventCarousel events={SYS.waterEvents} />
      <OpenLoopCard />
      <SensorsCard />
      <WaterConsumptionCard />
      <InsightsCard />
      <EventsTimelineCard />
      <ActionPolicyCard />
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

function SensorsCard() {
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
              <span aria-hidden>⚠</span> {SYS.sensors.flood.current} / {SYS.sensors.flood.total} total
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
              {SYS.sensors.humidity.current}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

function WaterConsumptionCard() {
  const bars = [45, 35, 55, 25, 40, 60, 20, 35, 45, 30, 42, 38, 55, 42, 28, 92, 70, 50, 40, 33, 25, 20, 18, 25, 30, 15]
  return (
    <Card>
      <div className="flex items-center justify-between px-4">
        <div className="text-base font-semibold text-slate-900">Water consumption</div>
        <Filter size={16} className="text-slate-500" />
      </div>
      <div className="px-4 grid grid-cols-3 gap-2">
        <Stat top={SYS.consumption.total} bot={SYS.consumption.totalUnit} />
        <Stat top={SYS.consumption.avg} bot={SYS.consumption.avgUnit} />
        <Stat top={SYS.consumption.peak} bot={SYS.consumption.peakUnit} />
      </div>
      <div className="px-4 pt-1 h-32 flex items-end gap-1">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: 'rgba(11,149,248,0.65)' }} />
        ))}
      </div>
      <div className="px-4 flex justify-between text-[10px] text-slate-500">
        <span>Apr 1</span><span>Apr 6</span><span>Apr 11</span><span>Apr 16</span><span>A…</span>
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

function InsightsCard() {
  return (
    <Card>
      <div className="flex items-center justify-between px-4">
        <div className="text-base font-semibold text-slate-900">Insights</div>
        <a className="text-xs font-medium hover:underline cursor-pointer" style={{ color: BRAND }}>View all</a>
      </div>
      <div>
        {SYS.insights.map((row, i) => (
          <div key={i} className="mx-4 py-3 border-t border-slate-100 first:border-t-0 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-semibold text-slate-900 truncate">{row.title}</span>
                <span className="text-slate-500 text-xs truncate">{row.addr}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                <Droplet size={11} className="opacity-60" /> {row.kind}
              </div>
            </div>
            <div className="w-14 h-8 rounded flex items-center justify-center" style={{ background: 'rgba(11,149,248,0.08)' }}>
              <Sparkline positive={row.deltaTone === 'good'} />
            </div>
            <div className="text-right min-w-16">
              {row.delta && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={row.deltaTone === 'good'
                    ? { background: '#DCFCE7', color: '#166534' }
                    : { background: '#FEE2E2', color: '#991B1B' }
                  }
                >
                  {row.deltaTone === 'good' ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                  {row.delta}
                </span>
              )}
              <div className="text-[11px] text-slate-500 mt-0.5">{row.value}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
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

function EventsTimelineCard() {
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
        {SYS.timeline.map((row, i) => (
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

function ActionPolicyCard() {
  return (
    <Card>
      <div className="flex items-center justify-between px-4">
        <div className="text-base font-semibold text-slate-900">Action Policy</div>
        <a className="text-xs font-medium hover:underline cursor-pointer" style={{ color: BRAND }}>View all</a>
      </div>
      <div className="px-4 space-y-3">
        {SYS.policy.map((p, i) => (
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
