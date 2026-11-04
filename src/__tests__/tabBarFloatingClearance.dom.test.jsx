// @vitest-environment happy-dom
//
// The floating tab bar overlays every screen. Every scroll body has to pay for
// that, or its last row comes to rest underneath the pill and cannot be read.
//
// THE INVARIANT FLIPPED ON 2026-11-04. It used to be "content must never reach
// the pill": the bar reserved 77px of the flex column and nothing was allowed
// behind it. Then the owner: "and it needs to be completely floating". So the
// bar now reserves NOTHING (`h-0`), the pill is absolute off that anchor,
// content scrolls UNDER it - and the rule became "content must be able to
// scroll PAST the pill and still be fully readable when it stops".
//
// Phone.jsx is a fixed 393x852 flex column with overflow:hidden, so
// `position: fixed` is banned and the scroll body is the `flex:1` sibling that
// grew by the bar's whole height when the reservation went. Measured in a real
// browser at 393x852, scrolled to the very bottom, BEFORE the padding existed,
// as the gap between the deepest painted content and the bar's top edge:
//
//     /              24.3px      /account        32px
//     /system/:id     8.5px      /valves         88px
//     /alerts            0px   <- EventsScreen's list ended flush against it
//
// Every one of those is now short by the pill's whole footprint, which is why
// this file checks the padding rather than trusting it.
//
// happy-dom has no layout engine, so the geometry is checked on what the
// classes and styles DECLARE. That is the right level: the numbers are the
// contract, and the browser measurement is what confirmed them.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import TabBar from '../components/TabBar';
import {
  TAB_BAR_PILL_HEIGHT,
  TAB_BAR_BOTTOM_INSET,
  TAB_BAR_SIDE_INSET,
  TAB_BAR_FOOTPRINT,
  TAB_BAR_CLEARANCE,
} from '../components/tabBarMetrics';

afterEach(cleanup);

/** Pull an arbitrary-value Tailwind length out of a class string. */
function px(className, utility) {
  const m = className.match(new RegExp(`(?:^|\\s)${utility}-\\[(-?\\d+(?:\\.\\d+)?)px\\]`));
  return m ? Number(m[1]) : null;
}

/* The app shell, reduced to the two things that matter: one scrolling body
   carrying the clearance, and the bar floating over it. This is the shape
   .claude/skills/v2-page-parity/SKILL.md requires of every screen. */
function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <div data-name="phone-column" style={{ display: 'flex', flexDirection: 'column', height: 852, overflow: 'hidden' }}>
        <div
          data-name="scroll-body"
          style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: TAB_BAR_CLEARANCE }}
        >
          {Array.from({ length: 40 }, (_, i) => (
            <div key={i} data-name={i === 39 ? 'last-row' : 'row'}>row {i}</div>
          ))}
        </div>
        <TabBar activeTab="home" />
      </div>
    </MemoryRouter>,
  );
}

const host = () => document.querySelector('[data-name="tabbar-host"]');
const pill = () => document.querySelector('[data-name="tabbar-pill"]');

describe('the tab bar completely floats', () => {
  it('reserves no column at all - the scroll body runs the full frame', () => {
    renderShell();
    const cls = host().className;
    // `fixed` is banned inside the 393x852 frame outright.
    expect(cls).not.toMatch(/(?:^|\s)fixed(?:\s|$)/);
    expect(cls).toMatch(/(?:^|\s)relative(?:\s|$)/);
    expect(
      cls,
      'the host must be h-0: any reserved height means content stops short of '
      + 'the frame edge and the bar is not completely floating',
    ).toMatch(/(?:^|\s)h-0(?:\s|$)/);
  });

  it('hangs the pill off that anchor, clear of all three edges', () => {
    renderShell();
    const cls = pill().className;
    expect(cls).toMatch(/(?:^|\s)absolute(?:\s|$)/);
    expect(px(cls, 'bottom')).toBe(TAB_BAR_BOTTOM_INSET);
    expect(px(cls, 'inset-x')).toBe(TAB_BAR_SIDE_INSET);
    expect(px(cls, 'h')).toBe(TAB_BAR_PILL_HEIGHT);
    expect(cls).toMatch(/rounded-\[\d+px\]/);
    expect(cls).toMatch(/(?:^|\s)border(?:\s|$)/);
  });

  it('lets content pass behind it, which is what the blur is for', () => {
    renderShell();
    // A translucent fill and a backdrop blur are only meaningful once
    // something moves underneath. Both were inert while the bar reserved a
    // column; neither is now.
    expect(pill().className).toMatch(/backdrop-blur-\[\d+px\]/);
    expect(pill().className).toMatch(/bg-card\/\d+/);
  });

  it('agrees with tabBarMetrics about how much of the screen it covers', () => {
    renderShell();
    const declared = px(pill().className, 'bottom') + px(pill().className, 'h');
    expect(
      declared,
      'the pill covers a different band than TAB_BAR_FOOTPRINT says it does, '
      + 'so every scroll body in the app is now padded by the wrong amount',
    ).toBe(TAB_BAR_FOOTPRINT);
  });

  it('asks every scroll body for a real gap, not a hairline', () => {
    const gap = TAB_BAR_CLEARANCE - TAB_BAR_FOOTPRINT;
    expect(
      gap,
      `TAB_BAR_CLEARANCE leaves only ${gap}px between the last row and the `
      + 'pill. A row that just touches the pill reads as clipped even when it '
      + 'is not.',
    ).toBeGreaterThanOrEqual(12);
  });
});

/* ── the other half of the contract: the screens ──────────────────────────
   The structural checks above cannot see a screen that forgot its padding,
   and that is the failure this whole file exists to prevent. So the source is
   read directly. It is the only way to assert something about twenty files
   from one test, and the alternative - twenty render tests - would not catch
   the twenty-first screen somebody adds. */

/* The sources come in through Vite's `?raw`, NOT through node:fs.
   `process` is not a declared global in this repo's eslint config, and
   `fileURLToPath(import.meta.url)` throws under Vitest because the module URL
   it hands a test is not a file: URL. A raw glob has neither problem, runs at
   transform time, and makes the dependency real: rename a screen and this test
   stops resolving it instead of silently passing on a file that moved. */
const SOURCES = import.meta.glob(
  ['../screens/**/*.jsx', '../v2/pages/**/*.jsx'],
  { query: '?raw', import: 'default', eager: true },
);

function read(file) {
  const key = `../${file.replace(/^src\//, '')}`;
  const src = SOURCES[key];
  if (src === undefined) {
    throw new Error(
      `${file} is not in the raw glob - it was renamed, moved, or the glob no `
      + `longer covers it. Known keys: ${Object.keys(SOURCES).length}`,
    );
  }
  return src;
}

/** Every screen that mounts TabBar and whose scroll body sits under the pill. */
const PADDED = [
  'src/screens/events/EventsScreen.jsx',
  'src/v2/pages/SystemPageV2Screen.jsx',
  'src/v2/pages/ValveManagementScreen.jsx',
  'src/screens/EventHistory.jsx',
  'src/screens/home/HomeClear.jsx',
  'src/screens/home/HomeManager.jsx',
  'src/screens/home/HomeMultiAccount.jsx',
  'src/screens/home/HomeUnified.jsx',
  'src/screens/kpi/KPIDetailScreen.jsx',
  'src/screens/leak/ErrorAlertDetail.jsx',
  'src/screens/leak/LeakDetail.jsx',
  'src/screens/systems/L4Screen.jsx',
  'src/screens/systems/SystemDetail.jsx',
  'src/v2/pages/AccountScreenV2.jsx',
  /* Promoted out of STILL_OWED 2026-11-04 — see the note below it. */
  'src/v2/pages/HomeAllAccounts.jsx',
  'src/v2/pages/HomeAccountOverview.jsx',
  'src/v2/pages/SystemPage.jsx',
];

/**
 * Screens that still owe the padding, with the reason they were not done in
 * the same pass. These are NOT exempt - they trap their last row today. The
 * second test below fails the moment one of them is fixed, which is the
 * prompt to delete it from this list.
 */
/* EMPTIED 2026-11-04. All three were paid in the header-unification pass:
   HomeAllAccounts (which measured -53.8px of clearance at maximum scroll -
   the worst of the fourteen), and the two /old preview routes, which carry
   two scroll bodies each. They moved up into PADDED above. */
const STILL_OWED = [];

/* Matches the clearance however a file spells it: `paddingBottom: 93`,
   `padding: '10px 14px 93px'`, or `pb-[93px]`. */
const declaresClearance = src => new RegExp(
  `paddingBottom:\\s*${TAB_BAR_CLEARANCE}\\b`
  + `|padding:\\s*'[^']*\\s${TAB_BAR_CLEARANCE}px'`
  + `|pb-\\[${TAB_BAR_CLEARANCE}px\\]`,
).test(src);

describe('every screen under the pill reserves room for it', () => {
  it.each(PADDED)('%s pads its scroll body by the full clearance', file => {
    const src = read(file);
    expect(
      declaresClearance(src),
      `${file} does not declare ${TAB_BAR_CLEARANCE}px of bottom padding on its `
      + `scroll body. The pill covers the bottom ${TAB_BAR_FOOTPRINT}px of the `
      + 'frame, so without it the last row of this screen comes to rest under '
      + 'the bar and there is no way to scroll it clear.',
    ).toBe(true);
  });

  it('keeps the list of screens that still owe it honest', () => {
    const fixed = STILL_OWED.filter(f => declaresClearance(read(f)));
    expect(
      fixed,
      `these now declare the clearance and should move from STILL_OWED into `
      + `PADDED: ${fixed.join(', ')}`,
    ).toEqual([]);
  });
});

/* Profile joined the pill 2026-11-04 (the owner). Four items in the same 361px
   slab is the part that can go wrong silently: the column narrows from 120.33
   to 89.75 and the labels have to keep fitting. happy-dom cannot measure text,
   so what is pinned here is the structure the browser measurement rests on. */
describe('four items share the pill evenly', () => {
  it('declares as many equal columns as there are tabs', () => {
    renderShell();
    const tabs = document.querySelectorAll('button').length;
    expect(tabs).toBe(4);
    const cols = pill().className.match(/(?:^|\s)grid-cols-(\d+)(?:\s|$)/);
    expect(cols, 'the pill must declare its column count').not.toBeNull();
    expect(
      Number(cols[1]),
      'grid-cols-N must match the tab count or the columns stop being equal '
      + 'and one label gets a narrower box than the rest',
    ).toBe(tabs);
    for (const b of document.querySelectorAll('button')) expect(pill().contains(b)).toBe(true);
  });

  it('gives every tab the same capsule, so the row stays even', () => {
    renderShell();
    const caps = [...pill().querySelectorAll('button > div')];
    expect(caps).toHaveLength(4);
    const shapes = caps.map(c => `${px(c.className, 'w')}x${px(c.className, 'h')}`);
    expect(new Set(shapes).size, `capsules differ: ${shapes.join(', ')}`).toBe(1);
    // Wider than tall - the owner's WhatsApp screenshot, not a rounded square.
    const [w, h] = [px(caps[0].className, 'w'), px(caps[0].className, 'h')];
    expect(w, `the active indicator is ${w}x${h}; it must be a capsule, wider than tall`).toBeGreaterThan(h);
  });

  it('draws the avatar as the Profile glyph, inside that capsule', () => {
    renderShell();
    const avatar = pill().querySelector('[data-name="persona-avatar"]');
    expect(avatar, 'the Profile tab must draw the persona avatar, not an icon').not.toBeNull();
    expect(avatar.closest('button').querySelector('span').textContent).toBe('Profile');
    // The disc is a picture of the user and must never become the tab's name:
    // without aria-hidden the button would announce as "Profile RK".
    expect(avatar.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps the label first in every tab, Profile included', () => {
    renderShell();
    // Four other suites pick a tab by button.querySelector('span').textContent.
    for (const b of document.querySelectorAll('button')) {
      expect(b.querySelector('span').textContent).toMatch(/^(Dashboard|Alerts|Profile|More)$/);
    }
  });

  it('gives the active capsule its fill, and only the active one', () => {
    renderShell();
    const filled = [...pill().querySelectorAll('button > div')]
      .filter(d => /bg-primary\/15/.test(d.className));
    expect(filled).toHaveLength(1);
    expect(filled[0].closest('button').querySelector('span').textContent).toBe('Dashboard');
  });
});
