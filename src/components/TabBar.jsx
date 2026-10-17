import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, EllipsisVertical, House } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUserContext } from '../context/UserContext';

/**
 * Bottom tab bar — ported from the v1 ThemeContext mechanism onto the v2
 * design tokens in src/index.css. Behaviour, props and navigation targets are
 * unchanged; only the styling mechanism moved.
 *
 * TOKEN MAPPING (the three v1 `theme.*` values this file used to read, taken
 * from the WINT theme, which is the default and the only one v2 ever renders):
 *   theme.tabBarBg      #F0F5FA  ->  --muted (= --slate-100, #f1f5f9)   bg-muted
 *   theme.tabBarBorder  #D0DFED  ->  --border (= --slate-200, #e2e8f0)  border-border
 *   theme.accent        #0B95F8  ->  --primary (wint-blue-accent,       text-primary
 *                                    #0b81f8)
 *   theme.tabInactive   #8E9BAA  ->  --slate-400 (#90a1b9)              text-slate-400
 * Each is the nearest design token by value AND by role: slate-100 is the
 * design system's muted surface, slate-200 is its "border / input / separator",
 * wint-blue-accent is the primary, and slate-400 is the de-emphasised label
 * colour SystemTypeCard already uses for its eyebrow and serial. The PORTAL
 * theme's `glass` backdrop-filter branch is dropped with the rest of the theme
 * machinery: v2 is single-look.
 *
 * GEOMETRY is carried over verbatim from the v1 inline styles (8px top / 14px
 * bottom padding, space-around, 3px icon-to-label gap, 22px icons, 12px label).
 * It is NOT verified against Figma: the delivery canvas has no bottom-bar node
 * that could be found, so the existing geometry is kept rather than a new one
 * invented.
 *
 * ICONS are lucide-react (House / Bell / EllipsisVertical), matching the v1
 * glyphs. Active state fills the glyph and goes semibold in the accent;
 * inactive keeps the 1.8 stroke in slate-400. src/v2/icons/ has no bottom-bar
 * glyph, and nothing new is added there for one Lucide already covers.
 *
 * LAYOUT CONTRACT: this is a flex-shrink-0 sibling inside the Phone column
 * (393x852, overflow hidden). It is NOT fixed and needs no spacer.
 *
 * @param hideAlerts  drop the Alerts tab. Pulse 2.0 reaches alerts from the
 *   home surface itself — the health pills and the water-events rows both open
 *   the alerts overlay pre-filtered — so a third tab pointing at the v1
 *   /alerts screen is a leftover, not a route anyone needs. The v1 demo
 *   screens still render the full three, which is why this is a prop and not
 *   a deletion: /alerts is still a live route and still reachable from the
 *   sidebar, from ActiveErrorsWidget and by URL.
 */

/* The bar itself. `justify-around` is v1's space-around; `shrink-0` is what
   keeps it pinned to the bottom of the Phone column without position:fixed. */
const BAR =
  'flex shrink-0 items-center justify-around border-t border-border bg-muted pt-[8px] pb-[14px]';

/* One tab. Built on the shadcn ghost Button so the focus ring and the
   hover handling come from the design system rather than being hand-rolled;
   `h-auto` / `py-0` / `px-[6px]` and the column direction undo the
   size="default" preset. font-sans is Figtree. */
const TAB =
  'h-auto cursor-pointer flex-col gap-[3px] rounded-lg px-[6px] py-0 font-sans';

export default function TabBar({ activeTab, hideAlerts = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const userCtx = useUserContext() || {};
  const { persona, visibleSystems = [] } = userCtx;
  const isTenant = persona?.tabMode === 'tenant';

  const TABS_FULL = [
    { key: 'home',    label: t('tabs.home'),   path: '/',        Icon: House },
    { key: 'events',  label: t('tabs.alerts'), path: '/alerts',  Icon: Bell },
    { key: 'account', label: t('tabs.more'),   path: '/account', Icon: EllipsisVertical },
  ];
  const TABS_TENANT = [
    { key: 'home',    label: t('tabs.home'),   path: '/tenant',  Icon: House },
    { key: 'events',  label: t('tabs.alerts'), path: '/alerts',  Icon: Bell },
    { key: 'account', label: t('tabs.more'),   path: '/account', Icon: EllipsisVertical },
  ];

  // For single-system tenants, Home tab points directly to their system
  const tenantTabs = isTenant && visibleSystems.length === 1
    ? [
        { key: 'home',    label: t('tabs.home'),   path: `/system/${visibleSystems[0].id}`, Icon: House },
        { key: 'events',  label: t('tabs.alerts'), path: '/alerts',                          Icon: Bell },
        { key: 'account', label: t('tabs.more'),   path: '/account',                         Icon: EllipsisVertical },
      ]
    : TABS_TENANT;

  const chosen = isTenant ? tenantTabs : TABS_FULL;
  const tabs = hideAlerts ? chosen.filter(tab => tab.key !== 'events') : chosen;

  return (
    <div className={BAR}>
      {tabs.map(tab => {
        const isActive = activeTab ? activeTab === tab.key : location.pathname === tab.path;
        const Icon = tab.Icon;
        return (
          <Button
            key={tab.key}
            variant="ghost"
            onClick={() => {
              // Bottom-tab tap NEVER mutates scope. Scope is owned by the
              // drawer (set by drill-down) and the breadcrumb (cleared via
              // 'My Systems' tap). Home and Alerts share one scope and must
              // stay in sync as the user navigates between them.
              //
              // Earlier (2026-06-08) we cleared scope here to avoid carry-over
              // from System Detail; that was the wrong fix - it broke the
              // Alerts-pick-location -> Home -> Alerts flow (scope wiped on the
              // Home tap, then wiped again on the Alerts tap). 2026-06-15.
              navigate(tab.path);
            }}
            className={cn(TAB, isActive ? 'text-primary' : 'text-slate-400')}
          >
            {/* size-[22px] also opts the glyph out of the Button preset's
                `[&_svg:not([class*='size-'])]:size-4`, which would otherwise
                shrink it to 16px. */}
            <Icon
              className="size-[22px]"
              strokeWidth={1.8}
              fill={isActive ? 'currentColor' : 'none'}
            />
            {/* The label must stay the FIRST <span> in the button: four DOM
                tests pick the tab by `button.querySelector('span').textContent`
                (scopePersistsAcrossTabs, scopePersistsThroughDrawer,
                systemImplicitScope, drawerLocationHighlight). Line-height goes
                AFTER the font size — twMerge drops a leading-* that precedes
                one. */}
            <span className={cn('text-[12px] leading-[16px]', isActive ? 'font-semibold' : 'font-normal')}>
              {tab.label}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
