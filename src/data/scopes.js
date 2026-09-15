/**
 * scopes.js — the scope picker's list, DERIVED from the location tree.
 *
 * This used to be a hand-maintained list whose system counts and alert counts
 * had to be kept in step with systems.js by hand, and drifted. It is now
 * computed from the same tree everything else reads, so the counts are correct
 * by construction.
 */
import { SCOPES_FROM_UPSTREAM } from './upstream/buildTree';

export const SCOPES = SCOPES_FROM_UPSTREAM;

export function getScopeByKey(key) {
  return SCOPES.find(s => s.key === key) || SCOPES[0];
}
