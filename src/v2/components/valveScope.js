/**
 * WHAT A VALVE STATE MEANS, AND WHAT MAY BE COMMANDED — answered once, here.
 *
 * The valve-management widget (location level and account level) draws a donut
 * of valve states across a scope and offers bulk open / close over it. In
 * production that scope is up to ~1000 valves in occupied buildings: closing
 * them cuts water, opening them can resume a leak. The owner's hard
 * requirement, in his words, is that "we have a kind of offline devices that
 * the valve cannot be shut off... to not let him think that this valve will
 * take place on this operation that he wants to."
 *
 * So the number the user commits to must be the number that will actually be
 * attempted, and every system left out must be left out visibly. That is one
 * decision, and a decision made in two places is a decision made twice: the
 * chart, the action bar, the confirm sheet and the command writer all ask
 * THESE functions rather than re-deriving `system.valve` for themselves. Cf.
 * `src/v2/components/ignoreGate.js`, extracted for exactly this reason after
 * a control and its destination had drifted apart.
 *
 * PURE. No JSX, no React, no localStorage, no import of `valveCommandStore` —
 * which is what lets the store, a DOM test and a plain unit test all reach it.
 * A caller that wants commanded state honoured resolves it FIRST
 * (`effectiveValveState`, `src/data/valveCommandStore.js:162`) and hands the
 * resolved systems in; this module reads `system.valve` and nothing else.
 *
 * ── THE DOMAIN OF `system.valve` ──────────────────────────────────────────
 *   null       no valve fitted. A FACT, not missing data — upstream records a
 *              valve_type per system and 20 of the 53 MRG systems genuinely
 *              have none; they are metering-only (`buildTree.js:516-523`).
 *   'open'     \ the two benign states (`buildTree.js:61` BENIGN_VALVE)
 *   'closed'   /
 *   'error'    the valve failed to respond to a command (`buildTree.js:524`)
 *   'closing'  mid-transition. The fifth value, and the easy one to miss: it
 *              is minted by the push simulator at `src/lib/pushEvents.js:153`
 *              (`VC_S_02`) as `valveOverride`, which `src/data/systems.js:206`
 *              overlays straight onto `sys.valve` — `pushLifecycle.test.js:131`
 *              pins that it arrives as `sys.valve === 'closing'`.
 *
 * ── THE 'closing' DECISION (new here; nothing in the repo took a position) ─
 * Today 'closing' falls off the end of every surface that reads a valve:
 * `ValveStatus.jsx:113` does `VARIANTS[state] ?? VARIANTS.open`, so a closing
 * valve DRAWS AS OPEN, and `SystemsTableCard.jsx:78`'s VALVE_LABEL has no key
 * for it, so the table prints an em dash. On a control that shuts off water, a
 * valve in transition reading as "open" is the wrong-belief failure this whole
 * module exists to prevent. Decided here, as a judgement open to the owner:
 *   · for the CHART it counts as `closed` — it is on its way there, and the
 *     alternative (counting it open) is the one answer that can mislead;
 *   · for ACTUATION it is NOT actionable — a valve already in transition takes
 *     no new command — and it gets its own skip bucket so the sheet can say so
 *     rather than silently folding it into "already closed".
 *
 * ── REACHABILITY IS ORTHOGONAL TO VALVE STATE ─────────────────────────────
 * An offline system keeps its LAST-KNOWN valve value; `buildTree.js:525` sets
 * `comm` from the failed-dimension plan and `:548` mirrors it into `offline`,
 * so the two always agree. An offline system therefore still counts in the
 * chart at its real state — hiding it would understate the scope — while being
 * excluded from everything actionable. Both halves of that are pinned by test.
 *
 * ── WE COUNT SYSTEMS, NOT PHYSICAL VALVES ─────────────────────────────────
 * `system.valve` is ONE field per system, but a system is not one valve:
 * `src/data/systemConfig.js:53-78` gives a water line 1 valve and an open- or
 * closed-loop system 2 (Supply + Return). So "1000 valves" and "1000 systems"
 * are different numbers, every count below is a count of SYSTEMS, and any UI
 * built on them must say "systems" where it means systems. There is no per-leg
 * valve state in the data model to count the other way.
 */

/**
 * The chart's categories, in the order PRD `03c-status-overview-widget.md:113`
 * locks ("Ordering — bad-state first", locked 2026-06-09): bad state first, so
 * top-left is always the trouble check.
 *
 * The labels are the DESIGN's words, not the PRD table's shorthand — Figma
 * board 199535:96542 draws the vocabulary verbatim as `Valve Error` (not
 * "Fault", not the PRD table's "Errors") and `No valve installed` (not "No
 * valve"). `BulkValveConfirmSheet.jsx:369,382` already quotes both spellings.
 *
 * Hardcoded English, no `t()`: only 2 of 36 v2 components use i18n and no v2
 * valve surface does, so a translated string here would be the only one in the
 * stack and would read as an oversight at every other site.
 */
export const VALVE_CATEGORIES = [
  { key: 'error',  label: 'Valve Error' },
  { key: 'open',   label: 'Open' },
  { key: 'closed', label: 'Closed' },
  { key: 'none',   label: 'No valve installed' },
]

/**
 * Which chart slice a system falls in: 'error' | 'open' | 'closed' | 'none'.
 *
 * `null` (and a missing system) is 'none' — NEVER a state. `systems.js:175`
 * deliberately passes a null valve through untouched, and then
 * `ValveControlCard.jsx:199` defaults it to 'closed' in local state, inventing
 * a closed valve for a system that has none. That v1 bug is harmless there
 * only because `:221` returns the no-valve placeholder before the state is
 * drawn. It is NOT harmless here — a valveless system counted as closed is a
 * valve the user believes they closed — so it is not replicated.
 *
 * An unrecognised non-null value is 'error', not 'none': there IS hardware, so
 * "No valve installed" would be a lie, and the four keys are locked by the PRD
 * above so there is no 'unknown' slice to put it in. 'error' is the honest
 * remainder — visible, first in the order, and not actionable.
 */
export function valveCategoryOf(system) {
  const valve = system?.valve
  if (valve === null || valve === undefined) return 'none'
  if (valve === 'open') return 'open'
  // 'closing' counts here — see THE 'closing' DECISION above.
  if (valve === 'closed' || valve === 'closing') return 'closed'
  return 'error'
}

/**
 * Can a command reach this device at all? `comm` is the field; `offline` is
 * its mirror (`buildTree.js:525,548`), and both are read because a caller may
 * hand us a system assembled somewhere other than buildTree.
 *
 * An ABSENT `comm` reads as reachable. Unknown reachability is not evidence of
 * unreachability, and defaulting the other way would silently strip every
 * hand-built system out of the actionable count with no visible cause.
 */
export function isReachable(system) {
  if (!system) return false
  return system.comm !== 'offline' && system.offline !== true
}

/**
 * Why this system cannot be commanded, or null if it can.
 *
 * EXACTLY FOUR REASONS. Each is cited; nothing else blocks.
 *
 *  'no-valve'  `valve === null` — there is nothing to command. The upstream
 *              fact at `buildTree.js:524`; v1 honours it by rendering a
 *              placeholder and no control at all (`ValveControlCard.jsx:221`).
 *  'offline'   `comm === 'offline'` — the command would not reach the device.
 *              The ONLY statement of this rule anywhere in the source is
 *              `ValveControlCard.jsx:248-253`: "when the system isn't
 *              communicating, we keep showing the last-known valve state ...
 *              but the Open/Close buttons are disabled - the commands wouldn't
 *              reach the device." That is V1 ONLY; no v2 surface enforces it,
 *              which is a large part of why this module exists. Product-wide
 *              it is specified at PRD `04i-offline-banner.md:79` and
 *              `12-cross-cutting.md:114` (Valve Control Open / Close / Retry
 *              disabled while the system is offline).
 *  'error'     `valve === 'error'` — the valve already failed to respond to a
 *              command; sending it another one is not a plan.
 *  'closing'   mid-transition — see the decision note at the top of this file.
 *
 * THERE IS DELIBERATELY NO POWER RULE. `power === 'ac-lost'` / `'battery'`
 * (`buildTree.js:62` BENIGN_POWER) is a LABELLED HOLE: nothing in this repo
 * couples power to actuation — not `ValveControlCard`, not PRD 12's
 * disabled-commands table, not the offline banner — and whether a
 * battery-backed system can still drive its valve is a hardware question
 * nobody here has answered. Do not "fix" this by inventing one: ask the owner,
 * then cite him.
 *
 * PRECEDENCE, when more than one applies: no-valve, then offline, then the
 * valve's own state. A system can land in only ONE skip bucket and the user
 * must be told the fact that dominates — hardware it does not have, then a
 * device we cannot reach (whose valve state is last-known anyway, so reporting
 * that state as the reason would be reporting something we cannot verify).
 */
export function blockedReasonOf(system) {
  if (!system || system.valve === null || system.valve === undefined) return 'no-valve'
  if (!isReachable(system)) return 'offline'
  if (system.valve === 'closing') return 'closing'
  if (valveCategoryOf(system) === 'error') return 'error'
  return null
}

/** Is this system commandable at all, action aside? The inverse of a reason. */
export function canActuate(system) {
  return blockedReasonOf(system) === null
}

/** Holes dropped: a hole in the array is not a system, so it is in no count.
 *  Callers slice `systems` out of the tree, and a hole there is a bug upstream
 *  — never a reason to throw inside a render. */
function cleanList(systems) {
  return (Array.isArray(systems) ? systems : []).filter(
    (s) => !!s && typeof s === 'object',
  )
}

/**
 * The whole scope in one pass, for the donut and the counters beside it.
 *
 * Every number is a count of SYSTEMS (see the header). `byCategory[key].offline`
 * is the load-bearing pair with `.total`: an offline system is counted at its
 * real last-known state AND counted as offline AND excluded from
 * `.actionable`, so a surface can say "14 closed, 3 of them offline" without
 * ever implying the 3 are part of an operation.
 *
 * `byCategory.none.actionable` is structurally always 0 — `blockedReasonOf`
 * answers 'no-valve' first — and is kept in the shape anyway so all four
 * buckets read identically and no caller special-cases one of them.
 */
export function summariseValves(systems) {
  const list = cleanList(systems)

  const byCategory = {}
  for (const { key } of VALVE_CATEGORIES) {
    byCategory[key] = { total: 0, offline: 0, actionable: 0 }
  }

  let offlineTotal = 0
  let actionableTotal = 0

  for (const system of list) {
    const bucket = byCategory[valveCategoryOf(system)]
    bucket.total += 1
    if (!isReachable(system)) {
      bucket.offline += 1
      offlineTotal += 1
    }
    if (canActuate(system)) {
      bucket.actionable += 1
      actionableTotal += 1
    }
  }

  return {
    total: list.length,
    byCategory,
    offlineTotal,
    // Systems that HAVE a valve. Not a valve count — a 103-system scope can
    // hold more than 103 valves (`systemConfig.js:53-78`).
    valveTotal: list.length - byCategory.none.total,
    actionableTotal,
  }
}

/** What `action` commands a valve to be. */
function targetStateFor(action) {
  if (action === 'close') return 'closed'
  if (action === 'open') return 'open'
  return null
}

/** One reason per system, in `blockedReasonOf`'s precedence, into one bucket.
 *  The bucket NAMES are fixed by `recordBulkValveCommand({ skipped })` at
 *  `valveCommandStore.js:82` — offline · noValve · faulted · closing ·
 *  alreadyInState — so this result drops straight into the batch record. */
const BUCKET_OF_REASON = {
  'no-valve': 'noValve',
  offline: 'offline',
  error: 'faulted',
  closing: 'closing',
}

/**
 * Split a scope into what a bulk `action` will actually do and what it will
 * not. `selectedKeys` is a Set or array of VALVE_CATEGORIES keys (the chart
 * slices the user tapped); `action` is 'close' or 'open'.
 *
 * `willAct.length` IS THE NUMBER THE CONFIRM BUTTON AND THE ACTION BAR SHOW.
 * Never `selected.length`. That is the entire point of this module: the count
 * the user commits to is the count that will be attempted.
 * `BulkValveConfirmSheet.jsx:27-31` binds its headline and its button label to
 * exactly this number and to nothing else.
 *
 * A system is in `willAct` only if it is selected AND `canActuate` AND the
 * action would CHANGE something; a valve already in the commanded state is
 * skipped rather than re-commanded, because a batch of 31 that quietly
 * contains 9 no-ops is a count that lies in the user's favour.
 *
 * `selected` partitions exactly: `willAct` plus the five buckets — no system
 * twice, none lost.
 *
 * NOTE the store wants IDS (`skipped.offline.map(s => s.id)`) while these
 * arrays hold the SYSTEMS, because `BulkValveConfirmSheet.jsx:153` lists the
 * offline ones BY NAME and an id would have nothing to print. One mapping at
 * the call site beats two shapes of the same answer.
 *
 * An `action` that is neither 'open' nor 'close' selects nothing. There is no
 * command to size, and the alternative — calling every selected system a no-op
 * — would print a confident "0 valves will close" for a caller that is simply
 * broken.
 */
export function targetsFor(systems, selectedKeys, action) {
  const keys =
    selectedKeys instanceof Set
      ? selectedKeys
      : new Set(Array.isArray(selectedKeys) ? selectedKeys : [])

  return partition(
    cleanList(systems).filter((s) => keys.has(valveCategoryOf(s))),
    action,
  )
}

/**
 * THE PARTITION ITSELF, written once and shared by both selectors above.
 *
 * `targetsFor` and `targetsForSelection` differ ONLY in how they choose the
 * selected set — by chart category, or by system id. What happens to that set
 * afterwards is the actuation rule, and this file exists so that rule is
 * compared at exactly one site; two copies of this loop would be two copies of
 * it. `selected` arrives already chosen and already cleaned.
 */
function partition(selected, action) {
  const skipped = {
    offline: [],
    noValve: [],
    faulted: [],
    closing: [],
    alreadyInState: [],
  }

  const targetState = targetStateFor(action)
  if (targetState === null) return { selected: [], willAct: [], skipped }

  const willAct = []

  for (const system of selected) {
    const reason = blockedReasonOf(system)
    if (reason !== null) {
      skipped[BUCKET_OF_REASON[reason]].push(system)
      continue
    }
    if (system.valve === targetState) {
      skipped.alreadyInState.push(system)
      continue
    }
    willAct.push(system)
  }

  return { selected, willAct, skipped }
}

/**
 * The same partition, keyed on SYSTEM ID instead of on category key.
 *
 * `targetsFor` above serves the overview card, which selects whole chart
 * SLICES. `ValveManagementScreen` selects INDIVIDUAL systems, so it needs this
 * one. It lives HERE, beside its twin, for the reason stated at the top of
 * this file: the actuation rule is compared at exactly one site. It briefly
 * lived in the screen instead, and a second copy of the partition sitting in a
 * page is the precise defect this module was extracted to prevent.
 *
 * `selectedIds` is a Set or array of `system.id`. Everything else is
 * identical and deliberately so — the SAME `{ selected, willAct, skipped }`
 * shape, the SAME five bucket names, the same `blockedReasonOf` precedence,
 * the same already-in-state skip, the same systems-not-ids return — so
 * `BulkValveConfirmSheet` and `recordBulkValveCommand` receive exactly what
 * they already expect from either caller.
 *
 * `willAct.length` IS THE NUMBER THE ACTION BAR AND THE CONFIRM BUTTON SHOW.
 * Never `selected.length`. An offline system stays SELECTABLE — the user may
 * legitimately want it in the set and it may come back — but it lands in
 * `skipped.offline` and never in `willAct`, which is the owner's hard
 * requirement quoted at the top of this file.
 */
export function targetsForSelection(systems, selectedIds, action) {
  const ids =
    selectedIds instanceof Set
      ? selectedIds
      : new Set(Array.isArray(selectedIds) ? selectedIds : [])

  return partition(
    cleanList(systems).filter((s) => ids.has(s.id)),
    action,
  )
}
