/**
 * The Account/Location screen's "System health" card — Figma "IOT overview".
 *
 * SOURCE NODES (read off the emitted React+Tailwind, not re-fetched):
 *   alert  199323:12113  -> the card is 199323:12124
 *   calm   199371:137019 -> the card is 199371:137037
 *
 * THE TWO STATES DO NOT DISAGREE. Diffing the two emits with the
 * `data-node-id` attributes stripped produces an EMPTY diff across the whole
 * card: chassis, heading, "Show all" button, the 53px fleet row, the progress
 * bar, its label and all three counter tiles are byte-identical, down to the
 * frozen values (244 systems / "3 / 48 need attention" / 1 / 1 / 1). The alert
 * vs calm difference on this screen lives entirely in the NEXT card down — the
 * water-events card, 199359:128986 (gap-[12px], alert) vs 199371:137191
 * (gap-[20px] h-[252px], calm) — which this component does not own. So there
 * is no `tone` prop here: there is nothing for it to switch.
 *
 * WHERE THE NODE DISAGREES WITH ITSELF (and why there are no Figma-literal
 * count defaults below):
 *   - the fleet row says "244 systems";
 *   - the progress bar is named "Progress Bar - 45 of 48 systems healthy" and
 *     its label reads "3 / 48 need attention".
 *   244 != 48. Two numbers in one card cannot both be the fleet size, and
 *   nothing in the emit says which is stale. This component therefore takes
 *   ONE `total` and uses it for both, and defaults every count to 0 rather
 *   than shipping either frozen number as a default.
 *   - the card also carries a fourth row, 199338:52997, reading
 *     "14 other issues · 10 no power, 4 no recipients". It contradicts the
 *     "No power" tile two rows above it (10 vs 1).
 *     IT IS RENDERED HERE NOW, 2026-10-22, and the half of this note that
 *     said "'no recipients' is not a value this app models at all" was out of
 *     date: HomeAllAccounts publishes `issues.recipients`, counted off each
 *     system's `notificationRecipients`, and PRD 09 makes "has at least one
 *     alert recipient" the fourth protection check. See OTHER_ROW for what
 *     "other" was taken to mean and why the frame's "10 no power" clause is
 *     NOT reproduced.
 *
 * THE PROGRESS BAR IS PROPORTIONAL, and that is a measurement, not a guess.
 * Figma freezes the red segment at `w-[18px] shrink-0` with the green on
 * `flex-[36.25_0_0]`. Work the frame back: the page is
 * px-[var(--spacing/4,16px)] on a 375 artboard -> card 343; the card body is
 * px-[20px] -> 303; the bar is `gap-[1.622px]` -> 301.378 of track. 3/48 of
 * that is 18.8px, which is the 18px Figma wrote down. So the frozen width IS
 * the 3-of-48 proportion, and the two segments are re-expressed here as
 * flex-grow attention / healthy over a 0 basis — reproducing 18px at the
 * design's own numbers and still working at any other pair. Everything else
 * about the bar (h-[15px], gap-[1.622px], the red/700 token, the #cbf7db ->
 * #81f1aa gradient, the 9068757px radii) is verbatim.
 *
 * ZERO IS NOT RED. When nothing needs attention the red segment is dropped,
 * the green takes the full radius, and the leading count in the label renders
 * slate rather than red. That is this design system's documented rule, already
 * carried by SystemsHealthCard.jsx ("a count renders red ONLY when it is
 * non-zero") — not a new invention. The frames only ever draw the non-zero
 * case, so there is no all-healthy emit to copy.
 *
 * HEALTH IS NOT WATER EVENTS, 2026-10-22. Owner: "we don't have the
 * separation between system health, which is the errors, and water events.
 * Systems can be 100% healthy, but with water events, it's not counting on
 * the same counter." Of the three changes that carried that here, ONE
 * survives and two were reverted the same day — see BACK TO THE FRAMES below:
 *   · THE BAR keeps a red FILL and that is deliberate, not an oversight — it
 *     is a proportion mark, not a status chip. It consumes --bar-fill-*,
 *     which src/index.css minted for these three call sites and nothing had
 *     ever used. See BAR_RED / BAR_GREEN. KEPT.
 *   · THE HUE SPLIT moved the fault tiles to the warning family. REVERTED.
 *   · THE STATUS ROW replaced the all-clear row with a three-tone sentence
 *     that rendered in every state. REVERTED.
 * The progress bar, `healthy`, `attention` and every tile stay what PRD
 * 09 says they are: the four protection checks, and nothing about leaks.
 *
 * BACK TO THE FRAMES, 2026-10-22 (later the same day). Owner, on a screenshot
 * of `/`: "why i still see this wierd boxes and not as in figma". The two
 * boxes were ours and NEITHER is in any frame:
 *   · THE AMBER TINT. 199417:134233, 199417:132878 and 199414:130115 all draw
 *     the hot tile PINK — `bg-gradient-to-b from-[#fff1f1] to-[#ffe3e3]`, and
 *     a horizontal pixel run across 130115's middle tile reads (255,234,234)
 *     edge to edge. There is no amber anything in any of the three. TILE_HOT
 *     is --alert-surface-critical again, which is var(--red-100) = #ffe2e2 at
 *     `light`: the gradient's own end stop, one unit per channel off #ffe3e3,
 *     and the only token in the file whose light value is in this family.
 *     The hue split's argument was real but it was answered with a colour the
 *     design does not use; if red-means-two-things still needs solving it has
 *     to be solved in Figma first.
 *   · THE STATUS SENTENCE. No frame carries one. The defect it was covering
 *     is real and is NOT reintroduced — see `allClear` at the branch — but
 *     Figma's own answer to it is the other-issues row (199338:52997), which
 *     is implemented instead. A recipients-only fault now shows up as
 *     "1 other issue · 1 no recipients" rather than as a sentence we wrote.
 * The water count left the card with the status row: the only line that ever
 * consumed `waterEvents` was the invented one, so the prop went with it. The
 * separation itself still holds where it is actually measured — `healthy` vs
 * `stats.waterEvents` in HomeAllAccounts, pinned by
 * src/__tests__/healthIsNotWaterEvents.dom.test.jsx.
 *
 * ASSETS. Figma asset URLs expire in ~7 days and NONE is referenced at
 * runtime. The emit draws all five glyphs as <img>, so the export carries no
 * colour information for any of them; each is inlined as a local component
 * taking currentColor, tinted on its wrapper (GLYPH_INK below).
 *   bc151.svg  Tabler Icons / photo-sensor-3     -> <PhotoSensor3/> (v2/icons)
 *   eeb81.svg  Huge Icons / wifi-disconnected-02 -> <WifiDisconnected02/>
 *   ed762.svg  Lucide Icons / power-off          -> lucide-react <PowerOff/>
 *   5489d.svg  "Valve status" > "Group"          -> <ValveStatus state="error"/>
 *   08c33.svg  Huge Icons / arrow-right-02       -> lucide-react <ArrowRight/>
 *
 * Two of those five are substitutions worth knowing about:
 *   - the valve Group (I199338:51778;197639:253471) is 16.009x15.283 with a
 *     0.608px stroke bleed on every side, which is this project's ValveStatus
 *     artwork (11.643x11.115 visible, 0.885173 stroke) scaled 1.375x — the
 *     same reuse ValveStatusCard.jsx already makes. That bleed box is
 *     identical for the open / error / unknown variants, so geometry alone
 *     cannot pick one; `error` is used because the tile it sits in is labelled
 *     "Valve errors", and 253471 sits just past the error variant
 *     197639:253461 in the component's own id range.
 *   - arrow-right-02's art box measures x 5->19, y 6->18 in a 24-unit grid
 *     (from the node's 20.83% / 25% insets). Lucide's ArrowRight is x 5->19,
 *     y 5->19 — same width and stroke, 2 units taller in the head. Lucide is
 *     used rather than redrawing Huge's path from measurements, per this
 *     repo's icons/ note ("Lucide still covers everything it already has").
 *     Figma's `-rotate-180 -scale-x-100` wrapper around that <img> is dropped
 *     with it: it is a net vertical flip of a vertically symmetric arrow.
 *
 * DROPPED AS A VERIFIED NO-OP: the "Show all" button's two-layer drop-shadow.
 * Both layers resolve to rgba(0,0,0,0) at 0 blur, and it carries an unescaped
 * `/` inside calc(), which Tailwind's candidate parser reads as a modifier
 * delimiter. Same call SystemsHealthCard.jsx makes, for the same reason.
 *
 * NOTE ON CLASS STRINGS: Figma's token classes contain escaped slashes
 * (`bg-[var(--colors\/slate\/100,#f1f5f9)]`). A plain JS string eats the
 * backslash, so every such string is String.raw`` — see SystemTypeCard.jsx.
 *
 * ORDER MATTERS: cn() is tailwind-merge, which treats `leading-*` as
 * conflicting with a font-size atom and silently DROPS a `leading-` written
 * BEFORE `text-[length:...]` / `text-[22px]`. Figma emits alphabetically, i.e.
 * leading first, so every line-height below has been moved to the END of its
 * atom. Same class set as the node, different order.
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
import { ArrowRight, PowerOff } from 'lucide-react'
import { PhotoSensor3, PinLocation03, WifiDisconnected02 } from '@/v2/icons'
import ValveStatus from '@/v2/components/ValveStatus'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ fonts */


/* ------------------------------------------------------------ class atoms */

/* 199323:12124 / 199371:137037 — identical in both states. */
const CARD = String.raw`bg-surface-card border border-solid border-card content-stretch flex flex-col gap-[15px] items-center pb-[16px] pt-[12px] relative rounded-[22px] shrink-0 w-full`

/* 199371:129896 / 199323:12127 — the heading block and its row. */
const HEAD_BLOCK = String.raw`content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full`
const HEAD_ROW = String.raw`content-stretch flex h-[28px] items-center justify-between px-[20px] relative shrink-0 w-full`
const HEAD_TITLE = String.raw`[word-break:break-word] font-medium relative shrink-0 text-foreground text-sm whitespace-nowrap leading-5`

/* 199338:52768 — the "Show all" Button. Figma draws it 99x36; `after:` grows
   the tap target to 99x48 without moving a pixel (the button is already
   `relative`, and the pseudo-element paints nothing). */
const SHOW_ALL = String.raw`appearance-none bg-transparent border-0 content-stretch cursor-pointer flex gap-1.5 h-[36px] items-center justify-end px-0 py-0 relative rounded-[26px] shrink-0 w-[99px] after:absolute after:content-[''] after:inset-x-0 after:inset-y-[-6px]`
const SHOW_ALL_TEXT = String.raw`[word-break:break-word] font-medium relative shrink-0 text-slate-600 text-sm whitespace-nowrap leading-5`
const SHOW_ALL_ICON = String.raw`content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[16px]`

/* 199323:12125 / 199323:12126 — the body and its 27px column. */
const BODY = String.raw`content-stretch flex flex-col items-start justify-center px-[20px] relative shrink-0 w-full`
const BODY_COL = String.raw`content-stretch flex flex-col gap-[27px] items-start relative shrink-0 w-full`

/* 199359:128710 / 199360:129777 / 199360:129778 — bare wrapper columns. */
const PLAIN_COL = String.raw`content-stretch flex flex-col items-start relative shrink-0 w-full`
/* 199360:129785 and 199360:129786 — the two 10px groups. */
const GAP_10_COL = String.raw`content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full`

/* 199359:128709 — the 53px fleet row. */
const FLEET_ROW = String.raw`bg-slate-100 content-stretch flex gap-[10px] h-[53px] items-center pl-[15px] relative rounded-[12px] shrink-0 w-full`
const FLEET_GLYPH = String.raw`block relative shrink-0 size-[23.158px]`
/* 199359:128708. Figma writes `shrink-0`; a fleet count is dynamic data, and
   this repo's text-overflow checker exists because a shrink-0 text node with
   real data pushes past its box. Swapped for min-w-px + a live ellipsis. */
const FLEET_COUNT = String.raw`[word-break:break-word] font-semibold min-w-px overflow-hidden relative text-[22px] text-foreground text-center text-ellipsis whitespace-nowrap leading-[0]`

/* 199360:129779 — the bar, and its two segments (199360:129780 / 129781). */
const BAR = String.raw`content-stretch flex gap-[1.622px] h-[15px] items-start relative shrink-0 w-full`
/* A FILL IS NOT AN INK, and this is the fill. 2026-10-22.
   This was `bg-red-700`, which is also the ink on a dark card and therefore
   has to LIGHTEN under `dark` — correct for ink, wrong for a bar, and it
   dropped the red-vs-green separation this bar exists to show from 5.46:1 to
   2.46:1. src/index.css already diagnosed that and minted --bar-fill-risk /
   --bar-fill-ok-from / --bar-fill-ok-to for exactly these three call sites
   (index.css "FLEET HEALTH BAR — A FILL IS NOT AN INK"), mapped them in
   @theme inline and gave them `dark` and `contrast` values — and then nothing
   in src/ ever consumed them. They are consumed here now. `light` does not
   move by construction (--bar-fill-risk IS var(--red-700) at :root); `dark`
   gets the 3.43:1 the token block was written to restore.
   These are also the one colour on this card that stays in the red family
   after the hue split above, and deliberately: the bar is a PROPORTION mark,
   not a status chip. Its job is healthy-vs-not separation between its own two
   segments, and the warning family cannot do that job — amber over the mint
   measures 2.4:1 in `light` and 1.3:1 in `dark`, which is the exact failure
   the token block was minted to fix. */
const BAR_RED = String.raw`bg-bar-fill-risk h-full min-w-px relative`
/* The literal this used to carry is gone. The note that stood here said "it
   needs its own token" — and it HAD one the whole time: index.css defines
   --bar-fill-ok-from / --bar-fill-ok-to as this exact pair of stops, for this
   exact gradient, with a `contrast` override, and nothing had ever consumed
   them. `light` and `dark` are byte-identical to the literals; ?theme=contrast
   now actually moves the bar, which is the whole point of that theme. */
const BAR_GREEN = String.raw`bg-gradient-to-r from-bar-fill-ok-from h-full min-w-px relative to-bar-fill-ok-to`
const BAR_L = String.raw`rounded-bl-[9068757px] rounded-tl-[9068757px]`
const BAR_R = String.raw`rounded-br-[9068757px] rounded-tr-[9068757px]`
const BAR_FULL = String.raw`rounded-[9068757px]`

/* THE SEGMENTS ARE CONTROLS, 2026-10-22. Owner, on a screenshot of the bar
   reading "3 / 48 need attention": "make these bars clcikable to systems
   table filtered". Red opens the Systems tab filtered to the half that needs
   attention, green to the half that does not.

   NOTHING ABOUT THE DRAWN GEOMETRY MOVES. The flex-grow / flexBasis:0 pair is
   the measurement the header works back from Figma's frozen `w-[18px]`, and
   the BAR_L / BAR_R / BAR_FULL radii are the node's; a segment that becomes a
   <button> keeps every one of them and adds only a reset, state styling and a
   pseudo-element that paints nothing.

   THE TAP TARGET, AND WHY IT IS THE SIZE IT IS. The bar is drawn 15px tall,
   which is not a target. `after:` grows the hit box without moving a pixel —
   the same trick SHOW_ALL makes — but the room is measured, not assumed:

     y 12..40   the 28px heading row (card pt-[12px])
     y  2..50   the "Show all" button's OWN after: box (h-36 centred in that
                row -> 8..44, inset-y-[-6px])
     y 55..70   the bar (card gap-[15px])
     y 70..99.25 the bar's label, `leading-[29.25px]` — PLAIN_COL has no gap,
                so the label line box starts the instant the bar ends

   So there are exactly 5px of free space above the bar before the "Show all"
   tap box, and 0px below before the label's line box — of which the top ~5.6px
   is half-leading and carries no glyph. 5px each way is therefore the largest
   extension that can neither steal a press from another control nor sit on
   top of type: 25px tall, past WCAG 2.5.8's 24px minimum.

   WIDTH is the fleet proportion and cannot be padded between the segments —
   two hit boxes that overlap would send a press to the WRONG filter, which is
   worse than a small target. They grow OUTWARD instead, into the 20px the
   card body already reserves (BODY is px-[20px]): the left-hand segment 20px
   left, the right-hand one 20px right, the lone full-width segment both. That
   puts a floor of 20px under a segment Figma draws at 18px, with no chance of
   a press landing on the other half of the fleet. */
const BAR_SEG_BTN = String.raw`appearance-none border-0 cursor-pointer outline-none p-0 transition-[filter,box-shadow] hover:brightness-[0.97] active:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50 after:absolute after:content-[''] after:top-[-5px] after:bottom-[-5px]`
/* Which way the hit box overhangs — see above. Mirrors the radius atoms: a
   segment that carries BAR_L is the left edge, BAR_R the right, BAR_FULL both. */
const BAR_SEG_HIT_L = String.raw`after:left-[-20px] after:right-0`
const BAR_SEG_HIT_R = String.raw`after:left-0 after:right-[-20px]`
const BAR_SEG_HIT_BOTH = String.raw`after:left-[-20px] after:right-[-20px]`

/* 199360:129782 / 199360:129783 — the bar's label. */
const BAR_LABEL_ROW = String.raw`content-stretch flex items-center justify-between relative shrink-0 w-full`
const BAR_LABEL = String.raw`[word-break:break-word] font-semibold min-w-px overflow-hidden relative text-red-400 text-lg text-ellipsis tracking-[-0.45px] whitespace-nowrap leading-[0]`
const BAR_LABEL_RUN = String.raw`leading-[29.25px]`

/* 199323:13029 — the counter row. */
const TILE_ROW = String.raw`content-stretch flex gap-[12px] items-center relative shrink-0 w-full`
/* 199323:12960 (valve) / 199323:13099 (offline) / 199323:12973 (no power).
   3 + (43 - 8) + 20 + 7 = 65px tall, comfortably past the 48dp minimum, so no
   tap-target padding is added. */
/* THE TINT IS THE COUNT, 2026-10-20. The four new variants paint a counter
   tile red when it has something in it and leave it slate when it does not:
     > 0   bg-gradient-to-b from-[#fff1f1] to-[#ffe3e3]   (199417:131415)
     = 0   bg-[var(--colors/slate/100,#f1f5f9)]           (199417:132861's
                                                           Offline / No power)
   Everything else about the two is identical, so the fill is the only switch
   and the tile keeps one set of geometry. */
const TILE = String.raw`appearance-none border-0 content-stretch cursor-pointer flex flex-[1_0_0] gap-[4px] items-center justify-center min-w-px pb-[7px] pt-[3px] px-0 relative rounded-[18px] text-left`
/* THE HOT TILE IS A SURFACE TOKEN, NOT A TINT, 2026-10-21.
   `bg-gradient-to-b from-[#fff1f1] to-[#ffe3e3]` is a LIGHT error surface with
   no theme behind it. Dropped onto the dark card it measured 16.3:1 against
   that card — brighter relative to its ground than any body text on the
   screen — while the ink that DOES theme (--foreground for the count,
   --slate-600 for the label) went near-white on top of it: 1.09:1 and 1.26:1.
   TILE_COLD (bg-slate-100) themes correctly, so the two states inverted
   relative to each other: "has a problem" read brighter than "is fine".

   This is the same failure Atlassian quantified when their light error
   surface #FFECEB was dropped on their dark page (14.46:1; their real dark
   value is 1.16:1). Of the three shipped strategies — Primer (semantic hue at
   10% alpha for the surface, 40% for the border), Carbon (abolish the tint
   outright: every notification ground is the plain layer colour) and
   Atlassian (a dark, near-chroma-free maroon) — this takes PRIMER, because
   that is the shape of the tokens this repo now ships: one --alert-surface-*
   that works on page, card and raised card, with a matching --alert-border-*.

   The border is drawn as an INSET RING, not a `border`, on purpose: the tile
   has fixed inner geometry (a 43px value row with mb-[-8px] overhanging a
   20px label row) and a real 1px border would eat a pixel off it and push
   check-text-overflow. A ring is a box-shadow and costs no layout.

   The ink is deliberately NOT moved onto --alert-ink-critical: neither the
   count nor the label is red in `light`, and both already follow the theme.
   Fixing the ground fixes the ink. */
/* RED IS WATER. AMBER IS THE DEVICE — TRIED, AND REVERTED. 2026-10-22.
   This was `bg-alert-surface-warning inset-ring inset-ring-alert-border-warning`
   for a few hours. The argument behind it was that both cards on this screen
   painted their alarm in --alert-surface-critical, so red meant "water is
   escaping" on TriageBand and "a device is broken" here. True, and not
   something to fix by painting a colour Figma does not draw: the owner saw it
   on `/` and asked "why i still see this wierd boxes and not as in figma".
   BACK TO CRITICAL, which is what every frame draws and what this constant
   held before the split. The token is the right one by measurement, not by
   name: at `light` --alert-surface-critical resolves through --red-100 to
   #ffe2e2, and Figma's tile is `bg-gradient-to-b from-[#fff1f1] to-[#ffe3e3]`
   — the token IS the gradient's end stop, to one unit per channel. No other
   token in src/index.css resolves anywhere near that family at `light`
   (--alert-surface-warning is #ffedd4, --alert-surface-success #dcfce7), so
   the choice is this token or a raw hex, and a raw hex is what the dark-mode
   pass removed. The flat fill drops the 14-unit vertical ramp; that is the
   cost of being themeable and is the same trade the file already took.
   The ink is still --foreground / --slate-600 — neither is red at `light`,
   both already theme — so nothing about contrast moves in any theme. */
const TILE_HOT = String.raw`bg-alert-surface-critical inset-ring inset-ring-alert-border-critical`
const TILE_COLD = String.raw`bg-slate-100`
/* 199417:134216 draws the lone kind as ONE tile across the card. */
const TILE_SOLO = String.raw`appearance-none border-0 content-stretch cursor-pointer flex gap-[4px] items-center justify-center pb-[7px] pt-[3px] px-0 relative rounded-[18px] shrink-0 text-left w-full`

/* 199417:131529 — the all-clear row that stands where the tiles would be.
   The ground was a frozen `bg-[#e8f5ff]`: the same class of un-themed light
   tint as TILE_HOT, just quieter, and it would have glowed on the dark card
   in exactly the same way the moment a fleet went all-clear. It is the pale
   blue informational wash this repo already names --accent (#f2f6ff in
   `light`), so it binds there. NOTE: that is a 4-unit lift off #e8f5ff in
   `light` — the closest token, not the identical one. */
/* THE THREE-TONE STATUS ROW IS GONE, 2026-10-22. STATUS_ROW / STATUS_CLEAR /
   STATUS_WATER / STATUS_RISK stood here and rendered a sentence in EVERY
   state, two of the three in copy nobody had designed. No frame draws one:
   199417:134233 ends at the solo tile, 199417:132878 and 199414:130115 end at
   the other-issues row. The chassis below is 199417:131529's own again — one
   row, one tone, drawn only when there is genuinely nothing wrong — restored
   at the shape it had before the rework (2141d10).
   It keeps `bg-accent`: the node's ground is a frozen `bg-[#e8f5ff]`, the pale
   blue informational wash this repo already names --accent (#f2f6ff at
   `light`). That is a 4-unit lift off the literal — the closest token, not the
   identical one — and the dark-mode pass took it deliberately.

   MERGE NOTE, 2026-10-22. origin/dev reverted the same invented copy on its
   own branch and arrived at the same one-row card, but kept the rework's
   chassis under it: `STATUS_ROW` + `STATUS_CLEAR`, i.e.
   `bg-alert-surface-success` with a `CircleCheck` glyph. That green is in no
   frame — it was minted for the amber/green/blue tone split the very same
   commit deleted — so taking it would have carried half the rework through a
   revert. This side is kept instead: the node's own `#e8f5ff` ground and the
   `PinLocation03` glyph the card drew before the rework (2141d10 and every
   commit before it). The SENTENCE is origin/dev's; only the box is ours. */
const CLEAR_ROW = String.raw`bg-accent content-stretch flex items-center min-h-[43px] px-[11px] py-[7px] relative rounded-[16px] shrink-0 w-full`
/* Figma writes this node `shrink-0` + `whitespace-nowrap` inside a fixed
   h-[43px], which is the fixed-artboard habit scripts/check-text-overflow.mjs
   exists to catch — the sentence carries a live fleet count. It flexes and
   may wrap, and the row above grew a min-height instead of a height so it
   follows. The string is a fixed 32 characters now that it carries no count
   ("All of your systems are running!"), which at 14px semibold is ~230px
   inside a 281px box, so the wrap never fires and this renders pixel for
   pixel as the fixed form did. scripts/check-text-overflow.mjs is what
   actually holds that. Line-height AFTER the size atom — see
   ORDER MATTERS above. */
const CLEAR_TEXT = String.raw`[word-break:break-word] flex-[1_0_0] font-semibold min-w-px relative text-slate-600 text-sm leading-[20px]`

/* ───────────────────────────────── 199338:52997 — the other-issues row.
   "14 other issues · 10 no power, 4 no recipients", full width under the
   tiles. Measured off 199417:132878: bg --colors/slate/100 (#f1f5f9, i.e.
   the TILE_COLD token), h-[43px], rounded-[16px], w-full, centred; the text
   is --colors/slate/600 (#45556c) at 14px, the leading count semibold on
   leading-[20px] and the remainder the same leading, not semibold.

   WHERE THE TWO FRAMES DISAGREE, and which one this is. 199417:132878 paints
   this row slate. 199414:130115 paints it the hot pink gradient — measured,
   not guessed: a vertical pixel run down that screenshot reads (254,240,240)
   at the row's top edge to (255,229,229) at its bottom, the same
   #fff1f1 -> #ffe3e3 ramp as the tiles above it. Nothing in the data
   distinguishes the two frames on this point: BOTH rows say "14 other
   issues", so the tint does not track the row's own count, and the only other
   difference between the frames is whether the tile beside it is hot.
   SLATE IS IMPLEMENTED, for three reasons: the 132878 measurement is a
   payload, the 130115 one is a screenshot sample; the row is a neutral
   summary of what is left over rather than an alarm, and the three tiles are
   already carrying the alarm; and slate is TILE_COLD's token, so it themes
   with no new colour. If the owner wants 130115's pink it is TILE_HOT here
   and nothing else.

   NOT TAPPABLE. The tiles are buttons and the node gives them a
   `cursor-pointer` chassis; this row has none, no chevron and no arrow glyph,
   so it is a label. It is not made interactive just because the kinds it
   names could be filtered for. */
const OTHER_ROW = String.raw`bg-slate-100 content-stretch flex items-center justify-center min-h-[43px] px-[11px] py-[7px] relative rounded-[16px] shrink-0 w-full`
/* Same nowrap/shrink-0 swap as CLEAR_TEXT, and here it earns itself: this is
   the longest string the card can draw and every clause in it is live data. */
const OTHER_TEXT = String.raw`[word-break:break-word] flex-[1_0_0] min-w-px relative text-slate-600 text-center text-sm`
const OTHER_RUN = String.raw`leading-[20px]`
const TILE_INNER = String.raw`flex flex-row items-center self-stretch`
const TILE_STACK = String.raw`content-stretch flex flex-col h-full items-center justify-center relative shrink-0`
const TILE_VALUE_ROW = String.raw`content-stretch flex h-[43px] items-center justify-center mb-[-8px] relative rounded-[16px] shrink-0 w-[89px]`
const TILE_VALUE_PAIR = String.raw`content-stretch flex gap-[4px] items-center relative shrink-0`
const TILE_GLYPH_BOX = String.raw`content-stretch flex h-[22px] items-center justify-center px-[15px] relative rounded-[16px] shrink-0 w-[30px]`
const TILE_COUNT = String.raw`[word-break:break-word] font-semibold relative shrink-0 text-[22px] text-foreground text-center whitespace-nowrap leading-[25px]`
const TILE_LABEL_ROW = String.raw`content-stretch flex items-center relative shrink-0`
const TILE_LABEL = String.raw`[word-break:break-word] flex flex-col font-medium justify-center relative shrink-0 text-slate-600 text-sm whitespace-nowrap leading-[0]`
const TILE_LABEL_RUN = String.raw`leading-5`

/* The emit gives NO colour for any glyph (every one is an <img>). They are
   tinted slate-400 — the one neutral ink this card already uses for a
   non-text mark. ValveStatus is the exception: it carries its own fills from
   the project component and ignores currentColor. */
const GLYPH_INK = String.raw`text-slate-400`

/* ------------------------------------------------------------------ model */

const fmt = (n) => Number(n ?? 0).toLocaleString('en-US')
const clampInt = (n) => Math.max(0, Math.trunc(Number(n) || 0))

/* The three tiles, in the node's order. The key is what onSelectIssue gets. */
const ISSUE_ORDER = ['valveErrors', 'offline', 'noPower']
const ISSUE_LABEL = {
  valveErrors: 'Valve errors',
  offline: 'Offline',
  noPower: 'No power',
}

/* The accessible name is the domain term, not the chip's. Figma shortens the
   visible label to fit a 393px row — "Offline", "No power" — but the rest of
   this app says "Offline systems" and "Disconnected power", and a screen
   reader should hear the word the product uses rather than the abbreviation
   the layout forced. Same split TriageBand makes. */
const ISSUE_NAME = {
  valveErrors: 'Valve errors',
  offline: 'Offline systems',
  noPower: 'Disconnected power',
}

/* ─────────────────────────────── WHAT "OTHER ISSUES" MEANS HERE.
   199338:52997 reads "14 other issues · 10 no power, 4 no recipients", and
   10 + 4 = 14, so the frame's own structure is: a leading TOTAL, then one
   clause per kind, and the total is the sum of the clauses. That structure is
   taken verbatim. What is NOT taken is the frame's choice of kinds — it names
   "no power", which has a tile two rows above it reading 0. One number cannot
   be 10 and 0 in the same card and nothing says which is stale; the header
   has recorded that contradiction since this file was written.

   So the kinds are derived instead, from exactly the data the tiles use:
   OTHER is the fault kinds this card MODELS but does not give a tile. The
   tiles are valve / offline / power (ISSUE_ORDER). PRD 09 defines a fourth
   protection check — "has at least one alert recipient" — and
   HomeAllAccounts publishes it as `issues.recipients`. That fourth check is
   the whole of what is left, so it is the whole of this row.

   The consequence worth stating: today this row only ever draws ONE clause,
   so it reads "4 other issues · 4 no recipients" and the number appears
   twice. That is what Figma's template produces at this data, and it is kept
   rather than compressed — the leading count is the row's subject and the
   clause is what names the kind, and a fifth check added later lands in
   OTHER_ORDER and the sentence grows without a rewrite. The alternative was
   re-deriving the total from somewhere else so the two numbers differed,
   which is the frame's bug. A kind that cannot be counted honestly gets no
   clause rather than an invented one — which is precisely why "no power" has
   none: it is counted, it has a tile, and it is therefore not "other". */
const OTHER_ORDER = ['noRecipients']
const OTHER_LABEL = {
  /* Figma's own wording, lower case, in the frame's clause order. */
  noRecipients: 'no recipients',
}

/* One counter tile. The three are structurally identical bar the glyph; Figma
   nests the no-power glyph+count one level shallower than the other two (it
   puts `gap-[4px]` on the 43px row instead of on an inner wrapper), which
   renders the same box. Normalised here to the two-level form.
   Everything inside a <button> has to be phrasing content, so Figma's <div>s
   become <span>s; each one already carries a `flex` display or is a flex item,
   so none of them changes box. */
function IssueTile({ issue, count, onSelect, solo = false }) {
  const label = ISSUE_LABEL[issue]
  /* `hot` is "this counter has something in it", which is also what decides
     the red — see THE TINT IS THE COUNT. A solo tile is only ever drawn for a
     kind that has something in it, so it is always hot. */
  const hot = solo || clampInt(count) > 0
  return (
    <button
      type="button"
      onClick={() => onSelect?.(issue)}
      aria-label={`${ISSUE_NAME[issue] ?? label}: ${fmt(count)}`}
      className={cn(solo ? TILE_SOLO : TILE, hot ? TILE_HOT : TILE_COLD)}
    >
      <span className={TILE_INNER}>
        <span className={TILE_STACK}>
          <span className={TILE_VALUE_ROW}>
            <span className={TILE_VALUE_PAIR}>
              {/* The valve box is `flex flex-col` in the node; the other two
                  are plain `flex`. Everything else about the three is equal. */}
              <span
                className={cn(
                  TILE_GLYPH_BOX,
                  issue === 'valveErrors' ? 'flex-col' : null,
                  GLYPH_INK,
                )}
              >
                <IssueGlyph issue={issue} />
              </span>
              <span className={cn('font-sans', TILE_COUNT)} dir="auto">
                {fmt(count)}
              </span>
            </span>
          </span>
          <span className={TILE_LABEL_ROW}>
            <span className={cn('font-sans', TILE_LABEL)}>
              <span className={TILE_LABEL_RUN}>{label}</span>
            </span>
          </span>
        </span>
      </span>
    </button>
  )
}

/* The glyph boxes, each at the size and inset the node draws it. */
function IssueGlyph({ issue }) {
  if (issue === 'valveErrors') {
    /* I199338:51778;197639:253471 — "Group", 16.009x15.283 with a 0.608px
       stroke bleed, i.e. ValveStatus' 12.5281x12 artwork box at 1.375x. */
    return (
      <span className="h-[15.283px] relative shrink-0 w-[16.009px]" data-name="Group">
        <span className="absolute inset-[-3.98%_-3.8%]">
          <ValveStatus state="error" className="block max-w-none size-full" />
        </span>
      </span>
    )
  }
  if (issue === 'offline') {
    /* 199338:51772 — an 18px frame; "elements" is inset 16.67%/8.33% with a
       -6.25%/-5% stroke bleed, which is WifiDisconnected02's own 16.5x13.5. */
    return (
      <span
        className="overflow-clip relative shrink-0 size-[18px]"
        data-name="Huge Icons / wifi-disconnected-02"
      >
        <span className="absolute inset-[16.67%_8.33%_16.67%_8.34%]" data-name="elements">
          <span className="absolute inset-[-6.25%_-5%]">
            <WifiDisconnected02 width="100%" height="100%" className="block max-w-none" />
          </span>
        </span>
      </span>
    )
  }
  /* 199338:51790 — Lucide power-off, drawn at 16px. */
  return (
    <span className="relative shrink-0 size-[16px]" data-name="Lucide Icons / power-off">
      <PowerOff size={16} aria-hidden="true" focusable="false" className="block" />
    </span>
  )
}

/**
 * One half of the progress bar.
 *
 * WITHOUT `onSelect` IT IS THE PLAIN DIV IT HAS ALWAYS BEEN — no button
 * semantics, no pointer cursor, no focus ring, nothing that promises an
 * affordance the host has not wired. That is the rule this repo keeps
 * everywhere (SystemsHealthCard's IssueTile, EventOverlayV2's rows), and it
 * matters more here than anywhere: the bar is a PROPORTION MARK first, and a
 * host that only wants to draw 3-of-48 must not ship a dead control.
 *
 * With it the segment becomes a real <button>, so Enter and Space work and
 * focus is visible, for free and correctly — not a div wearing role="button"
 * with hand-rolled key handling.
 *
 * `className` carries the fill and the radius atoms UNCHANGED and `grow` is
 * the measured proportion; the interactive branch touches neither.
 */
function BarSegment({ className, hit, grow, nodeId, segment, name, onSelect }) {
  const shared = {
    style: { flexGrow: grow, flexShrink: 0, flexBasis: 0 },
    'data-name': 'Text',
    'data-node-id': nodeId,
    'data-segment': segment,
  }
  if (!onSelect) return <div className={className} {...shared} />
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={name}
      className={cn(className, BAR_SEG_BTN, hit)}
      {...shared}
    />
  )
}

/**
 * @param {number}   total         fleet size — the "N systems" row AND the
 *                                 denominator of the progress label. See the
 *                                 244-vs-48 note above: the node carries two
 *                                 totals and this card takes one.
 * @param {number}   healthy       systems not needing attention. The red
 *                                 segment and the label's leading number are
 *                                 both `total - healthy`; it is NOT derived
 *                                 from the three counts, because the node's
 *                                 own "other issues" row proves the design has
 *                                 issue kinds beyond these three tiles.
 * @param {number}   valveErrors   the "Valve errors" tile
 * @param {number}   offline       the "Offline" tile
 * @param {number}   noPower       the "No power" tile
 * @param {number}   noRecipients  systems with no alert recipient — PRD 09's
 *                                 fourth protection check, the one with no
 *                                 tile. It feeds the other-issues row
 *                                 (199338:52997) and nothing else; it is
 *                                 already inside `attention` by way of
 *                                 `healthy`, so adding it anywhere else would
 *                                 double-count it.
 *                                 `waterEvents` STOOD HERE until 2026-10-22.
 *                                 Its only consumer was the three-tone status
 *                                 row, which no frame draws and which has been
 *                                 removed; a prop with no call site is a
 *                                 second place for the health/water separation
 *                                 to drift, so it went with the row. The
 *                                 separation is measured where the numbers
 *                                 are — `stats.healthy` vs `stats.waterEvents`
 *                                 in HomeAllAccounts — and pinned by
 *                                 src/__tests__/healthIsNotWaterEvents.dom.test.jsx.
 * @param {Function} onShowPast    the all-clear header control. The button's
 *                                 label already switched to "Show past alerts"
 *                                 at 199417:131563 but kept calling onShowAll,
 *                                 which on HomeAllAccounts then opened the
 *                                 SYSTEMS tab — a label and an action that
 *                                 disagree. (onShowAll goes to the Active
 *                                 alerts overlay now; this one still has to be
 *                                 separate, because "past" is the History tab
 *                                 and Active is the one tab that cannot
 *                                 answer it.)
 *                                 Unreachable until now (see `allClear`), so
 *                                 it had never been seen. Falls back to
 *                                 onShowAll when unwired.
 * @param {string}   unitLabel     the word after the fleet count; Figma says
 *                                 "systems", and the singular is derived
 * @param {Function} onShowAll     the "Show all" control. Owner, 2026-10-22:
 *                                 "view all opens the wrong area / currently
 *                                 systems tab / and it shall be open Active
 *                                 alerts overlay with all filter". The card
 *                                 only raises the event, so the fix is at the
 *                                 call site (HomeAllAccounts) — but the
 *                                 ACCESSIBLE NAME was this card's: it read
 *                                 "Show all systems" off `unitLabel`, which
 *                                 named the old wrong destination and would
 *                                 have kept naming it after the handler moved.
 *                                 It says "Show all alerts" now. The visible
 *                                 word is still Figma's bare "Show all"
 *                                 (I199338:52768;6724:8007) and is not touched.
 * @param {Function} onSelectIssue called with 'valveErrors' | 'offline' |
 *                                 'noPower' when a counter tile is pressed
 * @param {Function} onSelectHealth called with 'attention' or 'ok' when a
 *                                 PROGRESS-BAR SEGMENT is pressed. Owner,
 *                                 2026-10-22: "make these bars clcikable to
 *                                 systems table filtered".
 *                                 THE TWO VALUES ARE NOT THIS CARD'S
 *                                 INVENTION. They are exactly what
 *                                 src/data/systemFilters.js's `attention`
 *                                 category emits — `valueOf: s =>
 *                                 computeSystemHealth(s).allOk ? 'ok' :
 *                                 'attention'` — which is the SAME predicate
 *                                 the host counts `healthy` with. So the card
 *                                 raises a filter VALUE and the page builds
 *                                 the selection, and the table it opens can
 *                                 never disagree with the bar that launched
 *                                 it. Same shape as onSelectIssue: the card
 *                                 names what was pressed, the page owns the
 *                                 destination.
 *                                 Omit it and both segments stay plain divs
 *                                 and the bar keeps role="img" — see
 *                                 BarSegment, and `barInteractive` below.
 * @param {string}   className     appended to the card root
 */
export default function SystemHealthCard({
  total = 0,
  healthy = 0,
  valveErrors = 0,
  offline = 0,
  noPower = 0,
  noRecipients = 0,
  unitLabel = 'systems',
  onShowAll,
  onShowPast,
  onSelectIssue,
  onSelectHealth,
  className,
}) {
  const fleet = clampInt(total)
  const well = Math.min(clampInt(healthy), fleet)
  const attention = fleet - well

  const counts = {
    valveErrors: clampInt(valveErrors),
    offline: clampInt(offline),
    noPower: clampInt(noPower),
  }

  /* Which counters actually have something in them. This is what picks the
     variant below, and it is also what tints each tile. */
  const hotKinds = ISSUE_ORDER.filter((k) => counts[k] > 0)
  /* THE GATE IS THE CONJUNCTION, AND THAT IS THE WHOLE BUG FIX.
     Until 2026-10-22 the all-clear row's branch condition was
     `hotKinds.length === 0` — valve + offline + power — while `attention` is
     fleet - healthy over FOUR checks, the fourth being "has at least one
     alert recipient", which has no tile. A scope whose only fault was a
     missing recipient had three empty tiles, so the row drew, and printed
     the all-clear line directly above a bar reading
     "1 / 10 need attention". CITED AS /location/Building A here and in the
     test since 2026-10-22, and that cite was WRONG against this dataset:
     Building A is 10 of 10 healthy and shows the all-clear row legitimately.
     The scope that actually reproduces it is /location/Building B -- 10
     systems, 2 with no recipient, every other check passing -- and
     /location/Residential (50 systems, the same 2) rolls it up. Verified in
     the browser, both before and after.
     `allClear` itself has always been this conjunction; it was only ever
     spent on the header button. The ROW is gated on it now. The three-tone
     sentence that briefly stood here was a second fix for the same defect and
     is gone (see BACK TO THE FRAMES); what makes the recipients-only fault
     VISIBLE rather than merely unclaimed is the other-issues row below,
     which is the design's own answer. */
  const allClear = hotKinds.length === 0 && attention === 0

  /* The kinds the tiles do not show — see WHAT "OTHER ISSUES" MEANS HERE. */
  const otherCounts = { noRecipients: clampInt(noRecipients) }
  const otherKinds = OTHER_ORDER.filter((k) => otherCounts[k] > 0)
  const otherTotal = otherKinds.reduce((n, k) => n + otherCounts[k], 0)

  /* Both segments drop out at zero so a 1px sliver never implies a system that
     is not there; with the fleet empty the track reads as all-well. */
  const showRed = attention > 0
  const showGreen = well > 0 || !showRed

  const unit = fleet === 1 ? unitLabel.replace(/s$/, '') : unitLabel

  /* THE BAR IS A GROUP OF CONTROLS, OR IT IS A PICTURE — never both.
     role="img" is a LEAF: everything inside it is presentational, so two
     <button>s under one would be invisible to a screen reader however correct
     their markup. When the host wires the segments the wrapper becomes a
     labelled `group` and the summary survives as the group's own name; with
     no handler nothing changes and it is the picture it has always been.

     A SEGMENT AT ZERO IS NEVER A CONTROL. The red one is not DRAWN at zero
     (`showRed`), so there is nothing to make interactive. The green one is
     drawn at zero in exactly one case — an empty fleet, where `!showRed`
     hands it the full track — and a control there would promise a table of 0
     healthy systems, so it is gated on `well > 0` rather than on being drawn.
     The all-clear fleet (well === fleet > 0) still gets its control: "show me
     the systems that are fine" is a real thing to ask. */
  const barInteractive = typeof onSelectHealth === 'function'
  const redIsControl = barInteractive && showRed
  const greenIsControl = barInteractive && showGreen && well > 0

  return (
    <div className={cn(CARD, className)} data-name="IOT overview" data-node-id="199323:12124">
      {/* 199371:129896 */}
      <div className={HEAD_BLOCK} data-node-id="199371:129896">
        <div className={HEAD_ROW} data-name="Heading 1" data-node-id="199323:12127">
          <p className={cn('font-sans', HEAD_TITLE)} data-node-id="199323:12128">
            System health
          </p>
          <button
            type="button"
            onClick={allClear ? (onShowPast ?? onShowAll) : onShowAll}
            /* Both names are the DESTINATION, not the noun on the card. See
               the onShowAll note: this was `Show all ${unitLabel}`. */
            aria-label={allClear ? 'Show past alerts' : 'Show all alerts'}
            className={SHOW_ALL}
            data-name="Button"
            data-node-id="199338:52768"
          >
            <span className={cn('font-sans', SHOW_ALL_TEXT)} data-node-id="I199338:52768;6724:8007">
              {/* 199417:131563. With nothing wrong there is no "all" to show;
                  the control offers the history instead. */}
              {allClear ? 'Show past alerts' : 'Show all'}
            </span>
            <span className={cn(SHOW_ALL_ICON, GLYPH_INK)} data-name="Icon Placeholder">
              <ArrowRight
                size={16}
                strokeWidth={2}
                aria-hidden="true"
                focusable="false"
                data-name="Huge Icons / arrow-right-02"
              />
            </span>
          </button>
        </div>
      </div>

      {/* 199323:12125 */}
      <div className={BODY} data-node-id="199323:12125">
        <div className={BODY_COL} data-node-id="199323:12126">
          {/* ----------------------------------------- fleet row + progress */}
          <div className={PLAIN_COL} data-node-id="199359:128710">
            <div className={GAP_10_COL} data-node-id="199360:129785">
              {/* THE FLEET ROW IS GONE FROM THIS CARD. It was a slate-100 row
                  reading "103 systems" (199359:128709). All four of the new
                  variants take it out of the card and put the count on the
                  wave above, where SystemsOverviewHero now draws it. Moved,
                  not dropped. */}
              <div className={PLAIN_COL} data-node-id="199360:129777">
                <div className={PLAIN_COL} data-node-id="199360:129778">
                  <div
                    className={BAR}
                    data-name="Progress Bar"
                    data-node-id="199360:129779"
                    role={barInteractive ? 'group' : 'img'}
                    aria-label={`${fmt(well)} of ${fmt(fleet)} ${unit} healthy`}
                  >
                    {showRed ? (
                      <BarSegment
                        className={cn(BAR_RED, showGreen ? BAR_L : BAR_FULL)}
                        hit={showGreen ? BAR_SEG_HIT_L : BAR_SEG_HIT_BOTH}
                        grow={attention}
                        nodeId="199360:129780"
                        segment="attention"
                        /* THE NAME SAYS THE COUNT AND THE DESTINATION, and the
                           leading phrase is VERBATIM the label the filter
                           sheet shows on arrival - systemFilters.js
                           labelOf('attention') === 'Requires attention'. A
                           control that announces one wording and lands on
                           another is how a shortcut stops being trusted; the
                           pairing is pinned in systemHealthCard.dom.test.jsx
                           against the filter module itself, so it cannot
                           drift.
                           "Show these systems" is also how this app's other
                           health capsule names the same destination
                           (SystemsHealthCard's IssueTile), and it deliberately
                           does NOT say "alerts": the header button and the
                           three counter tiles on this same card open the
                           alerts overlay instead, and two destinations on one
                           card have to be tellable apart by ear. */
                        name={`Requires attention: ${fmt(attention)} of ${fmt(fleet)} ${unit}. Show these systems.`}
                        onSelect={redIsControl ? () => onSelectHealth('attention') : undefined}
                      />
                    ) : null}
                    {showGreen ? (
                      <BarSegment
                        className={cn(BAR_GREEN, showRed ? BAR_R : BAR_FULL)}
                        hit={showRed ? BAR_SEG_HIT_R : BAR_SEG_HIT_BOTH}
                        grow={well || 1}
                        nodeId="199360:129781"
                        segment="healthy"
                        /* labelOf('ok') === 'All systems good'. */
                        name={`All systems good: ${fmt(well)} of ${fmt(fleet)} ${unit}. Show these systems.`}
                        onSelect={greenIsControl ? () => onSelectHealth('ok') : undefined}
                      />
                    ) : null}
                  </div>
                </div>
                <div className={BAR_LABEL_ROW} data-node-id="199360:129782">
                  <p className={cn('font-sans', BAR_LABEL)} data-node-id="199360:129783">
                    {/* Red only when non-zero — see ZERO IS NOT RED above. */}
                    {/* 199417:131529 greys the numeral at zero rather than
                        letting it read as ink: #cad5e2, not slate-700. */}
                    <span
                      className={cn(BAR_LABEL_RUN, showRed ? 'text-red-600' : 'text-slate-300')}
                    >
                      {`${fmt(attention)} / `}
                    </span>
                    <span className={cn(BAR_LABEL_RUN, 'text-slate-700')}>
                      {`${fmt(fleet)} need attention`}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------- counter tiles */}
          <div className={GAP_10_COL} data-node-id="199360:129786">
            {/* ------------------------------------------------- the variants
                Three of them, and which one shows is decided by the data:

                  nothing wrong        199417:131529  the all-clear row
                  ONE kind has a count 199417:134216  that kind, alone, full width
                  more than one        199417:132861  all three, zeros greyed

                199414:130087 is the same three-tile frame with every counter
                non-zero, so it needs no branch of its own — TILE_HOT covers it.

                WHERE THE FRAMES DISAGREE: 199417:132861 and 199417:134216 draw
                the SAME data (1 / 48, valve 1, offline 0, power 0) two
                different ways — three tiles with two greyed, or the one kind on
                its own. That is a choice between alternatives, not two states,
                and nothing in the data can pick between them. Followed
                :134216, the rightmost of the four on the canvas and so the
                latest of the pair; it is also the one that does not spend two
                thirds of the row on zeros. Say the word and it is a one-line
                swap back.

                THE THREE ARE NO LONGER EXCLUSIVE, 2026-10-22. They were a
                three-way ternary; they are three independent conditions now,
                because the other-issues row (199338:52997) composes ON TOP of
                the tile variants rather than being a fourth one — 199414:130115
                and 199417:132878 both draw tiles AND the row, and 199417:134233
                draws tiles and no row. Each block below states its own gate.
                The all-clear row stays exclusive with the tiles by
                construction: `allClear` implies `hotKinds` is empty. */}
            {/* ────────────────────── THE ALL-CLEAR ROW
                199417:131529 draws ONE row here and draws it only when nothing
                is wrong. That is what this is again, at the shape it had at
                2141d10, with one thing changed: its gate.

                THE GATE. The branch condition was `hotKinds.length === 0`, so
                a scope whose only fault was a missing recipient — three empty
                tiles, attention 1 — printed the all-clear line directly above
                "1 / 10 need attention". It is `allClear` now, the conjunction
                of empty tiles AND nothing needing attention. See the note at
                the declaration. src/__tests__/systemHealthCard.dom.test.jsx
                pins the recipients-only case against exactly this.

                THE LINE IS THE FRAME'S: "All of your systems are running!",
                the sentence 199417:131529 draws, restored verbatim.

                "All {n} systems healthy" replaced it in d0619c5 ("Quiet-state
                copy: say what we watch, not that everything is fine"), and
                this file argued for that string on the grounds that the owner
                had ruled it. He had not — he ruled it OUT, on 2026-10-22: "i
                want you to revert all new text work we made it looks and
                sound bad", then "make it like in figma". d0619c5's line was
                invented copy like the rest of the rework and goes with it.
                origin/dev's 573b57c restored the frame's sentence against a
                fresh get_design_context on 199417:131529, and this merge
                takes that revert verbatim.

                THE REVERT IS THE SENTENCE AND NOTHING ELSE. The gate is
                `allClear`, not the `hotKinds.length === 0` this row carried
                before the rework — that was a real defect (see the note at
                the declaration) and it stays fixed. The chassis and the glyph
                are the pre-rework ones, not origin/dev's success-green
                `STATUS_ROW`; see the merge note at CLEAR_ROW. */}
            {allClear ? (
              <div className={CLEAR_ROW} data-node-id="199417:131574" data-status="clear">
                <span className={cn('relative shrink-0 size-[27px]', GLYPH_INK)} aria-hidden="true">
                  <PinLocation03 size="100%" className="absolute inset-0 block" />
                </span>
                <p className={cn('font-sans', CLEAR_TEXT)} dir="auto">
                  All of your systems are running!
                </p>
              </div>
            ) : null}

            {/* The tiles say WHICH kind. Not drawn in the all-clear state —
                199417:131529 puts the row above where they would be — and not
                drawn when nothing is in them, which is a reachable state now
                that the row above is gated on `allClear`: a recipients-only
                fault has no tile to draw, and the other-issues row below is
                what reports it. */}
            {hotKinds.length === 1 ? (
              <IssueTile
                solo
                issue={hotKinds[0]}
                count={counts[hotKinds[0]]}
                onSelect={onSelectIssue}
              />
            ) : hotKinds.length > 1 ? (
              <div className={TILE_ROW} data-node-id="199323:13029">
                {ISSUE_ORDER.map((key) => (
                  <IssueTile key={key} issue={key} count={counts[key]} onSelect={onSelectIssue} />
                ))}
              </div>
            ) : null}

            {/* ────────────────── THE OTHER-ISSUES ROW, 199338:52997
                Under the tiles, full width, in both frames that draw more than
                one tile; 199417:134233 has no such row because its solo-tile
                scope has nothing left over. That is reproduced by the DATA
                rather than by the variant: the row draws when `otherTotal` is
                non-zero, which in the solo case it is not.
                See WHAT "OTHER ISSUES" MEANS HERE for the derivation, and
                OTHER_ROW for the slate-vs-pink reading of the two frames. */}
            {otherTotal > 0 ? (
              <div className={OTHER_ROW} data-node-id="199338:52997" data-other-issues={otherTotal}>
                <p className={cn('font-sans', OTHER_TEXT)} dir="auto">
                  <span className={cn(OTHER_RUN, 'font-semibold')}>{fmt(otherTotal)}</span>
                  <span className={OTHER_RUN}>
                    {` other ${otherTotal === 1 ? 'issue' : 'issues'} · `}
                    {otherKinds.map((k) => `${fmt(otherCounts[k])} ${OTHER_LABEL[k]}`).join(', ')}
                  </span>
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
