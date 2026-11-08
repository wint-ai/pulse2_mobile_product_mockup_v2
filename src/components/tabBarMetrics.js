/**
 * The numbers the floating tab bar is built from.
 *
 * TabBar.jsx cannot import these INTO its class strings — Tailwind's scanner
 * only sees literal class text, so a template-built `h-[${n}px]` emits no CSS
 * and the element silently collapses. The class strings therefore carry the
 * literals and this module is the single written-down statement of what they
 * mean, which `tabBarFloatingClearance.dom.test.jsx` checks the rendered
 * classes against. Change a number here and the test tells you which class
 * string disagrees.
 *
 * ── THE BAR PAYS ITS OWN CLEARANCE NOW — 2026-11-08 ──────────────────────
 *
 * THE BUG. The owner: *"I can't click any water events from location. It just
 * doesn't click."* Measured in WebKit at 390x664 on /location/Office: the
 * first water-event row sat at y 568->634 and the pill at y 587->652, 96%
 * OPAQUE with `pointer-events: auto`. `document.elementsFromPoint` at the
 * row's own centre returned the PILL first, so every tap landed on the bar.
 * The row's top ~19px peeked out above the pill, so it still read as a live
 * row. Scroll the same row to the middle of the screen and it opened fine.
 *
 * WHY THE PADDING DID NOT SAVE IT. Between 2026-11-04 and 2026-11-08 the host
 * was `h-0` and seventeen scroll bodies each carried TAB_BAR_CLEARANCE as
 * BOTTOM PADDING. Bottom padding only governs where the END of a list comes
 * to rest. At every intermediate scroll position — including the one a screen
 * opens at — rows still sat inside the pill's band, fully visible and
 * completely untappable. Two of five locations were dead on arrival.
 *
 * THE FIX, AND WHAT IT MOVED. The HOST now reserves TAB_BAR_CLEARANCE of real
 * height in the Phone column (`h-[93px]`), so the scroll body simply ends
 * above the bar and NO content can ever be under it, at any scroll offset.
 * The pill stays `absolute` inside that host with its insets untouched, so
 * the floating look — detached, inset 16px each side, 12px off the bottom
 * edge, 65 tall — is pixel-identical. 12 + 65 = 77 of the 93, leaving a 16px
 * strip of page background above the pill: the same gutter the padding used
 * to buy, now paid once by the bar instead of seventeen times by the screens.
 *
 * ⚠ SCREENS MUST NOT PAY IT AGAIN. A scroll body carrying
 *   `paddingBottom: TAB_BAR_CLEARANCE` on top of this reserves the strip
 *   TWICE and leaves ~186px of dead space under the last row.
 *   `tabBarFloatingClearance.dom.test.jsx` fails any screen that does.
 *
 * ⚠ A Tailwind CLASS must carry the literal — `h-[93px]`, never
 *   `h-[${TAB_BAR_CLEARANCE}px]`. The scanner reads source text and emits no
 *   CSS for a template-built class. Style VALUES may be imported; class TEXT
 *   may not.
 */

/** The pill's own height. TabBar PILL: `h-[65px]`. */
export const TAB_BAR_PILL_HEIGHT = 65

/** How far the pill floats above the frame's bottom edge. PILL: `bottom-[12px]`. */
export const TAB_BAR_BOTTOM_INSET = 12

/** How far the pill floats in from each side. PILL: `inset-x-[16px]`. */
export const TAB_BAR_SIDE_INSET = 16

/**
 * The band at the bottom of the frame that the pill occupies, measured up from
 * the frame's bottom edge: the inset it floats at plus its own height.
 */
export const TAB_BAR_FOOTPRINT = TAB_BAR_BOTTOM_INSET + TAB_BAR_PILL_HEIGHT

/**
 * The column the bar's HOST reserves in the Phone flex column. TabBar HOST:
 * `h-[93px]`.
 *
 * The footprint plus a real gap, not a hairline: 16px is this app's own
 * gutter, the same figure the pill is inset by and the same one the home
 * screen's cards use, so a row at the end of a list sits the same distance
 * from the pill as it does from the frame's sides.
 *
 * 2026-11-08: this is the HOST's height, not a per-screen padding. It was the
 * padding seventeen scroll bodies carried while the host was `h-0`, and that
 * is exactly what failed — see the header of this file. A screen that adds it
 * back on top of the host double-pays and gains ~186px of dead space.
 */
export const TAB_BAR_CLEARANCE = TAB_BAR_FOOTPRINT + 16

/**
 * The strip of page background left visible ABOVE the pill, between it and
 * the last row of the scroll body. It is the difference the host reserves
 * over the pill's own footprint, and the reason the host is 93 and not 77.
 */
export const TAB_BAR_GAP = TAB_BAR_CLEARANCE - TAB_BAR_FOOTPRINT
