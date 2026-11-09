/**
 * THE EVENT ALERT ROW — one mapping from `system.alert` to the object
 * <AlertCard> draws, for every surface that draws one.
 *
 * ── WHY THIS FILE EXISTS: TWO COPIES DRIFTED ─────────────────────────────
 * It existed twice. `SystemPageV2Screen.jsx`'s private `alertCardsFor` and
 * `EventFocusOverlay.jsx`'s private `alertRowFor` were a DELIBERATE
 * field-for-field copy — the overlay's header said so in as many words ("a
 * deliberate copy of SystemPageV2Screen's private `alertCardsFor` … the two
 * must later share one helper") — and they drifted anyway, which is what a
 * deliberate copy always does:
 *
 *   · the overlay learned to DATE the Detected line (2026-11-03, "Date is
 *     missing on the event card"); the page's copy did not and still read a
 *     raw `startedAtStamp`, so the SAME EVENT printed two different detection
 *     strings depending on which screen you opened it from;
 *   · the overlay dropped the `value: rate ?? alert.volume` fallback
 *     (2026-11-02, "[r]ate is missing here" — litres captioned as
 *     litres-per-hour); the page's copy kept it;
 *   · the overlay gained the frame's short title, the volume tile and the
 *     Event ID; the page's copy gained a water-event filter.
 *
 * DO NOT COPY THIS FUNCTION. Every genuine per-surface difference above is an
 * OPTION on `eventAlertRow`, named and defaulted below. A new surface passes
 * options; it does not fork the body. The whole point of the file is that
 * there is one place to change and therefore nowhere to forget.
 *
 * ── A COMPONENT FILE MAY NOT EXPORT THIS ─────────────────────────────────
 * Its own module rather than either component, for the reason
 * `concludedEvent.js` and `eventFlowSeries.js` give: eslint's
 * `react-refresh/only-export-components` is an ERROR in this config, so a
 * component file may only export its component.
 *
 * ── ONE RECORD UNDERNEATH -- 2026-11-04 ──────────────────────────────────
 * `detectedInstant` used to arbitrate between three spellings of "when was
 * this detected" (an ISO instant, a long stamp, and a bare clock whose day had
 * to be recovered from `age`). There is now one: `buildEventRecord` writes
 * `detectedAtIso` and every other time field on the alert is formatted from
 * it. The arbitration is gone; the function stayed, because it is still the
 * single place a surface asks the question.
 *
 * ── WHAT IS SHARED AND WHAT IS NOT ───────────────────────────────────────
 * The INSTANT is shared — `detectedInstant` is the single answer to "when was
 * this event detected", and both surfaces now derive their Detected line from
 * it. The FORMAT is not: the System page draws the long stamp the Figma frame
 * draws and the event hero draws the card format the project's binding format
 * standard specifies, the two disagree, and that disagreement is FLAGGED TO
 * THE OWNER AND UNRESOLVED. Picking one here would have settled a question
 * that is not this module's to settle, so `detectedFormat` is a per-call-site
 * choice and the disagreement stays visible instead of being laundered into a
 * shared default.
 */
import { getActiveIncident, getLeakState } from '@/data/incidents'
import { isIgnored } from '@/data/ignoredIncidents'
import { formatDate, formatDuration } from '@/utils/format'

/** The two water-event types. The only types that carry water figures. */
export function isLeakType(type) {
  return type === 'leak-high' || type === 'leak-low'
}

/**
 * The absolute moment an event was detected.
 *
 * THE ONE INSTANT. Both surfaces call this; neither reads a date field off the
 * alert directly. `SystemPageV2Screen` used to read
 * `alert.startedAtStamp ?? alert.startedAt` -- a raw field read that produced
 * a different string from this function's answer for the same event, and that
 * divergence is half of why this module exists.
 *
 * ── IT USED TO HAVE WORK TO DO. IT NO LONGER DOES -- 2026-11-04 ───────────
 * The dataset stored the detection time three different ways and only one was
 * absolute, so this function had to pick between them and, for the bare
 * "HH:MM" case, RECOVER a day by walking `age` back from now. Worse, when it
 * did have an absolute stamp it still took the CLOCK from `startedAt` and only
 * the DATE from the stamp -- because those were two different `Date.now()`
 * writes and could land either side of a minute, so a card reading 08:14
 * beside a chart starting at 08:13 was a real possibility.
 *
 * Both problems were the same problem. `buildEventRecord` now writes ONE
 * instant, `startedAtIso`, and derives the bare clock and the long stamp FROM
 * it -- so the clock override is a no-op by construction and is gone, and
 * `resolveEventClock` (deleted from format.js) has nothing left to recover.
 *
 * WHAT IS STILL HERE AND WHY: `startedAtStamp` remains a fallback because a
 * record written by an older code path may carry it and no ISO, and a
 * CONCLUDED event out of HISTORY_EVENTS supplies `startedAtIso` from its own
 * row (concludedEvent.js). Returning null rather than guessing is deliberate:
 * a caller with no instant should draw no date, not a plausible one.
 *
 * @param {object|null} alert
 * @returns {Date|null}
 */
export function detectedInstant(alert) {
  const absolute = alert?.startedAtIso ?? alert?.startedAtStamp
  if (!absolute) return null
  const d = new Date(absolute)
  return isNaN(d.getTime()) ? null : d
}

/**
 * THE ONE PLACE "127 L/hour" AND "1,285L" ARE PARSED.
 *
 * Both are PRE-FORMATTED STRINGS in the dataset (buildTree.js:123-124 writes
 * `${flowRate} L/hour` and `${volume.toLocaleString()}L`), and the card tiles
 * the figure and its unit in separate runs at different sizes — so the unit
 * has to come off. It used to come off in two files. It comes off here.
 *
 * Digits, commas and dots survive; everything else goes. The thousands comma
 * is KEPT because the card draws "13,564", not "13564".
 */
function figureOf(raw) {
  return raw ? String(raw).replace(/[^\d,.]/g, '') : null
}

/* ── THE DURATION A LIVE PUSHED EVENT NEVER CARRIED — 2026-11-09 ────────────
   Owner, on his own System page card: the duration chip was missing. It was
   missing from the RECORD, not filtered out by the card.

   WHY. `age` is written on exactly one push branch. simulatedAlerts.js states
   the shape itself — "age: string (how long it ran; written on the ENDED
   record from the End-of-Leak push's own `duration` param)" — and
   pushEvents.js:120-139 bears it out: the `Warning` branch stores type, phase,
   label, flowRate, volume, startedAt and startedAtIso, and NO `age`. So every
   pushed event that is still running has none, and `duration: alert.age` was
   simply `undefined`. Generated events are unaffected: buildTree gives all 13
   of them an `age`, which is why ws-10024 measured two chips and the owner's
   card measured one.

   THE FIX IS NOT A FALLBACK STRING, IT IS THE SAME FACT COMPUTED. A live
   event's elapsed time is `now - startedAtIso`, and `detectedInstant` already
   recovers that instant for the Detected line two fields down. An ended record
   uses `endedAtIso` instead, so a concluded event reads how long it RAN rather
   than how long ago it started. `formatDuration` is the project's own
   `Xd Xh Xm` (utils/format.js:214), so the spelling matches `age`'s exactly
   and no new format enters the app.

   `now` IS AN ARGUMENT, NOT A `Date.now()` BURIED IN RENDER. This builder runs
   during render on both surfaces, and this repo's rule is that a component
   does not read the clock while rendering (react-hooks/purity; EventFocusOverlay
   keeps its own `now` in state for exactly this). The default evaluates at
   call time for callers that have no clock of their own, and a caller that
   does — the event overlay, which already ticks one every 30s — passes it and
   gets a value that only changes when it means to.

   NO ANCHOR, NO DURATION. A record with neither `age` nor a start instant
   returns undefined and the chip is not drawn, which is the honest answer and
   the one the card already handles. It never returns formatDuration(null),
   which would print an em-dash. */
function elapsedOf(alert, now) {
  const start = detectedInstant(alert)
  if (!start) return undefined
  const endRaw = alert?.endedAtIso ?? alert?.resolvedAtIso
  const end = endRaw ? new Date(endRaw) : new Date(now)
  if (isNaN(end.getTime())) return undefined
  const seconds = Math.round((end.getTime() - start.getTime()) / 1000)
  return seconds > 0 ? formatDuration(seconds) : undefined
}

/**
 * Build the row object <AlertCard> renders, from a live or concluded alert.
 *
 * ONE BUILDER, TWO SURFACES. Every difference between what the System page's
 * alert carousel draws and what the event hero draws is an option here.
 *
 * @param {object|null} alert     a `system.alert`-shaped record (live), or the
 *                                `alert` of `concludedEventFor`.
 * @param {string} systemId       for the lifecycle status and the ignore flag.
 * @param {object} [opts]
 * @param {'full'|'short'} [opts.titleForm='full']
 *        `full` is `alert.label` — "High Flow Water Event", the canonical UI
 *        label, and what the System page's card draws.
 *        `short` is "High flow event" / "Low flow event". The EVENT HERO's
 *        frame (199683:24875) is a ONE-LINE 170px title box; the canonical
 *        label wraps to two lines there and pushes the card 25px taller, so
 *        that surface draws the frame's own shorter form. `alert.label` is
 *        untouched everywhere else and is still carried as `fullTitle`.
 * @param {string} [opts.detectedFormat='alert']
 *        A `formatDate` context, applied to `detectedInstant(alert)`.
 *        `alert` -> "Nov 3 · 22:14", the CARD format
 *        (wint-format-standards.md, "Alerts/cards": no year, middle dot,
 *        24-hour, named month).
 *        `tooltip` -> "Nov 3, 2026 22:14:00", the long form Figma node
 *        199772:145451 draws on this line.
 *        *** THE TWO SURFACES DISAGREE AND THE OWNER HAS NOT RULED. *** The
 *        standard says a card uses the card format; the frame draws the long
 *        one and predates the standard. Flagged, not silently resolved — see
 *        the module header. Whoever rules, the fix is one argument at each
 *        call site and the INSTANT underneath is already identical.
 * @param {boolean} [opts.valueFallsBackToVolume=false]
 *        When there is no flow rate, put the event's VOLUME in the first tile.
 *        The System page's copy did this; the event hero's copy stopped on
 *        2026-11-02 after the owner flagged a fault card whose "Flow Rate"
 *        caption sat over a figure in litres — a caption that misnames its own
 *        figure is worse than no tile. Preserved as an option rather than
 *        flattened in either direction, because flipping the page's behaviour
 *        is a product decision and this change is not one.
 *        REACHABILITY, since it reads unreachable and is not: `buildAlert`
 *        fabricates `flowRate` in its leak branch every time, so no generated
 *        leak lands here without one — but a PUSHED Warning leak writes
 *        `flowRate: p.flowRate` straight through (pushEvents.js:127) and the
 *        catalog payload may carry none.
 * @returns {object|null} null when there is no alert at all.
 */
export function eventAlertRow(alert, systemId, opts = {}) {
  if (!alert) return null
  const {
    titleForm = 'full',
    detectedFormat = 'alert',
    valueFallsBackToVolume = false,
    /* The clock, for the elapsed figure a live pushed event has to have
       computed — see elapsedOf. Defaulted here rather than read inside the
       expression so a caller holding its own tick can pass it and keep the
       value stable between renders. */
    now = Date.now(),
  } = opts

  const leak = isLeakType(alert.type)
  const rate = leak ? figureOf(alert.flowRate) : null
  const volume = leak ? figureOf(alert.volume) : null

  return {
    page: 1,
    pageCount: 1,
    title:
      leak && titleForm === 'short'
        ? `${alert.type === 'leak-high' ? 'High' : 'Low'} flow event`
        : alert.label,
    /* The canonical label, always, whichever form `title` took. The hero's
       dialog needs it for its accessible name even when the card draws the
       short one. */
    fullTitle: alert.label,
    /* Was hardcoded 'Ongoing'. The Warning/Ongoing/ShutOff lifecycle is what
       PRD 04a:63 and 06:88 gate the action row on, so a literal here makes
       that gating impossible to honour. getLeakState reads the incident's own
       steps; non-leak faults have no lifecycle and keep the plain label. */
    status: leak ? (getLeakState(getActiveIncident(systemId)) ?? 'Ongoing') : 'Ongoing',
    ignored: isIgnored(systemId),
    /* Water event or not. Ignore and "On it" are water-event actions; the
       fault branch gets the summary only. */
    leak,
    /* THE FIRST TILE IS A FLOW RATE OR IT IS NOTHING — see
       `valueFallsBackToVolume`. The empty-string spelling is kept rather than
       null because it is also what gates the tile in AlertCard. */
    /* The volume goes in RAW ("1,285L"), exactly as the page's copy passed
       it — this slot is a fallback nobody designed a unit run for. */
    value: rate ?? (valueFallsBackToVolume ? alert.volume ?? '' : ''),
    /* Just the unit. The tile below it is captioned "Flow Rate", so
       "L/H flow rate" said it twice and overflowed the 161px tile. */
    unit: rate ? 'L/H' : '',
    /* THE SECOND TILE — 199703:42976, "13,564 L / Total". Read only by
       AlertCard's `overlay` / `ignored-overlay` variants, so it is inert on
       the System page's `mobile` card rather than conditional here: a field
       nobody reads costs nothing, and an option nobody needs is one more way
       for the two surfaces to come apart again. Null when the event carries
       no volume, which hides the tile rather than drawing a zero. */
    total: volume,
    totalUnit: volume ? 'L' : '',
    detectedLabel: 'Detected',
    /* THE DATE WAS MISSING — 2026-11-03. Owner, on the hero card: "Date is
       missing on the event card. On the event flow." `alert.startedAt` is a
       BARE WALL CLOCK and an event can run ten hours; `detectedInstant`
       recovers the day it belongs to. See `detectedFormat` for the shape, and
       the module header for why the shape is the caller's call. */
    detectedAt: formatDate(detectedInstant(alert), detectedFormat),
    /* `age` when the record has one (every generated event does); otherwise
       computed from the event's own instants — see elapsedOf for why this is
       the same fact rather than a fallback, and for the pushed-Warning record
       that has no `age` at all. */
    duration: alert.age ?? elapsedOf(alert, now),
  }
}
