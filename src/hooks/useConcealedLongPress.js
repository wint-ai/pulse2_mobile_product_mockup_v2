/**
 * A concealed long-press in the BOTTOM-RIGHT corner of the phone.
 *
 * WHY POINTER EVENTS AND NOT TOUCH EVENTS. This hook shipped listening to
 * `touchstart` / `touchmove` / `touchend` only, and on a laptop driven by a
 * mouse none of those three ever fire — so the gesture was dead for anyone
 * opening the review URL on a desktop browser, which is how the owner first
 * tried it. The original verification missed it because it drove the gesture
 * with CDP `Input.dispatchTouchEvent`, i.e. through the one input path that
 * happened to work. The DOM test suite now drives it with pointer events as
 * well, which is the regression that would have caught this.
 *
 * The fix is Pointer Events, which are ONE path over mouse, touch and pen —
 * not mouse handlers bolted alongside the touch ones. That distinction is
 * load-bearing rather than tidiness: a touch on a phone produces a pointer
 * sequence AND a trailing set of compatibility mouse events, so a hook that
 * listened to both would arm twice and fire the sheet twice from a single
 * press. Listening to pointer events ALONE makes that impossible: one press
 * is exactly one `pointerdown`, whatever the hardware. The touch listeners
 * are therefore gone rather than kept as a fallback — every browser this app
 * already requires (it ships `oklch()`, `100dvh` and `BroadcastChannel`) has
 * had Pointer Events for years, and a second listener set is the double-fire
 * bug waiting to be reintroduced.
 *
 * WHY THERE IS NO ELEMENT. The obvious build is an invisible 64x64 div in the
 * corner, and it cannot work: with the default `pointer-events` it swallows
 * every tap that lands under it, and with `pointer-events: none` it receives
 * nothing at all. There is no third setting. So the listeners go on `document`
 * in the CAPTURE phase and the press point is geometry-tested against a rect.
 * Nothing is covered, nothing is blocked, and it is live on every route with
 * no per-screen edit.
 *
 * Capture phase also keeps this clear of the several capture-phase
 * `pointerdown` dismiss listeners elsewhere in the app
 * (SystemsOverviewHero.jsx:180, WaterConsumptionCardV2.jsx:1220): those are
 * mounted only while a chip or a bucket is armed, and none of them calls
 * `stopPropagation`, so none of them can swallow this press.
 *
 * WHY THE BOTTOM-RIGHT AND NOT THE TOP-RIGHT. The zone has to sit over inert
 * chrome — no `<img>`, no body text — because `-webkit-touch-callout: none` is
 * reported broken as recently as iOS 26.1 and `user-select: none` does not
 * suppress the selection loupe at all. The top-right does not qualify: on `/`
 * it contains `avatar.jpg` at (349,24), 28x28, which is also the control that
 * navigates to /account. Eight candidate 64x64 zones were hit-tested on a
 * 5x5 grid of points across the three screens a presenter demos from — `/`,
 * `/system/:id` and `/location/:name`. Exactly two came back with no image, no
 * text node and no interactive element under any point: the bottom-left and
 * bottom-right corners, which land in the TabBar's outer padding (its tabs on
 * those screens stop at x=322 of 393). Bottom-right is the one a right thumb
 * reaches. The margin is 7px, so a wider TabBar label would eat it — the
 * test suite pins the geometry, but a layout change to the TabBar is a reason
 * to re-run that probe.
 *
 * WHY NO SAFE-AREA OFFSET. The same probe at 20px, 34px and 48px of upward
 * inset is NOT inert: it lifts the zone off the TabBar and onto the water-event
 * rows on `/` and the period controls on `/location/:name`. This app applies no
 * `env(safe-area-*)` anywhere and draws the TabBar flush to the bottom of the
 * viewport, so an inset-aware zone would deliberately miss the chrome the app
 * actually paints. The zone is therefore the shell's own bottom-right corner.
 *
 * WHY THE RECT COMES FROM AN ANCHOR. src/components/Phone.jsx:148-154 renders
 * `DesktopFrame` on desktop and `MobileLayout` on a handset, and only one of
 * those has a status bar; neither exposes a stable handle. The caller passes a
 * ref to a zero-interaction anchor stretched over the phone body instead, so
 * the same arithmetic is right in both layouts. Re-measured in Chromium while
 * fixing the input path: the anchor resolves to 0,0..393,852 under
 * MobileLayout and to 496.8,80.5..903.2,935.2 under DesktopFrame (whose
 * `zoom: 1.08` is already folded into both the rect and the event
 * coordinates), and `elementFromPoint` inside the zone is the TabBar on both.
 * The geometry was never the problem.
 *
 * WHY 1200ms AND NOT 500. 500ms races two things at once: iOS's own callout
 * timer, and a slow deliberate tap by someone holding a phone up for a room.
 *
 * WHAT THIS DOES NOT BUILD ON. iOS Safari never fires `contextmenu`, so the
 * gesture cannot be hung off it. The handler below exists only to stop
 * Android Chrome's selection menu mid-hold, where it does fire. There is also
 * no `preventDefault()` on pointerdown: that is the one call that would stop
 * the selection loupe, and it kills scrolling along with it.
 */
import { useEffect, useRef } from 'react'

/** Not 500 — see the header. */
export const HOLD_MS = 1200
/** Movement budget for the whole hold. */
export const SLOP_PX = 10
/** The zone is this square, in CSS px, at the anchor's bottom-right corner. */
export const ZONE_PX = 64

/**
 * Why an attempt was turned away.
 *
 * These strings are the whole point of the `?simdebug=1` readout in
 * PushSimTrigger: the owner presses, and reads which single condition
 * rejected the press, instead of guessing between seven of them.
 */
export const REJECT = {
  MULTI_POINTER: 'a second pointer landed — this gesture is single-pointer',
  NOT_PRIMARY: 'not the primary pointer',
  NOT_PRIMARY_BUTTON: 'not the primary button',
  ANCHOR_MISSING: 'the measuring anchor is not mounted',
  ANCHOR_UNMEASURED: 'the anchor has no size yet',
  OUTSIDE_ZONE: 'press landed outside the zone',
  SURFACE_UP: 'a simulated surface is up — the gesture is inert',
  SLOP: 'moved further than the slop budget',
  SCROLL: 'a scroll cancelled the hold',
  CANCELLED: 'the browser cancelled the pointer (scroll or gesture takeover)',
  RELEASED_EARLY: 'released before the hold completed',
}

export default function useConcealedLongPress({
  anchorRef,
  enabled = true,
  isBlocked,
  onTrigger,
  /**
   * Optional, and absent in every normal session: the `?simdebug=1` readout
   * passes a function here to watch the gesture. The hook's behaviour has to
   * be identical whether or not it is supplied, so every call is guarded and
   * wrapped — a crashing dev aid may not take the gesture down with it.
   */
  onDiagnostic,
}) {
  /* Kept in refs so the effect can stay mounted across re-renders without
     re-binding document listeners on every parent render. */
  const onTriggerRef = useRef(onTrigger)
  const isBlockedRef = useRef(isBlocked)
  const onDiagnosticRef = useRef(onDiagnostic)
  useEffect(() => { onTriggerRef.current = onTrigger }, [onTrigger])
  useEffect(() => { isBlockedRef.current = isBlocked }, [isBlocked])
  useEffect(() => { onDiagnosticRef.current = onDiagnostic }, [onDiagnostic])

  /* THE CLICK GUARD LIVES OUTSIDE THE MAIN EFFECT, and that is the whole
     reason it works at all.
     Callers disable the gesture the moment it fires — there is nothing left
     for it to do once the sheet is up — so the `enabled` flag flips in the
     very same tick and the main effect below tears down and rebuilds.
     Installed inside that effect, the guard was being released microseconds
     after it was armed, and the trailing synthetic click sailed through to
     whatever sat under the finger: in practice the scrim of the sheet that
     had just opened, which closed it again before it had painted. Held in a
     ref, the guard is released only by the click it is waiting for, by its
     own expiry, or by unmount.

     It is also what absorbs the compatibility `click` that a touch press
     emits after its pointer sequence, so the one press that opened the sheet
     cannot also activate whatever sits underneath it. */
  const clickGuardRef = useRef(null)
  useEffect(() => () => {
    if (clickGuardRef.current) clickGuardRef.current()
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    if (typeof document === 'undefined') return undefined

    let timer = null
    let armed = false
    let pointerId = null
    let pointerType = null
    let startX = 0
    let startY = 0
    let startedAt = 0

    const now = () => Date.now()

    const disarm = () => {
      if (timer !== null) { clearTimeout(timer); timer = null }
      armed = false
      pointerId = null
    }

    /** Never throws into the gesture. See `onDiagnostic` above. */
    const emit = (patch) => {
      const fn = onDiagnosticRef.current
      if (typeof fn !== 'function') return
      try { fn({ at: now(), pointerType, ...patch }) } catch { /* a dev aid is never load-bearing */ }
    }

    /* The trailing synthetic click. Without this, a long press that lands over
       the header avatar opens the sheet AND navigates to /account. Capture
       phase, one click, then it takes itself off — plus a hard expiry so a
       press that never produces a click cannot leave a listener behind to eat
       an unrelated tap later. */
    const guardNextClick = () => {
      if (clickGuardRef.current) clickGuardRef.current()
      let expiry = null
      const release = () => {
        document.removeEventListener('click', swallow, true)
        if (expiry !== null) { clearTimeout(expiry); expiry = null }
        if (clickGuardRef.current === release) clickGuardRef.current = null
      }
      const swallow = (e) => {
        e.preventDefault()
        e.stopPropagation()
        release()
      }
      document.addEventListener('click', swallow, true)
      expiry = setTimeout(release, 2500)
      clickGuardRef.current = release
    }

    /**
     * The zone, in viewport coordinates, or null if it cannot be trusted.
     * An unmeasured anchor would put the zone at the viewport origin and make
     * the gesture fire in the wrong corner, so that case refuses rather than
     * guesses.
     */
    const zoneRect = () => {
      const el = anchorRef?.current
      if (!el) return null
      const r = el.getBoundingClientRect()
      if (!r || r.width <= 0 || r.height <= 0) return null
      return { left: r.right - ZONE_PX, top: r.bottom - ZONE_PX, right: r.right, bottom: r.bottom }
    }

    const inZone = (zone, x, y) =>
      !!zone && x <= zone.right && x >= zone.left && y <= zone.bottom && y >= zone.top

    /** A terminal rejection: stop the hold and say why. */
    const reject = (reason, extra) => {
      const heldMs = startedAt ? now() - startedAt : 0
      disarm()
      emit({ phase: 'reject', armed: false, reason, heldMs, ...extra })
    }

    const onPointerDown = (e) => {
      const x = e.clientX
      const y = e.clientY
      const zone = zoneRect()
      const inside = inZone(zone, x, y)
      const base = { phase: 'reject', armed: false, x, y, zone, inZone: inside, heldMs: 0, movedPx: 0 }
      const type = e.pointerType || 'unknown'

      /* A second pointer while one is armed is a different gesture — a pinch
         must never reach the timer. Cancel rather than track either of them. */
      if (armed) {
        disarm()
        pointerType = type
        emit({ ...base, reason: REJECT.MULTI_POINTER })
        return
      }
      disarm()
      pointerType = type

      if (e.isPrimary === false) { emit({ ...base, reason: REJECT.NOT_PRIMARY }); return }
      // Right- and middle-button presses belong to somebody else's gesture.
      if (typeof e.button === 'number' && e.button > 0) { emit({ ...base, reason: REJECT.NOT_PRIMARY_BUTTON }); return }
      if (!anchorRef?.current) { emit({ ...base, reason: REJECT.ANCHOR_MISSING }); return }
      if (!zone) { emit({ ...base, reason: REJECT.ANCHOR_UNMEASURED }); return }
      if (!inside) { emit({ ...base, reason: REJECT.OUTSIDE_ZONE }); return }
      /* Never while the simulated lock screen / shade / other-app chrome is
         up — the worst possible moment to open a sheet over it. */
      if (typeof isBlockedRef.current === 'function' && isBlockedRef.current()) {
        emit({ ...base, reason: REJECT.SURFACE_UP })
        return
      }

      pointerId = e.pointerId
      startX = x
      startY = y
      startedAt = now()
      armed = true
      emit({ ...base, phase: 'down', armed: true, reason: null })

      timer = setTimeout(() => {
        timer = null
        if (!armed) return
        armed = false
        pointerId = null
        guardNextClick()
        emit({ ...base, phase: 'fire', armed: false, reason: null, heldMs: HOLD_MS })
        const fn = onTriggerRef.current
        if (typeof fn === 'function') fn()
      }, HOLD_MS)
    }

    const onPointerMove = (e) => {
      if (!armed || e.pointerId !== pointerId) return
      const dx = Math.abs(e.clientX - startX)
      const dy = Math.abs(e.clientY - startY)
      const movedPx = Math.round(Math.max(dx, dy))
      const where = { x: e.clientX, y: e.clientY, zone: zoneRect(), inZone: true, movedPx }
      if (dx > SLOP_PX || dy > SLOP_PX) { reject(REJECT.SLOP, where); return }
      emit({ phase: 'move', armed: true, reason: null, heldMs: now() - startedAt, ...where })
    }

    const onPointerUp = (e) => {
      if (!armed || e.pointerId !== pointerId) return
      reject(REJECT.RELEASED_EARLY, { x: e.clientX, y: e.clientY, zone: zoneRect(), inZone: true })
    }

    /* The browser taking the pointer over. On a handset this is what a scroll
       that starts inside the zone actually produces, before any scroll event. */
    const onPointerCancel = (e) => {
      if (!armed || e.pointerId !== pointerId) return
      reject(REJECT.CANCELLED, { x: e.clientX, y: e.clientY, zone: zoneRect(), inZone: true })
    }

    /* Capture, on document, so a scroll in ANY container cancels — this is
       what makes a 1200ms hold safe to start inside a scrolling list. */
    const onScroll = () => { if (armed) reject(REJECT.SCROLL) }

    /* Android Chrome only; iOS Safari never fires this. Suppressing it only
       while our own hold is armed leaves every other long-press menu alone. */
    const onContextMenu = (e) => { if (armed) e.preventDefault() }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointermove', onPointerMove, true)
    document.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('pointercancel', onPointerCancel, true)
    document.addEventListener('scroll', onScroll, true)
    document.addEventListener('contextmenu', onContextMenu, true)

    return () => {
      disarm()
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointermove', onPointerMove, true)
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('pointercancel', onPointerCancel, true)
      document.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('contextmenu', onContextMenu, true)
    }
  }, [enabled, anchorRef])
}
