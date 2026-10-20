/**
 * The System page's hero — Figma "System page_mobile", two states:
 *   calm   199296:50183   blue wave, the stat inside a glass panel
 *   alert  199296:50454   pink wave, the stat bare on the wave
 *
 * This is NOT a card. In both frames the wave is a page-level layer pinned to
 * the very top and bleeding past both edges (`left-[-2px] w-[410px]` on a 393
 * frame), with the Mobile Header Bar drawn ON it. So this component owns the
 * whole top region — wave, header bar, and the consumption headline — and the
 * page bleeds it out of its own padding. Drawing it as a bounded rounded card
 * was the first attempt and it read nothing like the comp.
 *
 * ONE ASSET, TWO STATES. Both nodes reference the same raster (`9c2cf.png`,
 * byte-identical in both exports); the red state is a tint layer over it, not a
 * second image:
 *
 *            wrapper                         image                      tint
 *   calm   h-463 mix-blend-multiply   opacity-90, 160.05% wide         none
 *   alert  h-341 mix-blend-multiply   opacity-50, 128.87% wide    #ff7b7d mix-blend-color
 *
 * The alert tint is a soft #ff7b7d at half opacity — not a saturated red. A
 * previous pass used #ff1717 and the wave came out crimson.
 *
 * WHAT THE NODES FIX
 *   glass panel  rgba(17,117,218,0.38), backdrop-blur 7.5, white border,
 *                radius 22, px-px py-13, gap-10 — calm only
 *   alert stat   h-120 w-121, justify-between, slate-50, no panel
 *   figure       Geist Medium 42.222 / 58.056, tracking -1.0556
 *   delta        the same run at 20px
 *   caption      "Water consumption " 14/18 Figtree Medium + the date range
 *                in Geist Bold 16/24
 *   see more     Figtree Light 14/18
 *   header bar   h-42, px-16 py-24, 18px Figtree Medium title, tracking -0.6
 *                — SUPERSEDED. See HEADER REDRAW below: 199383:141502 redraws
 *                  this bar at h-59 with a 16/24 slate-800 title.
 */
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import wave from '@/assets/system-hero-wave.png'

/* TOKENS AND CONTROLS — what this pass changed, and what it deliberately left.
 *
 * The type was already read off the nodes and is kept verbatim, including the
 * Figma-escaped var() spellings (`var(--colors\/white,white)`,
 * `var(--text\/sm\/size,14px)`). Two things were wrong and are fixed:
 *   · the calm caption / "See more" carried data-node-id 199296:50198 /
 *     50199. The node is 50197 (caption) and 50198 (See more) — 50199 is the
 *     Content frame's sibling. The alert ids (50721 / 50722) were right.
 *   · the burger and "See more" were bare <button>s wearing `hover:bg-white/30`
 *     and `focus-visible:ring-white/50`. Both are now shadcn <Button
 *     variant="ghost">, so the focus ring comes from --ring, and the on-wave
 *     hover tint is `bg-card/*` (--card is #FFFFFF: same pixel, a token name).
 *     `size={null}` switches cva's default size off so the node's own geometry
 *     (h-34 w-22 / px-8) is not fighting `h-9 px-4`.
 *
 * STILL LITERAL, because the Figma canvas names no token for them — all three
 * are read straight off the node and are documented above:
 *   #ff7b7d                the alert wave's mix-blend-color tint (199296:50455)
 *   rgba(17,117,218,0.38)  the calm glass panel's fill (199296:50193)
 *   border-white           the glass panel's 1px border, as Figma emits it
 * The burger glyph stays an inline <svg>: the node names "Huge Icons /
 * menu-01" and @/v2/icons only owns menu-10 (which carries an extra dot), so
 * swapping it would change the drawing. Adding Menu01 to the icon set is the
 * right fix and is outside this file.
 */

/* HEADER REDRAW — read off two NEWER System page_mobile frames, again from
 * saved emitted code, never a live Figma read:
 *   199383:141499  the alert frame   (header 199383:141502)
 *   199359:126785  the calm frame    (header 199359:126788)
 *
 * The two frames DISAGREE about the header, so only one could be followed.
 * 199383 is the later node and is the one this file now draws:
 *
 *            199383:141502 (followed)          199359:126788 (not followed)
 *   height   h-[59px]                          h-[42px]
 *   content  gap-y-[10px], justify-between     gap-[4px_10px], justify-center
 *   left     flex-1 group 141504: a 30px       a 22px burger + a 24px Remix
 *            round back control (141505,       arrow-left-s-line, tight gap-2
 *            #fafbfc on a white border,
 *            rounded-120.833, pr-2) holding
 *            a 24px Tabler chevron-left,
 *            then the scope slot 141507
 *   title    16/24 Figtree Medium slate-800,   18/32 Figtree Medium slate-800,
 *            no tracking, inside 141507        tracking -0.6, ABSOLUTELY
 *            (flex-1 h-28 pr-7 rounded-23)     positioned at left-[183px]
 *            followed by a 24px chevron-down
 *   right    Avatar 141510, size-28,           nothing
 *            rounded-[var(--rounded-full)]
 * Both frames agree the title ink is slate-800; this file drew slate-900, and
 * that is now fixed either way.
 *
 * WHAT THE NODE COULD NOT DICTATE, and why:
 *   burger          199383:141502 has no burger at all. It is the only thing
 *                   that opens the navigation drawer from `onOpenMenu`, so it
 *                   stays, inside the node's own flex-1 left group. Removing
 *                   it is the page owner's call, not this file's.
 *   chevron-left    the node's back control. The page fills `scope` with
 *                   ScopePill, which already draws a back chevron and owns the
 *                   back behaviour, so the circle is not duplicated here.
 *   chevron-down    drawn inside 141507 after the label. Omitted on the bare
 *                   `title` fallback — there is nothing to open from there, and
 *                   ScopePill draws its own caret when `scope` is passed.
 *   avatar photo    a raster on a figma.com/api/mcp/asset URL, which expires in
 *                   ~7 days and must never be referenced at runtime. There is
 *                   no local asset for it. The 28px rounded-full FRAME is kept
 *                   and carries `headerAction`.
 *   px-16           NEITHER new node emits horizontal padding on the bar — the
 *                   frame supplies 8px from its root `p-[8px]`, which this
 *                   component is deliberately bled out of by the page
 *                   (`-mx-[18px]`). px-16 is left as it was rather than swapped
 *                   for a derived number.
 *
 * NOT ACTED ON — the stat block and the wave both moved, and the two frames
 * contradict each other, so this is reported rather than guessed:
 *   · Neither frame draws the calm glass panel any more. 199359:126909 (calm)
 *     is the bare h-120 w-121 justify-between stack this file currently draws
 *     only for `alert`.
 *   · 199383:141631 (alert) reorders it completely: "Water consumption" 16/24
 *     Figtree Bold on top, then the date range, then a gap-8 row of the figure
 *     ("5,830" 42.222/58.056 + a separate "L" at 20/20) beside a delta PILL
 *     (bg rgba(241,245,249,0.28), h-34 w-70, rounded-9, "+120%" Geist Medium
 *     20/20), then "See more".
 *   · Ink is inverted between the frames: the alert frame draws white, the calm
 *     frame draws slate-50. This file draws the opposite pair.
 *   · Both stat blocks are absolutely positioned at page level (top-186 alert /
 *     top-163 calm, left-[calc(50%-0.5px)]), not in flow.
 *   · The wave is no longer full-bleed: 199383:141500 is h-303 left-9 w-385
 *     rounded-20 (alert tint, opacity-50 + #ff7b7d), 199359:127281 is h-411
 *     left-19 w-364 with no radius (opacity-90). Those two placements do not
 *     agree with each other either.
 *   · Both frames draw a Tabs row ("Overview" | "Locations", h-36, triggers
 *     h-32 rounded-14, a Badge h-20 on the second) between the header and the
 *     content. The page removed its tab row on purpose; nothing here re-adds it.
 */

/* The nodes spell two families — Geist for the figures, Figtree for the words.
   Both carry the project's own fallbacks. */
const FIG_MED = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif]`
const FIG_LIGHT = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:Light'),'Figtree','Inter',sans-serif]`
const GEIST = "font-['Geist:Medium','Geist','Figtree',sans-serif]"

export default function SystemHeroCard({
  title,
  total,
  delta,
  rangeLabel,
  tone = 'calm',
  expanded = false,
  onToggleChart,
  onOpenMenu,
  /** Replaces the centred title with a control. The comp centres a LOCATION
      name here ("Floor 26"), so this slot is where the parent-scope pill goes;
      the system's own name becomes the page H1 below. Falls back to `title`. */
  scope,
  /** Rendered at the right of the header bar. The delivery frame has no such
      control; this exists so the page can keep the one it already had rather
      than dropping it to match a picture. */
  headerAction,
  className,
}) {
  const alert = tone === 'alert'

  /* calm draws white, alert draws slate-50 — the nodes differ here. */
  const ink = alert
    ? String.raw`text-[color:var(--colors\/slate\/50,#f8fafc)]`
    : String.raw`text-[color:var(--colors\/white,white)]`

  const figure = (
    <div
      className={cn(
        'content-stretch flex gap-[2px] items-start justify-center leading-[0] relative shrink-0',
        GEIST, ink, 'font-medium tracking-[-1.0556px] whitespace-nowrap',
      )}
      data-node-id={alert ? '199296:50718' : '199296:50194'}
    >
      <div className="flex flex-col justify-center relative shrink-0 text-[42.222px]">
        <p className="leading-[58.056px]">{total}</p>
      </div>
      {delta ? (
        <div className="flex flex-col justify-center relative shrink-0 text-[20px]">
          <p className="leading-[58.056px]">{delta}</p>
        </div>
      ) : null}
    </div>
  )

  const caption = (
    <div
      className={cn('flex flex-col justify-center relative shrink-0 text-[0px]', FIG_MED, ink, 'font-medium')}
      data-node-id={alert ? '199296:50721' : '199296:50197'}
    >
      <p>
        <span className="leading-[var(--text\/base\/lh,18px)] text-[14px]">Water consumption </span>
        {rangeLabel ? (
          <span className="[word-break:break-word] font-['Geist:Bold','Geist',sans-serif] font-bold leading-[24px] text-[16px]">
            {rangeLabel}
          </span>
        ) : null}
      </p>
    </div>
  )

  /* "See more" reveals the consumption chart. The chart is not gone from the
     product — the design moved it behind this control, so this is the only way
     to reach it and it has to be a real button, never the label the comp
     draws. aria-expanded says which way it goes. */
  const seeMore = onToggleChart ? (
    <Button
      type="button"
      variant="ghost"
      size={null}
      onClick={onToggleChart}
      aria-expanded={expanded}
      className={cn(
        'flex flex-col justify-center relative shrink-0',
        FIG_LIGHT, ink,
        String.raw`font-light text-[length:var(--text\/sm\/size,14px)]`,
        'rounded-[8px] px-[8px]',
        'hover:bg-card/15 hover:text-current',
      )}
      data-node-id={alert ? '199296:50722' : '199296:50198'}
    >
      <span className="leading-[var(--text\/sm\/lh-tight,18px)]">
        {expanded ? 'See less' : 'See more'}
      </span>
    </Button>
  ) : null

  return (
    <div
      className={cn('relative shrink-0 w-full overflow-x-clip', className)}
      data-hero-tone={tone}
    >
      {/* The wave. 410px wide on a 393 frame, so it bleeds both edges; the
          phone shell clips it. aria-hidden because it is weather, not
          information — the figure in front of it carries the meaning. */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute left-[-2px] top-0 w-[410px] mix-blend-multiply pointer-events-none',
          alert ? 'h-[341px]' : 'h-[463px]',
        )}
        data-node-id={alert ? '199296:50455' : '199296:50184'}
      >
        {alert ? (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 opacity-50 overflow-hidden">
              <img alt="" className="absolute h-full left-[-14.44%] max-w-none top-0 w-[128.87%]" src={wave} />
            </div>
            <div className="absolute bg-[#ff7b7d] inset-0 mix-blend-color" />
          </div>
        ) : (
          <div className="absolute inset-0 opacity-90 overflow-hidden pointer-events-none">
            <img
              alt=""
              className="absolute h-[91.46%] left-[-14.44%] max-w-none top-[-17.81%] w-[160.05%]"
              src={wave}
            />
          </div>
        )}
      </div>

      {/* Mobile Header Bar — 199383:141502, the redrawn bar from the newer
          System page_mobile (199383:141499). It sits ON the wave, which is why
          it belongs to this component rather than to the page chrome above the
          scroller. See the HEADER REDRAW note at the top of this file for what
          the node changed and what it could not dictate here. */}
      <div
        className="content-stretch flex flex-col gap-[var(--pro\/space\/1\,5,6px)] h-[59px] items-center justify-center px-[var(--pro\/space\/4,16px)] py-[var(--pro\/space\/6,24px)] relative shrink-0 w-full"
        data-node-id="199383:141502"
        data-name="Mobile Header Bar"
      >
        {/* 199383:141503 "content" — the node emits row-gap only (column gap is
            0: the back control sits flush against the scope slot) and pushes
            the right-hand avatar out with justify-between. */}
        <div
          className="content-center flex flex-wrap gap-y-[10px] items-center justify-between relative shrink-0 w-full"
          data-name="content"
          data-node-id="199383:141503"
        >
          {/* 199383:141504 — the flex-1 left group. In the node it holds the
              round back control and the scope slot; here it also holds the
              drawer burger, which the node dropped but the app still needs. */}
          <div
            className="content-stretch flex flex-[1_0_0] items-center min-w-px relative"
            data-node-id="199383:141504"
          >
            <Button
              type="button"
              variant="ghost"
              size={null}
              onClick={onOpenMenu}
              aria-label="Open navigation"
              className="content-stretch flex gap-[var(--pro\/space\/1\,5,6.40148663520813px)] h-[34px] items-center justify-center p-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-default\/radius,10.669px)] shrink-0 w-[22px] text-[color:var(--colors\/slate\/900,#0f172b)] hover:bg-card/30 hover:text-current"
              data-node-id="I199359:126788;50600:52769;199359:126918"
            >
              {/* Huge Icons / menu-01 — three rules inset 20.83%/16.67% in a
                  17.071px box, which is what the node draws. */}
              <span className="overflow-clip relative shrink-0 size-[17.071px]">
                <svg viewBox="0 0 17 17" fill="none" className="block size-full" aria-hidden="true">
                  <path
                    d="M2.85 4.27h11.37M2.85 8.54h11.37M2.85 12.8h11.37"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </Button>

            {scope ?? (
              /* 199383:141507 — the scope slot, verbatim. The node puts a
                 24px chevron-down after the label; it is omitted on this
                 fallback because nothing is passed to open, and a caret with
                 no menu behind it is a false affordance. When the page passes
                 `scope` (it passes ScopePill, which draws its own caret and
                 its own back chevron) that control fills this slot instead. */
              <div
                className="content-stretch flex flex-[1_0_0] h-[28px] items-center justify-center min-w-px pr-[7px] relative rounded-[23px]"
                data-node-id="199383:141507"
              >
                <p
                  className={cn(
                    '[word-break:break-word] relative shrink-0 whitespace-nowrap',
                    FIG_MED,
                    String.raw`font-[var(--font\/weight\/font-medium,500)]`,
                    String.raw`leading-[var(--text\/base\/lh,24px)] text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/base\/size,16px)]`,
                  )}
                  dir="auto"
                  data-node-id="199383:141508"
                >
                  {title}
                </p>
              </div>
            )}
          </div>

          {/* 199383:141510 "Avatar" — a 28px rounded-full frame at the right of
              the bar. The node fills it with a photo served from an expiring
              figma.com asset URL, so the picture is not reproduced; the frame
              is, and it carries whatever control the page puts up here. */}
          <span
            className="content-stretch flex items-center justify-center relative rounded-[var(--rounded-full,9999px)] shrink-0 size-[28px]"
            data-node-id="199383:141510"
            data-name="Avatar"
          >
            {headerAction}
          </span>
        </div>
      </div>

      {/* The system's own name. It belongs to the hero, not to the column
          below: the wave runs 341-463px down the page, so a slate-800 H1
          placed under the hero landed ON the wave and could not be read.
          Here it takes the hero's own ink and works at either tone. The
          header bar says which location you are in; this says which
          system. */}
      {title ? (
        <h1
          className={cn(
            'relative mt-[14px] w-full px-[16px] text-center',
            FIG_MED, ink,
            String.raw`font-[var(--font\/weight\/font-medium,500)] text-[length:var(--text\/2xl\/size,24px)] tracking-[-0.6px] leading-[var(--text\/2xl\/lh,32px)]`,
          )}
          dir="auto"
          data-node-id="198379:80454"
        >
          {title}
        </h1>
      ) : null}

      {alert ? (
        /* 199296:50717 — no panel in the alert frame: the stat sits bare on the
           wave, h-120 between a 24px gap under the header and the Content. */
        <div
          className="content-stretch flex flex-col h-[120px] items-center justify-between leading-[0] mt-[24px] mb-[26px] relative shrink-0 whitespace-nowrap w-full"
          data-node-id="199296:50717"
        >
          {figure}
          {caption}
          {seeMore}
        </div>
      ) : (
        /* 199296:50193 "Copy" — the glass panel, calm only. Sits 25px under
           the header bar, inset to the Content column's own gutter. */
        <div className="mt-[25px] px-[var(--pro\/space\/2\,5,10px)] relative w-full">
          <div
            className="backdrop-blur-[7.5px] bg-[rgba(17,117,218,0.38)] border border-solid border-white content-stretch flex flex-col gap-[10px] items-center justify-center px-px py-[13px] relative rounded-[var(--rounded-3xl,22px)] shrink-0 w-full"
            data-node-id="199296:50193"
          >
            {figure}
            {caption}
            {seeMore}
          </div>
        </div>
      )}
    </div>
  )
}
