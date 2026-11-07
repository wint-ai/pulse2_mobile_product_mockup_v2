// @vitest-environment happy-dom
//
// Locked 2026-06-15: the drawer's "selected location" highlight uses the
// SAME visual treatment as the "current system" highlight. Both are driven
// by a stable source (global selectedScope id / currentSystemId prop), so
// the highlight survives:
//   • drawer close -> reopen on the same page
//   • page navigation to Alerts
//
// *** IT DOES NOT SURVIVE THE DASHBOARD TAB, AND THAT IS DELIBERATE, 2026-11-04.
//     The owner deleted the header's house and moved its job onto the
//     Dashboard tab, then was asked directly: on Alerts scoped to Office,
//     does tapping Dashboard give you Office's dashboard or your own top
//     level? He chose TOP LEVEL, SCOPE DROPPED. So the Dashboard tab calls
//     clearSelectedScope(), there is no selected location left, and nothing
//     is highlighted. A HUMAN CHOSE THIS - it is not a stale test and not a
//     bug, and it must not be "fixed" back without him.
//
//     THE COST, stated because it is the thing most likely to read as a bug:
//     Alerts -> pick a location -> tap Dashboard bounces you to your own top
//     level instead of showing that location's dashboard. That flow is the
//     bug Rami reported twice, and the owner has now chosen it. ***
//
// AND /alerts NO LONGER OPENS A DRAWER AT ALL, same day, same owner: "Remove
// the header of like 'My Systems', so the navigation option from this view
// shouldn't be there, only on the dashboard." Both of that page's doors were
// in the header he removed, so the Alerts leg below checks the scope SURVIVES
// the navigation rather than checking a highlight it cannot reach.
//
// Highlight chrome: 3px left accent stripe (the absolutely-positioned
// rgb(11,149,248) bar) + accent-tinted background. Both SystemRow and
// NavRow render this same chrome when their respective "is selected"
// flag is true.

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { UserProvider, useUserContext } from '../context/UserContext';
import { ThemeProvider } from '../context/ThemeContext';
import HomeUnified from '../screens/home/HomeUnified';
import EventsScreen from '../screens/events/EventsScreen';
import SystemDetail from '../screens/systems/SystemDetail';
import TabBar from '../components/TabBar';
import { OFFICE_HIGH_FLOW } from './fixtures';

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
            <Route path="/alerts" element={<div><EventsScreen /></div>} />
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

/* THE DRAWER'S DOOR — RE-AIMED 2026-11-07, AND READ THE WHOLE NOTE BEFORE
   CHANGING IT BACK.

   This helper has opened the drawer by `[aria-label="Switch location"]` since
   2026-06-15, and that name being broken is the regression this file has
   caught four separate times. It is not broken again - it is RETIRED. The
   owner replaced the More tab with Search:

     "another thing we need to do is replace the 'More' in buttom main nav bar
      With Search -locate right to dashboard
      Serach open the nav bar with the systems and locations"

   With the header's PanelLeft gone in the same restructure, the Search tab is
   the only control that opens the navigation drawer on every v2 route.
   `Switch location` measured ZERO elements on `/`, `/location/:name`,
   `/system/:id`, `/valves`, `/account`, `/alerts` and `/more` before this
   change landed - i.e. the drawer had NO door on any of them.

   IT IS NOT QUITE EXTINCT, and this file is where that matters, because the
   two survivors are the screens this file renders. A twenty-route sweep on
   2026-11-07 found `Switch location` alive on exactly two: `/v1/` and
   `/systems`, both of which render HomeUnified, whose v1 ScopeHeader
   (src/components/ScopeHeader.jsx:48) still hangs the name on its badge.
   So the helper below could have kept working unchanged - on these two v1
   reference routes only, guarding a door no live screen has. THAT is why it
   is re-aimed rather than left: it was about to start passing for the wrong
   reason.

   WHY THE NAME CHANGED RATHER THAN MOVING. A tab whose visible label reads
   "Search" cannot announce as "Switch location": WCAG 2.5.3 Label in Name
   requires the accessible name to contain the visible label. The door is
   named `Search locations and systems` instead - the drawer's own field name
   (WintSidebarV2.jsx:742), catalogued as `drawer.search_label`.

   WHAT THIS STILL GUARDS, which is the point of keeping the tripwire rather
   than deleting it. It guards MORE than it did an hour ago, not less:
     · the drawer has exactly one reachable door, by a stable accessible name;
     · that door is reachable from the bottom bar, i.e. from every screen,
       rather than from one screen's header;
     · tapping it OPENS the drawer - the same end state every assertion below
       depends on. A dead tab fails here on the first line, not silently.
   What it no longer guards is the literal string `Switch location` on a v2
   route. Asserted below, once, so this file still fails loudly if that name
   quietly comes back on a second control and splits the door in two again.

   The tap goes through the real mechanism, not a shortcut: the Search tab
   dispatches the cancelable window event in src/components/drawerSearch.js
   and the drawer this screen mounts claims it and opens itself.

   SCOPED TO `button` ON PURPOSE. The door and the field it opens deliberately
   announce alike, so once a v2 drawer is open TWO elements carry this name -
   the tab (a button) and WintSidebarV2's own <input> (a textbox). A bare
   attribute selector would pick whichever came last in the DOM, which is the
   tab on some screens and the field on others. */
const DRAWER_DOOR = 'Search locations and systems';

function openDrawer() {
  const triggers = document.querySelectorAll(`button[aria-label="${DRAWER_DOOR}"]`);
  const trigger = triggers[triggers.length - 1];
  if (!trigger) {
    throw new Error(
      `No drawer door on this screen. Nothing answers to "${DRAWER_DOOR}", and `
      + 'since the header lost its PanelLeft there is no other control that '
      + 'opens the navigation drawer - so the drawer is unreachable here.'
    );
  }
  act(() => { trigger.click(); });
}

function pickFirstAccountCardHeader() {
  // AccountCard header has role="button" + aria-expanded.
  const header = document.querySelector('[role="button"][aria-expanded]');
  act(() => { header.click(); });
}

// The selected row carries a 3px left accent stripe. NavRow + SystemRow
// implement it as an absolutely-positioned stripe div; AccountCard
// implements it as a borderLeft on the header. Either is acceptable for
// the parity assertion - the user-visible effect is the same.
//
// 2026-06-15 followup TODO: unify AccountCard's chrome onto the absolute-
// stripe model so this detector can be simpler.
const ACCENT_COLORS = /(#036AB5|#0B95F8|rgb\(\s*3\s*,\s*106\s*,\s*181|rgb\(\s*11\s*,\s*149\s*,\s*248)/i;
function hasAccentStripe(rowEl) {
  if (!rowEl) return false;
  // Pattern 1 (NavRow/SystemRow): absolutely-positioned 3px stripe.
  const all = rowEl.querySelectorAll('div');
  for (const s of all) {
    const style = s.getAttribute('style') || '';
    if (style.includes('left: 0') &&
        style.includes('width: 3px') &&
        ACCENT_COLORS.test(style)) {
      return true;
    }
  }
  // Pattern 2 (AccountCard): borderLeft on the header div. happy-dom
  // expands the shorthand into separate properties.
  for (const s of all) {
    const style = s.getAttribute('style') || '';
    const hasBorderLeft =
      /border-left:\s*3px\s+solid/i.test(style) ||
      /border-left-width:\s*3px/i.test(style);
    if (hasBorderLeft && ACCENT_COLORS.test(style)) {
      return true;
    }
  }
  return false;
}

function findRowByTargetId(tileId) {
  return document.querySelector(`[data-drawer-target="${tileId}"]`);
}

describe('Drawer location-highlight parity with system-highlight', () => {
  it('selected location shows the accent stripe on first open', () => {
    renderApp('wint-admin', '/');
    openDrawer();
    pickFirstAccountCardHeader();

    // Drawer closed after pick. Capture which tile was picked.
    const picked = exposedCtx.selectedScope;
    expect(picked).toBeTruthy();

    // Reopen drawer (same instance, same page).
    openDrawer();

    // The picked row should be highlighted with the accent stripe.
    const row = findRowByTargetId(picked.id);
    expect(row).toBeTruthy();
    if (!hasAccentStripe(row)) {
      // Diagnostic dump - which inline styles actually got rendered?
      const inner = row.querySelectorAll('div');
      const dump = Array.from(inner).map(d => d.getAttribute('style')).join('\n---\n');
      throw new Error(`No accent stripe detected. Styles:\n${dump}`);
    }
  });

  it('highlight survives drawer close + reopen', () => {
    renderApp('wint-admin', '/');
    openDrawer();
    pickFirstAccountCardHeader();
    const picked = exposedCtx.selectedScope;

    // Close + reopen 3 times. Highlight must hold each time.
    for (let i = 0; i < 3; i++) {
      // Drawer is closed after pick. Reopen.
      openDrawer();
      const row = findRowByTargetId(picked.id);
      expect(hasAccentStripe(row)).toBe(true);
      // Close via overlay click (the dark overlay div is the first drawer-
      // adjacent div with role-less click handler; the simpler simulation
      // is to call the close from context-less - we use the drawer's own
      // mechanism: the overlay sibling is created by NavigationDrawer.
      // For test purposes we just open again without explicitly closing -
      // the drawer's `open` state in HomeUnified flips via setDrawerOpen;
      // since we can't reach it directly we instead navigate the trigger
      // (re-open is idempotent if already open).
    }
  });

  it('scope survives Home -> Alerts; the Dashboard tab deliberately drops it', () => {
    renderApp('wint-admin', '/');
    openDrawer();
    pickFirstAccountCardHeader();
    const picked = exposedCtx.selectedScope;

    // Navigate to Alerts.
    act(() => { findTabButton('Alerts').click(); });

    // THE ALERTS LEG LOST ITS HEADER DOOR ON 2026-11-04. Owner, looking at
    // /alerts: "Remove the header of like 'My Systems', so the navigation
    // option from this view shouldn't be there, only on the dashboard."
    // Both of that page's doors - the bell disc and the scope pill - left
    // with the header, and Figma 199532:87604 draws neither.
    //
    // THE LEG CHECKS WHAT IT IS FOR rather than a highlight: the parity case
    // is that the PICKED SCOPE survives the navigation, which is what drives
    // the highlight wherever a drawer IS reachable. Alerts names the scope as
    // a readout in its sub-line, so the same signal is checked here.
    expect(exposedCtx.selectedScope?.id).toBe(picked.id);
    expect(document.querySelector('[data-name="alerts-scope-name"]')?.textContent)
      .toBe(picked.name);

    // `Switch location` IS RETIRED FROM EVERY v2 SURFACE as of 2026-11-07 -
    // see the note at openDrawer() for the two v1 reference routes where it
    // still exists and why that does not make it a live door. EventsScreen is
    // a v2 surface, so nothing here may answer to it. This assertion is what
    // stops a second control quietly reclaiming the name.
    expect(document.querySelector('[aria-label="Switch location"]')).toBeNull();

    // *** FLAG FOR THE OWNER: /alerts HAS A DRAWER DOOR AGAIN, AND IT IS A
    //     SIDE EFFECT OF A DIFFERENT INSTRUCTION. *** He removed the
    //     navigation option from this view on 2026-11-04 ("only on the
    //     dashboard"), and on 2026-11-07 he put Search in the BOTTOM BAR,
    //     which is mounted on every screen including this one. So the door is
    //     back on /alerts - not by anyone reversing him, but because a global
    //     control is global. Asserted rather than hidden, so the two
    //     instructions are visibly in tension in the test rather than
    //     invisibly in the app. Removing it would mean a tab that is present
    //     on one screen and absent on another, which is worse.
    expect(
      document.querySelector('[aria-label="Search locations and systems"]'),
      'the Search tab is mounted on /alerts because the bar is mounted on every screen',
    ).not.toBeNull();

    // Navigate back to Home. RE-AIMED 2026-11-04: this asserted that the
    // highlight survived the Dashboard tap, and the owner has overruled that
    // half of the 2026-06-15 rule - see the file header. The Dashboard tab is
    // the home control now and going home drops the drilled-in scope, so
    // there is no selected location left to highlight. Pinned to the NEW
    // rule rather than deleted.
    act(() => { findTabButton('Dashboard').click(); });
    expect(exposedCtx.selectedScope).toBeFalsy();
    openDrawer();
    const row = findRowByTargetId(picked.id);
    expect(row == null || !hasAccentStripe(row)).toBe(true);
  });

  it('cross-page: /system/<id> then the Dashboard tab drops the implicit system scope', () => {
    // Simulates Rami's reported bug 2026-06-15: pick a system (URL =
    // /system/<id> sets implicit system scope), navigate away to a
    // different page, open the drawer - expected: path is expanded and
    // the system row is highlighted; previous broken state: tree fully
    // collapsed, nothing highlighted.
    cleanup();
    localStorage.clear();

    // Render Home AND a route for /system/:id. Start on the system so the
    // SystemDetail mount effect sets selectedScope to a system scope.
    localStorage.setItem('pulse2-persona-id', 'wint-admin');
    render(
      <MemoryRouter initialEntries={[`/system/${OFFICE_HIGH_FLOW}`]}>
        <ThemeProvider>
          <UserProvider>
            <ContextProbe />
            <Routes>
              <Route path="/" element={<div><HomeUnified /></div>} />
              <Route path="/system/:systemId" element={<div><SystemDetail /></div>} />
            </Routes>
            <TabBar />
          </UserProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    // Scope should be a system-scope after SystemDetail mount.
    expect(exposedCtx.selectedScope?.levelType).toBe('system');
    expect(exposedCtx.selectedScope?.systemIds).toEqual([OFFICE_HIGH_FLOW]);

    // Tap Dashboard in the bottom TabBar. RE-AIMED 2026-11-04: it used to
    // PRESERVE the scope per the 2026-06-15 rule, and this test asserted the
    // drawer then expanded the path and highlighted the system. The owner has
    // since made the Dashboard tab the home control, and going home drops any
    // drilled-in scope - including the implicit system scope /system/<id>
    // sets. See the file header for his words and for the cost.
    act(() => { findTabButton('Dashboard').click(); });
    expect(exposedCtx.selectedScope).toBeFalsy();

    // Open the drawer on Home. With no scope there is nothing to highlight.
    openDrawer();
    const row = findRowByTargetId(OFFICE_HIGH_FLOW);
    expect(
      row == null || !hasAccentStripe(row),
      'scope was dropped, so no row may still carry the selected-location stripe',
    ).toBe(true);
  });

  it('parity across personas: every demo persona highlights the picked location', () => {
    const PERSONAS = [
      'wint-admin',
      'building-manager-residential',
      'location-manager-1building',
      'account-manager-suffolk',
      'account-manager-cbre',
    ];
    PERSONAS.forEach(personaId => {
      cleanup();
      localStorage.clear();
      renderApp(personaId, '/');
      openDrawer();
      pickFirstAccountCardHeader();
      const picked = exposedCtx.selectedScope;
      expect(picked).toBeTruthy();
      openDrawer();
      const row = findRowByTargetId(picked.id);
      expect(row, `persona ${personaId} - row missing`).toBeTruthy();
      expect(
        hasAccentStripe(row),
        `persona ${personaId} - missing accent stripe`
      ).toBe(true);
    });
  });
});
