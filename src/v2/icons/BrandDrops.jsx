// Tabler Icons / brand-drops — the "Humidity" chip glyph in the Systems Health
// card (Figma 198601:62957 -> ;198601:62379, drawn at 16px).
//
// PROVENANCE: copied verbatim from the module-local `BrandDrops` in
// src/v2/components/AlertCard.jsx, which is not exported. Both paths, the
// 1.2635 stroke (Tabler's 2 scaled to this 16px box) and the linecaps are
// byte-identical and were already on currentColor there.
// Duplicated rather than imported because AlertCard.jsx does not export it;
// if that glyph changes, change this one too.
export default function BrandDrops({ size = 16, strokeWidth = 1.2635, className, ...props }) {
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
        d="M11.758 4.944C12.5069 5.68049 13.0187 6.62394 13.2278 7.65331C13.4369 8.68268 13.3336 9.75104 12.9313 10.7213C12.5253 11.6939 11.8402 12.5244 10.9625 13.108C10.0848 13.6915 9.05395 14.0019 8 14C6.94616 14.0018 5.91541 13.6913 5.03787 13.1078C4.16033 12.5243 3.47532 11.6938 3.06933 10.7213C2.66696 9.7511 2.56362 8.68278 2.77256 7.65342C2.98149 6.62405 3.49319 5.68057 4.242 4.944L8 1.33333L11.758 4.944Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.644 7.282C9.97273 7.61555 10.1965 8.03811 10.2878 8.49745C10.379 8.9568 10.3337 9.43281 10.1573 9.86667C9.98471 10.2982 9.68714 10.6683 9.30278 10.9296C8.91842 11.191 8.46477 11.3315 8 11.3333C7.53523 11.3315 7.08159 11.191 6.69722 10.9296C6.31286 10.6683 6.01529 10.2982 5.84267 9.86667C5.66635 9.43281 5.621 8.9568 5.71223 8.49745C5.80346 8.03811 6.02727 7.61555 6.356 7.282L8 5.66667L9.644 7.282Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
