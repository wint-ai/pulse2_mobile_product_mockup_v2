/**
 * HeroCardShell — the hero chassis: ONE inset rounded card with a coloured
 * top section and a white body section under a single continuous radius.
 *
 * Design source, fetched live 2026-11-07:
 *   200013:91525  "Water consumption"   369x291 — the coloured top, on its own
 *   200013:91602  "System page_mobile" 402x1897 — the calm frame it sits in
 *   200013:93101  "Account Main header"  370x261 — the LOCATION page's hero,
 *                 fetched by Agent E; it is the second caller, and the reason
 *                 the art box below is keyed to the raster
 *
 * ── THE FRAME DOES NOT DRAW ONE CARD. IT DRAWS A COMPOSITE. ───────────────
 * This is the whole reason this file exists, and it is worth reading before
 * anyone "corrects" the structure back towards the node tree.
 *
 * 200013:91602's root is `flex flex-col gap-[165px] px-[16px] py-[8px]` with
 * exactly two FLOW children — "Header mobile" (200013:91604) and "Content"
 * (200013:91605). The hero is neither of them: 200013:91603 is an ABSOLUTE
 * 369x291 box at left=17 / top=59, parked in the hole that gap leaves. Laying
 * the frame out by hand:
 *
 *     header mobile      y   8 -> 49     (py-8 + a 24.75 line)
 *     + gap-[165px]
 *     Content starts     y 214
 *     + its pt-[10px]
 *     first white card   y 224           (200013:91615 "IOT overview")
 *
 *     hero box           y  59 -> 350    (the absolute 369x291)
 *     hero copy block    y  76 -> 217    (inset 5.84% top, 141 tall)
 *
 * So the raster runs to y=350 and the opaque white card covers it from y=224.
 * The COLOURED AREA YOU ACTUALLY SEE is y=59 -> 224 = **165px**, which is the
 * root's gap to the pixel: the designer set that gap so the colour ends
 * exactly where the first card begins. And 224 - 217 = 7px between the copy
 * block's bottom and the white — the same 7 the copy row already carries as
 * `pb-[7px]`. The composite is therefore
 *
 *     pt-[17px] + copy block + pb-[7px]  =  the coloured section
 *     the white card                     =  the body
 *
 * and this file is that composite made explicit, so the two halves cannot
 * drift apart the way two absolutely-positioned layers can.
 *
 * ── WHAT WE DO DIFFERENTLY FROM THE FRAME, AND WHY ────────────────────────
 * In the frame the two halves are separate layers with DIFFERENT radii: the
 * white card is `rounded-[var(--rounded-3xl,22px)]` on all four corners, and
 * the hero's rounding is baked into the raster (measured below at 15.2 css px
 * here). Drawn literally that puts the white card's own rounded TOP corners
 * over the wave, so the colour shows through two little notches at the join.
 *
 * The restructure's contract calls for ONE continuous outer radius, so the
 * body's top corners are square here and the outer clip supplies the rest.
 * That is a deliberate, reportable difference from the node, not an oversight.
 * If the owner wants the notches, the change is `rounded-[22px]` on the body
 * section plus dropping `overflow-hidden` from the root.
 *
 * ── ONE ART BOX PER RASTER, NOT ONE ART BOX ──────────────────────────────
 * Corrected 2026-11-07 after Agent E measured the location page. The first
 * cut of this file gave every tone `aspect-[369/291] min-h-full` with
 * `object-cover`. That box is not a generic ratio: 369/291 IS the system
 * pair's own 738x582, so it says "paint THIS raster at the card's width".
 * On the system page that is exactly right and it is exactly what
 * 200013:91525 draws. On the location page it is wrong twice over:
 *
 *   · the brand raster is a DIFFERENT PICTURE — 1206x778, aspect 1.550, and
 *     drawn for 603x389. Inside a 1.268 box `object-cover` has to scale it by
 *     HEIGHT, which lands it at 284.7px against the 389 it wants: a 73%
 *     downscale that no one chose.
 *   · the box's height therefore came from the CARD'S WIDTH, so the slice of
 *     artwork the coloured section actually showed was `H / (W * 291/369)` —
 *     a different part of the picture at every section height. The location
 *     page's 147px section reached 52% of the way down a raster that runs
 *     near-white at the top and #0651ff at the bottom, and the deep-blue
 *     trough landed in the section as a dark navy band along the join.
 *
 * Measured on the live page, as the L of a row-mean sampled down the
 * coloured section (393px phone, light theme):
 *
 *     location, before     186 -> 103, swing 89   <- the dark navy band
 *     location, after      122 ->  87, swing 60
 *     200013:93089 render  128 ->  96, swing 52   <- the target
 *
 * So the crop is now keyed to the ARTWORK, which is what `tone` already
 * names, and the brand box is derived from THE COLOURED SECTION:
 *
 *     brand          top-[-102.1%] bottom-[-76.8%]   art box = 2.789 x H
 *     calm / alert   aspect-[369/291] min-h-full     art box = the raster
 *                                                    at the card's width
 *
 * Percentage `top` and `bottom` both resolve against the containing block's
 * HEIGHT, and the containing block is `hero-card-colour`, whose height IS the
 * coloured section. So the brand hero shows rows 36.6%-72.5% of its artwork
 * at ANY section height — the same picture at 100px of colour and at 300px,
 * which is the property the shared box did not have. A third caller at a
 * fourth height is already correct.
 *
 * 2.789 AND THE ANCHOR ARE READ OFF THE NODE, not fitted to our one height.
 * 200013:93101 draws the location hero as an `aspect-[370/189]` box with the
 * raster at `h-[211.03%] top-[-77.24%]` — 398.85px of artwork, of which the
 * visible colour is the 143 that `h-[173px] mb-[-30px]` leaves above the
 * white card. 398.85/143 = 2.789, and the window opens at 145.98/398.85 =
 * 36.60%, so the box reaches 0.3660 * 2.789 = 1.021 sections above the
 * section and the remaining 0.768 below it. Those two numbers are the whole
 * change.
 *
 * WHAT WAS TRIED AND REJECTED, because the obvious fixes are all worse:
 *
 *   · `inset-0` — the art box simply filling the section. The section is
 *     361x147, aspect 2.46, so `object-cover` on a 1.55 raster shows 63% of
 *     its height: measured L-swing 93, WORSE than the 89 we started with.
 *     The section needs the artwork ZOOMED, not merely fitted, and the node
 *     zooms it 1.68x.
 *   · an `object-position` alone. Same 63% window, so it can only choose
 *     which end of the gradient lands in the band; it cannot narrow it.
 *   · one shared, section-derived ratio for all three tones. It fixes the
 *     location page but moves the system hero from rows 0%-56.7% of its
 *     raster to 32%-68%, which contradicts 200013:91602's own render — that
 *     frame draws the system hero pale at the top, exactly as we ship it.
 *
 * ⚠ THE SYSTEM BOX CARRIES THE SAME LATENT H-DEPENDENCE and is left alone on
 * purpose, not by oversight. It is node-literal, it paints its raster at
 * natural @2x with no resampling, and at the only height the system page has
 * (159px against the node's 165) it is right. Converting it to
 * `top-0 bottom-[-76.4%]` — 291/165 = 1.764, the same derivation as above —
 * is geometrically identical to within the 4px `object-cover` then trims, and
 * it was measured as such. It is NOT done here because
 * `systemHeroCard.dom.test.jsx:222` asserts this file's `aspect-[369/291]`
 * from another component's test, and that file is owned by another agent who
 * is editing it right now. Whoever owns that assertion should move it here
 * and then the conversion is two lines. REPORTED.
 *
 * ── THE RASTER'S CORNERS ARE BAKED, AND THE MATTE IS BLACK ────────────────
 * Measured off the shipped files rather than assumed, because the received
 * wisdom about them was only half right:
 *
 *     system-hero-wave-alert.png   738x582   RGB, NO ALPHA CHANNEL
 *     system-hero-wave-calm.png    738x582   RGB, NO ALPHA CHANNEL
 *
 * Both carry a quarter-circle matte of **pure #000000** in every corner, 31
 * SOURCE px deep (the dark run is 31px on row 0 and 0px on row 31, i.e. a
 * 31px corner radius). The raster is exactly 2x the node's 369-wide box, so
 * that is **15.5 css px at 369 wide**, and 15.2 at the 361 this card gets on
 * a 393 phone — not the ~31 css px the restructure contract estimated.
 *
 * It is BLACK, not a colour matte, and the layer paints at
 * `mix-blend-multiply` under `light`: black multiplies to black against any
 * ground, so the matte never "blends away". It is only ever hidden by a clip.
 * `rounded-[22px]` here is 22 > 15.2, so the clip removes strictly more than
 * the matte occupies and no black can reach a corner. Any future radius below
 * ~16px on this card would start showing it.
 *
 * ⚠ THE 2026-11-07 CROP CHANGE HAD TO BE CHECKED AGAINST THIS, because a
 * tighter crop or an offset is exactly what could pull a baked corner inward.
 * It does not, and the two tones fail safe for different reasons:
 *
 *   · `calm`/`alert` keep `top-0` and a box the raster covers by WIDTH, so
 *     the raster's own top-left and top-right corners still land on the
 *     card's, and `rounded-[22px]` is still the only thing hiding them —
 *     unchanged from the first cut, and still the guard of record.
 *   · `brand` now opens its box 1.02 sections ABOVE the colour (150px up on
 *     the location page) and the raster covers it by HEIGHT, so cover throws
 *     away 21.6% of the raster at each side. All four of its baked corners
 *     are off the card entirely.
 *
 * So the radius protects strictly more than it has to, and the test still
 * holds it at >= 16 because it is what protects the NEXT crop. Re-verified by
 * pixel probe rather than argued: both pages, all four themes, all four
 * corners, 2026-11-07 — see the report. No corner sample is anywhere near
 * black under any theme.
 *
 * ── NO HORIZONTAL MARGIN. THIS IS A HARD RULE, NOT A PREFERENCE. ──────────
 * The card is `w-full` and sets no margin of its own; the PAGE applies the
 * 16px gutter (402 - 16 - 16 = 370, against the node's 369-wide hero at
 * x=17 — the frame's own 1px of drift). A hero that bled out of the scroller
 * with `-mx-[16px]` is what produced the horizontal-scroll bug recorded at
 * SystemPageV2Screen.jsx:2560-ish: in LTR a negative RIGHT margin becomes
 * scrollable width, and the owner asked "why this is not responsive and i
 * have horizontal scroll". `scripts/check-shell-contract.mjs` holds the
 * invariant as `bleed-needs-a-bleeding-scroller`.
 *
 * ── THE SCRIM IS OFF, AND THAT IS A RULING ────────────────────────────────
 * HeroWaveArt carries an opt-in `scrim` at 0.34 alpha. That number was
 * derived for a 20px page TITLE standing ON the artwork, in the full-bleed
 * band the collapsing header painted. This restructure moves the header bar
 * onto the page ground (contract 1), so there is no title on the artwork any
 * more and the scrim's justification goes with it. The frame agrees: node
 * 200013:91603 draws the raster with no scrim layer of any kind. So this
 * chassis passes `scrim={false}`, which is also what the contained card hero
 * has always done.
 *
 * ⚠ What is left on the artwork is the consumption copy, and measured against
 * the lightest pixel inside its own rect it does NOT clear WCAG — white on
 * #fd878d is 2.33:1 (alert) and on #9fccff is 1.67:1 (calm), against the
 * 4.5:1 a 16px caption needs. That is unchanged from what ships today and is
 * exactly what the designer drew, so it is REPORTED as the owner's call
 * rather than fixed here by inventing a veil the node does not have.
 *
 * ── WHAT THE 2026-11-07 CROP DID TO THOSE NUMBERS ────────────────────────
 * Re-measured the same way — copy hidden, worst pixel inside each run's own
 * rect, all four themes, both pages. The SYSTEM page did not move by so much
 * as 0.01: its box is untouched and its heroes are pixel-identical. Every
 * figure that moved is on the location hero, and the direction depends
 * entirely on which ink that theme puts on artwork.
 *
 * light / dark / sand — WHITE ink, and a darker ground helps it:
 *
 *                            before        after
 *     "12 Locations" 15px    1.80/1.62  -> 3.35/3.04   still under 4.5
 *     "53 systems" 34.6px    1.80/1.62  -> 4.58/4.27   CLEARS its 3:1
 *     chips "53/0/0" 18px    2.14-3.05  -> 4.77-5.58   CLEARS 4.5
 *
 * contrast — DARK indigo ink (#0d00a8, `--ink-on-color` inverted), and a
 * darker ground hurts it. THIS IS A REGRESSION AND IT IS REPORTED, NOT HIDDEN:
 *
 *     "12 Locations" 15px    7.90 -> 2.48
 *     "53 systems" 34.6px    6.27 -> 1.81
 *     chips "53/0/0" 18px    4.01/3.03 -> 2.24/1.89
 *
 * It is the same mechanism HeroWaveArt's scrim block already records ("the
 * 0.34 scrim takes the alert title from 2.51 to 1.71 under contrast, because
 * --ink-on-color inverts to a dark value there, so darkening the ground moves
 * it TOWARDS the ink"). It was only passing before because the crop was wrong
 * — the location hero was showing the raster's near-white top. The node draws
 * a mid-blue ground with WHITE copy, which is what the other three themes do
 * and what the system hero does under contrast as well. So the fix belongs to
 * whoever owns that ink: either `contrast` keeps white on artwork the way the
 * system hero already does, or the token changes. It is NOT fixable from this
 * chassis without re-breaking the crop, and a veil is explicitly off the table.
 */
import HeroWaveArt from '@/v2/components/HeroWaveArt'

import { cn } from '@/lib/utils'

/* ONE ART BOX PER RASTER. `tone` is already this file's name for which
   artwork is on screen — the same key HeroWaveArt's own PAINT map uses — and
   a crop is a property of the picture, so this is keyed on it rather than
   shared. That is not a second copy of a ruling: `className`/`imgClassName`
   exist on HeroWaveArt precisely so the CALLER supplies the crop ("A caller
   that bleeds passes its own", its header), and this chassis is that caller.
   The derivation of both boxes is in the header.

   The art is deliberately ALLOWED to run past the coloured section, and on
   `brand` now in both directions. Above the section there is nothing but the
   shell's own `overflow-hidden` clip; below it the body is opaque and is
   painted after the art, so it covers the overhang exactly as the frame's
   white card does (291 of raster against 165 of visible colour). */
/** 200013:91525's raster layer, verbatim — `aspect-[369/291] left-0 right-0
    top-0` with the image at `inset-0 size-full`. 369/291 is exactly the
    system pair's own 738x582, so this paints THAT raster at the card's width,
    top-anchored, with no resampling. `min-h-full` is the one addition and it
    is a guard, not a look: the aspect gives 284.7px of art on a 361px card,
    so a coloured section taller than that would run out of raster and show
    page ground; with it the box grows to the section and `object-cover` crops
    instead. See the ⚠ in the header for what this box still owes. */
const SYSTEM_ART_BOX = 'absolute inset-x-0 top-0 aspect-[369/291] min-h-full'
const ART_BOX = {
  /** 200013:93101 — 398.85px of raster, 143 visible, the window opening at
      36.60%, all of it measured against the COLOURED SECTION's own height. */
  brand: 'absolute inset-x-0 top-[-102.1%] bottom-[-76.8%]',
  calm: SYSTEM_ART_BOX,
  alert: SYSTEM_ART_BOX,
}
const ART_IMG = 'absolute inset-0 block size-full max-w-none object-cover'

export default function HeroCardShell({
  /**
   * 'brand' | 'calm' | 'alert' — the SAME vocabulary HeroWaveArt already
   * uses, passed straight through to it. The chassis takes the state; it does
   * not decide it. Which events make a system red is a product rule owned by
   * the screen that knows what a system is.
   *
   * Since 2026-11-07 it also picks the ART BOX, because it is already the name
   * for which raster is on screen and a crop is a property of the picture. No
   * caller has to know that: the two pages pass the tone they always passed
   * and the right crop follows. An unknown tone falls back to `brand`, the
   * same fallback HeroWaveArt makes on the same key.
   */
  tone = 'brand',
  /**
   * The white section under the colour, as a SLOT.
   *
   * It is whatever is most urgent right now, and that is why it cannot be
   * hard-coded: the active event when there is one, the System type card when
   * there is not, System health on the location page. Omit it and you get a
   * bare coloured card with nothing under the artwork.
   *
   * THE CHASSIS PAINTS THIS SECTION — `bg-surface-card`, square top corners,
   * bottom corners from the outer clip — and gives it NO padding, so the
   * slotted node supplies its own.
   *
   * A card slotted in here SHOULD drop its own chrome
   * (`className="rounded-none border-0"` on SystemTypeCard / SystemHealthCard,
   * both of which already take a className) and keep only its padding. But
   * leaving the chrome on was screenshotted rather than guessed at, and it
   * degrades gracefully: the inner card paints the SAME `--surface-card` the
   * chassis has already painted behind it, so its rounded top corners reveal
   * white rather than wave and its `border-card` rim is white on white. The
   * difference is a 1px content offset. Pass the override for cleanliness,
   * not to avoid a bug.
   */
  body,
  className,
  /**
   * The coloured section's content. The chassis supplies NO inner padding
   * here either: the consumption copy's pt-17 / pl-18 / pr-17 / pb-7 are
   * measurements of THAT instance inside the 369x291 box, and the location
   * page's counts and chips have their own. A chassis that spelled one of
   * them would be wrong on the other two.
   */
  children,
  /**
   * WHERE THE CLIP LIVES. Additive, and `'card'` is exactly what this shell
   * did before the prop existed - every current call site keeps that default
   * and renders byte-identically.
   *
   * - `'card'`  the ROOT clips. One continuous 22px radius over the artwork,
   *             the join and the body, and anything a child hangs outside the
   *             card is cut with it.
   * - `'art'`   only the ARTWORK is clipped, by a box the same size as the
   *             coloured section, and the root clips nothing.
   *
   * WHY `'art'` EXISTS — a bug, not a preference. The Home hero
   * (200067:38969) is full-bleed and square, so it has no radius to clip, and
   * it lost the white body that used to make it tall. SystemsOverviewHero's
   * zero-count chip drops a 114px upsell panel out of the hero box; against
   * the shorter card the root's `overflow-hidden` cut 95px off it, measured
   * in Chromium at 393x852, taking the whole wint.ai CTA with it. A zero chip
   * is a sales surface, so that is a real loss and not a cosmetic one.
   *
   * The raster still has to be clipped either way: `brand` crops it to
   * `top-[-102.1%] bottom-[-76.8%]`, so unclipped it paints far outside the
   * hero and over the cards below. `'art'` keeps that clip and moves it off
   * the card, which is the only part that was ever load-bearing for the
   * artwork.
   *
   * NOT A STACKING CONTEXT EITHER WAY. The wrapper is `absolute` with no
   * `z-index`, `transform`, `filter` or `isolation`, so it cannot seal the
   * panel below the body - the failure heroPanelStacking.dom.test.jsx exists
   * to catch. `overflow-hidden` clips; it does not stack.
   */
  clip = 'card',
}) {
  return (
    <div
      /* `overflow-hidden rounded-[22px]` is the single continuous radius, and
         it is the whole clip: it rounds the artwork at the top, squares the
         body's top corners at the join, and rounds the body at the bottom.

         22 is the frame's own card radius (--rounded-3xl on 200013:91615) and
         the radius every other card in this repo uses, so the hero now
         measures the same as the cards under it. It is also comfortably past
         the raster's 15.2px baked matte — see the header.

         NO `isolate` here, deliberately. It would open a stacking context and
         trap HeroWaveArt's `mix-blend-multiply` against this card's own
         (transparent) background instead of the page ground, which is where
         the wave has always multiplied. The card root paints NO background for
         the same reason; only the body section does. */
      className={cn(
        'relative w-full shrink-0 rounded-[22px]',
        clip === 'card' && 'overflow-hidden',
        className,
      )}
      data-name="hero-card-shell"
      data-hero-tone={tone}
      data-hero-body={body ? 'true' : 'false'}
      data-hero-clip={clip}
    >
      <div className="relative" data-name="hero-card-colour">
        {/* Consumed as-is. The chassis supplies the box and the crop; every
            decision inside the layer — the two rasters, the #a0ccff tint on
            `brand` only, the theme-conditional blend, the `isolate` that pins
            that tint to the raster — stays in HeroWaveArt, which is the one
            place they live. */}
        {/* An unknown tone falls back to the brand crop, matching the fallback
            HeroWaveArt makes on the same key: a typo in a prop should look
            wrong, not blank the artwork by resolving the box to `undefined`. */}
        {/* Under `clip="art"` the raster gets a clipping box of its own, the
            same size as the coloured section, so the crop still happens and
            the CARD stops clipping. `absolute inset-0` and nothing else — no
            z-index, so the `relative` children below still paint over it by
            document order alone, exactly as they do under `clip="card"`. */}
        {clip === 'art' ? (
          <div className="absolute inset-0 overflow-hidden" aria-hidden data-name="hero-card-art-clip">
            <HeroWaveArt
              tone={tone}
              className={ART_BOX[tone] ?? ART_BOX.brand}
              imgClassName={ART_IMG}
              scrim={false}
            />
          </div>
        ) : (
          <HeroWaveArt
            tone={tone}
            className={ART_BOX[tone] ?? ART_BOX.brand}
            imgClassName={ART_IMG}
            scrim={false}
          />
        )}
        {/* In flow and after the art, so it paints over it without needing a
            z-index. The copy is the only thing in this card that is not
            artwork, and nothing here may be `absolute` — the coloured
            section's height IS its content's height, which is what lets the
            white body butt straight onto it. */}
        <div className="relative">{children}</div>
      </div>

      {body ? (
        <div className="relative bg-surface-card" data-name="hero-card-body">
          {body}
        </div>
      ) : null}
    </div>
  )
}
