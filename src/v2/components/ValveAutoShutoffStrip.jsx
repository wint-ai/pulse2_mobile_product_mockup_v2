/**
 * The auto-shutoff strip on the Valve status card — 199683:26016, the compact
 * one, with its sentence moved behind a tap.
 *
 * ── WHAT THIS REPLACES ────────────────────────────────────────────────────
 * Owner, 2026-11-08, on a screenshot of the card:
 *     "replace this with how it show in figam - this sentence can be added as
 *      a tool tip if someone clicks"
 * The thing being replaced is `ValveStatusCard`'s two-line warning block:
 *     [!] Valve handling: Auto shut-off
 *     In case a Leak is detected — the valve will automatically shut off
 * 80px of fixed-height gradient, a red warning disc, a headline and a
 * sentence, drawn on every alerting System page whether or not anything about
 * auto-shutoff was in question.
 *
 * 199683:26036 -> 199683:26037 draws ONE 38px strip instead: a slate-100 tile
 * holding a label and a state badge, nothing else. The sentence
 * (199683:26038) is a `hidden="true"` child of that frame — the DESIGN itself
 * retires it from the card face. The owner's instruction is what brings it
 * back, behind a tap.
 *
 * ── THE EXPLANATION IS NOT A TOOLTIP, AND THAT IS NOT A STYLE CHOICE ──────
 * Two independent reasons, both already recorded in this repo:
 *
 *   1. A Radix `Tooltip` PORTALS TO document.body and escapes Phone.jsx's
 *      fixed 393x852 frame. `AccountScreenV2.jsx:644-656` records the
 *      prohibition, `FilterSheet.jsx:92` restates it, and
 *      `ValveConfirmSheet.jsx:17-25` is the bug report that produced it.
 *      `Tooltip`, `DropdownMenu`, `Popover`, `Select`, `Dialog` and `Sheet`
 *      all do this.
 *   2. A tooltip is a HOVER affordance. This is a touch device. Hover
 *      reaches nobody.
 *
 * So it is the house tap-to-open panel, which is the same answer
 * `SystemsOverviewHero.jsx:804-871` reached for the system-type chips'
 * explanation — a plain `absolute`/in-flow panel inside the frame, opened by
 * a real button. That precedent is followed rather than re-derived: real
 * `aria-expanded` + `aria-controls`, prose in a region the button points at,
 * tokens rather than hex so the four themes still re-ground it.
 *
 * WHAT THIS ADDS OVER THAT PRECEDENT, because the brief asks for it: the
 * panel dismisses THREE ways — a second tap on the trigger, Escape, and a tap
 * on the scrim — and focus returns to the trigger every time.
 *
 * THE PANEL IS IN FLOW, NOT ABSOLUTE, and that is deliberate: every chassis
 * this strip mounts inside (`ValveStatusCard`'s CARD and V2_CARD) carries
 * `overflow-hidden`, so an absolutely-positioned panel hanging below the
 * strip would be CLIPPED by the card it belongs to. In flow it simply makes
 * the card taller, which is what the card's own Attention disclosure already
 * does (ValveStatusCard.jsx:1005-1045) and what cannot be clipped by
 * anything. The SCRIM is the absolute one: `inset-0` against the card root,
 * which is `relative`, so a tap anywhere else on the card closes the panel.
 *
 * ── COPY — WHAT IS KEPT AND WHAT IS FLAGGED ───────────────────────────────
 * Nothing here is authored from the frame. `label`, `state` and `description`
 * are all props, defaulted at the call site to strings this product already
 * ships, because copy rule 0 says the catalogue outranks a frame
 * transcription:
 *
 *   · the frame says `Auto Shutoff Valve`; the card already ships
 *     `Auto-shutoff` (ValveStatusCard.jsx:747, and EventFocusOverlay draws
 *     it). The shipped string is kept. FLAGGED — and note the frame's wording
 *     is not invented either: `ActivePolicyCard`'s own row on this same page
 *     is spelled `Auto Shutoff Valve`. The product calls one setting two
 *     things today; this strip does not settle which.
 *   · the frame says `Off`; the card already ships `Disabled`. Kept. FLAGGED.
 *   · the sentence is `ValveStatusCard`'s own shipped `handlingDescription`,
 *     carried through verbatim including its em-dash and its mid-sentence
 *     capital. Both are against standing rules and NEITHER is fixed here —
 *     re-punctuating a shipped string is the owner's call, not this file's.
 *     FLAGGED.
 *
 * The ONE new string is the trigger's accessible name clause, "What does this
 * mean?", which exists because a status dot is not an accessible name and a
 * control that opens an explanation has to say so. It follows
 * `SystemsOverviewHero.jsx:730`'s "What are these?" rather than inventing a
 * second phrasing for the same gesture.
 *
 * ── THE DOT IS STATE-BEARING, AND ITS THIRD STATE IS REAL ─────────────────
 * The frame exports the dot RED, which is the auto-shutoff-is-off reading.
 * Green for on is not invented here: `ValveStatusCard.jsx:973-976` already
 * draws exactly that pair on the redraw card's badge. The THIRD tone is
 * `ActivePolicyCard`'s own `muted`, for `N/A` — `buildTree` records 20 MRG
 * systems as metering-only, where there is no valve to shut and "Off" would
 * claim a setting the hardware does not have.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { LocationDot } from '@/v2/icons'

/* 199683:26037 — the strip. `flex-[1_0_0]` in the frame because it shares a
   row there; here it is the card's own full-width child, so `w-full`. The
   38px height is the content's, not a floor: the panel grows it. */
const STRIP = String.raw`bg-slate-100 content-stretch flex flex-col gap-[8px] items-start justify-center px-[13px] py-[9px] relative rounded-[11px] shrink-0 w-full max-w-full`

/* 199683:26039 — the row, which is also the whole tap target. A 38px strip is
   a far better touch target than the 22px badge inside it, and the frame's
   own badge has its dropdown slot hidden, so the badge is not the control.
   `z-[2]`: it has to stay above the scrim, or the second tap would land on
   the scrim and the trigger's own toggle would never fire. */
const ROW = String.raw`content-stretch flex items-center justify-between relative shrink-0 w-full z-[2] cursor-pointer appearance-none border-0 bg-transparent p-0 text-left rounded-[8px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`

/* 199683:26040 — 14px / --text/sm/lh 20px, weight 500, --colors/slate/600.
   The frame's string carries a TRAILING SPACE; it is not transcribed. */
const LABEL = String.raw`[word-break:break-word] font-sans font-medium leading-5 relative shrink-0 text-slate-600 text-sm whitespace-nowrap`

/* 199683:26043 — the badge, at the frame's own emitted values (28.6 / 8.8 /
   2.2 / 4.4). Its `rightIcon` slot and its arrow-drop-down-line instance are
   both hidden="true" in the frame: this badge is NOT a dropdown. */
const BADGE = String.raw`bg-surface-card content-stretch flex gap-[4.4px] h-[22px] items-center justify-center overflow-clip px-[8.8px] py-[2.2px] relative rounded-[28.6px] shrink-0`
/* 13.2px / --text/xs/lh 17.6px, weight 500, --colors/slate/700. */
const BADGE_TEXT = String.raw`[word-break:break-word] font-sans font-medium leading-[17.6px] overflow-hidden relative shrink-0 text-[13.2px] text-slate-700 text-ellipsis whitespace-nowrap`

/* 199683:26038, the sentence the frame hides. Set on the strip's own ground
   one step up from the label, so the panel reads as a disclosure of the strip
   rather than a second card. */
const PANEL = String.raw`relative z-[2] w-full rounded-[8px] bg-surface-card px-[10px] py-[8px] text-sm font-normal leading-5 text-slate-600`

/** NEW COPY — the gesture clause only. See the header. */
const EXPLAIN_CLAUSE = 'What does this mean?'

/**
 * Which tone the dot takes. `ActivePolicyCard`'s own three-way vocabulary,
 * not a fourth one: on / off / muted.
 *
 * Case-folded, because the two callers spell the same answer differently —
 * `EventFocusOverlay` passes 'On' | 'Disabled', `ActivePolicyCard`'s data is
 * 'Enabled' | 'Disabled' | 'N/A'. Anything unrecognised reads as OFF, which
 * is the safe direction: this strip must never paint green over a setting it
 * cannot vouch for.
 */
function toneFor(state) {
  const word = String(state ?? '').trim().toLowerCase()
  if (word === 'on' || word === 'enabled') return 'on'
  if (word === 'n/a' || word === 'na' || word === '') return 'muted'
  return 'off'
}

const DOT_INK = {
  on: 'text-green-700',
  off: 'text-red-500',
  muted: 'text-muted-foreground',
}

export default function ValveAutoShutoffStrip({
  /* Defaulted to the card's shipped strings, never to the frame's. */
  label = 'Auto-shutoff',
  state = 'On',
  description,
  className,
  ...props
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const panelId = `${useId()}-auto-shutoff`
  const tone = toneFor(state)

  /* ONE closer, so the three dismissals cannot drift. Focus goes back to the
     trigger on every one of them: Escape and a scrim tap both leave focus
     nowhere otherwise, which drops a keyboard user at the top of the page. */
  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  /* Escape. Radix would have given this for free; an in-frame panel says so
     itself — the same effect `ValveConfirmSheet.jsx:70-75` carries. */
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  /* No description to show means no disclosure at all: a trigger that opens
     an empty panel is worse than a plain readout. The strip still draws. */
  const canExplain = Boolean(description)

  const badge = (
    <div className={BADGE} data-node-id="199683:26043" data-name="Badge" data-tone={tone}>
      {/* The frame's leftIcon is a 13.2px Location Dot, which this project
          already owns at that radius — reused and only tinted. */}
      <LocationDot size={13.2} className={cn('shrink-0', DOT_INK[tone])} />
      <p className={BADGE_TEXT}>{state}</p>
    </div>
  )

  return (
    <div
      className={cn(STRIP, className)}
      data-node-id="199683:26037"
      data-name="Auto shutoff strip"
      {...props}
    >
      {/* THE SCRIM. `absolute inset-0` resolves against the CARD root, which
          is `relative` and `overflow-hidden`, so it covers the card and
          nothing beyond it — no portal, no escape from the 393x852 frame. It
          is transparent on purpose: this is a one-sentence disclosure on a
          card, not a modal over the app, and dimming the card would read as
          the page being blocked. */}
      {open ? (
        <button
          type="button"
          aria-label="Close explanation"
          onClick={close}
          className="absolute inset-0 z-[1] cursor-default bg-transparent"
          data-name="auto-shutoff-scrim"
        />
      ) : null}

      {canExplain ? (
        <button
          ref={triggerRef}
          type="button"
          className={ROW}
          /* A BARE DOT IS NOT A NAME. The label, the state it is in, and what
             pressing it does — in that order, because the first two are what
             a screen-reader user came for and the third is the offer. */
          aria-label={`${label}: ${state}. ${EXPLAIN_CLAUSE}`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            /* The second tap. `close()` rather than a bare setState so focus
               handling is the same on all three routes. */
            if (open) close()
            else setOpen(true)
          }}
          data-node-id="199683:26039"
          data-name="Row"
        >
          <p className={LABEL} data-node-id="199683:26040">
            {label}
          </p>
          {badge}
        </button>
      ) : (
        <div className={ROW.replace('cursor-pointer', 'cursor-default')} data-node-id="199683:26039" data-name="Row">
          <p className={LABEL} data-node-id="199683:26040">
            {label}
          </p>
          {badge}
        </div>
      )}

      {/* THE SENTENCE. Mounted only while open — unlike the card's Attention
          disclosure, this prose is NOT duplicated anywhere else on the
          surface, so there is no double announcement to avoid and no reason
          to keep a `hidden` copy in find-in-page claiming to be on screen.
          `aria-controls` still resolves, because the button only carries it
          when the panel exists. */}
      {canExplain && open ? (
        <div
          id={panelId}
          role="region"
          aria-label={label}
          className={PANEL}
          data-node-id="199683:26038"
          data-name="Auto shutoff explanation"
        >
          {description}
        </div>
      ) : null}
    </div>
  )
}
