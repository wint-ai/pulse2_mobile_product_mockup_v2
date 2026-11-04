// @vitest-environment happy-dom
//
// ── ONE EVENT, ONE ID — /alert/:systemId ────────────────────────────────────
//
// The owner's standing requirement: "It doesn't matter where you are looking
// from on specific event. If you are looking at it from the location page,
// from the account page, or system page, or even the event page, all data
// needs to be, always to reflect the same data."
//
// LeakDetail was the last surface still minting its own event id. Its private
// `toLeakId(incident)` hashed the INCIDENT id (`inc-<sys>-active`) into a
// 4-digit `lk-NNNN`, so /alert/esrt-bldg-A-apt-2 printed "lk-6215" for the
// event every other surface calls "LK-6363024". The route is live (App.jsx)
// and reached from the KPI detail list and the v2 system page, so a user
// really saw the two strings for one event.
//
// WHY THERE IS NO REGEX HERE. A shape assertion (`/^lk-\d{4}$/`, or even
// `/^LK-\d+$/`) is exactly what let this survive: both producers matched
// their own shape, and both shapes looked plausible. So every expectation
// below is BUILT FROM THE DATA — `sys.alert.eventId` read out of the same
// record the screen renders from — and compared character for character.
// Nothing here is a hard-coded literal; the ids move when the dataset is
// regenerated, and this file is supposed to move with them.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LeakDetail from '../screens/leak/LeakDetail';
import { ThemeProvider } from '../context/ThemeContext';
import { getSystemById } from '../data/systems';
import { getActiveIncident } from '../data/incidents';
import { CURRENT_EVENTS } from '../data/events';
import { APT_WITH_EVENT, APT_LOW_FLOW } from './fixtures';

/* The retired producer, copied verbatim from the body it had in
   LeakDetail.jsx before 2026-11-04. Kept HERE, and only here, so the test can
   state what the screen must no longer print without the screen having to
   keep the code that printed it. Derived from the incident id, like the
   original — never a literal. */
function retiredToLeakId(incident) {
  if (!incident?.id) return null;
  let hash = 0;
  for (const c of incident.id) hash = (hash * 31 + c.charCodeAt(0)) % 10000;
  return `lk-${hash.toString().padStart(4, '0')}`;
}

function mountLeakDetail(systemId) {
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
  // No sim alert, no suppression flag: the screen must read the generated
  // record, which is the case the bug was in.
  localStorage.clear();
  cleanup();
});
afterEach(cleanup);

describe.each([
  ['high flow', APT_WITH_EVENT],
  ['low flow', APT_LOW_FLOW],
])('/alert/:systemId prints the canonical event id (%s)', (_label, SYS_ID) => {
  it('renders sys.alert.eventId, character for character', () => {
    const sys = getSystemById(SYS_ID);
    const expected = sys.alert?.eventId;
    expect(
      expected,
      'fixture must be a system with an active water event carrying a record',
    ).toBeTruthy();
    expect(sys.alert.type === 'leak-high' || sys.alert.type === 'leak-low').toBe(true);

    mountLeakDetail(SYS_ID);

    // The Event ID card is the last block on the page: a label + the id.
    expect(screen.getByText('Event ID')).toBeInTheDocument();
    const printed = screen.getByText(expected);
    // getByText already matched the whole string; this pins that the node
    // holds the id ALONE — no prefix, no suffix, no decoration.
    expect(printed.textContent).toBe(expected);
  });

  it('prints the same string the record, the alert and the alerts feed carry', () => {
    const sys = getSystemById(SYS_ID);
    const incident = getActiveIncident(SYS_ID);
    const feedRow = CURRENT_EVENTS.find(e => e.system === SYS_ID && !e.resolved);

    // One id, every projection of the one record — asserted before the render
    // so a failure here says "the data layer drifted", not "the screen did".
    expect(sys.event.eventId).toBe(sys.alert.eventId);
    expect(incident.eventId).toBe(sys.alert.eventId);
    expect(feedRow.eventId).toBe(sys.alert.eventId);

    mountLeakDetail(SYS_ID);
    expect(screen.getByText(sys.alert.eventId)).toBeInTheDocument();
  });

  it('no longer prints the hashed incident id this screen used to mint', () => {
    const incident = getActiveIncident(SYS_ID);
    const retired = retiredToLeakId(incident);
    expect(
      retired,
      'the fixture must have an active incident, or this asserts nothing',
    ).toBeTruthy();
    // The two really were different strings for one event — if the dataset
    // ever made them equal, the assertion below would pass vacuously.
    expect(retired).not.toBe(getSystemById(SYS_ID).alert.eventId);

    mountLeakDetail(SYS_ID);
    expect(screen.queryByText(retired)).toBeNull();
  });
});
