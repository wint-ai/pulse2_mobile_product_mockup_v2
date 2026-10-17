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
