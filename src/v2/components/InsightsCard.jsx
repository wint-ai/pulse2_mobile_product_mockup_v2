/**
 * Insights card — v2 mobile.
 * Design source: Figma 198328:88624 (home) and 198378:74090 (system page).
 *
 * Both pages drew their own copy of this, and they had drifted: the home copy
 * hardcoded a green sparkline and a green TrendingDown badge for every row, so
 * a rising-usage row rendered as if consumption had fallen, and a row with no
 * delta ("Background flow") still got a badge. Tone is data now, not decoration.
 */

import { Droplet, TrendingDown, TrendingUp } from 'lucide-react'

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

const TONE = {
  good: { chip: { background: '#DCFCE7', color: '#166534' }, stroke: SUCCESS, Icon: TrendingDown },
  bad: { chip: { background: '#FEE2E2', color: '#991B1B' }, stroke: SEV_HIGH, Icon: TrendingUp },
}

/** Two traces only — the shape is decorative, so it reads as "up" or "down". */
function Sparkline({ tone }) {
  const stroke = (TONE[tone] ?? TONE.good).stroke
  const d = tone === 'bad'
    ? 'M 2 14 L 12 12 L 22 13 L 32 7 L 42 8 L 52 4 L 62 2'
    : 'M 2 4 L 12 8 L 22 6 L 32 11 L 42 9 L 52 13 L 62 14'
  return (
    <svg viewBox="0 0 64 18" width="52" height="14" aria-hidden="true">
      <path d={d} stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * @param rows  [{ title, addr, kind, delta, deltaTone: 'good'|'bad', value }]
 *              `delta` may be null — a Background-flow row states a rate and has
 *              no change to report, so it gets no badge.
 * @param onViewAll  omit to render "View all" inert. There is no Insights list
 *              screen on the delivery canvas, so home passes nothing.
 */
export default function InsightsCard({ rows = [], title = 'Insights', onViewAll, className }) {
  return (
    /* Figma's card shell, identical to the sibling widgets on this page. This
       used to be the shadcn <Card>, which gave it a different ground, border,
       radius and padding from every card around it — visibly a different size
       and shape in the stack. */
    <div className={["bg-[#fafbfc] border-[length:var(--border-width\\/border,1px)] border-solid border-white content-stretch flex flex-col gap-[var(--p-0,0px)] items-start overflow-clip p-[var(--p-0,0px)] relative rounded-[var(--rounded-2xl,18px)] w-full", className].filter(Boolean).join(' ')}>
      <div className="flex items-center justify-between w-full px-[var(--pro\/space\/4,16px)] py-[var(--spacing\/3,12px)]">
        <div className="text-base font-semibold text-slate-900">{title}</div>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium hover:underline cursor-pointer"
            style={{ color: '#0B95F8' }}
          >
            View all
          </button>
        ) : (
          /* Inert by decision: no designed destination, and Rule 0 forbids
             inventing a route. See .claude/skills/v2-page-parity. */
          <span className="text-xs font-medium" style={{ color: '#6B7280' }} aria-disabled="true">
            View all
          </span>
        )}
      </div>

      <div>
        {rows.map((row, i) => {
          const tone = TONE[row.deltaTone] ?? TONE.good
          const Icon = tone.Icon
          return (
            <div
              key={`${row.title}-${i}`}
              className="mx-4 py-3 border-t border-slate-100 first:border-t-0 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                {/* Capped, not just CSS-truncated. Two competing `truncate`
                    siblings shrink each other until neither is readable; the
                    comp's own "352 Palmer.." shows the intended behaviour.
                    title= carries the full string for hover and a11y. */}
                <div className="flex items-center gap-1.5 text-sm min-w-0">
                  <span
                    className="font-semibold text-slate-900 whitespace-nowrap"
                    title={row.title}
                  >
                    {cap(row.title, TITLE_MAX)}
                  </span>
                  {row.addr && (
                    <span
                      className="text-slate-500 text-xs whitespace-nowrap"
                      title={row.addr}
                    >
                      {cap(row.addr, ADDR_MAX)}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 min-w-0">
                  <Droplet size={11} className="opacity-60 shrink-0" />
                  <span className="truncate" title={row.kind}>{row.kind}</span>
                </div>
              </div>

              <div
                className="w-14 h-8 rounded flex items-center justify-center shrink-0"
                style={{ background: 'rgba(11,149,248,0.08)' }}
              >
                <Sparkline tone={row.deltaTone} />
              </div>

              <div className="text-right min-w-16 shrink-0">
                {row.delta && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums"
                    style={tone.chip}
                  >
                    <Icon size={11} />
                    {row.delta}
                  </span>
                )}
                {row.value && (
                  <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">{row.value}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
