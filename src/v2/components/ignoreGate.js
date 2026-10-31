/**
 * WHO MAY BE IGNORED — the one place this question is answered.
 *
 * Ignore is a WARNING-state action (PRD 06 + 14). `getLeakState` reads an
 * incident's own steps and answers 'Warning' | 'Ongoing' | 'ShutOff';
 * WaterEventFeedbackSheet takes the lowercase pair 'warning' | 'shutoff' as
 * its `eventState` prop and refuses to render the ignore flow on 'shutoff'.
 * 'Ongoing' stays ignorable — only a closed valve takes it away.
 *
 * WHY THIS IS A MODULE AND NOT A LITERAL AT EACH SITE. Until 2026-10-31 the
 * comparison was retyped at three call sites (SystemPageV2Screen,
 * HomeAllAccounts and the sheet's own backstop) and EventFocusOverlay was
 * about to become a fourth. That is not hypothetical drift: the overlay's
 * Ignore tile had skipped the question entirely, so on a shut-off event it
 * rendered, the user tapped it, and the sheet it opens returned null —
 * nothing happened and nothing was said. A control and its destination
 * disagreeing is exactly what a second copy of a condition buys you.
 *
 * The repo already spells this one concept five ways — 'ShutOff'
 * (incidents.js), 'Shutoff' (pushEvents.js), 'shutoff' (this vocabulary and
 * EventFocusOverlay's graph marks), 'Shut-off' (SystemPage.jsx), against the
 * 'warning' it is contrasted with. A sixth site is how the five drift apart,
 * so new callers ask these two functions instead of adding one.
 *
 * ITS OWN FILE because WaterEventFeedbackSheet is where it naturally wanted
 * to live and eslint's react-refresh/only-export-components refuses a
 * component file that also exports plain functions.
 */
import { getLeakState } from '@/data/incidents'

/** getLeakState's answer, in the `eventState` vocabulary the sheet takes. */
export function eventStateFor(incident) {
  return getLeakState(incident) === 'ShutOff' ? 'shutoff' : 'warning'
}

/**
 * Will the ignore flow actually render for this `eventState`? Ask BEFORE
 * drawing any control that leads there, so the control and its destination
 * agree — see EventFocusOverlay's Ignore tile.
 */
export function acceptsIgnore(eventState) {
  return eventState !== 'shutoff'
}
