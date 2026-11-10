/**
 * TAP PROBE, the non-component half - a temporary on-device instrument for the
 * dead water-event tap.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * THIS IS A DIAGNOSTIC. IT IS MEANT TO BE DELETED.
 *
 * To remove it completely:
 *   1. delete src/v2/debug/ (this file and TapProbe.jsx)
 *   2. in src/v2/components/TriageBand.jsx, delete the two imports of
 *      `@/v2/debug/...`, the `{tapDebugOn() && <TapProbe />}` line at the end
 *      of the card, and the three `tapProbe(...)` calls inside EventRow.
 *   3. delete src/__tests__/tapProbe.dom.test.jsx
 * Nothing else references it. The row's activation path does NOT depend on it:
 * `tapProbe` is a no-op whenever the probe is off, which is always unless the
 * URL asked for it.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * WHY IT EXISTS. The water-event rows on the location screen open in every
 * harness this repo can run - WebKit and Chromium, 390x664 / 390x752 /
 * 390x844 / 393x852 / 402x744, still taps, drifting taps, slow taps, taps
 * after a fling - and do not open on the repo owner's handset. The owner has
 * the only device that reproduces it, so this turns that device into the
 * instrument instead of guessing at it from here.
 *
 * WHAT IT RECORDS, per tap on a row:
 *   - every pointer / touch / mouse / click event the handset actually
 *     delivers, in order, with the milliseconds between them;
 *   - how far the finger travelled between pointerdown and pointerup;
 *   - whether the row's handler ran, by which path, or why it was skipped;
 *   - whether the event overlay opened, and whether anything closed it again.
 *
 * It installs only PASSIVE CAPTURE listeners and its read-out is
 * `pointer-events: none` end to end, so it cannot change the behaviour it is
 * measuring. There are no controls on it for the same reason.
 *
 * TO TURN IT ON: add `?debug=tap` to the URL. It then sticks for the rest of
 * the browser tab's session, so in-app navigation keeps it on. `?debug=off`
 * turns it off again, as does closing the tab.
 *
 * This file is split from the component for the reason phoneStatusBar.js is
 * split from Phone.jsx: `react-refresh/only-export-components` is an error in
 * this repo, so a .jsx file may export its component and nothing else.
 */

export const ROW_SEL = 'button[data-node-id="199359:129097"]'
const KEY = 'pulse2-tap-debug'
const LIMIT = 22

/* `null` = not resolved yet. Resolved ONCE per page load and then latched,
   because the query string does not survive in-app navigation and the owner
   will reach the location screen from somewhere else. */
let armed = null

/** Is the probe on? */
export function tapDebugOn() {
  if (armed !== null) return armed
  armed = false
  if (typeof window === 'undefined') return armed
  try {
    const q = new URLSearchParams(window.location.search)
    const flag = q.get('debug') || (window.location.hash.match(/debug=(\w+)/) || [])[1]
    if (flag === 'tap') {
      armed = true
      sessionStorage.setItem(KEY, '1')
    } else if (flag === 'off') {
      sessionStorage.removeItem(KEY)
    } else {
      armed = sessionStorage.getItem(KEY) === '1'
    }
  } catch {
    /* Private mode can refuse sessionStorage. The probe is then on for this
       page load only, which is still useful and never worse than silence. */
  }
  return armed
}

let lines = []
const subs = new Set()

/** Current buffer, newest last. */
export const tapProbeLines = () => lines

/** Subscribe to the buffer. Returns the unsubscribe. */
export function subscribeTapProbe(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}

function push(text) {
  lines = lines.concat({ t: Math.round(performance.now()), text }).slice(-LIMIT)
  subs.forEach(fn => fn(lines))
}

/**
 * Record one line. A no-op unless the probe is on, so call sites stay
 * unconditional and cost nothing in the normal case.
 */
export function tapProbe(text) {
  if (!tapDebugOn()) return
  push(text)
}

/* Installed once per page, not once per mounted probe. React StrictMode runs
   effects twice in dev, so this also keeps the "armed" line from printing
   twice. */
let installed = false

/**
 * Install the document listeners. Idempotent; a no-op when the probe is off.
 * Returns true the FIRST time only, which is how the read-out knows to print
 * its banner once rather than once per StrictMode pass.
 */
export function installTapProbe() {
  if (installed || !tapDebugOn() || typeof document === 'undefined') return false
  installed = true

  let down = null
  let last = 0
  const gap = () => {
    const now = Math.round(performance.now())
    const d = last ? now - last : 0
    last = now
    return d
  }

  const names = [
    'pointerdown', 'pointerup', 'pointercancel',
    'touchstart', 'touchend', 'touchcancel',
    'mousedown', 'mouseup', 'click',
  ]
  for (const name of names) {
    document.addEventListener(name, e => {
      const row = e.target?.closest?.(ROW_SEL)
      /* A click that lands OFF a row while a row gesture is still in flight is
         worth seeing - it is how an outside-click dismiss would show up. */
      if (!row && !(name === 'click' && down)) return

      const idx = row ? [...document.querySelectorAll(ROW_SEL)].indexOf(row) : -1
      if (name === 'pointerdown') {
        down = { x: e.clientX, y: e.clientY }
        last = 0
      }
      let extra = ''
      if (down && (name === 'pointerup' || name === 'click')) {
        const dx = (e.clientX ?? down.x) - down.x
        const dy = (e.clientY ?? down.y) - down.y
        extra = ` moved ${Math.round(Math.hypot(dx, dy))}px`
      }
      if (e.defaultPrevented) extra += ' PREVENTED'
      push(`${name}${idx >= 0 ? ` row${idx}` : ' (off-row)'} +${gap()}ms${extra}`)
      if (name === 'pointerup' || name === 'pointercancel') down = null
    }, { capture: true, passive: true })
  }

  /* An overlay that opens and closes again inside one frame is
     indistinguishable from "nothing happened" on a screen, and only a mutation
     record can show it after the fact. */
  const isDialog = n =>
    n?.nodeType === 1 && (n.matches?.('[role="dialog"][aria-modal="true"]')
      || n.querySelector?.('[role="dialog"][aria-modal="true"]'))
  try {
    new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) if (isDialog(n)) push('>> OVERLAY OPENED')
        for (const n of m.removedNodes) if (isDialog(n)) push('<< OVERLAY CLOSED')
      }
    }).observe(document.body, { childList: true, subtree: true })
  } catch {
    /* An engine without MutationObserver still gets the event trace. */
  }
  return true
}

/** Test seam: forget the latched flag and the buffer. */
export function resetTapProbe() {
  armed = null
  lines = []
}
