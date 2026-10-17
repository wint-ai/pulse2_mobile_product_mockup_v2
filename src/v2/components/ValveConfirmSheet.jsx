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
 * Built on the shadcn Sheet (side="bottom") rather than a hand-rolled overlay:
 * this repo's rule is that UI here comes from shadcn components. The Sheet
 * brings the focus trap, the Escape handler and the scroll lock with it, none
 * of which v1's inline <div> overlay had.
 */
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

/** @param {{action: 'close'|'open'|'close-all'|null}} props */
export default function ValveConfirmSheet({ action, deviceName, valveCount, onConfirm, onCancel }) {
  const open = Boolean(action)
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
    <Sheet open={open} onOpenChange={next => { if (!next) onCancel?.() }}>
      <SheetContent side="bottom" className="rounded-t-[18px] px-[20px] pb-[24px] pt-[12px]">
        {/* The grab handle v1 drew, kept so the sheet reads as a sheet. */}
        <div aria-hidden="true" className="mx-auto mb-[16px] h-[4px] w-[36px] rounded-[2px] bg-[#e2e8f0]" />

        <SheetHeader className="gap-[8px] p-0 text-center">
          <SheetTitle className="text-center text-[18px] font-semibold tracking-[-0.18px] text-[color:var(--colors\/slate\/900,#0f172b)]">
            {title}
          </SheetTitle>
          <SheetDescription className="text-center text-[14px] text-[color:var(--colors\/slate\/600,#45556c)]">
            {/* Naming the device matters on a system with several valves —
                "the valve" is ambiguous once the topology card is open. */}
            {deviceName && action !== 'close-all' ? `${deviceName} — ${body}` : body}
          </SheetDescription>
        </SheetHeader>

        <SheetFooter className="mt-[24px] gap-[10px] p-0">
          <Button
            type="button"
            onClick={onConfirm}
            className="h-[52px] w-full rounded-[14px] text-[16px] font-semibold"
          >
            {confirmLabel}
          </Button>
          <SheetClose asChild>
            <Button
              type="button"
              variant="secondary"
              className="h-[48px] w-full rounded-[14px] text-[16px] font-semibold"
            >
              Cancel
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
