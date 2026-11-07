// @vitest-environment happy-dom
/**
 * HeroCardShell — the hero chassis.
 *
 * Design source, fetched live 2026-11-07:
 *   200013:91525  "Water consumption"   369x291 — the system page's coloured top
 *   200013:91602  "System page_mobile" 402x1897 — the calm frame it sits in
 *   200013:93101  "Account Main header"  370x261 — the LOCATION page's hero
 *
 * What is guarded here is the handful of properties three other files now
 * depend on — the System page, the Location page and SystemHeroCard all build
 * their hero out of this one chassis — plus the two traps this card has
 * actually fallen into before: the raster's baked corner matte, and a hero
 * that sets its own horizontal margin.
 *
 * Since 2026-11-07 it also guards the thing that broke when the chassis got
 * its second caller: the art box used to take its height from the CARD'S
 * WIDTH, via a ratio that was one raster's own aspect. `the artwork` below
 * holds both halves of the correction — the system pair keeps the box their
 * node draws, and the brand raster gets one measured against the coloured
 * section so its crop is the same picture at any section height.
 *
 * jsdom computes no layout, so nothing below asserts a pixel. Each test
 * asserts the STRUCTURAL property that produces the pixel, and the browser
 * harness is what confirms the result.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import HeroCardShell from '@/v2/components/HeroCardShell'

afterEach(cleanup)

const shell = (c) => c.querySelector('[data-name="hero-card-shell"]')
const colour = (c) => c.querySelector('[data-name="hero-card-colour"]')
const bodyOf = (c) => c.querySelector('[data-name="hero-card-body"]')
const art = (c) => c.querySelector('[data-name="hero-wave-art"]')

const mount = (props = {}) =>
  render(
    <HeroCardShell tone="calm" {...props}>
      <p>Water consumption</p>
    </HeroCardShell>,
  )

describe('the two sections', () => {
  it('draws the coloured section, and the white body only when there is one', () => {
    /* The body is a SLOT because what goes in it is whatever is most urgent
       right now — the active event, or the System type card, or System
       health. A chassis that drew one of them would be wrong on the other
       two, and a chassis that always drew the section would put an empty
       white strip under a hero that has nothing to say. */
    const { container } = mount()
    expect(colour(container)).toBeTruthy()
    expect(bodyOf(container), 'an empty body section got drawn anyway').toBeNull()
    expect(shell(container).dataset.heroBody).toBe('false')

    cleanup()
    const { container: withBody } = mount({ body: <p>System type</p> })
    expect(bodyOf(withBody)).toBeTruthy()
    expect(withBody.textContent).toContain('System type')
    expect(shell(withBody).dataset.heroBody).toBe('true')
  })

  it('paints the colour BEFORE the body, so the body covers the art overhang', () => {
    /* 200013:91602 draws 291px of raster against 165px of visible colour and
       lets the first white card cover the rest — which only works while the
       body paints after the art and is opaque. Reversed, the raster's bottom
       corners (a black matte, see the radius test) would sit on top of the
       white. */
    const { container } = mount({ body: <p>System type</p> })
    const kids = [...shell(container).children]
    expect(kids.map((k) => k.dataset.name)).toEqual(['hero-card-colour', 'hero-card-body'])
    expect(
      bodyOf(container).getAttribute('class'),
      'the body is transparent, so the art shows through it',
    ).toContain('bg-surface-card')
  })

  it('gives neither section padding of its own', () => {
    /* The consumption copy's pt-17 / pl-18 / pr-17 / pb-7 are measurements of
       THAT instance inside the 369x291 box; the location page's counts and
       chips have their own, and SystemTypeCard brings its own py-12. A
       chassis that spelled one of them would be wrong on the other two. */
    const { container } = mount({ body: <p>System type</p> })
    for (const el of [colour(container), bodyOf(container)]) {
      expect(el.getAttribute('class') ?? '').not.toMatch(/\bp[xytblr]?-/)
    }
  })
})

describe('one continuous radius', () => {
  it('clips the whole card once, and lets no section re-round the join', () => {
    /* The point of the chassis: colour and white under ONE outer radius, so
       the join between them is a straight line. If the body carried a radius
       of its own it would re-round the two corners the outer clip has just
       squared, and the frame's notch comes back. */
    const { container } = mount({ body: <p>System type</p> })
    const root = shell(container).getAttribute('class')
    expect(root).toContain('overflow-hidden')
    expect(root).toContain('rounded-[22px]')
    expect(bodyOf(container).getAttribute('class') ?? '').not.toMatch(/\brounded-/)
    expect(colour(container).getAttribute('class') ?? '').not.toMatch(/\brounded-/)
  })

  it('keeps the radius past the matte baked into the raster', () => {
    /* MEASURED off the shipped files, not assumed. Both hero rasters are
       738x582 RGB with NO ALPHA CHANNEL, and every corner carries a
       quarter-circle of pure #000000 that is 31 SOURCE px deep — the dark run
       is 31px on row 0 and 0px on row 31. The raster is exactly 2x the node's
       369-wide box, so that is 15.5 css px at 369 and 15.2 at the 361 this
       card gets on a 393 phone.

       It is BLACK, and the layer paints at mix-blend-multiply under `light`:
       black multiplies to black against any ground, so the matte never blends
       away. Only a clip hides it. 22 > 15.5, so the clip removes strictly more
       than the matte occupies — but a radius under ~16 would start showing
       it, which is what this guards. */
    const { container } = mount()
    const radius = Number(shell(container).getAttribute('class').match(/rounded-\[(\d+)px\]/)[1])
    expect(radius, 'the raster has a 15.5px black matte baked into its corners').toBeGreaterThanOrEqual(16)
  })
})

describe('the gutter', () => {
  it('sets no horizontal margin of its own', () => {
    /* THE HORIZONTAL-SCROLL BUG, and it is why this is a test and not a
       comment. The page already applies the 16px gutter (402 - 16 - 16 = 370
       against the node's 369-wide hero at x=17). A hero that bled out of the
       scroller with `-mx-[16px]` grew the one scroller on the screen a 16px
       sideways scroll, because in LTR a negative RIGHT margin becomes
       scrollable width while a negative LEFT margin is simply unreachable.
       The owner saw the scrollbar and asked why the app was not responsive.
       scripts/check-shell-contract.mjs holds the same invariant structurally
       as `bleed-needs-a-bleeding-scroller`. */
    const { container } = mount({ body: <p>System type</p> })
    const root = shell(container).getAttribute('class')
    expect(root, 'the card is bleeding out of its scroller again').not.toMatch(/-m[xlr]-/)
    expect(root, 'the card is setting its own gutter instead of taking the page edge').not.toMatch(
      /(^|\s)m[xlr]-/,
    )
    expect(root).toContain('w-full')
  })

  it('takes a className without losing the chassis', () => {
    const { container } = mount({ className: 'mt-[10px]' })
    const root = shell(container).getAttribute('class')
    expect(root).toContain('mt-[10px]')
    expect(root).toContain('rounded-[22px]')
    expect(root).toContain('overflow-hidden')
  })
})

describe('the artwork', () => {
  it('passes the tone through to the layer and says so on the card', () => {
    /* The chassis TAKES the state, it does not decide it. "Which events make
       a system red" is a product rule owned by the screen that knows what a
       system is; `data-hero-tone` is how a browser harness names which paint
       is on screen, since the two System-page rasters differ by hue alone and
       a screenshot cannot name itself. */
    for (const tone of ['brand', 'calm', 'alert']) {
      const { container } = render(
        <HeroCardShell tone={tone}>
          <p>Water consumption</p>
        </HeroCardShell>,
      )
      expect(shell(container).dataset.heroTone).toBe(tone)
      expect(art(container).dataset.tone).toBe(tone)
      cleanup()
    }
  })

  it('gives the system pair the box their own node draws', () => {
    /* 369/291 is exactly the source raster's own 738x582, so Figma is FITTING
       the art, not cropping it, and 291 is what 369 PRODUCES. Pinned at 291
       on this page's 361px card, object-cover quietly took 4px off each side
       and the blue ran 6.3px lower than a faithful scale.

       `min-h-full` is the one addition and it is a guard, not a look: the
       aspect gives 284.7px of art on a 361px card, so a coloured section
       taller than that would run out of raster and show page ground. */
    for (const tone of ['calm', 'alert']) {
      const { container } = render(
        <HeroCardShell tone={tone}>
          <p>Water consumption</p>
        </HeroCardShell>,
      )
      const cls = art(container).getAttribute('class')
      expect(cls).toContain('aspect-[369/291]')
      expect(cls).toContain('inset-x-0')
      expect(cls).toContain('min-h-full')
      expect(cls, 'a px height would stop the art scaling with the card').not.toMatch(/\bh-\[\d/)
      expect(cls, 'the art is back to a fixed width').not.toMatch(/\bw-\[\d/)
      cleanup()
    }
  })

  it('does NOT give the brand raster the system pair\'s box', () => {
    /* THE DEFECT THIS FILE WAS CORRECTED FOR, 2026-11-07. `aspect-[369/291]`
       is not a generic ratio — it IS the system pair's own 738x582, so it
       says "paint THAT raster at the card's width". The brand raster is a
       different picture: 1206x778, aspect 1.550, drawn for 603x389. Inside a
       1.268 box object-cover has to scale it by HEIGHT, landing it at 284.7px
       against the 389 it wants, and the location page's 147px section then
       reached 52% of the way down a raster that runs near-white at the top
       and #0651ff at the bottom. The deep-blue trough arrived in the section
       as a dark navy band along the join: measured on the live page, the
       section ran L=186 at the top to L=103 at the bottom, a swing of 89
       where node 200013:93089's own render swings 52. */
    const { container } = render(
      <HeroCardShell tone="brand">
        <p>12 Locations</p>
      </HeroCardShell>,
    )
    const cls = art(container).getAttribute('class')
    expect(cls, 'the brand hero is back on the system pair\'s aspect box').not.toContain(
      'aspect-[369/291]',
    )
    expect(cls, 'an aspect box takes the art box height from the CARD WIDTH').not.toMatch(
      /\baspect-\[/,
    )
  })

  it('measures the brand art box against the SECTION, so the crop survives any height', () => {
    /* The fix, and the property that makes it a fix rather than a retune.
       Percentage `top` and `bottom` both resolve against the containing
       block's HEIGHT, and the containing block is `hero-card-colour`, whose
       height IS the coloured section. So the slice of artwork the section
       shows is a constant — the same picture at 100px of colour and at 300px
       — where the old box made it `H / (W * 291/369)`, a different part of
       the picture at every section height.

       jsdom computes no layout, so what is asserted is the STRUCTURE that
       produces the pixel: both offsets present, both negative, both in %, and
       no px or width-derived height anywhere near them. */
    const { container } = render(
      <HeroCardShell tone="brand">
        <p>12 Locations</p>
      </HeroCardShell>,
    )
    const cls = art(container).getAttribute('class')
    expect(cls).toContain('inset-x-0')

    const top = cls.match(/\btop-\[(-?[\d.]+)%\]/)
    const bottom = cls.match(/\bbottom-\[(-?[\d.]+)%\]/)
    expect(top, 'the art box no longer opens above the coloured section').toBeTruthy()
    expect(bottom, 'the art box no longer runs below the coloured section').toBeTruthy()

    const [t, b] = [Number(top[1]), Number(bottom[1])]
    expect(t, 'a positive top would start the art INSIDE the section').toBeLessThan(0)
    expect(b, 'a positive bottom would end the art inside the section').toBeLessThan(0)

    /* The box must exceed the section in height or there is no crop to speak
       of, and `min-h-full` is gone because this is what replaces it: 1 - t/100
       - b/100 is the box as a multiple of the section, and it is 2.789 (node
       200013:93101: 398.85px of raster, 143 of it visible). Anything at or
       below 1 would let the section run out of raster and show page ground. */
    const multiple = 1 - t / 100 - b / 100
    expect(multiple, 'the art box no longer covers the coloured section').toBeGreaterThan(1)
    expect(multiple).toBeCloseTo(2.789, 2)

    /* 36.60% is where node 200013:93101 opens its window on the raster
       (top-[-77.24%] of a 211.03% image). -t / multiple is the same number,
       and it is what keeps the pale wash at the top and the #0651ff at the
       bottom out of the section. */
    expect(-t / 100 / multiple, 'the window moved off the node\'s anchor').toBeCloseTo(0.366, 2)

    expect(cls, 'a px offset would pin the crop to one section height').not.toMatch(
      /\b-?(top|bottom|inset)(-[xy])?-\[-?\d+(\.\d+)?px\]/,
    )
    expect(cls, 'the art is back to a fixed width').not.toMatch(/\bw-\[\d/)
  })

  it('crops rather than stretches, and takes the middle of the raster', () => {
    /* `object-cover` is what makes the art box a WINDOW. Dropped for
       `object-fill` the brand raster would squash into a 361x410 box and the
       waves would go elliptical; dropped for `object-contain` the section
       would letterbox and show page ground where the chassis paints none.
       The default 50% 50% position is load-bearing too: it is what centres
       the horizontal crop the 1.550-aspect raster needs inside a 361px card. */
    for (const tone of ['brand', 'calm', 'alert']) {
      const { container } = render(
        <HeroCardShell tone={tone}>
          <p>Water consumption</p>
        </HeroCardShell>,
      )
      const img = art(container).querySelector('img')
      expect(img.getAttribute('class')).toContain('object-cover')
      expect(
        img.getAttribute('class'),
        'an object-position would move the crop off the middle of the raster',
      ).not.toMatch(/\bobject-(top|bottom|left|right|\[)/)
      cleanup()
    }
  })

  it('carries no scrim', () => {
    /* A RULING, not an omission. HeroWaveArt's 0.34 scrim was derived for a
       20px page TITLE standing on the artwork, in the full-bleed band the
       collapsing header painted. The restructure moves the header bar onto
       the page ground, so there is no title on the artwork any more and the
       scrim's justification goes with it. 200013:91603 agrees: it draws the
       raster with no scrim layer of any kind. */
    const { container } = mount()
    expect(container.querySelector('[data-name="hero-wave-scrim"]')).toBeNull()
    expect(art(container).querySelectorAll('img')).toHaveLength(1)
  })

  it('is hidden from assistive tech - it is weather, not information', () => {
    const { container } = mount()
    expect(art(container).getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByText('Water consumption')).toBeTruthy()
  })
})
