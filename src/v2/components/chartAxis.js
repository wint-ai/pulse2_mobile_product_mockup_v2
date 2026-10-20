/**
 * Chart axis helpers.
 *
 * Lives in its own module because a component file may only export components
 * — exporting this from WaterConsumptionCardV2.jsx breaks React Fast Refresh
 * (react-refresh/only-export-components), and it needs to be importable by
 * tests: recharts requires real layout, so no axis renders under happy-dom and
 * the ladder cannot be asserted through the DOM.
 */

/**
 * Tick labels take their unit from the TOP of the scale, not from each value.
 *
 * The formatter this replaced divided every tick by 1000 and appended K
 * whatever the magnitude, so a fleet-scale axis rendered "12000K" — wider than
 * the 37px axis, which clipped it to "000K" and dropped the leading digits.
 * Deriving the unit once from domainMax keeps the ladder readable at any scale,
 * and is what makes it end "0K" / "0M" rather than a bare 0, as the design
 * draws it. (PRD §14, PLS-WC-19.)
 */
export function axisFormatter(domainMax) {
  if (domainMax >= 1e6) return (v) => `${Number((v / 1e6).toFixed(1))}M`
  if (domainMax >= 1e3) return (v) => `${Number((v / 1e3).toFixed(1))}K`
  return (v) => String(Math.round(v))
}

/**
 * THE UNIT, ONCE — and why it is not on the ticks.
 *
 * The owner asked for units on the y axis. The obvious reading is to append
 * them to every tick ("24K L"), and the obvious reading is the one the gutter
 * cannot afford: `yAxisWidth` sizes the axis from its WIDEST tick string, and
 * the widest tick is always the top one, so putting the unit on every tick and
 * putting it on the top tick alone cost exactly the same. Measured at 393px,
 * where the whole chart surface is 311px wide:
 *
 *   grouping   ticks            yAxisWidth   slot    bar
 *   Day(31)    0 … 400K              44      8.61     6     <- on the floor
 *   Day(31)    0 … "400K L"          59      8.13     6     <- 4px from losing it
 *   Hour(24)   0 … 24K               37     11.42     9
 *   Hour(24)   0 … "24K L"           52     10.79     8     <- a pixel gone
 *
 * i.e. the unit on the ticks costs 15px of the scarcest space on the card and
 * leaves the 31-bucket worst case one rounding away from dropping under
 * BAR_MIN_WIDTH, for two characters repeated five times beside a figures row
 * that already reads "Total L". So the unit is printed ONCE, as a caption over
 * the tick column, where it costs the gutter nothing and the ticks stay bare.
 * `yAxisWidth` must therefore never see this string — keep it out of
 * `axisFormatter`.
 *
 * NOT WIRED TO THE ACCOUNT SCREEN, and that is a pre-existing gap, not this
 * change's doing: AccountScreenV2's Measurement Units picker holds its choice
 * in a local `useState` that no other module imports, so every litre figure on
 * every screen — this axis, "Total L", Top usage' "TOTAL LITERS" — is litres
 * whatever the picker says. The map below is the one place to read once that
 * preference becomes real state.
 */
export const AXIS_UNIT_SYMBOL = {
  liters: 'L',
  gallons: 'gal',
  cubic_meters: 'm³',
}

/** The key the Account screen stores, and the one assumed everywhere else. */
export const DEFAULT_UNITS_KEY = 'liters'

/**
 * The axis caption for a units KEY. Falls back rather than printing nothing:
 * an axis with no unit is the bug this fixes, and an unknown key is a wiring
 * mistake that should still leave the chart readable.
 */
export function axisUnitLabel(unitsKey) {
  return AXIS_UNIT_SYMBOL[unitsKey] ?? AXIS_UNIT_SYMBOL[DEFAULT_UNITS_KEY]
}
