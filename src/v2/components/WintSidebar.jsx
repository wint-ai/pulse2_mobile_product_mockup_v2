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
  BellDot, Building2, ChevronRight, ChevronsUpDown,
  ClipboardList, Focus, FoldVertical, Star, Users, X,
} from 'lucide-react'
// The frame specifies these four explicitly — Lucide lookalikes read noticeably
// different at 14px, which is why the first pass looked off.
import {
  Funnel, Briefcase08, PinLocation03, Search01, ArrowDropDownLine,
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
// Measured, not sampled: the design context for this subtree contains no
// gradient at all. Its only fills are var(--card,white) on the active row,
// #f0f4fb on the count badge and #e2e8f0 on the rules. The panel itself is a
// flat near-white wash.
const PANEL_BG = 'var(--sidebar, #ffffff)'
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
 * The frame draws one pin for every location depth and a scan-square for a
 * system leaf, so the glyph says "what kind of thing", not "how deep".
 * Branches rather than a dynamic `const Icon = ...` so the element type stays
 * static across renders.
 */
function NodeIcon({ node, className }) {
  // 14px, not 16 — the frame sizes every row glyph at 14.
  if (node.kind === 'system') return <Focus size={14} className={className} />
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
          width: '89%', maxWidth: 352, background: PANEL_BG,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Header */}
        <div
          className="flex h-[46px] shrink-0 items-center justify-between border-b px-4"
          style={{ borderColor: DIVIDER }}
        >
          <WintLogo width={52} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="-mr-2 flex size-9 items-center justify-center rounded-full text-slate-600 active:bg-slate-900/5"
          >
            <X size={20} />
          </button>
        </div>

        {/* Locations header row */}
        <div className="flex shrink-0 items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setExpandedIds(new Set())}
            aria-label="Collapse all locations"
            className="flex size-8 items-center justify-center rounded-md text-slate-400 active:bg-slate-900/5"
          >
            <FoldVertical size={16} />
          </button>
          <span className="flex-1 text-[15px] text-slate-500">Locations</span>
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
            <Search01 size={18} />
          </button>
          {/* INERT: the filter sheet has no PRD and no designed contents, so
              there is nothing honest to open. Rendered for parity only. */}
          <span
            role="img"
            aria-label="Filter locations (not implemented)"
            title="Filter — not implemented"
            className="flex size-8 items-center justify-center rounded-md text-slate-400"
          >
            <Funnel size={18} />
          </span>
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

        {/* Footer */}
        <div className="shrink-0 border-t px-3 pb-3 pt-2" style={{ borderColor: DIVIDER }}>
          {/* DELIBERATELY INERT — "Users" and "Reports" have no PRD and no
              designed screen. There is no route to send them to and inventing
              one would be a guess, so they render and do nothing. */}
          <FooterRow icon={<Users size={18} className="shrink-0 text-slate-600" />} label="Users" />
          <FooterRow icon={<ClipboardList size={18} className="shrink-0 text-slate-600" />} label="Reports" />

          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => go('/select')}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1.5 text-left active:bg-white/60"
            >
              <span
                className="grid size-10 shrink-0 place-items-center rounded-[10px] text-xl ring-1 ring-slate-900/5"
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
              <BellDot size={20} />
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

  return (
    <SidebarMenuButton
      asChild
      // The frame's white "card" marks the open account; a system row also
      // takes it when it is the one currently on screen (v1 parity).
      isActive={(isAccount && isOpen) || current}
      className={cn(
        // Measured off 198378:74031: h-36 gap-8 px-6 radius-8 text-14/500 #0a0a0a.
        'h-9 w-full gap-2 rounded-[8px] px-1.5 text-[14px] font-medium leading-[14px]',
        'text-[#0a0a0a]',
        // sidebarMenuButtonVariants ships hover:/active:text-sidebar-accent-foreground,
        // which outranks a bare text-slate-800 on specificity — every row flashed
        // blue on hover, and on touch that fires on every single tap. Pin the
        // colour in those states too.
        'hover:bg-white/60 hover:text-[#0a0a0a] active:bg-white/80 active:text-[#0a0a0a]',
        'data-[active=true]:bg-[var(--card,white)] data-[active=true]:font-medium data-[active=true]:text-[#0a0a0a]',
        'data-[active=true]:shadow-[0_1px_3px_rgba(15,23,42,0.08)] data-[active=true]:hover:bg-white',
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
              isAccount ? 'bg-[#F0F4FB] text-slate-600' : 'bg-[#E2E8F0] text-slate-500',
            )}
          >
            {node.systems.length}
            {isOpen
              ? <ArrowDropDownLine size={13} className="text-slate-400" />
              : <ChevronRight size={13} className="text-slate-400" />}
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
      className="flex h-10 items-center gap-3 rounded-lg px-2 text-[15px] text-slate-700"
    >
      {icon}
      <span className="truncate">{label}</span>
    </div>
  )
}
