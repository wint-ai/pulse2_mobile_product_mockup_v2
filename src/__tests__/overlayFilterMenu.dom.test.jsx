// @vitest-environment happy-dom
//
// EventOverlayV2's filter, collapsed behind the funnel.
//
// 2026-10-20, the owner on the overlay's chip row ("● All 50 · ≈ High Flow 21 ·
// ≈ Low Flow 2…", which overflowed the frame and had to be scrolled sideways):
//
//     "i want to hide this under the filter icon — keep same functionalities."
//
// The chips are now options in an in-frame listbox hung off the funnel glyph
// the "Showing N of N" line already carried. "Keep same functionalities" is the
// whole of what this file pins, because collapsing a control is exactly the
// change that quietly drops one of its states:
//
//   1. EVERY filter still exists, per dataset — water: All / High Flow / Low
//      Flow; alerts: All / AC Unplugged / Valve error / Offline / No
//      recipients, in CHIP_ORDER.
//   2. Every option still carries its LIVE count, which is why the chips were
//      informative at rest: "High Flow 21" was readable without tapping.
//   3. The SELECTION stays visible while the menu is shut. A filtered list that
//      presents itself as a complete one is the classic bug of this change, so
//      the trigger names the filter in force AND its count, in its text and in
//      its accessible name.
//   4. "Showing N of N" still agrees with the rows on screen.
//   5. The health tiles still open the alerts overlay PRE-FILTERED, and the
//      collapsed trigger says which filter landed.
//
// Counts are derived from the rendered rows, never from literals, so these stay
// true as the dataset moves.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import HomeAllAccounts from '@/v2/pages/HomeAllAccounts'
import EventOverlayV2 from '@/v2/components/EventOverlayV2'

afterEach(cleanup)
// The overlay's rows are built partly from localStorage sim state; a stray row
// from another suite would move the counts.
beforeEach(() => localStorage.clear())

function mountHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomeAllAccounts />} />
        <Route path="/system/:systemId" element={<div>SYSTEM PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

/* The overlay dialog, told apart from the page's other dialogs (the locations
   drawer) by the title the overlay gives itself. */
const overlay = () =>
  screen
    .getAllByRole('dialog')
    .find((d) => /\d+ (Active|Past) /i.test(d.getAttribute('aria-label') ?? ''))

const trigger = () => within(overlay()).getByRole('button', { expanded: false, hidden: false, name: /^Filter / })
const triggerAny = () => overlay().querySelector('[aria-haspopup="listbox"]')
const rows = () => within(overlay()).queryAllByRole('button', { name: /Open this system\./ })
const showing = () => within(overlay()).getByText(/^Showing \d+ of \d+$/).textContent
const options = () =>
  within(overlay())
    .getAllByRole('option')
    .map((o) => ({
      el: o,
      text: o.textContent.trim(),
      selected: o.getAttribute('aria-selected') === 'true',
    }))

/* EventOverlayV2's own CHIP_ORDER.alerts, restated so the fixture below
   covers every alert filter the menu offers. */
const CHIP_ORDER_ALERTS = ['power-lost', 'valve-error', 'offline', 'recipients']
const openMenu = () => fireEvent.click(triggerAny())
const openWater = () => fireEvent.click(screen.getByRole('button', { name: /View all \d+ water events/ }))
const openAlerts = (name) => fireEvent.click(screen.getAllByRole('button', { name })[0])

describe('the overlay filter is collapsed behind the funnel', () => {
  it('draws no chip row at all — one trigger, nothing to scroll sideways', () => {
    mountHome()
    openWater()

    // The chips were <button aria-pressed>; the row they sat in was the
    // overlay's only horizontal scroller.
    expect(overlay().querySelectorAll('[aria-pressed]').length).toBe(0)
    expect(overlay().querySelectorAll('.overflow-x-auto').length).toBe(0)

    const t = triggerAny()
    expect(t, 'the funnel trigger').toBeTruthy()
    expect(t.getAttribute('aria-haspopup')).toBe('listbox')
    expect(t.getAttribute('aria-expanded')).toBe('false')
    // Closed: no listbox in the tree.
    expect(within(overlay()).queryAllByRole('option').length).toBe(0)
  })

  it('names the filter in force and its count while shut, and agrees with Showing', () => {
    mountHome()
    openWater()

    const all = rows().length
    expect(all, 'the fleet has active water events').toBeGreaterThan(0)
    expect(trigger().textContent).toContain('All')
    expect(trigger().textContent).toContain(String(all))
    expect(trigger().getAttribute('aria-label')).toBe(`Filter water events, currently All, ${all}`)
    expect(showing()).toBe(`Showing ${all} of ${all}`)
  })

  it('water: All / High Flow / Low Flow, each with its live count, each still filtering', () => {
    mountHome()
    openWater()
    const all = rows().length

    openMenu()
    const opts = options()
    expect(opts.map((o) => o.text.replace(/\d+$/, ''))).toEqual(['All', 'High Flow', 'Low Flow'])
    expect(opts[0].selected).toBe(true)

    // The counts the chips used to publish, now on the options.
    const counts = Object.fromEntries(
      opts.map((o) => [o.text.replace(/\d+$/, ''), Number(/(\d+)$/.exec(o.text)[1])]),
    )
    expect(counts.All).toBe(all)
    expect(counts['High Flow'] + counts['Low Flow']).toBe(all)
    expect(counts['High Flow']).toBeGreaterThan(0)
    expect(counts['Low Flow']).toBeGreaterThan(0)

    for (const label of ['High Flow', 'Low Flow']) {
      if (!overlay().querySelector('[role="listbox"]')) openMenu()
      fireEvent.click(options().find((o) => o.text.startsWith(label)).el)

      expect(rows().length, `${label} filters the list`).toBe(counts[label])
      expect(showing()).toBe(`Showing ${counts[label]} of ${all}`)
      // The selection survives the collapse — this is the "a filtered list
      // looks complete" bug, and it is what the trigger is for.
      expect(trigger().textContent).toContain(label)
      expect(trigger().getAttribute('aria-label')).toBe(
        `Filter water events, currently ${label}, ${counts[label]}`,
      )
      // Every row on screen is of that type.
      for (const r of rows()) expect(r.getAttribute('aria-label')).toContain(`— ${label}.`)
    }

    // And back to All, which is the only way to widen a filter once the chips
    // are gone.
    openMenu()
    fireEvent.click(options().find((o) => o.text.startsWith('All')).el)
    expect(rows().length).toBe(all)
    expect(showing()).toBe(`Showing ${all} of ${all}`)
  })

  it('alerts: all four alert filters survive, in CHIP_ORDER, with their counts', () => {
    mountHome()
    /* WAS the health card's "Offline systems: n" tile. That tile is GONE —
       SystemHealthCard.jsx:876 records "`noRecipients` and `onSelectIssue`
       WENT WITH THE BREAKDOWN - 2026-11-09", the owner's ruling stripping that
       card to its bar and its "x / y need attention" line. "Show all alerts"
       is the surviving door and is what HomeAllAccounts wires to
       openOverlay('alerts'). Nothing this test ASSERTS depended on the tile:
       its subject is the filter menu's options and their counts, and it opens
       the menu itself on the next line. */
    openAlerts(/^Show all alerts$/)

    openMenu()
    const opts = options()
    expect(opts.map((o) => o.text.replace(/\d+$/, ''))).toEqual([
      'All',
      'AC Unplugged',
      'Valve error',
      'Offline',
      'No recipients',
    ])

    const counts = Object.fromEntries(
      opts.map((o) => [o.text.replace(/\d+$/, ''), Number(/(\d+)$/.exec(o.text)[1])]),
    )
    const parts = ['AC Unplugged', 'Valve error', 'Offline', 'No recipients']
    expect(parts.reduce((n, k) => n + counts[k], 0)).toBe(counts.All)

    for (const label of parts) {
      if (!overlay().querySelector('[role="listbox"]')) openMenu()
      fireEvent.click(options().find((o) => o.text.startsWith(label)).el)
      expect(rows().length, `${label} filters the list`).toBe(counts[label])
      expect(showing()).toBe(`Showing ${counts[label]} of ${counts.All}`)
      expect(trigger().textContent).toContain(label)
    }
  })

  it('an overlay opened pre-filtered says so on the shut trigger', () => {
    /* ⚠ RETARGETED 2026-11-09, AND THE HOST PATH IT USED IS GONE FOR GOOD.
       This read "a health tile still opens the overlay pre-filtered": it
       clicked SystemHealthCard's "Offline systems:" / "Valve errors:" /
       "Disconnected power:" tiles, which seeded `initialFilter` through
       HomeAllAccounts' openOverlay(). The owner has since ruled that card down
       to its bar and its "x / y need attention" line, and the breakdown tiles
       went with it — SystemHealthCard.jsx:876: "`noRecipients` and
       `onSelectIssue` WENT WITH THE BREAKDOWN - 2026-11-09". No surviving
       control on that page pre-filters this overlay: `onShowAll` passes no
       filter and `onShowPast` passes only a tab.

       SO THE HOST WIRING IS NOT RE-ASSERTED HERE, because it no longer exists
       and inventing a replacement door would be a test of nothing. What IS
       re-asserted is the guarantee the test was written for and which is THIS
       component's own: an overlay opened already narrowed must not read as a
       complete list — the filter has to be named on the shut trigger and the
       "Showing" line has to state the narrowing. That is `initialFilter`, a
       live prop of EventOverlayV2, and it is now exercised directly rather
       than through a page that can no longer reach it.

       IF A PRE-FILTERING ENTRY POINT COMES BACK, the host-level assertion
       should come back with it; this is the component-level floor under it,
       not a replacement for it. */
    /* An explicit fixture rather than the component's own MOCK_EVENTS, which
       carries `power-lost` and `valve-error` but no `offline` and no
       `recipients` row at all — so two of the four filters would have had
       nothing to narrow and the test would have asserted 0 of 0. Two rows per
       type gives every filter a non-zero count AND keeps the denominator (8)
       above every numerator (2), which is what the "Showing n of m" assertion
       below is actually about. */
    const alertRows = CHIP_ORDER_ALERTS.flatMap((type, i) => [0, 1].map((n) => ({
      id: `${type}-${n}`,
      type,
      systemName: `System ${i}${n}`,
      city: 'San Fransisco',
      address: '1775 Washington St, Hanover MA 2339',
      timestamp: '2026-04-02T08:13:15',
      durationSec: 23760,
      resolved: false,
    })))

    for (const [type, label] of [
      ['offline', 'Offline'],
      ['valve-error', 'Valve error'],
      ['power-lost', 'AC Unplugged'],
      ['recipients', 'No recipients'],
    ]) {
      cleanup()
      render(
        <MemoryRouter>
          <EventOverlayV2
            dataset="alerts"
            initialFilter={type}
            events={alertRows}
            /* REQUIRED, and not boilerplate: EventRow draws a <button> only
               when the host wired a destination and a plain <div> otherwise
               (`const RowTag = onSelect ? 'button' : 'div'`), so without this
               the rows render as divs, `rows()` finds no buttons and the
               counts all read 0. The page mount gets this for free. */
            onSelectEvent={() => {}}
          />
        </MemoryRouter>,
      )
      const count = rows().length
      expect(count, `${label} matches nothing in the fixture`).toBeGreaterThan(0)

      expect(trigger().textContent, `${label} must be named on the trigger`).toContain(label)
      expect(trigger().getAttribute('aria-label')).toBe(`Filter alerts, currently ${label}, ${count}`)
      // Narrowed, and the line says so: the numerator is this filter's count
      // and the denominator is the whole Active tab.
      /* Exact, not a regex: the denominator is the whole Active tab, which
         for this fixture is every row in it. (A `\d` inside a TEMPLATE
         LITERAL is just `d` — the regex this replaced silently matched
         "Showing 2 of d+" and passed for the wrong reason.) */
      expect(showing()).toBe(`Showing ${count} of ${alertRows.length}`)
      expect(alertRows.length).toBeGreaterThan(count)
      for (const r of rows()) expect(r.getAttribute('aria-label')).toContain(`— ${label}.`)
    }
  })

  it('the History tab keeps the control, with History\'s own counts', () => {
    mountHome()
    openWater()
    fireEvent.click(within(overlay()).getByLabelText('Past events'))

    const past = rows().length
    expect(past, 'the dataset holds past water events').toBeGreaterThan(0)
    expect(trigger().getAttribute('aria-label')).toBe(`Filter water events, currently All, ${past}`)

    openMenu()
    const counts = Object.fromEntries(
      options().map((o) => [o.text.replace(/\d+$/, ''), Number(/(\d+)$/.exec(o.text)[1])]),
    )
    expect(counts.All).toBe(past)
    expect(counts['High Flow'] + counts['Low Flow']).toBe(past)

    fireEvent.click(options().find((o) => o.text.startsWith('High Flow')).el)
    expect(rows().length).toBe(counts['High Flow'])
    expect(showing()).toBe(`Showing ${counts['High Flow']} of ${past}`)
  })

  it('Escape closes the menu and keeps the overlay, and focus returns to the trigger', () => {
    /* The overlay closes on Escape too, so the menu has to swallow the key —
       otherwise one Escape over an open menu throws the whole sheet away. */
    mountHome()
    openWater()
    openMenu()
    expect(within(overlay()).getAllByRole('option').length).toBeGreaterThan(0)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(overlay(), 'the overlay must survive').toBeTruthy()
    expect(within(overlay()).queryAllByRole('option').length).toBe(0)
    expect(triggerAny().getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(triggerAny())
  })

  it('an outside pointerdown closes the menu', () => {
    mountHome()
    openWater()
    openMenu()
    expect(within(overlay()).getAllByRole('option').length).toBeGreaterThan(0)

    fireEvent.pointerDown(overlay().querySelector('h2'))

    expect(within(overlay()).queryAllByRole('option').length).toBe(0)
    expect(triggerAny().getAttribute('aria-expanded')).toBe('false')
  })
})
