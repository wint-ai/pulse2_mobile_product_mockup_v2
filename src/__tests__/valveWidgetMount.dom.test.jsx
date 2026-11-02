// @vitest-environment happy-dom
/**
 * THE VALVE WIDGET'S SEAT ON THE LIVE PAGE.
 *
 * (The card became DISPLAY ONLY on 2026-11-02 — the owner: "main widget is
 * display only" — and its selection, filtering and bulk command moved to
 * `src/v2/pages/ValveManagementScreen.jsx` behind the routes `/valves` and
 * `/valves/:locationName`. So the cases here that used to drive the action bar
 * now drive the WAY IN, and there are new ones asserting the action is gone
 * from the page rather than merely hidden on it.)
 *
 * `valveManagementCard.dom.test.jsx` and `valveScope.test.js` prove the card
 * is correct in isolation. This file proves something else, and it is the
 * thing that has gone wrong on this repo before: that a correct component is
 * actually MOUNTED, on the real screen, in the right place, under the real
 * route — and that mounting it did not quietly cost the screen something else.
 * `.claude/skills/v2-page-parity/SKILL.md:12-21` is the standing rule, written
 * down because commits 728d674 / 5c4d404 killed three functions on the default
 * routes and nobody noticed until a user opened the app.
 *
 * So every case below walks `HomeAllAccounts` through a real router, exactly
 * as `systemsTabScope.dom.test.jsx` and `homeLocationScope.dom.test.jsx` do.
 * Nothing here renders ValveManagementCard directly — a test that mounts the
 * card by hand cannot tell you whether the page mounts it.
 *
 * ── WHAT THIS FILE CANNOT SEE ────────────────────────────────────────────
 * happy-dom has NO LAYOUT ENGINE and NO HIT TESTING. `offsetWidth` is 0,
 * `getBoundingClientRect()` is all zeros, no stylesheet is applied and nothing
 * is painted. So nothing below asserts, or may be read as asserting:
 *   · that the card is visible, or where on the screen it lands;
 *   · that the segmented bar draws, or that its segments are the right width;
 *   · that any tile meets a 44/56px touch target;
 *   · that the card is ~317px tall (the component's header sums it from its
 *     class values, down from ~520px before the 2026-11-02 redesign — that is
 *     arithmetic, not a measurement, and nothing here pretends otherwise);
 *   · that any colour token resolves in any of the four themes.
 * Those are screenshot questions and were checked in a browser instead. What
 * IS assertable here is structure — which element is inside which, in what
 * order, with what text — and that is the whole of what this file claims.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import { SYSTEMS } from '@/data/systems'

/* ── real scopes, read off the dataset, never invented ─────────────────────
   Each is asserted to be the shape its case needs before it is used: a named
   constant that silently stops being a zero-valve location would turn its test
   into a tautology. */
const SUMMIT = '320 Summit Blvd'
const ZERO_VALVE = '45 Cedarline Way'
const systemsAt = (name) =>
  SYSTEMS.filter(
    (s) => s.l4Name === name || s.l3Name === name || s.l2Name === name || s.l1Name === name,
  )

/* ── console classification, borrowed from routeSmoke.dom.test.jsx ────────
   A React failure that still "renders" is exactly the class of bug a mount
   test is for, so console is spied rather than swallowed. The NOISE list is
   the cosmetic chatter this page already emits (recharts in a zero-size box,
   the push bridge) and is not evidence of a broken mount. */
const FATAL = [
  /element type is invalid/i,
  /type is invalid/i,
  /is not defined/i,
  /is not a function/i,
  /cannot read propert/i,
  /cannot destructure/i,
  /failed prop type/i,
  /objects are not valid as a react child/i,
  /maximum update depth exceeded/i,
  /rendered (more|fewer) hooks/i,
  /invalid hook call/i,
  /minified react error/i,
  /the above error occurred in/i,
]
const NOISE = [
  /unique "?key"? prop/i,
  /validatedomnesting/i,
  /non-boolean attribute/i,
  /react does not recognize/i,
  /unknown prop/i,
  /defaultprops/i,
  /not wrapped in act/i,
  /width\(0\) and height\(0\)/i,
  /\[pushBridge\]/,
]

let captured = []
const fmtArgs = (args) =>
  args
    .map((a) =>
      a instanceof Error ? `${a.name}: ${a.message}` : typeof a === 'string' ? a : String(a),
    )
    .join(' ')

beforeEach(() => {
  captured = []
  /* valveCommandStore persists commanded valve states in localStorage, and the
     card resolves them OVER `system.valve`. A leftover command from another
     file would silently move every count below. */
  localStorage.clear()
  sessionStorage.clear()
  for (const level of ['error', 'warn']) {
    vi.spyOn(console, level).mockImplementation((...args) => {
      captured.push({ level, text: fmtArgs(args) })
    })
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function reactFailures() {
  return captured.filter(
    (c) => FATAL.some((re) => re.test(c.text)) && !NOISE.some((re) => re.test(c.text)),
  )
}

function expectCleanConsole(where) {
  const bad = reactFailures()
  expect(
    bad.map((b) => `[${b.level}] ${b.text}`),
    `console output looks like a React failure at ${where}`,
  ).toEqual([])
}

/* Where the router actually went. The valve card navigates ITSELF now — it
   reads the scope off the route (`useParams`) and pushes with `useNavigate`,
   the same "THE ROUTE IS THE SCOPE" model this page states at
   `HomeAllAccounts.jsx:502-515` — so the only honest way to assert its entry
   point from the live page is to read the location back. */
function LocationProbe() {
  const loc = useLocation()
  return <span data-testid="where">{`${loc.pathname}${loc.search}`}</span>
}

/* The :locationName route has to be DECLARED, not merely visited — rendering
   the page bare under a MemoryRouter leaves useParams() empty, so every path
   silently reads as the root scope and a scoping test passes vacuously.
   Lifted from systemsTabScope.dom.test.jsx, which records the same trap.

   `/valves` and `/valves/:locationName` are the dedicated management screen's
   real routes and are being added to `src/App.jsx` alongside this change. They
   are declared here as a STUB, deliberately: this file's job is to prove the
   page offers the way in and points it at the right URL, not to re-test
   someone else's screen, and a stub keeps that assertion true whichever way
   the screen itself is built. */
const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<HomeAllAccounts />} />
        <Route path="/location/:locationName" element={<HomeAllAccounts />} />
        <Route path="/valves" element={<span data-testid="valve-screen" />} />
        <Route path="/valves/:locationName" element={<span data-testid="valve-screen" />} />
        <Route path="*" element={<span data-testid="nowhere" />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )

const where = () => screen.getByTestId('where').textContent

const at = (name) => `/location/${encodeURIComponent(name)}`
const cardIn = (container) => container.querySelector('[data-name="valve-management"]')
/* The screen's ONE scroller, which is also the stack that gives every card its
   20px gap. HomeAllAccounts.jsx carries this node id on it. */
const stackIn = (container) => container.querySelector('[data-node-id="199360:129787"]')
const openSystemsTab = () => fireEvent.click(screen.getByRole('tab', { name: 'Systems' }))

describe('the dataset still looks the way these cases assume', () => {
  it(`${SUMMIT} still mixes valves, an offline system and a fault`, () => {
    const scope = systemsAt(SUMMIT)
    expect(scope.length, `${SUMMIT} has no systems`).toBeGreaterThan(0)
    const withValve = scope.filter((s) => s.valve !== null && s.valve !== undefined)
    expect(withValve.length, 'needs more than one valve to be interesting').toBeGreaterThan(1)
    expect(
      withValve.filter((s) => s.comm === 'offline').length,
      `${SUMMIT} is the dataset's only scope where the offline exclusion is dramatic`,
    ).toBeGreaterThan(0)
  })

  it(`${ZERO_VALVE} still holds systems and no valves at all`, () => {
    const scope = systemsAt(ZERO_VALVE)
    expect(
      scope.length,
      `${ZERO_VALVE} has no systems, so the empty state under test is the OTHER one`,
    ).toBeGreaterThan(0)
    expect(scope.every((s) => s.valve === null || s.valve === undefined)).toBe(true)
  })
})

describe('the valve widget is mounted on the live page', () => {
  it('renders on the unscoped route', () => {
    const { container } = renderAt('/')
    const card = cardIn(container)
    expect(card, 'no valve card at /').toBeTruthy()
    /* The heading, and the scope name beside it. "All Accounts" is the same
       string the header bar draws, so the fleet reads honestly rather than
       borrowing a location's name. */
    expect(within(card).getByRole('heading', { name: 'Valve status' })).toBeTruthy()
    expect(within(card).getByText('All Accounts')).toBeTruthy()
    expectCleanConsole('/')
  })

  it('renders on a scoped location route, naming that scope', () => {
    const { container } = renderAt(at(SUMMIT))
    const card = cardIn(container)
    expect(card, `no valve card at ${at(SUMMIT)}`).toBeTruthy()
    expect(within(card).getByText(SUMMIT)).toBeTruthy()
    expectCleanConsole(at(SUMMIT))
  })

  it('sits in the overview card stack, as a direct child so it inherits the 20px gap', () => {
    const { container } = renderAt('/')
    const stack = stackIn(container)
    const card = cardIn(container)
    expect(stack, 'the scroller / card stack is gone').toBeTruthy()
    expect(String(stack.className)).toContain('gap-[20px]')
    /* A direct child, not merely a descendant: wrapped in a div of its own it
       would stop inheriting the stack's gap and its own w-full would be
       measured against the wrapper instead of the stack
       (homeWidgetWidth.dom.test.jsx:80-82). */
    expect(card.parentElement).toBe(stack)
  })

  it('keeps its own w-full and pins no width of its own', () => {
    const { container } = renderAt('/')
    const cls = String(cardIn(container).className)
    expect(cls, 'the home-widget width contract').toContain('w-full')
    expect(cls, 'an intrinsic width would beat w-full and resize the stack').not.toMatch(
      /(?:^|\s)w-\[/,
    )
  })

  it('is seated after the triage band and before the consumption card', () => {
    const { container } = renderAt('/')
    const stack = stackIn(container)
    const kids = [...stack.children]
    const indexOfText = (needle) => kids.findIndex((el) => (el.textContent ?? '').includes(needle))

    const valve = kids.indexOf(cardIn(container))
    const health = indexOfText('Valve errors')
    const consumption = indexOfText('Water consumption')

    expect(valve, 'the valve card is not a child of the stack').toBeGreaterThan(-1)
    expect(health, 'the health card is not a child of the stack').toBeGreaterThan(-1)
    expect(consumption, 'the consumption card is not a child of the stack').toBeGreaterThan(-1)

    /* "What is wrong" first, then the one ACTION on the screen, then the
       reporting. If this ever fails the seat moved — which is a decision, not
       a bug, but it is the owner's to make. */
    expect(valve, 'the valve card must come after the health card').toBeGreaterThan(health)
    expect(valve, 'the valve card must come before the consumption card').toBeLessThan(consumption)
  })

  it('belongs to Overview and is gone on the Systems tab', () => {
    const { container } = renderAt('/')
    expect(cardIn(container), 'not on Overview').toBeTruthy()

    openSystemsTab()

    expect(screen.getByRole('tab', { name: 'Systems' }).getAttribute('aria-selected')).toBe('true')
    /* The table is up — so the tab really switched and this is not an
       assertion about a page that failed to render. */
    expect(screen.getByRole('columnheader', { name: 'System' })).toBeTruthy()
    expect(cardIn(container), 'the valve card leaked into the Systems tab').toBeNull()
  })
})

describe('the offline exclusion is visible on the live page', () => {
  /* 320 Summit Blvd is the one scope in this dataset where it shows: three
     systems carry a valve, one of them is offline, and one of the online ones
     is in Valve Error — so the number that can actually be commanded is
     smaller than the number of valves, and both numbers are on the card. */
  it(`${SUMMIT} states fewer commandable systems than it has valves`, () => {
    const { container } = renderAt(at(SUMMIT))
    const card = cardIn(container)
    expect(card).toBeTruthy()

    /* Read off the denominator's OWN element, never off the whole card: the
       "No valve installed" row count abuts this line in `textContent`, so a
       count of 2 followed by "3 systems with a valve" parses as 23 — a test
       that reads the wrong number and still passes. */
    const text = card.querySelector('[data-name="valve-denominator"]')?.textContent ?? ''
    const m = text.match(/^(\d+)\s+systems?\s+with\s+a\s+valve\s+·\s+(\d+)\s+can\s+be\s+commanded/)
    expect(m, `the honest-denominator line is missing from:\n${text}`).toBeTruthy()

    const valveTotal = Number(m[1])
    const commandable = Number(m[2])
    expect(valveTotal, 'this scope should carry several valves').toBeGreaterThan(1)
    expect(
      commandable,
      'the whole point of the card: what can be commanded is smaller than what exists',
    ).toBeLessThan(valveTotal)
    /* And it says WHY, on the same line — a smaller number with no cause is
       the wrong-belief failure this feature was built against. */
    expect(text).toMatch(/·\s+\d+\s+offline/)
  })

  it(`${SUMMIT}'s rows still count the offline system the denominator excludes`, () => {
    const { container } = renderAt(at(SUMMIT))
    const card = cardIn(container)

    const openRow = card.querySelector('[data-valve-row="open"]')
    expect(openRow, 'no Open row').toBeTruthy()

    const text = card.querySelector('[data-name="valve-denominator"]')?.textContent ?? ''
    const valveTotal = Number(text.match(/^(\d+)\s+systems?\s+with\s+a\s+valve/)?.[1])
    const rowSum = [...card.querySelectorAll('[data-valve-row]')]
      .filter((r) => r.getAttribute('data-valve-row') !== 'none')
      .reduce((a, r) => {
        const label = r.getAttribute('aria-label') ?? ''
        return a + Number(label.match(/:\s*(\d+)\s+system/)?.[1] ?? 0)
      }, 0)

    /* The rows and the denominator describe the same set: every system with a
       valve is in exactly one of the three valve rows, OFFLINE ONES INCLUDED.
       "can be commanded" is the number that shrinks, and it is stated beside
       them rather than instead of them. */
    expect(Number.isFinite(valveTotal), `no denominator line in:\n${text}`).toBe(true)
    expect(rowSum, 'the valve rows and the denominator describe different sets').toBe(valveTotal)
    expectCleanConsole(at(SUMMIT))
  })
})

describe('the widget is display only, and offers the way in instead', () => {
  /* The owner, 2026-11-02: "the widget needs to be display only for managing
     valve i want to open a dedicated screen ... main widget is display only."
     The selection UI did not move behind a flag — it left. `querySelectorAll`
     sees hidden nodes too, so an empty result here means ABSENT. */
  it('carries no tick box, no aria-pressed and no action anywhere on the live page', () => {
    const { container } = renderAt(at(SUMMIT))
    const card = cardIn(container)
    for (const selector of [
      '[role="checkbox"]',
      'input[type="checkbox"]',
      '[aria-pressed]',
      '[aria-checked]',
      '[data-name="valve-action-bar"]',
      '[data-name="valve-result"]',
      '[data-valve-action]',
      '[data-valve-retry]',
    ]) {
      expect(card.querySelectorAll(selector), selector).toHaveLength(0)
    }
    /* And no row press can reach a confirm sheet, because there is no longer
       one on this card to reach. */
    fireEvent.click(card.querySelector('[data-valve-row="open"]'))
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('opens the fleet management screen from the unscoped route', () => {
    const { container } = renderAt('/')
    const button = cardIn(container).querySelector('[data-valve-entry]')
    expect(button, 'no way in to the management screen').toBeTruthy()
    expect(button.textContent).toBe('Manage valves')

    fireEvent.click(button)
    expect(where()).toBe('/valves')
    expect(screen.getByTestId('valve-screen')).toBeTruthy()
  })

  it('carries the scope into the route, URL-encoded as /location already is', () => {
    const { container } = renderAt(at(SUMMIT))
    fireEvent.click(cardIn(container).querySelector('[data-valve-entry]'))
    /* "320 Summit Blvd" has to survive its spaces. `at()` encodes the inbound
       route the same way, so this is a genuine round trip. */
    expect(where()).toBe(`/valves/${encodeURIComponent(SUMMIT)}`)
    expect(decodeURIComponent(where())).toBe(`/valves/${SUMMIT}`)
  })

  /* THE INTERESTING HALF of the entry point: a row does not merely open the
     screen, it opens it ALREADY FILTERED to the category that was tapped. The
     param is the VALVE_CATEGORIES key — the contract valveScope publishes —
     never the Figma label. */
  it('deep-links a category row to the screen pre-filtered to that category', () => {
    const { container } = renderAt(at(SUMMIT))
    const card = cardIn(container)
    const row = card.querySelector('[data-valve-row="open"]')
    expect(row, 'no Open row to deep-link from').toBeTruthy()
    /* The chevron is back on the rows that navigate, and only on those. */
    expect(row.querySelector('[data-valve-chevron="open"]')).toBeTruthy()

    fireEvent.click(row)
    expect(where()).toBe(`/valves/${encodeURIComponent(SUMMIT)}?state=open`)
  })

  /* THE 2026-11-02 REDESIGN, ON THE LIVE PAGE RATHER THAN IN ISOLATION. The
     donut was replaced by a decorative segmented bar plus a grid of tappable
     stat tiles; `valveManagementCard.dom.test.jsx` argues that change and
     proves it against fixtures. What is proved HERE is the part a fixture
     cannot reach: that against the REAL dataset the bar still never carries a
     segment for a dimension it cannot hold. Offline is orthogonal — an offline
     system is also open, closed or in error — so folding it into the bar would
     make the chart sum to more than the scope it is drawn over. */
  it('draws a decorative bar whose segments are only the four valve categories', () => {
    const { container } = renderAt(at(SUMMIT))
    const card = cardIn(container)

    const bar = card.querySelector('[data-name="valve-bar"]')
    expect(bar, 'no segmented bar on the live page').toBeTruthy()
    expect(bar.getAttribute('aria-hidden')).toBe('true')
    expect(String(bar.className)).toContain('pointer-events-none')
    expect(within(bar).queryAllByRole('button')).toHaveLength(0)

    const keys = [...bar.querySelectorAll('[data-valve-segment]')].map((s) =>
      s.getAttribute('data-valve-segment'),
    )
    expect(keys.length, 'an empty bar').toBeGreaterThan(0)
    for (const key of keys) {
      expect(['error', 'open', 'closed', 'none'], `segment "${key}"`).toContain(key)
    }

    // The control is the tile, not the chart.
    const tiles = [...card.querySelectorAll('[data-valve-row]')]
    expect(tiles.length).toBeGreaterThan(0)

    /* The segments weigh exactly what the tiles count. If offline ever became
       a fifth segment, or a segment were weighted by anything but its own
       category count, these two totals would part company. */
    const segmentSum = [...bar.querySelectorAll('[data-valve-segment]')].reduce(
      (a, s) => a + Number(s.style.flexGrow),
      0,
    )
    const tileSum = tiles.reduce(
      (a, t) => a + Number((t.getAttribute('aria-label') ?? '').match(/(\d+)\s+systems?/)?.[1] ?? 0),
      0,
    )
    expect(tileSum, 'no tile states a count').toBeGreaterThan(0)
    expect(segmentSum, 'the bar and the tiles describe different sets').toBe(tileSum)

    for (const tile of tiles) {
      expect(tile.tagName.toLowerCase()).toBe('button')
      expect(bar.contains(tile)).toBe(false)
    }
  })

  /* Nothing to manage, so no link and no chevron — but still announced, with
     the reason in its name, and NOT the `disabled` attribute. */
  it('leaves the "No valve installed" row inert at every scope it appears in', () => {
    const { container } = renderAt('/')
    const none = cardIn(container).querySelector('[data-valve-row="none"]')
    expect(none, 'no "No valve installed" row at the fleet scope').toBeTruthy()
    expect(none.getAttribute('aria-disabled')).toBe('true')
    expect(none.hasAttribute('disabled')).toBe(false)
    expect(none.querySelector('[data-valve-chevron]')).toBeNull()

    fireEvent.click(none)
    expect(where()).toBe('/')
  })
})

describe('a scope with systems but no valves', () => {
  it(`${ZERO_VALVE} renders the honest empty state, not a crash and not an empty donut`, () => {
    const { container } = renderAt(at(ZERO_VALVE))
    const card = cardIn(container)
    expect(card, 'the card vanished instead of saying why it is empty').toBeTruthy()

    expect(within(card).getByText('No valves in this scope.')).toBeTruthy()
    /* The denominator, so "no valves" cannot be read as "no systems". */
    expect(card.textContent).toMatch(/All \d+ systems? (?:is|are) metering-only\./)

    /* NOTHING TO DO, in any of its forms: no bulk bar, no open/close button,
       no category tiles, no bar of a single empty category — and NO WAY IN
       either, because the management screen has nothing here to manage and a
       live-looking button onto an empty screen is a dead end with a chevron
       on it. */
    expect(card.querySelector('[data-name="valve-action-bar"]')).toBeNull()
    expect(card.querySelector('[data-valve-action]')).toBeNull()
    expect(card.querySelector('[data-valve-row]')).toBeNull()
    expect(card.querySelector('[data-name="valve-bar"]')).toBeNull()
    expect(card.querySelector('[data-name="valve-stats"]')).toBeNull()
    expect(card.querySelector('[data-valve-entry]')).toBeNull()

    expectCleanConsole(at(ZERO_VALVE))
  })
})

describe('mounting the widget cost the page nothing', () => {
  /* Rule 0. Adding a card is not permission to lose one, and the functions
     below are the ones that died last time this page's routes were touched:
     the content above the fold, the health card, and the bottom nav. */
  it.each([['/'], [at(SUMMIT)]])(
    'the hero, the health card and the TabBar all still render at %s',
    (path) => {
      const { container } = renderAt(path)

      expect(
        container.querySelector('[data-name="Systems overview hero"]'),
        'SystemsOverviewHero is gone',
      ).toBeTruthy()
      expect(
        container.querySelector('[aria-label^="Valve errors:"]'),
        'SystemHealthCard’s valve tile is gone',
      ).toBeTruthy()
      /* TabBar, with alerts hidden on this page — so Home and More. */
      expect(screen.getByRole('button', { name: 'Home' }), 'TabBar is not mounted').toBeTruthy()
      expect(screen.getByRole('button', { name: 'More' }), 'TabBar is not mounted').toBeTruthy()
      /* And the tab row the card lives behind. */
      for (const name of ['Overview', 'Systems', 'General Info']) {
        expect(screen.getByRole('tab', { name }), name).toBeTruthy()
      }
      /* The card is there too — so this case cannot pass by the card simply
         never having mounted. */
      expect(cardIn(container)).toBeTruthy()

      expectCleanConsole(path)
    },
  )

  it('the screen still owns exactly one body scroller', () => {
    /* The app-shell contract (`.claude/skills/v2-page-parity/SKILL.md`,
       enforced by scripts/check-shell-contract.mjs): the PAGE owns one
       element with flex:1 + overflowY:auto + minHeight:0, and a card added to
       it may not bring a second.

       The drawer is deliberately excluded and is not an exception to the rule.
       WintSidebarV2 carries a scroller of its own (`WintSidebarV2.jsx:788`)
       for its location list, it is `role="dialog"`, and it is kept MOUNTED
       even when closed so the slide has something to animate. It is not the
       page body, it predates this card, and counting it would make this
       assertion fail for a reason that has nothing to do with the mount. */
    const { container } = renderAt('/')
    const scrollers = [...container.querySelectorAll('*')].filter(
      (el) => el.style?.overflowY === 'auto' && !el.closest('[role="dialog"]'),
    )
    expect(
      scrollers.length,
      'a second scroll container appeared outside the drawer',
    ).toBe(1)
    expect(scrollers[0], 'the one scroller is the overview card stack').toBe(stackIn(container))
  })
})

describe('the two valve-error numbers on this screen agree', () => {
  /* THE CONSISTENCY HAZARD, pinned.
     SystemHealthCard's "Valve errors" tile is fed by computeWidgets
     (`src/data/systems.js:258`), which counts
     `s.valve === 'error' && s.comm === 'online'`. The card's own Valve Error
     row comes from summariseValves, which counts an offline system at its real
     last-known state. The two therefore describe the same thing by different
     rules, and two numbers about valve errors on one screen must not disagree.

     They agree today, and not by luck: `buildTree.js` assigns AT MOST ONE
     failed dimension per system (`kind`), so `valve === 'error'` and
     `comm === 'offline'` are mutually exclusive in this dataset. That is a
     property of the data generator, not of this page.

     If this ever goes red the divergence became reachable. Do NOT fix it by
     editing computeWidgets: it is shared with other callers and the choice
     between the two counting rules is the owner's. */
  it.each([['/'], [at(SUMMIT)], [at('Office')]])('at %s', (path) => {
    const { container } = renderAt(path)
    const tile = container.querySelector('[aria-label^="Valve errors:"]')
    expect(tile, 'no valve-errors tile to compare against').toBeTruthy()
    const tileCount = Number(
      (tile.getAttribute('aria-label') ?? '').match(/:\s*([\d,]+)/)?.[1]?.replace(/,/g, ''),
    )
    expect(Number.isFinite(tileCount)).toBe(true)

    const card = cardIn(container)
    expect(card).toBeTruthy()
    const row = card.querySelector('[data-valve-row="error"]')
    /* No row means no system in this scope is in Valve Error, so the tile must
       read zero. */
    const rowCount = row
      ? Number(
          (row.getAttribute('aria-label') ?? row.textContent ?? '').match(/Valve Error\D*(\d+)/)?.[1],
        )
      : 0

    expect(
      rowCount,
      `SystemHealthCard says ${tileCount} valve errors and the valve card says ${rowCount} at ${path}. ` +
        'Two numbers about valve errors on one screen have diverged — see the note above this test.',
    ).toBe(tileCount)
  })
})
