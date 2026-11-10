// @vitest-environment happy-dom
//
// A SUPPRESSED FLEET IS NOT AN ALL-CLEAR FLEET.
//
// The defect this file exists to prevent, in the owner's words after logging
// in on 2026-11-10: "when I logged in, and asked the app to show systems with
// errors and leaks, so I still doesn't see no error and not leaks".
//
// The cause was `pulse2-mock-suppressed`, the push simulator's "Clear all"
// flag. It is sticky in localStorage, it had been set in an earlier demo
// session, and while it is set `applySimOverlay` rewrites EVERY system to
// alert: null / event: null / valve: open / comm: online / power: ac /
// offline: false. So the whole fleet arrives at SystemHealthCard as
// `healthy === total`, `allClear` comes out true, and the card drew its
// APPROVED green row — "All of your systems are running!" — over a fleet
// nobody had actually checked.
//
// The flag was behaving as designed. The design was the defect: a sentence
// that is a claim about the water, printed on the strength of a demo switch.
//
// WHAT IS PINNED HERE, and why each one matters:
//
//   1. The approved all-clear state is UNCHANGED for a genuinely healthy
//      fleet. This is the regression that would hurt most — 200047:132992 /
//      199922:85244 are approved and a fix that quietly restyled them would
//      be a worse bug than the one being fixed.
//   2. A suppressed fleet does not draw that row, at the same counts. The two
//      cases are IDENTICAL in every prop except `suppressed`, which is the
//      whole point: the counts cannot tell them apart, so only the flag can.
//   3. The two rows are mutually exclusive. A card showing both would be
//      worse than either.
//   4. The suppressed row carries a working one-tap way out.
//   5. The undo is absent, not dead, when the host passes no handler.
//
// It asserts on `data-status` rather than on the sentences. The copy on the
// suppressed row is NEW COPY awaiting the owner (see the component), and a
// test that froze an unapproved string would make approving a different one
// look like a break.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SystemHealthCard from '@/v2/components/SystemHealthCard'

afterEach(cleanup)

/* One fleet, read two ways. 48 systems, every check passing — which is
   exactly what a suppressed fleet also looks like from here. */
const CLEAN_COUNTS = {
  total: 48,
  healthy: 48,
  valveErrors: 0,
  offline: 0,
  noPower: 0,
}

const clearRow = (c) => c.querySelector('[data-status="clear"]')
const suppressedRow = (c) => c.querySelector('[data-status="suppressed"]')

describe('a genuinely healthy fleet keeps the approved all-clear state', () => {
  it('draws the green row with the frame sentence, and no bar', () => {
    const { container } = render(<SystemHealthCard {...CLEAN_COUNTS} />)

    const row = clearRow(container)
    expect(row).toBeTruthy()
    expect(row.textContent).toContain('All of your systems are running!')
    /* The ground is the approved success token, not a neutral panel. */
    expect(row.className).toContain('bg-alert-surface-success')

    /* Owner, 2026-11-04: "When all good, no progress bar", and the
       `X / Y need attention` line goes with it. */
    expect(container.querySelector('[data-segment="attention"]')).toBeNull()
    expect(container.textContent).not.toContain('need attention')

    expect(suppressedRow(container)).toBeNull()
  })

  it('is unaffected by the prop defaulting to false', () => {
    const { container } = render(<SystemHealthCard {...CLEAN_COUNTS} suppressed={false} />)
    expect(clearRow(container)).toBeTruthy()
    expect(suppressedRow(container)).toBeNull()
  })
})

describe('a suppressed fleet says so instead', () => {
  it('does NOT draw the all-clear row, on counts identical to the healthy case', () => {
    const { container } = render(<SystemHealthCard {...CLEAN_COUNTS} suppressed />)

    expect(clearRow(container)).toBeNull()
    expect(container.textContent).not.toContain('All of your systems are running!')
  })

  it('draws a distinct row that names what is happening', () => {
    const { container } = render(<SystemHealthCard {...CLEAN_COUNTS} suppressed />)

    const row = suppressedRow(container)
    expect(row).toBeTruthy()
    /* Not the success ground: nothing here is known to be well. */
    expect(row.className).not.toContain('bg-alert-surface-success')
    /* Colour is never the only cue (wint-ui-copy §5) — there is real text. */
    expect(row.textContent.trim().length).toBeGreaterThan(0)
  })

  it('never shows both rows at once', () => {
    for (const suppressed of [true, false]) {
      const { container, unmount } = render(
        <SystemHealthCard {...CLEAN_COUNTS} suppressed={suppressed} />,
      )
      const both = !!clearRow(container) && !!suppressedRow(container)
      expect(both).toBe(false)
      unmount()
    }
  })

  it('still shows the notice when a pushed alert leaves the fleet non-clear', () => {
    /* The pusher can push an alert ON TOP of a suppressed fleet, so
       `attention > 0` while the rest of the fleet is still hidden. The notice
       is gated on `suppressed`, not on `allClear`, precisely so it survives
       that case — see the gate in the component. */
    const { container } = render(
      <SystemHealthCard total={48} healthy={47} valveErrors={1} offline={0} noPower={0} suppressed />,
    )
    expect(suppressedRow(container)).toBeTruthy()
    expect(clearRow(container)).toBeNull()
    /* And the bar is back, because something really does need attention. */
    expect(container.querySelector('[data-segment="attention"]')).toBeTruthy()
  })
})

describe('the way out is one tap, and it is real', () => {
  it('fires the host handler', async () => {
    const onShowFleet = vi.fn()
    render(<SystemHealthCard {...CLEAN_COUNTS} suppressed onShowFleet={onShowFleet} />)

    await userEvent.click(screen.getByRole('button', { name: /leaks and faults/i }))
    expect(onShowFleet).toHaveBeenCalledTimes(1)
  })

  it('is absent rather than dead when the host passes no handler', () => {
    const { container } = render(<SystemHealthCard {...CLEAN_COUNTS} suppressed />)
    const row = suppressedRow(container)
    expect(row).toBeTruthy()
    expect(row.querySelector('button')).toBeNull()
  })
})
