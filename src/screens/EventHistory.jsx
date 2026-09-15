import { useNavigate, useParams } from 'react-router-dom';
import TabBar from '../components/TabBar';
import { CURRENT_EVENTS, HISTORY_EVENTS } from '../data/events';
import { getSystemById } from '../data/systems';
import EventRow from '../components/EventRow';
import { useTheme } from '../context/ThemeContext';

export default function EventHistory() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { systemId } = useParams();
  const sys = systemId ? getSystemById(systemId) : null;

  const allEvents = [...CURRENT_EVENTS, ...HISTORY_EVENTS].filter(e => !systemId || e.system === systemId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: theme.bg }}>
      <div style={{ background: theme.headerBg, borderBottom: theme.headerBorder, padding: '11px 16px', flexShrink: 0 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ fontSize: 15, color: '#04ADEF', background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 2, marginBottom: 4 }}
        >{'\u2039'} Back</button>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', color: theme.text }}>Event History</div>
        {sys && <div style={{ fontSize: 13, color: theme.textTertiary, marginTop: 2 }}>{[sys.name, sys.l4Name || sys.l3Name].filter(Boolean).join(' · ')}</div>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: theme.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', padding: '5px 0 4px' }}>
          Recent
        </div>
        {allEvents.map(ev => <EventRow key={ev.id} event={ev} />)}
        {allEvents.length === 0 && (
          <div style={{ textAlign: 'center', color: theme.textMuted, fontSize: 15, marginTop: 40 }}>No events found</div>
        )}
      </div>
      <TabBar activeTab="systems" />
    </div>
  );
}
