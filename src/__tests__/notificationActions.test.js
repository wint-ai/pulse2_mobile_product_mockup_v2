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

/* VIEW WAS REMOVED 2026-11-01 (owner: "remove the 'view' it is obvious / keep
   only the ignore and assign to me"). This suite used to pin Rami's 2026-06-06
   rule that every notification offers at least a View action; it now pins the
   opposite, because the owner overruled it. The rule's own comment is still in
   notificationActions.js, dated, so the trade is legible.

   What the suite is still guarding is unchanged: that each state produces
   exactly its set, in order; that Dismiss is never returned; that the Tag CTA
   is End-of-Leak-only; and that the claim action's LABEL and KEY cannot drift
   apart. The 'view' KEY is deliberately still handled in PushNotifications.jsx
   — it is what the notification body tap dispatches — so these assertions are
   about the BUTTON, not the code path. */

describe('notification action set per state', () => {
  /* LABEL STANDARDISED 2026-10-31 (owner: "Assign to me"). The claim action
     used to read "On it" on the push, "Assign to me" in the v2 overlay and
     "Claim alert" on its tile. The KEY is deliberately unchanged: the label is
     what the user reads, 'investigate' is what PushNotifications.jsx
     dispatches on. Both assertions below are here so a future relabel cannot
     quietly take the key with it. */
  it('Warning: Assign to me · Ignore', () => {
    const a = buildActions({ type: 'leak', state: 'Warning' }, { investigating: false, ignored: false, tagged: false });
    expect(keys(a)).toEqual(['investigate', 'ignore']);
    expect(labels(a)).toEqual(['Assign to me', 'Ignore']);
  });

  it('Warning + already investigating: the claim action is HIDDEN', () => {
    const a = buildActions({ type: 'leak', state: 'Warning' }, { investigating: true, ignored: false, tagged: false });
    expect(keys(a)).toEqual(['ignore']); // no investigate
  });

  it('Ongoing: no actions - View was its only one, and Dismiss is native swipe', () => {
    const a = buildActions({ type: 'leak', state: 'Ongoing' }, { investigating: false, ignored: false, tagged: false });
    expect(keys(a)).toEqual([]);
    expect(a.find(x => x.key === 'dismiss')).toBeUndefined();
  });

  it('Shutoff: Assign to me alone (no Ignore on Critical)', () => {
    const a = buildActions({ type: 'leak', state: 'Shutoff' }, { investigating: false, ignored: false, tagged: false });
    expect(keys(a)).toEqual(['investigate']);
    // The second of the two claim-label sites, pinned alongside Warning above.
    expect(labels(a)).toEqual(['Assign to me']);
    expect(a.find(x => x.key === 'ignore')).toBeUndefined();
  });

  it('Shutoff + investigating: the claim action is hidden, leaving no actions', () => {
    const a = buildActions({ type: 'leak', state: 'Shutoff' }, { investigating: true, ignored: false, tagged: false });
    expect(keys(a)).toEqual([]);
  });

  it('End of Leak (untagged): Tag CTA alone, and it stays primary', () => {
    const a = buildActions({ type: 'leak', state: 'End of Leak' }, { investigating: false, ignored: false, tagged: false });
    // Tag survived the View removal: the owner struck View, and Tag is not a
    // "merely opens your app" action.
    expect(keys(a)).toEqual(['tag']);
    expect(a[0].label).toBe('Tag the cause');
    expect(a[0].primary).toBe(true);
    expect(a[0].tagCta).toBe(true); // drives the Wint-blue button styling
  });

  it('End of Leak (tagged): Tag button shows "✓ Tagged" done state', () => {
    const a = buildActions({ type: 'leak', state: 'End of Leak' }, { investigating: false, ignored: false, tagged: true });
    expect(keys(a)).toEqual(['tag']);
    expect(a[0].label).toBe('✓ Tagged');
    expect(a[0].done).toBe(true);
    expect(a[0].primary).toBe(false);
    expect(a[0].tagCta).toBeFalsy();
  });

  it('Any state + ignored: NO actions (an empty row, not an orphaned control)', () => {
    // This is the hole View used to paper over: ignoring collapsed the set to
    // View alone, so with View gone the honest answer is an empty set. The
    // card still shows the "Ignored" status pill, and the body tap still
    // navigates — NotifActions returns null on an empty set, so no strip is
    // drawn at all.
    const states = ['Warning', 'Ongoing', 'Shutoff', 'End of Leak'];
    states.forEach(state => {
      const a = buildActions({ type: 'leak', state }, { investigating: false, ignored: true, tagged: false });
      expect(keys(a)).toEqual([]);
    });
  });

  it('non-leak notification type: no actions', () => {
    const types = ['valve-error', 'valve-error-cleared', 'power-lost', 'power-restored',
                   'offline', 'online', 'valve-closed-by-user', 'meter-disconnected'];
    types.forEach(type => {
      const a = buildActions({ type }, { investigating: false, ignored: false, tagged: false });
      expect(keys(a)).toEqual([]);
    });
  });

  it('unknown leak state defaults to no actions', () => {
    const a = buildActions({ type: 'leak', state: 'Future-state' }, { investigating: false, ignored: false, tagged: false });
    expect(keys(a)).toEqual([]);
  });
});

describe("the View BUTTON is never returned (owner, 2026-11-01)", () => {
  /* The assertion that stops the rule drifting back. It sweeps every state and
     every state-flag combination rather than spot-checking, because View used
     to be the one constant and a partial revert would be easy to miss. */
  const LEAK_STATES = ['Warning', 'Ongoing', 'Shutoff', 'End of Leak', 'Future-state'];
  const NON_LEAK = ['valve-error', 'power-lost', 'offline', 'valve-closed-by-user'];
  const FLAGS = [false, true];

  it.each(LEAK_STATES)('leak state %s never offers View', (state) => {
    for (const investigating of FLAGS) {
      for (const ignored of FLAGS) {
        for (const tagged of FLAGS) {
          const a = buildActions({ type: 'leak', state }, { investigating, ignored, tagged });
          expect(a.find(x => x.key === 'view')).toBeUndefined();
          expect(labels(a)).not.toContain('View');
        }
      }
    }
  });

  it.each(NON_LEAK)('non-leak type %s never offers View', (type) => {
    const a = buildActions({ type }, { investigating: false, ignored: false, tagged: false });
    expect(a.find(x => x.key === 'view')).toBeUndefined();
  });

  it('never returns more than two actions (safe on iOS and Android alike)', () => {
    // Apple's HIG says up to four but UNNotificationCategory says at most two
    // when space is constrained; Android caps at three. Two is safe everywhere.
    for (const state of LEAK_STATES) {
      for (const investigating of FLAGS) {
        for (const ignored of FLAGS) {
          const a = buildActions({ type: 'leak', state }, { investigating, ignored, tagged: false });
          expect(a.length).toBeLessThanOrEqual(2);
        }
      }
    }
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
