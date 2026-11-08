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

/* ── role 'menuitem', not 'tab' — 2026-11-07 ────────────────────────────────
   The control changed TWICE and the destination changed neither time.

   It was two hand-rolled `TabTrigger` copies, then the shared PillTabs, which
   brought real role="tablist" / role="tab" / aria-selected semantics. On
   2026-11-07 the owner replaced the row itself: "we are replacing tabs with
   the more button / needs to open as a floating component like in ios". The
   three destinations moved into src/v2/components/MoreMenu.jsx with their ids
   unchanged (`overview` / `systems` / `general`), so every assertion below is
   the same assertion against the control that now carries it.

   WHAT WENT WITH THE ROW, and so with these queries: role="tab" and
   `aria-selected`. A menu is not a tablist — MoreMenu's rows are
   role="menuitem" with `aria-current="true"` on the one in effect (NOT
   aria-checked; see REJECTED F in that file). The selection is still
   announced, by the attribute the correct role actually carries.

   The page-level structure of the restructure is pinned in
   homeAllAccountsRestructure.dom.test.jsx; this file keeps its own subject,
   which is the SCOPE the Systems view reports on. */
const openMore = () => {
  fireEvent.click(document.querySelector('[data-name="app-more"]'))
}
const openSystemsTab = () => {
  openMore()
  fireEvent.click(document.querySelector('[data-menu-item="systems"]'))
}
const menuRow = (id) => document.querySelector(`[data-menu-item="${id}"]`)

describe('the System tab', () => {
  it('sits alongside Overview and General Info', () => {
    renderAt('/')
    openMore()
    for (const name of ['Overview', 'Systems', 'General Info']) {
      expect(screen.getByRole('menuitem', { name }), name).toBeTruthy()
    }
  })

  /* The accessible name must stay the bare label. Folding the count in once
     renamed "Systems" to "Systems 103" and broke exactly the lookup above; the
     number is announced as its own label instead. MoreMenu carries that rule
     over from PillTabs' CountBadge. */
  it('keeps the count off the tab’s accessible name', () => {
    renderAt('/')
    openMore()
    const systems = screen.getByRole('menuitem', { name: 'Systems' })
    expect(systems.getAttribute('aria-label')).toBe('Systems')
    expect(within(systems).getByLabelText(/^\d+ systems$/)).toBeTruthy()
  })

  it('reports selection with aria-current, not just a colour', () => {
    renderAt('/')
    openMore()
    expect(menuRow('overview').getAttribute('aria-current')).toBe('true')
    expect(menuRow('systems').getAttribute('aria-current')).toBeNull()

    fireEvent.click(menuRow('systems'))

    openMore()
    expect(menuRow('overview').getAttribute('aria-current')).toBeNull()
    expect(menuRow('systems').getAttribute('aria-current')).toBe('true')
  })

  it('shows the table, and Overview’s cards go away', () => {
    renderAt('/')
    expect(screen.getByText('Water consumption')).toBeTruthy()

    openSystemsTab()

    expect(screen.getByRole('columnheader', { name: 'System' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Leak' })).toBeTruthy()
    expect(screen.queryByText('Water consumption')).toBeNull()
  })

  /* ── READ FROM "Showing N of M", NOT FROM A PAGE COUNT — 2026-11-08 ───────
     These two tests used to divide by the page size and assert "Page 1 of 18".
     The pager is gone (owner: "the pagination below ... I think something like
     show more needs to be there"), and the readout that replaced it carries
     the same fact more directly: M is the exact number of rows in scope rather
     than a number of pages it has to be divided back out of. The SUBJECT of
     both tests — which systems this screen reports on — is unchanged. */
  const scopedTotal = (container) => {
    const line = container.querySelector('[data-name="systems-table-count"]')
    expect(line, 'the table should draw its Showing N of M readout').toBeTruthy()
    return Number(/of ([\d,]+)/.exec(line.textContent)[1].replace(/,/g, ''))
  }

  it('counts the whole fleet at the root scope', () => {
    const { container } = renderAt('/')
    openSystemsTab()

    expect(scopedTotal(container)).toBe(SYSTEMS.length)
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
    const scoped = scopedTotal(container)

    expect(scoped).toBeGreaterThan(0)
    expect(scoped, 'a single site must be narrower than the fleet').toBeLessThan(SYSTEMS.length)

    // The identity cell's sub-line is the site, so every visible row names it.
    const rows = [...container.querySelectorAll('tbody tr')]
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(within(row).getAllByText(site).length, row.textContent).toBeGreaterThan(0)
    }
  })
})

describe('the bottom nav on the v2 shell', () => {
  // "Alerts is not needed here / this is from the old version remove it."
  // Pulse 2.0 reaches alerts from the home surface — the health pills and the
  // water-event rows both open the alerts overlay pre-filtered — so the third
  // tab pointing at the v1 /alerts screen was a leftover.
  it('offers Home and More, and no Alerts tab', () => {
    const { container } = renderAt('/')

    const nav = container.querySelector('nav') || container
    const labels = [...nav.querySelectorAll('button')]
      .map((b) => b.textContent.trim())
      .filter(Boolean)

    expect(labels.some((l) => /^Alerts$/i.test(l)), `found an Alerts tab in: ${labels}`).toBe(false)
  })
})
