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
