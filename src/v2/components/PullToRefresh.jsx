/**
 * PullToRefresh — drag a scroller down past its top to refresh it.
 *
 * Owner, 2026-11-07, on the motion pass: "also for tab to refresh". This app
 * had no refresh gesture at all.
 *
 * ── THE NUMBERS ARE MATERIAL 3's, NOT INVENTED ───────────────────────────
 * Taken from androidx `PullToRefresh.kt`, which is the only one of the three
 * platform sources that publishes a complete spec:
 *
 *   PositionalThreshold   80dp   how far the indicator travels to arm
 *   DragMultiplier        0.5    so the FINGER travels 160dp to pull 80
 *   SpinnerContainerSize  40dp
 *   arc alpha             0.3 below the threshold, 1.0 at or past it
 *
 * The 0.5 multiplier is the part that makes it feel right and the part people
 * leave out. Without it the indicator tracks the finger 1:1, arms almost
 * immediately, and the gesture has no sense of resistance — you cannot tell
 * a deliberate pull from an overscroll. Halving it means the pull has to be
 * meant.
 *
 * ── WHY IT IS NOT A SPRING ───────────────────────────────────────────────
 * While the finger is down the indicator tracks it directly, with no easing
 * at all: Apple's rule is that dragged content "should stay attached to the
 * gesture", and an eased follow is exactly the lag that breaks that. Easing
 * applies only to the SETTLE after release.
 *
 * ── THE RELEASE IS WHERE HONESTY MATTERS ─────────────────────────────────
 * `onRefresh` is awaited. The indicator stays until the work finishes, with a
 * MINIMUM visible time: a refresh that resolves in 20ms would otherwise flash
 * the spinner for one frame, which reads as a glitch rather than as work. The
 * practitioner literature is consistent that a loader shown too briefly is
 * worse than none at all. If a caller passes no `onRefresh`, the gesture is
 * still fully wired and simply settles — this is a prototype whose job is to
 * show how the interaction will feel once there is something to refetch.
 *
 * ── REDUCED MOTION ───────────────────────────────────────────────────────
 * The gesture is UNTOUCHED. Reduce Motion targets automatic and repetitive
 * motion, and Apple lists gesture-tracked motion among its remedies — this is
 * the purest case of one. What is dropped is the spinner's continuous
 * rotation, which is automatic, repetitive, and the actual vestibular risk.
 */
import { useCallback, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'

const THRESHOLD = 80
const DRAG_MULTIPLIER = 0.5
const MAX_PULL = THRESHOLD * 1.5
const MIN_VISIBLE_MS = 450

export default function PullToRefresh({
  onRefresh,
  /** The scrollable element this gesture belongs to. */
  scrollRef,
  className = '',
  children,
}) {
  const reduced = useReducedMotion()
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const start = useRef(null)
  const hostRef = useRef(null)

  const scroller = useCallback(
    () => scrollRef?.current ?? hostRef.current,
    [scrollRef],
  )

  const onPointerDown = (e) => {
    /* MOUSE IS ALLOWED. An early draft ignored it, on the reasoning that
       pull-to-refresh is a touch gesture — but this app is reviewed in a
       393x852 phone frame in a desktop browser as often as on a phone, and a
       gesture the reviewer cannot try is a gesture nobody checks. It is also
       what makes this testable at all. */
    if (busy) return
    const el = scroller()
    /* ONLY FROM THE TOP. If the list is scrolled at all, a downward drag
       means "scroll up", not "refresh" — the same conflict SheetShell
       resolves for drag-to-dismiss. */
    if (!el || el.scrollTop > 0) return
    start.current = e.clientY
  }

  const onPointerMove = (e) => {
    if (start.current === null || busy) return
    const raw = e.clientY - start.current
    if (raw <= 0) {
      setPull(0)
      return
    }
    const el = scroller()
    if (el && el.scrollTop > 0) {
      start.current = null
      setPull(0)
      return
    }
    setPull(Math.min(raw * DRAG_MULTIPLIER, MAX_PULL))
  }

  const settle = () => {
    start.current = null
    setPull(0)
  }

  const onPointerUp = async () => {
    if (start.current === null) return
    const armed = pull >= THRESHOLD
    if (!armed || busy) return settle()

    start.current = null
    setBusy(true)
    setPull(THRESHOLD)
    const began = Date.now()
    try {
      await onRefresh?.()
    } finally {
      const left = MIN_VISIBLE_MS - (Date.now() - began)
      if (left > 0) await new Promise((r) => setTimeout(r, left))
      setBusy(false)
      setPull(0)
    }
  }

  const armed = pull >= THRESHOLD
  const progress = Math.min(pull / THRESHOLD, 1)

  return (
    <div
      ref={hostRef}
      className={`relative ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={settle}
      style={{ touchAction: pull > 0 ? 'none' : undefined }}
    >
      {/* The indicator. Absolutely positioned so it never takes part in the
          scroller's layout — anything that changes the content height while
          a finger is on it would fight the scroll it is reading. */}
      <div
        aria-hidden={!busy}
        data-ptr-indicator
        data-ptr-armed={pull >= THRESHOLD ? 'true' : 'false'}
        data-ptr-pull={Math.round(pull)}
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
        style={{
          transform: `translateY(${pull - 40}px)`,
          opacity: progress,
          /* No transition while the finger is down — the indicator is
             ATTACHED to the gesture. Only the settle is eased. */
          transition: start.current === null ? 'transform var(--dur-slow) var(--ease-out), opacity var(--dur-medium) linear' : 'none',
        }}
      >
        <div className="flex size-[40px] items-center justify-center rounded-full bg-surface-card shadow-md">
          <span
            className="block size-[16px] rounded-full border-[2.5px] border-primary border-t-transparent"
            style={{
              opacity: armed || busy ? 1 : 0.3,
              /* The spin is the one genuinely automatic, repetitive piece,
                 so it is the one piece Reduce Motion removes. */
              animation: busy && !reduced ? 'ptr-spin 700ms linear infinite' : 'none',
              transform: busy ? undefined : `rotate(${progress * 270}deg)`,
            }}
          />
        </div>
      </div>

      {children}
    </div>
  )
}
