/**
 * Home — Account Overview (v2 mobile).
 * Design source: Figma nodes 198235:82043 (alerts), 198235:81421 (healthy),
 * 198229:74815 (expanded water events).
 *
 * Ported with the figma-port skill (2026-09-09 measured review).
 * Divergences from source, kept intentionally:
 *   - Inter font instead of Figtree (project convention, CLAUDE.md rule).
 *   - Wint severity colors (SEV_HIGH #DB4670 / SEV_LOW #F05C25) on the
 *     flow-chip glyphs — source uses generic red/orange. Wint brand rules
 *     bind these severities semantically.
 *   - Right-side chevron on the Water Events card header (functional
 *     expand/collapse) instead of the source's "contract-up-down" glyph.
 *   - SVG approximations for the wave illustration and donut (Figma asset
 *     URLs expire in ~7 days and would need re-download on every port pass).
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { useUserContext } from '@/context/UserContext'
import {
  Menu, Headphones, ChevronDown, ChevronUp, Waves, WifiOff,
  BellOff, PowerOff, Wrench, Droplet, TrendingDown, MapPin,
  MoreHorizontal, Settings, UserCog, LogOut, X, ChevronRight,
} from 'lucide-react'

// ── Wint + Figma palette ───────────────────────────────────────────────────
const BRAND      = '#0B95F8'
const SEV_HIGH   = '#DB4670'
const SEV_LOW    = '#F05C25'
const SUCCESS    = '#5C9E1A'
const RED_500    = '#fb2c36'   // Figma slate-red for counts (not Wint severity)
const SLATE_900  = '#0f172b'
const SLATE_800  = '#1d293d'
const SLATE_600  = '#45556c'
const SLATE_500  = '#62748e'
const SLATE_400  = '#90a1b9'
const SLATE_200  = '#e2e8f0'
const CARD_BG    = '#fafbfc'
const WAVE_BG    = '#ddf1ff'
const FEATURED_BG = '#f5f5f5'
const CHIP_RED   = '#ffe2e2'   // red/100
const CHIP_ORG   = '#ffedd4'   // orange/100

// 5-stop page gradient over white — matches Figma frame background.
const PAGE_BG = 'linear-gradient(129.43deg,' +
  'rgba(233,238,248,0.8) 8.4%,' +
  'rgba(227,235,249,0.8) 32.2%,' +
  'rgba(228,235,250,0.8) 40.8%,' +
  'rgba(212,226,255,0.8) 71.2%,' +
  'rgba(233,237,243,0.8) 82.9%), #fff'

// 4-stop pill gradient (same palette, 170.67° axis) — used for KPI + issue tiles.
const PILL_BG = 'linear-gradient(170.67deg,' +
  'rgba(233,238,248,0.9) 8.4%,' +
  'rgba(227,235,249,0.9) 32.2%,' +
  'rgba(228,235,250,0.9) 40.8%,' +
  'rgba(212,226,255,0.9) 71.2%), #fff'

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
    { id: 'fire-riser-2', title: 'Fire Riser 2',    addr: 'San Fransisco | 1775 Washington St, Hano...', flow: 'High Flow', at: 'Apr 02, 2026 08:13:15', dur: '6h 36m' },
    { id: '360-magnolia', title: '360 Magnolia Row', addr: 'Los Angeles | 333 Main Street, Tewksb...',   flow: 'High Flow', at: 'Apr 02, 2026 08:13:15', dur: '6h 36m' },
    { id: '751-poplar-a', title: '751 Poplar Court', addr: 'Los Angeles | 700 Oak Street, Brockton...',  flow: 'High Flow', at: 'Apr 02, 2026 08:13:15', dur: '6h 36m' },
    { id: '751-poplar-b', title: '751 Poplar Court', addr: 'Los Angeles | 700 Oak Street, Brockton...',  flow: 'High Flow', at: 'Apr 02, 2026 08:13:15', dur: '6h 36m' },
    { id: '751-poplar-c', title: '751 Poplar Court', addr: 'Los Angeles | 700 Oak Street, Brockton...',  flow: 'High Flow', at: 'Apr 02, 2026 08:13:15', dur: '6h 36m' },
  ],
  insights: [
    { title: 'Domestic Hot 9', addr: '352 Palmer..', kind: 'Usage change',    delta: '-12.5%', tone: 'good', value: '-13,564', unit: 'L',   icon: 'droplet-down' },
    { title: '10 Elm Ave',     addr: '892 Oak Rd..', kind: 'Background flow', delta: '+8.2%',  tone: 'bad',  value: '+2,140',  unit: 'L/H', icon: 'droplets' },
    { title: 'Cooling Tower',  addr: '18 Ridge Ln.', kind: 'Usage change',    delta: '-4.1%',  tone: 'good', value: '-880',    unit: 'L',   icon: 'droplet-down' },
    { title: 'Kitchen Line 3', addr: '46 River St..', kind: 'Background flow', delta: '+3.6%', tone: 'bad',  value: '+520',   unit: 'L/H', icon: 'droplet-share' },
  ],
  consumption: { total: '1.8K', monthlyAvg: '12.4K', peakMonth: '28.7K' },
  topUsage: {
    total: '23,374',
    slices: [
      { label: 'Apartment 2', value: '13,564', pct: '58.0%', color: '#193cb8' },
      { label: 'Apartment 5', value: '4,120',  pct: '17.6%', color: '#2b7fff' },
      { label: 'Common area', value: '2,880',  pct: '12.3%', color: '#8ec5ff' },
      { label: 'Apartment 8', value: '1,660',  pct:  '7.1%', color: '#155dfc' },
      { label: 'Other',       value: '1,150',  pct:  '5.0%', color: '#93b8f0' },
    ],
  },
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function HomeAccountOverview() {
  const [tab, setTab]         = useState('overview')
  const [healthy, setHealthy] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="h-full overflow-y-auto pb-8" style={{ background: PAGE_BG }}>
      {/* Top bar — h ≈ 42, matches Figma header cluster (not sticky per source) */}
      <div className="flex items-center justify-between px-4 py-3">
        <button className="p-1 -ml-1 rounded-md" aria-label="Menu" onClick={() => setMenuOpen(true)}>
          <Menu size={20} style={{ color: SLATE_800 }} />
        </button>
        <button className="p-1 -mr-1 rounded-md" aria-label="Support">
          <Headphones size={20} style={{ color: SLATE_800 }} />
        </button>
      </div>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Page title + tab strip */}
      <div className="px-4 pt-2 pb-3">
        <h1
          className="mb-4"
          style={{
            fontSize: 24,
            lineHeight: '32px',
            fontWeight: 500,
            color: SLATE_800,
            letterSpacing: '-0.6px',
          }}
        >
          All Accounts
        </h1>
        <div className="flex gap-6 border-b -mx-4 px-4" style={{ borderColor: SLATE_200 }}>
          <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabButton>
          <TabButton active={tab === 'general'}  onClick={() => setTab('general')}>General Info</TabButton>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-5 pb-4 flex flex-col gap-6">
        {tab === 'overview' ? (
          <>
            <DemoToggle
              healthy={healthy} setHealthy={setHealthy}
              expanded={expanded} setExpanded={setExpanded}
            />
            {healthy
              ? <WaterEventsHealthy />
              : <WaterEventsCard expanded={expanded} setExpanded={setExpanded} events={MOCK.waterEvents} count={MOCK.waterEventsCount} />}
            <SystemsHealthCard healthy={healthy} />
            <InsightsCard />
            <WaterConsumptionCard />
            <TopUsageCard />
          </>
        ) : (
          <Card><div className="py-8 text-center text-sm" style={{ color: SLATE_500 }}>General Info tab (coming)</div></Card>
        )}
      </div>
    </div>
  )
}

// ── Common shell bits ──────────────────────────────────────────────────────
function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative py-3 transition-colors"
      style={{
        fontSize: 14,
        lineHeight: '20px',
        fontWeight: 500,
        color: active ? BRAND : SLATE_500,
      }}
    >
      {children}
      {active && <span className="absolute left-0 right-0 -bottom-px h-[2px]" style={{ background: BRAND }} />}
    </button>
  )
}

function DemoToggle({ healthy, setHealthy, expanded, setExpanded }) {
  return (
    <div className="flex gap-2 text-[11px] items-center">
      <span style={{ color: SLATE_400 }}>Demo state:</span>
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

// ── Water Events card (alerts state) ───────────────────────────────────────
function WaterEventsCard({ expanded, setExpanded, events, count }) {
  return (
    <Card className="p-4" style={{ background: CARD_BG, borderColor: '#fff' }}>
      <button className="flex items-center gap-3 w-full text-left" onClick={() => setExpanded(v => !v)}>
        {/* Featured icon — 44×44 rounded-14, per Figma. Static, not pulsing. */}
        <div
          className="shrink-0 flex items-center justify-center"
          style={{ width: 44, height: 44, borderRadius: 14, background: FEATURED_BG }}
        >
          <MapPin size={20} style={{ color: SLATE_600 }} />
        </div>
        <div className="flex-1" style={{
          fontSize: 18, lineHeight: '18px', fontWeight: 600,
          color: SLATE_800, letterSpacing: '-0.45px',
        }}>
          {count} Water events
        </div>
        {expanded
          ? <ChevronUp   size={18} style={{ color: SLATE_500 }} />
          : <ChevronDown size={18} style={{ color: SLATE_500 }} />}
      </button>

      {!expanded ? (
        <div className="mt-4 flex gap-3">
          <FlowChip severity="high" label="High Flow" count={MOCK.highFlowCount} />
          <FlowChip severity="low"  label="Low Flow"  count={MOCK.lowFlowCount} />
        </div>
      ) : (
        <div className="mt-2 -mx-4">
          {events.map((ev, i) => (
            <WaterEventRow key={ev.id} ev={ev} withDivider={i > 0} />
          ))}
          <div className="text-center pt-3 pb-1">
            <a className="text-sm font-medium cursor-pointer" style={{ color: SLATE_500 }}>Show all</a>
          </div>
        </div>
      )}
    </Card>
  )
}

function FlowChip({ severity, label, count }) {
  const color = severity === 'high' ? SEV_HIGH : SEV_LOW
  const circleBg = severity === 'high' ? CHIP_RED : CHIP_ORG
  return (
    <div
      className="flex-1 flex items-center gap-2"
      style={{
        height: 36,
        paddingLeft: 5,
        paddingRight: 11,
        borderRadius: 26,
        background: CARD_BG,
        border: `1px solid ${SLATE_200}`,
      }}
    >
      <div
        className="flex items-center justify-center shrink-0"
        style={{ width: 24, height: 24, borderRadius: 17, background: circleBg }}
      >
        <Waves size={13} color={color} strokeWidth={2.25} />
      </div>
      <span style={{ fontSize: 14, lineHeight: '18px', fontWeight: 500, color: SLATE_600 }}>{label}</span>
      <span className="ml-auto" style={{ fontSize: 16, lineHeight: '26px', fontWeight: 700, color: SLATE_600, letterSpacing: '-0.4px' }}>{count}</span>
    </div>
  )
}

function WaterEventRow({ ev, withDivider }) {
  const [addrOpen, setAddrOpen] = useState(false)
  return (
    <div
      className={`px-4 py-3 flex items-start gap-3 cursor-pointer ${withDivider ? 'border-t' : ''}`}
      style={withDivider ? { borderColor: '#f1f5f9' } : undefined}
      onClick={() => setAddrOpen(v => !v)}
    >
      <div
        className="shrink-0 flex items-center justify-center"
        style={{ width: 36, height: 36, borderRadius: 999, background: 'rgba(219,70,112,0.10)' }}
      >
        <Waves size={16} color={SEV_HIGH} strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600, color: SLATE_900 }}>{ev.title}</div>
        <div
          className={`mt-0.5 text-xs ${addrOpen ? '' : 'truncate'}`}
          style={{ color: SLATE_500 }}
        >{ev.addr}</div>
        <div className="mt-1 flex items-center gap-3 text-[11px]" style={{ color: SLATE_500 }}>
          <span className="font-semibold" style={{ color: SEV_HIGH }}>{ev.flow}</span>
          <span>{ev.at}</span>
          <span className="ml-auto font-medium" style={{ color: SLATE_800 }}>{ev.dur}</span>
        </div>
      </div>
    </div>
  )
}

// ── Water Events (healthy) ─────────────────────────────────────────────────
function WaterEventsHealthy() {
  return (
    <Card className="p-4" style={{ background: CARD_BG, borderColor: '#fff' }}>
      <div className="flex items-center gap-3">
        <PipeShieldIllustration />
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 16, lineHeight: '20px', fontWeight: 600, color: SLATE_900 }}>Everything looks good!</div>
          <div className="text-xs mt-0.5" style={{ color: SLATE_500 }}>No active water events</div>
          <a className="text-xs font-medium mt-2 inline-block cursor-pointer hover:underline" style={{ color: BRAND }}>
            Show past events
          </a>
        </div>
      </div>
    </Card>
  )
}

function PipeShieldIllustration() {
  return (
    <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="shrink-0">
      <rect x="6"  y="26" width="20" height="8"  fill="#7AB6E8" />
      <rect x="54" y="26" width="20" height="8"  fill="#7AB6E8" />
      <rect x="34" y="10" width="12" height="16" fill="#4F8FCA" />
      <rect x="30" y="24" width="20" height="14" rx="2" fill="#0B4A7A" />
      <rect x="38" y="4"  width="4"  height="8"  fill="#B6D4EE" />
      <ellipse cx="40" cy="6" rx="8" ry="2" fill="#B6D4EE" />
      <circle cx="60" cy="46" r="10" fill={SUCCESS} />
      <path d="M55 46 L58 49 L65 43" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// ── Systems Health card ────────────────────────────────────────────────────
function SystemsHealthCard({ healthy }) {
  const pct = healthy ? 96 : MOCK.systemsHealthPct
  const attention = healthy ? 0 : MOCK.systemsAttention
  const issues = healthy
    ? { offline: 0, valveErrors: 0, disconnectedPower: 0, missingRecipients: 0 }
    : MOCK.issues
  return (
    <Card className="p-5" style={{ background: CARD_BG, borderColor: '#fff', borderRadius: 22 }}>
      {/* Wave illustration bounds */}
      <div className="w-full overflow-hidden relative" style={{ height: 95, borderRadius: 11, background: WAVE_BG }}>
        <svg viewBox="0 0 340 96" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="wh-w1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#66B5F9" /><stop offset="1" stopColor="#3E95F6" />
            </linearGradient>
            <linearGradient id="wh-w2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1B79F8" /><stop offset="1" stopColor="#0C5CF3" />
            </linearGradient>
          </defs>
          <path d="M0 30 Q 100 8 180 40 T 340 30 L 340 96 L 0 96 Z" fill="url(#wh-w1)" opacity="0.6" />
          <path d="M0 55 Q 90 30 180 65 T 340 60 L 340 96 L 0 96 Z" fill="url(#wh-w2)" opacity="0.85" />
        </svg>
      </div>

      {/* KPI pills */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <KpiPill icon={<MapPin size={18} style={{ color: BRAND }} />}>
          <div className="flex flex-col items-end">
            <div style={{ fontSize: 30, lineHeight: '30px', fontWeight: 600, color: SLATE_900, letterSpacing: '-0.75px' }}>{pct}%</div>
          </div>
        </KpiPill>
        <KpiPill>
          <div className="flex items-baseline gap-1 justify-end">
            <span style={{ fontSize: 24, lineHeight: '30px', fontWeight: 500, color: attention > 0 ? RED_500 : SLATE_400, letterSpacing: '-0.6px' }}>{attention}</span>
            <span style={{ fontSize: 14, lineHeight: '18px', fontWeight: 500, color: SLATE_600 }}>/</span>
            <span style={{ fontSize: 24, lineHeight: '30px', fontWeight: 500, color: SLATE_900, opacity: 0.7, letterSpacing: '-0.6px' }}>{MOCK.systemsTotal.toLocaleString()}</span>
          </div>
        </KpiPill>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-3" style={{ fontSize: 14, lineHeight: '18px', fontWeight: 500, color: SLATE_600 }}>
        <span>Systems Health</span>
        <span>Require attention / all</span>
      </div>

      {/* Divider */}
      <div className="mt-5 border-t" style={{ borderColor: '#e5e7eb' }} />

      {/* 2x2 issue tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <IssueTile icon={<WifiOff  size={16} />} label="Offline systems"     count={issues.offline} />
        <IssueTile icon={<Wrench   size={16} />} label="Valve errors"         count={issues.valveErrors} />
        <IssueTile icon={<PowerOff size={16} />} label="Disconnected power"   count={issues.disconnectedPower} />
        <IssueTile icon={<BellOff  size={16} />} label="Missing recipients"   count={issues.missingRecipients} />
      </div>

      {healthy && (
        <div className="mt-4">
          <a className="text-sm font-medium cursor-pointer hover:underline" style={{ color: BRAND }}>Show past alerts</a>
        </div>
      )}
    </Card>
  )
}

function KpiPill({ icon, children }) {
  return (
    <div
      className="flex items-center gap-2"
      style={{
        height: 43, paddingLeft: 12, paddingRight: 12,
        paddingTop: 6, paddingBottom: 6,
        borderRadius: 26, background: PILL_BG,
      }}
    >
      {icon}
      <div className="flex-1">{children}</div>
    </div>
  )
}

function IssueTile({ icon, label, count }) {
  const hasIssue = count > 0
  const color = hasIssue ? RED_500 : SLATE_400
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex items-center gap-2"
        style={{
          height: 43, paddingLeft: 12, paddingRight: 12,
          borderRadius: 26, background: PILL_BG,
        }}
      >
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 24, lineHeight: '30px', fontWeight: 500, color, opacity: hasIssue ? 0.85 : 1, letterSpacing: '-0.6px' }}>{count}</span>
      </div>
      <div style={{ fontSize: 12, lineHeight: '15px', fontWeight: 500, color: SLATE_600, paddingLeft: 4 }}>{label}</div>
    </div>
  )
}

// ── Insights card ──────────────────────────────────────────────────────────
function InsightsCard() {
  return (
    <Card style={{ background: CARD_BG, borderColor: '#fff' }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div style={{ fontSize: 18, lineHeight: '18px', fontWeight: 600, color: SLATE_800, letterSpacing: '-0.45px' }}>Insights</div>
        <a className="cursor-pointer" style={{ fontSize: 14, lineHeight: '20px', fontWeight: 500, color: SLATE_500 }}>View all</a>
      </div>
      <div className="pb-2">
        {MOCK.insights.map((row, i) => (
          <div key={i} className="mx-4 py-3 border-t first:border-t-0 flex items-center gap-3" style={{ borderColor: '#f1f5f9' }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="truncate" style={{ fontSize: 14, lineHeight: '20px', fontWeight: 600, color: SLATE_900 }}>{row.title}</span>
                <span className="text-xs truncate" style={{ color: SLATE_500 }}>{row.addr}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5" style={{ fontSize: 14, lineHeight: '18px', color: SLATE_900 }}>
                <Droplet size={14} style={{ color: BRAND, opacity: 0.7 }} /> {row.kind}
              </div>
            </div>
            <Sparkline tone={row.tone} />
            <div className="text-right flex flex-col items-end gap-1">
              <div className="text-xs" style={{ color: SLATE_900 }}>
                <span>{row.value}</span> <span style={{ color: SLATE_500 }}>{row.unit}</span>
              </div>
              <span
                className="inline-flex items-center gap-1 rounded-full"
                style={{
                  fontSize: 12, lineHeight: '16px', fontWeight: 500,
                  paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2,
                  background: row.tone === 'good' ? '#e7f2eb' : 'rgba(251,44,54,0.08)',
                  color: row.tone === 'good' ? '#269950' : RED_500,
                }}
              >
                <TrendingDown size={11} /> {row.delta}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Sparkline({ tone }) {
  const stroke = tone === 'good' ? SUCCESS : RED_500
  const path = tone === 'good'
    ? 'M 2 14 L 12 8 L 22 10 L 32 4 L 42 6 L 52 3 L 62 8'
    : 'M 2 4 L 12 8 L 22 6 L 32 10 L 42 8 L 52 12 L 62 14'
  return (
    <div className="flex items-center justify-center" style={{ width: 57, height: 40, borderRadius: 6, background: 'rgba(11,149,248,0.06)' }}>
      <svg viewBox="0 0 64 18" width="52" height="14">
        <path d={path} stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// ── Water Consumption card (bar chart) ─────────────────────────────────────
function WaterConsumptionCard() {
  return (
    <Card className="p-6" style={{ background: '#fff', borderRadius: 18 }}>
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 18, lineHeight: '18px', fontWeight: 600, color: SLATE_800, letterSpacing: '-0.45px' }}>
          Water consumption
        </div>
        <button className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 26, background: 'transparent' }}>
          <MoreHorizontal size={16} style={{ color: SLATE_500 }} />
        </button>
      </div>

      <div className="mt-3 flex items-end gap-6">
        <Metric value={MOCK.consumption.total}      label="Total L" />
        <Metric value={MOCK.consumption.monthlyAvg} label="Monthly Avg L" />
        <Metric value={MOCK.consumption.peakMonth}  label="Peak Month L" />
      </div>

      <BarChart />

      <div className="mt-2 flex justify-between" style={{ fontSize: 12, lineHeight: '16px', color: '#737373' }}>
        <span>Apr 1</span><span>May 15</span><span>Jun 30</span>
      </div>
    </Card>
  )
}

function Metric({ value, label }) {
  return (
    <div className="flex flex-col">
      <div style={{ fontSize: 20, lineHeight: '27px', fontWeight: 500, color: SLATE_800, letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 14, lineHeight: '18px', fontWeight: 500, color: SLATE_400 }}>{label}</div>
    </div>
  )
}

function BarChart() {
  // 91 bars matching Figma frame width, deterministic pseudo-random heights.
  const N = 91
  const bars = Array.from({ length: N }, (_, i) => {
    const t = i / N
    // Layered sine so it reads as a real usage series, not noise.
    const h = 30 + 60 * Math.abs(Math.sin(i * 0.6 + 1.2)) + 20 * Math.sin(i * 0.11) + (i % 7 === 0 ? 30 : 0)
    return Math.max(6, Math.min(160, Math.round(h)))
  })
  return (
    <div className="mt-4 flex items-end" style={{ height: 180, gap: 2 }}>
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1"
          style={{ height: h, background: '#6bb2fa', borderTopLeftRadius: 3, borderTopRightRadius: 3 }}
        />
      ))}
    </div>
  )
}

// ── Top Usage card (donut) ─────────────────────────────────────────────────
function TopUsageCard() {
  return (
    <Card className="p-4" style={{ background: CARD_BG, borderColor: '#fff' }}>
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 18, lineHeight: '18px', fontWeight: 600, color: SLATE_800, letterSpacing: '-0.45px' }}>Top usage</div>
        <button className="inline-flex items-center gap-1.5 rounded-full" style={{ height: 32, paddingLeft: 12, paddingRight: 12, background: '#f1f5f9', color: '#171717', fontSize: 14, fontWeight: 500 }}>
          Last 30 days <ChevronDown size={14} />
        </button>
      </div>

      <div className="mt-4 flex justify-center">
        <Donut slices={MOCK.topUsage.slices} total={MOCK.topUsage.total} />
      </div>

      <div className="mt-4 flex flex-col gap-2 px-1">
        {MOCK.topUsage.slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }} />
            <span className="flex-1" style={{ fontSize: 12, color: '#737373' }}>{s.label}</span>
            <span style={{ fontSize: 12, color: SLATE_800 }}>{s.value}</span>
            <span style={{ fontSize: 12, color: '#737373' }}>L</span>
            <span
              className="inline-flex items-center rounded-full"
              style={{
                fontSize: 12, lineHeight: '16px', fontWeight: 500,
                paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2,
                background: '#f1f5f9', color: SLATE_800,
              }}
            >{s.pct}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Donut({ slices, total }) {
  const R = 60, C = 2 * Math.PI * R
  const values = slices.map(s => parseFloat(s.pct))
  const sum = values.reduce((a, b) => a + b, 0)
  let acc = 0
  return (
    <div className="relative" style={{ width: 150, height: 150 }}>
      <svg width="150" height="150" viewBox="-75 -75 150 150" style={{ transform: 'rotate(-90deg)' }}>
        <circle r={R} fill="none" stroke="#f1f5f9" strokeWidth="18" />
        {slices.map((s, i) => {
          const frac = values[i] / sum
          const dash = frac * C
          const dashArray = `${dash} ${C - dash}`
          const dashOffset = -acc
          acc += dash
          return (
            <circle
              key={i}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="18"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: SLATE_800, letterSpacing: '-0.5px' }}>{total}</div>
        <div style={{ fontSize: 9, color: '#737373', letterSpacing: '0.5px' }}>TOTAL LITERS</div>
      </div>
    </div>
  )
}

// ── Side menu (hamburger drawer) ───────────────────────────────────────────
// Opens from the left with the current persona at the top, then the standard
// account actions. This is where user preferences live (Account & Preferences
// links to /account, which is the More page per PRD 17).
function SideMenu({ open, onClose }) {
  const navigate = useNavigate()
  const { persona, setPersona } = useUserContext() || {}

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const go = (path) => { onClose(); setTimeout(() => navigate(path), 0) }

  const logOut = () => {
    try {
      sessionStorage.removeItem('pulse2-auth')
      sessionStorage.removeItem('wint-splash-shown')
      if (typeof setPersona === 'function') setPersona(null)
    } catch { /* ignore */ }
    onClose()
    setTimeout(() => navigate('/'), 0)
  }

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
      style={{ background: 'rgba(20,21,26,0.42)', backdropFilter: 'blur(2px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-0 top-0 bottom-0 flex flex-col"
        style={{ width: 300, maxWidth: '85%', background: '#fff', boxShadow: '4px 0 20px rgba(0,0,0,0.18)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="shrink-0 flex items-center justify-center"
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: persona?.bg || '#F1F5F9',
                fontSize: 20,
              }}
            >{persona?.icon || '👤'}</div>
            <div className="min-w-0">
              <div className="truncate" style={{ fontSize: 15, fontWeight: 700, color: SLATE_900, letterSpacing: '-0.2px' }}>
                {persona?.name || 'Signed in'}
              </div>
              <div className="truncate" style={{ fontSize: 12, fontWeight: 600, color: persona?.color || SLATE_500 }}>
                {persona?.role || ''}
              </div>
              {persona?.sub && (
                <div className="truncate" style={{ fontSize: 11, color: SLATE_500, marginTop: 2 }}>{persona.sub}</div>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close menu" className="p-1 -mr-1 -mt-1 rounded-md">
            <X size={18} style={{ color: SLATE_500 }} />
          </button>
        </div>

        <div className="mx-5 border-t" style={{ borderColor: '#E5E7EB' }} />

        {/* Actions */}
        <nav className="flex-1 overflow-y-auto py-2">
          <SideMenuItem
            icon={<Settings size={18} />}
            label="Account & preferences"
            hint="Units, notifications, account details"
            onClick={() => go('/account')}
          />
          <SideMenuItem
            icon={<UserCog size={18} />}
            label="Switch profile"
            hint="Pick another demo persona"
            onClick={() => go('/select')}
          />
        </nav>

        {/* Footer */}
        <div className="mx-5 border-t" style={{ borderColor: '#E5E7EB' }} />
        <button
          onClick={logOut}
          className="flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"
        >
          <LogOut size={18} style={{ color: SEV_HIGH }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: SEV_HIGH }}>Log out</span>
        </button>
      </div>
    </div>
  )
}

function SideMenuItem({ icon, label, hint, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50"
    >
      <span className="shrink-0" style={{ color: SLATE_600 }}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: 14, fontWeight: 600, color: SLATE_900 }}>{label}</span>
        {hint && <span className="block truncate" style={{ fontSize: 12, color: SLATE_500, marginTop: 1 }}>{hint}</span>}
      </span>
      <ChevronRight size={16} style={{ color: SLATE_400 }} />
    </button>
  )
}
