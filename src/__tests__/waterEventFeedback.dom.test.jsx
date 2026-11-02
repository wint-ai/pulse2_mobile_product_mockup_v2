// @vitest-environment happy-dom
//
// Water Event feedback — two flows, two sources of truth.
//
// ── 2026-10-29: the ignore flow's expectations were REWRITTEN, not deleted ──
// The owner ruled that Figma supersedes `page-water-event-feedback-end.html`
// for `trigger="ignore"`: 199745:20202 (the consequences) and 199748:26265
// (the documentation step). The question "Was this worth alerting about?", its
// Yes/No branch, the two per-branch headings and the points reward are gone
// from that flow, so the cases that pinned them now pin their ABSENCE — a
// deleted test would have let any of them quietly come back.
//
// `trigger="event-ended"` is NOT covered by either frame. It stayed unchanged
// until 2026-11-02; see the next block.
//
// ── 2026-11-02: THE EVENT-ENDED QUESTION WENT TOO. ONE STEP, FIVE OPTIONS ──
// The owner removed it from this flow as well ("i want to remove the yse no
// step / wht its needed?") and replaced it with options he wrote himself —
// Leak · Water Waste · Unusual, no issue · Unnecessary alert, plus the
// catch-all this file has always carried, last. Single select. Asked what the
// push's "Tell us more" should open he added the shape: "a new flow similar to
// ignore but with different options as discussed", so the step wears the
// ignore documentation step's chassis — banner, heading, one chip row.
//
// Shown a two-step version of it he removed the second step too — "dont want
// too much steps / dont want this" — which took "Was it fixed?", the
// unconditional Done and the POINTS with it. Then he put the note back on the
// first step: "and i want this on the first step".
//
// Built that way it forced the chip to stop committing once the field was
// open, and a Done to reappear to commit instead — visually the exact control
// he had just rejected. Shown both options with that warning stated, he chose
// the other: THE NOTE LIVES ON THE ACKNOWLEDGEMENT PANEL. A chip tap then
// means one thing, always — commit and close — and the most expensive control
// in the sheet sits strictly after the answer is already on disk.
//
// THE PART THAT WOULD HAVE BROKEN QUIETLY: the record is written at the chip
// tap, so the note is an UPDATE to a row that already exists. The store
// APPENDS per eventKey, so writing the note with addFeedback would have left
// two rows for one answer and doubled every count that reads them. It is
// patched by `id` through setFeedbackNote instead — pinned both here and in
// its own describe.
//
// These cases were REWRITTEN, not deleted, for the same reason the ignore
// ones were: the retired question's absence is pinned by its literal text, so
// it cannot creep back under a passing suite.
//
// What these tests pin, because each is a thing that quietly breaks:
//   • `verdict` is the first-class field and `answer` is DERIVED from it, for
//     every reader written before today — all five arms of that mapping
//   • the gate in addFeedback widened for a verdict and stayed shut on junk.
//     It is SILENT on rejection, so nothing at a call site can tell a refused
//     record from a stored one; before the fix it would have voided every
//     event-ended record while the flow appeared to work
//   • a legacy row — `answer`, no `verdict` — still reads back untouched
//   • "Was it fixed?" is asked of NO verdict, and no `fixed` value is written
//   • no points, on any path, after the owner removed them from this flow
//   • the note updates the committed row and creates no second one
//   • the screen-wide celebration still fires, on its new trigger
//   • nothing is mandatory — on event-ended one tap on one verdict is a
//     whole, persisted answer; on ignore, no chip and no note persists
//     nothing at all
//   • the Ignore consequences come BEFORE the documentation step, and the
//     ignore itself only commits on "Ignore anyway"
//   • "This can't be undone" is its OWN panel, not a fourth consequence bullet
//   • the ignore flow's four VERDICTS, and the shim they retired. For three
//     days `answer` was derived from an "Unnecessary Alert" control purely to
//     satisfy the store's gate; the flow now has a real verdict and the store
//     derives from it like the other flow's. Both vocabularies are validated
//     PER TRIGGER, so a cross-flow value is junk — pinned, because pooling
//     the two populations is a one-line mistake and an invisible one
//   • and that the gate stays silent on rejection, which is why a record it
//     refuses looks exactly like one it stored at every call site
//   • "Was it fixed?" is Yes-branch, end-of-event only; the ignored event is
//     still running, so the question has no answer yet
//   • the note is capped at 140 characters, counter and value both

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import WaterEventFeedbackSheet from '@/v2/components/WaterEventFeedbackSheet'
import {
  addFeedback,
  answerForVerdict,
  setFeedbackNote,
  getFeedback,
  getLatestFeedback,
  getFeedbackCount,
  getLearnedCount,
  clearAllFeedback,
  IGNORE_VERDICT_OPTIONS,
  VERDICT_OPTIONS,
} from '@/data/eventFeedbackStore'

beforeEach(() => {
  localStorage.clear()
  clearAllFeedback()
})
afterEach(cleanup)

const SYS = { systemId: 'fire-riser-2', systemName: 'Fire Riser 2' }

function open(props = {}) {
  const calls = { cancel: [], complete: [], ignoreConfirmed: [] }
  const utils = render(
    <WaterEventFeedbackSheet
      open
      {...SYS}
      onCancel={() => calls.cancel.push(true)}
      onComplete={(r) => calls.complete.push(r)}
      onIgnoreConfirmed={() => calls.ignoreConfirmed.push(true)}
      {...props}
    />,
  )
  return { ...utils, calls, view: within(utils.container) }
}

const btn = (view, name) => view.getByRole('button', { name })
/* `fixedOpt` lived here — the "Was it fixed?" group was a shadcn/Radix
   single-select ToggleGroup whose three options are radios, not buttons. The
   owner removed that question on 2026-11-02 and no surface in the app renders
   a radio any more, so the helper went with it. The cases that pin its
   ABSENCE query by role directly, which is the assertion that would catch it
   coming back. */

describe('trigger: event-ended', () => {
  /* ── 2026-11-02: ONE STEP, FIVE VERDICTS, NOTE ON THE PANEL ────────────
     The owner removed the primary question from THIS flow, then removed the
     second step he was shown ("dont want too much steps / dont want this"),
     which took "Was it fixed?", the Done and the POINTS with it. He asked for
     the note on the first step; built that way it forced the chip to stop
     committing and a Done to reappear, so he was shown the alternative and
     chose it: THE NOTE LIVES ON THE ACKNOWLEDGEMENT PANEL.

     What that buys, and what these cases pin: a chip tap means ONE thing,
     always — commit and close — and the most expensive control in the sheet
     sits strictly after the answer is already on disk. */

  it('opens straight on the five verdicts — and on nothing else', () => {
    const { view } = open()

    /* The chassis the owner asked for: "a new flow similar to ignore but
       with different options as discussed". Banner, heading, chip row. */
    expect(view.getByText('Water event ended')).toBeTruthy()
    expect(view.getByText('Help us improve')).toBeTruthy()

    for (const option of VERDICT_OPTIONS) expect(btn(view, option), option).toBeTruthy()

    /* The exact strings, and the exact order. These are the OWNER'S words —
       including the lower-case "a" in "Unnecessary alert", which is how he
       wrote it and which is NOT the ignore step's "Unnecessary Alert". The
       catch-all is LAST, which is the only position that keeps it a
       catch-all rather than an option competing with the named four. */
    const row = btn(view, 'Leak').parentElement
    expect([...row.children].map((c) => c.textContent)).toEqual([
      'Leak',
      'Water Waste',
      'Unusual, no issue',
      'Unnecessary alert',
      'Something else',
    ])

    // The retired question, its pair, and its hint.
    expect(view.queryByText('Was this worth alerting about?')).toBeNull()
    expect(view.queryByText('Your answer helps Wint learn. Nothing is mandatory.')).toBeNull()
    expect(view.queryByRole('button', { name: 'Yes' })).toBeNull()
    expect(view.queryByRole('button', { name: 'No' })).toBeNull()

    /* NOTHING ELSE ON THE STEP. The note is on the panel after it, and there
       is no commit control of any kind — a chip tap is the commit. */
    expect(view.queryByText('+ Add note (optional)')).toBeNull()
    expect(view.queryByRole('textbox', { name: 'Note (optional)' })).toBeNull()
    expect(view.queryByRole('button', { name: 'Done' })).toBeNull()

    // No points chip — "dont want this" — and no progress indicator.
    expect(view.queryByText(/points earned/)).toBeNull()
    expect(view.queryByText(/^\+\d+$/)).toBeNull()
    expect(view.queryByText(/Step \d+ of \d+/)).toBeNull()

    // And no consequences block; that is the Ignore trigger's alone.
    expect(view.queryByText('Ignore this water event?')).toBeNull()
  })

  /* A CHIP TAP MEANS ONE THING, ALWAYS. It does not depend on what else the
     user has touched, and this is the path almost everyone takes. */
  it('one tap on a chip is the whole interaction: it commits and closes', () => {
    vi.useFakeTimers()
    try {
      const { view, calls } = open()
      fireEvent.click(btn(view, 'Unusual, no issue'))

      const saved = getLatestFeedback(SYS.systemId)
      expect(saved.verdict).toBe('Unusual, no issue')
      expect(saved.answer).toBe('yes')
      expect(saved.trigger).toBe('event-ended')
      expect(saved.note).toBeNull()
      expect(saved.fixed).toBeNull()
      // The points went with the owner's "dont want this".
      expect(saved.points).toBe(0)

      // The chip row is gone — the step is over on that one tap.
      expect(view.queryByRole('button', { name: 'Leak' })).toBeNull()

      // The acknowledgement takes over and hands back on its own.
      expect(view.getByText('Thanks — Wint learned from this.')).toBeTruthy()
      expect(calls.complete).toEqual([])
      vi.advanceTimersByTime(2000)
      expect(calls.complete).toHaveLength(1)
      expect(calls.complete[0].verdict).toBe('Unusual, no issue')
    } finally {
      vi.useRealTimers()
    }
  })

  it('the acknowledgement offers the note, and the verdict step never did', () => {
    const { view } = open()
    expect(view.queryByText('+ Add note (optional)')).toBeNull()

    fireEvent.click(btn(view, 'Leak'))

    expect(view.getByText('+ Add note (optional)')).toBeTruthy()
    // Offered, not open — the field itself still costs a deliberate tap.
    expect(view.queryByRole('textbox', { name: 'Note (optional)' })).toBeNull()
    // And still nothing to press: dismissal is what saves.
    expect(view.queryByRole('button', { name: 'Done' })).toBeNull()
  })

  /* OPENING THE NOTE CANCELS THE AUTO-CLOSE. A panel that walked out from
     under a half-typed sentence is the whole reason not to put a text field
     on a timed screen. */
  it('opening the note holds the panel open indefinitely', () => {
    vi.useFakeTimers()
    try {
      const { view, calls } = open()
      fireEvent.click(btn(view, 'Leak'))
      fireEvent.click(btn(view, '+ Add note (optional)'))

      vi.advanceTimersByTime(60000)

      expect(calls.complete).toEqual([])
      expect(view.getByRole('textbox', { name: 'Note (optional)' })).toBeTruthy()
      expect(view.getByText('Thanks — Wint learned from this.')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  /* THE RECORD ALREADY EXISTS BY THEN, SO THE NOTE IS AN UPDATE. The store
     APPENDS per eventKey, so a second write here would leave two rows for one
     answer, double every count that reads them, and put a noted copy in front
     of a bare copy with nothing on disk to say which was real. */
  it('a note typed on the panel updates the committed record, creating no second one', () => {
    const { view, calls } = open()
    fireEvent.click(btn(view, 'Leak'))

    const first = getLatestFeedback(SYS.systemId)
    expect(getFeedback(SYS.systemId)).toHaveLength(1)
    expect(first.id).toBeTruthy()
    expect(first.note).toBeNull()

    fireEvent.click(btn(view, '+ Add note (optional)'))
    fireEvent.change(view.getByRole('textbox', { name: 'Note (optional)' }), {
      target: { value: '  valve seat worn, plumber booked  ' },
    })
    fireEvent.click(btn(view, 'Close'))

    const all = getFeedback(SYS.systemId)
    expect(all, 'the note must patch the row, not append one').toHaveLength(1)
    expect(getFeedbackCount()).toBe(1)
    expect(all[0].id).toBe(first.id)
    expect(all[0].note).toBe('valve seat worn, plumber booked')
    // Everything else on the row is untouched by the patch.
    expect(all[0].verdict).toBe('Leak')
    expect(all[0].answer).toBe('yes')
    expect(all[0].at).toBe(first.at)
    // And the caller gets the NOTED row, not the bare one it already had.
    expect(calls.complete).toHaveLength(1)
    expect(calls.complete[0].note).toBe('valve seat worn, plumber booked')
  })

  it('a panel dismissed without touching the note leaves the record exactly as it was', () => {
    const { view, calls } = open()
    fireEvent.click(btn(view, 'Water Waste'))
    const before = getLatestFeedback(SYS.systemId)

    fireEvent.click(btn(view, 'Close'))

    expect(getFeedback(SYS.systemId)).toHaveLength(1)
    expect(getLatestFeedback(SYS.systemId)).toEqual(before)
    expect(calls.complete).toHaveLength(1)
    expect(calls.complete[0]).toEqual(before)
  })

  it('opening the note and typing nothing also leaves the record alone', () => {
    const { view } = open()
    fireEvent.click(btn(view, 'Leak'))
    const before = getLatestFeedback(SYS.systemId)

    fireEvent.click(btn(view, '+ Add note (optional)'))
    fireEvent.change(view.getByRole('textbox', { name: 'Note (optional)' }), {
      target: { value: '   ' },
    })
    fireEvent.click(btn(view, 'Close'))

    expect(getFeedback(SYS.systemId)).toHaveLength(1)
    expect(getLatestFeedback(SYS.systemId)).toEqual(before)
  })

  /* THE MAPPING, ALL FIVE ARMS. `verdict` is the first-class field and
     `answer` is DERIVED from it, for every reader written before today.
     "Unnecessary alert" is the only one that means the alert was WRONG. */
  it.each([
    ['Leak', 'yes'],
    ['Water Waste', 'yes'],
    ['Unusual, no issue', 'yes'],
    ['Unnecessary alert', 'no'],
    ['Something else', 'yes'],
  ])('%s persists as the verdict, deriving answer %s', (verdict, answer) => {
    const { view } = open()
    fireEvent.click(btn(view, verdict))

    const saved = getLatestFeedback(SYS.systemId)
    expect(saved, verdict).toBeTruthy()
    expect(saved.verdict).toBe(verdict)
    expect(saved.answer).toBe(answer)
    expect(saved.trigger).toBe('event-ended')
  })

  /* "Was it fixed?" existed on this flow for one afternoon, behind Leak and
     Water Waste. The owner removed the step it lived on. It is asked of NO
     verdict now, and the component writes no `fixed` value at all. */
  it.each(VERDICT_OPTIONS)('%s never asks "Was it fixed?"', (verdict) => {
    const { view } = open()
    fireEvent.click(btn(view, verdict))

    expect(view.queryByText('Was it fixed?')).toBeNull()
    expect(view.queryByRole('radiogroup')).toBeNull()
    expect(view.queryByRole('radio', { name: 'Fixed' })).toBeNull()
    expect(view.queryByRole('radio', { name: 'Resolved on its own' })).toBeNull()
    expect(getLatestFeedback(SYS.systemId).fixed).toBeNull()
  })

  /* SINGLE SELECT. A randomised Pew experiment (n=4,581) put
     select-all-that-apply ~8 percentage points below forced choice on
     endorsement, with a 3pp response-order effect that forced choice does not
     carry: users stop scanning once the question feels answered. If this ever
     becomes a multi-select row, that is what it costs. */
  it('is single select — the first tap wins and the row is gone', () => {
    const { view } = open()
    fireEvent.click(btn(view, 'Leak'))

    expect(view.queryByRole('button', { name: 'Water Waste' })).toBeNull()
    expect(view.queryByRole('button', { name: 'Unnecessary alert' })).toBeNull()
    expect(view.queryByRole('button', { name: 'Something else' })).toBeNull()

    const all = getFeedback(SYS.systemId)
    expect(all).toHaveLength(1)
    expect(all[0].verdict).toBe('Leak')
  })

  /* THE TWELVE CAUSE CHIPS WENT WITH THE BRANCH. They are still DEFINED in
     the component — the owner's ruling was scoped to the question, not to
     cause, so relabelling or rehoming them is not this change's to make —
     but nothing renders them. Pinned so a later pass has to decide on
     purpose rather than by accident. */
  it('no longer offers the branch headings or their cause chips', () => {
    const { view } = open()

    expect(view.queryByText('What was it?')).toBeNull()
    expect(view.queryByText('What was it really?')).toBeNull()
    for (const gone of [
      'Running or stuck toilet',
      'Leaking fixture',
      'Burst or broken pipe',
      'Irrigation stuck on',
      'Appliance leak',
      'Pool / tub / spa filling',
      'Scheduled irrigation',
      'Heavy use (cleaning / laundry / guests)',
      'Construction or maintenance',
      'One-off event',
    ]) {
      expect(view.queryByRole('button', { name: gone }), gone).toBeNull()
    }
  })

  it('records nothing, and cancels, when it is dismissed before a verdict', () => {
    const { view, calls } = open()

    fireEvent.click(btn(view, 'Close'))

    expect(getFeedback(SYS.systemId)).toEqual([])
    expect(calls.cancel).toHaveLength(1)
    expect(calls.complete).toEqual([])
  })
})

describe('the optional note', () => {
  /* IT LIVES ON THE ACKNOWLEDGEMENT PANEL — the owner picked that over the
     verdict step. A free-text field is the single most expensive element in a
     micro-survey (one open-text question roughly doubles median completion
     time), so it must never be able to slow the answer down. Here it cannot:
     the record is already on disk by the time it is on screen.

     What it buys, at that price: when "Something else" starts taking more
     than ~15% of answers, these notes are the only evidence of what the
     missing option should have been. */

  it('caps at 140 characters, in the field and in the counter', () => {
    const { view } = open()
    fireEvent.click(btn(view, 'Leak'))
    fireEvent.click(btn(view, '+ Add note (optional)'))

    const field = view.getByRole('textbox', { name: 'Note (optional)' })
    expect(view.getByText('0/140')).toBeTruthy()

    // Paste far past the cap. maxLength alone does not stop a programmatic
    // set, so the component clips as well — this asserts the clip, not the
    // attribute.
    fireEvent.change(field, { target: { value: 'x'.repeat(200) } })

    expect(field.value).toHaveLength(140)
    expect(field.getAttribute('maxlength')).toBe('140')
    expect(view.getByText('140/140')).toBeTruthy()

    // And it survives the patch at the cap, not one character over.
    fireEvent.click(btn(view, 'Close'))
    expect(getLatestFeedback(SYS.systemId).note).toHaveLength(140)
  })

  /* "Something else" opens the note by itself on the IGNORE step. There is
     no note on the verdict step for it to open, and by the time there is one
     the sheet has already moved on. */
  it('"Something else" is no different from the other four', () => {
    const { view } = open()
    fireEvent.click(btn(view, 'Something else'))

    expect(getLatestFeedback(SYS.systemId).verdict).toBe('Something else')
    expect(view.getByText('Thanks — Wint learned from this.')).toBeTruthy()
    // It lands on the panel like every other verdict, note offered not open.
    expect(view.getByText('+ Add note (optional)')).toBeTruthy()
    expect(view.queryByRole('textbox', { name: 'Note (optional)' })).toBeNull()
  })

  it('persists the note alongside the verdict, trimmed', () => {
    const { view } = open()

    fireEvent.click(btn(view, 'Leak'))
    fireEvent.click(btn(view, '+ Add note (optional)'))
    fireEvent.change(view.getByRole('textbox', { name: 'Note (optional)' }), {
      target: { value: '  under the sink  ' },
    })
    fireEvent.click(btn(view, 'Close'))

    const saved = getLatestFeedback(SYS.systemId)
    expect(saved.verdict).toBe('Leak')
    expect(saved.answer).toBe('yes')
    // The cause chips went with the branch; nothing writes `chips` on this
    // flow any more, and the field stays an empty array rather than vanishing.
    expect(saved.chips).toEqual([])
    expect(saved.fixed).toBeNull()
    expect(saved.note).toBe('under the sink')
    expect(saved.trigger).toBe('event-ended')
    expect(saved.systemId).toBe(SYS.systemId)
    expect(saved.actor).toBeTruthy()
    expect(saved.at).toBeGreaterThan(0)
    // No points on any path now.
    expect(saved.points).toBe(0)
  })

  /* THE CELEBRATION, ON ITS NEW TRIGGER. The rule is unchanged — the
     screen-wide burst is for the users who went deep enough to TYPE
     something, and a bare chip tap gets the small burst only. It used to fire
     at a Done that no longer exists, so it fires on the first character
     instead: the only moment the user is still on screen to see it.

     The owner asked for this, unprompted and after the points came out: "i
     realy like the positive energy from this / we need more like this,
     because we want people to react and to tag this data". The warmth was
     never what he rejected; the SCORE was. */
  it('fires the full-screen celebration on the first typed character, not before', () => {
    const { view, container } = open()
    fireEvent.click(btn(view, 'Leak'))
    expect(container.querySelectorAll('.wef-burst')).toHaveLength(0)

    fireEvent.click(btn(view, '+ Add note (optional)'))
    expect(container.querySelectorAll('.wef-burst')).toHaveLength(0)

    fireEvent.change(view.getByRole('textbox', { name: 'Note (optional)' }), {
      target: { value: 'a' },
    })
    expect(container.querySelectorAll('.wef-burst').length).toBeGreaterThan(0)
  })

  it('does not re-fire the celebration on every keystroke', () => {
    const { view, container } = open()
    fireEvent.click(btn(view, 'Leak'))
    fireEvent.click(btn(view, '+ Add note (optional)'))
    const field = view.getByRole('textbox', { name: 'Note (optional)' })

    fireEvent.change(field, { target: { value: 'a' } })
    const first = container.querySelectorAll('.wef-burst').length
    fireEvent.change(field, { target: { value: 'ab' } })
    fireEvent.change(field, { target: { value: 'abc' } })

    expect(container.querySelectorAll('.wef-burst')).toHaveLength(first)
  })
})

describe('trigger: ignore', () => {
  const openIgnore = (props) => open({ trigger: 'ignore', ...props })

  it('shows the consequences BEFORE the documentation step, and commits nothing yet', () => {
    const { view, calls, container } = openIgnore()

    expect(view.getByRole('dialog', { name: 'Ignore this water event?' })).toBeTruthy()
    expect(view.getByText('Ignore this water event?')).toBeTruthy()
    expect(
      view.getByText(/You’re telling Wint this flow is OK\. Here’s what happens:/),
    ).toBeTruthy()

    // THREE consequences in the list — 199745:21441 / :21442 / :21460.
    const bullets = container.querySelectorAll('li')
    expect(bullets).toHaveLength(3)
    expect(view.getByText(/be automatically closed, even if the flow keeps/)).toBeTruthy()
    expect(view.getByText(/New events still\s+alert normally\./)).toBeTruthy()
    expect(view.getByText(/until the\s+water flow actually stops\./)).toBeTruthy()

    // The irreversibility is its OWN tinted panel (199747:23437), NOT a fourth
    // <li> in the list above — which is exactly how it used to render, and the
    // delta the owner screenshotted. The wording is unchanged by the move.
    const undone = view.getByText(/can’t be undone for this event\./)
    expect(undone.closest('li')).toBeNull()
    expect(undone.closest('.bg-alert-surface-critical')).toBeTruthy()

    expect(btn(view, 'Cancel')).toBeTruthy()
    expect(btn(view, 'Ignore anyway')).toBeTruthy()

    // The documentation step is not reachable yet, and the retired question
    // is not reachable at all.
    expect(view.queryByText('Help us improve')).toBeNull()
    expect(view.queryByText('Was this worth alerting about?')).toBeNull()
    expect(view.queryByRole('button', { name: 'Yes' })).toBeNull()
    expect(calls.ignoreConfirmed).toEqual([])
  })

  it('fires onIgnoreConfirmed only on "Ignore anyway", then shows the documentation step', () => {
    const { view, calls } = openIgnore()

    expect(calls.ignoreConfirmed).toEqual([])
    fireEvent.click(btn(view, 'Ignore anyway'))

    expect(calls.ignoreConfirmed).toHaveLength(1)
    expect(view.queryByText('Ignore this water event?')).toBeNull()

    // 199748:26265, top to bottom: the banner, the heading, the flat chip set.
    expect(view.getByText('Event marked as ignored')).toBeTruthy()
    expect(view.getByText('Help us improve')).toBeTruthy()

    // The retired question and its branch are gone from this flow entirely.
    expect(view.queryByText('Was this worth alerting about?')).toBeNull()
    expect(view.queryByText('Your answer helps Wint learn. Nothing is mandatory.')).toBeNull()
    expect(view.queryByRole('button', { name: 'Yes' })).toBeNull()
    expect(view.queryByRole('button', { name: 'No' })).toBeNull()

    // So is the reward — the frame scores nothing and draws no points chip.
    expect(view.queryByText(/points earned/)).toBeNull()
    expect(view.queryByText(/^\+\d+$/)).toBeNull()

    // And so is the context line: the frame's chrome is the handle and the
    // close button, nothing else.
    expect(view.queryByText(/Fire Riser 2/)).toBeNull()
  })

  it('Cancel backs out without ignoring and without recording anything', () => {
    const { view, calls } = openIgnore()

    fireEvent.click(btn(view, 'Cancel'))

    expect(calls.ignoreConfirmed).toEqual([])
    expect(calls.cancel).toHaveLength(1)
    expect(calls.complete).toEqual([])
    expect(getFeedback(SYS.systemId)).toEqual([])
  })

  it('offers ONE flat set of VERDICTS — no branch, and no per-branch heading', () => {
    const { view } = openIgnore()
    fireEvent.click(btn(view, 'Ignore anyway'))

    /* RULED 2026-11-02, superseding the 2026-10-31 causes. The owner, shown
       this step: "And so this one shows the wrong options, not what is
       discussed before."

       PROVENANCE — these four are NOT the owner's own words, unlike the
       event-ended four, which he typed. They were drafted in discussion and
       adopted by him. Question them to him; do not edit them here.

       THE AXIS IS NOT event-ended's. At ignore time the event is STILL
       RUNNING, so there is nothing to ask about what it WAS; the question is
       why it is acceptable to leave it. */
    const VERDICTS_IGNORE = [
      'Expected usage',
      'Being handled',
      'Not a real alert',
      'Something else',
    ]
    for (const chip of VERDICTS_IGNORE) {
      expect(btn(view, chip), chip).toBeTruthy()
    }

    // Order is pinned, catch-all last — the same rule as the event-ended row.
    const row = btn(view, VERDICTS_IGNORE[0]).parentElement
    expect([...row.children].map((c) => c.textContent)).toEqual(VERDICTS_IGNORE)

    /* THE SIX CAUSES ARE GONE, and so is the separate "Unnecessary Alert"
       control that sat below them. That control was not just a chip: it was
       where this flow's `answer` came from. "Not a real alert" carries that
       meaning now, as a verdict the store derives from. */
    for (const gone of [
      'Stuck or running toilet',
      'Broken pipe',
      'Tap or hose left on',
      'Irrigation',
      'Cooling or HVAC',
      'Unnecessary Alert',
    ]) {
      expect(view.queryByRole('button', { name: gone }), gone).toBeNull()
    }

    // And the frame's original six reasons, retired back on 2026-10-31.
    for (const gone of [
      'Already fixing it',
      'Plumber scheduled',
      'Known ongoing issue',
      'Water shut off manually',
    ]) {
      expect(view.queryByRole('button', { name: gone }), gone).toBeNull()
    }

    // The retired branch headings and microcopy.
    expect(view.queryByText('Why ignore it then?')).toBeNull()
    expect(view.queryByText("What's happening instead?")).toBeNull()
    expect(view.queryByText("Thanks — we'll stay out of your way.")).toBeNull()
    expect(view.queryByText('Thanks — Wint will be quieter here.')).toBeNull()

    // The old no-branch chips belonged to a branch that no longer exists.
    for (const gone of ['Filling a pool / tub / spa', 'Running irrigation', 'Heavy use today']) {
      expect(view.queryByRole('button', { name: gone }), gone).toBeNull()
    }
  })

  /* SINGLE SELECT, AND IT WAS FORCED RATHER THAN CHOSEN. The old six were
     CAUSES and multi-select — a stuck toilet and a running tap can both be
     true. These four are VERDICTS on one event and are mutually exclusive:
     "Expected usage" and "Not a real alert" cannot both be why it is
     acceptable to leave this running. A verdict is singular by definition,
     which is what lets the store derive ONE answer from it.

     It also settles a disagreement between the two flows. Event-ended is
     single select on a randomised Pew experiment (n=4,581) that measured
     select-all ~8pp below forced choice on endorsement; a per-event label is
     exactly where multi-select is strictly worse. */
  it('is single select — a second tap moves the choice rather than adding one', () => {
    const { view } = openIgnore()
    fireEvent.click(btn(view, 'Ignore anyway'))

    fireEvent.click(btn(view, 'Expected usage'))
    expect(btn(view, 'Expected usage').getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(btn(view, 'Being handled'))
    expect(btn(view, 'Expected usage').getAttribute('aria-pressed')).toBe('false')
    expect(btn(view, 'Being handled').getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(btn(view, 'Done'))
    const saved = getLatestFeedback(SYS.systemId)
    expect(saved.verdict).toBe('Being handled')
    expect(saved.chips).toEqual(['Being handled'])
  })

  it('closes on a "Done", and offers no second exit beside it', () => {
    const { view } = openIgnore()
    fireEvent.click(btn(view, 'Ignore anyway'))

    expect(view.getByText('+ Add note (optional)')).toBeTruthy()

    /* RULED 2026-10-31, inverting what this case used to pin. The frame
       labels this button "Ignore anyway" a SECOND time, after the button that
       got the user here said the same thing, on a sheet whose banner already
       says the event is ignored. That was shipped as drawn for want of a
       ruling; there is one now. The ignore itself committed on the previous
       step, and this button writes optional detail if any was given and
       otherwise only dismisses — so "Done" is the one label true in both
       states, which is the case Apple's HIG covers for a final step. */
    expect(btn(view, 'Done')).toBeTruthy()
    expect(view.queryByRole('button', { name: 'Ignore anyway' })).toBeNull()

    /* And NOTHING beside it. The X and the scrim already dismiss, and inside
       the ignore branch of `close` the reason argument is never read, so all
       three paths are identical — a "Skip" here would be a second control
       doing byte-for-byte the same thing as the first. */
    expect(view.queryByRole('button', { name: 'Skip' })).toBeNull()
    expect(view.queryByRole('button', { name: 'Cancel' })).toBeNull()
  })

  it('writes nothing when no cause, no verdict and no note were given', () => {
    const { view, calls } = openIgnore()
    fireEvent.click(btn(view, 'Ignore anyway'))
    fireEvent.click(btn(view, 'Done'))

    // The ignore itself is the caller's; an empty documentation step is not a
    // record. "Nothing is mandatory", and a blank answer is not an answer.
    expect(getFeedback(SYS.systemId)).toEqual([])
    expect(calls.complete).toEqual([null])
    expect(calls.cancel).toEqual([])
  })

  it('never asks "Was it fixed?" — the ignored event is still running', () => {
    const { view } = openIgnore({ initialStep: 'question' })

    expect(view.queryByText('Was it fixed?')).toBeNull()
    expect(view.queryByRole('radiogroup')).toBeNull()
    expect(view.queryByRole('radio', { name: 'Fixed' })).toBeNull()
    expect(view.queryByRole('radio', { name: 'Resolved on its own' })).toBeNull()
  })

  it('records the verdict against the ignore trigger, and scores nothing', () => {
    const { view } = openIgnore()
    fireEvent.click(btn(view, 'Ignore anyway'))
    fireEvent.click(btn(view, 'Expected usage'))
    fireEvent.click(btn(view, 'Done'))

    const saved = getLatestFeedback(SYS.systemId)
    expect(saved.trigger).toBe('ignore')
    expect(saved.verdict).toBe('Expected usage')
    expect(saved.fixed).toBeNull()
    // The frames award nothing, and the event-ended flow has none either now.
    expect(saved.points).toBe(0)

    /* `chips` IS STILL WRITTEN, as a one-element array, and that is not
       redundancy: TWO surfaces outside this component caption the ignored
       incident from `record.chips` — SystemPageV2Screen:2283 and
       HomeAllAccounts:1742, both `[record.chips?.join(', '), record.note]`.
       Writing only `verdict` would blank both badges for every ignore with
       no note, silently. Pinned here so the bridge cannot be tidied away
       before those two read `verdict`. */
    expect(saved.chips).toEqual(['Expected usage'])
  })

  /* THE SHIM IS RETIRED, 2026-11-02 — and this is what replaced it.
     For three days this flow had no verdict to offer the store, so `answer`
     was DERIVED: first from `chips.includes('Unnecessary Alert')`, then from
     an "Unnecessary Alert" toggle. The store's gate rejected any record
     without a yes/no, unconditionally and SILENTLY, so that derivation was
     load-bearing — an undefined would have voided every ignore record with
     nothing in the console to say so.

     Both halves are gone: the gate takes a `verdict`, and this step HAS one.
     "Not a real alert" is the false-positive report the toggle used to
     carry, and the store maps it through the same total `answerForVerdict`
     the event-ended flow uses. One mechanism, two vocabularies, no shim. */
  it.each([
    ['Expected usage', 'yes'],
    ['Being handled', 'yes'],
    ['Not a real alert', 'no'],
    ['Something else', 'yes'],
  ])('%s derives answer %s', (verdict, answer) => {
    const { view } = openIgnore()
    fireEvent.click(btn(view, 'Ignore anyway'))
    fireEvent.click(btn(view, verdict))
    fireEvent.click(btn(view, 'Done'))

    const saved = getLatestFeedback(SYS.systemId)
    expect(saved.verdict).toBe(verdict)
    expect(saved.answer).toBe(answer)
    expect(saved.trigger).toBe('ignore')
  })

  it('"Not a real alert" is the only ignore verdict that means the alert was wrong', () => {
    for (const verdict of IGNORE_VERDICT_OPTIONS) {
      expect(answerForVerdict(verdict), verdict).toBe(
        verdict === 'Not a real alert' ? 'no' : 'yes',
      )
    }
  })

  /* THE TRAP THIS STILL GUARDS. addFeedback's gate is silent: a record it
     refuses looks exactly like one it stored at every call site that does
     not check. A verdict the gate did not recognise would return null,
     onComplete would fire with null, the ignored-incident summary would be
     null and the badge would never appear — no error, no warning. */
  it('persists, and hands back the record rather than the gate\'s null', () => {
    const { view, calls } = openIgnore()
    fireEvent.click(btn(view, 'Ignore anyway'))
    fireEvent.click(btn(view, 'Not a real alert'))
    fireEvent.click(btn(view, 'Done'))

    const saved = getLatestFeedback(SYS.systemId)
    expect(saved).toBeTruthy()
    expect(saved.answer).toBe('no')

    expect(calls.complete).toHaveLength(1)
    expect(calls.complete[0]).not.toBeNull()
    expect(calls.complete[0].answer).toBe('no')
  })

  /* THE ONE DERIVATION LEFT, and its whole scope. A user who opens the note,
     types and presses Done WITHOUT picking a chip has given detail but no
     verdict. That wrote a row before this change — the badge shows the note —
     so it keeps writing one, with answer 'yes' because nothing was said about
     the alert being wrong. Dropping it would silently bin a typed sentence. */
  it('still writes a row for a note with no verdict', () => {
    const { view } = openIgnore()
    fireEvent.click(btn(view, 'Ignore anyway'))
    fireEvent.click(btn(view, '+ Add note (optional)'))
    fireEvent.change(view.getByRole('textbox', { name: 'Note (optional)' }), {
      target: { value: 'plumber coming Tuesday' },
    })
    fireEvent.click(btn(view, 'Done'))

    const saved = getLatestFeedback(SYS.systemId)
    expect(saved).toBeTruthy()
    expect(saved.note).toBe('plumber coming Tuesday')
    expect(saved.verdict).toBeNull()
    expect(saved.answer).toBe('yes')
  })

  it('refuses to render on a Shutoff event — Ignore is a Warning-state action', () => {
    const { view } = openIgnore({ eventState: 'shutoff' })
    expect(view.queryByRole('dialog')).toBeNull()
  })

  it('treats a skipped answer after a committed ignore as complete, not cancelled', () => {
    const { view, calls } = openIgnore()
    fireEvent.click(btn(view, 'Ignore anyway'))
    fireEvent.click(btn(view, 'Close'))

    expect(calls.complete).toEqual([null])
    expect(calls.cancel).toEqual([])
  })
})

describe('driving the sheet to a state', () => {
  /* The mockup shipped "Jump to: Yes branch" / "Jump to: No branch". Both
     branches are gone (2026-11-02) and so is the 'detail' step that briefly
     replaced them: the event-ended flow is the verdict step and the
     acknowledgement, nothing else. */
  it.each(['question', 'yes', 'no', 'detail'])(
    'event-ended / %s falls back to the verdict step',
    (initialStep) => {
      const { view } = open({ initialStep })
      expect(btn(view, 'Unusual, no issue')).toBeTruthy()
      expect(view.queryByText('Was it fixed?')).toBeNull()
      // And it lands UNANSWERED — a jump target must not pre-pick a verdict.
      expect(getFeedback(SYS.systemId)).toEqual([])
    },
  )

  /* The ignore flow has exactly two steps (199745:20202 → 199748:26265), so
     there is no branch to jump to: anything that is not 'warning' resolves
     to the documentation step rather than rendering nothing. */
  it.each(['question', 'yes', 'no'])('ignore / %s lands on the documentation step', (initialStep) => {
    const { view } = open({ trigger: 'ignore', initialStep })
    expect(view.getByText('Help us improve')).toBeTruthy()
    expect(view.queryByText('Ignore this water event?')).toBeNull()
  })

  it('reopening on a different trigger starts clean', () => {
    const { view, rerender, container } = open({ initialStep: 'verdict' })
    fireEvent.click(btn(view, 'Leak'))
    fireEvent.click(btn(view, '+ Add note (optional)'))

    rerender(<WaterEventFeedbackSheet open {...SYS} trigger="ignore" initialStep="warning" />)
    const next = within(container)
    expect(next.getByText('Ignore this water event?')).toBeTruthy()
    expect(next.queryByRole('textbox', { name: 'Note (optional)' })).toBeNull()
  })

  it('Escape closes the ignore warning as a Cancel', () => {
    const { calls } = open({ trigger: 'ignore' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(calls.cancel).toHaveLength(1)
    expect(calls.ignoreConfirmed).toEqual([])
  })

  it('Escape on the acknowledgement saves a typed note', () => {
    // Three dismissal paths, one behaviour: the X, the scrim and Escape all
    // run the same `close`, and that is what patches the note in.
    const { view } = open()
    fireEvent.click(btn(view, 'Leak'))
    fireEvent.click(btn(view, '+ Add note (optional)'))
    fireEvent.change(view.getByRole('textbox', { name: 'Note (optional)' }), {
      target: { value: 'escaped out' },
    })
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(getFeedback(SYS.systemId)).toHaveLength(1)
    expect(getLatestFeedback(SYS.systemId).note).toBe('escaped out')
  })

  it('hands back after the acknowledgement has had its moment', () => {
    vi.useFakeTimers()
    try {
      const { view, calls } = open()
      fireEvent.click(btn(view, 'Leak'))
      expect(calls.complete).toEqual([])
      vi.advanceTimersByTime(2000)
      expect(calls.complete).toHaveLength(1)
      expect(view.getByText('Thanks — Wint learned from this.')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  /* "Unnecessary alert" derives answer 'no', and the acknowledgement follows
     the derived answer — so it gets the one line that is true of it. */
  it('the acknowledgement follows the derived answer', () => {
    const { view } = open()
    fireEvent.click(btn(view, 'Unnecessary alert'))
    expect(view.getByText('Thanks — Wint will be quieter here.')).toBeTruthy()
    expect(view.queryByText('Thanks — Wint learned from this.')).toBeNull()
  })
})

describe('the store', () => {
  it('round-trips a record and counts it toward what Wint has learned', () => {
    const before = getLearnedCount()
    expect(getFeedbackCount()).toBe(0)

    const { view } = open()
    fireEvent.click(btn(view, 'Water Waste'))

    expect(getFeedbackCount()).toBe(1)
    expect(getLearnedCount()).toBe(before + 1)
    // The acknowledgement quotes the store, not a constant.
    expect(view.getByText(String(before + 1))).toBeTruthy()

    // Survives a reload — it is on disk, not in a module-level cache, and
    // BOTH fields are on disk: the verdict the user chose and the answer
    // derived from it for every reader written before 2026-11-02.
    const raw = JSON.parse(localStorage.getItem('pulse2-event-feedback'))
    expect(raw[SYS.systemId]).toHaveLength(1)
    expect(raw[SYS.systemId][0].verdict).toBe('Water Waste')
    expect(raw[SYS.systemId][0].answer).toBe('yes')
  })

  it('keys by the event, not only the system, when a closed event id is given', () => {
    const { view } = open({ eventKey: 'evt-9981' })
    fireEvent.click(btn(view, 'Unnecessary alert'))

    expect(getFeedback('evt-9981')).toHaveLength(1)
    // The system is still recorded on the row, so the record is traceable.
    expect(getLatestFeedback('evt-9981').systemId).toBe(SYS.systemId)
    expect(getLatestFeedback('evt-9981').answer).toBe('no')
    expect(getFeedback(SYS.systemId)).toEqual([])
  })

  it('lets one event carry both an ignore-time answer and an end-of-event one', () => {
    const first = open({ trigger: 'ignore' })
    fireEvent.click(btn(first.view, 'Ignore anyway'))
    fireEvent.click(btn(first.view, 'Expected usage'))
    fireEvent.click(btn(first.view, 'Done'))
    cleanup()

    const second = open()
    fireEvent.click(btn(second.view, 'Unusual, no issue'))

    const all = getFeedback(SYS.systemId)
    expect(all).toHaveLength(2)
    expect(all[0].trigger).toBe('ignore')
    // Its own vocabulary, on its own trigger — never pooled with the other.
    expect(all[0].verdict).toBe('Expected usage')
    expect(all[0].answer).toBe('yes')
    expect(all[1].trigger).toBe('event-ended')
    expect(all[1].verdict).toBe('Unusual, no issue')
  })
})

/* ── THE GATE — IT WIDENED, IT DID NOT OPEN ───────────────────────────────
   `addFeedback` used to hard-reject any record whose `answer` was not
   'yes'/'no', UNCONDITIONALLY and SILENTLY: null back, no throw, no console
   warning. With the primary question gone there is no `answer` to supply, so
   shipping the new step against the old gate would have voided EVERY
   event-ended record while the flow looked like it worked. These cases pin
   both halves of the fix — what it now lets in, and what it still keeps out —
   because a gate that is silent cannot be debugged from a call site. */
describe('the gate addFeedback keeps', () => {
  it('accepts a record carrying a valid verdict and derives its answer', () => {
    for (const verdict of VERDICT_OPTIONS) {
      const row = addFeedback('evt-gate', { verdict, systemId: SYS.systemId })
      expect(row, verdict).toBeTruthy()
      expect(row.verdict, verdict).toBe(verdict)
      expect(row.answer, verdict).toBe(answerForVerdict(verdict))
      // Total by construction: every verdict maps, nothing reaches undefined.
      expect(['yes', 'no'], verdict).toContain(row.answer)
    }
    expect(getFeedback('evt-gate')).toHaveLength(VERDICT_OPTIONS.length)
  })

  it('accepts the IGNORE vocabulary, on an ignore record', () => {
    for (const verdict of IGNORE_VERDICT_OPTIONS) {
      const row = addFeedback('evt-gate-ig', { trigger: 'ignore', verdict })
      expect(row, verdict).toBeTruthy()
      expect(row.verdict, verdict).toBe(verdict)
      expect(row.trigger, verdict).toBe('ignore')
      expect(row.answer, verdict).toBe(answerForVerdict(verdict))
      expect(['yes', 'no'], verdict).toContain(row.answer)
    }
    expect(getFeedback('evt-gate-ig')).toHaveLength(IGNORE_VERDICT_OPTIONS.length)
  })

  /* TWO VOCABULARIES, KEYED BY TRIGGER — not one pooled union. The two sets
     answer DIFFERENT questions (what the event WAS, versus why it is
     acceptable to leave a running one), so a consumer that pooled them would
     be averaging two populations. Validating per-trigger makes a mixed row
     impossible to write rather than merely discouraged: `trigger` is what the
     verdict was checked against, not just a label on the row. */
  it('refuses a verdict from the OTHER flow\'s vocabulary', () => {
    for (const verdict of IGNORE_VERDICT_OPTIONS) {
      if (VERDICT_OPTIONS.includes(verdict)) continue   // 'Something else' is in both
      expect(
        addFeedback('evt-cross', { trigger: 'event-ended', verdict }),
        verdict,
      ).toBeNull()
    }
    for (const verdict of VERDICT_OPTIONS) {
      if (IGNORE_VERDICT_OPTIONS.includes(verdict)) continue
      expect(
        addFeedback('evt-cross', { trigger: 'ignore', verdict }),
        verdict,
      ).toBeNull()
    }
    expect(getFeedback('evt-cross')).toEqual([])
  })

  it('the shared catch-all is valid in both vocabularies', () => {
    expect(addFeedback('evt-both', { trigger: 'event-ended', verdict: 'Something else' })).toBeTruthy()
    expect(addFeedback('evt-both', { trigger: 'ignore', verdict: 'Something else' })).toBeTruthy()
    const all = getFeedback('evt-both')
    expect(all.map((r) => r.trigger)).toEqual(['event-ended', 'ignore'])
    expect(all.every((r) => r.answer === 'yes')).toBe(true)
  })

  it('"Unnecessary alert" is the only verdict that means the alert was wrong', () => {
    for (const verdict of VERDICT_OPTIONS) {
      expect(answerForVerdict(verdict), verdict).toBe(
        verdict === 'Unnecessary alert' ? 'no' : 'yes',
      )
    }
  })

  /* The derivation WINS over anything the caller passed, so the two fields
     can never contradict each other on disk — which is the failure a second
     writable field invites. */
  it('derives the answer even when the caller passes a contradicting one', () => {
    expect(addFeedback('evt-gate', { verdict: 'Unnecessary alert', answer: 'yes' }).answer).toBe('no')
    expect(addFeedback('evt-gate', { verdict: 'Leak', answer: 'no' }).answer).toBe('yes')
  })

  it('still rejects a genuinely malformed record, silently, as it always did', () => {
    const junk = [
      {},
      { verdict: '' },
      { verdict: 'Leaky' },
      { verdict: 'leak' },
      { verdict: 'Unnecessary Alert' },      // the ignore flow's RETIRED control
      { verdict: 'Not a real alert' },       // the ignore vocabulary, wrong trigger
      { verdict: 'Expected usage' },         // likewise
      { trigger: 'ignore', verdict: 'Leak' }, // and the reverse
      { verdict: 42 },
      { verdict: null },
      { verdict: {} },
      { verdict: ['Leak'] },
      { answer: 'maybe' },
      { answer: true },
      { answer: '' },
    ]
    for (const bad of junk) {
      expect(addFeedback('evt-junk', bad), JSON.stringify(bad)).toBeNull()
    }
    expect(getFeedback('evt-junk')).toEqual([])
  })

  it('still refuses a record with no event key, verdict or not', () => {
    expect(addFeedback(null, { verdict: 'Leak' })).toBeNull()
    expect(addFeedback('', { answer: 'yes' })).toBeNull()
    expect(addFeedback(undefined, { verdict: 'Leak' })).toBeNull()
  })

  /* The ignore flow fakes an `answer` from its "Unnecessary Alert" toggle to
     get past this gate, and the component's header documents that shim
     honestly. The fix must not have changed it. */
  it('still takes the ignore shim — an explicit answer and no verdict', () => {
    const row = addFeedback('evt-ign', {
      trigger: 'ignore',
      answer: 'no',
      chips: ['Broken pipe'],
    })
    expect(row).toBeTruthy()
    expect(row.answer).toBe('no')
    expect(row.verdict).toBeNull()
    expect(row.trigger).toBe('ignore')
    expect(row.chips).toEqual(['Broken pipe'])
  })

  /* Every row written before 2026-11-02 has an `answer` and no `verdict`.
     Nothing migrates them and nothing needs to: the read paths were not
     touched. */
  it('reads back a legacy record that has an answer and no verdict', () => {
    localStorage.setItem('pulse2-event-feedback', JSON.stringify({
      'evt-legacy': [{
        trigger: 'event-ended',
        answer: 'no',
        chips: ['Scheduled irrigation'],
        note: 'pool top-up',
        fixed: null,
        points: 10,
        systemId: SYS.systemId,
        actor: 'someone@wint.ai',
        at: 1761900000000,
      }],
    }))

    const legacy = getLatestFeedback('evt-legacy')
    expect(legacy.answer).toBe('no')
    expect(legacy.verdict).toBeUndefined()
    expect(legacy.chips).toEqual(['Scheduled irrigation'])
    expect(legacy.note).toBe('pool top-up')
    expect(legacy.points).toBe(10)
    expect(getFeedbackCount()).toBe(1)

    // And a new-shape record lands beside it without disturbing it.
    addFeedback('evt-legacy', { verdict: 'Leak', systemId: SYS.systemId })
    const all = getFeedback('evt-legacy')
    expect(all).toHaveLength(2)
    expect(all[0].answer).toBe('no')
    expect(all[0].verdict).toBeUndefined()
    expect(all[1].verdict).toBe('Leak')
    expect(all[1].answer).toBe('yes')
  })
})

/* ── setFeedbackNote — AN UPDATE, AND ONLY AN UPDATE ──────────────────────
   The event-ended flow commits on the chip tap and offers the note after, so
   the note is an EDIT to a row that already exists. This store appends per
   eventKey; a second addFeedback would have produced two rows for one answer,
   doubled getFeedbackCount / getLearnedCount / getAllFeedback, and left a
   noted copy in front of a bare one with nothing on disk to say which was
   real. These cases pin that it patches and cannot append. */
describe('setFeedbackNote', () => {
  const seed = (key = 'evt-note') =>
    addFeedback(key, { verdict: 'Leak', systemId: SYS.systemId })

  it('patches the row in place and never grows the list', () => {
    const row = seed()
    expect(row.id).toBeTruthy()
    expect(row.note).toBeNull()

    const patched = setFeedbackNote('evt-note', row.id, '  pipe under slab  ')

    expect(patched.note).toBe('pipe under slab')
    expect(patched.id).toBe(row.id)
    expect(patched.verdict).toBe('Leak')
    expect(patched.answer).toBe('yes')
    expect(patched.at).toBe(row.at)
    expect(getFeedback('evt-note')).toHaveLength(1)
    expect(getFeedbackCount()).toBe(1)
  })

  it('patches the RIGHT row when an event carries several', () => {
    const first = seed()
    const second = addFeedback('evt-note', { verdict: 'Unnecessary alert' })

    setFeedbackNote('evt-note', second.id, 'the second one')

    const all = getFeedback('evt-note')
    expect(all).toHaveLength(2)
    expect(all[0].id).toBe(first.id)
    expect(all[0].note).toBeNull()
    expect(all[1].note).toBe('the second one')
  })

  it('clips at 140 and clears on a blank, exactly as a fresh write does', () => {
    const row = seed()
    expect(setFeedbackNote('evt-note', row.id, 'y'.repeat(200)).note).toHaveLength(140)
    // A user who deletes what they typed has un-noted the row.
    expect(setFeedbackNote('evt-note', row.id, '   ').note).toBeNull()
    expect(getFeedback('evt-note')).toHaveLength(1)
  })

  it('returns null, and writes nothing, when there is nothing to patch', () => {
    const row = seed()
    expect(setFeedbackNote(null, row.id, 'x')).toBeNull()
    expect(setFeedbackNote('evt-note', null, 'x')).toBeNull()
    expect(setFeedbackNote('evt-note', undefined, 'x')).toBeNull()
    expect(setFeedbackNote('evt-note', 'not-an-id', 'x')).toBeNull()
    expect(setFeedbackNote('no-such-event', row.id, 'x')).toBeNull()

    expect(getFeedback('evt-note')).toHaveLength(1)
    expect(getLatestFeedback('evt-note').note).toBeNull()
    expect(getFeedbackCount()).toBe(1)
  })

  /* A row written before 2026-11-02 has no `id`. A missing id must never
     match a missing id, or one legacy row would be patchable by accident
     from anywhere. */
  it('can never match a legacy row that has no id', () => {
    localStorage.setItem('pulse2-event-feedback', JSON.stringify({
      'evt-legacy': [{ trigger: 'event-ended', answer: 'yes', note: null, at: 1761900000000 }],
    }))

    expect(setFeedbackNote('evt-legacy', undefined, 'x')).toBeNull()
    expect(setFeedbackNote('evt-legacy', null, 'x')).toBeNull()
    expect(getLatestFeedback('evt-legacy').note).toBeNull()
  })
})
