/**
 * AppHeaderBar — THE header. Figma node 200013:91526 ("Header mobile").
 *
 * ── ONE HEADER, EVERY SCREEN ──────────────────────────────────────────────
 * Owner, 2026-11-04, looking at the system page: "Why on system page we have a
 * different header? It always needs to be the same." Before that there were
 * three: this bar on `/`, an inlined copy of v1's ScopeHeader rules on
 * /alerts, and MobileHeaderBar on /system/:id and /valves. That ruling still
 * stands and this file is still the one bar.
 *
 * WHAT IT IS NOW — a plain static bar on the page ground, nothing more:
 *
 *     [‹]  Meridian Realty ›            (More ☰)
 *          Meridian Realty Group
 *
 *   leading slot   back disc, or an explicit `leading` node, or nothing
 *   text column    optional eyebrow (the PARENT scope) over the title
 *                  (the CURRENT scope). The title is inert; it is a readout.
 *   trailing slot  the More badge, which opens the floating More menu
 *
 * Node 200013:93089 (the top level) draws no back disc and no eyebrow: just
 * the title `All accounts` and the More badge. Both are conditional on the
 * caller passing the corresponding prop, so that frame is `onBack` omitted and
 * `eyebrow` omitted and nothing else.
 *
 * ── WHAT REPLACED THE COLLAPSING HEADER — 2026-11-07 ──────────────────────
 * This block used to be titled "THE COLLAPSING HEADER — 2026-11-04, AND HOW A
 * SECOND PAGE ADOPTS IT" and carried five numbered traps for copying that
 * mechanism onto a new page. THE MECHANISM IS RETIRED. Do not go looking for
 * it in git history to "restore" it; read this instead.
 *
 * WHAT IT WAS. On 2026-11-04 the owner asked for a header block that gives
 * height back as you scroll: "Currently it takes too much place when
 * scrolling. I want only the — from the bottom, up to the header with all
 * accounts and the icon — to be kind of scrolling up. And then only title, the
 * open navigation and tabs are floating." That bought an rAF scroll driver
 * writing `--hdr-t` on the page root, a `clip-path: inset(...)` crop on a
 * full-bleed artwork band, translate/opacity calcs on the hero copy, and the
 * constants BAND_CLIP / COLLAPSE / BAR_TO_TABS / HERO_TO_TABS / TAB_ROW /
 * TABS_TO_FLOOR on each page that adopted it.
 *
 * WHY IT IS GONE. The collapse existed to reclaim height from a FULL-BLEED
 * BAND painted behind this bar. Nodes 200013:91524 / :91525 / :91602 / :93089
 * have no such band: the wave artwork moved INSIDE an inset rounded hero card
 * with a 16px gutter, and this bar sits on the plain page ground above it.
 * There is nothing left to collapse, so every part of the machinery is dead
 * weight — and all of it was arithmetic this bar's own height fed, which is
 * why it was documented here rather than on the pages.
 *
 * WHAT THIS FILE OWNS INSTEAD: nothing. No ref, no scroll listener, no custom
 * property, no z-index, no `onColor`. It is `py-[8px]`, a flex row, and three
 * slots. A page that mounts it lays it out as an ordinary `shrink-0` sibling
 * above its one scroll container — the v2 page skeleton, unchanged, with no
 * special case for the header any more.
 *
 * THE ONE RULE THAT SURVIVED the deletion, because it was never about the
 * collapse: a scroller must carry NO z-index. TabBar's host is
 * `relative shrink-0 h-0` at z-index:auto so the drawer (10/11) and the
 * overlays (50/300) cover it, and CSS paints every positive z-index after
 * every auto one REGARDLESS OF DOM ORDER — a scroller at z-10 silently
 * deletes the floating tab bar. tabBarFloatingClearance pins it. That rule now
 * lives with the pages; it is restated here only because this is where people
 * learned it.
 *
 * ── THE NODE, ATOM FOR ATOM — 200013:91526, 370×59 ────────────────────────
 *
 *   bar        flex items-center justify-between py-[8px], full width
 *   ├─ left    flex gap-[8px] items-center
 *   │  ├─ back  30×30 white disc, radius ~circle, pr-[2px], 24px chevron-left
 *   │  └─ text  flex-col items-start justify-center
 *   │      · eyebrow  Figtree Regular 400 / 12 / lh 18 / #6b7686 / trailing ›
 *   │      · title    Geist SemiBold 600 / 18 / lh 24.75 / tracking -0.45 /
 *   │                 #1d293d / ellipsis
 *   └─ right   the Badge: h 24, radius 26, 1px #45556c, px-8 py-2 gap-4,
 *              `More` in Geist Medium 500 / 12 / lh 16 / #0f172b, then a 12px
 *              hamburger inside a 16px box.
 *
 * The Badge's own Figma note says "data-slot mapping: badge → component root
 * (all variants). React props → Figma properties: variant → Type (Default,
 * Secondary, Outline, Destructive)", i.e. it IS src/components/ui/badge.jsx at
 * `variant="outline"`. Its `leftIcon` and `arrow-drop-down-line` slots are
 * `hidden` in the node and are therefore not drawn.
 *
 * The 16px side gutter the frame shows is the PAGE's, not this bar's — every
 * card on these screens shares it. So the bar carries no px of its own and
 * stretches to its parent; the three call sites already pass `className="px-0"`
 * against the old `px-[10px]`, which is now simply a no-op.
 *
 * ── THE BACK DISC IS BACK, AND THAT IS A REVERSAL ─────────────────────────
 * ⚠ 2026-11-07 REVERSES THE 2026-11-04 RULING. On 2026-11-04 the owner
 *   rejected a disc here against node 199922:83762: "The back arrow doesn't
 *   look like in Figma ... It needs to be less highlighted." That node is
 *   named `Icon` and its whole content is one 21px arrow-left: no disc, no
 *   fill, no border. So the disc came off and the control became a bare glyph
 *   in a 40×40 tap target.
 *
 *   NODE 200013:91526 PUTS IT BACK: `bg-white border border-solid border-white
 *   ... rounded-[120.833px] size-[30px]` with a 24px chevron inside. The owner
 *   gave this node as the target for the whole restructure, and it is the
 *   newer instruction, so it wins. The older ruling is not wrong — it is
 *   superseded, and it was argued against a DIFFERENT node.
 *
 *   DO NOT "FIX" THIS BACK TO A BARE GLYPH on the strength of the 2026-11-04
 *   quote. If it goes back, it needs a ruling against THIS node. Note also
 *   what changed around it: the disc then sat on photographic artwork and read
 *   as highlighted; it now sits on the plain page ground, where a 30px white
 *   disc is a quiet affordance rather than a loud one.
 *
 *   THE TAP TARGET SHRANK WITH IT, 40 → 30, because the node says 30 and the
 *   disc is now the visible edge rather than an invisible box around a glyph.
 *   30×30 clears WCAG 2.5.8's 24×24 minimum; it did not clear the 44×44 that
 *   2.5.5 (AAA) asks for, and neither did the 40 before it.
 *
 *   FIXED 2026-11-07, WITHOUT TOUCHING THE PAINT. The disc is still exactly
 *   30px — that is the owner's target and is not negotiable — and a
 *   transparent `after:inset-[-8px]` carries a 44×44 hit area around it. The
 *   bar is still 59px and the spacing is unchanged, because the pseudo is out
 *   of flow and padding would not have been. The arithmetic, and why -8
 *   rather than -7, is at the control itself.
 *
 * ── `Switch location` IS NOT ON THIS BAR ANY MORE ─────────────────────────
 * ⚠ READ THIS BEFORE ADDING ANY aria-label TO THIS FILE.
 *
 *   `Switch location` is the accessible name the drawer suites open the
 *   NavigationDrawer BY — drawerLocationHighlight.dom.test.jsx:66,
 *   drawerNestedLocationHighlight:46 and scopePersistsThroughDrawer:61 all
 *   query that literal string, two of them taking the LAST match of a
 *   querySelectorAll. EXACTLY ONE element per route may answer to it; a second
 *   one hands those suites a different control without failing anything, which
 *   is how a contract name rots quietly. It has been broken and restored FOUR
 *   times in this project.
 *
 *   IT USED TO LIVE HERE, on the PanelLeft nav button (and on the scope pill
 *   before that). The PanelLeft button is deleted: node 200013:91526 has no
 *   such control.
 *
 *   ⚠ WHERE THE DOOR WENT — CORRECTED 2026-11-07, LATER THE SAME DAY. This
 *     block used to say the `onOpenNav` job moved into the More menu's drawer
 *     item. IT DID NOT. The owner redirected while the menu was being built:
 *     "replace the 'More' in buttom main nav bar With Search ... Serach open
 *     the nav bar with the systems and locations". So the drawer's door is
 *     the FOOTER's Search tab, which dispatches the cancelable window event in
 *     src/components/drawerSearch.js; whichever drawer this route mounts
 *     claims it and opens itself. moreMenuModel.js:31 records the menu giving
 *     the row up, and there is no drawer item in it.
 *
 *     THE NAME DID NOT TRAVEL WITH THE DOOR. A tab whose visible label reads
 *     `Search` cannot announce as `Switch location` — WCAG 2.5.3 Label in
 *     Name. The door is `Search locations and systems` (`drawer.search_label`),
 *     and the drawer suites were re-aimed onto it rather than the control
 *     being renamed back.
 *
 *   SO THIS FILE DELIBERATELY CLAIMS NO SUCH NAME. The back disc is named by
 *   `backLabel`, the More badge by `moreLabel`, and neither default is
 *   `Switch location`. A caller that passes `moreLabel="Switch location"` is
 *   making a mistake: the badge opens a MENU, not the drawer — the drawer is
 *   one row inside that menu.
 *
 *   `Switch location` therefore answers on NO v2 route. It survives on exactly
 *   two, `/v1/` and `/systems`, where v1's ScopeHeader still hangs it on its
 *   badge — both are v1 reference routes and neither mounts this bar.
 *
 * ── TOKENS, NOT THE FRAME'S HEXES ─────────────────────────────────────────
 * Four themes (`:root`, dark, sand, contrast) redefine the ramp, and a literal
 * hex would freeze identically across all four — as would a Tailwind utility
 * naming a token this repo does not define, which falls through to stock
 * Tailwind silently. Every colour in the node is resolved to the utility that
 * paints it in light mode AND moves with the rest:
 *
 *   #1d293d  title ink   -> text-slate-800     (--slate-800, exact)
 *   #0f172b  badge ink   -> text-foreground    (= --slate-900, exact; it is
 *                                              what badge's `outline` variant
 *                                              already sets, so it is not
 *                                              overridden here)
 *   #45556c  badge edge  -> border-slate-600   (--slate-600, exact)
 *   #6b7686  eyebrow ink -> text-muted-foreground
 *                          (--muted-foreground = --slate-500 #62748e, a 9/2/8
 *                          RGB step from the frame's value. This is the repo's
 *                          existing mapping for this exact hex — TabBar.jsx:283
 *                          resolves the same #6b7686 the same way — and the
 *                          ramp INVERTS per theme, so dark/sand get a light
 *                          de-emphasised ink rather than a dark one.)
 *   white    back disc   -> bg-card / border-card
 *                          (the node's white is a SURFACE, not a filter over
 *                          artwork, so it is the token four themes re-pick)
 *
 * No two-argument `var(--token, #hex)` anywhere: a missing token must fail
 * loudly rather than quietly resolve to a second source of truth.
 *
 * ── TYPE ──────────────────────────────────────────────────────────────────
 * Figtree is --font-sans (the body default); Geist is --font-mono-label
 * (src/index.css:785). The eyebrow is Figtree, the title and the badge label
 * are Geist, exactly as the node spells them. SIZE BEFORE LEADING in every
 * class string: tailwind-merge treats `leading-*` as conflicting with the
 * font-size atom and drops whichever came first — the same trap, the same
 * spelling, as SystemsOverviewHero's CHIP_NUM.
 */
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Menu } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { badgeVariants } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function AppHeaderBar({
  /** The CURRENT scope's name — the account, location or system the route is
      on. Owned by the caller: the rule for that name is settled and tested
      (scopePersistsAcrossTabs, scopePersistsThroughDrawer) as the
      drawer-selected scope's name, else the translated "My Systems", and
      inventing a second fallback here is exactly the divergence ScopeHeader
      was extracted to stop.

      `All accounts` in node 200013:93089 and `Meridian Realty Group` in
      200013:91526 are the frames' EXAMPLE VALUES, not strings this file
      holds. */
  title,
  /** @deprecated Renamed to `title` on 2026-11-07. Kept as an alias because
      three call sites spell it, and renaming a prop and its call sites in the
      same pass as a rebuild is two changes wearing one diff. New callers pass
      `title`. */
  label,
  /** The PARENT scope's name, optional. The component appends the node's
      trailing `›` itself so no caller has to carry the glyph — it is part of
      the chrome, not part of the name. Omitted at the top level, where there
      is no parent (node 200013:93089 draws no eyebrow).

      IT IS A READOUT, NOT A CRUMB. The `›` promises hierarchy, not a tap; the
      parent scope is reachable through the back disc beside it, which is the
      control for that job and is drawn on exactly the same routes. If the
      eyebrow is ever meant to be tappable it needs its own handler and an
      accessible name, and that is an owner ruling, not an inference from a
      chevron in a frame. */
  eyebrow,
  /** BACK — drawn only when a caller passes a handler, exactly as before. A
      frame has no history, so WHERE back goes is the caller's: /system/:id
      sends it to the parent location, /location/:name to the account roll-up,
      and the top level passes nothing rather than drawing a control that goes
      nowhere. See THE BACK DISC IS BACK above for the 2026-11-07 reversal. */
  onBack,
  backLabel = 'Back',
  /** MORE — opens the floating More menu (src/v2/components/MoreMenu.jsx).
      Drawn only when a caller passes a handler.

      ⚠ IT IS NOT THE DRAWER'S DOOR — CORRECTED 2026-11-07. An earlier draft
        of this note said the menu's `Switch location` row was the only way
        into NavigationDrawer, and that a route mounting this bar without
        `onOpenMore` therefore had no drawer. BOTH HALVES ARE FALSE. The owner
        redirected the same day — "replace the 'More' in buttom main nav bar
        With Search ... Serach open the nav bar with the systems and
        locations" — so the FOOTER's Search tab opens the drawer, on every
        route, through the window event in src/components/drawerSearch.js. The
        menu carries no drawer row at all (moreMenuModel.js:31).

        A 30-route sweep in Chromium on 2026-11-07 clicked that tab and read
        the drawer's open state off the DOM: reachable everywhere. /valves is
        the route the old note named as stranded, and it is not — it mounts
        WintSidebarV2, which answers the event. It still passes the retired
        `onOpenNav`/`onOpenDrawer`/`scopeAriaLabel`, which this component has
        not read since the rebuild; they are inert, not broken, and clearing
        them is a tidy-up on that page's own file.

        So `onOpenMore` costs a route its MORE MENU and nothing else. Do not
        make this badge open the drawer directly: the badge says `More` and
        must do what it says. */
  onOpenMore,
  /** Drives `aria-expanded` on the badge. The menu owns the state; this bar
      only announces it. */
  moreOpen = false,
  /** The menu's element id, for `aria-controls`.

      IT IS EMITTED EVEN WHEN THE MENU IS CLOSED AND UNMOUNTED, which is
      deliberate and is not a dangling reference by accident: axe-core's
      `aria-valid-attr-value` rule exempts an `aria-controls` whose target is
      absent when `aria-expanded` is `false`, precisely so a trigger can name
      the thing it will create. The pairing is what makes it legal, so the two
      attributes are written together below and must stay together. */
  moreMenuId,
  /** THE BADGE'S OWN id, which travels the OPPOSITE WAY from `moreMenuId`:
      that one names the MENU for the badge, this one names the BADGE for the
      menu. Pass it alongside `moreMenuId` whenever a menu is mounted.

      ⚠ IT IS LOAD-BEARING WELL BEYOND NAMING, which is why it is a prop and
        not a nicety. MoreMenu resolves it with `document.getElementById` and
        uses the element for THREE things (MoreMenu.jsx:392, :417, :509):
          · `aria-labelledby` on the menu, so the menu is named by its trigger;
          · MEASURING the real badge at open time, so the card anchors under
            the control the user actually pressed;
          · returning FOCUS to that control on close.

      ALL THREE FAIL SILENTLY WITHOUT IT, and that is the trap. The menu still
      opens: it anchors from MORE_MENU_FALLBACK_ANCHOR (a constant guess at
      this bar's geometry), focus lands wherever `document.activeElement`
      happened to be, and `aria-labelledby` dangles. A screenshot of all three
      failures looks exactly like success.

      WHY IT EXISTS AT ALL. Both pages shipped the same workaround for its
      absence — a mount effect doing
      `querySelector('[data-name="app-more"]')` and writing an id onto the
      node after React had rendered it. Two files, one hack, for one missing
      prop; both are deleted now. Do not reintroduce either: an id React does
      not own is an id React can overwrite.

      Optional. A caller with no menu passes nothing and the badge renders
      without an id, exactly as before. */
  moreBadgeId,
  /** The badge's accessible name, TRANSLATED by the caller, so this file holds
      no copy of its own. Left undefined the name falls back to the badge's own
      visible text, which is the node's literal `More`.

      ⚠ IT MUST CONTAIN THE VISIBLE WORD. WCAG 2.5.3 Label in Name: an
      accessible name that does not start with the visible label breaks voice
      control ("tap More"). `t('tabs.more')` is the catalogue entry, and
      SINCE 2026-11-07 IT IS ALSO WHAT THE BADGE RENDERS — the visible word is
      resolved from the same entry inside this component, so a caller passing
      `t('tabs.more')` matches the visible label in every locale and a caller
      passing nothing falls back to that same word. A caller that passes a
      hand-written English literal instead is the only way left to break the
      match, and under `he` it still does. Pass the catalogue entry.

      ⚠ IT IS NOT `Switch location`. See the block of that name above. */
  moreLabel,
  /** An explicit leading node, which WINS over the back disc. /alerts' bell
      badge is the historical caller: it is that page's identity mark AND its
      drawer door, it is not a back step, and scopePersistsAcrossTabs pins it.

      NOTHING PASSES IT TODAY — EventsScreen stopped mounting this bar when
      /alerts lost its scope pill, so the slot is kept against that page
      coming back rather than because it is live. Everything else should use
      `onBack` rather than hand-rolling a control into this slot. */
  leading,
  /** THE SURFACE TREATMENT — ADDITIVE, 2026-11-09, from nodes 200067:38981 /
      200047:135462 / 200067:37938. The skeleton does NOT vary: same row, same
      three slots, same order, same `py-[8px]`. Only the ground under it and
      the ink on it do. This is the owner's 2026-11-04 ruling expressed as
      variants of the one bar - "It always needs to be the same" - and not as
      a second component.

        'ground'  DEFAULT, and it is today's bar byte for byte: no container,
                  no radius, no blur, no veil, slate-800 title, the outline
                  Badge. Every existing call site resolves here and renders
                  exactly what it rendered before this prop existed.

        'muted'   Node 200047:135462, the General info screen: a rounded-full
                  bar with an OPAQUE tint and dark (slate-600) ink. No
                  multiply. The tint colour comes from `surfaceTint`.

        'onColor' Nodes 200067:38981 (Home) and 200067:37938 (System): a
                  translucent rounded-full veil over a COLOURED HERO, with
                  light ink (--ink-on-color). The veil is `mix-blend-multiply`
                  and its colour comes from `surfaceTint`.

      ⚠ 'onColor' NEEDS A COLOURED HERO BEHIND IT, and today no page puts one
        there. Both frames paint this bar ON the hero; the shipped pages mount
        it as a `shrink-0` sibling ABOVE their one scroll container, with the
        hero as the first thing INSIDE that scroller (SystemPageV2Screen.jsx
        :2158). `mix-blend-multiply` over the plain page ground darkens the
        page, not a hero. Moving the bar onto the hero is a change to
        SystemPageV2Screen.jsx / HomeAllAccounts.jsx, which this component
        does not own and must not make. Until a page does it, 'onColor' is
        available and unused - which is why the default is 'ground'. */
  surface = 'ground',
  /** The veil / tint colour, as a RAW CSS COLOUR passed to an inline style -
      deliberately NOT a Tailwind utility.

      WHY NOT A UTILITY. Tailwind v4 emits NO CSS and NO error for a utility
      naming a colour that is not registered as `--color-<name>` in
      `@theme inline`, and that has silently broken this repo three times.
      None of the three frames' surface colours are registered (#9dbbd9,
      #dae1eb, rgba(217,96,100,0.76)), so there is no safe utility to write.
      An inline style sidesteps the whole class of failure: it either paints
      or it is visibly absent.

      WHY THE PAGE OWNS IT AND NOT THIS FILE. The veil is a tint of the HERO
      it sits on - blue on Home, red on System. A header that hard-codes two
      hero colours knows about screens, which is exactly what "one header"
      argues against, and it goes wrong the moment a hero is recoloured. The
      page knows its hero, so the page passes the colour, ideally as
      `var(--some-token)` rather than a literal.

      Omitted, NO veil and NO tint is painted: the bar still takes its radius,
      padding and blur, and nothing invents a colour. That is deliberate - a
      missing tint must look unfinished, not plausible. */
  surfaceTint,
  className,
}) {
  /* `label` is the old spelling. `??` and not `||` so a caller may legitimately
     render an empty title without it silently falling back to the alias. */
  const scopeName = title ?? label

  /* ── THE THREE SURFACES, RESOLVED ONCE ──────────────────────────────────
     `onColor` and `muted` both take the frames' rounded-full chip; `ground`
     takes nothing, so the default className string below is unchanged from
     before this block existed and the suite's `py-[8px]` / no-`absolute`
     assertions on the bar still describe it.

     THE PADDING IS WRITTEN `px-[8px] py-[8px]` AND NOT `p-[8px]`, even though
     200067:37938 spells the shorthand and the two compute identically.
     appHeaderBar.dom.test.jsx:473 asserts the bar's class string MATCHES
     /py-\[8px\]/ - the collapsing-header regression guard - and `p-[8px]`
     does not match that pattern. Same pixels, and the guard keeps working.

     THE SIDE PADDING DISAGREES BETWEEN THE FRAMES: 11px on 200067:38981 and
     200047:135462, 8px on 200067:37938. 8 is taken for both because the
     trailing badge's own px-2 already stands the word off the edge, and
     because a 3px difference between two variants of one bar is the kind of
     thing that reads as a bug later. Recorded, not silently normalised. */
  const onColor = surface === 'onColor'
  const chip = onColor || surface === 'muted'

  /* The ink. `text-ink-on-color` is #fafbfc, which is 200067:37938's
     `text-[#fafbfc]` EXACTLY. 200067:38981 spells #f8fafc (slate-50) for the
     same job - a different hex, imperceptibly (slate-50 is not registered in
     @theme inline, so there is no `text-slate-50` to write even if it were
     wanted). One token covers both on-colour frames. */
  const titleInk = onColor ? 'text-ink-on-color' : surface === 'muted' ? 'text-slate-600' : 'text-slate-800'
  /* 200067:37938 puts the eyebrow in the SAME ink as the title - the whole
     text column is `text-[#fafbfc]` - rather than the muted grey it takes on
     the page ground. On a tinted hero there is no muted grey that stays
     legible, so the column goes one colour, as the frame has it. */
  const eyebrowInk = onColor ? 'text-ink-on-color' : 'text-muted-foreground'

  /* THE BADGE'S VISIBLE WORD COMES FROM THE CATALOGUE, not from the node's
     literal, and this is the ONE string this file resolves for itself.

     WHY IT IS NOT A PROP. `tabs.more` is the entry both halves of the badge
     need — the word you see and the word a voice-control user says — and the
     prop contract (`title / label / eyebrow / onBack / backLabel /
     onOpenMore / moreOpen / moreMenuId / moreLabel / leading / className`)
     was fixed before this gap was found, with four other agents coding
     against it. Resolving it here keeps that signature byte-for-byte: no new
     prop, required or optional, and no call site has to change.

     WHAT IT FIXES — WCAG 2.5.3 Label in Name. The badge used to render the
     hard-coded English `More` while `moreLabel` carried `t('tabs.more')`.
     In `en` those are the same word and nothing showed; in `he` the badge
     read `More` on screen and announced `עוד`, so "tap More" matched nothing
     the user could see and the Hebrew name matched nothing they could say.
     One catalogue entry now feeds both sides, in whatever locale is active.

     THIS IS NOT A NEW STRING. `tabs.more` already existed, en.json spells it
     exactly `More` (the node's literal, unchanged in English) and he.json
     already translates it. Nothing here is NEW COPY. */
  const { t } = useTranslation()
  const moreText = t('tabs.more')

  return (
    <div
      className={cn(
        'flex w-full items-center justify-between gap-[8px] py-[8px]',
        /* `relative` is POSITION ONLY - no z-index - so it creates no stacking
           context and the drawer (10/11) and overlay (50/300) tiers are
           untouched. It is here because the veil is `absolute inset-0` and
           needs a positioned ancestor. It is added only on a chip surface, so
           the default class string stays exactly what it was. */
        chip && 'relative rounded-full px-[8px]',
        /* ⚠ THE BLUR LIVES ON THE VEIL, NEVER ON THIS ROOT — FIXED 2026-11-09.
           DO NOT "TIDY" IT BACK UP HERE. It was on the root for both chip
           surfaces for exactly one afternoon and it silently killed the blend
           on every on-colour surface.

           WHY. `backdrop-filter` makes an element a BACKDROP ROOT and a
           stacking context, and that ISOLATES a descendant's `mix-blend-mode`.
           With the blur here, the veil no longer had the hero in its backdrop
           group - it multiplied against this root's own transparent
           background, and multiplying against nothing emits the source colour
           unchanged. So the veil painted its raw tint as a flat band and the
           hero showed through nowhere.

           MEASURED, not reasoned: over HomeAllAccounts' `#1267fa` hero the bar
           read `#9dbbd9` - the raw tint, flat, and LIGHTER than the hero, which
           a multiply can never be. Predicted multiply `#0b4cd5`; with this
           blur removed the bar reads `#0c4fd4`. Three samples, one variable
           each, pinned it to this class and not to the veil's own blur.

           ⚠ A CLASS-STRING ASSERTION CANNOT SEE THIS. Every class was spelled
             correctly and every computed style was correct; only the composited
             pixel was wrong. That is how it shipped. The guard is the pixel
             test, not this comment.

           THE NODES AGREE AND ALWAYS DID. 200067:38981 and 200067:37938 put
           `backdrop-blur-[3.5px]` on the VEIL CHILD and nothing on the root.
           Hoisting it here was my invention, not the frames'.

           `muted` IS THE EXCEPTION, and it is the frame's exception, not a
           workaround: 200047:135462 has NO veil child and NO blend at all - it
           paints `#dae1eb` opaquely - so its blur has to be on the root, and
           with no `mix-blend-mode` anywhere beneath it there is nothing for the
           backdrop root to isolate. */
        surface === 'muted' && 'backdrop-blur-[3.5px]',
        className,
      )}
      /* `muted` paints its tint DIRECTLY and opaquely (200047:135462 has no
         veil child and no multiply); `onColor` paints nothing here and lets
         the veil child below do it under `mix-blend-multiply`. */
      style={surface === 'muted' && surfaceTint ? { backgroundColor: surfaceTint } : undefined}
      data-surface={surface}
      data-node-id="200013:91526"
      data-name="app-header-bar"
    >
      {/* ── THE VEIL — 200067:38981's and 200067:37938's own child ──────────
          `aria-hidden` + `pointer-events-none`, both the frames', and both
          load-bearing rather than decorative: this element covers the whole
          bar, so without `pointer-events-none` it would eat every tap meant
          for the back disc and the More badge, and a screenshot would look
          perfect while nothing in the header answered. It is the same class of
          invisible dead-tap the tab bar's opaque strip caused.

          NO z-index. It is `absolute inset-0` and it comes FIRST in DOM
          order, so the two controls after it paint over it by document order
          alone. Giving it a negative z-index would also work and would also
          create the one thing this file is not allowed to introduce.

          `mix-blend-multiply` is the frames'. It is what makes the veil read
          as a tint OF the hero rather than a sheet ON it - and it is also why
          this variant is meaningless without a hero: multiply against the
          plain page ground just darkens the page. */}
      {onColor && surfaceTint ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full mix-blend-multiply backdrop-blur-[3.5px]"
          style={{ backgroundColor: surfaceTint }}
          data-name="app-header-veil"
        />
      ) : null}

      {/* THE LEADING GROUP. `min-w-0 flex-1` is what lets the title's ellipsis
          engage at all: without it this group lays out at its intrinsic width,
          shoves the badge off the right edge, and `truncate` never fires —
          the failure scripts/check-text-overflow.mjs exists to catch. */}
      {/* ⚠ `relative` WHEN THERE IS A VEIL, AND IT IS NOT COSMETIC. CSS paints
          positioned descendants AFTER non-positioned ones within a stacking
          context, REGARDLESS OF DOM ORDER - the same rule that deletes the
          floating tab bar when a scroller takes a z-index. The veil above is
          `position: absolute`; this group and the badge are flex items, i.e.
          non-positioned. So without `relative` here the veil paints OVER the
          text, `mix-blend-multiply` multiplies the white title by the tint,
          and the title disappears into the hero.

          `relative` makes these two positioned as well, at z-index auto, so
          they paint after the veil by document order - which is why BOTH
          Figma frames put `relative` on their content children too
          (200067:38982, 200067:37939). No z-index is added: that is the one
          thing this file may not introduce, and it is not needed.

          Conditional on `chip` so the default surface's class string is
          unchanged from before this prop existed. */}
      <div
        className={cn('flex min-w-0 flex-1 items-center gap-[8px]', chip && 'relative')}
        data-name="app-header-leading"
      >
        {/* I200013:91526;199999:97404 — a 30px disc, `bg-white border
            border-solid border-white`, holding a 24px Tabler chevron-left
            (I200013:91526;199999:97405). lucide's ChevronLeft is this repo's
            glyph for it.

            `rounded-full`, not the node's literal `rounded-[120.833px]`: on a
            30px box any radius past 15 clamps to a circle, so the two render
            identically and one of them says what it means.

            `pr-[2px]` is the node's own optical nudge — a chevron's ink sits
            right of its box's centre, so the glyph is pushed left to centre
            the MARK rather than the SVG.

            The border is the same token as the fill, as in the node. It paints
            nothing; it is 1px of the border-box, and it is kept so the disc
            measures 30 inside and out the way the frame does.

            ── THE DISC IS 30. THE TARGET IS 44. ───────────────────────────
            `after:inset-[-8px]` is a transparent 44×44 hit area centred on
            the disc, and it is the whole of what makes this control clear
            WCAG 2.5.5 (AAA, 44×44) while the node keeps its 30px paint.
            Measured with elementFromPoint at all four corners of the 44 box,
            not read off the class string.

            WHY A PSEUDO-ELEMENT AND NOT PADDING. The bar is 59px tall and
            that number is load-bearing: 8+8 of `py-[8px]` around a 42.75px
            text column (18px eyebrow + 24.75px title). Padding would grow the
            button's border box to 44 and the row with it — a 60px bar, the
            badge and the text pushed, every spacing in the frame off by one.
            An absolutely positioned ::after is out of flow, so the painted
            geometry, the gap to the text column and the bar's height are all
            byte-identical to before.

            WHY -8 AND NOT -7. `inset` resolves against the containing block's
            PADDING box, which is 28px here, not the 30px border box — the
            border eats 1px a side. 28 + 8 + 8 = 44; -7 would have given 42
            and quietly missed. (SystemTypeCard.jsx:167 spells -7.5px on a
            borderless 29px box for the same 44, which is where this pattern
            comes from.)

            THE HIT AREA IS SQUARE AND THE DISC IS ROUND, deliberately. It was
            written `after:rounded-full` first, to match the paint, and
            measured FALSE at all four corners of the 44 box: a circle of
            diameter 44 does not contain the square's corners, so the biggest
            square inside it is 31. The pseudo paints nothing, so there is no
            reason for it to be round and every reason for it not to be. With
            the radius dropped, elementFromPoint returns this button at all
            four corners. If anyone re-rounds it for tidiness, that silently
            undoes the fix and no screenshot will show it.

            IT OVERLAPS NOTHING THAT IS A TARGET. 7px of spill each side: the
            left sits in the page's 16px gutter, the right in the 8px gap
            before the text column, and that column is an inert <p>. 2.5.5 is
            about targets that are too small, and the overlap rule only bites
            between two targets.

            NOTHING PAINTS: no background, no border, no ring. `relative` is
            added because buttonVariants does not carry it and the pseudo
            needs a positioned ancestor — it is position only, no z-index, so
            no stacking context is created and the drawer/overlay tiers are
            untouched. */}
        {leading ?? (onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label={backLabel}
            className="relative flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-card bg-card pr-[2px] after:absolute after:inset-[-8px] after:content-[''] hover:bg-card active:opacity-60"
            data-node-id="I200013:91526;199999:97404"
            data-name="app-back"
          >
            <ChevronLeft className="size-[24px] text-slate-800" aria-hidden="true" strokeWidth={1.75} />
          </Button>
        ) : null)}

        {/* I200013:91526;199999:97324 — the two-line text column. `min-w-0` is
            the other half of the truncation pair; `items-start` is the node's,
            and is also what keeps a short title left-aligned under a long
            eyebrow instead of centring under it. */}
        <div className="flex min-w-0 flex-col items-start justify-center" data-name="app-header-text">
          {/* I200013:91526;199999:97325 — the eyebrow. The `›` is the frame's,
              transcribed literally and composed here rather than asked of the
              caller. A template literal rather than `{eyebrow} ›` so the one
              space is explicit and textContent is exactly what the frame
              shows. */}
          {eyebrow ? (
            <p
              className={cn(
                'w-full truncate text-left font-sans font-normal text-[12px] leading-[18px]',
                eyebrowInk,
              )}
              dir="auto"
              data-node-id="I200013:91526;199999:97325"
              data-name="app-eyebrow"
            >
              {`${eyebrow} ›`}
            </p>
          ) : null}

          {/* I200013:91526;199999:97327 — the title.

              18px, DOWN FROM 20. The 20 was a 2026-11-04 scale decision made
              when this text sat on photographic artwork: WCAG puts the
              large-text boundary at 18.66px BOLD, so 20px bold dropped that
              slot's requirement from 4.5:1 to 3:1. The node now says 18 and
              the text is back on the plain page ground, where
              text-slate-800 on the page background clears 4.5:1 outright and
              the boundary buys nothing. So the smaller step costs no contrast
              argument — it only gives one up that is no longer needed.

              IT IS GENUINELY INERT, and that is the owner's standing ruling
              from 2026-11-04: "remove this and the arrow - only the icon open
              the nav bar", with "We still have title that shows what selected
              - for example, 'All accounts', specific location, specific
              system." So the NAME stays and the CONTROL does not: no onClick,
              no role, no tabIndex, no aria-haspopup, not a <button>. A scope
              name that still answers a tap is the worst outcome here, because
              it looks settled and behaves like the thing he removed.

              `text-left` is pinned the same way. Owner, 2026-11-04, on `All
              Accounts` centred in the bar: "take the title left not centered
              and make it bigger." The node agrees — the column is
              `items-start` — so there is no conflict left to manage, but the
              class is explicit rather than inherited so a parent change
              cannot quietly re-centre it. */}
          <p
            className={cn(
              'w-full truncate text-left font-mono-label font-semibold text-[18px] leading-[24.75px] tracking-[-0.45px]',
              titleInk,
            )}
            dir="auto"
            data-node-id="I200013:91526;199999:97327"
            data-name="app-scope"
          >
            {scopeName}
          </p>
        </div>
      </div>

      {/* I200013:91526;199999:97301 — THE MORE BADGE.

          IT IS A REAL <button> WEARING THE BADGE'S CLASSES, not a <div>.
          shadcn's Badge renders a div and this repo's copy takes no `asChild`,
          so `badgeVariants({ variant: 'outline' })` is composed onto a real
          button instead of wrapping one around a Badge: same classes, same
          variant, one element, and the control is focusable and announceable.

          THE VARIANT ALREADY IS THE NODE, which is the point of the Figma
          note that maps this component to badge.jsx. Its base spells
          `px-2` (8px), `py-0.5` (2px), `gap-1` (4px), `text-xs` (12px / lh
          16px) and `font-medium` (500) — the node's px-8 / py-2 / gap-4 /
          12 / 16 / Medium, atom for atom — and `outline` spells
          `text-foreground`, which resolves to --slate-900 #0f172b, the node's
          ink. None of those are restated below; only what the variant does
          not already say is.

          WHAT IS ADDED: the 24px height, the node's radius 26 (which clamps to
          a pill at this height, and is written as given), the --slate-600
          edge, Geist, and a focus ring that fires on keyboard only —
          badgeVariants' base rings on plain `focus:`, i.e. on mouse-down too,
          which is a 2017 shadcn default and not this repo's (see button.jsx).

          ⚠ THE GLYPH COLLIDES WITH THE FOOTER'S More TAB. TabBar draws lucide
            `Menu` for its More tab, which navigates to /more
            (MoreComingSoonScreen); this badge draws the same glyph beside the
            same word for a different destination. The 2026-11-04 note in this
            file rejected `Menu` for the nav button on exactly that ground
            ("two destinations behind one glyph is worse than an imperfect
            glyph"). The node asks for a hamburger here and the owner gave the
            node, so it is drawn — but the collision is REPORTED, not resolved,
            and it is the owner's call whether the footer tab or this badge
            gives up the word.

          ✔ THE VISIBLE LABEL IS TRANSLATED — FIXED 2026-11-07. It used to be
            the node's hard-coded English `More`, which read `More` on screen
            and announced `עוד` under `he`: a WCAG 2.5.3 Label-in-Name break
            in the one locale that has a translation. The word now comes from
            `t('tabs.more')`, resolved at the top of this component, so the
            visible label and `moreLabel` are the SAME catalogue entry.

            THE PROP SIGNATURE DID NOT MOVE for it — no new prop, optional or
            otherwise — because the contract was fixed before the gap was
            found and four other agents were coding against it. Do not "tidy"
            this into a `moreText` prop: a second source for one word is how
            the two halves drifted apart in the first place. */}
      {onOpenMore ? (
        <button
          type="button"
          /* The menu measures this element and hands focus back to it; see
             `moreBadgeId` in the props above for why it is a prop rather
             than something a page stamps on after mount. */
          id={moreBadgeId}
          onClick={onOpenMore}
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          aria-controls={moreMenuId}
          aria-label={moreLabel}
          className={cn(
            badgeVariants({ variant: 'outline' }),
            'h-[24px] shrink-0 cursor-pointer rounded-[26px] border-slate-600',
            'outline-none focus:ring-0 focus-visible:ring-[3px] focus-visible:ring-ring/50 active:opacity-60',
            /* ── THE BADGE ON A CHIP SURFACE ──────────────────────────────
               A WHITE PILL WITH DARK INK, which is what 200067:38981 (Home)
               and 200047:135462 (General info) both draw: `bg-white` with
               `--colors/black` ink, no border.

               ⚠ 200067:37938 (System) DISAGREES AND IS NOT FOLLOWED HERE.
                 That frame gives the badge NO background at all and WHITE
                 ink - it even ships a differently-stroked menu-01 asset
                 (ad2b3.svg, white) where the other two use c1ac9.svg
                 (black). Two of the three frames draw the pill, including
                 the OTHER on-colour frame, so the pill is taken and the
                 disagreement is reported rather than quietly resolved. If
                 the owner wants the bare treatment on System, that is one
                 more surface value, not an edit to this one.

               `bg-card` / `text-card-foreground` rather than the frames'
               literal `white` / `black`: those are the repo's registered
               tokens for this exact pairing, they are what the back disc
               beside it already uses (`border-card bg-card`), and they stay
               correct in dark mode where a hard-coded white pill would not.
               `--card-foreground` is a near-black slate rather than #000, a
               deliberate 1-step substitution recorded here.

               `border-transparent` overrides `border-slate-600` above -
               tailwind-merge keeps the later colour - because none of the
               three frames draws a border on the badge. The border BOX stays,
               so the pill still measures 24px tall inside and out.

               `relative` is the same painting-order fix as on the leading
               group above - position only, no z-index - without which the
               veil paints over this control and multiplies it away. The frames
               carry it too (200067:38984 is `sticky top-0`, 200047:135467 and
               200067:37948 are `relative`). */
            chip && 'relative border-transparent bg-card text-card-foreground',
          )}
          data-node-id="I200013:91526;199999:97301"
          data-name="app-more"
        >
          {/* ...;198736:111922 — Geist Medium 12/16, i.e. the variant's own
              `text-xs font-medium` plus the family. NO aria-hidden: this text
              is the control's name when `moreLabel` is not passed.

              ⚠ THE FAMILY IS ON THIS SPAN AND NOT ON THE BUTTON, and that is
                not tidiness. src/index.css:921 carries an UNLAYERED
                `button { font-family: inherit }`, and unlayered CSS beats
                `@layer utilities` outright — so `font-mono-label` on the
                <button> is silently overridden and the badge renders in
                Figtree while every class string says Geist. Measured in the
                browser: 'Figtree' before this span, 'Geist' after. A <span>
                is not a <button>, so the utility wins there. Any font utility
                put on a <button> anywhere in this repo has the same problem.

                ✔ THAT ROOT CAUSE IS FIXED — 2026-11-07. The bare rule moved
                  into `@layer base`, so `font-*` utilities now win on a
                  <button> like they do everywhere else and this span is no
                  longer REQUIRED to make Geist apply. IT STAYS ANYWAY: it is
                  the node's own text node, it keeps the family on the word
                  rather than on the control that wraps it, and it costs
                  nothing. Belt and braces, not a workaround — do not unwind
                  it, and do not move `font-mono-label` up onto the button on
                  the strength of the fix. */}
          <span className="font-mono-label" data-node-id="198736:111922">{moreText}</span>
          {/* `rightIcon`, a 16px box holding a 12px Huge Icons / menu-01. The
              box is the node's and is kept: it is what sets the gap's optical
              distance from the word, and a bare 12px glyph would sit tight
              against it. The node's `leftIcon` and `arrow-drop-down-line`
              slots are hidden="true" and are therefore not drawn. */}
          <span className="flex size-[16px] shrink-0 items-center justify-center" data-name="app-more-icon">
            <Menu className="size-[12px]" aria-hidden="true" strokeWidth={1.75} />
          </span>
        </button>
      ) : null}
    </div>
  )
}
