/**
 * BulkValveConfirmSheet — the confirmation in front of a BULK valve operation:
 * closing or opening every valve across a location, or across a whole account.
 *
 * DESIGN SOURCE: none. The Figma file has no valve-management, bulk-action or
 * confirmation frame — a survey walked every page and found nothing to
 * transcribe. This component is net-new from the design system, structurally
 * like AccountScreenV2.jsx:4. EVERY VISIBLE STRING BELOW IS NEW COPY AWAITING
 * THE OWNER'S APPROVAL. Each one is marked `NEW COPY` at its site.
 *
 * WHY THIS EXISTS
 * ValveConfirmSheet is the per-system confirmation: 1-3 devices inside one
 * system. In production a bulk action is 100-1000 physical valves in occupied
 * buildings. Closing them cuts water; opening them can resume a leak. The
 * owner's framing: "this is like a super dangerous operation."
 *
 * And the hard requirement, in his words: "we have a kind of offline devices
 * that the valve cannot be shut off. So we need to explain the user this
 * situation somehow and to not let him think that this valve will take place
 * on this operation that he wants to."
 *
 * So: THIS SHEET IS THE LAST THING STANDING BETWEEN THE USER AND A WRONG
 * BELIEF ABOUT WHAT THEY JUST DID. That is its whole job, and the five rules
 * below each serve it.
 *
 *  1. THE HEADLINE NUMBER IS WHAT WILL BE ATTEMPTED, never what was selected.
 *     `willActCount` is the only number given the big type, and it is the same
 *     number printed in the button. One number, one meaning.
 *  2. EACH BUCKET STATES THE WATER CONSEQUENCE, not the software one. "Water
 *     keeps running there" beats "command could not be delivered" — a facility
 *     manager acts on water, not on packets.
 *  3. THE NON-ACTING BUCKETS SIT BETWEEN THE THUMB AND THE COMMIT BUTTON, in
 *     DOM order as well as on screen. This is the one empirically supported
 *     finding in the confirmation literature: Bravo-Lillo et al. (SOUPS
 *     2013/2014) found *inhibitive attractors* — treatments that delay
 *     dismissal or force interaction with the salient field — made users 2-3x
 *     more likely to make an informed decision, and resilient to habituation.
 *     THERE IS NO HOVER ON MOBILE, SO ANYTHING IN A TOOLTIP DOES NOT EXIST:
 *     nothing here is in a tooltip, and nothing is behind a closed-by-default
 *     disclosure.
 *  4. THE COUNT IS IN THE BUTTON LABEL, not only in body text — the thumb must
 *     pass over the number to commit. It also makes the dialog polymorphic
 *     (its text changes on every invocation), which Vance et al. (CHI 2017,
 *     fMRI + eye tracking) found substantially reduces habituation. "Close
 *     valves" habituates; "Close 31 valves" does not.
 *  5. THE PRIMARY ARMS AFTER ~800ms (ARMING_DELAY_MS) — a short inhibitive
 *     delay that defeats the double-tap passthrough from whatever control
 *     opened this. It is skippable via `skipArmingDelay` (default off) because
 *     an emergency path may later need it gone.
 *
 * THE EXCLUSION SET — FIVE BUCKETS, and the set must stay closed. A valve the
 * command will not reach has to be named here or the user walks away with the
 * wrong belief, whatever the reason for the miss. `valveScope.js` is the one
 * place that decides who is excluded, and `targetsFor(...).skipped` returns
 * exactly these five, in this order (the same order
 * `valveCommandStore.js:82` records them in):
 *
 *   offline           → `offlineSystems` (by NAME, not only a count)
 *   no valve fitted   → `noValveCount`
 *   `valve === 'error'`      → `faultedCount`
 *   `valve === 'closing'`    → `closingCount`
 *   already in the commanded state → `alreadyInStateCount`
 *
 * `closing` is the fifth valve state and the easy one to drop: it is minted at
 * `src/lib/pushEvents.js:153` and overlaid onto `sys.valve` by
 * `src/data/systems.js:206` (pinned by `pushLifecycle.test.js:131`), and
 * `valveScope.js:167` rules it NOT actionable — a valve already in transition
 * takes no new command. It gets its own bucket rather than being folded into
 * "already Closed", because it is a different fact and reads as one. A new
 * exclusion reason added to `valveScope.js` needs a bucket here on the same
 * day, or this sheet silently drops it on the floor again.
 *
 * PURE AND PROPS-DRIVEN. It imports no valve store and no scope helper, holds
 * no state but the arming flag and the offline disclosure, and renders only
 * what it is handed. The caller owns the counts and owns the command.
 *
 * WHY NOT THE SHADCN <Sheet>
 * Same reason ValveConfirmSheet.jsx:17-25 gives, restated at
 * AccountScreenV2.jsx:644-656, PushSimSheet.jsx:7-10 and
 * SystemsOverviewHero.jsx:519 and pinned by two tests: shadcn's Sheet is a
 * Radix dialog that portals to document.body, and this app draws inside a
 * fixed 393x852 frame (src/components/Phone.jsx, overflow: hidden). A portal
 * escapes that frame by design and paints across the whole browser window with
 * the phone sitting in the middle of it. The house pattern is an
 * `absolute inset-0` overlay INSIDE the page, which is what this is. No
 * portal, and no `select` / `dropdown-menu` primitive — neither exists in
 * src/components/ui/.
 *
 * role="alertdialog", not "dialog". This is a destructive confirmation, which
 * is what alertdialog is for; `aria-labelledby` names it from the title and
 * `aria-describedby` from the consequence line, so a screen reader hears the
 * blast radius before it reaches the buttons.
 *
 * TOKENS ONLY — no `var(--x, #hex)` fallbacks. Phase 3 of
 * docs/TOKENIZATION-PLAN.md deleted every fallback deliberately: "The fallback
 * was a second, invisible source of truth that won whenever the token was
 * missing, with no warning and no visual tell; removing it makes a missing
 * token fail loudly." A Tailwind colour utility naming a token this repo does
 * not define falls through to stock Tailwind and then freezes across all four
 * themes — there is no `--green-*` token at all, for instance. Every colour
 * utility below resolves to a token declared in src/index.css:
 *   bg-surface-card  --surface-card      bg-foreground/45  --foreground
 *   text-foreground  --foreground        text-slate-600    --slate-600
 *   text-slate-500   --slate-500         border/bg-border  --border
 *   the red fill     --destructive, via <Button variant="destructive">
 * `:root` declares each one and the three theme blocks
 * (`[data-theme='dark'], .dark`, `[data-theme='sand']`, `[data-theme='contrast']`)
 * override what they need on the SAME root element, so every utility here
 * moves under all four themes.
 *
 * COPY — the product's decided vocabulary, not invented synonyms:
 *   - the valve states are drawn in Figma (board 199535:96542) as literally
 *     `Open` / `Closed` / `No valve installed` / `Unknown` / `Valve Error` /
 *     `Disconnected` — so "No valve installed", never "No valve"; "Valve
 *     Error", never "Fault". The transitional state is drawn there too, as
 *     `Verifying closure (allow a few min)`, and the `closingCount` bucket
 *     below is built from that line rather than from an invented synonym —
 *     no "in transit", no "pending".
 *   - offline is `Offline` / `Offline systems` / `System is offline` /
 *     `Can't reach {name}` (src/i18n/locales/en.json:348-355). "Unreachable"
 *     appears nowhere in this product and is not introduced here.
 *   - DELIBERATELY ABSENT: "Are you sure"; "This action cannot be undone" (it
 *     CAN be undone — you can reopen the valve; saying the false thing trains
 *     people to ignore the true one); and any phrasing implying the offline
 *     ones will be acted on later, because nothing queues them.
 *   - ValveConfirmSheet's close-all sentence ("...to all {n} valves on this
 *     system", ValveConfirmSheet.jsx:86-88) is NOT reused: it was written for
 *     1-3 devices inside one system and is wrong for a fleet action.
 *   - No t(). Only 2 of 36 v2 components use i18n and no v2 valve surface
 *     does; adding it here would make this the one translated string in the
 *     stack.
 */
import { useEffect, useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

/* THE INHIBITIVE DELAY. ~800ms is long enough that the second half of a
   double-tap — on whatever row or button opened this sheet — lands on a dead
   control, and short enough that a user who meant it barely registers the
   wait. It is a SAFETY CONTROL, not an animation: `prefers-reduced-motion`
   flattens the bar that draws it (see SHEET_CSS) but never shortens or removes
   the delay itself. `skipArmingDelay` is the only thing that does. */
const ARMING_DELAY_MS = 800

/* Scoped to this component rather than added to the global stylesheet — the
   house pattern at WaterEventFeedbackSheet.jsx:375. This bar is the ONLY
   visual treatment of the arming, and under reduced motion it simply sits
   full-width and still: the button stays disabled for the same 800ms either
   way. */
const SHEET_CSS = `
.bvcs-arm { animation: bvcs-arm ${ARMING_DELAY_MS}ms linear forwards; }
@keyframes bvcs-arm { from { width: 0%; } to { width: 100%; } }
@media (prefers-reduced-motion: reduce) {
  .bvcs-arm { animation: none; width: 100%; }
}
`

/* Line-height LAST in each — twMerge drops a `leading-` that precedes a
   font-size atom. */
const TITLE = 'font-semibold text-foreground text-[20px] tracking-[-0.45px] leading-[24px]'
/* The headline count is the largest type on the sheet, by rule 1. */
const COUNT_BIG = 'font-bold text-foreground text-[34px] tabular-nums tracking-[-1px] leading-[36px]'
const COUNT_SMALL = 'font-semibold text-foreground text-[20px] tabular-nums leading-[24px]'
const BUCKET_LABEL = 'font-semibold text-foreground text-[15px] leading-[20px]'
const BUCKET_BODY = 'text-slate-600 text-[13px] leading-[18px]'

/** `1 system` / `3 systems`, so no bucket ever reads "1 systems". */
const plural = (n, one, many) => (n === 1 ? one : many)

/**
 * @param {{
 *   action: 'close'|'open'|null,
 *   scopeLabel: string,
 *   scopeKind?: 'location'|'account'|'selection',
 *   willActCount: number,
 *   offlineSystems?: {id?: string, name: string, lastSeenLabel?: string}[],
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
     four-bucket signature keeps working untouched and simply renders no
     closing bucket. */
  closingCount = 0,
  alreadyInStateCount = 0,
  busy = false,
  skipArmingDelay = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId()
  const consequenceId = useId()
  /* The offline list starts OPEN. Rule 3: a count alone lets the user assume
     the offline ones are unimportant, and a closed-by-default disclosure is
     that same failure one tap away. The toggle exists to collapse a long list
     once it has been seen, not to hide it before. */
  const [offlineOpen, setOfflineOpen] = useState(true)
  const [armed, setArmed] = useState(false)

  /* Escape cancels. Radix gave this for free; an in-frame overlay has to say
     so itself (ValveConfirmSheet.jsx:70-76). */
  useEffect(() => {
    if (!action) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [action, onCancel])

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

  /* `skipArmingDelay` is read here, not written into state, so flipping it
     cannot leave a stale armed flag behind. */
  const armedNow = skipArmingDelay || armed

  if (!action) return null

  const closing = action === 'close'

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
     the scope named on the line above — and which worked around the gap by
     smuggling "2 of 5 systems selected" into `scopeLabel`. 'selection' is that
     fact stated where it belongs, and it is phrased as the NEGATION of the
     other two so the three read as one family: whatever the scope is, this
     command does not cover all of it.

     NO 'fleet' KIND, deliberately, and the code is why. The worry was the
     unscoped `/valves` route reading "Every system in this account" over the
     entire fleet. It cannot any more: that route is `ValveManagementScreen`,
     and this screen now passes 'selection' on every route it serves, scoped
     or not. And this sheet has exactly ONE caller — `ValveManagementCard`
     accepts a `scopeKind` prop but DELIBERATELY DOES NOT DESTRUCTURE IT
     (`ValveManagementCard.jsx:253-264`) and does not render this sheet at
     all, having become a display-only readout. So 'location' and 'account'
     already have no live caller and survive only for compatibility; a fourth
     value would be a sentence nothing can reach. The fleet is also genuinely
     one account's hierarchy in this dataset — every account is a child of
     Meridian Realty Group — so there is no fact 'fleet' would state that
     'account' states wrongly. If a second top-level account ever lands in the
     data, it earns one then.

     BACKWARDS COMPATIBLE BY CONSTRUCTION: 'location' and 'account' return
     exactly what they returned before, the default is still 'location', and
     an unknown value still falls through to the location sentence rather than
     rendering nothing. */
  const scopeLine =
    scopeKind === 'selection'
      ? 'Only the systems you selected — not every system here'
      : scopeKind === 'account'
        ? 'Every system in this account'
        : 'Every system at this location'

  /* NEW COPY. Rule 1: this label is bound to willActCount and to nothing
     else. */
  const actLabel = closing
    ? plural(willActCount, 'valve will close', 'valves will close')
    : plural(willActCount, 'valve will open', 'valves will open')
  /* NEW COPY. Rule 2 — the water consequence, in the user's units. */
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
  /* NEW COPY — AWAITING THE OWNER'S APPROVAL, like every other string here, and
     net-new even by this file's standards: nothing in the product has worded
     the bulk case of a valve mid-transition before. The LABEL is the
     designer's own line for the state, Figma board 199535:96542 drawing it
     verbatim as `Verifying closure (allow a few min)` — so "verifying
     closure", never "in transit", "pending" or "closing now". The consequence
     stays in water, and it does not promise that this operation will catch
     them: it will not, and nothing re-sends. */
  const closingConsequence = closing
    ? 'These are already closing. Water is stopping there — allow a few min.'
    : 'These are already closing. Water there is stopping, and this will not bring it back.'
  const alreadyConsequence = closing
    ? 'Water is already off there.'
    : 'Water is already running there.'

  /* NEW COPY. Rule 4 — the count rides in the label, which also makes the
     button text different on every invocation. */
  const confirmLabel = closing
    ? `Close ${willActCount} ${plural(willActCount, 'valve', 'valves')}`
    : `Open ${willActCount} ${plural(willActCount, 'valve', 'valves')}`

  const offlineCount = offlineSystems.length
  /* A confirmation that always shows empty buckets is noise, and noise is what
     habituation feeds on. No exclusions, no section. */
  const hasExclusions =
    offlineCount > 0 ||
    noValveCount > 0 ||
    faultedCount > 0 ||
    closingCount > 0 ||
    alreadyInStateCount > 0

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={consequenceId}
    >
      <style>{SHEET_CSS}</style>

      {/* Scrim. A tap outside is a Cancel — this action never commits by
          accident. */}
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-foreground/45"
      />

      <div className="relative flex max-h-full flex-col overflow-y-auto rounded-t-[18px] bg-surface-card px-[20px] pb-[24px] pt-[12px]">
        {/* The grab handle, so the sheet reads as a sheet. Radix's Separator is
            a plain <div>, NOT a portal — safe inside the frame. */}
        <Separator
          aria-hidden="true"
          className="mx-auto mb-[16px] shrink-0 rounded-[2px] data-[orientation=horizontal]:h-[4px] data-[orientation=horizontal]:w-[36px]"
        />

        {/* ── Header: the act, then the scope ─────────────────────────────── */}
        <h2 id={titleId} className={`font-sans ${TITLE}`}>{title}</h2>
        <p className="mt-[6px] font-sans text-[15px] font-medium leading-[20px] text-foreground">
          {scopeLabel}
        </p>
        <p className={`font-sans ${BUCKET_BODY} mt-[2px]`}>{scopeLine}</p>

        <Separator className="my-[16px] shrink-0" />

        {/* ── Bucket 1: what will actually be attempted ───────────────────── */}
        <div className="flex items-baseline gap-[10px]">
          <span className={`font-sans ${COUNT_BIG}`}>{willActCount}</span>
          <span className="font-sans text-[17px] font-semibold leading-[22px] text-foreground">
            {actLabel}
          </span>
        </div>
        <p id={consequenceId} className={`font-sans ${BUCKET_BODY} mt-[4px]`}>
          {actConsequence}
        </p>

        {/* ── Bucket 2: everything that will NOT move ──────────────────────
            Rule 3: this block is between the headline and the commit button in
            DOM order as well as on screen, and a test pins that, so it cannot
            be moved below the button silently. */}
        {hasExclusions && (
          <>
            <Separator className="my-[16px] shrink-0" />
            {/* NEW COPY. "Not included" states the fact; it does not apologise
                for it and does not hint at a retry. */}
            <h3 className="font-sans text-[13px] font-semibold uppercase leading-[16px] tracking-[0.6px] text-slate-500">
              Not included
            </h3>

            {offlineCount > 0 && (
              <div className="mt-[12px]">
                <button
                  type="button"
                  onClick={() => setOfflineOpen((v) => !v)}
                  aria-expanded={offlineOpen}
                  className="flex w-full items-baseline gap-[10px] text-left"
                >
                  <span className={`font-sans ${COUNT_SMALL}`}>{offlineCount}</span>
                  {/* NEW COPY, on the product's own word (en.json `offline`). */}
                  <span className={`font-sans ${BUCKET_LABEL} flex-1`}>
                    {plural(offlineCount, 'system is offline', 'systems are offline')}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-4 shrink-0 self-center text-slate-500 transition-transform motion-reduce:transition-none ${
                      offlineOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <p className={`font-sans ${BUCKET_BODY} mt-[4px]`}>{offlineConsequence}</p>
                {/* The NAMES, not only the count: a count alone lets the user
                    assume the offline ones are unimportant. Capped in height
                    rather than in rows — on an account action this can be
                    dozens, and truncating the list would recreate exactly the
                    wrong belief this sheet exists to prevent. */}
                {offlineOpen && (
                  <ul className="mt-[8px] max-h-[132px] overflow-y-auto rounded-[12px] border border-border px-[12px] py-[8px]">
                    {offlineSystems.map((s) => (
                      <li
                        key={s.id ?? s.name}
                        className={`font-sans ${BUCKET_BODY} py-[3px] text-foreground`}
                      >
                        {/* `lastSeenLabel` is rendered VERBATIM after the dot —
                            the caller owns its wording, e.g. "offline 3h ago".
                            NEW COPY only in the fallback. */}
                        {s.name} · {s.lastSeenLabel || 'Offline'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {noValveCount > 0 && (
              <div className="mt-[12px]">
                <div className="flex items-baseline gap-[10px]">
                  <span className={`font-sans ${COUNT_SMALL}`}>{noValveCount}</span>
                  {/* Figma's own state word: "No valve installed", not "No valve". */}
                  <span className={`font-sans ${BUCKET_LABEL} flex-1`}>
                    {plural(noValveCount, 'has no valve installed', 'have no valve installed')}
                  </span>
                </div>
                <p className={`font-sans ${BUCKET_BODY} mt-[4px]`}>{noValveConsequence}</p>
              </div>
            )}

            {faultedCount > 0 && (
              <div className="mt-[12px]">
                <div className="flex items-baseline gap-[10px]">
                  <span className={`font-sans ${COUNT_SMALL}`}>{faultedCount}</span>
                  {/* Figma's own state word: "Valve Error", not "Fault". */}
                  <span className={`font-sans ${BUCKET_LABEL} flex-1`}>
                    {plural(faultedCount, 'is in Valve Error', 'are in Valve Error')}
                  </span>
                </div>
                <p className={`font-sans ${BUCKET_BODY} mt-[4px]`}>{faultedConsequence}</p>
              </div>
            )}

            {/* Same treatment, same block, no disclosure — a valve mid-close
                is excluded for its OWN reason and is not folded into the
                offline list or into "already Closed". */}
            {closingCount > 0 && (
              <div className="mt-[12px]">
                <div className="flex items-baseline gap-[10px]">
                  <span className={`font-sans ${COUNT_SMALL}`}>{closingCount}</span>
                  {/* Figma's own line for this state: "Verifying closure
                      (allow a few min)". */}
                  <span className={`font-sans ${BUCKET_LABEL} flex-1`}>
                    {plural(closingCount, 'is verifying closure', 'are verifying closure')}
                  </span>
                </div>
                <p className={`font-sans ${BUCKET_BODY} mt-[4px]`}>{closingConsequence}</p>
              </div>
            )}

            {alreadyInStateCount > 0 && (
              <div className="mt-[12px]">
                <div className="flex items-baseline gap-[10px]">
                  <span className={`font-sans ${COUNT_SMALL}`}>{alreadyInStateCount}</span>
                  {/* Figma's state words again: "Closed" / "Open". */}
                  <span className={`font-sans ${BUCKET_LABEL} flex-1`}>
                    {closing
                      ? plural(alreadyInStateCount, 'is already Closed', 'are already Closed')
                      : plural(alreadyInStateCount, 'is already Open', 'are already Open')}
                  </span>
                </div>
                <p className={`font-sans ${BUCKET_BODY} mt-[4px]`}>{alreadyConsequence}</p>
              </div>
            )}
          </>
        )}

        {/* ── Commit ───────────────────────────────────────────────────────
            `destructive` for close: the design system has the variant in every
            size (Figma component set 6716:46634) and expresses danger purely
            through it — there is no destructive AlertDialog variant and no
            type-to-confirm anywhere in the file. Opening is NOT destructive —
            it resumes flow — so it takes the default variant. The exclusion
            block above is identical either way, because opening 31 valves
            while 3 are offline is the same class of wrong belief. */}
        <Button
          type="button"
          variant={closing ? 'destructive' : 'default'}
          onClick={onConfirm}
          disabled={!armedNow || busy}
          className="mt-[20px] h-[52px] w-full shrink-0 rounded-xl text-base font-semibold"
        >
          {confirmLabel}
        </Button>

        {!armedNow && (
          <>
            <div
              aria-hidden="true"
              className="mt-[8px] h-[2px] w-full shrink-0 overflow-hidden rounded-full bg-border"
            >
              <div className="bvcs-arm h-full bg-slate-500" />
            </div>
            {/* NEW COPY. A disabled button with no explanation reads as broken;
                this says the wait is deliberate without nagging. */}
            <p className={`font-sans ${BUCKET_BODY} mt-[6px] text-center`}>
              Take a moment to read the list above.
            </p>
          </>
        )}

        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="mt-[10px] h-[48px] w-full shrink-0 rounded-xl text-base font-semibold"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
