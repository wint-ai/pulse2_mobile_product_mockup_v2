/**
 * How a policy's schedule window is PRINTED.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * `docs/wint-format-standards.md` is "24-hour clock always", and the
 * project-wide rule is hyphens, never em- or en-dashes. Two sources disagree
 * with both and neither is this component's to change:
 *
 *   · the DATA — `src/data/systemDetails.js` records schedules as
 *     `8:00 AM – 5:00 PM` and `5:00 PM – Mon 8:00 AM`: a 12-hour clock and an
 *     EN DASH.
 *   · the FRAME — Figma 200059:35959 draws `8AM-8PM`, also a 12-hour clock
 *     (its separator is already a hyphen).
 *
 * Where a frame and the standard disagree about a string's FORMAT the
 * standard wins and the substitution is recorded; where they disagree about
 * its CONTENT the frame wins. A clock is format, so this reformats what it is
 * handed rather than printing it through.
 *
 * It lives in its own module rather than in ActivePolicyCard.jsx because
 * `react-refresh/only-export-components` is an ERROR in this repo and that
 * file may export only its component — the same reason moreMenuModel.js and
 * concludedEvent.js exist.
 *
 * ── WHAT IT WILL NOT DO ────────────────────────────────────────────────────
 * It never guesses. A window with no recognisable 12-hour clock in it comes
 * back with its dashes normalised and nothing else touched, because the only
 * thing worse than a 12-hour clock on this card is a mangled one: this string
 * tells a facility manager when water is expected to flow.
 */

/* `(\d{1,2}):(\d{2})` then an optional space then AM/PM in any casing, with or
   without the periods some sources put in it. The word boundary keeps it off
   the digits of something longer. */
const CLOCK_12H = /\b(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]\.?/g

/* An en dash, an em dash or a hyphen, with whatever spacing, collapsing to a
   bare hyphen — the spacing the frame draws (`8AM-8PM`). */
const RANGE_SEP = /\s*[–—-]\s*/g

/**
 * @param {string} window e.g. `8:00 AM – 5:00 PM`
 * @returns {string}      e.g. `08:00-17:00`
 */
export function formatPolicyWindow(window) {
  if (typeof window !== 'string' || window === '') return window

  /* `test` on a /g regex advances lastIndex, which makes the next call lie.
     Reset before and after rather than relying on call order. */
  CLOCK_12H.lastIndex = 0
  const has12h = CLOCK_12H.test(window)
  CLOCK_12H.lastIndex = 0

  if (!has12h) {
    /* No clock to convert, but an en dash still breaks the hyphen rule. */
    RANGE_SEP.lastIndex = 0
    return window.replace(RANGE_SEP, '-')
  }

  const converted = window.replace(CLOCK_12H, (_match, h, m, ap) => {
    /* 12 AM is 00 and 12 PM is 12, which `% 12` gets right for both: it sends
       12 to 0, and the PM branch adds the 12 back. */
    const hour = Number(h) % 12
    const h24 = /[Pp]/.test(ap) ? hour + 12 : hour
    return `${String(h24).padStart(2, '0')}:${m}`
  })

  RANGE_SEP.lastIndex = 0
  return converted.replace(RANGE_SEP, '-').trim()
}
