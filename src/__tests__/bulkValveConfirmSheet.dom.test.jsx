// @vitest-environment happy-dom
//
// BulkValveConfirmSheet — the confirmation in front of closing or opening
// every valve across a location or an account.
//
// WHY THIS FILE EXISTS. The sheet's job is not "ask before acting", it is
// "prevent a wrong belief about what was just done". In production a bulk
// action is 100-1000 physical valves in occupied buildings, and some of those
// devices are offline and CANNOT be shut off — the owner's hard requirement is
// that the user must not walk away thinking they closed a valve that never
// moved. So what is pinned below is not styling, it is the four structural
// properties that carry that promise:
//
//   (a) ONE NUMBER, ONE MEANING — the headline count and the button label are
//       the same number, and it is the number that will be ATTEMPTED.
//   (b) THE NAMES, NOT JUST THE COUNT — the offline systems are listed by
//       name, reachable with no hover (there is no hover on a phone).
//   (c) THE EXCLUSIONS COME BEFORE THE COMMIT BUTTON IN DOM ORDER — the
//       inhibitive-attractor rule (Bravo-Lillo et al., SOUPS 2013/2014) as a
//       test, so a later refactor cannot quietly move them below the button.
//   (d) THE PRIMARY ARMS LATE — ~800ms of dead button defeats the double-tap
//       that would otherwise pass straight through from the opening control.
//
// ── ADDED 2026-11-02 BY THE REDESIGN ─────────────────────────────────────
//   (e) THE COMMIT BUTTON DOES NOT DISPATCH. It opens a CANCEL WINDOW — WCAG
//       SC 3.3.4's sufficient technique G164, "a stated time window in which
//       the user may amend or cancel a request" — and `onConfirm` fires when
//       that window expires. The command has not left for the devices while it
//       is counting down, which is the whole point: an undo protects someone
//       who makes a mistake without interrupting someone who doesn't.
//   (f) FRICTION SCALES TO BLAST RADIUS. One ladder, keyed on willActCount:
//       <=10 small (8s), 11-100 medium (15s), >100 or scopeKind='account'
//       large (20s + a forced acknowledgement). Uniform warnings are bypassed
//       up to 70.2% of the time at scale (Akhawe & Felt, USENIX 2013), so a
//       sheet that looks identical at 3 valves and at 900 is the defect.
//   (g) THE TOP-TIER GATE IS A CHECKBOX THAT RESTATES THE VARYING NUMBERS,
//       not type-to-confirm and not a longer timer. Bravo-Lillo (SOUPS 2014):
//       attractors that merely DELAYED dismissal habituated; the ones that
//       FORCED INTERACTION WITH THE FIELD CARRYING THE CHANGE did not.
//
// ONE PINNED ASSERTION WAS RE-EXPRESSED, NOT DELETED, and it is called out at
// its site: "leaves the primary disabled until the delay has been spent" used
// to end `fireEvent.click(confirm)` -> `onConfirm` called once. The click now
// opens the window; the dispatch is asserted at the end of it. Both halves of
// the original claim survive.
//
// WHAT THESE TESTS CANNOT DO. happy-dom has no layout engine and no
// elementFromPoint, so nothing here claims anything about layering, hit
// targets or what is actually visible on a 393x852 frame. DOM order is pinned
// because DOM order is real here; "the offline block sits above the button on
// screen" is a browser check and is not asserted. NOTHING BELOW CLAIMS THE
// SHEET NOW FITS THE FRAME — that is a browser measurement and there is no
// browser here.

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent, act, within } from '@testing-library/react'
import BulkValveConfirmSheet from '@/v2/components/BulkValveConfirmSheet'

afterEach(cleanup)

/* The component's own constants. Duplicated rather than exported: exporting a
   non-component from a component file trips react-refresh/only-export-components,
   and a test that re-declares the number is the test noticing if it moves. */
const ARMING_DELAY_MS = 800
/* HOLD_SECONDS, per tier. ROUND NUMBERS STANDING IN FOR TELEMETRY WE DO NOT
   HAVE — NN/g: "The exact threshold should be set through user research."
   These assertions pin the ladder's SHAPE (longer window as blast radius
   grows, gate only at the top), not the particular seconds. */
const HOLD_SMALL = 8
const HOLD_MEDIUM = 15
const HOLD_LARGE = 20

/* One act() per tick, deliberately. Advancing N*1000ms in a single act would
   fire only the FIRST timeout: each second's timer is scheduled by the render
   that the previous one caused, and that render has not happened yet inside
   one batched act. Second by second is the only way the countdown actually
   runs in fake time. */
const runHold = (seconds) => {
  for (let i = 0; i < seconds; i += 1) {
    act(() => { vi.advanceTimersByTime(1000) })
  }
}

const OFFLINE = [
  { id: 's1', name: 'Boiler room 2', lastSeenLabel: 'offline 3h ago' },
  { id: 's2', name: 'Roof plant', lastSeenLabel: 'offline 2 days ago' },
  { id: 's3', name: 'Garage riser', lastSeenLabel: 'offline 16m ago' },
]

const props = (over = {}) => ({
  action: 'close',
  scopeLabel: '320 Summit Blvd',
  scopeKind: 'location',
  willActCount: 31,
  offlineSystems: OFFLINE,
  noValveCount: 12,
  faultedCount: 2,
  alreadyInStateCount: 4,
  /* Default the delay AWAY in the tests that are not about the delay —
     otherwise every one of them has to drive a timer to reach the button. */
  skipArmingDelay: true,
  ...over,
})

describe('BulkValveConfirmSheet — it only exists when it is asked for', () => {
  it('renders nothing at all on action={null}', () => {
    const { container } = render(<BulkValveConfirmSheet {...props({ action: null })} />)
    expect(container.innerHTML).toBe('')
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})

describe('BulkValveConfirmSheet — one number, one meaning', () => {
  /* The headline is what will be ATTEMPTED, never what was selected: 31 act,
     while 3 + 12 + 2 + 4 do not. If these two ever disagree the sheet is
     lying about the blast radius, which is the single failure it exists to
     prevent. */
  it('prints willActCount in the headline and the same number in the button', () => {
    render(<BulkValveConfirmSheet {...props()} />)

    expect(screen.getByText('31')).toBeInTheDocument()
    expect(screen.getByText('valves will close')).toBeInTheDocument()

    const confirm = screen.getByRole('button', { name: /Close 31 valves/ })
    expect(confirm.textContent).toContain('31')
  })

  it('carries the count into the button on open too, with the default variant', () => {
    render(<BulkValveConfirmSheet {...props({ action: 'open', willActCount: 8 })} />)
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('valves will open')).toBeInTheDocument()
    const confirm = screen.getByRole('button', { name: /Open 8 valves/ })
    /* Opening resumes flow — it is not destructive, and the red button would
       be a lie about which direction is dangerous. */
    expect(confirm.getAttribute('data-variant')).toBe('default')
  })

  it('uses the destructive variant for the close direction', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    const confirm = screen.getByRole('button', { name: /Close 31 valves/ })
    expect(confirm.getAttribute('data-variant')).toBe('destructive')
  })

  it('always shows the scope, so "31 valves" is never scopeless', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    expect(screen.getByText('320 Summit Blvd')).toBeInTheDocument()
    expect(screen.getByText('Every system at this location')).toBeInTheDocument()

    cleanup()
    render(<BulkValveConfirmSheet {...props({ scopeKind: 'account', scopeLabel: 'Northgate REIT' })} />)
    expect(screen.getByText('Northgate REIT')).toBeInTheDocument()
    expect(screen.getByText('Every system in this account')).toBeInTheDocument()
  })

  /* THE THIRD KIND. ValveManagementScreen acts over a SELECTION, not over a
     scope, so both scope-wide sentences are false there — and the screen used
     to work around that by smuggling "2 of 5 systems selected" into
     scopeLabel, which printed a second count directly above the headline
     count. The sentence states the fact in the line whose job it is. */
  it("says a selection is a SUBSET, on scopeKind='selection'", () => {
    render(<BulkValveConfirmSheet {...props({ scopeKind: 'selection' })} />)

    expect(screen.getByText('320 Summit Blvd')).toBeInTheDocument()
    expect(
      screen.getByText('Only the systems you selected — not every system here'),
    ).toBeInTheDocument()
    // and it must not also claim the scope-wide reach it is denying
    expect(screen.queryByText('Every system at this location')).toBeNull()
    expect(screen.queryByText('Every system in this account')).toBeNull()
  })

  /* scopeKind IS ADDITIVE. ValveManagementCard still accepts the prop and
     other code may pass it, so a new value may not move an old one and the
     default may not move either. An unknown value keeps falling through to
     the location sentence rather than rendering nothing — a sheet with no
     scope line is a count with no blast radius. */
  it('keeps the existing kinds, the default and the unknown fallback unchanged', () => {
    const line = { location: 'Every system at this location', account: 'Every system in this account' }

    render(<BulkValveConfirmSheet {...props({ scopeKind: 'location' })} />)
    expect(screen.getByText(line.location)).toBeInTheDocument()

    cleanup()
    render(<BulkValveConfirmSheet {...props({ scopeKind: 'account' })} />)
    expect(screen.getByText(line.account)).toBeInTheDocument()

    cleanup()
    const { scopeKind: _omitted, ...noKind } = props()
    render(<BulkValveConfirmSheet {...noKind} />)
    expect(screen.getByText(line.location)).toBeInTheDocument()

    cleanup()
    render(<BulkValveConfirmSheet {...props({ scopeKind: 'fleet' })} />)
    expect(screen.getByText(line.location)).toBeInTheDocument()
  })
})

describe('BulkValveConfirmSheet — the offline bucket is the whole point', () => {
  /* THE OWNER'S REQUIREMENT, verbatim: "we have a kind of offline devices that
     the valve cannot be shut off. So we need to explain the user this
     situation somehow and to not let him think that this valve will take place
     on this operation that he wants to." */
  it('shows the count AND the names, with no hover and no opening gesture', () => {
    render(<BulkValveConfirmSheet {...props()} />)

    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('systems are offline')).toBeInTheDocument()

    // The names are in the document as rendered — nothing was hovered, nothing
    // was clicked. A tooltip would fail this, and on a phone a tooltip does
    // not exist at all.
    expect(screen.getByText(/Boiler room 2/)).toBeInTheDocument()
    expect(screen.getByText(/Roof plant/)).toBeInTheDocument()
    expect(screen.getByText(/Garage riser/)).toBeInTheDocument()

    // And when each was last heard from, so "offline" is concrete.
    expect(screen.getByText(/Boiler room 2/).textContent).toContain('offline 3h ago')

    // The disclosure is open on arrival; it collapses a long list after it has
    // been seen, it does not hide it before.
    const toggle = screen.getByRole('button', { expanded: true })
    expect(toggle.textContent).toContain('systems are offline')
    fireEvent.click(toggle)
    expect(screen.queryByText(/Boiler room 2/)).toBeNull()
  })

  /* (c) THE INHIBITIVE ATTRACTOR, as a test. The exclusions sit between the
     user and the commit button; if a refactor moves them below it, this goes
     red rather than the behaviour going quiet. */
  it('renders the offline block ABOVE the confirm button in DOM order', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    const offlineName = screen.getByText(/Boiler room 2/)
    const confirm = screen.getByRole('button', { name: /Close 31 valves/ })
    const FOLLOWING = window.Node.DOCUMENT_POSITION_FOLLOWING

    expect(offlineName.compareDocumentPosition(confirm) & FOLLOWING).toBeTruthy()
    expect(confirm.compareDocumentPosition(offlineName) & FOLLOWING).toBeFalsy()

    // The count row and the heading are above it too, not only the names.
    expect(
      screen.getByText('systems are offline').compareDocumentPosition(confirm) & FOLLOWING,
    ).toBeTruthy()
    expect(screen.getByText('Not included').compareDocumentPosition(confirm) & FOLLOWING).toBeTruthy()
  })

  it('states the water consequence of being offline, not the network one', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    // A facility manager acts on water, not on packets.
    expect(screen.getByText(/water keeps running there/i)).toBeInTheDocument()
    // And nothing promises a retry: nothing queues these.
    expect(screen.queryByText(/will be (closed|opened) later/i)).toBeNull()
    expect(screen.queryByText(/queue/i)).toBeNull()
  })

  it('uses the product’s own state words', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    expect(screen.getByText('have no valve installed')).toBeInTheDocument()
    expect(screen.getByText('are in Valve Error')).toBeInTheDocument()
    expect(screen.getByText('are already Closed')).toBeInTheDocument()
    // "Unreachable" appears nowhere in this product and is not introduced here.
    expect(document.body.textContent).not.toMatch(/unreachable/i)
  })

  /* A confirmation that always shows empty buckets is noise, and noise is what
     habituation feeds on. */
  it('drops the exclusion section entirely when there is nothing to exclude', () => {
    render(
      <BulkValveConfirmSheet
        {...props({
          offlineSystems: [],
          noValveCount: 0,
          faultedCount: 0,
          alreadyInStateCount: 0,
        })}
      />,
    )
    expect(screen.queryByText('Not included')).toBeNull()
    expect(screen.queryByText(/offline/i)).toBeNull()
    expect(screen.queryByText(/no valve installed/i)).toBeNull()
    expect(screen.queryByText(/Valve Error/i)).toBeNull()
    // The sheet itself is still there and still commits.
    expect(screen.getByRole('button', { name: /Close 31 valves/ })).toBeInTheDocument()
  })
})

describe('BulkValveConfirmSheet — the fifth valve state, mid-transition', () => {
  /* `closing` is a real runtime value, not a theoretical one: it is minted at
     src/lib/pushEvents.js:153 and overlaid onto sys.valve by
     src/data/systems.js:206 (pushLifecycle.test.js:131 pins that it arrives as
     sys.valve === 'closing'), and valveScope.js:167 rules it NOT actionable —
     targetsFor(...).skipped.closing. A valve in that bucket is excluded from
     the command, so if this sheet does not name it the user is left with
     exactly the wrong belief the sheet exists to prevent, arriving through a
     different door than offline does. */
  it('names the mid-transition bucket, with its count', () => {
    render(<BulkValveConfirmSheet {...props({ closingCount: 5 })} />)

    expect(screen.getByText('5')).toBeInTheDocument()
    // The designer's own words for the state (Figma board 199535:96542 draws
    // it as "Verifying closure (allow a few min)"), not an invented synonym.
    expect(screen.getByText('are verifying closure')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/in transit|pending/i)
  })

  it('says it in water, and promises no retry', () => {
    render(<BulkValveConfirmSheet {...props({ closingCount: 5 })} />)
    expect(screen.getByText(/Water is stopping there/i)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/will be (closed|opened) later/i)
    expect(document.body.textContent).not.toMatch(/queue/i)
  })

  it('reads as its own reason on the open direction too', () => {
    render(<BulkValveConfirmSheet {...props({ action: 'open', closingCount: 1 })} />)
    expect(screen.getByText('is verifying closure')).toBeInTheDocument()
    expect(screen.getByText(/this will not bring it back/i)).toBeInTheDocument()
  })

  /* It is a DIFFERENT reason from being offline, and must read as one: not
     folded into the offline list, and not into "already Closed". */
  it('stands apart from the offline list and from already-Closed', () => {
    render(<BulkValveConfirmSheet {...props({ closingCount: 5 })} />)
    const list = screen.getByText(/Boiler room 2/).closest('ul')
    expect(list.textContent).not.toMatch(/verifying closure/i)
    expect(screen.getByText('are already Closed')).toBeInTheDocument()
  })

  /* The bucket participates in the no-noise rule rather than defeating it:
     on its own it is enough to open the section, and with nothing else there
     it is the only bucket drawn. */
  it('is enough on its own to render the exclusion section', () => {
    render(
      <BulkValveConfirmSheet
        {...props({
          offlineSystems: [],
          noValveCount: 0,
          faultedCount: 0,
          alreadyInStateCount: 0,
          closingCount: 2,
        })}
      />,
    )
    expect(screen.getByText('Not included')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('are verifying closure')).toBeInTheDocument()
    // Still only its own bucket — the empty ones stay out.
    expect(screen.queryByText(/offline/i)).toBeNull()
    expect(screen.queryByText(/no valve installed/i)).toBeNull()
    expect(screen.queryByText(/Valve Error/i)).toBeNull()
  })

  /* (c) again, for the new bucket: an exclusion below the commit button is an
     exclusion the thumb never passes. */
  it('renders the mid-transition block ABOVE the confirm button in DOM order', () => {
    render(<BulkValveConfirmSheet {...props({ closingCount: 5 })} />)
    const label = screen.getByText('are verifying closure')
    const confirm = screen.getByRole('button', { name: /Close 31 valves/ })
    const FOLLOWING = window.Node.DOCUMENT_POSITION_FOLLOWING

    expect(label.compareDocumentPosition(confirm) & FOLLOWING).toBeTruthy()
    expect(confirm.compareDocumentPosition(label) & FOLLOWING).toBeFalsy()
    // The consequence line travels with it, not after the button.
    expect(
      screen.getByText(/Water is stopping there/i).compareDocumentPosition(confirm) & FOLLOWING,
    ).toBeTruthy()
  })

  /* BACKWARDS COMPATIBILITY, as a test. ValveManagementCard is being written
     against the four-bucket signature; an omitted `closingCount` must render
     exactly what it rendered before — no empty bucket, no stray zero, and no
     change to the headline or the button. */
  it('defaults to 0: an omitted prop renders nothing and changes nothing', () => {
    const fourBucket = props()
    expect(fourBucket).not.toHaveProperty('closingCount')

    render(<BulkValveConfirmSheet {...fourBucket} />)
    expect(screen.queryByText(/verifying closure/i)).toBeNull()
    expect(screen.queryByText(/allow a few min/i)).toBeNull()

    // The rest of the sheet is untouched: one number, one meaning.
    expect(screen.getByText('31')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Close 31 valves/ })).toBeInTheDocument()
    expect(screen.getByText('Not included')).toBeInTheDocument()
  })

  it('keeps the section away when every bucket including closing is empty', () => {
    render(
      <BulkValveConfirmSheet
        {...props({
          offlineSystems: [],
          noValveCount: 0,
          faultedCount: 0,
          alreadyInStateCount: 0,
          closingCount: 0,
        })}
      />,
    )
    expect(screen.queryByText('Not included')).toBeNull()
    expect(screen.queryByText(/verifying closure/i)).toBeNull()
    expect(screen.getByRole('button', { name: /Close 31 valves/ })).toBeInTheDocument()
  })
})

describe('BulkValveConfirmSheet — the arming delay', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { cleanup(); vi.useRealTimers() })

  /* ~800ms of dead button. The threat is the second half of a double-tap on
     whatever control opened the sheet landing on the confirm button — which on
     a destructive fleet action means water off in a building nobody asked
     about. */
  /* RE-EXPRESSED 2026-11-02, NOT DELETED. The last two lines used to be
     `fireEvent.click(confirm)` -> `expect(onConfirm).toHaveBeenCalledTimes(1)`.
     That is no longer what the commit button does: it opens the cancel window
     (G164) and `onConfirm` now means DISPATCH NOW. Both halves of the original
     claim are still pinned — the button is dead until the delay is spent, and
     a click after it is what ultimately commits — with the commit moved to the
     far end of the window, which is where the redesign put it. The arming
     delay itself is UNCHANGED and is still 800ms at every tier: its job was
     never to make anyone read, it is input hygiene against the second half of
     a double-tap landing on a live control. */
  it('leaves the primary disabled until the delay has been spent', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ skipArmingDelay: false, onConfirm })} />)

    const confirm = screen.getByRole('button', { name: /Close 31 valves/ })
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    expect(onConfirm).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(ARMING_DELAY_MS - 1) })
    expect(confirm).toBeDisabled()

    act(() => { vi.advanceTimersByTime(1) })
    expect(confirm).toBeEnabled()

    fireEvent.click(confirm)
    // The click opened the window; nothing has left for the devices yet.
    expect(onConfirm).not.toHaveBeenCalled()
    runHold(HOLD_MEDIUM)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  /* Cancel is never delayed — backing out of a dangerous action must be the
     cheapest thing on the sheet. */
  it('never delays the way out', () => {
    const onCancel = vi.fn()
    render(<BulkValveConfirmSheet {...props({ skipArmingDelay: false, onCancel })} />)
    /* Two controls answer to "Cancel": the full-bleed scrim and the button.
       The footer one is the last in DOM order. Both must be live. */
    const cancels = screen.getAllByRole('button', { name: 'Cancel' })
    expect(cancels).toHaveLength(2)
    for (const c of cancels) expect(c).toBeEnabled()
    expect(cancels[cancels.length - 1].textContent).toBe('Cancel')
    fireEvent.click(cancels[cancels.length - 1])
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  /* The escape hatch exists because an emergency path may later need the delay
     gone. It is off by default, which is the half that matters. */
  it('arms immediately when the caller opts out', () => {
    render(<BulkValveConfirmSheet {...props({ skipArmingDelay: true })} />)
    expect(screen.getByRole('button', { name: /Close 31 valves/ })).toBeEnabled()
  })

  it('re-arms when the sheet is reopened, not once per mount', () => {
    const { rerender } = render(
      <BulkValveConfirmSheet {...props({ skipArmingDelay: false, action: 'close' })} />,
    )
    act(() => { vi.advanceTimersByTime(ARMING_DELAY_MS) })
    expect(screen.getByRole('button', { name: /Close 31 valves/ })).toBeEnabled()

    rerender(<BulkValveConfirmSheet {...props({ skipArmingDelay: false, action: null })} />)
    rerender(<BulkValveConfirmSheet {...props({ skipArmingDelay: false, action: 'close' })} />)
    expect(screen.getByRole('button', { name: /Close 31 valves/ })).toBeDisabled()
  })

  it('keeps the primary dead while a command is already in flight', () => {
    render(<BulkValveConfirmSheet {...props({ skipArmingDelay: true, busy: true })} />)
    expect(screen.getByRole('button', { name: /Close 31 valves/ })).toBeDisabled()
  })
})

describe('BulkValveConfirmSheet — dismissal and semantics', () => {
  it('cancels on Escape, which an in-frame overlay has to wire itself', () => {
    const onCancel = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onCancel })} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('stops listening for Escape once it is closed', () => {
    const onCancel = vi.fn()
    const { rerender } = render(<BulkValveConfirmSheet {...props({ onCancel })} />)
    rerender(<BulkValveConfirmSheet {...props({ onCancel, action: null })} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()
  })

  /* alertdialog, not dialog: this is a destructive confirmation, which is what
     the role is for. The name has to RESOLVE — an aria-labelledby pointing at
     nothing is worse than no label, because it reads as empty. */
  it('is an alertdialog with a resolvable accessible name and description', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    const dialog = screen.getByRole('alertdialog', { name: 'Close water supply' })
    expect(dialog).toBeInTheDocument()
    expect(dialog.getAttribute('aria-modal')).toBe('true')

    const describedBy = dialog.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const description = document.getElementById(describedBy)
    expect(description).not.toBeNull()
    // The description is the water consequence, not a restatement of the title.
    expect(description.textContent).toBe('Water stops in these areas.')
  })

  /* Copy the product has decided AGAINST. "This action cannot be undone" is
     false here — you can reopen the valve — and saying the false thing trains
     people to ignore the true one. */
  it('writes neither of the two banned sentences', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    expect(document.body.textContent).not.toMatch(/are you sure/i)
    expect(document.body.textContent).not.toMatch(/cannot be undone/i)
    // And not the per-system sheet's sentence, which was written for 1-3
    // devices inside ONE system.
    expect(document.body.textContent).not.toMatch(/on this system/i)
  })
})

describe('BulkValveConfirmSheet — nothing escapes the 393x852 frame', () => {
  /* Mirrors accountScreenV2.dom.test.jsx:344. shadcn's <Sheet> is a Radix
     dialog that portals to document.body; this app draws inside Phone.jsx's
     fixed overflow-hidden frame, so a portal renders across the whole browser
     window with the phone sitting in the middle of it. happy-dom cannot see
     that — but it CAN see where the nodes landed, which is what decides it. */
  it('renders in the caller’s container, not through a portal', () => {
    const { container } = render(<BulkValveConfirmSheet {...props()} />)
    const dialog = screen.getByRole('alertdialog')

    // (a) It lives inside the rendered container. A portal would have attached
    //     it to document.body instead.
    expect(container.contains(dialog)).toBe(true)
    expect(document.body.firstElementChild).toBe(container)
    expect(document.body.childElementCount).toBe(1)

    // (b) It is the house in-frame overlay: absolute inset-0, as
    //     ValveConfirmSheet and SystemsFilterSheet are.
    expect(dialog.className).toMatch(/\babsolute\b/)
    expect(dialog.className).toMatch(/\binset-0\b/)
    expect(dialog.className).not.toMatch(/\bfixed\b/)

    // (c) Nothing in the subtree escapes the frame by position either.
    for (const el of container.querySelectorAll('[style]')) {
      expect(el.getAttribute('style') || '').not.toMatch(/position:\s*fixed/)
    }
  })

  it('treats a tap on the scrim as a cancel, never as a commit', () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    const { container } = render(<BulkValveConfirmSheet {...props({ onCancel, onConfirm })} />)
    const dialog = screen.getByRole('alertdialog')
    const scrim = within(dialog).getAllByRole('button', { name: 'Cancel' })[0]

    expect(container.contains(scrim)).toBe(true)
    fireEvent.click(scrim)
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

describe('BulkValveConfirmSheet — the cancel window IS the design (WCAG G164)', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { cleanup(); vi.useRealTimers() })

  /* THE REFRAME. Confirmation-only design assumes the command leaves the
     instant the user taps. It does not — we control dispatch — and WCAG's
     sufficient technique for SC 3.3.4 is literally "a stated time window in
     which the user may amend or cancel a request". For the seconds in which a
     slip is actually noticed, this moves the whole interaction out of the
     confirmation class and into the undo class. */
  it('opens a window on commit and dispatches only when it expires', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onConfirm })} />)

    fireEvent.click(screen.getByRole('button', { name: /Close 31 valves/ }))
    expect(onConfirm).not.toHaveBeenCalled()

    // A Stop is on screen for the whole window, and the commit button is gone:
    // there is exactly one live control and it is the way out.
    expect(screen.getByRole('button', { name: /^Stop/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Close 31 valves$/ })).toBeNull()

    runHold(HOLD_MEDIUM - 1)
    expect(onConfirm).not.toHaveBeenCalled()
    runHold(1)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('dispatches exactly once, however long the clock keeps running', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onConfirm })} />)
    fireEvent.click(screen.getByRole('button', { name: /Close 31 valves/ }))
    runHold(HOLD_MEDIUM + 10)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  /* The window is worthless if stopping it is hard. Three ways out, all live
     for the whole countdown, none of them delayed. */
  it('stops the dispatch from the Stop button', () => {
    const onConfirm = vi.fn()
    const onHoldStop = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onConfirm, onHoldStop })} />)

    fireEvent.click(screen.getByRole('button', { name: /Close 31 valves/ }))
    runHold(3)
    fireEvent.click(screen.getByRole('button', { name: /^Stop/ }))

    expect(onHoldStop).toHaveBeenCalledTimes(1)
    runHold(HOLD_MEDIUM + 5)
    expect(onConfirm).not.toHaveBeenCalled()
    // and the user is back on the review, not dumped out of it
    expect(screen.getByRole('button', { name: /Close 31 valves/ })).toBeInTheDocument()
    expect(screen.getByText('320 Summit Blvd')).toBeInTheDocument()
  })

  /* MID-HOLD, ESCAPE STOPS THE COMMAND RATHER THAN CLOSING THE SHEET. The
     dangerous thing in flight is the dispatch, not the dialog, so the way out
     does the safest available thing. */
  it('stops the dispatch on Escape, and does not also dismiss', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onConfirm, onCancel })} />)

    fireEvent.click(screen.getByRole('button', { name: /Close 31 valves/ }))
    runHold(2)
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onCancel).not.toHaveBeenCalled()
    runHold(HOLD_MEDIUM + 5)
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Close 31 valves/ })).toBeInTheDocument()
  })

  it('stops the dispatch on a scrim tap, and never turns one into a commit', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onConfirm, onCancel })} />)

    fireEvent.click(screen.getByRole('button', { name: /Close 31 valves/ }))
    runHold(2)
    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Cancel' })[0])

    expect(onCancel).not.toHaveBeenCalled()
    runHold(HOLD_MEDIUM + 5)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  /* THE SCREEN MUST BE ABLE TO DRAW THIS SOMEWHERE OF ITS OWN — a banner that
     outlives the sheet, say. The sheet draws its own countdown regardless, so
     all three callbacks are optional; this pins their shape. */
  it('reports the window to the caller: start, every tick, and zero', () => {
    const onHoldStart = vi.fn()
    const onHoldTick = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onHoldStart, onHoldTick })} />)

    fireEvent.click(screen.getByRole('button', { name: /Close 31 valves/ }))
    expect(onHoldStart).toHaveBeenCalledWith({
      action: 'close',
      willActCount: 31,
      seconds: HOLD_MEDIUM,
    })
    expect(onHoldTick).toHaveBeenLastCalledWith(HOLD_MEDIUM)

    runHold(1)
    expect(onHoldTick).toHaveBeenLastCalledWith(HOLD_MEDIUM - 1)
    runHold(HOLD_MEDIUM - 1)
    expect(onHoldTick).toHaveBeenLastCalledWith(0)
  })

  /* `holdSeconds` is the caller's override and 0 means "no window" — the
     escape hatch an emergency path will want, next to `skipArmingDelay`. */
  it('honours a caller-supplied window length, and 0 means dispatch now', () => {
    const onConfirm = vi.fn()
    const { rerender } = render(
      <BulkValveConfirmSheet {...props({ onConfirm, holdSeconds: 3 })} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Close 31 valves/ }))
    runHold(2)
    expect(onConfirm).not.toHaveBeenCalled()
    runHold(1)
    expect(onConfirm).toHaveBeenCalledTimes(1)

    rerender(<BulkValveConfirmSheet {...props({ onConfirm, action: null })} />)
    rerender(<BulkValveConfirmSheet {...props({ onConfirm, holdSeconds: 0 })} />)
    fireEvent.click(screen.getByRole('button', { name: /Close 31 valves/ }))
    expect(onConfirm).toHaveBeenCalledTimes(2)
  })

  /* IEC 61850's control model is SelectWithValue -> Operate ->
     CommandTermination, and termination — the device confirming it REACHED the
     commanded state — can arrive much later or not at all. This repo has no
     such channel, so the sheet shows the two states it can honestly show and
     refuses to paint the third. */
  it('says SENT, and says that sent is not closed', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    fireEvent.click(screen.getByRole('button', { name: /Close 31 valves/ }))
    runHold(HOLD_MEDIUM)

    /* Twice on purpose, and exactly twice: once visibly (aria-hidden, because
       it ticks) and once in the sr-only live region that carries ONE stable
       sentence instead of announcing a new number every second. */
    const sent = screen.getAllByText('Sent to 31 valves')
    expect(sent).toHaveLength(2)
    expect(sent.filter((n) => n.className.includes('sr-only'))).toHaveLength(1)
    expect(document.body.textContent).toMatch(/Sent is not the same as closed/)
    // No "done", and no Stop for a command already gone.
    expect(screen.queryByRole('button', { name: /^Stop/ })).toBeNull()
    expect(document.body.textContent).not.toMatch(/31 valves closed/i)
  })

  it('clears a window that was never finished when the decision changes', () => {
    const onConfirm = vi.fn()
    const { rerender } = render(<BulkValveConfirmSheet {...props({ onConfirm })} />)
    fireEvent.click(screen.getByRole('button', { name: /Close 31 valves/ }))
    runHold(2)

    rerender(<BulkValveConfirmSheet {...props({ onConfirm, action: null })} />)
    rerender(<BulkValveConfirmSheet {...props({ onConfirm, action: 'open' })} />)
    runHold(HOLD_MEDIUM + 5)

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Open 31 valves/ })).toBeInTheDocument()
  })
})

describe('BulkValveConfirmSheet — the window skip, with real timers', () => {
  /* The back-compatible escape hatch: `skipHold` restores the pre-redesign
     behaviour exactly, so a caller that cannot yet carry the window is one
     prop away from working. Off by default, which is the half that matters. */
  it('dispatches on the click when the caller opts out of the window', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onConfirm, skipHold: true })} />)
    fireEvent.click(screen.getByRole('button', { name: /Close 31 valves/ }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /^Stop/ })).toBeNull()
  })
})

describe('BulkValveConfirmSheet — friction scales to blast radius', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { cleanup(); vi.useRealTimers() })

  /* THE LADDER'S SHAPE, not its seconds: the window grows with the number of
     valves. Uniform treatment is the documented failure — Akhawe & Felt
     measured up to 70.2% click-through across ~25M real warning impressions,
     and clinical override rates run 50-80%. A sheet identical at 3 valves and
     at 900 teaches the user that it is always identical. */
  const windowFor = (over) => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onConfirm, ...over })} />)
    const ack = screen.queryByRole('checkbox')
    if (ack) fireEvent.click(ack)
    fireEvent.click(screen.getByRole('button', { name: /^(Close|Open) \d+ valves?$/ }))
    let seconds = 0
    while (onConfirm.mock.calls.length === 0 && seconds < 120) {
      runHold(1)
      seconds += 1
    }
    cleanup()
    return seconds
  }

  it('gives a bigger action a longer window', () => {
    const small = windowFor({ willActCount: 7 })
    const medium = windowFor({ willActCount: 31 })
    const large = windowFor({ willActCount: 412 })

    expect(small).toBe(HOLD_SMALL)
    expect(medium).toBe(HOLD_MEDIUM)
    expect(large).toBe(HOLD_LARGE)
    expect(small).toBeLessThan(medium)
    expect(medium).toBeLessThan(large)
  })

  /* An account action is unbounded by construction — it is whatever the
     hierarchy happens to hold today — so it is top tier whatever the count
     says. */
  it("treats scopeKind='account' as top tier at any count", () => {
    expect(windowFor({ willActCount: 31, scopeKind: 'account' })).toBe(HOLD_LARGE)
  })

  it('leaves the small tier with no extra gate at all', () => {
    render(<BulkValveConfirmSheet {...props({ willActCount: 7 })} />)
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getByRole('button', { name: /Close 7 valves/ })).toBeEnabled()
  })

  it('leaves the middle tier with the review but no gate', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getByRole('button', { name: /Close 31 valves/ })).toBeEnabled()
    // the full review is still there
    expect(screen.getByText('Not included')).toBeInTheDocument()
    expect(screen.getByText('systems are offline')).toBeInTheDocument()
  })
})

describe('BulkValveConfirmSheet — the top-tier gate', () => {
  /* NOT TYPE-TO-CONFIRM. The argument against it here is the keyboard and the
     frame, NOT accessibility: the "documented accessibility problems" of
     type-to-confirm are widely asserted and, on searching, not actually
     documented — no WCAG failure, no study, no design-system citation. On a
     393px frame the software keyboard covers the scope summary the user is
     meant to be checking, and the string is on screen to copy from.

     WHAT IT IS INSTEAD: forced interaction with the field that carries the
     varying content, which is the treatment Bravo-Lillo (SOUPS 2014) found
     "resilient to habituation" where pure delays were not. It maps onto WCAG
     technique G155 (a checkbox in addition to the submit button). THE
     COMPOSITION IS A SYNTHESIS, NOT A PUBLISHED TESTED PATTERN. */
  it('holds the commit inert until the row is tapped', () => {
    render(<BulkValveConfirmSheet {...props({ willActCount: 412 })} />)
    const confirm = screen.getByRole('button', { name: /Close 412 valves/ })
    expect(confirm).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox'))
    expect(confirm).toBeEnabled()
  })

  it('restates the varying count and the scope inside the tappable row', () => {
    render(
      <BulkValveConfirmSheet {...props({ willActCount: 412, scopeLabel: 'Northgate REIT' })} />,
    )
    const row = screen.getByText(/I understand this stops water at 412 valves/)
    // the numbers are IN the row, not merely near it
    expect(row.textContent).toContain('412')
    expect(row.textContent).toContain('Northgate REIT')
    const label = row.closest('label')
    expect(label).not.toBeNull()
    expect(within(label).getByRole('checkbox')).toBeInTheDocument()
  })

  /* POLYMORPHIC BY CONSTRUCTION: the sentence is different on every
     invocation because the count and the scope are. That is the property
     Vance et al. (CHI 2017) found reduces habituation — not the wording. */
  it('says something different on a different action', () => {
    const { rerender } = render(<BulkValveConfirmSheet {...props({ willActCount: 412 })} />)
    const first = screen.getByRole('checkbox').closest('label').textContent

    rerender(<BulkValveConfirmSheet {...props({ action: null })} />)
    rerender(
      <BulkValveConfirmSheet
        {...props({ action: 'open', willActCount: 903, scopeLabel: 'Pier 9' })}
      />,
    )
    const second = screen.getByRole('checkbox').closest('label').textContent

    expect(second).not.toBe(first)
    expect(second).toContain('903')
    expect(second).toMatch(/starts water/)
  })

  /* ONE DECISION, ONE ACKNOWLEDGEMENT. A tick for "412 valves at Northgate
     REIT" is not consent to anything about the next decision. */
  it('clears the tick when the decision changes', () => {
    const { rerender } = render(<BulkValveConfirmSheet {...props({ willActCount: 412 })} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', { name: /Close 412 valves/ })).toBeEnabled()

    rerender(<BulkValveConfirmSheet {...props({ action: null })} />)
    rerender(<BulkValveConfirmSheet {...props({ action: 'open', willActCount: 412 })} />)
    expect(screen.getByRole('button', { name: /Open 412 valves/ })).toBeDisabled()
  })

  it('says why the primary is inert, so it does not read as broken', () => {
    render(<BulkValveConfirmSheet {...props({ willActCount: 412 })} />)
    expect(screen.getByText(/Tick the box above/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.queryByText(/Tick the box above/)).toBeNull()
  })

  /* The gate never gates the way OUT. */
  it('leaves Cancel live while the gate is unticked', () => {
    const onCancel = vi.fn()
    render(<BulkValveConfirmSheet {...props({ willActCount: 412, onCancel })} />)
    const cancels = screen.getAllByRole('button', { name: 'Cancel' })
    expect(cancels).toHaveLength(2)
    for (const c of cancels) expect(c).toBeEnabled()
    fireEvent.click(cancels[cancels.length - 1])
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('BulkValveConfirmSheet — compressed, with nothing dropped', () => {
  /* THE SET MUST STAY CLOSED. Five copy-pasted three-line blocks became one
     row each, rendered from a list. Every bucket is pinned behaviour and
     encodes the owner's own requirement; none was cut. */
  it('draws one row per bucket and still states every fact', () => {
    render(<BulkValveConfirmSheet {...props({ closingCount: 5 })} />)

    const list = screen.getByText('Not included').nextElementSibling
    expect(list.tagName).toBe('UL')
    // four rows: offline is PROMOTED out of this list, to its own line under
    // the headline, and is deliberately not repeated here.
    expect(list.querySelectorAll('li')).toHaveLength(4)

    // all five facts, offline included, are still on the sheet
    expect(screen.getByText('systems are offline')).toBeInTheDocument()
    expect(screen.getByText('have no valve installed')).toBeInTheDocument()
    expect(screen.getByText('are in Valve Error')).toBeInTheDocument()
    expect(screen.getByText('are verifying closure')).toBeInTheDocument()
    expect(screen.getByText('are already Closed')).toBeInTheDocument()

    // and each still carries its own water consequence, not just a label
    expect(screen.getByText('Water here is not controlled by a valve.')).toBeInTheDocument()
    expect(screen.getByText(/Treat their water as unchanged/)).toBeInTheDocument()
    expect(screen.getByText(/Water is already off there/)).toBeInTheDocument()
  })

  /* THE OWNER'S HARD REQUIREMENT IS NOT FIFTH DOWN A LIST. The headline and
     the button count only ELIGIBLE valves; the offline line is the distinct,
     adjacent statement of what is not in that number. */
  it('puts the offline line next to the headline, and does not repeat it', () => {
    render(<BulkValveConfirmSheet {...props({ closingCount: 5 })} />)
    const FOLLOWING = window.Node.DOCUMENT_POSITION_FOLLOWING

    const offline = screen.getByText('systems are offline')
    const notIncluded = screen.getByText('Not included')
    expect(offline.compareDocumentPosition(notIncluded) & FOLLOWING).toBeTruthy()

    expect(screen.getByText('— will not be affected')).toBeInTheDocument()
    expect(notIncluded.nextElementSibling.textContent).not.toMatch(/offline/i)
  })

  /* The disclosure keeps its names reachable with no gesture (there is no
     hover on a phone) and the names keep their last-seen. */
  it('keeps the names, the last-seen and the open-by-default disclosure', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    expect(screen.getByText(/Boiler room 2/).textContent).toContain('offline 3h ago')
    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument()
    expect(screen.getByText(/Boiler room 2/).closest('ul')).not.toBeNull()
  })

  /* OPTIONAL AND OFF BY DEFAULT. When the caller supplies a `categoryKey` the
     offline row also shows the LAST KNOWN state — never a live reading for a
     device we cannot reach. Absent the prop, nothing is drawn, because
     guessing a state here is the exact failure the sheet exists to prevent. */
  it('shows a last-known valve state only when the caller supplies one', () => {
    const { container } = render(<BulkValveConfirmSheet {...props()} />)
    expect(container.querySelector('[data-slot="valve-state"]')).toBeNull()

    cleanup()
    const { container: withKey } = render(
      <BulkValveConfirmSheet
        {...props({ offlineSystems: [{ id: 's1', name: 'Boiler room 2', categoryKey: 'open' }] })}
      />,
    )
    const readout = withKey.querySelector('[data-slot="valve-state"]')
    expect(readout).not.toBeNull()
    expect(readout.getAttribute('data-certainty')).toBe('last-known')
    expect(readout.textContent).toMatch(/Last known/)
  })
})

describe('BulkValveConfirmSheet — the design system, not a ramp step', () => {
  /* FOUR LITERAL COLOURS WERE OFF THE SEMANTIC SCALE: text-slate-600 (8 call
     sites), text-slate-500 twice, bg-slate-500 once. They ARE registered
     Tailwind colours here and they DO move per theme, so this is not the
     missing-token failure index.css warns about — it is subtler. --slate-600
     is a RAMP STEP; --muted-foreground is a SEMANTIC token that RE-POINTS per
     theme (:root -> slate-500, dark -> zinc-400, sand -> stone-500, contrast
     -> a cyan). The card and the screen already use the semantic one for the
     same role. Same visual role, different theme behaviour, on the most
     dangerous surface in the feature. */
  it('names no ramp step anywhere in the subtree', () => {
    const { container } = render(<BulkValveConfirmSheet {...props({ skipArmingDelay: false })} />)
    const classes = Array.from(container.querySelectorAll('*'))
      .map((el) => el.getAttribute('class') || '')
      .join(' ')
    expect(classes).not.toMatch(/slate-\d/)
    expect(classes).toMatch(/text-muted-foreground/)
  })

  /* A <Separator> was being bent into a grab handle with
     data-[orientation=horizontal]:h-[4px] / :w-[36px] — a decorative bar
     carrying the semantics of a structural divider, plus two overrides to
     suppress its own sizing. A handle is not a separator. */
  it('draws the grab handle as a plain div, not a Separator', () => {
    const { container } = render(<BulkValveConfirmSheet {...props()} />)
    const handle = container.querySelector('.w-9')
    expect(handle).not.toBeNull()
    expect(handle.getAttribute('data-slot')).toBeNull()
    expect(handle.getAttribute('data-orientation')).toBeNull()
    expect(handle.getAttribute('aria-hidden')).toBe('true')

    for (const sep of container.querySelectorAll('[data-slot="separator"]')) {
      expect(sep.className).not.toMatch(/h-\[4px\]|w-\[36px\]/)
    }
  })

  /* The offline name list was a hand-rolled card (border + radius + padding).
     It is the house <Card> now, which also means it follows the card surface
     under all four themes instead of only the border token. */
  it('wraps the offline names in the house Card', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    const list = screen.getByText(/Boiler room 2/).closest('ul')
    expect(list.closest('[data-slot="card"]')).not.toBeNull()
  })
})

describe('BulkValveConfirmSheet — focus, and the honest half of aria-modal', () => {
  /* SLDS states it flatly: "Do not focus the cursor on the action button."
     Primer focuses Cancel on a danger dialog; the heading is one better,
     because a screen reader then starts at the blast radius rather than at a
     verdict, and a Space or Enter arriving from the opening control has
     nothing to activate. */
  it('puts initial focus on the heading, never on the commit button', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    const heading = screen.getByRole('heading', { name: 'Close water supply' })
    expect(document.activeElement).toBe(heading)
    expect(document.activeElement).not.toBe(
      screen.getByRole('button', { name: /Close 31 valves/ }),
    )
  })

  /* HALF OF WHAT MAKES aria-modal="true" TRUE. The other half — inerting the
     app shell behind an in-frame overlay — is the PAGE's to do and nothing in
     this app does it today; see the footnote in the component header. This
     pins what the sheet can honestly provide from inside its own subtree. */
  it('keeps Tab inside the sheet', () => {
    const { container } = render(<BulkValveConfirmSheet {...props()} />)
    const dialog = screen.getByRole('alertdialog')
    const focusable = Array.from(dialog.querySelectorAll('button')).filter(
      (b) => !b.hasAttribute('disabled'),
    )
    const last = focusable[focusable.length - 1]

    last.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(container.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).toBe(focusable[0])
  })

  /* No <form>, so no Enter-activated default: an Enter arriving from anywhere
     cannot submit a bulk shutoff. */
  it('has no form to submit', () => {
    const { container } = render(<BulkValveConfirmSheet {...props()} />)
    expect(container.querySelector('form')).toBeNull()
    for (const b of container.querySelectorAll('button')) {
      expect(b.getAttribute('type')).toBe('button')
    }
  })
})
