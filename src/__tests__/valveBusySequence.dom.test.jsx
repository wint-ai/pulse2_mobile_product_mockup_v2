// @vitest-environment happy-dom
//
// THE VALVE BUSY SEQUENCE — 199683:25832 / :25851 / :25870, and what it must
// never do.
//
// Owner, 2026-11-08: "When shutting off valve, both on system page and for
// sure on location page when managing valves, there is no any feedback that
// something was happens." Figma answers with three frames before the valve
// reads Closed:
//
//     Sending…            spinner, valve still reads Open
//     Closing…            spinner, valve still reads Open
//     Verifying Closed    spinner + "Up to 8 minutes", valve still reads Open
//     Closed              199683:25891
//
// TWO PROPERTIES ARE LOAD-BEARING, and they are the two this file exists for:
//
//   1. THE READOUT DOES NOT MOVE UNTIL THE COMMAND HAS. A card that says
//      "Closed" while a chip beside it says "Closing…" is the wrong-belief
//      failure every valve surface in this repo is built to prevent.
//   2. THE CONTROL NEVER LOOKS IDLE WHILE SOMETHING IS IN FLIGHT. The button
//      is REPLACED by the chip, not disabled — a greyed "Close valve" beside
//      an Open valve is exactly what the owner reported.
//
// THE PHASE IS SEEDED, NOT TIMED. `valveCommandStore` derives the phase from
// the command's own timestamp, so a test can place a command anywhere on its
// timeline by writing the timestamp it wants and mounting. No fake clocks for
// the three frames; one fake clock for the progression test at the end, which
// is about the interval and nothing else.

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, screen, act } from '@testing-library/react'

import ValveStatusCard from '@/v2/components/ValveStatusCard'
import {
  VALVE_SEND_MS,
  VALVE_ACT_MS,
  VALVE_TRANSITION_MS,
  clearValveCommands,
  getValveCommand,
  startValveCommand,
} from '@/data/valveCommandStore'

const KEY = 'pulse2-valve-commands'
const SYS = 'sys-under-test'

/** Put a command on the timeline at `elapsed` ms into its run. */
function seedCommand({ action = 'close', elapsed = 0, systemId = SYS } = {}) {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      states: {},
      pending: { [systemId]: { action, at: Date.now() - elapsed, actor: 'Test' } },
      batches: [],
    }),
  )
}

beforeEach(() => {
  localStorage.clear()
  clearValveCommands()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  localStorage.clear()
})

const chip = () => document.querySelector('[data-busy]')

describe('the busy sequence — the three frames', () => {
  it.each([
    ['sending', 0, 'Sending…'],
    ['acting', VALVE_SEND_MS + 10, 'Closing…'],
    ['verifying', VALVE_SEND_MS + VALVE_ACT_MS + 10, 'Verifying Closed'],
  ])('draws the %s frame', (_phase, elapsed, label) => {
    seedCommand({ elapsed })
    render(<ValveStatusCard systemId={SYS} state="open" tone="alert" />)
    expect(chip().getAttribute('data-busy')).toBe(label)
    expect(screen.getByText(label)).toBeTruthy()
  })

  /* PROPERTY 1. Through all three the position word is the valve's own, and
     the valve has not moved. */
  it.each([0, VALVE_SEND_MS + 10, VALVE_SEND_MS + VALVE_ACT_MS + 10])(
    'keeps the position word at Open at %i ms',
    (elapsed) => {
      seedCommand({ elapsed })
      render(<ValveStatusCard systemId={SYS} state="open" tone="alert" />)
      expect(screen.getByText('Open')).toBeTruthy()
      expect(screen.queryByText('Closed')).toBeNull()
    },
  )

  /* PROPERTY 2. The action is GONE while the chip is up — not present and
     greyed, which is the state the owner reported as "no feedback". */
  it('replaces the action rather than disabling it', () => {
    seedCommand({ elapsed: VALVE_SEND_MS + 10 })
    render(<ValveStatusCard systemId={SYS} state="open" tone="alert" />)
    expect(screen.queryByRole('button', { name: 'Close valve' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Open valve' })).toBeNull()
    // And what IS there announces itself.
    expect(chip().getAttribute('role')).toBe('status')
    expect(chip().getAttribute('aria-live')).toBe('polite')
  })

  /* Only 199683:25870 carries the caption. It is the hardware's worst case,
     not this app's timer — see VALVE_TRANSITION_MS. */
  it('hangs "Up to 8 minutes" under Verifying and under nothing else', () => {
    seedCommand({ elapsed: VALVE_SEND_MS + VALVE_ACT_MS + 10 })
    const { unmount } = render(<ValveStatusCard systemId={SYS} state="open" tone="alert" />)
    expect(screen.getByText('Up to 8 minutes')).toBeTruthy()
    unmount()

    seedCommand({ elapsed: 0 })
    render(<ValveStatusCard systemId={SYS} state="open" tone="alert" />)
    expect(screen.queryByText('Up to 8 minutes')).toBeNull()
  })

  it('names the open direction without a frame for it', () => {
    seedCommand({ action: 'open', elapsed: VALVE_SEND_MS + 10 })
    const { unmount } = render(<ValveStatusCard systemId={SYS} state="closed" tone="alert" />)
    expect(screen.getByText('Opening…')).toBeTruthy()
    unmount()

    seedCommand({ action: 'open', elapsed: VALVE_SEND_MS + VALVE_ACT_MS + 10 })
    render(<ValveStatusCard systemId={SYS} state="closed" tone="alert" />)
    expect(screen.getByText('Verifying Open')).toBeTruthy()
  })

  /* The redraw card is the EVENT SCREEN's — owner: "use it on the system
     screen and in the event screen when user can shut off valve from water
     events." Same store, same chip, different chassis. */
  it('draws the same sequence on the event screen card', () => {
    seedCommand({ elapsed: VALVE_SEND_MS + 10 })
    render(<ValveStatusCard redraw interactive systemId={SYS} state="open" tone="alert" />)
    expect(screen.getByText('Closing…')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Close valve/ })).toBeNull()
  })
})

describe('the busy sequence — what outranks it', () => {
  /* A FAULT OUTRANKS A COMMAND IN FLIGHT. `error` means the valve has already
     failed to respond to one; "Closing…" over that would be the card
     asserting progress it has been told is not happening. */
  it('draws the unavailable action, not a chip, on a faulted valve', () => {
    seedCommand({ elapsed: VALVE_SEND_MS + 10 })
    render(<ValveStatusCard systemId={SYS} state="error" tone="alert" />)
    expect(chip()).toBeNull()
    expect(screen.getByRole('button', { name: /not available/ })).toBeTruthy()
  })

  /* Unknown has no knowable position, so a direction-specific busy label
     would claim one. The two live actions stay. */
  it('keeps both actions on an unknown valve', () => {
    seedCommand({ elapsed: VALVE_SEND_MS + 10 })
    render(<ValveStatusCard systemId={SYS} state="unknown" tone="alert" />)
    expect(chip()).toBeNull()
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open' })).toBeTruthy()
  })

  /* A card with no systemId is every other mount in the app, and it must be
     untouched by any of this. */
  it('ignores a command in flight when it has not opted in', () => {
    seedCommand({ elapsed: VALVE_SEND_MS + 10 })
    render(<ValveStatusCard state="open" tone="alert" />)
    expect(chip()).toBeNull()
    expect(screen.getByRole('button', { name: 'Close valve' })).toBeTruthy()
  })
})

describe('the busy sequence — it runs, and it settles', () => {
  it('walks the three frames on its own clock and reports once at the end', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const settled = []

    startValveCommand({ systemId: SYS, action: 'close' })
    render(
      <ValveStatusCard
        systemId={SYS}
        state="open"
        tone="alert"
        onSettled={(s) => settled.push(s)}
      />,
    )
    expect(chip().getAttribute('data-busy')).toBe('Sending…')

    await act(async () => {
      vi.advanceTimersByTime(VALVE_SEND_MS + 300)
    })
    expect(chip().getAttribute('data-busy')).toBe('Closing…')

    await act(async () => {
      vi.advanceTimersByTime(VALVE_ACT_MS)
    })
    expect(chip().getAttribute('data-busy')).toBe('Verifying Closed')

    await act(async () => {
      vi.advanceTimersByTime(VALVE_TRANSITION_MS)
    })
    expect(chip()).toBeNull()
    // Told exactly once, and the store has recorded the state.
    expect(settled).toEqual(['closed'])
    expect(getValveCommand(SYS)).toBe('closed')

    // The interval is not still running after it has nothing to watch.
    await act(async () => {
      vi.advanceTimersByTime(VALVE_TRANSITION_MS)
    })
    expect(settled).toEqual(['closed'])
  })

  /* TWO CARDS, ONE COMMAND. The System page mounts this card and mounts
     EventFocusOverlay beside it, which mounts a second one for the same
     system. Both must be told, or the page applies a state the overlay
     already moved on from. */
  it('tells both mounted cards exactly once each', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const a = []
    const b = []

    startValveCommand({ systemId: SYS, action: 'close' })
    render(
      <>
        <ValveStatusCard systemId={SYS} state="open" onSettled={(s) => a.push(s)} />
        <ValveStatusCard redraw systemId={SYS} state="open" onSettled={(s) => b.push(s)} />
      </>,
    )

    await act(async () => {
      vi.advanceTimersByTime(VALVE_TRANSITION_MS + 500)
    })
    expect(a).toEqual(['closed'])
    expect(b).toEqual(['closed'])
  })

  /* THE RELOAD CASE, which is the whole reason this lives in the store. A
     card mounted fresh over a command already in flight picks it up at the
     phase it is actually in — it does not restart at Sending and it does not
     snap back to idle. */
  it('picks a running command up mid-flight on a fresh mount', () => {
    seedCommand({ elapsed: VALVE_SEND_MS + VALVE_ACT_MS + 500 })
    render(<ValveStatusCard systemId={SYS} state="open" tone="alert" />)
    expect(chip().getAttribute('data-busy')).toBe('Verifying Closed')
    expect(screen.getByText('Open')).toBeTruthy()
  })
})
