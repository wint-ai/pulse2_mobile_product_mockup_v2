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
 */

import { useEffect, useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LocationDot } from '@/v2/icons'
import ValveStatus from '@/v2/components/ValveStatus'

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
  strip: '199383:141567',
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

/* 199383:141567 — the handling strip. The old red/50 fill is gone; the node
   paints the page's own two-layer gradient, carried as an inline style because
   Figma emits it as one (an arbitrary Tailwind value cannot hold the commas). */
const STRIP = String.raw`content-stretch flex flex-col gap-[8px] h-[80px] items-start justify-center px-[13px] relative rounded-[11px] shrink-0 w-full max-w-full`
/* The wash, themed. The angle stays here, the colours come from the shipped
   stop list — under `light` that token IS the rgba literal this carried, so
   `light` is byte-identical. NOT var(--chip-bg)/var(--app-bg): those bake one
   angle in at :root and a call-site angle override cannot reach them. See
   WintSidebarV2.jsx for the full note. */
const WASH_BASE = 'linear-gradient(90deg, var(--card) 0%, var(--card) 100%)'

/* Painted as literals this strip stayed #edf1f9 under `dark` while its own
   text followed the theme: "Valve handling: Auto shut-off" measured 1.08:1. */
const STRIP_GRADIENT = {
  /* --app-bg-stops, not --chip-bg-stops: this strip's stops are the page
     root's set (29.24 / 12.35 / 17.588 / 76.864), not the chip set. */
  backgroundImage:
    `linear-gradient(168.92503170733684deg, var(--app-bg-stops)), ${WASH_BASE}`,
}

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

export default function ValveStatusCard({
  state = 'open',
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
  stateLabel,
  handlingLabel = 'Valve handling:',
  handling = 'Auto shut-off',
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
  const isOpen = state === 'open'
  // Figma draws "Open"; the closed wording has no frame, so it is derived and
  // still overridable, which is what keeps every drawn string a prop.
  const value = stateLabel ?? (isOpen ? 'Open' : 'Closed')
  // See WORDING above — "Open valve" is derived, not drawn.
  /* 199683:24797 draws "Close valve now". The open wording has no frame, so
     it is derived and still overridable. */
  const action = redraw
    ? (isOpen ? 'Close valve now' : 'Open valve now')
    : (isOpen ? 'Close valve' : 'Open valve')
  /* One branch for the whole panel. Both halves came off separate branches
     once, and a system with auto-close off read "Auto shut-off" above the
     auto-shut-off sentence — the panel contradicting its own first line. */
  const autoCloseOff = String(autoCloseState).toLowerCase() === 'disabled'
  /* The Attention disclosure — see the block it drives. Collapsed on mount,
     which is the state the owner asked for; the heading stays visible either
     way, so nothing is hidden that carries the warning itself. */
  const [attentionOpen, setAttentionOpen] = useState(false)
  const attentionBodyId = `${useId()}-attention`

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
              <div className={V2_STATE} data-node-id="199703:39376">
                <div className={V2_GLYPH} data-node-id="199703:38732" data-name="Valve status">
                  {/* Figma wraps the export in an `inset-[-3.98%…]` bleed box
                      that exists only because the export bakes the stroke
                      outside the artwork's bounds. Our vector draws inside
                      its viewBox, so it fills the Group box directly; the box
                      itself is the node's, to the thousandth. */}
                  <div className={V2_GLYPH_BOX} data-name="Group">
                    <ValveStatus
                      state={isOpen ? 'open' : 'closed'}
                      className="absolute inset-0 block size-full"
                      preserveAspectRatio="none"
                    />
                  </div>
                </div>
                <p className={V2_VALUE} dir="auto" data-node-id="199703:38733">
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
            <button
              type="button"
              onClick={() => onToggle?.(isOpen ? 'closed' : 'open')}
              className={V2_BTN}
              data-node-id="199703:38734"
              data-name="Button"
            >
              <p className={V2_BTN_TEXT}>{action}</p>
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(chassis, className)} data-node-id={NODE.card} data-name="IOT overview" {...props}>
      <div className={ROW} data-node-id={NODE.row}>
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
                state={isOpen ? 'open' : 'closed'}
                className="absolute inset-0 block size-full"
                preserveAspectRatio="none"
              />
            </div>
            <div className={redraw ? VALUE_REDRAW : VALUE} data-node-id={NODE.value}>
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
          <button
            type="button"
            onClick={() => onToggle?.(isOpen ? 'closed' : 'open')}
            className={redraw ? BTN_REDRAW : BTN}
            data-node-id={NODE.button}
            data-name="Button"
          >
            <p className={redraw ? BTN_TEXT_REDRAW : BTN_TEXT}>{action}</p>
          </button>
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
        <div className={STRIP} style={STRIP_GRADIENT} data-node-id={NODE.strip}>
          <div
            className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full"
            data-node-id="199383:141568"
          >
            <div
              className={String.raw`bg-red-200 content-stretch flex items-center justify-center relative rounded-[20px] shrink-0 size-[16px]`}
              data-node-id="199383:141569"
              data-name="rightIcon"
            >
              <div
                className="relative shrink-0 size-[12px] text-red-500"
                data-node-id="199383:141570"
                data-name="Phosphor Icons / warning"
              >
                <WarningGlyph />
              </div>
            </div>
            <p
              className={String.raw`[word-break:break-word] font-sans font-semibold leading-5 relative shrink-0 text-foreground text-sm whitespace-nowrap`}
              data-node-id="199383:141571"
            >{`${handlingLabel} ${handling} `}</p>
          </div>
          <p
            className={String.raw`[word-break:break-word] font-sans font-normal leading-5 relative shrink-0 text-gray-700 text-sm tracking-normal w-full`}
            data-node-id="199383:141572"
          >{`${handlingDescription} `}</p>
        </div>
        )
      ) : null}
    </div>
  )
}
