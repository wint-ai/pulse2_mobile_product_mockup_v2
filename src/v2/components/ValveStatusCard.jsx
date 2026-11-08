/**
 * Valve status card — v2, System page.
 *
 * SOURCE — the card was REDESIGNED. It is read from the saved emitted code of
 * the two current "System page_mobile" variants rather than re-fetched (Figma
 * MCP reads are metered and a rate-limit refusal reads exactly like a missing
 * node):
 *   sysA  199383:141499  ->  "IOT overview" 199383:141553
 *   sysB  199359:126785  ->  "IOT overview" 199384:143046
 * The two nodes are byte-identical apart from their ids and one gradient angle
 * (see GRADIENT below), so sysA's ids are carried as the canonical ones.
 *
 * WHAT CHANGED FROM THE PREVIOUS NODES (199296:50251 / 199296:50515)
 *   1. THE SWITCH IS GONE. The old card drove the valve from a SwitchToggle
 *      (track 199296:50257 + thumb + glyph). The new node has no switch at
 *      all: the action is a full "Close valve" Button (199383:141566) that
 *      takes the remaining width of the row (`flex-[1_0_0]`).
 *   2. The row is no longer title | value | switch across one line. It is now
 *      a two-column row (`gap-8`, `w-full`): a LEFT STACK (141555, `gap-8`)
 *      holding the title over a value line, and the Button beside it.
 *   3. The value line (141558, `gap-9.75`) leads with the valve glyph
 *      (141559, the 16.497x15.75 "Group") and then the state word at
 *      19.501/29.251 in slate-600 — the glyph moved out of the switch thumb
 *      and became part of the readout.
 *   4. The title is one style now. The old node branched it (calm: 18/18
 *      SemiBold slate-800 tracking -0.45; alert: 12/16 Medium slate-500); the
 *      new node draws Figtree Medium 500, 14/20, `var(--foreground,#0a0a0a)`
 *      in BOTH variants. The 215.5px title box survives unchanged.
 *   5. Card padding is `px-[16px]` + `items-start` (was `px-18` / `pl-18
 *      pr-20`), and the fixed `h-[67px] justify-center` calm height is gone —
 *      the card is content-sized in both states.
 *   6. The handling strip is no longer a red panel. `bg-red/50` is replaced by
 *      the page's own two-layer gradient, and its width is `w-full` rather
 *      than the old fixed 320px. Everything inside it (red/200 disc, 12px
 *      Phosphor warning, SemiBold 14/20 headline, Regular 14/20 body) is
 *      unchanged.
 *
 * GRADIENT — sysA emits 168.92503170733684deg, sysB 168.2758303032674deg for
 * the same strip. Figma re-derives the angle from the layer's bounding box, so
 * this is a measurement artefact rather than two designs; sysA's is used.
 *
 * ASSETS — nothing downloaded; no figma.com asset URL is referenced at
 * runtime. The "Group" (imgGroup, 832ed.svg) is this project's own valve mark:
 * it is the ValveStatus `open` variant scaled by 1.16258, so ValveStatus is
 * reused. The Phosphor warning glyph is inlined below from the export.
 *
 * TONE — the design gives ONE card, and it draws the handling strip. There is
 * no variant without it, so `tone` keeps the only job it can be shown to have:
 * `alert` draws the strip, `calm` omits it. (Reported: with the strip now
 * neutral rather than red, it may be intended on both states — the frames
 * cannot settle it.)
 *
 * WORDING — Figma only ever draws the valve OPEN, so it only ever draws
 * "Close valve". The closed-state action word has no frame; it is derived
 * ("Open valve") the same way the closed state word is, because a button that
 * still says "Close valve" on a shut valve is a dead control. Flagged as the
 * one invented string on this card.
 *
 * STATE — unchanged. There is no shared valve action in this app: the caller
 * owns the value and the confirmation. `onToggle(next)` still fires with
 * 'closed' | 'open', which is what SystemPageV2Screen turns into a
 * ValveConfirmSheet intent. Nothing is persisted here.
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
 *
 * ── 2026-11-03: THE CARD NOW HAS FOUR STATES, NOT TWO ────────────────────
 * It drew open and closed only. `error` and `unknown` both fell through the
 * `isOpen = state === 'open'` branch, so:
 *
 *   · the redraw mount (EventFocusOverlay) drew a FAULTED valve as "Open"
 *     with a live, filled, full-width "Close valve now" primary. On
 *     `ws-10788` — a live low-flow water event on a system whose valve is in
 *     `error`, with auto-shutoff Disabled — the screen offered to stop a leak
 *     with a control that cannot move the valve, and nothing else was going
 *     to close it either.
 *   · the System page mount drew the same valve as "Closed" with an
 *     "Open valve" button, which is the same false statement pointing the
 *     other way.
 *
 * RULE 0 (.claude/skills/v2-page-parity/SKILL.md — working functionality is
 * never removed without the owner's explicit permission) IS SATISFIED, THREE
 * TIMES OVER, and it is written down here rather than argued again later:
 *   1. THE OWNER SUPPLIED THE DESIGN in direct answer to this exact question.
 *      Figma board 199535:96542 draws the error state with the action
 *      rendered unavailable. Disabling it on `error` is the instruction, not
 *      an initiative.
 *   2. THE CONTROL WAS NOT WORKING. `valveScope.js:242` lists 'error' as a
 *      blocker and `canActuate` returns false for it; the valve has already
 *      failed to respond to a command. Nothing that worked stopped working.
 *   3. THE READOUT WAS FALSE. A faulted valve reported as "Open" is not a
 *      scope change to correct; it is a bug fix.
 *
 * ── THE TWO NEW STATES — Figma board 199535:96542 ────────────────────────
 *   199683:25996  ERROR    red glyph · the POSITION word KEPT and muted ·
 *                          the action rendered unavailable (border + label,
 *                          NO fill), the label still reading "Close valve"
 *   199683:25974  UNKNOWN  pale glyph · the word "Unknown" at FULL ink (NOT
 *                          muted, unlike error) · TWO 82px outline actions,
 *                          "Close" and "Open", both live
 *
 * THE ONE DESIGN DECISION WORTH NOT UNDOING: on `error` THE READING SURVIVES.
 * The icon carries the fault and the button carries the unavailability; the
 * word still states where the valve physically is, one step quieter. Do not
 * substitute "Valve error" for it — a card that replaces its reading with its
 * fault has stopped reporting the thing it exists to report.
 *
 * TOKENS, AND WHY NOT THE FRAME'S SLATE STEPS. The frame emits
 * --colors/slate/600 (#45556c), /400 (#90a1b9), /800 (#1d293d) and /900
 * (#0f172b). This repo paints four themes, and a Tailwind colour utility that
 * names a token it does not define falls through to stock Tailwind and then
 * FREEZES in all four — the way at least three invisible-in-dark defects got
 * in. Every step is mapped onto the semantic token that owns the same JOB,
 * and each mapping is justified at the constant that uses it below.
 *
 * ASSETS — nothing downloaded for either state. `ValveStatus.jsx` has drawn
 * five variants since 197639:253443, `error` (red, two-tone) and `unknown`
 * (pale, dashed) among them; they are reused as they stand.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LocationDot } from '@/v2/icons'
import ValveStatus from '@/v2/components/ValveStatus'
import ValveAutoShutoffStrip from '@/v2/components/ValveAutoShutoffStrip'
import { getValveTransition, settleValveCommand } from '@/data/valveCommandStore'

/* ── THE 2026-10-26 REDRAW — 199703:38726 / 199703:41537 ──────────────────
   Two states of one card, and the pair is what makes the layout make sense:

     199703:38726  auto-shutoff ARMED    "Auto-shutoff in" over a 00 : 00 clock
     199703:41537  auto-shutoff DISABLED "Auto-shutoff" over a Disabled badge,
                                         plus a red Attention block

   WHAT MOVED. The auto-shutoff readout used to be a full-width strip UNDER
   the valve state, and the action button sat inline beside the state. Both
   nodes put the state and the auto-shutoff panel SIDE BY SIDE in one
   slate-100 row, and drop the button to its own full-width row underneath.
   That is why this is a separate render rather than more branches inside the
   old one — the element ORDER differs, not just the classes.

   SCOPE: `redraw` only, which today is EventFocusOverlay alone. The System
   page draws the compact inline card (199703:31517 in the page frame: a
   117px box with a 161px button beside the state) and is untouched, which is
   the owner's standing rule that a card's other mounts stay as they are.

   ── 2026-10-29, THE CANONICAL FRAME 199772:145451 (402x1991) ─────────────
   Owner, on a screenshot of this card: "this component is not latest as in
   figma". The valve Section in that frame is 199772:145487 and it is
   complete in the cache (well above the ~100KB truncation). Read against
   this render it gives FOUR content deltas, all applied below —

     199772:145491  heading   14/20 Medium  ->  18/24.75 SemiBold -0.45
     199772:145492  row       content-sized ->  h-[70px]
     199772:145496  panel     gap-[8px]     ->  gap-[2px]
     199772:145508  button    outline       ->  filled (see V2_BTN)

   — and TWO things that look like deltas and are NOT. Every node in that
   frame is named "Water Event View - Auto Shut Off ENABLED", so the frame
   is one variant, and the owner's screenshot is the other:

     · THE RIGHT TILE. The frame draws an "Auto-shutoff in" label over a
       00 : 00 clock. This card ALREADY draws exactly that whenever
       auto-shutoff is on and there is something to count down to
       (`showClock`), and EventFocusOverlay:2020 wires `activatesIn` from
       the event's own auto-close time. The "Disabled" badge is the OTHER
       state of the same slot, which this frame does not show. Not removed.
     · THE ATTENTION BLOCK. The frame goes straight from the row to the
       button. It would: Attention is drawn only when auto-shutoff is OFF
       (`autoCloseOff && showAttention`), and in this frame it is on. 099327a
       collapsed Attention deliberately three days ago. Not removed.

   NOT CHANGED, AND FLAGGED INSTEAD — THE CHASSIS. 199772:145487 draws the
   Section at `rounded-[var(--rounded-3xl,22px)]` with its padding on a
   CardHeader (px-[16px] py-[6px]) and a fixed h-[209px], where this card is
   rounded-[18px] p-[18px] and content-sized. Three reasons it is a question
   rather than an edit: (1) 18px is the HOUSE radius — EventFocusOverlay's
   own CARD_SHELL names SystemTypeCard, ValveStatusCard, ActivePolicyCard,
   InsightsCard and EventsTimelineCard as all drawing it, so moving this one
   to 22 makes it the only card on the surface at a different radius;
   (2) this repo has no --rounded-3xl and no 22px radius token, so the change
   could only be a raw literal, against the tokens-only rule; and (3) in the
   frame that Section is a SHARED component (199772:145477 Assign is the same
   one), so the chassis belongs to the overlay's Section, which another agent
   is mid-edit in. Owner's call. */
const V2_CARD = String.raw`bg-surface-card border border-solid border-card content-stretch flex flex-col gap-[18px] items-start justify-center p-[18px] relative rounded-[18px] shrink-0 w-full max-w-full min-w-0 overflow-hidden`
/* 199772:145490 — gap-[11px], and the frame holds the heading, the row AND
   the button in that one stack, so the row->button gap is 11 too, not 10. */
const V2_COL = String.raw`content-stretch flex flex-col gap-[11px] items-start relative shrink-0 w-full`
const V2_HEAD = String.raw`content-stretch flex flex-col gap-[11px] items-start relative shrink-0 w-full`
/* 199772:145491 — THE HEADING GREW. It was 14/20 Medium on --foreground,
   transcribed from the superseded 199703:38730; the canonical frame draws
   18/24.75 SemiBold slate-800 at -0.45 tracking, which is also the spelling
   every other card title in this repo already uses (AlertCard TITLE_OVERLAY,
   EventsTimelineCard TITLE_FIGMA, SystemTypeCard BODY_TITLE). Not a variant
   difference: the heading is drawn the same in both states. */
const V2_TITLE = String.raw`[word-break:break-word] font-sans font-semibold leading-[24.75px] relative shrink-0 text-slate-800 text-lg tracking-[-0.45px] whitespace-nowrap`
/* 199772:145492 — h-[70px] is the node's. The row was content-sized here
   (38px state box + 9px pads = 56px); the frame fixes 70, which is what the
   panel beside it needs once its own gap drops to 2 (20px label + 24px clock
   + 18px pads = 62). The two numbers are a pair — see V2_PANEL. */
const V2_ROW = String.raw`bg-slate-100 content-stretch flex gap-[8px] h-[70px] items-center justify-center px-[13px] py-[9px] relative rounded-[11px] shrink-0 w-full`
/* 117px and 38px are the node's. `shrink-0` is NOT on it: the panel beside it
   is flex-1 with min-w-px, so at 393px the state box keeps its width and the
   panel takes the remainder, which is the behaviour the fixed width is for. */
const V2_STATE = String.raw`content-stretch flex gap-[6px] h-[38px] items-center relative rounded-[24px] shrink-0 w-[117px]`
/* THE SAME BOX, FLOORED RATHER THAN FIXED — error and unknown only.
   117px fits the node's own words ("Open", "Closed") and clips the two new
   ones: "Unknown" at 24px/-0.6 is about 100px on its own, and the 30px glyph
   plus the 6px gap leave 81. The word is `whitespace-nowrap`, so the overflow
   was silent — the card rendered a valve reading as "Unknowı". `min-w` keeps
   the node's geometry exactly wherever the content fits inside it (open and
   closed are unchanged to the pixel) and lets it grow only where it must; the
   panel beside it is flex-1 with min-w-px and gives the width up. */
const V2_STATE_WIDE = String.raw`content-stretch flex gap-[6px] h-[38px] items-center relative rounded-[24px] shrink-0 min-w-[117px]`
const V2_GLYPH = String.raw`content-stretch flex flex-col items-center justify-center relative shrink-0 size-[30px]`
const V2_GLYPH_BOX = String.raw`h-[20.84px] relative shrink-0 w-[21.831px]`
const V2_VALUE = String.raw`[word-break:break-word] font-sans font-medium leading-6 relative shrink-0 text-2xl text-slate-800 tracking-[-0.6px] whitespace-nowrap`
/* 199772:145496 — gap-[2px], not 8. The label and the figure under it are one
   readout, and 8px read as two stacked things; the frame tightens them and
   takes the height back on the row (V2_ROW's h-[70px]). */
const V2_PANEL = String.raw`bg-slate-100 content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-end justify-center min-w-px px-[13px] py-[9px] relative rounded-[11px]`
const V2_PANEL_ROW = String.raw`content-stretch flex gap-[5px] items-center justify-end relative shrink-0 w-full`
const V2_PANEL_LABEL = String.raw`[word-break:break-word] font-sans font-medium leading-5 min-w-0 truncate relative text-slate-600 text-sm`
/* 199703:39363 — "00", ":", "00" as three runs at gap-3, not one string. The
   colon is its own run in the node and is kept that way so the two figures
   can be addressed (and announced) separately. */
const V2_CLOCK = String.raw`[word-break:break-word] content-stretch flex font-sans font-medium gap-[3px] items-center leading-6 relative shrink-0 text-2xl text-slate-800 tracking-[-0.6px] whitespace-nowrap`
const V2_BADGE = String.raw`bg-surface-card content-stretch flex gap-[4.4px] h-[22px] items-center justify-center overflow-clip px-[6.6px] py-[2.2px] relative rounded-[28.6px] shrink-0`
const V2_BADGE_TEXT = String.raw`[word-break:break-word] font-sans font-medium leading-[17.6px] overflow-hidden relative shrink-0 text-[13.2px] text-slate-700 text-ellipsis whitespace-nowrap`
/* 199703:42035. The node fixes h-[80px] and w-[334px]; 334 is just a 370 card
   minus its 18px padding, so it is w-full here, and the height is a MINIMUM
   because the body is real copy that may run past the node's two lines. */
/* ── 2026-10-29: THE GROUND WAS NOT A TOKEN, AND THAT WAS THE BUG ────────
   This panel was `bg-red-50`, and `--red-50` IS NOT DEFINED ANYWHERE IN
   src/index.css. Tailwind supplies its own built-in red-50 (#fef2f2) when the
   repo defines none, so the class resolved silently and painted a FIXED pale
   pink that no theme could move — while every ink on top of it followed the
   theme. Under `dark` the panel measured 1.05:1 for "Attention" and 1.16:1
   for the sentence under it: the whole warning was invisible, on the one
   state that draws a warning at all. Measured on the live overlay, rasterised
   pixels, with the panel composited over the card behind it.

   THE INK COULD NOT FIX IT. On a ground that never moves there is no ink that
   works in all four, because every ink token goes light under `dark` — the
   best available was 2.64:1. The ground had to become a token.

   --ink-on-color IS THE WRONG TOKEN HERE, and it is worth writing down
   because it is the obvious guess: it is near-white in light/dark/sand, so on
   this pale panel it measures 1.06:1 in THREE themes. It applies to ink on a
   ground that stays dark-and-coloured, not to a pale alert surface.

   --alert-surface-critical is this repo's declared critical alert ground and
   it moves with the theme (:root red-100, `dark` red-400 @10%, `contrast` its
   own pink). index.css:262 marks its light value #ffe2e2 as FIGMA'S OWN alert
   surface, so this is not an invented colour.

   ONE VISIBLE CONSEQUENCE, FLAGGED: in `light` the panel goes #fef2f2 ->
   #ffe2e2, a slightly deeper pink. 199703:42035 drew the paler one. If the
   owner wants that exact pink back it has to come with a token, or the panel
   goes invisible under `dark` again. */
const V2_ATTN = String.raw`bg-alert-surface-critical content-stretch flex flex-col gap-[16px] items-start justify-center px-[13px] py-[9px] relative rounded-[11px] shrink-0 w-full`
const V2_ATTN_INNER = String.raw`content-stretch flex flex-col gap-[4px] items-start justify-center relative shrink-0 w-full`
const V2_ATTN_ROW = String.raw`content-stretch flex gap-[6px] items-center relative shrink-0 w-full`
const V2_ATTN_ICON = String.raw`bg-red-200 content-stretch flex items-center justify-center relative rounded-[20px] shrink-0 size-[16px]`
/* `text-foreground`, not `text-slate-900`. In `light` the two are the same
   byte (index.css:99 `--foreground: var(--slate-900)`), so nothing moves
   there; elsewhere --foreground is the ink declared to oppose the surface,
   while --slate-900 is a ramp step that happens to. Measured on the new
   ground: slate-900 gives 14.63 / 18.42 / 14.35 / 1.20, foreground gives
   14.63 / 18.42 / 16.21 / 3.00 — strictly better in sand and the only one of
   the two that stays legible under `contrast`. */
const V2_ATTN_LABEL = String.raw`[word-break:break-word] font-sans font-semibold leading-5 relative shrink-0 text-foreground text-sm whitespace-nowrap`
const V2_ATTN_BODY = String.raw`[word-break:break-word] font-sans font-normal leading-5 relative shrink-0 text-gray-700 text-sm tracking-normal w-full`
/* A PILL, full width, below the row.
   SUPERSEDED BY THE BLOCK BELOW as a description of what this button draws —
   199772:145508 replaced the 26/10 outline with a filled 54px pill. The note
   is kept because its LESSON is still the file's, and because the 26/10 pair
   is still what BTN_REDRAW and the ignored state draw.
   RADIUS 26 AND PX 10, RESOLVED — not the 8 and 8 the emitted code shows.
   `get_design_context` prints a token's FALLBACK, and these two are stale in
   the file: `rounded-[var(--component/button/size-xs/radius,8px)]` and
   `px-[var(--component/button/size-xs/px,8px)]`. Taken literally they drew a
   nearly square-cornered button, and the owner caught it on sight: "this is
   not as in figma / the button". get_variable_defs on 199703:38734 resolves
   `component/button/size-xs/radius` to 26 and `component/button/size-xs/px`
   to 10, which is also the pill the inline button has always used.
   THE LESSON, since this file now carries several of them: a `var(--x, N)`
   fallback is a guess about N, not a reading of it. */
/* ── 2026-10-29: THE PILL IS FILLED NOW — 199772:145508 ───────────────────
   The canonical frame (199772:145451, 402x1991) draws this button as

     bg-slate-900 h-[54px] rounded-[458.696px]
     drop-shadow-[0px_2.296px_3.214px_rgba(47,116,237,0.28)] w-full

   with an 18/24.75 SemiBold label in #fbfbfc — so the outline treatment that
   stood here (border-slate-900, transparent ground, slate-900 ink, 16/24) is
   gone, along with its `gap-1 px-2.5 py-[12px]`: the frame has no gap and no
   pads, it centres one label inside a fixed 54px.

   RADIUS. 458.696 on a 54px-tall element is Figma's way of writing "fully
   rounded", so it is `rounded-full` — which is what this codebase already
   spells that with (ActiveWaterEventsCard, EventFocusOverlay, SystemTypeCard,
   SystemsFilterSheet…). The literal would have been a third spelling of the
   same intent.

   THE GROUND IS `bg-foreground`, NOT `bg-slate-900` — and the difference is
   only visible off `light`. In :root `--foreground: var(--slate-900)`
   (index.css:99), so under `light` the two are the same #0f172b byte and the
   frame is transcribed exactly. But --slate-900 is the INK ramp step and it
   INVERTS per theme: under `dark` it resolves to zinc-50 (index.css:825).
   A `bg-slate-900` fill is therefore a near-WHITE button under `dark`, and the
   light label Figma puts on it disappears — measured 1.01:1 with
   `text-ink-on-color`, 1.04:1 with `text-white`. (EventFocusOverlay.jsx:2108
   ships that latent defect today on its own `bg-slate-900 text-white` CTA.
   Reported, not touched — not this file.)

   --ink-on-color DOES NOT APPLY HERE. It is ink that must stay light on a
   ground that stays COLOURED in every theme — severity chips, danger,
   success. This ground is not coloured; it is the ink ramp wearing the
   surface's job, which is the inverted-button pattern, and this repo already
   has a declared pair for that: tooltip.jsx:36 draws `bg-foreground` +
   `text-background`. Measured across all four:

     bg-foreground + text-background   light 16.47  dark 19.05  sand 18.92  contrast 4.95
     bg-slate-900  + text-ink-on-color light 17.21  dark  1.01  sand 16.88  contrast 3.44

   The pair is the only one that clears AA in all four, and `contrast` — the
   theme that exists to break exactly this kind of assumption — is where the
   slate-900 reading drops to 3.44 even before `dark` zeroes it.

   THE DROP SHADOW IS THE ONE UN-TOKENED VALUE ON THIS BUTTON. No token in
   index.css holds rgba(47,116,237,0.28) / #2f74ed: the repo's blues are
   --primary #0b81f8 (light) and blue-500 #2b7fff (dark), --shadow-raised and
   --shadow-overlay are both neutral black at 8%/10%, and nothing else is
   close. It is carried as the literal the frame emits, with precedent
   (PillTabs.jsx:281 carries rgba(161,161,161,0.5) the same way) — but it is
   NOT a token, it will not move under the four themes, and no token was
   invented for it. FLAGGED for the owner: either #2f74ed earns a token or
   this shadow should be dropped. */
const V2_BTN = String.raw`bg-foreground content-stretch cursor-pointer drop-shadow-[0px_2.296px_3.214px_rgba(47,116,237,0.28)] flex h-[54px] items-center justify-center relative rounded-full shrink-0 w-full outline-none transition-[filter] hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50`
const V2_BTN_TEXT = String.raw`[word-break:break-word] font-sans font-semibold leading-[24.75px] relative shrink-0 text-background text-lg whitespace-nowrap`

/* ── 199683:25996 — THE FAULTED READING ───────────────────────────────────
   slate/600 -> --muted-foreground.

   The design asks for the position word "one step muted versus a normal
   reading", and --muted-foreground is this repo's ONLY declared muted-ink
   ROLE (index.css:111). It is re-picked by every theme — :root --slate-500,
   `dark` zinc-400, `sand` stone-500, `contrast` its own cyan — where a frozen
   slate-600 would not move at all. The normal reading beside it is V2_VALUE's
   text-slate-800, so the step between a trustworthy reading and a muted one
   survives in all four.

   It stays a READING, not decoration: over --surface-card in `light` it
   measures 5.1:1, well past the 4.5:1 this 24px word does not even owe. The
   frame's own slate-600 would have measured about the same; the token is
   chosen for where it goes in the other three themes. */
const V2_VALUE_MUTED = String.raw`[word-break:break-word] font-sans font-medium leading-6 relative shrink-0 text-2xl text-muted-foreground tracking-[-0.6px] whitespace-nowrap`

/* slate/400 on the unavailable action -> TWO tokens where the frame uses one,
   and deliberately:

     · THE BORDER is the only thing that bounds this control, so it owes WCAG
       SC 1.4.11's 3:1. --border is the SUBTLE tier (index.css:120-133,
       1.07:1 over the card) and exists for hairlines; --border-strong is the
       tier that block declares for "inputs, focusable chrome", and it
       measures 4.59:1. The frame's slate-400 is about 1.9:1 on white and
       would fail — so this is the token that keeps the design's intent, which
       is a box you can see is a control.
     · THE LABEL still has to be READ. It is the sentence "Close valve": the
       thing the user is being told they cannot do, on a screen where a leak
       is running. It takes the muted-ink role rather than a ramp step so pale
       it reads as absent.

   NO FILL, which is the frame's: a boundary and a word, nothing else, so it
   cannot be mistaken for the filled primary this replaces. */
const V2_BTN_OFF = String.raw`border border-border-strong border-solid content-stretch cursor-not-allowed flex h-[54px] items-center justify-center relative rounded-full shrink-0 w-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`
const V2_BTN_OFF_TEXT = String.raw`[word-break:break-word] font-sans font-semibold leading-[24.75px] relative shrink-0 text-muted-foreground text-lg whitespace-nowrap`

/* ── 199683:25974 — THE UNKNOWN POSITION ──────────────────────────────────
   slate/900 on the two outline actions -> --foreground, for BOTH border and
   label.

   In :root the two are the same byte (index.css:105 `--foreground:
   var(--slate-900)`), so `light` is the frame exactly. But --slate-900 is the
   INK RAMP STEP and it INVERTS — under `dark` it resolves to zinc-50 — while
   --foreground is the ink DECLARED to oppose the surface. On an outline
   control both happen to want to invert, so the two agree here; the token is
   named for the job, so the next reader does not have to re-derive that, and
   it is the same reasoning V2_BTN already records for its
   bg-foreground/text-background pair.

   The WORD above these keeps V2_VALUE unchanged: the design puts Unknown at
   slate/800, i.e. at a normal reading's weight, because an unknown position
   is a fact we are sure of. Only `error` mutes. */
const V2_BTN_PAIR = String.raw`content-stretch flex gap-[8px] items-center relative shrink-0 w-full`
const V2_BTN_OUTLINE = String.raw`border border-foreground border-solid content-stretch cursor-pointer flex h-[54px] items-center justify-center relative rounded-full shrink-0 w-[82px] outline-none transition-[filter] hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50`
const V2_BTN_OUTLINE_TEXT = String.raw`[word-break:break-word] font-sans font-semibold leading-[24.75px] relative shrink-0 text-foreground text-lg whitespace-nowrap`

/* sysA's ids. sysB draws the same card as
   141553->143046, 141554->143047, 141555->143048, 141556->143049,
   141557->143050, 141558->143051, 141559->143052, 141565->143058,
   141566->143059, 141567->143060, 141568->143061, 141569->143062,
   141570->143063, 141571->143064, 141572->143065. */
const NODE = {
  card: '199383:141553',
  row: '199383:141554',
  stack: '199383:141555',
  titleBox: '199383:141556',
  title: '199383:141557',
  valueRow: '199383:141558',
  glyph: '199383:141559',
  value: '199383:141565',
  button: '199383:141566',
  /* `strip: '199383:141567'` STOOD HERE and is gone with the two-line warning
     block it named. The card's strip is 199683:26037 now, and it carries that
     id itself — see ValveAutoShutoffStrip. */
}

// 199383:141553
const CARD = String.raw`bg-surface-card border border-solid border-card content-stretch flex flex-col gap-[16px] items-start px-[16px] py-[12px] relative rounded-[22px] shrink-0 w-full max-w-full min-w-0 overflow-hidden`

// 199383:141554
const ROW = String.raw`content-stretch flex gap-[8px] items-center relative shrink-0 w-full`

/* 199383:141555 — the title/value stack the Button sits beside. The node says
   `shrink-0`; here it may shrink, because the Button below is floored at its
   own text width (see BTN) and something has to give on a frame narrower than
   the node's. At 375 and up nothing does, so the node's geometry is what
   renders. */
const STACK = String.raw`content-stretch flex flex-col gap-[8px] items-start relative shrink min-w-0`

/* 199383:141556 — `w-[215.5px]`, the node's own number, restored.
   It was briefly `max-w-[215.5px] shrink-0` on the reasoning that a fixed box
   beside a `flex-[1_0_0]` button would overflow a 393 column. It does not —
   and the swap is what the owner saw: a max-width on a shrink-0 box with no
   width sizes to its CONTENT, so the stack collapsed to 77px and the growing
   Button swallowed 242 of the row's 327 (74%). The node gives the Button the
   REMAINDER of a 215.5px box: 103.5px at 393, 95.5 at 375 — about 30%, which
   is the two-column row the design draws. The box may shrink below 215.5 on a
   narrower frame; it never grows past it. */
const TITLE_BOX = String.raw`content-stretch flex items-center relative shrink min-w-0 w-[215.5px] max-w-full`

// 199383:141557 — ONE style now, no tone branch.
const TITLE = String.raw`[word-break:break-word] font-sans font-medium leading-5 relative shrink-0 text-foreground text-sm whitespace-nowrap`

// 199383:141558
const VALUE_ROW = String.raw`content-stretch flex gap-[9.75px] items-center relative shrink-0`

// 199383:141559 — the "Group" box; ValveStatus fills it.
const GLYPH_BOX = String.raw`h-[15.75px] relative shrink-0 w-[16.497px]`

// 199383:141565
const VALUE = String.raw`[word-break:break-word] flex flex-col font-sans font-medium justify-center leading-[0] relative shrink-0 text-[19.501px] text-slate-600 whitespace-nowrap`

/* 199383:141566 "Button", verbatim apart from being a real <button> instead of
   Figma's <div> (the node already carries `cursor-pointer`, so it is meant to
   be one). Its two drop-shadow layers both resolve to rgba(0,0,0,0), i.e. no
   shadow, but they are carried rather than "corrected" like every other token
   on this card.
   ONE atom differs: the node's `min-w-px` becomes `min-w-fit`. `flex-[1_0_0]`
   is grow 1 / shrink 0 / basis 0, so the Button only ever takes the free space
   the 215.5px box leaves — 103.5px at 393, 95.5 at 375, both clear of the
   ~94px "Close valve" needs at 14/600 plus its 10px pads. Below ~370 the free
   space runs out, and `min-w-px` would let the pill crush its own label rather
   than let the title box give way; `min-w-fit` reverses that. At and above the
   node's own frame width the two are indistinguishable. */
const BTN = String.raw`bg-accent border border-slate-900 border-solid content-stretch cursor-pointer drop-shadow-[0px_0px_0px_transparent,0px_0px_0px_transparent] flex flex-[1_0_0] gap-1 items-center justify-center min-w-fit px-2.5 py-[12px] relative rounded-[26px] outline-none transition-[filter] hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50`

// I199383:141566;100985:11132
const BTN_TEXT = String.raw`[word-break:break-word] font-sans font-semibold leading-5 relative shrink-0 text-foreground text-sm whitespace-nowrap`

/* The same two states on the ORIGINAL (non-`redraw`) card, which the System
   page mounts. Identical token mappings to the V2_* set above — the
   justifications are written there and are not repeated — carried onto this
   card's own geometry (the 26px pill, 10px pads, 14/20 label) rather than the
   redraw's 54px full-width one, because the owner's standing rule is that
   this card's other mounts keep the chassis they have. Nothing an open or a
   closed valve draws is touched. */
const VALUE_MUTED = String.raw`[word-break:break-word] flex flex-col font-sans font-medium justify-center leading-[0] relative shrink-0 text-[19.501px] text-muted-foreground whitespace-nowrap`
const BTN_OFF = String.raw`border border-border-strong border-solid content-stretch cursor-not-allowed flex flex-[1_0_0] gap-1 items-center justify-center min-w-fit px-2.5 py-[12px] relative rounded-[26px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`
const BTN_OFF_TEXT = String.raw`[word-break:break-word] font-sans font-semibold leading-5 relative shrink-0 text-muted-foreground text-sm whitespace-nowrap`
const BTN_PAIR = String.raw`content-stretch flex gap-[6px] items-center relative shrink-0`
const BTN_OUTLINE = String.raw`border border-foreground border-solid content-stretch cursor-pointer flex gap-1 items-center justify-center min-w-fit px-2.5 py-[12px] relative rounded-[26px] outline-none transition-[filter] hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50`
const BTN_OUTLINE_TEXT = String.raw`[word-break:break-word] font-sans font-semibold leading-5 relative shrink-0 text-foreground text-sm whitespace-nowrap`

/* ── The `redraw` set ─────────────────────────────────────────────────────
   199683:24796 / :24797 / :24810, the EVENT OVERLAY only. Opt-in, because
   this card is also SystemPageV2Screen:1840 and an earlier pass changed both
   — owner: "the card in other pages needs to remain as it was". Every mount
   that passes nothing keeps 199383:141553 byte for byte. */
const BTN_REDRAW = String.raw`border border-slate-900 border-solid content-stretch cursor-pointer drop-shadow-[0px_0px_0px_transparent,0px_0px_0px_transparent] flex gap-1 items-center justify-center shrink-0 w-[161px] px-2.5 py-[12px] relative rounded-[26px] outline-none transition-[filter] hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50`
const BTN_TEXT_REDRAW = String.raw`[word-break:break-word] font-sans font-semibold relative shrink-0 text-slate-900 text-base leading-6 whitespace-nowrap`
/* 24px/24 medium slate-800 at -0.6, which makes the state the loudest thing
   in the row. The original is 19.501px slate-600. */
const VALUE_REDRAW = String.raw`[word-break:break-word] font-sans font-medium relative shrink-0 text-2xl leading-6 tracking-[-0.6px] text-slate-800 whitespace-nowrap`
/* 199683:24810 — the AUTO-CLOSE panel. It replaces a fixed h-[80px] strip on
   the page gradient; this one is a flat slate-100 tile that SIZES TO ITS
   CONTENT, because its two states are different heights (one line of clock
   against three lines of warning). */
const STRIP_REDRAW = String.raw`bg-slate-100 content-stretch flex flex-col gap-[8px] items-start justify-center px-[13px] py-[9px] relative rounded-[11px] shrink-0 w-full max-w-full`
const STRIP_ROW = String.raw`content-stretch flex items-center justify-between relative shrink-0 w-full`
const STRIP_LABEL = String.raw`[word-break:break-word] font-sans font-medium relative shrink-0 text-slate-600 text-sm leading-5 whitespace-nowrap`
/* The node's badge tokens at their emitted values (6.6 / 2.2 / 4.4 / 28.6),
   kept rather than rounded so the pill matches its neighbours in the frame. */
const STRIP_BADGE = String.raw`bg-surface-card content-stretch flex gap-[4.4px] h-[22px] items-center justify-center overflow-clip px-[6.6px] py-[2.2px] relative rounded-[28.6px] shrink-0`
const STRIP_BADGE_TEXT = String.raw`[word-break:break-word] font-sans font-medium leading-[19.36px] overflow-hidden relative shrink-0 text-[14.52px] text-slate-600 text-ellipsis whitespace-nowrap`
const STRIP_BODY = String.raw`content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full`
/* 199683:24831 — digits and colon as three runs, which is how the node splits
   them and what lets the colon keep its own 3px gaps. */
const STRIP_CLOCK = String.raw`content-stretch flex font-sans font-medium gap-[3px] items-center leading-6 relative shrink-0 text-slate-800 text-2xl`
/* ── The live countdown ───────────────────────────────────────────────────
 * Owner, 2026-10-26: "i want it to feel more live on UI, to see how it real
 * elapsed", and "maybe something like 'valve will be closed in:'".
 *
 * So it TICKS. A frozen figure on a card about something imminent reads as a
 * label; a number moving every second reads as a deadline, which is what this
 * is. The label names the action rather than leaving "will activate" to be
 * puzzled out.
 *
 * One interval, cleared on unmount and restarted only when the starting
 * figure changes — not a timer per render. `Date.now()` is read inside the
 * effect, never in the render body: this repo's eslint flags an impure read
 * during render (react-hooks/purity) and it is right to, since it makes a
 * component's output depend on when React happened to call it.
 *
 * At zero it stops and says so. It does not run negative, and it does not
 * claim the valve has closed — this card does not know that; the valve state
 * above it does. */
/**
 * Seconds remaining, ticking once a second.
 *
 * Extracted so the two countdown PRESENTATIONS — the one-line "Valve will be
 * closed in: 2m 45s" and the node's large "02 : 45" clock — cannot drift
 * apart in their arithmetic. They differ only in markup.
 *
 * No setState at the top of the effect: that is a cascading render and this
 * repo's eslint rejects it. Both callers KEY the component on `total`, so a
 * new figure remounts it and useState picks the new starting value up free.
 */
function useSecondsLeft(total) {
  const [left, setLeft] = useState(total)
  useEffect(() => {
    if (total <= 0) return undefined
    const started = Date.now()
    const id = setInterval(() => {
      const gone = Math.floor((Date.now() - started) / 1000)
      setLeft(Math.max(0, total - gone))
    }, 1000)
    return () => clearInterval(id)
  }, [total])
  return left
}

const toTotal = (minutes, seconds) =>
  Math.max(0, Math.round((minutes || 0) * 60 + (seconds || 0)))

/**
 * 199703:39363 — the large MM : SS clock, under its own label.
 *
 * WHY THE COLON FORMAT IS BACK. The owner rejected it once, in words: "i
 * don't like the will activate in 10:00 time elapsed this is not clear text"
 * — and they were right about THAT layout, where "Will activate in 10:00" sat
 * inline and parsed as a wall clock as readily as a duration. The new node
 * fixes the ambiguity a different way: the label is "Auto-shutoff in" on its
 * own line ABOVE the figure, so "in" governs the number and nothing else can
 * be read into it. Transcribed rather than argued with, because the frame
 * answers the objection rather than ignoring it.
 *
 * `aria-live="off"`: a value that changes every second would otherwise be
 * announced every second. The label names what it is; the figure is glanced
 * at, not listened to.
 */
function ClockCountdown({ minutes, seconds }) {
  const total = toTotal(minutes, seconds)
  const left = useSecondsLeft(total)
  const m = Math.floor(left / 60)
  const sec = left % 60
  return (
    <div className={V2_CLOCK} data-node-id="199703:39363" data-countdown={left}>
      <p className="relative shrink-0" dir="auto" data-node-id="199703:39364">
        {pad2(m)}
      </p>
      <p className="relative shrink-0" aria-hidden="true" data-node-id="199703:39365">
        :
      </p>
      <p className="relative shrink-0" dir="auto" data-node-id="199703:39366">
        {pad2(sec)}
      </p>
    </div>
  )
}

function LiveCountdown({ minutes, seconds, label }) {
  const total = toTotal(minutes, seconds)
  const left = useSecondsLeft(total)

  const m = Math.floor(left / 60)
  const sec = left % 60

  return (
    /* ONE ROW. Owner: "make it max 2 lines" — the panel ran to three, the
       badge row plus a label line plus the figure. Label and figure share a
       baseline now, so the whole thing is the badge row and this.
       The label may shrink and truncate; the figure never does, because a
       clipped countdown is worse than a clipped sentence. */
    <div
      className="flex w-full items-baseline gap-[6px]"
      data-node-id="199683:24830"
    >
      <p
        className={String.raw`[word-break:break-word] font-sans font-normal leading-5 min-w-0 truncate relative text-slate-600 text-sm`}
        data-node-id="199683:24834"
      >
        {label}
      </p>
      <p
        className={cn('font-sans', STRIP_CLOCK, 'shrink-0')}
        dir="auto"
        aria-live="off"
        data-countdown={left}
      >
        {left === 0 ? (
          'closing now'
        ) : (
          <>
            {/* "0m 52s" wastes the width this row has to save, and reads as
                precision nobody asked for. Under a minute it is just the
                seconds. */}
            {m > 0 ? (
              <>
                {m}
                <span className="text-[16px]">m</span>
                {' '}
                {pad2(sec)}
              </>
            ) : (
              sec
            )}
            <span className="text-[16px]">s</span>
          </>
        )}
      </p>
    </div>
  )
}

/* Two digits a side; a 7 would otherwise read as 0:7. */
const pad2 = (n) => String(n).padStart(2, '0')

/* 199383:141567's chassis and its two-layer gradient STOOD HERE and were
   deleted on 2026-11-08 with the block they painted — see the strip's mount
   below. The gradient note is not lost: the same `--app-bg-stops` reasoning
   (and the `dark`-theme defect that forced it) is still recorded verbatim at
   WintSidebarV2.jsx, which is where it was copied from. 199683:26016 draws a
   flat `bg-slate-100` tile and needs none of it. */

// Phosphor Icons / warning 199383:141570 — export verbatim (12x12). The
// shipped #FB2C36 is colors/red/500, so the strokes and the dot are
// currentColor and the call site pins text-red-500.
function WarningGlyph() {
  return (
    <svg
      className="absolute block inset-0 max-w-none size-full"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6.67547 1.88531L10.7752 9.00422C11.0625 9.50578 10.6913 10.125 10.0997 10.125H1.90031C1.30875 10.125 0.9375 9.50578 1.22484 9.00422L5.32453 1.88531C5.61984 1.37156 6.38016 1.37156 6.67547 1.88531Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 6.75V4.875" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6 9C6.31066 9 6.5625 8.74816 6.5625 8.4375C6.5625 8.12684 6.31066 7.875 6 7.875C5.68934 7.875 5.4375 8.12684 5.4375 8.4375C5.4375 8.74816 5.68934 9 6 9Z"
        fill="currentColor"
      />
    </svg>
  )
}

/* ── THE BUSY SEQUENCE — 199683:25832 / :25851 / :25870 ───────────────────
   Owner, 2026-11-08: "When shutting off valve [...] there is no any feedback
   that something was happens." Three frames answer it, and they replace the
   ACTION, not the readout: through all three the position word still says
   `Open` and only 199683:25891 says `Closed`. A valve that reports closed
   while it is still being asked to close is a lie the user will act on.

     199683:25832  "Sending…"           + spinner        161px
     199683:25851  "Closing…"           + spinner        161px
     199683:25870  "Verifying Closed"   + spinner        auto width,
                                        + caption "Up to 8 minutes" under it,
                                        and the row switches to items-start

   GEOMETRY — THE FRAME'S CHIP IS 161x48 AT rounded-[8px], AND THAT IS NOT
   WHAT SHIPS HERE. This card draws two different buttons already (the V2
   full-width rounded-full pill and the legacy flex-1 rounded-[26px] one), and
   the chip REPLACES the button in place. Taking the frame's box literally
   would make the card resize and the control jump shape the instant it is
   pressed, which reads as a glitch rather than as progress. So the chip
   inherits each branch's own button geometry — exactly the adaptation
   199683:25996 (the unavailable button) and 199683:25974 (the two short
   actions) already took in this file. The frame's INK, GROUND, BORDER, GAP
   and type are transcribed unchanged.

   bg #f2f6ff IS --accent, to the hex (index.css:115), and this card's own
   legacy BTN already paints `bg-accent`. slate/300 is the hairline tier, so
   --border; this chip is not focusable and owes no 3:1 boundary. slate/600 on
   the label takes --muted-foreground, the repo's one muted-ink ROLE, for the
   reason V2_VALUE_MUTED spells out — a frozen slate step does not move under
   `dark`, `sand` or `contrast`. */
const BUSY_BASE = String.raw`bg-accent border border-border border-solid content-stretch flex gap-[4px] items-center justify-center relative`
const BUSY_TEXT = String.raw`[word-break:break-word] font-sans font-semibold leading-6 relative shrink-0 text-base text-muted-foreground whitespace-nowrap`
/* 199683:25870's caption — 14px / --text/sm/lh-relaxed 22.75px, weight 500.
   `pt-[7px]` is the frame's gap between the chip and the line under it. */
const BUSY_CAPTION = String.raw`[word-break:break-word] font-sans font-medium leading-[22.75px] pt-[7px] relative shrink-0 text-center text-sm text-muted-foreground`

/* THE SPINNER TURNS, AND IT STOPS TURNING WHEN THE READER ASKS IT TO.
   A component-scoped <style>, the house pattern (BulkValveConfirmSheet.jsx
   :566, WaterEventFeedbackSheet.jsx:375) — no animation library, CSS only.

   Under `prefers-reduced-motion: reduce` the rotation is removed outright
   rather than slowed: an element that never stops moving is the motion
   problem, and a still spinner beside a label that already says "Sending…"
   loses nothing. The LABEL is what carries the meaning in both cases, which
   is also why the glyph is aria-hidden. */
const BUSY_CSS = `
.vsc-spin { animation: vsc-spin 900ms linear infinite; }
@keyframes vsc-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .vsc-spin { animation: none; }
}
`

/**
 * The busy chip. `caption` is 199683:25870's "Up to 8 minutes" and is the one
 * thing that makes that frame taller than the other two.
 *
 * `role="status"` + `aria-live="polite"`: the sequence changes under the
 * user's hands after they pressed a button and the button vanished, so it has
 * to be announced. Polite, not assertive — nothing here interrupts.
 */
function BusyChip({ label, caption, shape, captionId, nodeId }) {
  return (
    <div
      className={cn(
        'content-stretch flex flex-col items-center',
        shape === 'pill' ? 'w-full' : 'min-w-0 shrink',
      )}
      data-name="Valve busy"
    >
      <style>{BUSY_CSS}</style>
      <div
        className={cn(
          BUSY_BASE,
          shape === 'pill'
            ? 'h-[54px] rounded-full shrink-0 w-full'
            : 'min-w-fit px-2.5 py-[12px] rounded-[26px] shrink-0',
        )}
        role="status"
        aria-live="polite"
        data-node-id={nodeId}
        data-busy={label}
      >
        <LoaderCircle
          size={16}
          aria-hidden="true"
          focusable="false"
          className="vsc-spin shrink-0 text-muted-foreground"
        />
        <p className={BUSY_TEXT}>{label}</p>
      </div>
      {caption ? (
        <p className={BUSY_CAPTION} id={captionId} data-node-id="199683:25877">
          {caption}
        </p>
      ) : null}
    </div>
  )
}

/**
 * The in-flight command for `systemId`, re-read on a tick.
 *
 * THE STORE OWNS THE STATE, NOT THIS HOOK. `valveCommandStore` holds the
 * command and DERIVES the phase from elapsed time, so a navigation away, a
 * tab switch or a reload re-derives rather than resumes — the progress this
 * card promised cannot be lost by unmounting it. All the hook does is decide
 * when to look again.
 *
 * ONE interval, at 250ms, and it runs for as long as a `systemId` is set —
 * NOT only while something is in flight. The System page mounts this card AND
 * mounts EventFocusOverlay beside it, which mounts a second one for the same
 * system; a command confirmed in the overlay is a store write the page's own
 * card never hears about by any other route. An interval armed only on a
 * transition it can already see could never learn about that one.
 *
 * IT COSTS ALMOST NOTHING. The tick reads one small localStorage key, and it
 * only calls setState when the PHASE actually changes — so the idle case is
 * four reads a second and zero renders, and the busy case is exactly three
 * renders for the three frames.
 *
 * `Date.now()` is read inside the effect and inside the tick, never in the
 * render body — this repo's eslint flags an impure read during render
 * (react-hooks/purity) and it is right to.
 *
 * ── WHY `onSettled` IS FIRED FROM A REMEMBERED STATE ──────────────────────
 * Two mounted cards race to settle the same command. `settleValveCommand` is
 * idempotent, so the WRITE is safe — but the loser's read comes back empty
 * and its return value is null, so a caller that fired on the return value
 * would notify from one card and not the other. Each mount therefore
 * remembers the state its own last in-flight read was heading for, and
 * reports THAT. Both callers are told, exactly once each.
 */
function useValveTransition(systemId, onSettled) {
  const [transition, setTransition] = useState(null)
  /* What the command this mount is watching will settle to, remembered so the
     notification survives losing the settle race. Null whenever nothing is in
     flight, which is what stops a settled command being announced twice. */
  const headingForRef = useRef(null)
  /* The latest callback, without making it a dependency — callers pass inline
     arrows and re-arming the interval on every parent render would be a timer
     that restarts four times a second. Written in an EFFECT, not in the
     render body: this repo's eslint rejects a ref write during render
     (react-hooks/refs) and it is right to. */
  const onSettledRef = useRef(onSettled)
  useEffect(() => {
    onSettledRef.current = onSettled
  }, [onSettled])

  useEffect(() => {
    /* No systemId is the opted-out card, which is most of them. Nothing is
       armed and nothing is cleared here — a synchronous setState in an effect
       body is a cascading render and this repo's eslint rejects it. The
       RETURN below is what makes the opted-out case read as idle. */
    if (!systemId) {
      headingForRef.current = null
      return undefined
    }

    const read = () => {
      const next = getValveTransition(systemId)

      if (next && next.phase !== 'settled') {
        headingForRef.current = next.state
        /* Only the PHASE is a render. The elapsed figure changes every tick
           and nothing on this card draws it. */
        setTransition((cur) =>
          cur && cur.phase === next.phase && cur.action === next.action ? cur : next,
        )
        return
      }

      /* Either the window has run, or another mount has already swept it. */
      const resolved = next ? next.state : headingForRef.current
      if (next) settleValveCommand(systemId)
      headingForRef.current = null
      setTransition(null)
      if (resolved) onSettledRef.current?.(resolved)
    }

    read()
    const id = setInterval(read, 250)
    return () => clearInterval(id)
  }, [systemId])

  /* Gated on `systemId` rather than cleared in the effect — see above. A card
     that stops opting in reads as idle on the very same render, with no
     cascading setState to get there. */
  return systemId ? transition : null
}

export default function ValveStatusCard({
  /* 'open' | 'closed' | 'error' | 'unknown'. The last two are new — see the
     2026-11-03 block in the header. Anything unrecognised still falls to the
     closed branch, as it always did; callers that cannot be sure should pass
     'unknown', which now has a real rendering instead of being rounded. */
  state = 'open',
  /* THE VALVE'S REAL PHYSICAL POSITION while `state` is 'error' — 'open' |
     'closed' | null. The design keeps the position word on a faulted valve
     and only mutes it, so the card needs somewhere to be told it.

     NOT DEFAULTED TO 'open'. Nothing in this repo's data model records a
     position alongside a fault: `buildTree.js:524` writes 'error' INTO the
     same `system.valve` field the position lives in, so on today's data a
     faulted valve has no knowable position at all. With none supplied the
     card says so (`unknownLabel`) rather than guessing — guessing "Open" is
     the exact false reading this state exists to remove. */
  position = null,
  onToggle,
  /* Render the card as a READOUT: everything the design draws, minus the
     action. EventFocusOverlay needs the card's face but not a second way to
     shut the water off — the owner's "now we have 2 valve CTA", 2026-10-17 —
     and that surface already carries the primary in its footer. The previous
     fix was a hand copy of this card's atoms in that file, which silently went
     stale the moment this card was rebuilt. A prop here keeps one source. */
  interactive = true,
  /* OPT-IN to the 2026-10-25 redraw. Default false: the System page passes
     nothing and keeps what it draws today. Only EventFocusOverlay opts in. */
  redraw = false,
  /* `redraw` only. 199683:24813 names the SETTING where the original named
     the behaviour, and the badge carries its state — "On" (199683:24849) or
     "Disabled" (199394:78935), which are what policy.autoShutoff returns. */
  /* 199703:41549 — the label over the state BADGE. It read "Auto-close
     Valve" from the superseded 199683:24813; both 2026-10-26 nodes spell it
     "Auto-shutoff", which is also the wording ActivePolicyCard's own
     "Auto Shutoff Valve" row uses, so the app stops calling one setting two
     things. */
  autoCloseLabel = 'Auto-shutoff',
  /* 199703:39354 — the label over the CLOCK. A separate string because the
     node is: "in" governs a countdown and would dangle above a badge. */
  autoCloseInLabel = 'Auto-shutoff in',
  autoCloseState = 'On',
  /* 199683:24824 / :24825 / :24834 — frozen Figma strings, props so every
     drawn word on this card is one, which is this file's rule. */
  attentionLabel = 'Attention',
  /* 199703:42050, verbatim. It was the longer "In case a Leak is detected —
     the valve will not automatically shut off and water loss is at risk"
     from the superseded 199683:24825; the new node drops the conditional
     clause and the sentence fits the node's two lines without it. */
  attentionBody = 'The valve will not automatically shut off and water loss is at risk',
  /* "Will activate in" beside a 00 : 00 clock — owner, 2026-10-26: "i don't
     like the will activate in 10:00 time elapsed, this is not clear text."
     Two faults, and the format is the worse one:

       · 10:00 IN A COLON FORMAT READS AS A WALL CLOCK. "Will activate in
         10:00" parses as "at ten o'clock" at least as readily as "in ten
         minutes", and the card gives no unit anywhere to settle it. Explicit
         units cannot be misread: 10m, 2m 45s.
       · "Will activate" names nothing. WHAT activates? The badge above says
         Auto-close Valve, but the sentence has to stand on its own — it is
         the line someone reads while deciding whether to close the valve by
         hand first. It says what will happen: the valve closes. */
  activatesInLabel = 'Valve will be closed in:',
  /* WHEN auto-close fires, as the countdown in 199683:24849. NOT DEFAULTED:
     nothing in this app carries an auto-close delay — systemDetails.js records
     autoShutoff as Enabled/Disabled/N/A and no timing at all. The node's
     00 : 00 is a placeholder, and a zeroed clock rendered as if measured is
     the 25K-litre defect again. Pass {minutes, seconds} when the data exists;
     until then the On state is the label and the badge. */
  activatesIn = null,
  /* The Disabled state's warning — the red block with "Attention" and the
     sentence under it.

     IT IS BACK ON, AND THIS IS A REVERSAL worth seeing. The owner hid it on
     2026-10-26 ("hide this dfor now"), so the default was false and it was
     kept behind this prop rather than deleted. Later the same day they sent
     199703:41537 and said "update to latest" — and that node draws the block
     as a first-class part of the Disabled state, in its own red-50 panel
     rather than tucked inside the strip. The later instruction wins, and the
     prop stays, so hiding it again is one word at the call site. */
  showAttention = true,
  label = 'Valve status',
  /* 199683:25974 draws the word "Unknown". Transcribed, not authored — it is
     also the word `SystemTypeCard.jsx:391` already prints for a valve state
     it has no entry for, so the app does not call one thing two names. */
  unknownLabel = 'Unknown',
  /* 199683:25974 draws its two actions as "Close" and "Open" — the short
     forms, because two 82px pills side by side have no room for the long
     ones and the card's own title already says what is being closed. */
  closeShortLabel = 'Close',
  openShortLabel = 'Open',
  /* NEW COPY — PROPOSED, NOT FINALISED (.claude/skills/wint-ui-copy/SKILL.md
     §0). The frame draws the unavailable button but no reason text, and a
     control that is visibly unavailable owes the user the reason; §5 of that
     skill makes the accessible name where it goes.

     DANGER REGISTER (ASD-STE100), because this is a surface where water
     stops: two sentences, six words and five words, one topic each, active
     voice, no contraction, and `error` is the word `VALVE_CATEGORIES` already
     uses for this state rather than a synonym of it.

     Alternatives for the owner to choose between:
       a. "This action is not available. The valve reports an error."  (here)
       b. "The valve reports an error. It cannot open or close."
       c. "This valve cannot move. It reports an error."
     (b) states the consequence, which §3a prefers, but chains two subjects;
     (a) leads with what the user just tried to do, which is what an
     accessible name on a button is for. */
  unavailableReason = 'This action is not available. The valve reports an error.',
  /* ── THE BUSY SEQUENCE ──────────────────────────────────────────────────
     `systemId` is what turns it on. A card mounted without one behaves
     exactly as it did before this pass — which is what keeps every existing
     mount, and every existing test, byte-identical. The two pages that gate a
     valve change behind a confirm sheet pass it; nothing else does.

     THE CARD DOES NOT START A COMMAND. `onToggle` still only ASKS — the page
     opens its ValveConfirmSheet and calls `startValveCommand` on confirm, so
     the gate cannot be bypassed by this card acquiring a store write. The
     card only RENDERS what the store says is in flight. */
  systemId = null,
  /* Fired once, when the window has run and the commanded state has been
     written. The page uses it to bring its own optimistic map in line; the
     store has already recorded the state either way. */
  onSettled,
  /* 199683:25832 / :25851 / :25870, transcribed. The frame mixes `...` in
     "Sending..." with `…` in "Closing…"; ONE is picked — the single-character
     ellipsis `…`, which is what the repo's rendered copy already uses and
     what the frame itself spells for the longer-running state. FLAGGED.

     Only the CLOSE direction has frames. The open wording is derived the same
     way "Open valve" and the closed state word are, and is still a prop. */
  sendingLabel = 'Sending…',
  closingLabel = 'Closing…',
  openingLabel = 'Opening…',
  verifyingClosedLabel = 'Verifying Closed',
  verifyingOpenLabel = 'Verifying Open',
  /* 199683:25870's caption, verbatim. It is the HARDWARE's worst case, not
     this app's timer — see VALVE_TRANSITION_MS in valveCommandStore.js. */
  verifyingCaption = 'Up to 8 minutes',
  stateLabel,
  /* ── THE AUTO-SHUTOFF SENTENCE, NOW BEHIND A TAP — 199683:26016 ─────────
     Owner, 2026-11-08: "replace this with how it show in figam - this
     sentence can be added as a tool tip if someone clicks".

     `handlingLabel` ("Valve handling:") and `handling` ("Auto shut-off")
     ARE GONE WITH THE BLOCK THEY FED. That is a Rule 0 removal under the
     owner's own instruction, and nothing is lost: the strip that replaces it
     carries the same fact in the frame's own vocabulary — `autoCloseLabel`
     over a state badge reading `autoCloseState`.

     THE SENTENCE SURVIVES, VERBATIM. It is kept exactly as it shipped,
     em-dash and mid-sentence capital and all. Both are against standing copy
     rules and NEITHER is fixed here: re-punctuating a shipped string is the
     owner's call. FLAGGED. */
  handlingDescription = 'In case a Leak is detected — the valve will automatically shut off',
  tone = 'calm',
  className,
  ...props
}) {
  const t = tone === 'alert' ? 'alert' : 'calm'
  /* 199683:25397 gives the redrawn card its own chassis: p-18 / gap-18 /
     rounded-18, where 199383:141553 is px-16 py-12 gap-16 rounded-22. Only
     the redraw takes it; every other mount keeps the card it has. */
  const chassis = redraw
    ? String.raw`bg-surface-card border border-solid border-card content-stretch flex flex-col gap-[18px] items-start p-[18px] relative rounded-[18px] shrink-0 w-full max-w-full min-w-0 overflow-hidden`
    : CARD
  /* FOUR STATES, ASKED FOR BY NAME. `isOpen` keeps exactly the meaning it had
     — only 'open' is open — and the two new states are tested before it, so
     nothing rounds. Before this, `state === 'error'` simply failed the
     `isOpen` test and took the CLOSED branch on this card, and the redraw
     branch's own `isOpen ? 'open' : 'closed'` glyph call did the same. */
  const isError = state === 'error'
  const isUnknown = state === 'unknown'
  const isOpen = state === 'open'
  /* The glyph is the one thing that always names the real state: red and
     two-tone on a fault, pale and dashed on an unknown. Both variants have
     been in ValveStatus.jsx since 197639:253443 and neither had a caller. */
  const glyphState = isError ? 'error' : isUnknown ? 'unknown' : isOpen ? 'open' : 'closed'
  /* THE POSITION SURVIVES THE FAULT — see the header. */
  const positionWord = position === 'open' ? 'Open' : position === 'closed' ? 'Closed' : null
  // Figma draws "Open"; the closed wording has no frame, so it is derived and
  // still overridable, which is what keeps every drawn string a prop.
  const value =
    stateLabel ??
    (isUnknown
      ? unknownLabel
      : isError
        ? positionWord ?? unknownLabel
        : isOpen
          ? 'Open'
          : 'Closed')
  // See WORDING above — "Open valve" is derived, not drawn.
  /* 199683:24797 draws "Close valve now". The open wording has no frame, so
     it is derived and still overridable. */
  /* Which way the inert action points on a fault: with the position when one
     is known, and otherwise toward CLOSE, which is the direction 199683:25996
     draws and the only one that could help during a leak. */
  const actsToClose = isError ? positionWord !== 'Closed' : isOpen
  const action = isError
    ? /* 199683:25996 labels it "Close valve", with no "now". The suffix on the
         redraw's live primary promises immediacy, and this button is inert. */
      (actsToClose ? 'Close valve' : 'Open valve')
    : redraw
      ? (actsToClose ? 'Close valve now' : 'Open valve now')
      : (actsToClose ? 'Close valve' : 'Open valve')
  /* `aria-disabled`, NEVER the `disabled` attribute — the house rule at
     .claude/skills/wint-ui-copy/SKILL.md §5. `disabled` is skipped outright
     by some assistive tech, so the user never learns WHY, and on this control
     the why is the single most useful thing it has to say. The button stays
     in the tab order and announces its reason; the click handler is guarded
     separately, because aria-disabled is a promise to the reader and not to
     the DOM. */
  const unavailableName = `${action}. ${unavailableReason}`
  /* One branch for the whole panel. Both halves came off separate branches
     once, and a system with auto-close off read "Auto shut-off" above the
     auto-shut-off sentence — the panel contradicting its own first line. */
  const autoCloseOff = String(autoCloseState).toLowerCase() === 'disabled'
  /* The Attention disclosure — see the block it drives. Collapsed on mount,
     which is the state the owner asked for; the heading stays visible either
     way, so nothing is hidden that carries the warning itself. */
  const [attentionOpen, setAttentionOpen] = useState(false)
  const uid = useId()
  const attentionBodyId = `${uid}-attention`

  /* ── WHAT IS IN FLIGHT, AND WHAT THE CARD DOES ABOUT IT ─────────────────
     The chip replaces the ACTION and nothing else. The glyph, the position
     word and the auto-shutoff strip are all left alone, because none of them
     has changed yet — 199683:25832 / :25851 / :25870 all still read `Open`.

     A FAULT OUTRANKS A COMMAND IN FLIGHT. `error` means the valve has already
     failed to respond to one; drawing "Closing…" over that would be the card
     asserting progress it has been told is not happening. Same for `unknown`,
     where the position is not knowable and a direction-specific busy label
     would claim one. */
  const transition = useValveTransition(systemId, onSettled)
  const busy = isError || isUnknown ? null : transition
  const busyLabel = busy
    ? busy.phase === 'sending'
      ? sendingLabel
      : busy.phase === 'acting'
        ? (busy.action === 'close' ? closingLabel : openingLabel)
        : (busy.action === 'close' ? verifyingClosedLabel : verifyingOpenLabel)
    : null
  /* Only 199683:25870 carries the caption — the frame draws it under
     Verifying and under nothing else. */
  const busyCaption = busy && busy.phase === 'verifying' ? verifyingCaption : null
  const busyCaptionId = `${uid}-verifying`
  /* One frame per phase, named, so the chip on screen can be traced back to
     the node it came from the way every other element on this card can. */
  const busyNodeId = busy
    ? { sending: '199683:25832', acting: '199683:25851', verifying: '199683:25870' }[busy.phase]
    : undefined

  /* ── THE 2026-10-26 CARD — 199703:38726 / 199703:41537 ──────────────────
     A SEPARATE RETURN, not more branches below. The element ORDER changed
     (state and auto-shutoff are now one row, the button dropped to its own
     full-width row), and expressing that as ternaries inside the old tree
     would have meant every node id and class string on the System page's
     card becoming conditional on a prop it never passes. This way the old
     render below is byte-identical for every mount that does not opt in.

     The label follows the STATE, because the two nodes spell it differently
     and the difference is meaningful: 199703:39354 says "Auto-shutoff in"
     over a running clock, 199703:41549 says "Auto-shutoff" over a Disabled
     badge. "in" belongs to a countdown and would be a dangling preposition
     above a badge. */
  if (redraw) {
    const showClock = !autoCloseOff && activatesIn != null
    const panelLabel = showClock ? autoCloseInLabel : autoCloseLabel
    return (
      <div className={cn(V2_CARD, className)} data-node-id="199703:38726" data-name="Topology" {...props}>
        <div className={V2_COL} data-node-id="199703:38728">
          <div className={V2_HEAD} data-node-id="199703:38729">
            <p className={V2_TITLE} dir="auto" data-node-id="199703:38730">
              {label}
            </p>

            <div className={V2_ROW} data-node-id="199703:38731">
              {/* The valve's own state. */}
              <div
                className={isError || isUnknown ? V2_STATE_WIDE : V2_STATE}
                data-node-id="199703:39376"
              >
                <div className={V2_GLYPH} data-node-id="199703:38732" data-name="Valve status">
                  {/* Figma wraps the export in an `inset-[-3.98%…]` bleed box
                      that exists only because the export bakes the stroke
                      outside the artwork's bounds. Our vector draws inside
                      its viewBox, so it fills the Group box directly; the box
                      itself is the node's, to the thousandth. */}
                  <div className={V2_GLYPH_BOX} data-name="Group">
                    <ValveStatus
                      state={glyphState}
                      className="absolute inset-0 block size-full"
                      preserveAspectRatio="none"
                    />
                  </div>
                </div>
                {/* MUTED ON A FAULT ONLY. 199683:25974 draws Unknown at the
                    full slate/800 reading weight, because an unknown position
                    is a fact we are sure of; 199683:25996 steps the position
                    word back because it is a reading we can no longer
                    verify. */}
                <p
                  className={isError ? V2_VALUE_MUTED : V2_VALUE}
                  dir="auto"
                  data-node-id={isError ? '199683:25996' : '199703:38733'}
                >
                  {value}
                </p>
              </div>

              {/* The auto-shutoff panel — a clock when it is armed and there
                  is something to count down to, the state badge otherwise.
                  NOT both: the node draws one or the other, and a badge
                  reading "On" beside a running clock says the same thing
                  twice. */}
              <div className={V2_PANEL} data-node-id="199703:39351">
                <div className={V2_PANEL_ROW} data-node-id="199703:39353" data-name="Row">
                  <p className={V2_PANEL_LABEL} dir="auto" data-node-id="199703:39354">
                    {panelLabel}
                  </p>
                </div>
                <div className="content-stretch flex items-end relative shrink-0" data-node-id="199703:39362">
                  {showClock ? (
                    <ClockCountdown
                      key={`${activatesIn.minutes}:${activatesIn.seconds}`}
                      minutes={activatesIn.minutes}
                      seconds={activatesIn.seconds}
                    />
                  ) : (
                    <div className={V2_BADGE} data-node-id="199703:42066" data-name="Badge">
                      {/* The node's leftIcon is a Location Dot, which this
                          project already owns at the same three radii — so
                          it is reused and only tinted, red when auto-shutoff
                          will NOT fire and green when it will. */}
                      <LocationDot
                        size={14.52}
                        className={cn('shrink-0', autoCloseOff ? 'text-red-500' : 'text-green-700')}
                      />
                      <p className={V2_BADGE_TEXT}>{autoCloseState}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 199703:42035 — the Disabled state's warning. Drawn only when
                auto-shutoff is off, which is the only state the frame draws
                it in: on an armed valve there is nothing to warn about. */}
            {autoCloseOff && showAttention ? (
              /* ── COLLAPSED BY DEFAULT ──────────────────────────────────
                 Owner, 2026-10-26: "the attention takes too much space maybe
                 collapsed it?" The node draws an 80px block for one sentence,
                 on a card that already carries a row and a button.

                 WHAT COLLAPSES IS THE SENTENCE, NOT THE WARNING. The red
                 panel, the icon and the word "Attention" stay on screen at
                 all times — that is the signal, and a safety notice you have
                 to discover is not a safety notice. Only the explanation
                 folds away, which is the part you read once. That keeps the
                 glance intact and gives back ~40px.

                 A real <button> with aria-expanded / aria-controls, and the
                 panel stays MOUNTED behind the `hidden` attribute rather than
                 unmounted: aria-controls must point at an element that
                 exists, and a collapsed warning that leaves the DOM drops out
                 of find-in-page too. */
              <div className={V2_ATTN} data-node-id="199703:42035" data-collapsed={attentionOpen ? 'false' : 'true'}>
                <div className={V2_ATTN_INNER} data-node-id="199703:42045">
                  <button
                    type="button"
                    onClick={() => setAttentionOpen((v) => !v)}
                    aria-expanded={attentionOpen}
                    aria-controls={attentionBodyId}
                    className={cn(V2_ATTN_ROW, 'cursor-pointer rounded-[6px] text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50')}
                    data-node-id="199703:42046"
                  >
                    <div className={V2_ATTN_ICON} data-node-id="199703:42047" data-name="rightIcon">
                      <div
                        className="relative shrink-0 size-[12px] text-red-500"
                        data-node-id="199703:42048"
                        data-name="Phosphor Icons / warning"
                      >
                        <WarningGlyph />
                      </div>
                    </div>
                    <p className={V2_ATTN_LABEL} data-node-id="199703:42049">
                      {attentionLabel}
                    </p>
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className={cn(
                        'ml-auto shrink-0 text-slate-500 transition-transform duration-200',
                        attentionOpen ? 'rotate-180' : null,
                      )}
                    />
                  </button>
                  <p
                    id={attentionBodyId}
                    hidden={!attentionOpen}
                    className={V2_ATTN_BODY}
                    data-node-id="199703:42050"
                  >
                    {attentionBody}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* 199703:38734 — full width, under the row. As a READOUT the action
              is omitted entirely rather than disabled: a greyed button still
              reads as "you may do this here", and the point is that the
              control lives elsewhere on that surface. */}
          {interactive ? (
            busy ? (
              /* THE ACTION SLOT WHILE A COMMAND IS IN FLIGHT. The button is
                 GONE, not disabled: a greyed "Close valve" beside a valve
                 that still reads Open is exactly the idle-looking control the
                 owner reported, and the three frames draw a chip in its
                 place, never a dead button. */
              <BusyChip
                shape="pill"
                label={busyLabel}
                caption={busyCaption}
                captionId={busyCaptionId}
                nodeId={busyNodeId}
              />
            ) : isUnknown ? (
              /* 199683:25974 — TWO actions, both LIVE. The position is
                 unknown, so neither direction is the obvious one and both are
                 meaningful. The frame sets them side by side at 82px each;
                 this card's button slot is a full-width row, so they sit at
                 its start rather than filling it. */
              <div className={V2_BTN_PAIR} data-node-id="199683:25974" data-name="Buttons">
                <button
                  type="button"
                  onClick={() => onToggle?.('closed')}
                  className={V2_BTN_OUTLINE}
                  data-name="Button"
                >
                  <p className={V2_BTN_OUTLINE_TEXT}>{closeShortLabel}</p>
                </button>
                <button
                  type="button"
                  onClick={() => onToggle?.('open')}
                  className={V2_BTN_OUTLINE}
                  data-name="Button"
                >
                  <p className={V2_BTN_OUTLINE_TEXT}>{openShortLabel}</p>
                </button>
              </div>
            ) : isError ? (
              /* 199683:25996 — present, visibly unavailable, and able to say
                 why. See `unavailableName` for why this is aria-disabled and
                 not `disabled`. */
              <button
                type="button"
                aria-disabled="true"
                aria-label={unavailableName}
                onClick={(event) => {
                  /* The guard. aria-disabled does not stop a click, and an
                     unreachable valve must not receive a command just
                     because the control still answers the mouse. */
                  event.preventDefault()
                }}
                className={V2_BTN_OFF}
                data-node-id="199683:25996"
                data-name="Button"
              >
                <p className={V2_BTN_OFF_TEXT}>{action}</p>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onToggle?.(isOpen ? 'closed' : 'open')}
                className={V2_BTN}
                data-node-id="199703:38734"
                data-name="Button"
              >
                <p className={V2_BTN_TEXT}>{action}</p>
              </button>
            )
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(chassis, className)} data-node-id={NODE.card} data-name="IOT overview" {...props}>
      {/* 199683:25870 switches the row to `items-start`, because the
          Verifying state hangs a caption under its chip and a centred row
          would push the readout down with it. Every other state is centred,
          as it always was. */}
      <div
        className={cn(ROW, busyCaption ? 'items-start' : null)}
        data-node-id={NODE.row}
      >
        <div className={STACK} data-node-id={NODE.stack}>
          <div className={TITLE_BOX} data-node-id={NODE.titleBox}>
            <p className={TITLE} dir="auto" data-node-id={NODE.title}>
              {label}
            </p>
          </div>

          <div className={VALUE_ROW} data-node-id={NODE.valueRow}>
            {/* Figma wraps the exported SVG in an `inset-[-3.98%_-3.8%_…]`
                bleed box, which only exists because the export bakes the
                stroke outside the artwork's bounds. Our own vector draws
                inside its viewBox, so it fills the Group box directly; the
                box itself is the node's, to the thousandth. */}
            <div className={GLYPH_BOX} data-node-id={NODE.glyph} data-name="Group">
              <ValveStatus
                state={glyphState}
                className="absolute inset-0 block size-full"
                preserveAspectRatio="none"
              />
            </div>
            <div
              className={redraw ? VALUE_REDRAW : isError ? VALUE_MUTED : VALUE}
              data-node-id={NODE.value}
            >
              <p className={redraw ? 'leading-6' : 'leading-[29.251px]'} dir="auto">
                {value}
              </p>
            </div>
          </div>
        </div>

        {/* The card ASKS; it does not act. The caller turns this into a
            ValveConfirmSheet intent — same contract the switch had.
            As a readout the action is omitted entirely rather than disabled: a
            greyed button still reads as "you may do this here", and the point
            is that the control lives elsewhere on that surface. */}
        {interactive ? (
          busy ? (
            /* See the V2 branch above: the chip takes the action's slot, with
               this branch's own geometry rather than the frame's 161px box. */
            <BusyChip
              shape="inline"
              label={busyLabel}
              caption={busyCaption}
              captionId={busyCaptionId}
              nodeId={busyNodeId}
            />
          ) : isUnknown ? (
            /* 199683:25974 on this card's geometry — two short outline pills
               where the single action sits. */
            <div className={BTN_PAIR} data-node-id="199683:25974" data-name="Buttons">
              <button
                type="button"
                onClick={() => onToggle?.('closed')}
                className={BTN_OUTLINE}
                data-name="Button"
              >
                <p className={BTN_OUTLINE_TEXT}>{closeShortLabel}</p>
              </button>
              <button
                type="button"
                onClick={() => onToggle?.('open')}
                className={BTN_OUTLINE}
                data-name="Button"
              >
                <p className={BTN_OUTLINE_TEXT}>{openShortLabel}</p>
              </button>
            </div>
          ) : isError ? (
            <button
              type="button"
              aria-disabled="true"
              aria-label={unavailableName}
              onClick={(event) => {
                event.preventDefault()
              }}
              className={BTN_OFF}
              data-node-id="199683:25996"
              data-name="Button"
            >
              <p className={BTN_OFF_TEXT}>{action}</p>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggle?.(isOpen ? 'closed' : 'open')}
              className={redraw ? BTN_REDRAW : BTN}
              data-node-id={NODE.button}
              data-name="Button"
            >
              <p className={redraw ? BTN_TEXT_REDRAW : BTN_TEXT}>{action}</p>
            </button>
          )
        ) : null}
      </div>

      {t === 'alert' ? (
        redraw ? (
        /* 199683:24810 — label + state badge, then a body that only the
           Disabled state draws. The On state is the badge alone unless a
           countdown is supplied; see `activatesIn`. */
        <div className={STRIP_REDRAW} data-node-id="199683:24810">
          <div className={STRIP_ROW} data-node-id="199683:24812" data-name="Row">
            <p className={STRIP_LABEL} data-node-id="199683:24813">{autoCloseLabel}</p>
            <div className={STRIP_BADGE} data-node-id="199683:24816" data-name="Badge">
              {/* The node's leftIcon slot. A dot, taking the state's own
                  colour — green when auto-close will fire, red when it will
                  not — so the badge is legible without reading the word. */}
              <span
                aria-hidden="true"
                className={
                  autoCloseOff
                    ? 'size-[6px] shrink-0 rounded-full bg-destructive'
                    : 'size-[6px] shrink-0 rounded-full bg-success'
                }
              />
              <p className={STRIP_BADGE_TEXT}>{autoCloseState}</p>
            </div>
          </div>

          <div className={STRIP_BODY} data-node-id="199683:24820">
            {autoCloseOff && showAttention ? (
              <>
                <div
                  className="content-stretch flex gap-[6px] items-center relative shrink-0 w-full"
                  data-node-id="199683:24821"
                >
                  <div
                    className={String.raw`bg-red-200 content-stretch flex items-center justify-center relative rounded-[20px] shrink-0 size-[16px]`}
                    data-node-id="199683:24822"
                    data-name="rightIcon"
                  >
                    <div
                      className="relative shrink-0 size-[12px] text-red-500"
                      data-node-id="199683:24823"
                      data-name="Phosphor Icons / warning"
                    >
                      <WarningGlyph />
                    </div>
                  </div>
                  <p
                    className={String.raw`[word-break:break-word] font-sans font-semibold leading-5 relative shrink-0 text-slate-900 text-sm whitespace-nowrap`}
                    data-node-id="199683:24824"
                  >
                    {attentionLabel}
                  </p>
                </div>
                <p
                  className={String.raw`[word-break:break-word] font-sans font-normal leading-5 relative shrink-0 text-gray-700 text-sm tracking-normal w-full`}
                  data-node-id="199683:24825"
                >
                  {attentionBody}
                </p>
              </>
            ) : activatesIn ? (
              <>
                {/* ONE ROW, not a stack: the frame reads "00 : 00 Will
                    activate in" across a single line, with the clock large
                    and the label beside it. */}
                <LiveCountdown
                  key={`${activatesIn.minutes}:${activatesIn.seconds}`}
                  minutes={activatesIn.minutes}
                  seconds={activatesIn.seconds}
                  label={activatesInLabel}
                />
              </>
            ) : null}
          </div>
        </div>
        ) : (
        /* ── 199683:26016 REPLACES 199383:141567 ────────────────────────────
           What stood here was an 80px two-line warning block on the page's
           own gradient: a red warning disc, "Valve handling: Auto shut-off",
           and the sentence under it. The owner replaced it by name.

           The frame draws one 38px strip with a label and a state badge, and
           it marks the sentence `hidden="true"` (199683:26038) — the design
           retires it from the card face. The owner's "can be added as a tool
           tip if someone clicks" is what brings it back, behind a tap, which
           is the whole reason ValveAutoShutoffStrip exists rather than a
           plain <p>. Everything about why that is not a Radix Tooltip is in
           that file's header.

           NOTE THE WRAPPER. The strip is `w-full` inside this card's
           `flex-col` chassis and needs no box of its own; it is mounted
           directly, the same way the redraw branch mounts STRIP_REDRAW. */
        <ValveAutoShutoffStrip
          label={autoCloseLabel}
          state={autoCloseState}
          /* ── THE SENTENCE FOLLOWS THE STATE, AND IT HAS TO ──────────────
             Caught in the browser on 2026-11-08: the strip read
             "Auto-shutoff · Disabled" and the tapped sentence read "the
             valve will automatically shut off". The panel contradicting its
             own badge.

             THIS IS THE SAME DEFECT THE OLD BLOCK HAD, and it is the one
             `valveStatusCard.dom.test.jsx` has a test for: the headline was
             switched on the policy while the sentence stayed at the card's
             default, so a manual system read "Valve handling: Manual only —
             ... the valve will automatically shut off". EventFocusOverlay
             fixed it for the redraw card by driving both halves off one
             branch. This is that branch, for this card.

             NEITHER SENTENCE IS NEW. `handlingDescription` is the shipped
             auto-shutoff sentence and `attentionBody` is 199703:42050, the
             shipped sentence for auto-shutoff being off.

             AND `N/A` GETS NEITHER. A metering-only system has no such
             setting, so there is no honest sentence to put behind the tap —
             and `ValveAutoShutoffStrip` draws no trigger at all without one,
             which is what it should do rather than explain a setting that
             does not exist. */
          description={
            autoCloseOff
              ? attentionBody
              : String(autoCloseState).trim().toLowerCase() === 'n/a'
                ? undefined
                : handlingDescription
          }
        />
        )
      ) : null}
    </div>
  )
}
