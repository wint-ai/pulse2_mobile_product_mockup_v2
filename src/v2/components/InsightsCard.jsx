/**
 * Insights card — v2 mobile.
 * Design source: Figma 198328:88624 (home). This file also used to name
 * 198378:74090 (system page), but that node no longer resolves in the Figma
 * file, so the home card is the only live reference for the values below.
 *
 * Both pages drew their own copy of this, and they had drifted: the home copy
 * hardcoded a green sparkline and a green TrendingDown badge for every row, so
 * a rising-usage row rendered as if consumption had fallen, and a row with no
 * delta ("Background flow") still got a badge. Tone is data now, not
 * decoration — and since every icon slot on the comp's Badge is hidden, tone
 * now survives as colour alone and the trend glyph is gone.
 */

import { cn } from '@/lib/utils'
import { DropletDown, DropletShare, Droplets } from '@/v2/icons'

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
  return `${body.replace(/[\s\u2013\u2014·,-]+$/, '')}..`
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
 *
 * `stroke` stays tone-driven rather than the comp's flat #0B82F8: the comp
 * draws one blue trace per row, which is exactly the drift the header note
 * describes, so a falling row reads green and a rising one red.
 */
const TONE = {
  good: { chip: { background: '#E7F2EB', color: '#269950' }, stroke: SUCCESS },
  bad: { chip: { background: 'rgba(251,44,54,0.08)', color: '#FB2C36' }, stroke: SEV_HIGH },
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

/**
 * @param rows  [{ title, addr, kind, delta, deltaTone: 'good'|'bad', value,
 *              series?, baseline? }]
 *              `delta` may be null — a Background-flow row states a rate and has
 *              no change to report, so it gets no badge. `series`/`baseline` are
 *              the real 28-day arrays from insightsModel.js; omit them and the
 *              sparkline falls back to a placeholder shape.
 * @param onSelectRow  omit and the rows stay non-interactive. Given a handler
 *                  each row becomes a real button carrying its insight.
 * @param onViewAll  omit to render "View all" inert. RESOLVED 2026-09-28:
 *                  there IS a list screen, /kpi/insights, so this and the
 *                  rows both have somewhere to go now. Original note: there
 *                  is no Insights list
 *              screen on the delivery canvas, so home passes nothing.
 */
export default function InsightsCard({
  rows = [],
  title = 'Insights',
  onViewAll,
  onSelectRow,
  className,
}) {
  /* A row is a control only when the host says where it goes. Without
     onSelectRow it stays the plain <div> it has always been — no button role,
     no pointer, nothing that promises a tap. */
  const RowTag = onSelectRow ? 'button' : 'div'
  return (
    /* Figma's card shell, identical to the sibling widgets on this page. This
       used to be the shadcn <Card>, which gave it a different ground, border,
       radius and padding from every card around it — visibly a different size
       and shape in the stack. */
    <div className={["bg-[#fafbfc] border-[length:var(--border-width\\/border,1px)] border-solid border-white content-stretch flex flex-col gap-[var(--p-0,0px)] items-start overflow-clip p-[var(--p-0,0px)] relative rounded-[var(--rounded-2xl,18px)] w-full", className].filter(Boolean).join(' ')}>
      <div className="flex h-[62px] items-center justify-between w-full px-[var(--spacing\/4,16px)] py-[var(--spacing\/3,12px)]">
        {/* 18px slate-800 with -0.45px tracking, in Figma's py-[6px] title box
            (I198328:88624;149:2490;2780:50631). That box and the 32px control
            opposite are what make the header 56px rather than the title's own
            line height. */}
        <div className="py-[var(--spacing\/1\,5,6px)]">
          <div className="text-lg font-semibold leading-[18px] tracking-[-0.45px] text-slate-800">{title}</div>
        </div>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="flex h-[32px] w-[57px] shrink-0 cursor-pointer items-center justify-center rounded-[var(--component\/button\/size-default\/radius,10px)] px-[var(--component\/button\/size-default\/px,10px)] text-[length:var(--text\/sm-tight\/size,14px)] leading-[var(--text\/sm-tight\/lh,20px)] font-medium text-[color:var(--colors\/slate\/500,#62748e)] outline-none hover:bg-[rgba(0,0,0,0.04)] focus-visible:ring-[3px] focus-visible:ring-ring/50"
            style={{ color: '#0B95F8' }}
          >
            View all
          </button>
        ) : (
          /* Inert by decision: no designed destination, and Rule 0 forbids
             inventing a route. See .claude/skills/v2-page-parity. This is also
             the only state the comp draws, at 14px slate-500
             (I198328:88624;149:2490;197412:209455;198328:88623;6724:8007); the
             blue above has no counterpart in Figma and is left as it was. */
          <span className="h-[32px] inline-flex items-center text-sm font-medium text-slate-500" aria-disabled="true">
            View all
          </span>
        )}
      </div>

      <div>
        {rows.map((row, i) => {
          const tone = TONE[row.deltaTone] ?? TONE.good
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
                /* String.raw, not a plain literal: these are cn() arguments and a
                   JS string eats the backslash in --component\/card\/padding-sm,
                   so the class would never match anything in the built CSS.
                   eslint's no-useless-escape catches it, which is how this was. */
                String.raw`mx-[var(--component\/card\/padding-sm,12px)] py-[var(--spacing\/1\,5,6px)] flex items-center justify-between gap-3 rounded-[var(--component\/card\/radius,14px)]`,
                onSelectRow &&
                  'w-[calc(100%-2rem)] cursor-pointer rounded-[10px] text-left outline-none transition-colors hover:bg-[rgba(11,129,248,0.04)] focus-visible:ring-[3px] focus-visible:ring-ring/50',
              )}
              {...(onSelectRow
                ? { type: 'button', onClick: () => onSelectRow(row), 'aria-label': `Open ${row.title}` }
                : {})}
            >
              <div className="flex h-[46px] w-[153px] min-w-0 shrink-0 flex-col items-start justify-between">
                {/* Capped, not just CSS-truncated. Two competing `truncate`
                    siblings shrink each other until neither is readable; the
                    comp's own "352 Palmer.." shows the intended behaviour.
                    title= carries the full string for hover and a11y. */}
                <div className="flex items-end gap-[5px] text-sm min-w-0">
                  <span
                    className="font-semibold leading-[var(--text\/sm\/lh,20px)] text-[color:var(--colors\/slate\/900,#0f172b)] whitespace-nowrap"
                    title={row.title}
                  >
                    {cap(row.title, TITLE_MAX)}
                  </span>
                  {row.addr && (
                    <span
                      className="text-[12px] leading-[var(--text\/xs\/lh-snug,16.5px)] text-[color:var(--colors\/slate\/500,#62748e)] whitespace-nowrap"
                      title={row.addr}
                    >
                      {cap(row.addr, ADDR_MAX)}
                    </span>
                  )}
                </div>
                {/* 14px slate-900, not the 11px slate-500 this used to be — the
                    comp sets the kind at the same size as the title beside it
                    (I198328:88624;101006:7299;198328:88557). The glyph keeps its
                    own grey; slate-400 is the nearest token to what the tinted
                    droplet rendered before, and to the comp's own greys. */}
                <div className="flex items-center gap-[5px] text-sm leading-[var(--text\/sm\/lh,20px)] text-[color:var(--colors\/slate\/900,#0f172b)] min-w-0">
                  {/* A 14px glyph in an 11px slot, exactly as the comp draws it
                      (wrapper …;198328:88555): it overflows 1.5px each side
                      rather than widening the row. */}
                  <span className="flex items-center justify-center shrink-0 w-[11px] text-slate-400">
                    <Glyph size={14} />
                  </span>
                  <span className="truncate" title={row.kind}>{row.kind}</span>
                </div>
              </div>

              {/* The tile is the svg now: the comp's 57x40 #F2F6FF rect is the
                  sparkline's own background, with the traces running to its
                  edges rather than a tinted box padding a smaller drawing. */}
              <Sparkline tone={row.deltaTone} series={row.series} baseline={row.baseline} />

              {/* Badge over value, centred in a 55px column, 8px apart
                  (I198328:88624;101006:7299;198328:88562). min-w rather than a
                  fixed 55px so an unexpectedly long value grows the column
                  instead of spilling over the sparkline. */}
              <div className="flex w-[55px] shrink-0 flex-col items-center gap-[8px]">
                {row.delta && (
                  /* Text only. Every icon slot on the comp's Badge — leftIcon,
                     rightIcon and arrow-drop-down-line — is hidden, on all three
                     badges, and the 52px badge leaves no room for a glyph. */
                  <span
                    className="inline-flex h-[20px] items-center justify-center px-[var(--component\/badge\/px,8px)] py-[var(--component\/badge\/py,2px)] rounded-[var(--component\/badge\/radius,26px)] text-[12px] leading-[var(--text\/xs\/lh,16px)] font-medium tabular-nums"
                    style={tone.chip}
                  >
                    {row.delta}
                  </span>
                )}
                {row.value && (
                  <div className="flex items-center gap-[var(--spacing\/0\,5,2px)] text-[12px] leading-[var(--text\/xs\/lh-none,12px)] tabular-nums whitespace-nowrap">
                    <span className="text-[color:var(--colors\/slate\/900,#0f172b)]">{valueNum}</span>
                    {/* Figma calls this --muted-foreground; this project defines
                        that token as slate-500 (#62748e). */}
                    {valueUnit && <span className="text-[color:var(--muted-foreground,#737373)]">{valueUnit}</span>}
                  </div>
                )}
              </div>
            </RowTag>
          )
        })}
      </div>
    </div>
  )
}
