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
let warnings = 0
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

      if (canShrink) return

      if (wantsEllipsis) {
        // FAILS the build. The element asks to truncate and shrink-0 forbids
        // it — there is no reading of that which is intentional.
        bad.push({ line: i + 1, fatal: true, why: 'has text-ellipsis/truncate but shrink-0 stops it engaging' })
      } else if (nowrap) {
        // WARNS only. On a short fixed label — a duration, a status pill —
        // shrink-0 is correct and stops it being squeezed. Whether this one
        // collides depends on how long its data gets, which a regex cannot
        // know. Failing the build on it would train people to ignore this
        // checker, which is worse than the bug.
        bad.push({ line: i + 1, fatal: false, why: 'whitespace-nowrap + shrink-0 — check it cannot collide once data is long' })
      }
    })

    if (bad.length) {
      violations += bad.filter(b => b.fatal).length
      warnings += bad.filter(b => !b.fatal).length
      console.log(`\n${file}`)
      for (const b of bad) {
        console.log(`  ${b.fatal ? 'FAIL' : 'warn'}  L${String(b.line).padEnd(5)} ${b.why}`)
      }
    }
  }
}

console.log(
  violations
    ? `\n${violations} element(s) ask to truncate but carry shrink-0 — that never works.\n` +
      `Fix: replace shrink-0 with min-w-px (or min-w-0).` +
      (warnings ? `\n${warnings} further nowrap case(s) worth an eye, not failing the build.` : '')
    : `text overflow ok — ${checked} file(s) checked` +
      (warnings ? `, ${warnings} nowrap case(s) worth an eye` : ''),
)
process.exit(violations ? 1 : 0)
