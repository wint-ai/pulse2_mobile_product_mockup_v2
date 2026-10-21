// "Location Dot" — three concentric circles, the outer two at 10% opacity.
// The single geometry behind six former module-local copies (the sidebar's
// 14px pip, SystemPageV2Screen's 12px badge dot, TopologyCard's 20px row dot,
// SystemsHealthCard's 27px `LocationDot27`, EventOverlayV2's 27/24px title
// and chip dots, ActiveWaterEventsCard's 44px hero dot). Every one of those
// drew the same three radii at 0.31579 / 0.5 / 0.10526 of the box, so one
// 27-unit viewBox scaled by `size` reproduces all of them exactly.
//
// Shipped in several tints — red for events, blue for health, slate for the
// History title — so the fill is currentColor and the caller tints it.
export default function LocationDot({ size = 27, className, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 27 27"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <circle opacity="0.1" cx="13.5" cy="13.5" r="8.52632" fill="currentColor" />
      <circle opacity="0.1" cx="13.5" cy="13.5" r="13.5" fill="currentColor" />
      <circle cx="13.5" cy="13.5" r="2.84211" fill="currentColor" />
    </svg>
  )
}
