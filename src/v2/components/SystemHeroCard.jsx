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
 */
import { ChartLine } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import wave from '@/assets/system-hero-wave.png'

/* The nodes spell two families — Geist for the figures, Figtree for the words.
   Both carry the project's own fallbacks.

   Every class string containing a backslash is String.raw: in a plain JS
   string `\/` collapses to a bare `/`, which Tailwind reads as an opacity
   modifier, and the class silently never reaches the DOM. These are template
   literals rather than cn() arguments for a second reason — tailwind-merge
   treats `leading-*` as conflicting with a font-size atom, and Figma emits
   alphabetically, so a `leading-[…]` written BEFORE a `text-[length:…]` is
   silently deleted. Where cn() IS used below, the size is spelled first. */
const FIG_BOLD = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:Bold'),'Figtree','Inter',sans-serif]`
const FIG_MED = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif]`
const FIG_REG = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:Regular'),'Figtree','Inter',sans-serif]`
const GEIST = "font-['Geist:Medium','Geist','Figtree',sans-serif]"

export default function SystemHeroCard({
  /** The headline figure WITHOUT its unit — 199383:141636 draws "5,830". */
  total,
  /** 199383:141637, a separate 20px run beside the figure. */
  unit,
  /** 199383:141639, inside the pill. */
  delta,
  rangeLabel,
  tone = 'calm',
  expanded = false,
  onToggleChart,
  className,
}) {
  const alert = tone === 'alert'

  return (
    <div className={cn('relative shrink-0 w-full overflow-x-clip', className)} data-hero-tone={tone}>
      {/* The wave — 199383:141500 (alert) / 199394:79634 (calm). `top-0`
          rather than the node's top-[148px] because this element now BEGINS
          where the node puts the wave; the left offsets are the node's own,
          which is why the page bleeds this component to the full phone width.

          aria-hidden: it is weather, not information — the figure in front of
          it carries the meaning. It is deliberately allowed to run past this
          element's own height, which is what puts it behind the first cards
          exactly as both frames draw it. */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute mix-blend-multiply pointer-events-none rounded-[20px] top-0',
          alert ? 'h-[291px] left-[17px] w-[369px]' : 'h-[303px] left-[9px] w-[385px]',
        )}
        data-node-id={alert ? '199383:141500' : '199394:79634'}
      >
        <div className="absolute inset-0 pointer-events-none rounded-[20px]">
          <div className="absolute inset-0 opacity-50 overflow-hidden rounded-[20px]">
            <img alt="" className="absolute h-full left-[-13.65%] max-w-none top-0 w-[121.84%]" src={wave} />
          </div>
          <div
            className={cn(
              'absolute inset-0 mix-blend-color rounded-[20px]',
              alert ? 'bg-[#ff7b7d]' : 'bg-[#6bb2fa]',
            )}
          />
        </div>
      </div>

      {/* The copy — 199396:84050. The node pins it absolutely at top-[171px],
          23px below the wave's own top edge (sysB: top-[186px], 38px below).
          Here it is in flow with that offset as a margin, so the hero occupies
          real height in the scroll instead of floating over what follows.

          mx-auto rather than the node's left-[132px]: 132 + 154/2 = 209 against
          a 393 frame centre of 196.5, i.e. the node's own block is 12.5px off
          centre. Centring it is the intent; the 12.5px is canvas drift. */}
      <div
        className="relative content-stretch flex flex-col gap-[5px] items-center mt-[23px] mx-auto w-[154px]"
        data-node-id="199396:84050"
      >
        {/* 199396:84051 — caption over date range, both centred and white. */}
        <div
          className={String.raw`[word-break:break-word] content-stretch flex flex-col items-start leading-[0] relative shrink-0 text-[color:var(--colors\/white,white)] text-[length:var(--text\/base\/size,16px)] text-center w-full`}
          data-node-id="199396:84051"
        >
          <div
            className={String.raw`flex flex-col ${FIG_BOLD} font-[var(--font\/weight\/font-bold,700)] justify-center relative shrink-0 w-full`}
            data-node-id="199383:141632"
          >
            <p className={String.raw`leading-[var(--text\/base\/lh,24px)]`}>Water consumption</p>
          </div>
          {rangeLabel ? (
            <div
              className={String.raw`flex flex-col ${FIG_MED} font-[var(--font\/weight\/font-medium,500)] justify-center relative shrink-0 w-full`}
              data-node-id="199383:141633"
            >
              <p className={String.raw`leading-[var(--text\/base\/lh,24px)]`}>{rangeLabel}</p>
            </div>
          ) : null}
        </div>

        {/* 199383:141635 — the figure and its unit. */}
        <div
          className={String.raw`[word-break:break-word] content-stretch flex ${GEIST} font-[var(--font\/weight\/font-medium,500)] gap-[8px] items-center leading-[0] relative shrink-0 text-[color:var(--colors\/white,white)] tracking-[-1.0556px] whitespace-nowrap`}
          data-node-id="199383:141635"
        >
          <div className="flex flex-col justify-center relative shrink-0 text-[42.222px]" data-node-id="199383:141636">
            <p className="leading-[58.056px]">{total}</p>
          </div>
          {unit ? (
            <div className="flex flex-col justify-center relative shrink-0 text-[20px]" data-node-id="199383:141637">
              <p className="leading-[20px]">{unit}</p>
            </div>
          ) : null}
        </div>

        {/* 199396:84052 — the delta pill, then the way into the chart. */}
        <div
          className="content-stretch flex flex-col gap-[5px] items-center relative shrink-0 w-full"
          data-node-id="199396:84052"
        >
          {delta ? (
            <div
              className="bg-[rgba(241,245,249,0.28)] content-stretch flex h-[34px] items-center justify-center relative rounded-[12px] shrink-0 w-[100px]"
              data-node-id="199383:141638"
            >
              <div
                className={String.raw`[word-break:break-word] flex flex-col ${GEIST} font-[var(--font\/weight\/font-medium,500)] justify-center leading-[0] relative shrink-0 text-[20px] text-[color:var(--colors\/white,white)] tracking-[-1.0556px] whitespace-nowrap`}
                data-node-id="199383:141639"
              >
                <p className="leading-[20px]">{delta}</p>
              </div>
            </div>
          ) : null}

          {/* 199396:84062 — "See more" reveals the consumption chart. The chart
              is not gone from the product: the design moved it behind this
              control, so this is the only way to reach it and it has to be a
              real button, never the label the comp draws. aria-expanded says
              which way it goes. */}
          {onToggleChart ? (
            <Button
              type="button"
              variant="ghost"
              size={null}
              onClick={onToggleChart}
              aria-expanded={expanded}
              className="content-stretch flex gap-[5px] items-center justify-center relative shrink-0 rounded-[8px] px-[8px] text-[#fafbfc] hover:bg-card/15 hover:text-current"
              data-node-id="199396:84062"
            >
              <ChartLine className="size-[16px] shrink-0" aria-hidden="true" />
              <span
                className={String.raw`[word-break:break-word] ${FIG_REG} font-[var(--font\/weight\/font-normal,400)] relative shrink-0 text-[length:var(--text\/xs\/size,12px)] leading-[var(--text\/xs\/lh-snug,16.5px)] whitespace-nowrap`}
                data-node-id="199383:141640"
              >
                {expanded ? 'See less' : 'See more'}
              </span>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
