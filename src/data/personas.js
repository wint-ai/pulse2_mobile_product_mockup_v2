// Personas — the demo profile picker.
//
// Rehomed onto the MRG dataset (2026-09-15) when the app switched to the web
// sandbox's Meridian Realty Group scope. The six archetypes are unchanged —
// what each one is *for* is the thing worth keeping — but they now point at
// real MRG locations so a persona can be compared against the same scope in
// the web app:
//   1. Tenant · 1 apartment            — Building A Apt 3: clear, and inside the managed building
//   2. Tenant · 2 apartments           — one with an active event, one clear
//   3. Building manager · residential  — Building A (10 apartments, 2 with active events)
//   4. Location manager · 1 site       — 100 Meridian Plaza
//   5. Portfolio manager · Office      — all 11 Office sites
//   6. Account manager · sub-account   — Southbridge Health
//
// + DEFAULT_PERSONA (Rami / Wint staff) — the internal admin view, all of MRG.
//
// The previous Suffolk / Heathrow / CBRE / Tidhar personas were dropped with
// their fixtures. git history has them.

// ── WHAT THE PICKERS SHOW vs WHAT EXISTS ──────────────────────────────────
// 2026-10-26, owner's ask: the sign-in screen shows exactly three roles —
// Facility Manager, Account Manager, Tenant — and no human names.
//
// That is a change to the *picker*, not to the model. `listed` is the only
// thing it touches: an unlisted persona keeps its id, its scope, its
// systemFilter and its fixtures, and stays reachable three ways —
//   • localStorage `pulse2-persona-id` (how every DOM test selects one, and
//     how browser verification pins `wint-admin`),
//   • the Push Simulator's persona dropdown (ControlPanel.jsx), which still
//     iterates the full PERSONAS list on purpose,
//   • getPersonaById(), which is unchanged.
// Nothing was deleted. v2-page-parity Rule 0 covers the scopes behind these
// personas; the owner authorised shortening the list, not dropping them.
//
// `location-manager` is the one the owner's "Facility manager" maps onto: a
// facility is a single site, and 100 Meridian Plaza is the one commercial
// site in the dataset with a heterogeneous system mix (basement/main supply,
// roof tank feed, two domestic-hot-water loops), a closed valve, an AC Power
// Lost alert and a Low Flow water event. Its `role` is relabelled; its id,
// scope and filter are untouched.

import { ROOT_ACCOUNT_ID } from './upstream/buildTree';

// Real upstream ids, so a persona's scope resolves to the same records the web
// app shows. See src/data/upstream/mrg-snapshot.json.
const SITE_100_MERIDIAN = 'a0c8e000000L9jyAAC';
const ACCOUNT_SOUTHBRIDGE = '0014H000049GnStQAK';

export const DEFAULT_PERSONA = {
  id: 'wint-admin',
  name: 'Rami Kletshevsky',
  role: 'Wint Admin',
  sub: 'Meridian Realty Group',
  description: 'Wint staff — full scope across MRG: Office and Residential. Can explore all.',
  email: 'rami.kletshevsky@wint.ai',
  phone: '+972528542617',
  icon: '⚡',
  // `color` is this persona's identity mark (every persona has its own)
  // and stays a literal; it paints a 4px rule and a role caption on the
  // v1 picker, not a surface.
  color: '#7C3AED',
  // `bg` IS a surface — the 32px icon tile in the drawer — and as a frozen
  // #F5F3FF it stayed a pale lavender slab under every dark theme. --accent
  // is this repo's pale informational wash and themes with the drawer. It is
  // #f2f6ff in `light`, 3 units off the lavender it replaces.
  bg: 'var(--accent)',
  // Unlisted: Wint staff is not one of the three roles the picker shows.
  listed: false,
  isWint: true,
  homePath: '/',
  tabMode: 'manager',
  systemFilter: () => true,
};

export const PERSONAS = [

  // ── TENANTS ────────────────────────────────────────────────────────────────

  {
    id: 'tenant-1apt',
    name: 'Sofia Marchetti',
    role: 'Tenant',
    sub: 'Apartment 3 · Building A',
    description: 'Tenant in Apartment 3, Building A — the same building the building manager covers, so the demo can flip between tenant and manager views of one building. Her own apartment is all clear.',
    email: 's.marchetti@example.com',
    phone: '+1 212 555 0148',
    icon: '🏠',
    color: '#A1D246',
    bg: '#F0FDF4',
    listed: true,
    isWint: false,
    homePath: '/tenant',
    tabMode: 'tenant',
    systemFilter: (s) => s.id === 'esrt-bldg-A-apt-3',
  },
  {
    id: 'tenant-2apts',
    name: 'Nadia Oyelaran',
    role: 'Property Owner',
    sub: '2 apartments · Buildings A & E',
    description: 'Owns two apartments in different buildings. Building A Apt 2 has an active High Flow water event; Building E Apt 7 is all clear.',
    email: 'n.oyelaran@example.com',
    phone: '+1 212 555 0176',
    icon: '🏠',
    color: '#A1D246',
    bg: '#F0FDF4',
    listed: false,
    isWint: false,
    homePath: '/tenant',
    tabMode: 'tenant',
    systemFilter: (s) => s.id === 'esrt-bldg-A-apt-2' || s.id === 'esrt-bldg-E-apt-7',
  },

  // ── MANAGERS ───────────────────────────────────────────────────────────────

  {
    id: 'building-manager-residential',
    name: 'Marcus Ellery',
    role: 'Building Manager',
    sub: 'Building A · 10 apartments',
    description: 'Manages every apartment in one residential building. Two apartments have active water events (Apt 2 High Flow, Apt 5 Low Flow).',
    email: 'm.ellery@meridianrealty.com',
    phone: '+1 212 555 0133',
    icon: '🏢',
    color: '#8B5CF6',
    bg: 'var(--accent)',   // see DEFAULT_PERSONA: `bg` is a surface, not an identity mark
    listed: false,
    isWint: false,
    homePath: '/',
    tabMode: 'manager',
    systemFilter: (s) => s.l4 === 'esrt-bldg-A',
  },
  {
    id: 'location-manager',
    name: 'Dana Whitfield',
    // Relabelled from 'Location Manager' 2026-10-26 — see the header note.
    // The id stays `location-manager`: it is the key the tests, the simulator
    // and localStorage address, and renaming it would be a real removal.
    role: 'Facility Manager',
    sub: '100 Meridian Plaza',
    description: 'Manages a single commercial site. Mix of supply lines, cooling tower makeup and hot water systems.',
    email: 'd.whitfield@meridianrealty.com',
    phone: '+1 212 555 0101',
    icon: '🏢',
    color: '#04ADEF',
    bg: '#EFF6FF',
    listed: true,
    isWint: false,
    homePath: '/',
    tabMode: 'manager',
    systemFilter: (s) => s.l4 === SITE_100_MERIDIAN,
  },
  {
    id: 'portfolio-manager-office',
    name: 'Grant Halloway',
    role: 'Portfolio Manager',
    sub: 'Office · 11 sites',
    description: 'Manages the whole commercial portfolio across every Office site. Multi-location scope, mixed alerts.',
    email: 'g.halloway@meridianrealty.com',
    phone: '+1 212 555 0119',
    icon: '🏢',
    color: '#04ADEF',
    bg: '#EFF6FF',
    listed: false,
    isWint: false,
    homePath: '/',
    tabMode: 'manager',
    systemFilter: (s) => s.l2 === 'esrt-office',
  },
  {
    id: 'account-manager-subaccount',
    name: 'Priya Raman',
    role: 'Account Manager',
    sub: 'Southbridge Health',
    description: 'Manages one MRG sub-account. Demonstrates account-scoped visibility inside a parent portfolio.',
    email: 'p.raman@meridianrealty.com',
    phone: '+1 212 555 0164',
    icon: '🌐',
    color: '#0D9488',
    bg: '#F0FDFA',
    listed: true,
    isWint: false,
    homePath: '/',
    tabMode: 'manager',
    systemFilter: (s) => s.account === ACCOUNT_SOUTHBRIDGE,
  },

  // ── WINT STAFF ─────────────────────────────────────────────────────────────

  DEFAULT_PERSONA,
];

/**
 * The personas the two demo pickers draw — the sign-in screen (App.jsx) and
 * the switch-profile screen (screens/PersonaSelect.jsx). Derived from
 * PERSONAS so the two can never drift, and so a persona is shown or hidden in
 * exactly one place.
 *
 * The order is the owner's, not the array's: widest scope first (a facility,
 * then an account, then one apartment), which is also the order he wrote them
 * in. PERSONAS itself is grouped tenants-then-managers and must not be
 * reordered — getPersonaById and the simulator's dropdown both read it.
 */
const PICKER_ORDER = ['location-manager', 'account-manager-subaccount', 'tenant-1apt'];

export const LISTED_PERSONAS = PERSONAS
  .filter(p => p.listed)
  .sort((a, b) => PICKER_ORDER.indexOf(a.id) - PICKER_ORDER.indexOf(b.id));

export { ROOT_ACCOUNT_ID };

export function getPersonaById(id) {
  return PERSONAS.find(p => p.id === id);
}
