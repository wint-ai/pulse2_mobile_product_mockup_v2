// @vitest-environment happy-dom
//
// /more — src/v2/pages/MoreComingSoonScreen.jsx.
//
// WHY THIS SCREEN EXISTS. Profile and More both navigated to /account for most
// of 2026-11-04, so the floating bar had two buttons opening one screen. The
// owner, having raised it three times:
//
//   "Profile needs to open the user profile. More doesn't need to open the
//    user profile - they are separate buttons. You can just grey out the More
//    for now... or you can just open a screen and say this is coming soon,
//    this is better. But don't use the same buttons for the same thing. So
//    make the More navigate to / overlay a new screen which hides everything,
//    but writes there Coming soon."
//
// FOUR THINGS ARE PINNED, and each is a way this placeholder could be shipped
// looking right and being wrong:
//
//  1. IT IS A SEPARATE DESTINATION FROM PROFILE. That is the entire
//     complaint. Checked on the route table, not on this screen alone —
//     a component test cannot see two tabs pointing at one path.
//  2. IT SAYS `more.coming_soon` AND NOTHING ELSE. §0 of
//     .claude/skills/wint-ui-copy/SKILL.md: no new string was coined, and no
//     subtitle, date or "under construction" was authored to fill the space.
//  3. IT COVERS THE FRAME WITHOUT A PORTAL. A Radix <Dialog>/<Sheet> would
//     attach to document.body and escape Phone.jsx's fixed 393x852 box — the
//     bug AccountScreenV2's confirm modal was built to avoid.
//  4. THE TAB BAR IS STILL ON IT, ABOVE THE COVER. The screen draws no back
//     button, so the pill is the only way off it. If the cover ever takes a
//     positive z-index it paints over a TabBar host that is deliberately
//     z-index:auto, and the placeholder becomes a trap with no exit.
//
// happy-dom has no layout engine and does not resolve a Tailwind class to a
// z-index, so (3) and (4) are checked as the class contract plus DOM order —
// the same level tabBarFloatingClearance.dom.test.jsx works at, and the same
// reason: the browser is where it was measured, the declaration is what can
// regress silently.
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import MoreComingSoonScreen from '@/v2/pages/MoreComingSoonScreen'
import TabBar from '@/components/TabBar'
import { UserProvider } from '@/context/UserContext'
import { TAB_BAR_CLEARANCE } from '@/components/tabBarMetrics'

afterEach(cleanup)

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/more']}>
      <UserProvider>
        <MoreComingSoonScreen />
      </UserProvider>
    </MemoryRouter>,
  )
}

/** Every tab in a rendered bar, keyed by its label (the first span). */
function tabsByLabel() {
  const out = {}
  for (const b of document.querySelectorAll('button')) {
    const label = b.querySelector('span')?.textContent
    if (label) out[label] = b
  }
  return out
}

/* ── /more IS ORPHANED AS OF 2026-11-07, AND THAT IS THE STATE PINNED HERE ──
 *
 * The owner: "replace the 'More' in buttom main nav bar With Search -locate
 * right to dashboard". The More TAB was this route's only inbound link, so
 * nothing in the running app navigates here any more.
 *
 * THE ROUTE AND THE SCREEN ARE DELIBERATELY STILL HERE. He asked for the tab
 * to be replaced, not for the destination to be demolished; deleting a
 * working screen on that inference is what rule 0 forbids, and where
 * "reports, users, etc" finally lives is still an open question with him.
 * routeSmoke.dom.test.jsx:220 still renders /more, and everything below still
 * holds - the cover, the copy, the stacking order and the way off the screen.
 *
 * So these two cases are re-aimed at the orphaning itself rather than
 * deleted. A tab coming back, or this screen being quietly removed, both show
 * up here. */
describe('/more outlives the tab that used to open it', () => {
  it('has no tab of its own in the bar any more', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <UserProvider>
          <TabBar activeTab="home" />
        </UserProvider>
      </MemoryRouter>,
    )
    const tabs = tabsByLabel()
    expect(tabs.Profile, 'the bar must still carry Profile').not.toBeUndefined()
    expect(tabs.More, 'More was replaced by Search 2026-11-07').toBeUndefined()
    expect(tabs.Search, 'Search took the slot').not.toBeUndefined()
  })

  it('still renders, and lights no tab, because no tab owns it', () => {
    renderScreen()
    const tabs = tabsByLabel()
    expect(tabs.Profile.className).toMatch(/\btext-muted-foreground\b/)
    // The screen still passes activeTab="more" and no tab carries that key,
    // so NOTHING is lit. That is the honest rendering of an orphaned route:
    // the alternative - lighting some other tab - would tell the user they
    // are somewhere they are not.
    const filled = [...document.querySelectorAll('button > div')]
      .filter((d) => /bg-primary\/15/.test(d.className))
    expect(filled, 'no tab owns /more, so no tab may be lit on it').toHaveLength(0)
    // And the way off the screen is still there - the pill is the only one.
    expect(Object.keys(tabs).sort()).toEqual(['Alerts', 'Dashboard', 'Profile', 'Search'])
  })
})

describe('it says Coming soon, and nothing else', () => {
  it('renders the catalogue string as the screen heading', () => {
    renderScreen()
    expect(screen.getByRole('heading', { name: 'Coming soon' })).toBeInTheDocument()
  })

  it('authors no copy of its own', () => {
    const { container } = renderScreen()
    // Everything on the screen that is words, minus the tab bar's four labels.
    const bar = container.querySelector('[data-name="tabbar-host"]')
    const clone = container.cloneNode(true)
    const barClone = clone.querySelector('[data-name="tabbar-host"]')
    expect(bar, 'the bar must be mounted for this subtraction to mean anything').not.toBeNull()
    barClone.remove()
    expect(
      clone.textContent.trim(),
      'the placeholder renders a string that is not more.coming_soon — §0 of '
      + 'wint-ui-copy forbids authoring one, so either it came from the '
      + 'catalogue and belongs in this assertion, or it should not be there',
    ).toBe('Coming soon')
  })
})

describe('it covers the frame the house way', () => {
  it('is an in-frame absolute cover, not fixed and not portalled', () => {
    const { container } = renderScreen()
    const root = container.firstChild

    // The page root is the positioning context the cover pins to. Without it
    // `absolute inset-0` climbs to the viewport and escapes the 393x852 frame.
    expect(root.className).toMatch(/\brelative\b/)

    const cover = [...root.children].find((el) => /\babsolute\b/.test(el.className))
    expect(cover, 'the screen must draw an absolute full-cover layer').not.toBeUndefined()
    expect(cover.className).toMatch(/\binset-0\b/)
    expect(cover.className).not.toMatch(/\bfixed\b/)
    // A portal would have attached it to document.body instead.
    expect(root.contains(cover)).toBe(true)
    expect(screen.getByRole('heading', { name: 'Coming soon' }).closest('div')).not.toBeNull()
    expect(cover.contains(screen.getByRole('heading', { name: 'Coming soon' }))).toBe(true)

    // Nothing anywhere escapes by inline position either.
    for (const el of container.querySelectorAll('[style]')) {
      expect(el.getAttribute('style') || '').not.toMatch(/position:\s*fixed/)
    }
  })

  it('satisfies the shell contract: one scroller, flex:1 / min-h-0 / auto', () => {
    const { container } = renderScreen()
    const found = [...container.querySelectorAll('div')]
      .filter((el) => /\boverflow-y-auto\b/.test(el.className))
    expect(found, 'the screen must own exactly one scroll region').toHaveLength(1)
    expect(found[0].className).toMatch(/\bflex-1\b/)
    expect(found[0].className).toMatch(/\bmin-h-0\b/)
    expect(container.firstChild.className).not.toMatch(/\b(?:min-h-screen|h-screen)\b/)
  })
})

describe('the tab bar is the way off it', () => {
  /* The pill floats over the bottom 77px of every screen. Here the content is
     centred, so without the clearance the heading sits optically centred
     UNDER the bar. */
  it('reserves the pill clearance on its scroller', () => {
    const { container } = renderScreen()
    const scroller = [...container.querySelectorAll('div')]
      .find((el) => /\boverflow-y-auto\b/.test(el.className))
    expect(scroller.className).toMatch(new RegExp(`\\bpb-\\[${TAB_BAR_CLEARANCE}px\\]`))
  })

  /* THE ONE THAT MATTERS. TabBar's host is z-index:auto on purpose
     (TabBar.jsx) and raising it is explicitly ruled out — the drawer scrim is
     z-10 and its panel z-11, so a raised host punches the pill through the
     navigation drawer. CSS paints every positive z-index after every auto one
     whatever the DOM order, so a positive z-index on the cover hides the bar
     completely and this screen becomes a dead end. The cover therefore wins
     on TREE ORDER instead: it is mounted BEFORE the bar, both at z-auto. */
  it('keeps the cover below the bar: no positive z-index, mounted first', () => {
    const { container } = renderScreen()
    const root = container.firstChild
    const cover = [...root.children].find((el) => /\babsolute\b/.test(el.className))
    const host = container.querySelector('[data-name="tabbar-host"]')

    expect(host, 'the bar must be mounted — it is the only exit').not.toBeNull()
    expect(
      cover.className.match(/(?:^|\s)z-(?:\[(\d+)px?\]|([1-9]\d*))(?:\s|$)/),
      'the cover carries a positive z-index. TabBar\'s host is z-index:auto, '
      + 'so this paints OVER the floating bar whatever the DOM order, and the '
      + 'placeholder has no way out. Rely on tree order instead.',
    ).toBeNull()

    const kids = [...root.children]
    expect(
      kids.indexOf(cover),
      'the cover must be mounted BEFORE the tab bar — two positioned boxes at '
      + 'z-auto paint in document order, and the bar has to be the later one',
    ).toBeLessThan(kids.indexOf(host))
  })

  /* THE BUG THIS CAUGHT, measured at 393x852 before the class existed:
       host [0, 0, 393, 0]   pill [16, -77, 361, 65]
     The cover is `absolute`, so it is out of flow and the column's only
     in-flow child is TabBar's `h-0` host. Every other screen pushes that host
     to the frame's bottom edge with the scroll body's `flex-1`; this one has
     nothing in flow to push it, so the pill hung off the TOP of the frame and
     the placeholder had no exit at all. happy-dom has no layout engine, so
     what is pinned is the declaration that fixes it. */
  it('pins the bar to the bottom edge although nothing is in flow', () => {
    const { container } = renderScreen()
    const root = container.firstChild
    const cover = [...root.children].find((el) => /\babsolute\b/.test(el.className))
    const inFlow = [...root.children].filter((el) => !/\babsolute\b/.test(el.className))

    expect(cover, 'the cover is out of flow').not.toBeUndefined()
    expect(
      inFlow.map((el) => el.getAttribute('data-name')),
      'the only in-flow child should be the tab bar host — if something else '
      + 'joins it, re-derive justify-end rather than assuming it still holds',
    ).toEqual(['tabbar-host'])
    expect(
      root.className,
      'without justify-end the h-0 tab bar host sits at the TOP of the column '
      + 'and the pill hangs off the top of the frame at y -77',
    ).toMatch(/\bjustify-end\b/)
  })

  it('offers no other way back, which is why the bar has to work', () => {
    renderScreen()
    // No back arrow, no close: this screen is a tab destination.
    expect(screen.queryByLabelText('Back')).toBeNull()
    expect(screen.queryByLabelText('Close')).toBeNull()
    // The three other tabs are present and are real buttons.
    const tabs = tabsByLabel()
    for (const label of ['Dashboard', 'Alerts', 'Profile']) {
      expect(tabs[label], `${label} must stay reachable from the placeholder`).not.toBeUndefined()
      expect(tabs[label].tagName).toBe('BUTTON')
    }
  })
})
