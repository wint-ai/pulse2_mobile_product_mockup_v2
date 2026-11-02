// Bulk valve commands — the commanded state of each system's valve, plus the
// batch records of the bulk operations that produced them.
//
// FIRST PERSISTED VALVE STATE IN THIS APP
// Nothing else here persists a valve. `ValveControlCard.jsx:199` keeps its
// valve in component-local `useState(sys?.valve || 'closed')`, and
// `SystemPageV2Screen.jsx:1227-1229` says in as many words that "there is no
// valve mutation in this app". The one existing writer of anything
// valve-shaped is `simulatedAlerts.js` (`valveOverride`, under
// `pulse2-simulated-alerts`) — that is the SIMULATOR acting as the device,
// not the UI recording a user's command. The two are deliberately separate:
// this store never reads or writes that key.
//
// Stateless reads — every call hits localStorage. No in-memory cache to
// drift, matching investigatingStore / tagsStore / eventFeedbackStore.
//
// ── WHY A BULK OPERATION IS ONE RECORD, AND WHY IT IS NOT AN AUDIT ROW ────
// `src/data/lifeEvents.js` is the app's audit trail. Its notify rule, marked
// "locked 2026-06-04" at `lifeEvents.js:201`, is at `lifeEvents.js:234`:
//
//     isValveAction(template.type) && actor !== 'System'
//
// — one notification per system, with no concept of batching. A 1000-valve
// close written as 1000 `valve-closed` rows would therefore fire ~1000
// notifications at a single recipient in one burst. `lifeEvents.js` also has
// no write API at all (its only export is `getLifeEventsForSystem` at
// `lifeEvents.js:312`), and routing through `appendSimulatedEvent` would
// additionally suppress every touched system's static history via the
// pusher-owns-truth rule at `lifeEvents.js:313-320`.
//
// So: a bulk operation is recorded HERE as ONE batch record, and this store
// deliberately writes nothing to `lifeEvents`. That is the owner's open
// decision, not a settled one — whether a bulk action should notify at all,
// and as how many notifications, is a product question the locked rule does
// not contemplate. Until it is answered, one record is the honest shape.
//
// ── REPAINT IS THE CALLER'S JOB ───────────────────────────────────────────
// `src/utils/useDataRefresh.js` bumps on the `storage` event (cross-tab only,
// filtered on the `pulse2-` prefix at `:16`) and on a
// `BroadcastChannel('pulse2-push')` message of type
// `data-changed | push | demo-reset | actor-changed` (`:27-32`). A SAME-TAB
// write does not fire `storage`, so after calling `recordBulkValveCommand`
// the caller must also `publish({ type: 'data-changed' })` from
// `src/lib/pushBridge.js:127` — see `src/lib/pushSimFire.js:139` for the
// precedent — or bump its own local state. This store does not call
// `publish` itself: none of the five existing stores does, and that layering
// is deliberate.
//
// ── ON-DISK SHAPE ─────────────────────────────────────────────────────────
//   {
//     states: { [systemId]: 'open' | 'closed' },
//     batches: [                       // newest first
//       {
//         id,          // 'vb-<epoch ms>-<random>' — minted here, never passed in
//         at,          // epoch ms
//         action,      // 'open' | 'close'   — what the user asked for
//         state,       // 'open' | 'closed'  — what that action commands
//         actor,       // getCurrentActor() at press time; never 'System'
//                      //   for a human-initiated bulk action (lifeEvents.js:204-205)
//         scopeLabel,  // 'Tel Aviv HQ' / 'Acme Corp' — what the user saw
//         systemIds,   // string[] — the systems actually acted on
//         skipped: { offline, noValve, faulted, closing, alreadyInState },
//       },
//     ]
//   }
//
// Skipped systems live in the batch record ONLY. They are never written as
// commanded states: a system that was skipped because it is offline must
// still read back as whatever it was, and must never read as closed.

import { getCurrentActor } from '@/data/currentUser';

const KEY = 'pulse2-valve-commands';

/** The only two states a commanded valve can hold. A stored string that is
 *  not one of these is treated as absent — a hand-edited or half-written
 *  value must never make a valve read as closed when it is not. */
const VALVE_STATES = ['open', 'closed'];

/** The skipped buckets, in the order the confirm sheet lists them. Fixed here
 *  so a caller passing a partial object still produces a complete record. */
const SKIP_BUCKETS = ['offline', 'noValve', 'faulted', 'closing', 'alreadyInState'];

/** Keep only the most recent 50 batch records. A reviewer can run bulk
 *  actions all afternoon; without a cap the demo session grows localStorage
 *  without bound and eventually trips the quota, which would silently start
 *  dropping the per-system states too. 50 is far more history than any demo
 *  surface shows and still a trivial payload. */
const BATCH_CAP = 50;

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!isPlainObject(raw)) return { states: {}, batches: [] };
    return {
      states: isPlainObject(raw.states) ? raw.states : {},
      batches: Array.isArray(raw.batches) ? raw.batches : [],
    };
  } catch {
    // Corrupt, hand-edited or unreadable. Never throw into the render tree.
    return { states: {}, batches: [] };
  }
}

function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { /* ignore — private mode, quota, etc. */ }
}

/** `id` matches the mint used elsewhere in the data layer
 *  (`locationInfoStore.js:86`, `pushBridge.js:72`): epoch ms plus a short
 *  random suffix, so two batches fired in the same millisecond still differ.
 *  Ids and timestamps are generated here and are never accepted as arguments. */
function mintId() {
  return `vb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normaliseIds(list) {
  return Array.isArray(list) ? list.filter(id => typeof id === 'string' && id) : [];
}

function normaliseSkipped(skipped) {
  const src = isPlainObject(skipped) ? skipped : {};
  const out = {};
  for (const bucket of SKIP_BUCKETS) out[bucket] = normaliseIds(src[bucket]);
  return out;
}

// ─── Reads ─────────────────────────────────────────────────────────────────

/** The commanded state of one system's valve, or undefined if never
 *  commanded. A stored value that is not 'open' or 'closed' is rejected. */
export function getValveCommand(systemId) {
  if (!systemId) return undefined;
  const value = load().states[systemId];
  return VALVE_STATES.includes(value) ? value : undefined;
}

/** All commanded states, as { [systemId]: 'open' | 'closed' }. Entries whose
 *  stored value does not validate are dropped rather than returned. */
export function getAllValveCommands() {
  const { states } = load();
  const out = {};
  for (const [systemId, value] of Object.entries(states)) {
    if (VALVE_STATES.includes(value)) out[systemId] = value;
  }
  return out;
}

/**
 * Resolve a system's effective valve state: the command if one exists, else
 * the system's own `valve`.
 *
 * Note `systems.js:175` can leave `valve` null for a system with no valve at
 * all — this returns that null through untouched rather than inventing a
 * state for it.
 */
export function effectiveValveState(system) {
  if (!system) return undefined;
  const commanded = getValveCommand(system.id);
  return commanded !== undefined ? commanded : system.valve;
}

/** The batch records, newest first. `[]` on any failure. */
export function getBulkValveHistory() {
  return load().batches
    .filter(isPlainObject)
    // Stored newest-first already; the sort is defensive against a
    // hand-edited file and is stable, so same-millisecond batches keep
    // their insertion order.
    .sort((a, b) => (b.at || 0) - (a.at || 0));
}

// ─── Writes ────────────────────────────────────────────────────────────────

/**
 * Record ONE bulk operation: writes the per-system commanded states AND one
 * batch record. Returns the batch record (with its generated id and
 * timestamp), or null if the call was rejected.
 *
 * @param action      'close' | 'open' — what the user pressed.
 * @param systemIds   string[] — the systems actually acted on. Only these get
 *                    a commanded state.
 * @param skipped     { offline, noValve, faulted, closing, alreadyInState } —
 *                    arrays of system ids. Recorded in the batch, never as
 *                    commanded states.
 * @param scopeLabel  The location or account name the user saw on the sheet.
 * @param actor       The person who pressed the button. Defaults to
 *                    getCurrentActor(). Do NOT pass 'System' for a
 *                    human-initiated action (see lifeEvents.js:204-205).
 */
export function recordBulkValveCommand({
  action,
  systemIds,
  skipped,
  scopeLabel,
  actor,
} = {}) {
  if (action !== 'open' && action !== 'close') return null;

  const commandedState = action === 'close' ? 'closed' : 'open';
  const ids = normaliseIds(systemIds);

  const batch = {
    id: mintId(),
    at: Date.now(),
    action,
    state: commandedState,
    actor: actor || getCurrentActor(),
    scopeLabel: typeof scopeLabel === 'string' && scopeLabel ? scopeLabel : null,
    systemIds: ids,
    skipped: normaliseSkipped(skipped),
  };

  const state = load();
  // Only the acted-on systems get a commanded state. Skipped ids are in the
  // batch record and nowhere else.
  for (const id of ids) state.states[id] = commandedState;
  state.batches = [batch, ...state.batches.filter(isPlainObject)].slice(0, BATCH_CAP);
  save(state);

  return batch;
}

/** Wipe the whole store — every commanded state and every batch record.
 *  Reviewer / test affordance; also what a demo reset should call. */
export function clearValveCommands() {
  try { localStorage.removeItem(KEY); }
  catch { /* ignore */ }
}
