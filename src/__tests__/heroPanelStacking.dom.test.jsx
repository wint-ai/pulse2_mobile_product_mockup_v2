// @vitest-environment happy-dom
/**
 * THE ZERO-CHIP PANEL MUST PAINT OVER THE TAB ROW — 2026-11-04.
 *
 * Owner, with a screenshot of the `Humidity sensors` upsell panel and its
 * `Talk to Wint sales` button with the tab row drawn ACROSS the text: "this is
 * also broken. Tooltip needs to be above everything, not below the tabs."
 *
 * WHY IT BROKE, and why a click test could not have caught it. The panel hangs
 * below the chip row and deliberately overflows the hero's box — it always has.
 * It used to overflow onto the health card, which came AFTER it in the
 * scroller. The collapsing header moved the TAB ROW into the same block as the
 * hero and AFTER it in tree order, i.e. straight into the panel's drop zone.
 * Both sat at z-auto inside the chrome's stacking context, so the later one
 * won. The existing suite asserts the panel OPENS and reports data-zero; a
 * covered panel still opens, still reports, and still answers a synthetic
 * click, because jsdom has no painter. So this pins the STRUCTURE instead,
 * the way the floating tab bar's regression is pinned.
 *
 * WHAT IS PINNED, and each line is one half of the bug:
 *   · the hero's window carries a POSITIVE z-index, so it outranks the row;
 *   · the tab row carries NONE, so there is nothing for it to win with;
 *   · the chrome block that holds both is itself a stacking context at z-[2],
 *     which is what keeps this local — the panel outranks the tab row and
 *     nothing else, so the drawer (z-10/z-11), EventFocusOverlay (z-50) and
 *     PushNotifications (z-[300]) still cover it, and the floating pill's host
 *     (z-auto, mounted after the page root) is untouched.
 *
 * Verified in Chromium at 393x852 in all four themes before this was written:
 * with a zero chip open, elementFromPoint at the panel's centre returns the
 * panel and at its CTA returns the link; with the drawer open the drawer
 * covers both; and the pill stays hit-testable at every scroll position.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import { UserProvider } from '@/context/UserContext'
import { SYSTEMS } from '@/data/systems'

afterEach(cleanup)

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <UserProvider>
        <Routes>
          <Route path="/" element={<HomeAllAccounts />} />
        </Routes>
      </UserProvider>
    </MemoryRouter>,
  )

const renderSystem = () =>
  render(
    <MemoryRouter initialEntries={[`/system/${SYSTEMS[0].id}`]}>
      <UserProvider>
        <Routes>
          <Route path="/system/:systemId" element={<SystemPageV2Screen />} />
        </Routes>
      </UserProvider>
    </MemoryRouter>,
  )

/* A positive z-index spelled either as a Tailwind atom (z-[1], z-10) or as an
   inline style. Returns the number, or null for "none". */
const zOf = (el) => {
  const inline = el?.style?.zIndex
  if (inline) return Number(inline)
  const m = (el?.className ?? '').match(/\bz-\[(\d+)\]|\bz-(\d+)\b/)
  return m ? Number(m[1] ?? m[2]) : null
}

describe.each([
  ['Dashboard', renderDashboard, 'home-tabs'],
  ['System page', renderSystem, 'system-tabs'],
])('%s — the hero overlay outranks the tab row it shares a block with', (name, renderPage, tabsName) => {
  it('gives the hero window a positive z-index and the tab row none', () => {
    const { container } = renderPage()
    const window_ = container.querySelector('[data-name="hero-window"]')
    const tabs = container.querySelector(`[data-name="${tabsName}"]`)

    expect(window_, 'the collapsing header mounts a hero window').toBeTruthy()
    expect(tabs, 'the tab row is in the chrome block').toBeTruthy()

    const wz = zOf(window_)
    expect(wz, 'the hero window must carry a positive z-index').toBeGreaterThan(0)
    expect(zOf(tabs), 'the tab row must not answer it with one of its own').toBeNull()
  })

  it('keeps that z-index inside the chrome block, which is its own stacking context', () => {
    const { container } = renderPage()
    const window_ = container.querySelector('[data-name="hero-window"]')
    /* The chrome block is the nearest ancestor carrying a z-index. It has to
       HAVE one — otherwise the window's z escapes into the page's context and
       starts competing with the drawer and the floating tab bar's host. */
    let chrome = window_.parentElement
    while (chrome && zOf(chrome) === null) chrome = chrome.parentElement
    expect(chrome, 'the hero window sits inside a stacking context').toBeTruthy()
    const cz = zOf(chrome)
    expect(cz).toBeGreaterThan(0)
    /* 2, not 20: it must beat the band (1) and the scroller (auto) and lose to
       the drawer's scrim (10) and panel (11), EventFocusOverlay (50) and
       PushNotifications (300). */
    expect(cz).toBeLessThan(10)
  })
})
