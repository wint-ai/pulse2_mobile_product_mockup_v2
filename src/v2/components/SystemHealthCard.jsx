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
 *     "No power" tile two rows above it (10 vs 1), and "no recipients" is not
 *     a value this app models at all. It is NOT rendered here.
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
 * the same counter." Three changes carry that here, and each has its note at
 * the line it changes:
 *   · THE HUE SPLIT. The fault tiles were --alert-surface-critical, the same
 *     family TriageBand paints a live leak in. They are the WARNING family
 *     now: red means water is escaping, amber means a device cannot protect
 *     you. See TILE_HOT.
 *   · THE BAR keeps a red FILL and that is deliberate, not an oversight — it
 *     is a proportion mark, not a status chip, and the warning family cannot
 *     separate from the mint beside it. It now consumes --bar-fill-*, which
 *     src/index.css minted for these three call sites and nothing had ever
 *     used. See BAR_RED / BAR_GREEN.
 *   · THE STATUS ROW replaces the all-clear row and now renders in every
 *     state, in one of three tones. It is also where the one water-event
 *     figure on this card lives, and why. See the block at the branch.
 * The progress bar, `healthy`, `attention` and every tile stay what PRD
 * 09 says they are: the four protection checks, and nothing about leaks.
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
import { ArrowRight, CircleCheck, PowerOff } from 'lucide-react'
import { PhotoSensor3, PinLocation03, Warning, WifiDisconnected02 } from '@/v2/icons'
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
/* RED IS WATER. AMBER IS THE DEVICE. 2026-10-22.
   Owner: "we don't have the separation between system health, which is the
   errors, and water events." Part of that was arithmetic (see HomeAllAccounts'
   `stats` note) and part of it was that BOTH cards on this screen painted
   their alarm in --alert-surface-critical. Red meant "water is escaping" on
   TriageBand and "a device is broken" here, two sentences in one colour.
   The fault tiles move to the WARNING family. Nothing else about the tile
   changes: the ink is still --foreground / --slate-600 (see the note above —
   neither is red in `light` and both already theme), so this is a ground swap
   with no contrast consequence in any of the four themes.
   KNOWN OVERLAP, stated rather than hidden: a Low Flow row in the Water events
   card is also orange (--severity-low #F05C25 / --orange-600 #f54a00). The two
   never share a card, and both surfaces print their meaning in words beside
   the colour — "Low Flow" there, "Valve errors" / "Offline" / "No power" here
   — so hue is never the only carrier in either place. The alternative was
   inventing a fourth family, which the token contract forbids. */
const TILE_HOT = String.raw`bg-alert-surface-warning inset-ring inset-ring-alert-border-warning`
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
const STATUS_ROW = String.raw`content-stretch flex gap-[4px] items-center min-h-[43px] px-[11px] py-[7px] relative rounded-[16px] shrink-0 w-full`
/* Three tones, one chassis. See the STATUS ROW note at the branch below.
   `success` and `warning` take the Primer pair (10% ground / 40% border) the
   repo already ships; the middle one keeps 199417:131529's own informational
   wash, because "protected, and something IS leaking" is not an all-clear and
   must not be painted as one. */
const STATUS_CLEAR = String.raw`bg-alert-surface-success inset-ring inset-ring-alert-border-success`
const STATUS_WATER = String.raw`bg-accent`
const STATUS_RISK = String.raw`bg-alert-surface-warning inset-ring inset-ring-alert-border-warning`
/* Figma writes this node `shrink-0` + `whitespace-nowrap` inside a 43px box,
   which is the fixed-artboard habit scripts/check-text-overflow.mjs exists to
   catch: every sentence below carries a live count and the risk line is the
   longest string on the card. It flexes and wraps, and the row grew a
   min-height instead of a height so it follows. */
const STATUS_TEXT = String.raw`[word-break:break-word] flex-[1_0_0] font-semibold min-w-px relative text-slate-700 text-sm leading-[18px]`
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
 * @param {number}   waterEvents   ACTIVE WATER EVENTS IN SCOPE. It is NOT a
 *                                 health input and is deliberately absent from
 *                                 `healthy`, from `attention`, from the
 *                                 progress bar and from every tile — PRD
 *                                 03-home-screen.md:207, "leaks aren't a
 *                                 'Systems Health' gap". It reaches exactly
 *                                 one place: the all-clear sentence, which is
 *                                 the one line on this card that makes a claim
 *                                 about the WHOLE scope rather than about a
 *                                 counter. A card that said "all 10 systems
 *                                 protected" in success green over a scope
 *                                 with two live leaks would be a true number
 *                                 making a false claim, so the green state is
 *                                 gated on both dimensions and the amber/blue
 *                                 one names the other. See the STATUS ROW note.
 * @param {Function} onShowPast    the all-clear header control. The button's
 *                                 label already switched to "Show past alerts"
 *                                 at 199417:131563 but kept calling onShowAll,
 *                                 which on HomeAllAccounts opens the SYSTEMS
 *                                 tab — a label and an action that disagree.
 *                                 Unreachable until now (see `allClear`), so
 *                                 it had never been seen. Falls back to
 *                                 onShowAll when unwired.
 * @param {string}   unitLabel     the word after the fleet count; Figma says
 *                                 "systems", and the singular is derived
 * @param {Function} onShowAll     the "Show all" control
 * @param {Function} onSelectIssue called with 'valveErrors' | 'offline' |
 *                                 'noPower' when a counter tile is pressed
 * @param {string}   className     appended to the card root
 */
export default function SystemHealthCard({
  total = 0,
  healthy = 0,
  valveErrors = 0,
  offline = 0,
  noPower = 0,
  waterEvents = 0,
  unitLabel = 'systems',
  onShowAll,
  onShowPast,
  onSelectIssue,
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
  const allClear = hotKinds.length === 0 && attention === 0
  const leaks = clampInt(waterEvents)
  const sys = (k) => (k === 1 ? unitLabel.replace(/s$/, '') : unitLabel)

  /* Both segments drop out at zero so a 1px sliver never implies a system that
     is not there; with the fleet empty the track reads as all-well. */
  const showRed = attention > 0
  const showGreen = well > 0 || !showRed

  const unit = fleet === 1 ? unitLabel.replace(/s$/, '') : unitLabel

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
            aria-label={allClear ? 'Show past alerts' : `Show all ${unitLabel}`}
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
                    role="img"
                    aria-label={`${fmt(well)} of ${fmt(fleet)} ${unit} healthy`}
                  >
                    {showRed ? (
                      <div
                        className={cn(BAR_RED, showGreen ? BAR_L : BAR_FULL)}
                        style={{ flexGrow: attention, flexShrink: 0, flexBasis: 0 }}
                        data-name="Text"
                        data-node-id="199360:129780"
                        data-segment="attention"
                      />
                    ) : null}
                    {showGreen ? (
                      <div
                        className={cn(BAR_GREEN, showRed ? BAR_R : BAR_FULL)}
                        style={{ flexGrow: well || 1, flexShrink: 0, flexBasis: 0 }}
                        data-name="Text"
                        data-node-id="199360:129781"
                        data-segment="healthy"
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
                swap back. */}
            {/* ─────────────────────────────────── THE STATUS ROW
                199417:131529 draws ONE row here and draws it only when nothing
                is wrong. Three things were wrong with that, and all three are
                fixed in this block.

                1. IT WAS GATED ON THE TILES, NOT ON HEALTH. The condition was
                   `hotKinds.length === 0`, i.e. valve + offline + power. But
                   `attention` is fleet - healthy, and src/utils/systemHealth.js
                   counts a FOURTH check this card has no tile for: at least one
                   alert recipient. A scope whose only fault is a missing
                   recipient has three empty tiles and a non-zero attention —
                   so the card printed "All 10 systems healthy" directly under a
                   bar reading "1 / 10 need attention". That is live today on
                   /location/Building A. It is gated on `allClear` now, which is
                   the conjunction of both.

                2. WATER EVENTS WERE NOT IN THE SENTENCE. A fleet can be 100%
                   protected and leaking — that is the whole point of the
                   separation this change exists to make, and it is the case the
                   owner described. The old line said "All 10 systems healthy"
                   over two active leaks: a true statement that reads as
                   "nothing is happening". Green is gated on BOTH dimensions
                   now; with a leak the row keeps 131529's own informational
                   wash and names the leak instead. That is the ONLY place a
                   water count reaches this card — not the bar, not a tile, not
                   `attention` — because it is the only line here that makes a
                   claim about the whole scope rather than about one counter.

                3. "UNPROTECTED" LOOKED LIKE NOTHING. With a fault this slot was
                   simply empty — the card said what KIND of fault in the tiles
                   and never what a fault COSTS. An offline system reports zero
                   water events, which on a screen full of leak counts reads as
                   the good row. It is the worst one: the ability to see a leak
                   there is gone. The risk line says so, in words, on the
                   warning ground the tiles now share.

                THE ALL-CLEAR LINE IS THE OWNER'S, not mine: "All {n} systems
                healthy", ruled in d0619c5 and restored here after this card
                briefly replaced it. The other two tones have no ruled string —
                199417:131529 is the only state Figma draws and there is no
                frame for either of them (see line 49) — so that copy is mine.
                "may miss a leak or fail to stop it" is the one phrase true of
                all four PRD-09 checks at once: comm, power and recipients break
                SEEING it, a valve error breaks STOPPING it. */}
            <div
              className={cn(
                STATUS_ROW,
                allClear ? (leaks === 0 ? STATUS_CLEAR : STATUS_WATER) : STATUS_RISK,
              )}
              data-node-id="199417:131574"
              data-status={allClear ? (leaks === 0 ? 'clear' : 'water') : 'risk'}
            >
              <span
                className={cn(
                  'relative shrink-0 flex size-[27px] items-center justify-center',
                  allClear
                    ? leaks === 0 ? 'text-alert-ink-success' : GLYPH_INK
                    : 'text-alert-ink-warning',
                )}
                aria-hidden="true"
              >
                {allClear ? (
                  leaks === 0 ? (
                    <CircleCheck size={22} strokeWidth={2} className="block" />
                  ) : (
                    <PinLocation03 size="100%" className="absolute inset-0 block" />
                  )
                ) : (
                  <Warning size={22} className="block" />
                )}
              </span>
              <p className={cn('font-sans', STATUS_TEXT)} dir="auto">
                {allClear ? (
                  leaks === 0 ? (
                    /* THE RULED LINE, restored verbatim from d0619c5
                       ("Quiet-state copy: say what we watch, not that
                       everything is fine"). Four research passes stand behind
                       it and the owner's own note is in that commit: "too much
                       negative… I want them to act — use us to look for abnormal
                       patterns". It borrows the card's own title rather than
                       naming the four checks — the header already says System
                       health; the owner, on the line that named them: "user
                       dont knows the check". "All N systems protected · no
                       water events" stood here briefly, written without knowing
                       this existed. It is quoted copy, so it keeps its own
                       singular/plural rather than borrowing `sys()`; the two
                       spell the same word at the default unitLabel. */
                    `All ${fmt(fleet)} ${fleet === 1 ? 'system' : 'systems'} healthy`
                  ) : (
                    <>
                      {/* NOT the all-clear state and so not the ruled line: the
                          fleet is protected AND water is moving. Figma draws no
                          frame for this one (line 49), so the copy is mine. */}
                      {`All ${fmt(fleet)} ${sys(fleet)} protected`}
                      {' · '}
                      <span className="text-red-700">
                        {`${fmt(leaks)} water ${leaks === 1 ? 'event' : 'events'} active`}
                      </span>
                    </>
                  )
                ) : (
                  `${fmt(attention)} ${sys(attention)} may miss a leak or fail to stop it`
                )}
              </p>
            </div>

            {/* The tiles say WHICH kind. They are the design's three variants
                minus the all-clear one, which the row above now owns outright:
                a scope can need attention with every tile at zero (point 1
                above) and three zeros would be the quiet screen all over
                again. */}
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
          </div>
        </div>
      </div>
    </div>
  )
}
