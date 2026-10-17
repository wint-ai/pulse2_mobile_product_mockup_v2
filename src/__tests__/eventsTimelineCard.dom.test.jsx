// @vitest-environment happy-dom
//
// EventsTimelineCard, after the redesigned System page (Figma 199296:50453
// calm / 199296:50716 alert). These lock the three things the redesign touched
// that nothing else guards:
//
//  1. The "n sent" chip read `event.notifications.count`, but the live page
//     passes recipientsOf()'s return value (src/data/upstream/generateEvents.js)
//     — an ARRAY. An array is truthy, so every real row on the System page
//     rendered a chip reading literally "undefined sent".
//  2. The "All" control was a frame, not a control. It is now a real
//     <button aria-haspopup="listbox"> whose options are the status labels the
//     supplied events actually carry — never invented categories — and a
//     `period` value the card does not offer must NOT empty the card.
//  3. `tone` is the ONLY difference between the two Figma states: the header
//     title's weight/colour/tracking. Everything else is identical in both
//     emitted ranges, so nothing else may branch on it.
//
// The empty state and the Figma `\/` token spellings are asserted alongside,
// because both have regressed here before.

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import EventsTimelineCard from '@/v2/components/EventsTimelineCard'

afterEach(cleanup)

/** The shape SystemPageV2Screen actually builds from getEventsForSystem(). */
const EVENTS = [
  {
    id: 'a',
    kind: 'water',
    title: 'Alpha leak',
    badge: { label: 'Ongoing', tone: 'warning' },
    description: 'Leak confirmed',
    timestamp: 'Apr 02, 2026 08:13:15',
    notifications: [{ name: 'X' }, { name: 'Y' }],
  },
  {
    id: 'b',
    kind: 'network',
    title: 'Beta offline',
    badge: { label: 'Ended', tone: 'ended' },
    description: 'Offline for 2h 15m',
    timestamp: 'Apr 01, 2026 11:02:00',
    notifications: [],
  },
]

const TITLE_NODE = '[data-node-id="I199296:50453;149:2490;2780:50631"]'

describe('EventsTimelineCard renders the routed system’s own events', () => {
  it('draws the supplied events and never the mock defaults', () => {
    const { container } = render(<EventsTimelineCard events={EVENTS} />)
    const text = container.textContent
    expect(text).toContain('Alpha leak')
    expect(text).toContain('Beta offline')
    expect(text).not.toContain('High Flow Anomaly')
  })

  it('counts an ARRAY of recipients instead of printing "undefined sent"', () => {
    const { container } = render(<EventsTimelineCard events={EVENTS} />)
    expect(container.textContent).not.toContain('undefined sent')
    expect(container.textContent).toContain('2 sent')
  })

  it('accepts the {count} and number shapes too, and hides a zero', () => {
    const { container } = render(
      <EventsTimelineCard
        events={[
          { ...EVENTS[0], id: 'c1', notifications: { count: 4 } },
          { ...EVENTS[0], id: 'c2', notifications: 7 },
          { ...EVENTS[0], id: 'c3', notifications: [] },
        ]}
      />,
    )
    expect(container.textContent).toContain('4 sent')
    expect(container.textContent).toContain('7 sent')
    expect(container.textContent).not.toContain('0 sent')
  })

  it('keeps its own empty state for a system with no history', () => {
    const { container } = render(<EventsTimelineCard events={[]} />)
    expect(container.textContent).toContain('No events yet')
  })
})

describe('the "All" control is a real filter wired from the event data', () => {
  it('offers only the status labels the events actually carry', () => {
    render(<EventsTimelineCard events={EVENTS} />)
    const btn = screen.getByRole('button', { name: /Filter events, currently All/ })
    expect(btn.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(btn)
    expect(btn.getAttribute('aria-expanded')).toBe('true')

    const box = screen.getByRole('listbox', { name: 'Filter events' })
    const labels = within(box).getAllByRole('option').map((o) => o.textContent)
    expect(labels.some((l) => l.startsWith('All'))).toBe(true)
    expect(labels.some((l) => l.startsWith('Ongoing'))).toBe(true)
    expect(labels.some((l) => l.startsWith('Ended'))).toBe(true)
    // Nothing invented: no category the data does not contain.
    expect(labels.length).toBe(3)
  })

  it('actually filters the rows', () => {
    render(<EventsTimelineCard events={EVENTS} />)
    fireEvent.click(screen.getByRole('button', { name: /Filter events/ }))
    const box = screen.getByRole('listbox', { name: 'Filter events' })
    fireEvent.click(within(box).getByRole('option', { name: /Ongoing/ }))

    expect(screen.getByText('Alpha leak')).toBeTruthy()
    expect(screen.queryByText('Beta offline')).toBeNull()
  })

  it('reports the pick to onSelectPeriod when the parent owns the value', () => {
    const picked = []
    render(<EventsTimelineCard events={EVENTS} period="All" onSelectPeriod={(p) => picked.push(p)} />)
    fireEvent.click(screen.getByRole('button', { name: /Filter events/ }))
    const box = screen.getByRole('listbox', { name: 'Filter events' })
    fireEvent.click(within(box).getByRole('option', { name: /Ended/ }))
    expect(picked).toEqual(['Ended'])
  })

  it('is inert — not a dead button — when there is nothing to filter on', () => {
    render(<EventsTimelineCard events={[EVENTS[0]]} />)
    expect(screen.queryByRole('button', { name: /Filter events/ })).toBeNull()
    expect(screen.getByText('All')).toBeTruthy()
  })

  it('a period the card does not offer shows everything rather than emptying the card', () => {
    const { container } = render(<EventsTimelineCard events={[EVENTS[0]]} period="Ended" />)
    expect(container.textContent).toContain('Alpha leak')
    expect(container.textContent).not.toContain('No events yet')
  })
})

describe('tone is the only difference between the two Figma states', () => {
  const titleClass = (tone) => {
    const { container } = render(<EventsTimelineCard events={EVENTS} tone={tone} />)
    const cls = container.querySelector(TITLE_NODE).className
    cleanup()
    return cls
  }

  it('calm draws the regular slate/700 title, alert the semibold slate/800 one', () => {
    const calm = titleClass('calm')
    const alert = titleClass('alert')
    expect(calm).toContain('font-normal,400')
    expect(calm).toContain('slate\\/700,#314158')
    expect(alert).toContain('font-semibold,600')
    expect(alert).toContain('slate\\/800,#1d293d')
    expect(alert).toContain('tracking-[-0.45px]')
  })

  it('the rows are byte-identical between the two states', () => {
    const rowsFor = (tone) => {
      const { container } = render(<EventsTimelineCard events={EVENTS} tone={tone} />)
      const html = container.querySelector('ul').outerHTML
      cleanup()
      return html
    }
    expect(rowsFor('calm')).toBe(rowsFor('alert'))
  })
})

describe('the Figma token spellings survive into the DOM', () => {
  it('keeps the escaped var() names and the fixed card box', () => {
    const { container } = render(<EventsTimelineCard events={EVENTS} />)
    const root = container.querySelector('[data-node-id="199296:50453"]')
    // A plain JS string through cn() would have eaten this backslash.
    expect(root.className).toContain('--border-width\\/border,1px')
    expect(root.className).toContain('rounded-[var(--rounded-2xl,18px)]')
    expect(root.className).toContain('h-[380px]')
    expect(root.className).toContain('overflow-clip')
    // ...and a doubled backslash would emit a class Tailwind never generates.
    expect(root.className).not.toContain('\\\\/')
  })
})
