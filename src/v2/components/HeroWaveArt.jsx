/**
 * HeroWaveArt — the blue wave artwork, as one layer, for every surface that
 * paints it.
 *
 * ── WHY IT IS ITS OWN FILE, 2026-11-04 ─────────────────────────────────────
 * It was six lines inside SystemsOverviewHero and had exactly one caller. The
 * Dashboard restructure gives it a second: Figma 199954:96265 takes the same
 * raster OUT of the hero's rounded-[17px] card and runs it full-bleed from the
 * top of the screen, behind the header bar, with the hero's own text sitting
 * on it. Two callers painting the same artwork is how the two drift apart -
 * PillTabs' header is this repo's record of what that costs - so the layer
 * moved here before the second caller existed rather than after.
 *
 * NOTHING ABOUT THE PAINT CHANGED IN THE MOVE. The raster, the opacity-90, the
 * #a0ccff tint, the theme-conditional blend and the `isolate` are the hero's,
 * carried verbatim. The ARGUMENT for each of them is still in
 * SystemsOverviewHero's header, where it was written against the node, and is
 * deliberately not copied here: one copy of a ruling, not two.
 *
 * The short version, because the two that are load-bearing are easy to delete:
 *   · `mix-blend-multiply` only under `light`. On a dark ground multiply
 *     collapses the raster to a near-black rectangle (measured 1.10:1 of
 *     internal range against 3.14:1 under light). Every other theme paints the
 *     raster itself.
 *   · `isolate` pins the tint's own multiply to the raster. Without it the
 *     tint escapes the group on the themes where the wrapper is
 *     `mix-blend-normal` and multiplies against the page ground instead,
 *     which is the same collapse coming back in through the tint.
 *
 * The #a0ccff is a raw hex on purpose and is NOT a missing token: it is a
 * filter over artwork, not a surface a theme re-grounds. Same call as
 * SystemHeroCard's #ff7b7d and SystemsHealthCard's #ff8904.
 *
 * ── THE TWO CROPS ──────────────────────────────────────────────────────────
 * `imgClassName` defaults to the hero's crop - 211.03/-27.92/-77.24/168.12,
 * the numbers read off 199466:17470 - so the contained card is pixel-identical
 * to what it drew before this file existed.
 *
 * A caller that bleeds passes its own. It should, because those four
 * percentages are relative to the BOX: they were measured against a 370x150
 * card and resolve to a different region of the raster in a 393x234 band. The
 * Dashboard passes an `object-cover` crop instead of re-deriving them, for a
 * reason worth writing down - node 199954:96290's own frame moved three times
 * (x=-29/y=-115/417x266, then -47/-210/673x409, then -74/-173/605x367) inside
 * the twenty minutes it took to read it. The crop is being dragged in Figma
 * right now; pinning percentages to one of those three readings would be
 * pinning a frame mid-edit. `object-cover` is the honest translation of "this
 * is a full-bleed background" and survives both the band's height and the
 * designer's next drag.
 */
/* ── THE THREE PAINTS — 2026-11-04 ─────────────────────────────────────────
   Three FILES, not one file and three tints. system-hero-wave.png is the
   Dashboard's; the other two are Figma's own rasters, re-encoded into the repo
   for SystemHeroCard, which measured why a tint cannot stand in for them:

     alert (823c4.png)       738x582  avg #e4474b  #a51114..#fd868c
     calm  (6df46.png)       738x582  avg #4c86f9  #1035f4..#9dccff
     system-hero-wave.png   1206x778  avg #7ba8f9  #1332f5..#faffff

   No tint over that third, paler raster lands on #e4474b. The whole argument
   is in SystemHeroCard's TWO RASTERS, NOT ONE RASTER AND A TINT, and is
   deliberately not copied here: one copy of a ruling, not two. */
import wave from '@/assets/system-hero-wave.png'
import waveAlert from '@/assets/system-hero-wave-alert.png'
import waveCalm from '@/assets/system-hero-wave-calm.png'

import { cn } from '@/lib/utils'

/* ── THE STATE — 2026-11-04 ────────────────────────────────────────────────
 * The owner, asked whether red on the System page is that page's treatment or
 * a signal: RED BECAUSE THE SYSTEM HAS AN EVENT, BLUE WHEN IT IS CALM. So the
 * artwork is a state indicator and this component has to be able to say so.
 *
 * ⚠ IT TAKES THE STATE; IT DOES NOT DECIDE IT. There is no system here, no
 * alert and no route — the caller passes `tone` and this file paints it. That
 * is deliberate and it is the whole seam: "which events make a system red"
 * (water only? faults too? a comms loss with no leak?) is a product rule that
 * belongs to the screen that knows what a system is, and a component that
 * guessed it would be the second place that rule lives. The System page owns
 * the predicate and reports it.
 *
 * BLUE IS THE DEFAULT, and `brand` is that blue: it is the Dashboard's exact
 * paint, unchanged by this file gaining a state. A caller that passes nothing
 * gets what it got before this prop existed.
 *
 * THE PAIR IS NOT THE DEFAULT, which is the one subtlety. `calm` is ALSO blue
 * but it is a different raster — the designer's, the one SystemHeroCard
 * ships — so the two blues are not interchangeable. Defaulting to `calm`
 * would have silently repainted the Dashboard. A caller that wants the
 * System page's painted pair asks for it by name. */
/* ── THE SCRIM — 2026-11-04, AND IT IS EVEN ───────────────────────────────
 * Owner: "I feel like the image on top on both system and location screen is a
 * bit darker ... there is a subcomponent that makes it feel odd. Can you just
 * fix it, so the image looks the same on the entire image."
 *
 * He was looking at a GRADIENT dim — opaque to 50px, gone by 135 — which each
 * page painted for itself. It bought the header title its contrast and it also
 * drew a visible horizon across a photograph. Shown the trade with the
 * numbers, he chose ONE EVEN SCRIM over the whole band: same darkening
 * everywhere, no fade, no seam, the image slightly deeper overall.
 *
 * IT LIVES HERE, NOT ON THE PAGES, for the reason the gradient should have:
 * "the image looks the same" is a property of the artwork layer, and two pages
 * painting their own was already two values to keep in step.
 *
 * 0.34 IS MEASURED, NOT PICKED. Swept at 0 / .18 / .22 / .26 / .30 / .34 /
 * .38 / .45 against the worst pixel under the title's own glyphs, text hidden,
 * per raster and per theme, for the 3:1 a 20px bold title needs on artwork:
 *
 *                      bare   .26    .30    .34
 *     alert  (red)     2.62   3.97   4.30   4.61
 *     calm   (blue)    1.97   3.13   3.41   3.71
 *     brand  (wave)    1.62   2.60   2.85   3.10   <- the binding one
 *
 * So 0.34 is the LOWEST uniform alpha that clears 3:1 on all three rasters in
 * light, dark and sand. The hero copy had headroom throughout and still does:
 * at 0.34 the eyebrow/headline measure 7.36/8.53 (alert), 7.15/8.29 (calm) and
 * 6.81/7.14 (brand).
 *
 * EACH TONE KEEPS ITS OWN HUE rather than sharing one grey: the scrim is the
 * raster's own deep colour, so the band reads as a deeper version of itself
 * instead of a desaturated one. Raw rgba on purpose — a FILTER OVER ARTWORK,
 * not a surface a theme re-grounds, the same call as the #a0ccff tint.
 *
 * ⚠ OFF UNDER `contrast`, which is carried over from the gradient and is
 * correct: --ink-on-color inverts to a dark value there, so darkening the
 * ground moves it TOWARDS the ink. Measured, 0.34 takes the alert title from
 * 2.51 to 1.71 and the Dashboard's from 3.19 to 2.08. That theme's ink on
 * artwork is a token ruling and is REPORTED, not fixed here.
 *
 * IT IS A FULL LITERAL CLASS, never a value interpolated out of PAINT:
 * Tailwind scans source text, and a colour that exists only as a JS string
 * generates no rule and paints nothing. Same trap, same spelling, as the tint.
 */
const PAINT = {
  /** The Dashboard's: the untinted raster under the #a0ccff filter. */
  brand: {
    src: wave,
    tint: true,
    scrim: 'bg-[rgba(2,33,112,0.34)] [[data-theme=contrast]_&]:hidden',
  },
  /** The System page's pair. Pre-coloured by the designer, so NO tint — the
      colour is in the pixels and anything layered over them can only move it
      away from the design. */
  calm: {
    src: waveCalm,
    tint: false,
    scrim: 'bg-[rgba(2,33,112,0.34)] [[data-theme=contrast]_&]:hidden',
  },
  alert: {
    src: waveAlert,
    tint: false,
    scrim: 'bg-[rgba(74,10,12,0.34)] [[data-theme=contrast]_&]:hidden',
  },
}

/** The hero card's crop - 199466:17470, verbatim. */
const CARD_CROP = 'absolute h-[211.03%] left-[-27.92%] max-w-none top-[-77.24%] w-[168.12%] opacity-90'

export default function HeroWaveArt({
  /** The wrapper box. Callers position and clip it: the hero passes
      `absolute inset-0 rounded-[17px]`, the Dashboard a full-width band. */
  className,
  /** The raster's crop inside that box. See THE TWO CROPS above. */
  imgClassName = CARD_CROP,
  /** 'brand' | 'calm' | 'alert'. See THE STATE above. The caller decides. */
  tone = 'brand',
  /** THE EVEN SCRIM — see its block above. OPT-IN, and only a FULL-BLEED BAND
      with a header bar standing on it needs one: the contained card hero has
      no 20px title over it and darkening it would be darkening a card for a
      problem it does not have. Both band callers pass it. */
  scrim = false,
  /** Forwarded so each call site keeps its own node id on the layer. */
  'data-node-id': nodeId,
}) {
  /* An unknown tone falls back to the Dashboard's paint rather than to
     nothing: a typo in a prop should look wrong, not blank the band. */
  const paint = PAINT[tone] ?? PAINT.brand

  return (
    <div
      aria-hidden="true"
      className={cn(
        'isolate mix-blend-multiply [[data-theme]:not([data-theme=light])_&]:mix-blend-normal pointer-events-none overflow-hidden',
        className,
      )}
      data-node-id={nodeId}
      data-name="hero-wave-art"
      /* So a browser harness can assert WHICH paint is on screen. The two
         System-page rasters differ by hue alone, and a screenshot cannot name
         itself. */
      data-tone={tone}
    >
      <img alt="" src={paint.src} className={imgClassName} />
      {/* THE TINT IS A LITERAL CLASS HERE, never a value read out of PAINT.
          Tailwind scans source text: a hex that exists only as a JS string
          generates no rule and the layer paints nothing. So PAINT carries a
          BOOLEAN and the colour stays where the scanner can see it. */}
      {paint.tint ? <div className="absolute inset-0 bg-[#a0ccff] mix-blend-multiply" /> : null}
      {/* LAST, so it sits over the raster AND the tint. inset-0 of this
          wrapper, so a caller that clips the band (the collapsing header's
          clip-path) clips the scrim with it and the ground under the title is
          the same pixels in both scroll states. */}
      {scrim ? <div className={cn('absolute inset-0', paint.scrim)} data-name="hero-wave-scrim" /> : null}
    </div>
  )
}
