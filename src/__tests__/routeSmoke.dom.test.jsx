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
import { render, cleanup } from '@testing-library/react'
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

/** One route = one case. Mount, require real output, require a clean console. */
function smoke(path, opts) {
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
  expect(text.length, `${path} rendered an essentially empty screen`).toBeGreaterThan(80)
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
    ['* (catch-all)', () => '/definitely-not-a-route'],
  ]

  for (const [label, makePath] of CASES) {
    it(`renders ${label}`, () => {
      smoke(makePath())
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
