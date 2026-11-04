/**
 * THE CONCLUDED-EVENT RESOLVER — EventFocusOverlay's third branch, and the
 * gate the Events Timeline's row drill-down asks before it draws a chevron.
 *
 * ITS OWN FILE, 2026-11-02, for the reason ignoreGate.js states: this wants to
 * live in EventFocusOverlay (it is that component's third branch, and nothing
 * else rendered it) but the Events Timeline's new row drill-down has to ASK the
 * question before it draws a chevron — a row must not advertise a tap the
 * overlay cannot honour — and eslint's react-refresh/only-export-components is
 * an ERROR in this config, so a component file may not also export a plain
 * function. Moved verbatim out of EventFocusOverlay.jsx; the overlay imports it
 * back and resolves exactly what it resolved before.
 */
import { getIncidentsForSystem } from '@/data/incidents'
import { HISTORY_EVENTS } from '@/data/events'
import { getSimulatedAlert } from '@/data/simulatedAlerts'

/* ── WHERE A CONCLUDED EVENT'S DATA LIVES — 2026-11-02 ────────────────────
   An ended water event has NO `system.alert`: applyPushEvent writes
   `{ phase:'ended', resolved:true }` (pushEvents.js:132-144) and
   applySimOverlay then TOMBSTONES it to null (systems.js:191-194). The record
   itself is not destroyed — only the overlay that projects it onto the system
   is. So the data is still there to read, in two places, and which one is
   authoritative is already decided for us by the "pusher owns truth" rule
   (incidents.js:14-21, hasSimActivity): once the pusher has touched a system
   the static fixtures are suppressed, and before that they are all there is.
   This helper reads them in that same order, so a concluded event can never
   show the pusher's event and the fixture's event at the same time.

     1. THE TOMBSTONED SIM ALERT (simulatedAlerts.js). The End-of-Leak push's
        own record, with the event's type, label, flow rate, volume and the
        clock it was raised at. It is what the live branch was reading one
        push earlier, so the concluded card is built from the same fields the
        live card was — nothing is re-derived and nothing can disagree.
        It carries no `steps`; the lifecycle is in the append-only
        simulatedEvents log instead, which is what `simEventsToTimelineEvents`
        below reads.

     2. THE STATIC CLOSED INCIDENT. generateIncidents.js builds one resolved
        incident for EVERY system (its header says so), and generateEvents.js
        builds the matching HISTORY_EVENTS row off the same `resolvedVariant`
        seed — same title, severity, flow, volume and duration. The incident
        carries the STEPS (detected / alert-sent / continues / resolved), the
        history row carries the FIGURES and the display Event ID, and because
        both come from one seed they describe one event. This is also the row
        the /events/system/:systemId history screen lists, so the reader who
        taps a past event there has somewhere to land.

   WHY NOT the timeline rows alone (getEventsForSystem): they are already the
   HISTORY_EVENTS row, flattened to title/detail/timestamp with the metadata
   dropped — so they carry less of the same thing. The row is read directly.

   Returns null when there is genuinely nothing — which is the honest answer
   for a system the demo has been Cleared on (isMockSuppressed suppresses the
   fixtures through hasSimActivity, and there is no sim record left either).
   The overlay then renders nothing, exactly as it did before this existed. */
export function concludedEventFor(systemId) {
  if (!systemId) return null

  const sim = getSimulatedAlert(systemId)
  if (sim && sim.resolved && (sim.type === 'leak-high' || sim.type === 'leak-low')) {
    return {
      /* The same field names `alertRowFor` already reads off a live alert, so
         the concluded card goes through the untouched helper. */
      alert: {
        type: sim.type,
        label: sim.label,
        flowRate: sim.flowRate,
        volume: sim.volume,
        startedAt: sim.startedAt,
        /* THE INSTANT, carried through from the push that opened this event
           (pushEvents.js writes `startedAtIso` on every phase of it). It used
           to be absent here and `detectedInstant` recovered a day from the
           bare clock; that recovery was deleted on 2026-11-04 along with the
           rest of the day-guessing, so an instant that is not carried is an
           instant the card cannot draw. A sim record written before that field
           existed has none, and the Detected line is then left empty rather
           than filled with a plausible guess. */
        startedAtIso: sim.startedAtIso ?? null,
        /* STILL MARKED AS A CONCLUDED EVENT'S. `age` here is how long the
           event RAN, not how long ago it started, so nothing may treat it as
           elapsed-since-detection. Nothing does any more — the flag is kept
           because `eventAlertRow` and its callers still branch on it. */
        resolved: true,
        /* The push's own duration, which pushEvents.js records on the ended
           record. Absent on a record written before that did, in which case
           the card's Duration row is left empty rather than filled with a
           figure nothing measured. */
        age: sim.age,
      },
      incident: null,
      /* No incident, so `toLeakId` has nothing to hash — which is already the
         case on the LIVE branch of a pushed event (getActiveIncident returns
         null under sim activity). AlertCard drops the chip rather than drawing
         an empty one, and no id is invented to fill it. */
      eventId: null,
      durationMin: null,
    }
  }

  const incident = getIncidentsForSystem(systemId).find(inc => inc.status === 'resolved')
  if (!incident) return null
  const row = HISTORY_EVENTS.find(e => e.system === systemId)
  if (!row) return null
  return {
    alert: {
      type: row.type,
      label: row.title,
      /* generateEvents.js:147-152 — the row's own metadata, spelled exactly as
         it stores it. `alertRowFor` strips each to digits the same way it does
         for a live alert, so "120 L/h" tiles as "120 L/H". */
      flowRate: row.metadata?.['Flow Rate'],
      volume: row.metadata?.['Volume Lost'],
      startedAt: incident.startedAt,
      /* THE ABSOLUTE INSTANT, so the card's Detected line can print a DATE and
         not just a clock. `incident.startedAt` is a bare "HH:MM"
         and a resolved event may be days old, so there is nothing in it to
         recover a day from — and since 2026-11-04 nothing tries to. Both the
         incident and the history row it is paired with now carry the moment in
         full, from the same `resolvedVariant` off the same `BUILD_NOW`, so
         they are the same instant; the incident's own field is preferred and
         the row is the fallback. Handed over, never re-derived. */
      startedAtIso: incident.startedAtIso ?? row.timestamp ?? null,
      resolved: true,
      /* `age` is the field a live alert carries its elapsed span in and the
         one `alertRowFor` reads for the Duration row. A finished event knows
         its real span, so it goes in the same slot. */
      age: row.metadata?.Duration,
    },
    incident,
    eventId: row.eventId ?? null,
    durationMin: row.durationSec ? Math.round(row.durationSec / 60) : null,
  }
}

/**
 * CAN `focus="ended"` RESOLVE ANYTHING FOR THIS SYSTEM? — added 2026-11-02 for
 * the Events Timeline's row drill-down.
 *
 * The overlay renders null when it has no event, which for a deep link is the
 * honest answer but for a ROW is a chevron that visibly does nothing. The
 * timeline's ended water row exists because `getEventsForSystem` read
 * HISTORY_EVENTS, which is a static table; whether the OVERLAY can show that
 * event depends on `getIncidentsForSystem`, which returns [] under sim
 * activity (incidents.js:25). So the two can disagree, and the row must not
 * advertise a tap this component cannot honour.
 *
 * A PREDICATE, so a caller can ask the question without acquiring the event and
 * starting to render its own version of the overlay's content. It calls the
 * SAME function the overlay resolves with — not a copy of its conditions —
 * which is the only way the gate cannot go stale.
 */
export function hasConcludedEvent(systemId) {
  return Boolean(concludedEventFor(systemId))
}

