/**
 * Home — "All accounts" (v2 mobile). Pixel rebuild of the whole page.
 *
 * Design source: Figma file YEmjkKS4xaA827Zm8w3oXx
 *   198314:73471  All accounts                    (375x2155, the default state)
 *   198328:89061  Account_expanded water events   (375x874, the expanded state)
 * Both frames were fetched on their own node, never through a parent that
 * merges variants and hands back the wrong assets.
 *
 * ── Why the class names look like that ─────────────────────────────────────
 * Every utility below is Figma's own output, kept verbatim:
 *     gap-[14px]
 *     px-[var(--pro\/space\/2\,5,10px)]
 *     text-[color:var(--colors\/slate\/800,#1d293d)]
 * Each var() carries its own literal fallback, so the design value renders with
 * no token wiring. They are NOT translated to gap-3 / px-4 / text-slate-800 —
 * that rounding is exactly what made the previous pass (HomeAccountOverview,
 * which used gap-3 / px-4 and no page padding) drift off the comp.
 *
 * CARE: those class names contain a real backslash (`--colors\/slate\/800`).
 * A JSX string attribute does not process escapes, so the backslash survives
 * into the DOM and Tailwind's scanner sees the same bytes. A JS string literal
 * or a cn() argument EATS it, and the rule then silently never applies. So
 * every Figma class here lives in a literal JSX className attribute, repeated
 * inline rather than hoisted into a constant, and the two states that differ
 * only by a gap are written as two whole JSX branches instead of a ternary
 * inside the attribute.
 *
 * ── Fallbacks corrected because this project defines the token ─────────────
 * Figma emits `var(--name, <literal>)`. Where src/index.css already defines
 * that name with a DIFFERENT value the fallback is unreachable, so the design
 * literal is written directly:
 *   --muted-foreground      design #737373 / project #62748e  (Top usage copy)
 *   --secondary-foreground  design #171717 / project #0b81f8  ("Last 30 days")
 *   --foreground            design #0a0a0a / project #0f172b  (header glyphs)
 * Everything else Figma emits here (--colors/slate/*, --spacing/*, --pro/*,
 * --p-0, --rounded-2xl, --wint-blue-accent, --chart/chart-5 — note the escaped
 * slash, which is NOT the project's --chart-5) is undefined in this project, so
 * the verbatim fallback is what renders.
 *
 * ── Shell ─────────────────────────────────────────────────────────────────
 * Phone.jsx is a fixed 393x852 flex column with overflow:hidden; it does not
 * scroll. Figma's "Content" frame is shrink-0 because Figma frames have no
 * scroll model at all — here it is the one scroller (flex:1 + overflowY:auto +
 * minHeight:0) and keeps its designed gap and padding. The Mobile Header Bar
 * stays shrink-0, and TabBar is the last sibling. No min-h-screen: the frame
 * height is not a page height.
 *
 * ── Assets ────────────────────────────────────────────────────────────────
 * Figma's export URLs expire in ~7 days, so nothing references one at runtime.
 * The header glyphs were checked byte-for-byte against the project's own
 * exports before being imported rather than re-inlined: Menu10.jsx == asset
 * aa1add7e (viewBox 11.3769, four #0A0A0A strokes at 1.419) and
 * CustomerSupport.jsx == asset cb20d4d6 (viewBox 21.995x19.995, #0A0A0A at
 * 1.995). The donut's five arcs are the exported bytes, inlined below.
 * Figma served the Huge-Icons/smile glyph for the "Last 30 days" chevron —
 * the Icon Placeholder slot bug this repo has hit before (the exported SVG is
 * a circle plus a smile arc, and the node screenshot plainly shows a caret) —
 * so the project's Phosphor caret-down is used instead of shipping a smiley.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
/* One key only — `home.switch_location`, for the header bar's scope slot.
   The rest of this page is still untranslated; this is not the start of a
   pass, it is the accessible name the drawer suites navigate by, and it has
   to come from the catalogue rather than be spelled out here. */
import { useTranslation } from 'react-i18next'
/* The node's chevron-left / chevron-down are Tabler rasters on expiring
   figma.com/api/mcp/asset URLs, so neither is referenced at runtime. lucide
   carries both at the node's 24px — the same substitution EventOverlayV2 makes
   for the same chevron-left glyph. */
import { ChevronDown, ChevronLeft } from 'lucide-react'
import TabBar from '@/components/TabBar'
import ActiveWaterEventsCard from '@/v2/components/ActiveWaterEventsCard'
/* EventOverlayV2, not EventOverlay. Both were rebuilt from the same five
   frames, but V2 is the corrected one: the Active/History switch is a
   ToggleGroup in the design and the older component renders it as Tabs. The
   page had never been moved over, so tapping "Show all" opened the superseded
   layout. EventOverlay is left in place rather than deleted — it is still the
   reference for that earlier reading. */
import EventFocusOverlay from '@/v2/components/EventFocusOverlay'
import EventOverlayV2 from '@/v2/components/EventOverlayV2'
/* The wave, now that it is the PAGE's and not the hero's — see THE FULL-BLEED
   BAND at the root below. One component, two call sites, so the band and the
   card inside it cannot drift onto two different rasters. */
import HeroWaveArt from '@/v2/components/HeroWaveArt'
import InsightsCard from '@/v2/components/InsightsCard'
import SystemsHealthCard from '@/v2/components/SystemsHealthCard'
import SystemsTableCard from '@/v2/components/SystemsTableCard'
import SystemsFilterSheet from '@/v2/components/SystemsFilterSheet'
import WaterConsumptionCardV2 from '@/v2/components/WaterConsumptionCardV2'
import SystemHealthCard from '@/v2/components/SystemHealthCard'
import SystemsOverviewHero from '@/v2/components/SystemsOverviewHero'
import TriageBand from '@/v2/components/TriageBand'
/* The valve widget. It derives nothing about valves itself — valveScope.js is
   the single source of what a state means and what may be commanded — so this
   page hands it the SAME `scopedSystems` every other card on the screen reads
   and nothing else. */
import ValveManagementCard from '@/v2/components/ValveManagementCard'
import WaterEventFeedbackSheet from '@/v2/components/WaterEventFeedbackSheet'
import WintSidebarV2 from '@/v2/components/WintSidebarV2'
import MonthPickerSheet from '@/v2/components/MonthPickerSheet'
import { CaretDown } from '@/v2/icons'
/* THE header, now that there is only one — owner: "Why on system page we have
   a different header? It always needs to be the same." It was AlertsHeaderBar
   until 2026-11-04 and is mounted on every surface: here, /alerts,
   /system/:id and /valves. It replaced MobileHeaderBar on this page first
   (the owner's "Y-header is still the old one" screenshot was of the bar that
   is gone below) and then everywhere else. MobileHeaderBar is left on disk,
   unused. */
import AppHeaderBar from '@/v2/components/AppHeaderBar'
/* The pill tab row, shared with SystemPageV2Screen. It used to be a local
   `TabTrigger` here and a near-copy of it there; the two drifted apart and the
   owner saw one row dark-slate and the other pale-blue. PillTabs' header
   records which Figma instance each treatment comes from and why they are one
   component with a `tone`, not two designs. */
import PillTabs from '@/v2/components/PillTabs'
/* The chart's window arithmetic — §3.1-§3.6 and the §4 matrix. Shared with
   SystemPageV2Screen so the two screens cannot drift apart, and kept out of
   this file because a page may only export its component. */
import {
  canJumpToToday,
  clampOffset,
  deriveSeriesBounds,
  drillTarget,
  footerLabelFor,
  offsetForPickedMonth,
  pickerMin,
  pickerSelection,
  previousSpanAligned,
  stepAvailability,
  windowMonthsOf,
} from '@/v2/lib/consumptionWindow'
import { SYSTEMS, computeWidgets, computeKPIs, getSystemById } from '@/data/systems'
/* `useUserContext` was imported here for `clearSelectedScope` and nothing
   else, and it left with the house on 2026-11-04. The clear did not go with
   it — it is the Dashboard tab's now (src/components/TabBar.jsx), because the
   drawer-selected scope is the third of useAlertScope()'s three narrowings
   and a home that only changed the route would leave the app scoped to
   wherever the user had been. */
/* THE IGNORE FLOW's three reads, added 2026-10-29 with the fix below. Each is
   the same module SystemPageV2Screen uses, so the two entry points into
   EventFocusOverlay cannot answer differently about one event. */
import { getActiveIncident, getLeakState } from '@/data/incidents'
/* THE ONE DETECTION INSTANT, asked of the module that owns it rather than
   read off a field here — see eventAlertRow.js. A component file may not
   export a plain function in this config, which is why it lives there. */
import { detectedInstant } from '@/v2/components/eventAlertRow'
import { formatDate } from '@/utils/format'
import { ignoreIncident, isIgnored } from '@/data/ignoredIncidents'
import { getCurrentActor } from '@/data/currentUser'
/* The four history sources v1's Alerts screen reads (EventsScreen.jsx:169-174).
   They are the ONLY honest past-event data this app has; the v2 overlay was
   never wired to any of them, which is why its History tab could not render a
   row on any scope. */
import {
  CURRENT_EVENTS,
  HISTORY_EVENTS,
  computeIgnoredEvents,
  computePusherResolvedEvents,
  scopeActiveAlerts,
} from '@/data/events'
/* THE scope rule, reused rather than re-derived — see THE PERSONA WAS NOT IN
   SCOPE at `scopedSystems`. useAlertScope() is the hook /alerts and the tab
   badge both read. */
import { useAlertScope } from '@/hooks/useActiveAlerts'
import { getAccountById } from '@/data/accounts'
import { getConsumption } from '@/data/consumption'
import { getFleetConsumptionSeries } from '@/data/consumptionSeries'
import { getInsightRows, insightValueLabel, INSIGHT_KIND } from '@/data/upstream/insightsModel'
import { computeSystemHealth } from '@/utils/systemHealth'

// ── Mock data ──────────────────────────────────────────────────────────────
// MOCK — replace with the real account roll-up. Every value is the comp's own.

/* The five rows of 198328:89061, verbatim including the repeated address and
   the repeated "Apr 02, 2026 08:13:15". All five are High Flow in the design.
   `valve` is null because the mobile frame draws no valve column — the shape
   ActiveWaterEventsCard takes has one, and leaving it null renders nothing
   rather than inventing a state. `notifiedBy` is the "CN" that card's own
   design node (198209:67180) puts on every row. */
const MOCK_WATER_EVENTS = [
  { id: 'wae-1', systemName: 'Fire Riser 2',     location: 'San Fransisco', address: '1775 Washington St, Hanover MA 2339', type: 'leak-high', valve: null, detectedAt: 'Apr 02, 2026 08:13:15', notifiedBy: 'CN', ignored: false, resolved: false },
  { id: 'wae-2', systemName: '360 Magnolia Row', location: 'Los Angeles',   address: '333 Main Street, Tewksbury MA 1876',  type: 'leak-high', valve: null, detectedAt: 'Apr 02, 2026 08:13:15', notifiedBy: 'CN', ignored: false, resolved: false },
  { id: 'wae-3', systemName: '751 Poplar Court', location: 'Los Angeles',   address: '700 Oak Street, Brockton MA 2301',    type: 'leak-high', valve: null, detectedAt: 'Apr 02, 2026 08:13:15', notifiedBy: 'CN', ignored: false, resolved: false },
  { id: 'wae-4', systemName: '751 Poplar Court', location: 'Los Angeles',   address: '700 Oak Street, Brockton MA 2301',    type: 'leak-high', valve: null, detectedAt: 'Apr 02, 2026 08:13:15', notifiedBy: 'CN', ignored: false, resolved: false },
  { id: 'wae-5', systemName: '751 Poplar Court', location: 'Los Angeles',   address: '700 Oak Street, Brockton MA 2301',    type: 'leak-high', valve: null, detectedAt: 'Apr 02, 2026 08:13:15', notifiedBy: 'CN', ignored: false, resolved: false },
]

/* 198314:73505 — 96% / 8 of 3,431 / 4 · 2 · 1 · 1. That node no longer resolves
   in Figma: the home health card is now 198601:62957 ("Status bar_M", 339 wide,
   which is this page's card width of 375 - 2x8 root - 2x10 content), and it
   draws 100% / 0 of 3,431 / 0 · 0 · 0 · 0 plus a new "Systems types" section.
   The figures below are kept as the SHAPE reference and as the unreachable
   fallback only — `live` resolves whenever SYSTEMS is non-empty, and rendering
   these instead of the fleet is the Floor-26 bug the screen comment warns of. */
const MOCK_HEALTH = { percent: 96, tone: 'healthy' }
const MOCK_HEALTH_STATS = { attention: 8, total: 3431 }
const MOCK_HEALTH_ISSUES = { offline: 4, valve: 2, power: 1, recipients: 1 }

/* I198601:62957;198601:62347 — the three "Systems types" chips (Topology 3,
   Flood 3, Humidity 4). Same contract as the constants above: a shape
   reference and an unreachable fallback, never something to render. */
const MOCK_HEALTH_TYPES = { topology: 3, flood: 3, humidity: 4 }

/* Tapping a health capsule opens Overlay_Alerts (198328:90116) — the same
   surface "Show past alerts" opens, and the same pattern the water-events card
   already uses — pre-filtered to the dimension that was tapped.
   EventOverlay's alerts family has exactly two chips, power-lost ("AC
   Unplugged") and valve-error, so those two capsules seed a real filter.
   Offline systems and Missing recipients have no chip in the design, so they
   open the overlay unfiltered rather than seeding a filter that would match
   nothing and read as an empty list. */
/* PRD 02's canonical vocabulary, and append-only: these keys travel in push
   payloads and shareable links, so they outlive a release.
   `offline` and `recipients` used to map to `all` because the overlay had no
   rows of those kinds at all — so tapping a tile with a number on it opened an
   unfiltered list. Both are real event types now. */
const ISSUE_FILTER = {
  offline: 'offline',
  valve: 'valve-error',
  power: 'power-lost',
  recipients: 'recipients',
}

/* 198314:73639 — four rows. Row 1's address is the literal "352 Palmer.." the
   comp types; rows 2-4 carry the full string and the card truncates it. Row 2
   states a rate, so it has no delta and gets no badge. */
const MOCK_INSIGHTS = [
  { title: 'Domestic Hot 9',     addr: '352 Palmer..',                     kind: 'Usage change',    delta: '-12.5%', deltaTone: 'good', value: '-13,564 L' },
  { title: 'Domestic Hot 9',     addr: '300 Colony Place, Plymouth MA 2360', kind: 'Background flow', delta: null,     deltaTone: 'good', value: '16.1 L/H' },
  { title: '23 Arroyo Resid...', addr: '300 Colony Place, Plymouth MA 2360', kind: 'Usage change',    delta: '+12.5%', deltaTone: 'bad',  value: '+13,564 L' },
  { title: 'Chiller Makeup 26',  addr: '300 Colony Place, Plymouth MA 2360', kind: 'Usage change',    delta: '-12.5%', deltaTone: 'good', value: '13,564 L' },
]

/* 198314:73663 — five legend rows. The comp repeats one row of numbers and
   gives the keys colours that do not match the plot's own arcs; both are kept
   as drawn. Row 1 is bg-[var(--chart\/chart-5,#193cb8)], which resolves to the
   fallback here because this project defines --chart-5, not --chart\/chart-5. */
/**
 * Top usage — the five heaviest systems over the last 30 days, by the real
 * consumption model. The comp ships five identical "Apartment 2 / 13,564 L /
 * 12.5%" rows because it is a picture; every figure here is computed.
 *
 * Ring colours stay the comp's five keys, in its order.
 *
 * KNOWN FROZEN LITERALS — MEASURED, REPORTED, DELIBERATELY NOT GUESSED AT,
 * 2026-10-21. These five keys and the five DonutPlots fills below are the one
 * group on this page that no theme can move, and under `dark` two of them
 * fail: the #193cb8 legend swatch measures 2.14:1 against the card and the
 * #022170 arc 1.21:1, both under the 3:1 WCAG 1.4.11 asks of a graphical
 * object. They are NOT left alone because they are fine; they are left alone
 * because the token set cannot express them yet:
 *   - the chart ramp has THREE blues (--chart-1/2/3). This needs FIVE.
 *   - --chart-4 / --chart-5 are not spare slots. src/index.css calls them
 *     "the semantic escapes for a series that must read as good / critical"
 *     and aliases them to --success / --severity-high; spending them on
 *     "Apartment 2's share of usage" would paint a green and a pink wedge
 *     into a blue donut and burn the two tokens that carry meaning.
 *   - --wave-mid / --wave-deep are the remaining blues and have no `dark`
 *     declaration at all, so binding to them would not fix anything.
 * Mapping them onto the three chart blues plus the two wave blues WOULD fix
 * every dark reading, and would also repaint the light donut (#022170 is a
 * navy; --wave-deep is #0F5FF5). That is a design ruling, not a tokenization
 * mechanic. What this needs is a five-step blue data ramp of its own.
 */
const TOP_USAGE_KEYS = ['#193cb8', '#2b7fff', '#8ec5ff', '#193cb8', '#155dfc']

function buildTopUsage(systems, days = 30) {
  const scored = systems
    .map(s => {
      const daily = getConsumption(s.id, s.name).daily.slice(-days)
      return { system: s, litres: daily.reduce((t, d) => t + d.liters, 0) }
    })
    .sort((a, b) => b.litres - a.litres)
    .slice(0, 5)

  const total = scored.reduce((t, r) => t + r.litres, 0)
  return {
    total: total.toLocaleString('en-US'),
    rows: scored.map((r, i) => ({
      id: r.system.id,
      key: TOP_USAGE_KEYS[i % TOP_USAGE_KEYS.length],
      label: r.system.name,
      value: r.litres.toLocaleString('en-US'),
      unit: 'L',
      share: total ? `${((r.litres / total) * 100).toFixed(1)}%` : '0%',
    })),
  }
}

const MOCK_TOP_USAGE = {
  total: '23,374',
  rows: [
    { id: 'tu-1', key: '#193cb8', label: 'Apartment 2', value: '13,564', unit: 'L', share: '12.5%' },
    { id: 'tu-2', key: '#2b7fff', label: 'Apartment 2', value: '13,564', unit: 'L', share: '12.5%' },
    { id: 'tu-3', key: '#8ec5ff', label: 'Apartment 2', value: '13,564', unit: 'L', share: '12.5%' },
    { id: 'tu-4', key: '#193cb8', label: 'Apartment 2', value: '13,564', unit: 'L', share: '12.5%' },
    { id: 'tu-5', key: '#155dfc', label: 'Apartment 2', value: '13,564', unit: 'L', share: '12.5%' },
  ],
}

// ── Inlined Figma assets ───────────────────────────────────────────────────

/**
 * The donut ring — Figma I198314:73657;6922:4927 "Plots", exported at 150x150.
 * Paths and fills are the export unmodified; the viewBox matches the 150px box
 * the node reserves for it, and the arcs run outer r=75 to inner r=46.85, which
 * is the ring the comp draws. The centre hole in the comp is a second layer
 * (198314:73658), a plain white disc — see TopUsageCard.
 */
function DonutPlots({ className }) {
  return (
    <svg
      width="150"
      height="150"
      viewBox="0 0 150 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M150 75C150 55.562 142.453 36.8832 128.951 22.9006C115.448 8.91809 97.0437 0.724082 77.6175 0.0457048L76.6359 28.1536C88.7773 28.5776 100.28 33.6988 108.719 42.4379C117.158 51.177 121.875 62.8512 121.875 75H150Z" fill="#1C85FE" />
      <path opacity="0.8" d="M77.6175 0.0456996C63.572 -0.444781 49.6712 3.02106 37.5 10.0481C25.3288 17.0751 15.3769 27.3806 8.77895 39.7896L33.6119 52.9935C37.7356 45.2379 43.9555 38.797 51.5625 34.4051C59.1695 30.0132 67.8575 27.847 76.6359 28.1536L77.6175 0.0456996Z" fill="#A8DEFF" />
      <path opacity="0.8" d="M8.77893 39.7896C4.05988 48.6649 1.17305 58.3982 0.289985 68.4112C-0.593081 78.4241 0.545637 88.5125 3.63848 98.0767C6.73131 107.641 11.7152 116.486 18.2939 124.086C24.8726 131.686 32.9119 137.886 41.9341 142.317L54.3338 117.073C48.6949 114.304 43.6703 110.429 39.5587 105.679C35.447 100.929 32.3321 95.4005 30.399 89.4229C28.466 83.4453 27.7543 77.1401 28.3062 70.882C28.8582 64.6239 30.6624 58.5406 33.6118 52.9935L8.77893 39.7896Z" fill="#0A55FF" />
      <path opacity="0.8" d="M41.934 142.317C52.8276 147.668 64.8569 150.296 76.9894 149.974C89.1219 149.652 100.995 146.39 111.589 140.469L97.8684 115.918C91.2469 119.619 83.8262 121.657 76.2434 121.859C68.6606 122.06 61.1422 120.418 54.3337 117.073L41.934 142.317Z" fill="#022170" />
      <path opacity="0.8" d="M111.589 140.469C123.237 133.96 132.937 124.461 139.688 112.953C146.44 101.444 150 88.3429 150 75H121.875C121.875 83.3393 119.65 91.5276 115.43 98.7203C111.21 105.913 105.148 111.85 97.8683 115.918L111.589 140.469Z" fill="#5BB4FF" />
    </svg>
  )
}

// ── Pieces ─────────────────────────────────────────────────────────────────

/**
 * "Top usage" — Figma 198314:73652 (and 198328:89354, identical in the expanded
 * frame). Built here rather than imported because no v2 component owns a donut
 * breakdown yet; every other card on this page is composed, not re-implemented.
 *
 * Two changes to the comp's own geometry, both because the comp is pinned to a
 * 339px artboard and this shell is 375-393 wide:
 *   h-[380px]                  -> min-h-[380px], so a wider row grows the card
 *                                 instead of being clipped by overflow-clip.
 *   left-[170px] absolutes     -> centred on the ring. 170px IS the ring's
 *                                 centre at 339px; centring is the same pixel
 *                                 there and survives 393.
 * The two wrapper frames the comp nests the card in (198314:73650 / :73651,
 * both h-[407px] overflow-clip) are Figma layout scaffolding around a 380px
 * card and are dropped — the card is the thing.
 */
const TOP_USAGE_PERIODS = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: '12m', label: 'Last 12 months', days: 365 },
]

function TopUsageCard({ data, onSelect, onPeriodChange }) {
  const [periodId, setPeriodId] = useState('30d')
  const [menuOpen, setMenuOpen] = useState(false)
  const period = TOP_USAGE_PERIODS.find(p => p.id === periodId) ?? TOP_USAGE_PERIODS[1]

  // Close on Escape and on any outside click — a popover that can only be
  // dismissed by re-tapping its own trigger is a trap on a touch screen.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = e => { if (e.key === 'Escape') setMenuOpen(false) }
    const onDown = () => setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [menuOpen])

  const choose = (p) => {
    setPeriodId(p.id)
    setMenuOpen(false)
    onPeriodChange?.(p)
  }

  return (
    <div
      className="bg-surface-card border border-solid border-card content-stretch flex flex-col gap-0 items-start min-h-[380px] overflow-clip p-0 relative rounded-[18px] shadow-[0px_0px_0px_0px_rgba(0,0,0,0)] w-full"
      data-node-id="198314:73652"
      data-name="Top usage"
    >
      {/* CardHeader — 198314:73655 */}
      <div className="content-stretch flex gap-3 h-[60px] items-center px-4 py-3 relative shrink-0 w-full">
        <div className="content-stretch flex flex-[1_0_0] flex-col gap-2 items-start min-w-px pr-[7px] relative">
          <p className="[word-break:break-word] font-semibold leading-[18px] relative shrink-0 text-slate-800 text-lg tracking-[-0.45px] w-full">
            Top usage
          </p>
        </div>
        {/* The PILL is Figma verbatim — same classes, same geometry, now a real
            button. The POPOVER below it is invented: the comp draws no menu
            anywhere on the delivery canvas, so its styling follows the project's
            card conventions rather than a frame. Swap it for the designed menu
            when one exists. */}
        <div className="relative shrink-0" onPointerDown={e => e.stopPropagation()}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(v => !v)}
            className="bg-muted content-stretch flex gap-1.5 h-[36px] items-center justify-center px-3 py-0 relative rounded-[26px] shrink-0 cursor-pointer"
            data-node-id="I198314:73655;197412:209455;198314:73654"
          >
            <span className="[word-break:break-word] font-medium leading-5 relative shrink-0 text-neutral-900 text-sm whitespace-nowrap">
              {period.label}
            </span>
            <CaretDown
              size={16}
              className="relative shrink-0 text-neutral-900 transition-transform"
              style={{ transform: menuOpen ? 'rotate(180deg)' : undefined }}
            />
          </button>

          {menuOpen && (
            <ul
              role="listbox"
              aria-label="Usage period"
              className="absolute right-0 top-[40px] z-30 min-w-[168px] overflow-hidden rounded-[14px] border border-slate-200 bg-card py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
            >
              {TOP_USAGE_PERIODS.map(p => (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={p.id === periodId}
                    onClick={() => choose(p)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-[14px] text-slate-700 hover:bg-slate-50"
                  >
                    {p.label}
                    {p.id === periodId && <span className="text-primary">✓</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* cardContent — 198314:73656 */}
      <div className="content-stretch flex flex-col gap-3 h-[167px] items-center justify-center overflow-clip px-6 py-0 relative shrink-0 w-full">
        <div className="overflow-clip relative shrink-0 size-[150px]" data-node-id="198314:73657">
          <DonutPlots className="absolute block inset-0 max-w-none size-full" />
          {/* 198314:73658 — the hole. The export is a single
              <circle cx=60 cy=60 r=60 fill="white"/>, i.e. a plain 120px disc. */}
          <span className="-translate-x-1/2 -translate-y-1/2 absolute bg-card left-1/2 rounded-full size-[120px] top-1/2" />
          {/* 198314:73660 / :73661 — the comp stacks these 5.25px apart and sits
              the pair ~2px below the ring's centre. */}
          <span className="-translate-x-1/2 -translate-y-1/2 absolute content-stretch flex flex-col gap-[5.25px] items-center left-1/2 text-center top-[calc(50%+2px)] w-[120px]">
            <span className="font-semibold leading-[27.5px] relative shrink-0 text-slate-800 text-xl tracking-[-0.5px] w-full">
              {data.total}
            </span>
            <span className="font-normal leading-[9.375px] relative shrink-0 text-neutral-500 text-[9.375px] w-full">
              TOTAL LITERS
            </span>
          </span>
        </div>
      </div>

      {/* Legend — 198314:73663, five "Chart / Tooltip / Tooltip Item" rows. */}
      <div className="content-stretch flex flex-col gap-[9px] items-start pb-4 px-4 relative shrink-0 w-full" data-node-id="198314:73663">
        {data.rows.map((row) => (
          /* Each legend row names a real system, so it navigates to it. The
             comp draws these as static text because a Figma frame has no
             routing; leaving them inert made the card look like a picture of
             a list. Rendered as a real <button> rather than a clickable div so
             it is keyboard-reachable and announced as an action. */
          <button
            key={row.id}
            type="button"
            onClick={onSelect ? () => onSelect(row.id) : undefined}
            disabled={!onSelect}
            aria-label={`${row.label} — ${row.value} litres, ${row.share} of top usage`}
            className="content-stretch flex items-center justify-between p-0 relative shrink-0 w-full text-left enabled:cursor-pointer enabled:hover:opacity-70 disabled:cursor-default"
          >
            <div className="content-stretch flex gap-[8px] items-center min-w-px relative">
              {/* The key's colour is per-row data, so it is an inline style —
                  a class built in JS would lose the `\/` escape anyway. */}
              <span
                className="relative rounded-[2px] shrink-0 size-[8px]"
                style={{ background: row.key }}
              />
              <p className="[word-break:break-word] font-normal leading-3 overflow-hidden relative min-w-px text-neutral-500 text-[12px] text-ellipsis whitespace-nowrap">
                {row.label}
              </p>
            </div>
            <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
              <div className="[word-break:break-word] content-stretch flex font-normal gap-0.5 items-center leading-3 relative shrink-0 text-[12px] whitespace-nowrap">
                <p className="overflow-hidden relative min-w-px text-slate-800 text-ellipsis">
                  {row.value}
                </p>
                <p className="overflow-hidden relative min-w-px text-neutral-500 text-ellipsis">{row.unit}</p>
              </div>
              <div className="bg-muted content-stretch flex gap-1 h-[20px] items-center justify-center overflow-clip px-2 py-0.5 relative rounded-[26px] shrink-0">
                <p className="[word-break:break-word] font-medium leading-4 overflow-hidden relative min-w-px text-slate-800 text-[12px] text-ellipsis whitespace-nowrap">
                  {row.share}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── THE TWO HALVES OF "what does this route name mean" ───────────────────
   Scope here resolves BY NAME, not by node id, and a name can land on either
   of two different things: a level in the location tree, or an account. Both
   halves used to live inline inside the `scopedSystems` filter, which was fine
   while the only question was "is this system in scope". It is not any more:
   ValveManagementCard needs to know WHICH half matched, so its confirm sheet
   can say "Every system at this location" or "Every system in this account"
   and be right.

   That is one decision, and a decision made in two places is a decision made
   twice — the rule valveScope.js was extracted to state. So the predicates are
   named once here and both the filter and the `scopeKind` memo call them. The
   filter's behaviour is byte-identical to the inline version it replaced,
   including the `||` order. */

/** The location tree: account > l1 (country) > l2 (Office / Residential) > l4
 *  (building). All FOUR levels, l1 included — omitting l1Name made
 *  /location/United%20States match nothing and render the empty-scope zeros
 *  for a node the drawer itself labels 103. l3Name is matched too though it is
 *  empty in this dataset: buildTree.js documents L3 as the level the MRG
 *  export leaves unused, and a dataset that populates it should scope on it
 *  rather than silently miss. */
function matchesLocationName(s, name) {
  return s.l4Name === name || s.l3Name === name || s.l2Name === name || s.l1Name === name
}

/** Accounts are routable by name too. s.account is a Salesforce id, but SFDC
 *  carries the name alongside it and getAccountById resolves it — which is how
 *  the drawer labels these rows "Meridian Realty Group (MRG)" in the first
 *  place. A parent account rolls its children up, so scoping to MRG returns
 *  its own 101 systems plus the 2 under Southbridge Health rather than only
 *  the direct ones. */
function matchesAccountName(s, name) {
  const acct = getAccountById(s.account)
  if (!acct) return false
  if (acct.name === name) return true
  return getAccountById(acct.parentId)?.name === name
}

/* ── WHERE HOME IS, PER USER — MOVED OUT 2026-11-04 ───────────────────────
   `LEVEL_NAME_KEYS` and `topLevelFor` lived here, because the header's house
   lived on this page. The owner then deleted the house — "I want to
   completely remove the home icon ... Just remove it" — and its job moved to
   the Dashboard tab in src/components/TabBar.jsx.

   The rule went with the job, unchanged, to src/utils/homeTarget.js: two
   files need one answer, and a page component may not export a plain
   function in this config (`react-refresh/only-export-components` is an
   ERROR). The same reason `detectedInstant` and the consumption-window
   helpers are imported above rather than written here.

   NOTHING ON THIS PAGE READS IT ANY MORE, which is why there is no import:
   the house was its only caller. `clearSelectedScope` and the `useUserContext`
   import went the same way — this page had no other use for either. */

// ── Screen ─────────────────────────────────────────────────────────────────

/**
 * @param expanded  false renders 198314:73471, the page with no active water
 *                  events; true renders 198328:89061, the same page with the
 *                  water-events list open. It is a state of this one screen,
 *                  not a second route — the only differences across the two
 *                  frames are the water-events card's contents and the Body
 *                  wrapper's gap (14px -> 10px).
 */

/* Which month offset 0 actually is used to be parsed back out of the daily
   period label here. It is read off the series KEYS now, in
   @/v2/lib/consumptionWindow — the labels differ per grouping ("September
   2026", "Jun 2025 - May 2026", "N / A") and the regex that lived here matched
   only the three-letter form, so on the real label it returned null and the
   picker quietly fell back to the wall clock. The rule it was reaching for is
   unchanged and now holds at every grouping: offsets are measured from the
   last reading in the series, never from "now" (PLS-WC-06). */

export default function HomeAllAccounts({ expanded = false }) {
  /* Figma "Location opt b" (198328:88654) is this screen retitled, so scope is
     a route param rather than a second page. */
  const { locationName } = useParams()
  const scopeTitle = locationName ? decodeURIComponent(locationName) : 'All Accounts'
  const { t } = useTranslation()

  /* THE ROUTE IS THE SCOPE.
     WintSidebarV2's header states the v2 model explicitly: the drawer is
     navigation only and never mutates UserContext scope the way v1's did
     ("which is why Home silently re-scoped itself behind the user's back").
     Scope therefore arrives as this route param and nothing else.
     That was only half-built. `locationName` reached `scopeTitle` and stopped
     there — every aggregate below read the whole of SYSTEMS — so /location/Office
     retitled the page to "Office" and still reported all 103 systems, the same
     six pills and the same fleet consumption. Every location looked identical
     because every location WAS the fleet.
     Only location rows route here (WintSidebarV2.activate: systems go to
     /system/:id, nodes above a location just expand), and the drawer passes
     node.name, so matching the three location levels on the system record is
     the whole resolution step. */
  /* ── THE PERSONA WAS NOT IN SCOPE — 2026-11-04 ─────────────────────────
     Signed in as `tenant-1apt` (Sofia, one apartment) this page reported
     "103 systems" on the hero and "12 / 103 need attention" on the health
     card under it. The route half of the scope was built (above); the USER
     half was never built at all, so every persona saw the whole fleet. It
     predates today and was invisible until the tab badge beside it started
     telling the truth: the badge said 1 and the hero said 103, a few pixels
     apart.

     ONE RULE, NOT A THIRD COPY. src/hooks/useActiveAlerts.js states the scope
     for /alerts and for the tab badge, and src/data/events.js's
     `scopeActiveAlerts` IS that rule - three independent narrowings (the
     persona's own systems, the ?scope= deep link, the drawer's selected
     location) with the documented convention that an EMPTY visibleIds set
     means "no persona filter" rather than "no systems". Writing those three
     again here keyed on `s.id` would be a third copy of a rule this repo has
     already drifted on once, so the systems are shimmed into the shape that
     function reads (`{ system }`) and handed to it. It costs one map over 103
     records and it cannot drift.

     IT NARROWS THE WHOLE PAGE, not only the hero, and that is deliberate.
     `live` is derived from this one set and feeds the hero AND the health
     card, so scoping the hero alone would have printed "1 system" directly
     above "12 / 103 need attention" - swapping one contradiction for a worse
     one. Every other card here (the table, the consumption chart, valve
     management, insights) already reads this same set, which is the property
     that makes the screen agree with itself. */
  const alertScope = useAlertScope()
  const scopedSystems = useMemo(() => {
    const all = SYSTEMS ?? []
    const byRoute = (() => {
      if (!locationName) return all
      const name = decodeURIComponent(locationName)
      /* Both halves are the module-level predicates above; see the note there
         for why they are named rather than inlined. The `||` order is the
         original's and is load-bearing for `scopeKind` below. */
      return all.filter(s => matchesLocationName(s, name) || matchesAccountName(s, name))
    })()
    return scopeActiveAlerts(byRoute.map(s => ({ system: s.id, s })), alertScope).map(x => x.s)
  }, [locationName, alertScope])

  /* `homeTarget` was derived here, off `alertScope.visibleIds`, for the
     header's house. It is `homeTargetFor(visibleIds)` in
     src/utils/homeTarget.js now and is read by the Dashboard tab — see the
     note where the house stood, further down this file. */

  /* WHICH HALF MATCHED — derived, never guessed from the string.

     ValveManagementCard's confirm sheet states how wide a bulk open / close
     reaches, and it has exactly two sentences for it: "Every system at this
     location" and "Every system in this account". Picking between them by
     eyeballing the name ("looks like a street address, must be a location")
     is the kind of guess that is right until an account is called
     "220 Harborview Ave" — which three of this dataset's seventeen accounts
     already are. So it asks the same predicates the filter asks.

     LOCATION WINS A TIE, because the filter's `||` puts it first and because
     the drawer only ever routes LOCATION rows here (WintSidebarV2.activate:
     systems go to /system/:id, account rows just expand). The three colliding
     names above arrive from a location row, and a location is what they mean.

     A NAME THAT MATCHES NEITHER keeps 'location' and costs nothing: the scope
     is empty, summariseValves reports total 0 and the card renders null, so
     no sentence is ever built from this value. The empty-scope rule below is
     untouched — this derives a LABEL, never a set. */
  const scopeKind = useMemo(() => {
    /* Unscoped — / and /pixel, where scopeTitle is "All Accounts". 'account'
       is the honest one of the two: every account in this dataset is a child
       of Meridian Realty Group, so the fleet IS one account's hierarchy, and
       "every system at this location" would be plainly false. It is still not
       the sentence the fleet deserves; a third 'fleet' kind in
       BulkValveConfirmSheet.jsx:253 would be, and that file is the owner's. */
    if (!locationName) return 'account'
    const name = decodeURIComponent(locationName)
    const all = SYSTEMS ?? []
    if (all.some(s => matchesLocationName(s, name))) return 'location'
    if (all.some(s => matchesAccountName(s, name))) return 'account'
    return 'location'
  }, [locationName])

  /* A name that matches nothing yields an empty scope, NOT the fleet. An empty
     location is a real state here — the drawer deliberately keeps locations
     with no systems — and the cards all have zero states. Falling back to the
     fleet is what produced the bug above: fleet numbers under a location's
     name, which reads as truth and is not. */

  /* Real aggregates. The MOCK_* constants below are SHAPE references and
     fallbacks only — rendering them directly is the Floor-26 bug: a screen that
     looks right and reports numbers belonging to nothing. computeWidgets and
     computeKPIs already derive these from the scoped set; the page just wasn't
     asking, and then was asking with the wrong set. */
  const live = useMemo(() => {
    const systems = scopedSystems
    /* An empty SCOPE is a real state — the drawer deliberately keeps locations
       that hold no systems — and it has to render zeros. Returning null here
       hands every card its `?? MOCK_*` fallback instead, so an empty location
       would report 96%% health over 3,431 systems: the Floor-26 bug wearing a
       location's name. Only a completely absent dataset returns null, which is
       what those fallbacks are actually for. */
    /* THE GATE IS "IS THERE A DATASET", NOT "IS THERE A ROUTE NAME", 2026-11-04.
       It read `locationName ? zeros : null`, which was right while the only
       way to hold an empty set was to name a location that matched nothing.
       The persona narrowing above adds a second way: a user who can see no
       systems at all, on `/`, where locationName is undefined. That fell
       through to `null` and handed every card its `?? MOCK_*` fallback - the
       Floor-26 bug (96% health over 3,431 invented systems) wearing a real
       user's session instead of a location's name. The test is now the one
       this branch's own note already claimed: "Only a completely absent
       dataset returns null, which is what those fallbacks are actually for." */
    if (!systems.length) {
      return (SYSTEMS ?? []).length
        ? {
            waterEvents: [],
            /* NOT 100. 100% of nothing is a perfect score for a scope that
               holds no systems to protect — the Floor-26 bug in one number.
               `null` is the card's "no figure" signal and renders an em
               dash; every count below is a true zero and stays a zero. */
            health: { percent: null, tone: 'healthy' },
            /* Same shape as the populated branch below, field for field. It
               used to publish `requireAttention` here and `healthy` /
               `waterEvents` there, so the two branches did not agree on what
               a scope even reports. */
            stats: { total: 0, healthy: 0, waterEvents: 0 },
            issues: { offline: 0, valve: 0, power: 0, recipients: 0 },
            systemTypes: { topology: 0, flood: 0, humidity: 0 },
            insights: [],
          }
        : null
    }

    const widgets = computeWidgets(systems) ?? {}
    const kpis = computeKPIs(systems) ?? {}

    /* WATER EVENTS ONLY — the strip above the fold says "Water events" and
       must count water events.
       `systems.filter(s => s.alert)` STOOD HERE until 2026-10-22 and took ANY
       alert, `offline` / `valve-error` / `power-lost` included, so device
       faults were counted here and listed as leaks. At 220 Harborview that
       printed "Water events 2" over a scope with none, and the two rows under
       it were an Offline system and a system with no external power, both
       drawn as "Low Flow". Fleet-wide the pill read 23 where 19 systems are
       leaking; Office read 19 where 15 are. The gap was exactly the non-leak
       alerts. It stayed invisible because nearly every faulted system also
       carried a leak that masked it, until a dataset change produced faults
       standing on their own.
       This is the same conflation as the `healthy` count below, running the
       other way: that one let water events damage a health number, this one
       let device faults inflate a water-event one.
       src/utils/systemHealth.js owns the predicate — `isLeak`, a leak-high or
       leak-low alert that has not been ignored — and its header says it is
       the single definition deliberately, so this reads it rather than
       spelling a second copy that can drift away from the drawer and the
       system page. */
    const activeWaterEvents = systems.filter(s => computeSystemHealth(s).isLeak)

    /* Systems Health is the FOUR PROTECTION CHECKS, not leaks.
       docs/PRD/09-system-health-widget.md defines a healthy system as one
       that has communicated recently, has no valve error, has external power
       if applicable, and has at least one alert recipient. A Water Event is
       NOT one of them — 03-home-screen.md:207 states it outright: "Systems
       Health bar unaffected by Water Events directly — leaks aren't a
       'Systems Health' gap; they live in the Water Events strip above."
       This used to count `!s.alert`, i.e. leaks only, which is a different
       measurement wearing this one's label: it reported 46% for a fleet that
       is 66% protected, and it would report a clean 100% for a scope whose
       every system was offline so long as none of them was leaking.
       src/utils/systemHealth.js already implements PRD 09 exactly and is
       already the drawer's and the system page's definition, so this reads
       it rather than growing a second one that can drift.

       Rounding is FLOOR, not round, and the result is capped at 99 whenever
       a single system fails a check (PRD 09:77 and 09:62: "must NEVER show
       100% when any system has an issue"). Math.round took 99.6% to 100%,
       which is the one thing the spec forbids. 100 is therefore reachable
       only through the equality below — never through arithmetic. */
    const healthy = systems.filter(s => computeSystemHealth(s).allOk).length
    const percent =
      healthy === systems.length ? 100 : Math.min(Math.floor((healthy / systems.length) * 100), 99)

    return {
      /* Mapped into the row shape ActiveWaterEventsCard actually reads
         (id / systemName / location / address / type / detectedAt / duration).
         It used to receive raw system records, so `e.type` was undefined on
         every row: the card's High and Low filter chips counted 0 while All
         counted every alert. The alert type lives at s.alert.type. */
      waterEvents: activeWaterEvents.map(s => ({
        id: s.id,
        systemName: s.name,
        /* Figma's two slots are CITY then STREET (199359:129095 draws
           "San Fransisco | 1775 Washington St…"). MRG has no city level: l4 is
           the site, which IS the street, and `address` is synthesised from the
           same breadcrumb — so feeding both slots the obvious fields printed
           "30 Dogwood Dr | 30 Dogwood Dr, Office", the same place twice.
           The division (Office / Residential) is the only real second term
           this dataset has, so it takes the slot; where a scope genuinely has
           a distinct street it still wins. */
        location: s.l4Name || s.l3Name || s.l2Name || '',
        address: (() => {
          const site = s.l4Name || s.l3Name || ''
          const street = s.locationAddress || s.address || ''
          if (street && !street.startsWith(site)) return street
          return s.l2Name || ''
        })(),
        type: s.alert?.type ?? null,
        valve: s.valve ?? null,
        /* ── A BARE CLOCK, IN A FIELD NOTHING DRAWS YET — 2026-11-04 ──────
           This read `s.alert?.startedAt`: "23:38" and nothing else, no day.

           NOT CURRENTLY ON SCREEN, and that is said plainly rather than
           implied: this page mounts `TriageBand` with these rows, and
           TriageBand's row (199359:129097) draws the system, the place and the
           DURATION — no detection time at all. So the bare clock here was not
           a visible defect and dating it is not a visible fix. The field is
           still corrected, for two reasons: it is the row shape
           `ActiveWaterEventsCard` reads (its own Figma fixture fills this slot
           with "Apr 02, 2026 08:13:15"), so the first surface to draw it would
           have inherited the defect; and a bare clock sitting in a field named
           `detectedAt` is the exact shape of the bug this change removes.

           REPORTED, NOT DECIDED: that Home and the location page show a
           duration and no detection instant at all is a product question for
           the owner, not something to settle inside a data fix.

           The long 'tooltip' shape matches that card's own fixture and the
           System page's card. The card-vs-long disagreement between those and
           the event hero is the owner's open question and is NOT settled
           here. */
        detectedAt: formatDate(detectedInstant(s.alert), 'tooltip'),
        duration: s.alert?.age ?? '',
        notifiedBy: null,
        ignored: false,
        resolved: false,
      })),
      /* PRD 09:87 gives the gauge exactly two states: "Green when 100% (all
         healthy), accent color otherwise." `'attention'` was neither of the
         two strings WaveGauge actually branches on ('intermediate' and
         'error'), so the tint never rendered and the gauge stayed its
         untinted blue at every percentage. No extra thresholds are invented
         here: >= 90 was a band the PRD does not define. */
      health: { percent, tone: percent === 100 ? 'healthy' : 'intermediate' },
      /* HEALTH IS ERRORS. WATER EVENTS ARE NOT HEALTH.
         Owner, 2026-10-21: "we need to make a super clear separation between
         health which is errors and water events they are not the same —
         system can be 100% health but with active water event."
         They were not separate here. `healthy` counts systems passing the
         four PRD-09 checks (comm / valve / power / recipients) and was
         computed above, then thrown away: the card was fed
         `total - requireAttention`, and requireAttention is the LEAK count.
         At 210 Harborview that printed "5 / 5 need attention" over a single
         Offline tile, because four of the five had a water event and no fault
         at all.
         Both numbers are published now, each under a name that says which it
         is, so a caller cannot reach for the wrong one by accident. */
      stats: {
        total: systems.length,
        /** Systems with no device fault — the health number. */
        healthy,
        /** Systems with an ACTIVE WATER EVENT. Not a health measure. */
        waterEvents: activeWaterEvents.length,
        /* `requireAttention: activeEvents.length` STOOD HERE until 2026-10-22,
           marked @deprecated. A deprecation note is not a fix: the field was
           still the leak count, still named as if it were a health number, and
           SystemsHealthCard still read exactly that name into the attention
           capsule beside its four fault tiles. Deleted rather than renamed,
           and the prop is gone from that card too, so a caller reaching for it
           now gets `undefined` and renders a visible 0 — wrong in a way that
           shows — instead of a plausible wrong number. The two real figures are
           `healthy` and `waterEvents` above; a consumer that wants "how many
           need attention" subtracts `healthy` from `total`. */
      },
      /* The four issue pills of 198601:62957 — Offline systems / Valve errors /
         Disconnected power / Missing recipients.
         computeWidgets NESTS these (`widgets.valves.error`,
         `widgets.power.acLost`, `widgets.comm.offline`); the flat
         `widgets.valveErrors` / `.powerLost` / `.noRecipients` this used to read
         exist on neither rollup, so three of the four `??` chains fell all the
         way through to MOCK_HEALTH_ISSUES on EVERY render — the card reported
         the constants 2 · 1 · 1 rather than the fleet's 12 · 10 · 4. That is the
         Floor-26 bug named above, so the real paths are read now.
         "Missing recipients" has no rollup at all; it is counted here off the
         same `notificationRecipients` field the web's home uses for that
         dimension (src/screens/home/HomeUnified.jsx), and a .length needs no
         fallback. The `?? MOCK_*` tails that remain are shape guards only: each
         left-hand side resolves, and 0 is not nullish, so a genuine zero now
         reaches the card — which also makes its designed all-clear state and
         "Show past alerts" link reachable for the first time, since valve/power/
         recipients could never be 0 while they were pinned to the constants. */
      issues: {
        offline: widgets.comm?.offline ?? kpis.offline ?? MOCK_HEALTH_ISSUES.offline,
        valve: widgets.valves?.error ?? MOCK_HEALTH_ISSUES.valve,
        power: widgets.power?.acLost ?? MOCK_HEALTH_ISSUES.power,
        recipients: systems.filter(s => (s.notificationRecipients || 0) === 0).length,
      },

      /* "Systems types" — the labelled section 198601:62957 gained below its
         second divider (rule I198601:62957;198601:62344, frame ;62347): three
         chips, Topology / Flood / Humidity, each with a count badge, wrapped
         onto two rows (Topology + Flood, then Humidity). The markup belongs to
         SystemsHealthCard.jsx; this page is that card's only data supplier, so
         the counts originate here.
         The comp draws 3 · 3 · 4. Those are picture figures. What is actually
         knowable: the MRG snapshot behind SYSTEMS is a water-system export —
         every record carries a valve, a meter and a pipe topology — and it holds
         no flood and no humidity device records at all (the same gap
         src/v2/pages/SystemPage.jsx documents at its `sensors` block). So
         Topology is the whole fleet and the other two are honestly 0 here. Do
         NOT paste the comp's 3 and 4 back in and do not synthesise them from a
         hash; ASK for a sensor dataset instead. */
      systemTypes: {
        topology: systems.length,
        flood: 0,
        humidity: 0,
      },
      // The web guarantees a MIX of insight kinds rather than the first four
      // it finds — without that the list reads as repeats of whichever kind
      // dominates. See src/data/upstream/insightsModel.js.
      insights: getInsightRows(systems, 4).map(row => ({
        title: row.name,
        addr: row.address,
        kind: row.label,
        delta: row.kind === INSIGHT_KIND.BACKGROUND_FLOW ? null : insightValueLabel(row),
        deltaTone: row.kind === INSIGHT_KIND.USAGE_UP ? 'bad' : 'good',
        value: insightValueLabel(row),
        systemId: row.systemId,
        series: row.series,
        baseline: row.baseline,
        insightKind: row.kind,
      })),
    }
    /* `locationName` left the deps with the branch that read it: the
       empty-scope gate is on the DATASET now, and SYSTEMS is a module
       constant. `scopedSystems` already carries every scope change, route
       name included. */
  }, [scopedSystems])

  const navigate = useNavigate()
  // Days shown by the Top usage card. Held here rather than in the card because
  // the figures come from the dataset, and a screen must never be the thing
  // holding data the card only displays.
  const [topUsageDays, setTopUsageDays] = useState(30)
  const [tab, setTab] = useState('overview')
  /* System tab filters. Held here rather than in the card because the sheet is
     an overlay and every wrapper Figma emits is `relative` — rendered inside
     the tab body it would be trapped there instead of covering the frame. */
  const [systemFilters, setSystemFilters] = useState({})
  const [systemFiltersOpen, setSystemFiltersOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // null | 'water' | 'alerts' — which dataset the full-list overlay is showing.
  const [overlay, setOverlay] = useState(null)

  /* The system id whose event is open in EventFocusOverlay, or null. The
     water-event row used to navigate to /alert/:systemId (the v1 LeakDetail
     screen); the owner asked for the focused Event overlay instead — "when
     clicking here it shall open the Event overlay as we spoke before". Held
     as state rather than a route so the page behind it stays mounted and its
     scroll position survives the round trip. */
  const [focusedEventSystemId, setFocusedEventSystemId] = useState(null)

  /* ── THE IGNORE FLOW, WIRED — 2026-10-29 ────────────────────────────────
     Owner: "we have a bug / why ignore action only available from system page
     and not also when user clicks on event from location view".

     IT WAS EXACTLY ONE MISSING PROP. EventFocusOverlay gates Ignore on
     `Boolean(onIgnore)` — deliberately, so a control never promises a
     destination its host has not wired — and this page passed none. The note
     that stood at the mount said as much and said to wire it "once
     WaterEventFeedbackSheet lands". It has landed; SystemPageV2Screen has
     mounted it since 2026-10-17. This is that wiring, built against the
     2026-10-29 overlay rather than the footer it replaced.

     NOTHING ELSE WAS GATED OFF. Checked one by one before fixing, because
     the report was that Assign, Remove and the valve were missing here too:
       Assign to me   gated on `isWater && !ignored && !investigating`
       Remove         gated on `isOwner`
       valve card     gated on `hasValve`, i.e. the system's own devices
     None of the three reads a prop, so all three already work from this page.
     `onClaim` / `onStandDown` are repaint hints for the HOST's own cards and
     the overlay repaints itself without them; this page's water rows come
     from computeSystemHealth over SYSTEMS, which no claim touches, so there
     is nothing here for them to repaint and they stay unpassed rather than
     wired to a no-op.

     `valve` STAYS UNPASSED TOO, and that is a decision, not an omission. On
     the System page that prop is a seam onto `closedValves`, which is that
     page's state of record; this page has no valve state at all. Duplicating
     the seam's no-device branch here would create exactly the drift its own
     comment warns about, and inventing a second state of record would be
     worse than having none. EventFocusOverlay documents the prop-less mount
     (`confirmedValve`, "a mount that owns no valve state still shows the user
     what they just did"), so a valve change made from this entry point is
     confirmed and shown but not recorded page-side. WHETHER THE VALVE SHOULD
     BE OPERABLE FROM THE LOCATION VIEW AT ALL IS A PRODUCT QUESTION, and it
     is reported rather than answered here. */
  const [ignoreFlowSystemId, setIgnoreFlowSystemId] = useState(null)
  /* Module-level stores have no in-memory cache, so a commit is asked for as
     a repaint — the same seam SystemPageV2Screen calls `bump`. It is what
     redraws the overlay behind the sheet in its ignored state. */
  const [, setIgnoreTick] = useState(0)
  const bumpIgnore = () => setIgnoreTick(n => n + 1)
  const ignoreFlowSystem = ignoreFlowSystemId ? getSystemById(ignoreFlowSystemId) : null

  /* The data decides, not the route. 198314:73471 and 198328:89061 are two
     STATES of one card — healthy, and has-events — so pinning the default route
     to [] made the card claim "No active water events" above a health card
     reporting 52 that need attention. MOCK_WATER_EVENTS stays reachable only
     when there is no dataset at all (live === null), which is what it is for. */
  const waterEvents = live ? live.waterEvents : (expanded ? MOCK_WATER_EVENTS : [])

  /* ── THE LOCATIONS COUNT — Figma 199955:96839, the hero's new eyebrow ──────
     "12 Locations" above "244 systems". The 12 is the frame's example value, so
     this is derived, not transcribed.

     THE RULE IS REUSED, NOT RE-DERIVED. `new Set(l4 || l3)` is what
     AccountScreenV2:417 already counts for the word "Locations" on the profile
     screen (`more.scope_counts.locations`), over the same kind of set. Two
     surfaces naming the same count must not answer differently, and the
     alternative in the repo - HomeUnified's `locationsBelow` - is the STRICT
     NEXT-LEVEL rule, which answers "how many places one step below where I am
     standing" and returns 0 at an L4 building. That is a different question
     from "how many places am I looking at", which is what an eyebrow over a
     fleet count asks.

     OVER `scopedSystems`, which is the same set the hero's own total, the
     health card, the valve card and the systems table all read, so the eyebrow
     cannot disagree with the number under it. It is therefore persona-scoped
     for free - the whole point of heroPersonaScope. */
  const locationCount = useMemo(
    () => new Set(scopedSystems.map(s => s.l4 || s.l3).filter(Boolean)).size,
    [scopedSystems],
  )

  const topUsage = useMemo(
    () =>
      scopedSystems.length
        ? buildTopUsage(scopedSystems, topUsageDays)
        /* Same rule as `live`, and corrected with it on 2026-11-04: an empty
           SCOPE renders empty, and only an absent DATASET reaches
           MOCK_TOP_USAGE. A persona who can see nothing on `/` used to take
           the null branch here too. */
        : (SYSTEMS ?? []).length
          ? { total: '0', rows: [] }
          : null,
    [scopedSystems, topUsageDays],
  )

  /* Plots whatever is in scope — the whole fleet on /, one location on
     /location/:name.
     Memoised on (period, offset) only: SYSTEMS is a module constant and the
     per-system profiles behind this are cached, so switching granularity is a
     re-bucket rather than 100-odd regenerated series. */
  /* Which chip Overlay_Alerts opens on. Held here rather than inside the
     overlay because the capsule that was tapped is what decides it. */
  const [overlayFilter, setOverlayFilter] = useState('all')

  /* Which side of the Active/History toggle the overlay opens on. "Show past
     events" and "Show past alerts" say PAST in their own labels and were
     landing on Active, which is the one tab that cannot answer them. */
  const [overlayTab, setOverlayTab] = useState('active')

  const openOverlay = (dataset, { filter = 'all', tab = 'active' } = {}) => {
    setOverlayFilter(filter)
    setOverlayTab(tab)
    setOverlay(dataset)
  }

  /* Rows for the overlay, both families in one array — it selects by
     `TYPES[e.type].dataset === family` itself, so water and alert rows can
     travel together. Without this the overlay fell back to its own MOCK_EVENTS
     and reported "8 of 62" over invented systems while the card above it
     counted the real 52.
     Alerts are derived from device state rather than from s.alert: a system
     with AC lost or a valve error is an alert whether or not it also has a
     leak, which is why the health pills count 10 and 12 while only some of
     those carry s.alert. Ids are suffixed because one system can appear in
     both families. */
  /* ── History ──────────────────────────────────────────────────────────────
     Everything above this line is CURRENT system state, so every row it emits
     carries `resolved: false` — and EventOverlayV2 builds its History tab from
     `!!e.resolved` (EventOverlayV2.jsx:462). The tab was therefore guaranteed
     empty on every scope, for every persona, which is what "Show past events"
     and "Show past alerts" were opening.
     The honest past data already exists and is what v1's Alerts screen reads
     (EventsScreen.jsx:169-174). It is read here, in the ROW BUILDER — the
     overlay's filter is right, it was simply never given a resolved row.

     Two of the four sources are session state and are legitimately empty in a
     fresh browser; they are wired anyway because they are the ones that fill
     the moment the pusher simulator closes an incident:
       computePusherResolvedEvents()  localStorage sim-event log
       computeIgnoredEvents()         DEPRECATED 2026-06-15 (PRD 14 §2.4) and
                                      returns [] by contract. Ignored Water
                                      Events stay on ACTIVE while the flow is
                                      still running (PRD 03a:65, and
                                      ignoredStaysOnActive.dom.test.jsx); they
                                      reach History only once the flow ends, by
                                      which point they arrive through
                                      computePusherResolvedEvents() as
                                      "Resolved". Nothing about the Active
                                      count changes — an ignored system still
                                      carries `s.alert` and is still counted
                                      above.
     Nothing is synthesised: a source with no rows contributes no rows and the
     overlay renders its own empty state (EventOverlayV2.jsx:663). */
  const overlayEvents = useMemo(() => {
    const rows = []

    /* SCOPE. The Active rows are built by walking `scopedSystems`; the history
       sources are FLEET-WIDE arrays keyed by system id, so this map is what
       holds History to the same scope rather than leaking the whole fleet into
       a location page. */
    const inScope = new Map(scopedSystems.map(s => [s.id, s]))

    const baseOf = (s) => ({
      /* The row's own `id` is composite (`<system>:<kind>`), so the system is
         carried separately rather than parsed back out of it. */
      systemId: s.id,
      systemName: s.name,
      city: s.l4Name || s.l3Name || s.l2Name || s.l1Name || '',
      address: s.locationAddress || s.address || '',
    })

    for (const s of scopedSystems) {
      const base = baseOf(s)
      if (s.alert?.type === 'leak-high' || s.alert?.type === 'leak-low') {
        rows.push({
          ...base,
          id: `${s.id}:water`,
          type: s.alert.type,
          /* THE INSTANT, not the clock. `EventOverlayV2.formatStamp` parses
             an ISO and falls through to `String(value)` on anything else — so
             this row used to print a bare "22:50" directly beneath the history
             rows below, which pass `ev.timestamp` and therefore print
             "Nov 03, 2026 22:50:09". One list, two spellings, from the same
             dataset. Now one. */
          timestamp: s.alert.startedAtIso ?? '',
          duration: s.alert.age ?? '',
          resolved: false,
        })
      }
      if (s.power === 'ac-lost') {
        rows.push({ ...base, id: `${s.id}:power`, type: 'power-lost', timestamp: '', duration: '', resolved: false })
      }
      if (s.valve === 'error') {
        rows.push({ ...base, id: `${s.id}:valve`, type: 'valve-error', timestamp: '', duration: '', resolved: false })
      }
      /* The health card counts these two and PRD 02 names both as filter keys,
         but neither had ever been emitted here — which is why their tiles
         opened an unfiltered list. */
      if (s.comm === 'offline') {
        rows.push({ ...base, id: `${s.id}:offline`, type: 'offline', timestamp: '', duration: '', resolved: false })
      }
      if ((s.notificationRecipients ?? 0) === 0) {
        rows.push({ ...base, id: `${s.id}:recipients`, type: 'recipients', timestamp: '', duration: '', resolved: false })
      }
    }

    /* One past row, mapped into the shape EventRow actually reads — the v1
       records carry `system`, `path` and `detail`, none of which this overlay
       draws, and carry no city/street split, which it does. Both come off the
       system record, exactly as the Active rows above take them.
       `duration` is deliberately NOT set: formatDuration prefers it and falls
       through to `durationSec`, which is what these sources carry. */
    const pushPast = (ev, kind) => {
      const s = inScope.get(ev.system ?? ev.systemId)
      if (!s) return
      rows.push({
        ...baseOf(s),
        id: `${kind}:${ev.id}`,
        type: ev.type,
        timestamp: ev.timestamp ?? '',
        durationSec: ev.durationSec ?? null,
        resolved: true,
      })
    }

    /* v1's own order (EventsScreen.jsx:169-174), kept: whatever closed in this
       session comes first, then the generated history, which is already sorted
       newest-first. The overlay does not re-sort. */
    for (const ev of computeIgnoredEvents()) pushPast(ev, 'ignored')
    for (const ev of computePusherResolvedEvents()) pushPast(ev, 'resolved')
    for (const ev of CURRENT_EVENTS) if (ev.resolved) pushPast(ev, 'closed')
    for (const ev of HISTORY_EVENTS) pushPast(ev, 'history')

    return rows
  }, [scopedSystems])

  /* PLS-WC-03 / §2: MONTHLY is the default grouping at every level. This page
     opened on Daily, which answers "what did this month look like, day by
     day" — a question the home screen is not asking. Twelve months is what
     says most about what is happening now; Yearly says least. */
  const [consumptionPeriod, setConsumptionPeriod] = useState('M')
  const [consumptionOffset, setConsumptionOffset] = useState(0)

  /* NO DRILL TRAIL HERE ANY MORE. §20.1 / PLS-WC-15 kept a `consumptionTrail`
     of the {period, offset} each drill-down was launched from, to drive the
     "‹ Back to Monthly" pill above the chart. The owner saw that pill on
     2026-10-20 — "what is back to monthly? remove it." — so the pill and its
     `returnFromDrill` went, and on this page NOTHING ELSE READ THE TRAIL: it
     was written by the drill and cleared by the grouping control and Today,
     and never read again. Dead state, so it went with the pill.

     SystemPageV2Screen is the other half of this and keeps its trail, because
     the hero's "See more" reads `periodTrail[0]` to unwind a drill. This page
     has no hero and no "See more" — the chart is always on screen — so there
     is nothing here to unwind. If a hero ever lands on this page, the trail
     comes back with it.

     What the removal costs: after drilling Monthly -> Daily, picking Month
     from the grouping dropdown resets the offset to 0 (§3.1) and lands on the
     newest twelve months, not the window the drill was launched from. That
     window is still reachable with the period stepper or the Select period
     sheet, just not in one tap. The owner accepted that; do not restore the
     pill without asking him. */

  const consumptionView = useMemo(
    () => getFleetConsumptionSeries(scopedSystems, consumptionPeriod, consumptionOffset),
    [scopedSystems, consumptionPeriod, consumptionOffset],
  )

  /* PLS-WC-06 — where this scope's series actually starts and ends, read back
     out of the data layer rather than from the clock. Every offset below is
     measured from it, and the step controls (§3.2) and the picker (§3.3) take
     both their limits from it, so neither can offer a window the series cannot
     fill. */
  const consumptionBounds = useMemo(
    () => deriveSeriesBounds((period, offset) => getFleetConsumptionSeries(scopedSystems, period, offset)),
    [scopedSystems],
  )

  /* The advanced period selector. Same interaction as the system page:
     the trigger between the chevrons belongs to the card, the sheet belongs
     to the page because the frame covers the whole phone. */
  const [pickerOpen, setPickerOpen] = useState(false)

  /* The newest selectable month, in the sheet's own {month, year} shape.
     It used to be parsed out of the daily label ("September 2026") by a regex
     that only matched three-letter months, so it resolved to null and the
     sheet silently fell back to the wall clock. It is read off the series keys
     now — see deriveSeriesBounds. */
  const latestMonth = useMemo(
    () => (consumptionBounds
      ? { month: consumptionBounds.lastMonth.m, year: consumptionBounds.lastMonth.y }
      : null),
    [consumptionBounds],
  )
  /* §3.3 — the picker opens on the window's LAST bucket: the one the label
     names and the one a pick replaces. */
  const selectedMonth = useMemo(
    () => pickerSelection(consumptionPeriod, consumptionOffset, consumptionBounds),
    [consumptionPeriod, consumptionOffset, consumptionBounds],
  )
  /* §3.3 — every month the window covers, so the grid marks the whole window
     and not only its end. Monthly only: at Daily the window IS one month. */
  const consumptionWindowMonths = useMemo(
    () => (consumptionPeriod === 'M' ? windowMonthsOf(consumptionView.series) : undefined),
    [consumptionPeriod, consumptionView],
  )

  /* §4: a pick sets the period and keeps the grouping and the comparison. */
  const applyMonth = (selection) => {
    setConsumptionOffset(offsetForPickedMonth(consumptionPeriod, selection, consumptionBounds))
    setPickerOpen(false)
  }

  /* "Compare previous period" — the window immediately before the one on
     screen. Computed only while the switch is on, since it is a second pass
     over every system in scope.

     CLAMPED TO THE SAME SPAN since 2026-10-21. This screen is unchanged in
     every other way — it still opens on Monthly (PLS-WC-03), it still has no
     hero caption and so no month-to-date window of its own — but the card it
     shares with the System page now offers the comparison on DAILY as well as
     Monthly, and on a Daily window the previous month is a WHOLE month while
     the current one may be part-way through. Handed over unclamped, the
     comparison would draw past today: September 22-30 laid against October
     days that have no reading yet. previousSpanAligned cuts it to the span
     actually read, which is the same rule the System page applies and the
     same function, so the two screens cannot drift. At Monthly it is a no-op
     — twelve read buckets against twelve. */
  const [compareConsumption, setCompareConsumption] = useState(false)
  const consumptionCompare = useMemo(
    () => {
      if (!compareConsumption) return null
      const previous = getFleetConsumptionSeries(
        scopedSystems, consumptionPeriod, consumptionOffset - 1,
      ).series
      return previousSpanAligned(consumptionView.series, previous)
    },
    [compareConsumption, consumptionView, scopedSystems, consumptionPeriod, consumptionOffset],
  )

  /* ── The chart's actions ────────────────────────────────────────────────
     §4 is NORMATIVE about what each one keeps and what it resets, and the
     PRD's own note is that the commonest defect in this chart is an action
     resetting something the user expected to keep. Each handler below states
     the row it implements. */

  /* §3.1 — selecting a grouping ALWAYS returns to the newest window, and is
     therefore never a way back to a period you were looking at (§3.6). Since
     2026-10-20 it is the ONLY way back up out of a drill-down on this page,
     and it is a reset, not a return — see the note where the trail used to
     be. */
  const selectConsumptionPeriod = (next) => {
    setConsumptionPeriod(next)
    setConsumptionOffset(0)
    /* PLS-WC-20 made the comparison Monthly-only and this cleared it for
       anything else. Daily joined Monthly on 2026-10-21 (see the card's
       COMPARABLE_PERIODS), so clearing it on a move to Daily would switch off
       a control the card is still drawing — the user would watch his own
       comparison vanish for no stated reason. Hourly and Yearly still clear,
       because the card withdraws the switch there. */
    if (next !== 'M' && next !== 'D') setCompareConsumption(false)
  }

  /* §3.2 — one step moves ONE bucket, and keeps everything else. The clamp is
     what makes the chevrons stop at the ends rather than walk past the data;
     canStepPrev / canStepNext below disable them there (PLS-WC-09). */
  const stepConsumption = (delta) =>
    setConsumptionOffset((offset) => clampOffset(consumptionPeriod, offset + delta, consumptionBounds))

  /* §3.5 / PLS-WC-12-13 — opening a period is the ONLY action that changes the
     grouping without resetting the period. The window moves to the period
     containing the bucket's LAST reading, so opening 2025 gives January to
     December 2025 rather than the twelve months ending in January. */
  const drillIntoBucket = (bucketKey) => {
    const target = drillTarget(bucketKey, consumptionBounds)
    // Hourly is the floor of the series and a bucket with no reading has
    // nothing behind it — §3.5's two blocked cases both land here.
    if (!target) return
    setConsumptionPeriod(target.period)
    setConsumptionOffset(target.offset)
    // Same rule as selectConsumptionPeriod above: Daily keeps the comparison.
    if (target.period !== 'M' && target.period !== 'D') setCompareConsumption(false)
  }

  /* §3.4 — Today: Hourly on the newest window, the picker closed, and the
     comparison cleared (§4). */
  const jumpToToday = () => {
    setConsumptionPeriod('H')
    setConsumptionOffset(0)
    setCompareConsumption(false)
    setPickerOpen(false)
  }

  const consumptionSteps = stepAvailability(consumptionPeriod, consumptionOffset, consumptionBounds)

  /* ── THE HERO — Figma 199954:96289 "Main header", re-read live 2026-11-04 ──
     It is the only thing above the tab row now. The LIVE frame reorders the
     block the morning's read had: image -> tabs -> health, not image -> health
     -> tabs. `Header mobile` (199955:96847) is a child of `Account Main header`
     at y=126 inside a 162-tall block, i.e. the tabs ARE the block's last 36px,
     and the health card has moved out of the block entirely to y=178 as a
     sibling BELOW it.

     WHICH SETTLES WHERE THE HEALTH CARD BELONGS. Anything after the tab row is
     the tab's panel, and `Water events` - which has only ever been Overview
     content - is the very next sibling after the health card, at the same
     level. So the health card is Overview's, and it is in `cards` below with
     the rest of that panel. Not ambiguous, and so not reported as such.

     ONLY THE HERO IS ABOVE THE TABS, which means only the hero is common to
     all three tabs. That is a smaller claim than the morning's layout made and
     it is the frame's.

     NOTHING WAS REMOVED to get here. The hero and the health card were the
     first two Overview cards; the hero moved up above the tab row and the
     health card stayed exactly where it was in the panel. The only card whose
     owner changed is the hero, and it gained two tabs rather than losing one. */
  /* ── THE COLLAPSING HEADER — 2026-11-04 ───────────────────────────
     Owner, shown the fully fixed block: "Currently it takes too much place
     when scrolling. I want only the — from the bottom, up to the header with
     all accounts and the icon — to be kind of scrolling up. And then only
     title, the open navigation and tabs are floating."

     So the eyebrow, the headline and the chips scroll away; the TITLE, the
     NAV BUTTON and the TAB ROW never do; and the artwork stays behind them as
     a short slice all the way down. It supersedes two earlier readings of the
     same complaint on the same day — "all needs to be scrolled including the
     waves", then "keep this area stuck" — and all three are consistent: what
     he objected to each time was the HALF-AND-HALF, artwork holding still
     while its own content slid off it. This is the resolution. The artwork and
     its content collapse TOGETHER, onto a floor that keeps the controls.

     THE NUMBERS, measured at 393x852 rather than chosen:
       HEADER_BAR   54  pt-[4px] + the 40px nav button + pb-[10px]
       HERO_H      130  eyebrow + headline + chip row - what collapses
       TAB_ROW      32  PillTabs
       BAND_H      205  the artwork. The owner's explicit size. UNCHANGED.
     and the two they produce:
       COLLAPSE    138  the scroll distance the collapse runs over - near
                        enough the hero's own height that it moves 1:1 with the
                        finger and reads as content scrolling rather than as an
                        effect. See BAR_TO_TABS for the extra 8.
       the band      205 -> 109. 109 is where it has to stop: the tab row lands
                        at y=72..104 collapsed, and the design already leaves
                        5px of ground past the tabs at rest (band 205, tabs
                        210). So the tabs sit ON the artwork once collapsed and
                        on page ground at rest - new, and measured for contrast
                        in both states. It is DERIVED from BAR_TO_TABS below,
                        not written down, so the owner's next trim moves the
                        band's floor with it.

     WHAT MOVES, AND WHY EACH ONE MOVES THAT WAY:
       · the band   clip-path, inset from the BOTTOM. NOT a height and NOT a
                    translate. Height would re-crop it every frame - the layer
                    is object-cover object-bottom, so shrinking the box slides
                    a different slice of raster under the title and the
                    artwork appears to move on its own. A clip leaves every
                    surviving pixel exactly where it was, so the wave simply
                    gets shorter; it also makes the ground under the title and
                    the tabs IDENTICAL in both states, which is what lets one
                    contrast measurement answer for both (both are taken).
       · the hero   translateY + opacity, inside a window clipped at the bar's
                    bottom edge, so it slides UNDER the bar the way a large
                    title does on iOS and can never paint over the controls.
       · the tabs   translateY only. They are LAID OUT at the collapsed
                    position and pushed DOWN at rest, which is the whole trick:
                    the chrome column measures 104px at every scroll position,
                    so the scroller never resizes and the handler can never
                    feed back into its own input.

     NOTHING ANIMATES A LAYOUT PROPERTY AND NOTHING RE-RENDERS. The handler
     writes ONE custom property on the root per frame; every transform is a
     calc() off it, so React is not in the loop at all. No animation library
     (this repo has none and is not getting one), and no `animation-timeline:
     scroll()`, which is Chromium-only while this app ships to Safari.

     THE SCROLLER'S paddingTop IS THE COLLAPSE DISTANCE, and that is the one
     thing this pattern gets wrong when it gets wrong: without it the first
     card starts where the collapsed header ends and jumps down by 130px the
     moment you touch the scroll. Measured at scrollTop 0 to prove it does not.

     prefers-reduced-motion: NOT honoured, deliberately. Nothing here is
     time-based - every pixel of movement is one the finger asked for, which
     is what "content scrolls" means. Freezing the hero over content moving
     underneath it would be strictly more disorienting than the collapse.
     Revisit if the owner reports otherwise. */
  const HEADER_BAR = 54
  const HERO_H = 130
  const TAB_ROW = 32
  /* ── THE GAP UNDER THE BAR — 2026-11-04 ────────────────────────
     Owner, on the collapsed header: "ok much better — but we still can reduce
     a bit spacing between title/header to tabs."

     THE WHOLE STACK, measured at 393x852 collapsed, between the nav button's
     lower edge and the tab track's upper edge:

       10  AppHeaderBar's own pb-[10px]   node 199922:83959. UNTOUCHED - the
           bar is 54px and the band's height is arithmetic off that, the 40x40
           nav button is a tap target and not decoration, and this bar is on
           five screens.
       18  this column's gap                 -> 10. THE ONE THAT CHANGED.
        3  PillTabs' track padding        p-[3px] inside its 32px. Untouched;
           it is the trigger's own hit area.
       = 28 before, 20 after. A 29% trim, which is what "a bit" bought.

     NOT A FIGMA DEPARTURE — it is a RETURN. 199532:82461 emits gap-[10px];
     the 18 was mine, taken an hour earlier so the hero would still land on
     its measured y=80 when it moved into this column. The hero stays at 80
     anyway, because its window is positioned off the bar rather than off this
     gap (see the window's own top offset below), so the trim lands on the
     COLLAPSED state only and the expanded layout is pixel-identical.

     The two states genuinely wanted different treatment: collapsed, the title
     and the tabs sit directly together and 28px read as slack; expanded, the
     hero is between them and nothing about that gap is visible at all. */
  const BAR_TO_TABS = 10
  /* ── AIR UNDER THE TABS — 2026-11-04 ───────────────────────────
     Owner, straight after the trim above: "and add padding on the bottom so
     tabs will be a bit upper."

     It is the pinned block's bottom padding, and it was 5px. 5 was never a
     designed value - it is what fell out of the band stopping at 205 while the
     tab row started at 210 - and collapsed it left the row sitting on the
     artwork's edge with no air under it at all. At 12 the row sits 12px off
     the block's floor instead of 5, which is the "a bit upper" he is after:
     the tabs do not move on the screen, the floor underneath them does.

     THE BLOCK DOES NOT GROW INTO THE CONTENT. Whatever this takes, the root's
     gap below gives back - ROOT_GAP is 18 - TABS_TO_FLOOR - so the distance
     from the tab row to the first card is the same 18 it has always been and
     the first card still lands on y=260 at rest. All this moves is WHICH SIDE
     of the block's edge those pixels fall on, and therefore how far the
     artwork runs past the row.

     COLLAPSED HEIGHT: 101px -> 108px of the 852 frame. It has not crept back
     toward the 234 the fixed block cost; it is 7px, and it is the 7px he
     asked for.

     ⚠ THE OTHER READING, so it is one number if this one is wrong. "tabs"
     has also meant the FLOATING BOTTOM BAR in this conversation, and "add
     padding on the bottom so tabs will be a bit upper" parses as raising that
     pill off the frame's lower edge. That inset is TAB_BAR_BOTTOM_INSET = 12
     in src/components/tabBarMetrics.js; 12 -> 24 would lift it by 12. It is
     NOT done here and must not be done alone: TAB_BAR_CLEARANCE is 12 + 65 +
     16 = 93 and seventeen scrollers hard-code that 93, with
     tabBarFloatingClearance.dom.test.jsx holding the list. Raising the inset
     without raising the clearance puts every screen's last row back under the
     pill. */
  const TABS_TO_FLOOR = 12
  const ROOT_GAP = 18 - TABS_TO_FLOOR
  /* The scroll distance, and the hero's travel. It is the hero's height plus
     the 8px the tab row gives back by being laid out 8px higher, so the row
     still comes to rest on the node's y=210 with the hero above it. */
  const COLLAPSE = HERO_H + (18 - BAR_TO_TABS)
  /* The chrome column is HEADER_BAR + the root gap + TAB_ROW = 104px at
     every scroll position. It is not spelled as a constant because nothing
     sets it: it is what the flow produces, and that is the invariant. */

  const rootRef = useRef(null)
  const scrollerRef = useRef(null)

  /* THE DRIVER. rAF-throttled, passive, and it writes two things: `--hdr-t`
     (0 expanded, 1 collapsed) and the hero's pointer-events.

     The pointer-events half is not tidiness. The hero sits in an overlay above
     the scroller's top padding; once it has travelled far enough to be
     invisible it still occupies the strip between the bar and the tabs, so a
     tap there would land on a hero nobody can see. It is released at the
     half-way point, by which time the chips have fully faded.

     It runs once on mount and again on every tab change, because switching
     tabs keeps the scroll position while replacing the content: without that,
     the variable would still describe the panel you just left. */
  useEffect(() => {
    const sc = scrollerRef.current
    const root = rootRef.current
    if (!sc || !root) return undefined
    let frame = 0
    const apply = () => {
      frame = 0
      const t = Math.min(1, Math.max(0, sc.scrollTop / COLLAPSE))
      root.style.setProperty('--hdr-t', String(t))
      const hero = root.querySelector('[data-name="hero-collapse"]')
      if (hero) hero.style.pointerEvents = t < 0.5 ? 'auto' : 'none'
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(apply) }
    apply()
    sc.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      sc.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [COLLAPSE, tab])

  const scopeBlock = (
    /* 199954:96288 "Account Main header", 358x162 — the hero and the tab row as
       ONE block, because the node makes them one and because the tabs sit flush
       under the hero with no gap. Wrapping them is what keeps the scroller's
       own gap-[20px] from opening between them; a negative margin would do it
       too and would be a worse way to say "these are one thing".

       358 is 390 minus a 16px gutter each side — which is exactly what this
       page's own px-4 already produces inside the 393 shell. Nothing is
       hard-coded to 358 or 370. */
    /* ITS HEIGHT IS THE TAB ROW'S, 32px, not the 162 of hero+tabs. The hero
       is an absolutely positioned overlay inside it and contributes nothing to
       the column, which is what keeps the chrome a constant 104px while the
       header collapses. See THE COLLAPSING HEADER above. */
    <div className="relative shrink-0 w-full h-[32px]" data-node-id="199954:96288">
      {/* THE HERO'S WINDOW. Its upper edge is pinned to the header bar's lower
          edge (y=62 at 393x852) by cancelling the column gap above this block,
          and `overflow-hidden` is what makes the hero slide UNDER the bar
          instead of across it.

          IT IS OFFSET BY THE GAP, NOT BY A LITERAL, and that is what kept the
          expanded layout still when the owner asked for the collapsed gap to
          be trimmed: the window moves with the gap, and the hero inside it
          moves back by the same 18 it always sat at, so the hero stays on its
          measured y=80 whatever BAR_TO_TABS becomes.

          790px tall so its own lower edge never clips anything - the zero-chip
          explainer panel deliberately overflows the hero's box and must
          survive. pointer-events-none because the window spans the page; the
          hero inside it takes its own, from the driver. */}
      {/* ── z-[1] — THE UPSELL PANEL WAS PAINTING UNDER THE TAB ROW ────────
          Owner, with a screenshot of the `Humidity sensors` zero-chip panel
          with the tab row drawn across its text: "this is also broken. Tooltip
          needs to be above everything, not below the tabs."

          WHY IT BROKE. The panel hangs below the chip row and deliberately
          overflows the hero's box — it always has, and it used to overflow
          onto the health card, which came AFTER it in the scroller. The
          collapsing header moved the tab row into this block, i.e. into the
          panel's drop zone and AFTER it in tree order. Both this window and
          the row sit at z-auto inside the chrome's stacking context, and the
          hero's own `z-[2]` cannot help: `hero-collapse` below carries a
          transform, which makes it a stacking context, so everything inside
          it is sealed at that element's level.

          THE FIX IS INSIDE THE CHROME'S OWN CONTEXT, not a global escalation.
          The chrome is `relative z-[2]`, which IS a stacking context, so a
          z-index here cannot escape it: this window outranks the tab row and
          nothing else, and the order outside is untouched —
            scroller auto -> TabBar host auto -> band z-[1] -> chrome z-[2]
            -> drawer 10/11 -> EventFocusOverlay 50 -> push 300.
          The drawer still covers the panel and the floating pill is still
          hit-testable; both verified in the browser in all four themes.

          THE HERO DOES NOT NOW PAINT OVER THE TABS, which is the thing to
          check when raising a sibling: at rest the hero ends where the row
          begins, and as the header collapses the hero travels AWAY from the
          row and is at opacity 0 before it could reach it. Only the panel,
          which hangs past the hero's box, ever overlaps. */}
      <div
        className="pointer-events-none absolute inset-x-0 z-[1] h-[790px] overflow-hidden"
        style={{ top: -BAR_TO_TABS }}
        data-name="hero-window"
      >
        <div
          className="absolute inset-x-0"
          /* 1.6 rather than 1: the hero has to be invisible BEFORE it reaches
             the bar, not as it arrives. At 1.6 it is gone by t=0.625, with its
             top still 1px below the frame edge. */
          style={{
            top: BAR_TO_TABS + 8,
            transform: `translateY(calc(var(--hdr-t, 0) * -${COLLAPSE}px))`,
            opacity: 'calc(1 - var(--hdr-t, 0) * 1.6)',
          }}
          data-name="hero-collapse"
        >
      {/* ── THE WAVE IS THE PAGE'S NOW, NOT THIS CARD'S ─────────────────────
          Owner: "I want the image and the entire header to be with the image
          as provided in the link in Figma." 199954:96290 is positioned OUTSIDE
          its parent on every axis - it runs 173px up past the header bar and
          out past both sides - so it stopped being a card's background and
          became the ground the header and this hero sit on.

          `artwork={false}` because THE BAND AT THE ROOT is already painting
          exactly this raster behind exactly this box. Two copies would double
          the #a0ccff multiply and draw a seam along the hero's top edge.

          `z-[2]` is load-bearing, not tidiness. The hero's zero-chip explainer
          panel hangs 4px under the chip row and deliberately overflows this
          box - it used to overflow onto the health card and now overflows onto
          the tab row, which is its next sibling. Siblings paint in source
          order, so without a stacking position here the panel would be drawn
          UNDER the tabs and read as clipped. */}
      <SystemsOverviewHero
        className="z-[2]"
        artwork={false}
        total={live?.stats?.total ?? 0}
        /* 199955:96839. DATA, not the frame's `12` - see `locationCount`. */
        locations={locationCount}
        systemTypes={live?.systemTypes}
        /* A chip is a shortcut into the Systems tab, filtered to that type.
           The hero and the table already speak the same vocabulary —
           SYSTEM_TYPE.FLOW / FLOOD / HUMIDITY is what the `type` filter
           category reads through systemTypeOf — so this sets the selection
           the filter sheet would have set, rather than inventing a parallel
           path. Replaces the whole selection on purpose: the chip states one
           complete intent ("show me the flood sensors"), and merging it into
           whatever was already applied could land on an empty table for
           reasons the user cannot see. */
        onSelectType={type => {
          setSystemFilters({ type: [type] })
          setTab('systems')
        }}
      />
        </div>
      </div>

      {/* ── THE TAB ROW — 199955:96847, "just below the image" ──────────────
          Owner: "And then take the tabs just below the image and implement it
          now." It sat in the chrome group above the scroller until 2026-11-04,
          10px under the header bar. The live frame puts it at y=126 inside the
          162-tall hero block, 5px under the image's bottom edge (the image
          ends at y=121) - which is as literally "just below the image" as a
          frame can say it.

          ⚠ IT DOES NOT SCROLL, AND THAT IS THE OWNER'S, 2026-11-04. This note
          used to say the opposite — that the row scrolling away was a cost the
          frame's position obliged this page to pay, reported but not fixed.
          He answered it, on a screenshot of /location/100 Meridian Plaza
          showing the bar, the hero and this row: "all these area needs to be
          fixed including the tabs."

          So THIS WHOLE BLOCK IS CHROME, and the three readings that were open
          an hour ago all close with it:
            · CHROME     taken. It costs this screen 180px of scroller — 764
                         -> 584 at 393x852, measured, with the figures in THE
                         STUCK BLOCK below. That cost was the reason this was
                         rejected before; the owner has now made the trade
                         himself and the numbers are reported to him.
            · STICKY     NOT taken, and no longer needed. It was the middle
                         answer and it had its own defect: PillTabs draws no
                         track, so a stuck row needs a surface this design has
                         not got, and --app-bg is a five-stop gradient that
                         cannot be repainted in a 32px strip without showing
                         the wrong slice of itself. Inside the chrome the row
                         sits on the artwork and never passes over content, so
                         it needs no surface at all.
            · SCROLLING  what this file did between the two rulings, and what
                         produced "this is bad".
          Its POSITION is untouched — still the node's, still 5px under the
          image's bottom edge, still "just below the image".

          THE ROW ITSELF IS UNTOUCHED — same PillTabs, same items, same node
          ids, same rulings.

          ⚠ AND IT IS STILL PillTabs, NOT src/components/ui/tabs.jsx.
          199955:96847 was re-fetched live and draws the ui/tabs treatment: a
          slate-200 track at h-[32px] radius 10, a white active pill with a 1px
          #0b81f8 border and two stacked shadows, and a slate-400 count badge
          reading 8. ui/tabs.jsx is that node's twin - already built from
          199922:83970, already on three screens, down to the same 32px row. It is NOT adopted here
          because PillTabs' Ruling 2 (2026-10-21, the owner) is still in force
          for BOTH pages and BOTH states, ui/tabs.jsx's own header says which
          control a pixel-matched page should use "is the owner's call, not
          this file's", and PillTabs' says it "must not be repointed at it
          without the owner". Swapping only the Dashboard would put a different
          tab row on the Dashboard and the System page - the exact drift the
          owner complained about in October and the reason PillTabs exists.
          REPORTED, NOT RESOLVED: if the new node supersedes Ruling 2 it
          supersedes it on both screens, and that is one ruling, not one
          edit. */}
      {/* PINNED. It is laid out at the COLLAPSED position (y=80, directly
          under the bar) and translated DOWN by the collapse distance while the
          header is open, so at rest it lands on the node's own y=210 and ends
          up under the bar with nothing re-laid-out on the way. */}
      <div
        className="content-stretch flex items-center justify-between relative shrink-0 w-full"
        style={{ transform: `translateY(calc((1 - var(--hdr-t, 0)) * ${COLLAPSE}px))` }}
        data-node-id="199955:96847"
        data-name="home-tabs"
      >
        <PillTabs
          nodeId="199360:129743"
          slotNodeId="I199360:129743;101485:143349"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'overview', label: 'Overview' },
            /* ── CONFLICT, REPORTED NOT RESOLVED — AND IT RECURS ────────────
               Figma labels the middle trigger "Locations" and gives it a count
               Badge. This tab opens the SYSTEMS table (SystemsTableCard,
               scoped by scopedSystems), so the label is left as "Systems" and
               the count reports what the tab actually opens. Renaming it would
               change what the control means, not how it looks, and would break
               anyone — including systemsTabScope — who navigates by name. The
               owner has to decide whether the design wants a genuine Locations
               tab. `grow: false` is the node's: this trigger is shrink-0
               because its Badge makes it intrinsically wide.

               199955:96847 REPEATS IT, badge and all, and its badge reads a
               literal `8` — the same `8` that recurs across unrelated nodes in
               this file on surfaces that cannot count 8. It is the frame's
               example value, not a measurement, and the count drawn here is
               live. One more frame drawing "Locations 8" is not new evidence;
               it is the same unanswered question asked again. Nothing renamed,
               no Locations tab invented.

               THE HERO NOW DRAWS A REAL LOCATION COUNT four lines above this
               row (199955:96839, `locationCount`). That is the honest reading
               of what the design keeps asking for and it does NOT make this
               trigger a Locations tab: the eyebrow REPORTS locations, this
               control OPENS systems. */
            { id: 'systems', label: 'Systems', count: live?.stats?.total ?? null, grow: false },
            { id: 'general', label: 'General Info', pill: 'wide' },
          ]}
        />
      </div>
    </div>
  )

  /* The Overview cards, in the node's order. Held in a variable so the tab
     body below stays one expression per tab.
     The two states no longer wrap these differently: 199360:129787 (ALERT)
     and 199371:137036 (CALM) both stack at gap-20, so the 14px/10px split
     that used to branch on `expanded` is gone with the frames it came from.
     `expanded` still selects MOCK_WATER_EVENTS when there is no dataset.

     THE HERO LEFT THIS LIST on 2026-11-04 — see `scopeBlock` above. It is the
     only thing the live frame puts ABOVE the tab row, so it renders for every
     tab now. The health card did NOT leave: 199960:26493 sits at y=178, after
     the tab block and immediately before `Water events`, which is Overview's
     own card. Anything after the tab row is the panel. */
  const cards = (
    <>
      {/* System health — Figma 199323:12124 (alert) / 199371:137037 (calm), and
          199960:26494 in the restructured frame; the states draw it
          byte-identically. It carries the healthy/attention progress bar and
          the three fault tiles the design specifies (Valve errors · Offline ·
          No power).

          IT SUPERSEDES THE TOP HALF OF TriageBand below, which answered the
          same question before that node could be opened. The band keeps the
          half the design ALSO has and this card does not: the worst few
          events, with their location.

          ── WHAT CHANGED ON 2026-11-04 AND WHAT DID NOT ────────────────────
          `className="-mt-[37px] z-[1]"` IS GONE, and that is the restructure,
          not a lost style. The 37px was the node's overlap of this card into
          the hero's wave, from the four "Accont / location" variants where the
          card was pinned at top-[152px] inside a 398-tall group under a
          189-tall wave. In the live frame the card is not in that group at
          all: `Account Main header` is the hero plus the TAB ROW, and this
          card is the next sibling after it at y=178, with a plain 16px gap.
          There is nothing left for it to overlap - pulling it up 37px now
          would pull it over the tabs.

          EVERY PROP BELOW IS UNCHANGED. The four counts, the three handlers
          and the two filter shortcuts are the same calls on the same data. */}
      <SystemHealthCard
        total={live?.stats?.total ?? 0}
        /* The error-free count, NOT total minus leaks — see the note on
           `stats` above. A system with an active water event and no fault is
           healthy, and this card is the one that says so. */
        healthy={live?.stats?.healthy ?? 0}
        valveErrors={live?.issues?.valve ?? 0}
        offline={live?.issues?.offline ?? 0}
        noPower={live?.issues?.power ?? 0}
        /* PRD 09's FOURTH protection check, and the one with no tile. It is
           already inside `healthy` above — and therefore inside the card's
           `attention` — so for a long time this screen could show three empty
           tiles and the all-clear line above "1 / 10 need attention", which is
           what /location/Building B does. The card draws Figma's own answer to
           that now (199338:52997, "N other issues · N no recipients"), and
           this is the number it draws.
           `waterEvents` STOOD HERE until 2026-10-22. It fed a three-tone
           status sentence on that card which no Figma frame draws and which
           the owner asked to be rid of; the prop went with the row. The
           health/water separation is still measured, and still pinned, where
           the numbers are: `stats.healthy` vs `stats.waterEvents` above. */
        noRecipients={live?.issues?.recipients ?? 0}
        /* Owner, 2026-10-22: "view all opens the wrong area / currently
           systems tab / and it shall be open Active alerts overlay with all
           filter". `setTab('systems')` was the odd one out — onShowPast and
           onSelectIssue beside it already go through openOverlay, and that
           helper's defaults (filter 'all', tab 'active') are exactly what was
           asked for, so it takes no arguments. */
        onShowAll={() => openOverlay('alerts')}
        /* The card's header button already relabels itself "Show past alerts"
           in the all-clear state (199417:131563) and had no handler to match —
           it called onShowAll, which then opened the Systems tab. Unreachable
           until the all-clear state itself became reachable, so the mismatch
           had never been seen. */
        onShowPast={() => openOverlay('alerts', { tab: 'history' })}
        onSelectIssue={kind => openOverlay('alerts', {
          filter: ISSUE_FILTER[kind === 'valveErrors' ? 'valve' : kind === 'noPower' ? 'power' : kind] ?? 'all',
        })}
        /* Owner, 2026-10-22, on a screenshot of the bar: "make these bars
           clcikable to systems table filtered". Each segment is a shortcut
           into the Systems tab, filtered to the half of the fleet it draws.

           NO NEW PREDICATE. The card hands back 'attention' / 'ok', which are
           the values src/data/systemFilters.js's `attention` category already
           produces, and that category's valueOf is
           `computeSystemHealth(s).allOk` — the same call `stats.healthy`
           above is counted with, over the same `scopedSystems` the table
           below is handed. The table therefore cannot disagree with the bar
           that opened it; this sets the selection the filter sheet would have
           set rather than inventing a parallel path.

           Replaces the whole selection on purpose, for the reason the hero's
           type chips give above: a segment states one complete intent ("show
           me the ones that need attention"), and merging it into whatever was
           already applied could land on an empty table for reasons the user
           cannot see. */
        onSelectHealth={value => {
          setSystemFilters({ attention: [value] })
          setTab('systems')
        }}
      />

      {/* The triage band. Answers "is anything wrong, where, how urgent" before
          anything else on the screen, because that is the only question a user
          arriving in a hurry has. See TriageBand.jsx for the research this is
          built against; the short version is that no comparable product shows
          more than three status counters above the fold, and the closest
          analogue (SolarEdge Go, 534 sites) shows a ranked list rather than a
          grid of tiles.

          It REPLACES two cards on Overview: ActiveWaterEventsCard (198314:73493
          / 198328:89083) and SystemsHealthCard (198601:62957). The count, the
          rows and the full list all live here or in EventOverlayV2 now; both
          components are untouched.

          "and still mounted elsewhere" STOOD HERE and was not true, 2026-10-22.
          Neither ActiveWaterEventsCard (imported above, line ~70) nor
          SystemsHealthCard (line ~80) is rendered anywhere in the app — this
          file imports both and uses neither, and no other page or component
          references them. They are reachable only from src/__tests__. That is
          worth knowing before trusting a bug report about either one: a defect
          in SystemsHealthCard is latent, not live. The imports are left in
          place rather than deleted because removing them is a decision about
          whether those two cards have a future, which is the owner's to make,
          not a tidy-up.

          One affordance did NOT come across on its own and was carried over by
          hand: the removed card's "Show past events", the only one-tap route to
          the overlay's History tab. It was worth nothing on the branch that
          wrote this band — History was structurally empty there — and is worth
          103 rows on this one, because overlayEvents below now builds resolved
          rows too. It is a TriageBand prop now; see its footer. */}
      {/* THE HERO STOOD HERE and moved up above the tab row on 2026-11-04 —
          see `scopeBlock`. It is the only card that left this list; the health
          card above is still Overview's. */}
      <TriageBand
        events={waterEvents}
        /* Opens EventFocusOverlay over this page. Row ids are system ids here
           — see the waterEvents mapping in `live` — and the overlay takes a
           systemId, so the row id goes straight through.
           This used to be navigate(`/alert/${event.id}`), the v1 LeakDetail
           screen — on the card this band replaced, and on the band itself. The
           route still exists and still answers a pasted URL; what changed is
           where the in-app row goes. */
        onSelectEvent={event => setFocusedEventSystemId(event.id)}
        onViewAll={() => openOverlay('water')}
        onShowPast={() => openOverlay('water', { tab: 'history' })}
      />

      {/* NO DESIGN SOURCE. ValveManagementCard's own header records that a
          survey of every page of the Figma file found no valve-management,
          bulk-action or status-breakdown frame to transcribe, so this card —
          and therefore its seat — is net-new and open to the owner.

          WHY HERE, between the triage band and the consumption chart: the
          three cards above answer "is anything wrong, and where" (hero ->
          health -> worst events) and the three below answer "how much water,
          and from what". This card is the only ACTION on the screen — it
          stops or starts water across the whole scope — and an action belongs
          after the user knows what is wrong and before the reporting. Putting
          it directly under SystemHealthCard was the alternative, and would put
          its "Valve Error" row next to that card's "Valve errors" tile, which
          is a real benefit; it was not taken because it pushes the live water
          events — the only thing on this screen that can be an emergency —
          below an action card, and triage order is the stronger claim.

          It takes the SAME `scopedSystems` every other card here reads, so it
          cannot report on a different set than the health card above it, and
          it inherits the stack's gap-[20px] and full width from the scroller;
          no className is passed, because a `w-[...]` on this root would beat
          its own `w-full` and reintroduce the resizing-widget bug
          (homeWidgetWidth.dom.test.jsx:80-82).

          BOTH SCOPES, ONE CARD. This file is the location screen AND the
          account screen — /location/:locationName resolves either — so
          `scopeKind` is derived above from which half of the name match
          actually hit, not guessed from the string.

          NO NAVIGATION HANDLER IS PASSED, AND THAT IS THE DECISION. The card
          became display-only on 2026-11-02 ("main widget is display only")
          and now carries a "Manage valves" button and three deep-linking
          category rows onto /valves and /valves/:locationName. It routes
          ITSELF — `useNavigate`, with the scope read off `useParams` — rather
          than taking an `onOpen` prop from here, because THE ROUTE IS THE
          SCOPE is this page's own model (:502-515): a card that reads the
          same route the page reads cannot drift from it, while a handler
          threaded through here would be a second place the same answer is
          computed. So the mount below is unchanged by that work.

          `scopeKind` is still passed and is still derived correctly above,
          but the card no longer reads it: its one consumer was the confirm
          sheet, which moved to the dedicated screen. It is left on the mount
          rather than ripped out because the derivation is right, is covered
          by this page's tests, and the screen may yet want it handed down.

          EMPTY SCOPES ARE NOT HYPOTHETICAL and are the card's own business:
          it renders null for a scope with no systems and its "No valves in
          this scope" state for one with systems but no valves — three
          locations (45 Cedarline Way, 510 Lakeview Dr, 30 Dogwood Dr) and the
          Southbridge Health account are exactly that today. Nothing is
          conditioned here. */}
      <ValveManagementCard
        systems={scopedSystems}
        /* The SAME string the header bar draws at `label={scopeTitle}` — one
           scope, one spelling, including "All Accounts" on the unscoped
           routes. A second name for the same scope on one screen is the kind
           of thing a reader reads as two scopes. */
        scopeLabel={scopeTitle}
        scopeKind={scopeKind}
      />

      {/* 198314:73649 — the layer is named "Balance", a leftover shadcn
          template name; the card is Water consumption. It used to ship its own
          traced series; it now plots the fleet, so the figures under it belong
          to the systems this screen is actually reporting on. */}
      {/* The "‹ Back to Monthly" pill stood here — §3.6 / §19's way back out
          of a drill-down. Removed 2026-10-20 on the owner's instruction ("what
          is back to monthly? remove it."), along with the trail that fed it;
          see the note where `consumptionTrail` was declared for what that
          costs. Do not put this back without asking. */}
      <WaterConsumptionCardV2
        data={consumptionView.series}
        period={consumptionPeriod}
        /* The period CONTROL reads the SHORT label; the hero caption above
           still reads `label`. Only Hourly differs between the two — see
           bucketHourly in consumptionSeries.js for the measurement that
           forced it. */
        monthLabel={consumptionView.labelShort ?? consumptionView.label}
        onPeriodChange={selectConsumptionPeriod}
        onMonthChange={stepConsumption}
        picker="dropdown"
        onOpenPicker={() => setPickerOpen(true)}
        compare={compareConsumption}
        onCompareChange={setCompareConsumption}
        compareData={consumptionCompare}
        /* §3.5 — the card reports which bucket was opened; the screen owns
           what "one step finer" means, because only it holds the window. */
        onDrillDown={drillIntoBucket}
        onToday={jumpToToday}
        canToday={canJumpToToday(consumptionPeriod, consumptionOffset)}
        canStepPrev={consumptionSteps.canStepPrev}
        canStepNext={consumptionSteps.canStepNext}
      />

      {/* Figma 199323:12113 / 199371:137019 order: System health -> Water
         events -> Water consumption -> Insights. Insights used to sit above
         the chart, which is the one place the page disagreed with the node.
         Both states draw the same order. */}
      {/* 198314:73639. No onViewAll: the delivery canvas has no Insights list
          screen, so the card renders its "View all" inert rather than this page
          inventing a route for it. */}
      {/* `live ?` not `live?.insights?.length ?` — a scope with no insights is a
          real, renderable state, and the length test turned it into the comp's
          four invented rows. MOCK_INSIGHTS is reachable only when there is no
          dataset at all, which is what it is for. */}
      <InsightsCard
        rows={live ? live.insights : MOCK_INSIGHTS}
        /* Both destinations already existed; the card was simply never given
           them. /kpi/insights is a real route (KPIDetailScreen handles
           type === 'insights'), and every row carries its own systemId. The
           card's note that "there is no Insights list screen" was true when it
           was written and is not any more. */
        onViewAll={() => navigate('/kpi/insights')}
        onSelectRow={row => row.systemId && navigate(`/system/${row.systemId}`)}
      />

      {/* 198314:73650 */}
      <TopUsageCard
        data={topUsage ?? MOCK_TOP_USAGE}
        onSelect={id => navigate(`/system/${id}`)}
        onPeriodChange={p => setTopUsageDays(p.days)}
      />
    </>
  )

  return (
    /* Outer shell: owns the app wash and holds the scroller and TabBar as
       siblings. The Figma root itself is the child below — it is `items-start`,
       which would shrink a full-width TabBar to its content. */
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--app-bg)' }}>
      {/* Root — 199323:12113 "Accont / location" (ALERT) and its twin
          199371:137019 (CALM). Both emit this frame identically.
          `size-full` dropped: under Phone.jsx the height comes from flex:1, not
          from the frame. The frame's own backgroundImage is the five-stop wash
          that src/index.css keeps as --app-bg, painted by the wrapper above.

          SUPERSEDES 198314:73471, which this page was built from. That frame
          put a 24px "All Accounts" <h1> at the top of the scroller and padded
          the root at 8px with a second 10px inset inside. The current node has
          neither: the scope NAME moved into the header bar, and the root pads
          once at px-16 / py-8 with a gap of 18 between the chrome and the
          cards. */}
      <div
        ref={rootRef}
        className="content-stretch flex flex-col items-start px-4 py-2 relative w-full"
        /* rowGap, not gap-[18px]: it is 18 minus whatever the chrome block
           above has taken as its own bottom padding, so the tab row and the
           first card keep their 18px whatever the owner trims next. */
        style={{ flex: 1, minHeight: 0, rowGap: ROOT_GAP }}
        data-node-id="199323:12113"
        data-name="Accont / location"
      >
        {/* ── THE FULL-BLEED BAND — Figma 199954:96290, 2026-11-04 ───────────
            Owner: "I want the image and the entire header to be with the image
            as provided in the link in Figma."

            WHAT THE NODE SAYS. 199954:96290 is positioned OUTSIDE its 370x150
            parent on every axis - it starts above the header bar and runs past
            both sides - so it stopped being a card's background and became the
            ground the header and the hero sit on. Its exact box is in flux:
            three metadata reads twenty minutes apart gave -29/-115/417x266,
            then -47/-210/673x409, then -74/-173/605x367. The designer is
            dragging it right now. What is stable across all three, and what is
            implemented here, is the INTENT: bigger than its parent, anchored
            up and left, behind the whole header.

            WHY IT IS HERE AND NOT IN THE SCROLLER. The scroller is
            `overflow-y: auto`, which computes overflow-x to auto as well, so an
            absolutely positioned child of it with a negative top is CLIPPED at
            the scroller's edge - the artwork could never reach the header from
            inside. It therefore hangs off this root, which is the one box that
            spans the shell edge to edge.

            `absolute inset-x-0 top-0` is the SHELL's width, not the content's:
            absolute insets resolve against the padding box, so this ignores the
            root's own px-4 and bleeds the full 393 the way the node bleeds the
            full 390. No negative margin is used anywhere, which matters -
            check-shell-contract's `bleed-needs-a-bleeding-scroller` rule exists
            because a negative RIGHT margin becomes scrollable width in LTR and
            put a sideways scrollbar across this frame once already.

            THE HEIGHT IS ARITHMETIC, AND THEN IT IS MEASURED:
                  8   the root's py-2
              +  54   AppHeaderBar - pt-[4px] + the 40px nav button + pb-[10px].
                      It was 58 while the title was a 44px pill; the owner
                      removed that chassis, so the nav button is now the
                      tallest thing in the bar and the bar shrank with it.
              +  18   this root's gap-[18px]
              + 125   where the artwork stops inside the hero block. The node
                      puts 199954:96290 at y=-173 with h=294, i.e. ending 121px
                      below the block's top, and the hero box here is 130 - so
                      the artwork stops 5px short of the tab row and that 5px
                      strip of page ground is what makes the tabs read as just
                      BELOW the image rather than sitting on it.
              = 205
            Measured in Chromium at 393x852 after the change rather than
            trusted from the arithmetic: block y=80, tabs y=210, band 0..205.

            IT DOES NOT SCROLL, and that is the deliberate half of this. The
            header above it is chrome and stays, so the artwork under the header
            has to stay too or the bar is left sitting on whatever card happens
            to be passing. The hero's own text DOES scroll, and is clipped at
            the scroller's top edge rather than sliding up into the bar.

            pointer-events-none and aria-hidden live inside HeroWaveArt: this is
            weather, not information, and nothing under it is tappable. */}
        {/* ── THE BAND IS CLIPPED, NOT RESIZED — 2026-11-04 ─────────────
            One box at the full 205, holding the artwork AND its dim, eaten
            from the bottom by a clip-path as the header collapses. Both layers
            shorten together - the dim is 135 tall and would otherwise still be
            fading over bare page ground once the band had gone - and neither
            moves a pixel while it happens. WHAT MOVES, in THE COLLAPSING
            HEADER above, is why this is a clip and not a height.

            ── THE LAYER ORDER, AND WHY THESE EXACT NUMBERS ────────────
            The band was z-auto and BELOW the scroller until the header began
            to collapse, which was correct while nothing ever scrolled past it.
            It is not any more: once collapsed, the first card sits at y=60 and
            the band ends at 117, so content has to pass UNDERNEATH the artwork
            and it was painting over it.

                 scroller    auto   content
                 TabBar host auto   the floating pill (mounted after the root)
                 band        1      artwork + dim
                 chrome      2      bar, hero, tabs
                 drawer      10/11  scrim, panel        WintSidebarV2:615,635
                 overlays    50/300 EventFocusOverlay, PushNotifications

            1 AND 2 RATHER THAN 10 AND 20, and that is the whole care in this
            block. Both have to beat the scroller (auto) and both have to lose
            to the drawer: a chrome at z-20 would paint the header OVER the
            navigation panel. Neither ever overlaps the pill - the band stops
            at 117 and the pill starts at 775 - so outranking the tab bar's
            host costs nothing here, where outranking it from the SCROLLER
            deleted the bar outright. See the scroller's own note below.

            clip-path makes this a stacking context too. Harmless: its
            children are artwork and a dim, and nothing inside needs to escape
            it. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[205px]"
          /* THE FLOOR IS THE CHROME BLOCK'S FLOOR, to the pixel: 205 down to
             the root's py-2 + the bar + the gap + the row + the row's air.
             Derived rather than written down, so every spacing change above
             moves the artwork's lower edge with it instead of leaving a strip
             of wave hanging under the row or cutting the row off. */
          style={{ clipPath: `inset(0 0 calc(var(--hdr-t, 0) * ${205 - (8 + HEADER_BAR + BAR_TO_TABS + TAB_ROW + TABS_TO_FLOOR)}px) 0)` }}
          data-name="hero-band"
        >
        <HeroWaveArt
          className="absolute inset-0"
          /* NOT the hero card's four percentages. Those are relative to the
             BOX and were measured against 370x150; in a 393x234 band they
             resolve to a different region of the raster, and the node they came
             from is being dragged (see above). object-cover is the honest
             translation of "full-bleed background": no distortion, fills any
             band height, and survives the designer's next drag. object-bottom
             keeps the wave crests - the part of the raster the hero already
             shows - at the hero's end of the band rather than the status bar's. */
          imgClassName="absolute inset-0 size-full max-w-none object-cover object-bottom opacity-90"
          data-node-id="199954:96290"
          /* 'brand' is this page's paint and its only one: the Dashboard is a
             fleet roll-up, not a system, so it has no event state to report.
             The System page passes 'alert' / 'calm'. See HeroWaveArt. */
          tone="brand"
          /* THE EVEN SCRIM — owner: "the image looks the same on the entire
             image". It is HeroWaveArt's now, not this page's: the gradient dim
             that stood below was per-page and drew a horizon across a
             photograph. The 0.34 and the per-theme table that chose it are in
             that component; `brand` is the binding raster of the three. */
          scrim
        />

        {/* THE HEADER DIM STOOD HERE and is gone, 2026-11-04. It was a
            gradient — opaque to 50px, faded by 135 — and the owner saw the
            horizon it drew: "the image on top ... is a bit darker ... Can
            you just fix it, so the image looks the same on the entire
            image." It is now ONE EVEN SCRIM, inside HeroWaveArt (the
            `scrim` prop above), because "the image looks the same" is a
            property of the artwork layer and two pages painting their own
            was already two values to keep in step. The measured sweep that
            chose 0.34, and why it stays off under `contrast`, are in that
            component. */}
        </div>

        {/* 199532:82461 "Header mobile" — the chrome group: header bar, then
            tabs, 10px apart.

            THE GAP WAS 25px UNTIL 2026-10-25. Owner: "update spacing on header
            area, now it's more compact in figma". The old node this was built
            from, 199360:129728 / 199417:131531, NO LONGER EXISTS — a metadata
            fetch for it returns not-found against a full 200-call budget, so
            that is a real deletion and not a rate-limit refusal dressed up as
            one. The header group has been promoted to a component instance
            (199511:78247) and the column it sits in now emits gap-[10px].

            Everything else in the bar re-measured identical: h-[59px], py-6,
            the 6px column gap and the content row's gap-y-[10px] are all
            unchanged, and the node's w-[370px] is what this page's px-4
            already produces inside the 402px frame. The 25 -> 10 is the whole
            of the change.
            In Figma this is just a frame; here it is the shell contract's fixed
            chrome, so it is shrink-0 and sits OUTSIDE the one scroller below.

            ── THE TABS LEFT THIS GROUP ON 2026-11-04 ──────────────────────
            They were here, 10px under the bar, and this comment used to say
            that living here rather than in the scrolling body WAS the fix for
            the "tabs are not in the right place" report. That report is
            answered differently now, by the owner, with a new frame: "take the
            tabs just below the image and implement it now." 199954:96287 sits
            at y=266 in the content frame, BELOW the 250-tall hero + health
            block, so the row is content and no longer chrome. See the tab row
            in the scroller below, which records what that costs.

            `relative z-10` is new and is what keeps this bar ON the artwork
            rather than under it: the band above is an absolutely positioned
            sibling, and a positioned element paints over in-flow content
            whatever the source order. Giving the chrome and the scroller a
            stacking position puts them back on top. The bar itself paints no
            background, so the wave shows through it - which is the whole
            point of the restructure. */}
        {/* ── THE CHROME BLOCK — 2026-11-04 ────────────────────────
            The header bar, the hero and the tab row, outside the scroller.
            THE COLLAPSING HEADER above is what they do; this is where they
            are. The column measures 96 + its own 12 of bottom air = 108px at
            every scroll position (bar 54, gap 10, row 32), which is the
            invariant the whole mechanism rests on: the scroller below never
            resizes, so the scroll handler can never feed back into its input.

            HOW IT GOT HERE, because three of the owner's notes on one day
            read like contradictions and are not. He saw this page scrolled a
            little way down - bar on the artwork, hero copy and tab row GONE, a
            card's green "All of your systems are running!" row floating under
            a bar that no longer explained anything - and said "this is bad".
            Earlier the same day: "all needs to be scrolled including the
            waves". Then: "keep this area stuck - don't move it with scroll at
            all", and "all these area needs to be fixed including the tabs".
            Then, shown that: "Currently it takes too much place when
            scrolling."

            Every one of those is the same complaint: the artwork and its own
            content were doing DIFFERENT things. Fully stuck answered it and
            cost 234px of an 852 frame. The collapse answers it and costs 108.
            Both halves of what he asked for are in the collapse - the hero
            goes away, the controls do not.

            WHAT MOVED OUT OF THE SCROLLER: `scopeBlock`, and nothing else.
            The hero, the tab row, their node ids and every ruling on them are
            untouched - see `scopeBlock` above, which still records why the
            tabs sit where they sit. One note inside it changed: the one
            saying the row "scrolls away now, and that is reported" has been
            answered by the owner and no longer applies.

            `relative z-[2]` IS LOAD-BEARING THREE TIMES OVER. It keeps this
            block ON the artwork; it keeps it ABOVE the scrolling content, which
            now passes underneath once the header has collapsed; and it keeps
            the hero's zero-chip explainer panel — which deliberately overflows
            the hero's box — above that content too. It must stay BELOW the
            drawer (scrim z-10 / panel z-[11], WintSidebarV2:615,635),
            EventFocusOverlay (z-50) and PushNotifications (z-[300]) — which is
            exactly why it is 2 and not 20. The full table is in the band's note
            above.

            ⚠ THE SCROLLER MUST NOT ANSWER IT WITH A z-index OF ITS OWN. See
            the note at the scroller below: it had `z-10` and that deleted the
            floating tab bar outright.

            THE COST, MEASURED AT 393x852 ON `/`:
                              expanded   collapsed
              chrome block    8..242      8..116   (234px -> 108px)
              artwork band    205         116
              scroller        722px of viewport at BOTH, because the column
                              is a constant 108 and only the overlay moves
            Against the two rejected shapes: everything-in-the-scroller gave
            764px and lost the controls; everything-fixed gave 584px and kept
            them. This keeps the controls AND gives back 138 of the 180 the
            fixed block had taken. The 393x205 band is the owner's explicit
            size and is not shrunk to buy space; the collapse is where the
            space comes from. */}
        <div
          className="content-stretch relative z-[2] flex flex-col items-start shrink-0 w-full"
          style={{ rowGap: BAR_TO_TABS, paddingBottom: TABS_TO_FLOOR }}
          data-node-id="199532:82461"
        >
          {/* THE HEADER BAR — Figma 199922:83959, mounted 2026-11-04.
              house + scope pill. It replaced MobileHeaderBar
              (199360:129729 / 199371:137022) here first, and then on every
              other screen when the owner saw the system page and said "it
              always needs to be the same". MobileHeaderBar is now unused and
              left on disk.

              THE LEADING SLOT IS THE ONLY THING THAT VARIES, and on this
              page it is now `back` or nothing: /alerts holds the bell,
              /system/:id and /valves hold their own back step. The house was
              the one slot that was Dashboard-only and it is gone — see
              `onHome`'s former position below.

              WHAT CARRIES OVER, control for control — Rule 0, nothing is
              dropped in a swap:
                · scope readout      label={scopeTitle}, the same string
                · drawer door        the pill. It was the scope slot on the
                                     old bar and it is the scope pill here,
                                     so the door did not move.
                · avatar -> /account GONE, 2026-11-04, owner: "remove avatar
                                     from the header - footer is enough". It
                                     survived the swap and was removed after
                                     it, once TabBar's fourth item, Profile,
                                     reached the same /account from every
                                     screen. Verified in the app before the
                                     removal, because this was the
                                     Dashboard's only route to /account.
                · back on a location onBack below, kept
                · house -> own top   GONE as a CONTROL, 2026-11-04, and kept
                                     as a BEHAVIOUR: it is the Dashboard tab's
                                     now, which is mounted on strictly more
                                     screens than this bar is.

              px-0 cancels the component's own px-[10px]. That inset is the
              node's distance from the 393px frame edge; this page already
              insets once at the root's px-4, and leaving both would float the
              bar 26px in while the tab row under it and every card below sit
              at 16px. Same reasoning, same words, as the bar it replaced:
              no px of its own, the root's inset is the inset. The vertical
              padding IS the node's and is kept.

              THE PILL IS A READOUT, NOT A PICKER. Scope is picked "Only in
              the drawer" (owner), which is what AppHeaderBar implements
              and why no menu is attached here. */}
          <AppHeaderBar
            className="px-0"
            /* The route IS the scope, so the slot names the route: "All
               Accounts" on /, the location on /location/:name. */
            label={scopeTitle}
            /* `Switch location`, from the catalogue, translated. This is the
               name the drawer suites open the drawer BY
               (drawerLocationHighlight.dom.test.jsx:66 queries the literal
               string) and it is v1 ScopeHeader's, not a new one — the page
               the bar replaced announced its slot as "Scope: <name>. Open the
               navigation drawer." and carried no `Switch location` at all, so
               this ADDS the contract name to the Dashboard rather than moving
               it. Copy rule 0: the string already exists, it is not reworded
               here. */
            scopeAriaLabel={t('home.switch_location')}
            /* The account roll-up is the real parent of a location. On / there
               is no parent scope, so no arrow is drawn rather than one that
               goes nowhere. */
            onBack={locationName ? () => navigate('/') : undefined}
            backLabel={locationName ? 'Back to all accounts' : 'Back'}
            /* THE DRAWER'S ONLY DOOR on this screen. The house was it for
               about an hour this morning and is not any more, so if this prop
               ever stops being passed the Dashboard loses navigation
               entirely — Rule 0, and dashboardHeaderBar.dom.test.jsx asserts
               it by the `Switch location` name the drawer suites use. */
            onOpenDrawer={() => setDrawerOpen(true)}
            /* THE TRAILING CONTROL — Figma 199954:96276, the 40x40 at x=340.
               Owner: "I want to replace the home icon with kind of icon from
               the design system and shadcn [that] explain[s] it's open and
               navigation."

               ⚠ IT IS THE DASHBOARD'S ONLY DOOR INTO THE DRAWER. Owner, hours
               later, on a screenshot of the `All Accounts ⌄` pill beside it:
               "remove this and the arrow — only the icon open the nav bar."
               So the title above it is now an inert readout and this is the
               one control. `onOpenDrawer` is still passed because it is what
               AppHeaderBar hangs the door on in BOTH shapes, and the two can
               never be live at once - the component draws the title as a
               button only when no `onOpenNav` is given. Verified in the
               running app: exactly one element on this screen answers to
               `Switch location`, and it is this button.

               Its glyph is lucide's PanelLeft - shadcn's own SidebarTrigger
               icon, and WintSidebarV2 is a left sidebar. The argument, and the
               two glyphs that were rejected, are in AppHeaderBar's
               THE TRAILING SLOT. NO NEW COPY: the accessible name is
               `t('home.switch_location')`, the catalogue string the drawer
               suites already navigate by, which moved here with the door. */
            onOpenNav={() => setDrawerOpen(true)}
            /* The bar sits on the wave now, so its ink belongs to the artwork
               and not to the page ground. See THE INK in AppHeaderBar. */
            onColor
            /* THE HOUSE STOOD HERE — `onHome` + `homeAriaLabel` — and was
               deleted 2026-11-04 with the glyph itself. Owner: "I want to
               completely remove the home icon. And once user clicks on
               dashboard, it just takes him to the upper level of the scope
               that he already have. Instead of the home button. Just remove
               it".

               BOTH HALVES MOVED, neither was dropped: the Dashboard tab in
               src/components/TabBar.jsx navigates to
               `homeTargetFor(visibleIds).path` and calls `clearSelectedScope()`
               on the way, which is exactly what this handler did. The rule is
               src/utils/homeTarget.js, moved verbatim out of this file.

               THE LEADING SLOT IS NOW EMPTY on `/` and `back` on
               /location/:name, so the pill takes the house's 40px and the
               10px gap with it: measured 311 -> 361 on `/` and 261 -> 311 on
               /location/Office at 393x852. */
          />

          {/* 199954:96288 "Account Main header" — the hero and the tab row, on
              the artwork. IT IS CHROME NOW, not the first thing in the scroll:
              see THE STUCK BLOCK above. Everything in the scroller below this
              is the TAB PANEL and nothing else. */}
          {scopeBlock}
        </div>

        {/* 199360:129787 / 199371:137036 — the cards, 20px apart. shrink-0 in
            Figma only because a Figma frame has no scroll model; here it is the
            screen's ONE scroller.
            The 20px gap is both states' — the 14px/10px split this page used to
            branch on belonged to the superseded 198314:73492 / 198328:89082
            Body wrappers, and the current node draws one gap for both.
            pb-16 is the only value here the node cannot state: a frame has no
            scroll padding, and without it the last card sits flush against the
            TabBar. */}
        {/* ⚠ NO z-index ON THIS ELEMENT. It carried `relative z-10` for about
            an hour on 2026-11-04 and THAT DELETED THE FLOATING TAB BAR. Owner,
            with a screenshot of content running to the bottom edge with no bar
            at all: "the main bottom nav bar needs to always [be] floating —
            it's gone now."

            WHY. TabBar's host is `relative shrink-0 h-0` at z-index:AUTO, and
            that is deliberate (TabBar.jsx:244) — it is how the overlays at
            z-50 and z-[300] cover the bar. CSS paints every positive z-index
            in a LATER step than every auto one, regardless of DOM order, so a
            scroller at z-10 paints over a tab bar that is mounted after it.

            NOTHING CAUGHT IT: TabBar was still mounted, paddingBottom 93 was
            still applied, check-shell-contract still passed and the whole
            suite was green. tabBarFloatingClearance now pins it.

            RAISING THE HOST IS THE WRONG FIX — the drawer's scrim is z-10 and
            its panel z-11, and the pill would punch through the navigation
            drawer. The scroller simply does not need a stacking position: the
            band above is `absolute` and comes FIRST in the DOM, so with both
            at z-auto tree order already paints this over it. `relative` stays
            for the chart's scroll targets; only the `z-10` goes. */}
        <div
          className="content-stretch relative flex flex-col gap-[20px] items-start w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          /* paddingBottom 93 = the floating pill's 77px footprint (12 inset +
             65 tall) plus this app's own 16px gutter, so the last card comes
             to rest the same distance from the pill as from the frame's
             sides. src/components/tabBarMetrics.js is where that is written
             down; the literal is repeated here because the guard test reads
             sources rather than the DOM. It REPLACES the old pb-4 - the bar
             used to reserve its own column and now reserves nothing, so at
             maximum scroll this page's last 53.8px were behind the pill.

             UNCHANGED BY THE 2026-11-04 RESTRUCTURE, deliberately. This is
             still the screen's ONE scroller, still flex:1 / overflowY:auto /
             minHeight:0, and still carries the 93. What changed is what is IN
             it: the scope block and the tab row joined the cards. The hero and
             the health card did NOT become chrome, and that was the choice -
             making them shrink-0 would have matched the frame's fixed geometry
             exactly and cost this scroller 259 of its 718px, which the systems
             table and the consumption chart cannot spare.

             `relative z-10`: the artwork band is an absolutely positioned
             sibling of this element, and without a stacking position of its
             own this scroller would paint UNDER it. */
          ref={scrollerRef}
          /* paddingTop IS the collapse distance. See THE COLLAPSING HEADER. */
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingTop: COLLAPSE, paddingBottom: 93 }}
          data-node-id="199360:129787"
        >
          {tab === 'overview' ? (
            cards
          ) : tab === 'systems' ? (
            /* System — the table from Figma "Table 16 - Pro Application
               Block", screenSize=Small (176511:26284), carrying the content
               of the desktop systems table (198736:52372). scopedSystems is
               already the account/location resolution the health card uses,
               so the tab reports on exactly the systems this screen is
               scoped to rather than the whole fleet. */
            <SystemsTableCard
              systems={scopedSystems}
              selection={systemFilters}
              onOpenFilters={() => setSystemFiltersOpen(true)}
              description={
                locationName
                  ? `See information about all systems at ${decodeURIComponent(locationName)}.`
                  : 'See information about all systems.'
              }
              onOpenSystem={s => navigate(`/system/${s.id}`)}
            />
          ) : (
            /* NOT DESIGNED. The delivery canvas draws this tab on both frames
               but has no content frame for it anywhere, and inventing one is
               forbidden. Honest placeholder until a comp exists — do not fill
               it with plausible-looking fields. */
            <div className="bg-surface-card border border-solid border-card content-stretch flex flex-col gap-[4px] items-center justify-center py-[40px] relative rounded-[18px] shrink-0 w-full">
              <p className="font-medium leading-5 text-slate-600 text-sm">
                General Info
              </p>
              <p className="font-normal leading-4 text-slate-400 text-[12px]">
                No design yet for this tab.
              </p>
            </div>
          )}
        </div>

        {/* One water event, full screen — the destination the card's rows now
            open. It is `absolute inset-0 z-50` with no portal (a Radix portal
            escapes Phone.jsx's 393x852 frame), so it must sit inside a
            positioned ancestor: this is the Figma frame root 198314:73471,
            which already carries `relative` — the counterpart of 198379:80447
            on the System page. Mounted unconditionally; open={false} renders
            null.
            onIgnore IS WIRED NOW — 2026-10-29. The note that stood here said
            "This page owns no ignore flow ... wire `onIgnore` to it here once
            it lands", and WaterEventFeedbackSheet has landed. Until this, the
            Ignore control simply did not render on anything reached from the
            location view, which is the bug the owner reported. See the
            `ignoreFlowSystemId` note above for what was and was not gated off
            with it, and for why `valve`, `onClaim` and `onStandDown` are
            still not passed.
            The handler is the System page's, character for character: open
            the flow, commit nothing. It fires on the tap in the overlay's
            "Manage event" tile; the sheet below owns the commit. */}
        <EventFocusOverlay
          open={focusedEventSystemId !== null}
          systemId={focusedEventSystemId}
          onClose={() => setFocusedEventSystemId(null)}
          onIgnore={sysId => {
            if (!isIgnored(sysId)) setIgnoreFlowSystemId(sysId)
          }}
        />
      </div>

      {/* Behind the burger. Navigation only — the v2 drawer carries no global
          scope, and v1 screens keep their own NavigationDrawer. */}
      {/* THE IGNORE FLOW — the second half of the 2026-10-29 fix, and a
          deliberate MOUNT of SystemPageV2Screen's sheet rather than a copy of
          its chrome. PRD 06 + 14: ignoring is irreversible, so the sheet
          shows the consequences and confirms before anything commits, and
          PRD 15's "why" is captured at commit time.

          PAGE LEVEL, AFTER the frame root that holds EventFocusOverlay, for
          the same reason it is on the System page: the sheet is
          `absolute inset-0` and the nearest positioned ancestor is Phone.jsx's
          393x852 frame, so it covers the phone, and mounting it after the
          frame root makes it draw OVER the overlay the Ignore was tapped in.

          THE COMMIT IS THIS PAGE'S, and it is the System page's handler pair
          verbatim (SystemPageV2Screen, search `onIgnoreConfirmed`): the sheet
          writes its own feedback record and never touches ignoredIncidents.
          The repaint afterwards is what redraws the overlay behind it in its
          ignored state — this page's own water rows come from
          computeSystemHealth over SYSTEMS and do not move.

          `eventState` is the PRD 06 + 14 gate: Ignore is a Warning-state
          action, and the sheet refuses the ignore flow on 'shutoff' as a
          backstop, so this page and the System page cannot drift on which
          events are ignorable. */}
      <WaterEventFeedbackSheet
        open={ignoreFlowSystemId !== null}
        trigger="ignore"
        systemId={ignoreFlowSystemId}
        systemName={ignoreFlowSystem?.name}
        eventLabel={ignoreFlowSystem?.alert?.label}
        eventState={
          ignoreFlowSystemId &&
          getLeakState(getActiveIncident(ignoreFlowSystemId)) === 'ShutOff'
            ? 'shutoff'
            : 'warning'
        }
        onCancel={() => setIgnoreFlowSystemId(null)}
        onIgnoreConfirmed={() => {
          if (ignoreFlowSystemId && !isIgnored(ignoreFlowSystemId)) {
            ignoreIncident(ignoreFlowSystemId, { ignoredBy: getCurrentActor() })
          }
          bumpIgnore()
        }}
        onComplete={record => {
          /* The cause PRD 15 asks for at ignore-commit time. The sheet has
             already persisted the full answer; the ignored-incident record
             carries the short reason, so the chips and note are folded back
             into it when the user gave any. A bare "Ignore anyway" leaves it
             null, which is what "nothing is mandatory" means here. */
          const summary = record
            ? [record.chips?.join(', '), record.note].filter(Boolean).join(' — ') || null
            : null
          if (summary && ignoreFlowSystemId) {
            ignoreIncident(ignoreFlowSystemId, { tag: summary, ignoredBy: getCurrentActor() })
          }
          setIgnoreFlowSystemId(null)
          bumpIgnore()
        }}
      />

      <WintSidebarV2 open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* The designed destination for "Show all" / "Show past events" / "Show
          past alerts" — Figma 198328:89685 and :90254 are this overlay in
          account scope. Renders null while `overlay` is null. */}
      {/* "Filter by" for the System tab — page level for the same reason the
          month sheet is: it has to cover the frame, not the tab body. */}
      <SystemsFilterSheet
        open={systemFiltersOpen}
        /* UNFILTERED on purpose. If the options a category offers shrank as
           choices were made, a viewer could not widen a filter from inside the
           sheet that applied it. */
        systems={scopedSystems}
        selection={systemFilters}
        onApply={next => {
          setSystemFilters(next)
          setSystemFiltersOpen(false)
        }}
        onClose={() => setSystemFiltersOpen(false)}
      />

      {/* 198674:184354 — the advanced month sheet, at page level. */}
      <MonthPickerSheet
        variant="window"
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={selectedMonth}
        max={latestMonth}
        /* PLS-WC-08 — the oldest end of the series, so months before it are
           unavailable the way months after `max` already are. */
        min={pickerMin(consumptionBounds)}
        /* §3.3 — the whole twelve-month window is marked, not just its end. */
        windowMonths={consumptionWindowMonths}
        /* §2 — the footer names the newest window in this grouping's terms. */
        footerLabel={footerLabelFor(consumptionPeriod)}
        onApply={applyMonth}
        onSelectLatest12={() => {
          // §4: the footer resets the period and keeps everything else.
          setConsumptionOffset(0)
          setPickerOpen(false)
        }}
      />

      <EventOverlayV2
        open={overlay !== null}
        onClose={() => setOverlay(null)}
        dataset={overlay ?? 'water'}
        scope="account"
        scopeName={scopeTitle}
        /* key: initialFilter seeds the overlay's state once per mount, so
           changing the key is what lets a second tap on a different capsule
           open a different chip. See the note on those props in EventOverlay. */
        key={`${overlay ?? 'water'}:${overlayFilter}:${overlayTab}`}
        initialFilter={overlayFilter}
        initialTab={overlayTab}
        events={overlayEvents}
        /* PRD 05a: "Tapping any row opens that system's page." The overlay
           closes first so the page behind it is not left covered. */
        onSelectEvent={ev => {
          setOverlay(null)
          if (ev.systemId) navigate(`/system/${ev.systemId}`)
        }}
      />

      <TabBar activeTab="home" />
    </div>
  )
}
