// Tabler Icons / triangle — exported from Figma, recoloured to currentColor.
//
// The consumption hero's direction marker (199703:30088). FILLED, not an
// outline: lucide's <Triangle> is a stroked outline at a different weight and
// reads as an empty shape at 10px, which is the only size this is ever drawn
// at. The node flips it with `-scale-y-100` for a fall rather than shipping a
// second glyph, so there is deliberately no TriangleDownFill here — see
// SystemHeroCard, which does the same.
export default function TriangleFill({ size = 10, className, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {/* Figma's own export, with `fill="white"` swapped for currentColor so
          the glyph takes the surrounding text colour like every other icon
          here. No clipPath — see the note in CaretDown.jsx for why. */}
      <path
        d="M4.31792 1.49625L0.940417 7.13542C0.87079 7.25599 0.833945 7.3927 0.833546 7.53193C0.833147 7.67117 0.869209 7.80808 0.938144 7.92906C1.00708 8.05003 1.10649 8.15085 1.22648 8.22148C1.34646 8.29211 1.48286 8.3301 1.62208 8.33167H8.37792C8.51708 8.33006 8.6534 8.29206 8.77334 8.22145C8.89327 8.15084 8.99263 8.05007 9.06156 7.92916C9.13048 7.80825 9.16656 7.67141 9.16622 7.53223C9.16587 7.39306 9.12911 7.2564 9.05958 7.13583L5.68208 1.49583C5.61102 1.37854 5.51092 1.28156 5.39144 1.21425C5.27196 1.14694 5.13714 1.11157 5 1.11157C4.86286 1.11157 4.72804 1.14694 4.60856 1.21425C4.48908 1.28156 4.38898 1.37854 4.31792 1.49583V1.49625Z"
        fill="currentColor"
      />
    </svg>
  )
}
