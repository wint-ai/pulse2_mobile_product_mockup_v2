/**
 * Water consumption card — v2 (mobile).
 * Design source: Figma nodes 198328:88448 (account overview) and
 * 198378:74090 (system page). The Figma layer is named "Balance" — that is
 * leftover shadcn template naming, the card is water consumption.
 *
 * Bars are rendered with recharts via @/components/ui/chart so the series is
 * hoverable and re-scales with the container; the hand-rolled div bars it
 * replaces could do neither.
 */

import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Funnel } from '@/v2/icons'
import { cn } from '@/lib/utils'

// ── Mock data ──────────────────────────────────────────────────────────────
// Daily litres for Apr 1–30. Invented: src/data/consumption.js generates a
// per-system series but is keyed by system id, and this card is also used on
// the account-overview screen where no single system applies. Silhouette is
// traced from the Figma bars.
const MOCK_SERIES = [
  { day: 'Apr 1',  litres: 1180 }, { day: 'Apr 2',  litres: 560 },
  { day: 'Apr 3',  litres: 940 },  { day: 'Apr 4',  litres: 1290 },
  { day: 'Apr 5',  litres: 1980 }, { day: 'Apr 6',  litres: 1600 },
  { day: 'Apr 7',  litres: 1290 }, { day: 'Apr 8',  litres: 2210 },
  { day: 'Apr 9',  litres: 280 },  { day: 'Apr 10', litres: 1340 },
  { day: 'Apr 11', litres: 1720 }, { day: 'Apr 12', litres: 1550 },
  { day: 'Apr 13', litres: 1830 }, { day: 'Apr 14', litres: 730 },
  { day: 'Apr 15', litres: 660 },  { day: 'Apr 16', litres: 760 },
  { day: 'Apr 17', litres: 2540 }, { day: 'Apr 18', litres: 2010 },
  { day: 'Apr 19', litres: 1290 }, { day: 'Apr 20', litres: 500 },
  { day: 'Apr 21', litres: 760 },  { day: 'Apr 22', litres: 1420 },
  { day: 'Apr 23', litres: 1180 }, { day: 'Apr 24', litres: 640 },
  { day: 'Apr 25', litres: 1870 }, { day: 'Apr 26', litres: 2090 },
  { day: 'Apr 27', litres: 980 },  { day: 'Apr 28', litres: 1260 },
  { day: 'Apr 29', litres: 430 },  { day: 'Apr 30', litres: 1540 },
]

// The Figma comp shows 1.8K / 12.4K / 28.7K, but those literals contradict any
// real series: a single Apr-17 bar is 2,540 L, which already exceeds a 1.8K
// "total", and the stated 28.7K peak month is below the 38.4K month on screen.
// A static comp can carry that; this card can't, because the tooltip puts real
// litre values under the cursor and one hover exposes the lie. So the headline
// figures are derived from the window actually being displayed, and the period
// switch updates them. Pass `stats` to override with real aggregates.
const fmtL = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(Math.round(n)))

function deriveStats(series) {
  if (!series.length) return []
  const total = series.reduce((sum, d) => sum + d.litres, 0)
  return [
    { value: fmtL(total), label: 'Total L' },
    { value: fmtL(total / series.length), label: 'Avg / Day L' },
    { value: fmtL(Math.max(...series.map((d) => d.litres))), label: 'Peak Day L' },
  ]
}

const PERIODS = [
  { id: '7d',  label: '7 days',  points: 7 },
  { id: '14d', label: '14 days', points: 14 },
  { id: '30d', label: '30 days', points: 30 },
]

// ChartStyle turns this into --color-litres on the container, which is why the
// bar fill below is a var() and not a hex.
const CHART_CONFIG = {
  litres: { label: 'Litres', color: 'var(--chart-1)' },
}

export default function WaterConsumptionCard({
  data = MOCK_SERIES,
  title = 'Water consumption',
  stats,
  className,
}) {
  const [periodOpen, setPeriodOpen] = useState(false)
  const [periodId, setPeriodId] = useState('30d')

  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[2]
  const series = data.slice(-period.points)
  const headline = stats ?? deriveStats(series)
  // Aim for ~6 x-axis labels whatever the window is; a label per bar is
  // unreadable at 375px and a fixed interval goes blank on short windows.
  const tickInterval = Math.max(0, Math.round(series.length / 6) - 1)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-slate-900">{title}</CardTitle>
        <CardAction>
          <button
            type="button"
            aria-label="Change period"
            aria-expanded={periodOpen}
            onClick={() => setPeriodOpen((v) => !v)}
            className={cn(
              '-m-1 p-1 rounded-md transition-colors',
              periodOpen ? 'text-[#0B95F8]' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <Funnel size={16} />
          </button>
        </CardAction>
      </CardHeader>

      {periodOpen && (
        <div className="px-4 flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodId(p.id)}
              aria-pressed={p.id === periodId}
              className={cn(
                'px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors',
                p.id === periodId ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <CardContent className="grid grid-cols-3 gap-2">
        {headline.map((s) => (
          <div key={s.label}>
            <div className="text-lg font-semibold text-slate-900 leading-tight tabular-nums">
              {s.value}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </CardContent>

      <CardContent>
        {/* aspect-auto cancels ChartContainer's default aspect-video; the phone
            frame needs a fixed height, not a 16:9 box. */}
        <ChartContainer config={CHART_CONFIG} className="aspect-auto h-[180px] w-full">
          <BarChart accessibilityLayer data={series} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tickMargin={8}
              interval={tickInterval}
              fontSize={10}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--color-litres)', fillOpacity: 0.08 }}
              content={<ChartTooltipContent />}
            />
            {/* Grow-in animation off: recharts drives it from rAF, which never
                ticks under happy-dom, so a DOM test of this card would see empty
                bars. The chart is small enough that it loses nothing. */}
            <Bar
              dataKey="litres"
              fill="var(--color-litres)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
