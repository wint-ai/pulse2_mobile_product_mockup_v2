// @vitest-environment happy-dom
//
// THE HERO WAS NOT PERSONA-SCOPED. Signed in as `tenant-1apt` (Sofia, one
// apartment), `/` reported "103 systems" on the wave and "12 / 103 need
// attention" on the card under it. The route half of this page's scope was
// built - /location/:name narrows correctly, and homeLocationScope pins that -
// but the USER half was never built at all, so every persona saw the fleet.
//
// It predates today and was invisible until the bottom tab's alert badge
// started telling the truth (2026-11-04): the badge said 1 and the hero said
// 103, a few pixels apart on the same screen.
//
// WHAT THESE TESTS ARE ACTUALLY FOR, because the numbers below are derived and
// not typed in:
//   1. the hero reports the signed-in user's own systems, not the fleet's;
//   2. an admin still sees the fleet, so the fix is a narrowing and not a
//      blanket filter;
//   3. the hero and the health card under it report the SAME denominator -
//      scoping one and not the other would swap a wrong number for a visible
//      contradiction;
//   4. the ?scope= deep link narrows this page too, which is what proves the
//      rule being applied is THE rule (src/data/events.js `scopeActiveAlerts`,
//      via src/hooks/useActiveAlerts.js `useAlertScope`) and not a third copy
//      that happens to agree about personas today.
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import { UserProvider } from '@/context/UserContext'
import { SYSTEMS } from '@/data/systems'
import { PERSONAS, DEFAULT_PERSONA } from '@/data/personas'

afterEach(cleanup)
beforeEach(() => {
  try { localStorage.clear() } catch { /* happy-dom without storage */ }
})

/* UserProvider reads the persona out of localStorage at mount, which is the
   same door the persona switcher and the simulator use. No mock: the point of
   these tests is that the REAL persona filter reaches this page. */
function mountAs(personaId, path = '/') {
  if (personaId) localStorage.setItem('pulse2-persona-id', personaId)
  return render(
    <UserProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<HomeAllAccounts />} />
          <Route path="/location/:locationName" element={<HomeAllAccounts />} />
        </Routes>
      </MemoryRouter>
    </UserProvider>,
  )
}

const headline = (c) => c.querySelector('[data-node-id="199466:17471"]')
const barLabel = (c) => c.querySelector('[data-node-id="199360:129783"]')

/** What the persona's own filter says it owns - the number the screen owes. */
const ownedBy = (id) => {
  const p = PERSONAS.find((x) => x.id === id) ?? DEFAULT_PERSONA
  return SYSTEMS.filter((s) => p.systemFilter(s)).length
}

const TENANT = 'tenant-1apt'

describe('the hero is scoped to the signed-in user', () => {
  it('a one-apartment tenant sees their own system, not the fleet', () => {
    const own = ownedBy(TENANT)
    expect(own, 'the tenant persona owns nothing - fixture drift').toBeGreaterThan(0)
    expect(own).toBeLessThan(SYSTEMS.length)

    const { container } = mountAs(TENANT)
    expect(headline(container).textContent).toBe(
      `${own.toLocaleString('en-US')} ${own === 1 ? 'system' : 'systems'}`,
    )
    expect(headline(container).textContent, 'the reported bug, verbatim')
      .not.toBe(`${SYSTEMS.length} systems`)
  })

  it('an admin still sees the whole fleet, so this is a narrowing and not a filter', () => {
    /* DEFAULT_PERSONA.systemFilter is `() => true`, so the id set the narrowing
       is handed holds every system and the result has to be byte-identical to
       what this page did before. If it is not, the fix overreached. */
    const { container } = mountAs(DEFAULT_PERSONA.id)
    expect(headline(container).textContent).toBe(
      `${SYSTEMS.length.toLocaleString('en-US')} systems`,
    )
  })

  it('the hero and the health card under it report one denominator', () => {
    /* The screenshot the owner sent was "103 systems" over "12 / 103 need
       attention". Scoping the wave alone would have made it "1 system" over
       "12 / 103" - a worse reading, and the reason the narrowing is applied to
       the page's one scoped set rather than to the hero's props.

       READ OFF A SCOPE THAT HAS SOMETHING WRONG IN IT. The tenant's single
       apartment is all-clear, and since the owner's 2026-11-04 rule an
       all-clear card draws no `X / Y` line at all - so a denominator pinned
       there would be pinned to a string that is correctly absent. An admin's
       fleet has faults in it, so the line is drawn and the two numbers can be
       compared. The TENANT case is covered by the headline test above and by
       the all-clear assertion below. */
    const { container } = mountAs(DEFAULT_PERSONA.id)
    const fleet = SYSTEMS.length.toLocaleString('en-US')
    expect(headline(container).textContent).toContain(fleet)
    expect(barLabel(container).textContent).toContain(`/ ${fleet} need attention`)
  })

  it('a scope with nothing wrong says so, instead of drawing a zero', () => {
    /* Owner, 2026-11-04: "When all good, no progress bar" and "also remove
       the x out of y when all good". The tenant's one apartment is the
       reachable all-clear scope on this page, which is also what made the
       state worth testing here: it was unreachable while the hero was
       fleet-wide. */
    const { container } = mountAs(TENANT)
    expect(barLabel(container), 'no X / Y line at zero').toBeNull()
    expect(container.querySelector('[data-name="Progress Bar"]'), 'no bar at zero').toBeNull()
    expect(container.textContent).not.toContain('need attention')
    expect(container.querySelector('[data-status="clear"]'), 'the all-clear row').toBeTruthy()
  })

  it('the ?scope= deep link narrows this page too, because the rule is shared', () => {
    /* `scopeActiveAlerts` applies three independent narrowings and the persona
       is only one of them. Asserting a second one is what distinguishes
       "reuses the rule" from "re-implements the persona half of it". */
    const admin = DEFAULT_PERSONA.id
    const two = SYSTEMS.slice(0, 2).map((s) => s.id)
    const { container } = mountAs(admin, `/?scope=${two.join(',')}`)
    expect(headline(container).textContent).toBe('2 systems')
  })

  it('an empty scope renders zeros, never the mock fleet', () => {
    /* The Floor-26 bug: `live` returned null for an empty scope on `/` and
       every card fell through to its `?? MOCK_*` fallback - 96% health over
       3,431 systems that do not exist. The gate is on the DATASET now, not on
       whether the route named a location. */
    const { container } = mountAs(DEFAULT_PERSONA.id, '/?scope=no-such-system')
    expect(headline(container).textContent).toBe('0 systems')
    const text = (container.textContent || '').replace(/\s+/g, ' ')
    expect(text).not.toContain('3,431')
  })
})
