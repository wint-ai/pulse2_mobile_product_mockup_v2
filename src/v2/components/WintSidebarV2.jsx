/**
 * Wint side menu — v2, rebuilt at pixel fidelity from Figma.
 *
 * Design source: Figma file YEmjkKS4xaA827Zm8w3oXx,
 *   198378:73797  "Side menu_option 2" (402x874 frame; the panel is 357 wide)
 *   198378:74013  Rectangle 4          — the panel's gradient fill
 *   198378:74015  Header               — logo + close
 *   198378:74021  Create wrapper       — "Locations" + collapse / search / filter
 *   198378:74031  SidebarMenuButton    — root account row, active (white card)
 *   198378:74033  SidebarMenuSubItem   — nested row with star + alert dot
 *   198378:74037  SidebarMenuSubItem   — nested row, collapsed
 *   198378:74060  SidebarMenuSubItem   — system leaf (photo-sensor glyph, pl-16)
 *   198378:74083  Footer               — Users / Reports / account switcher / bell
 *
 * WHY THIS FILE EXISTS. WintSidebar.jsx got its geometry from screenshots and
 * two things came out visibly wrong:
 *   1. the panel was painted flat `var(--sidebar,#ffffff)`. It is not flat —
 *      198378:74013 carries a 125.34deg five-stop gradient (the same ramp as
 *      --app-bg, rotated). Sampling the Figma render confirms it: #F1F4FA at
 *      the top-left ramping to #E3EDFE low-right and back to #E9EFFB at the
 *      very bottom.
 *   2. every row glyph, pad and radius was eyeballed. They are measured here —
 *      each one is carried across as the literal class Figma emits, e.g.
 *      px-[var(--spacing\/1\,5,6px)]. Those vars are NOT defined in this repo;
 *      the literal fallback inside each var() is the design value, which is
 *      exactly the point. Do not "translate" them to px-1.5 or slate-600.
 *
 * ESCAPING — read before editing. A Figma class carries a backslash
 * (`--colors\/slate\/600`) because a raw `/` is not a legal CSS ident and
 * Tailwind would read it as an opacity modifier. That backslash has to reach
 * the DOM class attribute intact for it to match the generated selector, so
 * these classes may ONLY appear as literal JSX string attributes — JSX does not
 * process escapes, so `\/` survives. Putting one inside a JS string or cn()
 * silently eats the backslash and the style never applies. Anything
 * conditional therefore goes through an inline `style` object instead, where
 * the JS form `'var(--colors\\/slate\\/600,#45556c)'` parses correctly.
 *
 * The one Figma class deliberately dropped is the font family
 * (`font-[family-name:var(--font\/family\/sans,'Geist:Medium')]`) — the
 * fallback there is a Figma style name, not a CSS family, so it would resolve
 * to nothing and drop the panel to the browser default. The panel inherits
 * --font-sans (Figtree) instead, which is what the project already ships.
 *
 * BEHAVIOUR. This drawer is NAVIGATION ONLY. v1's NavigationDrawer doubled as
 * the global scope picker (it called setSelectedScope on every location tap,
 * which is why Home silently re-scoped itself behind the user's back). v2 does
 * not touch UserContext scope at all — picking a row moves the user somewhere,
 * nothing more. The data layer below is carried over from WintSidebar.jsx
 * unchanged; only the markup and styling are new.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BellDot, ChevronsUpDown, X } from 'lucide-react'
// Verified byte-identical to the assets these nodes export: Briefcase08 ==
// 224ec0b8 (viewBox 12.9974x11.8302, #0B82F8), PinLocation03 == f6d90c51
// (11.6637x12.8304, #90A1B9), Search01 == d2961388 (13.33x13.33, #90A1B9).
// The rest of the frame's glyphs are inlined below because src/v2/icons has no
// match — and note src/v2/icons/ArrowDropDownLine.jsx actually holds Remix
// arrow-drop-RIGHT-line, so neither caret is imported from there.
import { Briefcase08, PinLocation03, Search01 } from '@/v2/icons'
import { Input } from '@/components/ui/input'
import {
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub,
  SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider,
} from '@/components/ui/sidebar'
import { useUserContext } from '@/context/UserContext'
import { getAccountById, getChildAccounts, getRootAccounts } from '@/data/accounts'
import { getHierarchyForAccount } from '@/data/hierarchy'
import { isIgnored } from '@/data/ignoredIncidents'
import { DEFAULT_PERSONA } from '@/data/personas'
import { SYSTEMS } from '@/data/systems'
import { computeSystemHealth } from '@/utils/systemHealth'

// ── Measured constants ─────────────────────────────────────────────────────

/** 198378:74013, verbatim. Five stops at 0.8 alpha over a flat white layer. */
const PANEL_BG =
  'linear-gradient(125.34006894835755deg, rgba(233, 238, 248, 0.8) 8.3855%, ' +
  'rgba(227, 235, 249, 0.8) 32.2%, rgba(228, 235, 250, 0.8) 40.822%, ' +
  'rgba(212, 226, 255, 0.8) 71.236%, rgba(233, 237, 243, 0.8) 82.858%), ' +
  'linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)'

/** Panel is 357 of the frame's 402 — 88.8%, capped so it never exceeds 357. */
const PANEL_WIDTH_PCT = '88.8%'
const PANEL_MAX_WIDTH = 357

/**
 * Scrim. Not a node in the frame — the 45px sliver right of the panel is the
 * underlying screen already dimmed inside "Location opt b". Sampling it
 * (#B3C1D5 over an ~#E9EFFC app background) works out to slate-900 at ~25%.
 */
const SCRIM = 'rgba(15, 23, 42, 0.25)'

/**
 * Badge tone. NOT account-vs-location, which is what the first pass assumed —
 * sampling every badge in the render says it tracks the ACTIVE row: the white
 * card's badge is #f0f4fb/slate-600 (198378:74031) and every other badge, root
 * accounts included ("South Quarter", "East Quarter"), is slate-200/slate-400.
 */
const BADGE_TONE_ACTIVE = { background: '#f0f4fb', color: 'var(--colors\\/slate\\/600,#45556c)' }
const BADGE_TONE_REST = {
  background: 'var(--colors\\/slate\\/200,#e2e8f0)',
  color: 'var(--colors\\/slate\\/400,#90a1b9)',
}

/** Tabler star ships #90A1B9; the pinned tint is the amber v1 already uses. */
const STAR_OFF = '#90a1b9'
const STAR_ON = '#f5a524'

/**
 * Row indent. The frame nests by hand and drifts a couple of px per level
 * (metadata says 0 / 8 / 20 / 34 / 44, the render measures 0 / 8 / 20 / 32 /
 * 46), so this is the regular formula that sits inside 2px of every measured
 * level: 0, 8, 20, 32, 44, 56…
 */
function indentFor(depth) {
  return depth <= 0 ? 0 : 8 + 12 * (depth - 1)
}

// ── Inlined Figma glyphs ───────────────────────────────────────────────────
// Figma's asset URLs expire in ~7 days, so nothing may reference them at
// runtime. Each path below is the exported bytes unmodified; where the export
// came out of a whole-row render the original coordinates are kept and a
// <g transform> re-frames them, so no coordinate is ever retyped.
//
// Five of these had to come from download_assets node exports rather than
// get_design_context: the "Icon Placeholder" wrapper made get_design_context
// hand back the generic Lucide *smile* for arrows-in-line-vertical, group-line,
// star, photo-sensor-3 and report-analytics. Shipping those would have been the
// same class of mistake as the water-line pipe that came back as a loop.

/** Phosphor arrows-in-line-vertical — collapse all. Export was framed at y+8. */
function ArrowsInLineVertical({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <g transform="translate(0,-8)">
        <path d="M13.5 16H2.5" stroke="#62748E" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 9V14" stroke="#62748E" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 12L8 14L6 12" stroke="#62748E" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 23V18" stroke="#62748E" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 20L8 18L10 20" stroke="#62748E" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

/**
 * Phosphor funnel-simple — three rules, NOT the funnel outline that
 * src/v2/icons/Funnel.jsx holds. Different glyph, hence a second one here.
 */
function FunnelSimple({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <path d="M4 8.5H12" stroke="#90A1B9" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.5 5.5H14.5" stroke="#90A1B9" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 11.5H9.5" stroke="#90A1B9" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Tabler photo-sensor-3 — the system leaf. Export framed at x+16, y+7. */
function PhotoSensor3({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <g transform="translate(-16,-7)" stroke="#90A1B9" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
        <path d="M25.9165 9.33325H26.4998C26.8093 9.33325 27.106 9.45617 27.3248 9.67496C27.5436 9.89375 27.6665 10.1905 27.6665 10.4999V11.0833" />
        <path d="M27.6665 16.9167V17.5001C27.6665 17.8095 27.5436 18.1062 27.3248 18.325C27.106 18.5438 26.8093 18.6667 26.4998 18.6667H25.9165" />
        <path d="M20.0835 18.6667H19.5002C19.1907 18.6667 18.894 18.5438 18.6752 18.325C18.4564 18.1062 18.3335 17.8095 18.3335 17.5001V16.9167" />
        <path d="M18.3335 11.0833V10.4999C18.3335 10.1905 18.4564 9.89375 18.6752 9.67496C18.894 9.45617 19.1907 9.33325 19.5002 9.33325H20.0835" />
        <path d="M21.25 14C21.25 14.4641 21.4344 14.9092 21.7626 15.2374C22.0908 15.5656 22.5359 15.75 23 15.75C23.4641 15.75 23.9092 15.5656 24.2374 15.2374C24.5656 14.9092 24.75 14.4641 24.75 14C24.75 13.5359 24.5656 13.0908 24.2374 12.7626C23.9092 12.4344 23.4641 12.25 23 12.25C22.5359 12.25 22.0908 12.4344 21.7626 12.7626C21.4344 13.0908 21.25 13.5359 21.25 14Z" />
        <path d="M23 17.5V18.6667" />
        <path d="M18.3335 14H19.5002" />
        <path d="M23 9.33325V10.4999" />
        <path d="M27.6667 14H26.5" />
      </g>
    </svg>
  )
}

/**
 * Tabler star — the pin affordance. Export framed at x+231, y+6. Recoloured to
 * currentColor because this is the one glyph the design tints two ways (the
 * frame only draws the unpinned #90A1B9 state).
 */
function TablerStar({ size = 16, className, filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <g transform="translate(-231,-6)">
        <path
          d="M239 17.8334L234.885 19.9967L235.671 15.4147L232.338 12.1701L236.938 11.5034L238.995 7.33472L241.053 11.5034L245.653 12.1701L242.319 15.4147L243.105 19.9967L239 17.8334Z"
          stroke="currentColor" fill={filled ? 'currentColor' : 'none'}
          strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}

/** "Location Dot" (I198378:74033;197423:250713) — 14px, two 10% haloes. */
function LocationDot({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <circle opacity="0.1" cx="7" cy="7" r="4.42105" fill="#E7000B" />
      <circle opacity="0.1" cx="7" cy="7" r="7" fill="#E7000B" />
      <circle cx="7" cy="7" r="1.47368" fill="#E7000B" />
    </svg>
  )
}

/** Remix arrow-drop-down-line — expanded badge. currentColor: two tints. */
function ArrowDropDown({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <path d="M8 10.0004L5.17155 7.172L6.11436 6.22917L8 8.1148L9.8856 6.22917L10.8284 7.172L8 10.0004Z" fill="currentColor" />
    </svg>
  )
}

/** Remix arrow-drop-right-line — collapsed badge. */
function ArrowDropRight({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <path d="M8.11447 8.00033L6.22884 6.11469L7.17167 5.17187L10.0001 8.00033L7.17167 10.8287L6.22884 9.88593L8.11447 8.00033Z" fill="currentColor" />
    </svg>
  )
}

/** Remix group-line — footer "Users". Export framed at x+8, y+8. */
function GroupLine({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <g transform="translate(-8,-8)">
        <path
          d="M9.3335 22.6667C9.3335 19.7212 11.7213 17.3334 14.6668 17.3334C17.6124 17.3334 20.0002 19.7212 20.0002 22.6667H18.6668C18.6668 20.4576 16.876 18.6667 14.6668 18.6667C12.4577 18.6667 10.6668 20.4576 10.6668 22.6667H9.3335ZM14.6668 16.6667C12.4568 16.6667 10.6668 14.8767 10.6668 12.6667C10.6668 10.4567 12.4568 8.66675 14.6668 8.66675C16.8768 8.66675 18.6668 10.4567 18.6668 12.6667C18.6668 14.8767 16.8768 16.6667 14.6668 16.6667ZM14.6668 15.3334C16.1402 15.3334 17.3335 14.1401 17.3335 12.6667C17.3335 11.1934 16.1402 10.0001 14.6668 10.0001C13.1935 10.0001 12.0002 11.1934 12.0002 12.6667C12.0002 14.1401 13.1935 15.3334 14.6668 15.3334ZM20.1893 17.8019C22.0431 18.6375 23.3335 20.5014 23.3335 22.6667H22.0002C22.0002 21.0427 21.0324 19.6448 19.642 19.0181L20.1893 17.8019ZM19.731 10.2756C21.0631 10.8248 22.0002 12.1358 22.0002 13.6667C22.0002 15.5802 20.5363 17.1502 18.6668 17.3185V15.9765C19.798 15.8149 20.6668 14.8427 20.6668 13.6667C20.6668 12.7463 20.1346 11.9508 19.3608 11.571L19.731 10.2756Z"
          fill="#314158"
        />
      </g>
    </svg>
  )
}

/** Tabler report-analytics — footer "Reports". Export framed at x+8, y+8. */
function ReportAnalytics({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <g transform="translate(-8,-8)" stroke="#314158" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.0002 11.3333H12.6668C12.3132 11.3333 11.9741 11.4737 11.724 11.7238C11.474 11.9738 11.3335 12.313 11.3335 12.6666V20.6666C11.3335 21.0202 11.474 21.3593 11.724 21.6094C11.9741 21.8594 12.3132 21.9999 12.6668 21.9999H19.3335C19.6871 21.9999 20.0263 21.8594 20.2763 21.6094C20.5264 21.3593 20.6668 21.0202 20.6668 20.6666V12.6666C20.6668 12.313 20.5264 11.9738 20.2763 11.7238C20.0263 11.4737 19.6871 11.3333 19.3335 11.3333H18.0002" />
        <path d="M14 11.3333C14 10.9797 14.1405 10.6406 14.3905 10.3905C14.6406 10.1405 14.9797 10 15.3333 10H16.6667C17.0203 10 17.3594 10.1405 17.6095 10.3905C17.8595 10.6406 18 10.9797 18 11.3333C18 11.687 17.8595 12.0261 17.6095 12.2761C17.3594 12.5262 17.0203 12.6667 16.6667 12.6667H15.3333C14.9797 12.6667 14.6406 12.5262 14.3905 12.2761C14.1405 12.0261 14 11.687 14 11.3333Z" />
        <path d="M14 19.3333V16" />
        <path d="M16 19.3334V18.6667" />
        <path d="M18 19.3333V17.3333" />
      </g>
    </svg>
  )
}

/**
 * The App.jsx helper of the same name is module-private and this file may not
 * edit App.jsx, so it is restated here. 198378:74017 sizes it 52x29.25.
 */
function WintLogo() {
  return (
    <img
      src={`${import.meta.env.BASE_URL}wint-logo.svg`}
      alt="Wint"
      className="h-[29.25px] w-[52px]"
    />
  )
}

// ── Data ───────────────────────────────────────────────────────────────────
// Carried over from WintSidebar.jsx unmodified — this half was already correct.

/**
 * RED DOT RULE. A location row is dotted when anything in its subtree is live.
 * computeSystemHealth is the shared "is this a real Water Event" oracle (it
 * already drops ignored incidents, so the drawer and the system page can never
 * disagree); sys.alert covers the non-water alert types — offline, valve
 * error, AC power lost — which the health helper reports as flags rather than
 * events. Config drift with no alert attached (e.g. zero notification
 * recipients) is deliberately NOT a dot: the dot means "something is
 * happening here", not "something is mis-set up here".
 */
function systemIsAlerting(sys) {
  if (computeSystemHealth(sys).isLeak) return true
  return !!sys.alert && !isIgnored(sys.id)
}

/**
 * Turn one hierarchy.js node into a tree node, pruning any branch that holds
 * no system this persona can see. Returns null for a fully-pruned branch.
 * Shape: { id, name, kind, levelType, children, systems, l4Id }
 */
function buildNode(node, systemById) {
  if (node.type === 'system') {
    const sys = systemById.get(node.id)
    if (!sys) return null
    return { id: sys.id, name: sys.name, kind: 'system', levelType: 'System', children: [], systems: [sys], l4Id: null }
  }

  const children = (node.children || []).map(c => buildNode(c, systemById)).filter(Boolean)
  // A location with no visible system is still a real place to navigate to.
  // Returning null here collapsed the entire tree whenever locations existed
  // before systems did. Only a nameless, childless node is genuinely junk.
  if (children.length === 0 && !node.name) return null

  const systems = children.flatMap(c => c.systems)
  const isLeafLocation = children.every(c => c.kind === 'system')
  return {
    id: node.id,
    name: node.name,
    kind: node.type === 'sub-account' ? 'account' : 'location',
    levelType: node.levelType || null,
    children,
    systems,
    // /l4/:l4id keys off the SYSTEM's l4 slug, which is not reliably the same
    // string as the hierarchy node id ('sc-towerone' vs 'towerone'), so read it
    // off a system rather than off the node.
    l4Id: isLeafLocation ? (systems[0]?.l4 ?? null) : null,
  }
}

/** Root accounts → sub-accounts (when present) → hierarchy.js, same shape as v1. */
function buildTree(systems) {
  const systemById = new Map(systems.map(s => [s.id, s]))
  const order = []
  const byRoot = new Map()

  for (const sys of systems) {
    const rootId = getAccountById(sys.account)?.parentId || sys.account
    if (!byRoot.has(rootId)) { byRoot.set(rootId, []); order.push(rootId) }
    byRoot.get(rootId).push(sys)
  }

  // Accounts exist whether or not a system has been provisioned in them, so
  // deriving roots only from systems left the drawer with nothing to navigate.
  for (const acct of getRootAccounts()) {
    if (!byRoot.has(acct.id)) { byRoot.set(acct.id, []); order.push(acct.id) }
  }

  return order.map(rootId => {
    const account = getAccountById(rootId)
    const subAccounts = getChildAccounts(rootId)
    // Both, not either. MRG has 16 child accounts AND a United States tree;
    // the either/or form took the accounts (which own nothing) and discarded
    // every location, leaving one bare row. Sub-accounts owning neither systems
    // nor locations are dropped — they are noise, unlike an empty location.
    const subAccountNodes = subAccounts
      .map(sub => ({
        id: sub.id, name: sub.name, type: 'sub-account', levelType: 'Sub-account',
        children: getHierarchyForAccount(sub.id),
      }))
      .filter(n => (n.children || []).length > 0)

    const sources = [...subAccountNodes, ...(getHierarchyForAccount(rootId) || [])]

    const children = sources.map(n => buildNode(n, systemById)).filter(Boolean)
    return {
      id: rootId,
      name: account?.name || rootId,
      kind: 'account',
      levelType: 'Account',
      children,
      // Fall back to the raw bucket for an account whose hierarchy is missing,
      // so the row still shows a truthful system count.
      systems: children.length > 0 ? children.flatMap(c => c.systems) : (byRoot.get(rootId) ?? []),
      l4Id: null,
    }
  }).sort((a, b) => b.systems.length - a.systems.length)
}

/** Keep matching nodes (with their full subtree) plus the ancestors of matches. */
function filterTree(nodes, query) {
  const out = []
  for (const node of nodes) {
    if (node.name.toLowerCase().includes(query)) { out.push(node); continue }
    const children = filterTree(node.children, query)
    if (children.length > 0) out.push({ ...node, children })
  }
  return out
}

/** Ancestor ids of every match — so a hit six levels down is actually visible. */
function collectMatchPath(nodes, query, into) {
  let any = false
  for (const node of nodes) {
    const selfMatch = node.name.toLowerCase().includes(query)
    const childMatch = collectMatchPath(node.children, query, into)
    if (childMatch) into.add(node.id)
    if (selfMatch || childMatch) any = true
  }
  return any
}

/**
 * The frame draws exactly three row glyphs and they say *what kind of thing*,
 * not how deep: briefcase-08 (#0B82F8) for an account, pin-location-03
 * (#90A1B9) for every location depth, photo-sensor-3 (#90A1B9) for a system
 * leaf. A sub-account gets the account glyph — the frame contains no
 * sub-account row, and inventing a fourth glyph for it would be a guess.
 * Branches rather than a dynamic `const Icon = …` so the element type stays
 * static across renders.
 */
function NodeIcon({ node }) {
  // Each glyph sits in its own 14x14 box and is NOT stretched to fill it: the
  // frame insets briefcase-08 to 12.997x11.830 and pin-location-03 to
  // 11.664x12.830 inside that box, which is why the natural asset dimensions
  // are passed explicitly rather than a single square `size`.
  //
  // The box is also what keeps these out of reach of the sidebar recipe's
  // `[&>svg]:size-4` / `[&>svg]:text-sidebar-accent-foreground` rules — those
  // match a DIRECT svg child, and would otherwise resize the glyph to 16 and
  // repaint it blue at a specificity the svg's own class cannot beat.
  if (node.kind === 'system') {
    return (
      <span className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[14px]">
        <PhotoSensor3 size={14} />
      </span>
    )
  }
  if (node.kind === 'account') {
    return (
      <span className="content-stretch flex items-center justify-center relative shrink-0 size-[14px] text-[#0B82F8]">
        <Briefcase08 width={12.9974} height={11.8302} />
      </span>
    )
  }
  return (
    <span className="content-stretch flex items-center justify-center overflow-clip relative shrink-0 size-[14px] text-[#90A1B9]">
      <PinLocation03 width={11.6637} height={12.8304} />
    </span>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export default function WintSidebarV2({ open, onClose }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // v1's NavigationDrawer took currentSystemId as a prop so it could highlight
  // the system you were looking at. Dropping that prop would have quietly lost
  // the highlight, so it is derived from the route instead — same behaviour,
  // and no caller has to remember to pass anything.
  const currentSystemId = (pathname.match(/^\/system\/([^/]+)/) || [])[1] || null
  const ctx = useUserContext() || {}
  const persona = ctx.persona || DEFAULT_PERSONA
  // exploreSystems honours the v1 "explore all" toggle; SYSTEMS is the fallback
  // so this component still renders outside a UserProvider (tests, storybook).
  const systems = Array.isArray(ctx.exploreSystems) ? ctx.exploreSystems : SYSTEMS

  const tree = useMemo(() => buildTree(systems), [systems])
  const alertingIds = useMemo(
    () => new Set(systems.filter(systemIsAlerting).map(s => s.id)),
    [systems],
  )

  // The biggest account starts open — the frame shows one expanded root, and
  // opening onto a wall of collapsed rows wastes the user's first tap.
  // Descend through single-child chains on open and stop at the first level
  // that branches. Seeding only the root showed two rows and a wall of white
  // under a single-account dataset, with every destination two taps away.
  const [expandedIds, setExpandedIds] = useState(() => {
    const open = new Set()
    for (const root of tree) {
      let node = root
      while (node) {
        open.add(node.id)
        const kids = (node.children || []).filter(c => c.kind !== 'system')
        if (kids.length !== 1) break
        node = kids[0]
      }
    }
    return open
  })
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  // The favourite Star is new state with no spec behind it. PERSISTENCE IS
  // UNSPECIFIED: v1 has src/data/favoritesStore.js (localStorage), but nothing
  // says the v2 star is the same list, so it stays component-local until a PRD
  // says otherwise. Stars reset when the drawer unmounts — on purpose.
  const [favourites, setFavourites] = useState(() => new Set())
  const searchRef = useRef(null)

  const trimmed = query.trim().toLowerCase()
  const visibleTree = useMemo(
    () => (trimmed ? filterTree(tree, trimmed) : tree),
    [tree, trimmed],
  )

  // Ancestors of every hit, unioned over the user's own expansion so a match
  // six levels down is actually on screen. Derived rather than pushed into
  // state: a node that leads to a live hit stays open while the query stands.
  const searchPaths = useMemo(() => {
    if (!trimmed) return null
    const paths = new Set()
    collectMatchPath(tree, trimmed, paths)
    return paths
  }, [tree, trimmed])

  // Path down to the system currently on screen, so opening the drawer from a
  // system page shows you where you are instead of a collapsed tree.
  const currentPath = useMemo(() => {
    if (!currentSystemId) return null
    const found = new Set()
    const walk = (nodes, trail) => nodes.some(n => {
      if (n.kind === 'system' && n.id === currentSystemId) {
        trail.forEach(id => found.add(id))
        return true
      }
      return n.children?.length ? walk(n.children, [...trail, n.id]) : false
    })
    walk(tree, [])
    return found
  }, [tree, currentSystemId])

  const openIds = useMemo(() => {
    const base = searchPaths?.size ? new Set([...expandedIds, ...searchPaths]) : expandedIds
    if (!currentPath?.size) return base
    return new Set([...base, ...currentPath])
  }, [expandedIds, searchPaths, currentPath])

  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => { if (searchOpen) searchRef.current?.focus() }, [searchOpen])

  const toggleExpanded = useCallback(id => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const toggleFavourite = useCallback(id => {
    setFavourites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const go = useCallback(path => { navigate(path); onClose?.() }, [navigate, onClose])

  // Row activation. No setSelectedScope anywhere — see the file header.
  const activate = useCallback(node => {
    if (node.kind === 'system') { go(`/system/${node.id}`); return }
    // A leaf location (its children are systems) maps onto the existing
    // /l4/:l4id screen. Above L4 there is no designed location screen and the
    // drawer is forbidden from re-scoping, so those rows expand instead of
    // navigating nowhere — their caret pill is the same affordance.
    if (node.l4Id) { go(`/l4/${node.l4Id}`); return }
    toggleExpanded(node.id)
  }, [go, toggleExpanded])

  const hasAnyLocation = tree.length > 0

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 z-10 transition-opacity duration-[250ms]"
        style={{ background: SCRIM, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
      />

      {/* Panel. Absolute inside the Phone frame (Phone.jsx's DesktopFrame is
          the positioned ancestor). Kept mounted so the slide has something to
          animate; `inert` keeps the off-screen panel out of the tab order. */}
      <div
        role="dialog"
        aria-label="Locations menu"
        aria-hidden={!open}
        inert={!open}
        className="absolute inset-y-0 left-0 z-[11] flex flex-col overflow-hidden transition-transform duration-[250ms]"
        style={{
          width: PANEL_WIDTH_PCT,
          maxWidth: PANEL_MAX_WIDTH,
          backgroundImage: PANEL_BG,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* ── Header · 198378:74015 ───────────────────────────────────────
            The frame puts the Header at y=-2 with a 44px box, so the rule
            lands on y=41..42 of the render — hence h-[42px] here rather than
            the node's nominal 44. */}
        <div className="border-[var(--colors\/slate\/200,#e2e8f0)] border-b border-solid content-stretch flex h-[42px] items-center justify-between px-[var(--spacing\/3,12px)] relative shrink-0">
          <div className="content-stretch flex items-start pl-[6px] relative shrink-0">
            <WintLogo />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="content-stretch flex items-center justify-center relative rounded-[var(--component\/sidebar\/menu-button\/radius,8px)] shrink-0 size-[28px] active:bg-white/60"
          >
            <span className="content-stretch flex items-center justify-center opacity-[var(--opacity-70,0.7)] size-[16px]">
              {/* Lucide x — the frame's asset is byte-for-byte lucide's own
                  M12 4L4 12M4 4L12 12 at stroke 1.33 in a 16 box. lucide-react
                  draws a 24 viewBox at stroke 2, which at width 16 renders the
                  same 1.33px, so the default strokeWidth is already correct. */}
              <X size={16} className="text-[#0A0A0A]" />
            </span>
          </button>
        </div>

        {/* ── "Locations" · 198378:74021 ──────────────────────────────────
            15px below the header rule in the frame (y=42 → y=57). */}
        <div className="content-stretch flex gap-[10px] h-[32px] items-center mt-[15px] px-[16px] relative shrink-0">
          <div className="content-stretch flex flex-[1_0_0] gap-[10px] items-center min-w-px relative">
            <button
              type="button"
              onClick={() => setExpandedIds(new Set())}
              aria-label="Collapse all locations"
              className="content-stretch flex gap-[var(--spacing\/1\,5,6px)] h-[32px] items-center justify-center p-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-default\/radius,10px)] shrink-0 w-[18px] active:bg-white/60"
            >
              <ArrowsInLineVertical size={16} />
            </button>
            <p className="[word-break:break-word] flex-[1_0_0] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/xs\/lh,16px)] min-w-px relative text-[color:var(--colors\/slate\/500,#62748e)] text-[length:var(--text\/xs\/size,12px)]">
              Locations
            </p>
          </div>
          <div className="content-stretch flex gap-[var(--p-0,0px)] items-center relative shrink-0">
            {/* data-open rather than a ternary into cn(): a Figma var() class
                must stay inside a literal JSX attribute or its backslashes are
                eaten — see the escaping note at the top of the file. */}
            <button
              type="button"
              data-open={searchOpen ? 'true' : 'false'}
              onClick={() => { setSearchOpen(v => !v); if (searchOpen) setQuery('') }}
              aria-label="Search locations"
              aria-expanded={searchOpen}
              className="content-stretch flex gap-[var(--spacing\/1\,5,6px)] items-center justify-center p-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-default\/radius,10px)] shrink-0 size-[32px] data-[open=false]:active:bg-white/60 data-[open=true]:bg-white/70"
            >
              {/* The frame flips search-01 vertically (-rotate-180 -scale-x-100
                  on I198378:74026;…;59428:44419). Without it the magnifier
                  renders upside down — bowl low, handle high. */}
              <span className="content-stretch flex items-center justify-center relative shrink-0 size-[16px] text-[#90A1B9] -scale-y-100">
                <Search01 width={13.33} height={13.33} />
              </span>
            </button>
            {/* DELIBERATELY INERT. The filter sheet has no PRD and no designed
                contents, so there is nothing honest to open. Rendered as a
                non-interactive img role for visual parity only. */}
            <span
              role="img"
              aria-label="Filter locations (not implemented)"
              title="Filter — not implemented"
              className="content-stretch flex gap-[var(--spacing\/1\,5,6px)] items-center justify-center p-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-default\/radius,10px)] shrink-0 size-[32px]"
            >
              <FunnelSimple size={16} />
            </span>
          </div>
        </div>

        {/* Search field. NOT in the frame — the frame only designs the search
            button. Kept because WintSidebar already shipped it and Rule 0 of
            the v2-page-parity skill forbids dropping working functionality;
            styled to sit in the same 16px gutter. */}
        {searchOpen && (
          <div className="mt-[8px] px-[16px] shrink-0">
            <Input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search locations and systems"
              aria-label="Search locations and systems"
              className="h-[32px] rounded-[8px] border-[var(--colors\/slate\/200,#e2e8f0)] bg-white/70 text-[14px] shadow-none"
            />
          </div>
        )}

        {/* ── Tree ────────────────────────────────────────────────────────
            11px below the Locations row in the frame (y=89 → y=100), and the
            only scrolling region: Phone.jsx does not scroll, so this owns
            flex:1 / overflowY:auto / minHeight:0. SidebarProvider is required
            by SidebarMenuButton (it reads useSidebar); its wrapper ships
            min-h-svh, which would blow out the 852px frame, so the height
            utilities are overridden here. */}
        <SidebarProvider
          className="mt-[11px] min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain px-[16px] pb-[16px]"
          style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
        >
          {!hasAnyLocation ? (
            /* EMPTY STATE — persona scope resolves to nothing at all. */
            <p className="px-[6px] py-[40px] text-center text-[14px] text-[color:var(--colors\/slate\/400,#90a1b9)]">
              No locations in this account yet.
            </p>
          ) : visibleTree.length === 0 ? (
            /* EMPTY STATE — the search matched nothing. */
            <p className="px-[6px] py-[40px] text-center text-[14px] text-[color:var(--colors\/slate\/400,#90a1b9)]">
              Nothing matches “{query.trim()}”.
            </p>
          ) : (
            <SidebarMenu className="gap-0">
              {visibleTree.map(node => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  expandedIds={openIds}
                  alertingIds={alertingIds}
                  favourites={favourites}
                  currentSystemId={currentSystemId}
                  onActivate={activate}
                  onToggleExpanded={toggleExpanded}
                  onToggleFavourite={toggleFavourite}
                />
              ))}
            </SidebarMenu>
          )}
        </SidebarProvider>

        {/* ── Footer · 198378:74083 ───────────────────────────────────────── */}
        <div className="border-[var(--colors\/slate\/200,#e2e8f0)] border-solid border-t content-stretch flex flex-col gap-[var(--spacing\/2,8px)] items-start p-[var(--spacing\/4,16px)] relative shrink-0">
          <div className="content-stretch flex flex-col gap-[var(--spacing\/1,4px)] items-start relative shrink-0 w-full">
            {/* DELIBERATELY INERT — "Users" and "Reports" have no PRD and no
                designed screen. There is no route to send them to and inventing
                one would be a guess, so they render and do nothing. */}
            <FooterRow icon={<GroupLine size={16} />} label="Users" />
            <FooterRow icon={<ReportAnalytics size={16} />} label="Reports" />
          </div>

          <div className="content-stretch flex items-center justify-between pr-[var(--spacing\/2,8px)] relative shrink-0 w-full">
            <button
              type="button"
              onClick={() => go('/select')}
              className="content-stretch flex flex-[1_0_0] gap-[var(--component\/sidebar\/menu-button\/gap,8px)] h-[49px] items-center min-w-px px-[var(--component\/sidebar\/menu-button\/padding,8px)] py-[var(--component\/sidebar\/menu-button\/py,8px)] relative rounded-[var(--component\/sidebar\/menu-button\/radius,8px)] text-left active:bg-white/60"
            >
              {/* SidebarMediaAsset — 32px, radius 8. The frame fills it with a
                  photo; this app identifies a persona by emoji + tint, so the
                  tile keeps the geometry and carries the persona mark. */}
              <span
                aria-hidden="true"
                className="content-stretch flex items-center justify-center overflow-clip relative rounded-[var(--component\/sidebar\/media-asset\/radius,8px)] shrink-0 size-[32px] text-[18px]"
                style={{ background: persona.bg || '#EEF3FA' }}
              >
                {persona.icon || '👤'}
              </span>
              <span className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start justify-center min-w-px relative text-[color:var(--colors\/slate\/700,#314158)] whitespace-nowrap">
                <span className="font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/sm\/lh-tight,18px)] overflow-hidden relative shrink-0 text-[14px] text-ellipsis w-full">
                  {persona.name}
                </span>
                <span className="font-[var(--font\/weight\/font-normal,400)] leading-[var(--text\/xs\/lh-tight,15px)] overflow-hidden relative shrink-0 text-[12px] text-ellipsis w-full">
                  {persona.email || persona.role}
                </span>
              </span>
              <ChevronsUpDown size={16} className="shrink-0 text-[#0A0A0A]" />
            </button>
            <button
              type="button"
              onClick={() => go('/alerts')}
              aria-label="Alerts"
              // 198378:74089 is a bare 16px glyph. before:-inset-[10px] grows
              // the touch target to 36px without moving a single pixel of it.
              className="content-stretch flex items-center justify-center relative rounded-[var(--component\/sidebar\/menu-button\/radius,8px)] shrink-0 size-[16px] before:absolute before:-inset-[10px] before:content-[''] active:opacity-60"
            >
              <BellDot size={16} className="text-[#314158]" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Tree ───────────────────────────────────────────────────────────────────

function TreeNode({
  node, depth, expandedIds, alertingIds, favourites, currentSystemId,
  onActivate, onToggleExpanded, onToggleFavourite,
}) {
  const isOpen = expandedIds.has(node.id)
  const hasChildren = node.children.length > 0
  const Item = depth === 0 ? SidebarMenuItem : SidebarMenuSubItem

  // Every row occupies a 36px slot — that is the pitch the render measures all
  // the way down the tree (row centres 118, 154, 190, 226…).
  //
  // A system leaf is indented one level LESS than a sibling location and then
  // pays it back with pl-16 instead of pl-6 (198378:74060). That is not a
  // rounding artefact: 198378:74059's item sits at the same x as the location
  // rows above it, and the frame still renders "Fire Riser 2" 10px deeper.
  const pad = node.kind === 'system'
    ? indentFor(Math.max(0, depth - 1))
    : indentFor(depth)

  return (
    <Item className="flex w-full flex-col">
      {/* The 36px slot. Indent lives here so the row itself still reaches the
          panel's right gutter at every depth, which is what the frame does —
          every SidebarMenuSubItem ends flush at x=325 of the 325-wide Content. */}
      <div className="flex h-[36px] w-full items-center" style={{ paddingLeft: pad }}>
        <TreeRow
          node={node}
          depth={depth}
          isOpen={isOpen}
          hasChildren={hasChildren}
          alerting={node.systems.some(s => alertingIds.has(s.id))}
          favourite={favourites.has(node.id)}
          current={node.kind === 'system' && node.id === currentSystemId}
          onActivate={() => onActivate(node)}
          onToggleExpanded={() => onToggleExpanded(node.id)}
          onToggleFavourite={() => onToggleFavourite(node.id)}
        />
      </div>

      {hasChildren && isOpen && (
        // The frame's Separator instances are all ~0.0000016px wide, i.e.
        // collapsed to nothing — there are no indent guides in this design.
        // Indentation is carried by each row's own paddingLeft instead, so the
        // sub list contributes no box of its own.
        <SidebarMenuSub className="mx-0 w-full min-w-0 translate-x-0 gap-0 border-l-0 px-0 py-0">
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              alertingIds={alertingIds}
              favourites={favourites}
              currentSystemId={currentSystemId}
              onActivate={onActivate}
              onToggleExpanded={onToggleExpanded}
              onToggleFavourite={onToggleFavourite}
            />
          ))}
        </SidebarMenuSub>
      )}
    </Item>
  )
}

function TreeRow({
  node, depth, isOpen, hasChildren, alerting, favourite, current,
  onActivate, onToggleExpanded, onToggleFavourite,
}) {
  const isAccount = node.kind === 'account'
  // The frame's white "card" marks the open account (198378:74031); a system
  // row also takes it when it is the one currently on screen (v1 parity).
  const isActive = (isAccount && isOpen) || current

  const row = (
    // A div, not a button: the star and the count pill are real buttons and
    // must not nest inside one.
    <div
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={e => {
        // Only act on keys aimed at THIS row. Enter/Space pressed on the
        // nested star or count-pill buttons bubbles up here, and calling
        // preventDefault() on it cancels the click the browser would have
        // synthesized — so the star silently navigated instead of toggling.
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate() }
      }}
    >
      <NodeIcon node={node} />
      <span className="[word-break:break-word] flex-[1_0_0] min-w-px overflow-hidden relative text-ellipsis whitespace-nowrap">
        {node.name}
      </span>

      {/* Locations only. The frame shows no star on an account row, and an
          account is a scope, not a place you'd pin. */}
      {node.kind === 'location' && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onToggleFavourite() }}
          aria-pressed={favourite}
          aria-label={favourite ? `Unpin ${node.name}` : `Pin ${node.name}`}
          className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px] before:absolute before:-inset-[8px] before:content-['']"
          style={{ color: favourite ? STAR_ON : STAR_OFF }}
        >
          <TablerStar size={16} filled={favourite} />
        </button>
      )}

      {alerting && (
        <span
          role="img"
          aria-label="Active event or alert in this location"
          className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[14px]"
        >
          <LocationDot size={14} />
        </span>
      )}

      {hasChildren && (
        /* shadcn Badge, Type=Secondary (Figma 136:1178 → variant "secondary").
           Rendered as a real button element rather than the Badge component,
           which is a plain div:
           this is the expand affordance and has to be reachable by keyboard.
           Every class the badge recipe would contribute is overridden by the
           frame's own geometry anyway (h-20 / min-w-20 / radius-26 / pl-8
           pr-2 / py-2), so nothing of the primitive is lost but its element.
           Figma pins the pill to w-[34px] and clips a 3-digit count; min-w
           here so "134" stays readable. */
        <button
          type="button"
          data-slot="badge"
          onClick={e => { e.stopPropagation(); onToggleExpanded() }}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.name}`}
          className="content-stretch flex h-[20px] items-center justify-center min-w-[34px] overflow-clip pl-[var(--component\/badge\/px,8px)] pr-[var(--spacing\/0\,5,2px)] py-[var(--component\/badge\/py,2px)] relative rounded-[var(--component\/badge\/radius,26px)] shrink-0"
          style={isActive ? BADGE_TONE_ACTIVE : BADGE_TONE_REST}
        >
          <span className="[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/xs\/lh,16px)] overflow-hidden relative shrink-0 tabular-nums text-[12px] text-ellipsis whitespace-nowrap">
            {node.systems.length}
          </span>
          {isOpen ? <ArrowDropDown size={16} /> : <ArrowDropRight size={16} />}
        </button>
      )}
    </div>
  )

  // 198378:74031 — root account row. Height 36, px-6, gap-8, radius 8, 14px
  // weight-500 ink #0a0a0a, and the active fill is var(--card,white) with NO
  // shadow (the render shows the panel gradient running clean up to the card's
  // edge on all four sides).
  if (depth === 0) {
    return (
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className="content-stretch flex gap-[var(--component\/sidebar\/menu-button\/gap,8px)] h-[36px] items-center overflow-clip px-[var(--spacing\/1\,5,6px)] py-[var(--component\/sidebar\/menu-button\/py,8px)] relative rounded-[var(--component\/sidebar\/menu-button\/radius,8px)] w-full font-[var(--font\/weight\/font-normal,500)] leading-[var(--text\/sm\/lh-none,14px)] text-[14px] text-[color:var(--sidebar\/foreground,#0a0a0a)] hover:bg-white/50 hover:text-[color:var(--sidebar\/foreground,#0a0a0a)] active:bg-white/70 active:text-[color:var(--sidebar\/foreground,#0a0a0a)] data-[active=true]:bg-[var(--card,white)] data-[active=true]:text-[color:var(--sidebar\/foreground,#0a0a0a)] data-[active=true]:shadow-none data-[active=true]:hover:bg-[var(--card,white)]"
      >
        {row}
      </SidebarMenuButton>
    )
  }

  // 198378:74037 — nested row. Height 28, pl-6 pr-6, gap-8, radius 8, 14px
  // weight-400 ink slate-800. 198378:74060 swaps pl-6 for pl-16 on a system.
  return (
    <SidebarMenuSubButton
      asChild
      isActive={isActive}
      // data-leaf, not a ternary into cn(), for the same escaping reason as the
      // search button: `pl-[var(--pro\/space\/5,16px)]` has to reach the DOM
      // with its backslashes intact, so it may only live in a JSX literal.
      data-leaf={node.kind === 'system' ? 'true' : 'false'}
      className="content-stretch cursor-pointer flex gap-[var(--component\/sidebar\/menu-sub-item\/gap,8px)] h-[28px] items-center overflow-clip pr-[var(--spacing\/1\,5,6px)] relative rounded-[var(--component\/sidebar\/menu-sub-item\/radius,8px)] w-full translate-x-0 font-[var(--font\/weight\/font-normal,400)] leading-[var(--text\/sm\/lh-none,14px)] text-[14px] text-[color:var(--colors\/slate\/800,#1d293d)] data-[leaf=false]:pl-[var(--pro\/space\/2,6px)] data-[leaf=true]:pl-[var(--pro\/space\/5,16px)] hover:bg-white/50 hover:text-[color:var(--colors\/slate\/800,#1d293d)] active:bg-white/70 active:text-[color:var(--colors\/slate\/800,#1d293d)] data-[active=true]:bg-[var(--card,white)] data-[active=true]:text-[color:var(--colors\/slate\/800,#1d293d)]"
    >
      {row}
    </SidebarMenuSubButton>
  )
}

/**
 * 198378:74085 / 198378:74086. Height 32, px-8 py-8, gap-8, radius 8, icon 16,
 * label 14px weight-400 slate-700. Inert by design — see the call site.
 */
function FooterRow({ icon, label }) {
  return (
    <div className="content-stretch flex gap-[var(--p-0,0px)] items-center p-[var(--p-0,0px)] relative rounded-[var(--component\/sidebar\/menu-button\/radius,8px)] shrink-0 w-full">
      <div
        aria-disabled="true"
        title={`${label} — no screen designed yet`}
        className="content-stretch flex flex-[1_0_0] gap-[var(--component\/sidebar\/menu-button\/gap,8px)] h-[32px] items-center min-w-px px-[var(--component\/sidebar\/menu-button\/padding,8px)] py-[var(--component\/sidebar\/menu-button\/py,8px)] relative rounded-[var(--component\/sidebar\/menu-button\/radius,8px)]"
      >
        <span className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[16px]">
          {icon}
        </span>
        <span className="[word-break:break-word] flex-[1_0_0] font-[var(--font\/weight\/font-normal,400)] leading-[var(--text\/sm\/lh-none,14px)] min-w-px overflow-hidden relative text-[14px] text-[color:var(--colors\/slate\/700,#314158)] text-ellipsis whitespace-nowrap">
          {label}
        </span>
      </div>
    </div>
  )
}
