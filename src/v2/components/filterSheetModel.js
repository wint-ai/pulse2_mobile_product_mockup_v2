/**
 * FilterSheet's one piece of logic, in a module of its own.
 *
 * `react-refresh/only-export-components` is an ERROR in this repo: a component
 * file exports components and nothing else, so a helper that a PAGE needs -
 * and the page does need this one, to put the count on the trigger and to
 * decide whether the list is filtered at all - cannot ride along inside
 * FilterSheet.jsx. Same split as valveScope.js beside ValveStatus.jsx.
 */

/**
 * How many constraints a value map is actually holding.
 *
 * A multi group contributes one per picked value. A single group contributes
 * one only when it is OFF its first option: that option is the group's "all"
 * and constrains nothing, which is why an "all" option must be listed first.
 *
 * @param {Array}  groups the same array passed to <FilterSheet groups={...} />
 * @param {object} value  { [groupId]: string[] | string }
 * @returns {number}
 */
export function countActiveFilters(groups, value) {
  return groups.reduce((n, g) => {
    const v = value?.[g.id]
    if (g.mode === 'multi') return n + (Array.isArray(v) ? v.length : 0)
    const first = g.options?.[0]?.value
    return n + (v != null && v !== first ? 1 : 0)
  }, 0)
}
