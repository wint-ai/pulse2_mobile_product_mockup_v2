// Event data mapped to Pulse 2.0 spreadsheet systems
// Enriched with event IDs, severity, metadata, notifications, and timeline

import { SYSTEMS, getOverlaidSystems } from './systems';
import { getActiveIncident, getNotification } from './incidents';
/* `getAllIgnored` dropped from this import 2026-11-04: its one consumer was
   `computeIgnoredEvents`, deprecated to a `return []` on 2026-06-15, so the
   import has been dead since. eslint's no-unused-vars is an error in this
   config and this file is being touched. */
import { isIgnored, getIgnoredInfo } from './ignoredIncidents';
/* `getSimulatedAlerts` / `reloadSimulatedAlerts` dropped from this import
   2026-11-10: computeActiveEvents' own overlay loop was their last consumer
   here and it now calls getOverlaidSystems(), which does both reads inside
   systems.js. eslint's no-unused-vars is an error in this config. */
import { getAllSimulatedEvents } from './simulatedEvents';
import { CURRENT_EVENTS_FROM_UPSTREAM, HISTORY_EVENTS_FROM_UPSTREAM } from './upstream/generateEvents';
import { displayId } from './upstream/parity';

// Active water events + errors, one per system carrying an alert.
// Generated from the fleet — see src/data/upstream/generateEvents.js. The old
// hand-written fixtures were tied to the Suffolk/Heathrow/Tidhar systems and
// went with them.
export const CURRENT_EVENTS = CURRENT_EVENTS_FROM_UPSTREAM;

// Closed events. Each system carries exactly one fully-resolved incident,
// derived from the same `resolvedVariant` the web uses, so a system's history
// reads identically in both apps.
export const HISTORY_EVENTS = HISTORY_EVENTS_FROM_UPSTREAM;

export const EVENT_TYPES = [
  { key: 'leak-high',  label: 'High Flow Water Event',  color: '#DB4670', matchTypes: ['leak-high'] },
  { key: 'leak-low',   label: 'Low Flow Water Event',   color: '#F05C25', matchTypes: ['leak-low'] },
  { key: 'valve',      label: 'Valve events',    color: '#717684', matchTypes: ['valve', 'valve-error'] },
  { key: 'power-lost', label: 'Power events',    color: '#717684', matchTypes: ['power-lost'] },
  { key: 'comm',       label: 'Communication',   color: '#717684', matchTypes: ['comm'] },
];

// tokens.css aligned: danger-main #a5455e · orange-main #f97316 · text-tertiary #7a8189
// Cross-source event normaliser — used by lifeEvents.js to fold every alert
// (current + history + ignored) into the per-system Activity timeline under
// its original `e<N>` / `h<N>` id. This is the single piece that lets the
// Alerts → History → tap-event deep-link match the right row in the Timeline
// tab: same id used in both surfaces.
const _MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function _formatLifeEventTs(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${_MONTHS[d.getMonth()]} ${d.getDate()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function _toLifeEventType(ev) {
  // Map Alerts-list types to the ActivityTab classify() vocabulary.
  let t = ev.type;
  if (t === 'comm' || t === 'offline') t = 'device-offline';
  if (!ev.resolved) return t;
  // Resolved variants → switch to the "ended" type so the row gets the green
  // ✓ badge in the Timeline (Variant A locked).
  if (t === 'leak-high' || t === 'leak-low') return 'leak-resolved';
  if (t === 'valve-error') return 'valve-resolved';
  if (t === 'power-lost') return 'power-restored';
  if (t === 'device-offline') return 'device-online';
  return t;
}
export function getEventsForSystem(sysId) {
  return [...CURRENT_EVENTS, ...HISTORY_EVENTS]
    .filter(ev => ev.system === sysId)
    .map(ev => ({
      id: ev.id,                        // 'e7', 'h12', ... — preserved across surfaces
      systemId: ev.system,
      type: _toLifeEventType(ev),
      severity: ev.severity,
      title: ev.title,
      detail: ev.detail,
      timestamp: _formatLifeEventTs(ev.timestamp),
      actor: 'System',
      notifications: ev.notifications,
      resolved: !!ev.resolved,
    }));
}

export function getEventTypeColor(type) {
  const map = {
    'leak-high':         '#a5455e',
    'leak-low':          '#f97316',
    'valve':             '#7a8189',
    'valve-error':       '#7a8189',
    'power-lost':        '#7a8189',
    'comm':              '#7a8189',
    'battery-critical':  '#7a8189',
    'battery-low':       '#7a8189',
    'offline':           '#7a8189',
    'no-recipients':     '#DB4670',  // configuration gap \u2014 surfaced in Alerts > Configuration
  };
  return map[type] || '#7a8189';
}

export function getEventTypeIcon(type) {
  if (type === 'leak-high' || type === 'leak-low') return '\uD83D\uDCA7';
  if (type === 'valve' || type === 'valve-error') return '\u2699\uFE0F';
  if (type === 'power-lost') return '\u26A1';
  if (type === 'no-recipients') return '\uD83D\uDD15'; // bell with slash
  return '\uD83D\uDCE1';
}

/** True if this event type is a configuration gap (state-based, not time-based). */
export function isConfigurationGap(type) {
  return type === 'no-recipients';
}

// ─── Active events derived from systems + incidents (single source of truth) ──

const TYPE_TITLE = {
  'leak-high':        'High Flow Water Event',
  'leak-low':         'Low Flow Water Event',
  'valve-error':      'Valve error',
  'power-lost':       'AC power lost',
  'offline':          'Device offline',
  'battery-low':      'Battery low',
  'battery-critical': 'Battery critical',
};

const STEP_TITLE = {
  detected:           'Water Event detected',
  'alert-sent':       'Alert Sent',
  continues:          'Flow Continues',
  'reminder-sent':    'Ongoing reminder',  // OL push per V10.9
  'valve-error':      'Valve error',       // V_ER push per V10.9
  'volume-milestone': 'Volume Milestone',
  'valve-closed':     'Valve Closed',
};

function initialsFor(name) {
  return (name || '').split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

/* `timestampFromTodayClock` WAS HERE, AND IT WAS A BUG -- deleted 2026-11-04.
   It took `alert.startedAt`, a bare "HH:MM" with no day on it, and stamped it
   onto TODAY unconditionally. On an event detected yesterday evening that
   produced a timestamp in the FUTURE, so this row rendered with tomorrow's
   date and a duration of `0s` -- negative elapsed, clamped by Math.max(0, ...).
   Visible in /alerts as "Nov 4 ... 0s" on a ten-hour-old event.

   It existed only because the record had no day. It now has one:
   `alert.startedAtIso` (buildTree.js `buildEventRecord`), which is the same
   instant every other surface dates its Detected line from. Nothing recovers
   a day from a clock any more. */

function buildActiveEvent(sys) {
  const alert = sys.alert;
  if (!alert) return null;
  const isLeak = alert.type === 'leak-high' || alert.type === 'leak-low';
  const incident = isLeak ? getActiveIncident(sys.id) : null;
  const notif = incident ? getNotification(incident) : null;

  /* THE ONE INSTANT and THE ONE DURATION, both straight off the canonical
     record (via `sys.alert`, which is its projection). Neither is recomputed
     here: the duration used to be `now - timestamp` over a timestamp this file
     had just fabricated, which is how a 10-hour event came to print `0s`. */
  const timestamp = alert.startedAtIso ?? null;
  const durationSec = alert.durationSec ?? null;

  const path = sys.l4Name && sys.l3Name ? `${sys.l4Name} · ${sys.l3Name}` : (sys.l3Name || sys.l4Name || '');

  // Detail is set only when it adds info beyond the type pill.
  // For non-leak alerts (offline / valve error / power lost), the type label
  // already conveys what the detail would say, so we leave it empty to avoid
  // the "Offline + Device offline" duplication in the row.
  let detail = '';
  if (alert.flowRate) {
    detail = alert.volume ? `${alert.volume} · ${alert.flowRate}` : alert.flowRate;
  }

  /* THE ONE EVENT ID. This used to be a THIRD producer -- `hashId` over the
     incident id, giving "LK-86215" where /events/system/:id showed
     "LK-6363024" and the event hero showed "lk-6215", all for the same event
     on esrt-bldg-A-apt-2. The record's
     `eventId` is the survivor; the other two are retired. */
  const eventId = alert.eventId ?? null;

  const metadata = {};
  if (alert.flowRate) metadata['Flow Rate'] = alert.flowRate;
  if (alert.volume) metadata['Volume Lost'] = alert.volume;
  /* `alert.age` is `relativeAge(durationSec)` -- the same duration the row's
     own `durationSec` carries, formatted. One number, two spellings. */
  if (alert.age) metadata['Duration'] = alert.age;

  const notifications = notif?.recipients?.length
    ? notif.recipients.map(name => ({
        name,
        initials: initialsFor(name),
        channels: notif.channels,
        sentAt: alert.startedAt || '',
      }))
    : [];

  const timeline = incident?.steps
    ? incident.steps.map(step => ({
        label: STEP_TITLE[step.type] || step.type,
        sublabel: step.detail,
        time: step.time,
        flowRate: step.flowRate,
      }))
    : [];

  return {
    id: `act_${sys.id}`,
    type: alert.type,
    system: sys.id,
    systemName: sys.name,
    path,
    title: TYPE_TITLE[alert.type] || alert.label,
    detail,
    time: alert.age || '',
    timestamp,
    durationSec,
    resolved: false,
    dateGroup: 'Today',
    tappable: isLeak,
    eventId,
    severity: alert.type === 'leak-high' ? 'critical' : 'warning',
    metadata,
    notifications,
    timeline,
  };
}

/**
 * Build pseudo-events for systems that have NO notification recipients configured.
 * These are state-based "configuration gaps" — they aren't real events with a
 * lifecycle, so they have no timestamp and no notifications/timeline. They're
 * folded into the Alerts feed under the Configuration filter so users have a
 * single place to find everything that needs their attention.
 */
export function computeConfigurationGaps() {
  /* THE OVERLAID FLEET, for the reason computeActiveEvents gives above: a
     configuration gap is a row in the same /alerts list, scoped by the same
     rule, and it must describe the system the system page shows. Under the
     pusher's "treat the fleet as clean" flag applySimOverlay guarantees at
     least one recipient, so the gaps go quiet with everything else instead of
     being the one category that survives a Clear. */
  return getOverlaidSystems()
    .filter(s => (s.notificationRecipients || 0) === 0)
    .map(s => ({
      id:         `cfg_${s.id}`,
      type:       'no-recipients',
      system:     s.id,
      systemName: s.name,
      path:       [s.l3Name, s.l4Name].filter(Boolean).join(' · '),
      title:      'No notification recipients',
      detail:     'Add at least one recipient to receive alerts',
      time:       'Since setup',
      timestamp:  null,           // intentional — state, not event
      resolved:   false,
      dateGroup:  'Configuration',
      tappable:   true,
      severity:   'warning',
      configGap:  true,
    }));
}

/**
 * Build a "secondary" event for a dimension issue that exists on a system
 * but isn't reflected in sys.alert.type. Bare-bones — no timeline, no
 * notifications, no metadata. Used when a system has multiple concurrent
 * issues (e.g. Water Event + Valve Error) so each issue gets its own row in
 * the Alerts feed and filtering by category catches all of them.
 */
function buildSecondaryEvent(sys, type) {
  const path = sys.l4Name && sys.l3Name ? `${sys.l4Name} · ${sys.l3Name}` : (sys.l3Name || sys.l4Name || '');
  const idPrefix = type === 'valve-error' ? 'VE' : type === 'power-lost' ? 'PW' : 'CM';
  return {
    id: `act_${sys.id}_${type}`,
    type,
    system: sys.id,
    systemName: sys.name,
    path,
    title: TYPE_TITLE[type] || type,
    detail: '',
    time: '',
    timestamp: null,
    durationSec: null,
    resolved: false,
    dateGroup: 'Today',
    tappable: false,
    /* A secondary issue is not the system's primary event, so it cannot reuse
       the record's id -- it is a different row for a different fault. Same
       `displayId` family as every other id in the app, so there is still only
       one id FORMAT. */
    eventId: displayId(idPrefix, `${sys.id}_${type}`),
    severity: 'warning',
    metadata: {},
    notifications: [],
    timeline: [],
  };
}

/**
 * Derive the live "Active" event list from systems.js + incidents.js.
 * Single source of truth — replaces the static active subset of CURRENT_EVENTS.
 *
 * Ignored Water Events STAY in the Active list (locked 2026-06-15 per PRD 14
 * § 2.3): the underlying flow is still happening, so hiding the row would lie
 * about the system's state. They're flagged with `ignored: true` so the row
 * component renders the muted treatment + Ignored pill instead of Warning.
 * They move to History only when the underlying flow ends, and at that point
 * they show as Resolved (not Ignored).
 *
 * A single system can contribute MULTIPLE events when it has multiple
 * concurrent issues (e.g. Water Event AND Valve Error). The primary event
 * comes from sys.alert (richest data); additional issues on the same system
 * (sys.valve === 'error' / sys.comm === 'offline' / sys.power === 'ac-lost')
 * generate bare secondary events so each issue is filterable and countable
 * independently, matching how the Home Systems Health widget counts.
 */
export function computeActiveEvents() {
  const out = [];

  /* THE OVERLAID FLEET — `getOverlaidSystems()`, not `SYSTEMS`.
     This loop used to do the overlay itself (reloadSimulatedAlerts +
     getSimulatedAlerts + applySimOverlay over SYSTEMS) and was the ONLY place
     in the app that applied it fleet-wide. HomeAllAccounts' `scopedSystems`
     therefore read the generator's raw fleet while this list read the
     pusher's — the location level and the system level disagreeing about the
     same alert. Extracted to systems.js so there is one answer to "what is
     the fleet right now" and both levels ask it. Same records, same order. */
  for (const sys of getOverlaidSystems()) {
    const primaryType = sys.alert?.type || null;
    const isWaterAlert = primaryType === 'leak-high' || primaryType === 'leak-low';
    const waterIgnored = isWaterAlert && isIgnored(sys.id);

    // Primary alert (if any). Ignored water events STAY in the list with an
    // `ignored: true` flag so the row renders muted; the row is NOT filtered
    // out. Secondary issues on the same system aren't ignored either.
    if (sys.alert) {
      const ev = buildActiveEvent(sys);
      if (ev) {
        if (waterIgnored) {
          const info = getIgnoredInfo(sys.id) || {};
          ev.ignored = true;
          ev.ignoredInfo = info;
        }
        out.push(ev);
      }
    }

    // Secondary issues — emit one event per failing dimension whose category
    // isn't already represented by the primary alert.
    if (sys.valve === 'error' && primaryType !== 'valve-error') {
      out.push(buildSecondaryEvent(sys, 'valve-error'));
    }
    const primaryIsComm = primaryType === 'offline' || primaryType === 'comm';
    if (sys.comm === 'offline' && !primaryIsComm) {
      out.push(buildSecondaryEvent(sys, 'offline'));
    }
    if (sys.power === 'ac-lost' && primaryType !== 'power-lost') {
      out.push(buildSecondaryEvent(sys, 'power-lost'));
    }
  }

  return out;
}

/**
 * Every active alert in the dataset, before any scoping.
 *
 * This is the RAW list and almost nothing should call it directly. The UI
 * entry point is useScopedActiveAlerts() in src/hooks/useActiveAlerts.js,
 * which narrows this to what the signed-in user can actually see. Kept
 * separate (and exported) only so the scope step is a visible, testable
 * function rather than something buried inside a hook.
 */
export function computeAllActiveAlerts() {
  return [...computeActiveEvents(), ...computeConfigurationGaps()];
}

/**
 * Narrow an alert list to a scope. THE scope rule - there is one copy of it.
 *
 * Three independent narrowings, all three of which /alerts has always applied
 * to its rendered list:
 *   visibleIds        the persona's own systems (UserContext.visibleSystems).
 *                     An EMPTY set means "no persona filter", not "no systems" -
 *                     that is the pre-existing convention in EventsScreen and
 *                     it is preserved here deliberately.
 *   scopeIds          the ?scope=a,b deep-link param.
 *   selectedScopeIds  the location the user picked in the navigation drawer.
 *
 * Config gaps carry `system` just like real events do (computeConfigurationGaps
 * above), so they scope with everything else and no branch is needed for them.
 *
 * Applying this twice is a no-op, which is what lets EventsScreen hand an
 * already-scoped list back through its own applyFilters() without special-casing.
 */
export function scopeActiveAlerts(list, { visibleIds, scopeIds, selectedScopeIds } = {}) {
  let out = list;
  if (visibleIds && visibleIds.size > 0) out = out.filter(e => visibleIds.has(e.system));
  if (scopeIds) out = out.filter(e => scopeIds.has(e.system));
  if (selectedScopeIds) out = out.filter(e => selectedScopeIds.has(e.system));
  return out;
}

/**
 * Build event-shape entries for Water Events the user has ignored.
 * Used in the History tab.
 */
// Pusher-resolved events for the Alerts History tab.
//
// When the pusher fires "End of Leak" (or any closure push), the active sim
// alert is tombstoned but the events log keeps the lifecycle row. The Alerts
// History tab needs a way to surface those resolved events so users can find
// what they just closed.
//
// Each system whose sim events log contains a resolution row contributes one
// entry here (the most recent resolution row, since the log restarts on each
// new Warning).
export function computePusherResolvedEvents() {
  const log = getAllSimulatedEvents();
  const out = [];
  for (const [systemId, rows] of Object.entries(log || {})) {
    if (!Array.isArray(rows) || rows.length === 0) continue;
    // Find the most recent resolution row in this system's log.
    const RESOLVED_TYPES = new Set([
      'leak-resolved-we', 'leak-resolved',
      'valve-resolved', 'valve-reconnected',
      'power-restored', 'device-online', 'meter-reconnected',
    ]);
    const resolvedRow = [...rows].reverse().find(r => RESOLVED_TYPES.has(r?.type));
    if (!resolvedRow) continue;
    const sys = SYSTEMS.find(s => s.id === systemId);
    if (!sys) continue;
    // Map sim event types to the History entry's alert type for filter
    // compatibility with the Active tab.
    const isWater = resolvedRow.type === 'leak-resolved-we' || resolvedRow.type === 'leak-resolved';
    const alertType = isWater
      ? (rows.some(r => r.type === 'leak-detected-low') ? 'leak-low' : 'leak-high')
      : (resolvedRow.type === 'valve-resolved' || resolvedRow.type === 'valve-reconnected') ? 'valve-error'
      : (resolvedRow.type === 'power-restored') ? 'power-lost'
      : (resolvedRow.type === 'device-online') ? 'offline'
      : 'leak-high';
    out.push({
      id: `simres_${systemId}_${resolvedRow._seq ?? rows.indexOf(resolvedRow)}`,
      type: alertType,
      system: sys.id,
      systemName: sys.name,
      path: [sys.l4Name, sys.l3Name].filter(Boolean).join(' · '),
      title: resolvedRow.title || 'Resolved',
      detail: resolvedRow.detail || '',
      time: resolvedRow.timestamp || '',
      timestamp: `Mar 25, ${resolvedRow.timestamp || ''}`,
      durationSec: 0,
      resolved: true,
      dateGroup: 'Today',
      notifications: [],
      timeline: rows.map(r => ({
        label: r.title || r.type,
        sublabel: r.detail || '',
        time: r.timestamp || '',
      })),
    });
  }
  return out;
}

// Deprecated 2026-06-15 per PRD 14 § 2.4 / PRD 05d.
// Ignored events stay on the Active tab while the underlying water flow is
// still happening. They land in History only when the flow actually ends, at
// which point they go through computePusherResolvedEvents() and appear as
// "Resolved" (not "Ignored" — that state was a transient user choice while
// the issue was live). This function now returns [] to keep the import in
// EventsScreen working as a no-op until the next refactor removes it
// entirely.
export function computeIgnoredEvents() {
  return [];
}

// Legacy CT1-specific exports
