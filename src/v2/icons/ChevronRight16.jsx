// Huge Icons / arrow-right-01-round — the 16px month/period stepper chevron
// (Figma asset 50984ff1-8718-4840-b2ea-cb789fc59a21).
//
// Promoted out of MonthPickerSheet.jsx and WaterConsumptionCardV2.jsx, which
// each held a byte-identical copy; the only difference was that the water
// card's hard-coded stroke="#62748E" where the sheet's already used
// currentColor. That call site now carries `text-slate-500` instead.
export default function ChevronRight16({ size = 16, className, ...props }) {
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
        d="M6 4L10 8L6 12"
        stroke="currentColor"
        strokeWidth="1.33"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
