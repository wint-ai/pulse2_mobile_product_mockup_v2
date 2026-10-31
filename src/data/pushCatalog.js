// V10.9 push notification catalog for the Push Simulator.
//
// One entry per "card" in the pusher UI. Each card may map to multiple V10.9
// alert IDs via the optional `variants` field (e.g. WA_01 / WA_02 / WA_03...).
//
// Source: docs/Notification IDs -V10.9.xlsx. Don't invent IDs - if you need to
// add a card, look it up in the spreadsheet first.
//
// `tint` is a CSS colour value, consumed as a 10px dot in PushSimSheet and a
// 4px border in ControlPanel — the simulator's own chrome, which ships to
// nobody. The four that have an exact token (--severity-high, --success,
// --danger, --slate-500) now use it. THE REST ARE DELIBERATELY LEFT RAW:
// #C84A28, #B82C5C, #7A8189 and #B5651A are near-misses for tokens rather than
// matches, and quietly rounding a dev tool's dots to the nearest token would
// make two catalogue rows that are visibly different today render identically.
// If these dots ever need to theme, they need their own decision first — which
// is a bigger conversation than a 10px dot is worth.

export const PUSH_CATALOG = [
  // ============= Water Events =============
  {
    id: 'WA',
    section: 'Water Events',
    sectionIcon: 'water_drop',
    label: 'Warning detected',
    tint: 'var(--severity-high)',   /* #DB4670 */
    glyph: 'water_drop',
    fireableType: 'leak-warning',
    variants: [
      { id: 'WA_01', label: 'WA_01 - Standard (High flow)' },
      { id: 'WA_02', label: 'WA_02 - Low flow' },
      { id: 'WA_03', label: 'WA_03 - System has no valve' },
      { id: 'WA_04', label: 'WA_04 - Valve disconnected' },
      { id: 'WA_05', label: 'WA_05 - Auto-shutoff disabled' },
      { id: 'WA_06', label: 'WA_06 - System disconnected (AC power)' },
      { id: 'WA_07', label: 'WA_07 - Warning + valve error' },
      { id: 'WA_09', label: 'WA_09 - Fallback (valve not closing)' },
    ],
    params: [
      { key: 'flowRate', label: 'Flow rate', default: '22.5 L/min' },
      { key: 'volume',   label: 'Volume so far', default: '18 L' },
    ],
    eligibility: (s) => !s.alert,
  },
  {
    id: 'OL',
    section: 'Water Events',
    label: 'Ongoing reminder',
    tint: '#C84A28',
    glyph: 'schedule',
    fireableType: 'leak-ongoing',
    variants: [
      { id: 'OL_02', label: 'OL_02 - Warning level (default)' },
      { id: 'OL_03', label: 'OL_03 - System has no valve' },
      { id: 'OL_04', label: 'OL_04 - Valve disconnected' },
      { id: 'OL_05', label: 'OL_05 - Auto-shutoff disabled' },
      { id: 'OL_06', label: 'OL_06 - System disconnected (AC power)' },
      { id: 'OL_07', label: 'OL_07 - Ongoing + valve error' },
      { id: 'OL_08', label: 'OL_08 - User previously ignored' },
      { id: 'OL_09', label: 'OL_09 - Fallback (valve not closing)' },
    ],
    params: [
      { key: 'volume', label: 'Volume so far', default: '42 L' },
    ],
    eligibility: (s) => true,
  },
  {
    id: 'SO',
    section: 'Water Events',
    label: 'Shutoff level reached',
    tint: '#B82C5C',
    glyph: 'block',
    fireableType: 'leak-shutoff',
    variants: [
      { id: 'SO_03', label: 'SO_03 - System has no valve' },
      { id: 'SO_04', label: 'SO_04 - Valve disconnected' },
      { id: 'SO_05', label: 'SO_05 - Auto-shutoff disabled' },
      { id: 'SO_06', label: 'SO_06 - System disconnected (AC power)' },
      { id: 'SO_07', label: 'SO_07 - Shutoff + valve error' },
      { id: 'SO_08', label: 'SO_08 - User previously ignored' },
      { id: 'SO_09', label: 'SO_09 - Fallback (valve not closing)' },
    ],
    params: [
      { key: 'volume', label: 'Volume at shutoff', default: '80 L' },
    ],
    eligibility: (s) => true,
  },
  {
    id: 'VC_S_02',
    section: 'Water Events',
    label: 'Valve started closing (water event)',
    tint: '#B82C5C',
    glyph: 'block',
    fireableType: 'valve-closing',
    eligibility: (s) => s.valve != null,
  },
  {
    id: 'VC_OK_02',
    section: 'Water Events',
    label: 'Valve closed successfully (after WE)',
    tint: 'var(--success)',         /* #5C9E1A */
    glyph: 'check_circle',
    fireableType: 'valve-closed-after-we',
    eligibility: (s) => s.valve != null,
  },
  {
    id: 'LE_01',
    section: 'Water Events',
    label: 'Water Event ended (+ feedback)',
    tint: 'var(--success)',         /* #5C9E1A */
    glyph: 'check_circle',
    fireableType: 'leak-ended',
    params: [
      { key: 'volume',   label: 'Total volume', default: '86 L' },
      { key: 'duration', label: 'Duration', default: '2 h 14 m' },
    ],
    eligibility: (s) => true,
  },

  // ============= Valve =============
  {
    id: 'VC_OK_01',
    section: 'Valve',
    sectionIcon: 'build',
    label: 'Valve closed by user',
    tint: '#7A8189',
    glyph: 'power_settings_new',
    fireableType: 'valve-closed-by-user',
    eligibility: (s) => s.valve != null,
  },
  {
    id: 'V_ER',
    section: 'Valve',
    label: 'Valve error',
    tint: 'var(--danger)',          /* #A5455E */
    glyph: 'error',
    fireableType: 'valve-error',
    variants: [
      { id: 'V_ER_01', label: 'V_ER_01 - Failed to open/close (user request)' },
      { id: 'V_ER_02', label: 'V_ER_02 - Auto-shutoff failed' },
      { id: 'V_ER_03', label: 'V_ER_03 - Water flow while valve closed' },
      { id: 'V_ER_05', label: 'V_ER_05 - Changed position unexpectedly' },
    ],
    eligibility: (s) => s.valve != null,
  },
  {
    id: 'V_ER_04',
    section: 'Valve',
    label: 'Valve error cleared',
    tint: 'var(--success)',         /* #5C9E1A */
    glyph: 'check_circle',
    fireableType: 'valve-error-cleared',
    eligibility: (s) => true,
  },

  // ============= Power =============
  {
    id: 'PW_01',
    section: 'Power',
    sectionIcon: 'power',
    label: 'AC Power disconnected',
    tint: '#B5651A',
    glyph: 'power_off',
    fireableType: 'power-lost',
    eligibility: (s) => true,
  },
  {
    id: 'PW_02',
    section: 'Power',
    label: 'AC Power reconnected',
    tint: 'var(--success)',         /* #5C9E1A */
    glyph: 'power',
    fireableType: 'power-restored',
    eligibility: (s) => true,
  },

  // ============= Communication =============
  {
    id: 'COM_01',
    section: 'Communication',
    sectionIcon: 'wifi',
    label: 'System offline',
    tint: 'var(--slate-500)',       /* #717684 */
    glyph: 'wifi_off',
    fireableType: 'offline',
    params: [
      { key: 'duration', label: 'Hours offline', default: '2 h' },
    ],
    eligibility: (s) => true,
  },
  {
    id: 'COM_02',
    section: 'Communication',
    label: 'System back online',
    tint: 'var(--success)',         /* #5C9E1A */
    glyph: 'wifi',
    fireableType: 'online',
    eligibility: (s) => true,
  },

  // ============= Sensors =============
  {
    id: 'SEN_01',
    section: 'Sensors',
    sectionIcon: 'sensors',
    label: 'Valve disconnected',
    tint: 'var(--slate-500)',       /* #717684 */
    glyph: 'link_off',
    fireableType: 'valve-disconnected',
    eligibility: (s) => s.valve != null,
  },
  {
    id: 'SEN_02',
    section: 'Sensors',
    label: 'Valve reconnected',
    tint: 'var(--success)',         /* #5C9E1A */
    glyph: 'link',
    fireableType: 'valve-reconnected',
    eligibility: (s) => s.valve != null,
  },
  {
    id: 'SEN_03',
    section: 'Sensors',
    label: 'Meter disconnected',
    tint: 'var(--slate-500)',       /* #717684 */
    glyph: 'water_damage',
    fireableType: 'meter-disconnected',
    eligibility: (s) => true,
  },
  {
    id: 'SEN_04',
    section: 'Sensors',
    label: 'Meter reconnected',
    tint: 'var(--success)',         /* #5C9E1A */
    glyph: 'water_drop',
    fireableType: 'meter-reconnected',
    eligibility: (s) => true,
  },
];

// Group catalog by section for rendering.
export const PUSH_SECTIONS = (() => {
  const map = {};
  for (const card of PUSH_CATALOG) {
    if (!map[card.section]) {
      map[card.section] = { name: card.section, icon: card.sectionIcon || null, cards: [] };
    }
    map[card.section].cards.push(card);
    // Carry section icon from any card that defines it.
    if (card.sectionIcon && !map[card.section].icon) map[card.section].icon = card.sectionIcon;
  }
  return Object.values(map);
})();
