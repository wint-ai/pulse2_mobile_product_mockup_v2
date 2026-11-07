// @vitest-environment happy-dom
//
// The bottom tab bar: three tabs everywhere, and the Alerts count badge.
// (Navigation redesign, Figma node 199922:83973.)
//
// What is worth a test here, and none of it is the pixels:
//   1. The number on the badge is the number /alerts shows. The badge does NOT
//      derive its own count - it calls useScopedActiveAlerts(), the same hook
//      EventsScreen builds its Active list and its "Showing X of Y" headline
//      from. Mocking the one data function underneath it is therefore enough to
//      move the badge, and if someone re-inlines a second derivation in TabBar
//      this file stops moving with it and fails.
//   2. That count is SCOPED - by persona, by ?scope=, and by the drawer
//      selection (owner's ruling, 2026-11-04). Before that it was fleet-wide
//      and a tenant who owns one apartment saw 21.
//   3. A red 0 is noise, so at zero the badge is ABSENT, not zeroed.
//   4. A bare "4" announces as nothing. The badge carries an accessible name
//      that says what the number means.
//   5. Three tabs, always. `hideAlerts` is gone (owner, 2026-11-04, reversing
//      875c560); this pins the tab out of being quietly dropped again.
//
// Also pinned: the label stays the first <span> in the button. Four other
// suites pick a tab with `button.querySelector('span').textContent`, and the
// badge is a <span> living inside the glyph box - the only reason those suites
// still work is that the label is ordered ahead of the glyph in the DOM.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import TabBar from '../components/TabBar';

// `vi.hoisted` + `vi.mock` are both lifted above the imports above, so TabBar
// resolves the mocked modules even though the import is static. It has to be
// static: scripts/check-jsx-refs.mjs reads <TabBar> out of the JSX below and
// looks for a real import of it.
const state = vi.hoisted(() => ({ count: 4, ctx: {} }));

// Four alerts, one per system, on sys_0..sys_3 - so a scope that keeps two
// systems has to produce a badge of 2.
vi.mock('../data/events', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    computeAllActiveAlerts: () =>
      Array.from({ length: state.count }, (_, i) => ({ id: `mock_${i}`, system: `sys_${i}` })),
  };
});

// Mocked rather than wrapped in a real UserProvider: the provider derives
// visibleSystems from the whole SYSTEMS dataset and there is no persona that
// happens to own sys_0..sys_3.
vi.mock('../context/UserContext', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useUserContext: () => state.ctx };
});

function renderBar(entry = '/alerts') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <TabBar activeTab="events" />
    </MemoryRouter>,
  );
}

const badge = () => document.querySelector('[data-name="alerts-count"]');

function tabByLabel(label) {
  // The same selector the four scope suites use: the label is the first span.
  return [...document.querySelectorAll('button')].find(
    b => b.querySelector('span')?.textContent === label,
  );
}

beforeEach(() => { state.count = 4; state.ctx = {}; });
afterEach(cleanup);

describe('TabBar Alerts count badge', () => {
  it('shows the count from the same source /alerts counts from', () => {
    renderBar();
    expect(badge()).not.toBeNull();
    expect(badge().textContent).toBe('4');
  });

  it('follows that source rather than a derivation of its own', () => {
    state.count = 11;
    renderBar();
    expect(badge().textContent).toBe('11');
  });

  it('is absent at 0 - a red zero is noise, not information', () => {
    state.count = 0;
    renderBar();
    expect(badge()).toBeNull();
    // The tab itself is still there; only the badge goes.
    expect(tabByLabel('Alerts')).toBeTruthy();
  });

  it('carries an accessible name that says what the number means', () => {
    renderBar();
    expect(badge().getAttribute('aria-label')).toBe('4 active alerts');
    // And it reaches the tab's own accessible name, which is the thing a
    // screen-reader user actually hears.
    expect(screen.getByRole('button', { name: /4 active alerts/ })).toBeTruthy();
  });

  it('writes the singular as well as the plural', () => {
    state.count = 1;
    renderBar();
    expect(badge().textContent).toBe('1');
    expect(badge().getAttribute('aria-label')).toBe('1 active alert');
  });

  it('groups thousands, and never lets the label and the count run together', () => {
    state.count = 1234;
    renderBar();
    expect(badge().textContent).toBe('1,234');
    // The data-name hook is the separator the copy rules ask for: a reader of
    // the DOM can always tell where the label stops and the count starts.
    expect(within(tabByLabel('Alerts')).getByText('Alerts')).toBeTruthy();
    expect(tabByLabel('Alerts').querySelector('[data-name]')).toBe(badge());
  });

  it('keeps the label as the FIRST span in the button, badge or no badge', () => {
    renderBar();
    // Profile included: its glyph is PersonaAvatar, which renders a <span> of
    // its own for the initials fallback. If that span ever got ahead of the
    // label, the four scope suites would start picking tabs by "RK".
    for (const label of ['Dashboard', 'Search', 'Alerts', 'Profile']) {
      expect(tabByLabel(label), `no tab button whose first span is "${label}"`).toBeTruthy();
    }
  });
});

describe('the badge counts only what this user can see', () => {
  it('narrows to the persona s own systems', () => {
    state.ctx = { visibleSystems: [{ id: 'sys_0' }, { id: 'sys_2' }] };
    renderBar();
    expect(badge().textContent).toBe('2');
    expect(badge().getAttribute('aria-label')).toBe('2 active alerts');
  });

  it('narrows to the ?scope= deep link', () => {
    renderBar('/alerts?scope=sys_1');
    expect(badge().textContent).toBe('1');
  });

  it('narrows to the location picked in the navigation drawer', () => {
    state.ctx = { selectedScope: { systemIds: ['sys_0', 'sys_1', 'sys_3'] } };
    renderBar();
    expect(badge().textContent).toBe('3');
  });

  it('applies all three narrowings together, not just the first that matches', () => {
    state.ctx = {
      visibleSystems: [{ id: 'sys_0' }, { id: 'sys_1' }, { id: 'sys_2' }],
      selectedScope: { systemIds: ['sys_1', 'sys_2', 'sys_3'] },
    };
    renderBar('/alerts?scope=sys_2,sys_3');
    // Intersection of {0,1,2}, {2,3} and {1,2,3} is {2}.
    expect(badge().textContent).toBe('1');
  });

  it('disappears entirely when the scope holds none of them', () => {
    state.ctx = { visibleSystems: [{ id: 'somewhere-else' }] };
    renderBar();
    expect(badge()).toBeNull();
  });

  it('treats an empty visibleSystems as "no persona filter", not "no systems"', () => {
    // The pre-existing convention in EventsScreen.applyFilters, preserved.
    state.ctx = { visibleSystems: [] };
    renderBar();
    expect(badge().textContent).toBe('4');
  });
});

describe('the same tabs, everywhere', () => {
  it('renders Dashboard / Search / Alerts / Profile on every screen that mounts it', () => {
    // `hideAlerts` is gone. Passing it is now inert rather than destructive,
    // which is the point: nothing can drop the tab from the outside any more.
    //
    // Profile joined 2026-11-04 (the owner: the avatar has to be reachable
    // from every screen, and he chose the footer over the top-right corner).
    //
    // SEARCH REPLACED MORE 2026-11-07, and the POSITION is half the
    // instruction, not a detail: "replace the 'More' in buttom main nav bar
    // With Search -locate right to dashboard". Search sits SECOND - it did
    // not take More's slot at the end - and Alerts and Profile shifted right.
    // Asserted as an ordered array rather than a set for exactly that reason:
    // a bar carrying the right four labels in the wrong order would be a
    // different instruction carried out.
    renderBar('/');
    const labels = [...document.querySelectorAll('button')]
      .map(b => b.querySelector('span')?.textContent);
    expect(labels).toEqual(['Dashboard', 'Search', 'Alerts', 'Profile']);
  });

  it('gives Search the drawer field s own accessible name, not "Search"', () => {
    // WCAG 2.5.3 Label in Name: the visible label is "Search", so the
    // accessible name has to CONTAIN it - which rules out the name this door
    // used to travel under, `Switch location`. The string is the one the
    // drawer's own search field already announces (WintSidebarV2.jsx:742),
    // catalogued as `drawer.search_label` so it can be translated.
    //
    // THIS IS THE DOOR. With the header's PanelLeft gone there is no other
    // control on these routes that opens the navigation drawer, so a
    // regression here is not a naming nit - it makes the drawer unreachable.
    renderBar('/');
    const search = [...document.querySelectorAll('button')]
      .find(b => b.querySelector('span')?.textContent === 'Search');
    expect(search, 'the Search tab is missing').toBeTruthy();
    expect(search.getAttribute('aria-label')).toBe('Search locations and systems');
    // And it is the ONLY tab with one: an aria-label replaces content for
    // name computation, so one on Alerts would mute its count badge.
    const labelled = [...document.querySelectorAll('button')]
      .filter(b => b.hasAttribute('aria-label'));
    expect(labelled).toHaveLength(1);
  });

  it('never lights Search, because Search is an action and not a destination', () => {
    // It opens the drawer; it changes no route. An active indicator on it
    // would claim a location the user is not at. There is no activeTab key
    // that names it, and `isActive` is hard-coded false for it, so neither
    // the explicit prop nor the pathname fallback can light it.
    for (const at of ['/', '/alerts', '/account']) {
      cleanup();
      renderBar(at);
      const search = [...document.querySelectorAll('button')]
        .find(b => b.querySelector('span')?.textContent === 'Search');
      expect(search.className, `Search is lit at ${at}`).toMatch(/\btext-muted-foreground\b/);
      expect(
        [...search.querySelectorAll('div')].some(d => /bg-primary\/15/.test(d.className)),
        `Search drew the active indicator at ${at}`,
      ).toBe(false);
    }
  });
});
