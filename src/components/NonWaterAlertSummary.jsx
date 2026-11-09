// Non-Water alert Summary widget — compact list-row form for offline / valve
// error / external-power lost / no-recipients alerts.
//
// Mirrors the WaterEventSummary anatomy so both row types feel like one
// product on the Alerts list:
//   [icon] System name              [Apr 28 · 06:11]
//          Street address                  [3h 11m]
//   [alert-type pill] [optional state pills]      [avatars]
//
// One per system. 3 px top accent stripe colour-codes the lifecycle at a
// glance — amber for active, green for resolved.
//
// Tapping the row navigates to /system/:id (same destination as water
// events) — handled by the onClick prop. No dedicated detail page for
// non-water alerts yet; the system page is the canonical surface.

import { useTranslation } from 'react-i18next';
import { getSystemById } from '../data/systems';
import { formatShortDate, formatDurationShort } from '../utils/locale';
import { BatteryWarning, PowerOff, TriangleAlert } from 'lucide-react';
import { WifiDisconnected02 } from '../v2/icons';
import ValveStatus from '../v2/components/ValveStatus';

/* ── OFF THE ICON FONT — 2026-11-09 ─────────────────────────────────────────
   See WaterEventSummary.jsx for the full note; this is the same migration on
   the fault row. `MIcon`'s signature is unchanged so no call site moves — and
   here there is only ONE call site, `<MIcon name={preset.icon} …>`, fed by the
   per-type preset table below.

   THE MAP covers every `icon` that table can produce:
     valve         → `ValveStatus` (src/v2/components), the app's own valve
                     mark. This row draws it only for a valve FAULT, so the
                     'error' state is the literal truth here, not a guess.
     power_off     → lucide `PowerOff`     — EventFocusOverlay's own choice
                                             for `power-lost`.
     wifi_off      → `WifiDisconnected02` (src/v2/icons) — the mark
                     EventOverlayV2 already uses for an offline system.
     battery_alert → lucide `BatteryWarning`.
     error_outline → lucide `TriangleAlert` — the fallback preset's glyph, and
                     the one EventFocusOverlay uses for an unknown fault.

   A NAME WITH NO MAPPING RENDERS NOTHING rather than throwing, which is the
   same thing the font did with an unknown ligature. The preset table is the
   only source of these names, so that path is unreachable today; it is there
   so adding a preset without a glyph fails quietly in one place instead of
   taking the Alerts list down. */
const ICONS = {
  valve: (p) => <ValveStatus state="error" {...p} />,
  power_off: PowerOff,
  wifi_off: WifiDisconnected02,
  battery_alert: BatteryWarning,
  error_outline: TriangleAlert,
};

function MIcon({ name, size = 18, color, style = {} }) {
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, color, lineHeight: 1, flexShrink: 0, ...style,
      }}
    >
      <Glyph size={size} className="block size-full" aria-hidden="true" />
    </span>
  );
}

const AVATAR_COLORS = ['#D14F75', '#6BA52A', '#04ADEF', '#E5A100', '#9B59B6'];
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
}


// Per-type visual presets — icon + Variant A category color (PRD-locked palette).
// Same dot anatomy as the Event Timeline: 32 px circle, 2 px coloured ring,
// 10% tinted fill, category-coloured icon inside.
//   Valve #036AB5 · Power #B5651A · Connectivity #717684
//   No-recipients → muted red #A5455E (matches Home Status Overview "Missing" pill)
// `labelKey` resolves via t('alerts.row.non_water.<key>') at render time.
function presetFor(type) {
  switch (type) {
    case 'valve-error':
      return { icon: 'valve',         ring: 'var(--v1-pill-ink-info)', iconBg: 'rgba(3,106,181,0.10)',  labelKey: 'valve_error',       pillBg: 'rgba(3,106,181,0.12)',  pillColor: 'var(--v1-pill-ink-info)' };
    case 'power-lost':
    case 'ac-lost':
      return { icon: 'power_off',     ring: '#B5651A', iconBg: 'rgba(181,101,26,0.10)', labelKey: 'ac_unplugged',      pillBg: 'rgba(181,101,26,0.12)', pillColor: '#B5651A' };
    case 'offline':
    case 'comm':
      return { icon: 'wifi_off',      ring: '#717684', iconBg: 'rgba(113,118,132,0.10)',labelKey: 'offline',           pillBg: 'rgba(113,118,132,0.16)',pillColor: 'var(--v1-pill-ink-mute)' };
    case 'no-recipients':
      return { icon: 'group_off',     ring: '#A5455E', iconBg: 'rgba(165,69,94,0.10)',  labelKey: 'no_recipients',     pillBg: 'rgba(165,69,94,0.12)',  pillColor: '#A5455E' };
    case 'battery-low':
      return { icon: 'battery_alert', ring: '#B5651A', iconBg: 'rgba(181,101,26,0.10)', labelKey: 'battery_low',       pillBg: 'rgba(181,101,26,0.12)', pillColor: '#B5651A' };
    case 'battery-critical':
      return { icon: 'battery_alert', ring: '#DB4670', iconBg: 'rgba(219,70,112,0.10)', labelKey: 'battery_critical',  pillBg: 'rgba(219,70,112,0.12)', pillColor: '#DB4670' };
    default:
      return { icon: 'error_outline', ring: '#B5651A', iconBg: 'rgba(181,101,26,0.10)', labelKey: null, pillLabel: type, pillBg: 'rgba(181,101,26,0.12)', pillColor: '#B5651A' };
  }
}

const pillBase = {
  display: 'inline-block',
  padding: '3px 9px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.25,
  whiteSpace: 'nowrap',
};

/* ── `flat` — THE ROW INSIDE ONE CARD, 2026-11-09 ───────────────────────────
   Node 199412:109893 draws the Alerts list as ONE white card holding every
   row, divided by hairlines — not the card-per-row this component has always
   drawn. `flat` is the opt-in that lets a page own the surface.

   ⚠ DEFAULT IS TODAY'S RENDERING, DELIBERATELY. Only /alerts has this frame.
     `EventHistory` (/alerts/system/:id) and `HomeClear` (/home-clear) mount
     this same component and must not move, so they pass nothing and get the
     card, the radius, the shadow and the 8px gap exactly as before — measured
     unchanged in both engines.

   WHAT IT SUPPRESSES, and only this: the background, the border, the shadow
   and the bottom margin — the four things that make a row look like a card.
   It keeps the 14px radius, which the node's own row carries, and it changes
   no padding, no layout and no content, so the row's HEIGHT is identical in
   both modes. That is the whole point: the page gains a card, the row loses
   one, and nothing in between reflows.

   WHY A PROP AND NOT A PARENT SELECTOR. Styling these rows from the page with
   a descendant rule would hard-couple /alerts to this component's internal
   DOM — the next person to change a wrapper here would silently restyle a
   page they never opened. The prop is the seam; the page asks and the row
   answers. */
export default function NonWaterAlertSummary({ event, onClick, highlight, flat = false }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const fmtDateShort = (iso) => formatShortDate(iso, lang);
  const fmtDuration = (ms) => formatDurationShort(ms, lang);
  /* `useTheme()` is gone — 2026-11-09. Every colour this file drew came
     from the v1 ThemeContext object; they are registered @theme inline
     tokens now, so there is nothing left for the context to supply and
     the subscription (and the re-render it caused on every theme flip)
     goes with it. */
  const sys = event.system ? getSystemById(event.system) : null;

  const isResolved = !!event.resolved && !event.ignored;
  const preset = presetFor(event.type);

  // Resolved keeps the category color and adds a green ✓ badge in the corner
  // of the dot — same spec as the Event Timeline so an ended valve / power /
  // offline event looks the same on the Alerts list and on the Activity tab.
  const ringColor = preset.ring;
  const iconBg    = preset.iconBg;
  const iconColor = ringColor;

  // Time block — config-gap pseudo-events have no timestamp.
  const absTime = event.timestamp ? fmtDateShort(event.timestamp) : (event.time || '');
  const relTime = event.timestamp ? fmtDuration(Date.now() - new Date(event.timestamp).getTime()) : '';

  // Notification recipients (cap 3 + overflow).
  const contacts = sys?.contacts || [];
  const visibleContacts = contacts.slice(0, 3);
  const moreCount = Math.max(0, contacts.length - 3);

  // Highlight helper for search
  function hl(text) {
    if (!highlight || !text) return text;
    const idx = String(text).toLowerCase().indexOf(String(highlight).toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: 'rgba(229,161,0,0.30)', color: 'inherit', padding: 0 }}>{text.slice(idx, idx + highlight.length)}</mark>
        {text.slice(idx + highlight.length)}
      </>
    );
  }

  return (
    <div onClick={onClick} data-name="event-row" data-row-kind="non-water-alert-summary" data-flat={flat ? 'true' : 'false'} style={{
      /* See the `flat` note above the component. */
      background: flat ? 'transparent' : 'var(--color-surface-card)',
      border: flat ? 'none' : `1px solid var(--color-card)`,
      borderRadius: 14,
      boxShadow: flat ? 'none' : '0 1px 3px rgba(20,21,26,0.05)',
      marginBottom: flat ? 0 : 8,
      cursor: 'pointer',
      overflow: 'hidden',
    }}>
      {/* Top row: icon + name/address + time. Variant A dot anatomy (32 px
          circle, 2 px coloured ring, 10% tinted fill) replaces the previous
          rounded-square + top stripe combo. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr auto',
        gap: 10,
        padding: '11px 12px 4px',
        alignItems: 'center',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: iconBg,
          border: `2px solid ${ringColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          position: 'relative',
        }}>
          <MIcon name={preset.icon} size={18} color={iconColor} fill />
          {/* Resolved badge — matches the Event Timeline ✓ spec. */}
          {isResolved && (
            <div style={{
              position: 'absolute', right: -4, bottom: -4,
              width: 14, height: 14, borderRadius: '50%',
              background: '#5C9E1A',
              border: `2px solid var(--color-surface-card)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontSize: 9, fontWeight: 900, lineHeight: 1 }}>✓</span>
            </div>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: 'var(--color-foreground)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{hl(event.systemName || sys?.name || '—')}</div>
          <div style={{
            fontSize: 12, color: 'var(--color-muted-foreground)', marginTop: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{hl(sys?.address || event.path || '')}</div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
          {absTime && <div style={{ fontSize: 11, color: 'var(--color-muted-foreground)', whiteSpace: 'nowrap' }}>{absTime}</div>}
          {relTime && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate-600)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{relTime}</div>}
        </div>
      </div>

      {/* Meta row: alert-type pill + (resolved tag) + avatars */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px 11px', gap: 10,
      }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ ...pillBase, background: preset.pillBg, color: preset.pillColor }}>{preset.labelKey ? t(`alerts.row.non_water.${preset.labelKey}`) : preset.pillLabel}</span>
          {isResolved && (
            <span style={{ ...pillBase, background: 'rgba(92,158,26,0.14)', color: '#2F6112' }}>Resolved</span>
          )}
        </div>
        {visibleContacts.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {visibleContacts.map((c, i) => (
              <div key={i} style={{
                width: 22, height: 22, borderRadius: '50%',
                background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700,
                border: `1.5px solid var(--color-surface-card)`,
                marginLeft: i === 0 ? 0 : -6,
              }}>{initials(c.name)}</div>
            ))}
            {moreCount > 0 && (
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--color-muted-foreground)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700,
                border: `1.5px solid var(--color-surface-card)`,
                marginLeft: -6,
              }}>+{moreCount}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
