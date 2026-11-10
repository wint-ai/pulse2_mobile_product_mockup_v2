/**
 * ── NO GENERATED EVENT RUNS LONGER THAN SIX HOURS ──────────────────────────
 *
 * Owner, 2026-11-10, on an event card reading "1d 12h 11m" under Duration:
 * "in the data simulation on the events, I want to see maximum six hours. Not
 * more than that. In the mock data,".
 *
 * WHY THIS FILE EXISTS RATHER THAN A FIXTURE EDIT. The ceiling is a property
 * of the GENERATOR, and the generator is a hash over every system id in the
 * snapshot — 103 of them. A spot check on the three systems someone happened
 * to open proves nothing about the other hundred, and the card the owner
 * photographed was not one of the three.  Every assertion below sweeps the
 * WHOLE fleet.
 *
 * WHY IT ASSERTS THE CAP AND NOT A VALUE. "10h 07m" and "6h 36m" are in this
 * repo's fixtures today because an earlier test pinned whatever the generator
 * happened to print. Those numbers rot the moment the dataset is regenerated
 * and they do not state the rule. `MAX_EVENT_HOURS` is the rule, imported from
 * the module that applies it, so this file cannot drift away from the
 * generator and cannot be satisfied by a new magic number.
 *
 * WHAT "AGREE" MEANS HERE. The 2026-11-04 one-record change exists because two
 * surfaces derived one fact independently and disagreed. A cap applied in a
 * display helper would recreate exactly that, and would still pass a test that
 * only read the formatted string. So the sweep checks the RECORD
 * (`durationSec`), the INSTANTS it was derived from, and the STRINGS every
 * surface prints — and requires all three to be the same number.
 */
import { describe, it, expect } from 'vitest';
import { SYSTEMS } from '../data/systems';
import { MAX_EVENT_HOURS } from '../data/upstream/buildTree';
import { BUILD_NOW, stableHash } from '../data/upstream/parity';
import { CURRENT_EVENTS, HISTORY_EVENTS } from '../data/events';
import { INCIDENTS_FROM_UPSTREAM } from '../data/upstream/generateIncidents';
import { parseDuration, formatDuration } from '../utils/format';

const CAP_SEC = MAX_EVENT_HOURS * 3600;
const WATER = new Set(['leak-high', 'leak-low']);
const ALERTING = SYSTEMS.filter(s => s.alert);

/** Every seconds-valued duration the generated dataset carries, labelled. */
function everyDuration() {
  const out = [];
  for (const s of ALERTING) {
    out.push([`${s.id} alert.durationSec`, s.alert.durationSec]);
    out.push([`${s.id} event.durationSec`, s.event.durationSec]);
  }
  for (const e of CURRENT_EVENTS) if (e.durationSec != null) out.push([`CURRENT ${e.id}`, e.durationSec]);
  for (const e of HISTORY_EVENTS) if (e.durationSec != null) out.push([`HISTORY ${e.id}`, e.durationSec]);
  for (const inc of INCIDENTS_FROM_UPSTREAM) {
    if (inc.durationSec != null) out.push([`INCIDENT ${inc.id}`, inc.durationSec]);
    if (inc.endedAtIso) {
      out.push([
        `INCIDENT ${inc.id} span`,
        Math.round((Date.parse(inc.endedAtIso) - Date.parse(inc.startedAtIso)) / 1000),
      ]);
    }
  }
  return out;
}

describe('the six-hour ceiling on generated event durations', () => {
  it('has a fleet to check — the sweep below is not vacuously true', () => {
    expect(ALERTING.length).toBeGreaterThan(0);
    expect(HISTORY_EVENTS.length).toBeGreaterThan(0);
    expect(everyDuration().length).toBeGreaterThan(200);
  });

  it('caps every duration in the dataset, active and resolved', () => {
    const over = everyDuration().filter(([, sec]) => sec > CAP_SEC);
    expect(over.map(([what, sec]) => `${what} = ${formatDuration(sec)}`)).toEqual([]);
  });

  /* The STRING is what the owner photographed. A record under the cap behind a
     label that still reads "1d 12h 11m" is the bug, not the fix. */
  it('prints no duration over the cap on any surface, and never a day', () => {
    const strings = [];
    for (const s of ALERTING) strings.push([`${s.id} age`, s.alert.age]);
    for (const e of [...CURRENT_EVENTS, ...HISTORY_EVENTS]) {
      if (e.metadata?.Duration) strings.push([`${e.id} metadata.Duration`, e.metadata.Duration]);
    }
    for (const s of SYSTEMS) {
      if (s.resolvedIncident?.totalDuration) {
        strings.push([`${s.id} resolvedIncident.totalDuration`, s.resolvedIncident.totalDuration]);
      }
    }
    expect(strings.length).toBeGreaterThan(100);
    const bad = strings.filter(([, v]) => /\d+\s*d\b/.test(v) || parseDuration(v) > CAP_SEC);
    expect(bad.map(([what, v]) => `${what} = ${v}`)).toEqual([]);
  });

  /* ONE RECORD, ONE NUMBER. `age` is the formatted spelling of `durationSec`;
     had the cap been applied to one and not the other, this fails. */
  it('keeps the record and every spelling of it on the same number', () => {
    for (const s of ALERTING) {
      expect.soft(parseDuration(s.alert.age), `${s.id} age vs durationSec`).toBe(s.alert.durationSec);
      expect.soft(s.alert.durationSec, `${s.id} alert vs event record`).toBe(s.event.durationSec);
      const detected = Date.parse(s.alert.startedAtIso);
      expect.soft(detected, `${s.id} startedAtIso parses`).not.toBeNaN();
      /* The Detected stamp and the duration describe one event: the stamp is
         the duration before the build's own `now`, to the second. */
      expect
        .soft(Math.round((BUILD_NOW - detected) / 1000), `${s.id} Detected vs duration`)
        .toBe(s.alert.durationSec);
    }
    for (const e of HISTORY_EVENTS) {
      expect.soft(parseDuration(e.metadata.Duration), `${e.id} printed vs durationSec`).toBe(e.durationSec);
    }
  });

  /* DETERMINISM. The spread must be a function of the system id and nothing
     else — no `Math.random()`, no `Date.now()` read at generation or at render
     — or two reads on one page load can still disagree. Recomputed here from
     the seed, independently of the generator. */
  it('derives every water-event duration from the stable hash alone', () => {
    const span = h => 1 + (h % (MAX_EVENT_HOURS - 1)) + (h % 60) / 60;
    const leaks = ALERTING.filter(s => WATER.has(s.alert.type));
    expect(leaks.length).toBeGreaterThan(0);
    for (const s of leaks) {
      expect
        .soft(s.alert.durationSec, `${s.id} is its hash and nothing else`)
        .toBe(Math.round(span(stableHash(`active:${s.id}`)) * 3600));
    }
  });

  /* VARIED. A fleet that all reads "5h 59m" is broken in a new way. */
  it('spreads the durations instead of parking them on the ceiling', () => {
    const distinct = new Set(HISTORY_EVENTS.map(e => e.durationSec));
    expect(distinct.size).toBeGreaterThan(10);
    const wholeHours = new Set(HISTORY_EVENTS.map(e => Math.floor(e.durationSec / 3600)));
    expect(wholeHours.size).toBeGreaterThanOrEqual(MAX_EVENT_HOURS - 1);
    const offTheHour = HISTORY_EVENTS.filter(e => e.durationSec % 3600 !== 0);
    expect(offTheHour.length).toBeGreaterThan(HISTORY_EVENTS.length / 2);
  });

  /* RULE 0. The ceiling changes how long events have been running. It must not
     change which systems are alerting, how many, or about what. */
  it('leaves the alert population of the fleet untouched', () => {
    expect(ALERTING.length).toBe(13);
    const byType = {};
    for (const s of ALERTING) byType[s.alert.type] = (byType[s.alert.type] || 0) + 1;
    expect(byType).toEqual({ 'leak-high': 3, 'leak-low': 6, 'power-lost': 2, offline: 1, 'valve-error': 1 });
    /* One closed event per system, as before — the cap shortens them, it does
       not drop any. */
    expect(HISTORY_EVENTS.length).toBe(SYSTEMS.length);
  });
});
