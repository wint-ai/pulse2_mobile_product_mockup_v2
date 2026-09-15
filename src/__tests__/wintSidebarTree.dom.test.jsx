// @vitest-environment happy-dom
/**
 * Guards the drawer against the two ways its tree has silently collapsed.
 *
 * Both were real: under the MRG dataset the drawer rendered a single account
 * row and no navigation at all.
 *
 *  1. buildTree took an account's child accounts OR its own location tree,
 *     never both. MRG has 16 child accounts AND a United States tree, so the
 *     locations vanished.
 *  2. buildNode pruned any branch holding no visible system, which collapses
 *     the whole tree whenever locations exist before systems do.
 *
 * These assert on rendered rows rather than internals, so they keep holding if
 * the tree assembly is rewritten.
 *
 * Run against BOTH sidebars. WintSidebarV2 was built from WintSidebar before
 * these fixes landed and silently inherited every one of them — the two files
 * are line-for-line identical on handlers and still rendered completely
 * differently, because the divergence is in tree assembly, not in the
 * interactive surface. Whichever one is mounted, it is covered here.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WintSidebar from '@/v2/components/WintSidebar'
import WintSidebarV2 from '@/v2/components/WintSidebarV2'
import { SYSTEMS } from '@/data/systems'
import { getRootAccounts, getChildAccounts, getAccountById } from '@/data/accounts'
import { getHierarchyForAccount } from '@/data/hierarchy'

const SIDEBARS = [
  ['WintSidebar', WintSidebar],
  ['WintSidebarV2', WintSidebarV2],
]

// A plain loop rather than describe.each: eslint here runs without
// eslint-plugin-react, so JSX usage never counts as a read. Component imports
// survive only because varsIgnorePattern '^[A-Z_]' covers PascalCase
// VARIABLES — it does not cover function ARGUMENTS, so `(_name, Sidebar) =>`
// would report both as unused. Destructuring in the loop keeps them variables.
for (const [name, Sidebar] of SIDEBARS) {
describe(`${name} tree`, () => {
  function mount() {
    return render(
      <MemoryRouter>
        <Sidebar open onClose={() => {}} />
      </MemoryRouter>,
    )
  }

  it('the dataset actually has systems and a hierarchy to show', () => {
    expect(SYSTEMS.length).toBeGreaterThan(0)
    const roots = getRootAccounts()
    expect(roots.length).toBeGreaterThan(0)
  })

  it('renders more than just the root account row', () => {
    const { container } = mount()
    const rows = container.querySelectorAll('[data-sidebar="menu-button"], [data-sidebar="menu-sub-button"], [role="button"]')
    // The regression rendered exactly one row. Anything that navigates needs
    // meaningfully more than that.
    expect(rows.length).toBeGreaterThan(3)
  })

  it('keeps a root account\'s own locations even when it also has child accounts', () => {
    const root = getRootAccounts()[0]
    expect(root).toBeTruthy()

    const own = getHierarchyForAccount(root.id) || []
    const kids = getChildAccounts(root.id) || []

    // Only meaningful when the dataset actually exercises the both-at-once case.
    if (own.length > 0 && kids.length > 0) {
      mount()
      // A top-level location of the root must be on screen; the either/or bug
      // dropped exactly these.
      const name = own[0].name
      expect(screen.getAllByText(name).length).toBeGreaterThan(0)
    }
  })

  it('shows the root account by name', () => {
    const root = getRootAccounts()[0]
    mount()
    const label = getAccountById(root.id)?.name || root.id
    expect(screen.getAllByText(label).length).toBeGreaterThan(0)
  })
})
}
