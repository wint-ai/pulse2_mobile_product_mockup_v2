/**
 * Search — the full-screen scope picker, 2026-11-09.
 *
 * Design source: Figma file YEmjkKS4xaA827Zm8w3oXx,
 *   200047:135517  "Search" (402x844 frame)
 *     200047:135522  Logo            — wint wordmark, 52x29.25
 *     200047:135524  "Select system to show"
 *     200047:135527  InputGroup      — "Search 122 systems"
 *     200047:135873  SidebarMenuButton, ACTIVE  — "All accounts", white pill,
 *                                      blue ink, badge #f0f4fb / slate-600
 *     200047:135888  SidebarMenuButton, rest    — "North Quarter", badge
 *                                      slate-200 / slate-400
 *     200047:135532  SidebarMenuSubItem         — "United States", star + dot
 *     200047:135559  SidebarMenuSubItem, leaf   — "Fire Riser 2", pl-20
 *     200047:136600  nav             — the floating pill, Search active
 *
 * ⚠ get_metadata on 200047:135517 returns a BARE ROOT with no children. That
 *   is the size-cap signature, not an empty frame; get_design_context on the
 *   same node returns the whole populated tree. Drill into a named child if
 *   you need structure - do not re-read the root and conclude it is empty.
 *
 * WHAT THIS SCREEN IS. The account / location / system tree that today lives
 * inside the navigation drawer, promoted to its own tab. The heading is the
 * frame's: "Select system to show".
 *
 * ── REUSED vs DUPLICATED, stated plainly ───────────────────────────────────
 *
 * REUSED, imported, no second copy:
 *   · the DATA. @/data/hierarchy (getHierarchyForAccount) and @/data/accounts
 *     (getRootAccounts, getChildAccounts, getAccountById) are the same public
 *     modules both drawers read. Nothing about the dataset is restated here.
 *     Since 2026-11-09 they are reached THROUGH the imported buildTree rather
 *     than imported into this file directly - one reader instead of two, same
 *     modules, same shape.
 *   · SCOPE. setSelectedScope / clearSelectedScope off @/context/UserContext -
 *     the same context NavigationDrawer.jsx:1015 writes, in the same shape,
 *     so the drawer's own highlight and every scope test see this page's taps.
 *   · the alert oracle. computeSystemHealth + isIgnored, exactly as
 *     WintSidebarV2.jsx's systemIsAlerting composes them.
 *   · favourites. @/data/favoritesStore, the v1 localStorage list - NOT the
 *     component-local Set WintSidebarV2 uses. A drawer can keep stars in
 *     component state because it stays mounted; this is a PAGE and unmounts on
 *     the very tap that uses it, so a local Set would reset every star
 *     immediately. The persisted list is the only honest option here.
 *   · the glyphs. @/v2/icons - Briefcase08, PinLocation03, PhotoSensor3,
 *     LocationDot. Project-owned exports, no Figma asset URL at runtime.
 *   · the shell. @/components/TabBar and the v2-page-parity contract.
 *
 * THE TREE HELPERS ARE IMPORTED, NOT COPIED — 2026-11-09. This section used
 * to head a list of nine DUPLICATED declarations. The fix it asked for has
 * been made:
 *   · buildTree / buildNode / filterTree / collectMatchPath / indentFor /
 *     TablerStar / ArrowDropDown / ArrowDropRight / WintLogo now carry
 *     `export` in src/v2/components/WintSidebarV2.jsx and are imported from
 *     there. Nine copies deleted; nothing in this file restates them. The
 *     export is purely additive - it cannot change that component's render,
 *     and its own suites were re-run to prove it.
 *   · EIGHT of the nine are imported here, not nine: `buildNode` is called
 *     only by `buildTree`, so importing it would be an unused binding. It is
 *     exported all the same, because the nine are one set and a future reader
 *     should not have to wonder why one of them is private.
 *
 *     ⚠ TWO OF THE "BYTE-FOR-BYTE" COPIES HAD ALREADY DRIFTED, which is the
 *       argument for the import made concretely rather than in principle:
 *         · ArrowDropRight's path had LOST a coordinate here
 *           (`L6.22884 9.88593`), so the collapsed caret rendered as a solid
 *           triangle instead of the frame's chevron. The import restores the
 *           exported geometry.
 *         · buildTree / buildNode differed in comment text and in one local
 *           variable. Behaviour was identical; the prose was not.
 *       Neither drift was visible to any test, and neither would ever have
 *       been found by reading one of the two files.
 *
 *     The shaping is NOT a third scope predicate. The branch pruning and the
 *     single-child descent are presentation (which rows to draw); the question
 *     "which systems is the user scoped to" is answered in one place only, by
 *     UserContext, which this file writes and never re-implements.
 *
 *     ⚠ THE IMPORT IS ONE-WAY. WintSidebarV2.jsx must never import from this
 *       file: it is a page, it mounts <TabBar>, and the cycle would pull the
 *       whole footer into a component the drawer renders.
 *
 * ── BEHAVIOUR, and the standing ruling it collides with ────────────────────
 *
 * Picking a row here SETS THE APP'S SCOPE and navigates, the way
 * NavigationDrawer.handleView does. WintSidebarV2 deliberately does not - its
 * header records that v1's drawer re-scoping on every tap is what made Home
 * "silently re-scope itself behind the user's back", so the v2 drawer is
 * navigation only.
 *
 * ⚠ FLAGGED, NOT RESOLVED. The owner's standing ruling is "Scope is picked
 *   ONLY in the navigation drawer." This frame is headed "Select system to
 *   show" and is a tab, so the design moves scope-picking out of the drawer.
 *   That is the owner's call, not this file's. What is built here is what the
 *   frame draws and what the brief asked for; see the report that shipped
 *   with it.
 *
 * ── THE SHELL ──────────────────────────────────────────────────────────────
 *
 * Root is flex-1 / min-h-0 / flex-col; the TREE is the one element carrying
 * flex-1 / overflow-y-auto / min-h-0; the wordmark, heading and field are
 * shrink-0 siblings above it. No min-h-screen - Phone.jsx is a fixed 393x852
 * overflow-hidden frame and 100vh is simply clipped.
 *
 * NO HEADER BAR. The frame draws the wordmark, not an AppHeaderBar, and the
 * standing rule is never to draw a state the frame lacks. The frame has no
 * burger and no dismissal affordance either, so this page draws neither (if
 * one is ever added it is Back, never X) and mounts no NavigationDrawer: the
 * tree IS the drawer's content, and a drawer over it would be the same picker
 * twice.
 *
 * ⚠ NO paddingBottom: TAB_BAR_CLEARANCE. Since b3f5a31 (2026-11-08) the tab
 *   bar's HOST reserves the 93px strip as real column. A screen that pays it
 *   again double-reserves and leaves ~186px of dead space;
 *   tabBarFloatingClearance.dom.test.jsx fails any screen that does.
 *
 * FLUID, NOT 402. The frame is 402 wide and the shell is 393
 * (src/components/Phone.jsx), so every width here is w-full on a 16px gutter.
 * Every row label is flex-[1_0_0] min-w-px truncate - a long location name
 * ellipsises inside its own box rather than pushing the badge off the right
 * edge, which is the bug that was fixed yesterday.
 *
 * COPY. "Select system to show" and "Search N systems" are transcribed from
 * the frame, which is the approved source - §0 of wint-ui-copy forbids
 * authoring either. The count is bound to real data, never 122, and carries
 * toLocaleString plus a singular form. NEW COPY: neither string is in
 * en.json; both are the frame's and both are on the sign-off list.
 */
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import TabBar from '@/components/TabBar'
import { Input } from '@/components/ui/input'
import { useUserContext } from '@/context/UserContext'
import { getFavorites, toggleFavorite } from '@/data/favoritesStore'
import { isIgnored } from '@/data/ignoredIncidents'
import { SYSTEMS } from '@/data/systems'
import { Briefcase08, LocationDot, PhotoSensor3, PinLocation03 } from '@/v2/icons'
import { computeSystemHealth } from '@/utils/systemHealth'
/* THE FORK IS GONE — 2026-11-09. These nine were module-private in
   WintSidebarV2.jsx and copied in here because that file was outside the
   previous change's ownership; they are now exported and imported, and the
   copies are deleted. See THE TREE HELPERS ARE IMPORTED in the header.

   @/data/accounts and @/data/hierarchy are no longer imported HERE because
   buildTree / buildNode were the only readers, and they now live in the module
   that already imports them. The data path is unchanged: this page still
   builds its tree out of hierarchy.js and accounts.js, through one
   implementation instead of two. */
import {
  ArrowDropDown,
  ArrowDropRight,
  TablerStar,
  WintLogo,
  buildTree,
  collectMatchPath,
  filterTree,
  indentFor,
} from '@/v2/components/WintSidebarV2'

// ── Measured constants ─────────────────────────────────────────────────────
// Sampled from the frame exactly as WintSidebarV2.jsx samples the side-menu
// frame, and bound to the same tokens so they follow the theme rather than
// freezing light. No new token is introduced by this file.

/** Badge on the ACTIVE row — 200047:135873: #f0f4fb fill, slate-600 ink. */
const BADGE_TONE_ACTIVE = {
  background: 'var(--chip-bg)',
  color: 'var(--slate-600)',
}
/** Every other badge — 200047:135888 and below: slate-200 fill, slate-400 ink. */
const BADGE_TONE_REST = {
  background: 'var(--slate-200)',
  color: 'var(--slate-400)',
}

/* The Tabler star ships #90A1B9, which is exactly --slate-400, so an unpinned
   star follows the ramp. The pinned amber is a semantic accent and stays amber
   under every theme — same reasoning as --ink-on-color in src/index.css. */
const STAR_OFF = 'var(--slate-400)'
const STAR_ON = '#f5a524'

/* briefcase-08 under the active row (200047:135873) exports stroked #0B82F8;
   under 200047:135888 the byte-identical geometry is stroked #90A1B9. */
const ACCOUNT_GLYPH_ACTIVE = '#0B82F8'
const ACCOUNT_GLYPH_REST = '#90A1B9'

/** Every row occupies the same 38px slot — the pitch the render measures all
 *  the way down the frame (row centres 210, 249, 287, 328, 366, 405…). */
const ROW_SLOT = 38

/* The synthetic "All accounts" row's identity. A sentinel rather than null so
   `activeId` can name it the way it names any other row. Declared up here
   because `activeId` reads it. */
const ALL_ACCOUNTS_ID = '__all_accounts__'

// ── Data ───────────────────────────────────────────────────────────────────
// buildTree / buildNode / filterTree / collectMatchPath are IMPORTED from
// WintSidebarV2.jsx (see the header) — there is no second copy to keep in step
// any more. What is still local below is the alert oracle, which composes two
// shared modules rather than restating either.

/**
 * RED DOT RULE. A location row is dotted when anything in its subtree is live.
 * computeSystemHealth is the shared "is this a real Water Event" oracle (it
 * already drops ignored incidents), so this page and the system page can never
 * disagree. Config drift with no alert attached is deliberately NOT a dot: the
 * dot means "something is happening here", not "something is mis-set up here".
 */
function systemIsAlerting(sys) {
  if (computeSystemHealth(sys).isLeak) return true
  return !!sys.alert && !isIgnored(sys.id)
}

/**
 * The frame draws exactly three row glyphs and they say *what kind of thing*,
 * not how deep: briefcase-08 for an account, pin-location-03 for every
 * location depth, photo-sensor-3 for a system leaf. Branches rather than a
 * dynamic `const Icon = …` so the element type stays static across renders.
 *
 * Each glyph sits in its own 14x14 box and is NOT stretched to fill it: the
 * frame insets briefcase-08 to 12.997x11.830 and pin-location-03 to
 * 11.664x12.830, which is why the natural dimensions are passed explicitly.
 */
function NodeIcon({ node, depth = 0, active = false }) {
  if (node.kind === 'system') {
    return (
      <span className="flex shrink-0 items-center justify-center overflow-clip size-[14px]">
        <PhotoSensor3 size={14} className="text-slate-400" />
      </span>
    )
  }
  if (node.kind === 'account') {
    // An inline `style`, not a class: a conditional tint through cn() would
    // lose the escaping this family of classes depends on.
    return (
      <span
        className="flex shrink-0 items-center justify-center size-[14px]"
        style={{ color: depth === 0 && !active ? ACCOUNT_GLYPH_REST : ACCOUNT_GLYPH_ACTIVE }}
      >
        <Briefcase08 width={12.9974} height={11.8302} />
      </span>
    )
  }
  return (
    <span className="flex shrink-0 items-center justify-center overflow-clip size-[14px] text-slate-400">
      <PinLocation03 width={11.6637} height={12.8304} />
    </span>
  )
}

// ── Rows ───────────────────────────────────────────────────────────────────

/**
 * One row. A div with role="button", not a <button>: the star and the count
 * pill are real buttons and must not nest inside one.
 *
 * EVERY TAPPABLE ELEMENT IN THE FRAME IS WIRED, and there are exactly three
 * per row:
 *   · the row body      → onActivate — sets scope and navigates
 *   · the star          → onToggleFavourite — writes @/data/favoritesStore
 *   · the count badge   → onToggleExpanded — expand / collapse
 * The red dot is the only mark that is deliberately inert: it is a readout of
 * "something is live here", not a control, so it is role="img" with the
 * meaning in its accessible name (colour is never the only cue).
 */
function TreeRow({
  node, depth, isOpen, hasChildren, alerting, favourite, active,
  onActivate, onToggleExpanded, onToggleFavourite,
}) {
  const isAccount = node.kind === 'account'
  const isSystem = node.kind === 'system'

  return (
    <div
      role="button"
      tabIndex={0}
      data-scope-row={node.id}
      data-active={active ? 'true' : 'false'}
      aria-current={active ? 'true' : undefined}
      onClick={onActivate}
      onKeyDown={e => {
        // Only act on keys aimed at THIS row. Enter/Space on the nested star
        // or badge bubbles up here, and preventDefault() on it would cancel
        // the click the browser synthesizes — so the star would navigate
        // instead of toggling.
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate() }
      }}
      /* 200047:135873 (active) is rounded-[16px] on --card; 200047:135888 and
         every SidebarMenuSubItem below it are rounded-[8px] with no fill. The
         active ink is the wint blue the frame paints on "All accounts". */
      className={
        isSystem
          ? 'flex h-[28px] w-full cursor-pointer items-center gap-[8px] rounded-[8px] pl-[20px] pr-[6px] text-[16px] font-normal leading-[24px] text-slate-800 hover:bg-card/50 active:bg-card/70'
          : active
            ? 'flex w-full cursor-pointer items-center gap-[8px] rounded-[16px] bg-card px-[6px] text-[16px] font-semibold leading-[24px] text-primary ' + (depth === 0 ? 'h-[32px]' : 'h-[28px]')
            : 'flex w-full cursor-pointer items-center gap-[8px] rounded-[8px] px-[6px] text-[16px] font-normal leading-[24px] text-slate-800 hover:bg-card/50 active:bg-card/70 ' + (depth === 0 ? 'h-[32px]' : 'h-[28px]')
      }
    >
      <NodeIcon node={node} depth={depth} active={active} />

      {/* flex-[1_0_0] + min-w-px + truncate, never shrink-0: a long location
          name ellipsises inside its own box instead of pushing the badge past
          the right edge. check-text-overflow.mjs fails the shrink-0 form. */}
      <span className="flex-[1_0_0] min-w-px overflow-hidden text-ellipsis whitespace-nowrap [word-break:break-word]">
        {node.name}
      </span>

      {/* Locations only. The frame shows no star on an account row, and an
          account is a scope rather than a place you would pin. */}
      {node.kind === 'location' && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onToggleFavourite() }}
          aria-pressed={favourite}
          aria-label={favourite ? `Unpin ${node.name}` : `Pin ${node.name}`}
          className="relative flex shrink-0 items-center justify-center size-[16px] before:absolute before:-inset-[8px] before:content-['']"
          style={{ color: favourite ? STAR_ON : STAR_OFF }}
        >
          <TablerStar size={16} filled={favourite} />
        </button>
      )}

      {alerting && (
        <span
          role="img"
          aria-label="Active event or alert in this location"
          className="flex shrink-0 items-center justify-center overflow-clip size-[14px]"
        >
          <LocationDot size={14} className="text-red-600" />
        </span>
      )}

      {hasChildren && (
        /* shadcn Badge, Type=Secondary (Figma 136:1178) rendered as a real
           button rather than the Badge div: this is the expand affordance and
           has to be reachable by keyboard. Every class the badge recipe would
           contribute is overridden by the frame's own geometry anyway.
           Figma pins the pill to w-[34px] and clips a 3-digit count; min-w
           here so "134" stays readable. */
        <button
          type="button"
          data-slot="badge"
          data-scope-badge={node.id}
          onClick={e => { e.stopPropagation(); onToggleExpanded() }}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.name}`}
          className="flex h-[20px] min-w-[34px] shrink-0 items-center justify-center overflow-clip rounded-[26px] py-[2px] pl-[8px] pr-[2px]"
          style={active ? BADGE_TONE_ACTIVE : BADGE_TONE_REST}
        >
          <span className="min-w-px overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-medium leading-[16px] tabular-nums">
            {node.systems.length.toLocaleString('en-US')}
          </span>
          {isOpen ? <ArrowDropDown size={16} /> : <ArrowDropRight size={16} />}
        </button>
      )}

      {/* An account row the frame draws with no badge still needs the caret:
          without it a collapsed account has no visible way to open. Only when
          it genuinely has no children does it get nothing. */}
      {!hasChildren && isAccount && (
        <span className="shrink-0 text-slate-400"><ArrowDropRight size={16} /></span>
      )}
    </div>
  )
}

function TreeNode({
  node, depth, expandedIds, alertingIds, favouriteIds, activeId,
  onActivate, onToggleExpanded, onToggleFavourite,
}) {
  const isOpen = expandedIds.has(node.id)
  const hasChildren = node.children.length > 0

  /* A system leaf is indented one level LESS than a sibling location and pays
     it back with pl-[20px] instead of pl-[6px] — that is what puts "Fire Riser
     2" at the frame's measured 64px while "360 Magnolia Row" sits at 52. */
  const pad = node.kind === 'system'
    ? indentFor(Math.max(0, depth - 1))
    : indentFor(depth)

  return (
    <li className="flex w-full list-none flex-col">
      {/* The 38px slot. The indent lives HERE so the row itself still reaches
          the 16px right gutter at every depth, which is what the frame does —
          every SidebarMenuSubItem ends flush at the content column's edge. */}
      <div className="flex w-full items-center" style={{ height: ROW_SLOT, paddingLeft: pad }}>
        <TreeRow
          node={node}
          depth={depth}
          isOpen={isOpen}
          hasChildren={hasChildren}
          alerting={node.systems.some(s => alertingIds.has(s.id))}
          favourite={favouriteIds.has(node.id)}
          active={node.id === activeId}
          onActivate={() => onActivate(node)}
          onToggleExpanded={() => onToggleExpanded(node.id)}
          onToggleFavourite={() => onToggleFavourite(node)}
        />
      </div>

      {hasChildren && isOpen && (
        /* The frame's Separator instances are all ~0.0000016px wide, i.e.
           collapsed to nothing — there are no indent guides in this design.
           Indentation is carried by each row's own paddingLeft, so the sub
           list contributes no box of its own. */
        <ul className="m-0 flex w-full min-w-0 list-none flex-col p-0">
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              alertingIds={alertingIds}
              favouriteIds={favouriteIds}
              activeId={activeId}
              onActivate={onActivate}
              onToggleExpanded={onToggleExpanded}
              onToggleFavourite={onToggleFavourite}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const navigate = useNavigate()
  const ctx = useUserContext() || {}
  const { setSelectedScope, clearSelectedScope, selectedScope } = ctx
  // exploreSystems honours the v1 "explore all" toggle; SYSTEMS is the
  // fallback so this page still renders outside a UserProvider.
  const systems = Array.isArray(ctx.exploreSystems) ? ctx.exploreSystems : SYSTEMS

  const tree = useMemo(() => buildTree(systems), [systems])
  const alertingIds = useMemo(
    () => new Set(systems.filter(systemIsAlerting).map(s => s.id)),
    [systems],
  )

  /* Favourites come from the persisted v1 store, so a star survives the
     navigation this page's own taps cause. The version counter is bumped on
     every toggle, which is what re-reads the list. */
  const [favouritesVersion, setFavouritesVersion] = useState(0)
  const favouriteIds = useMemo(
    () => new Set(getFavorites().map(f => f.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [favouritesVersion],
  )

  /* The biggest account starts open — the frame shows one expanded root, and
     opening onto a wall of collapsed rows wastes the user's first tap.
     Descend through single-child chains and stop at the first level that
     branches, or a single-account dataset shows two rows and a wall of white
     with every destination two taps away. */
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
  const [query, setQuery] = useState('')

  const trimmed = query.trim().toLowerCase()
  const visibleTree = useMemo(
    () => (trimmed ? filterTree(tree, trimmed) : tree),
    [tree, trimmed],
  )

  /* Ancestors of every hit, unioned over the user's own expansion so a match
     six levels down is actually on screen. Derived rather than pushed into
     state: a node that leads to a live hit stays open while the query stands,
     and `react-hooks/set-state-in-effect` is an error in this config. */
  const searchPaths = useMemo(() => {
    if (!trimmed) return null
    const paths = new Set()
    collectMatchPath(tree, trimmed, paths)
    return paths
  }, [tree, trimmed])

  const openIds = useMemo(
    () => (searchPaths?.size ? new Set([...expandedIds, ...searchPaths]) : expandedIds),
    [expandedIds, searchPaths],
  )

  /* Which row wears the white pill. Read off the SAME global scope the taps
     below write, so the highlight cannot disagree with the app — the drawer
     derives its highlight the same way (NavigationDrawer.jsx:845). A
     system-typed scope is stored as `system-<id>`, which no location node
     carries, so it is unwrapped before comparison. */
  const activeId = useMemo(() => {
    if (!selectedScope?.id) return ALL_ACCOUNTS_ID
    if (selectedScope.levelType === 'system') return selectedScope.systemIds?.[0] ?? null
    return selectedScope.id
  }, [selectedScope])

  const toggleExpanded = useCallback(id => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const toggleFavourite = useCallback(node => {
    toggleFavorite({
      kind: node.kind === 'system' ? 'system' : 'location',
      id: node.id,
      name: node.name,
      levelType: node.levelType,
    })
    setFavouritesVersion(v => v + 1)
  }, [])

  /**
   * THE WHOLE POINT OF THE SCREEN. Picking a row sets the app's real scope and
   * navigates, in the same shape NavigationDrawer.handleView writes
   * (NavigationDrawer.jsx:1015) and SystemDetail's mount effect writes for a
   * system (SystemDetail.jsx:574).
   *
   * Two writes, not one, because this app reads scope in two places:
   *   · UserContext.selectedScope — v1 screens, the drawer's own highlight,
   *     and the scopePersists* tests.
   *   · the ROUTE — the v2 pages scope off :locationName
   *     (HomeAllAccounts.jsx:653), not off the context.
   * Writing only one of them is the picker that looks right and selects
   * nothing.
   *
   * `ancestors` is the location-name chain root-to-leaf, the string[] shape
   * both of those call sites store; ScopeHeader reads only its length.
   */
  const activate = useCallback((node, ancestors = []) => {
    if (node.kind === 'system') {
      const sys = node.systems[0]
      setSelectedScope?.({
        id: `system-${node.id}`,
        name: node.name,
        levelType: 'system',
        ancestors,
        systems: sys ? [sys] : [],
        systemIds: [node.id],
      })
      navigate(`/system/${node.id}`)
      return
    }
    setSelectedScope?.({
      id: node.id,
      name: node.name,
      levelType: node.levelType,
      ancestors,
      systems: node.systems,
      systemIds: node.systems.map(s => s.id),
    })
    navigate(`/location/${encodeURIComponent(node.name)}`)
  }, [navigate, setSelectedScope])

  /* "All accounts" — 200047:135873, the row the frame draws SELECTED. In this
     app all-accounts is the ABSENCE of a scope, so it clears rather than sets
     one, and goes to the dashboard that renders it. */
  const selectAllAccounts = useCallback(() => {
    if (clearSelectedScope) clearSelectedScope()
    else setSelectedScope?.(null)
    navigate('/')
  }, [clearSelectedScope, setSelectedScope, navigate])

  /* Its caret is the frame's chevron-DOWN, i.e. the tree below is expanded.
     Tapping it collapses everything; tapping it again re-opens the roots, so
     the affordance is real in both directions rather than one-way. */
  const allAccountsOpen = expandedIds.size > 0
  const toggleAllAccounts = useCallback(() => {
    setExpandedIds(prev => (prev.size > 0 ? new Set() : new Set(tree.map(t => t.id))))
  }, [tree])

  /** The "All accounts" row's node, shaped like any other so TreeRow needs no
   *  special case. Its badge is the REAL total, never the frame's 8. */
  const allAccountsNode = useMemo(() => ({
    id: ALL_ACCOUNTS_ID,
    name: 'All accounts',
    kind: 'account',
    levelType: 'Account',
    children: [],
    systems,
    l4Id: null,
  }), [systems])

  /* The placeholder's count, bound to real data — never the frame's 122.
     Singular and plural both written; toLocaleString per the format rules. */
  const systemCount = systems.length
  const searchPlaceholder = systemCount === 1
    ? 'Search 1 system'
    : `Search ${systemCount.toLocaleString('en-US')} systems`

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[image:var(--app-bg)]">
      {/* ── Chrome · wordmark + heading + field ──────────────────────────
          shrink-0 siblings, NOT sticky: they sit outside the scroller
          already. No AppHeaderBar — the frame draws the wordmark instead,
          and no burger, so there is none to wire. */}
      <div className="flex shrink-0 flex-col gap-[13px] px-[16px] pt-[10px]">
        <div className="flex items-start">
          <WintLogo />
        </div>

        {/* 200047:135524 — 18px semibold, slate-600, -0.45px tracking. */}
        <h1 className="overflow-hidden text-ellipsis whitespace-nowrap text-[18px] font-semibold leading-[24.75px] tracking-[-0.45px] text-slate-600">
          Select system to show
        </h1>

        {/* 200047:135527 InputGroup — h-36, radius 26, slate-300 hairline,
            12px left inset. The frame's px-[8px] wrapper is the 8px below. */}
        <div className="flex items-center px-[8px]">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-[36px] w-full rounded-[26px] border-slate-300 bg-card/70 pl-[12px] text-[14px] leading-[20px] shadow-none"
          />
        </div>
      </div>

      {/* ── The tree · the ONE scroll container ──────────────────────────
          flex-1 / overflow-y-auto / min-h-0. NO pb-[93px]: the tab bar's
          host reserves that strip itself since b3f5a31. */}
      <div className="mt-[13px] flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain px-[16px] pb-[16px]">
        <ul className="m-0 flex w-full list-none flex-col p-0 px-[8px]">
          {/* "All accounts" · 200047:135873. Not part of the tree data: it is
              the no-scope row, so it is rendered rather than built. */}
          <li className="flex w-full list-none flex-col">
            <div className="flex w-full items-center" style={{ height: ROW_SLOT }}>
              <TreeRow
                node={allAccountsNode}
                depth={0}
                isOpen={allAccountsOpen}
                hasChildren={tree.length > 0}
                alerting={false}
                favourite={false}
                active={activeId === ALL_ACCOUNTS_ID}
                onActivate={selectAllAccounts}
                onToggleExpanded={toggleAllAccounts}
                onToggleFavourite={() => {}}
              />
            </div>
          </li>

          {tree.length === 0 ? (
            /* EMPTY STATE — the persona's scope resolves to nothing at all. */
            <p className="px-[6px] py-[40px] text-center text-[14px] text-slate-400">
              No locations in this account yet.
            </p>
          ) : visibleTree.length === 0 ? (
            /* EMPTY STATE — the search matched nothing. */
            <p className="px-[6px] py-[40px] text-center text-[14px] text-slate-400">
              Nothing matches &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            visibleTree.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                expandedIds={openIds}
                alertingIds={alertingIds}
                favouriteIds={favouriteIds}
                activeId={activeId}
                onActivate={activate}
                onToggleExpanded={toggleExpanded}
                onToggleFavourite={toggleFavourite}
              />
            ))
          )}
        </ul>
      </div>

      {/* A bottom bar absent from a Figma frame is still mounted in code —
          200047:136600 IS this bar, drawn with Search active. */}
      <TabBar activeTab="search" />
    </div>
  )
}
