// Shared navigation drawer — Option D design (minimal list + tree guides)
// Used on Home (HomeUnified) and System Detail page

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserContext } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { getAccountById, getChildAccounts } from '../data/accounts';
import { getHierarchyForAccount } from '../data/hierarchy';
import { computeSystemHealth } from '../utils/systemHealth';
import { getFavorites, isFavorited, toggleFavorite } from '../data/favoritesStore';
import { useDataRefresh } from '../utils/useDataRefresh';

function MIcon({ name, size = 18, fill = false, color, style = {} }) {
  return (
    <span className="material-symbols-outlined"
      style={{ fontSize: size, fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0", color, lineHeight: 1, ...style }}
    >{name}</span>
  );
}

// Star button — tap to toggle favorite. Called from every row that can be
// pinned (system rows + location rows). Calls the store, then bumps the
// parent-provided `onChange` so the drawer re-renders the Favorites section.
const STAR_COLOR = '#F5A524';
function StarButton({ entry, onChange, theme }) {
  const starred = isFavorited(entry.kind, entry.id);
  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(entry);
        onChange?.();
      }}
      title={starred ? 'Remove from favorites' : 'Add to favorites'}
      style={{
        flexShrink: 0, zIndex: 1, cursor: 'pointer',
        width: 36, height: 36,
        margin: '-9px -4px -9px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <MIcon name="star" size={18} fill={starred}
        color={starred ? STAR_COLOR : (theme.drawerTextSub || theme.textTertiary)} />
    </span>
  );
}

// Map hierarchy levelType → icon
function iconForLevel(levelType) {
  switch (levelType) {
    case 'Account':       return { name: 'domain',          fill: true,  color: '#0B95F8' };
    case 'Sub-account':   return { name: 'corporate_fare',  fill: false, color: '#04ADEF' };
    case 'Country':       return { name: 'public',          fill: false };
    case 'Region':        return { name: 'map',             fill: false };
    case 'District':      return { name: 'map',             fill: false };
    case 'Area':          return { name: 'map',             fill: false };
    case 'Province':      return { name: 'map',             fill: false };
    case 'Emirate':       return { name: 'map',             fill: false };
    case 'Business District': return { name: 'map',         fill: false };
    case 'City':          return { name: 'location_city',   fill: false };
    case 'Airport':       return { name: 'flight',          fill: false };
    case 'Building':      return { name: 'apartment',       fill: true };
    case 'Tower':         return { name: 'apartment',       fill: true };
    case 'Terminal':      return { name: 'apartment',       fill: true };
    case 'Mall':          return { name: 'store',           fill: true };
    case 'Campus':        return { name: 'apartment',       fill: true };
    case 'Floor':         return { name: 'layers',          fill: false };
    default:              return { name: 'place',           fill: false };
  }
}

function collectSystemIds(node) {
  if (node.type === 'system') return [node.id];
  if (!node.children) return [];
  return node.children.flatMap(c => collectSystemIds(c));
}

function getAccountTiles(systems) {
  const map = {};
  systems.forEach(s => {
    const acc = getAccountById(s.account);
    const rootId = acc?.parentId || s.account;
    const rootAcc = getAccountById(rootId) || acc;
    if (!map[rootId]) map[rootId] = { id: rootId, name: rootAcc?.name || rootId, levelType: 'Account', systems: [], children: null };
    map[rootId].systems.push(s);
  });
  Object.keys(map).forEach(rootId => {
    const childAccounts = getChildAccounts(rootId);
    // An account's OWN locations always belong under it. Previously they were
    // attached only when it had no child accounts, so a parent account that
    // holds both (MRG: 16 sub-accounts plus its own United States tree) lost
    // its entire location tree from the drawer.
    const ownHierarchy = getHierarchyForAccount(rootId) || [];
    const subAccountTiles = childAccounts
      .map(ca => ({
        id: ca.id, name: ca.name, type: 'sub-account', levelType: 'Sub-account',
        systems: map[rootId].systems.filter(s => s.account === ca.id),
        children: getHierarchyForAccount(ca.id),
      }))
      // Drop sub-accounts with nothing under them rather than rendering a row
      // that expands to nothing.
      .filter(t => t.systems.length > 0 || (t.children && t.children.length > 0));
    map[rootId].children = [...ownHierarchy, ...subAccountTiles];
  });
  return Object.values(map).sort((a, b) => b.systems.length - a.systems.length);
}

function getHierarchyTiles(children, allSystems) {
  if (!children || children.length === 0) return [];
  const allSystemMap = {};
  allSystems.forEach(s => { allSystemMap[s.id] = s; });
  return children.map(child => {
    const sysIds = collectSystemIds(child);
    const systems = sysIds.map(id => allSystemMap[id]).filter(Boolean);
    return { id: child.id, name: child.name, levelType: child.levelType || null, systems, children: child.children || [] };
  }).filter(t => t.systems.length > 0);
}

function pruneRootTiles(accountTiles, visibleSystems) {
  const visibleIds = new Set(visibleSystems.map(s => s.id));
  const sysMap = {};
  visibleSystems.forEach(s => { sysMap[s.id] = s; });

  function collectLeaves(node) {
    if (!node.children || node.children.length === 0) return [];
    if (node.children.some(c => c.type === 'system')) {
      const visibleHere = node.children.filter(c => c.type === 'system' && visibleIds.has(c.id));
      if (visibleHere.length === 0) return [];
      return [{ id: node.id, name: node.name, levelType: node.levelType || null, systems: visibleHere.map(c => sysMap[c.id]).filter(Boolean), children: node.children }];
    }
    return node.children.filter(c => c.type !== 'system').flatMap(c => collectLeaves(c));
  }

  /**
   * Descend past levels that offer no choice (a single child location) and
   * stop at the first level that actually branches.
   *
   * This used to flatten straight to leaf locations. With a single-account
   * dataset that threw away every intermediate level: MRG's "Office" and
   * "Residential" divisions collapsed into one flat list of 17 buildings, and
   * the drawer had no nested rows at all. Skipping only redundant levels keeps
   * the split the web's sidebar shows.
   */
  function descendToFirstBranch(nodes) {
    let level = (nodes || []).filter(n => n.type !== 'system');
    while (level.length === 1) {
      const only = level[0];
      const kids = only.children || [];
      // A node that holds systems directly is a real destination — stop here.
      if (kids.some(c => c.type === 'system')) break;
      const childLocations = kids.filter(c => c.type !== 'system');
      if (childLocations.length === 0) break;
      level = childLocations;
    }
    return level;
  }

  if (accountTiles.length > 1) {
    return { prunedTiles: accountTiles.map(a => ({ id: a.id, name: a.name, levelType: a.levelType, systems: a.systems, children: a.children })), prunedPath: [] };
  }

  const acc = accountTiles[0];
  if (!acc) return { prunedTiles: [], prunedPath: [] };

  const branch = descendToFirstBranch(acc.children);
  const branchTiles = getHierarchyTiles(branch, visibleSystems);
  if (branchTiles.length > 0) {
    return { prunedTiles: branchTiles, prunedPath: [{ name: acc.name, systems: visibleSystems, children: null }] };
  }

  // Nothing branched (or nothing visible under it) — fall back to the old
  // leaf-flattening behaviour so a flat single-account dataset still renders.
  const leaves = (acc.children || []).flatMap(c => collectLeaves(c));
  if (leaves.length === 0) {
    return { prunedTiles: [{ id: acc.id, name: acc.name, levelType: acc.levelType, systems: acc.systems, children: acc.children }], prunedPath: [] };
  }
  return { prunedTiles: leaves, prunedPath: [{ name: acc.name, systems: visibleSystems, children: null }] };
}

// Find path to system (returns ancestor IDs)
function findPathToSystem(tiles, systemId, allSystems) {
  for (const tile of tiles) {
    if (tile.systems.some(s => s.id === systemId)) {
      const childLocations = tile.children ? tile.children.filter(c => c.type !== 'system') : [];
      if (childLocations.length > 0) {
        const childTiles = getHierarchyTiles(childLocations, allSystems);
        const deeper = findPathToSystem(childTiles, systemId, allSystems);
        return [tile.id, ...deeper];
      }
      return [tile.id];
    }
  }
  return [];
}

// Find path to a location tile (returns ancestor IDs including the tile itself)
function findPathToLocation(tiles, locationId, allSystems) {
  for (const tile of tiles) {
    if (tile.id === locationId) return [tile.id];
    const childLocations = tile.children ? tile.children.filter(c => c.type !== 'system') : [];
    if (childLocations.length > 0) {
      const childTiles = getHierarchyTiles(childLocations, allSystems);
      const deeper = findPathToLocation(childTiles, locationId, allSystems);
      if (deeper.length > 0) return [tile.id, ...deeper];
    }
  }
  return [];
}

// Collect all expandable descendant IDs of a tile (locations only, not
// system leaves). Used by the accordion: when an account card closes, we
// also clear every nested-expansion id inside its subtree so re-opening
// the same account starts from a clean "just the account header" state.
function collectDescendantIds(tile) {
  if (!tile.children) return [];
  const ids = [];
  for (const child of tile.children) {
    if (child.type === 'system') continue;
    ids.push(child.id);
    ids.push(...collectDescendantIds(child));
  }
  return ids;
}

// Find the actual tile (with its populated `systems` list) + its ancestor
// chain, given just a location id. Used when activating a favorite — the
// favorites store only caches id+name, so we have to re-resolve the tile
// from the hierarchy to get the system list right.
function findLocationTile(tiles, locationId, allSystems, ancestors = []) {
  for (const tile of tiles) {
    if (tile.id === locationId) return { tile, ancestors };
    const childLocations = tile.children ? tile.children.filter(c => c.type !== 'system') : [];
    if (childLocations.length > 0) {
      const childTiles = getHierarchyTiles(childLocations, allSystems);
      const found = findLocationTile(childTiles, locationId, allSystems, [...ancestors, tile]);
      if (found) return found;
    }
  }
  return null;
}

// Search locations matching a query, returning {tile, path} for each
function searchLocations(tiles, query, allSystems, ancestors = []) {
  const results = [];
  for (const tile of tiles) {
    const matches = tile.name.toLowerCase().includes(query) ||
                    (tile.levelType && tile.levelType.toLowerCase().includes(query));
    if (matches) {
      results.push({ tile, ancestors: ancestors.map(a => a.name) });
    }
    const childLocations = tile.children ? tile.children.filter(c => c.type !== 'system') : [];
    if (childLocations.length > 0) {
      const childTiles = getHierarchyTiles(childLocations, allSystems);
      results.push(...searchLocations(childTiles, query, allSystems, [...ancestors, tile]));
    }
  }
  return results;
}

// ── Row component (Option D) ──
function NavRow({ depth, levelType, name, count, leakCount, alertCount, expanded, expandable, selected, onClick, onToggle, theme, search, targetId, favoriteEntry, onToggleFavorite }) {
  const indent = 12 + (depth - 1) * 11; // 11px per depth level
  const accent = theme.drawerAccent || theme.accent;
  const textColor = selected ? accent : (theme.drawerText || theme.text);
  const subColor = selected ? accent : (theme.drawerTextSub || theme.textTertiary);
  const ico = iconForLevel(levelType);

  const sub = (() => {
    const parts = [];
    if (count > 0) parts.push(`${count} system${count !== 1 ? 's' : ''}`);
    return parts.join(' · ');
  })();

  return (
    <div onClick={onClick}
      className="nav-drawer-row"
      data-drawer-target={targetId}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: `11px 14px 11px ${indent}px`,
        borderBottom: `0.5px solid ${theme.drawerDivider || 'rgba(255,255,255,0.05)'}`,
        cursor: 'pointer',
        background: selected ? accent + '1A' : 'transparent',
      }}>
      {/* Tree guide lines for indented rows */}
      {!selected && depth > 1 && Array.from({ length: depth - 1 }, (_, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: 0, bottom: 0,
          left: 18 + i * 11,
          width: 1,
          background: 'rgba(255,255,255,0.08)',
        }} />
      ))}
      {/* Selected accent bar */}
      {selected && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent }} />
      )}

      {/* Level icon */}
      <span style={{ flexShrink: 0, width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <MIcon name={ico.name} size={18} fill={ico.fill} color={selected ? accent : (ico.color || theme.drawerTextSub || theme.textTertiary)} />
      </span>

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
        <div
          title={name}
          style={{
            fontSize: 14, fontWeight: selected ? 600 : 500,
            color: textColor,
            lineHeight: 1.25,
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
          }}>{name}</div>
        {sub && (
          <div style={{ fontSize: 11, color: subColor, marginTop: 1, opacity: selected ? 0.85 : 1 }}>
            {sub}
            {leakCount > 0 && <span style={{ color: theme.red, fontWeight: 600 }}> · {leakCount} Water Event{leakCount !== 1 ? 's' : ''}</span>}
            {alertCount > 0 && <span style={{ color: theme.orange, fontWeight: 600 }}> · {alertCount} alert{alertCount !== 1 ? 's' : ''}</span>}
          </div>
        )}
      </div>

      {/* Leak indicator dot (right-aligned, before star + chevron) */}
      {leakCount > 0 && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.red, flexShrink: 0, zIndex: 1 }} />
      )}

      {/* Favorite star (locations are pinnable) */}
      {favoriteEntry && (
        <StarButton entry={favoriteEntry} onChange={onToggleFavorite} theme={theme} />
      )}

      {/* Expand chevron (only on expandable rows).
          Generous hit area — earlier the tap target was tight to the 18 px
          glyph, users kept hitting the row instead of the chevron. Now a
          ~44 px square with 10 px padding extending into the row's edge. */}
      {expandable && (
        <span onClick={(e) => { if (onToggle) { e.stopPropagation(); onToggle(); } }}
          style={{
            flexShrink: 0, zIndex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 44, height: 44,
            margin: '-11px -10px -11px 0',  // expand into row's vertical & right padding
            cursor: 'pointer',
          }}>
          <MIcon name={expanded ? 'expand_more' : 'chevron_right'} size={20} color={subColor} />
        </span>
      )}
    </div>
  );
}

// ── System leaf row ──
function SystemRow({ sys, depth, isCurrent, onClick, theme, onToggleFavorite, showPath = false }) {
  const indent = 12 + (depth - 1) * 11;
  const accent = theme.drawerAccent || theme.accent;

  // Status — derived via the shared helper so the drawer dot and the System
  // Health card on the system page never disagree.  Three states:
  //   • Red    — active leak (Water Event)
  //   • Amber  — any non-leak protection issue
  //              (offline · valve error/disconnected · external power lost · no recipients)
  //   • Green  — healthy
  const { isLeak, isComm, valveOk, powerOk, hasRecipients, allOk } = computeSystemHealth(sys);
  const isOffline = !isComm;                       // kept name for clarity below
  const dotColor = isLeak ? theme.red
                 : !allOk ? (theme.orange || '#E5A100')
                 : theme.green;
  // Sub-label under the system name — collect EVERY active health issue.
  // This list is computed regardless of whether the system also has a leak
  // alert: a system can have BOTH (e.g. DHW Building A has leak-high AND
  // comm=offline because the mock-data IIFE in systems.js forces 2 systems
  // per location offline without overriding their existing alerts). The
  // drawer should show both signals, not just the leak label.
  //
  // Dedup against sys.alert.type so the same issue doesn't render twice
  // (e.g. a system with alert.type='valve-error' would otherwise show
  // "Valve error" once via sys.alert.label and once via this list).
  const primaryType = sys.alert?.type;
  const primaryIsComm = primaryType === 'offline' || primaryType === 'comm';
  const healthIssues = (() => {
    const arr = [];
    if (isOffline && !primaryIsComm) arr.push('Offline');
    if (!valveOk && primaryType !== 'valve-error') arr.push('Valve error');
    if (!powerOk && primaryType !== 'power-lost') arr.push('External power disconnected');
    if (!hasRecipients) arr.push('No alert recipients');
    return arr;
  })();
  const healthLabel = healthIssues.length > 0 ? healthIssues.join(' · ') : null;
  // Keep the muted-grey treatment ONLY when Offline is the system's sole
  // problem (matches the drawer convention that "comms down" reads quieter
  // than "real issue"). Anything else — multi-issue OR any non-Offline single
  // issue — uses the amber attention color.
  const healthIsOfflineOnly = healthIssues.length === 1 && healthIssues[0] === 'Offline';

  return (
    <div onClick={onClick}
      data-drawer-target={sys.id}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: `9px 14px 9px ${indent}px`,
        borderBottom: `0.5px solid ${theme.drawerDivider || 'rgba(255,255,255,0.05)'}`,
        cursor: isCurrent ? 'default' : 'pointer',
        background: isCurrent ? accent + '1A' : 'transparent',
      }}>
      {/* Tree guide lines */}
      {!isCurrent && depth > 1 && Array.from({ length: depth - 1 }, (_, i) => (
        <div key={i} style={{
          position: 'absolute', top: 0, bottom: 0,
          left: 18 + i * 11, width: 1,
          background: 'rgba(255,255,255,0.08)',
        }} />
      ))}
      {isCurrent && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent }} />
      )}

      {/* Status dot in place of icon */}
      <span style={{ flexShrink: 0, width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
      </span>

      {/* Name + alert label */}
      <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
        <div
          title={sys.name}
          style={{
            fontSize: 13, fontWeight: isCurrent ? 700 : 500,
            color: isCurrent ? accent : isLeak ? theme.red : (theme.drawerText || theme.text),
            lineHeight: 1.25,
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
          }}>{sys.name}</div>
        {/* Parent location path — shown in search results to disambiguate
            systems with identical names across locations (e.g. "Floor 21"
            exists in 3 buildings). 2026-06-07. */}
        {showPath && (sys.l4Name || sys.l3Name) && (
          <div style={{
            fontSize: 11, color: theme.drawerTextSub || theme.textTertiary,
            marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{[sys.l4Name, sys.l3Name].filter(Boolean).join(' · ')}</div>
        )}
        {sys.alert && (
          <div style={{ fontSize: 11, color: theme.red, fontWeight: 600, marginTop: 1 }}>{sys.alert.label}</div>
        )}
        {/* Health label renders ALONGSIDE the alert label when the system has
            additional issues beyond the primary alert (e.g. leak-high +
            offline). Otherwise it's the only sub-line on systems with no
            sys.alert but with health drift. */}
        {healthLabel && (
          <div style={{
            fontSize: 11, fontWeight: 600, marginTop: 1,
            color: healthIsOfflineOnly ? (theme.drawerTextSub || theme.textTertiary) : (theme.orange || '#E5A100'),
          }}>{healthLabel}</div>
        )}
      </div>


      {/* Favorite star — systems are pinnable */}
      <StarButton
        entry={{
          kind: 'system',
          id: sys.id,
          name: sys.name,
          sub: [sys.l4Name, sys.l3Name].filter(Boolean).join(' · '),
        }}
        onChange={onToggleFavorite}
        theme={theme}
      />
    </div>
  );
}

// ── Recursive collapsible tree ──
function TreeNode({ tile, depth, ancestors = [], expandedIds, toggleExpanded, currentLocationId, onView, onSystemClick, currentSystemId, effectiveSystemId, allSystems, theme, onToggleFavorite }) {
  const isExpanded = expandedIds.has(tile.id);
  // Location highlight is driven by the GLOBAL selectedScope id (passed in as
  // currentLocationId). Same model as systems use currentSystemId - one
  // stable source per highlight type, so the row stays highlighted across
  // drawer close/reopen AND across page navigation. Locked 2026-06-15.
  const isSelected = tile.id === currentLocationId;
  // Leak + alert rollups — drawn from the shared health helper so the parent
  // location's "· N alerts" count agrees with the per-system rows below it
  // and with the System Health card on the system page.
  const leakCount = tile.systems.filter(sys => computeSystemHealth(sys).isLeak).length;
  const alertCount = tile.systems.filter(sys => {
    const h = computeSystemHealth(sys);
    return !h.isLeak && (!h.allOk || !!sys.alert);
  }).length;
  const childLocations = tile.children ? tile.children.filter(c => c.type !== 'system') : [];
  const hasChildLocations = childLocations.length > 0;
  const hasSystemChildren = tile.systems.length > 0 && !hasChildLocations;
  const expandable = hasChildLocations || hasSystemChildren;
  const childTiles = hasChildLocations ? getHierarchyTiles(childLocations, allSystems) : [];
  const childAncestors = [...ancestors, tile.name];

  return (
    <>
      <NavRow
        depth={depth}
        levelType={tile.levelType}
        name={tile.name}
        count={tile.systems.length}
        leakCount={leakCount}
        alertCount={alertCount}
        expandable={expandable}
        expanded={isExpanded}
        selected={isSelected}
        targetId={tile.id}
        onClick={() => {
          // One-tap: select scope + toggle expand
          onView(tile, ancestors);
          if (expandable) toggleExpanded(tile.id);
        }}
        onToggle={() => toggleExpanded(tile.id)}
        theme={theme}
        favoriteEntry={{
          kind: 'location',
          id: tile.id,
          name: tile.name,
          sub: `${tile.systems.length} system${tile.systems.length !== 1 ? 's' : ''}`,
          levelType: tile.levelType,
        }}
        onToggleFavorite={onToggleFavorite}
      />
      {isExpanded && (
        <>
          {childTiles.map(child => (
            <TreeNode key={child.id} tile={child} depth={depth + 1} ancestors={childAncestors}
              expandedIds={expandedIds} toggleExpanded={toggleExpanded} currentLocationId={currentLocationId}
              onView={onView} onSystemClick={onSystemClick} currentSystemId={currentSystemId}
              effectiveSystemId={effectiveSystemId}
              allSystems={allSystems} theme={theme} onToggleFavorite={onToggleFavorite} />
          ))}
          {hasSystemChildren && tile.systems.map(sys => (
            <SystemRow key={sys.id} sys={sys} depth={depth + 1}
              // Visual highlight uses effectiveSystemId so a system scope set
              // on Home/Alerts still highlights its row. Click guard uses the
              // strict currentSystemId - we only suppress the click when the
              // user is ALREADY on /system/<id>, otherwise they need to
              // navigate there.
              isCurrent={sys.id === effectiveSystemId}
              onClick={() => sys.id !== currentSystemId && onSystemClick(sys.id)}
              theme={theme} onToggleFavorite={onToggleFavorite} />
          ))}
        </>
      )}
    </>
  );
}

// ── Account card (Solution A — top-level accordion card) ──
//
// Wraps each top-level account/root tile in a visually distinct card so
// the boundary between accounts is unambiguous. Per the multi-account
// orientation feedback (2026-06-13): users opening the flat-list drawer
// lost track of which children belonged to which parent. The card chrome
// + single-expand accordion behavior fix that.
//
// Behavior:
//   • Tap the header → open this card + close any OTHER open account
//     (accordion) + set selected scope to this account.
//   • Tap the header of the already-open card → close it + clear its
//     nested expansion (collapseDescendants from parent).
//   • Children render inside the card body using the standard TreeNode
//     recursive component, depth=2+.
function AccountCard({
  tile, isOpen, isSelected, onToggleOpen, onChevronToggle, onView,
  expandedIds, toggleExpanded, onSystemClick, currentSystemId,
  effectiveSystemId, currentLocationId, allSystems, theme, onToggleFavorite,
}) {
  const accent = theme.drawerAccent || theme.accent;
  const dk = theme.mode === 'dark' || theme.mode === 'ocean' || theme.mode === 'gradient' || theme.mode === 'midnight';

  // Card chrome adapts to light vs dark drawer themes. Both modes use the
  // same brand-blue tint on open; the base contrast differs.
  const cardBg = dk ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const cardBorder = dk ? 'rgba(255,255,255,0.10)' : '#E5E8EE';
  const cardOpenBg = dk
    ? 'linear-gradient(180deg, rgba(11,149,248,0.14) 0%, rgba(255,255,255,0.04) 60%)'
    : 'linear-gradient(180deg, rgba(11,149,248,0.05) 0%, #FFFFFF 60%)';
  const cardOpenBorder = dk ? 'rgba(11,149,248,0.45)' : 'rgba(11,149,248,0.30)';
  const cardShadow = dk ? '0 1px 4px rgba(0,0,0,0.20)' : '0 1px 2px rgba(20,21,26,0.03)';
  const cardOpenShadow = dk ? '0 2px 10px rgba(11,149,248,0.18)' : '0 2px 8px rgba(11,149,248,0.08)';

  const iconBg = isOpen
    ? (dk ? 'rgba(11,149,248,0.28)' : 'rgba(11,149,248,0.18)')
    : (dk ? 'rgba(11,149,248,0.18)' : 'rgba(11,149,248,0.10)');

  // Roll up leak / alert counts for the sub-line — same logic as TreeNode.
  const leakCount = tile.systems.filter(sys => computeSystemHealth(sys).isLeak).length;
  const alertCount = tile.systems.filter(sys => {
    const h = computeSystemHealth(sys);
    return !h.isLeak && (!h.allOk || !!sys.alert);
  }).length;

  // System or sub-location children for the body.
  const childLocations = tile.children ? tile.children.filter(c => c.type !== 'system') : [];
  const hasChildLocations = childLocations.length > 0;
  const hasSystemChildren = tile.systems.length > 0 && !hasChildLocations;
  const childTiles = hasChildLocations ? getHierarchyTiles(childLocations, allSystems) : [];

  return (
    <div
      data-drawer-target={tile.id}
      style={{
        background: isOpen ? cardOpenBg : cardBg,
        border: `1px solid ${isOpen ? cardOpenBorder : cardBorder}`,
        borderRadius: 12,
        marginBottom: 10,
        overflow: 'hidden',
        boxShadow: isOpen ? cardOpenShadow : cardShadow,
        transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      {/* Header — tap to NAVIGATE to this account (set scope + close
          drawer). Matches the standard drawer rule: tap any row -> select
          and close. Tap the chevron at the right -> expand the card body
          inline (drawer stays open) so the user can drill into nested
          locations and tap one to scope there. Consistency with every
          other row in the drawer. */}
      <div
        onClick={onToggleOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 14px',
          cursor: 'pointer',
          borderLeft: isSelected ? `3px solid ${accent}` : '3px solid transparent',
        }}
        role="button"
        aria-expanded={isOpen}
      >
        <span style={{
          flexShrink: 0, width: 36, height: 36, borderRadius: 10,
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MIcon name={iconForLevel(tile.levelType).name} size={22}
            fill={iconForLevel(tile.levelType).fill !== false}
            color={'#036AB5'} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            title={tile.name}
            style={{
              fontSize: 15, fontWeight: 700,
              color: theme.drawerText || theme.text,
              letterSpacing: '-0.1px',
              lineHeight: 1.25,
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}>{tile.name}</div>
          <div style={{
            fontSize: 11.5, fontWeight: 500,
            color: theme.drawerTextSub || theme.textTertiary,
            marginTop: 1,
          }}>
            {tile.systems.length} system{tile.systems.length !== 1 ? 's' : ''}
            {leakCount > 0 && <span style={{ color: theme.red, fontWeight: 700 }}> · {leakCount} Water Event{leakCount !== 1 ? 's' : ''}</span>}
            {alertCount > 0 && <span style={{ color: theme.orange, fontWeight: 700 }}> · {alertCount} alert{alertCount !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        {/* Star — wraps the account itself */}
        <StarButton
          entry={{
            kind: 'location',
            id: tile.id,
            name: tile.name,
            sub: `${tile.systems.length} system${tile.systems.length !== 1 ? 's' : ''}`,
            levelType: tile.levelType,
          }}
          onChange={onToggleFavorite}
          theme={theme}
        />
        {/* Leak indicator dot to the right of the star when the subtree has Water Events */}
        {leakCount > 0 && (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.red, flexShrink: 0 }} />
        )}
        {/* Expand chevron - own clickable area with stopPropagation so it
            ONLY toggles open/close, never sets scope or triggers drawer
            close. 44x44 tap target per UI/UX skill touch-target-size rule.
            Locked 2026-06-13 after the user reported "arrow next to
            account closes the menu" - the previous version routed the
            chevron click through the header's onClick (which also called
            handleView -> setSelectedScope, harmless on its own, but the
            symptom suggested an indirect close was happening). Giving the
            chevron its own handler removes the ambiguity entirely. */}
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (onChevronToggle) onChevronToggle();
          }}
          role="button"
          aria-label={isOpen ? 'Collapse account' : 'Expand account'}
          style={{
            flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 44, height: 44,
            margin: '-11px -10px -11px 0',  // expand into the row's padding for a generous hit area
            cursor: 'pointer',
          }}
        >
          <MIcon
            name={isOpen ? 'expand_less' : 'chevron_right'}
            size={22}
            color={isOpen ? (accent || '#036AB5') : (theme.drawerTextSub || theme.textTertiary)}
          />
        </span>
      </div>

      {/* Body — children render only when open. Each child row is a
          nested location/system - tap to scope to it + close drawer
          (consistent with the row at top). */}
      {isOpen && (
        <div style={{
          paddingTop: 4, paddingBottom: 8,
          borderTop: `1px solid ${dk ? 'rgba(255,255,255,0.06)' : '#EEF1F4'}`,
        }}>
          {childTiles.map(child => (
            <TreeNode
              key={child.id} tile={child} depth={2}
              ancestors={[tile.name]}
              expandedIds={expandedIds} toggleExpanded={toggleExpanded}
              currentLocationId={currentLocationId}
              onView={onView} onSystemClick={onSystemClick}
              currentSystemId={currentSystemId}
              effectiveSystemId={effectiveSystemId} allSystems={allSystems}
              theme={theme} onToggleFavorite={onToggleFavorite}
            />
          ))}
          {hasSystemChildren && tile.systems.map(sys => (
            <SystemRow
              key={sys.id} sys={sys} depth={2}
              isCurrent={sys.id === effectiveSystemId}
              onClick={() => sys.id !== currentSystemId && onSystemClick(sys.id)}
              theme={theme} onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Collapse-all bar (Solution A) ──
// Shows above the account cards. Active state = ≥1 account open or any
// nested expansion exists; tap clears everything. Disabled (greyed) state
// stays visible so users discover the affordance.
function CollapseAllBar({ accountCount, hasAnyExpansion, onCollapseAll, theme }) {
  const accent = theme.drawerAccent || theme.accent || '#036AB5';
  const dk = theme.mode === 'dark' || theme.mode === 'ocean' || theme.mode === 'gradient' || theme.mode === 'midnight';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 12px',
      borderBottom: `1px solid ${dk ? 'rgba(255,255,255,0.06)' : '#EEF1F4'}`,
      marginBottom: 10,
    }}>
      <span style={{
        fontSize: 10.5, fontWeight: 700,
        color: theme.drawerTextSub || theme.textTertiary,
        textTransform: 'uppercase', letterSpacing: '.5px',
      }}>{accountCount} {accountCount === 1 ? 'account' : 'accounts'}</span>
      <span
        onClick={hasAnyExpansion ? onCollapseAll : undefined}
        title={hasAnyExpansion ? 'Close the open account and reset any nested expansion' : 'Everything is already collapsed'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11.5, fontWeight: 600,
          color: hasAnyExpansion ? accent : (theme.drawerTextSub || theme.textTertiary),
          background: hasAnyExpansion
            ? (dk ? 'rgba(11,149,248,0.14)' : 'rgba(11,149,248,0.08)')
            : (dk ? 'rgba(255,255,255,0.04)' : '#F2F4F7'),
          padding: '5px 10px', borderRadius: 999,
          cursor: hasAnyExpansion ? 'pointer' : 'default',
          border: `1px solid ${hasAnyExpansion
            ? (dk ? 'rgba(11,149,248,0.30)' : 'rgba(11,149,248,0.18)')
            : (dk ? 'rgba(255,255,255,0.06)' : '#E5E8EE')}`,
          userSelect: 'none',
          opacity: hasAnyExpansion ? 1 : 0.6,
        }}
      >
        <MIcon name="unfold_less" size={14}
          color={hasAnyExpansion ? accent : (theme.drawerTextSub || theme.textTertiary)} />
        Collapse all
      </span>
    </div>
  );
}

// ── Main drawer ──
export default function NavigationDrawer({ open, onClose, onSelectLocation, currentSystemId }) {
  const { t } = useTranslation();
  useDataRefresh();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { exploreSystems = [], exploring, toggleExplore, setSelectedScope, selectedScope } = useUserContext() || {};
  const activeSystems = exploreSystems;
  const accent = theme.drawerAccent || theme.accent;

  const accountTiles = useMemo(() => getAccountTiles(activeSystems), [activeSystems]);
  const { prunedTiles: rootTiles, prunedPath: autoSkipped } = useMemo(
    () => pruneRootTiles(accountTiles, activeSystems), [accountTiles, activeSystems]);
  const rootName = autoSkipped.length > 0 ? autoSkipped[0].name : 'All';

  // Drawer focus derivation - locked 2026-06-15, revised same day.
  //
  // The drawer renders two kinds of "this is the focus" chrome:
  //   • Location-row highlight + path-to-location expansion - driven by
  //     `currentLocationId` (a location-tile id present somewhere in the tree).
  //   • System-row highlight + path-to-system expansion - driven by
  //     `effectiveSystemId`.
  //
  // Sources:
  //   • `currentSystemId` prop - set by SystemDetail (the route param).
  //     ONLY present when the user is on /system/<id>.
  //   • `selectedScope` (global context):
  //       - levelType === 'system' → the user is implicitly scoped to one
  //         system (via SystemDetail's mount effect, see PRD 04). The scope
  //         id is `system-<sys.id>`; no LOCATION tile carries that id.
  //         Treat it as a SYSTEM focus: use selectedScope.systemIds[0].
  //       - any other levelType → location scope. Use selectedScope.id as
  //         a location id (it WILL match a tile in the tree).
  //
  // The earlier (broken) version used currentLocationId = selectedScope?.id
  // blindly. After a user picked a system and navigated to Home, the drawer
  // tried findPathToLocation('system-X', ...) which returns []: nothing
  // expanded, system row not highlighted on cross-page nav.
  const isSystemScope = selectedScope?.levelType === 'system';
  const effectiveSystemId = currentSystemId || (isSystemScope ? selectedScope?.systemIds?.[0] : null) || null;
  const currentLocationId = !isSystemScope ? (selectedScope?.id || null) : null;

  // Auto-expand path to current focus target on first render. Uses
  // effectiveSystemId (NOT just the currentSystemId prop) so a system-typed
  // scope set on Home/Alerts also expands the path to that system on
  // first drawer open after navigation.
  const [expandedIds, setExpandedIds] = useState(() => {
    if (effectiveSystemId) {
      const path = findPathToSystem(rootTiles, effectiveSystemId, activeSystems);
      if (path.length > 0) return new Set(path);
    }
    if (currentLocationId) {
      const path = findPathToLocation(rootTiles, currentLocationId, activeSystems);
      if (path.length > 0) return new Set(path);
    }
    return new Set();
  });
  const [search, setSearch] = useState('');

  // Favorites are persisted in localStorage; the version counter is bumped on
  // every star/unstar so the section + every visible star button re-renders.
  const [favoritesVersion, setFavoritesVersion] = useState(0);
  const bumpFavorites = () => setFavoritesVersion(v => v + 1);
  const favorites = useMemo(() => getFavorites(), [favoritesVersion]);   // eslint-disable-line react-hooks/exhaustive-deps
  // Favorites section defaults to FOLDED on every drawer open, regardless of
  // whether favorites is empty or has entries. Users explicitly open it when
  // they want to browse their starred locations - the section header always
  // sits at the top, so the affordance is never hidden. 2026-06-15.
  const [favoritesOpen, setFavoritesOpen] = useState(false);


  // The "current target" the drawer should focus on (used to scroll the
  // focused row into view). Mirrors the effective-system / effective-location
  // split above.
  const focusTarget = effectiveSystemId || currentLocationId;

  // Whenever drawer opens, expand path to current focus target.
  // ALSO: if the user has only one top-level location (e.g. Oren Tidhar
  // -> just "Tidhar Towers"), auto-expand it so the drawer doesn't open
  // to a single collapsed row that demands one extra tap to reveal what
  // anyone in this scope would obviously want to see.
  useEffect(() => {
    if (!open) return;
    let path = [];
    if (effectiveSystemId) {
      path = findPathToSystem(rootTiles, effectiveSystemId, activeSystems);
    } else if (currentLocationId) {
      path = findPathToLocation(rootTiles, currentLocationId, activeSystems);
    }
    // Single-root auto-expand. Append the single root id to the path so
    // any prior focus-path expansion still applies; if there was no focus
    // target, this becomes the entire expansion.
    if (rootTiles.length === 1) {
      path = [...path, rootTiles[0].id];
    }
    if (path.length > 0) {
      setExpandedIds(prev => {
        const next = new Set(prev);
        path.forEach(id => next.add(id));
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, effectiveSystemId, currentLocationId, rootTiles.length]);

  // Scroll the focused row into view ONLY when the drawer opens (or the focus
  // target itself changes). Earlier this also ran on every `expandedIds`
  // change, which caused the bug where tapping a chevron to expand any
  // location yanked the scroll back to the currently-viewed system and pushed
  // the just-tapped row off-screen.
  useEffect(() => {
    if (!open || !focusTarget) return;
    // Defer so the auto-expand path effect has had a chance to render.
    const id = setTimeout(() => {
      const el = document.querySelector(`[data-drawer-target="${focusTarget}"]`);
      if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' });
    }, 150);
    return () => clearTimeout(id);
  }, [open, focusTarget]);

  const toggleExpanded = (id) => setExpandedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Accordion behavior for top-level account cards (Solution A).
  // Opening an account closes every other account AND clears all nested
  // expansion (returns the drawer to "just this account open at the top").
  // Closing an account also clears its nested expansion so re-opening is
  // clean. Locked 2026-06-13.
  const toggleAccountOpen = (accountId) => {
    setExpandedIds(prev => {
      if (prev.has(accountId)) {
        // Closing — drop this account + every descendant id in its subtree
        const tile = rootTiles.find(t => t.id === accountId);
        const descendants = tile ? collectDescendantIds(tile) : [];
        const next = new Set(prev);
        next.delete(accountId);
        descendants.forEach(id => next.delete(id));
        return next;
      }
      // Opening — close every other top-level account + their descendants
      return new Set([accountId]);
    });
  };

  // Collapse-all: reset every expansion (account + nested).
  const collapseAll = () => setExpandedIds(new Set());

  // Whether any account is open or any expansion exists. Drives the
  // CollapseAllBar disabled/active state.
  const hasAnyExpansion = expandedIds.size > 0;

  // Search both systems and locations
  const searchResults = useMemo(() => {
    if (!search) return { systems: [], locations: [] };
    const q = search.toLowerCase();
    const systems = activeSystems.filter(sys =>
      sys.name.toLowerCase().includes(q) ||
      (sys.l4Name || '').toLowerCase().includes(q) ||
      (sys.l3Name || '').toLowerCase().includes(q)
    );
    const locations = searchLocations(rootTiles, q, activeSystems);
    return { systems, locations };
  }, [search, activeSystems, rootTiles]);

  function handleView(tile, ancestors = [], closeDrawer = true) {
    // Set the global selected scope so every screen can show it. The drawer
    // highlight is derived from this value (via currentLocationId), so the
    // tap is the ONLY state mutation needed - no parallel local state.
    if (setSelectedScope) {
      setSelectedScope({
        id: tile.id,
        name: tile.name,
        levelType: tile.levelType,
        ancestors,
        systems: tile.systems,
        systemIds: tile.systems.map(s => s.id),
      });
    }
    // The parent's onSelectLocation handler typically closes the drawer
    // (HomeUnified) or navigates away (SystemDetail). We only want that
    // behavior when the user is making a definite scope CHOICE - tapping
    // a nested location row. For an accordion open/close on a top-level
    // account card, the drawer must stay open so the user can explore
    // children. Pass closeDrawer=false from AccountCard's onToggleOpen.
    if (closeDrawer && onSelectLocation) onSelectLocation(tile);
  }

  function handleSystemClick(id) {
    // Close drawer on the way out — system detail will open without drawer
    if (onClose) onClose();
    navigate(`/system/${id}`);
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 10,
        background: 'rgba(0,0,0,0.45)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.25s ease',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: '85%', maxWidth: 340, background: theme.drawerBg, zIndex: 11,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        display: 'flex', flexDirection: 'column',
        boxShadow: open ? '4px 0 24px rgba(0,0,0,0.3)' : 'none',
      }}>
        {/* Header — drop the "Navigate" title (2026-06-07); the search bar
            is the header (its placeholder explains what it does). Just the
            search input + close x. */}
        <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${theme.drawerDivider || theme.divider}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: theme.drawerInput || theme.inputBg, borderRadius: 8, padding: '7px 10px' }}>
              <MIcon name="search" size={15} color={theme.drawerTextSub || theme.textTertiary} style={{ marginRight: 6 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('drawer.search_placeholder')}
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: theme.drawerText || theme.text, fontFamily: 'inherit', outline: 'none', minWidth: 0 }} />
              {search && <span onClick={() => setSearch('')} style={{ cursor: 'pointer', display: 'flex' }}><MIcon name="close" size={14} color={theme.drawerTextSub || theme.textTertiary} /></span>}
            </div>
            <span onClick={onClose} style={{ cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}>
              <MIcon name="close" size={22} color={theme.drawerTextSub || theme.textTertiary} />
            </span>
          </div>
        </div>

        {/* Favorites — foldable section at the top. Visible only when not
            actively searching (search dominates the view). The Favorites
            section uses a tinted background to visually distinguish itself
            from the tree below (2026-06-08; revised after the BROWSE label
            alone wasn't enough separation). */}
        {search.length === 0 && (
          <div style={{
            flexShrink: 0,
            background: theme.drawerBg === '#fff' || !theme.drawerBg
              ? '#F4F6FA' // light tint on light drawer
              : 'rgba(255,255,255,0.04)', // subtle lift on dark drawer
          }}>
            <div onClick={() => setFavoritesOpen(o => !o)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', cursor: 'pointer', userSelect: 'none',
            }}>
              <MIcon name="star" size={16} fill={favorites.length > 0}
                color={favorites.length > 0 ? STAR_COLOR : (theme.drawerTextSub || theme.textTertiary)} />
              <span style={{
                flex: 1, fontSize: 12, fontWeight: 700,
                color: theme.drawerTextSub || theme.textTertiary,
                textTransform: 'uppercase', letterSpacing: '.4px',
              }}>Favorites{favorites.length > 0 ? ` (${favorites.length})` : ''}</span>
              <MIcon name={favoritesOpen ? 'expand_less' : 'expand_more'} size={18}
                color={theme.drawerTextSub || theme.textTertiary} />
            </div>
            {favoritesOpen && (
              <div style={{ paddingBottom: 4 }}>
                {favorites.length === 0 ? (
                  <div style={{
                    padding: '4px 14px 12px', fontSize: 12,
                    color: theme.drawerTextSub || theme.textTertiary, fontStyle: 'italic',
                    lineHeight: 1.4,
                  }}>Tap the star on any system or location to pin it here.</div>
                ) : favorites.map(fav => {
                  const isSystem = fav.kind === 'system';

                  // F6 (2026-06-08): system favorites use the SAME status dot
                  // as the main tree's SystemRow — green (healthy) / red (leak)
                  // / amber (other issue). Location favorites still use
                  // iconForLevel.
                  const sysForDot = isSystem ? activeSystems.find(s => s.id === fav.id) : null;
                  const sysHealth = sysForDot ? computeSystemHealth(sysForDot) : null;
                  const dotColor = sysHealth
                    ? (sysHealth.isLeak ? theme.red
                       : !sysHealth.allOk ? (theme.orange || '#E5A100')
                       : theme.green)
                    : null;
                  const ico = isSystem
                    ? null  // status dot used instead — see render below
                    : iconForLevel(fav.levelType);

                  // Roll up leak / alert counts for the line-3 status callouts.
                  let leakCount = 0;
                  let alertCount = 0;
                  let sysCount = 0;
                  if (isSystem) {
                    if (sysHealth) {
                      if (sysHealth.isLeak) leakCount = 1;
                      else if (!sysHealth.allOk || !!sysForDot.alert) alertCount = 1;
                    }
                  } else {
                    const found = findLocationTile(rootTiles, fav.id, activeSystems);
                    if (found) {
                      sysCount = found.tile.systems.length;
                      leakCount = found.tile.systems.filter(s => computeSystemHealth(s).isLeak).length;
                      alertCount = found.tile.systems.filter(s => {
                        const h = computeSystemHealth(s);
                        return !h.isLeak && (!h.allOk || !!s.alert);
                      }).length;
                    }
                  }

                  // F1 (2026-06-07): 3-line layout when there's an issue, so
                  // the status callout doesn't crowd the location line and
                  // wrap awkwardly. Matches the search-result anatomy:
                  //   line 1: name
                  //   line 2: location (system: "L4Name · L3Name"; location: "N systems")
                  //   line 3: status (only when leakCount/alertCount > 0)
                  const locationLine = isSystem
                    ? (fav.sub || '')
                    : (sysCount > 0 ? `${sysCount} system${sysCount !== 1 ? 's' : ''}` : '');
                  const hasStatus = leakCount > 0 || alertCount > 0;

                  return (
                    <div key={`${fav.kind}-${fav.id}`}
                      onClick={() => {
                        if (isSystem) {
                          handleSystemClick(fav.id);
                          return;
                        }
                        const found = findLocationTile(rootTiles, fav.id, activeSystems);
                        if (found && setSelectedScope) {
                          setSelectedScope({
                            id: found.tile.id,
                            name: found.tile.name,
                            levelType: found.tile.levelType,
                            ancestors: found.ancestors.map(a => a.name),
                            systems: found.tile.systems,
                            systemIds: found.tile.systems.map(s => s.id),
                          });
                        } else if (setSelectedScope) {
                          setSelectedScope({
                            id: fav.id, name: fav.name,
                            levelType: fav.levelType,
                            ancestors: [],
                            systems: [],
                            systemIds: [],
                          });
                        }
                        if (onClose) onClose();
                        navigate('/');
                      }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '9px 14px',
                        cursor: 'pointer',
                      }}>
                      <span style={{ flexShrink: 0, width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 2 }}>
                        {isSystem ? (
                          // F6 (2026-06-08): status dot, same shape + size +
                          // color logic as the main tree SystemRow.
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
                        ) : (
                          <MIcon name={ico.name} size={16} fill={ico.fill}
                            color={ico.color || theme.drawerTextSub || theme.textTertiary} />
                        )}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: theme.drawerText || theme.text,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{fav.name}</div>
                        {locationLine && (
                          <div style={{
                            fontSize: 11, color: theme.drawerTextSub || theme.textTertiary,
                            marginTop: 1,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>{locationLine}</div>
                        )}
                        {hasStatus && (
                          <div style={{
                            fontSize: 11, fontWeight: 600,
                            marginTop: 2,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {leakCount > 0 && <span style={{ color: theme.red }}>{leakCount} Water Event{leakCount !== 1 ? 's' : ''}</span>}
                            {alertCount > 0 && <span style={{ color: theme.orange }}>{leakCount > 0 ? ' · ' : ''}{alertCount} alert{alertCount !== 1 ? 's' : ''}</span>}
                          </div>
                        )}
                      </div>
                      {/* Leak indicator dot — matches main tree row */}
                      {leakCount > 0 && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.red, flexShrink: 0, marginTop: 6 }} />
                      )}
                      <StarButton entry={fav} onChange={bumpFavorites} theme={theme} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tree body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* F5 — section break between Favorites and tree. Revised 2026-06-08:
              the earlier "thin border + small BROWSE label" wasn't enough
              separation. Now uses a tall gap-band (12 px solid background-tint
              spacer) PLUS a larger BROWSE label with its own bottom divider. */}
          {search.length === 0 && favorites.length > 0 && (
            <>
              <div style={{
                height: 12,
                background: theme.drawerBg === '#fff' || !theme.drawerBg
                  ? '#E2E6EB' // visible grey band on light drawers
                  : 'rgba(0,0,0,0.2)', // darker band on dark drawer
              }} />
              <div style={{
                padding: '12px 14px 10px',
                fontSize: 12, fontWeight: 700,
                color: theme.drawerTextSub || theme.textTertiary,
                textTransform: 'uppercase', letterSpacing: '.5px',
                borderBottom: `1px solid ${theme.drawerDivider || theme.divider}`,
              }}>All systems &amp; locations</div>
            </>
          )}
          {search.length > 0 ? (
            (searchResults.locations.length === 0 && searchResults.systems.length === 0) ? (
              <div style={{ textAlign: 'center', color: theme.drawerTextSub || theme.textTertiary, fontSize: 14, padding: 24 }}>{t('drawer.no_results')}</div>
            ) : (
              <>
                {searchResults.locations.length > 0 && (
                  <>
                    <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 700, color: theme.drawerTextSub || theme.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Locations ({searchResults.locations.length})
                    </div>
                    {searchResults.locations.map(({ tile, ancestors }) => {
                      const leakCount = tile.systems.filter(s => s.alert?.type?.includes('leak')).length;
                      const ico = iconForLevel(tile.levelType);
                      return (
                        <div key={tile.id}
                          onClick={() => { handleView(tile, ancestors); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '11px 14px',
                            borderBottom: `0.5px solid ${theme.drawerDivider || 'rgba(255,255,255,0.05)'}`,
                            cursor: 'pointer',
                          }}>
                          <span style={{ flexShrink: 0, width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MIcon name={ico.name} size={18} fill={ico.fill} color={ico.color || theme.drawerTextSub || theme.textTertiary} />
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: theme.drawerText || theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tile.name}</div>
                            <div style={{ fontSize: 11, color: theme.drawerTextSub || theme.textTertiary, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {ancestors.length > 0 ? ancestors.join(' › ') + ' · ' : ''}{tile.systems.length} system{tile.systems.length !== 1 ? 's' : ''}
                              {leakCount > 0 && <span style={{ color: theme.red, fontWeight: 600 }}> · {leakCount} Water Event{leakCount !== 1 ? 's' : ''}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                {searchResults.systems.length > 0 && (
                  <>
                    <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 700, color: theme.drawerTextSub || theme.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Systems ({searchResults.systems.length})
                    </div>
                    {searchResults.systems.map(sys => (
                      <SystemRow key={sys.id} sys={sys} depth={1}
                        isCurrent={sys.id === effectiveSystemId}
                        onClick={() => sys.id !== currentSystemId && handleSystemClick(sys.id)}
                        theme={theme}
                        showPath />
                    ))}
                  </>
                )}
              </>
            )
          ) : (
            <div style={{ padding: '0 12px 80px' }}>
              <CollapseAllBar
                accountCount={rootTiles.length}
                hasAnyExpansion={hasAnyExpansion}
                onCollapseAll={collapseAll}
                theme={theme}
              />
              {rootTiles.map(tile => (
                <AccountCard
                  key={tile.id}
                  tile={tile}
                  isOpen={expandedIds.has(tile.id)}
                  isSelected={tile.id === currentLocationId}
                  onToggleOpen={() => {
                    // Header tap = NAVIGATE to this account (set scope +
                    // close drawer). Same rule as every other row in the
                    // drawer: tap a row -> select + close. Consistency.
                    handleView(tile, [], true);
                  }}
                  onChevronToggle={() => {
                    // Chevron tap = EXPAND the card body without
                    // navigating. Lets the user drill into the account's
                    // children and pick a nested location without
                    // committing to the account scope.
                    toggleAccountOpen(tile.id);
                  }}
                  onView={handleView}
                  expandedIds={expandedIds}
                  toggleExpanded={toggleExpanded}
                  onSystemClick={handleSystemClick}
                  currentSystemId={currentSystemId}
                  effectiveSystemId={effectiveSystemId}
                  currentLocationId={currentLocationId}
                  allSystems={activeSystems}
                  theme={theme}
                  onToggleFavorite={bumpFavorites}
                />
              ))}
            </div>
          )}
        </div>

        {/* Explore toggle */}
        <div onClick={() => { toggleExplore(); setExpandedIds(new Set()); }} style={{
          padding: '12px 14px', borderTop: `1px solid ${theme.drawerDivider || theme.divider}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          cursor: 'pointer', flexShrink: 0,
        }}>
          <MIcon name={exploring ? 'my_location' : 'explore'} size={18} color={accent} />
          <span style={{ fontSize: 14, fontWeight: 600, color: accent }}>
            {exploring ? t('drawer.back_to_my_scope') : t('drawer.explore_all')}
          </span>
        </div>
      </div>
    </>
  );
}
