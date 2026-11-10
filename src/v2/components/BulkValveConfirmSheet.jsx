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
 * ⚠ SUPERSEDED 2026-11-03 BY NOTE 12. THE CANCEL WINDOW THIS NOTE ARGUES FOR
 * NO LONGER EXISTS: the owner rejected it twice, in both directions and at
 * both sizes, and it is gone at every tier. The argument is kept verbatim
 * below because it is the reasoning that put the window there, and anyone
 * proposing to bring it back should read note 12 first - the removal costs no
 * conformance, and it was the weakest of the three mechanisms by the same
 * literature this note cites. WHAT THIS NOTE SAYS ABOUT RECOVERABILITY IS NOW
 * FALSE: the commands DO leave the instant the button is pressed.
 *
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
 * (Historical, and no longer true: the commit button used to START THE HOLD
 * rather than dispatch. It dispatches now - see note 12 and THE CONTRACT.)
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
 * AMENDED 2026-11-03, TWICE, see notes 11 and 12. THE WINDOW COLUMN NO LONGER
 * EXISTS AT ANY TIER - the owner rejected the cancel window outright. What the
 * ladder still decides is the ACKNOWLEDGEMENT: `large` forces it, the other
 * two do not. The deliberateness that the window was partly standing in for is
 * now carried by slide-to-arm plus press-to-commit (note 11).
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
 * ══ THE 2026-11-03 ADDITION ─ SLIDE TO CONFIRM ════════════════
 * The owner, verbatim: "I want to add to the bulk operations kind of
 * confirmation like the puzzle Lego that user needs to slide to make sure user
 * do it when he's aware of what he's doing and not just click something in his
 * pocket."
 *
 * ── 7. THE SLIDE IS THE COMMIT. THE COUNTDOWN IS NOT REPLACED ──────
 * `<SlideToConfirm>` takes over the job of STARTING the dispatch. The commit
 * button no longer does it alone. The two controls do different jobs and both
 * are kept where they are warranted: THE SLIDE IS DELIBERATE COMMIT, THE
 * COUNTDOWN IS RECOVERY. The sequence is slide (or tick + press) -> countdown
 * where there is one -> dispatch.
 *
 * NOT A PUZZLE / JIGSAW SLIDER. The owner floated the CAPTCHA-style variant
 * and it was rejected on the merits: a puzzle tests perception and dexterity -
 * it proves you are not a bot - and proves nothing about whether the user
 * understood that 412 valves are about to close. It also adds a motor barrier
 * for tremor, switch and voice users and a cognitive one for everybody, for no
 * benefit here. The control is a plain linear slide.
 *
 * WHAT IT FIXES AND WHAT IT DOES NOT, honestly. Bravo-Lillo et al. (SOUPS,
 * "Harder to ignore?") found that attractors which merely DELAYED dismissal
 * did NOT survive habituation; the only ones that did were those forcing
 * interaction with THE FIELD CONTAINING THE CHANGED INFORMATION. A slider is
 * the same slider every time - invariant content - so it is PHYSICAL FRICTION,
 * NOT ATTENTION. It addresses the owner's stated failure mode, the accidental
 * actuation and the pocket tap. IT DOES NOT ADDRESS HABITUATED-BUT-DELIBERATE
 * CONFIRMATION. The acknowledgement checkbox, which restates the varying
 * count, is the control that does that, and the slider's arrival is NOT a
 * reason to weaken or remove it. The one cheap nod: the track carries the act
 * and the count ("Slide to close 412 valves"), never a generic "Confirm".
 *
 * NO CONTROLLED STUDY was found showing slide-to-confirm reduces real-world
 * errors. Google Play is reported to be adding a swipe-to-confirm step against
 * accidental purchases - that is intent, not evidence. Say so to the owner
 * rather than implying the pattern is proven.
 *
 * ── 8. WCAG SC 2.5.7 IS SATISFIED BY THE CHECKBOX, NOT BY THE SLIDE ─
 * SC 2.5.7 Dragging Movements (Level AA): "All functionality that uses a
 * dragging movement for operation can be achieved by a single pointer without
 * dragging, unless dragging is essential..." Failure F108: "The failure occurs
 * when there is no alternative single pointer input available to actuate the
 * function." A slide-to-confirm CAN be replaced by taps, so it is NOT
 * essential, so A SLIDE-ONLY COMMIT WOULD BE AN F108 FAILURE AT LEVEL AA.
 *
 * THE ALTERNATIVE IS THE ACKNOWLEDGEMENT CHECKBOX PLUS THE COMMIT BUTTON,
 * AVAILABLE AT EVERY TIER. Two deliberate single-pointer acts, no drag, and
 * F108 explicitly permits it: "The alternative may involve a series of single
 * pointer interactions." A SINGLE TAP WOULD NOT DO - it satisfies the letter
 * of 2.5.7 and destroys the feature, whose whole purpose is to defeat one
 * careless tap. SO THE COMMIT BUTTON IS INERT UNTIL THE BOX IS TICKED AT
 * EVERY TIER, not only at the top one. That is a behaviour change and the
 * tests were re-expressed, not deleted. Where that pair LIVES changed again
 * the same day - see note 10.
 *
 * Keyboard support exists on the slider and does NOT discharge 2.5.7 - W3C is
 * explicit that "achieving keyboard equivalence for a dragging operation does
 * not automatically meet this success criterion". It is there because it is
 * right. The slider also stays out of SC 2.5.1 Pointer Gestures (Level A) by
 * using `setPointerCapture` and never reading `clientY`; see SlideToConfirm.jsx
 * for the quotations. Nothing fires on the down-event (SC 2.5.2).
 *
 * THE ARMING DELAY IS GONE ON THE SLIDE PATH ONLY. Its job is input hygiene
 * against the second half of a double-tap, and a drag cannot be the second
 * half of a double-tap. It is unchanged on the tap path, which is still a tap.
 *
 * ── 10. THE SLIDE IS THE ONLY ADVERTISED PATH ───────────────
 * The owner, 2026-11-03, looking at the open sheet and at the line this sheet
 * used to print under the slider ("A slide is not necessary. Tick the box
 * below. Then press the button."): "Why slide is not necessary? It should be
 * necessary and this is the only way we are allowing the open three valves to
 * be enabled."
 *
 * He is right, and that sentence was self-defeating: it told every user not to
 * bother with the control we had just built. IT IS DELETED. The acknowledgement
 * row and the commit button are OUT OF THE DEFAULT VISUAL FLOW. A sighted
 * pointer user is offered the slide and nothing else.
 *
 * THE ALTERNATIVE IS NOT DELETED, AND MUST NOT BE. It is SC 2.5.7 at Level AA,
 * and KEYBOARD OPERATION OF THE SLIDER DOES NOT DISCHARGE IT - W3C: "achieving
 * keyboard equivalence for a dragging operation does not automatically meet
 * this success criterion." The alternative has to be POINTER-operable without
 * dragging. So it is kept and merely stops being advertised: a quiet,
 * low-emphasis `Cannot slide?` disclosure under the slider reveals the
 * tick-then-press path on demand. Not shown by default, not presented as an
 * equal option, reachable by anyone who needs it, and a 44px target because
 * the person it exists for has a motor impairment.
 *
 * DISCOVERABLE WITHOUT SIGHT. The slider's `aria-describedby` still names the
 * alternative in words; the sentence is now `sr-only`, which is exactly the
 * split the owner asked for - reach the people who need it, stop telling
 * everybody else the control is optional.
 *
 * THE CHECKBOX AND THE SLIDE ARE NOT REDUNDANT, AND THE MARKUP SAYS SO. There
 * is ONE acknowledgement row and it appears in ONE place at a time:
 *   - top tier (>100 or account): VISIBLE, above the slider, where it GATES
 *     the slide. It is the anti-habituation control - forced interaction with
 *     the varying count - and that is a different job from the slide's
 *     physical friction against an accidental actuation. Unchanged.
 *   - below the top tier: INSIDE the escape hatch, where it is the first of
 *     the two single-pointer acts that make up the non-drag alternative.
 * The two never sit on screen as a pair of equivalent ways in.
 *
 * THE ARMING BAR MOVED WITH THE BUTTON. It only ever guarded the tap, so it
 * now lives inside the escape hatch too. That also reclaims the ~10px of
 * scroll that was pushing Cancel below the fold at the largest selections.
 *
 * ── 11. THE SLIDE ARMS. THE BUTTON COMMITS. ────────────────
 * The owner, 2026-11-03, on the close sheet at 79 valves: "sliding shall be
 * confirmation before the user can click on the close button."
 *
 * THE SLIDE NO LONGER DISPATCHES. It ARMS, and the button commits:
 *
 *     slide to arm   ->   press the button   ->   dispatch
 *
 * THIS IS TIDIER THAN WHAT IT REPLACES, and that is the real reason to welcome
 * it rather than merely obey it. There used to be TWO independent commit paths
 * - the slide dispatched, and tick-then-press dispatched. Now there is ONE
 * COMMIT CONTROL reachable by TWO ARMING GESTURES:
 *
 *   slide past 90% and release            -> arms `slideArmed`
 *   `Cannot slide?` -> tick the box       -> arms `armedByTap`
 *
 * One press then dispatches, whichever way it was armed. A short drag springs
 * back and arms nothing. Nothing fires on the down-event, so there is no route
 * at all from a single pointer-down to water moving.
 *
 * THE TICK ONLY ARMS FROM INSIDE THE HATCH (`armedByTap = escapeOpen && acked`)
 * and that asymmetry is deliberate. At the top tier the SAME checkbox is also
 * on screen as the gate on the slide; if a tick there armed the button, a
 * sighted user could reach the dispatch without ever sliding, which is exactly
 * what the owner ruled out. Binding the arming half to the disclosure the user
 * deliberately opened keeps the slide mandatory on its own route and keeps the
 * non-drag route available to the people SC 2.5.7 exists for.
 *
 * A STALE ARM MUST NEVER SURVIVE A CHANGE TO WHAT IT WOULD ACT ON. The arm and
 * the acknowledgement are both dropped when `action`, `willActCount`,
 * `scopeLabel` or `scopeKind` changes - the decision is all four, not just the
 * direction. That reset lives in its own effect so that a count change cannot
 * also clear `dispatchedRef` mid-flight.
 *
 * ARMING IS REVERSIBLE: pressing the confirmed slider again disarms it, which
 * is the cheapest possible way back and is in the one place the user is
 * already looking. A press there can never commit anything.
 *
 * 2.5.7 IS UNCHANGED AND STILL SATISFIED, and it matters MORE now, not less:
 * the drag is mandatory on its own route, so the `Cannot slide?` disclosure is
 * the only pointer path for someone who cannot drag. It arms the same button
 * with presses and no drag at all. Keyboard operation of the slider still does
 * not discharge the criterion - W3C: "achieving keyboard equivalence for a
 * dragging operation does not automatically meet this success criterion."
 *
 * ── 12. THE CANCEL WINDOW IS GONE. ALL OF IT. ───────────────
 * The owner, 2026-11-03, screenshotting `Close 79 valves in 11s` with its Stop
 * button: "i dont want this step." That is the SECOND rejection - he rejected
 * it earlier the same day on a 3-valve OPEN, which is why it had already been
 * scoped to closes only. Two rejections across both directions and both sizes
 * is one instruction: THERE IS NO CANCEL-WINDOW STEP IN THIS FLOW.
 *
 * DELETED: the countdown panel, the ticking label, `Stop - do not close` /
 * `Stop - do not open`, the sr-only countdown announcement, the `HOLD_SECONDS`
 * ladder (8s / 15s / 20s), and the `holdSeconds`, `skipHold`, `onHoldStart`,
 * `onHoldTick` and `onHoldStop` props. No caller passed any of them - checked,
 * `ValveManagementScreen.jsx` passes none - so nothing outside this file moved.
 *
 * NOBODY SHOULD RESTORE IT THINKING IT WAS LOAD-BEARING. Three reasons:
 *
 *   1. IT COSTS NO CONFORMANCE. The window implemented WCAG technique G164 for
 *      SC 3.3.4 Error Prevention. G164 is a SUFFICIENT technique, not the only
 *      one: 3.3.4 is equally satisfied by its "Confirmed" bullet - a mechanism
 *      for reviewing and confirming before finalising - which is what this
 *      entire sheet is. SC 2.5.2 Pointer Cancellation is satisfied separately,
 *      by acting on the up-event and on a press, never on a down-event.
 *   2. IT WAS THE WEAKEST OF THE THREE MECHANISMS. Bravo-Lillo et al. found
 *      attractors that merely DELAYED dismissal did not survive habituation;
 *      only those forcing interaction with the changed content did. A timer is
 *      the delay kind. The slide-then-press and the acknowledgement are not.
 *   3. THE ACTION IS REVERSIBLE. A closed valve can be opened again. The
 *      window was never standing between the user and an irreversible act.
 *
 * ⚠ THE ONE REAL CONSEQUENCE, AND THE OWNER SHOULD OWN IT KNOWINGLY:
 * THERE IS NOW NO WINDOW BETWEEN THE PRESS AND THE DISPATCH. The commands go
 * immediately. Recovery is no longer "stop it before it leaves" - it is "open
 * the valves again", which is a FRESH DANGEROUS ACTION the user has to take,
 * on a building where the water has already stopped. That is a genuine
 * reduction in recoverability, traded for a flow the owner will actually use.
 * `dispatchedRef` therefore matters MORE than it did, not less: a double fire
 * now means water moving twice with nothing in between.
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
 * ══ THE CONTRACT, AS IT NOW STANDS ═══════════════════════
 * `onConfirm` MEANS DISPATCH NOW and fires SYNCHRONOUSLY on the commit press.
 * It fires EXACTLY ONCE per decision (`dispatchedRef`). There is nothing
 * between the press and the dispatch - see note 12.
 *
 * FIVE PROPS WERE REMOVED on 2026-11-03 with the cancel window: `holdSeconds`,
 * `skipHold`, `onHoldStart`, `onHoldTick` and `onHoldStop`. THIS IS A PUBLIC
 * CONTRACT CHANGE and it was taken rather than leaving them dormant, because a
 * prop that is accepted and ignored is a lie about what the component does.
 * No caller passed any of them, so no call site changed.
 *
 * The props that remain are the original ones plus `skipArmingDelay`, and the
 * current call site at `ValveManagementScreen.jsx` keeps working unmodified.
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
import SlideToConfirm from '@/v2/components/SlideToConfirm'
import { ValveStateReadout } from '@/v2/components/ValveStateReadout'

/* INPUT HYGIENE, NOT A COGNITIVE ATTRACTOR - see note 4 in the header. ~800ms
   is long enough that the second half of a double-tap on whatever control
   opened this sheet lands on a dead button, and short enough that a user who
   meant it barely registers it. It is now LARGELY REDUNDANT, because the
   commit button cannot be live until a deliberate arm has happened and no arm
   completes in 800ms - but it is cheap, it is mechanical rather than
   cognitive, and removing a working guard is not a thing to do casually.
   `prefers-reduced-motion` flattens the bar that draws it (see SHEET_CSS) but
   never shortens or removes the delay itself. `skipArmingDelay` is the only
   thing that does. */
const ARMING_DELAY_MS = 800

/* THE LADDER. Round numbers standing in for telemetry we do not have - NN/g:
   "The exact threshold should be set through user research." See note 2.
   ONLY `large` IS LOAD-BEARING NOW (note 11 deleted the cancel window that
   `small` and `medium` used to key): it is the tier that forces the
   acknowledgement. The three-step shape is kept because the thresholds are the
   product decision, not the mechanism they happen to drive today. */
const TIER_MEDIUM_MIN = 11
const TIER_LARGE_MIN = 101

/** `scopeKind === 'account'` is unbounded by construction, so it is top tier
    whatever the count says. A zero count cannot be a large action. */
function tierFor(willActCount, scopeKind) {
  if (willActCount <= 0) return 'small'
  if (willActCount >= TIER_LARGE_MIN || scopeKind === 'account') return 'large'
  if (willActCount >= TIER_MEDIUM_MIN) return 'medium'
  return 'small'
}

/* Scoped to this component rather than added to the global stylesheet - the
   house pattern at WaterEventFeedbackSheet.jsx:375. Under reduced motion the
   arming bar simply sits full-width and still: the button stays inert for the
   same 800ms either way. */
const SHEET_CSS = `
.bvcs-arm { animation: bvcs-arm ${ARMING_DELAY_MS}ms linear forwards; }
@keyframes bvcs-arm { from { width: 0%; } to { width: 100%; } }
@media (prefers-reduced-motion: reduce) {
  .bvcs-arm { animation: none; width: 100%; }
}
`

/* THE SHADCN SCALE, named once. Line-height LAST in each - twMerge drops a
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

/** `1,000`, never `1000`. docs/wint-format-standards.md, and the owner's own
    framing for this feature is "around 1000 valve". */
const num = (n) => Number(n).toLocaleString('en-US')

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
      <span className={`font-sans ${COUNT_ROW} shrink-0`}>{num(count)}</span>
      <p className="min-w-0 flex-1 font-sans">
        <span className={ROW_LABEL}>{label}</span>
        {' - '}
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
 *   onConfirm?: () => void,
 *   onCancel?: () => void,
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
  onConfirm,
  onCancel,
}) {
  const titleId = useId()
  const consequenceId = useId()
  const ackId = useId()
  const slideHintId = useId()
  const inertId = useId()

  /* The offline list starts OPEN. A count alone lets the user assume the
     offline ones are unimportant, and a closed-by-default disclosure is that
     same failure one tap away. The toggle exists to collapse a long list once
     it has been seen, not to hide it before. */
  const [offlineOpen, setOfflineOpen] = useState(true)
  const [armed, setArmed] = useState(false)
  const [acked, setAcked] = useState(false)
  /* THE SLIDE'S ARM. See note 11: the slide no longer dispatches, it ARMS the
     one commit button. The flag lives HERE, not inside SlideToConfirm, because
     this component owns the decision being armed and therefore owns dropping
     the arm when that decision changes. */
  const [slideArmed, setSlideArmed] = useState(false)
  /* DISPATCHED. The result panel outlives the press. */
  const [sent, setSent] = useState(false)
  /* THE ESCAPE HATCH, closed by default - see note 10. The non-drag path is
     REACHABLE, not ADVERTISED. */
  const [escapeOpen, setEscapeOpen] = useState(false)

  const headingRef = useRef(null)
  const sheetRef = useRef(null)
  /* DISPATCH EXACTLY ONCE PER DECISION. This matters MORE now than it ever
     did: with the cancel window gone (note 12) the commands leave on the press
     itself, so a double fire is water moving twice with nothing in between.
     Reset in the per-decision cleanup below. */
  const dispatchedRef = useRef(false)

  /* Escape. Radix gave this for free; an in-frame overlay has to say so itself
     (ValveConfirmSheet.jsx:70-76). */
  useEffect(() => {
    if (!action) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      onCancel?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [action, onCancel])

  /* Re-arms on every open, and on a switch between close and open - the delay
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

  /* ONE DECISION, ONE ACKNOWLEDGEMENT, ONE ARM, ONE DISPATCH. Switching
     close->open or closing and reopening the sheet clears everything, for the
     same reason the arming delay re-arms: a user who ticked "412 valves at
     320 Summit Blvd" has not agreed to anything about the next decision. */
  useEffect(() => {
    if (!action) return undefined
    return () => {
      setAcked(false)
      setSlideArmed(false)
      setSent(false)
      setEscapeOpen(false)
      dispatchedRef.current = false
    }
  }, [action])

  /* A STALE ARM MUST NEVER SURVIVE A CHANGE TO WHAT IT WOULD ACT ON. The
     decision is not only the direction: it is the direction, the count and the
     scope. If any of them moves under an armed slide, the arm is about a
     different act than the one the button would now perform, so both the arm
     and the acknowledgement are dropped. Separate from the effect above so a
     count change cannot also reset `dispatchedRef` mid-flight. */
  useEffect(() => {
    if (!action) return undefined
    return () => {
      setSlideArmed(false)
      setAcked(false)
    }
  }, [action, willActCount, scopeLabel, scopeKind])

  /* INITIAL FOCUS ON THE HEADING, NEVER ON THE COMMIT BUTTON. SLDS states it
     flatly - "Do not focus the cursor on the action button" - and Primer puts
     initial focus on Cancel for a danger dialog. The heading is one step
     better than Cancel: a screen reader starts at the blast radius rather than
     at a verdict, and a Space or Enter arriving from the opening control has
     nothing to activate. */
  useEffect(() => {
    if (!action) return undefined
    headingRef.current?.focus()
    return undefined
  }, [action])

  /* `skipArmingDelay` is read here, not written into state, so flipping it
     cannot leave a stale armed flag behind. */
  const armedNow = skipArmingDelay || armed

  if (!action) return null

  const closing = action === 'close'
  const tier = tierFor(willActCount, scopeKind)
  const needsAck = tier === 'large'

  /* THE TAB TRAP. Half of what makes `aria-modal="true"` true - see the
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

  /* NEW COPY - awaiting owner approval. Names the PHYSICAL act, not the
     software one: the user is not "running a bulk command", they are stopping
     or starting water in a building. */
  const title = closing ? 'Close water supply' : 'Open water supply'

  /* NEW COPY. The scope label is always shown, and this second line says how
     wide it reaches - "320 Summit Blvd" alone does not tell you it means every
     system under it.

     THREE KINDS, NOT TWO. The first two sentences are true of
     `ValveManagementCard`, which acts over a WHOLE SCOPE. Neither is true of
     `ValveManagementScreen`, which acts over a SELECTION - usually a subset of
     the scope named on the line above. 'selection' is that fact stated where
     it belongs, phrased as the NEGATION of the other two so the three read as
     one family.

     NO 'fleet' KIND, deliberately. The fleet is genuinely one account's
     hierarchy in this dataset - every account is a child of Meridian Realty
     Group - so there is no fact 'fleet' would state that 'account' states
     wrongly. If a second top-level account lands in the data, it earns one.

     BACKWARDS COMPATIBLE BY CONSTRUCTION: 'location' and 'account' return what
     they returned before, the default is still 'location', and an unknown
     value still falls through to the location sentence rather than rendering
     nothing. */
  const scopeLine =
    scopeKind === 'selection'
      ? 'Only the systems you selected - not every system here'
      : scopeKind === 'account'
        ? 'Every system in this account'
        : 'Every system at this location'

  /* NEW COPY. This label is bound to willActCount and to nothing else. */
  const actLabel = closing
    ? plural(willActCount, 'valve will close', 'valves will close')
    : plural(willActCount, 'valve will open', 'valves will open')
  /* NEW COPY - the water consequence, in the user's units. This string is the
     sheet's `aria-describedby` target: a screen reader hears the blast radius
     before it reaches any button. */
  const actConsequence = closing
    ? 'Water stops in these areas.'
    : 'Water starts flowing again in these areas.'

  /* NEW COPY, all five. Each says what happens to the WATER there, and none of
     them promises a later retry: nothing queues these. */
  const offlineConsequence = closing
    ? 'Cannot reach these. Their valves stay as they are, and water keeps running there.'
    : 'Cannot reach these. Their valves stay as they are, and water does not come back there.'
  const noValveConsequence = 'Water here is not controlled by a valve.'
  const faultedConsequence = 'These may not move. Treat their water as unchanged.'
  /* NEW COPY - net-new even by this file's standards: nothing in the product
     has worded the bulk case of a valve mid-transition before. The LABEL is
     the designer's own line for the state, Figma board 199535:96542 drawing it
     verbatim as `Verifying closure (allow a few min)` - so "verifying
     closure", never "in transit", "pending" or "closing now". */
  const closingConsequence = closing
    ? 'These are already closing. Water is stopping there. Allow a few min.'
    : 'These are already closing. Water there is stopping, and this will not bring it back.'
  const alreadyConsequence = closing
    ? 'Water is already off there.'
    : 'Water is already running there.'

  /* NEW COPY. Named by OUTCOME and carrying the count, which is also what
     makes the button text different on every invocation. THIS IS NOW THE ONE
     COMMIT CONTROL - both arming gestures lead to this single button.

     ⚠ THE WORD "Dangerously" - NEW COPY, 2026-11-10, AND THIS IS THE ONE
       SURFACE THAT CARRIES IT.

       WAS, UNTIL 2026-11-10:
         closing ? `Close ${num(willActCount)} ...` : `Open ${num(...)} ...`

       THE OWNER ASKED FOR IT FIRST: "Dangerously close X valves, dangerously
       open Y valves. I want the user to understand what they are doing is
       dangerous and affecting a lot of system, but still keep it very short
       and easy." The word therefore rides IN the label and not in a warning
       line - "very short and easy" rules out a sentence of explanation, and
       the blast-radius lines above this button already carry the facts.

       THEN HE PLACED IT, the same day, after seeing it on the page's
       selection strip as `Dangerously close 0 valves` beside `Dangerously
       open 3 valves`: "We don't need here the dangerously close ... only in
       the next step. When we only have one operation. Because here it looks
       very odd."

       SO THE RULE IS: THE WORD BELONGS WHERE THE COMMITMENT IS. This sheet
       shows exactly ONE operation, with a count that cannot be zero. The
       strip is a CHOOSER showing two mutually exclusive operations at once,
       one of them routinely disabled at 0, and the word reads as noise there.
       ⚠ DO NOT "restore consistency" by putting it back on
         `ValveManagementScreen`'s two buttons; that file records the same
         ruling from the other side.

       THE SLIDE LABEL BELOW DELIBERATELY DOES NOT TAKE THE WORD EITHER. It
       names a GESTURE that arms this button; it sends nothing. "Slide to
       dangerously close 8 valves" also makes a mouthful of the one control a
       user must physically complete (ASD-STE100 asks for 10 words or fewer in
       an instruction). Flagged for the owner rather than decided quietly.

       ASD-STE100 otherwise holds: active voice, one instruction, 4 words, no
       contraction. The adverb is the owner's own word, transcribed. */
  const confirmLabel = closing
    ? `Dangerously close ${num(willActCount)} ${plural(willActCount, 'valve', 'valves')}`
    : `Dangerously open ${num(willActCount)} ${plural(willActCount, 'valve', 'valves')}`

  /* NEW COPY - THE SLIDE. Named by OUTCOME and carrying the count, so the
     track is polymorphic rather than a generic "Confirm", and the handle
     physically travels ACROSS the number it is about to act on. */
  const slideLabel = closing
    ? `Slide to close ${num(willActCount)} ${plural(willActCount, 'valve', 'valves')}`
    : `Slide to open ${num(willActCount)} ${plural(willActCount, 'valve', 'valves')}`

  /* NEW COPY - THE ARMED SLIDE. It is the accessible name of the control in
     its armed state, and it is the next instruction rather than a status word:
     "Confirmed" or "Done" would both be read as something having happened to
     the valves, which is exactly the belief this sheet exists to prevent. */
  const slideArmedLabel = 'Slide accepted. Now press the button.'

  /* NEW COPY - THE 2.5.7 ALTERNATIVE, STATED IN WORDS AND NOT ON SCREEN.
     This sentence is the slider's `aria-describedby` target and it is
     `sr-only`: the alternative has to be DISCOVERABLE without sight, and it
     must not be ADVERTISED to everybody else (note 10). ASD-STE100: one
     instruction per sentence, no contractions, under 20 words.
     IT DELIBERATELY AVOIDS THE WORDS "Tick the box above": that exact
     sentence is the commit button's own inert-reason line, and two nodes
     carrying it would be two things saying one thing. */
  const slideHint = slideArmed
    ? 'To undo this slide, press it again.'
    : needsAck && !acked
      ? 'This slide is not enabled. Tick the acknowledgement box above.'
      : 'Slide the handle to the right end to enable the button. The Cannot slide button gives another way.'

  /* NEW COPY - THE QUIET ESCAPE HATCH. Low emphasis on purpose. The owner:
     the slide "should be necessary and this is the only way we are allowing
     the open three valves to be enabled", and the line this replaces
     ("A slide is not necessary...") told every user not to bother with the
     control. "Cannot", never "Can't": ASD-STE100 bans contractions here. */
  const escapeLabel = 'Cannot slide?'

  /* NEW COPY - WHAT THE DISCLOSURE REVEALS AT THE TOP TIER. Below the top tier
     it reveals the acknowledgement row itself. At the top tier that row is
     ALREADY on screen as the gate on the slide, so opening the disclosure
     would otherwise reveal nothing and read as a broken control. This states
     the one fact it actually changes: the same tick now also arms the button.
     It is a STATEMENT, not an instruction, so it reads the same whether or not
     the box is already ticked. It deliberately avoids the words "Tick the box
     above", which belong to the button's own inert-reason line. */
  const escapeNote = 'The box above also enables the button.'

  /* NEW COPY - THE TOP-TIER GATE. The varying quantity and the scope are
     rendered INSIDE the tappable row, which is the property Bravo-Lillo found
     survives habituation. It states only what this component actually knows:
     the valve count and the caller's own scope label. It does NOT invent a
     building count, a tenant count or an occupancy - none of those reach this
     sheet, and a fabricated number on the acknowledgement row would be the
     exact failure the sheet exists to prevent. */
  const ackLabel = closing
    ? `I understand this stops water at ${num(willActCount)} ${plural(willActCount, 'valve', 'valves')} - ${scopeLabel}`
    : `I understand this starts water at ${num(willActCount)} ${plural(willActCount, 'valve', 'valves')} - ${scopeLabel}`

  /* NEW COPY - the IEC 61850 honesty note, in the user's words. `sent` is the
     furthest this product can truthfully go: there is no command-termination
     channel, so the app never learns that a valve REACHED the commanded
     state. See the header. */
  const sentHeadline = `Sent to ${num(willActCount)} ${plural(willActCount, 'valve', 'valves')}`
  const sentBody = `Sent is not the same as ${closing ? 'closed' : 'open'}. Check each valve state in the list.`

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

  /* ══ ONE COMMIT CONTROL, TWO ARMING GESTURES ═══════════════════════════
     The slide arms it. The acknowledgement behind the escape hatch arms it.
     Pressing it is the dispatch, whichever way it was armed. See note 11.

     THE TICK ONLY ARMS FROM INSIDE THE HATCH. At the top tier the same
     checkbox is ALSO on screen as the gate on the slide, and a tick there must
     NOT be a way to reach the button without sliding - the owner: the slide
     "should be necessary and this is the only way". So the arming half of the
     checkbox is bound to the disclosure the user deliberately opened. */
  const canSlide = !busy && (!needsAck || acked)
  const armedByTap = escapeOpen && acked
  const commitArmed = slideArmed || armedByTap
  const canCommit = armedNow && !busy && commitArmed && (!needsAck || acked)

  /* ONE DISPATCH, WHATEVER REACHED IT, AND THE COMMANDS LEAVE IMMEDIATELY -
     there is no cancel window in front of them any more (note 12). */
  const dispatchNow = () => {
    if (dispatchedRef.current) return
    dispatchedRef.current = true
    setSent(true)
    onConfirm?.()
  }

  const onTapCommit = () => {
    if (!canCommit) return
    dispatchNow()
  }

  /* NEW COPY - WHY THE ONE COMMIT CONTROL IS INERT. An inert primary with no
     stated reason reads as a broken app, and a user who cannot see why will
     press it repeatedly. The reason is a real paragraph rather than a longer
     accessible NAME, so the button keeps the outcome-named label every other
     surface and test queries it by, and the reason still reaches assistive
     tech through `aria-describedby`. */
  const inertReason =
    canCommit || busy || !armedNow
      ? null
      : (needsAck || escapeOpen) && !acked
        ? 'Tick the box above to enable this.'
        : 'Slide above to enable this.'

  /* ONE ACKNOWLEDGEMENT ROW, TWO JOBS, NEVER BOTH AT ONCE. At the top tier it
     is the forced interaction with the VARYING content (Bravo-Lillo), it is
     visible by default and it GATES THE SLIDE. Below the top tier it is the
     first of the two single-pointer acts that make up the SC 2.5.7
     alternative, and it lives inside the escape hatch. It is declared here so
     the markup cannot drift between the two sites.
     A <label> around a Radix checkbox: `<button>` is a labelable element, so
     `htmlFor` both names the control and forwards the tap from anywhere in the
     row - a 393px-wide target instead of an 18px one, with no click handler of
     our own to go wrong. */
  const ackRow = (
    <label
      htmlFor={ackId}
      className="mt-3 flex shrink-0 cursor-pointer items-start gap-3 rounded-xl border border-border-strong bg-card p-3"
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
  )

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

      {/* Scrim. A tap outside is a Cancel - this action never commits by
          accident. */}
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
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
          <span className={`font-sans ${COUNT_BIG}`}>{num(willActCount)}</span>
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
              <span className={`font-sans ${COUNT_ROW} shrink-0`}>{num(offlineCount)}</span>
              {/* NEW COPY, on the product's own word (en.json `offline`). */}
              <span className={`font-sans ${ROW_LABEL}`}>
                {plural(offlineCount, 'system is offline', 'systems are offline')}
              </span>
              <span className={`font-sans ${BODY} flex-1`}>- will not be affected</span>
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
                rather than in rows - on an account action this can be dozens,
                and truncating the list would recreate exactly the wrong belief
                this sheet exists to prevent. */}
            {offlineOpen && (
              <Card className="mt-2 gap-0 rounded-xl border-border py-2 shadow-none">
                <ul className="max-h-32 overflow-y-auto px-3">
                  {offlineSystems.map((s) => (
                    <li
                      key={s.id ?? s.name}
                      className="flex items-baseline justify-between gap-2 py-0.5 font-sans"
                    >
                      {/* `lastSeenLabel` is rendered VERBATIM after the dot -
                          the caller owns its wording, e.g. "Last seen 3h ago".
                          NEW COPY only in the fallback. Name and last-seen stay
                          in ONE element: they are one fact about one system. */}
                      <span className={`${BODY} min-w-0 flex-1 text-foreground`}>
                        {s.name} · {s.lastSeenLabel || 'Offline'}
                      </span>
                      {/* OPTIONAL, and off by default. When the caller supplies
                          a `categoryKey` the row also shows the LAST KNOWN
                          valve state at `certainty="last-known"`. Absent the
                          prop nothing is drawn, because guessing a state for a
                          device we cannot reach is the one thing this sheet
                          must never do. */}
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
            the button silently. ONE ROW EACH. */}
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

        {sent ? (
          /* THE RESULT. There is no cancel window in front of it any more, so
             this is the first thing the user sees after the press. IEC 61850
             honesty: `sent`, never `closed`. */
          <div className="mt-5 shrink-0 rounded-xl border border-border-strong bg-card p-4">
            <p className="sr-only" aria-live="assertive">{sentHeadline}</p>
            <p
              aria-hidden="true"
              className="font-sans text-base font-semibold leading-snug text-foreground"
            >
              {sentHeadline}
            </p>
            <p aria-hidden="true" className={`font-sans ${BODY} mt-1`}>{sentBody}</p>
          </div>
        ) : (
          <>
            {/* THE TOP-TIER GATE SITS ABOVE THE SLIDE, because here the tick
                GATES the slide rather than standing in for it. Below the top
                tier the same row is part of the escape hatch instead, and it
                is rendered there - ONE checkbox, one sentence, one place, so
                the two controls never read as a pair of equivalent options. */}
            {needsAck && ackRow}

            {/* ── THE SLIDE: IT ARMS, IT DOES NOT COMMIT ──────────────────
                The owner: "sliding shall be confirmation before the user can
                click on the close button." `destructive` for close and
                `primary` for open, matching the button variants exactly:
                opening is not a destructive act. */}
            <SlideToConfirm
              label={slideLabel}
              armedLabel={slideArmedLabel}
              armed={slideArmed}
              tone={closing ? 'destructive' : 'primary'}
              disabled={!canSlide}
              hintId={slideHintId}
              onArm={() => setSlideArmed(true)}
              onDisarm={() => setSlideArmed(false)}
            />

            {/* THE NON-DRAG PATH, NAMED, AND NOT ON SCREEN. WCAG SC 2.5.7 is
                satisfied by the acknowledgement row behind the escape hatch -
                but a path nobody can find is not an alternative, and a
                screen-reader user never sees the track. `sr-only`, so it
                reaches the people who need it without telling everybody else
                that the slide is optional. */}
            <p id={slideHintId} className="sr-only">{slideHint}</p>

            {/* ── THE ESCAPE HATCH ────────────────────────────────────────
                QUIET, NOT HIDDEN, AND NOT OPTIONAL TO SHIP. SC 2.5.7 is Level
                AA and F108 wants "an alternative single pointer input
                available to actuate the function"; keyboard operation does
                NOT discharge it (W3C: "achieving keyboard equivalence for a
                dragging operation does not automatically meet this success
                criterion"), so this has to be POINTER-operable without a drag.
                THE DRAG IS NOW MANDATORY ON ITS OWN ROUTE, so this matters
                MORE than it did, not less. Low emphasis, underlined so it
                reads as a control, and 44px tall so it is still a real target
                for the person with a motor impairment it exists for. */}
            <button
              type="button"
              onClick={() => setEscapeOpen((v) => !v)}
              aria-expanded={escapeOpen}
              data-name="slide-escape-hatch"
              className="mt-2 flex h-11 shrink-0 items-center justify-center self-center rounded-lg px-4 font-sans text-sm font-medium text-muted-foreground underline underline-offset-4"
            >
              {escapeLabel}
            </button>

            {/* Below the top tier the disclosure reveals the acknowledgement
                row itself, which is the NON-DRAG ARMING GESTURE for the same
                button. At the top tier that row is already on screen as the
                gate, so the disclosure states the fact it changes instead of
                revealing nothing. */}
            {escapeOpen &&
              (needsAck ? (
                <p className={`font-sans ${BODY} mt-2 text-center`}>{escapeNote}</p>
              ) : (
                ackRow
              ))}

            {/* ── THE ONE COMMIT CONTROL ──────────────────────────────────
                `destructive` for close: the design system expresses danger
                purely through the variant (Figma component set 6716:46634).
                Opening is NOT destructive - it resumes flow - so it takes the
                default variant. RED IS NEVER THE ONLY CARRIER: the count, the
                outcome verb and the exclusion rows all say it in words.
                `aria-disabled`, NOT `disabled`: the reason has to reach
                assistive tech, and `disabled` is skipped outright by some of
                it (.claude/skills/wint-ui-copy/SKILL.md §5). */}
            <Button
              type="button"
              variant={closing ? 'destructive' : 'default'}
              onClick={onTapCommit}
              aria-disabled={!canCommit || undefined}
              aria-describedby={inertReason ? inertId : undefined}
              className="mt-3 h-12 w-full shrink-0 rounded-xl text-base font-semibold aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
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

            {inertReason && (
              <p id={inertId} className={`font-sans ${BODY} mt-2 text-center`}>
                {inertReason}
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
