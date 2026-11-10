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
/* THE CANCEL WINDOW IS GONE, AT EVERY TIER (2026-11-03, note 12). The owner
   rejected it twice - on a 3-valve OPEN and again on a 79-valve CLOSE:
   "i dont want this step." The `HOLD_SMALL` / `HOLD_MEDIUM` / `HOLD_LARGE`
   constants that used to stand here are deleted with it, and so are
   `holdSeconds`, `skipHold`, `onHoldStart`, `onHoldTick` and `onHoldStop`.
   The removal is PINNED below rather than merely un-tested, so it cannot
   silently come back. */

/* ══ THE TWO COMMIT PATHS, 2026-11-03 ═══════════════════════════════════
   The commit BUTTON no longer commits on its own. SC 2.5.7 Dragging Movements
   (AA) requires a no-drag alternative to the slider, failure F108 says there
   must be "an alternative single pointer input available to actuate the
   function", and F108 allows that alternative to be "a series of single
   pointer interactions" — which is exactly what the acknowledgement checkbox
   plus the button is. A SINGLE TAP WOULD SATISFY THE LETTER OF 2.5.7 AND
   DESTROY THE FEATURE, whose whole purpose is to defeat one careless tap. So
   the tick is now required at EVERY tier, not only at the top one, and these
   two helpers are how the old one-click assertions were re-expressed. */
/* AMENDED 2026-11-03 (note 10). The pair is no longer in the DEFAULT visual
   flow - the owner, on the line this sheet used to print under the slider:
   "Why slide is not necessary? It should be necessary and this is the only
   way we are allowing the open three valves to be enabled." The alternative
   is KEPT, because 2.5.7 is not optional, and merely stops being advertised:
   a quiet `Cannot slide?` disclosure reveals it. So every assertion about the
   commit button opens that hatch first, and `openEscapeHatch` is idempotent
   so it can be called from anywhere. */
const openEscapeHatch = () => {
  const toggle = screen.queryByRole('button', { name: /^Cannot slide/ })
  if (toggle && toggle.getAttribute('aria-expanded') !== 'true') fireEvent.click(toggle)
  return toggle
}

/* THE ONE COMMIT CONTROL. It is always in the DOM now (2026-11-03, note 11):
   the slide no longer dispatches, it ARMS this button, and the acknowledgement
   behind the escape hatch arms the same one. So this helper no longer has to
   reveal anything - what changes is whether the button is INERT. */
const commitButton = (name = /^Dangerously close 31 valves$/) => screen.getByRole('button', { name })

/* `aria-disabled`, NOT `disabled`: the reason a control is unavailable has to
   reach assistive tech, and `disabled` is skipped outright by some of it
   (.claude/skills/wint-ui-copy/SKILL.md §5). jest-dom's `toBeDisabled` only
   reads the real attribute, so the assertion is spelled out. */
const inert = (el) => el.getAttribute('aria-disabled') === 'true'

/** The component's own count formatting, re-declared so the test notices if
    it moves. docs/wint-format-standards.md: comma thousands separator. */
const num = (n) => Number(n).toLocaleString('en-US')

const tick = () => {
  openEscapeHatch()
  const box = screen.getByRole('checkbox')
  if (box.getAttribute('aria-checked') !== 'true') fireEvent.click(box)
  return box
}

/** THE NO-DRAG ARMING GESTURE, then the commit. Reveal, tick, press: three
    single-pointer presses, no drag anywhere. */
const tapCommit = (name) => {
  tick()
  fireEvent.click(commitButton(name))
}

/* ── THE SLIDE PATH ──────────────────────────────────────────────────────
   happy-dom has no layout engine, so the control's travel — which it measures
   from the live track rect, deliberately, rather than summing class strings —
   comes back as 0 here. The rect is stubbed so the threshold means something:
   a 300px track minus a 48px thumb minus 2*4px of padding is 244px of travel,
   and the commit threshold is 90% of it. These numbers are the component's
   own constants; a test that re-declares them is the test noticing if they
   move. */
const TRACK_W = 300
const THUMB_PX = 48
const PAD_PX = 4
const TRAVEL = TRACK_W - THUMB_PX - 2 * PAD_PX

/* QUERIED BY ITS HOOK, NOT BY ITS NAME. The accessible name CHANGES when the
   control arms - "Slide to close 31 valves" becomes "Slide accepted. Now press
   the button." - because what a press there does changes with it. A helper
   anchored on the resting name would simply stop finding it at the exact
   moment most of these tests care about. The ROLE and the NAME are asserted
   on their own, in the two tests whose subject they are. */
const slideControl = () => {
  const el = document.querySelector('[data-name="slide-to-confirm"]')
  if (!el) throw new Error('no slide-to-confirm control in the document')
  return el
}

const slideThumb = () => {
  const root = slideControl()
  root.getBoundingClientRect = () => ({
    width: TRACK_W, height: 56, top: 0, left: 0, right: TRACK_W, bottom: 56, x: 0, y: 0,
  })
  return root.querySelector('[data-name="slide-to-confirm-thumb"]')
}

/**
 * Drive a real drag. `dx` is the horizontal distance in px; `y` is the
 * VERTICAL DRIFT, which must not matter (SC 2.5.1 — pointer capture, and the
 * component never reads clientY). `release: false` leaves the finger down,
 * which is how "nothing fires on the down-event" is pinned.
 */
const drag = (dx, { y = 0, release = true } = {}) => {
  const thumb = slideThumb()
  fireEvent.pointerDown(thumb, { pointerId: 1, clientX: 0, clientY: 0, button: 0 })
  fireEvent.pointerMove(thumb, { pointerId: 1, clientX: dx, clientY: y })
  if (release) fireEvent.pointerUp(thumb, { pointerId: 1, clientX: dx, clientY: y })
  return thumb
}

/** Past the 90% threshold, and released. THIS ARMS; IT DOES NOT DISPATCH. */
const fullDrag = (opts) => drag(TRAVEL, opts)

/** THE SLIDE ARMING GESTURE, then the commit. */
const slideCommit = (name) => {
  fullDrag()
  fireEvent.click(commitButton(name))
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

    const confirm = commitButton()
    expect(confirm.textContent).toContain('31')
  })

  it('carries the count into the button on open too, with the default variant', () => {
    render(<BulkValveConfirmSheet {...props({ action: 'open', willActCount: 8 })} />)
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('valves will open')).toBeInTheDocument()
    const confirm = commitButton(/^Dangerously open 8 valves$/)
    /* Opening resumes flow — it is not destructive, and the red button would
       be a lie about which direction is dangerous. */
    expect(confirm.getAttribute('data-variant')).toBe('default')
  })

  it('uses the destructive variant for the close direction', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    const confirm = commitButton()
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
      screen.getByText('Only the systems you selected - not every system here'),
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
    const confirm = commitButton()
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
    expect(commitButton()).toBeInTheDocument()
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
    const confirm = commitButton()
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
    expect(commitButton()).toBeInTheDocument()
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
    expect(commitButton()).toBeInTheDocument()
  })
})

describe('BulkValveConfirmSheet — the arming delay', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { cleanup(); vi.useRealTimers() })

  /* ~800ms of dead button. The threat is the second half of a double-tap on
     whatever control opened the sheet landing on the confirm button - which on
     a destructive fleet action means water off in a building nobody asked
     about.

     RE-EXPRESSED THREE TIMES NOW, NEVER DELETED. 2026-11-02 moved the commit
     to the far end of a cancel window; 2026-11-03 made the slide ARM this
     button rather than dispatch; the same day deleted the window entirely.
     What survives from the original claim is exactly this: THE PRIMARY IS
     DEAD UNTIL THE DELAY HAS BEEN SPENT, and a press after it is what
     dispatches. The delay is now LARGELY REDUNDANT - the button cannot be
     live without a deliberate arm and no arm completes in 800ms - but it is
     mechanical, it is cheap, and a working guard is not removed casually. */
  it('leaves the primary inert until the delay has been spent', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ skipArmingDelay: false, onConfirm })} />)

    const confirm = commitButton()
    // arm it, so the delay is the only thing left holding the button
    tick()
    expect(inert(confirm)).toBe(true)
    fireEvent.click(confirm)
    expect(onConfirm).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(ARMING_DELAY_MS - 1) })
    expect(inert(confirm)).toBe(true)

    act(() => { vi.advanceTimersByTime(1) })
    expect(inert(confirm)).toBe(false)

    fireEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  /* Cancel is never delayed - backing out of a dangerous action must be the
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
    tick()
    expect(inert(commitButton())).toBe(false)
  })

  /* THE SLIDE IS NOT DELAYED. The delay is input hygiene against the second
     half of a double-tap, and a drag cannot be the second half of a double-tap
     - so taxing the gesture too would be the friction stacking the owner
     objected to. It still gates the BUTTON, which is still a press. */
  it('does not delay the slide, and still delays the press', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ skipArmingDelay: false, onConfirm })} />)

    expect(slideControl().getAttribute('aria-disabled')).toBeNull()
    fullDrag()
    // the slide landed and armed, with no wait and no dispatch
    expect(slideControl().getAttribute('data-armed')).toBe('true')
    expect(onConfirm).not.toHaveBeenCalled()
    expect(inert(commitButton())).toBe(true)

    act(() => { vi.advanceTimersByTime(ARMING_DELAY_MS) })
    expect(inert(commitButton())).toBe(false)
    fireEvent.click(commitButton())
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('re-arms when the sheet is reopened, not once per mount', () => {
    const { rerender } = render(
      <BulkValveConfirmSheet {...props({ skipArmingDelay: false, action: 'close' })} />,
    )
    act(() => { vi.advanceTimersByTime(ARMING_DELAY_MS) })
    tick()
    expect(inert(commitButton())).toBe(false)

    rerender(<BulkValveConfirmSheet {...props({ skipArmingDelay: false, action: null })} />)
    rerender(<BulkValveConfirmSheet {...props({ skipArmingDelay: false, action: 'close' })} />)
    expect(inert(commitButton())).toBe(true)
  })

  it('keeps the primary dead while a command is already in flight', () => {
    render(<BulkValveConfirmSheet {...props({ skipArmingDelay: true, busy: true })} />)
    expect(inert(commitButton())).toBe(true)
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

describe('BulkValveConfirmSheet — there is no cancel window, at any tier', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { cleanup(); vi.useRealTimers() })

  /* ══ REWORKED 2026-11-03, NOT DELETED ════════════════════════════════
     This block used to pin the cancel window: WCAG technique G164 for SC
     3.3.4, a stated time window in which the user may amend or cancel. The
     owner rejected it TWICE in one day - on a 3-valve OPEN ("I feel like we
     don't really need this step") and again on a 79-valve CLOSE ("i dont want
     this step") - so it is gone at every tier, in both directions.

     THE TESTS ARE RE-EXPRESSED AS THE NEGATIVE so the removal is pinned and
     cannot silently return, and so the reason survives in the repository:

       1. IT COSTS NO CONFORMANCE. G164 is a SUFFICIENT technique for SC 3.3.4,
          not the only one. 3.3.4 is equally satisfied by its "Confirmed"
          bullet - a mechanism for reviewing and confirming before finalising -
          which is what this whole sheet is. SC 2.5.2 Pointer Cancellation is
          satisfied separately, by acting on the up-event and on a press.
       2. IT WAS THE WEAKEST OF THE THREE MECHANISMS. Bravo-Lillo et al. found
          attractors that merely DELAYED dismissal habituated; only those
          forcing interaction with the changed content did not. A timer is the
          delay kind. Slide-then-press and the acknowledgement are not.
       3. THE ACTION IS REVERSIBLE. A closed valve can be opened again.

     ⚠ AND THE ONE REAL COST, PINNED HERE SO IT IS NOT DISCOVERED LATER:
     THERE IS NO WINDOW BETWEEN THE PRESS AND THE DISPATCH. Recovery is no
     longer "stop it before it leaves"; it is "open the valves again", which is
     a fresh dangerous act on a building whose water has already stopped. */

  it('dispatches immediately on the press, with nothing in between', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onConfirm })} />)

    slideCommit()
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('offers no Stop, no countdown and no ticking label, at any tier', () => {
    for (const over of [
      { willActCount: 7 },
      { willActCount: 31 },
      { willActCount: 412 },
      { willActCount: 31, scopeKind: 'account' },
      { action: 'open', willActCount: 412 },
    ]) {
      const onConfirm = vi.fn()
      render(<BulkValveConfirmSheet {...props({ onConfirm, ...over })} />)
      /* WAS, UNTIL 2026-11-10:
           `^${over.action === 'open' ? 'Open' : 'Close'} ${num(...)} valves?$`
         THIS SHEET IS THE ONE SURFACE THAT CARRIES "Dangerously". The owner
         asked for the word, then placed it here rather than on the page's
         selection strip: the strip is a chooser showing two operations at
         once, this is the single committed operation. The strip's own suite
         still asserts the plain labels, deliberately. */
      const name = new RegExp(
        `^Dangerously ${over.action === 'open' ? 'open' : 'close'} ${num(over.willActCount)} valves?$`,
      )
      tapCommit(name)

      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('button', { name: /^Stop/ })).toBeNull()
      expect(document.body.textContent).not.toMatch(/\bin \d+s\b/)
      expect(document.body.textContent).not.toMatch(/Nothing has reached the valves/)
      // and no timer is left scheduled that could still fire
      act(() => { vi.advanceTimersByTime(60000) })
      expect(onConfirm).toHaveBeenCalledTimes(1)
      cleanup()
    }
  })

  /* THE EXACTLY-ONCE GUARANTEE MATTERS MORE NOW, NOT LESS. With no window the
     commands leave on the press itself, so a double fire is water moving twice
     with nothing in between. */
  it('dispatches exactly once, however many times the button is pressed', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onConfirm })} />)

    tick()
    const confirm = commitButton()
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('cannot be dispatched twice by using both arming gestures', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onConfirm })} />)

    fullDrag()
    tick()
    const confirm = commitButton()
    fireEvent.click(confirm)
    // the node is detached with the review; pressing it again must still be inert
    fireEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('accepts neither of the five removed hold props as a way back in', () => {
    const onConfirm = vi.fn()
    const onHoldStart = vi.fn()
    const onHoldTick = vi.fn()
    const onHoldStop = vi.fn()
    render(
      <BulkValveConfirmSheet
        {...props({ onConfirm, onHoldStart, onHoldTick, onHoldStop })}
        holdSeconds={20}
        skipHold={false}
      />,
    )
    slideCommit()
    // the window props are inert: the dispatch happened on the press anyway
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onHoldStart).not.toHaveBeenCalled()
    expect(onHoldTick).not.toHaveBeenCalled()
    expect(onHoldStop).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /^Stop/ })).toBeNull()
  })

  /* IEC 61850's control model is SelectWithValue -> Operate ->
     CommandTermination, and termination - the device confirming it REACHED the
     commanded state - can arrive much later or not at all. This repo has no
     such channel, so the sheet shows the two states it can honestly show and
     refuses to paint the third. The result survives the removal of the
     window; it is simply the first thing the user now sees after the press. */
  it('says SENT, and says that sent is not closed', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    slideCommit()

    /* Twice on purpose, and exactly twice: once visibly (aria-hidden) and once
       in the sr-only live region. */
    const sent = screen.getAllByText('Sent to 31 valves')
    expect(sent).toHaveLength(2)
    expect(sent.filter((n) => n.className.includes('sr-only'))).toHaveLength(1)
    expect(document.body.textContent).toMatch(/Sent is not the same as closed/)
    // No "done", and no Stop.
    expect(screen.queryByRole('button', { name: /^Stop/ })).toBeNull()
    expect(document.body.textContent).not.toMatch(/31 valves closed/i)
  })

  it('clears a dispatch that already happened when the decision changes', () => {
    const onConfirm = vi.fn()
    const { rerender } = render(<BulkValveConfirmSheet {...props({ onConfirm })} />)
    slideCommit()
    expect(onConfirm).toHaveBeenCalledTimes(1)

    rerender(<BulkValveConfirmSheet {...props({ onConfirm, action: null })} />)
    rerender(<BulkValveConfirmSheet {...props({ onConfirm, action: 'open' })} />)

    // a fresh decision, back on the review with nothing armed
    expect(screen.queryByText(/^Sent to/)).toBeNull()
    expect(slideControl().getAttribute('data-armed')).toBe('false')
    expect(inert(commitButton(/^Dangerously open 31 valves$/))).toBe(true)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})

describe('BulkValveConfirmSheet — friction scales to blast radius', () => {
  /* THE LADDER SURVIVES, WITH ONE COLUMN LEFT. Uniform treatment is the
     documented failure - Akhawe & Felt measured up to 70.2% click-through
     across ~25M real warning impressions, and clinical override rates run
     50-80%. What the ladder still decides, now that the cancel window is gone
     at every tier, is the ACKNOWLEDGEMENT: `large` forces it, the other two do
     not. The thresholds are the product decision; the mechanism they drive is
     not, and has changed twice. */

  it('forces the acknowledgement only at the top tier', () => {
    render(<BulkValveConfirmSheet {...props({ willActCount: 7 })} />)
    expect(screen.queryByRole('checkbox')).toBeNull()
    cleanup()

    render(<BulkValveConfirmSheet {...props({ willActCount: 31 })} />)
    expect(screen.queryByRole('checkbox')).toBeNull()
    cleanup()

    render(<BulkValveConfirmSheet {...props({ willActCount: 412 })} />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  /* An account action is unbounded by construction - it is whatever the
     hierarchy happens to hold today - so it is top tier whatever the count
     says. */
  it("treats scopeKind='account' as top tier at any count", () => {
    render(<BulkValveConfirmSheet {...props({ willActCount: 31, scopeKind: 'account' })} />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(slideControl().getAttribute('aria-disabled')).toBe('true')
  })

  it('leaves the small tier with no gate on the slide', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ willActCount: 7, onConfirm })} />)
    /* Below the top tier the acknowledgement is not a gate, so it is not on
       screen - it lives inside the escape hatch as the non-drag arming
       gesture. */
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(slideControl().getAttribute('aria-disabled')).toBeNull()

    slideCommit(/^Dangerously close 7 valves$/)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('leaves the middle tier with the full review and no gate on the slide', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    expect(slideControl().getAttribute('aria-disabled')).toBeNull()
    expect(inert(commitButton())).toBe(true)
    // the full review is still there
    expect(screen.getByText('Not included')).toBeInTheDocument()
    expect(screen.getByText('systems are offline')).toBeInTheDocument()
  })
})

describe('BulkValveConfirmSheet — the top-tier gate', () => {
  /* NOT TYPE-TO-CONFIRM. The argument against it here is the keyboard and the
     frame, NOT accessibility: the "documented accessibility problems" of
     type-to-confirm are widely asserted and, on searching, not actually
     documented - no WCAG failure, no study, no design-system citation. On a
     393px frame the software keyboard covers the scope summary the user is
     meant to be checking, and the string is on screen to copy from.

     WHAT IT IS INSTEAD: forced interaction with the field that carries the
     varying content, which is the treatment Bravo-Lillo (SOUPS 2014) found
     "resilient to habituation" where pure delays were not. It maps onto WCAG
     technique G155 (a checkbox in addition to the submit button). THE
     COMPOSITION IS A SYNTHESIS, NOT A PUBLISHED TESTED PATTERN.

     IT SURVIVED THE REMOVAL OF THE CANCEL WINDOW ON PURPOSE. The window was
     the DELAY kind of attractor, which habituates; this is the forced-
     interaction kind, which does not. They were never the same control. */
  it('holds the commit inert until the row is tapped', () => {
    render(<BulkValveConfirmSheet {...props({ willActCount: 412 })} />)
    const confirm = commitButton(/^Dangerously close 412 valves$/)
    expect(inert(confirm)).toBe(true)

    // the tick alone is the GATE here, not an arm: the slide is still required
    fireEvent.click(screen.getByRole('checkbox'))
    expect(inert(confirm)).toBe(true)

    fullDrag()
    expect(inert(confirm)).toBe(false)
  })

  /* THE SLIDE DOES NOT BUY ITS WAY PAST THE TICK AT THE TOP TIER. The two are
     not substitutes: the slide is PHYSICAL FRICTION against an accidental
     actuation, invariant content that Bravo-Lillo would expect to habituate,
     while the tick is FORCED INTERACTION WITH THE VARYING COUNT, which is the
     treatment that survived habituation. */
  it('gates the SLIDE at the top tier too, and nothing else does', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ willActCount: 412, onConfirm })} />)

    expect(slideControl().getAttribute('aria-disabled')).toBe('true')
    fullDrag()
    expect(slideControl().getAttribute('data-armed')).toBe('false')
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('checkbox'))
    expect(slideControl().getAttribute('aria-disabled')).toBeNull()
  })

  /* AND THE TICK MUST NOT BE A BACK DOOR TO THE BUTTON. The owner: the slide
     "should be necessary and this is the only way we are allowing the open
     three valves to be enabled." At the top tier the same checkbox is ALSO on
     screen as the gate, so its ARMING half is bound to the escape hatch the
     user deliberately opened - otherwise a sighted user could reach the
     dispatch at the top tier without ever sliding. */
  it('does not let the visible top-tier tick arm the button on its own', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ willActCount: 412, onConfirm })} />)

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(commitButton(/^Dangerously close 412 valves$/))
    expect(onConfirm).not.toHaveBeenCalled()

    // but the same tick DOES arm it once the non-drag path is opened
    openEscapeHatch()
    /* AND THE DISCLOSURE SAYS SO. At the top tier the acknowledgement row is
       already on screen as the gate, so opening the disclosure would otherwise
       reveal nothing and read as a broken control. */
    expect(screen.getByText('The box above also enables the button.')).toBeInTheDocument()
    fireEvent.click(commitButton(/^Dangerously close 412 valves$/))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  /* And below the top tier it reveals the row itself, not a sentence about
     it - there is nothing already on screen for the sentence to refer to. */
  it('reveals the acknowledgement row itself below the top tier', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    openEscapeHatch()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(screen.queryByText('The box above also enables the button.')).toBeNull()
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
     Vance et al. (CHI 2017) found reduces habituation - not the wording. */
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
    expect(slideControl().getAttribute('aria-disabled')).toBeNull()

    rerender(<BulkValveConfirmSheet {...props({ action: null })} />)
    rerender(<BulkValveConfirmSheet {...props({ action: 'open', willActCount: 412 })} />)
    expect(slideControl().getAttribute('aria-disabled')).toBe('true')
  })

  it('says why the primary is inert, so it does not read as broken', () => {
    render(<BulkValveConfirmSheet {...props({ willActCount: 412 })} />)
    // the box is the nearest unmet condition at the top tier
    expect(screen.getByText(/Tick the box above/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox'))
    // now it is the slide
    expect(screen.queryByText(/Tick the box above/)).toBeNull()
    expect(screen.getByText('Slide above to enable this.')).toBeInTheDocument()

    fullDrag()
    expect(screen.queryByText('Slide above to enable this.')).toBeNull()
  })

  /* AND THE REASON REACHES ASSISTIVE TECH, which is the whole point of
     `aria-disabled` over `disabled` - the latter is skipped outright by some
     of it, so the reason never arrives. */
  it('points the inert button at that reason for a screen reader', () => {
    render(<BulkValveConfirmSheet {...props({ willActCount: 412 })} />)
    const confirm = commitButton(/^Dangerously close 412 valves$/)
    const describedBy = confirm.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy).textContent).toMatch(/Tick the box above/)
    // and it is focusable, unlike a `disabled` button
    expect(confirm.hasAttribute('disabled')).toBe(false)
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

    expect(screen.getByText('- will not be affected')).toBeInTheDocument()
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
      commitButton(),
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


describe('BulkValveConfirmSheet — the slide ARMS, the button COMMITS', () => {
  /* THE OWNER'S ASK, verbatim: "I want to add to the bulk operations kind of
     confirmation like the puzzle Lego that user needs to slide to make sure
     user do it when he's aware of what he's doing and not just click something
     in his pocket." And then, on the first cut, which dispatched on release:
     "sliding shall be confirmation before the user can click on the close
     button."

     SO THE MODEL IS: slide to ARM -> press to COMMIT. That collapsed two
     independent commit paths into ONE COMMIT CONTROL reachable by TWO ARMING
     GESTURES - the slide, or the acknowledgement behind the escape hatch.

     WHAT IT IS HONESTLY WORTH. Bravo-Lillo et al. found that attractors which
     merely DELAYED dismissal habituated, and only those forcing interaction
     with the FIELD CARRYING THE CHANGE survived. A slider is the same slider
     every time, so it is PHYSICAL FRICTION, not attention: it answers the
     pocket tap the owner named and it does NOT answer habituated-but-
     deliberate confirmation. The acknowledgement checkbox is what answers
     that, which is why it survives at the top tier. NO CONTROLLED STUDY was
     found showing slide-to-confirm reduces real-world errors. */

  it('does not arm and does not dispatch on the down-event', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onConfirm })} />)

    // finger down, finger moved the whole way, finger STILL DOWN
    drag(TRAVEL, { release: false })

    expect(onConfirm).not.toHaveBeenCalled()
    expect(slideControl().getAttribute('data-armed')).toBe('false')
    expect(inert(commitButton())).toBe(true)
  })

  /* SC 2.5.2 Pointer Cancellation (Level A) wants completion on the up-event
     with an abort available. Releasing short of the threshold IS the abort. */
  it('springs back on a short drag and arms nothing', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onConfirm })} />)

    drag(Math.round(TRAVEL * 0.5))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(slideControl().getAttribute('data-armed')).toBe('false')
    expect(slideControl().getAttribute('data-progress')).toBe('0')
    expect(inert(commitButton())).toBe(true)
    // the review is still on screen
    expect(screen.getByText('320 Summit Blvd')).toBeInTheDocument()
  })

  it('still refuses a drag that stops one pixel short of the threshold', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    drag(Math.ceil(TRAVEL * 0.9) - 1)
    expect(slideControl().getAttribute('data-armed')).toBe('false')
  })

  /* THE HEADLINE OF THE WHOLE CHANGE: a completed slide DISPATCHES NOTHING.
     It lands, it stays landed, and it makes the button the obvious next
     target. */
  it('arms on a full drag, dispatches nothing, and does not spring back', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onConfirm })} />)

    fullDrag()
    expect(onConfirm).not.toHaveBeenCalled()
    const slide = slideControl()
    expect(slide.getAttribute('data-armed')).toBe('true')
    expect(slide.getAttribute('data-progress')).toBe('1')
    expect(inert(commitButton())).toBe(false)
    // and the track says so, in the caller's words
    expect(slide.textContent).toBe('Slide accepted. Now press the button.')
  })

  it('then commits exactly once on the press, and a second press does nothing', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onConfirm })} />)

    fullDrag()
    fireEvent.click(commitButton())
    expect(onConfirm).toHaveBeenCalledTimes(1)
    // the sheet is on its result now; nothing left to press twice
    expect(screen.queryByRole('button', { name: /^Dangerously close 31 valves$/ })).toBeNull()
    expect(screen.getAllByText('Sent to 31 valves')).toHaveLength(2)
  })

  /* ARMING IS REVERSIBLE, and the way back is in the one place the user is
     already looking. A press there can never commit anything. */
  it('disarms when the confirmed slide is pressed again', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onConfirm })} />)

    fullDrag()
    expect(inert(commitButton())).toBe(false)

    fireEvent.click(slideControl())
    expect(slideControl().getAttribute('data-armed')).toBe('false')
    expect(slideControl().getAttribute('data-progress')).toBe('0')
    expect(inert(commitButton())).toBe(true)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('disarms from the keyboard too', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    fireEvent.keyDown(slideControl(), { key: 'Enter' })
    expect(slideControl().getAttribute('data-armed')).toBe('true')
    fireEvent.keyDown(slideControl(), { key: 'Enter' })
    expect(slideControl().getAttribute('data-armed')).toBe('false')
  })

  /* A STALE ARM MUST NEVER SURVIVE A CHANGE TO WHAT IT WOULD ACT ON. The
     decision is the direction AND the count AND the scope, so any of them
     moving drops the arm - otherwise a press would dispatch an act the user
     never confirmed. */
  it('drops the arm when the count changes under it', () => {
    const onConfirm = vi.fn()
    const { rerender } = render(<BulkValveConfirmSheet {...props({ onConfirm })} />)
    fullDrag()
    expect(inert(commitButton())).toBe(false)

    rerender(<BulkValveConfirmSheet {...props({ onConfirm, willActCount: 44 })} />)
    expect(slideControl().getAttribute('data-armed')).toBe('false')
    expect(inert(commitButton(/^Dangerously close 44 valves$/))).toBe(true)
    fireEvent.click(commitButton(/^Dangerously close 44 valves$/))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('drops the arm when the scope changes under it', () => {
    const { rerender } = render(<BulkValveConfirmSheet {...props()} />)
    fullDrag()
    expect(inert(commitButton())).toBe(false)

    rerender(<BulkValveConfirmSheet {...props({ scopeLabel: 'Pier 9' })} />)
    expect(slideControl().getAttribute('data-armed')).toBe('false')
    expect(inert(commitButton())).toBe(true)
  })

  /* SC 2.5.1 Pointer Gestures is LEVEL A, and W3C's Understanding is explicit:
     a slider is only a dragging movement "unless [it] is implemented in a way
     that forces users to precisely follow the path of the track, and straying
     from the track 'loses' the user's grip on the slider thumb" — in which
     case it "may fail the requirements of both this criterion and Success
     Criterion 2.5.7". So the grip must survive vertical drift. The component
     never reads clientY at all; this is that, as a test. */
  it('keeps its grip when the pointer drifts far off the track vertically', () => {
    render(<BulkValveConfirmSheet {...props()} />)

    const thumb = slideThumb()
    fireEvent.pointerDown(thumb, { pointerId: 1, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(thumb, { pointerId: 1, clientX: TRAVEL * 0.4, clientY: -240 })
    fireEvent.pointerMove(thumb, { pointerId: 1, clientX: TRAVEL, clientY: 600 })
    fireEvent.pointerUp(thumb, { pointerId: 1, clientX: TRAVEL, clientY: 600 })

    expect(slideControl().getAttribute('data-armed')).toBe('true')
  })

  it('takes the pointer capture that makes that grip real', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    const thumb = slideThumb()
    const captured = []
    thumb.setPointerCapture = (id) => captured.push(id)
    fireEvent.pointerDown(thumb, { pointerId: 7, clientX: 0, clientY: 0 })
    expect(captured).toEqual([7])
  })

  /* ══ SC 2.5.7 DRAGGING MOVEMENTS (LEVEL AA) ══════════════════════════
     "All functionality that uses a dragging movement for operation can be
     achieved by a single pointer without dragging, unless dragging is
     essential..." Failure F108: "The failure occurs when there is no
     alternative single pointer input available to actuate the function."
     Arming CAN be done with taps, so the drag is not essential.
     THE DRAG IS NOW MANDATORY ON ITS OWN ROUTE, so this path matters MORE
     than it did, not less. THIS TEST IS THE CONFORMANCE: not a single pointer
     drag event, and it arms THE SAME BUTTON. */
  it('arms and commits through the checkbox and the button with no drag at all', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ action: 'open', onConfirm })} />)

    /* THREE single-pointer presses, and NOT ONE pointer-drag event: reveal
       the hatch, tick, press. F108: "The alternative may involve a series of
       single pointer interactions." */
    fireEvent.click(screen.getByRole('button', { name: /^Cannot slide/ }))
    fireEvent.click(screen.getByRole('checkbox'))
    const confirm = commitButton(/^Dangerously open 31 valves$/)
    expect(inert(confirm)).toBe(false)
    fireEvent.click(confirm)

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(slideControl).toBeDefined()
  })

  /* AND IT MUST NOT BE ONE TAP. An alternative that is a single tap satisfies
     the letter of 2.5.7 and deletes the feature. */
  it('refuses the button on its own, at every tier', () => {
    for (const willActCount of [7, 31, 412]) {
      const onConfirm = vi.fn()
      render(<BulkValveConfirmSheet {...props({ willActCount, onConfirm })} />)
      const confirm = commitButton(new RegExp(`^Dangerously close ${willActCount} valves$`))
      expect(inert(confirm)).toBe(true)
      fireEvent.click(confirm)
      expect(onConfirm).not.toHaveBeenCalled()
      cleanup()
    }
  })

  /* The keyboard is built because it is right, NOT because it discharges
     2.5.7 — W3C: "achieving keyboard equivalence for a dragging operation
     does not automatically meet this success criterion." It ARMS now, like
     every other route to the button. */
  it('arms from the keyboard, on Enter, on Space and on four Arrow presses', () => {
    for (const keys of [['Enter'], [' '], ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight']]) {
      const onConfirm = vi.fn()
      render(<BulkValveConfirmSheet {...props({ action: 'open', onConfirm })} />)
      for (const key of keys) fireEvent.keyDown(slideControl(), { key })
      expect(slideControl().getAttribute('data-armed')).toBe('true')
      // arming is not committing
      expect(onConfirm).not.toHaveBeenCalled()
      fireEvent.click(commitButton(/^Dangerously open 31 valves$/))
      expect(onConfirm).toHaveBeenCalledTimes(1)
      cleanup()
    }
  })

  it('walks back down the track on the Arrow keys without ever arming', () => {
    render(<BulkValveConfirmSheet {...props({ action: 'open' })} />)
    const slide = slideControl()
    fireEvent.keyDown(slide, { key: 'ArrowRight' })
    fireEvent.keyDown(slide, { key: 'ArrowRight' })
    fireEvent.keyDown(slide, { key: 'ArrowRight' })
    expect(slide.getAttribute('data-progress')).toBe('0.75')
    fireEvent.keyDown(slide, { key: 'ArrowLeft' })
    fireEvent.keyDown(slide, { key: 'Home' })
    expect(slide.getAttribute('data-progress')).toBe('0')
    expect(slide.getAttribute('data-armed')).toBe('false')
  })

  /* ROLE IS `button`, NOT `slider`. A `role="slider"` announces a value in a
     range and invites value adjustment; this control has no value, it is an
     arming gesture. */
  it('is announced as a button named by its outcome, never as a slider', () => {
    render(<BulkValveConfirmSheet {...props({ willActCount: 1200 })} />)
    expect(screen.queryByRole('slider')).toBeNull()
    const slide = screen.getByRole('button', { name: 'Slide to close 1,200 valves' })
    expect(slide).toBeInTheDocument()
    // the varying payload is ON the track, not a generic "Confirm"
    expect(slide.textContent).toContain('1,200')
    expect(document.body.textContent).not.toMatch(/Slide to confirm/i)
  })

  /* AND THE NAME CHANGES WHEN IT ARMS, because what a press there does
     changes with it: it stops being "slide" and becomes "undo the slide". */
  it('renames itself once armed, and says what comes next', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    fullDrag()
    expect(
      screen.getByRole('button', { name: 'Slide accepted. Now press the button.' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Slide to close/ })).toBeNull()
    // never a word that could be read as something having happened to a valve
    expect(document.body.textContent).not.toMatch(/\bconfirmed\b|\bdone\b/i)
  })

  /* A path nobody can find is not an alternative. The slider's description
     names the no-drag route, so a screen-reader user who never sees the track
     still hears it. */
  it('names the no-drag path in the slider\'s own description', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    const describedBy = slideControl().getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const hint = document.getElementById(describedBy)
    expect(hint).not.toBeNull()
    expect(hint.textContent).toBe(
      'Slide the handle to the right end to enable the button. The Cannot slide button gives another way.',
    )
    /* AND IT IS sr-only. The owner, on the visible version of this line:
       "Why slide is not necessary? It should be necessary and this is the
       only way we are allowing the open three valves to be enabled." */
    expect(hint.className).toContain('sr-only')
  })

  it('tells an armed user how to take it back', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    fullDrag()
    const hint = document.getElementById(slideControl().getAttribute('aria-describedby'))
    expect(hint.textContent).toBe('To undo this slide, press it again.')
  })

  it('tells a top-tier user which control is holding the slide', () => {
    render(<BulkValveConfirmSheet {...props({ willActCount: 412 })} />)
    const hint = document.getElementById(slideControl().getAttribute('aria-describedby'))
    expect(hint.textContent).toBe(
      'This slide is not enabled. Tick the acknowledgement box above.',
    )
    /* IT MUST NOT SAY "Tick the box above": that exact sentence is the commit
       button's own inert-reason line, and two nodes carrying one sentence is
       two controls claiming one fact. */
    expect(hint.textContent).not.toMatch(/Tick the box above/)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(
      document.getElementById(slideControl().getAttribute('aria-describedby')).textContent,
    ).toMatch(/^Slide the handle/)
  })

  it('keeps the slide out of the way of a command already in flight', () => {
    render(<BulkValveConfirmSheet {...props({ busy: true })} />)
    expect(slideControl().getAttribute('aria-disabled')).toBe('true')
  })

  /* The slide is an arm, not a dismissal: it must never be able to close the
     sheet, and the two ways out stay live beside it. */
  it('leaves both ways out live while the slide sits at rest', () => {
    const onCancel = vi.fn()
    render(<BulkValveConfirmSheet {...props({ onCancel })} />)
    const cancels = screen.getAllByRole('button', { name: 'Cancel' })
    expect(cancels).toHaveLength(2)
    for (const c of cancels) expect(c).toBeEnabled()
  })
})

describe('BulkValveConfirmSheet — the copy register', () => {
  /* BINDING PROJECT RULE, and it predates this file: hyphens in UI copy,
     never em-dashes (sandbox/CLAUDE.md:268, docs/DESIGN-GUIDE-FOR-CLAUDE.md:49,
     restated in .claude/skills/wint-ui-copy/SKILL.md §1). Comments are exempt;
     this asserts on the RENDERED text only. */
  it('renders no em-dash anywhere on the sheet, in either direction', () => {
    for (const over of [{}, { action: 'open' }, { scopeKind: 'selection' }, { willActCount: 412 }]) {
      const { container } = render(<BulkValveConfirmSheet {...props(over)} />)
      expect(container.textContent).not.toMatch(/\u2014/)
      cleanup()
    }
  })

  /* ASD-STE100 is the register on a surface where water actually stops
     (SKILL.md §3a): no contractions, one word one meaning. */
  it('writes no contraction on the danger surface', () => {
    const { container } = render(<BulkValveConfirmSheet {...props()} />)
    expect(container.textContent).toMatch(/Cannot reach these/)
    expect(container.textContent).not.toMatch(/Can\u2019t|don\u2019t|won\u2019t|isn\u2019t/)
  })

  /* docs/wint-format-standards.md: comma thousands separator. The owner's own
     framing for this feature is "around 1000 valve", so this is live. */
  it('separates thousands everywhere a count is printed', () => {
    render(<BulkValveConfirmSheet {...props({ willActCount: 1200, scopeKind: 'account' })} />)
    expect(commitButton(/^Dangerously close 1,200 valves$/)).toBeInTheDocument()
    expect(screen.getByText('1,200')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\b1200\b/)
  })
})


describe('BulkValveConfirmSheet — the slide is the only advertised path', () => {
  /* THE OWNER, 2026-11-03, looking at the open sheet and at the line this
     sheet used to print under the slider ("A slide is not necessary. Tick the
     box below. Then press the button."):

       "Why slide is not necessary? It should be necessary and this is the
        only way we are allowing the open three valves to be enabled."

     He is right, and that sentence was self-defeating: it told every user not
     to bother with the control. What follows pins the resolution - the pair
     is OUT OF THE DEFAULT FLOW and STILL REACHABLE, because SC 2.5.7 is Level
     AA and is not a thing we get to drop. */

  it('offers the slide as the only live way forward when the sheet opens', () => {
    render(<BulkValveConfirmSheet {...props()} />)

    expect(slideControl()).toBeInTheDocument()
    expect(slideControl().getAttribute('aria-disabled')).toBeNull()
    // the commit control is there, and it is inert until something arms it
    expect(inert(commitButton())).toBe(true)
    // the non-drag arming gesture is not advertised
    expect(screen.queryByRole('checkbox')).toBeNull()
    // the way out is never hidden behind anything
    expect(screen.getAllByRole('button', { name: 'Cancel' })).toHaveLength(2)
  })

  it('never tells the user that the slide is unnecessary', () => {
    for (const over of [{}, { action: 'open' }, { willActCount: 7 }, { willActCount: 412 }]) {
      const { container } = render(<BulkValveConfirmSheet {...props(over)} />)
      expect(container.textContent).not.toMatch(/not necessary/i)
      cleanup()
    }
  })

  /* ══ SC 2.5.7, AFTER THE CHANGE ══════════════════════════════════════
     The alternative is kept and merely stops being advertised. W3C is
     explicit that the slider's KEYBOARD support does not discharge this:
     "achieving keyboard equivalence for a dragging operation does not
     automatically meet this success criterion." It has to be POINTER-
     operable without dragging, which is what this disclosure provides. */
  it('keeps the non-drag path reachable behind a quiet disclosure', () => {
    const onConfirm = vi.fn()
    render(<BulkValveConfirmSheet {...props({ action: 'open', onConfirm })} />)

    const hatch = screen.getByRole('button', { name: /^Cannot slide/ })
    expect(hatch.getAttribute('aria-expanded')).toBe('false')
    expect(hatch.getAttribute('type')).toBe('button')

    fireEvent.click(hatch)
    expect(hatch.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    // revealing it is neither arming nor committing
    expect(inert(commitButton(/^Dangerously open 31 valves$/))).toBe(true)
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('checkbox'))
    expect(inert(commitButton(/^Dangerously open 31 valves$/))).toBe(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  /* LOW EMPHASIS, NOT HIDDEN, AND STILL A REAL TARGET: the person this exists
     for has a motor impairment, so 44px is the floor it has to clear. */
  it('draws the disclosure as a quiet control, not as a second primary', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    const hatch = screen.getByRole('button', { name: /^Cannot slide/ })
    expect(hatch.className).toMatch(/text-muted-foreground/)
    expect(hatch.className).toMatch(/\bh-11\b/)
    expect(hatch.className).not.toMatch(/bg-destructive|bg-primary/)
    // not the house <Button>, which would give it a primary's weight
    expect(hatch.getAttribute('data-slot')).toBeNull()
    expect(hatch.textContent).toBe('Cannot slide?')
    // ASD-STE100 bans contractions on this surface
    expect(document.body.textContent).not.toMatch(/Can\u2019t slide/)
  })

  it('shuts the disclosure again when the decision changes', () => {
    const { rerender } = render(<BulkValveConfirmSheet {...props()} />)
    fireEvent.click(screen.getByRole('button', { name: /^Cannot slide/ }))
    expect(screen.getByRole('checkbox')).toBeInTheDocument()

    rerender(<BulkValveConfirmSheet {...props({ action: null })} />)
    rerender(<BulkValveConfirmSheet {...props({ action: 'open' })} />)
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  /* ONE ACKNOWLEDGEMENT ROW, ONE PLACE AT A TIME. At the top tier it is the
     anti-habituation GATE and it is on screen; below it, it is the first act
     of the non-drag alternative and it lives in the hatch. The two controls
     must never read as a pair of equivalent ways in. */
  it('keeps the top-tier acknowledgement on screen, where it gates the slide', () => {
    render(<BulkValveConfirmSheet {...props({ willActCount: 412 })} />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(slideControl().getAttribute('aria-disabled')).toBe('true')
    // and the one commit control is there, inert
    expect(inert(commitButton(/^Dangerously close 412 valves$/))).toBe(true)
  })

  it('never draws two acknowledgement rows, at any tier', () => {
    for (const willActCount of [7, 31, 412]) {
      render(<BulkValveConfirmSheet {...props({ willActCount })} />)
      openEscapeHatch()
      expect(screen.getAllByRole('checkbox')).toHaveLength(1)
      expect(screen.getAllByText(/^I understand this stops water/)).toHaveLength(1)
      cleanup()
    }
  })

  /* THE COMMIT BUTTON IS BACK IN THE DEFAULT FLOW, inert, because it is now
     the ONE commit control and both arming gestures lead to it. What is NOT
     advertised is the way to arm it without a drag. */
  it('shows the one commit control from the start, inert and explained', () => {
    render(<BulkValveConfirmSheet {...props()} />)
    const confirm = commitButton()
    expect(confirm).toBeInTheDocument()
    expect(inert(confirm)).toBe(true)
    expect(screen.getByText('Slide above to enable this.')).toBeInTheDocument()
    // and the non-drag arming gesture is still behind the disclosure
    expect(screen.queryByRole('checkbox')).toBeNull()
  })
})
