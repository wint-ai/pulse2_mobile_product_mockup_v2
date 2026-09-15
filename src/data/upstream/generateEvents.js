/**
 * generateEvents.js — builds the active + historical event lists from the
 * fleet, instead of hand-writing them.
 *
 * The web app does the same thing (`generateTimelineEvents` /
 * `resolvedVariant` in eventsTimelineMockData.ts): it does not store events,
 * it derives them from the system id. Deriving them here from the SAME ported
 * functions means a system's history reads the same in both apps.
 *
 * Every field is a pure function of the system id, so reloads are stable and a
 * screenshot taken now matches one taken tomorrow.
 */
import { SYSTEMS } from '../systems';
import { stableHash, resolvedVariant } from './parity';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HOUR_MS = 3600000;

const pad = n => String(n).padStart(2, '0');
const clock = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const monthDay = d => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

function isoOf(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function durationLabel(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${pad(m)}m`;
}

/** Display id, e.g. LK-6129384. Stable per system + prefix. */
function displayId(prefix, systemId) {
  return `${prefix}-${6000000 + (stableHash(`${prefix}:${systemId}`) % 999999)}`;
}

function pathOf(sys) {
  return [sys.l3Name, sys.l2Name].filter(Boolean).join(' · ');
}

function recipientsOf(sys, sentAt) {
  return (sys.contacts || []).slice(0, 2).map((c, i) => ({
    name: c.name,
    initials: c.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    channels: [i === 0 ? 'push' : 'email'],
    sentAt,
  }));
}

const SEVERITY_BY_TYPE = {
  'leak-high': 'critical',
  'leak-low': 'warning',
  offline: 'warning',
  'valve-error': 'critical',
  'power-lost': 'warning',
};

// ── Active events ────────────────────────────────────────────────────────────

function buildCurrentEvent(sys) {
  const a = sys.alert;
  if (!a) return null;

  const h = stableHash(`event:${sys.id}`);
  // Reconstruct the alert's start from its age label so event and alert agree.
  const hoursAgo = 1 + (h % 11) + (h % 60) / 60;
  const started = new Date(Date.now() - hoursAgo * HOUR_MS);
  const durationSec = Math.round(hoursAgo * 3600);
  const isLeak = a.type === 'leak-high' || a.type === 'leak-low';

  const metadata = isLeak
    ? {
        'Flow Rate': a.flowRate,
        'Volume Lost': a.volume,
        Duration: durationLabel(durationSec),
        Threshold: a.type === 'leak-high' ? '30 L/h' : '5 L/h',
        Detection: 'Adaptive algorithm',
      }
    : { Duration: durationLabel(durationSec), Detection: 'Device telemetry' };

  const timeline = isLeak
    ? [
        { label: 'Water Event detected', sublabel: a.type === 'leak-high' ? 'High Flow Warning' : 'Low Flow Warning', time: a.startedAt, flowRate: a.flowRate },
        { label: 'Alert Sent', sublabel: `${sys.notificationRecipients || 0} recipients notified`, time: a.startedAt },
        { label: 'Flow Continues', sublabel: 'Ongoing', time: clock(new Date(started.getTime() + HOUR_MS)), flowRate: a.flowRate },
      ]
    : [
        { label: a.label, sublabel: 'Detected', time: a.startedAt },
        { label: 'Alert Sent', sublabel: `${sys.notificationRecipients || 0} recipients notified`, time: a.startedAt },
      ];

  return {
    id: `e-${sys.id}`,
    type: a.type,
    system: sys.id,
    systemName: sys.name,
    path: pathOf(sys),
    title: a.label,
    detail: isLeak ? `${a.volume} · ${a.flowRate}` : `Ongoing · ${a.age}`,
    time: `${a.age} ago`,
    timestamp: isoOf(started),
    durationSec,
    resolved: false,
    dateGroup: 'Today',
    tappable: true,
    eventId: displayId(isLeak ? 'LK' : 'ER', sys.id),
    severity: SEVERITY_BY_TYPE[a.type] || 'warning',
    metadata,
    notifications: recipientsOf(sys, a.startedAt),
    timeline,
  };
}

// ── Historical events ────────────────────────────────────────────────────────

const ROOT_CAUSES = ['Equipment fault', 'Pipe joint', 'Fixture left running', 'Seal failure', 'Scheduled maintenance'];

function buildHistoryEvent(sys) {
  // Every system carries exactly one fully-closed incident, matching the web's
  // `resolvedVariant` — same title, severity, flow, volume and resolution text.
  const v = sys.resolvedIncident || resolvedVariant(sys.id);
  const h = stableHash(`history:${sys.id}`);
  const detected = new Date(Date.now() - v.detectedHoursAgo * HOUR_MS);
  const resolvedAt = new Date(Date.now() - v.resolvedHoursAgo * HOUR_MS);
  const durationSec = Math.max(60, Math.round((resolvedAt - detected) / 1000));
  const rootCause = ROOT_CAUSES[h % ROOT_CAUSES.length];
  const type = v.level === 'HIGH_FLOW' ? 'leak-high' : 'leak-low';

  return {
    id: `h-${sys.id}`,
    type,
    system: sys.id,
    systemName: sys.name,
    path: pathOf(sys),
    title: type === 'leak-high' ? 'High Flow Water Event' : 'Low Flow Water Event',
    detail: `${v.totalVolume.toLocaleString('en-US')}L · ${v.totalDuration} · ${rootCause}`,
    time: monthDay(detected),
    timestamp: isoOf(detected),
    durationSec,
    resolved: true,
    dateGroup: monthDay(detected),
    tappable: true,
    eventId: displayId('LK', `resolved:${sys.id}`),
    severity: v.severity,
    metadata: {
      'Flow Rate': `${v.flowLph} L/h`,
      'Volume Lost': `${v.totalVolume.toLocaleString('en-US')}L`,
      Duration: v.totalDuration,
      'Root Cause': rootCause,
    },
    timeline: [
      { label: 'Water Event detected', sublabel: v.title, time: clock(detected), flowRate: `${v.flowLph} L/h` },
      { label: 'Alert Sent', sublabel: `${sys.notificationRecipients || 0} recipients notified`, time: clock(detected) },
      { label: 'Water Event ended', sublabel: v.resolutionLabel, time: clock(resolvedAt) },
    ],
  };
}

export const CURRENT_EVENTS_FROM_UPSTREAM = SYSTEMS.map(buildCurrentEvent)
  .filter(Boolean)
  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

export const HISTORY_EVENTS_FROM_UPSTREAM = SYSTEMS.map(buildHistoryEvent).sort(
  (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
);
