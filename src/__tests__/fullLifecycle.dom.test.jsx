// @vitest-environment happy-dom
//
// THE gold-standard test: fires the full 6-push lifecycle EXACTLY like the
// user does on the pusher, then renders the actual ActivityTab, then asserts
// every step of what should appear on screen. If this test ever fails, the
// user-facing demo is broken.

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

function fire(state, extra = {}) {
  applyPushEvent({
    type: 'push',
    payload: { type: 'leak', state, severity: 'High Flow', systemId: SYS_ID, ...extra },
  });
}

function renderTimeline() {
  const sys = getSystemById(SYS_ID);
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

// Helper: read the rendered titles in top-to-bottom order from the DOM.
function timelineTitlesFromDOM() {
  const EXPECTED_TITLES = [
    'High-flow Water Event detected',
    'Low-flow Water Event detected',
    'Ongoing reminder fired',
    'Shutoff level reached',
    'Valve started closing',
    'Valve closed successfully',
    'Water Event ended',
  ];
  const bodyText = document.body.textContent;
  // Return only the titles that appear in the body, in the order they appear.
  return EXPECTED_TITLES
    .map(t => ({ title: t, idx: bodyText.indexOf(t) }))
    .filter(x => x.idx >= 0)
    .sort((a, b) => a.idx - b.idx)
    .map(x => x.title);
}

describe('Rami\'s full lifecycle flow rendered in the actual ActivityTab', () => {
  it('Step 1: Warning detected -> 1 row visible', () => {
    fire('Warning');
    renderTimeline();
    expect(screen.getByText('High-flow Water Event detected')).toBeInTheDocument();
    expect(timelineTitlesFromDOM()).toEqual(['High-flow Water Event detected']);
  });

  it('Step 2: Ongoing reminder -> 2 rows, Ongoing at TOP', () => {
    fire('Warning');
    fire('Ongoing');
    renderTimeline();
    expect(timelineTitlesFromDOM()).toEqual([
      'Ongoing reminder fired',
      'High-flow Water Event detected',
    ]);
  });

  it('Step 3: Shutoff -> 3 rows, Shutoff at TOP', () => {
    fire('Warning');
    fire('Ongoing');
    fire('Shutoff');
    renderTimeline();
    expect(timelineTitlesFromDOM()).toEqual([
      'Shutoff level reached',
      'Ongoing reminder fired',
      'High-flow Water Event detected',
    ]);
  });

  it('Step 4: Valve started closing -> 4 rows, Valve closing at TOP', () => {
    fire('Warning'); fire('Ongoing'); fire('Shutoff');
    fire('Shutoff', { v10_9_id: 'VC_S_02' });
    renderTimeline();
    expect(timelineTitlesFromDOM()).toEqual([
      'Valve started closing',
      'Shutoff level reached',
      'Ongoing reminder fired',
      'High-flow Water Event detected',
    ]);
  });

  it('Step 5: Valve closed successfully -> 5 rows, Valve closed at TOP', () => {
    fire('Warning'); fire('Ongoing'); fire('Shutoff');
    fire('Shutoff', { v10_9_id: 'VC_S_02' });
    fire('Shutoff', { v10_9_id: 'VC_OK_02' });
    renderTimeline();
    expect(timelineTitlesFromDOM()).toEqual([
      'Valve closed successfully',
      'Valve started closing',
      'Shutoff level reached',
      'Ongoing reminder fired',
      'High-flow Water Event detected',
    ]);
  });

  it('Step 6: Water Event ended -> 6 rows, Ended at TOP', () => {
    fire('Warning'); fire('Ongoing'); fire('Shutoff');
    fire('Shutoff', { v10_9_id: 'VC_S_02' });
    fire('Shutoff', { v10_9_id: 'VC_OK_02' });
    fire('End of Leak');
    renderTimeline();
    expect(timelineTitlesFromDOM()).toEqual([
      'Water Event ended',
      'Valve closed successfully',
      'Valve started closing',
      'Shutoff level reached',
      'Ongoing reminder fired',
      'High-flow Water Event detected',
    ]);
  });

  it('Final lifecycle state: each row appears EXACTLY ONCE in the DOM', () => {
    fire('Warning'); fire('Ongoing'); fire('Shutoff');
    fire('Shutoff', { v10_9_id: 'VC_S_02' });
    fire('Shutoff', { v10_9_id: 'VC_OK_02' });
    fire('End of Leak');
    renderTimeline();
    expect(screen.getAllByText('High-flow Water Event detected')).toHaveLength(1);
    expect(screen.getAllByText('Ongoing reminder fired')).toHaveLength(1);
    expect(screen.getAllByText('Shutoff level reached')).toHaveLength(1);
    expect(screen.getAllByText('Valve started closing')).toHaveLength(1);
    expect(screen.getAllByText('Valve closed successfully')).toHaveLength(1);
    expect(screen.getAllByText('Water Event ended')).toHaveLength(1);
  });
});
