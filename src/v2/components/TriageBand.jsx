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
import { ChevronRight, PowerOff } from 'lucide-react'
import { PinLocation03, Waves, WifiDisconnected02 } from '@/v2/icons'
import { ValveErrorGlyph } from '@/v2/components/SystemsHealthCard'
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
  total = 0,
  attention = 0,
  issues = {},
  events = [],
  onSelectIssue,
  onSelectEvent,
  onViewAll,
  className,
}) {
  const healthy = Math.max(0, total - attention)
  const pct = total ? (attention / total) * 100 : 0
  const { offline = 0, valve = 0, power = 0, recipients = 0 } = issues

  // The long tail: real, but neither changes what you do in the next ten
  // minutes. SolarEdge's "6 Other Alerts ›" move.
  const otherCount = power + recipients

  // Worst first. A high flow outranks a low flow; within a kind, the longest
  // running wins. `duration` is a display string, so it is parsed back to
  // minutes — compared as text, "3h 11m" sorts after "6h 36m", backwards.
  const ranked = [...events].sort((a, b) => {
    const sev = e => (e.type === 'leak-high' ? 1 : 0)
    return sev(b) - sev(a) || minutesOf(b.duration) - minutesOf(a.duration)
  })
  const preview = ranked.slice(0, PREVIEW_ROWS)
  const allClear = attention === 0 && events.length === 0

  return (
    <Card className={cn('gap-0 overflow-hidden py-0', className)}>
      {/* The sentence that answers the screen. "All systems" is the
          denominator here rather than a tile of its own. */}
      <div className="flex flex-col gap-2 px-4 pt-3.5 pb-2.5">
        <p className="text-[18px] font-semibold leading-tight tracking-[-0.45px] text-slate-900">
          {allClear ? (
            <>All <span className="tabular-nums">{total}</span> systems are healthy</>
          ) : (
            <>
              <span className="tabular-nums" style={{ color: HIGH }}>{attention}</span>
              {' of '}
              <span className="tabular-nums">{total}</span>
              {' systems need attention'}
            </>
          )}
        </p>

        <div
          className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100"
          role="img"
          aria-label={`${attention} of ${total} systems need attention, ${healthy} healthy`}
        >
          <span className="h-full" style={{ width: `${pct}%`, background: HIGH }} />
          <span className="h-full flex-1" style={{ background: OK }} />
        </div>

        {/* The legend exists to split the bar. With nothing wrong there is
            nothing to split, and reciting "0 need attention" under an
            all-clear headline is noise that makes the good state read like a
            bad one. */}
        {!allClear && (
          <p className="flex items-center gap-3 text-[12px] leading-none text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: OK }} aria-hidden="true" />
              <span className="tabular-nums font-medium text-slate-700">{healthy}</span> healthy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: HIGH }} aria-hidden="true" />
              <span className="tabular-nums font-medium text-slate-700">{attention}</span> need attention
            </span>
          </p>
        )}
      </div>

      <Separator />

      {/* The three that change what you do today: water leaving the building,
          systems you are blind to, and systems you cannot shut off. */}
      <div className="flex items-stretch px-2">
        <Stat
          glyph={<Waves width="18" height="18" />}
          count={events.length}
          label="Water events"
          name="Water events"
          tone={HIGH}
          onSelect={onViewAll}
        />
        <Separator orientation="vertical" className="my-3 h-auto" />
        <Stat
          glyph={<WifiDisconnected02 width="18" height="14.7" />}
          count={offline}
          label="Offline"
          name="Offline systems"
          onSelect={onSelectIssue && (() => onSelectIssue('offline'))}
        />
        <Separator orientation="vertical" className="my-3 h-auto" />
        <Stat
          glyph={<ValveErrorGlyph />}
          count={valve}
          label="Valve errors"
          name="Valve errors"
          onSelect={onSelectIssue && (() => onSelectIssue('valve'))}
        />
      </div>

      {/* The tail, rolled up rather than given four more tiles. */}
      {otherCount > 0 && (
        <>
          <Separator />
          <button
            type="button"
            onClick={onSelectIssue && (() => onSelectIssue('power'))}
            disabled={!onSelectIssue}
            className={cn(
              'flex h-11 w-full items-center gap-2 px-4 text-left text-[13px] text-slate-500',
              onSelectIssue ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default',
            )}
          >
            <PowerOff size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
            <span className="flex-1">
              <span className="tabular-nums font-medium text-slate-700">{otherCount}</span>
              {' other issues'}
              <span className="text-slate-400">
                {` · ${power} no power, ${recipients} no recipients`}
              </span>
            </span>
            <ChevronRight size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
          </button>
        </>
      )}

      {/* The rows the screen was missing: which systems, and where. Ranked, so
          the list is itself the ranking. */}
      {preview.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col">
            {preview.map((e, i) => (
              <div key={e.id ?? i}>
                {i > 0 && <Separator className="ml-[60px]" />}
                <EventRow event={e} onSelect={onSelectEvent && (() => onSelectEvent(e))} />
              </div>
            ))}
          </div>

          {events.length > preview.length && (
            <>
              <Separator />
              <button
                type="button"
                onClick={onViewAll}
                disabled={!onViewAll}
                className={cn(
                  'flex h-12 w-full items-center justify-center gap-1 text-[14px] font-medium',
                  onViewAll ? 'cursor-pointer text-[#0B95F8] hover:underline' : 'cursor-default text-slate-400',
                )}
              >
                View all {events.length} water events
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </>
          )}
        </>
      )}
    </Card>
  )
}
