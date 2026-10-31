/**
 * Water Event feedback — two flows, two sources of truth.
 *
 * ── 2026-10-29: FIGMA SUPERSEDES THE HTML MOCKUP, FOR THE IGNORE FLOW ──────
 * This file's source of truth USED TO BE `page-water-event-feedback-end.html`,
 * the product owner's review mockup in the sandbox repo. Two Figma nodes now
 * contradict it, the owner was shown the conflict explicitly, and ruled:
 * **Figma wins. Rebuild the sheet.**
 *
 *   199745:20202  "Ignore this water event?"  → step 'warning'
 *   199748:26265  "Document alert handling"   → step 'question' (ignore)
 *                  (the heading is the ONE string the owner has overridden —
 *                   it ships as "Help us improve"; see IGNORE_HEADING below)
 *
 * SUPERSEDED, NOT DELETED — the old reasoning is kept below because deleting
 * it is how a ruling gets re-derived. Two sessions in this codebase have
 * already rebuilt a decision that had been settled, because the reasoning was
 * removed instead of marked. What the ruling retired, for the ignore flow:
 *
 *   • the primary question "Was this worth alerting about?"
 *   • its Yes/No branch and the two per-branch headings
 *     ("Why ignore it then?" / "What's happening instead?")
 *   • the points / gamification reward and the "Thanks!" panel
 *
 * THE RULING IS SCOPED TO THE IGNORE FLOW, AND THAT SCOPE IS FORCED.
 * Both frames draw `trigger="ignore"`. NO frame covers `trigger="event-ended"`,
 * which is live (the push "Tag the cause" CTA, `?action=tag`, reaches it via
 * SystemPageV2Screen). Applying the ruling to it as well would leave that flow
 * with no heading and no entry control, and the only way to fill the hole is to
 * author copy — which the owner has forbidden in the same breath ("transcribe
 * the frame; never write a string the frame does not contain"). So the
 * event-ended flow below is UNCHANGED, question and reward included, and the
 * collision is reported rather than resolved here.
 *
 * ── 2026-10-31: THREE OWNER RULINGS DIVERGE FROM 199748:26265 ─────────────
 * The owner ruled on 2026-10-31 on the documentation step, and the ruling
 * OUTRANKS the transcribe-the-frame instruction stated at :28-33 above — the
 * same way IGNORE_HEADING's override does, and for the same reason: the owner
 * was shown the frame's own string and asked for something else. The three
 * changes, and ONLY these three:
 *
 *   1. The final button reads "Done", not the frame's "Ignore anyway". See
 *      IGNORE_DONE_LABEL.
 *   2. The six chips are CAUSES of the water, not reasons for ignoring. See
 *      IGNORE_CAUSES.
 *   3. "Unnecessary Alert" is no longer one of those six. It sits BELOW them
 *      as its own control, because it is a verdict on the alert and not a
 *      cause. See UNNECESSARY_ALERT.
 *
 * A DIFF AGAINST 199748:26265 WILL FLAG ALL THREE, FOREVER. The node is
 * unchanged — verified in the Figma cache on 2026-10-31: it still draws the
 * six old reason chips and still labels the final button "Ignore anyway".
 * The code is what is right here. Do not "correct" any of it back without a
 * ruling that reverses this one. Everything else in the ignore flow is still
 * a verbatim transcription.
 *
 * THE ACCEPTED CONSEQUENCE, stated by the owner rather than discovered here:
 * the ignore flow no longer captures WHY the user ignored the alert, only
 * what caused the water. The ignored-incident badge that reads "Plumber
 * scheduled" today will read "Stuck or running toilet". That is the trade.
 *
 * ── THE SUPERSEDED REASONING (kept for the record) ────────────────────────
 * The HTML mockup replaced the v1 tag taxonomy (20 chips across two groups,
 * every tag a chip, no primary question — PRD 15 § 5.4) with ONE primary
 * question, 4-6 scoped chips per branch, nothing mandatory, and an animated
 * reward on tap. That shape still governs `event-ended`. For `ignore` it is
 * retired: the frames ask no question, score nothing, and document the ignore
 * with one flat chip set instead of a branch.
 *
 * TWO TRIGGERS
 *   trigger="event-ended"  fires after a water event ends. Opens straight on
 *                          the question. Yes adds a "Was it fixed?" toggle.
 *                          Governed by the HTML mockup. Unchanged.
 *   trigger="ignore"       fires when the user taps Ignore on a LIVE event.
 *                          Opens on the consequences (199745:20202); "Ignore
 *                          anyway" commits the ignore and moves to the
 *                          documentation step (199748:26265). Allowed in the
 *                          Warning state only, never Shutoff: pass `eventState`
 *                          and the sheet refuses to render on 'shutoff' as a
 *                          backstop — the real gate belongs to the caller.
 *
 * NOTHING IS MANDATORY — still true on both flows. On `ignore` the ignore
 * itself commits on the first "Ignore anyway"; the documentation after it is
 * optional, and closing without touching a chip records nothing rather than
 * recording an empty answer.
 *
 * THE DERIVED `answer`, AND WHY IT IS A SHIM — REPORTED, NOT FIXED.
 * `eventFeedbackStore.addFeedback` hard-rejects any record whose `answer` is
 * not 'yes' or 'no' (eventFeedbackStore.js:176, "if (answer !== 'yes' &&
 * answer !== 'no') return null"). That gate is UNCONDITIONAL and SILENT: an
 * `answer` of undefined makes addFeedback return null for every ignore
 * record, onComplete fires with null, the ignored-incident summary is null
 * and the badge never appears again — no error, no warning, nothing in the
 * console. The ignore flow no longer ASKS that question, so a faithful
 * transcription would write exactly that undefined and quietly destroy every
 * record the step exists to capture.
 *
 * Until the store's gate is revisited (that file is not this change's to
 * edit), the answer is DERIVED. Since 2026-10-31 it is derived from the
 * "Unnecessary Alert" CONTROL below the causes rather than from the `chips`
 * array — the control is the only thing on the step that is a verdict on the
 * alert, and it is precisely the old "No, not worth alerting about". The
 * expression is total by construction: on → 'no', off → 'yes', with no third
 * arm and no lookup that can miss, so `answer` cannot reach the store as
 * undefined. If this is ever re-pointed again, keep that property. This is a
 * mapping, not invented copy — but it is a shim, and it is flagged.
 *
 * WHY NOT THE SHADCN <Sheet>
 * shadcn's Sheet is a Radix dialog that portals to document.body, and this app
 * draws inside a fixed 393x852 frame (src/components/Phone.jsx) — a portal
 * escapes that frame by design and covers the whole browser window
 * (ValveConfirmSheet.jsx:17-25 documents that failure). Every sheet in this
 * repo is an `absolute inset-0` overlay inside the page instead:
 * SystemsFilterSheet:97, ValveConfirmSheet. This follows that house pattern
 * and uses shadcn Button / Toggle / ToggleGroup / Badge / Separator INSIDE it.
 *
 * ANIMATION WITHOUT TIMERS — event-ended only now.
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
 *
 * TOKEN MAP FOR THE TWO FRAMES. Figma names on the left, the utility that
 * paints them here on the right. Three of them deliberately do NOT transcribe
 * the literal, and the reason is the same one ValveStatusCard.jsx:165-190
 * measured across all four themes — the slate ramp is the INK ramp and it
 * INVERTS per theme, so a literal `bg-slate-900` fill is a near-WHITE button
 * under `dark`:
 *
 *   colors/slate/900 (button ground) → bg-foreground + text-background
 *                                      (the declared inverted-button pair;
 *                                       the only one that clears AA in all
 *                                       four themes)
 *   colors/slate/950 (Cancel ink)    → text-foreground   — one tonal step up,
 *   colors/slate/700 (Cancel border) → border-foreground   for the same reason
 *   colors/slate/300 (grab handle)   → bg-slate-300
 *   colors/slate/100 (chips, icon discs, close button) → bg-muted
 *   colors/slate/700 (chip ink)      → text-slate-700
 *   colors/slate/800 (headings)      → text-slate-800
 *   colors/red/50    (irreversible panel) → bg-alert-surface-critical
 *   #e8f1df          (ignored banner, un-tokened in Figma) → bg-alert-surface-success
 *   #fafbfc          (sheet chassis)  → bg-surface-card
 *   black            (bullet body)    → text-foreground
 *
 * The scrim was a literal `rgba(20,21,26,0.42)`. Figma draws colors/slate/600
 * at 70%, which is a fixed slate and would not survive `dark`; the house
 * spelling is `bg-foreground/45` (ValveConfirmSheet.jsx:47,109) and that is
 * what it uses now — a token, and the same veil.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  X,
  Droplets,
  MessageSquareOff,
  RefreshCwOff,
  Smile,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import ValveStatus from '@/v2/components/ValveStatus'
import {
  addFeedback,
  getLearnedCount,
  FIXED_STATES,
  FIXED_STATE_LABEL,
} from '@/data/eventFeedbackStore'
import { getCurrentActor } from '@/data/currentUser'
/* The ignore gate lives in its own module, not here, because this file
   exports a component — see ignoreGate.js for why it is shared at all. */
import { acceptsIgnore } from '@/v2/components/ignoreGate'

/* ── Copy & chips ───────────────────────────────────────────────────────────
   Every string below is transcribed from its source — the HTML mockup for the
   event-ended flow, the Figma frame for the ignore flow. Exported shapes so a
   test (or a future rewrite) can assert against the list rather than retyping
   it. Nothing here is authored. */

/* event-ended only. SUPERSEDED for `ignore` — see the header. */
const PRIMARY_QUESTION = 'Was this worth alerting about?'
const PRIMARY_HINT = 'Your answer helps Wint learn. Nothing is mandatory.'
const SOMETHING_ELSE = 'Something else'
const NOTE_MAX = 140

/** Demo gamification. The mockup's own numbers. event-ended only — the Figma
 *  frames score nothing, so the ignore flow never awards. */
const POINTS = { PRIMARY: 5, CHIP: 5, NOTE: 10 }

const FIXED_OPTIONS = [
  FIXED_STATES.FIXED,
  FIXED_STATES.NOT_YET,
  // "Resolved on its own" means auto-shutoff or self-stop — the mockup's
  // commentary is explicit, and it is why this is not a two-state toggle.
  FIXED_STATES.SELF_RESOLVED,
]

/* ── The ignore flow, from Figma ───────────────────────────────────────────
   199748:26265 draws ONE flat chip set, not a branch, and that shape is
   unchanged. What the six chips SAY is the owner's, not the frame's — see the
   2026-10-31 block in the header. */

/**
 * 199761:25771 — the verdict on the alert, NOT a cause of the water.
 *
 * 2026-10-31: the owner ruled this out of the chip row and under it, as its
 * own control: "Keep it, below the chips." Listing a verdict among causes is
 * a category error, and this is the only false-positive report anywhere in
 * the v2 app — the last trace of the retired "Was this worth alerting about?"
 * question. It is kept, moved, and NOT deleted.
 *
 * Its own selected state lives in `unnecessary`, not in `chips`, which is why
 * it never reaches the record's `chips` array and so never reaches the
 * ignored-incident badge. It reaches the record as the derived `answer`
 * instead — that IS what it means. See commitIgnore.
 *
 * It keeps 199761:25771's own Huge Icons / smile leftIcon; the frame gives a
 * leftIcon to this label and to no other.
 */
const UNNECESSARY_ALERT = 'Unnecessary Alert'

/**
 * The six causes, in the owner's own DOM order — ruled 2026-10-31, replacing
 * the frame's six ignore REASONS ('Already fixing it', 'Plumber scheduled',
 * 'Known ongoing issue', 'Water shut off manually', 'Something else',
 * 'Unnecessary Alert'). The frame still draws those; see the header.
 *
 * THE LAYOUT IS DELIBERATELY UNCHANGED. 199748:26646's x/y is a wrapped row —
 * 24px chips on a 34px pitch, i.e. a 10px gap — so a plain
 * `flex flex-wrap gap-[10px]` reproduces the frame's layout exactly while
 * staying safe at 393px, which absolute placement would not be. These six
 * wrap 2/2/2 at 393px, exactly as the frame's six did, so the step's height
 * is unchanged by the relabel. That wrap was CONFIRMED BY RENDERING at 393px
 * in all four themes, not by measuring the strings — a 325px content box
 * (px-[34px] inside the 393px frame) leaves little margin and the arithmetic
 * is not the thing to trust.
 *
 * SECOND CONSUMER, WHEN THERE IS A RULING FOR IT. `FLOWS['event-ended'].yes`
 * below carries six near-identical cause labels of its own. It is the natural
 * place for this list to be shared, and sharing it is then a one-line change
 * (`chips: IGNORE_CAUSES`) rather than a refactor. It is NOT done here: the
 * owner's ruling is scoped to the ignore flow, that scope is forced (:25-33),
 * and the event-ended chips are governed by the HTML mockup. Do it once the
 * owner rules on that flow, not before.
 */
const IGNORE_CAUSES = [
  'Stuck or running toilet',
  'Broken pipe',
  'Tap or hose left on',
  'Irrigation',
  'Cooling or HVAC',
  SOMETHING_ELSE,
]

/** 199748:27414 — the green banner above the heading. */
const IGNORED_BANNER = 'Event marked as ignored'
/**
 * 199748:26645 — THE ONE DELIBERATE DIVERGENCE FROM THE FRAME, 2026-10-31.
 *
 * The frame says "Document alert handling", and it still does — nothing in
 * Figma has moved. The owner was shown that string and ruled that this step
 * must read as the user HELPING TO IMPROVE the product rather than filing
 * paperwork: "change this to help us improved or similar that make the user
 * feels he is helping to improve."
 *
 * That ruling is the one thing that outranks the standing instruction stated
 * at the top of this file ("transcribe the frame; never write a string the
 * frame does not contain"). The owner asked for this string directly, so the
 * override is sanctioned — it is NOT drift.
 *
 * DO NOT "CORRECT" THIS BACK. A diff against 199748:26645 will flag it
 * forever, because the node is unchanged; the code is what is right here.
 *
 * This was once the ONLY such override in the file. It is not any more — on
 * 2026-10-31 the owner ruled three more divergences, recorded in the header
 * block above. Every string in the ignore flow that is not named by one of
 * those four rulings is still a verbatim transcription.
 *
 * WHY AN AUTHORED STRING AND NOT ONE ALREADY IN THE REPO. The two candidates
 * in this register are not headings. PRIMARY_HINT (:160, "Your answer helps
 * Wint learn. Nothing is mandatory.") is a sub-line under a question, and the
 * event-ended microcopy "Thanks — Wint learned from this." is past tense — it
 * thanks the user for an answer already given, whereas this heading sits
 * ABOVE an untouched chip set. src/i18n/locales/en.json offers only
 * `tag_sheet.pitch` ("The system learns, your reports get better."), which is
 * v1 copy for a different sheet and is likewise a pitch line, not a heading.
 * This component reads no i18n at all, so nothing there needed updating.
 */
const IGNORE_HEADING = 'Help us improve'
/** 199745:21420 */
const WARNING_TITLE = 'Ignore this water event?'

/**
 * 199748:26654 — the frame's final button. RULED 2026-10-31.
 *
 * The frame labels it "Ignore anyway" a SECOND time, after the user pressed a
 * button with that exact label on the previous step to get here, on a sheet
 * whose banner already says "Event marked as ignored". That was reported and
 * shipped as drawn for want of a ruling. There is a ruling now: it reads
 * "Done".
 *
 * WHY "DONE" IS RIGHT HERE AND VAGUE ELSEWHERE. Carbon's "avoid vague words
 * like Done" governs a dialog button that PERFORMS the action — there, Done
 * hides what is about to happen. This button performs nothing of the sort:
 * the ignore was committed on the previous step via onIgnoreConfirmed, and
 * commitIgnore writes nothing at all when no cause and no note were given, so
 * the button saves optional detail if any exists and otherwise only
 * dismisses. Apple's HIG covers exactly that case — "on the final
 * confirmation step, the Done button becomes active to let people acknowledge
 * completion of the task and dismiss the sheet". Done is the only candidate
 * true in both states.
 *
 * NO SECOND EXIT WAS ADDED, DELIBERATELY. The X at the top right and the
 * scrim already dismiss, and inside the `isIgnore` branch of `close` the
 * `reason` argument is never read — all three paths are byte-for-byte
 * identical. A "Skip" beside this button would be a second control doing the
 * same thing, which is the duplication this ruling removed, re-added.
 */
const IGNORE_DONE_LABEL = 'Done'

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

/**
 * The frame's Badge, as a selectable control.
 *
 * 199748:26647 et al: h-24, px-8/py-2, gap-4, radius 26 (fully rounded at this
 * height), ground colors/slate/100, a 1px white rim, 12/16 Medium in
 * colors/slate/700.
 *
 * THE PRESSED TREATMENT IS NOT FROM THE FRAME, AND CANNOT BE. The frame draws
 * every chip unselected — it shows no selected state at all. But these chips
 * ARE the documentation the step exists to capture, so a control with no
 * selected state is a broken control, not a faithful one. The `data-[state=on]`
 * rules below are therefore carried over UNCHANGED from the treatment this
 * file already shipped; nothing about them is newly invented here. Flagged.
 */
const IGNORE_CHIP_CLASS =
  'h-[24px] min-w-0 gap-[4px] rounded-full border border-background bg-muted px-[8px] py-[2px] text-[12px] font-medium text-slate-700 leading-[16px] ' +
  'data-[state=on]:border-primary data-[state=on]:bg-primary/8 data-[state=on]:text-primary'

/**
 * The "Unnecessary Alert" control, below the cause row — 2026-10-31.
 *
 * Same metrics as a chip, so the two rows sit on one rhythm, but an outlined
 * ground and muted ink instead of a filled one: the owner asked for it to be
 * visually SUBORDINATE to the causes, and this is a small structural addition
 * rather than a new section. It carries NO heading and NO helper copy — none
 * was ruled on, and authoring one would be exactly the drift :28-33 forbids.
 * `self-start` keeps it hugging its label instead of stretching to the column
 * width it now lives in. The pressed treatment is the chips' own, unchanged.
 */
const UNNECESSARY_CONTROL_CLASS =
  'h-[24px] min-w-0 shrink-0 gap-[4px] self-start rounded-full border border-border bg-transparent px-[8px] py-[2px] text-[12px] font-medium text-muted-foreground leading-[16px] ' +
  'data-[state=on]:border-primary data-[state=on]:bg-primary/8 data-[state=on]:text-primary'

/** 199745:21423 / 199748:26654 — the dark navy confirm. See the header's token
 *  map for why the ground is `bg-foreground` and not a literal `bg-slate-900`. */
const DARK_BUTTON_CLASS =
  'h-auto rounded-full bg-foreground px-[10px] py-[12px] text-[16px] font-semibold text-background leading-[24px] hover:bg-foreground/90'

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

/**
 * One consequence of Ignore — 199745:21441 / :21442 / :21460.
 *
 * The frame gives every bullet the SAME neutral disc (colors/slate/100, 28px)
 * and no danger treatment; the red is reserved for the separate irreversibility
 * panel below. The `danger` prop and the severity-high disc that used to live
 * here are gone with it.
 */
function WarnPoint(props) {
  // `const Icon = props.icon`, not a renamed destructure: eslint's
  // no-unused-vars does not see `{ icon: Icon }` being used as a JSX tag and
  // reports it dead. This is the spelling the file already used.
  const Icon = props.icon
  const { iconSize = 17, children } = props
  return (
    <li className="flex items-center gap-[9px]">
      <span
        aria-hidden="true"
        className="flex size-[28px] shrink-0 items-center justify-center rounded-full bg-muted text-slate-700"
      >
        <Icon size={iconSize} strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1 text-[14px] text-foreground leading-[20px]">
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
 * @param {string} [props.systemName]      context line — event-ended only now
 * @param {string} [props.eventLabel]      context line — event-ended only now
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
  if (trigger === 'ignore' && !acceptsIgnore(eventState)) return null
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
  const flow = FLOWS['event-ended']
  const storageKey = eventKey || systemId

  /* Where the sheet opens. The ignore flow always opens on the consequences
     and has exactly two steps now, so any other `initialStep` resolves to the
     documentation step. `initialStep` is the review / test driver — the
     mockup's own "Jump to" controls, expressed as a prop. */
  const jump = initialStep || (isIgnore ? 'warning' : 'question')
  const jumpBranch = !isIgnore && (jump === 'yes' || jump === 'no') ? jump : null

  const [step, setStep] = useState(() => {
    if (isIgnore) return jump === 'warning' ? 'warning' : 'question'
    if (jumpBranch) return 'branch'
    return jump === 'warning' ? 'question' : jump
  })
  const [answer, setAnswer] = useState(jumpBranch)
  const [chips, setChips] = useState([])
  const [fixed, setFixed] = useState(null)
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  /* The "Unnecessary Alert" verdict — ignore flow only, and deliberately NOT
     a member of `chips`: it is not a cause, it does not belong on the
     ignored-incident badge, and it is the sole source of the derived answer. */
  const [unnecessary, setUnnecessary] = useState(false)
  // Landing on a branch counts as having tapped the primary answer, so the
  // score reads the same as it would for a user who got there by hand.
  const [points, setPoints] = useState(
    !isIgnore && (jumpBranch || jump === 'done') ? POINTS.PRIMARY : 0,
  )
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

  /* The ignore flow captures no yes/no. See the header: addFeedback rejects a
     record without one — unconditionally and silently — so the answer is
     DERIVED, and nothing is written at all when the user gave no detail to
     write.

     SINCE 2026-10-31 IT IS DERIVED FROM `unnecessary`, NOT FROM `chips`. The
     chips are causes now and none of them is a verdict on the alert, so the
     old `chips.includes(UNNECESSARY_ALERT)` would have gone permanently false
     the moment the labels changed — every ignore record silently recorded as
     'yes'. Re-pointed, not deleted. Keep this expression TOTAL: two arms, no
     lookup, so `answer` can never arrive at the store as undefined.

     The verdict also counts as detail. Toggling it on with no cause picked is
     still something the user said, and a record that exists only to carry
     answer:'no' is the whole point of keeping the control. */
  const ignoreDetail = unnecessary || chips.length > 0 || note.trim().length > 0
  const commitIgnore = useCallback(() => {
    if (!ignoreDetail) return null
    return commit(unnecessary ? 'no' : 'yes', 0)
  }, [ignoreDetail, commit, unnecessary])

  const close = useCallback(
    (reason) => {
      if (closed.current) return
      closed.current = true
      if (isIgnore) {
        // Nothing has committed until "Ignore anyway" on the warning step.
        if (!ignoreConfirmed) { onCancel?.(); return }
        // The ignore itself is already committed by the caller; the
        // documentation is optional. Either outcome is complete, not a cancel.
        onComplete?.(commitIgnore())
        return
      }
      if (answer) {
        onComplete?.(commit(answer, points))
      } else if (reason === 'cancel' || !answer) {
        onCancel?.()
      }
    },
    [answer, points, commit, isIgnore, ignoreConfirmed, commitIgnore, onCancel, onComplete],
  )

  /* Escape closes. Radix gave this for free; an in-frame overlay says so
     itself. On the warning step Escape is a Cancel — nothing has committed. */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(step === 'warning' ? 'cancel' : 'dismiss') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, close])

  /* The Thanks panel holds, then hands back. Longer when the user went deep
     enough to earn the celebration. event-ended only — the ignore frames draw
     no Thanks panel, so the ignore flow never reaches this step. */
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
      if (!isIgnore) setPoints((p) => p - POINTS.CHIP)
      return
    }
    setChips((prev) => [...prev, label])
    if (!isIgnore) award(POINTS.CHIP, el)
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
    if (!isIgnore) {
      if (!had && has) award(POINTS.NOTE, noteRef.current)
      if (had && !has) setPoints((p) => p - POINTS.NOTE)
    }
    setNote(next)
  }

  const confirmIgnore = () => {
    setIgnoreConfirmed(true)
    setStep('question')
    onIgnoreConfirmed?.()
  }

  /* 199748:26654. The frame ends here — there is no Thanks panel after it — so
     this writes whatever documentation was given and hands back. */
  const finishIgnore = () => close('done')

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
  const title =
    step === 'warning' ? WARNING_TITLE : isIgnore ? IGNORE_HEADING : PRIMARY_QUESTION

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
        className="absolute inset-0 cursor-default bg-foreground/45"
      />

      <div className="wef-sheet relative flex max-h-[85%] flex-col overflow-hidden rounded-t-[24px] bg-surface-card shadow-[0_-8px_32px_rgba(0,0,0,0.18)]">
        {/* 199745:21417 / 199748:26641 — the grab handle. */}
        <div aria-hidden="true" className="mx-auto mb-[6px] mt-[11px] h-[4px] w-[34px] shrink-0 rounded-[10px] bg-slate-300" />

        {/* The ignore frames draw NO context line and NO points chip — only the
            handle and the close button. The header row below is therefore
            event-ended's alone. REPORTED: `systemName` and `eventLabel` are
            still passed by both SystemPageV2Screen call sites, so on the
            ignore flow they now arrive and go unrendered. */}
        {isIgnore ? (
          /* 199745:24605 / 199748:26655 — left-[362px] in a 402px frame, i.e.
             10px from the right edge, floating over the content. */
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            onClick={() => close(step === 'warning' ? 'cancel' : 'dismiss')}
            className="absolute right-[10px] top-[10px] z-10 size-[30px] rounded-full border border-background bg-muted text-slate-700 hover:bg-muted"
          >
            <X size={18} strokeWidth={2} />
          </Button>
        ) : (
          <div className="flex items-center justify-between gap-[10px] px-[18px] pb-[10px] pt-[4px]">
            <p className="min-w-0 flex-1 truncate text-[12px] font-medium tracking-[0.2px] text-muted-foreground leading-[16px]">
              {[flow.context, systemName, eventLabel].filter(Boolean).join(' · ')}
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
                onClick={() => close('dismiss')}
                className="rounded-full text-muted-foreground"
              >
                <X size={16} strokeWidth={2.2} />
              </Button>
            </div>
          </div>
        )}

        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto',
            // 199745:21416 / 199748:26640 — pl-34 pr-35 pb-30 on a 402px frame.
            isIgnore ? 'px-[34px] pb-[30px] pt-[13px]' : 'px-[18px] pb-[24px] pt-[8px]',
          )}
        >
          {/* ── Ignore step 1: the consequences — 199745:20202 ────────────── */}
          {step === 'warning' ? (
            <section className="flex flex-col gap-[19px]">
              <div className="flex flex-col gap-[18px]">
                <div className="flex flex-col gap-[6px]">
                  {/* 199745:21420 */}
                  <h2 className="text-[20px] font-bold text-slate-800 leading-[26px]">
                    {WARNING_TITLE}
                  </h2>
                  {/* 199745:21433 */}
                  <p className="text-[14px] text-foreground leading-[20px]">
                    You&rsquo;re telling Wint this flow is OK. Here&rsquo;s what happens:
                  </p>
                </div>

                <ul className="m-0 flex list-none flex-col gap-[15px] p-0">
                  {/* 199745:21435 — the frame's own "Valve status" instance, so
                      this is the project's valve mark, not a stand-in glyph. */}
                  <WarnPoint icon={ValveGlyph} iconSize={16}>
                    The valve will <strong className="font-bold">not</strong> be automatically
                    closed, even if the flow keeps growing.
                  </WarnPoint>
                  {/* 199745:21444 — Huge Icons / message-blocked. NOT a bell:
                      the brief's "BellOff already matches" does not hold. */}
                  <WarnPoint icon={MessageSquareOff}>
                    You won&rsquo;t get more notifications about this event. New events still
                    alert normally.
                  </WarnPoint>
                  {/* 199747:23443 — Tabler Icons / droplets. */}
                  <WarnPoint icon={Droplets}>
                    Wint keeps measuring. The event stays visible as Ignored until the water
                    flow actually stops.
                  </WarnPoint>
                </ul>
              </div>

              {/* 199747:23437 — its OWN panel in the frame, tinted
                  colors/red/50, not a fourth bullet inside the list above. */}
              <div className="flex items-center gap-[9px] rounded-[9px] bg-alert-surface-critical px-[7px] py-[9px]">
                <span
                  aria-hidden="true"
                  className="flex size-[28px] shrink-0 items-center justify-center text-alert-ink-critical"
                >
                  <RefreshCwOff size={17} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1 text-[14px] text-foreground leading-[20px]">
                  This can&rsquo;t be undone for this event.
                </span>
              </div>

              {/* 199745:21422 — gap-7, both buttons flex-1. No separator above
                  them in the frame. */}
              <div className="flex gap-[7px]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => close('cancel')}
                  className="h-auto flex-1 rounded-full border border-foreground bg-transparent px-[10px] py-[12px] text-[16px] font-semibold text-foreground leading-[24px]"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmIgnore}
                  className={cn('flex-1', DARK_BUTTON_CLASS)}
                >
                  Ignore anyway
                </Button>
              </div>
            </section>
          ) : null}

          {/* ── Ignore step 2: document the handling — 199748:26265 ───────── */}
          {step === 'question' && isIgnore ? (
            <section className="flex flex-col gap-[19px]">
              <div className="flex flex-col gap-[18px]">
                <div className="flex flex-col gap-[20px]">
                  {/* 199748:27414 */}
                  <div className="flex items-center gap-[7px] rounded-[12px] bg-alert-surface-success px-[5px] py-[5px]">
                    <span
                      aria-hidden="true"
                      className="flex size-[32px] shrink-0 items-center justify-center rounded-full bg-surface-card text-success"
                    >
                      <Check size={20} strokeWidth={2.6} />
                    </span>
                    <p className="min-w-0 flex-1 text-[18px] font-semibold tracking-[-0.45px] text-slate-800 leading-[22px]">
                      {IGNORED_BANNER}
                    </p>
                  </div>

                  {/* 199748:26645 */}
                  <h2 className="text-[20px] font-bold text-slate-800 leading-[26px]">
                    {IGNORE_HEADING}
                  </h2>

                  {/* 199748:26646 — one flat set, no branch, no heading above
                      it beyond the one already rendered. The labels are the
                      owner's causes since 2026-10-31; the layout is the
                      frame's, unchanged, and still wraps 2/2/2 at 393px. */}
                  <div className="flex flex-col gap-[10px]">
                    <div className="flex flex-wrap gap-[10px]">
                      {IGNORE_CAUSES.map((label) => (
                        <Toggle
                          key={label}
                          variant="outline"
                          pressed={chips.includes(label)}
                          onClick={(e) => toggleChip(label, e.currentTarget)}
                          className={IGNORE_CHIP_CLASS}
                        >
                          {label}
                        </Toggle>
                      ))}
                    </div>

                    {/* The alert verdict, under the causes — 2026-10-31. Its
                        own control, outside the wrap and outside `chips`,
                        because it is not a cause. No heading and no helper
                        copy: none was ruled on. See UNNECESSARY_ALERT. */}
                    <Toggle
                      variant="outline"
                      pressed={unnecessary}
                      onClick={() => setUnnecessary((v) => !v)}
                      className={UNNECESSARY_CONTROL_CLASS}
                    >
                      <Smile aria-hidden="true" size={16} strokeWidth={1.8} className="shrink-0" />
                      {UNNECESSARY_ALERT}
                    </Toggle>
                  </div>
                </div>

                {/* 199748:26652. The frame draws the opener only; the field it
                    opens is this component's existing behaviour, not a state
                    taken from the frame. */}
                {noteOpen ? (
                  <div>
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
                    className="h-auto justify-start px-0 py-0 text-[16px] font-bold tracking-[-0.4px] text-slate-800 no-underline leading-[26px] hover:no-underline"
                  >
                    + Add note (optional)
                  </Button>
                )}
              </div>

              {/* 199748:26653 — one full-width dark button, relabelled by the
                  2026-10-31 ruling. See IGNORE_DONE_LABEL, including why no
                  second exit sits beside it. */}
              <div className="flex">
                <Button
                  type="button"
                  onClick={finishIgnore}
                  className={cn('flex-1', DARK_BUTTON_CLASS)}
                >
                  {IGNORE_DONE_LABEL}
                </Button>
              </div>
            </section>
          ) : null}

          {/* ── event-ended: the one primary question ─────────────────────── */}
          {step === 'question' && !isIgnore ? (
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

          {/* ── event-ended: reward, then the scoped follow-up ────────────── */}
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
                      className="h-auto rounded-full border-[1.5px] border-border bg-card px-[12px] py-[7px] text-[12.5px] font-semibold text-slate-700 data-[state=on]:border-primary data-[state=on]:bg-primary/8 data-[state=on]:text-primary leading-[16px]"
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

          {/* ── event-ended: Thanks ───────────────────────────────────────── */}
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

/** Adapter so <WarnPoint icon={…}> can take the project's valve mark, whose
 *  prop is `size` + `state` rather than lucide's `size` + `strokeWidth`. */
function ValveGlyph({ size }) {
  return <ValveStatus state="open" size={size} />
}
