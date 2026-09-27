// The chart's scale and density rules — PRD §13, §14, §18.
//
// Asserted on the exported functions, not the DOM: recharts needs real layout,
// so nothing inside the plot renders under happy-dom and neither the ladder,
// the label cadence nor a bucket's accessible name can be read off the markup.

import { describe, it, expect } from 'vitest'
import {
  bucketAccessibleName,
  isBucketOpenable,
  niceScale,
  niceStep,
  showsValueLabels,
  valueLabelEvery,
  valueLabelFontSize,
  xLabelEvery,
} from '@/v2/components/chartScale'

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

describe('bar value labels (PLS-WC-35/36, §13)', () => {
  it('thins by ceil(26 / slot width), not by bucket count', () => {
    expect(valueLabelEvery(26)).toBe(1)
    expect(valueLabelEvery(40)).toBe(1)
    expect(valueLabelEvery(13)).toBe(2)
    expect(valueLabelEvery(9)).toBe(3)
  })

  it('draws none at all when there is no measured slot', () => {
    expect(valueLabelEvery(0)).toBe(Infinity)
  })

  it('drops to 10px under a 40px slot', () => {
    expect(valueLabelFontSize(53)).toBe(12)
    expect(valueLabelFontSize(40)).toBe(12)
    expect(valueLabelFontSize(27)).toBe(10) // §19: Monthly at 360px
  })

  it('shows labels only for exactly one value-carrying series', () => {
    expect(showsValueLabels(1)).toBe(true)
    // A supply/return pair: one number over two bars names neither.
    expect(showsValueLabels(2)).toBe(false)
    expect(showsValueLabels(0)).toBe(false)
  })
})

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
