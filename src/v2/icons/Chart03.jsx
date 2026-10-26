// Huge Icons / chart-03 — exported from Figma, recoloured to currentColor.
//
// The glyph on the consumption hero's "All stats" control (199703:30092).
// SystemHeroCard carried a note for weeks saying this icon was "NOT
// IMPLEMENTED" and that lucide's <ChartLine> stood in for it; this is that
// note being discharged. The two are not the same drawing — chart-03 has an
// L-shaped axis the lucide glyph does not — and the design-to-code rule is
// that a real asset is substituted only for an EXACT match.
//
// THE VIEWBOX IS 16, THE ARTWORK IS NOT. Figma exports this at its own
// 13.33 x 12.0 bounds, and the node then places those bounds inside a 16px
// box: `inset-[16.67%_12.5%_16.66%_12.5%]` puts the nominal 12 x 10.67 shape
// at (2, 2.67), and the img wrapper's `inset-[-6.24%_-5.54%_-6.23%_-5.54%]`
// grows it by half a stroke (0.665) on each side for the stroke's own bleed —
// landing the export's origin at (1.335, 2.005). The translate below IS those
// two insets resolved, so the glyph sits where the design puts it in a square
// box that matches every other icon in this set. Scaling the raw export to
// 16x16 instead would stretch it and thicken the stroke unevenly.
export default function Chart03({ size = 16, className, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(1.335 2.005)">
        {/* The axis. */}
        <path
          d="M0.665002 0.665V7.33167C0.665002 9.21729 0.665002 10.1601 1.25079 10.7459C1.83657 11.3317 2.77938 11.3317 4.665 11.3317H12.665"
          stroke="currentColor"
          strokeWidth="1.33"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* The plotted line. */}
        <path
          d="M2.665 7.33167L4.83167 5.165C5.26104 4.73563 5.47572 4.52095 5.72683 4.45011C5.90437 4.40003 6.0923 4.40003 6.26984 4.45011C6.52095 4.52095 6.73563 4.73563 7.165 5.165C7.59437 5.59437 7.80905 5.80905 8.06016 5.87989C8.2377 5.92997 8.42563 5.92997 8.60317 5.87989C8.85428 5.80905 9.06897 5.59437 9.49833 5.165L11.9983 2.665"
          stroke="currentColor"
          strokeWidth="1.33"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
