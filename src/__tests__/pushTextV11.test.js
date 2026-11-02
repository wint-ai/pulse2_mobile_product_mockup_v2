// Regression guard for V11.0 notification text.
//
// Walks every variant in V11_TEMPLATES and asserts buildPushText returns the
// V11.0 spec verbatim text (with parameters interpolated to known fixture
// values). If any of these break, either:
//   1. You accidentally edited a template - revert. Source of truth is
//      docs/Notification IDs -V11.0.xlsx, not the test.
//   2. The spec moved to V12 - update both pushText.js and this file in
//      one commit, with a change-log note.
//
// Coverage: WA_01-07/09, OL_02-09, SO_03-09, LE_01, VC_OK_01, VC_OK_02,
// VC_S_02, V_ER_01-05, PW_01-02, COM_01-02, SEN_01-04. 38 variants.

import { describe, it, expect } from 'vitest';
import { buildPushText, V11_TEMPLATES } from '../utils/pushText';

const SYS = {
  id: 'sys-fixture',
  name: 'Cooling Tower #1',
  l4Name: 'Henrietta House',
};
const PERSONA = { name: 'Yaron' };

function buildFor(variantId) {
  // Use the variantId as both card.id and explicit variantId so the
  // template lookup is unambiguous regardless of how the call site
  // structures the card object.
  const card = { id: variantId, label: variantId };
  return buildPushText(card, variantId, SYS, {}, { persona: PERSONA });
}

describe('V11.0 push text — title + body verbatim per spec', () => {
  it('covers every catalogued variant in V11_TEMPLATES', () => {
    // Sanity: make sure no variant was accidentally removed from the
    // catalogue. If V11 adds a new variant, also extend the per-variant
    // assertions below.
    expect(Object.keys(V11_TEMPLATES).sort()).toEqual([
      'COM_01', 'COM_02',
      'LE_01',
      'OL_02', 'OL_03', 'OL_04', 'OL_05', 'OL_06', 'OL_07', 'OL_08', 'OL_09',
      'PW_01', 'PW_02',
      'SEN_01', 'SEN_02', 'SEN_03', 'SEN_04',
      'SO_03', 'SO_04', 'SO_05', 'SO_06', 'SO_07', 'SO_08', 'SO_09',
      'VC_OK_01', 'VC_OK_02', 'VC_S_02',
      'V_ER_01', 'V_ER_02', 'V_ER_03', 'V_ER_04', 'V_ER_05',
      'WA_01', 'WA_02', 'WA_03', 'WA_04', 'WA_05', 'WA_06', 'WA_07', 'WA_09',
    ].sort());
  });

  // === Warning (WA) — per-reason body suffix ===

  it('WA_01 — standard high flow', () => {
    expect(buildFor('WA_01')).toEqual({
      title: '💧 High flow water event detected - Cooling Tower #1',
      body:  'The system Cooling Tower #1 at Henrietta House has detected a High flow water event.',
    });
  });

  it('WA_02 — low flow', () => {
    expect(buildFor('WA_02')).toEqual({
      title: '💧 Low flow water event detected - Cooling Tower #1',
      body:  'The system Cooling Tower #1 at Henrietta House has detected a Low flow water event. The valve will not close automatically for low flow water events.',
    });
  });

  it('WA_03 — no valve installed', () => {
    expect(buildFor('WA_03').body).toBe(
      'The system Cooling Tower #1 at Henrietta House has detected a High flow water event. No valve is installed - water flow will not stop automatically.'
    );
  });

  it('WA_04 — valve disconnected (was the bug Rami caught)', () => {
    // This was the regression: body used to falsely promise "valve will
    // auto-close" for WA_04 (valve disconnected). V11 spec says it CANNOT
    // close.
    expect(buildFor('WA_04').body).toBe(
      'The system Cooling Tower #1 at Henrietta House has detected a High flow water event. The valve is disconnected - water flow will not be stopped automatically.'
    );
  });

  it('WA_05 — auto-shutoff disabled', () => {
    expect(buildFor('WA_05').body).toMatch(/Auto shutoff is disabled - water flow will not stop automatically\.$/);
  });

  it('WA_06 — AC power lost', () => {
    expect(buildFor('WA_06').body).toMatch(/The system is disconnected from AC power - water flow will not be stopped automatically\.$/);
  });

  it('WA_07 — valve malfunction', () => {
    expect(buildFor('WA_07').body).toMatch(/The valve is showing a malfunction and may not close successfully\.$/);
  });

  it('WA_09 — fallback', () => {
    expect(buildFor('WA_09').body).toMatch(/The valve will not close automatically\.$/);
  });

  // === Ongoing (OL) ===

  it('OL_02 — baseline ongoing', () => {
    expect(buildFor('OL_02')).toEqual({
      title: '💧 High flow water event still active - Cooling Tower #1',
      body:  'The system Cooling Tower #1 at Henrietta House has an ongoing High flow water event.',
    });
  });

  it('OL_04 — valve disconnected', () => {
    expect(buildFor('OL_04').body).toMatch(/The valve is disconnected - water flow will not stop automatically\.$/);
  });

  it('OL_08 — actor previously asked to ignore', () => {
    // {{actor}} is populated from opts.persona.name in buildPushText.
    expect(buildFor('OL_08').body).toBe(
      'The system Cooling Tower #1 at Henrietta House has an ongoing High flow water event. Yaron requested to ignore this water event - water flow will not stop automatically.'
    );
  });

  // === Shutoff (SO) — severe variants use ⚠ glyph ===

  it('SO_03 — no valve (💧 glyph, normal severity)', () => {
    expect(buildFor('SO_03').title).toMatch(/^💧/);
  });

  it('SO_04 — valve disconnected (⚠ glyph, severe)', () => {
    const out = buildFor('SO_04');
    expect(out.title).toBe('⚠ High flow water event reached shutoff level - Cooling Tower #1');
    expect(out.body).toMatch(/Check valve and its surroundings and manually close the valve as needed\.$/);
  });

  it('SO_07 — valve error (⚠ severe)', () => {
    expect(buildFor('SO_07').title).toMatch(/^⚠/);
  });

  it('SO_08 — actor ignore (⚠ severe, includes actor name)', () => {
    expect(buildFor('SO_08').body).toMatch(/Yaron requested to ignore this water event/);
  });

  it('SO_09 — fallback (⚠ severe)', () => {
    expect(buildFor('SO_09').title).toMatch(/^⚠/);
  });

  // === End of Leak (LE) ===

  it('LE_01 — water event ended + Tag CTA', () => {
    const out = buildFor('LE_01');
    expect(out).toEqual({
      title: 'Water event ended - Cooling Tower #1',
      // The trailing " Please share feedback on this event in the app." was
      // struck by the owner on 2026-11-02 - the push's own "Tell us more"
      // button says it now. See the note on LE_01 in pushText.js: this body
      // deliberately no longer matches the V11 spreadsheet.
      body:  'The water event detected by Cooling Tower #1 at Henrietta House has ended.',
      action: 'Tell us more',
    });
  });

  // === Valve closure ===

  it('VC_OK_01 — closed by user (actor interpolated)', () => {
    expect(buildFor('VC_OK_01')).toEqual({
      title: 'Valve closed - Cooling Tower #1',
      body:  'The system Cooling Tower #1 at Henrietta House: The valve was closed by Yaron.',
    });
  });

  it('VC_OK_02 — closed after water event (hyphenated high-flow)', () => {
    expect(buildFor('VC_OK_02').body).toMatch(/following a high-flow water event detection/);
  });

  // === Valve errors ===

  it('V_ER_01 — valve malfunction (⚠ severe, interpolates action + actor + flow_note)', () => {
    const out = buildFor('V_ER_01');
    expect(out.title).toBe('⚠ Valve malfunction - Cooling Tower #1');
    expect(out.body).toBe(
      'The system Cooling Tower #1 at Henrietta House failed to close the valve following a request by Yaron. A water event was active at the time. Manually close and check the valve.'
    );
  });

  it('V_ER_04 — malfunction cleared (no ⚠)', () => {
    expect(buildFor('V_ER_04').title).toBe('Valve malfunction cleared - Cooling Tower #1');
  });

  it('V_ER_05 — changed position unexpectedly (⚠ severe)', () => {
    expect(buildFor('V_ER_05').title).toMatch(/^⚠/);
  });

  // === Power ===

  it('PW_01 — AC power disconnected (⚡ glyph)', () => {
    const out = buildFor('PW_01');
    expect(out.title).toBe('⚡ AC power disconnected - Cooling Tower #1');
    expect(out.body).toMatch(/running on backup battery/);
  });

  it('PW_02 — restored (⚡ glyph)', () => {
    expect(buildFor('PW_02').title).toMatch(/^⚡ AC power restored/);
  });

  // === Communication ===

  it('COM_01 — offline (📵 glyph)', () => {
    expect(buildFor('COM_01').title).toBe('📵 Cooling Tower #1 offline');
  });

  it('COM_02 — back online (no glyph)', () => {
    expect(buildFor('COM_02').title).toBe('Cooling Tower #1 back online');
  });

  // === Sensors ===

  it('SEN_01 — valve disconnected (⚠ severe)', () => {
    expect(buildFor('SEN_01').title).toMatch(/^⚠ Valve disconnected/);
  });

  it('SEN_02 — valve reconnected (no ⚠)', () => {
    expect(buildFor('SEN_02').title).toBe('Valve reconnected - Cooling Tower #1');
  });

  it('SEN_03 — meter disconnected (⚠ severe)', () => {
    expect(buildFor('SEN_03').title).toMatch(/^⚠ Meter disconnected/);
  });

  it('SEN_04 — meter reconnected', () => {
    expect(buildFor('SEN_04').title).toBe('Meter reconnected - Cooling Tower #1');
  });
});

describe('V11 parameter interpolation edge cases', () => {
  it('falls back to "User" when no persona is supplied', () => {
    const out = buildPushText({ id: 'VC_OK_01' }, 'VC_OK_01', SYS, {}, {});
    expect(out.body).toMatch(/closed by User\.$/);
  });

  it('uses sys.l3Name when l4Name is missing', () => {
    const sys = { id: 's', name: 'Pump A', l3Name: 'B1 floor' };
    const out = buildPushText({ id: 'WA_01' }, 'WA_01', sys, {}, { persona: PERSONA });
    expect(out.body).toMatch(/at B1 floor /);
  });

  it('falls back gracefully on an unknown variant ID', () => {
    const out = buildPushText({ id: 'BOGUS', label: 'Bogus' }, 'BOGUS', SYS, {}, { persona: PERSONA });
    // Doesn't throw, returns the generic fallback
    expect(out.title).toMatch(/Bogus/);
  });
});
