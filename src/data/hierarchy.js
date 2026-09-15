/**
 * hierarchy.js — the location tree, imported from the WEB sandbox.
 *
 * Shape (the web's MRG demo tree, mirrored exactly):
 *   Country "United States"
 *   └── Division "Office"       → Sites (100 Meridian Plaza, 220 Harborview Ave, …)
 *                                  → water systems
 *   └── Division "Residential"  → Buildings A–E
 *                                  → Apartment 1–10 (each apartment IS a system)
 *
 * Buildings D and E are deliberately all-clear — nothing under them has an
 * active event. That is what makes the empty states reachable without a
 * `?state=` override, and it matches the web exactly (web: demoMode.ts
 * DEMO_ALL_CLEAR_LOCATION_IDS).
 *
 * Generated from `src/data/upstream/mrg-snapshot.json`. To change what's here,
 * change the web dataset and re-run `node scripts/sync-upstream-data.mjs`.
 */
import { ACCOUNT_HIERARCHIES_FROM_UPSTREAM } from './upstream/buildTree';
import { ALL_CLEAR_LOCATION_IDS } from './upstream/parity';

export const ACCOUNT_HIERARCHIES = ACCOUNT_HIERARCHIES_FROM_UPSTREAM;

/** Location ids that are deliberately all-clear in the demo (web parity). */
export { ALL_CLEAR_LOCATION_IDS };

// ─── Utility functions ───────────────────────────────────────────────────────

export function getHierarchyForAccount(accountId) {
  return ACCOUNT_HIERARCHIES[accountId] || [];
}

export function collectSystemIds(node) {
  if (node.type === 'system') return [node.id];
  if (!node.children) return [];
  return node.children.flatMap(child => collectSystemIds(child));
}

export function getSystemsUnderNode(node, allSystems) {
  const ids = new Set(collectSystemIds(node));
  return allSystems.filter(s => ids.has(s.id));
}

export function countDescendants(node) {
  const systemIds = collectSystemIds(node);
  const childLevels = (node.children || []).filter(c => c.type !== 'system').length;
  return { systemCount: systemIds.length, childLevelCount: childLevels };
}

/** Depth-first lookup of any node (location or system) by id. */
export function findNodeById(id, roots = Object.values(ACCOUNT_HIERARCHIES).flat()) {
  for (const node of roots) {
    if (node.id === id) return node;
    const hit = findNodeById(id, node.children || []);
    if (hit) return hit;
  }
  return null;
}
