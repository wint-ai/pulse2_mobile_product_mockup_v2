/**
 * How the Search tab reaches the navigation drawer — 2026-11-07.
 *
 * THE PROBLEM THIS SOLVES. The owner replaced the More tab with Search:
 * *"replace the 'More' in buttom main nav bar With Search - locate right to
 * dashboard / Serach open the nav bar with the systems and locations"*. The
 * Search tab is therefore an ACTION, and the thing it has to act on is the
 * navigation drawer.
 *
 * But no drawer is global in this app. Every screen owns its own instance and
 * its own `open` state — HomeUnified.jsx:845/965 and HomeAllAccounts.jsx:955/
 * 2612 are the two patterns, and there are eighteen screens that mount
 * <TabBar>. A prop would mean editing all eighteen; a context would mean
 * editing all eighteen AND App.jsx. So the tab ASKS, and whichever drawer is
 * mounted on this route ANSWERS.
 *
 * WHY A WINDOW EVENT AND NOT A STORE. `wint-trigger-splash` (App.jsx:397
 * dispatch, App.jsx:777 listen) is the house pattern for exactly this shape of
 * one-shot cross-tree signal, and it is the only one in the repo. This follows
 * it rather than introducing a second mechanism.
 *
 * WHY IT IS CANCELABLE, which is the part that is easy to delete by accident.
 * HALF THE ROUTES MOUNT <TabBar> AND NO DRAWER AT ALL. Swept in the running
 * app at 393x852 on 2026-11-07, twenty routes, and it came out ten and ten:
 *
 *   OWN DRAWER   /  ·  /old  ·  /location/:name  ·  /valves  ·  /tenant
 *                /system/:id  ·  /old/system/:id
 *                /v1/  ·  /systems  ·  /v1/system/:id   (these three are v1,
 *                                     i.e. NavigationDrawer rather than
 *                                     WintSidebarV2)
 *   NO DRAWER    /account  ·  /alerts  ·  /alerts/system/:id  ·  /kpi/:type
 *                /leak/:id (= /alert/:id)  ·  /l4/:l4id  ·  /more
 *                /home-clear  ·  /home-multi  ·  /home-legacy
 *
 * On that second column an event with no listener would make the Search tab a
 * button that does nothing — and it is the ONLY door into the drawer there,
 * so "nothing" would mean the drawer is unreachable on half the app.
 * wint-ui-copy's rule 0 and the contract's "do not ship it dead" both forbid
 * it. So: a listening drawer claims the request with preventDefault(),
 * `dispatchEvent` returns false, and requestDrawerSearch() reports back
 * whether anybody answered. TabBar opens a drawer of its own ONLY when nobody
 * did — see the FALLBACK block in TabBar.jsx. That is what keeps the
 * drawer-less half honest WITHOUT mounting a second drawer on the half that
 * already has one.
 *
 * (/alerts and /account are in the second column on purpose, not by neglect:
 * EventsScreen.jsx:760 records its <NavigationDrawer> being UNMOUNTED on
 * 2026-11-04, and AccountScreenV2 never mounted one. Both predate this file.)
 */

/**
 * The signal. One listener per mounted drawer; see WintSidebarV2.jsx and
 * NavigationDrawer.jsx, which are the only two.
 */
export const DRAWER_SEARCH_EVENT = 'wint-open-drawer-search'

/**
 * Ask the drawer on this route to open with its search field open and focused.
 *
 * @returns {boolean} true when a mounted drawer claimed the request, false
 *   when this route has no drawer and the caller has to provide one.
 */
export function requestDrawerSearch() {
  if (typeof window === 'undefined') return false
  // `dispatchEvent` returns false when a listener called preventDefault(), so
  // "somebody handled it" is the negation. The dispatch is synchronous: by the
  // time this returns, the drawer that answered has already set its state.
  return !window.dispatchEvent(new CustomEvent(DRAWER_SEARCH_EVENT, { cancelable: true }))
}
