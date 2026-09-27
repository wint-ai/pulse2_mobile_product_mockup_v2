// Y-axis ticks take their unit from the TOP of the scale
// (PRD §14 / PLS-WC-19: "Axis ticks take their unit from the top of the scale").
//
// The old formatter divided EVERY tick by 1000 and appended K whatever the
// magnitude, so a fleet-scale axis rendered "12000K". That is wider than the
// 37px axis, so it clipped to "000K" and the leading digits vanished. It only
// showed at fleet scale, which is why it survived every check at single-system
// scale.
//
// Asserted on the function rather than the DOM: recharts needs real layout, so
// no axis renders under happy-dom.

import { describe, it, expect } from 'vitest'
import { axisFormatter } from '@/v2/components/WaterConsumptionCardV2'

const ladder = (max) => {
  const f = axisFormatter(max)
  return [0, max / 4, max / 2, (max * 3) / 4, max].map(f)
}

describe('axisFormatter', () => {
  it('uses M at fleet scale, and never a four-digit K', () => {
    const labels = ladder(12_000_000)
    for (const l of labels) {
      expect(l, `tick "${l}" would overflow the 37px axis`).not.toMatch(/\d{4,}K/)
    }
    expect(labels).toEqual(['0M', '3M', '6M', '9M', '12M'])
  })

  it('uses K at single-system scale', () => {
    expect(ladder(40_000)).toEqual(['0K', '10K', '20K', '30K', '40K'])
  })

  it('ends the ladder in the scale unit, not a bare zero', () => {
    expect(ladder(40_000)[0]).toBe('0K')
    expect(ladder(12_000_000)[0]).toBe('0M')
  })

  it('falls back to whole litres below 1K', () => {
    expect(ladder(400)).toEqual(['0', '100', '200', '300', '400'])
  })

  it('keeps one decimal where the step needs it', () => {
    expect(axisFormatter(2_500)(1_250)).toBe('1.3K')
    expect(axisFormatter(5_000_000)(2_500_000)).toBe('2.5M')
  })
})
