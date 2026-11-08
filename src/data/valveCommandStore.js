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
// ── THE TRANSIENT PHASE LIVES HERE TOO (2026-11-08) ───────────────────────
// Owner: "When shutting off valve [...] there is no any feedback that
// something was happens." The Figma answer is a three-step busy sequence
// (Sending / Closing / Verifying) before the valve reads Closed.
//
// IT IS NOT COMPONENT STATE. A `useState` timer dies the moment the user
// opens the drawer, taps a tab or reloads — and the three steps are a PROMISE
// the UI made about a command that is supposedly in flight. Dropping back to
// an idle "Close valve" button after a navigation is the exact wrong-belief
// failure the valve surfaces exist to prevent.
//
// THE PHASE IS DERIVED FROM ELAPSED TIME, NOT STORED. One field (`at`) and a
// pure function (`valvePhaseAt`) beat four stored phases that can disagree
// with each other: a reload re-derives rather than resumes, there is no
// transition to miss while the tab is backgrounded, and the whole sequence is
// testable without a clock mock beyond `now`.
//
// THE COMMANDED STATE IS WRITTEN AT SETTLE, NOT AT START. Figma is explicit:
// in all three busy states the position word still reads `Open`
// (199683:25832 / :25851 / :25870) and only 199683:25891 reads `Closed`. A
// valve that reports closed while it is still being asked to close is a lie
// the user will act on.
//
// ── ON-DISK SHAPE ─────────────────────────────────────────────────────────
//   {
//     states: { [systemId]: 'open' | 'closed' },
//     pending: {                       // the in-flight commands
//       [systemId]: { action: 'open' | 'close', at, actor },
//     },
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

/* ── THE SINGLE-VALVE TRANSITION, IN MILLISECONDS ──────────────────────────
 * The three Figma busy frames, in order, with the durations this app gives
 * them. THEY ARE A DEMO TIMING, NOT A MEASUREMENT — nothing in this mockup
 * talks to a valve, and no telemetry for a real actuation exists here. They
 * are named and exported so the owner can move them in ONE place, and so a
 * test can assert the sequence without copying the numbers.
 *
 *   sending    199683:25832  "Sending…"          the command leaves the app
 *   acting     199683:25851  "Closing…"          the valve is moving
 *   verifying  199683:25870  "Verifying Closed"  + caption "Up to 8 minutes"
 *
 * THE CAPTION AND THE TIMER DISAGREE ON PURPOSE. The frame's caption is the
 * real-world worst case the hardware owes ("Up to 8 minutes"); the demo
 * settles in nine seconds, because a reviewer cannot sit through eight
 * minutes of spinner to see the next state. FLAGGED for the owner. */
export const VALVE_SEND_MS = 1200;
export const VALVE_ACT_MS = 2800;
export const VALVE_VERIFY_MS = 5000;
export const VALVE_TRANSITION_MS = VALVE_SEND_MS + VALVE_ACT_MS + VALVE_VERIFY_MS;

/** A pending command older than this was left behind by a session that never
 *  came back. It is not resumed and it is not promoted to a commanded state —
 *  the app has no idea what the valve did in the meantime, and guessing is
 *  the whole class of defect this file argues against. */
const PENDING_MAX_AGE_MS = 10 * 60 * 1000;

/** Clock skew tolerance. A stored `at` in the future is a hand-edited or
 *  clock-adjusted record; a few seconds is absorbed, more is rejected. */
const CLOCK_SKEW_MS = 5000;

/* ── THE BULK BATCH'S OWN, DELIBERATELY SIMPLER CLOCK ──────────────────────
 * Owner: "on bulk actio keep it simple -dont need allstates". So a batch has
 * TWO phases, not four: it is running, and then it has settled. No per-system
 * machine, no Verifying, no spinner per row. */
export const BULK_SETTLE_MS = 2600;

/** How long a settled batch stays on screen as a result. A banner about a
 *  bulk close the user ran this morning is not news on this evening's reload,
 *  and this store is read fresh on every mount. */
const BULK_RESULT_WINDOW_MS = 10 * 60 * 1000;

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!isPlainObject(raw)) return { states: {}, pending: {}, batches: [] };
    return {
      states: isPlainObject(raw.states) ? raw.states : {},
      pending: isPlainObject(raw.pending) ? raw.pending : {},
      batches: Array.isArray(raw.batches) ? raw.batches : [],
    };
  } catch {
    // Corrupt, hand-edited or unreadable. Never throw into the render tree.
    return { states: {}, pending: {}, batches: [] };
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

/**
 * A stored pending entry, or null if it does not validate.
 *
 * REJECTED RATHER THAN REPAIRED, which is this file's standing rule: an entry
 * with a bad `action` cannot be guessed at, and an entry with a bad `at`
 * cannot be placed on the timeline. Either one would otherwise drive a
 * progress indicator over a command nobody can describe.
 *
 *   · `action` must be exactly 'open' or 'close'.
 *   · `at` must be a finite epoch, not more than CLOCK_SKEW_MS in the future
 *     and not older than PENDING_MAX_AGE_MS.
 */
function validPending(entry, now) {
  if (!isPlainObject(entry)) return null;
  if (entry.action !== 'open' && entry.action !== 'close') return null;
  if (!Number.isFinite(entry.at)) return null;
  const elapsed = now - entry.at;
  if (elapsed < -CLOCK_SKEW_MS) return null;
  if (elapsed > PENDING_MAX_AGE_MS) return null;
  return entry;
}

/** What `action` commands. One place, so no caller re-spells the mapping. */
function stateForAction(action) {
  return action === 'close' ? 'closed' : 'open';
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
 *
 * ── AND WHAT AN IN-FLIGHT COMMAND DOES TO IT (2026-11-08) ────────────────
 * Nothing, until it settles. While a transition is running this returns the
 * valve's state BEFORE the command — Figma keeps the position word at `Open`
 * through Sending, Closing and Verifying, and reads `Closed` only once the
 * sequence is done. Once the window has elapsed the commanded state is
 * returned even if `settleValveCommand` has not run yet, so a surface that
 * never mounted the card still reads the right answer.
 *
 * ONE `load()` PER CALL, unchanged: the bulk screens call this per system
 * over a scope that can run to four figures.
 */
export function effectiveValveState(system, now = Date.now()) {
  if (!system) return undefined;
  const state = load();
  const stored = state.states[system.id];
  const commanded = VALVE_STATES.includes(stored) ? stored : undefined;
  const entry = validPending(state.pending[system.id], now);
  if (entry && now - entry.at >= VALVE_TRANSITION_MS) return stateForAction(entry.action);
  return commanded !== undefined ? commanded : system.valve;
}

// ─── The transient phase ───────────────────────────────────────────────────

/**
 * Which Figma frame an elapsed figure is in: 'sending' | 'acting' |
 * 'verifying' | 'settled'. PURE — no storage, no clock — so the sequence can
 * be asserted end to end from a test without a timer.
 */
export function valvePhaseAt(elapsed) {
  if (!Number.isFinite(elapsed) || elapsed < 0) return null;
  if (elapsed < VALVE_SEND_MS) return 'sending';
  if (elapsed < VALVE_SEND_MS + VALVE_ACT_MS) return 'acting';
  if (elapsed < VALVE_TRANSITION_MS) return 'verifying';
  return 'settled';
}

/**
 * Begin a single-system command. Returns the written entry, or null if the
 * call was rejected.
 *
 * It writes NO commanded state — see the header. `settleValveCommand` does
 * that, and only once the window has run.
 */
export function startValveCommand({ systemId, action, actor } = {}) {
  if (typeof systemId !== 'string' || !systemId) return null;
  if (action !== 'open' && action !== 'close') return null;

  const entry = { action, at: Date.now(), actor: actor || getCurrentActor() };
  const state = load();
  state.pending[systemId] = entry;
  save(state);
  return { systemId, ...entry };
}

/**
 * The in-flight command for one system, with its phase, or null.
 *
 * `now` is a parameter rather than a read so a caller that is already
 * ticking (the card holds one interval for the whole sequence) passes its own
 * clock and every readout on that frame agrees.
 */
export function getValveTransition(systemId, now = Date.now()) {
  if (!systemId) return null;
  const entry = validPending(load().pending[systemId], now);
  if (!entry) return null;
  const elapsed = now - entry.at;
  const phase = valvePhaseAt(elapsed);
  if (!phase) return null;
  return {
    systemId,
    action: entry.action,
    actor: entry.actor,
    at: entry.at,
    elapsed,
    phase,
    state: stateForAction(entry.action),
  };
}

/** Every in-flight command, as { [systemId]: transition }. Entries that do
 *  not validate are dropped rather than returned. */
export function getAllValveTransitions(now = Date.now()) {
  const { pending } = load();
  const out = {};
  for (const systemId of Object.keys(pending)) {
    const entry = validPending(pending[systemId], now);
    if (!entry) continue;
    const elapsed = now - entry.at;
    const phase = valvePhaseAt(elapsed);
    if (!phase) continue;
    out[systemId] = {
      systemId,
      action: entry.action,
      actor: entry.actor,
      at: entry.at,
      elapsed,
      phase,
      state: stateForAction(entry.action),
    };
  }
  return out;
}

/**
 * Promote a transition that has run its course into a commanded state, and
 * drop the pending entry. Returns the state written, or null when there was
 * nothing to settle.
 *
 * IDEMPOTENT, because the card calls it from a tick and a React effect may
 * run it twice. A pending entry that no longer validates — abandoned, or
 * hand-edited — is SWEPT, never promoted: the app does not know what that
 * valve did.
 */
export function settleValveCommand(systemId, now = Date.now()) {
  if (!systemId) return null;
  const state = load();
  if (state.pending[systemId] === undefined) return null;

  const entry = validPending(state.pending[systemId], now);
  if (!entry) {
    delete state.pending[systemId];
    save(state);
    return null;
  }
  if (now - entry.at < VALVE_TRANSITION_MS) return null;

  const commanded = stateForAction(entry.action);
  state.states[systemId] = commanded;
  delete state.pending[systemId];
  save(state);
  return commanded;
}

/** Drop an in-flight command without recording a state. Nothing in the UI
 *  calls this today — there is no "cancel" on a valve command — but a demo
 *  reset needs to be able to clear one system without wiping the store. */
export function cancelValveCommand(systemId) {
  if (!systemId) return;
  const state = load();
  if (state.pending[systemId] === undefined) return;
  delete state.pending[systemId];
  save(state);
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

// ─── The bulk batch's two phases ───────────────────────────────────────────

/**
 * 'running' | 'settled' for one batch record, or null if it does not place on
 * the timeline. TWO phases, by the owner's instruction — see BULK_SETTLE_MS.
 */
export function bulkValvePhaseAt(elapsed) {
  if (!Number.isFinite(elapsed) || elapsed < -CLOCK_SKEW_MS) return null;
  return elapsed < BULK_SETTLE_MS ? 'running' : 'settled';
}

/**
 * The batch the bulk screen should be reporting on right now, with its phase
 * and elapsed figure — or null when there is nothing to report.
 *
 * WHY THE SCREEN DOES NOT HOLD THIS IN `useState`: the progress and the
 * result are the feedback the owner asked for, and a reload or a tab change
 * mid-batch would otherwise snap the screen back to idle as if the command
 * had never been pressed.
 *
 * A batch is dropped from this view when it has been dismissed, when it is
 * older than BULK_RESULT_WINDOW_MS, or when its timestamp does not place.
 * `getBulkValveHistory` still returns all of them.
 */
export function getActiveBulkValveBatch(now = Date.now()) {
  const [batch] = getBulkValveHistory();
  if (!batch) return null;
  if (batch.dismissedAt) return null;
  if (!Number.isFinite(batch.at)) return null;
  const elapsed = now - batch.at;
  if (elapsed > BULK_RESULT_WINDOW_MS) return null;
  const phase = bulkValvePhaseAt(elapsed);
  if (!phase) return null;
  return { ...batch, elapsed, phase };
}

/** Mark a batch as dismissed, so its result stops being reported. The record
 *  itself survives — `getBulkValveHistory` is the history, not the banner. */
export function dismissBulkValveBatch(id) {
  if (typeof id !== 'string' || !id) return;
  const state = load();
  let touched = false;
  state.batches = state.batches.filter(isPlainObject).map((b) => {
    if (b.id !== id || b.dismissedAt) return b;
    touched = true;
    return { ...b, dismissedAt: Date.now() };
  });
  if (touched) save(state);
}

/** Wipe the whole store — every commanded state, every in-flight command and
 *  every batch record. Reviewer / test affordance; also what a demo reset
 *  should call. */
export function clearValveCommands() {
  try { localStorage.removeItem(KEY); }
  catch { /* ignore */ }
}
