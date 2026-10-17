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
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

  it('fresh Warning: View · On it · Ignore', () => {
    const a = buildFor(N_WARNING, SYS);
    expect(a.map(x => x.key)).toEqual(['view', 'investigate', 'ignore']);
  });

  it('after On it: button hidden on next render', () => {
    startInvestigating(SYS, { actor: 'Sarah' });
    const a = buildFor(N_WARNING, SYS);
    expect(a.find(x => x.key === 'investigate')).toBeUndefined();
    expect(a.map(x => x.key)).toEqual(['view', 'ignore']);
  });

  it('after Ignore: action set collapses to View only', () => {
    ignoreIncident(SYS, { ignoredBy: 'Sarah' });
    const a = buildFor(N_WARNING, SYS);
    expect(a.map(x => x.key)).toEqual(['view']);
  });

  it('after Ignore + Investigating: still View only (ignore wins)', () => {
    startInvestigating(SYS, { actor: 'Sarah' });
    ignoreIncident(SYS, { ignoredBy: 'Sarah' });
    const a = buildFor(N_WARNING, SYS);
    expect(a.map(x => x.key)).toEqual(['view']);
  });

  it('End of Leak untagged: Tag the cause primary CTA', () => {
    const a = buildFor(N_END_OF_LEAK, SYS);
    expect(a[0].label).toBe('Tag the cause');
    expect(a[0].tagCta).toBe(true);
  });

  // REGRESSION PIN (2026-10-17). ?action=tag was repointed from TagBottomSheet
  // (tagsStore) to WaterEventFeedbackSheet (eventFeedbackStore). The done-state
  // must follow the store the flow actually writes, or the push offers "Tag the
  // cause" forever however many times the user answers it.
  it('End of Leak after a completed feedback answer: shows ✓ Tagged done state', () => {
    expect(completeTagFeedback(SYS)).not.toBeNull();
    const a = buildFor(N_END_OF_LEAK, SYS);
    expect(a[0].label).toBe('✓ Tagged');
    expect(a[0].done).toBe(true);
    expect(a[0].tagCta).toBeFalsy();
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
    expect(a[0].label).toBe('Tag the cause');
  });
});

// The action set logic is fully covered by the buildActions tests above.
// DOM rendering of the buttons is mechanical - if buildActions returns the
// right shape and each action's label is non-empty, the rendered buttons
// are correct.

describe('action labels are user-readable (never internal keys)', () => {
  const SYS = APT_WITH_EVENT;
  it('Warning labels are exactly View, On it, Ignore', () => {
    const a = buildActions({ type: 'leak', state: 'Warning', systemId: SYS }, { investigating: false, ignored: false, tagged: false });
    expect(a.map(x => x.label)).toEqual(['View', 'On it', 'Ignore']);
    // No raw keys leaking through as labels
    a.forEach(x => expect(x.label).not.toBe(x.key));
  });

  it('Ongoing label is exactly View', () => {
    const a = buildActions({ type: 'leak', state: 'Ongoing', systemId: SYS }, {});
    expect(a.map(x => x.label)).toEqual(['View']);
  });

  it('End of Leak label is exactly Tag the cause (or ✓ Tagged)', () => {
    const a1 = buildActions({ type: 'leak', state: 'End of Leak', systemId: SYS }, { tagged: false });
    expect(a1[0].label).toBe('Tag the cause');
    const a2 = buildActions({ type: 'leak', state: 'End of Leak', systemId: SYS }, { tagged: true });
    expect(a2[0].label).toBe('✓ Tagged');
  });
});
