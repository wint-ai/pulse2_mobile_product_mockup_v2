/**
 * "Close the valve?" — the confirmation every valve change goes through.
 *
 * WHY THIS EXISTS
 * v1's ValveControlCard has always put a bottom sheet in front of this action
 * (src/components/ValveControlCard.jsx:420-470). The v2 System page wired its
 * valve controls straight at state, so the confirmation was silently lost when
 * the page moved to v2 — closing a building's water took one tap and no
 * question. Shutting off water to a live system is not an undoable tap.
 *
 * The copy is v1's, word for word, so the two screens cannot drift apart:
 *   close  "Close the valve?"  / "This will shut off water flow."
 *   open   "Open the valve?"   / "Water flow will resume to this system."
 * Only the "close all" case adds a line, because the blast radius is wider and
 * v1 has no equivalent to copy from.
 *
 * WHY NOT THE SHADCN <Sheet>
 * It was built on one first, and the sheet rendered across the whole browser
 * window with the phone sitting in the middle of it. shadcn's Sheet is a Radix
 * dialog that portals to document.body, and this app draws inside a fixed
 * 393x852 frame (src/components/Phone.jsx) — a portal escapes that frame by
 * design. Every sheet in this repo is therefore an `absolute inset-0` overlay
 * inside the page instead: SystemsFilterSheet:97, IgnoreBottomSheet,
 * BottomSheet. This follows that house pattern, and keeps the shadcn Button
 * for the two actions.
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
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

/* TOKENS. Every colour here is a design token:
 *   scrim        bg-foreground/45   (--foreground #0f172b = colors/slate/900,
 *                                    the exact value the literal rgba() held)
 *   grab handle  shadcn <Separator> (bg-border = colors/slate/200 #e2e8f0)
 *   title        colors/slate/900   body  colors/slate/600
 *   buttons      shadcn Button default / secondary, rounded-xl = --radius+4px
 *                = 14px, i.e. the same radius the literal spelled
 * The sheet surface stays `#fafbfc`: that is the v2 house card chassis
 * (SystemTypeCard / ActivePolicyCard / SystemsFilterSheet all spell it), and
 * the Figma canvas exposes no named token for it.
 *
 * Radix's <Separator> is a plain <div>, NOT a portal — unlike <Sheet>, it is
 * safe inside the 393x852 frame.
 */

/* Line-height LAST in both — twMerge drops a `leading-` that precedes a
   font-size atom. */
const TITLE = String.raw`text-center font-semibold text-foreground text-lg tracking-[-0.45px] leading-[18px]`
const BODY = String.raw`mt-[8px] text-center text-slate-600 text-sm leading-5`

/** @param {{action: 'close'|'open'|'close-all'|null}} props */
export default function ValveConfirmSheet({ action, deviceName, valveCount, onConfirm, onCancel }) {
  /* Escape cancels. Radix gave this for free; an in-frame overlay has to say
     so itself. */
  useEffect(() => {
    if (!action) return
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [action, onCancel])

  if (!action) return null

  const closing = action === 'close' || action === 'close-all'

  const title =
    action === 'close-all' ? 'Close all valves?' : closing ? 'Close the valve?' : 'Open the valve?'

  const body =
    action === 'close-all'
      ? `This will shut off water flow to ${
          valveCount ? `all ${valveCount} valves on` : 'every valve on'
        } this system.`
      : closing
        ? 'This will shut off water flow.'
        : 'Water flow will resume to this system.'

  const confirmLabel =
    action === 'close-all' ? 'Yes, Close All Valves' : closing ? 'Yes, Close Valve' : 'Yes, Open Valve'

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Scrim. A tap outside is a Cancel — this action never commits by
          accident. */}
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-foreground/45"
      />

      <div className="relative flex flex-col rounded-t-[18px] bg-surface-card px-[20px] pb-[24px] pt-[12px]">
        {/* The grab handle v1 drew, kept so the sheet reads as a sheet — now
            the shadcn Separator, which already carries bg-border. */}
        <Separator
          aria-hidden="true"
          className="mx-auto mb-[16px] rounded-[2px] data-[orientation=horizontal]:h-[4px] data-[orientation=horizontal]:w-[36px]"
        />

        <h2 className={`font-sans ${TITLE}`}>{title}</h2>
        <p className={`font-sans ${BODY}`}>
          {/* Naming the device matters on a system with several valves —
              "the valve" is ambiguous once the topology card is open. */}
          {deviceName && action !== 'close-all' ? `${deviceName} — ${body}` : body}
        </p>

        <Button
          type="button"
          onClick={onConfirm}
          className="mt-[24px] h-[52px] w-full rounded-xl text-base font-semibold"
        >
          {confirmLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="mt-[10px] h-[48px] w-full rounded-xl text-base font-semibold"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
