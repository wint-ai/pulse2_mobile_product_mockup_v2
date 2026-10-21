// Phosphor Icons / arrows-in-line-vertical — "collapse all" in the side menu.
//
// FIXED 2026-10: this file used to hold a Lucide SMILE face, not this glyph.
// src/v2/components/WintSidebarV2.jsx documents the cause — the Figma "Icon
// Placeholder" wrapper makes get_design_context hand back a generic smile for
// arrows-in-line-vertical, group-line, star, photo-sensor-3 and
// report-analytics, and this export was built from that wrong payload. It was
// exported from src/v2/icons/index.js but imported by nothing, so it never
// shipped. The geometry below is the sidebar's own (correct) copy, promoted
// here verbatim; the export was framed at y+8, hence the translate.
export default function ArrowsInLineVertical({ size = 24, className, ...props }) {
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
      <g transform="translate(0,-8)">
        <path d="M13.5 16H2.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 9V14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 12L8 14L6 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 23V18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 20L8 18L10 20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}
