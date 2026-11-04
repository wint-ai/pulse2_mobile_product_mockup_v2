/**
 * THE ALL-CLEAR FLEET — same entities, nothing wrong right now.
 *
 * Owner, 2026-11-04: "I want to see exactly the same, but like all clear, all
 * systems are running properly, no errors, no leaks ... and in the same time I
 * want to keep the option to see everything like I see now ... And to keep the
 * same structure of entities."
 *
 * And the decision that shapes every case below: KEEP HISTORY, CLEAR THE
 * PRESENT. A fleet with no past makes the ended-event screen, the "Tell us
 * more" feedback flow, timeline drill-down and the chart's event annotations
 * all unreachable, and those are the features worth demoing.
 *
 * The mechanism is `pulse2-fleet-state` in localStorage, read once at module
 * scope by src/data/upstream/buildTree.js. There is no second dataset and no
 * second snapshot — 'clear' is the existing clean-site path applied to every
 * site. "Same structure of entities" is therefore true BY CONSTRUCTION, and
 * `the same system ids exist in both modes` below is what proves it rather
 * than assuming it.
 *
 * WHY THE DYNAMIC IMPORTS. buildTree evaluates at import, so a mode can only be
 * observed by resetting the module registry and importing again under a
 * different stored flag. That is also the real constraint on the UI: the
 * sign-in picker reloads the page rather than pretending the tree can change
 * underneath it.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'

const FLEET_KEY = 'pulse2-fleet-state'

/* The suite runs in vitest's node environment, which has no Storage at all —
 * the same absence readFleetState() has to survive in SSR. Stubbed per load so
 * each mode gets a clean store and nothing leaks between them. */
function stubStorage(initial = {}) {
  const make = (seed) => {
    const map = new Map(Object.entries(seed))
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
      clear: () => map.clear(),
      key: (i) => [...map.keys()][i] ?? null,
      get length() {
        return map.size
      },
    }
  }
  globalThis.localStorage = make(initial)
  globalThis.sessionStorage = make({})
}

function clearStorage() {
  delete globalThis.localStorage
  delete globalThis.sessionStorage
}

/** Build the whole data layer under one fleet state. */
async function loadFleet(mode) {
  vi.resetModules()
  stubStorage(mode === 'clear' ? { [FLEET_KEY]: 'clear' } : {})
  const buildTree = await import('@/data/upstream/buildTree')
  const systems = await import('@/data/systems')
  const events = await import('@/data/upstream/generateEvents')
  const incidents = await import('@/data/upstream/generateIncidents')
  return {
    state: buildTree.FLEET_STATE,
    cap: buildTree.WATER_EVENT_SITE_CAP,
    SYSTEMS: systems.SYSTEMS,
    getSystemById: systems.getSystemById,
    computeWidgets: systems.computeWidgets,
    CURRENT: events.CURRENT_EVENTS_FROM_UPSTREAM,
    HISTORY: events.HISTORY_EVENTS_FROM_UPSTREAM,
    INCIDENTS: incidents.INCIDENTS_FROM_UPSTREAM,
  }
}

const isWaterEvent = (s) => s.alert?.type === 'leak-high' || s.alert?.type === 'leak-low'

afterEach(() => {
  clearStorage()
  vi.resetModules()
})

describe('the fleet-state flag defaults to live', () => {
  it('reads live when nothing is stored', async () => {
    vi.resetModules()
    stubStorage({})
    const { readFleetState, FLEET_LIVE } = await import('@/data/fleetState')
    expect(readFleetState()).toBe(FLEET_LIVE)
  })

  it('reads live when there is no storage at all (node / SSR / private mode)', async () => {
    vi.resetModules()
    clearStorage()
    const { readFleetState } = await import('@/data/fleetState')
    expect(readFleetState()).toBe('live')
  })

  it('reads live for any value that is not exactly "clear"', async () => {
    vi.resetModules()
    stubStorage({ [FLEET_KEY]: 'healthy' })
    const { readFleetState } = await import('@/data/fleetState')
    expect(readFleetState()).toBe('live')
  })

  it('setFleetState("live") removes the key rather than writing it', async () => {
    vi.resetModules()
    stubStorage({ [FLEET_KEY]: 'clear' })
    const { setFleetState, readFleetState } = await import('@/data/fleetState')
    setFleetState('live')
    expect(globalThis.localStorage.getItem(FLEET_KEY)).toBeNull()
    expect(readFleetState()).toBe('live')
  })

  it('the generator built in live mode still carries problems', async () => {
    const live = await loadFleet('live')
    expect(live.state).toBe('live')
    expect(live.cap).toBe(0.2)
    expect(live.SYSTEMS.filter((s) => s.alert).length).toBeGreaterThan(0)
    expect(live.SYSTEMS.filter(isWaterEvent).length).toBeGreaterThan(0)
  })
})

describe('the all-clear fleet has nothing wrong in the present', () => {
  it('zero alerts fleet-wide', async () => {
    const clear = await loadFleet('clear')
    expect(clear.state).toBe('clear')
    expect(clear.SYSTEMS.filter((s) => s.alert).length).toBe(0)
  })

  it('zero active water events', async () => {
    const clear = await loadFleet('clear')
    expect(clear.SYSTEMS.filter(isWaterEvent).length).toBe(0)
    expect(clear.cap).toBe(0)
  })

  it('zero systems need attention on any of the four protection checks', async () => {
    /* The four dimensions computeSystemHealth() reads. Asserted on the RAW
       generator output, not through applySimOverlay: the half-working
       `pulse2-mock-suppressed` flag only ever cleaned single-system lookups,
       which is why Home still read "12 / 103 need attention" with it set. This
       mode works at the generator, so the raw array is already clean. */
    const clear = await loadFleet('clear')
    expect(clear.SYSTEMS.filter((s) => s.comm === 'offline')).toEqual([])
    expect(clear.SYSTEMS.filter((s) => s.offline)).toEqual([])
    expect(clear.SYSTEMS.filter((s) => s.valve === 'error')).toEqual([])
    expect(clear.SYSTEMS.filter((s) => s.power === 'ac-lost')).toEqual([])
    expect(clear.SYSTEMS.filter((s) => (s.notificationRecipients || 0) < 1)).toEqual([])
    expect(clear.SYSTEMS.filter((s) => s.leak)).toEqual([])
  })

  it('the valve and power widgets report no error and no power loss', async () => {
    const clear = await loadFleet('clear')
    const w = clear.computeWidgets(clear.SYSTEMS)
    expect(w.valves.error).toBe(0)
    expect(w.power.acLost).toBe(0)
    expect(w.comm.offline).toBe(0)
    expect(w.comm.online).toBe(clear.SYSTEMS.length)
  })

  it('no current events and no active incidents are generated', async () => {
    const clear = await loadFleet('clear')
    expect(clear.CURRENT).toEqual([])
    expect(clear.INCIDENTS.filter((i) => i.status === 'active')).toEqual([])
  })
})

describe('history survives the all-clear fleet', () => {
  it('every system still has its closed water event in History', async () => {
    const live = await loadFleet('live')
    const clear = await loadFleet('clear')
    expect(clear.HISTORY.length).toBe(clear.SYSTEMS.length)
    expect(clear.HISTORY.length).toBe(live.HISTORY.length)
    expect(clear.HISTORY.every((e) => e.resolved)).toBe(true)
  })

  it('the history entries are identical in both modes', async () => {
    /* buildHistoryEvent reads `resolvedVariant(id)` and never `sys.alert`, so
       the past is the same past. If this ever diverges, the two modes have
       started to drift and the single-generator argument is gone. */
    const live = await loadFleet('live')
    const clear = await loadFleet('clear')
    const key = (e) => `${e.id}|${e.type}|${e.title}|${e.detail}|${e.eventId}`
    expect(clear.HISTORY.map(key)).toEqual(live.HISTORY.map(key))
  })

  it('every system still has its resolved incident timeline', async () => {
    const clear = await loadFleet('clear')
    const resolved = clear.INCIDENTS.filter((i) => i.status === 'resolved')
    expect(resolved.length).toBe(clear.SYSTEMS.length)
    // The step the ended-event screen and the "Tell us more" flow hang off.
    expect(resolved.every((i) => i.steps.some((s) => s.type === 'resolved'))).toBe(true)
  })
})

describe('the same structure of entities, in both modes', () => {
  it('the same system ids exist in both modes, in the same order', async () => {
    const live = await loadFleet('live')
    const clear = await loadFleet('clear')
    expect(clear.SYSTEMS.map((s) => s.id)).toEqual(live.SYSTEMS.map((s) => s.id))
  })

  it('names, accounts and the whole location path are identical', async () => {
    const live = await loadFleet('live')
    const clear = await loadFleet('clear')
    const shape = (s) =>
      [s.id, s.name, s.account, s.l1, s.l2, s.l3, s.l4, s.l4Name, s.address].join('|')
    expect(clear.SYSTEMS.map(shape)).toEqual(live.SYSTEMS.map(shape))
  })

  it('a deep link to /system/<id> resolves in both modes', async () => {
    /* The thing that proves "exactly the same, but all clear": a link captured
       from the live fleet opens the same system in the healthy one. */
    const live = await loadFleet('live')
    const leaking = live.SYSTEMS.find(isWaterEvent)
    const faulted = live.SYSTEMS.find((s) => s.alert && !isWaterEvent(s))
    expect(leaking, 'live fleet has a leaking system to deep-link to').toBeTruthy()
    expect(faulted, 'live fleet has a faulted system to deep-link to').toBeTruthy()

    const clear = await loadFleet('clear')
    for (const id of [leaking.id, faulted.id, live.SYSTEMS[0].id]) {
      const sys = clear.getSystemById(id)
      expect(sys, `/system/${id} resolves in clear mode`).toBeTruthy()
      expect(sys.id).toBe(id)
      expect(sys.alert).toBeNull()
    }
  })

  it('a system that has no valve upstream still has none — status changed, not hardware', async () => {
    const live = await loadFleet('live')
    const clear = await loadFleet('clear')
    const liveNoValve = new Set(live.SYSTEMS.filter((s) => s.valve === null).map((s) => s.id))
    const clearNoValve = new Set(clear.SYSTEMS.filter((s) => s.valve === null).map((s) => s.id))
    expect(liveNoValve.size).toBeGreaterThan(0)
    expect([...clearNoValve]).toEqual([...liveNoValve])
  })
})
