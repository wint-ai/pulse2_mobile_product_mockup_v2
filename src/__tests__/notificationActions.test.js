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

  /* ONGOING RESTORED 2026-11-01. Removing View emptied this state outright -
     View had been its only action - and the owner reported the empty row on an
     OL_* push: "why do I don't see any ignore or assign to me". It now carries
     the SAME two actions as Warning, gated the same way: a live, unresolved
     water event is still claimable and still ignorable. No new label was
     minted to fill the row; both of these already existed. */
  it('Ongoing: Assign to me · Ignore, the same set Warning offers', () => {
    const a = buildActions({ type: 'leak', state: 'Ongoing' }, { investigating: false, ignored: false, tagged: false });
    expect(keys(a)).toEqual(['investigate', 'ignore']);
    expect(labels(a)).toEqual(['Assign to me', 'Ignore']);
    // Dismiss is still never offered - swipe-to-dismiss is native.
    expect(a.find(x => x.key === 'dismiss')).toBeUndefined();
  });

  it('Ongoing + already investigating: the claim action is HIDDEN, Ignore stays', () => {
    // The gate is Warning's, verbatim: claiming spends the claim button and
    // does not withdraw the right to ignore.
    const a = buildActions({ type: 'leak', state: 'Ongoing' }, { investigating: true, ignored: false, tagged: false });
    expect(keys(a)).toEqual(['ignore']);
  });

  it('Warning and Ongoing offer the SAME set in both claim states', () => {
    // The point of the fix stated as one assertion: nothing about an event
    // being thirty minutes old changes which actions are relevant to it.
    for (const investigating of [false, true]) {
      const w = buildActions({ type: 'leak', state: 'Warning' }, { investigating, ignored: false, tagged: false });
      const o = buildActions({ type: 'leak', state: 'Ongoing' }, { investigating, ignored: false, tagged: false });
      expect(keys(o)).toEqual(keys(w));
      expect(labels(o)).toEqual(labels(w));
    }
  });

  it('Shutoff: Assign to me alone (no Ignore on Critical)', () => {
    const a = buildActions({ type: 'leak', state: 'Shutoff' }, { investigating: false, ignored: false, tagged: false });
    expect(keys(a)).toEqual(['investigate']);
    // The second of the two claim-label sites, pinned alongside Warning above.
    expect(labels(a)).toEqual(['Assign to me']);
    expect(a.find(x => x.key === 'ignore')).toBeUndefined();
  });

  /* REVIEWED AND KEPT EMPTY 2026-11-01, in the pass that refilled Ongoing.
     The two holes are not the same hole: Ongoing was empty because View had
     been struck out from under it, while this set is empty because both of its
     actions are genuinely spent - Ignore is withheld from Critical by the
     decision above, and the claim is spent because this person already holds
     it. Filling the row would mean minting a label, which is the owner's call.
     The body tap still opens the event and the "On it · X" pill still says who
     has it, so an empty row here is honest rather than a regression. */
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

/* THE WHOLE TABLE, 2026-11-01. The owner asked to "make sure all there. Only
   for the relevant stuff." after an OL_* Ongoing push arrived with an empty
   action row. The individual cases above each pin one cell; this pins the GRID,
   so a future change to one state cannot quietly empty another the way striking
   View emptied three at once. Every cell is spelled out - including the ones
   that are deliberately empty, which are the ones worth being explicit about. */
describe('the full state x flag table', () => {
  const CLAIM = ['investigate', 'ignore'];
  const TABLE = [
    // [ type,        state,         investigating, ignored, expected keys ]
    ['leak',  'Warning',      false, false, CLAIM],
    ['leak',  'Warning',      true,  false, ['ignore']],
    ['leak',  'Ongoing',      false, false, CLAIM],
    ['leak',  'Ongoing',      true,  false, ['ignore']],
    // Critical: Ignore is withheld by decision, so claiming spends the row.
    ['leak',  'Shutoff',      false, false, ['investigate']],
    ['leak',  'Shutoff',      true,  false, []],
    // End of Leak is the Tag CTA alone in both claim states - the event is
    // over, so neither claiming nor ignoring it means anything any more.
    ['leak',  'End of Leak',  false, false, ['tag']],
    ['leak',  'End of Leak',  true,  false, ['tag']],
    // Ignored collapses EVERY leak state to nothing. Deliberate: the
    // "Ignored - X" pill carries the state and the body tap still reopens it.
    ['leak',  'Warning',      false, true,  []],
    ['leak',  'Ongoing',      false, true,  []],
    ['leak',  'Ongoing',      true,  true,  []],
    ['leak',  'Shutoff',      false, true,  []],
    ['leak',  'End of Leak',  false, true,  []],
    // An unknown future state falls through the switch to nothing rather than
    // guessing - and 'ShutOff', capital O, is exactly that case (pushPayload.js
    // documents the casing trap).
    ['leak',  'ShutOff',      false, false, []],
    ['leak',  'Future-state', false, false, []],
    // Faults. OPEN QUESTION, NOT A SETTLED EMPTY: these are empty because
    // buildActions short-circuits non-leak types, and removing View emptied
    // them as a side effect rather than by anyone deciding it. Whether a fault
    // should offer the claim action is the owner's call - Ignore is a
    // water-event concept and eventFocusOverlay.dom.test.jsx already pins that
    // a fault surface offers neither. Left as found; this row records it.
    ['power-lost',           null, false, false, []],
    ['offline',              null, false, false, []],
    ['valve-error',          null, false, false, []],
    ['valve-closed-by-user', null, false, false, []],
  ];

  it.each(TABLE)('%s / %s / investigating=%s ignored=%s', (type, state, investigating, ignored, expected) => {
    const a = buildActions({ type, state }, { investigating, ignored, tagged: false });
    expect(keys(a)).toEqual(expected);
    // No set anywhere in the table exceeds two, and no label is ever blank.
    expect(a.length).toBeLessThanOrEqual(2);
    a.forEach(x => expect(x.label).toBeTruthy());
  });

  it('every non-empty set is drawn from the existing vocabulary only', () => {
    // The guard against a future hole being filled with INVENTED copy: no
    // label may appear on a push that is not already one of these three.
    const ALLOWED = new Set(['Assign to me', 'Ignore', 'Tag the cause', '✓ Tagged']);
    for (const [type, state, investigating, ignored] of TABLE) {
      for (const tagged of [false, true]) {
        const a = buildActions({ type, state }, { investigating, ignored, tagged });
        a.forEach(x => expect(ALLOWED.has(x.label), `unexpected label "${x.label}" on ${type}/${state}`).toBe(true));
      }
    }
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
    // Still true now that Ongoing has a two-action row again: the set is
    // Assign to me · Ignore, and Dismiss is not in the vocabulary.
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
