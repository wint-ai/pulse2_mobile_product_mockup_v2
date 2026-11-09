// @vitest-environment happy-dom
//
// Regression test 2026-06-15. HALF OF IT WAS DELIBERATELY OVERRULED BY THE
// OWNER ON 2026-11-04 - read that part before changing anything here.
//
// WHAT IT WAS WRITTEN FOR. Rami reported this twice:
//
//   On Alerts, picked a location → header shows the picked location.
//   Tapped Home → header reverts to "My Systems" (BUG: scope wiped).
//   Tapped Alerts again → still "My Systems" (BUG: scope still wiped).
//
// Root cause was an unconditional clearSelectedScope() in TabBar's onClick,
// added 2026-06-08 to avoid carry-over from System Detail. That fix was too
// broad - it killed the Home↔Alerts scope-parity requirement. The rule that
// came out of it was: A BOTTOM-TAB TAP NEVER MUTATES SCOPE.
//
// *** THE DASHBOARD HALF OF THAT RULE IS GONE, ON PURPOSE, 2026-11-04. ***
//
// The owner deleted the header's house and moved its job onto the Dashboard
// tab: "I want to completely remove the home icon. And once user clicks on
// dashboard, it just takes him to the upper level of the scope that he
// already have." Asked directly - on Alerts scoped to Office, does tapping
// Dashboard give you Office's dashboard or your own top level? - he chose
// TOP LEVEL, SCOPE DROPPED.
//
// So the Dashboard tab now calls clearSelectedScope() and navigates to
// homeTargetFor(...), and the tests below state THAT. A HUMAN CHOSE IT: this
// is not a stale test and not a bug, and it must not be "fixed" back to the
// 2026-06-15 behaviour without him.
//
// THE COST, said plainly because it is the thing most likely to read as a bug
// to the next person: Alerts -> pick a location -> tap Dashboard now bounces
// you to your OWN TOP LEVEL rather than showing that location's dashboard.
// That exact flow is the complaint this file was written for.
//
// THE OTHER HALF STANDS AND IS STILL TESTED. The Alerts, Profile and More
// taps never touch scope.
//
// These tests cover:
//   1. Scope set programmatically persists when navigating Home → Alerts.
//   2. Dashboard CLEARS it and lands at the persona's own top level.
//   3. The 'My Systems' fallback rule is identical on both screens (no
//      account-name fallback on Alerts - ScopeHeader is the single source).
//   4. The Alerts header is the list title now - a count badge and a subject -
//      and carries neither of the two scope controls it used to.
//   5. NavigationDrawer's Favorites section defaults to FOLDED on every
//      open, regardless of whether it has entries.

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { UserProvider, useUserContext } from '../context/UserContext';
import { ThemeProvider } from '../context/ThemeContext';
import HomeUnified from '../screens/home/HomeUnified';
import EventsScreen from '../screens/events/EventsScreen';
import NavigationDrawer from '../components/NavigationDrawer';
import TabBar from '../components/TabBar';
/* The SAME module TabBar derives its destination from, so the expectation
   below moves with the persona's own systemFilter instead of being pinned to
   a literal route. */
import { topLevelFor } from '../utils/homeTarget';

const PERSONA_ID = 'wint-admin';

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

// Helper to expose the UserContext setter so the test can simulate the
// drawer setting a scope (the drawer's own flow is tested separately;
// here we care about whether navigation preserves it).
let exposedCtx = null;
function ContextProbe() {
  exposedCtx = useUserContext();
  return null;
}

function renderApp(startRoute = '/alerts') {
  localStorage.setItem('pulse2-persona-id', PERSONA_ID);
  return render(
    <MemoryRouter initialEntries={[startRoute]}>
      <ThemeProvider>
        <UserProvider>
          <ContextProbe />
          <Routes>
            <Route path="/" element={
              <div>
                <HomeUnified />
                <TabBar />
              </div>
            } />
            <Route path="/alerts" element={
              <div>
                <EventsScreen />
                <TabBar />
              </div>
            } />
          </Routes>
        </UserProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

// The accessible-name match (`getByRole('button', {name: /^Home$/})`) trips
// on every TabBar render after navigation because react-router transition
// momentarily mounts both routes; we resolve it by hand-picking the bottom
// tab button from all buttons whose direct text content equals the label.
function findTabButton(label) {
  const buttons = document.querySelectorAll('button');
  // The TabBar buttons render the label inside an 11px <span>.
  // We pick the LAST matching button (latest mount, after navigation).
  let last = null;
  for (const b of buttons) {
    const span = b.querySelector('span');
    if (span && span.textContent === label) last = b;
  }
  if (!last) throw new Error(`Tab button "${label}" not found`);
  return last;
}

function pickFirstSystemAsScope() {
  // Build a scope from the first visible system - one ancestor up so the
  // breadcrumb has something interesting to show.
  const sys = exposedCtx.visibleSystems[0];
  // Use the system's own city / building as the scope name.
  const scopeName = sys.l4 || sys.l3 || sys.l2 || sys.l1 || 'Test Scope';
  const ancestors = [];
  if (sys.l1) ancestors.push(sys.l1);
  if (sys.l2) ancestors.push(sys.l2);
  if (sys.l3) ancestors.push(sys.l3);
  const sameLevelSystems = exposedCtx.visibleSystems.filter(s =>
    s.l1 === sys.l1 && s.l2 === sys.l2 && s.l3 === sys.l3
  );
  act(() => {
    exposedCtx.setSelectedScope({
      id: `test-scope-${scopeName}`,
      name: scopeName,
      levelType: 'l4',
      ancestors,
      systems: sameLevelSystems,
      systemIds: sameLevelSystems.map(s => s.id),
    });
  });
  return scopeName;
}

describe('Bottom-tab navigation: Alerts keeps scope, Dashboard drops it', () => {
  it('Alerts: picking a scope shows it in the header (baseline)', () => {
    renderApp('/alerts');
    const scopeName = pickFirstSystemAsScope();
    // The scope name should appear as the page title.
    const titles = screen.getAllByText(scopeName, { exact: false });
    expect(titles.length).toBeGreaterThan(0);
  });

  // RE-AIMED 2026-11-04. This asserted the OPPOSITE until that day - that
  // Alerts → Home preserved the drawer scope - and it is the assertion the
  // owner overruled. See the file header: he was asked the question directly
  // and chose top level with the scope dropped. Kept, pointed at the new
  // rule, so the behaviour stays pinned rather than untested.
  it('Alerts → Dashboard CLEARS the scope and goes to the persona top level', () => {
    renderApp('/alerts');
    const scopeName = pickFirstSystemAsScope();
    expect(exposedCtx.selectedScope?.name).toBe(scopeName);

    // Tap the home bottom-tab button - the home control now. ITS LABEL IS
    // "Home" SINCE 2026-11-09, when the owner asked for visible text under the
    // four glyphs and named them ("add text bellow here / Home ,Systems ,
    // Alerts, Profile"). The `home` activeTab KEY is unchanged, so this is the
    // same control and the same ruling - only the printed word moved.
    act(() => { findTabButton('Home').click(); });

    // The scope is dropped. This is the ruling.
    expect(exposedCtx.selectedScope).toBeFalsy();

    // And the destination is THIS PERSONA'S top level, asked of the same
    // module TabBar asks - over the systems the persona's systemFilter
    // actually leaves visible, not a hard-coded route. wint-admin sees the
    // whole fleet, so that resolves to the all-accounts roll-up; a narrower
    // persona would move this expectation with it.
    const home = topLevelFor(exposedCtx.visibleSystems);
    expect(home.path).toBe('/');
    // It really navigated: the Alerts surface is unmounted.
    expect(document.querySelector('[data-name="alerts-title"]')).toBeNull();
  });

  it('Home → Alerts preserves the selected scope', () => {
    renderApp('/');
    const scopeName = pickFirstSystemAsScope();

    const alertsBtn = findTabButton('Alerts');
    act(() => { alertsBtn.click(); });

    const stillScoped = screen.queryAllByText(scopeName, { exact: false });
    expect(stillScoped.length).toBeGreaterThan(0);
    expect(exposedCtx.selectedScope?.name).toBe(scopeName);
  });

  // RE-AIMED 2026-11-04, same ruling. This is the exact flow Rami reported -
  // Alerts, pick a location, tap Dashboard - and the owner has now chosen the
  // behaviour Rami called a bug. It is pinned here so the choice is visible
  // and reversible rather than silently re-litigated.
  it('Alerts → Dashboard → Alerts: only Dashboard mutates scope, and it stays dropped', () => {
    renderApp('/alerts');
    const scopeName = pickFirstSystemAsScope();
    expect(exposedCtx.selectedScope?.name).toBe(scopeName);

    // Alerts → Home: the one tab that touches scope. Labelled "Dashboard"
    // until 2026-11-09; same tab, same `home` key, new word.
    act(() => { findTabButton('Home').click(); });
    expect(exposedCtx.selectedScope).toBeFalsy();

    // Dashboard → Alerts: still never touches it, so it stays cleared.
    // Nothing re-scopes the page behind the user on the way back.
    act(() => { findTabButton('Alerts').click(); });
    expect(exposedCtx.selectedScope).toBeFalsy();

    // Alerts falls back to the shared 'My Systems' readout rather than
    // resurrecting the scope the Dashboard tap dropped.
    expect(document.querySelector('[data-name="alerts-scope-name"]')?.textContent)
      .toBe('My Systems');
  });
});

describe('Home + Alerts share the same page-title rule via ScopeHeader', () => {
  it('Home with NO scope selected shows "My Systems"', () => {
    renderApp('/');
    expect(exposedCtx.selectedScope).toBeFalsy();
    // The title text appears in the header (and may also appear as a
    // breadcrumb root - either is fine for this assertion).
    expect(screen.getAllByText('My Systems').length).toBeGreaterThan(0);
  });

  it('Alerts with NO scope selected shows "My Systems" (NOT account name)', () => {
    renderApp('/alerts');
    expect(exposedCtx.selectedScope).toBeFalsy();
    // The CRITICAL assertion: with no scope, Alerts must show the same
    // fallback as Home. Before the ScopeHeader extraction, Alerts had an
    // account?.name fallback that made the title diverge from Home.
    expect(screen.getAllByText('My Systems').length).toBeGreaterThan(0);
  });
});

describe('Alerts header is the list title, not a scope control', () => {
  // THIS SUITE USED TO PIN THE BELL. It asserted that /alerts drew the
  // notifications_active glyph, which was that page's identity mark AND its
  // door into NavigationDrawer. Owner, 2026-11-04, looking at the page:
  //
  //   "Remove the header of like 'My Systems', so the navigation option from
  //    this view shouldn't be there, only on the dashboard."
  //
  // Figma 199532:87604 says the same: its title row is a back chevron and a
  // centred title, with the scope caret and the Avatar both hidden. So the
  // bell and the scope pill are both off this page and the glyph this suite
  // looked for no longer renders anywhere on it.
  //
  // RE-AIMED, NOT DELETED, at what the page now guarantees instead: the
  // frame's title - a count badge and a phrase naming what is listed - the
  // absence of BOTH scope controls, and the scope NAME surviving as a readout,
  // which is what the three suites above read off this page.
  /* ── RE-AIMED AGAIN, 2026-11-09: `app-scope` IS BACK, AND THAT IS CORRECT ─
     This test used to assert `[data-name="app-scope"]` was NULL on /alerts,
     using the shared header bar's PRESENCE as a proxy for "a scope control is
     back on this page". That proxy is stale and the assertion was wrong, not
     merely outdated:

       · `app-scope` is AppHeaderBar's TITLE, and that title is an inert <p> -
         no onClick, no role, no tabIndex, no aria-haspopup, not a <button>.
         appHeaderBar.dom.test.jsx pins exactly that. A title is not a picker,
         so its presence never implied a scope control.
       · A refetch of Figma 199532:87604 on 2026-11-09 shows the frame now
         draws the SHARED header instance (199532:83651) on this very page,
         with no back chevron, no avatar and no scope chevron.
       · The owner's standing ruling is "One header component for every
         surface. It always needs to be the same." His 2026-11-04 ruling about
         THIS page removed the NAVIGATION, not the component.

     So the assertion is re-aimed at what it actually means: no scope control
     and no avatar on this page. The name it used to navigate by,
     `Switch location`, is the thing to look for - it is how the three drawer
     suites open NavigationDrawer, and it must not answer here.

     `alerts-title-subject` IS NOT DROPPED, IT MOVED. That hook marked the
     VISIBLE subject phrase; the visible subject is AppHeaderBar's title now,
     so the assertion follows it to `app-scope` and additionally checks the
     TEXT, which the old hook never did. Putting the hook on the sr-only <h1>
     instead would have been the weakening: a regression that hid the visible
     title would still have passed. `alerts-title-count` is unchanged - the
     count badge is this page's own, in the bar's `leading` slot. */
  it('Alerts draws the count badge and subject, and neither scope control', () => {
    const { container } = renderApp('/alerts');
    expect(container.querySelector('[data-name="alerts-title-count"]')).toBeTruthy();
    /* The subject phrase, on the element that actually shows it. */
    const subject = container.querySelector('[data-name="app-scope"]');
    expect(subject, 'the header bar no longer renders the list subject').toBeTruthy();
    expect(subject.textContent).toMatch(/alerts|Water Events/i);
    /* The bell disc is gone. */
    expect(container.querySelector('[data-name="alerts-drawer-trigger"]')).toBeNull();
    /* AND NEITHER SCOPE CONTROL — the point of this test, asserted directly
       instead of through the old proxy. */
    expect(
      container.querySelectorAll('[aria-label="Switch location"]'),
      'a scope picker is back on /alerts',
    ).toHaveLength(0);
    expect(container.querySelector('[data-name="app-avatar"]')).toBeNull();
    /* The title is a readout, not a control: the 2026-11-04 ruling in its
       strongest form. */
    expect(subject.closest('button'), 'the list subject is inside a control').toBeNull();
    expect(subject.getAttribute('role')).toBeNull();
    expect(container.textContent).not.toContain('notifications_active');
  });

  it('Alerts keeps the scope NAME as a readout once the pill is gone', () => {
    const { container } = renderApp('/alerts');
    expect(exposedCtx.selectedScope).toBeFalsy();
    // Same rule as before: selectedScope?.name || 'My Systems', no
    // account-name fallback. It is the sub-line's first element now.
    expect(container.querySelector('[data-name="alerts-scope-name"]')?.textContent)
      .toBe('My Systems');
  });

  it('Home page renders home_work glyph in the header', () => {
    const { container } = renderApp('/');
    expect(container.textContent).toContain('home_work');
  });
});

describe('NavigationDrawer Favorites section defaults to folded', () => {
  it('Favorites label is present but its rows are NOT visible on first open', () => {
    localStorage.setItem('pulse2-persona-id', PERSONA_ID);
    // Pre-populate at least one favorite so the section is non-empty.
    // (The drawer reads getFavorites() lazily on render.)
    localStorage.setItem('pulse2-favorites', JSON.stringify([
      { id: 'fav-test', name: 'Pinned Place', levelType: 'l4', ancestors: ['IL', 'Tel Aviv'] },
    ]));

    render(
      <MemoryRouter>
        <ThemeProvider>
          <UserProvider>
            <NavigationDrawer
              open={true}
              onClose={() => {}}
              onSelectLocation={() => {}}
              currentSystemId={null}
            />
          </UserProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    // The Favorites section header should be visible.
    expect(screen.getByText(/Favorites/i)).toBeInTheDocument();
    // But the pinned-favorite row should NOT be visible (section folded).
    expect(screen.queryByText('Pinned Place')).not.toBeInTheDocument();
  });
});
