// The valve donut's arcs and the legend's swatches are painted by Tailwind
// COLOUR UTILITIES (`stroke-valve-open`, `bg-valve-open`, ...), and Tailwind v4
// generates a colour utility ONLY for a token registered in a `@theme` block as
// `--color-<name>`. An unregistered name is not an error: the utility is simply
// never emitted, the element keeps `stroke: none`, and the arc paints NOTHING.
//
// THAT IS THE DEFECT THIS FILE EXISTS FOR. On 2026-11-09 the ring rendered as a
// single faint grey band: `--valve-open` / `--valve-closed` / `--valve-error`
// had been dropped from `:root`, `[data-theme='dark']` and `[data-theme='sand']`
// and their three `--color-valve-*` registrations from `@theme inline` — left
// behind only in the `contrast` diagnostic block — by the revert at 5f24b0f.
// Three of the four arcs computed `stroke: none` in a browser while the fourth
// (`stroke-border`, a registered token) painted correctly, which is why the card
// looked "broken on the UI side" rather than blank.
//
// A DOM test cannot catch this: jsdom/happy-dom never runs Tailwind, so the
// class string is present and correct in a passing render either way. The check
// therefore has to be made against `src/index.css` itself.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..')
const CSS = fs.readFileSync(path.join(REPO_ROOT, 'src', 'index.css'), 'utf8')

/* The four blocks index.css themes with. Every colour a chart mark names has to
   resolve in all four, which is the rule the ValveManagementCard header states
   and the one the revert broke. */
const THEME_BLOCKS = [
  { name: ':root (light)', re: /^:root \{/m },
  { name: "[data-theme='dark']", re: /^\[data-theme='dark'\],\n\.dark \{/m },
  { name: "[data-theme='sand']", re: /^\[data-theme='sand'\] \{/m },
  { name: "[data-theme='contrast']", re: /^\[data-theme='contrast'\] \{/m },
]

/* Body of the CSS block that starts at `from`, found by brace balance — the
   blocks are long and heavily commented, so a lazy `[^}]*` would stop at the
   first `}` inside a comment or a color-mix. */
function blockAt(css, from) {
  const open = css.indexOf('{', from)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i)
  }
  throw new Error('unbalanced block at ' + from)
}

const VALVE_TOKENS = ['valve-open', 'valve-closed', 'valve-error']

describe('valve colour tokens are registered, not just declared', () => {
  it('registers --color-valve-* in @theme inline so the utilities are generated', () => {
    const m = CSS.match(/^@theme inline \{/m)
    expect(m, '@theme inline block not found in src/index.css').toBeTruthy()
    const body = blockAt(CSS, m.index)
    for (const t of VALVE_TOKENS) {
      /* `inline` and not the plain `@theme`: inline compiles the utility to
         var(--valve-*), which is what lets a theme on an ancestor move it.
         Line-anchored, so a COMMENTED-OUT registration does not satisfy it —
         that is exactly the shape a revert leaves behind. */
      expect(
        new RegExp('^[ \\t]*--color-' + t + ': var\\(--' + t + '\\);', 'm').test(body),
        '--color-' + t + ' is not registered in @theme inline; stroke-' + t + ' generates no CSS',
      ).toBe(true)
    }
  })

  it('declares --valve-* in every theme block', () => {
    for (const { name, re } of THEME_BLOCKS) {
      const m = CSS.match(re)
      expect(m, `${name} block not found in src/index.css`).toBeTruthy()
      const body = blockAt(CSS, m.index)
      for (const t of VALVE_TOKENS) {
        expect(
          new RegExp('^[ \\t]*--' + t + ':[ \\t]*\\S', 'm').test(body),
          `--${t} is not declared under ${name}; its utility resolves to nothing there`,
        ).toBe(true)
      }
    }
  })

  it('gives the arcs and the legend swatches ONE source of truth', () => {
    const card = fs.readFileSync(
      path.join(REPO_ROOT, 'src', 'v2', 'components', 'ValveManagementCard.jsx'), 'utf8')
    const readout = fs.readFileSync(
      path.join(REPO_ROOT, 'src', 'v2', 'components', 'ValveStateReadout.jsx'), 'utf8')
    /* The header comment claims the ring and the chips name the same three
       tokens. Pin the claim rather than trusting it. */
    for (const t of VALVE_TOKENS) {
      expect(card, `the ring no longer strokes --${t}`).toContain(`stroke-${t}`)
      expect(readout, `the legend swatch no longer fills --${t}`).toContain(`bg-${t}`)
    }
  })
})

describe('no colour utility in src names a token index.css declares but never registers', () => {
  /* The general form of the same defect: a `--foo` the repo owns, spelled into
     a `stroke-foo` / `fill-foo` / `bg-foo` class, with no `--color-foo` line to
     generate it. Stock Tailwind names are not implicated — they are not
     declared in this file — so this only ever fires on a repo-owned token. */
  it('every repo-owned token used as a colour utility has a --color-* line', () => {
    const declared = new Set(
      [...CSS.matchAll(/^\s*--([a-z0-9-]+):/gm)].map((m) => m[1]).filter((n) => !n.startsWith('color-')),
    )
    const registered = new Set([...CSS.matchAll(/^\s*--color-([a-z0-9-]+):/gm)].map((m) => m[1]))

    const files = []
    ;(function walk(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '__tests__') walk(full) }
        else if (/\.(jsx?|tsx?)$/.test(e.name)) files.push(full)
      }
    })(path.join(REPO_ROOT, 'src'))

    const offenders = []
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8')
      for (const m of src.matchAll(/(?:^|[\s'"`])(?:stroke|fill|bg|text|border)-([a-z][a-z0-9-]*)(?=[\s'"`/]|$)/gm)) {
        const token = m[1]
        if (declared.has(token) && !registered.has(token)) {
          offenders.push(`${path.relative(REPO_ROOT, f)}: --${token} is declared but never registered as --color-${token}`)
        }
      }
    }
    expect([...new Set(offenders)]).toEqual([])
  })
})
