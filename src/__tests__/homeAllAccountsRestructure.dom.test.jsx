// @vitest-environment happy-dom
//
// HomeAllAccounts after the 2026-11-07 restructure — node 200013:93089.
//
// Three things changed shape on this page and all three are invisible to a
// pixel check, which is why they are pinned here:
//
//   1. THE COLLAPSING HEADER IS DELETED. The rAF driver, `--hdr-t`, the
//      clip-path band and the whole chrome block went with it. What is left
//      is an ordinary static bar over one scroller.
//   2. THE TAB ROW BECAME A MENU. Same three ids, same three destinations,
//      a different control. A page that lost the menu without losing the row
//      would look identical and have no way to reach Systems at all.
//   3. SYSTEM HEALTH MOVED INTO THE HERO CARD. It is the white body under
//      the coloured top, not a separate card. The owner's standing no-bar
//      rule has to survive that move, and the whole widget inventory has to
//      survive it too — the frame draws five blocks and this page carries
//      nine, which is Rule 0's business and not the frame's.
//
// ⚠ THE WIDGET INVENTORY BLOCK AT THE BOTTOM IS THE RULE 0 ALARM. The owner's
//   instruction for this node was "keep wht we have now"; 200013:93089 draws
//   neither the valve widget nor the insights card nor the systems table, and
//   a future pass that "matches the frame" would delete all three. That is the
//   failure .claude/skills/v2-page-parity exists for. Do not relax it.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import { UserProvider } from '@/context/UserContext'
import { MORE_MENU_IDS, MORE_MENU_ROW_MIN_HEIGHT } from '@/v2/components/moreMenuModel'

beforeEach(() => {
  localStorage.clear()
  cleanup()
})
afterEach(cleanup)

/* The :locationName route has to be DECLARED, not just visited — rendering
   the page bare under a MemoryRouter leaves useParams() empty, so every path
   reads as the root scope and a scoping assertion passes vacuously. */
function mountAt(path = '/', personaId = null) {
  if (personaId) localStorage.setItem('pulse2-persona-id', personaId)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <UserProvider>
        <Routes>
          <Route path="/" element={<HomeAllAccounts />} />
          <Route path="/location/:locationName" element={<HomeAllAccounts />} />
        </Routes>
      </UserProvider>
    </MemoryRouter>,
  )
}

const q = (c, s) => c.querySelector(s)
const badge = (c) => q(c, '[data-name="app-more"]')
const openMenu = (c) => fireEvent.click(badge(c))
const menuCard = (c) => q(c, '[data-name="more-menu-card"]')
const rows = (c) => [...c.querySelectorAll('[data-name="more-menu-item"]')]

// ── 1 · The collapsing header is gone ───────────────────────────────────────

describe('the collapsing header this page owned is deleted', () => {
  it('mounts no hero window, no pinned tab row and no band', () => {
    const { container } = mountAt('/')
    /* Each of these was a `data-name` the collapse hung on. They are asserted
       by name rather than by behaviour because the behaviour was a scroll
       handler, and a handler that no longer runs leaves no trace to query. */
    expect(q(container, '[data-name="hero-window"]'), 'the hero window is back').toBeNull()
    expect(q(container, '[data-name="hero-collapse"]'), 'the collapse wrapper is back').toBeNull()
    expect(q(container, '[data-name="home-tabs"]'), 'the pinned tab row is back').toBeNull()
    expect(q(container, '[data-name="hero-band"]'), 'the full-bleed band is back').toBeNull()
  })

  it('writes no --hdr-t and no transform built on one', () => {
    const { container } = mountAt('/')
    const withVar = [...container.querySelectorAll('[style]')].filter((el) =>
      (el.getAttribute('style') || '').includes('--hdr-t'),
    )
    expect(withVar, 'something still animates off --hdr-t').toHaveLength(0)
  })

  it('still has exactly one scroller, and it reserves no collapse distance', () => {
    const { container } = mountAt('/')
    /* The drawer is excluded, and that is not an exception to the rule:
       WintSidebarV2 carries a scroller of its own for its location list, it
       is role="dialog", and it stays MOUNTED while closed so the slide has
       something to animate. Same exclusion valveWidgetMount:585 makes. */
    const scrollers = [...container.querySelectorAll('[style]')].filter(
      (el) => el.style?.overflowY === 'auto' && !el.closest('[role="dialog"]'),
    )
    expect(scrollers.length, 'the app shell wants exactly one scroll container').toBe(1)
    const style = scrollers[0].getAttribute('style')
    /* NEITHER PADDING BELONGS HERE ANY MORE.

       The paddingTop was the collapse distance and never came back.

       The paddingBottom was the floating pill's 93px clearance, and this
       assertion used to REQUIRE it. It is required to be ABSENT now
       (2026-11-08): TabBar's host reserves TAB_BAR_CLEARANCE of real column
       itself, because bottom padding only governed where the END of the list
       came to rest and rows at intermediate scroll offsets still sat under
       the opaque pill, untappable - the owner, on /location/Office: "I can't
       click any water events from location. It just doesn't click." Paying
       it here as well would reserve the strip twice, ~186px of dead space.
       tabBarFloatingClearance.dom.test.jsx carries the whole contract. */
    expect(
      style,
      'the scroller pays the pill clearance again. The bar reserves it now '
      + '(TabBar HOST is h-[93px]), so this would double it.',
    ).not.toMatch(/padding-bottom:\s*93px/)
    expect(style, 'the collapse padding is back on the scroller').not.toMatch(/padding-top/)
  })
})

// ── 2 · The tab row became the More menu ────────────────────────────────────

describe('the More menu replaced the tab row', () => {
  it('draws no tablist anywhere on the page', () => {
    const { container } = mountAt('/')
    expect(container.querySelectorAll('[role="tablist"]')).toHaveLength(0)
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(0)
  })

  it('renders nothing of the menu until the badge is pressed', () => {
    const { container } = mountAt('/')
    expect(badge(container), 'no More badge — the page passes no onOpenMore').toBeTruthy()
    expect(badge(container).getAttribute('aria-expanded')).toBe('false')
    expect(menuCard(container), 'the menu is in the DOM while shut').toBeNull()

    openMenu(container)

    expect(menuCard(container)).toBeTruthy()
    expect(badge(container).getAttribute('aria-expanded')).toBe('true')
  })

  it('carries the three destinations under their original ids', () => {
    const { container } = mountAt('/')
    openMenu(container)
    expect(rows(container).map((r) => r.getAttribute('data-menu-item'))).toEqual([
      MORE_MENU_IDS.overview,
      MORE_MENU_IDS.systems,
      MORE_MENU_IDS.general,
    ])
  })

  it('ties the badge and the menu together in BOTH directions', () => {
    /* `labelledBy` is load-bearing beyond labelling: MoreMenu reads
       getElementById(labelledBy) to measure the real badge at open time and to
       hand focus back on close. AppHeaderBar ships no way to set that id, so
       the page stamps it — if the stamp stops landing, the menu silently falls
       back to a hard-coded anchor and loses its focus return. */
    const { container } = mountAt('/')
    const b = badge(container)
    expect(b.id, 'the More badge has no id for the menu to anchor to').toBeTruthy()

    openMenu(container)
    const card = menuCard(container)

    expect(card.id).toBe(badge(container).getAttribute('aria-controls'))
    expect(card.getAttribute('aria-labelledby')).toBe(b.id)
    expect(document.getElementById(b.id), 'the stamped id does not resolve').toBeTruthy()
  })

  it('marks the view you are on, and marks only that one', () => {
    const { container } = mountAt('/')
    openMenu(container)
    const current = rows(container).filter((r) => r.getAttribute('aria-current') === 'true')
    expect(current).toHaveLength(1)
    expect(current[0].getAttribute('data-menu-item')).toBe(MORE_MENU_IDS.overview)
  })

  it('keeps the count off the row’s accessible name but still announces it', () => {
    /* The same rule the tab row's Badge had: folding the number into the name
       once renamed "Systems" to "Systems 103" and broke every lookup. */
    const { container } = mountAt('/')
    openMenu(container)
    const systems = rows(container).find((r) => r.getAttribute('data-menu-item') === 'systems')
    expect(systems.getAttribute('aria-label')).toBe('Systems')
    expect(within(systems).getByLabelText(/^\d+ systems$/)).toBeTruthy()
  })

  it('gives every row Apple’s 44px minimum, in the class string a scanner can see', () => {
    const { container } = mountAt('/')
    openMenu(container)
    for (const r of rows(container)) {
      expect(r.className).toContain(`min-h-[${MORE_MENU_ROW_MIN_HEIGHT}px]`)
    }
  })
})

describe('picking a destination swaps the body, exactly as the tab did', () => {
  const pick = (c, id) => {
    openMenu(c)
    fireEvent.click(q(c, `[data-menu-item="${id}"]`))
  }

  it('Systems shows the table and Overview’s cards go away', () => {
    const { container } = mountAt('/')
    expect(screen.getByText('Water consumption')).toBeTruthy()

    pick(container, 'systems')

    expect(screen.getByRole('columnheader', { name: 'System' })).toBeTruthy()
    expect(screen.queryByText('Water consumption')).toBeNull()
    expect(menuCard(container), 'the menu stayed open over its own result').toBeNull()
  })

  it('Overview is reachable again — the menu is not a one-way door', () => {
    /* The reason `Overview` is a row at all. Closing the menu does not change
       `value`, so with it omitted there would be no control left on this page
       that goes back. See the ruling in moreMenuModel.js. */
    const { container } = mountAt('/')
    pick(container, 'systems')
    expect(screen.queryByText('Water consumption')).toBeNull()

    pick(container, 'overview')
    expect(screen.getByText('Water consumption')).toBeTruthy()
  })

  it('General Info reaches the same placeholder the third tab reached', () => {
    const { container } = mountAt('/')
    pick(container, 'general')
    expect(screen.getByText('No design yet for this tab.')).toBeTruthy()
  })
})

// ── 3 · The hero card ───────────────────────────────────────────────────────

describe('the hero card — 200013:93101', () => {
  it('is one shell carrying the hero on top and System health in the body', () => {
    const { container } = mountAt('/')
    const shell = q(container, '[data-name="hero-card-shell"]')
    expect(shell, 'the page is not using HeroCardShell').toBeTruthy()
    expect(shell.getAttribute('data-hero-body')).toBe('true')

    const colour = q(container, '[data-name="hero-card-colour"]')
    const body = q(container, '[data-name="hero-card-body"]')
    expect(colour, 'no coloured section').toBeTruthy()
    expect(body, 'no white body section').toBeTruthy()

    // The coloured top is the hero's content...
    expect(within(colour).getByText(/systems?$/)).toBeTruthy()
    expect(q(colour, '[data-name="hero-locations"]'), 'the locations eyebrow left the hero').toBeTruthy()
    expect(q(colour, '[data-node-id="199531:80031"]'), 'the system-type chips left the hero').toBeTruthy()
    // ...and the white body is System health.
    expect(within(body).getByText('System health')).toBeTruthy()
  })

  it('paints no artwork of its own — the shell owns the raster', () => {
    /* Two copies of this raster in one stack double the #a0ccff multiply and
       draw a seam at the join. The hero is passed artwork={false}; the shell
       draws exactly one. */
    const { container } = mountAt('/')
    const art = container.querySelectorAll('[data-name="hero-card-colour"] img')
    expect(art.length, 'the wave is drawn twice').toBe(1)
  })

  it('draws no lifecycle "Active" pill', () => {
    /* The owner, on this node: "remove the system 'lifecycle "Active"'". It
       was already gone on 2026-11-04 and this is the assertion that keeps it
       gone — a pill with no state behind it is easy to re-add from an old
       frame. */
    const { container } = mountAt('/')
    const colour = q(container, '[data-name="hero-card-colour"]')
    expect(colour.textContent).not.toMatch(/\bActive\b/)
  })

  it('keeps the locations count — the other half of the same instruction', () => {
    const { container } = mountAt('/')
    const eyebrow = q(container, '[data-name="hero-locations"]')
    expect(eyebrow, 'the locations eyebrow is gone').toBeTruthy()
    expect(eyebrow.textContent).toMatch(/^\d[\d,]*\s+Locations?$/)
  })

  it('is Overview-only — a More pick replaces the body, wave included', () => {
    /* REVERSED 2026-11-08. This case read "stays on screen for every
       destination, not only Overview" and asserted the hero on all three,
       because while it was chrome it WAS common to all three and merging it
       with the health card must not have narrowed it by accident.
       The owner has since ruled the other way: "when user selecting something
       in the more on the header, it needs to be replaced the entire screen
       below. So waves shouldn't appear in all views, only in overview." So
       the assertion is inverted rather than deleted — the hero must be absent
       on Systems and on General Info, and must come back on Overview, which
       is also what proves the pick is not a one-way door for it. */
    const { container } = mountAt('/')
    for (const id of ['systems', 'general']) {
      openMenu(container)
      fireEvent.click(q(container, `[data-menu-item="${id}"]`))
      expect(q(container, '[data-name="hero-card-shell"]'), `the wave is still on ${id}`).toBeNull()
    }
    openMenu(container)
    fireEvent.click(q(container, '[data-menu-item="overview"]'))
    expect(q(container, '[data-name="hero-card-shell"]'), 'hero missing on overview').toBeTruthy()
  })

  /* ── THE TWO HALVES OF THE HEALTH BAR GO TO TWO PLACES — 2026-11-08 ──────
     Owner, on the red half: "When user clicks on X out of Y needs attention,
     it doesn't need to redirect him to the system table. It needs to redirect
     him to the health overlay, like the error overlay, which shows all the
     errors row by row." The green half keeps the 2026-10-22 destination: an
     error overlay opened from "All systems good" would open empty.
     Asserted from the PAGE rather than the card, because the split lives in
     the page's onSelectHealth — SystemHealthCard still raises the same two
     values it always did, and its own suite still pins that. */
  const segment = (c, which) => q(c, `[data-segment="${which}"]`)
  const overlayRows = () => screen.queryAllByRole('button', { name: /Open this system\./ })

  it('the needs-attention segment opens the alerts overlay, not the table', () => {
    const { container } = mountAt('/')
    const red = segment(container, 'attention')
    expect(red, 'no attention segment on a scope with faults').toBeTruthy()

    fireEvent.click(red)

    /* The overlay, with one row per issue — and NOT the systems table, which
       is the destination this control was taken off. */
    expect(overlayRows().length, 'the overlay opened with no rows').toBeGreaterThan(0)
    expect(
      screen.queryByRole('columnheader', { name: 'System' }),
      'the attention segment still lands on the systems table',
    ).toBeNull()
  })

  it('the all-systems-good segment still opens the filtered systems table', () => {
    const { container } = mountAt('/')
    const green = segment(container, 'healthy')
    expect(green, 'no healthy segment on this scope').toBeTruthy()

    fireEvent.click(green)

    expect(screen.getByRole('columnheader', { name: 'System' })).toBeTruthy()
    expect(overlayRows().length, 'the green segment opened the overlay').toBe(0)
  })
})

describe('the no-progress-bar rule survives the move into the hero body', () => {
  /* Owner, 2026-11-04: "When all good, no progress bar. This is the rule you
     need to". The gate is SystemHealthCard's own, but the card has a new
     parent now and a chassis that paints a background behind it, so this is
     re-checked from the page rather than assumed. */
  it('draws the bar and the count on a scope that has faults', () => {
    const { container } = mountAt('/')
    const body = q(container, '[data-name="hero-card-body"]')
    expect(q(body, '[data-name^="Progress Bar"]'), 'no bar on a scope with faults').toBeTruthy()
    expect(body.textContent).toMatch(/\d+\s*\/\s*\d+ need attention/)
  })

  it('draws neither on an all-clear scope', () => {
    /* `tenant-1apt` is Sofia, one apartment, no faults — the persona the
       scope rule narrows hardest. The all-clear green row stands instead. */
    const { container } = mountAt('/', 'tenant-1apt')
    const body = q(container, '[data-name="hero-card-body"]')
    expect(q(body, '[data-name^="Progress Bar"]'), 'the zero-state bar is back').toBeNull()
    expect(body.textContent, 'the zero-state count is back').not.toMatch(/need attention/)
    expect(body.textContent).toMatch(/Show past alerts/)
  })
})

// ── 4 · The header ──────────────────────────────────────────────────────────

describe('the header bar on both scopes', () => {
  it('at the top level: title and the More badge, no back and no eyebrow', () => {
    /* 200013:93099 draws exactly this — a text and a Badge. */
    const { container } = mountAt('/')
    expect(q(container, '[data-name="app-scope"]').textContent).toBe('All Accounts')
    expect(q(container, '[data-name="app-back"]'), 'a back disc with nowhere to go').toBeNull()
    expect(q(container, '[data-name="app-eyebrow"]'), 'an eyebrow with no parent scope').toBeNull()
    expect(badge(container)).toBeTruthy()
  })

  it('on a location: back and the parent scope join it', () => {
    const { container } = mountAt('/location/Office')
    expect(q(container, '[data-name="app-scope"]').textContent).toBe('Office')
    expect(q(container, '[data-name="app-back"]')).toBeTruthy()
    /* The component appends the node's trailing `›`; the page passes the name
       alone, and it names where `onBack` actually goes. */
    expect(q(container, '[data-name="app-eyebrow"]').textContent).toContain('All Accounts')
    expect(badge(container)).toBeTruthy()
  })
})

// ── 5 · Rule 0 · the widget inventory ───────────────────────────────────────

describe('every widget this page carried before the restructure is still here', () => {
  /* 200013:93089 draws five blocks. This page carries nine, and the owner's
     instruction was "keep wht we have now" — so the frame is the layout
     reference for the header and the hero, NOT an inventory. Each entry below
     is a widget the frame does not draw and that must not be deleted for
     "matching the design". */
  const present = (c, label, probe) => {
    expect(probe(c), `${label} is gone from the page`).toBeTruthy()
  }

  it('mounts all of them on Overview', () => {
    const { container } = mountAt('/')
    present(container, 'the hero', (c) => q(c, '[data-name="hero-card-shell"]'))
    present(container, 'System health', (c) => q(c, '[data-name="hero-card-body"]'))
    present(container, 'the triage band', (c) => q(c, '[data-name="IOT overview"]'))
    present(container, 'the valve widget', (c) => q(c, '[data-name="valve-header"]'))
    present(container, 'Water consumption', () => screen.queryByText('Water consumption'))
    present(container, 'Insights', () => screen.queryAllByText(/Insights/).length)
    present(container, 'the TabBar pill', (c) => q(c, '[data-name="tabbar-pill"]'))
    present(container, 'the navigation drawer', (c) => q(c, '[role="dialog"][aria-label="Locations menu"]'))
  })

  it('still reaches the systems table, which the frame does not draw either', () => {
    const { container } = mountAt('/')
    openMenu(container)
    fireEvent.click(q(container, '[data-menu-item="systems"]'))
    expect(screen.getByRole('columnheader', { name: 'System' })).toBeTruthy()
  })

  it('keeps the hero’s type chips tappable, and they still open the table', () => {
    const { container } = mountAt('/')
    const chips = [...container.querySelectorAll('[data-node-id="199531:80031"] button')]
    expect(chips.length, 'the chips went inert inside the card').toBe(3)
    /* The first chip is the one with a non-zero count on this dataset, so it
       navigates on its second tap rather than only explaining. */
    fireEvent.click(chips[0])
    fireEvent.click(chips[0])
    expect(screen.getByRole('columnheader', { name: 'System' })).toBeTruthy()
  })
})
