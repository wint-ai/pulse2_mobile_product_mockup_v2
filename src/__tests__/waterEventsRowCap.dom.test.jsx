// @vitest-environment happy-dom
//
// "Shows 5 max items + show more button. When pressing the systems address,
//  the full address expands below; another click closes."
//
// The five-row cap was already DESCRIBED in this component — its MOCK_EVENTS
// note reads "the comp's header reads '25 Water events' while the body draws
// five rows and defers the rest to Show all" — and was never implemented. With
// the real 52 events the card ran the length of the screen.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import ActiveWaterEventsCard from '@/v2/components/ActiveWaterEventsCard'

afterEach(cleanup)

const eventsOf = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `e${i}`,
    systemName: `System ${i}`,
    location: 'San Francisco',
    address: `${100 + i} Washington Street, Hanover MA 02339`,
    type: i % 2 ? 'leak-high' : 'leak-low',
    detectedAt: 'Apr 02, 2026 08:13:15',
    duration: '6h 36m',
  }))

const card = (n, props = {}) =>
  render(<ActiveWaterEventsCard events={eventsOf(n)} {...props} />)

const openCard = (container) => {
  const header = within(container)
    .getAllByRole('button', { expanded: false })
    .find((el) => /water events/i.test(el.textContent || ''))
  if (header) fireEvent.click(header)
}

const rowCount = (container) =>
  within(container).queryAllByRole('button', { name: /^Show the full address/ }).length

describe('the body shows at most five rows', () => {
  it('draws five of fifty-two, and offers Show all', () => {
    const { container } = card(52, { onShowAll: () => {} })
    openCard(container)
    expect(rowCount(container)).toBe(5)
    expect(within(container).getByText('Show all')).toBeTruthy()
  })

  it('still counts the FULL set in the header, not the five on screen', () => {
    const { container } = card(52, { onShowAll: () => {} })
    const text = (container.textContent || '').replace(/\s+/g, ' ')
    // The card says how many there are and shows the first five of them.
    expect(text).toContain('52 Water events')
  })

  it('withholds Show all when five or fewer — it would show the same five', () => {
    const { container } = card(4, { onShowAll: () => {} })
    openCard(container)
    expect(rowCount(container)).toBe(4)
    expect(within(container).queryByText('Show all')).toBeNull()
  })
})

describe('the address expands in place', () => {
  it('opens on press and closes on a second press', () => {
    const { container } = card(3)
    openCard(container)
    const addr = within(container).getAllByRole('button', { name: /^Show the full address/ })[0]

    expect(addr.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(addr)
    expect(addr.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(addr)
    expect(addr.getAttribute('aria-expanded')).toBe('false')
  })

  it('keeps only one open — opening a second closes the first', () => {
    const { container } = card(3)
    openCard(container)
    const [a, b] = within(container).getAllByRole('button', { name: /^Show the full address/ })

    fireEvent.click(a)
    expect(a.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(b)
    expect(a.getAttribute('aria-expanded')).toBe('false')
    expect(b.getAttribute('aria-expanded')).toBe('true')
  })
})
