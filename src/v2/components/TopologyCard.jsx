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
 * RE-DERIVED 2026-09-27 against the current design. The card was restructured:
 * the header is now its own full-width row (198616:115397 / 198616:114520)
 * stacked above a `gap-[14px]` body row (198616:115398 / 198616:114521) that
 * holds the schematic panel beside one or two telemetry panels. The telemetry
 * itself is no longer hand-built here — the design componentised it as
 * "IOT overview" (198629:42392, instances 198629:42879 on Waterline and
 * 198629:42806 / 198629:42733 on Open loop), which is what IotOverview below
 * implements node-for-node.
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
 * Five places the Figma output could not be kept literally:
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
 *      repo's phone is 393px. The root is fluid up to the designed 680, and
 *      the body row carries `flex-wrap` + `gap-x-[14px] gap-y-[12px]`, so at
 *      desktop width the panels sit side by side exactly as drawn (Waterline
 *      350 + 14 + 280 = 644; Open loop 268.8 + 14 + 173.6 + 14 + 173.6 = 644)
 *      and at phone width they wrap onto their own lines instead of being
 *      squeezed below their content. No media queries — the card lives inside
 *      a 393px div, not a 393px viewport.
 *   4. Schematic panel height. The design now fixes it at `h-[82px]`
 *      (198453:40479 / 198616:114522). PipeTopology draws a fixed 177x112
 *      tile whose open-loop art plus its RETURN caption needs ~93px, so an
 *      82px box would clip it; matching the design means rescaling
 *      PipeTopology, which is a different file. `min-h-[112px]` therefore
 *      stays and the panel renders 30px taller than drawn. Same reason the
 *      Open loop panel does not take Figma's `pl-[41px]`: that padding exists
 *      to clear the SUPPLY/RETURN captions, which PipeTopology already draws
 *      inside its own tile.
 *   5. The component set also gained three 339px phone variants (198629:55320
 *      "side", 198629:58287 "Default_mobile", 198629:62727 "Variant5"). They
 *      are NOT implemented here: Default_mobile drops the schematic panel
 *      entirely, and this card has no viewport signal to branch on — it is
 *      handed a width by its parent. Implementing them is a separate prop
 *      (`layout="mobile"`), not a rewrite of these two.
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
// design actually draws it in two colours. wifi-connected-02 ships #0A0A0A on
// the white badge and inverts to white on the red/400 alert badge this file
// keeps for the offline state -> currentColor. Location Dot ships #2B7FFF on
// Supply and #FB2C36 on Return -> currentColor. connect (#62748E), ram-2-line
// (#90A1B9), dots-three (#45556C) and dashboard-speed-02 (#62748E) are drawn
// one way everywhere, so they keep the fill the asset ships with.
//
// wifi-02 is gone: the redesigned IOT overview badge (198629:42407) draws
// "Huge Icons / wifi-connected-02" instead — the same arcs plus a check mark.

/**
 * Huge Icons / wifi-connected-02 (198629:42407) — leaf art 10.9966x8.998,
 * which is exactly centred in the design's 12px badge slot, so the slot only
 * has to be a centring flex box.
 */
const WifiConnected02 = (props) => (
  <svg width="10.9966" height="8.998" viewBox="0 0 14.6634 11.9967" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <path d="M11.665 5.665C9.15328 3.44278 5.66501 3.44278 2.99835 5.665" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M0.665014 3.33167C4.87554 -0.223873 9.78782 -0.22388 13.9983 3.33159" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.33168 9.99837C5.33168 9.99837 5.99835 9.99837 6.66501 11.3317C6.66501 11.3317 8.31608 8.73281 9.99835 7.66565" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * Remix Icons / ram-2-line (198629:42399) — the chip glyph that now opens the
 * label row. Figma stretches the 16.4571 export over a 19.2px frame
 * (`inset-0` + `size-full`), so it is drawn at 19.2 rather than its own 16.46.
 * Shipped #90A1B9 in both variants, so the fill stays.
 */
const Ram2Line = (props) => (
  <svg width="19.2" height="19.2" viewBox="0 0 16.4571 16.4571" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <path d="M1.37143 3.42857C0.992722 3.42857 0.685714 3.73558 0.685714 4.11429V10.2857C0.685714 10.6644 0.992722 10.9714 1.37143 10.9714V12.3429C1.37143 12.7216 1.67844 13.0286 2.05714 13.0286H7.14117L7.82688 12.3429H8.63026L9.31598 13.0286H14.4C14.7787 13.0286 15.0857 12.7216 15.0857 12.3429V10.9714C15.4644 10.9714 15.7714 10.6644 15.7714 10.2857V4.11429C15.7714 3.73558 15.4644 3.42857 15.0857 3.42857H1.37143ZM13.7143 10.9714V11.6571H9.88402L9.19831 10.9714H13.7143ZM7.25883 10.9714L6.57311 11.6571H2.74286V10.9714H7.25883ZM2.05714 9.6V4.8H14.4V9.6H2.05714ZM3.42857 6.17143H4.8V8.22857H3.42857V6.17143ZM7.54286 6.17143H6.17143V8.22857H7.54286V6.17143ZM8.91429 6.17143H10.2857V8.22857H8.91429V6.17143ZM13.0286 6.17143H11.6571V8.22857H13.0286V6.17143Z" fill="#90A1B9" />
  </svg>
)

/** Huge Icons / connect — the asset is a 14px frame, drawn at 12px in the
    redesigned badge (198629:42404). */
const Connect = (props) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <path d="M7.33167 9.73582L7.00241 10.0239V10.0239L7.33167 9.73582ZM7.19209 11.006L6.89439 10.6854L6.88845 10.6909L6.88273 10.6966L7.19209 11.006ZM6.52908 11.6271L6.25371 11.2872H6.25371L6.52908 11.6271ZM1.85317 8.45867L2.2789 8.5595L2.27947 8.55704L1.85317 8.45867ZM5.60786 8.00503L5.92131 7.69976L5.91724 7.6957L5.60786 8.00503ZM2.65575 7.09776L2.96511 7.40712L2.65575 7.09776ZM3.6677 6.41034V6.84797L3.67864 6.8477L3.6677 6.41034ZM4.68524 7.0838L4.37634 7.3937L4.38145 7.39864L4.68524 7.0838ZM0.845914 12.5112C0.67506 12.682 0.67506 12.959 0.845914 13.1299C1.01677 13.3007 1.29378 13.3007 1.46463 13.1299L1.15527 12.8205L0.845914 12.5112ZM7.33167 9.73582L7.00241 10.0239C7.10715 10.1436 7.13195 10.2387 7.12751 10.3095C7.12302 10.3811 7.08341 10.5099 6.89439 10.6854L7.19209 11.006L7.48978 11.3266C7.7893 11.0485 7.97824 10.7237 8.00079 10.3643C8.0234 10.0041 7.87373 9.69093 7.66092 9.44772L7.33167 9.73582ZM7.19209 11.006L6.88273 10.6966C6.72886 10.8505 6.59145 11.0136 6.25371 11.2872L6.52908 11.6271L6.80446 11.9671C7.1889 11.6557 7.37616 11.4406 7.50145 11.3153L7.19209 11.006ZM6.52908 11.6271L6.25371 11.2872C5.66921 11.7606 4.18066 12.2363 2.92258 11.0381L2.62086 11.3549L2.31913 11.6717C3.99223 13.2652 5.99317 12.6242 6.80446 11.9671L6.52908 11.6271ZM2.62086 11.3549L2.93893 11.0545C2.42099 10.5061 2.00664 9.70901 2.27889 8.55949L1.85317 8.45867L1.42745 8.35784C1.07159 9.86033 1.6343 10.9475 2.30279 11.6553L2.62086 11.3549ZM5.60786 8.00503L5.29444 8.31028C5.68827 8.71466 6.08992 9.11348 6.40741 9.42783C6.7361 9.75326 6.95252 9.96689 7.00241 10.0239L7.33167 9.73582L7.66092 9.44772C7.58374 9.35951 7.32908 9.10904 7.02304 8.80604C6.70581 8.49195 6.30909 8.09799 5.92128 7.69979L5.60786 8.00503ZM1.85317 8.45867L2.27947 8.55704C2.36233 8.19799 2.61 7.76223 2.96511 7.40712L2.65575 7.09776L2.34639 6.78841C1.89866 7.23614 1.55338 7.81208 1.42687 8.36029L1.85317 8.45867ZM2.65575 7.09776L2.96511 7.40712C3.16092 7.21132 3.28545 7.07329 3.42082 6.96573C3.54442 6.86751 3.6155 6.84784 3.6677 6.84784V6.41034V5.97284C3.33606 5.97284 3.07564 6.1224 2.87647 6.28066C2.68906 6.42958 2.49953 6.63527 2.34639 6.78841L2.65575 7.09776ZM3.6677 6.41034L3.67864 6.8477C3.74468 6.84605 3.82037 6.86919 3.9401 6.96511C4.07787 7.07548 4.186 7.2039 4.37638 7.39366L4.68524 7.0838L4.9941 6.77395C4.86484 6.6451 4.67357 6.43155 4.48717 6.28222C4.28273 6.11844 4.00946 5.96415 3.65677 5.97297L3.6677 6.41034ZM4.68524 7.0838L4.38145 7.39864C4.61649 7.62542 4.88805 7.90388 5.29848 8.31437L5.60786 8.00503L5.91724 7.6957C5.5181 7.2965 5.23136 7.0028 4.98903 6.76897L4.68524 7.0838ZM1.15527 12.8205L1.46463 13.1299L2.93022 11.6643L2.62086 11.3549L2.3115 11.0456L0.845914 12.5112L1.15527 12.8205Z" fill="#62748E" />
    <path d="M6.65049 4.25141L6.97977 3.96335H6.97977L6.65049 4.25141ZM6.79011 2.98063L7.08784 3.3012L7.09377 3.29569L7.0995 3.28996L6.79011 2.98063ZM7.45329 2.35921L7.72869 2.69915L7.72869 2.69915L7.45329 2.35921ZM12.1305 5.52918L11.7047 5.42837L11.7042 5.43082L12.1305 5.52918ZM8.37476 5.98303L8.06128 6.28826L8.06535 6.29233L8.37476 5.98303ZM11.3277 6.89073L11.6371 7.20006L11.3277 6.89073ZM10.3154 7.57849V7.14085L10.3045 7.14112L10.3154 7.57849ZM9.3595 6.96731L9.66843 6.65745L9.66332 6.65251L9.3595 6.96731ZM13.1315 1.46432C13.3023 1.29344 13.3023 1.01643 13.1314 0.845598C12.9605 0.674761 12.6835 0.674789 12.5127 0.845661L12.8221 1.15499L13.1315 1.46432ZM5.81013 5.2245C5.6398 5.39588 5.64066 5.67289 5.81204 5.84321C5.98342 6.01354 6.26043 6.01268 6.43076 5.8413L6.12044 5.5329L5.81013 5.2245ZM7.02093 4.62682L7.32895 4.31613V4.31613L7.02093 4.62682ZM8.14294 7.54356C7.97005 7.71235 7.96672 7.98934 8.1355 8.16223C8.30429 8.33513 8.58128 8.33846 8.75418 8.16967L8.44856 7.85661L8.14294 7.54356ZM6.65049 4.25141L6.97977 3.96335C6.87499 3.84358 6.85013 3.74835 6.85458 3.67746C6.85908 3.60575 6.89875 3.47681 7.08784 3.3012L6.79011 2.98063L6.49238 2.66007C6.1928 2.9383 6.00385 3.26322 5.9813 3.62267C5.95869 3.98293 6.10836 4.29617 6.32121 4.53948L6.65049 4.25141ZM6.79011 2.98063L7.0995 3.28996C7.2534 3.13602 7.39086 2.97285 7.72869 2.69915L7.45329 2.35921L7.17788 2.01927C6.79334 2.33082 6.60604 2.54595 6.48071 2.67131L6.79011 2.98063ZM7.45329 2.35921L7.72869 2.69915C8.31587 2.22344 9.79774 1.74105 11.0543 2.93805L11.3561 2.62127L11.6578 2.30449C9.98247 0.708561 7.98688 1.36385 7.17788 2.01927L7.45329 2.35921ZM11.3561 2.62127L11.038 2.92163C11.5568 3.4711 11.9769 4.27902 11.7047 5.42837L12.1305 5.52918L12.5562 5.62999C12.9123 4.12605 12.3421 3.02825 11.6742 2.3209L11.3561 2.62127ZM12.1305 5.52918L11.7042 5.43082C11.6213 5.79011 11.3735 6.2261 11.0183 6.5814L11.3277 6.89073L11.6371 7.20006C12.0849 6.75212 12.4302 6.17595 12.5568 5.62753L12.1305 5.52918ZM11.3277 6.89073L11.0183 6.5814C10.8224 6.7773 10.6978 6.9154 10.5624 7.02302C10.4388 7.1213 10.3677 7.14099 10.3154 7.14099V7.57849L10.3154 8.01599C10.6472 8.01599 10.9076 7.86636 11.1069 7.70803C11.2943 7.55905 11.4839 7.35328 11.6371 7.20006L11.3277 6.89073ZM10.3154 7.57849L10.3045 7.14112C10.2215 7.1432 10.1586 7.12088 10.0692 7.05123C9.95027 6.95861 9.86174 6.85026 9.66839 6.65749L9.3595 6.96731L9.0506 7.27714C9.17698 7.40313 9.35699 7.6056 9.53142 7.74149C9.73536 7.90037 9.99054 8.02425 10.3264 8.01585L10.3154 7.57849ZM9.3595 6.96731L9.66332 6.65251C9.42818 6.42558 9.09503 6.08472 8.68418 5.67372L8.37476 5.98303L8.06535 6.29233C8.46428 6.6914 8.81332 7.04822 9.05568 7.28212L9.3595 6.96731ZM12.8221 1.15499L12.5127 0.845661L11.0467 2.31194L11.3561 2.62127L11.6655 2.9306L13.1315 1.46432L12.8221 1.15499ZM6.12044 5.5329L6.43076 5.8413L7.33124 4.93522L7.02093 4.62682L6.71061 4.31842L5.81013 5.2245L6.12044 5.5329ZM8.44856 7.85661L8.75418 8.16967L9.66512 7.28037L9.3595 6.96731L9.05388 6.65426L8.14294 7.54356L8.44856 7.85661ZM8.37476 5.98303L8.68821 5.67782C8.18405 5.16004 7.66599 4.65029 7.32895 4.31613L7.02093 4.62682L6.7129 4.93751C7.05307 5.27477 7.56397 5.77747 8.06131 6.28824L8.37476 5.98303ZM7.02093 4.62682L7.32895 4.31613C7.13133 4.12021 7.0123 4.00054 6.97977 3.96335L6.65049 4.25141L6.32121 4.53948C6.38008 4.60677 6.53036 4.75653 6.7129 4.93751L7.02093 4.62682Z" fill="#62748E" />
  </svg>
)

/**
 * Phosphor Icons / dots-three, 16px square.
 *
 * It used to sit in a 12x14 frame with `preserveAspectRatio: none`, i.e.
 * horizontally squashed. That frame is gone: the glyph now fills the trailing
 * Button's square 16px Icon Placeholder (198629:42420), so it is drawn square.
 *
 * THE TRAP — the same one AlertCard.jsx documents. get_design_context serves
 * the Button component's DEFAULT Icon Placeholder artwork for this slot, a
 * Huge Icons smile face, under a variable named `imgPhosphorIconsDotsThree`.
 * The variable name and the node screenshot both say dots-three, and the smile
 * arrives wrapped in `-rotate-180 -scale-x-100` which belongs to the
 * placeholder, not to this glyph. So: the real dots-three, and no flip.
 *
 */
const DotsThree = (props) => (
  <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
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

/**
 * Location Dot (198629:42402) — 20px, up from 14px, and it now sits AFTER the
 * row label rather than before it. Blue on Supply, red on Return, so:
 * currentColor. Same three concentric circles, re-exported at the new size.
 */
const LocationDot = (props) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <circle opacity="0.1" cx="10" cy="10" r="6.31579" fill="currentColor" />
    <circle opacity="0.1" cx="10" cy="10" r="10" fill="currentColor" />
    <circle cx="10" cy="10" r="2.10526" fill="currentColor" />
  </svg>
)

/** The 7.2x1.2 rule between the speed badge and the valve pill. */
const PillConnector = (props) => (
  <svg width="7.2" height="1.2" viewBox="0 0 7.2 1.2" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <path d="M0 0.6H7.2" stroke="#CAD5E2" strokeWidth="1.2" />
  </svg>
)

/**
 * "Line 18" (198629:42409) — the 41x1 rule that drops from the label row down
 * to the valve row inside an IOT overview panel. Figma draws it horizontally
 * and rotates the wrapper 90deg; that wrapper is reproduced verbatim below so
 * the left-[12px]/top-[22px] anchor keeps its meaning.
 */
const BranchConnector = (props) => (
  <svg width="41" height="1" viewBox="0 0 41 1" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <path d="M0 0.5H41" stroke="#CAD5E2" />
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
// An all-clear Supply line, and a Return line that is offline with a failed
// valve. Used as the prop defaults so the card renders with no props.
//
// The current comps draw every row healthy — the Open loop variant no longer
// shows the offline Return it used to. These defaults keep exercising the
// alert path anyway, because `wifi`/`connect`/`more`/`alert` and the valve
// error state are real wiring the app drives; deleting them to match a comp
// that stopped illustrating them would remove working behaviour.
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

// The header button's label is variant copy, not a generic "Action": the
// Waterline frame closes one valve, the loops close both.
const ACTION_LABEL = {
  'water-line': 'Close valve',
  'open-loop': 'Close all valves',
  // Not componentised (see TITLE) — a closed loop has the same two valves as an
  // open one, so it takes the same copy.
  'closed-loop': 'Close all valves',
}

// The two-layer gradient wash (SPEED_BADGE_WASH / VALVE_PILL_WASH) plus its
// mix-blend-color veil are GONE. The redesign flattened both badges: the speed
// badge (198629:42414) now carries no fill at all and the valve pill
// (198629:42419) is plain `bg-white`. The wash's lower layer was already solid
// white, so the pill only loses the blue tint sitting on top of it.

/**
 * One of the two small status badges that trail a Supply/Return label.
 *
 * shadcn Badge (Figma 136:1178). The design now fills them: a plain badge is
 * `bg-white` at a square `size-[20px]` (198629:42405 / 198629:42408), where it
 * used to be an unfilled 20x21 / 20x14 pair. The `narrow` variant is gone with
 * the dots-three badge it existed for — dots-three is a Button on the valve row
 * now. `variant="outline"` plus border-transparent still cancels the
 * primitive's base border, which the design does not draw.
 *
 * `alert` paints the red/400 surface for the offline state. The current comps
 * draw every row healthy, so red is no longer sourced from a Figma frame — it
 * is kept because `row.wifi`/`row.connect` are real data wiring and dropping
 * the state would delete a rendered distinction the app relies on. red/400 is
 * the same token the valve pill's error state uses.
 *
 * Only wifi-connected-02 ships a second (white) tint, so only it inverts on the
 * red surface — connect keeps its shipped slate fill on either background,
 * which is exactly what the design does.
 *
 * Both spellings are written out rather than concatenated: see the header note
 * on why these classes have to be JSX attribute literals.
 */
function GlyphBadge({ alert, label, children }) {
  const inner = <div className="content-stretch flex flex-col items-start relative shrink-0">{children}</div>
  if (alert) {
    return (
      <Badge variant="outline" title={label} className="bg-[var(--colors\/red\/400,#ff6467)] border-transparent content-stretch flex gap-[var(--component\/badge\/gap,4px)] items-center justify-center overflow-clip px-[var(--component\/sheet\/header\/gap,6px)] py-[var(--component\/badge\/py,2px)] relative rounded-[var(--component\/badge\/radius,26px)] shrink-0 size-[20px] text-white">
        {inner}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" title={label} className="bg-white border-transparent content-stretch flex gap-[var(--component\/badge\/gap,4px)] items-center justify-center overflow-clip px-[var(--component\/sheet\/header\/gap,6px)] py-[var(--component\/badge\/py,2px)] relative rounded-[var(--component\/badge\/radius,26px)] shrink-0 size-[20px] text-[#0a0a0a]">
      {inner}
    </Badge>
  )
}

/**
 * The round 24px speedometer badge that opens the valve line. No fill: the
 * redesigned badge (198629:42414) carries no bg-* class at all, so it reads as
 * a glyph sitting directly on the panel's #f2f6ff.
 */
function SpeedBadge() {
  return (
    <div className="content-stretch flex gap-[var(--component\/badge\/gap,4.8px)] items-center justify-center overflow-clip px-[var(--component\/tabs\/trigger\/gap,7.2px)] py-[var(--component\/badge\/py,2.4px)] relative rounded-[var(--component\/badge\/radius,31.2px)] shrink-0 size-[24px]">
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
        <p className="[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-[number:var(--font\/weight\/font-medium,500)] leading-[19.2px] overflow-hidden relative min-w-px text-[#fafbfc] text-[14.4px] text-ellipsis whitespace-nowrap">
          {text}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white content-stretch flex gap-[var(--component\/badge\/gap,4.8px)] h-[24px] items-center justify-center overflow-clip px-[var(--component\/tabs\/trigger\/gap,7.2px)] py-[var(--component\/badge\/py,2.4px)] relative rounded-[var(--component\/badge\/radius,31.2px)] shrink-0">
      <div className="content-stretch flex flex-col items-start relative shrink-0">
        <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[23.04px]">
          {/* No title: the pill already carries the state as visible text, and
              titling the glyph too makes a screen reader say it twice. */}
          <ValveStatus state={state} size={16.766} />
        </div>
      </div>
      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-[number:var(--font\/weight\/font-medium,500)] leading-[19.2px] overflow-hidden relative min-w-px text-[14.4px] text-[color:var(--colors\/slate\/600,#45556c)] text-ellipsis whitespace-nowrap">
        {text}
      </p>
    </div>
  )
}

/**
 * "IOT overview" (Figma component 198629:42392) — one Supply or Return line,
 * which the design now draws as its own #f2f6ff panel rather than loose on the
 * card background: `h-[82px] px-[9px] py-[6px] rounded-[12px]`.
 *
 * Inside it, a `justify-between` column holds the label row (ram-2-line badge,
 * name, location dot, connectivity badges) over the valve row (speed badge,
 * connector, valve pill, more button), with a rotated rule linking the two.
 * This replaces the old TelemetryRow, whose composition was three revisions
 * out of date: the dot led the row at 14px, the badges were unfilled 20x21 /
 * 20x14, wifi-02 stood in for wifi-connected-02, and dots-three was a third
 * status badge rather than a Button on the valve row.
 *
 * The 14px trailing spacer that used to hold a Supply label row's right edge
 * (it cited Figma 198355:122256 / 198424:61581, both since deleted) is gone —
 * 198629:42393 now simply ends at the last badge, and the inner column's
 * `justify-between` is what distributes the two rows.
 *
 * `grow` is the Waterline layout, where the single panel takes the width the
 * schematic leaves (`flex-[1_0_0]`); the Open loop pair sit at their content
 * width instead. Neither takes Figma's `min-w-px`: letting the panel shrink
 * below its content would clip the valve row at phone width, where what the
 * design wants is for the body row to wrap.
 */
function IotOverview({ row, label, grow, nodeId }) {
  const panel = (
    <div className="content-stretch flex flex-col h-full items-start justify-between relative shrink-0">
      {/* Label row 198629:42393 — badge, name, then dot + status badges. */}
      <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
        <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
          <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
            <div className="content-stretch flex items-end relative shrink-0">
              {/* Badge 198629:42400. No fill and no title: it is decoration
                  marking the line, not a status the user can read off. */}
              <div aria-hidden className="content-stretch flex gap-[var(--component\/badge\/gap,4.8px)] items-center justify-center overflow-clip px-[var(--component\/tabs\/trigger\/gap,7.2px)] py-[var(--component\/badge\/py,2.4px)] relative rounded-[var(--component\/badge\/radius,31.2px)] shrink-0 size-[24px]">
                <div className="content-stretch flex flex-col items-start relative shrink-0">
                  <div className="relative shrink-0 size-[19.2px]">
                    <Ram2Line />
                  </div>
                </div>
              </div>
            </div>
            <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-[number:var(--font\/weight\/font-medium,500)] justify-center leading-[0] relative shrink-0 text-[color:var(--colors\/slate\/600,#45556c)] text-[length:var(--text\/base\/size,16px)] whitespace-nowrap">
              <p className="leading-[var(--text\/base\/lh,24px)]">{label}</p>
            </div>
          </div>
          {/* 198629:59787 — the dot moved here, after the label, and grew to
              20px. Its red/blue ternary is live data wiring, not styling. */}
          <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
            <div className={row.alert ? 'relative shrink-0 size-[20px] text-[#FB2C36]' : 'relative shrink-0 size-[20px] text-[#2B7FFF]'}>
              <LocationDot />
            </div>
            <GlyphBadge alert={row.connect === 'alert'} label={label + ' control unit link'}>
              <div className="relative shrink-0 size-[12px]">
                <Connect width={12} height={12} />
              </div>
            </GlyphBadge>
            <GlyphBadge alert={row.wifi === 'alert'} label={label + ' connectivity'}>
              <div className="flex items-center justify-center overflow-clip relative shrink-0 size-[12px]">
                <WifiConnected02 />
              </div>
            </GlyphBadge>
          </div>
        </div>
      </div>

      {/* 198629:42409 — the rule dropping from the label row to the valve row.
          Figma draws it horizontally and rotates the wrapper, so the wrapper is
          reproduced as emitted; left-[12px] is the speed badge's centre line. */}
      <div aria-hidden className="absolute flex h-[41px] items-center justify-center left-[12px] top-[22px] w-0">
        <div className="flex-none rotate-90">
          <div className="h-0 relative w-[41px]">
            <div className="absolute inset-[-1px_0_0_0]">
              <BranchConnector />
            </div>
          </div>
        </div>
      </div>

      {/* Valve row 198629:42410. pl-[20px] clears the branch rule above. */}
      <div className="content-stretch flex items-center pl-[20px] relative shrink-0">
        <div className="content-stretch flex items-end relative shrink-0">
          <SpeedBadge />
        </div>
        <div className="h-0 relative shrink-0 w-[7.2px]">
          <div className="absolute inset-[-0.6px_0]">
            <PillConnector />
          </div>
        </div>
        <div className="content-stretch flex gap-[6px] items-end relative shrink-0">
          <ValvePill state={row.valve} label={row.valveLabel} />
          {/* 198629:42420. The design promoted dots-three from a status glyph
              on the label row to a real Button here — but there is still no
              designed destination for it, so it stays inert (aria-disabled, no
              handler, default cursor) exactly as the header button does with no
              onAction. Give it a handler once one exists. `row.more === 'alert'`
              keeps its meaning by tinting the surface red/400. */}
          {row.more === 'alert' ? (
            <Button variant="outline" size="xs" aria-disabled="true" title={label + ' — more'} className="bg-[var(--colors\/red\/400,#ff6467)] border-transparent content-stretch cursor-default flex gap-[var(--spacing\/1,4px)] h-[24px] items-center px-[4px] py-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-xs\/radius,26px)] shadow-none shrink-0">
              <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[16px]">
                <DotsThree className="size-[16px]" />
              </div>
            </Button>
          ) : (
            <Button variant="outline" size="xs" aria-disabled="true" title={label + ' — more'} className="bg-[#f2f6ff] border-transparent content-stretch cursor-default flex gap-[var(--spacing\/1,4px)] h-[24px] items-center px-[4px] py-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-xs\/radius,26px)] shadow-none shrink-0">
              <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[16px]">
                <DotsThree className="size-[16px]" />
              </div>
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  return grow ? (
    <div className="bg-[#f2f6ff] content-stretch flex flex-[1_0_0] h-[82px] items-start px-[9px] py-[6px] relative rounded-[12px]" data-node-id={nodeId}>
      {panel}
    </div>
  ) : (
    <div className="bg-[#f2f6ff] content-stretch flex h-[82px] items-start px-[9px] py-[6px] relative rounded-[12px] shrink-0" data-node-id={nodeId}>
      {panel}
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
 * @param onAction  click handler for the header pill, whose label is now the
 *                  design's variant copy — "Close valve" on a water line,
 *                  "Close all valves" on a loop (ACTION_LABEL). Omit it and the
 *                  pill renders inert rather than dead-but-clickable.
 */
export default function TopologyCard({
  topology = 'water-line',
  supply = MOCK_SUPPLY,
  ret = null,
  onAction,
  className,
}) {
  const title = TITLE[topology] ?? TITLE['water-line']
  const actionLabel = ACTION_LABEL[topology] ?? ACTION_LABEL['water-line']
  const isLoop = Boolean(ret)

  return (
    <div
      className={cn(
        'bg-[#fafbfc] border border-solid border-white content-stretch flex items-center max-w-[680px] min-h-[136px] px-[18px] py-[12px] relative rounded-[var(--rounded-2xl,18px)] w-full',
        className,
      )}
      data-node-id={isLoop ? '198356:122834' : '198356:122565'}
    >
      {/* 198616:115396 / 198616:114519 — header row stacked over the body row.
          Figma is `justify-between` inside a fixed 136px card, which works out
          to a 6px gutter; gap-[6px] pins that minimum for when the body row
          wraps at phone width and the card grows past 136. */}
      <div className="content-stretch flex flex-[1_0_0] flex-col gap-[6px] items-start justify-between min-w-px relative self-stretch">
        {/* Header 198616:115397 / 198616:114520 — now its own full-width row,
            not a child of the telemetry column. */}
        <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
          <div className="content-stretch flex flex-[1_0_0] items-center justify-between min-w-px relative">
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
                  {actionLabel}
                </span>
              </Button>
            ) : (
              <Button variant="outline" size="xs" aria-disabled="true" className="bg-[#f2f6ff] border border-[var(--wint-blue-accent,#0b81f8)] border-solid content-stretch cursor-default flex gap-[var(--spacing\/1,4px)] h-[24px] items-center justify-center px-[var(--component\/button\/size-xs\/px,10px)] py-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-xs\/radius,26px)] shadow-none shrink-0">
                <span className="[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-medium leading-[var(--text\/button-xs\/size,12px)] relative shrink-0 text-[color:var(--wint-blue-accent,#0b81f8)] text-[length:var(--text\/button-xs\/size,12px)] whitespace-nowrap">
                  {actionLabel}
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* Body row 198616:115398 / 198616:114521 — schematic beside the IOT
            overview panel(s), gap-[14px]. flex-wrap + gap-y are this repo's,
            not Figma's: see header note 3. */}
        <div className="content-stretch flex flex-wrap gap-x-[14px] gap-y-[12px] items-start relative shrink-0 w-full">
          {/* Schematic panel. PipeTopology owns every symbol, every offset and
              the SUPPLY/RETURN captions; this card only supplies the #f2f6ff
              panel it sits in. min-w-[177px] is PipeTopology's fixed TILE_W and
              is what makes the row wrap rather than clip at phone width; the
              Waterline frame draws the panel 350 wide, the Open loop one takes
              what the two telemetry panels leave. See header note 4 for why
              min-h-[112px] stays instead of Figma's h-[82px]. */}
          {isLoop ? (
            <div className="bg-[#f2f6ff] content-stretch flex flex-[1_0_0] items-center justify-center max-w-[350px] min-h-[112px] min-w-[177px] relative rounded-[12px]" data-node-id="198616:114522">
              <PipeTopology topology={topology} valve={supply ? supply.valve : 'no-valve'} />
            </div>
          ) : (
            <div className="bg-[#f2f6ff] content-stretch flex items-center justify-center max-w-[350px] min-h-[112px] min-w-[177px] relative rounded-[12px] w-[350px]" data-node-id="198453:40479">
              <PipeTopology topology={topology} valve={supply ? supply.valve : 'no-valve'} />
            </div>
          )}

          {/* Telemetry. No supply -> the header-only empty state. */}
          {supply && isLoop ? (
            <>
              <IotOverview row={supply} label="Supply" nodeId="198629:42806" />
              {/* Figma's second Open loop panel also reads "Supply" — that is a
                  copy error in the desktop frame (the mobile instance
                  198629:58293 says "Return", and the frame's own schematic is
                  captioned SUPPLY / RETURN). Not followed: it would also
                  corrupt the accessible names built from this label. */}
              <IotOverview row={ret} label="Return" nodeId="198629:42733" />
            </>
          ) : null}

          {supply && !isLoop ? (
            <IotOverview row={supply} label="Supply" grow nodeId="198629:42879" />
          ) : null}
        </div>
      </div>
    </div>
  )
}
