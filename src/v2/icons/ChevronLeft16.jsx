// Huge Icons / arrow-left-01-round — the 16px month/period stepper chevron
// (Figma asset 07a4d214-d3e5-4a7e-8807-548b1509dc25).
//
// Promoted out of MonthPickerSheet.jsx and WaterConsumptionCardV2.jsx, which
// each held a byte-identical copy; the only difference was that the water
// card's hard-coded stroke="#62748E" where the sheet's already used
// currentColor. That call site now carries `text-slate-500` instead.
export default function ChevronLeft16({ size = 16, className, ...props }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M10 4L6 8L10 12"
        stroke="currentColor"
        strokeWidth="1.33"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
