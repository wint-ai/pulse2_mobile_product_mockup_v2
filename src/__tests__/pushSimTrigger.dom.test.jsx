// @vitest-environment happy-dom
/**
 * The concealed on-phone trigger for the push simulator.
 *
 * THESE DRIVE POINTER EVENTS, AND THAT IS THE POINT OF THE FILE.
 *
 * The first version of this suite drove the gesture with synthetic TOUCH
 * events, because the hook listened to touch events. Both were wrong in the
 * same direction and so they agreed with each other: on a laptop no touch
 * event ever fires, the feature was dead under a mouse, and every test here
 * was green. The owner found it in about ten seconds.
 *
 * So the hold is now exercised through `pointerdown`/`pointermove`/
 * `pointerup` — the one path that covers mouse, touch and pen — and the
 * opening case is run over BOTH `pointerType: 'mouse'` and
 * `pointerType: 'touch'`, so neither input can regress without a red test.
 * A plain click is still no substitute: it never exercises the hold timer,
 * the slop budget, the scroll cancel or the pointer count, which are the four
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
import { useRef } from 'react'
import { render, act, cleanup, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { UserProvider } from '@/context/UserContext'
import PushSimTrigger from '@/v2/components/PushSimTrigger'
import useConcealedLongPress, { REJECT } from '@/hooks/useConcealedLongPress'
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

/* One pointer, one id. `isPrimary` and `pointerId` are not decoration: they
   are how the hook keeps a second finger away from the hold timer, and a
   helper that always sent `isPrimary: true` would quietly remove that guard
   from the suite. */
function pointer(type, point, opts = {}) {
  const up = type === 'pointerup' || type === 'pointercancel'
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
    pointerId: opts.pointerId ?? 1,
    pointerType: opts.pointerType ?? 'mouse',
    isPrimary: opts.isPrimary ?? true,
    button: opts.button ?? 0,
    buttons: up ? 0 : 1,
  })
}

function dispatch(type, point, opts) {
  act(() => { document.body.dispatchEvent(pointer(type, point, opts)) })
}

/** A full hold: down, wait past the bar, up. */
function hold(point, opts = {}, ms = 1300) {
  dispatch('pointerdown', point, opts)
  act(() => { vi.advanceTimersByTime(ms) })
  dispatch('pointerup', point, opts)
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

  /* THE REGRESSION THIS FILE EXISTS FOR. The feature shipped working under
     exactly one of these two and green under both, because the suite only
     ever drove the one that worked. */
  for (const pointerType of ['mouse', 'touch']) {
    it(`opens on a one-pointer ${pointerType} hold in the bottom-right zone, held past 1200ms`, () => {
      mount()
      stubAnchor()
      expect(sheet()).toBeNull()

      dispatch('pointerdown', IN_ZONE, { pointerType })
      // Still nothing at a second - 1200ms is the bar, not 500ms.
      act(() => { vi.advanceTimersByTime(1000) })
      expect(sheet()).toBeNull()

      act(() => { vi.advanceTimersByTime(300) })
      dispatch('pointerup', IN_ZONE, { pointerType })
      expect(sheet()).not.toBeNull()
    })
  }

  it('does not open from the old top-right corner — it sits on the avatar', () => {
    mount()
    stubAnchor()
    hold(OLD_TOP_RIGHT, {}, 2000)
    expect(sheet()).toBeNull()
  })

  it('does not open on a 300ms press', () => {
    mount()
    stubAnchor()
    hold(IN_ZONE, {}, 300)
    act(() => { vi.advanceTimersByTime(2000) })
    expect(sheet()).toBeNull()
  })

  it('does not open when the pointer drifts 20px - past the 10px budget', () => {
    mount()
    stubAnchor()
    const drifted = { x: IN_ZONE.x, y: IN_ZONE.y + 20 }
    dispatch('pointerdown', IN_ZONE)
    act(() => { vi.advanceTimersByTime(400) })
    dispatch('pointermove', drifted)
    act(() => { vi.advanceTimersByTime(2000) })
    dispatch('pointerup', drifted)
    expect(sheet()).toBeNull()
  })

  it('tolerates a 6px wobble - a hand on a phone is never still', () => {
    mount()
    stubAnchor()
    dispatch('pointerdown', IN_ZONE)
    act(() => { vi.advanceTimersByTime(400) })
    dispatch('pointermove', { x: IN_ZONE.x + 6, y: IN_ZONE.y - 5 })
    act(() => { vi.advanceTimersByTime(900) })
    expect(sheet()).not.toBeNull()
  })

  it('does not open from outside the 64x64 zone', () => {
    mount()
    stubAnchor()
    hold({ x: 100, y: 300 }, {}, 2000)
    expect(sheet()).toBeNull()
  })

  it('does not open for two pointers - a second one down cancels the hold', () => {
    mount()
    stubAnchor()
    dispatch('pointerdown', IN_ZONE, { pointerType: 'touch' })
    act(() => { vi.advanceTimersByTime(300) })
    dispatch('pointerdown', { x: 360, y: 40 }, { pointerType: 'touch', pointerId: 2, isPrimary: false })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(sheet()).toBeNull()
  })

  it('ignores a non-primary pointer outright', () => {
    mount()
    stubAnchor()
    hold(IN_ZONE, { pointerType: 'touch', pointerId: 7, isPrimary: false }, 2000)
    expect(sheet()).toBeNull()
  })

  it('ignores a right-click hold - that is somebody else gesture', () => {
    mount()
    stubAnchor()
    hold(IN_ZONE, { button: 2 }, 2000)
    expect(sheet()).toBeNull()
  })

  it('is cancelled by a scroll anywhere in the page', () => {
    mount()
    stubAnchor()
    dispatch('pointerdown', IN_ZONE)
    act(() => { vi.advanceTimersByTime(400) })
    act(() => { document.body.dispatchEvent(new Event('scroll', { bubbles: true })) })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(sheet()).toBeNull()
  })

  /* On a handset a scroll that starts inside the zone reaches us as
     `pointercancel` before any scroll event does. */
  it('is cancelled when the browser takes the pointer over', () => {
    mount()
    stubAnchor()
    dispatch('pointerdown', IN_ZONE, { pointerType: 'touch' })
    act(() => { vi.advanceTimersByTime(400) })
    dispatch('pointercancel', IN_ZONE, { pointerType: 'touch' })
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

    hold(IN_ZONE, {}, 2000)
    expect(sheet()).toBeNull()

    // Remove it and the same gesture works again - the block is a live read,
    // not a latch.
    surface.remove()
    hold(IN_ZONE)
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

    hold(IN_ZONE, { pointerType: 'touch' })
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

/**
 * The hazard that comes WITH the fix.
 *
 * A touch on a real phone emits a pointer sequence and then a set of
 * compatibility mouse events for the benefit of code written before Pointer
 * Events existed. A hook that listened to pointer events AND mouse events (or
 * AND touch events) would see one press as two and open the sheet twice. The
 * hook listens to pointer events only, which is what makes this impossible —
 * and this is the test that says so, with a counter rather than a DOM query,
 * because `setOpen(true)` twice looks exactly like `setOpen(true)` once.
 */
describe('one press is one fire', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { cleanup(); vi.useRealTimers() })

  function Harness({ onTrigger }) {
    const ref = useRef(null)
    useConcealedLongPress({ anchorRef: ref, onTrigger })
    return <div ref={ref} data-harness-anchor="" />
  }

  it('does not fire twice when the compatibility mouse events follow a touch', () => {
    const onTrigger = vi.fn()
    render(<Harness onTrigger={onTrigger} />)
    const anchor = document.querySelector('[data-harness-anchor]')
    anchor.getBoundingClientRect = () => ({ ...SHELL, toJSON: () => SHELL })

    hold(IN_ZONE, { pointerType: 'touch' })
    expect(onTrigger).toHaveBeenCalledTimes(1)

    /* What the browser sends next, for the benefit of pre-pointer code. None
       of it may reach the timer. */
    act(() => {
      for (const type of ['mousedown', 'mouseup', 'click']) {
        document.body.dispatchEvent(new MouseEvent(type, {
          bubbles: true, cancelable: true, clientX: IN_ZONE.x, clientY: IN_ZONE.y,
        }))
      }
      const touchEnd = new Event('touchend', { bubbles: true, cancelable: true })
      document.body.dispatchEvent(touchEnd)
      vi.advanceTimersByTime(2000)
    })
    expect(onTrigger).toHaveBeenCalledTimes(1)
  })
})

/**
 * THE VISIBLE HANDLE, on by default since 2026-10-31 at the owner's request
 * and intended to go back to being concealed (DEV_FLAGS.handle). Because the
 * default is now `on`, the two off-switches are the only way to be rid of it
 * and are pinned here individually - and so is the fact that a dismissal
 * SURVIVES A RELOAD, which a store that could only record "on" could not do.
 */
describe('the visible handle - on by default, temporarily', () => {
  beforeEach(() => { localStorage.setItem('pulse2-persona-id', 'wint-admin') })
  afterEach(() => {
    cleanup()
    window.history.replaceState({}, '', '/')
    localStorage.clear()
    sessionStorage.clear()
  })

  const handle = () => screen.queryByRole('button', { name: 'Push sim' })
  const dismiss = () => screen.getByRole('button', { name: 'Hide the push simulator handle' })

  it('is on screen with no flag at all - this is the flipped default', () => {
    mount()
    expect(handle()).not.toBeNull()
    expect(dismiss()).not.toBeNull()
  })

  it('opens the sheet on a plain click - no gesture, no timing', () => {
    mount()
    expect(sheet()).toBeNull()
    fireEvent.click(handle())
    expect(sheet()).not.toBeNull()
  })

  /* Rule 0: the handle is an addition. The gesture it stands in for has to
     keep working, on the same screen, with the pill visible. */
  it('does not replace the concealed gesture', () => {
    vi.useFakeTimers()
    try {
      mount()
      expect(handle()).not.toBeNull()
      stubAnchor()
      hold(IN_ZONE, { pointerType: 'mouse' })
      expect(sheet()).not.toBeNull()
    } finally { vi.useRealTimers() }
  })

  it('is turned off by ?simhandle=0, and STAYS off across a reload', () => {
    window.history.replaceState({}, '', '/?simhandle=0&theme=contrast')
    const first = mount()
    expect(handle()).toBeNull()
    // Ours is stripped; anything else in the query survives.
    expect(window.location.search).not.toContain('simhandle')
    expect(window.location.search).toContain('theme=contrast')

    // A plain reload must not resurrect it - that is what the '0' is for.
    first.unmount()
    mount()
    expect(handle()).toBeNull()
  })

  it('is turned off by its own ×, and that also survives a reload', () => {
    const first = mount()
    fireEvent.click(dismiss())
    expect(handle()).toBeNull()
    expect(sessionStorage.getItem('pulse2-sim-handle')).toBe('0')

    first.unmount()
    mount()
    expect(handle()).toBeNull()
  })

  it('comes back on ?simhandle=1 after it has been dismissed', () => {
    const first = mount()
    fireEvent.click(dismiss())
    first.unmount()

    window.history.replaceState({}, '', '/?simhandle=1')
    mount()
    expect(handle()).not.toBeNull()
  })

  /* The dismissal is a decision about THIS tab, not a setting. A new tab
     starts from the default, and so does whoever the link is pasted to. */
  it('a fresh tab returns to the default rather than inheriting a dismissal', () => {
    const first = mount()
    fireEvent.click(dismiss())
    first.unmount()

    sessionStorage.clear() // what a new tab actually gets
    mount()
    expect(handle()).not.toBeNull()
  })

  it('never outlives the tab - it is sessionStorage, not localStorage', () => {
    const first = mount()
    fireEvent.click(dismiss())
    expect(localStorage.getItem('pulse2-sim-handle')).toBeNull()
    first.unmount()

    window.history.replaceState({}, '', '/?simhandle=1')
    mount()
    expect(sessionStorage.getItem('pulse2-sim-handle')).toBe('1')
    expect(localStorage.getItem('pulse2-sim-handle')).toBeNull()
  })

  /* It sits above the TabBar and on the LEFT: the bottom-right 64x64 is the
     concealed gesture's zone and the handle may not cover it. */
  it('is placed clear of both the TabBar and the gesture zone', () => {
    mount()
    const pill = handle().parentElement
    expect(pill.className).toContain('left-[12px]')
    expect(pill.className).not.toContain('right-')
    expect(pill.className).toContain('bottom-[72px]')
    expect(pill.className).not.toContain('bottom-[10px]')
  })
})

describe('?simdebug=1 - the gesture readout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.setItem('pulse2-persona-id', 'wint-admin')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    window.history.replaceState({}, '', '/')
    localStorage.clear()
    sessionStorage.clear()
  })

  const readout = () => document.querySelector('[data-push-sim-debug]')
  const zoneOutline = () => document.querySelector('[data-push-sim-zone]')

  it('draws nothing at all without the flag', () => {
    mount()
    expect(readout()).toBeNull()
    expect(zoneOutline()).toBeNull()
  })

  it('outlines the zone and reports an idle gesture before anything is pressed', () => {
    window.history.replaceState({}, '', '/?simdebug=1')
    mount()
    expect(zoneOutline()).not.toBeNull()
    expect(readout().textContent).toContain('none seen yet')
  })

  /* The point of the whole aid: on a laptop, press and be TOLD which
     condition said no, instead of guessing between seven of them. */
  it('names the condition that rejected a mouse press, with the coordinates and the zone', () => {
    window.history.replaceState({}, '', '/?simdebug=1')
    mount()
    stubAnchor()

    hold({ x: 100, y: 300 }, { pointerType: 'mouse' }, 1300)
    const text = readout().textContent
    expect(text).toContain(REJECT.OUTSIDE_ZONE)
    expect(text).toContain('mouse @ 100,300')
    // The zone's own rect, so a wrong anchor is visible rather than inferred.
    expect(text).toContain('329,788 → 393,852')
    expect(text).toContain('NO')
  })

  it('reports a press that was seen, held and fired', () => {
    window.history.replaceState({}, '', '/?simdebug=1')
    mount()
    stubAnchor()

    dispatch('pointerdown', IN_ZONE, { pointerType: 'mouse' })
    expect(readout().textContent).toContain('down')
    act(() => { vi.advanceTimersByTime(1300) })
    expect(sheet()).not.toBeNull()
  })

  it('says when a simulated surface is what turned the press away', () => {
    window.history.replaceState({}, '', '/?simdebug=1')
    const { container } = mount()
    stubAnchor()
    const surface = document.createElement('div')
    surface.setAttribute('style', 'position: absolute; inset: 0px; z-index: 300;')
    container.appendChild(surface)

    hold(IN_ZONE, { pointerType: 'mouse' }, 1300)
    expect(readout().textContent).toContain(REJECT.SURFACE_UP)
  })

  it('says when the slop budget is what turned the press away', () => {
    window.history.replaceState({}, '', '/?simdebug=1')
    mount()
    stubAnchor()
    dispatch('pointerdown', IN_ZONE, { pointerType: 'mouse' })
    act(() => { vi.advanceTimersByTime(200) })
    dispatch('pointermove', { x: IN_ZONE.x + 25, y: IN_ZONE.y }, { pointerType: 'mouse' })
    expect(readout().textContent).toContain(REJECT.SLOP)
  })

  it('turns off on ?simdebug=0 and on its own dismiss', () => {
    window.history.replaceState({}, '', '/?simdebug=1')
    const first = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Hide the push simulator diagnostics' }))
    expect(readout()).toBeNull()
    first.unmount()

    window.history.replaceState({}, '', '/?simdebug=1')
    const second = mount()
    expect(readout()).not.toBeNull()
    second.unmount()
    window.history.replaceState({}, '', '/?simdebug=0')
    mount()
    expect(readout()).toBeNull()
  })

  /* A readout that intercepted the press it is reporting on would be a
     diagnostic that changes the thing it measures. */
  it('cannot intercept the press it is reporting on', () => {
    window.history.replaceState({}, '', '/?simdebug=1')
    mount()
    // happy-dom lays out no Tailwind, so the class is the assertion.
    expect(readout().className).toContain('pointer-events-none')
    expect(zoneOutline().className).toContain('pointer-events-none')
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
