/**
 * fleetState.js — WHICH fleet the generator builds: today's, or an all-clear one.
 *
 * The owner wants to demo the app to people who have never seen it and let them
 * choose at the sign-in screen between a healthy fleet and the fleet as it is
 * (leaks, faults, events). There is still ONE dataset and ONE generator: this
 * flag only changes the per-site budgets in upstream/buildTree.js, so accounts,
 * locations, systems, ids, names and addresses are identical in both modes BY
 * CONSTRUCTION and the two modes cannot drift apart. A deep link to
 * /system/<id> resolves in both.
 *
 *   'live'   today's behaviour. THE DEFAULT, and the default is load-bearing:
 *            nothing about the app changes unless the flag is explicitly set.
 *   'clear'  every site is a clean site. No active water events, no protection
 *            faults, nothing needing attention.
 *
 * HISTORY SURVIVES IN BOTH. Owner's decision: keep history, clear the present.
 * A pristine fleet with no past makes the ended-event screen, the "Tell us
 * more" feedback flow, timeline drill-down and the event chart's annotations
 * unreachable, and those are the features worth demoing. generateEvents'
 * HISTORY_EVENTS and generateIncidents' resolved incidents are derived from
 * `resolvedVariant(id)` and never look at `sys.alert`, so they are untouched by
 * the mode; only the CURRENT event / ACTIVE incident builders read `sys.alert`
 * and those go quiet on their own.
 *
 * THIS IS NOT `pulse2-mock-suppressed` (src/data/systems.js). That flag is the
 * push simulator's "Clear" button and it deliberately suppresses history too,
 * via hasSimActivity(). See the comment there.
 *
 * READ AT IMPORT TIME. buildTree.js evaluates once per page load, so changing
 * the mode requires a full reload — setFleetState() does not mutate the tree
 * that is already in memory. The picker in App.jsx reloads explicitly.
 */

export const FLEET_STATE_KEY = 'pulse2-fleet-state';

/** Today's fleet: leaks, faults, water events. The default. */
export const FLEET_LIVE = 'live';
/** The all-clear fleet: same entities, nothing wrong right now. */
export const FLEET_CLEAR = 'clear';

/**
 * The stored mode, or 'live'.
 *
 * Defensive on purpose: localStorage throws in private mode, and does not
 * exist at all under vitest's default node environment or in SSR. Any failure
 * to read means 'live', which is the no-change answer.
 */
export function readFleetState() {
  try {
    return globalThis.localStorage?.getItem(FLEET_STATE_KEY) === FLEET_CLEAR
      ? FLEET_CLEAR
      : FLEET_LIVE;
  } catch {
    return FLEET_LIVE;
  }
}

/**
 * Store the mode. 'live' REMOVES the key rather than writing it, so a storage
 * clear and an explicit "live" leave the same state behind.
 *
 * Does not reload. The caller does, because the tree is already built.
 */
export function setFleetState(mode) {
  try {
    if (mode === FLEET_CLEAR) globalThis.localStorage?.setItem(FLEET_STATE_KEY, FLEET_CLEAR);
    else globalThis.localStorage?.removeItem(FLEET_STATE_KEY);
  } catch { /* private mode / no storage — the mode stays whatever it was */ }
}

/* ─── THE PUSHER'S "TREAT THE FLEET AS CLEAN" FLAG ──────────────────────────
 *
 * MOVED HERE FROM src/data/systems.js — 2026-11-10. The two accessors below
 * are the same two functions, byte for byte in behaviour, and systems.js
 * re-exports them so every existing importer (the tests among them) is
 * unchanged. Only the DECLARATION moved, and it moved for one reason:
 *
 *   the sign-in picker has to answer "what will the user see?", and that
 *   question has two inputs, not one.
 *
 * `pulse2-fleet-state` and `pulse2-mock-suppressed` both make the fleet read
 * as clean, by different mechanisms (generator budgets vs. an overlay), and
 * until today only the first was on screen anywhere. A user who hit the
 * pusher's Clear on Tuesday and picked "Leaks and faults" on Thursday got a
 * picker that said "Leaks and faults" and a fleet with none — the control
 * lied, because it was reading half of its own subject.
 *
 * This file already owned the comparison between the two flags (see the
 * header), so it is where the effective answer belongs. It cannot live in
 * systems.js: upstream/buildTree.js imports THIS module at module scope and
 * systems.js imports buildTree, so a fleetState -> systems import would close
 * a cycle. This module still imports nothing.
 *
 * ⚠ THE FLAG IS NOT DEPRECATED AND THE PUSHER'S CLEAR IS NOT TOUCHED.
 * applyDemoReset() still sets it, hasSimActivity() still reads it, and it
 * still suppresses history — which is its whole point and the thing
 * `pulse2-fleet-state` deliberately does NOT do (owner, 2026-11-04: "clear
 * the present, keep the past"). All that changes is that it can no longer be
 * ON without the sign-in screen saying so.
 */
export const MOCK_SUPPRESSED_KEY = 'pulse2-mock-suppressed';

export function isMockSuppressed() {
  try { return globalThis.localStorage?.getItem(MOCK_SUPPRESSED_KEY) === '1'; }
  catch { return false; }
}

export function setMockSuppressed(yes) {
  try {
    if (yes) globalThis.localStorage?.setItem(MOCK_SUPPRESSED_KEY, '1');
    else globalThis.localStorage?.removeItem(MOCK_SUPPRESSED_KEY);
  } catch { /* ignore */ }
}

/**
 * WHAT THE USER WILL ACTUALLY SEE — the one value a picker may display.
 *
 * `readFleetState()` is the stored MODE. This is the stored mode AND the
 * pusher's flag folded together, because either one on its own produces a
 * fleet with no events, no faults and nothing needing attention. A control
 * that showed only the first would be back to lying the moment the pusher had
 * been used, which is the defect this whole change exists to remove.
 *
 * The disjunction is deliberate and is not symmetric with the write below:
 * reading is "is anything hiding the fleet?", writing is "make it so".
 */
export function readEffectiveFleetState() {
  return isMockSuppressed() || readFleetState() === FLEET_CLEAR
    ? FLEET_CLEAR
    : FLEET_LIVE;
}

/**
 * THE ONE WRITE PATH BEHIND THE PICKER. Both buttons land here.
 *
 * It writes BOTH flags, every time, so that after a deliberate choice the
 * stored state can only be one of two consistent pairs. Half-writing is what
 * produced the trap: a flag left set under a mode that disagreed with it.
 *
 * WHY BOTH OPTIONS CLEAR THE SUPPRESSION, including "All clear".
 * The two mechanisms are NOT interchangeable and the owner has already ruled
 * on which one this screen offers. `pulse2-fleet-state` clears the present
 * and KEEPS the past; `pulse2-mock-suppressed` deletes the history too
 * (hasSimActivity() returns true for every system while it is set). The
 * owner's 2026-11-04 decision for the demo is the first of those — "A
 * pristine fleet with no past makes the ended-event screen, the Tell us more
 * feedback flow, timeline drill-down and the event chart's annotations
 * unreachable, and those are the features worth demoing." So the picker's
 * "All clear" is FLEET_CLEAR, and it turns the history-deleting flag off on
 * its way, rather than offering a second, lossier clear that looks identical
 * on the surface it is picked from.
 *
 * NOTHING IS REMOVED BY THIS. applyDemoReset() is untouched and still sets
 * the flag; the picker only ever acts when a human taps it.
 *
 * Does not reload — see setFleetState. The caller does.
 */
export function chooseFleetState(mode) {
  setMockSuppressed(false);
  setFleetState(mode === FLEET_CLEAR ? FLEET_CLEAR : FLEET_LIVE);
}
