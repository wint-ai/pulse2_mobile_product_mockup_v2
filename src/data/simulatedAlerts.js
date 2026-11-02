// Simulated-alert overlay store, keyed by systemId.
// Stateless: every read goes to localStorage. No in-memory cache.
//
// The sim alert is the canonical record of an in-flight pusher-driven event.
// Shape:
//   {
//     type:     'leak-high' | 'leak-low' | 'valve-error' | 'offline' | 'power-lost',
//     phase:    'warning' | 'ongoing' | 'shutoff' | 'ended' (water events only),
//     flowRate: string,
//     volume:   string,
//     startedAt: 'HH:MM',
//     age:       string  (how long it ran; written on the ENDED record from
//                         the End-of-Leak push's own `duration` param, and
//                         read back by EventFocusOverlay's concluded layout),
//     resolved:  boolean,
//     resolvedAt: 'HH:MM',
//     valveOverride: 'closing' | 'closed' (optional, drives sys.valve overlay),
//     events:    [{ type, timestamp, detail, variantId }],  // append-only log
//     label:     string (for non-water alerts only),
//   }

const KEY = 'pulse2-simulated-alerts';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}
function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { /* ignore */ }
}

export function getSimulatedAlerts() {
  return load();
}

export function getSimulatedAlert(systemId) {
  if (!systemId) return null;
  return load()[systemId] || null;
}

export function setSimulatedAlert(systemId, alert) {
  if (!systemId || !alert) return;
  const state = load();
  state[systemId] = alert;
  save(state);
}

export function clearSimulatedAlert(systemId) {
  if (!systemId) return;
  const state = load();
  if (!state[systemId]) return;
  delete state[systemId];
  save(state);
}

export function clearAllSimulatedAlerts() {
  save({});
}

// Back-compat shim - was used to bust the removed in-memory cache.
export function reloadSimulatedAlerts() { /* no-op */ }
