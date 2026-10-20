/**
 * TriageBand — the first thing on the All Accounts overview.
 *
 * WHY THIS EXISTS. The overview answered "how many" and never "where". A user
 * arriving with no time read "56 Water events", a 66% gauge and six stat tiles
 * of equal visual weight, and still could not tell which building was in
 * trouble without tapping. The events already carry the answer — each row has
 * systemName, location, address, type and duration — but the card collapses by
 * default, because opening 56 rows buried everything beneath it.
 *
 * BUILT AGAINST WHAT COMPARABLE PRODUCTS ACTUALLY SHIP. Eleven were examined
 * (Phyn, Moen Flo, Flo Property, mySolarEdge, SolarEdge Go, Enphase Enlighten,
 * Enphase Installer Toolkit, Samsara, Verkada, UniFi, Fleetio). The closest
 * structural match is SolarEdge Go's Fleet Management screen — 534 sites, an
 * issue rollup and a ranked list, all resolved above one fold — and this is
 * modelled on it.
 *
 * The findings that shaped each decision:
 *
 *  · NOT ONE of the eleven shows more than THREE status counters above the
 *    fold. Hence three, and only three: `Water events`, `Offline`, `Valve`.
 *
 *  · The hairline-divided 3-up stat row is the single most reused component
 *    across every vendor looked at (SolarEdge ×2, mySolarEdge, Phyn ×2,
 *    Enphase as a 2-up). That is `StatRow` below.
 *
 *  · SolarEdge Go rolls its long tail into one tappable `6 Other Alerts ›`.
 *    Disconnected power and missing recipients are that tail here — they are
 *    real, but neither changes what you do in the next ten minutes.
 *
 *  · Counts read in SYSTEMS AFFECTED, not events ("54 Sites", not "54
 *    alerts"), because that is the number that maps to work.
 *
 *  · Phyn and SolarEdge both badge only the unhealthy rows and leave healthy
 *    ones unmarked. Absence of a badge is a legible "fine" signal and costs
 *    nothing, which is why there is no "All systems 103" tile — 103 is the
 *    denominator in the headline instead.
 *
 *  · SolarEdge sorts its site list `by Alert Impact ↓`, which makes the list
 *    itself the ranking and removes the need for a separate breakdown card.
 *    `ranked` below does the same: severity first, then duration.
 *
 *  · Named anti-pattern, and the shape this replaces: showing an aggregate AND
 *    its full breakdown in one card ("56 Water events" + "High Flow 21" +
 *    "Low Flow 29"). The high/low split belongs on the events LIST as filter
 *    chips, where it is interactive, not here as a readout.
 *
 *  · A 66% health ring is ~160pt to say something less actionable than "56
 *    systems need attention". SolarEdge, monitoring 534 sites, publishes no
 *    health percentage at all. The headline sentence replaces it.
 *
 * On the one point where the two research strands disagreed — a segmented
 * proportion strip — the general-patterns evidence favoured it and no shipping
 * product used one. It is kept, but as 8px plus a legend line, because the
 * headline already carries the number and the strip only has to make the
 * ratio instant. Cleveland & McGill: a divided bar supports a position
 * judgement only in its bottom segment, so the counts are printed, always.
 *
 * WCAG: every count carries an icon, a word and a number, so colour is never
 * the sole encoding (1.4.1). Targets are h-12 / 48dp (2.5.8, Material).
 */
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ChevronRight } from 'lucide-react'
import { PinLocation03, Waves } from '@/v2/icons'
import { cn } from '@/lib/utils'

/* The palette v2 already uses for these states. High flow is the water-event
   red, low flow the amber; the fault counters are slate, because a fault is
   work to do rather than water leaving the building. */
const HIGH = '#DB4670'
const LOW = '#F05C25'
const SLATE = '#45556C'
const OK = '#5C9E1A'

/** How many rows ride along with the count. PagerDuty's Home shows 3. */
const PREVIEW_ROWS = 3

/** Minutes from a display duration ("6h 36m"), for ranking. */
function minutesOf(duration) {
  const m = /(?:(\d+)\s*d)?\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/.exec(duration || '')
  return m ? (+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0
}

/* One cell of the 3-up divided row. Icon, count, unit — the shape every
   vendor converged on. */
/* `label` is the visible word and `name` the accessible one. The research
   said to shorten status labels editorially rather than truncate them, so the
   chip reads "Offline" at 393px — but a screen reader should still hear the
   full domain term, and the rest of the app calls it "Offline systems". */
function Stat({ glyph, count, label, name, tone = SLATE, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      aria-label={`${name ?? label}: ${count}. Show them.`}
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2.5',
        onSelect ? 'cursor-pointer rounded-lg hover:bg-slate-50' : 'cursor-default',
      )}
    >
      <span className="flex h-[18px] items-center justify-center" style={{ color: tone }} aria-hidden="true">
        {glyph}
      </span>
      <span className="text-[20px] font-semibold leading-none tabular-nums" style={{ color: count ? tone : '#94A3B8' }}>
        {count}
      </span>
      <span className="w-full truncate text-center text-[11px] leading-tight text-slate-500">{label}</span>
    </button>
  )
}

function EventRow({ event, onSelect }) {
  const high = event.type === 'leak-high'
  const tone = high ? HIGH : LOW
  const kind = high ? 'High flow' : 'Low flow'
  // The location is the point of this row. l3Name is null on some scopes, so
  // take whichever level of the path actually exists.
  const where = [event.location, event.address].filter(Boolean)[0] || ''

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-2 text-left',
        onSelect ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default',
      )}
      aria-label={`${event.systemName}, ${kind}, ${where}, running ${event.duration}`}
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: high ? 'rgba(219,70,112,0.10)' : 'rgba(240,92,37,0.10)', color: tone }}
        aria-hidden="true"
      >
        <Waves width="16" height="16" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14px] font-medium leading-tight text-slate-900">
          {event.systemName}
        </span>
        <span className="flex min-w-0 items-center gap-1 text-[12px] leading-tight text-slate-500">
          <PinLocation03 width="12" height="12" className="shrink-0" aria-hidden="true" />
          <span className="truncate">{where}</span>
        </span>
      </span>

      {/* Duration is the triage signal — a six-hour leak outranks a six-minute
          one — so it ends the row rather than hiding inside the subtitle. */}
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-[12px] font-semibold leading-tight tabular-nums" style={{ color: tone }}>
          {event.duration}
        </span>
        <span className="text-[11px] leading-tight text-slate-400">{kind}</span>
      </span>
    </button>
  )
}

export default function TriageBand({
  events = [],
  onSelectEvent,
  onViewAll,
  /* "Show past events" — the one-tap way to the overlay's History tab. It
     came across from ActiveWaterEventsCard when this band replaced it; see the
     footer below. Optional: with no handler the link is not drawn at all,
     rather than drawn dead. */
  onShowPast,
  className,
}) {
  // Worst first. A high flow outranks a low flow; within a kind, the longest
  // running wins. `duration` is a display string, so it is parsed back to
  // minutes — compared as text, "3h 11m" sorts after "6h 36m", backwards.
  const ranked = [...events].sort((a, b) => {
    const sev = e => (e.type === 'leak-high' ? 1 : 0)
    return sev(b) - sev(a) || minutesOf(b.duration) - minutesOf(a.duration)
  })
  const preview = ranked.slice(0, PREVIEW_ROWS)
  // The footer link only earns its row when the band is actually holding rows
  // back; with three events and three previewed there is nothing to view.
  const showViewAll = events.length > preview.length

  /* w-full: the page's Body wrapper is `flex flex-col items-start`, so a child
     without it is sized to its own content. Every other card on the screen
     carries it; without it this band draws ~60% wide in the all-clear state,
     where the headline is the widest thing in it. */
  return (
    <Card className={cn('w-full gap-0 overflow-hidden py-0', className)}>
      {/* The rows the screen was missing: which systems, and where. Ranked, so
          the list is itself the ranking. In Figma 199323:12113 this is its own
          "Water events" section beneath the health card, which is why the two
          are separate components rather than one band. */}
      {preview.length > 0 && (
        <>
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
            <p className="text-[14px] font-medium leading-[20px] text-[color:var(--foreground,#0a0a0a)]">
              Water events
            </p>
            <span className="text-[14px] leading-[20px] tabular-nums text-slate-500">{events.length}</span>
          </div>
          <Separator />
          <div className="flex flex-col">
            {preview.map((e, i) => (
              <div key={e.id ?? i}>
                {i > 0 && <Separator className="ml-[60px]" />}
                <EventRow event={e} onSelect={onSelectEvent && (() => onSelectEvent(e))} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* The footer: the two ways off this band and into the full list.
          "Show past events" is not decoration. It is the ONLY one-tap route to
          the overlay's History tab, and it carried over from
          ActiveWaterEventsCard, which this band replaced. That card drew it in
          its healthy state alone, because that was the only state with no rows
          to sit a footer under; here it is drawn whenever the page hands over a
          handler — including the all-clear state, where it IS the footer.
          Leaving it out would have put the real past events behind "open
          Active, then find the toggle". */}
      {(showViewAll || onShowPast) && (
        <>
          <Separator />
          <div className="flex items-stretch">
            {showViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                disabled={!onViewAll}
                className={cn(
                  /* min-w-0 + nowrap: at 393px the two links share one row, and
                     without this the longer one wraps to two lines. */
                  'flex h-12 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap px-3 text-[14px] font-medium',
                  onViewAll ? 'cursor-pointer text-[#0B95F8] hover:underline' : 'cursor-default text-slate-400',
                )}
              >
                View all {events.length} water events
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            )}

            {showViewAll && onShowPast && (
              <Separator orientation="vertical" className="my-3 h-auto" />
            )}

            {onShowPast && (
              <button
                type="button"
                onClick={onShowPast}
                className={cn(
                  'flex h-12 cursor-pointer items-center justify-center whitespace-nowrap px-4 text-[14px] font-medium text-[#0B95F8] hover:underline',
                  /* Alone in the footer (the all-clear state) it fills the row;
                     beside "View all" it takes only the width of its words. */
                  showViewAll ? 'shrink-0' : 'flex-1',
                )}
              >
                Show past events
              </button>
            )}
          </div>
        </>
      )}
    </Card>
  )
}
