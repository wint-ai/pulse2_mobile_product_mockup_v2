import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TabBar from '../../components/TabBar';
import PipesHeader from '../../components/PipesHeader';
import StatusWidgetsMobile from '../../components/StatusWidgetsMobile';
import { HomeOnboarding } from '../../components/Onboarding';
import { useUserContext } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import { useDataRefresh } from '../../utils/useDataRefresh';

function MIcon({ name, size = 18, color, fill, style = {} }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, color, fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0", ...style }}>{name}</span>;
}

// Segmented semi-circle donut: green = protected, then colored segments per gap
function SegmentedGauge({ segments, trackColor, size = 160, stroke = 14 }) {
  const r = (size - stroke) / 2;
  const halfCirc = Math.PI * r;
  let consumed = 0;

  return (
    <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
      {/* Track */}
      <path
        d={`M ${stroke / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${size / 2}`}
        fill="none" stroke={trackColor} strokeWidth={stroke} strokeLinecap="round"
      />
      {/* Segments — drawn in reverse order so first segment is on top visually at the start */}
      {segments.slice().reverse().map((seg, i) => {
        // Calculate total length up to and including this segment (from the end)
        const totalAfter = segments.slice().reverse().slice(0, i + 1).reduce((sum, s) => sum + s.pct, 0);
        const segLen = (seg.pct / 100) * halfCirc;
        if (segLen <= 0) return null;
        const totalLen = (totalAfter / 100) * halfCirc;
        return (
          <path key={seg.key}
            d={`M ${stroke / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${size / 2}`}
            fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${totalLen} ${halfCirc}`}
            strokeDashoffset={0}
            strokeLinecap={i === 0 ? 'round' : 'butt'}
          />
        );
      })}
    </svg>
  );
}

function ProtectionOverview({ systems, theme, navigate }) {
  const [showInfo, setShowInfo] = useState(false);
  const dk = theme.mode === 'dark' || theme.mode === 'ocean' || theme.mode === 'gradient' || theme.mode === 'midnight';
  const gl = theme.glass;

  const NOW = Date.now();
  const H24 = 24 * 3600000;
  const total = systems.length;

  const nonComm = systems.filter(s => {
    if (!s.lastSeen) return s.offline || s.comm === 'offline';
    return (NOW - new Date(s.lastSeen).getTime()) > H24;
  });
  const seen = new Set(nonComm.map(s => s.id));

  const valveErr = systems.filter(s => s.valve === 'error' && !seen.has(s.id));
  valveErr.forEach(s => seen.add(s.id));

  const powerLost = systems.filter(s => s.power === 'ac-lost' && !seen.has(s.id));
  powerLost.forEach(s => seen.add(s.id));

  const noRecip = systems.filter(s => (s.notificationRecipients || 0) === 0 && !seen.has(s.id));
  noRecip.forEach(s => seen.add(s.id));

  const protectedCount = total - seen.size;
  const allGood = seen.size === 0;
  const protectedPct = total > 0 ? (allGood ? 100 : Math.min(99, Math.floor((protectedCount / total) * 100))) : 100;

  const gaps = [
    { key: 'protection-nocomm', icon: 'wifi_off', label: 'Non-Communicating', count: nonComm.length, color: theme.red, ids: nonComm.map(s => s.id) },
    { key: 'protection-valve-error', icon: 'error', label: 'Valve Error', count: valveErr.length, color: theme.orange, ids: valveErr.map(s => s.id) },
    { key: 'protection-power-lost', icon: 'power_off', label: 'Ext. Power Loss', count: powerLost.length, color: '#E5A100', ids: powerLost.map(s => s.id) },
    { key: 'protection-no-recipients', icon: 'notifications_off', label: 'No Alert Contacts', count: noRecip.length, color: '#FACC15', ids: noRecip.map(s => s.id) },
  ].filter(g => g.count > 0);

  // Build segments: protected (green) first, then gaps
  const segments = [
    { key: 'protected', pct: total > 0 ? (protectedCount / total) * 100 : 100, color: theme.green },
    ...gaps.map(g => ({ key: g.key, pct: total > 0 ? (g.count / total) * 100 : 0, color: g.color })),
  ];

  const trackColor = gl ? 'rgba(255,255,255,0.3)' : dk ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const tintColor = allGood ? '161,210,70' : '4,173,239';
  const tintAmt = allGood ? 0.05 : 0.04;

  return (
    <div style={gl ? {
      background: theme.glassBg, border: theme.glassBorder, backdropFilter: theme.glassBlur, WebkitBackdropFilter: theme.glassBlur,
      borderRadius: 12, marginBottom: 6, overflow: 'hidden',
    } : {
      background: dk ? `rgba(${tintColor},${tintAmt})` : `rgba(${tintColor},${tintAmt * 0.5})`,
      borderRadius: 12, marginBottom: 6, overflow: 'hidden',
      border: `1px solid rgba(${tintColor},${dk ? 0.1 : 0.08})`,
      boxShadow: dk ? '0 1px 6px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {/* Header */}
      <div style={{ padding: '11px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MIcon name="shield" size={18} color={allGood ? theme.green : theme.accent} fill />
          <span style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>System Health</span>
        </div>
        <span onClick={() => setShowInfo(v => !v)} className="material-symbols-outlined"
          style={{ fontSize: 18, color: theme.textMuted, cursor: 'pointer' }}>info</span>
      </div>

      {showInfo && (
        <div style={{ padding: '8px 14px 0' }}>
          <div style={{ background: theme.inputBg, borderRadius: 8, padding: '8px 10px', fontSize: 12, lineHeight: 1.5, color: theme.textSecondary }}>
            A system is <b>healthy</b> when it communicated in the last 24 hours, has no valve or external power errors, and has users registered to receive leak and error notifications.
          </div>
        </div>
      )}

      {/* Segmented gauge — centered */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 14px 0' }}>
        <div style={{ position: 'relative', width: 160, height: 92 }}>
          <SegmentedGauge segments={segments} trackColor={trackColor} size={160} stroke={14} />
          <div style={{ position: 'absolute', bottom: 2, left: 0, right: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: allGood ? theme.green : theme.text, letterSpacing: '-1px', lineHeight: 1 }}>{protectedPct}%</div>
            <div style={{ fontSize: 11, color: theme.textTertiary, marginTop: 2 }}>protected</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: theme.textTertiary, marginTop: 6, textAlign: 'center' }}>
          {protectedCount} of {total} systems
        </div>
      </div>

      {/* Legend / breakdown */}
      {gl ? (
        /* ── Portal: Figma-style inner glass cells (2x2 grid) ── */
        <>
          {allGood && (
            <div style={{ padding: '6px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <MIcon name="check_circle" size={16} color={theme.green} fill />
              <span style={{ fontSize: 14, fontWeight: 600, color: theme.green }}>All systems protected</span>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', padding: 4, gap: 4 }}>
            {[
              { key: 'protection-nocomm', label: 'Not Communicating', count: gaps.find(g => g.key === 'protection-nocomm')?.count || 0, ids: gaps.find(g => g.key === 'protection-nocomm')?.ids },
              { key: 'protection-valve-error', label: 'Valve Errors', count: gaps.find(g => g.key === 'protection-valve-error')?.count || 0, ids: gaps.find(g => g.key === 'protection-valve-error')?.ids },
              { key: 'protection-power-lost', label: 'Ext. Power Loss', count: gaps.find(g => g.key === 'protection-power-lost')?.count || 0, ids: gaps.find(g => g.key === 'protection-power-lost')?.ids },
              { key: 'protection-no-recipients', label: 'No Alert Contact', count: gaps.find(g => g.key === 'protection-no-recipients')?.count || 0, ids: gaps.find(g => g.key === 'protection-no-recipients')?.ids },
            ].map(cell => (
              <div key={cell.key}
                onClick={() => cell.count > 0 && cell.ids && navigate(`/kpi/${cell.key}?scope=${cell.ids.join(',')}`)}
                style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                  padding: '0 8px', gap: 4,
                  background: 'rgba(255,255,255,0.6)', backdropFilter: theme.glassBlur, WebkitBackdropFilter: theme.glassBlur,
                  borderRadius: 12, flex: '1 1 calc(50% - 4px)', minHeight: 88,
                  cursor: cell.count > 0 ? 'pointer' : 'default',
                }}>
                <span style={{ fontFamily: theme.kpiFont, fontSize: 50, fontWeight: theme.kpiWeight, lineHeight: '60px', color: cell.count > 0 ? theme.kpiColor : theme.kpiColorOk }}>
                  {cell.count > 0 ? cell.count : '\u2014'}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(32,41,76,0.7)', fontWeight: 500 }}>{cell.label}</span>
              </div>
            ))}
          </div>
        </>
      ) : allGood ? (
        <div style={{ padding: '10px 14px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <MIcon name="check_circle" size={16} color={theme.green} fill />
          <span style={{ fontSize: 14, fontWeight: 600, color: theme.green }}>All systems protected</span>
        </div>
      ) : (
        <div style={{ padding: '8px 14px 12px' }}>
          {gaps.map(g => (
            <div key={g.key}
              onClick={() => navigate(`/kpi/${g.key}?scope=${g.ids.join(',')}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                cursor: 'pointer', borderBottom: `1px solid ${dk ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
              }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: theme.text }}>{g.label}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: g.color, marginRight: 4 }}>{g.count}</span>
              <span style={{ fontSize: 14, color: theme.textDimmest }}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomeManager() {
  useDataRefresh();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { visibleSystems = [], persona } = useUserContext() || {};

  // Show home onboarding only when triggered from Tutorial button (phase === 'home')
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return sessionStorage.getItem('pulse2-onboard-phase') === 'home';
  });

  const dk = theme.mode === 'dark' || theme.mode === 'ocean' || theme.mode === 'gradient' || theme.mode === 'midnight';
  const gl = theme.glass;
  const trendChanges = 3;
  const backgroundFlows = 5;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
      background: theme.bg,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Hero with pipes background */}
      <PipesHeader>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>Good morning</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{visibleSystems.length} Systems</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>
            {new Set(visibleSystems.map(s => s.l4 || s.l3).filter(Boolean)).size} locations &middot; {new Set(visibleSystems.map(s => s.account)).size} accounts
          </div>
        </div>
      </PipesHeader>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 93px', position: 'relative', zIndex: 1 }}>

        {/* Status widgets */}
        <StatusWidgetsMobile systems={visibleSystems} scopeIds={visibleSystems.map(s => s.id)} alertsOnly />

        {/* System Health */}
        <ProtectionOverview systems={visibleSystems} theme={theme} navigate={navigate} />

        {/* Insights — distinct card section */}
        <div style={gl ? {
          background: theme.glassBg, border: theme.glassBorder, backdropFilter: theme.glassBlur, WebkitBackdropFilter: theme.glassBlur,
          borderRadius: 12, marginTop: 6, overflow: 'hidden',
        } : {
          background: dk ? 'rgba(4,173,239,0.04)' : 'rgba(4,173,239,0.02)',
          borderRadius: 12, marginTop: 6, overflow: 'hidden',
          border: `1px solid rgba(4,173,239,${dk ? 0.1 : 0.06})`,
          boxShadow: dk ? '0 1px 6px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ padding: '11px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MIcon name="lightbulb" size={18} color={theme.accent} fill />
              <span style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>Insights</span>
            </div>
            <span style={{ fontSize: 13, color: theme.accent, fontWeight: 600, cursor: 'pointer' }}>View all &rarr;</span>
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '10px 14px 14px' }}>
            {[
              { icon: 'trending_up', color: '#F05C25', value: trendChanges, label: 'Trend Changes' },
              { icon: 'nightlight', color: theme.accent, value: backgroundFlows, label: 'Background Flow' },
            ].map((ins, i) => (
              <div key={i} style={{
                flex: 1,
                background: gl ? 'rgba(255,255,255,0.35)' : dk ? 'rgba(255,255,255,0.04)' : '#F3F5F8',
                border: gl ? '1px solid rgba(255,255,255,0.6)' : 'none',
                borderRadius: 8, padding: '8px 10px', textAlign: 'center', cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 }}>
                  <MIcon name={ins.icon} size={14} color={ins.color} />
                  <span style={{ fontSize: 18, fontWeight: 800, color: theme.text }}>{ins.value}</span>
                </div>
                <div style={{ fontSize: 11, color: theme.textTertiary }}>{ins.label}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {showOnboarding && (
        <HomeOnboarding
          onDismiss={() => setShowOnboarding(false)}
          onGoToSystems={() => { setShowOnboarding(false); navigate('/systems'); }}
        />
      )}

      <TabBar activeTab="home" />
    </div>
  );
}
