// @vitest-environment happy-dom
//
// /location/:locationName must actually scope the page.
//
// v2's model is "the route IS the scope": WintSidebarV2 is navigation-only and
// never mutates UserContext the way v1's drawer did. That was half-built — the
// param reached the page title and stopped there, so every aggregate still read
// the whole of SYSTEMS. /location/Office retitled the header to "Office" and
// then reported all 103 systems, the same six health pills and the same fleet
// consumption. Every location rendered identical numbers because every location
// WAS the fleet.
//
// These tests pin the two halves: a location shows its own systems, and two
// different locations do not show the same thing.

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import { SYSTEMS } from '@/data/systems'
import { getAccountById, getRootAccounts } from '@/data/accounts'

/* NOTE: the health card renders TWO tiles — "<total> All Systems" and
   "<n> Require attention" — since 198601:62829 replaced the single "n / all"
   capsule. These assertions target the total tile; what they actually guard is
   the SCOPE (Office must report 53, not the fleet's 103), which is unchanged. */

afterEach(cleanup)

const locationNameOf = (s) => s.l4Name || s.l3Name || s.l2Name || s.l1Name

/** Systems the page should show for a location name, by the page's own rule. */
const systemsAt = (name) =>
  SYSTEMS.filter(
    (s) => s.l4Name === name || s.l3Name === name || s.l2Name === name || s.l1Name === name,
  )

/* Every name the drawer can put in the URL. WintSidebarV2.activate routes any
   node with `l4Id` or kind 'location' to /location/<node.name>, and its tree is
   account > l1 (country) > l2 > l4 — so a name can come from ANY of those
   levels. The first fix only matched l2/l3/l4, which made /location/United
   States (an l1) render zeros for a node the drawer itself labels 103. */
const EVERY_LOCATION_NAME = [
  ...new Set(
    SYSTEMS.flatMap((s) => [s.l1Name, s.l2Name, s.l3Name, s.l4Name]).filter(Boolean),
  ),
]

/* Two location names that exist in the dataset AND hold different numbers of
   systems — otherwise "they differ" proves nothing. */
const [locA, locB] = (() => {
  const bySize = new Map()
  for (const s of SYSTEMS) {
    const n = locationNameOf(s)
    if (!n) continue
    bySize.set(n, (bySize.get(n) ?? 0) + 1)
  }
  const names = [...bySize.entries()].filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1])
  const first = names[0]
  const different = names.find(([, c]) => c !== first?.[1])
  return [first?.[0], different?.[0]]
})()

function mountAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<HomeAllAccounts />} />
        <Route path="/location/:locationName" element={<HomeAllAccounts />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('account scoping', () => {
  const root = getRootAccounts()[0]

  it('the root account rolls its sub-accounts up to the whole fleet', () => {
    expect(root?.name, 'no root account').toBeTruthy()

    const { container } = mountAt(`/location/${encodeURIComponent(root.name)}`)
    const text = (container.textContent || '').replace(/\s+/g, ' ')

    // MRG owns 101 systems directly; 2 more sit under Southbridge Health, a
    // child account. Scoping to the root must see all 103, not just the 101 —
    // an account scope has to roll its children up.
    expect(text).toContain(`${SYSTEMS.length}All Systems`)
  })

  it('a sub-account scopes to just its own systems', () => {
    const counts = new Map()
    for (const s of SYSTEMS) {
      const n = getAccountById(s.account)?.name
      if (n && n !== root?.name) counts.set(n, (counts.get(n) ?? 0) + 1)
    }
    const [subName, subCount] = [...counts.entries()][0] ?? []
    expect(subName, 'no sub-account owns systems directly').toBeTruthy()
    expect(subCount).toBeLessThan(SYSTEMS.length)

    const { container } = mountAt(`/location/${encodeURIComponent(subName)}`)
    const text = (container.textContent || '').replace(/\s+/g, ' ')
    expect(text).toContain(`${subCount}All Systems`)
    expect(text).not.toContain(`${SYSTEMS.length}All Systems`)
  })
})

describe('location scoping', () => {
  it('every name the drawer can route to resolves to at least one system', () => {
    // This is the guard the first version of this fix lacked. A level omitted
    // from the filter shows up here as a location the drawer counts and the
    // page renders as empty.
    expect(EVERY_LOCATION_NAME.length).toBeGreaterThan(2)
    const empty = EVERY_LOCATION_NAME.filter((n) => systemsAt(n).length === 0)
    expect(empty, `these drawer destinations scope to nothing: ${empty.join(', ')}`).toEqual([])
  })

  it('a top-level (country) location scopes, it does not render zeros', () => {
    const l1 = [...new Set(SYSTEMS.map((s) => s.l1Name).filter(Boolean))][0]
    expect(l1, 'dataset has no L1 level').toBeTruthy()

    const own = systemsAt(l1).length
    const { container } = mountAt(`/location/${encodeURIComponent(l1)}`)
    const text = (container.textContent || '').replace(/\s+/g, ' ')

    // The reported symptom: "United States" rendered 0 / 0 and six zero pills.
    expect(text).not.toContain('0All Systems')
    expect(text).toContain(`${own}All Systems`)
  })

  it('the dataset offers two locations of different sizes', () => {
    expect(locA, 'no location names in SYSTEMS').toBeTruthy()
    expect(locB, 'need a second location of a different size').toBeTruthy()
    expect(systemsAt(locA).length).not.toBe(systemsAt(locB).length)
  })

  it('a location shows its own system count, not the fleet total', () => {
    const scoped = systemsAt(locA)
    expect(scoped.length).toBeLessThan(SYSTEMS.length) // otherwise vacuous

    const { container } = mountAt(`/location/${encodeURIComponent(locA)}`)
    const view = within(container)

    expect(view.getAllByText(locA).length).toBeGreaterThan(0)
    // The "All Systems" tile reports the scope size.
    expect(
      view.getAllByText(String(scoped.length)).length,
      `expected the scoped total ${scoped.length}, not the fleet's ${SYSTEMS.length}`,
    ).toBeGreaterThan(0)
  })

  it('two different locations do not render the same numbers', () => {
    const a = mountAt(`/location/${encodeURIComponent(locA)}`)
    const aHtml = a.container.innerHTML
    a.unmount()

    const b = mountAt(`/location/${encodeURIComponent(locB)}`)
    const bHtml = b.container.innerHTML

    // The precise regression: identical output for different locations.
    expect(bHtml).not.toEqual(aHtml)
  })

  it('the unscoped home still reports the whole fleet', () => {
    const { container } = mountAt('/')
    const view = within(container)
    expect(view.getAllByText('All Accounts').length).toBeGreaterThan(0)
    expect(view.getAllByText(String(SYSTEMS.length)).length).toBeGreaterThan(0)
  })

  it('an unknown location renders zeros, not the comp’s mock figures', () => {
    const { container } = mountAt('/location/definitely-not-a-location')
    const text = (container.textContent || '').replace(/\s+/g, ' ')

    /* Assert on the health capsule's copy rather than on "is the number 103
       anywhere on the page". The navigation drawer is always mounted and
       legitimately prints fleet-wide tree counts ("Meridian Realty Group (MRG)
       103"), so a whole-document search for the fleet total can never pass —
       my first version of this test failed for exactly that reason, and the
       code was right. */
    expect(text).toContain('0All Systems0Require attention')

    // MOCK_HEALTH_STATS is 8 of 3,431 and MOCK_INSIGHTS leads with a row the
    // real data never produces. Neither may reach the screen for a real scope.
    expect(text).not.toContain('3,431')
    expect(text).not.toContain('352 Palmer..')
  })

  it('a known location reports ITS total, which is what the bug got wrong', () => {
    // The reported symptom: /location/Office showed 52 / 103 — the fleet's 103,
    // not Office's own count.
    const office = SYSTEMS.some((s) => locationNameOf(s) === 'Office') ? 'Office' : locA
    const own = systemsAt(office).length
    expect(own).toBeGreaterThan(0)
    expect(own).not.toBe(SYSTEMS.length)

    const { container } = mountAt(`/location/${encodeURIComponent(office)}`)
    const text = (container.textContent || '').replace(/\s+/g, ' ')
    expect(text).toContain(`${own}All Systems`)
    expect(text).not.toContain(`${SYSTEMS.length}All Systems`)
  })
})
