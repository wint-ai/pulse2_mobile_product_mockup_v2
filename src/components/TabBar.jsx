import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, LayoutGrid, Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PersonaAvatar from '@/v2/components/PersonaAvatar';
import { useAlertScope, useScopedActiveAlerts } from '../hooks/useActiveAlerts';
import { useUserContext } from '../context/UserContext';
/* WHERE THIS USER'S TOP LEVEL IS. Moved here from HomeAllAccounts.jsx with
   the header house's job on 2026-11-04 — see THE DASHBOARD TAB IS THE HOME
   BUTTON below. It is the same rule, not a second derivation. */
import { homeTargetFor } from '../utils/homeTarget';

/**
 * Bottom tab bar — a FLOATING PILL (2026-11-04, the owner: "something that
 * looks much more modern. I hate the one that we use now"), built in-repo on
 * the shadcn primitives already here, with no new dependency.
 *
 * Glyphs and the Alerts count badge are still Figma node 199922:83973
 * (navigation redesign, component 1 of 4). The slab is not: a full-bleed bar
 * welded to the bottom edge by a hairline became a detached, heavily rounded
 * pill inset from all three edges, with the page visible around it.
 *
 * ── WHATSAPP / MATERIAL 3, 2026-11-04 ────────────────────────────────────
 *
 * The owner, with a screenshot of the four-item pill: *"i want this component
 * to be like on whatsapp - go check how it looks and implement it"*. What that
 * actually means, from WhatsApp's current Android bar (WABetaInfo, Oct 2026 -
 * it floats above the screen with rounded corners and carries NO text labels,
 * with a wide rounded pill behind the selected icon) and from the Material 3
 * navigation-bar spec it is built on (m3.material.io/components/navigation-bar
 * - active state is a filled icon PLUS an active indicator; 3-5 destinations;
 * labels configurable as all / selected-only / none; and NO elevation shadow,
 * unlike M2):
 *
 *   1. THE VISIBLE LABELS ARE GONE. They survive as sr-only text - see the
 *      note at the span for why that is not the same as deleting them.
 *   2. THE ACTIVE INDICATOR IS NOW A WIDE 64x32 PILL at radius 16, M3's
 *      shape, replacing the 32x32 rounded square the owner's reference image
 *      had. With no label beneath it the square read as a button; M3's
 *      indicator is deliberately wider than the icon it holds.
 *   3. THE PILL LOST 9px of height (65 -> 56) now that it holds one 32px row
 *      instead of glyph + gap + label.
 *
 * *** FLAG FOR THE OWNER, ONE: THIS OVERRIDES HIS OWN FIGMA FRAME. ***
 * 199922:83973 draws a label under every glyph, and Dashboard / Alerts / More
 * are locked strings in wint-ui-copy §1. WhatsApp's bar has no labels, so the
 * two references disagree and the newer instruction won. Reversing it is one
 * line: give the span back `order-2 text-[11px] leading-[16.5px]` plus the
 * 600/500 weight pair in place of `sr-only`, and put the pill back to
 * h-[65px] with a 32x32 radius-11 indicator.
 *
 * *** FLAG FOR THE OWNER, TWO: M3 SAYS NO SHADOW, AND I KEPT ONE. ***
 * M3 drops M2's elevation because its navigation bar is DOCKED to the screen
 * edge and separates by surface-container colour instead. This one is not
 * docked - it floats over a gradient wash with a 1px ring - and the light and
 * sand separation measured weak without help. WhatsApp's own floating bar
 * casts a shadow. So `--shadow-overlay` stays, which is a deliberate
 * divergence from M3 and not an oversight. Dropping it is deleting one class.
 *
 * FILLED ICONS - WHAT IS ACTUALLY AVAILABLE, not what M3 asks for.
 * lucide-react 1.43.0 ships 6224 exports and NO filled variants: the only
 * "Solid" name in the whole set is SquareDashedTopSolid, which is unrelated.
 * The sole mechanism is `fill="currentColor"` over the existing stroke paths,
 * and it works only where a path encloses area:
 *   LayoutGrid  four <rect> 7x7 rx=1  -> fills, four solid squares.  WORKS
 *   Bell        closed body path + clapper arc -> fills, solid bell. WORKS
 *   Menu        "M4 5h16" / "M4 12h16" / "M4 19h16", three open straight
 *               strokes enclosing nothing -> fill paints NOTHING.      CANNOT
 *   Profile     a photograph. There is no filled form of a face.       N/A
 * So More and Profile signal active by the indicator and the --primary ink
 * alone. That is M3-legal rather than a compromise - the spec pairs the two
 * mechanisms, and where a glyph has no filled form the indicator carries it.
 * Swapping Menu for a fillable glyph (Ellipsis, say) was NOT done: the glyph
 * set is the frame's and changing it is the owner's call, not a side effect
 * of a shape change.
 *
 * ── FOUR TABS: PROFILE JOINED, 2026-11-04 ─────────────────────────────────
 *
 * The owner: *"user profile avatar needs to be available from all screens. So
 * [either] keep it on the right corner every time, or just move it to the
 * footer."* Asked to choose, he picked the footer. Order is his reference
 * image's: Dashboard · Alerts · Profile · More.
 *
 * ***ITS DESTINATION IS UNRESOLVED AND THE OWNER HAS TO RULE.*** Profile
 * navigates to /account, which is where the header avatars already go — but
 * the More tab goes there too, so this bar now has two tabs opening one
 * screen. That is reported, not hidden, and nothing was invented to paper
 * over it. The evidence, all of it already in this repo:
 *
 *   1. /account is ONE route with TWO VIEWS held in local state
 *      (AccountScreenV2.jsx:313 `view`): 'main', titled "More", and 'profile',
 *      titled "Personal information", reached by tapping the persona card
 *      (:546). Profile is a SUB-VIEW, not a route. There is no URL for it.
 *   2. Both header avatars already navigate to /account and already call
 *      themselves `<name> - profile and More` (MobileHeaderBar.jsx:209,
 *      AlertsHeaderBar.jsx:216). The accessible name concedes the merge.
 *   3. The owner has already ruled on exactly this question once. Both those
 *      call sites carry his words - "why do we need two user profiles pages" -
 *      as the reason they open More itself rather than deep-linking past it to
 *      the profile sub-page.
 *   4. `login.switch_profile_hint` is live user-facing copy that reads "Press
 *      **More** in the bottom tab bar at any time to switch to a different
 *      profile." A Profile tab beside More makes that sentence ambiguous.
 *   5. WintSidebarV2.jsx:823-827 renders `Users` and `Reports` DELIBERATELY
 *      INERT - "no PRD and no designed screen. There is no route to send them
 *      to and inventing one would be a guess."
 *
 * Read together with the owner's separate note that More should reach "the
 * reports, users, etc", the surface that does not exist yet is MORE's, not
 * Profile's: /account as it stands IS the profile surface. The resolution is
 * his to make - most likely More moves to a reports/users screen when one
 * exists and Profile keeps /account - and when he makes it, only this file's
 * `path` for one tab changes. Pointing Profile anywhere else today would mean
 * inventing a route, which rule 0 of wint-ui-copy and the sidebar's own note
 * both forbid.
 *
 * SIDE EFFECT OF THE COLLISION, stated rather than fudged: AccountScreenV2
 * passes `activeTab="account"`, so on /account the MORE tab lights up and
 * Profile does not - including when you arrived by tapping Profile. That is
 * the duplication showing through, and it is not worth hiding with a second
 * key for one screen. It resolves itself the moment the two tabs have two
 * destinations.
 *
 * THE PROFILE GLYPH IS THE USER'S FACE, not an icon - PersonaAvatar at 21px,
 * the same box the other three glyphs occupy, so the row stays even. That
 * component is NEW and is an extraction, not a fourth copy: the portrait-over-
 * initials disc was inlined in MobileHeaderBar (28px) and AlertsHeaderBar
 * (38px), each with its own private `initialsOf`.
 *
 * ACTIVE STATE ON AN AVATAR. The other three glyphs signal active twice, by
 * filling and by taking --primary. A photograph can do neither. Profile
 * therefore signals with the two mechanisms that do apply - the bg-primary/15
 * rounded-square panel behind it, and the label going 600 on --primary - and
 * the 21px disc inside the 32px panel leaves a 5.5px tinted surround that
 * reads as the selection. No ring, no scale, no desaturation of the
 * inactive portrait: the face is the same face either way, and dimming a
 * person to mean "not here" is a worse idea than it first sounds.
 *
 * NEW COPY - awaiting the owner. `tabs.profile`, en "Profile", he "פרופיל".
 * No catalogue string existed for it; the nearest, `more.switch_profile`
 * ("Switch profile"), is a different act. Marked the way the Alerts badge
 * string below is marked.
 *
 * ── THE DASHBOARD TAB IS THE HOME BUTTON — 2026-11-04 ────────────────────
 *
 * The owner, with a screenshot of /location/Office showing `‹ back`, a house
 * disc and the `Office` pill:
 *
 *   "I want to completely remove the home icon. And once user clicks on
 *    dashboard, it just takes him to the upper level of the scope that he
 *    already have. Instead of the home button. Just remove it"
 *
 * The house is deleted from AppHeaderBar and its two jobs landed here. Both
 * of them — dropping either one is how this change goes wrong:
 *
 *   1. DESTINATION. The Dashboard tab used to navigate to a FIXED `/`. It now
 *      goes to `homeTargetFor(visibleIds).path`, the deepest node that holds
 *      everything the signed-in user can see — src/utils/homeTarget.js, moved
 *      out of HomeAllAccounts.jsx unchanged. Measured in the running app:
 *        wint-admin        /                      (was /)  unchanged
 *        location-manager  /location/100%20Meridian%20Plaza  (was /)
 *        tenant-1apt       /system/esrt-bldg-A-apt-3  (was the same)
 *      The whole-fleet short-circuit in that module is load-bearing: all 103
 *      systems share the l1Name "United States", so without it the admin
 *      would land on /location/United States.
 *   2. THE DRAWER SCOPE. `clearSelectedScope()`, which the house also did.
 *      The drawer-selected location is the THIRD of useAlertScope()'s three
 *      narrowings and v1's screens still set it, so a tab that only changed
 *      the route would land you on "All Accounts" with the body still showing
 *      one location — the page contradicting its own title.
 *
 * *** FLAG FOR THE OWNER: (2) REVERSES THE 2026-06-15 RULE BELOW, AND FOUR
 *     NAMED REGRESSION TESTS PIN IT. *** `scopePersistsAcrossTabs` and
 * `drawerLocationHighlight` were written for a bug Rami reported — pick a
 * location on Alerts, tap Home, the scope is silently wiped — and the fix was
 * the comment inside onClick: "Bottom-tab tap NEVER mutates scope". Four of
 * their assertions tap Dashboard and then require the scope to still be set:
 *   scopePersistsAcrossTabs.dom.test.jsx:134  Alerts -> Home preserves scope
 *   scopePersistsAcrossTabs.dom.test.jsx:165  the round-trip, first leg
 *   drawerLocationHighlight.dom.test.jsx:178  highlight survives Home->Alerts->Home
 *   drawerLocationHighlight.dom.test.jsx:218  /system/<id> -> Home keeps the
 *                                             system scope (that same report)
 * They fail now, and they are not flaky: they are the old rule, still stated.
 * The two rules cannot both hold on one button, because the owner has made
 * the Dashboard tab the home control and "go to your top level" is a
 * scope-widening act by definition. This is HIS call to confirm, not a
 * finding — the 2026-06-15 behaviour was a real user complaint, and the flow
 * it protected (Alerts, pick a location, tap Dashboard to see that location)
 * is genuinely worse now: you land at your own top level instead.
 * REVERTING IS ONE LINE: delete the `clearSelectedScope?.()` call in onClick
 * below. The destination half (1) is untouched by that and keeps working.
 * NOTHING ELSE changed about scope — the Alerts, Profile and More taps still
 * never touch it, which is the half of the 2026-06-15 rule that survives.
 *
 * TENANTS KEEP THEIR OWN DESTINATIONS, deliberately — see the note at
 * `tenantTabs`. A tenant's Dashboard is /tenant or their one system, and
 * homeTargetFor would send a two-apartment tenant to /location/Residential,
 * a level she holds two systems of. That is the exact failure the "one
 * system" short-circuit exists to prevent, one rung further up.
 *
 * NO NEW ACCESSIBLE NAME, and this is a decision rather than an omission.
 * The house carried `Go to <scope name>` because copy §5 makes a glyph-only
 * control name its destination; that string is RETIRED with the glyph and is
 * no longer awaiting anybody. This tab is not glyph-only — it has a label,
 * "Dashboard", locked in wint-ui-copy §1, and a place name IS a destination.
 * Three further reasons not to add one: an `aria-label` REPLACES content for
 * name computation, which is why this file has none anywhere (it would mute
 * the Alerts badge, see the span below); `valveWidgetMount.dom.test.jsx:562`
 * and four drawer suites address these buttons by that exact name; and a
 * persistent nav landmark whose announced name changes per persona
 * ("Go to 100 Meridian Plaza") while its visible label stays "Dashboard"
 * gives one control two names.
 *
 * ── COMPLETELY FLOATING, AND WHAT IT COST ─────────────────────────────────
 *
 * 2026-11-04, the owner: *"and it needs to be completely floating"*.
 *
 * Phone.jsx is a fixed 393x852 flex column with overflow:hidden, so
 * `position: fixed` is banned in here. A real float therefore means the bar
 * reserves NO column at all: HOST is `h-0`, the pill is `absolute` off it, and
 * every screen's scroll body now runs the full height of the frame with its
 * content passing UNDER the pill. `backdrop-blur-[10px]` has been in this file
 * since the Figma rebuild waiting for exactly this; it is finally doing work.
 *
 * THE COST IS REAL AND IT IS PAID PER SCREEN. The bar used to reserve 77px and
 * nothing was allowed behind it. Now the bottom 77px of every screen is
 * covered, so every scroll body must carry TAB_BAR_CLEARANCE (93px =
 * TAB_BAR_FOOTPRINT 77 + a 16px gap, this app's own gutter) as bottom padding
 * or its last row comes to rest underneath the pill and cannot be read.
 * tabBarMetrics.js holds those numbers; `tabBarFloatingClearance.dom.test.jsx`
 * checks the rendered classes against them.
 *
 * Fifteen scroll bodies across fourteen files were given that padding in the
 * same change: EventsScreen, SystemPageV2Screen, ValveManagementScreen,
 * EventHistory, HomeClear, HomeManager, HomeMultiAccount, HomeUnified,
 * KPIDetailScreen, ErrorAlertDetail, LeakDetail, L4Screen, SystemDetail (two)
 * and AccountScreenV2.
 *
 * DELIBERATELY NOT PADDED, because the bar is not visible on them: the
 * PushNotifications OS simulations and EventFocusOverlay are `absolute inset-0`
 * at z-[300] and z-50, both above this bar's `z-index: auto`, so they cover it
 * entirely and 93px there would be a gap under nothing.
 *
 * STILL OWED, and they will trap their last row until someone does it:
 * HomeAllAccounts (another agent held the file), HomeAccountOverview and
 * SystemPage (the /old and /old/system/:id preview routes, dirty in the tree at
 * the time). One line each, the same 93.
 *
 * ── NO CIRCULAR ACTION BUTTON ─────────────────────────────────────────────
 *
 * The owner's reference carries a separate circular button beside the pill,
 * holding a search glyph. It is deliberately NOT reproduced.
 *
 * Search in this app lives in the NavigationDrawer header
 * (NavigationDrawer.jsx:1015-1027 — one input that searches systems AND
 * locations), and the drawer is one burger tap from every screen that mounts
 * this bar. A search button here would be a second door onto the same room.
 * Nothing else in the product is a global ACTION rather than a destination:
 * scope, favourites, persona and theme are all drawer- or account-owned, and
 * valves are a screen, not an action. A fourth slot would therefore have to
 * invent a destination and coin a label for it, which the copy rules forbid
 * (wint-ui-copy §0). An empty circle that looks tappable is worse than no
 * circle, so the pill ships alone. Taken from the reference instead: the
 * detached slab, the generous radius, the rounded-square panel behind the
 * ACTIVE glyph only, and the label under every glyph.
 *
 * ── TOKEN MAPPING ─────────────────────────────────────────────────────────
 *
 * The frame's light-mode hexes, each mapped to the nearest token BY VALUE AND
 * BY ROLE so all four themes (:root / dark / sand / contrast) move with it. A
 * literal hex here would freeze identically across all four, and a Tailwind
 * utility naming a token this repo does not define would silently fall through
 * to stock Tailwind and do the same.
 *   bar fill      rgba(255,255,255,0.96) -> bg-card/96      (--card is #FFFFFF
 *                                           in :root and sand, near-black in
 *                                           dark, green in contrast)
 *   border        #e3e8f0 -> border-border      (--border = --slate-200 #e2e8f0)
 *                            Now a full ring rather than a top hairline: a
 *                            detached slab has four edges.
 *   active ink    #2f7cf6 -> text-primary       (--primary = #0b81f8)
 *   inactive ink  #6b7686 -> text-muted-foreground
 *                            (--muted-foreground = --slate-500 #62748e — a
 *                            9/2/8 RGB step from the frame's value, and the
 *                            ramp INVERTS per theme so dark/sand get a light
 *                            de-emphasised ink rather than a dark one.)
 *   badge fill    #e5484d -> bg-destructive     (the danger role, not a red)
 *   badge ink     white   -> text-destructive-foreground (which is #FFFFFF in
 *                            :root and flips to dark ink on the themes whose
 *                            --destructive lightens — see button.jsx)
 *   elevation             -> [box-shadow:var(--shadow-overlay)], the repo's
 *                            float tier (index.css:498 and the elevation note
 *                            above it). PushNotifications.jsx:816 uses the same
 *                            token for the same job. It is NOT a literal
 *                            rgba(): the dark theme's value is a different
 *                            instrument — a 12% white ring plus a near-black
 *                            pool — because a black shadow on a black ground is
 *                            not a shadow.
 *   active panel  -> bg-primary/15, i.e. color-mix of the ACTIVE INK itself.
 *                    The reference's panel is "lighter than the pill", which is
 *                    a dark-theme statement and inverts on light and sand, so
 *                    "lighter" cannot be the rule. Deriving the panel from the
 *                    ink is the rule that survives all four.
 *                    --accent was the obvious shadcn choice for a selected
 *                    surface and was rejected on measurement. Active glyph
 *                    contrast, sampled per theme through a canvas so the oklch
 *                    tokens come back as real sRGB (21px glyph -> 3:1 target):
 *                      theme     bare card (before)  --accent   primary/15
 *                      light           3.81            3.52        3.16
 *                      dark            4.71            2.77        3.98
 *                      sand           17.49           16.03       12.80
 *                      contrast        1.44            1.66        1.50
 *                    --accent fails on `dark` at 2.77. primary/15 clears 3:1 on
 *                    the three real themes and is the only candidate that does.
 *                    `contrast` is the diagnostic theme and is garish by
 *                    construction (index.css:1617); the panel leaves it where
 *                    it already was.
 *
 * ── GEOMETRY ──────────────────────────────────────────────────────────────
 *
 * Measured in the browser at 393x852, deviceScaleFactor 2 (so a 130px PNG
 * reading is 65 CSS px — these are the printed boundingBox values, not pixel
 * counts off a screenshot):
 *
 *   host    [0, 852, 393, 0]      zero height, on the frame's bottom edge
 *   pill    [16, 775, 361, 65]    radius 26, bottom edge at 840
 *   column  89.75 x4              361 minus the 1px ring each side, / 4
 *   capsule [39.9, 784.3, 44, 28] radius 14, i.e. a true stadium
 *   glyph   21                    2px gap, then an 11px/16.5px label
 *
 * 361 is also the content gutter the home screen's scroller already uses, so
 * the pill's edges line up with the cards passing behind it. The tab is 57
 * tall so its hover/focus highlight sits 4px inside the pill instead of
 * squaring off against its radius. Grid, not flex, because the shadcn Button
 * base carries `shrink-0` and a `flex-1` on the tab would lose to it depending
 * on utility order in the emitted stylesheet.
 *
 * THE COLUMN WENT 120.33 -> 89.75 WHEN PROFILE JOINED, and the labels were
 * measured in a browser rather than eyeballed. 89.75 and not 90.25 because the
 * pill's 1px ring is inside its 361px box, so the grid divides 359.
 *
 * Label widths at 11px Figtree, by Range.getBoundingClientRect (the text, not
 * its box), against that 89.75px column:
 *   EN  Dashboard 57.47 @600 active / 53.42 @500   <- the widest string anywhere
 *       Alerts 28.13   Profile 31.19   More 25.06 (25.83 @600)
 *   HE  לוח בקרה 43.02 @600   התראות 35.28   פרופיל 28.14   עוד 14.14
 * So the tightest case leaves 32.28px of air, `scrollWidth > clientWidth` is
 * false on all four in both languages, and nothing truncates or collides.
 * "Profile" at 31.19 is the second-shortest English label and was never the
 * risk; "Dashboard" was, and it clears.
 *
 * The label span carries no `truncate` on purpose: there is nothing to
 * truncate, and an ellipsis that can never fire is dead code (see
 * scripts/check-text-overflow.mjs, which is green on this file).
 *
 * ICONS are lucide-react, picked on the frame's shapes rather than its names:
 *   Dashboard  LayoutGrid       four 7x7 rects at rx=1 in a 2x2 — the frame's
 *                               "four rounded squares". NOT Grid2x2 (one big
 *                               square cut by a crosshair) and NOT
 *                               LayoutDashboard (2x2 but of UNEQUAL heights,
 *                               9/5/9/5 — a dashboard mosaic, not a grid).
 *   Alerts     Bell             unchanged.
 *   More       Menu             three full-width horizontal rules at y=5/12/19
 *                               — the frame's hamburger. NOT AlignJustify,
 *                               which lucide now aliases to text-align-justify
 *                               (four rules, text-alignment semantics).
 * Active state fills the glyph and goes semibold in the accent; inactive keeps
 * the 1.8 stroke. That mechanism predates this frame and is untouched.
 *
 * MOTION is one 200ms colour fade on the active panel, and nothing else. No
 * transform, so there is no layout jank and no animation library — the repo has
 * none and is not getting one here. `motion-reduce:transition-none` is the
 * repo's convention (BulkValveConfirmSheet.jsx:1098) and is carried on both the
 * panel and the Button, whose base class is `transition-all`.
 *
 * LAYOUT CONTRACT: the HOST is a shrink-0 sibling inside the Phone column
 * (393x852, overflow hidden), 77px tall. It is NOT fixed and needs no spacer.
 * The pill inside it is absolute and fully contained — see the arithmetic above.
 *
 * THE SAME TABS EVERYWHERE, and the `hideAlerts` prop is gone (2026-11-04, the
 * owner, reversing 875c560 of 2026-09-29). That commit dropped the Alerts tab
 * from the four v2 shell pages on an information-architecture judgement, not
 * a guard: "Pulse 2.0 reaches alerts from the home surface itself - the health
 * pills and the water-event rows both open the alerts overlay pre-filtered -
 * so a third tab pointing at the v1 /alerts screen was a leftover". Nothing
 * about it protected a route that had no Alerts destination or a persona with
 * no alerts; /alerts was a live route on every one of those screens and stayed
 * reachable from the sidebar, from ActiveErrorsWidget and by URL throughout.
 * The redesign frame has three columns, the owner chose the frame, and with a
 * count badge on it the tab now carries information the home surface does not.
 * Those pre-filtered entry points from Home are untouched and still work.
 */

/* The anchor. ZERO HEIGHT, by design: it reserves no column at all, so the
   scroll body above it runs the full height of the frame and its content
   passes UNDER the pill. `relative` makes this the pill's positioning context
   — a zero-height box sitting on the frame's bottom edge, so the pill's
   `bottom-[12px]` is measured from that edge rather than from whichever
   ancestor happens to be positioned. `shrink-0` is kept because a flex item
   of height 0 can still be given a negative-ish share by a greedy sibling. */
const HOST = 'relative shrink-0 h-0';

/* The slab. It now floats over the scroll body: 12 up from the frame's bottom
   edge, 65 tall, so it covers the bottom 77px of every screen (TAB_BAR_FOOTPRINT
   in tabBarMetrics.js). Every scroll body pays for that with
   TAB_BAR_CLEARANCE (93px) of bottom padding — the footprint plus a 16px gap,
   the app's own gutter — so its last row comes to rest clear of the pill
   rather than under it.

   No `overflow-hidden`: the Alerts badge is deliberately hung off the top-right
   corner of its glyph and pokes a few px past the active capsule. */
const PILL =
  'absolute inset-x-[16px] bottom-[12px] grid h-[65px] grid-cols-4 items-center ' +
  'rounded-[26px] border border-border bg-card/96 backdrop-blur-[10px] ' +
  '[box-shadow:var(--shadow-overlay)]';

/* One tab. Built on the shadcn ghost Button so the focus ring and the hover
   handling come from the design system rather than being hand-rolled;
   `h-[57px]` / `p-0` / `w-full` and the column direction undo the size="default"
   preset. font-sans is Figtree. */
const TAB =
  'h-[57px] w-full cursor-pointer flex-col gap-[2px] rounded-[20px] p-0 font-sans ' +
  'motion-reduce:transition-none';

/* THE ACTIVE INDICATOR, reshaped from the owner's WhatsApp screenshot
   (2026-11-04): a CAPSULE hugging the glyph - 44x28 at radius 14, which is
   half the height, so the ends are true semicircles rather than a
   rounded-rectangle's corners. It replaced a 32x32 rounded square: the
   screenshot's indicator is noticeably wider than tall, and the label sits
   OUTSIDE it, below.

   44 wide against a 21px glyph leaves 11.5px either side - snug, which is what
   "hugging the icon" means; and inside an 89.75px column it leaves 22.9px
   either side, so two adjacent indicators never come close to touching. 28
   tall keeps glyph + 2px gap + 16.5px label inside the 57px tab.

   No `overflow-hidden`: the Alerts badge hangs off its glyph's top-right and
   is allowed to cross the capsule's edge. */
const INDICATOR =
  'order-1 flex h-[28px] w-[44px] items-center justify-center rounded-[14px] ' +
  'transition-colors duration-200 motion-reduce:transition-none';

export default function TabBar({ activeTab }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const userCtx = useUserContext() || {};
  const { persona, visibleSystems = [], clearSelectedScope } = userCtx;
  const isTenant = persona?.tabMode === 'tenant';

  /* THE COUNT IS NOT DERIVED HERE. useScopedActiveAlerts() is the exact hook
     /alerts builds its Active list and its "Showing X of Y" headline from, so
     the badge and the page it points at cannot disagree. It is SCOPED to the
     persona, the ?scope= param and the drawer selection (2026-11-04, the
     owner) - this badge used to read 21 for a tenant who owns one apartment.
     A second, narrower derivation here would be a number the user cannot find
     anywhere on the page it points at. */
  const alertCount = useScopedActiveAlerts().length;

  /* THE DASHBOARD TAB'S DESTINATION — see THE DASHBOARD TAB IS THE HOME
     BUTTON above. Read off the SAME hook the badge above reads, so the tab
     that says how many alerts you have and the tab that takes you home
     cannot disagree about which systems are yours. `visibleIds` is the
     persona filter alone and deliberately ignores where the user has drilled
     to: home is a property of the user, not of the current route.

     Memoised on the scope object, which is what HomeAllAccounts did with the
     identical derivation before it moved here: `visibleIds` is stable across
     renders (useAlertScope memoises it) but the filter over 103 systems is
     not free on a bar that re-renders with every route change. */
  const alertScope = useAlertScope();
  const homeTarget = useMemo(() => homeTargetFor(alertScope.visibleIds), [alertScope]);

  /* PROFILE IS IN ALL THREE PERSONA VARIANTS, not just the default one. Its
     destination does not vary by persona the way Dashboard's does - every
     persona has exactly one /account - so the entry is identical in each. See
     the collision note at the top of this file for why that destination is
     the same one `account` already uses. */
  const PROFILE = { key: 'profile', label: t('tabs.profile'), path: '/account', Avatar: true };

  const TABS_FULL = [
    /* `path` WAS the literal '/'. It is the user's own top level now — the
       house's destination, moved. `match` is here because the two are no
       longer the same question: this tab's DESTINATION varies per persona,
       while the Dashboard's ROUTES are fixed (App.jsx: `/` and
       `/location/:locationName`). Without it the fallback below would leave
       the tab unlit on `/` for every narrowed persona, since their home is a
       location. Every real screen passes `activeTab` explicitly, so this
       only governs the bare `<TabBar />` the drawer suites mount — which is
       exactly where a silent change would go unnoticed. */
    {
      key: 'home',
      label: t('tabs.home'),
      path: homeTarget.path,
      match: p => p === '/' || p.startsWith('/location/'),
      Icon: LayoutGrid,
    },
    { key: 'events',  label: t('tabs.alerts'), path: '/alerts',  Icon: Bell },
    PROFILE,
    { key: 'account', label: t('tabs.more'),   path: '/account', Icon: Menu },
  ];
  const TABS_TENANT = [
    { key: 'home',    label: t('tabs.home'),   path: '/tenant',  Icon: LayoutGrid },
    { key: 'events',  label: t('tabs.alerts'), path: '/alerts',  Icon: Bell },
    PROFILE,
    { key: 'account', label: t('tabs.more'),   path: '/account', Icon: Menu },
  ];

  /* For single-system tenants, Dashboard tab points directly to their system.
     BOTH TENANT VARIANTS ARE LEFT EXACTLY AS THEY WERE by the 2026-11-04
     home-button move, and that is deliberate rather than an oversight:
       · one system  -> /system/<id>, which is the SAME answer homeTargetFor
                        gives her, so there is nothing to move.
       · two or more -> /tenant, TenantHome, which IS the tenant roll-up and
                        is the top of her tree. homeTargetFor would send the
                        two-apartment persona to /location/Residential — a
                        level holding ~50 systems she owns two of, and a
                        screen built for managers. That is the failure the
                        "one system" short-circuit prevents one rung lower.
     The CLEAR in onClick still applies to them; only the destination differs. */
  const tenantTabs = isTenant && visibleSystems.length === 1
    ? [
        { key: 'home',    label: t('tabs.home'),   path: `/system/${visibleSystems[0].id}`, Icon: LayoutGrid },
        { key: 'events',  label: t('tabs.alerts'), path: '/alerts',                          Icon: Bell },
        PROFILE,
        { key: 'account', label: t('tabs.more'),   path: '/account',                         Icon: Menu },
      ]
    : TABS_TENANT;

  const tabs = isTenant ? tenantTabs : TABS_FULL;

  return (
    <div className={HOST} data-name="tabbar-host">
      <div className={PILL} data-name="tabbar-pill">
        {tabs.map(tab => {
          /* `match` only exists on the Dashboard tab, whose destination is
             per-user while its routes are fixed — see TABS_FULL. Everything
             else keeps the original exact-path test. */
          const isActive = activeTab
            ? activeTab === tab.key
            : (tab.match ? tab.match(location.pathname) : location.pathname === tab.path);
          const Icon = tab.Icon;
          // A red 0 is noise, so the badge is absent rather than zeroed.
          const showBadge = tab.key === 'events' && alertCount > 0;
          const formatted = alertCount.toLocaleString('en-US');
          return (
            <Button
              key={tab.key}
              variant="ghost"
              onClick={() => {
                // Bottom-tab tap NEVER mutates scope. Scope is owned by the
                // drawer (set by drill-down) and the breadcrumb (cleared via
                // 'My Systems' tap). Dashboard and Alerts share one scope and
                // must stay in sync as the user navigates between them.
                //
                // Earlier (2026-06-08) we cleared scope here to avoid carry-over
                // from System Detail; that was the wrong fix - it broke the
                // Alerts-pick-location -> Dashboard -> Alerts flow (scope wiped
                // on the Dashboard tap, then wiped again on the Alerts tap).
                // 2026-06-15.
                //
                // STILL TRUE OF EVERY TAB BUT ONE. 2026-11-04 the owner made
                // the DASHBOARD tab the home button ("Instead of the home
                // button"), and the control it replaced cleared this scope on
                // every press. Going to the top of your own hierarchy while
                // still narrowed to one location inside it is the page
                // disagreeing with its own title, so the clear came with the
                // job. It is scoped to this one key on purpose: the 2026-06-08
                // mistake was doing it unconditionally, and Alerts, Profile
                // and More still do not touch scope.
                //
                // THIS REVERSES THE 2026-06-15 RULE FOR THIS BUTTON and four
                // named regression tests say so. They are listed, with the
                // one-line revert, in THE DASHBOARD TAB IS THE HOME BUTTON at
                // the top of this file. Flagged for the owner, not decided
                // here.
                if (tab.key === 'home') clearSelectedScope?.();
                navigate(tab.path);
              }}
              className={cn(TAB, isActive ? 'text-primary' : 'text-muted-foreground')}
            >
              {/* The label is deliberately the FIRST child and the FIRST <span>
                  in the button; `order-2` is what puts it back UNDER the glyph.
                  Four DOM tests pick the tab by
                  `button.querySelector('span').textContent`
                  (scopePersistsAcrossTabs, scopePersistsThroughDrawer,
                  systemImplicitScope, drawerLocationHighlight), and the count
                  badge has to live INSIDE the glyph box to be positioned off its
                  corner — so the glyph box moved behind the label rather than
                  the badge being bent into some other element. Line-height goes
                  AFTER the font size — twMerge drops a leading-* that precedes
                  one.

                  It is also the tab's ACCESSIBLE NAME, which is why there is no
                  `aria-label` on the Button: an aria-label REPLACES an
                  element's content for name computation, so the Alerts tab
                  would stop announcing its count - the badge's own aria-label
                  composes into the name only while that name comes from
                  content. */}
              <span className={cn('order-2 text-[11px] leading-[16.5px]', isActive ? 'font-semibold' : 'font-medium')}>
                {tab.label}
              </span>
              {/* M3's active indicator. Drawn ONLY for the active tab — four
                  indicators would be no active state at all. The inner 21px
                  box, not this one, stays the badge's positioning context, so
                  the frame's left-15 / top--7 are still measured off the GLYPH
                  and did not have to move when the indicator grew around it. */}
              <div className={cn(INDICATOR, isActive && 'bg-primary/15')}>
                {/* size-[21px] also opts the glyph out of the Button preset's
                    `[&_svg:not([class*='size-'])]:size-4`, which would otherwise
                    shrink it to 16px. */}
                <div className="relative size-[21px]">
                  {tab.Avatar ? (
                    /* The face, in the same 21px box the line icons get.
                       `text-[8px]` is the initials fallback scaled off
                       MobileHeaderBar's 11px-at-28 and AlertsHeaderBar's
                       13px-at-38 - it is only ever seen if the portrait
                       fails to load. */
                    <PersonaAvatar size={21} initialsClassName="text-[8px]" />
                  ) : (
                    <Icon
                      className="size-[21px]"
                      strokeWidth={1.8}
                      fill={isActive ? 'currentColor' : 'none'}
                    />
                  )}
                  {showBadge && (
                    /* A bare "4" announces as nothing, so the badge carries its
                       own accessible name and the button's name becomes
                       "Alerts 4 active alerts". data-name is the separator the
                       copy rules ask for between a label and a count.

                       NO role="status" here, deliberately. It would be the right
                       role on its own, but TabBar is mounted on every screen and
                       AccountScreenV2 already owns the one status region on its
                       page (accountScreenV2.dom.test.jsx:241 asserts there is
                       exactly one). A live region that fires on every route is
                       also not what a static count wants. The aria-label is read
                       by the button name computation either way. */
                    /* NEW COPY - awaiting the owner. en: "{{formatted}} active
                       alert(s)" (tabs.alerts_badge_one/_other). It borrows the word
                       the Alerts page already uses for this set - its first tab is
                       literally "Active" - rather than coining a second one. The
                       Hebrew is mine, not a catalogue string: "לוח בקרה" for
                       Dashboard and "{{formatted}} התראות פעילות" for the badge. */
                    <span
                      data-name="alerts-count"
                      aria-label={t('tabs.alerts_badge', { count: alertCount, formatted })}
                      className="absolute left-[15px] top-[-7px] flex h-[16px] min-w-[16px] items-center justify-center rounded-[8px] bg-destructive px-[4px] text-center text-[10px] leading-none font-bold text-destructive-foreground tabular-nums"
                    >
                      {formatted}
                    </span>
                  )}
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
