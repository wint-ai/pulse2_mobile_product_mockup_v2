import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, LayoutGrid, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PersonaAvatar from '@/v2/components/PersonaAvatar';
import WintSidebarV2 from '@/v2/components/WintSidebarV2';
/* The Search tab's whole mechanism. Read that file before touching the
   onClick below — the cancelable dispatch is the part that is easy to
   simplify into a dead button. */
import { requestDrawerSearch } from './drawerSearch';
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
 *   Search      <circle r=8> (the lens) + "m21 21-4.34-4.34" (the handle,
 *               open, encloses nothing). The lens WOULD fill - into a solid
 *               disc with a stick, which reads as a blob rather than as a
 *               magnifier.                                             MOOT
 * Menu's row above was written when More held this slot; Search replaced it
 * 2026-11-07 and the entry is kept because the reasoning still governs any
 * future glyph here. Search's own row says MOOT rather than CANNOT, and the
 * distinction matters: Search is an ACTION, not a destination (see THE SEARCH
 * TAB below), so it never takes the active state and `fill` on it is never
 * anything but 'none'. The question the rest of this block answers - how does
 * this glyph say "you are here" - is one Search never has to answer.
 * So Profile signals active by the indicator and the --primary ink alone.
 * That is M3-legal rather than a compromise - the spec pairs the two
 * mechanisms, and where a glyph has no filled form the indicator carries it.
 *
 * ── FOUR TABS: PROFILE JOINED, 2026-11-04 ─────────────────────────────────
 *
 * The owner: *"user profile avatar needs to be available from all screens. So
 * [either] keep it on the right corner every time, or just move it to the
 * footer."* Asked to choose, he picked the footer. Order WAS his reference
 * image's: Dashboard · Alerts · Profile · More. It is not any more - see the
 * next block. Still four items, still one 361px slab, still grid-cols-4.
 *
 * ── THE SEARCH TAB REPLACES MORE — 2026-11-07 ─────────────────────────────
 *
 * The owner, verbatim:
 *
 *   "another thing we need to do is replace the 'More' in buttom main nav bar
 *    With Search -locate right to dashboard
 *    Serach open the nav bar with the systems and locations"
 *
 * So the row is now **Dashboard · Search · Alerts · Profile**. Two separate
 * instructions, and both are load-bearing:
 *
 *   1. MORE IS REPLACED BY SEARCH. The glyph is lucide `Search`.
 *   2. IT MOVES TO SECOND POSITION, immediately right of Dashboard - not
 *      appended where More sat. Alerts and Profile keep their glyphs, their
 *      badge and their behaviour and simply shift right one column.
 *
 * SEARCH IS AN ACTION, NOT A DESTINATION, and that is the whole difference
 * between this tab and the other three. It has no route, no `path` and no
 * `activeTab` key, and it MUST NEVER take the active indicator: an indicator
 * on a control that does not change the page is a lie about where you are.
 * `isActive` is hard-coded false for it below rather than left to fall out of
 * a path comparison, so no future edit to the matching logic can light it.
 *
 * WHAT IT OPENS. The navigation drawer - the one that already lists systems
 * and locations - with its search field already open and focused. That
 * machinery is WintSidebarV2's own (`searchOpen`, the `searchRef` focus
 * effect, the field whose placeholder is "Search locations and systems"); it
 * is driven here, not rebuilt. There is no second search UI in this app.
 *
 * HOW IT REACHES A DRAWER IT DOES NOT OWN. Every screen holds its own drawer
 * and its own open state - eighteen screens mount this bar. The tab asks, by
 * the cancelable window event in src/components/drawerSearch.js, and whichever
 * drawer is on this route answers. HALF THE ROUTES ANSWER WITH NOTHING - the
 * sweep in that file lists all twenty, ten and ten - and the FALLBACK block
 * further down is what keeps the tab from being dead on them. Read
 * drawerSearch.js before changing any of this.
 *
 * THE ACCESSIBLE NAME IS `Search locations and systems`, NOT `Search`.
 * This is the one place in this file that carries an `aria-label`, and it is
 * an exception to the rule stated at the label span below - which is safe
 * only because this tab has no badge whose count the label would swallow.
 * Two reasons it is not simply "Search":
 *   · A chevron is a promise; so is a magnifier. wint-ui-copy §5 makes a
 *     control name what it acts on, and "Search" alone names neither the
 *     systems nor the locations it opens.
 *   · It replaces the drawer's last accessible door on these routes. The name
 *     that job used to travel under was `Switch location`, which a tab whose
 *     visible label reads "Search" CANNOT carry: WCAG 2.5.3 Label in Name
 *     requires the accessible name to contain the visible one. The string
 *     here is the drawer's own field name instead, so the door and the room
 *     announce alike, and "Search" is contained in it.
 * `Switch location` now answers on NO v2 route (swept 2026-11-07). It is not
 * extinct: `/v1/` and `/systems` render HomeUnified, whose v1 ScopeHeader
 * still carries it. Those two are reference routes, and whether the v1 tree
 * keeps that name is not this file's call.
 *
 * COPY FLAG FOR THE OWNER. `Search locations and systems` is transcribed, not
 * authored - WintSidebarV2.jsx:742 has rendered it as the drawer field's own
 * aria-label since that file was built. But it was a bare English literal
 * there, NOT a catalogue entry, so it could not be translated and could not
 * be shared. It is `drawer.search_label` now. That leaves THREE strings in
 * this app for one act, which violates wint-ui-copy §3a rule 4 (one word, one
 * meaning) and is his call, not mine:
 *     drawer.search_label       "Search locations and systems"   (new entry)
 *     drawer.search_placeholder "Search my systems and locations" (v1 drawer)
 *     WintSidebarV2.jsx:706     "Search locations"   (the magnifier toggle)
 * `tabs.search` ("Search" / "חיפוש") is NEW COPY awaiting him, marked the way
 * `tabs.profile` and the Alerts badge string are marked.
 *
 * ── THE COLLISION IS RESOLVED, 2026-11-04 ────────────────────────────────
 *
 * Profile and More both navigated to /account for most of a day. The owner,
 * having raised it three times:
 *
 *   "Profile needs to open the user profile. More doesn't need to open the
 *    user profile - they are separate buttons. You can just grey out the More
 *    for now... or you can just open a screen and say this is coming soon,
 *    this is better. But don't use the same buttons for the same thing. So
 *    make the More navigate to / overlay a new screen which hides everything,
 *    but writes there Coming soon."
 *
 * The split this file predicted is the one taken, and it is the only one the
 * evidence supported:
 *
 *   PROFILE -> /account, AccountScreenV2, which IS the personal surface and
 *     keeps every row it had. Its two local-state views ('main' titled "More"
 *     and 'profile' titled "Personal Information") are now ONE scroll titled
 *     "Profile", with Personal Information first - so the tab opens the user
 *     profile with no extra tap, which was the complaint.
 *   MORE -> /more, MoreComingSoonScreen, a full-cover placeholder carrying
 *     `more.coming_soon` and nothing else. This is the "reports, users, etc"
 *     surface the owner described separately; it has no PRD, no designed
 *     screen and no content, and inventing one would be the guess that
 *     WintSidebarV2's inert rows and rule 0 of wint-ui-copy both forbid.
 *
 * *** /more IS ORPHANED AS OF 2026-11-07, AND IS DELIBERATELY LEFT STANDING.
 * The More tab was this route's ONLY inbound link, so with Search in that slot
 * nothing in the running app navigates to /more any more. The route in
 * App.jsx:144 and src/v2/pages/MoreComingSoonScreen.jsx are BOTH still here,
 * untouched, and must stay: the owner asked for the TAB to be replaced, not
 * for the destination to be demolished, and deleting a working screen on an
 * inference is exactly what rule 0 of the contract forbids. It is still
 * reachable by URL and `routeSmoke.dom.test.jsx:220` still renders it. Where
 * "reports, users, etc" finally lives is an open question with him. ***
 *
 * `login.switch_profile_hint` IS NOW WRONG TWICE OVER AND IS THE OWNER'S CALL.
 * It is live copy reading "Press **More** in the bottom tab bar at any time to
 * switch to a different profile." It was already stale on 2026-11-04 when
 * Profile split out and took switch-profile with it; as of today there is no
 * More in the bottom tab bar AT ALL, so the string now names a control that
 * does not exist. It is still NOT rewritten here: it is copy, it is his, and
 * §0 of .claude/skills/wint-ui-copy/SKILL.md says propose, do not pick. The
 * same goes for WintSidebarV2.jsx:797's note that "/select is still reachable
 * from More -> Switch profile" - true of the screen, wrong about the tab.
 *
 * THE ACTIVE INDICATOR IS FIXED BY THE SAME CHANGE. AccountScreenV2 used to
 * pass `activeTab="account"`, so arriving by tapping Profile lit MORE. It
 * passes "profile" now, /more passes "more", and the More tab's key moved
 * from 'account' to 'more' so no key names the other tab's route.
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
 * `position: fixed` is banned in here. The float is therefore a pill that is
 * `absolute` inside its own host: detached from all three edges, with the page
 * visible around it.
 *
 * ── THE BAR RESERVES ITS OWN STRIP — 2026-11-08 ──────────────────────────
 *
 * *** THIS REVERSES HALF OF THE 2026-11-04 FLOAT, AND IT IS A BUG FIX. ***
 *
 * The owner: *"I can't click any water events from location. It just doesn't
 * click."* Measured in WebKit at 390x664 on /location/Office: the first
 * water-event row at y 568->634, the pill at y 587->652,
 * `background: oklab(1 0 0 / 0.96)` — 96% OPAQUE — and `pointer-events: auto`.
 * `document.elementsFromPoint` at the row's own centre returned the PILL
 * first. The row's top ~19px peeked above the bar so it still read as live.
 * /location/Office and /location/967 Alder Dr were dead on arrival; the other
 * locations worked only because their rows happen to open higher up.
 *
 * WHY THE PADDING DID NOT COVER IT. `h-0` plus TAB_BAR_CLEARANCE of bottom
 * padding on every scroll body only governs where the END of a list comes to
 * rest. At every intermediate scroll offset — the one a screen OPENS at,
 * above all — rows still sat inside the pill's band, visible and untappable.
 *
 * SO THE HOST IS `h-[93px]` NOW: it occupies TAB_BAR_CLEARANCE of the Phone
 * column as an ordinary flex sibling, the scroll body ends above it, and no
 * content is ever behind the pill at any scroll position. The pill itself did
 * not move — same `inset-x-[16px] bottom-[12px] h-[65px]`, same radius, same
 * ring, same shadow — so the floating look is unchanged; 12 + 65 = 77 of the
 * 93 leaves a 16px strip of page background above it.
 *
 * NOT DONE, AND IT MUST NOT BE: `pointer-events-none` on the pill. The four
 * tab buttons span ~100% of its width, so taps would simply hit the wrong tab
 * instead of the row. And no z-index: the host stays `z-index: auto` so the
 * drawer (10/11) and the overlays (50/300) keep covering it.
 *
 * THE PER-SCREEN PADDING IS GONE WITH IT. Seventeen scroll bodies carried
 * `paddingBottom: 93` / `pb-[93px]` / `padding: '10px 14px 93px'` for the four
 * days the host was `h-0`; keeping it on top of a 93px host would reserve the
 * strip twice and leave ~186px of dead space under every page. They were
 * cleared in the same change — EventsScreen, SystemPageV2Screen,
 * ValveManagementScreen (scroller AND selection strip), EventHistory,
 * HomeClear, HomeManager, HomeMultiAccount, HomeUnified, KPIDetailScreen,
 * ErrorAlertDetail, LeakDetail, L4Screen, SystemDetail, AccountScreenV2,
 * HomeAllAccounts, HomeAccountOverview, SystemPage and MoreComingSoonScreen.
 * `tabBarFloatingClearance.dom.test.jsx` now fails any screen that pays it
 * again.
 *
 * WHAT IT COST. `backdrop-blur-[10px]` and `bg-card/96` are inert again —
 * nothing scrolls under the pill for them to blur. Both are KEPT: they are
 * the pill's declared appearance, the 4% translucency still samples the page
 * background behind it, and removing them would change the look, which this
 * fix explicitly must not.
 *
 * ── NO CIRCULAR ACTION BUTTON (STILL TRUE), BUT SEARCH IS IN THE BAR ──────
 *
 * The owner's 2026-11-04 reference carried a separate circular button BESIDE
 * the pill holding a search glyph, and that circle is still not reproduced:
 * the pill ships alone, as one slab. Taken from the reference instead: the
 * detached slab, the generous radius, the rounded-square panel behind the
 * ACTIVE glyph only, and the label under every glyph.
 *
 * *** THE REST OF THIS BLOCK WAS OVERRULED ON 2026-11-07. *** It used to
 * argue that search did not belong in this bar at all, on three grounds. Two
 * of them were overtaken by events and one was simply wrong:
 *
 *   "the drawer is one burger tap from every screen that mounts this bar" -
 *     NO LONGER TRUE. The burger went with the header redesign, and on the
 *     routes in this restructure the Search tab is the drawer's only door.
 *     The argument that a search button would be "a second door onto the same
 *     room" inverted the day the first door was removed.
 *   "nothing else in the product is a global ACTION rather than a destination"
 *     - still true, and still the reason this tab needs its own rules rather
 *     than the three the others share. It is a reason to be careful, which
 *     THE SEARCH TAB block above tries to be, not a reason to refuse.
 *   "a fourth slot would have to invent a destination and coin a label" -
 *     this slot invents no destination: it opens a drawer that already
 *     exists, by a name that was already rendering in it.
 *
 * Kept rather than deleted because the reasoning is the record of why the bar
 * looked the way it did for three days, and because the one surviving clause
 * - no circle beside the pill - is still in force.
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
 *   host    [0, 759, 393, 93]     TAB_BAR_CLEARANCE of reserved column, its
 *                                 bottom edge on the frame's bottom edge
 *                                 (it was [0, 852, 393, 0] while `h-0`)
 *   pill    [16, 775, 361, 65]    radius 26, bottom edge at 840 — UNCHANGED
 *                                 by the host taking height; 759 + 16 = 775
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
 * pill's 1px ring is inside its 361px box, so the grid divides 359. SEARCH
 * REPLACING MORE DID NOT MOVE IT: still four items, still grid-cols-4, still
 * an 89.75 column. Only the strings in them changed.
 *
 * Label widths at 11px Figtree, by Range.getBoundingClientRect (the text, not
 * its box), against that 89.75px column. RE-MEASURED 2026-11-07 at 393x852,
 * deviceScaleFactor 2, after document.fonts.load('600 11px Figtree') had
 * resolved - see the correction below:
 *                      @500 inactive   @600 active
 *   EN  Dashboard           53.42          53.92    <- the widest anywhere
 *       Search              34.42         (34.73)
 *       Alerts              29.28          29.80
 *       Profile             31.94          32.53
 *   HE  לוח בקרה            41.31          43.02
 *       חיפוש               25.67         (27.11)
 *       התראות              35.28          36.72
 *       פרופיל              28.14          30.13
 * Search's @600 figure is PARENTHESISED because it is never rendered: the tab
 * is an action and is never active, so it is always the 500 weight. It is
 * recorded only so the next person need not re-measure to rule it out.
 *
 * The tightest case is Dashboard ACTIVE at 53.92 inside an 89.75 column, so
 * 35.83px of air; scrollWidth > clientWidth measured false on all four in
 * both languages, and nothing truncates or collides. Search at 34.42 is the
 * second-widest English label and was never the risk.
 *
 * *** CORRECTION: THE "Dashboard 57.47 @600" THIS BLOCK USED TO CARRY WAS A
 *     BAD READING. *** Every other figure in it reproduces exactly (More
 *     25.83 @600, all four Hebrew strings, Dashboard 53.42 @500), so the
 *     method was right and one number was not: 57.47 is what the browser
 *     returns while the Figtree 600 FACE IS STILL UNLOADED and it synthesises
 *     the weight off 500. Real SemiBold is narrower. Measuring the active
 *     label without awaiting document.fonts.load reproduces 57.47 on demand.
 *     It never mattered - 57.47 fits too - but it is the kind of number that
 *     gets copied forward into a decision that does matter.
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
 *   Search     Search           <circle cx=11 cy=11 r=8> plus the handle
 *                               "m21 21-4.34-4.34". The plain magnifier, and
 *                               the same shape WintSidebarV2's own search
 *                               toggle draws (Search01) - the door and the
 *                               control inside the room match. NOT SearchX /
 *                               SearchCheck / SearchSlash, which all state an
 *                               outcome this control does not have.
 *                               (It replaced Menu here on 2026-11-07. Menu
 *                               was three full-width rules at y=5/12/19, the
 *                               frame's hamburger, and NOT AlignJustify,
 *                               which lucide now aliases to
 *                               text-align-justify - four rules, text-
 *                               alignment semantics. Recorded in case the
 *                               hamburger ever comes back.)
 * Active state fills the glyph and goes semibold in the accent; inactive keeps
 * the 1.8 stroke. That mechanism predates this frame and is untouched - and
 * Search is outside it entirely, never being active.
 *
 * MOTION is one 200ms colour fade on the active panel, and nothing else. No
 * transform, so there is no layout jank and no animation library — the repo has
 * none and is not getting one here. `motion-reduce:transition-none` is the
 * repo's convention (BulkValveConfirmSheet.jsx:1098) and is carried on both the
 * panel and the Button, whose base class is `transition-all`.
 *
 * LAYOUT CONTRACT: the HOST is a shrink-0 sibling inside the Phone column
 * (393x852, overflow hidden), TAB_BAR_CLEARANCE (93px) tall. It is NOT fixed
 * and needs no spacer, and the screens need no bottom padding — the host IS
 * the spacer. The pill inside it is absolute and fully contained — see the
 * arithmetic above.
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

/* The anchor. IT RESERVES THE WHOLE STRIP — TAB_BAR_CLEARANCE, 93px — as a
   real flex sibling of the scroll body, so content ends ABOVE the bar and
   nothing can ever come to rest underneath it. That is the 2026-11-08 fix;
   the long version is in tabBarMetrics.js and in THE BAR RESERVES ITS OWN
   STRIP above.

   `h-0` STOOD HERE AND WAS THE BUG. A zero-height host let the scroll body
   run the full frame with its content passing under the pill, and the pill is
   96% opaque with `pointer-events: auto`, so every row inside its band was
   visible and dead. Do not put it back: `pointer-events-none` on the pill is
   not the alternative either — the four tab buttons span the pill's whole
   width, so taps would land on the wrong tab.

   `relative` makes this the pill's positioning context, so the pill's
   `bottom-[12px]` is measured from the frame's bottom edge rather than from
   whichever ancestor happens to be positioned. `shrink-0` keeps a greedy
   sibling from compressing the strip back to nothing. */
const HOST = 'relative shrink-0 h-[93px]';

/* The slab. Absolutely positioned INSIDE the 93px host, which is what keeps
   the floating look while the host does the reserving: 12 up from the frame's
   bottom edge, 65 tall (TAB_BAR_FOOTPRINT = 77), inset 16 each side. 93 - 77
   leaves a 16px strip of page background above it — the app's own gutter, and
   the same distance a last row used to rest at when every scroll body paid
   the clearance itself.

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

  /* SEARCH AND PROFILE ARE IN ALL THREE PERSONA VARIANTS, not just the
     default one. Neither varies by persona the way Dashboard's destination
     does - every persona has exactly one /account, and every persona's drawer
     is the same drawer - so both entries are identical in each and are
     declared once here rather than retyped three times.

     `action: true` IS THE WHOLE DIFFERENCE between Search and the other
     three. It carries no `path` and no route, so:
       · the click handler opens the drawer instead of navigating;
       · `isActive` is forced false, so it can never take the indicator;
       · `activeTab` has no key that names it, and no screen passes one.
     See THE SEARCH TAB REPLACES MORE at the top of this file.

     MORE IS GONE FROM THIS BAR as of 2026-11-07, replaced here by Search on
     the owner's instruction. /more and MoreComingSoonScreen are NOT deleted -
     see the orphaning flag at the top. Its key was 'more' and nothing else in
     the repo passes `activeTab="more"` except MoreComingSoonScreen itself,
     which now lights no tab at all. */
  const SEARCH = { key: 'search', label: t('tabs.search'), a11yLabel: t('drawer.search_label'), action: true, Icon: Search };
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
    /* SECOND, immediately right of Dashboard - the owner said where, not just
       what: "replace the 'More' ... With Search -locate right to dashboard".
       Alerts and Profile shift right rather than Search being appended. */
    SEARCH,
    { key: 'events',  label: t('tabs.alerts'), path: '/alerts',  Icon: Bell },
    PROFILE,
  ];
  const TABS_TENANT = [
    { key: 'home',    label: t('tabs.home'),   path: '/tenant',  Icon: LayoutGrid },
    SEARCH,
    { key: 'events',  label: t('tabs.alerts'), path: '/alerts',  Icon: Bell },
    PROFILE,
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
        SEARCH,
        { key: 'events',  label: t('tabs.alerts'), path: '/alerts',                          Icon: Bell },
        PROFILE,
      ]
    : TABS_TENANT;

  const tabs = isTenant ? tenantTabs : TABS_FULL;

  /* THE FALLBACK DRAWER, and it is the honest half of the Search tab.
     requestDrawerSearch() returns false on the TEN live routes that mount
     this bar and no drawer at all — /account, /alerts, /alerts/system/:id,
     /kpi/:type, /leak/:id, /l4/:l4id, /more, /home-clear, /home-multi and
     /home-legacy. (Measured in the running app, 2026-11-07; the full
     twenty-route sweep is in drawerSearch.js.) Without this, Search would be
     a button that does nothing on all ten — and since it is the drawer's only
     door, the drawer would be unreachable on half the app. Rule 0 of the
     contract and §0 of wint-ui-copy both forbid shipping that.

     MOUNTED LAZILY, and that is not an optimisation. A drawer that is always
     in the tree would be a SECOND drawer on the ten routes that already
     have one: duplicate [data-drawer-target] rows (four suites read those
     with querySelector, which takes the first match), a second copy of the
     103-system tree on every screen, and two drawers whose expansion and
     query state drift apart. Nothing is rendered until a tap goes unanswered,
     so on a route with its own drawer this stays null forever.

     It is a SIBLING of the host, never a child of it: HOST is `relative` and
     only TAB_BAR_CLEARANCE tall, so a panel with `inset-y-0` inside it would
     be 93px tall instead of full height (and zero, back when the host was
     `h-0`). Out here the drawer pins to the page root or to the Phone frame,
     which is what WintSidebarV2 expects. Its scrim is z-10 and its panel
     z-[11], both above this bar's z-index:auto, so the open drawer covers the
     pill exactly as a screen-owned drawer does.

     THE STATE IS THE ROUTE IT WAS OPENED AT, not a boolean, and that single
     choice does three jobs with no `useEffect` at all (which this config
     rejects outright — react-hooks/set-state-in-effect is an error):
       · a route change closes it, by a comparison evaluated during render;
       · it unmounts when closed, so it can never still be listening for the
         Search event after the user walks onto a route that HAS a drawer —
         two drawers answering one tap would open both;
       · nothing is in the tree until the first unanswered tap.
     THE COST, stated because it is visible: mounting already-open means no
     250ms slide-in and no slide-out, so on those ten routes the drawer
     appears and disappears rather than sliding. A screen-owned drawer stays
     mounted and does slide. Accepted over the alternative, which is a second
     drawer that is sometimes live on a route that already has one. */
  const [fallbackAt, setFallbackAt] = useState(null);
  const fallbackOpen = fallbackAt !== null && fallbackAt === location.pathname;

  return (
    <>
    <div className={HOST} data-name="tabbar-host">
      <div className={PILL} data-name="tabbar-pill">
        {tabs.map(tab => {
          /* `match` only exists on the Dashboard tab, whose destination is
             per-user while its routes are fixed — see TABS_FULL. Everything
             else keeps the original exact-path test.

             AN ACTION TAB IS NEVER ACTIVE, checked first so neither branch
             below can reach it. Search changes no route, so an indicator on
             it would claim a location the user is not at. */
          const isActive = tab.action
            ? false
            : activeTab
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
              /* THE ONLY aria-label IN THIS FILE, and only on the action tab.
                 An aria-label REPLACES content for name computation, which is
                 why the other three must not have one — it would mute the
                 Alerts badge (see the span below). Search carries no badge
                 and no count, so there is nothing here for it to swallow.
                 `Search locations and systems` rather than `Search`: WCAG
                 2.5.3 Label in Name is satisfied (the visible "Search" is
                 contained in it) and wint-ui-copy §5 wants the control named
                 for what it acts on. */
              aria-label={tab.a11yLabel}
              onClick={() => {
                /* SEARCH ACTS; IT DOES NOT NAVIGATE. It asks the drawer on
                   this route to open with its search field open and focused,
                   and only mounts one of its own if this route has none. No
                   navigate(), and deliberately no clearSelectedScope() —
                   opening a search is not going home, and the scope rule
                   below applies to the Dashboard tab alone. */
                if (tab.action) {
                  if (!requestDrawerSearch()) setFallbackAt(location.pathname);
                  return;
                }
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
    {/* Mounted only while open — see the FALLBACK block above for why that is
        a correctness requirement here and not a tidiness one. */}
    {fallbackOpen && (
      <WintSidebarV2 open searchOnOpen onClose={() => setFallbackAt(null)} />
    )}
    </>
  );
}
