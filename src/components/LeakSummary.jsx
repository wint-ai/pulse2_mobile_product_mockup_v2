import { Waves } from '../v2/icons';
import {
  formatDateInTz,
  formatDuration,
  tzAbbrev,
  sameTzAtMoment,
  getClientTz,
} from '../utils/format';

const LEVEL = {
  high: { color: '#DB4670', label: 'High Flow' },
  low:  { color: '#F05C25', label: 'Low Flow' },
};

const STATE_PILL = {
  Warning: { color: '#B5651A', bgRgba: 'rgba(240,160,40,0.18)' },
  Ongoing: { color: '#A22050', bgRgba: 'rgba(219,70,112,0.18)' },
  ShutOff: { color: '#2D3F5C', bgRgba: 'rgba(80,100,140,0.18)' },
};

const VALVE_DOT = {
  open:   '#5C9E1A',
  closed: '#717684',
  error:  '#DB4670',
  none:   '#B0B5BD',
};

const VALVE_LABEL = {
  open: 'Open', closed: 'Closed', error: 'Error', none: 'No Valve',
};

function Pill({ children, color, bg, dot }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
      display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
      background: bg, color,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />}
      {children}
    </span>
  );
}

export default function LeakSummary({
  level,
  state,
  instant,        // Date — absolute moment of detection
  systemTz,       // IANA TZ name
  flowRate,
  autoShutoff,
  valveState,
  detectionMode,
  onClick,
}) {
  /* `useTheme()` is gone — 2026-11-09. Every colour this file drew came
     from the v1 ThemeContext object; they are registered @theme inline
     tokens now, so there is nothing left for the context to supply and
     the subscription (and the re-render it caused on every theme flip)
     goes with it. */
  const lv = LEVEL[level] || LEVEL.high;
  const sp = STATE_PILL[state];
  const valveKey = valveState === null || valveState === undefined ? 'none' : valveState;

  // TZ-aware display: render in system TZ, show abbrev only when different from client TZ
  const tz = systemTz || 'UTC';
  const detectedAt = instant ? formatDateInTz(instant, tz, 'alert') : null;
  const timeSince = instant ? formatDuration(Math.max(0, Math.floor((Date.now() - instant.getTime()) / 1000))) : null;
  const clientTz = getClientTz();
  const showTz = instant ? !sameTzAtMoment(instant, tz, clientTz) : false;
  const abbrev = showTz ? tzAbbrev(instant, tz) : '';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-surface-card)',
        borderRadius: 10,
        border: 'var(--color-card)',
        borderLeft: `3px solid ${lv.color}`,
        cursor: onClick ? 'pointer' : 'default',
        padding: '7px 12px 8px',
      }}
    >
      {/* Row 1 — title + meta + flow rate. Wraps cleanly on narrow widths. */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 5, flexWrap: 'wrap', rowGap: 2 }}>
        {/* OFF THE ICON FONT — 2026-11-09. Was a Material Symbols
            `water_drop` ligature at fontSize 16; now the project's own
            `Waves`, the mark every other water surface draws, in the same
            16px box so the baseline row does not shift. */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, color: lv.color, lineHeight: 1,
          alignSelf: 'center', flexShrink: 0,
        }}>
          <Waves size={16} className="block size-full" aria-hidden="true" />
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-foreground)', whiteSpace: 'nowrap' }}>{lv.label}</span>
        {detectedAt && (
          <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)', whiteSpace: 'nowrap' }}>
            {detectedAt}
            {abbrev && <span style={{ color: '#036AB5', fontWeight: 700, marginLeft: 4 }}>{abbrev}</span>}
          </span>
        )}
        {timeSince && <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)', whiteSpace: 'nowrap' }}>· {timeSince}</span>}
        {flowRate && (
          <span style={{
            fontSize: 13, fontWeight: 700, color: 'var(--color-foreground)', marginLeft: 'auto',
            letterSpacing: '-0.2px', whiteSpace: 'nowrap',
          }}>{flowRate}</span>
        )}
      </div>

      {/* Row 2 — pills */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {sp && <Pill color={sp.color} bg={sp.bgRgba}>{state}</Pill>}
        {autoShutoff === 'Enabled' && <Pill color="#4F8118" bg="rgba(92,158,26,0.15)">Auto-shutoff</Pill>}
        {autoShutoff === 'Disabled' && <Pill color="#717684" bg="rgba(113,118,132,0.15)">No auto-shutoff</Pill>}
        <Pill color={'var(--color-foreground)'} bg={'var(--color-accent)'} dot={VALVE_DOT[valveKey]}>{VALVE_LABEL[valveKey]}</Pill>
        {detectionMode && <Pill color="#036AB5" bg="rgba(4,173,239,0.15)">{detectionMode}</Pill>}
      </div>
    </div>
  );
}
