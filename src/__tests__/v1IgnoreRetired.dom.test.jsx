// @vitest-environment happy-dom
//
// THE V1 IGNORE SURFACES ARE RETIRED (owner, 2026-10-31: "Retire them").
//
// Two v1 paths used to commit an ignore alongside the canonical v2 flow:
//
//   LeakDetail  (/alert/:systemId, /leak/:systemId)  -> IgnoreBottomSheet
//   WaterEventDetailsWidget (/v1/system/:id, tenant) -> IgnoreBottomSheet
//
// They differed from v2's WaterEventFeedbackSheet in ways that mattered: no
// irreversibility confirmation, no ShutOff gate (v2 refuses trigger="ignore"
// at eventState 'shutoff'), no eventFeedbackStore write, and a different
// 18-chip taxonomy. The owner was shown that and chose to retire them rather
// than reconcile them.
//
// WHAT IS *NOT* RETIRED, and is asserted here so a later cleanup does not take
// it as collateral:
//   - the "Ignored by {actor}" banner on LeakDetail. It reads ignoredIncidents,
//     which the v2 flow writes, so an event ignored on /system/:id still reads
//     as ignored here -- actor and cause included, which the v2 overlay itself
//     deliberately stopped drawing.
//   - the tag flow (?action=tag -> TagBottomSheet -> tagsStore). ActivityTab,
//     SystemDetail, WaterEventSummary and WaterEventDetailsWidget all still
//     read tagsStore.
//   - the per-step actor timeline.
//
// The widget's half of the retirement is pinned in widgetDeepLinks.dom.test.jsx
// (it already stands up an active Warning on that component). This file covers
// LeakDetail, which had no DOM test of its own.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LeakDetail from '../screens/leak/LeakDetail';
import { ThemeProvider } from '../context/ThemeContext';
import { applyPushEvent } from '../lib/pushEvents';
import { getSystemById } from '../data/systems';
import { ignoreIncident } from '../data/ignoredIncidents';
import { APT_WITH_EVENT } from './fixtures';

const SYS_ID = APT_WITH_EVENT;

function mountLeakDetail(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/alert/${SYS_ID}${search}`]}>
      <ThemeProvider>
        <Routes>
          <Route path="/alert/:systemId" element={<LeakDetail />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

function startWarning() {
  applyPushEvent({
    type: 'push',
    payload: {
      type: 'leak', state: 'Warning', severity: 'High Flow',
      systemId: SYS_ID, flowRate: '22.5 L/min', volume: '18 L',
    },
  });
  return getSystemById(SYS_ID);
}

beforeEach(() => {
  localStorage.clear();
  cleanup();
});
afterEach(cleanup);

describe('LeakDetail no longer offers its own Ignore', () => {
  it('a live Warning draws no Ignore card and no Ignore button', () => {
    startWarning();
    mountLeakDetail();
    expect(screen.queryByText('Ignore Water Event')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ignore' })).not.toBeInTheDocument();
  });

  it('?action=ignore opens nothing (the v1 sheet is unmounted, not just unrouted)', () => {
    startWarning();
    mountLeakDetail('?action=ignore');
    expect(screen.queryByText(/Ignore this Water Event/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Ignore Water Event')).not.toBeInTheDocument();
  });
});

describe('what the retirement deliberately leaves standing', () => {
  it('still reports an ignore committed elsewhere, with actor and cause', () => {
    // Exactly what the v2 flow writes on "Ignore anyway" + a captured answer.
    startWarning();
    ignoreIncident(SYS_ID, { tag: 'Irrigation — scheduled', ignoredBy: 'Sarah Chen' });
    mountLeakDetail();
    expect(screen.getByText(/Ignored by/)).toBeInTheDocument();
    expect(screen.getByText(/Sarah Chen/)).toBeInTheDocument();
    expect(screen.getByText(/Irrigation/)).toBeInTheDocument();
  });

  /* Asserted on the sheet's pitch line, not its title: the screen's own Tag
     card is titled "Tag this Water Event" too, so the title matches twice and
     says nothing about whether the sheet opened. */
  it('keeps the tag flow: ?action=tag still opens TagBottomSheet', async () => {
    startWarning();
    mountLeakDetail('?action=tag');
    expect(
      await screen.findByText('The system learns, your reports get better.'),
    ).toBeInTheDocument();
  });

  it('keeps the claim control, now reading "Assign to me"', () => {
    startWarning();
    mountLeakDetail();
    expect(screen.getAllByText('Assign to me').length).toBeGreaterThan(0);
  });
});
