/**
 * How a catalog card becomes the (type, state, severity) triple on a push
 * payload. ONE copy, imported by both senders.
 *
 * This lived as a module-private function in ControlPanel.jsx until the
 * on-phone trigger needed exactly the same mapping and could not reach it.
 * A second copy is how the casing trap below gets reintroduced by someone who
 * only reads one of the two files, so it is extracted rather than duplicated.
 * Both senders — the desktop panel at /push and the phone's push-sim sheet —
 * now import this, and the behaviour of each is unchanged by the move.
 *
 * THE CASING TRAP. `state` is 'Shutoff': capital S, LOWERCASE o. That is the
 * spelling `buildActions` (src/utils/notificationActions.js) switches on.
 * 'ShutOff' — which is what getLeakState returns, and therefore the spelling a
 * reader is most likely to "correct" this to — falls through that switch's
 * default to a View-only action set, with no error and no warning anywhere.
 * src/__tests__/pushSimTrigger.dom.test.jsx pins it.
 */

// Map a card's fireableType to (type, state, severity) on the push payload.
// All state-mutation is handled by applyPushEvent in src/lib/pushEvents.js -
// the sender's only job is to produce a payload and broadcast it.
export function payloadMeta(card, variantId) {
  let type = card.fireableType;
  let state;
  let severity;
  if (card.fireableType === 'leak-warning')        { type = 'leak'; state = 'Warning'; }
  else if (card.fireableType === 'leak-ongoing')   { type = 'leak'; state = 'Ongoing'; }
  else if (card.fireableType === 'leak-shutoff')   { type = 'leak'; state = 'Shutoff'; }
  else if (card.fireableType === 'leak-ended')     { type = 'leak'; state = 'End of Leak'; }
  else if (card.fireableType === 'valve-closing' || card.fireableType === 'valve-closed-after-we') {
    // VC_S_02 / VC_OK_02 are Shutoff-phase sub-states, NOT closure pushes.
    // v10_9_id on the payload selects the sub-state.
    type = 'leak'; state = 'Shutoff';
  }
  if (type === 'leak') {
    severity = (variantId === 'WA_02' || variantId === 'OL_02_low') ? 'Low Flow' : 'High Flow';
  }
  return { type, state, severity };
}
