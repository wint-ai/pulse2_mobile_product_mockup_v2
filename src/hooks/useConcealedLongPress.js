/**
 * A concealed long-press in the BOTTOM-RIGHT corner of the phone.
 *
 * WHY THERE IS NO ELEMENT. The obvious build is an invisible 64x64 div in the
 * corner, and it cannot work: with the default `pointer-events` it swallows
 * every tap that lands under it, and with `pointer-events: none` it receives
 * nothing at all. There is no third setting. So the listeners go on `document`
 * in the CAPTURE phase and the touch point is geometry-tested against a rect.
 * Nothing is covered, nothing is blocked, and it is live on every route with
 * no per-screen edit.
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
 * the same arithmetic is right in both layouts.
 *
 * WHY 1200ms AND NOT 500. 500ms races two things at once: iOS's own callout
 * timer, and a slow deliberate tap by someone holding a phone up for a room.
 *
 * WHAT THIS DOES NOT BUILD ON. iOS Safari never fires `contextmenu`, so the
 * gesture cannot be hung off it. The handler below exists only to stop
 * Android Chrome's selection menu mid-hold, where it does fire. There is also
 * no `preventDefault()` on touchstart: that is the one call that would stop
 * the selection loupe, and it kills scrolling along with it.
 */
import { useEffect, useRef } from 'react'

/** Not 500 — see the header. */
export const HOLD_MS = 1200
/** Movement budget for the whole hold. */
export const SLOP_PX = 10
/** The zone is this square, in CSS px, at the anchor's bottom-right corner. */
export const ZONE_PX = 64

export default function useConcealedLongPress({ anchorRef, enabled = true, isBlocked, onTrigger }) {
  /* Kept in refs so the effect can stay mounted across re-renders without
     re-binding document listeners on every parent render. */
  const onTriggerRef = useRef(onTrigger)
  const isBlockedRef = useRef(isBlocked)
  useEffect(() => { onTriggerRef.current = onTrigger }, [onTrigger])
  useEffect(() => { isBlockedRef.current = isBlocked }, [isBlocked])

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
     own expiry, or by unmount. */
  const clickGuardRef = useRef(null)
  useEffect(() => () => {
    if (clickGuardRef.current) clickGuardRef.current()
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    if (typeof document === 'undefined') return undefined

    let timer = null
    let armed = false
    let startX = 0
    let startY = 0

    const disarm = () => {
      if (timer !== null) { clearTimeout(timer); timer = null }
      armed = false
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

    const inZone = (x, y) => {
      const el = anchorRef?.current
      if (!el) return false
      const r = el.getBoundingClientRect()
      // An unmeasured anchor would put the zone at the viewport origin and
      // make the gesture fire in the wrong corner. Refuse instead.
      if (!r || r.width <= 0 || r.height <= 0) return false
      return x <= r.right && x >= r.right - ZONE_PX && y <= r.bottom && y >= r.bottom - ZONE_PX
    }

    const onTouchStart = (e) => {
      disarm()
      // Exactly one finger. A two-finger press is a different gesture and a
      // pinch should never reach the timer.
      if (!e.touches || e.touches.length !== 1) return
      const t = e.touches[0]
      if (!inZone(t.clientX, t.clientY)) return
      // Never while the simulated lock screen / shade / other-app chrome is
      // up — the worst possible moment to open a sheet over it.
      if (typeof isBlockedRef.current === 'function' && isBlockedRef.current()) return

      startX = t.clientX
      startY = t.clientY
      armed = true
      timer = setTimeout(() => {
        timer = null
        if (!armed) return
        armed = false
        guardNextClick()
        const fn = onTriggerRef.current
        if (typeof fn === 'function') fn()
      }, HOLD_MS)
    }

    const onTouchMove = (e) => {
      if (!armed) return
      if (!e.touches || e.touches.length !== 1) { disarm(); return }
      const t = e.touches[0]
      if (Math.abs(t.clientX - startX) > SLOP_PX || Math.abs(t.clientY - startY) > SLOP_PX) disarm()
    }

    const onTouchEnd = () => { disarm() }

    /* Capture, on document, so a scroll in ANY container cancels — this is
       what makes a 1200ms hold safe to start inside a scrolling list. */
    const onScroll = () => { disarm() }

    /* Android Chrome only; iOS Safari never fires this. Suppressing it only
       while our own hold is armed leaves every other long-press menu alone. */
    const onContextMenu = (e) => { if (armed) e.preventDefault() }

    document.addEventListener('touchstart', onTouchStart, true)
    document.addEventListener('touchmove', onTouchMove, true)
    document.addEventListener('touchend', onTouchEnd, true)
    document.addEventListener('touchcancel', onTouchEnd, true)
    document.addEventListener('scroll', onScroll, true)
    document.addEventListener('contextmenu', onContextMenu, true)

    return () => {
      disarm()
      document.removeEventListener('touchstart', onTouchStart, true)
      document.removeEventListener('touchmove', onTouchMove, true)
      document.removeEventListener('touchend', onTouchEnd, true)
      document.removeEventListener('touchcancel', onTouchEnd, true)
      document.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('contextmenu', onContextMenu, true)
    }
  }, [enabled, anchorRef])
}
