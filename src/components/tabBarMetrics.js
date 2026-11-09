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
 * ⚠ A Tailwind CLASS must carry the literal — `h-[112px]`, never
 *   `h-[${TAB_BAR_CLEARANCE}px]`. The scanner reads source text and emits no
 *   CSS for a template-built class. Style VALUES may be imported; class TEXT
 *   may not.
 *
 * ── THE NUMBERS MOVED, THE MODEL DID NOT — 2026-11-09 ────────────────────
 *
 * Figma node 200067:39019 (`nav`, file YEmjkKS4xaA827Zm8w3oXx) re-draws the
 * bar: 335 x 66 at x=33, y=756 inside a 402 x 844 artboard. So
 *
 *      pill height    65 -> 66        side inset   16 -> 33
 *      bottom inset   12 -> 22        footprint    77 -> 88
 *      clearance      93 -> 104       gap          16 -> 16  (unchanged)
 *
 * THE RESERVED-STRIP MODEL ABOVE IS UNCHANGED AND MUST STAY. The frame draws
 * the pill over live rows and fills it at 57% rather than 96%, so it LOOKS
 * like a bar floating above scrolling content. A Figma frame cannot express
 * scroll behaviour; the appearance is the design and the behaviour is the bug
 * that was fixed in b3f5a31.
 *
 * ── THE LABELS CAME BACK, AND THE BAR GREW — 2026-11-09 (later the same day)
 *
 * The owner, with a screenshot: *"add text bellow here / Home ,Systems ,
 * Alerts, Profile"*. That reverses the no-labels reading the bar had carried
 * since 2026-11-04 (WhatsApp + Material 3) and which node 200067:39019 had
 * seemed to confirm by holding no text node. A direct instruction outranks
 * both. The pill therefore has to hold glyph + gap + label again:
 *
 *      pill height    66 -> 74        footprint    88 -> 96
 *      clearance     104 -> 112       gap          16 -> 16  (unchanged)
 *      side inset     33 -> 33        bottom inset 22 -> 22  (both unchanged)
 *
 * The side and bottom insets are still the frame's; only the height moved,
 * because only the height has to hold anything new.
 *
 * ⚠ THE EXEMPT SCREEN TRACKS THIS NUMBER, AND IT IS AT 112.
 *   src/v2/pages/MoreComingSoonScreen.jsx is the ONE documented EXEMPT screen
 *   (its scroll region is inside an `absolute inset-0` cover, which reserved
 *   column cannot push, so it pays its own clearance). It was moved
 *   `pb-[104px]` -> `pb-[112px]` with this change. 104 was never broken - it
 *   still cleared the 96px footprint, so nothing was under the pill - but it
 *   bought only 8px of the 16px gutter, and leaving it would make the next
 *   clearance change start from a wrong number.
 *   moreComingSoon.dom.test.jsx asserts a [FOOTPRINT, CLEARANCE] window rather
 *   than an exact literal, so it stayed green across both values; that is the
 *   bound working as intended, not the check being loose.
 */

/**
 * The pill's own height. TabBar PILL: `h-[74px]`.
 *
 * IT HOLDS GLYPH + GAP + LABEL AGAIN — 2026-11-09, the owner: *"add text
 * bellow here / Home ,Systems , Alerts, Profile"*. The arithmetic, outward:
 *
 *      28      the glyph (node 200067:39019)
 *     + 2      the gap
 *     + 16.5   the label, 11px Figtree at a 16.5px line-height
 *     ------
 *      46.5    the content stack
 *     + 9.5    air, 4.75 above and below
 *     ------
 *      56      the item, which is also the active indicator
 *     + 16     the bar's own p-[8px], which the frame states
 *     +  2     the 1px ring, which sits inside the box
 *     ------
 *      74      the pill
 *
 * 56 is deliberately close to the 57px tab the bar carried the last time it
 * had labels: the glyph grew 21 -> 28, the air shrank, and the frame's padding
 * arithmetic lands the pill on an even number. It is NOT 66 + 18.5: the
 * frame's 48px item leaves 10px of air each side of a lone glyph, which is
 * generous for one glyph and would be 85px of bar once a label joins it.
 */
export const TAB_BAR_PILL_HEIGHT = 74

/** How far the pill floats above the frame's bottom edge. PILL: `bottom-[22px]`. */
export const TAB_BAR_BOTTOM_INSET = 22

/**
 * How far the pill floats in from EACH SIDE. PILL: `inset-x-[33px]`.
 *
 * THE INSET IS FIXED AND THE WIDTH IS FLUID, deliberately. Node 200067:39019
 * draws a 335-wide bar at x=33 inside a 402-wide artboard - a 33px left inset
 * and a 34px right one - while the app shell (Phone.jsx) is 393 wide. One of
 * those three numbers has to give, and it is the width:
 *   · 33/34 is what the frame actually expresses; 335 is the consequence.
 *   · a fixed `w-[335px]` overflows any frame narrower than ~343.
 *   · `inset-x-[Npx]` is the idiom the pill already used.
 * At 393 the pill is 327 wide (column 77.25); at 402 it is 336 (column 79.50
 * against the frame's 79.25, the 1px asymmetry split).
 */
export const TAB_BAR_SIDE_INSET = 33

/**
 * The band at the bottom of the frame that the pill occupies, measured up from
 * the frame's bottom edge: the inset it floats at plus its own height.
 */
export const TAB_BAR_FOOTPRINT = TAB_BAR_BOTTOM_INSET + TAB_BAR_PILL_HEIGHT

/**
 * The column the bar's HOST reserves in the Phone flex column. TabBar HOST:
 * `h-[112px]`.
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
