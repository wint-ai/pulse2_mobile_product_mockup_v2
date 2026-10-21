/**
 * insightsModel.js — the WEB sandbox's insights model, ported.
 *
 * Upstream:
 *   pulse2_product_sandbox/src/types/insights.ts
 *   pulse2_product_sandbox/src/components/insights/insightTypeMeta.ts
 *   pulse2_product_sandbox/src/components/shadcn-shell/InsightsCard.tsx
 *
 * WHAT WAS WRONG LOCALLY. src/data/systemDetails.js invented insights from a
 * six-entry template list — "Night-time flow", "Usage decreased", "Consumption
 * spike" — with a random value and no link to the system's actual consumption.
 * So the card showed template names where the web shows the SYSTEM name, could
 * repeat the same title twice, and drew a decorative sparkline that had nothing
 * to do with the data.
 *
 * THE WEB'S MODEL. Two types only:
 *   BACKGROUND_FLOW      continuous low flow that never stops — reported as L/h
 *   WATER_USAGE_CHANGE   consumption moved against its own baseline — reported
 *                        as a percentage and a litre delta, and signed, so it
 *                        splits into usage-up and usage-down
 *
 * A row therefore carries: the water system's name, its location path, the
 * kind, the value in that kind's unit, and the real daily series plus the
 * expected baseline — the sparkline plots actual against expected, which is
 * what makes it worth drawing at all.
 *
 * Colours are the web's, from insightTypeMeta.ts and InsightsCard.tsx:
 *   increase #FB2C36 · decrease #269950 · background flow #193CB8
 */

import { isAllClearDemoSystem } from './parity';
import { generateDailyConsumption, generateRawFlows, seededRng } from './insightSeries';

export const INSIGHT_KIND = {
  USAGE_UP: 'usage-up',
  USAGE_DOWN: 'usage-down',
  BACKGROUND_FLOW: 'background-flow',
};

/** Upstream colours. Increase is bad and red; decrease is good and green. */
export const INSIGHT_COLOR = {
  'usage-up': '#FB2C36',
  'usage-down': '#269950',
  'background-flow': '#193CB8',
};

export const INSIGHT_LABEL = {
  'usage-up': 'Usage increased',
  'usage-down': 'Usage decreased',
  'background-flow': 'Background flow',
};

/** FNV-1a, matching consumptionModel so the two agree per system. */
/* The local hash and its `unit` helper are gone with the old generator:
   every draw now comes from the web's own seededRng, so a second stream here
   would only be a way to disagree with upstream. */

/**
 * Insights for one system, in the web's row shape.
 *
 * REWRITTEN 2026-10-21 to follow the web exactly. Owner: "i want the insight
 * charts to use same data and patterns exactly as we have in pulse 2 sandbox
 * project". What stood here derived a series from the system's own
 * consumption profile and drew a FLAT baseline at the prior 28 days' mean, so
 * every insight looked alike and none of them looked like the web.
 *
 * The web does it in two steps, and so does this now:
 *
 *   synthInsightsForSystem(sys)   insightsMockData.ts:1131
 *       seeded on the system id. An all-clear system gets nothing at all.
 *       Otherwise rng() < 0.16 buys a background-flow insight and rng() < 0.13
 *       buys a usage-change one — so MOST SYSTEMS HAVE NONE, which is the
 *       point: insights are meant to be occasional. Across this 103-system
 *       fleet that still leaves about thirty, far more than a four-row card
 *       needs.
 *
 *   generateSyntheticDetails(eventId)   insightsMockData.ts:1182
 *       seeded on the EVENT id, not the system's, so the two insights a
 *       system can carry do not share a stream. This is where the series
 *       comes from: 30 days of hourly background flow, or `daysAgo` days of
 *       daily actual-vs-expected with the event starting 30% in.
 *
 * The rng DRAW ORDER is load-bearing and is reproduced call for call — days,
 * then resolved, then resolvedAt only when resolved, then the type's own
 * figures. Reordering them silently changes every number in the app.
 *
 * WHAT IS NOT PORTED: the ~1,100 lines of hand-authored `allInsightGroups`.
 * Those are keyed by `waterSystemId` for the web's own demo systems, and
 * `getInsightsForScope` only reaches for one when the scope contains that
 * exact id. No MRG system does, so every insight in this dataset comes down
 * the synthetic path on the web too — the hand-authored list would be dead
 * weight here. `generateUsageIncreasedSeries` goes with them: it feeds only
 * the hand-authored groups and nothing in the synthetic path calls it.
 */
export function getInsightsForSystem(system) {
  if (!system) return [];
  const id = system.id;
  // web: an all-clear location has no insights anywhere beneath it.
  if (isAllClearDemoSystem(id)) return [];

  const rng = seededRng(id);
  const now = Date.now();
  const address = [system.l4Name, system.l2Name].filter(Boolean).join(' · ');
  const rows = [];

  /* web: synthInsightsForSystem's `make`. The draws happen here in the same
     order even where this app has no use for the value, because skipping one
     would shift every draw after it. */
  const make = (token, i) => {
    const days = 1 + Math.floor(rng() * 40);
    const ts = new Date(now - days * 86400000);
    const resolved = rng() < 0.2;
    const resolvedAt = resolved
      ? new Date(ts.getTime() + (1 + Math.floor(rng() * 10)) * 86400000)
      : null;
    const eventId = `EVT-${id}-${token}-${i}`;
    const base = { id: `${id}-gen-${token}-${i}`, eventId, systemId: id, name: system.name, address, timestamp: ts, resolved, resolvedAt };
    if (token === 'bf') {
      // Drawn and discarded: the row states `recentFlow` from the DETAILS, as
      // the web's InsightRow does, not this figure. The draw still has to
      // happen — see the note above.
      Math.round((3 + rng() * 25) * 10) / 10;
      return { ...base, kind: INSIGHT_KIND.BACKGROUND_FLOW };
    }
    const sign = rng() < 0.5 ? 1 : -1;
    Math.round(sign * (2000 + rng() * 13000));
    return { ...base, kind: 'usage-change' };
  };

  if (rng() < 0.16) rows.push(make('bf', 0));
  if (rng() < 0.13) rows.push(make('uc', 1));

  return rows.map(r => detailsFor(r));
}

/**
 * web: generateSyntheticDetails. Seeded on the event id, and memoised the way
 * upstream memoises it in `generatedDetailsCache` — a 720-point hourly series
 * is not something to rebuild on every render.
 */
const detailsCache = new Map();

function detailsFor(row) {
  const hit = detailsCache.get(row.eventId);
  if (hit) return { ...row, ...hit };

  const rng = seededRng(row.eventId);
  const baseLph = 4 + rng() * 24;                       // 4–28 L/h
  const volume = Math.round(baseLph * 24 * (10 + rng() * 20)); // 10–30 days worth
  const daysAgo = 5 + Math.floor(rng() * 25);
  const start = new Date();
  start.setDate(start.getDate() - daysAgo - 30);
  const startIso = start.toISOString().slice(0, 10);

  let out;
  if (row.kind === INSIGHT_KIND.BACKGROUND_FLOW) {
    const recentFlow = Math.round(baseLph * 10) / 10;
    const rawFlows = generateRawFlows(recentFlow, 30, startIso);
    out = {
      label: INSIGHT_LABEL['background-flow'],
      flowRate: recentFlow,
      liters: volume,
      /* web InsightRow: spark = rawFlows.map(f => f.backgroundFlow), and NO
         baseline — background flow has no expected line to be judged against. */
      series: rawFlows.map(f => f.backgroundFlow),
      baseline: null,
    };
  } else {
    // web: ~45% of synthetic usage changes are DECREASES, so both directions
    // show up at every scope; the sign drives the numbers AND the series.
    const sign = rng() < 0.45 ? -1 : 1;
    const pctChange = sign * (10 + rng() * 55);
    const baselineUsage = 200 + rng() * 600;
    const actual = baselineUsage * (1 + pctChange / 100);
    const daily = generateDailyConsumption(
      Math.round(baselineUsage),
      1 + pctChange / 100,
      daysAgo,
      Math.floor(daysAgo * 0.3),
      startIso,
      rng,
    );
    const up = sign > 0;
    out = {
      kind: up ? INSIGHT_KIND.USAGE_UP : INSIGHT_KIND.USAGE_DOWN,
      label: up ? INSIGHT_LABEL['usage-up'] : INSIGHT_LABEL['usage-down'],
      deltaPct: Math.round(Math.abs(pctChange) * 10) / 10,
      liters: Math.abs(Math.round(actual - baselineUsage) * daysAgo),
      /* web InsightRow: spark = actual, baseline = expected. */
      series: daily.map(d => d.actual),
      baseline: daily.map(d => d.expected),
    };
  }

  detailsCache.set(row.eventId, out);
  return { ...row, ...out };
}

/**
 * Feed for a card, across many systems.
 *
 * Upstream guarantees a MIX: the newest of each kind first, then fill by
 * recency, capped at four. Without that the list reads as four copies of
 * whichever kind happens to dominate — which is exactly what the local card
 * was showing ("Usage increased" twice in a four-row list).
 */
export function getInsightRows(systems, limit = 4) {
  const all = [];
  for (const s of systems || []) all.push(...getInsightsForSystem(s));

  const picked = [];
  for (const kind of [INSIGHT_KIND.USAGE_UP, INSIGHT_KIND.USAGE_DOWN, INSIGHT_KIND.BACKGROUND_FLOW]) {
    const first = all.find(r => r.kind === kind && !picked.includes(r));
    if (first) picked.push(first);
  }
  for (const r of all) {
    if (picked.length >= limit) break;
    if (!picked.includes(r)) picked.push(r);
  }
  return picked.slice(0, limit);
}

/** The value a row states, in its own kind's unit. */
export function insightValueLabel(row) {
  if (row.kind === INSIGHT_KIND.BACKGROUND_FLOW) return `${row.flowRate} L/h`;
  const sign = row.kind === INSIGHT_KIND.USAGE_UP ? '+' : '-';
  return `${sign}${row.deltaPct.toFixed(1)}%`;
}
