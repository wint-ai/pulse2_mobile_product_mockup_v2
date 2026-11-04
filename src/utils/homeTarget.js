/**
 * WHERE HOME IS, PER USER.
 *
 * ── WHY THIS IS A MODULE AND NOT A PAGE HELPER — 2026-11-04 ──────────────
 *
 * This rule was written inside HomeAllAccounts.jsx, where it answered one
 * question: where does the header's house go? The owner then deleted the
 * house —
 *
 *     "I want to completely remove the home icon. And once user clicks on
 *      dashboard, it just takes him to the upper level of the scope that he
 *      already have. Instead of the home button. Just remove it"
 *                                                      — owner, 2026-11-04
 *
 * — and the job moved to the Dashboard tab, which lives in
 * src/components/TabBar.jsx. Two files now need one answer, and a page
 * component may not export a plain function in this config
 * (`react-refresh/only-export-components` is an ERROR, not a warning), so the
 * rule moved out rather than being copied. It is the SAME CODE, moved: see
 * `topLevelFor` below and `homeTargetFor` under it, both lifted byte for byte
 * out of HomeAllAccounts.jsx. Nothing about the rule was reconsidered in the
 * move, which is the point — a second derivation of "what can this user see"
 * is exactly the drift src/hooks/useActiveAlerts.js exists to prevent.
 *
 * It sits in src/utils/ beside ancestorScopes.js and scopePath.js, the other
 * two modules that walk this hierarchy and answer "how far up does this set of
 * systems agree?". It is not v2-specific — TabBar is chrome on every screen —
 * so src/v2/lib/ would have been the wrong shelf.
 *
 * ── THE RULE, UNCHANGED — 2026-11-04 ─────────────────────────────────────
 * Owner, originally looking at the header bar on the Dashboard:
 *
 *   "Home needs to take you to the upper level that the user has. For
 *    example, if it's accounts with multiple locations, and multiple
 *    systems, when user clicks home, it needs to take him to the higher
 *    level. Not to open the side"
 *
 * So home is not a route, it is a question about the signed-in user, and it
 * has to be answered from the data rather than hard-coded to `/`.
 *
 * THE ANSWER IS THE DEEPEST NODE THAT HOLDS EVERYTHING THEY CAN SEE. Not the
 * shallowest: a facility manager who holds one site of eleven does not "have"
 * Office, and sending her to Office would title the page with a scope she
 * owns a fraction of. Everything ABOVE her site is somebody else's level;
 * her site is the top of her own tree. Running it over each persona's
 * `systemFilter` gives exactly the four cases the owner listed:
 *
 *   several accounts / the whole fleet  ->  /                  All Accounts
 *   one account, several locations      ->  /                  (the roll-up)
 *   one location                        ->  /location/<name>
 *   one system                          ->  /system/<id>
 *
 * NO FOURTH SCOPING DERIVATION. The set of systems a user has is already
 * stated once, in useAlertScope()'s `visibleIds` (persona systemFilter), and
 * read through the same hook the Dashboard scopes by. The LEVEL NAMES are
 * matchesLocationName's four, in its order, which is what makes the
 * `/location/<name>` this returns resolvable by the route it is handed to.
 *
 * The whole-fleet test is not cosmetic. An unnarrowed user's systems still
 * share one l1Name ("United States"), so without it the admin's home would be
 * /location/United States - a real node, holding exactly the same 103
 * systems, under a title nobody asked for. A user who is not narrowed at all
 * is at the all-accounts level by definition.
 *
 * ── MEASURED, 2026-11-04, over every persona in src/data/personas.js ─────
 *   wint-admin                  103/103  ->  /                        All Accounts
 *   account-manager-subaccount  103/103  ->  /                        All Accounts
 *   portfolio-manager-office     53/103  ->  /location/Office         Office
 *   building-manager-residential 10/103  ->  /location/Building%20A   Building A
 *   location-manager              5/103  ->  /location/100%20Meridian%20Plaza
 *   tenant-1apt                   1/103  ->  /system/esrt-bldg-A-apt-3
 *   tenant-2apts                  2/103  ->  /location/Residential    <- see TabBar
 * The last row is why TabBar does NOT hand tenants this answer; the note at
 * its Dashboard tab has the reasoning.
 */
import { SYSTEMS } from '../data/systems'

const LEVEL_NAME_KEYS = ['l4Name', 'l3Name', 'l2Name', 'l1Name']

/** @returns {{path: string, name: string}} where this user's home is. */
export function topLevelFor(visibleSystems) {
  const all = SYSTEMS ?? []
  const seen = visibleSystems ?? []
  /* ALL ACCOUNTS. Also the empty case: a user who can see nothing has no
     deeper level to be sent to, and the Dashboard already draws the honest
     zeros for it. */
  if (seen.length === 0 || seen.length >= all.length) {
    return { path: '/', name: 'All Accounts' }
  }
  /* ONE SYSTEM. Short-circuited above the level walk on purpose: a single
     apartment shares its building with nine the tenant cannot see, so the
     deepest COMMON level would hand her a scope that is not hers. */
  if (seen.length === 1) {
    return { path: `/system/${seen[0].id}`, name: seen[0].name }
  }
  for (const key of LEVEL_NAME_KEYS) {
    const names = new Set(seen.map(s => s[key]).filter(Boolean))
    if (names.size === 1 && seen.every(s => s[key])) {
      const name = [...names][0]
      return { path: `/location/${encodeURIComponent(name)}`, name }
    }
  }
  /* They span the account. The account roll-up IS the Dashboard - there is no
     account-scope route in v2 and inventing one is not this task. */
  return { path: '/', name: 'All Accounts' }
}

/**
 * The same answer, asked with the hook's `visibleIds` set instead of a list.
 *
 * THE ROUTE IS DELIBERATELY NOT PART OF THIS. Home is a property of the
 * signed-in user, not of where they have drilled to, so `visibleIds` alone
 * answers it; the drilled-into scope would make the control follow the user
 * down into a location and point back at the location they are already in.
 *
 * An empty `visibleIds` means NO PERSONA FILTER rather than no systems —
 * useActiveAlerts.js's documented convention, and the reason this reads the
 * fleet in that case instead of the empty-user branch.
 *
 * @param {Set<string>|null|undefined} visibleIds  useAlertScope().visibleIds
 * @returns {{path: string, name: string}}
 */
export function homeTargetFor(visibleIds) {
  const ids = visibleIds
  const all = SYSTEMS ?? []
  return topLevelFor(!ids || ids.size === 0 ? all : all.filter(s => ids.has(s.id)))
}
