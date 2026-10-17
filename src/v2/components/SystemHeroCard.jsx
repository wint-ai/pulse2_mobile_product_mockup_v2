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
 */
import { cn } from '@/lib/utils'
import wave from '@/assets/system-hero-wave.png'

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
      data-node-id={alert ? '199296:50721' : '199296:50198'}
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
    <button
      type="button"
      onClick={onToggleChart}
      aria-expanded={expanded}
      className={cn(
        'flex flex-col justify-center relative shrink-0',
        FIG_LIGHT, ink,
        String.raw`font-light text-[length:var(--text\/sm\/size,14px)]`,
        'cursor-pointer rounded-[8px] px-[8px] outline-none',
        'hover:bg-white/15 focus-visible:ring-[3px] focus-visible:ring-white/50',
      )}
      data-node-id={alert ? '199296:50722' : '199296:50199'}
    >
      <span className="leading-[var(--text\/sm\/lh-tight,18px)]">
        {expanded ? 'See less' : 'See more'}
      </span>
    </button>
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

      {/* Mobile Header Bar — 199296:50192 / 199296:50463. It sits ON the wave,
          which is why it belongs to this component rather than to the page
          chrome above the scroller. */}
      <div
        className="content-stretch flex flex-col gap-[var(--pro\/space\/1\,5,6px)] h-[42px] items-center justify-center px-[var(--pro\/space\/4,16px)] py-[var(--pro\/space\/6,24px)] relative shrink-0 w-full"
        data-node-id={alert ? '199296:50463' : '199296:50192'}
      >
        {/* Figma emits this row's gap as the two-value token `gap-[4px_10px]`;
            Tailwind drops a two-length `gap-[…]`, so it is split per axis. */}
        <div className="content-center flex flex-wrap gap-x-[10px] gap-y-[4px] items-center relative shrink-0 w-full">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open navigation"
            className="content-stretch cursor-pointer flex gap-[var(--pro\/space\/1\,5,6.40148663520813px)] h-[34px] items-center justify-center p-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-default\/radius,10.669px)] shrink-0 w-[22px] text-[color:var(--colors\/slate\/900,#0f172b)] outline-none hover:bg-white/30 focus-visible:ring-[3px] focus-visible:ring-white/50"
            data-node-id={alert ? 'I199296:50463;50600:52769;199296:50457' : 'I199296:50192;50600:52769;199296:50186'}
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
          </button>

          {scope ?? (
            <p
              className={cn(
                '[word-break:break-word] flex-[1_0_0] min-w-px relative',
                FIG_MED,
                String.raw`font-[var(--font\/weight\/font-medium,500)]`,
                String.raw`text-[18px] text-[color:var(--colors\/slate\/900,#0f172b)] text-center tracking-[-0.6px] leading-[var(--text\/2xl\/lh,32px)]`,
              )}
              dir="auto"
              data-node-id={alert ? 'I199296:50463;50600:52769;199296:50458' : 'I199296:50192;50600:52769;199296:50187'}
            >
              {title}
            </p>
          )}

          {/* Balances the burger so the title stays optically centred, and
              carries whatever control the page still needs up here. */}
          <span className="flex items-center justify-end shrink-0 w-[22px]">{headerAction}</span>
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
