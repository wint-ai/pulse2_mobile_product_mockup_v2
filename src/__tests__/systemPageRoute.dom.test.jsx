// @vitest-environment happy-dom
/**
 * The v2 system page used to render a hardcoded `SYS` const lifted from the
 * Figma comp, so every system in the app showed "Floor 26" at "North Quarter
 * Ltd." no matter what /system/:systemId said. The page never called
 * useParams and imported nothing from @/data.
 *
 * These assert the page actually reads the route: two different systems must
 * render their own names, and an id that matches nothing must not render a
 * plausible-looking page.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SystemPage from '@/v2/pages/SystemPage'
import { SYSTEMS } from '@/data/systems'

beforeEach(() => {
  localStorage.clear()
  cleanup()
})

function renderAt(systemId) {
  return render(
    <MemoryRouter initialEntries={[`/system/${systemId}`]}>
      <Routes>
        <Route path="/system/:systemId" element={<SystemPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

// One commercial system and one residential apartment, so the two cases the
// dataset actually contains are both covered.
const OFFICE = SYSTEMS.find(s => s.l2Name === 'Office')
const APARTMENT = SYSTEMS.find(s => s.id === 'esrt-bldg-A-apt-2')

describe('v2 system page reads the route', () => {
  it('the fixture systems exist and have distinct names', () => {
    expect(OFFICE).toBeTruthy()
    expect(APARTMENT).toBeTruthy()
    expect(OFFICE.name).not.toBe(APARTMENT.name)
  })

  it('renders the routed system name, not a hardcoded title', () => {
    renderAt(OFFICE.id)
    expect(screen.getAllByText(OFFICE.name).length).toBeGreaterThan(0)
    // The Figma placeholders must not survive anywhere on the page.
    expect(screen.queryByText('Floor 26')).toBeNull()
    expect(screen.queryByText('North Quarter Ltd.')).toBeNull()
  })

  it('renders a different system when the route changes', () => {
    renderAt(APARTMENT.id)
    expect(screen.getAllByText(APARTMENT.name).length).toBeGreaterThan(0)
    expect(screen.queryByText(OFFICE.name)).toBeNull()
  })

  it('puts the system\'s own location in the breadcrumb', () => {
    renderAt(OFFICE.id)
    // l4Name is the building/site the system hangs off.
    expect(screen.getAllByText(OFFICE.l4Name).length).toBeGreaterThan(0)
  })

  it('does not render a plausible page for an unknown system id', () => {
    renderAt('no-such-system')
    expect(screen.queryByText('Floor 26')).toBeNull()
    expect(screen.getByText(/No system with id/i)).toBeInTheDocument()
  })
})
