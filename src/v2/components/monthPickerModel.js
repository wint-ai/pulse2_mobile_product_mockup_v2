/**
 * monthPickerModel — the arithmetic behind MonthPickerSheet.
 *
 * It lives outside the component file for two reasons: a component module may
 * only export components (react-refresh), and this is the half worth testing
 * directly — the chip states are a small state machine over (month, year) pairs
 * and asserting on them beats driving a grid of 12 buttons.
 *
 * PRD: Water Consumption Chart v2 §2, §3.3, PLS-WC-08.
 */

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** How many buckets a Monthly window covers (§2: "the 12 months ending at the selection"). */
export const WINDOW_LENGTH = 12

/** Months since year 0 — the only sane way to compare/step (month, year) pairs. */
export const serial = (month, year) => year * 12 + month

/**
 * Accept either spelling of a period.
 *
 * The sheet's own props have always been `{ month, year }` with month 0-11.
 * The chart's bucket keys — and therefore `windowMonths` and `min` as the
 * cross-file contract spells them — are `{ y, m }`. Rather than make the two
 * sides agree at the call site (and break whichever caller guessed wrong), read
 * both here. `m` is 0-11, same as `month`.
 *
 * @returns {{month:number,year:number}|null} null when it is not a period.
 */
export function normalizePeriod(period) {
  if (!period || typeof period !== 'object') return null
  const month = Number.isInteger(period.month) ? period.month
    : Number.isInteger(period.m) ? period.m
      : null
  const year = Number.isInteger(period.year) ? period.year
    : Number.isInteger(period.y) ? period.y
      : null
  if (month === null || year === null) return null
  return { month, year }
}

/**
 * A bound (`min` / `max`) that may carry only one of the two fields — the
 * missing half falls back to `fallback`, which is how `max` has always
 * behaved when a caller passed a partial object.
 *
 * @returns {{month:number,year:number}|null} null when no bound was given.
 */
export function resolveBound(bound, fallback) {
  if (!bound || typeof bound !== 'object') return null
  const month = Number.isInteger(bound.month) ? bound.month
    : Number.isInteger(bound.m) ? bound.m
      : fallback?.month
  const year = Number.isInteger(bound.year) ? bound.year
    : Number.isInteger(bound.y) ? bound.y
      : fallback?.year
  if (!Number.isInteger(month) || !Number.isInteger(year)) return null
  return { month, year }
}

/** Serials of the `length` months ending at (and including) `end`. */
export function rollingWindowSerials(end, length = WINDOW_LENGTH) {
  const out = new Set()
  for (let s = end - length + 1; s <= end; s += 1) out.add(s)
  return out
}

/**
 * The months the chart is actually drawing, as serials.
 *
 * `windowMonths` is authoritative while the draft still names the window the
 * card handed us: near the start of the series the chart's window clamps (§2),
 * so deriving twelve months backwards from the end would mark cells the chart
 * never drew. The moment the user picks a different end month the card's window
 * is stale, and the helper text's promise — "the 12 months ending there are
 * selected" — is what the grid has to show, so we derive from the draft.
 *
 * @param {{month:number,year:number}} draft   the end month currently picked.
 * @param {{month:number,year:number}|null} value  the end month the sheet opened on.
 * @param {Array<{y:number,m:number}>} [windowMonths]
 * @returns {Set<number>} serials to mark.
 */
export function windowSerials(draft, value, windowMonths) {
  const end = serial(draft.month, draft.year)
  const untouched = value && value.month === draft.month && value.year === draft.year
  if (untouched && Array.isArray(windowMonths) && windowMonths.length > 0) {
    const out = new Set()
    for (const entry of windowMonths) {
      const p = normalizePeriod(entry)
      if (p) out.add(serial(p.month, p.year))
    }
    if (out.size > 0) return out
  }
  return rollingWindowSerials(end)
}

/**
 * What one grid cell is.
 *
 * `selected` and `inWindow` are mutually exclusive on purpose: the end of the
 * window has to read differently from the other eleven months (§3.3), so the
 * two are distinct visual states rather than one state drawn twice.
 *
 * @param {object} args
 * @param {number} args.s        the cell's serial.
 * @param {number} args.end      serial of the picked end month.
 * @param {Set<number>|null} args.window  serials the window covers, null when
 *        the variant does not mark a window (Daily / Hourly pickers).
 * @param {number|null} args.limit  newest selectable serial, null for no ceiling.
 * @param {number|null} args.floor  oldest selectable serial, null for no floor.
 */
export function chipState({ s, end, window: windowSet, limit, floor }) {
  const selected = s === end
  const inWindow = !selected && !!windowSet && windowSet.has(s)
  const disabled = (limit != null && s > limit) || (floor != null && s < floor)
  return { selected, inWindow, disabled }
}

/**
 * Whether the year stepper can leave `viewYear` in each direction.
 *
 * A year page with nothing selectable on it is a dead page, and a control that
 * looks operable and does nothing is the defect §3.2 names. Both ends stop
 * where the data stops (PLS-WC-08).
 */
export function yearNavState(viewYear, limit, floor) {
  return {
    prevDisabled: floor != null && serial(11, viewYear - 1) < floor,
    nextDisabled: limit != null && serial(0, viewYear + 1) > limit,
  }
}
