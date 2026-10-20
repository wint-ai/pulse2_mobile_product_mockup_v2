/**
 * Events Timeline card — v2, redesigned System page.
 *
 * Design source: Figma file YEmjkKS4xaA827Zm8w3oXx, the "Events Timeline" card
 * as it appears on the two states of the redesigned mobile System page. Both
 * pages were emitted whole and diffed against each other, never assumed equal:
 *   alert  199383:141630  (inside page 199383:141499 — the page WITH the red
 *                          event card: "High flow event" / "Ongoing")
 *   calm   199359:126908  (inside page 199359:126785 — no event card)
 * The card's layer name is still the shadcn template leftover
 * "Card • Q2 Dividend Income"; that card IS the Events Timeline.
 *
 * (Supersedes the earlier pass's nodes 199296:50453 / 199296:50716, which were
 * an older copy of the same two pages. The sub-paths under the card are
 * identical, so the old → new id map is 1:1; the data-node-id attributes below
 * now carry the ALERT lineage, I199383:141630;… . The calm card's sub-paths are
 * the same with the root swapped and two per-instance ids differing:
 * 199383:141770/141771 → 199359:127052/127053.)
 *
 * ── What differs between the two states: NOTHING ─────────────────────────────
 * With the per-instance data-node-ids normalised away, the two 249-line emitted
 * ranges are byte-for-byte identical except the NAME of the asset const holding
 * the waves glyph (imgPhosphorIconsWaves1 in the alert page vs
 * imgPhosphorIconsWaves in the calm one) — both resolve to the same file,
 * 2dc55.svg, so even the artwork is the same.
 *
 * In particular the CardHeader title no longer differs. The earlier pass found
 *   calm   Figtree Regular  font-normal 400  slate/700 #314158  no tracking
 *   alert  Figtree SemiBold font-semibold 600 slate/800 #1d293d tracking -0.45px
 * and encoded it as `tone`. The redesign has unified the title on the SemiBold /
 * slate-800 / -0.45px spelling: `slate\/700,#314158` does not occur anywhere in
 * either page any more. Both TITLE_TONE entries therefore now hold the one
 * spelling the design draws. `tone` is kept as a prop — SystemPageV2Screen and
 * EventFocusOverlay both pass it and the API must not change — but it is, as of
 * these nodes, cosmetically inert. It is NOT deleted: re-divergence is a Figma
 * edit away, and this is the seam that would carry it.
 *
 * ── How the classes are written ──────────────────────────────────────────────
 * Every utility below is Figma's own output, kept verbatim, e.g.
 *     text-[color:var(--colors\/slate\/900,#0f172b)]
 *     px-[var(--component\/badge\/px,8px)]
 * Each var() carries its own literal fallback, so the design value renders with
 * no token wiring. They are NOT rounded to text-slate-900 / px-2 — that
 * rounding is exactly what broke the previous screenshot-built pass.
 *
 * THE BACKSLASH TRAP. A JSX string attribute (className="…\/…") preserves the
 * backslash. A plain JS string passed through cn() EATS it, and `\\/` would be
 * what Tailwind's file scanner reads, so neither spelling survives both sides.
 * Every class string that lives in JS below therefore uses String.raw.
 *
 * THE leading-/text-[length:] TRAP, a second time. tailwind-merge treats a
 * `leading-*` atom as conflicting with a font-size atom, so a `leading-` placed
 * BEFORE `text-[length:…]` in the SAME cn() call is silently deleted. Figma
 * emits its classes alphabetically, which always puts `leading-` first. Any
 * string below that reaches a cn() therefore spells line-height LAST. This bit
 * BADGE_LABEL once; it was also silently eating the header title's
 * leading-[18px] (CardTitle is cn("…leading-none…", className)), which is why
 * TITLE_TONE is now ordered too. Strings that go straight into a JSX attribute
 * never meet twMerge and keep Figma's own order.
 *
 * FONT FAMILY. Figma emits font-[family-name:var(--font\/family\/sans,
 * 'Figtree:SemiBold')] on every text node. 'Figtree:SemiBold' is a Figma style
 * name, not a CSS family, and this project does not define --font/family/sans,
 * so the bare Figma spelling resolves to nothing and the element would fall off
 * Figtree onto the UA default. It is carried with the house fallback tail
 * (InsightsCard.jsx:198) — ,'Figtree','Inter',sans-serif — which is the family
 * the card inherits from body today, so the rendered pixels do not move; it
 * only stops the card depending on inheritance.
 *
 * Three of Figma's vars are flattened to their literals, because this project
 * DOES define them and with different values, so the fallback never reaches the
 * page (src/index.css:62,68,79):
 *   var(--secondary-foreground,#171717) → project value #0b81f8 (blue).
 *       Kept #171717; a blue "All" label is plainly not the design.
 *   var(--muted-foreground,#737373)     → project value #62748e (slate/500).
 *   var(--foreground,#0a0a0a)           → project value #0f172b.
 * In each case the literal is the colour the Figma node actually renders.
 *
 * ── Where this deviates from a literal translation, and why ──────────────────
 * 1. Row stacking, and WHY THE THREE ROWS HAVE THREE DIFFERENT HEIGHTS. Figma
 *    emits them as fixed boxes:
 *      row 1  h-[116px]            mb-[-24px]   gap-[10px]  avatar h-[89px]
 *      row 2  h-[164px] pt-[48px]  mb-[-24px]   gap-[12px]  avatar h-[93px]
 *      row 3  h-[120px] pt-[48px]               gap-[12px]  avatar h-[93px]
 *    None of those three numbers is a design decision, so none is hardcoded:
 *      · One row's CONTENT is 116px tall — Text block 81 + gap-[23px] + the
 *        12px timestamp line. That is row 1 exactly.
 *      · Rows 2 and 3 add pt-[48px] on top of that same content, and every row
 *        but the last carries mb-[-24px]. 48 − 24 = a flat 24px gap between one
 *        row's content and the next. Row 1 has no pt because it is first; row 3
 *        has no mb because it is last. 164 = 48 + 116 is the identical row,
 *        offset.
 *      · 120 is not a third row height, it is the first two cut off. Laid out,
 *        the list is 116 − 24 + 164 − 24 + 164 = 396px tall but cardContent is
 *        hug-height inside a card pinned to h-[380px] with overflow-clip, which
 *        leaves 380 − 62 (header) − 12 − 12 (py) = 294px. Row 3's box starts at
 *        232, so ~72px of its 116 survives the clip and Figma reports the
 *        clipped bounding box, 48 + 72 = 120. The design is showing two whole
 *        events and the top of a third; it is not drawing a short row.
 *    Resolved, the whole pair is: a 24px gap between rows, and a rail that stops
 *    4px short of the next avatar (avatar 24 + the column's own gap-[4px] + a
 *    108px rail = 136, against the next avatar's top at 116 + 24 = 140). It is
 *    rendered as pb-[24px] on the text column and pb-[4px] on the avatar column
 *    — the same picture, from data-driven rows of any count and any content
 *    height. See 3 for what replaces the clip.
 * 2. w-[273px] on rows 2–3's text column is a frame artifact (row 1 emits
 *    flex-[1_0_0] min-w-px for the very same slot — 273px is just the one-line
 *    width of "Leak confirmed — flow sustained above threshold" at 14px). Row 1's
 *    value is used for every row so the card fits any phone width. The same
 *    artifact wraps rows 2–3 in an extra hug-width div inside a justify-center
 *    row; honouring THAT would indent rows 2–3 by ~17px at 393px and make the
 *    rail zigzag between row 1's avatar and row 2's, which is plainly not the
 *    drawing. The wrapper is flattened and its gap-[12px] moved onto the row.
 * 3. cardContent is flex-1 + overflow-y-auto instead of shrink-0 +
 *    overflow-clip, and the node's h-[380px] is carried as max-h-[380px].
 *    With the comp's three rows the two are identical — row 3 still cuts off
 *    mid-way, as drawn. They differ only at the ends a fixed frame cannot
 *    express: a real system may have MORE events than fit, and clipping them
 *    would make its own history unreachable; it may also have one, and a
 *    fixed 380px card then holds ~200px of void on a 852px phone. The
 *    scrollbar is hidden, so the resting pixels are unchanged.
 *    justify-center likewise becomes justify-start: in a flex scroller,
 *    justify-center makes the top of overflowing content unreachable in
 *    Chrome/Safari. The empty state carries m-auto, which is where the node's
 *    centring actually reads.
 * 4. The row title ellipsises instead of shrink-0 whitespace-nowrap: real event
 *    titles are longer than "High Flow Anomaly" and must not shove the status
 *    chip off the row.
 * 5. The metrics line adds flex-wrap + gap-y-[6px]. At the designed values it
 *    is pixel-identical (the three pairs fit on one line at 375); it only ever
 *    acts on longer real values.
 * 6. The LAST row draws no rail. Figma's row 3 does carry a Separator, and an
 *    open-ended one (flex-[1_0_0], where rows 1–2 are h-[108px]) — but that is
 *    the same clip as in 1: row 3 is the top of a cut-off event, so its rail
 *    running off the bottom edge is the "there is more below" affordance of a
 *    FIXED frame. On a list that actually ends, a rail under the final avatar
 *    dangles into nothing. The rail therefore stops at row n−1; the scroller
 *    from 3 is what carries "there is more below" here.
 * 7. The footer "Unit wrapper" gets justify-between + w-full (Figma hugs it,
 *    because the comp's rows carry only a timestamp). The slot's optional Tag
 *    and "n sent" chips — which the live page does pass — need the right edge.
 *    With a timestamp alone the two are identical.
 *
 * ── Icons ────────────────────────────────────────────────────────────────────
 * Nothing references a figma.com asset URL at runtime — those expire. Every
 * glyph is either an icon this repo already owns or is inlined here from the
 * export (geometry, viewBox and stroke colour verbatim).
 *   Waves      — src/v2/icons/Waves.jsx is the same artwork as the 13px export
 *                (2dc55.svg: stroke #FB2C36, stroke-width 1.08063). Only the
 *                viewBox differs (21 vs 13), which thins the stroke to 0.67px
 *                when Waves.jsx is drawn at 13px, so it is scaled back to the
 *                design weight: 1.08063 × 21/13 = 1.746.
 *   CaretDown  — the "All" pill. Figma named the asset const
 *                imgPhosphorIconsCaretDown but served the Huge-Icons/smile
 *                artwork sitting in the Button's Icon Placeholder slot; the
 *                node screenshot shows a caret. Phosphor caret-down is already
 *                owned as CaretDown.jsx, so that is used, and the slot's
 *                -rotate-180/-scale-x-100 (a net vertical flip, which would
 *                point the caret up) is dropped.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CaretDown, Waves } from '@/v2/icons'
import { cn } from '@/lib/utils'

// ── Inlined Figma assets ─────────────────────────────────────────────────────

/** Tabler Icons / chevron-down — 198352:121470 */
function ChevronDown12({ className }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="#62748E" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Tabler Icons / chevron-up — 198355:121823 */
function ChevronUp12({ className }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <path d="M3 7.5L6 4.5L9 7.5" stroke="#62748E" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Huge Icons / plus-sign — 198424:61412. 9.33 artwork inside a 12px box. */
function PlusSign12() {
  return (
    <span className="flex items-center justify-center overflow-clip shrink-0 size-[12px]">
      <svg width="9.33" height="9.33" viewBox="0 0 9.33 9.33" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <path d="M4.665 0.665V8.665M8.665 4.665H0.665" stroke="#314158" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/** Huge Icons / wifi-02 — 198352:121533. 11.914×8.122 artwork inside a 13px box. */
function Wifi02() {
  return (
    <span className="flex items-center justify-center overflow-clip shrink-0 size-[13px]">
      <svg width="11.914" height="8.12229" viewBox="0 0 11.914 8.12229" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <path d="M5.95699 7.58198H5.96338" stroke="#2B7FFF" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.92574 5.95698C5.00907 4.87365 6.90491 4.87365 7.98824 5.95698" stroke="#2B7FFF" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.47782 4.33198C7.43704 2.52642 4.60282 2.52642 2.43616 4.33198" stroke="#2B7FFF" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M0.540324 2.70698C3.96138 -0.181897 7.9526 -0.181902 11.3737 2.70692" stroke="#2B7FFF" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/** Lucide Icons / bell — 2706:17682, as exported at 12px. */
function Bell12() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" aria-hidden="true" focusable="false">
      <path
        d="M5.15002 10.5C5.23372 10.6522 5.35675 10.7792 5.50627 10.8676C5.65579 10.956 5.82631 11.0027 6.00002 11.0027C6.17373 11.0027 6.34426 10.956 6.49378 10.8676C6.6433 10.7792 6.76633 10.6522 6.85002 10.5M3 4C3 3.20435 3.31607 2.44129 3.87868 1.87868C4.44129 1.31607 5.20435 1 6 1C6.79565 1 7.55871 1.31607 8.12132 1.87868C8.68393 2.44129 9 3.20435 9 4C9 7.5 10.5 8.5 10.5 8.5H1.5C1.5 8.5 3 7.5 3 4Z"
        stroke="#62748E"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Design tokens read off the two nodes ─────────────────────────────────────

/**
 * Figma's font-family atom, with the house fallback tail so the Figma style
 * name ('Figtree:SemiBold' — not a CSS family) cannot drop the element off
 * Figtree. Same spelling as InsightsCard.jsx:198. Family only; the weight is a
 * separate atom on each node, as Figma emits it.
 */
const FIG_REG = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:Regular'),'Figtree','Inter',sans-serif]`
const FIG_MED = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif]`
const FIG_SEMI = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:SemiBold'),'Figtree','Inter',sans-serif]`

/**
 * Card root — 199383:141630 (alert) / 199359:126908 (calm). Identical in both.
 * The shadow is fully transparent because that is what the Figma effect
 * resolves to; it is kept rather than substituted with the project Card's.
 */
const CARD_ROOT = String.raw`bg-[#fafbfc] border-[length:var(--border-width\/border,1px)] border-solid border-white content-stretch flex flex-col gap-[var(--p-0,0px)] max-h-[380px] items-start overflow-clip p-[var(--p-0,0px)] relative rounded-[var(--rounded-2xl,18px)] shadow-[var(--shadow\/x,0px)_var(--shadow\/popover\/layer-2\/y,0px)_var(--shadow\/popover\/layer-2\/blur,0px)_var(--shadow\/popover\/layer-2\/spread,0px)_var(--shadow\/popover\/layer-2\/color,rgba(0,0,0,0))] shrink-0 w-full`

/** CardHeader — I…;149:2490. gap-[var(--p-0,0px)] cancels the project Card's gap-1. */
const CARD_HEADER = String.raw`content-stretch flex gap-[var(--p-0,0px)] h-[62px] items-center justify-between px-[var(--spacing\/5,20px)] py-[var(--spacing\/3,12px)] relative shrink-0 w-full`

/**
 * Header title — I…;149:2490;2780:50631.
 *
 * Both Figma states now draw the SAME title (see the header comment): Figtree
 * SemiBold / font-semibold 600 / slate-800 #1d293d / 18px / lh 18px /
 * tracking -0.45px. `calm` and `alert` therefore hold the same string. The map
 * survives because `tone` is a public prop and this is where a re-divergence
 * would land; nothing else in the card branches on it.
 *
 * ORDER MATTERS — leading-* LAST. CardTitle is cn("…leading-none…", className),
 * so a leading- spelled ahead of text-[length:…] (Figma's own alphabetical
 * order) is deleted by tailwind-merge and the title silently renders at the
 * UA's ~1.2em instead of the design's 18px.
 */
const TITLE_FIGMA = String.raw`[word-break:break-word] ${FIG_SEMI} font-[var(--font\/weight\/font-semibold,600)] relative shrink-0 text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/lg\/size,18px)] leading-[var(--text\/lg\/lh-none,18px)] tracking-[-0.45px] w-full`
const TITLE_TONE = {
  calm: TITLE_FIGMA,
  alert: TITLE_FIGMA,
}

/** The "All" Button — I…;149:2490;197412:209455;199383:141771. */
const FILTER_BUTTON = String.raw`bg-[var(--colors\/slate\/100,#f1f5f9)] content-stretch cursor-pointer drop-shadow-[var(--shadow\/x,0px)_var(--shadows\/scale\/none\/y,0px)_calc(var(--shadows\/scale\/none\/blur,0px)/2)_var(--shadows\/color\/transparent,rgba(0,0,0,0)),var(--shadow\/x,0px)_var(--shadow\/control\/layer-1\/y,0px)_calc(var(--shadow\/control\/layer-1\/blur,0px)/2)_var(--shadow\/control\/layer-1\/color,rgba(0,0,0,0))] flex gap-[var(--component\/button\/gap,6px)] h-[36px] items-center justify-center px-[var(--component\/button\/size-default\/px,12px)] py-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-default\/radius,26px)] shrink-0`
const FILTER_LABEL = String.raw`[word-break:break-word] ${FIG_MED} font-medium relative shrink-0 text-[color:#171717] text-[length:var(--text\/sm-tight\/size,14px)] leading-[var(--text\/sm-tight\/lh,20px)] whitespace-nowrap`

/**
 * cardContent — I…;101006:7299. See deviation 3 in the header comment for
 * flex-1 / overflow-y-auto / justify-start.
 */
const CARD_CONTENT = String.raw`content-stretch flex flex-[1_1_0%] flex-col gap-[var(--p-0,0px)] items-end justify-start min-h-0 overflow-x-clip overflow-y-auto px-[var(--text\/title\/size,16px)] py-[var(--component\/calendar\/padding,12px)] relative w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`

/**
 * Status pill. `variant` is the shadcn prop the Figma Badge description maps to
 * its own "Type" property; the className carries the literal fill and label
 * colour the node specifies.
 *
 * `warning` is the chip the redesign actually draws — red/100 on red/900,
 * reading "Ongoing" (I…;101006:7299;199383:141692). The other three entries are
 * untouched from the previous design pass: the redesigned comp has no node for
 * a resolved, shut-off or badge-leading row, and inventing one is forbidden, so
 * those rows keep the treatment they ship with today.
 */
const BADGE_TONE = {
  // 198352:121453 / 198601:86817. slate/100 chip with a #509fef label.
  ended: {
    variant: 'secondary',
    className: String.raw`bg-[var(--colors\/slate\/100,#f1f5f9)] text-[#509fef]`,
  },
  // 199383:141692 — the redesign's own chip.
  warning: {
    variant: 'secondary',
    className: String.raw`bg-[var(--colors\/red\/100,#ffe2e2)] text-[color:var(--colors\/red\/900,#82181a)]`,
  },
  // 198352:121557 — the badgeFirst pill, orange on orange.
  warningLead: {
    variant: 'secondary',
    className: String.raw`bg-[var(--colors\/orange\/100,#ffedd4)] text-[color:var(--colors\/orange\/600,#f54900)]`,
  },
  // 198352:121511 / 198511:66354.
  shutoff: {
    variant: 'secondary',
    className: String.raw`bg-[var(--colors\/slate\/100,#f1f5f9)] text-[color:var(--colors\/red\/400,#ff6467)]`,
  },
}

/** Avatar bubble tint per event kind. 199383:141684 (water) / 198352:121532 (network). */
const KIND_TONE = {
  water: String.raw`bg-[var(--colors\/red\/100,#ffe2e2)]`,
  network: String.raw`bg-[var(--colors\/blue\/100,#dbeafe)]`,
}

const BADGE_BASE = String.raw`border-transparent content-stretch flex gap-[var(--component\/badge\/gap,4px)] h-[24px] items-center justify-center overflow-clip px-[var(--component\/badge\/px,8px)] py-[var(--component\/badge\/py,2px)] relative rounded-[var(--component\/badge\/radius,26px)] shrink-0`
/* ORDER MATTERS. This string is fed to cn(), and tailwind-merge treats a
   `leading-*` atom as conflicting with a font-size atom (Tailwind's
   `text-sm/6` shorthand sets both) — so a `leading-` placed BEFORE
   `text-[12px]` is silently deleted and the badge loses its line-height.
   Figma emits its classes alphabetically, which puts `leading-` first, so a
   verbatim copy has this bug. Same class set, line-height last. */
const BADGE_LABEL = String.raw`[word-break:break-word] ${FIG_MED} font-[var(--font\/weight\/font-medium,500)] overflow-hidden relative shrink-0 text-[12px] text-ellipsis whitespace-nowrap leading-[var(--text\/xs\/lh,16px)]`

/** Avatar column — I…;101006:7299;199383:141683. */
const AVATAR_COL = String.raw`content-stretch flex flex-col gap-[var(--pro\/space\/1,4px)] items-center relative shrink-0`
/** Text column — I…;101006:7299;199383:141687. */
const TEXT_COL = String.raw`content-stretch flex flex-[1_0_0] flex-col gap-[23px] items-start min-w-px relative`
/** "Text" block — I…;101006:7299;199383:141688. */
const TEXT_BLOCK = String.raw`content-stretch flex flex-col gap-[var(--pro\/space\/1\,5,6px)] items-start relative shrink-0 w-full`
/** Footer "Unit wrapper" — I…;101006:7299;199383:141706. */
const UNIT_WRAPPER = String.raw`content-stretch flex gap-[var(--spacing\/0\,5,2px)] items-center justify-between relative shrink-0 w-full`

/** Filter menu. No node in the comp — see the `All` note on the component. */
const MENU_SHELL = String.raw`absolute right-0 top-[calc(100%+6px)] z-20 bg-white border border-solid border-[var(--colors\/slate\/200,#e2e8f0)] content-stretch flex flex-col items-stretch min-w-[132px] overflow-clip p-[4px] rounded-[12px] shadow-[0px_8px_24px_0px_rgba(15,23,43,0.12)]`
const MENU_ITEM = String.raw`cursor-pointer flex gap-[8px] h-[32px] items-center justify-between px-[8px] rounded-[8px] text-[color:#171717] text-[length:var(--text\/sm-tight\/size,14px)] text-left w-full hover:bg-[var(--colors\/slate\/100,#f1f5f9)]`

// ── Mock data ────────────────────────────────────────────────────────────────
// Verbatim from the two nodes: three identical rows, each "High Flow Anomaly" /
// "Ongoing" / Flow 1180 / L/h·Volume 8,420 / Duration 6h 36m / the cause line /
// "Apr 02, 2026 08:13:15". Figma repeats one component instance; that is not an
// instruction to hardcode three rows, so this is only the DEFAULT for a bare
// mount. Rows 4 and 5 are kept from the previous pass so the network avatar,
// the Tag chip, the notification chip and the expandable sub-timeline each
// still have a fixture — the card renders all of them and none was removed.
const MOCK_METRICS = [
  { label: 'Flow', value: '1180' },
  { label: 'L/h·Volume', value: '8,420' },
  { label: 'Duration', value: '6h 36m' },
]
const MOCK_STEPS = ['Closing 11:42 AM', 'Verifying 11:42 AM', 'Closed 11:43 AM']

const MOCK_EVENTS = [
  {
    id: 'evt-1',
    kind: 'water',
    title: 'High Flow Anomaly',
    badge: { label: 'Ongoing', tone: 'warning' },
    metrics: MOCK_METRICS,
    description: 'Leak confirmed — flow sustained above threshold',
    timestamp: 'Apr 02, 2026 08:13:15',
  },
  {
    id: 'evt-2',
    kind: 'water',
    title: 'High Flow Anomaly',
    badge: { label: 'Ongoing', tone: 'warning' },
    metrics: MOCK_METRICS,
    description: 'Leak confirmed — flow sustained above threshold',
    timestamp: 'Apr 02, 2026 08:13:15',
  },
  {
    id: 'evt-3',
    kind: 'water',
    title: 'High Flow Anomaly',
    badge: { label: 'Ongoing', tone: 'warning' },
    metrics: MOCK_METRICS,
    description: 'Leak confirmed — flow sustained above threshold',
    timestamp: 'Apr 02, 2026 08:13:15',
  },
  {
    id: 'evt-4',
    kind: 'network',
    title: 'Connectivity Restored',
    badge: { label: 'Ended', tone: 'ended' },
    description: 'Offline for 2h 15m',
    timestamp: 'Apr 02, 2026 08:13:15',
    tag: 'Tag',
    steps: MOCK_STEPS,
  },
  {
    id: 'evt-5',
    kind: 'water',
    title: 'High Flow Anomaly',
    badge: { label: 'Warning', tone: 'warningLead' },
    badgeFirst: true, // 198352:121556 — this row leads with the pill.
    avatarShape: 'circle', // 198352:121444 — the old full-circle avatar.
    metrics: MOCK_METRICS,
    description: 'Leak confirmed — flow sustained above threshold',
    timestamp: 'Apr 02, 2026 08:13:15',
    notifications: { count: 4 },
  },
]

/** The filter option that means "do not filter". Figma draws this label. */
const ALL = 'All'

/** `expanded` accepts an event id, `true` (first expandable row) or false/null. */
function resolveExpanded(value, list) {
  if (value === true) return (list.find(e => e.steps && e.steps.length) ?? list[0])?.id ?? null
  if (!value) return null
  return value
}

/**
 * How many notifications an event reports.
 *
 * FIXED HERE. The card read `event.notifications.count`, but the live page
 * hands it `recipientsOf()`'s return value from src/data/upstream/generateEvents.js
 * — an ARRAY of recipients. An array is truthy, so every real row rendered a
 * chip saying literally "undefined sent". Both shapes are accepted now, and the
 * chip is suppressed when the count is zero or unknown.
 */
function notificationCount(notifications) {
  if (Array.isArray(notifications)) return notifications.length
  if (typeof notifications === 'number') return notifications
  if (notifications && typeof notifications.count === 'number') return notifications.count
  return 0
}

function EventRow({ event, eventId, index, isLast, isOpen, onToggle }) {
  const tone = BADGE_TONE[event.badge?.tone] ?? BADGE_TONE.warning
  const canExpand = Boolean(event.steps && event.steps.length)
  const sent = notificationCount(event.notifications)

  const title = (
    /* Figma has `shrink-0 whitespace-nowrap` here; see deviation 4. */
    <p
      className={String.raw`[word-break:break-word] ${FIG_SEMI} font-[var(--font\/weight\/font-semibold,600)] leading-[var(--text\/sm\/lh,20px)] min-w-0 overflow-hidden relative text-[color:#0a0a0a] text-[length:var(--text\/sm\/size,14px)] text-ellipsis whitespace-nowrap`}
      data-node-id="I199383:141630;101006:7299;199383:141691"
    >
      {event.title}
    </p>
  )

  const pill = event.badge ? (
    <Badge
      variant={tone.variant}
      className={cn(BADGE_BASE, tone.className)}
      data-node-id="I199383:141630;101006:7299;199383:141692"
      data-name="Badge"
    >
      <span className={BADGE_LABEL}>{event.badge.label}</span>
    </Badge>
  ) : null

  return (
    <li
      className={cn(
        'content-stretch flex items-stretch relative shrink-0 w-full',
        /* Figma's first row is gap-[10px]; every later row is gap-[12px]. */
        index === 0 ? 'gap-[10px]' : 'gap-[12px]',
      )}
      data-node-id="I199383:141630;101006:7299;199383:141682"
      data-name="Activity feed item"
    >
      {/* Avatar + rail — I…;199383:141683. pb-[4px] is the gap Figma leaves
          between the end of the rail and the next avatar (the rail is 108px in
          a 24+4+108 column, i.e. it stops 4px short). */}
      <div className={cn(AVATAR_COL, !isLast && 'pb-[4px]')} data-node-id="I199383:141630;101006:7299;199383:141683" data-name="Avatar">
        <div
          className={cn(
            'content-stretch flex items-center justify-center relative shrink-0 size-[24px]',
            /* The redesign draws every avatar as the 8.19px squircle. 'circle'
               is still honoured for the older full-round avatar. */
            event.avatarShape === 'circle' ? 'rounded-[30px]' : 'rounded-[8.19px]',
            KIND_TONE[event.kind] ?? KIND_TONE.water,
          )}
          data-node-id="I199383:141630;101006:7299;199383:141684"
        >
          {event.kind === 'network' ? (
            <Wifi02 />
          ) : (
            <span className="relative shrink-0 size-[13px]" data-node-id="I199383:141630;101006:7299;199383:141685" data-name="Phosphor Icons / waves">
              {/* stroke-width scaled 21→13 so the 13px draw keeps the design's 1.08063 weight */}
              <Waves size={13} className="absolute block inset-0 max-w-none size-full text-[#FB2C36] [&_path]:[stroke-width:1.746]" />
            </span>
          )}
        </div>
        {/* Rail — I…;199383:141686. Stroke #E5E5E5, 1px; rows 1–2 carry it as
            the fixed h-[108px] 18d89.svg, row 3 as an open-ended flex-[1_0_0]
            d6973.svg. Figma therefore draws one under the LAST avatar too — but
            only because its row 3 is a clipped event with more below it. On a
            list that actually ends, that rail dangles into nothing, so it stops
            at row n-1. See deviation 6. */}
        {!isLast && (
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-auto flex-[1_0_0] min-h-px w-px bg-[#E5E5E5]"
            data-node-id="I199383:141630;101006:7299;199383:141686"
            data-name="Separator"
          />
        )}
      </div>

      {/* Text column — I…;199383:141687. pb-[24px] is the resolved row gap. */}
      <div className={cn(TEXT_COL, !isLast && 'pb-[24px]')} data-node-id="I199383:141630;101006:7299;199383:141687">
        <div className={TEXT_BLOCK} data-node-id="I199383:141630;101006:7299;199383:141688" data-name="Text">
          <div className="content-stretch flex flex-col gap-[7px] items-start relative shrink-0 w-full" data-node-id="I199383:141630;101006:7299;199383:141689">
            <div className="content-stretch flex gap-[6px] items-center relative shrink-0 w-full" data-node-id="I199383:141630;101006:7299;199383:141690">
              {event.badgeFirst ? (
                <>
                  {pill}
                  {title}
                </>
              ) : (
                <>
                  {title}
                  {pill}
                </>
              )}

              {canExpand ? (
                <button
                  type="button"
                  onClick={() => onToggle(eventId)}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? `Hide details for ${event.title}` : `Show details for ${event.title}`}
                  className={cn(
                    'ml-auto content-stretch flex items-center justify-center relative rounded-[6px] shrink-0 size-[24px] cursor-pointer',
                    isOpen
                      ? String.raw`bg-[var(--colors\/slate\/200,#e2e8f0)]`
                      : String.raw`bg-[var(--colors\/slate\/100,#f1f5f9)]`,
                  )}
                >
                  {isOpen ? <ChevronUp12 /> : <ChevronDown12 />}
                </button>
              ) : null}
            </div>

            {/* Metrics — I…;199383:141693. See deviation 5 for flex-wrap. */}
            {event.metrics?.length ? (
              <div
                className={String.raw`[word-break:break-word] content-stretch flex flex-wrap ${FIG_REG} font-[var(--font\/weight\/font-normal,400)] gap-x-[13px] gap-y-[6px] items-start relative shrink-0 whitespace-nowrap`}
                data-node-id="I199383:141630;101006:7299;199383:141693"
              >
                {event.metrics.map(m => (
                  <div key={m.label} className="content-stretch flex gap-[5px] items-center relative shrink-0" data-node-id="I199383:141630;101006:7299;199383:141694">
                    <div
                      className="flex flex-col justify-center leading-[0] overflow-hidden relative shrink-0 text-[color:#737373] text-[length:var(--text\/xs\/size,12px)] text-ellipsis"
                      data-node-id="I199383:141630;101006:7299;199383:141695"
                    >
                      <p className="leading-[var(--text\/xs\/lh-none,12px)] overflow-hidden text-[12px] text-ellipsis">{m.label}</p>
                    </div>
                    <p
                      className="leading-[var(--text\/xs\/lh-none,12px)] overflow-hidden relative shrink-0 text-[12px] text-[color:var(--colors\/slate\/900,#0f172b)] text-ellipsis"
                      data-node-id="I199383:141630;101006:7299;199383:141696"
                    >
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Cause line — I…;199383:141703. */}
            {event.description ? (
              <p
                className={String.raw`[word-break:break-word] ${FIG_REG} font-[var(--font\/weight\/font-normal,400)] leading-[var(--font\/line-height\/leading-5,20px)] min-w-full relative shrink-0 text-[color:var(--colors\/gray\/700,#364153)] text-[length:var(--font\/size\/text-sm,14px)] tracking-[var(--font\/tracking\/tracking-normal,0px)] w-[min-content]`}
                data-node-id="I199383:141630;101006:7299;199383:141703"
              >
                {event.description}
              </p>
            ) : null}

            {/* Expanded sub-timeline — 198355:122410. The redesigned comp has no
                expandable row (no event in it carries steps), so this never
                draws on the live page; it is kept because the prop and the
                behaviour predate the redesign and removing it would drop
                working functionality. */}
            {isOpen && canExpand ? (
              <div className="content-stretch flex flex-col items-start pt-[17px] relative shrink-0 text-[length:var(--text\/xs\/size,12px)] text-black font-[var(--font\/weight\/font-normal,400)]">
                {event.steps.map(step => (
                  <p key={step} className="leading-[var(--text\/xs\/lh-relaxed,19.5px)] whitespace-nowrap">
                    {step}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer — I…;199383:141704 → :141705 → "Unit wrapper" :141706. The comp
            draws only the timestamp; the Tag / "n sent" chips are the design's
            own right-aligned slot from the previous pass and still render when
            the data carries them. */}
        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="I199383:141630;101006:7299;199383:141704">
          <div className="content-stretch flex flex-col items-end relative shrink-0 w-full" data-node-id="I199383:141630;101006:7299;199383:141705">
            <div className={UNIT_WRAPPER} data-node-id="I199383:141630;101006:7299;199383:141706" data-name="Unit wrapper">
              <div
                className={String.raw`[word-break:break-word] flex flex-col ${FIG_REG} font-[var(--font\/weight\/font-normal,400)] justify-center leading-[0] min-w-px overflow-hidden relative shrink text-[color:#737373] text-[length:var(--text\/xs\/size,12px)] text-ellipsis whitespace-nowrap`}
                data-node-id="I199383:141630;101006:7299;199383:141707"
              >
                <p className="leading-[var(--text\/xs\/lh-none,12px)] overflow-hidden text-[12px] text-ellipsis">{event.timestamp}</p>
              </div>

              {event.tag ? (
                /* Deliberately inert: the delivery canvas has no tag-picker node
                   and no handler is passed in, and v2-page-parity Rule 0 forbids
                   inventing a destination. Rendered as a plain element, not a
                   button, so it does not advertise a tap it cannot honour. */
                <Badge
                  variant="secondary"
                  className={cn(BADGE_BASE, String.raw`bg-[var(--colors\/slate\/100,#f1f5f9)]`)}
                  aria-disabled="true"
                >
                  <span className={cn(BADGE_LABEL, String.raw`text-[color:var(--colors\/slate\/700,#314158)]`)}>{event.tag}</span>
                  <PlusSign12 />
                </Badge>
              ) : null}

              {sent > 0 ? (
                /* Same call as the Tag chip: no notification-list node in the
                   design, so this states the count and is inert by decision. */
                <div
                  className="bg-[var(--colors\/slate\/100,#f1f5f9)] content-stretch flex gap-[6px] h-[16px] items-center justify-center px-[3px] relative rounded-[6px] shrink-0"
                  aria-disabled="true"
                >
                  <div className="content-stretch flex gap-[3px] items-center relative shrink-0">
                    <Bell12 />
                    <span className="[word-break:break-word] font-[var(--font\/weight\/font-normal,400)] leading-[var(--text\/xs\/lh-none,12px)] overflow-hidden min-w-px text-[12px] text-[color:var(--colors\/slate\/900,#0f172b)] text-ellipsis whitespace-nowrap">
                      {sent} sent
                    </span>
                  </div>
                  <ChevronDown12 />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}

/**
 * @param {object[]} events
 *   Default `MOCK_EVENTS`. Shape:
 *   `{ id, kind:'water'|'network', title, badge:{label,tone}, badgeFirst,
 *      avatarShape:'circle', metrics:[{label,value}], description, timestamp,
 *      tag, notifications, steps:[] }`
 *   `badge.tone` is a BADGE_TONE key: ended | warning | warningLead | shutoff;
 *   an unknown tone falls back to `warning`. `notifications` may be an array of
 *   recipients, a number, or `{count}`. Pass `[]` to reach the empty state.
 * @param {string|boolean} expanded
 *   Default `false`. An event id, `true` (first expandable row) or false.
 * @param {(nextExpandedId: string|null, tappedId: string) => void} [onToggleExpanded]
 *   Supplied = the card is controlled; omitted = it keeps its own state so the
 *   chevrons still work standalone.
 * @param {string} [className]  merged onto the Card root.
 * @param {'calm'|'alert'} tone
 *   Default `'calm'`. Which of the two Figma System-page states the card is
 *   standing in. As of 199383:141630 / 199359:126908 the two states draw the
 *   card identically — the header title that used to differ is now semibold /
 *   slate-800 / -0.45px in both — so this is accepted and has no visual effect.
 *   It is the declared seam for a re-divergence and callers already pass it
 *   (`tone={system.alert ? 'alert' : 'calm'}`), so it stays.
 * @param {string} period
 *   Default `'All'`. The filter shown in the header pill. Also the controlled
 *   value when `onSelectPeriod` is supplied.
 * @param {(next: string) => void} [onSelectPeriod]
 *   Supplied = the parent owns the filter value (the card still opens the menu
 *   and reports the pick). Omitted = the card owns it internally.
 */
export default function EventsTimelineCard({
  events = MOCK_EVENTS,
  expanded = false,
  onToggleExpanded,
  className,
  tone = 'calm',
  period = ALL,
  onSelectPeriod,
}) {
  const [internalExpanded, setInternalExpanded] = useState(() => resolveExpanded(expanded, events))
  const expandedId = onToggleExpanded ? resolveExpanded(expanded, events) : internalExpanded

  const handleToggle = id => {
    const next = expandedId === id ? null : id
    if (onToggleExpanded) onToggleExpanded(next, id)
    else setInternalExpanded(next)
  }

  /* ── The "All" control ─────────────────────────────────────────────────────
     Figma draws one pill labelled "All" and no menu node, so the options are
     not invented: they are the distinct status labels the supplied events
     actually carry, in the order they first appear. A system whose events are
     all "Ongoing" offers All / Ongoing; a system with no status chips at all
     offers nothing, and the pill renders deliberately inert rather than opening
     an empty menu. */
  const options = useMemo(() => {
    const labels = []
    for (const e of events) {
      const label = e?.badge?.label
      if (label && !labels.includes(label)) labels.push(label)
    }
    return labels.length > 1 ? [ALL, ...labels] : []
  }, [events])

  const [internalPeriod, setInternalPeriod] = useState(period)
  const activePeriod = onSelectPeriod ? period : internalPeriod
  const [menuOpen, setMenuOpen] = useState(false)
  const filterRef = useRef(null)

  const canFilter = options.length > 0

  useEffect(() => {
    if (!menuOpen) return undefined
    const onPointerDown = e => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setMenuOpen(false)
    }
    const onKeyDown = e => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const selectPeriod = next => {
    setMenuOpen(false)
    if (onSelectPeriod) onSelectPeriod(next)
    else setInternalPeriod(next)
  }

  /* Filter only by a value the card actually offers. A `period` prop that no
     longer matches any event — a stale controlled value, or a label this
     system never had — must show the whole timeline rather than silently
     empty the card. */
  const visibleEvents = useMemo(() => {
    if (!activePeriod || activePeriod === ALL || !options.includes(activePeriod)) return events
    return events.filter(e => e?.badge?.label === activePeriod)
  }, [events, activePeriod, options])

  const pillInner = (
    <>
      <span className={FILTER_LABEL} data-node-id="I199383:141630;149:2490;197412:209455;199383:141771;6722:19179">
        {activePeriod}
      </span>
      {/* Icon Placeholder — I…;100707:555336. Figma served the Huge-Icons/smile
          artwork for this slot; the node renders a caret. */}
      <span
        className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[16px]"
        data-node-id="I199383:141630;149:2490;197412:209455;199383:141771;100707:555336"
        data-name="Icon Placeholder"
      >
        <CaretDown size={16} className="shrink-0" />
      </span>
    </>
  )

  return (
    <Card className={cn(CARD_ROOT, className)} data-node-id={tone === 'alert' ? '199383:141630' : '199359:126908'} data-name="Card • Q2 Dividend Income">
      {/* CardHeader — I…;149:2490 */}
      <CardHeader className={CARD_HEADER} data-node-id="I199383:141630;149:2490" data-name="CardHeader">
        <div className="flex-[1_0_0] min-w-px relative" data-node-id="I199383:141630;149:2490;6752:3668" data-name="Title and desc">
          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[var(--component\/card\/header\/gap,8px)] items-start py-[var(--spacing\/1\,5,6px)] relative size-full">
            <CardTitle className={TITLE_TONE[tone] ?? TITLE_TONE.calm} data-node-id="I199383:141630;149:2490;2780:50631">
              Events Timeline
            </CardTitle>
          </div>
        </div>

        <CardAction className="relative self-center shrink-0" data-node-id="I199383:141630;149:2490;197412:210687">
          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-start relative size-full">
            {/* w-[57px] is the node's own box; min-w-fit stops the (wider) pill
                overlapping the title, which the fixed frame never had to care
                about. items-end keeps the right edges flush either way. */}
            <div
              className="content-stretch flex flex-col gap-[var(--p-0,0px)] items-end justify-center min-w-fit relative shrink-0 w-[57px]"
              data-node-id="I199383:141630;149:2490;197412:209455"
              data-name="CardAction2"
            >
              <div
                ref={filterRef}
                className="content-stretch flex flex-col gap-[var(--p-0,0px)] items-end justify-center relative shrink-0"
                data-node-id="I199383:141630;149:2490;197412:209455;199383:141770"
                data-name="CardAction2"
              >
                {canFilter ? (
                  <button
                    type="button"
                    onClick={() => setMenuOpen(o => !o)}
                    aria-haspopup="listbox"
                    aria-expanded={menuOpen}
                    aria-label={`Filter events, currently ${activePeriod}`}
                    className={FILTER_BUTTON}
                    data-node-id="I199383:141630;149:2490;197412:209455;199383:141771"
                    data-name="Button"
                  >
                    {pillInner}
                  </button>
                ) : (
                  /* Deliberately inert: these events carry no status to filter
                     on, and a menu with one entry is a dead control. */
                  <span
                    aria-disabled="true"
                    className={FILTER_BUTTON}
                    data-node-id="I199383:141630;149:2490;197412:209455;199383:141771"
                    data-name="Button"
                  >
                    {pillInner}
                  </span>
                )}

                {menuOpen && canFilter ? (
                  <div className={MENU_SHELL} role="listbox" aria-label="Filter events">
                    {options.map(option => (
                      <button
                        key={option}
                        type="button"
                        role="option"
                        aria-selected={option === activePeriod}
                        onClick={() => selectPeriod(option)}
                        className={cn(MENU_ITEM, option === activePeriod && String.raw`bg-[var(--colors\/slate\/100,#f1f5f9)] font-medium`)}
                      >
                        <span className="whitespace-nowrap">{option}</span>
                        <span className="text-[color:#737373] text-[12px]">
                          {option === ALL ? events.length : events.filter(e => e?.badge?.label === option).length}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </CardAction>
      </CardHeader>

      {/* cardContent — I…;101006:7299 */}
      <CardContent className={CARD_CONTENT} data-node-id="I199383:141630;101006:7299" data-name="cardContent">
        {visibleEvents.length === 0 ? (
          /* Empty state. The node list has no empty variant, so this is the
             minimum honest statement, set in the card's own muted xs type.
             m-auto is where cardContent's justify-center actually reads. */
          <div className="flex flex-col gap-[4px] items-center justify-center m-auto py-[32px] relative text-center w-full">
            <p className="font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/sm\/lh,20px)] text-[color:var(--colors\/slate\/900,#0f172b)] text-[length:var(--text\/sm\/size,14px)]">
              {events.length === 0 ? 'No events yet' : `No ${activePeriod.toLowerCase()} events`}
            </p>
            <p className="leading-[var(--text\/xs\/lh,16px)] text-[color:#737373] text-[length:var(--text\/xs\/size,12px)]">
              {events.length === 0
                ? 'Nothing has happened on this system in the selected period.'
                : 'Nothing on this system matches the current filter.'}
            </p>
          </div>
        ) : (
          <ul
            className="content-stretch flex flex-col items-start list-none m-0 p-0 relative shrink-0 w-full"
            data-node-id="I199383:141630;101006:7299;199383:141681"
          >
            {visibleEvents.map((event, i) => {
              const eventId = event.id ?? i
              return (
                <EventRow
                  key={eventId}
                  event={event}
                  eventId={eventId}
                  index={i}
                  isLast={i === visibleEvents.length - 1}
                  isOpen={expandedId === eventId}
                  onToggle={handleToggle}
                />
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
