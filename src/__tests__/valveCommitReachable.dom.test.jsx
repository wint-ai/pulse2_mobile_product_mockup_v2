// @vitest-environment happy-dom
//
// THE COMMIT CONTROL ON /valves HAS TO BE REACHABLE, NOT MERELY RENDERED.
//
// 2026-11-04, the owner, on a screenshot of /valves/100 Meridian Plaza:
// "I can't open and close the valve because it's overlapped. So fix it.
// Currently it can't be used."
//
// WHAT HAD HAPPENED. TabBar stopped reserving a column on 2026-11-04 ("and it
// needs to be completely floating"): its host is `relative shrink-0 h-0` and
// the pill hangs off that anchor, covering the bottom TAB_BAR_FOOTPRINT (77px)
// of every screen. Seventeen scroll bodies were given TAB_BAR_CLEARANCE of
// bottom padding in that pass. This screen has something no other screen has —
// a bottom-pinned CONTROL, the selection strip, with the two commit buttons in
// it — and a control at the bottom of the page column is a different element
// from a scroll body. It was missed, so `Close N valves` shipped underneath the
// tab bar. Measured in Chromium at 393x852 before the fix: the button occupied
// y 803->835 against a pill at y 775->840, and `document.elementFromPoint` at
// the button's own centre returned a tab-bar button. Playwright refused to
// click it at all.
//
// WHY THIS FILE EXISTS ALONGSIDE valveManagementScreen.dom.test.jsx. That suite
// checks selection, reach, counts and the deep link, and every one of its
// assertions stayed GREEN through this defect: the button was in the document,
// enabled, correctly numbered and `fireEvent.click` fired its handler. A click
// test cannot tell "covered" from "working", because happy-dom has no layout
// engine, no hit testing and no `elementFromPoint` — it dispatches straight at
// the node whatever is painted over it.
//
// SO THE INVARIANT IS PINNED STRUCTURALLY, AND IT IS ONE SENTENCE:
//
//     THE COMMIT CONTROL IS INSIDE WHATEVER IS LAST IN THE PAGE COLUMN, AND
//     THE BAR ITSELF RESERVES TAB_BAR_CLEARANCE BELOW THAT COLUMN.
//
// Both halves are needed. The reservation alone would pass on a screen that
// put its buttons somewhere else; the containment alone would pass on the
// broken screen. Every number is read from `tabBarMetrics`, so moving the pill
// moves this test with it.
//
// *** THE SECOND HALF MOVED OFF THIS SCREEN ON 2026-11-08. *** It used to
// read "whatever is last in the page column reserves at least
// TAB_BAR_CLEARANCE BELOW ITSELF", and this screen paid it as
// `marginBottom: TAB_BAR_CLEARANCE` on the strip. That fixed the strip and
// left the general case broken — bottom spacing only protects the END of a
// column, so ordinary rows still came to rest under the pill mid-scroll, and
// the owner hit it again on /location/Office ("I can't click any water events
// from location"). TabBar's host is `h-[93px]` now and reserves the strip as
// real column for every screen, so this page reserves NOTHING and the three
// tests that measured its margin assert zero. See the block above them.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { UserProvider } from '@/context/UserContext'
import ValveManagementScreen from '@/v2/pages/ValveManagementScreen'
import SearchScreen from '@/v2/pages/SearchScreen'
import { SYSTEMS } from '@/data/systems'
import { clearValveCommands } from '@/data/valveCommandStore'
import { summariseValves } from '@/v2/components/valveScope'
import { TAB_BAR_CLEARANCE, TAB_BAR_FOOTPRINT } from '@/components/tabBarMetrics'

/* A scope with systems but ZERO valves, so the selection strip is not mounted
   and the SCROLLER is the bottom-most element. Picked by predicate rather than
   by name, after valveManagementScreen.dom.test.jsx, so it survives the
   catalog moving under this file. */
const inScope = (name) =>
  SYSTEMS.filter(
    (s) => s.l4Name === name || s.l3Name === name || s.l2Name === name || s.l1Name === name,
  )
const ZERO_VALVE_SCOPE = ['45 Cedarline Way', '510 Lakeview Dr', '30 Dogwood Dr'].find((n) => {
  const list = inScope(n)
  return list.length > 0 && summariseValves(list).valveTotal === 0
})

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  clearValveCommands()
  /* pushBridge.publish POSTs to ntfy.sh; this is its kill switch. */
  localStorage.setItem('pulse2-bridge-disabled', '1')
  localStorage.setItem('pulse2-persona-id', 'wint-admin')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderAt(path) {
  return render(
    <UserProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/valves" element={<ValveManagementScreen />} />
          <Route path="/valves/:locationName" element={<ValveManagementScreen />} />
          <Route path="/location/:locationName" element={<div>LOCATION OVERVIEW</div>} />
          <Route path="/" element={<div>HOME</div>} />
          {/* THE REAL SCREEN, not a stand-in, and that is the point: the last
              test below asserts that the Search tab reaches a scope tree WITH
              ROWS IN IT. A placeholder here would pass for a tab that
              navigates to an empty page, which is the failure mode this file
              exists to catch one level down from the valve buttons. */}
          <Route path="/search" element={<SearchScreen />} />
        </Routes>
      </MemoryRouter>
    </UserProvider>,
  )
}

/* THE PAGE COLUMN — the flex column that runs to the frame's bottom edge. The
   screen root is `flex:1 / column`; its first child is the column that holds
   the header, the filter row, the scroller and the strip. The sheets, the
   drawer and TabBar are `absolute`/zero-height siblings of that column and are
   deliberately NOT in it, which is why the column's last child is what the
   pill is actually over. */
const column = (c) => c.querySelector('[data-name="valve-management-screen"] > div')
const lastInColumn = (c) => {
  const kids = [...column(c).children]
  return kids[kids.length - 1]
}
const strip = (c) => c.querySelector('[data-name="valve-selection-strip"]')
const scroller = (c) => c.querySelector('[data-name="valve-rows"]')
const commitButtons = (c) =>
  [...c.querySelectorAll('[data-name="valve-action-bar"] button')].filter((b) =>
    /^(Close|Open) /.test(b.textContent || ''),
  )

/** Tick the fleet select-all, which is how a user builds a selection fastest
 *  and the only gesture that reaches the action half in one press. */
const selectAll = (c) => fireEvent.click(c.querySelector('[data-name="valve-select-all"]'))

/** The space a node reserves under itself, in px, from its INLINE style.
 *  happy-dom resolves no stylesheet, so a Tailwind class would read as nothing;
 *  both of the declarations this screen uses for the job are inline values. */
const reservedBelow = (el) => {
  const mb = parseFloat(el.style.marginBottom || '0') || 0
  const pb = parseFloat(el.style.paddingBottom || '0') || 0
  return mb + pb
}

const ROUTES = [
  ['the fleet route', '/valves'],
  ['the scoped route', '/valves/100 Meridian Plaza'],
]

describe('the bulk commit control clears the floating tab bar', () => {
  it.each(ROUTES)('%s puts the commit buttons inside the strip', (_label, path) => {
    const { container } = renderAt(path)
    selectAll(container)

    const bar = strip(container)
    expect(bar, 'the selection strip is not mounted, so there is nothing to commit with').not.toBeNull()

    const buttons = commitButtons(container)
    expect(buttons.length, 'expected a Close and an Open button').toBe(2)
    for (const b of buttons) {
      expect(
        bar.contains(b),
        `"${b.textContent.trim()}" is outside the selection strip, so the strip's `
          + 'clearance does not protect it and it can sit under the tab bar',
      ).toBe(true)
    }
  })

  it.each(ROUTES)('%s leaves the strip last in the page column', (_label, path) => {
    const { container } = renderAt(path)
    selectAll(container)
    expect(
      lastInColumn(container),
      'something is mounted below the selection strip in the page column. The '
        + 'strip reserves the pill\'s footprint for ITSELF; anything after it is '
        + 'back under the bar.',
    ).toBe(strip(container))
  })

  /* ── WHO PAYS THE CLEARANCE INVERTED ON 2026-11-08 ────────────────────
     These three tests used to require TAB_BAR_CLEARANCE of margin under the
     strip (and under the scroller when no strip is mounted). They require
     ZERO now, and that is the same defect being fixed properly rather than a
     regression.

     The 2026-11-04 fix moved the strip out of the pill's band with
     `marginBottom: TAB_BAR_CLEARANCE`. It worked for the strip and left the
     general case broken: bottom spacing only protects whatever is at the END
     of a column, so ordinary scrolled content still came to rest under the
     opaque pill at intermediate offsets. The owner hit it again on
     /location/Office - "I can't click any water events from location. It just
     doesn't click" - and the fix moved into TabBar itself: the host is
     `h-[93px]` and reserves the strip as real column for EVERY screen.

     So the bottom-most element of this page column is above the pill by
     construction, and the old margin would now DOUBLE the gap - the strip
     floating 93px up from a bar already sitting 93px below the column.
     Re-measured in Chromium at 393x852 after the move: strip y 682 -> 759,
     pill y 775 -> 840, 16px of daylight, and `elementFromPoint` at the Close
     button's centre still returns the Close button.

     THE TWO ASSERTIONS THAT ACTUALLY PROTECT THE BUTTON ARE UNCHANGED, and
     they are the ones above: the commit buttons live INSIDE the strip, and
     the strip is LAST in the page column. What moved is only which element
     reserves the room. */
  it.each(ROUTES)('%s leaves the clearance to the bar, not to the strip', (_label, path) => {
    const { container } = renderAt(path)
    selectAll(container)

    const reserved = reservedBelow(strip(container))
    expect(
      reserved,
      `the selection strip reserves ${reserved}px below itself. TabBar's host `
        + `already reserves ${TAB_BAR_CLEARANCE}px of real column for the pill, so `
        + 'this is reserved twice and the strip floats a whole bar-height above '
        + 'the bar. Delete it; the bar pays for itself (tabBarMetrics.js).',
    ).toBe(0)
  })

  it('leaves it to the bar on the SCROLLER too, when no strip is mounted', () => {
    expect(ZERO_VALVE_SCOPE, 'no zero-valve scope in the catalog to test with').toBeTruthy()
    const { container } = renderAt(`/valves/${ZERO_VALVE_SCOPE}`)

    expect(strip(container), 'a scope with no valves must not draw a selection strip').toBeNull()
    expect(lastInColumn(container)).toBe(scroller(container))
    expect(
      reservedBelow(scroller(container)),
      'with no strip the SCROLLER is the bottom-most element - and like every '
        + 'other scroll body in the app it reserves nothing, because the bar does.',
    ).toBe(0)
  })

  it('reserves it exactly once, and that once is the tab bar host', () => {
    /* Not tidiness, and it is why the conditional padding this screen used to
       carry is gone on BOTH branches. The host takes TAB_BAR_CLEARANCE of
       column; anything the page adds comes straight out of the list. Measured
       at 393x852: 484px of usable scroll on /valves before and after. */
    const { container } = renderAt('/valves')
    selectAll(container)
    expect(reservedBelow(scroller(container))).toBe(0)
    expect(reservedBelow(strip(container))).toBe(0)

    const host = container.querySelector('[data-name="tabbar-host"]')
    expect(host, 'the bar is not mounted on /valves').not.toBeNull()
    expect(
      host.className,
      `the host must declare h-[${TAB_BAR_CLEARANCE}px]. It is the only thing `
        + 'keeping the commit buttons out of the pill\'s band now that neither '
        + 'the strip nor the scroller reserves anything.',
    ).toMatch(new RegExp(`(?:^|\\s)h-\\[${TAB_BAR_CLEARANCE}px\\](?:\\s|$)`))
    expect(
      TAB_BAR_CLEARANCE,
      'the reserved column is smaller than the band the pill fills, so the pill '
        + 'hangs out of its own host and back over this strip',
    ).toBeGreaterThanOrEqual(TAB_BAR_FOOTPRINT)
  })

  it('fixes the overlap by position, never by stacking', () => {
    /* The strip must keep LOSING to the drawer (z-10/11) and to the two sheets
       (z-50 / z-[300]). Lifting it over the pill would make the button visible
       and still leave it under the bar's hit area, and it would break the one
       ordering this screen's safety rests on. */
    const { container } = renderAt('/valves')
    selectAll(container)
    expect(
      strip(container).className,
      'the selection strip carries a z-index. The overlap is fixed by moving the '
        + 'strip out of the pill\'s band, not by painting over it.',
    ).not.toMatch(/(?:^|\s)z-(?:\[\d+px?\]|[1-9]\d*)(?:\s|$)/)
    expect(strip(container).style.zIndex || '').toBe('')
  })
})

/* ── THE HEADER, SAME PASS ────────────────────────────────────────────────
   The owner, 2026-11-04: "I see that we still have the old version of header
   above in some places, so you need to make sure we don't use the same
   navigation on the header." /valves was drawing AppHeaderBar's OLD shape — a
   bordered title pill with a chevron-down that opened the drawer. The title
   going inert and the drawer getting its own control came out of that.

   ── THE DOOR MOVED OFF THE HEADER ENTIRELY — RE-AIMED 2026-11-07 ──────────
   READ THIS BEFORE POINTING THESE BACK AT `Switch location`.

   The first two tests below asserted that exactly one element per route
   answered to `[aria-label="Switch location"]` and that it was the header's
   `app-nav` PanelLeft button. BOTH HALVES ARE RETIRED, in two steps on one
   day, and neither is a regression:

     1. The restructure deleted the PanelLeft button from AppHeaderBar — node
        200013:91526 has no such control — so `app-nav` does not exist.
     2. The owner then replaced the footer's More tab with Search: "replace
        the 'More' in buttom main nav bar With Search ... Serach open the nav
        bar with the systems and locations". The drawer's door is that tab.

   THE NAME COULD NOT TRAVEL WITH THE DOOR. A tab whose visible label reads
   `Search` cannot announce as `Switch location` — WCAG 2.5.3 Label in Name
   requires the accessible name to contain the visible label. So the door is
   named `Search locations and systems` (`drawer.search_label`, the same entry
   WintSidebarV2's own field uses) and the SUITES moved, not the code.
   drawerLocationHighlight.dom.test.jsx:140 made the same move and carries the
   long version of this note.

   `Switch location` now answers on NO v2 route. It survives on `/v1/` and
   `/systems`, where v1's ScopeHeader still hangs it on its badge; both are v1
   reference routes and neither is this screen.

   WHAT IS PINNED INSTEAD — and it is MORE than before, not less:
     · exactly one reachable drawer door on this route, by a stable name;
     · it is in the TAB BAR, i.e. reachable from every screen, rather than in
       one screen's header;
     · tapping it actually OPENS the drawer. The old version of the last test
       only checked that a `[role="dialog"]` existed, and WintSidebarV2 is
       ALWAYS mounted — it toggles `aria-hidden` — so that assertion passed
       whether or not the click did anything. Open state is read off
       `aria-hidden` here, the way dashboardHeaderBar reads it.

   ── THE DOOR CHANGED WHAT IT OPENS — 2026-11-09 NAVIGATION REDESIGN ───────
   *** THE OWNER HAS NOT RULED ON THIS. IT MUST STAY CHEAP TO REVERSE. ***

   THE OLD CONTRACT, in the words of the assertion that carried it:

       it('opens the drawer from the Search tab')
         fireEvent.click(doors(container)[0])
         expect(drawerIsOpen(container),
           'nothing on /valves opens the drawer. The header lost its PanelLeft
            in the 2026-11-07 restructure, so the Search tab is the ONLY door
            here - a dead tab leaves this screen with no navigation at all.',
         ).toBe(true)

   WHAT CHANGED. The Search tab stopped dispatching requestDrawerSearch() and
   became an ordinary link to the new route `/search`, which renders
   src/v2/pages/SearchScreen.jsx — a FULL-SCREEN scope tree. So on this screen
   the tab no longer opens WintSidebarV2; it navigates to the same tree as a
   page. The drawer this screen still mounts has no door left on /valves.

   WHY THE TEST IS RE-AIMED AND NOT DELETED, AND WHY THE INTENT SURVIVES. The
   message above names its own intent exactly: *a dead tab leaves this screen
   with no navigation at all*. That is what this file protects, and it is still
   protected — arguably better. The tab is not dead: it leads to the account /
   location / system tree, and it does so from EVERY route, including the ten
   that mount this bar and no drawer at all (/account, /alerts,
   /alerts/system/:id, /kpi/:type, /leak/:id, /l4/:l4id, /more, /home-clear,
   /home-multi, /home-legacy — the sweep is in src/components/drawerSearch.js).
   The old door opened a drawer that on those ten routes was never mounted; the
   tab had to lazily mount one of its own to fake it. So the assertion below
   pins the INVARIANT the old one was a proxy for — every screen that mounts
   <TabBar> has a reachable navigation surface, and the Search tab reaches the
   scope tree — at full strength, through a real click, reading the tree's own
   rows rather than a dialog's aria-hidden.

   NOTHING IS DEMOLISHED, AND REVERSING IT IS ONE IMPORT PLUS TWO LINES:
     · src/components/drawerSearch.js is UNTOUCHED, and still exports both
       DRAWER_SEARCH_EVENT and requestDrawerSearch().
     · BOTH listeners are untouched and still answer the event:
       WintSidebarV2.jsx:628 and NavigationDrawer.jsx:914.
     · this screen still mounts its WintSidebarV2, and every route below still
       exists. Nothing was removed from the app.
   To put the old door back: re-add `import { requestDrawerSearch } from
   '@/components/drawerSearch'` to TabBar.jsx and the two lines in the Search
   tab's onClick that call it and skip the navigate. That is the whole revert.

   THE ANSWER TO "DID ANYTHING BECOME UNREACHABLE", recorded here because this
   test is where it would show up. No user-facing FUNCTION did. Everything
   WintSidebarV2 can do, /search can do: browse and navigate the same tree
   (buildTree, now literally the same exported function), search it, pin and
   unpin rows (persisted here rather than reset on unmount), expand and
   collapse, collapse-all. Its one other control is the footer bell to
   /alerts, and the Alerts TAB sits in the same bar on every screen. Its
   `Filter locations (not implemented)` button was never implemented. What IS
   lost is the drawer as a SURFACE on the routes whose only door was this tab,
   and one convenience: the drawer's scrim put you back on /valves with one
   tap, whereas /search draws no Back (its Figma frame has none) and returning
   here means Dashboard -> overview -> Valves. Flagged, not hidden. */
describe('/valves draws the current header', () => {
  /* SCOPED TO `button` ON PURPOSE. The door and the field on the other side of
     it announce alike by design, so two elements can carry this name on one
     page: the tab (a button) and a search <input> (a textbox) - the drawer's
     own field while it was the destination, SearchScreen's field now. A bare
     attribute selector would pick whichever came last in the DOM.

     THE CONSTANT IS STILL CALLED THE DOOR. Since 2026-11-09 it opens /search
     rather than the drawer (see the note above the describe), but it is still
     the one control that gets a user off this screen and the one accessible
     name four suites navigate by. */
  const NAV_DOOR = 'Search locations and systems'
  const doors = (c) => c.querySelectorAll(`button[aria-label="${NAV_DOOR}"]`)
  const drawer = (c) => c.querySelector('[role="dialog"][aria-label="Locations menu"]')
  const drawerIsOpen = (c) => drawer(c)?.getAttribute('aria-hidden') === 'false'

  it.each(ROUTES)('%s has exactly one navigation door, in the tab bar', (_label, path) => {
    const { container } = renderAt(path)

    const found = doors(container)
    expect(
      found.length,
      'exactly one element per route may answer to the navigation door\'s name - it '
        + 'is what drawerLocationHighlight.dom.test.jsx navigates by, taking the LAST '
        + 'match. A second one hands that suite a different control without failing '
        + 'anything, which is how a contract name rots quietly.',
    ).toBe(1)
    expect(
      found[0].closest('[data-name="tabbar-pill"]'),
      'the navigation door is not in the tab bar. It is the FOOTER\'s Search tab, '
        + 'not a header control - that is what makes it reachable from every screen.',
    ).not.toBeNull()

    expect(
      container.querySelectorAll('[aria-label="Switch location"]'),
      '`Switch location` is back on a v2 route. It is retired here (see the note '
        + 'above); two controls wearing one contract name is the failure this '
        + 'assertion exists to catch.',
    ).toHaveLength(0)
  })

  it.each(ROUTES)('%s makes the title an inert readout', (_label, path) => {
    const { container } = renderAt(path)
    const title = container.querySelector('[data-name="app-scope"]')
    expect(title, 'the bar must still name the scope').not.toBeNull()
    expect(title.tagName, 'the scope name is a readout, not a control').not.toBe('BUTTON')
    expect(title.getAttribute('role')).toBeNull()
    expect(title.getAttribute('tabindex')).toBeNull()
    expect(title.getAttribute('aria-haspopup')).toBeNull()
    expect(title.textContent.trim().length).toBeGreaterThan(0)
  })

  it.each(ROUTES)('%s keeps the back control', (_label, path) => {
    /* The owner's standing rule - "x and back can't live in parallel ... It
       needs to be back" - and this screen is pushed from the overview. The
       leading slot and the trailing nav slot are different slots; adopting the
       nav button must not cost the back step. */
    const { container } = renderAt(path)
    expect(container.querySelector('[data-name="app-back"]')).not.toBeNull()
  })

  it('the Search tab reaches the scope tree, so this screen is never stranded', () => {
    const { container } = renderAt('/valves')

    /* WintSidebarV2 is a dialog inside the page - no portal, because Phone.jsx
       is a fixed 393x852 overflow-hidden frame. It is mounted CLOSED, not
       absent. IT IS ASSERTED STILL MOUNTED, and that is deliberate: the
       2026-11-09 change took away its door on this route, it did NOT take away
       the drawer, and re-adding two lines to TabBar.jsx is the whole revert.
       If somebody deletes the drawer on the theory that nothing opens it, this
       line is where the owner's unmade decision gets made for him. */
    expect(
      drawer(container),
      'the drawer has been removed from /valves. The 2026-11-09 redesign only '
        + 'moved its DOOR - the owner has not ruled on the drawer itself, and '
        + 'deleting it is what makes the change expensive to reverse.',
    ).not.toBeNull()
    expect(drawerIsOpen(container), 'the drawer starts open').toBe(false)

    /* A REAL CLICK ON THE REAL CONTROL, as before. What changed is where it
       goes: the tab navigates to /search instead of dispatching the drawer
       event, so the end state is read off the tree's own rows rather than off
       the dialog's aria-hidden. Both are "the user can get to the navigation
       tree from this screen"; only the surface moved. */
    fireEvent.click(doors(container)[0])

    expect(
      screen.queryByText('Select system to show'),
      'the Search tab did not reach the scope picker. It is the only navigation '
        + 'control on /valves - the header lost its PanelLeft in the 2026-11-07 '
        + 'restructure and the drawer lost its door on 2026-11-09 - so a tab that '
        + 'goes nowhere leaves this screen with no navigation at all.',
    ).not.toBeNull()

    /* AND THE TREE HAS TO HAVE SOMETHING IN IT. A screen that renders its
       heading over an empty list is the same dead end with a title on it,
       and it is a live failure mode here: UserContext derives the tree from
       the persona, so a broken persona builds nothing. */
    const treeRows = container.querySelectorAll('[data-scope-row]')
    expect(
      treeRows.length,
      'the scope picker rendered with no rows, so the Search tab leads to an '
        + 'empty screen. Reaching a blank page is not reaching navigation.',
    ).toBeGreaterThan(1)

    /* NOT ASSERTED HERE: the drawer's state after the click. /valves has
       unmounted by now, so `drawerIsOpen` would read undefined and pass for
       any reason at all. Its presence was asserted BEFORE the click, which is
       the half that can regress. */
  })
})
