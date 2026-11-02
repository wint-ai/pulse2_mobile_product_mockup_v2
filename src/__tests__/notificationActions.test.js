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

/* TWO CTAs, AND ONLY TWO (owner, 2026-11-02): "the only CTAs i want to have is
   2 — Tel us more, when water event is ended, and than it redirect the user
   into the tag leak flow; and to any push notification View button and then it
   redirect the user to the push content". Follow-up answers: End of Leak shows
   BOTH buttons; View is on the lock-screen card too; the body tap stays in
   addition to the button.

   This suite has now pinned three different contracts in three days, so read
   the dates:
     — it used to pin Rami's 2026-06-06 rule that every notification offers at
       least View;
     — on 2026-11-01 the owner struck the View BUTTON and it pinned the
       opposite, plus Assign to me / Ignore per state;
     — from 2026-11-02 it pins the set below. View is universal again, by a
       different route, and Assign to me / Ignore have left the push entirely.

   Everything deleted from this file was deleted because the owner removed the
   behaviour it pinned, never because it became inconvenient; each deletion
   says which behaviour, where it used to sit.

   What the suite still guards is unchanged in spirit: that each state produces
   exactly its set, in order; that no action outside the vocabulary can appear;
   and that a struck action cannot drift back. */

const VIEW_ONLY = ['view'];

describe('notification action set per state', () => {
  /* DELETED 2026-11-02 — "Warning: Assign to me · Ignore", "Warning + already
     investigating: the claim action is HIDDEN", "Ongoing: Assign to me ·
     Ignore, the same set Warning offers", "Ongoing + already investigating",
     "Warning and Ongoing offer the SAME set in both claim states", "Shutoff:
     Assign to me alone (no Ignore on Critical)" and "Shutoff + investigating:
     the claim action is hidden, leaving no actions".
     All seven pinned the Assign to me / Ignore vocabulary and its
     `investigating` gate on the push. The owner removed both actions from the
     push outright, so there is no gate and no per-state difference left to
     pin: Warning, Ongoing and Shutoff are now the same single-View row as
     everything else, covered by the cases below and by the full table.
     Claiming and ignoring are untouched on their own surfaces (overlay, v2
     system page, Water Event card) and their tests there still stand. */

  it('Warning: View alone', () => {
    const a = buildActions({ type: 'leak', state: 'Warning' }, { investigating: false, ignored: false, tagged: false });
    expect(keys(a)).toEqual(VIEW_ONLY);
    expect(labels(a)).toEqual(['View']);
  });

  it('Ongoing: View alone', () => {
    const a = buildActions({ type: 'leak', state: 'Ongoing' }, { investigating: false, ignored: false, tagged: false });
    expect(keys(a)).toEqual(VIEW_ONLY);
    expect(labels(a)).toEqual(['View']);
  });

  it('Shutoff: View alone', () => {
    const a = buildActions({ type: 'leak', state: 'Shutoff' }, { investigating: false, ignored: false, tagged: false });
    expect(keys(a)).toEqual(VIEW_ONLY);
    expect(labels(a)).toEqual(['View']);
  });

  it('the claim flag no longer changes ANY set', () => {
    // The `investigating` argument survives in the signature only because
    // PushNotifications.jsx passes it. Nothing reads it for action selection
    // any more, and this is the assertion that says so out loud.
    const states = ['Warning', 'Ongoing', 'Shutoff', 'End of Leak', 'Future-state'];
    states.forEach(state => {
      const off = buildActions({ type: 'leak', state }, { investigating: false, ignored: false, tagged: false });
      const on  = buildActions({ type: 'leak', state }, { investigating: true,  ignored: false, tagged: false });
      expect(keys(on)).toEqual(keys(off));
      expect(labels(on)).toEqual(labels(off));
    });
  });

  /* THE TWO-BUTTON STATE. End of Leak is the only state with a second CTA, and
     the order is part of the contract: the tag CTA is the primary and leads. */
  it('End of Leak (untagged): Tell us more · View, in that order', () => {
    const a = buildActions({ type: 'leak', state: 'End of Leak' }, { investigating: false, ignored: false, tagged: false });
    expect(keys(a)).toEqual(['tag', 'view']);
    expect(labels(a)).toEqual(['Tell us more', 'View']);
    expect(a[0].primary).toBe(true);
    expect(a[0].tagCta).toBe(true); // drives the Wint-blue button styling
    expect(a[0].done).toBe(false);
  });

  /* RELABELLED 2026-11-02: 'Tell us more' replaces 'Tag the cause'. This
     breaks no specification — src/utils/pushText.js:258 records that the old
     label was a "mockup convention - not part of the V11 push body text
     itself". The KEY is deliberately unchanged at 'tag', because
     PushNotifications.jsx dispatches on it and it is what opens the tag leak
     flow; the assertion below is here so a future relabel cannot take the key
     with it. */
  it("the tag CTA is relabelled, NOT re-keyed — key stays 'tag'", () => {
    const a = buildActions({ type: 'leak', state: 'End of Leak' }, { tagged: false });
    expect(a[0].key).toBe('tag');
    expect(labels(a)).not.toContain('Tag the cause');
  });

  it('End of Leak (tagged): first button shows "✓ Tagged" done state, View stays second', () => {
    const a = buildActions({ type: 'leak', state: 'End of Leak' }, { investigating: false, ignored: false, tagged: true });
    expect(keys(a)).toEqual(['tag', 'view']);
    expect(a[0].label).toBe('✓ Tagged');
    expect(a[0].done).toBe(true);
    expect(a[0].primary).toBe(false);
    expect(a[0].tagCta).toBeFalsy();
    // Tagging spends the tag CTA; it does not spend the way into the app.
    expect(a[1]).toEqual({ key: 'view', label: 'View' });
  });

  it('End of Leak keeps BOTH buttons in every flag combination', () => {
    // Including ignored — see the ignored block below for why that is not an
    // oversight. The owner answered the question directly: End of Leak shows
    // both.
    for (const investigating of [false, true]) {
      for (const ignored of [false, true]) {
        for (const tagged of [false, true]) {
          const a = buildActions({ type: 'leak', state: 'End of Leak' }, { investigating, ignored, tagged });
          expect(keys(a)).toEqual(['tag', 'view']);
        }
      }
    }
  });

  /* WAS "Any state + ignored: NO actions". DELETED AND INVERTED 2026-11-02.
     The empty set was a consequence of striking View on 2026-11-01 — an
     ignored card collapsed to View alone, so with View gone it collapsed to
     nothing. View is back on every push without exception, so an ignored card
     now carries it like any other. The "Ignored · X" pill still carries the
     state; it is the actions that no longer vanish. */
  it('ignored === true: View, NOT an empty set', () => {
    const states = ['Warning', 'Ongoing', 'Shutoff', 'Future-state'];
    states.forEach(state => {
      const a = buildActions({ type: 'leak', state }, { investigating: false, ignored: true, tagged: false });
      expect(keys(a), `ignored ${state}`).toEqual(VIEW_ONLY);
    });
    // And on a non-leak type, where it was doubly empty before.
    expect(keys(buildActions({ type: 'offline' }, { investigating: false, ignored: true, tagged: false }))).toEqual(VIEW_ONLY);
  });

  it('the ignored flag no longer changes ANY set', () => {
    const states = ['Warning', 'Ongoing', 'Shutoff', 'End of Leak', 'Future-state'];
    states.forEach(state => {
      const off = buildActions({ type: 'leak', state }, { investigating: false, ignored: false, tagged: false });
      const on  = buildActions({ type: 'leak', state }, { investigating: false, ignored: true,  tagged: false });
      expect(keys(on)).toEqual(keys(off));
    });
  });

  /* WAS "non-leak notification type: no actions". DELETED AND INVERTED
     2026-11-02. "any push notification" is the owner's own phrase and it has
     no type carve-out: a valve error, a power loss and an offline device each
     offer View now. This also closes the OPEN QUESTION the old table recorded
     — faults were empty as a side effect of the type short-circuit, never by
     anyone's decision. They are no longer empty. */
  it('every non-leak type gets exactly [view], where it previously got []', () => {
    const types = ['valve-error', 'valve-error-cleared', 'power-lost', 'power-restored',
                   'offline', 'online', 'valve-closed-by-user', 'meter-disconnected'];
    types.forEach(type => {
      const a = buildActions({ type }, { investigating: false, ignored: false, tagged: false });
      expect(keys(a), type).toEqual(VIEW_ONLY);
      expect(labels(a), type).toEqual(['View']);
    });
  });

  it('a non-leak type never gets the tag CTA, however tagged reads', () => {
    // 'End of Leak' is meaningless off a leak; the state guard is on the TYPE
    // as well as the state, and this pins that it stays that way.
    const a = buildActions({ type: 'offline', state: 'End of Leak' }, { tagged: false });
    expect(keys(a)).toEqual(VIEW_ONLY);
  });

  /* WAS "unknown leak state defaults to no actions". DELETED AND INVERTED
     2026-11-02. The default branch being empty is exactly what would have let
     a future state ship with no way into the app; now it is the branch that
     delivers the guarantee. */
  it('an unknown state still yields [view] — the default branch is no longer empty', () => {
    for (const state of ['Future-state', 'ShutOff', '', undefined, null]) {
      const a = buildActions({ type: 'leak', state }, { investigating: false, ignored: false, tagged: false });
      expect(keys(a), `state=${String(state)}`).toEqual(VIEW_ONLY);
    }
  });
});

/* THE WHOLE TABLE. The individual cases above each pin one cell; this pins the
   GRID, so a future change to one state cannot quietly empty another the way
   striking View emptied three at once on 2026-11-01. Every cell is spelled
   out. Since 2026-11-02 there are no deliberately-empty cells left to be
   explicit about: NO cell is empty, which is itself the thing to guard. */
describe('the full state x flag table', () => {
  const EOL = ['tag', 'view'];
  const TABLE = [
    // [ type,        state,         investigating, ignored, expected keys ]
    ['leak',  'Warning',      false, false, VIEW_ONLY],
    ['leak',  'Warning',      true,  false, VIEW_ONLY],
    ['leak',  'Ongoing',      false, false, VIEW_ONLY],
    ['leak',  'Ongoing',      true,  false, VIEW_ONLY],
    ['leak',  'Shutoff',      false, false, VIEW_ONLY],
    ['leak',  'Shutoff',      true,  false, VIEW_ONLY],
    // End of Leak is the only two-button cell in the grid, in both claim states.
    ['leak',  'End of Leak',  false, false, EOL],
    ['leak',  'End of Leak',  true,  false, EOL],
    // Ignored no longer collapses anything. It used to empty every leak state.
    ['leak',  'Warning',      false, true,  VIEW_ONLY],
    ['leak',  'Ongoing',      false, true,  VIEW_ONLY],
    ['leak',  'Ongoing',      true,  true,  VIEW_ONLY],
    ['leak',  'Shutoff',      false, true,  VIEW_ONLY],
    ['leak',  'End of Leak',  false, true,  EOL],
    // An unknown future state falls through to View rather than to nothing -
    // and 'ShutOff', capital O, is exactly that case (pushPayload.js documents
    // the casing trap). It used to land on an empty row; now the trap is
    // survivable, because the fall-through still offers a way in.
    ['leak',  'ShutOff',      false, false, VIEW_ONLY],
    ['leak',  'Future-state', false, false, VIEW_ONLY],
    // Faults. The OPEN QUESTION recorded here on 2026-11-01 - whether an empty
    // fault row was a decision or a side effect - is settled: the owner's "any
    // push notification" covers them, so they carry View. Whether a fault
    // should ALSO offer the claim action is moot now that claiming is off the
    // push entirely.
    ['power-lost',           null, false, false, VIEW_ONLY],
    ['offline',              null, false, false, VIEW_ONLY],
    ['valve-error',          null, false, false, VIEW_ONLY],
    ['valve-closed-by-user', null, false, false, VIEW_ONLY],
  ];

  it.each(TABLE)('%s / %s / investigating=%s ignored=%s', (type, state, investigating, ignored, expected) => {
    const a = buildActions({ type, state }, { investigating, ignored, tagged: false });
    expect(keys(a)).toEqual(expected);
    // No set anywhere in the table exceeds two, and no label is ever blank.
    expect(a.length).toBeLessThanOrEqual(2);
    a.forEach(x => expect(x.label).toBeTruthy());
  });

  it('NO cell in the table is empty — every push offers at least View', () => {
    // The owner's "any push notification" stated as one assertion. This is the
    // inverse of what this file pinned on 2026-11-01, deliberately.
    for (const [type, state, investigating, ignored] of TABLE) {
      for (const tagged of [false, true]) {
        const a = buildActions({ type, state }, { investigating, ignored, tagged });
        expect(a.length, `empty set on ${type}/${state}`).toBeGreaterThan(0);
        expect(a.find(x => x.key === 'view'), `no view on ${type}/${state}`).toBeTruthy();
      }
    }
  });

  it('every non-empty set is drawn from the existing vocabulary only', () => {
    // The guard against a future hole being filled with INVENTED copy: no
    // label may appear on a push that is not already one of these three.
    // Narrowed 2026-11-02 — 'Assign to me' and 'Ignore' left the push, and
    // 'Tag the cause' became 'Tell us more'.
    const ALLOWED = new Set(['Tell us more', '✓ Tagged', 'View']);
    for (const [type, state, investigating, ignored] of TABLE) {
      for (const tagged of [false, true]) {
        const a = buildActions({ type, state }, { investigating, ignored, tagged });
        a.forEach(x => expect(ALLOWED.has(x.label), `unexpected label "${x.label}" on ${type}/${state}`).toBe(true));
      }
    }
  });

  it('the whitelist is EXACTLY those three — no fourth label exists anywhere', () => {
    // Swept rather than spot-checked: collect every label the function can
    // emit across the whole input space and compare the SET.
    const seen = new Set();
    for (const type of ['leak', 'valve-error', 'power-lost', 'offline', 'online', 'meter-disconnected']) {
      for (const state of ['Warning', 'Ongoing', 'Shutoff', 'End of Leak', 'ShutOff', 'Future-state', undefined]) {
        for (const investigating of [false, true]) {
          for (const ignored of [false, true]) {
            for (const tagged of [false, true]) {
              buildActions({ type, state }, { investigating, ignored, tagged }).forEach(x => seen.add(x.label));
            }
          }
        }
      }
    }
    expect([...seen].sort()).toEqual(['Tell us more', 'View', '✓ Tagged'].sort());
  });
});

describe('the struck actions are NEVER returned (owner, 2026-11-02)', () => {
  /* The assertion that stops the vocabulary drifting back. It sweeps every
     type × state × flag combination rather than spot-checking, because
     'investigate' and 'ignore' were the whole push vocabulary yesterday and a
     partial revert would be easy to miss.

     REPLACES the 2026-11-01 "the View BUTTON is never returned" block and the
     separate "Dismiss action is NEVER returned" block, both deleted: the first
     pinned the behaviour the owner has just reversed (View is a button again),
     and the second is subsumed here, since 'dismiss' is one of the three keys
     swept below. Dismiss has never been offered and still is not — swipe-to-
     dismiss is native on iOS and Android. */
  const STRUCK_KEYS = ['investigate', 'ignore', 'dismiss'];
  const STRUCK_LABELS = ['Assign to me', 'Ignore', 'Dismiss', 'On it', 'Claim alert'];
  const TYPES = ['leak', 'valve-error', 'power-lost', 'offline', 'valve-closed-by-user', 'meter-disconnected'];
  const LEAK_STATES = ['Warning', 'Ongoing', 'Shutoff', 'End of Leak', 'ShutOff', 'Future-state'];
  const FLAGS = [false, true];

  it.each(TYPES)('type %s never offers investigate / ignore / dismiss in any state', (type) => {
    for (const state of LEAK_STATES) {
      for (const investigating of FLAGS) {
        for (const ignored of FLAGS) {
          for (const tagged of FLAGS) {
            const a = buildActions({ type, state }, { investigating, ignored, tagged });
            STRUCK_KEYS.forEach(k =>
              expect(a.find(x => x.key === k), `${k} on ${type}/${state}`).toBeUndefined());
            STRUCK_LABELS.forEach(l =>
              expect(labels(a), `"${l}" on ${type}/${state}`).not.toContain(l));
          }
        }
      }
    }
  });

  it('never returns more than two actions (safe on iOS and Android alike)', () => {
    // Apple's HIG says up to four but UNNotificationCategory says at most two
    // when space is constrained; Android caps at three. Two is safe everywhere,
    // and End of Leak is now exactly at that ceiling.
    for (const type of TYPES) {
      for (const state of LEAK_STATES) {
        for (const investigating of FLAGS) {
          for (const ignored of FLAGS) {
            for (const tagged of FLAGS) {
              const a = buildActions({ type, state }, { investigating, ignored, tagged });
              expect(a.length).toBeLessThanOrEqual(2);
            }
          }
        }
      }
    }
  });

  it('no label is ever a raw key, and none is blank', () => {
    for (const type of TYPES) {
      for (const state of LEAK_STATES) {
        for (const tagged of FLAGS) {
          buildActions({ type, state }, { investigating: false, ignored: false, tagged }).forEach(x => {
            expect(x.label).toBeTruthy();
            expect(x.label).not.toBe(x.key);
          });
        }
      }
    }
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
    const tag = a.find(x => x.key === 'tag');
    expect(tag).toBeTruthy();
    expect(tag.primary).toBe(true);
    expect(tag.tagCta).toBe(true);
  });
});

describe('the View action object itself', () => {
  it("is exactly { key: 'view', label: 'View' } — no primary, no tagCta", () => {
    // It is the plain secondary button on every surface, including the
    // lock-screen card it now appears on for the first time (owner, 2026-11-02).
    // If it ever acquired `primary`, it would fight the tag CTA on End of Leak.
    const plain = buildActions({ type: 'leak', state: 'Warning' }, {})[0];
    expect(plain).toEqual({ key: 'view', label: 'View' });
    const onEol = buildActions({ type: 'leak', state: 'End of Leak' }, {})[1];
    expect(onEol).toEqual({ key: 'view', label: 'View' });
  });

  it('each call returns a fresh object — a mutated action cannot poison the next card', () => {
    const a = buildActions({ type: 'leak', state: 'Warning' }, {});
    a[0].label = 'MUTATED';
    const b = buildActions({ type: 'leak', state: 'Warning' }, {});
    expect(b[0].label).toBe('View');
  });
});
