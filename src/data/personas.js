// Personas — the demo profile picker.
//
// Rehomed onto the MRG dataset (2026-09-15) when the app switched to the web
// sandbox's Meridian Realty Group scope. The six archetypes are unchanged —
// what each one is *for* is the thing worth keeping — but they now point at
// real MRG locations so a persona can be compared against the same scope in
// the web app:
//   1. Tenant · 1 apartment            — Building D, which is deliberately all-clear (happy path)
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
  color: '#7C3AED',
  bg: '#F5F3FF',
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
    sub: 'Apartment 3 · Building D',
    description: 'Tenant in Building D, which is deliberately all-clear. Happy-path demo: nothing active, every empty state reachable.',
    email: 's.marchetti@example.com',
    phone: '+1 212 555 0148',
    icon: '🏠',
    color: '#A1D246',
    bg: '#F0FDF4',
    isWint: false,
    homePath: '/tenant',
    tabMode: 'tenant',
    systemFilter: (s) => s.id === 'esrt-bldg-D-apt-3',
  },
  {
    id: 'tenant-2apts',
    name: 'Nadia Oyelaran',
    role: 'Property Owner',
    sub: '2 apartments · Buildings A & E',
    description: 'Owns two apartments in different buildings. Building A Apt 2 has an active High Flow water event; Building E Apt 6 is all clear.',
    email: 'n.oyelaran@example.com',
    phone: '+1 212 555 0176',
    icon: '🏠',
    color: '#A1D246',
    bg: '#F0FDF4',
    isWint: false,
    homePath: '/tenant',
    tabMode: 'tenant',
    systemFilter: (s) => s.id === 'esrt-bldg-A-apt-2' || s.id === 'esrt-bldg-E-apt-6',
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
    bg: '#F5F3FF',
    isWint: false,
    homePath: '/',
    tabMode: 'manager',
    systemFilter: (s) => s.l3 === 'esrt-bldg-A',
  },
  {
    id: 'location-manager',
    name: 'Dana Whitfield',
    role: 'Location Manager',
    sub: '100 Meridian Plaza',
    description: 'Manages a single commercial site. Mix of supply lines, cooling tower makeup and hot water systems.',
    email: 'd.whitfield@meridianrealty.com',
    phone: '+1 212 555 0101',
    icon: '🏢',
    color: '#04ADEF',
    bg: '#EFF6FF',
    isWint: false,
    homePath: '/',
    tabMode: 'manager',
    systemFilter: (s) => s.l3 === SITE_100_MERIDIAN,
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
    isWint: false,
    homePath: '/',
    tabMode: 'manager',
    systemFilter: (s) => s.account === ACCOUNT_SOUTHBRIDGE,
  },

  // ── WINT STAFF ─────────────────────────────────────────────────────────────

  DEFAULT_PERSONA,
];

export { ROOT_ACCOUNT_ID };

export function getPersonaById(id) {
  return PERSONAS.find(p => p.id === id);
}
