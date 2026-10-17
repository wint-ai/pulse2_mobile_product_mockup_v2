// Persists Water Event feedback captured by WaterEventFeedbackSheet.
//
// WHY A SECOND STORE
// `tagsStore.js` holds the v1 taxonomy — 20 chips across two groups, every tag
// a standalone row, no primary question (PRD 15 § 5). The feedback sheet asks
// something that store has no field for: "Was this worth alerting about?" One
// session produces ONE answer plus optional detail, not N independent tags, so
// squeezing it into `addTag` would either lose the yes/no or invent a fake chip
// to carry it. tagsStore also still has live callers (LeakDetail, ActivityTab)
// and is deliberately left untouched.
//
// KEY SHAPE — same opaque-id convention as tagsStore (PRD 15 § 10.4). The
// caller decides what the key means:
//   • Live / active event → pass `sys.id` (one active event per system).
//   • Closed event        → pass the closed event's stable `event.id`.
// Params are named `eventKey` here to make that explicit.
//
// On-disk shape:
//   {
//     [eventKey]: [
//       {
//         trigger,   // 'event-ended' | 'ignore'  — which flow captured this
//         answer,    // 'yes' | 'no'              — the primary question
//         chips,     // string[]                  — scoped follow-up chips
//         note,      // string | null             — free text, <= 140 chars
//         fixed,     // 'fixed' | 'not-yet' | 'resolved-on-its-own' | null
//         points,    // number — demo gamification score for this session
//         systemId,  // string | null — kept even when eventKey is an event id
//         actor,     // getCurrentActor() at capture time
//         at,        // epoch ms
//       },
//     ]
//   }
//
// An array (not a single object) because an event can legitimately be
// annotated twice: ignored while live, then reviewed again after it ends.

import { getCurrentActor } from '@/data/currentUser';

const STORAGE_KEY = 'pulse2-event-feedback';

/** The three answers the "Was it fixed?" toggle can produce (Yes branch only). */
export const FIXED_STATES = {
  FIXED: 'fixed',
  NOT_YET: 'not-yet',
  SELF_RESOLVED: 'resolved-on-its-own',
};

/** Label shown for each `fixed` value. The sheet and any read-back surface
 *  must agree, so the mapping lives with the data rather than in the JSX. */
export const FIXED_STATE_LABEL = {
  [FIXED_STATES.FIXED]: 'Fixed',
  [FIXED_STATES.NOT_YET]: 'Not yet',
  [FIXED_STATES.SELF_RESOLVED]: 'Resolved on its own',
};

// The review mockup opens on "Wint has learned 24 times from your feedback." —
// a reviewer should not see "learned 1 times" on a fresh demo build. This
// baseline is DEMO DRESSING ONLY; `getFeedbackCount()` below returns the real,
// unpadded number for anything that actually counts rows.
const DEMO_LEARNED_BASELINE = 23;

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return raw && typeof raw === 'object' ? raw : {};
  } catch { return {}; }
}

function persist(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { /* ignore — private mode, quota, etc. */ }
}

// Stateless reads: every call hits localStorage, matching tagsStore. The
// in-memory cache that used to live in these stores drifted across tabs.

// ─── Reads ─────────────────────────────────────────────────────────────────

/** Every feedback record for this event, oldest → newest. `[]` if none. */
export function getFeedback(eventKey) {
  if (!eventKey) return [];
  const list = load()[eventKey];
  return Array.isArray(list) ? list : [];
}

/** The most recent record, or null. The common read — surfaces show the
 *  latest answer, not the history. */
export function getLatestFeedback(eventKey) {
  const list = getFeedback(eventKey);
  return list.length ? list[list.length - 1] : null;
}

/** True if this event has been answered at least once. */
export function hasFeedback(eventKey) {
  return getFeedback(eventKey).length > 0;
}

/**
 * The key the push's "Tag the cause" path writes its answer under.
 *
 * SHARED ON PURPOSE — two files depend on this exact string and neither may
 * spell it itself. SystemPageV2Screen mounts WaterEventFeedbackSheet with it
 * (it cannot use a real event id; see the commentary there), and
 * PushNotifications reads it back to decide whether LE_01's Tag CTA shows its
 * "✓ Tagged" done-state. A duplicated literal is how the write and the read
 * drift apart, so the convention lives here, with the store that holds it.
 */
export function tagEventKey(systemId) {
  return systemId ? `${systemId}:event-ended` : null;
}

/**
 * True once the owner has completed the tag-path feedback for this system.
 *
 * Deliberately NOT `hasFeedback(systemId)`: the ignore flow writes under the
 * bare system id, so the bare key would both miss a real tag answer and
 * report "Tagged" after an *ignore* the user never tagged.
 */
export function hasTagFeedback(systemId) {
  return hasFeedback(tagEventKey(systemId));
}

/** Every record across every event, newest → oldest. For a future More-page
 *  "your feedback" list. */
export function getAllFeedback() {
  const state = load();
  const out = [];
  for (const [eventKey, list] of Object.entries(state)) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) out.push({ eventKey, ...entry });
  }
  return out.sort((a, b) => (b.at || 0) - (a.at || 0));
}

/** How many times the user has actually answered. Real count, no padding. */
export function getFeedbackCount() {
  return getAllFeedback().length;
}

/** The number the closing "Thanks!" panel quotes. Real count + the demo
 *  baseline, so a fresh build reads like the review mockup. */
export function getLearnedCount() {
  return DEMO_LEARNED_BASELINE + getFeedbackCount();
}

/** Lifetime demo points across every answer. The sheet shows the points for
 *  the session it just ran; this is what a running-total chip elsewhere in the
 *  app would read. */
export function getPointsTotal() {
  return getAllFeedback().reduce((sum, e) => sum + (Number(e.points) || 0), 0);
}

// ─── Writes ────────────────────────────────────────────────────────────────

/**
 * Append one feedback record.
 *
 * Only `answer` is required beyond the key — a single tap on Yes or No is a
 * complete, valid answer and must persist on its own. Everything else is
 * optional detail (see the mockup's "Nothing is mandatory").
 *
 * Returns the stored record, or null if it was rejected.
 */
export function addFeedback(eventKey, {
  trigger = 'event-ended',
  answer,
  chips,
  note,
  fixed,
  points,
  systemId,
  actor,
} = {}) {
  if (!eventKey) return null;
  if (answer !== 'yes' && answer !== 'no') return null;

  const entry = {
    trigger: trigger === 'ignore' ? 'ignore' : 'event-ended',
    answer,
    chips: Array.isArray(chips) ? chips.filter(Boolean) : [],
    // Trimmed and clipped on the way in: the textarea caps at 140, but a
    // caller writing straight to the store should not be able to beat it.
    note: typeof note === 'string' && note.trim() ? note.trim().slice(0, 140) : null,
    fixed: Object.values(FIXED_STATES).includes(fixed) ? fixed : null,
    points: Number.isFinite(points) ? points : 0,
    systemId: systemId || null,
    actor: actor || getCurrentActor(),
    at: Date.now(),
  };

  const state = load();
  state[eventKey] = [...(state[eventKey] || []), entry];
  persist(state);
  return entry;
}

/** Remove the record at index `i`. */
export function removeFeedbackAt(eventKey, i) {
  if (!eventKey) return;
  const state = load();
  const list = state[eventKey] || [];
  if (i < 0 || i >= list.length) return;
  state[eventKey] = [...list.slice(0, i), ...list.slice(i + 1)];
  persist(state);
}

/** Remove every record for one event. */
export function clearFeedback(eventKey) {
  if (!eventKey) return;
  const state = load();
  if (!state[eventKey]) return;
  delete state[eventKey];
  persist(state);
}

/** Wipe the whole store. Reviewer / test affordance. */
export function clearAllFeedback() {
  try { localStorage.removeItem(STORAGE_KEY); }
  catch { /* ignore */ }
}
