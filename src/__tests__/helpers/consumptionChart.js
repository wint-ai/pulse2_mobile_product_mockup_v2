import { expect } from 'vitest'
import { fireEvent, within } from '@testing-library/react'

/**
 * Assert the consumption chart is on the page, with nothing clicked.
 *
 * THIS USED TO BE `openConsumptionChart`, and it used to click "See more".
 * The redesigned hero (Figma 199296:50183 calm / 199296:50454 alert) kept the
 * chart behind that control, so every test that looked inside the chart had to
 * open it first. The owner reversed that on 2026-10-20: "see more is only
 * redirect to consumption chart on the dates above, so see less is not
 * relevant — and in addition consumption chart shall be always visible."
 *
 * There is nothing left to open, on either page — the System page now mounts
 * the card exactly as the home screen always did. So the helper stayed, with
 * its meaning inverted: it is the precondition the callers always wanted, and
 * it now states the owner's rule instead of working around the gate. The
 * hero's control is an entry point and is exercised in
 * systemHeroSeeMore.dom.test.jsx, which is where its behaviour is pinned.
 */
export function expectConsumptionChartMounted(container) {
  expect(
    container.querySelector('[data-node-id="198629:51874"]'),
    'the consumption chart is not mounted',
  ).toBeTruthy()
  return container
}

/* —— The granularity control is a DROPDOWN ————————————————
   It used to be an inline segmented control, so every test below used to reach
   for getByRole('radio', { name: 'Month' }) and read aria-checked off it. The
   owner asked for a dropdown instead — "so it's less overwhelmed" — naming
   the one already on the home screen: "like we have in top usage". A dropdown
   is a listbox, so the roles changed and every one of those queries had to
   move with them. Nothing those tests PINNED was dropped; the rules are simply
   read off the new control.

   The mapping, once, here rather than six times across the suite:
     the selected grouping   radio[aria-checked=true]  ->  the trigger's label
     the four choices        the four radios           ->  option[] in the menu
     picking one             click the radio           ->  open, click the option

   The trigger's accessible name carries the current grouping
   ("Consumption granularity, currently Month"), so the DEFAULT can be asserted
   without opening anything. The menu is only in the DOM while open — which is
   the point of a dropdown — so the options have to be opened for first.

   Both helpers take the rendered container. getAllBy..[0] throughout: the home
   screen mounts the card inside a page that renders other listboxes (the Top
   usage period pill is the same control), and a name-scoped getAll keeps these
   pointed at the consumption one without caring how many neighbours exist. */
const GRANULARITY = 'Consumption granularity'

export function granularityTrigger(container) {
  return within(container).getAllByRole('button', {
    name: new RegExp('^' + GRANULARITY + ', currently '),
  })[0]
}

/** The grouping the control is showing, e.g. 'Month'. */
export function currentGranularity(container) {
  return granularityTrigger(container).textContent.trim()
}

/** Open the menu and hand back its listbox. */
export function openGranularityMenu(container) {
  fireEvent.click(granularityTrigger(container))
  return within(container).getAllByRole('listbox', { name: GRANULARITY })[0]
}

/** Open the menu and pick a grouping by its label, e.g. 'Day'. */
export function pickGranularity(container, name) {
  const menu = openGranularityMenu(container)
  fireEvent.click(within(menu).getByRole('option', { name }))
  return container
}
