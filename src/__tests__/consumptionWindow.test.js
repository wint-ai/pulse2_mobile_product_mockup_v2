/**
 * The consumption card is presentational: uncontrolled it has ONE hardcoded
 * window (June 2026 daily) and deliberately renders its empty state the moment
 * the period segments or the month stepper are touched, because it has nothing
 * else to plot. Both v2 pages were mounting it without data, so the chart read
 * as empty for every period but one.
 *
 * These assert the host can actually serve every window it lets the user pick.
 */
import { describe, it, expect } from 'vitest'
import { getConsumptionWindow, getConsumptionWindowLabel } from '@/data/consumption'
import { SYSTEMS } from '@/data/systems'

const GRANULARITIES = ['Y', 'M', 'D', 'H']
const OFFSETS = [0, 1, 2]

const OFFICE = SYSTEMS.find(s => s.l2Name === 'Office')
const APARTMENT = SYSTEMS.find(s => s.id === 'esrt-bldg-A-apt-2')

describe('consumption windows', () => {
  it('has both fixture systems', () => {
    expect(OFFICE).toBeTruthy()
    expect(APARTMENT).toBeTruthy()
  })

  for (const g of GRANULARITIES) {
    for (const offset of OFFSETS) {
      it(`${g} at offset ${offset} returns a full window with no empty bars`, () => {
        for (const sys of [OFFICE, APARTMENT]) {
          const w = getConsumptionWindow(sys.id, sys.name, g, offset)
          expect(w.length).toBeGreaterThan(0)
          // An empty bar means the window ran off the end of the profile.
          expect(w.filter(p => !p.litres)).toHaveLength(0)
          expect(getConsumptionWindowLabel(sys.id, sys.name, g, offset)).toBeTruthy()
        }
      })
    }
  }

  it('gives an apartment a residential baseline, not a commercial one', () => {
    const mean = rows => rows.reduce((t, p) => t + p.litres, 0) / rows.length
    const office = mean(getConsumptionWindow(OFFICE.id, OFFICE.name, 'M', 0))
    const apartment = mean(getConsumptionWindow(APARTMENT.id, APARTMENT.name, 'M', 0))
    // The upstream config table covers none of the MRG systems, so the web
    // itself would hand both the same 2600 L/day 'General Line' baseline.
    // monitoringFor() infers the type from the name instead; if that ever
    // regresses, these two collapse to the same magnitude.
    expect(apartment).toBeLessThan(office)
    expect(apartment).toBeLessThan(1500)
  })

  it('two systems do not share a series', () => {
    const a = getConsumptionWindow(OFFICE.id, OFFICE.name, 'M', 0).map(p => p.litres)
    const b = getConsumptionWindow(APARTMENT.id, APARTMENT.name, 'M', 0).map(p => p.litres)
    expect(a).not.toEqual(b)
  })

  it('is stable across calls — a reload must not redraw the chart differently', () => {
    const a = getConsumptionWindow(OFFICE.id, OFFICE.name, 'M', 0)
    const b = getConsumptionWindow(OFFICE.id, OFFICE.name, 'M', 0)
    expect(a).toEqual(b)
  })
})
