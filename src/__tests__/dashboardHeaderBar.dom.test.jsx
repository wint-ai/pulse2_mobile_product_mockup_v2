// @vitest-environment happy-dom
//
// AppHeaderBar (Figma 199922:83959) — the app's ONE header, asserted here
// through the Dashboard, which is the surface that mounts every slot it has.
//
// WHY THIS FILE EXISTS. The bar was built at pixel fidelity, taken off
// /alerts when the owner ruled the home-icon header is "relevant only for the
// dashboard view", and then sat referenced by nothing at all while the
// Dashboard kept drawing MobileHeaderBar. A component no route mounts is
// invisible to every other suite in this repo.
//
// ── THE HOUSE IS GONE AND ITS TESTS ARE NOT — 2026-11-04 ─────────────────
//
//   "I want to completely remove the home icon. And once user clicks on
//    dashboard, it just takes him to the upper level of the scope that he
//    already have. Instead of the home button. Just remove it"
//                                                        — owner, 2026-11-04
//
// Five of the assertions below were written against the house, which had been
// given its destination by the owner's earlier reversal of the same day
// ("Home needs to take you to the upper level that the user has ... Not to
// open the side"). The BEHAVIOUR survived the control: it is the Dashboard
// tab's now. So those five are RE-AIMED at the tab rather than deleted —
// deleting them would quietly retire the only coverage the owner's ruling
// has, which is how a behaviour disappears while every gate stays green.
// Two assertions are new: one pins the house's ABSENCE (a removal nobody
// tests can be re-added by accident), and one pins the drawer-scope clear,
// which the house did and which nothing anywhere asserted.
//
// WHAT MOVED, EXACTLY:
//   house is drawn / named       -> the tab is drawn, and KEEPS its own name
//   house navigates, not drawer  -> the tab navigates, and does not open it
//   admin -> all accounts        -> same, measured off the tab
//   one-location user -> her site-> same
//   one-system user -> her system-> same
//
// THE PERSONA EXPECTATIONS ARE DERIVED, never a literal route. Each one is
// computed from `PERSONAS[].systemFilter` over SYSTEMS, so a dataset change
// moves the test with the app instead of leaving a stale string behind.
//
// `Switch location` is singled out deliberately. drawerLocationHighlight,
// drawerNestedLocationHighlight and scopePersistsThroughDrawer all open the
// drawer by that literal accessible name, and it has been broken and restored
// three times in one day. Those three suites render the v1 HomeUnified, so
// they do not cover this page — this is the assertion that does. It matters
// more now, not less: the house was never a drawer door, but it WAS the other
// control in this bar, and the pill is now alone in it.

import { useEffect } from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import { UserProvider, useUserContext } from '@/context/UserContext'
import { PERSONAS } from '@/data/personas'
import { SYSTEMS } from '@/data/systems'

beforeEach(() => {
  localStorage.clear()
  cleanup()
})
afterEach(cleanup)

/** Where the router actually is. Rendered beside the page, outside <Routes>,
    so it reports every path including the ones with no element of their own. */
function PathProbe() {
  const { pathname } = useLocation()
  return <div data-testid="path">{pathname}</div>
}

/** The drawer-selected scope is not readable from the DOM once it is cleared
    — the absence of a title is not evidence — so the context itself is held
    here, the way scopePersistsAcrossTabs does it.

    THE ASSIGNMENT IS IN AN EFFECT, not in the render body, which is the one
    thing this copy does differently. `react-hooks/globals` is an ERROR in
    this config and reassigning a module variable mid-render trips it: the
    three older probes in this repo (scopePersistsAcrossTabs:46 and two in
    drawerLocationHighlight) predate the rule and still report it. An effect
    is what the rule's own message asks for, and it costs nothing here —
    every read below is after an `act()` or a `fireEvent`, both of which
    flush effects. */
let exposedCtx = null
function ContextProbe() {
  const ctx = useUserContext()
  useEffect(() => { exposedCtx = ctx }, [ctx])
  return null
}

function mountAt(path = '/', personaId = null) {
  if (personaId) localStorage.setItem('pulse2-persona-id', personaId)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <UserProvider>
        <PathProbe />
        <ContextProbe />
        <Routes>
          <Route path="/" element={<HomeAllAccounts />} />
          <Route path="/location/:locationName" element={<HomeAllAccounts />} />
          {/* The Dashboard tab navigates, so the only honest assertion about
              it is that the route changed. /account was here for the header
              avatar; the avatar is gone and its door is the tab bar's now. */}
          <Route path="/system/:systemId" element={<div data-testid="system-route" />} />
        </Routes>
      </UserProvider>
    </MemoryRouter>,
  )
}

/** The drawer is kept mounted so its slide has something to animate, so
    "open" is read off the state WintSidebarV2 actually toggles rather than
    off presence in the DOM. */
const drawer = (c) => c.querySelector('[role="dialog"][aria-label="Locations menu"]')
const drawerIsOpen = (c) => drawer(c)?.getAttribute('aria-hidden') === 'false'
const byLabel = (c, name) => c.querySelector(`[aria-label="${name}"]`)
const house = (c) => c.querySelector('[data-name="app-home"]')
const pathOf = (c) => c.querySelector('[data-testid="path"]')?.textContent
/* The scope NAME, by its slot rather than by an accessible name. It used to be
   `byLabel(c, 'Switch location')`, which worked only while the readout and the
   drawer door were the same element. On 2026-11-04 the owner split them - the
   title is an inert <p> and the door is the icon - so reading the scope by the
   door's name would have returned the icon's empty textContent. */
const scopeReadout = (c) => c.querySelector('[data-name="app-scope"]')?.textContent

/** The Dashboard tab, picked the way every other suite in this repo picks a
    tab: the label is deliberately the FIRST <span> inside the button. Going
    through the label rather than an aria-label is itself part of the
    contract — see the accessible-name note in TabBar.jsx. */
const dashboardTab = (c) => {
  const pill = c.querySelector('[data-name="tabbar-pill"]')
  if (!pill) throw new Error('TabBar is not mounted on this page')
  for (const b of pill.querySelectorAll('button')) {
    if (b.querySelector('span')?.textContent === 'Dashboard') return b
  }
  throw new Error('no Dashboard tab in the tab bar')
}

/** The persona's own systems, by the one rule that narrows a persona. */
const visibleFor = (personaId) => {
  const persona = PERSONAS.find((p) => p.id === personaId)
  if (!persona) throw new Error(`no persona ${personaId}`)
  return SYSTEMS.filter((s) => persona.systemFilter(s))
}

describe('Dashboard tab — the home button, since the house was deleted', () => {
  it('is drawn, and keeps its own name rather than naming the destination', () => {
    const { container } = mountAt('/', 'wint-admin')

    const tab = dashboardTab(container)
    expect(tab.tagName).toBe('BUTTON')

    /* THE HOUSE'S NAME DOES NOT COME WITH THE HOUSE'S JOB, and that is the
       decision rather than an omission. Copy §5 makes a GLYPH-ONLY control
       name its destination, which is why the house was `Go to <scope name>`;
       this tab has a label, "Dashboard" is locked in wint-ui-copy §1, and a
       place name is already a destination. An aria-label would also REPLACE
       the content for name computation — the reason this bar's tabs carry
       none — and four other suites address these buttons by this name. */
    expect(tab.textContent).toContain('Dashboard')
    expect(tab.getAttribute('aria-label')).toBeNull()
    // It changes the page; it must not claim to open a dialog.
    expect(tab.getAttribute('aria-haspopup')).toBeNull()
  })

  it('the house is gone from the header, not hidden behind a prop', () => {
    /* NEW, 2026-11-04. A deletion with no test is a deletion that comes back:
       the glyph, `onHome` and `homeAriaLabel` all left together, so neither
       the Dashboard nor a drilled-in location may draw one. */
    const { container } = mountAt('/', 'wint-admin')
    expect(house(container), 'the house is back on the Dashboard').toBeNull()
    expect(byLabel(container, 'Go to All Accounts')).toBeNull()

    cleanup()
    const scoped = mountAt('/location/Office', 'wint-admin').container
    expect(house(scoped), 'the house is back on a location').toBeNull()
  })

  it('navigates, and does NOT open the drawer', () => {
    // The owner's reversal, stated as a test, and still true of the control
    // that inherited it. Start drilled into a location so the navigation has
    // somewhere to go and is observable.
    const { container } = mountAt('/location/Office', 'wint-admin')
    expect(pathOf(container)).toBe('/location/Office')
    expect(drawerIsOpen(container), 'the drawer started open').toBe(false)

    fireEvent.click(dashboardTab(container))

    expect(drawerIsOpen(container), 'the Dashboard tab opened the drawer; it must navigate').toBe(false)
    expect(pathOf(container), 'the Dashboard tab did not navigate').not.toBe('/location/Office')
  })

  it('clears the drawer-selected scope on the way', () => {
    /* NEW, 2026-11-04, and it is the half of "home" that a route change does
       not do. The drawer-selected location is the THIRD of useAlertScope()'s
       three narrowings; landing on your own top level while still narrowed to
       one location inside it is the page contradicting its own title. The
       house called clearSelectedScope() and nothing ever asserted it.

       *** THIS REVERSES THE 2026-06-15 RULE for this one button, and
       scopePersistsAcrossTabs / drawerLocationHighlight still state the old
       one. Flagged in TabBar.jsx for the owner, with the one-line revert. */
    const { container } = mountAt('/location/Office', 'wint-admin')

    const sys = exposedCtx.visibleSystems[0]
    /* act(), so the ContextProbe above re-renders and `exposedCtx` is the
       state AFTER the set rather than the snapshot it was captured at. Same
       mechanism, same reason, as scopePersistsAcrossTabs' pickFirstSystem. */
    act(() => {
      exposedCtx.setSelectedScope({
        id: 'test-scope',
        name: 'Test Scope',
        levelType: 'l4',
        ancestors: [],
        systems: [sys],
        systemIds: [sys.id],
      })
    })
    expect(exposedCtx.selectedScope?.name).toBe('Test Scope')

    fireEvent.click(dashboardTab(container))

    expect(
      exposedCtx.selectedScope,
      'the Dashboard tab left the app narrowed to a location it did not navigate to',
    ).toBeFalsy()
  })

  it('an unnarrowed user goes to the all-accounts level', () => {
    // wint-admin's systemFilter is () => true, so "the upper level he has" is
    // every account there is. Asserted as a property of the persona, not as
    // the string "/": if the fixture ever narrows him, this moves with it.
    expect(visibleFor('wint-admin').length).toBe(SYSTEMS.length)

    const { container } = mountAt('/location/Office', 'wint-admin')
    fireEvent.click(dashboardTab(container))

    expect(pathOf(container)).toBe('/')
    expect(scopeReadout(container)).toContain('All Accounts')
  })

  it('a single-location user goes to that location, not above it', () => {
    // Dana holds one site inside Office, which holds eleven. Sending her to
    // Office would title the page with a scope she owns a fraction of.
    const seen = visibleFor('location-manager')
    const sites = [...new Set(seen.map((s) => s.l4Name).filter(Boolean))]
    expect(seen.length, 'fixture no longer gives this persona systems').toBeGreaterThan(1)
    expect(sites, 'fixture no longer gives this persona exactly one site').toHaveLength(1)

    const { container } = mountAt('/', 'location-manager')
    fireEvent.click(dashboardTab(container))

    expect(pathOf(container)).toBe(`/location/${encodeURIComponent(sites[0])}`)
    expect(scopeReadout(container)).toContain(sites[0])
  })

  it('a single-system user goes to that system', () => {
    // Sofia's one apartment sits in a building with nine she cannot see, so
    // the deepest level she shares with anyone is not hers. The system is.
    // This is also the one persona whose Dashboard tab already behaved this
    // way before the move, which is why it is unchanged by it.
    const seen = visibleFor('tenant-1apt')
    expect(seen, 'fixture no longer gives this persona exactly one system').toHaveLength(1)

    const { container, getByTestId } = mountAt('/', 'tenant-1apt')
    fireEvent.click(dashboardTab(container))

    expect(getByTestId('system-route')).toBeTruthy()
    expect(pathOf(container)).toBe(`/system/${seen[0].id}`)
  })
})

describe('Dashboard header bar — the drawer, and what the old bar did', () => {
  it('"Switch location" is on exactly one element and it opens the drawer', () => {
    /* THE ONLY DOOR on this screen. It was the scope pill until the evening of
       2026-11-04; the owner then said, on a screenshot of that pill, "remove
       this and the arrow - only the icon open the nav bar", so the name moved
       to the icon with the door.

       THE COUNT IS THE POINT, not just the presence. drawerLocationHighlight,
       drawerNestedLocationHighlight and scopePersistsThroughDrawer all open
       the drawer by this literal string, and two of them take the LAST match
       of a querySelectorAll. A second element wearing the name would hand them
       a different control without failing anything - which is how a contract
       name rots quietly. So: exactly one, and clicking it opens the drawer.
       This name has been broken and restored three times in one day. */
    const { container } = mountAt('/', 'wint-admin')

    const doors = container.querySelectorAll('[aria-label="Switch location"]')
    expect(
      doors.length,
      'the accessible name the drawer suites navigate by is not on exactly one control',
    ).toBe(1)
    expect(doors[0].getAttribute('data-name')).toBe('app-nav')
    expect(drawer(container), 'no drawer mounted on the Dashboard').toBeTruthy()
    expect(drawerIsOpen(container)).toBe(false)

    fireEvent.click(doors[0])

    expect(drawerIsOpen(container), 'nothing on the Dashboard opens the drawer').toBe(true)
  })

  it('the title reads the scope out and is genuinely inert', () => {
    /* Owner, 2026-11-04: "remove this and the arrow - only the icon open the
       nav bar", and, still standing from the same conversation: "We still have
       title that shows what selected - for example, 'All accounts', specific
       location, specific system."

       SO BOTH HALVES ARE PINNED. The NAME must still be there and must still
       track the route - that is the half the owner kept. And the control must
       be GONE: not styled flat, actually inert. A scope name that still
       answers a tap is the worst outcome here, because it looks settled and
       behaves like the thing he removed. Checked structurally rather than by
       firing a click, because "nothing happened" is also what a broken handler
       looks like. */
    const { container } = mountAt('/', 'wint-admin')
    expect(scopeReadout(container)).toContain('All Accounts')

    const title = container.querySelector('[data-name="app-scope"]')
    expect(title.tagName).toBe('P')
    expect(title.getAttribute('role')).toBeNull()
    expect(title.getAttribute('tabindex')).toBeNull()
    expect(title.getAttribute('aria-haspopup')).toBeNull()
    expect(title.getAttribute('aria-label')).toBeNull()
    expect(title.closest('button'), 'the readout is still inside a button').toBeNull()
    expect(title.className, 'the chassis the owner removed').not.toMatch(/border-slate-300/)
    expect(title.className).not.toMatch(/rounded-\[14px\]/)
    expect(title.className, 'it still presents as pressable').not.toMatch(/cursor-pointer/)
    expect(
      container.querySelector('[data-name="app-header-bar"] svg.lucide-chevron-down'),
      'the chevron the owner removed by name',
    ).toBeNull()

    cleanup()
    const scoped = mountAt('/location/Office', 'wint-admin').container
    expect(scopeReadout(scoped)).toContain('Office')
  })

  it('back is drawn on a location and not on the unscoped Dashboard', () => {
    // MobileHeaderBar's one conditional control, carried across the swap, and
    // the only thing in the leading slot now.
    const { container } = mountAt('/', 'wint-admin')
    expect(byLabel(container, 'Back to all accounts')).toBeNull()

    cleanup()
    const scoped = mountAt('/location/Office', 'wint-admin').container
    const back = byLabel(scoped, 'Back to all accounts')
    expect(back, 'a location can no longer get back to all accounts').toBeTruthy()

    fireEvent.click(back)
    expect(pathOf(scoped)).toBe('/')
  })

  it('back is still a bare glyph, now that there is no disc beside it', () => {
    /* Owner, against Figma 199922:83762: "The back arrow doesn't look like in
       Figma ... It needs to be less highlighted." That node is named `Icon`
       and holds one arrow-left SVG - no disc, no fill, no border. It first
       shipped copying the house's 40px bg-card disc, which is the
       over-highlight he objected to.

       THIS USED TO PIN BOTH HALVES of an asymmetry - back bare, house
       disced. The house is deleted, so the second half is now its absence,
       and the first half matters MORE rather than less: with nothing left to
       recede against, the obvious "fix" is to give back the disc the owner
       rejected by name. The tap target is pinned with it, because "less
       highlighted" must not become "harder to hit". */
    const { container } = mountAt('/location/Office', 'wint-admin')

    const back = byLabel(container, 'Back to all accounts')
    expect(back.className).not.toMatch(/bg-card/)
    expect(back.className).not.toMatch(/rounded-\[20px\]/)
    expect(back.className).toMatch(/size-\[40px\]/)

    expect(house(container), 'the disced house is back beside it').toBeNull()
  })

  it('draws no avatar, and is the pill plus the nav control', () => {
    /* Owner, 2026-11-04: "remove avatar from the header - footer is enough",
       and then "I want to completely remove the home icon". This assertion
       used to be "the avatar still opens /account", then "house + pill", then
       "exactly the pill"; its subjects keep moving to TabBar rather than
       disappearing, and it is re-aimed each time rather than deleted so the
       bar's contents stay pinned in BOTH directions: nothing removed may come
       back, and what remains must not go with them.

       RE-AIMED AGAIN THE SAME EVENING, and this time the bar GREW. The owner's
       Dashboard restructure frame (199954:96275) puts a 40x40 button back at
       the bar's right edge: "I want to replace the home icon with kind of icon
       from the design system and shadcn [that] explain[s] it's open and
       navigation." So the count goes 1 -> 2 on `/` and 2 -> 3 on a location.

       THE HOUSE ASSERTION IS NOT RELAXED FOR IT. `house()` looks for
       data-name="app-home" and must still find nothing: the new control is a
       drawer door, not the home button, and the home BEHAVIOUR is still the
       Dashboard tab's (its own describe above). A frame that still draws a
       house glyph in that slot is exactly what the owner asked to replace.

       THE DOORS TO /account AND TO HOME ARE NOT TESTED HERE ANY MORE. Both
       are the tab bar's, and asserting them from this file would pin someone
       else's component through a page that no longer owns the behaviour.
       Home has its own describe above, through the tab; Profile was checked
       in the running app before the avatar came out. */
    const { container } = mountAt('/', 'wint-admin')

    const bar = container.querySelector('[data-name="app-header-bar"]')
    expect(bar).toBeTruthy()
    expect(container.querySelector('[data-name="app-avatar"]')).toBeNull()
    expect(
      bar.querySelector('img'),
      'the header still draws a portrait',
    ).toBeNull()

    // What is on the Dashboard, and nothing else: the pill and the nav control.
    expect(house(container)).toBeNull()
    expect(byLabel(container, 'Switch location')).toBeTruthy()
    expect(bar.querySelector('[data-name="app-nav"]')).toBeTruthy()
    expect(bar.children).toHaveLength(2)

    // And on a location, back joins them — three, never four.
    cleanup()
    const scoped = mountAt('/location/Office', 'wint-admin').container
    expect(scoped.querySelector('[data-name="app-header-bar"]').children).toHaveLength(3)
  })

  it('the nav control is a panel glyph, not a house', () => {
    /* Figma 199954:96276 draws a 40x40 button at the bar's right edge with a
       HOUSE in it. The owner asked for that glyph to be replaced: "I want to
       replace the home icon with kind of icon from the design system and
       shadcn [that] explain[s] it's open and navigation."

       WHAT IS PINNED, and why by class rather than by shape:
        · it is not the house coming back. `house()` looks for the old
          data-name; the home BEHAVIOUR is the Dashboard tab's and has its own
          describe above.
        · it is not `Menu` either. The footer's More tab draws that glyph, and
          two destinations behind one mark is worse than an imperfect mark.
        · lucide stamps its own name onto the <svg> class, so the glyph is
          checkable without asserting path data.
       PanelLeft is shadcn's SidebarTrigger icon and WintSidebarV2 is a left
       sidebar (inset-y-0 left-0, translateX(-100%)), so the family is right.
       If a later ruling picks PanelLeftOpen this assertion is the one line to
       re-aim; what must not pass is a house or a burger. */
    const { container } = mountAt('/', 'wint-admin')

    const nav = container.querySelector('[data-name="app-nav"]')
    expect(nav, 'the frame\'s trailing control is not drawn').toBeTruthy()
    expect(house(container), 'the house is back in the trailing slot').toBeNull()

    const glyph = nav.querySelector('svg')
    expect(glyph).toBeTruthy()
    expect(glyph.getAttribute('class')).toMatch(/lucide-panel-left/)
    expect(glyph.getAttribute('class'), 'the More tab already owns this glyph')
      .not.toMatch(/lucide-menu\b/)
  })
})
