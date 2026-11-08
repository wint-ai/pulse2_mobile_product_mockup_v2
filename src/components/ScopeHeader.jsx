// Shared header used by Home and Alerts. Single source of truth for the
// page-level header that includes:
//   - Drawer-trigger badge (left) with configurable icon + tint
//   - Compact breadcrumb (when a scope is selected)
//   - Page title (= scope name when scoped, else 'My Systems')
//   - expand_more chevron next to the title (drawer-open visual cue)
//   - Sub-line (page-specific content, passed in by the parent)
//
// Behavior MUST stay identical across Home and Alerts. Only the badge icon
// + tint differs (Home = home_work in brand blue; Alerts = notifications_active
// in red). Locked 2026-06-15.

import { useTranslation } from 'react-i18next';
import { useUserContext } from '../context/UserContext';
import CompactBreadcrumb from './CompactBreadcrumb';
import { getAncestorScopes } from '../utils/ancestorScopes';

function MIcon({ name, size = 18, fill = false, color, style = {} }) {
  return (
    <span className="material-symbols-outlined"
      style={{ fontSize: size, fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0", color, lineHeight: 1, ...style }}
    >{name}</span>
  );
}

export default function ScopeHeader({
  badgeIcon = 'home_work',
  /* Same opt-in shape as --v1-scope-ink below: the literal is the FALLBACK,
     so a screen that sets nothing renders exactly as it did. #036AB5 is a
     dark blue and measured 3.73:1 on the dark ground. */
  badgeIconColor = 'var(--v1-scope-badge-ink, #036AB5)',
  badgeBgColor = 'rgba(11,149,248,0.12)',
  badgeBorderColor = 'rgba(11,149,248,0.20)',
  subLine = null,
  onDrawerOpen,
}) {
  const { t } = useTranslation();
  const { visibleSystems = [], selectedScope, setSelectedScope, clearSelectedScope } = useUserContext() || {};
  const scopedSystems = selectedScope?.systems || visibleSystems;
  // Title fallback rule (intentionally simpler than before): scope name when
  // scoped; else the translated "My Systems". NO account-name fallback - that was
  // causing Alerts to show an account name while Home showed 'My Systems'.
  const pageTitle = selectedScope?.name || t('home.title_default');

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px' }}>
      <div
        onClick={onDrawerOpen}
        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }}
        role="button"
        aria-label={t('home.switch_location')}
        title={t('home.switch_location')}
      >
        {/* Badge - the only piece that differs per page (icon + tint) */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: badgeBgColor,
          border: `1px solid ${badgeBorderColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <MIcon name={badgeIcon} size={22} color={badgeIconColor} fill />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Compact breadcrumb when scope is selected. */}
          {selectedScope && (() => {
            const sample = (selectedScope.systems?.[0]) || scopedSystems[0];
            const all = sample ? getAncestorScopes(sample) : [];
            const ancestors = all.slice(0, selectedScope.ancestors.length);
            return (
              <CompactBreadcrumb
                ancestors={ancestors}
                onClearScope={() => clearSelectedScope?.()}
                onSelectAncestor={(a) => setSelectedScope?.(a)}
              />
            );
          })()}

          {/* Title + chevron */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
            <span style={{
              fontSize: 18, fontWeight: 700,
              /* THE LITERAL IS THE FALLBACK, AND THAT IS THE WHOLE DESIGN.
                 Three v1 screens mount this header and they do NOT share a
                 ground: SystemDetail keeps MESH_PAGE_BG, HomeUnified keeps its
                 own, and EventsScreen's GLOW_PAGE_BG now resolves to
                 var(--app-bg) and therefore follows the theme AND the app
                 background selector. Dark ink on a dark ground is invisible,
                 so the one screen whose ground moved declares
                 --v1-scope-ink on its root and this follows it; the two that
                 did not move declare nothing and get the literal they always
                 had, byte for byte. Do NOT point this straight at
                 --foreground: that would invert the title to white on the two
                 pale grounds that never asked to change. */
              color: 'var(--v1-scope-ink, #14151A)',
              letterSpacing: '-0.3px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{pageTitle}</span>
            <MIcon name="expand_more" size={22} color="var(--v1-scope-ink-dim, #4A4F5A)" style={{ flexShrink: 0, marginLeft: 2 }} />
          </div>

          {/* Sub-line - page-specific content (counts, attention, etc.) */}
          {subLine && (
            <div style={{ fontSize: 13, color: 'var(--v1-scope-ink-dim, #4A4F5A)' }}>
              {subLine}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
