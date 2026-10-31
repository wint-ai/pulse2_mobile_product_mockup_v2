/**
 * The on-phone firing path for the EXISTING push simulator.
 *
 * This builds no notification UI of its own. It produces exactly the payload
 * `ControlPanel.fireCard()` produces (src/screens/ControlPanel.jsx:167) and
 * posts it on `BroadcastChannel('pulse2-push')`, which is the channel
 * `PushNotifications.jsx:72` already listens on. Every surface, every action
 * taxonomy and every string downstream is the one that is already there.
 *
 * ONE DELIBERATE DIFFERENCE FROM ControlPanel, a consequence of the sender
 * being the phone rather than a laptop: NO ntfy.sh PUBLISH. ControlPanel also
 * calls `bridgePublish` because it has to reach a phone across the network.
 * We ARE the phone, so the local BroadcastChannel is the whole delivery path
 * and the free-tier daily quota and the 429 handling at pushBridge.js:150-158
 * never come into it. The desktop panel and its bridge are untouched and keep
 * working exactly as they do now.
 *
 * The (type, state, severity) mapping is NOT copied: both senders import
 * `payloadMeta` from src/lib/pushPayload.js, which is where it now lives.
 */
import { buildPushText } from '../utils/pushText'
import { payloadMeta } from './pushPayload'
import { applyPushEvent, applyDemoReset } from './pushEvents'

/* Our own BroadcastChannel instance. A channel never receives what it sent
   itself, so posting from a SECOND instance in this same page is what makes
   PushNotifications' listener fire — the same trick ControlPanel uses. */
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pulse2-push') : null

/** First variant, as the panel's own per-card state is initialised (:85). */
export function defaultVariantId(card) {
  return card?.variants?.[0]?.id || card?.id
}

/** The `default` value of every param, as the panel initialises them (:86). */
export function defaultParams(card) {
  return Object.fromEntries((card?.params || []).map((p) => [p.key, p.default]))
}

/** Can this card be fired at this system? Catalog's own predicate, guarded. */
export function isCardEligible(card, sys) {
  if (!sys) return false
  if (typeof card?.eligibility !== 'function') return true
  try { return card.eligibility(sys) !== false } catch { return false }
}

/* Sender-side publish. We are the originating tab, so we apply to the data
   layer ourselves — PushNotifications' channel handler is UI-only on purpose
   and will not write localStorage for us (see its comment at :533). */
function publish(event) {
  applyPushEvent(event)
  if (channel) channel.postMessage(event)
}

/**
 * WHERE a notification is delivered.
 *
 * The owner asked to see "how it looks when it's pop up when the app is
 * closed, and how it looks when we are in app" — so half of what this
 * simulator is for is the lock screen, and the phone could not reach it:
 * once locked, the gesture is (correctly) inert and there is no way back into
 * the sheet to fire anything.
 *
 * Each option is one of the events already in the bridge's documented
 * vocabulary (pushBridge.js:126-127) and already handled by
 * PushNotifications.jsx:538-541. Nothing new is invented; the surface event
 * goes out first, then the push lands on it.
 */
export const DELIVERY_SURFACES = [
  { id: 'inapp', label: 'In-app', event: null },
  { id: 'locked', label: 'Lock screen', event: 'lock-phone' },
  { id: 'shade', label: 'Shade', event: 'shade' },
  { id: 'other-app', label: 'Other app', event: 'other-app' },
]

/**
 * The beat between putting the surface up and firing onto it.
 *
 * Measured in Chromium at 393x852: the surface is painted 5ms after the
 * channel post for other-app, 18ms for the shade and 95ms for the lock screen
 * (it is the heaviest render of the three). Anything under ~150ms therefore
 * looks like the notification was already sitting there when the screen
 * appeared, which is the opposite of what the owner wants to show.
 *
 * 550ms = the 95ms worst-case paint plus a settled beat, and it lands before
 * the surfaces' own 0.3s `bannerIn` animation starts, so the arrival reads as
 * a second, separate event. The whole sequence finishes inside a second, which
 * is the other end of the budget — longer and a presenter thinks it is broken
 * and taps again.
 */
export const SURFACE_SETTLE_MS = 550

/**
 * Fire one catalog card onto one delivery surface.
 *
 * Resolves with the payload that went out, after the surface settle delay if
 * there was one. Returns a promise so tests (and callers) can await the whole
 * sequence rather than racing it.
 */
export function fireOnSurface(card, sys, opts = {}) {
  const surface = DELIVERY_SURFACES.find((s) => s.id === opts.surface) || DELIVERY_SURFACES[0]
  if (!surface.event) return Promise.resolve(firePushCard(card, sys, opts))
  if (channel) channel.postMessage({ type: surface.event })
  return new Promise((resolve) => {
    setTimeout(() => resolve(firePushCard(card, sys, opts)), SURFACE_SETTLE_MS)
  })
}

/**
 * Fire one catalog card at one system. Returns the payload that went out
 * (or null if there was nothing to fire at), so callers can assert on it.
 */
export function firePushCard(card, sys, opts = {}) {
  if (!card || !sys) return null
  const variantId = defaultVariantId(card)
  const paramValues = defaultParams(card)
  const siteName = sys.l4Name || sys.l3Name || sys.l2Name || ''
  const { title, body, action } = buildPushText(card, variantId, sys, paramValues, { persona: opts.persona })
  const { type, state, severity } = payloadMeta(card, variantId)

  const payload = {
    type, state, severity,
    v10_9_id: variantId,
    systemId: sys.id,
    systemName: sys.name,
    site: siteName,
    title,
    body,
    action,
    icon: card.glyph,
    flowRate: paramValues.flowRate,
    volume: paramValues.volume,
    duration: paramValues.duration,
    timestamp: new Date().toISOString(),
  }

  publish({ type: 'push', payload })
  // Wake the listeners that watch for data changes rather than storage events.
  publish({ type: 'data-changed' })
  return payload
}

/**
 * Put the simulated phone on its lock screen.
 *
 * `lock-phone` is already in the bridge's documented vocabulary
 * (pushBridge.js:126) and already handled at PushNotifications.jsx:538, but
 * nothing in the app has ever SENT it — the receiver has been sitting there
 * with no sender. This is that sender. No data-layer effect: it is a pure
 * surface switch.
 */
export function fireLockPhone() {
  if (channel) channel.postMessage({ type: 'lock-phone' })
}

/** Wipe demo state, locally and for anything else on the channel. */
export function fireDemoReset() {
  applyDemoReset()
  if (channel) channel.postMessage({ type: 'demo-reset' })
  publish({ type: 'data-changed' })
}
