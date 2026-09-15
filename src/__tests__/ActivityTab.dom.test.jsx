// @vitest-environment happy-dom
//
// Real React rendering test for the Timeline (ActivityTab). Renders the
// component with various sim-alert states and asserts on the DOM text — this
// is the level Rami's been doing manually, automated.

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ActivityTab from '../screens/systems/ActivityTab';
import { ThemeProvider } from '../context/ThemeContext';
import { UserProvider } from '../context/UserContext';
import { applyPushEvent } from '../lib/pushEvents';
import { getSystemById } from '../data/systems';
import { APT_WITH_EVENT } from './fixtures';

const SYS_ID = APT_WITH_EVENT;

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

function renderTimeline(sys) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <UserProvider>
          <ActivityTab sys={sys} />
        </UserProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('Timeline tab renders the right rows in the DOM', () => {
  it('Warning push: DOM shows "High-flow Water Event detected"', () => {
    applyPushEvent({
      type: 'push',
      payload: { type: 'leak', state: 'Warning', severity: 'High Flow',
                 systemId: SYS_ID, flowRate: '22.5 L/min', volume: '18 L' },
    });
    const sys = getSystemById(SYS_ID);
    renderTimeline(sys);
    expect(screen.getByText('High-flow Water Event detected')).toBeInTheDocument();
  });

  it('Shutoff push: DOM shows "Shutoff level reached" - the exact regression', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS_ID } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Shutoff', severity: 'High Flow', systemId: SYS_ID, volume: '80 L' } });
    const sys = getSystemById(SYS_ID);
    renderTimeline(sys);
    expect(screen.getByText('Shutoff level reached')).toBeInTheDocument();
    // And specifically NOT the wrong title that shipped before the fix
    expect(screen.queryAllByText('High-flow Water Event detected')).toHaveLength(1);
  });

  it('Full lifecycle: DOM shows all 6 distinct titles', () => {
    function fire(state, extra = {}) {
      applyPushEvent({ type: 'push', payload: { type: 'leak', state, severity: 'High Flow', systemId: SYS_ID, ...extra } });
    }
    fire('Warning');
    fire('Ongoing');
    fire('Shutoff');
    fire('Shutoff', { v10_9_id: 'VC_S_02' });
    fire('Shutoff', { v10_9_id: 'VC_OK_02' });
    fire('End of Leak');
    const sys = getSystemById(SYS_ID);
    renderTimeline(sys);

    expect(screen.getByText('High-flow Water Event detected')).toBeInTheDocument();
    expect(screen.getByText('Ongoing reminder fired')).toBeInTheDocument();
    expect(screen.getByText('Shutoff level reached')).toBeInTheDocument();
    expect(screen.getByText('Valve started closing')).toBeInTheDocument();
    expect(screen.getByText('Valve closed successfully')).toBeInTheDocument();
    expect(screen.getByText('Water Event ended')).toBeInTheDocument();
  });

  it('lifecycle ORDER: 6 pushes render newest-first in the DOM', () => {
    function fire(state, extra = {}) {
      applyPushEvent({ type: 'push', payload: { type: 'leak', state, severity: 'High Flow', systemId: SYS_ID, ...extra } });
    }
    fire('Warning');
    fire('Ongoing');
    fire('Shutoff');
    fire('Shutoff', { v10_9_id: 'VC_S_02' });
    fire('Shutoff', { v10_9_id: 'VC_OK_02' });
    fire('End of Leak');
    const sys = getSystemById(SYS_ID);
    renderTimeline(sys);

    // Find each title in the DOM, then read the document.body to get
    // top-to-bottom render order.
    const expectedOrder = [
      'Water Event ended',
      'Valve closed successfully',
      'Valve started closing',
      'Shutoff level reached',
      'Ongoing reminder fired',
      'High-flow Water Event detected',
    ];
    const body = document.body.textContent;
    // Find the index of each title in the body text.
    const positions = expectedOrder.map(title => body.indexOf(title));
    // None should be -1 (all present).
    positions.forEach((p, i) => {
      expect(p).toBeGreaterThan(-1);
    });
    // Positions must be strictly increasing (top-down render order).
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  it('Valve closed successfully (VC_OK_02) DOES appear in the DOM', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS_ID } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Shutoff', severity: 'High Flow', systemId: SYS_ID, v10_9_id: 'VC_S_02' } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Shutoff', severity: 'High Flow', systemId: SYS_ID, v10_9_id: 'VC_OK_02' } });
    const sys = getSystemById(SYS_ID);
    renderTimeline(sys);
    expect(screen.getByText('Valve closed successfully')).toBeInTheDocument();
    expect(screen.getByText('Valve started closing')).toBeInTheDocument();
  });

  it('Low Flow Warning: DOM shows "Low-flow Water Event detected" (not high)', () => {
    applyPushEvent({
      type: 'push',
      payload: { type: 'leak', state: 'Warning', severity: 'Low Flow',
                 systemId: SYS_ID, v10_9_id: 'WA_02' },
    });
    const sys = getSystemById(SYS_ID);
    renderTimeline(sys);
    expect(screen.getByText('Low-flow Water Event detected')).toBeInTheDocument();
    // Also assert the bug that the WORD 'flow' doesn't mis-classify high as low
    expect(screen.queryByText('High-flow Water Event detected')).not.toBeInTheDocument();
  });
});
