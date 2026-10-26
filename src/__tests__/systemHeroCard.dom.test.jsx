// @vitest-environment happy-dom
/**
 * THE CONSUMPTION HERO, as Figma 199703:30816 (alert) / 199703:31382 (calm)
 * draw it after the 2026-10-26 redraw.
 *
 * What that redraw changed, and therefore what this file is here to hold:
 *   · the copy block went from CENTRED to left-aligned;
 *   · the delta stopped being a 100x34 pill holding a signed "+120%" and
 *     became a triangle + an UNSIGNED figure + the window it is measured
 *     against ("vs. 1-24 Jul");
 *   · "See more" became "All stats", moved opposite the delta row, and grew
 *     a white hairline;
 *   · the wave stopped being a fixed 369 centred inside a full-bleed
 *     component and now spans the card.
 *
 * THE SIGN IS THE PART WORTH PINNING. Direction lives in a glyph that is
 * ROTATED (`-scale-y-100`) rather than swapped, and the figure carries no "+"
 * or "-" at all. Those are two marks driven by one number, which is exactly
 * the arrangement that rots into disagreement — an arrow pointing up over a
 * fall is the kind of defect a screenshot review slides past and a dashboard
 * reader does not.
 *
 * systemHeroSeeMore.dom.test.jsx owns the control's BEHAVIOUR (where the jump
 * goes, which window it lands on). This file owns what the hero DRAWS, and
 * mounts the component directly rather than the page, so a failure here is
 * about the component and not about the page's data.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'
import SystemHeroCard from '@/v2/components/SystemHeroCard'

afterEach(cleanup)

const mount = (props = {}) =>
  render(
    <SystemHeroCard
      total="5,830"
      unit="L"
      rangeLabel="1-23 Aug, 26"
      deltaPct={20}
      compareLabel="1-24 Jul"
      onJumpToChart={() => {}}
      {...props}
    />,
  )

/* The delta row addresses itself, because every other handle on it is a
   string that this redraw is allowed to change. */
const deltaRow = (c) => c.querySelector('[data-delta-direction]')

describe('the figure and its unit', () => {
  it('draws the total and the unit as two separate runs', () => {
    /* One string cannot be two type sizes. 199703:30082 is 42.222/58.056 and
       199703:30084 is 20/20 beside it, which is why the page passes `total`
       and `unit` rather than a joined "5,830L". */
    const { container } = mount()
    expect(screen.getByText('5,830')).toBeTruthy()
    const unit = screen.getByText('L')
    expect(unit).toBeTruthy()
    expect(unit.textContent, 'the unit got joined onto the figure').toBe('L')
    expect(container.textContent).toContain('Water consumption')
    expect(container.textContent).toContain('1-23 Aug, 26')
  })

  it('draws no unit run when there is no unit', () => {
    mount({ unit: null })
    expect(screen.queryByText('L')).toBeNull()
  })
})

describe('the delta row', () => {
  it('prints the percentage UNSIGNED — the triangle carries the sign', () => {
    /* Both frames draw "120%" and "96%". A "+" here would be the sign said
       twice, and would not match either node. */
    const { container } = mount({ deltaPct: 120 })
    const row = deltaRow(container)
    expect(row.textContent).toContain('120%')
    expect(row.textContent, 'the sign is drawn twice').not.toContain('+')
  })

  it('strips the minus off a fall and points the triangle down', () => {
    const { container } = mount({ deltaPct: -96 })
    const row = deltaRow(container)
    expect(row.dataset.deltaDirection).toBe('down')
    expect(row.textContent).toContain('96%')
    expect(row.textContent, 'a bare minus survived into the figure').not.toContain('-96')
    // 199703:32491 flips the SAME glyph rather than shipping a second one.
    expect(row.querySelector('svg').getAttribute('class')).toContain('-scale-y-100')
  })

  it('points the triangle up on a rise, unflipped', () => {
    const { container } = mount({ deltaPct: 120 })
    const row = deltaRow(container)
    expect(row.dataset.deltaDirection).toBe('up')
    expect(row.querySelector('svg').getAttribute('class')).not.toContain('-scale-y-100')
  })

  it('draws NO triangle on an unchanged window', () => {
    /* Neither frame has a flat state and there is no third glyph to borrow.
       An arrow has to point somewhere, so zero gets the figure alone rather
       than a direction the data does not have. */
    const { container } = mount({ deltaPct: 0 })
    const row = deltaRow(container)
    expect(row.dataset.deltaDirection).toBe('flat')
    expect(row.textContent).toContain('0%')
    expect(row.querySelector('svg'), 'zero was given a direction').toBeNull()
  })

  it('names the window it is measured against', () => {
    const { container } = mount({ compareLabel: 'Sep 1–21' })
    expect(deltaRow(container).textContent).toContain('vs. Sep 1–21')
  })

  it('drops the "vs." caption when there is no previous window to name', () => {
    /* The oldest window and Yearly fall back to half-against-half, and there
       is no earlier span to print. The frame has no variant for that, so this
       draws nothing rather than inventing a caption — but the percentage is
       still real and still shown. */
    const { container } = mount({ compareLabel: null, deltaPct: 12 })
    const row = deltaRow(container)
    expect(row.textContent).toContain('12%')
    expect(row.textContent).not.toContain('vs.')
  })

  it('draws no delta row at all when there is nothing to compare', () => {
    const { container } = mount({ deltaPct: null })
    expect(deltaRow(container)).toBeNull()
    // The figure is still there — a missing comparison is not a missing total.
    expect(screen.getByText('5,830')).toBeTruthy()
  })

  it('the sign and the glyph cannot disagree, for any input', () => {
    /* The property the two-mark split exists to guarantee, checked across the
       range rather than at the three points above. */
    for (const pct of [-300, -96, -1, 0, 1, 20, 120, 4000]) {
      cleanup()
      const { container } = mount({ deltaPct: pct })
      const row = deltaRow(container)
      const svg = row.querySelector('svg')
      const flipped = Boolean(svg?.getAttribute('class')?.includes('-scale-y-100'))
      /* `toContain` alone is NOT enough here and was the first spelling: the
         text "-96%" contains "96%", so a signed figure slipped straight
         through. The figure is matched exactly instead. */
      const figure = row.querySelector('p').textContent.trim()
      expect(figure, `${pct} printed a sign`).toBe(`${Math.abs(pct)}%`)
      if (pct === 0) expect(svg, 'zero drew a triangle').toBeNull()
      else expect(flipped, `${pct} pointed the wrong way`).toBe(pct < 0)
    }
  })
})

describe('"All stats"', () => {
  it('is a real button naming where it goes', () => {
    /* The visible label leads the accessible name (WCAG 2.5.3) so voice
       control still matches the two words that are painted. */
    const onJumpToChart = vi.fn()
    const { container } = mount({ onJumpToChart })
    const btn = within(container).getByRole('button', { name: /^All stats\b/ })
    expect(btn.tagName).toBe('BUTTON')
    expect(btn.textContent).toContain('All stats')
    expect(btn.getAttribute('aria-label')).toMatch(/water consumption chart/i)
    // It opens nothing, so it must not claim an expanded state.
    expect(btn.hasAttribute('aria-expanded')).toBe(false)
    fireEvent.click(btn)
    expect(onJumpToChart).toHaveBeenCalledTimes(1)
  })

  it('is not rendered at all without somewhere to go', () => {
    const { container } = mount({ onJumpToChart: undefined })
    expect(within(container).queryByRole('button')).toBeNull()
  })

  it('no longer says "See more"', () => {
    // The rename is the whole of 199703:30093, and is easy to revert by reflex.
    const { container } = mount()
    expect(container.textContent).not.toContain('See more')
  })
})

describe('the wave', () => {
  const waveBox = (c) => c.querySelector('[aria-hidden="true"][data-node-id]')

  it('spans the card rather than a fixed 369', () => {
    /* THE ALIGNMENT BUG. The wave was `mx-auto w-[369px]` inside a component
       the page bled to the full 393, which left it 12px off each phone edge
       while every card below sat at 16 — four pixels proud, all the way down.
       402 - 17 - 369 = 16, so the frame's `left-[17px]` IS the card gutter.
       A fixed width here is what reintroduces that, so the width is pinned
       absent rather than pinned to a number. */
    const { container } = mount()
    const cls = waveBox(container).getAttribute('class')
    expect(cls).toContain('inset-x-0')
    expect(cls, 'the wave is back to a fixed width').not.toMatch(/\bw-\[\d/)
    expect(cls, 'the wave is centring itself inside a wider box').not.toContain('mx-auto')
  })

  it('still runs past the copy, so the cards below overlap it', () => {
    /* 291px of wave under 158px of copy is what puts it behind the first
       cards exactly as the frame draws it. Clipping it to the content height
       would flatten the page. */
    const { container } = mount()
    expect(waveBox(container).getAttribute('class')).toContain('h-[291px]')
  })

  it('is hidden from assistive tech — it is weather, not information', () => {
    const { container } = mount()
    expect(waveBox(container).getAttribute('aria-hidden')).toBe('true')
  })

  it('takes the alert artwork on an alert tone and the calm one otherwise', () => {
    const { container: alert } = mount({ tone: 'alert' })
    expect(alert.querySelector('[data-hero-tone]').dataset.heroTone).toBe('alert')
    cleanup()
    const { container: calm } = mount({ tone: 'calm' })
    expect(calm.querySelector('[data-hero-tone]').dataset.heroTone).toBe('calm')
  })
})
