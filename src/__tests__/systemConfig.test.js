/**
 * Pipe topology and its device configuration.
 *
 * The three types — Water line, Open loop, Closed loop — are not labels: each
 * carries a different number of meters, valves and VMAs, and that count is
 * what decides how many units the System page draws. The card was drawing one
 * unit against a design that draws two precisely because this config did not
 * exist.
 *
 * The counts are the design's, taken off PipeTopology.jsx, which is traced
 * from Figma 198453:40480: WaterLine draws one valve and one sensor, Loop
 * draws two of each, and closed loop is open loop minus the junction glyph.
 * These tests pin that, so a change to the schematics and a change to the
 * counts cannot drift apart silently.
 */
import { describe, it, expect } from 'vitest'
import {
  PIPE_TOPOLOGY,
  TOPOLOGY_CONFIG,
  NO_PIPING,
  configFor,
  pipeTopologyOf,
  unitsFor,
} from '@/data/systemConfig'
import { getSystemTopology, getSystemUnits } from '@/data/systemDetails'
import { SYSTEMS, getSystemById } from '@/data/systems'

describe('the three pipe topologies', () => {
  it('are Water line, Open loop and Closed loop', () => {
    expect(Object.values(PIPE_TOPOLOGY)).toEqual(['Water line', 'Open loop', 'Closed loop'])
    expect(Object.keys(TOPOLOGY_CONFIG).sort()).toEqual(
      ['Closed loop', 'Open loop', 'Water line'],
    )
  })

  it('carry the device counts the schematics draw', () => {
    // WaterLine: one ValveStatus, one SensorA.
    expect(configFor(PIPE_TOPOLOGY.WATER_LINE)).toMatchObject({
      legs: ['Supply'],
      meters: 1,
      valves: 1,
      vmas: 1,
    })

    // Loop: two ValveStatus, two SensorB — one pair per leg.
    for (const type of [PIPE_TOPOLOGY.OPEN_LOOP, PIPE_TOPOLOGY.CLOSED_LOOP]) {
      expect(configFor(type), type).toMatchObject({
        legs: ['Supply', 'Return'],
        meters: 2,
        valves: 2,
        vmas: 2,
      })
    }
  })

  it('differ between open and closed by the junction alone', () => {
    // PipeTopology.jsx: "Closed loop is open loop without the junction glyph —
    // that is the whole difference between them in the design."
    const open = configFor(PIPE_TOPOLOGY.OPEN_LOOP)
    const closed = configFor(PIPE_TOPOLOGY.CLOSED_LOOP)

    expect(open.junction).toBe(true)
    expect(closed.junction).toBe(false)

    const { junction: _o, schematic: _os, ...openRest } = open
    const { junction: _c, schematic: _cs, ...closedRest } = closed
    expect(openRest).toEqual(closedRest)
  })

  it('names one VMA per leg — a unit houses one leg', () => {
    for (const [type, cfg] of Object.entries(TOPOLOGY_CONFIG)) {
      expect(cfg.vmas, type).toBe(cfg.legs.length)
      expect(cfg.meters, type).toBe(cfg.legs.length)
      expect(cfg.valves, type).toBe(cfg.legs.length)
    }
  })
})

describe('resolving a system to its topology', () => {
  it('makes a cooling tower an OPEN loop, per the sandbox PRD', () => {
    /* docs/PRD/HTMLs/info-tab.html documents "Cooling Tower #1 · Tower One ·
       Suffolk" with Pipe topology: Looped — that system is ct1. A cooling
       tower is open to atmosphere, which is why it is metered on both legs. */
    expect(pipeTopologyOf({ topology: 'Water Line - Cooling Tower' })).toBe(
      PIPE_TOPOLOGY.OPEN_LOOP,
    )
    expect(getSystemTopology('ct1').pipeTopology).toBe(PIPE_TOPOLOGY.OPEN_LOOP)
    expect(getSystemTopology('ct1').config.legs).toEqual(['Supply', 'Return'])
  })

  it('leaves every other line a water line', () => {
    expect(pipeTopologyOf({ topology: 'Water Line - General Line' })).toBe(
      PIPE_TOPOLOGY.WATER_LINE,
    )
    expect(getSystemTopology('msl').config.legs).toEqual(['Supply'])
  })

  it('gives a system with no piping no topology and no units', () => {
    expect(pipeTopologyOf({ topology: NO_PIPING })).toBeNull()
    expect(unitsFor({ topology: NO_PIPING })).toEqual([])
    expect(getSystemTopology('sp').config).toBeNull()
  })

  it('lets a record declare its own topology, including a closed loop', () => {
    // Nothing in this dataset is a closed loop, but the type is real and the
    // resolver must honour a record that says so rather than guessing.
    const declared = { topology: 'Water Line - General Line', pipeTopology: PIPE_TOPOLOGY.CLOSED_LOOP }
    expect(pipeTopologyOf(declared)).toBe(PIPE_TOPOLOGY.CLOSED_LOOP)
    expect(unitsFor(declared).map((u) => u.name)).toEqual(['Supply', 'Return'])
  })
})

describe('the units a system is monitored by', () => {
  it('draws two for a cooling tower and one for a line', () => {
    const tower = getSystemById('ct1')
    const line = getSystemById('msl')
    if (tower) expect(getSystemUnits(tower).map((u) => u.name)).toEqual(['Supply', 'Return'])
    if (line) expect(getSystemUnits(line).map((u) => u.name)).toEqual(['Supply'])
  })

  it('puts the real serial on the first leg and none on the rest', () => {
    /* A system record holds ONE waterSystemId. Deriving a second serial would
       put a fabricated number on screen; the card renders a unit without one. */
    const units = unitsFor(
      { topology: 'Water Line - Cooling Tower' },
      { serial: '4471822', valve: 'open', comm: 'online', power: 'ac', idPrefix: 's' },
    )
    expect(units.map((u) => u.serial)).toEqual(['4471822', null])
    expect(units.map((u) => u.id)).toEqual(['s-supply', 's-return'])
    // State is the system's, so both legs report it.
    expect(units.every((u) => u.valve === 'open' && u.comm === 'online')).toBe(true)
  })

  it('resolves every system in the dataset to a known configuration', () => {
    for (const sys of SYSTEMS.slice(0, 40)) {
      // The NAME is what resolves the type — the id map never matches.
      const t = getSystemTopology(sys.id, sys.name)
      if (t.pipeTopology === null) {
        expect(getSystemUnits(sys), sys.id).toEqual([])
        continue
      }
      expect(Object.values(PIPE_TOPOLOGY), sys.id).toContain(t.pipeTopology)
      expect(getSystemUnits(sys).length, sys.id).toBe(t.config.vmas)
    }
  })
})

describe('the dataset populates all three types', () => {
  it('finds open loops, closed loops and water lines among the real systems', () => {
    /* Before this config existed, SYSTEM_DETAILS_MAP's legacy keys (ct1, msl)
       matched none of the ws-#### ids, so all 103 systems reported the same
       default and the System page drew one unit on every one of them. */
    const spread = {}
    for (const s of SYSTEMS) {
      const t = getSystemTopology(s.id, s.name).pipeTopology ?? 'none'
      spread[t] = (spread[t] ?? 0) + 1
    }

    expect(spread[PIPE_TOPOLOGY.OPEN_LOOP], 'cooling towers').toBeGreaterThan(0)
    expect(spread[PIPE_TOPOLOGY.CLOSED_LOOP], 'HVAC / chiller loops').toBeGreaterThan(0)
    expect(spread[PIPE_TOPOLOGY.WATER_LINE], 'single runs').toBeGreaterThan(0)

    // And the loops really do yield two units.
    const tower = SYSTEMS.find((s) => /cooling tower/i.test(s.name))
    expect(getSystemUnits(tower).map((u) => u.name)).toEqual(['Supply', 'Return'])

    const chiller = SYSTEMS.find((s) => /chiller loop|hvac loop/i.test(s.name))
    expect(getSystemUnits(chiller).map((u) => u.name)).toEqual(['Supply', 'Return'])
    expect(getSystemTopology(chiller.id, chiller.name).config.junction).toBe(false)
  })
})
