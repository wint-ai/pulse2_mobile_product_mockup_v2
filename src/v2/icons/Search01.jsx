// Huge Icons / search-01 — exported from Figma, recoloured to currentColor.
//
// ── THE GLYPH WAS MIRRORED, 2026-11-08 ───────────────────────────────────
// As exported, this drew the lens at the BOTTOM of the box (circle centred
// 5.998, 7.332) with the handle running UP AND TO THE RIGHT (9.998, 3.332 ->
// 12.665, 0.665). That is a magnifying glass flipped on its horizontal axis,
// and at 16px it does not read as one — it reads as a Mars symbol, which is
// what it was reported as on the Systems toolbar. Every consumer was drawing
// it: SystemsFilterSheet's category search, WintSidebarV2's search row, and
// (until that pass) SystemsTableCard's toolbar.
//
// THE FIX IS A VERTICAL MIRROR OF THE EXPORTED PATH DATA, y' = 13.33 - y, and
// nothing else. Every coordinate below is the exported one reflected, so the
// circle keeps its radius (5.333), the handle keeps its length and angle
// (5.657 along the 45 degree diagonal), and the stroke weight, caps and
// viewBox are untouched. The result is the canonical orientation — lens top
// left, handle down and to the right — which is also what lucide's `Search`
// draws in the tab bar on the same screens, so the two no longer disagree.
//
// If this file is ever re-exported from Figma, CHECK THE ORIENTATION before
// pasting: the node itself is likely carrying a flip transform that the export
// bakes in the wrong way round.
export default function Search01({ size = 24, className, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 13.33 13.33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g> <path d="M9.99833 9.99833L12.665 12.665" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/> <path d="M11.3317 5.99833C11.3317 3.05281 8.94385 0.665 5.99833 0.665C3.05281 0.665 0.665 3.05281 0.665 5.99833C0.665 8.94385 3.05281 11.3317 5.99833 11.3317C8.94385 11.3317 11.3317 8.94385 11.3317 5.99833Z" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/> </g>
    </svg>
  )
}
