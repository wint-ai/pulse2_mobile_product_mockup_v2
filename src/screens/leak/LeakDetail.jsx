import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import TabBar from '../../components/TabBar';
import LeakSummary from '../../components/LeakSummary';
import ValveControlCard from '../../components/ValveControlCard';
import ErrorAlertDetail from './ErrorAlertDetail';
import { useTheme } from '../../context/ThemeContext';
import { getSystemById, getSystemTz } from '../../data/systems';
import { getActiveIncident, getNotification, getLeakState } from '../../data/incidents';
import { getActivePolicy } from '../../data/systemDetails';
import { CURRENT_EVENTS } from '../../data/events';
import { isIgnored, getIgnoredInfo } from '../../data/ignoredIncidents';
import { isInvestigating, getInvestigatingInfo, startInvestigating, stopInvestigating } from '../../data/investigatingStore';
import { saveTag, getTag, getTags, addTag, removeTagAt } from '../../data/tagsStore';
import { getCurrentActor } from '../../data/currentUser';
import { useDataRefresh } from '../../utils/useDataRefresh';
import { IMPACT_BY_ID, SOURCE_BY_ID } from '../../data/tagTaxonomy';
import { parseEventInstant, formatDuration } from '../../utils/format';
import { getAncestorScopes } from '../../utils/ancestorScopes';
import { useUserContext } from '../../context/UserContext';
import TagBottomSheet from '../../components/TagBottomSheet';
import TagCelebration from '../../components/TagCelebration';

// Per-leak timeline step config. Locked decisions:
//   - Newest first
//   - No "Tagged" entry (tags live on the alert detail header pill)
//   - Reminders are cloud-driven and shown as their own entries
//   - All ownership transitions (On it / Stand down) are kept, never collapsed
// Step catalogue — anatomy + wording per PRD 11 Variant A + V10.9 catalogue.
// Reference: design-options/event-timeline-prd.html · public/reviews/event-timeline.html
// `title` is the default; for flow-aware events (detected / continues / ended),
// the high/low variant is resolved at render time from the leak context.
// tokens.css aligned colors (danger-main #a5455e · orange-main #f97316 · accent-main #0b95f8 ·
// success-main #71c454 · warning-main #f59e0b · text-tertiary #7a8189)
const STEP_CONFIG = {
  // Water lifecycle - all water_drop, color carries the phase.
  'detected':           { color: '#a5455e', icon: 'water_drop', title: 'Water Event detected', flowAware: true },
  'continues':          { color: '#f97316', icon: 'water_drop', title: 'Ongoing reminder', flowAware: true },
  'volume-milestone':   { color: '#f97316', icon: 'water_drop', title: 'Volume milestone' },
  'shutoff-threshold':  { color: '#a5455e', icon: 'water_drop', title: 'Shutoff level reached' },
  'leak-ended':         { color: '#71c454', icon: 'water_drop', title: 'Water event ended', flowAware: true },
  'resolved':           { color: '#71c454', icon: 'water_drop', title: 'Water event ended', flowAware: true },
  // Valve - same glyph as widget.
  'valve-closed':       { color: '#7a8189', icon: 'valve',      title: 'Valve closed' },
  'valve-closed-manual':{ color: '#7a8189', icon: 'valve',      title: 'Valve closed' },
  'valve-opened-manual':{ color: '#71c454', icon: 'valve',      title: 'Valve opened' },
  'valve-error':        { color: '#a5455e', icon: 'error',      title: 'Valve malfunction detected' },
  // Notification delivery.
  'alert-sent':         { color: '#0b95f8', icon: 'send',       title: 'Alert Sent' },
  'reminder-sent':      { color: '#0b95f8', icon: 'send',       title: 'Reminder sent' },
  // User actions - "On it" / "Stand down" use raised-hand glyph;
  // filled when claimed, outline when released. Ignored uses
  // notifications_off (user silenced the event).
  'on-it':              { color: '#0b95f8', icon: 'front_hand', title: 'On it' },
  'stand-down':         { color: '#7a8189', icon: 'front_hand', title: 'Stand down', iconFilled: false },
  'ignored':            { color: '#f59e0b', icon: 'notifications_off', title: 'Ignored' },
};

// Apply high/low flow variant to titles for water-event step types.
function resolveTitle(stepType, baseTitle, isLowFlow) {
  if (stepType === 'detected') return isLowFlow ? 'Low-flow Water Event detected' : 'High-flow Water Event detected';
  if (stepType === 'continues') return isLowFlow ? 'Ongoing low-flow reminder' : 'Ongoing high-flow reminder';
  if (stepType === 'leak-ended' || stepType === 'resolved') return isLowFlow ? 'Low-flow event ended' : 'High-flow event ended';
  return baseTitle;
}

// PRD 11 master table sub-text for per-Water-Event actor steps.
function actorStepSub(stepType, step, tag) {
  if (stepType === 'on-it') return 'Acknowledged — system behavior unchanged';
  if (stepType === 'stand-down') return 'Released ownership';
  if (stepType === 'ignored') {
    const tagSummary = step.tag || tag || 'no tag';
    return `${tagSummary} · auto-shutoff suppressed (irreversible)`;
  }
  return null;
}

const CHANNEL_LABEL = { push: 'Push', email: 'Email', sms: 'SMS' };

// Deterministic 4-digit leak id from incident.
// NO LONGER THE EVENT ID — 2026-11-04. `sys.alert.eventId` (buildEventRecord's
// `displayId('LK', id)`) is the one every other surface prints; this is kept
// only as the no-record fallback for an alert that carries no event record.
function toLeakId(incident) {
  if (!incident?.id) return null;
  let hash = 0;
  for (const c of incident.id) hash = (hash * 31 + c.charCodeAt(0)) % 10000;
  return `lk-${hash.toString().padStart(4, '0')}`;
}

function initialsFor(name) {
  return name.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

// Compose a chip-based summary "Chip - detail" / "Other-text" / "Chip" depending
// on what's filled in. Used by both the Tagged pill and the Ignored banner.
function composeChipSummary({ chip, chipOther, detail }) {
  const label = chip || chipOther;
  if (!label) return null;
  return detail ? `${label} - ${detail}` : label;
}

// Format the tag pill text. Handles both the new chip-based shape AND the legacy
// 3-step shape (for tags saved before 2026-06-02 that are still in localStorage).
function formatTagSummary(tag) {
  if (!tag) return null;
  // New chip-based shape wins if present.
  if (tag.chip || tag.chipOther) {
    return composeChipSummary(tag);
  }
  // Legacy 3-step shape: impact / source / where.
  return [
    tag.impact === 'other' && tag.impactOther
      ? `Other: ${tag.impactOther}`
      : IMPACT_BY_ID[tag.impact]?.label.split(' — ')[0],
    tag.source === 'other' && tag.sourceOther
      ? `Other: ${tag.sourceOther}`
      : SOURCE_BY_ID[tag.source]?.label.split(' (')[0],
    tag.where,
  ].filter(Boolean).join(' · ');
}

export default function LeakDetail() {
  useDataRefresh();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { systemId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const sys = getSystemById(systemId) || getSystemById('ct1');
  // Investigating state from persistence module
  const investigating = sys ? isInvestigating(sys.id) : false;
  const investigatingInfo = sys ? getInvestigatingInfo(sys.id) : null;
  const [, forceTick] = useState(0);  // forces re-read after toggle
  const [showTagSheet, setShowTagSheet] = useState(false);
  const [tagBumper, setTagBumper] = useState(0);  // forces re-read of getTag after save
  const [celebrationKey, setCelebrationKey] = useState(0);
  const { setSelectedScope } = useUserContext() || {};
  // Read ignored / tag state from persistence (reflects past actions).
  const ignored = sys ? isIgnored(sys.id) : false;
  const ignoredInfo = sys ? getIgnoredInfo(sys.id) : null;
  // 2026-06-04: multi-tag — getTag() now returns the FIRST tag (back-compat shim).
  // For the full list use getTags() from tagsStore.
  const tag = sys ? getTag(sys.id) : null;
  void tagBumper;  // referenced only to invalidate render

  // Deep-link from notification: ?action=tag opens the tag sheet. Strip the
  // param after handling so a refresh doesn't re-trigger.
  //
  // IGNORE RETIRED, 2026-10-31 (owner: "Retire them"). ?action=ignore used to
  // open v1's IgnoreBottomSheet from here. That path had no irreversibility
  // confirmation, no ShutOff gate (WaterEventFeedbackSheet.jsx:502 refuses
  // trigger="ignore" at eventState 'shutoff'; this screen would have taken it)
  // and never wrote eventFeedbackStore. Ignore now commits in exactly one
  // place: v2's WaterEventFeedbackSheet on /system/:systemId, which is where
  // the push's Ignore button already lands (PushNotifications.jsx:656), so no
  // live caller was sending this screen an ignore. The param is still stripped,
  // so a hand-pasted /alert/:id?action=ignore settles on the event with nothing
  // opened rather than on the retired sheet.
  useEffect(() => {
    const action = searchParams.get('action');
    if (!action) return;
    if (action === 'tag') setShowTagSheet(true);
    const next = new URLSearchParams(searchParams);
    next.delete('action');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Dispatch: non-water-event alerts get the simpler ErrorAlertDetail layout.
  const isWater = sys.alert?.type === 'leak-high' || sys.alert?.type === 'leak-low';
  if (sys.alert && !isWater) {
    return <ErrorAlertDetail sys={sys} />;
  }

  const activeIncident = getActiveIncident(sys.id);
  const leakState = getLeakState(activeIncident);
  const notification = getNotification(activeIncident);
  const event = CURRENT_EVENTS.find(e => e.system === sys.id && !e.resolved && (e.type === 'leak-high' || e.type === 'leak-low'));
  const policy = getActivePolicy(sys.id);
  /* THE ONE EVENT ID. This screen was the last surface still minting its own:
     `toLeakId` hashed the INCIDENT id, so /alert/:systemId printed "lk-6215"
     for the event the alert row, the event hero and /events/system/:id all
     call "LK-6363024". Off the canonical record now, via `sys.alert` — its
     projection. The fallback stays for an alert with no record behind it
     (a pushed / simulated alert is created at interaction time). */
  const leakId = sys.alert?.eventId ?? toLeakId(activeIncident);

  const isHighFlow = sys.alert?.type === 'leak-high';
  // tokens.css aligned: danger-main #a5455e → danger-text #632a35 (high-flow);
  // orange-main #f97316 → orange-text #9e3a04 (low-flow)
  const headerBg = isHighFlow
    ? 'linear-gradient(135deg, #a5455e, #632a35)'
    : 'linear-gradient(135deg, #f97316, #9e3a04)';

  const steps = activeIncident ? activeIncident.steps : [];

  // Leak Summary widget props
  const hasValve = sys.valve !== null && sys.valve !== undefined;
  const autoShutoff = !hasValve
    ? null
    : policy?.autoShutoff === 'On' ? 'Enabled'
    : policy?.autoShutoff === 'Off' ? 'Disabled'
    : null;

  // Absolute event instant for the Alert Summary widget (TZ display happens inside the widget)
  const systemTz = getSystemTz(sys);
  const instant = parseEventInstant(event?.timestamp, systemTz);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: theme.bg, position: 'relative' }}>
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }`}</style>
      <TagCelebration trigger={celebrationKey} />

      {/* Slim header — system name + path. Level / state / detected-at all live in Alert Summary widget below. */}
      <div style={{ background: headerBg, padding: '10px 16px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ fontSize: 14, color: 'rgba(255,255,255,.75)', background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, padding: 0 }}
          >&lsaquo; Back</button>
          <button
            onClick={() => navigate(`/system/${sys.id}`)}
            style={{ fontSize: 14, color: '#fff', background: 'rgba(255,255,255,.2)', border: 'none', fontFamily: 'inherit', cursor: 'pointer', padding: '4px 10px', borderRadius: 8, fontWeight: 500 }}
          >View System</button>
        </div>
        {/* Pressable breadcrumb — each ancestor jumps to that scope */}
        {(() => {
          const ancestors = getAncestorScopes(sys);
          if (ancestors.length === 0) return null;
          return (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4, marginBottom: 2, wordBreak: 'break-word' }}>
              {ancestors.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 4px' }}>›</span>}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedScope?.(a);
                      navigate('/');
                    }}
                    style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'underline', cursor: 'pointer' }}
                  >{a.name}</span>
                </span>
              ))}
            </div>
          );
        })()}
        {/* System name — tap to open the system page */}
        <div onClick={() => navigate(`/system/${sys.id}`)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>{sys.name}</span>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>chevron_right</span>
        </div>
      </div>

      {/* Content — single-incident view; per-system history lives on System Activity tab.
          When ignored: gray out per alerts-mockup-feedback #4 ("treat as completed, nothing actionable"). */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '10px 14px 93px',
        opacity: ignored ? 0.7 : 1,
        transition: 'opacity 200ms ease-out',
      }}>
        {(
          <>
            {/* Leak Summary widget — same shared component as Alerts/System.
                Renders if either a real incident exists OR sys.alert is set
                (e.g. simulator-driven). */}
            {(activeIncident || sys.alert) && (
              <div style={{ marginBottom: 8 }}>
                <LeakSummary
                  level={isHighFlow ? 'high' : 'low'}
                  state={leakState || 'Warning'}
                  instant={instant}
                  systemTz={systemTz}
                  flowRate={sys.alert?.flowRate}
                  autoShutoff={autoShutoff}
                  valveState={sys.valve ?? null}
                  detectionMode={policy?.detection || null}
                />
              </div>
            )}

            {/* Section order per ignore-tag-flows.html lock (annotation 2026-06-01):
                Summary → Valve → Ignore (or banner) → Tag → On it → Timeline → Event ID */}

            {/* Valve Control — top of action stack per locked order */}
            <ValveControlCard sys={sys} />

            {/* IGNORE CARD RETIRED, 2026-10-31 (owner: "Retire them"). An
                "Ignore Water Event" card sat here and opened v1's
                IgnoreBottomSheet. It is gone, not restyled: the gap between it
                and v2 was behavioural, not visual. The banner below is NOT
                retired — it reads ignoredIncidents, which the v2 flow writes, so
                an event ignored on /system/:systemId still reads as ignored on
                this screen, actor and cause included. */}

            {/* Ignored banner (shown once the event has been ignored in v2).
                Copy rule (2026-06-02): two lines max. Line 1 = "Ignored by {actor}".
                Line 2 = the captured tag (chip + detail), only if one exists.
                Do NOT add an "auto-shutoff suppressed" line — that was the confirmation-time
                warning, not a status. Once the action is committed it's noise. */}
            {ignored && (
              <div style={{
                background: 'rgba(229,161,0,0.10)', border: '1px solid rgba(229,161,0,0.32)',
                borderRadius: 10, padding: '10px 12px', marginBottom: 8,
                display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#8C5A0F',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#B47B0A' }}>flag</span>
                <div>
                  <b>Ignored by {ignoredInfo?.ignoredBy || 'You'}</b>
                  {ignoredInfo?.tag && (
                    <><br />{ignoredInfo.tag}</>
                  )}
                </div>
              </div>
            )}

            {/* Tagged pill strip — visible after tagging.
                Prefers the new chip-based shape ({ chip, chipOther, detail }); falls back
                to the legacy 3-step shape ({ impact, source, where }) for stored tags. */}
            {tag && (
              <div style={{
                background: 'rgba(92,158,26,0.10)', borderLeft: '3px solid #5C9E1A',
                padding: '8px 10px', borderRadius: '0 8px 8px 0', marginTop: 6, marginBottom: 8,
                fontSize: 12, color: '#4F8118',
              }}>
                <b>✓ Tagged:</b> {formatTagSummary(tag)}
              </div>
            )}

            {/* Tag card */}
            <div style={{
              background: theme.card, borderRadius: 12, padding: '10px 13px',
              display: 'flex', alignItems: 'center', gap: 9, marginTop: tag ? 0 : 6, marginBottom: 8, border: theme.cardBorder,
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(197,104,217,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#C568D9' }}>label</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>Tag this Water Event</div>
                <div style={{ fontSize: 13, color: theme.textTertiary, marginTop: 1 }}>
                  {tag ? 'Tap to edit your tag' : 'Add a quick reason — helps Wint learn'}
                </div>
              </div>
              <button
                onClick={() => setShowTagSheet(true)}
                style={{
                  fontSize: 14, fontWeight: 600, padding: '7px 13px', borderRadius: 8, border: 'none',
                  background: tag ? 'rgba(161,210,70,0.2)' : '#C568D9',
                  color: tag ? '#A1D246' : '#fff',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >{tag ? '✓ Tagged' : 'Tag'}</button>
            </div>

            {/* Claim card. LABEL STANDARDISED 2026-10-31 (owner: "Assign to
                me"): the offer reads "Assign to me". The claimed line keeps
                "On it · {actor}" because it reports state, not an action, and no
                replacement for it was approved. Suppressed when ignored. */}
            {!ignored && (() => {
              const me = getCurrentActor();
              const isOwner = investigating && investigatingInfo && investigatingInfo.actor === me;
              return (
                <div style={{
                  background: theme.card, borderRadius: 12, padding: '10px 13px',
                  display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8, border: theme.cardBorder,
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(4,173,239,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#04ADEF', fontVariationSettings: "'FILL' 1" }}>visibility</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>
                      {investigating && investigatingInfo
                        ? `On it · ${investigatingInfo.actor}`
                        : 'Assign to me'}
                    </div>
                    <div style={{ fontSize: 13, color: theme.textTertiary, marginTop: 1 }}>
                      {investigating && investigatingInfo
                        ? `${formatDuration(Math.max(0, Math.floor((Date.now() - investigatingInfo.startedAt) / 1000)))} ago`
                        : "Tells the team someone is looking into this"}
                    </div>
                  </div>
                  {!investigating && (
                    <button
                      onClick={() => { startInvestigating(sys.id, { actor: getCurrentActor() }); forceTick(t => t + 1); }}
                      style={{
                        fontSize: 14, fontWeight: 600, padding: '7px 13px', borderRadius: 8, border: 'none',
                        background: 'rgba(4,173,239,0.15)', color: '#04ADEF',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >Assign to me</button>
                  )}
                  {investigating && isOwner && (
                    <button
                      onClick={() => { stopInvestigating(sys.id); forceTick(t => t + 1); }}
                      style={{
                        fontSize: 13, fontWeight: 600, padding: '7px 11px', borderRadius: 8, border: 'none',
                        background: 'rgba(113,118,132,0.15)', color: '#717684',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >Stand down</button>
                  )}
                </div>
              );
            })()}

            {/* Timeline — BELOW the action stack per 2026-06-01 feedback.
                Variant A anatomy per PRD 11. Newest first. Tags do NOT appear in timeline. */}
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 8, marginTop: 12 }}>Event timeline</div>
            {steps.length === 0 && (
              <div style={{ background: theme.card, borderRadius: 12, padding: 20, textAlign: 'center', border: theme.cardBorder, marginBottom: 8 }}>
                <div style={{ fontSize: 15, color: theme.textTertiary }}>No incident data available</div>
              </div>
            )}
            {[...steps].reverse().map((step, i) => {
              const cfg = STEP_CONFIG[step.type] || { color: '#717684', icon: 'circle', title: step.type };
              const isLowFlow = sys?.leak === 'low' || activeIncident?.type === 'leak-low';
              const isCommStep = step.type === 'alert-sent' || step.type === 'reminder-sent';
              const isActorStep = step.type === 'on-it' || step.type === 'stand-down' || step.type === 'ignored';
              const baseTitle = cfg.flowAware ? resolveTitle(step.type, cfg.title, isLowFlow) : cfg.title;
              return (
                <div key={`${step.type}-${i}`} style={{
                  display: 'flex', gap: 8, padding: '9px 10px',
                  background: theme.card, borderRadius: 10,
                  border: `1px solid ${theme.divider}`,
                  marginBottom: 5, alignItems: 'flex-start',
                }}>
                  <div style={{ width: 42, flexShrink: 0, paddingTop: 2, fontSize: 11, fontWeight: 700, color: theme.text, fontVariantNumeric: 'tabular-nums' }}>
                    {step.time || step.timeAgo}
                  </div>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', background: cfg.color, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: 14, color: '#fff', lineHeight: 1,
                      fontVariationSettings: cfg.iconFilled === false ? "'FILL' 0" : "'FILL' 1",
                    }}>{cfg.icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: theme.text, lineHeight: 1.3 }}>
                      {baseTitle}{isActorStep && step.actor ? ` · ${step.actor}` : ''}
                    </div>
                    {(isActorStep || step.detail || step.flowRate || step.volume) && (
                      <div style={{ fontSize: 11, color: theme.textTertiary, marginTop: 2, lineHeight: 1.4 }}>
                        {(() => {
                          if (isCommStep && step.recipients?.length) {
                            const chs = [...new Set(step.recipients.flatMap(r => r.channels || []))].map(c => CHANNEL_LABEL[c] || c);
                            const n = step.recipients.length;
                            return `${n} recipient${n === 1 ? '' : 's'} · ${chs.join(' · ')}`;
                          }
                          return [
                            isActorStep && actorStepSub(step.type, step, tag?.summary),
                            step.flowRate && `Flow rate: ${step.flowRate}`,
                            step.volume && `Volume: ${step.volume}`,
                            !isActorStep && step.detail,
                          ].filter(Boolean).join(' · ');
                        })()}
                      </div>
                    )}
                    {isCommStep && step.recipients?.length > 0 && (
                      <details style={{ marginTop: 4 }}>
                        <summary style={{ cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#036AB5', listStyle: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          {step.recipients.length} recipient{step.recipients.length === 1 ? '' : 's'} <span style={{ fontSize: 9 }}>▾</span>
                        </summary>
                        <div style={{ marginTop: 5, padding: '6px 8px', background: theme.inputBg, borderRadius: 6 }}>
                          {step.recipients.map((r, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', fontSize: 11.5 }}>
                              <span style={{ fontWeight: 600, color: theme.text }}>{r.name}</span>
                              <span style={{ display: 'flex', gap: 3 }}>
                                {r.channels.map(ch => (
                                  <span key={ch} style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(4,173,239,0.15)', color: '#036AB5', textTransform: 'uppercase' }}>{ch}</span>
                                ))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Notified — moved below actions */}
            {notification && notification.recipients.length > 0 && (
              <div style={{ background: theme.card, borderRadius: 12, padding: '11px 13px', marginTop: 12, marginBottom: 8, border: theme.cardBorder }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>Notified · {notification.recipients.length} recipient{notification.recipients.length === 1 ? '' : 's'}</div>
                {notification.recipients.map((name, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < notification.recipients.length - 1 ? `1px solid ${theme.divider}` : 'none' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#04ADEF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initialsFor(name)}</div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: theme.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {notification.channels.map(ch => (
                        <span key={ch} style={{
                          fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                          background: 'rgba(4,173,239,0.13)', color: '#036AB5',
                        }}>{CHANNEL_LABEL[ch] || ch}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Event ID — last on the page */}
            {leakId && (
              <div style={{ background: theme.card, borderRadius: 12, padding: '10px 13px', marginBottom: 8, border: theme.cardBorder, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '.4px' }}>Event ID</div>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: theme.inputBg, color: theme.text }}>{leakId}</span>
              </div>
            )}

            {/* Chip-based Tag bottom sheet — root-cause tagging for real water events.
                Matches ignore-tag-flows.html Phones 1a-1e. Same chip pattern as Ignore
                with two differences: "Broken pipe" appears at the top (Tag-only) and
                there's no warning band. Tag is optional. */}
            {showTagSheet && (
              <TagBottomSheet
                currentTags={getTags(sys.id)}
                onClose={() => setShowTagSheet(false)}
                onAdd={(additions) => {
                  additions.forEach(t => addTag(sys.id, { ...t, addedBy: getCurrentActor() }));
                  setTagBumper(b => b + 1);
                  setCelebrationKey(k => k + 1);
                }}
                onRemove={(i) => {
                  removeTagAt(sys.id, i);
                  setTagBumper(b => b + 1);
                }}
              />
            )}
          </>
        )}
      </div>

      <TabBar activeTab="home" />
    </div>
  );
}

// __cache_bust__: 1780560000000000000 — 2026-06-02: ignored banner copy + "More options" label
