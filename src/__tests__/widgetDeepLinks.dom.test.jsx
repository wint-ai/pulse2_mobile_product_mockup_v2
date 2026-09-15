// @vitest-environment happy-dom
//
// Tests the deep-link query params from push notification taps:
//   ?pulse=1        - triggers 2-second arrival pulse on the Water Event card
//   ?action=ignore  - auto-opens Ignore bottom sheet
//   ?action=tag     - auto-opens Tag bottom sheet (PRD 15 § 7.1)

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WaterEventDetailsWidget from '../components/WaterEventDetailsWidget';
import { ThemeProvider } from '../context/ThemeContext';
import { applyPushEvent } from '../lib/pushEvents';
import { getSystemById } from '../data/systems';
import { APT_WITH_EVENT } from './fixtures';

const SYS_ID = APT_WITH_EVENT;

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

function renderWithSearchParams(sys, search = '') {
  return render(
    <MemoryRouter initialEntries={[`/system/${SYS_ID}${search ? '?' + search : ''}`]}>
      <ThemeProvider>
        <WaterEventDetailsWidget sys={sys} />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('deep-link query params trigger the right behavior', () => {
  function setupActiveEvent() {
    applyPushEvent({
      type: 'push',
      payload: { type: 'leak', state: 'Warning', severity: 'High Flow',
                 systemId: SYS_ID, flowRate: '22.5 L/min', volume: '18 L' },
    });
    return getSystemById(SYS_ID);
  }

  it('?action=tag opens the Tag bottom sheet', async () => {
    const sys = setupActiveEvent();
    renderWithSearchParams(sys, 'action=tag');
    // The Tag sheet header should be visible
    expect(await screen.findByText(/Tag this Water Event/i)).toBeInTheDocument();
  });

  it('?action=ignore opens the Ignore bottom sheet', async () => {
    const sys = setupActiveEvent();
    renderWithSearchParams(sys, 'action=ignore');
    expect(await screen.findByText(/Ignore this water event/i)).toBeInTheDocument();
  });

  it('?pulse=1 alone does not open any bottom sheet', () => {
    const sys = setupActiveEvent();
    renderWithSearchParams(sys, 'pulse=1');
    // No Tag / Ignore sheet
    expect(screen.queryByText(/Tag this Water Event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ignore this water event/i)).not.toBeInTheDocument();
  });

  it('?action=tag&pulse=1 opens Tag sheet (both params processed)', async () => {
    // The earlier bug: pulse caused early-return that skipped action processing.
    const sys = setupActiveEvent();
    renderWithSearchParams(sys, 'action=tag&pulse=1');
    expect(await screen.findByText(/Tag this Water Event/i)).toBeInTheDocument();
  });

  it('?action=ignore&pulse=1 opens Ignore sheet', async () => {
    const sys = setupActiveEvent();
    renderWithSearchParams(sys, 'action=ignore&pulse=1');
    expect(await screen.findByText(/Ignore this water event/i)).toBeInTheDocument();
  });

  it('no query params: widget renders, no sheets', () => {
    const sys = setupActiveEvent();
    renderWithSearchParams(sys);
    expect(screen.queryByText(/Tag this Water Event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ignore this water event/i)).not.toBeInTheDocument();
  });
});
