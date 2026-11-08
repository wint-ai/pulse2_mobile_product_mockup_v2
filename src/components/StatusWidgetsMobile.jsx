import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { computeWidgets } from '../data/systems';

function MIcon({ name, size = 18, color, fill, style = {} }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, color, fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0", ...style }}>{name}</span>;
}

function Chip({ value, label, color, onClick, theme }) {
  return (
    <div onClick={onClick} style={{
      flex: 1, background: theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#F3F5F8',
      borderRadius: 8, padding: '7px', textAlign: 'center',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: theme.text, letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 12, color, fontWeight: 600, marginTop: 1 }}>{label}</div>
    </div>
  );
}

function IconBox({ icon, color }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 8, marginRight: 10, flexShrink: 0,
      background: color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <MIcon name={icon} size={16} color={color} />
    </div>
  );
}

export default function StatusWidgetsMobile({ systems, scopeIds, alertsOnly = false, skipAlerts = false }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const w = computeWidgets(systems);
  const dk = theme.mode === 'dark';
  const gl = theme.glass; // portal glassmorphism mode

  const scopeParam = scopeIds ? `?scope=${scopeIds.join(',')}` : '';
  // Hybrid drilldown (locked 2026-06-03):
  //   • go(...)       → /kpi/<key>     for healthy / state / inventory surfaces
  //   • goAlerts(...) → /alerts?filter for error / active-issue surfaces
  // Bad-state pills land on the Alerts screen because each row is an incident;
  // healthy-state pills land on the Systems list because each row is a system.
  const go = (filterKey) => navigate(`/kpi/${filterKey}${scopeParam}`);
  const goAlerts = (filter) => {
    const scope = scopeIds ? `&scope=${scopeIds.join(',')}` : '';
    navigate(`/alerts?filter=${filter}${scope}`);
  };

  const totalComm = w.comm.online + w.comm.offline;
  const totalValves = w.valves.open + w.valves.closed + w.valves.error;
  const totalPower = w.power.ac + w.power.acLost + w.power.battery;
  // Active Water Events. Includes ignored events — per PRD 14 § 2.3 (locked
  // 2026-06-15), an ignored Water Event stays on the Active surfaces until
  // the underlying water flow actually stops; only then does it move to
  // History (as Resolved). The Home Water Events strip counts ignored events
  // alongside non-ignored ones.
  const leaks = systems.filter(s =>
    (s.alert?.type === 'leak-high' || s.alert?.type === 'leak-low')
  );
  const highFlows = leaks.filter(s => s.alert?.type === 'leak-high').length;
  const lowFlows = leaks.filter(s => s.alert?.type === 'leak-low').length;
  const hasAlerts = leaks.length > 0;
  const hasOffline = w.comm.offline > 0;

  // Glass card style for portal mode
  const glassCard = { background: theme.glassBgStrong, border: theme.glassBorder, backdropFilter: theme.glassBlur, WebkitBackdropFilter: theme.glassBlur, borderRadius: 12 };

  const cardStyle = (tintColor, tintAmt) => gl ? { ...glassCard, padding: 0, marginBottom: 6 } : ({
    background: dk ? `rgba(${tintColor},${tintAmt})` : `rgba(${tintColor},${tintAmt * 0.5})`,
    borderRadius: 12, padding: 0, marginBottom: 6,
    border: `1px solid rgba(${tintColor},${dk ? 0.1 : 0.08})`,
    boxShadow: dk ? '0 1px 6px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
  });

  // Portal-style water drop SVG icons
  const WaterDropUp = () => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M8 2.08L4.36 5.73C3.63 6.45 3.14 7.37 2.94 8.37C2.75 9.37 2.85 10.4 3.24 11.35C3.63 12.29 4.29 13.09 5.14 13.66C5.98 14.22 6.98 14.53 8 14.53C9.02 14.53 10.02 14.22 10.86 13.66C11.71 13.09 12.37 12.29 12.76 11.35C13.15 10.4 13.25 9.37 13.06 8.37C12.86 7.37 12.37 6.45 11.65 5.73L8 2.08ZM8 0L12.69 4.69C13.61 5.61 14.24 6.79 14.5 8.08C14.76 9.37 14.63 10.7 14.12 11.91C13.62 13.12 12.77 14.16 11.68 14.88C10.59 15.61 9.31 16 8 16C6.69 16 5.41 15.61 4.32 14.88C3.23 14.16 2.38 13.12 1.88 11.91C1.38 10.7 1.24 9.37 1.5 8.08C1.76 6.79 2.39 5.61 3.31 4.69L8 0Z" fill="#20294C"/>
      <path d="M7.26 9.37H5.06L8 6.43L10.95 9.37H8.74V12.32H7.26V9.37Z" fill="#20294C"/>
    </svg>
  );
  const WaterDropDown = () => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M8 2.08L4.36 5.73C3.63 6.45 3.14 7.37 2.94 8.37C2.75 9.37 2.85 10.4 3.24 11.35C3.63 12.29 4.29 13.09 5.14 13.66C5.98 14.22 6.98 14.53 8 14.53C9.02 14.53 10.02 14.22 10.86 13.66C11.71 13.09 12.37 12.29 12.76 11.35C13.15 10.4 13.25 9.37 13.06 8.37C12.86 7.37 12.37 6.45 11.65 5.73L8 2.08ZM8 0L12.69 4.69C13.61 5.61 14.24 6.79 14.5 8.08C14.76 9.37 14.63 10.7 14.12 11.91C13.62 13.12 12.77 14.16 11.68 14.88C10.59 15.61 9.31 16 8 16C6.69 16 5.41 15.61 4.32 14.88C3.23 14.16 2.38 13.12 1.88 11.91C1.38 10.7 1.24 9.37 1.5 8.08C1.76 6.79 2.39 5.61 3.31 4.69L8 0Z" fill="#20294C"/>
      <path d="M8.74 9.37H10.95L8 12.32L5.06 9.37H7.26V6.43H8.74V9.37Z" fill="#20294C"/>
    </svg>
  );

  return (
    <>
      {/* Leaks + Errors — hidden in skipAlerts mode */}
      {!skipAlerts && <>
      {/* Leaks + Errors */}
      {hasAlerts ? (
        // Same compact two-row layout for both theme branches: title on top,
        // High Flow / Low Flow chip pills below. The "View →" link was dropped
        // 2026-06-03 — the whole card is the tap target, matching every other
        // pressable widget on Home (Systems Health card, Status Overview pills).
        <div onClick={() => goAlerts('leak')} style={gl ? {
          ...glassCard, padding: 10, marginBottom: 8, cursor: 'pointer',
        } : {
          background: theme.card,
          borderRadius: 14,
          padding: 10,
          border: `1px solid ${dk ? 'rgba(255,255,255,0.08)' : '#E5E8EE'}`,
          boxShadow: dk ? '0 1px 6px rgba(0,0,0,0.12)' : '0 1px 3px rgba(20,21,26,0.05)',
          marginBottom: 8,
          cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <MIcon name="water_drop" size={18} color="#DB4670" fill />
            <span style={{ fontSize: 14, fontWeight: 700, color: theme.text, letterSpacing: '-0.2px' }}>{t('home.water_events.title')}</span>
          </div>
          {/* Chip-style pills — label on top, tabular-num count below. No arrows.
              Both High Flow and Low Flow always render. 0 fades to 50% opacity.
              Each pill is now its OWN tap target: tap High → Alerts filtered
              to High Flow only; tap Low → Alerts filtered to Low Flow only.
              Tapping outside the pills (title row, empty space) still routes
              to the broader "All water" filter via the parent card. */}
          <div style={{ display: 'flex', gap: 6 }}>
            <div
              onClick={(e) => { e.stopPropagation(); goAlerts('high'); }}
              style={{
                flex: 1,
                borderRadius: 10,
                padding: '6px 10px',
                minHeight: 38,
                background: 'var(--v1-tile-wash-high)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                opacity: highFlows === 0 ? 0.5 : 1,
                cursor: 'pointer',
              }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--v1-tile-ink-high)', lineHeight: 1.1 }}>{t('home.water_events.high_flow')}</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.4px', color: 'var(--v1-tile-ink-high)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginTop: 2 }}>{highFlows}</div>
            </div>
            <div
              onClick={(e) => { e.stopPropagation(); goAlerts('low'); }}
              style={{
                flex: 1,
                borderRadius: 10,
                padding: '6px 10px',
                minHeight: 38,
                background: 'var(--v1-tile-wash-low)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                opacity: lowFlows === 0 ? 0.5 : 1,
                cursor: 'pointer',
              }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--v1-pill-ink-warn)', lineHeight: 1.1 }}>{t('home.water_events.low_flow')}</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.4px', color: 'var(--v1-pill-ink-warn)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginTop: 2 }}>{lowFlows}</div>
            </div>
          </div>
        </div>
      ) : (
        // Empty state — slim green confirmation pill. "Nothing wrong here" is
        // the message; no need for a full card with border. Matches the
        // reference design (Claude redesign suggestion, 2026-06-04).
        <div style={gl ? {
          ...glassCard, padding: '10px 14px', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 8,
        } : {
          background: 'rgba(92,158,26,0.10)',
          border: '1px solid rgba(92,158,26,0.20)',
          borderRadius: 999,
          padding: '8px 14px',
          marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <MIcon name="check_circle" size={18} color={theme.green} fill />
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2F6112', letterSpacing: '-0.1px' }}>{t('home.water_events.empty')}</div>
        </div>
      )}

      </>}
      {/* Communication, Valves, Power — hidden in alertsOnly mode */}
      {!alertsOnly && <>
      {/* Communication — green/red tint, same chip layout as Valves & Power */}
      <div style={{
        ...cardStyle(hasOffline ? '219,70,112' : '161,210,70', hasOffline ? 0.06 : 0.05),
      }}>
        <div style={{ padding: '11px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <IconBox icon={hasOffline ? 'wifi_off' : 'wifi'} color={hasOffline ? '#DB4670' : theme.green} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{t('home.status_overview.communication')}</div>
              <div style={{ fontSize: 13, color: theme.textTertiary, marginTop: 1 }}>{t('home.status_overview.n_total', { count: totalComm })}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip value={w.comm.online} label={t('home.status_overview.online')} color={theme.green} onClick={() => go('comm-online')} theme={theme} />
            <Chip value={w.comm.offline} label={t('home.status_overview.offline')} color={w.comm.offline > 0 ? '#DB4670' : theme.textMuted} onClick={() => go('comm-offline')} theme={theme} />
          </div>
        </div>
      </div>

      {/* Valves — blue tint */}
      <div style={{
        ...cardStyle('4,173,239', 0.05),
      }}>
        <div style={{ padding: '11px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <IconBox icon="valve" color="#04ADEF" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{t('home.status_overview.valves')}</div>
              <div style={{ fontSize: 13, color: theme.textTertiary, marginTop: 1 }}>{t('home.status_overview.n_total', { count: totalValves })}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip value={w.valves.open} label={t('home.status_overview.open')} color="#04ADEF" onClick={() => go('valve-open')} theme={theme} />
            <Chip value={w.valves.closed} label={t('home.status_overview.closed')} color="#717684" onClick={() => go('valve-closed')} theme={theme} />
            <Chip value={w.valves.error} label={t('home.status_overview.errors')} color={w.valves.error > 0 ? '#DB4670' : theme.textMuted} onClick={() => go('valve-error')} theme={theme} />
          </div>
        </div>
      </div>

      {/* Power — amber tint */}
      <div style={{
        ...cardStyle('229,161,0', 0.04),
      }}>
        <div style={{ padding: '11px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <IconBox icon="bolt" color="#E5A100" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{t('home.status_overview.external_power')}</div>
              <div style={{ fontSize: 13, color: theme.textTertiary, marginTop: 1 }}>{t('home.status_overview.n_total', { count: totalPower })}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip value={w.power.ac} label={t('home.status_overview.on_ac')} color="#04ADEF" onClick={() => go('power-ac')} theme={theme} />
            <Chip value={w.power.acLost} label={t('home.status_overview.unplugged')} color={w.power.acLost > 0 ? '#DB4670' : theme.textMuted} onClick={() => go('power-ac-lost')} theme={theme} />
            <Chip value={w.power.battery} label={t('home.status_overview.battery')} color={w.power.battery > 0 ? '#F05C25' : theme.textMuted} onClick={() => go('power-battery')} theme={theme} />
          </div>
        </div>
      </div>
      </>}
    </>
  );
}
