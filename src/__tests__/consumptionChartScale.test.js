// The chart's scale and density rules — PRD §13, §14, §18.
//
// Asserted on the exported functions, not the DOM: recharts needs real layout,
// so nothing inside the plot renders under happy-dom and neither the ladder,
// the label cadence nor a bucket's accessible name can be read off the markup.

import { describe, it, expect } from 'vitest'
import {
  BAR_CATEGORY_GAP_PX,
  BAR_GAP_PX,
  BAR_MAX_RADIUS,
  BAR_MAX_WIDTH,
  BAR_MIN_WIDTH,
  approxTextWidth,
  barTopRadius,
  barWidthFor,
  bucketAccessibleName,
  bucketHintText,
  bucketSlotWidth,
  drawnBarWidth,
  isBucketOpenable,
  nearestBucketIndex,
  niceScale,
  niceStep,
  xLabelEvery,
  yAxisWidth,
} from '@/v2/components/chartScale'
import { axisFormatter, axisUnitLabel } from '@/v2/components/chartAxis'

describe('niceStep — the 1/1.2/1.5/2/2.5/3/4/5/6/8/10 ladder (PLS-WC-26, §14.1)', () => {
  it('rounds up to the next rung, scaled by the power of ten', () => {
    expect(niceStep(1)).toBe(1)
    expect(niceStep(1.05)).toBe(1.2)
    expect(niceStep(2.1)).toBe(2.5)
    expect(niceStep(21_250)).toBe(25_000)
    expect(niceStep(5.5)).toBe(6)
    expect(niceStep(6.5)).toBe(8)
    expect(niceStep(8.5)).toBe(10)
  })

  it('lands ON a rung rather than climbing past it', () => {
    // 40_000 / 4 / 10^4 is 0.9999999999999999 in binary floating point. Without
    // slack the step climbs to 1.2 and the whole ladder reads 12K/24K/36K/48K.
    expect(niceStep(10_000)).toBe(10_000)
    expect(niceStep(40_000 / 4)).toBe(10_000)
    expect(niceStep(2.5)).toBe(2.5)
  })

  it('floors at 1 for a non-positive or unusable raw step (§14.1)', () => {
    expect(niceStep(0)).toBe(1)
    expect(niceStep(-5)).toBe(1)
    expect(niceStep(NaN)).toBe(1)
  })
})

describe('niceScale — five ticks, a zero floor, a top no bar can exceed', () => {
  it('reproduces §14.1 worked example: peak 85,000 → 100K/75K/50K/25K/0K', () => {
    const { domainMax, ticks } = niceScale(85_000)
    expect(domainMax).toBe(100_000)
    expect(ticks).toEqual([0, 25_000, 50_000, 75_000, 100_000])
  })

  it('does not leave the top half of the plot empty', () => {
    // The 1/2/5/10 ladder this replaced put an 85K peak under a 200K axis.
    for (const peak of [85_000, 120_000, 610, 3_300, 7_400_000]) {
      const { domainMax } = niceScale(peak)
      expect(domainMax).toBeGreaterThanOrEqual(peak)
      expect(peak / domainMax, `peak ${peak} sits too low on a ${domainMax} axis`)
        .toBeGreaterThan(0.6)
    }
  })

  it('still reproduces the comp: a 40K peak draws 0K/10K/20K/30K/40K', () => {
    expect(niceScale(40_000).ticks).toEqual([0, 10_000, 20_000, 30_000, 40_000])
  })

  it('always carries exactly five ticks starting at zero (PLS-WC-25)', () => {
    for (const peak of [0, 1, 999, 85_000, 12_000_000]) {
      const { ticks } = niceScale(peak)
      expect(ticks).toHaveLength(5)
      expect(ticks[0]).toBe(0)
    }
  })

  it('gives an all-zero window a scale rather than a degenerate one', () => {
    const { domainMax } = niceScale(0)
    expect(domainMax).toBeGreaterThan(0)
  })
})

describe('x label density (PLS-WC-31, §14.6)', () => {
  it('matches the table in §14.6', () => {
    expect(xLabelEvery(8)).toBe(1) // years
    expect(xLabelEvery(12)).toBe(1) // months
    expect(xLabelEvery(24)).toBe(2) // hours
    expect(xLabelEvery(28)).toBe(2) // February
    expect(xLabelEvery(31)).toBe(2) // a long month
  })

  it('does not change cadence between a short month and a long one', () => {
    // The whole point of count/13: "every 5th" gave six labels in a short month
    // and seven in a long one, for no reason the user could see.
    const daily = [28, 29, 30, 31].map(xLabelEvery)
    expect(new Set(daily).size).toBe(1)
  })

  it('never returns a cadence that would hide every label', () => {
    for (const n of [0, 1, 3, 12, 24, 31, 365]) {
      expect(xLabelEvery(n)).toBeGreaterThanOrEqual(1)
    }
  })
})

/* The 'bar value labels (PLS-WC-35/36, §13)' block stood here and pinned
   valueLabelEvery's ceil(26 / slot) cadence, valueLabelFontSize's 12 -> 10
   step and showsValueLabels' one-series rule.

   It went on 2026-10-20 with the thing it described. The owner: "remove
   numbers above bars it looks strange on mobile." WaterConsumptionCardV2's
   renderBarShape was the only caller of all three helpers, so the helpers went
   too rather than staying exported and unreachable, and a test of a deleted
   function is not a rule anyone can keep. Nothing here was weakened to make a
   failing assertion pass: the subject no longer exists.

   §13 is the PRD section this contradicts, and the value labels were also the
   agreed non-colour route to the numbers when the 2.18:1 series fill was
   accepted. Both are flagged for the owner in the card. */

describe('bucket names and openability (§18, §3.5)', () => {
  const june = { day: 'Jun 26', litres: 18_432, key: { kind: 'month', y: 2026, m: 5 } }

  it('names an openable bucket exactly as §18 writes it', () => {
    expect(bucketAccessibleName(june, 'M')).toBe('Jun 26: 18,432 litres. Show by day.')
  })

  it('drops the hint where there is nothing to open', () => {
    expect(bucketAccessibleName(june, 'H')).toBe('Jun 26: 18,432 litres')
  })

  it('says a bucket with no reading has none, and never reports zero (PLS-WC-24)', () => {
    const name = bucketAccessibleName({ day: 'Sep 30', litres: null }, 'D')
    expect(name).toBe('Sep 30: No reading yet')
    expect(name).not.toMatch(/0 litres/)
  })

  it('opens a year into months, a month into days, a day into hours', () => {
    expect(bucketAccessibleName({ day: '2024', litres: 5 }, 'Y')).toMatch(/Show by month\.$/)
    expect(bucketAccessibleName({ day: 'Jun 25', litres: 5 }, 'M')).toMatch(/Show by day\.$/)
    expect(bucketAccessibleName({ day: 'Sep 1', litres: 5 }, 'D')).toMatch(/Show by hour\.$/)
  })

  it('refuses to open Hourly and refuses to open an unread bucket (PLS-WC-14)', () => {
    expect(isBucketOpenable(june, 'M')).toBe(true)
    expect(isBucketOpenable(june, 'H')).toBe(false)
    expect(isBucketOpenable({ day: 'Sep 30', litres: null }, 'D')).toBe(false)
    expect(isBucketOpenable({ day: 'Sep 30' }, 'D')).toBe(false)
  })
})

/* ── The VISIBLE drill-down hint ───────────────────────────────────────────
 *
 * The owner: the double-tap that drills into the level below was
 * undiscoverable. The web solves it with a tinted line under the reading;
 * the wording here is the gesture-accurate one the owner chose, because a
 * phone has no cursor to click with and the gesture is a DOUBLE tap.
 *
 * The point of these tests is the two levels the hint must STAY OFF, which
 * is the half a screenshot cannot show: a bar that cannot be opened must not
 * advertise that it can.
 */
describe('bucketHintText — the drill-down hint', () => {
  const june = { day: 'Jun 26', litres: 18_432, key: { kind: 'month', y: 2026, m: 5 } }

  it('names the level one step finer, at every level that has one', () => {
    expect(bucketHintText({ day: '2024', litres: 5 }, 'Y')).toBe('Double-tap to see by month')
    expect(bucketHintText(june, 'M')).toBe('Double-tap to see by day')
    expect(bucketHintText({ day: 'Sep 1', litres: 5 }, 'D')).toBe('Double-tap to see by hour')
  })

  /* Hourly is the TERMINAL rung — the ladder runs coarse to fine, Y -> M ->
     D -> H, so it is Hourly and not Yearly that has nothing below it. */
  it('shows NO hint at Hourly, which has nothing below it', () => {
    expect(bucketHintText(june, 'H')).toBeNull()
  })

  /* A day the month has not reached. isBucketOpenable already refuses the
     drill; promising it would be a lie the bar cannot honour. */
  it('shows NO hint on a bucket with no reading yet (PLS-WC-24)', () => {
    expect(bucketHintText({ day: 'Sep 30', litres: null }, 'D')).toBeNull()
    expect(bucketHintText({ day: 'Sep 30' }, 'D')).toBeNull()
  })

  /* The drift guard, and the reason the hint reads FINER_BUCKET rather than
     spelling the nouns out a second time: the visible line and the
     screen-reader line must never name different levels. */
  it('names the same level the aria-label does, at every level', () => {
    for (const [period, row] of [
      ['Y', { day: '2024', litres: 5 }],
      ['M', june],
      ['D', { day: 'Sep 1', litres: 5 }],
    ]) {
      const noun = bucketHintText(row, period).slice('Double-tap to see by '.length)
      expect(bucketAccessibleName(row, period)).toMatch(new RegExp(`Show by ${noun}\\.$`))
    }
  })

  it('returns null, not an empty string, so the caller renders no element', () => {
    expect(bucketHintText(june, 'H')).not.toBe('')
  })
})

/* ── Width-driven thinning ──────────────────────────────────────────────────
 *
 * §19 tells the mobile build to CONFIRM §13/§14's outcomes at real widths.
 * It ships wrong if you do not: at 31 Daily buckets on a phone the axis read
 * "Se54Se5Se57Se58Se5", the value labels overlapped into
 * "356.8K360.7K362.3K", and the y ladder rendered "OOK" because a "400K" tick
 * is wider than the 23px column and recharts clips at the SVG viewport.
 *
 * The earlier tests all passed throughout — they asserted the cadence numbers,
 * which were right, against label widths that were assumed.
 */
describe('width-driven thinning', () => {
  it('gives the y axis room for its widest tick', () => {
    const k = yAxisWidth([0, 100000, 200000, 300000, 400000], axisFormatter(400000))
    // "400K" at 12px needs ~30px; the designed 23px column would clip it.
    expect(k).toBeGreaterThan(23 + 14)

    // A narrow ladder still gets the designed geometry, not a padded one.
    const narrow = yAxisWidth([0, 10000, 20000, 30000, 40000], axisFormatter(40000))
    expect(narrow).toBe(23 + 14)
  })

  it('thins x labels further when the labels are wide for the slot', () => {
    // 31 Daily buckets, ~300px of plot -> ~9.7px slot, "Sep 15" ~45px wide.
    const slot = 300 / 31
    const wide = xLabelEvery(31, slot, approxTextWidth('Sep 15', 12))
    // Density alone says every 2nd; at this width that is 15 colliding labels.
    expect(xLabelEvery(31)).toBe(2)
    expect(wide).toBeGreaterThan(2)
    // Spacing must clear the label.
    expect(wide * slot).toBeGreaterThanOrEqual(approxTextWidth('Sep 15', 12))
  })

  it('leaves §14.6 alone wherever the labels actually fit', () => {
    // Width only ever makes the cadence SPARSER; where labels fit, §14.6 wins.
    expect(xLabelEvery(12, 60, approxTextWidth('Jun 25', 12))).toBe(1)
    expect(xLabelEvery(8, 40, approxTextWidth('2024', 12))).toBe(1)
  })

  it('§19’s own table is optimistic about Monthly at phone width', () => {
    /* §19 predicts "every bucket labelled" for 12 Monthly buckets at 360px.
       The slot there is ~27px and a "Jun 25" tick is ~40-45px, so they cannot
       all be drawn without colliding — the cadence has to be every 2nd.
       Recording it rather than bending the measurement to match the table:
       §19 is the section that says to confirm the outcome at real widths, and
       this is the outcome. */
    const slotAt360 = (360 - 37) / 12
    expect(xLabelEvery(12, slotAt360, approxTextWidth('Jun 25', 12))).toBeGreaterThan(1)
  })

  /* 'thins value labels against the value it will actually draw' sat here and
     went with valueLabelEvery — see the note above the deleted block. The
     x-axis half of the same rule is untouched and is still asserted below. */

  it('never returns a cadence below 1, whatever it is handed', () => {
    expect(xLabelEvery(0, 0, 0)).toBe(1)
    expect(xLabelEvery(12, 1000, 1)).toBeGreaterThanOrEqual(1)
  })
})

/* The plot as a 393px phone actually measures it, read off
   getBoundingClientRect() in a real browser: a 311px chart surface, less the
   y-axis gutter, which is 44px on a 6-figure ladder and 37px on a 4-figure
   one. Every case below is a grouping this card can genuinely be steered into.

   seriesCount is 2 only under comparison, which §2 keeps Monthly-only — so
   there is no 31-bucket compared case to test, and the table says so. */
const SURFACE = 311
const CASES = [
  { name: 'Hour (24)', buckets: 24, yWidth: 37, series: 1, slot: 11.42, drawn: 9 },
  { name: 'Day, 28 (February)', buckets: 28, yWidth: 44, series: 1, slot: 9.54, drawn: 7 },
  { name: 'Day, 30 (September)', buckets: 30, yWidth: 44, series: 1, slot: 8.9, drawn: 6 },
  { name: 'Day, 31 (August) — the worst case', buckets: 31, yWidth: 44, series: 1, slot: 8.61, drawn: 6 },
  { name: 'Month (12)', buckets: 12, yWidth: 37, series: 1, slot: 22.83, drawn: 20 },
  { name: 'Month (12) + compare', buckets: 12, yWidth: 37, series: 2, slot: 22.83, drawn: 9 },
  { name: 'Year (3)', buckets: 3, yWidth: 44, series: 1, slot: 89, drawn: BAR_MAX_WIDTH },
  { name: 'Year (1), a single year', buckets: 1, yWidth: 44, series: 1, slot: 267, drawn: BAR_MAX_WIDTH },
]

/** What recharts drew BEFORE the fix: barCategoryGap="42%", both sides. */
function barWidthUnderThePercentageModel(slot, series) {
  let gap = 4 // recharts' own default barGap
  if (slot - 2 * 0.42 * slot - (series - 1) * gap <= 0) gap = 0
  let size = (slot - 2 * 0.42 * slot - (series - 1) * gap) / series
  if (size > 1) size = Math.floor(size)
  return size
}

describe('bar width — the sizing rule at every grouping x compare state', () => {
  it('measures the slot as the plot over the bucket count', () => {
    for (const c of CASES) {
      expect(bucketSlotWidth(SURFACE - c.yWidth, c.buckets), c.name).toBeCloseTo(c.slot, 1)
    }
    expect(bucketSlotWidth(0, 12)).toBe(0)
    expect(bucketSlotWidth(267, 0)).toBe(0)
  })

  it('draws what recharts will draw, at every grouping', () => {
    for (const c of CASES) {
      expect(drawnBarWidth(c.slot, c.series), c.name).toBe(c.drawn)
    }
  })

  it('never falls under the 6px floor the rounded data-end needs', () => {
    /* The floor is an assertion, not a mechanism — recharts cannot widen a
       bar. If this ever fails, the answer is fewer buckets or a scrolling
       plot, NOT a quietly hairline chart. */
    for (const c of CASES) {
      expect(barWidthFor(c.slot, c.series), c.name).toBeGreaterThanOrEqual(BAR_MIN_WIDTH)
      expect(barWidthFor(c.slot, c.series), c.name).toBe(c.drawn)
    }
  })

  it('caps at 24 and never exceeds its share of the slot', () => {
    for (const c of CASES) {
      const w = drawnBarWidth(c.slot, c.series)
      expect(w, c.name).toBeLessThanOrEqual(BAR_MAX_WIDTH)
      expect(w * c.series + 2 * BAR_CATEGORY_GAP_PX, c.name).toBeLessThanOrEqual(c.slot)
    }
  })

  it('leaves a real gap inside a compared pair', () => {
    const compared = CASES.find((c) => c.series === 2)
    const w = drawnBarWidth(compared.slot, 2)
    // two bars, 1px of category gap each side, and the barGap between them
    expect(2 * w + 2 * BAR_CATEGORY_GAP_PX + BAR_GAP_PX).toBeLessThanOrEqual(compared.slot)
    expect(compared.slot - 2 * w - 2 * BAR_CATEGORY_GAP_PX).toBeGreaterThanOrEqual(BAR_GAP_PX)
  })

  it('is what the "42%" model could never give — the hairlines this replaced', () => {
    /* barCategoryGap as a PERCENTAGE is applied to both sides, so the bar kept
       16% of its slot and the compared pair 8% each with the barGap collapsed
       to nothing. These are the widths measured on the shipped card. */
    expect(barWidthUnderThePercentageModel(11.42, 1)).toBe(1) // Hour
    expect(barWidthUnderThePercentageModel(8.61, 1)).toBe(1) // Day, 31
    expect(barWidthUnderThePercentageModel(22.83, 1)).toBe(3) // Month
    expect(barWidthUnderThePercentageModel(22.83, 2)).toBe(1) // Month + compare
    for (const c of CASES) {
      const was = barWidthUnderThePercentageModel(c.slot, c.series)
      const now = drawnBarWidth(c.slot, c.series)
      if (was >= BAR_MIN_WIDTH) {
        /* Only the Year views ever cleared the floor, and only because three
           buckets (or one) leave an enormous slot — the old model had no
           maxBarSize either, so a single year drew a 42px slab. The cap is
           what holds those now. */
        expect(now, c.name).toBe(BAR_MAX_WIDTH)
      } else {
        expect(now, c.name).toBeGreaterThan(was)
      }
    }
  })

  it('collapses the barGap rather than returning a negative bar', () => {
    // A slot too tight for 2px between the pair still yields a positive bar.
    const w = drawnBarWidth(4, 2)
    expect(w).toBeGreaterThan(0)
    expect(w).toBeCloseTo(1, 5)
  })

  it('returns nothing before the plot has been measured', () => {
    expect(drawnBarWidth(0, 1)).toBe(0)
    expect(drawnBarWidth(0, 2)).toBe(0)
    expect(barWidthFor(0, 1)).toBe(0)
  })
})

describe('barTopRadius — a bounded dome, not a half-round cap', () => {
  it('bounds the data-end at 8px however wide the bar gets', () => {
    expect(barTopRadius(BAR_MAX_WIDTH)).toBe(BAR_MAX_RADIUS)
    expect(barTopRadius(89)).toBe(BAR_MAX_RADIUS)
  })

  it('stays half the bar while the bar is narrower than 16', () => {
    expect(barTopRadius(9)).toBe(4.5)
    expect(barTopRadius(6)).toBe(3)
    expect(barTopRadius(16)).toBe(8)
  })

  it('draws no radius on no bar', () => {
    expect(barTopRadius(0)).toBe(0)
    expect(barTopRadius(-4)).toBe(0)
  })
})

describe('nearestBucketIndex — §19 routes the POINTER to the nearest bucket', () => {
  // The Daily geometry above: plot starts at the 44px axis, 31 buckets of 8.61.
  const LEFT = 44
  const SLOT = 8.61

  it('resolves a tap inside the plot to the bucket it landed in', () => {
    expect(nearestBucketIndex(LEFT + 1, LEFT, SLOT, 31)).toBe(0)
    expect(nearestBucketIndex(LEFT + SLOT * 3 + 2, LEFT, SLOT, 31)).toBe(3)
  })

  it('clamps rather than returning a bucket that does not exist', () => {
    expect(nearestBucketIndex(0, LEFT, SLOT, 31)).toBe(0)
    expect(nearestBucketIndex(10_000, LEFT, SLOT, 31)).toBe(30)
  })

  it('reports no bucket when there is no plot yet', () => {
    expect(nearestBucketIndex(100, LEFT, 0, 31)).toBe(-1)
    expect(nearestBucketIndex(100, LEFT, SLOT, 0)).toBe(-1)
  })
})

/*
 * THE Y AXIS UNIT — and the gutter it must not spend.
 *
 * The owner asked for units on the y axis. What makes this a scale question
 * rather than a copy one is that `yAxisWidth` sizes the gutter from the widest
 * tick string, and the plot — hence every bar — gets what the gutter leaves.
 * These cases are the measurement that chose a caption over a tick suffix, so
 * that a later "just append it to the formatter" has to argue with a number.
 */
describe('y axis unit (the owner’s “add units to the y axis”)', () => {
  it('names the unit for a units KEY, and falls back rather than printing nothing', () => {
    expect(axisUnitLabel('liters')).toBe('L')
    expect(axisUnitLabel('gallons')).toBe('gal')
    expect(axisUnitLabel('cubic_meters')).toBe('m³')
    // AccountScreenV2 still keeps its picker in local state no one reads, so
    // the chart calls this with nothing. That must be litres, not blank.
    expect(axisUnitLabel()).toBe('L')
    expect(axisUnitLabel('furlongs')).toBe('L')
    expect(axisUnitLabel(null)).toBe('L')
  })

  it('keeps the unit OUT of the tick strings, so the gutter does not grow', () => {
    const dayTicks = [0, 100_000, 200_000, 300_000, 400_000]
    const format = axisFormatter(400_000)
    expect(dayTicks.map(format)).toEqual(['0K', '100K', '200K', '300K', '400K'])
    // The axis is the same width it was before the unit existed.
    expect(yAxisWidth(dayTicks, format)).toBe(44)
  })

  it('is why the unit is not a tick suffix: the 31-bucket worst case is ON the floor', () => {
    /* Measured at 393px, where the chart surface is 311px wide. The top tick is
       always the widest, so "unit on the top tick only" and "unit on every
       tick" cost exactly the same — there is no cheap middle option. */
    const SURFACE_393 = 311
    const dayTicks = [0, 100_000, 200_000, 300_000, 400_000]
    const bare = yAxisWidth(dayTicks, axisFormatter(400_000))
    const suffixed = yAxisWidth(dayTicks, (v) => `${axisFormatter(400_000)(v)} L`)
    expect(bare).toBe(44)
    expect(suffixed).toBe(59)

    const barAt = (yWidth, buckets) =>
      barWidthFor(bucketSlotWidth(SURFACE_393 - yWidth, buckets), 1)
    // Daily survives the suffix only by a rounding: 8.61px of slot becomes
    // 8.13, and both floor to the same 6px bar.
    expect(barAt(bare, 31)).toBe(BAR_MIN_WIDTH)
    expect(barAt(suffixed, 31)).toBe(BAR_MIN_WIDTH)
    expect(bucketSlotWidth(SURFACE_393 - suffixed, 31)).toBeLessThan(
      bucketSlotWidth(SURFACE_393 - bare, 31),
    )
    // Hourly does not: 15px of gutter is a whole pixel off every bar.
    expect(barAt(bare, 24)).toBe(9)
    expect(barAt(suffixed, 24)).toBe(8)

    // The caption spends none of it, which is the whole argument for it.
    expect(barAt(bare, 24)).toBe(9)
    expect(barAt(bare, 12)).toBe(20)
  })

  it('places the caption where the tick text ends, not in the open gutter', () => {
    // recharts right-aligns a left tick at `width - tickSize - tickMargin`.
    const TICK_MARGIN = 14
    const hour = yAxisWidth([0, 6000, 12000, 18000, 24000], axisFormatter(24000))
    const day = yAxisWidth([0, 100_000, 200_000, 300_000, 400_000], axisFormatter(400_000))
    expect(hour - TICK_MARGIN).toBe(23) // §14.4's designed tick column
    expect(day - TICK_MARGIN).toBe(30) // a wider ladder moves it, and the caption with it
  })
})
