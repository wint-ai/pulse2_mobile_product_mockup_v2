/**
 * The System tab's column model, and the store behind the column chooser.
 *
 * A PLAIN .js MODULE, not part of SystemsTableCard.jsx, because
 * `react-refresh/only-export-components` is an ERROR in this repo: a .jsx file
 * may export its component and nothing else. Every constant and helper the
 * card used to hold inline lives here so the chooser, the table and the tests
 * all read the same list.
 *
 * ── WHICH COLUMNS EXIST, AND WHY IT IS NOT EIGHT ──────────────────────────
 * The desktop content spec (Figma 198736:52372) lists eight: System, Location,
 * Leak, Valve State, Water Flow, Comm, Power, Life Cycle. Two of those are not
 * offered here and one is not a column:
 *
 *   Water Flow, Life Cycle — NO FIELD IN THE DATASET, and the derivation rule
 *     is still owed (see src/data/systemFilters.js, and the long-standing note
 *     in SystemsTableCard's own header). Offering them in a column chooser
 *     would mean shipping two toggles that can only ever paint a column of em
 *     dashes — which is the exact defect the owner complained about on Leak.
 *     A chooser must not be able to make the table worse.
 *
 *   Location — IS ALREADY ON EVERY ROW. Figma's identity cell is "name over
 *     sub", and the sub IS the location (`l4Name`). Offering Location a second
 *     time as a 76px column would both duplicate it and truncate it; "100
 *     Meridian Plaza" has no readable rendering at that width. It stays bound
 *     to the identity cell, and the row disclosure is where its street address
 *     lives, because the address is the part the table never shows.
 *
 * So the chooser offers the four that are backed by data AND fit a badge-width
 * slot: Leak, Valve state, Comm, Power. System is locked on — it is the row's
 * identity, and a table of anonymous rows is not a table.
 *
 * ── WHY THERE IS A CAP ────────────────────────────────────────────────────
 * The frame is 393px; the card is 358px inside the page gutter. Each data
 * column costs 76px and the disclosure cell costs 44px, so two data columns
 * leave 162px for the identity cell — about 104px of text once the 32px type
 * glyph and its gap are paid for. A third would leave 86px, at which point the
 * system name is two clipped words. The table is `table-fixed` with wrapping
 * cells so a third column could not actually scroll the page sideways — it
 * would silently shred the names instead, which is worse because nothing on
 * screen would say what went wrong. The cap is enforced in the UI, visibly,
 * rather than by letting the layout fail quietly.
 */

/* `pulse2-` prefix: src/utils/useDataRefresh.js filters cross-tab storage
   events on it, and every other store in this app uses it. */
const KEY = 'pulse2-systems-columns'

/** Value domains, straight off the system record built in
 *  src/data/upstream/buildTree.js. Anything outside them renders as an em dash
 *  rather than the raw token. */
export const VALVE_LABEL = { open: 'Open', closed: 'Closed', error: 'Error' }
export const COMM_LABEL = { online: 'Online', offline: 'Offline' }
export const POWER_LABEL = { ac: 'AC', battery: 'Battery', 'ac-lost': 'AC lost' }
export const LEAK_LABEL = { high: 'High', low: 'Low' }

export const DASH = '—'

/* Leak is the one column that carries a tone. High is Table 16's destructive
   treatment verbatim; Low takes the orange the water-events card already uses
   for a low-flow event, so the two surfaces agree about what "low" looks like.
   Nothing else gets a tone: inventing one for Comm or Power would be inventing
   a visual language, and the row disclosure draws those same values as plain
   text already. */
export const LEAK_TONE = {
  high: 'bg-[rgba(229,0,11,0.1)] text-destructive',
  low: 'bg-orange-100 text-orange-600',
}

/** The identity column. Locked on; never in `DATA_COLUMNS`. */
export const SYSTEM_COLUMN = { id: 'system', label: 'System' }

/** The columns the chooser offers, in the order the chooser lists them and the
 *  order the table draws them. Fixed order rather than pick order: a table
 *  whose columns reshuffle as you tick boxes is a table you have to re-read. */
export const DATA_COLUMNS = [
  { id: 'leak', label: 'Leak' },
  { id: 'valve', label: 'Valve state' },
  { id: 'comm', label: 'Comm' },
  { id: 'power', label: 'Power' },
]

export const DATA_COLUMN_IDS = DATA_COLUMNS.map((c) => c.id)

/** See WHY THERE IS A CAP. */
export const MAX_DATA_COLUMNS = 2

/* THE DEFAULT SET — a judgement call, flagged for the owner.
   `leak` alone is what shipped, and the owner's complaint about it was exact:
   "the Leak column is — on every visible row". It is empty for most rows
   because most systems are not leaking, which is good news and bad table.
   `comm` joins it rather than replacing it: Leak is the product's reason for
   existing and must not vanish by default, and `comm` is populated on EVERY
   record, so no row is blank any more. A row with no leak now still reads
   "Online". */
export const DEFAULT_DATA_COLUMNS = ['leak', 'comm']

/** The plain text a data column puts in its cell, or null for "nothing known".
 *  Leak returns a label the card renders as a badge; the rest are text. */
export function columnText(system, id) {
  if (!system) return null
  switch (id) {
    case 'leak':
      return LEAK_LABEL[system.leak] ?? null
    case 'valve':
      /* `valve: null` is a FACT about 20 of the 53 MRG systems — they are
         metering-only. "No valve" is that fact; a dash would read as missing
         data. Same rule the row disclosure has always followed. */
      return system.valve == null ? 'No valve' : (VALVE_LABEL[system.valve] ?? null)
    case 'comm':
      return COMM_LABEL[system.comm] ?? null
    case 'power':
      return POWER_LABEL[system.power] ?? null
    default:
      return null
  }
}

/**
 * Normalise anything into a legal column selection, or null for "not a value
 * this build wrote". Known ids only, each at most once, in `DATA_COLUMNS`
 * order, never more than the cap.
 *
 * AN EMPTY ARRAY IS LEGAL. "System only" is a choice a viewer is allowed to
 * make, and that is exactly why an array holding an UNKNOWN id is REJECTED
 * outright rather than filtered down to what parses: filtering would turn
 * `["nope"]` into `[]`, which is indistinguishable from a deliberate "System
 * only" and would leave a corrupt key quietly producing a bare table forever.
 * Rejecting it hands back the default set instead, which is the house rule in
 * src/data/valveCommandStore.js — a stored value that does not validate is
 * treated as absent rather than trusted.
 *
 * OVER-CAP IS NOT CORRUPTION and is repaired rather than rejected: every id is
 * one this build knows, there are just too many, which is what a value written
 * by a build with a different `MAX_DATA_COLUMNS` would look like.
 */
export function normalizeColumns(ids) {
  if (!Array.isArray(ids)) return null
  if (ids.some((id) => !DATA_COLUMN_IDS.includes(id))) return null
  return DATA_COLUMN_IDS.filter((id) => ids.includes(id)).slice(0, MAX_DATA_COLUMNS)
}

/**
 * Read the stored selection, or the default.
 *
 * House style is src/data/valveCommandStore.js: a stored value that does not
 * VALIDATE is treated as absent rather than trusted. A hand-edited or
 * half-written key must not be able to throw into the render tree, and must
 * not be able to put an unknown id into a colgroup either.
 */
export function loadColumns() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    const clean = normalizeColumns(raw)
    return clean ?? [...DEFAULT_DATA_COLUMNS]
  } catch {
    // Corrupt, hand-edited, unreadable, or no localStorage at all.
    return [...DEFAULT_DATA_COLUMNS]
  }
}

export function saveColumns(ids) {
  try {
    localStorage.setItem(KEY, JSON.stringify(normalizeColumns(ids) ?? []))
  } catch {
    /* ignore — private mode, quota, etc. The choice simply does not persist. */
  }
}
