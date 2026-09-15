/**
 * Home — Account Overview (v2 mobile).
 * Design source: Figma nodes 198235:82043 (alerts), 198235:81421 (healthy),
 * 198229:74815 (expanded water events).
 * Three states of the Water Events card + shared Systems Health + Insights.
 */

import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import {
  Menu, Headphones, ChevronDown, ChevronUp, Waves, Wifi, WifiOff,
  BellOff, PowerOff, Timer, Droplet, TrendingDown,
} from 'lucide-react'
import TabBar from '@/components/TabBar'
import WintSidebar from '@/v2/components/WintSidebar'
import EventOverlay from '@/v2/components/EventOverlay'
import WaterConsumptionCard from '@/v2/components/WaterConsumptionCard'
import InsightsCard from '@/v2/components/InsightsCard'

// ── Wint tokens ────────────────────────────────────────────────────────────
const BRAND     = '#0B95F8'
const SEV_HIGH  = '#DB4670'
const SEV_LOW   = '#F05C25'
const SUCCESS   = '#5C9E1A'
const PAGE_BG   = '#EEF2F7'    // header + page bg (slightly bluer than the pure gray)
const HEADER_BG = '#EDF2F7'

// ── Mock data ──────────────────────────────────────────────────────────────
const MOCK = {
  waterEventsCount: 25,
  highFlowCount: 5,
  lowFlowCount: 5,
  systemsHealthPct: 80,
  systemsAttention: 8,
  systemsTotal: 3431,
  issues: {
    offline: 4,
    valveErrors: 2,
    disconnectedPower: 1,
    missingRecipients: 1,
  },
  waterEvents: [
    { id: 'fire-riser-2', title: 'Fire Riser 2', addr: 'San Fransisco | 1775 Washington St, Hano...', flow: 'High Flow', at: 'Apr 02, 2026 08:13:15', dur: '6h 36m' },
    { id: '360-magnolia', title: '360 Magnolia Row', addr: 'Los Angeles | 333 Main Street, Tewksb...', flow: 'High Flow', at: 'Apr 02, 2026 08:13:15', dur: '6h 36m' },
    { id: '751-poplar-a',  title: '751 Poplar Court', addr: 'Los Angeles | 700 Oak Street, Brockton...', flow: 'High Flow', at: 'Apr 02, 2026 08:13:15', dur: '6h 36m' },
    { id: '751-poplar-b',  title: '751 Poplar Court', addr: 'Los Angeles | 700 Oak Street, Brockton...', flow: 'High Flow', at: 'Apr 02, 2026 08:13:15', dur: '6h 36m' },
    { id: '751-poplar-c',  title: '751 Poplar Court', addr: 'Los Angeles | 700 Oak Street, Brockton...', flow: 'High Flow', at: 'Apr 02, 2026 08:13:15', dur: '6h 36m' },
  ],
  // Four rows, as the comp draws them. Two tones and one row with no delta:
  // "Background flow" states a rate, it has no change to report.
  insights: [
    { title: 'Domestic Hot 9',    addr: '352 Palmer..', kind: 'Usage change',    delta: '-12.5%', deltaTone: 'good', value: '-13,564 L' },
    { title: 'Domestic Hot 9',    addr: '300 Colon..',  kind: 'Background flow', delta: null,     deltaTone: 'good', value: '16.1 L/H' },
    { title: '23 Arroyo Resid...', addr: '300 Colony',  kind: 'Usage change',    delta: '+12.5%', deltaTone: 'bad',  value: '+13,564 L' },
    { title: 'Chiller Makeup 26', addr: '300 Colo..',   kind: 'Usage change',    delta: '-12.5%', deltaTone: 'good', value: '13,564 L' },
  ],
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function HomeAccountOverview() {
  // Figma "Location opt b" (198328:88654) is this exact screen with the title
  // swapped — same cards, same data — so it is a route param, not a screen.
  // Reachable at /location/:locationName; bare / stays "All Accounts".
  const { locationName } = useParams()
  const scopeTitle = locationName ? decodeURIComponent(locationName) : 'All Accounts'

  const [tab, setTab] = useState('overview')
  // Demo state toggle: healthy = show empty state, otherwise alerts state
  const [healthy, setHealthy] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // null | 'water' | 'alerts' — which dataset the full-list overlay is showing.
  const [overlay, setOverlay] = useState(null)

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

      {/* Title + Tabs */}
      <div className="px-4 pt-2 pb-3 shrink-0" style={{ background: HEADER_BG }}>
        <h1 className="text-[28px] leading-8 font-semibold tracking-tight text-slate-900 mb-4">
          {scopeTitle}
        </h1>
        <div className="flex gap-8 border-b border-slate-200/60 -mx-4 px-4">
          <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabButton>
          <TabButton active={tab === 'general'} onClick={() => setTab('general')}>General Info</TabButton>
        </div>
      </div>

      {/* Body — the scrolling region */}
      <div className="px-4 pt-4 pb-8 flex flex-col gap-3" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {tab === 'overview' ? (
          <>
            {/* Demo controls — quick toggles so we can switch states in the mockup */}
            <DemoToggle healthy={healthy} setHealthy={setHealthy} expanded={expanded} setExpanded={setExpanded} />

            {/* Water Events card */}
            {healthy
              ? <WaterEventsHealthy onShowPast={() => setOverlay('water')} />
              : <WaterEventsCard expanded={expanded} setExpanded={setExpanded} events={MOCK.waterEvents} count={MOCK.waterEventsCount} onShowAll={() => setOverlay('water')} />
            }

            {/* Systems Health card */}
            <SystemsHealthCard healthy={healthy} onShowPast={() => setOverlay('alerts')} />

            {/* Insights — shared with the system page. No onViewAll: there is
                no Insights list screen designed, so it renders inert. */}
            <InsightsCard rows={MOCK.insights} />

            {/* Water consumption — present in the Figma home comp (the layer is
                named "Balance", a leftover shadcn template name). */}
            <WaterConsumptionCard />
          </>
        ) : (
          /* NOT DESIGNED. The delivery canvas has the tab but no content frame
             for it anywhere, and Rule 0 forbids inventing one. Honest placeholder
             until a comp exists — do not fill this with plausible-looking fields. */
          <Card>
            <div className="py-10 px-4 text-center">
              <div className="text-sm font-medium text-slate-600">General Info</div>
              <div className="text-xs text-slate-400 mt-1">No design yet for this tab.</div>
            </div>
          </Card>
        )}
      </div>

      {/* v2 drawer: navigation only, no global scope. v1 screens still mount
          NavigationDrawer and keep their scope behaviour — the two coexist. */}
      <WintSidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Figma 198328:89685 / :90254 are these same overlays in location scope:
          a breadcrumb instead of a bare close, and rows drop the system name and
          address because the scope already implies them. Driven by where this
          screen is, not by a second component. */}
      <EventOverlay
        open={overlay !== null}
        onClose={() => setOverlay(null)}
        dataset={overlay ?? 'water'}
        scope={locationName ? 'location' : 'account'}
        scopeName={scopeTitle}
      />

      <TabBar activeTab="home" />
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────
function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative py-3 text-[15px] font-medium transition-colors ${active ? 'text-[#0B95F8]' : 'text-slate-500'}`}
    >
      {children}
      {active && <span className="absolute left-0 right-0 -bottom-px h-[2px]" style={{ background: BRAND }} />}
    </button>
  )
}

function DemoToggle({ healthy, setHealthy, expanded, setExpanded }) {
  return (
    <div className="flex gap-2 mb-1 text-[11px]">
      <span className="text-slate-400">Demo state:</span>
      <button
        onClick={() => setHealthy(false)}
        className={`px-2 py-0.5 rounded-full ${!healthy ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'}`}
      >Alerts</button>
      <button
        onClick={() => setHealthy(true)}
        className={`px-2 py-0.5 rounded-full ${healthy ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'}`}
      >Healthy</button>
      {!healthy && (
        <button
          onClick={() => setExpanded(v => !v)}
          className={`ml-auto px-2 py-0.5 rounded-full ${expanded ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'}`}
        >{expanded ? 'Collapse events' : 'Expand events'}</button>
      )}
    </div>
  )
}

// Water Events - alert state (collapsed OR expanded)
function WaterEventsCard({ expanded, setExpanded, events, count, onShowAll }) {
  return (
    <Card className="p-4">
      <button className="flex items-center gap-3 w-full text-left" onClick={() => setExpanded(v => !v)}>
        <div
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center relative"
          style={{ background: 'rgba(219,70,112,0.10)' }}
        >
          <span
            className="w-3 h-3 rounded-full absolute animate-ping"
            style={{ background: SEV_HIGH, opacity: 0.6 }}
          />
          <span className="w-2.5 h-2.5 rounded-full relative z-10" style={{ background: SEV_HIGH }} />
        </div>
        <div className="flex-1 flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-slate-900">{count}</span>
          <span className="text-[15px] text-slate-700">Water events</span>
        </div>
        {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>

      {!expanded ? (
        <div className="mt-3 flex gap-2">
          <FlowChip severity="high" label="High Flow" count={MOCK.highFlowCount} />
          <FlowChip severity="low" label="Low Flow" count={MOCK.lowFlowCount} />
        </div>
      ) : (
        <div className="mt-2 -mx-4">
          {events.map((ev, i) => (
            <WaterEventRow key={ev.id} ev={ev} withDivider={i > 0} />
          ))}
          <div className="text-center pt-3 pb-1">
            <button type="button" onClick={onShowAll} className="text-sm font-medium text-slate-500 hover:text-[#0B95F8] cursor-pointer">Show all</button>
          </div>
        </div>
      )}
    </Card>
  )
}

function FlowChip({ severity, label, count }) {
  const color = severity === 'high' ? SEV_HIGH : SEV_LOW
  const bg = severity === 'high' ? 'rgba(219,70,112,0.08)' : 'rgba(240,92,37,0.10)'
  return (
    <div
      className="flex-1 flex items-center justify-between px-3 py-2 rounded-full"
      style={{ background: bg, border: `1px solid ${color}22` }}
    >
      <div className="flex items-center gap-1.5">
        <Waves size={14} color={color} strokeWidth={2.5} />
        <span className="text-xs font-medium text-slate-800">{label}</span>
      </div>
      <span className="text-sm font-bold" style={{ color }}>{count}</span>
    </div>
  )
}

function WaterEventRow({ ev, withDivider }) {
  const [addrOpen, setAddrOpen] = useState(false)
  return (
    <div
      className={`px-4 py-3 flex items-start gap-3 cursor-pointer ${withDivider ? 'border-t border-slate-100' : ''}`}
      onClick={() => setAddrOpen(v => !v)}
    >
      <div
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(219,70,112,0.10)' }}
      >
        <Waves size={16} color={SEV_HIGH} strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-slate-900 leading-tight">{ev.title}</div>
        <div className={`text-xs text-slate-500 mt-0.5 ${addrOpen ? '' : 'truncate'}`}>{ev.addr}</div>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
          <span className="font-semibold" style={{ color: SEV_HIGH }}>{ev.flow}</span>
          <span>{ev.at}</span>
          <span className="ml-auto text-slate-700 font-medium">{ev.dur}</span>
        </div>
      </div>
    </div>
  )
}

// Water Events - healthy state (empty)
function WaterEventsHealthy({ onShowPast }) {
  return (
    <Card className="px-4 py-4">
      <div className="flex items-center gap-3">
        <PipeShieldIllustration />
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-slate-900 leading-tight">Everything looks good!</div>
          <div className="text-xs text-slate-500 mt-0.5">No active water events</div>
          <button type="button" onClick={onShowPast} className="text-xs font-medium mt-2 inline-block cursor-pointer hover:underline" style={{ color: BRAND }}>
            Show past events
          </button>
        </div>
      </div>
    </Card>
  )
}

function PipeShieldIllustration() {
  // Minimal SVG stand-in for the pipe + valve + shield vignette
  return (
    <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="shrink-0">
      {/* Pipes */}
      <rect x="6" y="26" width="20" height="8" fill="#7AB6E8" />
      <rect x="54" y="26" width="20" height="8" fill="#7AB6E8" />
      <rect x="34" y="10" width="12" height="16" fill="#4F8FCA" />
      {/* Valve */}
      <rect x="30" y="24" width="20" height="14" rx="2" fill="#0B4A7A" />
      <rect x="38" y="4" width="4" height="8" fill="#B6D4EE" />
      <ellipse cx="40" cy="6" rx="8" ry="2" fill="#B6D4EE" />
      {/* Shield with check */}
      <circle cx="60" cy="46" r="10" fill="#5C9E1A" />
      <path d="M55 46 L58 49 L65 43" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function SystemsHealthCard({ healthy, onShowPast }) {
  const pct = healthy ? 96 : MOCK.systemsHealthPct
  const attention = healthy ? 0 : MOCK.systemsAttention
  const issues = healthy
    ? { offline: 0, valveErrors: 0, disconnectedPower: 0, missingRecipients: 0 }
    : MOCK.issues
  return (
    <Card className="pb-4">
      {/* Wave illustration */}
      <div className="mx-4 mt-4 h-24 rounded-lg overflow-hidden relative" style={{ background: '#DDE9F9' }}>
        <svg viewBox="0 0 340 96" className="w-full h-full">
          <defs>
            <linearGradient id="w1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#66B5F9" />
              <stop offset="1" stopColor="#3E95F6" />
            </linearGradient>
            <linearGradient id="w2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1B79F8" />
              <stop offset="1" stopColor="#0C5CF3" />
            </linearGradient>
          </defs>
          <path d="M0 30 Q 100 8 180 40 T 340 30 L 340 96 L 0 96 Z" fill="url(#w1)" opacity="0.6" />
          <path d="M0 55 Q 90 30 180 65 T 340 60 L 340 96 L 0 96 Z" fill="url(#w2)" opacity="0.85" />
        </svg>
      </div>

      {/* KPIs */}
      <div className="mt-4 px-4 grid grid-cols-2 gap-2">
        <div className="rounded-full flex items-center gap-2 px-3 py-2" style={{ background: healthy ? '#EEF3FA' : '#EEF3FA' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: BRAND }} />
          <span className="text-2xl font-bold text-slate-900 leading-none">{pct}%</span>
        </div>
        <div className="rounded-full flex items-baseline gap-1 px-3 py-2" style={{ background: '#EEF3FA' }}>
          <span className="text-2xl font-bold leading-none" style={{ color: attention > 0 ? SEV_HIGH : '#B8BCC4' }}>{attention}</span>
          <span className="text-lg font-medium text-slate-500">/ {MOCK.systemsTotal.toLocaleString()}</span>
        </div>
      </div>
      <div className="mt-1 px-4 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
        <span>Systems Health</span>
        <span>Require attention / all</span>
      </div>

      <div className="mx-4 mt-3 border-t border-slate-100" />

      {/* 2×2 issue grid */}
      <div className="mt-3 px-4 grid grid-cols-2 gap-3">
        <IssueTile icon={<WifiOff size={14} />} label="Offline systems" count={issues.offline} />
        <IssueTile icon={<Timer size={14} />} label="Valve errors" count={issues.valveErrors} />
        <IssueTile icon={<PowerOff size={14} />} label="Disconnected power" count={issues.disconnectedPower} />
        <IssueTile icon={<BellOff size={14} />} label="Missing recipients" count={issues.missingRecipients} />
      </div>

      {healthy && (
        <div className="px-4 mt-3">
          <button type="button" onClick={onShowPast} className="text-sm font-medium cursor-pointer hover:underline" style={{ color: BRAND }}>Show past alerts</button>
        </div>
      )}
    </Card>
  )
}

function IssueTile({ icon, label, count }) {
  const hasIssue = count > 0
  const color = hasIssue ? SEV_HIGH : '#B8BCC4'
  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: '#EEF3FA' }}>
        <span style={{ color }}>{icon}</span>
        <span className="text-base font-bold" style={{ color }}>{count}</span>
      </div>
      <div className="text-[11px] text-slate-500 mt-1 pl-1">{label}</div>
    </div>
  )
}
