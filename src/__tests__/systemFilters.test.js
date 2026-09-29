/**
 * The System tab's filter model.
 *
 * Kept as a unit test rather than driven through the sheet because the one
 * thing that must not drift is the MEANING of a set of ticked boxes: OR within
 * a category, AND across them. A filter that quietly drops rows looks like an
 * empty result, not like a bug.
 */
import { describe, it, expect } from 'vitest'
import {
  FILTER_CATEGORIES,
  activeFilterCount,
  applyFilters,
  filterOptions,
} from '@/data/systemFilters'
import { SYSTEM_TYPE } from '@/data/systemType'

const sys = (over = {}) => ({
  id: 'S',
  name: 'A system',
  l4Name: 'Site A',
  comm: 'online',
  valve: 'open',
  power: 'ac',
  leak: null,
  alert: null,
  notificationRecipients: 2,
  ...over,
})

const FLEET = [
  sys({ id: 'a', l4Name: 'Site A', comm: 'online', valve: 'open', power: 'ac' }),
  sys({ id: 'b', l4Name: 'Site A', comm: 'offline', valve: 'closed', power: 'ac' }),
  sys({ id: 'c', l4Name: 'Site B', comm: 'online', valve: null, power: 'battery' }),
  sys({ id: 'd', l4Name: 'Site B', comm: 'online', valve: 'error', power: 'ac-lost' }),
]

describe('applyFilters', () => {
  it('returns everything when nothing is selected', () => {
    expect(applyFilters(FLEET, {})).toHaveLength(4)
    expect(applyFilters(FLEET, { valve: [] })).toHaveLength(4)
  })

  it('ORs the values inside one category', () => {
    const got = applyFilters(FLEET, { valve: ['open', 'closed'] })
    expect(got.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('ANDs across categories', () => {
    // Site A is a+b; online is a+c+d. Both is just a.
    const got = applyFilters(FLEET, { location: ['Site A'], connectivity: ['online'] })
    expect(got.map((s) => s.id)).toEqual(['a'])
  })

  it('can return nothing, and says so by returning an empty list', () => {
    const got = applyFilters(FLEET, { location: ['Site B'], valve: ['closed'] })
    expect(got).toEqual([])
  })

  it('treats "no valve" as a real, selectable value rather than missing data', () => {
    // buildTree.js: 20 of the 53 MRG systems are metering-only and carry
    // valve: null on purpose. They have to be reachable from the filter.
    const none = FILTER_CATEGORIES.find((c) => c.id === 'valve').valueOf(sys({ valve: null }))
    const got = applyFilters(FLEET, { valve: [none] })
    expect(got.map((s) => s.id)).toEqual(['c'])
  })
})

describe('filterOptions', () => {
  it('offers only values the data actually holds, each with its count', () => {
    const opts = filterOptions(FLEET, 'location')
    expect(opts.map((o) => o.label)).toEqual(['Site A', 'Site B'])
    expect(opts.map((o) => o.count)).toEqual([2, 2])
  })

  it('does not offer a choice that could only ever return nothing', () => {
    // The whole point: against this dataset there are no flood or humidity
    // devices, so those two must not appear as tickable options. A checkbox
    // that can only empty the table is worse than an absent one.
    const opts = filterOptions(FLEET, 'type')
    expect(opts.map((o) => o.value)).toEqual([SYSTEM_TYPE.FLOW])
    expect(opts[0].count).toBe(4)
  })

  it('orders options canonically, not by whatever the data gave first', () => {
    const opts = filterOptions(FLEET, 'valve')
    // open, closed, error, then "no valve" — the order the panel lists them.
    expect(opts.map((o) => o.label)).toEqual(['Open', 'Closed', 'Error', 'No valve'])
  })

  it('separates the healthy from those needing attention', () => {
    const opts = filterOptions(FLEET, 'attention')
    const labels = opts.map((o) => o.label)
    expect(labels).toContain('Requires attention')
    // b is offline, d has a valve error and lost power — both need attention.
    const needing = applyFilters(FLEET, { attention: ['attention'] }).map((s) => s.id)
    expect(needing).toContain('b')
    expect(needing).toContain('d')
    expect(needing).not.toContain('a')
  })
})

describe('activeFilterCount', () => {
  it('counts categories that are narrowing, not values ticked', () => {
    expect(activeFilterCount({})).toBe(0)
    expect(activeFilterCount({ valve: [] })).toBe(0)
    expect(activeFilterCount({ valve: ['open', 'closed'] })).toBe(1)
    expect(activeFilterCount({ valve: ['open'], connectivity: ['online'] })).toBe(2)
  })
})

describe('the category list', () => {
  it('omits Water Flow and Status until their rule lands', () => {
    // Both are in the reference panel and in the desktop table. Neither has a
    // field on the system record, so a filter for them could only guess.
    const ids = FILTER_CATEGORIES.map((c) => c.id)
    expect(ids).not.toContain('waterFlow')
    expect(ids).not.toContain('status')
  })

  it('carries the seven that are backed by real fields', () => {
    expect(FILTER_CATEGORIES.map((c) => c.label)).toEqual([
      'Location',
      'Attention',
      'System Type',
      'Connectivity',
      'Valve status',
      'Active event',
      'Power',
    ])
  })
})
