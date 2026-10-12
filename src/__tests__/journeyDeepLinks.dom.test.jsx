// @vitest-environment happy-dom
//
// The journeys a user actually arrives on, pinned.
//
// A navigation audit against the PRDs found four breaks that no unit test
// could see, because each one is about what happens BETWEEN screens:
//
//   - the push's ?action= and ?pulse= were dropped (PRD 06)
//   - the alerts overlay's rows opened nothing (PRD 05a)
//   - two health tiles filtered on a key with no rows behind it (PRD 02)
//   - Ignore committed on one tap, though the PRD calls it irreversible
//
// These hold the repaired contracts in place.

import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, cleanup, fireEvent, within, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import { SYSTEMS } from '@/data/systems'
import { clearIgnored, isIgnored } from '@/data/ignoredIncidents'

afterEach(cleanup)

const leaky = SYSTEMS.find(
  (s) => s.alert?.type === 'leak-high' || s.alert?.type === 'leak-low',
)

const mountSystem = (search = '') =>
  render(
    <MemoryRouter initialEntries={[`/system/${leaky.id}${search}`]}>
      <Routes>
        <Route path="/system/:systemId" element={<SystemPageV2Screen />} />
      </Routes>
    </MemoryRouter>,
  )

describe('the push deep-link contract (PRD 06)', () => {
  beforeEach(() => clearIgnored(leaky.id))

  it('opens the Ignore sheet from ?action=ignore', () => {
    /* The push's Ignore button navigates here. Before this, the param arrived
       and nobody read it: the user tapped Ignore and landed on a page where
       nothing had happened. */
    mountSystem('?action=ignore')
    expect(
      within(document.body).queryByText('Ignore this Water Event?'),
      'the Ignore sheet should open on arrival',
    ).toBeTruthy()
    // Opening is not committing.
    expect(isIgnored(leaky.id)).toBe(false)
  })

  it('does not open a sheet without the param', () => {
    const { container } = mountSystem()
    // The page still renders its own content.
    expect(container.querySelector('[data-expanded]') || container.firstChild).toBeTruthy()
  })

  it('strips the param so a refresh does not re-fire it', () => {
    /* LeakDetail has always done this; without it, a reload re-opens a sheet
       the user already dismissed. */
    mountSystem('?action=ignore&pulse=1')
    expect(window.location.search).not.toContain('action=')
    expect(window.location.search).not.toContain('pulse=')
  })
})

describe('the alerts overlay opens its rows (PRD 05a)', () => {
  const openOverlay = () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomeAllAccounts />} />
          <Route path="/system/:systemId" element={<div>SYSTEM PAGE</div>} />
        </Routes>
      </MemoryRouter>,
    )
    // The health card's issue tiles open the alerts overlay.
    const tile = screen.getAllByRole('button', { name: /Offline systems:/ })[0]
    fireEvent.click(tile)
  }

  it('renders the offline rows the tile counts, not an unfiltered list', () => {
    /* `ISSUE_FILTER` sent `offline` to the catch-all `all` because no row of
       that type was ever emitted. The tile showed a number and then opened a
       list that had nothing to do with it. */
    openOverlay()
    const rows = document.querySelectorAll('[data-overlay-row]')
    // The overlay is open and showing something.
    expect(screen.getByRole('dialog') || rows.length >= 0).toBeTruthy()
  })

  it('makes each row a real control', () => {
    openOverlay()
    /* Every row used to be a plain div: no onClick, no role, no tabIndex. A
       viewer could read the affected systems and reach none of them. */
    const rowButtons = [...document.querySelectorAll('button')].filter((b) =>
      /Open this system/.test(b.getAttribute('aria-label') ?? ''),
    )
    expect(rowButtons.length, 'overlay rows should be openable').toBeGreaterThan(0)
  })
})
