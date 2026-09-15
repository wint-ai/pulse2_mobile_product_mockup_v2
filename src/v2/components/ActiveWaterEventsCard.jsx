/**
 * Active Water Events card — v2, MOBILE.
 *
 * Design source: Figma file YEmjkKS4xaA827Zm8w3oXx, each node fetched on its
 * own so Figma could not merge sibling variants and hand back the wrong assets:
 *
 *   198328:89083  "Body wrapper" — the 339px-wide mobile water-events card:
 *                 CardHeader ("25 Water events" + collapse chevron), the
 *                 All / High / Low filter chip row, five event rows separated
 *                 by hairlines, and a "Show all" footer.
 *   198368:56180  the filter chip row on its own. Verified identical to the
 *                 copy nested inside 198328:89083.
 *   198314:73494  the healthy state — a horizontal card with the pipe-and-
 *                 shield illustration, "Everything looks good!", "No active
 *                 water events" and a "Show past events" link.
 *
 * This REPLACES a build made from 198209:67180 / 198209:67182, which are the
 * 760px DESKTOP table and its empty state. That card capped its width at 760px
 * and pinned its height to 380px under overflow-clip, so on a phone the
 * expanded five-row list cropped.
 * Nothing here has a fixed height: the list grows with its content.
 *
 * ── var() class names ──────────────────────────────────────────────────────
 * The var(...) classes are Figma's, untouched. Each carries its own literal
 * fallback (`px-[var(--component/badge/px,8px)]`), so the design value renders
 * whether or not the project defines the token. Do not "simplify" them into
 * px-2 / text-slate-600 and do not round them.
 *
 * CARE: those names contain a real backslash (`--colors\/slate\/500`) and the
 * backslash has to survive all the way into the DOM class attribute. JSX string
 * attributes preserve it; an ordinary JS string literal or a cn() argument eats
 * it, after which Tailwind's generated selector and the emitted class no longer
 * match and the rule silently does nothing. So every such class below sits in a
 * literal JSX className, conditionals are expressed as data-attributes or as
 * two spelled-out branches, and the one place that has to concatenate — the
 * root, which appends the caller's `className` — uses String.raw`` so the
 * backslashes pass through unescaped.
 *
 * ── Assets ─────────────────────────────────────────────────────────────────
 * Figma's export URLs expire in ~7 days, so every glyph is inlined here.
 *
 *   waves, 21px, three traces   → already owned as @/v2/icons/Waves. The
 *                                 export (ce2fd526…) is identical to it path
 *                                 for path, stroke-width 1.08063 included.
 *   waves, 21px, two traces     → WavesLow21 below. Derived by dropping the
 *                                 TOP trace of the 21px three-trace export —
 *                                 which is exactly how Figma's own 13px pair
 *                                 differ (the 13px two-trace file is the 13px
 *                                 three-trace file minus its top path), so
 *                                 this is the real glyph, not a guess.
 *   waves, 13px, three / two    → Waves13 / Waves13Low, the chip discs.
 *                                 Genuinely separate exports: the same 1.08063
 *                                 stroke on a 13 viewBox instead of a 21, so
 *                                 scaling the 21px one down would thin it.
 *   Location Dot, header        → LocationDot below. See its note: Figma
 *                                 served the wrong artwork for this one.
 *   chevron, header             → ChevronUp16 / ChevronDown16. Same story.
 *   hairlines                   → Line 6 (#E2E8F0) and Line 1 (#90A1B9).
 *   healthy illustration        → data URI; see ILLUSTRATION.
 */

import { useMemo, useState } from 'react'
import { Waves } from '@/v2/icons'

// ── Inlined Figma assets ───────────────────────────────────────────────────

/**
 * Header "Location Dot" — three concentric circles, the outer two at 10%.
 *
 * Figma's asset for this instance (81540666…) is NOT the location dot: it came
 * back as "Lucide Icons / smile", the placeholder glyph sitting in the Featured
 * Icon component this instance is swapped from. The node screenshot plainly
 * shows the concentric red dot, so the export is stale. Rather than ship a
 * smiley or guess, the geometry is the project's own Location Dot export taken
 * from the sibling desktop header (198209:67180) — the same component, drawn
 * there at 27px and here at 44px, which is why the viewBox stays 27 and only
 * the rendered size changes. Fills are currentColor so the caller tints it.
 */
function LocationDot({ size = 44, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 27 27"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle opacity="0.1" cx="13.5" cy="13.5" r="13.5" fill="currentColor" />
      <circle opacity="0.1" cx="13.5" cy="13.5" r="8.52632" fill="currentColor" />
      <circle cx="13.5" cy="13.5" r="2.84211" fill="currentColor" />
    </svg>
  )
}

/**
 * Header collapse chevron, 16px.
 *
 * Same failure as the location dot: Figma exported "Lucide Icons / arrow-left"
 * (f45eca2a…), the Button component's placeholder icon, while the node
 * screenshot shows a thin chevron pointing up. The repo has hit this before —
 * see the note above ChevronDown12 in EventsTimelineCard.jsx. Drawn here in
 * Lucide's own geometry (the family the slot names) at the exported 1.33
 * stroke and the exported #0A0A0A, which is the only real colour data the node
 * gave for this element.
 */
function ChevronUp16() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M12 10L8 6L4 10" stroke="#0A0A0A" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDown16() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M4 6L8 10L12 6" stroke="#0A0A0A" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Phosphor "waves", 21px box, TWO traces — the 21px three-trace export
 *  (@/v2/icons/Waves) minus its top path. Low-flow rows only. */
function WavesLow21({ className }) {
  return (
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <g clipPath="url(#awe_waves_low_21)">
        <path d="M3.28125 15.2258C9.1875 10.3294 11.8125 19.8581 17.7188 14.9617" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.28125 10.6321C9.1875 5.73563 11.8125 15.2644 17.7188 10.3679" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <defs>
        <clipPath id="awe_waves_low_21"><rect width="21" height="21" fill="white" /></clipPath>
      </defs>
    </svg>
  )
}

/** Phosphor "waves", 13px box, three traces — filter chip disc (5c5bd80c…). */
function Waves13({ className }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <g clipPath="url(#awe_waves_13)">
        <path d="M2.03125 9.42551C5.6875 6.39437 7.3125 12.2931 10.9688 9.26199" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2.03125 6.58176C5.6875 3.55062 7.3125 9.44937 10.9688 6.41824" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2.03125 3.73801C5.6875 0.706875 7.3125 6.60562 10.9688 3.57449" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <defs>
        <clipPath id="awe_waves_13"><rect width="13" height="13" fill="white" /></clipPath>
      </defs>
    </svg>
  )
}

/** Phosphor "waves", 13px box, TWO traces — the Low chip disc (f665d300…). */
function Waves13Low({ className }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <g clipPath="url(#awe_waves_13_low)">
        <path d="M2.03125 9.42551C5.6875 6.39437 7.3125 12.2931 10.9688 9.26199" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2.03125 6.58176C5.6875 3.55062 7.3125 9.44937 10.9688 6.41824" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <defs>
        <clipPath id="awe_waves_13_low"><rect width="13" height="13" fill="white" /></clipPath>
      </defs>
    </svg>
  )
}

/** "Line 6" — the full-width row rule, #E2E8F0. Figma stretches a 307x1 export
 *  with preserveAspectRatio=none; kept in its own wrapper so the 1px never
 *  scales. Figma stacks two of these at the top of the list (Line 6 + Line 11,
 *  both at y=0); two coincident 1px rules render as one, so one is drawn. */
function RowRule() {
  return (
    <div className="h-0 relative shrink-0 w-full">
      <div className="absolute inset-[-1px_0_0_0]">
        <svg viewBox="0 0 307 1" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="block max-w-none size-full" aria-hidden="true">
          <line y1="0.5" x2="307" y2="0.5" stroke="#E2E8F0" />
        </svg>
      </div>
    </div>
  )
}

/** "Line 1" — the 12x1 rule Figma rotates 90deg between location and address,
 *  #90A1B9. Kept inside Figma's own rotate wrapper. */
function CellHairline() {
  return (
    <div className="flex h-[12px] items-center justify-center relative shrink-0 w-0">
      <div className="flex-none rotate-90">
        <div className="h-0 relative w-[12px]">
          <div className="absolute inset-[-1px_0_0_0]">
            <svg viewBox="0 0 12 1" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="block max-w-none size-full" aria-hidden="true">
              <line y1="0.5" x2="12" y2="0.5" stroke="#90A1B9" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Healthy-state illustration — node 198314:73496, a raster fill (bdf72159…),
 * 1448x1086. Inlined as a data URI because the Figma URL expires; downsampled
 * to 432x324, which is ~3.1x the 138x103.5 box it renders into. This is a
 * DIFFERENT file from the illustration the desktop empty state used (the two
 * exports have different bytes at the same dimensions), so it is re-encoded
 * here rather than carried over.
 */
const ILLUSTRATION = 'data:image/png;base64,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'

// ── Event types ────────────────────────────────────────────────────────────
// `type` strings match src/data/events.js so a real CURRENT_EVENTS slice drops
// straight in. Every row in 198328:89083 is High Flow; the low-flow palette
// below is the design's own, lifted from the Low filter chip in 198368:56180
// (orange/100 #ffedd4 surface, #FF6900 glyph). The low-flow LABEL colour is the
// one inference in this file: the high-flow label is colors/red/600 #e7000b, so
// low takes colors/orange/600 #f54a00 — the comp has no low-flow row to copy.

const TYPE_LABEL = {
  'leak-high': 'High Flow',
  'leak-low': 'Low Flow',
}

// ── Mock data ──────────────────────────────────────────────────────────────
// A prop DEFAULT, not screen state: it lets the card render standalone in
// isolation. The five rows are 198328:89083's own, verbatim — same names, same
// cities, same addresses, the same repeated "Apr 02, 2026 08:13:15" and
// "6h 36m". The comp's header reads "25 Water events" while the body draws five
// rows and defers the rest to "Show all"; the header here counts what it was
// actually given, so standalone it reads "5 Water events".
const MOCK_EVENTS = [
  { id: 'awe-1', systemName: 'Fire Riser 2',     location: 'San Fransisco', address: '1775 Washington St, Hanover MA 2339', type: 'leak-high', detectedAt: 'Apr 02, 2026 08:13:15', duration: '6h 36m' },
  { id: 'awe-2', systemName: '360 Magnolia Row', location: 'Los Angeles',   address: '333 Main Street, Tewksbury MA 1876',  type: 'leak-high', detectedAt: 'Apr 02, 2026 08:13:15', duration: '6h 36m' },
  { id: 'awe-3', systemName: '751 Poplar Court', location: 'Los Angeles',   address: '700 Oak Street, Brockton MA 2301',    type: 'leak-high', detectedAt: 'Apr 02, 2026 08:13:15', duration: '6h 36m' },
  { id: 'awe-4', systemName: '751 Poplar Court', location: 'Los Angeles',   address: '700 Oak Street, Brockton MA 2301',    type: 'leak-high', detectedAt: 'Apr 02, 2026 08:13:15', duration: '6h 36m' },
  { id: 'awe-5', systemName: '751 Poplar Court', location: 'Los Angeles',   address: '700 Oak Street, Brockton MA 2301',    type: 'leak-high', detectedAt: 'Apr 02, 2026 08:13:15', duration: '6h 36m' },
]

// ── Pieces ─────────────────────────────────────────────────────────────────

/** Badge 198328:89093 + its label 198328:89099. Two spelled-out branches
 *  rather than a computed class string, so the backslashes stay literal. */
function TypeBadge({ type }) {
  if (type === 'leak-low') {
    return (
      <div className="content-stretch flex flex-col gap-[5px] items-center relative shrink-0">
        <div className="bg-[var(--colors\/orange\/100,#ffedd4)] content-stretch flex flex-col gap-[var(--component\/badge\/gap,4px)] items-center justify-center overflow-clip px-[var(--component\/badge\/px,8px)] py-[var(--component\/badge\/py,2px)] relative rounded-[var(--component\/pro\/application\/inline-hint\/rail\/radius,9999px)] shrink-0 size-[48px]">
          <div className="content-stretch flex flex-col items-start relative shrink-0">
            <WavesLow21 className="relative shrink-0 size-[21px] text-[#ff6900]" />
          </div>
        </div>
        <p className="[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Geist:Medium'),'Figtree','Inter',sans-serif] font-medium leading-[var(--text\/xs\/lh,16px)] overflow-hidden relative shrink-0 text-[12px] text-[color:var(--colors\/orange\/600,#f54a00)] text-ellipsis text-left whitespace-nowrap">
          Low Flow
        </p>
      </div>
    )
  }
  return (
    <div className="content-stretch flex flex-col gap-[5px] items-center relative shrink-0">
      <div className="bg-[var(--colors\/red\/100,#ffe2e2)] content-stretch flex flex-col gap-[var(--component\/badge\/gap,4px)] items-center justify-center overflow-clip px-[var(--component\/badge\/px,8px)] py-[var(--component\/badge\/py,2px)] relative rounded-[var(--component\/pro\/application\/inline-hint\/rail\/radius,9999px)] shrink-0 size-[48px]">
        <div className="content-stretch flex flex-col items-start relative shrink-0">
          <Waves size={21} className="relative shrink-0 size-[21px] text-[#fb2c36]" />
        </div>
      </div>
      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Geist:Medium'),'Figtree','Inter',sans-serif] font-medium leading-[var(--text\/xs\/lh,16px)] overflow-hidden relative shrink-0 text-[12px] text-[color:var(--colors\/red\/600,#e7000b)] text-ellipsis text-left whitespace-nowrap">
        {TYPE_LABEL[type] || TYPE_LABEL['leak-high']}
      </p>
    </div>
  )
}

/**
 * One event row — 198328:89090.
 *
 * INERT BY DESIGN. Figma marks the first row as a <button> and floats a
 * "Cursors / Pointer Cursor" decoration over it, both of which say a row is
 * meant to open the event. This component's export signature is frozen at
 * ({ events, onShowAll, onShowPast, className }) so the page that consumes it
 * keeps working, and there is no row-level callback in it. Rather than invent a
 * destination or silently fire onShowAll, the row renders as a non-interactive
 * <div>: no cursor-pointer, no role, nothing that promises a tap. Add an
 * onSelectEvent prop and turn this back into a <button> when the page has
 * somewhere to send it. (The pointer-cursor decoration is a design-time
 * annotation and is deliberately not drawn.)
 *
 * Figma's own rows disagree about width — row 1 runs the full 307px while rows
 * 2..5 carry an extra pr-16 and run 291px. That is a stray resize in the comp,
 * not a rhythm, so every row here uses row 1's geometry.
 */
function EventRow({ event }) {
  return (
    <div className="content-stretch flex flex-col gap-[var(--spacing\/2,8px)] items-start py-[16px] relative shrink-0 w-full">
      <div className="content-stretch flex gap-[17px] items-center relative shrink-0 w-full">
        <TypeBadge type={event.type} />
        <div className="content-stretch flex flex-[1_0_0] flex-col gap-[7px] items-start min-w-px relative">
          {/* Figma has no truncation on the name; max-w-full + ellipsis is
              added so a long system name cannot push the row past 375px. */}
          <div className="content-stretch flex items-center max-w-full relative shrink-0">
            <p className="[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Geist:SemiBold'),'Figtree','Inter',sans-serif] font-semibold leading-[var(--text\/sm\/lh,20px)] overflow-hidden relative min-w-px text-[color:var(--foreground,#0a0a0a)] text-[length:var(--text\/sm\/size,14px)] text-ellipsis text-left whitespace-nowrap">
              {event.systemName}
            </p>
          </div>

          <div className="content-stretch flex gap-[5px] items-center relative shrink-0 w-full">
            <p className="[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Geist:Regular'),'Figtree','Inter',sans-serif] font-normal leading-[var(--text\/xs\/lh-snug,16.5px)] relative shrink-0 text-[color:var(--colors\/slate\/500,#62748e)] text-[length:var(--text\/xs\/size,12px)] text-left whitespace-nowrap">
              {event.location}
            </p>
            {event.address ? <CellHairline /> : null}
            <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/sans,'Geist:Regular'),'Figtree','Inter',sans-serif] font-normal leading-[var(--text\/xs\/lh-snug,16.5px)] min-w-px overflow-hidden relative text-[12px] text-[color:var(--colors\/slate\/500,#62748e)] text-ellipsis text-left whitespace-nowrap">
              {event.address}
            </p>
          </div>

          <div className="content-stretch flex gap-[13px] items-center relative shrink-0">
            <p className="[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Geist:Regular'),'Figtree','Inter',sans-serif] font-normal leading-[var(--text\/xs\/lh-snug,16.5px)] overflow-hidden relative shrink-0 text-[12px] text-[color:var(--colors\/slate\/500,#62748e)] text-ellipsis text-left whitespace-nowrap">
              {event.detectedAt}
            </p>
            {/* Figma's "Duration" caption above this value is hidden in the
                comp; only the value shows, and only when the data carries one
                (HomeAllAccounts' rows do not). */}
            {event.duration ? (
              <div className="content-stretch flex gap-[5px] items-center relative shrink-0">
                <p className="[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Geist:Regular'),'Figtree','Inter',sans-serif] font-normal leading-[var(--text\/xs\/lh-none,12px)] overflow-hidden relative shrink-0 text-[12px] text-[color:var(--colors\/slate\/900,#0f172b)] text-ellipsis text-left whitespace-nowrap">
                  {event.duration}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Filter chip — 198368:56181 / :56232 / :56188.
 *
 * The comp ships a single appearance for all three chips; it has no selected
 * variant. The chips have to do something real, so they filter, and the active
 * one is marked with aria-pressed plus a data-active attribute that deepens the
 * border from colors/slate/200 to #90a1b9 (colors/slate/400, the next stop on
 * the same ramp). The data-attribute is how that conditional stays out of a JS
 * string — see the escaping note at the top of the file.
 *
 * The All and High discs are the same red/100 + three-trace glyph in the comp;
 * only Low differs, down to the items-start pt-[4px] that recentres its
 * shorter two-trace glyph.
 */
function FilterChip({ tone, label, count, active, onClick }) {
  const disc =
    tone === 'low' ? (
      <div className="bg-[var(--colors\/orange\/100,#ffedd4)] content-stretch flex items-start justify-center pt-[4px] relative rounded-[17.19px] shrink-0 size-[24px]">
        <Waves13Low className="relative shrink-0 size-[13px] text-[#ff6900]" />
      </div>
    ) : (
      <div className="bg-[var(--colors\/red\/100,#ffe2e2)] content-stretch flex items-center justify-center relative rounded-[17.19px] shrink-0 size-[24px]">
        <Waves13 className="relative shrink-0 size-[13px] text-[#fb2c36]" />
      </div>
    )

  return (
    <button
      type="button"
      aria-pressed={active}
      data-active={active ? 'true' : 'false'}
      onClick={onClick}
      className="bg-[#fafbfc] border border-[var(--colors\/slate\/200,#e2e8f0)] border-solid content-stretch cursor-pointer data-[active=true]:border-[#90a1b9] flex flex-[1_0_0] h-[36px] items-center min-w-px pl-[5px] pr-[11px] relative rounded-[var(--rounded-3xl,26px)]"
    >
      <div className="content-stretch flex flex-[1_0_0] items-center justify-between min-w-px relative">
        <div className="content-stretch flex gap-[6px] items-center relative shrink-0">
          {disc}
          <p className="[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Geist:Medium'),'Figtree','Inter',sans-serif] font-medium leading-[var(--text\/sm\/lh-tight,18px)] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--colors\/slate\/600,#45556c)] text-ellipsis whitespace-nowrap" dir="auto">
            {label}
          </p>
        </div>
        <p className="[word-break:break-word] font-[family-name:var(--font\/family\/heading,'Geist:Bold'),'Figtree','Inter',sans-serif] font-bold leading-[var(--text\/base\/lh-relaxed,26px)] overflow-hidden relative shrink-0 text-[16px] text-[color:var(--colors\/slate\/600,#45556c)] text-ellipsis tracking-[var(--text\/base\/heading-tracking,-0.4px)] whitespace-nowrap">
          {count}
        </p>
      </div>
    </button>
  )
}

/**
 * Healthy state — 198314:73494, the ~133px horizontal card.
 *
 * Figma pins the Header row to a hard 301px because the frame it was measured
 * in is 339 wide with pl-18 / pr-20; that is w-full by another name, so w-full
 * is used and the card survives any shell width. min-h-[133px] reproduces the
 * comp's height without being able to crop anything — the content grows past it
 * freely if the text wraps further.
 */
function HealthyState({ onShowPast }) {
  return (
    <div className="bg-[#fafbfc] border border-solid border-white content-stretch flex flex-col gap-[40px] items-start justify-center min-h-[133px] pl-[18px] pr-[20px] py-[12px] relative rounded-[var(--rounded-3xl,22px)] w-full">
      <div className="content-stretch flex flex-[1_0_0] gap-[var(--pro\/space\/4,12px)] items-center min-h-px relative w-full">
        <div className="h-[66px] relative shrink-0 w-[138px]">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img alt="" className="absolute h-[156.82%] left-0 max-w-none top-[-23.45%] w-full" src={ILLUSTRATION} />
          </div>
        </div>
        <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--pro\/space\/2,6px)] items-start justify-center min-w-px relative">
          <div className="content-stretch flex flex-col gap-[4px] items-start leading-[0] relative shrink-0 w-full">
            <div className="flex flex-col font-[family-name:var(--font\/family\/sans,'Geist:SemiBold'),'Figtree','Inter',sans-serif] font-semibold justify-center relative shrink-0 text-[color:var(--foreground,#0a0a0a)] text-[length:var(--text\/base\/size,16px)] w-full">
              <p className="leading-[var(--text\/base\/lh,24px)]">Everything looks good!</p>
            </div>
            <div className="flex flex-col font-[family-name:var(--font\/family\/sans,'Geist:Regular'),'Figtree','Inter',sans-serif] font-normal justify-center relative shrink-0 text-[color:var(--muted-foreground,#737373)] text-[length:var(--text\/sm\/size,14px)] w-full">
              <p className="leading-[var(--text\/sm\/lh,20px)]" dir="auto">
                No active water events
              </p>
            </div>
          </div>
          {/* Figma draws this as a text layer; it is the state's only action,
              so it is a real button wired to onShowPast. */}
          <button
            type="button"
            onClick={() => onShowPast?.()}
            className="cursor-pointer font-[family-name:var(--font\/family\/sans,'Geist:Medium'),'Figtree','Inter',sans-serif] font-medium leading-[var(--text\/xs\/lh-tight,15px)] overflow-hidden relative shrink-0 text-[12px] text-[color:var(--wint-blue-accent,#0b81f8)] text-center text-ellipsis whitespace-nowrap"
          >
            Show past events
          </button>
        </div>
      </div>
    </div>
  )
}

// The one class string that cannot be a literal JSX attribute, because the
// caller's `className` has to be appended to it. String.raw keeps `\/` as a
// real backslash-slash the way a JSX attribute would; an ordinary quoted string
// would collapse it to `/` and every var() rule on the root would stop
// matching. Tailwind still scans the source text, so the selectors it emits are
// identical either way.
//
// size-full from Figma is deliberately w-full here: a height would crop the
// list, which is the exact bug this rewrite exists to remove.
const ROOT_CLASS = String.raw`bg-[#fafbfc] border-[length:var(--border-width\/border,1px)] border-solid border-white content-stretch flex flex-col gap-[14px] items-center overflow-clip pb-[var(--spacing\/6,24px)] pt-[var(--p-0,0px)] px-[var(--p-0,0px)] relative rounded-[var(--rounded-2xl,18px)] shadow-[var(--shadow\/x,0px)_var(--shadow\/popover\/layer-2\/y,2px)_var(--shadow\/popover\/layer-2\/blur,4px)_var(--shadow\/popover\/layer-2\/spread,-2px)_var(--shadow\/popover\/layer-2\/color,rgba(0,0,0,0.1))] w-full`

/**
 * @param {object}   props
 * @param {Array}    [props.events]      rows to show; `[]` renders the healthy
 *                                       state. Defaults to the comp's own rows
 *                                       so the card renders standalone.
 * @param {Function} [props.onShowAll]   "Show all" footer.
 * @param {Function} [props.onShowPast]  "Show past events", healthy state only.
 * @param {string}   [props.className]   appended to the card root.
 */
export default function ActiveWaterEventsCard({ events = MOCK_EVENTS, onShowAll, onShowPast, className }) {
  // Figma's header chevron points up, i.e. this card collapses. There is no
  // collapsed variant node, so the collapsed form is simply the header alone.
  const [collapsed, setCollapsed] = useState(false)
  const [filter, setFilter] = useState('all')

  const list = useMemo(() => (Array.isArray(events) ? events : []), [events])

  const counts = useMemo(() => ({
    all: list.length,
    high: list.filter((e) => e.type === 'leak-high').length,
    low: list.filter((e) => e.type === 'leak-low').length,
  }), [list])

  const rows = filter === 'all' ? list : list.filter((e) => e.type === filter)

  if (list.length === 0) return <HealthyState onShowPast={onShowPast} />

  return (
    <div className={className ? ROOT_CLASS + ' ' + className : ROOT_CLASS}>
      {/* CardHeader 198328:89086. Figma makes the whole header the button. */}
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((v) => !v)}
        className="bg-[#fafbfc] content-stretch cursor-pointer flex gap-[var(--spacing\/3,12px)] items-center pb-[var(--p-0,0px)] pt-[var(--component\/card\/padding-sm,12px)] px-[var(--component\/card\/padding-sm,12px)] relative shrink-0 w-full"
      >
        <LocationDot size={44} className="relative shrink-0 text-[#fb2c36]" />
        <div className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--component\/card\/header\/gap,4px)] items-start min-w-px relative">
          <p className="[word-break:break-word] font-[family-name:var(--font\/family\/heading,'Geist:SemiBold'),'Figtree','Inter',sans-serif] font-semibold leading-[var(--text\/title-md\/lh-snug,18px)] relative shrink-0 text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/title-md\/size,18px)] text-left tracking-[-0.45px] w-full">
            {list.length} Water events
          </p>
        </div>
        <div className="content-stretch flex gap-[12px] items-center relative shrink-0">
          <div className="content-stretch flex flex-col gap-[var(--p-0,0px)] items-end relative shrink-0 w-[57px]">
            <div className="content-stretch flex gap-[var(--component\/button\/gap,6px)] h-[32px] items-center justify-end px-[var(--component\/button\/size-default\/px,10px)] py-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-default\/radius,10px)] shrink-0 w-full">
              <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[16px]">
                {collapsed ? <ChevronDown16 /> : <ChevronUp16 />}
              </div>
            </div>
          </div>
        </div>
      </button>

      {collapsed ? null : (
        <>
          {/* Filter chips 198368:56180. */}
          <div className="content-stretch flex gap-[8px] items-center px-[16px] relative shrink-0 w-full">
            <FilterChip tone="high" label="All" count={counts.all} active={filter === 'all'} onClick={() => setFilter('all')} />
            <FilterChip tone="high" label="High" count={counts.high} active={filter === 'leak-high'} onClick={() => setFilter('leak-high')} />
            <FilterChip tone="low" label="Low" count={counts.low} active={filter === 'leak-low'} onClick={() => setFilter('leak-low')} />
          </div>

          {/* List 198328:89087. No height and no scroller: it grows with its
              rows, which is the whole point of rebuilding off the mobile node. */}
          <div className="content-stretch flex flex-col items-center px-[var(--spacing\/4,16px)] relative shrink-0 w-full">
            <RowRule />
            {rows.map((event, i) => (
              <div key={event.id ?? i} className="content-stretch flex flex-col items-center relative shrink-0 w-full">
                <EventRow event={event} />
                <RowRule />
              </div>
            ))}
            {rows.length === 0 ? (
              <p className="font-[family-name:var(--font\/family\/sans,'Geist:Regular'),'Figtree','Inter',sans-serif] font-normal leading-[var(--text\/sm\/lh,20px)] py-[16px] relative shrink-0 text-[color:var(--colors\/slate\/500,#62748e)] text-[length:var(--text\/sm\/size,14px)] text-center w-full">
                No {filter === 'leak-high' ? 'high' : 'low'} flow events
              </p>
            ) : null}
          </div>

          {/* "Show all" 198328:89206. */}
          <button
            type="button"
            onClick={() => onShowAll?.()}
            className="[word-break:break-word] block cursor-pointer font-[family-name:var(--font\/family\/sans,'Geist:Medium'),'Figtree','Inter',sans-serif] font-medium leading-[0] overflow-hidden relative shrink-0 text-[color:var(--colors\/slate\/500,#62748e)] text-[length:var(--text\/sm-tight\/size,14px)] text-center text-ellipsis w-full whitespace-nowrap"
          >
            <p className="leading-[var(--text\/sm-tight\/lh,20px)] overflow-hidden text-[14px] text-ellipsis" dir="auto">
              Show all
            </p>
          </button>
        </>
      )}
    </div>
  )
}
