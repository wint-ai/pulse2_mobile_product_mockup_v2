// @vitest-environment happy-dom
//
// The floating tab bar sits at the bottom of every screen. THE BAR PAYS FOR
// ITSELF: its host reserves TAB_BAR_CLEARANCE of real column, and no screen
// pays it again.
//
// ── THE INVARIANT HAS FLIPPED TWICE. READ BOTH BEFORE CHANGING IT. ───────
//
// Until 2026-11-04 it was "content must never reach the pill": the bar
// reserved 77px of the flex column and nothing was allowed behind it.
//
// 2026-11-04, the owner: "and it needs to be completely floating". The host
// went `h-0`, the pill became absolute off that anchor, content scrolled UNDER
// it, and seventeen scroll bodies were each given TAB_BAR_CLEARANCE of bottom
// padding. The rule became "content must be able to scroll PAST the pill and
// still be fully readable when it stops".
//
// *** THAT RULE WAS WRONG, AND IT SHIPPED A DEAD SCREEN. 2026-11-08. ***
// The owner: "I can't click any water events from location. It just doesn't
// click." Measured in WebKit at 390x664 on /location/Office:
//
//     water-event row   y 568 -> 634
//     pill              y 587 -> 652, background oklab(1 0 0 / .96) - 96%
//                       OPAQUE - backdrop-blur(10px), pointer-events: auto
//     elementsFromPoint(195, 601)  ->  div[data-name=tabbar-pill] FIRST,
//                                      then the row's spans, then the button
//
// Bottom padding only governs where the END of a list comes to rest. At every
// intermediate scroll offset - including the one the screen OPENS at - rows
// still sat inside the pill's band: painted, with their top ~19px peeking
// above the bar so they read as live rows, and completely untappable.
// /location/Office and /location/967 Alder Dr were dead on arrival; the other
// locations worked only because their rows happen to start higher.
//
// SO THE HOST RESERVES THE STRIP AGAIN - `h-[93px]`, TAB_BAR_CLEARANCE - and
// the per-screen padding is gone. The pill did not move: it is still
// `absolute inset-x-[16px] bottom-[12px] h-[65px]` inside that host, so 77 of
// the 93 is pill and 12px inset, and the remaining 16px is a strip of page
// background above it. The float is intact; what changed is that the strip is
// reserved ONCE, by the bar, instead of seventeen times by the screens.
//
// ── THE NUMBERS MOVED, THE INVARIANT DID NOT - 2026-11-09 ────────────────
//
// Figma node 200067:39019 re-draws the bar at 335 x 66, x=33, y=756 in a
// 402 x 844 artboard, so the host is `h-[104px]` and the pill is
// `inset-x-[33px] bottom-[22px] h-[66px]` - footprint 88, gap still 16.
// NOTHING IN THIS FILE IS RELAXED BY THAT. Every assertion below reads the
// numbers off tabBarMetrics.js rather than hardcoding them, which is exactly
// why a redesign moves the contract instead of breaking the test.
//
// AND THE FRAME ITSELF ARGUES FOR THE BUG. It draws the pill over live tree
// rows at 57% opacity - which is appearance. A Figma frame has no scroll
// model. If a future pass "makes it match the design" by floating the pill
// over the scroller again, the first test here fails, and it is right to.
//
// WHAT THIS FILE PINS NOW:
//   · the host declares the full clearance as height (not `h-0`);
//   · the pill still hangs off it with its insets and its height unchanged;
//   · NO screen declares the clearance itself - that is a double-reserve;
//   · the one documented exception still does (see EXEMPT below).
//
// Phone.jsx is a fixed 393x852 flex column with overflow:hidden, so
// `position: fixed` is banned and the host is an ordinary flex sibling.
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
  TAB_BAR_GAP,
} from '../components/tabBarMetrics';

afterEach(cleanup);

/** Pull an arbitrary-value Tailwind length out of a class string. */
function px(className, utility) {
  const m = className.match(new RegExp(`(?:^|\\s)${utility}-\\[(-?\\d+(?:\\.\\d+)?)px\\]`));
  return m ? Number(m[1]) : null;
}

/* The app shell, reduced to the two things that matter: one scrolling body
   with NO bottom padding of its own, and the bar below it reserving its own
   strip. This is the shape .claude/skills/v2-page-parity/SKILL.md requires of
   every screen. */
function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <div data-name="phone-column" style={{ display: 'flex', flexDirection: 'column', height: 852, overflow: 'hidden' }}>
        <div
          data-name="scroll-body"
          style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
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

describe('the tab bar floats, and reserves its own strip', () => {
  it('reserves the full clearance as real column, so nothing scrolls under it', () => {
    renderShell();
    const cls = host().className;
    // `fixed` is banned inside the 393x852 frame outright.
    expect(cls).not.toMatch(/(?:^|\s)fixed(?:\s|$)/);
    expect(cls).toMatch(/(?:^|\s)relative(?:\s|$)/);
    expect(
      cls,
      'the host is h-0 again. That is the 2026-11-08 bug: a zero-height host '
      + 'lets the scroll body run the full frame, and the pill is 96% opaque '
      + 'with pointer-events:auto, so every row inside its band is painted and '
      + 'dead. Bottom padding on the screens does NOT fix it - it only governs '
      + 'where the end of a list comes to rest.',
    ).not.toMatch(/(?:^|\s)h-0(?:\s|$)/);
    expect(
      px(cls, 'h'),
      'the host must reserve exactly TAB_BAR_CLEARANCE: less and content comes '
      + 'back under the pill, more and every page grows dead space.',
    ).toBe(TAB_BAR_CLEARANCE);
    // `shrink-0`, or a greedy sibling compresses the strip back to nothing.
    expect(cls).toMatch(/(?:^|\s)shrink-0(?:\s|$)/);
  });

  /* The pill must stay INSIDE the strip the host reserves. If it hung lower or
     taller than the host, content would be back underneath it and the fix
     would be undone without this file noticing. */
  it('keeps the pill wholly inside the reserved strip', () => {
    renderShell();
    const cls = pill().className;
    const occupies = px(cls, 'bottom') + px(cls, 'h');
    expect(occupies).toBe(TAB_BAR_FOOTPRINT);
    expect(
      occupies,
      `the pill occupies ${occupies}px of a ${TAB_BAR_CLEARANCE}px host, so it `
      + 'sticks out of the strip and overlaps the scroll body again',
    ).toBeLessThanOrEqual(TAB_BAR_CLEARANCE);
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

  it('keeps the translucent fill and the blur it was drawn with', () => {
    renderShell();
    /* Both are INERT as of 2026-11-08 - nothing scrolls under the pill for
       them to blur - and both are kept deliberately. They are the pill's
       declared appearance, the translucency still samples the page background
       behind it, and dropping them would change the look, which the 2026-11-08
       fix explicitly must not.

       2026-11-09: node 200067:39019 says rgba(255,255,255,0.57) over an 8px
       blur, so the fill went /96 -> /57 and the blur 10 -> 8. Matched loosely
       on purpose - the TOKEN is the contract (`--card`, so all four themes
       move with it), the alpha is the designer's. A literal hex here would
       freeze identically across every theme. */
    expect(pill().className).toMatch(/backdrop-blur-\[\d+px\]/);
    expect(pill().className).toMatch(/bg-card\/\d+/);
  });

  it('agrees with tabBarMetrics about how much of the strip it fills', () => {
    renderShell();
    const declared = px(pill().className, 'bottom') + px(pill().className, 'h');
    expect(
      declared,
      'the pill fills a different band than TAB_BAR_FOOTPRINT says it does, '
      + 'so the host is reserving the wrong amount of column',
    ).toBe(TAB_BAR_FOOTPRINT);
  });

  it('leaves a real gap above the pill, not a hairline', () => {
    expect(TAB_BAR_GAP, 'TAB_BAR_GAP must stay derived from the other two')
      .toBe(TAB_BAR_CLEARANCE - TAB_BAR_FOOTPRINT);
    expect(
      TAB_BAR_GAP,
      `the host reserves only ${TAB_BAR_GAP}px above the pill. A row that just `
      + 'touches the pill reads as clipped even when it is not.',
    ).toBeGreaterThanOrEqual(12);
  });
});

/* ── the other half of the contract: the screens ──────────────────────────
   The structural checks above cannot see a screen that pays the clearance a
   second time, and that is the failure this half exists to prevent now. So
   the source is read directly. It is the only way to assert something about
   twenty files from one test, and the alternative - twenty render tests -
   would not catch the twenty-first screen somebody adds. */

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

/**
 * Every screen that mounts TabBar as an in-flow sibling of its scroll body.
 *
 * THE LIST IS THE SAME SEVENTEEN; WHAT IS ASSERTED ABOUT IT INVERTED on
 * 2026-11-08. It was PADDED - each of these had to DECLARE the clearance.
 * They must now declare NONE of it: the host reserves it, and a second
 * helping is ~186px of dead space at the bottom of the page.
 */
const UNDER_THE_BAR = [
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
  'src/v2/pages/HomeAllAccounts.jsx',
  'src/v2/pages/HomeAccountOverview.jsx',
  'src/v2/pages/SystemPage.jsx',
];

/**
 * The ONE screen that still pays the clearance itself, and why.
 *
 * MoreComingSoonScreen's content lives in a cover that is `absolute inset-0`:
 * it is OUT OF FLOW, spans the whole frame including the host's column, and
 * the pill still paints over its bottom TAB_BAR_FOOTPRINT. Reserved column
 * does not move an out-of-flow box, so that scroller owes the clearance on
 * its own. moreComingSoon.dom.test.jsx:182 asserts the class; this list is
 * what stops the sweep below from calling it a double-reserve.
 *
 * ⚠ THIS IS NOT A PLACE TO PARK A SCREEN YOU DID NOT WANT TO FIX. The only
 *   qualifying reason is an out-of-flow (absolute/fixed) scroll region that
 *   the host's column cannot push. An ordinary in-flow scroll body belongs in
 *   UNDER_THE_BAR.
 */
const EXEMPT = ['src/v2/pages/MoreComingSoonScreen.jsx'];

/* Matches the clearance however a file spells it.
 *
 * THE LITERAL ARM: `paddingBottom: 93`, `padding: '10px 14px 93px'`,
 * `pb-[93px]`. Built FROM `TAB_BAR_CLEARANCE`, so moving the constant moves
 * the check with it rather than letting a screen drift.
 *
 * THE IDENTIFIER ARM: `paddingBottom: TAB_BAR_CLEARANCE`, or the same value on
 * `marginBottom` (ValveManagementScreen's selection strip paid it as a margin
 * until 2026-11-08). The import is REQUIRED, not decorative: a bare identifier
 * proves nothing, since a file could define `const TAB_BAR_CLEARANCE = 0`
 * locally.
 *
 * ⚠ COMMENTS ARE STRIPPED FIRST, AND THAT IS LOAD-BEARING NOW. While this
 *   detector was used to assert the POSITIVE, a stray `93` in prose only ever
 *   let a broken screen pass. Used to assert the NEGATIVE it does the
 *   opposite: these files document the padding they used to carry in as many
 *   words ("It was `paddingBottom: 93`"), and matching raw source would fail
 *   three correct screens for describing their own history. Same stripper as
 *   scripts/check-shell-contract.mjs, and for the same reason.
 *
 * ⚠ A SOURCE GREP CANNOT SEE WHICH ELEMENT CARRIES IT. That limitation is
 *   unchanged and is why UNDER_THE_BAR is a hand-kept list. */
const IMPORTS_CLEARANCE = /import\s*\{[^}]*\bTAB_BAR_CLEARANCE\b[^}]*\}\s*from\s*['"][^'"]*tabBarMetrics['"]/;

/** Block, line and JSX comments out, so prose about the padding is not code. */
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const declaresClearance = (raw) => {
  const src = stripComments(raw);
  const literal = new RegExp(
    `paddingBottom:\\s*${TAB_BAR_CLEARANCE}\\b`
    + `|padding:\\s*'[^']*\\s${TAB_BAR_CLEARANCE}px'`
    + `|pb-\\[${TAB_BAR_CLEARANCE}px\\]`,
  );
  if (literal.test(src)) return true;
  return IMPORTS_CLEARANCE.test(src)
    && /(?:padding|margin)Bottom:\s*TAB_BAR_CLEARANCE\b/.test(src);
};

/**
 * How much bottom spacing a screen declares, whatever number it names.
 *
 * WHY THIS EXISTS AS WELL AS `declaresClearance` — 2026-11-09. The negative
 * sweep wants "does this screen pay the clearance AGAIN", which is an exact
 * question and stays exact. The EXEMPT screen's question is different: its
 * scroll region is out of flow, so what it owes is enough padding to clear the
 * PILL, and an exact match on the constant turns a 1px redesign into a failure
 * in a file the tab bar does not own.
 *
 * ⚠ IT IS NOT A LOOSENING. Zero still fails, and anything under the pill's
 *   footprint still fails - which is the condition that would actually put
 *   rows under a 57%-opaque, pointer-events:auto bar.
 */
const declaredBottomPx = (raw) => {
  const src = stripComments(raw);
  const found = [];
  for (const m of src.matchAll(/paddingBottom:\s*(\d+)\b/g)) found.push(Number(m[1]));
  for (const m of src.matchAll(/padding:\s*'[^']*\s(\d+)px'/g)) found.push(Number(m[1]));
  for (const m of src.matchAll(/pb-\[(\d+)px\]/g)) found.push(Number(m[1]));
  if (IMPORTS_CLEARANCE.test(src) && /(?:padding|margin)Bottom:\s*TAB_BAR_CLEARANCE\b/.test(src)) {
    found.push(TAB_BAR_CLEARANCE);
  }
  return found.length ? Math.max(...found) : 0;
};

/* ─────────────────────────────────────────────────────────────────────────
 * AND IT HAS TO BE VISIBLE, not merely mounted and paid for.
 *
 * 2026-11-04, the owner, with a screenshot of the Dashboard running to the
 * bottom edge with no bar on it at all: "the main bottom nav bar needs to
 * always [be] floating — it's gone now."
 *
 * The Dashboard restructure had given its scroll body `relative z-10`, so the
 * artwork band behind it would sit underneath. TabBar's host is at
 * z-index:AUTO on purpose (it is how the z-50 and z-[300] overlays cover the
 * bar), and CSS paints EVERY positive z-index in a later step than EVERY auto
 * one, regardless of DOM order. So a scroll body at z-10 paints over a tab bar
 * mounted after it, and the pill is simply not on the screen.
 *
 * EVERY CHECK IN THIS FILE STAYED GREEN THROUGH IT. TabBar was still mounted,
 * the host still carried its declared height, the pill still hung off it with
 * the right insets and check-shell-contract still passed. The suite measured
 * that room had been RESERVED under the bar and never that the bar was
 * painted in it.
 *
 * WHY THIS IS A SOURCE CHECK. happy-dom has no layout engine and does not
 * resolve a Tailwind class to a z-index, so the stacking cannot be observed in
 * this environment; the browser is where it was measured. What is pinned here
 * is the one declaration that caused it. Raising the host instead is NOT the
 * fix and must not be used to satisfy this: the drawer scrim is z-10 and its
 * panel z-11, and a host above those punches the pill through the navigation
 * drawer (the floating-bar work verified drawerCoversTheBar explicitly).
 *
 * v2 pages only. The v1 screens in UNDER_THE_BAR predate this shell and spell
 * their scroll bodies several different ways; widening this is a separate
 * pass.
 */
const V2_UNDER_THE_BAR = UNDER_THE_BAR.filter(f => f.startsWith('src/v2/pages/'));

/**
 * The className literal on the element that declares the scroll.
 *
 * Scoped by walking back to the element's own opening tag rather than by a
 * fixed character window: these files put a 40-line comment between the
 * className and the style object, so a window wide enough to span it is also
 * wide enough to pick up the PREVIOUS element's classes.
 */
function scrollBodyClasses(src) {
  const out = [];
  /* Both dialects: the style-object form and the utility form. */
  const re = /overflowY:\s*['"]auto['"]|(?:^|\s)overflow-y-auto(?:\s|"|`)/g;
  let m;
  while ((m = re.exec(src))) {
    const openedAt = src.lastIndexOf('<', m.index);
    if (openedAt < 0) continue;
    const tag = src.slice(openedAt, m.index + 40);
    const cls = [...tag.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{String\.raw`([^`]*)`\}|\{cn\(([\s\S]*?)\)\})/g)];
    for (const c of cls) out.push(c[1] ?? c[2] ?? c[3] ?? c[4]);
  }
  return out;
}

/* `z-0` and `z-auto` are fine - both paint in the same step as the host, in
   tree order, and the host is mounted last. Only a POSITIVE value outranks
   it. */
const POSITIVE_Z = /(?:^|\s)z-(?:\[(\d+)px?\]|([1-9]\d*))(?:\s|$)/;

describe('the pill is painted, not merely mounted', () => {
  it.each(V2_UNDER_THE_BAR)('%s does not outrank the tab bar from its scroll body', file => {
    /* Not asserted non-empty: a page may spell its scroller with no className
       at all (AccountScreenV2 carries the overflow in the style object alone),
       and that is not a violation - there is simply nothing to outrank with. */
    for (const cls of scrollBodyClasses(read(file))) {
      const hit = cls.match(POSITIVE_Z);
      expect(
        hit,
        `${file} gives its scroll body "${hit && hit[0].trim()}". TabBar's host `
        + 'is z-index:auto, and CSS paints every positive z-index after every '
        + 'auto one whatever the DOM order - so this hides the floating bar '
        + 'completely. Put the stacking on the CHROME block instead; it never '
        + 'overlaps the pill.',
      ).toBeNull();
    }
  });
});

describe('no screen reserves the bar\'s strip a second time', () => {
  it.each(UNDER_THE_BAR)('%s leaves the clearance to the bar', file => {
    const src = read(file);
    expect(
      declaresClearance(src),
      `${file} declares ${TAB_BAR_CLEARANCE}px of bottom spacing of its own. `
      + `TabBar's host already reserves that strip as real column, so this `
      + `screen now ends ${TAB_BAR_CLEARANCE * 2}px above the frame's bottom `
      + 'edge and the bottom of the page is dead space. Delete it; the bar '
      + 'pays for itself (src/components/tabBarMetrics.js).',
    ).toBe(false);
  });

  /* The exemption has to stay TRUE, not merely listed. If MoreComingSoonScreen
     ever drops its padding - or its cover stops being absolute - this fails
     and whoever changed it has to decide which list the file belongs in. */
  it.each(EXEMPT)('%s still pays it, because its cover is out of flow', file => {
    const src = read(file);
    const declared = declaredBottomPx(src);
    expect(
      declared,
      `${file} is listed EXEMPT but declares no bottom clearance. Its scroll `
      + 'region is inside an `absolute inset-0` cover, which reserved column '
      + 'cannot push, so the pill paints over its bottom rows unless it pads '
      + 'itself.',
    ).toBeGreaterThan(0);
    expect(
      declared,
      `${file} declares ${declared}px, which is less than the pill's own `
      + `${TAB_BAR_FOOTPRINT}px footprint. Its bottom rows are UNDER a bar that `
      + 'is 57% opaque with pointer-events:auto - painted and dead.',
    ).toBeGreaterThanOrEqual(TAB_BAR_FOOTPRINT);
    /* THE DRIFT THIS CHECK WAS LOOSENED FOR IS CLOSED — 2026-11-09, and the
       loosening stands on its own merits rather than on that drift. When node
       200067:39019 moved the bar (footprint 77 -> 88, clearance 93 -> 104),
       MoreComingSoonScreen still spelled `pb-[93px]` and this case was an
       exact match on TAB_BAR_CLEARANCE, so it went red against a screen on
       which nothing was actually wrong: 93 still cleared the 88px footprint,
       so no row was ever under the pill - the last one simply rested 5px above
       the bar instead of 16. The screen now carries `pb-[104px]` and
       moreComingSoon.dom.test.jsx agrees with it on the same at-least-the-
       footprint bar, so there is NO outstanding failure here and nothing left
       to fix. What is kept is the BOUND, not the exact literal: an exact
       literal turns every future re-draw of the bar into a red test on a
       correct screen, and a red test on a correct screen is how a suite gets
       relaxed for the wrong reason. Below the footprint is the case that can
       really ship broken - bottom rows under a bar that is 57% opaque with
       pointer-events:auto, painted and dead, which is the 2026-11-08 bug. */
    expect(
      /absolute\s+inset-0/.test(stripComments(src)),
      `${file} no longer has an out-of-flow cover, so the exemption's only `
      + 'justification is gone. Move it into UNDER_THE_BAR and drop the padding.',
    ).toBe(true);
  });

  /* THE DETECTOR'S OWN TEST. It now backs a NEGATIVE assertion, which makes a
     detector that matches nothing far more dangerous than before: every screen
     would read as clean and a real double-reserve would ship. */
  it('recognises the clearance whether a screen spells it or imports it', () => {
    const IMPORT = "import { TAB_BAR_CLEARANCE } from '@/components/tabBarMetrics'\n";

    // The three literal spellings in use across the seventeen screens.
    expect(declaresClearance(`style={{ paddingBottom: ${TAB_BAR_CLEARANCE} }}`)).toBe(true);
    expect(declaresClearance(`padding: '10px 14px ${TAB_BAR_CLEARANCE}px'`)).toBe(true);
    expect(declaresClearance(`className="pb-[${TAB_BAR_CLEARANCE}px]"`)).toBe(true);

    // The identifier, which the module's own header tells pages to use.
    expect(declaresClearance(`${IMPORT}style={{ paddingBottom: TAB_BAR_CLEARANCE }}`)).toBe(true);
    expect(declaresClearance(`${IMPORT}style={{ marginBottom: TAB_BAR_CLEARANCE }}`)).toBe(true);

    // The identifier WITHOUT the import proves nothing - it could be a local 0.
    expect(
      declaresClearance('const TAB_BAR_CLEARANCE = 0\nstyle={{ paddingBottom: TAB_BAR_CLEARANCE }}'),
      'an unimported identifier must not satisfy the check',
    ).toBe(false);

    // And a screen that simply has no clearance still fails.
    expect(declaresClearance('style={{ paddingBottom: 8 }}')).toBe(false);
    expect(declaresClearance(IMPORT), 'importing it is not using it').toBe(false);

    /* COMMENTS ARE NOT CODE — the arm added 2026-11-08 with the inverted
       assertion. Three screens describe the padding they used to carry, and
       reading raw source would fail every one of them for saying so. */
    expect(
      declaresClearance(`/* it was paddingBottom: ${TAB_BAR_CLEARANCE} and it is gone */`),
      'prose about the old padding must not read as the padding',
    ).toBe(false);
    expect(declaresClearance(`{/* NO pb-[${TAB_BAR_CLEARANCE}px] any more */}`)).toBe(false);
    expect(declaresClearance(`// padding: '10px 14px ${TAB_BAR_CLEARANCE}px'`)).toBe(false);
    // ...but a real declaration next to that prose still counts.
    expect(
      declaresClearance(`/* it was ${TAB_BAR_CLEARANCE} */\nstyle={{ paddingBottom: ${TAB_BAR_CLEARANCE} }}`),
    ).toBe(true);
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

  it('gives every tab the same indicator box, so the row stays even', () => {
    renderShell();
    const caps = [...pill().querySelectorAll('button > div')];
    expect(caps).toHaveLength(4);

    /* THE INDICATOR IS THE ITEM BOX NOW - 2026-11-09, node 200067:39019,
       whose active item is `flex-[1_0_0] h-full rounded-[100px]` at 79.25 x
       48. It used to be a 44x28 capsule INSIDE the item, read off the owner's
       WhatsApp screenshot; "wider than tall" was the assertion that pinned
       that reading and it is gone with it.

       The WIDTH is no longer a literal and must not become one: the item is a
       grid fraction, 77.25 in the 393 shell and 79.50 at the frame's own 402,
       so `w-full` is the only spelling that is right at both. What is pinned
       is that all four agree, and that the height is the frame's 48. */
    const heights = caps.map(c => px(c.className, 'h'));
    expect(new Set(heights).size, `indicator heights differ: ${heights.join(', ')}`).toBe(1);
    expect(
      heights[0],
      'the indicator must be the full item box: pill height minus the 8px '
      + 'padding each side and the 1px ring each side',
    ).toBe(TAB_BAR_PILL_HEIGHT - 16 - 2);
    for (const c of caps) {
      expect(c.className, 'the indicator must stay fluid, not a literal width').toMatch(/(?:^|\s)w-full(?:\s|$)/);
      // A stadium, like the frame's rounded-[100px] clamped to half of 48.
      expect(px(c.className, 'rounded')).toBe(heights[0] / 2);
    }
  });

  it('draws the avatar as the Profile glyph, inside that indicator', () => {
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
    // More left the bar 2026-11-07; Search took the second slot.
    //
    // THE LABELS WENT `sr-only` ON 2026-11-09 (node 200067:39019 holds four
    // glyphs and no text node) AND CAME BACK VISIBLE THE SAME DAY, when the
    // owner asked for "text bellow here / Home ,Systems , Alerts, Profile".
    // They are also the four tabs' accessible names and the handle six suites
    // navigate by, so the span, its position, its text and now its VISIBILITY
    // are all pinned here.
    for (const b of document.querySelectorAll('button')) {
      const span = b.querySelector('span');
      expect(span.textContent).toMatch(/^(Home|Systems|Alerts|Profile)$/);
      expect(
        span.className,
        'the label is back to sr-only. The owner asked for visible text under '
        + 'every glyph on 2026-11-09 - see THE LABELS ARE BACK in TabBar.jsx. '
        + 'If it is being hidden again, the pill height and TAB_BAR_CLEARANCE '
        + 'have to come back down with it.',
      ).not.toMatch(/(?:^|\s)sr-only(?:\s|$)/);
      // 11px Figtree on a 16.5px line, and the line-height AFTER the size -
      // twMerge drops a `leading-*` that precedes one.
      expect(span.className).toMatch(/text-\[11px\]\s+leading-\[16\.5px\]/);
      // Under the glyph, not above it: the span is first in the DOM for the
      // six suites that read it, so `order-2` is what puts it back below.
      expect(span.className).toMatch(/(?:^|\s)order-2(?:\s|$)/);
    }
  });

  /* THE LABEL HAS TO FIT THE COLUMN IT IS IN. happy-dom cannot measure text,
     so what is checked here is the pair of numbers the browser measurement
     rests on: the column the grid gives each label, and the fact that nothing
     clips it. The widths themselves were measured in Chromium at 393x852 and
     are recorded in TabBar.jsx's label-width block. */
  it('leaves the label a column to sit in, and nothing that clips it', () => {
    renderShell();
    for (const b of document.querySelectorAll('button')) {
      const span = b.querySelector('span');
      // No `truncate`: there is nothing to truncate at these widths, and an
      // ellipsis that can never fire is dead code (scripts/check-text-overflow).
      expect(span.className).not.toMatch(/(?:^|\s)truncate(?:\s|$)/);
    }
    // The pill must not clip what hangs out of it either - the Alerts badge
    // is deliberately outside its glyph box.
    expect(pill().className).not.toMatch(/(?:^|\s)overflow-hidden(?:\s|$)/);
  });

  it('gives the active indicator its fill, and only the active one', () => {
    renderShell();
    /* 16%, not 15: the frame states `bg-[rgba(11,129,248,0.16)]` and #0b81f8
       IS --primary, so the alpha is the designer's own. */
    const filled = [...pill().querySelectorAll('button > div')]
      .filter(d => /bg-primary\/16/.test(d.className));
    expect(filled).toHaveLength(1);
    expect(filled[0].closest('button').querySelector('span').textContent).toBe('Home');
  });

  /* THE GLYPH IS 28, FROM THE FRAME, and the size has to be a literal on the
     svg: the shadcn Button preset carries
     `[&_svg:not([class*='size-'])]:size-4`, so a glyph that does not name its
     own size is silently shrunk to 16px. */
  it('draws every glyph at the frame s 28px', () => {
    renderShell();
    for (const b of document.querySelectorAll('button')) {
      const box = b.querySelector('div > div');
      expect(box.className, 'the glyph box must be 28px').toMatch(/(?:^|\s)size-\[28px\](?:\s|$)/);
    }
  });
});
