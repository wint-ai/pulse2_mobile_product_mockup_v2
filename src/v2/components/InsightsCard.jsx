/**
 * Insights card — v2 mobile.
 * Design source: Figma 198328:88624 (home) and 198378:74090 (system page).
 *
 * Both pages drew their own copy of this, and they had drifted: the home copy
 * hardcoded a green sparkline and a green TrendingDown badge for every row, so
 * a rising-usage row rendered as if consumption had fallen, and a row with no
 * delta ("Background flow") still got a badge. Tone is data now, not decoration.
 */

import { Card } from '@/components/ui/card'
import { Droplet, TrendingDown, TrendingUp } from 'lucide-react'

const SUCCESS = '#5C9E1A'
const SEV_HIGH = '#DB4670'

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
    <Card className={className}>
      <div className="flex items-center justify-between px-4">
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
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="font-semibold text-slate-900 truncate">{row.title}</span>
                  <span className="text-slate-500 text-xs truncate">{row.addr}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                  <Droplet size={11} className="opacity-60" /> {row.kind}
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
    </Card>
  )
}
