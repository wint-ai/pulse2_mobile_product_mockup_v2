/**
 * generateEvents.js — the active + historical event lists, PROJECTED from the
 * canonical record.
 *
 * ── THIS FILE NO LONGER SEEDS ANYTHING — 2026-11-04 ────────────────────────
 * It used to roll its own `stableHash('event:' + id)` and run the same
 * `1 + (h % 11) + (h % 60) / 60` formula buildTree.js runs, over a different
 * hash. The two therefore disagreed about when the same event started — by 18
 * minutes on esrt-bldg-A-apt-2 — while the comment above the roll claimed it
 * "[r]econstruct[s] the alert's start from its age label so event and alert
 * agree". It never read the alert. That salt is DELETED; `buildCurrentEvent`
 * now reads `sys.event` (buildTree.js `buildEventRecord`) and formats it.
 *
 * WHAT IS STILL SEEDED HERE, and why that is correct: `history:` picks a root
 * cause string for the RESOLVED incident, which is a DIFFERENT, already-closed
 * event (`resolvedVariant` in parity.js). The two events per system are
 * genuinely two events and their figures must not be forced to match.
 *
 * Every clock anchors on `BUILD_NOW`, so the whole dataset advances in
 * lockstep between page loads instead of each generator drifting on its own
 * `Date.now()`.
 *
 * The exported SHAPES are unchanged, so no consumer moved.
 */
import { SYSTEMS } from '../systems';
import { BUILD_NOW, displayId, stableHash } from './parity';
/* `resolvedVariant` is NOT imported from parity any more -- 2026-11-10. The
   six-hour ceiling is applied once, in buildTree.js, and reading the raw
   variant here would put an uncapped duration on the history row beside the
   capped one the system already carries. One producer, as everywhere else in
   this file. */
import { cappedResolvedVariant } from './buildTree';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HOUR_MS = 3600000;

const pad = n => String(n).padStart(2, '0');
const clock = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const monthDay = d => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

/* `isoOf` WAS HERE -- deleted 2026-11-04. It wrote a NAIVE local ISO with no
   offset ("2026-11-03T22:50:09"), while the canonical record writes a true
   instant ("2026-11-03T20:50:09.561Z"). Both parse back to the same moment in
   this timezone, so nothing was visibly wrong -- but two spellings of the same
   field across one dataset is the shape of the bug this whole change removes,
   and `concludedEvent.js` hands `row.timestamp` straight into `startedAtIso`
   alongside records that carry the real thing. One spelling now: the instant. */

function durationLabel(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${pad(m)}m`;
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

/** The record's milestone clocks, in the shape the timeline rows draw. */
const MILESTONE_LABEL = {
  detected: 'Water Event detected',
  'alert-sent': 'Alert Sent',
  'on-it': 'On it',
  continues: 'Flow Continues',
  'volume-milestone': 'Volume Milestone',
  'valve-closed': 'Valve Closed',
};

function buildCurrentEvent(sys) {
  const a = sys.alert;
  if (!a) return null;
  /* THE ONE RECORD. Not a re-roll — `sys.event` is what buildTree built and
     what `sys.alert` is itself a projection of, so this list and that card
     cannot disagree about the instant, the duration or the id. */
  const rec = sys.event;
  if (!rec) return null;

  const durationSec = rec.durationSec;
  const isLeak = rec.type === 'leak-high' || rec.type === 'leak-low';

  const metadata = isLeak
    ? {
        'Flow Rate': a.flowRate,
        'Volume Lost': a.volume,
        Duration: durationLabel(durationSec),
        Threshold: rec.type === 'leak-high' ? '30 L/h' : '5 L/h',
        Detection: 'Adaptive algorithm',
      }
    : { Duration: durationLabel(durationSec), Detection: 'Device telemetry' };

  /* THE TIMELINE IS THE RECORD'S MILESTONES. It used to be three hand-written
     rows whose third ("Flow Continues") was stamped `started + 1h` off this
     file's own anchor while the first two carried `a.startedAt` off
     buildTree's — one row list, two clocks. Now every row is a milestone the
     record already placed. */
  const timeline = isLeak
    ? rec.milestones
        .filter(m => m.kind === 'detected' || m.kind === 'alert-sent' || m.kind === 'continues')
        .map(m => ({
          label: MILESTONE_LABEL[m.kind] || m.kind,
          sublabel:
            m.kind === 'detected'
              ? (rec.type === 'leak-high' ? 'High Flow Warning' : 'Low Flow Warning')
              : m.kind === 'alert-sent'
                ? `${sys.notificationRecipients || 0} recipients notified`
                : 'Ongoing',
          time: clock(new Date(m.atIso)),
          ...(m.flowLph ? { flowRate: `${m.flowLph} L/hour` } : {}),
        }))
    : [
        { label: a.label, sublabel: 'Detected', time: a.startedAt },
        { label: 'Alert Sent', sublabel: `${sys.notificationRecipients || 0} recipients notified`, time: a.startedAt },
      ];

  return {
    id: `e-${sys.id}`,
    type: rec.type,
    system: sys.id,
    systemName: sys.name,
    path: pathOf(sys),
    title: a.label,
    detail: isLeak ? `${a.volume} · ${a.flowRate}` : `Ongoing · ${a.age}`,
    time: `${a.age} ago`,
    timestamp: rec.detectedAtIso,
    durationSec,
    resolved: false,
    dateGroup: 'Today',
    tappable: true,
    /* THE ONE EVENT ID, off the record — the same string the event hero and
       the Alerts row now print. */
    eventId: rec.eventId,
    severity: SEVERITY_BY_TYPE[rec.type] || 'warning',
    metadata,
    notifications: recipientsOf(sys, a.startedAt),
    timeline,
  };
}

// ── Historical events ────────────────────────────────────────────────────────

const ROOT_CAUSES = ['Equipment fault', 'Pipe joint', 'Fixture left running', 'Seal failure', 'Scheduled maintenance'];

function buildHistoryEvent(sys) {
  /* A SECOND, GENUINELY DIFFERENT EVENT. Every system carries exactly one
     fully-closed incident, matching the web's `resolvedVariant` — same title,
     severity, flow, volume and resolution text. It is NOT the active event and
     its figures are deliberately NOT forced to match it. What it shares with
     the active one is only the anchor: BUILD_NOW, so the two advance together
     rather than on separate `Date.now()` reads. */
  const v = sys.resolvedIncident || cappedResolvedVariant(sys.id);
  const h = stableHash(`history:${sys.id}`);
  const detected = new Date(BUILD_NOW - v.detectedHoursAgo * HOUR_MS);
  const resolvedAt = new Date(BUILD_NOW - v.resolvedHoursAgo * HOUR_MS);
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
    timestamp: detected.toISOString(),
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
