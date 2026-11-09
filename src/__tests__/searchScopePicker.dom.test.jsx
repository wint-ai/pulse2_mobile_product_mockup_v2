// @vitest-environment happy-dom
//
// /search — src/v2/pages/SearchScreen.jsx, the full-screen scope picker
// (Figma 200047:135517 "Search").
//
// WHAT THIS PINS, and every item is a way the screen could ship looking right
// and being wrong:
//
//  1. THE ROUTE IS EXACTLY `/search`. The tab bar is pointed at that literal
//     path, so the spelling is a contract between two files. Checked on the
//     route table, because a component test cannot see a route that does not
//     exist. `/search/` and `/scope` must NOT resolve to this screen.
//  2. PICKING A ROW REALLY SETS THE SCOPE. This is the failure mode the
//     v2-page-parity skill exists to prevent - "anything interactive in the
//     design is a static picture until you wire it". The scope is read back
//     out of UserContext, not inferred from the DOM, and the route is checked
//     too: this app reads scope in BOTH places (v1 screens and the drawer
//     highlight off context, v2 pages off :locationName), so a picker that
//     writes only one of them is half-wired.
//  3. ALL THREE PER-ROW CONTROLS ARE LIVE. Row body, star and count badge are
//     separate affordances in the frame; the badge must expand WITHOUT
//     navigating, and the star must toggle WITHOUT navigating. The two stray
//     clicks that version would cause are exactly what `e.stopPropagation()`
//     in those handlers is for.
//  4. "ALL ACCOUNTS" CLEARS rather than sets. In this app all-accounts is the
//     ABSENCE of a scope, so the row that the frame draws SELECTED must write
//     null and go to `/`, not invent a scope object named "All accounts".
//  5. THE SHELL CONTRACT. No viewport height, exactly one scroll body, TabBar
//     mounted with activeTab="search", and NO second helping of
//     TAB_BAR_CLEARANCE - the bar's host has reserved that strip itself since
//     b3f5a31 and a screen that pays it again leaves ~186px of dead space.
//  6. THE COUNT IS BOUND TO DATA. The frame says "Search 122 systems"; 122 is
//     mock. If the placeholder ever hardcodes it, the screen lies on every
//     dataset but the designer's.
//
// happy-dom has no layout engine, so nothing here measures pixels - the
// browser is where the geometry and the right-edge overflow were measured.
// What is pinned here is the behaviour that can regress silently.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { readFileSync } from 'node:fs'

import SearchScreen from '@/v2/pages/SearchScreen'
import { UserProvider, useUserContext } from '@/context/UserContext'
import { TAB_BAR_CLEARANCE } from '@/components/tabBarMetrics'

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks() })

/* ⚠ EVERY REGEX BELOW SPELLS A TAG AS `[<]Name`, NOT `<Name`, AND THAT IS
   LOAD-BEARING. scripts/check-jsx-refs.mjs scans source text for `<Capital`
   and demands an import for whatever it finds - it cannot tell a JSX tag from
   a tag quoted inside a regex, so `/<TabBar/` in an assertion made the gate
   report five undefined components in this test file. The character class
   matches the same text and puts a `]` between the `<` and the letter. */
const SOURCE = readFileSync('src/v2/pages/SearchScreen.jsx', 'utf8')
const APP_SOURCE = readFileSync('src/App.jsx', 'utf8')

/** Block, line and JSX comments out, so prose about a pattern is not code. */
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')

/* A probe mounted beside the screen. The scope lives in React state, not in
   localStorage, so the only honest way to assert "the scope really changed" is
   to read it back out of the same context the app reads. The route comes from
   the same probe so both halves of a selection are observed together.
 *
 * IT RENDERS WHAT IT SAW rather than assigning to a module variable: this
 * repo's eslint config runs react-hooks/globals, which rejects a component
 * writing to module scope (`seen cannot be reassigned`). Serialising into a
 * data attribute is also closer to what the app does - the scope has to reach
 * the DOM to be worth anything. */
function Probe() {
  const { selectedScope } = useUserContext()
  const { pathname } = useLocation()
  return (
    <i
      data-probe="1"
      data-path={pathname}
      data-scope={selectedScope ? JSON.stringify(selectedScope) : ''}
    />
  )
}

/** What the probe last rendered: the live scope object and the live route. */
function seen() {
  const el = document.querySelector('[data-probe]')
  if (!el) return { scope: undefined, path: undefined }
  const raw = el.getAttribute('data-scope')
  return { scope: raw ? JSON.parse(raw) : null, path: el.getAttribute('data-path') }
}

/* A PERSONA IS REQUIRED, and that is not test scaffolding - UserContext
   derives `visibleSystems` from it, so without one `exploreSystems` is empty
   and the tree builds down to the bare account rows with no location under
   them. `wint-admin` is the persona every drawer test in this repo uses, and
   it is the widest scope, which is what a picker has to be exercised against. */
function renderScreen(personaId = 'wint-admin') {
  localStorage.setItem('pulse2-persona-id', personaId)
  return render(
    <MemoryRouter initialEntries={['/search']}>
      <UserProvider>
        <Routes>
          <Route path="/search" element={<><SearchScreen /><Probe /></>} />
          {/* Stand-ins for the real destinations - this test is about what the
              picker DOES, not about what the dashboard renders. */}
          <Route path="/" element={<Probe />} />
          <Route path="/location/:locationName" element={<Probe />} />
          <Route path="/system/:systemId" element={<Probe />} />
        </Routes>
      </UserProvider>
    </MemoryRouter>,
  )
}

/** Every tree row currently on screen, in document order. */
const rows = () => [...document.querySelectorAll('[data-scope-row]')]

/** The first row that is a real location (has a star), i.e. not an account. */
function firstLocationRow() {
  for (const row of rows()) {
    if (within(row).queryByRole('button', { name: /^Pin |^Unpin / })) return row
  }
  throw new Error('no location row rendered - the tree built empty')
}

// ───────────────────────────────────────────────────────────────────────────

describe('the route is registered as exactly /search', () => {
  it('App.jsx renders SearchScreen at the literal path', () => {
    const src = stripComments(APP_SOURCE)
    expect(
      /[<]Route\s+path="\/search"\s+element=\{[<]SearchScreen\s*\/>\}\s*\/>/.test(src),
      'the tab bar is pointed at the literal "/search" this same round, so the '
      + 'spelling is a contract between two files.',
    ).toBe(true)
    expect(src).toMatch(/import\s+SearchScreen\s+from\s+'\.\/v2\/pages\/SearchScreen'/)
  })

  it('does not spell it /search/ or /scope', () => {
    const src = stripComments(APP_SOURCE)
    expect(src).not.toMatch(/path="\/search\/"/)
    expect(src).not.toMatch(/path="\/scope"/)
  })

  it('adds the route without repointing one that already works', () => {
    // Rule 0 of v2-page-parity: repointing a route is a functionality change.
    // The three routes the Search work could plausibly have stolen.
    const src = stripComments(APP_SOURCE)
    expect(src).toMatch(/[<]Route path="\/" element=\{[<]HomeAllAccounts \/>\} \/>/)
    expect(src).toMatch(/[<]Route path="\/more" element=\{[<]MoreComingSoonScreen \/>\} \/>/)
    expect(src).toMatch(/[<]Route path="\/location\/:locationName" element=\{[<]HomeAllAccounts \/>\} \/>/)
  })
})

describe('the picker actually picks', () => {
  it('renders a tree with rows', () => {
    renderScreen()
    expect(rows().length).toBeGreaterThan(1)
  })

  it('tapping a location row sets the real scope AND navigates', () => {
    renderScreen()
    expect(seen().scope, 'nothing is scoped before the first tap').toBeFalsy()

    const row = firstLocationRow()
    const name = row.querySelector('span').nextSibling?.textContent
      ?? within(row).getByText(/\S/).textContent

    fireEvent.click(row)

    // THE SCOPE HALF. Read out of the context, in the shape
    // NavigationDrawer.handleView writes.
    expect(seen().scope, 'the tap wrote no scope - the picker is a picture').toBeTruthy()
    expect(seen().scope.id).toBeTruthy()
    expect(Array.isArray(seen().scope.systemIds)).toBe(true)
    expect(seen().scope).toHaveProperty('name')
    expect(seen().scope).toHaveProperty('levelType')
    expect(seen().scope).toHaveProperty('ancestors')

    // THE ROUTE HALF. v2 pages scope off :locationName, not off the context.
    expect(seen().path, 'the tap did not navigate').toBe(
      `/location/${encodeURIComponent(seen().scope.name)}`,
    )
    if (name) expect(seen().scope.name).toBe(name.trim())
  })

  it('the scope it writes names the systems under that row', () => {
    renderScreen()
    const row = firstLocationRow()
    const badge = row.querySelector('[data-scope-badge]')
    const shown = badge ? Number(badge.textContent.replace(/[^\d]/g, '')) : null

    fireEvent.click(row)

    expect(seen().scope.systemIds.length).toBe(seen().scope.systems.length)
    if (shown !== null) {
      expect(
        seen().scope.systemIds.length,
        'the badge promises N systems; the scope has to contain the same N, or '
        + 'the count on the face of the UI is not what the tap does.',
      ).toBe(shown)
    }
  })

  it('"All accounts" clears the scope and goes to the dashboard', () => {
    renderScreen()
    // Scope something first, so clearing is observable.
    fireEvent.click(firstLocationRow())
    expect(seen().scope).toBeTruthy()

    cleanup()
    renderScreen()
    const all = rows()[0]
    expect(within(all).getByText('All accounts')).toBeTruthy()
    fireEvent.click(all)

    expect(
      seen().scope,
      'all-accounts is the ABSENCE of a scope in this app - the row must clear '
      + 'it, not invent a scope object called "All accounts".',
    ).toBeFalsy()
    expect(seen().path).toBe('/')
  })
})

describe('every tappable element in the frame is wired', () => {
  it('the count badge expands without navigating', () => {
    renderScreen()
    const before = rows().length
    const badge = document.querySelector('[data-scope-badge]')
    expect(badge, 'no count badge rendered').toBeTruthy()
    const expanded = badge.getAttribute('aria-expanded')

    fireEvent.click(badge)

    expect(
      seen().path,
      'the badge is the EXPAND affordance; stopPropagation() in its handler is '
      + 'what stops the row underneath navigating as well.',
    ).toBe('/search')
    expect(badge.getAttribute('aria-expanded')).not.toBe(expanded)
    expect(rows().length).not.toBe(before)
  })

  it('the star toggles without navigating', () => {
    renderScreen()
    const row = firstLocationRow()
    const star = within(row).getByRole('button', { name: /^Pin |^Unpin / })
    const before = star.getAttribute('aria-pressed')

    fireEvent.click(star)

    expect(seen().path, 'the star must not navigate').toBe('/search')
    const after = within(firstLocationRow())
      .getByRole('button', { name: /^Pin |^Unpin / })
      .getAttribute('aria-pressed')
    expect(after).not.toBe(before)
  })

  it('the red dot is deliberately inert, and says so in words', () => {
    // Colour is never the only cue (wint-ui-copy §5): the dot is a readout,
    // so its meaning has to be in its accessible name rather than in its hue.
    renderScreen()
    const dots = screen.queryAllByRole('img', { name: /Active event or alert/ })
    for (const dot of dots) expect(dot.tagName).not.toBe('BUTTON')
  })

  it('search filters the tree', () => {
    renderScreen()
    const field = screen.getByPlaceholderText(/^Search \d|^Search 1 system$/)
    const before = rows().length

    // A query that cannot match anything collapses the tree to the empty
    // state, which is the strongest available signal that filtering is live.
    fireEvent.change(field, { target: { value: 'zzzzzznotathing' } })

    expect(rows().length).toBeLessThan(before)
    expect(screen.getByText(/Nothing matches/)).toBeTruthy()
  })
})

describe('copy', () => {
  it('binds the system count to real data instead of the frame\'s 122', () => {
    renderScreen()
    const field = screen.getByPlaceholderText(/^Search /)
    const placeholder = field.getAttribute('placeholder')
    expect(placeholder).toMatch(/^Search [\d,]+ systems$|^Search 1 system$/)

    const n = Number(placeholder.replace(/[^\d]/g, ''))
    expect(n, 'the placeholder must count the dataset, not the mock').toBeGreaterThan(0)
    // 122 is the designer's mock. It is only a failure if it is a LITERAL.
    expect(
      /Search 122 systems/.test(stripComments(SOURCE)),
      'the count is hardcoded from the frame - it will be wrong on every '
      + 'dataset but the designer\'s.',
    ).toBe(false)
  })

  it('transcribes the frame\'s heading, and uses no em-dash anywhere it renders', () => {
    renderScreen()
    expect(screen.getByText('Select system to show')).toBeTruthy()
    // wint-ui-copy §1: hyphens in UI copy, never em-dashes. Comments exempt.
    const rendered = document.body.textContent
    expect(rendered).not.toMatch(/—/)
  })

  it('offers Back, never X, as a dismissal affordance', () => {
    // The frame draws neither, so the correct count is zero of both. The rule
    // only bites if one is ever added.
    renderScreen()
    expect(screen.queryAllByRole('button', { name: /^(Close|Dismiss|X)$/i })).toHaveLength(0)
  })
})

describe('the app-shell contract', () => {
  it('mounts TabBar with the search tab active', () => {
    const src = stripComments(SOURCE)
    expect(src).toMatch(/[<]TabBar\s+activeTab="search"\s*\/>/)
  })

  it('never uses a viewport height', () => {
    // Phone.jsx is a fixed 393x852 overflow-hidden frame; 100vh is clipped and
    // the page simply will not scroll.
    expect(stripComments(SOURCE)).not.toMatch(/\b(?:min-h-screen|h-screen|min-h-\[100vh\]|h-\[100vh\])\b/)
  })

  it('owns exactly one scroll container', () => {
    const src = stripComments(SOURCE)
    const scrollers = src.match(/overflow-y-auto/g) ?? []
    expect(
      scrollers.length,
      'exactly ONE body element carries the scroll. Two scrollers inside a '
      + 'fixed frame is how a page ends up with an unreachable region.',
    ).toBe(1)
    expect(src).toMatch(/min-h-0[^"]*flex-1|flex-1[^"]*min-h-0/)
  })

  it('does NOT reserve the tab bar\'s strip a second time', () => {
    // Since b3f5a31 (2026-11-08) the bar's HOST reserves TAB_BAR_CLEARANCE of
    // real column. A screen that pays it again leaves ~186px of dead space.
    const src = stripComments(SOURCE)
    expect(src).not.toMatch(new RegExp(`pb-\\[${TAB_BAR_CLEARANCE}px\\]`))
    expect(src).not.toMatch(new RegExp(`paddingBottom:\\s*${TAB_BAR_CLEARANCE}\\b`))
    expect(src).not.toMatch(/paddingBottom:\s*TAB_BAR_CLEARANCE\b/)
  })

  it('draws no header bar and no burger, because the frame has neither', () => {
    const src = stripComments(SOURCE)
    expect(src).not.toMatch(/[<]AppHeaderBar\b/)
    expect(src).not.toMatch(/aria-label="Menu"/)
    // And therefore no drawer to open from one.
    expect(src).not.toMatch(/[<]NavigationDrawer\b/)
  })

  it('hardcodes neither the Figma frame width nor the old 370', () => {
    // The frame is 402 and the shell is 393 - every width is w-full on a 16px
    // gutter. A row running past the right edge was a live bug fixed 2026-11-08.
    const src = stripComments(SOURCE)
    expect(src).not.toMatch(/\bw-\[402px\]|\bw-\[370px\]|width:\s*402\b|width:\s*370\b/)
  })

  it('references no expiring Figma asset URL at runtime', () => {
    expect(SOURCE).not.toMatch(/figma\.com\/api\/mcp\/asset/)
  })
})

/* ── THE FORK IS GONE, SO THESE TWO PIN THE IMPORT — 2026-11-09 ───────────
 *
 * This describe was called "the fork is declared, not silent". Nine tree
 * helpers in SearchScreen.jsx were copies of module-private declarations in
 * WintSidebarV2.jsx, copied because that file was outside the ownership of the
 * change that built this screen, and the only thing a test could guard was
 * that the HEADER admitted it: `/WintSidebarV2\.jsx/` and `/DUPLICATED/`.
 *
 * The nine now carry `export` there and are imported here; the copies are
 * deleted. RE-AIMED RATHER THAN DELETED, for the usual reason and one sharper
 * one: the old assertions would have kept passing, because the paragraph that
 * explains the fork is gone contains the word "DUPLICATED". A disclosure test
 * that greens on prose about the thing no longer existing is worse than none.
 *
 * AND IT GUARDS MORE THAN IT DID. The disclosure only ever asked for honesty
 * about a fork. This asks that the fork not exist: a local `function
 * buildTree` here fails the first case outright, which is the actual thing
 * that went wrong once and would go wrong again.
 *
 * THE DRIFT WAS REAL, recorded because it is the argument: the two copies of
 * ArrowDropRight had already diverged by one SVG coordinate, so the collapsed
 * caret rendered as a triangle here and a chevron in the drawer, and nothing
 * in this suite or any other could see it. */
describe('the tree helpers are imported, not forked', () => {
  const FORKED = [
    'buildTree', 'buildNode', 'filterTree', 'collectMatchPath', 'indentFor',
    'TablerStar', 'ArrowDropDown', 'ArrowDropRight', 'WintLogo',
  ]

  it('takes them from WintSidebarV2 and re-declares none of them', () => {
    expect(
      SOURCE,
      'the tree helpers are no longer copied into this file - they are '
      + 'exported from WintSidebarV2.jsx and imported. If that import is gone, '
      + 'either the fork is back or the screen has stopped building a tree.',
    ).toMatch(/from '@\/v2\/components\/WintSidebarV2'/)

    const src = stripComments(SOURCE)
    for (const name of FORKED) {
      expect(
        src,
        `${name} is declared in this file again. It is exported from `
        + 'WintSidebarV2.jsx; a second copy drifts silently, which is exactly '
        + 'what happened to ArrowDropRight before the import landed.',
      ).not.toMatch(new RegExp(`function\\s+${name}\\s*\\(`))
    }
  })

  it('does not re-implement the scope question itself', () => {
    // "Which systems is the user scoped to" is answered in one place only, by
    // UserContext, which this page writes and never restates.
    expect(SOURCE).toMatch(/from '@\/context\/UserContext'/)

    /* THE DATASET IS REACHED THROUGH THE IMPORTED buildTree NOW, so the two
       assertions that used to look for these imports in THIS file would be
       asking for the fork back. They are asserted where the single reader
       actually lives instead - same modules, same shape, one implementation
       rather than two. */
    const SIDEBAR = readFileSync('src/v2/components/WintSidebarV2.jsx', 'utf8')
    expect(SIDEBAR).toMatch(/from '@\/data\/hierarchy'/)
    expect(SIDEBAR).toMatch(/from '@\/data\/accounts'/)
    for (const name of FORKED) {
      expect(
        SIDEBAR,
        `${name} is no longer exported from WintSidebarV2.jsx, so this screen's `
        + 'import is broken or a copy has been put back here.',
      ).toMatch(new RegExp(`export function ${name}\\s*\\(`))
    }
  })
})
