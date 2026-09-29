import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useUserContext } from '../context/UserContext';

const HOME_ICON_FILLED = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
);
const HOME_ICON_STROKE = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 12L12 3l9 9M5 10v9h5v-5h4v5h5v-9"/>
  </svg>
);
const EVENTS_ICON_FILLED = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3a1 1 0 110 2 1 1 0 010-2zm0 4a4 4 0 110 8 4 4 0 010-8z"/>
  </svg>
);
const EVENTS_ICON_STROKE = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M8 7h8M8 12h5M8 17h3"/>
  </svg>
);
const SYSTEMS_ICON_FILLED = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
  </svg>
);
const SYSTEMS_ICON_STROKE = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 6h16M4 12h16M4 18h16"/>
  </svg>
);
const MORE_ICON_FILLED = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2.5"/>
    <circle cx="12" cy="12" r="2.5"/>
    <circle cx="12" cy="19" r="2.5"/>
  </svg>
);
const MORE_ICON_STROKE = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="5" r="2"/>
    <circle cx="12" cy="12" r="2"/>
    <circle cx="12" cy="19" r="2"/>
  </svg>
);

/**
 * @param hideAlerts  drop the Alerts tab. Pulse 2.0 reaches alerts from the
 *   home surface itself — the health pills and the water-events rows both open
 *   the alerts overlay pre-filtered — so a third tab pointing at the v1
 *   /alerts screen is a leftover, not a route anyone needs. The v1 demo
 *   screens still render the full three, which is why this is a prop and not
 *   a deletion: /alerts is still a live route and still reachable from the
 *   sidebar, from ActiveErrorsWidget and by URL.
 */
export default function TabBar({ activeTab, hideAlerts = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const userCtx = useUserContext() || {};
  const { persona, visibleSystems = [] } = userCtx;
  const isTenant = persona?.tabMode === 'tenant';

  const TABS_FULL = [
    { key: 'home',    label: t('tabs.home'),   path: '/',        filled: HOME_ICON_FILLED,   stroke: HOME_ICON_STROKE },
    { key: 'events',  label: t('tabs.alerts'), path: '/alerts',  filled: EVENTS_ICON_FILLED, stroke: EVENTS_ICON_STROKE },
    { key: 'account', label: t('tabs.more'),   path: '/account', filled: MORE_ICON_FILLED,   stroke: MORE_ICON_STROKE },
  ];
  const TABS_TENANT = [
    { key: 'home',    label: t('tabs.home'),   path: '/tenant',  filled: HOME_ICON_FILLED,   stroke: HOME_ICON_STROKE },
    { key: 'events',  label: t('tabs.alerts'), path: '/alerts',  filled: EVENTS_ICON_FILLED, stroke: EVENTS_ICON_STROKE },
    { key: 'account', label: t('tabs.more'),   path: '/account', filled: MORE_ICON_FILLED,   stroke: MORE_ICON_STROKE },
  ];

  // For single-system tenants, Home tab points directly to their system
  const tenantTabs = isTenant && visibleSystems.length === 1
    ? [
        { key: 'home',    label: t('tabs.home'),   path: `/system/${visibleSystems[0].id}`, filled: HOME_ICON_FILLED,   stroke: HOME_ICON_STROKE },
        { key: 'events',  label: t('tabs.alerts'), path: '/alerts',                          filled: EVENTS_ICON_FILLED, stroke: EVENTS_ICON_STROKE },
        { key: 'account', label: t('tabs.more'),   path: '/account',                         filled: MORE_ICON_FILLED,   stroke: MORE_ICON_STROKE },
      ]
    : TABS_TENANT;

  const chosen = isTenant ? tenantTabs : TABS_FULL;
  const tabs = hideAlerts ? chosen.filter(tab => tab.key !== 'events') : chosen;

  return (
    <div
      style={{
        background: theme.tabBarBg,
        borderTop: theme.tabBarBorder,
        ...(theme.glass ? { backdropFilter: theme.glassBlur, WebkitBackdropFilter: theme.glassBlur } : {}),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '8px 0 14px',
        flexShrink: 0,
      }}
    >
      {tabs.map(tab => {
        const isActive = activeTab ? activeTab === tab.key : location.pathname === tab.path;
        return (
          <button
            key={tab.key}
            onClick={() => {
              // Bottom-tab tap NEVER mutates scope. Scope is owned by the
              // drawer (set by drill-down) and the breadcrumb (cleared via
              // 'My Systems' tap). Home and Alerts share one scope and must
              // stay in sync as the user navigates between them.
              //
              // Earlier (2026-06-08) we cleared scope here to avoid carry-over
              // from System Detail; that was the wrong fix - it broke the
              // Alerts-pick-location → Home → Alerts flow (scope wiped on the
              // Home tap, then wiped again on the Alerts tap). 2026-06-15.
              navigate(tab.path);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              cursor: 'pointer',
              padding: '0 6px',
              border: 'none',
              background: 'none',
              fontFamily: 'inherit',
              color: isActive ? theme.accent : theme.tabInactive,
            }}
          >
            {isActive ? tab.filled : tab.stroke}
            <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400 }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
