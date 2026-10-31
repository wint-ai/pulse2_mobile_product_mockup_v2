/**
 * The concealed way into the push simulator, from the phone itself.
 *
 * The owner's ask: "how we can simulate push notification for the water event
 * flow ... just trigger them from the mobile app ... not too much interface.
 * It's kind of simulator that only someone that knows it can use it."
 *
 * So: a 1200ms one-finger long press in a 64x64 zone at the BOTTOM-RIGHT of
 * the phone, which opens the sheet. Nothing is drawn until it opens, there is
 * no affordance to find by accident, and the gesture is the gate every single
 * time — nothing is remembered, nothing is unlocked, and no flag is written
 * to any storage. The corner was chosen by hit-testing eight candidates on the
 * three screens a presenter demos from; see useConcealedLongPress.js.
 *
 * It builds NO notification surface. The sheet posts the same event object
 * the desktop /push panel posts, onto the same BroadcastChannel
 * PushNotifications.jsx has always listened on, so the lock screen, the
 * shade, the heads-up card and the in-app banner are all the existing ones.
 * The desktop panel and its ntfy.sh bridge are untouched.
 *
 * THE ANCHOR. The 0-interaction div below is not a hit target — it is
 * `visibility: hidden` and `pointer-events: none`, and the gesture never
 * consults it for events, only for a rect. It exists because the zone has to
 * be measured against the phone shell and there is no stable handle on it:
 * Phone.jsx renders DesktopFrame on desktop and MobileLayout on a handset,
 * and only one of those has a status bar. The anchor is `inset`-stretched
 * inside PushNotifications' own relative wrapper — the exact box the
 * simulated surfaces cover — so `rect.right` and `rect.bottom` are correct in
 * both layouts. No `env(safe-area-*)` offset: the measured reason is in
 * useConcealedLongPress.js, and this app applies none anywhere else either.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useUserContext } from '@/context/UserContext'
import useConcealedLongPress from '@/hooks/useConcealedLongPress'
import { isSimulatedSurfaceShowing } from '@/lib/simulatedSurface'
import { fireOnSurface, fireLockPhone, fireDemoReset } from '@/lib/pushSimFire'
import PushSimSheet from '@/v2/components/PushSimSheet'

/* Routes that name a system. The sheet fires at whatever system the presenter
   is already looking at, which is the whole point of triggering from the
   phone — open the system, hold the corner, fire its water event. Off such a
   route it falls back to the persona's first visible system. */
const SYSTEM_IN_PATH = /\/(?:system|alert|leak)\/([^/?#]+)/

/**
 * `?sim=1`, read once and survived across ONE remount.
 *
 * Phone.jsx:148-154 renders DesktopFrame on the first paint and swaps to
 * MobileLayout as soon as useIsMobile's effect has run. Those are different
 * component types, so React unmounts and remounts the entire app below them a
 * few milliseconds into every load on a handset — this component with it.
 * A naive read in a state initialiser is therefore taken, the URL is stripped,
 * and the remount re-reads a URL that no longer says `sim`, so the sheet
 * flashes and disappears. Verified in Chromium at 393x852; it is the reason
 * this function exists at all.
 *
 * So a positive answer is remembered — for 1.5 seconds, in a module variable,
 * and nowhere else. NOT sessionStorage and emphatically not localStorage:
 * nothing about the simulator may outlive the page load, because a review
 * link gets pasted around and a reviewer's session must not inherit it. The
 * window is bounded so that a layout flip a minute later cannot resurrect a
 * sheet the presenter already closed.
 */
const SIM_REMOUNT_WINDOW_MS = 1500
let simArmedUntil = 0

function readSimParam() {
  if (Date.now() < simArmedUntil) return true
  try {
    if (new URLSearchParams(window.location.search).get('sim') !== '1') return false
  } catch { return false }
  simArmedUntil = Date.now() + SIM_REMOUNT_WINDOW_MS
  return true
}

export default function PushSimTrigger() {
  const anchorRef = useRef(null)
  /* Seeded in the initialiser rather than set from an effect: the read is
     pure, so a StrictMode double-invoke costs nothing, and the effect below
     is left doing only external-system work (rewriting the URL). */
  const [open, setOpen] = useState(readSimParam)
  const { persona, visibleSystems = [] } = useUserContext() || {}
  const location = useLocation()

  const system = useMemo(() => {
    const match = SYSTEM_IN_PATH.exec(location.pathname || '')
    const fromRoute = match && visibleSystems.find((s) => String(s.id) === decodeURIComponent(match[1]))
    return fromRoute || visibleSystems[0] || null
  }, [location.pathname, visibleSystems])

  /* `?sim=1` — the escape hatch for a desktop browser, where there are no
     touch events at all, read the way index.html reads `?theme=`.
     DELIBERATELY NOT PERSISTED, and stripped on arrival: a review link gets
     pasted around, and a reviewer's session must not inherit the simulator
     from someone else's URL. The strip mirrors LoginGate's `?p=` handling in
     App.jsx:231-244 — history.replaceState, keep the path and every other
     param, drop only ours. */
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('sim') !== '1') return
      params.delete('sim')
      const cleaned =
        window.location.pathname +
        (params.toString() ? `?${params}` : '') +
        window.location.hash
      window.history.replaceState({}, '', cleaned)
    } catch { /* private mode / no history */ }
  }, [])

  useConcealedLongPress({
    anchorRef,
    // Already open? The gesture has nothing left to do, and a second fire
    // while the sheet is up would only re-trigger its mount animation.
    enabled: !open,
    isBlocked: isSimulatedSurfaceShowing,
    onTrigger: useCallback(() => setOpen(true), []),
  })

  const close = useCallback(() => setOpen(false), [])

  /* Close FIRST, then fire. The notification has to land on a clean screen,
     not behind this sheet — and for every surface but In-app the sheet would
     otherwise still be up when the lock screen or shade slides in over it. */
  const handleFireCard = useCallback((card, surface) => {
    setOpen(false)
    fireOnSurface(card, system, { persona, surface })
  }, [system, persona])

  const handleLockPhone = useCallback(() => {
    setOpen(false)
    fireLockPhone()
  }, [])

  const handleResetDemo = useCallback(() => {
    setOpen(false)
    fireDemoReset()
  }, [])

  return (
    <>
      <div
        ref={anchorRef}
        data-push-sim-anchor=""
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-0"
      />
      <PushSimSheet
        open={open}
        system={system}
        onClose={close}
        onFireCard={handleFireCard}
        onLockPhone={handleLockPhone}
        onResetDemo={handleResetDemo}
      />
    </>
  )
}
