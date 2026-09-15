/**
 * Events Timeline card — v2.
 * Design source: Figma file YEmjkKS4xaA827Zm8w3oXx, both variants of
 * "Events Timeline", each fetched on its own node (never on the parent, which
 * merges variants and hands back the wrong assets):
 *   Property 1=Default   198354:121789
 *   Property 1=Expanded  198355:121791
 *
 * ── How the classes are written ───────────────────────────────────────────────
 * Every utility below is Figma's own output, kept verbatim, e.g.
 *     text-[color:var(--colors\/slate\/900,#0f172b)]
 *     px-[var(--component\/badge\/px,8px)]
 * Each var() carries its own literal fallback, so the design value renders with
 * no token wiring. They are NOT translated to text-slate-900 / px-2 — that
 * rounding is exactly what broke the previous screenshot-built pass.
 *
 * Two of Figma's vars had to be flattened to their literals, because this
 * project DOES define them and with different values, so the fallback would
 * never be reached (src/index.css:68,79):
 *   var(--secondary-foreground,#171717) → project value is #0b81f8 (blue).
 *       Kept as #171717; a blue "All" label is plainly not the design.
 *   var(--muted-foreground,#737373)     → project value is #62748e (slate/500).
 *       Kept as #737373, the value the Figma node actually renders.
 *
 * Class strings that live in JS (the tone tables) use String.raw. A normal JS
 * string literal would eat the backslash in `\/`, and Tailwind's scanner reads
 * raw file text, so `\\/` would emit a class name that never matches at
 * runtime. String.raw is correct on both sides.
 *
 * ── Mobile ────────────────────────────────────────────────────────────────────
 * The Figma frame is 740×380. At 375 the designed row (text block left,
 * timestamp + chevron right, on the title line) cannot hold: the metrics line
 * alone is ~269px and the timestamp ~118px against a ~307px text column. The
 * chevron stays pinned top-right because it is the affordance; the timestamp
 * drops to a footer line inside the text column, alongside the Tag / "n sent"
 * chip that the design already right-aligns under it. Every element the design
 * specifies is present, in the same reading order. All colour, type, radius,
 * padding and gap tokens are untouched.
 */

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CaretDown, Waves } from '@/v2/icons'
import { cn } from '@/lib/utils'

// ── Inlined Figma assets ─────────────────────────────────────────────────────
// Figma's asset URLs expire in ~7 days, so nothing may reference them at
// runtime. Geometry, viewBox and shipped stroke colours are the export
// verbatim — no redraws, no lucide lookalikes.
//
// Two glyphs come from src/v2/icons instead of being re-exported here:
//   Waves      — the 13px export is the same artwork as Waves.jsx (both start
//                at 15.625% of the box, both stroke 1.08063 in their own
//                viewBox). Only the viewBox differs (13 vs 21), which thins the
//                stroke to 0.67px when Waves.jsx is drawn at 13px, so the
//                stroke is scaled back to the design weight: 1.08063×21/13.
//   CaretDown  — the "All" pill. Figma named the asset const
//                imgPhosphorIconsCaretDown but served the Huge-Icons/smile
//                artwork sitting in the Button's Icon Placeholder slot; the
//                node screenshot shows a caret. Phosphor caret-down is already
//                owned as CaretDown.jsx, so that is used and the slot's
//                -rotate-180/-scale-x-100 (a net vertical flip, which would
//                point the caret up) is dropped.

/** Tabler Icons / chevron-down — 198352:121470 */
function ChevronDown12({ className }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="#62748E" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Tabler Icons / chevron-up — 198355:121823 */
function ChevronUp12({ className }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <path d="M3 7.5L6 4.5L9 7.5" stroke="#62748E" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Huge Icons / plus-sign — 198424:61412. 9.33 artwork inside a 12px box. */
function PlusSign12() {
  return (
    <span className="flex items-center justify-center overflow-clip shrink-0 size-[12px]">
      <svg width="9.33" height="9.33" viewBox="0 0 9.33 9.33" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <path d="M4.665 0.665V8.665M8.665 4.665H0.665" stroke="#314158" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/** Huge Icons / wifi-02 — 198352:121533. 11.914×8.122 artwork inside a 13px box. */
function Wifi02() {
  return (
    <span className="flex items-center justify-center overflow-clip shrink-0 size-[13px]">
      <svg width="11.914" height="8.12229" viewBox="0 0 11.914 8.12229" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <path d="M5.95699 7.58198H5.96338" stroke="#2B7FFF" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.92574 5.95698C5.00907 4.87365 6.90491 4.87365 7.98824 5.95698" stroke="#2B7FFF" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.47782 4.33198C7.43704 2.52642 4.60282 2.52642 2.43616 4.33198" stroke="#2B7FFF" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M0.540324 2.70698C3.96138 -0.181897 7.9526 -0.181902 11.3737 2.70692" stroke="#2B7FFF" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/** Lucide Icons / bell — 2706:17682, as exported at 12px (not the current lucide-react path). */
function Bell12() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" aria-hidden="true" focusable="false">
      <path
        d="M5.15002 10.5C5.23372 10.6522 5.35675 10.7792 5.50627 10.8676C5.65579 10.956 5.82631 11.0027 6.00002 11.0027C6.17373 11.0027 6.34426 10.956 6.49378 10.8676C6.6433 10.7792 6.76633 10.6522 6.85002 10.5M3 4C3 3.20435 3.31607 2.44129 3.87868 1.87868C4.44129 1.31607 5.20435 1 6 1C6.79565 1 7.55871 1.31607 8.12132 1.87868C8.68393 2.44129 9 3.20435 9 4C9 7.5 10.5 8.5 10.5 8.5H1.5C1.5 8.5 3 7.5 3 4Z"
        stroke="#62748E"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Design tokens read off the two nodes ─────────────────────────────────────

/**
 * Status pill. `variant` is the shadcn prop the Figma Badge description maps to
 * its own "Type" property (Default / Secondary / Outline / Destructive); the
 * className carries the literal fill and label colour the node specifies.
 */
const BADGE_TONE = {
  // Figma Type=Destructive. 198352:121453 collapsed; 198355:121806 expanded —
  // the same pill de-emphasises while its row is open. That is a real variant
  // difference between the two nodes, not a stray override.
  ongoing: {
    variant: 'destructive',
    className: String.raw`bg-[var(--colors\/red\/400,#ff6467)] text-[#fafbfc]`,
    openClassName: String.raw`bg-[var(--colors\/red\/100,#ffe2e2)] text-[color:var(--colors\/red\/900,#82181a)]`,
  },
  // Figma Type=Secondary. 198352:121482
  warning: {
    variant: 'secondary',
    className: String.raw`bg-[var(--colors\/orange\/100,#ffedd4)] text-[color:var(--colors\/orange\/600,#f54900)]`,
  },
  // Figma Type=Secondary. 198352:121511
  shutoff: {
    variant: 'secondary',
    className: String.raw`bg-[var(--colors\/indigo\/100,#e0e7ff)] text-[color:var(--colors\/indigo\/600,#4f39f6)]`,
  },
}

/** Avatar bubble tint per event kind. 198352:121445 (water) / 198352:121532 (network). */
const KIND_TONE = {
  water: String.raw`bg-[var(--colors\/red\/100,#ffe2e2)]`,
  network: String.raw`bg-[var(--colors\/blue\/100,#dbeafe)]`,
}

/**
 * Card root — 198352:121582. String.raw, not a plain string: `\/` in a normal
 * JS literal loses its backslash, and `\\/` would be what Tailwind's text
 * scanner reads, so neither spelling survives both sides.
 * The shadow is fully transparent because that is what the Figma effect
 * resolves to; it is kept rather than substituted with the project Card's.
 * w-full / content height replace the frame's w-[740px] h-[380px]: the frame is
 * a fixed desktop viewport into a longer list, and a phone card must size to
 * its content (Phone.jsx does not scroll — the page owns the scroller).
 */
const CARD_ROOT = String.raw`bg-[#fafbfc] border-[length:var(--border-width\/border,1px)] border-solid border-white content-stretch flex flex-col gap-[var(--p-0,0px)] items-start overflow-clip p-[var(--p-0,0px)] relative rounded-[var(--rounded-2xl,18px)] w-full shadow-[var(--shadow\/x,0px)_var(--shadow\/popover\/layer-2\/y,0px)_var(--shadow\/popover\/layer-2\/blur,0px)_var(--shadow\/popover\/layer-2\/spread,0px)_var(--shadow\/popover\/layer-2\/color,rgba(0,0,0,0))]`

const BADGE_BASE = String.raw`flex h-[24px] items-center justify-center overflow-clip shrink-0 border-transparent gap-[var(--component\/badge\/gap,4px)] px-[var(--component\/badge\/px,8px)] py-[var(--component\/badge\/py,2px)] rounded-[var(--component\/badge\/radius,26px)]`
const BADGE_LABEL = String.raw`text-[12px] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/xs\/lh,16px)] overflow-hidden text-ellipsis whitespace-nowrap`

// ── Mock data ────────────────────────────────────────────────────────────────
// Verbatim from the two nodes, including the repeated figures and the repeated
// "Apr 02, 2026 08:13:15" — the comp reuses one row of numbers. `steps` are the
// Expanded variant's sub-timeline (198355:122410); rows 2–4 carry a chevron in
// the design, so they are given steps too rather than shipping dead toggles.
// Row 5 has no chevron and instead carries the "4 sent" notification chip.
const MOCK_METRICS = [
  { label: 'Flow', value: '1180' },
  { label: 'L/h·Volume', value: '8,420' },
  { label: 'Duration', value: '6h 36m' },
]
const MOCK_STEPS = ['Closing 11:42 AM', 'Verifying 11:42 AM', 'Closed 11:43 AM']

const MOCK_EVENTS = [
  {
    id: 'evt-1',
    kind: 'water',
    title: 'High Flow Anomaly',
    badge: { label: 'Ongoing', tone: 'ongoing' },
    metrics: MOCK_METRICS,
    description: 'Leak confirmed — flow sustained above threshold',
    timestamp: 'Apr 02, 2026 08:13:15',
    tag: 'Tag',
    steps: MOCK_STEPS,
  },
  {
    id: 'evt-2',
    kind: 'water',
    title: 'High Flow Anomaly',
    badge: { label: 'Warning', tone: 'warning' },
    metrics: MOCK_METRICS,
    description: 'Leak confirmed — flow sustained above threshold',
    timestamp: 'Apr 02, 2026 08:13:15',
    steps: MOCK_STEPS,
  },
  {
    id: 'evt-3',
    kind: 'water',
    title: 'High Flow Anomaly',
    badge: { label: 'Shut-off', tone: 'shutoff' },
    metrics: MOCK_METRICS,
    description: 'Auto shut-off triggered — valve failed to close',
    timestamp: 'Apr 02, 2026 08:13:15',
    steps: MOCK_STEPS,
  },
  {
    id: 'evt-4',
    kind: 'network',
    title: 'Connectivity Restored',
    description: 'Offline for 2h 15m',
    timestamp: 'Apr 02, 2026 08:13:15',
    steps: MOCK_STEPS,
  },
  {
    id: 'evt-5',
    kind: 'water',
    title: 'High Flow Anomaly',
    badge: { label: 'Warning', tone: 'warning' },
    badgeFirst: true, // 198352:121556 — this row leads with the pill.
    metrics: MOCK_METRICS,
    description: 'Leak confirmed — flow sustained above threshold',
    timestamp: 'Apr 02, 2026 08:13:15',
    notifications: { count: 4 },
  },
]

/** `expanded` accepts an event id, `true` (first expandable row) or false/null. */
function resolveExpanded(value, list) {
  if (value === true) return (list.find(e => e.steps && e.steps.length) ?? list[0])?.id ?? null
  if (!value) return null
  return value
}

function EventRow({ event, eventId, isLast, isOpen, onToggle }) {
  const tone = BADGE_TONE[event.badge?.tone] ?? BADGE_TONE.warning
  const canExpand = Boolean(event.steps && event.steps.length)

  const title = (
    <p
      /* Figma has shrink-0 here; at 375 a long title must be allowed to
         ellipsise rather than shove the pill off the row. */
      className="[word-break:break-word] font-[var(--font\/weight\/font-semibold,600)] leading-[var(--text\/sm\/lh,20px)] min-w-0 text-[color:var(--colors\/slate\/900,#0f172b)] text-[length:var(--text\/sm\/size,14px)] whitespace-nowrap overflow-hidden text-ellipsis"
    >
      {event.title}
    </p>
  )

  const pill = event.badge ? (
    <Badge
      variant={tone.variant}
      className={cn(BADGE_BASE, isOpen && tone.openClassName ? tone.openClassName : tone.className)}
    >
      <span className={BADGE_LABEL}>{event.badge.label}</span>
    </Badge>
  ) : null

  return (
    <li className="content-stretch flex gap-[12px] items-stretch relative w-full">
      {/* Avatar + rail — 198352:121444 */}
      <div className="content-stretch flex flex-col gap-[var(--pro\/space\/1,4px)] items-center relative shrink-0">
        <div
          className={cn(
            'content-stretch flex items-center justify-center relative rounded-[30px] shrink-0 size-[24px]',
            KIND_TONE[event.kind] ?? KIND_TONE.water,
          )}
        >
          {event.kind === 'network' ? (
            <Wifi02 />
          ) : (
            /* stroke-width scaled 21→13 so the 13px draw keeps the design's 1.08063 weight */
            <Waves size={13} className="text-[#FB2C36] [&_path]:[stroke-width:1.746]" />
          )}
        </div>
        {/* Figma draws a rail under the last avatar too; with a content-height
            card that dangles below the final event, so it stops at row n-1. */}
        {!isLast && (
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-auto flex-[1_0_0] min-h-px w-px bg-[#E5E5E5]"
          />
        )}
      </div>

      {/* Text column — 198352:121448 */}
      <div className={cn('content-stretch flex flex-col gap-[7px] items-start relative flex-1 min-w-0', isLast ? '' : 'pb-[24px]')}>
        <div className="content-stretch flex gap-[6px] items-center relative w-full">
          {event.badgeFirst ? (
            <>
              {pill}
              {title}
            </>
          ) : (
            <>
              {title}
              {pill}
            </>
          )}

          {canExpand ? (
            <button
              type="button"
              onClick={() => onToggle(eventId)}
              aria-expanded={isOpen}
              aria-label={isOpen ? `Hide details for ${event.title}` : `Show details for ${event.title}`}
              className={cn(
                'ml-auto content-stretch flex items-center justify-center relative rounded-[6px] shrink-0 size-[24px] cursor-pointer',
                isOpen
                  ? String.raw`bg-[var(--colors\/slate\/200,#e2e8f0)]`
                  : String.raw`bg-[var(--colors\/slate\/100,#f1f5f9)]`,
              )}
            >
              {isOpen ? <ChevronUp12 /> : <ChevronDown12 />}
            </button>
          ) : null}
        </div>

        {event.metrics?.length ? (
          <div className="[word-break:break-word] content-stretch flex flex-wrap font-[var(--font\/weight\/font-normal,400)] gap-x-[13px] gap-y-[6px] items-start relative shrink-0">
            {event.metrics.map(m => (
              <div key={m.label} className="content-stretch flex gap-[5px] items-center relative shrink-0">
                <span className="leading-[var(--text\/xs\/lh-none,12px)] overflow-hidden shrink-0 text-[color:#737373] text-[length:var(--text\/xs\/size,12px)] text-ellipsis whitespace-nowrap">
                  {m.label}
                </span>
                <span className="leading-[var(--text\/xs\/lh-none,12px)] overflow-hidden shrink-0 text-[12px] text-[color:var(--colors\/slate\/900,#0f172b)] text-ellipsis whitespace-nowrap">
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {event.description ? (
          <p className="[word-break:break-word] font-[var(--font\/weight\/font-normal,400)] leading-[var(--font\/line-height\/leading-5,20px)] relative shrink-0 text-[color:var(--colors\/gray\/700,#364153)] text-[length:var(--font\/size\/text-sm,14px)] tracking-[var(--font\/tracking\/tracking-normal,0px)]">
            {event.description}
          </p>
        ) : null}

        {/* Expanded sub-timeline — 198355:122410. Sits 24px below the
            description at the same indent as the text column, which is what
            Figma's pt-[48px] / mb-[-24px] pair resolves to. */}
        {isOpen && canExpand ? (
          <div className="content-stretch flex flex-col items-start pt-[24px] relative shrink-0 text-[length:var(--text\/xs\/size,12px)] text-black font-[var(--font\/weight\/font-normal,400)]">
            {event.steps.map(step => (
              <p key={step} className="leading-[var(--text\/xs\/lh-relaxed,19.5px)] whitespace-nowrap">
                {step}
              </p>
            ))}
          </div>
        ) : null}

        {/* Footer — timestamp (198352:121468) plus the Tag / "n sent" chip the
            design right-aligns beneath it. See the mobile note in the header. */}
        <div className="content-stretch flex gap-[var(--spacing\/0\,5,2px)] items-center justify-between relative w-full">
          <span className="[word-break:break-word] font-[var(--font\/weight\/font-normal,400)] leading-[var(--text\/xs\/lh-none,12px)] overflow-hidden shrink-0 text-[color:#737373] text-[length:var(--text\/xs\/size,12px)] text-ellipsis whitespace-nowrap">
            {event.timestamp}
          </span>

          {event.tag ? (
            /* Deliberately inert: the delivery canvas has no tag-picker node and
               no handler is passed in, and v2-page-parity Rule 0 forbids
               inventing a destination. Rendered as a plain element, not a
               button, so it does not advertise a tap it cannot honour. */
            <Badge
              variant="secondary"
              className={cn(BADGE_BASE, String.raw`bg-[var(--colors\/slate\/100,#f1f5f9)]`)}
              aria-disabled="true"
            >
              <span className={cn(BADGE_LABEL, String.raw`text-[color:var(--colors\/slate\/700,#314158)]`)}>{event.tag}</span>
              <PlusSign12 />
            </Badge>
          ) : null}

          {event.notifications ? (
            /* Same call as the Tag chip: no notification-list node in the
               design, so this states the count and is inert by decision. */
            <div
              className="bg-[var(--colors\/slate\/100,#f1f5f9)] content-stretch flex gap-[6px] h-[16px] items-center justify-center px-[3px] relative rounded-[6px] shrink-0"
              aria-disabled="true"
            >
              <div className="content-stretch flex gap-[3px] items-center relative shrink-0">
                <Bell12 />
                <span className="[word-break:break-word] font-[var(--font\/weight\/font-normal,400)] leading-[var(--text\/xs\/lh-none,12px)] overflow-hidden shrink-0 text-[12px] text-[color:var(--colors\/slate\/900,#0f172b)] text-ellipsis whitespace-nowrap">
                  {event.notifications.count} sent
                </span>
              </div>
              <ChevronDown12 />
            </div>
          ) : null}
        </div>
      </div>
    </li>
  )
}

/**
 * @param events            [{ id, kind:'water'|'network', title, badge:{label,tone},
 *                             badgeFirst, metrics:[{label,value}], description,
 *                             timestamp, tag, notifications:{count}, steps:[] }]
 *                          Pass `[]` to reach the empty state.
 * @param expanded          event id, `true` (first expandable row) or false.
 *                          This is the one prop that switches the card between
 *                          Figma's Default and Expanded variants.
 * @param onToggleExpanded  (nextExpandedId, tappedId) => void. Supplied = the
 *                          card is controlled; omitted = it keeps its own state
 *                          so the chevrons still work standalone.
 * @param className         merged onto the Card root.
 * @param period            label in the header pill. Figma only draws "All".
 * @param onSelectPeriod    optional; without it the pill is inert by decision.
 */
export default function EventsTimelineCard({
  events = MOCK_EVENTS,
  expanded = false,
  onToggleExpanded,
  className,
  period = 'All',
  onSelectPeriod,
}) {
  const [internalExpanded, setInternalExpanded] = useState(() => resolveExpanded(expanded, events))
  const expandedId = onToggleExpanded ? resolveExpanded(expanded, events) : internalExpanded

  const handleToggle = id => {
    const next = expandedId === id ? null : id
    if (onToggleExpanded) onToggleExpanded(next, id)
    else setInternalExpanded(next)
  }

  const periodPill = (
    <span className="content-stretch flex gap-[var(--component\/button\/gap,6px)] h-[36px] items-center justify-center px-[var(--component\/button\/size-default\/px,12px)] py-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-default\/radius,26px)] shrink-0 bg-[var(--colors\/slate\/100,#f1f5f9)] text-[color:#171717]">
      <span className="[word-break:break-word] font-medium leading-[var(--text\/sm-tight\/lh,20px)] shrink-0 text-[length:var(--text\/sm-tight\/size,14px)] whitespace-nowrap">
        {period}
      </span>
      <CaretDown size={16} className="shrink-0" />
    </span>
  )

  return (
    <Card
      className={cn(CARD_ROOT, className)}
    >
      {/* CardHeader — 149:2490 */}
      <CardHeader className="content-stretch flex h-[62px] items-center justify-between px-[var(--spacing\/5,20px)] py-[var(--spacing\/3,12px)] relative shrink-0 w-full gap-[12px]">
        <CardTitle className="[word-break:break-word] flex-1 min-w-0 font-[var(--font\/weight\/font-semibold,600)] leading-[var(--text\/lg\/lh-none,18px)] relative text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/lg\/size,18px)] tracking-[-0.45px]">
          Events Timeline
        </CardTitle>

        <CardAction className="content-stretch flex flex-col items-end justify-center relative shrink-0">
          {onSelectPeriod ? (
            <button
              type="button"
              onClick={() => onSelectPeriod(period)}
              aria-haspopup="listbox"
              aria-label={`Change period, currently ${period}`}
              className="cursor-pointer"
            >
              {periodPill}
            </button>
          ) : (
            /* Deliberately inert. The design ships one state of this pill and
               no menu node; v2-page-parity Rule 0 forbids inventing the list.
               Pass onSelectPeriod to make it live. */
            <span aria-disabled="true">{periodPill}</span>
          )}
        </CardAction>
      </CardHeader>

      {/* cardContent — 101006:7299 */}
      <CardContent className="content-stretch flex flex-col gap-[var(--p-0,0px)] items-start justify-center overflow-clip px-[var(--text\/title\/size,16px)] py-[var(--component\/calendar\/padding,12px)] relative shrink-0 w-full">
        {events.length === 0 ? (
          /* Empty state. The node list has no empty variant, so this is the
             minimum honest statement, set in the card's own muted xs type. */
          <div className="flex flex-col items-center justify-center gap-[4px] py-[32px] relative w-full text-center">
            <p className="font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/sm\/lh,20px)] text-[color:var(--colors\/slate\/900,#0f172b)] text-[length:var(--text\/sm\/size,14px)]">
              No events yet
            </p>
            <p className="leading-[var(--text\/xs\/lh,16px)] text-[color:#737373] text-[length:var(--text\/xs\/size,12px)]">
              Nothing has happened on this system in the selected period.
            </p>
          </div>
        ) : (
          <ul className="content-stretch flex flex-col items-start relative shrink-0 w-full list-none m-0 p-0">
            {events.map((event, i) => {
              const eventId = event.id ?? i
              return (
                <EventRow
                  key={eventId}
                  event={event}
                  eventId={eventId}
                  isLast={i === events.length - 1}
                  isOpen={expandedId === eventId}
                  onToggle={handleToggle}
                />
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
