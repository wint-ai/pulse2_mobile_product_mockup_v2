import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TabBar from '../../components/TabBar';
import PipesHeader, { GLOW_PAGE_BG } from '../../components/PipesHeader';
import EventRow from '../../components/EventRow';
import CompactBreadcrumb from '../../components/CompactBreadcrumb';
/* THE SHARED HEADER BAR IS NO LONGER MOUNTED HERE, 2026-11-04. Owner, looking
   at this page: "Remove the header of like 'My Systems', so the navigation
   option from this view shouldn't be there, only on the dashboard." Figma
   199532:87604 agrees - its title row draws a back chevron and a centred
   title, and both the scope chevron and the Avatar are hidden in that frame.
   See the title-row block below for what replaced it, and for the two
   readouts that were deliberately kept. */
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import FilterSheet, { FilterSheetTrigger } from '../../v2/components/FilterSheet';
import { countActiveFilters } from '../../v2/components/filterSheetModel';
import { Button } from '../../components/ui/button';
import { badgeVariants } from '../../components/ui/badge';
import { ChevronLeft } from 'lucide-react';
import { Funnel } from '../../v2/icons';
import { cn } from '../../lib/utils';
import { getAncestorScopes } from '../../utils/ancestorScopes';
import { CURRENT_EVENTS, HISTORY_EVENTS, computeIgnoredEvents, computePusherResolvedEvents, scopeActiveAlerts } from '../../data/events';
import { useAlertScope, useScopedActiveAlerts } from '../../hooks/useActiveAlerts';
import { useUserContext } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import { useDataRefresh } from '../../utils/useDataRefresh';

const ALERT_TABS = ['active', 'history'];

/* THE THOUSANDS SEPARATOR IS A COMMA (docs/wint-format-standards.md, binding
   project-wide). Every number this file puts on screen goes through it - the
   history list is already three digits. */
const num = (n) => Number(n).toLocaleString('en-US');

/* ── NEW COPY - AWAITING OWNER APPROVAL ───────────────────────────────────
   Figma 199532:87604 gives the title row a red count badge followed by a
   phrase naming WHAT IS BEING LISTED: "25  Active water events". This page had
   neither - it drew the scope name, which is neither a count nor a subject.

   Two things below are NOT the frame's literal bytes, and both are reported to
   the owner rather than settled here:

   1. CASING. The frame writes "water events" lowercase. The design guide and
      wint-ui-copy section 1 lock "Water Event" TITLE-CASE in UI labels, and
      the catalogue already spells it that way at home.water_events.title
      ("Water Events") and home.water_events.empty ("No active Water Events").
      A locked catalogue string outranks a frame transcription (copy rule 0:
      the catalogue is the source of truth), so these read "Water Events".
      "alerts" stays lowercase mid-phrase because the catalogue does the same
      at alerts.empty_active ("No active alerts").
   2. THE HISTORY WORD. The frame's second tab is "Past"; the catalogue's is
      "History" (alerts.tabs.history), and ignore_sheet.warning_bullet_history
      says "It moves to History." to the user elsewhere in the app. That
      conflict is the OWNER'S to rule, so nothing here renames the tab - and
      the history title is spelled "<subject> history" rather than
      "Past <subject>" so the title and the tab beside it cannot contradict
      each other while the ruling is outstanding. One edit then moves both. */
const TITLE_PHRASES = {
  active:  { water: 'Active Water Events',  mixed: 'Active alerts' },
  history: { water: 'Water Events history', mixed: 'Alerts history' },
};
/* The frame's own word for "no constraint" on the filter chip. */
const ALL_FILTERS_LABEL = 'All';

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
          <div key={i} style={{ width: `${100 / ALERT_TABS.length}%`, height: '100%', overflowY: 'auto', flexShrink: 0, paddingBottom: 93 }}>
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
  const navigate = useNavigate();
  const filterParam = searchParams.get('filter');
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
  // THE TWO FILTER RULES, now applied once when the sheet commits instead of
  // on every chip tap. Both survive the move from the rail to the sheet
  // unchanged, and both are the reason this is a function and not a setState:
  //   · an EMPTY category set is "show everything" (applyFilters reads
  //     activeFilters.size), so Clear is simply an empty set.
  //   · leaving 'water' RESETS the high/low tier, so the next time Water is
  //     picked it starts at "All water" rather than resurrecting a tier the
  //     user cannot see any more.
  // FilterSheet keeps its own draft and hands back the whole map on Apply, so
  // there is one commit per Apply and Cancel genuinely cancels.
  function handleFiltersApply(next) {
    const cats = new Set(next.category ?? []);
    setActiveFilters(cats);
    setWaterSub(cats.has('water') ? (next.waterSub ?? 'all') : 'all');
    setFiltersOpen(false);
  }
  const [filtersOpen, setFiltersOpen] = useState(false);
  /* drawerOpen left with <NavigationDrawer> on 2026-11-04 - see the mount
     site at the foot of this file for why the drawer itself went. */
  const { exploring, selectedScope, setSelectedScope, clearSelectedScope } = useUserContext() || {};

  // The persona / ?scope= / drawer-scope triple, and the one function that
  // applies it, both now live in src/hooks/useActiveAlerts.js so the bottom
  // tab bar narrows its count badge by exactly these rules. The drawer half
  // is the one with history: the title used to follow selectedScope while the
  // list did not, and the header said "Henrietta House · 2 alerts" over every
  // alert in the fleet. Locked since: same scope drives both.
  const alertScope = useAlertScope();

  function applyFilters(events) {
    // Scope first, through the shared rule. On the ACTIVE list this is a
    // second application and therefore a no-op (the list arrives scoped);
    // History still needs it, and running it on both keeps one code path.
    let list = scopeActiveAlerts(events, alertScope);
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
  //
  // SCOPED TOTALS. These feed the sub-line "X need attention", the "Showing X
  // of Y" line, and the bottom tab bar's count badge, which reads the same
  // hook so it can never disagree with this page.
  //
  // They are scoped to the persona / ?scope= / drawer selection as of
  // 2026-11-04, on the owner's explicit ruling. THIS REVERSES the note that
  // stood here before, which said these totals "MUST stay independent" of
  // narrowing, the way an Inbox unread-count never shrinks when you apply a
  // label filter. That rule shipped a contradiction the owner would not keep:
  // persona `tenant-1apt` owns one apartment and this header read
  // "Total 1 system · 15 need attention".
  //
  // HALF of the old rule survives, and the distinction matters: the four
  // category pills and the water high/low sub-filter still shrink the LIST
  // ONLY. That is why "Showing X of Y" still prints two numbers - Y is now
  // the scoped total instead of the fleet total. Scope and filter are
  // different axes and only the scope axis moved.
  const allActiveEvents = useScopedActiveAlerts();
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

  // Variant A category pills (PRD 11). Same set as the Event Timeline
  // (Activity tab) so the user sees one filter rail across the app.
  // "All" pill removed 2026-06-06 - empty selection IS "show all"; explicit
  // reset lives in the inline reset button at the end of the row, which
  // appears only while filters are active.
  //
  // THE PER-CATEGORY TINT IS GONE and the labels are what carry the category
  // now. The rail used to paint each selected pill in its own Variant A hue
  // (#DB4670 / #036AB5 / #B5651A / #717684) over a 13% wash. Those are v1
  // literals: they do not move under `dark`, `sand` or `contrast`, and four
  // different selected-colours cannot also be "visually consistent with the
  // tabs above", which is what this rebuild was asked for. Selection now reads
  // the same way everywhere on the page - white chip, 1px --primary, a tick -
  // and the tick is the non-colour cue the a11y rule asks for either way.
  // Raised for the owner rather than assumed: see the report.
  const FILTERS = [
    { key: 'water', label: t('alerts.filters.water') },
    { key: 'valve', label: t('alerts.filters.valve') },
    { key: 'power', label: t('alerts.filters.power') },
    { key: 'conn',  label: t('alerts.filters.comms') },
  ];

  // Water sub-tier. Strings come from the existing catalogue rather than being
  // retyped here (copy rule 0 - the catalogue is the source of truth).
  const WATER_SUBS = [
    { key: 'all',  label: t('alerts.water_sub_filters.all_water') },
    { key: 'high', label: t('alerts.water_sub_filters.high_flow') },
    { key: 'low',  label: t('alerts.water_sub_filters.low_flow') },
  ];

  // ── What the sheet is handed ──
  // The two rails above, declared rather than drawn. `visible` is why the
  // water tier is in the same array as the categories instead of being a
  // second sheet: it is meaningless unless Water itself is on, and the rule
  // reads off the DRAFT, so ticking Water reveals the tier immediately
  // without committing anything - the same behaviour the rail had.
  //
  // 'all' MUST be the first water option. countActiveFilters() treats a
  // single-select group's first option as that group's "no constraint" value,
  // which is how "All water" avoids inflating the count on the trigger.
  const FILTER_GROUPS = [
    {
      id: 'category',
      /* NEW COPY — awaiting owner approval. The four option labels are the
         catalogue's; the group needs a heading and the catalogue has none. */
      label: 'Alert type',
      mode: 'multi',
      options: FILTERS.map(f => ({ value: f.key, label: f.label })),
    },
    {
      id: 'waterSub',
      label: t('alerts.filters.water'),
      mode: 'single',
      options: WATER_SUBS.map(s => ({ value: s.key, label: s.label })),
      visible: (draft) => (draft.category ?? []).includes('water'),
    },
  ];
  const filterValue = { category: [...activeFilters], waterSub };
  const activeFilterCount = countActiveFilters(FILTER_GROUPS, filterValue);

  // ── WHAT THE HEADER BLOCK SAYS, AND IT IS PER TAB ──────────────────────
  // Figma 199532:87604 draws one count on the title badge, one on the filter
  // chip and one in the readout, and in the frame all three read 25 over a
  // list of 25. They are the same two numbers, so they are derived once here
  // rather than three times in the JSX: SHOWN is what the list is currently
  // drawing, TOTAL is what it would draw with no filter on. Both follow the
  // selected tab, because the Active and History lists have different
  // denominators and a readout that kept Active's numbers while History was
  // on screen would simply be wrong.
  const shownCount = activeTab === 'active' ? activeEvents.length : historyEvents.length;
  const totalCount = activeTab === 'active' ? totalActiveAlertsCount : allHistoryEvents.length;

  // WHICH LIST IS ON SCREEN, for the title's subject. "Water events" is the
  // honest word only when water is the ONLY category in force; the moment a
  // fault category joins it the list is mixed and the subject is "alerts".
  // An empty set is every category at once, which is also mixed.
  const waterOnly = activeFilters.size === 1 && activeFilters.has('water');
  const titlePhrase = TITLE_PHRASES[activeTab][waterOnly ? 'water' : 'mixed'];

  // THE CHIP'S WORD IS THE SELECTION, not the control's name - that is what
  // makes it a selector in the frame rather than a toggle. One constraint
  // names itself; past one, a count phrase, because two labels on a 117px chip
  // is a guess about which matters more. Same rule and same wording as
  // ValveManagementScreen's filterSummary, which the owner already has.
  // The water tier REPLACES the Water label when it is narrowed: landing on
  // ?filter=high under the word "Water" hides the thing that was deep-linked.
  const selectionLabels = FILTERS
    .filter((f) => activeFilters.has(f.key))
    .map((f) => (f.key === 'water' && waterSub !== 'all'
      ? (WATER_SUBS.find((s) => s.key === waterSub)?.label ?? f.label)
      : f.label));
  const selectionLabel = selectionLabels.length === 0
    ? ALL_FILTERS_LABEL
    : selectionLabels.length === 1
      ? selectionLabels[0]
      /* NEW COPY - awaiting owner approval. */
      : num(selectionLabels.length) + ' filters';

  // THE READOUT. "Showing X of Y (filtered)" is the catalogue's own string and
  // it is the one thing on this page that tells the user the list is a subset;
  // it used to sit inside each list panel and it is on the filter row now,
  // which is where the frame puts it. UNFILTERED IT STILL DRAWS, reading
  // "Showing 103 of 103" - that is the frame's own state (25 of 25) and it is
  // strictly more than the panel strips did, which vanished when no filter was
  // on and vanished AGAIN on History whenever the filtered list came back
  // empty. The "(filtered)" suffix is what carries the signal and it is only
  // spelled when it is true, so the catalogue entry cannot be reused for the
  // unfiltered case.
  /* NEW COPY - awaiting owner approval: the unfiltered half only. */
  const showingText = activeFilterCount > 0
    ? t('alerts.showing_x_of_y', { shown: num(shownCount), total: num(totalCount) })
    : 'Showing ' + num(shownCount) + ' of ' + num(totalCount);

  // ── Header data ──
  // The shared v1 <ScopeHeader> component is no longer MOUNTED here, but its
  // three rules are, inlined in the header block below — because this page's
  // header can no longer be the shared one. ScopeHeader draws an expand_more
  // caret and makes the whole title block the scope picker; the owner moved
  // scope-picking into the drawer (2026-11-04), and Home and SystemDetail
  // still mount ScopeHeader unchanged, so the caret had to come off HERE
  // rather than out of the shared component.
  //
  // What came across, all three Rule-0 saves:
  //
  //   1. THE TITLE RULE. `selectedScope?.name || 'My Systems'` — no
  //      account-name fallback. ScopeHeader's rule verbatim; it is what keeps
  //      this page's title identical to Home's, and two suites assert it
  //      (scopePersistsAcrossTabs, scopePersistsThroughDrawer). It is a
  //      READOUT now - naming the scope is not the same as picking it.
  //   2. THE BREADCRUMB. ScopeHeader drew a CompactBreadcrumb above the title
  //      whenever a scope was picked, and its crumbs are controls — tap an
  //      ancestor to widen, tap the root to clear. Same two handlers.
  //   3. THE DRAWER. ScopeHeader's badge+title block was this page's door to
  //      NavigationDrawer. The badge keeps that job, on its own.
  const scopedSystems = selectedScope?.systems || visibleSystems;
  const totalSystems = scopedSystems.length;
  const pageTitle = selectedScope?.name || t('home.title_default');
  const breadcrumbAncestors = (() => {
    if (!selectedScope) return null;
    const sample = (selectedScope.systems?.[0]) || scopedSystems[0];
    const all = sample ? getAncestorScopes(sample) : [];
    return all.slice(0, selectedScope.ancestors.length);
  })();

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
         literal. The tabs and the filter rail below are tokenised (--slate-*,
         --card, --primary) and follow all four themes on their own.
         The two custom properties below are still load-bearing, for the
         header's title and sub-line and for the v1 list rows under it: both
         carry v1 ink that is invisible on a dark ground, and these are the
         opt-in that lets them follow --foreground instead. */
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

      <PipesHeader glow={true}>
      <div style={{ padding: '0 0 0' }}>
        {/* ── THE ALERTS HEADER ────────────────────────────────
            REBUILT 2026-11-04 against Figma 199532:87604, on the owner's
            instruction given while looking at this page:

              "Remove the header of like 'My Systems', so the navigation
               option from this view shouldn't be there, only on the
               dashboard."

            THE FRAME SAYS THE SAME THING. Its title row is a Mobile Header Bar
            with the scope chevron and the 28px Avatar both hidden: a 24px
            chevron-left in a 30x30 box at the far left, and a centred title
            that is a RED COUNT BADGE followed by a phrase naming what is
            listed. There is no scope pill in it and no caret.

            WHAT WENT, and it is a real loss stated rather than hidden:

              · the shared AppHeaderBar with its "My Systems" scope pill. That
                pill was one of this page's two doors into NavigationDrawer.
              · the 38px bell disc beside it, which was the other door, and
                which scopePersistsAcrossTabs.dom.test.jsx pinned onto this
                page by its notifications_active glyph. That assertion is
                re-aimed at what the page now guarantees, not deleted.

            SO /alerts HAS NO DRAWER DOOR ANY MORE. That is what was asked for
            - scope is picked on the Dashboard and nowhere else - but it is a
            navigation capability leaving a page, so it is said in as many
            words. <NavigationDrawer> is still mounted at the foot of this
            file, currently unreachable, so restoring a door costs one handler
            rather than an import. Delete it only on the owner's word.

            WHAT STAYED, both deliberate Rule-0 saves, and the frame has no
            home for either:

              · THE BREADCRUMB. Its crumbs are CONTROLS - tap an ancestor to
                widen, tap the root to clear - and they are the one piece of
                scope machinery that was never a picker.
              · THE SUB-LINE, and THE SCOPE NAME MOVED INTO IT. "Total 103
                systems - 15 need attention" is the only surface here that says
                how big the scope is and how much of it is in trouble. The
                scope NAME was a readout, not a control: removing the pill must
                not also delete the answer to "which systems am I looking at",
                and three suites read that name off this page. */}
        <div
          className="flex flex-col gap-[6px] px-[14px] pt-[12px] pb-[10px]"
          data-name="alerts-header"
        >
          {/* 370x59 in the frame. The title is centred in what is LEFT OVER
              beside the back box rather than in the full width - which is how
              Mobile Header Bar centres its own scope slot, so a drawn back
              arrow shifts the title by half its box exactly as the node
              does. */}
          <div
            className="flex h-[59px] w-full items-center gap-[6px]"
            data-name="alerts-title-row"
          >
            {/* THE BACK CHEVRON IS DRAWN ONLY WHERE THERE IS SOMEWHERE TO GO.
                /alerts is a bottom-tab root, so back from it is normally
                meaningless and a chevron that does nothing is worse than no
                chevron at all. It IS meaningful on the one arrival this page
                already knows about: a Home pill, a Status Overview tap or a
                push deep-links here with ?filter=..., which is the same
                condition the slide-in animation plays on.

                THE DESTINATION IS THE DASHBOARD, not history.back(). A push
                can land on this URL with no in-app history behind it and
                navigate(-1) would then leave the app entirely. Every
                ?filter= deep link originates on the Dashboard, so / is where
                back goes. The accessible name NAMES THE DESTINATION rather
                than the glyph (copy rule 5). NEW COPY - awaiting approval. */}
            {cameFromDrillDown ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => navigate('/')}
                aria-label="Dashboard"
                title="Dashboard"
                className="flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full p-0 hover:bg-transparent active:opacity-60"
                data-name="alerts-back"
              >
                <ChevronLeft className="size-[24px]" style={{ color: 'var(--v1-scope-ink)' }} aria-hidden="true" />
              </Button>
            ) : null}

            {/* THE TITLE: a count badge and a subject. This page drew the
                scope name here, which is neither.

                IT IS NOT A BUTTON. The frame hides the caret, and the owner
                moved scope-picking off this view; a tappable title is exactly
                the header scope control he removed.

                THE BADGE IS RED ON ACTIVE ONLY. destructive is the frame's
                red and on Active it tells the truth - every row beneath it is
                an open alert. The same pill over History, where every row is
                resolved or ignored, would be colour saying "wrong" about a
                list where nothing is, so that tab gets the neutral secondary.
                The frame draws only Active and cannot settle it; reported.

                A SPAN, NOT <Badge>. badge.jsx renders a div and this is a
                heading; a div inside a heading's text run is invalid nesting
                that React warns about. Same shadcn recipe via badgeVariants,
                on a legal element. */}
            <h1
              className="flex min-w-0 flex-1 items-center justify-center gap-[8px]"
              data-name="alerts-title"
            >
              <span
                className={cn(
                  badgeVariants({ variant: activeTab === 'active' ? 'destructive' : 'secondary' }),
                  'h-[22px] shrink-0 justify-center px-[8px] text-[13px] leading-[18px] tabular-nums',
                )}
                data-name="alerts-title-count"
              >
                {num(shownCount)}
              </span>
              {/* Two elements, not one string: "25" abutting "Active Water
                  Events" inside one textContent is the counts-abut trap in
                  copy rule 4 one element over. */}
              <span
                className="min-w-0 truncate text-[16px] font-medium leading-6"
                style={{ color: 'var(--v1-scope-ink)' }}
                data-name="alerts-title-subject"
              >
                {titlePhrase}
              </span>
            </h1>
          </div>

          <div className="min-w-0">
            {/* The breadcrumb's crumbs ARE controls - tap an ancestor to
                widen, tap the root to clear - and they are the one piece of
                scope machinery that is NOT a picker, so they stay. Both
                handlers are ScopeHeader's, unchanged. */}
            {breadcrumbAncestors && (
              <CompactBreadcrumb
                ancestors={breadcrumbAncestors}
                onClearScope={() => clearSelectedScope?.()}
                onSelectAncestor={(a) => setSelectedScope?.(a)}
              />
            )}

            {/* THE SUB-LINE. It now opens with the SCOPE NAME, which is the
                readout the removed pill used to carry: the same string, the
                same rule (selectedScope?.name || 'My Systems', no
                account-name fallback), demoted from a control to the text it
                always was. The rest is untouched - the tab-bar badge counts
                alert ROWS and answers a different question. */}
            <div
              className="min-w-0 truncate text-[13px]"
              style={{ color: 'var(--v1-scope-ink-dim)' }}
              data-name="alerts-subline"
            >
              {/* Its own element so the name is addressable on its own, which
                  is how scopePersistsAcrossTabs asks for it. */}
              <span data-name="alerts-scope-name">{pageTitle}</span>
              <span style={{ margin: '0 6px', opacity: 0.6 }}>·</span>
              {t('home.counts_systems', { count: totalSystems, formatted: totalSystems.toLocaleString('en-US') })}
              {/* Real punctuation between the two counts, not whitespace:
                  `103` abutting `15 need attention` reads as `10315` to a
                  regex and to a screen reader in some modes (copy §4). */}
              <span style={{ margin: '0 6px', opacity: 0.6 }}>·</span>
              {totalActiveCount === 0
                ? t('alerts.subline_all_clear')
                : t('alerts.subline_needs_attention', { count: totalActiveCount })}
            </div>
          </div>
        </div>

        {/* Active / History — Figma 199922:83970's segmented control, which IS
            the repo's shadcn Tabs now. No className: the component carries the
            node (see its header), so anything spelled here would only give
            tailwind-merge something to fight.

            NO COUNT BADGE ON EITHER TAB, although ui/tabs.jsx now exports a
            TabsCount for exactly that slot and the frame draws one. This page
            is not allowed to use it: "No count badges on either tab (PRD 05
            lock 2026-06-13). The only count surface on this page is the header
            sub-line." The lock predates the redesign and a new component
            offering the slot does not reopen it - the owner does.

            *** FLAG FOR THE OWNER, 2026-11-04. The TRIGGERS still carry no
            badge, which is what that lock forbids in as many words. But its
            second sentence - "the only count surface on this page is the
            header sub-line" - is no longer true: Figma 199532:87604 draws a
            red count badge in the TITLE, and the filter row below draws the
            same number again on the chip and in "Showing N of M". Three count
            surfaces now, none of them a tab. The frame cannot overrule a PRD
            lock, so this is his call: either the lock meant the tabs only, or
            the title badge needs his word. Nothing here reopened the tabs. ***

            Radix owns the roles, the roving tabindex and the arrow keys. The
            PANELS are not TabsContent: they live inside SwipeableAlertTabs
            below, which slides both of them on one track and therefore needs
            both mounted, while TabsContent (even forceMount) hides the
            inactive one outright. Swiping is existing behaviour and keeping it
            working outranks owning the panel element. */}
        <div className="px-[14px] pb-[10px]">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="active">{t('alerts.tabs.active')}</TabsTrigger>
              <TabsTrigger value="history">{t('alerts.tabs.history')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      </PipesHeader>

      {/* ── THE FILTER ROW ─────────────────────────────────────
          THE STRUCTURAL DIFFERENCE the owner was pointing at. Figma
          199532:87604 puts TWO controls on one 370x30 row, and this page
          shipped one:

            left,  117x30 : a compact SELECTOR - a 16px funnel, the current
                            selection as its word, the number of rows that
                            selection yields, and an 18px chevron-down.
            right, 133x20 at x=237 : a 16px Phosphor funnel and a readout
                            reading "Showing 25 of 25".

          What stood here was ONE full-width "Filter by" button carrying a
          count of constraints, with "Showing X of Y (filtered)" drawn far
          below it, inside each list panel. Same two jobs, one row apart.

          THE SHEET BEHIND IT IS UNCHANGED. Still the shared
          src/v2/components/FilterSheet.jsx that the valve screen also uses -
          the owner asked for ONE filter pattern - and still the same groups,
          the same empty-set-means-all rule, the same water tier that appears
          only while Water is ticked, and the same ?filter=high / ?filter=low
          deep links. Only the TRIGGER changed shape, and it changed shape
          inside the shared component as an opt-in variant="chip" rather than
          by forking it here, the way that component took summary, searchable
          and selectAll for the valve screen.

          NOTHING THE ROW SAID WAS DROPPED, which is the one real risk in
          moving a readout. Measured before and after, both tabs, both list
          kinds:
            · the count of CONSTRAINTS is still on the trigger - as
              data-active-filters, and spoken in its accessible name.
            · "Showing X of Y (filtered)" is the same catalogue string with
              the same two numbers, moved up onto this row.
          It is now strictly MORE than before. The panel strips drew only
          while a filter was on, and the History one ALSO required the
          filtered list to be non-empty - so filtering to Valve/Power/Comms
          and tapping History gave an unexplained "No history" with no sign a
          filter was responsible. This readout always draws, and only says
          "(filtered)" when that is true. */}
      <div
        className="flex shrink-0 items-center justify-between gap-[8px] border-b border-solid border-border px-[14px] pb-[10px]"
        data-name="alerts-filters"
      >
        <FilterSheetTrigger
          variant="chip"
          label={selectionLabel}
          count={activeFilterCount}
          resultCount={shownCount}
          onClick={() => setFiltersOpen(true)}
        />

        {/* The frame names this node BreadcrumbItem, and it is not a
            breadcrumb: it is a status readout. ui/breadcrumb.jsx's
            BreadcrumbItem is an <li> and only renders legally inside
            BreadcrumbList inside a <nav aria-label="breadcrumb">, which would
            announce a count as site navigation. So the element is a plain
            one and the TREATMENT is that component's - inline-flex, the same
            gap, text-sm muted - which is what the frame actually draws. */}
        <div className="flex min-w-0 items-center gap-[6px]" data-name="alerts-showing">
          <Funnel size={16} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate text-sm leading-5 text-muted-foreground">
            {showingText}
          </span>
        </div>
      </div>

      {/* Swipeable list */}
      <SwipeableAlertTabs activeTab={activeTab} onSwipe={setActiveTab}>
        {/* Active */}
        <div style={{ padding: '10px 14px 12px' }} role="tabpanel" aria-label={t('alerts.tabs.active')}>
          {/* THE FILTER-SCOPE STRIP STOOD HERE and is on the filter row now,
              which is where Figma 199532:87604 draws it - same catalogue
              string, same two numbers, one row up and visible on both tabs
              whether or not a filter is on. Nothing was lost; see the row. */}
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
        <div style={{ padding: '10px 14px 12px' }} role="tabpanel" aria-label={t('alerts.tabs.history')}>
          {/* The History copy of that strip stood here. It carried one extra
              condition - historyEvents.length > 0 - so a filter that matched
              no history at all drew a bare "No history" and never said a
              filter was the reason. The row above has no such condition. */}
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

      {/* <NavigationDrawer> STOOD HERE and is UNMOUNTED, 2026-11-04.
          Owner, looking at this page: "Remove the header of like 'My
          Systems', so the navigation option from this view shouldn't be
          there, only on the dashboard."

          This page had exactly two doors into the drawer, the bell disc and
          the scope pill, and both were in the header he removed. A drawer
          with no door is worse than no drawer: it looks wired, it survives a
          mount check, and nothing can reach it. So it is off the page rather
          than left hanging.

          THIS IS A NAVIGATION CAPABILITY LEAVING A SCREEN and it is said
          plainly rather than implied: /alerts can no longer change scope.
          The drawer is reached from the Dashboard tab in the footer, which is
          where the owner put scope. The scope this page is UNDER is still
          named, in the sub-line - a readout, which is the half of the old
          header that was never a control.

          RESTORING IT is the import, three lines of state, and a trigger
          carrying aria-label={t('home.switch_location')} - which is the name
          drawerLocationHighlight.dom.test.jsx:66 opens the drawer BY, and the
          name any new door must use. */}

      {/* Last in the page, so its `absolute inset-0` lands over the list and
          the tab bar without a z-index race. Not a Radix Sheet: that portals
          to document.body and escapes the 393x852 frame - see FilterSheet's
          header. */}
      <FilterSheet
        open={filtersOpen}
        groups={FILTER_GROUPS}
        value={filterValue}
        clearLabel={t('alerts.filters.clear')}
        onApply={handleFiltersApply}
        onClose={() => setFiltersOpen(false)}
      />
    </div>
  );
}
