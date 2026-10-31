// @vitest-environment happy-dom
/**
 * The concealed on-phone trigger for the push simulator.
 *
 * The whole feature IS touch behaviour, so these drive real touch sequences
 * rather than synthetic clicks: a click never exercises the hold timer, the
 * slop budget, the scroll cancel or the finger count, which are the four
 * things that decide whether a presenter can hold a corner for a second and a
 * half without the app doing something else instead.
 *
 * The last block is a canary, not a feature test. The gesture refuses to fire
 * while PushNotifications has its lock screen / shade / other-app surface up,
 * and the only way to read that state without editing that file is its
 * rendered output: absolute + z-index 300. If that z-index ever moves, this
 * goes red - which is much better than the gesture quietly opening a sheet
 * underneath a lock screen in front of a room.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { render, act, cleanup, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { UserProvider } from '@/context/UserContext'
import PushSimTrigger from '@/v2/components/PushSimTrigger'
import { isSimulatedSurfaceShowing, BLOCKING_Z_INDEX } from '@/lib/simulatedSurface'
import {
  firePushCard, fireOnSurface, defaultVariantId, isCardEligible,
  DELIVERY_SURFACES, SURFACE_SETTLE_MS,
} from '@/lib/pushSimFire'
import { PUSH_CATALOG } from '@/data/pushCatalog'

/* The phone body as the anchor measures it: a 393x852 frame at the origin.
   happy-dom lays nothing out, so without this every rect is zero and the hook
   deliberately refuses to fire (an unmeasured anchor would put the zone in
   the wrong corner). The zone is the BOTTOM-RIGHT 64x64 of that box —
   x in [329,393], y in [788,852] — which is where the hit-test probe found
   inert TabBar padding on `/`, `/system/:id` and `/location/:name`. */
const SHELL = { top: 0, left: 0, right: 393, bottom: 852, width: 393, height: 852, x: 0, y: 0 }
const IN_ZONE = { x: 370, y: 828 }
/* The corner this gesture used to live in, and must never fire from again:
   on `/` it holds avatar.jpg and the control that navigates to /account. */
const OLD_TOP_RIGHT = { x: 370, y: 24 }

function stubAnchor() {
  const anchor = document.querySelector('[data-push-sim-anchor]')
  expect(anchor).toBeTruthy()
  anchor.getBoundingClientRect = () => ({ ...SHELL, toJSON: () => SHELL })
  return anchor
}

function touch(type, points) {
  const e = new Event(type, { bubbles: true, cancelable: true })
  const list = points.map((p) => ({ clientX: p.x, clientY: p.y, identifier: 0, target: document.body }))
  Object.defineProperty(e, 'touches', { value: list })
  Object.defineProperty(e, 'changedTouches', { value: list })
  return e
}

function dispatch(type, points) {
  act(() => { document.body.dispatchEvent(touch(type, points)) })
}

function mount() {
  return render(
    <MemoryRouter>
      <UserProvider>
        {/* The relative wrapper PushNotifications puts around its children,
            which is the box the anchor stretches inside. */}
        <div style={{ position: 'relative' }}>
          <PushSimTrigger />
        </div>
      </UserProvider>
    </MemoryRouter>,
  )
}

const sheet = () => screen.queryByRole('dialog', { name: 'Push simulator' })

describe('concealed long-press to push simulator sheet', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/')
    localStorage.setItem('pulse2-persona-id', 'wint-admin')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    localStorage.clear()
  })

  it('opens on a one-finger hold in the top-right zone, held past 1200ms', () => {
    mount()
    stubAnchor()
    expect(sheet()).toBeNull()

    dispatch('touchstart', [IN_ZONE])
    // Still nothing at a second - 1200ms is the bar, not 500ms.
    act(() => { vi.advanceTimersByTime(1000) })
    expect(sheet()).toBeNull()

    act(() => { vi.advanceTimersByTime(300) })
    dispatch('touchend', [IN_ZONE])
    expect(sheet()).not.toBeNull()
  })

  it('does not open from the old top-right corner — it sits on the avatar', () => {
    mount()
    stubAnchor()
    dispatch('touchstart', [OLD_TOP_RIGHT])
    act(() => { vi.advanceTimersByTime(2000) })
    dispatch('touchend', [OLD_TOP_RIGHT])
    expect(sheet()).toBeNull()
  })

  it('does not open on a 300ms press', () => {
    mount()
    stubAnchor()
    dispatch('touchstart', [IN_ZONE])
    act(() => { vi.advanceTimersByTime(300) })
    dispatch('touchend', [IN_ZONE])
    act(() => { vi.advanceTimersByTime(2000) })
    expect(sheet()).toBeNull()
  })

  it('does not open when the finger drifts 20px - past the 10px budget', () => {
    mount()
    stubAnchor()
    dispatch('touchstart', [IN_ZONE])
    act(() => { vi.advanceTimersByTime(400) })
    dispatch('touchmove', [{ x: IN_ZONE.x, y: IN_ZONE.y + 20 }])
    act(() => { vi.advanceTimersByTime(2000) })
    dispatch('touchend', [{ x: IN_ZONE.x, y: IN_ZONE.y + 20 }])
    expect(sheet()).toBeNull()
  })

  it('does not open from outside the 64x64 zone', () => {
    mount()
    stubAnchor()
    dispatch('touchstart', [{ x: 100, y: 300 }])
    act(() => { vi.advanceTimersByTime(2000) })
    expect(sheet()).toBeNull()
  })

  it('does not open for two fingers', () => {
    mount()
    stubAnchor()
    dispatch('touchstart', [IN_ZONE, { x: 360, y: 40 }])
    act(() => { vi.advanceTimersByTime(2000) })
    expect(sheet()).toBeNull()
  })

  it('is cancelled by a scroll anywhere in the page', () => {
    mount()
    stubAnchor()
    dispatch('touchstart', [IN_ZONE])
    act(() => { vi.advanceTimersByTime(400) })
    act(() => { document.body.dispatchEvent(new Event('scroll', { bubbles: true })) })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(sheet()).toBeNull()
  })

  it('is inert while a simulated phone surface is up', () => {
    const { container } = mount()
    stubAnchor()

    /* The lock screen / shade / other-app root as PushNotifications draws it
       (:311, :390, :467) - inline style, position absolute, z-index 300. */
    const surface = document.createElement('div')
    surface.setAttribute('style', 'position: absolute; inset: 0px; z-index: 300;')
    container.appendChild(surface)
    expect(isSimulatedSurfaceShowing()).toBe(true)

    dispatch('touchstart', [IN_ZONE])
    act(() => { vi.advanceTimersByTime(2000) })
    dispatch('touchend', [IN_ZONE])
    expect(sheet()).toBeNull()

    // Remove it and the same gesture works again - the block is a live read,
    // not a latch.
    surface.remove()
    dispatch('touchstart', [IN_ZONE])
    act(() => { vi.advanceTimersByTime(1300) })
    dispatch('touchend', [IN_ZONE])
    expect(sheet()).not.toBeNull()
  })

  /* REGRESSION. The gesture fired, the sheet opened, and the trailing
     synthetic click immediately closed it again - because the click guard was
     installed inside the same effect that `enabled: !open` tears down the
     instant the sheet opens. Caught only in a real browser. The click must be
     swallowed in the capture phase, so neither the sheet's own scrim nor
     anything under the finger ever sees it. */
  it('swallows exactly one trailing click, so the sheet it just opened survives it', () => {
    mount()
    stubAnchor()
    const seen = []
    const spy = (e) => seen.push(e.type)
    document.addEventListener('click', spy)

    dispatch('touchstart', [IN_ZONE])
    act(() => { vi.advanceTimersByTime(1300) })
    dispatch('touchend', [IN_ZONE])
    expect(sheet()).not.toBeNull()

    // The click the OS sends after the long press.
    act(() => { document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })) })
    expect(seen).toEqual([])
    expect(sheet()).not.toBeNull()

    // One click only - the guard takes itself off, it does not eat the next tap.
    act(() => { document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })) })
    expect(seen).toEqual(['click'])
    document.removeEventListener('click', spy)
  })

  it('leaves the in-app banner alone - it is z-250 and must not block', () => {
    const { container } = mount()
    const banner = document.createElement('div')
    banner.setAttribute('style', 'position: absolute; top: 6px; z-index: 250;')
    container.appendChild(banner)
    expect(isSimulatedSurfaceShowing()).toBe(false)
  })
})

describe('?sim=1 - the desktop escape hatch', () => {
  beforeEach(() => { localStorage.setItem('pulse2-persona-id', 'wint-admin') })
  afterEach(() => {
    cleanup()
    window.history.replaceState({}, '', '/')
    localStorage.clear()
  })

  it('opens the sheet and strips itself from the URL without persisting anything', () => {
    window.history.replaceState({}, '', '/system/MRG-OFF-001?sim=1&theme=contrast')
    const before = { ...localStorage }
    mount()
    expect(sheet()).not.toBeNull()
    // Ours is gone; anything else in the query survives.
    expect(window.location.search).not.toContain('sim=1')
    expect(window.location.search).toContain('theme=contrast')
    // Nothing was remembered - the gesture is the gate every time.
    expect({ ...localStorage }).toEqual(before)
    expect(sessionStorage.getItem('pulse2-sim')).toBeNull()
  })

  /* REGRESSION. Phone.jsx swaps DesktopFrame for MobileLayout as soon as
     useIsMobile's effect runs, which unmounts and remounts this whole subtree
     milliseconds into every load on a handset. The sheet used to flash and
     vanish: the first mount read `sim`, stripped it, and the remount read a
     URL that no longer had it. Also caught only in a real browser. */
  it('survives the remount Phone.jsx forces a moment after load', () => {
    window.history.replaceState({}, '', '/?sim=1')
    const first = mount()
    expect(sheet()).not.toBeNull()
    // `sim` is already gone from the URL by the time the remount happens.
    expect(window.location.search).not.toContain('sim=1')
    first.unmount()
    mount()
    expect(sheet()).not.toBeNull()
  })

  it('closes on a scrim tap without firing anything', () => {
    window.history.replaceState({}, '', '/?sim=1')
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Close push simulator' }))
    expect(sheet()).toBeNull()
  })
})

describe('the sheet shows the catalog, and nothing invented', () => {
  beforeEach(() => { localStorage.setItem('pulse2-persona-id', 'wint-admin') })
  afterEach(() => {
    cleanup()
    window.history.replaceState({}, '', '/')
    localStorage.clear()
  })

  it('renders one row per PUSH_CATALOG entry, labelled from the catalog', () => {
    window.history.replaceState({}, '', '/?sim=1')
    mount()
    for (const card of PUSH_CATALOG) {
      expect(screen.getAllByText(card.label).length).toBeGreaterThan(0)
    }
    // Plus the two presenter rows the brief named.
    expect(screen.getByText('Lock phone')).toBeTruthy()
    expect(screen.getByText('Reset demo')).toBeTruthy()
  })

  it('carries no variant pickers and no param editors', () => {
    window.history.replaceState({}, '', '/?sim=1')
    const { container } = mount()
    expect(container.querySelectorAll('select').length).toBe(0)
    expect(container.querySelectorAll('input').length).toBe(0)
    // WA_01..WA_09 stay on the desktop panel.
    expect(screen.queryByText(/WA_0\d/)).toBeNull()
  })
})

describe('the delivery-surface selector', () => {
  beforeEach(() => { localStorage.setItem('pulse2-persona-id', 'wint-admin') })
  afterEach(() => {
    cleanup()
    window.history.replaceState({}, '', '/')
    localStorage.clear()
  })

  it('offers the four surfaces, defaulting to In-app', () => {
    window.history.replaceState({}, '', '/?sim=1')
    mount()
    const chips = screen.getAllByRole('radio')
    expect(chips.map((c) => c.textContent)).toEqual(DELIVERY_SURFACES.map((s) => s.label))
    expect(screen.getByRole('radio', { name: 'In-app' })).toHaveAttribute('aria-checked', 'true')
  })

  it('maps each surface onto an event the bridge already documents', () => {
    // pushBridge.js:126-127 — nothing here is a new event type.
    const vocabulary = ['lock-phone', 'shade', 'other-app']
    for (const s of DELIVERY_SURFACES) {
      if (s.id === 'inapp') expect(s.event).toBeNull()
      else expect(vocabulary).toContain(s.event)
    }
  })

  it('picking a chip moves the selection and survives until the sheet closes', () => {
    window.history.replaceState({}, '', '/?sim=1')
    mount()
    fireEvent.click(screen.getByRole('radio', { name: 'Lock screen' }))
    expect(screen.getByRole('radio', { name: 'Lock screen' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'In-app' })).toHaveAttribute('aria-checked', 'false')

    // Close and reopen: back to In-app. Nothing about this persists.
    fireEvent.click(screen.getByRole('button', { name: 'Close push simulator' }))
    expect(sheet()).toBeNull()
    cleanup()
    window.history.replaceState({}, '', '/?sim=1')
    mount()
    expect(screen.getByRole('radio', { name: 'In-app' })).toHaveAttribute('aria-checked', 'true')
  })
})

describe('firing onto a surface', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); localStorage.clear() })

  const card = () => PUSH_CATALOG.find((c) => c.id === 'WA')
  const sys = { id: 'T-1', name: 'Cooling Tower #1', l4Name: 'Henrietta House', valve: { state: 'open' } }

  it('In-app fires straight away and posts no surface event', async () => {
    const posted = []
    const ch = new BroadcastChannel('pulse2-push')
    ch.onmessage = (e) => posted.push(e.data.type)
    const payload = await fireOnSurface(card(), sys, { surface: 'inapp' })
    expect(payload.systemId).toBe('T-1')
    await act(async () => { await Promise.resolve() })
    expect(posted).not.toContain('lock-phone')
    ch.close()
  })

  it('Lock screen posts lock-phone FIRST, then waits the settle beat before the push', async () => {
    let resolved = false
    const p = fireOnSurface(card(), sys, { surface: 'locked' }).then((v) => { resolved = true; return v })

    // Nothing has fired yet - the surface is being given time to paint.
    act(() => { vi.advanceTimersByTime(SURFACE_SETTLE_MS - 50) })
    await Promise.resolve()
    expect(resolved).toBe(false)

    act(() => { vi.advanceTimersByTime(100) })
    const payload = await p
    expect(resolved).toBe(true)
    expect(payload.state).toBe('Warning')
  })

  it('leaves a comfortable beat - long enough to read as an arrival, short enough not to look broken', () => {
    // Measured paint in Chromium: other-app 5ms, shade 18ms, lock screen 95ms.
    expect(SURFACE_SETTLE_MS).toBeGreaterThan(150)
    expect(SURFACE_SETTLE_MS).toBeLessThan(1000)
  })
})

describe('the payload is the desktop panel payload', () => {
  afterEach(() => { localStorage.clear() })

  it('fires the first variant and the default params, with the casing buildActions switches on', () => {
    const card = PUSH_CATALOG.find((c) => c.id === 'SO')
    const sys = { id: 'T-1', name: 'Cooling Tower #1', l4Name: 'Henrietta House', valve: { state: 'open' } }
    const payload = firePushCard(card, sys, { persona: { name: 'Rami Kletshevsky' } })

    expect(payload.v10_9_id).toBe(defaultVariantId(card))
    expect(payload.systemId).toBe('T-1')
    expect(payload.type).toBe('leak')
    // 'Shutoff', lowercase o. 'ShutOff' falls through buildActions' default.
    expect(payload.state).toBe('Shutoff')
    expect(payload.severity).toBe('High Flow')
    expect(payload.volume).toBe('80 L')
    // Text comes from pushText.js, byte-for-byte from the V11 spreadsheet.
    expect(typeof payload.title).toBe('string')
    expect(payload.title.length).toBeGreaterThan(0)
  })

  it('honours the catalog own eligibility predicate', () => {
    const valveCard = PUSH_CATALOG.find((c) => c.id === 'VC_OK_01')
    expect(isCardEligible(valveCard, { id: 'A', valve: { state: 'open' } })).toBe(true)
    expect(isCardEligible(valveCard, { id: 'A', valve: null })).toBe(false)
    expect(isCardEligible(valveCard, null)).toBe(false)
  })
})

describe('canary - the state this gesture reads still looks the way it looks', () => {
  it('PushNotifications still draws its three surfaces at absolute / z-index 300', () => {
    const src = readFileSync('src/components/PushNotifications.jsx', 'utf8')
    const hits = src.match(/position: 'absolute', inset: 0, zIndex: 300/g) || []
    expect(hits.length).toBe(3)
    expect(BLOCKING_Z_INDEX).toBe(300)
  })
})
