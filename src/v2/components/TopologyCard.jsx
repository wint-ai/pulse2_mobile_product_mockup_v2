/**
 * Topology card — v2.
 * Design source: Figma file YEmjkKS4xaA827Zm8w3oXx, component set "System type"
 * 198356:122566, both variants fetched INDIVIDUALLY (fetching the set merges
 * them and hands back the wrong assets — that is how a water-line pipe once
 * came back as a loop shape):
 *
 *   Property 1 = Waterline   198356:122565
 *   Property 1 = Open loop   198356:122834
 *
 * This is the card AROUND the schematic. The schematic itself is
 * PipeTopology.jsx (all six symbols) and the valve glyph is ValveStatus.jsx
 * (all five states) — both are imported, neither is rebuilt here.
 *
 * WHY THE CLASSES LOOK LIKE THAT. Every `var(--…)` below is copied verbatim
 * from get_design_context and carries its own literal fallback
 * (`text-[color:var(--colors\/slate\/600,#45556c)]`). index.css defines none
 * of those slash-named tokens, so the fallback is what renders — which is
 * exactly the design value. Do not "translate" them to text-slate-600 / px-2:
 * the pixel fidelity is in not touching them.
 *
 * AND WHY THEY ARE ALL JSX ATTRIBUTE LITERALS. Tailwind v4 scans raw source
 * text, but a JS string literal is unescaped by the JS parser before it
 * reaches the DOM — write `"…\\/…"` in a JS string and the scanner registers
 * one spelling while the element carries another, so the rule silently never
 * matches. JSX attribute strings are not unescaped, so source text and DOM
 * class agree. Every class carrying a `\/` below therefore sits in a
 * className="…" attribute, and variants are branched in JSX rather than
 * assembled by concatenating strings.
 *
 * Three places the Figma output could not be kept literally:
 *   1. font-family. Figma emits `var(--font/family/sans,'Figtree:SemiBold')`.
 *      `Figtree:SemiBold` is Figma's style *name*, not a CSS family, so that
 *      fallback matches nothing and the browser drops to its default serif.
 *      The token and Figma's literal are kept; a real stack is appended after
 *      them so the text actually renders in Figtree.
 *   2. font-weight. Figma emits a bare `font-[var(--font/weight/…,600)]`,
 *      which Tailwind v4 cannot tell from a font-*family*. Rewritten as
 *      `font-[number:var(…)]` — same token, same fallback, now applied as a
 *      weight instead of clobbering the family.
 *   3. Width. The node is a 680x136 desktop card with `min-w-[484px]`; this
 *      repo's phone is 393px. The root is fluid up to the designed 680 and
 *      the two columns carry `gap-x-0 gap-y-[12px]` + `flex-wrap`, so at
 *      desktop width they sit side by side exactly as drawn and at phone
 *      width the schematic panel wraps underneath. No media queries — the
 *      card lives inside a 393px div, not a 393px viewport.
 */

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import PipeTopology from './PipeTopology'
import ValveStatus from './ValveStatus'

// ── Exported Figma glyphs, inlined ─────────────────────────────────────────
// The MCP asset URLs expire in ~7 days, so nothing may reference them at
// runtime. Each viewBox below is the exported asset's own, checked against the
// geometry it is supposed to draw.
//
// Tint rule (Figma's, not ours): a glyph becomes `currentColor` only where the
// design actually draws it in two colours. wifi-02 ships slate-500 on the plain
// badge and white on the red/400 badge -> currentColor. Location Dot ships
// #2B7FFF on Supply and #FB2C36 on Return -> currentColor. connect (#62748E),
// dots-three (#45556C) and dashboard-speed-02 (#62748E) are drawn one way
// everywhere, so they keep the fill the asset ships with.

/** Huge Icons / wifi-02 — leaf art, 12.5417x8.45833 inside a 14px frame. */
const Wifi02 = (props) => (
  <svg width="12.5417" height="8.45833" viewBox="0 0 12.5417 8.45833" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <path d="M6.27084 8.02083H6.27772" stroke="currentColor" strokeWidth="0.875" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.08334 6.27083C5.25001 5.10417 7.29168 5.10417 8.45834 6.27083" stroke="currentColor" strokeWidth="0.875" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.0625 4.52083C7.86474 2.57639 4.81251 2.57639 2.47918 4.52083" stroke="currentColor" strokeWidth="0.875" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M0.437509 2.77083C4.12172 -0.340264 8.41997 -0.34027 12.1042 2.77077" stroke="currentColor" strokeWidth="0.875" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Huge Icons / connect — fills its 14px frame. */
const Connect = (props) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <path d="M7.33167 9.73582L7.00241 10.0239V10.0239L7.33167 9.73582ZM7.19209 11.006L6.89439 10.6854L6.88845 10.6909L6.88273 10.6966L7.19209 11.006ZM6.52908 11.6271L6.25371 11.2872H6.25371L6.52908 11.6271ZM1.85317 8.45867L2.2789 8.5595L2.27947 8.55704L1.85317 8.45867ZM5.60786 8.00503L5.92131 7.69976L5.91724 7.6957L5.60786 8.00503ZM2.65575 7.09776L2.96511 7.40712L2.65575 7.09776ZM3.6677 6.41034V6.84797L3.67864 6.8477L3.6677 6.41034ZM4.68524 7.0838L4.37634 7.3937L4.38145 7.39864L4.68524 7.0838ZM0.845914 12.5112C0.67506 12.682 0.67506 12.959 0.845914 13.1299C1.01677 13.3007 1.29378 13.3007 1.46463 13.1299L1.15527 12.8205L0.845914 12.5112ZM7.33167 9.73582L7.00241 10.0239C7.10715 10.1436 7.13195 10.2387 7.12751 10.3095C7.12302 10.3811 7.08341 10.5099 6.89439 10.6854L7.19209 11.006L7.48978 11.3266C7.7893 11.0485 7.97824 10.7237 8.00079 10.3643C8.0234 10.0041 7.87373 9.69093 7.66092 9.44772L7.33167 9.73582ZM7.19209 11.006L6.88273 10.6966C6.72886 10.8505 6.59145 11.0136 6.25371 11.2872L6.52908 11.6271L6.80446 11.9671C7.1889 11.6557 7.37616 11.4406 7.50145 11.3153L7.19209 11.006ZM6.52908 11.6271L6.25371 11.2872C5.66921 11.7606 4.18066 12.2363 2.92258 11.0381L2.62086 11.3549L2.31913 11.6717C3.99223 13.2652 5.99317 12.6242 6.80446 11.9671L6.52908 11.6271ZM2.62086 11.3549L2.93893 11.0545C2.42099 10.5061 2.00664 9.70901 2.27889 8.55949L1.85317 8.45867L1.42745 8.35784C1.07159 9.86033 1.6343 10.9475 2.30279 11.6553L2.62086 11.3549ZM5.60786 8.00503L5.29444 8.31028C5.68827 8.71466 6.08992 9.11348 6.40741 9.42783C6.7361 9.75326 6.95252 9.96689 7.00241 10.0239L7.33167 9.73582L7.66092 9.44772C7.58374 9.35951 7.32908 9.10904 7.02304 8.80604C6.70581 8.49195 6.30909 8.09799 5.92128 7.69979L5.60786 8.00503ZM1.85317 8.45867L2.27947 8.55704C2.36233 8.19799 2.61 7.76223 2.96511 7.40712L2.65575 7.09776L2.34639 6.78841C1.89866 7.23614 1.55338 7.81208 1.42687 8.36029L1.85317 8.45867ZM2.65575 7.09776L2.96511 7.40712C3.16092 7.21132 3.28545 7.07329 3.42082 6.96573C3.54442 6.86751 3.6155 6.84784 3.6677 6.84784V6.41034V5.97284C3.33606 5.97284 3.07564 6.1224 2.87647 6.28066C2.68906 6.42958 2.49953 6.63527 2.34639 6.78841L2.65575 7.09776ZM3.6677 6.41034L3.67864 6.8477C3.74468 6.84605 3.82037 6.86919 3.9401 6.96511C4.07787 7.07548 4.186 7.2039 4.37638 7.39366L4.68524 7.0838L4.9941 6.77395C4.86484 6.6451 4.67357 6.43155 4.48717 6.28222C4.28273 6.11844 4.00946 5.96415 3.65677 5.97297L3.6677 6.41034ZM4.68524 7.0838L4.38145 7.39864C4.61649 7.62542 4.88805 7.90388 5.29848 8.31437L5.60786 8.00503L5.91724 7.6957C5.5181 7.2965 5.23136 7.0028 4.98903 6.76897L4.68524 7.0838ZM1.15527 12.8205L1.46463 13.1299L2.93022 11.6643L2.62086 11.3549L2.3115 11.0456L0.845914 12.5112L1.15527 12.8205Z" fill="#62748E" />
    <path d="M6.65049 4.25141L6.97977 3.96335H6.97977L6.65049 4.25141ZM6.79011 2.98063L7.08784 3.3012L7.09377 3.29569L7.0995 3.28996L6.79011 2.98063ZM7.45329 2.35921L7.72869 2.69915L7.72869 2.69915L7.45329 2.35921ZM12.1305 5.52918L11.7047 5.42837L11.7042 5.43082L12.1305 5.52918ZM8.37476 5.98303L8.06128 6.28826L8.06535 6.29233L8.37476 5.98303ZM11.3277 6.89073L11.6371 7.20006L11.3277 6.89073ZM10.3154 7.57849V7.14085L10.3045 7.14112L10.3154 7.57849ZM9.3595 6.96731L9.66843 6.65745L9.66332 6.65251L9.3595 6.96731ZM13.1315 1.46432C13.3023 1.29344 13.3023 1.01643 13.1314 0.845598C12.9605 0.674761 12.6835 0.674789 12.5127 0.845661L12.8221 1.15499L13.1315 1.46432ZM5.81013 5.2245C5.6398 5.39588 5.64066 5.67289 5.81204 5.84321C5.98342 6.01354 6.26043 6.01268 6.43076 5.8413L6.12044 5.5329L5.81013 5.2245ZM7.02093 4.62682L7.32895 4.31613V4.31613L7.02093 4.62682ZM8.14294 7.54356C7.97005 7.71235 7.96672 7.98934 8.1355 8.16223C8.30429 8.33513 8.58128 8.33846 8.75418 8.16967L8.44856 7.85661L8.14294 7.54356ZM6.65049 4.25141L6.97977 3.96335C6.87499 3.84358 6.85013 3.74835 6.85458 3.67746C6.85908 3.60575 6.89875 3.47681 7.08784 3.3012L6.79011 2.98063L6.49238 2.66007C6.1928 2.9383 6.00385 3.26322 5.9813 3.62267C5.95869 3.98293 6.10836 4.29617 6.32121 4.53948L6.65049 4.25141ZM6.79011 2.98063L7.0995 3.28996C7.2534 3.13602 7.39086 2.97285 7.72869 2.69915L7.45329 2.35921L7.17788 2.01927C6.79334 2.33082 6.60604 2.54595 6.48071 2.67131L6.79011 2.98063ZM7.45329 2.35921L7.72869 2.69915C8.31587 2.22344 9.79774 1.74105 11.0543 2.93805L11.3561 2.62127L11.6578 2.30449C9.98247 0.708561 7.98688 1.36385 7.17788 2.01927L7.45329 2.35921ZM11.3561 2.62127L11.038 2.92163C11.5568 3.4711 11.9769 4.27902 11.7047 5.42837L12.1305 5.52918L12.5562 5.62999C12.9123 4.12605 12.3421 3.02825 11.6742 2.3209L11.3561 2.62127ZM12.1305 5.52918L11.7042 5.43082C11.6213 5.79011 11.3735 6.2261 11.0183 6.5814L11.3277 6.89073L11.6371 7.20006C12.0849 6.75212 12.4302 6.17595 12.5568 5.62753L12.1305 5.52918ZM11.3277 6.89073L11.0183 6.5814C10.8224 6.7773 10.6978 6.9154 10.5624 7.02302C10.4388 7.1213 10.3677 7.14099 10.3154 7.14099V7.57849L10.3154 8.01599C10.6472 8.01599 10.9076 7.86636 11.1069 7.70803C11.2943 7.55905 11.4839 7.35328 11.6371 7.20006L11.3277 6.89073ZM10.3154 7.57849L10.3045 7.14112C10.2215 7.1432 10.1586 7.12088 10.0692 7.05123C9.95027 6.95861 9.86174 6.85026 9.66839 6.65749L9.3595 6.96731L9.0506 7.27714C9.17698 7.40313 9.35699 7.6056 9.53142 7.74149C9.73536 7.90037 9.99054 8.02425 10.3264 8.01585L10.3154 7.57849ZM9.3595 6.96731L9.66332 6.65251C9.42818 6.42558 9.09503 6.08472 8.68418 5.67372L8.37476 5.98303L8.06535 6.29233C8.46428 6.6914 8.81332 7.04822 9.05568 7.28212L9.3595 6.96731ZM12.8221 1.15499L12.5127 0.845661L11.0467 2.31194L11.3561 2.62127L11.6655 2.9306L13.1315 1.46432L12.8221 1.15499ZM6.12044 5.5329L6.43076 5.8413L7.33124 4.93522L7.02093 4.62682L6.71061 4.31842L5.81013 5.2245L6.12044 5.5329ZM8.44856 7.85661L8.75418 8.16967L9.66512 7.28037L9.3595 6.96731L9.05388 6.65426L8.14294 7.54356L8.44856 7.85661ZM8.37476 5.98303L8.68821 5.67782C8.18405 5.16004 7.66599 4.65029 7.32895 4.31613L7.02093 4.62682L6.7129 4.93751C7.05307 5.27477 7.56397 5.77747 8.06131 6.28824L8.37476 5.98303ZM7.02093 4.62682L7.32895 4.31613C7.13133 4.12021 7.0123 4.00054 6.97977 3.96335L6.65049 4.25141L6.32121 4.53948C6.38008 4.60677 6.53036 4.75653 6.7129 4.93751L7.02093 4.62682Z" fill="#62748E" />
  </svg>
)

/**
 * Phosphor Icons / dots-three.
 * The asset is 14x14 but Figma's frame is 12x14 with preserveAspectRatio none
 * — the glyph really is squashed horizontally in the design, so it is squashed
 * here too rather than "corrected".
 */
const DotsThree = (props) => (
  <svg width="12" height="14" viewBox="0 0 14 14" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <g clipPath="url(#topology-card-dots-three-clip)">
      <path d="M7 7.65625C7.36244 7.65625 7.65625 7.36244 7.65625 7C7.65625 6.63756 7.36244 6.34375 7 6.34375C6.63756 6.34375 6.34375 6.63756 6.34375 7C6.34375 7.36244 6.63756 7.65625 7 7.65625Z" fill="#45556C" />
      <path d="M10.7188 7.65625C11.0812 7.65625 11.375 7.36244 11.375 7C11.375 6.63756 11.0812 6.34375 10.7188 6.34375C10.3563 6.34375 10.0625 6.63756 10.0625 7C10.0625 7.36244 10.3563 7.65625 10.7188 7.65625Z" fill="#45556C" />
      <path d="M3.28125 7.65625C3.64369 7.65625 3.9375 7.36244 3.9375 7C3.9375 6.63756 3.64369 6.34375 3.28125 6.34375C2.91881 6.34375 2.625 6.63756 2.625 7C2.625 7.36244 2.91881 7.65625 3.28125 7.65625Z" fill="#45556C" />
    </g>
    <defs>
      <clipPath id="topology-card-dots-three-clip"><rect width="14" height="14" fill="white" /></clipPath>
    </defs>
  </svg>
)

/**
 * Huge Icons / dashboard-speed-02 (the speedometer the component description
 * names). Leaf art 13.0286x11.8286 drawn at a uniform 1.2x — 15.634x14.194 —
 * centred in the 17.28px frame, which is where Figma's nested
 * inset-[12.5%_8.33%…] / inset-[-4.76%_-4.28%…] pair lands it.
 *
 * Ratio check against PipeTopology's schematic sensor (viewBox
 * 15.3039x13.9123 -> 1.1001) vs this one (1.1014): same glyph, different
 * export scale. That is the confirmation this is the right asset.
 */
const DashboardSpeed02 = (props) => (
  <svg width="15.634" height="14.194" viewBox="0 0 13.0286 11.8286" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <circle cx="6.51429" cy="9.51429" r="1.8" stroke="#62748E" strokeWidth="1.02857" />
    <path d="M6.51429 7.71429V4.71429" stroke="#62748E" strokeWidth="1.02857" strokeLinecap="round" />
    <path d="M12.5143 6.51429C12.5143 3.20058 9.82799 0.514286 6.51429 0.514286C3.20058 0.514286 0.514286 3.20058 0.514286 6.51429" stroke="#62748E" strokeWidth="1.02857" strokeLinecap="round" />
  </svg>
)

/** Location Dot — 14px. Blue on Supply, red on Return, so: currentColor. */
const LocationDot = (props) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <circle opacity="0.1" cx="7" cy="7" r="4.42105" fill="currentColor" />
    <circle opacity="0.1" cx="7" cy="7" r="7" fill="currentColor" />
    <circle cx="7" cy="7" r="1.47368" fill="currentColor" />
  </svg>
)

/** The 7.2x1.2 rule between the speed badge and the valve pill. */
const PillConnector = (props) => (
  <svg width="7.2" height="1.2" viewBox="0 0 7.2 1.2" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <path d="M0 0.6H7.2" stroke="#CAD5E2" strokeWidth="1.2" />
  </svg>
)

/**
 * Valve status / Error, as drawn INSIDE the red/400 pill.
 * Same geometry as ValveStatus state="error" (viewBox 12.5281x12 x 1.2 =
 * 15.0337x14.4 — exact), but the design inverts the palette for the red
 * surface: the bulb fills #FF6467 and every stroke goes near-white. Those are
 * the fills the asset ships with, so they are kept rather than recoloured.
 * ValveStatus cannot express this and is not ours to edit, so the exported
 * asset is inlined here.
 */
const ValveErrorOnRed = (props) => (
  <svg width="16.766" height="16.005" viewBox="0 0 15.0337 14.4" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <path d="M7.51689 13.8689C10.2506 13.8689 12.4668 11.6527 12.4668 8.91899C12.4668 6.18524 10.2506 3.9691 7.51689 3.9691C4.78314 3.9691 2.567 6.18524 2.567 8.91899C2.567 11.6527 4.78314 13.8689 7.51689 13.8689Z" fill="#FF6467" stroke="#FEF2F2" strokeWidth="1.06221" strokeMiterlimit="10" strokeLinecap="round" />
    <path d="M7.51689 2.37582V0.633798" stroke="#FAFBFC" strokeWidth="1.06221" strokeMiterlimit="10" strokeLinecap="round" />
    <path d="M3.7638 0.531104H11.2701" stroke="#FAFBFC" strokeWidth="1.06221" strokeMiterlimit="10" strokeLinecap="round" />
    <g>
      <path d="M2.21647 8.4H0.531104" stroke="#FAFBFC" strokeWidth="1.06221" strokeMiterlimit="10" strokeLinecap="round" />
      <path d="M14.5026 8.40003H12.8173" stroke="#FAFBFC" strokeWidth="1.06221" strokeMiterlimit="10" strokeLinecap="round" />
    </g>
    <path d="M7.51689 6.00146V9.45363" stroke="#FAFBFC" strokeWidth="1.06221" strokeMiterlimit="10" strokeLinecap="round" />
    <path d="M7.51685 12.2437C7.92555 12.2437 8.25686 11.9124 8.25686 11.5037C8.25686 11.095 7.92555 10.7637 7.51685 10.7637C7.10816 10.7637 6.77685 11.095 6.77685 11.5037C6.77685 11.9124 7.10816 12.2437 7.51685 12.2437Z" fill="#FAFBFC" />
  </svg>
)

// ── Mock data ──────────────────────────────────────────────────────────────
// The two states the component set actually draws: an all-clear Supply line,
// and the Return line the Open loop variant shows offline with a failed valve.
// Used as the prop defaults so the card renders the design with no props.
const MOCK_SUPPLY = { valve: 'open', wifi: 'ok', connect: 'ok', more: 'ok', alert: false }
const MOCK_RETURN = { valve: 'error', wifi: 'alert', connect: 'ok', more: 'ok', alert: true }

const TITLE = {
  'water-line': 'Waterline',
  'open-loop': 'Open loop',
  // Not drawn in the component set — the design only componentised Waterline
  // and Open loop — but the app ships closed loop and PipeTopology draws it.
  // Dropping it to match a gap in the design would remove working behaviour.
  'closed-loop': 'Closed loop',
}

const VALVE_LABEL = {
  open: 'Open',
  closed: 'Closed',
  error: 'Error',
  unknown: 'Unknown',
  'no-valve': 'No valve',
}

// The two gradient washes the badges carry, lifted verbatim out of the design
// context. They differ only in angle: 152.45deg on the round speed badge,
// 170.45deg on the wider valve pill.
const SPEED_BADGE_WASH = 'linear-gradient(152.44793538949546deg, rgba(233, 238, 248, 0.8) 8.3855%, rgba(227, 235, 249, 0.8) 32.2%, rgba(228, 235, 250, 0.8) 40.822%, rgba(212, 226, 255, 0.8) 71.236%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)'
const VALVE_PILL_WASH = 'linear-gradient(170.4467830805812deg, rgba(233, 238, 248, 0.8) 8.3855%, rgba(227, 235, 249, 0.8) 32.2%, rgba(228, 235, 250, 0.8) 40.822%, rgba(212, 226, 255, 0.8) 71.236%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)'

/** The wash plus the mix-blend-color veil, as two stacked absolute layers. */
function BadgeWash({ image }) {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[var(--component\/badge\/radius,31.2px)]">
      <div className="absolute inset-0 rounded-[var(--component\/badge\/radius,31.2px)]" style={{ backgroundImage: image }} />
      <div className="absolute bg-[rgba(255,180,180,0.2)] inset-0 mix-blend-color rounded-[var(--component\/badge\/radius,31.2px)]" />
    </div>
  )
}

/**
 * One of the three small status badges on a Supply/Return row.
 *
 * shadcn Badge (Figma 136:1178). `alert` paints the red/400 surface the design
 * uses for the Return row's offline wifi; `variant="outline"` plus
 * border-transparent is what reproduces the plain, unfilled badge, since the
 * primitive's base carries a border the design does not draw.
 *
 * Only wifi-02 ships a second (white) tint, so only it inverts on the red
 * surface — connect and dots-three keep their shipped slate fill on either
 * background, which is exactly what the design does.
 *
 * The four spellings are written out rather than concatenated: see the header
 * note on why these classes have to be JSX attribute literals.
 */
function GlyphBadge({ alert, narrow, label, children }) {
  const inner = <div className="content-stretch flex flex-col items-start relative shrink-0">{children}</div>
  if (alert && narrow) {
    return (
      <Badge variant="outline" title={label} className="bg-[var(--colors\/red\/400,#ff6467)] border-transparent content-stretch flex gap-[var(--component\/badge\/gap,4px)] h-[20px] items-center justify-center overflow-clip px-[var(--component\/tabs\/trigger\/gap,6px)] py-[var(--component\/badge\/py,2px)] relative rounded-[var(--component\/badge\/radius,26px)] shrink-0 text-white w-[14px]">
        {inner}
      </Badge>
    )
  }
  if (alert) {
    return (
      <Badge variant="outline" title={label} className="bg-[var(--colors\/red\/400,#ff6467)] border-transparent content-stretch flex gap-[var(--component\/badge\/gap,4px)] h-[20px] items-center justify-center overflow-clip px-[var(--component\/tabs\/trigger\/gap,6px)] py-[var(--component\/badge\/py,2px)] relative rounded-[var(--component\/badge\/radius,26px)] shrink-0 text-white w-[21px]">
        {inner}
      </Badge>
    )
  }
  if (narrow) {
    return (
      <Badge variant="outline" title={label} className="border-transparent content-stretch flex gap-[var(--component\/badge\/gap,4px)] h-[20px] items-center justify-center overflow-clip px-[var(--component\/tabs\/trigger\/gap,6px)] py-[var(--component\/badge\/py,2px)] relative rounded-[var(--component\/badge\/radius,26px)] shrink-0 text-[color:var(--colors\/slate\/500,#62748e)] w-[14px]">
        {inner}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" title={label} className="border-transparent content-stretch flex gap-[var(--component\/badge\/gap,4px)] h-[20px] items-center justify-center overflow-clip px-[var(--component\/tabs\/trigger\/gap,6px)] py-[var(--component\/badge\/py,2px)] relative rounded-[var(--component\/badge\/radius,26px)] shrink-0 text-[color:var(--colors\/slate\/500,#62748e)] w-[21px]">
      {inner}
    </Badge>
  )
}

/** The round 24px speedometer badge that opens the valve line. */
function SpeedBadge() {
  return (
    <div className="content-stretch flex gap-[var(--component\/badge\/gap,4.8px)] items-center justify-center overflow-clip px-[var(--component\/tabs\/trigger\/gap,7.2px)] py-[var(--component\/badge\/py,2.4px)] relative rounded-[var(--component\/badge\/radius,31.2px)] shrink-0 size-[24px]">
      <BadgeWash image={SPEED_BADGE_WASH} />
      <div className="content-stretch flex flex-col items-start relative shrink-0">
        <div className="flex items-center justify-center overflow-clip relative shrink-0 size-[17.28px]">
          <DashboardSpeed02 />
        </div>
      </div>
    </div>
  )
}

/**
 * The valve pill. `error` is the only state the design draws red, and when it
 * does it swaps the surface, the label colour and the glyph palette together —
 * so the three are coupled here rather than exposed as separate knobs.
 *
 * 16.766 is the size at which ValveStatus's 12.5282x12 viewBox meet-fits to
 * the 16.766x16.005 group Figma places in the 23.04px slot.
 */
function ValvePill({ state, label }) {
  const text = label ?? VALVE_LABEL[state] ?? VALVE_LABEL.open

  if (state === 'error') {
    return (
      <div className="bg-[var(--colors\/red\/400,#ff6467)] content-stretch flex gap-[var(--component\/badge\/gap,4.8px)] h-[24px] items-center justify-center overflow-clip px-[var(--component\/tabs\/trigger\/gap,7.2px)] py-[var(--component\/badge\/py,2.4px)] relative rounded-[var(--component\/badge\/radius,31.2px)] shrink-0">
        <div className="content-stretch flex flex-col items-start relative shrink-0">
          <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[23.04px]">
            <ValveErrorOnRed />
          </div>
        </div>
        <p className="[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-[number:var(--font\/weight\/font-medium,500)] leading-[19.2px] overflow-hidden relative shrink-0 text-[#fafbfc] text-[14.4px] text-ellipsis whitespace-nowrap">
          {text}
        </p>
      </div>
    )
  }

  return (
    <div className="content-stretch flex gap-[var(--component\/badge\/gap,4.8px)] h-[24px] items-center justify-center overflow-clip px-[var(--component\/tabs\/trigger\/gap,7.2px)] py-[var(--component\/badge\/py,2.4px)] relative rounded-[var(--component\/badge\/radius,31.2px)] shrink-0">
      <BadgeWash image={VALVE_PILL_WASH} />
      <div className="content-stretch flex flex-col items-start relative shrink-0">
        <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[23.04px]">
          {/* No title: the pill already carries the state as visible text, and
              titling the glyph too makes a screen reader say it twice. */}
          <ValveStatus state={state} size={16.766} />
        </div>
      </div>
      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-[number:var(--font\/weight\/font-medium,500)] leading-[19.2px] overflow-hidden relative shrink-0 text-[14.4px] text-[color:var(--colors\/slate\/600,#45556c)] text-ellipsis whitespace-nowrap">
        {text}
      </p>
    </div>
  )
}

/**
 * A Supply or Return line: the label row (dot + name + three status badges)
 * over the valve row (speed badge + connector + valve pill).
 *
 * `tight` is the loop layout, where the three badges sit in their own
 * gap-[2px] group; the waterline lays them out flat on the parent's gap-[4px].
 * `trailingSlot` is the empty 14px reservation the design leaves at the end of
 * a Supply label row (Figma 198355:122256 / 198424:61581). It holds nothing —
 * it exists to hold the row's right edge where the design puts it — and the
 * Return row does not have one.
 */
function TelemetryRow({ row, label, tight, trailingSlot }) {
  const badges = (
    <>
      <GlyphBadge alert={row.wifi === 'alert'} label={label + ' connectivity'}>
        <div className="flex items-center justify-center overflow-clip relative shrink-0 size-[14px]">
          <Wifi02 />
        </div>
      </GlyphBadge>
      <GlyphBadge alert={row.connect === 'alert'} label={label + ' control unit link'}>
        <div className="relative shrink-0 size-[14px]">
          <Connect />
        </div>
      </GlyphBadge>
      {/* Deliberately inert. The design draws dots-three as a status glyph on
          the row, not a menu affordance, and there is no designed destination
          for it — give it a handler only once one exists. */}
      <GlyphBadge alert={row.more === 'alert'} narrow label={label + ' — more'}>
        <div className="h-[14px] relative shrink-0 w-[12px]">
          <DotsThree />
        </div>
      </GlyphBadge>
    </>
  )

  const labelRow = (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
      <div className={row.alert ? 'relative shrink-0 size-[14px] text-[#FB2C36]' : 'relative shrink-0 size-[14px] text-[#2B7FFF]'}>
        <LocationDot />
      </div>
      <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-[number:var(--font\/weight\/font-medium,500)] justify-center leading-[0] relative shrink-0 text-[color:var(--colors\/slate\/600,#45556c)] text-[length:var(--text\/base\/size,16px)] whitespace-nowrap">
        <p className="leading-[var(--text\/base\/lh,24px)]">{label}</p>
      </div>
      {tight ? <div className="content-stretch flex gap-[2px] items-center relative shrink-0">{badges}</div> : badges}
    </div>
  )

  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[10px] items-start min-w-px relative">
      {trailingSlot ? (
        <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
          {labelRow}
          <div aria-hidden className="content-stretch flex gap-[var(--spacing\/2,8px)] h-[20px] items-center relative rounded-bl-[8px] rounded-br-[8px] rounded-tl-[8px] shrink-0 w-[14px]" />
        </div>
      ) : (
        labelRow
      )}

      <div className="content-stretch flex items-center relative shrink-0">
        <div className="content-stretch flex items-end relative shrink-0">
          <SpeedBadge />
        </div>
        <div className="h-0 relative shrink-0 w-[7.2px]">
          <div className="absolute inset-[-0.6px_0]">
            <PillConnector />
          </div>
        </div>
        <div className="content-stretch flex items-end relative shrink-0">
          <ValvePill state={row.valve} label={row.valveLabel} />
        </div>
      </div>
    </div>
  )
}

/**
 * @param topology  'water-line' | 'open-loop' | 'closed-loop' — picks the title
 *                  and is handed straight to PipeTopology.
 * @param supply    { valve, valveLabel?, wifi, connect, more, alert }, where
 *                  each of wifi/connect/more is 'ok' | 'alert' and `alert`
 *                  reddens the location dot. Pass null for the empty state:
 *                  header only, no telemetry, schematic drawn with no valve.
 * @param ret       the same shape for the Return line. Omit it — the Waterline
 *                  variant, and any loop with no return telemetry yet — and the
 *                  row is not rendered and Supply runs the full column width,
 *                  which is the Waterline variant exactly.
 * @param onAction  click handler for the "Action" pill. Omit it and the pill
 *                  renders inert rather than dead-but-clickable.
 */
export default function TopologyCard({
  topology = 'water-line',
  supply = MOCK_SUPPLY,
  ret = null,
  onAction,
  className,
}) {
  const title = TITLE[topology] ?? TITLE['water-line']
  const isLoop = Boolean(ret)

  return (
    <div
      className={cn(
        'bg-[#fafbfc] border border-solid border-white content-stretch flex items-center max-w-[680px] min-h-[136px] px-[18px] py-[12px] relative rounded-[var(--rounded-2xl,18px)] w-full',
        className,
      )}
      data-node-id={isLoop ? '198356:122834' : '198356:122565'}
    >
      {/* gap-x-0 keeps the designed zero gutter while the two columns fit side
          by side; the row gap only applies once flex-wrap has stacked them,
          which is what happens at phone width. */}
      <div className="content-stretch flex flex-[1_0_0] flex-wrap gap-x-0 gap-y-[12px] items-center justify-between min-w-px relative self-stretch">
        <div className="content-stretch flex flex-1 flex-col gap-[10px] items-start justify-between max-w-full min-h-[112px] min-w-0 relative self-stretch w-[290px]">
          {/* Header */}
          <div className="content-stretch flex gap-[10px] items-center relative shrink-0">
            <div className="content-stretch flex gap-[10px] items-center relative shrink-0">
              <div className="content-stretch flex items-center relative shrink-0">
                <p className="[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:SemiBold'),'Figtree','Inter',sans-serif] font-[number:var(--font\/weight\/font-medium,600)] leading-[var(--text\/base\/lh,24px)] relative shrink-0 text-[color:var(--colors\/slate\/900,#0f172b)] text-[length:var(--text\/base\/size,16px)] whitespace-nowrap" dir="auto">
                  {title}
                </p>
              </div>
              {/* shadcn Button, size xs — Figma's Button 6716:46634 binds
                  button/size-xs/px, button/size-xs/radius and the xs height.
                  shadow-none cancels the primitive's shadow-xs: the design's
                  drop-shadow is two fully transparent layers, i.e. none.
                  With no onAction it is rendered inert (aria-disabled, no
                  handler, default cursor) rather than as a live-looking button
                  that does nothing. */}
              {onAction ? (
                <Button variant="outline" size="xs" onClick={onAction} className="bg-[#f2f6ff] border border-[var(--wint-blue-accent,#0b81f8)] border-solid content-stretch cursor-pointer flex gap-[var(--spacing\/1,4px)] h-[24px] items-center justify-center px-[var(--component\/button\/size-xs\/px,10px)] py-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-xs\/radius,26px)] shadow-none shrink-0">
                  <span className="[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-medium leading-[var(--text\/button-xs\/size,12px)] relative shrink-0 text-[color:var(--wint-blue-accent,#0b81f8)] text-[length:var(--text\/button-xs\/size,12px)] whitespace-nowrap">
                    Action
                  </span>
                </Button>
              ) : (
                <Button variant="outline" size="xs" aria-disabled="true" className="bg-[#f2f6ff] border border-[var(--wint-blue-accent,#0b81f8)] border-solid content-stretch cursor-default flex gap-[var(--spacing\/1,4px)] h-[24px] items-center justify-center px-[var(--component\/button\/size-xs\/px,10px)] py-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-xs\/radius,26px)] shadow-none shrink-0">
                  <span className="[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-medium leading-[var(--text\/button-xs\/size,12px)] relative shrink-0 text-[color:var(--wint-blue-accent,#0b81f8)] text-[length:var(--text\/button-xs\/size,12px)] whitespace-nowrap">
                    Action
                  </span>
                </Button>
              )}
            </div>
          </div>

          {/* Telemetry. No supply -> the header-only empty state. */}
          {supply && isLoop ? (
            <div className="content-stretch flex items-end relative shrink-0 w-full">
              <div className="content-stretch flex flex-[1_0_0] gap-[7px] items-end min-w-px py-[6px] relative rounded-[14px]">
                <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative">
                  <TelemetryRow row={supply} label="Supply" tight trailingSlot />
                </div>
                <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative">
                  <TelemetryRow row={ret} label="Return" tight trailingSlot={false} />
                </div>
              </div>
            </div>
          ) : null}

          {supply && !isLoop ? (
            <div className="content-stretch flex items-start py-[6px] relative shrink-0 w-full">
              <TelemetryRow row={supply} label="Supply" tight={false} trailingSlot />
            </div>
          ) : null}
        </div>

        {/* Schematic panel. PipeTopology owns every symbol and every offset;
            this card only supplies the #f2f6ff panel it sits in. */}
        <div className="bg-[#f2f6ff] content-stretch flex flex-1 items-center justify-center min-h-[112px] min-w-[177px] relative rounded-[12px] self-stretch">
          <PipeTopology topology={topology} valve={supply ? supply.valve : 'no-valve'} />
        </div>
      </div>
    </div>
  )
}
