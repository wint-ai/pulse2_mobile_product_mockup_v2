/**
 * Valve status card — v2, both states of the redesigned System page.
 *
 * SOURCE — two nodes inside two different "System page_mobile" frames:
 *   calm   199296:50251  (in 199296:50183)  card only, one row
 *   alert  199296:50515  (in 199296:50454)  same row + a red "Valve handling" strip
 *
 * The two are ONE component driven by `tone`, because the row itself is not
 * identical between them — see TONE DIFFS below. Every emitted Tailwind class
 * is carried across literally (the `var(--token,fallback)` arbitrary values
 * included); each node keeps its own `data-node-id`.
 *
 * TONE DIFFS (calm -> alert), all of them:
 *   1. Card padding/height. calm: `h-[67px] justify-center px-[18px]`.
 *      alert: no fixed height, no justify-center, `pl-[18px] pr-[20px]` —
 *      the right pad grows by 2px and the card is content-sized.
 *   2. Row layout. calm: `flex items-center justify-between w-full` (title,
 *      value and switch pushed apart across the full width).
 *      alert: `flex gap-[8px] items-center` with NO `w-full` and no
 *      `justify-between` — the three children sit packed at the left.
 *   3. Title typography. calm is the card heading: Figtree SemiBold 600,
 *      18/18, slate-800 #1d293d, tracking -0.45px.
 *      alert demotes it to a caption: Figtree Medium 500, 12/16,
 *      slate-500 #62748e, no tracking. (The 215.5px title box is unchanged.)
 *   4. alert appends the strip 199296:50532 — red/50 panel, 80px tall,
 *      radius 11, px-13, a red/200 disc holding a 12px Phosphor warning glyph,
 *      a SemiBold 14/20 slate-900 headline and a Regular 14/20 gray-700 body.
 *   The value text ("Open") and the whole SwitchToggle are byte-identical
 *   between the two nodes; only their node ids differ.
 *
 * ASSETS — nothing downloaded. The glyph riding the switch thumb (imgGroup,
 * 8daa2.svg) is this project's own valve mark: the SVG is the ValveStatus
 * `open` variant scaled by exactly 1.16258 (14.5649x13.9511 vs 12.5282x12,
 * stroke 1.02908 vs 0.885173), so ValveStatus is reused rather than re-fetched.
 * Figma's own box for it stretches the artwork, hence preserveAspectRatio.
 * The Phosphor warning glyph is inlined from the export verbatim.
 *
 * STATE — there is no shared valve action in this app. Like ValveControlCard
 * (v1) and SystemPageV2Screen's `closedValves` map, the caller owns the value:
 * pass `state` + `onToggle`. Nothing is persisted here.
 */

import { cn } from '@/lib/utils'
import ValveStatus from '@/v2/components/ValveStatus'

/* Figma node ids, per tone — the two frames draw the same card with different
   ids, so the attribute has to follow the tone or half of them would be lies. */
const NODE = {
  calm: {
    card: '199296:50251',
    row: '199296:50252',
    titleBox: '199296:50253',
    title: '199296:50254',
    value: '199296:50255',
    switchBox: '199296:50256',
    track: '199296:50257',
    thumb: '199296:50258',
    glyph: '199296:50259',
  },
  alert: {
    card: '199296:50515',
    row: '199296:50516',
    titleBox: '199296:50517',
    title: '199296:50518',
    value: '199296:50519',
    switchBox: '199296:50520',
    track: '199296:50521',
    thumb: '199296:50522',
    glyph: '199296:50523',
  },
}

// Shared between 199296:50251 and 199296:50515; the tone-specific padding and
// height are appended per tone below.
const CARD = String.raw`bg-[#fafbfc] border border-solid border-white content-stretch flex flex-col gap-[16px] items-start py-[12px] relative rounded-[var(--rounded-3xl,22px)] shrink-0 w-full max-w-full min-w-0 overflow-hidden`

const CARD_TONE = {
  calm: String.raw`h-[67px] justify-center px-[18px]`,
  alert: String.raw`pl-[18px] pr-[20px]`,
}

const ROW_TONE = {
  calm: String.raw`content-stretch flex items-center justify-between relative shrink-0 w-full`,
  /* Figma emits this row without w-full or justify-between, and with a
     shrink-0 215.5px title box — measured on a 375pt frame. At 393 with this
     card's own padding the three children's intrinsic width exceeds the
     column, and because the row cannot shrink it pushed the switch off the
     right edge of the phone and gave the page a horizontal scrollbar. Same
     three children, same gap; the row now fills its parent and the title
     takes the slack, which is what 215.5 was expressing. */
  alert: String.raw`content-stretch flex gap-[8px] items-center justify-between relative shrink-0 w-full`,
}

const TITLE_TONE = {
  calm: String.raw`[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:SemiBold'),'Figtree','Inter',sans-serif] font-[var(--font\/weight\/font-semibold,600)] leading-[var(--text\/lg\/lh-none,18px)] relative shrink-0 text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/lg\/size,18px)] tracking-[-0.45px] whitespace-nowrap`,
  alert: String.raw`[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/xs\/lh,16px)] relative shrink-0 text-[color:var(--colors\/slate\/500,#62748e)] text-[length:var(--text\/xs\/size,12px)] whitespace-nowrap`,
}

const VALUE = String.raw`[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-[var(--font\/weight\/font-medium,500)] justify-center leading-[0] relative shrink-0 text-[color:var(--colors\/slate\/600,#45556c)] text-[length:var(--text\/base\/size,16px)] whitespace-nowrap`

/* SwitchToggle 199296:50257 / 199296:50521, verbatim apart from (a) being a
   real <button role="switch"> instead of Figma's <div>, and (b) the off branch.
   Figma only ever draws the valve OPEN, where the track is overridden to
   wint-blue-accent while the thumb and border still resolve the "off" tokens —
   that mix is the design, not a mistake, so it is kept. `closed` has no frame;
   it mirrors the open one onto the project's existing off-track token. */
const TRACK = String.raw`border-[1.469px] border-[var(--component\/switch\/border\/off,rgba(0,0,0,0))] border-solid content-stretch drop-shadow-[var(--shadow\/x,0px)_var(--shadows\/scale\/none\/y,0px)_calc(var(--shadows\/scale\/none\/blur,0px)/2)_var(--shadows\/color\/transparent,rgba(0,0,0,0)),var(--shadow\/x,0px)_var(--shadow\/control\/layer-1\/y,0px)_calc(var(--shadow\/control\/layer-1\/blur,0px)/2)_var(--shadow\/control\/layer-1\/color,rgba(0,0,0,0))] flex h-[27.025px] items-center p-[1.469px] relative rounded-[14686.031px] shrink-0 w-[47px] cursor-pointer outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50`

/* A switch's thumb sits on the side its state points at: right when open,
   left when closed. Figma draws this control only in its open state and
   places the thumb LEFT on a blue track — faithful to the frame, but on a
   real screen it reads as "off" next to a label saying "Open", which is how
   it was reported. The frame is drawing an off-state thumb over an on-state
   track; we follow the semantics, not that artefact. */
const TRACK_ON = String.raw`bg-[var(--wint-blue-accent,#0b81f8)] justify-end`
const TRACK_OFF = String.raw`bg-[var(--component\/switch\/track\/off-bg,#e5e5e5)] justify-start`

const THUMB = String.raw`bg-[var(--component\/switch\/off-thumb-bg,white)] relative flex items-center justify-center overflow-hidden rounded-[14686.031px] shadow-[var(--shadow\/x,0px)_var(--shadow\/switch-thumb\/layer-2\/y,0px)_var(--shadow\/switch-thumb\/layer-2\/blur,0px)_var(--shadow\/switch-thumb\/layer-2\/spread,0px)_var(--shadow\/switch-thumb\/layer-2\/color,rgba(0,0,0,0)),var(--shadow\/x,0px)_var(--shadow\/switch-thumb\/layer-1\/y,0px)_var(--shadow\/switch-thumb\/layer-1\/blur,0px)_var(--shadow\/switch-thumb\/layer-1\/spread,0px)_var(--shadow\/switch-thumb\/layer-1\/color,rgba(0,0,0,0))] shrink-0 size-[23.5px]`


// Phosphor Icons / warning 199296:50535 — export verbatim (12x12, #FB2C36).
function WarningGlyph() {
  return (
    <svg
      className="absolute block inset-0 max-w-none size-full"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6.67547 1.88531L10.7752 9.00422C11.0625 9.50578 10.6913 10.125 10.0997 10.125H1.90031C1.30875 10.125 0.9375 9.50578 1.22484 9.00422L5.32453 1.88531C5.61984 1.37156 6.38016 1.37156 6.67547 1.88531Z"
        stroke="#FB2C36"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 6.75V4.875" stroke="#FB2C36" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6 9C6.31066 9 6.5625 8.74816 6.5625 8.4375C6.5625 8.12684 6.31066 7.875 6 7.875C5.68934 7.875 5.4375 8.12684 5.4375 8.4375C5.4375 8.74816 5.68934 9 6 9Z"
        fill="#FB2C36"
      />
    </svg>
  )
}

export default function ValveStatusCard({
  state = 'open',
  onToggle,
  label = 'Valve status',
  stateLabel,
  handlingLabel = 'Valve handling:',
  handling = 'Auto shut-off',
  handlingDescription = 'In case a Leak is detected — the valve will automatically shut off',
  tone = 'calm',
  className,
  ...props
}) {
  const t = tone === 'alert' ? 'alert' : 'calm'
  const id = NODE[t]
  const isOpen = state === 'open'
  // Figma draws "Open"; the closed wording has no frame, so it is derived and
  // still overridable, which is what keeps every drawn string a prop.
  const value = stateLabel ?? (isOpen ? 'Open' : 'Closed')

  return (
    <div
      className={cn(CARD, CARD_TONE[t], className)}
      data-node-id={id.card}
      data-name="IOT overview"
      {...props}
    >
      <div className={ROW_TONE[t]} data-node-id={id.row}>
        <div
          className="content-stretch flex min-w-0 flex-1 items-center relative max-w-[215.5px]"
          data-node-id={id.titleBox}
        >
          <p className={TITLE_TONE[t]} dir="auto" data-node-id={id.title}>
            {label}
          </p>
        </div>
        <div className={VALUE} data-node-id={id.value}>
          <p className={String.raw`leading-[var(--text\/base\/lh,24px)]`} dir="auto">
            {value}
          </p>
        </div>
        <div
          className="content-stretch flex items-center relative shrink-0"
          data-node-id={id.switchBox}
        >
          <button
            type="button"
            role="switch"
            aria-checked={isOpen}
            aria-label={label}
            onClick={() => onToggle?.(isOpen ? 'closed' : 'open')}
            className={cn(TRACK, isOpen ? TRACK_ON : TRACK_OFF)}
            data-node-id={id.track}
            data-name="SwitchToggle"
          >
            {/* The glyph rides INSIDE the thumb rather than being absolutely
                placed against the track. Figma positions it with percentage
                insets measured off the 44.062x24.087 padding box and stretches
                it (preserveAspectRatio="none"); at our resolved size that put
                the mark outside the white circle and left it behind when the
                thumb moved. Centring it in the thumb keeps the two together in
                both states, at the glyph's own aspect ratio. */}
            <span className={THUMB} data-node-id={id.thumb} data-name="thumb">
              <ValveStatus
                state={isOpen ? 'open' : 'closed'}
                /* 15px, not the 13.5 the frame resolves to: the artwork's
                   0.885 stroke on a 12.5 viewBox lands under a pixel at 13.5
                   and reads as a smudge on a 23.5px thumb. */
                className="block size-[15px]"
                data-node-id={id.glyph}
              />
            </span>
          </button>
        </div>
      </div>

      {t === 'alert' ? (
        /* 199296:50532 — the strip only the alert frame draws. Figma fixes it
           at 320px, the content width of the 375pt frame; max-w-full keeps it
           from overflowing a narrower host without changing it at that width. */
        <div
          className={String.raw`bg-[var(--colors\/red\/50,#fef2f2)] content-stretch flex flex-col gap-[8px] h-[80px] items-start justify-center px-[13px] relative rounded-[11px] shrink-0 w-[320px] max-w-full`}
          data-node-id="199296:50532"
        >
          <div
            className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full"
            data-node-id="199296:50533"
          >
            <div
              className={String.raw`bg-[var(--colors\/red\/200,#ffc9c9)] content-stretch flex items-center justify-center relative rounded-[20px] shrink-0 size-[16px]`}
              data-node-id="199296:50534"
              data-name="rightIcon"
            >
              <div
                className="relative shrink-0 size-[12px]"
                data-node-id="199296:50535"
                data-name="Phosphor Icons / warning"
              >
                <WarningGlyph />
              </div>
            </div>
            <p
              className={String.raw`[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:SemiBold'),'Figtree','Inter',sans-serif] font-[var(--font\/weight\/font-semibold,600)] leading-[var(--text\/sm\/lh,20px)] relative shrink-0 text-[color:var(--colors\/slate\/900,#0f172b)] text-[length:var(--text\/sm\/size,14px)] whitespace-nowrap`}
              data-node-id="199296:50536"
            >{`${handlingLabel} ${handling} `}</p>
          </div>
          <p
            className={String.raw`[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:Regular'),'Figtree','Inter',sans-serif] font-[var(--font\/weight\/font-normal,400)] leading-[var(--font\/line-height\/leading-5,20px)] relative shrink-0 text-[color:var(--colors\/gray\/700,#364153)] text-[length:var(--font\/size\/text-sm,14px)] tracking-[var(--font\/tracking\/tracking-normal,0px)] w-full`}
            data-node-id="199296:50537"
          >{`${handlingDescription} `}</p>
        </div>
      ) : null}
    </div>
  )
}
