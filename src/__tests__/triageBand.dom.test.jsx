// @vitest-environment happy-dom
/**
 * The triage band is the answer to "is anything wrong, where, and how urgent"
 * — the only question a user arriving in a hurry has. Before it, the overview
 * reported "56 Water events" and no location at all: the data was computed and
 * then thrown away behind a collapsed card.
 *
 * These guard the three properties that make it a triage surface rather than
 * another stat card: it names the worst systems, it says WHERE they are, and
 * it ranks by severity then duration.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import TriageBand from '@/v2/components/TriageBand'

/* The fleet count, the healthy/attention bar and the three fault counters
   moved OUT of this component and into SystemHealthCard, which is what Figma
   199323:12124 actually draws. Their guarantees did not disappear — they are
   asserted in systemHealthCard.dom.test.jsx. What stays here is the half the
   design keeps as its own "Water events" section and the health card does not
   carry: the worst few events, WITH their location, ranked. */

const EVENTS = [
  { id: 'a', systemName: 'Short low',  location: 'Block A', type: 'leak-low',  duration: '12m' },
  { id: 'b', systemName: 'Long high',  location: 'Block B', type: 'leak-high', duration: '11h 58m' },
  { id: 'c', systemName: 'Short high', location: 'Block C', type: 'leak-high', duration: '2h 05m' },
  { id: 'd', systemName: 'Long low',   location: 'Block D', type: 'leak-low',  duration: '23h 10m' },
]

beforeEach(cleanup)

function mount(props = {}) {
  return render(
    <TriageBand events={EVENTS} {...props} />,
  )
}

describe('it says WHERE, which is what the screen was missing', () => {
  it('names the system and its location on every row', () => {
    mount()
    expect(screen.getByText('Long high')).toBeInTheDocument()
    expect(screen.getByText('Block B')).toBeInTheDocument()
  })

  it('ranks high flow above low flow, then longest-running first', () => {
    const { container } = mount()
    const shown = [...container.querySelectorAll('button')]
      .map(b => b.getAttribute('aria-label') || '')
      .filter(l => /running /.test(l))
    // High flow outranks low flow regardless of age; within high flow the
    // longer leak wins. "Long low" is 23h but low, so it does not displace
    // either high-flow row from the preview.
    expect(shown[0]).toContain('Long high')
    expect(shown[1]).toContain('Short high')
  })

  it('sorts duration numerically, not as text', () => {
    // "11h 58m" must outrank "2h 05m" — compared as strings it would not.
    const { container } = render(
      <TriageBand
        events={[
          { id: 'x', systemName: 'Two hours',   location: 'L', type: 'leak-high', duration: '2h 05m' },
          { id: 'y', systemName: 'Eleven hours', location: 'L', type: 'leak-high', duration: '11h 58m' },
        ]}
      />,
    )
    const first = [...container.querySelectorAll('button')]
      .map(b => b.getAttribute('aria-label') || '')
      .find(l => /running /.test(l))
    expect(first).toContain('Eleven hours')
  })
})

describe('everything is a way in', () => {
  it('routes a row to its event', () => {
    let picked = null
    mount({ onSelectEvent: e => { picked = e } })
    const row = [...document.querySelectorAll('button')]
      .find(b => /running /.test(b.getAttribute('aria-label') || ''))
    fireEvent.click(row)
    expect(picked?.systemName).toBe('Long high')
  })

  it('offers the full list when it is showing only a preview', () => {
    let opened = false
    mount({ onViewAll: () => { opened = true } })
    fireEvent.click(screen.getByRole('button', { name: /View all 4 water events/ }))
    expect(opened).toBe(true)
  })
})

describe('severity is what the event IS, never a default', () => {
  /* `event.type === 'leak-high' ? TONE.high : TONE.low` stood in EventRow
     until 2026-10-22: ANY type that was not high flow was drawn as "Low
     Flow". Paired with a caller that handed the band every alerting system,
     220 Harborview Ave showed an Offline system and a system with no
     external power as two Low Flow water events on a scope with no water
     events at all. HomeAllAccounts no longer sends faults here, but this
     band must not disguise one if anything ever does again — the two halves
     are independent on purpose. */

  it('labels each leak with its own severity', () => {
    mount()
    expect(screen.getAllByText('High Flow').length).toBe(2)
    expect(screen.getAllByText('Low Flow').length).toBe(2)
  })

  it('does not draw a non-leak type as Low Flow', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <TriageBand
        events={[
          { id: 'off', systemName: 'Offline unit', location: 'L', type: 'offline',     duration: '3h 00m' },
          { id: 'pwr', systemName: 'No power',     location: 'L', type: 'power-lost',  duration: '2h 00m' },
          { id: 'vlv', systemName: 'Bad valve',    location: 'L', type: 'valve-error', duration: '1h 00m' },
        ]}
      />,
    )
    expect(screen.queryByText('Low Flow'), 'a device fault was painted as a leak').toBeNull()
    expect(screen.queryByText('High Flow')).toBeNull()

    // The row is NOT dropped — that would lose real state silently, which is
    // the same failure in the other direction. It says what it actually is.
    const labels = [...container.querySelectorAll('button')]
      .map(b => b.getAttribute('aria-label') || '')
      .filter(l => /running /.test(l))
    expect(labels.length).toBe(3)
    expect(labels.join(' | ')).toContain('Unrecognised event type: offline')
    expect(screen.getByText('offline')).toBeInTheDocument()

    // And it is loud about it rather than silently wrong.
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
