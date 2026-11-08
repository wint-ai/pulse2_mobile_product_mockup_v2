import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { getActivePolicy } from '../data/systemDetails';

// Design tokens — sourced from public/reviews/tokens.css (Tokens Studio for Figma export).
//
// 3-color palette locked 2026-06-08 (round 6):
//   - neutral: Open / Closed / Opening / Closing / Verifying — every position
//     state. Motion is conveyed by the spinner + label change, not by hue.
//   - warn (dark orange): Auto-shutoff DISABLED sub-line only. Caution, not error.
//   - error (red): Middle / Unknown / Disconnected / Open(?) / Closed(?) /
//     indicator failures — anything actually broken.
// Removed from the widget chrome: green for "Open is good", amber for "in motion",
// brand-blue for "Verifying". Brand blue stays on the action buttons only.
const BRAND = {
  // Position state colors (icon-circle tint + glyph color)
  neutral: '#7a8189', neutralBg: 'rgba(122,129,137,0.14)',   // every position state
  warn:    '#B85C00', warnBg:    'rgba(184,92,0,0.10)',      // Auto-shutoff disabled sub-line
  blue:    '#0b95f8', blueBg:    'rgba(11,149,248,0.12)',    // action buttons (Open / Close primary CTA)
  blueDeep:'#0978c6',                                        // action button hover
  error:   '#a5455e', errorBg:   'rgba(165,69,94,0.12)',     // Middle/Unknown/Disconnected/indicator errors
  /* ── Text + surfaces — THE ONLY SEVEN THAT MOVE WITH THE THEME ───────
     Measured 2026-11-08: under [data-theme=dark] this card rendered a pure
     #ffffff slab with #1a1d20 ink on it, on an otherwise near-black /leak
     screen -- the single remaining light slab in the app after the v1
     theme bridge landed. The comments beside each line already said these
     were "tokens"; they simply had no token to be.

     --v1-valve-* are declared in src/index.css with these EXACT hexes in
     :root, so `light`, `sand` and `contrast` render byte-for-byte what
     they rendered before. Only `dark` restates them.

     The five hue entries above are NOT tokenised: neutral / warn / blue /
     error are the locked round-6 state vocabulary, and the 2026-06-08 note
     at the top of this file is a decision about which hue means what, not
     about which ground it sits on. They read on both. */
  navy: 'var(--v1-valve-ink)', body: 'var(--v1-valve-ink-body)', mute2: 'var(--v1-valve-ink-mute)',
  line: 'var(--v1-valve-line)', surface: 'var(--v1-valve-surface)', surfaceElev: 'var(--v1-valve-surface-elev)',
  disabled: 'var(--v1-valve-disabled)',                      // tokens: surface-disabled
  // Legacy aliases — kept for the StateBadge component's `check` variant only.
  // Not used in widget chrome.
  success: '#71c454', mute: '#7a8189', muteBg: 'rgba(122,129,137,0.14)',
};

function MIcon({ name, size = 22, color, fill = true, style = {} }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        color,
        fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0",
        lineHeight: 1,
        ...style,
      }}
    >{name}</span>
  );
}

function Spinner({ color, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'valveSpin 1s linear infinite' }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.5" opacity="0.2" />
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="16 48" strokeLinecap="round" />
    </svg>
  );
}

// State catalogue — mirrors the showcase exactly.
// Each entry returns: { iconBg, iconColor, glyph (or spinner), positionLabel, errorLabel, actions, progressBar }
//
// Glyphs follow the Timeline's Icon Bank (event-timeline-prd.html §2a):
// the `valve` glyph anchors EVERY valve state. State is conveyed by:
//   - icon-circle background color
//   - small badge overlay bottom-right ('lock'=closed, 'error'=!, 'check'=V)
//
// Spinners only for transient in-motion states (sending / closing / opening
// / verifying) - those have no Timeline equivalent.
//
// Returns: { iconBg, iconColor, glyph | spinner, badge?, positionLabel,
//            errorLabel, actions, actionsDisabled?, progressBar? }
// Position + error labels are stored as translation-key SUFFIXES; the
// component resolves them via t() at render time.
function getStateConfig(state) {
  switch (state) {
    // ─── Steady states (no error) — neutral chrome (locked round 6) ───
    case 'open':
      return { iconBg: BRAND.neutralBg, iconColor: BRAND.neutral, glyph: 'valve',
        positionKey: 'open', errorKey: null, actions: ['close'] };
    case 'closed':
      return { iconBg: BRAND.neutralBg, iconColor: BRAND.neutral, glyph: 'valve', badge: 'lock',
        positionKey: 'closed', errorKey: null, actions: ['open'] };

    // ─── Just-clicked (UI-only, waiting for device confirm) — neutral chrome,
    //     spinner conveys "sending" ───
    case 'sending-close':
      return { iconBg: BRAND.neutralBg, iconColor: BRAND.neutral, spinner: true, spinnerColor: BRAND.neutral,
        positionKey: 'sending_command', errorKey: null,
        actions: ['close'], actionsDisabled: true, progressBar: true };
    case 'sending-open':
      return { iconBg: BRAND.neutralBg, iconColor: BRAND.neutral, spinner: true, spinnerColor: BRAND.neutral,
        positionKey: 'sending_command', errorKey: null,
        actions: ['open'], actionsDisabled: true, progressBar: true };

    // ─── In-motion (device confirmed) — neutral chrome, spinner conveys motion ───
    case 'closing':
      return { iconBg: BRAND.neutralBg, iconColor: BRAND.neutral, spinner: true, spinnerColor: BRAND.neutral,
        positionKey: 'closing', errorKey: null,
        actions: ['open'], progressBar: true }; // reverse action so user can cancel
    case 'opening':
      return { iconBg: BRAND.neutralBg, iconColor: BRAND.neutral, spinner: true, spinnerColor: BRAND.neutral,
        positionKey: 'opening', errorKey: null,
        actions: ['close'], progressBar: true };
    case 'verifying':
      return { iconBg: BRAND.neutralBg, iconColor: BRAND.neutral, spinner: true, spinnerColor: BRAND.neutral,
        positionKey: 'verifying_no_flow', errorKey: null,
        actions: ['open'], progressBar: true };

    // ─── Always-paired-with-error per PRD §2.1 / §4.1 / §4.2 ───
    case 'middle':
      return { iconBg: BRAND.errorBg, iconColor: BRAND.error, glyph: 'valve', badge: 'error',
        positionKey: 'middle', errorKey: 'indicator_failure',
        actions: ['open', 'close'] };
    case 'unknown':
      return { iconBg: BRAND.errorBg, iconColor: BRAND.error, glyph: 'valve', badge: 'error',
        positionKey: 'unknown', errorKey: 'indicator_failure',
        actions: ['open', 'close'] };

    // ─── Open/Closed with error → "(?)" suffix per PRD §8.1.1 ───
    case 'open-error-flow':
      return { iconBg: BRAND.errorBg, iconColor: BRAND.error, glyph: 'valve', badge: 'error',
        positionKey: 'open_uncertain', errorKey: 'flow_detected',
        actions: ['close'] };
    case 'closed-error-flow':
      return { iconBg: BRAND.errorBg, iconColor: BRAND.error, glyph: 'valve', badge: 'error',
        positionKey: 'closed_uncertain', errorKey: 'flow_detected',
        actions: ['open'] };
    case 'open-error-indicator':
      return { iconBg: BRAND.errorBg, iconColor: BRAND.error, glyph: 'valve', badge: 'error',
        positionKey: 'open_uncertain', errorKey: 'indicator_failure_on_open',
        actions: ['close'] };
    case 'closed-error-indicator':
    case 'error':  // legacy generic — map to Closed + Indicator error
      return { iconBg: BRAND.errorBg, iconColor: BRAND.error, glyph: 'valve', badge: 'error',
        positionKey: 'closed_uncertain', errorKey: 'indicator_failure_on_close',
        actions: ['open'] };
    case 'open-error-unexpected':
      return { iconBg: BRAND.errorBg, iconColor: BRAND.error, glyph: 'valve', badge: 'error',
        positionKey: 'open_uncertain', errorKey: 'unexpected_position_change',
        actions: ['close'] };
    case 'closed-error-unexpected':
      return { iconBg: BRAND.errorBg, iconColor: BRAND.error, glyph: 'valve', badge: 'error',
        positionKey: 'closed_uncertain', errorKey: 'unexpected_position_change',
        actions: ['open'] };

    // ─── Disconnected — no actions per PRD §8.1 ───
    case 'disconnected':
      return { iconBg: BRAND.errorBg, iconColor: BRAND.error, glyph: 'valve', badge: 'error',
        positionKey: null, errorKey: 'disconnected', actions: [] };
    case 'verifying-disconnected':
      return { iconBg: BRAND.errorBg, iconColor: BRAND.error, spinner: true, spinnerColor: BRAND.error,
        positionKey: 'verifying_closed', errorKey: 'disconnected_verification_paused',
        actions: [], progressBar: true };

    default:
      return getStateConfig('closed');
  }
}

// Bottom-right state badge for the widget's icon-circle.
// Mirrors the Timeline badge convention so the two surfaces look identical.
//
//   'check' (resolved): WHITE bg + GREEN ring + GREEN ✓ - pops against any
//                       icon-circle bg (green-on-green was hard to read).
//   'lock'   (closed) : DARK navy bg + white lock glyph.
//   'error'           : RED bg + white ! glyph.
function StateBadge({ kind }) {
  if (!kind) return null;
  const isCheck = kind === 'check';
  const bg = kind === 'error' ? BRAND.error
           : kind === 'lock'  ? BRAND.navy
           : '#fff';
  const ring = isCheck ? BRAND.success : BRAND.surface;
  return (
    <div style={{
      position: 'absolute', right: -3, bottom: -3,
      width: 16, height: 16, borderRadius: '50%',
      background: bg,
      border: `2px solid ${ring}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {isCheck && <span style={{ color: BRAND.success, fontSize: 10, fontWeight: 900, lineHeight: 1 }}>✓</span>}
      {kind === 'error' && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900, lineHeight: 1 }}>!</span>}
      {kind === 'lock' && <MIcon name="lock" size={9} color="#fff" fill={true} />}
    </div>
  );
}

// Transient states are those the widget drives locally during an in-flight
// open/close action (the showcase's compressed timing). They override sys.valve
// only until the simulated transition completes; after that, the widget
// re-syncs to sys.valve. Steady states (open/closed/error/disconnected/etc.)
// always come from sys.valve so that Control-Panel mutations propagate.
const TRANSIENT_STATES = new Set([
  'sending-close', 'sending-open',
  'closing', 'opening', 'verifying',
]);

export default function ValveControlCard({ sys, tenantMode }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [valveState, setValveState] = useState(sys?.valve || 'closed');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  // Track the last sys.valve we synced from, so we can detect external changes
  // and refresh local state when no transition is in flight.
  const lastSyncedRef = useRef(sys?.valve);

  // Sync sys.valve → valveState whenever the prop changes AND we're not in
  // the middle of a local open/close transition. Without this, the widget
  // could render a stale steady-state (e.g. show 'open' after the data layer
  // already flipped the system to 'error').
  useEffect(() => {
    const next = sys?.valve || 'closed';
    if (lastSyncedRef.current === next) return;
    lastSyncedRef.current = next;
    if (!TRANSIENT_STATES.has(valveState)) {
      setValveState(next);
    }
  }, [sys?.valve, valveState]);

  // No valve installed → muted dashed-border placeholder per showcase
  // (previously returned null — but locked decision is to always show the placeholder)
  if (sys?.valve === null) {
    return (
      <div style={{
        background: BRAND.surfaceElev,
        borderRadius: 14,
        border: `1px dashed ${BRAND.line}`,
        marginBottom: 10,
        overflow: 'hidden',
      }}>
        <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: '#EFF2F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MIcon name="do_not_disturb_on" size={22} color={BRAND.mute2} fill={true} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.mute2 }}>Valve Status</div>
            <div style={{ fontSize: 14, color: BRAND.body, marginTop: 2 }}>No valve installed</div>
          </div>
        </div>
      </div>
    );
  }

  const vs = getStateConfig(valveState);
  // Offline override: when the system isn't communicating, we keep showing
  // the last-known valve state (glyph + position label) so the user has
  // context, but the Open/Close buttons are disabled - the commands
  // wouldn't reach the device. A line under the state spells out why.
  const isOffline = sys?.comm === 'offline' || sys?.offline === true;
  if (isOffline) vs.actionsDisabled = true;

  // Auto-shutoff policy — read from the active policy. 'Enabled' | 'Disabled'
  // (or 'N/A' on systems without a valve; that case never reaches here because
  // the no-valve placeholder above returns early). Display-only sub-line —
  // editing lives on the Policy tab.
  //
  // Tenant Home/Away override: on tenant systems, the Home/Away switch
  // directly drives the auto-shutoff policy. Away = Enabled (auto-close on
  // any Water Event because the tenant isn't there to react); Home = Disabled
  // (water flows normally; tenant gets an alert and decides). The switch
  // value comes in via the `tenantMode` prop from TenantOverview. Non-tenant
  // surfaces don't pass the prop and fall back to the policy schedule.
  const policy = sys?.id ? getActivePolicy(sys.id) : null;
  let autoShutoff = policy?.autoShutoff || null;
  if (tenantMode === 'home')  autoShutoff = 'Disabled';
  if (tenantMode === 'away')  autoShutoff = 'Enabled';

  const handleAction = (action) => {
    if (vs.actionsDisabled) return;
    setPendingAction(action);
    setShowConfirm(true);
  };

  // Execute the close/open flow with the showcase's compressed timing
  const executeAction = () => {
    setShowConfirm(false);
    if (pendingAction === 'close') {
      // Close: sending → closing → verifying → closed (matches PRD §4.1 sequence)
      // Verifying step holds longer (was 2.5s) — both because the simulator
      // moved too fast for reviewers to read the state, and because the real
      // device takes several seconds to confirm "no flow" after the valve closes.
      setValveState('sending-close');
      setTimeout(() => {
        setValveState('closing');
        setTimeout(() => {
          setValveState('verifying');
          setTimeout(() => setValveState('closed'), 6000);
        }, 1500);
      }, 1000);
    } else if (pendingAction === 'open') {
      // Open: sending → opening → open (no verify step per PRD §4.2)
      setValveState('sending-open');
      setTimeout(() => {
        setValveState('opening');
        setTimeout(() => setValveState('open'), 1500);
      }, 1000);
    }
  };

  const isMultiAction = vs.actions && vs.actions.length === 2;

  const renderActionButton = (action, compact = false) => {
    const label = t(`system_detail.valve_widget.actions.${action}`);
    const isDisabled = vs.actionsDisabled;
    return (
      <button
        key={action}
        onClick={() => handleAction(action)}
        disabled={isDisabled}
        style={{
          padding: compact ? '7px 12px' : '9px 16px',
          borderRadius: 12, border: 'none', flexShrink: 0,
          fontSize: compact ? 13 : 14, fontWeight: 600, color: '#fff',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          background: isDisabled ? BRAND.disabled : BRAND.blue,
          transition: 'background 100ms ease-out',
        }}
        onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.background = BRAND.blueDeep; }}
        onMouseLeave={e => { if (!isDisabled) e.currentTarget.style.background = BRAND.blue; }}
      >{label}</button>
    );
  };

  return (
    <>
      <style>{`
        @keyframes valveSpin { to { transform: rotate(360deg); } }
        @keyframes valveProgress { 0% { width: 0%; } 50% { width: 70%; } 100% { width: 100%; } }
      `}</style>

      <div style={{
        background: BRAND.surface,
        borderRadius: 14,
        border: `1px solid ${BRAND.line}`,
        marginBottom: 10,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(32,41,76,.05)',
      }}>
        <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Icon-circle - valve glyph + state badge (lock for closed, ! for
              error, ✓ for resolved). Same anatomy as the Timeline icons. */}
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: vs.iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            {vs.spinner
              ? <Spinner color={vs.spinnerColor || vs.iconColor} />
              : <MIcon name={vs.glyph} size={22} color={vs.iconColor} fill={true} />}
            <StateBadge kind={vs.badge} />
          </div>

          {/* Text — title + position + (optional) error */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.navy }}>{t('system_detail.valve_widget.title')}</div>
            {vs.positionKey && (
              <div style={{ fontSize: 14, color: BRAND.body, marginTop: 2, lineHeight: 1.4 }}>
                {t(`system_detail.valve_widget.position.${vs.positionKey}`)}
              </div>
            )}
            {vs.errorKey && (
              <div style={{ fontSize: 14, color: BRAND.error, fontWeight: 600, marginTop: 2, lineHeight: 1.4 }}>
                {t(`system_detail.valve_widget.errors.${vs.errorKey}`)}
              </div>
            )}
            {isOffline && (
              <div style={{ fontSize: 13, color: BRAND.mute2, marginTop: 4, lineHeight: 1.4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: BRAND.mute2, fontVariationSettings: "'FILL' 0" }}>wifi_off</span>
                {t('offline.system_offline')}
              </div>
            )}
            {/* Auto-shutoff policy indicator. Locked round 6:
                  Enabled = outlined shield + neutral grey text (the calm default).
                  Disabled = outlined shield + dark-orange text (caution stands out).
                Both use FILL=0 (outlined). Color is the only differentiator.
                Display-only; Policy tab is the source of truth for editing. */}
            {autoShutoff === 'Enabled' && (
              <div style={{ fontSize: 12.5, color: '#7a8189', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 5, lineHeight: 1.4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#7a8189', fontVariationSettings: "'FILL' 0", lineHeight: 1 }}>shield</span>
                {t('system_detail.valve_widget.auto_shutoff_enabled')}
              </div>
            )}
            {autoShutoff === 'Disabled' && (
              <div style={{ fontSize: 12.5, color: '#B85C00', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 5, lineHeight: 1.4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#B85C00', fontVariationSettings: "'FILL' 0", lineHeight: 1 }}>shield</span>
                {t('system_detail.valve_widget.auto_shutoff_disabled')}
              </div>
            )}
          </div>

          {/* Action button(s) */}
          {vs.actions && vs.actions.length > 0 && (
            isMultiAction ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {vs.actions.map(a => renderActionButton(a, true))}
              </div>
            ) : (
              renderActionButton(vs.actions[0])
            )
          )}
        </div>

        {vs.progressBar && (
          <div style={{ height: 3, background: vs.iconBg, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: vs.iconColor,
              borderRadius: 2,
              animation: 'valveProgress 2s ease-in-out infinite',
            }} />
          </div>
        )}
      </div>

      {/* Confirmation bottom sheet */}
      {showConfirm && (
        <div
          onClick={() => setShowConfirm(false)}
          style={{
            position: 'absolute', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: BRAND.surface,
              borderRadius: '20px 20px 0 0',
              padding: '8px 24px 24px',
              boxShadow: '0 -4px 24px rgba(32,41,76,.18)',
            }}
          >
            <div style={{
              width: 36, height: 4, background: BRAND.line, borderRadius: 2,
              margin: '0 auto 16px',
            }} />
            <div style={{
              fontSize: 18, fontWeight: 600, color: BRAND.navy,
              textAlign: 'center', marginBottom: 8, letterSpacing: '-0.01em',
            }}>
              {pendingAction === 'close' ? 'Close the valve?' : 'Open the valve?'}
            </div>
            <div style={{
              fontSize: 14, color: BRAND.body,
              textAlign: 'center', marginBottom: 24, lineHeight: 1.5,
            }}>
              {pendingAction === 'close'
                ? 'This will shut off water flow.'
                : 'Water flow will resume to this system.'}
            </div>
            <button
              onClick={executeAction}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
                fontSize: 16, fontWeight: 600, color: '#fff', cursor: 'pointer',
                fontFamily: 'inherit', background: BRAND.blue, marginBottom: 10,
              }}
            >
              {pendingAction === 'close' ? 'Yes, Close Valve' : 'Yes, Open Valve'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                background: BRAND.surfaceElev, fontSize: 16, fontWeight: 600,
                color: BRAND.navy, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
