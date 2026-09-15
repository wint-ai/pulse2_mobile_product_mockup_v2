import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getActivePolicy } from '../data/systemDetails';
import { getActiveIncident, getLeakState } from '../data/incidents';

const LEVEL_COLOR = { 'leak-high': '#DB4670', 'leak-low': '#F05C25' };
const LEVEL_LABEL = { 'leak-high': 'High Flow', 'leak-low': 'Low Flow' };

const STATE_STYLE = {
  Warning:  { bg: 'rgba(240,92,37,0.15)',  color: '#C84A1E' },
  Ongoing:  { bg: 'rgba(219,70,112,0.15)', color: '#B03058' },
  ShutOff:  { bg: 'rgba(113,118,132,0.18)', color: '#4A4F5A' },
};

function Row({ label, value, theme }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0' }}>
      <span style={{ color: theme.textTertiary }}>{label}</span>
      <span style={{ color: theme.text, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default function AlertCard({ system, hideLocation = false }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const alert = system.alert;
  const isLeak = alert?.type === 'leak-high' || alert?.type === 'leak-low';

  // Non-leak alerts keep a simple legacy layout — Widget 2 spec is leak-only.
  if (!isLeak) {
    return (
      <div style={{
        background: theme.card, borderRadius: 16, marginBottom: 8,
        border: theme.cardBorder, padding: '14px 16px',
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{system.name}</div>
        <div style={{ fontSize: 14, color: theme.textTertiary, marginTop: 2 }}>
          {alert?.label || 'Alert'}
        </div>
      </div>
    );
  }

  const levelColor = LEVEL_COLOR[alert.type];
  const levelLabel = LEVEL_LABEL[alert.type];

  const incident = getActiveIncident(system.id);
  const leakState = getLeakState(incident) || 'Warning';
  const stateStyle = STATE_STYLE[leakState];

  const policy = getActivePolicy(system.id);
  const hasValve = system.valve !== null && system.valve !== undefined;
  const autoShutoff = !hasValve
    ? null
    : policy?.autoShutoff === 'On' ? 'Enabled'
    : policy?.autoShutoff === 'Off' ? 'Disabled'
    : null;

  const valveLabel = !hasValve
    ? 'No Valve'
    : system.valve === 'open'   ? 'Open'
    : system.valve === 'closed' ? 'Closed'
    : system.valve === 'error'  ? 'Error'
    : 'Unknown';

  return (
    <div
      onClick={() => navigate(`/alert/${system.id}`)}
      style={{
        background: theme.card,
        borderRadius: 16,
        marginBottom: 8,
        cursor: 'pointer',
        border: theme.cardBorder,
        borderLeft: `4px solid ${levelColor}`,
        padding: '12px 14px',
      }}
    >
      {/* Title row: "Active Leak" + level + state pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '.5px',
          color: levelColor, textTransform: 'uppercase',
        }}>
          {'💧'} Active Leak
        </span>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
          background: levelColor + '24', color: levelColor,
        }}>{levelLabel}</span>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
          background: stateStyle.bg, color: stateStyle.color, marginLeft: 'auto',
        }}>{leakState}</span>
      </div>

      {/* System name */}
      <div style={{
        fontSize: 16, fontWeight: 700, color: theme.text,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {system.name}
      </div>

      {/* Detail rows */}
      <div style={{ marginTop: 6 }}>
        {alert.flowRate && (
          <Row label="Recent flow rate" value={alert.flowRate} theme={theme} />
        )}
        {alert.startedAt && (
          <Row label="Detected At" value={alert.startedAt} theme={theme} />
        )}
        {alert.age && (
          <Row label="Time since detection" value={alert.age} theme={theme} />
        )}
        {autoShutoff && (
          <Row label="Auto shut-off" value={autoShutoff} theme={theme} />
        )}
        <Row label="Current valve state" value={valveLabel} theme={theme} />
        {!hideLocation && (
          <Row
            label="Location"
            value={[system.l4Name || system.l3Name, system.l3Name || system.l2Name].filter(Boolean).join(' · ')}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}

// Empty state — shown when leak detection is enabled and no active leak.
export function ActiveLeakEmptyCard() {
  const { theme } = useTheme();
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(161,210,70,0.15), rgba(4,173,239,0.1))',
      borderRadius: 16, padding: '16px 18px', marginBottom: 8,
      border: '1px solid rgba(161,210,70,0.2)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', background: '#A1D246',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, color: '#fff',
      }}>{'✓'}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>All Clear</div>
        <div style={{ fontSize: 14, color: theme.textSecondary, marginTop: 2 }}>
          No active Water Events
        </div>
      </div>
    </div>
  );
}
