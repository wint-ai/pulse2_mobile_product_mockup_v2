// Phosphor Icons / caret-down — exported from Figma, recoloured to currentColor.
export default function CaretDown({ size = 24, className, ...props }) {
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
      {/* No clipPath. Figma exports one on every icon, but each clips to a
          rect the exact size of its own viewBox — it hides nothing. Kept, each
          carried a HARDCODED id, so two of the same icon on a page produced
          duplicate DOM ids (invalid HTML, and the second clip silently binds
          to the first). Dropping the no-op is simpler than minting unique ids
          with useId for a clip that does nothing. */}
      
<g>
<path d="M11.375 5.25L7 9.625L2.625 5.25" stroke="currentColor" strokeWidth="1.16375" strokeLinecap="round" strokeLinejoin="round"/>
</g>
    </svg>
  )
}
