// @vitest-environment happy-dom
//
// The System hero's "See more" is a ONE-WAY JUMP into the consumption chart.
//
// 2026-10-20, the owner, looking at the System page hero:
//
//     "see more is only redirect to consumption chart on the dates above, so
//      see less is not relevant — and in addition consumption chart shall be
//      always visible."
//
// That finished a change he started earlier the same day — "when user clicks
// on see more it redirect him the consumption chart with context of the date
// written above and with the compare to previous month". The control was a
// disclosure triangle; it is now an entry point, and as of this instruction
// there is nothing left for it to disclose: the chart is ALWAYS mounted.
//
// So this file pins five things, four of which it has always pinned:
//
//   0. the chart is on screen with no interaction at all (the new one);
//   1. the caption and the chart name the SAME window (they share one
//      consumptionView, and this pins that they still do);
//   2. the jump is DETERMINISTIC — a drill-down the user left behind does not
//      decide which window the control lands on;
//   3. the comparison is on at every tap, and the user can still switch it off
//      from inside the card, where it stays off until the next tap;
//   4. §4 — the control must not revert a grouping the user picked. On a
//      grouping he chose there is no drill to unwind and PLS-WC-20 keeps the
//      comparison off, which is the owner's own ruling on that case: "ok so
//      w/o compare, just take me to relevant dates."
//
// And two that the removal of the gate makes newly checkable: the label never
// reads "See less", the control carries no `aria-expanded` — it expands
// nothing and must not say it does — and it scrolls on EVERY tap, including
// two taps in a row, which no state change could drive because by the second
// tap every piece of state this handler sets is already at its target value.
//
// WHY THE CARD IS WRAPPED. The drill is triggered by clicking a bar, and
// recharts draws no bars under happy-dom — there is no layout, so the plot has
// zero width and the bar shapes that carry role="button" are never rendered.
// consumptionDefaultAndReturn.dom.test.jsx hits the same wall and works around
// it differently. Here the drill has to go through the
// SCREEN's handler, so the real card is rendered inside a wrapper that adds
// the one affordance recharts would otherwise provide: a button that calls
// `onDrillDown` with a real bucket key off the data the screen passed. Nothing
// is stubbed — the card below it is the production component, which is what
// makes the compare switch and the period controls below real assertions.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('@/v2/components/WaterConsumptionCardV2', async (importOriginal) => {
  const actual = await importOriginal()
  const { createElement: h, Fragment } = await import('react')
  const Real = actual.default
  return {
    ...actual,
    default: function CardWithDrillAffordance(props) {
      /* The last bucket of the window, which is the one the period label
         names — drillTarget() resolves a {kind:'month'} key to the Daily
         window for that month. */
      const last = props.data?.[props.data.length - 1]
      lastProps = props
      return h(
        Fragment,
        null,
        h(
          'button',
          {
            type: 'button',
            'data-testid': 'test-drill',
            disabled: !last?.key,
            onClick: () => props.onDrillDown?.(last.key),
          },
          'drill',
        ),
        h(Real, props),
      )
    },
  }
})

let lastProps = null

import SystemPageV2Screen from '@/v2/pages/SystemPageV2Screen'
import { SYSTEMS } from '@/data/systems'
import { currentGranularity, pickGranularity } from './helpers/consumptionChart'

/* THE SCROLL IS THE OBSERVABLE HALF OF THE JUMP, so it is spied rather than
   left to happy-dom. Two things are faked, both of them things a headless DOM
   has no opinion about:
     · scrollIntoView — the screen tests for it before calling it, so a DOM
       without one would silently skip the scroll and prove nothing;
     · requestAnimationFrame — the screen waits a frame so the chart's node is
       committed before it reads the ref. Running the callback synchronously
       keeps these tests free of timers; the frame is not what is under test.
   Both are restored per test. */
let scrollSpy
beforeEach(() => {
  scrollSpy = vi.fn()
  Element.prototype.scrollIntoView = scrollSpy
  vi.stubGlobal('requestAnimationFrame', (cb) => {
    cb(0)
    return 0
  })
})

afterEach(() => {
  cleanup()
  lastProps = null
  delete Element.prototype.scrollIntoView
  vi.unstubAllGlobals()
})

const sys = SYSTEMS[0]

const mount = () =>
  render(
    <MemoryRouter initialEntries={[`/system/${sys.id}`]}>
      <Routes><Route path="/system/:systemId" element={<SystemPageV2Screen />} /></Routes>
    </MemoryRouter>,
  )

/* The accessible name is no longer the two words the comp draws. A control
   that moves the page has to say where it goes, so the button is named
   "See more: go to the water consumption chart" — the visible label first, so
   voice control still matches what is painted (WCAG 2.5.3). Matching on the
   prefix keeps this test honest about the words on screen without freezing the
   rest of the sentence. */
const seeMore = (c) => within(c).getByRole('button', { name: /^See more\b/ })
const compareSwitch = (c) =>
  within(c).queryByRole('switch', { name: /compare previous period/i })
/* The chart's own wrapper, the node the jump scrolls to (Figma 198629:51874).
   Asserted through the DOM rather than through the compare switch, because the
   switch is Monthly-only and the chart is not. */
const chartNode = (c) => c.querySelector('[data-node-id="198629:51874"]')

/* The caption the hero prints: "Water consumption" over the range.
   RE-POINTED IN THE 2026-10-20 MERGE. This used to match the whole caption
   block by its tone-dependent node id (calm 199296:50197 / alert
   199296:50721) and strip the "Water consumption" line off the front. The
   Figma reconciliation re-fetched those frames: the block is 199396:84051 for
   both tones now, and the range has a node of its own (199383:141633) under
   it. Matching the range node directly is what this assertion always meant,
   and it no longer has to guess the tone or peel a prefix. The old ids stay in
   the selector so the test keeps working against either generation of the
   component rather than silently passing on neither. */
const captionRange = (c) => {
  const range = c.querySelector('[data-node-id="199383:141633"]')
  const node = range
    ?? c.querySelector('[data-node-id="199396:84051"], [data-node-id="199296:50197"], [data-node-id="199296:50721"]')
  expect(node, 'the hero caption is missing').toBeTruthy()
  return node.textContent.replace(/^Water consumption\s*/, '').trim()
}

/* The card's period control reads `labelShort`, which falls back to `label`
   everywhere except Hourly. Nothing here is Hourly, so this is `label`. */
const chartLabel = () => lastProps.monthLabel

/* ONE WINDOW, READ TWICE — STILL TRUE, NO LONGER ONE STRING.
   Until 2026-10-21 the caption WAS `consumptionView.label`, so the assertion
   could be `caption === chartLabel()`. The owner then asked for the hero to
   name the elapsed span instead: "this dates needs to be date to month / eg
   for today 1-21.10". The Daily window therefore carries a third label,
   `labelRange`, and the hero prints it — so on a Daily window the two
   readers SPELL the same window differently ("Oct 1–21" in the caption,
   "October 2026" in the period control, which has to split a month from a
   year and cannot do it to a bare range).

   The invariant that matters is unchanged and is what this helper pins: the
   caption names the window the chart is plotting. It re-derives the expected
   spelling from the rows the SCREEN handed the card, rather than importing
   the production rule, so that a change to either side fails here instead of
   quietly agreeing with itself. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const expectedCaption = () => {
  const read = (lastProps.data ?? []).filter((r) => r.litres != null)
  if (!read.length || read[0].key?.kind !== 'day') return chartLabel()
  const from = read[0].key
  const to = read[read.length - 1].key
  return from.d === to.d
    ? `${MONTHS[from.m]} ${from.d}`
    : `${MONTHS[from.m]} ${from.d}–${to.d}`
}

/* The assertion the old `caption === chartLabel()` was always making. */
const namesTheChartsWindow = (c) => expect(captionRange(c)).toBe(expectedCaption())

describe('the consumption chart is always on the page', () => {
  it('is mounted on arrival, with no interaction', () => {
    const { container } = mount()

    expect(chartNode(container), 'the chart is not on the page').toBeTruthy()
    expect(lastProps, 'the card never rendered').toBeTruthy()
    /* AND IT OPENS ON MONTH-TO-DATE. The owner, 2026-10-21: "this dates needs
       to be date to month / eg for today 1-21.10". That window is the Daily
       grouping at offset 0 — the calendar month drawn at its true length with
       the days it has not reached left null (§5 / PLS-WC-17) — so `period` is
       'D' and the caption is the elapsed span of it. It was 'M' here until
       that instruction (PLS-WC-03). */
    expect(lastProps.period).toBe('D')
    expect(captionRange(container)).toMatch(/^[A-Z][a-z]{2} \d{1,2}(–\d{1,2})?$/)
    namesTheChartsWindow(container)
    /* The comparison is OFFERED on this window and is OFF until asked for.
       PLS-WC-20 made the switch Monthly-only; Daily was added on 2026-10-21
       with the owner's ruling on what the comparison should LOOK like there —
       bars for the current month with the previous month's matching dates as
       an overlaid line, because "60 bars on mobile is not a good idea". So
       the switch is drawn here, and nothing is pre-compared: a comparison is
       something a control turns on, not a default. */
    expect(compareSwitch(container)).toBeTruthy()
    expect(compareSwitch(container).getAttribute('aria-checked')).toBe('false')
  })

  it('never offers "See less", and the control claims no expanded state', () => {
    const { container } = mount()

    const control = seeMore(container)
    expect(control.tagName).toBe('BUTTON')
    expect(control.textContent).toContain('See more')
    expect(control.hasAttribute('aria-expanded'), 'the jump claims to expand something').toBe(false)

    fireEvent.click(control)

    // Still the same one control, still reading "See more". There is no
    // second state for it to flip into.
    expect(within(container).queryByRole('button', { name: /see less/i })).toBeNull()
    expect(seeMore(container).textContent).toContain('See more')
    expect(seeMore(container).hasAttribute('aria-expanded')).toBe(false)
    expect(chartNode(container), 'the chart was closed by the control').toBeTruthy()
  })
})

describe('the hero "See more" is a jump into the chart', () => {
  it('scrolls the chart into view, and does it again on a second tap', () => {
    const { container } = mount()
    expect(scrollSpy).not.toHaveBeenCalled()

    fireEvent.click(seeMore(container))
    expect(scrollSpy.mock.calls.length).toBe(1)
    expect(scrollSpy.mock.instances[0]).toBe(chartNode(container))
    expect(scrollSpy.mock.calls[0][0]).toMatchObject({ block: 'start' })

    /* THE SECOND TAP IS THE WHOLE REASON THE SCROLL IS IMPERATIVE. By now the
       grouping, the offset and the comparison are all already where this
       handler would put them, so nothing changes and no effect keyed on state
       could fire. The page must still move. */
    fireEvent.click(seeMore(container))
    expect(scrollSpy.mock.calls.length).toBe(2)
    expect(scrollSpy.mock.instances[1]).toBe(chartNode(container))
  })

  it('turns the comparison on, against a real previous window', () => {
    const { container } = mount()

    /* ON MONTHLY. The page opens on month-to-date now, and PLS-WC-20 keeps
       the comparison Monthly-only — so the window that HAS a compare switch
       has to be chosen before the jump can be asked to turn it on. Picking a
       grouping clears the trail (§3.1), which is exactly the state this case
       wants: no drill to unwind, just the comparison. */
    pickGranularity(container, 'Month')
    fireEvent.click(seeMore(container))

    const sw = compareSwitch(container)
    expect(sw, 'the chart is not on the page').toBeTruthy()
    expect(sw.getAttribute('aria-checked')).toBe('true')
    // And a real previous window is behind it, not an invented one.
    expect(lastProps.compare).toBe(true)
    expect(lastProps.compareData?.length).toBe(lastProps.data.length)
  })

  /* THE OWNER'S ORIGINAL ASK, ON THE WINDOW THE PAGE NOW OPENS ON: "when user
     clicks on see more it redirect him the consumption chart with context of
     the date written above and with the compare to previous month". The
     caption says Oct 1–21; the chart lands on that window with September's
     matching dates over it. */
  it('compares month-to-date against the same dates last month', () => {
    const { container } = mount()
    expect(captionRange(container)).toBe('Oct 1–21')

    fireEvent.click(seeMore(container))

    expect(lastProps.period).toBe('D')
    expect(compareSwitch(container).getAttribute('aria-checked')).toBe('true')

    /* THE COMPARISON IS SHORTER THAN THE AXIS, and that is the point. The
       month is drawn at its true length (§5), so `data` is all 31 days of
       October with 21 readings in it; the comparison is September 1-21 and
       NOT all thirty of September, because comparing three weeks against a
       month would only be a statement about September being longer. */
    const read = lastProps.data.filter((r) => r.litres != null)
    expect(lastProps.data).toHaveLength(31)
    expect(read).toHaveLength(21)
    expect(lastProps.compareData).toHaveLength(21)
    expect(lastProps.compareData[0].key).toMatchObject({ y: 2026, m: 8, d: 1 })
    expect(lastProps.compareData[20].key).toMatchObject({ y: 2026, m: 8, d: 21 })

    /* And the legend says so in the caption's own form, which is what stops
       it reading "Previous period" over a line that is nothing of the kind. */
    expect(lastProps.seriesLabel).toBe('Oct 1–21')
    expect(lastProps.compareLabel).toBe('Sep 1–21')
  })

  it('lands on the window the caption names, and keeps naming it', () => {
    const { container } = mount()
    fireEvent.click(seeMore(container))

    namesTheChartsWindow(container)
    // The month-to-date window is where the page already was, so the jump
    // lands on it rather than moving to it.
    expect(lastProps.period).toBe('D')
    expect(captionRange(container)).toBe('Oct 1–21')

    /* One step back moves BOTH, because there is only one window — and it
       moves the caption off month-to-date onto a COMPLETE month, which is
       the span rule stating itself: September reports Sep 1–30 because all
       thirty of its days carry a reading, while October reports Oct 1–21
       because only twenty-one of its do. */
    fireEvent.click(within(container).getByRole('button', { name: 'Previous period' }))
    namesTheChartsWindow(container)
    expect(captionRange(container)).toBe('Sep 1–30')
  })

  it('unwinds a drill-down back to the caption window, and never shows a return control', () => {
    const { container } = mount()
    // The drill below opens a Daily window, so it has to start on Monthly to
    // be a drill at all. §3.1 clears the trail on the pick, so the unwind
    // this case is about is recorded by the drill and nothing else.
    pickGranularity(container, 'Month')
    fireEvent.click(seeMore(container))

    const opened = chartLabel()
    expect(lastProps.period).toBe('M')

    // Drill one level: Monthly -> the Daily window for that month (§3.5).
    fireEvent.click(within(container).getByTestId('test-drill'))
    expect(lastProps.period).toBe('D')
    expect(chartLabel()).not.toBe(opened)
    /* AND NO WAY BACK IS OFFERED. The "‹ Back to Monthly" pill used to appear
       exactly here; the owner removed it on 2026-10-20 — "what is back to
       monthly? remove it." This asserts the drill still WORKS without it, so a
       future reader can see that the absence is the instruction and not a
       broken render. */
    expect(within(container).queryByTestId('consumption-return')).toBeNull()
    // The caption follows the chart down — they never disagree, which is the
    // reason the unwind below is about determinism, not about a mismatch.
    // Down here the window is Daily, so the caption is in the span form.
    namesTheChartsWindow(container)

    /* ONE tap, from the drilled state. There is no "See less" to close first
       any more, so the unwind has to happen on the jump itself. */
    fireEvent.click(seeMore(container))

    expect(lastProps.period).toBe('M')
    expect(chartLabel()).toBe(opened)
    expect(captionRange(container)).toBe(opened)
    expect(currentGranularity(container)).toBe('Month')
    /* THE TRAIL IS STILL THERE AND STILL DOES THIS. The pill it used to feed
       was removed on 2026-10-20, and the `chartOpen` gate went the same day,
       but `periodTrail` was deliberately kept both times:
       jumpToChartFromHero reads `periodTrail[0]` and that is what unwound the
       drill three lines up. Deleting the trail as "dead code" because its
       visible control is gone breaks this assertion, which is the whole
       point of it being written down here. */
    expect(compareSwitch(container).getAttribute('aria-checked')).toBe('true')
    // And the jump took the user back down to the chart while doing it.
    expect(scrollSpy.mock.calls.length).toBe(2)
  })

  it('turns the comparison on at every tap, and lets the user turn it off', () => {
    const { container } = mount()
    // Monthly, for the switch — see the case above.
    pickGranularity(container, 'Month')
    fireEvent.click(seeMore(container))

    fireEvent.click(compareSwitch(container))
    expect(compareSwitch(container).getAttribute('aria-checked')).toBe('false')
    expect(lastProps.compareData).toBeNull()

    /* Off is where the user put it, and nothing on the page drags it back —
       only another tap on the control does. */
    fireEvent.click(within(container).getByRole('button', { name: 'Previous period' }))
    expect(compareSwitch(container).getAttribute('aria-checked')).toBe('false')

    fireEvent.click(seeMore(container))
    // Deterministic: a second tap lands in the same place as the first.
    expect(compareSwitch(container).getAttribute('aria-checked')).toBe('true')
  })

  it('withholds the comparison where the series has no previous period', () => {
    const { container } = mount()
    // Monthly, for the switch — see the case above.
    pickGranularity(container, 'Month')
    fireEvent.click(seeMore(container))

    // Walk to the oldest window the series can fill (PLS-WC-09 stops us there).
    let guard = 60
    let prev = within(container).getByRole('button', { name: 'Previous period' })
    while (!prev.disabled && guard > 0) {
      fireEvent.click(prev)
      prev = within(container).getByRole('button', { name: 'Previous period' })
      guard -= 1
    }
    expect(guard, 'never reached the start of the series').toBeGreaterThan(0)

    fireEvent.click(seeMore(container))

    /* bucketMonthly clamps its offset forward at the start of the series, so
       offset - 1 would hand back this very window. A comparison drawn from it
       is a copy of the reading, not a comparison, so the chart is left
       uncompared and says so by leaving the switch off. */
    expect(lastProps.period).toBe('M')
    expect(compareSwitch(container).getAttribute('aria-checked')).toBe('false')
    expect(lastProps.compareData).toBeNull()
    // Still the same one window, and still the caption's.
    namesTheChartsWindow(container)
  })
})

describe('the jump keeps a grouping the user picked (§4)', () => {
  it('does not drag a self-picked grouping back to the default window', () => {
    const { container } = mount()
    fireEvent.click(seeMore(container))

    /* YEARLY, NOT DAILY. This case needs a grouping the user chose that is
       NOT the one the page opens on, and since 2026-10-21 the page opens on
       Daily. Yearly also keeps the case's second half honest: it has no
       previous window at all (§2 — it is the whole series at once), so
       PLS-WC-20 leaves the comparison off for the same reason it used to
       here. The owner's ruling on exactly this: "ok so w/o compare, just
       take me to relevant dates." */
    pickGranularity(container, 'Year')
    expect(currentGranularity(container)).toBe('Year')
    const picked = captionRange(container)
    expect(picked).toBe(chartLabel())
    // PLS-WC-20: outside Monthly the card does not even draw the switch.
    expect(compareSwitch(container)).toBeNull()

    /* Picking a grouping clears the trail itself (§3.1), so there is no drill
       to unwind and the jump has nothing to reset. The owner on exactly this:
       "ok so w/o compare, just take me to relevant dates." It takes him to the
       chart — the scroll still fires — and leaves his window alone. */
    const before = scrollSpy.mock.calls.length
    fireEvent.click(seeMore(container))

    expect(currentGranularity(container)).toBe('Year')
    expect(captionRange(container)).toBe(picked)
    expect(chartLabel()).toBe(picked)
    expect(compareSwitch(container)).toBeNull()
    expect(scrollSpy.mock.calls.length).toBe(before + 1)
  })
})
