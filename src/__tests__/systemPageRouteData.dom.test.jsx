// @vitest-environment happy-dom
/**
 * Guards the "Floor 26" bug: a pixel-perfect screen that shows the wrong building.
 *
 * SystemPageV2Screen shipped rendering a `const SYSTEM` mock with no useParams
 * and no @/data import, so every system in the app displayed the same title and
 * the same breadcrumb. The route param was never read.
 *
 * This is the more dangerous class of failure in this codebase. A dead burger
 * announces itself the moment someone taps it; wrong-but-plausible data looks
 * exactly like working software. The shell-contract checker now has a static
 * rule for it, and this is the behavioural half: two different routes must
 * actually render two different systems.
 */
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import { SYSTEMS } from '@/data/systems'
import { getConsumptionSeries } from '@/data/consumptionSeries'

function mountAt(systemId) {
  return render(
    <MemoryRouter initialEntries={[`/system/${systemId}`]}>
      <Routes>
        <Route path="/system/:systemId" element={<SystemPageV2Screen />} />
      </Routes>
    </MemoryRouter>,
  )
}

// Two systems with distinguishable names, whatever the dataset happens to be.
const distinct = (() => {
  const seen = new Set()
  const out = []
  for (const s of SYSTEMS) {
    if (!s?.name || seen.has(s.name)) continue
    seen.add(s.name)
    out.push(s)
    if (out.length === 2) break
  }
  return out
})()

describe('SystemPageV2Screen reads the route', () => {
  it('the dataset offers at least two distinctly-named systems', () => {
    expect(distinct.length).toBe(2)
  })

  it('renders the system named by the route param', () => {
    const [first] = distinct
    mountAt(first.id)
    expect(screen.getAllByText(first.name).length).toBeGreaterThan(0)
  })

  it('renders a DIFFERENT system for a different route param', () => {
    const [first, second] = distinct

    const a = mountAt(first.id)
    const aHtml = a.container.innerHTML
    a.unmount()

    const b = mountAt(second.id)
    const bHtml = b.container.innerHTML

    // The precise regression: identical output for different routes.
    expect(bHtml).not.toEqual(aHtml)
    expect(screen.getAllByText(second.name).length).toBeGreaterThan(0)
  })

  it('does not fall back to the hardcoded mock for a real system', () => {
    const [first] = distinct
    // 'Floor 26' is the mock's title. It may legitimately exist in a dataset,
    // so only assert it is absent when the routed system is named otherwise.
    if (first.name !== 'Floor 26') {
      mountAt(first.id)
      expect(screen.queryByText('Floor 26')).toBeNull()
    }
  })

  it('still renders for an unknown id rather than crashing', () => {
    expect(() => mountAt('definitely-not-a-system-id')).not.toThrow()
  })
})

/* The card's own formatter. Duplicated rather than exported: the point of this
   test is that the SCREEN shows this system's litres, so it should fail if the
   card's formatting changes under it rather than silently follow along. */
function fmtL(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`
  return String(Math.round(n))
}

describe('the consumption chart plots the routed system', () => {
  it('shows this system\u2019s own total, not the traced comp series', () => {
    for (const system of distinct) {
      const { series } = getConsumptionSeries(system.id, system.name, 'D', 0)
      const expected = fmtL(series.reduce((sum, p) => sum + p.litres, 0))

      const { container, unmount } = mountAt(system.id)
      const view = within(container)
      // "Total L" is the card's first headline figure.
      expect(view.getAllByText('Total L').length, system.id).toBeGreaterThan(0)
      expect(view.getAllByText(expected).length, `${system.id} total ${expected}`).toBeGreaterThan(0)
      unmount()
    }
  })

  it('plots different numbers for different systems', () => {
    const [a, b] = distinct
    const totalFor = (s) =>
      getConsumptionSeries(s.id, s.name, 'D', 0).series.reduce((sum, p) => sum + p.litres, 0)

    // If this ever ties, the guard below is vacuous rather than wrong — say so.
    expect(totalFor(a)).not.toBe(totalFor(b))
  })

  it('offers the scope control, and keeps it closed until asked', () => {
    const { container, unmount } = mountAt(distinct[0].id)
    const view = within(container)
    expect(view.getAllByRole('button', { name: 'Consumption scope' }).length).toBe(1)
    expect(view.queryByRole('dialog', { name: 'Consumption scope' })).toBeNull()
    unmount()
  })
})
