/**
 * THE ORDER OF `.mobile-shell`'s VIEWPORT-HEIGHT FALLBACKS, GUARDED.
 *
 * Phone.jsx declares `height` and `max-height` three times each. They are
 * equal-specificity declarations of the same property, so the LAST one the
 * engine understands wins, and the order is therefore the whole behaviour:
 *
 *   100vh                   the floor, for engines that have nothing else
 *   -webkit-fill-available  the LEGACY FALLBACK, for iOS before dvh (< 15.4)
 *   100dvh                  the CORRECT MODERN VALUE, last so it wins
 *
 * It shipped in the opposite order until 2026-11-10, which let the legacy hack
 * override the modern value. On iOS Safari `-webkit-fill-available` is the
 * LARGE viewport (toolbars retracted) while `100dvh` is the dynamic one, so a
 * backwards cascade makes the shell taller than the visible area and parks the
 * tab-bar host behind the browser's bottom toolbar.
 *
 * WHY A SOURCE-TEXT TEST AND NOT A RENDERED ONE. There is nothing to render:
 * happy-dom does not cascade duplicate declarations the way a browser does, and
 * no headless browser available here has a retractable toolbar - desktop
 * Chromium and WebKit resolve all three values identically, so a measured
 * assertion would pass in either order. The order itself is the only thing that
 * can be checked, and keeping it checked is the point: the failure mode is
 * someone "tidying" the prefixed line back to last.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const SOURCE = readFileSync('src/components/Phone.jsx', 'utf8')

/** Block and line comments out, so prose about the pattern is not the pattern. */
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')

/** Just the `.mobile-shell { ... }` rule body, so JSX style objects elsewhere
    in the file (which use the same property names) cannot be mistaken for it. */
const RULE = (() => {
  const src = stripComments(SOURCE)
  const open = src.indexOf('.mobile-shell {')
  expect(open, 'the .mobile-shell rule has moved or been renamed').toBeGreaterThan(-1)
  return src.slice(open, src.indexOf('}', open))
})()

/** The declared values for one property, in source order. */
const declarationsOf = (prop) =>
  [...RULE.matchAll(new RegExp(`(?:^|[;{\\s])${prop}\\s*:\\s*([^;\\n]+);`, 'g'))]
    .map((m) => m[1].trim())

describe('.mobile-shell viewport-height cascade', () => {
  for (const prop of ['height', 'max-height']) {
    it(`declares ${prop} least-capable first, 100dvh last`, () => {
      const declared = declarationsOf(prop)
      expect(
        declared,
        `all three ${prop} fallbacks have to stay - 100vh for the oldest `
        + 'engines, -webkit-fill-available for iOS before dvh. This is an '
        + 'ORDER, not a shortlist: do not delete one to "simplify" it.',
      ).toEqual(['100vh', '-webkit-fill-available', '100dvh'])
    })
  }

  it('never lets -webkit-fill-available win over 100dvh', () => {
    for (const prop of ['height', 'max-height']) {
      const declared = declarationsOf(prop)
      expect(
        declared.lastIndexOf('100dvh') > declared.lastIndexOf('-webkit-fill-available'),
        `${prop}: -webkit-fill-available is the PRE-dvh workaround. Declared `
        + 'after 100dvh it overrides it, and on iOS Safari it resolves to the '
        + 'LARGE viewport - a shell taller than the visible area, with the tab '
        + "bar behind the browser's toolbar.",
      ).toBe(true)
    }
  })
})
