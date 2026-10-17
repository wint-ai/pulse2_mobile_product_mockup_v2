/**
 * System page — v2 (mobile), pixel rebuild.
 *
 * Design source: Figma node 198379:80447 "System tab_mobile" (375x2763).
 * The screen was rebuilt in Figma under new ids. The frame this file was
 * first traced from, 198378:74090, has been deleted — get_metadata on it now
 * answers "node ID was not found" — so every id below was re-derived from the
 * live 198379:80447 tree rather than re-pointed by guesswork.
 * Ids of the form `I<instance>;<slot>;<node>` are instance-internal: the
 * header bar, the tab strip and the policy blocks are component instances
 * now, so their innards have no standalone page-level id.
 *
 * The frame is too large for get_design_context to return inline, so the page
 * tree was mined out of the saved overflow file. Every class below that Figma
 * emitted is kept VERBATIM, including the escaped var() fallbacks
 * (`px-[var(--pro\/space\/2\,5,10px)]`). They are written as literal JSX string
 * attributes on purpose: a JS string or a cn() argument eats the backslash and
 * the class silently never reaches the DOM.
 *
 * Measured against a native-resolution render of the frame, the shell lands on
 * the exact pixels the comp does:
 *   root    p-[8px]                                    frame 8..367
 *   header  h-[42px] px-[16px] py-[24px]               icons centred y=29
 *   content gap-[22px] pt-[20px] px-[10px]             text column x=18
 *     breadcrumb Header h-[44px]                       baseline y=97
 *     title      text-[24px]/32                        baseline y=138
 *     tabs       h-[36px] py-[3px], 2px underline      underline y=197..199
 *     body       gap-[14px] pb-[16px]                  first card top y=218
 *
 * Cards on this page, in order (Body wrapper 198379:80459):
 *   198379:80460  alert carousel — two AlertCard "Mobile" (198374:72716)
 *   198629:57165  Topology        -> NOT BUILT HERE, see below
 *   198629:51874  "Water consumption_M" -> WaterConsumptionCardV2
 *   198379:80615  Events Timeline -> EventsTimelineCard
 *   198379:80616  Action Policy   -> built here, it has no component yet
 *
 * The rebuilt frame gained a Topology card (198629:57165, 339x188, sitting
 * between the alert row and the consumption card) that this file does not
 * render. That is a content divergence, not a provenance one, and it is left
 * open deliberately: getSystemTopology(sys.id) below already returns real
 * data for it, and it must never be filled with invented figures to close
 * the gap. There is still no Insights card on this frame.
 */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import TabBar from '@/components/TabBar'
import WintSidebarV2 from '@/v2/components/WintSidebarV2'
import AlertCard from '@/v2/components/AlertCard'
import EventFocusOverlay from '@/v2/components/EventFocusOverlay'
import WaterConsumptionCardV2 from '@/v2/components/WaterConsumptionCardV2'
import EventsTimelineCard from '@/v2/components/EventsTimelineCard'
import MonthPickerSheet from '@/v2/components/MonthPickerSheet'
import ConsumptionReturnControl from '@/v2/components/ConsumptionReturnControl'
import SystemTopologyCard from '@/v2/components/SystemTopologyCard'
import SystemTypeCard from '@/v2/components/SystemTypeCard'
import ValveStatusCard from '@/v2/components/ValveStatusCard'
import ActivePolicyCard from '@/v2/components/ActivePolicyCard'
import InsightsCard from '@/v2/components/InsightsCard'
import ScopePill from '@/v2/components/ScopePill'
import ValveConfirmSheet from '@/v2/components/ValveConfirmSheet'
import InfoAccordion from '@/v2/components/InfoAccordion'
import SystemHeroCard from '@/v2/components/SystemHeroCard'
import { Menu10, CustomerSupport } from '@/v2/icons'
/* The chart's window arithmetic — §3.1-§3.6 and the §4 matrix. Shared with
   HomeAllAccounts so the two screens cannot drift apart, and kept out of this
   file because a page may only export its component. */
import {
  canJumpToToday,
  clampOffset,
  deriveSeriesBounds,
  drillTarget,
  footerLabelFor,
  offsetForPickedMonth,
  pickerMin,
  pickerSelection,
  stepAvailability,
  windowMonthsOf,
} from '@/v2/lib/consumptionWindow'
import { getSystemById } from '@/data/systems'
import { getCurrentActor } from '@/data/currentUser'
import { getActiveIncident, getLeakState } from '@/data/incidents'
import { getConsumption } from '@/data/consumption'
import { getConsumptionSeries } from '@/data/consumptionSeries'
import {
  getSystemInsights,
  getSystemTopology,
  getSystemUnits,
  getActivePolicy,
} from '@/data/systemDetails'
import { getEventsForSystem } from '@/data/events'
import WaterEventFeedbackSheet from '@/v2/components/WaterEventFeedbackSheet'
import { tagEventKey } from '@/data/eventFeedbackStore'
import { ignoreIncident, isIgnored } from '@/data/ignoredIncidents'
import { startInvestigating, isInvestigating } from '@/data/investigatingStore'

/* ── Mock data ──────────────────────────────────────────────────────────────
   Verbatim from the frame, including the repeated policy figures. */
/* SHAPE REFERENCE, not content.
   This page previously rendered this object directly, with no useParams and no
   @/data import, so every system in the app displayed "Floor 26 at North
   Quarter Ltd." A dead control announces itself; wrong-but-plausible data does
   not, which makes this the more dangerous failure of the two.
   It survives only to document the shape the render expects, and as the
   fallback when a route id matches nothing. */
const SYSTEM = {
  breadcrumb: { home: 'Home', parent: 'North Quarter Ltd.' },
  title: 'Floor 26',
  alerts: [
    { page: 1, pageCount: 2 },
    { page: 2, pageCount: 2 },
  ],
  policies: [
    {
      id: 'open-loop',
      name: 'Open loop',
      glyph: 'valve',
      schedule: 'Working hours',
      shutoff: 'Off',
      shutoffTone: 'off',
      alert: 'On',
      alertTone: 'on',
      left: '2HR left',
      window: '20:15 – 23:59',
    },
    {
      id: 'sensors',
      name: 'Sensors',
      glyph: 'flood',
      schedule: 'Working hours',
      shutoff: 'Off',
      shutoffTone: 'off',
      alert: 'On',
      alertTone: 'on',
      left: '2HR left',
      window: '20:15 – 23:59',
    },
  ],
}

/* The alert carousel's rows, built from the system's REAL alert.
   `SYSTEM.alerts` is a pair of bare {page, pageCount} placeholders, and
   AlertCard merges whatever it is given over its own MOCK_EVENT — so every
   system on every route drew two identical mock "High flow event" cards,
   including the calm ones. The calm Figma frame (199296:50183) has no alert
   card at all, which is exactly right: a system with no alert shows none.

   `buildAlert` (src/data/upstream/buildTree.js:72) is the shape on the other
   end. Leak alerts carry a flow rate and a volume; offline / valve-error /
   power-lost alerts carry neither, so those cards render without the figure
   rather than borrowing the mock's 13,564. */
function alertCardsFor(alert, systemId) {
  if (!alert) return []

  const leak = alert.type === 'leak-high' || alert.type === 'leak-low'
  // "120 L/hour" -> "120"; the unit is a separate slot on the card.
  const rate = leak && alert.flowRate ? String(alert.flowRate).replace(/[^\d,.]/g, '') : null

  return [{
    page: 1,
    pageCount: 1,
    title: alert.label,
    /* Was hardcoded 'Ongoing'. The Warning/Ongoing/ShutOff lifecycle is what
       PRD 04a:63 and 06:88 gate the action row on, so a literal here makes
       that gating impossible to honour. getLeakState reads the incident's own
       steps; non-leak faults have no lifecycle and keep the plain label. */
    status: leak ? (getLeakState(getActiveIncident(systemId)) ?? 'Ongoing') : 'Ongoing',
    ignored: isIgnored(systemId),
    /* Water event or not. Ignore and "On it" are water-event actions; the
       fault branch gets the summary only. */
    leak,
    value: rate ?? alert.volume ?? '',
    unit: rate ? 'L/H flow rate' : '',
    detectedLabel: 'Detected',
    detectedAt: alert.startedAt,
    duration: alert.age,
  }]
}

/* ── Figma-exported glyphs, inlined ─────────────────────────────────────────
   The asset URLs expire in ~7 days, so every SVG the page needs is embedded
   here at the exact viewBox Figma exported, sized by the wrapper the frame
   puts it in (Figma nests glyph-in-box with percentage insets; the resolved
   px size is noted on each). */

// Remix Icons / arrow-right-s-line — breadcrumb separator, 16x16 box.
// Two instances, two different fills: slate-400 before the collapsed crumbs,
// slate-800 before the last one.
function ArrowRightSLine({ fill }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M8.78093 8.00047L5.48112 4.70062L6.42393 3.75781L10.6666 8.00047L6.42393 12.2431L5.48112 11.3003L8.78093 8.00047Z" fill={fill} />
    </svg>
  )
}

// Huge Icons / more-horizontal — the collapsed-crumbs ellipsis. Natural
// 10.666x2.66, centred in the frame's 16px Icon Placeholder.
function MoreHorizontal() {
  return (
    <svg width="10.666" height="2.66" viewBox="0 0 10.666 2.66" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M5.33338 0.664961C5.70065 0.664961 5.99842 0.962731 5.99842 1.33C5.99842 1.69727 5.70065 1.99504 5.33338 1.99504H5.32752C4.96026 1.99504 4.66249 1.69727 4.66249 1.33C4.66249 0.962731 4.96026 0.664961 5.32752 0.664961H5.33338Z" stroke="#90A1B9" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.33599 0.664961C9.70326 0.664961 10.001 0.962731 10.001 1.33C10.001 1.69727 9.70326 1.99504 9.33599 1.99504H9.33013C8.96286 1.99504 8.66509 1.69727 8.66509 1.33C8.66509 0.962731 8.96286 0.664961 9.33013 0.664961H9.33599Z" stroke="#90A1B9" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.33599 0.664961C1.70326 0.664961 2.00103 0.962731 2.00103 1.33C2.00103 1.69727 1.70326 1.99504 1.33599 1.99504H1.33013C0.962859 1.99504 0.66509 1.69727 0.66509 1.33C0.66509 0.962731 0.962859 0.664961 1.33013 0.664961H1.33599Z" stroke="#90A1B9" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Valve status (I198379:80616;101006:7299;198379:80867) — the gate-valve wheel beside "Open loop".
// 11.7451x11.25 drawn inside a 15px box.
function ValveStatusGlyph() {
  return (
    <svg width="11.7451" height="11.25" viewBox="0 0 11.7451 11.25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M5.87257 10.8351C8.00831 10.8351 9.73968 9.1037 9.73968 6.96796C9.73968 4.83222 8.00831 3.10086 5.87257 3.10086C3.73683 3.10086 2.00547 4.83222 2.00547 6.96796C2.00547 9.1037 3.73683 10.8351 5.87257 10.8351Z" stroke="#62748E" strokeWidth="0.82985" strokeMiterlimit="10" strokeLinecap="round" />
      <path d="M5.87257 1.85611V0.495155" stroke="#62748E" strokeWidth="0.82985" strokeMiterlimit="10" strokeLinecap="round" />
      <path d="M2.94047 0.414925H8.80474" stroke="#62748E" strokeWidth="0.82985" strokeMiterlimit="10" strokeLinecap="round" />
      <path d="M1.73162 6.5625H0.414925" stroke="#62748E" strokeWidth="0.82985" strokeMiterlimit="10" strokeLinecap="round" />
      <path d="M11.3302 6.56252H10.0135" stroke="#62748E" strokeWidth="0.82985" strokeMiterlimit="10" strokeLinecap="round" />
    </svg>
  )
}

// Remix Icons / flood-line — beside "Sensors". Exported 15x15, stretched to
// the frame's 16px box (preserveAspectRatio="none" in the export).
function FloodLine() {
  return (
    <svg width="16" height="16" viewBox="0 0 15 15" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M9.99902 11.5225C10.6988 12.0383 11.5641 12.3437 12.5 12.3437H13.2812V12.6562H12.5C11.6739 12.6562 10.9005 12.4361 10.2344 12.0508L10 11.915L9.76465 12.0508C9.09951 12.4357 8.32624 12.6562 7.5 12.6562C6.67385 12.6562 5.90041 12.4361 5.23438 12.0508L5 11.915L4.76465 12.0508C4.09949 12.4357 3.32625 12.6562 2.5 12.6562H1.71875V12.3437H2.5C3.4355 12.3437 4.29969 12.0376 4.99902 11.5225C5.69879 12.0383 6.5641 12.3437 7.5 12.3437C8.43547 12.3437 9.29971 12.0376 9.99902 11.5225ZM11.7188 5.51562L11.5654 5.37598L7.81543 1.9668L7.5 1.68066L7.18457 1.9668L3.43457 5.37598L3.28125 5.51562V10.0596C3.17878 10.0846 3.07485 10.1059 2.96875 10.1211V6.40625H1.83789L7.39453 1.35449C7.43547 1.31728 7.49176 1.3054 7.54199 1.31933L7.58887 1.3418L7.61035 1.35937L13.1621 6.40625H12.0312V10.1201C11.9253 10.105 11.8211 10.0855 11.7188 10.0605V5.51562Z" stroke="#62748E" strokeWidth="0.9375" />
    </svg>
  )
}

// Huge Icons / shut-down — 11.83 drawn inside the frame's 14px box.
function ShutDown() {
  return (
    <svg width="11.83" height="11.8289" viewBox="0 0 11.83 11.8289" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M3.50529 1.24833C1.8181 2.12152 0.665 3.88304 0.665 5.91388C0.665 8.81337 3.0155 11.1639 5.915 11.1639C8.81449 11.1639 11.165 8.81337 11.165 5.91388C11.165 3.88304 10.0119 2.12152 8.32471 1.24833" stroke="#90A1B9" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.915 0.665V4.74833" stroke="#90A1B9" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Lucide Icons / bell — 14x14, fills its box.
function Bell() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M6.00836 12.25C6.106 12.4276 6.24954 12.5757 6.42398 12.6789C6.59842 12.782 6.79737 12.8364 7.00003 12.8364C7.20269 12.8364 7.40163 12.782 7.57607 12.6789C7.75052 12.5757 7.89405 12.4276 7.99169 12.25M3.5 4.66667C3.5 3.73841 3.86875 2.84817 4.52513 2.19179C5.1815 1.53542 6.07174 1.16667 7 1.16667C7.92826 1.16667 8.8185 1.53542 9.47487 2.19179C10.1313 2.84817 10.5 3.73841 10.5 4.66667C10.5 8.75 12.25 9.91667 12.25 9.91667H1.75C1.75 9.91667 3.5 8.75 3.5 4.66667Z" stroke="#90A1B9" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Huge Icons / clock-01 — 12.9967 inside the frame's 14px box.
function Clock01() {
  return (
    <svg width="12.9967" height="12.9967" viewBox="0 0 12.9967 12.9967" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <circle cx="6.49833" cy="6.49833" r="5.83333" stroke="#62748E" strokeWidth="1.33" />
      <path d="M6.49833 4.165V6.49833L7.665 7.665" stroke="#62748E" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* Location Dot — the state pip inside the Off / On badges. One glyph, two
   bakes in the design: #FB2C36 for Off, #008236 for On. */
function LocationDot({ fill }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <circle opacity="0.1" cx="6" cy="6" r="3.78947" fill={fill} />
      <circle opacity="0.1" cx="6" cy="6" r="6" fill={fill} />
      <circle cx="6" cy="6" r="1.26316" fill={fill} />
    </svg>
  )
}

const DOT_FILL = { off: '#FB2C36', on: '#008236' }

/* ── Action Policy card (198379:80616) ─────────────────────────────────────
   No component exists for this one yet, so it is built here from the frame.
   Two policy blocks, each a header row plus a slate-100 panel. */

function PolicyStateBadge({ label, tone }) {
  return (
    <div className="bg-[#fafbfc] content-stretch flex gap-[var(--component\/badge\/gap,4px)] h-[20px] items-center justify-center overflow-clip px-[var(--component\/tabs\/trigger\/gap,6px)] py-[var(--component\/badge\/py,2px)] relative rounded-[var(--component\/badge\/radius,26px)] shrink-0">
      <div className="content-stretch flex flex-col items-start relative shrink-0">
        <div className="relative shrink-0 size-[12px] flex items-center justify-center">
          <LocationDot fill={DOT_FILL[tone] ?? DOT_FILL.off} />
        </div>
      </div>
      <p className="[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/xs\/lh,16px)] overflow-hidden relative min-w-px text-[12px] text-[color:var(--colors\/slate\/500,#62748e)] text-ellipsis whitespace-nowrap">
        {label}
      </p>
    </div>
  )
}

function PolicyBlock({ policy }) {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="I198379:80616;101006:7299;198379:80857">
      <div className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full">
        {/* Header row — glyph + name on the left, schedule on the right */}
        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
          <div className="content-stretch flex gap-[10px] items-center relative shrink-0 w-full">
            <div className="content-stretch flex flex-[1_0_0] items-center justify-between min-w-px relative">
              <div className="content-stretch flex gap-[10px] items-center relative shrink-0">
                <div className="content-stretch flex items-center relative shrink-0">
                  <div className="content-stretch flex gap-[6px] items-center relative shrink-0">
                    {policy.glyph === 'valve' ? (
                      <div className="bg-[#fafbfc] content-stretch flex flex-col items-center justify-center relative shrink-0 size-[15px]">
                        <ValveStatusGlyph />
                      </div>
                    ) : (
                      <div className="relative shrink-0 size-[16px] flex items-center justify-center">
                        <FloodLine />
                      </div>
                    )}
                    <p className="[word-break:break-word] font-[var(--font\/weight\/font-semibold,600)] leading-[var(--text\/sm\/lh,20px)] relative shrink-0 text-[#0a0a0a] text-[length:var(--text\/sm\/size,14px)] whitespace-nowrap">
                      {policy.name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p className="[word-break:break-word] font-[var(--font\/weight\/font-semibold,600)] leading-[var(--text\/sm\/lh,20px)] relative shrink-0 text-[#0a0a0a] text-[length:var(--text\/sm\/size,14px)] whitespace-nowrap">
              {policy.schedule}
            </p>
          </div>
        </div>

        {/* slate-100 panel */}
        <div className="bg-[var(--colors\/slate\/100,#f1f5f9)] content-stretch flex flex-col gap-[12px] items-start px-[13px] py-[11px] relative rounded-[14px] shrink-0 w-full">
          <div className="content-stretch flex gap-[8px] items-start relative shrink-0">
            {/* Auto Shutoff */}
            <div className="content-stretch flex gap-[5px] items-center relative shrink-0">
              <div className="content-stretch flex gap-[5px] items-center relative shrink-0">
                <div className="content-stretch flex items-center justify-center relative shrink-0 w-[11px]">
                  <div className="relative shrink-0 size-[14px] flex items-center justify-center">
                    <ShutDown />
                  </div>
                </div>
                <p className="[word-break:break-word] font-[var(--font\/weight\/font-normal,400)] leading-[var(--text\/sm\/lh,20px)] relative shrink-0 text-[color:var(--foreground,#0a0a0a)] text-[length:var(--text\/sm\/size,14px)] whitespace-nowrap">
                  Auto Shutoff
                </p>
              </div>
              <PolicyStateBadge label={policy.shutoff} tone={policy.shutoffTone} />
            </div>

            {/* 1px divider — Figma rotates a 19px line 90deg inside a w-0 box */}
            <div className="flex h-[19px] items-center justify-center relative shrink-0 w-0">
              <div className="flex-none rotate-90">
                <svg width="19" height="1" viewBox="0 0 19 1" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                  <line y1="0.5" x2="19" y2="0.5" stroke="#90A1B9" />
                </svg>
              </div>
            </div>

            {/* Alert */}
            <div className="content-stretch flex gap-[5px] items-center relative shrink-0">
              <div className="content-stretch flex gap-[5px] items-center relative shrink-0">
                <div className="content-stretch flex items-center justify-center relative shrink-0 w-[11px]">
                  <div className="relative shrink-0 size-[14px] flex items-center justify-center">
                    <Bell />
                  </div>
                </div>
                <p className="[word-break:break-word] font-[var(--font\/weight\/font-normal,400)] leading-[var(--text\/sm\/lh,20px)] relative shrink-0 text-[color:var(--foreground,#0a0a0a)] text-[length:var(--text\/sm\/size,14px)] whitespace-nowrap">
                  Alert
                </p>
              </div>
              <div className="content-stretch flex items-end relative shrink-0">
                <PolicyStateBadge label={policy.alert} tone={policy.alertTone} />
              </div>
            </div>
          </div>

          {/* Window row */}
          <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
            <div className="content-stretch flex items-center relative shrink-0">
              <p className="[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/xs\/lh-tight,15px)] relative shrink-0 text-[#0a0a0a] text-[length:var(--text\/xs\/size,12px)] whitespace-nowrap">
                {policy.left}
              </p>
            </div>
            <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
              <p className="[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/xs\/lh-tight,15px)] relative shrink-0 text-[color:var(--colors\/slate\/500,#62748e)] text-[length:var(--text\/xs\/size,12px)] whitespace-nowrap">
                {policy.window}
              </p>
              <div className="overflow-clip relative shrink-0 size-[14px] flex items-center justify-center">
                <Clock01 />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionPolicyCard({ policies }) {
  /* The frame fixes this card at h-[380px], which leaves ~45px of dead space
     under the second policy block. That is a Figma frame artefact (the board
     sizes every card to 380 so they line up), not a designed gap, so the card
     flows to its content height here. */
  return (
    <div
      className="bg-[#fafbfc] border-[length:var(--border-width\/border,1px)] border-solid border-white content-stretch flex flex-col gap-[var(--p-0,0px)] items-start overflow-clip p-[var(--p-0,0px)] relative rounded-[var(--rounded-2xl,18px)] shadow-[var(--shadow\/x,0px)_var(--shadow\/popover\/layer-2\/y,0px)_var(--shadow\/popover\/layer-2\/blur,0px)_var(--shadow\/popover\/layer-2\/spread,0px)_var(--shadow\/popover\/layer-2\/color,rgba(0,0,0,0))] shrink-0 w-full"
      data-node-id="198379:80616"
    >
      {/* CardHeader */}
      <div className="content-stretch flex h-[62px] items-center justify-between px-[var(--spacing\/6,24px)] py-[var(--spacing\/3,12px)] relative shrink-0 w-full">
        <div className="flex-[1_0_0] min-w-px relative">
          <div className="content-stretch flex flex-col gap-[var(--component\/card\/header\/gap,8px)] items-start py-[var(--spacing\/1\,5,6px)] relative size-full">
            <p className="[word-break:break-word] font-[var(--font\/weight\/font-semibold,600)] leading-[var(--text\/lg\/lh-none,18px)] relative shrink-0 text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/lg\/size,18px)] tracking-[-0.45px] w-full">
              Action Policy
            </p>
          </div>
        </div>
        <div className="relative shrink-0">
          <div className="content-stretch flex gap-[12px] items-start relative size-full">
            <div className="content-stretch flex flex-col gap-[var(--p-0,0px)] items-start relative shrink-0 w-[57px]">
              {/* Deliberately inert: the delivery canvas has no Action Policy
                  list screen for "View all" to open, and Rule 0 forbids
                  inventing one. aria-disabled + no handler so it does not read
                  as a live control that silently does nothing. */}
              <button
                type="button"
                aria-disabled="true"
                className="content-stretch cursor-default flex gap-[var(--component\/button\/gap,6px)] h-[36px] items-center justify-center px-[var(--component\/button\/size-default\/px,12px)] py-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-default\/radius,26px)] shrink-0 w-full"
              >
                <p className="[word-break:break-word] font-medium leading-[var(--text\/sm-tight\/lh,20px)] relative shrink-0 text-[color:var(--foreground,#0a0a0a)] text-[length:var(--text\/sm-tight\/size,14px)] whitespace-nowrap">
                  View all
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* cardContent */}
      <div className="content-stretch flex flex-col gap-[var(--spacing\/7,28px)] items-start justify-center overflow-clip px-[24px] py-[var(--component\/calendar\/padding,12px)] relative shrink-0 w-full">
        {policies.map((policy) => (
          <PolicyBlock key={policy.id} policy={policy} />
        ))}
      </div>
    </div>
  )
}

/* ── Screen ─────────────────────────────────────────────────────────────── */


/* Which month offset 0 actually is used to be parsed back out of the daily
   period label here. It is read off the series KEYS now, in
   @/v2/lib/consumptionWindow — the labels differ per grouping ("September
   2026", "Jun 2025 - May 2026", "N / A") and the regex that lived here matched
   only the three-letter form, so on the real label it returned null and the
   picker quietly fell back to the wall clock. The rule it was reaching for is
   unchanged and now holds at every grouping: offsets are measured from the
   last reading in the series, never from "now" (PLS-WC-06). */

export default function SystemPageV2Screen() {
  const navigate = useNavigate()
  const { systemId } = useParams()
  /* Collapsed is the default: System tab_mobile (198379:80447) draws the card
     that way, and the expanded variant is what "Open" reveals. */
  const [loopExpanded, setLoopExpanded] = useState(false)
  /* Optimistic valve state, keyed by device id. Same pattern ValveControlCard
     uses on the v1 screens: there is no valve mutation in this app, so a close
     is local and a reload restores it. */
  const [closedValves, setClosedValves] = useState({})
  /* EVERY valve change goes through the confirm sheet. v1 has always done
     this (ValveControlCard.jsx:420); the v2 page wired its controls straight
     at state and lost it, so shutting off a building's water was one
     unguarded tap. `valveIntent` holds what was asked for until it is
     confirmed; nothing mutates until then. */
  const [valveIntent, setValveIntent] = useState(null)
  /* Home / Away on the alert frame's Active policy card. Local and optimistic,
     the same way this screen already treats valve closes — there is no policy
     mutation in this app yet. */
  const [policyMode, setPolicyMode] = useState('home')

  /* THE PUSH CONTRACT (PRD 06). Every water-event push lands here and asks the
     page to do something on arrival: `?pulse=1` highlights the card the push
     referred to, `?action=ignore` opens the Ignore flow, `?action=tag` opens
     the feedback question. None of it was read — the params arrived and
     nobody looked — so three of the four push actions silently did nothing.
     Ported from LeakDetail.jsx, which has implemented this all along on a
     route the push no longer uses. */
  const [searchParams, setSearchParams] = useSearchParams()
  const [showIgnoreFlow, setShowIgnoreFlow] = useState(false)
  /* EventFocusOverlay — one event, full screen, over this page. Tapping an
     alert card opens it (see the carousel below); the card's own On it /
     Ignore buttons are untouched and still go through handleAlertAction. */
  const [eventFocusOpen, setEventFocusOpen] = useState(false)
  /* PRD 15 §7.1 / 02:325. PushNotifications.jsx:659 sends
     /system/{id}?action=tag&pulse=1 — and until 2026-10-17 this page answered
     it with v1's TagBottomSheet. It now opens WaterEventFeedbackSheet's
     'event-ended' question; see the mount at the foot of this file. */
  const [showTagFeedback, setShowTagFeedback] = useState(false)
  const [pulse, setPulse] = useState(false)

  /* Real system for this route, falling back to the mock shape when the id
     matches nothing — a deep link to a deleted system should still render
     rather than crash. Everything below reads `system`, never SYSTEM. */
  const system = useMemo(() => {
    const sys = systemId ? getSystemById(systemId) : null
    if (!sys) return SYSTEM

    /* The Events Timeline card defaults to `events = MOCK_EVENTS`, and this
       screen mounted it bare — so every system on every route rendered the same
       five invented rows. getEventsForSystem returns this system's real
       current + history events; they are mapped into the shape the card reads.
       kind drives the avatar tint (KIND_TONE has water | network), and the
       badge is derived from `resolved` rather than invented per row. */
    const timeline = (getEventsForSystem(sys.id) ?? []).map(ev => ({
      id: ev.id,
      kind: String(ev.type ?? '').startsWith('leak') ? 'water' : 'network',
      title: ev.title,
      description: ev.detail,
      timestamp: ev.timestamp,
      notifications: ev.notifications,
      badge: ev.resolved
        ? { label: 'Ended', tone: 'ended' }
        : { label: 'Ongoing', tone: 'warning' },
    }))

    const insights = getSystemInsights(sys.id) ?? []
    const topology = getSystemTopology(sys.id, sys.name) ?? null

    /* One unit per leg of the system's pipe topology — a water line yields
       one, either loop yields Supply + Return, and "No Piping Monitored"
       yields none. The counts live in src/data/systemConfig.js, taken off the
       Figma schematics, so this page does not decide them. */
    const devices = getSystemUnits(sys)
    const policy = getActivePolicy(sys.id) ?? null
    const consumption = getConsumption(sys.id, sys.name) ?? null

    return {
      ...SYSTEM,
      id: sys.id,
      title: sys.name ?? SYSTEM.title,
      // l4Name is the leaf location; l3Name is null on some datasets, so the
      // breadcrumb takes whichever levels actually exist rather than printing
      // "undefined" for the missing one.
      breadcrumb: {
        home: 'Home',
        parent: [sys.l3Name, sys.l4Name].filter(Boolean).join(' · ') || SYSTEM.breadcrumb.parent,
      },
      updatedAt: sys.updatedAt ?? SYSTEM.updatedAt,
      /* ONE ancestor, for the scope pill. l4Name is the leaf location that
         holds systems; l3Name is the city above it and is null on some
         datasets. The pill shows the nearest one that exists — never a path.
         The rest of the chain lives in the drawer, which renders the whole
         tree and auto-expands to this system. */
      parentName: sys.l4Name ?? sys.l3Name ?? null,
      alert: sys.alert ?? null,
      alerts: alertCardsFor(sys.alert ?? null, sys.id),
      insights,
      timeline,
      topology,
      devices,
      policy,
      consumption,
    }
  }, [systemId])

  const [drawerOpen, setDrawerOpen] = useState(false)
  /* The consumption chart is behind the hero's "See more" now (Figma
     199296:50183 / :50454). It is NOT gone — the design moved it, so this flag
     is the only way to reach it and the hero's control owns it. */
  const [chartOpen, setChartOpen] = useState(false)
  const chartRef = useRef(null)
  const carouselRef = useRef(null)

  /* Consumption scope. The card draws the controls; the screen owns what they
     mean, because only the screen knows which system is on the route.
     Switching granularity resets the offset: "three months back" does not
     carry over into a year view. */
  /* PLS-WC-03 / §2: MONTHLY is the default grouping at every level, this page
     included. It opened on Daily, which answers "what did this month look
     like, day by day" before the user has said which month they mean. */
  const [period, setPeriod] = useState('M')
  const [periodOffset, setPeriodOffset] = useState(0)

  /* §20.1 / PLS-WC-15 — the trail of periods OPENED, newest last. Each entry
     is the {period, offset} a drill-down was launched from, which is what lets
     the return restore both rather than dropping the user on the newest window
     the way the grouping control does (§3.1). */
  const [periodTrail, setPeriodTrail] = useState([])

  /* "See more" sits in the hero at the very top; the chart it reveals lands
     below the alert carousel and the topology card, far enough down that on a
     393x852 frame the control looks inert. Bring it to the user. */
  useEffect(() => {
    if (!chartOpen) return
    const node = chartRef.current
    if (!node?.scrollIntoView) return
    const id = requestAnimationFrame(() =>
      node.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    return () => cancelAnimationFrame(id)
  }, [chartOpen])

  const consumptionView = useMemo(
    () => getConsumptionSeries(system.id, system.title, period, periodOffset),
    [system.id, system.title, period, periodOffset],
  )

  /* The hero's headline figures. The comp prints "5,83L +120%" over a date
     range; both come from the series the chart below already plots, so the two
     can never disagree. Unreached buckets carry litres === null (PLS-WC-17)
     and are excluded, exactly as deriveStats does. */
  const heroFigures = useMemo(() => {
    const read = (consumptionView?.series ?? []).filter(p => p.litres != null)
    if (!read.length) return { total: '—', delta: null }
    const total = read.reduce((sum, p) => sum + p.litres, 0)
    const fmt = n =>
      n >= 1e6 ? `${(n / 1e6).toFixed(2).replace(/\.?0+$/, '')}M` :
      n >= 1e3 ? `${(n / 1e3).toFixed(2).replace(/\.?0+$/, '')}K` : String(Math.round(n))
    /* The delta is first half against second, which is what a single window
       can honestly say without a second fetch. */
    const half = Math.floor(read.length / 2)
    const older = read.slice(0, half).reduce((s, p) => s + p.litres, 0)
    const newer = read.slice(half).reduce((s, p) => s + p.litres, 0)
    const pct = older > 0 ? Math.round(((newer - older) / older) * 100) : null
    return {
      total: `${fmt(total)}L`,
      delta: pct == null ? null : `${pct > 0 ? '+' : ''}${pct}%`,
      pct,
      deltaLitres: Math.round(newer - older),
    }
  }, [consumptionView])

  const heroTotal = heroFigures.total
  const heroDelta = heroFigures.delta

  /* PLS-WC-06 — where this system's series actually starts and ends, read back
     out of the data layer rather than from the clock. Every offset below is
     measured from it, and the step controls (§3.2) and the picker (§3.3) take
     their limits from it, so neither can offer a window the series cannot
     fill. */
  const consumptionBounds = useMemo(
    () => deriveSeriesBounds((grouping, offset) =>
      getConsumptionSeries(system.id, system.title, grouping, offset)),
    [system.id, system.title],
  )

  /* The advanced period selector — 198674:179349 opens 198674:184354. The
     trigger between the chevrons is the card's; the sheet is the page's,
     because the frames draw it over the whole phone. */
  const [pickerOpen, setPickerOpen] = useState(false)

  /* Which month offset 0 is, read from the data rather than from the clock —
     in the sheet's own {month, year} shape. */
  const latestMonth = useMemo(
    () => (consumptionBounds
      ? { month: consumptionBounds.lastMonth.m, year: consumptionBounds.lastMonth.y }
      : null),
    [consumptionBounds],
  )
  /* §3.3 — the picker opens on the window's LAST bucket: the one the label
     names and the one a pick replaces. */
  const selectedMonth = useMemo(
    () => pickerSelection(period, periodOffset, consumptionBounds),
    [period, periodOffset, consumptionBounds],
  )
  /* §3.3 — every month the window covers, so the grid marks the whole window
     and not only its end. Monthly only: at Daily the window IS one month. */
  const windowMonths = useMemo(
    () => (period === 'M' ? windowMonthsOf(consumptionView.series) : undefined),
    [period, consumptionView],
  )

  /* §4: a pick sets the period and keeps the grouping, the comparison and the
     trail. */
  const applyMonth = (selection) => {
    setPeriodOffset(offsetForPickedMonth(period, selection, consumptionBounds))
    setPickerOpen(false)
  }

  /* "Compare previous period" — the window immediately before this one. */
  const [compareConsumption, setCompareConsumption] = useState(false)
  const consumptionCompare = useMemo(
    () =>
      compareConsumption
        ? getConsumptionSeries(system.id, system.title, period, periodOffset - 1).series
        : null,
    [compareConsumption, system.id, system.title, period, periodOffset],
  )

  /* ── The chart's actions ────────────────────────────────────────────────
     §4 is NORMATIVE about what each one keeps and what it resets, and the
     PRD's own note is that the commonest defect in this chart is an action
     resetting something the user expected to keep. Each handler states the row
     it implements. */

  /* §3.1 — selecting a grouping ALWAYS returns to the newest window, and is
     therefore never a way back to a period you were looking at (§3.6). The
     trail goes with it: the drill it recorded no longer describes what is on
     screen. */
  const selectPeriod = (next) => {
    setPeriod(next)
    setPeriodOffset(0)
    setPeriodTrail([])
    // PLS-WC-20: comparison is Monthly-only, so anything else clears it.
    if (next !== 'M') setCompareConsumption(false)
  }

  /* §3.2 — one step moves ONE bucket and keeps everything else. The clamp is
     what makes the chevrons stop where the data stops; canStepPrev /
     canStepNext disable them there rather than leaving them inert
     (PLS-WC-09). */
  const stepPeriod = (delta) =>
    setPeriodOffset((offset) => clampOffset(period, offset + delta, consumptionBounds))

  /* §3.5 / PLS-WC-12-13 — opening a period is the ONLY action that changes the
     grouping without resetting the period. The window moves to the period
     containing the bucket's LAST reading, so opening 2025 gives January to
     December 2025 rather than the twelve months ending in January. */
  const drillIntoBucket = (bucketKey) => {
    const target = drillTarget(bucketKey, consumptionBounds)
    // Hourly is the floor of the series and a bucket with no reading has
    // nothing behind it — §3.5's two blocked cases both land here.
    if (!target) return
    setPeriodTrail((trail) => [...trail, { period, offset: periodOffset }])
    setPeriod(target.period)
    setPeriodOffset(target.offset)
    if (target.period !== 'M') setCompareConsumption(false)
  }

  /* §3.6 / PLS-WC-15 — the return restores the grouping AND the period it was
     opened from. */
  const returnFromDrill = () => {
    const previous = periodTrail[periodTrail.length - 1]
    if (!previous) return
    setPeriodTrail((trail) => trail.slice(0, -1))
    setPeriod(previous.period)
    setPeriodOffset(previous.offset)
    if (previous.period !== 'M') setCompareConsumption(false)
  }

  /* §3.4 — Today: Hourly on the newest window, the picker closed, and the
     comparison cleared (§4). */
  const jumpToToday = () => {
    setPeriod('H')
    setPeriodOffset(0)
    setPeriodTrail([])
    setCompareConsumption(false)
    setPickerOpen(false)
  }

  /* The devices as the card sees them: the dataset's own state, with any
     optimistic close laid over the top. */
  /* Read the push's instruction once, then strip it, so a refresh does not
     re-open a sheet the user already dismissed. LeakDetail.jsx does exactly
     this; the param vocabulary is PRD 02's URL contract. */
  useEffect(() => {
    const action = searchParams.get('action')
    const wantsPulse = searchParams.get('pulse') === '1'
    if (!action && !wantsPulse) return

    if (action === 'ignore' && !isIgnored(systemId)) setShowIgnoreFlow(true)
    if (action === 'tag') setShowTagFeedback(true)
    /* §PRD 06 asks for a 2-second accent pulse on the card the push referred
       to — Slack's scroll-to-message highlight, not a badge. */
    if (wantsPulse) setPulse(true)

    const next = new URLSearchParams(searchParams)
    next.delete('action')
    next.delete('pulse')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, systemId])

  useEffect(() => {
    if (!pulse) return
    const id = setTimeout(() => setPulse(false), 2000)
    return () => clearTimeout(id)
  }, [pulse])

  /* The sheet's "Yes" lands here. Still optimistic and still local — there is
     no valve mutation in this app and ValveControlCard keeps its state in
     component-local useState too — but it is now a decision, not a twitch. */
  const commitValveIntent = () => {
    if (!valveIntent) return
    const { action, device } = valveIntent
    if (action === 'close-all') {
      setClosedValves(Object.fromEntries((system.devices ?? []).map(d => [d.id, true])))
    } else if (device) {
      setClosedValves(v => ({ ...v, [device.id]: action === 'close' }))
    } else {
      setClosedValves(
        action === 'close'
          ? Object.fromEntries(valves.map(d => [d.id, true]))
          : {},
      )
    }
    setValveIntent(null)
  }

  const loopDevices = useMemo(
    () => (system.devices ?? []).map(d => (closedValves[d.id] ? { ...d, valve: 'closed' } : d)),
    [system.devices, closedValves],
  )

  /* The System page redesign (199296:50183 calm / 199296:50454 alert) orders
     its cards differently in the two states: the alert frame lifts Valve
     status above System type and drops Active policy below Insights, because
     when something is wrong the valve is the thing you reach for. So the order
     is data, not markup. */
  const alerting = Boolean(system.alert)

  /* PRD 06 + 14: Ignore is a WARNING-state action. getLeakState reads the
     incident's own steps and answers 'Warning' | 'Ongoing' | 'ShutOff';
     WaterEventFeedbackSheet takes the lowercase pair and refuses to render
     the ignore flow on 'shutoff' as a backstop, so the two cannot drift.
     'Ongoing' is still ignorable — EventFocusOverlay offers Ignore on every
     live water event, claimed or not — only a closed valve takes it away. */
  const eventState =
    getLeakState(getActiveIncident(system.id)) === 'ShutOff' ? 'shutoff' : 'warning'

  /* WHERE THE TAG PATH'S FEEDBACK RECORD IS KEYED.
     eventFeedbackStore is keyed per event and holds an ARRAY per key, and the
     ignore flow below writes under the bare `system.id` — the store's own
     convention for a live event (eventFeedbackStore.js, "KEY SHAPE"). If the
     tag path reused that key the two answers would stack under one id and
     `getLatestFeedback(system.id)` would hand a read surface the tag answer
     where it asked for the ignore reason. The store's `eventKey` override
     exists for exactly this, so the tag path takes its own namespaced key.

     Not a literal event id, which is what the store would prefer: the tag
     link refers to the event that just ended, and `getEventsForSystem`
     returns the current + history rows in no guaranteed order and formats the
     timestamp on the way out, so "the one that just ended" cannot be picked
     from it reliably. A stable key beats a plausible-looking wrong one.

     THE STRING ITSELF LIVES IN THE STORE (`tagEventKey`). PushNotifications
     reads this same key back to flip LE_01's Tag CTA to "✓ Tagged", so the
     write and the read must agree; spelling the template literal here as well
     is exactly how they would drift. */
  const eventEndedKey = tagEventKey(system.id)
  const cardOrder = alerting
    ? ['valve', 'type', 'chart', 'insights', 'policy', 'timeline']
    : ['type', 'chart', 'valve', 'policy', 'insights', 'timeline']

  /* One optimistic valve state for the whole system, which is what the new
     card models. The per-device `closedValves` map stays underneath it — the
     topology card still closes valves individually — so this reads "open
     unless every valve is closed" rather than keeping a second source of
     truth. */
  const valves = (system.devices ?? []).filter(d => d.valve)
  const valveState =
    valves.length && valves.every(d => closedValves[d.id] || d.valve === 'closed')
      ? 'closed'
      : 'open'

  /* "1 Valve | 1 Meters" in the comp — counted from the system's own devices
     rather than printed from the frame. */
  const deviceChips = (() => {
    const valveCount = valves.length
    const meterCount = (system.devices ?? []).filter(d => d.meter || d.type === 'meter').length
    return [
      `${valveCount} ${valveCount === 1 ? 'Valve' : 'Valves'}`,
      `${meterCount} ${meterCount === 1 ? 'Meter' : 'Meters'}`,
    ]
  })()

  const steps = stepAvailability(period, periodOffset, consumptionBounds)
  const returnTo = periodTrail[periodTrail.length - 1]?.period ?? null

  /* AlertCard reports every tap through onAction(actionId, event) and reads no
     store itself — it is presentational, and the screen decides what each id
     means. This handler used to open with `if (actionId !== 'paginate') return`,
     so six of the seven ids it can emit did nothing: "On it" and "Ignore" are
     the card's two primary buttons, fully styled, and tapping them was inert.
     The earlier note here said they had "no designed destination", which was
     true of a route but not of state — ignoredIncidents.js and
     investigatingStore.js already back exactly these two actions for the v1
     screens. */
  const [, setAlertTick] = useState(0)
  const bump = () => setAlertTick(n => n + 1) // stores are module-level, so ask for a repaint

  const handleAlertAction = (actionId, event) => {
    const sysId = event?.systemId ?? system.id

    switch (actionId) {
      case 'paginate': {
        const row = carouselRef.current
        if (!row) return
        const step = 308 + 14 // card width + the row's gap-[14px]
        const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 1
        row.scrollTo({ left: atEnd ? 0 : row.scrollLeft + step, behavior: 'smooth' })
        return
      }

      /* 'on-it' and 'ignore' are UNREACHABLE FROM THIS PAGE'S CARD now — the
         owner: "remove actions from here - system page / all needs to be
         handled from the incident", so the card below is mounted
         actions={false} and renders no action row. They are kept rather than
         deleted: AlertCard still emits both ids for any other caller, and
         this switch is the page's one statement of what each id means.
         Nothing behind them was unwired either. EventFocusOverlay writes
         investigatingStore itself for "On it", its onIgnore seam calls back
         into this page's ignore flow (WaterEventFeedbackSheet), and the
         push deep links ?action=ignore / ?action=tag still open those
         sheets here, so that flow, startInvestigating and getCurrentActor
         all stay live. Still reachable from the card: 'paginate'. The
         ignored variant's "Ignored" pill was the other one until 2026-10-17;
         it is a status indicator now, not a control. */
      // "On it" — claim the incident. Idempotent: tapping it twice is not an error.
      case 'on-it':
        /* PRD 04a:158 — "always a person name, never a role". Called without
           an actor, investigatingStore defaults to the literal 'You', so
           every other recipient would read "On it · You". */
        if (!isInvestigating(sysId)) startInvestigating(sysId, { actor: getCurrentActor() })
        bump()
        return

      /* Ignore is IRREVERSIBLE (PRD 06), so it opens the confirm sheet rather
         than firing on the tap. This screen used to call ignoreIncident()
         straight from the button — one tap, no confirmation, no way back, and
         no chance to capture the cause PRD 15 asks for at ignore-commit time. */
      case 'ignore':
        if (!isIgnored(sysId)) setShowIgnoreFlow(true)
        return
      /* 'unignore' IS GONE, 2026-10-17 (owner decision). PRD 14 calls Ignore
         irreversible, the ignore flow itself promises the user "This can't be
         undone for this event", and no other surface in this product — v1 or
         v2 — offers a way back. AlertCard's "Ignored" pill was the only one,
         and it no longer emits the id (AlertCard.jsx, `ignored` variant), so
         this case had no caller left. `clearIgnored` is NOT removed from
         ignoredIncidents.js: the test suite uses it for setup/teardown. */
      case 'show-past-events':
        navigate(`/events/system/${sysId}`)
        return
      case 'action':
        navigate(`/alert/${sysId}`)
        return

      default:
        /* 'sensor-more' is the only id left unhandled. It opens a sensor group,
           and no frame on the delivery canvas draws that expanded state — so it
           stays a no-op rather than being pointed at an invented screen. Named
           explicitly here so the next reader knows it was a decision. */
    }
  }

  /* ── Tapping the alert card opens the event ──────────────────────────────
     Two owner decisions land here.

     1. "dont like the view details and not 45 degrees arrow inside the card."
        The "View details" text button that used to sit under each card is
        gone, and nothing replaced it on the card's face — no diagonal arrow
        (that reads as "opens externally"; this is in-app navigation), and not
        a right chevron either, because the Figma node the card is being
        pixel-matched to (199296:50466) draws no link at all. The card IS the
        affordance.
     2. "remove actions from here - system page / all needs to be handled from
        the incident." So the card is mounted with actions={false} below and
        carries no On it / Ignore row; every action lives in EventFocusOverlay,
        which this tap opens.

     AlertCard's shell is inert by design (AlertCard.jsx:407 — "the Figma frame
     marks no tap target on it, only on the pills inside — so a caller that
     wants 'tap the card to open the event' wraps it"). The wrap is split in
     two: POINTER here, KEYBOARD / assistive tech on the transparent <button>
     the carousel renders beside the card.

     Decision (2) removes the On it / Ignore double-fire, but it does NOT make
     the card interactive-free, so the wrap is not simplified into one big
     <button> around it: a card with pageCount > 1 still renders the pager
     <Button>. Wrapping that in a <button> is button-in-button (invalid HTML,
     React warns), and role="button" + tabIndex on the wrapper is no better:
     ARIA makes a button's children presentational, which traps them. So the
     wrapper stays a plain div that owns only the pointer, the <button> beside
     the card owns focus and the accessible name, and this guard drops clicks
     that originated inside one of the card's own controls — that control has
     already handled them. One tap is always one action.

     `[data-status-pill]` is in the same guard for the opposite reason. The
     `ignored` variant's "Ignored" pill stopped being a control on 2026-10-17
     (PRD 14: Ignore is irreversible), so it has no role and no handler — but
     it must not open the event either, or removing the un-ignore would have
     quietly swapped one tap-action for another. The card marks it rather than
     handling it, so the pill itself stays inert markup. */
  const openEventOnCardTap = (e) => {
    const SELF_HANDLED =
      'button, a, [role="button"], input, select, textarea, label, [data-status-pill]'
    if (e.target?.closest?.(SELF_HANDLED)) return
    setEventFocusOpen(true)
  }

  /* Phone.jsx is a fixed 393x852 frame with overflow:hidden, so this screen
     owns its scroll: the Content column is the single flex:1 / overflowY:auto /
     minHeight:0 element and the header bar is a shrink-0 sibling. The Figma
     frame's 2763px height is a canvas artefact, never a page height. */
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--app-bg)' }}>
      {/* Figma root 198379:80447. The five-stop wash lives in --app-bg on the
          outer shell so TabBar sits on the same ground; this node keeps the
          frame's 8px inset only. */}
      <div
        className="content-stretch flex flex-col gap-[var(--p-0,0px)] items-start p-[var(--spacing\/2,8px)] relative w-full"
        style={{ flex: 1, minHeight: 0 }}
        data-node-id="198379:80447"
      >
        {/* Content 198379:80449 — the one scrolling region on this screen */}
        <div
          /* pt-0: the hero is the first thing in the scroller and its wave
             is pinned to the frame's top edge, so there is no inset above it.
             The Content column's own 10px gutter is restored below the hero. */
          className="content-stretch flex flex-col gap-[22px] items-start pt-[var(--p-0,0px)] px-[var(--pro\/space\/2\,5,10px)] relative w-full"
          style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
          data-node-id="198379:80449"
        >
          {/* HERO — Figma 199296:50183 (calm) / 199296:50454 (alert).
              The whole top region: the page-level wave, the Mobile Header Bar
              drawn on it, and the consumption headline. It bleeds out of the
              Content column's 10px gutter AND the frame's 8px inset so the
              wave reaches the phone's edges the way both nodes draw it. */}
          <SystemHeroCard
            className="-mx-[18px] w-[calc(100%+36px)]"
            title={system.title}
            total={heroTotal}
            delta={heroDelta}
            rangeLabel={consumptionView.label}
            tone={system.alert ? 'alert' : 'calm'}
            expanded={chartOpen}
            onToggleChart={() => setChartOpen(v => !v)}
            onOpenMenu={() => setDrawerOpen(true)}
            /* The comp centres a location name in this slot; this is that,
               made operable. Replaces the breadcrumb row below. */
            scope={
              <ScopePill
                label={system.parentName}
                onOpenTree={() => setDrawerOpen(true)}
                onBack={
                  system.parentName
                    ? () => navigate(`/location/${encodeURIComponent(system.parentName)}`)
                    : undefined
                }
                backLabel={`Back to ${system.parentName ?? 'the parent location'}`}
              />
            }
            /* Moved down from the page chrome rather than dropped. It is
               deliberately inert — this app has no support route — but it
               renders and focuses exactly as it did. */
            headerAction={
              <button
                type="button"
                aria-disabled="true"
                aria-label="Customer support"
                className="cursor-default flex items-center justify-center overflow-clip relative shrink-0 size-[24px] text-[#0a0a0a]"
                data-node-id="I198379:80448;50600:52769;198379:80622"
              >
                <CustomerSupport width={21.995} height={19.995} />
              </button>
            }
          />


          {/* Tabs + body 198379:80456 */}
          <div className="content-stretch flex flex-col gap-[14px] items-start relative shrink-0 w-full" data-node-id="198379:80456">
            {/* THE TAB ROW IS GONE (Overview | General Info).
                It was never a set of peers: Overview is this entity's
                dashboard and General Info is a metadata sheet — two different
                layouts, which is exactly the case NN/g says a tab control must
                not carry ("each in-page tab should have the same layout but
                with different data"). It also cost 36px + its gap on an 852px
                frame, competed with the bottom bar, and neither redesigned
                Figma node draws one.

                Nothing was dropped to remove it: General Info is now the
                collapsed accordion group at the foot of this same scroll —
                which is more than the tab held, because that tab rendered the
                literal string "No design yet for this tab" while the real
                11-section content sat unported in v1. */}

            {/* Body wrapper 198379:80459 */}
            <div
              className="content-stretch flex flex-col gap-[14px] items-start justify-center pb-[var(--spacing\/4,16px)] px-[var(--p-0,0px)] relative shrink-0 w-full"
              data-node-id="198379:80459"
            >
                  {/* Alert carousel 198379:80460 / 199296:50466. Only the alert
                      frame draws one, and `system.alerts` is now empty on a
                      calm system, so this renders nothing there. */}
                  <div
                    ref={carouselRef}
                    className="content-stretch flex gap-[14px] items-center overflow-x-auto relative shrink-0 w-full snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    data-node-id="198379:80460"
                  >
                    {(system.alerts ?? []).map((alert) => (
                      /* One alert fills the column, like every other card on
                         this page. Several stay at the frame's 308px so the
                         row is visibly swipeable.

                         The wrapper is positioned so the focus proxy below can
                         sit over the card, and its onClick IS the card's tap
                         target — see openEventOnCardTap for why the pointer
                         lives here and the keyboard lives on the button.
                         Every variant gets it: a fault card and an ignored one
                         are summaries with nothing to act on, and neither is a
                         reason to have no way to READ the event. Opening it is
                         navigation, not an action, so it puts no control back
                         where one was removed. */
                      <div
                        key={alert.page}
                        onClick={openEventOnCardTap}
                        className={`relative cursor-pointer shrink-0 snap-start ${
                          (system.alerts ?? []).length > 1 ? 'w-[308px]' : 'w-full'
                        }`}
                      >
                        {/* The tab stop and the accessible name. Transparent
                            and pointer-events-none — so it can never swallow a
                            tap meant for something inside the card — but it is
                            a real <button>, so Enter and Space activate it for
                            free, and it is a SIBLING of the card, not an
                            ancestor: nothing inside the card is nested in an
                            interactive element and there is no <button> inside
                            a <button> for React to warn about. First in DOM
                            order so Tab reads "Open <event>" before anything
                            the card still owns; z-10 so the card does not
                            paint over its focus ring. */}
                        <button
                          type="button"
                          onClick={() => setEventFocusOpen(true)}
                          aria-label={`Open ${alert.title || 'event'}`}
                          className="absolute inset-0 z-10 pointer-events-none rounded-[var(--rounded-2xl,18px)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--wint-blue-accent,#0b81f8)] focus-visible:ring-offset-2"
                        />
                        {/* PRD 04a:146-154, locked 2026-06-15: an ignored
                            event renders muted, with the "Ignored by" pill and
                            NO action row. `isIgnored` was read twice in this
                            file and never in render, so after ignoring, the
                            card went on offering live On it / Ignore.

                            actions={false}, flatly — the owner: "remove
                            actions from here - system page / all needs to be
                            handled from the incident." On it and Ignore now
                            live only in EventFocusOverlay, which the tap
                            above opens, so the card is a pure summary.
                            This replaces actions={alert.leak}, which
                            suppressed the row on faults because Ignore is a
                            water-event concept. That distinction has not gone
                            away — it still drives `leak` in alertCardsFor,
                            which decides the status label and whether a flow
                            rate is shown — it is simply redundant HERE, now
                            that no variant on this page shows the row. */}
                        <AlertCard
                          variant={alert.ignored ? 'ignored' : 'mobile'}
                          event={alert}
                          onAction={handleAlertAction}
                          actions={false}
                        />
                      </div>
                    ))}
                  </div>


                  {/* THE CARD STACK — ordered by state, see `cardOrder`.
                      Figma: calm 199296:50202, alert 199296:50467, both a
                      gap-[14px] column. */}
                  {cardOrder.map(key => {
                    if (key === 'type') {
                      return loopDevices.length ? (
                        <Fragment key={key}>
                          {/* System type 199296:50210 / 199296:50475 */}
                          <SystemTypeCard
                            className="shrink-0"
                            tone={alerting ? 'alert' : 'calm'}
                            title={system.topology?.pipeTopology ?? 'Water line'}
                            devices={deviceChips}
                            serialNumber={system.serialNumber ?? 'SN 4471822'}
                            status={alerting ? 'alert' : 'ok'}
                            expanded={loopExpanded}
                            onToggle={next => setLoopExpanded(next)}
                          />
                          {/* The disclosure the card's footer control opens.
                              This is the existing topology card — it is how
                              individual valves get closed, so it is kept and
                              simply moved behind the new control rather than
                              dropped for the redesign. */}
                          {loopExpanded ? (
                            <SystemTopologyCard
                              className="shrink-0"
                              expanded
                              onToggle={() => setLoopExpanded(false)}
                              title={system.topology?.pipeTopology ?? 'Open loop'}
                              topology={system.topology?.config?.schematic ?? 'water-line'}
                              devices={loopDevices}
                              onCloseValve={d => setValveIntent({ action: 'close', device: d })}
                              onCloseAll={() => setValveIntent({ action: 'close-all' })}
                            />
                          ) : null}
                        </Fragment>
                      ) : null
                    }

                    if (key === 'valve') {
                      /* Valve status 199296:50251 / 199296:50515 */
                      return valves.length ? (
                        <ValveStatusCard
                          key={key}
                          className="shrink-0"
                          tone={alerting ? 'alert' : 'calm'}
                          state={valveState}
                          /* Asks; does not act. commitValveIntent does. */
                          /* The card speaks state ('open'|'closed'); the sheet
                             speaks intent ('open'|'close'). Translate here. */
                          onToggle={next =>
                            setValveIntent({ action: next === 'closed' ? 'close' : 'open' })
                          }
                        />
                      ) : null
                    }

                    if (key === 'policy') {
                      /* Active policy 199296:50268 / 199296:50538 */
                      return (
                        <ActivePolicyCard
                          key={key}
                          className="shrink-0"
                          tone={alerting ? 'alert' : 'calm'}
                          policies={system.policies}
                          mode={policyMode}
                          onModeChange={setPolicyMode}
                        />
                      )
                    }

                    if (key === 'chart') {
                      /* The consumption chart, revealed by the hero's "See
                         more". Position is the frame's: 198629:51874 sits
                         directly after the topology card (198629:57165) and
                         before the Events Timeline — i.e. right under System
                         type, which is what carries the topology now. It was
                         briefly pinned above the whole stack, which is not
                         where any frame puts it.

                         NOT REMOVED, just moved behind a control: every prop
                         the card ever had is still passed. */
                      if (!chartOpen) return null
                      return (
                        <Fragment key={key}>
      {/* §3.6 / §19 — the way back out of a drill-down, above the
      card it returns. It renders only while there is something
      to return to, so it cannot read as a dead control on a
      chart nobody has drilled into. */}
      <ConsumptionReturnControl toPeriod={returnTo} onReturn={returnFromDrill} />

      <div
      ref={chartRef}
      className="content-stretch flex flex-col items-center min-w-[288px] overflow-clip relative scroll-mt-[8px] shrink-0 w-full"
      data-node-id="198629:51874"
      >
      <WaterConsumptionCardV2
      className="w-full"
      data={consumptionView.series}
      period={period}
      monthLabel={consumptionView.label}
      onPeriodChange={selectPeriod}
      onMonthChange={stepPeriod}
      picker="dropdown"
      onOpenPicker={() => setPickerOpen(true)}
      compare={compareConsumption}
      onCompareChange={setCompareConsumption}
      compareData={consumptionCompare}
      /* §3.5 — the card reports which bucket was opened; the
      screen owns what "one step finer" means, because only
      it holds the window. */
      onDrillDown={drillIntoBucket}
      onToday={jumpToToday}
      canToday={canJumpToToday(period, periodOffset)}
      canStepPrev={steps.canStepPrev}
      canStepNext={steps.canStepNext}
      />
      </div>
                        </Fragment>
                      )
                    }

                    if (key === 'insights') {
                      /* Insights 199296:50344 / 199296:51143. The sparkline is
                         drawn from this system's own series, so the curve and
                         the figure cannot disagree, and both say the same
                         thing the hero's headline does. */
                      return (
                        <InsightsCard
                          key={key}
                          className="shrink-0"
                          tone={alerting ? 'alert' : 'calm'}
                          changePct={heroFigures.pct}
                          changeLitres={heroFigures.deltaLitres}
                          /* Unreached buckets carry litres === null
                             (PLS-WC-17). Plotting them reads as a crash to
                             zero in the current, partial period, so the
                             sparkline sees exactly what the hero's figure
                             counts. */
                          series={consumptionView.series.filter(p => p.litres != null)}
                        />
                      )
                    }

                    if (key === 'timeline') {
                      /* Events Timeline 199296:50453 / 199296:50716. Passing
                         `events` is what stops the card falling back to
                         MOCK_EVENTS; [] is a legitimate state and the card
                         draws its own empty view for it. */
                      return (
                        <EventsTimelineCard
                          key={key}
                          events={system.timeline}
                          tone={alerting ? 'alert' : 'calm'}
                        />
                      )
                    }

                    return null
                  })}

              {/* General Info — the tab's content, now the last section of the
                  scroll. Collapsed by default (PRD 04h: "Foldable sections - all
                  collapsed by default"), so it costs one row at rest. */}
              <InfoAccordion system={system} />
            </div>
          </div>
        </div>

        {/* One event, full screen. `absolute inset-0 z-50`, opaque, and NO
            portal — a Radix portal escapes Phone.jsx's 393x852 frame — so it
            is mounted inside the frame root 198379:80447 above, which already
            carries `relative`. Mounted unconditionally; open={false} renders
            null.
            onIgnore routes to the ignore flow this page owns, which is now
            WaterEventFeedbackSheet (PRD 06 + 14: irreversible, so it shows
            the consequences and confirms before anything commits). That
            sheet is absolute inset-0 at page level, mounted after this
            frame root, so it draws OVER this overlay and the commit
            repaints the card behind in its ignored state.
            onClaim / onStandDown only ask for a repaint: the overlay has
            already written to investigatingStore by the time they fire, and
            the AlertCard behind reads the same store. */}
        <EventFocusOverlay
          open={eventFocusOpen}
          systemId={system.id}
          onClose={() => setEventFocusOpen(false)}
          onIgnore={sysId => {
            if (!isIgnored(sysId)) setShowIgnoreFlow(true)
          }}
          onClaim={bump}
          onStandDown={bump}
          /* THE VALVE SEAM — EventFocusOverlay's "WHO OWNS WHAT". The overlay
             draws the valve readout and the Close / Open primary but keeps no
             second copy of the state: this page's `closedValves` is the state
             of record, so the overlay reads its value from here or the two
             surfaces drift apart on the same screen.

             `onIntent` COMMITS. It does not ask. It fires only AFTER the user
             has confirmed in the overlay's own ValveConfirmSheet, so routing
             it at this page's `setValveIntent` would stack a second confirm
             sheet on top of a confirmation the user has already given. The
             branch below is commitValveIntent's no-device case, verbatim
             (same file, search `const commitValveIntent`): close every valve,
             or clear the map to open them all. The two must not drift. */
          valve={{
            state: valveState,
            onIntent: action =>
              setClosedValves(
                action === 'close'
                  ? Object.fromEntries(valves.map(d => [d.id, true]))
                  : {},
              ),
          }}
        />
      </div>

      {/* THE IGNORE FLOW — PRD 06 + 14: irreversible, so it confirms before
          it commits, and PRD 15's "why" is captured at commit time.

          THE SHEET CHANGED, 2026-10-17. This was v1's IgnoreBottomSheet
          (src/components/IgnoreBottomSheet.jsx). The owner, looking at it on
          this screen: "make this as part of the design system - currently
          looks like from another app." It is v1 chrome — amber warning panel,
          maroon button, uppercase group labels, the 18-chip two-group
          taxonomy. WaterEventFeedbackSheet is the v2 replacement, built from
          the owner's own mockup (page-water-event-feedback-end.html): shadcn
          + the v2 tokens, the four consequences first, then the one question
          "Was this worth alerting about?" with Ignore-specific chips.
          IgnoreBottomSheet is NOT deleted and NOT restyled — v1's LeakDetail
          and WaterEventDetailsWidget still import it and screenSubscribes
          pins them. This page just stops mounting it, and no other v2 file
          mounts it.

          THE COMMIT IS STILL THIS PAGE'S. onIgnoreConfirmed fires on "Ignore
          anyway"; the sheet writes its own feedback record
          (eventFeedbackStore) but never touches ignoredIncidents. Exactly one
          of onComplete / onCancel then fires per close.

          BOTH ENTRY POINTS land here: EventFocusOverlay's `onIgnore` seam
          (the card -> overlay -> Ignore path) and the push deep link
          ?action=ignore, which the effect above still reads.

          Page level, like ValveConfirmSheet: the sheet is `absolute inset-0`
          and the nearest positioned ancestor is Phone.jsx's 393x852 frame, so
          it covers the phone and nothing else. It is mounted AFTER the frame
          root that holds EventFocusOverlay, so it draws over the overlay the
          Ignore was tapped in, exactly as IgnoreBottomSheet did. */}
      <WaterEventFeedbackSheet
        open={showIgnoreFlow}
        trigger="ignore"
        systemId={system.id}
        systemName={system.title}
        eventLabel={system.alert?.label}
        eventState={eventState}
        onCancel={() => setShowIgnoreFlow(false)}
        onIgnoreConfirmed={() => {
          if (!isIgnored(system.id)) {
            ignoreIncident(system.id, { ignoredBy: getCurrentActor() })
          }
          bump()
        }}
        onComplete={(record) => {
          /* The cause PRD 15 asks for at ignore-commit time. The sheet has
             already persisted the full answer, but the ignored-incident
             record carries the short reason the "Ignored by" pill and the
             overlay read, so the chips and note are folded back into it when
             the user gave any. A bare "Ignore anyway" leaves it null, which
             is what "nothing is mandatory" means here. */
          const summary = record
            ? [record.chips?.join(', '), record.note].filter(Boolean).join(' — ') || null
            : null
          if (summary) {
            ignoreIncident(system.id, { tag: summary, ignoredBy: getCurrentActor() })
          }
          setShowIgnoreFlow(false)
          bump()
        }}
      />

      {/* 198674:184354 — the advanced sheet: pick the last month of the
          window, with future months disabled and a "Latest 12 months"
          shortcut. Page level, because the frame covers the whole phone. */}
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
        windowMonths={windowMonths}
        /* §2 — the footer names the newest window in this grouping's terms. */
        footerLabel={footerLabelFor(period)}
        onApply={applyMonth}
        onSelectLatest12={() => {
          // §4: the footer resets the period and keeps everything else.
          setPeriodOffset(0)
          setPickerOpen(false)
        }}
      />

      <WintSidebarV2 open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {/* THE TAG PATH — PRD 15 §7.1, the push's "Tag the cause" button.

          REPOINTED, 2026-10-17 (owner decision). This mounted v1's
          TagBottomSheet, the 18-chip two-group taxonomy of PRD 15 §5.4.
          WaterEventFeedbackSheet replaces that taxonomy with one question, so
          the push's Tag button lands on the question instead. Neither
          TagBottomSheet nor tagsStore is edited or deleted — LeakDetail,
          ActivityTab, SystemDetail, WaterEventDetailsWidget and
          WaterEventSummary are still five live v1 callers of both. This page
          simply stops mounting the sheet, and no other v2 file mounts it.

          trigger="event-ended", NOT "ignore". Those two are the component's
          whole vocabulary, and 'ignore' opens on the irreversibility gate —
          there is nothing being dismissed here, so it would ask the user to
          confirm an action they never took. 'event-ended' is the pure
          question. It is also the honest reading of where this link comes
          from: `tag` is offered on exactly one push, LE_01 / "End of Leak"
          (notificationActions.js:47), whose body is "The water event ... has
          ended. Please share feedback on this event in the app."

          NOTHING TO COMMIT. The ignore flow above owns ignoredIncidents;
          this path owns no store of its own. The sheet persists the answer
          itself through eventFeedbackStore (addFeedback), under `eventKey`
          rather than the system id — see tagEventKey above for why — so
          onComplete only closes and asks for a repaint.

          Page level and after the frame root, for the same reason as the
          ignore flow: the sheet is `absolute inset-0` and must cover the
          phone, including EventFocusOverlay. */}
      <WaterEventFeedbackSheet
        open={showTagFeedback}
        trigger="event-ended"
        systemId={system.id}
        eventKey={eventEndedKey}
        systemName={system.title}
        eventLabel={system.alert?.label}
        eventState={eventState}
        onCancel={() => setShowTagFeedback(false)}
        onComplete={() => {
          setShowTagFeedback(false)
          bump()
        }}
      />

      <ValveConfirmSheet
        action={valveIntent?.action ?? null}
        deviceName={valveIntent?.device?.name}
        valveCount={valves.length}
        onConfirm={commitValveIntent}
        onCancel={() => setValveIntent(null)}
      />

      <TabBar activeTab="home" hideAlerts />
    </div>
  )
}
