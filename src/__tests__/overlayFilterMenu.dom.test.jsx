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
    openAlerts(/Offline systems:/)

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

  it('a health tile still opens the overlay pre-filtered, and the shut trigger says so', () => {
    /* The entry points that open this overlay already filtered: the health
       card's issue tiles seed `initialFilter` through HomeAllAccounts'
       openOverlay(). Collapsing the chips must not leave that filter silent. */
    for (const [tile, label] of [
      [/Offline systems:/, 'Offline'],
      [/Valve errors:/, 'Valve error'],
      [/Disconnected power:/, 'AC Unplugged'],
    ]) {
      cleanup()
      mountHome()
      const count = Number(/(\d+)/.exec(screen.getAllByRole('button', { name: tile })[0].getAttribute('aria-label'))[1])
      openAlerts(tile)

      expect(trigger().textContent, `${label} must be named on the trigger`).toContain(label)
      expect(trigger().getAttribute('aria-label')).toBe(`Filter alerts, currently ${label}, ${count}`)
      expect(rows().length).toBe(count)
      // Narrowed, and the line says so: the numerator is this tile's count and
      // the denominator is the whole Active tab.
      expect(showing()).toMatch(new RegExp(`^Showing ${count} of \\d+$`))
      expect(Number(/of (\d+)$/.exec(showing())[1])).toBeGreaterThan(count)
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
