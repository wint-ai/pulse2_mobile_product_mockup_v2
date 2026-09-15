/**
 * System page — v2 (mobile), pixel rebuild.
 *
 * Design source: Figma node 198378:74090 "System page_mobile" (375x2763).
 * 198379:80447 is a second instance of the same screen — identical, unused.
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
 * Cards on this page, in order (Body wrapper 198378:74119):
 *   198378:74120  alert carousel — two AlertCard "Mobile" (198374:72716)
 *   198378:74362  "Balance" wrapper -> WaterConsumptionCardV2
 *   198378:74533  Events Timeline -> EventsTimelineCard
 *   198378:74617  Action Policy   -> built here, it has no component yet
 *
 * There is no Topology card and no Insights card on this frame.
 */

import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TabBar from '@/components/TabBar'
import WintSidebarV2 from '@/v2/components/WintSidebarV2'
import AlertCard from '@/v2/components/AlertCard'
import WaterConsumptionCardV2 from '@/v2/components/WaterConsumptionCardV2'
import EventsTimelineCard from '@/v2/components/EventsTimelineCard'
import { Menu10, CustomerSupport } from '@/v2/icons'
import { getSystemById } from '@/data/systems'
import { getConsumption, getConsumptionWindow, getConsumptionWindowLabel } from '@/data/consumption'
import { getSystemInsights, getSystemTopology, getActivePolicy } from '@/data/systemDetails'

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

// Valve status (198378:74545) — the gate-valve wheel beside "Open loop".
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

/* ── Action Policy card (198378:74617) ─────────────────────────────────────
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
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="198378:74536">
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
      data-node-id="198378:74617"
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

/* ── Tabs (198378:74118) ────────────────────────────────────────────────────
   The active and inactive triggers are two different frames in the design —
   the active one nests a content box and an absolutely positioned 2px rule,
   the inactive one is flat — so they are written as two branches rather than
   one element with conditional classes. That also keeps every Figma class in a
   literal JSX attribute, which is the only place the escaped var() survives. */

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'general', label: 'General Info' },
]

function TabsRow({ value, onChange }) {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="198378:74112">
      <div
        role="tablist"
        aria-label="System sections"
        className="content-stretch flex flex-[1_0_0] gap-[var(--p-0,0px)] h-[36px] items-start min-w-px pr-[var(--component\/tabs\/list\/padding,3px)] py-[var(--component\/tabs\/list\/padding,3px)] relative rounded-[var(--component\/tabs\/trigger\/radius,14px)]"
        data-node-id="198378:74118"
      >
        <div className="content-stretch flex flex-[1_0_0] gap-[var(--spacing\/2,8px)] items-center min-w-px relative">
          {TABS.map((tab) =>
            tab.id === value ? (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected="true"
                onClick={() => onChange(tab.id)}
                className="content-stretch cursor-pointer flex flex-[1_0_0] flex-col items-center min-w-[56px] relative rounded-[var(--component\/tabs\/trigger\/radius,14px)]"
              >
                <div className="content-stretch flex gap-[var(--component\/tabs\/trigger\/gap,6px)] items-center overflow-clip px-[var(--component\/tabs\/trigger\/px,8px)] py-[var(--component\/tabs\/trigger\/py,4px)] relative rounded-[var(--component\/tabs\/trigger\/radius,14px)] shrink-0">
                  <p className="[word-break:break-word] font-medium leading-[var(--text\/sm-tight\/lh,20px)] overflow-hidden relative min-w-px text-[14px] text-[color:var(--wint-blue-accent,#0b81f8)] text-center text-ellipsis whitespace-nowrap">
                    {tab.label}
                  </p>
                </div>
                <div className="absolute bottom-0 content-stretch flex flex-col items-start left-0 py-[var(--p-0,0px)] right-[-2px]">
                  <div className="bg-[var(--wint-blue-accent,#0b81f8)] h-[2px] relative shrink-0 w-full" />
                </div>
              </button>
            ) : (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected="false"
                onClick={() => onChange(tab.id)}
                className="content-stretch cursor-pointer flex flex-[1_0_0] gap-[var(--spacing\/2,8px)] items-center justify-center min-w-[56px] px-[var(--spacing\/2,8px)] py-[var(--spacing\/1,4px)] relative rounded-[var(--component\/tabs\/list\/radius-horizontal,26px)]"
              >
                <p className="[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/sm\/lh,20px)] overflow-hidden relative min-w-px text-[14px] text-[color:var(--colors\/slate\/500,#62748e)] text-center text-ellipsis whitespace-nowrap">
                  {tab.label}
                </p>
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Screen ─────────────────────────────────────────────────────────────── */

export default function SystemPageV2Screen() {
  const navigate = useNavigate()
  const { systemId } = useParams()

  /* Real system for this route, falling back to the mock shape when the id
     matches nothing — a deep link to a deleted system should still render
     rather than crash. Everything below reads `system`, never SYSTEM. */
  const system = useMemo(() => {
    const sys = systemId ? getSystemById(systemId) : null
    if (!sys) return SYSTEM

    const insights = getSystemInsights(sys.id) ?? []
    const topology = getSystemTopology(sys.id) ?? null
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
      alert: sys.alert ?? null,
      insights,
      topology,
      policy,
      consumption,
    }
  }, [systemId])

  const [tab, setTab] = useState('overview')
  const [drawerOpen, setDrawerOpen] = useState(false)

  /* The consumption card is presentational: uncontrolled it has one hardcoded
     window and blanks the moment the period or month is steered. The host owns
     the scope so every period plots real data. 'M' = a month of daily bars,
     which is the window the card already drew. */
  const [period, setPeriod] = useState('M')
  const [windowOffset, setWindowOffset] = useState(0)
  // Hoisted out of the dependency arrays: optional chaining in a dep list
  // defeats the React Compiler's memoization check.
  const chartSystemId = system ? system.id : null
  const chartSystemName = system ? system.title : ''
  const consumptionSeries = useMemo(
    () => (chartSystemId ? getConsumptionWindow(chartSystemId, chartSystemName, period, windowOffset) : []),
    [chartSystemId, chartSystemName, period, windowOffset],
  )
  const consumptionLabel = useMemo(
    () => (chartSystemId ? getConsumptionWindowLabel(chartSystemId, chartSystemName, period, windowOffset) : ''),
    [chartSystemId, chartSystemName, period, windowOffset],
  )
  const carouselRef = useRef(null)

  /* The frame draws two 308px alert cards side by side in a 339px column, i.e.
     a swipe carousel with the second card peeking. The pager inside AlertCard
     reports 'paginate'; scrolling the row is the real behaviour behind it.
     'on-it' / 'ignore' have no designed destination in this frame, so they stay
     no-ops rather than being wired to invented state. */
  const handleAlertAction = (actionId) => {
    if (actionId !== 'paginate') return
    const row = carouselRef.current
    if (!row) return
    const step = 308 + 14 // card width + the row's gap-[14px]
    const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 1
    row.scrollTo({ left: atEnd ? 0 : row.scrollLeft + step, behavior: 'smooth' })
  }

  /* Phone.jsx is a fixed 393x852 frame with overflow:hidden, so this screen
     owns its scroll: the Content column is the single flex:1 / overflowY:auto /
     minHeight:0 element and the header bar is a shrink-0 sibling. The Figma
     frame's 2763px height is a canvas artefact, never a page height. */
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--app-bg)' }}>
      {/* Figma root 198378:74090. The five-stop wash lives in --app-bg on the
          outer shell so TabBar sits on the same ground; this node keeps the
          frame's 8px inset only. */}
      <div
        className="content-stretch flex flex-col gap-[var(--p-0,0px)] items-start p-[var(--spacing\/2,8px)] relative w-full"
        style={{ flex: 1, minHeight: 0 }}
        data-node-id="198378:74090"
      >
        {/* Mobile Header Bar 198378:74097 */}
        <div
          className="content-stretch flex flex-col gap-[var(--pro\/space\/1\,5,6px)] h-[42px] items-center justify-center px-[var(--pro\/space\/4,16px)] py-[var(--pro\/space\/6,24px)] relative shrink-0 w-full"
          data-node-id="198378:74097"
        >
          {/* Figma emits this row's gap as the two-value token
              `gap-[var(--pro\/space\/4,4px_16px)]`. Tailwind drops that class
              (a `gap-[...]` arbitrary value takes one length), which would
              leave the support glyph 16px adrift of the right padding edge, so
              it is split per axis against the same token. */}
          <div className="content-center flex flex-wrap gap-x-[var(--pro\/space\/4,16px)] gap-y-[var(--pro\/space\/4,4px)] items-center relative shrink-0 w-full">
            {/* The frame models the burger as a 287px-wide Button, so the tap
                target spans the header rather than hugging the 17px glyph. */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="content-stretch cursor-pointer flex gap-[var(--pro\/space\/1\,5,6.40148663520813px)] h-[34.141px] items-center p-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-default\/radius,27.74px)] shrink-0 w-[287px]"
              data-node-id="198378:74092"
            >
              <span className="flex items-center justify-center overflow-clip relative shrink-0 size-[17.071px] text-[#0a0a0a]">
                <Menu10 size={11.3769} />
              </span>
            </button>
            {/* Deliberately inert: there is no support route in this app and no
                support screen on the delivery canvas. It renders and focuses,
                it just has nowhere to go. */}
            <button
              type="button"
              aria-disabled="true"
              aria-label="Customer support"
              className="cursor-default flex items-center justify-center overflow-clip relative shrink-0 size-[24px] text-[#0a0a0a]"
              data-node-id="198378:74096"
            >
              <CustomerSupport width={21.995} height={19.995} />
            </button>
          </div>
        </div>

        {/* Content 198378:74098 — the one scrolling region on this screen */}
        <div
          className="content-stretch flex flex-col gap-[22px] items-start pt-[20px] px-[var(--pro\/space\/2\,5,10px)] relative w-full"
          style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
          data-node-id="198378:74098"
        >
          {/* Breadcrumb + title 198378:74099 */}
          <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 w-full" data-node-id="198378:74099">
            {/* Header 198378:74106 — h-[44px] is what lands the breadcrumb
                baseline on the comp's y=97. */}
            <div className="content-stretch flex gap-[var(--spacing\/2,8px)] h-[44px] items-center py-[var(--p-0,0px)] relative shrink-0 w-full" data-node-id="198378:74106">
              <nav
                aria-label="Breadcrumb"
                className="content-center flex flex-wrap gap-[var(--component\/breadcrumb\/item\/gap,6px)] gap-y-[4px] items-center p-[var(--p-0,0px)] relative shrink-0"
              >
                <div className="content-stretch flex gap-[var(--component\/breadcrumb\/item\/gap,6px)] items-center relative shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="content-stretch cursor-pointer flex gap-[var(--component\/breadcrumb\/item\/gap,6px)] items-center justify-center p-[var(--p-0,0px)] relative shrink-0"
                  >
                    <p className="[word-break:break-word] font-[var(--font\/weight\/font-normal,400)] leading-[var(--text\/sm\/lh,20px)] relative shrink-0 text-[color:var(--colors\/slate\/400,#90a1b9)] text-[length:var(--text\/sm\/size,14px)] whitespace-nowrap">
                      {system.breadcrumb.home}
                    </p>
                  </button>

                  <div className="relative shrink-0 size-[16px]">
                    <ArrowRightSLine fill="#90A1B9" />
                  </div>

                  {/* The collapsed ancestors. Figma marks it cursor-pointer but
                      draws no disclosure menu anywhere on the canvas, so it is
                      inert rather than wired to an invented popover. */}
                  <button
                    type="button"
                    aria-disabled="true"
                    aria-label="Show hidden breadcrumbs"
                    className="content-stretch cursor-default flex gap-[var(--component\/breadcrumb\/item\/gap,6px)] items-center justify-center p-[var(--spacing\/0\,5,2px)] relative shrink-0"
                  >
                    <span className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[16px]">
                      <MoreHorizontal />
                    </span>
                  </button>

                  <div className="relative shrink-0 size-[16px]">
                    <ArrowRightSLine fill="#1D293D" />
                  </div>

                  {/* Last crumb. The frame does not mark it cursor-pointer — it
                      is the parent account label, not a link — so it stays
                      plain text. */}
                  <div className="content-stretch flex gap-[var(--component\/breadcrumb\/item\/gap,6px)] items-center justify-center p-[var(--p-0,0px)] relative shrink-0">
                    <p className="[word-break:break-word] font-[var(--font\/weight\/font-normal,400)] leading-[var(--text\/sm\/lh,20px)] relative shrink-0 text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/sm\/size,14px)] whitespace-nowrap">
                      {system.breadcrumb.parent}
                    </p>
                  </div>
                </div>
              </nav>
            </div>

            {/* Title 198378:74108 */}
            <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="198378:74108">
              <h1
                className="[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/2xl\/lh,32px)] relative shrink-0 text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/2xl\/size,24px)] tracking-[-0.6px] whitespace-nowrap"
                dir="auto"
                data-node-id="198378:74109"
              >
                {system.title}
              </h1>
            </div>
          </div>

          {/* Tabs + body 198378:74111 */}
          <div className="content-stretch flex flex-col gap-[14px] items-start relative shrink-0 w-full" data-node-id="198378:74111">
            <TabsRow value={tab} onChange={setTab} />

            {/* Body wrapper 198378:74119 */}
            <div
              className="content-stretch flex flex-col gap-[14px] items-start justify-center pb-[var(--spacing\/4,16px)] px-[var(--p-0,0px)] relative shrink-0 w-full"
              data-node-id="198378:74119"
            >
              {tab === 'overview' ? (
                <>
                  {/* Alert carousel 198378:74120. Two 308px cards in a 339px
                      column is a swipe row in the comp; overflow-x-auto plus
                      scroll-snap is what makes that real on a phone. */}
                  <div
                    ref={carouselRef}
                    className="content-stretch flex gap-[14px] items-center overflow-x-auto relative shrink-0 w-full snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    data-node-id="198378:74120"
                  >
                    {system.alerts.map((alert) => (
                      <div key={alert.page} className="shrink-0 snap-start">
                        <AlertCard variant="mobile" event={alert} onAction={handleAlertAction} />
                      </div>
                    ))}
                  </div>

                  {/* "Balance" 198378:74362 — the frame's leftover shadcn layer
                      name for the water consumption card. */}
                  <div
                    className="content-stretch flex flex-col items-center min-w-[288px] overflow-clip relative shrink-0 w-full"
                    data-node-id="198378:74362"
                  >
                    <WaterConsumptionCardV2
                      className="w-full"
                      data={consumptionSeries}
                      period={period}
                      onPeriodChange={setPeriod}
                      monthLabel={consumptionLabel}
                      onMonthChange={delta => setWindowOffset(o => Math.max(0, o - delta))}
                    />
                  </div>

                  {/* Events Timeline 198378:74533 */}
                  <EventsTimelineCard />

                  {/* Action Policy 198378:74617 */}
                  <ActionPolicyCard policies={system.policies} />
                </>
              ) : (
                /* NOT DESIGNED. The canvas has the tab but no content frame for
                   it, and Rule 0 forbids inventing one. Honest placeholder
                   until a comp exists. */
                <div className="bg-[#fafbfc] border-[length:var(--border-width\/border,1px)] border-solid border-white content-stretch flex flex-col gap-[4px] items-center justify-center px-[24px] py-[40px] relative rounded-[var(--rounded-2xl,18px)] shrink-0 w-full">
                  <p className="font-[var(--font\/weight\/font-semibold,600)] leading-[var(--text\/sm\/lh,20px)] text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/sm\/size,14px)]">
                    General Info
                  </p>
                  <p className="font-[var(--font\/weight\/font-normal,400)] leading-[var(--text\/xs\/lh,16px)] text-[color:var(--colors\/slate\/400,#90a1b9)] text-[length:var(--text\/xs\/size,12px)]">
                    No design yet for this tab.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <WintSidebarV2 open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <TabBar activeTab="home" />
    </div>
  )
}
