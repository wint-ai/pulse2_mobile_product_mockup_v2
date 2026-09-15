#!/usr/bin/env node
/**
 * Enforce the v2 app-shell contract on screens.
 *
 * This encodes the checklist in .claude/skills/v2-page-parity/SKILL.md so it is
 * executable rather than advisory. The failure it exists to prevent is real and
 * already happened once: commits 728d674 and 5c4d404 pointed / and
 * /system/:systemId at v2 pages whose burger had no onClick, whose root was
 * min-h-screen inside Phone.jsx's fixed 393x852 overflow-hidden frame, and which
 * never mounted TabBar. Three functions died silently on the default routes and
 * nobody noticed until a user opened the app.
 *
 * A screen is any file under src/v2/pages/. Components are exempt and this must
 * stay pointed at pages only — not because components are unimportant, but
 * because the rules mean different things there. A component taking
 * `events = MOCK_EVENTS` as a prop default is CORRECT: it renders standalone
 * and takes real data from its parent. A screen doing the same is the Floor 26
 * bug, because a screen has no parent to hand it the route's data. Running this
 * over src/v2/components reports 33 violations, all of them false.
 *
 * usage: node scripts/check-shell-contract.mjs [dir]   (default: src/v2/pages)
 * exit 1 on any violation.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.argv[2] || 'src/v2/pages'

function* files(dir) {
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { yield* files(p); continue }
    if (/\.jsx$/.test(e.name)) yield p
  }
}

const RULES = [
  {
    id: 'no-viewport-height',
    // Phone.jsx is a fixed 393x852 flex column with overflow:hidden. 100vh
    // exceeds it and is simply clipped, so the screen silently cannot scroll.
    test: src => !/\b(?:min-h-screen|h-screen|min-h-\[100vh\]|h-\[100vh\])\b/.test(src),
    msg: 'uses a viewport-height class — Phone.jsx is a fixed 393x852 frame, so 100vh is clipped and the screen will not scroll',
  },
  {
    id: 'owns-its-scroll',
    // Needs one element carrying flex:1 + overflow-y:auto + min-height:0, in
    // either the style-object or the utility-class dialect.
    test: src => {
      const styleForm = /overflowY:\s*['"]auto['"]/.test(src)
        && /minHeight:\s*0/.test(src)
        && /flex:\s*1/.test(src)
      const classForm = /overflow-y-auto/.test(src)
        && /min-h-0/.test(src)
        && /\bflex-1\b/.test(src)
      return styleForm || classForm
    },
    msg: 'no scroll container — a screen must own one element with flex:1 + overflowY:auto + minHeight:0, or the equivalent utilities',
  },
  {
    id: 'mounts-tabbar',
    test: src => /<TabBar\b/.test(src),
    msg: 'does not mount <TabBar> — the bottom nav disappears on this route',
  },
  {
    id: 'burger-is-wired',
    // If it draws a burger it must do something. Either a handler on the button
    // or an explicit note that it is deliberately inert.
    test: src => {
      const drawsBurger = /<Menu10\b|<Menu\b|aria-label="Menu"/.test(src)
      if (!drawsBurger) return true
      const wired = /aria-label="Menu"[^>]*onClick|onClick[^>]*aria-label="Menu"/s.test(src)
        || /setDrawerOpen|setSidebarOpen|setMenuOpen/.test(src)
      const declaredInert = /deliberately inert|aria-disabled/i.test(src)
      return wired || declaredInert
    },
    msg: 'draws a burger with no handler and no "deliberately inert" note — a Figma frame describes appearance, never behaviour',
  },
  {
    id: 'no-expiring-assets',
    test: src => !/figma\.com\/api\/mcp\/asset/.test(src),
    msg: 'references a figma.com asset URL at runtime — those expire in about 7 days; inline the SVG instead',
  },
  {
    id: 'reads-real-data',
    // The worst failure in this codebase was not a dead control — it was a
    // screen that looked perfect and showed the wrong building. SystemPage.jsx
    // rendered a `const SYS` mock with no useParams and no @/data import at
    // all, so every system in the app was "Floor 26 at North Quarter Ltd."
    // A dead burger announces itself; wrong-but-plausible data does not.
    //
    // A mock is fine as a default so a component renders standalone. A SCREEN
    // that never reads the dataset is not.
    test: src => {
      const hasMock = /const\s+(?:SYS|MOCK|MOCK_[A-Z_]+)\s*=/.test(src)
      const readsData = /from\s+['"]@\/data\//.test(src)
      return readsData || !hasMock
    },
    msg: 'renders a hardcoded mock and imports nothing from @/data — the screen will show the same content for every route. Read the dataset; keep the mock only as a default',
  },
]

let failures = 0
let checked = 0

/**
 * Strip comments before matching.
 *
 * These files legitimately DISCUSS the banned patterns — the fix comments say
 * things like "`min-h-screen` here would just be clipped". Matching raw source
 * flagged both correct pages, and a checker that cries wolf is one nobody runs.
 * Block comments, line comments and JSX {/* … *\/} all go.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
}

for (const file of files(ROOT)) {
  const rawSrc = readFileSync(file, 'utf8')

  // A page may declare itself superseded — kept only as a frozen before/after
  // reference, not as a live screen. That is an honest reason to hold mock
  // data, and it has to be DECLARED in the file rather than inferred from a
  // path, so it stays visible to the next reader and to review. Anything not
  // carrying the marker is held to the full contract.
  if (/@superseded\b/.test(rawSrc)) { checked++; continue }

  const src = stripComments(rawSrc)
  checked++
  const bad = RULES.filter(r => !r.test(src))
  if (!bad.length) continue
  failures += bad.length
  console.log(`\n${file}`)
  for (const r of bad) console.log(`  [${r.id}]  ${r.msg}`)
}

console.log(
  failures
    ? `\n${failures} shell-contract violation(s) across ${checked} screen(s)`
    : `shell contract ok — ${checked} screen(s) checked`,
)
process.exit(failures ? 1 : 0)
