// @vitest-environment happy-dom
/**
 * The simulated status band — Phone.jsx + phoneStatusBar.js.
 *
 * WHAT THIS FILE IS FOR. The owner compared the running app to the 2026-11
 * frames and called the upper screen wrong: every frame runs the coloured hero
 * to the TOP EDGE of the screen, behind the clock and battery, and this shell
 * could not express that. The band was a `flexShrink: 0` flex SIBLING ABOVE the
 * route and the frame is `overflow: hidden`, so a page reaching up with a
 * negative margin painted OVER the glyphs instead of behind them.
 *
 * The band is now a SEAT (in flow, reserves the height, keeps every route where
 * it is) plus GLYPHS (an absolute overlay, last in DOM, no background). A
 * screen opts into dropping the seat with `useStatusBarBleed`.
 *
 * ── WHAT THIS FILE ACTUALLY PINS, AND WHAT IT CANNOT ──────────────────────
 * happy-dom performs NO LAYOUT: every clientHeight and getBoundingClientRect
 * here is 0, so "the route starts at y=0" cannot be asserted in this
 * environment - `0 === 0` passes on the broken code too, and a test that
 * cannot fail is worse than no test. frameClipping.dom.test.jsx says the same
 * thing about widths and for the same reason.
 *
 * So this file pins the STRUCTURE that the geometry follows from:
 *   · the default renders the seat, so nothing moves;
 *   · bleeding removes the seat, which is the only thing that moves a route;
 *   · the glyphs come AFTER the route in DOM order, which is what paints the
 *     clock above a bleeding hero;
 *   · no z-index anywhere, which is what keeps the drawer and the sheets above
 *     the clock exactly as they were above the old in-flow strip;
 *   · the ink is per-screen, because the two frames disagree about it.
 * The measured geometry lives in the browser pass, not here.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import Phone from '@/components/Phone'
import { ThemeProvider } from '@/context/ThemeContext'
import { STATUS_BAR_HEIGHT, useStatusBarBleed } from '@/components/phoneStatusBar'

afterEach(cleanup)

const seat = (c) => c.querySelector('[data-name="phone-status-seat"]')
const glyphs = (c) => c.querySelector('[data-name="phone-status-glyphs"]')
/** The bezel: the only element carrying the handset's 393px declared width. */
const bezelOf = (c) => [...c.querySelectorAll('div')].find((d) => parseFloat(d.style.width) === 393)

/** A screen that asks for the bleed, exactly as a real page would. */
function BleedingScreen({ ink }) {
  useStatusBarBleed({ bleed: true, ink })
  return <div data-testid="screen" />
}

const mount = (child = <div data-testid="screen" />) =>
  render(<ThemeProvider><Phone>{child}</Phone></ThemeProvider>)

describe('the status band reserves its seat by default, so no screen moves', () => {
  /* THE PROPERTY THE WHOLE CHANGE IS HELD TO. There are 17+ screens on this
     shell and none of them was edited: a route that calls no hook must render
     what it rendered before the seat/glyphs split existed. */
  it('renders the seat at the band height, in flow, for a screen that asks nothing', () => {
    const { container } = mount()
    const s = seat(container)

    expect(s, 'the default band seat is gone - every route just moved up 44px').toBeTruthy()
    expect(parseFloat(s.style.height)).toBe(STATUS_BAR_HEIGHT)
    expect(STATUS_BAR_HEIGHT).toBe(44)
    /* IN FLOW is the whole job of this element. A `position` on it would stop
       it reserving anything and every screen would shift up. */
    expect(s.style.position || 'static').toBe('static')
    expect(s.style.flexShrink).toBe('0')
    /* It paints the band colour; the glyph overlay must NOT. */
    expect(s.style.background, 'the seat stopped carrying the theme band colour').toBeTruthy()
    /* It is chrome, not content. */
    expect(s.getAttribute('aria-hidden')).toBe('true')
    expect(s.textContent).toBe('')
  })

  it('still draws the clock and the battery', () => {
    const { container } = mount()
    const g = glyphs(container)
    expect(g).toBeTruthy()
    expect(g.textContent).toContain('9:41')
    expect(g.textContent).toContain('100%')
    expect(g.querySelectorAll('svg')).toHaveLength(2)
  })

  /* ⚠ THE GLYPH OVERLAY MUST NOT EAT TAPS. It spans the full width of the
     frame, and once a hero bleeds under it that band contains real page
     content. Without `pointer-events: none` every control in the top 44px
     stops answering while a screenshot looks perfect - the same invisible
     dead-tap the header veil and the tab bar's strip both caused. */
  it('lets taps through the glyph overlay', () => {
    const { container } = mount()
    expect(glyphs(container).style.pointerEvents).toBe('none')
  })
})

describe('a screen can paint behind the glyphs, and only that screen', () => {
  it('drops the seat when a screen asks to bleed', () => {
    const { container } = mount(<BleedingScreen />)
    expect(seat(container), 'the seat survived the bleed, so the hero still cannot reach the top').toBeNull()
    /* The glyphs stay - the clock does not disappear with the seat. */
    expect(glyphs(container)).toBeTruthy()
    expect(glyphs(container).textContent).toContain('9:41')
  })

  /* ⚠ THE RESET IS WHAT KEEPS THE OTHER 17 SCREENS SAFE. Without the unmount
     cleanup, every screen navigated to after a bleeding one would inherit the
     bleed and start 44px too high - the exact regression this mechanism exists
     to avoid, and it would only show up two routes later. */
  it('restores the seat when the bleeding screen unmounts', () => {
    const { container, rerender } = render(
      <ThemeProvider><Phone><BleedingScreen /></Phone></ThemeProvider>,
    )
    expect(seat(container)).toBeNull()

    rerender(<ThemeProvider><Phone><div data-testid="screen" /></Phone></ThemeProvider>)
    expect(seat(container), 'the next screen inherited the bleed and starts 44px too high').toBeTruthy()
    expect(parseFloat(seat(container).style.height)).toBe(STATUS_BAR_HEIGHT)
  })

  /* ── THE INK IS PER-SCREEN BECAUSE THE FRAMES SAY SO ───────────────────
     200067:38971 (Home) paints the clock and battery `white`; 200059:35849
     (System) paints them `#1e2a3b`. Structurally the two strips are identical
     and this is their only difference, so a single shell constant cannot serve
     both. Pinned because the briefing note for this change asserted the
     opposite - that the glyphs "stay DARK and are not inverted to white" -
     which is true of System and false of Home. */
  it('takes the ink from the screen, on the text and on both glyphs', () => {
    const { container } = mount(<BleedingScreen ink="rgb(255, 255, 255)" />)
    const g = glyphs(container)

    expect(g.style.color).toBe('rgb(255, 255, 255)')
    /* NOT just the text: the signal bars and the battery are `fill`, and an
       ink that only reaches the clock leaves half the band the wrong colour. */
    const fills = [...g.querySelectorAll('rect, path, circle')].map((n) => n.getAttribute('fill'))
    expect(fills.length).toBeGreaterThan(0)
    for (const f of fills) expect(f).toBe('rgb(255, 255, 255)')
  })

  it('falls back to the status-bar ink token when a screen names no ink', () => {
    const { container } = mount(<BleedingScreen />)
    const g = glyphs(container)
    /* NO HEX FALLBACK, deliberately - src/index.css's header explains why a
       `var(--x, #hex)` second source of truth wins silently when the token is
       missing. This file fails loudly instead. */
    expect(g.querySelector('rect').getAttribute('fill')).toBe('var(--status-bar-ink)')
  })
})

/* ── THE SCRIM — A LIVE AA FAILURE, FIXED 2026-11-09 ───────────────────────
   Home adopted the bleed with `ink: var(--ink-on-color)` and the white glyphs
   landed on HeroWaveArt's pale right-hand highlight. Measured, composited, at
   1280x900 where DesktopFrame draws:

     clock "9:41" (left)        4.78 - 4.96   passed
     signal / wifi / "100%"     3.07 - 3.20   FAILED, 504/504 samples

   The glyphs are 14px/600 and WCAG's large-text exemption starts at 18.66px
   bold, so the bar is 4.5:1.

   ⚠ NOTHING IN THIS FILE CAN PROVE THE FIX. Contrast is a property of the
     COMPOSITE, and happy-dom composites nothing - the numbers above and after
     come from decoding rendered pixels in Chromium. What is pinned here is the
     structure the composite depends on, and above all that the scrim does NOT
     appear on a non-bleeding screen, because that would repaint all 17+. */
const scrim = (c) => c.querySelector('[data-name="phone-status-scrim"]')

describe('the glyph scrim carries AA, and only where it is asked for', () => {
  /* THE ONE THAT MATTERS MOST. With the seat in place the band is
     `theme.statusBarBg` and the default must reproduce today exactly. A scrim
     there would darken the top 44px of every screen in the app. */
  it('is absent on a screen that did not ask to bleed', () => {
    const { container } = mount()
    expect(scrim(container), 'the scrim leaked onto the default band - every screen just darkened').toBeNull()
  })

  it('appears for a bleeding screen, and lets taps through', () => {
    const { container } = mount(<BleedingScreen ink="rgb(255, 255, 255)" />)
    const s = scrim(container)
    expect(s).toBeTruthy()
    expect(s.style.position).toBe('absolute')
    expect(parseFloat(s.style.height)).toBe(STATUS_BAR_HEIGHT)
    expect(s.style.pointerEvents).toBe('none')
    expect(s.getAttribute('aria-hidden')).toBe('true')
    /* It is a gradient, not a flat fill: a flat fill at the alpha this needs
       reads as a hard bar across the top of the hero. */
    expect(s.style.background).toMatch(/linear-gradient/)
  })

  /* ── THE SCRIM HAS A DIRECTION ─────────────────────────────────────────
     A scrim pushes the backdrop AWAY from the ink, so the polarity has to
     follow the ink rather than always darken. The first version only darkened,
     which was right for Home's white glyphs and actively HARMFUL for the
     System page's dark ones - that screen passed at 4.77:1 over its red hero
     and a 0.40 darkening scrim would have pushed it under 4.5.

     Measured in Chromium after the fix, composited, both glyph groups:
       Home,   white ink, darken  right cluster 3.07-3.20 FAIL -> 5.16-6.85 PASS
       System, dark ink,  lighten right cluster 5.43-5.46 PASS -> 6.24-6.76 PASS

     The polarity is read off the RENDERED colour through a canvas, because
     `--ink-on-color` computes as oklch and cannot be parsed as rgb. happy-dom
     has no real colour pipeline, so what is asserted here is that the two inks
     select DIFFERENT polarities - the ratios themselves come from the browser
     pass. */
  it('darkens under light ink and lightens under dark ink', () => {
    const light = mount(<BleedingScreen ink="rgb(255, 255, 255)" />)
    expect(scrim(light.container).dataset.scrimPolarity).toBe('darken')
    cleanup()

    const dark = mount(<BleedingScreen ink="rgb(29, 41, 61)" />)
    expect(
      scrim(dark.container).dataset.scrimPolarity,
      'a darkening scrim under dark ink pushes the backdrop TOWARDS the ink',
    ).toBe('lighten')
  })

  /* ⚠ ORDER: route -> scrim -> glyphs, by DOM position and nothing else. If the
     scrim ever lands AFTER the glyphs it dims the clock it exists to make
     legible; if it is made a CHILD of the glyph overlay it paints over both
     spans, because absolutely positioned children paint after static flex
     items. Neither failure changes a single class name. */
  it('sits under the glyphs and over the route, with no z-index anywhere', () => {
    const { container } = mount(<BleedingScreen />)
    const bezel = bezelOf(container)
    const s = scrim(container)
    const g = glyphs(container)

    expect(s.parentElement, 'the scrim became a child of the glyph overlay').toBe(bezel)
    expect(s.style.zIndex || '').toBe('')
    const kids = [...bezel.children]
    expect(kids.indexOf(s)).toBeLessThan(kids.indexOf(g))
    expect(kids[kids.length - 1], 'the glyphs are no longer last').toBe(g)

    const screen = container.querySelector('[data-testid="screen"]')
    expect(
      s.compareDocumentPosition(screen) & Node.DOCUMENT_POSITION_PRECEDING,
      'the route no longer precedes the scrim',
    ).toBeTruthy()
  })
})

/* ── THE SHELL OWNS THE MOBILE/DESKTOP SIGNAL — ADDITIVE, 2026-11-09 ───────
   HomeAllAccounts and SystemHeroCard had both copied Phone's
   `innerWidth <= 500 || mobile UA` predicate inline, because a page must know
   whether a band is drawn before it pays the 44px back as padding, and
   `@/hooks/use-mobile` is the wrong predicate for it (`< 768`, so they
   disagree between 501 and 767). The hook now reports it. */
describe('useStatusBarBleed reports whether a band is drawn', () => {
  /* The hook's return is rendered INTO THE DOM rather than captured in a module
     variable. Reassigning an outer binding during render is a side effect and
     `react-hooks/globals` rejects it - rightly, since what it captures depends
     on when React happens to re-render. Reading it back off the element is also
     simply the honest thing for a DOM test. */
  function Reporter({ bleed }) {
    const r = useStatusBarBleed({ bleed })
    return (
      <div
        data-testid="screen"
        data-band-drawn={String(r.bandDrawn)}
        data-inset={String(r.inset)}
        data-band-height={String(r.statusBarHeight)}
      />
    )
  }
  const reported = (c) => {
    const d = c.querySelector('[data-testid="screen"]').dataset
    return { bandDrawn: d.bandDrawn === 'true', inset: Number(d.inset), statusBarHeight: Number(d.bandHeight) }
  }

  const widthWas = globalThis.innerWidth
  afterEach(() => { Object.defineProperty(window, 'innerWidth', { value: widthWas, configurable: true, writable: true }) })

  it('reports the band height and the inset a bleeding screen owes', () => {
    const { container } = render(<ThemeProvider><Phone><Reporter bleed /></Phone></ThemeProvider>)
    const seen = reported(container)
    expect(seen.statusBarHeight).toBe(STATUS_BAR_HEIGHT)
    expect(seen.bandDrawn).toBe(true)
    /* The number the page spells as `paddingTop: inset + 11`, so no page holds
       a 55 or a predicate of its own. */
    expect(seen.inset).toBe(STATUS_BAR_HEIGHT)
  })

  it('owes nothing when the screen is not bleeding', () => {
    const { container } = render(<ThemeProvider><Phone><Reporter bleed={false} /></Phone></ThemeProvider>)
    const seen = reported(container)
    /* The band is still DRAWN - it is just the seat, not an overlay over this
       screen's own paint - so the height is reported and the debt is zero. */
    expect(seen.bandDrawn).toBe(true)
    expect(seen.statusBarHeight).toBe(STATUS_BAR_HEIGHT)
    expect(seen.inset).toBe(0)
  })

  /* ⚠ MobileLayout DRAWS NO BAND. A page that paid the inset back there would
     open 44px of empty colour above its header - which is the exact bug the
     mirrored predicate existed to avoid, now answered by the shell. */
  it('reports no band on the mobile shell path', () => {
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true, writable: true })
    const { container } = render(<ThemeProvider><Phone><Reporter bleed /></Phone></ThemeProvider>)

    const seen = reported(container)
    expect(container.querySelector('.mobile-shell'), 'not on the mobile path').toBeTruthy()
    expect(seen.bandDrawn).toBe(false)
    expect(seen.statusBarHeight).toBe(0)
    expect(seen.inset).toBe(0)
    /* And nothing of the band is rendered there at all. */
    expect(seat(container)).toBeNull()
    expect(glyphs(container)).toBeNull()
    expect(scrim(container)).toBeNull()
  })

  /* The synchronous initialiser in Phone's useIsMobile is what makes the line
     above true on the FIRST render. It used to be `useState(false)`, which
     painted DesktopFrame for one frame at a phone width - cosmetic while
     nothing read it, a wrong first LAYOUT now that a page sizes padding from
     this number. */
  it('is right on the first render, not one frame later', () => {
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true, writable: true })
    const { container } = render(<ThemeProvider><Phone><Reporter bleed /></Phone></ThemeProvider>)
    expect(reported(container).bandDrawn, 'the shell reported a band on first paint at 390px').toBe(false)
  })
})

describe('the band does not disturb what Phone.jsx already guarantees', () => {
  /* ── THE 18px BUG LIVED IN THIS FILE ──────────────────────────────────
     `boxSizing: content-box` is what makes 393 the SCREEN and not the handset;
     without it the 9px bezel ate 17px and every page was clipped for days.
     Re-asserted here because this change edits the same element's children and
     frameClipping.dom.test.jsx is the only other thing watching it. */
  it('keeps the 393 screen, the bezel and the clip', () => {
    const { container } = mount()
    const bezel = bezelOf(container)
    expect(bezel).toBeTruthy()
    expect(bezel.style.boxSizing, 'the 18px clipping bug is back').toBe('content-box')
    expect(parseFloat(bezel.style.borderLeftWidth || bezel.style.border)).toBe(9)
    expect(bezel.style.overflow).toBe('hidden')
    /* The overlay is positioned against this element, so it must stay the
       containing block. */
    expect(bezel.style.position).toBe('relative')
  })

  /* ⚠ NO z-index, ON ANY OF THEM. A positive z-index on the glyphs would put
     the clock on top of every sheet and drawer in the app; this repo's hardest
     tiering rule is that a positive z-index paints after every auto one
     REGARDLESS of DOM order. The overlay is ordered above the route by DOM
     position alone, which leaves the drawer (10/11) and the overlays (50/300)
     covering it exactly as they covered the old in-flow strip. */
  it('orders the glyphs by DOM position, never by z-index', () => {
    const { container } = mount()
    const bezel = bezelOf(container)
    const g = glyphs(container)

    expect(g.style.position).toBe('absolute')
    expect(g.style.zIndex || '').toBe('')
    expect(bezel.style.zIndex || '').toBe('')

    /* AFTER the route, not before. This is the ordering the fix turns on: a
       positioned element paints after its stacking context's static and auto-z
       content in DOM order, so the clock lands above a bleeding hero only
       while it stays last. */
    const kids = [...bezel.children]
    expect(kids[kids.length - 1], 'the glyphs are no longer last - a bleeding hero now covers the clock').toBe(g)
    const screen = container.querySelector('[data-testid="screen"]')
    expect(
      g.compareDocumentPosition(screen) & Node.DOCUMENT_POSITION_PRECEDING,
      'the route no longer precedes the glyphs',
    ).toBeTruthy()
  })

  /* The glyph overlay carries the clock and NOT the band colour - if it ever
     paints a background, a bleeding hero is hidden behind it again and the
     whole change silently reverts. Both frames' strips have no background. */
  it('paints no background on the glyph overlay', () => {
    const { container } = mount(<BleedingScreen />)
    const g = glyphs(container)
    expect(g.style.background || '').toBe('')
    expect(g.style.backgroundColor || '').toBe('')
  })
})
