/**
 * The concealed way into the push simulator, from the phone itself.
 *
 * The owner's ask: "how we can simulate push notification for the water event
 * flow ... just trigger them from the mobile app ... not too much interface.
 * It's kind of simulator that only someone that knows it can use it."
 *
 * So: a 1200ms one-pointer long press in a 64x64 zone at the BOTTOM-RIGHT of
 * the phone, which opens the sheet. Nothing is drawn until it opens, there is
 * no affordance to find by accident, and the gesture is the gate every single
 * time — nothing is remembered, nothing is unlocked, and no flag is written
 * to any storage. The corner was chosen by hit-testing eight candidates on the
 * three screens a presenter demos from; see useConcealedLongPress.js.
 *
 * It builds NO notification surface. The sheet posts the same event object
 * the desktop /push panel posts, onto the same BroadcastChannel
 * PushNotifications.jsx has always listened on, so the lock screen, the
 * shade, the heads-up card and the in-app banner are all the existing ones.
 * The desktop panel and its ntfy.sh bridge are untouched.
 *
 * THE ANCHOR. The 0-interaction div below is not a hit target — it is
 * `visibility: hidden` and `pointer-events: none`, and the gesture never
 * consults it for events, only for a rect. It exists because the zone has to
 * be measured against the phone shell and there is no stable handle on it:
 * Phone.jsx renders DesktopFrame on desktop and MobileLayout on a handset,
 * and only one of those has a status bar. The anchor is `inset`-stretched
 * inside PushNotifications' own relative wrapper — the exact box the
 * simulated surfaces cover — so `rect.right` and `rect.bottom` are correct in
 * both layouts. No `env(safe-area-*)` offset: the measured reason is in
 * useConcealedLongPress.js, and this app applies none anywhere else either.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * REMOVED 2026-11-01 — THE VISIBLE "PUSH SIM" HANDLE. Read this before
 * adding another one.
 *
 * Gone from this file: the pill itself, its `×`, the `?simhandle` param, its
 * `sessionStorage` key `pulse2-sim-handle`, the generic three-state
 * `readDevFlag` that existed so that pill could be dismissed against an
 * always-on default, and the eight tests that pinned all of it.
 *
 * Removed at the owner's explicit instruction — "I don't understand why do I
 * need two different URLs for that. Why not only using one? When touching
 * secret area in the app, just opens the push" — which is the Rule 0
 * exception, and the only thing that licenses deleting working code here.
 *
 * WHY IT WAS NEVER A FEATURE. It was scaffolding around a bug, not a design.
 * The gesture shipped listening to `touchstart`/`touchmove`/`touchend` only,
 * so it was dead under a mouse and the owner found it broken in seconds. The
 * pill — and the `?sim=1` link beside it — went up to get a notification
 * fired at all while that was true. The input path then moved to Pointer
 * Events, one path over mouse, touch and pen, and the gesture has worked on
 * both inputs since; which left the pill a second way in to a door that was
 * no longer stuck. Two entrances for one concealed tool is exactly the "too
 * much interface" the brief ruled out.
 *
 * AND IT COST SOMETHING REAL. The pill was `absolute bottom-[72px]
 * left-[12px] z-[240]` — x 12–113 / y 750–780 on a 393×852 frame — and the
 * home screen's Water-events rows SCROLL UNDERNEATH IT. A tap on a row's left
 * third opened this simulator instead of the row's event, and a tap at
 * x 85–109 hit the `×`, which silently hid the pill and did nothing else:
 * from the far side of the glass, indistinguishable from the app ignoring
 * you. So this removes a defect as well as a path.
 *
 * IF THE GESTURE IS EVER HARD TO FIND AGAIN, the answer is to fix discovery —
 * or to use the break-glass below — NOT to float a pill back over the
 * content. A dev aid that eats taps on real content is worse than one nobody
 * can find, and that is the trade a visible handle keeps proposing.
 *
 * WHAT IS LEFT, and neither of these is a second way in:
 *
 *   ?sim=1      — break-glass. It costs no interface and it is the only thing
 *                 that worked while the gesture was broken. The full note is
 *                 at readSimParam below: it is a fallback, not an
 *                 alternative, and it does not grow a UI.
 *   ?simdebug=1 — the diagnostic for the gesture: outlines the hit zone and
 *                 reports what the gesture saw — whether a press arrived at
 *                 all, its pointer type and coordinates, the zone's own rect,
 *                 whether the press was inside it, how long it was held, how
 *                 far it moved, and the exact condition that rejected it. OFF
 *                 by default and unreachable without its flag. Unrelated to
 *                 the handle, and untouched by its removal.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useUserContext } from '@/context/UserContext'
import useConcealedLongPress, { HOLD_MS, SLOP_PX, ZONE_PX } from '@/hooks/useConcealedLongPress'
import { isSimulatedSurfaceShowing } from '@/lib/simulatedSurface'
import { fireOnSurface, fireLockPhone, fireDemoReset } from '@/lib/pushSimFire'
import PushSimSheet from '@/v2/components/PushSimSheet'

/* Routes that name a system. The sheet fires at whatever system the presenter
   is already looking at, which is the whole point of triggering from the
   phone — open the system, hold the corner, fire its water event. Off such a
   route it falls back to the persona's first visible system. */
const SYSTEM_IN_PATH = /\/(?:system|alert|leak)\/([^/?#]+)/

/**
 * `?sim=1` — BREAK-GLASS, NOT A SECOND WAY IN. Read once, and survived across
 * ONE remount.
 *
 * THIS IS A FALLBACK, NOT AN ALTERNATIVE, AND IT MUST NOT GROW A UI. The
 * concealed long press is the way into the simulator. This exists for the one
 * case the gesture cannot cover itself: it misbehaves on an unfamiliar
 * handset mid-demo and there is no time to find out why. It is also the only
 * thing that worked through the whole period the gesture was dead under a
 * mouse, which is the entire argument for keeping it. It costs nothing to
 * keep because it draws NOTHING — no pill, no affordance, not a pixel on any
 * screen. The moment anything visible is hung off it, it stops being
 * break-glass and becomes the second entrance the owner asked us to remove
 * (the removal note is in the file header). So the answer to "the gesture is
 * hard to find" is to fix discovery, or to type this URL — never to render
 * something.
 *
 * Phone.jsx:148-154 renders DesktopFrame on the first paint and swaps to
 * MobileLayout as soon as useIsMobile's effect has run. Those are different
 * component types, so React unmounts and remounts the entire app below them a
 * few milliseconds into every load on a handset — this component with it.
 * A naive read in a state initialiser is therefore taken, the URL is stripped,
 * and the remount re-reads a URL that no longer says `sim`, so the sheet
 * flashes and disappears. Verified in Chromium at 393x852; it is the reason
 * this function exists at all.
 *
 * So a positive answer is remembered — for 1.5 seconds, in a module variable,
 * and nowhere else. NOT sessionStorage and emphatically not localStorage:
 * nothing about the simulator's SHEET may outlive the page load, because a
 * review link gets pasted around and a reviewer's session must not inherit an
 * open simulator. The window is bounded so that a layout flip a minute later
 * cannot resurrect a sheet the presenter already closed.
 */
const SIM_REMOUNT_WINDOW_MS = 1500
let simArmedUntil = 0

function readSimParam() {
  if (Date.now() < simArmedUntil) return true
  try {
    if (new URLSearchParams(window.location.search).get('sim') !== '1') return false
  } catch { return false }
  simArmedUntil = Date.now() + SIM_REMOUNT_WINDOW_MS
  return true
}

/* The gesture diagnostic's flag: URL param ➜ sessionStorage key. Named the
   way the rest of the app names its query flags (`?theme=`, `?sim=1`, `?p=`).
   Unlike `?sim=1` it PERSISTS for the session — the owner has to be able to
   reload and keep it on, and the DesktopFrame/MobileLayout remount race
   described above would otherwise eat it on a handset exactly as it ate
   `?sim=1`. `sessionStorage` and not `localStorage`: the decision dies with
   the tab, so a fresh tab — and anyone the review link is pasted to — starts
   from off rather than inheriting someone else's readout. */
const DEBUG_FLAG = { param: 'simdebug', key: 'pulse2-sim-debug' }

/**
 * Read the diagnostic flag. TWO states, because off is the default and
 * "dismissed" and "never asked for" are therefore the same answer:
 *
 *   key present → asked for, and it STAYS on across a reload, which is the
 *                 whole point of storing it at all
 *   key absent  → off
 *
 * This used to be a generic three-state read (`'1'` / `'0'` / absent) shared
 * with the visible handle, whose default was briefly ON — and only a flag
 * that defaults ON needs a stored `'0'`, to tell a dismissal apart from its
 * own default. With the handle gone (file header) nothing defaults on, so
 * `?simdebug=0` and the `×` just clear the key. Identical observable
 * behaviour for `?simdebug`, one state fewer.
 *
 * Called from a state initialiser, so it is written to be safe under a
 * StrictMode double-invoke: writing or clearing the same key twice is the
 * same as doing it once, and the answer does not depend on how many times it
 * is asked.
 */
function readDebugFlag() {
  try {
    const value = new URLSearchParams(window.location.search).get(DEBUG_FLAG.param)
    if (value === '1') sessionStorage.setItem(DEBUG_FLAG.key, '1')
    else if (value === '0') sessionStorage.removeItem(DEBUG_FLAG.key)
    return sessionStorage.getItem(DEBUG_FLAG.key) === '1'
  } catch { return false }
}

/** The `×` on the readout: dismissed for this tab, and it survives a reload. */
function dismissDebugFlag() {
  try { sessionStorage.removeItem(DEBUG_FLAG.key) } catch { /* private mode */ }
}

/** `1,2` and `—` rather than `undefined` — a readout with holes in it is noise. */
function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v)) : '—'
}

export default function PushSimTrigger() {
  const anchorRef = useRef(null)
  /* Seeded in the initialiser rather than set from an effect: the read is
     pure, so a StrictMode double-invoke costs nothing, and the effect below
     is left doing only external-system work (rewriting the URL). */
  const [open, setOpen] = useState(readSimParam)
  const [debug, setDebug] = useState(readDebugFlag)
  const { persona, visibleSystems = [] } = useUserContext() || {}
  const location = useLocation()

  const system = useMemo(() => {
    const match = SYSTEM_IN_PATH.exec(location.pathname || '')
    const fromRoute = match && visibleSystems.find((s) => String(s.id) === decodeURIComponent(match[1]))
    return fromRoute || visibleSystems[0] || null
  }, [location.pathname, visibleSystems])

  /* `?sim=1` — the break-glass described at readSimParam above.
     DELIBERATELY NOT PERSISTED, and stripped on arrival: a review link gets
     pasted around, and a reviewer's session must not inherit an open
     simulator from someone else's URL. `?simdebug` is stripped in the same
     pass — it has already been latched into sessionStorage by then, so
     dropping it from the URL loses nothing and keeps a reloaded or shared
     address clean. The strip mirrors LoginGate's `?p=` handling in
     App.jsx:231-244 — history.replaceState, keep the path and every other
     param, drop only ours. */
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const ours = ['sim', DEBUG_FLAG.param]
      if (!ours.some((p) => params.has(p))) return
      for (const p of ours) params.delete(p)
      const cleaned =
        window.location.pathname +
        (params.toString() ? `?${params}` : '') +
        window.location.hash
      window.history.replaceState({}, '', cleaned)
    } catch { /* private mode / no history */ }
  }, [])

  /* The gesture's own running commentary, and ONLY while `?simdebug=1` is on:
     with no `onDiagnostic` the hook never calls anything, so a normal session
     pays nothing for this. */
  const [diag, setDiag] = useState(null)
  const onDiagnostic = useCallback((d) => setDiag(d), [])

  useConcealedLongPress({
    anchorRef,
    // Already open? The gesture has nothing left to do, and a second fire
    // while the sheet is up would only re-trigger its mount animation.
    enabled: !open,
    isBlocked: isSimulatedSurfaceShowing,
    onTrigger: useCallback(() => setOpen(true), []),
    onDiagnostic: debug ? onDiagnostic : undefined,
  })

  /* A mouse held perfectly still emits no pointermove, so between `down` and
     the fire there is nothing to re-render on and the readout would sit at
     0ms for the whole 1200ms — exactly the number the owner is trying to
     watch. So tick locally while a hold is armed; the interval is mounted
     only in debug, and only between a press and its outcome.
     The tick carries the press it belongs to, because `heldNow` would
     otherwise survive into the NEXT press and show it starting at the
     previous one's elapsed time for the first 60ms. */
  const pressStartedAt = debug && diag?.armed ? diag.at - (diag.heldMs || 0) : null
  const [heldNow, setHeldNow] = useState(null)
  useEffect(() => {
    if (pressStartedAt === null) return undefined
    const id = setInterval(() => setHeldNow({ from: pressStartedAt, ms: Date.now() - pressStartedAt }), 60)
    return () => clearInterval(id)
  }, [pressStartedAt])
  const liveHeldMs = heldNow && heldNow.from === pressStartedAt ? heldNow.ms : null

  const close = useCallback(() => setOpen(false), [])

  /* Close FIRST, then fire. The notification has to land on a clean screen,
     not behind this sheet — and for every surface but In-app the sheet would
     otherwise still be up when the lock screen or shade slides in over it. */
  const handleFireCard = useCallback((card, surface) => {
    setOpen(false)
    fireOnSurface(card, system, { persona, surface })
  }, [system, persona])

  const handleLockPhone = useCallback(() => {
    setOpen(false)
    fireLockPhone()
  }, [])

  const handleResetDemo = useCallback(() => {
    setOpen(false)
    fireDemoReset()
  }, [])

  const hideDebug = useCallback(() => { dismissDebugFlag(); setDebug(false) }, [])

  return (
    <>
      <div
        ref={anchorRef}
        data-push-sim-anchor=""
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-0"
      />

      {/* ── DEV AID: the hit zone, drawn. Same box the hook computes, because
          the anchor above is `inset-0` of this same parent, so the parent's
          own bottom-right 64x64 IS the zone. `pointer-events-none` is not
          optional — an outline that swallowed the press would diagnose the
          gesture by breaking it. */}
      {debug && (
        <div
          aria-hidden="true"
          data-push-sim-zone=""
          className="pointer-events-none absolute right-0 bottom-0 z-[240] border-2 border-dashed border-primary"
          style={{ width: ZONE_PX, height: ZONE_PX }}
        />
      )}

      {/* ── DEV AID: the readout. Fixed inside the phone box, never portalled
          (the house rule: ValveConfirmSheet.jsx:17-25). */}
      {debug && <GestureReadout diag={diag} liveHeldMs={liveHeldMs} onHide={hideDebug} />}

      <PushSimSheet
        open={open}
        system={system}
        onClose={close}
        onFireCard={handleFireCard}
        onLockPhone={handleLockPhone}
        onResetDemo={handleResetDemo}
      />
    </>
  )
}

/**
 * What the gesture saw, in the order the hook decides it.
 *
 * Deliberately plain: this is a developer aid, not a screen. It is
 * `pointer-events-none` as a whole so it cannot intercept the press it is
 * reporting on, with the one `×` opted back in.
 */
function GestureReadout({ diag, liveHeldMs, onHide }) {
  const held = diag?.armed && liveHeldMs !== null ? liveHeldMs : diag?.heldMs
  const zone = diag?.zone
  const rows = [
    ['press', diag ? `${diag.pointerType} @ ${num(diag.x)},${num(diag.y)}` : 'none seen yet'],
    ['in zone', diag ? (diag.inZone ? 'yes' : 'NO') : '—'],
    ['zone', zone ? `${num(zone.left)},${num(zone.top)} → ${num(zone.right)},${num(zone.bottom)}` : 'not measured'],
    ['held', `${num(held)} / ${HOLD_MS} ms`],
    ['moved', `${num(diag?.movedPx)} / ${SLOP_PX} px`],
    ['state', diag ? diag.phase : 'idle'],
    ['why not', diag?.reason || (diag?.phase === 'fire' ? 'it fired' : '—')],
  ]

  return (
    <div
      data-push-sim-debug=""
      aria-live="polite"
      className="pointer-events-none absolute inset-x-[8px] top-[8px] z-[241] rounded-[8px] border border-solid border-border-strong bg-surface-card/95 px-[8px] py-[6px] text-[10px] leading-[14px] text-foreground"
    >
      <div className="flex items-center gap-[6px]">
        <span className="min-w-0 flex-1 truncate font-semibold uppercase tracking-[0.5px] text-muted-foreground">
          push sim gesture
        </span>
        <button
          type="button"
          aria-label="Hide the push simulator diagnostics"
          onClick={onHide}
          className="pointer-events-auto flex size-[18px] items-center justify-center rounded-full border border-solid border-border-strong text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          ×
        </button>
      </div>
      <dl className="mt-[4px] flex flex-col gap-[1px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start gap-[6px]">
            <dt className="w-[52px] text-muted-foreground">{label}</dt>
            <dd className="min-w-0 flex-1 break-words text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
