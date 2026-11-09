// Two sources count valve errors, and they do not use the same predicate.
//
// ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// valveWidgetMount.dom.test.jsx used to carry "the two valve-error numbers on
// this screen agree": it compared SystemHealthCard's "Valve errors" TILE
// against ValveManagementCard's own error row, on three routes, because the
// two numbers come from DIFFERENT functions and a divergence would have shown
// two different valve-error counts on one screen.
//
// That test died on 2026-11-09, when the owner ruled the health card down to
// its bar and its "x / y need attention" line ("remoive the error type from
// here / keep onlt the x out of y as in figma", 200067:41981). The tile went
// with the breakdown, so there is now exactly ONE valve-error number rendered
// on Home and a DOM comparison has no left-hand side.
//
// THE INVARIANT DID NOT DIE WITH THE TILE. It was never a property of that
// screen - it is a property of the data layer, and both functions are still
// live and still shared. So it is re-pinned here, with no DOM.
//
// ⚠ AND IT IS NOT A CLEAN EQUALITY. The two predicates genuinely diverge, in
// three specific ways, and this file's job is to say WHICH - so that the
// divergence is a documented fact rather than a surprise, and so that
// "fixing" one function silently shows up here as a failure. Do NOT resolve a
// failure by editing computeWidgets: it is shared with other callers and the
// choice between the two counting rules is the owner's.
//
//   computeWidgets(systems).valves.error   src/data/systems.js:292-295
//     valveSystems = valve !== null && comm === 'online'
//     error        = valveSystems where valve === 'error'
//
//   valveCategoryOf(system) === 'error'    src/v2/components/valveScope.js:105
//     'none'   when valve is null/undefined
//     'open'   when 'open'
//     'closed' when 'closed' OR 'closing'
//     'error'  EVERYTHING ELSE - the documented "honest remainder"
//     ...and it asks nothing about `comm` at all.

import { describe, it, expect } from 'vitest'
import { SYSTEMS, computeWidgets } from '@/data/systems'
import { summariseValves, valveCategoryOf } from '@/v2/components/valveScope'

/** The recognised valve words, i.e. the ones both functions agree how to read. */
const KNOWN = new Set(['open', 'closed', 'error'])

describe('valve-error counts: computeWidgets vs the valve scope', () => {
  it('agrees exactly on the systems both functions claim to understand', () => {
    /* THE REAL INVARIANT, with the two known escapes held out: restrict to
       systems that are ONLINE and whose valve is one of the three recognised
       words, and the two predicates must return the same set. If this ever
       fails, one of them changed what 'error' MEANS, which is the drift the
       original test was watching for. */
    const common = SYSTEMS.filter(
      (s) => s.comm === 'online' && s.valve !== null && s.valve !== undefined && KNOWN.has(s.valve),
    )
    expect(common.length, 'no system is in scope, so this proves nothing').toBeGreaterThan(0)

    const fromWidgets = computeWidgets(common).valves.error
    const fromScope = summariseValves(common).byCategory.error.total

    expect(fromScope, `computeWidgets says ${fromWidgets}, the valve scope says ${fromScope}`)
      .toBe(fromWidgets)
    expect(fromWidgets, 'the dataset has no valve errors at all, so the agreement is vacuous')
      .toBeGreaterThan(0)
  })

  it('puts an OFFLINE faulted valve in two different places', () => {
    /* DIVERGENCE 1, and the one the coordinator already had on file.
       computeWidgets drops every offline system out of `valveSystems` before
       it counts, so an offline system with a faulted valve is invisible to it.
       valveCategoryOf never looks at `comm`, so the same system IS an error
       there - summariseValves reports it twice over, under `.total` and again
       under `.offline`.

       Neither is wrong on its own terms - one is "errors you could act on",
       the other is "errors that exist" - but they answer different questions.

       ⚠ ASSERTED ON A FIXTURE, AND THAT IS NOT LAZINESS. Measured on today's
       generated fleet: 103 systems, 3 offline, 2 valve errors, and NONE of the
       offline three has a faulted valve - so the live gap is 0 and a
       data-driven assertion here would pass while proving nothing. The
       divergence is a property of the two PREDICATES, so it is pinned against
       the predicates. The live-data relationship is pinned separately below,
       where it guards drift rather than claiming to demonstrate it. */
    const offlineError = { id: 'fixture-offline-error', comm: 'offline', valve: 'error', power: 'ac' }

    expect(valveCategoryOf(offlineError), 'the valve scope stopped seeing offline faults').toBe('error')
    const scope = summariseValves([offlineError]).byCategory.error
    expect(scope.total, 'the valve scope dropped an offline fault from its total').toBe(1)
    expect(scope.offline, 'the valve scope stopped reporting it as unreachable').toBe(1)

    expect(
      computeWidgets([offlineError]).valves.error,
      'computeWidgets started counting offline valve errors - that is a real change, not a fix',
    ).toBe(0)
  })

  it('keeps the live gap explained by exactly those two escapes', () => {
    /* THE DRIFT GUARD over the real fleet, and the honest companion to the
       fixture above. It does not claim the gap is non-zero - measured today it
       is 0, because none of the three offline systems has a faulted valve. It
       claims the gap is ALWAYS fully explained by the two escapes, so the
       moment the generated fleet grows an offline fault (or an unrecognised
       valve word) this still holds, and the moment either function grows a
       THIRD way to disagree, it fails and names the amount.

       Pinned as a subtraction rather than as two magic numbers, so it keeps
       holding as the dataset moves. */
    const all = SYSTEMS
    const fromWidgets = computeWidgets(all).valves.error
    const fromScope = summariseValves(all).byCategory.error.total

    const offlineErrors = all.filter(
      (s) => s.comm !== 'online' && valveCategoryOf(s) === 'error',
    ).length
    const unknownOnline = all.filter(
      (s) => s.comm === 'online' && valveCategoryOf(s) === 'error' && !KNOWN.has(s.valve),
    ).length

    expect(
      fromScope - fromWidgets,
      `the scope counts ${fromScope} and computeWidgets ${fromWidgets}; the gap should be the ` +
        `${offlineErrors} offline plus the ${unknownOnline} unrecognised, and is not`,
    ).toBe(offlineErrors + unknownOnline)
  })

  it("splits on 'closing' in OPPOSITE directions, which is the sharpest of the three", () => {
    /* DIVERGENCE 2, and the nastiest, because the two do not merely differ in
       scope - they put the same system in two different buckets:

         valveCategoryOf('closing')  -> 'closed'   (deliberate, documented)
         computeWidgets              -> NEITHER open, closed NOR error

       computeWidgets tests `valve === 'closed'` exactly, so a closing valve
       falls through all three of its buckets and is counted nowhere, while
       still sitting inside `valveSystems`. Its open+closed+error therefore
       does not sum to its own valveSystems total.

       A FIXTURE, not the live fleet: no generated system carries 'closing'
       today, so reading this off SYSTEMS would assert nothing. The point is
       the predicate, and the predicate is what a future dataset will meet. */
    const closing = { id: 'fixture-closing', comm: 'online', valve: 'closing', power: 'ac' }

    expect(valveCategoryOf(closing), 'the valve scope stopped reading `closing` as closed')
      .toBe('closed')

    const w = computeWidgets([closing]).valves
    expect(w.error, 'computeWidgets started counting `closing` as an error').toBe(0)
    expect(w.closed, 'computeWidgets started counting `closing` as closed').toBe(0)
    expect(w.open, 'computeWidgets started counting `closing` as open').toBe(0)
  })

  it('counts an unrecognised valve word as an error in the scope and nowhere in widgets', () => {
    /* DIVERGENCE 3. valveScope.js:100-103 is explicit that an unrecognised
       NON-NULL value is 'error' and not 'none', because there IS hardware and
       "No valve installed" would be a lie. computeWidgets has no such rule and
       simply misses it. */
    const weird = { id: 'fixture-weird', comm: 'online', valve: 'jammed', power: 'ac' }

    expect(valveCategoryOf(weird)).toBe('error')
    expect(computeWidgets([weird]).valves.error).toBe(0)
  })

  it('never lets either source report more errors than there are systems', () => {
    /* The cheap sanity half: whatever the two disagree about, neither may
       exceed the fleet, and neither may go negative. A refactor that double
       counted a bucket would show up here before it showed up on a screen. */
    const all = SYSTEMS
    for (const [label, n] of [
      ['computeWidgets', computeWidgets(all).valves.error],
      ['valve scope', summariseValves(all).byCategory.error.total],
    ]) {
      expect(n, `${label} returned a negative count`).toBeGreaterThanOrEqual(0)
      expect(n, `${label} counted more valve errors than there are systems`)
        .toBeLessThanOrEqual(all.length)
    }
  })
})
