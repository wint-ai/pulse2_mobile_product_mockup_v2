// L4 screen — shows individual systems at a specific L4 location
import { useNavigate, useParams } from 'react-router-dom';
import TabBar from '../../components/TabBar';
import { SYSTEMS } from '../../data/systems';
import { useTheme } from '../../context/ThemeContext';

const VALVE_COLOR = { open: '#A1D246', closed: '#717684', error: '#717684' };
const VALVE_LABEL = { open: 'Open', closed: 'Closed', error: 'Error' };

export default function L4Screen() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { l4id } = useParams();
  const systems = SYSTEMS.filter(s => s.l4 === l4id);
  const l4Name = systems[0]?.l4Name || l4id;
  const breadcrumbs = [
    { label: 'Systems', path: '/systems' },
    { label: l4Name, path: null },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: theme.bg }}>
      {/* Header */}
      <div style={{ background: theme.headerBg, borderBottom: theme.headerBorder, padding: '11px 16px', flexShrink: 0 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ fontSize: 15, color: '#04ADEF', background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 2, marginBottom: 4 }}
        >{'\u2039'} Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden', marginBottom: 4 }}>
          {breadcrumbs.map((bc, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {i > 0 && <span style={{ fontSize: 13, color: theme.textFaint }}>{'\u203A'}</span>}
              {bc.path ? (
                <button onClick={() => navigate(bc.path)} style={{ fontSize: 14, color: '#04ADEF', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', padding: 0 }}>{bc.label}</button>
              ) : (
                <span style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{bc.label}</span>
              )}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', color: theme.text }}>{l4Name}</span>
        </div>
      </div>

      {/* Systems list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 0' }}>
        <div style={{ background: theme.card, borderRadius: 12, overflow: 'hidden', border: theme.cardBorder }}>
          {systems.map((sys, i) => (
            <div key={sys.id}>
              <div
                onClick={() => navigate(`/system/${sys.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 13px',
                  cursor: 'pointer',
                  background: sys.alert ? 'rgba(219,70,112,0.08)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, background: sys.alert ? 'rgba(219,70,112,0.15)' : 'rgba(4,173,239,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15,
                  }}>
                    {sys.alert ? '\u26A0' : '\uD83D\uDCA7'}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{sys.name}</div>
                    {sys.offline && <div style={{ fontSize: 13, color: theme.textTertiary, marginTop: 1 }}>Offline</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {sys.valve && (
                    <span style={{ fontSize: 14, fontWeight: 500, color: VALVE_COLOR[sys.valve] || theme.textTertiary, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: VALVE_COLOR[sys.valve] || theme.textFaint, display: 'inline-block' }} />
                      {VALVE_LABEL[sys.valve]}
                    </span>
                  )}
                  {sys.alert && (
                    <span style={{ fontSize: 13, fontWeight: 700, background: '#DB4670', color: '#fff', borderRadius: 12, padding: '2px 7px' }}>!</span>
                  )}
                  <span style={{ fontSize: 16, color: theme.textFaint }}>{'\u203A'}</span>
                </div>
              </div>
              {i < systems.length - 1 && <div style={{ height: '0.5px', background: theme.divider, marginLeft: 50 }} />}
            </div>
          ))}
        </div>
      </div>

      <TabBar activeTab="systems" />
    </div>
  );
}
