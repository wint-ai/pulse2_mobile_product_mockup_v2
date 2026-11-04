/**
 * More — the placeholder surface, 2026-11-04.
 *
 * DESIGN SOURCE: none. There is no Figma node for this screen and none is
 * invented; it draws one catalogue string and one glyph.
 *
 * WHY IT EXISTS. The owner, three times in one day:
 *
 *   "Profile needs to open the user profile. More doesn't need to open the
 *    user profile - they are separate buttons. You can just grey out the More
 *    for now... or you can just open a screen and say this is coming soon,
 *    this is better. But don't use the same buttons for the same thing. So
 *    make the More navigate to / overlay a new screen which hides everything,
 *    but writes there Coming soon."
 *
 * Until today the Profile tab and the More tab both navigated to /account, so
 * the bar had two buttons opening one screen - the thing he objected to. The
 * resolution TabBar.jsx predicted is the one taken: /account IS the profile
 * surface and keeps every row it had, and MORE - the "reports, users, etc"
 * surface he described, which has no PRD, no designed screen and no route -
 * becomes this. He chose the screen over the greyed-out tab explicitly
 * ("this is better").
 *
 * COPY. `more.coming_soon` ONLY. It already existed in en.json / he.json (en
 * "Coming soon", he "בקרוב"), added earlier today for the Users and Reports
 * rows on /account, and §0 of .claude/skills/wint-ui-copy/SKILL.md forbids
 * coining a second string for the same statement. Nothing else on this screen
 * is words: no subtitle, no "under construction", no date - the owner was
 * explicit that it is "not under construction, just coming soon", and a
 * supporting line would be copy nobody approved.
 *
 * NOTE FOR THE OWNER: the Hebrew in `more.coming_soon` is an agent's, not a
 * native speaker's, and is already on the sign-off list from this morning.
 * This screen does not add to that list.
 *
 * THE GLYPH IS NOT COPY and carries no meaning the words do not. Hourglass
 * (lucide-react) over the house accent disc - the same bg-secondary /
 * text-primary pair AccountScreenV2's Switch-profile card uses - so the screen
 * is not two bare words on an empty wash. `Construction` was the obvious
 * alternative and was rejected on the owner's own wording.
 *
 * ── HOW IT "HIDES EVERYTHING", AND WHERE IT SITS IN THE STACK ─────────────
 *
 * It is a ROUTE (/more), and the full-cover layer inside it is the house
 * in-frame pattern: `absolute inset-0` pinned to this page's own `relative`
 * root. NOT a Radix <Dialog> or <Sheet>: both portal to document.body, which
 * escapes the fixed 393x852 frame in src/components/Phone.jsx and greys out
 * the whole browser window with the phone sitting in the middle of it. That
 * bug has shipped here at least three times; the long form is at
 * ValveConfirmSheet.jsx:17-24, and the precedents are
 * BulkValveConfirmSheet.jsx:1030 and FilterSheet.jsx:402.
 *
 * THE COVER CARRIES NO z-index, AND THAT IS THE WHOLE TRICK. The app's
 * stacking order is scroller auto -> TabBar host auto -> band z-[1] -> chrome
 * z-[2] -> drawer 10/11 -> overlays 50/300 (AppHeaderBar.jsx:101-112). A
 * positive z-index here would beat the chrome and the drawer - and it would
 * also beat the floating tab bar, whose host is deliberately z-index:auto so
 * the z-50 and z-[300] overlays can cover it (TabBar.jsx:244). Raising the
 * host instead is explicitly ruled out: the drawer scrim is z-10 and its panel
 * z-11, so a raised host punches the pill through the navigation drawer
 * (tabBarFloatingClearance.dom.test.jsx:222-228).
 *
 * So the cover stays at z-auto and wins on TREE ORDER instead - two positioned
 * boxes at z-auto paint in document order, and <TabBar> is mounted AFTER it.
 * The result is exactly the two facts this screen needs:
 *
 *   · nothing on this route paints through the cover. This screen mounts no
 *     band, no chrome block and no NavigationDrawer, so there is nothing in
 *     the z-[1] .. z-11 range to lose to in the first place; the cover is the
 *     only thing between the page root and the bar.
 *   · the floating tab bar paints ON TOP of it and stays tappable. That is
 *     the way back: tapping Dashboard, Alerts or Profile navigates away and
 *     this screen unmounts. Without it the placeholder would be a trap, since
 *     it draws no back button and has nowhere to go back to.
 *
 * PushNotifications (z-[300]) and PushSimTrigger (z-[240]) are mounted outside
 * the route in App.jsx and still cover this screen, which is correct - they
 * simulate the phone's OS, not the app.
 *
 * SHELL CONTRACT (.claude/skills/v2-page-parity/SKILL.md): root is
 * flex-1/min-h-0/flex-col, exactly one child is flex-1/overflow-y-auto/min-h-0,
 * <TabBar activeTab="more"> is the last sibling. No min-h-screen, no fixed.
 * The scroller is inside the cover rather than beside it because the cover IS
 * the screen here. `m-auto` on the content, not `justify-center` on the
 * scroller: a centred flex child that overflows its container is cut off at
 * the TOP and cannot be scrolled back to, which at 393x852 is one long
 * Hebrew line away from being real.
 *
 * pb-[93px] is TAB_BAR_CLEARANCE (src/components/tabBarMetrics.js) - the pill
 * covers the bottom 77px of every screen plus a 16px gutter. It keeps the
 * centred block clear of the bar rather than optically centred under it.
 */
import { useTranslation } from 'react-i18next'
import { Hourglass } from 'lucide-react'

import TabBar from '@/components/TabBar'

export default function MoreComingSoonScreen() {
  const { t } = useTranslation()

  return (
    /* `relative` is load-bearing: it is what the cover below pins to, and it
       is why that cover stays inside the 393x852 frame.

       SO IS `justify-end`, AND IT IS NOT TIDINESS. The cover is `absolute`,
       so it is OUT OF FLOW and this flex column has exactly ONE in-flow
       child: TabBar's host, which is `h-0` by design (it reserves no column
       at all so content can pass under the floating pill). On every other
       screen the host is pushed to the frame's bottom edge by the scroll
       body's `flex-1` ahead of it; here there is nothing in flow to push it,
       so it lands at the TOP and the pill hangs at y -77, off the top of the
       frame. Measured exactly that way in the browser before this class
       existed: host [0, 0, 393, 0], pill [16, -77, 361, 65]. With it:
       host [0, 852, 393, 0], pill [16, 775, 361, 65], which is the geometry
       TabBar.jsx documents. */
    <div className="relative flex min-h-0 flex-1 flex-col justify-end bg-[image:var(--app-bg)]">
      {/* THE COVER. Opaque, edge to edge, no z-index - see the header. */}
      <div className="absolute inset-0 flex flex-col bg-[image:var(--app-bg)]">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[24px] pb-[93px] pt-[24px]">
          <div className="m-auto flex flex-col items-center gap-[14px]">
            <span className="flex size-[64px] items-center justify-center rounded-full bg-secondary text-primary">
              <Hourglass className="size-[28px]" aria-hidden="true" />
            </span>
            <h1 className="text-center font-bold tracking-[-0.3px] text-slate-900 text-[20px] leading-[26px]">
              {t('more.coming_soon')}
            </h1>
          </div>
        </div>
      </div>

      {/* Mounted AFTER the cover so it paints over it. This is the only way
          off this screen. */}
      <TabBar activeTab="more" />
    </div>
  )
}
