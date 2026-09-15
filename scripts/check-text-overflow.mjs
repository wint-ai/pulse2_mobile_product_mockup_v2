#!/usr/bin/env node
/**
 * Dynamic text must be able to shrink, or it collides with its neighbours.
 *
 * This bug has now shipped three times in this codebase, each time only visible
 * once REAL data replaced short mock strings:
 *   - the water-events system name, hard-cut mid-word (scrollWidth 426 vs 254)
 *   - the Insights rows, address cut to "· O" and running past the card
 *   - Top usage, "Cooling Tower Makeup — Zone…" overlapping "646,835 L"
 *
 * The cause is always the same. Figma exports text nodes with `shrink-0`
 * because in a fixed-width artboard nothing ever needs to shrink. In a real
 * layout with real strings, a shrink-0 text node lays out at its intrinsic
 * width, pushes or overlaps its siblings, and its own `text-ellipsis` never
 * engages — the ellipsis is dead code without the ability to shrink.
 *
 * RULE: an element whose children include a JSX expression (i.e. it renders
 * data, not a literal) must not carry shrink-0, and should carry a truncation
 * pair — min-w-0/min-w-px plus truncate (or overflow-hidden + text-ellipsis).
 *
 * usage: node scripts/check-text-overflow.mjs [dir ...]   (default: src/v2)
 * exit 1 on any violation.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOTS = process.argv.slice(2).length ? process.argv.slice(2) : ['src/v2']

function* files(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { yield* files(p); continue }
    if (/\.jsx$/.test(e.name)) yield p
  }
}

// A text element that renders an expression on the next line or inline.
const RENDERS_DATA = /\{[a-zA-Z_$][\w$.?[\]]*\}/

let violations = 0
let checked = 0

for (const root of ROOTS) {
  if (!statSync(root).isDirectory()) continue
  for (const file of files(root)) {
    const lines = readFileSync(file, 'utf8').split('\n')
    checked++
    const bad = []

    lines.forEach((line, i) => {
      // Only text-bearing elements.
      if (!/<(?:p|span|div|h[1-6])\b/.test(line)) return
      if (!/className=/.test(line)) return
      if (!/shrink-0/.test(line)) return

      // Does it render data? Check this line and the next two.
      const window = [line, lines[i + 1] ?? '', lines[i + 2] ?? ''].join('\n')
      if (!RENDERS_DATA.test(window)) return

      // whitespace-nowrap without the ability to shrink is the collision case.
      const canShrink = /min-w-0|min-w-px|flex-1|flex-\[1_0_0\]/.test(line)
      const wantsEllipsis = /truncate|text-ellipsis/.test(line)
      const nowrap = /whitespace-nowrap|truncate/.test(line)

      if (!canShrink && (wantsEllipsis || nowrap)) {
        bad.push({
          line: i + 1,
          why: wantsEllipsis
            ? 'has text-ellipsis/truncate but shrink-0 stops it engaging'
            : 'whitespace-nowrap + shrink-0 will push or overlap its siblings',
        })
      }
    })

    if (bad.length) {
      violations += bad.length
      console.log(`\n${file}`)
      for (const b of bad) console.log(`  L${String(b.line).padEnd(5)} ${b.why}`)
    }
  }
}

console.log(
  violations
    ? `\n${violations} shrink-0 text node(s) that render data, across ${checked} file(s)\n` +
      'Fix: replace shrink-0 with min-w-px (or min-w-0) so the ellipsis can engage.'
    : `text overflow ok — ${checked} file(s) checked`,
)
process.exit(violations ? 1 : 0)
