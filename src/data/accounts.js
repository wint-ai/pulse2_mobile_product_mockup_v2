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
