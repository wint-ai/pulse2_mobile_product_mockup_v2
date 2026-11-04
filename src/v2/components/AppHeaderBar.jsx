/**
 * AppHeaderBar — THE header. Figma node 199922:83959.
 *
 * ── ONE HEADER, EVERY SCREEN — 2026-11-04 ─────────────────────────────────
 * Owner, looking at the system page: "Why on system page we have a different
 * header? It always needs to be the same." Before that there were three:
 * this bar on `/`, an inlined copy of v1's ScopeHeader rules on `/alerts`,
 * and MobileHeaderBar on `/system/:id` and `/valves`.
 *
 * THE SKELETON IS FIXED AND ONLY THE LEADING SLOT VARIES:
 *
 *     [ leading ]  [ title, flex-1 ]  [ trailing ]
 *       back           scope pill        empty
 *       or a badge     or entity name
 *       or nothing
 *
 *   /                 nothing -> the pill takes the whole width
 *   /location/:name   back    -> the account roll-up
 *   /system/:id       back    -> the parent location
 *   /valves           back    -> wherever the screen was pushed from
 *   /alerts           the bell badge, via `leading`. See that prop.
 *
 * The TITLE is always the same control: a readout that opens the navigation
 * drawer, named `Switch location`, because scope is picked "Only in the
 * drawer" (owner). TRAILING is empty everywhere - the avatar that used to
 * sit there moved to the tab bar.
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
/* `Home` left with the house on 2026-11-04 — see the header. */
import { ChevronDown, ChevronLeft } from 'lucide-react'

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

      {/* The WHOLE pill is the target, not the 18px caret: a caret alone is a
          worse target than the label beside it, and the caret is what announces
          the label is changeable at all. */}
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
    </div>
  )
}
