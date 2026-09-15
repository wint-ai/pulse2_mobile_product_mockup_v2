#!/usr/bin/env node
/**
 * Catch undefined JSX components.
 *
 * eslint's no-undef does NOT flag `<SomeUndefinedComponent />` in this config —
 * verified with a control file — while it does flag a bare undefined variable in
 * an expression. That blind spot shipped two ReferenceErrors that only surfaced
 * when the component actually rendered in a browser: `Search` and `ChevronDown`
 * survived an import rewrite, and neither the build nor `npm test` noticed.
 *
 * usage: node scripts/check-jsx-refs.mjs [dir ...]   (default: src)
 * exits 1 if anything is unresolved.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOTS = process.argv.slice(2).length ? process.argv.slice(2) : ['src']

function* files(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { yield* files(p); continue }
    if (/\.jsx$/.test(e.name)) yield p
  }
}

// Names React resolves itself, plus intrinsics that start uppercase by accident.
const BUILTIN = new Set(['Fragment', 'Suspense', 'Profiler', 'StrictMode'])

let bad = 0
for (const root of ROOTS) {
  if (!statSync(root).isDirectory()) continue
  for (const file of files(root)) {
    const src = readFileSync(file, 'utf8')

    // Components referenced in JSX, including namespaced <Foo.Bar />.
    const used = new Set(
      [...src.matchAll(/<([A-Z][A-Za-z0-9_]*)/g)].map(m => m[1]),
    )
    if (!used.size) continue

    const defined = new Set(BUILTIN)
    // import { A, B as C } / import D / import * as E.
    // The negative lookahead skips side-effect imports (`import './x.css'`) —
    // without it the lazy match runs past them and swallows the next clause,
    // which made `import App from './App.jsx'` look undefined.
    for (const m of src.matchAll(/import\s+(?!['"])([\s\S]*?)\s+from\s+['"]/g)) {
      const clause = m[1]
      for (const part of clause.replace(/[{}]/g, ',').split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop().trim()
        if (/^[A-Za-z_$][\w$]*$/.test(name)) defined.add(name)
      }
    }
    // function Foo() / const Foo = / let Foo = / class Foo
    for (const m of src.matchAll(/(?:function|class)\s+([A-Z][A-Za-z0-9_]*)/g)) defined.add(m[1])
    for (const m of src.matchAll(/(?:const|let|var)\s+([A-Z][A-Za-z0-9_]*)\s*=/g)) defined.add(m[1])
    // destructured locals and params: { Icon } = ... / ({ Icon })
    for (const m of src.matchAll(/[{,]\s*([A-Z][A-Za-z0-9_]*)\s*[,}:=]/g)) defined.add(m[1])

    const missing = [...used].filter(u => !defined.has(u.split('.')[0]))
    if (missing.length) {
      bad += missing.length
      console.log(`${file}`)
      for (const m of missing) {
        const line = src.split('\n').findIndex(l => l.includes(`<${m}`)) + 1
        console.log(`  ${line}:  <${m}>  is not defined`)
      }
    }
  }
}

console.log(bad ? `\n${bad} unresolved JSX component reference(s)` : 'all JSX component references resolve')
process.exit(bad ? 1 : 0)
