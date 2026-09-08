// Push Simulator - the demo notification pusher.
//
// One pusher tool, accessed at /push. Old /control + /push-panel redirect here.
// Always publishes via BOTH ntfy.sh (for paired phones / cross-device) AND
// BroadcastChannel (for same-browser tabs - instant, no internet needed).
//
// Layout matches design-options/page-pusher-redesign.html v3 (see also
// public/reviews/pusher-redesign.html):
//   Top row: Push-as persona picker | QR pairing card
//   Section grids: Water Events / Valve / Power / Communication / Sensors
//   Each card has variant selector + configurable params + Fire button
//   Bottom row: Currently live + Recent fires
//
// V10.9 IDs sourced from src/data/pushCatalog.js. No invented labels.

import { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import { SYSTEMS } from '../data/systems';
import { PERSONAS, DEFAULT_PERSONA } from '../data/personas';
import { getSimulatedAlerts } from '../data/simulatedAlerts';
import { useUserContext } from '../context/UserContext';
import { publish as bridgePublish, getRoom, getOrCreatePusherRoom, isRateLimited, getRateLimitReason, onRateLimitChange } from '../lib/pushBridge';
import { applyPushEvent, applyDemoReset } from '../lib/pushEvents';
import { PUSH_SECTIONS, PUSH_CATALOG } from '../data/pushCatalog';

const channel = new BroadcastChannel('pulse2-push');

// ─── Helpers ────────────────────────────────────────────────────────────────

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function initials(name) {
  return (name || '?').split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

// ─── Notification text builders — V11.0 verbatim ───────────────────────────
// V11_TEMPLATES + buildPushText extracted to src/utils/pushText.js so unit
// tests can exercise them directly. See that file for the full catalogue.

import { buildPushText } from '../utils/pushText';


// Map a card's fireableType to (type, state, severity) on the push payload.
// All state-mutation is handled by applyPushEvent in src/lib/pushEvents.js -
// the sender's only job is to produce a payload and broadcast it.
function payloadMeta(card, variantId) {
  let type = card.fireableType;
  let state;
  let severity;
  if (card.fireableType === 'leak-warning')        { type = 'leak'; state = 'Warning'; }
  else if (card.fireableType === 'leak-ongoing')   { type = 'leak'; state = 'Ongoing'; }
  else if (card.fireableType === 'leak-shutoff')   { type = 'leak'; state = 'Shutoff'; }
  else if (card.fireableType === 'leak-ended')     { type = 'leak'; state = 'End of Leak'; }
  else if (card.fireableType === 'valve-closing' || card.fireableType === 'valve-closed-after-we') {
    // VC_S_02 / VC_OK_02 are Shutoff-phase sub-states, NOT closure pushes.
    // v10_9_id on the payload selects the sub-state.
    type = 'leak'; state = 'Shutoff';
  }
  if (type === 'leak') {
    severity = (variantId === 'WA_02' || variantId === 'OL_02_low') ? 'Low Flow' : 'High Flow';
  }
  return { type, state, severity };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ControlPanel({ title = 'Push Simulator' }) {
  const { persona, visibleSystems = [], setPersona } = useUserContext() || {};
  const allPersonas = useMemo(() => [DEFAULT_PERSONA, ...PERSONAS], []);
  // Each pusher generates its own unique ntfy.sh room (persisted in
  // localStorage) so concurrent users don't collide on the default
  // pulse2-demo topic and hit the free-tier rate limit.
  const pairCode = useMemo(() => getOrCreatePusherRoom(), []);

  // Rate-limit banner state.
  const [rateLimited, setRateLimited] = useState(() => isRateLimited());
  const [rateLimitReason, setRateLimitReason] = useState(() => getRateLimitReason());
  useEffect(() => onRateLimitChange((yes, reason) => {
    setRateLimited(yes);
    setRateLimitReason(reason);
  }), []);

  // Per-card state — variant id + params (initialized from defaults).
  const [cardState, setCardState] = useState(() => {
    const init = {};
    for (const card of PUSH_CATALOG) {
      init[card.id] = {
        variant: card.variants?.[0]?.id || card.id,
        params: Object.fromEntries((card.params || []).map(p => [p.key, p.default])),
      };
    }
    return init;
  });

  // Bump to re-derive 'Currently live' after firing.
  const [bump, setBump] = useState(0);
  const triggerRefresh = () => setBump(b => b + 1);
  // eslint-disable-next-line no-unused-vars
  const _bump = bump;
  // Recent fires log (in-component state, not persisted).
  const [recent, setRecent] = useState([]);

  // QR code data URL.
  // Always point at the deployed app's BASE_URL (the mockup root), NOT the
  // current pathname. The pusher is served at /push-panel and /control;
  // the QR target is the mockup itself with ?p=<pairCode> for pairing.
  // Vite's import.meta.env.BASE_URL resolves to '/pulse2_mobile_product_mockup_v2/'
  // in prod and '/' in dev — both correct.
  const [qrDataUrl, setQrDataUrl] = useState('');
  useEffect(() => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}?p=${encodeURIComponent(pairCode)}`;
    QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: '#14151A', light: '#fff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [pairCode]);

  // Stateless store - every read hits localStorage.
  const sims = getSimulatedAlerts();

  // ─── Per-section target system ──────────────────────────────────────────
  // All cards in a section target the SAME system, picked from a dropdown at
  // the top of the section. Storytelling: fire Warning -> Ongoing -> Shutoff
  // -> Event ended all on the same system. The Valve section additionally
  // filters to systems that have a valve installed.

  function sectionEligibleSystems(sectionName) {
    if (sectionName === 'Valve') return visibleSystems.filter(s => s.valve != null);
    return visibleSystems;
  }

  const [sectionSystemId, setSectionSystemId] = useState({});

  // Derive an effective system id per section: explicit pick if set, else
  // first eligible. Re-derives when persona changes (visibleSystems changes).
  const effectiveSectionSystem = useMemo(() => {
    const out = {};
    for (const section of PUSH_SECTIONS) {
      const eligible = sectionEligibleSystems(section.name);
      const explicit = sectionSystemId[section.name];
      const pick = (explicit && eligible.find(s => s.id === explicit)) || eligible[0] || null;
      out[section.name] = pick;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSystems, sectionSystemId]);

  // ─── Fire logic ──────────────────────────────────────────────────────────
  //
  // Single source of truth: applyPushEvent (src/lib/pushEvents.js) is the
  // ONLY thing that writes to localStorage in response to a push. The sender
  // calls it locally for its own UI then broadcasts the same payload over
  // BroadcastChannel + ntfy.sh. Receivers (PushNotifications.jsx) call the
  // same function on incoming events. No drift, ever.

  function publish(event) {
    // Local apply for the sender's own tab (drives 'Currently live' here).
    applyPushEvent(event);
    // Same-browser other tabs:
    channel.postMessage(event);
    // Cross-device:
    bridgePublish(event, pairCode);
  }

  function fireCard(card) {
    const sys = effectiveSectionSystem[card.section];
    if (!sys) return;
    const st = cardState[card.id];
    const variantId = st.variant;
    const paramValues = st.params || {};
    const siteName = sys.l4Name || sys.l3Name || sys.l2Name || '';
    const { title: t, body, action } = buildPushText(card, variantId, sys, paramValues, { persona });
    const { type, state, severity } = payloadMeta(card, variantId);

    const payload = {
      type, state, severity,
      v10_9_id: variantId,
      systemId: sys.id,
      systemName: sys.name,
      site: siteName,
      title: t,
      body,
      action,
      icon: card.glyph,
      flowRate: paramValues.flowRate,
      volume:   paramValues.volume,
      duration: paramValues.duration,
      timestamp: new Date().toISOString(),
    };

    publish({ type: 'push', payload });
    // Bump UI listeners that don't subscribe to storage events directly.
    publish({ type: 'data-changed' });

    setRecent(prev => [
      { ts: nowHHMM(), cardId: card.id, variantId, systemName: sys.name, label: card.label },
      ...prev,
    ].slice(0, 8));
    triggerRefresh();
  }

  function clearOne(systemId) {
    // Publish a synthetic 'online' push for this system - it goes through
    // applyPushEvent which clears the sim alert. One code path for clears.
    publish({ type: 'push', payload: { type: 'online', systemId } });
    publish({ type: 'data-changed' });
    triggerRefresh();
  }

  function clearAll() {
    // Local + cross-device demo reset. applyDemoReset locally wipes our
    // stores; broadcasting demo-reset makes paired phones do the same.
    applyDemoReset();
    channel.postMessage({ type: 'demo-reset' });
    bridgePublish({ type: 'demo-reset' }, pairCode);
    publish({ type: 'data-changed' });
    triggerRefresh();
  }

  // ─── Styles ──────────────────────────────────────────────────────────────
  const styles = {
    page: { minHeight: '100vh', background: '#E8ECF0', padding: '24px 28px 80px', fontFamily: 'Inter, -apple-system, sans-serif', color: '#14151A' },
    container: { maxWidth: 1180, margin: '0 auto' },

    h1Row: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18, justifyContent: 'space-between' },
    h1: { fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', margin: 0 },
    h1Sub: { fontSize: 13, color: '#717684' },

    topRow: { display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14, marginBottom: 18 },
    card: { background: '#fff', border: '1px solid #E8EAED', borderRadius: 12, padding: 16, position: 'relative' },
    cardTitle: { fontSize: 11, fontWeight: 700, color: '#717684', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 },

    // Numbered step badge for the pairing -> persona testing flow.
    stepBadge: {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 22, height: 22, borderRadius: '50%',
      background: '#0B95F8', color: '#fff',
      fontSize: 12, fontWeight: 800,
      marginRight: 8,
    },
    stepCardTitleRow: { display: 'flex', alignItems: 'center', marginBottom: 10 },
    stepHint: { fontSize: 11, color: '#4A4F5A', marginTop: 8, fontStyle: 'italic' },

    pickerRow: { display: 'flex', alignItems: 'center', gap: 12 },
    avatar: (p) => ({
      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
      background: p.bg || '#E8EAED', color: p.color || '#14151A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 700,
      border: `2px solid ${p.color || '#DEE0E3'}40`,
    }),
    personaSelect: {
      flex: 1, padding: '10px 14px', border: '1px solid #DEE0E3', borderRadius: 8,
      fontSize: 14, fontWeight: 600, color: '#14151A',
      background: '#fff', fontFamily: 'inherit', cursor: 'pointer',
    },
    pickerSub: { fontSize: 12, color: '#4A4F5A', marginTop: 8 },
    pickerHint: { fontSize: 11, color: '#5C9E1A', fontWeight: 600, marginTop: 6 },

    pairContent: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'center' },
    qrBox: { width: 110, height: 110, background: '#fff', border: '1px solid #DEE0E3', borderRadius: 8, padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    pairCodeChip: { background: '#14151A', color: '#fff', fontFamily: 'SF Mono, Menlo, monospace', fontWeight: 700, fontSize: 18, letterSpacing: 1.5, padding: '6px 12px', borderRadius: 6, display: 'inline-block', marginBottom: 6 },
    pairUrl: { fontSize: 11, color: '#0B95F8', fontFamily: 'SF Mono, Menlo, monospace', marginBottom: 8, wordBreak: 'break-all', textDecoration: 'underline', cursor: 'pointer', display: 'inline-block' },
    pairStatus: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 6, background: 'rgba(92,158,26,0.16)', color: '#2F6112', fontSize: 11.5, fontWeight: 600 },
    pairStatusDot: { width: 8, height: 8, borderRadius: '50%', background: '#5C9E1A' },

    secHead: { display: 'flex', alignItems: 'center', gap: 8, margin: '22px 0 10px', flexWrap: 'wrap' },
    secTitle: { fontSize: 13, fontWeight: 800, color: '#14151A' },
    secTag: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#717684', background: '#E8EAED', padding: '2px 7px', borderRadius: 4 },
    secSystemPicker: { display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' },
    secSystemLabel: { fontSize: 11, color: '#717684', fontWeight: 600 },
    selectWrap: { position: 'relative', display: 'block', flex: '1 1 auto', minWidth: 0, maxWidth: 260 },
    selectWrapInline: { position: 'relative', display: 'block', flex: '1 1 0%', minWidth: 0 },
    selectCaret: {
      position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
      fontSize: 10, color: '#717684', pointerEvents: 'none', fontWeight: 700,
    },
    secSystemSelect: {
      width: '100%', boxSizing: 'border-box',
      padding: '5px 26px 5px 10px',
      border: '1px solid #DEE0E3', borderRadius: 6,
      fontSize: 12, fontWeight: 600, color: '#14151A',
      background: '#fff', fontFamily: 'inherit', cursor: 'pointer',
      appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
      outline: 'none',
    },
    secSystemEmpty: { fontSize: 11, color: '#9DA3AE', fontStyle: 'italic', marginLeft: 'auto' },

    pushGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 },
    pc: (tint, disabled) => ({
      background: '#fff', border: '1px solid #E8EAED',
      borderLeft: `4px solid ${tint}`,
      borderRadius: 10, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 8,
      opacity: disabled ? 0.55 : 1,
      // Card clips any descendant overflow so a wide <select>'s natural
      // option width can't break the card layout.
      overflow: 'hidden',
      minWidth: 0,
    }),
    pcHead: { display: 'flex', alignItems: 'flex-start', gap: 8 },
    pcIcon: (tint) => ({
      width: 26, height: 26, borderRadius: 7, flexShrink: 0,
      background: tint + '1A', color: tint,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 15, fontVariationSettings: "'FILL' 1",
    }),
    pcId: { fontSize: 10, fontWeight: 700, color: '#9DA3AE', letterSpacing: '.5px' },
    pcLabel: { fontSize: 13, fontWeight: 700, color: '#14151A', lineHeight: 1.25 },
    pcTarget: { fontSize: 12, color: '#4A4F5A' },
    pcTargetSite: { color: '#9DA3AE', fontSize: 11 },
    pcEmpty: { fontSize: 11, color: '#9DA3AE', fontStyle: 'italic' },
    pcParams: { background: '#F5F6F8', borderRadius: 6, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
    pcParamRow: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, justifyContent: 'space-between' },
    pcParamLabel: { fontSize: 11, color: '#717684', fontWeight: 600, flex: '0 0 auto' },
    pcParamInput: { width: 100, padding: '3px 8px', border: '1px solid #DEE0E3', borderRadius: 5, fontSize: 11.5, fontWeight: 600, color: '#14151A', textAlign: 'right', background: '#fff', fontFamily: 'SF Mono, Menlo, monospace' },
    pcParamSelect: {
      width: '100%', boxSizing: 'border-box',
      padding: '6px 26px 6px 8px',
      border: '1px solid #DEE0E3', borderRadius: 5,
      fontSize: 11, fontWeight: 600, color: '#14151A',
      background: '#fff', fontFamily: 'inherit', cursor: 'pointer',
      // Remove the browser's native dropdown arrow (it renders as a clipped
      // horizontal line at short heights). A custom caret is drawn by the
      // parent wrapper as an absolutely-positioned span.
      appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
      outline: 'none',
    },
    pcFire: (tint, disabled) => ({
      padding: 8, border: 'none', borderRadius: 7,
      background: disabled ? '#E8EAED' : tint, color: disabled ? '#9DA3AE' : '#fff',
      fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      marginTop: 2,
    }),

    lowerRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 22 },
    liveCard: { background: '#fff', border: '1px solid #E8EAED', borderRadius: 12, padding: '14px 16px' },
    liveCardTitle: { fontSize: 11, fontWeight: 700, color: '#717684', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 },
    liveRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #F0F2F5' },
    liveTime: { fontSize: 11, color: '#717684', minWidth: 44, fontFamily: 'SF Mono, Menlo, monospace' },
    liveDetail: { flex: 1, fontSize: 12, color: '#14151A' },
    rowAction: { padding: '4px 9px', borderRadius: 6, border: '1px solid #DEE0E3', background: '#fff', fontSize: 11, fontWeight: 600, color: '#4A4F5A', cursor: 'pointer', fontFamily: 'inherit' },

    footerBar: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 24, flexWrap: 'wrap' },
    footerBtnDanger: { padding: '7px 12px', borderRadius: 8, border: '1px solid #A5455E', background: 'rgba(165,69,94,0.06)', color: '#A5455E', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' },
  };

  const livIds = Object.keys(sims);
  const currentPersona = persona || DEFAULT_PERSONA;
  const pairUrl = `${window.location.origin}${window.location.pathname.replace(/\/push$/, '/')}?p=${pairCode}`;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Rate-limit banner - shown when ntfy.sh returned 429 (free-tier
            daily quota reached). Sticky until a successful publish goes
            through (which clears the flag automatically). */}
        {rateLimited && (
          <div style={{
            marginBottom: 14,
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid #f59e0b',
            color: '#92400e',
            fontSize: 13,
            lineHeight: 1.5,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#f59e0b', marginTop: 1 }}>warning</span>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Cross-device push relay throttled</div>
              <div>{rateLimitReason || 'ntfy.sh free-tier daily message quota reached. Pushes will not reach paired phones until ~midnight UTC.'}</div>
              <div style={{ marginTop: 6, color: '#78350f' }}>
                <b>Workaround:</b> open the app in another tab on this same laptop (instead of a paired phone). Same-browser push delivery uses BroadcastChannel and isn't affected by the ntfy limit.
              </div>
            </div>
          </div>
        )}


        {/* Header */}
        <div style={styles.h1Row}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={styles.h1}>{title}</h1>
            <span style={styles.h1Sub}>Fire any push notification into a paired phone</span>
          </div>
          <button style={styles.footerBtnDanger} onClick={clearAll} title="Wipes all simulator state AND hides the pre-populated mock alerts / incidents / history, so every system reads as clean. New pushes still work on top.">🗑 Clear all — fleet starts clean</button>
        </div>

        {/* Top row: numbered testing flow - step 1 (pair phone) then step 2 (pick profile) */}
        <div style={styles.topRow}>
          {/* STEP 1 - Pairing card (left, bigger) */}
          <div style={styles.card}>
            <div style={styles.stepCardTitleRow}>
              <span style={styles.stepBadge}>1</span>
              <div style={styles.cardTitle}>Pair your phone</div>
            </div>
            <div style={styles.pairContent}>
              <div style={styles.qrBox}>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Pairing QR" style={{ width: '100%', height: '100%' }} />
                ) : (
                  <span style={{ fontSize: 10, color: '#9DA3AE' }}>generating QR…</span>
                )}
              </div>
              <div>
                <div style={styles.pairCodeChip}>{pairCode}</div>
                <a href={pairUrl} target="_blank" rel="noopener noreferrer" style={styles.pairUrl} title="Open the paired phone view in a new tab">
                  {pairUrl.replace(/^https?:\/\//, '')}
                </a>
                <div style={styles.pairStatus}>
                  <span style={styles.pairStatusDot}></span>Channel ready
                </div>
              </div>
            </div>
            <div style={styles.stepHint}>Scan with your phone camera to receive pushes from this pusher.</div>
          </div>

          {/* STEP 2 - Push as (right) */}
          <div style={styles.card}>
            <div style={styles.stepCardTitleRow}>
              <span style={styles.stepBadge}>2</span>
              <div style={styles.cardTitle}>Choose the profile</div>
            </div>
            <div style={styles.pickerRow}>
              <div style={styles.avatar(currentPersona)}>{currentPersona.icon || initials(currentPersona.name)}</div>
              <select
                style={styles.personaSelect}
                value={currentPersona.id}
                onChange={(e) => {
                  const p = allPersonas.find(x => x.id === e.target.value);
                  if (p && setPersona) setPersona(p);
                }}
              >
                {allPersonas.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - {p.role}</option>
                ))}
              </select>
            </div>
            <div style={styles.pickerSub}>
              <strong>{visibleSystems.length} system{visibleSystems.length === 1 ? '' : 's'}</strong> in scope
            </div>
            <div style={styles.stepHint}>Pick the same profile on your paired phone so identity matches here and there.</div>
          </div>
        </div>

        {/* Push card sections */}
        {PUSH_SECTIONS.map(section => {
          const eligible = sectionEligibleSystems(section.name);
          const sectSys = effectiveSectionSystem[section.name];
          return (
          <div key={section.name}>
            <div style={styles.secHead}>
              <div style={styles.secTitle}>{section.name}</div>
              <div style={styles.secTag}>{section.cards.length} card{section.cards.length === 1 ? '' : 's'}</div>
              {/* Section system picker — all cards in this section fire on this system */}
              {eligible.length > 0 ? (
                <div style={styles.secSystemPicker}>
                  <span style={styles.secSystemLabel}>on</span>
                  <div style={styles.selectWrap}>
                    <select
                      value={sectSys?.id || ''}
                      onChange={(e) => setSectionSystemId(prev => ({ ...prev, [section.name]: e.target.value }))}
                      style={styles.secSystemSelect}
                    >
                      {eligible.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.l4Name ? `· ${s.l4Name}` : ''}
                        </option>
                      ))}
                    </select>
                    <span style={styles.selectCaret}>▾</span>
                  </div>
                </div>
              ) : (
                <span style={styles.secSystemEmpty}>No eligible system in scope</span>
              )}
            </div>
            <div style={styles.pushGrid}>
              {section.cards.map(card => {
                const sys = sectSys;
                const disabled = !sys;
                const st = cardState[card.id];
                return (
                  <div key={card.id} style={styles.pc(card.tint, disabled)}>
                    <div style={styles.pcHead}>
                      <span style={styles.pcIcon(card.tint)} className="material-symbols-outlined">{card.glyph}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={styles.pcId}>{card.id}</div>
                        <div style={styles.pcLabel}>{card.label}</div>
                      </div>
                    </div>
                    {sys ? (
                      <div style={styles.pcTarget}>
                        <strong>{sys.name}</strong><br />
                        <span style={styles.pcTargetSite}>{sys.l4Name || sys.l3Name || ''}</span>
                      </div>
                    ) : (
                      <div style={styles.pcEmpty}>No eligible system in this persona's scope.</div>
                    )}

                    {(card.variants || card.params) && (
                      <div style={styles.pcParams}>
                        {card.variants && (
                          <div style={styles.pcParamRow}>
                            <div style={styles.pcParamLabel}>Variant</div>
                            <div style={styles.selectWrapInline}>
                              <select
                                style={styles.pcParamSelect}
                                value={st.variant}
                                onChange={(e) => setCardState(prev => ({ ...prev, [card.id]: { ...prev[card.id], variant: e.target.value } }))}
                              >
                                {card.variants.map(v => (
                                  <option key={v.id} value={v.id}>{v.label}</option>
                                ))}
                              </select>
                              <span style={styles.selectCaret}>▾</span>
                            </div>
                          </div>
                        )}
                        {(card.params || []).map(p => (
                          <div key={p.key} style={styles.pcParamRow}>
                            <div style={styles.pcParamLabel}>{p.label}</div>
                            <input
                              style={styles.pcParamInput}
                              value={st.params?.[p.key] || ''}
                              onChange={(e) => setCardState(prev => ({
                                ...prev,
                                [card.id]: { ...prev[card.id], params: { ...prev[card.id].params, [p.key]: e.target.value } },
                              }))}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      style={styles.pcFire(card.tint, disabled)}
                      disabled={disabled}
                      onClick={() => fireCard(card)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>play_arrow</span>Fire
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}

        {/* Currently live + Recent */}
        <div style={styles.lowerRow}>
          <div style={styles.liveCard}>
            <div style={styles.liveCardTitle}>🟢 Currently live ({livIds.length})</div>
            {livIds.length === 0 ? (
              <div style={{ fontSize: 12, color: '#9DA3AE', fontStyle: 'italic' }}>No simulated alerts persisted. Fire one above.</div>
            ) : (
              livIds.map(id => {
                const sys = SYSTEMS.find(x => x.id === id);
                const a = sims[id];
                const inScope = visibleSystems.some(x => x.id === id);
                return (
                  <div key={id} style={styles.liveRow}>
                    <div style={styles.liveDetail}>
                      <strong>{sys?.name || id}</strong> · {a.type}{a.flowRate ? ` · ${a.flowRate}` : ''}{a.startedAt ? ` · @${a.startedAt}` : ''}
                      {!inScope && <span style={{ color: '#B57100', marginLeft: 6, fontSize: 10, fontWeight: 700 }}>OUT OF SCOPE</span>}
                    </div>
                    <button style={styles.rowAction} onClick={() => clearOne(id)}>🗑 Clear</button>
                  </div>
                );
              })
            )}
          </div>
          <div style={styles.liveCard}>
            <div style={styles.liveCardTitle}>📜 Recent fires (last {recent.length || 0})</div>
            {recent.length === 0 ? (
              <div style={{ fontSize: 12, color: '#9DA3AE', fontStyle: 'italic' }}>Nothing fired yet this session.</div>
            ) : (
              recent.map((r, i) => (
                <div key={i} style={{ ...styles.liveRow, borderBottom: i === recent.length - 1 ? 'none' : '1px solid #F0F2F5' }}>
                  <div style={styles.liveTime}>{r.ts}</div>
                  <div style={styles.liveDetail}>{r.variantId} → <strong>{r.systemName}</strong></div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
