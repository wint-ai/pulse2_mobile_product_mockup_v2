// @vitest-environment happy-dom
//
// The System tab is mounted on the location / account entity, and it must
// report on the systems THIS screen is scoped to — not the whole fleet. That
// scoping (scopedSystems) is the same resolution the health card uses, and it
// has been wrong before: omitting l1Name once made /location/United%20States
// match nothing and render zeros for a node the drawer itself labels 103.
//
// So these tests walk the real page rather than the card in isolation.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import { SYSTEMS } from '@/data/systems'

afterEach(cleanup)

/* The :locationName route has to be declared, not just visited — rendering the
   page bare under a MemoryRouter leaves useParams() empty, so every path
   silently reads as the root scope and a scoping test passes vacuously. */
const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<HomeAllAccounts />} />
        <Route path="/location/:locationName" element={<HomeAllAccounts />} />
      </Routes>
    </MemoryRouter>,
  )

const openSystemsTab = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Systems' }))
}

describe('the System tab', () => {
  it('sits alongside Overview and General Info', () => {
    renderAt('/')
    for (const name of ['Overview', 'Systems', 'General Info']) {
      expect(screen.getByRole('button', { name }), name).toBeTruthy()
    }
  })

  it('shows the table, and Overview’s cards go away', () => {
    renderAt('/')
    expect(screen.getByText('Water consumption')).toBeTruthy()

    openSystemsTab()

    expect(screen.getByRole('columnheader', { name: 'System' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Leak' })).toBeTruthy()
    expect(screen.queryByText('Water consumption')).toBeNull()
  })

  it('counts the whole fleet at the root scope', () => {
    const { container } = renderAt('/')
    openSystemsTab()

    const pages = Math.ceil(SYSTEMS.length / 6)
    expect(within(container).getByText(`Page 1 of ${pages}`)).toBeTruthy()
  })

  it('narrows to the systems of the location it is scoped to', () => {
    // Pick a real leaf location from the dataset rather than hard-coding a
    // name that a data refresh could retire.
    const site = SYSTEMS.find((s) => s.l4Name)?.l4Name
    expect(site, 'dataset should carry at least one named site').toBeTruthy()

    const { container } = renderAt(`/location/${encodeURIComponent(site)}`)
    openSystemsTab()

    /* Deliberately NOT re-implementing scopedSystems' rule here. It matches
       four location levels plus the account name with a parent rollup, and a
       test that restates it is a test that agrees with it — which is exactly
       how the l1Name bug survived its first test. Assert the relation instead:
       a leaf site is a strict subset of the fleet, and every row on screen
       belongs to it. */
    const fleetPages = Math.ceil(SYSTEMS.length / 6)
    const shown = within(container).getByText(/^Page 1 of \d+$/).textContent
    const scopedPages = Number(/of (\d+)/.exec(shown)[1])

    expect(scopedPages).toBeGreaterThan(0)
    expect(scopedPages, 'a single site must be narrower than the fleet').toBeLessThan(fleetPages)

    // The identity cell's sub-line is the site, so every visible row names it.
    const rows = [...container.querySelectorAll('tbody tr')]
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(within(row).getAllByText(site).length, row.textContent).toBeGreaterThan(0)
    }
  })
})
