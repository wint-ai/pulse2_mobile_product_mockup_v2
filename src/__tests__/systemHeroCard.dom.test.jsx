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
  /* ── THE HANDLE MOVED, 2026-11-07 ──────────────────────────────────────
     This read `[aria-hidden="true"][data-node-id]`, which found the layer
     back when this component hand-rolled it and stamped the node id on it.
     The art is HeroWaveArt inside HeroCardShell now, and a chassis has no
     node id of its own to stamp, so the handle is the name the layer has
     always carried. Everything asserted below is unchanged and still holds
     — the point of the move was that the paint did not change. */
  const waveBox = (c) => c.querySelector('[data-name="hero-wave-art"]')

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
    /* Wave under copy is what puts it behind the first cards exactly as the
       frame draws it. Clipping it to the content height would flatten the
       page, so what is guarded here is that the wave is TALLER than the copy
       block it sits behind.

       THE NUMBER IS NO LONGER WRITTEN AS A NUMBER (2026-11-01). It was
       `h-[291px]`, which is the frame's height and only the frame's: the
       raster box in 199703:31476 is spelled `aspect-[369/291]` on a 369-wide
       card, so 291 is what 369 PRODUCES. 369/291 is also exactly the source
       raster's own 738x582, i.e. Figma is fitting the art rather than
       cropping it. Pinned at 291 on this page's 361px card, object-cover was
       quietly taking 4px off each side and the blue ran 6.3px lower than a
       faithful scale. So the aspect is the thing to pin, and a height in px
       is the thing to keep out -- it is what would stop the art scaling with
       the card on the next width this ships at. */
    const { container } = mount()
    const c = waveBox(container).getAttribute('class')
    expect(c).toContain('aspect-[369/291]')
    expect(c, 'a px height would stop the art scaling with the card')
      .not.toMatch(/\bh-\[\d/)
  })

  it('is hidden from assistive tech — it is weather, not information', () => {
    const { container } = mount()
    expect(waveBox(container).getAttribute('aria-hidden')).toBe('true')
  })

  it('uses a DIFFERENT raster per tone, not one image recoloured', () => {
    /* Owner, 2026-10-26: "the waves color is not exactly as in figma."

       It could not have been. The card drew one blue-grey wave under a flat
       mix-blend-color tint and called the result red. Measured, the three
       images are not interchangeable:

         Figma alert   avg #e4474b
         Figma calm    avg #4c86f9
         old single    avg #7ba8f9   <- what was being tinted

       No tint over the third lands on the first. So the tone picks a
       pre-coloured raster, and this asserts the property that fixes it: the
       two tones resolve to two different `src` values. */
    const { container: a } = mount({ tone: 'alert' })
    const alertSrc = a.querySelector('[aria-hidden="true"] img').getAttribute('src')
    cleanup()
    const { container: c } = mount({ tone: 'calm' })
    const calmSrc = c.querySelector('[aria-hidden="true"] img').getAttribute('src')

    expect(alertSrc).toBeTruthy()
    expect(calmSrc).toBeTruthy()
    expect(alertSrc, 'both tones drew the same wave').not.toBe(calmSrc)
  })

  it('layers nothing over the raster', () => {
    /* The colour is in the pixels now. An `opacity-*` or a `mix-blend-color`
       fill over them can only move the wave away from the design, which is
       exactly how the old construction drifted. */
    const { container } = mount({ tone: 'alert' })
    const box = waveBox(container)
    expect(box.querySelectorAll('img')).toHaveLength(1)
    const inner = box.innerHTML
    expect(inner, 'a tint layer is back').not.toContain('mix-blend-color')
    expect(inner, 'the wave is being faded again').not.toContain('opacity-50')
  })

  it('takes the alert artwork on an alert tone and the calm one otherwise', () => {
    const { container: alert } = mount({ tone: 'alert' })
    expect(alert.querySelector('[data-hero-tone]').dataset.heroTone).toBe('alert')
    cleanup()
    const { container: calm } = mount({ tone: 'calm' })
    expect(calm.querySelector('[data-hero-tone]').dataset.heroTone).toBe('calm')
  })
})

/* ── THE CARD IS HeroCardShell NOW — 2026-11-07, Figma 200013:91602 ────────
   This component used to BE the card. It is now the COPY in the coloured
   section of a shared chassis, and the chassis carries the white body the
   restructure needs. What is asserted here is only the seam between the two;
   the chassis's own invariants are in heroCardShell.dom.test.jsx. */
describe('the chassis', () => {
  const shell = (c) => c.querySelector('[data-name="hero-card-shell"]')

  it('sits in the shell and hands the body straight through', () => {
    /* The white body is "whatever is most urgent right now" — the active
       event when the system has one, the System type card when it is calm.
       This component knows about water consumption and nothing else, so it
       carries the slot rather than choosing what fills it. */
    const { container } = mount({ body: <p>System type</p> })
    expect(shell(container)).toBeTruthy()
    expect(container.querySelector('[data-name="hero-card-body"]')).toBeTruthy()
    expect(container.textContent).toContain('System type')
    /* and the copy is still the copy */
    expect(container.textContent).toContain('Water consumption')
    expect(screen.getByText('5,830')).toBeTruthy()
  })

  it('is a bare coloured card when nothing urgent is passed', () => {
    const { container } = mount()
    expect(shell(container)).toBeTruthy()
    expect(container.querySelector('[data-name="hero-card-body"]')).toBeNull()
  })

  /* ── `draws NO card at all in band mode` WAS HERE — REMOVED 2026-11-07 ───
     It mounted `{ band: true }` and asserted the hero rendered its copy bare,
     with no HeroCardShell and no wave of its own, for a full-bleed band the
     PAGE painted behind the collapsing header.

     BOTH SIDES OF THAT CONTRACT ARE GONE, which is why the test goes rather
     than moves. The restructure deleted the collapsing header and the band
     with it (the wave is inside the inset card now), SystemPageV2Screen — its
     only caller — stopped passing the prop, and the prop and its three
     effects were then deleted from SystemHeroCard. `{ band: true }` is an
     unknown prop today: the assertions would still pass, vacuously, by
     measuring the card path and calling it the band path.

     Its own note already said "Kept only until SystemPageV2Screen stops
     passing `band`." That happened. Nothing here is lost: the card path's
     shell, wave and copy are all asserted above. */
  it('still sets no horizontal margin of its own', () => {
    /* The horizontal-scroll bug. In LTR a negative RIGHT margin becomes
       scrollable width; the page owns the 16px gutter. Looped over the two
       modes until band mode was deleted; there is one shape now. */
    const { container } = mount()
    const root = container.firstElementChild.getAttribute('class')
    expect(root).not.toMatch(/-m[xlr]-/)
  })
})
