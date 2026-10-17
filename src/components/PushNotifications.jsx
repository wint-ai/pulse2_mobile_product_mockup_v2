// Push notification system — simulates Android/iOS notifications
// Lock screen: glance only, no action buttons (per agreed taxonomy).
// Shade: pulled-down notification tray with actions.
// Other-app heads-up: card with inline actions.
// In-app banner: top banner with actions.
//
// Action taxonomy by leak state:
//   Warning      → View · I'm on it · Ignore
//   Ongoing      → View · Dismiss
//   Shutoff (SO) → View · I'm on it
//   End of Leak  → Tag what it was · Dismiss
//
// Resolved-state reflection: investigating/ignored/tagged status is read from
// the same persistence stores LeakDetail uses — so an action taken on one
// surface (notification, alert detail) is reflected on the others.

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isInvestigating, getInvestigatingInfo, startInvestigating } from '../data/investigatingStore';
import { isIgnored, getIgnoredInfo } from '../data/ignoredIncidents';
import { hasTagFeedback } from '../data/eventFeedbackStore';
import { getCurrentActor, setCurrentActor } from '../data/currentUser';
import { subscribe as bridgeSubscribe, publish as bridgePublish, isRateLimited, getRateLimitReason, onRateLimitChange } from '../lib/pushBridge';
import { applyPushEvent, applyDemoReset } from '../lib/pushEvents';
import { useUserContext } from '../context/UserContext';
import { SYSTEMS } from '../data/systems';

// Build the payload the desktop /push-panel uses to scope its system picker
// to whatever persona the phone is currently logged in as.
//
// We CAP visibleSystemIds at 60 ids and signal truncation with `truncated:
// true`. The bridge is on ntfy.sh free tier (4KB per message, ~5 messages
// per hour per sender). A persona with 200 systems (Oren Tidhar) would
// blow past the size limit AND eat the hourly quota on just the persona
// handshake, leaving no budget for actual pushes. The pusher only needs
// enough ids to pick a system from a section dropdown.
function buildPhonePersonaEvent(persona) {
  if (!persona) return null;
  const allIds = SYSTEMS.filter(s => persona.systemFilter(s)).map(s => s.id);
  const MAX_IDS = 60;
  const ids = allIds.slice(0, MAX_IDS);
  return {
    type: 'phone-persona',
    payload: {
      persona: { id: persona.id, name: persona.name, role: persona.role },
      visibleSystemIds: ids,
      truncated: allIds.length > MAX_IDS,
      totalSystemCount: allIds.length,
      actor: getCurrentActor(),
    },
  };
}

// Throttle phone-persona broadcasts so we don't hammer ntfy.sh's rate
// limit (5 msgs/hour per sender on the free tier). Many React effects
// + bridge reconnects can fire phone-persona repeatedly otherwise.
let _lastPhonePersonaSig = '';
let _lastPhonePersonaTs = 0;
function publishPhonePersonaIfChanged(ev, publishFn) {
  if (!ev) return;
  // Compact signature: persona id + count is enough to detect actual change.
  const sig = `${ev.payload.persona.id}:${ev.payload.totalSystemCount}:${ev.payload.actor || ''}`;
  const now = Date.now();
  // Skip if same signature within 30 seconds (covers double-mount + onOpen
  // reconnect-storm scenarios).
  if (sig === _lastPhonePersonaSig && (now - _lastPhonePersonaTs) < 30_000) return;
  _lastPhonePersonaSig = sig;
  _lastPhonePersonaTs = now;
  publishFn(ev);
}

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pulse2-push') : null;
// Second instance, used by the bridge subscriber to deliver events into the
// local listener. A BroadcastChannel doesn't receive messages it sends itself,
// so posting from `channel` would no-op; posting from a sibling instance does.
const relayChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pulse2-push') : null;
const BASE = import.meta.env.BASE_URL;

// All push-event state mutation is delegated to applyPushEvent in
// src/lib/pushEvents.js - the single source of truth for what each push does
// to localStorage. This wrapper just routes meta events (actor-changed,
// demo-reset) and forwards everything else to applyPushEvent.
function applyDataLayerSideEffects(event) {
  if (!event) return;
  if (event.type === 'actor-changed' && event.actor) {
    setCurrentActor(event.actor);
    return;
  }
  if (event.type === 'demo-reset') {
    applyDemoReset();
    return;
  }
  applyPushEvent(event);
}

// ─── Per-state action map ───────────────────────────────────────────────────

// Action set per notification state - see src/utils/notificationActions.js
// (extracted so it can be unit-tested directly).
import { buildActions } from '../utils/notificationActions';

// ─── Action button strip ────────────────────────────────────────────────────

function NotifActions({ notification: n, onAction, dark = false }) {
  const sysId = n.systemId;
  const investigating = sysId ? isInvestigating(sysId) : false;
  const ignored = sysId ? isIgnored(sysId) : false;
  // The Tag CTA opens WaterEventFeedbackSheet (?action=tag -> SystemPageV2Screen),
  // which persists to eventFeedbackStore under its own namespaced key — not to
  // tagsStore, and not under the bare system id the ignore flow uses. Reading
  // anything else here leaves the push offering "Tag the cause" forever.
  const tagged = sysId ? hasTagFeedback(sysId) : false;
  const accentColor = n.severity === 'High Flow' ? '#DB4670' : '#F05C25';

  const actions = buildActions(n, { investigating, ignored, tagged });
  if (actions.length === 0) return null;

  // The Tag CTA on the Water Event ended push (PRD 15 § 7.1) gets a special
  // Wint accent blue treatment - brand-consistent and reads as inviting
  // rather than alarming. Other primary actions use the severity color.
  if (dark) {
    return (
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {actions.map(a => {
          const bg = a.tagCta
            ? 'linear-gradient(135deg, #0B95F8 0%, #036AB5 100%)'
            : a.primary ? accentColor : 'rgba(255,255,255,0.12)';
          return (
            <div key={a.key}
              onClick={(e) => { e.stopPropagation(); onAction(a.key, n); }}
              style={{
                flex: '1 1 0', minWidth: 80, padding: a.tagCta ? '11px 6px' : '8px 6px', borderRadius: 10, textAlign: 'center',
                background: bg,
                fontSize: a.tagCta ? 13 : 12, fontWeight: 800,
                color: a.done ? 'rgba(255,255,255,0.6)' : '#fff',
                cursor: 'pointer',
                boxShadow: a.tagCta ? '0 4px 10px rgba(11,149,248,0.30)' : 'none',
              }}>{a.label}</div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
      {actions.map(a => {
        const tagBlue = '#0B95F8';
        const color = a.tagCta ? '#fff' : a.primary ? accentColor : a.done ? '#5C9E1A' : '#717684';
        const background = a.tagCta
          ? 'linear-gradient(135deg, #0B95F8 0%, #036AB5 100%)'
          : a.primary ? `${accentColor}14` : 'transparent';
        return (
          <span key={a.key}
            onClick={(e) => { e.stopPropagation(); onAction(a.key, n); }}
            style={{
              fontSize: a.tagCta ? 13 : 13, fontWeight: a.tagCta ? 800 : 600,
              color,
              cursor: 'pointer', padding: a.tagCta ? '8px 14px' : '4px 8px', borderRadius: a.tagCta ? 8 : 6,
              background,
              boxShadow: a.tagCta ? `0 3px 8px ${tagBlue}33` : 'none',
            }}>{a.label}</span>
        );
      })}
    </div>
  );
}

// ─── Category icon — timeline-style 24×24 colored circle + Material glyph ──
//
// Replaces the V11 spec literal `💧 / ⚠ / ⚡ / 📵` emoji prefix that lived
// in the title text. Same visual pattern as Event Timeline rows in EventRow:
// 24×24 circle, white filled Material glyph, color per category. Keeps the
// app reading as one design language. The title text still arrives WITH the
// V11 emoji prefix (so the catalogue source-of-truth is unchanged); we strip
// the emoji at render time and substitute the circle.
//
// Mapping:
//   leak / leak-* / water-event   → water_drop  (color = severity-driven)
//   valve-error / sensor          → error / link_off / water_damage
//   power-lost / power-restored   → power_off / power
//   offline / online              → wifi_off / wifi
//
// Severe SO_* variants (SO_04/06/07/08/09) get the same circle but with the
// `warning` glyph instead of `water_drop`, to mirror V11's ⚠ vs 💧 distinction.

const LEADING_EMOJI_REGEX = /^[💧⚠⚡📵]\s+/u;

function stripLeadingEmoji(title) {
  if (!title) return title;
  return title.replace(LEADING_EMOJI_REGEX, '');
}

function getNotificationCategory(n) {
  const sev = n?.severity;
  const variantId = n?.v10_9_id || n?.variantId || '';
  const severeShutoff = /^SO_(04|06|07|08|09)$/.test(variantId);
  const severeValveErr = /^V_ER_(01|02|03|05)$/.test(variantId);
  const severeSensor = variantId === 'SEN_01' || variantId === 'SEN_03';

  // Water event family (leak)
  if (n?.type === 'leak' || /^(WA|OL|SO|LE)_/.test(variantId)) {
    const color = sev === 'Low Flow' ? '#F05C25' : '#DB4670';
    const glyph = severeShutoff ? 'warning' : 'water_drop';
    return { glyph, color };
  }
  // Valve errors
  if (n?.type === 'valve-error' || /^V_ER_/.test(variantId)) {
    return { glyph: severeValveErr ? 'warning' : 'check_circle', color: '#A5455E' };
  }
  // Sensors (valve/meter dis/reconnect)
  if (variantId === 'SEN_01' || variantId === 'SEN_03') {
    return { glyph: severeSensor ? 'warning' : 'link_off', color: '#717684' };
  }
  if (variantId === 'SEN_02') return { glyph: 'link',        color: '#5C9E1A' };
  if (variantId === 'SEN_04') return { glyph: 'water_drop',  color: '#5C9E1A' };
  // Power
  if (n?.type === 'power-lost')     return { glyph: 'power_off', color: '#B5651A' };
  if (n?.type === 'power-restored') return { glyph: 'power',     color: '#5C9E1A' };
  // Communication
  if (n?.type === 'offline') return { glyph: 'wifi_off', color: '#717684' };
  if (n?.type === 'online')  return { glyph: 'wifi',     color: '#5C9E1A' };
  // Fallback - matches the old default banner accent
  return { glyph: 'notifications', color: '#0B95F8' };
}

function CategoryCircle({ notification, size = 24, glyphSize = 14 }) {
  const { glyph, color } = getNotificationCategory(notification);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span className="material-symbols-outlined" style={{
        fontSize: glyphSize, color: '#fff', lineHeight: 1,
        fontVariationSettings: "'FILL' 1",
      }}>{glyph}</span>
    </div>
  );
}

// ─── Lock screen card (glance only — no action buttons) ─────────────────────

function LockCard({ notification: n, expanded, onToggleExpand }) {
  const isLeak = n.type === 'leak';
  const accentColor = isLeak ? (n.severity === 'High Flow' ? '#DB4670' : '#F05C25') : '#0B95F8';
  const timeStr = new Date(n.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const sysId = n.systemId;
  const investigating = sysId ? isInvestigating(sysId) : false;
  const investigatingInfo = sysId ? getInvestigatingInfo(sysId) : null;
  const ignored = sysId ? isIgnored(sysId) : false;
  const ignoredInfo = sysId ? getIgnoredInfo(sysId) : null;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)',
      borderRadius: 16, marginBottom: 8, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Top accent bar removed (Option A) - category circle carries severity. */}
      <div onClick={onToggleExpand} style={{ padding: '12px 14px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <img src={`${BASE}wint-logo.svg`} alt="" style={{ width: 22, height: 22, borderRadius: 6, background: '#fff', padding: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Wint</span>
          {investigating && <span style={{ fontSize: 10, fontWeight: 700, color: '#A1D246', background: 'rgba(161,210,70,0.18)', padding: '1px 6px', borderRadius: 4 }}>On it · {investigatingInfo?.actor || ''}</span>}
          {ignored && <span style={{ fontSize: 10, fontWeight: 700, color: '#E5A100', background: 'rgba(229,161,0,0.18)', padding: '1px 6px', borderRadius: 4 }}>Ignored · {ignoredInfo?.ignoredBy || ''}</span>}
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>{timeStr}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <CategoryCircle notification={n} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3 }}>{stripLeadingEmoji(n.title)}</div>
            {!expanded && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 3 }}>{n.body}</div>}
          </div>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '0 14px 12px' }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, marginBottom: 6 }}>{n.body}</div>
          {isLeak && (n.flowRate || n.volume || n.duration) && (
            <div style={{ display: 'flex', gap: 6 }}>
              {n.flowRate && <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}><div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{n.flowRate}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Flow rate</div></div>}
              {n.volume && <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}><div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{n.volume}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Volume</div></div>}
              {n.duration && <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}><div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{n.duration}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Duration</div></div>}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 10, textAlign: 'center' }}>
            Unlock to take action
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lock Screen ────────────────────────────────────────────────────────────

function PhoneLockScreen({ notifications, onUnlock, onPullShade }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    if (notifications.length > 0) setExpandedIdx(notifications.length - 1);
  }, [notifications.length]);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 300,
      background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, -apple-system, sans-serif', color: '#fff',
    }}>
      <div style={{ textAlign: 'center', paddingTop: 50, marginBottom: 20 }}>
        <div style={{ fontSize: 56, fontWeight: 200, letterSpacing: '-2px' }}>{timeStr}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{dateStr}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
        {notifications.length === 0 && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13, marginTop: 40 }}>No notifications</div>}
        {notifications.map((n, i) => (
          <LockCard key={i} notification={n} expanded={expandedIdx === i}
            onToggleExpand={() => setExpandedIdx(expandedIdx === i ? null : i)} />
        ))}
      </div>
      <div style={{ padding: '12px 0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        {notifications.length > 0 && (
          <div onClick={onPullShade} style={{
            fontSize: 11, color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            padding: '6px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>↓ Pull down for actions</div>
        )}
        <div onClick={onUnlock} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)' }}>lock_open</span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Tap to unlock</div>
      </div>
    </div>
  );
}

// ─── Notification Shade (pulled down — actions visible) ─────────────────────

function ShadeCard({ notification: n, onAction, version }) {
  const isLeak = n.type === 'leak';
  const accentColor = isLeak ? (n.severity === 'High Flow' ? '#DB4670' : '#F05C25') : '#0B95F8';
  const timeStr = new Date(n.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const sysId = n.systemId;
  const investigating = sysId ? isInvestigating(sysId) : false;
  const investigatingInfo = sysId ? getInvestigatingInfo(sysId) : null;
  const ignored = sysId ? isIgnored(sysId) : false;
  const ignoredInfo = sysId ? getIgnoredInfo(sysId) : null;
  void version;  // re-render trigger after action

  return (
    <div style={{
      background: 'rgba(40,42,54,0.92)', backdropFilter: 'blur(20px)',
      borderRadius: 14, marginBottom: 8, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Top accent bar removed (Option A) - category circle carries severity. */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <img src={`${BASE}wint-logo.svg`} alt="" style={{ width: 22, height: 22, borderRadius: 6, background: '#fff', padding: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Wint</span>
          {investigating && <span style={{ fontSize: 10, fontWeight: 700, color: '#A1D246', background: 'rgba(161,210,70,0.18)', padding: '1px 6px', borderRadius: 4 }}>Investigating</span>}
          {ignored && <span style={{ fontSize: 10, fontWeight: 700, color: '#E5A100', background: 'rgba(229,161,0,0.18)', padding: '1px 6px', borderRadius: 4 }}>Ignored</span>}
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>{timeStr}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <CategoryCircle notification={n} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{stripLeadingEmoji(n.title)}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, lineHeight: 1.4 }}>{n.body}</div>
          </div>
        </div>
        <NotifActions notification={n} onAction={onAction} dark />
      </div>
    </div>
  );
}

function PhoneShade({ notifications, onAction, onClose, version }) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 300,
      background: 'linear-gradient(180deg, rgba(15,20,35,0.96) 0%, rgba(15,20,35,0.85) 100%)',
      backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, -apple-system, sans-serif', color: '#fff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px 8px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{timeStr}</div>
        <div onClick={onClose} style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Close ✕</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px 20px' }}>
        {notifications.length === 0 && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13, marginTop: 40 }}>No notifications</div>}
        {notifications.map((n, i) => (
          <ShadeCard key={i} notification={n} onAction={onAction} version={version} />
        ))}
      </div>
    </div>
  );
}

// ─── In-App Banner ──────────────────────────────────────────────────────────

function InAppBanner({ notification: n, onAction, onDismiss, version }) {
  const [startY, setStartY] = useState(null);
  useEffect(() => { const t = setTimeout(onDismiss, 8000); return () => clearTimeout(t); }, [n, onDismiss]);
  void version;

  const isLeak = n.type === 'leak';
  const accentColor = isLeak ? (n.severity === 'High Flow' ? '#DB4670' : '#F05C25') : '#0B95F8';
  const sysId = n.systemId;
  const investigating = sysId ? isInvestigating(sysId) : false;
  const investigatingInfo = sysId ? getInvestigatingInfo(sysId) : null;
  const ignored = sysId ? isIgnored(sysId) : false;
  const ignoredInfo = sysId ? getIgnoredInfo(sysId) : null;

  return (
    <div onTouchStart={(e) => setStartY(e.touches[0].clientY)}
      onTouchEnd={(e) => { if (startY !== null && e.changedTouches[0].clientY < startY - 30) onDismiss(); setStartY(null); }}
      style={{ position: 'absolute', top: 6, left: 6, right: 6, zIndex: 250, animation: 'bannerIn 0.3s ease' }}>
      <style>{`@keyframes bannerIn { from { transform: translateY(-110%); } to { transform: translateY(0); } }`}</style>
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
        {/* Top accent bar removed (Option A) - category circle carries severity. */}
        <div style={{ padding: '10px 12px' }}>
          {/* Top row: Wint logo + name + status pill + timestamp. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <img src={`${BASE}wint-logo.svg`} alt="" style={{ width: 22, height: 22, borderRadius: 6, background: '#f0f5fa', padding: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#14151A' }}>Wint</span>
            {investigating && <span style={{ fontSize: 10, fontWeight: 700, color: '#4F8118', background: 'rgba(161,210,70,0.18)', padding: '1px 6px', borderRadius: 4 }}>On it · {investigatingInfo?.actor || ''}</span>}
            {ignored && <span style={{ fontSize: 10, fontWeight: 700, color: '#8C5A0F', background: 'rgba(229,161,0,0.18)', padding: '1px 6px', borderRadius: 4 }}>Ignored · {ignoredInfo?.ignoredBy || ''}</span>}
            <span style={{ fontSize: 11, color: '#9DA3AE', marginLeft: 'auto' }}>now</span>
          </div>
          {/* Title row: category circle + title text, mirroring timeline rows. */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <CategoryCircle notification={n} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#14151A', lineHeight: 1.3 }}>{stripLeadingEmoji(n.title)}</div>
              <div style={{
                fontSize: 13, color: '#717684', marginTop: 4, lineHeight: 1.45,
                // Full V11 body shown - no line clamp, no truncation. Banner
                // grows to fit. Auto-dismisses after 8s so the user has time to
                // read flow rate / volume / shutoff threshold.
                whiteSpace: 'normal', wordBreak: 'break-word',
              }}>{n.body}</div>
            </div>
          </div>
          <NotifActions notification={n} onAction={onAction} />
        </div>
      </div>
    </div>
  );
}

// ─── Other App Screen ───────────────────────────────────────────────────────

function OtherAppScreen({ headsUp, onAction, version }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 300, background: '#E8ECF0',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, -apple-system, sans-serif',
    }}>
      <div style={{ fontSize: 15, color: '#BCC3CE' }}>Another App</div>
      {headsUp && <HeadsUpNotification notification={headsUp} onAction={onAction} version={version} />}
    </div>
  );
}

function HeadsUpNotification({ notification: n, onAction, version }) {
  const isLeak = n.type === 'leak';
  const accentColor = isLeak ? (n.severity === 'High Flow' ? '#DB4670' : '#F05C25') : '#0B95F8';
  const sysId = n.systemId;
  const investigating = sysId ? isInvestigating(sysId) : false;
  const investigatingInfo = sysId ? getInvestigatingInfo(sysId) : null;
  const ignored = sysId ? isIgnored(sysId) : false;
  const ignoredInfo = sysId ? getIgnoredInfo(sysId) : null;
  void version;

  return (
    <div style={{ position: 'absolute', top: 30, left: 8, right: 8, zIndex: 350, animation: 'bannerIn 0.3s ease' }}>
      <div style={{
        background: '#fff', borderRadius: 18, overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        {/* Top accent bar removed - category circle below carries the
            severity signal (Option A — mirrors timeline anatomy). */}
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <img src={`${BASE}wint-logo.svg`} alt="" style={{ width: 20, height: 20, borderRadius: 5, background: '#f0f5fa', padding: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#14151A' }}>Wint</span>
            {investigating && <span style={{ fontSize: 10, fontWeight: 700, color: '#4F8118', background: 'rgba(161,210,70,0.18)', padding: '1px 6px', borderRadius: 4 }}>On it · {investigatingInfo?.actor || ''}</span>}
            {ignored && <span style={{ fontSize: 10, fontWeight: 700, color: '#8C5A0F', background: 'rgba(229,161,0,0.18)', padding: '1px 6px', borderRadius: 4 }}>Ignored · {ignoredInfo?.ignoredBy || ''}</span>}
            <span style={{ fontSize: 11, color: '#9DA3AE', marginLeft: 'auto' }}>now</span>
          </div>
          {/* Title row: category circle + title text, mirroring timeline rows. */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <CategoryCircle notification={n} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#14151A', lineHeight: 1.3 }}>{stripLeadingEmoji(n.title)}</div>
              <div style={{ fontSize: 13, color: '#717684', marginTop: 4, lineHeight: 1.4 }}>{n.body}</div>
            </div>
          </div>
          <NotifActions notification={n} onAction={onAction} />
        </div>
      </div>
    </div>
  );
}

// ─── Main wrapper ───────────────────────────────────────────────────────────

export default function PushNotifications({ children }) {
  const navigate = useNavigate();
  const [phoneState, setPhoneState] = useState('inapp');
  const [notifications, setNotifications] = useState([]);
  const [banner, setBanner] = useState(null);
  const [headsUp, setHeadsUp] = useState(null);
  const [version, setVersion] = useState(0);   // bump after store mutations to re-render reflection

  useEffect(() => {
    if (!channel) return;
    const handler = (e) => {
      const ev = e.data;
      const { type, payload } = ev;
      // IMPORTANT: this handler is UI-only - it does NOT mutate localStorage.
      // Why: same-browser tabs share localStorage, so the sender's local
      // apply is already visible here. The bridge subscriber (below) is the
      // only OTHER writer; for cross-device pushes it applies + relays to
      // this same channel so the UI updates the same way.
      if (type === 'lock-phone') { setPhoneState('locked'); setBanner(null); setHeadsUp(null); }
      else if (type === 'shade')      { setPhoneState('shade'); setBanner(null); setHeadsUp(null); }
      else if (type === 'other-app')  { setPhoneState('other-app'); setBanner(null); setNotifications([]); }
      else if (type === 'unlock-phone') { setPhoneState('inapp'); setNotifications([]); setHeadsUp(null); }
      else if (type === 'demo-reset' || type === 'actor-changed' || type === 'data-changed') {
        // Storage was already mutated by the sender / bridge. Just trigger
        // re-render so consumers re-read.
        setVersion(v => v + 1);
      }
      else if (type === 'push') {
        // Set the notification UI surface for whichever phoneState we're in.
        // localStorage is already updated by the sender (same-browser) or by
        // the bridge subscriber (cross-device).
        if (phoneState === 'locked' || phoneState === 'shade') setNotifications(prev => [...prev, payload]);
        else if (phoneState === 'other-app') setHeadsUp(payload);
        else setBanner(payload);
        setVersion(v => v + 1);
      }
    };
    channel.addEventListener('message', handler);
    return () => channel.removeEventListener('message', handler);
  }, [phoneState]);

  // Cross-tab: storage events fire when another tab mutates localStorage —
  // catches actor changes from the simulator, plus investigating/ignored/tag
  // mutations made from other open tabs.
  useEffect(() => {
    const onStorage = () => setVersion(v => v + 1);
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Cross-device: subscribe to the ntfy.sh bridge. Events from a desktop
  // /push-panel arrive here, get applied to the local data layer, and are
  // re-posted on the BroadcastChannel so the existing handler above picks
  // them up unchanged.
  //
  // The bridge also carries two metadata event types that don't get mirrored
  // to the local channel:
  //   - 'phone-persona-request' (from desktop): re-publish our persona scope
  //   - 'phone-persona'         (from another phone): ignore — for desktop only
  const userCtx = useUserContext() || {};
  const personaRef = useRef(userCtx.persona);
  useEffect(() => { personaRef.current = userCtx.persona; }, [userCtx.persona]);

  useEffect(() => {
    const unsub = bridgeSubscribe(
      (event) => {
        if (event.type === 'phone-persona-request') {
          // Desktop explicitly asked us to re-announce - honor it directly
          // (not throttled; this is an on-demand request).
          const ev = buildPhonePersonaEvent(personaRef.current);
          if (ev) bridgePublish(ev);
          return;
        }
        if (event.type === 'phone-persona') return;   // desktop-only metadata
        applyDataLayerSideEffects(event);
        if (relayChannel) relayChannel.postMessage(event);
        setVersion(v => v + 1);
      },
      {
        // Re-announce persona on (re)connect, BUT throttled so we don't
        // blow the ntfy.sh rate budget if the bridge flaps repeatedly.
        onOpen: () => {
          const ev = buildPhonePersonaEvent(personaRef.current);
          publishPhonePersonaIfChanged(ev, bridgePublish);
        },
      }
    );
    return () => unsub();
  }, []);

  // Whenever the phone's persona changes, announce the new scope to any
  // desktop /push-panel that's listening. Also fires on initial mount.
  // Throttled so a double-mount or rapid persona toggle doesn't burn the
  // ntfy.sh hourly quota.
  useEffect(() => {
    const ev = buildPhonePersonaEvent(userCtx.persona);
    publishPhonePersonaIfChanged(ev, bridgePublish);
  }, [userCtx.persona]);

  // Returns to app + clears all notification UI, then navigates. Auth state
  // is preserved — the user stays logged in unless they explicitly log out
  // (or sessionStorage is cleared by other means). The deep-link-via-login
  // path that used to fire here was simulating an OS cold-start, which is
  // unwanted friction for the working demo.
  const enterAppAndNavigate = useCallback((path) => {
    setPhoneState('inapp');
    setNotifications([]);
    setHeadsUp(null);
    setBanner(null);
    if (path) navigate(path);
  }, [navigate]);

  const handleAction = useCallback((action, n) => {
    const sysId = n.systemId;

    // Water-event lifecycle pushes all land on the System page (Overview).
    // The Water Event card + Valve widget there show the current state.
    // `?pulse=1` triggers a 2-second arrival pulse on the Water Event card so
    // the user immediately sees what their push referred to.
    if (action === 'view') {
      if (sysId) enterAppAndNavigate(`/system/${sysId}?pulse=1`);
      return;
    }

    if (action === 'investigate') {
      // Mark investigating in the shared store. Stay on current surface; bump
      // version so visible cards re-read state and reflect the change.
      if (sysId) startInvestigating(sysId, { actor: getCurrentActor() });
      setVersion(v => v + 1);
      return;
    }

    if (action === 'ignore') {
      // Ignore is irreversible + fires an IoT-device command. Open the System
      // page with ?action=ignore so the Water Event card's chip-based Ignore
      // bottom sheet auto-opens on arrival.
      if (sysId) enterAppAndNavigate(`/system/${sysId}?action=ignore&pulse=1`);
      return;
    }

    if (action === 'tag') {
      // Open System page with ?action=tag so the Tag bottom sheet auto-opens
      // on arrival (PRD 15 § 7.1).
      if (sysId) enterAppAndNavigate(`/system/${sysId}?action=tag&pulse=1`);
      return;
    }

    if (action === 'dismiss') {
      // Local-only: remove this push from the current surface. No server change.
      // Kept for back-compat; new action set doesn't use this on Ongoing /
      // End-of-Leak any more (swipe-to-dismiss is native).
      setNotifications(prev => prev.filter(p => p !== n));
      if (banner === n) setBanner(null);
      if (headsUp === n) setHeadsUp(null);
      return;
    }
  }, [enterAppAndNavigate, banner, headsUp]);

  const dismissBanner = useCallback(() => setBanner(null), []);

  // Rate-limit indicator on the phone side - small floating chip when the
  // ntfy bridge has returned 429 for our outgoing publishes (phone-persona
  // handshakes will hit it first). Tells the user pushes from a paired
  // laptop won't arrive until the quota resets.
  const [bridgeRateLimited, setBridgeRateLimited] = useState(() => isRateLimited());
  const [bridgeReason, setBridgeReason] = useState(() => getRateLimitReason());
  useEffect(() => onRateLimitChange((yes, reason) => {
    setBridgeRateLimited(yes);
    setBridgeReason(reason);
  }), []);

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {children}

      {bridgeRateLimited && (
        <div
          title={bridgeReason || 'Cross-device push relay throttled - pushes from a paired pusher may not arrive until ~midnight UTC.'}
          style={{
            position: 'absolute', top: 8, right: 8,
            zIndex: 400,
            padding: '4px 8px', borderRadius: 8,
            background: 'rgba(245,158,11,0.95)', color: '#fff',
            fontSize: 10, fontWeight: 700, letterSpacing: '.3px',
            boxShadow: '0 2px 6px rgba(0,0,0,.15)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>warning</span>
          BRIDGE THROTTLED
        </div>
      )}

      {phoneState === 'locked' && (
        <PhoneLockScreen notifications={notifications}
          onUnlock={() => { setPhoneState('inapp'); setNotifications([]); }}
          onPullShade={() => setPhoneState('shade')} />
      )}

      {phoneState === 'shade' && (
        <PhoneShade notifications={notifications} onAction={handleAction} version={version}
          onClose={() => setPhoneState('locked')} />
      )}

      {phoneState === 'other-app' && (
        <OtherAppScreen headsUp={headsUp} onAction={handleAction} version={version} />
      )}

      {phoneState === 'inapp' && banner && (
        <InAppBanner notification={banner} onAction={handleAction} onDismiss={dismissBanner} version={version} />
      )}
    </div>
  );
}
