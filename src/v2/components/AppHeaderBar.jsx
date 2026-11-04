/**
 * AppHeaderBar — THE header. Figma node 199922:83959.
 *
 * ── ONE HEADER, EVERY SCREEN — 2026-11-04 ─────────────────────────────────
 * Owner, looking at the system page: "Why on system page we have a different
 * header? It always needs to be the same." Before that there were three:
 * this bar on `/`, an inlined copy of v1's ScopeHeader rules on `/alerts`,
 * and MobileHeaderBar on `/system/:id` and `/valves`.
 *
 * THE SKELETON IS FIXED AND THE TWO OUTER SLOTS VARY:
 *
 *     [ leading ]  [ title, flex-1 ]  [ trailing ]
 *       back           scope pill        nav, or nothing
 *       or a badge     or entity name
 *       or nothing
 *
 *   /                 nothing -> the pill starts at the bar's left edge
 *                     trailing: the nav control. Figma 199954:96275.
 *   /location/:name   back    -> the account roll-up        + nav
 *   /system/:id       back    -> the parent location
 *   /valves           back    -> wherever the screen was pushed from
 *   /alerts           the bell badge, via `leading`. See that prop.
 *
 * The TITLE is always the same control: a readout that opens the navigation
 * drawer, named `Switch location`, because scope is picked "Only in the
 * drawer" (owner).
 *
 * TRAILING WAS EMPTY EVERYWHERE until 2026-11-04 (the avatar that used to sit
 * there moved to the tab bar). The Dashboard restructure put a control back in
 * it — `onOpenNav`, a second door onto the same drawer, from the owner's new
 * frame. It is OPT-IN: only the Dashboard passes a handler, so every other
 * screen draws the bar it drew before.
 *
 * ⚠ THAT MAKES THE DASHBOARD'S BAR DIFFER FROM THE OTHER THREE, and the owner
 *   is on record wanting one header everywhere ("Why on system page we have a
 *   different header? It always needs to be the same."). The frame that asks
 *   for this control is the Dashboard's and only the Dashboard's, so passing
 *   it on /system/:id, /valves and /alerts is an owner decision, not one to
 *   take by inference. REPORTED, NOT RESOLVED. If the answer is "everywhere",
 *   it is one prop per page and dashboardHeaderBar's child counts.
 *
 * ── THE COLLAPSING HEADER — 2026-11-04, AND HOW A SECOND PAGE ADOPTS IT ──
 * Owner, on a screenshot of the Dashboard scrolled a little way down, with
 * this bar sitting on artwork whose own content had slid out from under it:
 * "this is bad". Then, on the hero at rest: "keep this area stuck — don't
 * move it with scroll at all." Then, on a location: "all these area needs to
 * be fixed including the tabs."
 *
 * And then, shown that as a fully fixed block: "Currently it takes too much
 * place when scrolling. I want only the — from the bottom, up to the header
 * with all accounts and the icon — to be kind of scrolling up. And then only
 * title, the open navigation and tabs are floating."
 *
 * So on a screen that paints artwork behind this bar, THE BAR IS NOT CHROME ON
 * ITS OWN and the block it belongs to COLLAPSES. The hero copy scrolls up and
 * fades; the title, the nav button and the tab row never move; the artwork
 * stays behind them as a short slice all the way down. Every one of the
 * owner's notes that day was the same complaint - the artwork and its own
 * content doing different things - and this is what answers it without the
 * 234px a fully fixed block cost.
 *
 * THE SHAPE, as src/v2/pages/HomeAllAccounts.jsx implements it. A second page
 * copies this literally; the numbers are that file's THE COLLAPSING HEADER:
 *
 *   root          relative, flex column, flex:1 / minHeight:0, px-4 py-2
 *                 ref, and the scroll handler writes --hdr-t on it
 *     band        absolute inset-x-0 top-0 z-[1] h-[205px]
 *                   clip-path: inset(0 0 calc(var(--hdr-t) * Npx) 0)
 *                   HeroWaveArt  absolute inset-0
 *                   the dim      absolute inset-x-0 top-0 h-[135px]
 *     chrome      relative z-[2] shrink-0, rowGap 10, paddingBottom 12
 *                   AppHeaderBar   (this file) - never moves
 *                   block          h-[32px], the TAB ROW's height only
 *                     hero window  absolute, top -rowGap, overflow-hidden
 *                       hero       translateY(-t*C) + opacity 1-1.6t
 *                     tab row      translateY((1-t)*C)
 *     scroller    flex:1 / overflowY:auto / minHeight:0
 *                 paddingTop: C      paddingBottom: 93
 *                   the tab panel, and nothing else
 *
 * C is the collapse distance - the hero's height plus whatever the tab row
 * gives back by being laid out above its resting place. The handler is one
 * rAF-throttled passive listener writing ONE custom property; nothing
 * re-renders and no layout property is animated.
 *
 * FOUR THINGS A SECOND PAGE MUST GET RIGHT, every one of which has already
 * been got wrong once here:
 *
 *  1. THE BAND HANGS OFF THE ROOT, NOT THE SCROLLER. A scroller is
 *     overflow-y:auto, which computes overflow-x to auto as well, so an
 *     absolutely positioned child of it is clipped at its edge and can never
 *     reach the bar. `absolute inset-x-0` resolves against the PADDING box, so
 *     it ignores the root's px-4 and bleeds the full 393 with no negative
 *     margin anywhere — check-shell-contract's bleed-needs-a-bleeding-scroller
 *     rule exists because a negative RIGHT margin became scrollable width and
 *     put a sideways scrollbar across this frame once already.
 *
 *  2. THE SCROLLER CARRIES NO z-index. It had `relative z-10` and that
 *     DELETED THE FLOATING TAB BAR. TabBar's host is `relative shrink-0 h-0`
 *     at z-index:auto on purpose (so the drawer at z-10/z-11 and the overlays
 *     at z-50/z-[300] cover it), and CSS paints every positive z-index after
 *     every auto one REGARDLESS OF DOM ORDER — so a scroller at z-10 paints
 *     over a tab bar mounted after it. Nothing caught it: TabBar was still
 *     mounted, the clearance padding was still applied, check-shell-contract
 *     still passed and the suite was green. tabBarFloatingClearance now pins
 *     it. Raising the host instead is the wrong fix — it would punch the pill
 *     through the navigation drawer.
 *
 *  3. THE BAND IS z-[1] AND THE CHROME z-[2]. Both must beat the scroller,
 *     because once the header has collapsed the content passes UNDERNEATH the
 *     artwork; and both must lose to the drawer (scrim z-10, panel z-[11]),
 *     EventFocusOverlay (z-50) and PushNotifications (z-[300]), which is why
 *     they are 1 and 2 rather than 10 and 20. Neither ever overlaps the
 *     floating pill, so outranking its host costs nothing HERE, where doing
 *     it from the SCROLLER deleted the bar outright. Verified in the browser
 *     in all four themes: the pill is hit-testable at every scroll position,
 *     and an open drawer covers both it and this bar.
 *
 *  4. THE SCROLLER'S paddingTop IS THE COLLAPSE DISTANCE. Without it the
 *     first card starts where the COLLAPSED header ends and jumps down by the
 *     whole collapse the moment the scroll is touched. This is the one bug
 *     this pattern reliably ships with; measure at scrollTop 0 and 1 and
 *     prove the content moves by exactly 1px.
 *
 *  5. THE TAB ROW IS LAID OUT COLLAPSED AND PUSHED DOWN, never the reverse.
 *     That is what keeps the chrome column a constant height, so the scroller
 *     never resizes mid-scroll. A panel shorter than the collapse distance
 *     simply cannot collapse fully - check it, and accept it rather than
 *     clamping, since the clearance padding already makes every panel here
 *     long enough.
 *
 * THIS FILE WAS AlertsHeaderBar until 2026-11-04. It was built for /alerts,
 * taken off it the same day, mounted on the Dashboard, and is now the app's
 * only header; the old name survived two of those moves and had stopped
 * being true at the first.
 *
 * THE NODE'S SHAPE, atom for atom:
 *
 *   bar          flex gap-[10px] items-center pt-[4px] pb-[10px] px-[10px] w-full
 *   ├── house    40x40, bg-white, rounded-[20px], a 21px glyph centred
 *   │            *** DELETED 2026-11-04, see below. The node still draws it. ***
 *   └── scope    flex-1 h-[44px], 1px #cad5e2, rounded-[14px], pl-[14px] pr-[8px]
 *                · label  Figtree Bold 15/22.5, #1e2a3b, centred, truncating
 *                · chevron 18px
 *
 * THE NODE ALSO DRAWS A 38px AVATAR, hard right, and this file DELIBERATELY
 * does not. Owner, 2026-11-04: "remove avatar from the header - footer is
 * enough", once the floating tab bar grew a fourth Profile item on the same
 * /account. This is the one place the implementation knowingly departs from
 * 199922:83959; everything else is still the node's, atom for atom. Do not
 * "restore" it from the frame.
 *
 * WHAT THE CONTROLS DO. The frame draws affordances and cannot say what they
 * do, so this is the owner's ruling rather than an inference:
 *
 *  · THE HOUSE IS GONE — 2026-11-04, the owner, with a screenshot of
 *    /location/Office showing `‹ back`, the house disc and the `Office` pill:
 *
 *      "I want to completely remove the home icon. And once user clicks on
 *       dashboard, it just takes him to the upper level of the scope that he
 *       already have. Instead of the home button. Just remove it"
 *
 *    REMOVED, NOT HIDDEN. There is no `showHome` prop and no dead branch: the
 *    glyph, the `onHome`/`homeAriaLabel` props and the `Home` import all left
 *    together, because a prop nobody passes is a control nobody can find and
 *    a second way to ship the thing the owner deleted.
 *
 *    ITS JOB MOVED, WHICH IS THE ONLY REASON THIS IS NOT A RULE 0 BREACH.
 *    "Go to the top of this user's own hierarchy, and drop the drawer-selected
 *    scope on the way" is now the DASHBOARD TAB's, in src/components/TabBar.jsx,
 *    and the rule that answers "where is that?" is src/utils/homeTarget.js —
 *    moved out of HomeAllAccounts.jsx so both files can read one copy. The
 *    tab bar is mounted on every screen this bar is, so the behaviour is
 *    reachable from strictly more places than the house was (it was
 *    Dashboard-only). Verified in the running app, per persona, before this
 *    removal: see the measurements in homeTarget.js.
 *
 *    The owner's earlier reversal of the same day — "Home needs to take you
 *    to the upper level that the user has ... Not to open the side" — is what
 *    that tab now implements. It is kept on the record because it is the
 *    BEHAVIOUR that survived; only the control it hung on was deleted.
 *  · THE PILL IS THE SCOPE CONTROL, and it replaces v1's "My Systems ⌄". It
 *    opens the same drawer, because the drawer is where a scope is picked -
 *    that is the behaviour /alerts has today and it is unchanged. It is now
 *    the ONLY drawer door on this bar, and it has been since the house
 *    stopped being one — nothing about the drawer changed when the house
 *    went, which is the half of Rule 0 that is easy to get wrong here.
 *  · THE AVATAR IS GONE. It opened More on the profile view; the tab bar's
 *    Profile item opens the same /account from every screen, so the header
 *    slot was a second door onto one room. See the note where it stood.
 *
 * THE LABEL IS NOT "All accounts". That string is the frame's example value.
 * The slot has to name the scope the user is actually in, and the rule for
 * that name is already settled and tested (scopePersistsAcrossTabs,
 * scopePersistsThroughDrawer): the drawer-selected scope's name, else the
 * translated "My Systems". Inventing a second fallback here is exactly the
 * divergence ScopeHeader was extracted to stop. Copy rule 0: do not invent a
 * string when an approved one exists.
 *
 * TOKENS, not the frame's hexes. The four themes (`:root`, dark, sand,
 * contrast) redefine --slate-*, --card and --primary, and a literal #cad5e2
 * would freeze identically across all four. Each hex is resolved to the
 * utility that paints it in light mode and moves with the rest:
 *   #cad5e2 -> border-slate-300   #1e2a3b -> text-slate-800
 *   white   -> bg-card            #0b81f8 -> ring/primary
 * No two-argument var() anywhere - a missing token must fail loudly.
 */
/* `Home` left with the house on 2026-11-04 — see the header.

   `PanelLeft` arrived the same evening, in the slot the house used to hold.
   It is NOT the house coming back: see THE TRAILING SLOT below for what the
   two controls do and why the glyph is this one. */
import { ChevronDown, ChevronLeft, PanelLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* react-router's useNavigate, UserContext, avatar.jpg and `initialsOf` all
   left with the avatar on 2026-11-04. This bar no longer navigates on its own
   or knows who is signed in: every control it draws is now a handler the
   caller passes in. */

export default function AppHeaderBar({
  /** The scope the user is in. Owned by the caller - see the note above. */
  label,
  /** The pill's accessible name. The caller passes the TRANSLATED string so
      this file holds no copy of its own; the default is the English of the
      same catalogue entry (`home.switch_location`) for a caller that forgets.
      It is deliberately not "Scope: <name>. Open the navigation drawer." the
      way MobileHeaderBar spells its slot: this control inherited v1's
      ScopeHeader, that name is what the drawer suites open the drawer BY
      (drawerLocationHighlight.dom.test.jsx:66 queries the literal string),
      and renaming it would silently take the drawer away from /alerts for
      anyone navigating by accessible name. */
  scopeAriaLabel = 'Switch location',
  /** Opens NavigationDrawer. THE PILL ONLY. This is the bar's one and only
      door into navigation; a caller that does not pass it ships a screen with
      no reachable drawer. `onHome`/`homeAriaLabel` stood here until
      2026-11-04 and went with the house — see the header. */
  onOpenDrawer,
  /** BACK — NOT IN THE NODE, and drawn only when a caller passes a handler.
      Added 2026-11-04 when this bar took over the Dashboard. MobileHeaderBar,
      the bar it replaced there, draws a back disc on /location/:name and
      omits it on / — so a straight swap would have deleted the only way back
      out of a location scope. Rule 0: working functionality is not removed
      without the owner's word, so the affordance moved across with the bar.

      IT IS A BARE GLYPH, NOT A DISC, and that was a correction. It first
      shipped copying the house beside it - 40px bg-card disc, rounded-20 -
      and the owner rejected it against Figma 199922:83762: "The back arrow
      doesn't look like in Figma ... It needs to be less highlighted." That
      node is named `Icon` and its whole content is one arrow-left SVG: no
      disc, no fill, no border, 21x21 inset 10px in a ~41px box. So the
      chassis is gone and the pressable area is not: the button is still
      40x40, it simply paints nothing.

      IT IS STILL A BARE GLYPH NOW THAT THE HOUSE IS GONE. The asymmetry read
      as "destination keeps its disc, a step recedes", and with nothing left
      to be asymmetric WITH the temptation is to give back its disc again -
      which is the exact treatment the owner rejected, by name, against the
      node. The ruling is about THIS control against THAT node and it does not
      lapse because its neighbour did. */
  onBack,
  backLabel = 'Back',
  /** ── THE TRAILING SLOT — 2026-11-04, Figma 199954:96276 ─────────────────
      Opens the SAME NavigationDrawer the pill does. Drawn only when a caller
      passes a handler; every screen but the Dashboard passes nothing and is
      byte-identical to before.

      THE OWNER ASKED FOR IT, in the frame and in words: "I want to replace the
      home icon with kind of icon from the design system and shadcn [that]
      explain[s] it's open and navigation." 199954:96275 puts a 40x40 button
      back at x=340, hard right, with the title button moved to the left and
      widened to 320 — the mirror of the bar before it.

      THIS IS NOT THE HOUSE. The house was deleted on the owner's word the same
      day and its behaviour ("go to the top of this user's hierarchy, clear the
      drawer scope") is the Dashboard TAB's now, in src/components/TabBar.jsx.
      Nothing here goes home. The frame still DRAWS a house in this slot and
      that glyph is exactly what the owner asked to be replaced, so do not
      transcribe it back off 199954:96277.

      WHY `PanelLeft`. It is the glyph shadcn's own SidebarTrigger uses, so it
      is the design system's word for "open the side navigation" rather than a
      picked-by-eye icon, and WintSidebarV2 is literally a left sidebar — it is
      `inset-y-0 left-0` and slides in from translateX(-100%)
      (WintSidebarV2.jsx:635-640), so the left-panel family is the right one.
      Two alternatives were weighed and rejected:
        · `Menu`  — the footer's More tab already draws it. Two destinations
                    behind one glyph is worse than an imperfect glyph.
        · `PanelLeftOpen` — says "open" more literally, but it is the same
                    panel plus a chevron, i.e. three more strokes inside a 21px
                    box sitting on photographic artwork, and shadcn's own
                    trigger is the plain panel. The "open" belongs in the
                    accessible name, which carries it.

      ⚠ IT IS THE ONLY DOOR, NOT A SECOND ONE — corrected hours after the
      first version of this note, which said the opposite. Owner, on a
      screenshot of the pill beside it: "remove this and the arrow — only the
      icon open the nav bar." So the title stopped being a control and
      `Switch location` moved HERE with the door. See THE TITLE below for what
      is left of the pill and why the two branches exist. */
  onOpenNav,
  /** True when this bar sits ON artwork rather than on the page ground, which
      changes what "legible ink" means - see THE INK at the title below. Only
      the Dashboard passes it, and only because the wave now runs behind the
      whole bar. NO NEW COPY was introduced for this slot: `navAriaLabel` was
      proposed and deleted the same evening when the owner made the icon the
      only door, which moved `scopeAriaLabel` onto it. */
  onColor = false,
  /** An explicit leading node, which WINS over the back glyph.
      /alerts' bell badge is the one caller: it is that page's identity mark
      AND its drawer door, it is pinned by scopePersistsAcrossTabs, and it is
      not a back step. Everything else should use `onBack` rather than
      hand-rolling a control into this slot. */
  leading,
  className,
}) {
  return (
    <div
      className={cn('flex w-full items-center gap-[10px] px-[10px] pt-[4px] pb-[10px]', className)}
      data-node-id="199922:83959"
      data-name="app-header-bar"
    >
      {leading}

      {/* 199922:83762 "Icon" — 21px of arrow and nothing else. The 40x40 box
          is the TAP TARGET, not a surface: no bg, no border, no radius that
          paints, and `hover:bg-transparent` because ghost would otherwise
          put an accent wash exactly where the disc used to be. The box stays
          at 40 now that the house is not beside it to line up with: it is
          well past the 24x24 minimum in WCAG 2.5.8, and shrinking the target
          to the glyph would trade one defect for a worse one. */}
      {!leading && onBack ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={backLabel}
          className="flex size-[40px] shrink-0 cursor-pointer items-center justify-center bg-transparent hover:bg-transparent active:opacity-60"
          data-name="app-back"
        >
          <ChevronLeft className="size-[21px] text-slate-800" aria-hidden="true" strokeWidth={1.75} />
        </Button>
      ) : null}

      {/* THE HOUSE STOOD HERE and was deleted 2026-11-04. Owner: "I want to
          completely remove the home icon ... Just remove it".

          WHAT THE SLOT DOES NOW: on a pushed screen it holds `back`, on
          /alerts it holds the bell, and on the Dashboard it holds NOTHING —
          the pill simply starts at the bar's left edge. Measured at 393x852:
          the pill went 311 -> 361 wide on `/` and 261 -> 311 on
          /location/:name, i.e. it takes back the house's 40px AND the 10px
          gap beside it. Nothing else about the bar moved.

          IT IS NOT A LOST DOOR, which is the only reason this is not a Rule 0
          breach: "go to the top of this user's hierarchy and clear the
          drawer scope" is the DASHBOARD TAB's job now (TabBar.jsx), the tab
          bar is mounted on every screen this bar is, and the house was
          Dashboard-only. The drawer is unaffected — the pill below was
          already its only door here. */}

      {/* ── THE TITLE: A CONTROL, OR A READOUT ─────────────────────────────
          Which one it is depends on whether this bar has a trailing nav
          control, and there is exactly ONE door either way.

          ⚠ ON THE DASHBOARD IT IS A READOUT, 2026-11-04. Owner, with a
          screenshot of the `All Accounts ⌄` pill: "remove this and the arrow -
          only the icon open the nav bar." So the chassis (border, radius,
          padding), the chevron and the handler all go, and what is left is the
          scope NAME - which he kept by name in the same breath as the earlier
          ruling: "We still have title that shows what selected - for example,
          'All accounts', specific location, specific system."

          IT IS GENUINELY INERT, not flat-looking. No onClick, no role, no
          tabIndex, no aria-haspopup, no hover or active state, not a <button>.
          A scope name that still answers a tap is the worst outcome here,
          because it looks settled and behaves like the thing he removed.

          WHY IT IS CONDITIONAL AND NOT JUST DELETED. The door moves to the
          icon, and the icon only exists where a caller passes `onOpenNav` -
          today that is the Dashboard alone. /alerts, /system/:id and /valves
          have no icon, so making the title inert there would leave those three
          screens with NO route into the drawer at all. Rule 0, and three
          drawer suites would go red. The rule this encodes is therefore
          "the bar has exactly one drawer door": the icon when there is one,
          the title when there is not.

          `scopeAriaLabel` LIVES ON WHICHEVER OF THE TWO IS THE DOOR, and never
          on both - two elements answering to `Switch location` would hand the
          drawer suites a different control without failing anything.

          THE INK. `text-slate-800` is themed, but it is themed for the PAGE
          ground: #1d293d under light, zinc-100 under dark. On the Dashboard
          this text now sits directly on the wave, where the ground does not
          change with the theme and the ink does - measured at 393x852, the
          near-white dark-theme ink on the artwork is the failure case, and it
          is invisible in light. `--ink-on-color` is this repo's token for ink
          on a coloured ground (SystemsOverviewHero's headline and chip
          numerals already use it, and under `contrast` it inverts, "or it is
          not an instrument"). `onColor` picks it, and only a caller whose bar
          sits on artwork passes it.

          ⚠ IT DEPARTS FROM THE FRAME IN LIGHT. 199954:96281 spells this text
          #1e2a3b, i.e. dark, over the wave's pale top band. That literal is a
          light-mode value with no themed counterpart, and a colour identical
          in all four themes is not tokenised. REPORTED. */}
      {/* ── LEFT, AND BIGGER — 2026-11-04 ─────────────────────────
          Owner, on a screenshot of `All Accounts` centred in the bar: "take
          the title left not centered and make it bigger."

          ⚠ BOTH ATOMS DEPART FROM THE NODE. 199954:96279 emits `text-center`
          at `text-[15px]`/`leading-[22.5px]`; this is deliberately neither. Do
          not "restore" them from the frame — the owner is looking at the
          running app, and he removed this slot's chassis the same evening,
          which is what left a centred 15px line floating in a 311px void with
          no box to be centred IN.

          WHERE ITS LEFT EDGE SITS: x=16, the bar's own gutter, NOT the hero's
          text column. Measured at 393x852, the two candidates are 23px apart,
          so this is a choice between two CLEAR alignments rather than a near
          miss:
               x=16   the tab row, every card, the floating pill, and this
                      bar's own leading slot (back, or /alerts' bell)
               x=39   the hero's eyebrow, headline and chips — and nothing
                      else on the page
          16 wins because it is the page's STRUCTURAL edge and this bar is
          chrome, like the tab row directly under the hero. The hero's 39 is
          its own 23px internal padding, not a column: aligning the header to
          another component's padding couples the two, and that inset has
          already moved once. Both were rendered and compared at 393x852
          before this was written down, and 39 does look better composed on
          `/` — but the LEADING SLOT settles it:

            ⚠ THE TITLE'S LEFT EDGE IS NOT A CONSTANT. It is flex-1 after
            whatever the leading slot holds, so it starts at x=16 on `/` and
            at x=66 on /location/:name, where the 40px back glyph and the 10px
            gap come first. Measured, both routes.

          There is therefore no shared column to join: the +23 that lines the
          title up with the hero on `/` puts it at 89 on a location, where 66
          already reads correctly as "after the back control" and 89 reads as
          adrift. So the title goes as far left as its slot allows and nothing
          is added — one rule, no route conditional, and the trade (on `/` the
          hero copy sits 23px to its right) is reported rather than papered
          over. If the owner wants the shared column it is a `pl-[23px]` here
          plus a ruling on what a location route should do.

          THE SIZE IS A SCALE STEP, NOT A PICKED NUMBER. 15px was the node's
          literal and is not on this app's scale at all. `text-xl` is 20px, the
          step the repo already uses (BulkValveConfirmSheet's sheet title,
          EventFocusOverlay's figures), and it carries a second, measurable
          argument: WCAG puts the large-text boundary at 18.66px BOLD, so 20px
          bold drops this slot's requirement on the artwork from 4.5:1 to
          3:1, while 18px would have stayed below the line and bought nothing.
          The hero's headline under it is 39.4px, so 20 reads as a clear step
          up from 15 without competing with it — a 2:1 gap, measured.

          THE BAR DOES NOT GROW. The row is `items-center` and the 40px nav
          button is still the tallest thing in it: 22.5 -> 28 of line box is
          well inside 40, and the bar measures 54px before and after. That
          matters because the artwork band's height is arithmetic off this bar.

          IT IS STILL INERT. No chassis, no chevron, no handler, no role, no
          tabIndex — see below. Bigger text is the one thing that could make it
          read as tappable again, and nothing here makes it so.

          ⚠ ONLY THIS BRANCH CHANGED. The <button> below is still the node's
          centred 15px, because it is a different object: a bordered pill with
          a chevron, where centring belongs to the chassis and enlarging the
          label would reflow a control the owner has not been shown. He was
          looking at the chassis-less readout. Every screen that passes
          `onOpenNav` gets this treatment and CONVERGES, which is the direction
          the one-header ruling points; restyling three screens that did not
          ask would not be. REPORTED, NOT RESOLVED. */}
      {onOpenNav ? (
        <p
          className={cn(
            'min-w-0 flex-1 truncate text-left font-sans font-bold text-xl leading-[28px]',
            onColor ? 'text-ink-on-color' : 'text-slate-800',
          )}
          dir="auto"
          data-node-id="199954:96279"
          data-name="app-scope"
        >
          {label}
        </p>
      ) : (
        /* The WHOLE pill is the target, not the 18px caret: a caret alone is a
           worse target than the label beside it, and the caret is what
           announces the label is changeable at all. */
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label={scopeAriaLabel}
          title={scopeAriaLabel}
          aria-haspopup="dialog"
          className="flex h-[44px] min-w-px flex-1 cursor-pointer items-center gap-[6px] rounded-[14px] border border-solid border-slate-300 pl-[14px] pr-[8px] outline-none transition-colors hover:bg-card/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          data-node-id="199922:83961"
          data-name="app-scope"
        >
          {/* `leading-` AFTER the size: tailwind-merge treats leading- as
              conflicting with the font-size atom and drops whichever came first.
              Same trap, same spelling, as MobileHeaderBar. */}
          <p className="min-w-0 flex-1 truncate text-center font-sans font-bold text-slate-800 text-[15px] leading-[22.5px]" dir="auto">
            {label}
          </p>
          <ChevronDown className="size-[18px] shrink-0 text-slate-800" aria-hidden="true" />
        </button>
      )}

      {/* THE AVATAR STOOD HERE and was removed 2026-11-04. Owner: "remove
          avatar from the header - footer is enough". It was a 38px disc, the
          node's own, that navigated to /account.

          IT IS NOT A LOST DOOR, which is the only reason this is not a Rule 0
          breach: the floating tab bar now carries a fourth item, Profile, on
          the same /account, and TabBar is mounted on this page. Verified in
          the running app rather than read off the source - tapping Profile
          from this screen lands on /account as admin and as tenant-1apt, and
          the same holds on /system/:id and /valves. Had the tab not been
          there this removal would have left the Dashboard with no route to
          the profile screen at all.

          The pill simply takes the 48px back (38 avatar + the 10 gap): it is
          flex-1 and nothing else about the bar changed. */}

      {/* 199954:96276 — 40x40 at x=340, a 21px glyph centred, `bg-white` in
          the node. See THE TRAILING SLOT above for what it does and why the
          glyph is PanelLeft.

          bg-card, not bg-white: the node's white is a SURFACE here, not a
          filter over artwork, so it is the token that four themes re-pick.
          The disc the owner rejected was `back`'s (199922:83762 is a bare
          Icon); this control is 199954:96276, which IS a filled 40x40 button
          at radius 20 in its own node, and it needs the fill for a different
          reason as well — it is the one control on this bar that sits on the
          wave, and a bare 21px stroke on photographic artwork is the contrast
          case the frame itself answers with a disc.

          text-primary is the node's blue (#0b81f8 -> --primary), which is also
          what the composed frame renders this glyph as. Every colour here is a
          token: the bar's own header records why no hex survives in this file. */}
      {onOpenNav ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenNav}
          /* THE CONTRACT NAME IS HERE NOW, not on the readout above. `Switch
             location` is what drawerLocationHighlight:86,
             drawerNestedLocationHighlight:46 and scopePersistsThroughDrawer:61
             open the drawer BY, and the owner has just made this control the
             only door. The name follows the door - leaving it on an inert
             <p> would hand three suites an element that cannot be clicked,
             and dropping it would take the drawer away from every caller that
             navigates by accessible name. It has been broken and restored
             three times today; `scopeAriaLabel` is spelled once, here and on
             the button branch above, and never on both at once. */
          aria-label={scopeAriaLabel}
          title={scopeAriaLabel}
          aria-haspopup="dialog"
          className="flex size-[40px] shrink-0 cursor-pointer items-center justify-center rounded-[20px] bg-card hover:bg-card active:opacity-60"
          data-node-id="199954:96276"
          data-name="app-nav"
        >
          <PanelLeft className="size-[21px] text-primary" aria-hidden="true" strokeWidth={1.75} />
        </Button>
      ) : null}
    </div>
  )
}
