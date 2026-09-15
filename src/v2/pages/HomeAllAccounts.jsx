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

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import TabBar from '@/components/TabBar'
import ActiveWaterEventsCard from '@/v2/components/ActiveWaterEventsCard'
import EventOverlay from '@/v2/components/EventOverlay'
import InsightsCard from '@/v2/components/InsightsCard'
import SystemsHealthCard from '@/v2/components/SystemsHealthCard'
import WaterConsumptionCardV2 from '@/v2/components/WaterConsumptionCardV2'
import WintSidebarV2 from '@/v2/components/WintSidebarV2'
import { CaretDown, CustomerSupport, Menu10 } from '@/v2/icons'
import { SYSTEMS, computeWidgets, computeKPIs } from '@/data/systems'
import { getSystemInsights } from '@/data/systemDetails'

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

/* 198314:73505 — 96% / 8 of 3,431 / 4 · 2 · 1 · 1. */
const MOCK_HEALTH = { percent: 96, tone: 'healthy' }
const MOCK_HEALTH_STATS = { requireAttention: 8, total: 3431 }
const MOCK_HEALTH_ISSUES = { offline: 4, valve: 2, power: 1, recipients: 1 }

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
 * One tab trigger. Figma draws the selected and unselected states as two
 * different nodes, not one node with an override:
 *   I198314:73491;101485:143349;198314:73487  TabsTrigger            (selected)
 *   I198314:73491;101485:143349;198314:73490  TabsTrigger/line/false (rest)
 * so both are written out as whole JSX trees. That also keeps every Figma
 * class a literal attribute, which is the only place the `\/` escape survives.
 */
function TabTrigger({ label, active, onClick }) {
  if (active) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-current="page"
        className="content-stretch cursor-pointer flex flex-[1_0_0] flex-col items-center min-w-[56px] relative rounded-[var(--component\/tabs\/trigger\/radius,14px)]"
        data-node-id="I198314:73491;101485:143349;198314:73487"
      >
        <span className="content-stretch drop-shadow-[0px_0px_0px_var(--ring-focus,rgba(161,161,161,0.5))] flex gap-[var(--component\/tabs\/trigger\/gap,6px)] items-center overflow-clip px-[var(--component\/tabs\/trigger\/px,8px)] py-[var(--component\/tabs\/trigger\/py,4px)] relative rounded-[var(--component\/tabs\/trigger\/radius,14px)] shrink-0">
          <span className="[word-break:break-word] font-medium leading-[var(--text\/sm-tight\/lh,20px)] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--wint-blue-accent,#0b81f8)] text-center text-ellipsis whitespace-nowrap">
            {label}
          </span>
        </span>
        {/* 121116:90215 / :90216 — the 2px rule, which overhangs 2px to the right. */}
        <span className="absolute bottom-0 content-stretch flex flex-col items-start left-0 py-[var(--p-0,0px)] right-[-2px]">
          <span className="bg-[var(--wint-blue-accent,#0b81f8)] h-[2px] relative shrink-0 w-full" />
        </span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="content-stretch cursor-pointer flex flex-[1_0_0] gap-[var(--spacing\/2,8px)] items-center justify-center min-w-[56px] px-[var(--spacing\/2,8px)] py-[var(--spacing\/1,4px)] relative rounded-[var(--component\/tabs\/list\/radius-horizontal,26px)]"
      data-node-id="I198314:73491;101485:143349;198314:73490"
    >
      <span className="[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/sm\/lh,20px)] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--colors\/slate\/500,#62748e)] text-center text-ellipsis whitespace-nowrap">
        {label}
      </span>
    </button>
  )
}

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

function TopUsageCard({ data, onPeriodChange }) {
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
      className="bg-[#fafbfc] border-[length:var(--border-width\/border,1px)] border-solid border-white content-stretch flex flex-col gap-[var(--p-0,0px)] items-start min-h-[380px] overflow-clip p-[var(--p-0,0px)] relative rounded-[var(--rounded-2xl,18px)] shadow-[var(--shadow\/x,0px)_var(--shadow\/popover\/layer-2\/y,0px)_var(--shadow\/popover\/layer-2\/blur,0px)_var(--shadow\/popover\/layer-2\/spread,0px)_var(--shadow\/popover\/layer-2\/color,rgba(0,0,0,0))] w-full"
      data-node-id="198314:73652"
      data-name="Top usage"
    >
      {/* CardHeader — 198314:73655 */}
      <div className="content-stretch flex gap-[var(--spacing\/3,12px)] h-[60px] items-center px-[var(--pro\/space\/4,16px)] py-[var(--spacing\/3,12px)] relative shrink-0 w-full">
        <div className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--component\/card\/header\/gap,8px)] items-start min-w-px pr-[7px] relative">
          <p className="[word-break:break-word] font-[var(--font\/weight\/font-semibold,600)] leading-[var(--text\/lg\/lh-none,18px)] relative shrink-0 text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/lg\/size,18px)] tracking-[-0.45px] w-full">
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
            className="bg-[var(--colors\/slate\/100,#f1f5f9)] content-stretch flex gap-[var(--component\/button\/gap,6px)] h-[36px] items-center justify-center px-[var(--component\/button\/size-default\/px,12px)] py-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-default\/radius,26px)] shrink-0 cursor-pointer"
            data-node-id="I198314:73655;197412:209455;198314:73654"
          >
            <span className="[word-break:break-word] font-medium leading-[var(--text\/sm-tight\/lh,20px)] relative shrink-0 text-[#171717] text-[length:var(--text\/sm-tight\/size,14px)] whitespace-nowrap">
              {period.label}
            </span>
            <CaretDown
              size={16}
              className="relative shrink-0 text-[#171717] transition-transform"
              style={{ transform: menuOpen ? 'rotate(180deg)' : undefined }}
            />
          </button>

          {menuOpen && (
            <ul
              role="listbox"
              aria-label="Usage period"
              className="absolute right-0 top-[40px] z-30 min-w-[168px] overflow-hidden rounded-[14px] border border-slate-200 bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
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
                    {p.id === periodId && <span className="text-[#0b81f8]">✓</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* cardContent — 198314:73656 */}
      <div className="content-stretch flex flex-col gap-[var(--spacing\/3,12px)] h-[167px] items-center justify-center overflow-clip px-[var(--component\/card\/padding,24px)] py-[var(--p-0,0px)] relative shrink-0 w-full">
        <div className="overflow-clip relative shrink-0 size-[150px]" data-node-id="198314:73657">
          <DonutPlots className="absolute block inset-0 max-w-none size-full" />
          {/* 198314:73658 — the hole. The export is a single
              <circle cx=60 cy=60 r=60 fill="white"/>, i.e. a plain 120px disc. */}
          <span className="-translate-x-1/2 -translate-y-1/2 absolute bg-white left-1/2 rounded-full size-[120px] top-1/2" />
          {/* 198314:73660 / :73661 — the comp stacks these 5.25px apart and sits
              the pair ~2px below the ring's centre. */}
          <span className="-translate-x-1/2 -translate-y-1/2 absolute content-stretch flex flex-col gap-[5.25px] items-center left-1/2 text-center top-[calc(50%+2px)] w-[120px]">
            <span className="font-[var(--font\/weight\/font-semibold,600)] leading-[var(--text\/xl\/lh-snug,27.5px)] relative shrink-0 text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/xl\/size,20px)] tracking-[var(--text\/xl\/heading-tracking,-0.5px)] w-full">
              {data.total}
            </span>
            <span className="font-[var(--font\/weight\/font-normal,400)] leading-[9.375px] relative shrink-0 text-[#737373] text-[9.375px] w-full">
              TOTAL LITERS
            </span>
          </span>
        </div>
      </div>

      {/* Legend — 198314:73663, five "Chart / Tooltip / Tooltip Item" rows. */}
      <div className="content-stretch flex flex-col gap-[9px] items-start pb-[var(--spacing\/4,16px)] px-[var(--spacing\/4,16px)] relative shrink-0 w-full" data-node-id="198314:73663">
        {data.rows.map((row) => (
          <div
            key={row.id}
            className="content-stretch flex items-center justify-between p-[var(--p-0,0px)] relative shrink-0 w-full"
          >
            <div className="content-stretch flex gap-[8px] items-center min-w-px relative">
              {/* The key's colour is per-row data, so it is an inline style —
                  a class built in JS would lose the `\/` escape anyway. */}
              <span
                className="relative rounded-[var(--component\/pro\/marketing\/tagline\/chip\/py,2px)] shrink-0 size-[8px]"
                style={{ background: row.key }}
              />
              <p className="[word-break:break-word] font-[var(--font\/weight\/font-normal,400)] leading-[var(--text\/xs\/lh-none,12px)] overflow-hidden relative shrink-0 text-[#737373] text-[12px] text-ellipsis whitespace-nowrap">
                {row.label}
              </p>
            </div>
            <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
              <div className="[word-break:break-word] content-stretch flex font-[var(--font\/weight\/font-normal,400)] gap-[var(--spacing\/0\,5,2px)] items-center leading-[var(--text\/xs\/lh-none,12px)] relative shrink-0 text-[12px] whitespace-nowrap">
                <p className="overflow-hidden relative shrink-0 text-[color:var(--colors\/slate\/800,#1d293d)] text-ellipsis">
                  {row.value}
                </p>
                <p className="overflow-hidden relative shrink-0 text-[#737373] text-ellipsis">{row.unit}</p>
              </div>
              <div className="bg-[var(--colors\/slate\/100,#f1f5f9)] content-stretch flex gap-[var(--component\/badge\/gap,4px)] h-[20px] items-center justify-center overflow-clip px-[var(--component\/badge\/px,8px)] py-[var(--component\/badge\/py,2px)] relative rounded-[var(--component\/badge\/radius,26px)] shrink-0">
                <p className="[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/xs\/lh,16px)] overflow-hidden relative shrink-0 text-[color:var(--colors\/slate\/800,#1d293d)] text-[12px] text-ellipsis whitespace-nowrap">
                  {row.share}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────

/**
 * @param expanded  false renders 198314:73471, the page with no active water
 *                  events; true renders 198328:89061, the same page with the
 *                  water-events list open. It is a state of this one screen,
 *                  not a second route — the only differences across the two
 *                  frames are the water-events card's contents and the Body
 *                  wrapper's gap (14px -> 10px).
 */
export default function HomeAllAccounts({ expanded = false }) {
  /* Figma "Location opt b" (198328:88654) is this screen retitled, so scope is
     a route param rather than a second page. */
  const { locationName } = useParams()
  const scopeTitle = locationName ? decodeURIComponent(locationName) : 'All Accounts'

  /* Real aggregates. The MOCK_* constants below are SHAPE references and
     fallbacks only — rendering them directly is the Floor-26 bug: a screen that
     looks right and reports numbers belonging to nothing. computeWidgets and
     computeKPIs already derive these from SYSTEMS; the page just wasn't asking. */
  const live = useMemo(() => {
    const systems = SYSTEMS ?? []
    if (!systems.length) return null

    const widgets = computeWidgets(systems) ?? {}
    const kpis = computeKPIs(systems) ?? {}

    const activeEvents = systems.filter(s => s.alert)
    const healthy = systems.filter(s => !s.alert).length
    const percent = Math.round((healthy / systems.length) * 100)

    return {
      waterEvents: activeEvents,
      health: { percent, tone: percent >= 90 ? 'healthy' : 'attention' },
      stats: { requireAttention: activeEvents.length, total: systems.length },
      issues: {
        offline: widgets.offline ?? kpis.offline ?? MOCK_HEALTH_ISSUES.offline,
        valve: widgets.valveErrors ?? kpis.valveErrors ?? MOCK_HEALTH_ISSUES.valve,
        power: widgets.powerLost ?? kpis.powerLost ?? MOCK_HEALTH_ISSUES.power,
        recipients: widgets.noRecipients ?? kpis.noRecipients ?? MOCK_HEALTH_ISSUES.recipients,
      },
      insights: systems.slice(0, 4).flatMap(s => getSystemInsights(s.id) ?? []).slice(0, 4),
    }
  }, [])

  const [tab, setTab] = useState('overview')
  const [drawerOpen, setDrawerOpen] = useState(false)
  // null | 'water' | 'alerts' — which dataset the full-list overlay is showing.
  const [overlay, setOverlay] = useState(null)

  // Expanded shows the live list; collapsed shows none, per the two frames.
  const waterEvents = expanded ? (live?.waterEvents ?? MOCK_WATER_EVENTS) : []

  /* The five cards of the Body wrapper, in the comp's order. Held in a variable
     because the two states wrap them in two different Body wrappers (the gap
     differs) and the wrapper's class string must stay a literal attribute. */
  const cards = (
    <>
      {/* 198314:73493 (no events) / 198328:89083 (25 events). */}
      <ActiveWaterEventsCard
        events={waterEvents}
        onShowAll={() => setOverlay('water')}
        onShowPast={() => setOverlay('water')}
      />

      {/* 198314:73505 */}
      <SystemsHealthCard
        healthy={live?.health ?? MOCK_HEALTH}
        stats={live?.stats ?? MOCK_HEALTH_STATS}
        issues={live?.issues ?? MOCK_HEALTH_ISSUES}
        onShowPast={() => setOverlay('alerts')}
      />

      {/* 198314:73639. No onViewAll: the delivery canvas has no Insights list
          screen, so the card renders its "View all" inert rather than this page
          inventing a route for it. */}
      <InsightsCard rows={live?.insights?.length ? live.insights : MOCK_INSIGHTS} />

      {/* 198314:73649 — the layer is named "Balance", a leftover shadcn
          template name; the card is Water consumption. It ships its own traced
          series and derives its own headline figures, so nothing is passed. */}
      <WaterConsumptionCardV2 />

      {/* 198314:73650 */}
      <TopUsageCard data={MOCK_TOP_USAGE} />
    </>
  )

  return (
    /* Outer shell: owns the app wash and holds the scroller and TabBar as
       siblings. The Figma root itself is the child below — it is `items-start`,
       which would shrink a full-width TabBar to its content. */
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--app-bg)' }}>
      {/* Root — 198314:73471. size-full dropped: under Phone.jsx the height
          comes from flex:1, not from the 2155px frame. The frame's own
          background is the five-stop wash that src/index.css keeps as
          --app-bg, painted by the wrapper above. */}
      <div
        className="content-stretch flex flex-col gap-[var(--p-0,0px)] items-start p-[var(--spacing\/2,8px)] relative w-full"
        style={{ flex: 1, minHeight: 0 }}
        data-node-id="198314:73471"
        data-name="All accounts"
      >
        {/* Mobile Header Bar — 198314:73478. Fixed chrome. */}
        <div
          className="content-stretch flex flex-col gap-[var(--pro\/space\/1\,5,6px)] h-[42px] items-center justify-center px-[var(--pro\/space\/4,16px)] py-[var(--pro\/space\/6,24px)] relative shrink-0 w-full"
          data-node-id="198314:73478"
          data-name="Mobile Header Bar"
        >
          <div className="content-center flex flex-wrap gap-[var(--pro\/space\/4,4px_16px)] items-center relative shrink-0 w-full">
            {/* I198314:73478;50600:52769;198314:73473. Figma pins this at
                w-[287px], which is exactly "everything but the support glyph"
                at 375; flex-[1_0_0] is the same edge there and keeps the
                support glyph flush right at 393. */}
            <button
              type="button"
              aria-label="Menu"
              onClick={() => setDrawerOpen(true)}
              className="content-stretch cursor-pointer drop-shadow-[var(--shadow\/x,0px)_var(--shadows\/scale\/none\/y,0px)_calc(var(--shadows\/scale\/none\/blur,0px)/2)_var(--shadows\/color\/transparent,rgba(0,0,0,0)),var(--shadow\/x,0px)_var(--shadow\/control\/layer-1\/y,0px)_calc(var(--shadow\/control\/layer-1\/blur,0px)/2)_var(--shadow\/control\/layer-1\/color,rgba(0,0,0,0))] flex flex-[1_0_0] gap-[var(--pro\/space\/1\,5,6.40148663520813px)] h-[34.141px] items-center min-w-px p-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-default\/radius,27.74px)] shrink-0"
            >
              {/* The glyph frame is 17.071px and Figma insets the artwork 20.83%
                  on every side, which puts 9.958px of path plus its 1.419
                  stroke — 11.3769px of ink, Menu10's whole viewBox — inside it.
                  Rendering Menu10 at 17.071 would draw it half again too large. */}
              <span className="flex items-center justify-center overflow-clip relative shrink-0 size-[17.071px]">
                <Menu10 size={11.3769} className="text-[#0a0a0a]" />
              </span>
            </button>
            {/* I198314:73478;50600:52769;198314:73477. Same arithmetic: a 24px
                frame, artwork inset 12.5%/8.33%, stroke bleed 5.54%/4.99% —
                21.995 x 19.995 of ink, which is CustomerSupport's viewBox, so
                width/height are passed rather than a square `size`. */}
            <span className="flex items-center justify-center overflow-clip relative shrink-0 size-[24px]">
              <CustomerSupport width={21.995} height={19.995} className="text-[#0a0a0a]" />
            </span>
          </div>
        </div>

        {/* Content — 198314:73479. shrink-0 in Figma only because Figma frames
            have no scroll model; here it is the screen's one scroller and keeps
            the designed gap-[22px] / pt-[20px] / px-[10px]. */}
        <div
          className="content-stretch flex flex-col gap-[22px] items-start pt-[20px] px-[var(--pro\/space\/2\,5,10px)] relative w-full"
          style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
          data-node-id="198314:73479"
          data-name="Content"
        >
          {/* 198314:73480 / :73481 */}
          <div className="content-stretch flex gap-[10px] items-center relative shrink-0 w-full">
            <h1 className="[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/2xl\/lh,32px)] relative shrink-0 text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/2xl\/size,24px)] tracking-[-0.6px] whitespace-nowrap">
              {scopeTitle}
            </h1>
          </div>

          {/* 198314:73484 */}
          <div className="content-stretch flex flex-col gap-[14px] items-start relative shrink-0 w-full">
            {/* 198314:73485 / :73491 */}
            <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
              <div
                className="content-stretch flex flex-[1_0_0] gap-[var(--p-0,0px)] h-[36px] items-start min-w-px pr-[var(--component\/tabs\/list\/padding,3px)] py-[var(--component\/tabs\/list\/padding,3px)] relative rounded-[var(--component\/tabs\/trigger\/radius,14px)]"
                data-node-id="198314:73491"
                data-name="Tabs"
              >
                <div className="content-stretch flex flex-[1_0_0] gap-[var(--spacing\/2,8px)] items-center min-w-px relative">
                  <TabTrigger label="Overview" active={tab === 'overview'} onClick={() => setTab('overview')} />
                  <TabTrigger label="General Info" active={tab === 'general'} onClick={() => setTab('general')} />
                </div>
              </div>
            </div>

            {tab === 'overview' ? (
              expanded ? (
                /* Body wrapper — 198328:89082. The expanded frame tightens the
                   stack to 10px; everything else about it is unchanged. */
                <div
                  className="content-stretch flex flex-col gap-[10px] items-start pb-[var(--spacing\/4,16px)] px-[var(--p-0,0px)] relative shrink-0 w-full"
                  data-node-id="198328:89082"
                  data-name="Body wrapper"
                >
                  {cards}
                </div>
              ) : (
                /* Body wrapper — 198314:73492 */
                <div
                  className="content-stretch flex flex-col gap-[14px] items-start pb-[var(--spacing\/4,16px)] px-[var(--p-0,0px)] relative shrink-0 w-full"
                  data-node-id="198314:73492"
                  data-name="Body wrapper"
                >
                  {cards}
                </div>
              )
            ) : (
              /* NOT DESIGNED. The delivery canvas draws this tab on both frames
                 but has no content frame for it anywhere, and inventing one is
                 forbidden. Honest placeholder until a comp exists — do not fill
                 it with plausible-looking fields. */
              <div className="bg-[#fafbfc] border border-solid border-white content-stretch flex flex-col gap-[4px] items-center justify-center py-[40px] relative rounded-[var(--rounded-2xl,18px)] shrink-0 w-full">
                <p className="font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/sm\/lh,20px)] text-[color:var(--colors\/slate\/600,#45556c)] text-[length:var(--text\/sm\/size,14px)]">
                  General Info
                </p>
                <p className="font-[var(--font\/weight\/font-normal,400)] leading-[var(--text\/xs\/lh,16px)] text-[color:var(--colors\/slate\/400,#90a1b9)] text-[12px]">
                  No design yet for this tab.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Behind the burger. Navigation only — the v2 drawer carries no global
          scope, and v1 screens keep their own NavigationDrawer. */}
      <WintSidebarV2 open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* The designed destination for "Show all" / "Show past events" / "Show
          past alerts" — Figma 198328:89685 and :90254 are this overlay in
          account scope. Renders null while `overlay` is null. */}
      <EventOverlay
        open={overlay !== null}
        onClose={() => setOverlay(null)}
        dataset={overlay ?? 'water'}
        scope="account"
        scopeName={scopeTitle}
      />

      <TabBar activeTab="home" />
    </div>
  )
}
