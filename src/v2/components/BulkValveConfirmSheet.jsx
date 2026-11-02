/**
 * BulkValveConfirmSheet — the confirmation in front of a BULK valve operation:
 * closing or opening every valve across a location, across a selection, or
 * across a whole account.
 *
 * DESIGN SOURCE: none. The Figma file has no valve-management, bulk-action or
 * confirmation frame — a survey walked every page and found nothing to
 * transcribe. This component is net-new from the design system, structurally
 * like AccountScreenV2.jsx:4. EVERY VISIBLE STRING BELOW IS NEW COPY AWAITING
 * THE OWNER'S APPROVAL.
 *
 * WHY THIS EXISTS
 * ValveConfirmSheet is the per-system confirmation: 1-3 devices inside one
 * system. In production a bulk action is 100-1000 physical valves in occupied
 * buildings. Closing them cuts water — no toilets, no kitchens, a possible
 * fire-suppression concern; opening them can resume a leak and flood a floor.
 * The owner's framing: "this is like a super dangerous operations... we need
 * some pop-up messages, and we need to select deselect. We need to understand
 * the context of systems."
 *
 * And the hard requirement, in his words: "we have a kind of offline devices
 * that the valve cannot be shut off. So we need to explain the user this
 * situation somehow and to not let him think that this valve will take place
 * on this operation that he wants to."
 *
 * ══ THE 2026-11-02 REDESIGN ══════════════════════════════════════════════
 * The owner, same day: "It needs to be much more clear... I want like a very
 * smooth operations for this." The sheet it replaces was ~350px at its
 * smallest and ~760px with all five exclusion buckets drawn, at which point it
 * filled the 393x852 frame and pushed the commit button off-screen. Five
 * structurally identical three-line blocks were copy-pasted, and every tier of
 * blast radius — 3 valves or 900 — got exactly the same treatment.
 *
 * Six changes, each with its own argument. They are settled; do not re-open
 * them without new evidence.
 *
 * ── 1. UNDO IS AVAILABLE HERE, AND THAT RE-CLASSES THE WHOLE DESIGN ──────
 * The old sheet was built on the premise that confirmation is all we have.
 * It is not. The commands have not left for the devices at the moment the
 * user commits, and we control when they do. WCAG's *sufficient technique*
 * G164 for SC 3.3.4 is literally "providing a stated time window in which the
 * user may amend or cancel a request"; a hold of HOLD_SECONDS before dispatch
 * is that technique, applied to water instead of to an order form.
 *
 * Primer's own framing is the one to keep in mind: "An undo protects someone
 * who makes a mistake without interrupting someone who doesn't." A gate taxes
 * everybody to catch the few; a cancel window taxes nobody and catches the
 * slip in exactly the seconds a slip is noticed — the user has just watched
 * the sheet close and is still looking at the screen.
 *
 * So the commit button no longer dispatches. It STARTS THE HOLD. `onConfirm`
 * now means DISPATCH NOW and fires when the window expires or is skipped —
 * see "THE CONTRACT CHANGE" below, because this is a breaking change for the
 * one caller.
 *
 * ── 2. FRICTION SCALES TO BLAST RADIUS; UNIFORM FRICTION IS THE DEFECT ───
 * Primer again: "How much friction to put in someone's way depends on how
 * much damage a mistake would do," and "Reserve type-to-confirm for
 * irreversible actions with wide blast radius, so the extra friction still
 * means something when people hit it."
 *
 * The evidence that uniform treatment actively backfires is strong and
 * quantitative. Akhawe & Felt (USENIX Security 2013) measured ~25 MILLION
 * real browser security-warning impressions and found click-through rates up
 * to 70.2% — users bypass a warning they have seen before, whatever it says.
 * The clinical-decision-support literature reports override rates of 50-80%
 * for medication alerts, for the same reason. A sheet that looks identical at
 * 3 valves and at 900 teaches the user that it always looks like that.
 *
 * THE LADDER, keyed on `willActCount` (and `scopeKind`), in `tierFor()`:
 *
 *   small   willActCount <= 10               8s window,  no acknowledgement
 *   medium  11-100                          15s window,  no acknowledgement
 *   large   >100, OR scopeKind === 'account' 20s window,  ACKNOWLEDGEMENT
 *
 * THE THRESHOLDS ARE PLACEHOLDERS AND ARE ROUND NUMBERS BECAUSE WE HAVE NO
 * TELEMETRY, NOT BECAUSE 10 AND 100 MEAN ANYTHING. NN/g on exactly this:
 * "The exact threshold should be set through user research." What we should
 * measure before fixing them: the distribution of real bulk-action sizes, and
 * the size above which a stop actually gets pressed. Until then 10 is "a
 * floor I can still picture", 100 is "more buildings than one person holds in
 * their head", and `scopeKind === 'account'` is in the top tier regardless of
 * count because an account action is unbounded by construction.
 *
 * The 15-20s figures come from the brief's reading of G164 as applied to a
 * physical actuation; 8s at the small tier is a deliberate reduction, not a
 * rounding — the whole point of the ladder is that the cheap case stays cheap.
 *
 * ── 3. THE TOP-TIER GATE IS NOT TYPE-TO-CONFIRM, AND NOT A TIMER ─────────
 * Bravo-Lillo et al. (SOUPS 2014) tested "inhibitive attractors" and found the
 * split that matters: treatments that merely DELAYED dismissal still
 * habituated over repeated exposure, while the ones that FORCED INTERACTION
 * WITH THE FIELD CONTAINING THE INFORMATION THAT CHANGES were "resilient to
 * habituation." Felt et al. (CHI 2015) then showed opinionated design raised
 * adherence from 37% to 62% in the field WHILE COMPREHENSION STAYED FLAT —
 * people behave safely because the design steers them, not because they read.
 *
 * So the top tier gets a FORCED INTERACTION WITH THE VARYING CONTENT: the
 * commit stays inert until the user taps a checkbox row that restates the
 * count and the scope in its own words (`ackLabel`). The numbers are rendered
 * INSIDE the tappable row, so the thumb cannot reach the gate without passing
 * over the quantity. It is naturally polymorphic — the sentence is different
 * on every invocation because the count and the scope are — which is the
 * property Vance et al. (CHI 2017, fMRI + eye tracking) found reduces
 * habituation. It also maps cleanly onto WCAG technique G155 ("providing a
 * checkbox in addition to a submit button") for anyone who wants a
 * conformance story out of it.
 *
 * THIS COMPOSITION IS A SYNTHESIS, NOT A PUBLISHED TESTED PATTERN. No design
 * system ships "checkbox restating the varying quantity as the gate on a
 * destructive bulk action". The INGREDIENTS are each sourced above; the
 * assembly is ours and has not been user-tested. Say so to the owner.
 *
 * WHY NOT TYPE-TO-CONFIRM, honestly stated. The usual argument is that
 * type-to-confirm has "documented accessibility problems". ON SEARCHING, THAT
 * CLAIM IS WIDELY ASSERTED AND NOT ACTUALLY DOCUMENTED — no WCAG failure, no
 * study, no design-system citation backs it. It is folklore and this comment
 * will not repeat it. The real reasons it loses HERE are two, and both are
 * about this frame: (a) on 393px the software keyboard covers the bottom
 * ~45% of the viewport, which is the scope summary the user is supposed to be
 * checking while they type — the gate would hide the very field it is meant
 * to make salient; (b) it is copy-paste defeatable, and the scope label is on
 * screen to copy from. A checkbox has neither problem.
 *
 * ── 4. THE ~800ms ARMING DELAY SURVIVES, DEMOTED ─────────────────────────
 * By Bravo-Lillo it is the WEAK form: a pure delay, exactly the kind that
 * habituated. It is kept at all three tiers anyway, because its actual job was
 * never cognitive. It is INPUT HYGIENE — the second half of a double-tap on
 * whatever control opened this sheet lands on a dead button instead of on a
 * live commit. That is a mechanical claim about touch events, not a claim
 * about attention, and the cancel window does not replace it: a double-tap
 * that starts a hold still costs the user a Stop they did not ask for.
 * It stays 800ms, it stays at every tier, and it is no longer described as a
 * safety control that makes people read. It does not make people read.
 *
 * ── 5. THE EXCLUSION SET IS COMPRESSED, NOT CUT ──────────────────────────
 * All five buckets are PINNED BEHAVIOUR and each encodes the owner's own
 * requirement. None was removed. What changed is the markup: five copy-pasted
 * `count + label + consequence` blocks became one `<ExclusionRow>` rendered
 * from a list, one row per bucket instead of a three-line block each.
 *
 * And the offline bucket is PROMOTED out of "Not included" to sit directly
 * under the headline, as its own line — `3 systems are offline — will not be
 * affected`, expandable to the names with last-seen. It is the owner's hard
 * requirement and it was the fifth thing down a list. It is NOT ALSO repeated
 * under "Not included": one fact, one place, or the user counts it twice.
 * The disclosure is still OPEN by default and still has no hover dependency.
 *
 * NEVER QUEUE ACTUATION FOR AN OFFLINE DEVICE, and nothing here implies we
 * do. A valve that closes an hour later when nobody is watching is a WORSE
 * outcome than one that does not close: the user has left the building,
 * believing the system idle. Exclude, report, let the user retry deliberately.
 *
 * ── 6. TOKENS, SCALE, AND THE TWO ABUSED PRIMITIVES ──────────────────────
 * Four literal colours were off the semantic scale: `text-slate-600` (8 call
 * sites), `text-slate-500` twice, `bg-slate-500` once. These ARE registered
 * Tailwind colours in this repo and they DO move per theme, so this is not the
 * missing-token failure `index.css` warns about — it is subtler and worse on
 * this surface. `--slate-600` is a RAMP STEP; `--muted-foreground` is a
 * SEMANTIC TOKEN that re-points per theme (`:root` -> --slate-500, `dark` ->
 * zinc-400, `sand` -> stone-500, `contrast` -> a cyan). The card and the
 * screen already use `text-muted-foreground` for this exact role. Same visual
 * role, different theme behaviour, on the most dangerous surface in the
 * feature. All four now name the semantic token.
 *
 * Also fixed: a `<Separator>` was being abused as a grab handle via
 * `h-[4px] w-[36px]` orientation overrides — it is a plain `<div>` now, which
 * is what a handle is; and the offline name list's hand-rolled card
 * (`rounded + border + padding`) is the house `<Card>`. Five distinct
 * `text-[Npx]` sizes and fifteen arbitrary spacing values are on the shadcn
 * scale: `text-sm` body, `text-xs` eyebrows, 4px spacing steps.
 *
 * ══ WHAT THIS SHEET STILL CANNOT HONESTLY SAY ════════════════════════════
 * IEC 61850's control model — the standard this domain actually runs on — is
 * `SelectWithValue -> Operate -> CommandTermination`, where termination is the
 * acknowledgement that the device REACHED the commanded state, and it can
 * arrive much later than the command. NEVER PAINT A VALVE AS DONE ON
 * ACKNOWLEDGEMENT OF THE COMMAND ALONE.
 *
 * THIS REPO HAS NO DEVICE FEEDBACK CHANNEL AND THIS FILE DOES NOT FABRICATE
 * ONE. What it can honestly show is two of the three states — `selected`
 * (this sheet, under review) and `sent` (dispatched, after the hold) — and it
 * labels the second as `sent`, never as `closed`. The post-hold line says so
 * in as many words. THE PRODUCT RECOMMENDATION, for the owner, is the third
 * state: a per-valve confirmation read back from the device, surfaced as a
 * distinct `confirmed` state in the result panel. That is a backend change,
 * not a sheet change, and it is the single highest-value thing left here.
 *
 * PARTIAL FAILURE IS THE NORMAL CASE AT THIS SCALE, not the exception —
 * dispatching ~1000 commands over field radio, some will not land. The result
 * surface (NOT this sheet; `ValveManagementScreen` owns it) should report
 * succeeded / failed / excluded as THREE SEPARATE GROUPS, group the failures
 * by actionable cause, and scope retry to the failures only. All-or-nothing
 * rollback is wrong here and must not be built: rolling back a bulk close
 * means REOPENING valves, which is itself a dangerous physical act nobody
 * asked for. NO DESIGN SYSTEM PUBLISHES A PARTIAL-SUCCESS COMPONENT — this
 * guidance is from engineering practice (bulk-API conventions: per-item status
 * in the response, retry scoped to the failed subset), not from a UX source,
 * and should be read as such.
 *
 * ══ THE CONTRACT CHANGE — READ THIS BEFORE WIRING THE SCREEN ═════════════
 * `onConfirm` NO LONGER FIRES ON THE COMMIT CLICK. The click starts the hold;
 * `onConfirm` fires HOLD_SECONDS[tier] later, or immediately if `skipHold`.
 * It still fires EXACTLY ONCE per decision (`dispatchedRef`).
 *
 * Nothing else about the existing props changed, so the current call site in
 * `ValveManagementScreen.jsx:1417` keeps working unmodified — it simply
 * dispatches later. The FOUR NEW PROPS are all optional and all additive:
 *
 *   holdSeconds   number   override the tier default (0 disables the hold)
 *   skipHold      boolean  dispatch on click, as before. For tests and for a
 *                          future emergency path. Default false.
 *   onHoldStart   ({ action, willActCount, seconds }) => void
 *   onHoldTick    (secondsRemaining) => void   fired every second, and with 0
 *                                              at dispatch
 *   onHoldStop    () => void                   the user pressed Stop
 *
 * The three callbacks exist so the SCREEN can render the countdown somewhere
 * of its own — a banner that survives the sheet closing, say. The sheet draws
 * its own countdown regardless, so the screen may ignore all three.
 *
 * ══ UNCHANGED FROM THE ORIGINAL, AND STILL LOAD-BEARING ══════════════════
 *  - THE HEADLINE NUMBER IS WHAT WILL BE ATTEMPTED, never what was selected.
 *    `willActCount` is the only number in big type and the same number in the
 *    button. One number, one meaning. The button is named by OUTCOME and
 *    carries the count (NN/g, Apple HIG and SLDS all say match the title to
 *    the button label), which also makes the dialog polymorphic.
 *  - EACH BUCKET STATES THE WATER CONSEQUENCE, not the software one. A
 *    facility manager acts on water, not on packets.
 *  - THE NON-ACTING BUCKETS SIT ABOVE THE COMMIT BUTTON in DOM order as well
 *    as on screen, and tests pin it.
 *  - RED IS NOT THE CARRIER. GOV.UK and Atlassian both say a destructive
 *    action must not depend on colour; the `destructive` variant is kept for
 *    close (and `default` for open, because opening is not destructive) but
 *    every load-bearing fact is in words and numbers.
 *  - NO ENTER-ACTIVATED DEFAULT: there is no `<form>`, every button is
 *    `type="button"`. INITIAL FOCUS GOES TO THE HEADING, never to the commit
 *    button — SLDS: "Do not focus the cursor on the action button"; Primer
 *    focuses Cancel on a danger dialog. When the hold starts, focus moves to
 *    Stop, so the way out is under the thumb and under the caret.
 *  - "Are you sure" and "This action cannot be undone" are BANNED and a test
 *    pins it. The second is false here (you can reopen the valve) and is a
 *    double negative with an unclear referent besides; this sheet says what
 *    happens and what reversing it would take.
 *
 * THE EXCLUSION SET — FIVE BUCKETS, and the set must stay closed. A valve the
 * command will not reach has to be named or the user walks away with the wrong
 * belief, whatever the reason for the miss. `valveScope.js` is the one place
 * that decides who is excluded, and `targetsFor(...).skipped` returns exactly
 * these five (the order `valveCommandStore.js:82` records them in):
 *
 *   offline           → `offlineSystems` (by NAME, not only a count)
 *   no valve fitted   → `noValveCount`
 *   `valve === 'error'`      → `faultedCount`
 *   `valve === 'closing'`    → `closingCount`
 *   already in the commanded state → `alreadyInStateCount`
 *
 * `closing` is the fifth valve state and the easy one to drop: minted at
 * `src/lib/pushEvents.js:153`, overlaid onto `sys.valve` by
 * `src/data/systems.js:206` (pinned by `pushLifecycle.test.js:131`), and
 * `valveScope.js:167` rules it NOT actionable. It gets its own row rather than
 * being folded into "already Closed" because it is a different fact. A new
 * exclusion reason added to `valveScope.js` needs a row here the same day.
 *
 * PURE AND PROPS-DRIVEN. It imports no valve store and no scope helper, holds
 * no state but the arming flag, the acknowledgement, the hold counter and the
 * offline disclosure, and renders only what it is handed.
 *
 * WHY NOT THE SHADCN <Sheet>, AND WHY NOT A REAL AlertDialog
 * Same reason ValveConfirmSheet.jsx:17-25 gives, restated at
 * AccountScreenV2.jsx:644-656: shadcn's Sheet is a Radix dialog that portals
 * to `document.body`, and this app draws inside a fixed 393x852 frame
 * (src/components/Phone.jsx, `overflow: hidden`). A portal escapes that frame
 * by design and paints across the whole browser window with the phone sitting
 * in the middle of it. The house pattern is an `absolute inset-0` overlay
 * INSIDE the page, which is what this is.
 *
 * NOTED, NOT TAKEN: Radix's `container` prop would let a real `AlertDialog`
 * render inside the frame and bring its focus trap, its `aria-modal` handling
 * and its dismissal for free. That is an ARCHITECTURAL decision the owner has
 * not taken, it would apply to every overlay in the app or to none, and it is
 * explicitly out of scope here. Mentioned so the option is on the record.
 *
 * `role="alertdialog"`, not `dialog` — this is a destructive confirmation,
 * which is what the role is for. `aria-labelledby` names it from the title,
 * `aria-describedby` from the consequence line.
 *
 * ON `aria-modal="true"` — VERIFIED, NOT ASSUMED, AND ONLY PARTLY EARNED.
 * W3C APG says to set it only when the rest of the application is genuinely
 * inert. It was checked: NOTHING IN THIS APP MAKES THE SHELL INERT. There is
 * no `inert` attribute and no `aria-hidden` on the page content behind an
 * in-frame overlay — a portal-less `absolute inset-0` div does not inert its
 * siblings, and no house overlay does it by hand. So the attribute is
 * half-true today. What this file CAN do from inside its own subtree it now
 * does: initial focus is placed in the sheet and Tab is trapped inside it, so
 * the claim holds for keyboard users. What it CANNOT do is stop a screen
 * reader's virtual cursor reaching the rows behind the scrim — that needs the
 * PAGE to mark its own content `inert` while the sheet is open, which is
 * `ValveManagementScreen`'s to do and is flagged to its owner rather than
 * reached into from here. The attribute is kept (a test pins it, and the role
 * expects it); this paragraph is the honest footnote.
 *
 * TOKENS ONLY — no `var(--x, #hex)` fallbacks. Phase 3 of
 * docs/TOKENIZATION-PLAN.md deleted every fallback deliberately. Every colour
 * utility below resolves to a token declared in src/index.css:
 *   bg-surface-card   --surface-card       bg-foreground/45   --foreground
 *   text-foreground   --foreground         text-muted-foreground --muted-foreground
 *   bg-card           --card               border-border       --border
 *   border-border-strong --border-strong   the red fill --destructive
 * `:root` declares each and the three theme blocks override on the SAME root
 * element, so every utility here moves under all four themes.
 *
 * COPY — the product's decided vocabulary, not invented synonyms:
 *   - the valve states are drawn in Figma (board 199535:96542) as literally
 *     `Open` / `Closed` / `No valve installed` / `Unknown` / `Valve Error` /
 *     `Disconnected` — so "No valve installed", never "No valve"; "Valve
 *     Error", never "Fault". The transitional state is drawn there too, as
 *     `Verifying closure (allow a few min)`.
 *   - offline is `Offline` / `Offline systems` / `System is offline` /
 *     `Can't reach {name}` (src/i18n/locales/en.json:348-355). "Unreachable"
 *     appears nowhere in this product and is not introduced here.
 *   - DELIBERATELY ABSENT: "Are you sure"; "This action cannot be undone";
 *     and any phrasing implying the offline ones will be acted on later.
 *   - No t(). Only 2 of 36 v2 components use i18n and no v2 valve surface
 *     does; adding it here would make this the one translated string.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ValveStateReadout } from '@/v2/components/ValveStateReadout'

/* INPUT HYGIENE, NOT A COGNITIVE ATTRACTOR — see note 4 in the header. ~800ms
   is long enough that the second half of a double-tap on whatever control
   opened this sheet lands on a dead button, and short enough that a user who
   meant it barely registers it. `prefers-reduced-motion` flattens the bar that
   draws it (see SHEET_CSS) but never shortens or removes the delay itself.
   `skipArmingDelay` is the only thing that does. */
const ARMING_DELAY_MS = 800

/* THE LADDER. Round numbers standing in for telemetry we do not have — NN/g:
   "The exact threshold should be set through user research." See note 2. */
const TIER_MEDIUM_MIN = 11
const TIER_LARGE_MIN = 101

/* THE CANCEL WINDOW, per tier — WCAG G164 applied to a physical actuation.
   The command has NOT left for the devices while this is counting down. */
const HOLD_SECONDS = { small: 8, medium: 15, large: 20 }

/** `scopeKind === 'account'` is unbounded by construction, so it is top tier
    whatever the count says. A zero count cannot be a large action. */
function tierFor(willActCount, scopeKind) {
  if (willActCount <= 0) return 'small'
  if (willActCount >= TIER_LARGE_MIN || scopeKind === 'account') return 'large'
  if (willActCount >= TIER_MEDIUM_MIN) return 'medium'
  return 'small'
}

/* Scoped to this component rather than added to the global stylesheet — the
   house pattern at WaterEventFeedbackSheet.jsx:375. Under reduced motion the
   arming bar simply sits full-width and still: the button stays disabled for
   the same 800ms either way. */
const SHEET_CSS = `
.bvcs-arm { animation: bvcs-arm ${ARMING_DELAY_MS}ms linear forwards; }
@keyframes bvcs-arm { from { width: 0%; } to { width: 100%; } }
@media (prefers-reduced-motion: reduce) {
  .bvcs-arm { animation: none; width: 100%; }
}
`

/* THE SHADCN SCALE, named once. Line-height LAST in each — twMerge drops a
   `leading-` that precedes a font-size atom. `text-muted-foreground` is the
   semantic token for ALL secondary text here; no ramp steps (note 6). */
const TITLE = 'font-semibold text-foreground tracking-tight text-xl leading-tight'
/* The headline count is the largest type on the sheet. */
const COUNT_BIG = 'font-bold text-foreground tabular-nums tracking-tight text-3xl leading-tight'
const COUNT_ROW = 'font-semibold text-foreground tabular-nums text-base leading-snug'
const ROW_LABEL = 'font-medium text-foreground text-sm leading-snug'
const BODY = 'text-muted-foreground text-sm leading-snug'
const EYEBROW = 'font-semibold uppercase tracking-wide text-muted-foreground text-xs leading-normal'

/** `1 system` / `3 systems`, so no row ever reads "1 systems". */
const plural = (n, one, many) => (n === 1 ? one : many)

/**
 * ONE ROW PER EXCLUSION BUCKET. The five hand-copied blocks this replaces each
 * re-picked their own margin, count size and label weight; the only thing that
 * ever differed between them was the three strings.
 *
 * THE MARKUP SHAPE IS LOAD-BEARING FOR THE TESTS and for a real reason: the
 * label and the consequence are SEPARATE elements with their own direct text,
 * because testing-library's `getByText` reads a node's OWN text children, not
 * its subtree. A bucket whose label and consequence are concatenated into one
 * string cannot be asserted on independently, and these assertions are the
 * owner's requirement in executable form.
 */
function ExclusionRow({ count, label, consequence }) {
  return (
    <li className="flex items-baseline gap-2 py-1">
      <span className={`font-sans ${COUNT_ROW} shrink-0`}>{count}</span>
      <p className="min-w-0 flex-1 font-sans">
        <span className={ROW_LABEL}>{label}</span>
        {' — '}
        <span className={BODY}>{consequence}</span>
      </p>
    </li>
  )
}

/**
 * @param {{
 *   action: 'close'|'open'|null,
 *   scopeLabel: string,
 *   scopeKind?: 'location'|'account'|'selection',
 *   willActCount: number,
 *   offlineSystems?: {id?: string, name: string, lastSeenLabel?: string, categoryKey?: string}[],
 *   noValveCount?: number,
 *   faultedCount?: number,
 *   closingCount?: number,
 *   alreadyInStateCount?: number,
 *   busy?: boolean,
 *   skipArmingDelay?: boolean,
 *   holdSeconds?: number,
 *   skipHold?: boolean,
 *   onConfirm?: () => void,
 *   onCancel?: () => void,
 *   onHoldStart?: (info: {action: string, willActCount: number, seconds: number}) => void,
 *   onHoldTick?: (secondsRemaining: number) => void,
 *   onHoldStop?: () => void,
 * }} props
 */
export default function BulkValveConfirmSheet({
  action,
  scopeLabel,
  scopeKind = 'location',
  willActCount = 0,
  offlineSystems = [],
  noValveCount = 0,
  faultedCount = 0,
  /* Defaulted to 0 and read nowhere else, so a caller written against the
     four-bucket signature keeps working untouched. */
  closingCount = 0,
  alreadyInStateCount = 0,
  busy = false,
  skipArmingDelay = false,
  holdSeconds,
  skipHold = false,
  onConfirm,
  onCancel,
  onHoldStart,
  onHoldTick,
  onHoldStop,
}) {
  const titleId = useId()
  const consequenceId = useId()
  const ackId = useId()

  /* The offline list starts OPEN. A count alone lets the user assume the
     offline ones are unimportant, and a closed-by-default disclosure is that
     same failure one tap away. The toggle exists to collapse a long list once
     it has been seen, not to hide it before. */
  const [offlineOpen, setOfflineOpen] = useState(true)
  const [armed, setArmed] = useState(false)
  const [acked, setAcked] = useState(false)
  /* `null` = not holding. A number = seconds left before dispatch. */
  const [holdLeft, setHoldLeft] = useState(null)
  const holding = holdLeft !== null

  const headingRef = useRef(null)
  const stopRef = useRef(null)
  const sheetRef = useRef(null)
  /* Dispatch exactly once per decision, whatever re-renders the countdown
     effect sees. Reset in the per-decision cleanup below. */
  const dispatchedRef = useRef(false)

  /* THE CALLBACKS, BEHIND A REF, AND WHY. The countdown effect must depend on
     `holdLeft` ALONE. If it also depended on `onConfirm` / `onHoldTick` — which
     every real caller passes as inline arrows, fresh on every parent render —
     the 1s timer would be torn down and restarted on each of those renders and
     the countdown could stall indefinitely without ever reaching 0. On a sheet
     whose whole job is to dispatch at 0, that is a hang, not a glitch.
     DECLARED FIRST ON PURPOSE: effects run in declaration order within a
     commit, so this one has refreshed the ref before the countdown reads it. */
  const latest = useRef({})
  useEffect(() => {
    latest.current = { onConfirm, onHoldStart, onHoldTick, onHoldStop }
  })

  /* Escape. Radix gave this for free; an in-frame overlay has to say so itself
     (ValveConfirmSheet.jsx:70-76). DURING A HOLD, Escape STOPS THE DISPATCH
     rather than closing — the dangerous thing in flight is the command, not
     the sheet, and the way out must always do the safest available thing. */
  useEffect(() => {
    if (!action) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (holdLeft !== null) {
        setHoldLeft(null)
        latest.current.onHoldStop?.()
        return
      }
      onCancel?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [action, onCancel, holdLeft])

  /* Re-arms on every open, and on a switch between close and open — the delay
     has to be spent once per decision, not once per mount. The disarm lives in
     the CLEANUP rather than at the top of the effect body: setState in an
     effect body is a cascading render and react-hooks/set-state-in-effect
     rejects it, while the cleanup is exactly the moment the previous decision
     stops counting. */
  useEffect(() => {
    if (!action || skipArmingDelay) return undefined
    const id = setTimeout(() => setArmed(true), ARMING_DELAY_MS)
    return () => { clearTimeout(id); setArmed(false) }
  }, [action, skipArmingDelay])

  /* ONE DECISION, ONE ACKNOWLEDGEMENT, ONE DISPATCH. Switching close->open or
     closing and reopening the sheet clears the tick and the countdown, for the
     same reason the arming delay re-arms: a user who ticked "412 valves at
     320 Summit Blvd" has not agreed to anything about the next decision. */
  useEffect(() => {
    if (!action) return undefined
    return () => {
      setAcked(false)
      setHoldLeft(null)
      dispatchedRef.current = false
    }
  }, [action])

  /* INITIAL FOCUS ON THE HEADING, NEVER ON THE COMMIT BUTTON. SLDS states it
     flatly — "Do not focus the cursor on the action button" — and Primer puts
     initial focus on Cancel for a danger dialog. The heading is one step
     better than Cancel: a screen reader starts at the blast radius rather than
     at a verdict, and a Space or Enter arriving from the opening control has
     nothing to activate. */
  useEffect(() => {
    if (!action) return undefined
    headingRef.current?.focus()
    return undefined
  }, [action])

  /* THE CANCEL WINDOW (WCAG G164). Dispatch happens HERE, at zero, not on the
     commit click. Deps are `[holdLeft]` only — see the `latest` note above. */
  useEffect(() => {
    if (holdLeft === null) return undefined
    latest.current.onHoldTick?.(holdLeft)
    if (holdLeft > 0) {
      const id = setTimeout(() => setHoldLeft((n) => (n === null ? null : n - 1)), 1000)
      return () => clearTimeout(id)
    }
    if (!dispatchedRef.current) {
      dispatchedRef.current = true
      latest.current.onConfirm?.()
    }
    return undefined
  }, [holdLeft])

  /* When the hold starts, the one control that matters is Stop. Putting the
     caret on it also means a stray Enter arriving mid-countdown ABORTS rather
     than commits, which is the right way for an ambiguous keypress to fail. */
  useEffect(() => {
    if (!holding) return undefined
    stopRef.current?.focus()
    return undefined
  }, [holding])

  /* `skipArmingDelay` is read here, not written into state, so flipping it
     cannot leave a stale armed flag behind. */
  const armedNow = skipArmingDelay || armed

  if (!action) return null

  const closing = action === 'close'
  const tier = tierFor(willActCount, scopeKind)
  /* `holdSeconds={0}` is a legitimate caller choice and means "no window". */
  const holdWindow = Math.max(0, Math.round(holdSeconds ?? HOLD_SECONDS[tier]))
  const needsAck = tier === 'large'

  /* THE TAB TRAP. Half of what makes `aria-modal="true"` true — see the
     footnote in the header for the half this component cannot reach. Scoped to
     the sheet's own subtree via onKeyDown rather than a window listener, so it
     cannot interfere with anything outside it. */
  const onSheetKeyDown = (e) => {
    if (e.key !== 'Tab') return
    const root = sheetRef.current
    if (!root) return
    const focusable = Array.from(
      root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
    ).filter((n) => !n.hasAttribute('disabled') && n.getAttribute('aria-hidden') !== 'true')
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || !root.contains(active))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  /* NEW COPY — awaiting owner approval. Names the PHYSICAL act, not the
     software one: the user is not "running a bulk command", they are stopping
     or starting water in a building. */
  const title = closing ? 'Close water supply' : 'Open water supply'

  /* NEW COPY. The scope label is always shown, and this second line says how
     wide it reaches — "320 Summit Blvd" alone does not tell you it means every
     system under it.

     THREE KINDS, NOT TWO. The first two sentences are true of
     `ValveManagementCard`, which acts over a WHOLE SCOPE. Neither is true of
     `ValveManagementScreen`, which acts over a SELECTION — usually a subset of
     the scope named on the line above. 'selection' is that fact stated where
     it belongs, phrased as the NEGATION of the other two so the three read as
     one family.

     NO 'fleet' KIND, deliberately. The fleet is genuinely one account's
     hierarchy in this dataset — every account is a child of Meridian Realty
     Group — so there is no fact 'fleet' would state that 'account' states
     wrongly. If a second top-level account lands in the data, it earns one.

     BACKWARDS COMPATIBLE BY CONSTRUCTION: 'location' and 'account' return what
     they returned before, the default is still 'location', and an unknown
     value still falls through to the location sentence rather than rendering
     nothing. */
  const scopeLine =
    scopeKind === 'selection'
      ? 'Only the systems you selected — not every system here'
      : scopeKind === 'account'
        ? 'Every system in this account'
        : 'Every system at this location'

  /* NEW COPY. This label is bound to willActCount and to nothing else. */
  const actLabel = closing
    ? plural(willActCount, 'valve will close', 'valves will close')
    : plural(willActCount, 'valve will open', 'valves will open')
  /* NEW COPY — the water consequence, in the user's units. This string is the
     sheet's `aria-describedby` target: a screen reader hears the blast radius
     before it reaches any button. */
  const actConsequence = closing
    ? 'Water stops in these areas.'
    : 'Water starts flowing again in these areas.'

  /* NEW COPY, all five. Each says what happens to the WATER there, and none of
     them promises a later retry: nothing queues these. */
  const offlineConsequence = closing
    ? 'Can’t reach these. Their valves stay as they are, and water keeps running there.'
    : 'Can’t reach these. Their valves stay as they are, and water does not come back there.'
  const noValveConsequence = 'Water here is not controlled by a valve.'
  const faultedConsequence = 'These may not move. Treat their water as unchanged.'
  /* NEW COPY — net-new even by this file's standards: nothing in the product
     has worded the bulk case of a valve mid-transition before. The LABEL is
     the designer's own line for the state, Figma board 199535:96542 drawing it
     verbatim as `Verifying closure (allow a few min)` — so "verifying
     closure", never "in transit", "pending" or "closing now". */
  const closingConsequence = closing
    ? 'These are already closing. Water is stopping there — allow a few min.'
    : 'These are already closing. Water there is stopping, and this will not bring it back.'
  const alreadyConsequence = closing
    ? 'Water is already off there.'
    : 'Water is already running there.'

  /* NEW COPY. Named by OUTCOME and carrying the count, which is also what
     makes the button text different on every invocation. */
  const confirmLabel = closing
    ? `Close ${willActCount} ${plural(willActCount, 'valve', 'valves')}`
    : `Open ${willActCount} ${plural(willActCount, 'valve', 'valves')}`

  /* NEW COPY — THE TOP-TIER GATE. The varying quantity and the scope are
     rendered INSIDE the tappable row, which is the property Bravo-Lillo found
     survives habituation. It states only what this component actually knows:
     the valve count and the caller's own scope label. It does NOT invent a
     building count, a tenant count or an occupancy — none of those reach this
     sheet, and a fabricated number on the acknowledgement row would be the
     exact failure the sheet exists to prevent. */
  const ackLabel = closing
    ? `I understand this stops water at ${willActCount} ${plural(willActCount, 'valve', 'valves')} — ${scopeLabel}`
    : `I understand this starts water at ${willActCount} ${plural(willActCount, 'valve', 'valves')} — ${scopeLabel}`

  /* NEW COPY — THE CANCEL WINDOW. "Stop" is named for the act rather than for
     the outcome, against the rule the commit button follows, and deliberately:
     an abort has to be one word the thumb finds without reading, and both
     Primer and SLDS keep the escape on a danger dialog short. The outcome is
     on the line beneath it instead. */
  const stopLabel = `Stop — don’t ${closing ? 'close' : 'open'}`
  const holdBody = closing
    ? 'Nothing has reached the valves yet. Stop now and the water stays on.'
    : 'Nothing has reached the valves yet. Stop now and the water stays off.'
  /* NEW COPY — the IEC 61850 honesty note, in the user's words. `sent` is the
     furthest this product can truthfully go: there is no command-termination
     channel, so the app never learns that a valve REACHED the commanded
     state. See the header. */
  const sentHeadline = `Sent to ${willActCount} ${plural(willActCount, 'valve', 'valves')}`
  const sentBody = `Sent is not the same as ${closing ? 'closed' : 'open'} — check each valve’s state in the list.`
  /* One stable sentence for assistive tech, so the live region does not
     announce a new number every second. */
  const holdAnnounce = holding && holdLeft > 0
    ? `${confirmLabel} in ${holdWindow} seconds. Press Stop to cancel.`
    : sentHeadline

  const offlineCount = offlineSystems.length

  /* THE FOUR REMAINING BUCKETS, as data. Offline is promoted out of this list
     to its own line under the headline (note 5) and is NOT repeated here. */
  const exclusions = []
  if (noValveCount > 0) {
    exclusions.push({
      key: 'no-valve',
      count: noValveCount,
      /* Figma's own state word: "No valve installed", not "No valve". */
      label: plural(noValveCount, 'has no valve installed', 'have no valve installed'),
      consequence: noValveConsequence,
    })
  }
  if (faultedCount > 0) {
    exclusions.push({
      key: 'faulted',
      count: faultedCount,
      /* Figma's own state word: "Valve Error", not "Fault". */
      label: plural(faultedCount, 'is in Valve Error', 'are in Valve Error'),
      consequence: faultedConsequence,
    })
  }
  if (closingCount > 0) {
    exclusions.push({
      key: 'closing',
      count: closingCount,
      label: plural(closingCount, 'is verifying closure', 'are verifying closure'),
      consequence: closingConsequence,
    })
  }
  if (alreadyInStateCount > 0) {
    exclusions.push({
      key: 'already',
      count: alreadyInStateCount,
      /* Figma's state words again: "Closed" / "Open". */
      label: closing
        ? plural(alreadyInStateCount, 'is already Closed', 'are already Closed')
        : plural(alreadyInStateCount, 'is already Open', 'are already Open'),
      consequence: alreadyConsequence,
    })
  }
  /* A confirmation that always shows empty buckets is noise, and noise is what
     habituation feeds on. No exclusions, no section. */
  const hasExclusions = exclusions.length > 0

  const canCommit = armedNow && !busy && (!needsAck || acked)

  const startHold = () => {
    if (!canCommit || holding) return
    if (skipHold || holdWindow === 0) {
      if (dispatchedRef.current) return
      dispatchedRef.current = true
      latest.current.onConfirm?.()
      return
    }
    latest.current.onHoldStart?.({ action, willActCount, seconds: holdWindow })
    setHoldLeft(holdWindow)
  }

  const stopHold = () => {
    setHoldLeft(null)
    latest.current.onHoldStop?.()
  }

  return (
    <div
      ref={sheetRef}
      className="absolute inset-0 z-50 flex flex-col justify-end"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={consequenceId}
      onKeyDown={onSheetKeyDown}
    >
      <style>{SHEET_CSS}</style>

      {/* Scrim. A tap outside is a Cancel — this action never commits by
          accident. MID-HOLD it stops the dispatch instead of dismissing: the
          same rule as Escape, do the safest available thing. The label stays
          "Cancel" either way, because that is what the gesture means to the
          user in both states. */}
      <button
        type="button"
        aria-label="Cancel"
        onClick={holding ? stopHold : onCancel}
        className="absolute inset-0 cursor-default bg-foreground/45"
      />

      <div className="relative flex max-h-full flex-col overflow-y-auto rounded-t-2xl bg-surface-card px-5 pb-6 pt-3">
        {/* The grab handle. A PLAIN DIV: this used to be a <Separator> bent
            into shape with `data-[orientation=horizontal]:h-[4px]` and
            `:w-[36px]`, which gave a decorative bar the semantics of a
            structural divider and two overrides to suppress its own sizing.
            A handle is not a separator. */}
        <div aria-hidden="true" className="mx-auto mb-4 h-1 w-9 shrink-0 rounded-full bg-border" />

        {/* ── Header: the act, then the scope ─────────────────────────────── */}
        <h2 id={titleId} ref={headingRef} tabIndex={-1} className={`font-sans outline-none ${TITLE}`}>
          {title}
        </h2>
        <p className="mt-1 font-sans text-sm font-medium leading-snug text-foreground">
          {scopeLabel}
        </p>
        <p className={`font-sans ${BODY} mt-1`}>{scopeLine}</p>

        <Separator className="my-4 shrink-0" />

        {/* ── What will actually be attempted ─────────────────────────────── */}
        <div className="flex items-baseline gap-2">
          <span className={`font-sans ${COUNT_BIG}`}>{willActCount}</span>
          <span className="font-sans text-base font-semibold leading-snug text-foreground">
            {actLabel}
          </span>
        </div>
        <p id={consequenceId} className={`font-sans ${BODY} mt-1`}>
          {actConsequence}
        </p>

        {/* ── Offline, promoted: the owner's hard requirement, adjacent to the
            headline rather than fifth down a list. The headline and the button
            count ONLY eligible valves; this line is the distinct, adjacent
            statement of what is not in that number. Nothing queues these. */}
        {offlineCount > 0 && (
          <div className="mt-3 rounded-xl border border-border-strong px-3 py-2">
            <button
              type="button"
              onClick={() => setOfflineOpen((v) => !v)}
              aria-expanded={offlineOpen}
              className="flex w-full items-baseline gap-2 text-left"
            >
              <span className={`font-sans ${COUNT_ROW} shrink-0`}>{offlineCount}</span>
              {/* NEW COPY, on the product's own word (en.json `offline`). */}
              <span className={`font-sans ${ROW_LABEL}`}>
                {plural(offlineCount, 'system is offline', 'systems are offline')}
              </span>
              <span className={`font-sans ${BODY} flex-1`}>— will not be affected</span>
              <ChevronDown
                aria-hidden="true"
                className={`size-4 shrink-0 self-center text-muted-foreground transition-transform motion-reduce:transition-none ${
                  offlineOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            <p className={`font-sans ${BODY} mt-1`}>{offlineConsequence}</p>
            {/* THE NAMES, not only the count: a count alone lets the user
                assume the offline ones are unimportant. Capped in HEIGHT
                rather than in rows — on an account action this can be dozens,
                and truncating the list would recreate exactly the wrong belief
                this sheet exists to prevent. The house <Card> replaces what
                was a hand-rolled one (border + radius + padding), and brings
                `bg-card` with it, which reads as an inset panel against the
                sheet's `--surface-card` ground in all four themes. */}
            {offlineOpen && (
              <Card className="mt-2 gap-0 rounded-xl border-border py-2 shadow-none">
                <ul className="max-h-32 overflow-y-auto px-3">
                  {offlineSystems.map((s) => (
                    <li
                      key={s.id ?? s.name}
                      className="flex items-baseline justify-between gap-2 py-0.5 font-sans"
                    >
                      {/* `lastSeenLabel` is rendered VERBATIM after the dot —
                          the caller owns its wording, e.g. "Last seen 3h ago".
                          NEW COPY only in the fallback. Name and last-seen stay
                          in ONE element: they are one fact about one system. */}
                      <span className={`${BODY} min-w-0 flex-1 text-foreground`}>
                        {s.name} · {s.lastSeenLabel || 'Offline'}
                      </span>
                      {/* OPTIONAL, and off by default. When the caller supplies
                          a `categoryKey` the row also shows the LAST KNOWN
                          valve state at `certainty="last-known"`, which is the
                          case `ValveStateReadout` was built for — see its API
                          note. Absent the prop nothing is drawn, because
                          guessing a state for a device we cannot reach is the
                          one thing this sheet must never do. */}
                      {s.categoryKey && (
                        <ValveStateReadout
                          categoryKey={s.categoryKey}
                          certainty="last-known"
                          className="shrink-0 text-xs"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {/* ── Everything else that will NOT move ──────────────────────────
            These sit between the user and the commit button in DOM order as
            well as on screen, and tests pin it, so they cannot be moved below
            the button silently. ONE ROW EACH — the five three-line blocks are
            gone, the five facts are not. */}
        {hasExclusions && (
          <>
            <Separator className="my-4 shrink-0" />
            {/* NEW COPY. "Not included" states the fact; it does not apologise
                for it and does not hint at a retry. */}
            <h3 className={`font-sans ${EYEBROW}`}>Not included</h3>
            <ul className="mt-2">
              {exclusions.map((b) => (
                <ExclusionRow
                  key={b.key}
                  count={b.count}
                  label={b.label}
                  consequence={b.consequence}
                />
              ))}
            </ul>
          </>
        )}

        {/* ── The top-tier gate ───────────────────────────────────────────
            A <label> around a Radix checkbox: `<button>` is a labelable
            element, so `htmlFor` both names the control and forwards the tap
            from anywhere in the row — a 393px-wide target instead of an 18px
            one, with no click handler of our own to go wrong. */}
        {needsAck && (
          <label
            htmlFor={ackId}
            className="mt-4 flex shrink-0 cursor-pointer items-start gap-3 rounded-xl border border-border-strong bg-card p-3"
          >
            <Checkbox
              id={ackId}
              checked={acked}
              onCheckedChange={(v) => setAcked(v === true)}
              className="mt-0.5"
            />
            <span className="font-sans text-sm font-medium leading-snug text-foreground">
              {ackLabel}
            </span>
          </label>
        )}

        {/* ── Commit, or the cancel window ─────────────────────────────────
            `destructive` for close: the design system expresses danger purely
            through the variant (Figma component set 6716:46634). Opening is
            NOT destructive — it resumes flow — so it takes the default
            variant. RED IS NEVER THE ONLY CARRIER: the count, the outcome verb
            and the exclusion rows all say it in words. */}
        {holding ? (
          <div className="mt-5 shrink-0 rounded-xl border border-border-strong bg-card p-4">
            <p className="sr-only" aria-live="assertive">{holdAnnounce}</p>
            <p
              aria-hidden="true"
              className="font-sans text-base font-semibold leading-snug text-foreground"
            >
              {holdLeft > 0 ? `${confirmLabel} in ${holdLeft}s` : sentHeadline}
            </p>
            <p aria-hidden="true" className={`font-sans ${BODY} mt-1`}>
              {holdLeft > 0 ? holdBody : sentBody}
            </p>
            {holdLeft > 0 && (
              <>
                <div
                  aria-hidden="true"
                  className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-border"
                >
                  <div
                    className="h-full bg-muted-foreground transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
                    style={{ width: `${holdWindow > 0 ? (holdLeft / holdWindow) * 100 : 0}%` }}
                  />
                </div>
                <Button
                  ref={stopRef}
                  type="button"
                  variant="default"
                  onClick={stopHold}
                  className="mt-3 h-12 w-full shrink-0 rounded-xl text-base font-semibold"
                >
                  {stopLabel}
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <Button
              type="button"
              variant={closing ? 'destructive' : 'default'}
              onClick={startHold}
              disabled={!canCommit}
              className="mt-5 h-12 w-full shrink-0 rounded-xl text-base font-semibold"
            >
              {confirmLabel}
            </Button>

            {!armedNow && (
              <>
                <div
                  aria-hidden="true"
                  className="mt-2 h-0.5 w-full shrink-0 overflow-hidden rounded-full bg-border"
                >
                  <div className="bvcs-arm h-full bg-muted-foreground" />
                </div>
                {/* NEW COPY. A disabled button with no explanation reads as
                    broken; this says the wait is deliberate without nagging. */}
                <p className={`font-sans ${BODY} mt-2 text-center`}>
                  Take a moment to check what this covers.
                </p>
              </>
            )}

            {needsAck && !acked && armedNow && (
              /* NEW COPY. The same rule as the arming bar: an inert primary
                 with no stated reason reads as a broken app, and a user who
                 cannot see why will tap it repeatedly. */
              <p className={`font-sans ${BODY} mt-2 text-center`}>
                Tick the box above to enable this.
              </p>
            )}

            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              className="mt-2 h-11 w-full shrink-0 rounded-xl text-base font-semibold"
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
