/**
 * Insights card — v2 mobile. ONE component, two layouts, two tones.
 *
 * METRIC layout (the redesigned System page):
 *   calm   199296:50344   bg #fafbfc, gap 19, p 18, radius 18, w-full
 *   alert  199296:51143   byte-identical but for `h-[198px] w-[366px]`
 * The two Figma ranges differ in nothing else — same heading, same droplet,
 * same badge, same unit pair, same 330x86 frame, down to the node order. The
 * alert node's h/w are Figma's absolute frame numbers (18+18 padding + 18
 * heading + 19 + 20 row + 19 + 86 sparkline = exactly 198, and 366 is the
 * card's own width on that canvas), so carrying them would pin a card the rest
 * of the stack sizes with w-full — see homeWidgetWidth.dom.test.jsx, which
 * exists because two cards once did precisely that. `tone` is therefore
 * carried as data (`data-insights-tone`) and changes no pixel; the thing that
 * DOES change colour is the badge, and it follows the figure's sign, not tone.
 *
 * LIST layout (home + the v1 system page): the original multi-row card, from
 * Figma 198328:88624. Three screens pass `rows` and they keep it; a card that
 * gets a `rows` array renders the list exactly as it always has.
 *
 * THE SPARKLINE IS DERIVED, NOT SHIPPED. The comp exports the frame as a flat
 * SVG (2315f.svg) — one frozen curve that would be a lie about every system it
 * was drawn over. insightsSparkline.js redraws the same frame (330x86, radius
 * 4.31579, ground #F2F6FF, 2.15789 strokes, #0B82F8 actual over a dashed
 * #90A1B9 baseline) from the system's own series.
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

import { cn } from '@/lib/utils'
import { DropletDown, DropletShare, Droplets } from '@/v2/icons'
import {
  SPARK_W,
  SPARK_H,
  SPARK_RADIUS,
  SPARK_STROKE,
  SPARK_GROUND,
  SPARK_ACTUAL,
  SPARK_BASELINE,
  sparkExtent,
  sparklinePath,
  trendLine,
  formatChangePct,
  formatChangeLitres,
  changeDirection,
} from '@/v2/components/insightsSparkline'

const SUCCESS = '#5C9E1A'
const SEV_HIGH = '#DB4670'

/**
 * Cap a string the way the comp does — "352 Palmer.." — rather than relying on
 * CSS alone. Breaks on a word boundary when one is close to the limit so the
 * result reads as a name rather than a severed string, and never returns
 * something longer than the input.
 */
function cap(text, max) {
  const s = String(text ?? '').trim()
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  const body = lastSpace > max - 8 ? cut.slice(0, lastSpace) : cut
  return `${body.replace(/[\s–—·,-]+$/, '')}..`
}

// Budgets for a 375px row. The title gets the larger share because it is the
// thing being identified; the address is context and degrades gracefully.
const TITLE_MAX = 22
const ADDR_MAX = 16

/*
 * Chip colours are the comp's own — #e7f2eb/#269950 on the decrease badge
 * (I198328:88624;101006:7299;198328:88563) and rgba(251,44,54,0.08)/#fb2c36 on
 * the increase (…;198328:88599). They are also the pair this repo already
 * records in insightsModel.js INSIGHT_COLOR, so the card had been ignoring its
 * own data model's colours in favour of stock Tailwind green-100/red-100.
 * CONFIRMED 2026-10-20 against 199323:12261 (and its calm twin), which draws
 * the +12.5% badge at bg rgba(251,44,54,0.08) over
 * text-[color:var(--colors/red/500,#fb2c36)] — byte for byte the `bad` pair
 * below. The increase red is Figma's now, not this repo's correction to it.
 *
 * `stroke` stays tone-driven rather than the comp's flat #0B82F8: the comp
 * draws one blue trace per row, which is exactly the drift the header note
 * describes, so a falling row reads green and a rising one red.
 */
const TONE = {
  good: { chip: { background: '#E7F2EB', color: '#269950' }, stroke: SUCCESS },
  bad: { chip: { background: 'color-mix(in oklab, var(--destructive) 8%, transparent)', color: '#FB2C36' }, stroke: SEV_HIGH },
}

/**
 * The comp draws a different Tabler droplet per insight kind rather than one
 * generic drop: droplet-down for a fall (…;198328:88556 and …;88611),
 * droplet-share for a rise (…;198328:88592), droplets for background flow
 * (…;198328:88575). The glyph carries the meaning, so it has to follow the row.
 *
 * Driven off data the rows already carry. `kind` is free text — "Usage change"
 * in the comps, "Usage increased"/"Usage decreased" from insightsModel — so
 * background flow is matched on the phrase and the rest split on deltaTone.
 */
function kindGlyph(row) {
  if (/background\s*flow/i.test(String(row?.kind ?? ''))) return Droplets
  return row?.deltaTone === 'bad' ? DropletShare : DropletDown
}

// The comp's sparkline tile, measured off I198328:88624;101006:7299;198328:88559:
// a 57x40 rect, rx 2, #F2F6FF, with both traces running edge to edge across it.
const TILE_W = 57
const TILE_H = 40
const TILE_PAD_Y = 10

/** Map one series into the tile, on a scale shared with its companion line. */
function toPath(values, lo, hi) {
  if (!Array.isArray(values) || values.length === 0) return null
  const span = hi - lo || 1
  const stepX = values.length > 1 ? TILE_W / (values.length - 1) : 0
  return values
    .map((v, i) => {
      const x = values.length > 1 ? i * stepX : TILE_W / 2
      const y = TILE_H - TILE_PAD_Y - ((v - lo) / span) * (TILE_H - TILE_PAD_Y * 2)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

/**
 * Actual against expected, which is the only thing that makes this worth
 * drawing: a solid trace for the real series and the comp's dashed #90A1B9
 * line for the baseline it is being judged against. Both are scaled together,
 * or the gap between them would not mean anything.
 *
 * insightsModel.js computes both arrays per row and HomeAllAccounts' live path
 * forwards them. HomeAccountOverview and SystemPage still drop them in their
 * own row maps, so those two fall back to the placeholder shape below until
 * they pass `series`/`baseline` through.
 */
function Sparkline({ tone, series, baseline }) {
  const stroke = (TONE[tone] ?? TONE.good).stroke
  const points = [...(Array.isArray(series) ? series : []), ...(Array.isArray(baseline) ? baseline : [])]
    .filter(n => Number.isFinite(n))
  const lo = points.length ? Math.min(...points) : 0
  const hi = points.length ? Math.max(...points) : 0
  const actual = toPath(series, lo, hi)
  const expected = toPath(baseline, lo, hi)
  // States nothing it has not been told: with no series to plot it only leans
  // the way the row's own tone already reads. Not a stand-in for real numbers.
  const placeholder = tone === 'bad'
    ? 'M 2 30 L 11 27 L 20 28 L 29 20 L 38 21 L 47 15 L 55 12'
    : 'M 2 12 L 11 17 L 20 15 L 29 22 L 38 20 L 47 26 L 55 29'

  return (
    <svg
      viewBox={`0 0 ${TILE_W} ${TILE_H}`}
      width={TILE_W}
      height={TILE_H}
      className="shrink-0"
      aria-hidden="true"
    >
      <rect width={TILE_W} height={TILE_H} rx="2" fill="#F2F6FF" />
      {expected && (
        <path
          d={expected}
          stroke="#90A1B9"
          strokeWidth="1"
          strokeDasharray="2.8 2.8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <path d={actual ?? placeholder} stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * The comp states the figure as a number plus a separately-muted unit
 * (I198328:88624;101006:7299;198328:88564). Callers pass one already-formatted
 * string, and that string stays the source of truth — this only splits it for
 * display, on the last space. "16.1 L/h" becomes 16.1 + L/h; a bare "+12.5%"
 * from insightValueLabel() has no unit and is left whole.
 */
function splitValue(value) {
  const s = String(value ?? '').trim()
  const at = s.lastIndexOf(' ')
  return at === -1 ? [s, ''] : [s.slice(0, at), s.slice(at + 1)]
}

/* ── Metric layout (System page redesign, 199296:50344 / 199296:51143) ──────*/

/* Figma spells the family and the weight as two separate classes on every text
   node. Kept verbatim, with the project's own fallbacks appended so the card
   renders in a browser that has never heard of "Figtree:Regular". */

/* CLASS ORDER, read this before "tidying" any className below. Every text atom
   in this file goes through cn(), i.e. through twMerge. Tailwind's `text-sm/6`
   shorthand sets size *and* line-height, so twMerge puts `leading-*` in the
   same conflict group as the font size: a `leading-*` sitting BEFORE a
   `text-[length:…]` / `text-[12px]` in the same string is silently deleted and
   the row drifts a few pixels vertically. Figma emits its classes
   alphabetically, which puts `leading-` first — so wherever a verbatim paste
   would have done that, the line-height atom has been moved to the END of the
   string. Same class set, different order. Do not re-sort it back. */
const FIG_REG = String.raw`font-sans font-normal`
const FIG_MED = String.raw`font-sans font-medium`

/*
 * The metric frame only ever exports #e7f2eb/#269950, because the figure it
 * drew was -12.5%; a RISE in water use is not green. Up takes the pair this
 * repo already records as its own semantic increase colour (insightsModel.js
 * INSIGHT_COLOR 'usage-up' = #FB2C36, over the 8% wash the web's own increase
 * badge uses) — and the list frame 199323:12261 now draws its own +12.5% badge
 * at exactly that pair, so this is Figma's red, not an invented one. A flat 0%
 * is neither good nor bad and reads slate.
 */
const BADGE_TONE = {
  down: 'bg-[#e7f2eb] text-[#269950]',
  up: 'bg-destructive/8 text-destructive',
  flat: String.raw`bg-muted text-slate-700`,
}

/*
 * The two states' node ids, in the order the frame is written below. The calm
 * range (199296:50344…50358) and the alert one (199296:51143…51157) are the
 * same sixteen nodes under different ids, so the id travels with `tone` rather
 * than the calm one being stamped on an alert card.
 */
const CALM_NODES = [
  '199296:50344', '199296:50345', '199296:50346', '199296:50347',
  '199296:50348', '199296:50349', '199296:50350', '199296:50351',
  '199296:50352', '199296:50353', 'I199296:50353;136:1190', '199296:50354',
  '199296:50355', '199296:50356', '199296:50357', '199296:50358',
]
const ALERT_NODES = [
  '199296:51143', '199296:51144', '199296:51145', '199296:51146',
  '199296:51147', '199296:51148', '199296:51149', '199296:51150',
  '199296:51151', '199296:51152', 'I199296:51152;136:1190', '199296:51153',
  '199296:51154', '199296:51155', '199296:51156', '199296:51157',
]

/** Same reading, as a glyph: down = droplet-down (the comp's), up = share. */
const DIRECTION_GLYPH = { down: DropletDown, up: DropletShare, flat: Droplets }

function MetricSparkline({ series, baseline }) {
  // No measured expectation passed? Fit one to the series — a derivation of the
  // real numbers, which is what the comp's grey line reads as. See trendLine().
  const expected = Array.isArray(baseline) && baseline.length ? baseline : trendLine(series)
  const extent = sparkExtent(series, expected)
  const actualPath = sparklinePath(series, extent)
  const baselinePath = expected.length ? sparklinePath(expected, extent) : null

  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="none"
      className="absolute inset-0 block size-full max-w-none"
      aria-hidden="true"
      data-spark-points={actualPath ? 'series' : 'empty'}
    >
      <rect width={SPARK_W} height={SPARK_H} rx={SPARK_RADIUS} fill={SPARK_GROUND} />
      {baselinePath && (
        <path
          d={baselinePath}
          stroke={SPARK_BASELINE}
          strokeWidth={SPARK_STROKE}
          strokeDasharray="6 6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {actualPath && (
        <path
          d={actualPath}
          stroke={SPARK_ACTUAL}
          strokeWidth={SPARK_STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}

function InsightsMetricCard({
  title,
  label,
  changePct,
  changeLitres,
  unit,
  series,
  baseline,
  tone,
  onViewAll,
  className,
}) {
  const pct = formatChangePct(changePct)
  const litres = formatChangeLitres(changeLitres)
  const direction = changeDirection(changePct, changeLitres)
  const NODE = tone === 'alert' ? ALERT_NODES : CALM_NODES
  const Glyph = DIRECTION_GLYPH[direction] ?? DropletDown

  return (
    <div
      className={cn(
        String.raw`bg-surface-card content-stretch flex flex-col gap-[19px] items-start p-[18px] relative rounded-[18px] shrink-0 w-full`,
        className,
      )}
      data-node-id={NODE[0]}
      data-name="Topology"
      data-insights-tone={tone}
    >
      {/* Heading. The frame has no control beside it — nothing in it is
          tappable, so nothing here pretends to be. A caller that genuinely has
          somewhere to send the viewer may pass onViewAll, and only then does a
          real button appear. */}
      <div
        className={cn(
          'content-stretch flex flex-col items-start relative shrink-0 w-full',
          onViewAll && 'flex-row items-center justify-between',
        )}
        data-node-id={NODE[1]}
      >
        <p
          className={cn(
            FIG_REG,
            /* leading-* trails the size atom on purpose — see the CLASS ORDER note above FIG_REG. */
            String.raw`[word-break:break-word] relative shrink-0 text-slate-700 text-lg whitespace-nowrap leading-[18px]`,
          )}
          data-node-id={NODE[2]}
        >
          {title}
        </p>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className={cn(
              FIG_MED,
              String.raw`shrink-0 cursor-pointer rounded-lg px-2.5 text-sm leading-5 text-muted-foreground outline-none hover:bg-[rgba(0,0,0,0.04)] focus-visible:ring-[3px] focus-visible:ring-ring/50`,
            )}
          >
            View all
          </button>
        )}
      </div>

      {/* The reading: droplet + label on the left, badge + unit pair right. */}
      <div
        className="content-stretch flex items-center justify-between relative shrink-0 w-full"
        data-node-id={NODE[3]}
      >
        <div className="content-stretch flex gap-[5px] items-center relative shrink-0" data-node-id={NODE[4]}>
          {/* A 14px glyph in an 11px slot, exactly as the comp draws it: it
              overflows 1.5px each side rather than widening the row. #90a1b9
              is the exported asset's own stroke (c5ca5.svg). */}
          <div
            className="content-stretch flex items-center justify-center relative shrink-0 w-[11px] text-slate-400"
            data-node-id={NODE[5]}
          >
            <div className="relative shrink-0 size-[14px]" data-node-id={NODE[6]} data-name="Tabler Icons / droplet-down">
              <Glyph size={14} />
            </div>
          </div>
          <p
            className={cn(
              FIG_REG,
              /* leading-* trails the size atom on purpose — see the CLASS ORDER note above FIG_REG. */
              String.raw`[word-break:break-word] relative shrink-0 text-foreground text-sm whitespace-nowrap leading-5`,
            )}
            data-node-id={NODE[7]}
          >
            {label}
          </p>
        </div>

        <div
          className="content-stretch flex gap-[8px] items-start justify-center relative shrink-0"
          data-node-id={NODE[8]}
        >
          {pct && (
            <div
              className={cn(
                BADGE_TONE[direction] ?? BADGE_TONE.flat,
                String.raw`content-stretch flex gap-1 h-[20px] items-center justify-center overflow-clip px-2 py-0.5 relative rounded-[26px] shrink-0`,
              )}
              data-node-id={NODE[9]}
              data-name="Badge"
            >
              <p
                className={cn(
                  FIG_MED,
                  /* leading-* trails the size atom on purpose — see the CLASS ORDER note above FIG_REG. */
                  String.raw`[word-break:break-word] overflow-hidden relative shrink-0 text-[12px] text-ellipsis whitespace-nowrap tabular-nums leading-4`,
                )}
                data-node-id={NODE[10]}
              >
                {pct}
              </p>
            </div>
          )}
          {litres && (
            <div
              className={cn(
                FIG_REG,
                /* leading-* trails the size atom on purpose — see the CLASS ORDER note above FIG_REG. */
                String.raw`[word-break:break-word] content-stretch flex gap-0.5 items-center relative shrink-0 text-[12px] whitespace-nowrap tabular-nums leading-3`,
              )}
              data-node-id={NODE[11]}
              data-name="Unit wrapper"
            >
              <p
                className={String.raw`overflow-hidden relative shrink-0 text-foreground text-ellipsis`}
                data-node-id={NODE[12]}
              >
                {litres}
              </p>
              {/* Figma calls this --muted-foreground; this project defines that
                  token as slate-500 (#62748e). */}
              {unit && (
                <p
                  className="overflow-hidden relative shrink-0 text-muted-foreground text-ellipsis"
                  data-node-id={NODE[13]}
                >
                  {unit}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 330x86 is the card's own content width at the comp's 366px — i.e. the
          frame is edge to edge. max-w-full keeps it that way on a narrower
          phone instead of spilling past the card's padding; the svg stretches
          with preserveAspectRatio="none", exactly as the exported asset does. */}
      <div className="content-stretch flex items-start relative shrink-0 w-full" data-node-id={NODE[14]}>
        <div className="h-[86px] relative shrink-0 w-[330px] max-w-full" data-node-id={NODE[15]}>
          <MetricSparkline series={series} baseline={baseline} />
        </div>
      </div>
    </div>
  )
}

/* ── List layout (home, 198328:88624; re-derived from the Account/Location
      screen, 199323:12261 in the ALERT state and 199371:137xxx in the CALM one
      — the two emit byte-identical markup for this card) ───────────────────*/

/* String.raw, not a plain literal. A JS "…\\/…" reaches the DOM correctly but
   the Tailwind scanner reads the SOURCE text, i.e. two backslashes, and emits
   a selector the runtime class never matches; a single-backslash "…\/…"
   collapses to a bare slash, which Tailwind then parses as an opacity
   modifier. Only String.raw makes the scanned candidate and the emitted class
   the same bytes. The same note sits at the top of WaterConsumptionCardV2.jsx.

   The node also spells h-[380px] on this frame. That is Figma's absolute
   canvas height and it is deliberately NOT carried, for the same reason the
   metric card drops the alert state's h-[198px] w-[366px] — see
   homeWidgetWidth.dom.test.jsx. */
const LIST_SHELL = String.raw`bg-surface-card border border-solid border-card content-stretch flex flex-col gap-0 items-start overflow-clip p-0 relative rounded-[18px] w-full`

/**
 * @param rows  [{ title, addr, kind, delta, deltaTone: 'good'|'bad', value,
 *              series?, baseline? }]
 *              `delta` may be null — a Background-flow row states a rate and has
 *              no change to report, so it gets no badge. `series`/`baseline` are
 *              the real 28-day arrays from insightsModel.js; omit them and the
 *              sparkline falls back to a placeholder shape.
 *              PASSING `rows` AT ALL (even []) SELECTS THIS LAYOUT — that is
 *              what keeps HomeAllAccounts, HomeAccountOverview and the v1
 *              SystemPage rendering exactly what they rendered before.
 * @param changePct     number or pre-formatted string. Drives the badge text
 *              AND its colour: negative reads as a fall and stays the comp's
 *              green, positive flips to the repo's semantic increase red.
 * @param changeLitres  number or pre-formatted string — the figure beside the
 *              unit. Both figures are props; neither is hardcoded.
 * @param series    the system's real series — a number[] or
 *              getConsumptionSeries()'s [{ day, litres }]. The sparkline is
 *              drawn from it; pass nothing and only the ground renders.
 * @param baseline  the expectation the series is judged against. Omitted, a
 *              least-squares trend of the series itself is drawn instead.
 * @param tone  'calm' | 'alert'. The two Figma states are identical but for
 *              the alert frame's absolute h/w, so this is carried as
 *              data-insights-tone and changes no pixel. See the header note.
 * @param variant  'metric' | 'list'. Omit and the layout follows the props:
 *              a `rows` array means the list, anything else the metric card.
 * @param onViewAll  omit to render "View all" inert (list) or absent (metric,
 *                  which is what the frame draws). RESOLVED 2026-09-28: there
 *                  IS a list screen, /kpi/insights, so this and the rows both
 *                  have somewhere to go now.
 * @param onSelectRow  list layout only. Omit and the rows stay
 *                  non-interactive. Given a handler each row becomes a real
 *                  button carrying its insight.
 */
export default function InsightsCard({
  rows,
  title = 'Insights',
  label = 'Usage change',
  changePct,
  changeLitres,
  unit = 'L',
  series,
  baseline,
  tone = 'calm',
  variant,
  onViewAll,
  onSelectRow,
  className,
}) {
  /* Layout selection is deliberately boring: a caller that passes `rows` gets the
     list it has always got, including `rows={[]}`. Everything else is the
     redesigned metric card. `variant` overrides both ways for a caller that
     wants to be explicit. */
  const metric = variant === 'metric' || (variant !== 'list' && !Array.isArray(rows))
  if (metric) {
    return (
      <InsightsMetricCard
        title={title}
        label={label}
        changePct={changePct}
        changeLitres={changeLitres}
        unit={unit}
        series={series}
        baseline={baseline}
        tone={tone}
        onViewAll={onViewAll}
        className={className}
      />
    )
  }

  const list = Array.isArray(rows) ? rows : []
  /* A row is a control only when the host says where it goes. Without
     onSelectRow it stays the plain <div> it has always been — no button role,
     no pointer, nothing that promises a tap. */
  const RowTag = onSelectRow ? 'button' : 'div'
  return (
    /* Figma's card shell, identical to the sibling widgets on this page. This
       used to be the shadcn <Card>, which gave it a different ground, border,
       radius and padding from every card around it — visibly a different size
       and shape in the stack. */
    <div className={[LIST_SHELL, className].filter(Boolean).join(' ')}>
      <div className={String.raw`flex h-[62px] items-center justify-between w-full px-4 py-3`}>
        {/* 18px slate-800 with -0.45px tracking, in Figma's py-[6px] title box
            (I199323:12261;149:2490;2780:50631). That box and the 32px control
            opposite are what make the header 62px rather than the title's own
            line height. flex-1/min-w-0 is the node's own `flex-[1_0_0]
            min-w-px` on the Title-and-desc wrapper: the title takes the slack
            and the View-all pill keeps its 57px. */}
        <div className={String.raw`min-w-0 flex-1 py-1.5`}>
          <div
            className={String.raw`w-full truncate font-semibold tracking-[-0.45px] text-lg leading-[18px] text-slate-800`}
          >
            {title}
          </div>
        </div>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className={String.raw`flex h-[32px] w-[57px] shrink-0 cursor-pointer items-center justify-center rounded-lg px-2.5 font-medium text-sm leading-5 text-muted-foreground outline-none hover:bg-[rgba(0,0,0,0.04)] focus-visible:ring-[3px] focus-visible:ring-ring/50`}
          >
            View all
          </button>
        ) : (
          /* Inert when the caller names no destination — Rule 0 forbids
             inventing a route. See .claude/skills/v2-page-parity. */
          <span className="h-[32px] inline-flex items-center text-sm font-medium text-slate-500" aria-disabled="true">
            View all
          </span>
        )}
      </div>

      {/* cardContent — I199323:12261;101006:7299. The inset belongs HERE, not on
          each row: the node pads the content box (px component/card/padding-sm
          16, pt component/calendar/padding 12, pb component/card/padding 24) and
          gives every Goal `w-full`. The rows used to carry mx-[…,12px] instead,
          which both insets them by the wrong number and made the interactive
          variant compute its own w-[calc(100%-2rem)] to compensate. */}
      <div
        className={String.raw`w-full px-4 pt-3 pb-6`}
      >
        {/* EMPTY IS A REAL STATE HERE, 2026-10-21. On the System page this card
            lists one system's insights, and the upstream model gives most
            systems none at all (18 of 103 — see insightSeriesParity). Before,
            `rows={[]}` rendered a header over nothing, which reads as a card
            that failed to load rather than a system with nothing to report.
            The web says so in words too (SystemInsightsTab:
            "noInsightsForSystem"). */}
        {list.length === 0 ? (
          <p className="w-full py-6 text-center text-slate-500 text-[14px] leading-5">
            No unusual patterns here yet
            <span className="mt-1 block text-slate-400 text-[13px] leading-[18px]">
              We check every reading for background flow and usage shifts
            </span>
          </p>
        ) : null}
        {list.map((row, i) => {
          const rowTone = TONE[row.deltaTone] ?? TONE.good
          const Glyph = kindGlyph(row)
          const [valueNum, valueUnit] = splitValue(row.value)
          return (
            /* No rule between rows: the comp's cardContent holds four bare Goal
               frames (I198328:88624;101006:7299) with no separator node and no
               stroke on any of them — whitespace is the whole separation. The
               border-t here was a house pattern, not a Figma value. */
            <RowTag
              key={`${row.title}-${i}`}
              className={cn(
                /* Goal — I199323:12261;101006:7299;199323:12286. w-full with no
                   gap and no margin: the node's Goal is a plain justify-between
                   between the 153px name block and the 122px readings group,
                   and the inset comes from cardContent above. */
                String.raw`w-full py-1.5 flex items-center justify-between rounded-xl`,
                onSelectRow &&
                  'cursor-pointer rounded-[10px] text-left outline-none transition-colors hover:bg-primary/4 focus-visible:ring-[3px] focus-visible:ring-ring/50',
              )}
              {...(onSelectRow
                ? { type: 'button', onClick: () => onSelectRow(row), 'aria-label': `Open ${row.title}` }
                : {})}
            >
              {/* Row — …;199323:12287. 153px, and NOT shrink-0: the node can
                  afford shrink-0 at its 366px canvas, but below ~340px the
                  153 + 122 pair no longer fits and a rigid block is what used
                  to push the name over the sparkline. */}
              <div className="flex h-[46px] w-[153px] min-w-0 flex-col items-start justify-between">
                {/* THE OVERLAP FIX, and the node settles it. The name line is
                    the node's own fixed 153px box (…;199323:12288) and the
                    address inside it is `overflow-hidden text-ellipsis
                    whitespace-nowrap` on a width Figma resolved to whatever
                    the title left over — 100px, 65px, 76px and 60px across the
                    four rows, i.e. "fill the remainder and ellipsise". So the
                    address is the part that gives way, which is also what
                    row 3 shows for a title too long for the box ("23 Arroyo
                    Resid..."). Rendered here as a bounded flex line: both
                    children are min-w-0 + truncate and the box clips, so a
                    long MRG name can no longer paint across the sparkline.
                    cap() stays — it breaks on a word boundary, which reads as a
                    name where a bare CSS ellipsis severs mid-word — and
                    title= carries the full string for hover and a11y. */}
                <div className="flex w-full min-w-0 items-end gap-[5px] overflow-hidden text-sm">
                  <span
                    className={String.raw`min-w-0 truncate font-semibold leading-5 text-foreground`}
                    title={row.title}
                  >
                    {cap(row.title, TITLE_MAX)}
                  </span>
                  {row.addr && (
                    /* …;199323:12290 — a 20px box that bottom-aligns the 12px
                       address against the 14px title, pb-px included. */
                    <div className="flex h-[20px] min-w-0 items-end justify-center pb-px">
                      <span
                        className={String.raw`min-w-0 truncate text-[12px] leading-[16.5px] text-muted-foreground`}
                        title={row.addr}
                      >
                        {cap(row.addr, ADDR_MAX)}
                      </span>
                    </div>
                  )}
                </div>
                {/* 14px slate-900, not the 11px slate-500 this used to be — the
                    comp sets the kind at the same size as the title beside it
                    (I198328:88624;101006:7299;198328:88557). The glyph keeps its
                    own grey; slate-400 is the nearest token to what the tinted
                    droplet rendered before, and to the comp's own greys. */}
                <div
                  className={String.raw`flex min-w-0 w-full items-center gap-[5px] text-sm leading-5 text-foreground`}
                >
                  {/* A 14px glyph in an 11px slot, exactly as the comp draws it
                      (wrapper …;198328:88555): it overflows 1.5px each side
                      rather than widening the row. */}
                  <span className="flex items-center justify-center shrink-0 w-[11px] text-slate-400">
                    <Glyph size={14} />
                  </span>
                  <span className="truncate" title={row.kind}>{row.kind}</span>
                </div>
              </div>

              {/* The readings group — …;199323:12296. One 122px shrink-0 box
                  holding the 57px sparkline and the 55px figure column
                  justify-between, i.e. 10px apart and pinned to the right
                  edge. They used to be two loose siblings of a gap-3
                  justify-between row, which spread the slack EVENLY and left
                  the sparkline floating in the middle of the row instead of
                  travelling with the figures. */}
              <div className="flex w-[122px] shrink-0 items-center justify-between">
                {/* The tile is the svg: the comp's 57x40 #F2F6FF rect is the
                    sparkline's own background, with the traces running to its
                    edges rather than a tinted box padding a smaller drawing. */}
                <Sparkline tone={row.deltaTone} series={row.series} baseline={row.baseline} />

                {/* Badge over value, centred in a 55px column, 8px apart
                    (…;199323:12300). */}
                <div className="flex w-[55px] shrink-0 flex-col items-center gap-[8px]">
                  {row.delta && (
                    /* Text only. Every icon slot on the comp's Badge — leftIcon,
                       rightIcon and arrow-drop-down-line — is hidden, on all three
                       badges, and the 52px badge leaves no room for a glyph. */
                    <span
                      className={String.raw`inline-flex h-[20px] items-center justify-center px-2 py-0.5 rounded-[26px] font-medium tabular-nums text-[12px] leading-4`}
                      style={rowTone.chip}
                    >
                      {row.delta}
                    </span>
                  )}
                  {row.value && (
                    <div
                      className={String.raw`flex items-center gap-0.5 tabular-nums whitespace-nowrap text-[12px] leading-3`}
                    >
                      <span className={String.raw`text-foreground`}>{valueNum}</span>
                      {/* Figma calls this --muted-foreground; this project defines
                          that token as slate-500 (#62748e). */}
                      {valueUnit && (
                        <span className={String.raw`text-muted-foreground`}>{valueUnit}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </RowTag>
          )
        })}
      </div>
    </div>
  )
}
