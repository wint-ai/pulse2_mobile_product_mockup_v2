// @vitest-environment happy-dom
/**
 * THE SYSTEM PAGE'S HEADER BAR IS SEATED ON THE HERO — Figma 200059:35848,
 * adopted 2026-11-09.
 *
 * 200059:35860 paints the bar ON the red hero: an rgba(217,96,100,0.76) veil
 * under `mix-blend-multiply` with #fafbfc ink, which is AppHeaderBar's
 * `onColor` surface plus `surfaceTint`. Three things about that composite fail
 * SILENTLY — they render a plausible-looking bar with no veil, or no bar at
 * all — so each one is pinned here rather than left to a screenshot:
 *
 *   1. DOM ORDER. HeroWaveArt is `absolute`; a bar that comes BEFORE it is
 *      painted over and renders completely invisible. The bar must follow the
 *      artwork inside the coloured section.
 *   2. `px-0` MUST NOT REACH THE HERO SEAT. `onColor` is a chip surface, so
 *      AppHeaderBar puts its own `px-[8px]` on the root and merges `className`
 *      after it — a `px-0` from the page wins through tailwind-merge and
 *      flattens the chip's padding onto the title's glyphs.
 *   3. THE VEIL MUST EXIST. AppHeaderBar paints NO tint when `surfaceTint` is
 *      omitted, deliberately, so a missing tint looks unfinished rather than
 *      plausible. On this page that would be an untinted bar on red artwork.
 *
 * It also pins the shell invariant the move could have broken: the bar is now
 * INSIDE the one scroll container, and there must still be exactly one of
 * those and exactly one bar.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import { SYSTEMS } from '@/data/systems'

beforeEach(() => { localStorage.clear() })
afterEach(cleanup)

/* A system with a LIVE WATER EVENT, because that is the state this frame
   describes and the state the hero seat is gated on: `surfaceTint` is the tint
   of the RED hero, and the page deliberately keeps the bar on the page ground
   where the hero is the calm BLUE raster. The id is taken from the dataset
   rather than spelled here — the fixtures are generated and a literal id goes
   stale silently.

   `leak-high` / `leak-low` is the page's own `isWaterEvent`; a FAULT alert is
   not a water event and does not turn the hero red. */
const SYS = SYSTEMS.find(s => s.alert?.type === 'leak-high' || s.alert?.type === 'leak-low')
/* And one WITHOUT a live water event, for the ground seat. The negation of
   `isWaterEvent` and not "no alert at all": a FAULT alert does not turn the
   hero red either, so it belongs on the ground seat too, and the dataset has
   no system that is both device-bearing and completely alert-free. */
const CALM = SYSTEMS.find(
  s => s.alert?.type !== 'leak-high' && s.alert?.type !== 'leak-low',
)

function renderPage(systemId = SYS?.id) {
  return render(
    <MemoryRouter initialEntries={[`/system/${systemId}`]}>
      <Routes>
        <Route path="/system/:systemId" element={<SystemPageV2Screen />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('System page header, seated on the hero', () => {
  it('has both fixtures: one alerting system and one calm one', () => {
    expect(SYS, 'no system with a live water event in the dataset').toBeTruthy()
    expect(CALM, 'no calm system with devices in the dataset').toBeTruthy()
  })

  it('renders exactly one header bar', () => {
    const { container } = renderPage()
    expect(container.querySelectorAll('[data-name="app-header-bar"]')).toHaveLength(1)
  })

  it('puts the bar on the onColor surface, inside the hero card', () => {
    const { container } = renderPage()
    const bar = container.querySelector('[data-name="app-header-bar"]')
    expect(bar).toBeTruthy()
    expect(bar.getAttribute('data-surface')).toBe('onColor')

    const hero = container.querySelector('[data-name="hero-card-shell"]')
    expect(hero).toBeTruthy()
    // Inside the hero, and specifically inside its COLOURED section — not the
    // white body under it.
    const colour = container.querySelector('[data-name="hero-card-colour"]')
    expect(colour).toBeTruthy()
    expect(colour.contains(bar)).toBe(true)
  })

  it('paints the veil, and paints it with a tint', () => {
    const { container } = renderPage()
    const veil = container.querySelector('[data-name="app-header-veil"]')
    expect(veil).toBeTruthy()
    // The multiply is what makes it read as a tint OF the hero rather than a
    // sheet on it; without it the bar is a flat block over the artwork.
    expect(veil.className).toMatch(/mix-blend-multiply/)
    // A raw CSS colour in an inline style, never a Tailwind utility: v4 emits
    // no CSS and no error for an unregistered colour utility.
    expect(veil.getAttribute('style') ?? '').toMatch(/background-color/i)
    // It may not eat the taps meant for the back disc and the More badge.
    expect(veil.className).toMatch(/pointer-events-none/)
  })

  it('renders the bar AFTER the artwork, or it is invisible', () => {
    const { container } = renderPage()
    const art = container.querySelector('[data-name="hero-wave-art"]')
    const bar = container.querySelector('[data-name="app-header-bar"]')
    expect(art).toBeTruthy()
    expect(bar).toBeTruthy()
    // DOCUMENT_POSITION_FOLLOWING === 4: the bar follows the artwork.
    expect(art.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('does not pass px-0 to the hero seat', () => {
    const { container } = renderPage()
    const bar = container.querySelector('[data-name="app-header-bar"]')
    expect(bar.className).not.toMatch(/(^|\s)px-0(\s|$)/)
    // The chip's own padding survived the merge.
    expect(bar.className).toMatch(/px-\[8px\]/)
  })

  it('keeps the back disc and the More badge reachable', () => {
    const { container } = renderPage()
    const bar = container.querySelector('[data-name="app-header-bar"]')
    // The More badge is always drawn; the back disc only where there is a
    // parent scope to go back to, which is what the page passes `onBack` for.
    expect(bar.querySelector('[data-name="app-more"]')).toBeTruthy()
    if (SYS.parentName) expect(bar.querySelector('[data-name="app-back"]')).toBeTruthy()
  })

  it('still owns exactly one scroll container, with the bar inside it', () => {
    const { container } = renderPage()
    /* The scroller is addressed by its NODE ID, not by a computed style.
       happy-dom does not reflect `style={{ overflowY: 'auto' }}` back through
       the CSSOM or the style attribute in a form worth matching on — which is
       also why tabBarFloatingClearance.dom.test.jsx reads the source text for
       the same question. 200013:91527 is the one element this page gives
       flex:1 / overflowY:auto / minHeight:0. */
    const scrollers = container.querySelectorAll('[data-node-id="200013:91527"]')
    expect(scrollers).toHaveLength(1)
    const bar = container.querySelector('[data-name="app-header-bar"]')
    expect(scrollers[0].contains(bar)).toBe(true)
  })

  /* ── THE CALM SYSTEM — the regression this gate exists for ───────────────
     `surfaceTint` is the RED hero's tint and 200059:35848 is the alert state;
     there is no calm node for this screen. A calm system draws HeroWaveArt's
     `calm` BLUE raster, so seating the same red veil on it would multiply red
     over blue — a colour nobody designed, on the state that is most of the
     fleet. The bar stays on the page ground there, which is what shipped
     before this frame and what still ships. */
  it('leaves a calm system on the ground surface, with no veil', () => {
    const { container } = renderPage(CALM.id)
    const bar = container.querySelector('[data-name="app-header-bar"]')
    expect(bar).toBeTruthy()
    expect(bar.getAttribute('data-surface')).toBe('ground')
    expect(container.querySelector('[data-name="app-header-veil"]')).toBeNull()

    // On the ground seat the page's own `px-0` is back, and the bar is OUTSIDE
    // the hero rather than inside its coloured section.
    expect(bar.className).toMatch(/(^|\s)px-0(\s|$)/)
    const colour = container.querySelector('[data-name="hero-card-colour"]')
    if (colour) expect(colour.contains(bar)).toBe(false)
  })

  it('paints the calm hero blue, not the red raster', () => {
    const { container } = renderPage(CALM.id)
    const art = container.querySelector('[data-name="hero-wave-art"]')
    expect(art?.getAttribute('data-tone')).not.toBe('alert')
  })

  it('never uses a viewport-height root', () => {
    const { container } = renderPage()
    expect(container.innerHTML).not.toMatch(/min-h-screen|h-screen/)
  })
})

/**
 * ── THE FULL-BLEED HERO AND THE OVERLAPPING EVENT CARD ──────────────────────
 * Figma 200059:35848, reinstated 2026-11-09 after the owner compared the
 * running app with the frame: "Layout and components completely doesn't look
 * as in Figma."
 *
 * Three things here fail silently and each has cost this repo a round trip:
 *
 *   1. A WIDTH LITERAL. The shell is 393 and the frame is 402, so `w-[393px]`
 *      or `w-[402px]` anywhere in the bleed is wrong on one of them. The
 *      width must be computed: `-mx-4` + `self-stretch w-auto`.
 *   2. THE INVISIBLE SIDEWAYS SCROLL. A child bleeding past the scroller's
 *      CONTENT edge adds scrollable overflow that a negative right margin
 *      does not give back, and this scroller hides its scrollbars - so the
 *      page scrolls sideways and looks fine. The gutter therefore lives on
 *      the scroller, not the page root.
 *   3. THE OVERLAP ARITHMETIC. The hero pays 78px of red below the
 *      consumption copy and the card column is pulled back up over 65 of it.
 *      Two numbers in two files; if they drift the card either floats off the
 *      red or swallows the copy.
 */
describe('System page hero, full-bleed with an overlapping event card', () => {
  it('bleeds the hero past the gutter without writing a width', () => {
    const { container } = renderPage()
    const hero = container.querySelector('[data-name="hero-card-shell"]')
    expect(hero).toBeTruthy()
    expect(hero.className).toMatch(/-mx-4/)
    expect(hero.className).toMatch(/self-stretch/)
    expect(hero.className).toMatch(/w-auto/)
    // `w-auto` has to WIN, or the shell's own w-full beats the stretch and
    // leaves a 16px strip of page ground down the right-hand side.
    expect(hero.className).not.toMatch(/(^|\s)w-full(\s|$)/)
    // The frame draws no radius on this hero at either edge.
    expect(hero.className).toMatch(/rounded-none/)
  })

  it('writes no shell or frame width anywhere on the page', () => {
    const { container } = renderPage()
    expect(container.innerHTML).not.toMatch(/\[393px\]|\[402px\]|\[370px\]|\[295px\]/)
  })

  it('keeps the 16px gutter on the scroller, not the page root', () => {
    const { container } = renderPage()
    const scroller = container.querySelector('[data-node-id="200013:91527"]')
    expect(scroller).toBeTruthy()
    // The bleed lands on the scroller's PADDING box, which adds no overflow.
    expect(scroller.className).toMatch(/px-4/)
    // And the root must not pay it a second time, or the cards narrow by 32.
    const root = container.querySelector('[data-node-id="200013:91524"]')
    expect(root).toBeTruthy()
    expect(root.className).not.toMatch(/(^|\s)px-4(\s|$)/)
  })

  it('gives the hero no white body on an event, and the event its own card', () => {
    const { container } = renderPage()
    const hero = container.querySelector('[data-name="hero-card-shell"]')
    expect(hero.getAttribute('data-hero-body')).toBe('false')
    expect(container.querySelector('[data-name="hero-card-body"]')).toBeNull()

    // The event card is a SIBLING of the hero now, in the card column.
    const ev = container.querySelector('[data-node-id="198379:80460"]')
    expect(ev).toBeTruthy()
    expect(hero.contains(ev)).toBe(false)
  })

  it('keeps the event card wrapper and its direct child, which two suites address', () => {
    const { container } = renderPage()
    // eventScreenWaterOnly.dom.test.jsx:194 and v2ControlsWired.dom.test.jsx:352
    // both reach the card through `[data-node-id="198379:80460"] > div`.
    const child = container.querySelector('[data-node-id="198379:80460"] > div')
    expect(child).toBeTruthy()
    expect(child.getAttribute('data-name')).toBe('hero-event')
  })

  it('pulls the card column up over the hero, with no z-index', () => {
    const { container } = renderPage()
    const content = container.querySelector('[data-name="system-content"]')
    expect(content).toBeTruthy()
    // 22 (the scroller's gap) + 65 (the node's overlap) — see the page.
    expect(content.className).toMatch(/-mt-\[87px\]/)
    // Positioned so it paints over the hero by document order...
    expect(content.className).toMatch(/(^|\s)relative(\s|$)/)
    // ...and NOT by a z-index, which would paint over the floating tab bar.
    expect(content.className).not.toMatch(/(^|\s)z-\d/)
    // The frame's gap between the event card and the stack.
    expect(content.className).toMatch(/gap-\[16px\]/)
  })

  it('leaves a calm system on the inset card with its white body', () => {
    const { container } = renderPage(CALM.id)
    const hero = container.querySelector('[data-name="hero-card-shell"]')
    expect(hero).toBeTruthy()
    // No bleed, no reset radius: the calm state has no node and must not be
    // guessed at from the event frame.
    expect(hero.className).not.toMatch(/-mx-4/)
    expect(hero.className).not.toMatch(/rounded-none/)
    const content = container.querySelector('[data-name="system-content"]')
    expect(content?.className ?? '').not.toMatch(/-mt-\[87px\]/)
  })
})

/**
 * ── THE STATUS BAND — Phone.jsx's seat, dropped so the hero fills it ────────
 * 200059:35849 puts NO background on the strip and paints the clock and
 * battery #1e2a3b: the frame runs the red artwork to the top edge, behind the
 * glyphs. `useStatusBarBleed` drops the in-flow 44px seat for that.
 *
 * What is asserted here is the page's HALF of the contract — the 44px it must
 * pay back, and the gate. The band itself is drawn by DesktopFrame and cannot
 * be seen from a happy-dom render or from a 393-wide viewport, so the pixel
 * is verified in a desktop browser instead; see the report.
 */
describe('System page status-band bleed', () => {
  it("pays the band back from the shell own reported number, not a mirrored predicate", () => {
    const { container } = renderPage()
    const seat = container.querySelector('[data-name="system-hero-header"]')
    expect(seat).toBeTruthy()

    /* `useStatusBarBleed().inset + 11` as an inline paddingTop. Outside
       Phone.jsx there is no StatusBarContext, so `inset` is 0 and the node's
       own 11 is the whole inset — which is also exactly what MobileLayout
       gets, since it draws no band. */
    expect(seat.style.paddingTop).toBe('11px')

    /* ⚠ THE MIRROR IS GONE AND MUST NOT COME BACK. These two spellings
       re-derived Phone.jsx's private `innerWidth <= 500 || mobile UA` rule by
       keying on the class MobileLayout happens to render, with the 44
       hard-coded as 55 minus 11. The shell reports it now. */
    expect(seat.className).not.toMatch(/pt-\[55px\]/)
    expect(seat.className).not.toMatch(/mobile-shell/)
    expect(container.innerHTML).not.toMatch(/mobile-shell/)
  })

  it('does not pay it on a calm system, which keeps the seat', () => {
    const { container } = renderPage(CALM.id)
    const seat = container.querySelector('[data-name="system-hero-header"]')
    // A calm system seats its bar on the page ground, so there is no hero
    // header slot at all — and nothing has been pushed up to pay back.
    if (seat) {
      expect(seat.className).not.toMatch(/pt-\[55px\]/)
      expect(seat.className).not.toMatch(/mobile-shell/)
    } else {
      expect(container.querySelector('[data-name="app-header-bar"]')).toBeTruthy()
    }
  })
})

/**
 * ── THE EVENT CARD'S TITLE TAKES THE SHORT FORM ─────────────────────────────
 * 200059:35901's string is `High flow event` in a ONE-LINE 170px box at
 * 24px/-0.6. `alertCardsFor` asked `eventAlertRow` for `titleForm: 'full'`,
 * which resolves to `alert.label` ("High Flow Water Event") and rendered
 * `High Flow Wat…` against AlertCard's `mobile-compact` variant.
 *
 * Whether it FITS is a layout fact and is measured in a real browser; what is
 * pinned here is the contract that makes the fit possible and keeps the
 * control nameable.
 */
describe('System page event card title', () => {
  it('draws the node’s short title, not the canonical label', () => {
    const { container } = renderPage()
    const card = container.querySelector('[data-node-id="198379:80460"]')
    expect(card).toBeTruthy()
    const text = card.textContent ?? ''
    // The short form the node spells.
    expect(text).toMatch(/High flow event|Low flow event/)
    // And NOT the long one, which is what overflowed the measure.
    expect(text).not.toMatch(/High Flow Water Event|Low Flow Water Event/)
  })

  /* ── THE FORM IS SPLIT AT THE TWO CALL SITES ─────────────────────────────
     The card DRAWS the node's short title; the overlaid opener is NAMED with
     the canonical label. That is what `eventAlertRow` returns both for - its
     own comment: "the hero's dialog needs it for its accessible name even when
     the card draws the short one" - and three cases in
     v2ControlsWired.dom.test.jsx address this control by
     `Open ${sys.alert.label}`.

     ⚠ A WCAG 2.5.3 TENSION RIDES ON THIS and is flagged, not resolved: Label
     in Name asks the accessible name to CONTAIN the visible label, and
     "Open Low Flow Water Event" does not contain "Low flow event". Pinned here
     so that whichever way the owner rules, the change is deliberate. */
  it('names the opener with the canonical label, not the short title', () => {
    const { container } = renderPage()
    const card = container.querySelector('[data-node-id="198379:80460"]')
    const opener = card.querySelector('button[aria-label^="Open "]')
    expect(opener).toBeTruthy()
    const name = opener.getAttribute('aria-label')
    // The canonical form, which is what `alert.label` resolves to.
    expect(name).toMatch(/^Open (High|Low) Flow Water Event$/)
    // And the card still SHOWS the short one.
    expect(card.textContent).toMatch(/(High|Low) flow event/)
  })
})
