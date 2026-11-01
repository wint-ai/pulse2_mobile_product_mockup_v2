/**
 * The notification surfaces draw the APP ICON, and the iOS anatomy around it.
 *
 * WHY THIS IS A SOURCE TEST AND NOT A DOM TEST. The four card components
 * (LockCard, ShadeCard, InAppBanner, HeadsUpNotification) are module-private
 * — they are never exported, and reaching them through the default export
 * means standing up a router, a UserProvider, a BroadcastChannel and a
 * delivery-surface state machine for each of four surfaces, to assert on one
 * <img>. The thing that can silently revert here is a *reference* in the
 * source: a merge that reinstates `wint-logo.svg`, drops the base-path
 * prefix, or puts the app-name row back. That is what this reads.
 *
 * It exists because every one of these has already been got wrong once: the
 * chip shipped as the navy wordmark on a hardcoded white ground, and a
 * sibling asset path shipped without `BASE_URL` and 404'd only on the
 * deployed site, where the base is /pulse2_mobile_product_mockup_v2/.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('../components/PushNotifications.jsx', import.meta.url))
const source = readFileSync(SRC, 'utf8')

/* The four delivery surfaces, by the function name each is declared under.
   These are the "In-app / Lock screen / Shade / Other app" delivery chips in
   the simulator, in that order. */
const SURFACES = ['LockCard', 'ShadeCard', 'InAppBanner', 'HeadsUpNotification']

/**
 * The text of one function declaration's BODY.
 *
 * Every one of these components destructures its props, so the first `{`
 * after the name belongs to the parameter list, not the body. Walk the
 * parentheses first, then brace-match from the `{` that follows them.
 */
function bodyOf(name) {
  const start = source.indexOf(`function ${name}(`)
  if (start === -1) throw new Error(`${name} is not declared in PushNotifications.jsx`)
  let i = source.indexOf('(', start)
  let parens = 0
  for (; i < source.length; i++) {
    if (source[i] === '(') parens++
    else if (source[i] === ')' && --parens === 0) break
  }
  const open = source.indexOf('{', i)
  let depth = 0
  for (let j = open; j < source.length; j++) {
    if (source[j] === '{') depth++
    else if (source[j] === '}' && --depth === 0) return source.slice(open, j + 1)
  }
  throw new Error(`unbalanced braces in ${name}`)
}

/* Comments legitimately name the old asset to explain why it went. Strip them
   so prose can never satisfy — or break — an assertion about live code. */
function code(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
}

describe('push notification surfaces — the leading icon', () => {
  it('renders the app icon, not the bare wint wordmark', () => {
    const icon = code(bodyOf('AppIcon'))
    // The app icon, from its canonical home.
    expect(icon).toContain('app-icon/pulse2-app-icon-rounded.svg')
    // Not the brand wordmark, which is what a phone never shows here.
    expect(icon).not.toContain('wint-logo')
  })

  it('never references the wordmark from any live src in the file', () => {
    // Belt and braces: catches a revert that rebuilds the chip somewhere else
    // in the file rather than inside AppIcon.
    expect(code(source)).not.toContain('wint-logo')
  })

  it('reaches the asset through BASE_URL so it survives the deployed base path', () => {
    expect(source).toMatch(/const BASE = import\.meta\.env\.BASE_URL/)
    // The src must be built from BASE. A leading "/" or a bare relative path
    // resolves at the server root and 404s under /pulse2_mobile_product_mockup_v2/.
    expect(code(bodyOf('AppIcon'))).toMatch(
      /src=\{`\$\{BASE\}app-icon\/pulse2-app-icon-rounded\.svg`\}/,
    )
  })

  it('points at an asset that is actually on disk', () => {
    const asset = fileURLToPath(
      new URL('../../public/app-icon/pulse2-app-icon-rounded.svg', import.meta.url),
    )
    expect(existsSync(asset)).toBe(true)
  })

  it('draws no chip ground or corner of its own under the rounded tile', () => {
    const icon = code(bodyOf('AppIcon'))
    // The asset is already a rounded tile with its own ground; a second one
    // behind it reads as a tile on a tile and rings the icon in a halo.
    expect(icon).not.toMatch(/bg-card|bg-accent|rounded-\[6px\]|p-\[2px\]/)
    // And no raw hex ever comes back to stand in for those tokens.
    expect(icon).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it.each(SURFACES)('%s draws the app icon', (name) => {
    expect(code(bodyOf(name))).toContain('<AppIcon')
  })
})

describe('push notification surfaces — the iOS anatomy', () => {
  /* 2026-11-01, from the owner's photograph of a real iOS notification and
     "remove the wint next to the icon": icon, then title + timestamp sharing
     one line, then body. Apple's HIG — "Avoid including your app name or
     icon" — is the rule the app-name row was breaking. */
  it.each(SURFACES)('%s draws no app-name row', (name) => {
    const body = code(bodyOf(name))
    // The literal element the owner asked to remove: <span ...>Wint</span>.
    expect(body).not.toMatch(/>\s*Wint\s*</)
  })

  it.each(SURFACES)('%s clamps its body in CSS rather than cutting the string', (name) => {
    const body = code(bodyOf(name))
    // Apple: "don't truncate your message, the system does this
    // automatically". The V11 strings in pushText.js stay byte-identical, so
    // the clamp has to be a class, not a .slice() or a template cut.
    expect(body).toContain('line-clamp-3')
    expect(body).not.toMatch(/\.slice\(|\.substring\(|…'|\.\.\.'/)
  })

  it.each(SURFACES)('%s keeps its action affordance', (name) => {
    const body = code(bodyOf(name))
    // iOS hides actions behind a long-press, so their absence from the
    // owner's photo is not evidence they should go. LockCard's affordance is
    // its expand-to-"Unlock to take action"; the other three draw NotifActions
    // inline, which is this product's own decision and was never overruled.
    const hasActions = name === 'LockCard'
      ? /onToggleExpand/.test(body) && /Unlock to take action/.test(body)
      : /<NotifActions/.test(body)
    expect(hasActions).toBe(true)
  })

  it.each(SURFACES)('%s still surfaces the On it / Ignored state', (name) => {
    // These pills used to ride the app-name row. That row is gone; the pills
    // are real state and moved below the body rather than going with it.
    expect(code(bodyOf(name))).toContain('<StatusPills')
  })
})

describe('push notification surfaces — the severity disc', () => {
  /* 2026-11-01, the owner: "i only wants to see the the app icon centered on
     the left side / wo the issue icon there / maybe we will add it next".
     Removed from the LAYOUT, deliberately kept in the CODEBASE. */
  it('is off', () => {
    expect(source).toMatch(/const SHOW_CATEGORY_DISC = false/)
  })

  it.each(SURFACES)('%s draws no disc while the flag is off', (name) => {
    const body = code(bodyOf(name))
    const uses = [...body.matchAll(/<CategoryCircle/g)]
    // Every occurrence must sit behind the flag — an unguarded one is the
    // silent drift this pins against.
    for (const m of uses) {
      expect(body.slice(Math.max(0, m.index - 30), m.index)).toContain('SHOW_CATEGORY_DISC &&')
    }
  })

  it('is still reachable, because the owner may add it back', () => {
    // "maybe we will add it next" — so neither of these gets deleted, and
    // flipping SHOW_CATEGORY_DISC to true is the whole way back.
    expect(source).toContain('function CategoryCircle(')
    expect(source).toContain('function getNotificationCategory(')
    expect(source).toContain('SHOW_CATEGORY_DISC && <CategoryCircle')
  })
})
