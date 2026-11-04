// Unified Home screen — Status / Details / Info tabs + navigation drawer
// Replaces the separate Home + Systems tabs

import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TabBar from '../../components/TabBar';
import { useDataRefresh } from '../../utils/useDataRefresh';
import StatusWidgetsMobile from '../../components/StatusWidgetsMobile';
import PipesHeader, { WINT_SKY_HOME_BG, WINT_SKY_HOME_BG_SIZE } from '../../components/PipesHeader';
import NavigationDrawer from '../../components/NavigationDrawer';
import ScopeHeader from '../../components/ScopeHeader';
import { useUserContext } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import { getAccountById } from '../../data/accounts';
import { getNotesOverride, setNotes, getPictures, addPicture, removePicture } from '../../data/locationInfoStore';

function MIcon({ name, size = 18, fill = false, color, style = {} }) {
  return (
    <span className="material-symbols-outlined"
      style={{ fontSize: size, fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0", color, lineHeight: 1, ...style }}
    >{name}</span>
  );
}

// (ThreeQuarterGauge component removed 2026-06-04 — replaced by the linear
// bar treatment for the Systems Health card. The bicolor split logic now
// lives inline in StatusTab below. Kept in git history if we ever revive
// the arc gauge for a different surface.)

// O3 glassy ombre bar background (locked 2026-06-09).
// See docs/PRD/HTMLs/home-systems-health.html + PRD 03b.
// Returns the `background` CSS value for the Systems Health bar.
//
// Stops shift dynamically with the healthy percentage so the crossfade band
// always sits at the boundary between healthy (green) and attention (red).
// - all-green (arcPct === 100): pure green ombre, no red.
// - all-red (arcPct === 0): pure red ombre, no green.
// - bicolor (1-99): green dominates 0%-(arcPct-4)%, crossfade band at arcPct%,
//   red runs (arcPct+3)%-100%.
// - no systems in scope: muted grey track.
function ombreBarBackground(hasSystems, arcPct) {
  if (!hasSystems) return 'rgba(20,21,26,0.05)';
  const glass = 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.08) 100%)';
  if (arcPct === 100) {
    return `${glass}, linear-gradient(90deg, #4E8615 0%, #5C9E1A 50%, #6FAE2A 100%)`;
  }
  if (arcPct === 0) {
    return `${glass}, linear-gradient(90deg, #B4516B 0%, #A5455E 50%, #8C3950 100%)`;
  }
  const mid = Math.round(arcPct / 2);
  const greenEnd = Math.max(0, arcPct - 4);
  const redStart = Math.min(100, arcPct + 3);
  return `${glass}, linear-gradient(90deg, #4E8615 0%, #5C9E1A ${mid}%, #6FAE2A ${greenEnd}%, #B4516B ${arcPct}%, #A5455E ${redStart}%, #8C3950 100%)`;
}

// ── Tab 1: Status — health gauge, breakdown, insights ──
function StatusTab({ systems, theme, navigate }) {
  const { t } = useTranslation();
  const [showInfo, setShowInfo] = useState(false);
  const dk = theme.mode === 'dark' || theme.mode === 'ocean' || theme.mode === 'gradient' || theme.mode === 'midnight';

  const total = systems.length;

  // Four disqualifier dimensions (Confluence 1529151494 — Widget 1: Location Health).
  // Each filter is INDEPENDENT — the quick-stat cards show per-category counts,
  // and a single system can appear in more than one card. "Require attention"
  // is the deduplicated union.
  //
  //   Offline      → comm === 'offline' (or legacy `offline === true`)
  //   AC lost      → power === 'ac-lost'
  //   Valve fault  → valve === 'error' OR 'disconnected'  (Valve Error / Valve Disconnected per spec)
  //   No recipients → notificationRecipients === 0  (per-system here; spec counts locations)
  const offlineList    = systems.filter(s => s.comm === 'offline' || s.offline === true);
  const onlineList     = systems.filter(s => !(s.comm === 'offline' || s.offline === true));
  const acLostList     = systems.filter(s => s.power === 'ac-lost');
  const batteryList    = systems.filter(s => s.power === 'battery');
  const onACList       = systems.filter(s => s.power === 'ac');
  const valveFaultList = systems.filter(s => s.valve === 'error' || s.valve === 'disconnected');
  const valveOpenList  = systems.filter(s => s.valve === 'open');
  const valveClosedList = systems.filter(s => s.valve === 'closed');
  const noValveList    = systems.filter(s => s.valve == null);
  const noRecipList    = systems.filter(s => (s.notificationRecipients || 0) === 0);
  const withRecipList  = systems.filter(s => (s.notificationRecipients || 0) > 0);

  // Union for "Require attention" — dedupe by system id so multi-dimension failures count once.
  const failedIds = new Set();
  offlineList.forEach(s => failedIds.add(s.id));
  acLostList.forEach(s => failedIds.add(s.id));
  valveFaultList.forEach(s => failedIds.add(s.id));
  noRecipList.forEach(s => failedIds.add(s.id));

  const requireAttention = failedIds.size;
  const healthyCount = total - requireAttention;

  // Notification recipients dimension is counted by LOCATION (parent l4/l3), not system —
  // a location with N systems and zero recipients still counts as ONE.
  const allLocationKeys = systems.map(s => s.l4 || s.l3 || s.id);
  const noRecipLocations = new Set(noRecipList.map(s => s.l4 || s.l3 || s.id)).size;
  const allLocations = new Set(allLocationKeys).size;
  const withRecipLocations = Math.max(0, allLocations - noRecipLocations);

  // Spec: Widget 1 — Location Health (Confluence 1529151494).
  //   100%      → fully green
  //   90% – 99% → bicolor (healthy% green, rest red)
  //   < 90%     → fully red
  // Empty state (no systems in scope) → grey track, 0%.
  const hasSystems = total > 0;
  // Healthy %: rounded, but capped at 99 when ANY system needs attention so the
  // display never shows 100% if at least one system is unhealthy. Rule: 100% is
  // sacred — it must mean zero issues. Without the cap, Math.round bumps
  // 99.5%-99.99% up to 100% and lies about a single-system failure.
  const rawPct = hasSystems
    ? (requireAttention === 0 ? 100 : Math.min(99, Math.round((healthyCount / total) * 100)))
    : null;
  let arcPct;
  if (!hasSystems) arcPct = null;
  else if (rawPct < 90) arcPct = 0;        // fully red
  else if (rawPct >= 100) arcPct = 100;    // fully green
  else arcPct = rawPct;                     // proportional bicolor

  // "Require attention" + bar-segment color: muted red #A5455E when systems
  // need attention, green when all clear. The alarm red #DB4670 is reserved
  // for active Water Events only. The Status Overview "bad" pills below use
  // the same #A5455E so the two surfaces read as one attention register.
  // Locked 2026-06-03.
  const ATTENTION = '#A5455E';      // muted red — bar segment, shield, counter
  const reqAttColor = !hasSystems ? theme.textMuted : (requireAttention > 0 ? ATTENTION : theme.green);

  const greenColor = theme.green;
  const redColor = ATTENTION;       // bar uses the muted red, not the alarm red

  // Card border: always neutral. State is conveyed by the bar segments + the
  // red "Require attention" counter inside the card — framing the whole card in
  // red triple-encoded the same signal and made the widget shout. See
  // design-options/home-systems-health-border-options.html (Option A, locked).
  const cardBorderColor = theme.cardBorderColor || (dk ? 'rgba(255,255,255,0.08)' : '#E5E8EE');

  return (
    <div style={{ padding: '14px 14px 8px' }}>
      {/* Alerts */}
      <StatusWidgetsMobile systems={systems} scopeIds={systems.map(s => s.id)} alertsOnly />

      {/* Systems Health card — harmonized shell (14 px radius, 14 px padding,
          subtle shadow). Neutral border at all times (Option A from
          home-systems-health-border-options.html). State lives in the bar +
          counters; the frame stays calm.
          Whole card is the drilldown target: tapping anywhere (except the info
          button) opens the Alerts tab filtered to "needs-attention" — i.e. the
          combined set of device errors + configuration gaps. */}
      <div
        onClick={(e) => {
          if (!hasSystems) return;
          if (e.target.closest('[data-stop-card-click]')) return;
          // Errors / active issues → Alerts screen filtered. Each row is an
          // incident, which is what the user expects when drilling into
          // "Require attention". State/inventory surfaces go to /kpi/ instead.
          navigate('/alerts?filter=needs-attention');
        }}
        style={{
          background: theme.card,
          borderRadius: 14, marginBottom: 8, overflow: 'hidden',
          border: `1px solid ${cardBorderColor}`,
          boxShadow: dk ? '0 1px 6px rgba(0,0,0,0.12)' : '0 1px 3px rgba(20,21,26,0.05)',
          cursor: hasSystems ? 'pointer' : 'default',
        }}>
        <div style={{ padding: '10px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MIcon name="shield" size={18} color={reqAttColor} fill />
            <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{t('home.systems_health.title')}</span>
          </div>
          <span
            data-stop-card-click
            onClick={(e) => { e.stopPropagation(); setShowInfo(v => !v); }}
            aria-label={t('home.systems_health.info_button_aria')}
            className="material-symbols-outlined"
            style={{ fontSize: 18, color: theme.textMuted, cursor: 'pointer' }}>info</span>
        </div>

        {showInfo && (
          <div style={{ padding: '6px 14px 0' }}>
            <div style={{ background: theme.inputBg, borderRadius: 8, padding: '8px 10px', fontSize: 12, lineHeight: 1.5, color: theme.textSecondary }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('home.systems_health.info_tooltip_intro')}</div>
              <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                {(t('home.systems_health.info_tooltip_bullets', { returnObjects: true }) || []).map((b, i) => (
                  <li key={i} style={{ marginBottom: 2 }}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* O3 glassy ombre bar + P-A counter alignment (locked 2026-06-09).
            See docs/PRD/HTMLs/home-systems-health.html for the locked spec.
            Bar: 12 px, two stacked gradients (vertical glassy highlight +
            horizontal ombre crossfade between green and red at the arcPct
            boundary), inset shadow for depth.
            Counters: Systems LEFT (under the green segment), Require
            attention RIGHT (under the red segment). */}
        <div style={{ padding: '4px 14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
            <span style={{
              fontSize: 26, fontWeight: 800, color: theme.text,
              letterSpacing: '-0.8px', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            }}>{hasSystems ? rawPct : 0}%</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.textTertiary, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t('home.systems_health.healthy')}</span>
          </div>
          <div style={{
            height: 12,
            borderRadius: 6,
            overflow: 'hidden',
            background: ombreBarBackground(hasSystems, arcPct),
            boxShadow: 'inset 0 1px 1.5px rgba(20,21,26,0.08)',
          }} />
        </div>

        {/* Totals row — P-A alignment (Systems left, Require attention right) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 16px 10px' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: theme.text, lineHeight: 1, letterSpacing: '-0.3px', fontVariantNumeric: 'tabular-nums' }}>{total.toLocaleString()}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: theme.textTertiary, marginTop: 3, lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t('home.systems_health.systems')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: reqAttColor, lineHeight: 1, letterSpacing: '-0.3px', fontVariantNumeric: 'tabular-nums' }}>{requireAttention}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: theme.textTertiary, marginTop: 3, lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t('home.systems_health.require_attention')}</div>
          </div>
        </div>

      </div>

      {/* ── Fleet composition ──
          Per dimension: a small icon+title row above a proportional pill row.
          Each pill is sized by flex-grow proportional to its share, with a
          min-width floor so labels never clip on mobile. No drilldown arrows;
          pills darken on hover and scale on press to signal tappability.
          Replaces the previous Quick Stats grid AND the Details tab. */}
      {hasSystems && (
        <FleetCompositionCard
          theme={theme}
          dk={dk}
          // Hybrid drilldown:
          //   • `kpi: '<key>'`         → /kpi/<key>          for healthy / state pills
          //                              (Systems list grouped by location)
          //   • `alertFilter: '<key>'` → /alerts?filter=<key> for bad / error pills
          //                              (Alerts list — each row is an incident)
          // Pick one per segment. Bad pills (Offline, Errors, Unplugged, Missing)
          // use alertFilter because the user is asking "show me the issues".
          // Ordering: bad-state first within each dimension (locked 2026-06-09,
          // per docs/PRD/03c-status-overview-widget.md). Holds regardless of
          // count - when bad-count is 0 the muted "all clear" tile still sits
          // top-left so users learn "first tile = trouble check."
          dims={[
            {
              key: 'comm',
              icon: 'wifi',
              title: t('home.status_overview.communication'),
              segments: [
                { key: 'offline', label: t('home.status_overview.offline'), count: offlineList.length, tint: 'bad',   pct: total ? (offlineList.length / total) * 100 : 0, alertFilter: 'offline' },
                { key: 'online',  label: t('home.status_overview.online'),  count: onlineList.length,  tint: 'good',  pct: total ? (onlineList.length / total) * 100 : 0, kpi: 'comm-online' },
              ],
            },
            {
              key: 'valves',
              icon: 'valve',
              title: t('home.status_overview.valves'),
              segments: [
                { key: 'errors',  label: t('home.status_overview.errors'),   count: valveFaultList.length,  tint: 'bad',     pct: total ? (valveFaultList.length / total) * 100 : 0, alertFilter: 'valve-error' },
                { key: 'open',    label: t('home.status_overview.open'),     count: valveOpenList.length,   tint: 'good',    pct: total ? (valveOpenList.length / total) * 100 : 0, kpi: 'valve-open' },
                { key: 'closed',  label: t('home.status_overview.closed'),   count: valveClosedList.length, tint: 'neutral', pct: total ? (valveClosedList.length / total) * 100 : 0, kpi: 'valve-closed' },
                { key: 'noValve', label: t('home.status_overview.no_valve'), count: noValveList.length,     tint: 'empty',   pct: total ? (noValveList.length / total) * 100 : 0, kpi: 'valve-na' },
              ],
            },
            {
              key: 'power',
              icon: 'bolt',
              title: t('home.status_overview.external_power'),
              segments: [
                { key: 'unplug',  label: t('home.status_overview.unplugged'), count: acLostList.length,  tint: 'bad',   pct: total ? (acLostList.length / total) * 100 : 0, alertFilter: 'power-lost' },
                { key: 'ac',      label: t('home.status_overview.on_ac'),     count: onACList.length,    tint: 'good',  pct: total ? (onACList.length / total) * 100 : 0, kpi: 'power-ac' },
                { key: 'battery', label: t('home.status_overview.battery'),   count: batteryList.length, tint: 'warn',  pct: total ? (batteryList.length / total) * 100 : 0, kpi: 'power-battery' },
              ],
            },
            {
              key: 'recipients',
              icon: 'group',
              title: t('home.status_overview.notification_recipients'),
              segments: [
                // Missing recipients routes to the Systems list (not the Alerts
                // list) - config gaps are inventory-shaped, not incident-shaped,
                // and the Alerts pill rail no longer has a Configuration pill.
                { key: 'miss', label: t('home.status_overview.missing'),    count: noRecipLocations,   tint: 'bad',  pct: allLocations ? (noRecipLocations / allLocations) * 100 : 0,   kpi: 'recipients-missing' },
                { key: 'reg',  label: t('home.status_overview.registered'), count: withRecipLocations, tint: 'good', pct: allLocations ? (withRecipLocations / allLocations) * 100 : 0, kpi: 'recipients-registered' },
              ],
            },
          ]}
          navigate={navigate}
        />
      )}
    </div>
  );
}

// Tint backgrounds for Status Overview pills.
// Two-layer treatment: a low-alpha solid tint UNDER a very faint diagonal stripe
// overlay (1.5 px period). The base does the colour-coding; stripes are pure
// texture so they never hurt text contrast. Mirrors home-harmonized.html.
function pillBgFor(tint, dk) {
  const baseA   = dk ? 0.16 : 0.10;   // solid base alpha
  const stripeA = dk ? 0.14 : 0.10;   // diagonal overlay alpha
  const hatch = (c) =>
    `repeating-linear-gradient(45deg, rgba(${c},${stripeA}) 0 1.5px, rgba(${c},0) 1.5px 3px), rgba(${c},${baseA})`;
  switch (tint) {
    case 'good':    return hatch('92,158,26');     // green
    case 'info':    return hatch('4,173,239');     // blue
    case 'neutral': return hatch('113,118,132');   // grey
    case 'warn':    return hatch('229,161,0');     // amber
    // 'bad' pills (Offline / Errors / Unplugged / Missing) use a muted red
    // (#A5455E ≈ rgba(165,69,94)). Softer than the alarm #DB4670 reserved for
    // active Water Events. Locked 2026-06-03.
    case 'bad':     return hatch('165,69,94');     // muted red
    case 'empty':   return dk ? 'rgba(255,255,255,0.04)' : 'rgba(20,21,26,0.04)';
    default:        return 'transparent';
  }
}

function pillFgFor(tint, theme, isLabel) {
  // Text/number color per tint.
  switch (tint) {
    case 'good':    return '#2F6112';
    case 'info':    return '#036AB5';
    case 'neutral': return theme.textSecondary;
    case 'warn':    return '#8C5A0F';
    case 'bad':     return '#A5455E';   // muted red — see pillBgFor note
    case 'empty':   return theme.textTertiary;
    default:        return theme.text;
  }
}

// Dot color for the list-format Status Overview. Same tint vocabulary as the
// old segmented pills, just expressed as a single colored dot.
function dotColorFor(tint, theme) {
  switch (tint) {
    case 'good':    return '#5C9E1A';
    case 'info':    return '#04ADEF';
    case 'neutral': return theme.textTertiary || '#717684';
    case 'warn':    return '#E5A100';
    case 'bad':     return '#A5455E';   // muted red — same hue as Systems Health attention
    case 'empty':   return theme.textMuted || '#9DA3AE';
    default:        return theme.textTertiary || '#717684';
  }
}

function FleetCompositionCard({ theme, dk, dims, navigate }) {
  const { t } = useTranslation();
  // Card shell same as the other Home widgets.
  const cardStyle = {
    background: theme.card,
    borderRadius: 14,
    border: `1px solid ${dk ? 'rgba(255,255,255,0.08)' : '#E5E8EE'}`,
    padding: 0,
    marginTop: 8,
    boxShadow: dk ? '0 1px 6px rgba(0,0,0,0.12)' : '0 1px 3px rgba(20,21,26,0.05)',
    overflow: 'hidden',
  };
  // Treat any "bad" segment that still has zero count as visually neutral -
  // a red "Errors 0" reads like there are errors when there aren't.
  const effectiveTint = (s) => (s.tint === 'bad' && (s.count || 0) === 0 ? 'neutral' : s.tint);

  // Locked tile-button styles (per docs/PRD/HTMLs/home-status-overview.html
  // + PRD 03c). Every sub-state is a bordered button - affordance equality.
  // Bad-state distinction by COLOR only (red dot + red count + red chevron
  // at 75% opacity). Empty-state mutes ONLY the dot - label/count/chevron
  // stay at normal contrast so the tile reads pressable.
  const tileBorder = dk ? 'rgba(255,255,255,0.10)' : '#DDE1E8';
  const tileHoverBorder = dk ? 'rgba(255,255,255,0.20)' : '#B8BCC4';
  const tileHoverBg = dk ? 'rgba(255,255,255,0.03)' : '#FAFBFD';

  // Option F section tints (locked 2026-06-09). Each dimension gets a faint
  // category-color wash so the eye can chunk where one dimension ends and
  // the next begins. Alphas are tuned for equal perceived brightness —
  // amber needs less alpha than blue/grey/violet because yellow is naturally
  // more luminous than cool tones.
  const SECTION_BG = dk ? {} : {
    comm:       'rgba(11,149,248,0.050)',
    valves:     'rgba(113,118,132,0.060)',
    power:      'rgba(229,161,0,0.025)',
    recipients: 'rgba(125,90,180,0.050)',
  };

  return (
    <div style={cardStyle}>
      {/* Hover/press styles for the tiles (scoped via className).
          The .so-tile-btn.bad selector preserves the red wash on hover -
          without it, the generic :hover rule clobbered the bad-tile bg
          and the trouble tile lost its color on mobile tap. */}
      <style>{`
        .so-tile-btn { transition: background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease; }
        .so-tile-btn:hover { background: ${tileHoverBg}; border-color: ${tileHoverBorder}; box-shadow: 0 1px 3px rgba(20,21,26,0.06); }
        .so-tile-btn.bad { background: rgba(165,69,94,0.10); border-color: rgba(165,69,94,0.28); }
        .so-tile-btn.bad:hover { background: rgba(165,69,94,0.14); border-color: rgba(165,69,94,0.38); box-shadow: 0 1px 3px rgba(165,69,94,0.10); }
        .so-tile-btn:active { transform: scale(0.98); }
      `}</style>

      {/* Card title */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 14px 4px',
      }}>
        <span className="material-symbols-outlined"
          style={{ fontSize: 18, color: theme.textSecondary, fontVariationSettings: "'FILL' 1" }}>tune</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: theme.text, letterSpacing: '-0.2px' }}>{t('home.status_overview.title')}</span>
      </div>

      {/* Dimension sections — each shows a small heading + a 2-col tile-button
          grid. Bordered tile-buttons with chevrons signal affordance equality
          for every sub-state. Section background tints chunk by dimension
          (Option F — luminance-equalized). No dividers when tints carry the
          chunking. */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {dims.map((d) => (
          <div key={d.key} style={{
            padding: '10px 12px 12px',
            background: SECTION_BG[d.key] || 'transparent',
          }}>
            {/* Dimension heading */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 8,
            }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: 16, color: theme.textSecondary }}>{d.icon}</span>
              {d.title}
            </div>

            {/* 2-col tile-button grid - every sub-state is a bordered button.
                Power's 3rd tile (Battery) sits alone on row 2 at full width
                of its column - no 3-col layout anywhere. */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {d.segments.map(s => {
                const tint = effectiveTint(s);
                const tappable = !!(s.alertFilter || s.kpi);
                const isBad = tint === 'bad' && (s.count || 0) > 0;
                // Option F (Rami, 2026-06-09): bad-state tile uses a soft red
                // wash + softer rose text so the trouble tile gets noticed
                // without shouting. Background + border come from the
                // .so-tile-btn.bad CSS rule above (preserves on hover).
                // CHEVRON DROPPED 2026-06-09 - it pressed against the right
                // edge on narrow viewports and ate space that the label
                // needed (e.g., 'Registered 24' was clipping). Tile shape +
                // bg + hover-lift already signal tappability.
                const countColor = isBad ? '#B5566E' : theme.text;
                return (
                  <div key={s.key}
                    className={isBad ? 'so-tile-btn bad' : 'so-tile-btn'}
                    onClick={
                      !tappable ? undefined
                        : s.alertFilter
                          ? () => navigate(`/alerts?filter=${s.alertFilter}`)
                          : () => navigate(`/kpi/${s.kpi}`)
                    }
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: isBad ? undefined : theme.card,
                      border: isBad ? undefined : `1px solid ${tileBorder}`,
                      borderRadius: 10,
                      padding: '11px 14px',
                      minHeight: 48,
                      minWidth: 0,
                      cursor: tappable ? 'pointer' : 'default',
                    }}>
                    <span style={{
                      width: 9, height: 9, borderRadius: '50%',
                      background: dotColorFor(tint, theme),
                      flexShrink: 0,
                    }} />
                    <span style={{
                      flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: theme.text,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{s.label}</span>
                    <span style={{
                      fontSize: 16, fontWeight: 800, color: countColor,
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1, flexShrink: 0,
                    }}>{s.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab 2: Details — full status widgets (comm, valves, power) ──
function DetailsTab({ systems, theme }) {
  return (
    <div style={{ padding: '14px 14px 8px' }}>
      {/* Full status widgets — comm, valves, power (same as old Systems Overview) */}
      <StatusWidgetsMobile systems={systems} scopeIds={systems.map(s => s.id)} skipAlerts />
    </div>
  );
}

// ── Tab 3: Info — location/account metadata ──
// Reusable foldable section card used by InfoTab. Header is the whole tappable
// row (icon + title + count? + chevron). Body is rendered only when expanded.
// All sections collapsed by default — locked 2026-06-03.
function InfoSection({ theme, icon, title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: theme.card,
      border: `1px solid ${theme.cardBorderColor || '#E5E8EE'}`,
      borderRadius: 12, marginBottom: 8, overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(20,21,26,0.05)',
    }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px', cursor: 'pointer', userSelect: 'none',
      }}>
        <MIcon name={icon} size={18} color={theme.textSecondary} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: theme.text, letterSpacing: '-0.2px' }}>{title}</span>
        <MIcon name={open ? 'expand_less' : 'expand_more'} size={20} color={theme.textTertiary} />
      </div>
      {open && (
        <div style={{ padding: '0 14px 12px' }}>{children}</div>
      )}
    </div>
  );
}

// Notes section — read-only by default, tap "Edit" to switch to a textarea.
// Saves to localStorage via locationInfoStore so the override survives reloads.
function NotesEditor({ scopeId, defaultNotes, theme }) {
  // The displayed value is: override (from localStorage) if it exists, else
  // the mock default from accounts.js. null override = use the mock.
  const [override, setOverride] = useState(() => getNotesOverride(scopeId));
  const value = override ?? defaultNotes ?? '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }
  function save() {
    setNotes(scopeId, draft);
    setOverride(draft);
    setEditing(false);
  }
  function cancel() {
    setEditing(false);
  }

  if (editing) {
    return (
      <div>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={5}
          autoFocus
          placeholder="Add notes for this location…"
          style={{
            width: '100%', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.5,
            color: theme.text, background: theme.inputBg,
            border: `1px solid ${theme.divider || '#E5E8EE'}`,
            borderRadius: 8, padding: '8px 10px', resize: 'vertical',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={cancel} style={{
            padding: '6px 14px', borderRadius: 8, border: `1px solid ${theme.divider || '#E5E8EE'}`,
            background: theme.card, color: theme.textSecondary,
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={save} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none',
            background: theme.accent || '#04ADEF', color: '#fff',
            fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
          }}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {value ? (
        <div style={{ fontSize: 14, color: theme.text, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{value}</div>
      ) : (
        <div style={{ fontSize: 13, color: theme.textTertiary, fontStyle: 'italic' }}>No notes yet</div>
      )}
      <button onClick={startEdit} style={{
        marginTop: 10, padding: '6px 12px', borderRadius: 8,
        border: `1px solid ${theme.divider || '#E5E8EE'}`,
        background: theme.card, color: theme.accent || '#04ADEF',
        fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <MIcon name="edit" size={14} color={theme.accent || '#04ADEF'} />
        {value ? 'Edit' : 'Add notes'}
      </button>
    </div>
  );
}

// Pictures section — gallery + upload + remove. Stored as data URLs in
// localStorage via locationInfoStore. Tap a thumbnail to view full size;
// tap × to remove.
function PicturesEditor({ scopeId, theme }) {
  const [pictures, setPictures] = useState(() => getPictures(scopeId));
  const [lightbox, setLightbox] = useState(null);   // picture object when open
  const fileInputRef = useRef(null);

  function refresh() { setPictures(getPictures(scopeId)); }

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // Convert each picked file to a data URL and add to the store. Done one at
    // a time; localStorage writes are synchronous so order is preserved.
    let pending = files.length;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') addPicture(scopeId, reader.result);
        pending -= 1;
        if (pending === 0) refresh();
      };
      reader.onerror = () => { pending -= 1; if (pending === 0) refresh(); };
      reader.readAsDataURL(file);
    });
    // Reset the input so the same file can be picked again later.
    e.target.value = '';
  }

  function remove(id) {
    removePicture(scopeId, id);
    refresh();
    if (lightbox && lightbox.id === id) setLightbox(null);
  }

  return (
    <div>
      {pictures.length === 0 ? (
        <div style={{ fontSize: 13, color: theme.textTertiary, fontStyle: 'italic', marginBottom: 10 }}>No pictures yet</div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
          gap: 6, marginBottom: 10,
        }}>
          {pictures.map(p => (
            <div key={p.id} style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden', background: theme.inputBg }}>
              <img
                src={p.dataUrl}
                alt=""
                onClick={() => setLightbox(p)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer', display: 'block' }}
              />
              <button onClick={() => remove(p.id)}
                aria-label="Remove picture"
                style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 22, height: 22, borderRadius: '50%',
                  border: 'none', background: 'rgba(20,21,26,0.7)',
                  color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: 1,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>×</button>
            </div>
          ))}
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
      <button onClick={() => fileInputRef.current?.click()} style={{
        padding: '6px 12px', borderRadius: 8,
        border: `1px solid ${theme.divider || '#E5E8EE'}`,
        background: theme.card, color: theme.accent || '#04ADEF',
        fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <MIcon name="add_a_photo" size={14} color={theme.accent || '#04ADEF'} />
        Add picture
      </button>

      {/* Lightbox — tap-anywhere to close */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 20, cursor: 'zoom-out',
        }}>
          <img src={lightbox.dataUrl} alt=""
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}

function InfoTab({ scopeName, scopeId, account, theme }) {
  const address = account?.address || '';
  const shippingAddress = account?.shippingAddress || '';
  const contacts = account?.contacts || [];
  const defaultNotes = account?.notes || '';

  // Mock data is account-level; in real product these would live per location.
  const placeholder = (text) => (
    <div style={{ fontSize: 13, color: theme.textTertiary, fontStyle: 'italic' }}>{text}</div>
  );

  return (
    <div style={{ padding: '14px 14px 8px' }}>
      {/* Scope name strip — small label above the foldable sections.
          The purple/gradient banner image was removed 2026-06-03 — placeholder
          imagery was visual noise without conveying real info. */}
      <div style={{ padding: '4px 4px 10px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, letterSpacing: '-0.3px' }}>{scopeName}</div>
        {account?.industry && (
          <div style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>{account.industry}</div>
        )}
      </div>

      {/* Address */}
      <InfoSection theme={theme} icon="location_on" title="Address">
        {address ? (
          <div style={{ fontSize: 14, color: theme.text, lineHeight: 1.45, whiteSpace: 'pre-line' }}>{address}</div>
        ) : placeholder('No address on file')}
      </InfoSection>

      {/* Shipping address */}
      <InfoSection theme={theme} icon="local_shipping" title="Shipping address">
        {shippingAddress
          ? <div style={{ fontSize: 14, color: theme.text, lineHeight: 1.45, whiteSpace: 'pre-line' }}>{shippingAddress}</div>
          : (address
              ? <div style={{ fontSize: 13, color: theme.textTertiary, fontStyle: 'italic' }}>Same as address</div>
              : placeholder('No shipping address on file'))}
      </InfoSection>

      {/* Location contacts — email + phone, NO role */}
      <InfoSection theme={theme} icon="contacts" title={`Location contacts${contacts.length ? ` (${contacts.length})` : ''}`}>
        {contacts.length === 0 ? placeholder('No contacts on file') : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {contacts.map((c, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', gap: 4,
                paddingTop: i === 0 ? 2 : 10,
                borderTop: i === 0 ? 'none' : `1px solid ${theme.divider || '#EEF1F4'}`,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{c.name}</div>
                {c.email && (
                  <a href={`mailto:${c.email}`} style={{
                    fontSize: 13, color: theme.accent || '#04ADEF', textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <MIcon name="mail" size={14} color={theme.accent || '#04ADEF'} />
                    {c.email}
                  </a>
                )}
                {c.phone && (
                  <a href={`tel:${c.phone.replace(/\s/g, '')}`} style={{
                    fontSize: 13, color: theme.accent || '#04ADEF', textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <MIcon name="phone" size={14} color={theme.accent || '#04ADEF'} />
                    {c.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </InfoSection>

      {/* Pictures — gallery + upload */}
      <InfoSection theme={theme} icon="image" title="Pictures">
        <PicturesEditor scopeId={scopeId} theme={theme} />
      </InfoSection>

      {/* Notes — editable, persisted to localStorage */}
      <InfoSection theme={theme} icon="notes" title="Notes">
        <NotesEditor scopeId={scopeId} defaultNotes={defaultNotes} theme={theme} />
      </InfoSection>
    </div>
  );
}

// ── Swipeable panel ──
function SwipePanel({ children, activeIndex, onSwipe }) {
  const startRef = useRef(null);
  const onTouchStart = (e) => { startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e) => {
    if (!startRef.current) return;
    const dx = e.changedTouches[0].clientX - startRef.current.x;
    const dy = e.changedTouches[0].clientY - startRef.current.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && activeIndex < children.length - 1) onSwipe(activeIndex + 1);
      if (dx > 0 && activeIndex > 0) onSwipe(activeIndex - 1);
    }
    startRef.current = null;
  };
  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
      <div style={{
        display: 'flex', width: `${children.length * 100}%`,
        transform: `translateX(-${activeIndex * (100 / children.length)}%)`,
        transition: 'transform 0.25s ease', height: '100%',
      }}>
        {children.map((child, i) => (
          <div key={i} style={{ width: `${100 / children.length}%`, height: '100%', overflowY: 'auto', flexShrink: 0, paddingBottom: 93 }}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Persisted state ──
let _persistedHomeTab = 0;

// ── Main component ──
export default function HomeUnified() {
  const { t } = useTranslation();
  useDataRefresh();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { visibleSystems = [], exploreSystems = [], exploring, selectedScope } = useUserContext() || {};
  // Home reflects the user's ASSIGNED scope only — never explore-all.
  // Per PRD 03 § Scope behavior + decision #6: a Wint admin with Explore
  // All on can see 20,000+ systems across customers; aggregating Water
  // Events / Health / Status Overview at that scale isn't actionable.
  // Explore All is for the systems-discovery surfaces (search, drilldown),
  // not Home. Locked 2026-06-13.
  // eslint-disable-next-line no-unused-vars
  const _exploreSystems = exploreSystems;
  // eslint-disable-next-line no-unused-vars
  const _exploring = exploring;
  const activeSystems = visibleSystems;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, _setActiveTab] = useState(_persistedHomeTab);
  const setActiveTab = (v) => { _persistedHomeTab = v; _setActiveTab(v); };

  // Active scope — context-driven selection from drawer, fallback to persona scope.
  const scopedSystems = selectedScope?.systems || activeSystems;
  const account = useMemo(() => {
    const accId = scopedSystems[0]?.account;
    if (!accId) return null;
    const a = getAccountById(accId);
    return a?.parentId ? getAccountById(a.parentId) : a;
  }, [scopedSystems]);
  // InfoTab still needs an account-name fallback for its header (it shows the
  // account industry/address). Page-header title rules live in ScopeHeader and
  // intentionally do NOT include the account fallback. 2026-06-15.
  const scopeName = selectedScope?.name || account?.name || 'My Systems';

  // Counters in the header — strict next-level rule.
  //   • locationsBelow: number of distinct values at the level IMMEDIATELY below
  //     the SELECTED scope (not skipping single-child levels). Mapping:
  //         scope = account (root)  → count L1 countries
  //         scope = L1 country      → count L2 regions
  //         scope = L2 region       → count L3 cities
  //         scope = L3 city         → count L4 buildings
  //         scope = L4 building     → none (hide the locations counter)
  //     Scope level is taken from selectedScope.ancestors.length, which counts
  //     the chain of ancestors above the current scope.
  //   • totalSystems: every system in the subtree (all depths) = scopedSystems.length.
  const { locationsBelow, hasNextLevel } = useMemo(() => {
    if (!scopedSystems.length) return { locationsBelow: 0, hasNextLevel: false };
    const levels = ['l1', 'l2', 'l3', 'l4'];
    // No scope selected → treat user as standing at the account/root level,
    // so the next level below is L1.
    const scopeLevel = selectedScope?.ancestors?.length ?? 0;
    if (scopeLevel >= levels.length) return { locationsBelow: 0, hasNextLevel: false };
    const nextKey = levels[scopeLevel];
    const distinct = new Set(scopedSystems.map(s => s[nextKey]).filter(Boolean));
    return { locationsBelow: distinct.size, hasNextLevel: true };
  }, [scopedSystems, selectedScope]);
  const totalSystems = scopedSystems.length;

  // Details tab dropped — its content (communication / valves / power breakdown) is now
  // surfaced by the Fleet Composition card on the Status tab.
  //
  // Info tab visibility — only for physical-container location types that
  // actually have a single address / shipping / contacts on file. Hidden at:
  //   • "My Systems" root view
  //   • Account / Sub-account (aggregations)
  //   • Country / Region / District / City / Airport (also aggregations)
  // TODO (Rami): lock the canonical list in PRD 02 / 03. The whitelist below
  // is the intuitive set for now — buildings + terminals + towers + malls +
  // campuses. Floors live inside buildings, so they inherit; not whitelisted
  // until per-floor contacts is a real product feature.
  const INFO_TAB_LEVELS = new Set(['Building', 'Tower', 'Terminal', 'Mall', 'Campus']);
  const isLocationScope = !!selectedScope && INFO_TAB_LEVELS.has(selectedScope.levelType);
  const TABS = isLocationScope ? [t('home.overview_tab'), t('home.info_tab')] : [t('home.overview_tab')];

  // Reset the persisted tab if it points at a tab we no longer render.
  useEffect(() => {
    if (activeTab >= TABS.length) setActiveTab(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TABS.length]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
      background: WINT_SKY_HOME_BG,
      backgroundSize: WINT_SKY_HOME_BG_SIZE,
      backgroundRepeat: 'no-repeat',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Header — transparent, sits on the Wint Sky home wave variant
          (ui-improvements-take-1, locked 2026-06-10). */}
      <PipesHeader glow={true}>
        {/* Shared header component. Used identically on Alerts (with a
            different badge icon). Don't fork - extend ScopeHeader if you
            need new behavior. */}
        <ScopeHeader
          badgeIcon="home_work"
          onDrawerOpen={() => setDrawerOpen(true)}
          subLine={
            <>
              {hasNextLevel && (
                <>
                  {t('home.counts_locations', { count: locationsBelow })}
                  <span style={{ margin: '0 6px', opacity: 0.6 }}>·</span>
                </>
              )}
              {t('home.counts_systems', { count: totalSystems, formatted: totalSystems.toLocaleString() })}
            </>
          }
        />

        {/* Tab strip - brand-blue active tab on light bg.
            Hidden when there's only one tab (no choice = no need to show a
            divider line). Locked 2026-06-09. */}
        {TABS.length > 1 && (
          <div style={{ display: 'flex', padding: '0 14px' }}>
            {TABS.map((label, i) => (
              <button key={i} onClick={() => setActiveTab(i)} style={{
                flex: 1, padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 15, fontWeight: activeTab === i ? 700 : 500,
                color: activeTab === i ? '#0B95F8' : '#717684',
                borderBottom: activeTab === i ? '2px solid #0B95F8' : '2px solid transparent',
                transition: 'all 0.15s ease',
              }}>{label}</button>
            ))}
          </div>
        )}
      </PipesHeader>

      {/* Swipeable content — Status always renders; Info is only included for
          location scopes (see TABS / isLocationScope above). */}
      <SwipePanel activeIndex={activeTab} onSwipe={setActiveTab}>
        <StatusTab systems={scopedSystems} theme={theme} navigate={navigate} />
        {isLocationScope && (
          <InfoTab scopeName={scopeName} scopeId={selectedScope?.id || 'root'} account={account} theme={theme} />
        )}
      </SwipePanel>

      <NavigationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectLocation={() => setDrawerOpen(false)}
      />

      <TabBar activeTab="home" />
    </div>
  );
}
