// Tests the per-state action set on notification cards.
// Asserts every state produces the right action keys, in the right order.

import { describe, it, expect } from 'vitest';
import { buildActions } from '../utils/notificationActions';

function keys(actions) {
  return actions.map(a => a.key);
}
function labels(actions) {
  return actions.map(a => a.label);
}

describe('notification action set per state', () => {
  /* LABEL STANDARDISED 2026-10-31 (owner: "Assign to me"). The claim action
     used to read "On it" on the push, "Assign to me" in the v2 overlay and
     "Claim alert" on its tile. The KEY is deliberately unchanged: the label is
     what the user reads, 'investigate' is what PushNotifications.jsx:644
     dispatches on. Both assertions below are here so a future relabel cannot
     quietly take the key with it. */
  it('Warning: View · Assign to me · Ignore', () => {
    const a = buildActions({ type: 'leak', state: 'Warning' }, { investigating: false, ignored: false, tagged: false });
    expect(keys(a)).toEqual(['view', 'investigate', 'ignore']);
    expect(labels(a)).toEqual(['View', 'Assign to me', 'Ignore']);
  });

  it('Warning + already investigating: the claim action is HIDDEN', () => {
    const a = buildActions({ type: 'leak', state: 'Warning' }, { investigating: true, ignored: false, tagged: false });
    expect(keys(a)).toEqual(['view', 'ignore']); // no investigate
  });

  it('Ongoing: View only - no Dismiss (swipe-to-dismiss is native)', () => {
    const a = buildActions({ type: 'leak', state: 'Ongoing' }, { investigating: false, ignored: false, tagged: false });
    expect(keys(a)).toEqual(['view']);
    expect(a.find(x => x.key === 'dismiss')).toBeUndefined();
  });

  it('Shutoff: View · Assign to me (no Ignore on Critical)', () => {
    const a = buildActions({ type: 'leak', state: 'Shutoff' }, { investigating: false, ignored: false, tagged: false });
    expect(keys(a)).toEqual(['view', 'investigate']);
    // The second of the two claim-label sites, pinned alongside Warning above.
    expect(labels(a)).toEqual(['View', 'Assign to me']);
    expect(a.find(x => x.key === 'ignore')).toBeUndefined();
  });

  it('Shutoff + investigating: the claim action is hidden', () => {
    const a = buildActions({ type: 'leak', state: 'Shutoff' }, { investigating: true, ignored: false, tagged: false });
    expect(keys(a)).toEqual(['view']);
  });

  it('End of Leak (untagged): Tag CTA primary, View secondary', () => {
    const a = buildActions({ type: 'leak', state: 'End of Leak' }, { investigating: false, ignored: false, tagged: false });
    expect(keys(a)).toEqual(['tag', 'view']);
    expect(a[0].label).toBe('Tag the cause');
    expect(a[0].primary).toBe(true);
    expect(a[0].tagCta).toBe(true); // drives the Wint-blue button styling
  });

  it('End of Leak (tagged): Tag button shows "✓ Tagged" done state, View still present', () => {
    const a = buildActions({ type: 'leak', state: 'End of Leak' }, { investigating: false, ignored: false, tagged: true });
    expect(keys(a)).toEqual(['tag', 'view']);
    expect(a[0].label).toBe('✓ Tagged');
    expect(a[0].done).toBe(true);
    expect(a[0].primary).toBe(false);
    expect(a[0].tagCta).toBeFalsy();
  });

  it('Any state + ignored: View only (all other actions collapse)', () => {
    const states = ['Warning', 'Ongoing', 'Shutoff', 'End of Leak'];
    states.forEach(state => {
      const a = buildActions({ type: 'leak', state }, { investigating: false, ignored: true, tagged: false });
      expect(keys(a)).toEqual(['view']);
    });
  });

  it('non-leak notification type: View only (rule - every notification has at least View)', () => {
    const types = ['valve-error', 'valve-error-cleared', 'power-lost', 'power-restored',
                   'offline', 'online', 'valve-closed-by-user', 'meter-disconnected'];
    types.forEach(type => {
      const a = buildActions({ type }, { investigating: false, ignored: false, tagged: false });
      expect(keys(a)).toEqual(['view']);
      expect(a[0].primary).toBe(true);
    });
  });

  it('unknown leak state defaults to View only', () => {
    const a = buildActions({ type: 'leak', state: 'Future-state' }, { investigating: false, ignored: false, tagged: false });
    expect(keys(a)).toEqual(['view']);
  });
});

describe('Dismiss action is NEVER returned by buildActions', () => {
  it('Ongoing has no Dismiss', () => {
    const a = buildActions({ type: 'leak', state: 'Ongoing' }, {});
    expect(a.find(x => x.key === 'dismiss')).toBeUndefined();
  });
  it('End of Leak has no Dismiss', () => {
    const a = buildActions({ type: 'leak', state: 'End of Leak' }, {});
    expect(a.find(x => x.key === 'dismiss')).toBeUndefined();
  });
});

describe('Tag CTA only on End of Leak', () => {
  it('Warning has no Tag action', () => {
    const a = buildActions({ type: 'leak', state: 'Warning' }, {});
    expect(a.find(x => x.key === 'tag')).toBeUndefined();
  });
  it('Ongoing has no Tag action', () => {
    const a = buildActions({ type: 'leak', state: 'Ongoing' }, {});
    expect(a.find(x => x.key === 'tag')).toBeUndefined();
  });
  it('Shutoff has no Tag action', () => {
    const a = buildActions({ type: 'leak', state: 'Shutoff' }, {});
    expect(a.find(x => x.key === 'tag')).toBeUndefined();
  });
  it('End of Leak has Tag action with primary+tagCta', () => {
    const a = buildActions({ type: 'leak', state: 'End of Leak' }, {});
    expect(a.find(x => x.key === 'tag')).toBeTruthy();
  });
});
