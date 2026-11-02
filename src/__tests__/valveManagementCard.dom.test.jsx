// @vitest-environment happy-dom
//
// ValveManagementCard — a READ-ONLY readout of valve states across a location
// or an account, and the way in to the screen that manages them.
//
// ── THE DONUT IS GONE, AND SO ARE ITS CASES (2026-11-02) ─────────────────
// The owner: "the widget for valves looks too messy. Too much information,
// it's not organized well, it's too big... It doesn't feel like the ShadCN
// components." The donut was 162px of a ~520px card — 31% — was not to scale
// below 1.7%, could not be tapped at any share (no arc reaches 44px radially
// in a ~28px ring band), and did not encode offline at all. It was replaced by
// a segmented bar plus a grid of tappable stat tiles. The full argument, and
// how to put a ring back if the owner overrules it, is in the component's
// header; it is NOT restated here.
//
// THREE CASES DIED WITH IT and were REMOVED, not weakened:
//   · "one <path data-valve-slice> per non-zero count" — there are no paths.
//   · "a full ring is two paths under fill-rule evenodd" — there is no ring.
//   · "no arc is focusable, pressable or exposed to a reader".
// THE INTENT OF THE THIRD SURVIVES and is re-expressed below as
// "the bar is decorative, the stat row is the control", because the thing it
// actually protected is that a chart must not LOOK like a control unless it
// IS one. The bar is not, so it is inert; the tiles are, so they are buttons.
//
// Two more were rewritten as INTENT rather than class strings: the row target
// (`min-h-[48px]` literal -> "at least 44px, read off whatever class sets it")
// and the card inset (-> "the three layout boxes share one inset", which is
// the alignment rule the literal was standing in for).
//
// ── WHAT CHANGED, AND WHY THIS FILE LOST HALF ITS CASES ──────────────────
// This card used to act: tick boxes, an action bar, a confirm sheet, a result
// panel and a retry. The owner removed all of it on 2026-11-02 — "the widget
// needs to be display only for managing valve i want to open a dedicated
// screen ... main widget is display only" — and the function moved to
// `src/v2/pages/ValveManagementScreen.jsx`. The cases that proved the ACTION
// went with it. The cases that prove the READOUT are all still here, because
// the readout is what survived, plus new ones that prove the action is
// genuinely GONE rather than hidden, and that the way in works.
//
// WHAT THESE TESTS ARE STILL FOR. The owner's other binding requirement is a
// belief, not a pixel: "we have a kind of an offline devices that Valve cannot
// be shut off ... to not let him think that this Valve will take place on this
// operation that he wants to." Two of its three sites were the action bar and
// the result panel. THE THIRD IS STILL ON THIS CARD and is still pinned below:
//   · the ROW count INCLUDES offline systems — they are in the scope and at a
//     real last-known state;
//   · the DENOMINATOR line says, beside it, how many can ACTUALLY be
//     commanded, so the two numbers can be read against each other.
// Every fixture below is built so those numbers DIFFER. A fixture where they
// agree proves nothing here.
//
// FIXTURES ARE INLINE. The real `SYSTEMS` is not imported: it is 103 systems
// of live mock data whose valve mix changes whenever the simulator or the
// catalog is edited, which would make these assertions drift for reasons that
// have nothing to do with this card.
//
// EVERY RENDER GOES THROUGH A ROUTER. The card reads its scope off the route
// (`useParams`) and navigates itself (`useNavigate`) — see THE ROUTE IS THE
// SCOPE in `HomeAllAccounts.jsx:502-515` — so a bare `render(<Card />)` would
// throw. `<LocationProbe>` sits beside the routes and prints where the router
// actually went, which is how every navigation assertion below is made.
//
// ── WHAT THIS FILE CANNOT TEST, AND WHY IT DOES NOT PRETEND TO ───────────
// happy-dom has NO LAYOUT ENGINE, no `elementFromPoint` and no hit testing.
// `offsetWidth` is 0, `getBoundingClientRect()` is all zeros, and
// `fireEvent.click(row)` dispatches straight at the node — it never asks what
// is painted on top of it or how big the node is. So NOTHING here can catch:
//   · a 56px tile that is actually 31px tall;
//   · a bar segment that overlaps a tile and swallows its taps;
//   · "No valve installed" truncating inside a 153px tile;
//   · the dE 7.6 deuteranopia pair (index.css:358) being legible in practice.
// What IS assertable is the ATOM that decides each of those, so that is what
// is pinned: the class that sets the height, `pointer-events-none` and
// `aria-hidden` on the bar, and the fact that no segment is a button or
// focusable. The real checks for the rest belong in a browser.
//
// AND THE CARD'S HEIGHT IS NOT ASSERTED ANYWHERE IN THIS FILE. The component's
// header sums it to ~317px from its class values, down from the ~520px
// measured before the redesign. That sum is ARITHMETIC, not a measurement:
// with no layout engine there is no honest way to assert it here, and a test
// that re-added the same numbers would only be checking that two files agree
// about addition. It is left as a browser check and said so plainly, rather
// than faked with a class-string proxy.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ValveManagementCard from '@/v2/components/ValveManagementCard'
import { VALVE_CATEGORIES } from '@/v2/components/valveScope'
import { clearValveCommands, getBulkValveHistory } from '@/data/valveCommandStore'

beforeEach(() => {
  clearValveCommands()
  /* The card no longer writes, but `effectiveValveState` still reads this
     store, and a command left behind by another file would silently move every
     count below. */
  localStorage.setItem('pulse2-bridge-disabled', '1')
})

afterEach(() => {
  cleanup()
  clearValveCommands()
  localStorage.removeItem('pulse2-bridge-disabled')
})

/* ── Fixtures ────────────────────────────────────────────────────────────
   `valveScope` reads `{ id, name, valve, comm | offline, lastSeen }` and
   nothing else. `comm` and `offline` are set together because buildTree.js
   :525,548 always has them agree. */
const on = (id, name, valve) => ({
  id,
  name,
  valve,
  comm: 'online',
  offline: false,
  lastSeen: '2026-11-01T09:00:00.000Z',
})

const off = (id, name, valve) => ({
  ...on(id, name, valve),
  comm: 'offline',
  offline: true,
  lastSeen: '2026-10-30T14:30:00.000Z',
})

/* The workhorse. All four categories present, and the offline system sits
   INSIDE the Open category so the row count and the commandable count disagree
   by exactly one — which is the whole widget in one fixture.
     error 1 · open 5 (1 of them offline) · closed 1 · none 2 = 9 systems
     7 with a valve · 5 commandable (error and the offline one are not) */
const MIXED = [
  on('e1', 'Boiler Room', 'error'),
  on('o1', 'North Wing', 'open'),
  on('o2', 'South Wing', 'open'),
  on('o3', 'Kitchen', 'open'),
  on('o4', 'Roof Riser', 'open'),
  off('o5', 'Annex Riser', 'open'),
  on('c1', 'Garage Line', 'closed'),
  on('n1', 'Lobby Meter', null),
  on('n2', 'Car Park Meter', null),
]

const SUMMIT = '320 Summit Blvd'
/* The scoped route, encoded exactly as `/location/:locationName` is on the
   live page — a name with spaces is the case the encoding exists for. */
const AT_SUMMIT = `/location/${encodeURIComponent(SUMMIT)}`

function LocationProbe() {
  const loc = useLocation()
  return <span data-testid="where">{`${loc.pathname}${loc.search}`}</span>
}

/**
 * Render the card under a real router at `path`.
 *
 * The two routes DECLARED here are the two the live page declares, because
 * rendering the card under a bare MemoryRouter leaves `useParams()` empty and
 * every scoped assertion would pass vacuously against the fleet route. Lifted
 * from `systemsTabScope.dom.test.jsx`, which records the same trap.
 *
 * `*` catches `/valves...` so a navigation does not blow up on an unmatched
 * route; the card unmounts when it is followed, which is correct — it is a
 * different screen — so every query on `container` is made BEFORE the click.
 */
function mount(ui, path = '/') {
  const utils = render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="/location/:locationName" element={ui} />
        <Route path="*" element={<span data-testid="gone" />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
  return { ...utils, where: () => screen.getByTestId('where').textContent }
}

const card = (props = {}) => (
  <ValveManagementCard systems={MIXED} scopeLabel={SUMMIT} scopeKind="location" {...props} />
)

const rowFor = (container, key) => container.querySelector(`[data-valve-row="${key}"]`)
const entry = (container) => container.querySelector('[data-valve-entry]')

describe('ValveManagementCard — the four states, in the locked order', () => {
  it('renders every category with the design\'s exact words, bad state first', () => {
    const { container } = mount(card())
    const rows = [...container.querySelectorAll('[data-valve-row]')]

    /* The ORDER is VALVE_CATEGORIES' order, which PRD 03c:113 locks as
       "bad-state first" — top-left is always the trouble check. Read off the
       module rather than retyped, so a reorder there fails here rather than
       silently disagreeing. */
    expect(rows.map((r) => r.getAttribute('data-valve-row'))).toEqual(
      VALVE_CATEGORIES.map((c) => c.key),
    )

    /* The EXACT words. Figma board 199535:96542 draws them verbatim: not
       "Fault", not "No valve", not "Errors". */
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Valve Error'),
      expect.stringContaining('Open'),
      expect.stringContaining('Closed'),
      expect.stringContaining('No valve installed'),
    ])
    expect(container.textContent).not.toMatch(/\bFault\b/)
    /* "Unreachable" is nowhere in this product (en.json:348-355 says Offline /
       System is offline / Can't reach). It must not enter through this card. */
    expect(container.textContent).not.toMatch(/Unreachable/i)
  })

  it('states the honest denominator beside the total, not instead of it', () => {
    const { container } = mount(card())
    // 9 systems in the hole, 7 of them with a valve, 5 of those commandable.
    expect(container.textContent).toContain('7 systems with a valve')
    expect(container.textContent).toContain('5 can be commanded')
    expect(container.textContent).toContain('1 offline')
  })
})

describe('ValveManagementCard — the owner\'s requirement survives the strip', () => {
  /* THE CENTRAL TEST OF THIS FILE, and the reason a readout with no buttons on
     it is still worth drawing. The Open row counts 5 because the offline
     system is genuinely Open and genuinely in the scope; the line under the
     rows says only 5 of the 7 valves can be commanded at all. The row count
     and the commandable count are different questions and are answered
     separately — if they ever collapse into one number, that number is lying
     about one of them. */
  it('counts the offline system in the row and excludes it from what can be commanded', () => {
    const { container } = mount(card())

    const open = rowFor(container, 'open')
    expect(open.textContent).toMatch(/Open/)
    expect(open.textContent).toMatch(/5/)
    // The cross-tab, stated per row rather than left for the eye to integrate.
    expect(open.textContent).toMatch(/1 offline/)
    // And in the accessible name, because the chevron is a sighted-only promise.
    expect(open.getAttribute('aria-label')).toMatch(/1 offline/)

    /* 7 valves exist; 5 can be commanded. The gap is the Valve Error one and
       the offline one, and the line states the offline half of it outright.
       Read off its OWN element: in `card.textContent` the "No valve installed"
       count abuts this line, so "2" + "7 systems with a valve" reads as "27"
       to any regex run over the whole card. */
    const denominator = container.querySelector('[data-name="valve-denominator"]').textContent
    expect(denominator).toBe('7 systems with a valve · 5 can be commanded · 1 offline')
  })
})

describe('ValveManagementCard — display only, and provably so', () => {
  /* "Remove the code; do not leave it behind a dead flag." A `querySelectorAll`
     sees hidden elements too, so an empty result here is the selection UI being
     ABSENT, not merely invisible. */
  it('has no checkbox, no tick box and no aria-pressed anywhere in the card', () => {
    const { container } = mount(card())

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(0)
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0)
    expect(container.querySelectorAll('[aria-pressed]')).toHaveLength(0)
    expect(container.querySelectorAll('[aria-checked]')).toHaveLength(0)
    expect(container.querySelectorAll('[aria-multiselectable]')).toHaveLength(0)
  })

  it('has no action bar, no result panel and no retry left on it', () => {
    const { container } = mount(card())
    for (const selector of [
      '[data-name="valve-action-bar"]',
      '[data-name="valve-result"]',
      '[data-valve-action]',
      '[data-valve-retry]',
    ]) {
      expect(container.querySelectorAll(selector), selector).toHaveLength(0)
    }
    /* The two words the action bar and the result panel owned. Neither may
       reappear on a readout. */
    expect(container.textContent).not.toMatch(/\bselected\b/i)
    expect(container.textContent).not.toMatch(/\bcommanded to\b/i)
  })

  /* `BulkValveConfirmSheet` is the only `role="alertdialog"` this card ever
     mounted, and it moved to the dedicated screen. Pressing anything on the
     card must open nothing and write nothing. */
  it('reaches no confirm sheet, and writes nothing to the command store', () => {
    for (const key of ['error', 'open', 'closed', 'none']) {
      const { container } = mount(card())
      const row = rowFor(container, key)
      expect(row, `no ${key} row`).toBeTruthy()
      fireEvent.click(row)
      expect(screen.queryByRole('alertdialog'), `${key} opened a dialog`).toBeNull()
      expect(screen.queryByRole('dialog'), `${key} opened a dialog`).toBeNull()
      cleanup()
    }

    const { container } = mount(card())
    fireEvent.click(entry(container))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(getBulkValveHistory()).toHaveLength(0)
  })
})

describe('ValveManagementCard — the way in to the dedicated screen', () => {
  it('opens the fleet screen from the unscoped route', () => {
    const { container, where } = mount(card({ scopeLabel: 'All Accounts' }), '/')
    const button = entry(container)
    expect(button.textContent).toBe('Manage valves')
    /* Navigation, not actuation — so the DEFAULT shadcn variant, never
       `destructive`. That red is reserved for the control that actually shuts
       water off, and that control now lives on the screen this opens; spending
       it on a route change would habituate the user to the colour that
       matters. (`bg-destructive` is the variant's own class. The base class
       list carries `aria-invalid:border-destructive` on every variant, so the
       bare word is not evidence of anything.) */
    expect(String(button.className)).toContain('bg-primary')
    expect(String(button.className)).not.toMatch(/\bbg-destructive\b/)

    fireEvent.click(button)
    expect(where()).toBe('/valves')
  })

  it('carries the scope into the route, URL-encoded exactly as /location is', () => {
    const { container, where } = mount(card(), AT_SUMMIT)
    fireEvent.click(entry(container))
    // "320 Summit Blvd" has to survive its spaces, both ways.
    expect(where()).toBe('/valves/320%20Summit%20Blvd')
    expect(decodeURIComponent(where())).toBe(`/valves/${SUMMIT}`)
  })

  /* THE INTERESTING HALF. Tapping "Valve Error · 1" must land on the screen
     already filtered to the faulted ones — not on an unfiltered list to hunt
     through. The param is the VALVE_CATEGORIES key, which is the contract
     valveScope already publishes, never the Figma label. */
  it.each([['error'], ['open'], ['closed']])(
    'deep-links the %s row to the screen pre-filtered to that category',
    (key) => {
      const { container, where } = mount(card(), '/')
      fireEvent.click(rowFor(container, key))
      expect(where()).toBe(`/valves?state=${key}`)
    },
  )

  it('keeps the scope AND the filter when the row is tapped on a scoped route', () => {
    const { container, where } = mount(card(), AT_SUMMIT)
    fireEvent.click(rowFor(container, 'error'))
    expect(where()).toBe('/valves/320%20Summit%20Blvd?state=error')
  })

  /* The chevron is back, and it is back honestly: it appears on exactly the
     rows that navigate. See THE CHEVRON LEFT, AND THE CHEVRON IS BACK in the
     component header for why it was removed and why that objection no longer
     holds. */
  it('marks every navigating row with a chevron and no other row', () => {
    const { container } = mount(card())
    const chevrons = [...container.querySelectorAll('[data-valve-chevron]')].map((el) =>
      el.getAttribute('data-valve-chevron'),
    )
    expect(chevrons).toEqual(['error', 'open', 'closed'])
    expect(rowFor(container, 'none').querySelector('[data-valve-chevron]')).toBeNull()
  })
})

describe('ValveManagementCard — "No valve installed" is present, not absent', () => {
  it('is aria-disabled with its reason in the accessible name, and not `disabled`', () => {
    const { container } = mount(card())
    const none = rowFor(container, 'none')

    expect(none.getAttribute('aria-disabled')).toBe('true')
    /* NOT the `disabled` attribute: a disabled control is skipped outright by
       some assistive tech, so the user never learns WHY — which on this row is
       the only thing it has to say. */
    expect(none.hasAttribute('disabled')).toBe(false)
    expect(none.disabled).toBe(false)
    // Still reachable by keyboard.
    expect(none.getAttribute('tabindex')).not.toBe('-1')

    const name = none.getAttribute('aria-label')
    expect(name).toContain('No valve installed')
    expect(name).toContain('2 systems')
    expect(name).toMatch(/Nothing to manage/)
    expect(name).toMatch(/no valve here to command/)

    // It is not a toggle that happens to be off, either.
    expect(none.hasAttribute('aria-pressed')).toBe(false)
  })

  /* There is nothing to manage there and the dedicated screen cannot act on
     it, so the row must not become a link just because its three neighbours
     did. */
  it('does not navigate', () => {
    const { container, where } = mount(card(), AT_SUMMIT)
    fireEvent.click(rowFor(container, 'none'))
    expect(where()).toBe(AT_SUMMIT)
  })
})

describe('ValveManagementCard — the bar is decorative, the stat row is the control', () => {
  /* THE SURVIVING INTENT of the deleted arc case, re-expressed. The rule it
     protected was never "arcs specifically": it was that a chart must not LOOK
     like a control unless it IS one. The donut failed that from the other
     side — it looked like a target and could not be one, because at a 361px
     card the ring band is ~28px and no arc reaches 44px radially at ANY share.
     The bar settles it by being honestly inert, and the tiles settle it by
     being honestly buttons. */
  it('exposes the bar to nothing — not a reader, not a pointer, not the tab order', () => {
    const { container } = mount(card())
    const bar = container.querySelector('[data-name="valve-bar"]')
    expect(bar, 'no segmented bar').not.toBeNull()

    /* Inert twice over, and silent: every number and word it could announce is
       already text in the stat tiles below it, so a reader that saw both would
       read the whole scope twice. */
    expect(bar.getAttribute('aria-hidden')).toBe('true')
    expect(String(bar.className)).toContain('pointer-events-none')
    expect(bar.textContent).toBe('')

    for (const seg of bar.querySelectorAll('[data-valve-segment]')) {
      expect(seg.tagName.toLowerCase()).not.toBe('button')
      expect(seg.hasAttribute('tabindex')).toBe(false)
      expect(seg.hasAttribute('onclick')).toBe(false)
    }
    expect(within(bar).queryAllByRole('button')).toHaveLength(0)
    for (const btn of screen.queryAllByRole('button')) {
      expect(bar.contains(btn), 'a control ended up inside the chart').toBe(false)
    }
  })

  /* THE OTHER HALF, and the thing the donut could never do at any size: the
     chart is a CONTROL now. Every category the card draws is a button, and
     pressing it filters the list. */
  it('makes every drawn category a real button, and the bar their only decoration', () => {
    const { container } = mount(card())

    const tiles = [...container.querySelectorAll('[data-valve-row]')]
    expect(tiles).toHaveLength(4)
    for (const tile of tiles) {
      expect(tile.tagName.toLowerCase(), tile.getAttribute('data-valve-row')).toBe('button')
    }

    /* Nothing else on the card is a control except the way in — so there is no
       third thing competing with the tiles for the reader's attention. */
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
    expect(buttons.filter((b) => b.hasAttribute('data-valve-entry'))).toHaveLength(1)
  })

  /* The visibility floor is flexbox's (`min-w-1` on a `basis-0` segment with
     `flexGrow: count`), not an arc algorithm's — but the rule it serves is the
     same one the donut's MIN_SWEEP_DEG served: a non-zero count may never
     round to nothing, and the floor must never MANUFACTURE a mark for a zero.
     So the segments are exactly the non-empty categories, in the design's
     order, each weighted by its own count. */
  it('draws one segment per non-zero count, in order, weighted by that count', () => {
    const { container } = mount(card())
    const segments = [...container.querySelectorAll('[data-valve-segment]')]

    expect(segments.map((s) => s.getAttribute('data-valve-segment'))).toEqual(
      VALVE_CATEGORIES.map((c) => c.key),
    )
    // MIXED: error 1 · open 5 · closed 1 · none 2.
    expect(segments.map((s) => s.style.flexGrow)).toEqual(['1', '5', '1', '2'])
    for (const seg of segments) {
      expect(String(seg.className), 'the visibility floor').toContain('min-w-1')
    }
  })

  it('draws no segment at all for a category with a zero count', () => {
    const { container } = mount(
      <ValveManagementCard
        systems={[on('a', 'A', 'open'), on('b', 'B', 'open'), on('c', 'C', 'open')]}
        scopeLabel="Tel Aviv HQ"
      />,
    )
    const segments = [...container.querySelectorAll('[data-valve-segment]')]
    expect(segments).toHaveLength(1)
    expect(segments[0].getAttribute('data-valve-segment')).toBe('open')
  })

  /* OFFLINE IS NOT A SEGMENT, AND MUST NOT BECOME ONE. An offline system is
     ALSO open, closed or in error — it is already inside one of the four
     segments — so a fifth segment would count it twice and make the bar sum to
     more than the scope. It belongs to the muted denominator line instead,
     which is where this asserts it is. */
  it('keeps the offline count outside the segmented bar', () => {
    const { container } = mount(card())

    const keys = [...container.querySelectorAll('[data-valve-segment]')].map((s) =>
      s.getAttribute('data-valve-segment'),
    )
    const known = VALVE_CATEGORIES.map((c) => c.key)
    expect(keys.every((k) => known.includes(k)), `a segment outside the four: ${keys}`).toBe(true)
    expect(keys).not.toContain('offline')

    // The segments sum to the scope, not to the scope plus its offline systems.
    const sum = [...container.querySelectorAll('[data-valve-segment]')].reduce(
      (a, s) => a + Number(s.style.flexGrow),
      0,
    )
    expect(sum, 'the bar double-counts if offline is folded in').toBe(9)

    // And the count itself is stated — as a muted line, outside the chart.
    const denominator = container.querySelector('[data-name="valve-denominator"]')
    expect(denominator.textContent).toContain('1 offline')
    expect(String(denominator.className)).toContain('text-muted-foreground')
    expect(container.querySelector('[data-name="valve-bar"]').contains(denominator)).toBe(false)
  })

  /* THE TOUCH TARGET, AS A RULE RATHER THAN A STRING. The old case asserted the
     literal `min-h-[48px]`, which pinned a spelling instead of a requirement
     and would have failed a move onto the Tailwind scale that changed nothing
     about the target. What matters is 44px (WCAG 2.5.5 / the house floor), so
     that is what is read — off whichever `min-h-*` class sets it. */
  it('gives every stat tile a touch target of at least 44px', () => {
    const { container } = mount(card())
    for (const key of ['error', 'open', 'closed', 'none']) {
      const cls = String(rowFor(container, key).className)
      const scaleStep = cls.match(/(?:^|\s)min-h-(\d+(?:\.\d+)?)(?:\s|$)/)?.[1]
      const literal = cls.match(/(?:^|\s)min-h-\[(\d+)px\](?:\s|$)/)?.[1]
      const px = scaleStep ? Number(scaleStep) * 4 : Number(literal)
      expect(Number.isFinite(px), `${key} declares no minimum height: ${cls}`).toBe(true)
      expect(px, `${key} tile is under the 44px floor`).toBeGreaterThanOrEqual(44)
    }
  })
})

describe('ValveManagementCard — the states that must be real', () => {
  it('renders nothing at all for an empty scope', () => {
    /* No probe in this one: `container.firstChild` has to be able to be null,
       and a sibling element beside the card would make that assertion
       impossible to fail. */
    const { container } = render(
      <MemoryRouter>
        <ValveManagementCard systems={[]} scopeLabel="Nowhere" />
      </MemoryRouter>,
    )
    expect(container.firstChild).toBeNull()
  })

  /* Reachable from the live drawer today — Southbridge Health, and the
     locations 45 Cedarline Way / 510 Lakeview Dr / 30 Dogwood Dr. Not an edge
     case, and not a spinner or an empty donut. */
  it('says so honestly when the scope has systems but no valves, and offers no way in', () => {
    const { container } = mount(
      <ValveManagementCard
        systems={[on('m1', 'Meter A', null), on('m2', 'Meter B', null), on('m3', 'Meter C', null)]}
        scopeLabel="Southbridge Health"
        scopeKind="account"
      />,
    )
    expect(container.textContent).toContain('No valves in this scope.')
    expect(container.textContent).toContain('All 3 systems are metering-only.')

    // No bar of one empty category, no tiles, and NO entry control: the
    // management screen has nothing here to manage, so a way in would be a
    // dead end with a chevron on it.
    expect(container.querySelector('[data-name="valve-bar"]')).toBeNull()
    expect(container.querySelector('[data-name="valve-stats"]')).toBeNull()
    expect(container.querySelectorAll('[data-valve-row]')).toHaveLength(0)
    expect(entry(container)).toBeNull()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('collapses a single-state scope to a sentence and keeps the way in', () => {
    const { container, where } = mount(
      <ValveManagementCard
        systems={[on('a', 'A', 'open'), on('b', 'B', 'open'), on('c', 'C', 'open')]}
        scopeLabel="Tel Aviv HQ"
      />,
    )
    // One series needs no legend — the headline names it.
    expect(container.textContent).toContain('All 3 systems are Open.')
    expect(container.querySelectorAll('[data-valve-row]')).toHaveLength(0)

    /* One control, and it is the way in — not an action. With one category
       there is no filter worth pre-selecting, so it opens the screen plain. */
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0].textContent).toBe('Manage valves')
    fireEvent.click(buttons[0])
    expect(where()).toBe('/valves')
  })

  it('does not draw a part-to-whole of n = 1', () => {
    const { container } = mount(
      <ValveManagementCard systems={[on('solo', 'Solo', 'closed')]} scopeLabel="One Place" />,
    )
    expect(container.querySelector('[data-name="valve-bar"]')).toBeNull()
    expect(container.textContent).toContain('All 1 system is Closed.')
    expect(screen.getByRole('button').textContent).toBe('Manage valves')
  })

  /* A wholly offline scope draws its states AT FULL COLOUR: last-known state
     is real information and suppressing it is the bigger lie. What changes is
     the reachability line, not the chart. */
  it('draws an all-offline scope normally and says nothing can be commanded', () => {
    const { container } = mount(
      <ValveManagementCard
        systems={[off('p', 'P', 'open'), off('q', 'Q', 'open'), off('r', 'R', 'closed')]}
        scopeLabel="Dark Site"
      />,
    )
    // The chart is still drawn, at full colour, over both real states.
    const segments = [...container.querySelectorAll('[data-valve-segment]')]
    expect(segments.map((s) => s.getAttribute('data-valve-segment'))).toEqual(['open', 'closed'])
    expect(rowFor(container, 'open').textContent).toMatch(/2 offline/)

    // The rows count all three; the denominator says none of them is reachable.
    expect(container.textContent).toContain('3 systems with a valve')
    expect(container.textContent).toContain('0 can be commanded')
    expect(container.textContent).toContain('3 offline')

    // And the way in is still offered — the screen is where you find out why.
    expect(entry(container)).not.toBeNull()
  })
})

describe('ValveManagementCard — the frame', () => {
  /* homeWidgetWidth.dom.test.jsx:80-82. The Home stack is
     `flex flex-col items-start`, where a child without `w-full` sizes to its
     own CONTENT. A `w-[...]` would beat `w-full` and bring the
     resizing-widget bug back. */
  it('spans the stack and pins no width of its own', () => {
    const { container } = mount(card())
    const cls = String(container.querySelector('[data-name="valve-management"]').className)
    expect(cls).toContain('w-full')
    expect(cls).not.toMatch(/(?:^|\s)w-\[/)
  })

  /* homeWidgetWidth.dom.test.jsx:106 scans `[data-slot="card-header"]` and
     `[data-slot="card-content"]`, which only the two shadcn-<Card> widgets
     emit — this card is hand-rolled like its v2 siblings, so that test cannot
     see it. The rule it protects still applies, so it is restated here over
     this card's OWN layout boxes: the header, the body and the entry bar must
     all sit on the same horizontal inset. (The scan is deliberately not
     "every element with a px-* class": the shadcn Button base carries px-4 of
     its own, and a stat tile carries px-2, which is the TILE's padding inside
     the inset rather than a card inset. Neither is one.)

     THE NUMBER IS NOT ARBITRARY AND IS NOT THIS CARD'S TO PICK: step 6 = 24px
     is the inset every sibling in the Home stack uses, so the six cards' titles
     line up down the column. A 16/24 mix is the "positions look broken"
     report, and it is the alignment — not the spelling — that this pins. */
  it('keeps one inset for the header, the body and the entry bar', () => {
    const { container } = mount(card())

    const boxes = [
      container.querySelector('[data-name="valve-header"]'),
      container.querySelector('[data-name="valve-body"]'),
      container.querySelector('[data-name="valve-entry"]'),
    ]
    expect(boxes.every(Boolean)).toBe(true)
    const insets = new Set(
      boxes.map((el) => String(el.className).match(/(?:^|\s)px-(\d+)(?:\s|$)/)?.[1]),
    )
    // 24px = Tailwind step 6. A 16/24 mix is the "positions look broken" report.
    expect([...insets]).toEqual(['6'])
  })

  /* NO PORTAL — the rule at ValveConfirmSheet.jsx:17-25, restated at
     AccountScreenV2.jsx:644-656. This app draws in a fixed 393x852 frame with
     overflow:hidden (src/components/Phone.jsx); a Radix portal attaches to
     document.body and paints across the whole browser window with the phone in
     the middle of it. The confirm sheet that used to live here is gone, which
     removes the temptation but not the rule. */
  it('puts nothing through a portal and nothing outside the card', () => {
    const { container } = mount(card())
    const root = container.querySelector('[data-name="valve-management"]')

    // Every control the test can see is inside the card itself.
    for (const btn of screen.queryAllByRole('button')) {
      expect(root.contains(btn)).toBe(true)
    }
    // Nothing escapes the frame by position, and nothing is an overlay.
    for (const el of root.querySelectorAll('[style]')) {
      expect(el.getAttribute('style') || '').not.toMatch(/position:\s*fixed/)
    }
    expect(root.querySelectorAll('.fixed')).toHaveLength(0)
    expect(document.body.querySelectorAll('[data-radix-portal]')).toHaveLength(0)
  })

  /* index.css:358-367 — --valve-error against --valve-open is dE 7.6 under
     deuteranopia, which is legal ONLY WITH SECONDARY ENCODING. WCAG 1.4.1.
     This test exists to fail whoever drops that encoding to tighten the card.

     WHAT CHANGED 2026-11-02, AND WHY IT IS STRONGER NOW. The old form demanded
     a `<ValveStatus>` GLYPH beside the swatch as well as the word. That glyph
     was removed, deliberately: it painted the same state in a DIFFERENT colour
     from the swatch six pixels away (open = green dot + blue glyph; error =
     pink dot + #FB2C36 red glyph — the exact red `index.css:376-381` rejected
     as the valve error colour at dE 2.3 under deuteranopia). Two encodings of
     one fact that disagree are worse than one. THE WORD IS THE SECONDARY
     ENCODING and always was the half doing the work: it survives at 6px, in
     every theme and in a screen reader, where a glyph does none of those. So
     the assertion is now on the word, and on the ONE atom that is allowed to
     emit a colour cue on this card. */
  it('never lets a colour chip be the only cue on a tile', () => {
    const { container } = mount(card())
    for (const key of ['error', 'open', 'closed', 'none']) {
      const row = rowFor(container, key)

      /* The one atom. If a second colour cue ever reappears beside it, this is
         the line to extend — not the one to delete. */
      const readout = row.querySelector('[data-slot="valve-state"]')
      expect(readout, `${key} tile renders no ValveStateReadout`).not.toBeNull()
      expect(readout.getAttribute('data-state')).toBe(key)
      expect(readout.querySelector('[data-slot="valve-swatch"]')).not.toBeNull()

      // And the word, which is what makes the palette legal.
      const label = VALVE_CATEGORIES.find((c) => c.key === key).label
      expect(readout.textContent).toContain(label)
    }
  })

  /* The glyph's REMOVAL, pinned — so it cannot drift back in beside the chip
     and re-create the collision described above. `ValveStatus.jsx` itself is
     untouched and still serves the per-system card; it is only this surface
     that must not draw it. */
  it('draws no second state glyph beside the chip', () => {
    const { container } = mount(card())
    const stats = container.querySelector('[data-name="valve-stats"]')
    /* The only svg left inside the stat grid is the chevron, and it is on the
       three navigating tiles. Anything else is a second encoding. */
    const svgs = [...stats.querySelectorAll('svg')]
    expect(svgs).toHaveLength(3)
    for (const svg of svgs) {
      expect(svg.hasAttribute('data-valve-chevron'), String(svg.getAttribute('class'))).toBe(true)
    }
  })
})
