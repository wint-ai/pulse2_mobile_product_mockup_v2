// Tabler Icons / photo-sensor-3 — the "Topology" chip glyph in the Systems
// Health card (Figma 198601:62957 -> ;198601:62355, drawn at 16.842px).
//
// PROVENANCE: copied verbatim from the module-local `PhotoSensor3` in
// src/v2/components/WintSidebarV2.jsx, which is not exported. The paths, the
// translate(-16,-7) that shifts Tabler's raw coordinates back into a 0 0 14 14
// box, the 1.33 stroke and both linecaps are byte-identical. The ONE change:
// the sidebar hard-codes stroke="#90A1B9"; this copy uses currentColor so it
// follows the icons/ contract ("colour comes from the surrounding text
// colour"). Tint the callsite with text-[#90a1b9] to get the original.
// If the sidebar's copy ever changes shape, change this one too.
export default function PhotoSensor3({ size = 14, className, ...props }) {
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
      <g
        transform="translate(-16,-7)"
        stroke="currentColor"
        strokeWidth="1.33"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M25.9165 9.33325H26.4998C26.8093 9.33325 27.106 9.45617 27.3248 9.67496C27.5436 9.89375 27.6665 10.1905 27.6665 10.4999V11.0833" />
        <path d="M27.6665 16.9167V17.5001C27.6665 17.8095 27.5436 18.1062 27.3248 18.325C27.106 18.5438 26.8093 18.6667 26.4998 18.6667H25.9165" />
        <path d="M20.0835 18.6667H19.5002C19.1907 18.6667 18.894 18.5438 18.6752 18.325C18.4564 18.1062 18.3335 17.8095 18.3335 17.5001V16.9167" />
        <path d="M18.3335 11.0833V10.4999C18.3335 10.1905 18.4564 9.89375 18.6752 9.67496C18.894 9.45617 19.1907 9.33325 19.5002 9.33325H20.0835" />
        <path d="M21.25 14C21.25 14.4641 21.4344 14.9092 21.7626 15.2374C22.0908 15.5656 22.5359 15.75 23 15.75C23.4641 15.75 23.9092 15.5656 24.2374 15.2374C24.5656 14.9092 24.75 14.4641 24.75 14C24.75 13.5359 24.5656 13.0908 24.2374 12.7626C23.9092 12.4344 23.4641 12.25 23 12.25C22.5359 12.25 22.0908 12.4344 21.7626 12.7626C21.4344 13.0908 21.25 13.5359 21.25 14Z" />
        <path d="M23 17.5V18.6667" />
        <path d="M18.3335 14H19.5002" />
        <path d="M23 9.33325V10.4999" />
        <path d="M27.6667 14H26.5" />
      </g>
    </svg>
  )
}
