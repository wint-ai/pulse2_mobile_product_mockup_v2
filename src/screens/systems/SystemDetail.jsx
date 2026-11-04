import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TabBar from '../../components/TabBar';
import NavigationDrawer from '../../components/NavigationDrawer';
import SystemInfoTab from './SystemInfoTab';
import ActivityTab from './ActivityTab';
import ConsumptionTab from './ConsumptionTab';
import { getSystemById } from '../../data/systems';
import { getActivePolicy, getNextPolicy } from '../../data/systemDetails';
import TenantOverview from './TenantOverview';
import { formatLastSeen } from '../../utils/format';
import WaterEventDetailsWidget from '../../components/WaterEventDetailsWidget';
import TagBottomSheet from '../../components/TagBottomSheet';
import { getTags, addTag, removeTagAt } from '../../data/tagsStore';
import { getCurrentActor } from '../../data/currentUser';
import PipesHeader, { WINT_SKY_SYSTEM_BG, WINT_SKY_SYSTEM_BG_SIZE } from '../../components/PipesHeader';
import OfflineStickyBanner from '../../components/OfflineStickyBanner';
import ValveControlCard from '../../components/ValveControlCard';
import CompactBreadcrumb from '../../components/CompactBreadcrumb';
import { getAncestorScopes } from '../../utils/ancestorScopes';
import { useTheme } from '../../context/ThemeContext';
import { useUserContext } from '../../context/UserContext';
import { useDataRefresh } from '../../utils/useDataRefresh';
import { computeSystemHealth } from '../../utils/systemHealth';

function isTenantSystem(sys) { return !!sys.homeAway; }

// Material icon helper
function MIcon({ name, size = 18, color, fill, style = {} }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, color, fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0", ...style }}>{name}</span>;
}

/* ════════════════════════════════════════════════════════════════════════════
   LEGACY-COMPONENTS PURGE (2026-06-13)
   ════════════════════════════════════════════════════════════════════════
   Removed in this pass:
     - AllClear       (banner with "All Clear" framing - misleading when the
                       Health widget below showed issues; Water Event widget
                       now owns the empty state)
     - StatusPills    (Comm + Power pill row - never rendered in OverviewTab;
                       Protection Status surfaces both dimensions instead)
     - AlertBanner    (legacy non-water alert banner - functionally dead in
                       OverviewTab; Water Event widget + Protection Status
                       handle the surfaces)
     - WaterToday     (compact consumption chart - replaced by ConsumptionTab
                       on the System tab body)
     - _LegacyHomeAwayToggle (replaced by HomeAwayWidget in round 6)
   Tests that exercised the removed components (systemPageOverlay.dom.test.jsx)
   were dropped in the same pass.
   ════════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════════════
   ACTIVE POLICY CARD (Pro only)
   ════════════════════════════════════════════════════════════════════════ */

// One row of the fields grid — small label + field pill below.
function PolicyField({ label, value, theme }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: theme.textTertiary, marginBottom: 4 }}>{label}</div>
      <span style={{
        display: 'inline-block', padding: '5px 10px', borderRadius: 8,
        background: theme.card, border: `1px solid ${theme.cardBorderColor || '#E5E8EE'}`,
        fontSize: 13, fontWeight: 700, color: theme.text,
      }}>{value}</span>
    </div>
  );
}

// Single policy card — used twice (active + next).
function PolicyCard({ kind, policy, theme }) {
  const isActive = kind === 'active';
  const tint = isActive ? 'rgba(92,158,26,0.10)' : (theme.card);
  const borderColor = isActive ? 'rgba(92,158,26,0.25)' : (theme.cardBorderColor || '#E5E8EE');
  return (
    <div style={{
      background: tint,
      border: `1px solid ${borderColor}`,
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 10,
    }}>
      {/* Badge + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6,
          letterSpacing: '.4px',
          background: isActive ? '#5C9E1A' : (theme.divider || '#E5E8EE'),
          color: isActive ? '#fff' : (theme.textSecondary || theme.text),
        }}>{isActive ? 'ACTIVE' : 'NEXT'}</span>
        <span style={{ fontSize: 17, fontWeight: 700, color: theme.text, letterSpacing: '-0.3px' }}>{policy.name}</span>
      </div>

      {/* Hours — second thing the eye sees, by Rami's call */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14,
        fontSize: 13, fontWeight: 700, color: theme.text, fontVariantNumeric: 'tabular-nums',
      }}>
        <span className="material-symbols-outlined" style={{
          fontSize: 16, color: isActive ? '#2F6112' : theme.textTertiary,
        }}>schedule</span>
        <span>{policy.schedule}</span>
      </div>

      {/* 2x2 fields grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
        <PolicyField label="Auto shutoff"        value={policy.autoShutoff}       theme={theme} />
        <PolicyField label="Alert"               value={policy.alert}             theme={theme} />
        <PolicyField label="Default valve state" value={policy.defaultValveState} theme={theme} />
        <PolicyField label="Detection mode"      value={policy.detection}         theme={theme} />
      </div>
    </div>
  );
}

function ActivePolicyCard({ sys, theme }) {
  const active = getActivePolicy(sys.id);
  const next   = getNextPolicy(sys.id);

  // Date pill — today, formatted like "Thu, Apr 23".
  const now = new Date();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;

  return (
    <div>
      {/* Section header — title + date pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: theme.textSecondary }}>policy</span>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: theme.text, letterSpacing: '-0.2px' }}>Action Policy</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, color: theme.textTertiary,
          background: theme.card, border: `1px solid ${theme.cardBorderColor || '#E5E8EE'}`,
          padding: '4px 9px', borderRadius: 8,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>calendar_today</span>
          {dateStr}
        </span>
      </div>

      {/* Two stacked cards — active + next, both fully expanded. */}
      <PolicyCard kind="active" policy={active} theme={theme} />
      <PolicyCard kind="next"   policy={next}   theme={theme} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   PROTECTION STATUS (single system) — WINT drop / circle
   ════════════════════════════════════════════════════════════════════════ */

// WINT water drop SVG shape
function WintDrop({ color, size = 28 }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 32 39" fill="none" style={{ flexShrink: 0 }}>
      <path fillRule="evenodd" clipRule="evenodd"
        d="M30.2 30.5C29.1 34.6 25.2 37.5 20.5 37.5C15.8 37.5 11.9 34.6 10.8 30.5C10.1 27.8 11.2 24.7 14.1 21.5L20.5 14L26.9 21.5C29.8 24.7 30.9 27.8 30.2 30.5Z"
        transform="translate(-5, -10)" fill={color} />
    </svg>
  );
}

// formatLastSeen moved to src/utils/format.js (shared with TenantOverview).

function ProtectionStatusCard({ sys, theme }) {
  // expanded: when true, the passing (green) rows are appended below the
  // failing rows. Failing rows are ALWAYS visible (H2 — locked 2026-06-08).
  const [expanded, setExpanded] = useState(false);
  // Recipients row open state — replaces the old contacts bottom-sheet modal.
  // Inline expansion below the row showing avatar + name + channel chips.
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  // "What does Healthy mean?" tooltip — restored 2026-06-04 per Rami. The
  // healthy state is otherwise opaque (just a green shield + the word
  // "Healthy") so a tap on the info icon reveals the canonical definition.
  const [showHealthInfo, setShowHealthInfo] = useState(false);

  // Shared health check — drawer + system page MUST agree. See utils/systemHealth.js.
  const { isComm, valveOk, powerOk, hasRecipients, allOk, issueCount } = computeSystemHealth(sys);

  const isExpanded = expanded;

  // Variant A palette — same muted red used by the Home Systems Health bar /
  // counter and the Status Overview "bad" pills, so health drift reads as one
  // signal across the app. Green when all healthy.
  const ringColor = allOk ? '#5C9E1A' : '#A5455E';
  const iconBg = allOk ? 'rgba(92,158,26,0.10)' : 'rgba(165,69,94,0.10)';
  const iconColor = ringColor;
  const titleColor = allOk ? '#2F6112' : '#A5455E';

  const valveLabel = sys.valve === 'open' ? 'Open' : sys.valve === 'closed' ? 'Closed' : sys.valve === 'error' ? 'Error' : null;
  const contacts = sys.contacts || [];

  // Per-dimension explanation copy for failing rows. Locked in
  // public/reviews/system-health-card.html design notes.
  const WHY = {
    comm:       'It has been too long since the system communicated with the Cloud.',
    valve:      'The valve is reporting an error and needs attention.',
    power:      'The system is disconnected from its power source.',
    recipients: 'No one is registered to receive alert notifications from this system.',
  };

  const lastSeenLine = `Last communicated: ${formatLastSeen(sys.lastSeen)}`;

  const checks = [
    { key: 'comm',  label: 'Communications', value: isComm ? 'Online' : 'Offline', ok: isComm, why: WHY.comm, meta: lastSeenLine },
    ...(sys.valve != null
      ? [{ key: 'valve', label: 'Valve',          value: valveLabel,                                                ok: valveOk,      why: WHY.valve }]
      : []),
    ...(sys.power != null
      ? [{ key: 'power', label: 'Ext. Power',     value: powerOk ? 'Connected' : 'Disconnected',                    ok: powerOk,      why: WHY.power }]
      : []),
    { key: 'recipients', label: 'Alert recipients',
      value: hasRecipients ? `${contacts.length} ${contacts.length === 1 ? 'person' : 'people'}` : 'None',
      ok: hasRecipients, tappable: hasRecipients, why: WHY.recipients },
  ];

  // When issues, build a short summary line for the subtitle.
  const failingLabels = checks.filter(c => !c.ok).map(c => c.label);
  const subtitle = failingLabels.length === 1
    ? failingLabels[0]
    : failingLabels.slice(0, 2).join(' · ') + (failingLabels.length > 2 ? ` + ${failingLabels.length - 2}` : '');

  // H2 — locked 2026-06-08: issue rows visible by default. H3 — expand reveals
  // the passing (green) rows. Issue rows stay where they are.
  const issueRows = checks.filter(c => !c.ok);
  const passingRows = checks.filter(c => c.ok);

  return (
    <>
      <div style={{
        background: theme.card,
        border: `1px solid ${theme.cardBorderColor || '#E5E8EE'}`,
        borderRadius: 14,
        boxShadow: '0 1px 3px rgba(20,21,26,0.05)',
        marginBottom: 8,
        overflow: 'hidden',
      }}>
        {/* Header — not tappable. Locked round 7 (H10): the bare header
            chevron was confusing because issues are already visible. The
            expand affordance moved to a labeled text-link inside the body
            (see § Show/Hide passing checks below). */}
        <div style={{
          padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: iconBg,
            border: `2px solid ${ringColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 18, color: iconColor, fontVariationSettings: "'FILL' 1",
            }}>shield</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: titleColor, letterSpacing: '-0.2px' }}>
                {allOk ? 'Healthy' : `${issueCount} issue${issueCount !== 1 ? 's' : ''}`}
              </span>
              {allOk && (
                <span
                  onClick={() => setShowHealthInfo(v => !v)}
                  className="material-symbols-outlined"
                  style={{ fontSize: 16, color: theme.textTertiary, cursor: 'pointer' }}
                  title="What does Healthy mean?"
                >info</span>
              )}
            </div>
            {!allOk && (
              <div style={{
                fontSize: 12, color: theme.textSecondary, fontWeight: 500, marginTop: 1,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{subtitle}</div>
            )}
          </div>
        </div>

        {/* "What does Healthy mean?" tooltip — only visible in the healthy
            state when the info icon was tapped. Canonical copy locked in
            public/reviews/system-health-card.html design notes. */}
        {allOk && showHealthInfo && (
          <div style={{ padding: '0 14px 12px' }}>
            <div style={{
              background: theme.inputBg, borderRadius: 8, padding: '10px 12px',
              fontSize: 12, lineHeight: 1.55, color: theme.textSecondary,
            }}>
              A system is <b style={{ color: theme.text }}>Healthy</b> when it communicated within its expected window, has no valve or external-power errors, and has at least one user registered to receive Water Event and Error notifications.
            </div>
          </div>
        )}

        {/* Body — issue rows always visible (issue state); passing rows behind
            a 'Show N passing checks' text-link (both states).
            Recipients row opens inline (no bottom-sheet modal).
            Healthy state (2026-06-09): widget IS expandable - shows the
            "Show N passing checks" text-link so the user can verify each
            dimension is OK. Previously the healthy state had no body, which
            made the widget feel un-tappable. */}
        {(issueRows.length > 0 || passingRows.length > 0) && (
          <div style={{ padding: '0 14px 12px' }}>
            {/* Issue rows — always visible when present */}
            {issueRows.map(c => (
              <HealthRow key={c.key} c={c} theme={theme} contacts={contacts} recipientsOpen={recipientsOpen} setRecipientsOpen={setRecipientsOpen} />
            ))}

            {/* Show/Hide passing checks text-link.
                - In issue state: separates issue rows from passing rows with a
                  border-top divider.
                - In healthy state: no divider above (nothing's above it). */}
            {passingRows.length > 0 && (
              <div
                onClick={() => setExpanded(v => !v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 600, color: theme.accent || '#036AB5',
                  padding: '8px 0',
                  cursor: 'pointer', userSelect: 'none',
                  marginTop: issueRows.length > 0 ? 4 : 0, width: '100%',
                  borderTop: issueRows.length > 0 ? `1px solid ${theme.divider || '#EEF1F5'}` : 'none',
                }}>
                {isExpanded ? 'Hide passing checks' : `Show ${passingRows.length} passing check${passingRows.length !== 1 ? 's' : ''}`}
                <span className="material-symbols-outlined" style={{
                  fontSize: 16, color: theme.accent || '#036AB5',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.15s',
                }}>expand_more</span>
              </div>
            )}

            {/* Passing rows — revealed when expanded */}
            {isExpanded && passingRows.map(c => (
              <HealthRow key={c.key} c={c} theme={theme} contacts={contacts} recipientsOpen={recipientsOpen} setRecipientsOpen={setRecipientsOpen} />
            ))}
          </div>
        )}

      </div>
    </>
  );
}

// Single row in the System Health body. Shared by issue-rows and passing-rows
// so the rendering stays consistent across both groups.
function HealthRow({ c, theme, contacts, recipientsOpen, setRecipientsOpen }) {
  const isOpen = c.key === 'recipients' && recipientsOpen;
  return (
    <div>
      <div
        onClick={c.tappable ? () => setRecipientsOpen(v => !v) : undefined}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0',
          borderTop: `1px solid ${theme.divider || '#EEF1F5'}`,
          cursor: c.tappable ? 'pointer' : 'default',
        }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0,
          background: c.ok ? '#5C9E1A' : '#E5A100',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{c.label}</span>
            <span style={{
              fontSize: 13, whiteSpace: 'nowrap',
              color: c.ok ? theme.textTertiary : '#8C5A0F',
              fontWeight: c.ok ? 500 : 700,
            }}>{c.value}</span>
          </div>
          {!c.ok && c.why && (
            <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 3, lineHeight: 1.4 }}>
              {c.why}
            </div>
          )}
          {c.meta && (
            <div style={{
              fontSize: 12,
              color: c.ok ? theme.textTertiary : theme.textSecondary,
              marginTop: 3, lineHeight: 1.4,
              fontVariantNumeric: 'tabular-nums',
            }}>{c.meta}</div>
          )}
        </div>
        {c.tappable && (
          <span className="material-symbols-outlined" style={{
            fontSize: 18, color: isOpen ? theme.text : theme.textDimmest,
            marginTop: 2,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.15s',
          }}>expand_more</span>
        )}
      </div>

      {/* Inline recipients sub-list (H4 — locked 2026-06-08). */}
      {isOpen && (
        <div style={{ marginLeft: 18, marginTop: 4, paddingTop: 4, borderTop: `1px dashed ${theme.divider || '#E2E6EB'}` }}>
          {contacts.map((c2, idx) => (
            <RecipientInlineRow key={idx} contact={c2} idx={idx} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
}

// Recipient row for the inline Alert-recipients expansion. Avatar (initials)
// + name + channel chips. Channel data is synthesized from a stable pattern
// for demo realism (each person gets a meaningful mix of Push / SMS / Email).
const HEALTH_AVATAR_COLORS = ['#036AB5', '#5C9E1A', '#8C5A0F', '#A5455E', '#6B7280'];
function RecipientInlineRow({ contact, idx, theme }) {
  const name = contact?.name || '-';
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || '?';

  // Channel mix - same pattern used in WaterEventDetailsWidget for consistency.
  const hasPush  = idx % 3 !== 2;
  const hasEmail = contact?.email && idx % 2 === 0;
  const hasSms   = !hasEmail || idx % 4 === 0;

  const chips = [
    hasPush  && { key: 'push',  label: 'Push',  icon: 'notifications', color: '#036AB5' },
    hasSms   && { key: 'sms',   label: 'SMS',   icon: 'sms',           color: '#5C9E1A' },
    hasEmail && { key: 'email', label: 'Email', icon: 'mail',          color: '#8C5A0F' },
  ].filter(Boolean);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: HEALTH_AVATAR_COLORS[idx % HEALTH_AVATAR_COLORS.length] + '24',
        color: HEALTH_AVATAR_COLORS[idx % HEALTH_AVATAR_COLORS.length],
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, flexShrink: 0,
      }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: theme.text }}>{name}</div>
      <div style={{ display: 'inline-flex', gap: 6, flexShrink: 0 }}>
        {chips.map(ch => (
          <span key={ch.key} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600,
            background: '#F4F6FA', color: theme.textSecondary,
            borderRadius: 6, padding: '3px 7px',
          }}>
            <span className="material-symbols-outlined"
              style={{ fontSize: 13, color: ch.color, fontVariationSettings: "'FILL' 1" }}>{ch.icon}</span>
            {ch.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   OVERVIEW TAB
   ════════════════════════════════════════════════════════════════════════ */

function OverviewTab({ sys, navigate }) {
  const { theme } = useTheme();
  const tenant = isTenantSystem(sys);

  // Tenant systems get a completely different Overview anatomy (hero mode
  // card, health row only when there's an issue, valve, consumption). See
  // TenantOverview.jsx + design-options/tenant-system-page-options.html.
  if (tenant) {
    return <TenantOverview sys={sys} navigate={navigate} />;
  }

  // Water Event Details widget surfaces the full event + the inline action
  // row (Tag / Ignore / On it). Non-water alerts (valve / power / comm)
  // surface via the Protection Status card below; no separate banner needed.

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingTop: 10, paddingBottom: 93 }}>
      <div style={{ padding: '0 14px' }}>
        {/* Water Event widget always renders. When there's an active water
            event it shows the full active card; when there isn't, it shows
            the empty state ("No active Water Events"). The widget stays
            visible so users always have a positive water-event indicator
            regardless of other alerts on the system. "All Clear" framing
            was dropped 2026-06-13 -- the widget reports water only, not
            global system status. */}
        <WaterEventDetailsWidget sys={sys} />
        <ProtectionStatusCard sys={sys} theme={theme} />
        <ValveControlCard sys={sys} />
      </div>

      {/* Consumption is now a first-class part of the Overview tab —
          moved here from its own tab. The Active Policy card moved out of
          Overview into the renamed "Policy" tab. */}
      <ConsumptionTab sys={sys} />
    </div>
  );
}

// Policy tab — wraps the existing ActivePolicyCard until the policy surface
// gets its own dedicated redesign. Non-tenants only — tenants don't manage
// policies, so they don't see this tab.
function PolicyTab({ sys }) {
  const { theme } = useTheme();
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 93px' }}>
      <ActivePolicyCard sys={sys} theme={theme} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   TAB CONFIG
   ════════════════════════════════════════════════════════════════════════ */

function getTabsForSystem(sys) {
  // Consumption is now folded into Overview. The middle tab becomes Policy
  // for non-tenants (wraps the Active Policy card). Tenants don't have a
  // policy surface so the tab is dropped for them.
  // labelKey resolves via t('system_detail.tabs.<key>') at render time.
  return isTenantSystem(sys)
    ? [
        { key: 'overview', labelKey: 'system' },
        { key: 'activity', labelKey: 'timeline' },
      ]
    : [
        { key: 'overview', labelKey: 'system' },
        { key: 'policy',   labelKey: 'policy' },
        { key: 'activity', labelKey: 'timeline' },
        { key: 'info',     labelKey: 'info' },
      ];
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════ */

export default function SystemDetail() {
  const { t } = useTranslation();
  useDataRefresh();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { systemId } = useParams();
  const { visibleSystems = [], setSelectedScope } = useUserContext() || {};
  const sys = getSystemById(systemId) || getSystemById('ct1');
  // Deep-link support — Alerts → History → tap event lands here with
  //   ?tab=activity&event=<eventId>
  // so the Timeline tab opens with that event pre-expanded.
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const focusEventId = searchParams.get('event');
  const [activeTab, setActiveTab] = useState(initialTab);
  const tenant = isTenantSystem(sys);
  const isSingleTenantHome = tenant && visibleSystems.length === 1;
  const tabs = getTabsForSystem(sys);

  // ── Implicit single-system scope (locked 2026-06-15) ─────────────────────
  // Being on /system/<id> = the user's focus is THIS one system. Set the
  // global selectedScope to a single-system scope so that when the user taps
  // Alerts (or Home) in the bottom TabBar, the next page is implicitly
  // scoped to just this device - NOT to the parent location they happened
  // to be drilled into earlier. Matches the locked rule "scope persists
  // across bottom-tab navigation" (PRD 02 § Bottom-tab tap NEVER mutates
  // scope) + "viewing a system = system is the implicit scope" (PRD 05).
  //
  // The drawer's location-highlight uses `selectedScope.id`; a system scope
  // carries `id: 'system-<id>'` which won't match any location TreeNode, so
  // there's no incorrect location highlight in the tree. The drawer's
  // SystemRow highlight is driven separately by the `currentSystemId` prop
  // (the URL param), which stays correct.
  useEffect(() => {
    if (!sys || !sys.id || !setSelectedScope) return;
    // ancestors is the location-name chain root-to-leaf - matches the shape
    // the drawer's handleView stores (string[]). ScopeHeader only reads
    // .length to derive how deep to slice the rendered breadcrumb.
    const ancestorNames = getAncestorScopes(sys).map(a => a.name);
    setSelectedScope({
      id: `system-${sys.id}`,
      name: sys.name,
      levelType: 'system',
      ancestors: ancestorNames,
      systems: [sys],
      systemIds: [sys.id],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys?.id]);

  // Tag bottom sheet handler — lifted from WaterEventDetailsWidget so the
  // Tag CTA on a "Water Event ended" push still works AFTER the widget has
  // been tombstoned (sys.alert = null on End of Leak). Reads ?action=tag
  // from the URL just like the widget did; this is the universal place
  // since the widget may not be on screen.
  const [pageTagSheetOpen, setPageTagSheetOpen] = useState(false);
  const [tagBumper, setTagBumper] = useState(0);
  useEffect(() => {
    if (searchParams.get('action') === 'tag') {
      setPageTagSheetOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  // bumper is just a re-render trigger; getTags is a stateless read
  // eslint-disable-next-line no-unused-vars
  const _tagRead = tagBumper;
  const currentTagList = sys && sys.id ? getTags(sys.id) : [];

  // Navigation drawer — opens automatically when navigated from the systems drawer
  const [drawerOpen, setDrawerOpen] = useState(() => {
    const flag = sessionStorage.getItem('pulse2-drawer-open');
    if (flag) { sessionStorage.removeItem('pulse2-drawer-open'); return true; }
    return false;
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
      background: WINT_SKY_SYSTEM_BG,
      backgroundSize: WINT_SKY_SYSTEM_BG_SIZE,
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'local',
    }}>
      {/* Header — Wint Sky System variant (ui-improvements-take-1, locked
          2026-06-10). Same wave SVG as Home but rendered at half opacity
          (0.05/0.03/0.02 vs Home's 0.10/0.06/0.04) so the System page reads
          as calmer / deeper-in-hierarchy without changing widget shapes.
          PipesHeader is transparent (glow=true); the page bg shows through. */}
      <PipesHeader glow={true}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px 0', gap: 10 }}>
          {!isSingleTenantHome && (
            // Tenants don't open the full navigation drawer — that surface is
            // built for fleet managers (account/region/building tree, favorites,
            // multi-issue health). Tenants navigate between their apartments via
            // the /tenant home page only; the "My properties" breadcrumb above
            // takes them there.
            <div onClick={tenant ? undefined : () => setDrawerOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: tenant ? 'default' : 'pointer' }}
              role={tenant ? undefined : 'button'}
              aria-label={tenant ? undefined : 'Switch system or location'}
              title={tenant ? undefined : 'Switch system or location'}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(11,149,248,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid rgba(11,149,248,0.20)',
              }}>
                <span className="material-symbols-outlined"
                  style={{ fontSize: 22, color: '#036AB5', fontVariationSettings: "'FILL' 1" }}>home_work</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Breadcrumb:
                     - Tenant + multi-apt → "My properties ›" (back to /tenant list).
                     - Tenant + 1 apt    → no crumb (nowhere to go back to).
                     - Non-tenant        → "My Systems › L1 › L2 › ..." chain.
                    stopPropagation so a crumb tap doesn't also open the drawer. */}
                {(() => {
                  const crumbStyle = { color: '#036AB5', textDecoration: 'underline', cursor: 'pointer' };
                  const sepStyle = { color: '#B8BCC4', margin: '0 4px' };

                  if (tenant) {
                    if (visibleSystems.length <= 1) return null;
                    return (
                      <div style={{ fontSize: 12, color: '#4A4F5A', lineHeight: 1.4, marginBottom: 2 }}>
                        <span
                          onClick={(e) => { e.stopPropagation(); navigate('/tenant'); }}
                          style={crumbStyle}
                        >My properties</span>
                        <span style={sepStyle}>›</span>
                      </div>
                    );
                  }

                  // Compact breadcrumb with ellipsis-collapsed middle.
                  // Visible-scope filtering: include any ancestor whose
                  // subtree contains AT LEAST ONE system the user can see.
                  // Previously used .every() which dropped account/country/
                  // region for narrow-scope users (Mark @ Tower One saw
                  // only "My Systems" with no path). Switched to .some()
                  // so the chain reflects the user's actual position even
                  // when their scope is narrow. 2026-06-13.
                  const visibleSystemIds = new Set(visibleSystems.map(s => s.id));
                  const allAncestors = getAncestorScopes(sys);
                  const ancestors = allAncestors.filter(a =>
                    Array.isArray(a.systemIds) &&
                    a.systemIds.length > 0 &&
                    a.systemIds.some(id => visibleSystemIds.has(id))
                  );
                  return (
                    <CompactBreadcrumb
                      ancestors={ancestors}
                      onClearScope={() => { setSelectedScope?.(null); navigate('/'); }}
                      onSelectAncestor={(a) => { setSelectedScope?.(a); navigate('/'); }}
                    />
                  );
                })()}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#14151A', letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sys.name}
                  </span>
                  {!tenant && (
                    <span className="material-symbols-outlined"
                      style={{ fontSize: 22, color: '#4A4F5A', flexShrink: 0, marginLeft: 2 }}>expand_more</span>
                  )}
                </div>
                {tenant && visibleSystems.length > 1 && (sys.l4Name || sys.l3Name) && (
                  <div style={{
                    fontSize: 13, fontWeight: 500, color: '#4A4F5A',
                    marginTop: 2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{sys.l4Name || sys.l3Name}</div>
                )}
              </div>
            </div>
          )}
          {isSingleTenantHome && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 18, fontWeight: 700, color: '#14151A', letterSpacing: '-0.3px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{sys.name}</div>
              {(sys.l4Name || sys.l3Name) && (
                <div style={{
                  fontSize: 13, fontWeight: 500, color: '#4A4F5A',
                  marginTop: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{sys.l4Name || sys.l3Name}</div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', overflowX: 'auto', padding: '8px 14px 0' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flexShrink: 0, padding: '8px 12px', textAlign: 'center', fontSize: 14,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? '#0B95F8' : '#717684',
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              borderBottom: activeTab === tab.key ? '2px solid #0B95F8' : '2px solid transparent',
              whiteSpace: 'nowrap',
            }}>{t(`system_detail.tabs.${tab.labelKey}`)}</button>
          ))}
        </div>
      </PipesHeader>

      {/* Sticky offline banners — phone (brown) and/or system (red). Locked
          2026-06-07 per PRD 12 § 1 + § 2. */}
      <OfflineStickyBanner sys={sys} />

      {activeTab === 'overview' && <OverviewTab sys={sys} navigate={navigate} />}
      {activeTab === 'policy' && <PolicyTab sys={sys} />}
      {activeTab === 'activity' && <ActivityTab sys={sys} focusEventId={focusEventId} />}
      {activeTab === 'info' && <SystemInfoTab sys={sys} />}

      <TabBar activeTab={isSingleTenantHome ? 'home' : 'systems'} />

      <NavigationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} currentSystemId={systemId}
        onSelectLocation={() => {
          // Drawer already set scope via setSelectedScope before calling
          // this; navigate to modern Home so the user sees their new scope.
          navigate('/');
        }}
      />

      {/* Page-level Tag sheet. Opens from ?action=tag in the URL (push
          notification deep-link). Lives here, not inside the Water Event
          widget, so it still opens AFTER End of Leak when the widget has
          been tombstoned. */}
      {pageTagSheetOpen && sys && sys.id && (
        <TagBottomSheet
          currentTags={currentTagList}
          onClose={() => setPageTagSheetOpen(false)}
          onAdd={(additions) => {
            additions.forEach(t => addTag(sys.id, { ...t, addedBy: getCurrentActor() }));
            setTagBumper(b => b + 1);
          }}
          onRemove={(i) => {
            removeTagAt(sys.id, i);
            setTagBumper(b => b + 1);
          }}
        />
      )}
    </div>
  );
}
