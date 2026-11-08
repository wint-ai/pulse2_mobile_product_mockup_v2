import { useNavigate } from 'react-router-dom';
import TabBar from '../../components/TabBar';
import StatusWidgets from '../../components/StatusWidgets';
import EventRow from '../../components/EventRow';
import { SYSTEMS, computeWidgets } from '../../data/systems';
import { HISTORY_EVENTS } from '../../data/events';
import { useTheme } from '../../context/ThemeContext';
import { useDataRefresh } from '../../utils/useDataRefresh';

// Show first few systems as sample scope
const SM_SYSTEMS = SYSTEMS.slice(0, 5);
const SM_SYSTEM_IDS = SM_SYSTEMS.map(s => s.id);

export default function HomeClear() {
  useDataRefresh();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const widgets = computeWidgets(SM_SYSTEMS);
  // Use resolved history events — "all clear" means no active alerts, so only past events shown
  const recentEvents = HISTORY_EVENTS.filter(e =>
    SM_SYSTEM_IDS.includes(e.system)
  ).slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{ background: theme.headerBg, borderBottom: theme.headerBorder, padding: '11px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', color: theme.text }}>Home</div>
            <div style={{ fontSize: 13, color: theme.textTertiary }}>Suffolk Maintenance · Tower One</div>
          </div>
          <div style={{
            width: 34, height: 34, borderRadius: 17, background: theme.card,
            border: theme.cardBorder, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          }}>🔔</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 0', background: theme.bgFlat }}>
        {/* All clear */}
        <div style={{
          background: theme.clearBg, borderRadius: 11, padding: '11px 13px',
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
          border: theme.clearBorder,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: theme.green, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.green }}>All clear</div>
            <div style={{ fontSize: 13, color: theme.green, marginTop: 1, opacity: 0.7 }}>No active alerts · Tower One</div>
          </div>
        </div>

        {/* Status widgets */}
        <StatusWidgets widgets={widgets} />

        {/* Recent events */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7, marginTop: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>Recent events</span>
          <button
            onClick={() => navigate('/events')}
            style={{ fontSize: 14, color: theme.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >View all</button>
        </div>
        {recentEvents.map(ev => <EventRow key={ev.id} event={ev} />)}
      </div>

      <TabBar activeTab="home" />
    </div>
  );
}
