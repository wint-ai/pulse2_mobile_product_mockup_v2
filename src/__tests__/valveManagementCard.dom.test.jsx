// @vitest-environment happy-dom
//
// ValveManagementCard — a READ-ONLY readout of valve states across a location
// or an account, and the way in to the screen that manages them.
//
// ── THE DONUT CAME BACK (2026-11-03), AND THESE CASES CAME BACK WITH IT ──
// On 2026-11-02 the donut was REMOVED and this file recorded three cases that
// died with it. The owner has now overruled that removal, having seen the
// replacement rendered: "the valve status widget, I don't think the current
// solution is the best visualization for that. Maybe we can try something else
// like PyChart donut or something like that."
//
// THE REMOVAL ARGUMENT IS NOT RESTATED HERE AND IS NOT RE-LITIGATED. It is
// kept in full, scored objection by objection, in the component's header. What
// matters to a test file is which of its claims are now MACHINE-CHECKABLE:
//
//   · "NOT TO SCALE below 1.7%" — THE STRONGEST OBJECTION, AND IT IS NOW
//     ANSWERED BY CONSTRUCTION. There is no MIN_SWEEP_DEG and no sweep
//     algorithm. Three cases below pin that: exact proportionality across all
//     four slices, a 1-of-400 slice drawn at its true share, and the same
//     slice doubling when its count doubles. If anyone ever re-floors a slice
//     "so it can be seen", those three go red together.
//   · "NOT TAPPABLE" — answered by moving the target off the arcs. The legend
//     ROWS are the 44px buttons and still carry every deep link; the arcs are
//     inert and are pinned inert.
//   · "DID NOT ENCODE OFFLINE" — still true, still correct, still pinned: an
//     offline system is ALSO open/closed/error, so a fifth arc would make the
//     ring sum to more than the scope.
//
// The old "the bar is decorative, the stat row is the control" intent survives
// verbatim under a new mark: a chart must not LOOK like a control unless it IS
// one. The ring is not, so it is inert; the legend rows are, so they are
// buttons.
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

  /* THE DENOMINATOR LINE IS GONE, DELETED 2026-11-03 AT THE OWNER'S
     INSTRUCTION: "remove this sentence. I want it much more clear." He was
     offered a gap-only line, an outright delete, or moving it onto the button,
     and chose the delete with nothing in its place.

     HE IS ALSO RIGHT ON THE MERITS, which is why this is an absence case
     rather than a skipped one. The line read
       `7 systems with a valve · 5 can be commanded · 1 offline`
     and its first and third numbers COUNTED DIFFERENT POPULATIONS: "with a
     valve" excludes the No-valve systems, while the offline total includes
     them. Two of its three numbers were also already on screen - the first is
     the scope minus the No-valve row, the third is the sum of the per-row
     sub-counts directly above it. The only non-derivable number was "can be
     commanded", and the fact worth having (the GAP it implied) was never
     stated. See THE DENOMINATOR LINE IS GONE in the component header.

     THIS CASE EXISTS SO IT CANNOT COME BACK QUIETLY. Its companion, two
     describes down, pins that the per-row offline sub-counts SURVIVED - which
     is the half of the owner's requirement this card still carries. */
  it('states no denominator line at all, in any of its three clauses', () => {
    const { container } = mount(card())

    expect(container.querySelector('[data-name="valve-denominator"]')).toBeNull()
    for (const phrase of [/with a valve/i, /can be commanded/i, /commandable/i]) {
      expect(container.textContent, `the denominator line is back: ${phrase}`).not.toMatch(phrase)
    }

    /* And the numbers it alone carried are not restated anywhere else on the
       card under another name. 7 and 5 are its own; 9 is the scope and is
       legitimately in the legend's accessible name. */
    const legend = container.querySelector('[data-name="valve-stats"]')
    expect(legend.getAttribute('aria-label')).toBe('Valve status across 9 systems')
  })
})

describe('ValveManagementCard — the owner\'s requirement survives the strip', () => {
  /* THE CENTRAL TEST OF THIS FILE, and the reason a readout with no buttons on
     it is still worth drawing. The Open row counts 5 because the offline
     system is genuinely Open and genuinely in the scope, AND it says beside
     itself that one of those five cannot be reached. Those are two different
     questions and they are answered separately; if they ever collapse into one
     number, that number is lying about one of them.

     THE PER-ROW SUB-COUNT IS NOW THE ONLY OFFLINE ENCODING ON THIS CARD. The
     denominator line that used to restate the total was deleted on 2026-11-03
     (see the absence case above). So this case is no longer one of two sites
     proving the owner's requirement - it is the ONLY one on this surface, and
     it is why the deletion did not take the requirement with it. The full
     accounting lives where the action does: `ValveManagementScreen` and
     `BulkValveConfirmSheet`, which size every batch with `targetsFor` and name
     the systems they skip. */
  it('counts the offline system in the row and says so on the row itself', () => {
    const { container } = mount(card())

    const open = rowFor(container, 'open')
    expect(open.textContent).toMatch(/Open/)
    expect(open.textContent).toMatch(/5/)
    // The cross-tab, stated per row rather than left for the eye to integrate.
    expect(open.textContent).toMatch(/1 offline/)
    // And in the accessible name, because the chevron is a sighted-only promise.
    expect(open.getAttribute('aria-label')).toMatch(/1 offline/)

    /* It is its OWN element, not a fragment of the row's text: a sub-count
       that only exists inside `textContent` is one layout change away from
       being concatenated into the count beside it. */
    const note = [...open.querySelectorAll('span')].find((el) =>
      /^\W*1 offline$/.test(el.textContent),
    )
    expect(note, 'the Open row states its offline sub-count only as loose text').toBeTruthy()

    /* AND IT IS NOT THERE BY ACCIDENT: a category with no offline systems
       states nothing, so the note tracks the data rather than decorating every
       row. MIXED puts its one offline system inside Open and nowhere else. */
    expect(rowFor(container, 'closed').textContent).not.toMatch(/offline/)
    expect(rowFor(container, 'error').textContent).not.toMatch(/offline/)
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

describe('ValveManagementCard - the ring is decorative, the legend is the control', () => {
  /* THE SURVIVING INTENT of the 2026-11-02 cases, re-expressed under the mark
     the owner chose. The rule was never "arcs" or "bars" specifically: it is
     that a chart must not LOOK like a control unless it IS one. The donut
     failed that from one side in its first life - it looked like a target and
     could not be one, because at a 361px card no arc reaches 44px radially at
     any share. It is settled now by moving the target OFF the arcs: the ring
     is honestly inert and the legend rows are honestly buttons. */
  it('exposes the ring to nothing - not a reader, not a pointer, not the tab order', () => {
    const { container } = mount(card())
    const ring = container.querySelector('[data-name="valve-bar"]')
    expect(ring, 'no donut').not.toBeNull()

    expect(ring.getAttribute('aria-hidden')).toBe('true')
    expect(String(ring.className)).toContain('pointer-events-none')

    /* THE SVG ITSELF carries it too, and not only the wrapper. A wrapper-only
       `aria-hidden` is one refactor away from being dropped, and an svg full
       of coloured arcs that a reader walks into announces nothing useful. */
    const svg = ring.querySelector('svg')
    expect(svg, 'the ring draws no svg').not.toBeNull()
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('focusable')).toBe('false')
    expect(String(svg.getAttribute('class'))).toContain('pointer-events-none')

    /* The ring's one piece of text is the centre total, and it is inside the
       `aria-hidden` wrapper ON PURPOSE - a reader that announced it here AND
       read the legend would state the scope twice. The total reaches a reader
       exactly once, through the legend's accessible name, asserted below. */
    expect(ring.textContent).toContain('9')
    expect(ring.textContent).toContain('systems')

    for (const arc of ring.querySelectorAll('[data-valve-segment]')) {
      expect(arc.tagName.toLowerCase()).toBe('circle')
      expect(arc.hasAttribute('tabindex')).toBe(false)
      expect(arc.hasAttribute('onclick')).toBe(false)
    }
    expect(within(ring).queryAllByRole('button')).toHaveLength(0)
    for (const btn of screen.queryAllByRole('button')) {
      expect(ring.contains(btn), 'a control ended up inside the chart').toBe(false)
    }
  })

  /* The scope total is the one number the ring adds that the legend rows do
     not carry. It must not be lost to a reader just because the ring is
     hidden, so it lives in the legend's accessible name instead. */
  it('states the scope total once, in the legend accessible name', () => {
    const { container } = mount(card())
    const legend = container.querySelector('[data-name="valve-stats"]')
    expect(legend.getAttribute('aria-label')).toBe('Valve status across 9 systems')
  })

  /* THE OTHER HALF, and the thing the arcs could never do at any size: the
     chart is a CONTROL. Every category the card draws is a button, and
     pressing it filters the list. */
  it('makes every drawn category a real button, and the ring their only decoration', () => {
    const { container } = mount(card())

    const rows = [...container.querySelectorAll('[data-valve-row]')]
    expect(rows).toHaveLength(4)
    for (const row of rows) {
      expect(row.tagName.toLowerCase(), row.getAttribute('data-valve-row')).toBe('button')
    }

    /* Nothing else on the card is a control except the way in - so there is no
       third thing competing with the rows for the reader's attention. */
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
    expect(buttons.filter((b) => b.hasAttribute('data-valve-entry'))).toHaveLength(1)
  })

  /* -- THE GEOMETRY, READ BACK OFF WHAT IS ACTUALLY DRAWN -----------------
     These cases are the whole reason the donut is allowed back. The version
     deleted in b7749a8 floored every slice at MIN_SWEEP_DEG and its own header
     admitted "below 1.7% THE DONUT IS NO LONGER TO SCALE". That dishonesty was
     the strongest argument against it, and it is the one thing that may never
     return.

     Everything is read off `stroke-dasharray` / `stroke-dashoffset`, which is
     the geometry the browser paints - not off a prop and not off a class. The
     gap constant is DERIVED from the first slice rather than retyped here, so
     this file cannot drift from the component's own value: slice 0 starts at
     cumulative 0, so its dash offset is exactly half a gap. */
  const CIRCUMFERENCE = 2 * Math.PI * 40

  const arcsOf = (container) =>
    [...container.querySelectorAll('[data-valve-segment]')].map((el) => {
      const [drawn, rest] = String(el.getAttribute('stroke-dasharray'))
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number)
      return {
        key: el.getAttribute('data-valve-segment'),
        count: Number(el.getAttribute('data-valve-count')),
        drawn,
        rest,
        start: -Number(el.getAttribute('stroke-dashoffset')),
      }
    })

  it('draws one arc per non-zero count, in order, at EXACTLY its share', () => {
    const { container } = mount(card())
    const arcs = arcsOf(container)

    expect(arcs.map((a) => a.key)).toEqual(VALVE_CATEGORIES.map((c) => c.key))
    // MIXED: error 1, open 5, closed 1, none 2.
    expect(arcs.map((a) => a.count)).toEqual([1, 5, 1, 2])

    const sum = arcs.reduce((a, x) => a + x.count, 0)
    expect(sum, 'the ring does not sum to the scope').toBe(9)

    /* The gap, derived: start_0 = 0 + gap/2. */
    const gap = 2 * arcs[0].start
    expect(gap, 'no parting between adjacent arcs').toBeGreaterThan(0)

    let cumulative = 0
    for (const a of arcs) {
      const trueLength = (a.count / sum) * CIRCUMFERENCE
      const bite = Math.min(gap, trueLength / 2)

      /* 1. NO SLICE IS EVER DRAWN LARGER THAN ITS SHARE. This is the single
            assertion MIN_SWEEP_DEG could not have passed: it INFLATED small
            slices, which lies in the direction that matters - it makes a rare
            bad state look commoner than it is. */
      expect(a.drawn, `${a.key} is drawn larger than its share`).toBeLessThanOrEqual(
        trueLength + 1e-9,
      )

      /* 2. And it is drawn at exactly its share less the parting, which is the
            only subtraction in the whole component. */
      expect(a.drawn, `${a.key} is not to scale`).toBeCloseTo(trueLength - bite, 9)

      /* 3. THE BOUNDARIES LAND ON THE TRUE CUMULATIVE FRACTIONS. However the
            parting is apportioned, the centre of each gap - which is what a
            reader sees as the edge between two categories - sits where the
            real proportion says it does. */
      expect(a.start - bite / 2, `${a.key} starts off its true boundary`).toBeCloseTo(
        (cumulative / sum) * CIRCUMFERENCE,
        9,
      )

      // The dash pattern closes the circle, so no arc wraps onto the next.
      expect(a.drawn + a.rest).toBeCloseTo(CIRCUMFERENCE, 9)
      cumulative += a.count
    }
  })

  /* THE CASE THE OLD DONUT FAILED. One faulted system in a scope of 400 is 0.9
     degrees of ring. It must draw at 0.9 degrees - very nearly invisible, and
     that is CORRECT, because the legend row beside it says "1" in text and
     TEXT IS THE AUTHORITY. The deleted implementation drew this at its 1.7%
     floor, which is 6.1 degrees: nearly SEVEN TIMES its true share. */
  const drawnErrorsIn = (errors, opens) => {
    const systems = [
      ...Array.from({ length: errors }, (_, i) => on(`e${i}`, `E${i}`, 'error')),
      ...Array.from({ length: opens }, (_, i) => on(`o${i}`, `O${i}`, 'open')),
    ]
    const { container } = mount(<ValveManagementCard systems={systems} scopeLabel="Big Fleet" />)
    const arcs = arcsOf(container)
    expect(arcs.map((a) => a.key)).toEqual(['error', 'open'])
    const found = arcs.find((a) => a.key === 'error')
    cleanup()
    return found
  }

  it('draws a 1-of-400 slice at its true share, with no floor under it', () => {
    const error = drawnErrorsIn(1, 399)
    const trueLength = CIRCUMFERENCE / 400

    expect(error.count).toBe(1)
    // Present - a non-zero count never rounds away entirely.
    expect(error.drawn).toBeGreaterThan(0)
    // And never inflated.
    expect(error.drawn).toBeLessThanOrEqual(trueLength)

    /* The old floor was MIN_SWEEP_DEG / 360 = 1.7% of the ring. If anything
       ever re-introduces a floor, this is the line that catches it. */
    const oldFloor = 0.017 * CIRCUMFERENCE
    expect(
      error.drawn,
      'a minimum sweep is back: this slice is drawn far wider than 1 of 400',
    ).toBeLessThan(oldFloor)
  })

  /* THE PROOF THAT THE GAP CLAMP IS NOT A FLOOR IN DISGUISE. Inside the
     clamped regime - where a slice is too small to give up a whole 2px parting
     - every slice draws at half its true length, so proportionality is STILL
     exact: double the count, double the arc. A floor would flatten both to the
     same width, which is precisely what the deleted version did. */
  it('scales a tiny slice with its count instead of flattening it', () => {
    const one = drawnErrorsIn(1, 399)
    const two = drawnErrorsIn(2, 398)

    expect(one.count).toBe(1)
    expect(two.count).toBe(2)
    expect(two.drawn / one.drawn, 'two systems do not draw twice one system').toBeCloseTo(2, 6)
  })

  it('draws no arc at all for a category with a zero count', () => {
    const { container } = mount(
      <ValveManagementCard
        systems={[on('a', 'A', 'open'), on('b', 'B', 'open'), on('c', 'C', 'closed')]}
        scopeLabel="Tel Aviv HQ"
      />,
    )
    expect(arcsOf(container).map((a) => a.key)).toEqual(['open', 'closed'])
  })

  /* OFFLINE IS NOT AN ARC, AND MUST NOT BECOME ONE. An offline system is ALSO
     open, closed or in error - it is already inside one of the four arcs - so
     a fifth arc would count it twice and make the ring sum to more than the
     scope. It belongs to the muted denominator line and to its own legend
     row's sub-line, which is where this asserts it is. */
  it('keeps the offline count outside the ring', () => {
    const { container } = mount(card())
    const arcs = arcsOf(container)

    const known = VALVE_CATEGORIES.map((c) => c.key)
    expect(
      arcs.every((a) => known.includes(a.key)),
      `an arc outside the four: ${arcs.map((a) => a.key)}`,
    ).toBe(true)
    expect(arcs.map((a) => a.key)).not.toContain('offline')

    // The arcs sum to the scope, not to the scope plus its offline systems.
    const sum = arcs.reduce((a, x) => a + x.count, 0)
    expect(sum, 'the ring double-counts if offline is folded in').toBe(9)

    /* And the count itself is stated - on the legend row, outside the chart.
       This used to read off the denominator line; that line was deleted on
       2026-11-03, and the assertion moved onto the surviving site rather than
       being dropped, because what it protects is "offline is stated SOMEWHERE
       in text and NOT as an arc". */
    const ring = container.querySelector('[data-name="valve-bar"]')
    const open = rowFor(container, 'open')
    expect(open.textContent).toContain('1 offline')
    expect(ring.contains(open), 'the offline count ended up inside the ring').toBe(false)
    expect(ring.textContent).not.toMatch(/offline/)
  })

  /* THE PER-ROW OFFLINE SUB-COUNT, which is the owner's hard requirement and
     the half of it that is NOT on the denominator line. It is muted ink with
     no hue of its own: offline is a reachability fact, not a valve state, and
     giving it a colour would file it under the same visual system as the
     three states. */
  it('states the per-category offline count on the row, in muted ink', () => {
    const { container } = mount(card())
    const open = rowFor(container, 'open')
    const note = [...open.querySelectorAll('span')].find((el) =>
      /^\W*1 offline$/.test(el.textContent),
    )
    expect(note, 'the Open row states no offline sub-count').toBeTruthy()
    expect(String(note.className)).toContain('text-muted-foreground')
    expect(String(note.className)).not.toMatch(/text-valve-|bg-valve-/)

    // A row with no offline systems states nothing at all.
    expect(rowFor(container, 'closed').textContent).not.toMatch(/offline/)
  })

  /* THE TOUCH TARGET, AS A RULE RATHER THAN A STRING, and the direct answer to
     objection (c): the arcs were never meant to be targets, the LEGEND ROWS
     are. The old case asserted a literal `min-h-[48px]`, which pinned a
     spelling instead of a requirement. What matters is 44px (WCAG 2.5.5 / the
     house floor), so that is what is read - off whichever `min-h-*` class sets
     it. happy-dom cannot measure a box, so the class is the only honest proxy
     available here; the real check is a browser. */
  it('gives every legend row a touch target of at least 44px', () => {
    const { container } = mount(card())
    for (const key of ['error', 'open', 'closed', 'none']) {
      const cls = String(rowFor(container, key).className)
      const scaleStep = cls.match(/(?:^|\s)min-h-(\d+(?:\.\d+)?)(?:\s|$)/)?.[1]
      const literal = cls.match(/(?:^|\s)min-h-\[(\d+)px\](?:\s|$)/)?.[1]
      const px = scaleStep ? Number(scaleStep) * 4 : Number(literal)
      expect(Number.isFinite(px), `${key} declares no minimum height: ${cls}`).toBe(true)
      expect(px, `${key} row is under the 44px floor`).toBeGreaterThanOrEqual(44)
    }
  })

  /* TOKENS ONLY, NEVER A HEX. A Tailwind colour utility naming a token this
     repo does not define falls through to STOCK Tailwind and then FREEZES
     across all four themes - a silently uncoloured arc rather than an error.
     happy-dom applies no stylesheet, so it cannot tell a resolved token from a
     frozen one; what it CAN prove is that no arc paints with an inline colour,
     which is the failure mode no theme can reach at all. The four-theme check
     itself was done in a browser and is recorded in the component header. */
  it('paints every arc through a token utility and never an inline colour', () => {
    const { container } = mount(card())
    const arcs = [...container.querySelectorAll('[data-valve-segment]')]
    expect(arcs).toHaveLength(4)

    for (const arc of arcs) {
      const cls = String(arc.getAttribute('class'))
      expect(cls, `${arc.getAttribute('data-valve-segment')} has no stroke utility`).toMatch(
        /(?:^|\s)stroke-(?:valve-(?:open|closed|error)|border)(?:\s|$)/,
      )
      // No inline paint, in either spelling, and no hex anywhere on the node.
      expect(arc.getAttribute('style') || '').not.toMatch(/stroke|fill|color/i)
      expect(arc.getAttribute('stroke')).toBeNull()
      expect(arc.outerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    }

    // `none` gets NO fill - the muted border token, as <ValveSwatch> draws it.
    const none = arcs.find((a) => a.getAttribute('data-valve-segment') === 'none')
    expect(String(none.getAttribute('class'))).toContain('stroke-border')
    expect(String(none.getAttribute('class'))).not.toMatch(/stroke-valve-/)
    expect(none.getAttribute('fill')).toBe('none')
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
    // One series needs no legend - the headline names it.
    expect(container.textContent).toContain('All 3 systems are Open.')
    expect(container.querySelectorAll('[data-valve-row]')).toHaveLength(0)

    /* AND NO RING. A part-to-whole of a single category is a 100% circle: it
       says nothing the sentence does not say better, and it would be 104px of
       pure decoration on a card whose weakest dimension is its height. The
       SegmentedBar build drew a single full-width segment here; that mark went
       with the bar. Same argument the n = 1 case already made, applied to one
       CATEGORY rather than one SYSTEM. */
    expect(container.querySelector('[data-name="valve-bar"]')).toBeNull()
    expect(container.querySelectorAll('[data-valve-segment]')).toHaveLength(0)

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
  it('draws an all-offline scope normally and marks every row unreachable', () => {
    const { container } = mount(
      <ValveManagementCard
        systems={[off('p', 'P', 'open'), off('q', 'Q', 'open'), off('r', 'R', 'closed')]}
        scopeLabel="Dark Site"
      />,
    )
    /* The ring is still drawn, AT FULL COLOUR, over both real states.
       Last-known state is real information; greying it out to signal
       unreachability is the bigger lie. What changes is the reachability line
       below, not the chart. */
    const arcs = [...container.querySelectorAll('[data-valve-segment]')]
    expect(arcs.map((a) => a.getAttribute('data-valve-segment'))).toEqual(['open', 'closed'])
    for (const arc of arcs) {
      expect(String(arc.getAttribute('class')), 'an offline scope dimmed its arcs').toMatch(
        /stroke-valve-(?:open|closed)/,
      )
    }
    expect(rowFor(container, 'open').textContent).toMatch(/2 offline/)

    /* The rows count all three AND say all three are unreachable, per
       category. The denominator line that used to total this was deleted on
       2026-11-03; what replaced it is nothing, so the per-row sub-counts are
       the whole of the warning and are asserted as such. */
    expect(container.querySelector('[data-name="valve-denominator"]')).toBeNull()
    expect(rowFor(container, 'open').textContent).toMatch(/2 offline/)
    expect(rowFor(container, 'closed').textContent).toMatch(/1 offline/)
    // And the aria-labels, because a chevron is a sighted-only promise.
    expect(rowFor(container, 'open').getAttribute('aria-label')).toMatch(/2 offline/)
    expect(rowFor(container, 'closed').getAttribute('aria-label')).toMatch(/1 offline/)

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
  it('never lets a colour chip be the only cue on a legend row', () => {
    const { container } = mount(card())
    for (const key of ['error', 'open', 'closed', 'none']) {
      const row = rowFor(container, key)

      /* THE ONE ATOM, in its bare-chip form. `ValveStateReadout.jsx` exports
         `<ValveSwatch>` alone for exactly this case and states the condition:
         "it is for places where the word is ALREADY on screen next to it in
         the caller's own markup - the chart legend, a filter-sheet option
         row." This IS the chart legend, and the row writes the word itself in
         its own type. If a SECOND colour cue ever appears beside it, this is
         the line to extend - not the one to delete. */
      const swatches = [...row.querySelectorAll('[data-slot="valve-swatch"]')]
      expect(swatches, `${key} row renders no swatch`).toHaveLength(1)
      expect(swatches[0].getAttribute('data-state')).toBe(key)
      expect(swatches[0].getAttribute('aria-hidden')).toBe('true')

      /* AND THE WORD, which is what makes the palette legal: index.css:358-367
         puts --valve-error against --valve-open at dE 7.6 under deuteranopia,
         "legal ONLY WITH SECONDARY ENCODING". The word is that encoding, it is
         not optional, and it is read off its OWN element so a count or an
         offline note elsewhere in the row cannot stand in for it. */
      const label = VALVE_CATEGORIES.find((c) => c.key === key).label
      const word = row.querySelector(`[data-valve-label="${key}"]`)
      expect(word, `${key} row writes no category word`).not.toBeNull()
      expect(word.textContent).toBe(label)
      // The word must not be the thing that gets dropped to save width.
      expect(String(word.className)).not.toContain('sr-only')
      expect(String(word.className)).not.toContain('hidden')
    }
  })

  /* The glyph's REMOVAL, pinned — so it cannot drift back in beside the chip
     and re-create the collision described above. `ValveStatus.jsx` itself is
     untouched and still serves the per-system card; it is only this surface
     that must not draw it. */
  it('draws no second state glyph beside the chip', () => {
    const { container } = mount(card())
    const stats = container.querySelector('[data-name="valve-stats"]')
    /* The only svg left inside the LEGEND is the chevron, and it is on the
       three navigating rows. Anything else is a second encoding. The donut's
       own svg is deliberately OUTSIDE the legend - it is the chart, not a
       per-row mark - and this selector proves that placement too. */
    const svgs = [...stats.querySelectorAll('svg')]
    expect(svgs).toHaveLength(3)
    for (const svg of svgs) {
      expect(svg.hasAttribute('data-valve-chevron'), String(svg.getAttribute('class'))).toBe(true)
    }
    expect(stats.querySelector('[data-valve-segment]'), 'the ring is inside the legend').toBeNull()

    /* THE RAGGED-CHEVRON DEFECT, FIXED BY CONSTRUCTION. The 2x2 grid let an
       offline sub-count push a tile's chevron right, so the two columns never
       lined up. Every row now ends in a fixed trailing slot, and the row with
       no chevron reserves its width with a spacer rather than collapsing it. */
    const trailing = ['error', 'open', 'closed', 'none'].map((key) => {
      const line = rowFor(container, key).firstElementChild
      return line.lastElementChild
    })
    for (const slot of trailing) {
      expect(String(slot.getAttribute('class'))).toMatch(/(?:^|\s)size-4(?:\s|$)/)
      expect(String(slot.getAttribute('class'))).toContain('shrink-0')
    }
    // Three are chevrons; the fourth is the reserved spacer and draws nothing.
    expect(trailing.filter((s) => s.hasAttribute('data-valve-chevron'))).toHaveLength(3)
    expect(trailing[3].tagName.toLowerCase()).toBe('span')
    expect(trailing[3].textContent).toBe('')
  })
})
