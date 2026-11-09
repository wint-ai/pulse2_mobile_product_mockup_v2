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
 *   · that the donut draws, or that any arc is the right width on screen;
 *   · that any legend row meets its 44px touch target;
 *   · that the card is 363px tall (MEASURED in a real browser on 2026-11-03
 *     with `scripts/shot.mjs`, up from 319.5px for the segmented-bar build and
 *     down from ~520px before the 2026-11-02 redesign - but measured THERE,
 *     not here, and nothing in this file asserts it);
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
   20px gap. HomeAllAccounts.jsx carries this node id on it.

   ⚠ THE ID MOVED ON 2026-11-07, with the page's design source. It was
   199360:129787 and is 200013:93100 — the content frame of node 200013:93089,
   which is the restructure's target. Same element, same job, a newer frame. */
const stackIn = (container) => container.querySelector('[data-node-id="200013:93100"]')
/* ⚠ THE TAB ROW BECAME A MENU on 2026-11-07 — owner: "we are replacing tabs
   with the more button". The three destinations kept their ids, so this is the
   same Systems view reached through the control that now opens it. The row is
   role="menuitem" and the open state is `aria-current`, not `aria-selected`;
   src/v2/components/MoreMenu.jsx carries the argument. */
const openMoreMenu = () => fireEvent.click(document.querySelector('[data-name="app-more"]'))
const openSystemsTab = () => {
  openMoreMenu()
  fireEvent.click(document.querySelector('[data-menu-item="systems"]'))
}

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

  it('sits in the overview card stack, as a direct child so it inherits the 16px gap', () => {
    const { container } = renderAt('/')
    const stack = stackIn(container)
    const card = cardIn(container)
    expect(stack, 'the scroller / card stack is gone').toBeTruthy()
    /* 20px → 16px on 2026-11-09, with the Home page's move to 200067:38985,
       which stacks every card in the frame at a uniform 16.

       THE GAP VALUE IS NOT WHAT THIS TEST GUARDS, and changing the literal
       does not weaken it. The guarantee is the assertion BELOW: that the
       valve card is a direct child of the stack, and therefore inherits
       whatever gap the stack declares rather than carrying spacing of its
       own. The literal is read here only so that the two cannot drift apart
       silently - if the page changes its gap again, this line is what says
       so out loud. */
    expect(String(stack.className)).toContain('gap-[16px]')
    expect(
      String(stack.className),
      'the stack is declaring two gaps, so what the card inherits is ambiguous',
    ).not.toMatch(/gap-\[(?!16px)[^\]]+\]/)
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
    /* 'System health', not 'Valve errors' - the fault tiles were removed on
       2026-11-09 (200067:41981). The heading is unambiguous here even though
       SystemHealthCard and TriageBand share `data-name="IOT overview"`,
       because this probe is on TEXT and TriageBand's heading is
       'Water events'. */
    const health = indexOfText('System health')
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

    openMoreMenu()
    expect(
      document.querySelector('[data-menu-item="systems"]').getAttribute('aria-current'),
    ).toBe('true')
    fireEvent.keyDown(document.querySelector('[data-name="more-menu-card"]'), { key: 'Escape' })
    /* The table is up — so the view really switched and this is not an
       assertion about a page that failed to render. */
    expect(screen.getByRole('columnheader', { name: 'System' })).toBeTruthy()
    expect(cardIn(container), 'the valve card leaked into the Systems tab').toBeNull()
  })
})

describe('the offline exclusion is visible on the live page', () => {
  /* 320 Summit Blvd is the one scope in this dataset where it shows: three
     systems carry a valve, one of them is offline, and one of the online ones
     is in Valve Error — so the number that can actually be commanded is
     smaller than the number of valves.

     HOW THIS FILE USED TO PROVE IT, AND WHY IT CHANGED. Both cases here read
     the card's denominator line (`N systems with a valve · N can be
     commanded · N offline`). THE OWNER DELETED THAT LINE on 2026-11-03 —
     "remove this sentence. I want it much more clear." — choosing an outright
     delete over a gap-only line or moving it onto the button. The full
     argument is in the component header; the short version is that two of its
     three numbers counted different populations and two of the three were
     already on screen.

     SO THE EXCLUSION IS PROVED OFF THE SURVIVING SITE: the per-row offline
     sub-counts. They are not a weaker proxy — they are the encoding the
     owner's requirement actually names, stated per category instead of as one
     total, and they are now the ONLY offline encoding this card carries. The
     commandable TOTAL is no longer this card's job: it belongs to
     `ValveManagementScreen` and `BulkValveConfirmSheet`, where the command is
     sized and the skipped systems are listed by name. */
  it(`${SUMMIT} marks its offline valve on the row that counts it`, () => {
    const { container } = renderAt(at(SUMMIT))
    const card = cardIn(container)
    expect(card).toBeTruthy()

    // The line is gone, in every one of its three clauses.
    expect(card.querySelector('[data-name="valve-denominator"]')).toBeNull()
    expect(card.textContent).not.toMatch(/with a valve/i)
    expect(card.textContent).not.toMatch(/can be commanded/i)

    /* Against the REAL dataset, at least one row at this scope states an
       offline sub-count — which is the fact the deleted line used to total.
       Read off the aria-labels, which carry it for a reader too. */
    const rows = [...card.querySelectorAll('[data-valve-row]')]
    expect(rows.length, 'no legend rows at this scope').toBeGreaterThan(0)
    const offlineNotes = rows
      .map((r) => (r.getAttribute('aria-label') ?? '').match(/([\d,]+) offline/)?.[1])
      .filter(Boolean)
      .map((n) => Number(n.replace(/,/g, '')))

    expect(
      offlineNotes.length,
      'no row at 320 Summit Blvd states an offline sub-count, so the card no longer ' +
        'encodes offline at all',
    ).toBeGreaterThan(0)
    expect(offlineNotes.reduce((a, n) => a + n, 0)).toBeGreaterThan(0)

    /* And it is visible, not only announced: the sub-count is rendered text in
       the row, not an aria-label the sighted user never gets. */
    const seen = rows.some((r) => /\d+\s+offline/.test(r.textContent))
    expect(seen, 'the offline sub-count is in the accessible name only').toBe(true)

    expectCleanConsole(at(SUMMIT))
  })

  it(`${SUMMIT}'s rows still count the offline system at its last-known state`, () => {
    const { container } = renderAt(at(SUMMIT))
    const card = cardIn(container)

    const openRow = card.querySelector('[data-valve-row="open"]')
    expect(openRow, 'no Open row').toBeTruthy()

    const num = (t) => Number(String(t ?? '').replace(/,/g, ''))
    const rowSum = [...card.querySelectorAll('[data-valve-row]')]
      .filter((r) => r.getAttribute('data-valve-row') !== 'none')
      .reduce((a, r) => {
        const label = r.getAttribute('aria-label') ?? ''
        return a + num(label.match(/:\s*([\d,]+)\s+system/)?.[1] ?? 0)
      }, 0)

    /* EVERY SYSTEM WITH A VALVE IS IN EXACTLY ONE OF THE THREE VALVE ROWS,
       OFFLINE ONES INCLUDED. That was the real content of the deleted
       denominator case: an offline system holds its last-known state and is
       genuinely in the scope, so hiding it would understate the fleet. With
       the line gone, the ring is what the row counts are checked against —
       the arcs carry their own counts and the two must agree. */
    const ring = card.querySelector('[data-name="valve-bar"]')
    expect(ring, 'no ring to check the rows against').toBeTruthy()
    const valveArcSum = [...ring.querySelectorAll('[data-valve-segment]')]
      .filter((a) => a.getAttribute('data-valve-segment') !== 'none')
      .reduce((a, arc) => a + num(arc.getAttribute('data-valve-count')), 0)

    expect(rowSum, 'this scope should carry several valves').toBeGreaterThan(1)
    expect(rowSum, 'the valve rows and the ring describe different sets').toBe(valveArcSum)

    /* And the offline one is INSIDE that total rather than subtracted from it:
       the row's own count includes it, and the sub-count says so. */
    const openLabel = openRow.getAttribute('aria-label') ?? ''
    const openCount = num(openLabel.match(/:\s*([\d,]+)\s+system/)?.[1])
    const openOffline = num(openLabel.match(/([\d,]+) offline/)?.[1] ?? 0)
    expect(Number.isFinite(openCount)).toBe(true)
    expect(openOffline, 'the Open row at this scope should carry the offline system').toBe(1)
    expect(openCount, 'the row count excludes its own offline system').toBeGreaterThanOrEqual(
      openOffline,
    )

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

  /* THE 2026-11-03 REBUILD, ON THE LIVE PAGE RATHER THAN IN ISOLATION. The
     owner overruled the removal of the donut - "I don't think the current
     solution is the best visualization for that. Maybe we can try something
     else like PyChart donut" - so the segmented bar is gone and the ring is
     back, with a column of tappable legend rows beside it.
     `valveManagementCard.dom.test.jsx` argues that change and proves the
     geometry against fixtures. What is proved HERE is the part a fixture
     cannot reach: that against the REAL dataset the ring still never carries
     an arc for a dimension it cannot hold. Offline is orthogonal - an offline
     system is also open, closed or in error - so folding it into the ring
     would make the chart sum to more than the scope it is drawn over. */
  it('draws a decorative ring whose arcs are only the four valve categories', () => {
    const { container } = renderAt(at(SUMMIT))
    const card = cardIn(container)

    const ring = card.querySelector('[data-name="valve-bar"]')
    expect(ring, 'no donut on the live page').toBeTruthy()
    expect(ring.getAttribute('aria-hidden')).toBe('true')
    expect(String(ring.className)).toContain('pointer-events-none')
    expect(within(ring).queryAllByRole('button')).toHaveLength(0)

    const svg = ring.querySelector('svg')
    expect(svg, 'the ring draws no svg on the live page').toBeTruthy()
    expect(svg.getAttribute('aria-hidden')).toBe('true')

    const arcs = [...ring.querySelectorAll('[data-valve-segment]')]
    expect(arcs.length, 'an empty ring').toBeGreaterThan(0)
    for (const arc of arcs) {
      const key = arc.getAttribute('data-valve-segment')
      expect(['error', 'open', 'closed', 'none'], `arc "${key}"`).toContain(key)
      // Token utilities only. An inline hex would freeze across all four themes.
      expect(String(arc.getAttribute('class')), key).toMatch(/(?:^|\s)stroke-/)
      expect(arc.outerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    }

    // The control is the legend row, not the chart.
    const rows = [...card.querySelectorAll('[data-valve-row]')]
    expect(rows.length).toBeGreaterThan(0)

    /* The arcs weigh exactly what the rows count. If offline ever became a
       fifth arc, or an arc were weighted by anything but its own category
       count, these two totals would part company. Counts are parsed
       comma-tolerantly: `wint-format-standards.md:24` puts a thousands
       separator in every rendered count, and this dataset is one growth spurt
       away from four digits. */
    const num = (text) => Number(String(text ?? '').replace(/,/g, ''))
    const arcSum = arcs.reduce((a, arc) => a + num(arc.getAttribute('data-valve-count')), 0)
    const rowSum = rows.reduce(
      (a, r) => a + num((r.getAttribute('aria-label') ?? '').match(/([\d,]+)\s+systems?/)?.[1] ?? 0),
      0,
    )
    expect(rowSum, 'no legend row states a count').toBeGreaterThan(0)
    expect(arcSum, 'the ring and the legend describe different sets').toBe(rowSum)

    for (const row of rows) {
      expect(row.tagName.toLowerCase()).toBe('button')
      expect(ring.contains(row)).toBe(false)
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
    /* The scope's own count, so "no valves" cannot be read as "no systems".
       This is the zero-valve branch's second line and is NOT the deleted
       denominator line - different branch, different string, and the owner's
       2026-11-03 deletion did not touch it. */
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
      /* The valve TILE was this card's fingerprint until 2026-11-09, when the
         fault breakdown was removed. The heading and the bar are what is left
         and they are the card's own, not TriageBand's. */
      expect(
        screen.getByText('System health'),
        'SystemHealthCard is gone',
      ).toBeTruthy()
      expect(
        container.querySelector('[data-name="Progress Bar"], [data-status="clear"]'),
        'SystemHealthCard rendered neither a bar nor the all-clear row',
      ).toBeTruthy()
      /* TabBar. The `hideAlerts` prop is long gone, so this is the same four
         tabs as everywhere else; the home tab and the navigation tab are
         sampled. BOTH NAMES CHANGED ON 2026-11-09, when the owner put visible
         text back under the glyphs and named all four: `Dashboard` -> `Home`
         and `Search locations and systems` -> `Systems`. The accessible name
         IS the visible label on every tab now - no tab carries an aria-label,
         because with a label an aria-label only replaces it, and on Alerts it
         would mute the count badge. The second check doubles as a door check:
         with the header's PanelLeft gone, that button is the only thing on
         this route that reaches the navigation tree. */
      expect(screen.getByRole('button', { name: 'Home' }), 'TabBar is not mounted').toBeTruthy()
      expect(
        screen.getByRole('button', { name: 'Systems' }),
        'TabBar is not mounted, or the navigation door has gone from this route',
      ).toBeTruthy()
      /* And the control the card lives behind — the More menu since
         2026-11-07, with the same three destinations the tab row carried. */
      openMoreMenu()
      for (const name of ['Overview', 'Systems', 'General Info']) {
        expect(screen.getByRole('menuitem', { name }), name).toBeTruthy()
      }
      fireEvent.keyDown(document.querySelector('[data-name="more-menu-card"]'), { key: 'Escape' })
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

/* ── THE TWO-VALVE-ERROR-NUMBERS CROSS-CHECK IS GONE — 2026-11-09 ──────────
   ⚠ READ THIS BEFORE ASSUMING IT WAS NEVER HERE.

   What stood here compared SystemHealthCard's "Valve errors" TILE count
   against the valve card's own `[data-valve-row="error"]`, on three routes.
   It existed because the two numbers come from DIFFERENT sources -
   computeWidgets() for the tile, the valve scope for the row - and a
   divergence between them would have shown two different valve-error counts
   on one screen.

   IT CANNOT BE ASSERTED FROM THIS SCREEN ANY MORE. The owner removed the
   fault breakdown from SystemHealthCard ("remoive the error type from here /
   keep onlt the x out of y as in figma", 200067:41981), so the tile is gone
   and there is now exactly ONE valve-error number rendered on this page. A
   comparison needs two.

   THE INVARIANT ITSELF IS UNCHANGED AND IS STILL WORTH GUARDING - it is a
   property of the data layer, not of this page, and it should be re-pinned
   there: computeWidgets()'s valveErrors against the valve scope's error set,
   over the same scope, with no DOM involved. That is a data test and does not
   belong in this file. NOT WRITTEN HERE, and reported rather than left
   silent, because the guard genuinely went away. Do NOT "fix" the divergence
   by editing computeWidgets: it is shared with other callers and the choice
   between the two counting rules is the owner's. */
