/**
 * Wint side menu — v2.
 * Design source: Figma node 198378:73797 "Side menu_option 2" (402x874).
 *
 * Replaces NavigationDrawer visually. The one behavioural difference that
 * matters: this drawer is NAVIGATION ONLY. v1's drawer doubled as the global
 * scope picker (it called setSelectedScope on every location tap, which is why
 * Home silently re-scoped itself behind the user's back). v2 deliberately does
 * not touch UserContext scope at all — picking a row moves the user somewhere,
 * nothing more.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  BellDot, Building2, ChevronsUpDown,
  ClipboardList, FoldVertical, Star, Users,
} from 'lucide-react'
// The frame specifies these explicitly — Lucide lookalikes read noticeably
// different at 14px, which is why the first pass looked off. CloseFill is the
// header's glyph (198378:74018 "Remix Icons / close-fill") and FunnelSimple the
// toolbar's (198378:74027 emits "Phosphor Icons / funnel-simple" — three stacked
// rules, NOT the V-shaped outline that src/v2/icons/Funnel.jsx holds).
//
// src/v2/icons/ArrowDropDownLine.jsx is misnamed: its path is byte-identical to
// Figma's Remix arrow-drop-RIGHT-line, i.e. the COLLAPSED caret, so it is
// aliased here to read truthfully at the call site. The expanded (down) caret
// has no equivalent in src/v2/icons and is inlined below.
import {
  Briefcase08, CloseFill, FunnelSimple, PinLocation03, Search01,
  ArrowDropDownLine as ArrowDropRight,
} from '@/v2/icons'
import { badgeVariants } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub,
  SidebarMenuSubItem, SidebarProvider,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { useUserContext } from '@/context/UserContext'
import { getAccountById, getChildAccounts, getRootAccounts } from '@/data/accounts'
import { getHierarchyForAccount } from '@/data/hierarchy'
import { isIgnored } from '@/data/ignoredIncidents'
import { DEFAULT_PERSONA } from '@/data/personas'
import { SYSTEMS } from '@/data/systems'
import { computeSystemHealth } from '@/utils/systemHealth'

// ── Tokens sampled off the Figma frame ─────────────────────────────────────
// The panel is a cool blue-grey wash, lightest at the top-left and deepest
// just above the footer — a flat fill reads noticeably flatter than the frame.
//
// 198378:74013 "Rectangle 4", the 357x965 fill plate sitting under the whole
// drawer, emits it verbatim: a 125.34deg diagonal with five stops at 0.8 alpha
// over a flat white base layer, so white still reads through at 20%. An earlier
// pass claimed "the design context for this subtree contains no gradient at
// all" and swapped in var(--sidebar) — which index.css resolves to opaque
// #FFFFFF. Re-pulling the node disproves that claim; the gradient is below,
// copied from the node's own backgroundImage.
const PANEL_BG =
  'linear-gradient(125.34006894835755deg, rgba(233, 238, 248, 0.8) 8.3855%, ' +
  'rgba(227, 235, 249, 0.8) 32.2%, rgba(228, 235, 250, 0.8) 40.822%, ' +
  'rgba(212, 226, 255, 0.8) 71.236%, rgba(233, 237, 243, 0.8) 82.858%), ' +
  'linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)'
const DIVIDER = '#E2E8F0'
const ALERT_RED = '#E7000B'
const BRAND = '#0B95F8'
const STAR_ON = '#F5A524'   // same amber the v1 drawer uses for a pinned row

// The App.jsx helper of the same name is module-private and this file may not
// edit App.jsx, so it is restated here rather than dropping a bare <img> into
// the header. Same asset, same BASE_URL rule — keep them in step.
function WintLogo({ width = 52 }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}wint-logo.svg`}
      alt="Wint"
      style={{ width, height: 'auto' }}
    />
  )
}

// ── Inlined Figma glyphs ───────────────────────────────────────────────────
// Figma's asset URLs expire in ~7 days, so nothing may reference them at
// runtime, and src/v2/icons has no match for either of these. Both paths are
// the exported bytes unmodified, recoloured to currentColor so the surrounding
// text-* utility tints them (the raw exports ship #90A1B9 / #45556C).
//
// NOTE: 198378:74060's asset URL serves the WRONG bytes — the "Icon
// Placeholder" wrapper makes get_design_context hand back the generic Lucide
// smile — so photo-sensor-3 must not be re-derived from it. The path below is
// the node export, and is the same one WintSidebarV2.jsx carries.

/** Tabler photo-sensor-3 — the system leaf, 198378:74060. Export framed at x+16, y+7. */
function PhotoSensor3({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <g transform="translate(-16,-7)" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
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

/** Remix arrow-drop-down-line — the EXPANDED badge caret (198378:74031). */
function ArrowDropDown({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <path d="M8 10.0004L5.17155 7.172L6.11436 6.22917L8 8.1148L9.8856 6.22917L10.8284 7.172L8 10.0004Z" fill="currentColor" />
    </svg>
  )
}

// ── Data ───────────────────────────────────────────────────────────────────

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

  // A location is kept even when it currently holds no visible system.
  //
  // This used to `return null` on an empty branch, which silently collapsed the
  // whole tree the moment the dataset had locations but no systems — exactly
  // what happens mid-migration, and it left the drawer showing one bare account
  // row with no navigation at all. This drawer navigates LOCATIONS; systems are
  // leaves and only drive counts and the alert dot. An empty location is a real
  // place the user can still go to, so it stays.
  //
  // The one thing genuinely worth pruning is a location with no children AND no
  // name to show, which is a malformed node rather than an empty place.
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
    // string as the hierarchy node id, so read it off a system rather than off
    // the node. Deliberately id-scheme agnostic: this holds whatever the
    // dataset numbers things as, which matters while the fixtures are being
    // migrated onto the web sandbox's MRG ids.
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

  // Roots were derived ONLY from systems, so a dataset with accounts but no
  // systems produced no roots and the drawer had nothing to navigate. Accounts
  // exist independently of whether a system has been provisioned in them yet —
  // seed the roots from the account list too, and let systems refine the order.
  for (const acct of getRootAccounts()) {
    if (!byRoot.has(acct.id)) { byRoot.set(acct.id, []); order.push(acct.id) }
  }

  return order.map(rootId => {
    const account = getAccountById(rootId)
    // An account can have BOTH child accounts and a location tree of its own.
    // This was an either/or ternary, which meant a root with child accounts had
    // its own locations silently dropped — under MRG (16 child accounts plus a
    // United States tree) that removed the entire location hierarchy and left
    // the drawer with nothing to navigate. Take both.
    //
    // A sub-account that owns neither systems nor locations is noise rather
    // than a place, so it is dropped here. That is different from an empty
    // LOCATION, which buildNode deliberately keeps: a location with no system
    // provisioned yet is still somewhere the user can go.
    const subAccountNodes = getChildAccounts(rootId)
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
      // `?? []` matters now that roots can be seeded from the account list:
      // such a root has no bucket, and the sort below reads .length.
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
 * The frame draws one pin for every location depth and Tabler photo-sensor-3
 * for a system leaf, so the glyph says "what kind of thing", not "how deep".
 * Branches rather than a dynamic `const Icon = ...` so the element type stays
 * static across renders.
 */
function NodeIcon({ node, className }) {
  // 14px, not 16 — the frame sizes every row glyph at 14.
  // 198378:74060 names Tabler photo-sensor-3; lucide Focus was a lookalike with
  // four fewer strokes (it lacks the N/S/E/W ticks).
  if (node.kind === 'system') return <PhotoSensor3 size={14} className={className} />
  if (node.kind === 'account') {
    return node.levelType === 'Sub-account'
      ? <Building2 size={14} className={className} />
      : <Briefcase08 size={14} className={className} style={{ color: BRAND }} />
  }
  return <PinLocation03 size={14} className={className} />
}

// ── Component ──────────────────────────────────────────────────────────────

export default function WintSidebar({ open, onClose }) {
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

  // Open down to the first level that offers a choice.
  //
  // Seeding only the root looked fine under the old fixtures, where the root
  // had several children. MRG has exactly one (United States), so the drawer
  // opened showing two rows and a wall of white — every real destination was
  // two taps away. Descending through single-child chains costs the user
  // nothing (there was no decision to make at those levels) and stops as soon
  // as there is something to choose between, which is what the frame shows.
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
    // A leaf location goes to the v2 location screen, NOT /l4/:l4id — that
    // route renders the v1 L4Screen, so a pixel-matched drawer used to hand the
    // user the old design in a single tap. Figma "Location opt b"
    // (198328:88654) is this app's location screen: the home screen retitled.
    // Note it does not list the apartments under the location the way the v1
    // screen did; no frame on the delivery canvas draws that list.
    if (node.l4Id || node.kind === 'location') {
      go(`/location/${encodeURIComponent(node.name)}`)
      return
    }
    toggleExpanded(node.id)
  }, [go, toggleExpanded])

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 z-10 bg-slate-900/45 transition-opacity duration-[250ms]"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
      />

      {/* Panel. Absolute inside the Phone frame (Phone.jsx is the positioned
          ancestor); 89% / 352 max matches the 358-of-402 frame. */}
      <div
        role="dialog"
        aria-label="Locations menu"
        aria-hidden={!open}
        // Kept mounted so the slide transition has something to animate; inert
        // keeps the off-screen panel out of the tab order while it's hidden.
        inert={!open}
        className="absolute inset-y-0 left-0 z-[11] flex flex-col shadow-[4px_0_24px_rgba(15,23,42,0.22)] transition-transform duration-[250ms]"
        style={{
          width: '89%', maxWidth: 352, backgroundImage: PANEL_BG,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Header · 198378:74015 — 44px tall, px-3. The Logo instance
            (198378:74017) carries its own pl-[6px], so the wordmark still sits
            18px in; dropping that inner pad would shift it left by 4. */}
        <div
          className="flex h-11 shrink-0 items-center justify-between border-b px-3"
          style={{ borderColor: DIVIDER }}
        >
          <span className="flex pl-[6px]">
            <WintLogo width={52} />
          </span>
          {/* 198378:74018 is Remix close-fill at 16px, not the Lucide X. The
              36px wrapper is the tap target, which the frame cannot express;
              -mr-2.5 lands the glyph's right edge 12px from the panel edge,
              where the frame puts it. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="-mr-2.5 flex size-9 items-center justify-center rounded-full text-slate-600 active:bg-slate-900/5"
          >
            <CloseFill size={16} />
          </button>
        </div>

        {/* Locations header row · 198378:74021 "Create wrapper" — a fixed 32px
            row, gap-[10px], px-[16px], with NO vertical padding of its own. The
            frame puts it 15px below the header rule (y=44 → y=59) and the tree
            11px below it (y=32 → y=43), so that spacing is margin here. */}
        <div className="mt-[15px] mb-[11px] flex h-8 shrink-0 items-center gap-[10px] px-4">
          {/* 198378:74023 is 18x32, not a 32px square — the frame's 10px gap
              then lands the label at x=28. */}
          <button
            type="button"
            onClick={() => setExpandedIds(new Set())}
            aria-label="Collapse all locations"
            className="flex h-8 w-[18px] items-center justify-center rounded-md text-slate-400 active:bg-slate-900/5"
          >
            <FoldVertical size={16} />
          </button>
          {/* 198378:74024 is xs/leading-normal/medium: 12px / 500 / lh 16. The
              colour already matched (--colors/slate/500 is #62748e). */}
          <span className="flex-1 text-[12px] font-medium leading-[16px] text-slate-500">Locations</span>
          {/* 198378:74025 holds the two 32px buttons flush (gap-[var(--p-0,0px)]),
              so they need their own gap-0 flex — the row's 10px gap would
              otherwise split them. */}
          <div className="flex shrink-0 items-center gap-0">
            <button
              type="button"
              onClick={() => { setSearchOpen(v => !v); if (searchOpen) setQuery('') }}
              aria-label="Search locations"
              aria-expanded={searchOpen}
              className={cn(
                'flex size-8 items-center justify-center rounded-md active:bg-slate-900/5',
                searchOpen ? 'bg-white/70 text-slate-700' : 'text-slate-500',
              )}
            >
              <Search01 size={16} />
            </button>
            {/* INERT: the filter sheet has no PRD and no designed contents, so
                there is nothing honest to open. Rendered for parity only.
                198378:74027 emits Phosphor funnel-simple in a 16px box. */}
            <span
              role="img"
              aria-label="Filter locations (not implemented)"
              title="Filter — not implemented"
              className="flex size-8 items-center justify-center rounded-md text-slate-400"
            >
              <FunnelSimple size={16} />
            </span>
          </div>
        </div>

        {searchOpen && (
          <div className="shrink-0 px-3 pb-2">
            <Input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search locations and systems"
              aria-label="Search locations and systems"
              className="h-9 rounded-lg border-slate-200 bg-white/80 text-sm shadow-none"
            />
          </div>
        )}

        {/* Tree — the only scrolling region. SidebarProvider is required by
            SidebarMenuButton (it reads useSidebar); its wrapper ships
            min-h-svh, which would blow out the 852px phone frame, so the
            height utilities are overridden here. */}
        <SidebarProvider
          className="w-full min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pb-3"
          style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
        >
          {visibleTree.length === 0 ? (
            <p className="px-2 py-10 text-center text-sm text-slate-400">
              Nothing matches “{query.trim()}”.
            </p>
          ) : (
            <SidebarMenu className="gap-0.5">
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

        {/* Footer · 198378:74083 — a uniform 16px inset with an 8px gap
            between the Users/Reports menu and the persona row. */}
        <div className="flex shrink-0 flex-col gap-2 border-t p-4" style={{ borderColor: DIVIDER }}>
          {/* DELIBERATELY INERT — "Users" and "Reports" have no PRD and no
              designed screen. There is no route to send them to and inventing
              one would be a guess, so they render and do nothing.
              198378:74084 "Menu" stacks them with a 4px gap (y=0, y=36). */}
          <div className="flex flex-col gap-1">
            <FooterRow icon={<Users size={16} className="shrink-0 text-slate-600" />} label="Users" />
            <FooterRow icon={<ClipboardList size={16} className="shrink-0 text-slate-600" />} label="Reports" />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go('/select')}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1.5 text-left active:bg-white/60"
            >
              {/* 198378:74088's SidebarMediaAsset and its Avatar are both 32px.
                  The radius stays at 10: the emitted fallback reads 8px but the
                  resolved component/sidebar/media-asset/radius token is 10. The
                  tile holds persona.icon over persona.bg from @/data/personas —
                  the comp's placeholder photo and "shadcn / m@example.com" are
                  mock and deliberately not adopted. */}
              <span
                className="grid size-8 shrink-0 place-items-center rounded-[10px] text-xl ring-1 ring-slate-900/5"
                style={{ background: persona.bg || '#EEF3FA' }}
                aria-hidden="true"
              >
                {persona.icon || '👤'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-slate-900">{persona.name}</span>
                <span className="block truncate text-[13px] text-slate-500">{persona.email || persona.role}</span>
              </span>
              <ChevronsUpDown size={16} className="shrink-0 text-slate-500" />
            </button>
            <button
              type="button"
              onClick={() => go('/alerts')}
              aria-label="Alerts"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-700 active:bg-white/60"
            >
              {/* 198378:74089 is a 16px bell-dot; the size-9 wrapper above is
                  the tap target and the /alerts handler, which the frame
                  cannot express. */}
              <BellDot size={16} />
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

  return (
    <Item className="relative">
      <TreeRow
        node={node}
        isOpen={isOpen}
        hasChildren={hasChildren}
        alerting={node.systems.some(s => alertingIds.has(s.id))}
        favourite={favourites.has(node.id)}
        current={node.kind === 'system' && node.id === currentSystemId}
        onActivate={() => onActivate(node)}
        onToggleExpanded={() => onToggleExpanded(node.id)}
        onToggleFavourite={() => onToggleFavourite(node.id)}
      />

      {hasChildren && isOpen && (
        <SidebarMenuSub className="relative mx-0 my-0.5 translate-x-0 gap-0.5 border-l-0 py-0 pr-0 pl-3">
          {/* The design's indent guide. Absolute so it doesn't eat a row slot;
              wrapped in an <li> because SidebarMenuSub renders a <ul>. */}
          <li aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[5px]">
            <Separator orientation="vertical" className="bg-slate-300/70" />
          </li>
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
  node, isOpen, hasChildren, alerting, favourite, current,
  onActivate, onToggleExpanded, onToggleFavourite,
}) {
  const isAccount = node.kind === 'account'
  // The frame's white "card" marks the open account; a system row also takes it
  // when it is the one currently on screen (v1 parity). This same flag drives
  // the row's typography and its badge tone — see below.
  const isActive = (isAccount && isOpen) || current

  return (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      className={cn(
        // Geometry off 198378:74031: h-36 gap-8 px-6 radius-8, 14px / lh-14.
        'h-9 w-full gap-2 rounded-[8px] px-1.5 text-[14px] leading-[14px]',
        // Typography is state-keyed, not kind-keyed. Only the active row takes
        // 'Geist:Medium' 500 / --sidebar/foreground #0a0a0a (198378:74031);
        // every resting row — locations, systems and collapsed account rows
        // alike — is 'Geist:Regular' 400 / --colors/slate/800 #1d293d
        // (198378:74037). Applying the active row's typography to all of them
        // was the earlier bug.
        isActive ? 'font-medium text-[#0a0a0a]' : 'font-normal text-[#1d293d]',
        // sidebarMenuButtonVariants ships hover:/active:text-sidebar-accent-foreground,
        // which outranks a bare text colour on specificity — every row flashed
        // blue on hover, and on touch that fires on every single tap. Pin each
        // row's own resting colour in those states too.
        isActive
          ? 'hover:text-[#0a0a0a] active:text-[#0a0a0a]'
          : 'hover:text-[#1d293d] active:text-[#1d293d]',
        'hover:bg-white/60 active:bg-white/80',
        // Still needed even with the conditional above: the cva base sets
        // data-[active=true]:text-sidebar-accent-foreground (blue), which
        // outranks a plain text-* class on specificity.
        'data-[active=true]:bg-[var(--card,white)] data-[active=true]:font-medium data-[active=true]:text-[#0a0a0a]',
        // No drop shadow: 198378:74031 specifies none, and the emitter does
        // emit effects when they exist. It was only ever compensating for the
        // panel being flat white — against PANEL_BG's gradient the white card
        // reads on its own, which is what the frame shows.
        'data-[active=true]:hover:bg-white',
        'data-[active=true]:hover:text-slate-900',
      )}
    >
      {/* A div, not a button: the star and the count pill are real buttons and
          must not nest inside one. */}
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
        <NodeIcon node={node} className={cn('shrink-0', isAccount ? 'text-[#0B95F8]' : 'text-slate-400')} />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>

        {/* Locations only. The frame shows no star on an account row, and an
            account is a scope, not a place you'd pin. */}
        {node.kind === 'location' && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onToggleFavourite() }}
            aria-pressed={favourite}
            aria-label={favourite ? `Unpin ${node.name}` : `Pin ${node.name}`}
            className="-m-1 flex shrink-0 items-center justify-center p-1"
          >
            <Star
              size={15}
              className={favourite ? 'text-[#F5A524]' : 'text-slate-300'}
              style={favourite ? { fill: STAR_ON, color: STAR_ON } : undefined}
            />
          </button>
        )}

        {alerting && (
          <span
            role="img"
            aria-label="Active event or alert in this location"
            className="flex size-3 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(231,0,11,0.16)' }}
          >
            <span className="size-1.5 rounded-full" style={{ background: ALERT_RED }} />
          </span>
        )}

        {hasChildren && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onToggleExpanded() }}
            aria-expanded={isOpen}
            aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.name}`}
            className={cn(
              badgeVariants({ variant: 'secondary' }),
              'shrink-0 gap-0.5 border-0 py-0.5 pl-2 pr-1 text-[12px] font-medium tabular-nums',
              // Keyed off the ACTIVE row, not off node kind. In the frame only
              // the row carrying the white card (198378:74031) gets the pale
              // #f0f4fb pill with a slate-600 count; every other row takes
              // slate-200 + slate-400 — collapsed ACCOUNT rows (198378:74081,
              // 74082) included, and an expanded-but-inactive location
              // (198378:74033) too.
              isActive ? 'bg-[#F0F4FB] text-slate-600' : 'bg-[#E2E8F0] text-slate-400',
            )}
          >
            {node.systems.length}
            {/* 16px in both states. currentColor so each caret inherits its
                pill's ink — #45556c on the active row, #90a1b9 elsewhere,
                which is exactly what 74031 and 74037 draw. */}
            {isOpen
              ? <ArrowDropDown size={16} />
              : <ArrowDropRight size={16} />}
          </button>
        )}
      </div>
    </SidebarMenuButton>
  )
}

function FooterRow({ icon, label }) {
  return (
    <div
      aria-disabled="true"
      title={`${label} — no screen designed yet`}
      // 198378:74085 / 74086 SidebarMenuButton: h-32, gap-8, px-8, radius-8,
      // 14px / 400 / lh-14, --colors/slate/700 #314158. Stays an inert div with
      // aria-disabled — the frame's cursor-pointer is not a licence to invent a
      // route (see the call site).
      className="flex h-8 items-center gap-2 rounded-lg px-2 text-[14px] font-normal leading-[14px] text-slate-700"
    >
      {icon}
      <span className="truncate">{label}</span>
    </div>
  )
}
