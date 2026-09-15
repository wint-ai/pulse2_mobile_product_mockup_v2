// @vitest-environment happy-dom
//
// Rami reported 2026-06-15: "now you lost the highlight of the
// location/account". Existing tests only picked AccountCard headers.
// This file exercises picking NESTED locations (TreeNode rows, not the
// outer AccountCard card) and verifies the highlight survives drawer
// close + reopen.

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { UserProvider, useUserContext } from '../context/UserContext';
import { ThemeProvider } from '../context/ThemeContext';
import HomeUnified from '../screens/home/HomeUnified';
import TabBar from '../components/TabBar';

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

let exposedCtx = null;
function ContextProbe() {
  exposedCtx = useUserContext();
  return null;
}

function renderApp(personaId, startRoute = '/') {
  localStorage.setItem('pulse2-persona-id', personaId);
  return render(
    <MemoryRouter initialEntries={[startRoute]}>
      <ThemeProvider>
        <UserProvider>
          <ContextProbe />
          <Routes>
            <Route path="/" element={<div><HomeUnified /></div>} />
          </Routes>
          <TabBar />
        </UserProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

function openDrawer() {
  const triggers = document.querySelectorAll('[aria-label="Switch location"]');
  const trigger = triggers[triggers.length - 1];
  act(() => { trigger.click(); });
}

function expandFirstAccount() {
  // When every visible system sits under ONE account, the drawer prunes the
  // redundant account level and renders location rows straight away — there is
  // no account card to expand. Only click a chevron if one is actually there
  // and nothing is rendered yet.
  if (document.querySelectorAll('.nav-drawer-row').length > 0) return;
  const chevron = document.querySelector('[aria-label="Expand account"]');
  if (!chevron) throw new Error('Account chevron not found');
  act(() => { chevron.click(); });
}

function findFirstNestedNavRow() {
  // NavRow is rendered with className="nav-drawer-row". It's the row used
  // for L1/L2/L3/L4 location tiles inside an AccountCard's body.
  const rows = document.querySelectorAll('.nav-drawer-row');
  if (rows.length === 0) throw new Error('No NavRow found - expand an account first');
  return rows[0];
}

const ACCENT_COLORS = /(#036AB5|#0B95F8|rgb\(\s*3\s*,\s*106\s*,\s*181|rgb\(\s*11\s*,\s*149\s*,\s*248)/i;
function hasAbsoluteStripe(rowEl) {
  if (!rowEl) return false;
  for (const s of rowEl.querySelectorAll('div')) {
    const style = s.getAttribute('style') || '';
    if (style.includes('left: 0') &&
        style.includes('width: 3px') &&
        ACCENT_COLORS.test(style)) {
      return true;
    }
  }
  return false;
}

describe('Nested location highlight survives drawer reopen', () => {
  it('Pick a nested L1/L2 row → close → reopen → row is still highlighted', () => {
    renderApp('wint-admin', '/');
    openDrawer();

    // Expand the first account so its nested locations render.
    expandFirstAccount();

    // Pick the first nested location row (depth >= 2).
    const navRow = findFirstNestedNavRow();
    const tileId = navRow.getAttribute('data-drawer-target');
    expect(tileId).toBeTruthy();
    act(() => { navRow.click(); });

    // Scope is now the nested location.
    expect(exposedCtx.selectedScope?.id).toBe(tileId);

    // Reopen drawer.
    openDrawer();

    // The same row should still be present (path was auto-expanded) AND
    // carry the 3px absolute accent stripe.
    const row = document.querySelector(`[data-drawer-target="${tileId}"]`);
    expect(row, 'nested row missing - drawer did not expand path on reopen').toBeTruthy();
    expect(
      hasAbsoluteStripe(row),
      'nested row found but accent stripe missing - highlight regression'
    ).toBe(true);
  });

  it('Account header pick still highlights too (regression guard for the parity case)', () => {
    renderApp('wint-admin', '/');
    openDrawer();

    // AccountCard header click - selects the account.
    const acctHeader = document.querySelector('[role="button"][aria-expanded]');
    act(() => { acctHeader.click(); });

    const accountId = exposedCtx.selectedScope?.id;
    expect(accountId).toBeTruthy();

    openDrawer();

    const row = document.querySelector(`[data-drawer-target="${accountId}"]`);
    expect(row).toBeTruthy();
    // AccountCard uses borderLeft (not absolute stripe). Check both.
    const hasBorderLeft = (() => {
      for (const s of row.querySelectorAll('div')) {
        const style = s.getAttribute('style') || '';
        if (/border-left-width:\s*3px/i.test(style) && ACCENT_COLORS.test(style)) return true;
      }
      return false;
    })();
    expect(hasBorderLeft || hasAbsoluteStripe(row), 'account header not highlighted').toBe(true);
  });
});
