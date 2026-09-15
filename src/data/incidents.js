// Leak incident timelines — active and resolved.
//
// Generated from the fleet (see src/data/upstream/generateIncidents.js). The
// previous hand-written timelines were keyed to the Suffolk/Heathrow/CBRE/
// Tidhar systems and were removed with those fixtures; the step vocabulary and
// every lookup below are unchanged.
import { INCIDENTS_FROM_UPSTREAM } from './upstream/generateIncidents';

const INCIDENTS = INCIDENTS_FROM_UPSTREAM;

import { hasSimActivity } from './systems';

export function getActiveIncident(systemId) {
  // Pusher-owns-truth rule (Rami 2026-06-06): when the pusher has touched
  // this system, the static incident timeline is suppressed. The pusher's
  // sim alert drives the active alert, the pusher's events log drives
  // the Activity Timeline. Mixing static + sim creates a confusing dual
  // timeline. Hitting the pusher's "Clear all" button wipes sim state
  // and the static data comes back.
  if (hasSimActivity(systemId)) return null;
  return INCIDENTS.find(inc => inc.systemId === systemId && inc.status === 'active') || null;
}

export function getIncidentsForSystem(systemId) {
  if (hasSimActivity(systemId)) return [];
  return INCIDENTS.filter(inc => inc.systemId === systemId);
}

// Derive structured notification info from the alert-sent step text.
// Pattern: "<channels> sent to <recipients>" — e.g. "Push + Email sent to CBRE IL FM Team".
export function getNotification(incident) {
  if (!incident) return null;
  const sent = incident.steps?.find(s => s.type === 'alert-sent');
  if (!sent?.detail) return null;
  const m = sent.detail.match(/^(.+?)\s+sent to\s+(.+)$/i);
  if (!m) return null;
  const channelText = m[1].toLowerCase();
  const channels = [];
  if (/push/.test(channelText)) channels.push('push');
  if (/email/.test(channelText)) channels.push('email');
  if (/sms/.test(channelText)) channels.push('sms');
  const recipients = m[2].split(/,\s*/).map(s => s.trim()).filter(Boolean);
  return { channels, recipients };
}

// Map active incident to a Highlight/Detailed leak state.
// Active states per spec: Warning, Ongoing, ShutOff (Resolved goes to history).
export function getLeakState(incident) {
  if (!incident) return null;
  const types = new Set(incident.steps?.map(s => s.type) || []);
  if (types.has('valve-closed')) return 'ShutOff';
  if (types.has('continues') || types.has('volume-milestone')) return 'Ongoing';
  return 'Warning';
}
// build-tag: 1780345046

// Cache bust: 1780345083
export const BUILD_VERSION = '1780345083';
