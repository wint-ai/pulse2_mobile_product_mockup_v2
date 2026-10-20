// @vitest-environment happy-dom
//
// The consumption card's granularity control, per the CURRENT mobile design.
//
// History, because this reversed once and the reason matters: the control was
// briefly a funnel-button disclosure, built from the mobile card instance
// I198378:74362;119647:3846;149:2490 where the Y/M/D/H CardAction slot is
// hidden="true" and CardAction2 holds a 57x32 funnel. That node has since been
// DELETED from the file. Its replacement is the component set 198601:86152
// "Water consumption_M" (198583:58957 Default + two variants), which puts the
// segments back inline, spells them as words, and reverses the order.
//
// Then it reversed a second time, and this one is NOT a Figma correction.
// 198601:86152 still specifies the inline segments; the owner asked for a
// dropdown anyway — "so it's less overwhelmed" — and named the control to
// copy: "like we have in top usage", i.e. TopUsageCard's period pill. So the
// card now ships a listbox where the segmented control was, deliberately
// diverging from the comp. WaterConsumptionCardV2's header comment records
// that for whoever next runs a Figma diff.
//
// So these tests pin the design as it is now:
//   - the four groupings live behind ONE trigger, which reads the current one
//   - the menu offers Hour / Day / Month / Year, in that order
//   - it is a real listbox: aria-selected, keyboard, Escape, outside click
//   - it opens INSIDE the card, never through a portal to document.body
//   - the stepper is a separate row, hidden on Year
//
// The period IDS are still H/D/M/Y — only the labels and the control are
// the design's — so nothing in consumptionSeries.js moves.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import WaterConsumptionCardV2 from '@/v2/components/WaterConsumptionCardV2'
import {
  currentGranularity,
  granularityTrigger,
  openGranularityMenu,
  pickGranularity,
} from './helpers/consumptionChart'

afterEach(cleanup)

const SERIES = [
  { day: 1, litres: 1200 },
  { day: 2, litres: 1400 },
  { day: 3, litres: 900 },
]

function renderCard(props = {}) {
  return render(
    <WaterConsumptionCardV2
      data={SERIES}
      period="D"
      monthLabel="Jun 2026"
      onPeriodChange={() => {}}
      onMonthChange={() => {}}
      {...props}
    />,
  )
}

describe('granularity is a dropdown', () => {
  it('shows the current grouping on one trigger, with no disclosure dialog', () => {
    const { container } = renderCard()
    const view = within(container)

    expect(view.getByText('Water consumption')).toBeTruthy()

    /* The four labels used to all be on screen at once, as radios. The owner
       asked for one pill instead, so what is visible at rest is the SELECTED
       grouping and nothing else. */
    const trigger = granularityTrigger(container)
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(currentGranularity(container)).toBe('Day')
    expect(view.queryByRole('listbox')).toBeNull()

    // The funnel is gone, and so is the dialog it used to open.
    expect(view.queryByRole('button', { name: 'Consumption scope' })).toBeNull()
    expect(view.queryByRole('dialog', { name: 'Consumption scope' })).toBeNull()
  })

  it('offers Hour, Day, Month, Year in that order, once opened', () => {
    const { container } = renderCard()
    const menu = openGranularityMenu(container)
    const options = within(menu).getAllByRole('option')

    /* The DESKTOP node (198424:63600) draws "Y M D H" — the reverse, as
       single letters. Getting those two nodes mixed up is what made this wrong
       twice. Matched by ACCESSIBLE NAME rather than textContent, which also
       pins that the selected option's tick is aria-hidden and so does not get
       appended to its name. */
    expect(options).toHaveLength(4)
    ;['Hour', 'Day', 'Month', 'Year'].forEach((name, i) => {
      expect(options[i]).toBe(within(menu).getByRole('option', { name }))
    })
    expect(granularityTrigger(container).getAttribute('aria-expanded')).toBe('true')

    // aria-selected is where "which one is on" now lives; it was aria-checked.
    expect(options.map((el) => el.getAttribute('aria-selected')))
      .toEqual(['false', 'true', 'false', 'false'])
  })

  it('reports the granularity the viewer picks, still as H/D/M/Y ids', () => {
    const picked = []
    const { container } = renderCard({ onPeriodChange: (next) => picked.push(next) })

    pickGranularity(container, 'Month')
    expect(picked).toEqual(['M'])
    // Picking closes it, and the caret comes back to the trigger.
    expect(within(container).queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(granularityTrigger(container))
  })

  /* The ARIA contract, in one place. A thing that merely LOOKS like a dropdown
     is the defect this is here to catch. */
  it('closes on Escape and on an outside pointerdown, returning focus', () => {
    const { container } = renderCard()

    openGranularityMenu(container)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(within(container).queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(granularityTrigger(container))

    /* Outside click matters more than it looks: a popover dismissable only by
       re-tapping its own trigger is a trap on a touch screen, which is the
       note TopUsageCard carries and this control inherits. */
    openGranularityMenu(container)
    fireEvent.pointerDown(document.body)
    expect(within(container).queryByRole('listbox')).toBeNull()
  })

  it('moves with the arrow keys and picks with Enter', () => {
    const picked = []
    const { container } = renderCard({ onPeriodChange: (next) => picked.push(next) })

    // ArrowDown on the trigger opens at the selected option (Day).
    const trigger = granularityTrigger(container)
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    const menu = within(container).getByRole('listbox')
    expect(document.activeElement).toBe(within(menu).getByRole('option', { name: 'Day' }))

    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(within(menu).getByRole('option', { name: 'Month' }))
    fireEvent.keyDown(menu, { key: 'Enter' })
    expect(picked).toEqual(['M'])
  })

  it('jumps to a grouping by its first letter', () => {
    const picked = []
    const { container } = renderCard({ onPeriodChange: (next) => picked.push(next) })

    const menu = openGranularityMenu(container)
    fireEvent.keyDown(menu, { key: 'y' })
    expect(document.activeElement).toBe(within(menu).getByRole('option', { name: 'Year' }))
    fireEvent.keyDown(menu, { key: 'Enter' })
    expect(picked).toEqual(['Y'])
  })

  it('shows the period stepper below the segments, and hides it on Year', () => {
    const { container, rerender } = renderCard()
    expect(within(container).getByRole('group', { name: 'Period' })).toBeTruthy()
    expect(within(container).getByText('Jun 2026')).toBeTruthy()

    rerender(
      <WaterConsumptionCardV2
        data={SERIES}
        period="Y"
        monthLabel="2024–2026"
        onPeriodChange={() => {}}
        onMonthChange={() => {}}
      />,
    )
    // Year plots the whole window at once — nothing to step to.
    expect(within(container).queryByRole('group', { name: 'Period' })).toBeNull()
  })

  it('steps the period from the chevrons', () => {
    const steps = []
    const { container } = renderCard({ onMonthChange: (d) => steps.push(d) })
    const view = within(container)

    fireEvent.click(view.getByRole('button', { name: 'Previous period' }))
    fireEvent.click(view.getByRole('button', { name: 'Next period' }))
    expect(steps).toEqual([-1, 1])
  })

  /* WHAT THIS TEST USED TO PIN, and why it now pins something else.
     It was "insets the toggle track so the end segments clear its rounded
     cap": the slate rounded-[34px] track clamps to a stadium, the selected
     segment is a 10px-radius rect, and at the p-0 the node emits the end
     segments' corners fell outside the curve so the blue border rendered
     poking out of the grey. Three pixel-match passes went into that
     arithmetic (P must exceed ~2.5, hence p-[4px]).
     There is no track any more — the owner replaced the segments with a
     dropdown — so the geometry is moot rather than regressed. Keeping a
     dead assertion alive would be worse than saying so. What replaces it is
     the equivalent "the control renders where it should" rule for a dropdown,
     which is a sharper one, below. */
  /* NARROWED 2026-10-20, not weakened. rounded-[34px] was a reliable proxy for
     "the segment track" only while the card drew nothing else at that radius.
     It now draws one more thing: 199323:12260 / 199371:137298 spell the
     CalendarCaption as a slate/100 w-full track at rounded-[34px] with the nav
     buttons sitting transparent on top of it, so the caption legitimately
     carries the radius the segment track used to own. The exclusion is by
     data-name, which means the assertion still fails for ANY other
     rounded-[34px] box — including a restored segment track — rather than
     being relaxed to let the radius through generally. */
  it('no longer ships the slate segment track', () => {
    const { container } = renderCard()
    expect(
      container.querySelector('[class*="rounded-[34px]"]:not([data-name="CalendarCaption"])'),
    ).toBeNull()
    // And the caption is the only thing left wearing it.
    expect(container.querySelectorAll('[class*="rounded-[34px]"]')).toHaveLength(1)
    expect(within(container).queryAllByRole('radio')).toHaveLength(0)
  })

  /* THE PORTAL BUG, pinned. The app renders inside a fixed 393x852 phone frame
     (src/components/Phone.jsx) with overflow:hidden. Radix's <Select> and
     <DropdownMenu> portal their content to document.body, which is OUTSIDE
     that frame, and the menu then paints over the whole browser window. That
     has been hit and fixed twice in this codebase. This control owns no
     portal at all, and the cheapest way to keep it that way is to require the
     open menu to be a DESCENDANT OF THE CARD. */
  it('opens inside the card, not through a portal to document.body', () => {
    const { container } = renderCard()
    const menu = openGranularityMenu(container)

    const card = container.querySelector('[data-slot="card"]')
    expect(card, 'the card root').toBeTruthy()
    expect(card.contains(menu), 'the menu must live inside the card').toBe(true)
    expect(document.body.querySelectorAll('[role="listbox"]')).toHaveLength(1)

    /* And it is positioned against its own trigger, not the viewport —
     a fixed menu would escape the frame just as a portal does. */
    expect(String(menu.className)).toMatch(/(?:^|\s)absolute(?:\s|$)/)
    expect(String(menu.className)).not.toMatch(/(?:^|\s)fixed(?:\s|$)/)
  })

  it('labels the headline figures for the bucket being plotted', () => {
    const { container, rerender } = renderCard()
    expect(within(container).getByText('Daily Avg L')).toBeTruthy()
    expect(within(container).getByText('Peak Day L')).toBeTruthy()

    rerender(
      <WaterConsumptionCardV2
        data={SERIES}
        period="M"
        monthLabel="2026"
        onPeriodChange={() => {}}
        onMonthChange={() => {}}
      />,
    )
    expect(within(container).getByText('Monthly Avg L')).toBeTruthy()
    expect(within(container).getByText('Peak Month L')).toBeTruthy()
  })
})
