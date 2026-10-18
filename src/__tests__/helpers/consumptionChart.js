import { fireEvent, within } from '@testing-library/react'

/**
 * Open the System page's consumption chart.
 *
 * The redesigned hero (Figma 199296:50183 calm / 199296:50454 alert) keeps the
 * chart behind its "See more" control instead of mounting it at rest. The chart
 * itself is unchanged — every prop it had is still passed — so a test that
 * asserts anything *inside* it simply has to open it first.
 *
 * Only the system page gates the chart. The home screen still mounts
 * WaterConsumptionCardV2 directly, so `mountHome()` needs none of this.
 */
export function openConsumptionChart(container) {
  const seeMore = within(container).getByRole('button', { name: 'See more' })
  fireEvent.click(seeMore)
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
