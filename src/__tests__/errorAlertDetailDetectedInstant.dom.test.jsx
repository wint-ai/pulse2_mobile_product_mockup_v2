// @vitest-environment happy-dom
//
// ── ONE EVENT, ONE INSTANT — the DEVICE FAULT half of /alert/:systemId ──────
//
// The owner's standing requirement: "It doesn't matter where you are looking
// from on specific event ... all data needs to be, always to reflect the same
// data."
//
// THE DEFECT. ErrorAlertDetail's summary line printed a hard-coded day word in
// front of a BARE WALL CLOCK: `Today · {alert.startedAt}`. `alert.startedAt` is
// `clockOf(detectedAtIso)` (buildTree.js `alertFromRecord`) and carries no day
// at all, so a fault that began the previous evening was announced as having
// started this morning — `ws-17404`'s comms loss, 1d 9h old, read "Today ·
// 01:34". Wrong by a whole day, on the live route.
//
// This is the same defect eventFocusOverlay.dom.test.jsx pins shut on the
// WATER half of this route, and it is pinned the same way here.
//
// WHY THERE IS NO SHAPE REGEX AND NO LITERAL DATE. A `/\w{3} \d{1,2} · \d\d:\d\d/`
// would have passed for ANY day in front of the clock, including the wrong
// one, which is precisely the bug. A literal "Nov 3 · 01:34" would rot the
// moment the dataset is regenerated — `BUILD_NOW` moves every run. So every
// expectation below is CONSTRUCTED FROM `alert.startedAtIso`, the single
// absolute instant the record carries, and compared character for character.
// The month table and the padding are spelled out here on purpose: the test
// must not reach for the production formatter it is checking.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LeakDetail from '../screens/leak/LeakDetail';
import { ThemeProvider } from '../context/ThemeContext';
import { SYSTEMS, getSystemById } from '../data/systems';
import { clearAllSimulatedAlerts } from '../data/simulatedAlerts';

const WATER = new Set(['leak-high', 'leak-low']);

/* The card format, restated from wint-format-standards.md ("Alerts/cards":
   no year, middle dot, 24-hour clock, named month) rather than imported from
   `formatDate`, so this file is an independent statement of the required
   string and not a tautology over the function that produces it. */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = n => String(n).padStart(2, '0');
function cardFormat(iso) {
  const d = new Date(iso);
  return `${MON[d.getMonth()]} ${d.getDate()} \u00B7 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* FIXTURES BY MEANING, not by id — the dataset is regenerated and hardcoded
   ids have broken suites in this repo before. One system per device-fault
   kind in the fleet. */
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
  it('cover at least two fault kinds', () => {
    expect(FAULT_SYSTEMS.length).toBeGreaterThanOrEqual(2);
  });

  /* WITHOUT THIS THE SUITE BELOW CAN PASS VACUOUSLY. If every generated fault
     happened to have started today, "Today · HH:MM" would have been RIGHT and
     nothing here would have caught the missing day. At least one fixture must
     have been detected on a different calendar day from the render. */
  it('include at least one fault detected on an earlier day than today', () => {
    const today = new Date().toDateString();
    const older = FAULT_SYSTEMS.filter(
      ([, s]) => new Date(s.alert.startedAtIso).toDateString() !== today,
    );
    expect(
      older.length,
      'every fault started today — the wrong-day defect is untestable on this dataset',
    ).toBeGreaterThanOrEqual(1);
  });
});

describe.each(FAULT_SYSTEMS)(
  '/alert/:systemId dates the detection instant (%s)',
  (type, fixture) => {
    it('prints the record\u2019s own instant in the card format, character for character', () => {
      const sys = getSystemById(fixture.id);
      const iso = sys.alert?.startedAtIso;
      expect(iso, 'the fault record must carry an absolute instant').toBeTruthy();
      expect(sys.alert.type).toBe(type);

      mountAlertRoute(fixture.id);

      const expected = cardFormat(iso);
      const printed = screen.getByText(expected);
      // getByText matched the whole string; this pins the node holds the
      // instant ALONE — no "Today", no other day word in front of it.
      expect(printed.textContent).toBe(expected);
    });

    /* THE DEFECT ITSELF, as a negative about the SHAPE rather than about one
       field's value: nothing on this surface renders a bare "HH:MM" as its
       whole content. `alert.startedAt` is exactly that string, so this fails
       the moment any row goes back to drawing it. */
    it('leaves no bare dayless clock anywhere on the screen', () => {
      mountAlertRoute(fixture.id);
      expect(screen.queryByText(/^\d{1,2}:\d{2}$/)).toBeNull();
    });

    it('no longer announces the event as having started today', () => {
      const sys = getSystemById(fixture.id);
      mountAlertRoute(fixture.id);
      // The retired string, rebuilt from the data rather than quoted.
      expect(screen.queryByText(`Today \u00B7 ${sys.alert.startedAt}`)).toBeNull();
      expect(screen.queryByText(/Today \u00B7/)).toBeNull();
    });

    /* THE SECOND SURFACE OF THE SAME DIVERGENCE. The Notified rows printed
       the DETECTION clock relabelled as a notification time. The fault record
       carries one milestone only, `detected`; there is no notified instant,
       so no time is drawn. */
    it('shows no borrowed clock on the Notified rows', () => {
      const sys = getSystemById(fixture.id);
      mountAlertRoute(fixture.id);

      const heading = screen.getByText(/^Notified \u00B7 \d+ recipients?$/);
      const card = heading.parentElement;
      expect(card, 'the Notified card lost its heading').toBeTruthy();
      expect(within(card).queryByText(sys.alert.startedAt)).toBeNull();
      expect(within(card).queryByText(/^\d{1,2}:\d{2}$/)).toBeNull();
      // The row itself is still there — this is not a quiet removal of the
      // recipient list, only of a number that named the wrong fact.
      expect(within(card).getAllByText(/Push|Email|SMS/).length).toBeGreaterThan(0);
    });
  },
);

/* ── THE WHOLE-DAY ERROR, STATED AS ITSELF ─────────────────────────────────
   The generic assertions above would all pass on a fault that genuinely
   started today. This one picks a fault that did NOT and checks the rendered
   day is the instant's day and not the render's, which is the only form of
   the bug a user ever saw. */
describe('a fault older than a day is dated to the day it began', () => {
  const older = FAULT_SYSTEMS.find(
    ([, s]) => new Date(s.alert.startedAtIso).toDateString() !== new Date().toDateString(),
  );

  it('names the detection day, not today', () => {
    expect(older, 'no fixture older than today — see the fixture guard above').toBeTruthy();
    const sys = getSystemById(older[1].id);
    const at = new Date(sys.alert.startedAtIso);

    mountAlertRoute(sys.id);

    expect(screen.getByText(cardFormat(sys.alert.startedAtIso))).toBeInTheDocument();
    // And the day it would have been read as, had the day been taken from the
    // render instead of from the record, is absent.
    const now = new Date();
    const todayDated = `${MON[now.getMonth()]} ${now.getDate()} \u00B7 ${pad(at.getHours())}:${pad(at.getMinutes())}`;
    expect(todayDated).not.toBe(cardFormat(sys.alert.startedAtIso));
    expect(screen.queryByText(todayDated)).toBeNull();
  });
});
