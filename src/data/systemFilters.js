/**
 * The filter model behind the System tab's "Filter by" sheet.
 *
 * Kept as a plain module rather than living inside the sheet so the matching
 * rules can be asserted directly — a filter that silently drops rows is the
 * kind of bug a DOM test finds late and a unit test finds immediately.
 *
 * SHAPE
 *   selection            { [categoryId]: string[] }  — an absent or empty
 *                        array means that category is not filtering.
 *   FILTER_CATEGORIES    ordered definitions; each knows how to read its value
 *                        off a system and how to label it.
 *
 * WHAT IS NOT HERE, AND WHY
 * The reference panel lists nine categories. Seven are below. The two missing
 * ones are **Water Flow** and **Status** (Life Cycle) — the same two fields the
 * table itself omits, because no system record carries them and the rule for
 * deriving them is still owed. Offering a filter whose every option matches
 * nothing is worse than not offering it, so they are absent until the rule
 * lands. Adding one afterwards is a single entry in this array.
 */
import { computeSystemHealth } from '@/utils/systemHealth'
import { SYSTEM_TYPE_LABEL, SYSTEM_TYPE_ORDER, systemTypeOf } from '@/data/systemType'

const NONE = '__none__'

/* Canonical orders, so an option list is stable rather than in whatever order
   the data happened to arrive. A value outside its order sorts last. */
const order = (list) => (a, b) => {
  const ia = list.indexOf(a)
  const ib = list.indexOf(b)
  return (ia < 0 ? list.length : ia) - (ib < 0 ? list.length : ib)
}

const ALERT_LABEL = {
  'leak-high': 'High flow water event',
  'leak-low': 'Low flow water event',
  offline: 'System offline',
  'valve-error': 'Valve error',
  'power-lost': 'AC power lost',
  [NONE]: 'No active event',
}

export const FILTER_CATEGORIES = [
  {
    id: 'location',
    label: 'Location',
    searchable: true,
    valueOf: (s) => s.l4Name || s.l2Name || s.l1Name || NONE,
    labelOf: (v) => (v === NONE ? 'No location' : v),
    // Alphabetical: a location list is long and has no meaningful rank.
    sort: (a, b) => String(a).localeCompare(String(b)),
  },
  {
    id: 'attention',
    label: 'Attention',
    valueOf: (s) => (computeSystemHealth(s).allOk ? 'ok' : 'attention'),
    labelOf: (v) => (v === 'attention' ? 'Requires attention' : 'All systems good'),
    sort: order(['attention', 'ok']),
  },
  {
    id: 'type',
    label: 'System Type',
    valueOf: (s) => systemTypeOf(s),
    labelOf: (v) => SYSTEM_TYPE_LABEL[v] ?? v,
    sort: order(SYSTEM_TYPE_ORDER),
  },
  {
    id: 'connectivity',
    label: 'Connectivity',
    valueOf: (s) => s.comm ?? NONE,
    labelOf: (v) => ({ online: 'Online', offline: 'Offline' })[v] ?? 'Not reporting',
    sort: order(['online', 'offline']),
  },
  {
    id: 'valve',
    label: 'Valve status',
    // null is a FACT here, not missing data: buildTree.js records that 20 of
    // the 53 MRG systems are metering-only and genuinely have no valve.
    valueOf: (s) => s.valve ?? NONE,
    labelOf: (v) =>
      ({ open: 'Open', closed: 'Closed', error: 'Error', [NONE]: 'No valve' })[v] ?? v,
    sort: order(['open', 'closed', 'error', NONE]),
  },
  {
    id: 'event',
    label: 'Active event',
    valueOf: (s) => s.alert?.type ?? NONE,
    labelOf: (v) => ALERT_LABEL[v] ?? v,
    sort: order(['leak-high', 'leak-low', 'offline', 'valve-error', 'power-lost', NONE]),
  },
  {
    id: 'power',
    label: 'Power',
    valueOf: (s) => s.power ?? NONE,
    labelOf: (v) =>
      ({ ac: 'AC', battery: 'Battery', 'ac-lost': 'AC lost', [NONE]: 'Not reporting' })[v] ?? v,
    sort: order(['ac', 'battery', 'ac-lost', NONE]),
  },
]

export const FILTER_CATEGORY_BY_ID = Object.fromEntries(
  FILTER_CATEGORIES.map((c) => [c.id, c]),
)

/**
 * The options a category can offer for a given set of systems, each with the
 * count that would match.
 *
 * Built from the data in scope rather than from a fixed list, so the sheet
 * never offers a choice that matches nothing. That is why "Flood Sensor" does
 * not appear against today's dataset: there are no flood devices in it, and a
 * checkbox that can only ever return an empty table is a worse answer than an
 * absent one.
 */
export function filterOptions(systems, categoryId) {
  const category = FILTER_CATEGORY_BY_ID[categoryId]
  if (!category) return []

  const counts = new Map()
  for (const s of systems ?? []) {
    const v = category.valueOf(s)
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }

  return [...counts.keys()]
    .sort(category.sort ?? (() => 0))
    .map((value) => ({ value, label: category.labelOf(value), count: counts.get(value) }))
}

/** How many categories are actively narrowing the list. */
export function activeFilterCount(selection) {
  return FILTER_CATEGORIES.reduce(
    (n, c) => n + ((selection?.[c.id]?.length ?? 0) > 0 ? 1 : 0),
    0,
  )
}

/**
 * Apply a selection.
 *
 * Within a category the chosen values are OR'd — picking Open and Closed means
 * "either". Across categories they are AND'd — Valve:Open plus Comm:Offline
 * means both. That is what a viewer means by ticking boxes in two lists, and
 * it is the one part of this worth pinning in a test.
 */
export function applyFilters(systems, selection) {
  const active = FILTER_CATEGORIES.filter((c) => (selection?.[c.id]?.length ?? 0) > 0)
  if (!active.length) return systems ?? []

  return (systems ?? []).filter((s) =>
    active.every((c) => selection[c.id].includes(c.valueOf(s))),
  )
}
