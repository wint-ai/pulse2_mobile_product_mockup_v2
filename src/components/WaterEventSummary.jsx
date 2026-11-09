// Water Event Summary widget — compact list-row form used on the Alerts tab.
// Reference design lives at:
//   public/reviews/water-event-widget.html § "1 · Water Event Summary widget"
//
// Anatomy:
//   [icon] System name              [Apr 28 · 06:11]
//          Street address           [3h 11m]
//   [level pill] [state pill] [valve pill]        [avatars]
//
// One per system. Top accent stripe colour-codes the lifecycle at a glance.

import { useTranslation } from 'react-i18next';
import { getSystemById } from '../data/systems';
import { getTag, getTags } from '../data/tagsStore';
import { getIgnoredInfo } from '../data/ignoredIncidents';
import { formatShortDate, formatDurationShort } from '../utils/locale';
import { Waves } from '../v2/icons';
import ValveStatus from '../v2/components/ValveStatus';

/* ── OFF THE ICON FONT — 2026-11-09 ─────────────────────────────────────────
   Owner: the app is "not using the new design system". This row was one of
   the last Material Symbols holdouts: every glyph here was a
   `<span class="material-symbols-outlined">` whose TEXT was the icon name and
   whose size was a `fontSize`.

   `MIcon` KEEPS ITS SIGNATURE ON PURPOSE — same `name`, `size`, `color`,
   `fill`, `style` — so not one call site moves and the diff stays inside this
   function. What changes is what it renders: a sized SVG from the project's
   own set instead of a glyph from a downloaded font. The wrapper keeps the
   `size`-square box and `lineHeight: 1` the glyph had, so the row's metrics
   are identical; measured unchanged on /alerts in both engines.

   THE MAP, and why each one:
     water_drop → `Waves` (src/v2/icons) — the project's water-event mark,
                  which AlertCard, EventFocusOverlay and TriageBand all
                  already draw for exactly this.
     valve      → `ValveStatus` (src/v2/components) — the app's own valve
                  glyph, the same component EventOverlayV2's filter row uses.
                  It takes a `state`; this row is only ever labelling a valve
                  that is in error, so it passes 'error' and nothing is
                  inferred.
   `fill` IS SIMPLY NOT READ ANY MORE. It drove the font's 'FILL' axis and
   these marks have no such axis, so the call sites still pass it and this
   function ignores it — deliberately left OUT of the destructure rather
   than bound to a throwaway name, which only trades a dead axis for a dead
   variable. Removing it from the call sites is a separate tidy-up. */
const ICONS = {
  water_drop: Waves,
  valve: (p) => <ValveStatus state="error" {...p} />,
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
export default function WaterEventSummary({ event, onClick, highlight, flat = false }) {
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
  const isHigh = event.type === 'leak-high';
  const isLow  = event.type === 'leak-low';
  if (!isHigh && !isLow) return null;

  const isResolved = !!event.resolved && !event.ignored;
  const isIgnored  = !!event.ignored;

  // Variant A category palette (locked in Event Timeline PRD). Same dot
  // anatomy across the app: 32 px circle, 2 px coloured ring, 10% tinted fill,
  // category-coloured icon inside. Resolved events KEEP their category color
  // and add a small green ✓ badge in the bottom-right of the dot — same spec
  // as the Timeline so users see the same alert the same way in both places.
  //   High Flow #DB4670 · Low Flow #F05C25 · Ignored #9DA3AE
  const ringColor = isIgnored ? '#9DA3AE'
                  : isHigh ? '#DB4670'
                  : '#F05C25';
  const iconBg = isIgnored ? 'rgba(20,21,26,0.06)'
              : isHigh ? 'rgba(219,70,112,0.10)'
              : 'rgba(240,92,37,0.10)';
  const iconColor = ringColor;

  // Pills
  const levelLabel = isHigh ? t('alerts.row.severity_high_flow') : t('alerts.row.severity_low_flow');
  // Pill colors match the Variant A ring color for the same category.
  const levelPillStyle = isHigh
    ? { background: 'rgba(219,70,112,0.12)', color: '#DB4670' }
    : { background: 'rgba(240,92,37,0.12)',  color: '#F05C25' };

  // Heuristic state derivation
  const stateLabel = isIgnored ? t('alerts.row.state_ignored')
                  : isResolved ? t('alerts.row.state_resolved')
                  : (sys?.valve === 'closed' ? t('alerts.row.state_shutoff') : t('alerts.row.state_warning'));
  const statePillStyle = (() => {
    if (isIgnored)  return { background: 'rgba(20,21,26,0.06)', color: '#717684' };
    if (isResolved) return { background: 'rgba(92,158,26,0.14)', color: '#2F6112' };
    if (sys?.valve === 'closed') return { background: 'rgba(20,21,26,0.06)', color: 'var(--color-foreground)' };
    return { background: 'rgba(229,161,0,0.18)', color: 'var(--v1-pill-ink-warn)' };
  })();

  // Valve pill (hide for resolved/ignored — already implied)
  const valvePillEl = (() => {
    if (isResolved || isIgnored) return null;
    if (sys?.valve === 'open') return { label: t('alerts.row.valve_open'), style: { background: 'rgba(4,173,239,0.14)', color: 'var(--v1-pill-ink-info)' } };
    if (sys?.valve === 'closed') return { label: t('alerts.row.valve_closed'), style: { background: 'rgba(113,118,132,0.14)', color: 'var(--color-slate-600)' } };
    if (sys?.valve === 'error')  return { label: t('alerts.row.valve_error'), style: { background: 'rgba(219,70,112,0.12)', color: '#DB4670' } };
    return null;
  })();

  // Time block
  const absTime = fmtDateShort(event.timestamp);
  const relTime = event.timestamp ? fmtDuration(Date.now() - new Date(event.timestamp).getTime()) : '';

  // Avatars (cap 3)
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
    <div onClick={onClick} data-name="event-row" data-row-kind="water-event-summary" data-flat={flat ? 'true' : 'false'} style={{
      /* See the `flat` note above the component. */
      background: flat ? 'transparent' : 'var(--color-surface-card)',
      border: flat ? 'none' : `1px solid var(--color-card)`,
      borderRadius: 14,
      boxShadow: flat ? 'none' : '0 1px 3px rgba(20,21,26,0.05)',
      marginBottom: flat ? 0 : 8,
      cursor: 'pointer',
      overflow: 'hidden',
      opacity: isIgnored ? 0.7 : 1,
      filter: isIgnored ? 'grayscale(20%)' : 'none',
    }}>
      {/* Top row: icon + name/address + time. Variant A dot (32 px circle,
          2 px coloured ring, 10% tinted fill) replaces the previous 36 px
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
          <MIcon name="water_drop" size={18} color={iconColor} fill />
          {/* Resolved badge — same spec as the Event Timeline ✓ badge so an
              ended water event reads the same in both surfaces. */}
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
          <div style={{ fontSize: 11, color: 'var(--color-muted-foreground)', whiteSpace: 'nowrap' }}>{absTime}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate-600)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{relTime}</div>
        </div>
      </div>

      {/* Meta row: pills + avatars */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px 11px', gap: 10,
      }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span style={{
            ...pillBase, ...levelPillStyle,
          }}>{levelLabel}</span>
          <span style={{
            ...pillBase, ...statePillStyle,
          }}>{stateLabel}</span>
          {valvePillEl && (
            <span style={{
              ...pillBase, ...valvePillEl.style,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <MIcon name="valve" size={13} color={valvePillEl.style.color} />
              {valvePillEl.label}
            </span>
          )}
        </div>
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
      </div>

      {/* Tag sub-line — only on closed events (resolved or ignored).
          PRD 15 § 4.2.1. Display-only; tap-to-edit lives on the system page
          Activity tab. Tags are keyed by event.id (per-event), so different
          closed events on the same system can carry different tags. */}
      {(isResolved || isIgnored) && (() => {
        const eventTags = event.id ? getTags(event.id) : [];
        const isTagged = eventTags.length > 0;
        const labels = eventTags.map(tag => {
          if (tag.chip === 'Other' && tag.chipOther) return tag.chipOther;
          if (tag.chip) return t(`tag_common.chips.${tag.chip}`, tag.chip);
          return tag.chipOther || '';
        }).filter(Boolean);
        return (
          <div style={{
            padding: '6px 12px 11px',
            borderTop: `1px dashed var(--color-border)`,
            marginTop: -4,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11.5, lineHeight: 1.4,
              color: isTagged ? '#036AB5' : ('var(--color-muted-foreground)'),
              fontStyle: isTagged ? 'normal' : 'italic',
              fontWeight: isTagged ? 600 : 500,
            }}>
              <MIcon
                name={isTagged ? 'label' : 'add'}
                size={13}
                color={isTagged ? '#036AB5' : ('var(--color-muted-foreground)')}
                fill={isTagged}
              />
              {isTagged ? `${t('alerts.row.tagged_prefix')} ${labels.join(', ')}` : t('alerts.row.not_tagged_yet')}
            </div>
          </div>
        );
      })()}
    </div>
  );
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
