// @vitest-environment happy-dom
//
// Verifies that UserContext.visibleSystems applies sim alert overlay AND
// the persona filter, then re-renders consumers on push events.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { UserProvider, useUserContext } from '../context/UserContext';
import { applyPushEvent } from '../lib/pushEvents';
import { APT_CLEAR, APT_LOW_FLOW, APT_WITH_EVENT, HAPPY_PATH_APT, OFFICE_HIGH_FLOW } from './fixtures';

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

// Tiny test component that reads visibleSystems and shows them.
function ScopeReader() {
  const { visibleSystems = [] } = useUserContext() || {};
  return (
    <div data-testid="scope">
      {visibleSystems.map(s => (
        <div key={s.id} data-testid={`row-${s.id}`}>
          <span>{s.id}</span>
          <span data-testid={`alert-${s.id}`}>{s.alert ? s.alert.type : '(none)'}</span>
          <span data-testid={`valve-${s.id}`}>{s.valve || '(none)'}</span>
        </div>
      ))}
    </div>
  );
}

function renderAs(personaId) {
  localStorage.setItem('pulse2-persona-id', personaId);
  return render(
    <UserProvider>
      <ScopeReader />
    </UserProvider>
  );
}

describe('UserContext applies sim overlay to visibleSystems', () => {
  it('Maya Tal: visibleSystems contains Sea View + Leumi only', () => {
    renderAs('tenant-2apts');
    expect(screen.getByTestId(`row-${APT_WITH_EVENT}`)).toBeInTheDocument();
    expect(screen.getByTestId(`row-${APT_CLEAR}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`row-${OFFICE_HIGH_FLOW}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`row-${HAPPY_PATH_APT}`)).not.toBeInTheDocument();
  });

  it('a sim Warning on Sea View shows up in Maya\'s visibleSystems with alert.type=leak-high', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: APT_WITH_EVENT } });
    renderAs('tenant-2apts');
    expect(screen.getByTestId(`alert-${APT_WITH_EVENT}`).textContent).toBe('leak-high');
  });

  it('Shutoff push flips valve to closed in visibleSystems (valveOverride applied)', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: APT_WITH_EVENT } });
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Shutoff', severity: 'High Flow', systemId: APT_WITH_EVENT } });
    renderAs('tenant-2apts');
    expect(screen.getByTestId(`valve-${APT_WITH_EVENT}`).textContent).toBe('closed');
  });

  it('a sim alert on CT1 does NOT appear in Maya\'s visibleSystems (out of scope)', () => {
    applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: OFFICE_HIGH_FLOW } });
    renderAs('tenant-2apts');
    expect(screen.queryByTestId(`row-${OFFICE_HIGH_FLOW}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`alert-${OFFICE_HIGH_FLOW}`)).not.toBeInTheDocument();
  });
});

describe('UserContext re-derives visibleSystems on push events', () => {
  it('firing a push after mount updates visibleSystems', async () => {
    // The building manager's scope includes the statically low-flow apartment,
    // so this exercises a real low -> high override rather than a no-op.
    renderAs('building-manager-residential');
    expect(screen.getByTestId(`alert-${APT_LOW_FLOW}`).textContent).toBe('leak-low');
    // Fire a new Warning High Flow push via the channel
    await act(async () => {
      const ch = new BroadcastChannel('pulse2-push');
      // Write localStorage directly so the storage path applies; trigger
      // refresh via 'data-changed'.
      applyPushEvent({ type: 'push', payload: { type: 'leak', state: 'Warning', severity: 'High Flow', systemId: APT_LOW_FLOW } });
      ch.postMessage({ type: 'data-changed' });
      ch.close();
      // Wait a tick for the listener to fire and React to re-render.
      await new Promise(r => setTimeout(r, 10));
    });
    expect(screen.getByTestId(`alert-${APT_LOW_FLOW}`).textContent).toBe('leak-high');
  });
});
