// @vitest-environment happy-dom
/**
 * ROUTE SMOKE TEST — mounts the REAL <App /> at every route in the table.
 *
 * Why this exists: scripts/check-jsx-refs.mjs:1-11 records that eslint's
 * no-undef does NOT flag <SomeUndefinedComponent /> in this config, and that
 * the blind spot has already shipped two runtime ReferenceErrors that only
 * appeared when the component actually rendered. A route can lint, build and
 * be untested and still throw on mount.
 *
 * Nothing else in src/__tests__ mounts App itself — every other DOM test
 * wires one screen into its own MemoryRouter, which bypasses PasswordGate /
 * LoginGate / Phone / PushNotifications and the route table in App.jsx
 * entirely. So a regression in App.jsx's import list, or in a screen only
 * that table reaches, is invisible to the rest of the suite. Measured on
 * 2026-10-24: of the 27 routes, 14 were rendered by some test, 0 through App,
 * and 13 by nothing at all.
 *
 * Method: seed the two session gates, pick a persona, push the path onto
 * history (App uses BrowserRouter, not MemoryRouter), render, and fail if the
 * render throws OR if console.error / console.warn says anything that looks
 * like a React failure.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, cleanup, within } from '@testing-library/react'
import App from '@/App'
import { SYSTEMS } from '@/data/systems'

/* ── real ids from the dataset, never invented ─────────────────────────── */
const SYSTEM = SYSTEMS.find((s) => s.l2Name === 'Office') ?? SYSTEMS[0]
const LEAKY =
  SYSTEMS.find((s) => s.alert?.type === 'leak-high' || s.alert?.type === 'leak-low') ?? SYSTEM
const L4_ID = SYSTEMS.find((s) => s.l4)?.l4
const LOCATION = SYSTEMS.find((s) => s.l4Name)?.l4Name

/* ── console classification ────────────────────────────────────────────────
   A React failure that still "renders" is exactly the class of bug this file
   is for, so console is spied, not swallowed. FATAL is the signal; NOISE is
   the cosmetic React/DOM chatter that is not evidence of a broken route. */
const FATAL = [
  /element type is invalid/i,
  /type is invalid/i,
  /is not defined/i,
  /is not a function/i,
  /cannot read propert/i,
  /cannot destructure/i,
  /undefined is not an? /i,
  /failed prop type/i,
  /objects are not valid as a react child/i,
  /maximum update depth exceeded/i,
  /rendered (more|fewer) hooks/i,
  /invalid hook call/i,
  /minified react error/i,
  /the above error occurred in/i,
  /uncaught .*error/i,
]
const NOISE = [
  /unique "?key"? prop/i,
  /validatedomnesting/i,
  /non-boolean attribute/i,
  /react does not recognize/i,
  /unknown prop/i,
  /defaultprops/i,
  /not wrapped in act/i,
  /width\(0\) and height\(0\)/i, // recharts in a zero-size happy-dom box
  /\[pushBridge\]/,
]

/* Gate copy from src/i18n/locales/en.json. If either of these is on screen the
   seeding below has stopped working and every assertion underneath is
   meaningless — a gate renders fine, so the suite would go green while
   testing nothing. Verified by sabotage on 2026-10-24: dropping the
   'pulse2-auth' seed fails 29 cases on this assertion, not on anything else. */
const GATE_MARKERS = ['Enter demo password', 'Sign in as']

const fmt = (args) =>
  args
    .map((a) =>
      a instanceof Error ? `${a.name}: ${a.message}` : typeof a === 'string' ? a : String(a),
    )
    .join(' ')

let captured = []

beforeEach(() => {
  captured = []
  localStorage.clear()
  sessionStorage.clear()
  // Kill the ntfy.sh bridge: PushNotifications subscribes on mount and would
  // otherwise open an EventSource to the network from every single test.
  localStorage.setItem('pulse2-bridge-disabled', '1')
  // The two gates, read straight from App.jsx:
  //   PASSWORD_SESSION_KEY = 'pulse2-demo-pw-ok'  (PasswordGate)
  //   'pulse2-auth'                               (LoginGate)
  sessionStorage.setItem('pulse2-demo-pw-ok', '1')
  sessionStorage.setItem('pulse2-auth', 'true')
  // UserContext PERSONA_KEY
  localStorage.setItem('pulse2-persona-id', 'wint-admin')

  for (const level of ['error', 'warn']) {
    vi.spyOn(console, level).mockImplementation((...args) => {
      captured.push({ level, text: fmt(args) })
    })
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function mountAt(path, { personaId = 'wint-admin' } = {}) {
  localStorage.setItem('pulse2-persona-id', personaId)
  // App uses BrowserRouter with basename=import.meta.env.BASE_URL ('/' under
  // vitest, since vitest.config.js sets no base), so the path goes on the real
  // history object rather than into initialEntries.
  window.history.pushState({}, '', path)
  return render(<App />)
}

function reactFailures() {
  return captured.filter(
    (c) => FATAL.some((re) => re.test(c.text)) && !NOISE.some((re) => re.test(c.text)),
  )
}

/**
 * One route = one case. Mount, require real output, require a clean console.
 *
 * `minText` is the "not silently blank" floor, 80 characters by default. It is
 * a heuristic about SCREENS, and exactly one route in this app is deliberately
 * not one: /more is a placeholder the owner asked for in those words - "a new
 * screen which hides everything, but writes there Coming soon" - so it renders
 * `more.coming_soon` plus the four tab labels and nothing else, 49 characters
 * in English. Lowering the floor for that one route is honest; raising its word
 * count to satisfy a regex would mean authoring copy nobody approved, which §0
 * of .claude/skills/wint-ui-copy/SKILL.md forbids. The floor is still above
 * zero, so a /more that renders NOTHING still fails here.
 */
function smoke(path, opts) {
  const { minText = 80 } = opts || {}
  const { container } = mountAt(path, opts)
  const bad = reactFailures()
  if (bad.length) {
    throw new Error(
      `console output looks like a React failure at ${path}:\n` +
        bad.map((b) => `  [${b.level}] ${b.text}`).join('\n'),
    )
  }
  const text = container.textContent ?? ''
  for (const marker of GATE_MARKERS) {
    expect(
      text.includes(marker),
      `${path} is still behind the "${marker}" gate — the storage seeding broke, so this ` +
        `case is asserting nothing about the route`,
    ).toBe(false)
  }
  // Rendered, and rendered real content — a silently blank route is a failure too.
  expect(container.firstChild, `${path} rendered nothing at all`).toBeTruthy()
  expect(text.length, `${path} rendered an essentially empty screen`).toBeGreaterThan(minText)
  return text
}

describe('route smoke harness self-check', () => {
  /* Without these, a green run proves only that the detector never fired —
     not that there was nothing to fire at. */
  it('a throwing render is detected', () => {
    const Undefined = undefined
    const Broken = () => <Undefined />
    expect(() => render(<Broken />)).toThrow(/element type is invalid/i)
  })

  it('a React error written only to console is detected', () => {
    console.error('Warning: Failed prop type: something is not defined')
    expect(reactFailures().length).toBeGreaterThan(0)
  })

  it('cosmetic React chatter is NOT counted as a failure', () => {
    console.error('Warning: Each child in a list should have a unique "key" prop.')
    expect(reactFailures().length).toBe(0)
  })
})

describe('every route in App.jsx mounts', () => {
  it('has real dataset ids to route with', () => {
    expect(SYSTEM?.id).toBeTruthy()
    expect(LEAKY?.id).toBeTruthy()
    expect(L4_ID).toBeTruthy()
    expect(LOCATION).toBeTruthy()
  })

  const CASES = [
    ['/', () => '/'],
    ['/select', () => '/select'],
    ['/old', () => '/old'],
    ['/v1/', () => '/v1/'],
    ['/pixel', () => '/pixel'],
    ['/pixel/expanded', () => '/pixel/expanded'],
    ['/pixel/location/:locationName', () => `/pixel/location/${encodeURIComponent(LOCATION)}`],
    ['/pixel/system/:systemId', () => `/pixel/system/${SYSTEM.id}`],
    ['/location/:locationName', () => `/location/${encodeURIComponent(LOCATION)}`],
    /* /valves and /valves/:locationName are NOT in this list, and their
       absence is deliberate rather than an oversight. They are covered by
       their own describe block at the bottom of this file, which mounts the
       same two paths and asserts everything smoke() would plus the two things
       it cannot: WHICH screen arrived, and that no redirect happened. Listing
       them here as well would mount ValveManagementScreen — 103 systems
       through the full App — twice more for a strictly weaker check, and this
       suite already runs close to its 30s per-test timeout on a loaded
       machine. */
    ['/home-clear', () => '/home-clear'],
    ['/home-multi', () => '/home-multi'],
    ['/home-legacy', () => '/home-legacy'],
    ['/alerts', () => '/alerts'],
    ['/alerts/system/:systemId', () => `/alerts/system/${LEAKY.id}`],
    ['/events', () => '/events'],
    ['/events/system/:systemId', () => `/events/system/${LEAKY.id}`],
    ['/systems', () => '/systems'],
    ['/l4/:l4id', () => `/l4/${encodeURIComponent(L4_ID)}`],
    ['/system/:systemId', () => `/system/${SYSTEM.id}`],
    ['/old/system/:systemId', () => `/old/system/${SYSTEM.id}`],
    ['/v1/system/:systemId', () => `/v1/system/${SYSTEM.id}`],
    ['/kpi/:type', () => '/kpi/high-flows'],
    ['/alert/:systemId', () => `/alert/${LEAKY.id}`],
    ['/leak/:systemId', () => `/leak/${LEAKY.id}`],
    ['/account', () => '/account'],
    /* The Coming-soon placeholder. See `minText` on smoke() for why this one
       route is allowed to be two words. ADDED 2026-11-04 with the route. */
    ['/more', () => '/more', { minText: 20 }],
    ['* (catch-all)', () => '/definitely-not-a-route'],
  ]

  for (const [label, makePath, opts] of CASES) {
    it(`renders ${label}`, () => {
      smoke(makePath(), opts)
    })
  }

  // /tenant guards on persona.tabMode === 'tenant' and bounces a manager to
  // '/', so the manager pass above would never exercise the real screen.
  it('renders /tenant for a multi-apartment tenant (TenantPropertiesList)', () => {
    smoke('/tenant', { personaId: 'tenant-2apts' })
  })

  it('renders /tenant for a single-apartment tenant (redirect to the apartment)', () => {
    smoke('/tenant', { personaId: 'tenant-1apt' })
  })

  it('renders / for every persona, not just the default', () => {
    for (const id of [
      'wint-admin',
      'building-manager-residential',
      'location-manager',
      'portfolio-manager-office',
      'account-manager-subaccount',
    ]) {
      captured = []
      smoke('/', { personaId: id })
      cleanup()
    }
  })
})

/* ── THE /valves ROUTES REACH THE REAL SCREEN ──────────────────────────────
   RESTORED 2026-11-08, and this block is why the restoration is the last one.
   45b4362 ("Merge main into dev") kept every valve component file on dev's
   side, exactly as its own message ruled, but took src/App.jsx's hunk from
   main — where valve management had been reverted. The import and both
   <Route> lines went with it. 2,220 tests stayed green, because all 62 cases
   in valveManagementScreen.dom.test.jsx mount <ValveManagementScreen />
   inside their own MemoryRouter and never read App.jsx's route table at all.
   The screen was unreachable in the product and nothing said so.

   smoke() ABOVE CANNOT CATCH THIS ON ITS OWN. A path with no <Route> falls
   into `<Route path="*" element={<Navigate to="/" replace />} />`, and Home
   renders perfectly: real content, clean console, well past minText. So the
   assertion has to be about WHICH screen arrived — the sr-only <h1> that
   only ValveManagementScreen renders — and about not having been moved off
   the requested path on the way. */
describe('/valves resolves to ValveManagementScreen, not to the catch-all', () => {
  const VALVE_H1 = { level: 1, name: 'Valve management' }

  for (const [label, makePath] of [
    ['/valves', () => '/valves'],
    ['/valves/:locationName', () => `/valves/${encodeURIComponent(LOCATION)}`],
  ]) {
    it(`${label} renders the valve screen`, () => {
      const path = makePath()
      const { container } = mountAt(path)
      const bad = reactFailures()
      expect(bad.map((b) => `[${b.level}] ${b.text}`), `${path} logged a React failure`).toEqual([])
      expect(
        within(container).queryByRole('heading', VALVE_H1),
        /* No angle bracket on "Route" here on purpose: scripts/check-jsx-refs.mjs
           reads JSX usages out of the raw source and does NOT strip string
           literals, so `<Route` written in this message is reported as an
           undefined component and fails `npm test` before vitest even runs. */
        `${path} did not render ValveManagementScreen — if it fell through to the ` +
          `catch-all, App.jsx has lost its Route for "${label}" again`,
      ).toBeTruthy()
      expect(window.location.pathname, `${path} was redirected away`).toBe(path)
    })
  }

  /* THE NEGATIVE CONTROL. Without it the two cases above prove only that the
     heading exists somewhere in the app — not that the ROUTE is what put it
     there. If the catch-all's destination ever started rendering this screen,
     both would pass while the routes stayed missing. */
  it('a path with no route redirects to / and does NOT render the valve screen', () => {
    const { container } = mountAt('/valves-but-not-a-route')
    expect(within(container).queryByRole('heading', VALVE_H1)).toBeNull()
    expect(window.location.pathname).toBe('/')
  })
})
