// V11.0 push notification text builder.
//
// Source of truth: docs/Notification IDs -V11.0.xlsx. Every title + body
// below is copied byte-for-byte from the spec. DO NOT paraphrase or "fix"
// these strings - if copy looks wrong, fix it in the spreadsheet and
// re-extract.
//
// ONE DOCUMENTED EXCEPTION, 2026-11-02: LE_01's body. The owner cut its final
// sentence on sight of the new push; see the note on LE_01 itself. It is the
// only string in this file that no longer matches the spreadsheet, and it is
// flagged there rather than here so a re-extract cannot silently restore it.
//
// Glyph conventions:
//   💧  Standard water event variants
//   ⚠   Severe / "manual intervention required" variants (SO_04, SO_06,
//        SO_07, SO_08, SO_09, SEN_01, SEN_03, V_ER_01-03, V_ER_05)
//        Uses U+26A0 (text presentation), NOT U+26A0 U+FE0F (emoji).
//   ⚡  Power
//   📵  Communication offline
//
// Placeholder list:
//   {{water_system_name}}  System short name (e.g. "Cooling Tower #1")
//   {{site_name}}          Site / location (e.g. "Henrietta House")
//   {{flow_rate}}          "High flow" or "Low flow" (categorical, NOT numeric)
//   {{actor}}              Person or policy that took an action
//   {{affected_entity}}    Same as water_system_name for power/comm cards
//   {{action}}             "open" / "close" - for V_ER_01
//   {{flow_note}}          Free-text contextual note - for V_ER_01/V_ER_02
//   {{new_state}}          "open" / "closed" - for V_ER_05
//   {{impact_scope}}       Free-text impact note - for PW_01

export const V11_TEMPLATES = {
  // === Water Event - Warning (WA_*) ===
  WA_01: {
    title: '💧 {{flow_rate}} water event detected - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} has detected a {{flow_rate}} water event.',
  },
  WA_02: {
    title: '💧 {{flow_rate}} water event detected - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} has detected a {{flow_rate}} water event. The valve will not close automatically for low flow water events.',
  },
  WA_03: {
    title: '💧 {{flow_rate}} water event detected - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} has detected a {{flow_rate}} water event. No valve is installed - water flow will not stop automatically.',
  },
  WA_04: {
    title: '💧 {{flow_rate}} water event detected - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} has detected a {{flow_rate}} water event. The valve is disconnected - water flow will not be stopped automatically.',
  },
  WA_05: {
    title: '💧 {{flow_rate}} water event detected - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} has detected a {{flow_rate}} water event. Auto shutoff is disabled - water flow will not stop automatically.',
  },
  WA_06: {
    title: '💧 {{flow_rate}} water event detected - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} has detected a {{flow_rate}} water event. The system is disconnected from AC power - water flow will not be stopped automatically.',
  },
  WA_07: {
    title: '💧 {{flow_rate}} water event detected - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} has detected a {{flow_rate}} water event. The valve is showing a malfunction and may not close successfully.',
  },
  WA_09: {
    title: '💧 {{flow_rate}} water event detected - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} has detected a {{flow_rate}} water event. The valve will not close automatically.',
  },

  // === Water Event - Ongoing (OL_*) ===
  OL_02: {
    title: '💧 {{flow_rate}} water event still active - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} has an ongoing {{flow_rate}} water event.',
  },
  OL_03: {
    title: '💧 {{flow_rate}} water event still active - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} has an ongoing {{flow_rate}} water event. This system has no valve - water flow will not stop automatically.',
  },
  OL_04: {
    title: '💧 {{flow_rate}} water event still active - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} has an ongoing {{flow_rate}} water event. The valve is disconnected - water flow will not stop automatically.',
  },
  OL_05: {
    title: '💧 {{flow_rate}} water event still active - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} has an ongoing {{flow_rate}} water event. Auto shutoff is disabled - water flow will not stop automatically.',
  },
  OL_06: {
    title: '💧 {{flow_rate}} water event still active - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} has an ongoing {{flow_rate}} water event. The system is disconnected from AC power - water flow will not stop automatically.',
  },
  OL_07: {
    title: '💧 {{flow_rate}} water event still active - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} has an ongoing {{flow_rate}} water event. The valve is showing a malfunction and may not close successfully.',
  },
  OL_08: {
    title: '💧 {{flow_rate}} water event still active - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} has an ongoing {{flow_rate}} water event. {{actor}} requested to ignore this water event - water flow will not stop automatically.',
  },
  OL_09: {
    title: '💧 {{flow_rate}} water event still active - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} has an ongoing {{flow_rate}} water event. The valve will not close automatically.',
  },

  // === Water Event - Shutoff (SO_*) ===
  SO_03: {
    title: '💧 {{flow_rate}} water event reached shutoff level - {{water_system_name}}',
    body:  'The water event in {{water_system_name}} at {{site_name}} has reached shutoff level. No valve is installed - water flow will not be stopped automatically.',
  },
  SO_04: {
    title: '⚠ {{flow_rate}} water event reached shutoff level - {{water_system_name}}',
    body:  'The water event in {{water_system_name}} at {{site_name}} has reached shutoff level. The valve is disconnected - water flow will not be stopped automatically. Check valve and its surroundings and manually close the valve as needed.',
  },
  SO_05: {
    title: '💧 {{flow_rate}} water event reached shutoff level - {{water_system_name}}',
    body:  'The water event in {{water_system_name}} at {{site_name}} has reached shutoff level. Auto shutoff is disabled - water flow will not stop automatically.',
  },
  SO_06: {
    title: '⚠ {{flow_rate}} water event reached shutoff level - {{water_system_name}}',
    body:  'The water event in {{water_system_name}} at {{site_name}} has reached shutoff level. The system is disconnected from AC power - water flow will not be stopped automatically. Check valve and its surroundings and manually close the valve as needed.',
  },
  SO_07: {
    title: '⚠ {{flow_rate}} water event reached shutoff level - {{water_system_name}}',
    body:  'The water event in {{water_system_name}} at {{site_name}} has reached shutoff level. The valve is showing a malfunction and may not close successfully. Check valve and its surroundings and manually close the valve as needed.',
  },
  SO_08: {
    title: '⚠ {{flow_rate}} water event reached shutoff level - {{water_system_name}}',
    body:  'The water event in {{water_system_name}} at {{site_name}} has reached shutoff level. {{actor}} requested to ignore this water event - water flow will not stop automatically. Check valve and its surroundings and manually close the valve as needed.',
  },
  SO_09: {
    title: '⚠ {{flow_rate}} water event reached shutoff level - {{water_system_name}}',
    body:  'The water event in {{water_system_name}} at {{site_name}} has reached shutoff level. The valve will not close automatically. Check valve and its surroundings and manually close the valve as needed.',
  },

  // === Water Event - Ended (LE_01) ===
  //
  // DIVERGES FROM V11 DELIBERATELY, 2026-11-02. The body ended with one more
  // sentence - " Please share feedback on this event in the app." - and the
  // owner struck it: "remove the pls share feedbak in the app".
  //
  // THIS IS NOT THE SAME KIND OF EDIT AS THE CTA RELABEL BELOW. That label is
  // a mockup convention this file invented. THIS sentence is V11 spec text out
  // of docs/Notification IDs -V11.0.xlsx, which the rest of this file is
  // copied from byte-for-byte - so the push body now knowingly departs from
  // the spreadsheet, on the owner's instruction, and the spreadsheet is the
  // thing that is now out of date.
  //
  // WHY IT GOES: it had become the same instruction twice. The sentence asked
  // the user to go and share feedback in the app; the push now carries a
  // "Tell us more" button directly beneath it that opens the tag flow and
  // does exactly that. The control replaced the request.
  LE_01: {
    title: 'Water event ended - {{water_system_name}}',
    body:  'The water event detected by {{water_system_name}} at {{site_name}} has ended.',
  },

  // === Valve closure (VC_*) ===
  VC_OK_01: {
    title: 'Valve closed - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}}: The valve was closed by {{actor}}.',
  },
  VC_OK_02: {
    title: 'Valve closed - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}}: The valve has closed following a high-flow water event detection. Please investigate the source of the water event before reopening the valve.',
  },
  // VC_S_02 isn't a customer push in V11 spec - it's a mockup-internal
  // sub-step of the Shutoff phase. We keep a sensible string for demo.
  VC_S_02: {
    title: 'Valve closing - {{water_system_name}}',
    body:  'Auto-shutoff is closing the valve on {{water_system_name}} at {{site_name}}.',
  },

  // === Valve errors (V_ER_*) ===
  V_ER_01: {
    title: '⚠ Valve malfunction - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} failed to {{action}} the valve following a request by {{actor}}. {{flow_note}}. Manually {{action}} and check the valve.',
  },
  V_ER_02: {
    title: '⚠ Valve closure failed after a water event - {{water_system_name}}',
    body:  'The system {{water_system_name}} at {{site_name}} failed to close the valve following water event detection. {{flow_note}}. Shut water off manually and check the valve.',
  },
  V_ER_03: {
    title: '⚠ Valve error - {{water_system_name}}',
    body:  '{{water_system_name}} at {{site_name}}: Water flow detected while valve is closed. Manually inspect and close the valve.',
  },
  V_ER_04: {
    title: 'Valve malfunction cleared - {{water_system_name}}',
    body:  '{{water_system_name}} at {{site_name}}: The previous valve malfunction has been resolved. Valve inspection is recommended to eliminate repeat issues.',
  },
  V_ER_05: {
    title: '⚠ Valve changed position unexpectedly - {{water_system_name}}',
    body:  '{{water_system_name}} at {{site_name}}: The valve is now {{new_state}} without a recorded command. Inspect the valve and its surroundings.',
  },

  // === Power (PW_*) ===
  PW_01: {
    title: '⚡ AC power disconnected - {{affected_entity}}',
    body:  '{{affected_entity}} at {{site_name}} is running on backup battery. {{impact_scope}} Reconnect to AC power to ensure continued operation.',
  },
  PW_02: {
    title: '⚡ AC power restored - {{affected_entity}}',
    body:  '{{affected_entity}} at {{site_name}} is back on AC power and operating normally.',
  },

  // === Communication (COM_*) ===
  COM_01: {
    title: '📵 {{affected_entity}} offline',
    body:  '{{affected_entity}} at {{site_name}} is not communicating. Check its power and connectivity.',
  },
  COM_02: {
    title: '{{affected_entity}} back online',
    body:  '{{affected_entity}} at {{site_name}} is back online.',
  },

  // === Sensors (SEN_*) ===
  SEN_01: {
    title: '⚠ Valve disconnected - {{water_system_name}}',
    body:  '{{water_system_name}} at {{site_name}}: the valve has disconnected from the VMA and can no longer operate. Check the valve.',
  },
  SEN_02: {
    title: 'Valve reconnected - {{water_system_name}}',
    body:  '{{water_system_name}} at {{site_name}}: the valve has reconnected and is operating normally.',
  },
  SEN_03: {
    title: '⚠ Meter disconnected - {{water_system_name}}',
    body:  '{{water_system_name}} at {{site_name}}: the meter has disconnected from the VMA and can no longer operate. Check the meter.',
  },
  SEN_04: {
    title: 'Meter reconnected - {{water_system_name}}',
    body:  '{{water_system_name}} at {{site_name}}: the meter has reconnected and is operating normally.',
  },
};

export function interpolate(tpl, vars) {
  if (!tpl) return '';
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] != null ? String(vars[key]) : ''));
}

export function buildPushText(card, variantId, sys, paramValues, opts = {}) {
  const sysName  = sys?.name || '?';
  const siteName = sys ? (sys.l4Name || sys.l3Name || sys.l2Name || '') : '';
  const actor    = opts.persona?.name || 'User';

  // Multi-variant cards (WA, OL, SO, V_ER) carry the variantId; single-variant
  // cards (LE_01, VC_OK_01, PW_01, etc.) use card.id directly.
  const id = variantId || card?.id;
  const template = V11_TEMPLATES[id] || V11_TEMPLATES[card?.id];

  // {{flow_rate}} is CATEGORICAL in V11 spec: "High flow" or "Low flow" (NOT
  // the numeric reading). Only WA_02 is canonical low-flow Warning; OL/SO
  // inherit severity from the originating WA. variantIds ending in `_low`
  // (e.g. OL_02_low) also map to Low flow.
  const isLowFlow = id === 'WA_02' || /_low$/i.test(id || '');
  const flowRate = isLowFlow ? 'Low flow' : 'High flow';

  // Sensible mockup defaults for the parameters spec interpolates from
  // runtime context.
  const action = 'close';
  const flowNote = 'A water event was active at the time';
  const newState = 'closed';
  const impactScope = 'Some functionality may be limited until power is restored.';

  const vars = {
    water_system_name: sysName,
    affected_entity:   sysName,
    site_name:         siteName,
    flow_rate:         flowRate,
    actor,
    action,
    flow_note:         flowNote,
    new_state:         newState,
    impact_scope:      impactScope,
  };

  if (!template) {
    return { title: `${card?.label || id} - ${sysName}`, body: `${sysName} at ${siteName}` };
  }

  const result = {
    title: interpolate(template.title, vars),
    body:  interpolate(template.body, vars),
  };
  // LE_01 surfaces a "Tell us more" CTA on the in-app notification (mockup
  // convention - not part of the V11 push body text itself, so renaming it
  // breaks no spec). RENAMED by the owner on 2026-11-02, from "Tag the
  // cause", as part of cutting the push CTA set to exactly two: "Tell us
  // more" on the ended water event, and View on every push.
  //
  // WHAT ACTUALLY DRAWS THE BUTTON IS NOT THIS FIELD. buildActions() in
  // src/utils/notificationActions.js builds the push's CTA row and carries
  // its own label; this `action` travels into the push payload
  // (pushSimFire.js:118, ControlPanel.jsx:347) where NOTHING reads it back.
  // It is kept because it is the mockup's record of the label and the V11
  // text test asserts on it - but a change here alone does not move a pixel,
  // and the two must be renamed together or they drift.
  if (id === 'LE_01') result.action = 'Tell us more';
  return result;
}
