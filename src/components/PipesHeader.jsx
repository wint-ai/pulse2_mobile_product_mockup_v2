// Shared header with pipes1.jpg background image
// Used across all screens for consistent branding.
//
// The pipes image is part of the brand identity and is shown across ALL
// themes — earlier behaviour hid it under the portal/glass theme, which
// caused the header to read as a flat navy block and lose the Wint look.
// Portal mode now adds a translucent glass overlay ON TOP of the pipes
// instead of replacing it.

import { useTheme } from '../context/ThemeContext';

/**
 * C3 Glow page background — NOW THE APP GROUND, not a frozen literal.
 * Used by the multi-system v1 pages: /alerts (EventsScreen) and
 * TenantPropertiesList. Single-system pages (System Detail, Leak Detail)
 * intentionally use a different treatment — MESH_PAGE_BG below — to signal
 * "you're looking at one thing now", and that one is untouched.
 *
 * WHAT THIS WAS, AND WHY IT MOVED. It was a hardcoded recipe (locked
 * 2026-06-09, contrast boosted the same day): one large radial glow from the
 * upper-right corner, brand-blue 0.32 → 0.12 → 0, over a pale-blue vertical
 * gradient #CDDDEB → #DCE6EF → #E5ECF1 → #E9EEF3. See
 * public/reviews/header-background-options.html#opt-glow for the original.
 *
 * Being a literal, it already ignored the v2 theme switch: /alerts stayed pale
 * blue under `dark`, `sand` and `contrast` alike. Pointing it at --app-bg
 * fixes that AND makes the tab follow the app-background selector, which is
 * the point — the ground is the largest painted area in the app and a tab
 * that does not move with it reads as a different product.
 *
 * THIS MOVES PIXELS ON A LIVE V1 SCREEN. That is approved and deliberate, not
 * a side effect: under the default theme and the default ground it goes from
 * the pale-blue glow above to the Figma wash every v2 page already paints.
 */
export const GLOW_PAGE_BG = 'var(--app-bg)';

/**
 * N4 Mesh page background (single-system pages, locked 2026-06-09).
 * Used by SystemDetail to differentiate "you're looking at ONE device" from
 * the multi-system glow. Pure-background differentiator (no text or badges).
 *
 * Recipe: a 24 px grid of 1 px brand-blue dots at 18% alpha layered on a
 * gentle pale-neutral vertical gradient. Reads as "technical blueprint
 * paper" - calm, focused, technical.
 */
export const MESH_PAGE_BG =
  'radial-gradient(circle 1px at 12px 12px, rgba(11,149,248,0.18) 1px, transparent 1.5px), ' +
  'linear-gradient(180deg, #E9EEF3 0%, #ECF1F5 100%)';

export const MESH_PAGE_BG_SIZE = '24px 24px, 100% 100%';

/* ════════════════════════════════════════════════════════════════════════
   UI-IMPROVEMENTS-TAKE-1 · Wint Sky wave variants (locked 2026-06-10)
   ────────────────────────────────────────────────────────────────────────
   Two new page backgrounds based on the round-4 "Wint Sky" palette + the
   wave-flow motif locked in round 5. They share the SAME wave SVG; the
   System variant just renders the waves at HALF opacity (0.05/0.03/0.02
   vs Home's 0.10/0.06/0.04). This is the engineering recipe from
   /reviews/design-refresh-round5-engineering.html — one component, six
   tokens that differ.

   To switch a screen to this look, drop the three exports below into the
   style object:
     background: WINT_SKY_HOME_BG,
     backgroundSize: WINT_SKY_HOME_BG_SIZE,
     backgroundRepeat: 'no-repeat',
   Same pattern for WINT_SKY_SYSTEM_BG (dim variant).
   ──────────────────────────────────────────────────────────────────────── */

const _WAVE_HOME_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 380 760' preserveAspectRatio='none'>" +
  "<path d='M0,90 C90,40 180,150 280,80 C320,55 360,95 380,70 L380,170 C320,210 220,120 140,200 C80,240 30,180 0,220 Z' fill='rgba(11,149,248,0.10)'/>" +
  "<path d='M0,160 C100,120 180,220 280,150 C320,125 360,165 380,140 L380,250 C320,290 220,200 140,280 C80,320 30,260 0,300 Z' fill='rgba(11,149,248,0.06)'/>" +
  "<path d='M0,300 C100,260 180,360 280,290 C320,265 360,305 380,280 L380,390 C320,430 220,340 140,420 C80,460 30,400 0,440 Z' fill='rgba(11,149,248,0.04)'/>" +
  "</svg>";

const _WAVE_SYSTEM_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 380 760' preserveAspectRatio='none'>" +
  "<path d='M0,90 C90,40 180,150 280,80 C320,55 360,95 380,70 L380,170 C320,210 220,120 140,200 C80,240 30,180 0,220 Z' fill='rgba(11,149,248,0.05)'/>" +
  "<path d='M0,160 C100,120 180,220 280,150 C320,125 360,165 380,140 L380,250 C320,290 220,200 140,280 C80,320 30,260 0,300 Z' fill='rgba(11,149,248,0.03)'/>" +
  "<path d='M0,300 C100,260 180,360 280,290 C320,265 360,305 380,280 L380,390 C320,430 220,340 140,420 C80,460 30,400 0,440 Z' fill='rgba(11,149,248,0.02)'/>" +
  "</svg>";

/* ── THE GRADIENT UNDER THE WAVES IS TOKENISED; THE WAVES ARE NOT ───────
 * Measured 2026-11-08: /systems rendered almost entirely LIGHT under
 * [data-theme=dark] even after the v1 theme context was bridged, because
 * this gradient is the outermost thing the page paints and it was three
 * literal near-whites. The dark ground was underneath the whole time,
 * covered up.
 *
 * Only the GRADIENT moves. The wave paths keep their brand blue at
 * 10/6/4% (home) and 5/3/2% (system) in every theme -- CLAUDE.md fixes the
 * water art as product semantics, and a translucent blue composites
 * correctly over a dark ground as readily as over a pale one, so there is
 * nothing to fix and no licence to repaint it.
 *
 * `light` IS BYTE-FOR-BYTE UNCHANGED: --sky-* in :root are the same three
 * hexes that were written here. `sand` and `contrast` inherit those, which
 * is what they rendered before this change. Only `dark` declares its own.
 */

/** Wint Sky Home variant - saturated blue gradient + waves at full opacity. */
export const WINT_SKY_HOME_BG =
  `url("${_WAVE_HOME_SVG}"), linear-gradient(180deg, var(--sky-home-from) 0%, var(--sky-home-via) 30%, var(--sky-home-to) 70%)`;
export const WINT_SKY_HOME_BG_SIZE = '100% 100%, 100% 100%';

/** Wint Sky System variant - dimmer gradient + waves at half opacity. */
export const WINT_SKY_SYSTEM_BG =
  `url("${_WAVE_SYSTEM_SVG}"), linear-gradient(180deg, var(--sky-system-from) 0%, var(--sky-system-via) 30%, var(--sky-system-to) 70%)`;
export const WINT_SKY_SYSTEM_BG_SIZE = '100% 100%, 100% 100%';

export default function PipesHeader({ children, style = {}, glow = false }) {
  const { theme } = useTheme();
  const gl = theme.glass;

  // C3 Glow experiment (2026-06-09): when glow=true, the header renders
  // TRANSPARENT - no pipes image, no dark tint, no portal overlay. The
  // surrounding page background (set by the consumer) shows through.
  // Consumers passing glow=true MUST also dark-text the header children
  // (they were previously white-on-navy). Easily revertable: drop the
  // glow prop everywhere to restore the original look.
  if (glow) {
    return (
      <div style={{
        position: 'relative', flexShrink: 0,
        background: 'transparent',
        ...style,
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative', overflow: 'hidden', flexShrink: 0,
      background: '#1B2838',                 // dark navy fallback if image fails
      ...style,
    }}>
      {/* Background image — always present */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${import.meta.env.BASE_URL}pipes1.jpg)`,
        backgroundSize: 'cover', backgroundPosition: 'center 40%',
        opacity: gl ? 0.30 : 0.45,
      }} />
      {/* Tinted overlay — slightly different alpha in portal mode for the
          glass effect, but the gradient + brand colours stay. */}
      <div style={{
        position: 'absolute', inset: 0,
        background: gl
          ? 'linear-gradient(180deg, rgba(6,59,110,0.55) 0%, rgba(11,149,248,0.35) 100%)'
          : 'linear-gradient(180deg, rgba(6,59,110,0.70) 0%, rgba(11,149,248,0.50) 100%)',
      }} />
      {/* Subtle accent glow only in portal mode */}
      {gl && <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(11,149,248,0.08), transparent 60%)',
      }} />}
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
