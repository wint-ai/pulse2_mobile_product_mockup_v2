/**
 * EventFocusOverlay — one event, full screen, nothing else.
 *
 * WHY THIS EXISTS
 * The v2 System page (src/v2/pages/SystemPageV2Screen.jsx, route /system/:id)
 * is meant to be the single destination for a water event, but an audit found
 * eleven capabilities that still existed only on the v1 screen
 * src/screens/leak/LeakDetail.jsx (route /alert/:id) — six of them things a
 * user DOES to close an event out. Rather than bolt six more cards onto a page
 * that already scrolls past six, the event gets its own surface: "it needs to
 * open an overlay screen for the Event so user fully focus on that."
 *
 * WHAT IT CARRIES BACK FROM v1 — the gaps this closes. All of them survived
 * the 2026-10-17 design-system pass below; only where they sit changed.
 *   1. Stand down            LeakDetail.jsx:393-402 -> stopInvestigating(id),
 *                            gated on the viewer being the claiming actor.
 *                            PRD 04a:68-74, locked 2026-06-08. Footer.
 *   2. "On it · {actor}" + elapsed      LeakDetail.jsx:372-381. The claimed
 *                            strip under the summary card.
 *   3. Who was notified                 LeakDetail.jsx:486-504, getNotification()
 *   4. The ignored presentation         LeakDetail.jsx:245,275,305-319,360 —
 *                            muted body, "Ignored by {name}" pill, the captured
 *                            reason, and NO action row. PRD 04a:146-154.
 *   5. Per-incident step timeline       LeakDetail.jsx:409-483. See TIMELINE.
 *   6. Event ID                         LeakDetail.jsx:507-512 (toLeakId:82-87)
 *                            and ErrorAlertDetail.jsx:169-173 for off-/ve-/pwr-.
 *   7. Non-leak fault chrome            ErrorAlertDetail.jsx:97-140 — severity
 *                            pill, last-command line, power line. ALERT_META.
 *   8. View System                      LeakDetail.jsx:207-210. Added to the
 *                            header on 2026-10-17 and REMOVED by the owner the
 *                            same day ("remove the 'System' in blue"), together
 *                            with the `hideViewSystem` prop that suppressed it.
 *                            Neither exists any more. Do not re-add on a hunch.
 *
 * ── THE 2026-10-17 DESIGN-SYSTEM PASS ────────────────────────────────────
 * Owner review of the competitor-shaped first draft: "in this flow we need to
 * use design as we have in the system page card view for the water event /
 * ignore is missing here / valve action and status is missing / 'help me find
 * the system' is missing / and the most important make it feel like it's part
 * of the new design system" + "events timeline use the same as we already use".
 *
 * Every bespoke block that had a real component behind it is gone:
 *
 *   WAS (bespoke)                      NOW (the app's own component)
 *   ─────────────────────────────────  ──────────────────────────────────────
 *   location chip + severity strip     <AlertCard variant="mobile"/"ignored">
 *   + two-up stat grid                 — the SAME card the System page draws
 *                                        (198374:72716), built from the same
 *                                        row shape as its `alertCardsFor`.
 *   the plain-language paragraph       REMOVED OUTRIGHT. Cut twice on the
 *                                      owner's word, then deleted — the slot
 *                                      was the problem, not the wording. Any
 *                                      interpretation worth keeping belongs in
 *                                      "What should I do", as an action.
 *   hand-built step list               <EventsTimelineCard> — the card the
 *   (TimelineStep, STEP_CONFIG)          System page already uses, fed the
 *                                        INCIDENT's steps. See TIMELINE.
 *   nothing                            a valve readout + a valve primary, and
 *                                      <ValveConfirmSheet> — see VALVE.
 *   nothing                            "Find this system" — see FIND.
 *
 * `alertRowFor` below is a deliberate copy of SystemPageV2Screen's private
 * `alertCardsFor`. It is NOT exported from that page and a page may only export
 * its component, so it cannot be imported. THE TWO MUST LATER SHARE ONE HELPER
 * (src/data/ or src/v2/lib/) — until then a change to one is a bug in the other.
 *
 * WHAT STAYED BESPOKE, AND WHY
 *   - The claimed strip ("On it · {actor}" + elapsed). No component in v2 draws
 *     it; AlertCard has no claim slot. House chassis + tokens only.
 *   - The ignored banner. AlertCard's `ignored` variant mutes the card and
 *     shows an "Ignored" pill, but carries neither WHO ignored it nor the
 *     captured reason, which is the whole point of PRD 04a:146-154.
 *   - <Section>. src/components/ui/ has no accordion; this is a shadcn <Button>
 *     header plus a panel, which is the same construction InfoAccordion uses.
 *   - The fault chrome badges. shadcn <Badge>, tokens only.
 *
 * ── VALVE — THE MAIN ACTION ──────────────────────────────────────────────
 * Owner, 2026-10-17: "how the main action here in this flow is valve operation
 * and its still not here." On a live water event the valve IS the action: "On
 * it" only tells colleagues somebody is looking, closing the valve is what
 * stops the water. So:
 *
 *   STATUS   <ValveStatusCard interactive={false}> — the app's own card, ABOVE
 *            the collapsible sections, wherever the system has a valve.
 *            READ-ONLY: no action, so the footer's primary stays the only one.
 *            This was a compact hand-rolled row (<ValveReadout>, "Valve status
 *            · Open · Auto shut-off") built from the card's atoms as they
 *            stood in 2026-09; when the card was rebuilt against Figma
 *            199383:141553 the copy went stale and the owner saw it — "valve
 *            widget not as in figma". Composing the real card is what keeps
 *            the two from drifting again, and it brings the design's handling
 *            panel with it. The handling line states the system's REAL policy
 *            (getActivePolicy), headline and sentence off the one branch.
 *   ACTION   The footer's solid primary is "Close valve" (or "Open valve" when
 *            it is already closed), and it is the ONLY valve control on this
 *            surface. On it / Stand down and Ignore drop to the secondary row
 *            beneath it, keeping every bit of their gating. A system with no
 *            valve has no valve primary, so On it comes back up to the solid
 *            slot and the footer reads as it always did.
 *   CONFIRM  The primary opens <ValveConfirmSheet>, which carries v1's exact
 *            copy. Nothing happens on the tap itself. v1 has always confirmed
 *            this (ValveControlCard.jsx:420).
 *   NONE     A system with NO valve draws no readout and no valve button.
 *            buildTree.js records 20 MRG systems as genuinely metering-only
 *            (`valve: null`), and inventing one would be a lie.
 *   IGNORED  An ignored water event KEEPS both — see the footer note. One
 *            line to revert if the owner disagrees.
 *
 * WHO OWNS WHAT. The page owns the valve's state of record: SystemPageV2Screen
 * holds `closedValves` + `commitValveIntent`. This overlay owns only the
 * CONFIRMATION (which sheet is open), and hands the confirmed action out
 * through one optional prop:
 *     valve={{ state: valveState, onIntent: action => commitValve(action) }}
 * One object rather than two props on purpose — a caller cannot pass the state
 * without the sink. `onIntent` fires AFTER the user has confirmed, so a caller
 * must COMMIT it, not re-confirm it: routing it at the page's own
 * `setValveIntent` would stack a second sheet on top of this one.
 *
 * STATE PRECEDENCE, strictly:
 *     valve.state  (the page)   >   confirmed in this overlay   >   d.valve
 * The page's value, when supplied, ALWAYS wins and the middle term is never
 * read — so this surface cannot say "Open" over a page that closed it, which
 * is the failure the seam exists to prevent. The middle term exists only for a
 * mount that supplies nothing (HomeAllAccounts today), where there is no other
 * truth to contradict and the alternative is a confirm dialog that visibly
 * does nothing. FLAGGED: it is three lines (`confirmedValve`), and the moment
 * both pages pass `valve` it should be deleted.
 *
 * ── CHROME — A SHEET OVER THE PAGE, NOT A TAKEOVER ───────────────────────
 * Owner, 2026-10-17: "why incident is full screen and not like here in context
 * — fix it." It was an opaque full-frame layer; it is now the house modal
 * sheet, copied from SystemsFilterSheet.jsx:97 (and ValveConfirmSheet, the
 * same pattern smaller): `absolute inset-0 z-50 flex flex-col justify-end`, a
 * scrim <button> filling it, then a bottom-anchored `max-h-[85%]` panel with
 * rounded top corners. The page stays visible above it, so you can still see
 * where you are. The panel's header and footer are shrink-0 and the body is
 * the one scroller, so the actions are reachable without scrolling first.
 * The scrim dismisses, with its OWN aria-label ("Close event") so it does not
 * collide with the × ("Close") — SystemsFilterSheet labels its scrim
 * separately for exactly that reason.
 *
 * ── TIMELINE (the incident's own steps, in the house card) ───────────────
 * The owner chose the INCIDENT's steps (alert sent, reminder sent, valve
 * closed …) over the system-level history, and chose EventsTimelineCard's look.
 * Both are satisfied without touching EventsTimelineCard: its `events` rows
 * already carry title / metrics / description / timestamp / notifications, and
 * each incident step maps onto one row — `step.recipients` even lands in the
 * card's own "n sent" chip. The System page feeds the same card
 * `getEventsForSystem`; this surface feeds it `incident.steps`. Same component,
 * same chrome, different (and deliberately narrower) data.
 *
 * ONE HONEST COST, reported rather than hidden: EventsTimelineCard draws
 * exactly two avatar glyphs (`kind: 'water'` waves / `'network'` wifi) and no
 * per-row colour, so v1's 13-entry STEP_CONFIG glyph+colour vocabulary
 * collapses to those two. Every step still NAMES itself in its title, and the
 * recipient names are still readable in "Who was notified", so nothing is lost
 * but the icon shorthand. Giving the card a per-row `glyph`/`tone` would fix
 * it; that is a change to a file this change does not own.
 *
 * ── FIND (the owner's "help me find the system") ─────────────────────────
 * Device photo + where it is + what it is + the user's own pictures and notes.
 * InfoAccordion already draws Pictures and Notes, but it is an all-or-nothing
 * group of eleven sections with no prop to select any of them, so mounting it
 * here would dump Address, Contacts and Specs into a focused event screen. The
 * STORE is reused instead — locationInfoStore's getPictures / addPicture /
 * removePicture / getNotesOverride / setNotes, keyed by the same scope id
 * InfoAccordion writes under, so a picture added here is the same picture the
 * System page's Info section shows.
 *
 * KNOWN DATA GAP, not chased: SYSTEMS_INFO_MAP's keys do not overlap the real
 * system ids, so getSystemInfo() returns DEFAULT_INFO for every live system and
 * `installDate` comes back null. It is rendered conditionally and is simply
 * absent rather than filled in. What DOES carry real data: getSystemSpecs
 * (device family, valve model, meter model, monitored environment — derived
 * per id), sys.upstream.waterSystemId (the serial), the l3/l4 breadcrumb, and
 * anything the user has saved through locationInfoStore.
 *
 * ── WHAT IS DELIBERATELY NOT HERE ────────────────────────────────────────
 *   - No Ignore / On it on a FAULT. Ignore is a water-event concept and v1's
 *     ErrorAlertDetail correctly offers neither. The fault branch has no footer.
 *   - No un-ignore. Ignore is irreversible per PRD 14, so there is no control
 *     that would undo it, and an ignored event draws no footer at all.
 *   - No Tag picker. The tag taxonomy is being replaced by a one-question
 *     feedback flow (WaterEventFeedbackSheet, being built separately). The seam
 *     for it is the `onIgnore` prop — see the note on the Ignore button.
 *   - No "Snooze" and no second "Turn off water" button from the competitor
 *     reference: the first is not a concept in this product, the second is the
 *     valve card above.
 *
 * ── WHY NOT THE SHADCN <Sheet> / ANY RADIX PORTAL ────────────────────────
 * This app draws inside a fixed 393x852 frame (src/components/Phone.jsx). Radix
 * portals to document.body, which escapes that frame by design — a Sheet here
 * renders across the whole browser window with the phone sitting in the middle
 * of it. Every overlay in this repo is therefore an `absolute inset-0` layer
 * inside the page: SystemsFilterSheet.jsx:97, ValveConfirmSheet.jsx. This
 * follows that house pattern and keeps shadcn Button/Badge/Separator for the
 * controls. It must be mounted inside a positioned ancestor — on the System
 * page that is the frame root (`...relative...`, data-node-id 198379:80447).
 *
 * ── COLOUR / TYPE ────────────────────────────────────────────────────────
 * Every value here is a token from src/index.css, as a Tailwind utility bound
 * to it in `@theme inline` (text-slate-500, bg-accent, bg-primary). There is
 * NO bare hex and no two-argument var() left: Phase 3 deleted the fallbacks
 * and Phase 4 moved the house card chassis onto `bg-surface-card` +
 * `border-card` (SystemTypeCard / ValveStatusCard / ActivePolicyCard /
 * InsightsCard / EventsTimelineCard all draw the same pair). Figtree is the design
 * system's sans and is the document default (index.css:227), so nothing here
 * re-states a family.
 *
 * ALL CARDS ON THIS SCREEN SHARE A WIDTH. AlertCard's `mobile` shell is w-full;
 * ValveStatusCard, EventsTimelineCard and every <Section> are w-full; and
 * AlertCard's `ignored` shell is Figma's fixed w-[308px], so it is overridden
 * with Tailwind v4's important suffix (`w-full!`) rather than left 50px
 * narrower than everything under it.
 *
 * THE cn() TRAP: tailwind-merge treats `leading-*` as conflicting with a
 * font-size class and silently DROPS a leading- that sits BEFORE a text-[...]
 * in the same string. Class strings here are literal JSX attributes, which do
 * not go through cn() at all and also keep escaped var() fallbacks intact; the
 * few strings handed to a shadcn component (which does call cn()) carry no
 * leading-*.
 *
 * TOKENS — Phase 3, docs/TOKENIZATION-PLAN.md (2026-10-21). Every
 * `var(--x, #hex)` in this file has been rewritten to the Tailwind utility
 * that paints the same value, and the fallback DELETED. The fallback was a
 * second, invisible source of truth that won whenever the token was missing,
 * with no warning and no visual tell; removing it makes a missing token fail
 * loudly. Nothing below renders differently — each value was resolved per
 * call site against what it already painted.
 *
 * Any note further down about keeping Figma's escaped `\/` token names
 * VERBATIM, and about String.raw being what carries the backslash, describes
 * the state BEFORE that pass. It is still the rule if an escaped name is ever
 * pasted back in from Figma — but no live class string in this file carries
 * one now, and a fresh paste should resolve the fallback hex to a utility.
 */

import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  Flag,
  ImagePlus,
  MapPin,
  PowerOff,
  TriangleAlert,
  WifiOff,
  X,
} from 'lucide-react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Separator } from '@/components/ui/separator'
import AlertCard from '@/v2/components/AlertCard'
import EventsTimelineCard from '@/v2/components/EventsTimelineCard'
import ValveConfirmSheet from '@/v2/components/ValveConfirmSheet'
import ValveStatusCard from '@/v2/components/ValveStatusCard'
import vmaFront from '@/assets/wint-vma-front.png'
import { peakFlowRate, toFlowRateSeries } from '@/v2/components/eventFlowSeries'
import { getConsumptionSeries } from '@/data/consumptionSeries'
import { getSystemById } from '@/data/systems'
import { getActiveIncident, getLeakState, getNotification } from '@/data/incidents'
import { getActivePolicy, getSystemUnits } from '@/data/systemDetails'
import { getSystemInfo, getSystemSpecs } from '@/data/systemsInfo'
import {
  addPicture,
  getNotesOverride,
  getPictures,
  removePicture,
  setNotes,
} from '@/data/locationInfoStore'
import { isIgnored, getIgnoredInfo } from '@/data/ignoredIncidents'
import {
  isInvestigating,
  getInvestigatingInfo,
  startInvestigating,
  stopInvestigating,
} from '@/data/investigatingStore'
import { getCurrentActor } from '@/data/currentUser'
import { formatDuration } from '@/utils/format'

/* ── Token map ────────────────────────────────────────────────────────────
   Colours that have to travel through an inline style (a severity dot) cannot
   be a Tailwind utility, so they are the token's own custom property with the
   index.css value as the fallback. */
const TOKEN = {
  danger: 'var(--danger)',
  high: 'var(--severity-high)',
  low: 'var(--severity-low)',
}

/* ── v1 catalogues, carried forward ──────────────────────────────────────── */

/* LeakDetail.jsx:36-58, reduced to what EventsTimelineCard can actually draw.
   The v1 `icon` / `color` columns are GONE: the card renders one avatar glyph
   per `kind` (water | network) and no per-row colour, so carrying thirteen
   Lucide glyphs and six hexes here would be carrying values nothing reads.
   Locked decisions that travel with it: newest first; no "Tagged" entry;
   reminders are their own entries; ownership transitions are never collapsed. */
const STEP_META = {
  // Water lifecycle.
  detected: { title: 'Water Event detected', flowAware: true },
  continues: { title: 'Ongoing reminder', flowAware: true },
  'volume-milestone': { title: 'Volume milestone' },
  'shutoff-threshold': { title: 'Shutoff level reached' },
  'leak-ended': { title: 'Water event ended', flowAware: true },
  resolved: { title: 'Water event ended', flowAware: true },
  // Valve.
  'valve-closed': { title: 'Valve closed' },
  'valve-closed-manual': { title: 'Valve closed' },
  'valve-opened-manual': { title: 'Valve opened' },
  'valve-error': { title: 'Valve malfunction detected' },
  // Notification delivery — the one group the card's `network` avatar suits
  // better than waves: these rows are about a message leaving the system.
  'alert-sent': { title: 'Alert Sent', kind: 'network' },
  'reminder-sent': { title: 'Reminder sent', kind: 'network' },
  // User actions.
  'on-it': { title: 'On it', actor: true },
  'stand-down': { title: 'Stand down', actor: true },
  ignored: { title: 'Ignored', actor: true },
}

/* ErrorAlertDetail.jsx:7-14. The fault vocabulary, with v1's severities.
   battery-* and comm are kept although buildAlert() never emits them today —
   they are part of the alert vocabulary and dropping them would make this
   surface lie if the generator ever does. v1's severity hexes map onto the two
   product semantics: Critical -> danger, Warning -> severity-low. */
const ALERT_META = {
  'valve-error': { label: 'Valve error', severity: 'Critical', sevColor: TOKEN.danger },
  'battery-critical': { label: 'Battery critical', severity: 'Critical', sevColor: TOKEN.danger },
  'battery-low': { label: 'Battery low', severity: 'Warning', sevColor: TOKEN.low },
  'power-lost': { label: 'AC power lost', severity: 'Warning', sevColor: TOKEN.low },
  offline: { label: 'Device offline', severity: 'Warning', sevColor: TOKEN.low },
  comm: { label: 'Device offline', severity: 'Warning', sevColor: TOKEN.low },
}

/* ErrorAlertDetail.jsx:16-23. */
const ID_PREFIX = {
  'valve-error': 've',
  'battery-critical': 'bat',
  'battery-low': 'bat',
  'power-lost': 'pwr',
  offline: 'off',
  comm: 'off',
}

const FAULT_ICON = { offline: WifiOff, comm: WifiOff, 'valve-error': TriangleAlert }

const CHANNEL_LABEL = { push: 'Push', email: 'Email', sms: 'SMS' }

/* The house card chassis — SystemTypeCard / ValveStatusCard / ActivePolicyCard
   / InsightsCard / EventsTimelineCard all draw this shell, at this radius. */
const CARD_SHELL =
  'w-full shrink-0 rounded-[18px] border border-solid border-card bg-surface-card'

/* ── Pure helpers (module-local: a component file may only export its
      component, per the react-refresh rule this repo lints with) ─────────── */

/**
 * The AlertCard row — a DELIBERATE COPY of SystemPageV2Screen's private
 * `alertCardsFor` (same file, search `function alertCardsFor`). Field for
 * field, including the "120 L/hour" -> "120" strip and the leak-only status
 * lifecycle, so the overlay's card and the page's card can never render the
 * same event two ways. See the header: the two must later share one helper.
 */
function alertRowFor(alert, systemId) {
  if (!alert) return null
  const leak = alert.type === 'leak-high' || alert.type === 'leak-low'
  const rate = leak && alert.flowRate ? String(alert.flowRate).replace(/[^\d,.]/g, '') : null
  return {
    page: 1,
    pageCount: 1,
    title: alert.label,
    status: leak ? (getLeakState(getActiveIncident(systemId)) ?? 'Ongoing') : 'Ongoing',
    ignored: isIgnored(systemId),
    leak,
    value: rate ?? alert.volume ?? '',
    unit: rate ? 'L/H flow rate' : '',
    detectedLabel: 'Detected',
    detectedAt: alert.startedAt,
    duration: alert.age,
  }
}

/* LeakDetail.jsx:82-87 — the deterministic 4-digit leak id. */
function toLeakId(incident) {
  if (!incident?.id) return null
  let hash = 0
  for (const c of incident.id) hash = (hash * 31 + c.charCodeAt(0)) % 10000
  return `lk-${hash.toString().padStart(4, '0')}`
}

/* ErrorAlertDetail.jsx:25-29 — the same hash, a different prefix. */
function deterministicId(seed, prefix) {
  let h = 0
  for (const c of seed || '') h = (h * 31 + c.charCodeAt(0)) % 10000
  return `${prefix}-${h.toString().padStart(4, '0')}`
}

function initialsFor(name) {
  return String(name)
    .split(/\s+/)
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/* LeakDetail.jsx:61-66 — high/low variants of the flow-aware titles. */
function resolveTitle(stepType, baseTitle, isLowFlow) {
  if (stepType === 'detected') {
    return isLowFlow ? 'Low-flow Water Event detected' : 'High-flow Water Event detected'
  }
  if (stepType === 'continues') {
    return isLowFlow ? 'Ongoing low-flow reminder' : 'Ongoing high-flow reminder'
  }
  if (stepType === 'leak-ended' || stepType === 'resolved') {
    return isLowFlow ? 'Low-flow event ended' : 'High-flow event ended'
  }
  return baseTitle
}

/* LeakDetail.jsx:69-77 — PRD 11 master-table sub-text for actor steps. The
   `tag` argument is gone: it read the tag store, which this surface no longer
   touches (see the Tag note in the header). */
function actorStepSub(stepType, step) {
  if (stepType === 'on-it') return 'Acknowledged — system behavior unchanged'
  if (stepType === 'stand-down') return 'Released ownership'
  if (stepType === 'ignored') {
    return `${step.tag || 'no tag'} · auto-shutoff suppressed (irreversible)`
  }
  return null
}

/**
 * incident.steps -> EventsTimelineCard `events` rows.
 *
 * Newest first, which is v1's locked order. Each field lands in a slot the card
 * already draws, so the card needs no change:
 *   title          the step's own name, with the actor appended on ownership
 *   metrics        flow rate / volume, the card's label+value pairs
 *   description    the step's recorded detail (or the PRD 11 actor sub-line)
 *   timestamp      "08:13 · 4h ago"
 *   notifications  step.recipients — the card counts an array itself and draws
 *                  its "n sent" chip, so the comms steps keep their reach
 */
function stepsToTimelineEvents(steps, isLowFlow) {
  return [...steps].reverse().map((step, i) => {
    const meta = STEP_META[step.type] ?? { title: step.type }
    const title = meta.flowAware ? resolveTitle(step.type, meta.title, isLowFlow) : meta.title
    const metrics = [
      step.flowRate ? { label: 'Flow', value: step.flowRate } : null,
      step.volume ? { label: 'Volume', value: step.volume } : null,
    ].filter(Boolean)
    return {
      /* Index-qualified: two reminders can share a type AND a displayed clock,
         and the card keys its rows on this. */
      id: `${step.type}-${i}`,
      kind: meta.kind ?? 'water',
      title: meta.actor && step.actor ? `${title} · ${step.actor}` : title,
      metrics,
      description: (meta.actor ? actorStepSub(step.type, step) : step.detail) || '',
      /* `timeAgo` already carries its own suffix, and on a RESOLVED incident it
         is a date stamp rather than an elapsed label (generateIncidents.js:138
         uses stamp(), :57 uses agoLabel()) — so it is printed as recorded
         rather than having " ago" appended to it. */
      timestamp: [step.time, step.timeAgo].filter(Boolean).join(' · '),
      notifications: step.recipients ?? null,
    }
  })
}

/* ── Small presentational pieces ─────────────────────────────────────────── */

/* ── "What should I do" ───────────────────────────────────────────────────
   *** NEW COPY. NOTHING IN THE DATASET CARRIES ANY OF IT. FOR SIGN-OFF. ***

   Deliberately kept in ONE place so it is easy to edit in one pass. Rules it
   it follows:
     - imperative, a few short bullets, never a paragraph;
     - no restated figures (they are on the AlertCard) and no system name;
     - every step is something this product can actually do or something
       plainly true of the hardware. There is no support route and nothing
       dispatches an engineer in this app, so neither is suggested.

   The valve bullet is conditional on the system HAVING a valve, and the
   auto-shutoff bullet is derived from the real policy (getActivePolicy), not
   asserted — `autoShutoff` is 'Enabled' | 'Disabled' | 'N/A'.

   OVERLAP, reported rather than hidden: the auto-shutoff bullet and "What
   happens next" are two readings of the same policy fact — one as an
   instruction, one as a statement. They are one section apart. If the owner
   finds that redundant the two sections should merge into one "What now",
   rather than both being trimmed. */
function advice(type, { hasValve, autoShutoff }) {
  const valveLine = hasValve
    ? autoShutoff === 'Enabled'
      ? 'Auto shut-off will close the valve by itself at the shut-off level — closing it now only brings that forward.'
      : 'Nothing will close the valve for you. If this needs stopping, close it from the button below.'
    : 'This system is metering-only, so the water cannot be shut off from the app.'

  switch (type) {
    case 'leak-high':
      return [
        valveLine,
        'Check the big outlets first: risers, tank fills, irrigation lines.',
        'Tap On it so nobody else drives out for the same event.',
      ]
    case 'leak-low':
      return [
        'Look for something that never stops — a running toilet, a dripping fitting, a float valve not seating.',
        valveLine,
        'If this flow is known and expected, Ignore it so it stops alerting.',
      ]
    case 'offline':
    case 'comm':
      return [
        'Check power and the network at the device before treating it as broken.',
        'Until it reports again nothing is detected here and the valve cannot be operated from the app.',
      ]
    case 'valve-error':
      return [
        'Do not rely on automatic shut-off until the valve has been checked.',
        'Have the valve operated by hand on site to see whether it actually moves.',
      ]
    case 'power-lost':
      return [
        'Check the mains supply and the breaker feeding the device.',
        'Restore power before the backup runs out, or the system stops reporting.',
      ]
    case 'battery-low':
    case 'battery-critical':
      return [
        'Replace the battery — detection stops when it is empty.',
        'Until then the system still reports, so this is not urgent today.',
      ]
    default:
      return []
  }
}

/* The series' one colour, from the design tokens. ChartStyle turns this into
   `--color-lph`, which the <Line> reads. */
const FLOW_CHART_CONFIG = {
  lph: { label: 'Flow rate', color: 'var(--primary)' },
}

/**
 * "Event graph" — a flow-rate LINE chart, from the design system.
 *
 * Owner, 2026-10-17: "the graph shall be a cool flow rate line chart from the
 * design system." So it is `ChartContainer` (src/components/ui/chart.jsx, the
 * shadcn primitive that wraps recharts with the project's theming) driving a
 * recharts <LineChart> — the same construction WaterConsumptionCardV2 uses for
 * its bars, at a size that fits a collapsed section. WaterConsumptionCardV2
 * itself was NOT mounted here: it is a full card with its own header, period
 * control, month picker, compare toggle and drill-down, all of which would
 * bring a second set of controls into a section that answers one question.
 *
 * WHAT IT PLOTS and why the units are honest: see eventFlowSeries.js. In
 * short — one bucket per hour, so litres-per-bucket already IS L/hour.
 *
 * An empty window draws the empty state, never a flat line at zero.
 */
function EventFlowChart({ points, peak }) {
  if (!points.length) {
    return (
      <p className="text-[13px] text-slate-500">
        No readings for this window yet, so there is no flow-rate line to draw.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex items-baseline gap-[6px]">
        <span className="text-[18px] font-bold tracking-[-0.4px] text-slate-900">
          {peak?.toLocaleString?.() ?? peak}
        </span>
        <span className="text-[12px] font-medium text-slate-500">L/h peak today</span>
      </div>
      {/* aspect-auto cancels ChartContainer's aspect-video — the phone frame
          needs an explicit height, never a fixed width. */}
      <ChartContainer
        config={FLOW_CHART_CONFIG}
        className="aspect-auto h-[150px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-[#737373]"
      >
        <LineChart data={points} margin={{ top: 4, right: 6, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#e5e5e5" />
          <YAxis
            dataKey="lph"
            width={38}
            tickLine={false}
            axisLine={false}
            tickSize={0}
            tickMargin={8}
            tick={{ fontFamily: 'var(--font-sans)', fontSize: 11 }}
          />
          <XAxis
            dataKey="hour"
            height={22}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            interval={5}
            tick={{ fontFamily: 'var(--font-sans)', fontSize: 11 }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="lph"
            stroke="var(--color-lph)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
      <p className="text-[11.5px] text-slate-500 leading-[1.4]">
        {/* Say what the line is. It is the system's measured hourly use for
            today read as flow rate, not a separate trace of this incident. */}
        This system&rsquo;s measured use today, hour by hour, read as flow rate.
      </p>
    </div>
  )
}

function Fact({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex min-w-0 flex-col gap-[2px]">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <span className="min-w-0 truncate text-[14px] font-semibold text-slate-900">{value}</span>
    </div>
  )
}

/**
 * A collapsible section — chevron on the right, collapsed unless `defaultOpen`.
 *
 * There is no accordion in src/components/ui/, so this is composed from a
 * shadcn <Button> header plus a panel rather than a hand-rolled div: the header
 * is a real button with real `aria-expanded` / `aria-controls`, and the panel
 * carries the matching id and points back at the header with aria-labelledby.
 * InfoAccordion builds its sections the same way.
 *
 * The panel STAYS MOUNTED and is hidden with the `hidden` attribute rather than
 * unmounted. Two reasons: aria-controls must reference an element that exists,
 * and a collapsed section that drops its content out of the DOM would silently
 * drop the event id and the recipients out of find-in-page and out of any
 * assistive-tech scan of the surface.
 */
function Section({ id, title, meta, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const headerId = `${id}-header`
  const panelId = `${id}-panel`
  return (
    <section className={`${CARD_SHELL} overflow-hidden`}>
      <Button
        type="button"
        variant="ghost"
        id={headerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(v => !v)}
        /* The compact end of the house spacing scale. EventsTimelineCard's
           header is px-[20px] py-[12px] on a 62px row and ActivePolicyCard is
           p-[18px]; six rows at that size ate half a sheet that is already
           capped at 85%, so these take the 16/10 step instead. */
        className="h-auto w-full justify-between rounded-none px-[16px] py-[10px] text-[14px] font-semibold text-slate-900 hover:bg-slate-100 hover:text-slate-900"
      >
        <span className="min-w-0 truncate">{title}</span>
        <span className="flex shrink-0 items-center gap-[6px] text-slate-500">
          {meta ? <span className="text-[12px] font-medium">{meta}</span> : null}
          <ChevronDown
            size={16}
            className={open ? 'rotate-180 transition-transform' : 'transition-transform'}
          />
        </span>
      </Button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        hidden={!open}
        className="px-[16px] pb-[14px]"
      >
        {/* A FUNCTION child is rendered only while the section is open. One
            section needs that: a recharts chart measured inside a `hidden`
            panel resolves to 0x0 and logs "The width(0) and height(0) of chart
            should be greater than 0" on every mount. Everything else passes
            plain children and stays mounted — see the note above. */}
        {typeof children === 'function' ? (open ? children() : null) : children}
      </div>
    </section>
  )
}

/* LeakDetail.jsx:486-504 / ErrorAlertDetail.jsx:146-167 — one row per
   recipient: initials disc, name, the channels it went out on. */
function RecipientList({ recipients }) {
  if (!recipients?.length) {
    return <p className="text-[13px] text-slate-500">No recipients recorded for this event.</p>
  }
  return (
    <ul className="flex flex-col">
      {recipients.map((r, i) => (
        <li key={`${r.name}-${i}`}>
          {i > 0 ? <Separator className="my-[2px]" /> : null}
          <div className="flex items-center gap-[8px] py-[6px]">
            <span
              aria-hidden="true"
              className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
            >
              {initialsFor(r.name)}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-slate-900">
              {r.name}
            </span>
            <span className="flex shrink-0 gap-[4px]">
              {(r.channels ?? []).map(ch => (
                <Badge
                  key={ch}
                  variant="secondary"
                  className="border-transparent bg-accent px-[6px] py-0 text-[11px] font-semibold text-primary"
                >
                  {CHANNEL_LABEL[ch] || ch}
                </Badge>
              ))}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * "Find this system" — the owner's "help me find the system", as they specified
 * it: the device photo, where it is, what it is, and the pictures and notes a
 * user has saved against this system.
 *
 * Nothing here is invented. The photo is the repo's own product shot (the same
 * file SystemTypeCard draws). The specs come from getSystemSpecs, which derives
 * a device family / valve model / meter model / environment per system id. The
 * install date comes from getSystemInfo and is simply ABSENT on every live
 * system today (SYSTEMS_INFO_MAP's keys do not overlap the real ids), so it is
 * conditional rather than filled in. Pictures and notes are read and written
 * through locationInfoStore under the SAME scope id InfoAccordion uses, so this
 * section and the System page's Info section are one store, not two.
 */
function FindSystemPanel({ sys, sysId }) {
  const info = getSystemInfo(sysId)
  const specs = getSystemSpecs(sysId)
  const fileInputRef = useRef(null)
  const [pictures, setPictures] = useState(() => getPictures(sysId))
  const [notes, setNotesState] = useState(() => getNotesOverride(sysId) ?? '')

  const where = [sys.l4Name, sys.l3Name, sys.l2Name].filter(Boolean).join(' · ')

  const rows = [
    { label: 'Device', value: specs?.deviceFamily },
    { label: 'Valve', value: sys.valve ? specs?.valveModel : 'None — metering only' },
    { label: 'Meter', value: specs?.meterModel },
    { label: 'Monitors', value: specs?.monitoredEnvironment },
    { label: 'Serial', value: sys.upstream?.waterSystemId },
    /* Null on every live system today — see the component note. */
    { label: 'Installed', value: info?.installDate },
  ].filter(r => r.value)

  const handleFiles = e => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    for (const file of files) {
      const reader = new FileReader()
      reader.onload = () => {
        addPicture(sysId, String(reader.result))
        setPictures(getPictures(sysId))
      }
      reader.readAsDataURL(file)
    }
  }

  const drop = id => {
    removePicture(sysId, id)
    setPictures(getPictures(sysId))
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex items-center gap-[12px]">
        <img
          src={vmaFront}
          alt="Wint device, front view"
          className="size-[64px] shrink-0 rounded-[12px] bg-slate-100 object-contain"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="min-w-0 truncate text-[14px] font-semibold text-slate-900">
            {sys.name}
          </span>
          {where ? (
            <span className="flex min-w-0 items-center gap-[4px] text-[12px] text-slate-600">
              <MapPin size={12} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 truncate">{where}</span>
            </span>
          ) : null}
          {sys.locationAddress ? (
            <span className="min-w-0 truncate text-[12px] text-slate-500">
              {sys.locationAddress}
            </span>
          ) : null}
        </div>
      </div>

      {rows.length ? (
        <div className="grid grid-cols-2 gap-x-[12px] gap-y-[10px]">
          {rows.map(r => (
            <Fact key={r.label} label={r.label} value={r.value} />
          ))}
        </div>
      ) : null}

      <Separator />

      <div className="flex flex-col gap-[8px]">
        <span className="text-[11px] font-bold uppercase tracking-[0.4px] text-slate-500">
          Site pictures
        </span>
        {pictures.length === 0 ? (
          <p className="text-[13px] text-slate-500">
            No pictures saved for this system yet.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-[6px]">
            {pictures.map((p, i) => (
              <div
                key={p.id}
                className="relative aspect-square overflow-hidden rounded-[8px] bg-slate-100"
              >
                <img src={p.dataUrl} alt={`Site picture ${i + 1}`} className="block size-full object-cover" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => drop(p.id)}
                  aria-label={`Remove picture ${i + 1}`}
                  className="absolute right-[4px] top-[4px] rounded-full bg-foreground/70 text-primary-foreground hover:bg-foreground/85 hover:text-primary-foreground"
                >
                  <X size={12} aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {/* Same mechanism InfoAccordion uses: a hidden file input driven by a
            real shadcn Button, so the control is focusable and labelled. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="hidden"
          data-testid="event-focus-picture-input"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="h-[36px] w-full text-[13px] font-semibold"
        >
          <ImagePlus size={14} aria-hidden="true" />
          Add picture
        </Button>
      </div>

      <div className="flex flex-col gap-[8px]">
        <label
          htmlFor={`event-focus-notes-${sysId}`}
          className="text-[11px] font-bold uppercase tracking-[0.4px] text-slate-500"
        >
          Notes
        </label>
        {/* No <textarea> in src/components/ui/, so this is the bare element with
            the shadcn <Input> field classes rather than a second button style. */}
        <textarea
          id={`event-focus-notes-${sysId}`}
          value={notes}
          onChange={e => {
            setNotesState(e.target.value)
            setNotes(sysId, e.target.value)
          }}
          rows={3}
          placeholder="Where to find it, access notes, who to call on site…"
          className="w-full resize-y rounded-[10px] border border-solid border-slate-200 bg-card px-[10px] py-[8px] text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>
    </div>
  )
}

/* ── The overlay ─────────────────────────────────────────────────────────── */

/**
 * @param {object}   props
 * @param {boolean}  props.open        Nothing renders when false.
 * @param {string}   [props.systemId]  Falls back to `system.id`.
 * @param {object}   [props.system]    The system record; looked up by id if omitted.
 * @param {object}   [props.alert]     The event; falls back to `system.alert`.
 * @param {Function} props.onClose     Back, ×  and Escape all call this. They are
 *   separate controls with separate names ("Back", "Close") because the owner
 *   asked for both; they are the same ACTION today because this overlay has one
 *   level — it opens from a row and closes back onto the page it opened over,
 *   so "back" and "dismiss" land in the same place. They would diverge the
 *   moment this surface pushes a second level inside itself (a recipient
 *   detail, a step detail): back would pop that level and × would still close
 *   the whole overlay. Keep them separate so that change is a handler swap.
 * @param {Function} [props.onIgnore]  (systemId) => void. THE SEAM for the
 *   one-question feedback flow (WaterEventFeedbackSheet) that replaces the tag
 *   taxonomy. This overlay deliberately does NOT write to ignoredIncidents and
 *   does not import the sheet — it hands the intent to the page, which owns the
 *   flow and the commit. Omit the prop and the Ignore button is not rendered at
 *   all, because a button with no destination is worse than a missing one.
 *   NOTE FOR CALLERS: that is also why Ignore can look "missing" next to Stand
 *   down. The gating here offers Ignore on every live water event, claimed or
 *   not; a mount that does not pass `onIgnore` gets no Ignore button.
 * @param {Function} [props.onClaim]   (systemId) => void, after the claim is written.
 * @param {Function} [props.onStandDown] (systemId) => void, after the release is written.
 * @param {object}   [props.valve]     THE VALVE SEAM — see VALVE in the header.
 *   `{ state: 'open'|'closed', onIntent: (action: 'open'|'close') => void }`.
 *   The PAGE owns the valve's state of record; this overlay owns only the
 *   confirmation. `onIntent` fires AFTER the user confirmed in
 *   ValveConfirmSheet, so COMMIT it — do not re-confirm it, or a second sheet
 *   stacks on this one. `state`, when given, always wins over anything this
 *   overlay knows. The valve card and the valve action are drawn whenever the
 *   SYSTEM has a valve, with or without this prop; a metering-only system
 *   draws neither.
 */
export default function EventFocusOverlay({
  open,
  systemId,
  system,
  alert,
  onClose,
  onIgnore,
  onClaim,
  onStandDown,
  valve,
}) {
  /* The stores are module-level and localStorage-backed, so a write does not
     re-render anything by itself. This is the repaint request, same device the
     System page uses (`bump`) and v1 uses (`forceTick`). */
  const [, bump] = useState(0)
  const repaint = () => bump(n => n + 1)

  /* The "On it" elapsed time is STATE, not a Date.now() read during render.
     Two reasons: React's purity rule forbids the latter (react-hooks/purity
     flags it, and v1's LeakDetail.jsx:379 is exactly the call it means), and an
     elapsed time that only advances when something else happens to repaint is
     wrong anyway. Seeded in the lazy initialiser, advanced by a 30s tick while
     the overlay is open, and re-read in the "On it" handler so a fresh claim
     reads 0s rather than the age of this mount. The readout is minute-grained,
     so a faster tick buys nothing. */
  /* WHICH CONFIRMATION IS OPEN — 'close' | 'open' | null. This is the same
     variable the page calls `valveIntent`; it is the sheet's visibility, not
     the valve's state. */
  const [pendingValve, setPendingValve] = useState(null)
  /* The valve action this overlay has already CONFIRMED, for a mount that
     passes no `valve.state` to override it. Read last of the three — see STATE
     PRECEDENCE in the header. Delete once both pages pass `valve`. */
  const [confirmedValve, setConfirmedValve] = useState(null)

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [open])

  /* Escape dismisses. Radix gave this for free; an in-frame overlay has to say
     so itself — ValveConfirmSheet.jsx carries the same effect, which is why
     this one stands down while that sheet is open: otherwise one Escape would
     cancel the confirmation AND close the event behind it. */
  useEffect(() => {
    if (!open || pendingValve) return
    const onKey = e => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, pendingValve])

  const sys = system ?? (systemId ? getSystemById(systemId) : null)
  const sysId = systemId ?? sys?.id ?? null
  const evt = alert ?? sys?.alert ?? null

  if (!open || !sys || !evt) return null

  const isWater = evt.type === 'leak-high' || evt.type === 'leak-low'
  const incident = isWater ? getActiveIncident(sysId) : null
  const steps = incident?.steps ?? []
  const isLowFlow = evt.type === 'leak-low' || sys.leak === 'low' || incident?.type === 'leak-low'
  /* Not memoised. An incident carries 3-5 steps, so the map is cheaper than the
     dependency array it would need — and `steps` is a fresh array identity on
     every read of the store, which makes a useMemo here a no-op the React
     compiler correctly refuses to preserve. */
  const timelineEvents = stepsToTimelineEvents(steps, isLowFlow)

  const titleId = `event-focus-title-${sysId}`

  /* Read-through on every render: the stores have no in-memory cache to drift. */
  /* Ignore is a water-event concept, so a fault never reads as ignored even if
     the system carries an ignore from an earlier water event. */
  const ignored = isWater && isIgnored(sysId)
  const ignoredInfo = getIgnoredInfo(sysId)
  const investigating = isInvestigating(sysId)
  const investigatingInfo = getInvestigatingInfo(sysId)
  const me = getCurrentActor()
  /* LeakDetail.jsx:362 — Stand down is offered ONLY to the actor who claimed
     it. Someone else's claim is theirs to release. PRD 04a:68-74. */
  const isOwner = Boolean(investigating && investigatingInfo && investigatingInfo.actor === me)

  const notification = isWater ? getNotification(incident) : null
  const leakState = getLeakState(incident)
  const policy = getActivePolicy(sysId)
  /* One reading of the policy for every place that states it. `autoShutoff`
     is 'Enabled' | 'Disabled' | 'N/A', and only 'Enabled' means the system
     shuts itself off. */
  const autoShutoffOn = policy?.autoShutoff === 'Enabled'

  const meta =
    ALERT_META[evt.type] ??
    { label: evt.label || 'Alert', severity: 'Warning', sevColor: TOKEN.low }
  const FaultIcon = FAULT_ICON[evt.type] ?? PowerOff

  const eventId = isWater
    ? toLeakId(incident)
    : deterministicId(sysId + evt.type, ID_PREFIX[evt.type] || 'evt')

  /* The summary card — the System page's own AlertCard, from the same row. */
  const alertRow = alertRowFor(evt, sysId)

  /* VALVE. The system's devices, filtered on `d.valve`, exactly as
     SystemPageV2Screen does it. The enriched page object already carries
     `devices`; a raw record from getSystemById does not, so it is derived with
     the same helper the page uses (getSystemUnits). */
  const valveDevices = (sys.devices ?? getSystemUnits(sys)).filter(d => d.valve)
  const hasValve = valveDevices.length > 0
  /* "open unless every valve is closed", the page's rule. */
  const derivedValveState = hasValve && valveDevices.every(d => d.valve === 'closed')
    ? 'closed'
    : 'open'
  /* STATE PRECEDENCE: the page, then what was confirmed here, then the data.
     `??` and not `||`, so a page that legitimately says 'open' is not skipped. */
  const valveState = valve?.state ?? confirmedValve ?? derivedValveState
  /* The card speaks state ('open'|'closed'); the sheet speaks intent
     ('open'|'close'). The translation is the one the page makes at
     SystemPageV2Screen.jsx:1105. */
  const valveAction = valveState === 'closed' ? 'open' : 'close'
  const valveActionLabel = valveState === 'closed' ? 'Open valve' : 'Close valve'

  /* The ONLY place a valve change is committed from, and only ever after the
     sheet's confirm. The page is told; this overlay remembers it solely so a
     mount that owns no valve state still shows the user what they just did. */
  const commitValve = () => {
    const action = pendingValve
    setPendingValve(null)
    if (!action) return
    setConfirmedValve(action === 'close' ? 'closed' : 'open')
    valve?.onIntent?.(action)
  }

  const breadcrumb = [sys.l4Name, sys.l3Name].filter(Boolean).join(' · ')

  /* "Event graph". Hourly granularity, offset 0 — the day the event is running
     on, one bucket per hour, which is what makes litres and L/hour the same
     number (eventFlowSeries.js). Read on every render rather than memoised:
     getConsumption memoises per system id upstream, so this is a map over 24
     points, and a dependency array here would be the more expensive half. */
  const flowPoints = toFlowRateSeries(
    getConsumptionSeries(sysId, sys.name, 'H', 0)?.series ?? [],
  )
  const flowPeak = peakFlowRate(flowPoints)

  const adviceSteps = advice(evt.type, {
    hasValve,
    autoShutoff: policy?.autoShutoff,
  })

  const recipients = isWater
    ? (notification?.recipients ?? []).map(name => ({
        name,
        channels: notification?.channels ?? [],
      }))
    : /* v1 used a hand-written defaultRecipients() keyed on account ids
         ('sc', 'ha', 'tidhar', …) that no longer exist in the upstream dataset,
         so every fault in v1 reports the fallback "On-call". The system's own
         contacts are the honest source; the channel split mirrors
         generateIncidents.js:68-71. */
      (sys.contacts ?? []).map((c, i) => ({ name: c.name, channels: [i === 0 ? 'push' : 'email'] }))

  const claim = () => {
    /* PRD 04a:158 — "always a person name, never a role". Called without an
       actor the store defaults to the literal 'You' and every other recipient
       reads "On it · You". */
    if (!isInvestigating(sysId)) startInvestigating(sysId, { actor: getCurrentActor() })
    repaint()
    onClaim?.(sysId)
  }

  const standDown = () => {
    stopInvestigating(sysId)
    repaint()
    onStandDown?.(sysId)
  }

  /* ── What the footer offers, and to whom ──────────────────────────────────
     A FAULT has no water-event actions at all and no valve action either:
     v1's ErrorAlertDetail offers neither, and offering Ignore there was the v2
     bug this surface replaces. No footer.

     Ignore is NOT gated on `investigating`: the spec is that Ignore and On it
     are water-only, and that a claim replaces On it with Stand down while
     Ignore REMAINS. So a claimed event's footer reads [Stand down] [Ignore].

     AN IGNORED EVENT KEEPS ITS VALVE ACTION. *** DELIBERATE DEPARTURE from how
     PRD 04a:146-154 (locked 2026-06-15) has been read here — flagged for the
     owner, and one line to revert. *** That clause says an ignored event draws
     no action row, and it was written about the Ignore / On it row, which is
     what v1's screen drew there; the valve was never in that footer. Ignoring
     a water event means "stop alerting me about this". It does not mean the
     person looking at it may no longer shut the water off, and taking the
     shutoff away from them is a safety regression rather than a spec
     requirement. So on an ignored event: valve primary YES, Ignore NO (it is
     irreversible and already done — PRD 14 has no un-ignore), On it / Stand
     down NO. The muted body and the "Ignored by {name}" pill are unchanged. */
  const showClaimActions = isWater && !ignored
  const showIgnore = isWater && !ignored && Boolean(onIgnore)
  const showValveAction = isWater && hasValve
  const showFooter =
    showValveAction || (showClaimActions && (!investigating || isOwner)) || showIgnore

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Scrim — the page stays visible above the sheet, which is the whole
          point of the 2026-10-17 chrome change. Tapping it dismisses, same as
          ×. Its own accessible name, so the two do not collide (the pattern
          SystemsFilterSheet.jsx:99 sets). */}
      <button
        type="button"
        aria-label="Close event"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[rgba(15,23,43,0.45)]"
      />

      {/* The panel. `relative` so it paints over the scrim, `max-h-[85%]` so
          the page shows above it, and the top corners rounded like every other
          sheet in this repo. */}
      <div className="relative flex max-h-[85%] flex-col overflow-hidden rounded-t-[18px] bg-background">
      {/* Header — the event, the system it is on, and BOTH ways out the owner
          asked for. They carry distinct names so a screen reader (and a test)
          can tell them apart; see the `onClose` prop note for when they would
          diverge. */}
      <header className="flex shrink-0 items-center gap-[8px] border-b border-solid border-slate-200 bg-surface-card px-[10px] py-[7px]">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Back"
          onClick={onClose}
          className="shrink-0 text-slate-900 hover:bg-slate-100 hover:text-slate-900"
        >
          <ArrowLeft size={18} />
        </Button>

        {/* IDENTITY ONLY. The event's own title, its glyph and its status pill
            are on the AlertCard immediately below, and the header used to
            repeat all three verbatim — "the title is rendered twice", and on a
            sheet capped at 85% of 852 that duplication cost a whole row. The
            header is now WHICH SYSTEM, which is the one thing the card does
            not say; the severity dot stays because it is 9px and it is what
            makes the sheet readable the instant it opens. */}
        <span
          aria-hidden="true"
          className="size-[9px] shrink-0 rounded-full"
          style={{ background: isWater ? (isLowFlow ? TOKEN.low : TOKEN.high) : meta.sevColor }}
        />
        {/* Owner's call, 2026-10-18: the location belongs under the system
            name. "Apartment 5" alone does not say which building, and the
            breadcrumb was previously buried inside the Event-details
            accordion — one tap away from the one question the header is
            there to answer. It is removed from that grid rather than
            duplicated. */}
        <div className="flex min-w-0 flex-1 flex-col">
          <h2
            id={titleId}
            className="min-w-0 truncate text-[15px] font-semibold leading-tight tracking-[-0.2px] text-slate-900"
          >
            {/* The dialog's accessible name still has to say WHAT this is,
                which the visible header no longer repeats. sr-only is
                position:absolute so it costs no layout inside the truncate. */}
            <span className="sr-only">{evt.label || meta.label} — </span>
            {sys.name}
          </h2>
          {breadcrumb ? (
            <p className="min-w-0 truncate text-[12px] leading-tight text-slate-500">{breadcrumb}</p>
          ) : null}
        </div>

        {/* NO "View System" link here. One was added on 2026-10-17 (v1's
            LeakDetail.jsx:207-210 had one) and the owner removed it on sight
            the same day, along with the `hideViewSystem` prop that suppressed
            it. Do not re-add either without asking: the header is Back · title
            + system · Close, and nothing else. */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          onClick={onClose}
          className="shrink-0 text-slate-900 hover:bg-slate-100 hover:text-slate-900"
        >
          <X size={18} />
        </Button>
      </header>

      {/* Body — the one scrolling region. The header and the footer are
          shrink-0, so the actions stay reachable however long the body runs.
          LeakDetail.jsx:245: when the event is ignored the body is muted,
          "treat as completed, nothing actionable" (alerts-mockup-feedback #4). */}
      <div
        className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto px-[12px] pb-[12px] pt-[10px] transition-opacity duration-200"
        style={{ opacity: ignored ? 0.7 : 1 }}
        data-ignored={ignored ? 'true' : 'false'}
      >
        {/* ── The event summary ─────────────────────────────────────────────
            The System page's card (198374:72716), mounted from the same row
            shape and with the same variant rule it uses.
            `actions={false}` is the ONE deviation from that mount, and it is
            deliberate: the page's card is the only place to act from, whereas
            this surface already carries the full action row in its footer —
            with the Stand-down gating AlertCard cannot express. Drawing both
            would put two "Ignore" buttons on one 393px screen.
            `w-full!` because AlertCard's `ignored` shell is Figma's fixed
            w-[308px]; every other card here is w-full and the owner has twice
            asked that one screen's cards measure the same.
            `shrink-0` because that same shell is a FIXED `h-[136px]` with no
            shrink class of its own: inside this flex column it was shrunk below
            its content and the ignored card's text drew on top of the block
            under it. (The `mobile` shell is min-h-[178px] and never had the
            bug; the class is carried on both so the two cannot diverge.) */}
        {alertRow ? (
          <AlertCard
            variant={alertRow.ignored ? 'ignored' : 'mobile'}
            event={alertRow}
            actions={false}
            className="w-full! shrink-0"
          />
        ) : null}

        {/* NO explanatory sentence here. One existed ("Flow that never stops
            usually means a slow leak." and a line per event type); the owner
            cut it twice and then removed it outright on 2026-10-17 — so the
            SLOT was the problem, not the wording. Its generator and copy table
            are gone with it, so there is nothing left to drift. Interpretation
            that is genuinely useful belongs in "What should I do", and only as
            a step somebody can act on. Do not reintroduce this. */}

        {/* ── Ignored banner ────────────────────────────────────────────────
            LeakDetail.jsx:305-319. AlertCard's `ignored` variant mutes the card
            and shows an "Ignored" pill but carries neither the actor nor the
            reason, which is what PRD 04a:146-154 is actually about. Copy rule
            (2026-06-02): two lines max. No "auto-shutoff suppressed" line —
            that was the confirmation-time warning, not a status. */}
        {isWater && ignored ? (
          <div className="flex w-full shrink-0 items-start gap-[8px] rounded-[10px] bg-orange-100 px-[12px] py-[10px] text-[13px] text-slate-900">
            <Flag size={16} className="mt-[1px] shrink-0" style={{ color: TOKEN.low }} />
            <div className="min-w-0">
              <p className="min-w-0 font-bold">Ignored by {ignoredInfo?.ignoredBy || 'You'}</p>
              {ignoredInfo?.tag ? <p className="min-w-0 text-slate-600">{ignoredInfo.tag}</p> : null}
            </div>
          </div>
        ) : null}

        {/* ── Claimed strip ─────────────────────────────────────────────────
            LeakDetail.jsx:372-381 — "On it · {actor}" and how long they have
            had it. Nothing else in v2 draws this. Only present once someone
            holds the claim; the offer to claim is the footer's primary. */}
        {isWater && investigating && investigatingInfo ? (
          <div className="flex w-full shrink-0 items-center gap-[9px] rounded-[18px] bg-accent px-[14px] py-[12px]">
            <span
              aria-hidden="true"
              className="flex size-[28px] shrink-0 items-center justify-center rounded-[8px] bg-card text-primary"
            >
              <Eye size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="min-w-0 truncate text-[14px] font-semibold text-slate-900">
                On it · {investigatingInfo.actor}
              </p>
              <p className="min-w-0 truncate text-[12px] text-slate-600">
                {formatDuration(
                  Math.max(0, Math.floor((now - investigatingInfo.startedAt) / 1000)),
                )}{' '}
                ago
              </p>
            </div>
          </div>
        ) : null}

        {/* ── Valve status ──────────────────────────────────────────────────
            The real ValveStatusCard, not a copy of it. This used to be a
            hand-rolled compact row (ValveReadout) built from the card's atoms
            as they stood in 2026-09; when the card was rebuilt against Figma
            199383:141553 the copy silently went stale, and the owner spotted
            it — "valve widget not as in figma". Composing the component means
            the two cannot drift again.

            READ-ONLY on purpose. Owner, 2026-10-17: "now we have 2 valve CTA"
            — this card's own action duplicated the footer's primary, which is
            why it was swapped for a hand copy in the first place. It is
            mounted with interactive={false}, so the face is the design's and
            the only valve control on this surface is still the footer's. */}
        {hasValve ? (
          /* The landmark came from the hand copy this replaced and is kept:
             the state is a named region a screen reader can jump to, which the
             card's own plain <div> would have silently removed. */
          <section aria-label="Valve status" className="w-full shrink-0">
            {/* The strip's HEADLINE was switched on the policy while its
                SENTENCE was left at the card's default, so a system with
                auto shut-off disabled read "Valve handling: Manual only — In
                case a Leak is detected the valve will automatically shut
                off": the panel contradicted its own first line. Both halves
                now come off the same branch. The manual sentence is not new
                copy — it is this file's own `advice()` valve line for
                autoShutoff !== 'Enabled', so the panel and "What now" say the
                same thing in the same words. */}
            <ValveStatusCard
              interactive={false}
              state={valveState}
              tone={isWater ? 'alert' : 'calm'}
              handling={autoShutoffOn ? 'Auto shut-off' : 'Manual only'}
              handlingDescription={
                autoShutoffOn
                  ? 'In case a Leak is detected — the valve will automatically shut off'
                  : 'Nothing will close the valve for you. If this needs stopping, close it from the button below.'
              }
            />
          </section>
        ) : null}

        {/* ── Sections ──────────────────────────────────────────────────────
            Collapsed by default except the facts on a fault, which has no
            incident timeline below to read instead (v1's ErrorAlertDetail has
            none either). */}
        {/* THE FOUR-FACT STRIP IS GONE, 2026-10-21, at the owner's request.
            It had been promoted out of the accordion on 2026-10-18 on the
            grounds that State / Flow level / Auto-shutoff / Detection ARE the
            event; three of the four turned out to be said already, directly
            above it:
              State        the alert card's status pill ("Ongoing")
              Flow level   the event's own title ("High Flow Water Event")
              Auto-shutoff the valve handling panel, in a full sentence
            So the strip was mostly restating its neighbours.
            DETECTION is the one thing that went with it and is now stated
            nowhere on this surface — flagged to the owner rather than quietly
            re-homed, since where it belongs is a design question. */}

        {!isWater ? (
        <Section id={`event-facts-${sysId}`} title="Event details" defaultOpen>
          <div className="grid grid-cols-2 gap-x-[12px] gap-y-[10px]">
            {isWater ? (
              <>
                {/* getLeakState: Warning | Ongoing | ShutOff. Only rendered when
                    there is an incident to derive it from — v1 defaulted this
                    to 'Warning', which states a severity nothing measured. */}
                <Fact label="State" value={leakState} />
                <Fact label="Flow level" value={isLowFlow ? 'Low flow' : 'High flow'} />
                {/* The policy is the system's, not the event's, so it is
                    labelled as such. v1 mapped autoShutoff through 'On'/'Off',
                    which are not values buildPolicy() ever returns
                    ('Enabled'/'Disabled'/'N/A'), so v1 printed nothing here. */}
                <Fact label="Auto-shutoff" value={policy?.autoShutoff} />
                <Fact label="Detection" value={policy?.detection} />
              </>
            ) : (
              <Fact label="Severity" value={meta.severity} />
            )}
            {/* The location is in the header now, under the system name, so
                it is NOT repeated here. "Detected" is not repeated either —
                AlertCard's meta row above carries the clock this event started
                at. */}
          </div>

          {/* The fault chrome — ErrorAlertDetail.jsx:117-138. */}
          {!isWater ? (
            <div className="mt-[10px] flex flex-wrap items-center gap-[4px]">
              <Badge
                variant="secondary"
                className="border-transparent bg-slate-100 px-[6px] text-[10.5px] font-semibold text-slate-900"
              >
                <FaultIcon size={11} aria-hidden="true" style={{ color: meta.sevColor }} />
                {meta.label}
              </Badge>

              {/* Battery level. ErrorAlertDetail.jsx:117-126 gates on
                  alert.level, and NO generator in this repo sets that field —
                  so this chip is unreachable on today's data and is kept
                  conditional rather than filled with a plausible number. */}
              {evt.level ? (
                <Badge
                  variant="secondary"
                  className="border-transparent bg-slate-100 px-[6px] text-[10.5px] font-semibold text-slate-900"
                >
                  <span
                    aria-hidden="true"
                    className="size-[6px] rounded-full"
                    style={{ background: meta.sevColor }}
                  />
                  {evt.level} remaining
                </Badge>
              ) : null}

              {/* ErrorAlertDetail.jsx:127-132, carried verbatim. NOTE: v1 prints
                  this as a static string; no field records which command failed.
                  It is ported because it is locked copy on this screen, not
                  because there is data behind it. */}
              {evt.type === 'valve-error' ? (
                <Badge
                  variant="secondary"
                  className="border-transparent bg-slate-100 px-[6px] text-[10.5px] font-semibold text-slate-900"
                >
                  Last command: Close · failed
                </Badge>
              ) : null}

              {/* ErrorAlertDetail.jsx:133-138 reads `sys.power === 'battery'`,
                  which can never be true beside a power-lost alert: buildAlert()
                  forces power to 'ac-lost' for exactly that case, so v1's chip
                  is structurally unreachable. Both real values of the SAME field
                  are reported here instead of restating one as the other —
                  'battery' is BATTERY, 'ac-lost' is AC_UNPLUGGED (parity.js:208). */}
              {evt.type === 'power-lost' && (sys.power === 'battery' || sys.power === 'ac-lost') ? (
                <Badge
                  variant="secondary"
                  className="border-transparent bg-slate-100 px-[6px] text-[10.5px] font-semibold text-slate-900"
                >
                  {sys.power === 'battery' ? 'On battery' : 'AC unplugged'}
                </Badge>
              ) : null}
            </div>
          ) : null}

          {/* LeakDetail.jsx:507-512 / ErrorAlertDetail.jsx:169-173. */}
          {eventId ? (
            <div className="mt-[12px] flex items-center gap-[8px]">
              <span className="text-[11px] font-bold uppercase tracking-[0.4px] text-slate-500">
                Event ID
              </span>
              <span className="min-w-0 truncate rounded-[4px] bg-slate-100 px-[8px] py-[2px] font-mono-label text-[13px] font-semibold text-slate-900">
                {eventId}
              </span>
            </div>
          ) : null}
        </Section>
        ) : null}


        {/* ── Event graph ───────────────────────────────────────────────────
            Owner-requested 2026-10-17. Sits with the factual sections, right
            under the facts it charts. See EventFlowChart / eventFlowSeries.js
            for what the line honestly is. */}
        <Section id={`event-graph-${sysId}`} title="Event graph">
          {() => <EventFlowChart points={flowPoints} peak={flowPeak} />}
        </Section>

        {/* ── What should I do ──────────────────────────────────────────────
            Owner-requested 2026-10-17. NEW COPY, FOR SIGN-OFF — all of it
            lives in `advice` above, in one block. Next to "What happens next"
            on purpose: this is the USER's actions, that one is the SYSTEM's.
            Renders nothing for an event type with nothing concrete to say. */}
        {adviceSteps.length ? (
          <Section id={`event-advice-${sysId}`} title="What should I do">
            <ul className="flex list-disc flex-col gap-[8px] pl-[18px] text-[13px] text-slate-600 leading-[1.45]">
              {adviceSteps.map(step => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </Section>
        ) : null}

        {/* "What happens next" lived here and was removed on the owner's
            call, 2026-10-18 — the screen was overwhelming at six accordions.
            Nothing measured is lost: it restated the active policy, and the
            one line of it that changes what you do, Auto-shutoff, is now in
            the always-visible facts strip at the top. The policy in full
            remains on the system page. */}
        <Section
          id={`event-notified-${sysId}`}
          title="Who was notified"
          meta={recipients.length ? `${recipients.length}` : null}
        >
          <RecipientList recipients={recipients} />
        </Section>

        {/* ── "Help me find the system" ─────────────────────────────────────
            The owner's answer to their own question: photo + install notes. */}
        <Section id={`event-find-${sysId}`} title="Find this system">
          <FindSystemPanel sys={sys} sysId={sysId} />
        </Section>

        {/* ── Event timeline ────────────────────────────────────────────────
            THIS INCIDENT's steps (LeakDetail.jsx:407-483), drawn by the card
            the System page already uses. See TIMELINE in the header for the one
            thing the card cannot carry. */}
        {isWater ? (
          <EventsTimelineCard tone="alert" events={timelineEvents} className="shrink-0" />
        ) : null}
      </div>

      {/* ── Action bar ────────────────────────────────────────────────────
          Pinned below the scroller rather than at the end of it, so the
          controls are reachable without scrolling a long timeline first.

          HIERARCHY (owner, 2026-10-17): on a live water event the VALVE is the
          main action — "On it" only tells colleagues somebody is looking,
          closing the valve is what stops the water. So the solid primary is
          Close valve / Open valve, and On it / Stand down / Ignore share the
          secondary row under it. On a system with NO valve there is no valve
          action, so the claim takes the solid slot back and the footer reads
          exactly as it did before. */}
      {showFooter ? (
        <footer className="shrink-0 border-t border-solid border-slate-200 bg-surface-card px-[12px] pb-[12px] pt-[9px]">
          {showValveAction ? (
            <>
              <Button
                type="button"
                onClick={() => setPendingValve(valveAction)}
                className="h-[44px] w-full text-[15px] font-semibold"
              >
                {valveActionLabel}
              </Button>
              <p className="mt-[4px] mb-[6px] text-center text-[11.5px] text-slate-500">
                {valveAction === 'close'
                  ? 'Stops the water · asks you to confirm'
                  : 'Lets water flow again · asks you to confirm'}
              </p>
            </>
          ) : null}

          {/* The secondary row. One line, each control taking an equal share,
              so two or three of them read as peers rather than as a stack of
              primaries. Every gate is the one it always had:
                On it        water-only, while unclaimed
                Stand down   replaces it, and ONLY for the claiming actor
                             (LeakDetail.jsx:393-402) — someone else's claim
                             shows neither
                Ignore       water-only, and it STAYS BESIDE Stand down: a
                             claim replaces On it, it does not withdraw the
                             right to ignore. It is the one control gated on a
                             prop (`onIgnore`) rather than on state, which is
                             the only reason it can ever look "missing". */}
          <div className="flex items-stretch gap-[8px]">
            {showClaimActions && !investigating ? (
              <Button
                type="button"
                variant={showValveAction ? 'secondary' : 'default'}
                onClick={() => {
                  setNow(Date.now())
                  claim()
                }}
                className={
                  showValveAction
                    ? 'h-[44px] flex-1 bg-slate-100 text-[15px] font-semibold text-slate-700 hover:bg-slate-200'
                    : 'h-[44px] flex-1 text-[15px] font-semibold'
                }
              >
                On it
              </Button>
            ) : null}

            {showClaimActions && investigating && isOwner ? (
              <Button
                type="button"
                variant="secondary"
                onClick={standDown}
                className="h-[44px] flex-1 bg-slate-100 text-[15px] font-semibold text-slate-700 hover:bg-slate-200"
              >
                Stand down
              </Button>
            ) : null}

            {showIgnore ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => onIgnore(sysId)}
                className="h-[44px] flex-1 bg-slate-100 text-[15px] font-semibold text-slate-700 hover:bg-slate-200"
              >
                Ignore
              </Button>
            ) : null}
          </div>

          {/* ONE caption in the whole footer. It used to be one per button,
              which on a claimed event was three lines of 11.5px type and most
              of the footer's height on a sheet capped at 85%. The primary's
              caption wins when there is one, because it is the control that
              does something irreversible to the building's water. */}
          {showValveAction ? null : showIgnore ? (
            <p className="mt-[5px] text-center text-[11.5px] text-slate-500">
              Ignore · treat as expected, valve stays open, cannot be undone
            </p>
          ) : showClaimActions && !investigating ? (
            <p className="mt-[5px] text-center text-[11.5px] text-slate-500">
              On it tells the team someone is looking into this
            </p>
          ) : null}
        </footer>
      ) : null}
      </div>

      {/* The confirmation, carrying v1's exact copy. The footer's primary is
          the ONE route to a valve change on this surface, and NOTHING is
          committed until this is confirmed (v1 has always done this:
          ValveControlCard.jsx:420). It is `absolute inset-0` inside this
          overlay, which is itself positioned, so it covers the sheet and the
          scrim without a portal escaping Phone.jsx's frame. */}
      <ValveConfirmSheet
        action={pendingValve}
        valveCount={valveDevices.length}
        onConfirm={commitValve}
        onCancel={() => setPendingValve(null)}
      />
    </div>
  )
}
