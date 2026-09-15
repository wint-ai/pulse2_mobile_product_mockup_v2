// @vitest-environment happy-dom
//
// Locked 2026-06-15: viewing /system/<id> implicitly scopes the user to
// that one system. Tapping Alerts (or any bottom tab) shows ONLY that
// system's data - not the parent location's, not the persona's full scope.
//
// Bug Rami reported: 'when a single system is selected the Alerts tab is
// not filtered on that system but shows location'. Caused by SystemDetail
// not setting selectedScope on mount; the previous location scope (set
// before drilling in) leaked through.

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { UserProvider, useUserContext } from '../context/UserContext';
import { ThemeProvider } from '../context/ThemeContext';
import SystemDetail from '../screens/systems/SystemDetail';
import EventsScreen from '../screens/events/EventsScreen';
import HomeUnified from '../screens/home/HomeUnified';
import TabBar from '../components/TabBar';
import { APT_WITH_EVENT, OFFICE_HIGH_FLOW } from './fixtures';

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

let exposedCtx = null;
function ContextProbe() {
  exposedCtx = useUserContext();
  return null;
}

function renderApp(personaId, startRoute) {
  localStorage.setItem('pulse2-persona-id', personaId);
  return render(
    <MemoryRouter initialEntries={[startRoute]}>
      <ThemeProvider>
        <UserProvider>
          <ContextProbe />
          <Routes>
            <Route path="/" element={<div><HomeUnified /></div>} />
            <Route path="/alerts" element={<div><EventsScreen /></div>} />
            <Route path="/system/:systemId" element={<div><SystemDetail /></div>} />
          </Routes>
        </UserProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

function findTabButton(label) {
  const buttons = document.querySelectorAll('button');
  let last = null;
  for (const b of buttons) {
    const span = b.querySelector('span');
    if (span && span.textContent === label) last = b;
  }
  if (!last) throw new Error(`Tab button "${label}" not found`);
  return last;
}

describe('Viewing /system/<id> implicitly scopes Alerts (and Home) to that one system', () => {
  it('SystemDetail mount sets selectedScope to the single system', () => {
    renderApp('wint-admin', `/system/${OFFICE_HIGH_FLOW}`);
    // After SystemDetail's mount effect runs, scope = single-system.
    expect(exposedCtx.selectedScope).toBeTruthy();
    expect(exposedCtx.selectedScope.levelType).toBe('system');
    expect(exposedCtx.selectedScope.systemIds).toEqual([OFFICE_HIGH_FLOW]);
    expect(exposedCtx.selectedScope.systems).toHaveLength(1);
    expect(exposedCtx.selectedScope.systems[0].id).toBe(OFFICE_HIGH_FLOW);
  });

  it('System -> Alerts via bottom TabBar: Alerts is scoped to just that system', () => {
    renderApp('wint-admin', `/system/${OFFICE_HIGH_FLOW}`);
    const ctxScopedSystemId = exposedCtx.selectedScope.systemIds[0];
    expect(ctxScopedSystemId).toBe(OFFICE_HIGH_FLOW);

    // Tap Alerts in the bottom TabBar.
    act(() => { findTabButton('Alerts').click(); });

    // Scope MUST still be the single system after navigation.
    expect(exposedCtx.selectedScope?.systemIds).toEqual([OFFICE_HIGH_FLOW]);
    expect(exposedCtx.selectedScope?.levelType).toBe('system');
  });

  it('Switching between systems (different /system/<id>) updates the implicit scope', () => {
    // Start on system A.
    const { unmount } = renderApp('wint-admin', `/system/${OFFICE_HIGH_FLOW}`);
    expect(exposedCtx.selectedScope.systemIds).toEqual([OFFICE_HIGH_FLOW]);
    unmount();
    cleanup();

    // Start on a different system - scope re-derives.
    renderApp('wint-admin', `/system/${APT_WITH_EVENT}`);
    expect(exposedCtx.selectedScope.systemIds).toEqual([APT_WITH_EVENT]);
    expect(exposedCtx.selectedScope.systems[0].id).toBe(APT_WITH_EVENT);
  });

  it('Header title on Alerts shows the system name (not the parent location)', () => {
    renderApp('wint-admin', `/system/${OFFICE_HIGH_FLOW}`);
    const sysName = exposedCtx.selectedScope.name;
    expect(sysName).toBeTruthy();

    act(() => { findTabButton('Alerts').click(); });

    // The Alerts page header should show the system name as the page title.
    const matches = screen.queryAllByText(sysName, { exact: false });
    expect(matches.length).toBeGreaterThan(0);
  });
});
