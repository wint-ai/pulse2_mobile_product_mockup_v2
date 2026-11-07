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
import { render, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import { UserProvider } from '@/context/UserContext'

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

/* ── THE SYSTEM PAGE LEFT THIS SUITE — 2026-11-07 ─────────────────────────
   It used to be the second row of the describe.each below, because it had
   copied the Dashboard's chrome block verbatim: a hero window overlaid on a
   tab row, both inside one z-[2] stacking context.

   SystemPageV2Screen no longer has any of that. The restructure the owner
   commissioned ("we are replacing tabs with the more button") deleted the
   collapsing header from that page: there is no `hero-window`, no
   `system-tabs`, and no chrome block for them to share. The hero is an
   ordinary card inside the scroller now.

   So the bug this file pins CANNOT HAPPEN THERE ANY MORE — not "is no longer
   detected", cannot happen: the row that was covering the panel does not
   exist, and the System page draws no zero-chip upsell panel to cover in the
   first place. Asserting the mechanism still exists would be asserting that
   the deletion did not happen.

   THE DASHBOARD CASE BELOW IS UNTOUCHED BY THIS NOTE and is still the live
   guard — it has since been rewritten against that page's own restructure,
   which is its author's call and not this note's. Do not read this paragraph
   as permission to delete it too: the System page left because its mechanism
   left, not because the suite stopped being worth running. */

/* A positive z-index spelled either as a Tailwind atom (z-[1], z-10) or as an
   inline style. Returns the number, or null for "none". */
const zOf = (el) => {
  const inline = el?.style?.zIndex
  if (inline) return Number(inline)
  const m = (el?.className ?? '').match(/\bz-\[(\d+)\]|\bz-(\d+)\b/)
  return m ? Number(m[1] ?? m[2]) : null
}

/* ── THE DASHBOARD'S HALF, RE-AIMED — 2026-11-07 ──────────────────────────
   Agent D left the row below as "the live guard … whoever lands that page
   decides what replaces it". This is that decision, and it is a re-aim, not a
   deletion: the bug the owner reported is still possible, at a different
   seam.

   WHAT CHANGED UNDER IT. HomeAllAccounts has no `hero-window`, no `home-tabs`
   and no chrome block either — same commission, same deletion. The hero is
   the coloured top of an inset HeroCardShell inside the scroller, and the
   zero-chip panel still hangs 4px under the chip row and still overflows its
   box. WHAT IT OVERFLOWS ONTO IS NOW THE CARD'S OWN WHITE BODY — System
   health — which comes AFTER the colour section in tree order and is
   OPAQUE. That is exactly the shape of the original bug (a later, opaque
   sibling in the drop zone), so the guard survives with its subject swapped.

   WHAT IS PINNED, and each line is one half of the bug:
     · the panel carries a POSITIVE z-index, so it outranks the body;
     · the hero card's body carries NONE, so there is nothing to win with;
     · nothing between them opens a stacking context that would SEAL the
       panel below the body — a transform, a filter or an `isolate` on the
       card root or the colour section would do exactly that, and the deleted
       `hero-collapse` wrapper did it with a transform.

   Verified in Chromium at 393x852 in all four themes: with a zero chip open,
   elementFromPoint at the panel's centre returns the panel, the panel's
   bottom (301px) clears the card's (320px) so `overflow-hidden` never reaches
   it, and the floating pill stays hit-testable. */
describe('Dashboard — the zero-chip panel outranks what it now overlaps', () => {
  /* The chips are buttons only when the page passes `onSelectType`, which it
     does. Against this dataset the flood and humidity chips read 0, so the
     LAST chip opens the zero panel with its upsell CTA — the exact state the
     owner screenshotted. One tap arms; it never navigates at 0. */
  const openZeroChip = (container) => {
    const chips = [...container.querySelectorAll('[data-node-id="199531:80031"] button')]
    expect(chips.length, 'the hero chips are no longer controls').toBe(3)
    fireEvent.click(chips[chips.length - 1])
    return container.querySelector('[data-name="System type explainer"]')
  }

  it('hangs the panel out of the hero box with a positive z-index', () => {
    const { container } = renderDashboard()
    const panel = openZeroChip(container)

    expect(panel, 'the zero-chip panel did not open').toBeTruthy()
    expect(panel.getAttribute('data-zero'), 'this chip is not the zero case').toBe('true')
    expect(zOf(panel), 'the panel must carry a positive z-index').toBeGreaterThan(0)
  })

  it('leaves the hero card body at z-auto, so the panel wins in the same context', () => {
    const { container } = renderDashboard()
    openZeroChip(container)
    const body = container.querySelector('[data-name="hero-card-body"]')

    expect(body, 'the hero card has no body section').toBeTruthy()
    expect(zOf(body), 'the body must not answer the panel with a z-index of its own').toBeNull()
  })

  it('is not sealed below the body by a stacking context in between', () => {
    /* A transform, a filter or `isolation: isolate` on any ancestor between
       the panel and the card's common parent would pin the panel at THAT
       element's level, and no z-index inside could reach past the body. This
       is how the old bug actually worked: `hero-collapse` carried a transform.
       `overflow-hidden` on the card root is fine — it clips, it does not
       stack. */
    const { container } = renderDashboard()
    const panel = openZeroChip(container)
    const card = container.querySelector('[data-name="hero-card-shell"]')

    const seals = []
    for (let el = panel.parentElement; el && el !== card; el = el.parentElement) {
      const cls = String(el.className ?? '')
      const style = el.getAttribute('style') ?? ''
      if (/\btransform\b|\btranslate-|\bscale-|\brotate-/.test(cls) || /transform:/.test(style)) seals.push(cls)
      if (/\bisolate\b/.test(cls) || /isolation:/.test(style)) seals.push(cls)
      if (/\bfilter\b|\bblur-|\bbackdrop-blur-/.test(cls) || /filter:/.test(style)) seals.push(cls)
    }
    expect(seals, 'a stacking context between the panel and the card seals it below the body').toEqual([])
    /* And the card root itself must not do it either. */
    expect(String(card.className)).not.toMatch(/\bisolate\b/)
  })
})
