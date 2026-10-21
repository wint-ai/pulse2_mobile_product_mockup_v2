/**
 * Valve status card — v2, System page.
 *
 * SOURCE — the card was REDESIGNED. It is read from the saved emitted code of
 * the two current "System page_mobile" variants rather than re-fetched (Figma
 * MCP reads are metered and a rate-limit refusal reads exactly like a missing
 * node):
 *   sysA  199383:141499  ->  "IOT overview" 199383:141553
 *   sysB  199359:126785  ->  "IOT overview" 199384:143046
 * The two nodes are byte-identical apart from their ids and one gradient angle
 * (see GRADIENT below), so sysA's ids are carried as the canonical ones.
 *
 * WHAT CHANGED FROM THE PREVIOUS NODES (199296:50251 / 199296:50515)
 *   1. THE SWITCH IS GONE. The old card drove the valve from a SwitchToggle
 *      (track 199296:50257 + thumb + glyph). The new node has no switch at
 *      all: the action is a full "Close valve" Button (199383:141566) that
 *      takes the remaining width of the row (`flex-[1_0_0]`).
 *   2. The row is no longer title | value | switch across one line. It is now
 *      a two-column row (`gap-8`, `w-full`): a LEFT STACK (141555, `gap-8`)
 *      holding the title over a value line, and the Button beside it.
 *   3. The value line (141558, `gap-9.75`) leads with the valve glyph
 *      (141559, the 16.497x15.75 "Group") and then the state word at
 *      19.501/29.251 in slate-600 — the glyph moved out of the switch thumb
 *      and became part of the readout.
 *   4. The title is one style now. The old node branched it (calm: 18/18
 *      SemiBold slate-800 tracking -0.45; alert: 12/16 Medium slate-500); the
 *      new node draws Figtree Medium 500, 14/20, `var(--foreground,#0a0a0a)`
 *      in BOTH variants. The 215.5px title box survives unchanged.
 *   5. Card padding is `px-[16px]` + `items-start` (was `px-18` / `pl-18
 *      pr-20`), and the fixed `h-[67px] justify-center` calm height is gone —
 *      the card is content-sized in both states.
 *   6. The handling strip is no longer a red panel. `bg-red/50` is replaced by
 *      the page's own two-layer gradient, and its width is `w-full` rather
 *      than the old fixed 320px. Everything inside it (red/200 disc, 12px
 *      Phosphor warning, SemiBold 14/20 headline, Regular 14/20 body) is
 *      unchanged.
 *
 * GRADIENT — sysA emits 168.92503170733684deg, sysB 168.2758303032674deg for
 * the same strip. Figma re-derives the angle from the layer's bounding box, so
 * this is a measurement artefact rather than two designs; sysA's is used.
 *
 * ASSETS — nothing downloaded; no figma.com asset URL is referenced at
 * runtime. The "Group" (imgGroup, 832ed.svg) is this project's own valve mark:
 * it is the ValveStatus `open` variant scaled by 1.16258, so ValveStatus is
 * reused. The Phosphor warning glyph is inlined below from the export.
 *
 * TONE — the design gives ONE card, and it draws the handling strip. There is
 * no variant without it, so `tone` keeps the only job it can be shown to have:
 * `alert` draws the strip, `calm` omits it. (Reported: with the strip now
 * neutral rather than red, it may be intended on both states — the frames
 * cannot settle it.)
 *
 * WORDING — Figma only ever draws the valve OPEN, so it only ever draws
 * "Close valve". The closed-state action word has no frame; it is derived
 * ("Open valve") the same way the closed state word is, because a button that
 * still says "Close valve" on a shut valve is a dead control. Flagged as the
 * one invented string on this card.
 *
 * STATE — unchanged. There is no shared valve action in this app: the caller
 * owns the value and the confirmation. `onToggle(next)` still fires with
 * 'closed' | 'open', which is what SystemPageV2Screen turns into a
 * ValveConfirmSheet intent. Nothing is persisted here.
 */

import { cn } from '@/lib/utils'
import ValveStatus from '@/v2/components/ValveStatus'

/* sysA's ids. sysB draws the same card as
   141553->143046, 141554->143047, 141555->143048, 141556->143049,
   141557->143050, 141558->143051, 141559->143052, 141565->143058,
   141566->143059, 141567->143060, 141568->143061, 141569->143062,
   141570->143063, 141571->143064, 141572->143065. */
const NODE = {
  card: '199383:141553',
  row: '199383:141554',
  stack: '199383:141555',
  titleBox: '199383:141556',
  title: '199383:141557',
  valueRow: '199383:141558',
  glyph: '199383:141559',
  value: '199383:141565',
  button: '199383:141566',
  strip: '199383:141567',
}

// 199383:141553
const CARD = String.raw`bg-[#fafbfc] border border-solid border-white content-stretch flex flex-col gap-[16px] items-start px-[16px] py-[12px] relative rounded-[var(--rounded-3xl,22px)] shrink-0 w-full max-w-full min-w-0 overflow-hidden`

// 199383:141554
const ROW = String.raw`content-stretch flex gap-[8px] items-center relative shrink-0 w-full`

/* 199383:141555 — the title/value stack the Button sits beside. The node says
   `shrink-0`; here it may shrink, because the Button below is floored at its
   own text width (see BTN) and something has to give on a frame narrower than
   the node's. At 375 and up nothing does, so the node's geometry is what
   renders. */
const STACK = String.raw`content-stretch flex flex-col gap-[8px] items-start relative shrink min-w-0`

/* 199383:141556 — `w-[215.5px]`, the node's own number, restored.
   It was briefly `max-w-[215.5px] shrink-0` on the reasoning that a fixed box
   beside a `flex-[1_0_0]` button would overflow a 393 column. It does not —
   and the swap is what the owner saw: a max-width on a shrink-0 box with no
   width sizes to its CONTENT, so the stack collapsed to 77px and the growing
   Button swallowed 242 of the row's 327 (74%). The node gives the Button the
   REMAINDER of a 215.5px box: 103.5px at 393, 95.5 at 375 — about 30%, which
   is the two-column row the design draws. The box may shrink below 215.5 on a
   narrower frame; it never grows past it. */
const TITLE_BOX = String.raw`content-stretch flex items-center relative shrink min-w-0 w-[215.5px] max-w-full`

// 199383:141557 — ONE style now, no tone branch.
const TITLE = String.raw`[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/sm\/lh,20px)] relative shrink-0 text-[color:var(--foreground,#0a0a0a)] text-[length:var(--text\/sm\/size,14px)] whitespace-nowrap`

// 199383:141558
const VALUE_ROW = String.raw`content-stretch flex gap-[9.75px] items-center relative shrink-0`

// 199383:141559 — the "Group" box; ValveStatus fills it.
const GLYPH_BOX = String.raw`h-[15.75px] relative shrink-0 w-[16.497px]`

// 199383:141565
const VALUE = String.raw`[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-[var(--font\/weight\/font-medium,500)] justify-center leading-[0] relative shrink-0 text-[19.501px] text-[color:var(--colors\/slate\/600,#45556c)] whitespace-nowrap`

/* 199383:141566 "Button", verbatim apart from being a real <button> instead of
   Figma's <div> (the node already carries `cursor-pointer`, so it is meant to
   be one). Its two drop-shadow layers both resolve to rgba(0,0,0,0), i.e. no
   shadow, but they are carried rather than "corrected" like every other token
   on this card.
   ONE atom differs: the node's `min-w-px` becomes `min-w-fit`. `flex-[1_0_0]`
   is grow 1 / shrink 0 / basis 0, so the Button only ever takes the free space
   the 215.5px box leaves — 103.5px at 393, 95.5 at 375, both clear of the
   ~94px "Close valve" needs at 14/600 plus its 10px pads. Below ~370 the free
   space runs out, and `min-w-px` would let the pill crush its own label rather
   than let the title box give way; `min-w-fit` reverses that. At and above the
   node's own frame width the two are indistinguishable. */
const BTN = String.raw`bg-[#f2f6ff] border border-[var(--colors\/slate\/900,#0f172b)] border-solid content-stretch cursor-pointer drop-shadow-[var(--shadow\/x,0px)_var(--shadows\/scale\/none\/y,0px)_calc(var(--shadows\/scale\/none\/blur,0px)/2)_var(--shadows\/color\/transparent,rgba(0,0,0,0)),var(--shadow\/x,0px)_var(--shadow\/control\/layer-1\/y,0px)_calc(var(--shadow\/control\/layer-1\/blur,0px)/2)_var(--shadow\/control\/layer-1\/color,rgba(0,0,0,0))] flex flex-[1_0_0] gap-[var(--spacing\/1,4px)] items-center justify-center min-w-fit px-[var(--component\/button\/size-xs\/px,10px)] py-[12px] relative rounded-[var(--component\/button\/size-xs\/radius,26px)] outline-none transition-[filter] hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50`

// I199383:141566;100985:11132
const BTN_TEXT = String.raw`[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:SemiBold'),'Figtree','Inter',sans-serif] font-semibold leading-[var(--text\/button-xs\/size,20px)] relative shrink-0 text-[color:var(--colors\/slate\/900,#0f172b)] text-[length:var(--text\/button-xs\/size,14px)] whitespace-nowrap`

/* 199383:141567 — the handling strip. The old red/50 fill is gone; the node
   paints the page's own two-layer gradient, carried as an inline style because
   Figma emits it as one (an arbitrary Tailwind value cannot hold the commas). */
const STRIP = String.raw`content-stretch flex flex-col gap-[8px] h-[80px] items-start justify-center px-[13px] relative rounded-[11px] shrink-0 w-full max-w-full`
const STRIP_GRADIENT = {
  backgroundImage:
    'linear-gradient(168.92503170733684deg, rgba(233, 238, 248, 0.8) 29.24%, rgba(212, 226, 255, 0.8) 12.35%, rgba(228, 235, 250, 0.8) 17.588%, rgba(233, 237, 243, 0.8) 76.864%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
}

// Phosphor Icons / warning 199383:141570 — export verbatim (12x12). The
// shipped #FB2C36 is colors/red/500, so the strokes and the dot are
// currentColor and the call site pins text-red-500.
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
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 6.75V4.875" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6 9C6.31066 9 6.5625 8.74816 6.5625 8.4375C6.5625 8.12684 6.31066 7.875 6 7.875C5.68934 7.875 5.4375 8.12684 5.4375 8.4375C5.4375 8.74816 5.68934 9 6 9Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function ValveStatusCard({
  state = 'open',
  onToggle,
  /* Render the card as a READOUT: everything the design draws, minus the
     action. EventFocusOverlay needs the card's face but not a second way to
     shut the water off — the owner's "now we have 2 valve CTA", 2026-10-17 —
     and that surface already carries the primary in its footer. The previous
     fix was a hand copy of this card's atoms in that file, which silently went
     stale the moment this card was rebuilt. A prop here keeps one source. */
  interactive = true,
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
  const isOpen = state === 'open'
  // Figma draws "Open"; the closed wording has no frame, so it is derived and
  // still overridable, which is what keeps every drawn string a prop.
  const value = stateLabel ?? (isOpen ? 'Open' : 'Closed')
  // See WORDING above — "Open valve" is derived, not drawn.
  const action = isOpen ? 'Close valve' : 'Open valve'

  return (
    <div className={cn(CARD, className)} data-node-id={NODE.card} data-name="IOT overview" {...props}>
      <div className={ROW} data-node-id={NODE.row}>
        <div className={STACK} data-node-id={NODE.stack}>
          <div className={TITLE_BOX} data-node-id={NODE.titleBox}>
            <p className={TITLE} dir="auto" data-node-id={NODE.title}>
              {label}
            </p>
          </div>

          <div className={VALUE_ROW} data-node-id={NODE.valueRow}>
            {/* Figma wraps the exported SVG in an `inset-[-3.98%_-3.8%_…]`
                bleed box, which only exists because the export bakes the
                stroke outside the artwork's bounds. Our own vector draws
                inside its viewBox, so it fills the Group box directly; the
                box itself is the node's, to the thousandth. */}
            <div className={GLYPH_BOX} data-node-id={NODE.glyph} data-name="Group">
              <ValveStatus
                state={isOpen ? 'open' : 'closed'}
                className="absolute inset-0 block size-full"
                preserveAspectRatio="none"
              />
            </div>
            <div className={VALUE} data-node-id={NODE.value}>
              <p className="leading-[29.251px]" dir="auto">
                {value}
              </p>
            </div>
          </div>
        </div>

        {/* The card ASKS; it does not act. The caller turns this into a
            ValveConfirmSheet intent — same contract the switch had.
            As a readout the action is omitted entirely rather than disabled: a
            greyed button still reads as "you may do this here", and the point
            is that the control lives elsewhere on that surface. */}
        {interactive ? (
          <button
            type="button"
            onClick={() => onToggle?.(isOpen ? 'closed' : 'open')}
            className={BTN}
            data-node-id={NODE.button}
            data-name="Button"
          >
            <p className={BTN_TEXT}>{action}</p>
          </button>
        ) : null}
      </div>

      {t === 'alert' ? (
        <div className={STRIP} style={STRIP_GRADIENT} data-node-id={NODE.strip}>
          <div
            className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full"
            data-node-id="199383:141568"
          >
            <div
              className={String.raw`bg-[var(--colors\/red\/200,#ffc9c9)] content-stretch flex items-center justify-center relative rounded-[20px] shrink-0 size-[16px]`}
              data-node-id="199383:141569"
              data-name="rightIcon"
            >
              <div
                className="relative shrink-0 size-[12px] text-red-500"
                data-node-id="199383:141570"
                data-name="Phosphor Icons / warning"
              >
                <WarningGlyph />
              </div>
            </div>
            <p
              className={String.raw`[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:SemiBold'),'Figtree','Inter',sans-serif] font-[var(--font\/weight\/font-semibold,600)] leading-[var(--text\/sm\/lh,20px)] relative shrink-0 text-[color:var(--colors\/slate\/900,#0f172b)] text-[length:var(--text\/sm\/size,14px)] whitespace-nowrap`}
              data-node-id="199383:141571"
            >{`${handlingLabel} ${handling} `}</p>
          </div>
          <p
            className={String.raw`[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:Regular'),'Figtree','Inter',sans-serif] font-[var(--font\/weight\/font-normal,400)] leading-[var(--font\/line-height\/leading-5,20px)] relative shrink-0 text-[color:var(--colors\/gray\/700,#364153)] text-[length:var(--font\/size\/text-sm,14px)] tracking-[var(--font\/tracking\/tracking-normal,0px)] w-full`}
            data-node-id="199383:141572"
          >{`${handlingDescription} `}</p>
        </div>
      ) : null}
    </div>
  )
}
