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
//         id,        // string — stable, unique, assigned on write. The ONLY
//                    //   way to patch a stored row (see setFeedbackNote).
//                    //   Rows written before 2026-11-02 have none.
//         trigger,   // 'event-ended' | 'ignore'  — which flow captured this
//         verdict,   // one of VERDICT_OPTIONS | null — what the alert was WORTH
//         answer,    // 'yes' | 'no'              — derived from `verdict` when
//                    //   there is one; otherwise the caller's own (the ignore
//                    //   shim, and every record written before 2026-11-02)
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
//
// -- 2026-11-02: `verdict` IS THE FIRST-CLASS FIELD; `answer` IS DERIVED ----
// The owner removed the event-ended flow's primary question ("i want to
// remove the yse no step / wht its needed?") and replaced it with one step of
// four verdicts. With no question there is no `answer` to supply -- and the
// gate below used to reject, UNCONDITIONALLY AND SILENTLY, every record whose
// answer was not 'yes'/'no'. Shipping the new step against the old gate would
// have made the flow appear to work while storing nothing at all: return
// null, no throw, no console warning.
//
// So `verdict` is now the field the event-ended flow writes, `answer` is
// derived from it for every existing reader, and the gate admits a record
// that carries EITHER. Nothing about stored records changed: rows written
// before today have an `answer` and no `verdict`, every read path below is
// untouched, and they read back exactly as they did.
//
// The ignore flow's derived-`answer` shim (WaterEventFeedbackSheet's header
// documents it) still works byte for byte: it passes an `answer` and no
// `verdict`, which is the second arm of the gate.
//
// ── 2026-11-02: ONE ROW CAN NOW BE PATCHED AFTER IT IS WRITTEN ────────────
// The event-ended flow commits on the chip tap and THEN offers an optional
// note on the acknowledgement panel, so the note arrives after the row
// exists. This store appends per `eventKey` — that is its whole write path —
// so a second addFeedback for the same answer would silently produce TWO rows
// for one answer, double every count that reads it, and leave the noted copy
// and the bare copy both on disk with no way to tell which is real.
//
// `setFeedbackNote` exists so that cannot happen. It is an UPDATE and only an
// update: it finds a row by `id` and replaces it in place, and there is no
// code path in it that can grow the array. Rows therefore carry an `id` now.

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
/**
 * THE VERDICT -- what the event-ended step captures since 2026-11-02.
 *
 * RULED BY THE OWNER, TWICE AND EXPLICITLY. First the removal -- "i want to
 * remove the yse no step / wht its needed?" -- then the replacement, which he
 * sketched ("end of Leak , Water Waste , UNique usage-maintenece or somthing,
 * UNencassery alert") and then renamed himself ("Unique usage / maintenance
 * >>> Unusual, no issue"). These five strings are HIS WORDS, transcribed.
 * That includes the lower-case "a" in "Unnecessary alert", which is how he
 * wrote it and which a tidy-up must not "fix" -- note that the ignore flow's
 * own, older control is capitalised ("Unnecessary Alert") and they are two
 * different strings on purpose, from two different rulings.
 *
 * IT IS A VERDICT AXIS, NOT A CAUSE AXIS. Each option says what the alert was
 * WORTH, not what the water WAS:
 *
 *   Leak               the alert was right, and it was a real fault
 *   Water Waste        the alert was right, and it was real waste
 *   Unusual, no issue  water really ran, the detector was correct, and it did
 *                      not matter
 *   Unnecessary alert  nothing unusual ran -- the detector was wrong
 *
 * THE THIRD AND FOURTH ARE THE PAIR THAT GETS CONFUSED, and that confusion is
 * the single biggest source of bad data in a taxonomy shaped like this. They
 * separate on one question: DID WATER ACTUALLY RUN? Yes -> "Unusual, no
 * issue". No -> "Unnecessary alert". No helper copy is written for that here;
 * authoring it is the owner's call, not this file's.
 *
 * SOMETHING_ELSE is the catch-all the sheet has always carried, kept LAST and
 * unchanged in value. Its share is a DIAGNOSTIC: if it absorbs more than ~15%
 * of answers the named list is wrong, not the users.
 *
 * WHY THE VOCABULARY LIVES HERE AND NOT IN THE SHEET. `addFeedback`'s gate
 * has to recognise a verdict to admit the record, so the sheet and the store
 * must agree on the exact strings. A literal spelled in both places is how
 * the write and the read drift apart -- the same argument `tagEventKey` below
 * makes about its key. The sheet imports these.
 *
 * THESE FIVE ARE THE OWNER'S OWN WORDS. The ignore flow's four below are NOT
 * -- see IGNORE_VERDICTS, and mind the difference before editing either set.
 */
export const VERDICTS = {
  LEAK: 'Leak',
  WATER_WASTE: 'Water Waste',
  UNUSUAL_NO_ISSUE: 'Unusual, no issue',
  UNNECESSARY_ALERT: 'Unnecessary alert',
  SOMETHING_ELSE: 'Something else',
};

/** DOM order, catch-all last. The sheet renders this array directly, so the
 *  order here is the order on screen. */
export const VERDICT_OPTIONS = [
  VERDICTS.LEAK,
  VERDICTS.WATER_WASTE,
  VERDICTS.UNUSUAL_NO_ISSUE,
  VERDICTS.UNNECESSARY_ALERT,
  VERDICTS.SOMETHING_ELSE,
];

/**
 * THE IGNORE FLOW'S VERDICTS -- a DIFFERENT AXIS, not a translation of the
 * four above. Adopted 2026-11-02 after the owner saw the step still drawing
 * the old six causes: "And so this one shows the wrong options, not what is
 * discussed before."
 *
 * PROVENANCE, AND IT IS NOT THE SAME AS THE SET ABOVE. These four are
 * DRAFTED, proposed in discussion and then adopted by the owner, who has
 * twice referred to them as settled. They are not strings he typed. The
 * event-ended four ARE his own words, typed by him, and must be defended
 * character for character. THESE FOUR ARE OPEN TO BEING QUESTIONED --
 * question them to him, not by editing them here.
 *
 * "Expected usage" is lifted from Flume and EPA WaterSense, which use it
 * independently for sanctioned non-leak flow. It reads as cause and verdict
 * at once and, unlike anything with "false" or "wrong" in it, does not imply
 * the system misfired.
 *
 * WHY THE AXIS DIFFERS, which is what governs the edges. At ignore time THE
 * EVENT IS STILL RUNNING, so there is nothing to ask about what it WAS. The
 * question is why it is acceptable to leave it, and each answer implies a
 * different system behaviour:
 *
 *   Expected usage     real water, sanctioned -- the candidate for a bounded
 *                      suppression RULE later, not just this event
 *   Being handled      real, known, someone is on it -- suppress THIS event
 *   Not a real alert   the detector was wrong -- the false-positive report,
 *                      and the only one of the four that derives answer 'no'
 *   Something else     diagnostic; above ~15% share the named three are wrong
 */
export const IGNORE_VERDICTS = {
  EXPECTED_USAGE: 'Expected usage',
  BEING_HANDLED: 'Being handled',
  NOT_A_REAL_ALERT: 'Not a real alert',
  // The same catch-all string as the event-ended set, and valid in both.
  SOMETHING_ELSE: 'Something else',
};

/** DOM order, catch-all last -- same rule as VERDICT_OPTIONS. */
export const IGNORE_VERDICT_OPTIONS = [
  IGNORE_VERDICTS.EXPECTED_USAGE,
  IGNORE_VERDICTS.BEING_HANDLED,
  IGNORE_VERDICTS.NOT_A_REAL_ALERT,
  IGNORE_VERDICTS.SOMETHING_ELSE,
];

/**
 * TWO VOCABULARIES, KEYED BY TRIGGER -- not one pooled union, and the choice
 * is load-bearing.
 *
 * A flat union of all nine strings would admit "Expected usage" on an
 * event-ended row and "Leak" on an ignore row. Both are nonsense, both would
 * pass silently, and nothing on disk would mark the row as wrong. Worse, the
 * two sets answer DIFFERENT QUESTIONS -- what the event WAS, versus why it is
 * acceptable to leave a running one -- so a consumer that pooled them would
 * be averaging two populations and getting a number that means nothing. That
 * is a one-line mistake to make and an invisible one to debug.
 *
 * Keying the vocabulary by trigger makes it impossible to write instead of
 * merely discouraged: a row carrying "Expected usage" can ONLY have
 * trigger 'ignore', because that is the only trigger under which the gate
 * would have let it in. `trigger` is therefore not just a label on the row,
 * it is what the row was validated against.
 */
const VERDICTS_BY_TRIGGER = {
  'event-ended': VERDICT_OPTIONS,
  ignore: IGNORE_VERDICT_OPTIONS,
};

/** Normalise the way addFeedback always has, in one place. */
function asTrigger(trigger) {
  return trigger === 'ignore' ? 'ignore' : 'event-ended';
}

/** Every verdict this store knows, both flows. For a reader that genuinely
 *  wants the union -- a label map, a filter UI -- and NOT for validation,
 *  which must stay per-trigger. */
export const ALL_VERDICT_OPTIONS = [
  ...VERDICT_OPTIONS,
  ...IGNORE_VERDICT_OPTIONS.filter((v) => !VERDICT_OPTIONS.includes(v)),
];

/** A membership test, not a shape test: the gate must widen for a REAL
 *  verdict and stay shut on junk, so an arbitrary non-empty string is not
 *  good enough -- and it must be a verdict of THIS record's own flow, so a
 *  cross-vocabulary value is junk too. */
export function isVerdict(verdict, trigger) {
  return typeof verdict === 'string'
    && VERDICTS_BY_TRIGGER[asTrigger(trigger)].includes(verdict);
}

/**
/**
 * The verdicts that mean THE ALERT WAS WRONG -- one per vocabulary, and there
 * will never be more than one per vocabulary, because "the detector was
 * mistaken" is a single claim however many ways there are to be right.
 *
 *   event-ended  "Unnecessary alert"  (the owner's own words, lower-case a)
 *   ignore       "Not a real alert"
 *
 * They are deliberately NOT the same string. Each belongs to its own flow's
 * axis and each was written for its own screen; collapsing them into one
 * shared literal would make a cross-flow value look valid to isVerdict.
 */
const VERDICTS_MEANING_THE_ALERT_WAS_WRONG = new Set([
  VERDICTS.UNNECESSARY_ALERT,
  IGNORE_VERDICTS.NOT_A_REAL_ALERT,
]);

/**
 * `answer` from `verdict` -- the back-compat bridge, TOTAL BY CONSTRUCTION.
 *
 * Every reader written before 2026-11-02 expects `answer` to be 'yes' or
 * 'no', and they keep getting one. Exactly two verdicts mean the alert was
 * wrong (above); every other verdict, in either vocabulary, agrees the alert
 * was worth making, whatever the water turned out to be.
 *
 * THE TOTALITY IS THE POINT, and it survived the second vocabulary intact.
 * This is a PREDICATE with two arms -- `Set.prototype.has` returns a boolean
 * for every possible input, including undefined, a number or an object. It is
 * not a lookup whose miss falls through to undefined, not an object index,
 * not a `switch`. There is no input for which this returns anything but 'yes'
 * or 'no'. The gate below is silent on rejection, so an `answer` that could
 * ever arrive there as undefined would void records with nothing to show for
 * it. If a third vocabulary ever arrives, add its one wrong-verdict to the
 * Set and KEEP THAT PROPERTY.
 */
export function answerForVerdict(verdict) {
  return VERDICTS_MEANING_THE_ALERT_WAS_WRONG.has(verdict) ? 'no' : 'yes';
}

const DEMO_LEARNED_BASELINE = 23;

/** One spelling of the note rule, so a write and a patch cannot disagree.
 *  The textarea caps at 140, but a caller writing straight to the store
 *  should not be able to beat it. Blank (or non-string) becomes null, which
 *  is what "no note" has always looked like on disk. */
function cleanNote(note) {
  return typeof note === 'string' && note.trim() ? note.trim().slice(0, 140) : null;
}

/** Stable per row, and unique enough to patch by.
 *
 *  Not a bare counter and not a bare timestamp: this module is stateless and
 *  reloads from localStorage on every call, so a counter restarts with the
 *  tab, and two rows written in the same millisecond — which a test does
 *  routinely — would share a timestamp. The random suffix is what makes the
 *  pair unique; the time prefix is what makes it readable on disk. */
function newId(at) {
  return `${at.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

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
 * Beyond the key, a record must carry EITHER a `verdict` (what the
 * event-ended step captures since 2026-11-02) OR an explicit 'yes'/'no'
 * `answer` (the ignore flow's shim, and every record written before that).
 * One tap on one verdict is a complete, valid answer and must persist on its
 * own. Everything else is optional detail ("Nothing is mandatory").
 *
 * THE GATE WIDENED, IT DID NOT OPEN. It still rejects silently, and it still
 * rejects junk: `verdict` is checked for MEMBERSHIP of this record's OWN
 * trigger's vocabulary, not merely for being a string, so a typo, a label the
 * sheet no longer renders, a number, an object -- or a verdict belonging to
 * the OTHER flow -- is refused exactly as before. What changed is that a
 * record carrying a real verdict no longer needs an `answer` the flow has no
 * way to ask for.
 *
 * THE TRIGGER IS CHECKED FIRST AND THE VERDICT AGAINST IT, which is what
 * makes `trigger` load-bearing rather than decorative: an "Expected usage"
 * row can only exist as an ignore row, so the two populations can never be
 * pooled by accident downstream.
 *
 * `answer` is DERIVED whenever a verdict is present, and the derivation wins
 * over anything the caller passed: the two can then never contradict each
 * other on disk, which is the failure mode a second writable field invites.
 *
 * Returns the stored record, or null if it was rejected.
 */
export function addFeedback(eventKey, {
  trigger = 'event-ended',
  verdict,
  answer,
  chips,
  note,
  fixed,
  points,
  systemId,
  actor,
} = {}) {
  if (!eventKey) return null;
  // Normalised once, BEFORE the gate: it is what the verdict is validated
  // against, not just a field on the row.
  const flow = asTrigger(trigger);
  const hasVerdict = isVerdict(verdict, flow);
  if (!hasVerdict && answer !== 'yes' && answer !== 'no') return null;

  const at = Date.now();
  const entry = {
    id: newId(at),
    trigger: flow,
    verdict: hasVerdict ? verdict : null,
    answer: hasVerdict ? answerForVerdict(verdict) : answer,
    chips: Array.isArray(chips) ? chips.filter(Boolean) : [],
    note: cleanNote(note),
    fixed: Object.values(FIXED_STATES).includes(fixed) ? fixed : null,
    points: Number.isFinite(points) ? points : 0,
    systemId: systemId || null,
    actor: actor || getCurrentActor(),
    at,
  };

  const state = load();
  state[eventKey] = [...(state[eventKey] || []), entry];
  persist(state);
  return entry;
}

/**
 * Set the note on a row that is ALREADY stored. Update only — never append.
 *
 * WHY THIS EXISTS AND WHY IT IS NOT `addFeedback` AGAIN. The event-ended flow
 * writes its record the instant a verdict chip is tapped — that is the whole
 * point of the one-tap step — and only then offers a note, on the
 * acknowledgement panel that is already up. The note is therefore an EDIT to
 * an answer the user has already given, not part of giving it. Calling
 * addFeedback with the note would append a SECOND row for one answer:
 * getFeedbackCount, getLearnedCount and getAllFeedback would each count the
 * answer twice, getLatestFeedback would return the noted copy while the bare
 * copy sat behind it forever, and nothing on disk would say which was real.
 *
 * THE SHAPE IS THE GUARANTEE, not a check inside it: this function maps the
 * list to a list of the same length. There is no branch in it that can grow
 * the array, so "it must not create a second record" is not something a
 * future edit has to remember — it is what the code can do.
 *
 * Returns the updated row, or null if there was nothing to update: no key, no
 * id, no such list, or no row with that id. A row written before 2026-11-02
 * has no `id` and so can never be matched, which is correct — nothing patches
 * a legacy row, and a null `id` must never match a legacy row's missing one.
 *
 * Passing a blank note CLEARS it, because cleanNote maps blank to null. That
 * is deliberate: a user who deletes what they typed has un-noted the row, and
 * the alternative is a note they cannot take back.
 */
export function setFeedbackNote(eventKey, id, note) {
  if (!eventKey || !id) return null;
  const state = load();
  const list = state[eventKey];
  if (!Array.isArray(list)) return null;
  const i = list.findIndex((row) => row && row.id === id);
  if (i < 0) return null;

  const updated = { ...list[i], note: cleanNote(note) };
  state[eventKey] = list.map((row, n) => (n === i ? updated : row));
  persist(state);
  return updated;
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
