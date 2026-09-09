/**
 * System page — v2 (mobile).
 * Design source: Figma node 198213:73589 "System page_mobile".
 * First pass: layout + main cards. Data is mock-hardcoded to match the reference.
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Menu, Headphones, ChevronRight, ChevronDown, Waves, Bell,
  Droplet, ThermometerSun, Filter, TrendingDown, TrendingUp,
  Wifi, WifiOff, ExternalLink,
} from 'lucide-react'

// ── Mock data (matches the Figma reference) ────────────────────────────────
const SYS = {
  crumbs: ['Home', '...', 'North Quarter Ltd.'],
  title: 'Floor 26',
  updatedAt: 'Apr 02, 2026 08:13:15',
  waterEvents: [
    {
      state: 'Ongoing',
      title: 'High flow event',
      flowRate: '13,564 L/H flow rate',
      duration: '6h 36m',
      detected: 'Apr 02, 2026 08:13:15',
    },
    { state: 'Warning', title: 'Low flow event', flowRate: '820 L/H flow rate', duration: '2h 04m', detected: 'Apr 02, 2026 12:45:00' },
  ],
  openLoop: {
    supply: { name: 'Supply', error: 'Error' },
    return: { name: 'Return', error: 'Error' },
  },
  sensors: {
    flood: { current: 1, total: 4, label: 'Flood' },
    humidity: { current: 4, label: 'Humidity' },
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
    { title: 'High Flow Anomaly', state: 'Ongoing', tone: 'high', at: 'Apr 02, 2026 08:13:15', flow: '1180 L/h', volume: '8,420', notified: 4, body: 'Leak confirmed — flow sustained above thres...' },
    { title: 'High Flow Anomaly', state: 'Warning', tone: 'low', at: 'Apr 02, 2026 08:13:15', flow: '1180 L/h', volume: '8,420', notified: 4, body: 'Leak confirmed — flow sustained above thres...' },
    { title: 'High Flow Anomaly', state: 'Shut-off', tone: 'shutoff', at: 'Apr 02, 2026 08:13:15', flow: '1180 L/h', volume: '8,420', notified: 4, body: 'Auto shut-off triggered — valve failed to clos...' },
    { title: 'Connectivity Restored', state: null, tone: 'comm', at: 'Apr 02, 2026 08:13:15' },
  ],
  policy: [
    { name: 'Open loop', icon: 'clock', schedule: 'Working hours', shutoff: 'Off', alert: 'On', left: '2HR left', window: '20:15 – 23:59' },
    { name: 'Sensors', icon: 'home', schedule: 'Working hours', shutoff: 'Off', alert: 'On', left: '2HR left', window: '20:15 – 23:59' },
  ],
}

// ── Small helpers ──────────────────────────────────────────────────────────
function StatePill({ state, tone }) {
  if (!state) return null
  const map = {
    Ongoing: 'bg-severity-high text-white border-transparent',
    Warning: 'bg-[#F5C848] text-[#4E3A00] border-transparent',
    'Shut-off': 'bg-[#DDE8FF] text-[#1B3D8F] border-transparent',
    Ignore: 'bg-transparent text-foreground border-border/60',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[state] || map.Ongoing}`}>
      {state}
    </span>
  )
}

// Wave/water-drop icon in a soft tinted circle. Used on Water Event + Timeline.
function WaveIcon({ tone = 'high' }) {
  const map = {
    high:   { bg: 'bg-severity-high/12', ring: 'text-severity-high' },
    low:    { bg: 'bg-severity-low/12',  ring: 'text-severity-low' },
    shutoff:{ bg: 'bg-[#DDE8FF]',        ring: 'text-[#1B3D8F]' },
    comm:   { bg: 'bg-primary/12',       ring: 'text-primary' },
  }
  const s = map[tone] || map.high
  return (
    <div className={`shrink-0 w-9 h-9 rounded-full ${s.bg} flex items-center justify-center`}>
      <Waves size={18} className={s.ring} strokeWidth={2.4} />
    </div>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function SystemPageV2() {
  const { systemId } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-6">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-[#EEF2F7] px-4 pt-3 pb-2 flex items-center justify-between">
        <button className="p-1 rounded-md" aria-label="Menu">
          <Menu size={20} className="text-foreground" />
        </button>
        <button className="p-1 rounded-md" aria-label="Support">
          <Headphones size={20} className="text-foreground" />
        </button>
      </div>

      {/* Header */}
      <div className="bg-[#EEF2F7] px-4 pt-1 pb-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
          {SYS.crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="hover:text-foreground cursor-pointer">{c}</span>
              {i < SYS.crumbs.length - 1 && <ChevronRight size={12} className="opacity-60" />}
            </span>
          ))}
          <ChevronRight size={12} className="opacity-60" />
          <span className="text-foreground font-medium">{SYS.title}</span>
        </div>
        <h1 className="text-[28px] leading-8 font-semibold tracking-tight text-foreground mb-1">
          {SYS.title}
        </h1>
        <div className="text-xs text-muted-foreground">Updated {SYS.updatedAt}</div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="border-none bg-transparent p-0 gap-6 h-auto justify-start">
            <TabsTrigger value="overview" className="px-0 flex-none py-3 border-b-2 border-transparent data-[state=active]:border-primary">
              Overview
            </TabsTrigger>
            <TabsTrigger value="general" className="px-0 flex-none py-3 border-b-2 border-transparent data-[state=active]:border-primary">
              General Info
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Body */}
      <div className="px-4 pt-4 space-y-3">
        {tab === 'overview' ? <OverviewBody /> : <GeneralInfoStub />}
      </div>
    </div>
  )
}

function OverviewBody() {
  return (
    <>
      {/* Water Events card — horizontal scroll with counter */}
      <WaterEventCarousel events={SYS.waterEvents} />

      {/* Open loop */}
      <OpenLoopCard />

      {/* Sensors */}
      <SensorsCard />

      {/* Water consumption */}
      <WaterConsumptionCard />

      {/* Insights */}
      <InsightsCard />

      {/* Events Timeline */}
      <EventsTimelineCard />

      {/* Action Policy */}
      <ActionPolicyCard />
    </>
  )
}

function GeneralInfoStub() {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        General Info tab (coming)
      </CardContent>
    </Card>
  )
}

function WaterEventCarousel({ events }) {
  const [i] = useState(0)
  const ev = events[i]
  return (
    <Card className="overflow-hidden py-0">
      <div className="flex items-start gap-3 p-4 pb-3">
        <StatePill state={ev.state} />
        <Badge variant="outline" className="border-border/60 text-foreground font-medium">Ignore</Badge>
        <div className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {i + 1}/{events.length}
        </div>
      </div>
      <div className="px-4 pb-4 flex items-start gap-3">
        <WaveIcon tone="high" />
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold text-foreground leading-tight">{ev.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{ev.flowRate}</div>
        </div>
      </div>
      <Separator />
      <div className="px-4 py-3 grid grid-cols-2 gap-y-1.5 text-xs">
        <span className="text-muted-foreground">Duration</span>
        <span className="text-foreground font-medium text-right">{ev.duration}</span>
        <span className="text-muted-foreground">Detected</span>
        <span className="text-foreground font-medium text-right">{ev.detected}</span>
      </div>
    </Card>
  )
}

function OpenLoopCard() {
  return (
    <Card className="py-4">
      <div className="px-4 flex items-center justify-between">
        <div className="text-base font-semibold">Open loop</div>
        <Badge variant="outline" className="border-border/60 text-primary font-medium">Open</Badge>
      </div>
      <div className="px-4 mt-3">
        {/* Loop diagram box */}
        <div className="bg-[#EEF3FA] rounded-lg p-3 h-32 flex items-center justify-center">
          <svg width="220" height="88" viewBox="0 0 220 88" className="text-primary">
            {/* SUPPLY row (top) */}
            <text x="90" y="10" fontSize="8" fill="currentColor" letterSpacing="2" fontWeight="600">SUPPLY</text>
            <line x1="5" y1="24" x2="55" y2="24" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="65" cy="24" r="8" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="65" cy="24" r="2" fill="currentColor" />
            <line x1="75" y1="24" x2="130" y2="24" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="140" cy="24" r="8" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M148 24 Q 170 24, 170 44" stroke="currentColor" strokeWidth="1.4" fill="none" />
            <polyline points="4,24 10,20 10,28 4,24" fill="currentColor" />
            {/* RETURN row (bottom) */}
            <path d="M170 44 Q 170 64, 148 64" stroke="currentColor" strokeWidth="1.4" fill="none" />
            <line x1="148" y1="64" x2="75" y2="64" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="65" cy="64" r="8" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <line x1="55" y1="64" x2="5" y2="64" stroke="currentColor" strokeWidth="1.4" />
            <polyline points="16,64 10,60 10,68 16,64" fill="currentColor" />
            <text x="90" y="82" fontSize="8" fill="currentColor" letterSpacing="2" fontWeight="600">RETURN</text>
          </svg>
        </div>
      </div>

      {/* Sensor rows */}
      <div className="px-4 pt-3 grid grid-cols-2 gap-3">
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
        <span className="w-2 h-2 rounded-full bg-primary" />
        <span className="font-medium text-foreground">{name}</span>
        <span className="text-primary text-[10px] ml-0.5">%</span>
        <span className="ml-auto text-muted-foreground">…</span>
      </div>
      <Badge variant="outline" className="mt-1.5 border-severity-high/50 text-severity-high bg-severity-high/8">
        <span className="mr-1">⚠</span> Error
      </Badge>
    </div>
  )
}

function SensorsCard() {
  return (
    <Card className="py-4">
      <div className="px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-base font-semibold">5 Sensors</div>
          <Badge variant="outline" className="border-border/60 text-foreground text-[11px]">Close</Badge>
        </div>
        <div className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">1/3</div>
      </div>
      <div className="px-4 mt-3 grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs">
            <Droplet size={14} className="text-foreground/70" />
            <span className="font-medium">Flood</span>
            <span className="ml-auto text-muted-foreground">…</span>
          </div>
          <div className="mt-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-severity-high/8 text-severity-high border border-severity-high/30">
            <span>⚠</span> {SYS.sensors.flood.current} / {SYS.sensors.flood.total} total
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs">
            <ThermometerSun size={14} className="text-foreground/70" />
            <span className="font-medium">Humidity</span>
            <span className="ml-auto text-muted-foreground">…</span>
          </div>
          <div className="mt-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-foreground/80 border border-border/60">
            {SYS.sensors.humidity.current}
          </div>
        </div>
      </div>
    </Card>
  )
}

function WaterConsumptionCard() {
  return (
    <Card className="py-4">
      <div className="px-4 flex items-center justify-between">
        <div className="text-base font-semibold">Water consumption</div>
        <Filter size={16} className="text-foreground/60" />
      </div>
      <div className="px-4 mt-2 grid grid-cols-3 gap-2">
        <Stat top={SYS.consumption.total} bot={SYS.consumption.totalUnit} />
        <Stat top={SYS.consumption.avg} bot={SYS.consumption.avgUnit} />
        <Stat top={SYS.consumption.peak} bot={SYS.consumption.peakUnit} />
      </div>
      {/* Bar chart placeholder */}
      <div className="px-4 mt-3 h-32 flex items-end gap-1">
        {[45, 35, 55, 25, 40, 60, 20, 35, 45, 30, 42, 38, 55, 42, 28, 92, 70, 50, 40, 33, 25, 20, 18, 25, 30, 15].map((h, i) => (
          <div key={i} className="flex-1 rounded-t-sm bg-primary/60" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="px-4 pt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>Apr 1</span><span>Apr 6</span><span>Apr 11</span><span>Apr 16</span><span>A…</span>
      </div>
    </Card>
  )
}

function Stat({ top, bot }) {
  return (
    <div>
      <div className="text-lg font-semibold text-foreground leading-tight">{top}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{bot}</div>
    </div>
  )
}

function InsightsCard() {
  return (
    <Card className="py-4">
      <div className="px-4 flex items-center justify-between">
        <div className="text-base font-semibold">Insights</div>
        <a className="text-xs text-primary hover:underline cursor-pointer">View all</a>
      </div>
      <div className="mt-2">
        {SYS.insights.map((row, i) => (
          <div key={i} className="px-4 py-2.5 border-t border-border/50 first:border-t-0 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-semibold text-foreground truncate">{row.title}</span>
                <span className="text-muted-foreground text-xs truncate">{row.addr}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Droplet size={11} className="opacity-60" /> {row.kind}
              </div>
            </div>
            <div className="w-16 h-8 rounded bg-primary/8 flex items-center justify-center">
              <Sparkline positive={row.deltaTone === 'good'} />
            </div>
            <div className="text-right min-w-16">
              {row.delta && (
                <Badge className={row.deltaTone === 'good'
                  ? 'bg-[#DCFCE7] text-[#166534] border-transparent'
                  : 'bg-[#FEE2E2] text-[#991B1B] border-transparent'
                }>
                  {row.deltaTone === 'good' ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                  {row.delta}
                </Badge>
              )}
              <div className="text-[11px] text-muted-foreground mt-0.5">{row.value}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Sparkline({ positive }) {
  const stroke = positive ? '#5C9E1A' : '#DB4670'
  const path = positive
    ? 'M 2 14 L 12 8 L 22 10 L 32 4 L 42 6 L 52 3 L 62 8'
    : 'M 2 6 L 12 8 L 22 5 L 32 12 L 42 10 L 52 14 L 62 12'
  return (
    <svg viewBox="0 0 64 18" width="60" height="16">
      <path d={path} stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EventsTimelineCard() {
  return (
    <Card className="py-4">
      <div className="px-4 flex items-center justify-between">
        <div className="text-base font-semibold">Events Timeline</div>
        <button className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2.5 py-1">
          All <ChevronDown size={12} />
        </button>
      </div>
      <div className="mt-2 relative">
        {/* Vertical rail */}
        <div className="absolute left-[30px] top-6 bottom-6 w-px bg-border/70" />
        {SYS.timeline.map((row, i) => (
          <div key={i} className="px-4 py-2 flex items-start gap-3 relative">
            {row.tone === 'comm'
              ? <div className="shrink-0 w-6 h-6 rounded-full bg-primary/12 flex items-center justify-center z-10">
                  <Wifi size={12} className="text-primary" />
                </div>
              : <div className="shrink-0 w-6 h-6 rounded-full bg-severity-high/12 flex items-center justify-center z-10">
                  <Waves size={12} className="text-severity-high" strokeWidth={2.5} />
                </div>
            }
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{row.title}</span>
                <StatePill state={row.state} />
                <span className="text-[11px] text-muted-foreground ml-auto">{row.at}</span>
              </div>
              {row.flow && (
                <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span>Flow <b className="text-foreground">{row.flow}</b></span>
                  <span>Volume <b className="text-foreground">{row.volume}</b></span>
                  <span className="inline-flex items-center gap-0.5">Dur <Bell size={10} /> {row.notified} sent</span>
                  <ChevronDown size={12} className="ml-auto opacity-60" />
                </div>
              )}
              {row.body && <div className="mt-1 text-xs text-foreground/80">{row.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ActionPolicyCard() {
  return (
    <Card className="py-4">
      <div className="px-4 flex items-center justify-between">
        <div className="text-base font-semibold">Action Policy</div>
        <a className="text-xs text-primary hover:underline cursor-pointer">View all</a>
      </div>
      <div className="px-4 mt-3 space-y-4">
        {SYS.policy.map((p, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-foreground/70">◔</span>
                <span className="font-medium">{p.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{p.schedule}</span>
            </div>
            <div className="mt-2 bg-[#F5F8FD] border border-border/40 rounded-lg px-3 py-3">
              <div className="flex items-center justify-between text-xs text-foreground/80">
                <span className="inline-flex items-center gap-1"><span>⏻</span> Auto Shutoff <span className="w-1.5 h-1.5 rounded-full bg-severity-high inline-block ml-0.5" /> <b>{p.shutoff}</b></span>
                <span className="inline-flex items-center gap-1"><Bell size={11} /> Alert <span className="w-1.5 h-1.5 rounded-full bg-success inline-block ml-0.5" /> <b>{p.alert}</b></span>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-2">
                <span className="font-medium text-foreground">{p.left}</span>
                <span>{p.window}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
