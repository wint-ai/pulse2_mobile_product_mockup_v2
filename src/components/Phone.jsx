import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
/* The band's height, its context and the screens' opt-in hook. They live in
   their own module because this file default-exports a component and
   `react-refresh/only-export-components` is an error here - same split as
   tabBarMetrics.js beside TabBar.jsx. That file also carries the full rationale
   for the seat/glyphs split and the two status-strip nodes it came from. */
import { STATUS_BAR_HEIGHT, StatusBarContext } from './phoneStatusBar';

/**
 * ⚠ THIS PREDICATE IS THE ONE THAT DECIDES, AND IT IS NOT `@/hooks/use-mobile`.
 * That hook is `< 768`; this is `<= 500 || mobile UA`, and between 501 and 767
 * they disagree. Anything that needs to know whether a status band is drawn
 * must come through here - which is what `useStatusBarBleed`'s return value is
 * for. Two pages had copied this predicate inline because the shell gave them
 * no way to ask; see `phoneStatusBar.js`.
 */
function isMobileNow() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 500 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function useIsMobile() {
  /* SYNCHRONOUS INITIALISER, and it is a fix. It used to be `useState(false)`,
     so at a phone width the shell painted DesktopFrame - band and all - for one
     frame before the effect corrected it. That flash was cosmetic while nothing
     read the value; now that `useStatusBarBleed` reports a LAYOUT number off
     the same predicate, a wrong first paint is a wrong first layout, and a page
     would pay back 44px of inset for a band that is not there. */
  const [isMobile, setIsMobile] = useState(isMobileNow);
  useEffect(() => {
    const check = () => setIsMobile(isMobileNow());
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

function MobileLayout({ children, bgSolid }) {
  return (
    <>
      <style>{`
        .mobile-shell {
          width: 100vw;
          /* ── THE ORDER OF THESE SIX LINES IS THE WHOLE POINT ───────────────
             Least-capable FIRST, most-correct LAST. These are equal-specificity
             declarations of the same property, so the last one an engine
             understands is the one that wins:

               100vh                   the floor. Every engine has it, and on
                                       iOS it is the LARGE viewport - too tall
                                       whenever a toolbar is showing.
               -webkit-fill-available  the LEGACY FALLBACK, the pre-dvh
                                       workaround for exactly that. Kept
                                       because iOS before 15.4 has no dvh.
               100dvh                  the CORRECT MODERN VALUE: the dynamic
                                       viewport, which is what is actually
                                       visible while Safari's toolbars are out.

             ⚠ DO NOT "TIDY" -webkit-fill-available BACK TO LAST. It was last
               here until 2026-11-10, which is backwards: the legacy hack then
               overrode the modern value on every engine that supports both,
               and on iOS Safari -webkit-fill-available resolves to the LARGE
               viewport (toolbars retracted) where 100dvh resolves to the
               dynamic one. A shell taller than the visible area puts the
               tab-bar host and the last rows of the scroller behind the
               browser's bottom toolbar, where a tap reaches browser chrome
               rather than the page - the same invisible dead-tap shape as the
               tab-bar pill floating over live rows.

             ⚠ WHAT THIS ORDER IS NOT EVIDENCE FOR. No harness in this repo can
               see the difference. Desktop WebKit and Chromium have no browser
               toolbars, so all three declarations resolve to the SAME number
               there - measured before and after this reorder: 664px at
               390x664, 752px at 390x752, 844px at 390x844/402x844, 852px at
               393x852. So this is a correctness fix ON THE SPECIFICATION, not
               a confirmed diagnosis of any reported tap failure. Only a real
               handset can settle that, and nothing here should be written up
               as if it already had. */
          height: 100vh;
          height: -webkit-fill-available;
          height: 100dvh;
          max-height: 100vh;
          max-height: -webkit-fill-available;
          max-height: 100dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: ${bgSolid};
          position: fixed;
          top: 0;
          left: 0;
        }
      `}</style>
      <div className="mobile-shell">
        {children}
      </div>
    </>
  );
}

/**
 * The status-bar ink, read straight from the token layer.
 *
 * It used to come from the v1 theme object (src/context/ThemeContext.jsx:171),
 * which is frozen at rgb(15,23,43) under all four v2 themes -- that file is the
 * V1 theme engine and knows nothing about data-theme. On `dark` the band behind
 * these glyphs resolves to --app-bg over the near-black card, so "9:41", the
 * signal bars, the wifi arc and "100%" measured 1.06:1 against it. They were not
 * on the screen in any meaningful sense.
 *
 * ThemeContext is deliberately NOT extended: it is 449 lines of v1 machinery
 * carrying seven themes v2 does not use, and the tokenization plan is explicit
 * that v2 must not take a dependency on it. Phone.jsx is the one v2 route into
 * it, and reading the CSS variable directly is the smallest change that removes
 * the dependency for this value rather than deepening it.
 *
 * NO FALLBACK, ON PURPOSE. src/index.css's own header explains why: a
 * `var(--x, #hex)` fallback is a second, invisible source of truth that wins
 * silently whenever the token is missing. This file fails loudly instead. The
 * token owner declares --status-bar-ink; in `light` it has to resolve to
 * #0f172b, which is --slate-900 (the ramp step this literal always was), or the
 * frame stops being pixel-identical there.
 */
const STATUS_INK = 'var(--status-bar-ink)'

/**
 * The scrim behind the status glyphs on a BLEEDING screen. See the block at
 * its render site for why it exists and what it measured before and after.
 *
 * THE SHAPE IS CHOSEN FOR WHERE THE GLYPHS ARE, not for looks. The clock and
 * battery sit on the vertical centre of a 44px band, so the alpha is HELD flat
 * through the top 58% and only fades below it. A gradient that peaks at the
 * top edge and falls away through the middle - the obvious "soft top vignette"
 * - is weakest exactly where the text is, and buys less contrast per unit of
 * darkening than this does.
 *
 * 0.52 IS MEASURED, not a round number, and it is deliberately DEEPER THAN THE
 * REQUIREMENT. Tuned by injecting candidates and decoding the composited pixels
 * under both glyph groups.
 *
 * ── THE REGION QUESTION, SETTLED ──────────────────────────────────────────
 * Two independent instruments measured this scrim and disagreed: 5.16 against
 * 4.11 on the right-hand cluster. Their MAXIMA matched exactly (6.85), so both
 * were reading the same band; the difference was WHICH PIXELS COUNT. One
 * sampled each glyph group's bounding box; the other padded 4px around it,
 * catching the lighter wave beside the glyphs.
 *
 * WHAT WCAG ACTUALLY BINDS is the contrast between text and the background it
 * is drawn ON. A span's bounding box is already a SUPERSET of the stroke area -
 * it includes every inter-letter and inter-line gap - and antialiasing spreads
 * a stroke edge by about 1px at 14px/600, not 4. Ground 4px clear of any stroke
 * is adjacent surface, not the text's background. So on the reading this file
 * considers correct, the binding figures are the unpadded and 1px-padded ones.
 *
 * MEASURED ACROSS BOTH READINGS, right-hand cluster, halo-free sampler:
 *
 *             pad 0    pad 1    pad 2    pad 4
 *   a 0.40     4.88     4.63     4.54     4.23 (170/2912 under 4.5)
 *   a 0.46     5.31      ~5.0    4.81     4.41 ( 72/2912 under 4.5)
 *   a 0.52     5.71      ~5.5    5.10     4.66 (  0/2912)
 *
 * 0.40 ALREADY PASSED the region this file argues for. 0.52 ships anyway,
 * because it clears the strict 4px reading too and the visual cost over 0.40 is
 * small - the band was already perceptibly darker than the hero at 0.40, and
 * 0.52 is an increment on that rather than a new artefact. Making the
 * disagreement moot is worth more than winning it, and the margin is the same
 * margin the moving-artwork note below asks for.
 *
 * ⚠ DO NOT GO DEEPER TO CHASE THE PALE WAVE. Returns are already flat: 0.40 to
 *   0.46 bought 0.18 of contrast at the pad-4 minimum. The pixels that resist
 *   are HeroWaveArt's near-white highlight, and the ceiling note below is the
 *   real answer for those - move the artwork or re-ink the screen.
 *
 * ⚠ WHAT IT CANNOT CARRY. At this alpha the scrim holds 4.5:1 for white ink
 *   over any backdrop up to roughly sRGB relative luminance 0.54. That covers
 *   the whole hero-blue range actually measured under the glyphs (worst
 *   #3e91f7, L about 0.27) with room to spare. It would NOT carry a
 *   near-white highlight such as #cde2fa (L about 0.74) - that needs about
 *   0.47 and reads as a bar. If a hero ever puts near-white under the battery,
 *   the answer is to move the artwork or re-ink that screen, not to deepen
 *   this further.
 *
 * ⚠ BOTH CEILINGS DEPEND ON WHERE THE ARTWORK HAPPENS TO SIT, AND NOTHING HERE
 *   CAN NOTICE IT MOVING. The System page's red alert raster runs to #a51114 at
 *   its darkest, and the band happens to sit on its LIGHT TOP (about #e87e8a) -
 *   which is the only reason dark ink measures comfortably there. A crop, a
 *   recolour, or a change of hero height slides a different part of that raster
 *   under the glyphs, and the same is true of HeroWaveArt's pale highlight on
 *   Home. The shell sees a colour string, never the composite, so these numbers
 *   are a snapshot of today's art and not a guarantee. Anyone changing a hero
 *   raster that a bleeding screen uses has to re-measure: the script is
 *   scrim-both.mjs in the scratchpad, and the method is the band under each
 *   glyph group's full bounding box, every 2px in x and y.
 *
 * `rgba(2,10,24,…)` rather than pure black: a slightly blue-black sits in the
 * hero's own family, so the darkening reads as part of the artwork rather
 * than as a grey wash laid over it.
 */
/**
 * ⚠ A SCRIM HAS A DIRECTION, AND GETTING IT WRONG IS WORSE THAN HAVING NONE.
 *
 * It exists to push the backdrop AWAY from the ink. Light ink wants a darker
 * band; dark ink wants a lighter one. The first version of this only ever
 * darkened, which was right for Home's white glyphs and actively harmful for
 * the System page's dark ones: that screen measured 4.77:1 over its red hero -
 * passing by 0.27 - and a 0.40 darkening scrim would have pushed it under 4.5.
 * The polarity is therefore derived from the ink, not assumed.
 *
 * Both share the shape tuned for the dark case: alpha HELD FLAT through the
 * top 58%, then faded. The glyphs sit on the band's vertical centre, so a
 * top-peaked vignette is weakest exactly where the text is.
 */
const STATUS_SCRIM_DARKEN =
  'linear-gradient(to bottom,'
  + ' rgba(2,10,24,0.52) 0%,'
  + ' rgba(2,10,24,0.52) 58%,'
  + ' rgba(2,10,24,0) 100%)'

/**
 * The lightening scrim, for DARK ink.
 *
 * 0.22 and not 0.40: dark ink over the System hero already clears 4.5:1 on its
 * own, so this buys margin rather than rescuing a failure, and it only has to
 * be deep enough to survive the artwork moving. A white veil over a saturated
 * red is far more conspicuous per unit of alpha than a blue-black one over blue,
 * so the smallest alpha that holds the measured headroom is the right one.
 *
 * Near-white rather than pure white, for the same reason the darkening scrim is
 * blue-black rather than black: `rgba(255,252,250,…)` keeps a trace of the
 * hero's warmth so the band reads as lit rather than as a grey film.
 */
const STATUS_SCRIM_LIGHTEN =
  'linear-gradient(to bottom,'
  + ' rgba(255,252,250,0.22) 0%,'
  + ' rgba(255,252,250,0.22) 58%,'
  + ' rgba(255,252,250,0) 100%)'

/**
 * WCAG 2.x relative luminance of an 8-bit sRGB triple. Used only to choose the
 * scrim's polarity, which is a one-bit decision, so the exact value matters far
 * less than which side of the middle it falls on.
 */
function relativeLuminance(r, g, b) {
  const ch = (v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}

/**
 * Resolve a rendered `color` to sRGB and say whether it is light ink.
 *
 * ⚠ IT GOES THROUGH A CANVAS, AND THAT IS NOT OPTIONAL. `--ink-on-color` is
 *   authored in oklch and Chromium keeps oklch as the COMPUTED value of
 *   `color`, so there is nothing to parse with a regex - an earlier version of
 *   the measuring script read "0.98761 0.0017 247.839" as an RGB triple and
 *   reported contrast ratios in the millions. Canvas2D accepts modern colour
 *   syntax and hands back 8-bit sRGB.
 *
 * `fillStyle` is primed with a known value first: assigning an unparseable
 * colour to it is a silent no-op that leaves the PREVIOUS fill in place, so
 * without the prime a bad `ink` would be mistaken for whatever came before.
 */
function inkIsLight(cssColor) {
  /* FAST PATH: a plain `rgb()` / `rgba()` serialisation needs no canvas at all.
     Worth having on its own merits - it is the common case and costs nothing -
     and it is also the only path a DOM test environment can follow, since
     happy-dom has no real colour pipeline and its canvas returns nothing. */
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(String(cssColor || '').trim())
  if (m) return relativeLuminance(Number(m[1]), Number(m[2]), Number(m[3])) > 0.5

  /* ⚠ EVERYTHING ELSE GOES THROUGH A CANVAS, AND THAT IS NOT OPTIONAL.
     `--ink-on-color` is authored in oklch and Chromium keeps oklch as the
     COMPUTED value of `color`, so there is nothing to parse - an earlier
     version of the measuring script read "0.98761 0.0017 247.839" as an RGB
     triple and reported contrast ratios in the millions. Canvas2D accepts
     modern colour syntax and hands back 8-bit sRGB. */
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (!ctx) return true
    /* Primed with a known value first: assigning an unparseable colour to
       `fillStyle` is a silent no-op that leaves the PREVIOUS fill in place, so
       without the prime a bad `ink` would be mistaken for whatever came
       before. */
    ctx.fillStyle = '#000000'
    ctx.fillStyle = cssColor
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return relativeLuminance(r, g, b) > 0.5
  } catch {
    /* An environment that refuses the canvas read gets the darkening scrim.
       That is the wrong polarity for dark ink, so it is a real (if remote)
       failure mode rather than a safe default - recorded here rather than
       hidden. It is narrow: no scrim renders at all unless a screen opted into
       bleeding, and both screens that do pass an ink that resolves above. */
    return true
  }
}

/**
 * RULING ON THE DESKTOP SURROUND (#DDE1E8) AND THE BEZEL (#0D0D0D).
 *
 * Both stay frozen, and that is a decision rather than an omission.
 *
 * Neither is app surface. This component simulates a physical handset sitting
 * on a desk: the bezel is the device's own plastic and the surround is the page
 * the reviewer is looking at the device ON. The in-app theme is a property of
 * what is INSIDE the screen, so propagating it outward would be a category
 * error -- switching the app to dark does not repaint your desk, and a review
 * page that inverts around the artefact makes two variables move at once in
 * exactly the comparison the page exists to support.
 *
 * The brief is right that #0D0D0D is benign on dark and arbitrary on sand and
 * contrast. It is arbitrary in the sense that any bezel colour would be; it is
 * not arbitrary in the sense of being an unthemed app token, because there is
 * no app token for "the colour of a phone". Same for the surround.
 *
 * What WOULD be defensible later, and is deliberately not done here because it
 * is out of this change's scope and cannot be verified from a headless browser
 * that reports light: keying the surround to `prefers-color-scheme`, i.e. to
 * the REVIEWER's environment rather than to the app's theme. That is the right
 * axis for review chrome. The in-app theme is not.
 *
 * Note this block is desktop-only. On a real phone MobileLayout runs instead
 * and there is no surround and no bezel to colour.
 */
/**
 * The clock and the battery, and nothing else.
 *
 * Extracted so the seat and the glyphs cannot drift apart: the markup below is
 * byte-for-byte what the in-flow strip drew, with `background` removed (the
 * seat carries that now) and `ink` injected where the literal was.
 */
function StatusGlyphs({ ink, elRef }) {
  return (
    <div
      ref={elRef}
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: STATUS_BAR_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        fontSize: 14,
        fontWeight: 600,
        color: ink,
        /* THE BAND MUST NOT EAT TAPS. It spans the full width of the frame, so
           without this every control in the top 44px - and with a bleeding
           hero that now includes real page content - would stop answering while
           a screenshot looked perfect. Same invisible dead-tap the header veil
           and the tab bar's strip both caused. */
        pointerEvents: 'none',
      }}
      data-name="phone-status-glyphs"
    >
      <span>9:41</span>
      <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <rect x="0" y="4" width="3" height="8" rx="1" fill={ink}/>
          <rect x="4.5" y="2.5" width="3" height="9.5" rx="1" fill={ink}/>
          <rect x="9" y="0.5" width="3" height="11.5" rx="1" fill={ink}/>
          <rect x="13.5" y="0" width="2" height="12" rx="1" fill={ink} opacity="0.3"/>
        </svg>
        <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
          <path d="M7.5 2C9.8 2 11.8 3 13.2 4.7L14.5 3.2C12.7 1.2 10.2 0 7.5 0S2.3 1.2.5 3.2L1.8 4.7C3.2 3 5.2 2 7.5 2Z" fill={ink}/>
          <path d="M7.5 5C9 5 10.3 5.6 11.3 6.6L12.6 5.1C11.2 3.8 9.4 3 7.5 3S3.8 3.8 2.4 5.1L3.7 6.6C4.7 5.6 6 5 7.5 5Z" fill={ink}/>
          <circle cx="7.5" cy="10" r="2" fill={ink}/>
        </svg>
        <span>100%</span>
      </span>
    </div>
  );
}

function DesktopFrame({ children, theme, bleed, ink }) {
  /* ── WHICH WAY DOES THE SCRIM PUSH? ───────────────────────────────────────
     Read back the ink the glyph overlay ACTUALLY RENDERS, rather than trying
     to interpret the `ink` string: the page passes `var(--ink-on-color)` or
     `var(--color-slate-800)`, and only the element knows what those resolve to
     under the active theme.

     `useLayoutEffect`, so the polarity is settled before the first paint -
     React flushes state set from a layout effect synchronously, so the initial
     value below is never painted and there is no one-frame flash of the wrong
     scrim. Re-runs when `ink` changes, which is how a route switch between a
     white-ink and a dark-ink screen is picked up. */
  const glyphsRef = useRef(null)
  const [lightInk, setLightInk] = useState(true)
  useLayoutEffect(() => {
    const el = glyphsRef.current
    if (!el) return
    setLightInk(inkIsLight(getComputedStyle(el).color))
  }, [ink, bleed])

  return (
    <div className="flex items-start justify-center min-h-screen p-6" style={{ background: '#DDE1E8' }}>
      <div style={{
        /* 393x852 IS THE SCREEN, NOT THE HANDSET — `boxSizing: content-box`
           is what makes that true, and it is a bug fix.

           Tailwind's preflight sets `box-sizing: border-box` on *, so under
           the inherited default this 393 was the OUTSIDE of the bezel and the
           9px border ate into it from both sides: `clientWidth` measured 376,
           not 393. Every page in this repo is transcribed from a 393-wide
           Figma frame, so every page was handed 17px less than it was drawn
           for and the right edge of each screen was silently clipped by
           `overflow: hidden` below -- "Show all" rendered as "Show", the
           third fault tile as "No powe", event rows cut mid-address.

           It read as a scroll bug and was not one: because the bezel clips
           rather than scrolls, a probe that sets `scrollLeft` and reads it
           back gets 0. The assertion that catches it is
           `scrollWidth <= clientWidth` -- see
           src/__tests__/frameClipping.dom.test.jsx.

           content-box over `width: 411` deliberately: the number a reader
           needs to recognise here is 393, the Figma frame. The handset's
           outer 411x870 is an implementation detail of the bezel. */
        boxSizing: 'content-box',
        width: 393, height: 852,
        background: theme.phoneBg,
        borderRadius: 46,
        border: '9px solid #0D0D0D',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 20px 60px rgba(0,0,0,.25)',
        flexShrink: 0,
        zoom: 1.08,
      }}>
        {/* THE SEAT. In flow, so it is what keeps every route exactly where it
            already is - dropping it is the whole of what `bleed` does. It
            carries `theme.statusBarBg` because that is the band's colour on the
            themes that have one (`#fff` on light, `#111` on midnight); the
            active WINT theme already sets it `transparent`, which is why the
            band currently shows `phoneBg` through it.

            `aria-hidden` and no content: the glyphs live in the overlay. */}
        {!bleed ? (
          <div
            style={{
              height: STATUS_BAR_HEIGHT,
              flexShrink: 0,
              background: theme.statusBarBg,
            }}
            aria-hidden="true"
            data-name="phone-status-seat"
          />
        ) : null}
        {children}
        {/* ── THE SCRIM — AN ACCESSIBILITY FIX, NOT A STYLE CHOICE ──────────
            ONLY WHEN BLEEDING. With the seat in place the band is
            `theme.statusBarBg` and the default must reproduce today exactly, so
            a scrim there would repaint all 17+ screens. It appears only for the
            screen that asked to paint its own artwork under the glyphs.

            WHY IT EXISTS. Home adopted the bleed with `ink:
            var(--ink-on-color)` and the white glyphs then sat on HeroWaveArt's
            pale right-hand highlight. Measured, composited, at 1280x900:

              clock "9:41" (left)        4.78 - 4.96   passes
              signal / wifi / "100%"     3.07 - 3.20   FAILS, 504/504 samples

            These glyphs are 14px/600. WCAG's large-text exemption starts at
            18.66px bold, so the bar is 4.5:1 and there is no reading of 1.4.3
            that lets 3.07 stand.

            ⚠ THE FRAMES HAVE THE SAME DEFECT AND ARE NOT THE AUTHORITY HERE.
              200067:38971 draws white glyphs over this same artwork. A static
              frame cannot show a contrast failure, so the frame is evidence of
              intent, not of legibility.

            WHY A SCRIM RATHER THAN RE-INKING. It costs no page anything, it
            keeps the frames' white ink, and it is the standard platform
            treatment for exactly this problem. Per-side ink was the
            alternative and is worse: dark ink measured 4.43 against the
            mid-blue under the same cluster, so it merely moves the failure.

            IT IS ITS OWN LAYER, BEFORE the glyphs and after the route. All
            three are in one stacking context, so DOM order alone puts the
            route under the scrim and the scrim under the glyphs. Making it a
            CHILD of the glyph overlay instead would have painted it OVER the
            clock - absolutely positioned children paint after static flex
            items - and would have needed `relative` on both spans to undo.

            `pointer-events: none` for the same reason the glyph overlay has
            it: it spans the full width over live page content. */}
        {bleed ? (
          <div
            aria-hidden="true"
            data-name="phone-status-scrim"
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: STATUS_BAR_HEIGHT,
              pointerEvents: 'none',
              background: lightInk ? STATUS_SCRIM_DARKEN : STATUS_SCRIM_LIGHTEN,
            }}
            data-scrim-polarity={lightInk ? 'darken' : 'lighten'}
          />
        ) : null}
        {/* LAST IN DOM, AND THAT IS THE ORDERING THE FIX TURNS ON. A positioned
            element paints after the static and auto-z content of its stacking
            context in DOM order, so coming after `children` is what puts the
            clock above a hero that now reaches into the band - and keeping
            z-index unset is what leaves the drawer and the sheets above the
            clock, exactly as they were above the old in-flow strip. */}
        <StatusGlyphs ink={ink || STATUS_INK} elRef={glyphsRef} />
      </div>
    </div>
  );
}

export default function Phone({ children }) {
  const isMobile = useIsMobile();
  const { theme } = useTheme();

  /* DEFAULTS ARE TODAY'S RENDERING. `bleed: false` keeps the seat, `ink:
     undefined` keeps `--status-bar-ink`. A route that calls no hook never
     leaves this state. */
  const [status, setStatus] = useState({ bleed: false, ink: undefined });

  /* ── WHAT THE SHELL TELLS THE SCREENS ─────────────────────────────────
     `bandHeight` is the whole of the signal: STATUS_BAR_HEIGHT where a band is
     actually drawn, 0 where none is. MobileLayout draws none, so a screen that
     paid the inset back there would open a band of empty colour above its
     header. Two pages had copied Phone's `<= 500 || mobile UA` predicate inline
     to work this out for themselves - the point of publishing it here is that
     those copies can be deleted.

     `set` is `useState`'s setter, which React guarantees is stable, so the
     consumer's layout effect depends on IT rather than on this object and does
     not re-fire when `bandHeight` changes on resize. Memoising on bandHeight
     keeps the object identity stable the rest of the time. */
  const bandHeight = isMobile ? 0 : STATUS_BAR_HEIGHT;
  const ctx = useMemo(() => ({ set: setStatus, bandHeight }), [bandHeight]);

  return (
    <StatusBarContext.Provider value={ctx}>
      {isMobile
        ? <MobileLayout bgSolid={theme.bgSolid}>{children}</MobileLayout>
        : <DesktopFrame theme={theme} bleed={status.bleed} ink={status.ink}>{children}</DesktopFrame>}
    </StatusBarContext.Provider>
  );
}
