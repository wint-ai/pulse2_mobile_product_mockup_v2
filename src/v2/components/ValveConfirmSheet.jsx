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
 */
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

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
        className="absolute inset-0 cursor-default bg-[rgba(15,23,43,0.45)]"
      />

      <div className="relative flex flex-col rounded-t-[var(--rounded-2xl,18px)] bg-[#fafbfc] px-[20px] pb-[24px] pt-[12px]">
        {/* The grab handle v1 drew, kept so the sheet reads as a sheet. */}
        <div aria-hidden="true" className="mx-auto mb-[16px] h-[4px] w-[36px] rounded-[2px] bg-[#e2e8f0]" />

        <h2 className="text-center text-[18px] font-semibold tracking-[-0.18px] text-[color:var(--colors\/slate\/900,#0f172b)]">
          {title}
        </h2>
        <p className="mt-[8px] text-center text-[14px] leading-[20px] text-[color:var(--colors\/slate\/600,#45556c)]">
          {/* Naming the device matters on a system with several valves —
              "the valve" is ambiguous once the topology card is open. */}
          {deviceName && action !== 'close-all' ? `${deviceName} — ${body}` : body}
        </p>

        <Button
          type="button"
          onClick={onConfirm}
          className="mt-[24px] h-[52px] w-full rounded-[14px] text-[16px] font-semibold"
        >
          {confirmLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="mt-[10px] h-[48px] w-full rounded-[14px] text-[16px] font-semibold"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
