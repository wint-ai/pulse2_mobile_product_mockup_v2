// @vitest-environment happy-dom
//
// InfoAccordion — the v1 Info tab (`src/screens/systems/SystemInfoTab.jsx`,
// documented by PRD 04h) carried into the v2 Overview scroll as a collapsed
// accordion group.
//
// What these pin, and why each one is here rather than being taken on trust:
//
//   · ALL COLLAPSED on first render. PRD 04h says so, and the group sits at the
//     foot of a long scroll — a section that opens itself buries everything
//     under it.
//   · THE HEADER STAYS PUT when a section expands. NN/g's documented mobile
//     accordion failure is the panel opening and scrolling the header the user
//     just tapped off-screen. Nothing here may call scrollIntoView.
//   · THE CONDITIONAL SECTIONS STAY CONDITIONAL. Location / About / Protects
//     render only when their data exists. The default info record carries a
//     location and a description but an empty `protects`, so the absence of all
//     three is only provable with the record stripped — hence the one mock in
//     this file, which otherwise defers to the real data.
//   · NOTES ROUND-TRIP THROUGH locationInfoStore. It is one of the two places
//     this component writes; a Save that only updates React state would look
//     identical on screen and lose the note on the next mount.
//   · THE SERIAL KEEPS ITS COPY CONTROL. v1 hung it on a bare <span>; it is a
//     real button here, so it is queried as one.

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'

import InfoAccordion from '@/v2/components/InfoAccordion'
import { SYSTEMS_INFO } from '@/data/systemsInfo'
import { getNotesOverride } from '@/data/locationInfoStore'

/* The real dataset has no record with all three conditional fields missing:
   DEFAULT_INFO (what every upstream `ws-*` id falls back to) carries both a
   location and a description, and only `protects` is empty. So one is
   registered on the real info map rather than mocked — this repo's suites run
   against real data and carry no vi.mock anywhere, and vitest gives each test
   file its own module registry, so the key never escapes this file. */
const BARE_ID = 'info-accordion-bare-spec'
SYSTEMS_INFO[BARE_ID] = {
  description: '',
  protects: [],
  installDate: null,
  serialNumber: null,
  manufacturer: 'Wint',
  model: 'Pulse Sensor v2',
  location: null,
  photos: [],
  comments: [],
}

/* `ct1` is a legacy SYSTEMS_INFO_MAP key: the one shape that carries a
   location, a description, a non-empty `protects` AND a serial number, so the
   full eleven-section group renders from it. */
const RICH = { id: 'ct1', name: 'Cooling Tower 1' }

const SECTIONS = [
  'Location',
  'Address',
  'Shipping address',
  'Location contacts',
  'About',
  'Protects',
  'General',
  'Device type',
  'Coverage',
  'Pictures',
  'Notes',
]

const headers = (container) => [...container.querySelectorAll('button[aria-expanded]')]

/* The section titles, in DOM order. Read off `data-info-section` rather than
   off textContent: the header's Material Symbols glyphs are aria-hidden, so
   they vanish from the accessible name that getByRole matches but remain in
   textContent as their ligature words ("square_footCoverageexpand_more"). */
const titleOf = (button) =>
  button.closest('[data-info-section]').getAttribute('data-info-section')
const titles = (container) => headers(container).map(titleOf)

beforeEach(() => {
  localStorage.clear()
})
afterEach(cleanup)

describe('the group as it first lands on the page', () => {
  it('renders every section collapsed, with nothing expanded', () => {
    const { container } = render(<InfoAccordion system={RICH} />)

    const buttons = headers(container)
    expect(titles(container)).toEqual(SECTIONS)
    expect(buttons.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true)

    // Body rendered only when open — not hidden with CSS.
    expect(container.querySelectorAll('[role="region"]')).toHaveLength(0)
    expect(within(container).queryByText('Tower One')).toBeNull()
  })

  it('wires each header to its own panel', () => {
    const { container } = render(<InfoAccordion system={RICH} />)
    const about = within(container).getByRole('button', { name: 'About' })

    fireEvent.click(about)

    const panelId = about.getAttribute('aria-controls')
    const panel = container.querySelector(`#${panelId}`)
    expect(panel, 'aria-controls should point at a panel that exists').toBeTruthy()
    expect(panel.getAttribute('aria-labelledby')).toBe(about.getAttribute('id'))
    expect(panel.getAttribute('role')).toBe('region')
  })
})

describe('opening and closing a section', () => {
  it('reveals the body, then takes it away again', () => {
    const { container } = render(<InfoAccordion system={RICH} />)
    const view = within(container)
    const location = view.getByRole('button', { name: 'Location' })

    fireEvent.click(location)
    expect(location.getAttribute('aria-expanded')).toBe('true')
    expect(view.getByText('Tower One')).toBeTruthy()
    expect(view.getByText('Cooling Tower Enclosure')).toBeTruthy()

    fireEvent.click(location)
    expect(location.getAttribute('aria-expanded')).toBe('false')
    expect(view.queryByText('Tower One')).toBeNull()
  })

  it('opens one section without opening its neighbours', () => {
    const { container } = render(<InfoAccordion system={RICH} />)
    fireEvent.click(within(container).getByRole('button', { name: 'Coverage' }))

    const open = headers(container).filter(
      (b) => b.getAttribute('aria-expanded') === 'true',
    )
    expect(open.map(titleOf)).toEqual(['Coverage'])
  })

  it('leaves the header exactly where the finger left it', () => {
    /* The NN/g failure mode: expanded content scrolls its own header out of
       view. The fix is not to scroll at all, so the assertion is that nothing
       asked the browser to. */
    const scrollIntoView = vi.fn()
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoView

    try {
      const { container } = render(<InfoAccordion system={RICH} />)
      const header = within(container).getByRole('button', { name: 'General' })
      fireEvent.click(header)

      expect(scrollIntoView).not.toHaveBeenCalled()
      /* And the panel is a following sibling of the header inside the card, so
         expanding pushes what is BELOW down rather than moving the header. */
      const panel = container.querySelector(`#${header.getAttribute('aria-controls')}`)
      expect(panel.previousElementSibling).toBe(header)
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })
})

describe('the conditional sections', () => {
  it('drops Location, About and Protects when the record carries none of them', () => {
    const { container } = render(<InfoAccordion system={{ id: BARE_ID }} />)
    const view = within(container)

    expect(view.queryByRole('button', { name: 'Location' })).toBeNull()
    expect(view.queryByRole('button', { name: 'About' })).toBeNull()
    expect(view.queryByRole('button', { name: 'Protects' })).toBeNull()

    // The eight unconditional ones still stand, in order.
    expect(titles(container)).toEqual([
      'Address',
      'Shipping address',
      'Location contacts',
      'General',
      'Device type',
      'Coverage',
      'Pictures',
      'Notes',
    ])
  })

  it('keeps them when the data is there', () => {
    const { container } = render(<InfoAccordion system={RICH} />)
    const view = within(container)

    expect(view.getByRole('button', { name: 'Location' })).toBeTruthy()
    expect(view.getByRole('button', { name: 'About' })).toBeTruthy()
    expect(view.getByRole('button', { name: 'Protects' })).toBeTruthy()

    fireEvent.click(view.getByRole('button', { name: 'Protects' }))
    expect(view.getByText('HVAC cooling loop')).toBeTruthy()
  })
})

describe('Notes — one of the two places this component writes', () => {
  it('round-trips a note through locationInfoStore', () => {
    const scope = 'info-accordion-notes-spec'
    const { container, unmount } = render(<InfoAccordion system={{ id: scope }} />)
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: 'Notes' }))
    expect(view.getByText('No notes yet')).toBeTruthy()
    expect(getNotesOverride(scope)).toBeNull()

    fireEvent.click(view.getByRole('button', { name: 'Add notes' }))
    fireEvent.change(view.getByLabelText('Notes'), {
      target: { value: 'Isolation valve is behind the access panel.' },
    })
    fireEvent.click(view.getByRole('button', { name: 'Save' }))

    // The store took it, not just React state...
    expect(getNotesOverride(scope)).toBe('Isolation valve is behind the access panel.')
    expect(view.getByText('Isolation valve is behind the access panel.')).toBeTruthy()

    // ...which is what makes it survive a remount.
    unmount()
    const again = render(<InfoAccordion system={{ id: scope }} />)
    fireEvent.click(within(again.container).getByRole('button', { name: 'Notes' }))
    expect(
      within(again.container).getByText('Isolation valve is behind the access panel.'),
    ).toBeTruthy()
  })

  it('writes nothing on Cancel', () => {
    const scope = 'info-accordion-notes-cancel'
    const { container } = render(<InfoAccordion system={{ id: scope }} />)
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: 'Notes' }))
    fireEvent.click(view.getByRole('button', { name: 'Add notes' }))
    fireEvent.change(view.getByLabelText('Notes'), { target: { value: 'scratch' } })
    fireEvent.click(view.getByRole('button', { name: 'Cancel' }))

    expect(getNotesOverride(scope)).toBeNull()
    expect(view.getByText('No notes yet')).toBeTruthy()
  })
})

describe('Pictures — the other write', () => {
  it('offers the file picker and says so when there are none', () => {
    const { container } = render(<InfoAccordion system={{ id: 'info-accordion-pics' }} />)
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: 'Pictures' }))
    expect(view.getByText('No pictures yet')).toBeTruthy()

    const input = container.querySelector('input[type="file"]')
    expect(input, 'the picker the Add button clicks through to').toBeTruthy()
    expect(input.getAttribute('accept')).toBe('image/*')
  })
})

describe('the serial number', () => {
  it('keeps a labelled copy control that reaches the clipboard', () => {
    const writeText = vi.fn()
    const original = navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    try {
      const { container } = render(<InfoAccordion system={RICH} />)
      const view = within(container)

      fireEvent.click(view.getByRole('button', { name: 'Device type' }))
      expect(view.getByText('WT-2022-SC-TO-CT1')).toBeTruthy()

      const copy = view.getByRole('button', { name: 'Copy Serial number' })
      fireEvent.click(copy)
      expect(writeText).toHaveBeenCalledWith('WT-2022-SC-TO-CT1')
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        value: original,
        configurable: true,
      })
    }
  })
})
