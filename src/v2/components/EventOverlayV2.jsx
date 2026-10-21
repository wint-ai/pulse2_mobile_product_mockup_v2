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
 *
 * TOKENS — Phase 3, docs/TOKENIZATION-PLAN.md (2026-10-21). Every
 * `var(--x, #hex)` in this file has been rewritten to the Tailwind utility
 * that paints the same value, and the fallback DELETED. The fallback was a
 * second, invisible source of truth that won whenever the token was missing,
 * with no warning and no visual tell; removing it makes a missing token fail
 * loudly. Nothing below renders differently — each value was resolved per
 * call site against what it already painted.
 *
 * Any note further down about keeping Figma's escaped `\/` token names
 * VERBATIM, and about String.raw being what carries the backslash, describes
 * the state BEFORE that pass. It is still the rule if an escaped name is ever
 * pasted back in from Figma — but no live class string in this file carries
 * one now, and a fresh paste should resolve the fallback hex to a utility.
 */

import { useEffect, useRef, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { CaretDown, Funnel, LocationDot, MessageBlocked, Waves, WifiDisconnected02 } from '@/v2/icons'
import { Check, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
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
const SLATE_400 = 'var(--slate-400)'  // #90a1b9 in `light`; follows the ramp
const SLATE_200 = '#e2e8f0'
const RED_500 = '#fb2c36'
const RED_600 = '#e7000b'
const RED_900 = '#82181a'
const ORANGE_500 = '#ff6900'
const ORANGE_600 = '#f54900'
/* Figma 199375:138276 — the Active toggle's ground is #c7e3ff in the current
   design. It was #dbeafe, taken from the 2026-09 frames this file was first
   reconciled against; that value appears nowhere in the new node. */
const BLUE_100 = '#c7e3ff'
const SLATE_100 = '#f1f5f9'
const WINT_BLUE = 'var(--primary)'

// The sheet's own ground: Figma's `backgroundImage` on all five frame roots,
// a cool diagonal wash laid over flat white.
//
/* The wash, themed. The angle stays here, the colours come from the shipped
   stop list — under `light` that token IS the rgba literal this carried, so
   `light` is byte-identical. NOT var(--chip-bg)/var(--app-bg): those bake one
   angle in at :root and a call-site angle override cannot reach them. See
   WintSidebarV2.jsx for the full note. */
const WASH_BASE = 'linear-gradient(90deg, var(--card) 0%, var(--card) 100%)'
/* The sheet root carries a FIFTH stop at 82.858% that the four-stop token
   does not; it is appended from --wash-4, whose `light` fallback is that
   stop's own literal. */
const WASH_TAIL = 'color-mix(in oklab, var(--wash-4, rgb(233, 237, 243)) 80%, transparent)'

// Flat, this froze the overlay's ground light while its ink followed the theme.
const SHEET_BG =
  `linear-gradient(131.41003432311655deg, var(--chip-bg-stops), ${WASH_TAIL} 82.858%), ${WASH_BASE}`

// ── Inlined Figma assets ───────────────────────────────────────────────────

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
  /* PRD 02's canonical filter keys include `offline` and `recipients`, and
     the health card counts both — but neither existed here, so the two tiles
     that point at them fell through to an unfiltered list. They are types now,
     with the same glyphs the health card's own issue tiles use. */
  offline: {
    dataset: 'alerts',
    label: 'Offline',
    RowIcon: WifiDisconnected02,
    ChipIcon: WifiDisconnected02,
    badge: '#ffe2e2',
    chipTint: '#ffe2e2',
    glyph: RED_900,
    text: RED_900,
  },
  recipients: {
    dataset: 'alerts',
    label: 'No recipients',
    RowIcon: MessageBlocked,
    ChipIcon: MessageBlocked,
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
  alerts: ['power-lost', 'valve-error', 'offline', 'recipients'],
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
  onSelectEvent,
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

  /* The filter options, in CHIP_ORDER — the same list, in the same order, that
     the chip row drew, with All first. The count on each is LIVE and is
     computed against `inTab`, exactly as each chip's was, so an option that
     currently matches nothing still appears and honestly reads 0. */
  const filterOptions = [
    { id: 'all', label: 'All', count: inTab.length },
    ...CHIP_ORDER[family].map((type) => ({
      id: type,
      type,
      label: TYPES[type].label,
      count: inTab.filter((e) => e.type === type).length,
    })),
  ]

  const title = `${inTab.length} ${NOUN[family][tab]}`
  // Only the 27px title dot goes slate in History; the All chip's dot stays red
  // in every frame (checked against both exported assets).
  const titleDotColor = isHistory ? SLATE_400 : RED_500

  /* Figma 199375:138276 "Mobile Header Bar" — the overlay dismisses with a
     circular BACK control, not a close X: a 30px disc on #fafbfc with a white
     border, carrying a 24px chevron-left. The old X is kept as the accessible
     name's sense ("Close") because that is still what the control does to this
     overlay — it closes it — but the affordance the design draws is back. */
  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="flex shrink-0 cursor-pointer items-center justify-center rounded-[120.833px] border border-solid border-card bg-surface-card pr-[2px] size-[30px]"
      style={{ color: FOREGROUND }}
    >
      <ChevronLeft size={24} aria-hidden="true" />
    </button>
  )

  return (
    <div
      className="absolute inset-0 z-40 content-stretch flex flex-col gap-0 items-start overflow-hidden px-4 py-2"
      style={{ backgroundImage: SHEET_BG }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Fixed chrome. Figma nests this and the list in one auto-layout column
          with gap-[22px]; here the list has to own the scroll, so the gap moves
          onto the scroller as pt-[22px] and this stays shrink-0. */}
      {/* 199375:138276's root is the SAME root the Location and System frames
          use — gap-[18px] px-[16px] py-[8px] — and 199375:138279 is the same
          h-[59px] py-[24px] Mobile Header Bar. This overlay had been built on
          the 8px root those frames carried BEFORE the 2026-10-20 refetch, plus
          a 10px inset of its own, which is why its back control landed at
          x=18/y=18 against x=16/y=22.5 everywhere else. Owner: "why arrow not
          always the same position on screen". Cards move 18 -> 16, the same
          move the two pages already made. */}
      <div className="content-stretch flex flex-col gap-[22px] items-start px-0 relative shrink-0 w-full">
        {/* items-start, not items-end. This column used to push the back
            control to the RIGHT edge, so the arrow sat top-right here and
            top-left on every other screen — owner: "why arrow not always the
            same position on screen". The node does not put it there: in
            199375:138280 the header bar's content row holds ONE child,
            199375:138281, a `flex-[1_0_0] min-w-px` left group carrying the
            30px disc. That is the same left group the System and Location
            bars use, so the arrow belongs in the same place on all three. */}
        <div className="content-stretch flex flex-col gap-[22px] items-start relative shrink-0 w-full">

          {/* Account scope gets a bare close, top right. Location scope puts the
              breadcrumb on the left, because the scope is what the row no longer
              repeats. */}
          {isLocation ? (
            <div className="content-stretch flex gap-2 items-center relative shrink-0 w-full">
              {/* Back FIRST, then the breadcrumb. The node draws no breadcrumb
                  at all — it is this app's, and it keeps its place — but the
                  disc goes where the other two screens put it. */}
              {closeButton}
              <div className="content-stretch flex flex-[1_0_0] gap-2 h-[44px] items-center min-w-px py-0 relative">
                <nav
                  aria-label="Breadcrumb"
                  className="content-center flex flex-wrap gap-1.5 gap-y-[4px] items-center min-w-0 p-0 relative shrink-0"
                >
                  <div className="content-stretch flex gap-1.5 items-center min-w-0 relative shrink-0">
                    {/* The crumbs are inert on purpose: this overlay takes no
                        navigation callback, and a link that silently does
                        nothing reads worse than plain text. */}
                    <span
                      className="[word-break:break-word] font-medium leading-5 relative shrink-0 text-slate-400 text-sm whitespace-nowrap"
                      style={{ fontWeight: 400 }}
                    >
                      Home
                    </span>
                    <span className="relative shrink-0 size-[16px] flex items-center justify-center" style={{ color: SLATE_400 }}>
                      <ArrowRightSLine size={16} />
                    </span>
                    <span className="content-stretch flex items-center justify-center p-0.5 relative shrink-0" style={{ color: SLATE_400 }}>
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
                      className="[word-break:break-word] leading-5 min-w-0 overflow-hidden relative text-slate-800 text-sm text-ellipsis whitespace-nowrap"
                      style={{ fontWeight: 400 }}
                    >
                      {scopeName}
                    </span>
                  </div>
                </nav>
              </div>
            </div>
          ) : (
            /* 199375:138280 > :138281 — the header bar's content row and its
               flex-1 left group, which is what lands the disc on the left. */
            <div className="content-stretch flex flex-col h-[59px] items-center justify-center py-6 relative shrink-0 w-full">
              <div className="content-center flex flex-wrap gap-[10px] items-center justify-center relative shrink-0 w-full">
                <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative">
                  {closeButton}
                </div>
              </div>
            </div>
          )}

          <div className="content-stretch flex flex-col gap-[22px] items-start relative shrink-0 w-full">

            {/* Title */}
            <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
              <div className="content-stretch flex items-center relative shrink-0" style={{ color: titleDotColor }}>
                <LocationDot size={27} className="relative shrink-0" />
              </div>
              <h2
                className="[word-break:break-word] font-medium leading-8 min-w-0 overflow-hidden relative text-slate-800 text-2xl text-ellipsis tracking-[-0.6px] whitespace-nowrap"
                dir="auto"
              >
                {title}
              </h2>
            </div>

            {/* Active / History — a ToggleGroup in the design, not Tabs. The
                pill radius lives on this wrapper so the two items only need to
                square their own corners, which keeps the Figma var() classes
                out of ToggleGroupItem's twMerge conflict resolution. */}
            <div className="content-stretch flex flex-col gap-0 items-end relative shrink-0 w-full">
              <ToggleGroup
                type="single"
                value={tab}
                // Radix single-select emits '' when the pressed item is pressed
                // again; this switch has no "neither" state.
                onValueChange={(v) => { if (v) setTab(v) }}
                className="content-stretch drop-shadow-[0px_0px_0px_transparent,0px_0px_0px_transparent] flex gap-0 items-center overflow-hidden p-0 relative rounded-[26px] shrink-0 w-full"
              >
                <ToggleGroupItem
                  value="active"
                  aria-label="Active events"
                  className="border border-border border-solid content-stretch cursor-pointer flex flex-[1_0_0] gap-1 h-[36px] items-center justify-center min-h-[36px] min-w-px overflow-clip px-3 py-0 relative rounded-none"
                  style={{
                    background: isHistory ? SLATE_100 : BLUE_100,
                    color: isHistory ? SLATE_800 : WINT_BLUE,
                  }}
                >
                  {/* `text-left` is the design's own asymmetry: it sits on the
                      Active label and not on History, in both frames. */}
                  <span className="[word-break:break-word] font-medium leading-5 relative shrink-0 text-sm text-left whitespace-nowrap">
                    Active
                  </span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="history"
                  aria-label="Past events"
                  className="border-border border-b border-r border-solid border-t content-stretch cursor-pointer flex flex-[1_0_0] gap-1 h-[36px] items-center justify-center min-h-[36px] min-w-px overflow-clip px-3 py-0 relative rounded-none"
                  style={{
                    background: isHistory ? BLUE_100 : SLATE_100,
                    color: isHistory ? WINT_BLUE : SLATE_800,
                  }}
                >
                  <span className="[word-break:break-word] font-medium leading-5 relative shrink-0 text-sm whitespace-nowrap">
                    History
                  </span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Filter + result count.
                2026-10-20, the owner on the chip row: "i want to hide this
                under the filter icon — keep same functionalities." The row of
                chips that stood here was a w-[390px] block inside a 393px frame
                minus its gutters, so it bled off the right edge and had to
                scroll sideways to be reachable at all. It is now collapsed
                behind the funnel the "Showing" line already carried.
                NOTHING the chips did is gone: every chip is an option in the
                menu, in the same per-dataset order (CHIP_ORDER), each carrying
                the same LIVE count it carried as a chip, and the current
                selection plus its own count stay on the trigger while the menu
                is shut — a filtered list that reads as a complete one is the
                bug this collapse would otherwise introduce. */}
            <div className="content-stretch flex gap-2 items-center justify-between pr-4 relative shrink-0 w-full">
              <EventFilterMenu
                value={activeFilter}
                options={filterOptions}
                onChange={setFilter}
                label={family === 'water' ? 'Filter water events' : 'Filter alerts'}
              />

              <div className="content-stretch flex gap-[6px] items-center min-w-0 relative" style={{ color: SLATE_500 }}>
                {/* `inTab`, not `inDataset`. This line states what the FILTER
                    narrowed, so its denominator has to be the same set the All
                    option counts — the tab you are looking at. While every row
                    this overlay was ever given was unresolved the two were
                    identical, so this changes nothing that renders today; it is
                    what keeps the Active tab reading "Showing 50 of 50" now
                    that resolved rows travel in the same array, instead of
                    "Showing 50 of 153" with 103 of those sitting in History
                    where the filter cannot reach them. The tab filter itself is
                    untouched.
                    The funnel glyph that led this line is now the menu's
                    trigger, six pixels to the left — one funnel, not two. */}
                <span className="[word-break:break-word] leading-5 relative shrink-0 text-muted-foreground text-sm whitespace-nowrap">
                  Showing {visible.length} of {inTab.length}
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
        className="px-0 pt-[22px] pb-2 w-full"
        style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
      >
        {/* The "Liquid" effect style. Every component of it resolves to 0 /
            rgba(0,0,0,0) today, so it paints nothing — it is carried verbatim
            so the card picks the shadow up the moment the project defines
            --shadow/popover/layer-2/*, exactly as the design intends. */}
        <div className="bg-surface-card border border-solid border-card content-stretch flex flex-col items-center overflow-clip p-0 relative rounded-[18px] shadow-[0px_0px_0px_0px_rgba(0,0,0,0)] shrink-0 w-full">
          <div className="content-stretch flex flex-col items-center px-4 relative shrink-0 w-full">
            {visible.length === 0 ? (
              <p
                className="[word-break:break-word] leading-5 py-[40px] relative shrink-0 text-muted-foreground text-sm text-center"
              >
                No {isHistory ? 'past' : 'active'} {family === 'water' ? 'water events' : 'alerts'} match this filter.
              </p>
            ) : (
              visible.map((ev, i) => (
                <EventRow
                  key={ev.id ?? i}
                  ev={ev}
                  isLocation={isLocation}
                  onSelect={onSelectEvent}
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

/** One filter option's glyph — the 24px disc the chips drew, unchanged, so an
 *  option in the menu is recognisably the chip it replaces. `type` absent means
 *  the All option, which draws the 24px location dot instead of a tinted disc.
 *  It stays red in History — verified against both exported assets. */
function FilterGlyph({ type }) {
  const t = type ? TYPES[type] : null

  if (!t) {
    return (
      <span aria-hidden="true" className="relative shrink-0 size-[24px]" style={{ color: RED_500 }}>
        <LocationDot size={24} />
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className={
        t.chipNudge
          ? 'content-stretch flex items-start justify-center pt-[4px] relative rounded-[17.19px] shrink-0 size-[24px]'
          : 'content-stretch flex items-center justify-center relative rounded-[17.19px] shrink-0 size-[24px]'
      }
      style={{ background: t.chipTint, color: t.glyph }}
    >
      {t.valve
        // `size` is the ARTWORK box, not the frame box: ValveStatus's error
        // variant has a 12.5281x12 viewBox, so 12.5281 draws it 1:1. Figma
        // agrees — node 198378:73285 is a 24px disc holding a 16px ValveStatus
        // frame whose group is 11.643x11.115, which is 12.5281x12 once the
        // 0.4426 half-stroke halo is added. Passing 16 here meet-fit the
        // artwork to 16x15.33, ~28% large.
        ? <ValveStatus state="error" size={12.5281} className="relative shrink-0" />
        : <t.ChipIcon size={13} className="relative shrink-0" />}
    </span>
  )
}

/* ── EventFilterMenu — the chip row, collapsed ─────────────────────────────
   Owner, 2026-10-20: "i want to hide this under the filter icon — keep same
   functionalities."

   WHY A DROPDOWN AND NOT SystemsFilterSheet. That sheet is this project's
   precedent for a RICH filter: several categories, multi-select, a draft that
   Cancel can throw away, a search box. This filter is one single-select
   dimension with at most five options (alerts: All + four types; water: All +
   two), applied the instant it is tapped and with nothing to cancel. A sheet
   would take the whole frame and two taps — open, pick, and it dismisses
   itself — to do what a three-to-five row listbox does in place. So this is
   the house dropdown instead: the SAME control TopUsageCard's period pill and
   WaterConsumptionCardV2's GranularityDropdown already are, down to the
   keyboard contract.

   NO PORTAL, deliberately. The list is an absolutely-positioned child of a
   relative wrapper inside the overlay, so it is laid out in the phone frame's
   own coordinate space. Radix's <Select> / <DropdownMenu> portal to
   document.body, which escapes the fixed 393x852 frame in Phone.jsx and paints
   over the whole browser window — a bug already fixed three times here. Do not
   reintroduce it by reaching for a portal primitive.
   z-30 is what lifts the open list over the event card below it: the overlay
   root is the stacking context (z-40, positioned) and the card is z-auto, so a
   positive z-index on the list is the whole of what is needed.

   WHAT STAYS VISIBLE WHILE SHUT: the funnel, the selected option's LABEL, and
   its live COUNT. A chip row's one real advantage over a menu is that it
   reports counts without being touched; the trigger keeps the count for the
   filter in force, and the menu carries the rest. The trigger's border also
   darkens to slate/600 whenever the filter is narrower than All — the same
   selected treatment the chip itself used.

   ARIA: a real button carrying aria-haspopup="listbox" + aria-expanded opens a
   role="listbox" whose role="option" children carry aria-selected. Arrow keys
   / Home / End move the active option, Enter or Space picks it, type-ahead
   jumps to the first option whose label starts with what was typed, Escape and
   Tab close, an outside pointerdown closes, and focus returns to the trigger on
   every close. */
const FILTER_TRIGGER = String.raw`bg-surface-card border border-solid content-stretch cursor-pointer flex gap-[6px] h-[36px] items-center min-w-0 outline-none pl-[11px] pr-[9px] relative rounded-[26px] focus-visible:ring-[3px] focus-visible:ring-ring/50`
/* text-[14px] BEFORE leading-[]: tailwind-merge counts a font-size as
   conflicting with a line-height and drops a leading-* that precedes it. */
const FILTER_TRIGGER_LABEL = String.raw`[word-break:break-word] font-medium min-w-0 overflow-hidden relative text-[14px] leading-[18px] text-ellipsis whitespace-nowrap`
const FILTER_TRIGGER_COUNT = String.raw`[word-break:break-word] font-bold relative text-[16px] leading-[26px] tracking-[-0.4px] whitespace-nowrap`
const FILTER_MENU = String.raw`absolute left-0 top-[calc(100%+6px)] z-30 bg-surface-card border border-solid border-border content-stretch flex flex-col items-stretch max-w-[260px] min-w-[204px] overflow-clip p-[4px] rounded-[12px] shadow-[0px_8px_24px_0px_rgba(15,23,43,0.12)]`
const FILTER_ITEM = String.raw`content-stretch cursor-pointer flex gap-[8px] items-center justify-between min-h-[40px] outline-none px-[8px] py-[4px] rounded-[8px] text-left w-full hover:bg-slate-100 focus-visible:bg-slate-100`

function EventFilterMenu({ value, options, onChange, label }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)
  const itemRefs = useRef([])
  const typed = useRef({ text: '', at: 0 })

  const selectedIndex = Math.max(0, options.findIndex((o) => o.id === value))
  const current = options[selectedIndex] ?? options[0]
  const narrowed = current?.id !== 'all'

  /* Escape and any outside pointerdown close it. A popover dismissable only by
     re-tapping its own trigger is a trap on a touch screen — the same note the
     other two instances carry.
     The keydown listener is registered in the CAPTURE phase so Escape closes
     the menu without also reaching the overlay's own Escape handler, which
     would otherwise shut the whole sheet behind it. */
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
    }
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  /* Roving focus: whichever option is active holds the caret while the menu is
     open, so the arrow keys and the screen reader agree on where you are. */
  useEffect(() => {
    if (open) itemRefs.current[activeIndex]?.focus()
  }, [open, activeIndex])

  const openMenu = () => {
    setActiveIndex(selectedIndex)
    setOpen(true)
  }
  const closeMenu = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }
  const choose = (option) => {
    closeMenu()
    onChange?.(option.id)
  }

  const onTriggerKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    openMenu()
  }

  const onMenuKeyDown = (e) => {
    const last = options.length - 1
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i >= last ? 0 : i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? last : i - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIndex(last)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(options[activeIndex] ?? current)
    } else if (e.key === 'Tab') {
      closeMenu()
    } else if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
      /* Type-ahead, with a buffer that expires after a second so a later "l"
         searches for Low Flow instead of extending "va" into "val". */
      const now = Date.now()
      const text = (now - typed.current.at > 1000 ? '' : typed.current.text) + e.key.toLowerCase()
      typed.current = { text, at: now }
      const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(text))
      if (hit >= 0) setActiveIndex(hit)
    }
  }

  return (
    <div ref={wrapRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        /* The accessible name carries the filter IN FORCE and its count, so a
           narrowed list announces itself without the menu being opened — the
           one thing a chip row gave for free. */
        aria-label={`${label}, currently ${current.label}, ${current.count}`}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        className={FILTER_TRIGGER}
        style={{ borderColor: narrowed ? SLATE_600 : SLATE_200 }}
      >
        <span aria-hidden="true" className="relative shrink-0 size-[16px] flex items-center justify-center" style={{ color: narrowed ? SLATE_800 : SLATE_500 }}>
          <Funnel size={16} />
        </span>
        <span className={FILTER_TRIGGER_LABEL} style={{ color: narrowed ? SLATE_800 : SLATE_600 }}>
          {current.label}
        </span>
        <span className={FILTER_TRIGGER_COUNT} style={{ color: narrowed ? SLATE_800 : SLATE_600 }}>
          {current.count}
        </span>
        <CaretDown
          size={16}
          aria-hidden="true"
          className="relative shrink-0 transition-transform"
          style={{ color: SLATE_500, transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {open ? (
        <div className={FILTER_MENU} role="listbox" aria-label={label} onKeyDown={onMenuKeyDown}>
          {options.map((option, i) => {
            const selected = option.id === value
            return (
              <button
                key={option.id}
                ref={(node) => {
                  itemRefs.current[i] = node
                }}
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={i === activeIndex ? 0 : -1}
                onClick={() => choose(option)}
                className={cn(FILTER_ITEM, selected && String.raw`bg-slate-100`)}
                style={{ color: selected ? SLATE_800 : SLATE_600 }}
              >
                <span className="content-stretch flex gap-[6px] items-center min-w-0 relative">
                  <FilterGlyph type={option.type} />
                  <span
                    className={cn(
                      String.raw`[word-break:break-word] min-w-0 overflow-hidden relative text-[14px] leading-[18px] text-ellipsis whitespace-nowrap`,
                      selected ? 'font-medium' : '',
                    )}
                  >
                    {option.label}
                  </span>
                </span>
                <span className="content-stretch flex gap-[4px] items-center relative">
                  <span className={FILTER_TRIGGER_COUNT}>{option.count}</span>
                  {/* aria-hidden: the tick is the statement aria-selected
                      already makes, and unhidden it would append to the
                      option's own accessible name. */}
                  {selected ? (
                    <Check size={14} aria-hidden="true" className="relative shrink-0" style={{ color: WINT_BLUE }} />
                  ) : (
                    <span aria-hidden="true" className="relative shrink-0 size-[14px]" />
                  )}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
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
const ROW_WRAP_FIRST = String.raw`content-stretch flex flex-col gap-2 items-start py-[16px] relative shrink-0 w-full`
const ROW_WRAP = String.raw`content-stretch flex flex-col gap-2 items-start pr-4 py-[16px] relative shrink-0 w-full`

/** One event row.
 *  Account scope stacks the severity label under the 48px badge so the system
 *  name can own the first line. Location scope drops the name and the address
 *  entirely — the breadcrumb already says where this is — so the label moves
 *  up into the text column and the badge loses its caption.
 *
 *  Rows are deliberately inert: this overlay's contract carries no event-detail
 *  callback, and the design gives the row no affordance (no chevron, no press
 *  state). */
/* PRD 05a, three times over: "Tapping any row opens that system's page."
   This row had no onClick, no role and no tabIndex, so a viewer could open the
   alerts overlay from a health tile, read the ten affected systems and reach
   none of them. It is a button when the host gives it a destination, and a
   plain div when it does not — the rule this repo keeps everywhere: never
   render a control that does nothing. */
function EventRow({ ev, isLocation, rule, first, onSelect }) {
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
      className="content-stretch flex flex-col gap-1 items-center justify-center overflow-clip px-2 py-0.5 relative rounded-[26px] shrink-0 size-[48px]"
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
      <span className="[word-break:break-word] leading-[16.5px] overflow-hidden relative shrink-0 text-[12px] text-muted-foreground text-ellipsis whitespace-nowrap">
        {formatStamp(ev.timestamp)}
      </span>
      <div className="content-stretch flex gap-[5px] items-center relative shrink-0">
        <span className="[word-break:break-word] leading-3 overflow-hidden relative shrink-0 text-[12px] text-foreground text-ellipsis whitespace-nowrap">
          {formatDuration(ev)}
        </span>
      </div>
    </div>
  )

  /* A button only when the host wired a destination; otherwise the same div
     it always was, so an overlay used purely as a readout gains no dead
     affordance. The accessible name carries the system and the fault, since
     the visible row says them in two separate columns. */
  const RowTag = onSelect ? 'button' : 'div'
  const rowProps = onSelect
    ? {
        type: 'button',
        onClick: () => onSelect(ev),
        'aria-label': `${ev.systemName ?? 'System'} — ${t.label}. Open this system.`,
        className: cn(
          first ? ROW_WRAP_FIRST : ROW_WRAP,
          'cursor-pointer text-left outline-none transition-colors',
          'hover:bg-primary/4 focus-visible:ring-[3px] focus-visible:ring-ring/50',
        ),
      }
    : { className: first ? ROW_WRAP_FIRST : ROW_WRAP }

  return (
    <>
      {rule && <RowRule />}
      <RowTag {...rowProps}>
        <div className="content-stretch flex gap-[17px] items-center relative shrink-0 w-full">

          {isLocation ? (
            <div className="content-stretch flex flex-col items-center relative shrink-0">{badge}</div>
          ) : (
            <div className="content-stretch flex flex-col gap-[5px] items-center relative shrink-0">
              {badge}
              <span
                className="[word-break:break-word] font-medium leading-4 overflow-hidden relative shrink-0 text-[12px] text-ellipsis whitespace-nowrap"
                style={{ color: t.text }}
              >
                {t.label}
              </span>
            </div>
          )}

          {isLocation ? (
            <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start justify-center min-w-px relative">
              <span
                className="[word-break:break-word] font-medium leading-4 overflow-hidden relative shrink-0 text-[12px] text-ellipsis whitespace-nowrap"
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
                <span className="[word-break:break-word] font-semibold leading-5 overflow-hidden relative text-foreground text-sm text-ellipsis whitespace-nowrap">
                  {ev.systemName}
                </span>
              </div>
              <div className="content-stretch flex gap-[5px] items-center relative shrink-0 w-full">
                <span className="[word-break:break-word] leading-[16.5px] relative shrink-0 text-muted-foreground text-xs whitespace-nowrap">
                  {ev.city}
                </span>
                <CellHairline />
                <span className="[word-break:break-word] flex-[1_0_0] leading-[16.5px] min-w-px overflow-hidden relative text-[12px] text-muted-foreground text-ellipsis whitespace-nowrap">
                  {ev.address}
                </span>
              </div>
              {meta}
            </div>
          )}
        </div>
      </RowTag>
    </>
  )
}
