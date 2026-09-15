// @vitest-environment happy-dom
//
// Renders the Water Event widget for each lifecycle state, asserts the right
// state pill and KPIs render. Catches widget-side regressions where the data
// is right but the visual rendering shows a different state.

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

function renderWidget(sys) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <WaterEventDetailsWidget sys={sys} />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('WaterEventDetailsWidget renders correct state pill', () => {
  it('Warning state -> "Warning" pill visible', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS_ID, flowRate: '22.5 L/min', volume: '18 L' } });
    const sys = getSystemById(SYS_ID);
    renderWidget(sys);
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('Ongoing state -> "Ongoing" pill visible', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS_ID } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Ongoing', severity: 'High Flow', systemId: SYS_ID, volume: '42 L' } });
    const sys = getSystemById(SYS_ID);
    renderWidget(sys);
    expect(screen.getByText('Ongoing')).toBeInTheDocument();
  });

  it('Shutoff state -> "Shutoff" pill visible + sys.valve flipped to closed', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS_ID } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Shutoff', severity: 'High Flow', systemId: SYS_ID } });
    const sys = getSystemById(SYS_ID);
    expect(sys.valve).toBe('closed'); // valveOverride applied
    renderWidget(sys);
    expect(screen.getByText('Shutoff')).toBeInTheDocument();
  });

  it('End of Leak -> sys.alert is tombstoned (widget should not render on System page)', () => {
    // Per Rami 2026-06-06: a resolved Water Event must disappear from the
    // system page entirely. getSystemById returns sys.alert = null so the
    // System page's `isWaterEvent` guard hides the widget. The lifecycle
    // history stays accessible via the Activity Timeline (separate store).
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS_ID } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'End of Leak', severity: 'High Flow', systemId: SYS_ID, volume: '86 L', duration: '2h 14m' } });
    const sys = getSystemById(SYS_ID);
    expect(sys.alert).toBeNull();
  });

  it('flow rate KPI rendered from push params', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: SYS_ID, flowRate: '99 L/min', volume: '5 L' } });
    const sys = getSystemById(SYS_ID);
    renderWidget(sys);
    expect(screen.getByText(/99/)).toBeInTheDocument();
  });
});

describe('WaterEventDetailsWidget empty state', () => {
  // PRD 04a § empty state - locked 2026-06-13. The widget MUST stay visible
  // when there is no active water event - shows green check_circle + "No
  // active Water Events" so users always have a positive water-event
  // indicator on the System page (independent of valve / power / comm
  // alerts).
  //
  // "All clear" wording was DROPPED 2026-06-13 because it implied a global
  // system status, contradicting "1 issue" on the Health widget below when
  // another protection dimension was failing. The widget now reports its
  // dimension only - water events.
  it('no alert at all -> shows "No active Water Events"', () => {
    // Pick a system that starts with no static alert.
    const sys = { id: 'test-sys-1', name: 'Test', alert: null };
    renderWidget(sys);
    expect(screen.getByText('No active Water Events')).toBeInTheDocument();
    expect(screen.queryByText('All clear')).toBeNull();
    expect(screen.queryByText('All Clear')).toBeNull();
  });

  it('resolved water event -> shows empty state (no active card)', () => {
    // Fire Warning then End of Leak so sys.alert is tombstoned to null on
    // the data side, but we ALSO want to verify the widget renders the
    // empty state when alert.resolved is truthy (defensive - handles
    // in-flight resolutions before the data tombstone has propagated).
    const sys = {
      id: 'test-sys-2', name: 'Test',
      alert: { type: 'leak-high', resolved: true },
    };
    renderWidget(sys);
    expect(screen.getByText('No active Water Events')).toBeInTheDocument();
    // Active-state pills must NOT render.
    expect(screen.queryByText('Warning')).toBeNull();
    expect(screen.queryByText('Ongoing')).toBeNull();
    expect(screen.queryByText('Shutoff')).toBeNull();
  });

  it('non-water alert present (e.g. valve-error) -> still shows empty state', () => {
    // A system can have a valve error without any water event happening.
    // The water widget should report "no water event" regardless of other
    // protection issues - those are surfaced by their own widgets/banners.
    const sys = {
      id: 'test-sys-3', name: 'Test',
      alert: { type: 'valve-error' },
    };
    renderWidget(sys);
    expect(screen.getByText('No active Water Events')).toBeInTheDocument();
  });
});
