// @vitest-environment happy-dom
//
// ONE EVENT, ONE DETECTION INSTANT — the regression guard for the unification
// of 2026-11-04.
//
// THE HISTORY THIS PINS. The mapping from `system.alert` to the object
// <AlertCard> draws existed TWICE: `SystemPageV2Screen.jsx`'s private
// `alertCardsFor` and `EventFocusOverlay.jsx`'s private `alertRowFor`, a
// deliberate field-for-field copy that said so in its own header. They
// drifted: the overlay learned to DATE its Detected line (2026-11-03, "Date
// is missing on the event card") and the page's copy kept reading
// `alert.startedAtStamp` raw, so the SAME EVENT reported two different
// detection times depending on which screen you opened it from — and on a
// PUSHED event, which carries no stamp, the page fell back to a bare clock
// with no day on it at all.
//
// Both now call `@/v2/components/eventAlertRow`. These tests fail if anyone
// re-copies it, because a copy is exactly how the divergence came back last
// time and nothing else would notice.
//
// TWO KINDS OF ASSERTION, both needed:
//   1. BEHAVIOURAL — mount both real surfaces on the same system and prove
//      the strings they draw are two FORMATS of one instant, and that the
//      instant is the shared builder's. A copy that happened to agree today
//      would pass this; that is fine, it is the user-visible contract.
//   2. STRUCTURAL — read the two component files and prove neither resolves a
//      detection time or strips a pre-formatted figure on its own any more.
//      This is the one that catches the re-copy on the day it is written,
//      before it has had a chance to drift.
//
// The FORMAT difference between the two surfaces is deliberate and
// UNRESOLVED: the System page draws the long stamp Figma node 199772:145451
// draws, the hero draws the card format wint-format-standards.md specifies,
// and the owner has been asked which wins. So these tests assert the two
// agree about the INSTANT and deliberately do NOT assert they agree about the
// format — pinning that would be ruling on it.

import { readFileSync } from 'node:fs'
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import { SYSTEMS } from '@/data/systems'
import { detectedInstant, eventAlertRow } from '@/v2/components/eventAlertRow'
import { formatDate } from '@/utils/format'

const WATER = new Set(['leak-high', 'leak-low'])

/* Picked OUT of the live dataset, never hard-coded, so a dataset refresh
   cannot make these vacuous. */
const leakSys = SYSTEMS.find(s => WATER.has(s.alert?.type))

beforeEach(() => { try { localStorage.clear() } catch { /* ignore */ } })
afterEach(cleanup)

const mount = (sys, search = '') =>
  render(
    <MemoryRouter initialEntries={[`/system/${sys.id}${search}`]}>
      <Routes>
        <Route path="/system/:systemId" element={<SystemPageV2Screen />} />
      </Routes>
    </MemoryRouter>,
  )

/** "Nov 3, 2026 22:14:00" — the long/tooltip form the System page's card draws. */
const LONG = /^[A-Z][a-z]{2} \d{1,2}, \d{4} \d{2}:\d{2}:\d{2}$/
/** "Nov 3 · 22:14" — the card form the event hero draws. */
const CARD = /^[A-Z][a-z]{2} \d{1,2} · \d{2}:\d{2}$/

/** month / day / hh / mm out of either form, so the two can be compared. */
function instantParts(text) {
  const m = /^([A-Z][a-z]{2}) (\d{1,2})(?:, \d{4})? (?:· )?(\d{2}):(\d{2})/.exec(text)
  if (!m) throw new Error(`not a detection stamp: ${JSON.stringify(text)}`)
  return { mon: m[1], day: m[2], hh: m[3], mm: m[4] }
}

/* Relative to THIS file (src/__tests__/), so a move of the test directory
   fails loudly rather than silently reading nothing. */
const SRC = p => readFileSync(new URL(p, import.meta.url), 'utf8')

/* THE SOURCE WITH ITS PROSE REMOVED. Every file in this repo explains itself
   at length, and the explanations NAME the things they are explaining — the
   note on SystemPageV2Screen's card row says, in as many words, that it used
   to read `alert.startedAtStamp`. A structural assertion run over the raw text
   therefore fires on the very comment that records the fix. Comments are
   stripped so these assertions test the CODE, which is what they are for; the
   import-line assertions below still run against the whole file, where a
   commented-out import would be a real finding. */
const CODE = p => SRC(p)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*/g, '$1')

describe('the System page card and the event hero share ONE detected instant', () => {
  it('has a live water event to test with', () => {
    expect(leakSys, 'the dataset must carry a live water event').toBeTruthy()
  })

  it('draws the System page card from the shared builder, dated', () => {
    mount(leakSys)
    const expected = formatDate(detectedInstant(leakSys.alert), 'tooltip')
    expect(expected).toMatch(LONG)
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
  })

  it('draws the event hero from the shared builder, in the card format', () => {
    mount(leakSys, '?focus=event')
    const expected = formatDate(detectedInstant(leakSys.alert), 'alert')
    expect(expected).toMatch(CARD)
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
  })

  /* THE DEFECT ITSELF. Two surfaces, one event, two strings that have to name
     the same moment. This is what was broken. */
  it('names the same moment on both surfaces, in two formats', () => {
    mount(leakSys)
    const pageText = screen.getAllByText(LONG)[0].textContent
    cleanup()

    mount(leakSys, '?focus=event')
    const heroText = screen.getAllByText(CARD)[0].textContent

    expect(instantParts(pageText)).toEqual(instantParts(heroText))
  })

  /* The hero's clock is still the dataset's own `startedAt`, to the minute, so
     the card cannot disagree with the flow chart's axis — the shared builder
     kept that rule when it absorbed the overlay's copy. */
  it('keeps the hero clock on the dataset’s own startedAt', () => {
    const hero = eventAlertRow(leakSys.alert, leakSys.id, { detectedFormat: 'alert' })
    expect(hero.detectedAt.endsWith(`· ${leakSys.alert.startedAt}`)).toBe(true)
  })

  /* Same builder, same instant, two contexts — the format is the ONLY thing a
     call site may vary about this line. */
  it('varies the format and nothing else between the two call-site options', () => {
    const page = eventAlertRow(leakSys.alert, leakSys.id, { detectedFormat: 'tooltip' })
    const hero = eventAlertRow(leakSys.alert, leakSys.id, { detectedFormat: 'alert' })
    expect(page.detectedAt).toMatch(LONG)
    expect(hero.detectedAt).toMatch(CARD)
    expect(instantParts(page.detectedAt)).toEqual(instantParts(hero.detectedAt))
  })
})

describe('the duplication cannot silently come back', () => {
  const page = SRC('../v2/pages/SystemPageV2Screen.jsx')
  const overlay = SRC('../v2/components/EventFocusOverlay.jsx')
  const pageCode = CODE('../v2/pages/SystemPageV2Screen.jsx')
  const overlayCode = CODE('../v2/components/EventFocusOverlay.jsx')

  it('has both surfaces importing the one builder', () => {
    for (const [name, src] of [['SystemPageV2Screen', page], ['EventFocusOverlay', overlay]]) {
      expect(src, `${name} must build its alert row with the shared helper`)
        .toMatch(/import \{ eventAlertRow \} from '@\/v2\/components\/eventAlertRow'/)
    }
  })

  it('leaves no component resolving a detection time on its own', () => {
    for (const [name, src] of [['SystemPageV2Screen', pageCode], ['EventFocusOverlay', overlayCode]]) {
      /* The page's old field read. It produced a DIFFERENT string from the
         overlay's for the same event, and on a pushed event a bare clock. */
      expect(src, `${name} must not read a detection stamp off the record`)
        .not.toMatch(/detectedAt:\s*alert\.startedAt/)
      /* A second copy of the resolver, under any name. */
      expect(src, `${name} must not define its own detection-instant resolver`)
        .not.toMatch(/function detectedInstant/)
      /* `resolveEventClock` was DELETED on 2026-11-04 — it existed only to
         recover a day from a bare clock, and the record now carries a full
         instant — so asserting nobody calls it had become vacuous. The
         assertion is re-pointed at what it was really for: neither component
         may read a raw time field off the alert and date it itself.
         `detectedInstant` is the one place that question is answered. */
      expect(src, `${name} must not read a raw instant off the alert record`)
        .not.toMatch(/alert\.started(AtIso|AtStamp)/)
      expect(src, `${name} must not reconstruct a date from a bare clock`)
        .not.toMatch(/new Date\([^)]*\bstartedAt\b/)
    }
  })

  /* "127 L/hour" and "1,285L" are PRE-FORMATTED STRINGS in the dataset and the
     card tiles figure and unit separately, so the unit has to come off. It
     came off in two files. It comes off in one. */
  it('strips the pre-formatted figures in exactly one place', () => {
    for (const [name, src] of [['SystemPageV2Screen', pageCode], ['EventFocusOverlay', overlayCode]]) {
      expect(src, `${name} must not re-implement the figure strip`)
        .not.toMatch(/replace\(\/\[\^\\d,\.\]\/g/)
    }
  })
})
