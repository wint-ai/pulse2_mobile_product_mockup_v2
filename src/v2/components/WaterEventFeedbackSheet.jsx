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
 * event-ended flow below was left UNCHANGED, question and reward included, and
 * the collision reported rather than resolved here.
 *
 * THE COLLISION WAS RESOLVED ON 2026-11-02, BY THE OWNER, NOT BY A FRAME —
 * see the block below. The event-ended flow is no longer "unchanged"; what is
 * still true is that no Figma node covers it, so its copy comes from the
 * owner's own words instead of from a transcription.
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
 *      IGNORE_CAUSES.  ← BOTH SUPERSEDED 2026-11-02: the owner replaced the
 *   3. "Unnecessary Alert" is no longer one of those six. It sits BELOW them
 *      as its own control, because it is a verdict on the alert and not a
 *      cause. See UNNECESSARY_ALERT.  ← six causes AND this control with four
 *      verdicts. See IGNORE_VERDICT_OPTIONS in eventFeedbackStore.
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
 * ── 2026-11-02: THE EVENT-ENDED QUESTION IS GONE. ONE STEP, FOUR OPTIONS ──
 * The owner ruled the primary question out of the END-OF-EVENT flow too, and
 * this time with a replacement of his own: "i want to remove the yse no step /
 * wht its needed?", then the sketch — "end of Leak , Water Waste , UNique
 * usage-maintenece or somthing, UNencassery alert" — then his own rename of
 * the third, "Unique usage / maintenance >>> Unusual, no issue".
 *
 * WHAT RETIRED FROM `event-ended`, and ONLY this:
 *
 *   • PRIMARY_QUESTION ("Was this worth alerting about?"), its Yes/No pair
 *     and PRIMARY_HINT
 *   • the yes/no BRANCH — so the two per-branch headings ("What was it?" /
 *     "What was it really?") and their twelve cause chips no longer render
 *
 * WHAT REPLACED IT: one step, five single-select options, rendered from
 * VERDICT_OPTIONS in eventFeedbackStore. ONE TAP COMMITS AND THE SHEET
 * CLOSES. Not multi-select, and that is the evidence-led half of the ruling
 * rather than a style choice: a randomised Pew experiment (n=4,581) measured
 * select-all-that-apply at ~8 percentage points LOWER endorsement than forced
 * choice, with a 3pp response-order effect that forced choice does not carry
 * at all. Users stop scanning once the question feels answered. If this is
 * ever turned back into a toggle row, that is the number it costs.
 *
 * THE FIVE ARE A VERDICT AXIS, NOT A CAUSE AXIS — the full table, the strings
 * themselves and the "did water actually run?" test that separates the third
 * from the fourth all live with the data, in eventFeedbackStore's VERDICTS
 * block. They are NOT spelled again here: the store's gate has to recognise
 * them, and one literal in two files is how a write and a read drift apart.
 *
 * NO SUPPORT COPY WAS WRITTEN FOR THE THIRD/FOURTH PAIR. It is the pair most
 * at risk of being confused and the likeliest source of bad data in the set,
 * so the need is real — but helper text is user-visible copy and the house
 * rule stands: it comes from the owner or from a transcribed source, never
 * from here. Flagged, not filled.
 *
 * "WAS IT FIXED?" SURVIVED AS A CONDITIONAL SECOND STEP FOR ONE AFTERNOON,
 * AND THE OWNER KILLED IT THE SAME DAY. See the ruling below.
 *
 * THE CHASSIS IS THE IGNORE STEP'S — owner, 2026-11-02, asked what "Tell us
 * more" should open: "a new flow similar to ignore but with different options
 * as discussed, an overlay on the event screen". So the verdict step is built
 * out of 199748:26265's parts rather than a second set of its own: the same
 * floating close button, the same 34px gutter, a status banner, a heading
 * under it, and ONE wrapped chip row in the same chip treatment. The chip
 * class is literally shared (CHIP_BASE_CLASS) rather than forked, so the two
 * steps cannot drift apart visually.
 *
 * WHAT IS DELIBERATELY NOT CARRIED OVER: the ignore step's
 * "+ Add note (optional)" opener and its full-width Done. One tap on one
 * verdict commits and closes, so a Done would be a second control for an
 * action already taken, and a note opener on a step that closes under the
 * user's finger cannot be typed into. The note survives on the FAULT second
 * step, where there is time to use it. Reported.
 *
 * THE TWO STRINGS THE CHASSIS NEEDS WERE REUSED, NOT AUTHORED — and this is
 * the one judgement call in the change that wants the owner's eye:
 *
 *   banner  → `flow.context`, "Water event ended". Already this flow's own
 *             transcribed string; it is what the header line has always said.
 *   heading → IGNORE_HEADING, "Help us improve". The owner's OWN string,
 *             authored by him for the ignore step's documentation screen so
 *             the user "feels he is helping to improve". The event-ended step
 *             asks the user for exactly the same favour, so the same string
 *             is the only candidate that is not newly minted.
 *
 * Neither is invented and neither is a transcription of a frame that covers
 * this flow — no frame does. If the owner wants different words here, they
 * are his to give; nothing is authored in the meantime.
 *
 * "AN OVERLAY ON THE EVENT SCREEN" IS NOT THIS FILE'S HALF. That needs
 * EventFocusOverlay to render for a CONCLUDED event, which it currently
 * refuses to do, and it lives in another file. This sheet is `absolute
 * inset-0` inside the phone frame and assumes nothing about what is painted
 * behind it, so it works over the overlay or over the bare page alike.
 *
 * NO PROGRESS INDICATOR, AND DELIBERATELY. Two of the five verdicts open a
 * second step and three do not, so there is no honest "Step 1 of 2" to draw —
 * and progress indicators measure null-to-negative on completion regardless.
 *
 * THE SIX `no`-BRANCH CAUSE CHIPS ARE ORPHANED, AND LEFT DEFINED. See FLOWS.
 *
 * ── 2026-11-02, LATER THE SAME DAY: ONE STEP. FULL STOP. ──────────────────
 * The owner was shown the FAULT follow-up — the "+5" chip, the green check,
 * "Thanks — Wint learned from this.", "Was it fixed?" with its three options,
 * "+ Add note (optional)" and a full-width Done — and ruled on all of it at
 * once: "dont want too much steps / dont want this".
 *
 * So `event-ended` is ONE step. What came out of this flow, and only this
 * flow:
 *
 *   • the whole `detail` step
 *   • "Was it fixed?" — FIXED_OPTIONS, the ToggleGroup, the `fixed` state and
 *     chooseFixed. `fixed` is no longer WRITTEN by this component at all; the
 *     store still accepts it, still validates it and still defaults it to
 *     null, and FIXED_STATES / FIXED_STATE_LABEL stay exported there for the
 *     records that already carry one. SEE THE REPORT: nothing in the app
 *     writes a `fixed` value now, so the field is vestigial, not merely
 *     unused here.
 *   • the Done button AS AN UNCONDITIONAL STEP — see the note below, which is
 *     where it came back, and on what terms
 *   • FAULT_VERDICTS and the branch it drove
 *
 * AND THE POINTS, FROM THIS FLOW ONLY. The owner pointed at a screen with
 * "+5" on it and said "dont want this". The evidence agrees and makes it
 * easy: the best work on points / levels / leaderboards finds they neither
 * help nor hurt intrinsic motivation, so there is no upside to defend — while
 * hanging a score on a professional's judgement call hands them a reason to
 * label that is not "this is what happened", which is the one thing this data
 * must not acquire. The award on the verdict tap and the "+N" badge in the
 * chassis are gone. THE MACHINERY IS LEFT STANDING AND IS NOW DEAD: the
 * report lists every unreachable piece. It was not deleted here because this
 * is a removal from one flow, not a refactor of the file.
 *
 * ── THE NOTE: ON THE FIRST STEP, AND IT TOOK THREE GOES ──────────────────
 *
 * He asked for it on the verdict step ("and i want this on the first step").
 * Built that way it forced the chip to stop committing once the field was
 * open and a Done to appear — visually the control he had just thrown out.
 * Shown that cost he moved it to the acknowledgement panel; shown the built
 * result he reversed again: "still not updated / i want the add note on first
 * step". His call, and it is the one the file implements.
 *
 * THE SHAPE THAT MAKES IT WORK, AND WHY IT IS NOT THE FIRST ATTEMPT:
 * THE CHIP TAP IS ALWAYS THE COMMIT, AND IT COMMITS THE NOTE WITH IT.
 *
 *   • note untouched → tap an option, record written, sheet closes. One tap.
 *   • note opened    → the field sits below the options; an option tap STILL
 *                      commits and closes, and carries the typed note into
 *                      the same record.
 *
 * No Done. No select-mode. AN OPTION NEVER CHANGES WHAT IT DOES — which is
 * the property both earlier attempts gave up, and the reason this one costs
 * nothing: the fast path is untouched and the tap means one thing on every
 * screen it appears on.
 *
 * The note is therefore filled in BEFORE the answer rather than after it.
 * Unusual ordering, and worth nothing to argue about: the field is optional,
 * the answer is one tap away at all times, and nobody is made to pass the
 * expensive control to reach the cheap one.
 *
 * A NOTE WITH NO OPTION, THEN DISMISSAL, WRITES A ROW. There is no verdict to
 * derive an `answer` from, so it goes in with answer 'yes' — nothing was said
 * about the alert being wrong — exactly as the ignore flow's equivalent case
 * already did. The alternative was to bin a sentence the user typed, which is
 * never the right side of this trade. One branch, in `close`.
 *
 * WHY THERE IS NO LONGER A setFeedbackNote CALL HERE. When the note lived on
 * the panel the row already existed, so the note had to be PATCHED in by id —
 * writing it with addFeedback would have appended a second row for one
 * answer. The note is written in the same addFeedback call as the verdict
 * now, so there is nothing to patch. `setFeedbackNote` is still exported and
 * still tested; it has NO CALLER TODAY. See its own comment.
 *
 * WHAT IT BUYS, given a free-text field is the single most expensive element
 * in a micro-survey — one open-text question roughly DOUBLES median
 * completion time: when `Something else` starts taking more than ~15% of
 * answers, these notes are the only evidence of what the missing option
 * should have been.
 *
 * THE ACKNOWLEDGEMENT STAYED, AND THE OWNER HAS SINCE ASKED FOR MORE OF IT.
 * Unprompted, pointing at the green check and "Thanks — Wint learned from
 * this.": "i realy like the positive energy from this / we need more like
 * this, because we want people to react and to tag this data". So the warmth
 * is wanted; it was the SCORE that was rejected, and the two are not the same
 * thing. The argument was already on its side — informational feedback
 * supports competence exactly where a controlling reward undermines autonomy,
 * and this one costs no tap and closes itself.
 *
 * The `done` panel is that acknowledgement: the reward pop and the microcopy
 * the owner kept from the step he rejected, the count of what Wint has
 * learned, and now the note opener. What it lost is "+N points" — the points
 * line — and the bare "Thanks!" heading above it, which said the same word
 * twice once the microcopy moved into its place. REPORTED.
 *
 * THE FULL-SCREEN CELEBRATION IS KEPT, AND ITS TRIGGER WENT HOME.
 * The rule has always been "the screen-wide burst is for the users who went
 * deep enough to type something"; a bare option tap gets the small burst
 * only. It fires at COMMIT, in finishStep, reading the note that by then has
 * already been typed — which is the original formulation, correct again now
 * that the note precedes the answer. For the hours the note lived on the
 * acknowledgement panel that read was always false (the note arrived after
 * the commit) and the trigger had to sit on the first keystroke instead;
 * that version is gone. It plays on the panel, which holds 2400ms rather
 * than 2000 when it fires, so it is seen rather than played into a closing
 * sheet. It is pointer-events-none and plays once.
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
 *   trigger="event-ended"  fires after a water event ends. ONE step: the
 *                          five verdicts and an optional note below them
 *                          (2026-11-02). An option tap writes both and hands
 *                          over to the acknowledgement, which closes itself.
 *                          No second step, no commit button, no points.
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
 * ── THE DERIVED-`answer` SHIM IS RETIRED, 2026-11-02 ─────────────────────
 * For three days this block flagged a shim: the ignore flow asked no yes/no,
 * `addFeedback` rejected any record without one — unconditionally and
 * SILENTLY — so `answer` was DERIVED, first from `chips.includes('Unnecessary
 * Alert')` and then from an "Unnecessary Alert" toggle. It was honest, it was
 * documented, and it was load-bearing: an `answer` of undefined made
 * addFeedback return null for every ignore record, onComplete fired with
 * null, the ignored-incident summary was null and the badge never appeared
 * again, with no error and nothing in the console.
 *
 * IT IS GONE. Both halves of it went in one pass:
 *   • the store's gate now admits a record carrying a valid `verdict`
 *   • the ignore step now HAS a verdict — the owner replaced its six causes
 *     with four, and the third of those, "Not a real alert", is exactly the
 *     false-positive report the toggle used to carry
 *
 * So `answer` is no longer derived from a UI control that was not a verdict.
 * It is derived from a verdict, by the store, through the same total
 * `answerForVerdict` the event-ended flow uses. No shim, one mechanism, two
 * vocabularies. The old note is deleted rather than kept-and-marked because
 * it described machinery that no longer exists, and a superseded note about
 * live-looking machinery is worse than no note.
 *
 * ONE DERIVATION REMAINS AND IT IS NOT THAT ONE. If the user opens the note,
 * types, and presses Done WITHOUT picking a chip, there is no verdict to
 * write — and that path records a row today, with the note on it, which the
 * ignored-incident badge then shows. commitIgnore passes `answer: 'yes'` for
 * that case alone, rather than silently dropping a note the user typed. It is
 * one branch, scoped to one state, not the flow's answer mechanism. REPORTED.
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import ValveStatus from '@/v2/components/ValveStatus'
import {
  addFeedback,
  answerForVerdict,
  getLearnedCount,
  IGNORE_VERDICT_OPTIONS,
  VERDICTS,
  VERDICT_OPTIONS,
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

/**
 * RETIRED ON BOTH FLOWS NOW.
 *
 * PRIMARY_QUESTION ("Was this worth alerting about?") and PRIMARY_HINT ("Your
 * answer helps Wint learn. Nothing is mandatory.") went from `ignore` on
 * 2026-10-29 and from `event-ended` on 2026-11-02. They are DELETED rather
 * than kept-and-unused, because nothing renders them any more and a dead
 * exported string is how retired copy creeps back onto a screen. The strings
 * themselves are preserved in the header's two ruling blocks, which is where
 * a reader looking for "what did this used to say" will go.
 *
 * Three suites still pin the question's ABSENCE by its literal text
 * (focusEventDeepLink, journeyDeepLinks, waterEventFeedback). That is the
 * right place for it: a test asserting a string is gone needs the string.
 */

/**
 * The catch-all, unchanged in value and still shared by every chip set in
 * this file — the ignore causes and the two orphaned branch sets below — and
 * now ALSO the fifth and LAST verdict.
 *
 * The literal moved to eventFeedbackStore (VERDICTS.SOMETHING_ELSE) because
 * `addFeedback`'s gate has to recognise it to admit the record. This is an
 * alias, not a second definition: one string, one home. Nothing is minted.
 */
const SOMETHING_ELSE = VERDICTS.SOMETHING_ELSE
const NOTE_MAX = 140

/* FAULT_VERDICTS lived here — [Leak, Water Waste], the two verdicts that
   opened the "Was it fixed?" step. The owner removed the step on 2026-11-02
   and with it the only reason to tell a fault verdict from any other: all
   five now do exactly the same thing, which is to be the whole answer. */

/** Demo gamification. The mockup's own numbers. event-ended only — the Figma
 *  frames score nothing, so the ignore flow never awards. */
const POINTS = { PRIMARY: 5, CHIP: 5, NOTE: 10 }

/* FIXED_OPTIONS lived here — Fixed / Not yet / Resolved on its own, the
   mockup's three states. The owner removed "Was it fixed?" from the only flow
   that asked it ("dont want too much steps / dont want this", 2026-11-02), so
   this component asks nothing about it and writes no `fixed` value.

   THE FIELD IS NOT DELETED FROM THE DATA. eventFeedbackStore still accepts
   `fixed`, still validates it against FIXED_STATES and still defaults it to
   null, because records written before today carry one. But nothing in the
   app writes one any more — the ignore flow never did, by design, since the
   event is still running there. The field is VESTIGIAL, and that is reported
   rather than resolved here: whether it comes back as a question, or goes, is
   the owner's call. */

/* ── The ignore flow, from Figma ───────────────────────────────────────────
   199748:26265 draws ONE flat chip set, not a branch, and that shape is
   unchanged. What the six chips SAY is the owner's, not the frame's — see the
   2026-10-31 block in the header. */

/* ── RETIRED 2026-11-02, BOTH OF THEM ─────────────────────────────────────
   UNNECESSARY_ALERT ('Unnecessary Alert', 199761:25771) was the verdict on
   the alert, kept out of the chip row and below it as its own control by the
   2026-10-31 ruling. IGNORE_CAUSES were the six causes of the water that the
   same ruling put in that row: Stuck or running toilet, Broken pipe, Tap or
   hose left on, Irrigation, Cooling or HVAC, Something else.

   The owner retired both at once, looking at the step: "And so this one shows
   the wrong options, not what is discussed before." They are replaced by ONE
   row of four verdicts — IGNORE_VERDICT_OPTIONS, which lives in
   eventFeedbackStore because the gate has to recognise it. The strings, their
   provenance (DRAFTED and adopted, NOT the owner's own words, unlike the
   event-ended four) and the axis they sit on are all documented there.

   WHAT THIS KILLED THAT WAS NOT A STRING: UNNECESSARY_ALERT was where the
   ignore flow's `answer` came from. "Not a real alert" is where it comes from
   now, through the store's own answerForVerdict — see the header. */

/** 199748:27414 — the green banner above the heading. *//** 199748:27414 — the green banner above the heading. */
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

/**
 * SHARED WITH `event-ended` SINCE 2026-11-02 — the name is now narrower than
 * the use, and that is on purpose rather than worth a rename.
 *
 * The owner asked for the new verdict step to be "similar to ignore", which
 * means a heading under the banner. This is the only heading in the file that
 * says what that step is for, it is the OWNER'S own authored string, and it
 * is true of both flows word for word — the alternative was to author a
 * second one, which the house rule forbids. The constant keeps its name so
 * the 2026-10-31 ruling that produced it stays findable; this note is how a
 * reader learns it has two call sites.
 */

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

/* IT IS THE IGNORE FLOW'S ALONE AGAIN. For part of 2026-11-02 the verdict
   step borrowed this button to commit a note; the owner then moved the note
   to the acknowledgement panel, where nothing needs committing — opening the
   note holds the panel and dismissal saves. The event-ended flow has no
   commit control of any kind now, which is the point of a one-tap step. */

/**
 * ORPHANED ON 2026-11-02, AND LEFT DEFINED ON PURPOSE.
 *
 * `context` is live — it is the sheet's header line and its accessible name.
 * `yes.microcopy` and `no.microcopy` are live: the reward panel on the second
 * step picks one by the verdict's DERIVED answer, so the two strings still do
 * the job they always did.
 *
 * `yes.heading` / `no.heading` and the TWELVE cause chips under them render
 * NOWHERE now. The owner's ruling replaced the question those branches hung
 * off, and it is scoped to that question: the cause chips were explicitly NOT
 * part of it, and relabelling or rehoming them here would be this file
 * deciding something the owner has not. So they stay exactly as they are,
 * unrendered, until there is a ruling on whether CAUSE comes back as an
 * optional second question. REPORTED, not resolved.
 *
 * `askFixed` is dead outright: the step it gated was removed on 2026-11-02
 * and no verdict opens a second step any more.
 */
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
/**
 * 2026-11-02: THE TAP TARGET IS A DELIBERATE DIVERGENCE FROM 199748:26647.
 *
 * The frame draws these at h-24 with py-2 and 12/16 Medium, and this file
 * transcribed that faithfully. Measured against the platforms it ships on,
 * a 24px target fails Apple's 44x44pt and Android's 48dp, and meets WCAG
 * 2.2's Target Size (Minimum) of 24 CSS px only exactly. That is an
 * accessibility defect rather than a style preference, so the height moved
 * to `min-h-[44px]` and the padding and ink size with it. Nothing else
 * changed: same pill, same ground, same wrapped row, same 10px gap.
 *
 * THIS REACHES THE IGNORE STEP, which is the only row still using it, and
 * that is the point — the defect was identical on both and fixing one would
 * have left the other broken AND made them look unrelated for no reason. A
 * diff against 199748:26647 will flag the metrics forever; the reason is
 * here. Revert is one line if the owner would rather have the frame.
 */
const CHIP_BASE_CLASS =
  'min-h-[44px] min-w-0 gap-[4px] rounded-full border border-background bg-muted px-[14px] py-[12px] text-[13px] font-medium text-slate-700 leading-[18px]'

/** The pressed treatment, split out on 2026-11-02 so the verdict row can take
 *  the chip WITHOUT it. Nothing about the value changed. */
const CHIP_PRESSED_CLASS =
  'data-[state=on]:border-primary data-[state=on]:bg-primary/8 data-[state=on]:text-primary'

const IGNORE_CHIP_CLASS = `${CHIP_BASE_CLASS} ${CHIP_PRESSED_CLASS}`

/* VERDICT_OPTION_CLASS lived here — the full-width 48px list row that dressed
   the five verdicts for part of 2026-11-02. The constant is retired; the row
   is a wrapped chip row again and takes CHIP_BASE_CLASS above, so this is
   where its reasoning stays. THE ARGUMENT IS KEPT VERBATIM BELOW and the
   reversal is appended under it — deleting a superseded argument is how it
   gets re-derived by the next session.

 * THE FIVE VERDICTS ARE A STACKED LIST OF FULL-WIDTH OPTIONS, NOT A WRAPPED
 * CHIP ROW — redesigned 2026-11-02 on "and to make it better".
 *
 * WHAT WAS WRONG, measured rather than felt. As chips they were
 * `h-[24px]` with `py-[2px]` and 12px text: a 24px tap target. Apple's HIG
 * asks 44x44pt, Android's 48dp; WCAG 2.2's Target Size (Minimum) asks 24
 * CSS px, which they met EXACTLY and by accident. That is an accessibility
 * defect, not a matter of taste, and it was the single most defensible thing
 * to fix on the screen. These are now `min-h-[48px]` and full width, which
 * clears all three.
 *
 * AND IT FIXED THE HIERARCHY WITHOUT REMOVING ANYTHING. The complaint was
 * that the only interactive thing on the sheet did not look like the point:
 * five small pills sat low-left under a banner and a heading that took all
 * the visual weight. Five 48px rows plus their gaps come to ~280px against
 * the banner's ~42px and the heading's ~26px, so the controls now outweigh
 * the prose by roughly four to one. NOTHING WAS DELETED OR ADDED to achieve
 * that — the banner and the heading are untouched, because both are copy and
 * copy is the owner's. Making the control the right size was enough.
 *
 * FULL WIDTH IS ALSO THE ONLY LAYOUT I CAN BE SURE OF. Nobody has rendered
 * either chip row at 393px. A wrapped row of five variable-length labels has
 * a wrap I can only guess at; a stacked list has none — every row is
 * `w-full`, and the longest label is ~116px of text in a 325px box, so no
 * row can wrap internally either. Given no browser in this session, a layout
 * with no free variables is worth more than a prettier one I cannot check.
 *
 * NO PER-OPTION ICONS. The ignore frame gives a leftIcon to exactly one chip,
 * so glyphs are not foreign here — but five where the frame used one is a
 * decision, and three of these five ("Unusual, no issue", "Unnecessary
 * alert", "Something else") have no unambiguous glyph. A drawn guess beside
 * an abstract verdict biases the choice it illustrates, and this list must
 * not acquire a steer. Declined deliberately.
 *
 * NO TONAL DIFFERENCE BETWEEN THE OPTIONS EITHER, and that is deliberate for
 * one of them in particular: "Unnecessary alert" is the only false-positive
 * report in the app. Anything that made it read as the lesser or regrettable
 * answer would suppress exactly the signal it exists to collect. All five
 * get the same weight; only SPACING separates them. See the render.
 *
 * WHY IT NO LONGER MATCHES THE IGNORE ROW, which is a real cost. The two
 * steps are meant to read as siblings and now they do not: this is a list,
 * that is a wrapped pill row. But they no longer BEHAVE alike either — here
 * an option tap commits and closes, there it selects and waits for Done —
 * and a control that looks identical while doing something different is the
 * worse failure. The forms now match the behaviours. If the owner unifies
 * the interaction models, these should re-unify with them.
 *
 * ── 2026-11-02, LATER: REVERSED BY THE OWNER, ON SIGHT ───────────────────
 * He was shown the list rendered and rejected it outright: "get back to
 * chips. Hate this one." No part of the argument above was contested and
 * none of it is withdrawn — it simply lost. The row is a wrapped chip row
 * again, `flex flex-wrap gap-[10px]` with CHIP_BASE_CLASS, which is the
 * ignore step's own container and the ignore step's own chip. The two steps
 * read as siblings again, which is the one cost the block above booked and
 * the one thing the revert buys back.
 *
 * WHAT WAS KEPT OUT OF THE REVERT, DELIBERATELY: THE TAP TARGET. The chips
 * were `h-[24px]` / `py-[2px]` before the list pass — 24 CSS px, meeting
 * WCAG 2.2 SC 2.5.8 exactly and by accident, failing Apple's 44pt and
 * Android's 48dp. CHIP_BASE_CLASS now carries `min-h-[44px]` and
 * `py-[12px]` and KEEPS them here. The owner rejected the LIST FORM; the
 * target size was never the thing on screen he was reacting to, and it is
 * the one piece of that pass that was measurement rather than taste. Do not
 * shrink it back without a ruling that names the size.
 *
 * CHIP_BASE_CLASS WITHOUT CHIP_PRESSED_CLASS, which is why that split
 * exists. A tap here commits and closes in the same tick, so no chip can
 * ever be seen "on"; `data-[state=on]:…` would have nothing to act on and
 * the control stays a Button, not a Toggle. The ignore row, which waits for
 * Done, keeps IGNORE_CHIP_CLASS and its pressed rules.
 *
 * THE BOUNDARY GAP IS GONE, AND NOTHING CARRIES IT NOW. `mt-[10px]` sat on
 * "Unnecessary alert" to mark the DID WATER ACTUALLY RUN line between it and
 * "Unusual, no issue" — the pair this kind of taxonomy concentrates its
 * misclassifications on. A top margin on ONE item of a flex-wrap row does
 * not read as a grouping break; it reads as a misaligned pill, because the
 * item it is meant to separate from may not even be on the row above it.
 * The alternative considered was a zero-height `basis-full` spacer to force
 * a line break before it. That was declined: it pins a wrap position nobody
 * in this session can look at (no browser here; happy-dom has no layout
 * engine, so `getBoundingClientRect()` is zeros and wrap behaviour is
 * unobservable), and a forced break is a worse bet than none when it cannot
 * be seen. So the boundary is carried by NOTHING at present. It is the
 * owner's to solve with copy if he wants it solved — helper text under the
 * pair is the honest fix and copy is his; nothing is authored here. The
 * order itself still encodes the progression. REPORTED.
 *
 * ── 2026-11-02, LATER STILL: THE ROW IS TWO EXPLICIT LINES ───────────────
 * The chip row was finally seen on a real device, and the free wrap landed
 * 2 / 2 / 1 — three lines, `Leak`·`Water Waste` / `Unusual, no issue`·
 * `Unnecessary alert` / `Something else`. The owner: "make it 2 lines
 * instead of 3".
 *
 * THE PAPER MEASUREMENT WAS WRONG AND IS NOT TO BE TRUSTED AGAIN. The first
 * three labels come to roughly 312px of chip against roughly 325px of
 * available width, which says they fit on one line; on the device they do
 * not. Nothing here can measure a font, so the screenshot is the only
 * ground truth this layout has ever had.
 *
 * SO THE LINES ARE DECLARED, NOT WRAPPED. VERDICT_LINES splits
 * VERDICT_OPTIONS 3/2 and each line is its own non-wrapping flex row. Free
 * `flex-wrap` has now been wrong once on real metrics; two rows cannot be
 * wrong, whatever the font measures. The split is SLICED from VERDICT_OPTIONS
 * rather than retyped, so the order stays single-sourced in the store.
 *
 * WHAT HAPPENS IF A LINE STILL DOES NOT FIT, because that is the cost of
 * declaring it: the chip wraps its own text inside the pill and grows taller
 * (`h-auto`, `shrink`, `whitespace-normal`, `min-w-0` — `shrink` is there to
 * beat the Button's own `shrink-0`, without which the chips would overflow
 * the sheet instead of giving way). A two-line-tall pill is uglier than a
 * tidy wrap, but it is BOUNDED: the row count is the thing the owner
 * rejected, and it can no longer move. `min-h-[44px]` and `py-[12px]` are
 * untouched; a chip may only ever get taller than the tap target.
 *
 * AND HEADROOM WAS BOUGHT SO THAT STAYS HYPOTHETICAL: `px-[14px]` →
 * `px-[12px]` on this row only, and the row gap `10px` → `8px`. That is
 * ~12px of padding plus 4px of gap given back to line 1. The ignore row
 * keeps the frame's 14px and 10px, because the ignore row is four chips, is
 * a free wrap, and nobody has complained about it.
 *
 * THE BOUNDARY IS LOAD-BEARING AGAIN, AND BY ACCIDENT — READ THIS BEFORE
 * RE-SPLITTING THE LINES. The 3/2 the owner asked for falls EXACTLY on the
 * did-water-actually-run line: line 1 (`Leak`, `Water Waste`, `Unusual, no
 * issue`) is every verdict where water ran; line 2 (`Unnecessary alert`,
 * `Something else`) is where it did not, plus the escape. The gap this
 * block recorded two paragraphs above as "carried by NOTHING" is carried by
 * the line break, for free, as a side effect of a layout instruction and not
 * by design. It is still structure and still wordless, so nothing is
 * authored. But anyone who later moves the split — to 2/3, or back to a free
 * wrap — silently destroys a semantic grouping. Move it only on purpose.
 */

/* The event-ended chip, which is the ignore chip with the row's own metrics.
   The CLASS stays shared (CHIP_BASE_CLASS) and only the deltas live here, so
   the two steps still cannot drift on colour, radius, ink or tap target —
   see the block above for why the containers are allowed to differ when the
   chip is not. twMerge resolves px-[12px] over the base px-[14px]. */
const VERDICT_CHIP_CLASS = cn(
  CHIP_BASE_CLASS,
  'h-auto shrink whitespace-normal px-[12px] text-center',
)

/* 3/2. Sliced, never retyped — the order lives in the store and the comment
   above explains why this particular split is not arbitrary. */
const VERDICT_LINE_BREAK = 3
const VERDICT_LINES = [
  VERDICT_OPTIONS.slice(0, VERDICT_LINE_BREAK),
  VERDICT_OPTIONS.slice(VERDICT_LINE_BREAK),
]

/* UNNECESSARY_CONTROL_CLASS lived here — the outlined, subordinate variant
   of the chip, for the "Unnecessary Alert" control that sat below the cause
   row. That control was retired on 2026-11-02 and the verdict it carried is
   now the third chip in the row itself, so there is nothing left to make
   subordinate. The row uses IGNORE_CHIP_CLASS throughout. */

/**
 * THE "+ Add note (optional)" OPENER, ON BOTH STEPS — owner, 2026-11-02,
 * sent with a screenshot of the current heavy one: "add note syyl in last
 * version was better / but keep in same screens".
 *
 * TWO STYLES EXISTED AND THE SMALL ONE WAS LOST BY ACCIDENT. The event-ended
 * panel's opener was `text-[13px] font-semibold text-primary` through e7ac0ea
 * and went out in d862ab8, when the note moved onto the first step and
 * inherited the ignore step's `text-[16px] font-bold text-slate-800`. The
 * 13px one is the opener he was pointing at when he asked for the note on
 * the first step at all; he got the placement and lost the style. This is
 * that style, restored. `py-0` is taken from e7ac0ea rather than c0f9190's
 * `py-[10px]`: the opener now sits in a flex column that supplies its own
 * gap, so the padding would be doubled spacing rather than the spacing.
 *
 * ONE CONSTANT FOR BOTH STEPS — "but keep in same screens", read as apply it
 * on both and keep them consistent, which is the same instinct as "get back
 * to chips". The placement is not in question and nothing moves.
 *
 * THERE IS AN INDEPENDENT ARGUMENT, which is why it is comfortable: at 16px
 * bold slate-800 the opener outweighed the 13px chips above it, so the
 * optional secondary control was the loudest thing on the step. 13px
 * semibold in the primary colour puts the primary controls back on top.
 *
 * A DELIBERATE DIVERGENCE FROM 199748:26652, which draws the heavy style —
 * the same kind of divergence as the 44px tap target, recorded the same way.
 * A diff against the frame will flag it forever; the reason is here, and the
 * revert is this one class string.
 */
const NOTE_OPENER_CLASS =
  'h-auto justify-start px-0 py-0 text-[13px] font-semibold text-primary no-underline hover:no-underline'

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
 * @param {'warning'|'question'|'verdict'|'detail'|'done'} [props.initialStep]
 *        review / test driver. On `ignore`: 'warning', else the documentation
 *        step. On `event-ended`: 'detail' or 'done', else the verdict step.
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
     and has exactly two steps, so any other `initialStep` resolves to the
     documentation step. The event-ended flow opens on the verdicts, and the
     only other states it HAS are the optional-detail step and the Thanks
     panel. `initialStep` is the review / test driver — the mockup's own
     "Jump to" controls, expressed as a prop.

     Anything unrecognised — including the retired 'question' / 'yes' / 'no'
     and the 'detail' step that existed for one afternoon — falls back to the
     verdict step rather than rendering an empty sheet. */
  const jump = initialStep || (isIgnore ? 'warning' : 'verdict')

  const [step, setStep] = useState(() => {
    if (isIgnore) return jump === 'warning' ? 'warning' : 'question'
    return jump === 'done' ? 'done' : 'verdict'
  })
  /* The chosen verdict IS the answer now — `answer` is derived from it by the
     store (answerForVerdict) and never held here. */
  const [verdict, setVerdict] = useState(null)
  const [chips, setChips] = useState([])
  /* `fixed` is gone with "Was it fixed?" — this component writes no value
     for it now. The store still has the field. See FIXED_OPTIONS above. */
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  /* `unnecessary` lived here — the "Unnecessary Alert" toggle's own state,
     kept out of `chips` because it was a verdict and not a cause. Both the
     control and the state went on 2026-11-02; the ignore flow now holds its
     choice in `verdict`, the same field the event-ended flow uses. */
  /* DEAD SINCE 2026-11-02 and deliberately left standing — the owner removed
     the points from this flow and the ignore flow never awarded any, so this
     is 0 for the whole life of the sheet. `setPoints` survives only inside
     `!isIgnore` arms that are themselves unreachable now. It still reaches
     the record, as a 0, which is what every new row will carry. REPORTED
     rather than torn out: this change is a removal from one flow. */
  const points = 0
  const [ignoreConfirmed, setIgnoreConfirmed] = useState(isIgnore ? jump !== 'warning' : false)
  /* Permanently empty now that `award` is gone — nothing fills it. Left
     standing with the rest of the points machinery. */
  const [floats, setFloats] = useState([])
  const [celebrate, setCelebrate] = useState(false)
  const [learned, setLearned] = useState(() => getLearnedCount())

  const hostRef = useRef(null)
  const noteRef = useRef(null)
  const committed = useRef(null)
  const closed = useRef(false)

  useEffect(() => {
    if (noteOpen) noteRef.current?.focus()
  }, [noteOpen])

  /** Persist once. Called on Done, on the verdict tap that finishes the flow
      outright, and on any dismissal that happens after a verdict was chosen —
      "nothing is mandatory" only works if a single tap survives the user
      walking away.

      `fields` carries EITHER `{ verdict }` (event-ended, since 2026-11-02) or
      `{ answer }` (the ignore shim). The store takes either and derives the
      other; passing the two through one positional argument is what let the
      ignore flow's 'yes'/'no' and a verdict string be confused for each
      other, so they are named at the call site instead. */
  const commit = useCallback(
    (fields, score) => {
      if (committed.current || !fields) return committed.current
      committed.current = addFeedback(storageKey, {
        trigger: isIgnore ? 'ignore' : 'event-ended',
        ...fields,
        chips,
        note,
        /* No `fixed`: the question that produced one is gone and the ignore
           flow never asked it. The store defaults the field to null. */
        points: score,
        systemId,
        actor: getCurrentActor(),
      })
      return committed.current
    },
    [storageKey, isIgnore, chips, note, systemId],
  )

  /* THE IGNORE FLOW HAS A VERDICT NOW, so there is nothing left to shim. Its
     four chips are single select and the chosen one goes to the store as
     `verdict`; the store derives `answer` from it with the same total
     `answerForVerdict` the event-ended flow uses, and "Not a real alert" is
     the one that means 'no'. See the header for what this replaced.

     THE ONE REMAINING DERIVATION, and its whole scope: a user who opens the
     note, types, and presses Done WITHOUT picking a chip has given detail but
     no verdict. That path writes a row today — the ignored-incident badge
     shows the note — so it keeps writing one, with `answer: 'yes'` because
     nothing was said about the alert being wrong. Dropping it instead would
     silently bin a sentence the user typed. One branch, one state. */
  const ignoreDetail = Boolean(verdict) || note.trim().length > 0
  const commitIgnore = useCallback(() => {
    if (!ignoreDetail) return null
    return commit(verdict ? { verdict } : { answer: 'yes' }, 0)
  }, [ignoreDetail, commit, verdict])

  const close = useCallback(
    () => {
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
      if (verdict) {
        /* Already written — the option tap commits, note and all, and
           `commit` is idempotent, so this just hands back the stored row.
           Nothing is PATCHED here any more: the note precedes the answer, so
           it goes in with it in one addFeedback call. */
        onComplete?.(commit({ verdict }, points))
      } else if (note.trim()) {
        /* A NOTE WITH NO OPTION. There is no verdict to derive an `answer`
           from, so it goes in as 'yes' — nothing was said about the alert
           being wrong — exactly as the ignore flow's equivalent case already
           does. The alternative is to silently bin a sentence the user
           typed, which is never the right side of this trade. It is a
           complete outcome, not a cancel. */
        onComplete?.(commit({ answer: 'yes' }, points))
      } else {
        onCancel?.()
      }
    },
    [
      verdict, points, commit, note,
      isIgnore, ignoreConfirmed, commitIgnore, onCancel, onComplete,
    ],
  )

  /* Escape closes. Radix gave this for free; an in-frame overlay says so
     itself. On the warning step Escape is a Cancel — nothing has committed. */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  /* The Thanks panel holds, then hands back. Longer when the user went deep
     enough to earn the celebration. event-ended only — the ignore frames draw
     no Thanks panel, so the ignore flow never reaches this step. */
  useEffect(() => {
    if (step !== 'done') return
    /* THE `noteOpen` HOLD IS GONE, and removing it was not optional. While
       the note lived on this panel, opening it cancelled the auto-close so
       the panel could not walk out from under a half-typed sentence. The
       note is on the verdict step now, so `noteOpen` is routinely ALREADY
       true by the time this panel mounts — a user who typed a note then
       tapped an option arrives here with it set, and the stale guard would
       have left the sheet open forever with no control on it to close it.
       Nothing on this panel takes input now, so it holds its moment and
       hands back. */
    const t = setTimeout(() => close(), celebrate ? 2400 : 2000)
    return () => clearTimeout(t)
  }, [step, celebrate, close])

  /* Floating "+N" badges clean themselves up. */
  useEffect(() => {
    if (!floats.length) return
    const t = setTimeout(() => setFloats((f) => f.slice(1)), 1200)
    return () => clearTimeout(t)
  }, [floats])

  /* `award` lived here — it bumped the score and launched a floating "+N"
     from the tapped control toward the points chip. Its last caller was
     `toggleChip`, which went when the ignore row stopped being multi-select
     on 2026-11-02; the points themselves had already gone from the
     event-ended flow. It is DELETED rather than left standing like the rest
     of the machinery only because eslint will not keep an unreferenced
     binding — the floats state, the floats render block and the .wef-float /
     .wef-pulse keyframes below ARE still standing, and the points may yet
     come back. `floatId` went with it for the same reason. */

  /**
   * A TAP MEANS ONE THING, ALWAYS: commit and close.
   *
   * It does not depend on what else the user has touched, there is nothing to
   * confirm afterwards, and no verdict opens a second step ("dont want too
   * much steps", 2026-11-02). The record goes to disk, the acknowledgement
   * takes over, and that panel hands back on its own. One tap.
   *
   * For a few hours the note sat on this step and a tap had to SELECT instead
   * of committing once the field was open. That is gone with the note; see
   * the header for why the panel is the better home and not merely the safer
   * one. If an option is ever made to select again, CHIP_PRESSED_CLASS and
   * the Button/Toggle choice have to move back with it — the row takes
   * CHIP_BASE_CLASS WITHOUT the pressed rules precisely because it cannot
   * select today. (This sentence named VERDICT_OPTION_CLASS while the row
   * was a stacked list; that constant was retired 2026-11-02 with the
   * revert to chips and only the pointer changed here.)
   *
   * `Something else` is no different from the other four here, which IS
   * different from the ignore step, where it opens the note by itself. There
   * is no note on this step to open.
   *
   * CONTRAST WITH chooseIgnoreVerdict BELOW, because the two are now the
   * closest thing this file has to a pair and they behave differently: that
   * one SELECTS and waits for Done, this one commits outright. The reason is
   * the flow, not the control — see the report's note on the two screens
   * having different interaction models.
   *
   * The verdict is passed to finishStep rather than read back off state:
   * setVerdict will not have landed by the time this function commits.
   */
  const chooseVerdict = (value) => {
    if (verdict) return
    setVerdict(value)
    finishStep(value)
  }

  /**
   * The ignore step's chip — SINGLE SELECT since 2026-11-02, and that was
   * forced rather than chosen.
   *
   * The old six were CAUSES and multi-select: a stuck toilet and a running
   * tap can both be true. The new four are VERDICTS on one event and are
   * mutually exclusive — "Expected usage" and "Not a real alert" cannot both
   * be the reason it is acceptable to leave this running. A verdict is
   * singular by definition, which is what lets the store derive one `answer`
   * from it; multi-select would put us straight back to picking one member
   * out of an array, which is the shim this change just retired.
   *
   * It also happens to settle a disagreement between the two flows. The
   * event-ended step is single select on the strongest evidence in the
   * research behind it — a randomised Pew experiment (n=4,581) measured
   * select-all-that-apply ~8 percentage points below forced choice on
   * endorsement, with a 3pp response-order effect forced choice does not
   * carry. A per-event label is exactly the case where multi-select is
   * strictly worse, so the two flows now agree.
   *
   * `chips` IS STILL WRITTEN, AS A ONE-ELEMENT ARRAY, AND THAT IS NOT
   * REDUNDANCY. Two surfaces outside this component read `record.chips` to
   * caption the ignored incident — SystemPageV2Screen:2283 and
   * HomeAllAccounts:1742, both `[record.chips?.join(', '), record.note]`.
   * Writing only `verdict` would leave both badges blank for every ignore
   * with no note, silently. This keeps them reading, now as "Expected usage"
   * rather than "Stuck or running toilet". REPORTED: once those two read
   * `verdict`, this line goes.
   */
  const chooseIgnoreVerdict = (label) => {
    setVerdict(label)
    setChips([label])
    // "Something else" is the only chip that opens the note by itself.
    if (label === SOMETHING_ELSE) setNoteOpen(true)
  }

  const changeNote = (raw) => {
    // Clipped here as well as by maxLength: a paste, an IME commit or a
    // programmatic set all beat the attribute.
    /* The `!isIgnore` arm here used to award POINTS.NOTE alongside this. It
       is DELETED rather than left dormant: the note moved twice on
       2026-11-02 and each move made it reachable again, so leaving it would
       have quietly re-introduced the points the owner removed on exactly
       this screen. */
    /* THE CELEBRATION TRIGGER IS NOT HERE ANY MORE. It sat on the first
       typed character for the hours the note lived on the acknowledgement
       panel — the only moment a user was still on screen to see it, because
       by then the record was already written. With the note back on the
       verdict step the note PRECEDES the commit, so finishStep can read it
       directly again, which is where it belongs and where it started. */
    const next = raw.slice(0, NOTE_MAX)
    setNote(next)
  }

  const confirmIgnore = () => {
    setIgnoreConfirmed(true)
    setStep('question')
    onIgnoreConfirmed?.()
  }

  /* 199748:26654. The frame ends here — there is no Thanks panel after it — so
     this writes whatever documentation was given and hands back. */
  const finishIgnore = () => close()

  /** Write the record — verdict AND note, in one addFeedback call — and
      hand over to the acknowledgement. Takes the verdict explicitly, because
      the only caller reaches it from the same tick as setVerdict and that
      state will not have landed yet. `note` is read off state and IS current:
      it was typed before the option was tapped. */
  const finishStep = (v) => {
    /* The screen-wide burst is for the users who went deep enough to type
       something; a bare option tap gets the small burst only. Reading `note`
       here is correct again now that it is typed BEFORE the answer, and the
       panel holds 2400ms rather than 2000 when it fires so it is seen. */
    setCelebrate(note.trim().length > 0)
    commit({ verdict: v }, points)
    // Read AFTER the commit, so "Wint has learned N times" counts this one.
    setLearned(getLearnedCount())
    setStep('done')
  }

  /* The derived answer, from the store's own total mapping — never spelled
     here, so the reward tone and what lands on disk cannot disagree. */
  const derived = verdict ? answerForVerdict(verdict) : null
  const branch = derived ? flow[derived] : null
  /* The verdict step wears the ignore documentation step's chrome — floating
     close button, 34px gutter, no context line — because it wears its chassis
     (owner, 2026-11-02: "similar to ignore"). The steps after it go back to
     the event-ended header row, which is where the points chip lives. */
  const chassisIsIgnore = isIgnore || step === 'verdict'

  /* Both flows now headline the same owner-authored string on the step the
     user acts on; `warning` keeps its own. */
  const title = step === 'warning' ? WARNING_TITLE : IGNORE_HEADING

  return (
    <div
      ref={hostRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="absolute inset-0 z-50 flex flex-col justify-end"
    >
      <style>{SHEET_CSS}</style>

      {/* Scrim. On the warning step a tap outside is still a Cancel and
          Ignore never commits by accident — `ignoreConfirmed` is what makes
          it so, not the argument this used to pass. Afterwards it is a
          dismissal, and whatever was answered is kept. */}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => close()}
        className="absolute inset-0 cursor-default bg-foreground/45"
      />

      {/* Entrance via the shadcn animation classes, which compiled to nothing
          until tw-animate-css was wired in this pass. Entrance only: this
          component returns null when closed, so there is no element left to
          animate out. */}
      <div className="wef-sheet relative flex max-h-[85%] flex-col overflow-hidden rounded-t-[24px] bg-surface-card shadow-[0_-8px_32px_rgba(0,0,0,0.18)] animate-in fade-in-0 slide-in-from-bottom-[100%] duration-500 ease-(--ease-ios) motion-reduce:slide-in-from-bottom-0">
        {/* 199745:21417 / 199748:26641 — the grab handle. */}
        <div aria-hidden="true" className="mx-auto mb-[6px] mt-[11px] h-[4px] w-[34px] shrink-0 rounded-[10px] bg-slate-300" />

        {/* The ignore frames draw NO context line and NO points chip — only the
            handle and the close button. REPORTED: `systemName` and
            `eventLabel` are still passed by both SystemPageV2Screen call
            sites, so on the ignore flow they arrive and go unrendered.

            SINCE 2026-11-02 THE VERDICT STEP TAKES THE SAME CHROME, because
            the owner asked for a step "similar to ignore" and its own banner
            would otherwise repeat the context line word for word. NOTHING IS
            LOST BY IT: `points` is 0 until the verdict is tapped and the
            badge only renders above 0, so the chip never had anything to draw
            on this step. The context line and the points chip both come back
            on the steps that follow. */}
        {chassisIsIgnore ? (
          /* 199745:24605 / 199748:26655 — left-[362px] in a 402px frame, i.e.
             10px from the right edge, floating over the content. */
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            onClick={() => close()}
            className="absolute right-[10px] top-[10px] z-10 size-[30px] rounded-full border border-background bg-muted text-slate-700 hover:bg-muted"
          >
            <X size={18} strokeWidth={2} />
          </Button>
        ) : (
          <div className="flex items-center justify-between gap-[10px] px-[18px] pb-[10px] pt-[4px]">
            <p className="min-w-0 flex-1 truncate text-[12px] font-medium tracking-[0.2px] text-muted-foreground leading-[16px]">
              {[flow.context, systemName, eventLabel].filter(Boolean).join(' · ')}
            </p>

            {/* The "+N" points badge stood here. The owner saw it on the
                step he rejected and ruled it out with the rest: "dont want
                this". Gone from this flow only — nothing else in the app
                drew one. */}
            <div className="flex items-center gap-[10px]">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close"
                onClick={() => close()}
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
            chassisIsIgnore ? 'px-[34px] pb-[30px] pt-[13px]' : 'px-[18px] pb-[24px] pt-[8px]',
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
                  onClick={() => close()}
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

                  {/* 199748:26646 — one flat set, no branch, no heading
                      above it beyond the one already rendered. The LABELS are
                      the owner's four verdicts since 2026-11-02 ("this one
                      shows the wrong options"); the LAYOUT is the frame's,
                      unchanged. Four chips where six used to wrap 2/2/2.

                      Single select, and the pressed treatment is honest here
                      in a way it is not on the event-ended row: this step
                      stays open until Done, so a chosen chip really is seen
                      "on" and its aria-pressed really is true. */}
                  <div className="flex flex-wrap gap-[10px]">
                    {IGNORE_VERDICT_OPTIONS.map((label) => (
                      <Toggle
                        key={label}
                        variant="outline"
                        pressed={verdict === label}
                        onClick={() => chooseIgnoreVerdict(label)}
                        className={IGNORE_CHIP_CLASS}
                      >
                        {label}
                      </Toggle>
                    ))}
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
                    className={NOTE_OPENER_CLASS}
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

          {/* ── event-ended: the one step, five verdicts — 2026-11-02 ──────
              Built from the ignore documentation step's parts, because the
              owner asked for "a new flow similar to ignore but with different
              options". Banner, heading, one wrapped chip row — and nothing
              else of substance. No note opener and no Done: one tap on one
              chip is the whole answer and it closes the sheet. */}
          {step === 'verdict' && !isIgnore ? (
            <section className="flex flex-col gap-[20px]">
              {/* The ignore step's banner, with this flow's own context
                  string. 'Water event ended' is what the header line has said
                  on this flow since the mockup; nothing is authored here. */}
              <div className="flex items-center gap-[7px] rounded-[12px] bg-alert-surface-success px-[5px] py-[5px]">
                <span
                  aria-hidden="true"
                  className="flex size-[32px] shrink-0 items-center justify-center rounded-full bg-surface-card text-success"
                >
                  <Check size={20} strokeWidth={2.6} />
                </span>
                <p className="min-w-0 flex-1 text-[18px] font-semibold tracking-[-0.45px] text-slate-800 leading-[22px]">
                  {flow.context}
                </p>
              </div>

              {/* The owner's own heading, shared with the ignore step — see
                  the note on IGNORE_HEADING for why it is not a new string. */}
              <h2 className="text-[20px] font-bold text-slate-800 leading-[26px]">
                {IGNORE_HEADING}
              </h2>

              {/* THE OPTIONS. Stacked and full-width since 2026-11-02 — see
                  VERDICT_OPTION_CLASS for the measurement that forced it and
                  for what was deliberately NOT added.

                  THE ORDER IS PRINCIPLED AND MUST NOT BE DISTURBED: real and
                  serious, real and wasteful, real and fine, not real, escape.
                  A user can perceive that progression, which is what makes
                  the list scannable; the escape belongs last.

                  THE EXTRA SPACE BEFORE "Unnecessary alert" IS THE ONE PIECE
                  OF DESIGN DOING SEMANTIC WORK. It and "Unusual, no issue"
                  are adjacent, mean opposite things, and are where this kind
                  of taxonomy concentrates its errors — in the one large
                  published study of the pattern, ~99% of misclassifications
                  landed on exactly that middle class. They separate on one
                  question, DID WATER ACTUALLY RUN, and the gap falls on that
                  boundary: above it the water ran, below it there is nothing
                  to report. THE SENTENCE ITSELF IS NOT ON THE SCREEN and
                  must not be written here — it is copy, and copy is the
                  owner's. The gap is structure, which is mine. REPORTED: if
                  he judges that only words can fix this pair, the words are
                  his to give and there is a place for them.

                  ── SUPERSEDED 2026-11-02, LATER THE SAME DAY ──────────────
                  The owner saw the list and rejected it: "get back to chips.
                  Hate this one." This is a wrapped chip row again — the
                  ignore step's own `flex flex-wrap gap-[10px]` and
                  CHIP_BASE_CLASS, so the two steps sit on one rhythm. A
                  wrapped row and not a grid, because the five labels are
                  very different lengths and a grid would set every cell to
                  the widest of them.

                  THE ORDER STILL STANDS, unchanged and for the reason above.
                  THE GAP DOES NOT: `mt-[10px]` on one item of a wrapped row
                  reads as a misaligned pill, not as a grouping break, so it
                  is gone and the did-it-run boundary is carried by nothing.
                  The retired VERDICT_OPTION_CLASS tombstone above holds the
                  full account, including the forced-line-break option that
                  was declined and why.

                  ── AMENDED 2026-11-02, FROM A DEVICE SCREENSHOT ───────────
                  The free wrap landed 2/2/1 on a real phone and the owner
                  asked for "2 lines instead of 3". These are now TWO
                  DECLARED LINES (VERDICT_LINES, 3/2) rather than one wrapped
                  row: the count cannot drift with the font. A line that
                  still will not fit makes its own chip taller instead of
                  pushing a sibling onto a third row.

                  AND THE SPLIT IS NOW LOAD-BEARING. 3/2 puts the break
                  exactly on the did-water-actually-run boundary — line 1 is
                  the three verdicts where water ran, line 2 is the one where
                  it did not plus the escape. The gap this comment records
                  above as lost came back as the line break, by accident of
                  the owner's instruction. DO NOT re-split these lines
                  without reading the tombstone above. Still no copy: the
                  sentence is not on the screen and is not ours to write. */}
              <div className="flex flex-col gap-[8px]">
                {VERDICT_LINES.map((line) => (
                  <div key={line[0]} className="flex gap-[8px]">
                    {line.map((label) => (
                      <Button
                        key={label}
                        type="button"
                        variant="outline"
                        onClick={() => chooseVerdict(label)}
                        className={VERDICT_CHIP_CLASS}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                ))}
              </div>

              {/* THE NOTE, BELOW THE OPTIONS — owner, 2026-11-02: "i want the
                  add note on first step", twice. Opening it changes NOTHING
                  about what an option does: a tap still commits and closes,
                  and carries whatever has been typed into the same record.
                  That is what lets the field live here at all. The opener and
                  the field are the ignore step's own, because this step is
                  the ignore step's chassis. */}
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
                  className={NOTE_OPENER_CLASS}
                >
                  + Add note (optional)
                </Button>
              )}
            </section>
          ) : null}

          {/* ── event-ended: the acknowledgement ──────────────────────────            </section>
          ) : null}

          {/* ── event-ended: the acknowledgement ──────────────────────────
              The tap (or Done) wrote the record and landed here; this panel
              closes itself. It is the reward pop and the microcopy the owner
              KEPT from the step he rejected, over the learned count that was
              already on the old Thanks panel.

              WHAT IT LOST: the "+N points" line, with the points; and the
              bare "Thanks!" heading, which said the same word twice once
              "Thanks — Wint learned from this." moved up into its place.
              Both reported rather than assumed.

              The microcopy is still picked by the verdict's DERIVED answer,
              so "Unnecessary alert" gets "Thanks — Wint will be quieter
              here." — the one acknowledgement that is true of it. */}
          {step === 'done' && branch ? (
            <section className="flex flex-col items-center gap-[10px] px-[24px] pb-[32px] pt-[30px] text-center">
              <span className="relative flex size-[88px] items-center justify-center">
                <Particles tone={derived} />
                <span
                  aria-hidden="true"
                  className={cn(
                    'wef-pop flex size-[56px] items-center justify-center rounded-full',
                    derived === 'yes'
                      ? 'bg-success/15 text-success'
                      : 'bg-primary/15 text-primary',
                  )}
                >
                  <Check size={26} strokeWidth={2.6} />
                </span>
              </span>
              <p className="text-[15px] font-bold text-foreground leading-[20px]">
                {branch.microcopy}
              </p>
              <p className="text-[13px] text-muted-foreground leading-[18px]">
                Wint has learned <strong>{learned}</strong> times from your feedback.
              </p>

              {/* THE NOTE LIVED HERE for part of 2026-11-02, after the
                  owner chose this over the verdict step. He reversed it on
                  seeing it built — "i want the add note on first step" — so
                  there is ONE home for it and this is not it.

                  EVERYTHING ELSE ABOUT THIS PANEL IS UNTOUCHED, and that is
                  on his instruction: the pop, the microcopy, the learned
                  count and the auto-close are the part he has twice said he
                  likes and wants more of. */}
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
