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
// WHAT THESE TESTS CANNOT DO. happy-dom has no layout engine and no
// elementFromPoint, so nothing here claims anything about layering, hit
// targets or what is actually visible on a 393x852 frame. DOM order is pinned
// because DOM order is real here; "the offline block sits above the button on
// screen" is a browser check and is not asserted.

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent, act, within } from '@testing-library/react'
import BulkValveConfirmSheet from '@/v2/components/BulkValveConfirmSheet'

afterEach(cleanup)

/* The component's own constant. Duplicated rather than exported: exporting a
   non-component from a component file trips react-refresh/only-export-components,
   and a test that re-declares the number is the test noticing if it moves. */
const ARMING_DELAY_MS = 800

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
