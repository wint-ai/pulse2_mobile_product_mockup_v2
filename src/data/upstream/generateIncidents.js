/**
 * generateIncidents.js — per-system leak incident timelines, derived.
 *
 * Replaces the hand-written INCIDENTS fixture set that was keyed to the
 * Suffolk/Heathrow/CBRE/Tidhar systems. Same step vocabulary as before
 * (detected / alert-sent / on-it / continues / volume-milestone / valve-closed
 * / resolved), so every consumer — ActivityTab, LeakDetail, getLeakState,
 * getNotification — keeps working unchanged.
 *
 * An active incident exists for every system with an active water event; a
 * resolved incident exists for every system, matching the web's one-closed-
 * incident-per-system model.
 */
import { SYSTEMS } from '../systems';
import { stableHash, resolvedVariant } from './parity';

const HOUR_MS = 3600000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = n => String(n).padStart(2, '0');
const clock = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const stamp = d => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${clock(d)}`;

function agoLabel(ms) {
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m ? `${h}h ${m}m ago` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function channelLine(sys) {
  const names = (sys.contacts || []).map(c => c.name);
  if (names.length === 0) return '0 recipients';
  // getNotification() parses "<channels> sent to <recipients>" out of this.
  const channels = names.length > 1 ? 'Push + Email' : 'Push';
  return `${channels} sent to ${names.join(', ')}`;
}

// ── Active incident ──────────────────────────────────────────────────────────

function buildActiveIncident(sys) {
  const a = sys.alert;
  if (!a || (a.type !== 'leak-high' && a.type !== 'leak-low')) return null;

  const h = stableHash(`incident:${sys.id}`);
  const hoursAgo = 1 + (h % 11) + (h % 60) / 60;
  const started = new Date(Date.now() - hoursAgo * HOUR_MS);
  const now = Date.now();
  const at = offsetH => new Date(started.getTime() + offsetH * HOUR_MS);

  const steps = [
    {
      type: 'detected',
      time: clock(started),
      timeAgo: agoLabel(now - started),
      flowRate: a.flowRate,
      detail: a.type === 'leak-high'
        ? 'Flow rate crossed the high-flow threshold'
        : 'Low-flow anomaly detected — continuous background flow',
    },
    {
      type: 'alert-sent',
      time: clock(started),
      timeAgo: agoLabel(now - started),
      detail: channelLine(sys),
      recipients: (sys.contacts || []).map((c, i) => ({
        name: c.name,
        channels: [i === 0 ? 'push' : 'email'],
      })),
    },
  ];

  // Longer-running incidents accumulate more of the lifecycle, so the demo has
  // both short "just detected" and rich multi-step timelines.
  if (hoursAgo > 2) {
    steps.push({
      type: 'on-it',
      time: clock(at(0.4)),
      timeAgo: agoLabel(now - at(0.4)),
      actor: (sys.contacts?.[0]?.name || 'Operator').split(/\s+/)[0],
      detail: 'Acknowledged — investigating on site',
    });
    steps.push({
      type: 'continues',
      time: clock(at(1)),
      timeAgo: agoLabel(now - at(1)),
      flowRate: a.flowRate,
      detail: 'Flow continuing at a stable rate',
    });
  }
  if (hoursAgo > 5 && a.type === 'leak-high') {
    steps.push({
      type: 'volume-milestone',
      time: clock(at(3)),
      timeAgo: agoLabel(now - at(3)),
      volume: '1,000L',
      detail: 'Total water lost exceeded 1,000L',
    });
  }
  if (sys.valve === 'closed') {
    steps.push({
      type: 'valve-closed',
      time: clock(at(Math.min(hoursAgo - 0.1, 4))),
      timeAgo: agoLabel(now - at(Math.min(hoursAgo - 0.1, 4))),
      detail: 'Valve closed — automatic shut-off',
    });
  }

  return {
    id: `inc-${sys.id}-active`,
    systemId: sys.id,
    status: 'active',
    startedAt: a.startedAt,
    steps,
  };
}

// ── Resolved incident ────────────────────────────────────────────────────────

function buildResolvedIncident(sys) {
  const v = sys.resolvedIncident || resolvedVariant(sys.id);
  const detected = new Date(Date.now() - v.detectedHoursAgo * HOUR_MS);
  const resolved = new Date(Date.now() - v.resolvedHoursAgo * HOUR_MS);
  const mid = new Date((detected.getTime() + resolved.getTime()) / 2);

  return {
    id: `inc-${sys.id}-resolved`,
    systemId: sys.id,
    status: 'resolved',
    startedAt: clock(detected),
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
