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

/* ── SHELL RECONCILIATION against the two CURRENT page nodes ────────────────
 * Read off saved emitted code, never a live Figma call:
 *   199383:141499  "System page_mobile" — ALERT state   (sysA)
 *   199359:126785  "System page_mobile" — CALM  state   (sysB)
 * BOTH WERE RE-FETCHED ON 2026-10-20, after the designer edited them. Every
 * number and id below is from that refetch; where it differs from what this
 * file used to say, the old reading is named so the change stays visible.
 * They differ in content by exactly one node, the red Alert card
 * 199394:79686 (was 199383:141993), which only sysA carries.
 *
 * ELEMENT ORDER — the 2026-10-20 structural fix. Both nodes read
 *     header bar -> tabs -> consumption hero -> cards
 * because the root's flow children are a gap-[25px] column (199383:141501 /
 * 199394:20585) holding the Mobile Header Bar and then the Tabs row, and the
 * consumption copy is an ABSOLUTE sibling pinned below the tabs. This page
 * used to draw the header bar INSIDE SystemHeroCard, on the wave, so it read
 *     [hero: bar + system name + consumption] -> tabs -> cards
 * The owner, looking at the running app beside the frame: "this is not even
 * similar to figma, not layout not entity screens." The bar is now this
 * file's own shrink-0 chrome above the scroller — see the long HEADER REDRAW
 * block at the markup — and SystemHeroCard is the consumption hero only.
 *
 * ROOT. Both nodes emit the same root class, verbatim:
 *     content-stretch flex flex-col gap-[186px] items-start
 *     px-[var(--spacing\/4,16px)] py-[var(--spacing\/2,8px)] relative size-full
 * (sysA says gap-[224px]; see below.) The PADDING MOVED in the refetch: it was
 * a flat `p-[var(--spacing\/2,8px)]`, and the horizontal half is now 16px.
 * That is carried, and the Content column's own 10px px is dropped with it,
 * because neither node's card column has horizontal padding any more — the
 * root's 16 is the whole gutter. Cards go from an 18px inset to 16px.
 * Two atoms are deliberately NOT carried:
 *   gap-[186px]  a canvas artefact — 224px in sysA, 186px in sysB, which is
 *                itself the tell. The node has two flow children (the
 *                header+tabs group and the cards) and the gap is the empty
 *                band the pasted screenshot bitmap sits in, not a layout gap.
 *                On an 852px frame it would push the whole page below the
 *                fold. This file's own header already names that trap ("the
 *                frame's 2763px height is a canvas artefact, never a page
 *                height").
 *   size-full    = w-full + h-full. h-full is what the app-shell contract
 *                forbids; flex:1 / minHeight:0 is carried in the style object
 *                instead, so only w-full survives.
 * The card column is 199383:141513 "Content" (sysA, gap-[22px] h-[817px]
 * pt-[10px] w-full) / 199359:126794 (sysB, gap-[14px] w-full — the refetch
 * removed sysB's page-level Content wrapper entirely). h-[817px] is the same
 * canvas artefact as the root gap and is not carried. The scroller keeps
 * gap-[22px] and takes pt-[25px], which is the header group's own gap between
 * the bar and the tabs: the bar is outside the scroller now, so that gap
 * becomes the scroller's top inset and the tab row still lands on y=92.
 *
 * SECTION ORDER, top to bottom, straight off the refetched nodes:
 *   sysA (alert)  Alert card 199394:79686
 *                 System type    199383:141519   ("IOT overview")
 *                 Valve status   199383:141553   ("IOT overview")
 *                 Active policy  199383:141576   (node is NAMED "Topology"
 *                                                 but its content is the
 *                                                 Active policy card)
 *                 Events Timeline 199383:141630  ("Card - Q2 Dividend Income")
 *   sysB (calm)   the same four (Valve status is 199396:84018 there), minus
 *                 the Alert card, then Water consumption_M 199384:143078
 *                 LAST, as a sibling of the gap-[14px] wrapper rather than
 *                 inside it.
 * cardOrder below is that order, and it is now the same in both states —
 * sysA keeps System type ahead of Valve status even while alerting, which
 * the previous alert-state swap contradicted.
 *
 * IN THE PAGE BUT IN NEITHER NODE (kept, per the never-drop rule; flagged for
 * the owner rather than deleted):
 *   SystemTopologyCard  the only way to close an INDIVIDUAL valve. Stays as
 *                       the disclosure behind System type's footer control.
 *   InsightsCard        no node on either frame. Ordered last of the mapped
 *                       cards so it cannot displace one the nodes do draw.
 *   InfoAccordion       the real General Info content; see the tab note below.
 *   the burger            NEITHER frame draws one any more. It is the only
 *                         way into the navigation drawer, so it stays in the
 *                         header bar's left group.
 *   the system's NAME     no node names the system anywhere — the header's
 *                         scope slot reads "Meridian Realty Group (MRG)", an
 *                         ACCOUNT, and the only other proper nouns on either
 *                         frame are "Water line" and "SN 4471822". It is kept
 *                         in the header bar's unused second row; see the
 *                         HEADER REDRAW block for why there.
 * IN THE NODES BUT NOT THE PAGE: nothing. Every node card has a component.
 *
 * REPORTED, NOT ACTED ON — the refetch also redrew the Alert card
 * (199394:79686). It used to emit three "Unit wrapper" chips ("L/H flow
 * rate" / "Duration" / "Detected"); it now emits one, with the value and its
 * unit inline under the title and a single detected line carrying the
 * duration. AlertCard is another file's and is untouched here.
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
import SystemTopologyCard from '@/v2/components/SystemTopologyCard'
import SystemTypeCard from '@/v2/components/SystemTypeCard'
import ValveStatusCard from '@/v2/components/ValveStatusCard'
import ActivePolicyCard from '@/v2/components/ActivePolicyCard'
import InsightsCard from '@/v2/components/InsightsCard'
import ValveConfirmSheet from '@/v2/components/ValveConfirmSheet'
import InfoAccordion from '@/v2/components/InfoAccordion'
import SystemHeroCard from '@/v2/components/SystemHeroCard'
import MobileHeaderBar from '@/v2/components/MobileHeaderBar'
/* The pill tab row, shared with HomeAllAccounts. It used to be a local
   `TabTrigger` whose own comment called it "deliberately a near-copy" of that
   page's — which is precisely how the two rows came to paint different
   colours. PillTabs' header records which Figma instance each treatment comes
   from and why they are one component with a `tone`, not two designs. */
import PillTabs from '@/v2/components/PillTabs'
/* The Mobile Header Bar moved here out of SystemHeroCard, and brought these
   with it: shadcn <Button> so the burger's focus ring comes from --ring, and
   cn() for the one class string on the bar that varies. `Menu10` went the
   other way — it was imported here and never used, and the burger glyph the
   node names is menu-01, which is drawn inline below for the reason recorded
   in the HEADER REDRAW block. */
import { Button } from '@/components/ui/button'
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
  previousSpanAligned,
  spanTotal,
  stepAvailability,
  windowMonthsOf,
} from '@/v2/lib/consumptionWindow'
import { getSystemById } from '@/data/systems'
import { INSIGHT_KIND, insightValueLabel } from '@/data/upstream/insightsModel'
import { getCurrentActor } from '@/data/currentUser'
import { getActiveIncident, getLeakState } from '@/data/incidents'
import { getConsumption } from '@/data/consumption'
import { daySpanLabel, getConsumptionSeries } from '@/data/consumptionSeries'
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
import { LocationDot } from '@/v2/icons'

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
   end. Only its leak branch reaches this card now — see the water-only gate
   below — and a leak always carries a flow rate and a volume, so the figure
   slot is never borrowed from the mock's 13,564 and never empty either.

   WATER EVENTS ONLY, 2026-10-18. The owner, on a screenshot of this card
   reading "System Offline": "only water events shall appear here in this
   card / not others." So the gate is `leak`, and offline / valve-error /
   power-lost (and battery-* if the generator ever emits them) return no card.

   NOTHING WENT UNREPORTED WITH IT. A fault is still stated in words on this
   page by the Events Timeline card, which is fed this system's REAL events
   (`timeline` below, built from getEventsForSystem) — generateEvents.js:94-112
   emits one current row per alerting system, so a fault system draws
   "System Offline" / "Valve error" / "AC Power Lost" with "Ongoing · <age>"
   and an Ongoing badge. The System type card's status dot also turns red with
   the accessible name "Alerting" (SystemTypeCard.jsx:277-283), and the page
   keeps its alert tone and its alert card order.

   WHAT DID GO WITH IT: this card was the only route into EventFocusOverlay
   from this page, so the overlay's fault layout (ALERT_META chrome, the
   off- / ve- / pwr- branches) is no longer reachable HERE. It is still
   reachable from HomeAllAccounts' TriageBand rows
   (HomeAllAccounts.jsx:1046 -> :1268). Reported to the owner rather than
   papered over with a replacement surface this page invented. */
/**
 * Is this system's alert an ACTIVE WATER EVENT, as opposed to a device fault?
 *
 * `buildAlert` returns a non-null alert for four different things: a high or
 * low flow event, and also 'offline', 'valve-error' and 'power-lost'. Those
 * last three are real faults and the app reports them — on the valve card, in
 * System health, and in /alerts — but they are not water events.
 *
 * The distinction had been made in ONE place (alertCardsFor, which returns no
 * card for a fault) and not in the other (the page's own `alerting`), so a
 * system with a valve error or a lost AC feed rendered the whole page in its
 * alert state with no alert card to explain it: a red consumption banner over
 * a system with nothing wrong with its water. The owner, on exactly that:
 * "why the banner is red if no active water event".
 *
 * Both now read this.
 */
function isWaterEvent(alert) {
  return alert?.type === 'leak-high' || alert?.type === 'leak-low'
}

function alertCardsFor(alert, systemId) {
  if (!alert) return []

  const leak = alert.type === 'leak-high' || alert.type === 'leak-low'
  /* The gate. `leak` still drives the status label and the flow-rate slot
     below — the helper is left whole rather than rewritten around the one
     branch that now reaches it, because this is a filter, not a redesign. */
  if (!leak) return []
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
    /* 'L/H', not 'L/H flow rate': in the redrawn card (199394:79723) the
       figure and its unit sit together in one chip, so the unit is a unit and
       not a caption. */
    unit: rate ? 'L/H' : '',
    detectedLabel: 'Detected',
    /* The node's Detected line carries a full date and time
       ("Apr 02, 2026 08:13:15"), not the bare clock the compact surfaces use.
       Falls back so a caller without the richer field still renders. */
    detectedAt: alert.startedAtStamp ?? alert.startedAt,
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
    <svg width="10.666" height="2.66" viewBox="0 0 10.666 2.66" fill="none" className="text-slate-400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M5.33338 0.664961C5.70065 0.664961 5.99842 0.962731 5.99842 1.33C5.99842 1.69727 5.70065 1.99504 5.33338 1.99504H5.32752C4.96026 1.99504 4.66249 1.69727 4.66249 1.33C4.66249 0.962731 4.96026 0.664961 5.32752 0.664961H5.33338Z" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.33599 0.664961C9.70326 0.664961 10.001 0.962731 10.001 1.33C10.001 1.69727 9.70326 1.99504 9.33599 1.99504H9.33013C8.96286 1.99504 8.66509 1.69727 8.66509 1.33C8.66509 0.962731 8.96286 0.664961 9.33013 0.664961H9.33599Z" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.33599 0.664961C1.70326 0.664961 2.00103 0.962731 2.00103 1.33C2.00103 1.69727 1.70326 1.99504 1.33599 1.99504H1.33013C0.962859 1.99504 0.66509 1.69727 0.66509 1.33C0.66509 0.962731 0.962859 0.664961 1.33013 0.664961H1.33599Z" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Valve status (I198379:80616;101006:7299;198379:80867) — the gate-valve wheel beside "Open loop".
// 11.7451x11.25 drawn inside a 15px box.
function ValveStatusGlyph() {
  return (
    <svg width="11.7451" height="11.25" viewBox="0 0 11.7451 11.25" fill="none" className="text-slate-500" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M5.87257 10.8351C8.00831 10.8351 9.73968 9.1037 9.73968 6.96796C9.73968 4.83222 8.00831 3.10086 5.87257 3.10086C3.73683 3.10086 2.00547 4.83222 2.00547 6.96796C2.00547 9.1037 3.73683 10.8351 5.87257 10.8351Z" stroke="currentColor" strokeWidth="0.82985" strokeMiterlimit="10" strokeLinecap="round" />
      <path d="M5.87257 1.85611V0.495155" stroke="currentColor" strokeWidth="0.82985" strokeMiterlimit="10" strokeLinecap="round" />
      <path d="M2.94047 0.414925H8.80474" stroke="currentColor" strokeWidth="0.82985" strokeMiterlimit="10" strokeLinecap="round" />
      <path d="M1.73162 6.5625H0.414925" stroke="currentColor" strokeWidth="0.82985" strokeMiterlimit="10" strokeLinecap="round" />
      <path d="M11.3302 6.56252H10.0135" stroke="currentColor" strokeWidth="0.82985" strokeMiterlimit="10" strokeLinecap="round" />
    </svg>
  )
}

// Remix Icons / flood-line — beside "Sensors". Exported 15x15, stretched to
// the frame's 16px box (preserveAspectRatio="none" in the export).
function FloodLine() {
  return (
    <svg width="16" height="16" viewBox="0 0 15 15" fill="none" preserveAspectRatio="none" className="text-slate-500" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M9.99902 11.5225C10.6988 12.0383 11.5641 12.3437 12.5 12.3437H13.2812V12.6562H12.5C11.6739 12.6562 10.9005 12.4361 10.2344 12.0508L10 11.915L9.76465 12.0508C9.09951 12.4357 8.32624 12.6562 7.5 12.6562C6.67385 12.6562 5.90041 12.4361 5.23438 12.0508L5 11.915L4.76465 12.0508C4.09949 12.4357 3.32625 12.6562 2.5 12.6562H1.71875V12.3437H2.5C3.4355 12.3437 4.29969 12.0376 4.99902 11.5225C5.69879 12.0383 6.5641 12.3437 7.5 12.3437C8.43547 12.3437 9.29971 12.0376 9.99902 11.5225ZM11.7188 5.51562L11.5654 5.37598L7.81543 1.9668L7.5 1.68066L7.18457 1.9668L3.43457 5.37598L3.28125 5.51562V10.0596C3.17878 10.0846 3.07485 10.1059 2.96875 10.1211V6.40625H1.83789L7.39453 1.35449C7.43547 1.31728 7.49176 1.3054 7.54199 1.31933L7.58887 1.3418L7.61035 1.35937L13.1621 6.40625H12.0312V10.1201C11.9253 10.105 11.8211 10.0855 11.7188 10.0605V5.51562Z" stroke="currentColor" strokeWidth="0.9375" />
    </svg>
  )
}

// Huge Icons / shut-down — 11.83 drawn inside the frame's 14px box.
function ShutDown() {
  return (
    <svg width="11.83" height="11.8289" viewBox="0 0 11.83 11.8289" fill="none" className="text-slate-400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M3.50529 1.24833C1.8181 2.12152 0.665 3.88304 0.665 5.91388C0.665 8.81337 3.0155 11.1639 5.915 11.1639C8.81449 11.1639 11.165 8.81337 11.165 5.91388C11.165 3.88304 10.0119 2.12152 8.32471 1.24833" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.915 0.665V4.74833" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Lucide Icons / bell — 14x14, fills its box.
function Bell() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-slate-400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M6.00836 12.25C6.106 12.4276 6.24954 12.5757 6.42398 12.6789C6.59842 12.782 6.79737 12.8364 7.00003 12.8364C7.20269 12.8364 7.40163 12.782 7.57607 12.6789C7.75052 12.5757 7.89405 12.4276 7.99169 12.25M3.5 4.66667C3.5 3.73841 3.86875 2.84817 4.52513 2.19179C5.1815 1.53542 6.07174 1.16667 7 1.16667C7.92826 1.16667 8.8185 1.53542 9.47487 2.19179C10.1313 2.84817 10.5 3.73841 10.5 4.66667C10.5 8.75 12.25 9.91667 12.25 9.91667H1.75C1.75 9.91667 3.5 8.75 3.5 4.66667Z" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Huge Icons / clock-01 — 12.9967 inside the frame's 14px box.
function Clock01() {
  return (
    <svg width="12.9967" height="12.9967" viewBox="0 0 12.9967 12.9967" fill="none" className="text-slate-500" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <circle cx="6.49833" cy="6.49833" r="5.83333" stroke="currentColor" strokeWidth="1.33" />
      <path d="M6.49833 4.165V6.49833L7.665 7.665" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* Location Dot — the state pip inside the Off / On badges. ONE glyph, two
   bakes in the design, so the tint is a call-site class on the shared
   src/v2/icons/LocationDot. */
const DOT_TINT = { off: 'text-destructive', on: 'text-[#008236]' }

/* ── Action Policy card (198379:80616) ─────────────────────────────────────
   No component exists for this one yet, so it is built here from the frame.
   Two policy blocks, each a header row plus a slate-100 panel. */

function PolicyStateBadge({ label, tone }) {
  return (
    <div className="bg-surface-card content-stretch flex gap-1 h-[20px] items-center justify-center overflow-clip px-1.5 py-0.5 relative rounded-[26px] shrink-0">
      <div className="content-stretch flex flex-col items-start relative shrink-0">
        <div className="relative shrink-0 size-[12px] flex items-center justify-center">
          <LocationDot size={12} className={DOT_TINT[tone] ?? DOT_TINT.off} />
        </div>
      </div>
      <p className="[word-break:break-word] font-medium leading-4 overflow-hidden relative min-w-px text-[12px] text-muted-foreground text-ellipsis whitespace-nowrap">
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
                      <div className="bg-surface-card content-stretch flex flex-col items-center justify-center relative shrink-0 size-[15px]">
                        <ValveStatusGlyph />
                      </div>
                    ) : (
                      <div className="relative shrink-0 size-[16px] flex items-center justify-center">
                        <FloodLine />
                      </div>
                    )}
                    <p className="[word-break:break-word] font-semibold leading-5 relative shrink-0 text-neutral-950 text-sm whitespace-nowrap">
                      {policy.name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p className="[word-break:break-word] font-semibold leading-5 relative shrink-0 text-neutral-950 text-sm whitespace-nowrap">
              {policy.schedule}
            </p>
          </div>
        </div>

        {/* slate-100 panel */}
        <div className="bg-muted content-stretch flex flex-col gap-[12px] items-start px-[13px] py-[11px] relative rounded-[14px] shrink-0 w-full">
          <div className="content-stretch flex gap-[8px] items-start relative shrink-0">
            {/* Auto Shutoff */}
            <div className="content-stretch flex gap-[5px] items-center relative shrink-0">
              <div className="content-stretch flex gap-[5px] items-center relative shrink-0">
                <div className="content-stretch flex items-center justify-center relative shrink-0 w-[11px]">
                  <div className="relative shrink-0 size-[14px] flex items-center justify-center">
                    <ShutDown />
                  </div>
                </div>
                <p className="[word-break:break-word] font-normal leading-5 relative shrink-0 text-foreground text-sm whitespace-nowrap">
                  Auto Shutoff
                </p>
              </div>
              <PolicyStateBadge label={policy.shutoff} tone={policy.shutoffTone} />
            </div>

            {/* 1px divider — Figma rotates a 19px line 90deg inside a w-0 box */}
            <div className="flex h-[19px] items-center justify-center relative shrink-0 w-0">
              <div className="flex-none rotate-90">
                <svg width="19" height="1" viewBox="0 0 19 1" fill="none" className="text-slate-400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                  <line y1="0.5" x2="19" y2="0.5" stroke="currentColor" />
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
                <p className="[word-break:break-word] font-normal leading-5 relative shrink-0 text-foreground text-sm whitespace-nowrap">
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
              <p className="[word-break:break-word] font-medium leading-[15px] relative shrink-0 text-neutral-950 text-xs whitespace-nowrap">
                {policy.left}
              </p>
            </div>
            <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
              <p className="[word-break:break-word] font-medium leading-[15px] relative shrink-0 text-muted-foreground text-xs whitespace-nowrap">
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
      className="bg-surface-card border border-solid border-card content-stretch flex flex-col gap-0 items-start overflow-clip p-0 relative rounded-[18px] shadow-[0px_0px_0px_0px_rgba(0,0,0,0)] shrink-0 w-full"
      data-node-id="198379:80616"
    >
      {/* CardHeader */}
      <div className="content-stretch flex h-[62px] items-center justify-between px-6 py-3 relative shrink-0 w-full">
        <div className="flex-[1_0_0] min-w-px relative">
          <div className="content-stretch flex flex-col gap-2 items-start py-1.5 relative size-full">
            <p className="[word-break:break-word] font-semibold leading-[18px] relative shrink-0 text-slate-800 text-lg tracking-[-0.45px] w-full">
              Action Policy
            </p>
          </div>
        </div>
        <div className="relative shrink-0">
          <div className="content-stretch flex gap-[12px] items-start relative size-full">
            <div className="content-stretch flex flex-col gap-0 items-start relative shrink-0 w-[57px]">
              {/* Deliberately inert: the delivery canvas has no Action Policy
                  list screen for "View all" to open, and Rule 0 forbids
                  inventing one. aria-disabled + no handler so it does not read
                  as a live control that silently does nothing. */}
              <button
                type="button"
                aria-disabled="true"
                className="content-stretch cursor-default flex gap-1.5 h-[36px] items-center justify-center px-3 py-0 relative rounded-[26px] shrink-0 w-full"
              >
                <p className="[word-break:break-word] font-medium leading-5 relative shrink-0 text-foreground text-sm whitespace-nowrap">
                  View all
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* cardContent */}
      <div className="content-stretch flex flex-col gap-7 items-start justify-center overflow-clip px-[24px] py-3 relative shrink-0 w-full">
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

/* The header bar's type family, as the nodes spell it, carrying the project's
   own fallbacks. String.raw because `\/` in a plain JS string collapses to a
   bare `/`, which Tailwind then reads as an opacity modifier and the class
   never reaches the DOM. */

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
      /* THE DIVISION — "Office" | "Residential". Carried through because the
         Active policy card's Home/Away control is residential-only (owner,
         2026-10-26), and this memo is the only shape that card's call site
         can see. It is the l2 level of the account tree, not a label. */
      l2Name: sys.l2Name ?? null,
      /* The device's own state, carried through rather than left for a caller
         to dig out of `devices`. The System type card's open body reports all
         three, and `power` was reading as "Unknown" because this object never
         had it — `comm` only looked right because its fallback happened to be
         the healthy answer, which is the worse of the two bugs. */
      valve: sys.valve ?? null,
      comm: sys.comm ?? null,
      power: sys.power ?? null,
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
  /* THE CONSUMPTION CHART IS ALWAYS MOUNTED. A `chartOpen` flag used to gate
     it, because the Figma frames (199296:50183 / :50454) put it behind the
     hero's "See more". The owner reversed that on 2026-10-20: "see more is
     only redirect to consumption chart on the dates above, so see less is not
     relevant — and in addition consumption chart shall be always visible."
     So there is no flag, no gate and no closed state; the card renders in the
     Overview stack unconditionally and the hero's control only JUMPS to it.
     `chartRef` is what that jump scrolls to. */
  const chartRef = useRef(null)
  const carouselRef = useRef(null)
  /* Which tab panel is showing. 'overview' is the node's selected state
     (199383:141643 is the filled #c7e3ff trigger) and the one a route lands
     on, so General Info still costs nothing until it is asked for. */
  const [tab, setTab] = useState('overview')

  /* Consumption scope. The card draws the controls; the screen owns what they
     mean, because only the screen knows which system is on the route.
     Switching granularity resets the offset: "three months back" does not
     carry over into a year view. */
  /* MONTH-TO-DATE IS THE DEFAULT WINDOW ON THIS PAGE, AND THIS LINE IS THE
     WHOLE OF THAT CHANGE. The owner, 2026-10-21, on the hero: "this dates
     needs to be date to month / eg for today 1-21.10 / compare is to last
     dates in previous month".

     Month-to-date is not a new grouping. It is the DAILY window at offset 0:
     the calendar month the last reading falls in, drawn at its true length
     with the days it has not reached carrying litres === null (§5 /
     PLS-WC-17). The elapsed span is therefore exactly the rows that carry a
     reading, which is what the hero's figure sums and what `labelRange`
     ("Oct 1–21") names. No parallel window type, no clipping, no second code
     path — the machinery was already here and only the default and the
     caption moved.

     THIS OVERRIDES PLS-WC-03 / §2 FOR THIS PAGE, AND ONLY FOR THIS PAGE.
     That rule ("Monthly is the default grouping at every level") came from an
     earlier reading of §2; the instruction above is newer, explicit, and
     about this hero. HomeAllAccounts still opens on Monthly, because it has
     no hero caption and the owner said nothing about it — so the two screens
     now open their charts on different groupings. That divergence is
     deliberate and is flagged for the owner rather than papered over.

     THE TWELVE-MONTH WINDOW IS NOT ORPHANED (v2-page-parity Rule 0): Monthly
     is still in the grouping dropdown, still rolling, still labelled "Nov
     2025 - Oct 2026", and the hero caption follows it there — `labelRange`
     only exists on Daily, so Monthly's caption is unchanged. Nothing was
     removed; a different window is simply what the page opens on. */
  const [period, setPeriod] = useState('D')
  const [periodOffset, setPeriodOffset] = useState(0)

  /* §20.1 / PLS-WC-15 — the trail of periods OPENED, newest last. Each entry
     is the {period, offset} a drill-down was launched from.

     THE VISIBLE CONTROL IS GONE; THE TRAIL IS NOT. 2026-10-20, the owner's
     instruction on seeing the pill above the chart: "what is back to monthly?
     remove it." ConsumptionReturnControl and `returnFromDrill` were removed
     here and on HomeAllAccounts. DO NOT RESTORE THEM without asking.

     What that costs, measured in the browser before the removal: drilling
     from the Nov 2024 - Oct 2025 window into Oct 25 opens Daily / "October
     2025", and the pill put Nov 2024 - Oct 2025 back in ONE tap. Without it,
     picking Month from the grouping dropdown lands on Nov 2025 - Oct 2026 —
     `selectPeriod` resets the offset to 0 (§3.1), so the dropdown is a reset,
     never a way back. The window is still reachable, just not in one tap:
     dropdown -> Month, then the period stepper or the Select period sheet.
     The owner accepted that; it was his ask.

     THE TRAIL ITSELF STILL DOES WORK, which is why it stays: jumpToChartFromHero
     reads `periodTrail[0]` so the hero's "See more" unwinds a drill and lands
     on the caption's window with compare on — a behaviour the owner asked for
     explicitly, and the one most at risk from a careless cleanup here. Delete
     the trail and that breaks. It survived the 2026-10-20 removal of the gate
     for the same reason it survived the removal of the "Back to Monthly" pill:
     its visible control going away is not the same as the state being dead. */
  const [periodTrail, setPeriodTrail] = useState([])

  /* "See more" sits in the hero at the very top; the chart lands below the
     alert carousel and the topology card, far enough down that on a 393x852
     frame a control that only changed state down there would look inert. Bring
     the user to it.

     IMPERATIVE, AND IN THE HANDLER. This used to be an effect keyed on
     `chartOpen`: opening flipped the flag, the effect ran, the page scrolled.
     With the chart always mounted there is no flag left to key on, and —
     the part that actually decides the shape — the SECOND tap in a row must
     scroll too. Every state this handler sets is already at its target value
     by then, so nothing changes and no effect would fire. The honest fix is to
     scroll where the tap is handled. (A counter bumped per tap would re-fire
     an effect, but it is state that exists only to be changed, and the next
     reader would have to work out that it means nothing.)

     One animation frame of grace before reading the ref: the same tap may have
     switched the tab back to Overview, and the chart mounts in React's commit,
     which lands before the next frame. The second frame is for the commit a
     slow first paint pushes past the first — cheap, and it costs nothing when
     the node is already there. */
  const scrollChartIntoView = () => {
    if (typeof requestAnimationFrame !== 'function') return
    const reveal = () => {
      const node = chartRef.current
      if (!node?.scrollIntoView) return false
      node.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return true
    }
    requestAnimationFrame(() => {
      if (!reveal()) requestAnimationFrame(reveal)
    })
  }

  const consumptionView = useMemo(
    () => getConsumptionSeries(system.id, system.title, period, periodOffset),
    [system.id, system.title, period, periodOffset],
  )

  /* The hero's headline figures used to be computed HERE, straight off
     `consumptionView`. They now need the window BEFORE this one to say what
     the percentage means, and that needs `consumptionBounds` to know whether
     a previous window really exists — so the block moved below the bounds it
     depends on. See `heroFigures` further down.
     Nothing about the hero's relationship to the chart changed: it still
     reads the same `consumptionView` the chart plots. */

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

  /* PLS-WC-20 / §3.2 — is there REALLY a window before this one?
     bucketMonthly CLAMPS its offset forward at the start of the series, so
     that a window is always drawn at full length. The consequence matters
     here: at the oldest window `offset - 1` clamps back onto the SAME twelve
     buckets, and getConsumptionSeries hands back a copy of the reading itself.
     Plotted as "the previous period" that is a comparison the data cannot
     support — a reference series identical to the bars behind it. canStepPrev
     is the same test the back chevron uses, so the comparison is offered on
     exactly the windows that have something before them.

     MONTHLY *AND DAILY* SINCE 2026-10-21. PLS-WC-20 made this Monthly-only;
     the owner then asked for the comparison on precisely the Daily window —
     "compare is to last dates in previous month" — so Daily was added here
     and in the card (COMPARABLE_PERIODS), which is what draws the switch.
     Hourly and Yearly are unchanged: an hour against the same hour yesterday
     is noise, and Yearly plots the whole span at once. The clamp test is the
     same one for both groupings, so the oldest window withholds a comparison
     at Daily for exactly the reason it does at Monthly. */
  const hasPreviousPeriod = useMemo(
    () =>
      (period === 'M' || period === 'D') &&
      stepAvailability(period, periodOffset, consumptionBounds).canStepPrev,
    [period, periodOffset, consumptionBounds],
  )

  /* ── THE COMPARISON, AS DATA ────────────────────────────────────────────
     "compare is to last dates in previous month" (the owner, 2026-10-21).

     The window before this one, clipped to the SAME SPAN — October has read
     21 days, so the comparison is September 1-21 and not all thirty of it.
     previousSpanAligned() owns that arithmetic and the short-month clamp with
     it (31 March compares against 1-28 February, because February has no
     29th to slice); the year boundary is the data layer's, which steps whole
     month indices so December-from-January is not a special case.

     THIS IS DELIBERATELY JUST DATA. How a comparison should be DRAWN on a
     month-to-date window is an open question — the owner, on seeing two bar
     series proposed: "we need to think smartly how to do that, 60 bars on
     mobile is not a good idea." So this memo produces an index-aligned series
     and stops. `consumptionCompare` below feeds it to the chart in the one
     form the chart already has, and the hero reads the same rows for its
     percentage; an overlaid line, a cumulative pace line or a weekly roll-up
     would all be built from this same value without changing it. */
  const consumptionCompareSpan = useMemo(() => {
    if (!hasPreviousPeriod) return null
    const previous = getConsumptionSeries(system.id, system.title, period, periodOffset - 1).series
    return previousSpanAligned(consumptionView.series, previous)
  }, [hasPreviousPeriod, consumptionView, system.id, system.title, period, periodOffset])

  /* The span is computed whether or not the comparison is SHOWN, because the
     hero's percentage reads it either way — "+100%" over a caption is a
     comparison whether or not a line is drawn for it. This is the switch's
     view of the same rows. */
  const consumptionCompare = useMemo(
    () => (compareConsumption && hasPreviousPeriod ? consumptionCompareSpan : null),
    [compareConsumption, hasPreviousPeriod, consumptionCompareSpan],
  )

  /* What the chart's legend calls the two series. Both are the elapsed spans
     in the owner's caption form — "Oct 1–21" over the bars, "Sep 1–21" over the
     line — so the legend states the comparison instead of calling it
     "previous period", which stopped being true when the comparison became
     the previous month's MATCHING DATES rather than the whole of it. Only
     Daily has a day-span to name; at Monthly both come back null and the card
     falls back to its generic wording. */
  const consumptionSpanLabel = consumptionView.labelRange ?? null
  const consumptionCompareLabel = useMemo(
    () => daySpanLabel(consumptionCompareSpan),
    [consumptionCompareSpan],
  )

  /* The hero's headline figures. The comp prints "5,83L +120%" over a date
     range; the figure comes from the series the chart below already plots, so
     the two can never disagree. Unreached buckets carry litres === null
     (PLS-WC-17) and are excluded, exactly as deriveStats does — which is what
     makes the figure month-to-DATE rather than month-to-end: on the 21st it
     sums the 21 days that have a reading and ignores the ten that do not.
     WHAT THE PERCENTAGE MEANS CHANGED ON 2026-10-21. It used to be the
     window's first half against its second — all a single window can say
     without a second read, and the reason the hero showed "+100%" against a
     twelve-month range. The owner asked for a real comparison: "compare is to
     last dates in previous month". So it is now this window's elapsed total
     against the SAME SPAN of the window before it, and the fallback to
     half-against-half survives only where there is no window before this one
     (the oldest window, and Yearly, which is the whole series at once). */
  const heroFigures = useMemo(() => {
    const read = (consumptionView?.series ?? []).filter(p => p.litres != null)
    /* `pct: null`, matching the key the hero actually reads. This said
       `delta: null` and went on saying it after the hero stopped reading
       `delta`, which left the empty case returning no `pct` at all. It
       happened to render correctly (the hero tests `!= null` and `undefined`
       passes that), but it was the right answer by accident. */
    if (!read.length) return { figure: '—', unit: null, total: '—', pct: null }
    const total = read.reduce((sum, p) => sum + p.litres, 0)
    const fmt = n =>
      n >= 1e6 ? `${(n / 1e6).toFixed(2).replace(/\.?0+$/, '')}M` :
      n >= 1e3 ? `${(n / 1e3).toFixed(2).replace(/\.?0+$/, '')}K` : String(Math.round(n))

    const against = spanTotal(consumptionCompareSpan)
    let older
    let newer
    if (against != null) {
      older = against
      newer = total
    } else {
      const half = Math.floor(read.length / 2)
      older = read.slice(0, half).reduce((s, p) => s + p.litres, 0)
      newer = read.slice(half).reduce((s, p) => s + p.litres, 0)
    }
    const pct = older > 0 ? Math.round(((newer - older) / older) * 100) : null
    return {
      /* FIGURE AND UNIT ARE SEPARATE NOW. 199383:141636 draws "5,830" at
         42.222/58.056 and 199383:141637 draws "L" beside it at 20/20 — two
         runs at two sizes, which one string cannot be. `total` keeps the
         joined spelling for anything that wants one line. */
      figure: fmt(total),
      unit: 'L',
      total: `${fmt(total)}L`,
      pct,
      deltaLitres: Math.round(newer - older),
      /* Whether the percentage is a real comparison or the half-against-half
         fallback. Nothing reads it yet; it is here so that a caller who wants
         to caption the percentage does not have to re-derive the answer. */
      comparedToPrevious: against != null,
    }
  }, [consumptionView, consumptionCompareSpan])

  const heroTotal = heroFigures.figure
  /* `heroDelta` is gone with the pill that printed it. The hero takes the
     SIGNED number now and formats both of its marks itself; the pre-joined
     "+120%" string had no second reader. */

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
    /* PLS-WC-20 made the comparison Monthly-only and this cleared it for
       anything else. Daily joined Monthly on 2026-10-21 (see the card's
       COMPARABLE_PERIODS), so clearing it on a move to Daily would switch off
       a control the card is still drawing. Hourly and Yearly still clear,
       because the card withdraws the switch there. */
    if (next !== 'M' && next !== 'D') setCompareConsumption(false)
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
    // Same rule as selectPeriod above: Daily keeps the comparison.
    if (target.period !== 'M' && target.period !== 'D') setCompareConsumption(false)
  }

  /* §3.6 / PLS-WC-15 used to put a `returnFromDrill` here, driving the
     "‹ Back to Monthly" pill above the chart. Both went on 2026-10-20 at the
     owner's instruction — see the note on `periodTrail` above for what that
     costs and why the trail itself stayed. */

  /* ── The hero's "See more" ──────────────────────────────────────────────
     The hero prints a headline over a date range and offers one control. The
     owner's ask is that the control stop being a disclosure triangle and
     become an ENTRY POINT: "when user clicks on see more it redirect him the
     consumption chart with context of the date written above and with the
     compare to previous month".

     2026-10-20 FINISHED THE JOB: "see more is only redirect to consumption
     chart on the dates above, so see less is not relevant — and in addition
     consumption chart shall be always visible." The chart no longer opens,
     because it is never closed. What is left is exactly the three things that
     were always the feature, minus the opening:
         unwind the drill -> turn compare on -> scroll the chart into view.
     None of the three is a side effect of opening; each is spelled out below
     and each must survive any future tidy-up of this handler.

     The context half is already true and must not be re-derived: the caption's
     `rangeLabel` IS `consumptionView.label`, and the chart below plots
     `consumptionView.series`. One window, read twice — they cannot disagree.

     What was missing is that the jump was not DETERMINISTIC. A drill-down
     (§3.5) changes the grouping and the offset, so a user who opened a bucket
     and then came back up to the hero found a caption naming one day and a
     chart on it. The caption still agreed with the chart, but neither matched
     the twelve-month window the control is understood to offer. So the jump
     unwinds the drill to the window it was launched from —
     `periodTrail[0]`, the entry the oldest drill recorded — and empties the
     trail. Unwinding and emptying are ONE action: the trail describes drills
     that are still on screen, and once the window it recorded IS the window on
     screen there is nothing left to unwind. Emptying it while leaving the
     drilled window would be the incoherent half — it would strand the user a
     level down with no record of where he came from.

     This is NOT a grouping reset. A grouping the user chose from the dropdown
     clears the trail itself (§3.1), so there is nothing to unwind and Yearly
     stays Yearly — §4's rule that an action must not reset what the user
     expects to keep. Only a drill, which the user navigated INTO and then
     closed, is undone.

     Compare goes on at EVERY tap, not only the first — the point of an entry
     point is that it lands you somewhere known. The user can switch it off
     from inside the card and nothing here turns it back on until the control
     is tapped again. Two things can refuse it, and both refuse by leaving it
     off rather than by showing a comparison that is not there:
       · PLS-WC-20 — the comparison is Monthly-only. Outside Monthly the card
         does not even draw the switch.
       · there is no previous period. At the oldest window the data layer
         clamps and would hand back the window itself; `hasPreviousPeriod`
         says so and the chart is left honestly uncompared.

     And the grouping the USER picked is never overridden: picking one from the
     dropdown clears the trail (§3.1), so there is nothing to unwind and the
     jump keeps Daily on Daily. PLS-WC-20 then leaves compare off, because it
     is Monthly-only. The owner's ruling on exactly this case: "ok so w/o
     compare, just take me to relevant dates." */
  const jumpToChartFromHero = () => {
    /* The window the first drill was launched from, clamped the way every
       other offset on this page is, so a reset can never land outside what
       the series can fill (PLS-WC-09). */
    const root = periodTrail[0]
    const nextPeriod = root ? root.period : period
    const nextOffset = clampOffset(nextPeriod, root ? root.offset : periodOffset, consumptionBounds)

    if (root) {
      setPeriod(nextPeriod)
      setPeriodOffset(nextOffset)
      setPeriodTrail([])
    }

    /* Asked of the window being OPENED, not the drilled one being left.
       Daily joined Monthly here on 2026-10-21, which is what makes the jump
       keep its original promise on the window the page now opens on: "when
       user clicks on see more it redirect him the consumption chart with
       context of the date written above and with the compare to previous
       month". The caption names Oct 1–21 and the chart lands on it with
       Sep 1–21 drawn over it. */
    const canCompare =
      (nextPeriod === 'M' || nextPeriod === 'D') &&
      stepAvailability(nextPeriod, nextOffset, consumptionBounds).canStepPrev
    setCompareConsumption(canCompare)

    /* The third of the three, and the only one with no state behind it. It
       runs on every tap, including a tap that changed nothing above. */
    scrollChartIntoView()
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
  /* `alerting` stays ANY alert, water event or device fault. The cards that
     take it report system state, and v2ControlsWired pins the reason: on a
     fault system the carousel draws no card, so the System type card's status
     dot ("Alerting") is what still tells a screen reader the system is in
     trouble. Narrowing this is how you make a fault silently disappear —
     which a first pass at the fix below did, and that test caught it. */
  const alerting = Boolean(system.alert)
  /* The CONSUMPTION BANNER is the one thing that follows the water event
     instead. Owner: "why the banner is red if no active water event". A red
     wave across the consumption figure says the water is wrong; a valve error
     or a lost AC feed is not that, and with the carousel gated to leaks there
     was no card on the page to explain the red. The fault keeps every other
     way it had of being seen. */
  const waterAlerting = isWaterEvent(system.alert)

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
  /* The nodes' order, and it no longer forks on state: 199383:141499 (alert)
     and 199359:126785 (calm) draw System type, Valve status, Active policy,
     Events Timeline in that sequence, and 199359:126785 puts Water
     consumption_M (199384:143078) AFTER the timeline rather than under System
     type. 'insights' has no node on either frame and is parked last so it
     cannot displace a card the design does draw. */
  const cardOrder = ['type', 'valve', 'policy', 'timeline', 'chart', 'insights']

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
      {/* Figma root 198379:80447, with the padding of the CURRENT frames —
          199383:141499 / 199359:126785 both emit
          `px-[var(--spacing\/4,16px)] py-[var(--spacing\/2,8px)]`. It used to
          be a flat 8px all round, and the 2026-10-20 refetch is where the
          16px gutter arrived; the Content column's own 10px px went with it,
          because in both nodes Content now has no horizontal padding at all
          and the root's 16 is the whole gutter. Net effect on the cards: an
          18px inset becomes 16px.
          The five-stop wash lives in --app-bg on the outer shell so TabBar
          sits on the same ground. */}
      <div
        className="content-stretch flex flex-col gap-0 items-start px-4 py-2 relative w-full"
        style={{ flex: 1, minHeight: 0 }}
        data-node-id="198379:80447"
      >
        {/* MOBILE HEADER BAR - 199383:141502 (alert) / 199394:20586 (calm).
         *
         * The bar itself now lives in MobileHeaderBar, because the Location
         * frames draw the identical bar (199360:129729) and two hand-matched
         * copies of one node drift apart. That file holds the node's geometry
         * and the owner's instruction for what each control does; this one
         * only says what those controls mean ON A SYSTEM.
         *
         * IT IS FIXED CHROME, not the first thing in the scroll. A Figma frame
         * has no scroll model, so the node cannot answer this and the reason
         * is the app's: the bar is the only door into the navigation drawer,
         * and a door that scrolls out of reach is one you have to hunt for.
         * It is also what the app-shell contract means by chrome - a shrink-0
         * sibling of the scroller, not a sticky child.
         *
         * LIFTED OUT OF SystemHeroCard, 2026-10-20. It used to be drawn ON the
         * hero wave, which made the page read
         *     [hero: header bar + system name + consumption] -> tabs -> cards
         * against a design that reads
         *     header bar -> tabs -> consumption hero -> cards
         * In both nodes the bar is the first child of a gap-[25px] column
         * (199383:141501 / 199394:20585) whose second child is the Tabs row.
         *
         * NO px. Neither node emits horizontal padding on the bar - the root
         * frame's 16px is the inset - so nothing is added here. */}
        <MobileHeaderBar
          nodeId="199383:141502"
          /* THE SLOT CARRIES THE SYSTEM, not the parent location.
             The node centres an ACCOUNT here ("Meridian Realty Group (MRG)"),
             because that frame's scope is an account. On /system/:id the scope
             is the system, so that is what the slot names — and it is how the
             system's name survives the bar losing its second row. Dropping the
             name outright is not on the table: systemPageRouteData.dom.test.jsx
             pins it, and it is the whole guard against the Floor-26 bug, where
             every system in the app rendered the same hardcoded building. */
          label={system.title || system.parentName || 'System'}
          /* A frame has no history. The parent location is the real parent
             scope, so that is where back goes; when the system has no parent
             the control is not drawn at all rather than drawn inert. */
          onBack={system.parentName
            ? () => navigate(`/location/${encodeURIComponent(system.parentName)}`)
            : undefined}
          backLabel={system.parentName ? `Back to ${system.parentName}` : 'Back'}
          onOpenTree={() => setDrawerOpen(true)}
        />

        {/* Content 198379:80449 — the one scrolling region on this screen.

            IT BLEEDS, AND RE-APPLIES THE GUTTER AS ITS OWN PADDING. Both
            nodes put the 16px gutter on the ROOT (199383:141513 and
            199359:126794 carry no horizontal padding of their own), and that
            is what this used to do — px-0 here, px-16 above. It gave the
            screen a horizontal scrollbar.

            Why: the hero below bleeds out to the phone's edges with
            `-mx-[16px] w-[calc(100%+32px)]`, because the nodes place the wave
            against the 393-wide root frame. With the gutter on the root this
            scroller's box was only 361 wide, so the hero was 32px wider than
            its scroll container. In LTR a negative LEFT margin is simply
            unreachable — you cannot scroll to it — but a negative RIGHT
            margin becomes scrollable width. So the screen scrolled 16px
            sideways, which is exactly what the owner saw: "why this is not
            responsive and i have horizontal scroll".

            Pulling the scroller out to the full 393 and giving it px-16
            leaves every card on the same 16px inset, and puts the hero's
            margin box exactly on the scroller's padding box — so there is
            nothing left to scroll to. scripts/check-shell-contract.mjs holds
            the invariant (`bleed-needs-a-bleeding-scroller`), because a 16px
            sideways scroll leaves lint, build and all 857 tests green.

            overflowX:clip is belt-and-braces for whatever lands here next; it
            clips at the padding box, which the hero now exactly fills.

            pt-[25px] is the gap the header group puts between the bar and the
            Tabs row — the bar is outside the scroller now, so the gap becomes
            the scroller's top inset and the tab row still lands on the node's
            y=92. */}
        <div
          /* SPACING, 2026-10-26, measured off 199703:31475 rather than
             estimated. The frame's root is px-[16px] py-[8px] (which this
             page's root already matches) and inside it:

               Mobile Header Bar  h-59          y =  8..67
               gap                10
               Tabs row           h-36          y = 77..113
               gap                16
               hero (absolute)    top-[129px]   y = 129..420, copy ends 287
               Content            pt-[10px]     first card at y = 305

             This carried pt-[25px] and gap-[22px], which is 15px too much air
             above the tab row and 6px too much under it: 21px of extra slack
             before the hero, on a page the owner has already asked to tighten
             once ("update spacing on header area, now its more compact in
             figma").

             ONE GAP CANNOT SPELL BOTH of the frame's two values: tabs->hero
             is 16 and hero->first card is 18 (8 of root gap plus Content's
             own pt-10). 16 is the one that shows, because it sits between two
             visible edges, so it is the one taken; the body lands 2px tighter
             than the frame, which is inside the drift the frame has on its
             own gutters (17 left against 16 right). */
          className="content-stretch flex flex-col gap-[16px] items-start pt-[10px] -mx-[16px] w-[calc(100%+32px)] px-[16px] relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ flex: 1, overflowY: 'auto', overflowX: 'clip', minHeight: 0 }}
          data-node-id="198379:80449"
        >
          {/* Tabs + hero + body. The gap-[14px] wrapper 198379:80456 that used
              to hold tabs and body together is gone: the hero now sits BETWEEN
              them, which is where both nodes put it, so the three are siblings
              at the scroller's own gap-[22px]. */}
          {/* THE TAB ROW, RESTORED. Owner, explicitly: follow Figma's tab
                concept. It had been removed here, and the removal's own note
                is answered point by point rather than discarded:
                  · "neither redesigned Figma node draws one" — that was true
                    of the frames this file was traced from then. It is NOT
                    true of the current ones: 199383:141499 and 199359:126785
                    BOTH draw a Tabs node (199383:141512 / 199394:20601) in
                    the header group, above Content.
                  · "it cost 36px + its gap" — still true, and still the
                    design's price. The row rides INSIDE the scroller rather
                    than as fixed chrome, so it scrolls away with the hero and
                    the 852px frame keeps its standing budget.
                  · WHAT THE REMOVAL WAS PROTECTING, and what is preserved
                    here: the real General Info content. The old tab rendered
                    the literal string "No design yet for this tab" while the
                    11 real sections sat unported in v1; the removal replaced
                    it with InfoAccordion, the actual port. That port is what
                    the General Info tab opens now — the tab came back, the
                    placeholder string did not. Nothing regressed to a stub.

                The tab row is NOT fixed chrome, and it is now the FIRST thing
                in the scroll. Figma puts Tabs in the header group as a sibling
                of Content; this page keeps only the Mobile Header Bar out of
                the scroller, because only the bar carries navigation (the
                burger and the back control) that must not scroll out of reach.
                The tabs scroll away with the hero, which is what keeps the
                852px frame's standing budget. Order matches the node either
                way: bar, tabs, hero, cards.

                NOT IMPLEMENTED — the middle trigger. Both nodes draw a second
                trigger labelled "Locations" carrying a count Badge of 8. A
                leaf system has no child locations and nothing here counts 8,
                so rendering it would mean either a dead tab or an invented
                figure. Omitted and flagged for the owner; PillTabs still
                implements the Badge, so restoring it is adding a `count` to
                the item once there is a real one. (HomeAllAccounts keeps that
                trigger because an account scope genuinely has a fleet count.)

                THE COLOUR. This row used to be a near-copy of HomeAllAccounts'
                TabTrigger, which is how the two came to paint differently: the
                Location row was restyled on 2026-10-20 and this one was not,
                and the owner saw one screen's selected tab dark slate and the
                other's pale blue. Both are now PillTabs.

                ── RULING 1, 2026-10-20: PALE BLUE — SUPERSEDED ────────────
                sysA (199383:141512) and sysB (199394:20601) both emit the
                pale-blue pill, re-read live on 2026-10-20. The owner ruled for
                that pale blue and both pages passed `tone="blue"`.

                WHY THAT NEEDED SAYING, AND STILL DOES: by provenance alone the
                other reading looks better supported. All four instances of this
                row (the two here, the two on the Location page) come from ONE
                master — slot 101485:143349 — and were byte-identical before
                2026-10-20, when the designer restyled exactly one of them,
                locA, to a dark slate pill. An agent re-deriving the colour from
                Figma keeps arriving at whatever was edited last. That is not
                the shipped answer; the owner's word is. THAT REASONING IS WHY
                THIS BLOCK EXISTS — the ruling it was written for is not.

                ── RULING 2, 2026-10-21: THE OUTLINED TREATMENT ───────────
                ⚠ THIS IS WHAT SHIPS. The designer restyled locA again, to an
                outlined treatment, and the owner — shown that locA still
                contradicts its own calm state — ruled to adopt it on BOTH
                pages and BOTH states. The three frames that still draw pale
                blue are stale, not a second design. Selection is a 1px
                brand-blue border and a semibold brand-blue label rather than a
                fill, every trigger sits on the house card surface at radius
                100px, and the row is 32px.

                `tone` had nothing left to select between and is GONE from
                PillTabs; this page no longer passes it. Do not reintroduce it.
                Full history in PillTabs' header, which is the single copy.

                The Figma file is still self-contradictory either way: locB is
                the SAME Location screen as locA in its calm state and
                disagrees with it, which a per-surface design decision could not
                do. Note also that nothing here sits on the hero wave — Figma
                puts Tabs in the header group ABOVE Content and pins the wave
                below the row (see the hero block below) — so there was never a
                contrast argument for the two screens differing. */}
            <div
              className="content-stretch flex items-center justify-between relative shrink-0 w-full"
              data-node-id="199383:141511"
            >
              <PillTabs
                nodeId="199383:141512"
                slotNodeId="I199383:141512;101485:143349"
                value={tab}
                onChange={setTab}
                items={[
                  { id: 'overview', label: 'Overview' },
                  { id: 'general', label: 'General Info', pill: 'wide' },
                ]}
              />
            </div>

            {/* THE CONSUMPTION HERO — the wave and the headline on it, and
                nothing else. 199383:141500 + 199396:84050 (alert) /
                199394:79634 + 199394:79635 (calm). Both nodes pin it BELOW the
                tab row, 20px under it, which is where it now sits.

                IT NO LONGER BLEEDS. It carried `-mx-[16px]
                w-[calc(100%+32px)]` on the reasoning that the nodes pin the
                wave to the ROOT frame rather than to the card column. But
                402 - 17 - 369 = 16, so `left-[17px]` on a 402 frame IS the
                card gutter, and 199703:31476 settles it: the hero is
                `left-[17px] w-[369px]` against a Content column of w-[370px]
                at px-[16px]. Spanning the full 393 put the wave four pixels
                proud of every card beneath it, the whole length of the page.
                See the wave's own note in SystemHeroCard.

                It stays visible on BOTH tabs rather than living inside the
                Overview panel: in all three frames the wave is a page-level
                layer the cards scroll over, not a card in the list. */}
            <SystemHeroCard
              total={heroTotal}
              unit={heroFigures.unit}
              /* SIGNED NUMBER, not the formatted string this used to pass.
                 199703:30816 splits the delta into a triangle and an unsigned
                 figure, and only the raw sign can drive both without the two
                 being able to disagree. See the prop's own note. */
              deltaPct={heroFigures.pct}
              /* The span the percentage is measured against, which is the
                 SAME label the chart's legend puts over its comparison line
                 (consumptionCompareLabel). One comparison, named once, read
                 in two places. Null wherever there is no previous window
                 (the oldest one, and Yearly), and the hero then draws the
                 percentage with no "vs." caption. */
              compareLabel={consumptionCompareLabel}
              /* THE CAPTION IS THE WINDOW'S ELAPSED SPAN WHERE THERE IS ONE.
                 "this dates needs to be date to month / eg for today 1-21.10"
                 — `labelRange` is that form and only the Daily grouping
                 carries it, so Monthly still captions "Nov 2025 - Oct 2026"
                 and nothing about the twelve-month window changed. The
                 fallback is what makes this one line rather than a branch.
                 The caption and the chart still name ONE window — the hero
                 reads `consumptionView`, the chart plots it — but they now
                 SPELL it differently: "Oct 1–21" here, "October 2026" in the
                 period control, which needs a month and a year to split
                 (splitPeriodLabel) and would be broken by a bare range. Same
                 window, two spellings for two readers. */
              rangeLabel={consumptionView.labelRange ?? consumptionView.label}
              tone={waterAlerting ? 'alert' : 'calm'}
              /* NO `expanded`, because there is nothing to expand: the chart
                 is always mounted below and this control only takes you there.
                 The hero draws "See more" and nothing else, and carries no
                 aria-expanded — see the control in SystemHeroCard.

                 BOTH sides of the 2026-10-20 merge land here, and they do not
                 actually disagree — one says WHERE the chart is, the other
                 says WHICH WINDOW it is put on.
                   · Figma side: the chart lives in the Overview body, so
                     firing this from General Info would scroll to a node that
                     is not rendered. The tab comes back on the way.
                   · Behaviour side: "See more" is an ENTRY POINT.
                     jumpToChartFromHero unwinds any drill-down back to the
                     window the caption names, turns the previous-period
                     comparison on wherever the data supports one, and scrolls.
                     The reasoning is at jumpToChartFromHero above, and it is
                     the whole feature.
                 setTab first so the Overview panel holding the chart is the
                 one being rendered when chartRef's scroll target is asked for;
                 both are plain state setters in one React batch, so they commit
                 together, and the scroll waits a frame for that commit. */
              onJumpToChart={() => {
                setTab('overview')
                jumpToChartFromHero()
              }}
            />

            {tab === 'general' ? (
              /* General Info — the v1 Info tab's 11 real sections (PRD 04h),
                 collapsed by default, exactly the component the tab removal
                 put at the foot of the Overview scroll. It moved behind the
                 restored tab; it was not re-stubbed. */
              <div
                className={String.raw`content-stretch flex flex-col gap-[14px] items-start pb-4 px-0 relative shrink-0 w-full`}
              >
                <InfoAccordion system={system} />
              </div>
            ) : (
            /* Body wrapper 198379:80459 — the Overview panel. Unchanged
               except that it is now a tab panel rather than the whole
               scroll body. */
            <div
              className="content-stretch flex flex-col gap-[14px] items-start justify-center pb-4 px-0 relative shrink-0 w-full"
              data-node-id="198379:80459"
            >
                  {/* Alert carousel 198379:80460 / 199296:50466. Only the alert
                      frame draws one, and `system.alerts` is empty on a calm
                      system, so this renders nothing there.

                      It is also empty on a NON-WATER fault now — owner,
                      2026-10-18: "only water events shall appear here in this
                      card / not others." The gate lives in alertCardsFor at
                      the top of this file, where the full note is; an offline
                      / valve-error / power-lost system renders this row empty
                      and reports the fault through the Events Timeline card
                      below instead. */}
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
                          className="absolute inset-0 z-10 pointer-events-none rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
                            /* The open body's five rows report the system's
                               real state rather than the frame's literals.
                               `valveState` is used, not system.valve, so a
                               valve the user has just closed on this screen
                               reads closed here too. */
                            systemStatus={{
                              valve: valveState ?? system.valve,
                              comm: system.comm,
                              power: system.power,
                            }}
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
                      /* ACTIVE POLICY, redrawn against 199539:181835.

                            IT WAS DRAWING THE SHAPE-REFERENCE FIXTURE. This
                            passed `system.policies`, and the only object in
                            the app with a `policies` key is the SYSTEM
                            fallback at the top of this file, the one its own
                            comment calls "SHAPE REFERENCE, not content". So
                            every system's policy card read "Open loop
                            20:15 - 23:59 / Sensors 20:15 - 23:59": placeholder
                            text, on a card whose entire job is to state the
                            rules the system is actually running under. That
                            comment's own warning, word for word, about
                            wrong-but-plausible data not announcing itself.

                            `system.policy` is the real thing and was already
                            on this page (getActivePolicy, in the system memo
                            above) for the valve card's handling panel. It
                            carries name, schedule, alert and autoShutoff,
                            which is exactly the one policy row and the two
                            settings rows the frame draws.

                            autoShutoff is 'Enabled' | 'Disabled' | 'N/A', and
                            the third is real: buildTree records 20 MRG systems
                            as metering-only, where there is no valve to shut.
                            Those take the muted pip, because "Off" would
                            claim a setting the hardware does not have. */
                      return (
                        <ActivePolicyCard
                          key={key}
                          className="shrink-0"
                          policies={
                            system.policy
                              ? [
                                  {
                                    id: 'active',
                                    name: system.policy.name,
                                    window: system.policy.schedule,
                                  },
                                ]
                              : []
                          }
                          settings={[
                            {
                              id: 'alerts',
                              label: 'Alerts',
                              value: system.policy?.alert === 'Active' ? 'On' : 'Off',
                              tone: system.policy?.alert === 'Active' ? 'on' : 'off',
                            },
                            {
                              id: 'auto-shutoff',
                              label: 'Auto Shutoff Valve',
                              value:
                                system.policy?.autoShutoff === 'Enabled'
                                  ? 'On'
                                  : system.policy?.autoShutoff === 'Disabled'
                                    ? 'Off'
                                    : 'N/A',
                              tone:
                                system.policy?.autoShutoff === 'Enabled'
                                  ? 'on'
                                  : system.policy?.autoShutoff === 'Disabled'
                                    ? 'off'
                                    : 'muted',
                            },
                          ]}
                          /* HOME / AWAY, RESIDENTIAL ONLY. Owner, 2026-10-26:
                             "Home away is a simple policy for apartmants,
                             depends per systms, make it for ressidential
                             onlt" — and, in the same exchange, "dont remove
                             home away".

                             So the control stays, but only where it means
                             something. An office tower has no "away" in PRD
                             04e's sense: it is occupied on a schedule, which
                             the Working hours row above already states.

                             THE DIVISION IS `l2Name`, not `residential`.
                             buildTree sets a `residential` boolean on the
                             node (buildTree.js:564) but it does not survive
                             onto the SYSTEMS records — measured 0 of 103 —
                             whereas l2Name carries the division the tree is
                             actually built around: Office 53, Residential 50.
                             Using the flag that exists in name only would
                             have silently hidden this control on every system
                             in the fleet.

                             Passing NO `onModeChange` is what suppresses it,
                             so a commercial system draws the frame's card
                             exactly, with nothing stubbed or disabled. */
                          {...(system.l2Name === 'Residential'
                            ? { mode: policyMode, onModeChange: setPolicyMode }
                            : {})}
                        />
                      )
                    }

                    if (key === 'chart') {
                      /* The consumption chart. Position is the frame's:
                         198629:51874 sits directly after the topology card
                         (198629:57165) and before the Events Timeline — i.e.
                         right under System type, which is what carries the
                         topology now. It was briefly pinned above the whole
                         stack, which is not where any frame puts it.

                         ALWAYS RENDERED. A `if (!chartOpen) return null` stood
                         on the next line while the chart lived behind the
                         hero's "See more". The owner on 2026-10-20:
                         "consumption chart shall be always visible." The gate
                         is gone and there is no condition left here; the
                         hero's control scrolls to this node instead of
                         deciding whether it exists. */
                      return (
                        <Fragment key={key}>
      {/* The "‹ Back to Monthly" pill stood here — §3.6 / §19's way back out
      of a drill-down. Removed 2026-10-20 on the owner's instruction ("what is
      back to monthly? remove it."). See the note on `periodTrail` above: the
      one-tap return to the window a drill was launched from is what went; the
      trail stayed, because the hero's "See more" still unwinds a drill with
      it. Do not put this back without asking. */}
      <div
      ref={chartRef}
      className="content-stretch flex flex-col items-center min-w-[288px] overflow-clip relative scroll-mt-[8px] shrink-0 w-full"
      data-node-id="198629:51874"
      >
      <WaterConsumptionCardV2
      className="w-full"
      data={consumptionView.series}
      period={period}
      /* The period CONTROL reads the SHORT label; the hero's `rangeLabel`
      above still reads `label` and is unchanged. Only Hourly differs
      between the two — see bucketHourly in consumptionSeries.js for the
      measurement that forced it. */
      monthLabel={consumptionView.labelShort ?? consumptionView.label}
      onPeriodChange={selectPeriod}
      onMonthChange={stepPeriod}
      picker="dropdown"
      onOpenPicker={() => setPickerOpen(true)}
      compare={compareConsumption}
      onCompareChange={setCompareConsumption}
      compareData={consumptionCompare}
      seriesLabel={consumptionSpanLabel}
      compareLabel={consumptionCompareLabel}
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
                      /* Insights 199296:50344 / 199296:51143.
                         THIS CARD WAS NOT SHOWING INSIGHTS. It was fed
                         `heroFigures.pct` / `.deltaLitres` and the CONSUMPTION
                         series — the hero's own numbers, relabelled "Usage
                         change". The owner: "still old data in insight". It
                         was not stale data; it was the wrong data entirely,
                         and no amount of work on the insight model could reach
                         it because the card never read one.

                         `system.insights` has been the real thing all along:
                         getSystemInsights delegates to the upstream model, so
                         these rows carry the web sandbox's own generators —
                         30 days of hourly background flow, or daily actual vs
                         a per-day expected.

                         LIST, not the single metric chart. The web's system
                         insights is a list of rows each with its own
                         sparkline (SystemInsightsTab -> InsightRow), a system
                         carries 0-2 insights rather than exactly one, and the
                         list variant already draws its own empty state —
                         which matters here, because most systems have no
                         insight at all. The mapping is Home's, so the two
                         screens cannot drift. */
                      return (
                        <InsightsCard
                          key={key}
                          className="shrink-0"
                          tone={alerting ? 'alert' : 'calm'}
                          rows={(system.insights ?? []).map(row => ({
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
                          }))}
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

            </div>
            )}
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
