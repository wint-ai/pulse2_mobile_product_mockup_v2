// @vitest-environment happy-dom
//
// ── ONE EVENT, ONE ID — the DEVICE FAULT half of /alert/:systemId ───────────
//
// The owner's standing requirement: "It doesn't matter where you are looking
// from on specific event. If you are looking at it from the location page,
// from the account page, or system page, or even the event page, all data
// needs to be, always to reflect the same data."
//
// leakDetailEventId.dom.test.jsx pinned the WATER half of this route. The
// fault half went on minting its own id for another day: LeakDetail delegates
// every non-water alert to ErrorAlertDetail (LeakDetail.jsx, the `isWater`
// dispatch), and ErrorAlertDetail hashed `sys.id + alert.type` into
// `off-NNNN` / `ve-NNNN` / `pwr-NNNN`. So one comms loss on `ws-17404` read
// `off-4994` here and `CM-6492706` on the v2 event overlay, in /alerts and on
// /events/system/:id — four surfaces, one event, two strings.
//
// WHY THERE IS NO REGEX HERE. A shape assertion is exactly what let this
// survive: `off-4994` and `CM-6492706` each matched a plausible shape of its
// own, and eventFocusOverlay.dom.test.jsx's `/^(CM|VE|PW)-/` would have
// passed for ANY CM-prefixed string. Every expectation below is BUILT FROM
// THE DATA — `sys.alert.eventId`, read out of the same record the screen
// renders from — and compared character for character. No literal ids, no
// shape regex. The ids move when the dataset is regenerated and this file is
// meant to move with them.
//
// THE ROUTE IS THE REAL ONE. These mount LeakDetail at /alert/:systemId, not
// ErrorAlertDetail directly, so the delegation a user actually travels is
// part of what is under test.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LeakDetail from '../screens/leak/LeakDetail';
import { ThemeProvider } from '../context/ThemeContext';
import { SYSTEMS, getSystemById } from '../data/systems';
import { setSimulatedAlert, clearAllSimulatedAlerts } from '../data/simulatedAlerts';

const WATER = new Set(['leak-high', 'leak-low']);

/* The retired producer, copied verbatim from the body ErrorAlertDetail.jsx
   had before 2026-11-04 — the hash AND the prefix table, because the bug was
   in both halves. Kept HERE, and only here, so the test can state what the
   screen must no longer print without the screen keeping the code that
   printed it. Derived, never a literal. */
const RETIRED_ID_PREFIX = {
  'valve-error': 've',
  'battery-critical': 'bat',
  'battery-low': 'bat',
  'power-lost': 'pwr',
  'offline': 'off',
  'comm': 'off',
};
function retiredDeterministicId(seed, prefix) {
  let h = 0;
  for (const c of (seed || '')) h = (h * 31 + c.charCodeAt(0)) % 10000;
  return `${prefix}-${h.toString().padStart(4, '0')}`;
}
const retiredIdFor = sys =>
  retiredDeterministicId(sys.id + sys.alert.type, RETIRED_ID_PREFIX[sys.alert.type] || 'evt');

/* FIXTURES BY MEANING, not by id — the dataset is regenerated and hardcoded
   ids have broken this suite before (see fixtures.js). One system per DEVICE
   FAULT KIND present in the fleet, so FAULT_ID_PREFIX's whole mapping
   (buildTree.js:211 — offline->CM, valve-error->VE, power-lost->PW) is
   exercised rather than whichever single branch the first fault happens to
   take. */
const FAULT_SYSTEMS = (() => {
  const seen = new Map();
  for (const s of SYSTEMS) {
    if (!s.alert || WATER.has(s.alert.type)) continue;
    if (!seen.has(s.alert.type)) seen.set(s.alert.type, s);
  }
  return [...seen.entries()];
})();

function mountAlertRoute(systemId) {
  return render(
    <MemoryRouter initialEntries={[`/alert/${systemId}`]}>
      <ThemeProvider>
        <Routes>
          <Route path="/alert/:systemId" element={<LeakDetail />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // No sim alert, no suppression flag: the screen must read the GENERATED
  // record, which is the case the bug was in.
  localStorage.clear();
  clearAllSimulatedAlerts();
  cleanup();
});
afterEach(() => {
  clearAllSimulatedAlerts();
  localStorage.clear();
  cleanup();
});

describe('the fault fixtures themselves', () => {
  it('cover at least two distinct fault kinds, or the prefix mapping is untested', () => {
    expect(FAULT_SYSTEMS.length).toBeGreaterThanOrEqual(2);
  });
});

describe.each(FAULT_SYSTEMS)(
  '/alert/:systemId prints the canonical event id (%s)',
  (type, fixture) => {
    it('renders sys.alert.eventId, character for character', () => {
      const sys = getSystemById(fixture.id);
      const expected = sys.alert?.eventId;
      expect(
        expected,
        'the fault record must carry an eventId or this asserts nothing',
      ).toBeTruthy();
      expect(sys.alert.type).toBe(type);
      expect(WATER.has(sys.alert.type)).toBe(false);

      mountAlertRoute(fixture.id);

      // The Event ID card is the last block on the page: a label + the id.
      expect(screen.getByText('Event ID')).toBeInTheDocument();
      const printed = screen.getByText(expected);
      // getByText already matched the whole string; this pins that the node
      // holds the id ALONE — no prefix, no suffix, no decoration.
      expect(printed.textContent).toBe(expected);
    });

    it('prints the same string the record behind the alert carries', () => {
      const sys = getSystemById(fixture.id);
      // One id, both projections of the one record — asserted before the
      // render so a failure here says "the data layer drifted", not "the
      // screen did".
      expect(sys.event.eventId).toBe(sys.alert.eventId);

      mountAlertRoute(fixture.id);
      expect(screen.getByText(sys.event.eventId)).toBeInTheDocument();
    });

    it('no longer prints the hashed id this screen used to mint', () => {
      const sys = getSystemById(fixture.id);
      const retired = retiredIdFor(sys);
      expect(retired, 'the retired producer must still produce something').toBeTruthy();
      // The two really were different strings for one event — if they were
      // ever equal, the assertion below would pass vacuously.
      expect(retired).not.toBe(sys.alert.eventId);

      mountAlertRoute(fixture.id);
      expect(screen.queryByText(retired)).toBeNull();
    });
  },
);

/* ── THE FALLBACK IS LOAD-BEARING, NOT DEAD CODE ───────────────────────────
   `applySimOverlay` replaces `sys.alert` with the pushed alert and nulls
   `sys.event` (systems.js), and `updateActiveAlert` (pushEvents.js) mints
   that pushed alert with type / label / startedAt / startedAtIso and NO
   eventId. So on the pushed path there is no canonical id to read and the
   screen must still show the user something. This pins both halves of that:
   the pushed alert really carries no eventId, and the screen still renders a
   non-empty id for it. */
describe('a pushed / simulated fault has no canonical id, and the fallback covers it', () => {
  const [, fixture] = FAULT_SYSTEMS[0];

  it('keeps an Event ID on screen when the record is gone', () => {
    setSimulatedAlert(fixture.id, {
      type: 'offline',
      label: 'Device Offline',
      startedAt: '09:41',
      startedAtIso: new Date().toISOString(),
    });

    const sys = getSystemById(fixture.id);
    // The premise: the overlay dropped the record, and the pushed alert
    // carries no id of its own.
    expect(sys.event).toBeNull();
    expect(sys.alert.eventId).toBeUndefined();

    mountAlertRoute(fixture.id);

    expect(screen.getByText('Event ID')).toBeInTheDocument();
    expect(screen.getByText(retiredIdFor(sys))).toBeInTheDocument();
  });
});
