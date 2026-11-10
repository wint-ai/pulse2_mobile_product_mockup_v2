/**
 * How the Home tab tells the screen it lands on to show its TOP VIEW — 2026-11-10.
 *
 * ── THE REPORT ───────────────────────────────────────────────────────────
 * The owner, on the Systems view of the Dashboard (reached from `More ☰`),
 * at All Accounts scope:
 *
 *     "home always needs to take me to upper level on overview"
 *                                                      — owner, 2026-11-10
 *
 * Two halves, and only one of them was missing:
 *
 *   UPPER LEVEL — already done, and NOT by this file. TabBar's Home tab
 *     navigates to `homeTargetFor(visibleIds).path` and calls
 *     `clearSelectedScope?.()`, which between them clear BOTH of the places
 *     this app reads scope from (the route's `:locationName` and
 *     UserContext's `selectedScope` — the pair SearchScreen's
 *     `selectAllAccounts` writes together, and for the same reason).
 *     Measured in the running app on 2026-11-10: drawer -> Office
 *     (/location/Office, "53 systems") -> Home -> `/`, "All Accounts,
 *     103 systems". Nothing here touches scope.
 *
 *   ON OVERVIEW — this file. `HomeAllAccounts` holds which of Overview /
 *     Systems / General Info is showing in a component-local `tab`, and
 *     `SystemPageV2Screen` holds the same thing under the same name.
 *
 * ── THE CAUSE, MEASURED — AND IT IS NARROWER THAN IT LOOKS ───────────────
 *
 * The obvious suspicion is that `tab` survives because App.jsx routes BOTH
 * `/` (:125) and `/location/:locationName` (:140) to one component, so React
 * keeps one instance mounted across the pair. MEASURED AT 393x852 ON
 * 2026-11-10, AT 9314c83, AND THAT HALF IS FALSE:
 *
 *   /location/Office, Systems open  -> Home -> `/`, OVERVIEW.  Already fine.
 *   `/`,              Systems open  -> Home -> `/`, STILL SYSTEMS.  Broken.
 *
 * The cross-route move already resets itself, because of a line that has
 * nothing to do with routing tables: AppRoutes wraps every <Routes> in a
 * `<MotionDiv key={location.pathname}>` (App.jsx:111) so the page-entry
 * animation re-runs. A pathname-keyed element REMOUNTS THE WHOLE SUBTREE on
 * any path change, which throws `tab` away as a side effect.
 *
 * SO THE ONLY BROKEN PRESS IS THE ONE WHERE THE PATH DOES NOT CHANGE — and
 * it is broken completely, because then NOTHING re-runs: not the navigate,
 * not the key, not an effect. Measured, all three at HEAD:
 *
 *   wint-admin               `/`                      Systems     -> survived
 *   portfolio-manager-office `/location/Office`       Systems     -> survived
 *   tenant-1apt              `/system/esrt-…-apt-3`   Gen. Info   -> survived
 *
 * Those are the Home DESTINATIONS of their personas, which is the whole
 * point: the press that goes wrong is a user who is already home asking to
 * be taken home. It is also exactly the owner's screenshot.
 *
 * ── WHY A WINDOW EVENT, AND NOT THE THREE ALTERNATIVES ───────────────────
 *
 *   A `key` ON THE ROUTE ELEMENT so the page remounts. REJECTED TWICE OVER.
 *     First, IT CANNOT WORK. There is already a pathname key one level up
 *     (App.jsx:111) and it is what makes the cross-route case pass; the one
 *     case that is broken is the one where the path is unchanged, so any key
 *     derived from the route is unchanged too and nothing remounts. A key
 *     that DID fire — `location.key`, say — would then be the second reason:
 *     it resets the view by discarding the whole component with it, taking
 *     scroll position, the Systems table's filter selection, open
 *     disclosures, the consumption period and offset, and any overlay
 *     mid-flight. The owner asked to be taken to Overview, not to have
 *     everything else thrown away, and the skill's rule 0 covers the state a
 *     remount eats just as much as it covers a deleted button.
 *
 *   ROUTER `state` ON THE NAVIGATE, observed by the page. REJECTED, and it
 *     is the close call. It works, with care — but the care is the problem:
 *     since the press that matters happens while the pathname is ALREADY the
 *     target, the page cannot watch `location.pathname`. It has to watch
 *     `location.key`, the one thing a same-path push changes, which is a
 *     subtlety one tidy-up away from silently reverting this fix to exactly
 *     the bug that was reported. Worse, router state is STICKY: it belongs
 *     to the history entry, so a later Back or Forward onto that entry
 *     replays the reset and snaps the user off a view they chose. A one-shot
 *     signal does not belong in history.
 *
 *   A CONTEXT OR STORE holding the current view. REJECTED: it would move two
 *     pages' private `tab` into global state so that one button can poke it,
 *     which is a much larger change than the problem, and gives two screens
 *     one shared variable they do not otherwise share.
 *
 * So: the tab ASKS, and whichever screen is mounted ANSWERS. This is the
 * house pattern — `wint-trigger-splash` (App.jsx:468 dispatch, :848 listen)
 * and `wint-open-drawer-search` (drawerSearch.js) are the two that already
 * exist, and this follows them rather than adding a third mechanism. It
 * resets exactly ONE state variable and leaves scroll, filters, period and
 * overlays alone.
 *
 * ── WHAT THIS IS *NOT*, i.e. how it differs from drawerSearch.js ─────────
 * drawerSearch.js is CANCELABLE and reports whether anybody answered,
 * because half the routes mount <TabBar> and no drawer, and an unanswered
 * Search tab would be a dead button. THIS EVENT NEEDS NO SUCH HANDSHAKE AND
 * DELIBERATELY HAS NONE. A screen that is not mounted when Home is pressed
 * is about to be MOUNTED FRESH by the navigation that follows — App.jsx:111
 * guarantees it for every path change — and a fresh mount already starts on
 * `overview`, the default in both pages' useState. So "nobody listened" is
 * not a failure here, it is the other way the same outcome is reached. The
 * only presses that need this file at all are the same-path ones listed
 * under THE CAUSE above; every other row of the journey matrix changes the
 * path, remounts, and is carried by the default.
 *
 * ── ORDERING ─────────────────────────────────────────────────────────────
 * TabBar dispatches BEFORE it navigates. `dispatchEvent` is synchronous, so
 * the listening page has set `tab` by the time `navigate()` is called, and
 * React commits both in one batch — the Systems table never paints between
 * the two. Setting state on a component the navigation is about to unmount
 * is a no-op, not a warning, since React 18.
 */

/**
 * The signal: "the Home control was pressed — show your top view."
 * One listener per screen that holds a view selection; see
 * HomeAllAccounts.jsx and SystemPageV2Screen.jsx, the only two.
 */
export const HOME_RESET_EVENT = 'wint-home-reset-view'

/**
 * Ask the screen on this route to drop back to its top view.
 *
 * Returns nothing on purpose — see WHAT THIS IS *NOT* above. There is no
 * fallback to take and therefore nothing for a caller to branch on.
 */
export function requestHomeViewReset() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(HOME_RESET_EVENT))
}
