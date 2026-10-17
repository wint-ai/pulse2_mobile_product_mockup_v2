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
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import TriageBand from '@/v2/components/TriageBand'

const EVENTS = [
  { id: 'a', systemName: 'Short low',  location: 'Block A', type: 'leak-low',  duration: '12m' },
  { id: 'b', systemName: 'Long high',  location: 'Block B', type: 'leak-high', duration: '11h 58m' },
  { id: 'c', systemName: 'Short high', location: 'Block C', type: 'leak-high', duration: '2h 05m' },
  { id: 'd', systemName: 'Long low',   location: 'Block D', type: 'leak-low',  duration: '23h 10m' },
]

const ISSUES = { offline: 10, valve: 12, power: 10, recipients: 4 }

beforeEach(cleanup)

function mount(props = {}) {
  return render(
    <TriageBand total={103} attention={56} issues={ISSUES} events={EVENTS} {...props} />,
  )
}

describe('the headline answers the screen', () => {
  it('states the count against its denominator', () => {
    const { container } = mount()
    expect(container.textContent).toContain('56')
    expect(container.textContent).toContain('103')
    expect(container.textContent).toContain('systems need attention')
  })

  it('reads as all-clear when nothing needs attention', () => {
    const { container } = render(
      <TriageBand total={40} attention={0} issues={{}} events={[]} />,
    )
    expect(container.textContent).toContain('All 40 systems are healthy')
    expect(container.textContent).not.toContain('need attention')
  })

  it('prints the counts rather than leaving them to the bar', () => {
    // A divided bar only supports a position judgement in its bottom segment;
    // every other segment is read by length. The numbers are not optional.
    const { container } = mount()
    expect(container.textContent).toContain('47')
    expect(container.textContent).toContain('healthy')
  })
})

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
        total={9} attention={2} issues={{}}
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

describe('three counters, and the tail rolled up', () => {
  it('shows exactly the three that change what you do today', () => {
    mount()
    // The counter reports the events it was given, which is the fixture's 4.
    expect(screen.getByRole('button', { name: /Water events: 4/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Offline systems: 10/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Valve errors: 12/ })).toBeInTheDocument()
  })

  it('rolls power and recipients into one "other issues" row', () => {
    const { container } = mount()
    // 10 + 4, not two more tiles of equal weight.
    expect(container.textContent).toContain('14')
    expect(container.textContent).toContain('other issues')
  })

  it('keeps the full term for a screen reader even though the chip is short', () => {
    mount()
    // Visible label is "Offline"; the accessible name is the domain term.
    expect(screen.getByRole('button', { name: /Offline systems:/ })).toBeInTheDocument()
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

  it('routes a counter to its filtered list', () => {
    let kind = null
    mount({ onSelectIssue: k => { kind = k } })
    fireEvent.click(screen.getByRole('button', { name: /Offline systems:/ }))
    expect(kind).toBe('offline')
  })

  it('offers the full list when it is showing only a preview', () => {
    let opened = false
    mount({ onViewAll: () => { opened = true } })
    fireEvent.click(screen.getByRole('button', { name: /View all 4 water events/ }))
    expect(opened).toBe(true)
  })
})
