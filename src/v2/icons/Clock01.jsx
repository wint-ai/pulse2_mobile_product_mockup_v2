// Huge Icons / clock-01 — exported from Figma, recoloured to currentColor.
// Figma's own description for the node (84617:22381): "time, alarm".
//
// The policy window's glyph on the Active policy card (199532:96157), drawn
// at 14px. Lucide's <Clock> is the same subject but a different drawing — a
// 24-grid circle with hands to 12 and 4 at stroke 2 — and the design-to-code
// rule is that a real asset is substituted only for an EXACT match, so this
// is the export rather than the lookalike.
//
// THE VIEWBOX IS 14, THE ARTWORK IS 13. Same construction as Chart03: the
// node puts the 11.667 nominal shape at `inset-[8.33%]` of a 14px box and the
// img wrapper grows it by half a stroke (`inset-[-5.71%]`), which lands the
// export's origin at (0.5, 0.5). The translate below is those two insets
// resolved, so the glyph keeps its stroke weight in a square box.
export default function Clock01({ size = 14, className, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(0.5 0.5)">
        <circle cx="6.49833" cy="6.49833" r="5.83333" stroke="currentColor" strokeWidth="1.33" />
        {/* The hands: up to 12, then out to 2. */}
        <path
          d="M6.49833 4.165V6.49833L7.665 7.665"
          stroke="currentColor"
          strokeWidth="1.33"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
