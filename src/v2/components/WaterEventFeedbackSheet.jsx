/**
 * Water Event feedback — "Was this worth alerting about?"
 *
 * Source of truth: `page-water-event-feedback-end.html`, the product owner's
 * review mockup. It replaces the v1 tag taxonomy (20 chips across two groups,
 * every tag a chip, no primary question — PRD 15 § 5.4) with one primary
 * question, 4–6 scoped chips per branch, nothing mandatory, and an animated
 * reward on tap.
 *
 * TWO TRIGGERS, ONE QUESTION
 *   trigger="event-ended"  fires after a water event ends. Opens straight on
 *                          the question. Yes adds a "Was it fixed?" toggle.
 *   trigger="ignore"       fires when the user taps Ignore on a LIVE event.
 *                          Opens on the consequences, not the question — the
 *                          user confirms before anything commits, and only
 *                          then does the sheet morph into the same question
 *                          with Ignore-specific chips. No "Was it fixed?"
 *                          (the event is still running), no Undo, no tag-type
 *                          picker. Allowed in the Warning state only, never
 *                          Shutoff: pass `eventState` and the sheet refuses to
 *                          render on 'shutoff' as a backstop — the real gate
 *                          belongs to the caller.
 *
 * NOTHING IS MANDATORY
 * The mockup says this twice. A single tap on Yes or No is a complete answer:
 * closing the sheet at any point after that still persists it. Chips, the
 * fixed-state and the note are all optional detail on top.
 *
 * WHY NOT THE SHADCN <Sheet>
 * shadcn's Sheet is a Radix dialog that portals to document.body, and this app
 * draws inside a fixed 393x852 frame (src/components/Phone.jsx) — a portal
 * escapes that frame by design and covers the whole browser window. Every
 * sheet in this repo is an `absolute inset-0` overlay inside the page instead:
 * SystemsFilterSheet:97, ValveConfirmSheet. This follows that house pattern
 * and uses shadcn Button / Toggle / ToggleGroup / Badge / Separator INSIDE it.
 *
 * ANIMATION WITHOUT TIMERS
 * The mockup sequences the reward and the follow-up with setTimeout. Here the
 * follow-up is always mounted and revealed by a delayed CSS animation
 * (`wef-reveal`, 420ms delay, fill-mode both) instead. Same perceived
 * sequence, but the content is in the DOM the whole time — which keeps the
 * "one tap finishes it" promise honest for keyboard and screen-reader users,
 * and keeps the component testable without fake timers.
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
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, X, TriangleAlert, BellOff, Clock, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  addFeedback,
  getLearnedCount,
  FIXED_STATES,
  FIXED_STATE_LABEL,
} from '@/data/eventFeedbackStore'
import { getCurrentActor } from '@/data/currentUser'

/* ── Copy & chips ───────────────────────────────────────────────────────────
   Verbatim from the mockup. Exported so a test (or a future PRD rewrite) can
   assert against the list rather than retyping it. */

const PRIMARY_QUESTION = 'Was this worth alerting about?'
const PRIMARY_HINT = 'Your answer helps Wint learn. Nothing is mandatory.'
const SOMETHING_ELSE = 'Something else'
const NOTE_MAX = 140

/** Demo gamification. The mockup's own numbers. */
const POINTS = { PRIMARY: 5, CHIP: 5, NOTE: 10 }

const FIXED_OPTIONS = [
  FIXED_STATES.FIXED,
  FIXED_STATES.NOT_YET,
  // "Resolved on its own" means auto-shutoff or self-stop — the mockup's
  // commentary is explicit, and it is why this is not a two-state toggle.
  FIXED_STATES.SELF_RESOLVED,
]

const FLOWS = {
  'event-ended': {
    context: 'Water event ended',
    yes: {
      microcopy: 'Thanks — Wint learned from this.',
      heading: 'What was it?',
      chips: [
        'Running or stuck toilet',
        'Leaking fixture',
        'Burst or broken pipe',
        'Irrigation stuck on',
        'Appliance leak',
        SOMETHING_ELSE,
      ],
      askFixed: true,
    },
    no: {
      microcopy: 'Thanks — Wint will be quieter here.',
      heading: 'What was it really?',
      chips: [
        'Pool / tub / spa filling',
        'Scheduled irrigation',
        'Heavy use (cleaning / laundry / guests)',
        'Construction or maintenance',
        'One-off event',
        SOMETHING_ELSE,
      ],
      askFixed: false,
    },
  },
  ignore: {
    context: 'Ignore water event',
    contextAfterConfirm: 'Water event ignored',
    yes: {
      microcopy: "Thanks — we'll stay out of your way.",
      heading: 'Why ignore it then?',
      chips: [
        'Already fixing it',
        'Plumber scheduled',
        'Known ongoing issue',
        'Water shut off manually',
        SOMETHING_ELSE,
      ],
      // No "Was it fixed?" here. The event is still live — the mockup lists
      // this under "What's intentionally missing".
      askFixed: false,
    },
    no: {
      microcopy: 'Thanks — Wint will be quieter here.',
      heading: "What's happening instead?",
      chips: [
        'Filling a pool / tub / spa',
        'Running irrigation',
        'Heavy use today',
        'Construction or maintenance',
        'This is normal here',
        SOMETHING_ELSE,
      ],
      askFixed: false,
    },
  },
}

/* ── Animation ──────────────────────────────────────────────────────────────
   Scoped to this component rather than added to the global stylesheet: the
   sheet is additive and should not leave keyframes behind if it is dropped.
   Everything collapses under prefers-reduced-motion. */
const SHEET_CSS = `
.wef-pop { animation: wef-pop 480ms cubic-bezier(.3,1.4,.4,1); }
@keyframes wef-pop {
  0%   { transform: scale(.5); opacity: 0; }
  60%  { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
/* The only two-argument var()s left in src/v2 after Phase 3, and deliberately
   so: --tx/--ty and --bx/--by are not design tokens. Each particle sets its own
   pair as an inline style (see the style={{ '--tx': … }} props below), and the
   second argument is this animation's own default for the frame before that
   style lands. There is no token to point at and nothing to fail loudly about. */
.wef-particle { animation: wef-fly 700ms ease-out forwards; opacity: 0; }
@keyframes wef-fly {
  0%   { transform: translate(-50%,-50%) scale(.4); opacity: 1; }
  100% { transform: translate(var(--tx,-50%), var(--ty,-50%)) scale(1); opacity: 0; }
}
.wef-reveal { animation: wef-reveal 320ms ease-out 420ms both; }
@keyframes wef-reveal {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.wef-float { animation: wef-float 1200ms cubic-bezier(.2,.8,.3,1) forwards; }
@keyframes wef-float {
  0%   { transform: translate(-50%,-50%) scale(.5); opacity: 0; }
  15%  { transform: translate(-50%,-70%) scale(1.1); opacity: 1; }
  70%  { transform: translate(-50%,-140%) scale(1); opacity: 1; }
  100% { transform: translate(-50%,-200%) scale(.85); opacity: 0; }
}
.wef-glow { animation: wef-glow 1000ms ease-out forwards; }
@keyframes wef-glow {
  0%   { opacity: 0; transform: scale(.6); }
  30%  { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.3); }
}
.wef-burst { animation: wef-burst 1100ms cubic-bezier(.2,.7,.4,1) forwards; opacity: 0; }
@keyframes wef-burst {
  0%   { transform: translate(-50%,-50%) scale(.4) rotate(0); opacity: 0; }
  15%  { transform: translate(-50%,-50%) scale(1.2) rotate(90deg); opacity: 1; }
  100% { transform: translate(var(--bx,-50%), var(--by,-50%)) scale(1) rotate(360deg); opacity: 0; }
}
.wef-sheet { animation: wef-rise 320ms cubic-bezier(.33,.9,.25,1); }
@keyframes wef-rise { from { transform: translateY(100%); } to { transform: translateY(0); } }
.wef-pulse { animation: wef-pulse 260ms ease-out; }
@keyframes wef-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .wef-pop, .wef-particle, .wef-reveal, .wef-float, .wef-glow,
  .wef-burst, .wef-sheet, .wef-pulse { animation: none; }
  .wef-particle, .wef-burst { display: none; }
}
`

/** Yes and No are the same control twice; only the glyph differs. */
const CHOICE_CLASS =
  'h-auto flex-col gap-[8px] rounded-[14px] border-[1.5px] border-border bg-card px-[12px] py-[20px] text-[17px] font-bold text-slate-800'

/* Deterministic scatter — the mockup randomises, but a stable render keeps
   snapshots and reviews honest and costs nothing visually. */
const scatter = (i, n, spread) => {
  const angle = (i / n) * Math.PI * 2 + (i % 3) * 0.12
  const dist = spread + ((i * 37) % spread)
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }
}

function Particles({ tone }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {Array.from({ length: 10 }, (_, i) => {
        const { x, y } = scatter(i, 10, 36)
        return (
          <span
            key={i}
            className={cn(
              'wef-particle absolute left-1/2 top-1/2 size-[7px] rounded-full',
              tone === 'yes' ? 'bg-success' : 'bg-primary',
            )}
            style={{
              '--tx': `calc(-50% + ${x.toFixed(1)}px)`,
              '--ty': `calc(-50% + ${y.toFixed(1)}px)`,
              animationDelay: `${i * 14}ms`,
            }}
          />
        )
      })}
    </span>
  )
}

const CELEBRATION_COLORS = ['#f59e0b', '#ffb800', 'var(--primary)', '#5c9e1a', '#db4670', '#a855f7']

function Celebration() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-[60] overflow-hidden">
      <span className="wef-glow absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(245,158,11,.35)_0%,rgba(11,129,248,.15)_40%,transparent_70%)]" />
      {Array.from({ length: 28 }, (_, i) => {
        const { x, y } = scatter(i, 28, 150)
        const sparkle = i % 5 === 0
        const square = i % 3 === 0 && !sparkle
        return (
          <span
            key={i}
            className={cn(
              'wef-burst absolute left-1/2 top-[55%]',
              sparkle
                ? 'size-[6px] rounded-full bg-card shadow-[0_0_8px_#fff,0_0_14px_rgba(255,255,255,.6)]'
                : square
                  ? 'h-[12px] w-[8px] rounded-[2px]'
                  : 'size-[10px] rounded-full',
            )}
            style={{
              '--bx': `calc(-50% + ${x.toFixed(1)}px)`,
              '--by': `calc(-50% + ${y.toFixed(1)}px)`,
              animationDelay: `${i * 18}ms`,
              ...(sparkle ? null : { background: CELEBRATION_COLORS[i % CELEBRATION_COLORS.length] }),
            }}
          />
        )
      })}
    </span>
  )
}

/** One consequence of Ignore. Danger rows get the high-severity treatment —
 *  the valve bullet and the irreversibility bullet are the two that cost. */
function WarnPoint(props) {
  const Icon = props.icon
  const { danger, children } = props
  return (
    <li className="mb-[10px] flex items-start gap-[10px]">
      <span
        aria-hidden="true"
        className={cn(
          'mt-[1px] flex size-[20px] shrink-0 items-center justify-center rounded-full',
          danger
            ? 'bg-severity-high/14 text-severity-high'
            : 'bg-slate-100 text-slate-700',
        )}
      >
        <Icon size={12} strokeWidth={2.4} />
      </span>
      <span className="text-[13px] text-slate-700 leading-[19px]">
        {children}
      </span>
    </li>
  )
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {'event-ended'|'ignore'} [props.trigger]
 * @param {string} props.systemId          storage key + what the record points at
 * @param {string} [props.eventKey]        override the storage key (closed event id)
 * @param {string} [props.systemName]      shown in the sheet's context line
 * @param {string} [props.eventLabel]      e.g. "High Flow · 6h 36m"
 * @param {'warning'|'shutoff'} [props.eventState]  Ignore is refused on 'shutoff'
 * @param {'warning'|'question'|'yes'|'no'|'done'} [props.initialStep]  review/test driver
 * @param {() => void} [props.onCancel]
 * @param {() => void} [props.onIgnoreConfirmed]
 * @param {(record: object|null) => void} [props.onComplete]
 */
export default function WaterEventFeedbackSheet(props) {
  const { open, trigger = 'event-ended', eventState, initialStep } = props
  if (!open) return null
  // Backstop for the locked rule: Ignore is a Warning-state action only, never
  // Shutoff. The real gate belongs to the caller; this stops a mis-wire.
  if (trigger === 'ignore' && eventState === 'shutoff') return null
  // The key is the reset. Closing unmounts the sheet and reopening builds a
  // fresh one, and a reviewer driving `initialStep` from Yes to No gets a
  // clean run rather than a half-filled one. No reset effect, no stale state.
  return <FeedbackSheet key={`${trigger}:${initialStep || ''}`} {...props} />
}

function FeedbackSheet({
  trigger = 'event-ended',
  systemId,
  eventKey,
  systemName,
  eventLabel,
  initialStep,
  onCancel,
  onIgnoreConfirmed,
  onComplete,
}) {
  const isIgnore = trigger === 'ignore'
  const flow = FLOWS[isIgnore ? 'ignore' : 'event-ended']
  const storageKey = eventKey || systemId

  /* Where the sheet opens. The ignore flow always opens on the consequences;
     everything else opens on the question. `initialStep` is the review /
     test driver — the mockup's own "Jump to: Yes branch" / "Jump to: No
     branch" / "Reset flow" controls, expressed as a prop. */
  const jump = initialStep || (isIgnore ? 'warning' : 'question')
  const jumpBranch = jump === 'yes' || jump === 'no' ? jump : null

  const [step, setStep] = useState(
    jumpBranch ? 'branch' : jump === 'warning' && !isIgnore ? 'question' : jump,
  )
  const [answer, setAnswer] = useState(jumpBranch)
  const [chips, setChips] = useState([])
  const [fixed, setFixed] = useState(null)
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  // Landing on a branch counts as having tapped the primary answer, so the
  // score reads the same as it would for a user who got there by hand.
  const [points, setPoints] = useState(jumpBranch || jump === 'done' ? POINTS.PRIMARY : 0)
  const [ignoreConfirmed, setIgnoreConfirmed] = useState(isIgnore ? jump !== 'warning' : false)
  const [floats, setFloats] = useState([])
  const [celebrate, setCelebrate] = useState(false)
  const [learned, setLearned] = useState(() => getLearnedCount())

  const hostRef = useRef(null)
  const noteRef = useRef(null)
  const committed = useRef(null)
  const closed = useRef(false)
  const floatId = useRef(0)

  useEffect(() => {
    if (noteOpen) noteRef.current?.focus()
  }, [noteOpen])

  /** Persist once. Called on Done and on any dismissal that happens after the
      primary question has been answered — "nothing is mandatory" only works if
      a single tap survives the user walking away. */
  const commit = useCallback(
    (ans, score) => {
      if (committed.current || !ans) return committed.current
      committed.current = addFeedback(storageKey, {
        trigger: isIgnore ? 'ignore' : 'event-ended',
        answer: ans,
        chips,
        note,
        fixed,
        points: score,
        systemId,
        actor: getCurrentActor(),
      })
      return committed.current
    },
    [storageKey, isIgnore, chips, note, fixed, systemId],
  )

  const close = useCallback(
    (reason) => {
      if (closed.current) return
      closed.current = true
      if (answer) {
        onComplete?.(commit(answer, points))
      } else if (isIgnore && ignoreConfirmed) {
        // The ignore is already committed by the caller; the feedback was
        // skipped. That is a complete outcome, not a cancel.
        onComplete?.(null)
      } else if (reason === 'cancel' || !answer) {
        onCancel?.()
      }
    },
    [answer, points, commit, isIgnore, ignoreConfirmed, onCancel, onComplete],
  )

  /* Escape closes. Radix gave this for free; an in-frame overlay says so
     itself. On the warning step Escape is a Cancel — nothing has committed. */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(step === 'warning' ? 'cancel' : 'dismiss') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, close])

  /* The Thanks panel holds, then hands back. Longer when the user went deep
     enough to earn the celebration. */
  useEffect(() => {
    if (step !== 'done') return
    const t = setTimeout(() => close('done'), celebrate ? 2400 : 2000)
    return () => clearTimeout(t)
  }, [step, celebrate, close])

  /* Floating "+N" badges clean themselves up. */
  useEffect(() => {
    if (!floats.length) return
    const t = setTimeout(() => setFloats((f) => f.slice(1)), 1200)
    return () => clearTimeout(t)
  }, [floats])

  const award = useCallback((n, el) => {
    setPoints((p) => p + n)
    if (n <= 0) return
    const host = hostRef.current
    const r = el?.getBoundingClientRect?.()
    const hr = host?.getBoundingClientRect?.()
    const id = ++floatId.current
    setFloats((f) => [
      ...f,
      {
        id,
        n,
        x: r && hr ? r.left - hr.left + r.width / 2 : null,
        y: r && hr ? r.top - hr.top + 10 : null,
      },
    ])
  }, [])

  const chooseAnswer = (value, el) => {
    if (answer) return
    setAnswer(value)
    setStep('branch')
    award(POINTS.PRIMARY, el)
  }

  const toggleChip = (label, el) => {
    if (chips.includes(label)) {
      setChips((prev) => prev.filter((c) => c !== label))
      setPoints((p) => p - POINTS.CHIP)
      return
    }
    setChips((prev) => [...prev, label])
    award(POINTS.CHIP, el)
    // "Something else" is the only chip that opens the note by itself.
    if (label === SOMETHING_ELSE) setNoteOpen(true)
  }

  const chooseFixed = (value, el) => {
    // Radix hands back '' when the pressed item is pressed again.
    if (!value) { setFixed(null); setPoints((p) => p - POINTS.CHIP); return }
    // Switching between the three is one decision, scored once — the mockup
    // re-awards on every tap, which turns the toggle into a points faucet.
    if (!fixed) award(POINTS.CHIP, el)
    setFixed(value)
  }

  const changeNote = (raw) => {
    // Clipped here as well as by maxLength: a paste, an IME commit or a
    // programmatic set all beat the attribute.
    const next = raw.slice(0, NOTE_MAX)
    const had = note.trim().length > 0
    const has = next.trim().length > 0
    if (!had && has) award(POINTS.NOTE, noteRef.current)
    if (had && !has) setPoints((p) => p - POINTS.NOTE)
    setNote(next)
  }

  const confirmIgnore = () => {
    setIgnoreConfirmed(true)
    setStep('question')
    onIgnoreConfirmed?.()
  }

  const finish = () => {
    // The screen-wide celebration is reserved for the users who went deep
    // enough to type something; a chip tap gets the small burst only.
    setCelebrate(note.trim().length > 0)
    commit(answer, points)
    // Read AFTER the commit, so "Wint has learned N times" counts this one.
    setLearned(getLearnedCount())
    setStep('done')
  }

  const branch = answer ? flow[answer] : null
  const context = isIgnore && ignoreConfirmed ? flow.contextAfterConfirm : flow.context
  const title = step === 'warning' ? 'Ignore this water event?' : PRIMARY_QUESTION

  return (
    <div
      ref={hostRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="absolute inset-0 z-50 flex flex-col justify-end"
    >
      <style>{SHEET_CSS}</style>

      {/* Scrim. On the warning step a tap outside is a Cancel — Ignore never
          commits by accident. Afterwards it is a dismissal, and whatever was
          answered is kept. */}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => close(step === 'warning' ? 'cancel' : 'dismiss')}
        className="absolute inset-0 cursor-default bg-[rgba(20,21,26,0.42)]"
      />

      <div className="wef-sheet relative flex max-h-[85%] flex-col overflow-hidden rounded-t-[24px] bg-surface-card shadow-[0_-8px_32px_rgba(0,0,0,0.18)]">
        <div aria-hidden="true" className="mx-auto mb-[6px] mt-[10px] h-[4px] w-[36px] rounded-[2px] bg-[#dee0e3]" />

        <div className="flex items-center justify-between gap-[10px] px-[18px] pb-[10px] pt-[4px]">
          <p className="min-w-0 flex-1 truncate text-[12px] font-medium tracking-[0.2px] text-muted-foreground leading-[16px]">
            {[context, systemName, eventLabel].filter(Boolean).join(' · ')}
          </p>

          <div className="flex items-center gap-[10px]">
            {points > 0 ? (
              <Badge
                key={points}
                aria-label={`${points} points earned`}
                className={cn(
                  'wef-pulse border-transparent px-[10px] py-[4px] text-[12px] font-bold',
                  points >= POINTS.NOTE
                    ? 'bg-[linear-gradient(135deg,rgba(255,184,0,.22),rgba(245,158,11,.28))] text-[#b45309]'
                    : 'bg-primary/10 text-primary',
                )}
              >
                +{points}
              </Badge>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close"
              onClick={() => close(step === 'warning' ? 'cancel' : 'dismiss')}
              className="rounded-full text-muted-foreground"
            >
              <X size={16} strokeWidth={2.2} />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-[24px] pt-[8px]">
          {/* ── Ignore: consequences first, before the question ───────────── */}
          {step === 'warning' ? (
            <section>
              <div className="my-[10px] flex items-center gap-[10px]">
                <span
                  aria-hidden="true"
                  className="flex size-[36px] shrink-0 items-center justify-center rounded-full bg-severity-high/12 text-severity-high"
                >
                  <TriangleAlert size={20} strokeWidth={2.2} />
                </span>
                <h2 className="text-[18px] font-bold tracking-[-0.3px] text-foreground leading-[24px]">
                  Ignore this water event?
                </h2>
              </div>

              <p className="mx-[2px] mb-[12px] text-[13.5px] text-slate-700 leading-[21px]">
                You&rsquo;re telling Wint this flow is OK. Here&rsquo;s what happens:
              </p>

              <ul className="m-0 list-none p-0">
                <WarnPoint icon={X} danger>
                  The valve will <strong>not</strong> be automatically closed, even if the flow keeps
                  growing.
                </WarnPoint>
                <WarnPoint icon={BellOff}>
                  You won&rsquo;t get more notifications about <em>this</em> event. New events still
                  alert normally.
                </WarnPoint>
                <WarnPoint icon={Clock}>
                  Wint keeps measuring. The event stays visible as <strong>Ignored</strong> until the
                  water flow actually stops.
                </WarnPoint>
                <WarnPoint icon={RotateCcw} danger>
                  This can&rsquo;t be undone for this event.
                </WarnPoint>
              </ul>

              <Separator className="mt-[16px] bg-slate-100" />
              <div className="mt-[12px] flex gap-[10px]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => close('cancel')}
                  className="h-[46px] flex-1 rounded-[12px] bg-card text-[14px] font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={confirmIgnore}
                  className="h-[46px] flex-1 rounded-[12px] bg-severity-high text-[14px] font-bold hover:bg-[#ba365c]"
                >
                  Ignore anyway
                </Button>
              </div>
            </section>
          ) : null}

          {/* ── The one primary question ──────────────────────────────────── */}
          {step === 'question' ? (
            <section>
              <h2 className="mx-[4px] mb-[20px] mt-[10px] text-[20px] font-bold tracking-[-0.3px] text-foreground leading-[26px]">
                {PRIMARY_QUESTION}
              </h2>

              <div className="grid grid-cols-2 gap-[12px]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => chooseAnswer('yes', e.currentTarget)}
                  className={CHOICE_CLASS}
                >
                  <span aria-hidden="true" className="flex size-[36px] items-center justify-center rounded-full bg-success/14 text-success">
                    <Check size={20} strokeWidth={2.4} />
                  </span>
                  Yes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => chooseAnswer('no', e.currentTarget)}
                  className={CHOICE_CLASS}
                >
                  <span aria-hidden="true" className="flex size-[36px] items-center justify-center rounded-full bg-primary/10 text-primary">
                    <X size={20} strokeWidth={2.4} />
                  </span>
                  No
                </Button>
              </div>

              <p className="mt-[12px] text-center text-[11px] text-muted-foreground leading-[15px]">
                {PRIMARY_HINT}
              </p>
            </section>
          ) : null}

          {/* ── Reward, then the scoped follow-up ─────────────────────────── */}
          {step === 'branch' && branch ? (
            <section>
              <div className="flex flex-col items-center gap-[6px] pb-[14px] pt-[10px]">
                <span className="relative flex size-[88px] items-center justify-center">
                  <Particles tone={answer} />
                  <span
                    aria-hidden="true"
                    className={cn(
                      'wef-pop flex size-[56px] items-center justify-center rounded-full',
                      answer === 'yes'
                        ? 'bg-success/15 text-success'
                        : 'bg-primary/15 text-primary',
                    )}
                  >
                    <Check size={26} strokeWidth={2.6} />
                  </span>
                </span>
                <p className="text-[13px] font-semibold text-slate-700 leading-[18px]">
                  {branch.microcopy}
                </p>
              </div>

              <div className="wef-reveal">
                <h3 className="mx-[2px] mb-[10px] mt-[14px] text-[15px] font-bold text-foreground leading-[20px]">
                  {branch.heading}
                </h3>

                <div className="flex flex-wrap gap-[8px]">
                  {branch.chips.map((label) => (
                    <Toggle
                      key={label}
                      variant="outline"
                      pressed={chips.includes(label)}
                      onClick={(e) => toggleChip(label, e.currentTarget)}
                      className={cn(
                        'h-auto rounded-full border-[1.5px] border-border bg-card px-[14px] py-[9px] text-[13px] font-semibold text-slate-700 data-[state=on]:border-primary data-[state=on]:bg-primary/8 data-[state=on]:text-primary leading-[17px]',
                        label === SOMETHING_ELSE && 'border-dashed',
                      )}
                    >
                      {label}
                    </Toggle>
                  ))}
                </div>

                {/* Yes branch of the end-of-event flow only. Never on Ignore —
                    the event is still running, so "Was it fixed?" has no
                    answer yet. */}
                {branch.askFixed ? (
                  <>
                    <h3 className="mx-[2px] mb-[10px] mt-[14px] text-[15px] font-bold text-foreground leading-[20px]">
                      Was it fixed?
                    </h3>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      spacing={1.5}
                      value={fixed || ''}
                      onValueChange={(v) => chooseFixed(v, null)}
                      aria-label="Was it fixed?"
                      className="flex-wrap"
                    >
                      {FIXED_OPTIONS.map((value) => (
                        <ToggleGroupItem
                          key={value}
                          value={value}
                          className="h-auto rounded-full border-[1.5px] border-border bg-card px-[12px] py-[7px] text-[12.5px] font-semibold text-slate-700 data-[state=on]:border-primary data-[state=on]:bg-primary/8 data-[state=on]:text-primary leading-[16px]"
                        >
                          {FIXED_STATE_LABEL[value]}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </>
                ) : null}

                {noteOpen ? (
                  <div className="mt-[10px]">
                    <textarea
                      ref={noteRef}
                      value={note}
                      maxLength={NOTE_MAX}
                      aria-label="Note (optional)"
                      placeholder="Describe briefly..."
                      onChange={(e) => changeNote(e.target.value)}
                      className="h-[72px] w-full resize-none rounded-[10px] border-[1.5px] border-border bg-card px-[12px] py-[10px] text-[13px] text-foreground outline-none focus:border-primary leading-[18px]"
                    />
                    <p className="mt-[4px] text-right text-[11px] text-slate-400 leading-[15px]">
                      {note.length}/{NOTE_MAX}
                    </p>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setNoteOpen(true)}
                    className="h-auto justify-start px-0 py-[10px] text-[13px] font-semibold text-primary no-underline hover:no-underline"
                  >
                    + Add note (optional)
                  </Button>
                )}

                <Separator className="mt-[16px] bg-slate-100" />
                <Button
                  type="button"
                  onClick={finish}
                  className="mt-[12px] h-[46px] w-full rounded-[12px] bg-primary text-[14px] font-bold"
                >
                  Done
                </Button>
              </div>
            </section>
          ) : null}

          {/* ── Thanks ────────────────────────────────────────────────────── */}
          {step === 'done' ? (
            <section className="flex flex-col items-center gap-[14px] px-[24px] pb-[32px] pt-[36px] text-center">
              <span
                aria-hidden="true"
                className="wef-pop flex size-[72px] items-center justify-center rounded-full bg-success/14 text-success"
              >
                <Check size={34} strokeWidth={2.6} />
              </span>
              <h2 className="text-[18px] font-bold tracking-[-0.3px] text-foreground leading-[24px]">
                Thanks!
              </h2>
              <p className="text-[32px] font-extrabold tracking-[-0.8px] text-primary leading-[36px]">
                +{points} points
              </p>
              <p className="mt-[4px] text-[13px] text-muted-foreground leading-[18px]">
                Wint has learned <strong>{learned}</strong> times from your feedback.
              </p>
            </section>
          ) : null}
        </div>
      </div>

      {/* Floating "+N" badges fly from the tap toward the points chip. */}
      {floats.map((f) => (
        <span
          key={f.id}
          aria-hidden="true"
          className={cn(
            'wef-float pointer-events-none absolute z-[60] rounded-full px-[11px] py-[5px] font-extrabold tracking-[-0.3px] text-white',
            f.n >= POINTS.NOTE
              ? 'bg-[linear-gradient(135deg,#ffb800_0%,#f59e0b_100%)] text-[15px]'
              : 'bg-primary text-[13px]',
          )}
          style={{ left: f.x ?? '50%', top: f.y ?? '20%' }}
        >
          +{f.n}
        </span>
      ))}

      {celebrate && step === 'done' ? <Celebration /> : null}
    </div>
  )
}
