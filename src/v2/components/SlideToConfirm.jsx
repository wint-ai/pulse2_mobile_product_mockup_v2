/**
 * SlideToConfirm — a linear slide that ARMS a commit button. It does not
 * commit anything itself.
 *
 * DESIGN SOURCE: none. The Figma file has no slider, no confirm-gesture frame
 * and no bulk-action surface at all. This is net-new from the design system.
 * EVERY STRING IS PASSED IN BY THE CALLER, so this file holds no UI copy -
 * the copy review lives in BulkValveConfirmSheet.jsx, where the register is.
 *
 * WHY IT EXISTS, in the owner's words: "I want to add to the bulk operations
 * kind of confirmation like the puzzle Lego that user needs to slide to make
 * sure user do it when he's aware of what he's doing and not just click
 * something in his pocket."
 *
 * ══ ARM, DO NOT COMMIT ══════════════════════════════════════════════════
 * The first cut of this control DISPATCHED on release past the threshold. The
 * owner, 2026-11-03: "sliding shall be confirmation before the user can click
 * on the close button." So the model is two acts:
 *
 *     slide to ARM   ->   press the button to COMMIT
 *
 * That is architecturally tidier than what it replaces, and that is the real
 * reason to welcome it. There used to be TWO independent commit paths - the
 * slide dispatched, and tick-then-press dispatched. Now there is ONE COMMIT
 * CONTROL reachable by two different ARMING GESTURES: the slide, or the
 * caller's acknowledgement checkbox behind its escape hatch. One press
 * commits, whichever way it was armed.
 *
 * `armed` IS CONTROLLED BY THE CALLER, deliberately. The caller owns the
 * decision this arms, so the caller owns the arm: it can and must drop it the
 * moment the count, the scope or the direction changes. A STALE ARM MUST
 * NEVER SURVIVE A CHANGE TO WHAT IT WOULD ACT ON, and a component holding its
 * own `armed` flag cannot promise that.
 *
 * ARMING IS REVERSIBLE. A user who armed by mistake presses the confirmed
 * slider again and it resets (`onDisarm`). While armed the handle takes no
 * drag at all - the whole control becomes one reset target - because a drag
 * that started from the far end would be a gesture with nowhere to go.
 *
 * ══ WHAT THIS FIXES, AND WHAT IT DOES NOT ═══════════════════════════════
 * HONEST FRAMING FIRST, because the pattern is easy to oversell.
 *
 * Bravo-Lillo et al. (SOUPS, "Harder to ignore?") tested inhibitive attractors
 * and found the split that matters: treatments that merely DELAYED dismissal
 * habituated over repeated exposure, while the ones that FORCED INTERACTION
 * WITH THE FIELD CONTAINING THE INFORMATION THAT CHANGES were resilient to it.
 * A slider is the SAME slider every time. Its track is invariant content. So
 * this control is PHYSICAL FRICTION, not attention.
 *
 * It therefore addresses exactly the failure the owner named - accidental
 * actuation, the tap that happens in a pocket or as the second half of a
 * double-tap - and it does NOT address habituated-but-deliberate confirmation.
 * The control that addresses that one is the sheet's acknowledgement checkbox,
 * which restates the VARYING count and scope. The arrival of this slider must
 * not be read as a reason to weaken or remove that checkbox.
 *
 * ONE CHEAP NOD TO THE ABOVE: `label` is required and the caller is expected
 * to put the varying payload in it ("Slide to close 412 valves"), not a
 * generic word like "Confirm". The handle then physically travels ACROSS the
 * number it is about to act on, which is the closest this control gets to the
 * Bravo-Lillo property. It is a nod, not a fix.
 *
 * NO CONTROLLED STUDY was found showing that slide-to-confirm reduces
 * real-world errors. Google Play is reported to be adding a swipe-to-confirm
 * step against accidental purchases; that is intent, not evidence. Treat the
 * pattern as reasonable and unproven, and say so to the owner.
 *
 * NOT A PUZZLE / JIGSAW SLIDER, deliberately. The owner floated the
 * CAPTCHA-style variant. A puzzle tests perception and dexterity - it proves
 * you are not a bot - and proves nothing about whether you understood that 412
 * valves are about to close. It also adds a motor barrier for tremor, switch
 * and voice users and a cognitive one for everybody, for no benefit here. This
 * is a plain linear slide.
 *
 * ══ WCAG — THE THREE CRITERIA THIS CONTROL TOUCHES ══════════════════════
 *
 * ── SC 2.5.7 Dragging Movements (AA). THE ONE THAT BITES ────────────────
 * Normative: "All functionality that uses a dragging movement for operation
 * can be achieved by a single pointer without dragging, unless dragging is
 * essential or the functionality is determined by the user agent and not
 * modified by the author." The named failure is F108: "The failure occurs when
 * there is no alternative single pointer input available to actuate the
 * function."
 *
 * "Essential" means removing it would fundamentally change the content AND the
 * function "cannot be achieved in another way that would conform". Arming CAN
 * be done with taps, so the drag is NOT essential, so A SLIDE-ONLY ROUTE TO
 * THE BUTTON WOULD BE AN F108 FAILURE AT LEVEL AA.
 *
 * THIS COMPONENT DOES NOT SATISFY 2.5.7 BY ITSELF AND CANNOT. The conformance
 * is the CALLER'S: BulkValveConfirmSheet keeps a `Cannot slide?` disclosure
 * that reveals an acknowledgement checkbox, and ticking it ARMS THE SAME
 * BUTTON with pointer presses and no drag. F108 explicitly allows it - "The
 * alternative may involve a series of single pointer interactions." A SINGLE
 * TAP WOULD NOT DO: it satisfies the letter of 2.5.7 and destroys the feature,
 * whose entire purpose is to defeat one careless tap.
 *
 * THE DRAG IS NOW MANDATORY ON ITS OWN ROUTE, so the alternative matters MORE
 * than it did, not less. Do not let the disclosure be removed as clutter.
 *
 * ── SC 2.5.1 Pointer Gestures (A). STAY OUT OF IT WITH POINTER CAPTURE ──
 * W3C's Understanding 2.5.1: "Unless the slider is implemented in a way that
 * forces users to precisely follow the path of the track, and straying from
 * the track 'loses' the user's grip on the slider thumb, operating a slider is
 * only considered a dragging movement, rather than a path-based gesture," and
 * a path-locked slider "may fail the requirements of both this criterion and
 * Success Criterion 2.5.7."
 *
 * SO: `setPointerCapture` on pointerdown, and `clientY` IS NEVER READ ANYWHERE
 * IN THIS FILE. Drift the finger or the mouse as far off the track vertically
 * as you like; the grip holds and the horizontal component still counts. That
 * is what keeps this out of Level A. Do not add a vertical tolerance check.
 *
 * ── SC 2.5.2 Pointer Cancellation (A). ACT ON THE UP-EVENT ──────────────
 * Nothing fires on pointerdown. The ARM happens on RELEASE past the threshold;
 * a release short of it springs the handle back and fires nothing. That is the
 * criterion's "completion on the up-event" bullet, plus an abort. And the
 * dispatch itself is a further press on a different control, so there is no
 * route from a single down-event to water moving.
 *
 * WHY NOT PRESS-AND-HOLD INSTEAD, since it looks tidier: a hold that fires
 * when its timer expires WHILE THE FINGER IS STILL DOWN completes on neither
 * the up-event nor a reversal, so it likely FAILS this Level A criterion. If
 * anyone ever builds one here, it must act on RELEASE after the threshold,
 * with an early release aborting.
 *
 * ── KEYBOARD, which is right but is not the conformance story ───────────
 * Enter, Space and End ARM. Arrow keys walk the handle in quarters and arm on
 * arrival. Home springs it back. While armed, Enter, Space and Home all
 * DISARM. W3C is explicit that none of this discharges 2.5.7 - "achieving
 * keyboard equivalence for a dragging operation does not automatically meet
 * this success criterion" - the checkbox path is what does. The keyboard is
 * here because it is right.
 *
 * ══ ASSISTIVE TECHNOLOGY ════════════════════════════════════════════════
 * ROLE IS `button`, NOT `slider`. `role="slider"` announces a value in a range
 * and invites a screen reader to offer value adjustment. This control has no
 * value: it is an arming gesture. It is announced as a button whose name is
 * the caller's label - which changes when it arms, because what pressing it
 * does changes - and `hintId` points at the caller's sentence naming the
 * no-drag alternative, so that path is discoverable without sight.
 *
 * It is a `<div role="button">` rather than a real `<button>` on purpose. A
 * native button activates on click, and a click is exactly the single careless
 * tap this control exists to refuse - and suppressing that activation while
 * keeping Enter and Space working means fighting the element's own semantics
 * (`preventDefault` on keydown suppresses Space activation inconsistently).
 * The div carries `tabIndex={0}` and handles its own keys, so activation is
 * ours alone. It stays in the caller's Tab trap, which matches both
 * `button` and `[tabindex]:not([tabindex="-1"])`.
 *
 * DISABLED IS `aria-disabled`, NOT `disabled`. The project's copy rules
 * (.claude/skills/wint-ui-copy/SKILL.md §5) prefer it where the user needs to
 * learn WHY a control is unavailable: `disabled` is skipped outright by some
 * assistive tech, so the reason never arrives.
 *
 * ══ THE LOOK — PORTED, NOT INSTALLED ════════════════════════════════════
 * The owner, on the first cut: "it needs a lot of improvements on the visual
 * side. I want you to take it like off-the-shelf component for this option. It
 * looks very bad now." NO OFF-THE-SHELF PACKAGE WAS INSTALLABLE: every
 * published slide-to-confirm (Kokonut UI, Ruixen UI, ShadcnSpace) depends on
 * `motion` / `framer-motion`, this repo has no animation library, and no new
 * dependency is approved. A ONE-AXIS DRAG DOES NOT NEED A PHYSICS ENGINE, so
 * the vocabulary is ported and the package is not:
 *  - a PILL track, 56px tall, so it reads as a groove and not as a box
 *  - a CIRCULAR, SHADOWED handle, 48px, inset 4px, sitting IN that groove
 *  - a PROGRESS FILL that follows the handle, with a rounded leading edge
 *  - the LABEL centred, fading to 0 exactly AT the threshold, so the commit
 *    point can be felt before it is reached
 *  - DOUBLED CHEVRONS in the handle (a single one reads "next"; two read
 *    "keep going"), swapped for a CHECK once armed
 *  - a RESTING SHEEN crossing the groove, so it reads as something to be
 *    moved rather than pressed
 *
 * ══ MOTION, GEOMETRY AND TOKENS ═════════════════════════════════════════
 *  - `prefers-reduced-motion: reduce` removes the spring and removes the
 *    resting sheen outright (`display: none`, so no static artifact is left
 *    behind). The glide class is also dropped entirely while a pointer is
 *    down, because a transition during a drag fights the finger. IT CANNOT BE
 *    AN INLINE `transition`: an inline style beats Tailwind's
 *    `motion-reduce:` variant and reduced motion would keep the animation.
 *  - The handle is 48px and the track 56px, both over the 44px target floor.
 *  - THE LABEL FADE IS DRIVEN BY POSITION, not by a timer, so it is direct
 *    manipulation feedback rather than an animation and reduced motion leaves
 *    it alone.
 *  - TRAVEL IS MEASURED FROM THE LIVE TRACK RECT at pointerdown, not from a
 *    class-string sum. The handle width is a constant because this file sets
 *    it, so no second measurement is needed.
 *  - TOKENS ONLY. `--card`, `--border-strong`, `--foreground`,
 *    `--destructive`, `--destructive-foreground`, `--primary`,
 *    `--primary-foreground`, `--ring`. Every one is declared in `:root` and
 *    re-pointed by all three of `[data-theme='dark']`, `[data-theme='sand']`
 *    and `[data-theme='contrast']`, so the control moves under all four
 *    themes. No ramp steps, no `var(--x, #hex)` fallbacks.
 *  - THE FILL IS A TINT, NOT A WASH. `bg-destructive/15` keeps the label on
 *    `--foreground` legible at every position in every theme; the handle
 *    position, not the fill, is the real progress cue.
 *  - RED IS NOT THE CARRIER. The label states the act and the count in words.
 *
 * A DRAG MAY ONLY START ON THE HANDLE. Pressing the far end of the track and
 * releasing would otherwise be a single tap that arms, which is the thing this
 * control refuses.
 */
import { useRef, useState } from 'react'
import { Check, ChevronsRight } from 'lucide-react'

/* ~90% of travel. Far enough that a brush past the handle cannot reach it,
   short enough that a committed drag does not have to land on a pixel. */
const COMMIT_RATIO = 0.9
/* One Arrow press is a quarter of the track, so four of them arm. */
const KEY_STEP = 0.25
/* Set here, so travel is `track width - HANDLE_PX - 2 * PAD_PX` and only the
   TRACK has to be measured. The 56px track and the 48px handle are both over
   the 44px target floor. */
const HANDLE_PX = 48
const PAD_PX = 4

const clamp = (n) => (n < 0 ? 0 : n > 1 ? 1 : n)

/* Scoped to this component rather than added to the global stylesheet - the
   house pattern at WaterEventFeedbackSheet.jsx:375 and BulkValveConfirmSheet's
   own SHEET_CSS. IT CANNOT BE AN INLINE `transition`: an inline style beats
   Tailwind's `motion-reduce:transition-none`, so reduced motion would keep the
   spring. The class is dropped entirely while a pointer is down, because a
   transition during a drag fights the finger. */
const SLIDE_CSS = `
.stc-glide { transition: left 200ms ease-out, width 200ms ease-out, opacity 200ms ease-out; }
.stc-sheen { animation: stc-sheen 2600ms ease-in-out infinite; }
@keyframes stc-sheen {
  0%   { left: -6rem; opacity: 0; }
  22%  { opacity: 1; }
  62%  { opacity: 0; }
  100% { left: 100%; opacity: 0; }
}
.stc-nudge { animation: stc-nudge 2600ms ease-in-out infinite; }
@keyframes stc-nudge {
  0%, 62%, 100% { transform: translateX(0); }
  72%           { transform: translateX(3px); }
  84%           { transform: translateX(0); }
}
@media (prefers-reduced-motion: reduce) {
  .stc-glide { transition: none; }
  .stc-sheen { animation: none; display: none; }
  .stc-nudge { animation: none; }
}
`

/**
 * @param {{
 *   label: string,
 *   armedLabel?: string,
 *   armed?: boolean,
 *   tone?: 'destructive'|'primary',
 *   disabled?: boolean,
 *   hintId?: string,
 *   onArm?: () => void,
 *   onDisarm?: () => void,
 * }} props
 */
export default function SlideToConfirm({
  label,
  armedLabel,
  armed = false,
  tone = 'destructive',
  disabled = false,
  hintId,
  onArm,
  onDisarm,
}) {
  /* IN-FLIGHT DRAG POSITION ONLY. The ARMED position is the caller's `armed`
     prop, so a reset from the caller lands immediately with no effect and no
     setState-in-effect. */
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)

  const rootRef = useRef(null)
  const progressRef = useRef(0)
  /* Geometry is read ONCE per drag, at pointerdown: the sheet does not resize
     mid-gesture, and re-measuring on every move is a layout thrash. */
  const dragRef = useRef(null)

  const setP = (n) => {
    progressRef.current = n
    setProgress(n)
  }

  const arm = () => {
    if (disabled || armed) return
    setP(0)
    onArm?.()
  }

  const disarm = () => {
    if (!armed) return
    setP(0)
    onDisarm?.()
  }

  /* NOTHING HAPPENS HERE. The down-event only takes the grip and records where
     the finger started. SC 2.5.2. While ARMED there is no drag to start: the
     whole control is a reset target instead. */
  const onPointerDown = (e) => {
    if (disabled || armed) return
    const rect = rootRef.current?.getBoundingClientRect()
    /* A zero-width rect means layout is not ready (or there is no layout
       engine, as in the DOM tests). 1px keeps the division finite; it never
       makes a release arm on its own, because the threshold is still 90% of
       whatever travel turns out to be. */
    const travel = Math.max(1, (rect?.width || 0) - HANDLE_PX - 2 * PAD_PX)
    dragRef.current = { startX: e.clientX, startP: progressRef.current, travel, id: e.pointerId }
    /* THE GRIP. Without this, sliding the finger off the track hands the
       pointer to another element and the gesture dies - which is the
       path-locked behaviour that would drop this into SC 2.5.1 (Level A). */
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {
      /* Capture is best-effort; the drag still works through the element's
         own move events when it is unavailable. */
    }
    setDragging(true)
  }

  /* `clientY` IS NOT READ. Vertical drift is free, by design - see the 2.5.1
     note in the header. */
  const onPointerMove = (e) => {
    const d = dragRef.current
    if (!d || disabled) return
    setP(clamp(d.startP + (e.clientX - d.startX) / d.travel))
  }

  /* THE ARM, ON RELEASE. Short of the threshold the handle springs back and
     nothing is armed. SC 2.5.2's "abort". NOTHING IS DISPATCHED EITHER WAY -
     the dispatch is a press on the caller's button. */
  const endDrag = (e) => {
    const d = dragRef.current
    if (!d) return
    dragRef.current = null
    setDragging(false)
    try {
      e.currentTarget.releasePointerCapture?.(d.id)
    } catch {
      /* Already released, or never captured. */
    }
    if (progressRef.current >= COMMIT_RATIO) arm()
    else setP(0)
  }

  const step = (delta) => {
    const next = clamp(progressRef.current + delta)
    if (next >= 1) arm()
    else setP(next)
  }

  /* A PRESS ON THE CONFIRMED SLIDER IS THE WAY BACK. Cheap, reversible, and in
     the one place the user is already looking. It can never commit anything,
     so there is no risk in making it a plain click. */
  const onClick = () => {
    if (disabled) return
    disarm()
  }

  const onKeyDown = (e) => {
    if (disabled) return
    if (armed) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'Home') {
        e.preventDefault()
        disarm()
      }
      return
    }
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'Spacebar':
      case 'End':
        e.preventDefault()
        arm()
        break
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault()
        step(KEY_STEP)
        break
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault()
        setP(clamp(progressRef.current - KEY_STEP))
        break
      case 'Home':
        e.preventDefault()
        setP(0)
        break
      default:
        break
    }
  }

  const destructive = tone === 'destructive'
  const fill = destructive ? 'bg-destructive/15' : 'bg-primary/15'
  const handleSkin = destructive
    ? 'bg-destructive text-destructive-foreground'
    : 'bg-primary text-primary-foreground'
  /* THE ARMED POSITION IS THE FAR END, and it is the caller's flag, not ours. */
  const shown = armed ? 1 : progress
  /* `calc(p * (100% - handle - 2*pad))` is the handle's left offset and the
     fill's extra width. Percentages resolve against the track, so no second
     measurement reaches the render path. */
  const travelExpr = `calc(${shown} * (100% - ${HANDLE_PX + 2 * PAD_PX}px))`
  const glide = dragging ? '' : 'stc-glide'
  /* THE LABEL FADES OUT AS THE THRESHOLD APPROACHES, reaching 0 exactly AT
     the arm point, so the user can feel where it is before they arrive. Once
     armed the NEW label is at full strength: it is the next instruction. */
  const labelOpacity = armed ? 1 : Math.max(0, 1 - progress / COMMIT_RATIO)
  /* The invitation only makes sense at rest, on a live, unarmed control. */
  const inviting = !disabled && !dragging && !armed && progress === 0
  const shownLabel = armed ? armedLabel || label : label

  return (
    <>
      {/* OUTSIDE the role="button" element on purpose: a <style> child would
          land inside the control's own subtree, where it pollutes textContent
          and risks a screen reader reaching CSS text. */}
      <style>{SLIDE_CSS}</style>

      <div
        ref={rootRef}
        role="button"
        tabIndex={0}
        aria-disabled={disabled || undefined}
        aria-describedby={hintId}
        onKeyDown={onKeyDown}
        onClick={onClick}
        data-name="slide-to-confirm"
        data-progress={shown}
        data-armed={armed ? 'true' : 'false'}
        className={`relative mt-4 flex h-14 w-full shrink-0 touch-none select-none items-center overflow-hidden rounded-full border bg-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
          armed ? 'border-foreground/30' : 'border-border-strong'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        {/* THE PROGRESS FILL, following the handle. A TINT at 15%, NOT a wash:
            that is what keeps the label on --foreground legible at every
            position in all four themes, including `contrast`. */}
        <div
          aria-hidden="true"
          className={`absolute left-0 top-0 h-full rounded-full ${fill} ${glide}`}
          style={{ width: `calc(${travelExpr} + ${HANDLE_PX + PAD_PX}px)` }}
        />

        {/* THE RESTING INVITATION - a sheen crossing the groove, so the
            control reads as something to be moved rather than pressed. It is
            decorative, it never carries meaning, and `prefers-reduced-motion`
            removes it outright. */}
        {inviting && (
          <div
            aria-hidden="true"
            className="stc-sheen pointer-events-none absolute inset-y-0 z-10 w-24 skew-x-12 bg-foreground/10"
          />
        )}

        {/* The label is the accessible name, and it CHANGES WHEN THE CONTROL
            ARMS, because what a press does changes with it. The caller
            supplies both strings; this file writes no copy. */}
        <span
          className={`pointer-events-none relative z-10 w-full px-16 text-center font-sans text-sm font-semibold leading-snug text-foreground ${glide}`}
          style={{ opacity: labelOpacity }}
        >
          {shownLabel}
        </span>

        {/* THE HANDLE - circular, shadowed, sitting IN the groove, and THE
            ONLY PLACE A DRAG MAY START. Pressing the far end of the track and
            releasing would otherwise be a single tap that arms, which is the
            one thing this control exists to refuse. */}
        <div
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          data-name="slide-to-confirm-thumb"
          className={`absolute top-1 z-20 flex size-12 touch-none items-center justify-center rounded-full shadow-md ${handleSkin} ${
            disabled ? 'cursor-not-allowed' : armed ? 'cursor-pointer' : dragging ? 'cursor-grabbing' : 'cursor-grab'
          } ${glide}`}
          style={{ left: `calc(${travelExpr} + ${PAD_PX}px)` }}
        >
          {/* The direction of travel, stated in the handle. Doubled chevrons
              read as "keep going" where a single one reads as "next". Once
              armed the gesture is spent, so the glyph says so. */}
          {armed ? (
            <Check aria-hidden="true" className="size-5" />
          ) : (
            <ChevronsRight aria-hidden="true" className={`size-5 ${inviting ? 'stc-nudge' : ''}`} />
          )}
        </div>
      </div>
    </>
  )
}
