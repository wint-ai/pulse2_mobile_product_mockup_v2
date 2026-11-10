/**
 * generateIncidents.js — per-system leak incident timelines, PROJECTED from
 * the canonical record.
 *
 * Same step vocabulary as before (detected / alert-sent / on-it / continues /
 * volume-milestone / valve-closed / resolved), so every consumer — ActivityTab,
 * LeakDetail, getLeakState, getNotification — keeps working unchanged.
 *
 * ── THIS FILE NO LONGER SEEDS ANYTHING — 2026-11-04 ────────────────────────
 * It used to roll `stableHash('incident:' + id)` and run buildTree's formula
 * over it, which put the event screen's timeline 4h 26m away from the alert
 * card describing the same event — and, worse, gated WHICH STEPS EXIST on that
 * unrelated draw, so `getLeakState` decided the Warning/Ongoing/ShutOff pill
 * from a seed with nothing to do with the duration printed beside it. That
 * salt is DELETED. The active incident is now `sys.event.milestones`, which
 * buildTree placed at build time off the one `detectedAtIso`.
 *
 * An active incident exists for every system with an active water event; a
 * resolved incident exists for every system, matching the web's one-closed-
 * incident-per-system model. That resolved one is a DIFFERENT event and keeps
 * its own figures — it only shares the `BUILD_NOW` anchor.
 */
import { SYSTEMS } from '../systems';
import { BUILD_NOW } from './parity';
/* The CAPPED variant, for the reason generateEvents.js states at its own
   import: the six-hour ceiling is applied once, in buildTree.js, and this
   timeline draws the same closed event the history row does. */
import { cappedResolvedVariant } from './buildTree';

const HOUR_MS = 3600000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = n => String(n).padStart(2, '0');
const clock = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * "Nov 4, 08:13" — the absolute stamp every timeline row carries.
 *
 * REPLACES `agoLabel` — 2026-11-04. That function wrote "5h 41m ago" into the
 * event screen's timeline, which the project's binding format standard bans
 * outright: at or above one minute, a time is an absolute date and time, never
 * a relative "Xh ago". It was also the same family of defect as the rest of
 * this change — a RELATIVE label has to be recomputed against a `now`, and
 * that is one more clock to drift. An absolute stamp is a fact about the
 * event, not about when you looked at it.
 */
const stamp = d => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${clock(d)}`;

function channelLine(sys) {
  const names = (sys.contacts || []).map(c => c.name);
  if (names.length === 0) return '0 recipients';
  // getNotification() parses "<channels> sent to <recipients>" out of this.
  const channels = names.length > 1 ? 'Push + Email' : 'Push';
  return `${channels} sent to ${names.join(', ')}`;
}

// ── Active incident ──────────────────────────────────────────────────────────

/** Per-milestone copy. The step TYPE is the record's `kind`, unchanged. */
function detailFor(kind, rec, sys) {
  switch (kind) {
    case 'detected':
      return rec.type === 'leak-high'
        ? 'Flow rate crossed the high-flow threshold'
        : 'Low-flow anomaly detected — continuous background flow';
    case 'alert-sent':
      return channelLine(sys);
    case 'on-it':
      return 'Acknowledged — investigating on site';
    case 'continues':
      return 'Flow continuing at a stable rate';
    case 'volume-milestone':
      return 'Total water lost exceeded 1,000L';
    case 'valve-closed':
      return 'Valve closed — automatic shut-off';
    default:
      return '';
  }
}

function buildActiveIncident(sys) {
  const rec = sys.event;
  if (!rec || (rec.type !== 'leak-high' && rec.type !== 'leak-low')) return null;

  /* ONE STEP PER MILESTONE, and the milestone already knows its instant. The
     old body re-derived every one of these from its own `started`, computed
     from its own seed. */
  const steps = rec.milestones.map(m => {
    const at = new Date(m.atIso);
    const step = {
      type: m.kind,
      time: clock(at),
      timeAgo: stamp(at),
      detail: detailFor(m.kind, rec, sys),
    };
    if (m.flowLph) step.flowRate = `${m.flowLph} L/hour`;
    if (m.volumeL) step.volume = `${m.volumeL.toLocaleString('en-US')}L`;
    if (m.kind === 'alert-sent') {
      step.recipients = (sys.contacts || []).map((c, i) => ({
        name: c.name,
        channels: [i === 0 ? 'push' : 'email'],
      }));
    }
    if (m.kind === 'on-it') {
      step.actor = (sys.contacts?.[0]?.name || 'Operator').split(/\s+/)[0];
    }
    return step;
  });

  return {
    id: `inc-${sys.id}-active`,
    systemId: sys.id,
    status: 'active',
    /* THE INSTANT, carried through so a consumer never has to recover a day
       from the bare clock below. */
    startedAtIso: rec.detectedAtIso,
    startedAt: clock(new Date(rec.detectedAtIso)),
    /* THE STATUS PILL, decided by the record rather than by which steps
       happen to exist. `getLeakState` reads this. */
    leakState: rec.status,
    eventId: rec.eventId,
    durationSec: rec.durationSec,
    steps,
  };
}

// ── Resolved incident ────────────────────────────────────────────────────────

function buildResolvedIncident(sys) {
  const v = sys.resolvedIncident || cappedResolvedVariant(sys.id);
  const detected = new Date(BUILD_NOW - v.detectedHoursAgo * HOUR_MS);
  const resolved = new Date(BUILD_NOW - v.resolvedHoursAgo * HOUR_MS);
  const mid = new Date((detected.getTime() + resolved.getTime()) / 2);

  return {
    id: `inc-${sys.id}-resolved`,
    systemId: sys.id,
    status: 'resolved',
    startedAtIso: detected.toISOString(),
    startedAt: clock(detected),
    /* PRESENCE IS WHAT "RESOLVED" MEANS, in the same spelling the canonical
       record uses for an event that has ended. */
    endedAtIso: resolved.toISOString(),
    resolvedAt: clock(resolved),
    steps: [
      {
        type: 'detected',
        time: clock(detected),
        timeAgo: stamp(detected),
        flowRate: `${v.flowLph} L/hour`,
        detail: v.title,
      },
      {
        type: 'alert-sent',
        time: clock(detected),
        timeAgo: stamp(detected),
        detail: channelLine(sys),
      },
      {
        type: 'continues',
        time: clock(mid),
        timeAgo: stamp(mid),
        flowRate: `${v.flowLph} L/hour`,
        detail: `Flow continued for ${v.totalDuration}`,
      },
      {
        type: 'resolved',
        time: clock(resolved),
        timeAgo: stamp(resolved),
        volume: `${v.totalVolume.toLocaleString('en-US')}L`,
        detail: v.resolutionLabel,
      },
    ],
  };
}

export const INCIDENTS_FROM_UPSTREAM = [
  ...SYSTEMS.map(buildActiveIncident).filter(Boolean),
  ...SYSTEMS.map(buildResolvedIncident),
];
