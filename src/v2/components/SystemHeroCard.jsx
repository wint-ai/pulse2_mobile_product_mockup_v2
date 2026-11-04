/**
 * The System page's CONSUMPTION HERO — the wave and the headline on it.
 * Nothing else.
 *
 * Design source, read off saved emitted code and never a live Figma call:
 *   199383:141499  "System page_mobile" ALERT  (sysA)
 *   199359:126785  "System page_mobile" CALM   (sysB)
 * Both were RE-FETCHED on 2026-10-20 after the designer edited them; every id
 * and every number below comes from that refetch, and the ids moved a lot (the
 * copy block, the wave and most of sysB's header are new nodes). Where a line
 * below cites an id, it is the fresh one.
 *
 * ── IT HAS TWO SHAPES NOW — 2026-11-04 ────────────────────────────────
 * A CARD (the default, everything below describes it) and a BAND: the same
 * copy, on artwork the PAGE paints full-bleed behind the header bar. The
 * owner's current System-page frame, 199961:97440, draws the second —
 * left=-4 / top=-11 / 406x293 inside a 402 frame, i.e. outside its parent on
 * every axis. The whole of the difference, and why its three effects are one
 * prop, is on `band` in the props below. Nothing in the card path moved.
 *
 * ── "IT LOOKS VERY HIGH" — MEASURED 2026-11-01 ────────────────────────
 * Owner, on the phone: "it looks very high … it takes too much space. I want
 * to make sure it [is] exactly as in Figma, and maybe we just need to find a
 * better solution for that."
 *
 * IT IS ALREADY EXACTLY AS IN FIGMA. Refetched 199703:31475 live and measured
 * both sides rather than eyeballing them. The frame is 402 wide with a root
 * of px-[16px] py-[8px] and — the number that decides this — `gap-[182px]`
 * between its only two flow children, "Header mobile" and "Content". The hero
 * (199703:31476) is NOT one of them: it is an absolute 369x291 box at
 * top-[129px], parked in the hole that gap leaves.
 *
 *                              frame (402)      ours (393, measured)
 *     tab row bottom              113              109
 *     gap, tabs -> hero            16               16
 *     hero copy height            158              158
 *     hero bottom                 287              283
 *     gap, hero -> first card      18               16
 *     first card top              305              299
 *     wave bottom                 420              416
 *
 * So the hero's own height is 158px on both sides, to the pixel, and the four
 * remaining pixels of lead are the TAB ROW being 32 tall here against the
 * frame's 36 — i.e. we are SHORTER above the hero, not taller. The 2px at the
 * bottom is the deliberate choice recorded in SystemPageV2Screen: one scroller
 * gap cannot spell both of the frame's 16 and 18.
 *
 * WHAT IS ACTUALLY TALL IS THE BLUE, NOT THE BOX. This element costs 158px of
 * layout; the wave behind it is 291 and runs to y=416 — 49% of an 852pt
 * viewport — before the first card covers it. The frame does exactly the same
 * thing, but the frame is a 402x1897 artboard: the designer never saw it
 * against 852pt of screen, where header + tabs + hero already spend 283px
 * (33%) before any content. So this reads as a tall hero while measuring as a
 * short one, and that is a DESIGN question, not a transcription bug.
 *
 * TWO THINGS THE OWNER MAY WANT TO RULE ON, neither applied here:
 *   1. The wave's 291px overhang. In the frame the first card beneath it is
 *      one opaque full-width card ("System type"), so the blue simply stops.
 *      On a system with a live event this page puts a HORIZONTALLY SCROLLING
 *      event carousel there instead, and the wave shows through the gap
 *      between its cards as a blue sliver running to y=416. The designer
 *      never drew that state. Clipping the wave to the hero's height plus the
 *      first card's radius would end it; so would an opaque backdrop on the
 *      carousel row.
 *   2. The 158px itself is 17px of padding over a 141px column: a two-line
 *      caption at 24/24, a 13px gap, and a fixed h-[80px] figure slot holding
 *      a 42.222/58.056 numeral. The slot is tight, not padded, so there is
 *      nothing to reclaim without changing the type scale — which is the
 *      design's, not ours.
 *
 * STRUCTURAL CHANGE, and the reason this file shrank.
 * This component used to own the Mobile Header Bar and draw it ON the wave, so
 * the page read:
 *     [hero: header bar + system name + consumption] -> tabs -> cards
 * Both nodes order it differently. The repo owner, looking at the running app
 * beside the frame: "this is not even similar to figma, not layout not entity
 * screens". In both nodes the root's flow children are
 *   · a gap-[25px] column (199383:141501 / 199394:20585) holding the Mobile
 *     Header Bar and then the Tabs row
 *   · the card stack
 * and the consumption copy is an ABSOLUTE sibling pinned below the tabs
 * (top-[171px] sysA / top-[186px] sysB, against tab rows that end at y=128).
 * So the real order is
 *     header bar -> tabs -> consumption hero -> cards
 * The header bar is now the page's own shrink-0 chrome above the tab row; see
 * the HEADER REDRAW block in SystemPageV2Screen.jsx, which is where that
 * implementation and its reasoning moved intact.
 *
 * THE SYSTEM'S NAME IS NOT DRAWN HERE EITHER, ANY MORE. Neither node names the
 * system anywhere: the header's scope slot reads "Meridian Realty Group (MRG)"
 * — an ACCOUNT — and the only other proper nouns on either frame are the pipe
 * topology ("Water line") and a serial ("SN 4471822"). Dropping the name is a
 * functional regression, so the page keeps it, in the header bar's own second
 * row. See the page for why there.
 *
 * ONE ASSET, TWO STATES. Both nodes reference the same raster (Figma names it
 * "Screenshot 2026-08-19 at 23.50.31", kept locally as system-hero-wave.png)
 * and both now treat it identically — opacity-50 under a mix-blend-color tint.
 * Only the tint and the placement differ, so each tone follows its own node
 * rather than one being imposed on the other:
 *
 *            node            box                              tint
 *   alert  199383:141500   h-291 left-17 w-369 rounded-20   #ff7b7d
 *   calm   199394:79634    h-303 left-9  w-385 rounded-20   #6bb2fa
 *
 * TWO THINGS THE REFETCH CHANGED HERE. The calm wave used to be an untinted
 * opacity-90 image at h-411/left-19/w-364; it is now the alert treatment with
 * a blue tint. And the alert box shrank (h-303 left-9 w-385 -> h-291 left-17
 * w-369) because the frame root's horizontal padding went 8px -> 16px. The
 * node pins the wave to the ROOT frame, so these offsets are measured from the
 * phone's edge — which is why the page bleeds this component out to the full
 * 393 instead of letting it sit in the card gutter.
 *
 * The alert tint is a soft #ff7b7d at half opacity, not a saturated red — a
 * previous pass used #ff1717 and the wave came out crimson.
 *
 * THE COPY BLOCK follows sysA (199396:84050). The two frames still disagree
 * about it and only one can be followed; sysB's copy (199394:79635) is the
 * design sysA ITSELF carried before this refetch, so sysA is the later
 * iteration, exactly as it is for the header bar:
 *
 *              199396:84050 (followed)          199394:79635 (not followed)
 *   layout     gap-[5px] column, w-154,         h-[120px] justify-between,
 *              items-center, left-132/top-171   centred, top-186
 *   caption    "Water consumption" then the     same two lines, but the date
 *              date range as a second 16/24     is Geist Bold 16 after a 14px
 *              line, both centred, white        space inside one text run
 *   figure     "5,830" 42.222/58.056 + a separate "L" at 20/20  — the same
 *   delta      pill UNDER the figure, h-34      pill BESIDE the figure, h-34
 *              w-100 rounded-12, white ink      w-70 rounded-9, slate-50 ink
 *   see more   12px Figtree Regular #fafbfc,    14px Figtree Light white, no
 *              with a 16px chart glyph          glyph
 *
 * Both frames now draw the copy WHITE throughout, so the tone no longer picks
 * an ink. This file previously drew slate-50 on alert and white on calm, which
 * was inverted against the nodes of the day and is now simply gone.
 *
 * NEITHER NODE DRAWS THE CALM GLASS PANEL any more (the rgba(17,117,218,0.38)
 * backdrop-blur card from the superseded 199296:50193), so both tones share
 * one layout and the panel is removed.
 *
 * NOT IMPLEMENTED — the glyph beside "See more" is Figma's "Huge Icons /
 * chart-03" (199396:84057). @/v2/icons does not own it and adding an icon is
 * outside these two files, so lucide's ChartLine stands in: the same subject,
 * from a set this repo already draws from (ScopePill takes its back chevron
 * from it). Swapping in a real chart-03 later is a one-line change here.
 *
 * TOKENS — Phase 3, docs/TOKENIZATION-PLAN.md (2026-10-21). Every
 * `var(--x, #hex)` in this file has been rewritten to the Tailwind utility
 * that paints the same value, and the fallback DELETED. The fallback was a
 * second, invisible source of truth that won whenever the token was missing,
 * with no warning and no visual tell; removing it makes a missing token fail
 * loudly. Nothing below renders differently — each value was resolved per
 * call site against what it already painted.
 *
 * Any note further down about keeping Figma's escaped `\/` token names
 * VERBATIM, and about String.raw being what carries the backslash, describes
 * the state BEFORE that pass. It is still the rule if an escaped name is ever
 * pasted back in from Figma — but no live class string in this file carries
 * one now, and a fresh paste should resolve the fallback hex to a utility.
 */
import { Button } from '@/components/ui/button'
import { Chart03, TriangleFill } from '@/v2/icons'
import { cn } from '@/lib/utils'
/* Figma's own two rasters, re-encoded into the repo. 199703:30816 references
   823c4.png and 199703:31382 references 6df46.png — different images, not one
   image and a tint. See the wave block below for the measurements. */
import waveAlert from '@/assets/system-hero-wave-alert.png'
import waveCalm from '@/assets/system-hero-wave-calm.png'

/* The nodes spell two families — Geist for the figures, Figtree for the words.
   Both carry the project's own fallbacks.

   Every class string containing a backslash is String.raw: in a plain JS
   string `\/` collapses to a bare `/`, which Tailwind reads as an opacity
   modifier, and the class silently never reaches the DOM. These are template
   literals rather than cn() arguments for a second reason — tailwind-merge
   treats `leading-*` as conflicting with a font-size atom, and Figma emits
   alphabetically, so a `leading-[…]` written BEFORE a `text-[length:…]` is
   silently deleted. Where cn() IS used below, the size is spelled first. */
const GEIST = "font-['Geist:Medium','Geist','Figtree',sans-serif]"

export default function SystemHeroCard({
  /** The headline figure WITHOUT its unit — 199703:30082 draws "5,830". */
  total,
  /** 199703:30084, a separate 20px run beside the figure. */
  unit,
  /**
   * The change against the previous window, SIGNED, as a number — not a
   * string, and not pre-formatted.
   *
   * It used to be `delta`, a ready-made "+120%" that this component printed
   * verbatim. The 2026-10-26 nodes split that one value across two marks: a
   * triangle that points with the sign and a figure that carries none. A
   * caller handing over "+120%" cannot drive both, and a caller handing over
   * a string plus a separate direction can let the two disagree. One signed
   * number is the only shape where the arrow and the digits cannot contradict
   * each other.
   *
   * null when there is nothing to compare against; 0 draws the figure with no
   * triangle at all. See the delta row.
   */
  deltaPct,
  /**
   * The window the percentage is measured against, printed after "vs." —
   * 199703:30090 draws "vs. 1-24 Jul". Omit it and the caption is not drawn;
   * the percentage still is. This is the previous span's own label, so the
   * hero names the same comparison the chart's legend does.
   */
  compareLabel,
  rangeLabel,
  tone = 'calm',
  /**
   * ── BAND MODE — 2026-11-04, Figma 199961:97440 ───────────────────────────
   * FALSE (the default) is this file as it has always been: a CARD, the same
   * width as every card under it, painting its own wave inside its own
   * rounded box. Nothing about that path changes.
   *
   * TRUE says "the page is already painting this artwork behind me, full
   * bleed, and I am copy on it." The owner's System-page frame draws the hero
   * at left=-4 / top=-11 / 406x293 inside a 402 frame — i.e. OUTSIDE its
   * parent on every axis, the same move 199954:96290 makes on the Dashboard —
   * so the wave stopped being this card's background and became the ground the
   * header bar and this copy both sit on.
   *
   * ONE PROP, THREE EFFECTS, because they are one decision and a caller that
   * could take two of the three would be able to build a broken hero:
   *
   *  1. NO WAVE OF ITS OWN. The page's HeroWaveArt band is already drawing
   *     this exact raster behind this exact box; two copies would double the
   *     multiply and draw a seam at the hero's top edge. Same reasoning, same
   *     words, as SystemsOverviewHero's `artwork` prop.
   *  2. NO `pt-[17px]`. That 17 is the node's padding inside a CARD whose top
   *     edge is the wave's top edge. In band mode there is a 54px header bar
   *     above this copy supplying the air, and keeping the 17 as well pushes
   *     the delta row 15px past the band's 205 and onto page ground, where
   *     white-on-page is illegible. Measured at 393x852: 158 -> 141.
   *  3. NO `pl-[18px] pr-[17px]`. Those are the CARD's inner gutters. The
   *     frame insets this copy 4.88% of 406 from a hero at x=-4, i.e. 15.8px
   *     from the FRAME edge — the page's own 16px gutter, not 16+18. In card
   *     mode the 18 is right and is kept.
   */
  band = false,
  /** Fires the jump to the consumption chart. See the control below. */
  onJumpToChart,
  className,
}) {
  const alert = tone === 'alert'

  return (
    <div className={cn('relative shrink-0 w-full overflow-x-clip', className)} data-hero-tone={tone} data-hero-band={band ? 'true' : 'false'}>
      {/* The wave — 199383:141500 (alert) / 199394:79634 (calm). `top-0`
          rather than the node's top-[148px] because this element now BEGINS
          where the node puts the wave.

          ONE BOX FOR BOTH TONES, CENTRED. Two owner reports, and the second
          corrected me:

            "the waves component is not right and left symetric in the screen"
            "why each wave box is not the same size / it needs to be same as
             in figma"

          The second is the important one. I had the two tones at different
          sizes — alert 369x291, calm 385x303 — and defended it as per-tone
          design. It was not: it was a STALE PAYLOAD. Re-measured against live
          Figma on 2026-10-20 (metadata, not a cached export):

              alert  199383:141500   x=17  y=148  369 x 291
              calm   199394:79634    x=17  y=154  369 x 291

          Identical box, identical x; only y differs by 6px. The calm frame had
          been edited since the morning fetch this file was built on. So both
          tones take 369x291 and the per-tone branch is gone.

          The CENTRING is still ours and is still the one number here that is
          not the node's. x=17 on a 393 frame leaves 17 left and 7 right, which
          is the asymmetry the first report was about. inset-x-0 + mx-auto puts
          it at 12/12. Same reasoning as the figure below, which is already
          centred rather than carrying the node's left-[132px].

          aria-hidden: it is weather, not information — the figure in front of
          it carries the meaning. It is deliberately allowed to run past this
          element's own height, which is what puts it behind the first cards
          exactly as both frames draw it. */}
      {/* ── TWO RASTERS, NOT ONE RASTER AND A TINT ────────────────────────
          2026-10-26, owner: "the waves color is not exactly as in figma."

          It could not have been. This drew ONE blue-grey wave at opacity-50
          under a flat `mix-blend-color` tint, and called the result red on an
          alert. 199703:30816 and 199703:31382 reference DIFFERENT image
          assets, and measuring them settles it:

            Figma alert (823c4.png)   738x582  avg #e4474b  #a51114..#fd868c
            Figma calm  (6df46.png)   738x582  avg #4c86f9  #1035f4..#9dccff
            our system-hero-wave.png 1206x778  avg #7ba8f9  #1332f5..#faffff

          So the designer paints two waves. The old construction was wrong
          twice over: no tint over that lighter, higher-contrast blue can land
          on #e4474b, and even the CALM state was too pale because the source
          raster is not the one Figma uses. Both are now shipped and picked by
          tone, which makes the colour exact by construction rather than
          approximated.

          `opacity-50` and both tint layers are GONE with it. The node applies
          the image at mix-blend-multiply and nothing else — the colour is in
          the pixels now, so anything layered over them can only move it away
          from the design.

          THE BLEND MODE STAYS THEME-CONDITIONAL, and for the reason the old
          note here recorded: `multiply` is `backdrop x source`, and on a dark
          card the backdrop is ~0.09, which collapses the wave to a near-black
          rectangle (measured internal range 1.09:1 under dark against 2.78:1
          under light). Dropping the multiply off `light` composites it
          normally there. `light` is untouched.

          system-hero-wave.png IS NOT DELETED — SystemsOverviewHero, TriageBand
          and EventFocusOverlay still draw it, and the overlay's own node
          (199431:138924) genuinely does use the tint construction. Different
          node, different build; only this card's wave changed. */}
      {/* ── THE WAVE NOW SPANS THE CARD, NOT A FIXED 369 ──────────────────
          2026-10-26. It was `mx-auto w-[369px]` inside a component the page
          bled to the full 393, which put the wave 12px off each phone edge
          while every card under it sat at 16px — four pixels proud, the whole
          length of the page.

          THE BLEED WAS A MISREADING, and this is where it is corrected. The
          note below used to argue that "the nodes position the wave against
          the ROOT frame (left-[17px] / left-[9px]), not against the card
          column, so the component has to span the full 393". But 402 - 17 -
          369 = 16: left-[17px] on a 402 frame IS the card gutter, not an
          offset from it. 199703:31476 settles it — the hero is `left-[17px]
          w-[369px]` against a Content column of w-[370px] at px-[16px], so
          the two edges line up to within the frame's own 1px of drift.

          So the hero is a CARD, the same width as every card beneath it, and
          the wave simply fills it. The owner's "the waves component is not
          right and left symetric in the screen" was this bug; centring the
          wave inside a bled component made it symmetric without making it
          align, which is why it still looked wrong afterwards.

          It is still ALLOWED TO RUN PAST this element's own height — 291px of
          wave under 158px of copy — which is what puts it behind the first
          cards exactly as the frame draws it. Only the horizontal axis
          changed. */}
      {/* SUPPRESSED IN BAND MODE — see the `band` prop. Not a style switch:
          the layer only goes away when the CALLER is already painting this
          exact raster behind this exact box. If you reach for this, check that
          something above you is drawing HeroWaveArt at the same tone. */}
      {band ? null : (
      <div
        aria-hidden="true"
        className={cn(
          'absolute mix-blend-multiply [[data-theme]:not([data-theme=light])_&]:mix-blend-normal pointer-events-none rounded-[20px] top-0',
          /* THE ART SCALES WITH THE CARD, 2026-11-01. This was a flat
             `h-[291px]`, which is the frame's number and only the frame's
             number: 199703:31476 is 369 wide and its raster box is spelled
             `aspect-[369/291]`, i.e. 291 is what 369 PRODUCES, not an
             independent value. 369/291 is also exactly the source raster's
             own 738x582, so Figma is fitting the art, not cropping it.
             Pinned at 291 on this page's 361px card the box went 1.241:1
             against the art's 1.268:1, so object-cover quietly cropped 4px
             off each side and the blue ran 6.3px lower than a faithful
             scale. The aspect reproduces both: the art fits exactly and the
             wave scales with the card on any width.

             This is 6px of ARTWORK and 0px of LAYOUT -- the wave is absolute
             and aria-hidden, so it has never contributed to this element's
             height. It is not an answer to "the hero is too tall"; see the
             height note at the top of this file. */
          'inset-x-0 aspect-[369/291]',
        )}
        data-node-id={alert ? '199703:31476' : '199703:32478'}
      >
        {/* The node draws the raster at the card's full width and lets it
            crop vertically: `aspect-[369/291] left-0 right-0 top-0` with the
            image at `inset-0 size-full`. `object-cover` is what reproduces
            that here without pinning a height the raster has to match. */}
        <div className="absolute inset-0 overflow-hidden rounded-[20px] pointer-events-none">
          <img
            alt=""
            className="absolute inset-0 block size-full max-w-none object-cover"
            src={alert ? waveAlert : waveCalm}
          />
        </div>
      </div>
      )}

      {/* ── THE COPY ROW — 199703:30816 (alert) / 199703:31382 (calm) ───────
          The 2026-10-26 redraw. The card is 369x291 and every offset below is
          measured inside it, which is why this row is `w-[369px] mx-auto` —
          the same box the wave above already takes.

          `items-end` is the node's own alignment, not a choice: the copy block
          and the "All stats" pill share a bottom edge and nothing else.
          Reading that as one bottom-aligned row is what lets the pill keep its
          place when the figure wraps to a different height, which absolute
          offsets would not survive.

          pl-[18px] / pr-[17px] are the node's two gutters. They differ by a
          pixel and that is the frame, not a rounding error on our side.

          ── pb-[7px], AND IT IS THE ANSWER TO "IT LOOKS CRAMPED" ────────────
          Owner, on this hero as it rendered: "layout here needs to be improved
          in terms of spacing, padding etc." Measured against 199961:97440 with
          get_metadata rather than adjusted by eye, and the slack was real:

            copy block            142.0 tall     content 48 + 7 + 80 = 135
            -> 7px of it is EMPTY, at the BOTTOM

          So the change line is not supposed to touch the block's lower edge,
          and this row drew it touching. The 7 goes on the ROW rather than on
          the copy column because the node bottom-aligns the pill with the
          CONTENT (pill bottom y=142.045 against the block's own 148.086, i.e.
          6.04px clear of it) — with `items-end` and the padding here, the two
          columns and the pill all land on the same 135 and the row measures
          the node's 142. Putting it on the column instead would have pushed
          the pill down with it and kept the jam. */}
      <div
        className={cn(
          'relative flex w-full items-end justify-between pb-[7px]',
          /* The card's two gutters and its top padding, or neither — see the
             `band` prop for why all three go together. */
          band ? 'px-0 pt-0' : 'pl-[18px] pr-[17px] pt-[17px]',
        )}
        data-node-id={alert ? '199703:30816' : '199703:31382'}
      >
        {/* The copy block — 145x141 at (18, 17).
            LEFT-ALIGNED NOW. It was centred, and the centring was ours: the
            superseded 199396:84050 pinned the block at left-[132px], which put
            it 12.5px off a 393 frame's centre, and this file read that as
            canvas drift and corrected it. Both new nodes settle the question
            the other way — `items-start` at a flush 18px gutter — so the
            correction is gone with the node that motivated it.

            No fixed width. The node's 145 is just the caption's own measured
            run; pinning it would clip a longer range label, and this caption
            is fed real windows ("Nov 2025 - Oct 2026") rather than the frame's
            one example. */}
        {/* ── gap-[13px] -> gap-[7px], 2026-11-04 — MEASURED, NOT EYEBALLED ─
            The designer re-spaced this copy block into a component of its own
            (199820:58592) and get_metadata on it is unambiguous:

              caption frame   y= 0   145x48   two 24px lines, no gap
              figure frame    y=55   132x80
              ------------------------------------------------------------
              the gap is 7, not 13

            The 13 was never measured off a node — it was the slack left over
            when 48 + 80 was subtracted from a 141-tall block. The block's
            TOTAL was right by coincidence (48+13+80 = 141 against the node's
            142) and its DISTRIBUTION was wrong by 6px up here and 7px down at
            the bottom, which is exactly what "cramped at the bottom, loose in
            the middle" looks like and exactly why it had to be measured.
            See the row's pb-[7px] above for the other half. */}
        <div className="flex min-w-0 flex-col items-start gap-[7px]">
          {/* Caption over date range — 145x48, two 24px lines, no gap.
              199820:58505 y=0 h=24, 199820:58506 y=24 h=24. */}
          <div
            className="[word-break:break-word] flex flex-col items-start justify-center text-base text-white"
            data-node-id={alert ? 'I199703:30816;199703:30077' : 'I199703:31382;199703:32480'}
          >
            <p
              className="font-sans font-bold leading-6"
              data-node-id={alert ? 'I199703:30816;199703:30078' : 'I199703:31382;199703:32481'}
            >
              Water consumption
            </p>
            {/* The range keeps a node id of its own because a test addresses
                it directly — systemHeroSeeMore's `captionRange` reads this
                line to prove the hero and the chart name ONE window. */}
            {rangeLabel ? (
              <p
                className="font-sans font-medium leading-6"
                data-node-id={alert ? 'I199703:30816;199703:30079' : 'I199703:31382;199703:32482'}
              >
                {rangeLabel}
              </p>
            ) : null}
          </div>

          {/* The figure and the delta — a 132x80 box, `justify-end`. The 80 is
              the node's and the content is 78 (a 59px figure row over a 20px
              delta row, hard against each other with no gap), so the box
              bottom-aligns its pair and leaves the slack on top. Keeping the
              height means the "All stats" pill opposite does not move when the
              delta row is absent. */}
          <div className="flex h-[80px] flex-col items-start justify-end">
            {/* The figure row — gap 6, was 8. */}
            <div
              className={String.raw`[word-break:break-word] flex ${GEIST} font-medium gap-[6px] items-center leading-[0] shrink-0 text-white tracking-[-1.0556px] whitespace-nowrap`}
              data-node-id={alert ? 'I199703:30816;199703:30081' : 'I199703:31382;199703:32484'}
            >
              <p className="text-[42.222px] leading-[58.056px]">{total}</p>
              {unit ? (
                /* 12x59 with pt-[13px] — the node drops the unit 13px so it
                   rides the figure's baseline rather than its optical centre,
                   which is where plain `items-center` had been putting it. */
                <div className="flex h-[59px] w-[12px] flex-col items-center justify-center pt-[13px]">
                  <p className="text-[20px] leading-[20px]">{unit}</p>
                </div>
              ) : null}
            </div>

            {/* ── THE DELTA ROW — the pill is gone ──────────────────────────
                It was a 100x34 rounded-12 veil holding a signed "+120%". Both
                new nodes draw an unpilled row instead: a 10px triangle, the
                percentage, then the window it is measured against.

                THE SIGN MOVED INTO THE TRIANGLE. The frames draw "120%" and
                "96%" with no "+" or "-" anywhere — direction is carried by the
                glyph, which 199703:31382 flips with `-scale-y-100` rather than
                shipping a second icon. So the number here is the ABSOLUTE
                percentage and `deltaPct`'s sign only chooses the rotation.

                ZERO DRAWS NO TRIANGLE. Neither frame has a flat state and
                there is no third glyph to borrow, so an unchanged window gets
                the figure alone rather than an arrow that would have to claim
                a direction the data does not have. */}
            {deltaPct != null ? (
              <div
                className="flex items-center gap-[6px]"
                data-node-id={alert ? 'I199703:30816;199703:30086' : 'I199703:31382;199703:32489'}
                data-delta-direction={deltaPct > 0 ? 'up' : deltaPct < 0 ? 'down' : 'flat'}
              >
                <div className="flex items-center gap-[2px]">
                  {deltaPct === 0 ? null : (
                    <TriangleFill
                      size={10}
                      className={cn('shrink-0 text-white', deltaPct < 0 && '-scale-y-100')}
                    />
                  )}
                  <p
                    className={String.raw`${GEIST} font-medium text-[20px] leading-[20px] text-white tracking-[-1.0556px] whitespace-nowrap`}
                  >
                    {Math.abs(deltaPct)}%
                  </p>
                </div>
                {/* "vs. {window}". Rendered only when there IS a previous
                    window to name — on the oldest window, and at Yearly, the
                    percentage falls back to the window's own two halves and
                    there is no earlier span to print. The frame has no variant
                    for that, so this draws nothing rather than inventing a
                    caption for it. */}
                {compareLabel ? (
                  <p className="font-sans font-normal text-xs leading-[12px] text-[#fafbfc] opacity-90 whitespace-nowrap">
                    vs. {compareLabel}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* ── "ALL STATS" — 82x29 at (270, 129) ────────────────────────────
            SAME CONTROL, NEW NAME AND NEW PLACE. It read "See more" under the
            figure; both new nodes put it opposite the delta row and call it
            "All stats". The BEHAVIOUR is untouched and is still the 2026-10-20
            ruling — "see more is only redirect to consumption chart on the
            dates above, so see less is not relevant, and in addition
            consumption chart shall be always visible". It jumps to the chart,
            puts it on the window the caption names, and turns the
            previous-period comparison on. It opens nothing, so it still
            carries NO aria-expanded.

            The accessible name leads with the visible label (WCAG 2.5.3, so
            voice control matches what is drawn) and then says where the button
            goes, because "All stats" out of context does not tell a non-sighted
            user the page is about to move.

            Now bordered: a white hairline over the 28% veil, which the old
            unbordered ghost did not have. The veil follows the same theme rule
            as every other chip on a wave — `light` keeps the literal byte for
            byte, every other theme computes the 28% from --ink-on-color. */}
        {onJumpToChart ? (
          <Button
            type="button"
            variant="ghost"
            size={null}
            onClick={onJumpToChart}
            aria-label="All stats: go to the water consumption chart"
            /* ── THE TAP TARGET IS 40px; THE PAINT IS STILL THE NODE'S 29 ───
               199961:97440 measures this frame at 90.22 x 29.199 and that is
               what is drawn — the hero's one ACTION should not be resized away
               from a frame the owner has just redrawn. But 29px is the bare
               WCAG 2.5.8 floor (24) rather than a comfortable thumb, and it is
               the only thing on this artwork you can press.

               `after:` extends the hit area 5.5px above and below to 40 without
               moving a pixel of paint: the pseudo-element is transparent,
               inherits the button's own click, and cannot overlap anything —
               the pill sits hard right of a copy column that ends ~150px away,
               and the row's pb-[7px] absorbs the lower half. It needs
               `relative`, which it now carries. */
            className="relative flex h-[29px] shrink-0 items-center gap-[6px] rounded-[12px] border border-solid border-white bg-[rgba(241,245,249,0.28)] px-[7px] text-ink-on-color after:absolute after:inset-x-0 after:-inset-y-[5.5px] after:content-[''] hover:bg-card/30 hover:text-current [[data-theme]:not([data-theme=light])_&]:bg-[color-mix(in_oklab,var(--ink-on-color)_28%,transparent)]"
            data-node-id={alert ? 'I199703:30816;199703:30091' : 'I199703:31382;199703:32494'}
          >
            <Chart03 className="size-[16px] shrink-0" aria-hidden="true" />
            <span
              className={String.raw`[word-break:break-word] font-sans font-medium shrink-0 text-xs leading-[15px] whitespace-nowrap`}
            >
              All stats
            </span>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
