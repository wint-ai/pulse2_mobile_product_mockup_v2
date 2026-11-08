/**
 * SheetShell — the one bottom-sheet chassis for the whole app.
 *
 * WHY THIS EXISTS. Five sheets in src/v2/components/ (SystemsFilterSheet,
 * ValveConfirmSheet, PushSimSheet, MonthPickerSheet, WaterEventFeedbackSheet)
 * each hand-rolled the same `absolute inset-0 z-50 flex flex-col justify-end`
 * shell, a scrim <button>, and a panel. Measured 2026-11-07: all five had
 * ZERO transition classes. They appeared and vanished instantly, which is
 * most of why this app read as abrupt.
 *
 * They cannot simply take shadcn's <Sheet>: that is Radix, and Radix portals
 * to document.body, which escapes the fixed 393x852 phone frame by design —
 * the long-standing reason every overlay in this repo is an in-frame
 * `absolute inset-0` layer instead. So this is that same house pattern with
 * the motion the shadcn component would have given us.
 *
 * ── WHY MOTION AND NOT CSS ───────────────────────────────────────────────
 * Most of this app's motion is CSS, deliberately. A sheet is one of the
 * three things CSS genuinely cannot do:
 *
 *   1. DRAG TO DISMISS. The panel has to track the finger 1:1 — Apple's
 *      rule from WWDC18 "Designing Fluid Interfaces": "When swiping or
 *      dragging, the contents should stay attached to the gesture."
 *   2. VELOCITY HAND-OFF. On release the sheet must continue at the speed it
 *      was thrown. No CSS easing can be handed a starting velocity, so a
 *      CSS sheet always stops dead at the fingertip and then restarts — the
 *      exact "harsh moment" Apple names.
 *   3. INTERRUPTIBILITY. A sheet closing must be catchable mid-flight.
 *
 * ── THE NUMBERS, AND WHERE THEY COME FROM ────────────────────────────────
 * 500ms on cubic-bezier(0.32, 0.72, 0, 1). Apple publishes neither, but two
 * shipping iOS-on-web libraries converged on exactly this pair
 * independently: Ionic's modal `ios.enter.ts` and Vaul's drawer. It is a
 * bezier approximation of a critically damped spring — fast off the mark,
 * long decelerating tail, no overshoot. No bounce, on purpose: a sheet that
 * overshoots at the bottom edge reads as a bug, and several of these sheets
 * confirm destructive valve actions, where bounce is actively wrong.
 *
 * The exit runs at 60% of the entrance (300ms). Entrances settle, exits get
 * out of the way — the asymmetry is the most legible rule in a motion
 * system, and M3 applies the same ratio (400ms in / 150ms out on its Fade).
 *
 * Dismiss thresholds are Vaul's: velocity > 0.4 px/ms OR dragged past 25% of
 * the panel's own height. A sheet closes more eagerly than a page pops
 * (Ionic uses 0.2 / 50% for back-swipe) because dismissing a sheet is cheap
 * and reversible.
 *
 * ── REDUCED MOTION ───────────────────────────────────────────────────────
 * The travel is dropped and the fade is kept, which is Apple's own
 * substitution ("replacing transitions in x-, y-, and z-axes with fades").
 * DRAG IS NOT DISABLED: Reduce Motion targets automatic and repetitive
 * motion, and Apple lists gesture-tracked motion as a remedy rather than a
 * problem. Taking the drag away would remove a control, not a decoration.
 */
/* `motion` is aliased to `Motion` so eslint can see it is used. This repo
   carries eslint-plugin-react-hooks and react-refresh but NOT
   eslint-plugin-react, so JSX is not parsed for identifier usage and a
   lowercase import referenced only as <Motion.div> reads as dead. The
   config's no-unused-vars already exempts /^[A-Z_]/ for exactly this
   reason -- components are capitalised and only ever appear in JSX. */
import { useRef } from 'react'
import { AnimatePresence, motion as Motion, useDragControls, useReducedMotion } from 'motion/react'

/* The iOS sheet curve. Kept as a literal array rather than read from the CSS
   token, because Motion needs the four numbers and cannot resolve a var(). */
const EASE_IOS = [0.32, 0.72, 0, 1]
const IN_S = 0.5
const OUT_S = 0.3

/* Vaul's thresholds. `VELOCITY` is px/ms. */
const VELOCITY_TO_CLOSE = 0.4
const FRACTION_TO_CLOSE = 0.25

export default function SheetShell({
  open,
  onClose,
  /** The dialog's accessible name. */
  label,
  /** The scrim's own name, kept distinct so it does not collide with a ×. */
  closeLabel = 'Close',
  /** Drag-to-dismiss. Off for a sheet that must be answered, not waved away. */
  dismissible = true,
  /** A visible grabber. Off by default; a sheet with its own header rarely wants one. */
  grabber = false,
  className = '',
  scrimClassName = 'bg-foreground/45',
  zIndex = 50,
  children,
}) {
  const reduced = useReducedMotion()
  const dragControls = useDragControls()
  const panelRef = useRef(null)

  /* ── DRAG MUST NOT FIGHT THE SCROLL ────────────────────────────────────
     Three of these sheets have a scrollable body (the filter list, the push
     simulator, the month picker). If the panel drags whenever a finger moves
     down on it, then scrolling UP through a list -- which starts with a
     downward finger movement -- drags the sheet away instead. The sheet
     becomes impossible to read.

     PushSimSheet had already run into this and solved it by scoping its
     swipe to the header, which works but costs you the gesture everywhere
     else. Vaul's answer is better and is what this does: a drag may only
     BEGIN when the scroller under the finger is already at the top. Once you
     are at scrollTop 0 there is nothing above to scroll to, so a downward
     pull unambiguously means "put this away" -- which is exactly how iOS
     behaves, and why a sheet feels continuous with its own content rather
     than layered over it.

     Implemented with `dragListener={false}` + manual `dragControls` so the
     decision happens on pointerdown, before Motion has claimed the gesture.
     Claiming and then releasing it would already have cancelled the scroll. */
  const startDragIfAtTop = (event) => {
    if (!dismissible || reduced) return
    let node = event.target
    while (node && node !== panelRef.current) {
      if (node.scrollHeight > node.clientHeight + 1) {
        const style = getComputedStyle(node)
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollTop > 0) return
      }
      node = node.parentElement
    }
    dragControls.start(event)
  }

  /* The panel's animation, in two channels. Under reduced motion the Y
     channel is simply never written, so the sheet cross-fades in place. */
  const panelMotion = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }

  const onDragEnd = (_event, info) => {
    if (!dismissible) return
    const height = info.point.y && _event.currentTarget?.offsetHeight
    const travelled = info.offset.y
    const enough =
      info.velocity.y > VELOCITY_TO_CLOSE * 1000 ||
      (height ? travelled > height * FRACTION_TO_CLOSE : travelled > 120)
    /* Downward only. A flick UP should never dismiss — that is the mirror
       rule: "if someone reveals a view by sliding it down from the top, they
       don't expect to dismiss the view by sliding it to the side." */
    if (travelled > 0 && enough) onClose?.()
  }

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="absolute inset-0 flex flex-col justify-end"
          style={{ zIndex }}
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          {/* The scrim. Its own accessible name, so it does not collide with
              a × inside the panel — the pattern SystemsFilterSheet already
              set. Fades on the SHORTER duration in both directions: a scrim
              that lingers after the panel has gone reads as a stuck screen. */}
          <Motion.button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: OUT_S, ease: 'linear' }}
            className={`absolute inset-0 cursor-default ${scrimClassName}`}
          />

          <Motion.div
            {...panelMotion}
            transition={{
              duration: open ? IN_S : OUT_S,
              ease: EASE_IOS,
              /* The exit is shorter than the entrance. Motion reads this off
                 the variant it is animating TO, so it is spelled per-channel
                 rather than once. */
              exit: { duration: OUT_S, ease: EASE_IOS },
            }}
            ref={panelRef}
            onPointerDown={startDragIfAtTop}
            drag={dismissible && !reduced ? 'y' : false}
            dragListener={false}
            dragControls={dragControls}
            /* Downward only, and rubber-banded. `dragElastic` 0 upward means
               the panel simply will not travel above its resting place —
               the boundary is felt rather than announced. */
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragMomentum={false}
            onDragEnd={onDragEnd}
            className={`relative ${className}`}
          >
            {grabber ? (
              <div
                aria-hidden="true"
                className="flex w-full shrink-0 items-center justify-center pt-[8px] pb-[4px]"
              >
                <span className="h-[4px] w-[36px] rounded-full bg-slate-300" />
              </div>
            ) : null}
            {children}
          </Motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
