/**
 * ConsumptionReturnControl — the way back up out of a drill-down.
 *
 * PRD_Water_Consumption_Chart_v2 §3.6 / §20.1 / PLS-WC-15, and §19, which
 * makes back-navigation REQUIRED on mobile rather than a nicety.
 *
 * §3.6 records that there is currently no route back: the grouping control is
 * the only one, and it resets to the newest window (§3.1), so a user who
 * opened Yearly → Monthly → Daily into March 2024 and wants 2024's months
 * again lands on the last twelve months instead. §20.1's recommendation is a
 * trail of the periods opened plus an explicit control that restores BOTH the
 * grouping and the period. The trail lives on the screen — only the screen
 * knows what was opened — and this is the control.
 *
 * NOT DESIGNED: the delivery canvas has no frame for it, because §20.1 was
 * written after those frames. Rather than invent a new shape, it borrows §16's
 * Today button exactly — slate-100, height 32, radius 10 — so the two controls
 * that move you around the chart read as one pair. Replace it with the comp
 * when one exists; do not grow it into something bigger in the meantime.
 *
 * §19 also asks that the platform back gesture perform the same return. That
 * is a router-level concern (the gesture pops history, and this chart is not a
 * route), so it is deliberately not attempted here — a visible control is what
 * this surface can actually deliver, and the PRD accepts it as the alternative.
 */

import { GROUPING_NAME } from '@/v2/lib/consumptionWindow'

/** Huge Icons / arrow-left-01-round at 16, the geometry MonthPickerSheet's own
 *  nav chevron ships. Stroke is currentColor so the pill tints it. */
function ChevronLeft16() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M10 4L6 8L10 12"
        stroke="currentColor"
        strokeWidth="1.33"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * @param {object}   props
 * @param {'H'|'D'|'M'|'Y'} [props.toPeriod]  the grouping the return restores.
 *        Absent means there is nothing to return to and nothing renders — the
 *        control must not appear when the user has not drilled in.
 * @param {Function} [props.onReturn]         performs the return.
 * @param {string}   [props.className]
 */
export default function ConsumptionReturnControl({ toPeriod, onReturn, className }) {
  if (!toPeriod || !onReturn) return null
  const name = GROUPING_NAME[toPeriod] ?? toPeriod

  return (
    <div
      className={
        className ??
        'content-stretch flex items-center justify-start p-[var(--p-0,0px)] relative w-full'
      }
    >
      <button
        type="button"
        onClick={onReturn}
        /* The name says where it goes, not just that it goes back: after three
           levels "Back" alone does not say what it returns to. */
        aria-label={`Return to the ${name} view this was opened from`}
        className="bg-[var(--colors\/slate\/100,#f1f5f9)] content-stretch cursor-pointer flex gap-[var(--component\/button\/gap,6px)] h-[32px] items-center justify-center max-w-full px-[var(--component\/button\/size-default\/px,12px)] py-[var(--p-0,0px)] relative rounded-[10px] text-[color:var(--colors\/slate\/800,#1d293d)]"
        data-testid="consumption-return"
      >
        <ChevronLeft16 />
        <span className="[word-break:break-word] font-medium leading-[var(--text\/sm-tight\/lh,20px)] min-w-px overflow-hidden relative text-[length:var(--text\/sm-tight\/size,14px)] text-ellipsis whitespace-nowrap">
          Back to {name}
        </span>
      </button>
    </div>
  )
}
