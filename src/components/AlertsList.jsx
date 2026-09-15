import AlertCard, { ActiveLeakEmptyCard } from './AlertCard';
import { getAccountById } from '../data/accounts';
import { isLeakDetectionEnabled } from '../data/systems';
import { isIgnored } from '../data/ignoredIncidents';
import { useTheme } from '../context/ThemeContext';

// Shared alerts display — used by Home and Systems tab
// Shows leak alerts as full cards, other alerts as compact rows

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

const OTHER_ALERT_CONFIG = {
  'offline':     { icon: '📡', color: '#717684', label: 'Device offline' },
  'valve-error': { icon: '⚙️', color: '#717684', label: 'Valve error' },
  'power-lost':  { icon: '⚡', color: '#717684', label: 'AC power lost' },
};

function OtherAlertRow({ sys, navigate }) {
  const { theme } = useTheme();
  const cfg = OTHER_ALERT_CONFIG[sys.alert?.type] || { icon: '⚠', color: '#717684', label: sys.alert?.type || 'Alert' };
  const alertColor = cfg.color;

  return (
    <div
      onClick={() => navigate(`/system/${sys.id}`)}
      style={{
        background: theme.card, borderRadius: 12, marginBottom: 5,
        border: theme.cardBorder, borderLeft: `4px solid ${alertColor}`,
        padding: '9px 12px', cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{sys.name}</div>
          <div style={{ fontSize: 14, color: theme.textTertiary, marginTop: 1 }}>{[sys.l4Name || sys.l3Name, sys.l3Name || sys.l2Name].filter(Boolean).join(' · ')}</div>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
          background: alertColor + '18', color: alertColor,
        }}>
          {cfg.icon} {cfg.label}
        </span>
        <span style={{ fontSize: 14, color: theme.textMuted }}>{sys.alert?.age}</span>
        <span style={{ fontSize: 15, color: theme.textFaint }}>{'\u203A'}</span>
      </div>
    </div>
  );
}

export default function AlertsList({ systems, navigate, showGroupHeaders = true }) {
  const { theme } = useTheme();
  // Per alerts-mockup-feedback #3: Ignored events leave the Active list — they move to History.
  // Active tab should only show events that need attention.
  const alertSystems = systems.filter(s => s.alert !== null && !isIgnored(s.id))
    .sort((a, b) => {
      // Leaks first, then by age
      const aLeak = a.alert.type.includes('leak') ? 0 : 1;
      const bLeak = b.alert.type.includes('leak') ? 0 : 1;
      if (aLeak !== bLeak) return aLeak - bLeak;
      return 0;
    });

  const leakAlerts = alertSystems.filter(s => s.alert.type === 'leak-high' || s.alert.type === 'leak-low');
  const otherAlerts = alertSystems.filter(s => s.alert.type !== 'leak-high' && s.alert.type !== 'leak-low');

  // Group leaks by account
  const accountIds = [...new Set(leakAlerts.map(s => s.account))];
  const isMultiAccount = accountIds.length > 1;

  const anyLeakDetection = systems.some(isLeakDetectionEnabled);
  const showLeakEmptyState = leakAlerts.length === 0 && anyLeakDetection;

  if (alertSystems.length === 0) {
    return <ActiveLeakEmptyCard />;
  }

  return (
    <>
      {/* Leak alerts (or empty-state widget when none active) */}
      {showLeakEmptyState && <ActiveLeakEmptyCard />}
      {leakAlerts.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {showGroupHeaders && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 8px' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>Active Leaks</span>
              <span style={{ fontSize: 13, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'rgba(219,70,112,0.2)', color: '#DB4670' }}>
                {leakAlerts.length}
              </span>
            </div>
          )}
          {isMultiAccount
            ? accountIds.map(accId => {
                const acc = getAccountById(accId);
                const accLeaks = leakAlerts.filter(s => s.account === accId);
                if (accLeaks.length === 0) return null;
                return (
                  <div key={accId}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.textTertiary, letterSpacing: '.3px', marginBottom: 4, textTransform: 'uppercase' }}>
                      {acc?.shortName || accId}
                    </div>
                    {accLeaks.map(sys => <AlertCard key={sys.id} system={sys} />)}
                  </div>
                );
              })
            : leakAlerts.map(sys => <AlertCard key={sys.id} system={sys} />)
          }
        </div>
      )}

      {/* Other alerts */}
      {otherAlerts.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {showGroupHeaders && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 8px' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>Other Alerts</span>
              <span style={{ fontSize: 13, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: theme.badgeBg, color: theme.textSecondary }}>
                {otherAlerts.length}
              </span>
            </div>
          )}
          {otherAlerts.map(sys => <OtherAlertRow key={sys.id} sys={sys} navigate={navigate} />)}
        </div>
      )}
    </>
  );
}
