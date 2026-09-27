// Remix Icons / flood-line — the "Flood" chip glyph in the Systems Health card
// (Figma 198601:62957 -> ;198601:62367, drawn at 16px).
//
// PROVENANCE: copied verbatim from the module-local `FloodLine` in
// src/v2/components/AlertCard.jsx, which is not exported. Same 16x16 viewBox,
// same single filled path, already on currentColor there — nothing changed.
// Duplicated rather than imported because AlertCard.jsx does not export it;
// if that glyph changes, change this one too.
export default function FloodLine({ size = 16, className, ...props }) {
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
      <path
        d="M10.6667 11.6483C11.3744 12.2816 12.3089 12.6667 13.3333 12.6667H14.6667V14.0001H13.3333C12.3619 14.0001 11.4511 13.7403 10.6665 13.2865C9.8828 13.7402 8.97173 14.0001 8 14.0001C7.02853 14.0001 6.11771 13.7403 5.33323 13.2865C4.54947 13.7402 3.63842 14.0001 2.66667 14.0001H1.33333V12.6667H2.66667C3.69142 12.6667 4.62617 12.2814 5.33342 11.6483C6.04109 12.2816 6.9756 12.6667 8 12.6667C9.02473 12.6667 9.95953 12.2814 10.6667 11.6483ZM8.38227 1.02144L8.44847 1.07441L15.3333 7.3334H13.3333V11.3334C12.8659 11.3334 12.4172 11.2532 12.0002 11.1059L12 6.10473L8 2.46807L4 6.10407L4.00083 11.1055C3.6432 11.232 3.26217 11.3091 2.86599 11.3285L2.66667 11.3334V7.3334H0.666667L7.55153 1.07441C7.78467 0.862513 8.1304 0.844853 8.38227 1.02144Z"
        fill="currentColor"
      />
    </svg>
  )
}
