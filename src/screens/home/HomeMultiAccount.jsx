import { useNavigate } from 'react-router-dom';
import TabBar from '../../components/TabBar';
import { ACCOUNTS } from '../../data/accounts';
import { useTheme } from '../../context/ThemeContext';
import { useDataRefresh } from '../../utils/useDataRefresh';

export default function HomeMultiAccount() {
  useDataRefresh();
  const { theme } = useTheme();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{ background: theme.headerBg, borderBottom: theme.headerBorder, padding: '11px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', color: theme.text }}>Home</div>
            <div style={{ fontSize: 13, color: theme.textTertiary }}>Suffolk Group · 2 accounts</div>
          </div>
          <div style={{
            width: 34, height: 34, borderRadius: 17, background: theme.card,
            border: theme.cardBorder, display: 'flex', alignItems: 'center',
            justifyContent: 'center', position: 'relative', cursor: 'pointer', flexShrink: 0,
          }}>
            🔔
            <div style={{
              position: 'absolute', top: 3, right: 3, background: theme.red, borderRadius: 7,
              minWidth: 15, height: 15, fontSize: 11, fontWeight: 700, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${theme.mode === 'dark' ? theme.bgSolid : '#fff'}`,
            }}>4</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 0', background: theme.bgFlat }}>
        {/* Combined widgets */}
        <div style={{ background: theme.card, borderRadius: 14, border: theme.cardBorder, overflow: 'hidden', marginBottom: 12 }}>
          {[
            { label: 'Comm.', left: '10 online', right: '2 offline', rightColor: theme.text, rightBg: theme.inputBg },
            { label: 'Valves', left: '7 open · 1 closed', right: '1 error', rightColor: theme.textTertiary, rightBg: theme.inputBg },
            { label: 'Power', left: '9 AC · 1 battery', right: '1 AC lost', rightColor: theme.textTertiary, rightBg: theme.inputBg },
          ].map((row, i, arr) => (
            <div key={row.label} style={{
              display: 'flex', alignItems: 'center', padding: '10px 13px',
              borderBottom: i < arr.length - 1 ? theme.separator : 'none', minHeight: 44,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: theme.textTertiary, width: 56, flexShrink: 0 }}>{row.label}</span>
              <span style={{ fontSize: 15, color: theme.textTertiary, flex: 1 }}>{row.left}</span>
              <span style={{
                fontSize: 14, fontWeight: 600, padding: '4px 8px', borderRadius: 7,
                background: row.rightBg, color: row.rightColor,
              }}>{row.right}</span>
            </div>
          ))}
        </div>

        {/* Accounts */}
        <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 7 }}>Accounts</div>
        {ACCOUNTS.map(acc => (
          <div
            key={acc.id}
            onClick={() => navigate(acc.id === 'sc' ? '/' : '/home-clear')}
            style={{
              background: theme.card, borderRadius: 12, overflow: 'hidden',
              marginBottom: 7, cursor: 'pointer', border: theme.cardBorder,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9, fontSize: 13, fontWeight: 700,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: acc.color,
                }}>{acc.id.toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{acc.name}</div>
                  <div style={{ fontSize: 13, color: theme.textTertiary, marginTop: 1 }}>{acc.meta} · {acc.systems} systems</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                {acc.alerts > 0 && (
                  <span style={{
                    fontSize: 13, fontWeight: 700, background: theme.red, color: '#fff',
                    borderRadius: 12, padding: '2px 8px',
                  }}>{acc.alerts}</span>
                )}
                <span style={{ fontSize: 15, color: theme.textDimmest }}>›</span>
              </div>
            </div>
          </div>
        ))}

        {/* Active alerts preview */}
        <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 7, marginTop: 4 }}>Active alerts</div>
        {[
          { color: theme.red, label: 'High Flow Water Event', name: 'Cooling Tower #1', path: 'Tower One · Manchester', age: '3h 11m' },
          { color: theme.gray, label: 'Valve error', name: 'Cooling Tower #2', path: 'Tower One · Manchester', age: '47m' },
          { color: theme.gray, label: 'AC power lost', name: 'Main Supply HQ', path: 'HQ Building · Liverpool', age: '22m' },
          { color: theme.orange, label: 'Low Flow Water Event', name: 'Sump Pump B1', path: 'Parking Level B1 · Manchester', age: '1h 4m' },
        ].map((a, i) => (
          <div key={i} style={{
            background: theme.card, borderRadius: 10, overflow: 'hidden',
            marginBottom: 6, border: theme.cardBorder,
          }}>
            <div style={{ height: 3, background: a.color }} />
            <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: a.color, textTransform: 'uppercase', letterSpacing: '.3px' }}>{a.label}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{a.name}</div>
                <div style={{ fontSize: 13, color: theme.textTertiary }}>{a.path}</div>
              </div>
              <span style={{ fontSize: 13, color: theme.textTertiary }}>{a.age}</span>
            </div>
          </div>
        ))}
      </div>

      <TabBar activeTab="home" />
    </div>
  );
}
