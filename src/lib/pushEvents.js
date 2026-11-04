// Single source of truth for what each push event does to the data layer.
//
// Architecture (post-refactor):
//   - ControlPanel.fireCard()    → buildPushPayload() → publishPush()
//   - publishPush()              → applyPushEvent() locally, then broadcast
//                                  via BroadcastChannel + ntfy.sh
//   - Receivers (PushNotifications.jsx) → applyPushEvent() on incoming events
//
// applyPushEvent() is the ONLY function that mutates localStorage on a push.
// It does TWO things:
//   1. Updates simulatedAlerts (ACTIVE state per system - drives /alerts list,
//      Water Event widget, drawer health labels). Active push -> set alert;
//      closure push -> clear alert.
//   2. Appends to simulatedEvents (APPEND-ONLY events log per system - drives
//      the Activity timeline). EVERY push - active or closure - appends one
//      row so the full history is visible.
//
// Whether the event came from the sender's own tab, another tab in the same
// browser, or a paired phone via ntfy.sh, the same code path runs.

import {
  setSimulatedAlert,
  clearSimulatedAlert,
  getSimulatedAlert,
} from '../data/simulatedAlerts';
import { appendSimulatedEvent, clearSimulatedEventsForSystem } from '../data/simulatedEvents';
import { setMockSuppressed } from '../data/systems';
import { clearIgnored } from '../data/ignoredIncidents';
import { stopInvestigating } from '../data/investigatingStore';

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Build a timeline row from a push payload ───────────────────────────────
// Maps every payload shape to a typed timeline row. Each push type maps to a
// distinct row type so classify() (in src/utils/classifyEvent.js) renders the
// correct title + icon. NEVER reuse a type across push categories - title
// rewriting collisions are the bug class Rami kept hitting.
function buildEventRow(p, ts) {
  const v = p.v10_9_id || '';
  const detail = (() => {
    const parts = [];
    if (p.flowRate) parts.push(`Flow rate ${p.flowRate}.`);
    if (p.volume)   parts.push(`Volume ${p.volume}.`);
    if (p.duration) parts.push(`Duration ${p.duration}.`);
    return parts.join(' ');
  })();

  // ─── Water event lifecycle ────────────────────────────────────────────
  if (p.type === 'leak') {
    const isLow = p.severity === 'Low Flow';
    if (p.state === 'Warning') return {
      type: isLow ? 'leak-detected-low' : 'leak-detected-high',
      title: isLow ? 'Low-flow Water Event detected' : 'High-flow Water Event detected',
      timestamp: ts, variantId: v, detail,
    };
    if (p.state === 'Ongoing') return {
      type: 'leak-ongoing', title: 'Ongoing reminder fired',
      timestamp: ts, variantId: v, detail,
    };
    if (p.state === 'Shutoff') {
      if (v === 'VC_S_02') return {
        type: 'valve-closing-we', title: 'Valve started closing',
        timestamp: ts, variantId: v, detail: 'Auto-shutoff in progress.',
      };
      if (v === 'VC_OK_02') return {
        type: 'valve-closed-we', title: 'Valve closed successfully',
        timestamp: ts, variantId: v, detail: 'Water flow stopped.',
      };
      return {
        type: 'leak-shutoff', title: 'Shutoff level reached',
        timestamp: ts, variantId: v, detail,
      };
    }
    if (p.state === 'End of Leak') return {
      type: 'leak-resolved-we', title: 'Water Event ended',
      timestamp: ts, variantId: v, detail,
    };
  }

  // ─── Valve ───────────────────────────────────────────────────────────
  if (p.type === 'valve-error')         return { type: 'valve-error',         title: 'Valve error detected',     timestamp: ts, variantId: v, detail };
  if (p.type === 'valve-error-cleared') return { type: 'valve-resolved',      title: 'Valve malfunction resolved', timestamp: ts, variantId: v, detail };
  if (p.type === 'valve-closed-by-user') return { type: 'valve-closed-by-user', title: 'Valve closed by user',     timestamp: ts, variantId: v, detail };
  if (p.type === 'valve-disconnected')  return { type: 'valve-disconnected',  title: 'Valve disconnected',       timestamp: ts, variantId: v, detail };
  if (p.type === 'valve-reconnected')   return { type: 'valve-reconnected',   title: 'Valve reconnected',        timestamp: ts, variantId: v, detail };

  // ─── Power ──────────────────────────────────────────────────────────
  if (p.type === 'power-lost')     return { type: 'power-lost',     title: 'External power disconnected', timestamp: ts, variantId: v, detail };
  if (p.type === 'power-restored') return { type: 'power-restored', title: 'External power reconnected',  timestamp: ts, variantId: v, detail };

  // ─── Communication ──────────────────────────────────────────────────
  if (p.type === 'offline') return { type: 'device-offline', title: 'System offline',                timestamp: ts, variantId: v, detail };
  if (p.type === 'online')  return { type: 'device-online',  title: 'System communication resumed',  timestamp: ts, variantId: v, detail };

  // ─── Sensors ────────────────────────────────────────────────────────
  if (p.type === 'meter-disconnected') return { type: 'meter-disconnected', title: 'Meter disconnected', timestamp: ts, variantId: v, detail };
  if (p.type === 'meter-reconnected')  return { type: 'meter-reconnected',  title: 'Meter reconnected',  timestamp: ts, variantId: v, detail };

  return null;
}

// ─── Update the active sim alert ─────────────────────────────────────────
// Sets / updates / clears the ACTIVE alert. The events log update happens
// independently in applyPushEvent.
// Returns true if it recognized the payload type, false otherwise.
function updateActiveAlert(p, ts) {
  const existing = getSimulatedAlert(p.systemId);

  // ─── Water event lifecycle ────────────────────────────────────────────
  if (p.type === 'leak') {
    const isLow = p.severity === 'Low Flow';
    const newType = isLow ? 'leak-low' : 'leak-high';
    // Canonical UI label per CLAUDE.md - "High Flow Water Event" / "Low Flow
    // Water Event". Used by NavigationDrawer sub-line + anywhere else that
    // reads sys.alert.label.
    const label = isLow ? 'Low Flow Water Event' : 'High Flow Water Event';

    if (p.state === 'Warning') {
      clearIgnored(p.systemId);
      stopInvestigating(p.systemId);
      setSimulatedAlert(p.systemId, {
        type: newType, phase: 'warning',
        label,
        flowRate: p.flowRate, volume: p.volume,
        startedAt: ts,
        /* THE SAME ISO DISCIPLINE AS THE GENERATED RECORD -- 2026-11-04.
           A pushed event is created at INTERACTION time, so it cannot be built
           at module scope off BUILD_NOW and it will always have its own
           anchor; that is correct and is not what was being unified. What it
           CAN do is carry an absolute instant rather than a bare "HH:MM", so
           every surface dates it the same way it dates a generated one and
           nothing has to recover a day from a clock. `ts` is this push's wall
           clock; `startedAtIso` is the same moment, in full. */
        startedAtIso: new Date().toISOString(),
      });
      return true;
    }
    if (p.state === 'End of Leak') {
      const flowRate = p.flowRate || existing?.flowRate || '0 L/min';
      const volume   = p.volume   || existing?.volume   || '? L';
      setSimulatedAlert(p.systemId, {
        type: existing?.type || newType,
        phase: 'ended',
        label: existing?.label || label,
        flowRate, volume,
        startedAt: existing?.startedAt || ts,
        /* The instant the event STARTED, carried forward from the Warning
           push that opened it. A record written before `startedAtIso` existed
           has none, and the card then draws no date rather than a guessed
           one. */
        startedAtIso: existing?.startedAtIso || new Date().toISOString(),
        endedAtIso: new Date().toISOString(),
        // How long it ran. The End-of-Leak push has always CARRIED this
        // (pushCatalog LE_01's `duration` param, default "2 h 14 m") and this
        // record has always dropped it, which was invisible while nothing
        // read a concluded event back. EventFocusOverlay's concluded-event
        // layout does, and `age` is the field the live alert shape already
        // carries an elapsed span in - and the field alertRowFor reads for
        // the card's Duration row - so it goes in that one rather than a new
        // one. Nothing else reads this record.
        age: p.duration || existing?.age,
        resolved: true, resolvedAt: ts,
      });
      return true;
    }
    // Ongoing / Shutoff (incl. VC_S_02, VC_OK_02)
    const startedAt = existing?.startedAt || ts;
    /* Same instant, carried through every later phase of the same event. */
    const startedAtIso = existing?.startedAtIso || new Date().toISOString();
    const leakType = existing?.type || newType;
    let phase = 'warning';
    let valveOverride;
    if (p.state === 'Ongoing') phase = 'ongoing';
    else if (p.state === 'Shutoff') {
      phase = 'shutoff';
      if (p.v10_9_id === 'VC_S_02') valveOverride = 'closing';
      else valveOverride = 'closed';
    }
    setSimulatedAlert(p.systemId, {
      type: leakType, phase,
      label: existing?.label || label,
      flowRate: p.flowRate || existing?.flowRate,
      volume:   p.volume   || existing?.volume,
      ...(valveOverride ? { valveOverride } : {}),
      startedAt,
      startedAtIso,
    });
    return true;
  }

  // ─── Active non-water alerts ─────────────────────────────────────────
  if (p.type === 'valve-error' || p.type === 'offline' || p.type === 'power-lost') {
    const labelMap = {
      'valve-error': 'Valve Error',
      'offline':     'Device Offline',
      'power-lost':  'External Power Lost',
    };
    setSimulatedAlert(p.systemId, {
      type: p.type,
      label: p.title || labelMap[p.type],
      startedAt: ts,
      /* Same ISO discipline as a pushed water event and as every generated
         alert: an absolute instant, so no surface recovers a day from a
         bare clock. */
      startedAtIso: new Date().toISOString(),
    });
    return true;
  }

  // ─── Closure / status-update pushes - clear the active alert ─────────
  if (
    p.type === 'online'              || p.type === 'power-restored' ||
    p.type === 'valve-error-cleared' || p.type === 'valve-reconnected' ||
    p.type === 'meter-reconnected'
  ) {
    clearSimulatedAlert(p.systemId);
    return true;
  }

  // VC_OK_01 - Valve closed by user. Per project rule "Valve closed is NOT
  // an issue" - this is a normal operational state, not an alert. We need
  // sys.valve to flip to 'closed' on the Valve widget so the user sees
  // the action took effect, but we MUST NOT create an active alert (would
  // turn the drawer red, add a row to /alerts, etc.). The valveStateOnly
  // flag tells applySimOverlay to apply only the valve override and leave
  // sys.alert untouched.
  if (p.type === 'valve-closed-by-user') {
    setSimulatedAlert(p.systemId, {
      type: 'valve-closed-by-user',
      valveStateOnly: true,
      valveOverride: 'closed',
      startedAt: ts,
    });
    return true;
  }

  // SEN_01 (Valve disconnected) / SEN_03 (Meter disconnected) - sensor
  // failures. Currently they go to the events log only (Timeline row);
  // no sys-level state field exists for them yet. If/when needed,
  // surface them via sim alert with their own overlay rules.
  if (
    p.type === 'valve-disconnected' ||
    p.type === 'meter-disconnected'
  ) {
    return true;
  }

  // Unknown payload type — caller decides what to return.
  return false;
}

// ─── Main entry ──────────────────────────────────────────────────────────
//
// Returns true if the event was a 'push' that mutated state.
export function applyPushEvent(event) {
  if (!event || event.type !== 'push' || !event.payload) return false;
  const p = event.payload;
  if (!p.systemId) return false;
  const ts = nowHHMM();

  // A Warning push starts a NEW water event. Clear the events log for that
  // system so the Timeline shows the fresh lifecycle, not the prior event's
  // history concatenated.
  if (p.type === 'leak' && p.state === 'Warning') {
    clearSimulatedEventsForSystem(p.systemId);
  }

  // 1. Append to the append-only events log so the Timeline grows.
  const row = buildEventRow(p, ts);
  if (row) appendSimulatedEvent(p.systemId, row);

  // 2. Update the ACTIVE alert state (used by /alerts, Water Event widget,
  //    drawer health labels).
  const recognized = updateActiveAlert(p, ts);

  // True if EITHER the events log appended OR the active alert recognized
  // the payload. Unknown payload types return false (test harness invariant).
  return !!row || recognized === true;
}

// ─── Demo reset ─────────────────────────────────────────────────────────────
// Wipes all demo state. Triggered by the Pusher's "Clear" button so both the
// laptop and any paired phones go back to a clean state.
//
// Also sets the "mock suppressed" flag - so the pre-populated static fleet
// alerts + incident timelines + history are hidden from now on. New pushes
// still activate sim alerts ON TOP of the clean baseline. To restore the
// mock fleet, clear localStorage manually.
export function applyDemoReset() {
  try {
    localStorage.removeItem('pulse2-simulated-alerts');
    localStorage.removeItem('pulse2-simulated-events');
    localStorage.removeItem('pulse2-ignored-incidents');
    localStorage.removeItem('pulse2-investigating');
    localStorage.removeItem('pulse2-event-tags');
    localStorage.removeItem('pulse2-event-tag-locations');
  } catch { /* ignore */ }
  setMockSuppressed(true);
}
