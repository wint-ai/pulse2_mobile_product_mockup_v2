// @vitest-environment happy-dom
//
// THE WHOLE PATH, NOT THE DEEP LINK ALONE.
//
// Owner, 2026-11-02: "currently tell us more wired to system screen instead of
// the feedback screen". journeyDeepLinks.dom.test.jsx already pinned
// `?action=tag` — but it pinned it by MOUNTING SystemPageV2Screen on that URL,
// so it stayed green through a break that lives upstream of the URL. Nothing
// in the suite drove the BUTTON.
//
// This drives it: fire LE_01 for real through the simulator, tap "Tell us
// more" on the surface it landed on, let PushNotifications navigate, and read
// what the System page put on screen. All four delivery surfaces run through
// the same assertion, because the report did not say which was tapped.

import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, cleanup, act, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { UserProvider } from '@/context/UserContext'
import PushNotifications from '@/components/PushNotifications'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import { SYSTEMS } from '@/data/systems'
import { PUSH_CATALOG } from '@/data/pushCatalog'
import { firePushCard } from '@/lib/pushSimFire'

/* PushNotifications opens the ntfy.sh bridge on mount (pushBridge.js:189) and
   happy-dom ships no EventSource. The bridge is not what is under test — the
   local BroadcastChannel is the whole delivery path on-phone (pushSimFire's
   header says so) — so it is stubbed inert rather than mocked with behaviour. */
class InertEventSource {
  constructor() { this.readyState = 0 }
  addEventListener() {}
  removeEventListener() {}
  close() {}
}
globalThis.EventSource = globalThis.EventSource || InertEventSource

const LE_01 = PUSH_CATALOG.find(c => c.id === 'LE_01')
const sys = SYSTEMS.find(s => s.alert?.type === 'leak-high' || s.alert?.type === 'leak-low')

/* THE PROOF THE SHEET OPENED — repointed 2026-11-02, NOT deleted.
   This used to be 'Was this worth alerting about?'. The owner removed that
   question from the event-ended flow ("i want to remove the yse no step") and
   replaced it with one step of five verdicts, so the sheet's first screen has
   no heading at all and the old literal can never appear again. The path this
   suite pins is unchanged and must stay pinned — it is the regression test
   for the "Tell us more" break — so the assertion moves to the new first
   screen instead.

   'Unusual, no issue' is the marker because it is unique across BOTH flows
   and across the System page behind the sheet. 'Leak' would match the page's
   own alert copy; 'Unnecessary alert' differs from the ignore step's
   'Unnecessary Alert' only by one letter's case, which is a real distinction
   but a brittle thing to hang a regression test on. */
const FIRST_SCREEN = 'Unusual, no issue'

/* The surface events are the bridge's own vocabulary (pushBridge.js:126-127).
   A channel never receives what it sent, so the test needs its own instance —
   the same trick ControlPanel and pushSimFire use. */
const SURFACE_EVENT = { inapp: null, locked: 'lock-phone', shade: 'shade', 'other-app': 'other-app' }
const probe = new BroadcastChannel('pulse2-push')

beforeEach(() => { try { localStorage.clear() } catch { /* ignore */ } })
afterEach(cleanup)

/* Every URL the router passed through, in order. The System page STRIPS its
   own params on arrival (SystemPageV2Screen :1246-1250), so the only way to
   see which deep link a tap actually produced is to record it as it goes by. */
let visited = []
function LocationProbe() {
  const loc = useLocation()
  useEffect(() => { visited.push(loc.pathname + loc.search) }, [loc])
  return null
}

function mountPhone() {
  visited = []
  return render(
    <UserProvider>
      <MemoryRouter initialEntries={[`/system/${sys.id}`]}>
        <PushNotifications>
          <LocationProbe />
          <Routes>
            <Route path="/system/:systemId" element={<SystemPageV2Screen />} />
          </Routes>
        </PushNotifications>
      </MemoryRouter>
    </UserProvider>,
  )
}

/* BroadcastChannel delivery is a task in happy-dom, so each post has to be
   flushed before the surface it drives exists to tap. */
async function flush() {
  await act(async () => { await new Promise(r => setTimeout(r, 0)) })
}

async function deliver(surface) {
  const ev = SURFACE_EVENT[surface]
  if (ev) {
    await act(async () => { probe.postMessage({ type: ev }) })
    await flush()
  }
  let payload
  await act(async () => { payload = firePushCard(LE_01, sys) })
  await flush()
  /* The lock card keeps its actions in its expanded state, behind a tap on the
     body — the lock-screen idiom, and the one surface whose body tap does not
     navigate. */
  if (surface === 'locked') {
    await act(async () => { fireEvent.click(screen.getByText(payload.body)) })
    await flush()
  }
  return payload
}

async function tapTellUsMore() {
  const cta = await screen.findByText('Tell us more')
  await act(async () => { fireEvent.click(cta) })
  await flush()
}

describe('the End-of-Leak CTA reaches the feedback sheet, from every surface', () => {
  for (const surface of ['inapp', 'locked', 'shade', 'other-app']) {
    it(surface, async () => {
      mountPhone()
      await deliver(surface)
      await tapTellUsMore()
      expect(
        within(document.body).queryByText(FIRST_SCREEN),
        'Tell us more must open the feedback sheet, not merely land on the System page',
      ).toBeTruthy()
    })
  }
})

/* THE NEAR MISS — THE BUG ITSELF, measured rather than argued.

   The action row is a flex container with a gap between its two pills, an 8px
   margin above it and the card's bottom inset below it. A tap that lands in
   any of those hits the ROW or the CARD, not a pill — and only the pills call
   stopPropagation. So where the row is MOUNTED decides what such a tap does,
   and all three surfaces whose body tap navigates used to mount it INSIDE the
   element carrying that tap — ShadeCard, InAppBanner and HeadsUpNotification;
   no offsets, they move. A miss therefore dispatched 'view',
   which goes to ?focus=event — and on an ended water event the alert is
   already tombstoned (pushEvents.js:132, systems.js:192), so the overlay does
   not open and the user is left on the System page with nothing on it. That
   is the owner's report in one sentence.

   LockCard is in the list for symmetry: its body tap expands rather than
   navigates, so a miss there had nothing to fall through to, and this pins
   that it stays that way. */
describe('a tap that misses the pills must not navigate', () => {
  for (const surface of ['inapp', 'locked', 'shade', 'other-app']) {
    it(surface, async () => {
      mountPhone()
      await deliver(surface)
      /* The row, not a pill: exactly what the gap between the two pills is. */
      const row = screen.getByText('Tell us more').parentElement
      await act(async () => { fireEvent.click(row) })
      await flush()
      expect(
        visited.filter(u => u.includes('focus=event')),
        'a miss on the action row must not dispatch the body tap',
      ).toEqual([])
      expect(
        within(document.body).queryByText(FIRST_SCREEN),
        'and it must not open the sheet either — a miss does nothing',
      ).toBeNull()
    })
  }
})

/* AND THE BODY TAP IS STILL THERE. The owner settled it this morning and
   Rule 0 applies: the fix above moved the action row out of the tappable
   element, it did not take the tap away. */
describe('the body tap still navigates', () => {
  for (const surface of ['inapp', 'shade', 'other-app']) {
    it(surface, async () => {
      mountPhone()
      const payload = await deliver(surface)
      await act(async () => { fireEvent.click(screen.getByText(payload.body)) })
      await flush()
      expect(
        visited.filter(u => u.includes('focus=event')).length,
        'tapping the notification body must still open the push content',
      ).toBeGreaterThan(0)
    })
  }
})
