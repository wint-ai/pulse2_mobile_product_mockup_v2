/**
 * Is one of the simulated phone surfaces currently covering the app?
 *
 * `PushNotifications.jsx` owns that state as a local `phoneState` string
 * (`'inapp' | 'locked' | 'shade' | 'other-app'`, declared at :522). It is not
 * exported, not in a store, and not on the context — and that file is closed
 * to this change, so there is no way to import the value. Mirroring its
 * reducer here is the other option and is worse: the lock screen's own
 * `onUnlock` sets `phoneState` back to `'inapp'` WITHOUT posting anything on
 * the BroadcastChannel (PushNotifications.jsx:683), so a channel-fed mirror
 * would latch on `locked` forever after the first lock and silently disable
 * the gesture for the rest of the session.
 *
 * So we read the state's own output instead of copying its logic: the three
 * full-screen surfaces each render a root div that is `position: absolute`
 * with `z-index: 300` — PhoneLockScreen (:311), PhoneShade (:390) and
 * OtherAppScreen (:467). Nothing else in the app paints at absolute/300; the
 * only neighbours are the in-app banner at 250 (deliberately NOT blocking —
 * the gesture stays live under a banner) and the heads-up card at 350, which
 * only ever exists inside OtherAppScreen.
 *
 * The coupling is pinned by a canary assertion in
 * src/__tests__/pushSimTrigger.dom.test.jsx, so if that z-index ever moves,
 * a test goes red rather than the gesture quietly firing under a lock screen.
 */

/** Surfaces at or above this z-index take the whole phone and block the gesture. */
export const BLOCKING_Z_INDEX = 300

export function isSimulatedSurfaceShowing(root) {
  const scope = root || (typeof document !== 'undefined' ? document : null)
  if (!scope || typeof scope.querySelectorAll !== 'function') return false
  // Inline `style` is how PushNotifications writes these — it is v1-era code
  // with no classes and no data attributes. Narrowing on the attribute first
  // keeps this to a handful of nodes; the computed read is the actual test.
  const candidates = scope.querySelectorAll('div[style*="z-index"]')
  for (const el of candidates) {
    let cs
    try { cs = getComputedStyle(el) } catch { continue }
    if (!cs || cs.position !== 'absolute') continue
    const z = Number.parseInt(cs.zIndex, 10)
    if (Number.isFinite(z) && z >= BLOCKING_Z_INDEX) return true
  }
  return false
}
