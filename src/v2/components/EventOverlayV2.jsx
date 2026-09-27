/**
 * EventOverlayV2 — the full-surface "see everything" sheet (v2 mobile).
 *
 * Design source: Figma file YEmjkKS4xaA827Zm8w3oXx, five frames fetched one at
 * a time (fetching the parent makes Figma merge the variants and hand back the
 * wrong assets):
 *   198328:89886  Overlay_Water events     dataset=water  scope=account  Active
 *   198378:73254  Overlay_Alerts_history   dataset=alerts scope=account  History
 *   198328:90116  Overlay_Alerts           dataset=alerts scope=account  Active
 *   198328:89685  water events, LOCATION   dataset=water  scope=location Active
 *   198328:90254  alerts, LOCATION         dataset=alerts scope=location Active
 *
 * Those five frames are 2 datasets x 2 scopes x Active/History of ONE surface,
 * so this is one component:
 *   `dataset` picks the type family, and therefore the filter chips;
 *   `scope`   decides the header (bare close vs. breadcrumb) and whether a row
 *             carries its system name + address — at location scope the scope
 *             already implies both, so the row drops them and promotes the
 *             severity label into the first line;
 *   the Active/History switch is a ToggleGroup in the design, not Tabs.
 *
 * RE-RECONCILED 2026-09-27 against the CURRENT 198328:90116 (Active) and
 * 198378:73254 (History). Both still resolve and both still emit the structure
 * below class-for-class; nothing in either frame had moved. Three literal
 * classes were restored that the earlier pass had dropped as visual no-ops —
 * the card's "Liquid" shadow, the ToggleGroup's `shadows/control` drop-shadow,
 * and `text-left` on the Active toggle label.
 *
 * NOT reproduced from those two frames, on purpose:
 *   - the FOURTH chip (198328:90169 / 198378:73289, "All alerts 25"): its
 *     content frame is `w-px`, i.e. collapsed to a ~24px empty pill, and the
 *     frame render shows it clipped off the right edge. It is a design
 *     leftover, not a filter this overlay offers.
 *   - the FOUR stacked trailing rules after the last row (198328:90250..90253,
 *     198378:73370..73373): placeholders for the frame's unfilled rows. The
 *     rule that matters is the one ABOVE each row, which is drawn.
 *
 * KNOWN DESIGN BUG, deliberately NOT reproduced: frame 198328:90254 is titled
 * "Active Alerts" but draws the water chips (High Flow / Low Flow). The chips
 * here come off `dataset`, so the alerts scope gets alert chips.
 *
 * ── Why the class names look like this ────────────────────────────────────
 * The `var(--a\/b,8px)` class names are copied out of the Figma design context
 * untouched. Every one carries its own literal fallback, and this project
 * defines none of those tokens in index.css (checked), so the fallback is what
 * actually renders — the exact design value, with no token wiring. Do NOT
 * "simplify" them into px-2 / text-slate-600: that is what made the earlier
 * pass drift off the design.
 *
 * CARE — the backslash has to survive into the DOM class attribute. A JSX
 * string attribute does not process escapes, so className="px-[var(--a\/b,8px)]"
 * is correct. The same text inside a JS string literal or a cn() argument loses
 * the backslash at parse time while Tailwind's scanner still sees it, so the
 * emitted class and the generated selector stop matching and the rule silently
 * does nothing. That is why every Figma class below sits in a literal JSX
 * attribute, and why the two-state bits (selected chip, pressed toggle, the
 * title dot's tint) are expressed as inline style objects rather than as a
 * conditional class string.
 *
 * ASSETS: the Figma export URLs expire in ~7 days, so every glyph is either a
 * project-owned icon (Waves / Funnel / CloseFill, and ValveStatus for the valve
 * error state — its geometry is byte-for-byte the asset this frame exports) or
 * inlined below from the downloaded SVG, viewBox included.
 */

import { useEffect, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { CloseFill, Funnel, Waves } from '@/v2/icons'
import ValveStatus from './ValveStatus'

// ── Wint tokens, as the Figma variables on these frames name them ──────────
// Used only where a value has to reach an inline style (a two-state bit, or an
// SVG fill). Everything static keeps its var(...) class instead.
// The close glyph's fill. Node 198328:89906 binds exactly one colour,
// --foreground #0a0a0a (confirmed by get_variable_defs and by its b5b2b.svg
// export, `fill="#0A0A0A"`) — the same token the row's system name uses. It is
// NOT slate-900; an earlier pass painted it #0f172b.
const FOREGROUND = '#0a0a0a'
const SLATE_800 = '#1d293d'
const SLATE_600 = '#45556c'
const SLATE_500 = '#62748e'
const SLATE_400 = '#90a1b9'
const SLATE_200 = '#e2e8f0'
const RED_500 = '#fb2c36'
const RED_600 = '#e7000b'
const RED_900 = '#82181a'
const ORANGE_500 = '#ff6900'
const ORANGE_600 = '#f54900'
const BLUE_100 = '#dbeafe'
const SLATE_100 = '#f1f5f9'
const WINT_BLUE = '#0b81f8'

// The sheet's own ground: Figma's `backgroundImage` on all five frame roots,
// a cool diagonal wash laid over flat white.
const SHEET_BG =
  'linear-gradient(131.41003432311655deg, rgba(233, 238, 248, 0.8) 8.3855%,' +
  ' rgba(227, 235, 249, 0.8) 32.2%, rgba(228, 235, 250, 0.8) 40.822%,' +
  ' rgba(212, 226, 255, 0.8) 71.236%, rgba(233, 237, 243, 0.8) 82.858%),' +
  ' linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)'

// ── Inlined Figma assets ───────────────────────────────────────────────────

/** "Location Dot" — three concentric circles, the outer two at 10% opacity.
 *  Exported at 27px for the title and 24px for the All chip; identical
 *  geometry, so one viewBox serves both. Shipped red (#FB2C36) everywhere
 *  except the History title, which is slate-400 — hence currentColor. */
const LocationDot = ({ size = 27, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 27 27"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <circle opacity="0.1" cx="13.5" cy="13.5" r="8.52632" fill="currentColor" />
    <circle opacity="0.1" cx="13.5" cy="13.5" r="13.5" fill="currentColor" />
    <circle cx="13.5" cy="13.5" r="2.84211" fill="currentColor" />
  </svg>
)

/** Phosphor "waves" with only TWO traces — a genuinely different export from
 *  the three-trace glyph in @/v2/icons, not a crop of it, and the one the Low
 *  Flow chip uses. Its traces sit low in the 13-unit box, which is why Figma
 *  nudges the chip wrapper down by 4px to optically centre it. */
const WavesLow = ({ size = 13, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 13 13"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <g clipPath="url(#eov2_waves_low)">
      <path d="M2.03125 9.42551C5.6875 6.39437 7.3125 12.2931 10.9688 9.26199" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.03125 6.58176C5.6875 3.55062 7.3125 9.44937 10.9688 6.41824" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <defs>
      <clipPath id="eov2_waves_low"><rect width="13" height="13" fill="white" /></clipPath>
    </defs>
  </svg>
)

/** Phosphor "waves" with three traces on a 13-unit box — the High Flow *chip*.
 *  Node 198328:89932 exports aa607.svg as a purpose-made 13x13 with its strokes
 *  still 1.08063. The 21-unit `Waves` in @/v2/icons carries the same artwork and
 *  the same stroke width, so drawing IT at 13px would scale the stroke down to
 *  1.08063 x 13/21 = 0.67px — visibly thinner than the Low Flow chip beside it.
 *  Hence a separate 13-viewBox copy, exactly as ActiveWaterEventsCard does. The
 *  row badge keeps the 21-unit `Waves`, which is what Figma draws there. */
const WavesHigh = ({ size = 13, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 13 13"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <g clipPath="url(#eov2_waves_high)">
      <path d="M2.03125 9.42551C5.6875 6.39437 7.3125 12.2931 10.9688 9.26199" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.03125 6.58176C5.6875 3.55062 7.3125 9.44937 10.9688 6.41824" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.03125 3.73801C5.6875 0.706875 7.3125 6.60562 10.9688 3.57449" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <defs>
      <clipPath id="eov2_waves_high"><rect width="13" height="13" fill="white" /></clipPath>
    </defs>
  </svg>
)

/** Huge Icons / electric-plugs — the AC Unplugged row badge. Figma draws it
 *  12.4556 x 18.5806 inside a 21px box (inset 8.33%/22.92%, grown by the half
 *  stroke), so `size` here means that box and the glyph keeps its own aspect. */
const ElectricPlugs = ({ size = 21, ...props }) => (
  <svg
    width={(12.4556 / 21) * size}
    height={(18.5806 / 21) * size}
    viewBox="0 0 12.4556 18.5806"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <path d="M3.60281 0.540313L3.60281 3.16531" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8.85281 0.540313L8.85281 3.16531" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.22781 14.5403L6.22781 18.0403" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.83496 6.22781L5.00532 8.13081C4.80925 8.33474 4.94978 8.62817 5.26951 8.68246L7.18611 9.00792C7.527 9.06581 7.65702 9.39065 7.41867 9.58897L5.14858 11.4778" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8.24607 3.16531L4.20955 3.16531C2.33852 3.16531 1.40301 3.16531 0.886172 3.77583C0.369334 4.38635 0.511586 5.32341 0.79609 7.19751L1.25435 10.2162C1.70936 13.2135 2.97795 14.5403 6.22781 14.5403C9.47767 14.5403 10.7463 13.2135 11.2013 10.2162L11.6595 7.19751C11.944 5.32341 12.0863 4.38636 11.5695 3.77583C11.0526 3.16531 10.1171 3.16531 8.24607 3.16531Z" stroke="currentColor" strokeWidth="1.08063" />
  </svg>
)

/** Huge Icons / plug-socket — a plug pulled clear of its socket. This is the
 *  glyph the AC Unplugged *chip* draws (11.3723 square inside a 13px box). */
const PlugSocket = ({ size = 13, ...props }) => (
  <svg
    width={(11.3723 / 13) * size}
    height={(11.3723 / 13) * size}
    viewBox="0 0 11.3723 11.3723"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <path d="M8.85708 5.77279C8.6496 6.01682 8.26618 6.01861 8.02424 5.77668L5.59562 3.34805C5.35368 3.10611 5.35547 2.72269 5.5995 2.51521L6.26627 1.94831C6.74558 1.54079 7.33005 1.27061 7.96353 1.16372L8.35622 1.09746C8.72706 1.03488 9.117 1.16442 9.39518 1.4426L9.92969 1.97711C10.2079 2.25529 10.3374 2.64523 10.2748 3.01607L10.2086 3.40876C10.1017 4.04224 9.8315 4.62671 9.42398 5.10603L8.85708 5.77279Z" stroke="currentColor" strokeWidth="1.08063" />
    <path d="M9.74865 1.62365L10.832 0.540313" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M0.540313 10.832L1.62365 9.74865" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2.51521 5.5995C2.72269 5.35547 3.10611 5.35368 3.34805 5.59562L5.77668 8.02424C6.01861 8.26618 6.01683 8.6496 5.77279 8.85708L5.10603 9.42398C4.62671 9.8315 4.04224 10.1017 3.40876 10.2086L3.01607 10.2748C2.64523 10.3374 2.25529 10.2079 1.97711 9.92969L1.4426 9.39518C1.16442 9.117 1.03488 8.72706 1.09746 8.35622L1.16372 7.96353C1.27061 7.33005 1.54079 6.74558 1.94831 6.26627L2.51521 5.5995Z" stroke="currentColor" strokeWidth="1.08063" />
    <path d="M3.79031 5.95698L4.87365 4.87365M5.41531 7.58198L6.49865 6.49865" stroke="currentColor" strokeWidth="1.08063" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Remix Icons / arrow-right-s-line — the breadcrumb separator. Figma ships ONE
 *  glyph at TWO fills, so the caller sets the colour: node 198328:90274 (after
 *  "Home") exports 454b9.svg fill="#90A1B9" (slate-400), node 198328:90276
 *  (immediately before the current-page crumb) exports 450b4.svg fill="#1D293D"
 *  (slate-800). Identical path geometry in both — the separator takes the ink of
 *  the crumb that follows it. Same two-tone treatment as SystemPageV2Screen. */
const ArrowRightSLine = ({ size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <path d="M8.78093 8.00047L5.48112 4.70062L6.42393 3.75781L10.6666 8.00047L6.42393 12.2431L5.48112 11.3003L8.78093 8.00047Z" fill="currentColor" />
  </svg>
)

/** Huge Icons / more-horizontal — the collapsed middle of the breadcrumb.
 *  Exported 10.666 x 2.66 and centred in its 16px box. */
const MoreHorizontal = ({ size = 16, ...props }) => (
  <svg
    width={(10.666 / 16) * size}
    height={(2.66 / 16) * size}
    viewBox="0 0 10.666 2.66"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <path d="M5.33338 0.664961C5.70065 0.664961 5.99842 0.962731 5.99842 1.33C5.99842 1.69727 5.70065 1.99504 5.33338 1.99504H5.32752C4.96026 1.99504 4.66249 1.69727 4.66249 1.33C4.66249 0.962731 4.96026 0.664961 5.32752 0.664961H5.33338Z" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.33599 0.664961C9.70326 0.664961 10.001 0.962731 10.001 1.33C10.001 1.69727 9.70326 1.99504 9.33599 1.99504H9.33013C8.96286 1.99504 8.66509 1.69727 8.66509 1.33C8.66509 0.962731 8.96286 0.664961 9.33013 0.664961H9.33599Z" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1.33599 0.664961C1.70326 0.664961 2.00103 0.962731 2.00103 1.33C2.00103 1.69727 1.70326 1.99504 1.33599 1.99504H1.33013C0.962859 1.99504 0.66509 1.69727 0.66509 1.33C0.66509 0.962731 0.962859 0.664961 1.33013 0.664961H1.33599Z" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** "Line 6" — the 1px slate-200 rule between rows, kept as a real hairline. */
const RowRule = () => (
  <div className="h-0 relative shrink-0 w-full" aria-hidden="true">
    <div className="absolute inset-[-1px_0_0_0]" style={{ borderTop: `1px solid ${SLATE_200}` }} />
  </div>
)

/** "Line 1" — a 12x1 slate-400 rule Figma rotates 90deg to divide the city
 *  from the street address. Kept inside Figma's own rotate wrapper. */
const CellHairline = () => (
  <div className="flex h-[12px] items-center justify-center relative shrink-0 w-0" aria-hidden="true">
    <div className="flex-none rotate-90">
      <div className="h-0 relative w-[12px]">
        <div className="absolute inset-[-1px_0_0_0]" style={{ borderTop: `1px solid ${SLATE_400}` }} />
      </div>
    </div>
  </div>
)

// ── Event type table ───────────────────────────────────────────────────────
// `type` strings match src/data/events.js, so a real CURRENT_EVENTS slice can
// be passed straight in. Labels are the short ones the overlay frames use
// ("High Flow", not "High Flow Water Event").
//
// `rowIcon` / `chipIcon` differ for the alert family because the design does:
// the chip draws plug-socket at 13px, the row draws electric-plugs at 21px.
// `glyph` is the stroke colour, `label` the colour of the text under (account)
// or beside (location) the badge — the design ships those as two different
// values for the water family (red-500 stroke, red-600 text) and one for the
// alert family (red-900 both).
const TYPES = {
  'leak-high': {
    dataset: 'water',
    label: 'High Flow',
    // Two exports of one glyph: the row draws the 21-unit Waves, the chip the
    // 13-unit WavesHigh, so the 1.08063 stroke renders at full weight in both.
    RowIcon: Waves,
    ChipIcon: WavesHigh,
    badge: '#ffe2e2',
    chipTint: '#ffe2e2',
    glyph: RED_500,
    text: RED_600,
  },
  'leak-low': {
    dataset: 'water',
    label: 'Low Flow',
    RowIcon: WavesLow,
    ChipIcon: WavesLow,
    badge: '#ffedd4',
    chipTint: '#ffedd4',
    // Figma nudges the two-trace glyph down 4px inside the chip circle so it
    // reads as centred; the traces sit low in their own box.
    chipNudge: true,
    glyph: ORANGE_500,
    text: ORANGE_600,
  },
  'power-lost': {
    dataset: 'alerts',
    label: 'AC Unplugged',
    RowIcon: ElectricPlugs,
    ChipIcon: PlugSocket,
    badge: '#ffe2e2',
    chipTint: '#ffe2e2',
    glyph: RED_900,
    text: RED_900,
  },
  'valve-error': {
    dataset: 'alerts',
    label: 'Valve error',
    // ValveStatus carries its own fills (#FCD7DB disc, #FB2C36 strokes), so it
    // ignores `glyph` — hence the explicit flag rather than a colour.
    RowIcon: null,
    ChipIcon: null,
    valve: true,
    badge: '#ffe2e2',
    chipTint: '#fcd7db',
    glyph: RED_500,
    text: RED_900,
  },
}

// Chip order per dataset — fixed, so a chip that currently matches nothing
// still renders and honestly reads 0.
const CHIP_ORDER = {
  water: ['leak-high', 'leak-low'],
  alerts: ['power-lost', 'valve-error'],
}

// The design's own casing, which differs per dataset ("Active water events"
// vs. "Active Alerts"). Kept rather than normalised.
const NOUN = {
  water: { active: 'Active water events', history: 'Past water events' },
  alerts: { active: 'Active Alerts', history: 'Past Alerts' },
}

// ── MOCK DATA ──────────────────────────────────────────────────────────────
// Stand-in for the `events` prop so the overlay renders standalone. Shaped
// after src/data/events.js (type / systemName / timestamp / durationSec /
// resolved) and named after real systems in src/data/systems.js, with the
// city + street split the overlay rows need. Replace by passing `events`.
const MOCK_EVENTS = [
  // water · active
  { id: 'e1', type: 'leak-high', systemName: 'Fire Riser 2', city: 'San Fransisco', address: '1775 Washington St, Hanover MA 2339', timestamp: '2026-04-02T08:13:15', durationSec: 23760, resolved: false },
  { id: 'e2', type: 'leak-high', systemName: '360 Magnolia Row', city: 'Los Angeles', address: '333 Main Street, Tewksbury MA 1876', timestamp: '2026-04-02T08:13:15', durationSec: 23760, resolved: false },
  { id: 'e3', type: 'leak-high', systemName: '751 Poplar Court', city: 'Los Angeles', address: '700 Oak Street, Brockton MA 2301', timestamp: '2026-04-02T07:41:02', durationSec: 21600, resolved: false },
  { id: 'e4', type: 'leak-low', systemName: 'Main Supply', city: 'California', address: '301 Falls Blvd, Quincy MA 2169', timestamp: '2026-04-02T08:18:44', durationSec: 3840, resolved: false },
  { id: 'e5', type: 'leak-low', systemName: 'Main Supply', city: 'Malibu', address: '333 Main Street, Tewksbury MA 1876', timestamp: '2026-04-02T06:02:10', durationSec: 9180, resolved: false },
  { id: 'e6', type: 'leak-low', systemName: 'DCW Floors 1-18', city: 'Manchester', address: '1775 Washington St, Hanover MA 2339', timestamp: '2026-04-01T22:55:00', durationSec: 40320, resolved: false },
  // water · history
  { id: 'e7', type: 'leak-high', systemName: 'Cooling Tower #1', city: 'San Fransisco', address: '1775 Washington St, Hanover MA 2339', timestamp: '2026-03-28T04:12:09', durationSec: 5400, resolved: true },
  { id: 'e8', type: 'leak-low', systemName: 'Sump Pump B1', city: 'Los Angeles', address: '333 Main Street, Tewksbury MA 1876', timestamp: '2026-03-26T11:30:41', durationSec: 2700, resolved: true },

  // alerts · active
  { id: 'a1', type: 'power-lost', systemName: 'Fire Riser 2', city: 'San Fransisco', address: '1775 Washington St, Hanover MA 2339', timestamp: '2026-04-02T08:13:15', durationSec: 23760, resolved: false },
  { id: 'a2', type: 'power-lost', systemName: '360 Magnolia Row', city: 'Los Angeles', address: '333 Main Street, Tewksbury MA 1876', timestamp: '2026-04-02T08:13:15', durationSec: 23760, resolved: false },
  { id: 'a3', type: 'valve-error', systemName: '751 Poplar Court', city: 'Los Angeles', address: '700 Oak Street, Brockton MA 2301', timestamp: '2026-04-02T08:35:00', durationSec: 2820, resolved: false },
  // alerts · history
  { id: 'a4', type: 'power-lost', systemName: 'Fire Riser 2', city: 'San Fransisco', address: '1775 Washington St, Hanover MA 2339', timestamp: '2026-04-02T08:13:15', durationSec: 23760, resolved: true },
  { id: 'a5', type: 'valve-error', systemName: 'DHW Ground Floor', city: 'Liverpool', address: '12 Dock Road, Liverpool L3 4BQ', timestamp: '2026-03-30T03:49:12', durationSec: 19980, resolved: true },
  { id: 'a6', type: 'valve-error', systemName: 'Cooling Tower T2', city: 'Manchester', address: '1775 Washington St, Hanover MA 2339', timestamp: '2026-03-29T14:02:55', durationSec: 7200, resolved: true },
]

// ── Formatting ─────────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n) => String(n).padStart(2, '0')

// Events may arrive already display-formatted (the v1 data carries both), so a
// non-ISO string passes through untouched rather than rendering "Invalid Date".
function formatStamp(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return `${MONTHS[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatDuration(ev) {
  if (ev.duration) return ev.duration
  if (ev.durationSec == null) return ''
  const h = Math.floor(ev.durationSec / 3600)
  const m = Math.round((ev.durationSec % 3600) / 60)
  return h ? `${h}h ${m}m` : `${m}m`
}

// ── Overlay ────────────────────────────────────────────────────────────────
export default function EventOverlayV2({
  open = true,
  onClose,
  dataset = 'water',
  scope = 'account',
  scopeName = 'Building A',
  events = MOCK_EVENTS,
  initialFilter = 'all',
  initialTab = 'active',
}) {
  /* Seeded ONCE per mount. The overlay stays mounted and is toggled by `open`,
     so a caller wanting a different slice on the next open changes this
     component's `key` and lets React remount it — the documented way to reset
     state, and it avoids the cascading render an effect-based sync causes.
     HomeAllAccounts does exactly that so a health capsule can open this
     already filtered to the dimension that was tapped. */
  const [tab, setTab] = useState(initialTab)
  const [filter, setFilter] = useState(initialFilter)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const family = CHIP_ORDER[dataset] ? dataset : 'water'
  const isLocation = scope === 'location'
  const isHistory = tab === 'history'

  // A water chip must not survive a switch to the alerts dataset — it would
  // match nothing and read as an empty list rather than a stale filter.
  // Derived rather than reset in an effect, so the wrong list never renders.
  const activeFilter = TYPES[filter]?.dataset === family ? filter : 'all'

  const inDataset = events.filter((e) => TYPES[e.type]?.dataset === family)
  const inTab = inDataset.filter((e) => (isHistory ? !!e.resolved : !e.resolved))
  const visible = activeFilter === 'all' ? inTab : inTab.filter((e) => e.type === activeFilter)

  const title = `${inTab.length} ${NOUN[family][tab]}`
  // Only the 27px title dot goes slate in History; the All chip's dot stays red
  // in every frame (checked against both exported assets).
  const titleDotColor = isHistory ? SLATE_400 : RED_500

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="relative shrink-0 size-[28px] cursor-pointer"
      style={{ color: FOREGROUND }}
    >
      <CloseFill size={28} />
    </button>
  )

  return (
    <div
      className="absolute inset-0 z-40 content-stretch flex flex-col gap-[var(--p-0,0px)] items-start overflow-hidden p-[var(--spacing\/2,8px)]"
      style={{ backgroundImage: SHEET_BG }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Fixed chrome. Figma nests this and the list in one auto-layout column
          with gap-[22px]; here the list has to own the scroll, so the gap moves
          onto the scroller as pt-[22px] and this stays shrink-0. */}
      <div className="content-stretch flex flex-col gap-[22px] items-start pt-[10px] px-[var(--pro\/space\/2\,5,10px)] relative shrink-0 w-full">
        <div className="content-stretch flex flex-col gap-[22px] items-end relative shrink-0 w-full">

          {/* Account scope gets a bare close, top right. Location scope puts the
              breadcrumb on the left, because the scope is what the row no longer
              repeats. */}
          {isLocation ? (
            <div className="content-stretch flex gap-[22px] items-center relative shrink-0 w-full">
              <div className="content-stretch flex flex-[1_0_0] gap-[var(--spacing\/2,8px)] h-[44px] items-center min-w-px py-[var(--p-0,0px)] relative">
                <nav
                  aria-label="Breadcrumb"
                  className="content-center flex flex-wrap gap-[var(--component\/breadcrumb\/item\/gap,6px)] gap-y-[4px] items-center min-w-0 p-[var(--p-0,0px)] relative shrink-0"
                >
                  <div className="content-stretch flex gap-[var(--component\/breadcrumb\/item\/gap,6px)] items-center min-w-0 relative shrink-0">
                    {/* The crumbs are inert on purpose: this overlay takes no
                        navigation callback, and a link that silently does
                        nothing reads worse than plain text. */}
                    <span
                      className="[word-break:break-word] font-medium leading-[var(--text\/sm\/lh,20px)] relative shrink-0 text-[color:var(--colors\/slate\/400,#90a1b9)] text-[length:var(--text\/sm\/size,14px)] whitespace-nowrap"
                      style={{ fontWeight: 400 }}
                    >
                      Home
                    </span>
                    <span className="relative shrink-0 size-[16px] flex items-center justify-center" style={{ color: SLATE_400 }}>
                      <ArrowRightSLine size={16} />
                    </span>
                    <span className="content-stretch flex items-center justify-center p-[var(--spacing\/0\,5,2px)] relative shrink-0" style={{ color: SLATE_400 }}>
                      <span className="flex items-center justify-center overflow-clip relative shrink-0 size-[16px]">
                        <MoreHorizontal size={16} />
                      </span>
                    </span>
                    {/* slate-800, not slate-400 — this separator leads the
                        current-page crumb (node 198328:90276 / 450b4.svg). */}
                    <span className="relative shrink-0 size-[16px] flex items-center justify-center" style={{ color: SLATE_800 }}>
                      <ArrowRightSLine size={16} />
                    </span>
                    <span
                      aria-current="page"
                      className="[word-break:break-word] leading-[var(--text\/sm\/lh,20px)] min-w-0 overflow-hidden relative text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/sm\/size,14px)] text-ellipsis whitespace-nowrap"
                      style={{ fontWeight: 400 }}
                    >
                      {scopeName}
                    </span>
                  </div>
                </nav>
              </div>
              {closeButton}
            </div>
          ) : (
            closeButton
          )}

          <div className="content-stretch flex flex-col gap-[22px] items-start relative shrink-0 w-full">

            {/* Title */}
            <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
              <div className="content-stretch flex items-center relative shrink-0" style={{ color: titleDotColor }}>
                <LocationDot size={27} className="relative shrink-0" />
              </div>
              <h2
                className="[word-break:break-word] font-medium leading-[var(--text\/2xl\/lh,32px)] min-w-0 overflow-hidden relative text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/2xl\/size,24px)] text-ellipsis tracking-[-0.6px] whitespace-nowrap"
                dir="auto"
              >
                {title}
              </h2>
            </div>

            {/* Active / History — a ToggleGroup in the design, not Tabs. The
                pill radius lives on this wrapper so the two items only need to
                square their own corners, which keeps the Figma var() classes
                out of ToggleGroupItem's twMerge conflict resolution. */}
            <div className="content-stretch flex flex-col gap-[var(--p-0,0px)] items-end relative shrink-0 w-full">
              <ToggleGroup
                type="single"
                value={tab}
                // Radix single-select emits '' when the pressed item is pressed
                // again; this switch has no "neither" state.
                onValueChange={(v) => { if (v) setTab(v) }}
                className="content-stretch drop-shadow-[var(--shadow\/x,0px)_var(--shadows\/scale\/none\/y,0px)_calc(var(--shadows\/scale\/none\/blur,0px)/2)_var(--shadows\/color\/transparent,rgba(0,0,0,0)),var(--shadow\/x,0px)_var(--shadow\/control\/layer-1\/y,0px)_calc(var(--shadow\/control\/layer-1\/blur,0px)/2)_var(--shadow\/control\/layer-1\/color,rgba(0,0,0,0))] flex gap-[var(--p-0,0px)] items-center overflow-hidden p-[var(--p-0,0px)] relative rounded-[var(--component\/toggle\/radius,26px)] shrink-0 w-full"
              >
                <ToggleGroupItem
                  value="active"
                  aria-label="Active events"
                  className="border-[length:var(--border-width\/border,1px)] border-[var(--colors\/slate\/200,#e2e8f0)] border-solid content-stretch cursor-pointer flex flex-[1_0_0] gap-[var(--component\/toggle\/gap,4px)] h-[36px] items-center justify-center min-h-[36px] min-w-px overflow-clip px-[var(--component\/toggle\/size-default\/padding,12px)] py-[var(--p-0,0px)] relative rounded-none"
                  style={{
                    background: isHistory ? SLATE_100 : BLUE_100,
                    color: isHistory ? SLATE_800 : WINT_BLUE,
                  }}
                >
                  {/* `text-left` is the design's own asymmetry: it sits on the
                      Active label and not on History, in both frames. */}
                  <span className="[word-break:break-word] font-medium leading-[var(--text\/sm-tight\/lh,20px)] relative shrink-0 text-[length:var(--text\/sm-tight\/size,14px)] text-left whitespace-nowrap">
                    Active
                  </span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="history"
                  aria-label="Past events"
                  className="border-[var(--colors\/slate\/200,#e2e8f0)] border-b-[length:var(--border-width\/border,1px)] border-r-[length:var(--border-width\/border,1px)] border-solid border-t-[length:var(--border-width\/border,1px)] content-stretch cursor-pointer flex flex-[1_0_0] gap-[var(--component\/toggle\/gap,4px)] h-[36px] items-center justify-center min-h-[36px] min-w-px overflow-clip px-[var(--component\/toggle\/size-default\/padding,12px)] py-[var(--p-0,0px)] relative rounded-none"
                  style={{
                    background: isHistory ? BLUE_100 : SLATE_100,
                    color: isHistory ? WINT_BLUE : SLATE_800,
                  }}
                >
                  <span className="[word-break:break-word] font-medium leading-[var(--text\/sm-tight\/lh,20px)] relative shrink-0 text-[length:var(--text\/sm-tight\/size,14px)] whitespace-nowrap">
                    History
                  </span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Chips + result count. Figma pins this block at w-[390px], which
                is wider than the 393px frame minus its gutters — that is how the
                chips bleed off the right edge. Here the block is full width and
                the chip row alone scrolls sideways, so the sheet never does. */}
            <div className="content-stretch flex flex-col h-[92px] items-start justify-between pr-[var(--spacing\/4,16px)] relative shrink-0 w-full">
              <div className="-mx-[18px] overflow-x-auto px-[18px] w-[calc(100%+36px)] [&::-webkit-scrollbar]:h-0">
                <div className="content-stretch flex gap-[2px] items-center relative w-max">
                  <FilterChip
                    selected={activeFilter === 'all'}
                    onClick={() => setFilter('all')}
                    label="All"
                    count={inTab.length}
                  />
                  {CHIP_ORDER[family].map((type) => (
                    <FilterChip
                      key={type}
                      selected={activeFilter === type}
                      onClick={() => setFilter(type)}
                      label={TYPES[type].label}
                      count={inTab.filter((e) => e.type === type).length}
                      type={type}
                    />
                  ))}
                </div>
              </div>

              <div className="content-stretch flex gap-[6px] items-center relative shrink-0" style={{ color: SLATE_500 }}>
                <span className="relative shrink-0 size-[16px] flex items-center justify-center">
                  <Funnel size={16} />
                </span>
                <span className="content-stretch flex gap-[var(--component\/breadcrumb\/item\/gap,6px)] items-center justify-center p-[var(--p-0,0px)] relative shrink-0">
                  <span className="[word-break:break-word] leading-[var(--text\/sm\/lh,20px)] relative shrink-0 text-[color:var(--colors\/slate\/500,#62748e)] text-[length:var(--text\/sm\/size,14px)] whitespace-nowrap">
                    Showing {visible.length} of {inDataset.length}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The list owns the scroll — Phone.jsx is a fixed 393x852 box that never
          scrolls, so exactly one element here may, and it is this one. Figma
          gives the card h-[701px] + overflow-clip instead, which is a frame
          height, not a page height. */}
      <div
        className="px-[var(--pro\/space\/2\,5,10px)] pt-[22px] pb-[var(--spacing\/2,8px)] w-full"
        style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
      >
        {/* The "Liquid" effect style. Every component of it resolves to 0 /
            rgba(0,0,0,0) today, so it paints nothing — it is carried verbatim
            so the card picks the shadow up the moment the project defines
            --shadow/popover/layer-2/*, exactly as the design intends. */}
        <div className="bg-[#fafbfc] border-[length:var(--border-width\/border,1px)] border-solid border-white content-stretch flex flex-col items-center overflow-clip p-[var(--p-0,0px)] relative rounded-[var(--rounded-2xl,18px)] shadow-[var(--shadow\/x,0px)_var(--shadow\/popover\/layer-2\/y,0px)_var(--shadow\/popover\/layer-2\/blur,0px)_var(--shadow\/popover\/layer-2\/spread,0px)_var(--shadow\/popover\/layer-2\/color,rgba(0,0,0,0))] shrink-0 w-full">
          <div className="content-stretch flex flex-col items-center px-[var(--spacing\/4,16px)] relative shrink-0 w-full">
            {visible.length === 0 ? (
              <p
                className="[word-break:break-word] leading-[var(--text\/sm\/lh,20px)] py-[40px] relative shrink-0 text-[color:var(--colors\/slate\/500,#62748e)] text-[length:var(--text\/sm\/size,14px)] text-center"
              >
                No {isHistory ? 'past' : 'active'} {family === 'water' ? 'water events' : 'alerts'} match this filter.
              </p>
            ) : (
              visible.map((ev, i) => (
                <EventRow
                  key={ev.id ?? i}
                  ev={ev}
                  isLocation={isLocation}
                  // Only the first row goes without the 16px right padding —
                  // see ROW_WRAP_FIRST.
                  first={i === 0}
                  // Figma draws a rule above every row including the first, so
                  // the card opens on a hairline.
                  rule
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

/** A filter chip. `type` absent means the All chip, which draws the 24px
 *  location dot instead of a tinted disc. The selected state is two colour
 *  swaps, carried as inline style so the static Figma classes can stay literal
 *  (see the escaping note at the top of the file). */
function FilterChip({ selected, onClick, label, count, type }) {
  const t = type ? TYPES[type] : null
  const ink = selected ? SLATE_800 : SLATE_600

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="bg-[#fafbfc] border border-solid content-stretch cursor-pointer flex h-[36px] items-center pl-[5px] pr-[11px] relative rounded-[var(--rounded-3xl,26px)] shrink-0"
      style={{ borderColor: selected ? SLATE_600 : SLATE_200 }}
    >
      <span className="content-stretch flex gap-[9px] items-center relative shrink-0">
        <span className="content-stretch flex gap-[6px] items-center relative shrink-0">
          {t ? (
            <span
              className={
                t.chipNudge
                  ? 'content-stretch flex items-start justify-center pt-[4px] relative rounded-[17.19px] shrink-0 size-[24px]'
                  : 'content-stretch flex items-center justify-center relative rounded-[17.19px] shrink-0 size-[24px]'
              }
              style={{ background: t.chipTint, color: t.glyph }}
            >
              {t.valve
                // `size` is the ARTWORK box, not the frame box: ValveStatus's
                // error variant has a 12.5281x12 viewBox, so 12.5281 draws it
                // 1:1. Figma agrees — node 198378:73285 is a 24px disc holding
                // a 16px ValveStatus frame whose group is 11.643x11.115, which
                // is 12.5281x12 once the 0.4426 half-stroke halo is added.
                // Passing 16 here meet-fit the artwork to 16x15.33, ~28% large.
                ? <ValveStatus state="error" size={12.5281} className="relative shrink-0" />
                : <t.ChipIcon size={13} className="relative shrink-0" />}
            </span>
          ) : (
            // The All chip reuses the title dot at 24px. It stays red in
            // History — verified against both exported assets.
            <span className="relative shrink-0 size-[24px]" style={{ color: RED_500 }}>
              <LocationDot size={24} />
            </span>
          )}
          <span
            className="[word-break:break-word] font-medium leading-[var(--text\/sm\/lh-tight,18px)] overflow-hidden relative shrink-0 text-[14px] text-ellipsis whitespace-nowrap"
            style={{ color: ink }}
          >
            {label}
          </span>
        </span>
        <span
          className="[word-break:break-word] font-bold leading-[var(--text\/base\/lh-relaxed,26px)] overflow-hidden relative shrink-0 text-[16px] text-ellipsis tracking-[var(--text\/base\/heading-tracking,-0.4px)] whitespace-nowrap"
          style={{ color: ink }}
        >
          {count}
        </span>
      </span>
    </button>
  )
}

/** The row wrapper, in its two Figma spellings. Every frame gives rows 2..n a
 *  16px right padding and the FIRST row none (198328:89955 vs 198328:89978, and
 *  again 198378:73302 vs 198378:73325) — the row's inner content frame measures
 *  307 on row 1 and 291 below it, so the truncating address string gets 16px
 *  less room from row 2 down. This is ADDITIVE to the list container's own
 *  px-[var(--spacing\/4,16px)]; it is not a restatement of it.
 *
 *  A ternary cannot hold these inline: `\/` survives in a JSX string attribute
 *  but a plain JS string literal eats the backslash at parse time while
 *  Tailwind's scanner still emits the escaped selector, so the rule would
 *  silently stop matching. String.raw keeps the two in sync (see header note). */
const ROW_WRAP_FIRST = String.raw`content-stretch flex flex-col gap-[var(--spacing\/2,8px)] items-start py-[16px] relative shrink-0 w-full`
const ROW_WRAP = String.raw`content-stretch flex flex-col gap-[var(--spacing\/2,8px)] items-start pr-[var(--spacing\/4,16px)] py-[16px] relative shrink-0 w-full`

/** One event row.
 *  Account scope stacks the severity label under the 48px badge so the system
 *  name can own the first line. Location scope drops the name and the address
 *  entirely — the breadcrumb already says where this is — so the label moves
 *  up into the text column and the badge loses its caption.
 *
 *  Rows are deliberately inert: this overlay's contract carries no event-detail
 *  callback, and the design gives the row no affordance (no chevron, no press
 *  state). */
function EventRow({ ev, isLocation, rule, first }) {
  const t = TYPES[ev.type] ?? {
    label: ev.type,
    RowIcon: ElectricPlugs,
    badge: '#ffe2e2',
    glyph: RED_900,
    text: RED_900,
  }
  const RowIcon = t.RowIcon

  const badge = (
    <span
      className="content-stretch flex flex-col gap-[var(--component\/badge\/gap,4px)] items-center justify-center overflow-clip px-[var(--component\/badge\/px,8px)] py-[var(--component\/badge\/py,2px)] relative rounded-[var(--component\/pro\/application\/inline-hint\/rail\/radius,26px)] shrink-0 size-[48px]"
      style={{ background: t.badge, color: t.glyph }}
    >
      <span className="content-stretch flex flex-col items-start relative shrink-0">
        {t.valve
          ? <ValveStatus state="error" size={21} className="relative shrink-0" />
          : <RowIcon size={21} className="relative shrink-0" />}
      </span>
    </span>
  )

  const meta = (
    <div className="content-stretch flex gap-[13px] items-center relative shrink-0">
      <span className="[word-break:break-word] leading-[var(--text\/xs\/lh-snug,16.5px)] overflow-hidden relative shrink-0 text-[12px] text-[color:var(--colors\/slate\/500,#62748e)] text-ellipsis whitespace-nowrap">
        {formatStamp(ev.timestamp)}
      </span>
      <div className="content-stretch flex gap-[5px] items-center relative shrink-0">
        <span className="[word-break:break-word] leading-[var(--text\/xs\/lh-none,12px)] overflow-hidden relative shrink-0 text-[12px] text-[color:var(--colors\/slate\/900,#0f172b)] text-ellipsis whitespace-nowrap">
          {formatDuration(ev)}
        </span>
      </div>
    </div>
  )

  return (
    <>
      {rule && <RowRule />}
      <div className={first ? ROW_WRAP_FIRST : ROW_WRAP}>
        <div className="content-stretch flex gap-[17px] items-center relative shrink-0 w-full">

          {isLocation ? (
            <div className="content-stretch flex flex-col items-center relative shrink-0">{badge}</div>
          ) : (
            <div className="content-stretch flex flex-col gap-[5px] items-center relative shrink-0">
              {badge}
              <span
                className="[word-break:break-word] font-medium leading-[var(--text\/xs\/lh,16px)] overflow-hidden relative shrink-0 text-[12px] text-ellipsis whitespace-nowrap"
                style={{ color: t.text }}
              >
                {t.label}
              </span>
            </div>
          )}

          {isLocation ? (
            <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start justify-center min-w-px relative">
              <span
                className="[word-break:break-word] font-medium leading-[var(--text\/xs\/lh,16px)] overflow-hidden relative shrink-0 text-[12px] text-ellipsis whitespace-nowrap"
                style={{ color: t.text }}
              >
                {t.label}
              </span>
              <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
                {meta}
              </div>
            </div>
          ) : (
            <div className="content-stretch flex flex-[1_0_0] flex-col gap-[7px] items-start min-w-px relative">
              <div className="content-stretch flex items-center max-w-full min-w-0 relative shrink-0">
                <span className="[word-break:break-word] font-semibold leading-[var(--text\/sm\/lh,20px)] overflow-hidden relative text-[color:var(--foreground,#0a0a0a)] text-[length:var(--text\/sm\/size,14px)] text-ellipsis whitespace-nowrap">
                  {ev.systemName}
                </span>
              </div>
              <div className="content-stretch flex gap-[5px] items-center relative shrink-0 w-full">
                <span className="[word-break:break-word] leading-[var(--text\/xs\/lh-snug,16.5px)] relative shrink-0 text-[color:var(--colors\/slate\/500,#62748e)] text-[length:var(--text\/xs\/size,12px)] whitespace-nowrap">
                  {ev.city}
                </span>
                <CellHairline />
                <span className="[word-break:break-word] flex-[1_0_0] leading-[var(--text\/xs\/lh-snug,16.5px)] min-w-px overflow-hidden relative text-[12px] text-[color:var(--colors\/slate\/500,#62748e)] text-ellipsis whitespace-nowrap">
                  {ev.address}
                </span>
              </div>
              {meta}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
