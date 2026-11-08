import { createContext, useContext, useState, useEffect, useSyncExternalStore } from 'react';

const DARK = {
  mode: 'dark',
  label: 'Dark', icon: '\uD83C\uDF19', preview: '#1e294c',
  // Backgrounds
  bg: 'linear-gradient(145deg, #1e294c 0%, #1a2340 40%, #161d36 70%, #12182d 100%)',
  bgSolid: '#1e294c',
  bgFlat: '#151d38',
  // Drawer
  drawerBg: '#12182d',
  drawerText: '#E8EAED', drawerTextSub: 'rgba(255,255,255,0.5)', drawerTextDim: 'rgba(255,255,255,0.15)',
  drawerAccent: '#04ADEF', drawerDivider: 'rgba(255,255,255,0.08)', drawerInput: 'rgba(255,255,255,0.08)',
  drawerCard: 'rgba(255,255,255,0.06)', drawerCardBorder: '1px solid rgba(255,255,255,0.08)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(255,255,255,0.08)',
  cardHover: 'rgba(255,255,255,0.08)',
  headerBg: 'transparent',
  headerBorder: '1px solid rgba(255,255,255,0.08)',
  inputBg: 'rgba(255,255,255,0.08)',
  // Text
  text: '#E8EAED',
  textSecondary: 'rgba(255,255,255,0.6)',
  textTertiary: 'rgba(255,255,255,0.4)',
  textMuted: 'rgba(255,255,255,0.35)',
  textFaint: 'rgba(255,255,255,0.25)',
  textDimmest: 'rgba(255,255,255,0.15)',
  // Borders & dividers
  divider: 'rgba(255,255,255,0.06)',
  separator: '0.5px solid rgba(255,255,255,0.06)',
  // Accent
  accent: '#04ADEF',
  green: '#A1D246',
  red: '#DB4670',
  orange: '#F05C25',
  gray: '#717684',
  // Specific
  sheetBg: '#1A2A42',
  modalBg: '#1A2A42',
  tabBarBg: '#151d38',
  tabBarBorder: '1px solid rgba(255,255,255,0.08)',
  tabInactive: 'rgba(255,255,255,0.4)',
  // Glow orbs
  glowOrb1: 'radial-gradient(circle, rgba(4,173,239,0.12) 0%, transparent 60%)',
  glowOrb2: 'radial-gradient(circle, rgba(4,173,239,0.06) 0%, transparent 60%)',
  // Clear status
  clearBg: 'linear-gradient(135deg, rgba(161,210,70,0.15), rgba(4,173,239,0.1))',
  clearBorder: '1px solid rgba(161,210,70,0.2)',
  // Badges
  badgeBg: 'rgba(255,255,255,0.08)',
  badgeText: 'rgba(255,255,255,0.5)',
  // Status bar (phone frame)
  statusBarBg: '#fff',
  statusBarColor: '#111',
  phoneBg: '#F7F7F8',
};

const LIGHT = {
  mode: 'light',
  label: 'Light', icon: '\u2600\uFE0F', preview: '#F0F4F8',
  // Backgrounds
  bg: 'linear-gradient(145deg, #F0F4F8 0%, #E8ECF0 40%, #F5F7FA 70%, #FFFFFF 100%)',
  bgSolid: '#F0F4F8',
  bgFlat: '#FFFFFF',
  // Drawer (matches light theme)
  drawerBg: '#FFFFFF',
  drawerText: '#14151A', drawerTextSub: '#717684', drawerTextDim: '#DEE0E3',
  drawerAccent: '#04ADEF', drawerDivider: 'rgba(0,0,0,0.06)', drawerInput: 'rgba(0,0,0,0.05)',
  drawerCard: '#F5F7FA', drawerCardBorder: '1px solid rgba(0,0,0,0.08)',
  card: '#FFFFFF',
  cardBorder: '1px solid rgba(0,0,0,0.08)',
  cardHover: 'rgba(0,0,0,0.04)',
  headerBg: 'rgba(255,255,255,0.9)',
  headerBorder: '1px solid rgba(0,0,0,0.08)',
  inputBg: 'rgba(0,0,0,0.05)',
  // Text
  text: '#14151A',
  textSecondary: '#3E4850',
  textTertiary: '#717684',
  textMuted: '#9DA3AE',
  textFaint: '#BCC3CE',
  textDimmest: '#DEE0E3',
  // Borders & dividers
  divider: 'rgba(0,0,0,0.06)',
  separator: '0.5px solid rgba(0,0,0,0.08)',
  // Accent
  accent: '#04ADEF',
  green: '#5C9E1A',
  red: '#DB4670',
  orange: '#D94E1A',
  gray: '#717684',
  // Specific
  sheetBg: '#FFFFFF',
  modalBg: '#FFFFFF',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '1px solid #DEE0E3',
  tabInactive: '#717684',
  // Glow orbs
  glowOrb1: 'radial-gradient(circle, rgba(4,173,239,0.06) 0%, transparent 60%)',
  glowOrb2: 'radial-gradient(circle, rgba(4,173,239,0.03) 0%, transparent 60%)',
  // Clear status
  clearBg: 'linear-gradient(135deg, rgba(92,158,26,0.1), rgba(4,173,239,0.06))',
  clearBorder: '1px solid rgba(92,158,26,0.15)',
  // Badges
  badgeBg: 'rgba(0,0,0,0.06)',
  badgeText: '#717684',
  // Status bar (phone frame)
  statusBarBg: '#fff',
  statusBarColor: '#111',
  phoneBg: '#F7F7F8',
};

const WINT = {
  mode: 'wint',
  label: 'Wint Blue', icon: '\uD83D\uDCA7', preview: '#0B95F8',
  // Backgrounds
  bg: 'linear-gradient(145deg, #E1EDF7 0%, #E8F0F8 40%, #EDF3F9 70%, #F2F6FA 100%)',
  // On a real phone the shell IS the screen, so it carries the design wash
  // rather than a flat fill. See the statusBarBg note below.
  bgSolid: 'var(--app-bg)',
  bgFlat: '#F0F5FA',
  card: '#F7FAFC',
  cardBorder: '1px solid #D0DFED',
  cardHover: 'rgba(11,149,248,0.06)',
  headerBg: '#0B95F8',
  headerBorder: '1px solid rgba(255,255,255,0.15)',
  headerText: '#FFFFFF', headerTextSub: 'rgba(255,255,255,0.75)',
  inputBg: 'rgba(11,149,248,0.06)',
  // Drawer (light blue — matches theme)
  drawerBg: '#E5EEF6',
  drawerText: '#14151A', drawerTextSub: '#6B7A8D', drawerTextDim: '#B0BFCE',
  drawerAccent: '#0B95F8', drawerDivider: '#D0DFED', drawerInput: '#DAE5F0',
  drawerCard: '#F0F5FA', drawerCardBorder: '1px solid #D0DFED',
  // Text
  text: '#14151A',
  textSecondary: '#3E4850',
  textTertiary: '#6B7A8D',
  textMuted: '#8E9BAA',
  textFaint: '#B0BFCE',
  textDimmest: '#C8D6E0',
  // Borders & dividers
  divider: '#D4E6F5',
  separator: '0.5px solid #D4E6F5',
  // Accent
  accent: '#0B95F8',
  green: '#00D084',
  red: '#CF2E2E',
  orange: '#FF6900',
  gray: '#717684',
  // Specific
  sheetBg: '#F2F6FA',
  modalBg: '#F2F6FA',
  tabBarBg: '#F0F5FA',
  tabBarBorder: '1px solid #D0DFED',
  tabInactive: '#8E9BAA',
  // Glow orbs
  glowOrb1: 'radial-gradient(circle, rgba(11,149,248,0.08) 0%, transparent 60%)',
  glowOrb2: 'radial-gradient(circle, rgba(11,149,248,0.04) 0%, transparent 60%)',
  // Clear status
  clearBg: 'linear-gradient(135deg, rgba(0,208,132,0.1), rgba(11,149,248,0.06))',
  clearBorder: '1px solid rgba(0,208,132,0.15)',
  // Badges
  badgeBg: 'rgba(11,149,248,0.08)',
  badgeText: '#6B7A8D',
  // Status bar (phone frame).
  // The Figma frames have no status-bar band — the app wash runs to the top
  // edge of the 375x874 screen. A solid blue bar here (and an #E1EBF5 body
  // behind the screen) was the most visible way the v2 screens read as "not
  // the design", so both defer to --app-bg. Other themes keep their own chrome.
  statusBarBg: 'transparent',
  statusBarColor: '#0f172b',
  phoneBg: 'var(--app-bg)',
};

const MIDNIGHT = {
  mode: 'midnight',
  label: 'Midnight', icon: '\u2728', preview: '#0D0D0D',
  // Backgrounds
  bg: '#0D0D0D',
  bgSolid: '#0D0D0D',
  bgFlat: '#111111',
  // Drawer
  drawerBg: '#0A0A0A',
  drawerText: '#F5F5F5', drawerTextSub: 'rgba(255,255,255,0.45)', drawerTextDim: 'rgba(255,255,255,0.12)',
  drawerAccent: '#A78BFA', drawerDivider: '#2A2A2A', drawerInput: '#1A1A1A',
  drawerCard: '#161616', drawerCardBorder: '1px solid #2A2A2A',
  card: '#1A1A1A',
  cardBorder: '1px solid #2A2A2A',
  cardHover: '#222222',
  headerBg: '#161616',
  headerBorder: '1px solid #2A2A2A',
  inputBg: '#222222',
  // Text
  text: '#F5F5F5',
  textSecondary: 'rgba(255,255,255,0.65)',
  textTertiary: 'rgba(255,255,255,0.4)',
  textMuted: 'rgba(255,255,255,0.3)',
  textFaint: 'rgba(255,255,255,0.2)',
  textDimmest: 'rgba(255,255,255,0.12)',
  // Borders & dividers
  divider: '#2A2A2A',
  separator: '0.5px solid #2A2A2A',
  // Accent
  accent: '#A78BFA',
  green: '#34D399',
  red: '#F87171',
  orange: '#FB923C',
  gray: '#717684',
  // Specific
  sheetBg: '#161616',
  modalBg: '#161616',
  tabBarBg: '#111111',
  tabBarBorder: '1px solid #2A2A2A',
  tabInactive: 'rgba(255,255,255,0.35)',
  // Glow orbs
  glowOrb1: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 60%)',
  glowOrb2: 'radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 60%)',
  // Clear status
  clearBg: 'linear-gradient(135deg, rgba(52,211,153,0.12), rgba(167,139,250,0.08))',
  clearBorder: '1px solid rgba(52,211,153,0.2)',
  // Badges
  badgeBg: '#222222',
  badgeText: 'rgba(255,255,255,0.4)',
  // Status bar (phone frame)
  statusBarBg: '#111',
  statusBarColor: '#F5F5F5',
  phoneBg: '#0D0D0D',
};

const OCEAN = {
  mode: 'ocean',
  label: 'Ocean', icon: '\uD83C\uDF0A', preview: '#12086F',
  // Palette: #12086F → #2B35AF → #4361EE → #4895EF → #4CC9F0
  // Backgrounds — #12086F deepest
  bg: 'linear-gradient(160deg, #0E0650 0%, #12086F 40%, #171075 70%, #0E0650 100%)',
  bgSolid: '#12086F',
  bgFlat: '#12086F',
  // Drawer — #2B35AF base
  drawerBg: '#1A1280',
  drawerText: '#E0E8FF', drawerTextSub: '#4895EF', drawerTextDim: 'rgba(72,149,239,0.3)',
  drawerAccent: '#4CC9F0', drawerDivider: 'rgba(67,97,238,0.25)', drawerInput: 'rgba(43,53,175,0.5)',
  drawerCard: 'rgba(43,53,175,0.35)', drawerCardBorder: '1px solid rgba(67,97,238,0.3)',
  // Cards — #2B35AF tinted
  card: 'rgba(43,53,175,0.25)',
  cardBorder: '1px solid rgba(67,97,238,0.25)',
  cardHover: 'rgba(67,97,238,0.2)',
  // Header — #2B35AF solid
  headerBg: '#2B35AF',
  headerBorder: '1px solid rgba(67,97,238,0.4)',
  headerText: '#FFFFFF', headerTextSub: '#4CC9F0',
  // Input
  inputBg: 'rgba(43,53,175,0.45)',
  // Text — white primary, #4895EF secondary, #4CC9F0 tertiary
  text: '#E8EEFF',
  textSecondary: '#B8C8FF',
  textTertiary: '#4895EF',
  textMuted: 'rgba(72,149,239,0.6)',
  textFaint: 'rgba(72,149,239,0.35)',
  textDimmest: 'rgba(72,149,239,0.2)',
  // Borders — #4361EE at low opacity
  divider: 'rgba(67,97,238,0.2)',
  separator: '0.5px solid rgba(67,97,238,0.2)',
  // Accent — #4CC9F0 brightest cyan
  accent: '#4CC9F0',
  green: '#34D399',
  red: '#F87171',
  orange: '#FB923C',
  gray: '#4895EF',
  // Specific — #12086F/#2B35AF bases
  sheetBg: '#171075',
  modalBg: '#171075',
  tabBarBg: '#0E0650',
  tabBarBorder: '1px solid rgba(67,97,238,0.25)',
  tabInactive: 'rgba(72,149,239,0.45)',
  // Glow orbs — #4361EE and #4CC9F0
  glowOrb1: 'radial-gradient(circle, rgba(67,97,238,0.25) 0%, transparent 60%)',
  glowOrb2: 'radial-gradient(circle, rgba(76,201,240,0.12) 0%, transparent 60%)',
  // Clear status
  clearBg: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(76,201,240,0.1))',
  clearBorder: '1px solid rgba(52,211,153,0.25)',
  // Badges — #2B35AF base
  badgeBg: 'rgba(43,53,175,0.4)',
  badgeText: '#4895EF',
  // Status bar
  statusBarBg: '#12086F',
  statusBarColor: '#E0E8FF',
  phoneBg: '#0C0548',
};

const GRADIENT = {
  mode: 'gradient',
  label: 'Gradient', icon: '\uD83C\uDF0C', preview: 'linear-gradient(135deg, #2B35AF, #4361EE)',
  // Backgrounds — deep indigo with gradient surfaces
  bg: 'linear-gradient(170deg, #12086F 0%, #1A1080 40%, #0E0650 100%)',
  bgSolid: '#12086F',
  bgFlat: '#12086F',
  // Drawer
  drawerBg: '#0C0548',
  drawerText: '#E0E8FF', drawerTextSub: '#4895EF', drawerTextDim: 'rgba(72,149,239,0.3)',
  drawerAccent: '#4CC9F0', drawerDivider: 'rgba(67,97,238,0.2)', drawerInput: 'rgba(43,53,175,0.5)',
  drawerCard: 'rgba(43,53,175,0.3)', drawerCardBorder: '1px solid rgba(67,97,238,0.25)',
  // Cards — tinted indigo
  card: 'rgba(43,53,175,0.25)',
  cardBorder: '1px solid rgba(67,97,238,0.25)',
  cardHover: 'rgba(67,97,238,0.2)',
  // Header — gradient
  headerBg: 'linear-gradient(135deg, #2B35AF, #4361EE)',
  headerBorder: '1px solid rgba(67,97,238,0.4)',
  headerText: '#FFFFFF', headerTextSub: '#4CC9F0',
  // Input
  inputBg: 'rgba(67,97,238,0.15)',
  // Text
  text: '#E0E8FF',
  textSecondary: '#B8C8FF',
  textTertiary: '#4895EF',
  textMuted: 'rgba(72,149,239,0.6)',
  textFaint: 'rgba(72,149,239,0.35)',
  textDimmest: 'rgba(72,149,239,0.2)',
  // Borders
  divider: 'rgba(67,97,238,0.15)',
  separator: '0.5px solid rgba(67,97,238,0.15)',
  // Accent — bright cyan
  accent: '#4CC9F0',
  green: '#34D399',
  red: '#F87171',
  orange: '#FB923C',
  gray: '#4895EF',
  // Specific
  sheetBg: '#171075',
  modalBg: '#171075',
  tabBarBg: '#0E0650',
  tabBarBorder: '1px solid rgba(67,97,238,0.2)',
  tabInactive: 'rgba(72,149,239,0.45)',
  // Glow orbs
  glowOrb1: 'radial-gradient(circle, rgba(67,97,238,0.25) 0%, transparent 60%)',
  glowOrb2: 'radial-gradient(circle, rgba(76,201,240,0.12) 0%, transparent 60%)',
  // Clear status
  clearBg: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(76,201,240,0.1))',
  clearBorder: '1px solid rgba(52,211,153,0.25)',
  // Badges
  badgeBg: 'rgba(67,97,238,0.2)',
  badgeText: '#4895EF',
  // Status bar
  statusBarBg: '#12086F',
  statusBarColor: '#E0E8FF',
  phoneBg: '#0C0548',
};

const PORTAL = {
  mode: 'portal',
  label: 'Portal', icon: '\uD83C\uDFE2', preview: '#1B2838',
  // Backgrounds — light with subtle blue-gray tint, glass-friendly
  bg: '#E4EAF0',
  bgSolid: '#E4EAF0',
  bgFlat: '#EDF1F5',
  // Drawer
  drawerBg: '#1B2838',
  drawerText: '#E8EAED', drawerTextSub: 'rgba(255,255,255,0.55)', drawerTextDim: 'rgba(255,255,255,0.15)',
  drawerAccent: '#0B95F8', drawerDivider: 'rgba(255,255,255,0.08)', drawerInput: 'rgba(255,255,255,0.08)',
  drawerCard: 'rgba(255,255,255,0.06)', drawerCardBorder: '1px solid rgba(255,255,255,0.08)',
  // Cards — glassmorphism
  card: 'rgba(255,255,255,0.2)',
  cardBorder: '1px solid #FFFFFF',
  cardHover: 'rgba(255,255,255,0.35)',
  // Header — dark navy
  headerBg: '#1B2838',
  headerBorder: '1px solid rgba(255,255,255,0.08)',
  headerText: '#FFFFFF', headerTextSub: 'rgba(255,255,255,0.55)',
  inputBg: 'rgba(255,255,255,0.35)',
  // Text — dark navy base
  text: '#14151A',
  textSecondary: '#3E4850',
  textTertiary: 'rgba(32,41,76,0.7)',
  textMuted: '#9DA3AE',
  textFaint: '#BCC3CE',
  textDimmest: '#DEE0E3',
  // Borders & dividers
  divider: 'rgba(255,255,255,0.5)',
  separator: '0.5px solid rgba(255,255,255,0.5)',
  // Accent
  accent: '#0B95F8',
  green: '#5C9E1A',
  red: '#FF4B2B',
  orange: '#F05C25',
  gray: '#717684',
  // Specific
  sheetBg: '#EDF1F5',
  modalBg: '#EDF1F5',
  tabBarBg: 'rgba(255,255,255,0.85)',
  tabBarBorder: '1px solid rgba(255,255,255,0.9)',
  tabInactive: '#9DA3AE',
  // Glow orbs — none needed, glass effect is the visual
  glowOrb1: 'radial-gradient(circle, rgba(11,149,248,0.06) 0%, transparent 60%)',
  glowOrb2: 'radial-gradient(circle, rgba(11,149,248,0.03) 0%, transparent 60%)',
  // Clear status
  clearBg: 'rgba(255,255,255,0.25)',
  clearBorder: '1px solid rgba(92,158,26,0.2)',
  // Badges
  badgeBg: 'rgba(255,255,255,0.35)',
  badgeText: 'rgba(32,41,76,0.7)',
  // Status bar (phone frame)
  statusBarBg: '#1B2838',
  statusBarColor: '#fff',
  phoneBg: '#E4EAF0',
  // Portal-specific: glassmorphism + Urbanist KPI font
  glass: true,
  glassBg: 'rgba(255,255,255,0.2)',
  glassBgStrong: 'rgba(255,255,255,0.6)',
  glassBlur: 'blur(8px)',
  glassBorder: '1px solid #FFFFFF',
  kpiFont: "'Urbanist', Inter, sans-serif",
  kpiColor: '#FF4B2B',
  kpiColorOk: '#20294C',
  kpiWeight: 300,
  // Leak icon backgrounds
  leakHighBg: '#C1EBFD',
  leakLowBg: '#DDF9D7',
  leakIconColor: '#20294C',
};

/* ── WINT_DARK — what the v1 screens wear when the app is in dark mode ──
 *
 * THE BUG THIS FIXES. Measured 2026-11-08 by rendering every live route in
 * `light` and in `dark` and diffing the COMPUTED colour of every element:
 * five routes -- /systems, /alerts, /events, /leak/:id, /kpi/:type -- came
 * back byte-identical in both themes. They are v1 screens, they take their
 * colour from this React context, and this context has never known that
 * `data-theme` exists. It read one localStorage key, found 'wint', and
 * painted a light theme onto a black app. The result was a near-black page
 * chrome with pure-white cards sitting on it, and ~100 text nodes under
 * 4.5:1. `card: '#F7FAFC'` on line 122 alone painted 31 of those slabs.
 *
 * WHY THE VALUES ARE var() AND NOT HEXES. There is already a complete,
 * measured dark palette in src/index.css -- the one the v2 pages use. A
 * second set of dark hexes here would be a second source of truth that
 * drifts the first time either is touched, and the whole point of the token
 * work was to stop having two. So every value below POINTS AT that palette.
 * This is not a new pattern: WINT itself already sets `bgSolid` and
 * `phoneBg` to var(--app-bg), because inline styles resolve custom
 * properties at paint time like any other declaration.
 *
 * It follows that this object is not really "a dark theme" -- it is a view
 * onto whatever [data-theme] is current. It is wired to `dark` ONLY, and
 * that restraint is deliberate: pointing `light` at it too would change how
 * the v1 screens look in light mode, which nobody asked for. `sand` and the
 * `contrast` diagnostic therefore still get WINT, unchanged. That leaves
 * sand's v1 screens cool-blue rather than warm -- a real but pre-existing
 * mismatch, and a light theme on a light theme, so nothing is invisible.
 *
 * `mode` IS 'dark', AND THAT IS LOAD-BEARING. Nine places across the v1
 * screens branch on `theme.mode === 'dark'` to pick a white-alpha fill over
 * a light hex (NavigationDrawer, HomeUnified, StatusWidgetsMobile and the
 * rest). Those branches have been dead since the v1 picker was removed --
 * there is no remaining call site for this context's own setTheme. Naming
 * the mode 'dark' is what switches them all back on.
 */
const WINT_DARK = {
  mode: 'dark',
  label: 'Dark', icon: '🌙', preview: '#09090b',
  // Backgrounds — the themed wash, the same one the v2 pages stand on.
  bg: 'var(--app-bg)',
  bgSolid: 'var(--app-bg)',
  bgFlat: 'var(--background)',
  /* --surface-card, not --card: dark lifts the card 4% toward the
     foreground so it separates from the page at ~1.1:1. See index.css. */
  card: 'var(--surface-card)',
  cardBorder: '1px solid var(--border-subtle)',
  cardHover: 'var(--accent)',
  headerBg: 'var(--primary)',
  headerBorder: '1px solid var(--border-subtle)',
  /* Dark ink on the blue header, not white: index.css measured white on
     this theme's --primary at 3.60:1 and --primary-foreground at 4.71:1. */
  headerText: 'var(--primary-foreground)',
  headerTextSub: 'color-mix(in oklab, var(--primary-foreground) 78%, transparent)',
  inputBg: 'var(--secondary)',
  // Drawer — the sidebar token family exists for exactly this.
  drawerBg: 'var(--sidebar)',
  drawerText: 'var(--sidebar-foreground)',
  drawerTextSub: 'var(--muted-foreground)',
  drawerTextDim: 'var(--border-strong)',
  drawerAccent: 'var(--sidebar-primary)',
  drawerDivider: 'var(--sidebar-border)',
  drawerInput: 'var(--secondary)',
  drawerCard: 'var(--sidebar-accent)',
  drawerCardBorder: '1px solid var(--sidebar-border)',
  /* Text — five steps down the ramp, which INVERTS under dark, so these
     walk from near-white to near-ground without restating a single hex. */
  text: 'var(--foreground)',
  textSecondary: 'var(--slate-700)',
  textTertiary: 'var(--muted-foreground)',
  textMuted: 'var(--slate-400)',
  textFaint: 'var(--slate-300)',
  textDimmest: 'var(--slate-200)',
  // Borders & dividers
  divider: 'var(--border-subtle)',
  separator: '0.5px solid var(--border-subtle)',
  /* Accent and the status hues. The severity four are product semantics and
     CLAUDE.md fixes them, so they do NOT move between themes -- they are
     named here so the v1 screens stop carrying their own near-duplicates
     (#CF2E2E, #00D084) alongside the real ones. --destructive is the
     exception and is the right one to use: it is shadcn's dark red, chosen
     to be read as INK on a dark ground, which is how theme.red is used. */
  accent: 'var(--primary)',
  green: 'var(--success)',
  red: 'var(--destructive)',
  orange: 'var(--severity-low)',
  gray: 'var(--muted-foreground)',
  // Specific
  sheetBg: 'var(--popover)',
  modalBg: 'var(--popover)',
  tabBarBg: 'var(--card)',
  tabBarBorder: '1px solid var(--border-subtle)',
  tabInactive: 'var(--muted-foreground)',
  // Glow orbs
  glowOrb1: 'radial-gradient(circle, color-mix(in oklab, var(--primary) 14%, transparent) 0%, transparent 60%)',
  glowOrb2: 'radial-gradient(circle, color-mix(in oklab, var(--primary) 7%, transparent) 0%, transparent 60%)',
  // Clear status
  clearBg: 'color-mix(in oklab, var(--success) 12%, transparent)',
  clearBorder: '1px solid color-mix(in oklab, var(--success) 28%, transparent)',
  // Badges
  badgeBg: 'var(--secondary)',
  badgeText: 'var(--muted-foreground)',
  /* Status bar — transparent so the wash runs to the top edge, matching
     what WINT does and what the Figma frames show. */
  statusBarBg: 'transparent',
  statusBarColor: 'var(--foreground)',
  phoneBg: 'var(--app-bg)',
};

export const THEMES = { dark: DARK, light: LIGHT, wint: WINT, wintDark: WINT_DARK, gradient: GRADIENT, ocean: OCEAN, midnight: MIDNIGHT, portal: PORTAL };

const ThemeContext = createContext(null);

/** What [data-theme] says right now. SSR and jsdom have no <html>.
 *  Returns a STRING (or null), so successive snapshots compare equal by
 *  value and useSyncExternalStore does not re-render on every check. */
function readDocTheme() {
  if (typeof document === 'undefined') return null;
  return document.documentElement.getAttribute('data-theme');
}

/** Module scope, so the subscription identity is stable across renders. */
function subscribeToDocTheme(onChange) {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => obs.disconnect();
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('pulse2-theme') || 'wint'; } catch { return 'wint'; }
  });

  /* The bridge. src/theme/index.js stamps [data-theme] on <html> and is the
     only thing in the app that changes it, but it is NOT a React store --
     the v2 side reads it straight off the element. <html> is therefore an
     external store, and useSyncExternalStore is the primitive for exactly
     that: it subscribes, it reads through getSnapshot on every render so
     the value can never be stale, and it needs no effect. Writing this as
     useState + a MutationObserver in an effect instead costs a
     setState-during-effect, which this repo's eslint rejects and which is
     the cascading-render hazard the rule is named after. */
  const docTheme = useSyncExternalStore(subscribeToDocTheme, readDocTheme, () => null);

  useEffect(() => {
    try { localStorage.setItem('pulse2-theme', mode); } catch {}
  }, [mode]);

  /* [data-theme=dark] WINS over the stored v1 mode. Nothing in the app calls
     this context's setTheme any more, so there is no preference being
     overridden here -- only the 'wint' default, which is what painted the
     light cards onto the dark app. */
  const theme = docTheme === 'dark' ? WINT_DARK : (THEMES[mode] || DARK);
  const toggleTheme = () => setMode(m => m === 'dark' ? 'light' : 'dark');
  const setTheme = (id) => setMode(id);

  /* The exposed `mode` is the EFFECTIVE one, so it can never disagree with
     the palette being handed out. Every consumer reads theme.mode today,
     but a context reporting 'wint' while serving the dark set is a trap. */
  return (
    <ThemeContext.Provider value={{ theme, mode: theme.mode, toggleTheme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { theme: WINT, mode: 'wint', toggleTheme: () => {}, setTheme: () => {}, themes: THEMES };
  return ctx;
}
