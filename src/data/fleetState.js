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
