/**
 * Home — "All accounts" (v2 mobile). Pixel rebuild of the whole page.
 *
 * Design source: Figma file YEmjkKS4xaA827Zm8w3oXx
 *   200013:93089  Account / location              (402x907) — CURRENT, 2026-11-07
 *   198314:73471  All accounts                    (375x2155, the default state)
 *   198328:89061  Account_expanded water events   (375x874, the expanded state)
 * Both older frames were fetched on their own node, never through a parent
 * that merges variants and hands back the wrong assets.
 *
 * ── 200013:93089, FETCHED 2026-11-07, AND WHAT IT ACTUALLY SAYS ───────────
 * The frame itself is past get_design_context's size cap, so it was read as a
 * tree and its hero fetched on its own node. The ids, so the next person does
 * not spend the calls again:
 *
 *   200013:93099  Header mobile    370x41   title `All accounts` + More badge
 *   200013:93100  content frame    370x1934
 *     200013:93101  Account Main header 370x261  the hero card — FETCHED
 *     200013:93102  Water events        370x386
 *     200013:93103  Water consumption_M 370x455
 *     200013:93104  Insights            370x380
 *     200013:93105  Events Timeline     370x380
 *   hidden="true", i.e. in the file but NOT drawn:
 *     200013:93090  the old full-bleed band raster, 410x340
 *     200013:93091  a Button, 339x36
 *     200013:93092 -> 200013:93098  the `Tabs` row, 339x36
 *     I200013:93099;199511:78256    the header's own tab slot
 *
 * ⚠ THE FRAME IS NOT AN INVENTORY. Owner, verbatim: "Same layout for
 *   locations screens / [200013:93089] keep wht we have now — remove the
 *   system 'lifecycle "Active"' And keeo the locations". "Keep what we have
 *   now" BINDS OVER THE FRAME. 200013:93100 draws five blocks; this page also
 *   carries the triage band, the valve widget, top usage and the systems
 *   table, and all of them STAY. The frame is the layout reference for the
 *   header and the hero, not a list of what the page may contain. Deleting a
 *   widget because this frame does not draw it is the Rule 0 failure
 *   .claude/skills/v2-page-parity exists for.
 *
 * ⚠ THE LIFECYCLE `Active` PILL WAS ALREADY GONE before this instruction, and
 *   is confirmed absent from 200013:93101. See SystemsOverviewHero.jsx's own
 *   THE LIFECYCLE PILL block; nothing was re-removed and nothing re-added.
 *   "And keeo the locations" is the eyebrow: 200013:93101 draws `12 locations`
 *   over the headline and this page feeds it a live `locationCount`.
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

/* Pull to refresh. Wraps this page's ONE scroller rather than replacing it,
   so the shell contract is untouched; see the mount below. */
import PullToRefresh from '@/v2/components/PullToRefresh'
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
/* ── THE WAVE WENT BACK INSIDE A CARD — 2026-11-07 ─────────────────────────
   `HeroWaveArt` is NOT imported here any more. It was, for three days, because
   the collapsing header painted it as a full-bleed band behind the bar
   (199954:96290). Node 200013:93089 carries that raster as 200013:93090 and
   draws it `hidden="true"`: the artwork is back inside an inset rounded card,
   where HeroCardShell paints it from its own `tone`. One component, now one
   call site on this page, so the band and the card cannot drift apart. */
import HeroCardShell from '@/v2/components/HeroCardShell'
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
/* ── THE TAB ROW IS GONE, AND THE MENU IS WHAT REPLACED IT — 2026-11-07 ────
   Owner: "we are replacing tabs with the more button / needs to open as a
   floating component like in ios". `PillTabs` is NOT imported here any more.

   THE NODE SAYS THE SAME THING TWICE. In 200013:93089 the tab row survives as
   TWO hidden layers — 200013:93092 ("Frame 2138883552" wrapping a `Tabs`
   instance) and the header instance's own `Frame 2138883553` — both
   `hidden="true"`. A control the frame keeps but does not draw is a control
   that moved, which is exactly what happened to it.

   THE IDS DID NOT CHANGE. `overview` / `systems` / `general` are the same
   three this page passed to PillTabs, so `tab`, `systemsTabScope` and the
   filter shortcut from the hero's chips all keep working — see
   moreMenuModel.js, which holds the labels and the ⚠ `Systems` vs the frame's
   `Locations` conflict this page has reported since October.

   ⚠ PillTabs THE COMPONENT IS NOT DELETED, AND IS NOW MOUNTED NOWHERE.
   SystemPageV2Screen dropped it in the same restructure, so the file is on
   disk with zero call sites and its Ruling 2 — which page gets which tab
   treatment — is moot rather than settled. Retiring it is a separate decision
   and the owner's; `pillTabs.dom.test.jsx`'s "the two screens draw the same
   tab row" block is red because of exactly this and is REPORTED, not patched:
   it asserts a design the owner himself replaced. */
import MoreMenu from '@/v2/components/MoreMenu'
import { locationMoreMenuItems } from '@/v2/components/moreMenuModel'
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
  /* Handed to PullToRefresh so the gesture can read the scroller's own
     scrollTop — a drag may only begin at the very top, or pulling down while
     scrolled would fight the scroll instead of refreshing. */
  const homeScrollRef = useRef(null)

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

  /* ── THE MORE MENU — the control the tab row became, 2026-11-07 ───────────
     Owner: "we are replacing tabs with the more button / needs to open as a
     floating component like in ios". The menu is MoreMenu.jsx; this page owns
     only the two ids, the open state and the item list.

     THE TWO IDS ARE A THREE-WAY HANDSHAKE and all three legs are load-bearing:
       moreMenuId -> the badge's `aria-controls`, and the menu's own `id`
       labelledBy -> the BADGE's id, which MoreMenu uses for three things:
                     `aria-labelledby` on the menu, MEASURING the real badge at
                     open time so the card anchors under it, and returning
                     focus to it on close.

     BOTH TRAVEL AS PROPS — FIXED 2026-11-07. AppHeaderBar takes `moreMenuId`
     for the menu's id and `moreBadgeId` for the badge's, so React owns both
     and the handshake is readable at the call site below.

     ⚠ IT USED TO BE A STAMP, and the stamp is gone on purpose. The header
       shipped no way to set the badge's id, so this page mounted a layout
       effect that did `querySelector('[data-name="app-more"]')` and wrote the
       id onto the node after render; SystemPageV2Screen carried an identical
       one. Two files, one hack, for one missing prop. Do not reintroduce it:
       an id React does not own is an id React can overwrite, and all three
       jobs the id does fail SILENTLY when it is missing — the card anchors
       from MORE_MENU_FALLBACK_ANCHOR, focus does not return to the badge, and
       `aria-labelledby` dangles. None of those show in a screenshot. */
  const MORE_MENU_ID = 'home-more-menu'
  const MORE_BADGE_ID = 'home-more-badge'
  const [moreOpen, setMoreOpen] = useState(false)

  /* `overview` / `systems` / `general`, unchanged — moreMenuModel.js holds the
     labels and the count, and its header carries the ⚠ `Systems` vs the
     frame's `Locations` conflict this page has reported since October. Moving
     the control into a menu does not answer that question and must not
     quietly decide it, so nothing is renamed here.

     `systemCount` is the live fleet count, null while there is no data — a 0
     would be a measurement. It is the same value the tab row's Badge drew. */
  const moreMenuItems = useMemo(
    () => locationMoreMenuItems({ systemCount: live?.stats?.total ?? null }),
    [live],
  )

  /* ── THE HERO CARD — 200013:93101 "Account Main header", 370x261 ──────────
     Fetched live 2026-11-07, on its own node because 200013:93089 is past
     get_design_context's size cap. It is ONE inset rounded card with two
     sections, and this page owns neither half's chassis now:

         coloured top   SystemsOverviewHero  eyebrow, headline, type chips
         white body     SystemHealthCard     the bar and the fault tiles

     HeroCardShell is the chassis. It paints HeroWaveArt itself off `tone`,
     clips both sections under ONE `overflow-hidden rounded-[22px]`, and gives
     NEITHER section any padding — children and body bring their own. Hence
     `artwork={false}` on the hero, and the 17px above the eyebrow is the only
     padding this page adds.

     ── WHAT THE NODE MEASURES, AND WHAT THIS GIVES IT ───────────────────
     In the node the coloured box is `h-[173px] mb-[-30px]`, i.e. 143px of
     VISIBLE colour with the white body overlapping its last 30, and inside it
         eyebrow   y  17 ->  33.4
         headline  y  37 ->  77
         chips     y  91 -> 123       (left inset 21px = 5.68% of 370)
         body starts at 143
     SystemsOverviewHero's own column, measured in Chromium rather than read
     off the class strings, runs eyebrow 0->26, headline 26->65.4, chips
     72->106.6 inside a 130px box. Under a 17px pad that is 17 -> 123.6
     against the node's 17 -> 123: they agree to within a pixel without
     touching the component's internals, and the section comes out 147 against
     the node's 143.

     THE 4px, AND THE 2px, ARE REPORTED RATHER THAN CHASED. The hero's own
     inset is 23px against this node's 21, and its box leaves 23.4px under the
     chips against the node's 20. Both sit inside the drift this frame has
     shown while being edited live — 199954:96289 read 23 for the same inset
     hours before 200013:93101 read 21 — and the owner's instruction for this
     node is "keep wht we have now". Moving them would be a pixel change he
     did not ask for, on numbers that have moved twice in a week.

     ── THE SCRIM IS OFF, AND THAT IS A RULING, NOT AN OMISSION ──────────
     HeroWaveArt carries an opt-in `scrim` at 0.34 alpha. That number was
     derived for a 20px page TITLE standing ON the artwork inside the
     full-bleed band. The title is on the page ground now and 200013:93101
     draws no scrim layer at all, so the justification left with the band.
     HeroCardShell passes `scrim={false}`; nothing here re-enables it.

     ── THE BODY IS A CARD WITH ITS CHROME OFF ───────────────────────────
     `rounded-none border-0` is HeroCardShell's documented ask. The chassis has
     already painted --surface-card behind this section and supplies the bottom
     radius from its own clip, so the card's rim and rounded top corners would
     only reveal white on white and shift the content by a pixel.

     EVERY OTHER PROP IS UNCHANGED — the four counts, the three handlers and
     the two filter shortcuts are the same calls on the same data they were
     when this card stood first in `cards`.

     THE NO-BAR RULE SURVIVES THE MOVE. Owner, 2026-11-04: "When all good, no
     progress bar." That gate is SystemHealthCard's own (`attention > 0`), not
     this page's, so slotting the card into the hero body cannot resurrect the
     zero-state bar — the all-clear green row from 199922:85244 draws instead.
     Checked in the browser on a persona whose whole scope is clear.

     ── WHY IT RENDERS ON OVERVIEW ONLY — 2026-11-08 ─────────────────────
     THIS REVERSES THE 2026-11-07 RULING, which stood right here and read
     "WHY IT RENDERS ON EVERY VIEW, NOT ONLY OVERVIEW". That ruling reasoned
     from Rule 0: the hero had been common to all three destinations since
     2026-11-04, the health card was Overview's, merging them forced a choice,
     and the side that removed nothing was to keep the merged card everywhere.
     It explicitly said the alternative "would need the owner's word first".

     The owner's word arrived: "when user selecting something in the more on
     the header, it needs to be replaced the entire screen below. So waves
     shouldn't appear in all views, only in overview. For example, in system
     view, it shouldn't appear. Only system table with the right header, with
     the right search, with the right filters."

     So the More menu now swaps the WHOLE body, and this card is Overview's
     body. It is rendered INSIDE the `tab === 'overview'` branch of the
     scroller below, as the first thing in that branch — not above the switch.
     The header bar is the only chrome that survives a pick; everything under
     it belongs to the chosen view.

     STILL NOTHING IS DELETED. Same component, same props, same handlers, same
     data; only its seat moved again, and it moved to the view the owner says
     owns it. Systems renders SystemsTableCard alone and General Info its
     placeholder alone, which is what "replaced the entire screen below" means
     on this page.

     ⚠ THE ZERO-CHIP EXPLAINER OVERFLOWS THIS CARD ON PURPOSE. It hangs 4px
     under the chip row and lands on the white body now, where it used to land
     on the tab row. It carries `z-[2]` and the body carries no z-index, so it
     paints over it; HeroCardShell's `overflow-hidden` does not reach it
     because the card is taller than the panel's drop. Verified in Chromium at
     393x852 with a zero chip open, in all four themes. */
  const heroCard = (
    <HeroCardShell
      tone="brand"
      body={
        <SystemHealthCard
          className="rounded-none border-0"
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
             `attention` — so for a long time this screen could show three
             empty tiles and the all-clear line above "1 / 10 need attention",
             which is what /location/Building B does. The card draws Figma's
             own answer to that now (199338:52997, "N other issues · N no
             recipients"), and this is the number it draws. */
          noRecipients={live?.issues?.recipients ?? 0}
          /* Owner, 2026-10-22: "view all opens the wrong area / currently
             systems tab / and it shall be open Active alerts overlay with all
             filter". openOverlay's defaults (filter 'all', tab 'active') are
             exactly what was asked for, so it takes no arguments. */
          onShowAll={() => openOverlay('alerts')}
          /* 200013:93101 draws this one as `Show past alerts ->`, which is the
             string the card already relabels itself to in the all-clear state
             (199417:131563). Transcription, not new copy. */
          onShowPast={() => openOverlay('alerts', { tab: 'history' })}
          onSelectIssue={kind => openOverlay('alerts', {
            filter: ISSUE_FILTER[kind === 'valveErrors' ? 'valve' : kind === 'noPower' ? 'power' : kind] ?? 'all',
          })}
          /* ── THE TWO SEGMENTS GO TO TWO DIFFERENT PLACES — 2026-11-08 ────
             Owner, on the red half: "When user clicks on X out of Y needs
             attention, it doesn't need to redirect him to the system table.
             It needs to redirect him to the health overlay, like the error
             overlay, which shows all the errors row by row." That OVERRIDES
             the 2026-10-22 ruling on this same prop ("make these bars
             clcikable to systems table filtered") FOR THE ATTENTION HALF
             ONLY. Nothing is deleted: the segment is still a control, it
             still fires, it lands somewhere else.

             'attention' -> openOverlay('alerts') with NO arguments, which is
             character for character what `onShowAll` above does. Two controls
             on one card that both mean "show me what is wrong" must land in
             the same place, and the owner pinned that place for `onShowAll`
             on 2026-10-22: "it shall be open Active alerts overlay with all
             filter".

             NO NARROWER FILTER EXISTS, AND NONE IS WANTED. The `alerts`
             dataset is ALREADY health-only — EventOverlayV2's alert family is
             exactly ['power-lost','valve-error','offline','recipients'] and
             water events travel in the other family — and `overlayEvents`
             above emits ONE ROW PER ISSUE (`<id>:power`, `:valve`,
             `:offline`, `:recipients`). Filter 'all' over that family IS the
             owner's "all the errors row by row"; each of the four chips would
             hide three quarters of them. This is why no new overlay was
             built: the one that answers this already exists.

             'ok' STAYS ON THE SYSTEMS TABLE, deliberately. The owner's
             instruction names the needs-attention half only, and an error
             overlay opened from "All systems good" would open EMPTY by
             construction — those systems emit no rows. So the green segment
             keeps the 2026-10-22 behaviour, with no new predicate: the card
             hands back 'ok', the value src/data/systemFilters.js's
             `attention` category already produces over the same
             `scopedSystems` the table reads.

             ⚠ THE RED SEGMENT'S ACCESSIBLE NAME STILL ENDS "Show these
             systems." (SystemHealthCard.jsx, the `Requires attention:` name).
             It now names the wrong destination by ear. Rewording it is NEW
             user-facing copy and is FLAGGED FOR THE OWNER rather than
             shipped; the pairing is also pinned by
             systemHealthCard.dom.test.jsx against systemFilters.js. */
          onSelectHealth={value => {
            if (value === 'attention') {
              openOverlay('alerts')
              return
            }
            setSystemFilters({ attention: [value] })
            setTab('systems')
          }}
        />
      }
    >
      {/* The node's 17px above the eyebrow, and nothing else: every other
          measurement in this section belongs to the hero component, which
          holds its own node ids for them. */}
      <div className="pt-[17px]" data-name="home-hero-copy">
        <SystemsOverviewHero
          /* HeroCardShell is already painting this exact raster behind this
             exact box. Two copies would double the #a0ccff multiply and draw
             a seam along the join. */
          artwork={false}
          total={live?.stats?.total ?? 0}
          /* "And keeo the locations" — the owner, about this node. It is DATA,
             never the frame's example `12`. */
          locations={locationCount}
          systemTypes={live?.systemTypes}
          /* A chip is a shortcut into the Systems view, filtered to that type.
             The hero and the table already speak the same vocabulary —
             SYSTEM_TYPE.FLOW / FLOOD / HUMIDITY is what the `type` filter
             category reads through systemTypeOf — so this sets the selection
             the filter sheet would have set rather than inventing a parallel
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
    </HeroCardShell>
  )

  /* The Overview cards, in the node's order. Held in a variable so the tab
     body below stays one expression per tab.
     The two states no longer wrap these differently: 199360:129787 (ALERT)
     and 199371:137036 (CALM) both stack at gap-20, so the 14px/10px split
     that used to branch on `expanded` is gone with the frames it came from.
     `expanded` still selects MOCK_WATER_EVENTS when there is no dataset.

     ── BOTH THE HERO AND THE HEALTH CARD HAVE LEFT THIS LIST ─────────────
     The hero left on 2026-11-04, when the live frame put it above the tab
     row. SystemHealthCard left on 2026-11-07 and went INTO it: 200013:93101
     draws them as one card with a coloured top and a white body, so they are
     one `heroCard` now, defined above.
     They are still OVERVIEW-ONLY, as of 2026-11-08: `heroCard` is rendered
     immediately before this list inside the `overview` branch rather than
     above the switch. Same view, one node earlier in the tree.

     NOTHING WAS DELETED. The card is mounted with the same props, the same
     handlers and the same data; only its seat moved, and it moved to a seat
     the owner's own node draws. Every other card below is untouched. */
  const cards = (
    <>
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
      {/* THE HERO STOOD HERE until 2026-11-04 and the health card until
          2026-11-07. Both are `heroCard` now — one card, rendered immediately
          above this list and INSIDE the Overview branch of the view switch
          since 2026-11-08. See the block at its definition. */}
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
        className="content-stretch flex flex-col items-start px-4 py-2 relative w-full"
        /* 10, from 200013:93089's own arithmetic: the root pads 8 (py-2), the
           header instance 200013:93099 is 41 tall and therefore ends at 49,
           and the content frame 200013:93100 starts at 59.

           `rowGap` rather than gap-[10px] because this is the ONE gap left.
           It used to be `18 - TABS_TO_FLOOR`, giving back whatever the chrome
           block took as its own bottom padding; there is no chrome block and
           no tab row to pad any more. */
        style={{ flex: 1, minHeight: 0, rowGap: 10 }}
        data-node-id="200013:93089"
        data-name="Accont / location"
      >
        {/* ── THE FULL-BLEED BAND IS DELETED — 2026-11-07 ───────────────────
            A 205px `absolute inset-x-0 top-0 z-[1]` HeroWaveArt stood here,
            cropped from the bottom by a `clip-path` as the header collapsed.
            It is gone, with the collapsing header it existed to serve.

            THIS IS THE INSTRUCTION, NOT AN ACCIDENT. The band came from
            199954:96290, where the raster was positioned OUTSIDE its parent on
            every axis and so became the ground the header sat on. Node
            200013:93089 reverses that: the same raster is still in the file as
            200013:93090 (410x340, at x=-2 y=0) and it is `hidden="true"`. The
            artwork is inside the hero card now, which HeroCardShell paints.

            WHAT WENT WITH IT. The rAF scroll driver and `--hdr-t`; the
            clip-path; every translate/opacity calc() built on that variable;
            and the constants HEADER_BAR, HERO_H, TAB_ROW, BAR_TO_TABS,
            TABS_TO_FLOOR, ROOT_GAP and COLLAPSE. The scroller's
            `paddingTop: COLLAPSE` went too — there is nothing overlaying its
            first card any more. Agent A removed the header's half of the same
            machinery. The page ground is --app-bg, painted by the shell above,
            which is what the node draws under this frame.

            THE SCRIM QUESTION CLOSED WITH THE BAND. HeroWaveArt's 0.34 scrim
            was derived for a 20px page title standing ON this artwork. The
            title is on the page ground now, so neither this page nor the hero
            card asks for one — see THE SCRIM IS OFF at `heroCard`. */}

        {/* ── THE HEADER — 200013:93099 "Header mobile", 370x41 ──────────────
            It is an ORDINARY STATIC BAR on the page ground now. No wave behind
            it, no collapse, no tab row under it. The node's own instance holds
            exactly two things — a `All accounts` text and a `More` Badge — and
            its tab slot (I200013:93099;199511:78256) is `hidden="true"`.

            THE WRAPPER IS LAYOUT, NOT PLUMBING. It used to exist for a
            `headerRef` that a stamping effect searched for the More badge;
            the badge takes `moreBadgeId` now and the ref is gone with the
            effect. What is left is the one thing the div still earns:

            `shrink-0` — this is chrome and the scroller below is `flex: 1`, so
            without it a tall scroll body would squeeze the bar. It carries no
            padding and no gap of its own, so it stays layout-invisible; the
            root's rowGap is the whole spacing.

            THE z-[2] AND THE 10px BOTTOM PADDING ARE GONE WITH THE BAND. The
            z-index existed so the hero's upsell panel could outrank the tab
            row inside the chrome's own stacking context; there is no tab row
            and the panel now sits inside the hero card, over the card's own
            white body. The padding was `TABS_TO_FLOOR`, the air under the tab
            row. Neither has anything left to do. */}
        <div className="relative w-full shrink-0" data-name="home-header">
          <AppHeaderBar
            className="px-0"
            /* THE TITLE IS THE SCOPE — "All Accounts" on `/`, the location on
               /location/:name.

               ⚠ CASE CONFLICT, REPORTED NOT RESOLVED. 200013:93099 spells it
               `All accounts`, sentence case, which is also what the everyday
               register asks for (§3b rule 1). This app has shipped
               `All Accounts` since before this frame and three suites assert
               that literal. Renaming it is a copy ruling with a test diff
               attached, not a transcription, so the frame's spelling is
               recorded here and nothing is changed. */
            title={scopeTitle}
            /* THE EYEBROW NAMES THE PARENT SCOPE, and only where there is one.
               `/` is the top level and 200013:93099 draws no eyebrow there;
               under /location/:name the parent is the all-accounts roll-up,
               which is where `onBack` goes — one destination, named once and
               reachable once. AppHeaderBar appends the node's trailing `›`
               itself, so the glyph is not spelled here.

               NOT NEW COPY: it is the same 'All Accounts' literal `scopeTitle`
               resolves to on `/`, two lines above. */
            eyebrow={locationName ? 'All Accounts' : undefined}
            /* BACK, and only on a location: `/` is the top of this page's
               hierarchy, so no arrow is drawn rather than one that goes
               nowhere. Matches 200013:93099, which has no back disc. */
            onBack={locationName ? () => navigate('/') : undefined}
            backLabel={locationName ? 'Back to all accounts' : 'Back'}
            /* ── MORE — the tab row's replacement ────────────────────────
               ⚠ THIS BAR NO LONGER CARRIES `Switch location`, AND THAT IS A
               LATER RULING THAN THE ONE THE TESTS WERE WRITTEN AGAINST.

               The restructure's contract §4/§5 moved the drawer door off this
               bar and INTO the More menu. The owner then redirected, the same
               day: "replace the 'More' in buttom main nav bar With Search -
               locate right to dashboard. Serach open the nav bar with the
               systems and locations". So the FOOTER's Search tab is the
               drawer's door now — it dispatches the cancelable window event in
               src/components/drawerSearch.js and the WintSidebarV2 mounted at
               the bottom of this file answers it and opens ITSELF.

               moreMenuModel.js states the consequence in as many words: this
               menu must NOT claim the name `Switch location`, because two
               controls wearing one contract name is how the drawer suites get
               handed the wrong element. Nothing here claims it, and the
               drawer is still reachable from this route — verified in the
               browser: Search tab -> drawer open, with the field focused.

               WHAT IS STILL RED BECAUSE OF IT:
               dashboardHeaderBar.dom.test.jsx:273 asserts the name is on
               EXACTLY ONE element on `/`. It was written against the §5 plan
               and the footer's Search tab is named `Search locations and
               systems`, not `Switch location`, so the count is 0. That test is
               Agent A's file and the reconciliation is the owner's call —
               either the Search tab takes the contract name or the suites
               navigate by the new one. REPORTED, NOT PATCHED. */
            onOpenMore={() => setMoreOpen(true)}
            moreOpen={moreOpen}
            moreMenuId={MORE_MENU_ID}
            /* The BADGE's own id, travelling the other way: MoreMenu measures
               this element to anchor its card under it, names itself by it and
               returns focus to it on close. */
            moreBadgeId={MORE_BADGE_ID}
            /* The catalogue entry, which is ALSO what the badge renders —
               AppHeaderBar resolves the visible word from the same key, so
               WCAG 2.5.3 Label in Name holds in every locale. Passing an
               English literal here is the one way left to break that match. */
            moreLabel={t('tabs.more')}
          />
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
        {/* PULL TO REFRESH WRAPS THE SCROLLER, IT DOES NOT REPLACE IT, which
            is what lets it survive the restructure above untouched: the div
            below is still this screen's ONE scroller and still carries
            `flex:1 / minHeight:0 / overflowY:auto`, exactly as the shell
            contract and the notes under it require. PullToRefresh reads it
            through `scrollRef` and draws its indicator as an absolutely
            positioned sibling, so nothing joins the scroll flow — wrapping
            INSIDE the flex child would change content height mid-gesture and
            fight the very scroll it is measuring.

            It carries NO z-index either, for the reason the block above
            gives: a positive one here would paint over the floating tab bar.

            `onRefresh` is deliberately a settle with no refetch behind it.
            This dataset is generated and there is nothing to re-fetch; the
            gesture exists so the interaction is right for when there is. */}
        <PullToRefresh
          scrollRef={homeScrollRef}
          className="flex min-h-0 flex-1 flex-col"
          onRefresh={async () => {}}
        >
        <div
          ref={homeScrollRef}
          className="content-stretch relative flex flex-col gap-[20px] items-start w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          /* NO paddingBottom — REMOVED 2026-11-08, and the removal is the
             bug fix rather than a tidy-up.

             It was `paddingBottom: 93`: the floating pill's 77px footprint
             (12 inset + 65 tall) plus this app's own 16px gutter, added when
             the bar stopped reserving a column of its own. That only governed
             where the END of this list came to rest. The owner, on
             /location/Office: "I can't click any water events from location.
             It just doesn't click." At the scroll offset the page OPENS at,
             the first water-event row sat inside the pill's band - visible,
             with its top 19px peeking above the bar, and completely dead,
             because the pill is 96% opaque with pointer-events:auto.

             TabBar's host is `h-[93px]` now and reserves that strip itself
             (src/components/tabBarMetrics.js), so this scroller ends above
             the pill at EVERY offset. Paying it here as well would reserve
             the strip twice and leave ~186px of dead space under the last
             card.

             UNCHANGED BY EITHER RESTRUCTURE, deliberately. This is still the
             screen's ONE scroller, still flex:1 / overflowY:auto /
             minHeight:0. What changed on 2026-11-07
             is what is IN it: the hero card joined the cards and the tab row
             left the page entirely. Only the header bar is chrome now, which
             is what 200013:93089 draws — and it gives this scroller back every
             pixel the fixed block and the collapse reserve had taken.

             `relative` stays for the chart's scroll targets. It still carries
             NO z-index, and now there is not even an artwork band to lose to:
             the only absolutely positioned siblings left are EventFocusOverlay
             and the More menu, both at z-50, which is where they belong.

             `ref={scrollerRef}` STOOD HERE and went with the driver: the rAF
             handler was its only reader, and a ref nobody reads is a ref that
             reads as a hook somebody removed by accident. */
          /* NO paddingTop. It used to be the collapse distance, reserving room
             for a hero that overlaid this scroller's top; nothing overlays it
             now. And no paddingBottom either, as of 2026-11-08 — the bar
             reserves its own strip; see the block above. */
          style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
          data-node-id="200013:93100"
        >
          {/* ── A MORE-MENU PICK REPLACES EVERYTHING IN HERE — 2026-11-08 ───
              Owner: "when user selecting something in the more on the header,
              it needs to be replaced the entire screen below. So waves
              shouldn't appear in all views, only in overview."

              So this switch is the WHOLE body. `heroCard` used to sit above
              it and painted on all three destinations; it is inside the
              `overview` branch now, and Systems and General Info render their
              own content alone. AppHeaderBar above this scroller is untouched
              and still renders on every view — the owner's rule is about the
              body below it, not the chrome.

              NOTHING ELSE MOVED. A fragment is not a DOM node, so the
              scroller's direct children on Overview are the same elements in
              the same order they were, and its gap-[20px] still falls between
              the hero card and `Water events`. */}
          {tab === 'overview' ? (
            <>
              {/* ── THE HERO CARD IS THE FIRST THING IN THE OVERVIEW SCROLL ─
                  200013:93100 puts it at the top of the content frame, above
                  `Water events`, and it SCROLLS: the only chrome in this node
                  is the header bar. See WHY IT RENDERS ON OVERVIEW ONLY at
                  `heroCard`. */}
              {heroCard}
              {cards}
            </>
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
        </PullToRefresh>

        {/* ── THE FLOATING MORE MENU ──────────────────────────────────────
            MOUNTED AT THE PAGE ROOT, not inside the header. It is
            `absolute inset-0 z-50` with NO portal — Radix's DropdownMenu,
            Popover, Select and Tooltip all portal to document.body and escape
            Phone.jsx's fixed 393x852 frame, which is recorded as a
            prohibition at AccountScreenV2.jsx:644-656 — so it needs a
            positioned ancestor that spans the screen. This div is the Figma
            frame root and already carries `relative`, the same seat
            EventFocusOverlay below takes.

            BEFORE EventFocusOverlay IN SOURCE ORDER, deliberately. Both are
            z-50; the later one wins a tie. A full-screen event is the more
            urgent of the two, so it paints over the menu rather than under it.

            ITS z-50 BEATS THE FLOATING TAB BAR and loses to nothing it should
            win against: the TabBar host is z-auto and CSS paints every
            positive z-index after every auto one regardless of DOM order,
            which is the trap that cost this file the tab bar once already.

            `labelledBy` IS THE BADGE'S id, not the menu's — MoreMenu measures
            that element to anchor the card and hands focus back to it on
            close. See THE MORE MENU above for why the id is stamped on. */}
        <MoreMenu
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          items={moreMenuItems}
          /* The checkmark follows the page's own `tab` state, so the menu
             reports which view you are on rather than only offering the
             others. `overview` is the default and is a real row — see the
             ruling in moreMenuModel.js. */
          value={tab}
          /* A change of CONTROL, not of destination: the ids are the tab row's
             own, so this is the same setter PillTabs' onChange called. */
          onSelect={setTab}
          id={MORE_MENU_ID}
          labelledBy={MORE_BADGE_ID}
        />

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
