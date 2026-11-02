// @vitest-environment happy-dom
//
// Renders the actual InAppBanner component for various notification states
// and asserts what's visible in the DOM: action buttons, "On it · X" pill,
// "Ignored · X" pill, "✓ Tagged" state on Tag CTA, etc.
//
// PushNotifications.jsx wraps InAppBanner privately, so we render the
// whole PushNotifications component with a manually injected banner state.
// Easiest path: render the buildActions output directly via NotifActions.

import { describe, it, expect, beforeEach } from 'vitest';
// `render` / `screen` / MemoryRouter were imported here but never used — the
// suite drives buildActions directly, as the note above says. Dropped
// 2026-11-02 so this file lints clean; bring them back with the first test
// that actually mounts a card.
import { cleanup } from '@testing-library/react';
import { buildActions } from '../utils/notificationActions';
import { ignoreIncident, isIgnored, clearIgnored } from '../data/ignoredIncidents';
import { startInvestigating, isInvestigating, stopInvestigating } from '../data/investigatingStore';
import { addFeedback, hasTagFeedback, tagEventKey } from '../data/eventFeedbackStore';
import { APT_WITH_EVENT } from './fixtures';

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

// Helper that runs buildActions with the persisted state for a given system.
//
// This MIRRORS NotifActions in PushNotifications.jsx and must keep mirroring
// it. `tagged` in particular reads eventFeedbackStore via hasTagFeedback(),
// because the push's Tag CTA opens WaterEventFeedbackSheet, which persists
// there — not to tagsStore, which only v1 surfaces still write.
//
// `investigating` and `ignored` are still read from their stores and still
// passed, exactly as PushNotifications.jsx does. Since 2026-11-02 neither one
// selects anything — the mirror is kept faithful on purpose, and the tests
// below assert that the persisted state no longer moves the action set.
function buildFor(n, sysId) {
  return buildActions(n, {
    investigating: isInvestigating(sysId),
    ignored: isIgnored(sysId),
    tagged: hasTagFeedback(sysId),
  });
}

// What SystemPageV2Screen's tag path does when the sheet commits: one record
// under the namespaced tag key. Going through the real store (not a hand-rolled
// localStorage poke) is the point — it pins the write and the read together.
function completeTagFeedback(sysId, answer = 'yes') {
  return addFeedback(tagEventKey(sysId), {
    trigger: 'event-ended',
    answer,
    chips: ['irrigation'],
    systemId: sysId,
  });
}

describe('action set reflects persisted state per system', () => {
  const SYS = APT_WITH_EVENT;
  const N_WARNING = { type: 'leak', state: 'Warning', systemId: SYS };
  const N_END_OF_LEAK = { type: 'leak', state: 'End of Leak', systemId: SYS };

  /* TWO CTAs ONLY (owner, 2026-11-02): "the only CTAs i want to have is 2 —
     Tel us more, when water event is ended ... and to any push notification
     View button". Assign to me and Ignore left the push; View came back as a
     button on every push, on every surface including the lock card.

     Of the persisted state this block was written to track, only `tagged`
     still moves anything. The claim and ignore records are still written, still
     read and still drive their pills — they just no longer change the buttons.
     Both are asserted below rather than dropped, because "the store write is
     still happening and is deliberately inert" is the part a future reader
     would otherwise have to guess at.

     DELETED 2026-11-02:
       — "after claiming: the claim button is hidden on next render". There is
         no claim button on the push to hide; the owner removed it. Claiming
         itself is untested here and untouched — it lives on EventFocusOverlay,
         SystemPageV2Screen and the Water Event card, with its own tests.
       — "after Ignore: the action set is EMPTY, not a lone orphaned button"
         and "after Ignore + Investigating: still empty (ignore wins)". The
         empty set was a consequence of striking View on 2026-11-01. View is
         universal again, so an ignored card carries it like any other; the
         inverted assertions are below. */

  it('fresh Warning: View alone', () => {
    const a = buildFor(N_WARNING, SYS);
    expect(a.map(x => x.key)).toEqual(['view']);
    expect(a.map(x => x.label)).toEqual(['View']);
  });

  it('after claiming: the set is unchanged — the claim record is inert here', () => {
    startInvestigating(SYS, { actor: 'Sarah' });
    expect(isInvestigating(SYS)).toBe(true); // the write still happened
    const a = buildFor(N_WARNING, SYS);
    expect(a.map(x => x.key)).toEqual(['view']);
  });

  it('after Ignore: View, NOT an empty set', () => {
    // Inverted 2026-11-02. The "Ignored · X" pill is still what says the card
    // was ignored; the action row no longer vanishes with it, and the body tap
    // is still a second way back in alongside the button.
    ignoreIncident(SYS, { ignoredBy: 'Sarah' });
    expect(isIgnored(SYS)).toBe(true); // the write still happened
    const a = buildFor(N_WARNING, SYS);
    expect(a.map(x => x.key)).toEqual(['view']);
  });

  it('after Ignore + Investigating: still View — neither flag is read any more', () => {
    startInvestigating(SYS, { actor: 'Sarah' });
    ignoreIncident(SYS, { ignoredBy: 'Sarah' });
    const a = buildFor(N_WARNING, SYS);
    expect(a.map(x => x.key)).toEqual(['view']);
  });

  it('clearing the records does not change the set either', () => {
    // The symmetric half: the set was never tracking them, so it does not move
    // when they are cleared. Keeps clearIgnored / stopInvestigating exercised.
    ignoreIncident(SYS, { ignoredBy: 'Sarah' });
    startInvestigating(SYS, { actor: 'Sarah' });
    const during = buildFor(N_WARNING, SYS).map(x => x.key);
    clearIgnored(SYS);
    stopInvestigating(SYS);
    expect(isIgnored(SYS)).toBe(false);
    expect(isInvestigating(SYS)).toBe(false);
    expect(buildFor(N_WARNING, SYS).map(x => x.key)).toEqual(during);
  });

  it('End of Leak untagged: Tell us more primary CTA, then View', () => {
    const a = buildFor(N_END_OF_LEAK, SYS);
    expect(a.map(x => x.key)).toEqual(['tag', 'view']);
    expect(a[0].label).toBe('Tell us more');
    expect(a[0].tagCta).toBe(true);
    expect(a[1].label).toBe('View');
  });

  // REGRESSION PIN (2026-10-17). ?action=tag was repointed from TagBottomSheet
  // (tagsStore) to WaterEventFeedbackSheet (eventFeedbackStore). The done-state
  // must follow the store the flow actually writes, or the push offers "Tell us
  // more" forever however many times the user answers it. (The label in that
  // sentence changed on 2026-11-02; the trap it describes did not.)
  it('End of Leak after a completed feedback answer: shows ✓ Tagged done state', () => {
    expect(completeTagFeedback(SYS)).not.toBeNull();
    const a = buildFor(N_END_OF_LEAK, SYS);
    expect(a[0].label).toBe('✓ Tagged');
    expect(a[0].done).toBe(true);
    expect(a[0].tagCta).toBeFalsy();
    // Tagging spends the tag CTA; View is untouched by it.
    expect(a[1]).toEqual({ key: 'view', label: 'View' });
  });

  // The done-state reads the SAME key SystemPageV2Screen writes under.
  it('tag feedback is keyed `<systemId>:event-ended`, as the v2 page writes it', () => {
    completeTagFeedback(SYS);
    const raw = JSON.parse(localStorage.getItem('pulse2-event-feedback'));
    expect(Object.keys(raw)).toEqual([`${SYS}:event-ended`]);
    expect(tagEventKey(SYS)).toBe(`${SYS}:event-ended`);
  });

  // And NOT the bare system id, which is the ignore flow's key. An ignore must
  // never dress the push up as tagged.
  it('an Ignore-path answer does not flip the Tag CTA to its done state', () => {
    addFeedback(SYS, { trigger: 'ignore', answer: 'no', systemId: SYS });
    expect(hasTagFeedback(SYS)).toBe(false);
    const a = buildActions(N_END_OF_LEAK, { tagged: hasTagFeedback(SYS), ignored: false });
    expect(a[0].label).toBe('Tell us more');
  });

  it('a non-leak push for the same system also carries View', () => {
    // "any push notification" (owner, 2026-11-02) — the fault types used to
    // get an empty row because buildActions short-circuited on type.
    ['valve-error', 'power-lost', 'offline'].forEach(type => {
      const a = buildFor({ type, systemId: SYS }, SYS);
      expect(a.map(x => x.key), type).toEqual(['view']);
    });
  });
});

// The action set logic is fully covered by the buildActions tests above.
// DOM rendering of the buttons is mechanical - if buildActions returns the
// right shape and each action's label is non-empty, the rendered buttons
// are correct.

describe('action labels are user-readable (never internal keys)', () => {
  const SYS = APT_WITH_EVENT;

  /* DELETED 2026-11-02 — the "Warning labels are exactly Assign to me, Ignore"
     and "Ongoing labels are exactly Assign to me, Ignore" cases. Both pinned
     the vocabulary the owner has just removed from the push. Their other job,
     asserting that a label is never a raw key, is kept below and widened to
     every state. Their third job — "the struck button cannot come back under
     its old label", written about View — is now false by instruction: View is
     a button again, deliberately. */

  it('every state labels its buttons in words, never with the dispatch key', () => {
    const states = ['Warning', 'Ongoing', 'Shutoff', 'End of Leak', 'Future-state'];
    states.forEach(state => {
      [false, true].forEach(tagged => {
        const a = buildActions({ type: 'leak', state, systemId: SYS }, { tagged });
        a.forEach(x => {
          expect(x.label, `${state} label`).toBeTruthy();
          expect(x.label).not.toBe(x.key);
        });
      });
    });
  });

  it('Warning label is exactly View', () => {
    const a = buildActions({ type: 'leak', state: 'Warning', systemId: SYS }, { investigating: false, ignored: false, tagged: false });
    expect(a.map(x => x.label)).toEqual(['View']);
  });

  it('Ongoing label is exactly View', () => {
    // Was "Assign to me, Ignore" between 2026-11-01 and 2026-11-02, and before
    // that "no labels, because it has no actions". Third contract in three
    // days; the comment stays so the sequence is legible.
    const a = buildActions({ type: 'leak', state: 'Ongoing', systemId: SYS }, {});
    expect(a.map(x => x.label)).toEqual(['View']);
  });

  it('End of Leak labels are exactly Tell us more (or ✓ Tagged), then View', () => {
    const a1 = buildActions({ type: 'leak', state: 'End of Leak', systemId: SYS }, { tagged: false });
    expect(a1.map(x => x.label)).toEqual(['Tell us more', 'View']);
    const a2 = buildActions({ type: 'leak', state: 'End of Leak', systemId: SYS }, { tagged: true });
    expect(a2.map(x => x.label)).toEqual(['✓ Tagged', 'View']);
  });
});
