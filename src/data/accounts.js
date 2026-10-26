/**
 * accounts.js — the MRG account tree, imported from the WEB sandbox.
 *
 * Meridian Realty Group (MRG) plus its child accounts, exactly as the web app
 * scopes itself when `DEMO_MRG_ONLY` is on. Ids are the real Salesforce ids, so
 * an account resolves to the same record in both apps.
 *
 * Generated from `src/data/upstream/mrg-snapshot.json`. To change what's here,
 * change the web dataset and re-run `node scripts/sync-upstream-data.mjs`.
 */
import { ACCOUNTS_FROM_UPSTREAM, ROOT_ACCOUNT_ID } from './upstream/buildTree';

export const ACCOUNTS = ACCOUNTS_FROM_UPSTREAM;

/** The single account this demo is scoped to (web: DEMO_MRG_ACCOUNT_ID). */
export const DEMO_ACCOUNT_ID = ROOT_ACCOUNT_ID;

export function getAccountById(id) {
  return ACCOUNTS.find(a => a.id === id);
}

export function getChildAccounts(parentId) {
  return ACCOUNTS.filter(a => a.parentId === parentId);
}

export function getRootAccounts() {
  return ACCOUNTS.filter(a => a.parentId === null);
}

/**
 * An account id plus EVERY account beneath it, as a Set of ids.
 *
 * What an account manager can see is a rollup, not a single row: managing an
 * account means managing the sub-accounts under it. A persona that compares
 * `system.account === someId` sees only the systems tagged to that exact
 * account and silently misses everything in its children.
 *
 * That is not hypothetical — it is why this exists. The account-manager
 * persona filtered on one sub-account id (Southbridge Health) and resolved to
 * 2 of 103 systems, because the snapshot tags exactly one 2-system site to it
 * and every other system falls through to the MRG root. The side drawer dutifully
 * drew "Residential 0" and five childless building rows, which read as a broken
 * tree rather than as an empty scope. See personas.js.
 *
 * Walks DOWN only. The caller names the top of the scope; this does not climb
 * to a root, because "everything above me too" is not what managing an account
 * means. Cycle-safe (a malformed parentId chain would otherwise hang), and an
 * unknown id returns a set containing just that id, so a filter built on it
 * matches nothing rather than everything.
 */
export function accountWithDescendants(rootId) {
  const out = new Set([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift();
    for (const child of getChildAccounts(id)) {
      if (out.has(child.id)) continue;
      out.add(child.id);
      queue.push(child.id);
    }
  }
  return out;
}
