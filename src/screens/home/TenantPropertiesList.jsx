// Multi-apartment tenant Home — the properties list.
// Anatomy locked 2026-06-04: status dot + name + location + chevron.
// Tap a card → drill into that apartment's detail page (the tenant variant
// of SystemDetail). The breadcrumb on the detail page ("My properties ›
// Apt 47") brings the user back here.

import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import { computeSystemHealth } from '../../utils/systemHealth';
import PipesHeader, { GLOW_PAGE_BG } from '../../components/PipesHeader';
import { useDataRefresh } from '../../utils/useDataRefresh';

function MIcon({ name, size = 18, color, fill = false, style = {} }) {
  return (
    <span className="material-symbols-outlined"
      style={{ fontSize: size, color, fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0", lineHeight: 1, ...style }}
    >{name}</span>
  );
}

// Status dot color for a single property.
//   red   — active Water Event (includes ignored — per PRD 14 § 2.3, an
//           ignored event stays "active" on the property until water flow
//           actually stops; the tenant should still see their property as
//           alert-state so they know water is still flowing)
//   amber — protection issue (offline / valve error / power lost)
//   green — healthy
function statusFor(sys) {
  const isLeak = (sys.alert?.type === 'leak-high' || sys.alert?.type === 'leak-low');
  if (isLeak) return { color: '#F05C25', tone: 'alert' };
  const h = computeSystemHealth(sys);
  if (!h.allOk) return { color: '#E5A100', tone: 'warn' };
  return { color: '#5C9E1A', tone: 'ok' };
}

export default function TenantPropertiesList() {
  useDataRefresh();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { visibleSystems = [], persona } = useUserContext() || {};

  const issuesCount = visibleSystems.filter(s => statusFor(s).tone !== 'ok').length;
  const firstName = (persona?.name || '').split(' ')[0] || 'there';

  return (
    /* GLOW_PAGE_BG IS var(--app-bg) NOW — see src/components/PipesHeader.jsx.
       This screen's ground follows the theme and the app-background selector,
       which it never did while the recipe was a frozen pale-blue literal.
       Its INK did not follow on its own: the four strings below sit DIRECTLY on
       the ground and carried v1 literals, which are invisible on a dark one.
       The rows do not need this — they sit on theme.card. Same two custom
       properties EventsScreen declares, and ScopeHeader reads, so the one
       pattern covers both screens whose ground moved. */
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: GLOW_PAGE_BG,
      '--v1-scope-ink': 'var(--foreground)',
      '--v1-scope-ink-dim': 'var(--muted-foreground)',
    }}>
      <PipesHeader glow={true}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px 16px', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(11,149,248,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, border: '1px solid rgba(11,149,248,0.20)',
          }}>
            <MIcon name="home_work" size={22} color="#036AB5" fill />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--v1-scope-ink, #14151A)', letterSpacing: '-0.3px' }}>
              My properties
            </div>
            <div style={{ fontSize: 13, color: 'var(--v1-scope-ink-dim, #4A4F5A)' }}>
              {visibleSystems.length} apartment{visibleSystems.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </PipesHeader>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 24px' }}>
        <div style={{ padding: '0 4px 12px' }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', color: `var(--v1-scope-ink, ${theme.text})` }}>
            Hi {firstName}
          </div>
          <div style={{ fontSize: 12, color: `var(--v1-scope-ink-dim, ${theme.textTertiary})`, marginTop: 2 }}>
            {issuesCount === 0
              ? 'Everything looks fine'
              : `${issuesCount} apartment${issuesCount !== 1 ? 's' : ''} need${issuesCount === 1 ? 's' : ''} your attention`}
          </div>
        </div>

        {visibleSystems.map(sys => {
          const s = statusFor(sys);
          return (
            <div key={sys.id}
              onClick={() => navigate(`/system/${sys.id}`)}
              style={{
                background: theme.card,
                border: `1px solid ${theme.cardBorderColor || '#E5E8EE'}`,
                borderRadius: 14,
                boxShadow: '0 1px 3px rgba(20,21,26,0.05)',
                marginBottom: 10,
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer',
              }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: theme.text, letterSpacing: '-0.2px' }}>{sys.name}</div>
                {/* Immediate parent building only — keeps the row scannable
                    when the tenant has many properties (2026-06-07; previously
                    joined the full L4 · L3 path which crowded the row). */}
                <div style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>
                  {sys.l4Name || sys.l3Name || 'Apartment'}
                </div>
              </div>
              <MIcon name="chevron_right" size={20} color={theme.textTertiary} />
            </div>
          );
        })}

        {visibleSystems.length === 0 && (
          <div style={{
            background: theme.card, border: `1px solid ${theme.cardBorderColor || '#E5E8EE'}`,
            borderRadius: 14, padding: '24px 16px', textAlign: 'center',
            color: theme.textTertiary, fontSize: 14,
          }}>
            No properties on file
          </div>
        )}
      </div>
    </div>
  );
}
