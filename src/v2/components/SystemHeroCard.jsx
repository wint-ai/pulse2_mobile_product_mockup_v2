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
  /** Fires the jump to the consumption chart. See the control below. */
  onJumpToChart,
  className,
}) {
  const alert = tone === 'alert'

  return (
    <div className={cn('relative shrink-0 w-full overflow-x-clip', className)} data-hero-tone={tone}>
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
      <div
        aria-hidden="true"
        className={cn(
          'absolute mix-blend-multiply [[data-theme]:not([data-theme=light])_&]:mix-blend-normal pointer-events-none rounded-[20px] top-0',
          'inset-x-0 h-[291px]',
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

      {/* ── THE COPY ROW — 199703:30816 (alert) / 199703:31382 (calm) ───────
          The 2026-10-26 redraw. The card is 369x291 and every offset below is
          measured inside it, which is why this row is `w-[369px] mx-auto` —
          the same box the wave above already takes.

          `items-end` is the node's own alignment, not a choice: the copy block
          runs y=17..158 and the "All stats" pill y=129..158, so the two share
          a bottom edge and nothing else. Reading that as one bottom-aligned
          row is what lets the pill keep its place when the figure wraps to a
          different height, which absolute offsets would not survive.

          pl-[18px] / pr-[17px] are the node's two gutters. They differ by a
          pixel and that is the frame, not a rounding error on our side. */}
      <div
        className="relative flex w-full items-end justify-between pl-[18px] pr-[17px] pt-[17px]"
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
        <div className="flex min-w-0 flex-col items-start gap-[13px]">
          {/* Caption over date range — 145x48, two 24px lines, no gap. */}
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
            className="flex h-[29px] shrink-0 items-center gap-[6px] rounded-[12px] border border-solid border-white bg-[rgba(241,245,249,0.28)] px-[7px] text-ink-on-color hover:bg-card/30 hover:text-current [[data-theme]:not([data-theme=light])_&]:bg-[color-mix(in_oklab,var(--ink-on-color)_28%,transparent)]"
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
