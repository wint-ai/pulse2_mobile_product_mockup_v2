/**
 * TriageBand — the Account/Location screen's "Water events" card.
 *
 * SOURCE NODES (read off the emitted React+Tailwind on disk, NOT re-fetched):
 *   alert  199323:12113  -> the card is 199359:128986, body 199359:129095
 *   calm   199371:137019 -> the card is 199371:137191, body 199371:137293
 * It sits between SystemHealthCard (199323:12124) and the consumption card
 * (199323:12260), and is the design's own "IOT overview" chassis — the same
 * shell SystemHealthCard draws, with a different heading and body.
 *
 * WHY THIS EXISTS. The overview answered "how many" and never "where". The
 * events already carry the answer — systemName, location, address, type,
 * duration — and this is the surface that prints it. That part is unchanged.
 * What changed with this revision is the PRESENTATION: the previous layout
 * (3-up stat row, proportion strip, two-link footer) was written from UX
 * research before 199359:129095 could be opened, and is replaced wholesale by
 * what the node actually draws. The behaviour below — the props, the
 * worst-first ranking, the row-as-button, the location line — is kept.
 *
 * WHAT THE NODE DRAWS
 *   chassis   199359:128986  #fafbfc / 1px white / rounded 22 / pt-12 pb-16,
 *                            gap-[12px] in alert, gap-[20px] in calm
 *   heading   199359:128989  28px row, px-20: "Water events" + a count pill,
 *                            and ONE trailing button, 99x36
 *   body      199359:129095  px-16, gap-[10px]: a 1px rule ABOVE every row
 *   row       199359:129097  py-12, rounded-14; 31px waves badge, gap-7, then
 *                            [name / city · address]  <->  [duration / kind]
 *   empty     199371:137293  h-178, centred: title + sub, then a #daecff tip
 *
 * ---------------------------------------------------------------- locA / locB
 *
 * The two states disagree in five places, all of them real:
 *
 *  1. CHASSIS GAP. alert gap-[12px]; calm gap-[20px] h-[252px]. Both gaps are
 *     carried. The explicit 252px height is NOT: 12+28+20+178+16 = 254, so the
 *     number is a Figma rounding of its own content, and pinning it would only
 *     fight the content once the illustration below goes missing.
 *  2. COUNT PILL FILL. alert red/600 #e7000b; calm slate/200 #e2e8f0.
 *     Carried.
 *  3. COUNT PILL INK. BOTH states write #fafbfc in Figma. On the calm pill
 *     that is #fafbfc on #e2e8f0 — about 1.3:1, invisible. This is the one
 *     place the design is overridden: the zero pill takes slate/600 #45556c
 *     ink (the card's own neutral, already on the button beside it).
 *     Reported. Phase 4 tokenised both without touching the override: the
 *     alert pill's ink is now `text-ink-on-color` (near-white ON A COLOURED
 *     CHIP, which stays light under every theme — NOT the card surface,
 *     which inverts), and the calm pill keeps `text-slate-600`.
 *  4. THE TRAILING BUTTON. alert "Show all"; calm "Show past events". Same
 *     node slot, same 99x36 box, same style — the design switches the LABEL
 *     and nothing else. So does this component (see `action` below).
 *     The 99px width is kept only for "Show all"; "Show past events" does not
 *     fit 99px at 14px and Figma lets it bleed out of its own box, which is
 *     not something to reproduce. It is `justify-end` + nowrap, so dropping
 *     the fixed width grows it leftwards — exactly what the frame shows.
 *  5. THE BODY. alert = rows; calm = the empty state. Both implemented.
 *
 * ------------------------------------------------------------------ dropped
 *
 * THE 8px DOT (199375:140668, asset 69b0d.svg). The first row of locA draws an
 * 8px ellipse before its duration; rows 2, 3 and 4 do not. It is NOT rendered
 * here, and that is an evidence-based call rather than a shrug: the same row
 * component in the full events list (199375:138276) carries the dot on 3 of
 * its 6 rows, and those three are identical to the other three in every other
 * respect — same red/100 badge, same red/700 duration, same slate/800 "High
 * Flow", all six under the "Active" tab. The dot correlates with nothing
 * observable, and being an <img> it carries no colour either. There is no
 * reading of it that could be implemented without inventing both a meaning
 * and a value.
 *
 * THE EMPTY STATE'S THREE IMAGES. All are <img> pointing at Figma asset URLs,
 * which expire in ~7 days and must never be referenced at runtime:
 *   · 199375:138265 — a 90x89.308 raster screenshot behind a #daecff
 *     multiply wash. A photo; there is nothing to inline.
 *   · 199375:139484 — "Huge Icons / ai-magic", 57px, absolutely placed over
 *     that screenshot.
 *   · 199375:139972 — "Huge Icons / token-circle", 33px, leading the tip.
 *   The emit gives each a box and no geometry, so none can be redrawn and no
 *   substitute could be more than a guess at which glyph it is. All three are
 *   decorative (no text, no semantics), so the empty state loses its
 *   illustration and keeps every word. The body KEEPS h-[178px] so the card
 *   still stands at the design's height rather than collapsing round the gap.
 *
 * THE "Show all" DROP-SHADOW. Both layers resolve to a transparent colour at
 * 0/0/0 — the same verified no-op SystemHealthCard dropped.
 *
 * ------------------------------------------------------------ substitutions
 *
 *   aadb2.svg  Phosphor Icons / waves    -> <Waves/> (v2/icons), 17.947px
 *   08c33.svg  Huge Icons / arrow-right-02 -> lucide <ArrowRight/>, size 16
 *              (the same two swaps SystemHealthCard documents and makes)
 *   6c479.svg  "Line 6", the 1px row rule -> a border, slate/200 #e2e8f0
 *   b6334.svg  "Line 1", the 12px city/address tick -> ditto
 *   Neither line carries a colour in the emit. slate/200 is this repo's
 *   established hairline token (ActivePolicyCard, AlertCard, EventOverlayV2).
 *
 * LOW FLOW HAS NO DESIGN. Every row in locA — and all six in the full events
 * list — is a HIGH flow row: red/100 badge, red/700 duration. The node never
 * draws a low-flow row, so its tone is not invented here either; it is taken
 * from this project's existing Figma-sourced water palette, which
 * ActiveWaterEventsCard and EventOverlayV2 already share: orange/100 #ffedd4
 * behind the badge, orange/600 #f54a00 on the duration.
 * The glyph itself has no colour in the emit (it is an <img>); it is tinted
 * with its row's own ink, the only ink the row has.
 *
 * WIDTHS. Figma freezes the row's text column at `w-[215px] shrink-0` and
 * marks every text node `shrink-0`, because on a 375 artboard nothing ever
 * has to shrink. With real system names and real addresses that is the exact
 * bug scripts/check-text-overflow.mjs exists to catch, so the column flexes
 * (`flex-[1_0_0] min-w-px`) and each text node gets min-w-px + a live
 * ellipsis instead. At 375 this reproduces the frame; past it, it survives.
 *
 * FROZEN COPY, FLAGGED. The empty state's tip reads "Leak prevention for your
 * system can prevent up to 25K L loss". 25K is not derived from anything and
 * is not a prop; it is what 199375:139984 says, carried verbatim.
 *
 * ACCESSIBILITY
 *   · The 99x36 button is under 48dp, so it carries the same `after:` pad
 *     SystemHealthCard uses — 36 + 2x6 = 48 — without moving a pixel.
 *   · A row is 12 + 41.5 + 12 = 65.5px. Already past 48dp.
 *   · Severity is never colour alone: "High Flow" / "Low Flow" is printed on
 *     every row, which is the design's own doing.
 *   · Visible labels stay Figma's ("Show all", "High Flow"); accessible names
 *     use the product's vocabulary ("View all 4 water events", "High flow").
 *     Same split SystemHealthCard makes.
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
import { ArrowRight } from 'lucide-react'
import { Waves } from '@/v2/icons'
import { cn } from '@/lib/utils'

/* ----------------------------------------------------------------- type */

/* Figma names the family per weight; the fallbacks are this project's. */

/* NOTE ON CLASS ORDER. Every string below spells `leading-[…]` AFTER its
   `text-[length:…]` / `text-[Npx]`, which is the reverse of Figma's
   alphabetical emit. cn() is tailwind-merge, and it treats a line-height atom
   as conflicting with a font-size atom — emitted order silently deletes the
   leading. And every string carrying a backslash is String.raw: a plain
   literal turns \/ into a bare /, which Tailwind reads as an opacity
   modifier, and the class applies nothing. */

/* --------------------------------------------------------------- chassis */

/* 199359:128986 (alert) / 199371:137191 (calm). */
const CARD = String.raw`bg-surface-card border border-solid border-card content-stretch flex flex-col items-center pb-[16px] pt-[12px] relative rounded-[22px] shrink-0 w-full`
const CARD_GAP_ALERT = String.raw`gap-[12px]`
const CARD_GAP_CALM = String.raw`gap-[20px]`

/* 199359:128987 / 128988 / 128989 — Figma nests three frames to put px-[20px]
   on the outer one and the 28px rule on the inner. Kept as drawn; note the
   heading is px-20 while the body below is px-16, so the rows sit 4px wider
   than the title. That is the design, not a slip. */
const HEAD_WRAP = String.raw`content-stretch flex flex-col items-start justify-center px-[20px] relative shrink-0 w-full`
const HEAD_COL = String.raw`content-stretch flex flex-col items-start relative shrink-0 w-full`
const HEAD_ROW = String.raw`content-stretch flex h-[28px] items-center justify-between relative shrink-0 w-full`
const HEAD_LEFT = String.raw`content-stretch flex gap-[12px] items-center relative shrink-0`

/* 199359:128991 */
const HEAD_TITLE = String.raw`[word-break:break-word] font-medium relative shrink-0 text-foreground text-sm whitespace-nowrap leading-5`

/* 199359:128992 / 128993 — the count pill. */
const PILL = String.raw`content-stretch flex flex-col items-center justify-center px-[6px] relative rounded-[10px] shrink-0`
const PILL_ALERT = String.raw`bg-red-600`
const PILL_CALM = String.raw`bg-slate-200`
const PILL_TEXT = String.raw`[word-break:break-word] font-medium relative text-base text-center tracking-[-0.4px] w-full leading-[22px]`
const PILL_INK_ALERT = String.raw`text-ink-on-color`
/* See note 3 at the top: Figma's #fafbfc on #e2e8f0 is unreadable. */
const PILL_INK_CALM = String.raw`text-slate-600`

/* 199359:128994 / 199371:137199 — one button, two labels. */
const ACTION = String.raw`appearance-none bg-transparent border-0 content-stretch cursor-pointer flex gap-1.5 h-[36px] items-center justify-end px-0 py-0 relative rounded-[26px] shrink-0 after:absolute after:content-[''] after:inset-x-0 after:inset-y-[-6px]`
const ACTION_FIXED_W = String.raw`w-[99px]`
const ACTION_TEXT = String.raw`[word-break:break-word] font-medium relative shrink-0 text-slate-600 text-sm whitespace-nowrap leading-5`
const ACTION_ICON = String.raw`content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[16px] text-slate-600`

/* ------------------------------------------------------------------ rows */

/* 199359:129095 — the Body wrapper. */
const BODY = String.raw`content-stretch flex flex-col gap-[10px] items-center px-4 relative shrink-0 w-full`

/* 199375:140741 / 140740 / 140738 / 140742 — a 1px rule above EVERY row,
   including the first; there is none after the last. */
const RULE = String.raw`border-border border-solid border-t h-0 relative shrink-0 w-full`

/* 199359:129097 and its three siblings. */
const ROW = String.raw`appearance-none bg-transparent border-0 content-stretch cursor-pointer flex flex-col gap-2 items-start px-0 py-[12px] relative rounded-[14px] shrink-0 text-left w-full`
const ROW_STATIC = String.raw`appearance-none bg-transparent border-0 content-stretch cursor-default flex flex-col gap-2 items-start px-0 py-[12px] relative rounded-[14px] shrink-0 text-left w-full`
/* rounded-[14px] on a transparent row is there for a pressed fill; the fill
   itself is the one the previous implementation already shipped, kept so the
   row does not lose its affordance feedback. */
const ROW_HOVER = String.raw`hover:bg-slate-100`

const ROW_INNER = String.raw`content-stretch flex gap-[7px] items-center relative shrink-0 w-full`
const BADGE_COL = String.raw`content-stretch flex flex-col items-center relative shrink-0`
const BADGE = String.raw`content-stretch flex flex-col gap-[2.583px] items-center justify-center overflow-clip px-[5.167px] py-[1.292px] relative rounded-[16.792px] shrink-0 size-[31px]`
const BADGE_ICON_WRAP = String.raw`content-stretch flex flex-col items-start relative shrink-0`

const ROW_MAIN = String.raw`content-stretch flex flex-[1_0_0] items-center justify-between min-w-px relative`
/* Figma: w-[215px] shrink-0. See the WIDTHS note. */
const ROW_TEXT = String.raw`content-stretch flex flex-[1_0_0] flex-col gap-[3px] items-start min-w-px relative`
const NAME_ROW = String.raw`content-stretch flex items-center min-w-px relative w-full`
const NAME = String.raw`[word-break:break-word] font-semibold min-w-px overflow-hidden relative text-foreground text-base text-ellipsis whitespace-nowrap leading-[22px]`

/* 199364:129818 — the location line. This is the entire point of the widget:
   the screen had no "where" before it. Figma prints city, a 12px tick, then
   the street address. */
const WHERE_ROW = String.raw`content-stretch flex gap-[5px] items-center relative shrink-0 w-full`
const CITY = String.raw`[word-break:break-word] font-normal min-w-px overflow-hidden relative text-muted-foreground text-xs text-ellipsis whitespace-nowrap leading-[16.5px]`
/* 199364:129820 — a 12px line, rotated 90deg into a zero-width box. */
const WHERE_TICK = String.raw`border-border border-l border-solid h-[12px] relative shrink-0 w-0`
const ADDRESS = String.raw`[word-break:break-word] flex-[1_0_0] font-normal min-w-px overflow-hidden relative text-[12px] text-muted-foreground text-ellipsis whitespace-nowrap leading-[16.5px]`

/* 199364:129817 — duration over kind, right-aligned. */
const META_COL = String.raw`content-stretch flex flex-col gap-[3px] items-center justify-center relative shrink-0`
const DUR_ROW = String.raw`content-stretch flex gap-[5px] h-[20px] items-center relative shrink-0`
const DURATION = String.raw`[word-break:break-word] font-medium min-w-px overflow-hidden relative text-[12px] text-ellipsis whitespace-nowrap leading-4`
const KIND = String.raw`[word-break:break-word] font-normal min-w-px overflow-hidden relative text-[12px] text-slate-800 text-ellipsis whitespace-nowrap leading-[16.5px]`

/* ------------------------------------------------------------ empty state */

/* 199371:137293 — h-[178px] kept so the card keeps its height without the
   illustration; see the DROPPED note. */
const EMPTY_BODY = String.raw`content-stretch flex flex-col gap-[13px] h-[178px] items-center justify-center px-4 relative shrink-0 w-full`
const EMPTY_TEXT = String.raw`content-stretch flex flex-col gap-[6px] items-center relative shrink-0 w-full`
/* Figma h-[98px] on this row budgets for the 89px screenshot beside the copy;
   with no screenshot it would be 50px of hole, so the row sizes to its copy
   and centres it. */
const EMPTY_HERO = String.raw`content-stretch flex gap-[14px] items-center justify-center relative shrink-0 w-full`
const EMPTY_COPY = String.raw`[word-break:break-word] content-stretch flex flex-col gap-[9px] items-center justify-center relative shrink-0 text-center whitespace-nowrap`
const EMPTY_TITLE = String.raw`font-semibold relative shrink-0 text-slate-800 text-lg tracking-[-0.45px] leading-[18px]`
const EMPTY_SUB = String.raw`font-normal relative shrink-0 text-muted-foreground text-sm leading-5`

/* 199375:139983 / 139984 — the tip. */
const TIP = String.raw`bg-[#daecff] content-stretch flex gap-[10px] h-[65px] items-center px-[7px] relative rounded-[14px] shrink-0 w-full`
/* 199375:139984 is a WRAPPER around a <p>, and the distinction is the whole
   bug. Figma's vertical-centring idiom for a text node is
   `flex flex-col justify-center leading-[0] text-[0px]`, and it works there
   because the node holds exactly one child. This tip holds THREE runs — the
   sentence, a 12px "L", and " loss" — and putting that idiom on the <p>
   itself made each run a flex ITEM, so they stacked into four lines inside a
   65px box and spilled out of it. The owner: "this is broken".
   The wrapper carries the idiom; the <p> stays a paragraph and its spans stay
   inline.
   Resolved against the tokenization branch 2026-10-21: the STRUCTURE is the
   fix, the CLASSES are the token layer's (text-primary, leading-5). */
const TIP_TEXT = String.raw`[word-break:break-word] flex flex-col justify-center leading-[0] relative shrink-0 text-[0px] w-[214px]`
const TIP_P = String.raw`font-normal text-primary`
/* 199375:139972 "Huge Icons / token-circle", 33px. It was missing entirely —
   the tip rendered as a bare band of text. Inlined rather than referenced
   from figma.com, whose asset URLs expire in about a week. */
const TIP_ICON = String.raw`relative shrink-0 size-[33px] rounded-[137.5px]`
const TIP_RUN = String.raw`text-[14px] leading-5`
const TIP_UNIT = String.raw`[word-break:break-word] font-normal text-[12px] tracking-[0.12px] leading-[16px]`

/* ----------------------------------------------------------------- tones */

/* High flow is the only tone the node ever draws. See the LOW FLOW note. */
const TONE = {
  high: {
    label: 'High Flow',   // visible: Figma's casing
    name: 'High flow',    // accessible: the product's
    badge: String.raw`bg-red-100`,
    ink: String.raw`text-red-700`,
  },
  low: {
    label: 'Low Flow',
    name: 'Low flow',
    badge: String.raw`bg-orange-100`,
    ink: String.raw`text-orange-600`,
  },
}

/* ----------------------------------------------------------------- model */

/* How many rows ride under the heading. The node draws FOUR, with a count
   pill reading 4 — so every event it has is on screen and the frame cannot
   say where it would have stopped. Four is the number it shows, and the
   "Show all" button in the heading carries the rest either way. */
const PREVIEW_ROWS = 4

/** Minutes from a display duration ("6h 36m"), for ranking. */
function minutesOf(duration) {
  const m = /(?:(\d+)\s*d)?\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/.exec(duration || '')
  return m ? (+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0
}

/* ------------------------------------------------------------------- row */

function EventRow({ event, onSelect }) {
  const tone = event.type === 'leak-high' ? TONE.high : TONE.low

  /* Figma prints BOTH levels — "San Fransisco · 1775 Washington St, Hanover
     MA 2339" — and the live mapping supplies both. Either can be blank on
     some scopes, in which case the tick between them goes too rather than
     dangling beside nothing. */
  const city = event.location || ''
  const address = event.address || ''
  const where = [city, address].filter(Boolean).join(', ')

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      className={cn(onSelect ? cn(ROW, ROW_HOVER) : ROW_STATIC)}
      /* Opens with the system name and closes with the duration — both are
         load-bearing: v2ControlsWired.dom.test.jsx splits on the first comma
         to get the system, and matches /running \d/ on the tail. */
      aria-label={`${event.systemName}, ${tone.name}, ${where}, running ${event.duration}`}
      data-node-id="199359:129097"
    >
      <span className={ROW_INNER} data-node-id="I199359:129097;199344:113156">
        <span className={BADGE_COL}>
          <span className={cn(BADGE, tone.badge, tone.ink)} data-name="Badge">
            <span className={BADGE_ICON_WRAP} data-name="leftIcon">
              <Waves size={17.947} data-name="Phosphor Icons / waves" />
            </span>
          </span>
        </span>

        <span className={ROW_MAIN} data-node-id="I199359:129097;199344:113165">
          <span className={ROW_TEXT} data-node-id="I199359:129097;199364:129816">
            <span className={NAME_ROW}>
              <span className={cn('font-sans', NAME)}>{event.systemName}</span>
            </span>
            <span className={WHERE_ROW} data-node-id="I199359:129097;199364:129818">
              {city && <span className={cn('font-sans', CITY)}>{city}</span>}
              {city && address && (
                <span className={WHERE_TICK} aria-hidden="true" data-node-id="I199359:129097;199364:129820" />
              )}
              {address && <span className={cn('font-sans', ADDRESS)}>{address}</span>}
            </span>
          </span>

          <span className={META_COL} data-node-id="I199359:129097;199364:129817">
            <span className={DUR_ROW}>
              <span className={cn('font-sans', DURATION, tone.ink)}>{event.duration}</span>
            </span>
            <span className={cn('font-sans', KIND)}>{tone.label}</span>
          </span>
        </span>
      </span>
    </button>
  )
}

/* ------------------------------------------------------------- component */

/**
 * @param {Array}    events        water events; each {id, systemName,
 *                                 location, address, type, duration}
 * @param {Function} onSelectEvent called with the event a row opens
 * @param {Function} onViewAll     the heading button while there are events
 * @param {Function} onShowPast    the heading button while there are none —
 *                                 the one-tap route to the overlay's History
 *                                 tab, which is where the design puts it
 * @param {string}   className     appended to the card root
 */
export default function TriageBand({
  events = [],
  onSelectEvent,
  onViewAll,
  onShowPast,
  className,
}) {
  // Worst first. A high flow outranks a low flow; within a kind, the longest
  // running wins. `duration` is a display string, so it is parsed back to
  // minutes — compared as text, "11h 58m" sorts BEFORE "2h 05m", backwards.
  const ranked = [...events].sort((a, b) => {
    const sev = e => (e.type === 'leak-high' ? 1 : 0)
    return sev(b) - sev(a) || minutesOf(b.duration) - minutesOf(a.duration)
  })
  const preview = ranked.slice(0, PREVIEW_ROWS)
  const hasEvents = ranked.length > 0

  /* ONE button, as the design draws it: "Show all" over rows, "Show past
     events" over the empty state. If the state's own handler is missing the
     other takes the slot rather than the control being drawn dead — the band
     never shows a route that goes nowhere, and never hides one that works.

     "Show all" is Figma's shorthand, so its accessible name spells the
     product's sentence instead. "Show past events" is ALREADY the product's
     own wording — it is the phrase ActiveWaterEventsCard shipped and the
     phrase overlayHistoryRows.dom.test.jsx names this control by — so it is
     left as the accessible name rather than paraphrased. */
  const action = hasEvents
    ? (onViewAll
        ? { label: 'Show all', name: `View all ${events.length} water events`, onClick: onViewAll, fixed: true }
        : onShowPast && { label: 'Show past events', name: 'Show past events', onClick: onShowPast })
    : (onShowPast
        ? { label: 'Show past events', name: 'Show past events', onClick: onShowPast }
        : onViewAll && { label: 'Show all', name: 'View all water events', onClick: onViewAll, fixed: true })

  return (
    <div
      className={cn(CARD, hasEvents ? CARD_GAP_ALERT : CARD_GAP_CALM, className)}
      data-name="IOT overview"
      data-node-id={hasEvents ? '199359:128986' : '199371:137191'}
    >
      {/* ------------------------------------------------------- heading */}
      <div className={HEAD_WRAP} data-node-id="199359:128987">
        <div className={HEAD_COL} data-node-id="199359:128988">
          <div className={HEAD_ROW} data-name="Heading 1" data-node-id="199359:128989">
            <div className={HEAD_LEFT} data-node-id="199359:128990">
              <p className={cn('font-sans', HEAD_TITLE)} data-node-id="199359:128991">
                Water events
              </p>
              <div
                className={cn(PILL, hasEvents ? PILL_ALERT : PILL_CALM)}
                data-node-id="199359:128992"
              >
                <p className={cn('font-sans', PILL_TEXT, hasEvents ? PILL_INK_ALERT : PILL_INK_CALM)}>
                  {events.length}
                </p>
              </div>
            </div>

            {action && (
              <button
                type="button"
                onClick={action.onClick}
                aria-label={action.name}
                className={cn(ACTION, action.fixed && ACTION_FIXED_W)}
                data-name="Button"
                data-node-id="199359:128994"
              >
                <span className={cn('font-sans', ACTION_TEXT)}>{action.label}</span>
                <span className={ACTION_ICON} data-name="Icon Placeholder">
                  <ArrowRight
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                    focusable="false"
                    data-name="Huge Icons / arrow-right-02"
                  />
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- body */}
      {hasEvents ? (
        <div className={BODY} data-name="Body wrapper" data-node-id="199359:129095">
          {preview.map((e, i) => (
            <div key={e.id ?? i} className="contents">
              <div className={RULE} aria-hidden="true" />
              <EventRow event={e} onSelect={onSelectEvent && (() => onSelectEvent(e))} />
            </div>
          ))}
        </div>
      ) : (
        <div className={EMPTY_BODY} data-name="Body wrapper" data-node-id="199371:137293">
          <div className={EMPTY_TEXT} data-name="Text" data-node-id="199375:138169">
            <div className={EMPTY_HERO} data-node-id="199375:138170">
              <div className={EMPTY_COPY} data-node-id="199375:140910">
                <p className={cn('font-sans', EMPTY_TITLE)} dir="auto" data-node-id="199375:138171">
                  No active water events
                </p>
                <p className={cn('font-sans', EMPTY_SUB)} data-node-id="199375:138172">
                  Everything looks good!
                </p>
              </div>
            </div>

            <div className={TIP} data-node-id="199375:139983">
              <span
                className={TIP_ICON}
                data-name="Huge Icons / token-circle"
                data-node-id="199375:139972"
                aria-hidden="true"
              >
                <svg viewBox="0 0 29.5625 29.5625" fill="none" className="absolute inset-[8.33%] block size-[83.34%]">
                  <path
                    d="M9.59863 13.2912L8.25468 14.1465C7.79011 14.4422 7.79011 15.1203 8.25468 15.416L9.59863 16.2713C11.0848 17.2172 12.3453 18.4777 13.2912 19.9639L14.1465 21.3078C14.4422 21.7724 15.1203 21.7724 15.416 21.3078L16.2713 19.9639C17.2172 18.4777 18.4777 17.2172 19.9639 16.2713L21.3078 15.416C21.7724 15.1203 21.7724 14.4422 21.3078 14.1465L19.9639 13.2912C18.4777 12.3453 17.2172 11.0848 16.2713 9.59863L15.416 8.25468C15.1203 7.79011 14.4422 7.79011 14.1465 8.25468L13.2912 9.59863C12.3453 11.0848 11.0848 12.3453 9.59863 13.2912Z"
                    stroke="#0B82F8" strokeWidth="2.0625" strokeLinejoin="round"
                  />
                  <circle cx="14.7812" cy="14.7812" r="13.75" stroke="#0B82F8" strokeWidth="2.0625" strokeLinejoin="round" />
                </svg>
              </span>
              {/* Frozen Figma copy — see the note at the top. The "L" is a
                  12px Geist run inside a 14px sentence, which is how
                  199375:139984 sets it. */}
              <div className={cn('font-sans', TIP_TEXT)} data-node-id="199375:139984">
                <p className={TIP_P}>
                  <span className={TIP_RUN}>Leak prevention for your system can prevent up to 25K</span>
                  <span className={cn('font-sans', TIP_UNIT)}>L</span>
                  <span className={TIP_RUN}>{` loss`}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
