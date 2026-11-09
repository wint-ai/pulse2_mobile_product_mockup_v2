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
import { StatusBarContext } from '@/components/phoneStatusBar'

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

describe('the hero — 200067:38969, full-bleed', () => {
  /* ── UPDATED 2026-11-09, AND THE REVERSAL IS THE OWNER'S ──────────────────
     This block used to assert the opposite: one shell with System health
     welded on as its white body (200013:93101, 2026-11-07), and a hero inset
     as a rounded card on the page ground. 200067:38969 draws neither. The
     owner looked at the welded, inset version running and said the upper
     screen "is not even similar" to the frame.

     So the two assertions that encoded the weld are inverted here, and the
     bleed is pinned. What did NOT change is everything below: the single
     raster, the absent "Active" pill, the locations count. Those were
     separate instructions and they still hold. */
  it('is a full-bleed hero with NO white body - System health is its own card', () => {
    const { container } = mountAt('/')
    const shell = q(container, '[data-name="hero-card-shell"]')
    expect(shell, 'the page is not using HeroCardShell').toBeTruthy()
    expect(
      shell.getAttribute('data-hero-body'),
      'System health is welded back into the hero',
    ).toBe('false')
    expect(
      q(container, '[data-name="hero-card-body"]'),
      'the white body section is back',
    ).toBeNull()

    const colour = q(container, '[data-name="hero-card-colour"]')
    expect(colour, 'no coloured section').toBeTruthy()
    expect(within(colour).getByText(/systems?$/)).toBeTruthy()
    expect(q(colour, '[data-name="hero-locations"]'), 'the locations eyebrow left the hero').toBeTruthy()
    expect(q(colour, '[data-node-id="199531:80031"]'), 'the system-type chips left the hero').toBeTruthy()

    /* System health still renders - it MOVED, it was not dropped. Rule 0:
       only the seat changed, the contents did not. */
    expect(screen.getByText('System health'), 'System health went missing entirely').toBeTruthy()
    expect(
      q(container, '[data-name="hero-card-shell"]').textContent,
      'System health is still inside the hero',
    ).not.toMatch(/System health/)
  })

  it('cancels the page gutter instead of hardcoding a width', () => {
    /* THE BLEED IS MEASURED IN CLASSES, not pixels, because happy-dom has no
       layout. The three that carry it:
         -mx-4        cancels the gutter, which now lives on the SCROLLER
         w-auto       beats HeroCardShell's own w-full, so stretch can size it
         self-stretch width = content - marginL - marginR, i.e. the full screen
       plus rounded-none over the shell's rounded-[22px].

       ⚠ NO 393 AND NO 402. A literal width here is the bug this asserts
       against: the frame is 402 and the shell is 393. */
    const { container } = mountAt('/')
    const cls = q(container, '[data-name="hero-card-shell"]').className
    expect(cls).toContain('-mx-4')
    expect(cls, 'w-full would beat the stretch and leave a strip of page ground').toContain('w-auto')
    expect(cls).toContain('self-stretch')
    expect(cls, 'a bleeding hero must not keep the card radius').toContain('rounded-none')
    expect(cls, 'a hardcoded screen width').not.toMatch(/w-\[(393|402|370|361)px\]/)
  })

  it('moved the gutter to the scroller, so the bleed creates no sideways scroll', () => {
    /* THE REASON THIS IS PINNED: with `px-4` on the page ROOT, a -mx-4 child
       overhangs the scroller's CONTENT edge, and Chrome computes scrollable
       overflow from the border box and ignores the negative right margin.
       Measured at the frame's 402: scrollWidth 386 vs clientWidth 370 - a
       16px horizontal scroll, invisible because this scroller hides its
       scrollbars. With the padding on the scroller the child reaches only
       into its PADDING box, which `clientWidth` already counts. */
    const { container } = mountAt('/')
    const scroller = [...container.querySelectorAll('[style]')].find(
      (el) => el.style?.overflowY === 'auto' && !el.closest('[role="dialog"]'),
    )
    expect(scroller, 'the scroller is gone').toBeTruthy()
    expect(scroller.className, 'the gutter left the scroller and the bleed will clip').toContain('px-4')

    const root = container.firstElementChild
    expect(
      root.className,
      'the root took the gutter back; a bleeding child now overhangs the content edge',
    ).not.toMatch(/(?:^|\s)px-4(?:\s|$)/)
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

/* SystemHealthCard's own root, found by its CARD class string rather than by
   a data-name it does not carry. It used to be reachable as the hero's
   `hero-card-body`; since 2026-11-09 it is a sibling card of its own, so the
   three assertions below say WHERE they look as well as what they expect. */
const healthCardIn = (c) =>
  [...c.querySelectorAll('div')].find(
    (el) => /gap-\[15px\]/.test(el.className) && /pt-\[12px\]/.test(el.className),
  ) ?? null

describe('the no-progress-bar rule survives System health leaving the hero', () => {
  /* Owner, 2026-11-04: "When all good, no progress bar. This is the rule you
     need to". The gate is SystemHealthCard's own, but the card has changed
     parent twice now - into the hero body on 11-07, back out to a standalone
     card on 11-09 - so this is re-checked from the page rather than assumed. */
  it('draws the bar and the count on a scope that has faults', () => {
    const { container } = mountAt('/')
    const body = healthCardIn(container)
    expect(body, 'the System health card is gone from the page').toBeTruthy()
    expect(q(body, '[data-name^="Progress Bar"]'), 'no bar on a scope with faults').toBeTruthy()
    expect(body.textContent).toMatch(/\d+\s*\/\s*\d+ need attention/)
  })

  it('draws neither on an all-clear scope', () => {
    /* `tenant-1apt` is Sofia, one apartment, no faults — the persona the
       scope rule narrows hardest. The all-clear green row stands instead. */
    const { container } = mountAt('/', 'tenant-1apt')
    const body = healthCardIn(container)
    expect(body, 'the System health card is gone from the page').toBeTruthy()
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
    present(container, 'System health', (c) => healthCardIn(c))
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

/* ── THE HEADER MOVED ONTO THE HERO — 200067:38981, 2026-11-09 ─────────────
   200067:38969 paints the bar ON the hero artwork and tints it rather than
   filling it: a #9dbbd9 veil under `mix-blend-multiply`, white title ink.
   That is AppHeaderBar's `onColor` surface plus `surfaceTint`.

   THREE OF THESE FOUR ARE INVISIBLE TO A PIXEL CHECK, which is the only
   reason they are worth a test:

     1. DOM ORDER. HeroWaveArt is `absolute`; a bar inserted as the hero
        shell's FIRST child is painted over by the raster and renders
        completely invisible. It has to land after the art, i.e. inside
        `children`. A screenshot of the broken version looks like "no header"
        and a screenshot of the fixed one looks like "header" - but nothing
        in between tells you WHY, so the seat is pinned here.
     2. `px-0` MUST NOT REACH THE HERO SEAT. `onColor` is a chip surface and
        AppHeaderBar merges `className` AFTER its own
        `rounded-full px-[8px]`, so a `px-0` from this page wins through
        tailwind-merge and silently flattens the chip's padding to zero.
        Nothing throws; the veil just closes on the glyphs.
     3. THE GROUND SEAT STILL EXISTS. `heroCard` is overview-only, so Systems
        and General Info have no artwork to tint. Losing the bar there would
        leave them with no title, no Back and no More at all - the silent
        removal Rule 0 forbids - and it would look fine on the one view the
        frame draws. */
describe('the header bar - two seats, one definition', () => {
  const bar = (c) => q(c, '[data-name="app-header-bar"]')

  it('seats the bar INSIDE the hero card on Overview, after the artwork', () => {
    const { container } = mountAt('/')
    const seat = q(container, '[data-name="home-hero-header"]')
    expect(seat, 'the bar is not in the hero card').toBeTruthy()

    const shell = q(container, '[data-name="hero-card-shell"]')
    expect(shell.contains(seat), 'the bar is outside the hero shell').toBe(true)

    /* AFTER the raster, not before it. HeroWaveArt renders an <img> inside
       the coloured section; a bar that precedes it is invisible. */
    const art = shell.querySelector('img')
    expect(art, 'no hero artwork to sit on').toBeTruthy()
    expect(
      art.compareDocumentPosition(seat) & Node.DOCUMENT_POSITION_FOLLOWING,
      'the bar comes BEFORE the artwork and will render invisible',
    ).toBeTruthy()
  })

  it('asks for the on-colour surface and the node’s own tint', () => {
    const { container } = mountAt('/')
    const b = bar(container)
    expect(b.getAttribute('data-surface')).toBe('onColor')
    const veil = q(container, '[data-name="app-header-veil"]')
    expect(veil, 'no veil - surfaceTint never reached the bar').toBeTruthy()
    /* An INLINE style, never a utility: #9dbbd9 is not registered in
       @theme inline, and in Tailwind v4 a utility naming an unregistered
       colour emits no CSS and no error. */
    expect(veil.getAttribute('style')).toMatch(/background-color:\s*(#9dbbd9|rgb\(157,\s*187,\s*217\))/i)
  })

  it('does NOT pass px-0 on the hero seat, so the chip keeps its 8px', () => {
    const { container } = mountAt('/')
    const cls = bar(container).className
    expect(cls, 'px-0 is back and tailwind-merge has eaten the chip padding').not.toMatch(/\bpx-0\b/)
    expect(cls, 'the chip padding is gone').toMatch(/px-\[8px\]/)
  })

  it('keeps the ground seat - and its px-0 - on the views with no hero', () => {
    for (const dest of [MORE_MENU_IDS.systems, MORE_MENU_IDS.general]) {
      cleanup()
      const { container } = mountAt('/')
      openMenu(container)
      fireEvent.click(q(container, `[data-menu-item="${dest}"]`))

      expect(
        q(container, '[data-name="home-hero-header"]'),
        `${dest} has no hero, so the bar must not claim the hero seat`,
      ).toBeNull()
      const chrome = q(container, '[data-name="home-header"]')
      expect(chrome, `${dest} lost its header bar entirely`).toBeTruthy()

      const b = bar(container)
      expect(b, `${dest} has no header bar`).toBeTruthy()
      expect(b.getAttribute('data-surface'), `${dest} tints a hero it does not have`).toBe('ground')
      expect(b.className).toMatch(/\bpx-0\b/)
      expect(
        q(container, '[data-name="app-header-veil"]'),
        `${dest} paints a multiply veil against the bare page ground`,
      ).toBeNull()
    }
  })

  it('keeps the More badge resolvable by id from EITHER seat', () => {
    /* MoreMenu finds the badge with getElementById, not a ref, which is the
       whole reason two seats are safe. If the id stopped resolving the menu
       would still open and would anchor to the top-left corner. */
    const { container } = mountAt('/')
    const onHero = q(container, '[data-name="app-more"]')
    expect(onHero.id, 'the badge lost its id on the hero seat').toBeTruthy()
    expect(document.getElementById(onHero.id)).toBeTruthy()

    openMenu(container)
    fireEvent.click(q(container, `[data-menu-item="${MORE_MENU_IDS.systems}"]`))
    const onGround = q(container, '[data-name="app-more"]')
    expect(onGround, 'the badge went missing on the ground seat').toBeTruthy()
    expect(onGround.id, 'the id changed between seats').toBe(onHero.id)
    expect(document.getElementById(onGround.id)).toBeTruthy()
  })

  /* NO SCROLLER-COUNT TEST HERE, deliberately. The bar joined the scroller's
     subtree on Overview, so "still exactly one scroller, still no
     paddingBottom" does need to hold - but the suite above already asserts it
     at `still has exactly one scroller, and it reserves no collapse distance`,
     mounting the same '/' through the same helper. A second copy with a
     looser selector (one that forgets the drawer's own `role="dialog"`
     scroller) does not strengthen the guarantee, it just fails differently. */
})

/* ── THE STATUS BAND BLEEDS INTO THE HERO — 200067:38971, 2026-11-09 ────────
   The shell can now drop its 44px status seat so a route paints behind the
   clock and battery (src/components/phoneStatusBar.js). Home opts in, because
   200067:38969 runs the artwork under that band and paints its glyphs white.

   WHAT IS PINNED HERE IS THE PAGE'S HALF: the 44px it has to pay back. The
   shell cannot do it - only the page knows which of its children should not
   bleed - and getting it wrong puts the clock on top of the header chip,
/* ── THE STATUS BAND BLEEDS INTO THE HERO — 200067:38971, 2026-11-09 ────────
   The shell drops its 44px status seat so a route paints behind the clock and
   battery (src/components/phoneStatusBar.js). Home opts in, because
   200067:38969 runs the artwork under that band and paints its glyphs white.

   WHAT IS PINNED HERE IS THE PAGE'S HALF: the 44px it has to pay back. Get it
   wrong and the clock lands on top of the header chip.

   ⚠ REWRITTEN once the shell started reporting `inset`. These drove
   `window.innerWidth` + a resize event, because the page carried its own copy
   of Phone's `innerWidth <= 500 || mobile UA` predicate and that was the only
   way to move it. The predicate is deleted; the shell answers through
   StatusBarContext now, so these drive the CONTEXT, which is the real
   contract and does not depend on a viewport the test cannot really change. */
describe('the status-band inset', () => {
  const seat = (c) => q(c, '[data-name="home-hero-header"]')

  /* The band as the shell reports it. `bandHeight: 44` is the desktop bezel,
     0 is MobileLayout, which draws none. `set` is a no-op: what the page puts
     INTO the context is Phone's business and is tested there; what this file
     cares about is what the page does with what comes back. */
  const mountWithBand = (bandHeight) =>
    render(
      <StatusBarContext.Provider value={{ set: () => {}, bandHeight }}>
        <MemoryRouter initialEntries={['/']}>
          <UserProvider>
            <Routes>
              <Route path="/" element={<HomeAllAccounts />} />
            </Routes>
          </UserProvider>
        </MemoryRouter>
      </StatusBarContext.Provider>,
    )

  it('pays the band back where one is drawn, and only the node gap where none is', () => {
    /* THE 11 IS THE NODE'S: 200067:38971 is the StatusBar frame at y=0 and is
       48 tall; the content frame 200067:38980 starts at y=59, so 59-48 = 11.
       THE 44 IS THE SHELL'S and is no longer spelled in the page - the
       expression is `inset + 11`, and `inset` already folds in both the shell
       path and whether this screen asked to bleed. */
    const { container } = mountWithBand(44)
    expect(seat(container).style.paddingTop, 'the band was not paid back').toBe('55px')

    cleanup()
    /* MobileLayout draws no band, so nothing overlays the top and paying 44px
       back there would open a band of empty blue above the chip on the primary
       target. */
    const { container: mobile } = mountWithBand(0)
    expect(seat(mobile).style.paddingTop, 'a band was cleared that is not drawn').toBe('11px')
  })

  it('spells the inset as a style, because a utility could not survive it', () => {
    /* `pt-[${n}px]` would emit NO CSS: Tailwind scans source text and cannot
       see a runtime number - the same silent-failure class as a colour utility
       naming an unregistered colour. The horizontal 16 stays a class because
       it is constant. */
    const { container } = mountWithBand(44)
    const el = seat(container)
    expect(el.className, 'the constant gutter stopped being a class').toContain('px-[16px]')
    expect(el.className, 'a computed padding leaked into the class string').not.toMatch(/pt-\[/)
    expect(el.style.paddingTop).toBeTruthy()
  })

  it('asks for no bleed on the views with no hero behind the glyphs', () => {
    /* `--ink-on-color` is WHITE. Systems and General Info render no hero, so a
       bleeding band there would be the plain page ground with white glyphs on
       it - invisible. The page gates the bleed on `overview`; what this file
       can see is the consequence, that neither view has a hero seat at all. */
    for (const dest of [MORE_MENU_IDS.systems, MORE_MENU_IDS.general]) {
      cleanup()
      const { container } = mountAt('/')
      openMenu(container)
      fireEvent.click(q(container, `[data-menu-item="${dest}"]`))
      expect(seat(container), `${dest} grew a hero header seat`).toBeNull()
      expect(q(container, '[data-name="hero-card-shell"]'), `${dest} grew a hero`).toBeNull()
    }
  })
})
