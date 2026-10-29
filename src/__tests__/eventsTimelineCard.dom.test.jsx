// @vitest-environment happy-dom
//
// EventsTimelineCard, after the redesigned System page (Figma 199383:141630,
// the alert page 199383:141499 / 199359:126908, the calm page 199359:126785).
// These lock the three things the redesign touched that nothing else guards:
//
//  1. The "n sent" chip read `event.notifications.count`, but the live page
//     passes recipientsOf()'s return value (src/data/upstream/generateEvents.js)
//     — an ARRAY. An array is truthy, so every real row on the System page
//     rendered a chip reading literally "undefined sent".
//  2. The "All" control was a frame, not a control. It is now a real
//     <button aria-haspopup="listbox"> whose options are the status labels the
//     supplied events actually carry — never invented categories — and a
//     `period` value the card does not offer must NOT empty the card.
//  3. The two Figma states are now IDENTICAL — the header title that used to
//     differ (calm regular/slate-700 vs alert semibold/slate-800) is semibold /
//     slate-800 / -0.45px in both. `tone` is still a prop two callers pass, so
//     it must keep being accepted, and nothing may branch on it.
//     The title's own line-height is asserted because CardTitle is
//     cn("...leading-none...", className) and tailwind-merge DELETES a
//     `leading-` spelled before `text-[length:...]` — which is Figma's own
//     alphabetical order, and which silently dropped the design's 18px once.
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

const TITLE_NODE = '[data-node-id="I199383:141630;149:2490;2780:50631"]'

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

describe('the header title matches the one spelling both Figma states draw', () => {
  const titleClass = (tone) => {
    const { container } = render(<EventsTimelineCard events={EVENTS} tone={tone} />)
    const cls = container.querySelector(TITLE_NODE).className
    cleanup()
    return cls
  }

  it('is semibold slate/800 at 18px with -0.45px tracking, in BOTH tones', () => {
    for (const tone of ['calm', 'alert']) {
      const cls = titleClass(tone)
      expect(cls).toContain('font-semibold')
      expect(cls).toContain('text-slate-800')
      expect(cls).toContain('tracking-[-0.45px]')
      expect(cls).toContain('text-lg')
      // The pre-redesign calm spelling is gone from both Figma nodes.
      expect(cls).not.toContain('text-slate-700')
      expect(cls).not.toContain('font-normal')
    }
  })

  it('keeps leading-[18px] through CardTitle’s cn() instead of losing it to twMerge', () => {
    // Figma's alphabetical order puts `leading-` before the font-size atom,
    // which tailwind-merge treats as a font-size conflict and deletes. The
    // atom order in TITLE_FIGMA is deliberate — line-height goes last.
    expect(titleClass('calm')).toContain('leading-[18px]')
  })

  it('carries the project sans family, not the bare Figma style name', () => {
    // Phase 3 (docs/TOKENIZATION-PLAN.md) replaced
    // font-[family-name:var(--font\/family\/sans,'Figtree:SemiBold'),…] with
    // `font-sans`, which compiles to var(--font-sans) — one themeable stack.
    const cls = titleClass('alert')
    expect(cls).toContain('font-sans')
    expect(cls).not.toContain('Figtree:')
  })

  it('renders byte-identically in the two states — nothing branches on tone', () => {
    const htmlFor = (tone) => {
      const { container } = render(<EventsTimelineCard events={EVENTS} tone={tone} />)
      // The root's own data-node-id names which Figma node is being stood in
      // for, so it is the one attribute allowed to differ.
      const html = container.firstElementChild.innerHTML
      cleanup()
      return html
    }
    expect(htmlFor('calm')).toBe(htmlFor('alert'))
  })
})

describe('the bare mount draws the water-event overlay\u2019s own three rows', () => {
  /* 199772:145585 (canonical frame 199772:145451) and 199754:28770 (the
     ignored state 199754:28589) draw this card identically, and both sit below
     the ~100KB truncation that hid them from the earlier survey. Their three
     rows are the default `events`. This pins the claim that MOCK_EVENTS rows
     1-3 are frame-verbatim, because nothing else can tell. */
  it('rows 1-2 are "High Flow Anomaly" / "Ended", not the old "Ongoing"', () => {
    const { container } = render(<EventsTimelineCard />)
    const rows = container.querySelectorAll('[data-name="Activity feed item"]')
    for (const row of [rows[0], rows[1]]) {
      expect(row.textContent).toContain('High Flow Anomaly')
      expect(row.textContent).toContain('Ended')
      expect(row.textContent).toContain('Leak confirmed')
      expect(row.textContent).toContain('Apr 02, 2026 08:13:15')
    }
    const text = container.textContent
    /* 199532:89881 / :90096 spell the chip "Ended". No current node draws an
       "Ongoing" row in this card; BADGE_TONE.warning is kept for the live
       badge SystemPageV2Screen.jsx:671 builds, not for this fixture. */
    expect(text).not.toContain('Ongoing')
  })

  it('row 3 is the wifi row: no status chip, no metrics, a "Tag" chip', () => {
    const { container } = render(<EventsTimelineCard />)
    const rows = container.querySelectorAll('[data-name="Activity feed item"]')
    const third = rows[2]
    expect(third.textContent).toContain('Connectivity Restored')
    expect(third.textContent).toContain('Offline for 2h 15m')
    expect(third.textContent).toContain('Tag')
    // 199532:89937 holds the title alone — no badge beside it, and no metrics.
    expect(third.textContent).not.toContain('Ended')
    expect(third.textContent).not.toContain('L/h\u00b7Volume')
  })

  it('every avatar is the circle the current master draws, not the squircle', () => {
    const { container } = render(<EventsTimelineCard />)
    const avatars = container.querySelectorAll('[data-node-id="I199383:141630;101006:7299;199383:141684"]')
    expect(avatars.length).toBeGreaterThan(0)
    for (const a of avatars) {
      /* rounded-[30px] on 199532:89873 / :90088 / :89931 in both overlay cards
         and on the System page's own instances. rounded-[8.19px] survives only
         in 199296:50453, the superseded copy. */
      expect(a.className).toContain('rounded-[30px]')
      expect(a.className).not.toContain('rounded-[8.19px]')
    }
    // The old shape is not deleted, only no longer the default.
    const { container: sq } = render(
      <EventsTimelineCard events={[{ id: 's', kind: 'water', title: 'T', avatarShape: 'squircle' }]} />,
    )
    expect(
      sq.querySelector('[data-node-id="I199383:141630;101006:7299;199383:141684"]').className,
    ).toContain('rounded-[8.19px]')
  })

  it('the network bubble is the themeable slate, never the unmapped blue-100', () => {
    const { container } = render(<EventsTimelineCard />)
    const rows = container.querySelectorAll('[data-name="Activity feed item"]')
    const bubble = rows[2].querySelector('[data-node-id="I199383:141630;101006:7299;199383:141684"]')
    /* 199532:89931 is colors/slate/100. bg-blue-100 was also unthemeable:
       index.css maps no --color-blue-100, so it bound to stock Tailwind and
       stood still under ?theme=contrast. */
    expect(bubble.className).toContain('bg-slate-100')
    expect(container.innerHTML).not.toContain('bg-blue-100')
  })
})

describe('the card box survives cn() into the DOM', () => {
  it('keeps the border, the radius and the fixed box', () => {
    const { container } = render(<EventsTimelineCard events={EVENTS} />)
    // Default tone is 'calm' -> the calm page's card, 199359:126908.
    const root = container.querySelector('[data-node-id="199359:126908"]')
    /* Phase 4: the rim is `border-card`, not a literal `border-white`.
       --card IS #ffffff in `light`, so this is the same pixel and a
       different, themeable name. */
    expect(root.className).toContain('border border-solid border-card')
    expect(root.className).toContain('bg-surface-card')
    expect(root.className).toContain('rounded-[18px]')
    expect(root.className).toContain('max-h-[380px]')
    expect(root.className).toContain('overflow-clip')
    // Phase 3 deleted every two-argument var() here; an escaped Figma token
    // name coming back would mean a call site was re-imported un-tokenised.
    expect(root.className).not.toContain('\\/')
  })
})
