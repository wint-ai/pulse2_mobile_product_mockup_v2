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
 * THE TWO DEV AIDS AT THE BOTTOM OF THIS FILE, and why a concealed feature
 * has any visible surface at all.
 *
 * The gesture shipped listening to touch events only and was therefore dead
 * under a mouse, which is how the owner found it broken. The input path is
 * fixed in the hook; these two aids exist so that the NEXT time it does not
 * work, nobody has to guess:
 *
 *   the handle — a small labelled pill that opens the sheet on a plain tap or
 *                 click. No gesture, no timing, no geometry. ON BY DEFAULT
 *                 since 2026-10-31, temporarily and at the owner's request;
 *                 the full reasoning, and what reverting it costs, is at
 *                 DEV_FLAGS.handle below. Turned off with `?simhandle=0` or
 *                 the `×` on the pill, and back on with `?simhandle=1`.
 *   ?simdebug=1 — outlines the hit zone and shows a live readout of what the
 *                 gesture saw: whether a press arrived at all, its pointer
 *                 type and coordinates, the zone's own rect, whether the
 *                 press was inside it, how long it was held, how far it
 *                 moved, and the exact condition that rejected it. OFF by
 *                 default and unreachable without its flag.
 *
 * Neither aid replaces anything. The concealed long press keeps working
 * exactly as it does, on every route, with the handle on screen.
 *
 * Unlike `?sim=1`, both PERSIST for the session in `sessionStorage` — the
 * owner has to be able to reload and keep their choice, and the
 * DesktopFrame/MobileLayout remount race described below would otherwise eat
 * it on a handset exactly as it ate `?sim=1`. `sessionStorage` and not
 * `localStorage`: the decision dies with the tab, so a fresh tab (and anyone
 * the review link is pasted to) starts from the default rather than
 * inheriting a stale one in either direction.
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
 * `?sim=1`, read once and survived across ONE remount.
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
 *
 * (The two dev-aid flags below deliberately take the opposite decision, for
 * the reason given in the file header: they must survive a reload.)
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

/* The dev-aid flags: URL param ➜ sessionStorage key. Named the way the rest
   of the app names its query flags (`?theme=`, `?sim=1`, `?p=`). */
const DEV_FLAGS = {
  /**
   * ⚠ TEMPORARY. THE DEFAULT WAS FLIPPED TO `true` ON 2026-10-31, AT THE
   * OWNER'S EXPLICIT REQUEST — "make it always visible for now".
   *
   * Why: the handle shipped flag-gated, the owner loaded the app without
   * `?simhandle=1`, saw nothing, and asked where it was. Flag-gating is the
   * right design for a concealed tool and it was costing them the only thing
   * they actually needed that day — a reliable way to fire a notification
   * mid-demo without depending on a gesture that had just been broken.
   *
   * THE INTENDED END STATE IS CONCEALED. Setting `defaultOn` back to `false`
   * is the whole revert: the gesture becomes the only way in again, and the
   * handle goes back to needing `?simhandle=1`. Nothing else has to move.
   * "For now" is exactly the kind of thing that quietly becomes permanent,
   * so this note is the reminder that it was never meant to stay.
   */
  handle: { param: 'simhandle', key: 'pulse2-sim-handle', defaultOn: true },
  debug: { param: 'simdebug', key: 'pulse2-sim-debug', defaultOn: false },
}

/**
 * Read one dev-aid flag. THREE states, not two, which is what the flipped
 * default above forces:
 *
 *   key absent  → `defaultOn` — a fresh tab gets the default, always
 *   key `'0'`   → dismissed in this tab, and it STAYS dismissed across a
 *                 reload, which is the whole point of storing it at all
 *   key `'1'`   → explicitly asked for, e.g. re-enabled after a dismissal
 *
 * With the handle's default now `on`, a store that could only record "on"
 * would make the `×` and `?simhandle=0` last exactly until the next reload.
 * `sessionStorage` and emphatically not `localStorage`: a dismissal must die
 * with the tab, so tomorrow — and anyone the review link is pasted to —
 * starts from the default rather than inheriting a stale decision.
 *
 * Called from a state initialiser, so it is written to be safe under a
 * StrictMode double-invoke: writing the same key twice is the same as writing
 * it once, and the answer does not depend on how many times it is asked.
 */
function readDevFlag({ param, key, defaultOn = false }) {
  try {
    const value = new URLSearchParams(window.location.search).get(param)
    if (value === '1' || value === '0') sessionStorage.setItem(key, value)
    const stored = sessionStorage.getItem(key)
    if (stored === '1') return true
    if (stored === '0') return false
    return defaultOn
  } catch { return defaultOn }
}

/** The `×` on an aid: dismissed for this tab, and it survives a reload. */
function dismissDevFlag({ key }) {
  try { sessionStorage.setItem(key, '0') } catch { /* private mode */ }
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
  const [showHandle, setShowHandle] = useState(() => readDevFlag(DEV_FLAGS.handle))
  const [debug, setDebug] = useState(() => readDevFlag(DEV_FLAGS.debug))
  const { persona, visibleSystems = [] } = useUserContext() || {}
  const location = useLocation()

  const system = useMemo(() => {
    const match = SYSTEM_IN_PATH.exec(location.pathname || '')
    const fromRoute = match && visibleSystems.find((s) => String(s.id) === decodeURIComponent(match[1]))
    return fromRoute || visibleSystems[0] || null
  }, [location.pathname, visibleSystems])

  /* `?sim=1` — the escape hatch that predates the input fix, kept because it
     is still the fastest way to get the sheet up on a laptop.
     DELIBERATELY NOT PERSISTED, and stripped on arrival: a review link gets
     pasted around, and a reviewer's session must not inherit an open
     simulator from someone else's URL. The two dev-aid flags are stripped in
     the same pass — they have already been latched into sessionStorage by
     then, so dropping them from the URL loses nothing and keeps a reloaded
     or shared address clean. The strip mirrors LoginGate's `?p=` handling in
     App.jsx:231-244 — history.replaceState, keep the path and every other
     param, drop only ours. */
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const ours = ['sim', DEV_FLAGS.handle.param, DEV_FLAGS.debug.param]
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

  const hideHandle = useCallback(() => { dismissDevFlag(DEV_FLAGS.handle); setShowHandle(false) }, [])
  const hideDebug = useCallback(() => { dismissDevFlag(DEV_FLAGS.debug); setDebug(false) }, [])

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

      {/* ── DEV AID: the visible handle, now on by default (DEV_FLAGS.handle).
          ABOVE THE TAB BAR, AND ON THE LEFT. Two separate constraints:
          - not bottom-RIGHT, because that is the concealed gesture's own
            64x64 zone and the handle must never occlude it. The gesture
            keeps working with this on screen; the handle is an addition,
            not a replacement.
          - not flush to the bottom, because at 393px the TabBar's first
            label sits there and the pill clipped the corner of "Home".
            That was tolerable for an opt-in aid and is not for one that is
            always on screen, so it clears the TabBar entirely.

          SOLID PRIMARY, NOT A QUIET OUTLINE. It is deliberately the loudest
          thing on the screen that is not content, because the owner also
          could not tell a stale build from a build where they simply had not
          found the handle. The previous deployed build has no handle at all,
          so the pill IS the build signal: see it and you are on this build.
          A subtle affordance would have left both questions open. */}
      {showHandle && !open && (
        <div className="absolute bottom-[72px] left-[12px] z-[240] flex items-center overflow-hidden rounded-full border border-solid border-primary bg-primary shadow-sm">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="px-[12px] py-[6px] font-semibold text-[12px] leading-[16px] text-primary-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Push sim
          </button>
          <button
            type="button"
            aria-label="Hide the push simulator handle"
            onClick={hideHandle}
            className="border-l border-solid border-primary-foreground/40 px-[9px] py-[6px] text-[12px] leading-[16px] text-primary-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            ×
          </button>
        </div>
      )}

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
