// @vitest-environment happy-dom
//
// "why screens is cutted?" — every screen's content ran past the right edge of
// the phone bezel and was silently clipped. "Show all" rendered as "Show", the
// third fault tile as "No powe", water-event rows were cut mid-address.
//
// TWO INDEPENDENT CAUSES STACKED, and this file pins both.
//
//   1. The bezel ate 18px of screen. Phone.jsx's DesktopFrame declares
//      `width: 393` AND `border: 9px`. Tailwind's preflight sets
//      `box-sizing: border-box` on *, so 393 was the OUTSIDE of the handset
//      and the screen's content box measured 376. Every page here is
//      transcribed from a 393-wide Figma frame, so every page was handed 17px
//      less than it was drawn for.
//
//   2. The scroll body shrink-wrapped. HomeAllAccounts' page root is
//      `items-start`, which does not stretch its children across the inline
//      axis, and the PullToRefresh host inside it carried `flex-1` (a BLOCK
//      axis instruction) and no width. It therefore sized to fit-content —
//      min-content 415px against an available 344 — and laid out 415 wide.
//
// ── WHY NOT `scrollWidth <= clientWidth` LITERALLY ──────────────────────────
//
// That IS the correct runtime assertion and it is what the browser probe
// checks. It cannot be the assertion HERE: happy-dom performs no layout, so
// every clientWidth and scrollWidth in this file is 0, and `0 <= 0` passes on
// the broken code as readily as on the fixed code. A test that cannot fail is
// worse than no test.
//
// So this file asserts the two things that MAKE `scrollWidth <= clientWidth`
// true, each of which is checkable without a layout engine:
//
//   * the frame's content box resolves to 393, computed through the real CSS
//     box model rather than read off a style object; and
//   * no element that is told to fill a non-stretching flex column leaves its
//     inline size to fit-content.
//
// Both assertions fail on the code as it stood before this fix. The browser
// probe that measures the real numbers lives outside the repo; keep the two in
// step — if the shape of the shell changes, this file is the one that says
// what the shape has to be.
//
// NOT ASSERTED, deliberately: that no text is ellipsised. `truncate` is a
// design decision all over this app and an address ending in "…" is correct.
// The bug was text cut with no ellipsis at all, which is the overflow these
// assertions prevent.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Phone from '@/components/Phone'
import { ThemeProvider } from '@/context/ThemeContext'
import { UserProvider } from '@/context/UserContext'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import ValveManagementScreen from '@/v2/pages/ValveManagementScreen'
import AccountScreenV2 from '@/v2/pages/AccountScreenV2'
import MoreComingSoonScreen from '@/v2/pages/MoreComingSoonScreen'
import HomeAccountOverview from '@/v2/pages/HomeAccountOverview'
import SystemPage from '@/v2/pages/SystemPage'

afterEach(cleanup)

/* ── 1. THE SCREEN IS 393 WIDE ──────────────────────────────────────────── */

/**
 * The frame's content box, by the CSS box model rather than by trusting the
 * declared `width` to mean the screen.
 *
 * This is the arithmetic the bug was: under `border-box`, `width` includes the
 * borders and the screen is `width - 2 * border`. Under `content-box` it does
 * not and the screen IS `width`. The function knows both, so the test keeps
 * passing if the frame is ever respelled as `width: 411` + border-box, and
 * fails the moment the pair stops resolving to 393.
 */
function screenWidthOf(el) {
  const s = el.style
  const declared = parseFloat(s.width)
  const border = parseFloat(s.borderLeftWidth || s.border) || 0
  // Tailwind preflight puts every element in border-box unless it opts out.
  const borderBox = (s.boxSizing || 'border-box') === 'border-box'
  return borderBox ? declared - 2 * border : declared
}

const renderPhone = () =>
  render(
    <ThemeProvider>
      <Phone>
        <div data-testid="screen-child" />
      </Phone>
    </ThemeProvider>,
  )

/** The bezel: the only element in the frame carrying the handset's border. */
const bezelOf = (container) =>
  [...container.querySelectorAll('div')].find((d) => parseFloat(d.style.width) === 393)

describe('the desktop phone frame gives the page a 393px screen', () => {
  it('resolves to exactly the Figma frame width, borders excluded', () => {
    const { container } = renderPhone()
    const bezel = bezelOf(container)
    expect(bezel, 'the 393px bezel is mounted').toBeTruthy()
    // 376 here is the bug: the 9px bezel eaten out of the screen, twice.
    expect(screenWidthOf(bezel), 'screen content box').toBe(393)
  })

  it('keeps the bezel itself, so the fix is a box-model change and not a removal', () => {
    const { container } = renderPhone()
    const bezel = bezelOf(container)
    expect(parseFloat(bezel.style.borderLeftWidth || bezel.style.border)).toBe(9)
    expect(bezel.style.overflow, 'the frame still clips').toBe('hidden')
  })
})

/* ── 2. NOTHING FILLS A COLUMN WITHOUT SAYING HOW WIDE IT IS ─────────────── */

const cls = (el) => String(el.className?.baseVal ?? el.className ?? '')

/** A flex column that does NOT stretch its children across the inline axis. */
function isNonStretchingColumn(el) {
  const c = cls(el)
  const display = el.style.display || (/(^|\s)(inline-)?flex(\s|$)/.test(c) ? 'flex' : '')
  if (!display.includes('flex')) return false
  const column = el.style.flexDirection === 'column' || /(^|\s)flex-col(\s|$)/.test(c)
  if (!column) return false
  const align = el.style.alignItems
    || (/(^|\s)items-start(\s|$)/.test(c) ? 'flex-start' : '')
    || (/(^|\s)items-center(\s|$)/.test(c) ? 'center' : '')
    || (/(^|\s)items-end(\s|$)/.test(c) ? 'flex-end' : '')
  return align !== '' && align !== 'stretch'
}

/** `flex-1` / `flex: 1` — "fill this column". It governs the BLOCK axis only. */
function isColumnFiller(el) {
  return /(^|\s)flex-1(\s|$)/.test(cls(el)) || String(el.style.flex).startsWith('1')
}

/**
 * Does this element state its own inline size? `w-full`, `self-stretch`, an
 * arbitrary `w-[…]`, a sized utility, or an inline width all count.
 */
function declaresWidth(el) {
  const c = cls(el)
  return Boolean(el.style.width)
    || /(^|\s)self-stretch(\s|$)/.test(c)
    || /(^|\s)w-(full|screen|\[[^\]]+\]|\d+(\.\d+)?|px)(\s|$)/.test(c)
    || /(^|\s)size-(full|\[[^\]]+\])(\s|$)/.test(c)
}

function offenders(root) {
  const bad = []
  for (const el of root.querySelectorAll('*')) {
    const parent = el.parentElement
    if (!parent || !isNonStretchingColumn(parent)) continue
    if (!isColumnFiller(el)) continue
    if (el.style.position === 'absolute' || el.style.position === 'fixed') continue
    if (/(^|\s)absolute(\s|$)/.test(cls(el))) continue
    if (declaresWidth(el)) continue
    bad.push(
      `<${el.tagName.toLowerCase()}> ${el.getAttribute('data-name') || el.getAttribute('data-node-id') || ''}`
      + ` class="${cls(el).slice(0, 120)}" inside a ${cls(parent).slice(0, 80) || '[styled]'} column`,
    )
  }
  return bad
}

const mount = (path, element, pattern) =>
  render(
    <ThemeProvider>
      <UserProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={pattern} element={element} />
          </Routes>
        </MemoryRouter>
      </UserProvider>
    </ThemeProvider>,
  )

describe('a body told to fill a non-stretching column states its own width', () => {
  // `items-start` is `align-items: flex-start`: the cross axis of a column is
  // its WIDTH, so the children do not stretch. `flex-1` is a main-axis
  // instruction and says nothing about width, so a body carrying only `flex-1`
  // sizes to max(min-content, available) — 415px against an available 344 on
  // the Dashboard, which the bezel's `overflow: hidden` then swallowed.
  it.each([
    ['HomeAllAccounts', '/', '/', <HomeAllAccounts />],
    ['HomeAllAccounts (location scope)', '/location/Office', '/location/:locationName', <HomeAllAccounts />],
    ['SystemPageV2Screen', '/system/MRG-0001', '/system/:systemId', <SystemPageV2Screen />],
    ['ValveManagementScreen', '/valves', '/valves', <ValveManagementScreen />],
    ['AccountScreenV2', '/account', '/account', <AccountScreenV2 />],
    ['MoreComingSoonScreen', '/more', '/more', <MoreComingSoonScreen />],
    // The two /old screens. They are not on a default route any more, but they
    // are still in src/v2/pages and the shape this walk looks for is theirs to
    // acquire as readily as anyone's.
    ['HomeAccountOverview', '/old', '/old', <HomeAccountOverview />],
    ['SystemPage', '/old/system/MRG-0001', '/old/system/:systemId', <SystemPage />],
  ])('%s', (_name, path, pattern, element) => {
    const { container } = mount(path, element, pattern)
    expect(offenders(container).join('\n  ')).toBe('')
  })

  it('catches the shape it was written for', () => {
    // The pre-fix HomeAllAccounts, in miniature: an items-start column whose
    // body fills it on the block axis and never says how wide it is. If this
    // ever stops being reported, the walk above has gone blind and the five
    // assertions over it are decoration.
    const { container } = render(
      <div className="flex flex-col items-start">
        <div className="relative w-full" data-name="home-header" />
        <div className="flex min-h-0 flex-1 flex-col" data-name="body" />
      </div>,
    )
    expect(offenders(container)).toHaveLength(1)
    expect(offenders(container)[0]).toContain('body')
  })
})
