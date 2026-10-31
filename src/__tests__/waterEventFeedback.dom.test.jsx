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
// `trigger="event-ended"` is NOT covered by either frame and is unchanged,
// question and reward included. Its cases below are untouched.
//
// What these tests pin, because each is a thing that quietly breaks:
//   • nothing is mandatory — on event-ended one tap on Yes or No is a whole,
//     persisted answer; on ignore, no chip and no note persists nothing at all
//   • the Ignore consequences come BEFORE the documentation step, and the
//     ignore itself only commits on "Ignore anyway"
//   • "This can't be undone" is its OWN panel, not a fourth consequence bullet
//   • the ignore flow's `answer` is DERIVED from the "Unnecessary Alert"
//     control, because the store still rejects a record without one — a shim,
//     pinned so it is visible rather than load-bearing-and-forgotten
//   • and that a record STILL persists when that control is untouched: the
//     store's gate is silent, so a derived answer that ever reached it as
//     undefined would void every ignore record with nothing to show for it
//   • "Was it fixed?" is Yes-branch, end-of-event only; the ignored event is
//     still running, so the question has no answer yet
//   • the note is capped at 140 characters, counter and value both

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import WaterEventFeedbackSheet from '@/v2/components/WaterEventFeedbackSheet'
import {
  getFeedback,
  getLatestFeedback,
  getFeedbackCount,
  getLearnedCount,
  clearAllFeedback,
  FIXED_STATES,
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
// The "Was it fixed?" group is a shadcn/Radix single-select ToggleGroup, so
// its three options are radios in a radiogroup, not buttons.
const fixedOpt = (view, name) => view.getByRole('radio', { name })

describe('trigger: event-ended', () => {
  it('opens straight on the one primary question, with the "nothing is mandatory" line', () => {
    const { view } = open()

    expect(view.getByRole('dialog', { name: 'Was this worth alerting about?' })).toBeTruthy()
    expect(view.getByText('Was this worth alerting about?')).toBeTruthy()
    expect(view.getByText('Your answer helps Wint learn. Nothing is mandatory.')).toBeTruthy()
    expect(btn(view, 'Yes')).toBeTruthy()
    expect(btn(view, 'No')).toBeTruthy()

    // No consequences block — that belongs to the Ignore trigger only.
    expect(view.queryByText('Ignore this water event?')).toBeNull()
  })

  it('Yes opens "What was it?" with the fault chips and the fixed-state toggle', () => {
    const { view } = open()
    fireEvent.click(btn(view, 'Yes'))

    expect(view.getByText('Thanks — Wint learned from this.')).toBeTruthy()
    expect(view.getByText('What was it?')).toBeTruthy()
    for (const chip of [
      'Running or stuck toilet',
      'Leaking fixture',
      'Burst or broken pipe',
      'Irrigation stuck on',
      'Appliance leak',
      'Something else',
    ]) {
      expect(btn(view, chip), chip).toBeTruthy()
    }

    // Yes-branch only, and all three states — "Resolved on its own" is the
    // auto-shutoff / self-stop case and is why this is not a two-way toggle.
    expect(view.getByText('Was it fixed?')).toBeTruthy()
    expect(view.getByRole('radiogroup', { name: 'Was it fixed?' })).toBeTruthy()
    expect(fixedOpt(view, 'Fixed')).toBeTruthy()
    expect(fixedOpt(view, 'Not yet')).toBeTruthy()
    expect(fixedOpt(view, 'Resolved on its own')).toBeTruthy()
  })

  it('No opens "What was it really?" with the false-alarm chips and NO fixed-state toggle', () => {
    const { view } = open()
    fireEvent.click(btn(view, 'No'))

    expect(view.getByText('Thanks — Wint will be quieter here.')).toBeTruthy()
    expect(view.getByText('What was it really?')).toBeTruthy()
    for (const chip of [
      'Pool / tub / spa filling',
      'Scheduled irrigation',
      'Heavy use (cleaning / laundry / guests)',
      'Construction or maintenance',
      'One-off event',
      'Something else',
    ]) {
      expect(btn(view, chip), chip).toBeTruthy()
    }

    // "Was it fixed?" asks about a fault. There is no fault on this branch.
    expect(view.queryByText('Was it fixed?')).toBeNull()
  })

  it('a single tap on the primary answer can finish the whole thing', () => {
    const { view } = open()

    fireEvent.click(btn(view, 'Yes'))
    // Done is reachable immediately — no chip, no note, no toggle required.
    fireEvent.click(btn(view, 'Done'))

    expect(view.getByText('Thanks!')).toBeTruthy()
    const saved = getLatestFeedback(SYS.systemId)
    expect(saved.answer).toBe('yes')
    expect(saved.chips).toEqual([])
    expect(saved.note).toBeNull()
    expect(saved.fixed).toBeNull()
    expect(saved.points).toBe(5)
  })

  it('keeps a bare answer even when the sheet is dismissed instead of Done-ed', () => {
    // "Nothing is mandatory" is a lie if walking away throws the answer out.
    const { view, calls } = open()

    fireEvent.click(btn(view, 'No'))
    fireEvent.click(btn(view, 'Close'))

    expect(getLatestFeedback(SYS.systemId).answer).toBe('no')
    expect(calls.complete).toHaveLength(1)
    expect(calls.complete[0].answer).toBe('no')
    expect(calls.cancel).toEqual([])
  })

  it('records nothing, and cancels, when it is dismissed before the question is answered', () => {
    const { view, calls } = open()

    fireEvent.click(btn(view, 'Close'))

    expect(getFeedback(SYS.systemId)).toEqual([])
    expect(calls.cancel).toHaveLength(1)
    expect(calls.complete).toEqual([])
  })
})

describe('the optional note', () => {
  it('caps at 140 characters, in the field and in the counter', () => {
    const { view } = open()
    fireEvent.click(btn(view, 'Yes'))
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
  })

  it('"Something else" reveals the note by itself', () => {
    const { view } = open()
    fireEvent.click(btn(view, 'No'))
    expect(view.queryByRole('textbox', { name: 'Note (optional)' })).toBeNull()

    fireEvent.click(btn(view, 'Something else'))
    expect(view.getByRole('textbox', { name: 'Note (optional)' })).toBeTruthy()
  })

  it('persists chips, the fixed state and the note together', () => {
    const { view } = open()

    fireEvent.click(btn(view, 'Yes'))
    fireEvent.click(btn(view, 'Leaking fixture'))
    fireEvent.click(btn(view, 'Appliance leak'))
    fireEvent.click(fixedOpt(view, 'Resolved on its own'))
    fireEvent.click(btn(view, '+ Add note (optional)'))
    fireEvent.change(view.getByRole('textbox', { name: 'Note (optional)' }), {
      target: { value: '  under the sink  ' },
    })
    fireEvent.click(btn(view, 'Done'))

    const saved = getLatestFeedback(SYS.systemId)
    expect(saved.chips).toEqual(['Leaking fixture', 'Appliance leak'])
    expect(saved.fixed).toBe(FIXED_STATES.SELF_RESOLVED)
    expect(saved.note).toBe('under the sink')
    expect(saved.trigger).toBe('event-ended')
    expect(saved.systemId).toBe(SYS.systemId)
    expect(saved.actor).toBeTruthy()
    expect(saved.at).toBeGreaterThan(0)
    // 5 primary + 5 + 5 chips + 5 fixed + 10 note.
    expect(saved.points).toBe(30)
  })

  it('un-tapping a chip takes it, and its points, back off', () => {
    const { view } = open()

    fireEvent.click(btn(view, 'No'))
    fireEvent.click(btn(view, 'Scheduled irrigation'))
    fireEvent.click(btn(view, 'Scheduled irrigation'))
    fireEvent.click(btn(view, 'Done'))

    const saved = getLatestFeedback(SYS.systemId)
    expect(saved.chips).toEqual([])
    expect(saved.points).toBe(5)
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

  it('offers ONE flat set of CAUSES — no branch, and no per-branch heading', () => {
    const { view } = openIgnore()
    fireEvent.click(btn(view, 'Ignore anyway'))

    /* RULED 2026-10-31. 199748:26646 still draws six ignore REASONS and the
       component no longer transcribes them: the owner ruled the chips are
       CAUSES of the water instead, in this DOM order. The accepted
       consequence, stated by the owner: the ignore flow no longer captures
       WHY the alert was ignored, and the ignored-incident badge that read
       "Plumber scheduled" now reads "Stuck or running toilet". */
    const CAUSES = [
      'Stuck or running toilet',
      'Broken pipe',
      'Tap or hose left on',
      'Irrigation',
      'Cooling or HVAC',
      'Something else',
    ]
    for (const chip of CAUSES) {
      expect(btn(view, chip), chip).toBeTruthy()
    }

    // Order is pinned because the 2/2/2 wrap depends on it, and the wrap is
    // what keeps the step the same height as the frame it diverges from.
    const row = btn(view, CAUSES[0]).parentElement
    expect([...row.children].map((c) => c.textContent)).toEqual(CAUSES)

    // The frame's reasons went with the ruling. "Unnecessary Alert" did NOT —
    // it is still here, just no longer in this row. Its own case is below.
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

  /* "Unnecessary Alert" survived the 2026-10-31 ruling as its OWN control
     BELOW the causes: it is a verdict on the alert, not a cause, and it is
     the only false-positive report anywhere in the v2 app — the last trace of
     the retired "Was this worth alerting about?". Pinned so a future tidy-up
     can neither fold it back into the row nor drop it. */
  it('keeps "Unnecessary Alert" as its own control BELOW the cause row', () => {
    const { view } = openIgnore()
    fireEvent.click(btn(view, 'Ignore anyway'))

    const verdict = btn(view, 'Unnecessary Alert')
    const row = btn(view, 'Stuck or running toilet').parentElement

    // Outside the wrap, so it is not one of the six and cannot wrap into them.
    expect(row.contains(verdict)).toBe(false)
    // BELOW, not above — 4 is Node.DOCUMENT_POSITION_FOLLOWING.
    expect(row.compareDocumentPosition(verdict) & 4).toBeTruthy()

    // No heading and no helper copy was authored for it: none was ruled on,
    // and the retired question it descends from stays retired.
    expect(view.queryByText('Was this worth alerting about?')).toBeNull()
    expect(view.queryByText('Why ignore it then?')).toBeNull()
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

  it('records the chips against the ignore trigger, and scores nothing', () => {
    const { view } = openIgnore()
    fireEvent.click(btn(view, 'Ignore anyway'))
    fireEvent.click(btn(view, 'Broken pipe'))
    fireEvent.click(btn(view, 'Done'))

    const saved = getLatestFeedback(SYS.systemId)
    expect(saved.trigger).toBe('ignore')
    expect(saved.chips).toEqual(['Broken pipe'])
    expect(saved.fixed).toBeNull()
    // The frames award nothing. Points are the event-ended flow's alone now.
    expect(saved.points).toBe(0)
  })

  /* THE DERIVED `answer` — a shim, pinned so it cannot drift silently.
     The sheet no longer ASKS "was this worth alerting about?", but
     eventFeedbackStore.addFeedback:176 still rejects any record whose answer
     is not 'yes'/'no'. Since 2026-10-31 it is derived from the "Unnecessary
     Alert" CONTROL and no longer from the chip set — the chips are causes
     now, and `chips.includes('Unnecessary Alert')` would have gone
     permanently false the moment the labels changed, silently recording every
     ignore as 'yes'. Both halves of the mapping are pinned below, and the
     case after this one pins the third thing the ternary exists to make
     impossible. If the store's gate is ever relaxed, start here. */
  it('derives the answer from the Unnecessary Alert control, not from the chips', () => {
    const after = (taps) => {
      const { view } = openIgnore()
      fireEvent.click(btn(view, 'Ignore anyway'))
      for (const tap of taps) fireEvent.click(btn(view, tap))
      fireEvent.click(btn(view, 'Done'))
      const saved = getLatestFeedback(SYS.systemId)
      cleanup()
      localStorage.clear()
      clearAllFeedback()
      return saved
    }

    // The verdict alone is enough detail to write — it is what the record's
    // answer IS — and it is NOT folded into chips, because it is not a cause.
    const no = after(['Unnecessary Alert'])
    expect(no.answer).toBe('no')
    expect(no.chips).toEqual([])

    // A cause alone is the other half.
    expect(after(['Broken pipe']).answer).toBe('yes')

    // Both together: the cause is the chip, the verdict is still the answer.
    const both = after(['Broken pipe', 'Unnecessary Alert'])
    expect(both.answer).toBe('no')
    expect(both.chips).toEqual(['Broken pipe'])
  })

  /* THE TRAP THIS GUARDS. addFeedback's gate is unconditional AND silent: if
     the derived answer ever reaches it as undefined, it returns null for
     EVERY ignore record, onComplete fires with null, the ignored-incident
     summary is null and the badge never appears again — no error, no warning,
     total data loss. The untouched control is the state that would hit it. */
  it('still persists a record when the Unnecessary Alert control is untouched', () => {
    const { view, calls } = openIgnore()
    fireEvent.click(btn(view, 'Ignore anyway'))
    fireEvent.click(btn(view, 'Cooling or HVAC'))
    fireEvent.click(btn(view, 'Done'))

    const saved = getLatestFeedback(SYS.systemId)
    expect(saved).toBeTruthy()
    expect(saved.answer).toBe('yes')
    expect(saved.chips).toEqual(['Cooling or HVAC'])

    // And the caller gets the record, not the null that the gate would hand
    // back — which is the only thing distinguishing the two at the call site.
    expect(calls.complete).toHaveLength(1)
    expect(calls.complete[0]).not.toBeNull()
    expect(calls.complete[0].answer).toBe('yes')
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
  // The mockup ships "Jump to: Yes branch" / "Jump to: No branch" / "Reset
  // flow" for review. The component takes the same instruction as a prop.
  it.each([
    ['event-ended', 'yes', 'What was it?'],
    ['event-ended', 'no', 'What was it really?'],
  ])('%s / %s lands on its follow-up', (trigger, initialStep, heading) => {
    const { view } = open({ trigger, initialStep })
    expect(view.getByText(heading)).toBeTruthy()
    expect(btn(view, 'Done')).toBeTruthy()
  })

  /* The ignore flow has exactly two steps now (199745:20202 → 199748:26265),
     so there is no branch to jump to: anything that is not 'warning' resolves
     to the documentation step rather than rendering nothing. */
  it.each(['question', 'yes', 'no'])('ignore / %s lands on the documentation step', (initialStep) => {
    const { view } = open({ trigger: 'ignore', initialStep })
    expect(view.getByText('Help us improve')).toBeTruthy()
    expect(view.queryByText('Ignore this water event?')).toBeNull()
  })

  it('a jumped-to branch scores the primary answer it stands in for', () => {
    const { view } = open({ initialStep: 'yes' })
    fireEvent.click(btn(view, 'Done'))
    expect(getLatestFeedback(SYS.systemId).points).toBe(5)
  })

  it('reopening on a different step starts clean', () => {
    const { view, rerender, container } = open({ initialStep: 'yes' })
    fireEvent.click(btn(view, 'Leaking fixture'))

    rerender(<WaterEventFeedbackSheet open {...SYS} initialStep="no" />)
    const next = within(container)
    expect(next.getByText('What was it really?')).toBeTruthy()
    expect(next.queryByRole('button', { name: 'Leaking fixture' })).toBeNull()
  })

  it('Escape closes the ignore warning as a Cancel', () => {
    const { calls } = open({ trigger: 'ignore' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(calls.cancel).toHaveLength(1)
    expect(calls.ignoreConfirmed).toEqual([])
  })

  it('hands back after the Thanks panel has had its moment', () => {
    vi.useFakeTimers()
    try {
      const { view, calls } = open()
      fireEvent.click(btn(view, 'Yes'))
      fireEvent.click(btn(view, 'Done'))
      expect(calls.complete).toEqual([])
      vi.advanceTimersByTime(2000)
      expect(calls.complete).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('the store', () => {
  it('round-trips a record and counts it toward what Wint has learned', () => {
    const before = getLearnedCount()
    expect(getFeedbackCount()).toBe(0)

    const { view } = open()
    fireEvent.click(btn(view, 'Yes'))
    fireEvent.click(btn(view, 'Burst or broken pipe'))
    fireEvent.click(btn(view, 'Done'))

    expect(getFeedbackCount()).toBe(1)
    expect(getLearnedCount()).toBe(before + 1)
    // The Thanks panel quotes the store, not a constant.
    expect(view.getByText(String(before + 1))).toBeTruthy()

    // Survives a reload — it is on disk, not in a module-level cache.
    const raw = JSON.parse(localStorage.getItem('pulse2-event-feedback'))
    expect(raw[SYS.systemId]).toHaveLength(1)
    expect(raw[SYS.systemId][0].chips).toEqual(['Burst or broken pipe'])
  })

  it('keys by the event, not only the system, when a closed event id is given', () => {
    const { view } = open({ eventKey: 'evt-9981' })
    fireEvent.click(btn(view, 'No'))
    fireEvent.click(btn(view, 'Done'))

    expect(getFeedback('evt-9981')).toHaveLength(1)
    // The system is still recorded on the row, so the record is traceable.
    expect(getLatestFeedback('evt-9981').systemId).toBe(SYS.systemId)
    expect(getFeedback(SYS.systemId)).toEqual([])
  })

  it('lets one event carry both an ignore-time answer and an end-of-event one', () => {
    const first = open({ trigger: 'ignore' })
    fireEvent.click(btn(first.view, 'Ignore anyway'))
    fireEvent.click(btn(first.view, 'Tap or hose left on'))
    fireEvent.click(btn(first.view, 'Done'))
    cleanup()

    const second = open()
    fireEvent.click(btn(second.view, 'Yes'))
    fireEvent.click(btn(second.view, 'Done'))

    const all = getFeedback(SYS.systemId)
    expect(all).toHaveLength(2)
    expect(all[0].trigger).toBe('ignore')
    expect(all[1].trigger).toBe('event-ended')
  })
})
