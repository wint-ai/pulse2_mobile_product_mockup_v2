/**
 * The Active policy card prints its window on a 24-hour clock.
 *
 * `docs/wint-format-standards.md` is "24-hour clock always" and the project
 * rule is hyphens, never em- or en-dashes. Both of the card's sources break
 * one or both: `src/data/systemDetails.js` stores `8:00 AM – 5:00 PM` (12-hour
 * AND an en dash) and Figma 200059:35959 draws `8AM-8PM` (12-hour). Where a
 * frame and the standard disagree about a string's FORMAT the standard wins,
 * so the surface reformats rather than printing through.
 *
 * The cases that matter are the two the dataset actually contains plus the
 * two the clock arithmetic gets wrong if `% 12` is forgotten: noon and
 * midnight.
 */
import { describe, it, expect } from 'vitest'
import { formatPolicyWindow } from '@/v2/components/policyWindow'

describe('formatPolicyWindow', () => {
  it('converts the dataset\'s own windows', () => {
    // systemDetails.js:100 and :112, verbatim.
    expect(formatPolicyWindow('8:00 AM – 5:00 PM')).toBe('08:00-17:00')
    expect(formatPolicyWindow('5:00 PM – Mon 8:00 AM')).toBe('17:00-Mon 08:00')
  })

  it('gets noon and midnight right', () => {
    // 12 AM is 00 and 12 PM is 12 — the pair `% 12` alone would invert.
    expect(formatPolicyWindow('12:00 AM – 12:00 PM')).toBe('00:00-12:00')
    expect(formatPolicyWindow('12:30 AM – 1:05 PM')).toBe('00:30-13:05')
  })

  it('pads to two digits, which is what makes a column line up', () => {
    expect(formatPolicyWindow('9:05 AM – 6:00 PM')).toBe('09:05-18:00')
  })

  it('accepts the casings and the periods real data carries', () => {
    expect(formatPolicyWindow('8:00 am - 5:00 pm')).toBe('08:00-17:00')
    expect(formatPolicyWindow('8:00 A.M. - 5:00 P.M.')).toBe('08:00-17:00')
  })

  it('normalises an en or em dash even with no clock to convert', () => {
    expect(formatPolicyWindow('Nov 2025 – Oct 2026')).toBe('Nov 2025-Oct 2026')
    expect(formatPolicyWindow('Nov 2025 — Oct 2026')).toBe('Nov 2025-Oct 2026')
  })

  it('never mangles a window it does not understand', () => {
    // This string tells a facility manager when water is expected to flow.
    // Returning it untouched is the only safe answer.
    expect(formatPolicyWindow('Always on')).toBe('Always on')
    expect(formatPolicyWindow('8AM-8PM')).toBe('8AM-8PM')
    expect(formatPolicyWindow('')).toBe('')
    expect(formatPolicyWindow(null)).toBe(null)
    expect(formatPolicyWindow(undefined)).toBe(undefined)
    expect(formatPolicyWindow(42)).toBe(42)
  })

  it('is not stateful across calls', () => {
    // The module's regexes are /g, and `test` advances lastIndex — a second
    // call on the same input must give the same answer as the first.
    const once = formatPolicyWindow('8:00 AM – 5:00 PM')
    const twice = formatPolicyWindow('8:00 AM – 5:00 PM')
    expect(twice).toBe(once)
    for (let i = 0; i < 5; i++) expect(formatPolicyWindow('8:00 AM – 5:00 PM')).toBe('08:00-17:00')
  })
})
