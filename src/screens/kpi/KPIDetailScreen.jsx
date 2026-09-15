import { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useUserContext } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import { getConsumption } from '../../data/consumption';
import { computeSystemHealth } from '../../utils/systemHealth';
import { isIgnored } from '../../data/ignoredIncidents';
import TabBar from '../../components/TabBar';

const TYPE_CONFIG = {
  'high-flows':    { title: 'Active High Flows',   color: '#DB4670', icon: '\uD83D\uDCA7' },
  'low-flows':     { title: 'Active Low Flows',    color: '#F05C25', icon: '\uD83D\uDCA7' },
  'errors':        { title: 'Active Errors',        color: '#717684', icon: '\u26A0\uFE0F' },
  'insights':      { title: 'Insights',             color: '#04ADEF', icon: '\uD83D\uDCA1' },
  'consumption':   { title: 'Water Consumption',    color: '#04ADEF', icon: '\uD83D\uDCA7' },
  // Comm states
  'comm-online':   { title: 'Comm \u00B7 Online',   color: '#04ADEF', icon: '\uD83D\uDCF6' },
  'comm-offline':  { title: 'Comm \u00B7 Offline',  color: '#DB4670', icon: '\uD83D\uDCE1' },
  // Valve states
  'valve-open':    { title: 'Valves \u00B7 Open',    color: '#04ADEF', icon: '\uD83D\uDCA7' },
  'valve-closed':  { title: 'Valves \u00B7 Closed',  color: '#717684', icon: '\u26D4' },
  'valve-error':   { title: 'Valves \u00B7 Error',   color: '#DB4670', icon: '\u2699\uFE0F' },
  'valve-na':      { title: 'Valves \u00B7 N/A',     color: '#717684', icon: '\u2014' },
  // Power states
  'power-ac':      { title: 'Power \u00B7 AC',       color: '#04ADEF', icon: '\u26A1' },
  'power-ac-lost': { title: 'Power \u00B7 AC Lost',  color: '#DB4670', icon: '\u26A1' },
  'power-battery': { title: 'Power \u00B7 Battery',  color: '#F05C25', icon: '\uD83D\uDD0B' },
  // Protection
  'protection-nocomm':         { title: 'Non-Communicating',    color: '#DB4670', icon: '\uD83D\uDCE1' },
  'protection-valve-error':    { title: 'Valve Errors',         color: '#F05C25', icon: '\u2699\uFE0F' },
  'protection-power-lost':     { title: 'External Power Loss',   color: '#E5A100', icon: '\u26A1' },
  'protection-no-recipients':  { title: 'No Alert Contacts',    color: '#FACC15', icon: '\uD83D\uDD14' },
  // Home-screen unified drilldowns (Option 3, locked 2026-06-03).
  // Every tap on Home lands here so behavior + view are consistent.
  'water-events':              { title: 'Active Water Events',  color: '#DB4670', icon: '\uD83D\uDCA7' },
  'needs-attention':           { title: 'Systems requiring attention', color: '#A5455E', icon: '\u26A0\uFE0F' },
  'recipients-missing':        { title: 'Locations missing recipients', color: '#A5455E', icon: '\uD83D\uDD14' },
  'recipients-registered':     { title: 'Locations with recipients',    color: '#2F6112', icon: '\uD83D\uDD14' },
};

const ALERT_PILL_CONFIG = {
  'leak-high':   { icon: '\uD83D\uDCA7', label: 'High Flow Water Event', color: '#DB4670' },
  'leak-low':    { icon: '\uD83D\uDCA7', label: 'Low Flow Water Event',  color: '#F05C25' },
  'valve-error': { icon: '\u2699\uFE0F', label: 'Valve error',           color: '#717684' },
  'power-lost':  { icon: '\u26A1',       label: 'AC power lost',         color: '#717684' },
  'offline':     { icon: '\uD83D\uDCE1', label: 'Device offline',        color: '#717684' },
};

function formatNumber(n) {
  return n.toLocaleString('en-US');
}

/* ── Status badge for system rows ──────────────────────────────────────── */
function StatusBadge({ label, color }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
      background: color + '18', color, flexShrink: 0,
    }}>{label}</span>
  );
}

/* ── System row for status-based filters ───────────────────────────────── */
function SystemRow({ sys, statusLabel, statusColor, navigate, theme }) {
  const hasAlert = !!sys.alert;
  return (
    <div
      onClick={() => navigate(`/system/${sys.id}`)}
      style={{
        display: 'flex', alignItems: 'center', padding: '8px 12px',
        borderBottom: `1px solid ${theme.divider}`, cursor: 'pointer', gap: 8,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sys.name}
        </div>
        {hasAlert && (
          <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 1 }}>
            {sys.alert.label} {'\u00B7'} {sys.alert.age}
          </div>
        )}
      </div>
      <StatusBadge label={statusLabel} color={statusColor} />
      <span style={{ fontSize: 14, color: theme.textDimmest }}>{'\u203A'}</span>
    </div>
  );
}

/* ── Alert-style row (for leaks/errors) ────────────────────────────────── */
function AlertStyleRow({ sys, navigate, theme }) {
  const alert = sys.alert;
  const cfg = ALERT_PILL_CONFIG[alert.type] || { icon: '\u26A0', label: alert.type, color: '#717684' };
  const isLeak = alert.type === 'leak-high' || alert.type === 'leak-low';

  return (
    <div
      onClick={() => navigate(isLeak ? `/alert/${sys.id}` : `/system/${sys.id}`)}
      style={{
        background: theme.card, borderRadius: 16, marginBottom: 6,
        border: theme.cardBorder, borderLeft: `4px solid ${cfg.color}`,
        padding: '10px 13px', cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{
          fontSize: 14, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
          background: cfg.color + '18', color: cfg.color, border: `0.5px solid ${cfg.color}35`,
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        }}>
          {cfg.icon} {cfg.label}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 14, color: theme.textTertiary, flexShrink: 0 }}>
          {alert.age}
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 2 }}>{sys.name}</div>
      <div style={{ fontSize: 15, color: theme.textTertiary }}>{sys.l4Name || sys.l3Name} {'\u00B7'} {sys.l3Name || sys.l2Name}</div>
    </div>
  );
}

function ErrorRow({ sys, navigate, theme }) {
  const alertType = sys.alert ? sys.alert.type : 'offline';
  const cfg = ALERT_PILL_CONFIG[alertType] || { icon: '\u26A0', label: alertType, color: '#717684' };

  return (
    <div
      onClick={() => navigate(`/system/${sys.id}`)}
      style={{
        background: theme.card, borderRadius: 16, marginBottom: 6,
        border: theme.cardBorder, borderLeft: `4px solid ${cfg.color}`,
        padding: '10px 13px', cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{
          fontSize: 14, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
          background: cfg.color + '18', color: cfg.color, border: `0.5px solid ${cfg.color}35`,
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        }}>
          {cfg.icon} {cfg.label}
        </span>
        {sys.alert?.age && (
          <span style={{ marginLeft: 'auto', fontSize: 14, color: theme.textTertiary, flexShrink: 0 }}>
            {sys.alert.age}
          </span>
        )}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 2 }}>{sys.name}</div>
      <div style={{ fontSize: 15, color: theme.textTertiary }}>{sys.l4Name || sys.l3Name} {'\u00B7'} {sys.l3Name || sys.l2Name}</div>
    </div>
  );
}

function ConsumptionRow({ sys, mtd, navigate, theme }) {
  return (
    <div
      onClick={() => navigate(`/system/${sys.id}`)}
      style={{
        background: theme.card, borderRadius: 16, marginBottom: 6,
        border: theme.cardBorder, borderLeft: '4px solid #04ADEF',
        padding: '10px 13px', cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{sys.name}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#04ADEF', flexShrink: 0 }}>
          {formatNumber(mtd)} L
        </div>
      </div>
      <div style={{ fontSize: 15, color: theme.textTertiary }}>{sys.l4Name || sys.l3Name} {'\u00B7'} {sys.l3Name || sys.l2Name}</div>
    </div>
  );
}

/* ── Group systems by location ─────────────────────────────────────────── */
function groupByLocation(systems) {
  const groups = {};
  for (const sys of systems) {
    const key = `${sys.l4Name || sys.l3Name} \u00B7 ${sys.l3Name || sys.l2Name}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(sys);
  }
  return Object.entries(groups);
}

/* ── Grouped status list ───────────────────────────────────────────────── */
function GroupedStatusList({ systems, statusLabel, statusColor, navigate, theme, search }) {
  const q = search.toLowerCase();
  const filtered = q
    ? systems.filter(s => s.name.toLowerCase().includes(q) || (s.l4Name || '').toLowerCase().includes(q))
    : systems;

  const groups = groupByLocation(filtered);
  const multipleLocations = groups.length > 1;

  // Collapse all locations by default when there are multiple; auto-expand when searching or single location
  const [expanded, setExpanded] = useState(() => new Set());
  // When user is searching, expand all to make results visible
  const effectivelyExpanded = q || !multipleLocations
    ? new Set(groups.map(([loc]) => loc))
    : expanded;

  const toggle = (loc) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(loc)) next.delete(loc); else next.add(loc);
    return next;
  });

  if (groups.length === 0) return null;

  return (<>{groups.map(([location, sysList]) => {
    const isOpen = effectivelyExpanded.has(location);
    return (
      <div key={location} style={{ marginBottom: 10 }}>
        <div onClick={() => multipleLocations && !q && toggle(location)} style={{
          fontSize: 12, fontWeight: 800, color: theme.textTertiary,
          textTransform: 'uppercase', letterSpacing: '0.5px',
          padding: '6px 12px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: multipleLocations && !q ? 'pointer' : 'default',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {multipleLocations && !q && (
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: theme.textTertiary, transition: 'transform 0.15s' }}>
                {isOpen ? 'expand_more' : 'chevron_right'}
              </span>
            )}
            {location}
          </span>
          <span>{sysList.length}</span>
        </div>
        {isOpen && (
          <div style={{ background: theme.card, borderRadius: 12, border: theme.cardBorder, overflow: 'hidden' }}>
            {sysList.map(sys => (
              <SystemRow
                key={sys.id}
                sys={sys}
                statusLabel={statusLabel}
                statusColor={statusColor}
                navigate={navigate}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>
    );
  })}</>);
}

/* ── Main screen ───────────────────────────────────────────────────────── */
export default function KPIDetailScreen() {
  const { theme } = useTheme();
  const { type } = useParams();
  const navigate = useNavigate();
  const { visibleSystems = [] } = useUserContext() || {};
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');

  // If scope param exists, filter to only those system IDs
  const scopeParam = searchParams.get('scope');
  const baseSystems = useMemo(() => {
    if (!scopeParam) return visibleSystems;
    const scopeIds = new Set(scopeParam.split(','));
    return visibleSystems.filter(s => scopeIds.has(s.id));
  }, [scopeParam, visibleSystems]);

  const config = TYPE_CONFIG[type] || { title: type, color: '#717684', icon: '' };

  // Status-based filter types — render as a GroupedStatusList (system rows
  // grouped by location with collapsible headers). The "Home unified
  // drilldowns" recipients-* types use the same view.
  const isStatusFilter = type?.startsWith('comm-') || type?.startsWith('valve-') || type?.startsWith('power-') || type?.startsWith('protection-') || type?.startsWith('recipients-');

  const { filtered, content } = useMemo(() => {
    let filtered = [];
    let content = null;

    if (type === 'high-flows') {
      filtered = baseSystems.filter(s => s.alert?.type === 'leak-high');
      content = filtered.map(s => <AlertStyleRow key={s.id} sys={s} navigate={navigate} theme={theme} />);
    } else if (type === 'low-flows') {
      filtered = baseSystems.filter(s => s.alert?.type === 'leak-low');
      content = filtered.map(s => <AlertStyleRow key={s.id} sys={s} navigate={navigate} theme={theme} />);
    } else if (type === 'errors') {
      filtered = baseSystems.filter(s => {
        if (!s.alert) return s.comm === 'offline';
        return s.alert.type !== 'leak-high' && s.alert.type !== 'leak-low';
      });
      content = filtered.map(s => <ErrorRow key={s.id} sys={s} navigate={navigate} theme={theme} />);
    } else if (type === 'insights') {
      content = (
        <div style={{
          background: theme.card, borderRadius: 16, border: theme.cardBorder,
          padding: '40px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>{'\uD83D\uDCA1'}</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 4 }}>Coming soon</div>
          <div style={{ fontSize: 15, color: theme.textTertiary }}>AI-powered insights will appear here.</div>
        </div>
      );
    } else if (type === 'consumption') {
      const withMtd = baseSystems.map(s => ({
        sys: s,
        mtd: getConsumption(s.id, s.name).mtd,
      })).sort((a, b) => b.mtd - a.mtd);
      filtered = withMtd.map(w => w.sys);
      content = withMtd.map(({ sys, mtd }) => (
        <ConsumptionRow key={sys.id} sys={sys} mtd={mtd} navigate={navigate} theme={theme} />
      ));
    }
    // Comm filters
    else if (type === 'comm-online') {
      filtered = baseSystems.filter(s => s.comm === 'online');
    } else if (type === 'comm-offline') {
      filtered = baseSystems.filter(s => s.comm === 'offline' || s.offline);
    }
    // Valve filters
    else if (type === 'valve-open') {
      filtered = baseSystems.filter(s => s.valve === 'open');
    } else if (type === 'valve-closed') {
      filtered = baseSystems.filter(s => s.valve === 'closed');
    } else if (type === 'valve-error') {
      filtered = baseSystems.filter(s => s.valve === 'error');
    } else if (type === 'valve-na') {
      filtered = baseSystems.filter(s => s.valve === null || s.comm === 'offline');
    }
    // Power filters
    else if (type === 'power-ac') {
      filtered = baseSystems.filter(s => s.power === 'ac' && s.comm === 'online');
    } else if (type === 'power-ac-lost') {
      filtered = baseSystems.filter(s => s.power === 'ac-lost');
    } else if (type === 'power-battery') {
      filtered = baseSystems.filter(s => s.power === 'battery');
    }
    // Protection filters (use scope param for the system list)
    else if (type === 'protection-nocomm') {
      const H24 = 24 * 3600000;
      filtered = baseSystems.filter(s => {
        if (!s.lastSeen) return s.offline || s.comm === 'offline';
        return (Date.now() - new Date(s.lastSeen).getTime()) > H24;
      });
    } else if (type === 'protection-valve-error') {
      filtered = baseSystems.filter(s => s.valve === 'error');
    } else if (type === 'protection-power-lost') {
      filtered = baseSystems.filter(s => s.power === 'ac-lost');
    } else if (type === 'protection-no-recipients') {
      filtered = baseSystems.filter(s => (s.notificationRecipients || 0) === 0);
    }
    // Home unified drilldowns (Option 3) — same screen, same view, no per-pill divergence.
    else if (type === 'water-events') {
      filtered = baseSystems.filter(s =>
        (s.alert?.type === 'leak-high' || s.alert?.type === 'leak-low') && !isIgnored(s.id)
      );
      content = filtered.map(s => <AlertStyleRow key={s.id} sys={s} navigate={navigate} theme={theme} />);
    } else if (type === 'needs-attention') {
      // Mirrors the count shown on the Systems Health card. Uses the shared
      // computeSystemHealth helper so the two surfaces always agree.
      filtered = baseSystems.filter(s => !computeSystemHealth(s).allOk);
      content = filtered.map(s => <ErrorRow key={s.id} sys={s} navigate={navigate} theme={theme} />);
    } else if (type === 'recipients-missing') {
      filtered = baseSystems.filter(s => (s.notificationRecipients || 0) === 0);
    } else if (type === 'recipients-registered') {
      filtered = baseSystems.filter(s => (s.notificationRecipients || 0) > 0);
    }

    return { filtered, content };
  }, [type, baseSystems, navigate, theme]);

  const count = filtered.length;

  // No slide-in animation here — opening a state-filtered system list (Open
  // valves, On AC, etc.) shouldn't feel like a "screen switch". The slide is
  // reserved for the Alerts tab destination only (locked 2026-06-04).
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: theme.bg }}>

      {/* Header */}
      <div style={{
        background: theme.headerBg,
        borderBottom: theme.headerBorder,
        padding: '11px 16px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            onClick={() => navigate(-1)}
            style={{
              width: 32, height: 32, borderRadius: 16,
              background: theme.card, border: theme.cardBorder,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, fontSize: 16, color: theme.text,
            }}
          >
            {'\u2039'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px', color: theme.text }}>
              {config.title}
            </div>
          </div>
          {type !== 'insights' && (
            <span style={{
              fontSize: 15, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
              background: config.color + '18', color: config.color,
              border: `0.5px solid ${config.color}35`, flexShrink: 0,
            }}>
              {count}
            </span>
          )}
        </div>
      </div>

      {/* Search — only for status filters with many results */}
      {isStatusFilter && count > 5 && (
        <div style={{ padding: '8px 14px 6px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: theme.inputBg, borderRadius: 10, padding: '7px 10px' }}>
            <span style={{ fontSize: 15, color: theme.textTertiary }}>{'\uD83D\uDD0D'}</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search systems\u2026"
              style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 15, color: theme.text, fontFamily: 'inherit', outline: 'none' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: theme.textTertiary }}>{'\u00D7'}</button>
            )}
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 8px' }}>
        {isStatusFilter ? (
          <GroupedStatusList
            systems={filtered}
            statusLabel={config.title.split('\u00B7')[1]?.trim() || config.title}
            statusColor={config.color}
            navigate={navigate}
            theme={theme}
            search={search}
          />
        ) : (
          content
        )}

        {type !== 'insights' && count === 0 && (
          <div style={{
            background: theme.card, borderRadius: 16, border: theme.cardBorder,
            padding: '30px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 15, color: theme.textTertiary }}>No items to display.</div>
          </div>
        )}
      </div>

      <TabBar activeTab="home" />
    </div>
  );
}
