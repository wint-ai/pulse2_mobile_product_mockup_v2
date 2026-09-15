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
import { getSystemConsumption } from './consumptionModel';

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
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
const unit = (id, key) => (hash(`${id}|insight|${key}`) % 100000) / 100000;

/**
 * Insights for one system, in the web's row shape.
 *
 * A system carries 0–2 insights. That is deliberate: the old local generator
 * gave nearly every system something to say, which made the feature look like
 * noise. Insights are meant to be occasional.
 */
export function getInsightsForSystem(system) {
  if (!system) return [];

  const id = system.id;
  const count = hash(`${id}|insight-count`) % 3; // 0, 1 or 2
  if (count === 0) return [];

  const profile = getSystemConsumption(id, system, 120);
  const daily = profile.daily;
  const window = daily.slice(-28);
  const series = window.map(d => d.liters);

  // Baseline: the prior 28 days' mean, flat across the window. The web carries
  // a per-day `expected`; a flat baseline is the honest reduction of that when
  // we have no forecast model, and it still makes the divergence readable.
  const prior = daily.slice(-56, -28);
  const baselineValue = prior.length
    ? Math.round(prior.reduce((t, d) => t + d.liters, 0) / prior.length)
    : Math.round(series.reduce((t, v) => t + v, 0) / Math.max(1, series.length));
  const baseline = series.map(() => baselineValue);

  const actualMean = series.reduce((t, v) => t + v, 0) / Math.max(1, series.length);
  const rows = [];

  // Insight 1 — usage change, measured against the system's own baseline.
  const pct = baselineValue ? ((actualMean - baselineValue) / baselineValue) * 100 : 0;
  const up = pct >= 0;
  rows.push({
    id: `${id}-usage`,
    systemId: id,
    name: system.name,
    address: [system.l4Name, system.l2Name].filter(Boolean).join(' · '),
    kind: up ? INSIGHT_KIND.USAGE_UP : INSIGHT_KIND.USAGE_DOWN,
    label: up ? INSIGHT_LABEL['usage-up'] : INSIGHT_LABEL['usage-down'],
    deltaPct: Math.abs(pct),
    liters: Math.abs(Math.round((actualMean - baselineValue) * series.length)),
    series,
    baseline,
  });

  // Insight 2 — background flow, only on some systems.
  if (count === 2) {
    rows.push({
      id: `${id}-bg`,
      systemId: id,
      name: system.name,
      address: [system.l4Name, system.l2Name].filter(Boolean).join(' · '),
      kind: INSIGHT_KIND.BACKGROUND_FLOW,
      label: INSIGHT_LABEL['background-flow'],
      flowRate: Math.round((2 + unit(id, 'bg') * 26) * 10) / 10, // 2.0–28.0 L/h
      series,
      baseline,
    });
  }

  return rows;
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
