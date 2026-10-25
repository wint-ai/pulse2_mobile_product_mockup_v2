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
const CARD = String.raw`bg-surface-card border border-solid border-card content-stretch flex flex-col gap-[16px] items-start px-[16px] py-[12px] relative rounded-[22px] shrink-0 w-full max-w-full min-w-0 overflow-hidden`

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
const TITLE = String.raw`[word-break:break-word] font-sans font-medium leading-5 relative shrink-0 text-foreground text-sm whitespace-nowrap`

// 199383:141558
const VALUE_ROW = String.raw`content-stretch flex gap-[9.75px] items-center relative shrink-0`

// 199383:141559 — the "Group" box; ValveStatus fills it.
const GLYPH_BOX = String.raw`h-[15.75px] relative shrink-0 w-[16.497px]`

// 199383:141565
/* 199683:24796 — 24px/24 medium on slate-800 at -0.6 tracking. It was
   19.501px/slate-600 from 199383:141557; the redraw makes the state the
   loudest thing in the row, which is the point of the row. */
const VALUE = String.raw`[word-break:break-word] font-sans font-medium relative shrink-0 text-2xl leading-6 tracking-[-0.6px] text-slate-800 whitespace-nowrap`

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
/* 199683:24797 — the CTA, redrawn 2026-10-25. Three changes off the old
   199383:141566: the fill is slate-100 rather than --accent, the box is the
   node's own w-[161px] instead of flex-[1_0_0], and the label steps up to
   16px/24. The fixed width is why STACK below may shrink — see its note. */
const BTN = String.raw`bg-slate-100 border border-slate-900 border-solid content-stretch cursor-pointer drop-shadow-[0px_0px_0px_transparent,0px_0px_0px_transparent] flex gap-1 items-center justify-center shrink-0 w-[161px] px-2.5 py-[12px] relative rounded-[26px] outline-none transition-[filter] hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50`

// I199383:141566;100985:11132
const BTN_TEXT = String.raw`[word-break:break-word] font-sans font-semibold relative shrink-0 text-slate-900 text-base leading-6 whitespace-nowrap`

/* 199383:141567 — the handling strip. The old red/50 fill is gone; the node
   paints the page's own two-layer gradient, carried as an inline style because
   Figma emits it as one (an arbitrary Tailwind value cannot hold the commas). */
/* 199683:24810 — the AUTO-CLOSE panel, redrawn 2026-10-25. It replaced a
   fixed h-[80px] "Valve handling: X" strip on the page's own gradient; the
   new node is a flat slate-100 tile that sizes to its content, because its
   two states are different heights (a countdown is one line, the warning is
   three). The gradient and the fixed height go with the old node. */
const STRIP = String.raw`bg-slate-100 content-stretch flex flex-col gap-[16px] items-start justify-center px-[13px] py-[9px] relative rounded-[11px] shrink-0 w-full max-w-full`
/* 199683:24812 — label and badge, pushed apart. */
const STRIP_ROW = String.raw`content-stretch flex items-center justify-between relative shrink-0 w-full`
const STRIP_LABEL = String.raw`[word-break:break-word] font-sans font-medium relative shrink-0 text-slate-600 text-sm leading-5 whitespace-nowrap`
/* I199683:24816 — the state badge. The node's px/py/gap/radius are the
   design-system's badge tokens at their emitted values (6.6 / 2.2 / 4.4 /
   28.6), kept rather than rounded so the pill matches the other badges the
   frame draws beside it. */
const STRIP_BADGE = String.raw`bg-surface-card content-stretch flex gap-[4.4px] h-[22px] items-center justify-center overflow-clip px-[6.6px] py-[2.2px] relative rounded-[28.6px] shrink-0`
const STRIP_BADGE_TEXT = String.raw`[word-break:break-word] font-sans font-medium leading-[17.6px] overflow-hidden relative shrink-0 text-[13.2px] text-slate-700 text-ellipsis whitespace-nowrap`
const STRIP_BODY = String.raw`content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full`
/* 199683:24831 — the countdown. 24px/24 medium on slate-800, the digits and
   the colon as separate runs exactly as the node splits them. */
/* The node prints two digits a side; a 7 would otherwise read as 0:7. */
const pad2 = (n) => String(n).padStart(2, '0')
const STRIP_CLOCK = String.raw`content-stretch flex font-sans font-medium gap-[3px] items-center leading-6 relative shrink-0 text-slate-800 text-2xl`
/* The wash, themed. The angle stays here, the colours come from the shipped
   stop list — under `light` that token IS the rgba literal this carried, so
   `light` is byte-identical. NOT var(--chip-bg)/var(--app-bg): those bake one
   angle in at :root and a call-site angle override cannot reach them. See
   WintSidebarV2.jsx for the full note. */
const WASH_BASE = 'linear-gradient(90deg, var(--card) 0%, var(--card) 100%)'

/* Painted as literals this strip stayed #edf1f9 under `dark` while its own
   text followed the theme: "Valve handling: Auto shut-off" measured 1.08:1. */
const STRIP_GRADIENT = {
  /* --app-bg-stops, not --chip-bg-stops: this strip's stops are the page
     root's set (29.24 / 12.35 / 17.588 / 76.864), not the chip set. */
  backgroundImage:
    `linear-gradient(168.92503170733684deg, var(--app-bg-stops)), ${WASH_BASE}`,
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
  /* 199683:24813 — the panel's own label. "Valve handling:" was the old
     node's; the redraw names the setting instead of the behaviour. */
  handlingLabel = 'Auto-close Valve',
  /* The badge. The frames draw exactly two words for it, and they are the
     states buildPolicy() already returns through policy.autoShutoff:
     199683:24849 "On" / 199394:78935 "Disabled". */
  handling = 'On',
  handlingDescription = 'In case a Leak is detected — the valve will not automatically shut off and water loss is at risk',
  /* WHEN auto-close fires, as the countdown in 199683:24849 ("Will activate
     in 00 : 00"). NOT DEFAULTED, and that is deliberate: nothing in this
     app's data layer carries an auto-close delay — systemDetails.js records
     autoShutoff as Enabled/Disabled/N/A and no timing at all. The node's
     00:00 is a Figma placeholder, and a zeroed clock rendered as if measured
     is the "25K L" defect again. Pass {minutes, seconds} when the data
     exists; until then the On state shows the badge and no clock. */
  activatesIn = null,
  /* 199683:24824 / 199683:24834 — both frozen Figma strings, kept as props so
     every drawn word on this card is one, which is this file's own rule. */
  attentionLabel = 'Attention',
  activatesInLabel = 'Will activate in',
  tone = 'calm',
  className,
  ...props
}) {
  const t = tone === 'alert' ? 'alert' : 'calm'
  /* One branch for the whole panel. 'Disabled' is what buildPolicy() returns
     and what 199394:78935 draws; anything else is treated as on, so an
     unconfigured card renders the 199683:24849 state the frame ships. */
  const autoCloseOff = String(handling).toLowerCase() === 'disabled'
  const isOpen = state === 'open'
  // Figma draws "Open"; the closed wording has no frame, so it is derived and
  // still overridable, which is what keeps every drawn string a prop.
  const value = stateLabel ?? (isOpen ? 'Open' : 'Closed')
  // See WORDING above — "Open valve" is derived, not drawn.
  /* 199683:24797 draws "Close valve now". The open wording has no frame, so
     it is derived and still overridable, which is this file's rule for every
     drawn string. */
  const action = isOpen ? 'Close valve now' : 'Open valve now'

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
        /* 199683:24810. `disabled` drives BOTH halves off one branch — the
           badge and the body under it. The old strip switched its headline on
           the policy and left the sentence at a default, so a system with
           auto-close off read "Auto shut-off" over the auto-shut-off
           sentence; the panel contradicted its own first line. */
        <div className={STRIP} data-node-id="199683:24810">
          <div className={STRIP_ROW} data-node-id="199683:24812" data-name="Row">
            <p className={cn('font-sans', STRIP_LABEL)} data-node-id="199683:24813">
              {handlingLabel}
            </p>
            <div className={STRIP_BADGE} data-node-id="199683:24816" data-name="Badge">
              <p className={cn('font-sans', STRIP_BADGE_TEXT)}>{handling}</p>
            </div>
          </div>

          <div className={STRIP_BODY} data-node-id="199683:24820">
            {autoCloseOff ? (
              <>
                {/* 199683:24821 — the warning. Only this state draws it; the
                    node gives the On state no icon at all. */}
                <div
                  className="content-stretch flex gap-[6px] items-center relative shrink-0 w-full"
                  data-node-id="199683:24821"
                >
                  <div
                    className={String.raw`bg-red-200 content-stretch flex items-center justify-center relative rounded-[20px] shrink-0 size-[16px]`}
                    data-node-id="199683:24822"
                    data-name="rightIcon"
                  >
                    <div
                      className="relative shrink-0 size-[12px] text-red-500"
                      data-node-id="199683:24823"
                      data-name="Phosphor Icons / warning"
                    >
                      <WarningGlyph />
                    </div>
                  </div>
                  <p
                    className={String.raw`[word-break:break-word] font-sans font-semibold leading-5 relative shrink-0 text-slate-900 text-sm whitespace-nowrap`}
                    data-node-id="199683:24824"
                  >
                    {attentionLabel}
                  </p>
                </div>
                <p
                  className={String.raw`[word-break:break-word] font-sans font-normal leading-5 relative shrink-0 text-gray-700 text-sm tracking-normal w-full`}
                  data-node-id="199683:24825"
                >
                  {handlingDescription}
                </p>
              </>
            ) : activatesIn ? (
              <>
                {/* 199683:24831 — digits and colon as three runs, which is how
                    the node splits them and what lets the colon keep its own
                    3px gaps while the digits stay tabular. */}
                <div className={cn('font-sans', STRIP_CLOCK)} data-node-id="199683:24830">
                  <p className="relative shrink-0" dir="auto">{pad2(activatesIn.minutes)}</p>
                  <p className="relative shrink-0" dir="auto">:</p>
                  <p className="relative shrink-0" dir="auto">{pad2(activatesIn.seconds)}</p>
                </div>
                <p
                  className={String.raw`[word-break:break-word] font-sans font-normal leading-5 relative shrink-0 text-slate-600 text-sm w-full`}
                  data-node-id="199683:24834"
                >
                  {activatesInLabel}
                </p>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
