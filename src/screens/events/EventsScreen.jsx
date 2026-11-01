import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TabBar from '../../components/TabBar';
import PipesHeader, { GLOW_PAGE_BG } from '../../components/PipesHeader';
import EventRow from '../../components/EventRow';
import NavigationDrawer from '../../components/NavigationDrawer';
import ScopeHeader from '../../components/ScopeHeader';
import { CURRENT_EVENTS, HISTORY_EVENTS, computeActiveEvents, computeIgnoredEvents, computeConfigurationGaps, computePusherResolvedEvents } from '../../data/events';
import { useUserContext } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import { useDataRefresh } from '../../utils/useDataRefresh';

const ALERT_TABS = ['active', 'history'];

function SwipeableAlertTabs({ children, activeTab, onSwipe }) {
  const startRef = useRef(null);
  const idx = ALERT_TABS.indexOf(activeTab);
  return (
    <div
      onTouchStart={(e) => { startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={(e) => {
        if (!startRef.current) return;
        const dx = e.changedTouches[0].clientX - startRef.current.x;
        const dy = e.changedTouches[0].clientY - startRef.current.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          if (dx < 0 && idx < ALERT_TABS.length - 1) onSwipe(ALERT_TABS[idx + 1]);
          if (dx > 0 && idx > 0) onSwipe(ALERT_TABS[idx - 1]);
        }
        startRef.current = null;
      }}
      style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}
    >
      <div style={{
        display: 'flex', width: `${ALERT_TABS.length * 100}%`,
        transform: `translateX(-${idx * (100 / ALERT_TABS.length)}%)`,
        transition: 'transform 0.25s ease', height: '100%',
      }}>
        {children.map((child, i) => (
          <div key={i} style={{ width: `${100 / ALERT_TABS.length}%`, height: '100%', overflowY: 'auto', flexShrink: 0 }}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

function MIcon({ name, size = 18, color, fill, style = {} }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, color, fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0", ...style }}>{name}</span>;
}

export default function EventsScreen() {
  const { t } = useTranslation();
  useDataRefresh();
  const { theme } = useTheme();
  const { visibleSystems = [] } = useUserContext() || {};
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const scopeParam = searchParams.get('scope');
  const [activeTab, setActiveTab] = useState('active');
  // Search removed 2026-06-03 — Alerts is meant to be a focused inbox, not a
  // searchable index. Use Home → drilldown for finding a specific system.

  // Filter pills — multi-select toggles (locked 2026-06-04):
  //   • Tap a category pill → adds it to the active set (turns ON).
  //   • Tap again            → removes it (turns OFF).
  //   • All categories OFF   → "All" is implicitly active, show everything.
  //   • Tap "All"            → clears the set (back to show-everything).
  //
  // URL ?filter=<x> param still arrives from Home / Status Overview / push
  // deep-links. Now returns an ARRAY of pill keys so 'needs-attention' can
  // pre-select multiple pills (everything-but-water — locked 2026-06-04).
  function pillsForUrlFilter(raw) {
    if (!raw) return [];
    if (raw === 'high' || raw === 'low' || raw === 'leak' || raw === 'water') return ['water'];
    if (raw === 'valve' || raw === 'valve-error') return ['valve'];
    if (raw === 'power' || raw === 'power-lost') return ['power'];
    if (raw === 'conn' || raw === 'offline' || raw === 'comm') return ['conn'];
    // Systems Health → "everything that needs attention except water events"
    // (water has its own card on Home, so the Systems Health tap is meant to
    // surface device/protection-level errors). Multi-select: Valve + Power +
    // Comm pre-applied.
    if (raw === 'needs-attention') return ['valve', 'power', 'conn'];
    return [];
  }
  const initialPills = pillsForUrlFilter(filterParam);
  const [activeFilters, setActiveFilters] = useState(() => new Set(initialPills));
  // Water sub-filter — only meaningful when 'water' is in activeFilters.
  // Values: 'all' (both high + low) | 'high' (leak-high only) | 'low' (leak-low only).
  // Pre-set from URL when the deep-link is specifically 'high' or 'low'.
  const initialWaterSub = filterParam === 'high' ? 'high'
                       : filterParam === 'low'  ? 'low'  : 'all';
  const [waterSub, setWaterSub] = useState(initialWaterSub);
  // Re-sync when the URL filter param changes — covers the case where the user
  // is already on /alerts and a Home pill deep-links to a different filter.
  useEffect(() => {
    setActiveFilters(new Set(pillsForUrlFilter(filterParam)));
    setWaterSub(filterParam === 'high' ? 'high' : filterParam === 'low' ? 'low' : 'all');
  }, [filterParam]);
  function clearFilters() { setActiveFilters(new Set()); setWaterSub('all'); }
  function toggleFilter(key) {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        // Removing 'water' resets the sub-filter so the next toggle starts fresh.
        if (key === 'water') setWaterSub('all');
      } else {
        next.add(key);
      }
      return next;
    });
  }
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { exploring, selectedScope } = useUserContext() || {};

  const scopeIds = useMemo(() => {
    if (!scopeParam) return null;
    return new Set(scopeParam.split(','));
  }, [scopeParam]);

  const visibleIds = useMemo(() => new Set(visibleSystems.map(s => s.id)), [visibleSystems]);

  // Drawer-selected scope. When the user picks a location from the navigation
  // drawer (e.g. "Henrietta House") the scoped systems should narrow the
  // events list — not just the page title. Earlier the title was driven from
  // selectedScope but the list was not, which produced the data inconsistency
  // where the header said "Henrietta House · 2 alerts" while the list showed
  // every alert across every visible system. Locked: same scope drives both.
  const selectedScopeIds = useMemo(() => {
    const ids = selectedScope?.systemIds;
    if (!ids || ids.length === 0) return null;
    return new Set(ids);
  }, [selectedScope]);

  function applyFilters(events) {
    let list = events;
    if (visibleIds.size > 0) list = list.filter(e => visibleIds.has(e.system));
    if (scopeIds) list = list.filter(e => scopeIds.has(e.system));
    if (selectedScopeIds) list = list.filter(e => selectedScopeIds.has(e.system));
    // Type filters — Variant A category set, multi-select. Empty set = All.
    // Water can additionally narrow to high-only / low-only via waterSub.
    if (activeFilters.size > 0) {
      list = list.filter(e => {
        if (activeFilters.has('water')) {
          if (waterSub === 'high' && e.type === 'leak-high') return true;
          if (waterSub === 'low'  && e.type === 'leak-low')  return true;
          if (waterSub === 'all'  && (e.type === 'leak-high' || e.type === 'leak-low')) return true;
        }
        if (activeFilters.has('valve') && e.type === 'valve-error') return true;
        if (activeFilters.has('power') && e.type === 'power-lost') return true;
        if (activeFilters.has('conn')  && (e.type === 'comm' || e.type === 'offline')) return true;
        return false;
      });
    }
    return list;
  }

  // Active events derived live from systems + incidents (single source of truth).
  // Config gaps (systems with no recipients) are folded in as pseudo-events so the
  // Alerts feed is the single "needs attention" surface.
  // Sort: real events first (newest → oldest by timestamp), config gaps last (no timestamp).
  // Unfiltered totals — these feed fleet-level counters (sub-line "X need
  // attention" + Active tab badge). They MUST stay independent of the filter
  // pills, the way an Inbox unread-count never shrinks when you apply a label
  // filter. The filter visibly shrinks the LIST, not the headline counter.
  const allActiveEvents = [...computeActiveEvents(), ...computeConfigurationGaps()];
  const allHistoryEvents = [
    ...computeIgnoredEvents(),
    ...computePusherResolvedEvents(),
    ...CURRENT_EVENTS.filter(e => e.resolved),
    ...HISTORY_EVENTS,
  ];
  // Count UNIQUE SYSTEMS that need attention (not events). The sub-line reads
  // SYSTEM-deduplicated count - feeds the header sub-line "X need attention".
  // "200 systems · 8 need attention" - that's 8 of 200 SYSTEMS, not 8 events.
  // A single system with 2 simultaneous alerts (e.g. Water + Valve) counts once.
  const totalActiveCount = new Set(
    allActiveEvents.map(e => e.system || e.systemId).filter(Boolean)
  ).size;
  // ALERT-ROW count - feeds the Active tab badge + "Showing X of Y" line.
  // Each incident is a separate row in the list (a system with valve-error +
  // offline produces 2 rows), so the badge must reflect rows, not systems.
  // Fixed 2026-06-09: previously the badge also used totalActiveCount which
  // de-duped systems and didn't match the visible list count.
  const totalActiveAlertsCount = allActiveEvents.length;

  // Filtered lists — feed the list rendering only.
  const activeEvents = applyFilters(allActiveEvents)
    .slice()
    .sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : -Infinity;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : -Infinity;
      return tb - ta;
    });
  const historyEvents = applyFilters(allHistoryEvents);

  const historyGroups = useMemo(() => {
    const seen = new Map();
    const groups = [];
    historyEvents.forEach(e => {
      if (!seen.has(e.dateGroup)) { seen.set(e.dateGroup, []); groups.push({ label: e.dateGroup, events: seen.get(e.dateGroup) }); }
      seen.get(e.dateGroup).push(e);
    });
    return groups;
  }, [historyEvents]);

  const isEmpty = activeTab === 'active' ? activeEvents.length === 0 : historyGroups.length === 0;

  // Variant A category pills (PRD 11). Same set + same palette as the Event
  // Timeline (Activity tab) so the user sees one filter rail across the app.
  // "All" pill removed 2026-06-06 - empty selection IS "show all"; explicit
  // reset lives in a "N selected · Clear x" strip above the row only when
  // filters are active. Mirrors the Timeline tab anatomy on the System page.
  const FILTERS = [
    { key: 'water', label: t('alerts.filters.water'), color: '#DB4670' },
    { key: 'valve', label: t('alerts.filters.valve'), color: '#036AB5' },
    { key: 'power', label: t('alerts.filters.power'), color: '#B5651A' },
    { key: 'conn',  label: t('alerts.filters.comms'), color: '#717684' },
  ];

  // ── Header data ──
  // Header rendering (badge + breadcrumb + title + chevron) is handled by the
  // shared ScopeHeader component - same code path as Home. Here we only need
  // the scoped system list (for the sub-line counts) and the locations-below
  // derivation; the title fallback is owned by ScopeHeader (selectedScope?.name
  // || 'My Systems' - no account-name fallback). 2026-06-15.
  const scopedSystems = selectedScope?.systems || visibleSystems;
  const totalSystems = scopedSystems.length;

  // Slide-in animation when arriving from a Home deep-link. iOS-style page
  // push: full-width translate, ~400 ms, smooth easing. No opacity fade —
  // pure slide reads as motion, fade reads as flicker. Plays once on mount;
  // subsequent in-screen tab/filter changes don't replay.
  const cameFromDrillDown = !!filterParam;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: GLOW_PAGE_BG,
      /* GLOW_PAGE_BG IS var(--app-bg) NOW — see src/components/PipesHeader.jsx.
         This screen's ground therefore follows the theme and the app-background
         selector, which it never did while the recipe was a frozen pale-blue
         literal. Its INK did not follow on its own: ScopeHeader carries v1
         literals (#14151A / #4A4F5A) that are invisible on a dark ground. These
         two custom properties are the opt-in — ScopeHeader reads them with
         those same literals as the fallback, so the two other screens that
         mount it and did NOT move are untouched. The v1 tabs and pills below
         keep their own literals: measured against every ground, the worst is
         the inactive tab at 3.6:1, which is legible. */
      '--v1-scope-ink': 'var(--foreground)',
      '--v1-scope-ink-dim': 'var(--muted-foreground)',
      animation: cameFromDrillDown ? 'alerts-slide-in 0.42s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
      willChange: cameFromDrillDown ? 'transform' : 'auto',
    }}>
      <style>{`
        @keyframes alerts-slide-in {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>

      {/* Header — shared with Home via ScopeHeader. Same code, same breadcrumb,
          same scope-pick behavior. Only the badge differs: Alerts uses the
          notifications_active glyph in danger red (the page is about alerts).
          The page's identity is also reinforced by the Active / History tab
          strip below + the bottom TabBar's active indicator. 2026-06-15. */}
      <PipesHeader glow={true}>
      <div style={{ padding: '0 0 0' }}>
        <ScopeHeader
          badgeIcon="notifications_active"
          badgeIconColor="#DB4670"
          badgeBgColor="rgba(219,70,112,0.10)"
          badgeBorderColor="rgba(219,70,112,0.20)"
          onDrawerOpen={() => setDrawerOpen(true)}
          subLine={
            <>
              {t('home.counts_systems', { count: totalSystems, formatted: totalSystems.toLocaleString() })}
              <span style={{ margin: '0 6px', opacity: 0.6 }}>·</span>
              {totalActiveCount === 0
                ? t('alerts.subline_all_clear')
                : t('alerts.subline_needs_attention', { count: totalActiveCount })}
            </>
          }
        />

        {/* Tabs - brand-blue active on light bg. No count badges on either
            tab (PRD 05 lock 2026-06-13). The only count surface on this page
            is the header sub-line ({N} systems . {M} need attention). */}
        <div style={{ display: 'flex' }}>
          {[
            { key: 'active', label: t('alerts.tabs.active') },
            { key: 'history', label: t('alerts.tabs.history') },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flex: 1, padding: '9px 0', border: 'none', background: 'none',
              fontFamily: 'inherit', cursor: 'pointer', fontSize: 15, fontWeight: activeTab === tab.key ? 700 : 600,
              color: activeTab === tab.key ? '#0B95F8' : '#717684',
              borderBottom: activeTab === tab.key ? '2px solid #0B95F8' : '2px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      </PipesHeader>

      {/* Filter pills — 5 equal-width pills, fit on one row (no horizontal
          scroll). Same set as the Event Timeline so the filter rail reads as
          one component across the app. Selected pill is always highlighted —
          if the URL filter param maps to one of these pills, it lands here
          pre-selected (pillForUrlFilter handles legacy filter values too). */}
      {/* Multi-select filter rail. Selected pills carry a small checkmark.
          When any filter is active, a small "×" reset button appears INLINE
          at the end of the row - same height, pills don't shift down. */}
      <div style={{
        padding: '10px 14px', flexShrink: 0, display: 'flex', gap: 6,
        borderBottom: `1px solid ${theme.divider}`, alignItems: 'center',
      }}>
        {FILTERS.map(f => {
          const active = activeFilters.has(f.key);
          return (
            <button key={f.key} onClick={() => toggleFilter(f.key)} style={{
              flex: 1, minWidth: 0,
              padding: '6px 8px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
              fontFamily: 'inherit', cursor: 'pointer',
              background: active ? f.color + '22' : theme.inputBg,
              color: active ? f.color : theme.textTertiary,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              {active && <span className="material-symbols-outlined" style={{ fontSize: 14, color: f.color }}>check</span>}
              {f.label}
            </button>
          );
        })}
        {activeFilters.size > 0 && (
          <button onClick={clearFilters} title={t('alerts.filters.clear')} style={{
            width: 28, height: 28, flexShrink: 0,
            borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: theme.inputBg, color: theme.textTertiary,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, fontFamily: 'inherit',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        )}
      </div>

      {/* Water sub-tier — appears only when the Water main pill is active.
          Lets the user narrow to High Flow or Low Flow specifically. Variant A
          palette: High #DB4670, Low #F05C25. */}
      {activeFilters.has('water') && (
        <div style={{
          padding: '8px 14px', flexShrink: 0, display: 'flex', gap: 6,
          borderBottom: `1px solid ${theme.divider}`,
          background: 'rgba(219,70,112,0.04)',
        }}>
          {[
            { key: 'all',  label: 'All water', color: '#DB4670' },
            { key: 'high', label: 'High Flow', color: '#DB4670' },
            { key: 'low',  label: 'Low Flow',  color: '#F05C25' },
          ].map(s => {
            const active = waterSub === s.key;
            return (
              <button key={s.key} onClick={() => setWaterSub(s.key)} style={{
                flex: 1, minWidth: 0,
                padding: '4px 8px', borderRadius: 999, border: `1px solid ${active ? s.color : (theme.cardBorderColor || '#E5E8EE')}`,
                fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                background: active ? s.color : theme.card,
                color: active ? '#fff' : s.color,
                whiteSpace: 'nowrap',
              }}>{s.label}</button>
            );
          })}
        </div>
      )}

      {/* Swipeable list */}
      <SwipeableAlertTabs activeTab={activeTab} onSwipe={setActiveTab}>
        {/* Active */}
        <div style={{ padding: '10px 14px 12px' }}>
          {/* Filter-scope strip — only when filters are active. Tells the user
              the LIST below is a subset of the headline counter (which stays
              fleet-total). Hidden when no filters are on. */}
          {activeFilters.size > 0 && (
            <div style={{
              fontSize: 12, color: theme.textTertiary, fontWeight: 600,
              padding: '0 2px 8px', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <MIcon name="filter_alt" size={14} color={theme.textTertiary} />
              Showing {activeEvents.length} of {totalActiveAlertsCount} (filtered)
            </div>
          )}
          {activeEvents.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 60 }}>
              <MIcon name="check_circle" size={40} color={theme.green} fill />
              <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginTop: 10 }}>
                {activeFilters.size > 0 && totalActiveAlertsCount > 0 ? 'No matches for this filter' : 'No active alerts'}
              </div>
              <div style={{ fontSize: 15, color: theme.textTertiary, marginTop: 4 }}>
                {activeFilters.size > 0 && totalActiveAlertsCount > 0 ? 'Clear filters to see all attention items' : 'All systems operating normally'}
              </div>
            </div>
          ) : activeEvents.map(ev => <EventRow key={ev.id} event={ev} />)}
        </div>

        {/* History */}
        <div style={{ padding: '10px 14px 12px' }}>
          {activeFilters.size > 0 && historyEvents.length > 0 && (
            <div style={{
              fontSize: 12, color: theme.textTertiary, fontWeight: 600,
              padding: '0 2px 8px', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <MIcon name="filter_alt" size={14} color={theme.textTertiary} />
              Showing {historyEvents.length} of {allHistoryEvents.length} (filtered)
            </div>
          )}
          {historyGroups.length === 0
            ? <div style={{ textAlign: 'center', color: theme.textTertiary, fontSize: 15, marginTop: 40 }}>No history</div>
            : historyGroups.map(({ label, events }) => (
                <div key={label}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', padding: '12px 0 8px' }}>
                    {label}
                  </div>
                  {events.map(ev => <EventRow key={ev.id} event={ev} />)}
                </div>
              ))
          }
        </div>
      </SwipeableAlertTabs>

      <TabBar activeTab="events" />

      <NavigationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectLocation={() => setDrawerOpen(false)}
      />
    </div>
  );
}
