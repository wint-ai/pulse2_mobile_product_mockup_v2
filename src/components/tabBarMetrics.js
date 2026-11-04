/**
 * The numbers the floating tab bar and every scroll body have to agree on.
 *
 * TabBar.jsx cannot import these INTO its class strings — Tailwind's scanner
 * only sees literal class text, so a template-built `h-[${n}px]` emits no CSS
 * and the element silently collapses. The class strings therefore carry the
 * literals and this module is the single written-down statement of what they
 * mean, which `tabBarFloatingClearance.dom.test.jsx` checks the rendered
 * classes against. Change a number here and the test tells you which class
 * string disagrees.
 *
 * Pages DO import TAB_BAR_CLEARANCE, because a scroll body's bottom padding is
 * an ordinary style value with no Tailwind involvement.
 */

/** The pill's own height. TabBar PILL: `h-[65px]`. */
export const TAB_BAR_PILL_HEIGHT = 65

/** How far the pill floats above the frame's bottom edge. PILL: `bottom-[12px]`. */
export const TAB_BAR_BOTTOM_INSET = 12

/** How far the pill floats in from each side. PILL: `inset-x-[16px]`. */
export const TAB_BAR_SIDE_INSET = 16

/**
 * The band at the bottom of the frame that the pill covers, measured up from
 * the frame's bottom edge. Content inside this band is BEHIND the pill.
 */
export const TAB_BAR_FOOTPRINT = TAB_BAR_BOTTOM_INSET + TAB_BAR_PILL_HEIGHT

/**
 * What a scroll body must carry as bottom padding so its last row comes to
 * rest clear of the pill instead of under it.
 *
 * The footprint plus a real gap, not a hairline: 16px is this app's own
 * gutter, the same figure the pill is inset by and the same one the home
 * screen's cards use, so a row at the end of a list sits the same distance
 * from the pill as it does from the frame's sides.
 *
 * 2026-11-04, the owner: "and it needs to be completely floating". Before
 * that the bar reserved 77px of column and nothing was allowed behind it; the
 * cost of a real float is that this padding now has to be on EVERY scroll
 * body, because the bar no longer reserves anything for itself.
 */
export const TAB_BAR_CLEARANCE = TAB_BAR_FOOTPRINT + 16
