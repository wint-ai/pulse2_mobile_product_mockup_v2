// @vitest-environment happy-dom
/**
 * The fleet count used to live inside SystemHealthCard, as a slate-100 row
 * reading "103 systems" (node 199359:128708). The 2026-10-20 "Accont /
 * location" variants take it out of the card and put it on a wave above, with
 * the system-type chips beside it.
 *
 * The first three cases here are the three that stood in
 * systemHealthCard.dom.test.jsx, moved verbatim rather than deleted: a count
 * that moves between components keeps its guarantees. The rest are the chips,
 * which are new.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import SystemsOverviewHero from '@/v2/components/SystemsOverviewHero'

afterEach(cleanup)

const headline = (c) => c.querySelector('[data-node-id="199414:130118"]')

describe('SystemsOverviewHero — the fleet count', () => {
  it('renders the fleet count and its unit', () => {
    const { container } = render(<SystemsOverviewHero total={48} />)
    expect(headline(container).textContent).toBe('48 systems')
  })

  it('groups a large fleet count the way the design system does', () => {
    const { container } = render(<SystemsOverviewHero total={3431} />)
    expect(headline(container).textContent).toBe('3,431 systems')
  })

  it('says "system" for a fleet of one', () => {
    const { container } = render(<SystemsOverviewHero total={1} />)
    expect(headline(container).textContent).toBe('1 system')
  })

  it('renders an empty fleet as zero rather than blank', () => {
    const { container } = render(<SystemsOverviewHero />)
    expect(headline(container).textContent).toBe('0 systems')
  })
})

describe('SystemsOverviewHero — the type chips', () => {
  /* The chips carry NO text in the node — an icon and a number. The icon is
     the whole of their meaning on screen, which is exactly why each one needs
     an accessible name: a screen reader is given nothing at all otherwise. */
  it('names each chip, because the pixels do not', () => {
    const { container } = render(
      <SystemsOverviewHero total={244} systemTypes={{ topology: 156, humidity: 45, flood: 55 }} />,
    )
    const names = [...container.querySelectorAll('[role="img"]')]
      .map((el) => el.getAttribute('aria-label'))
    expect(names).toEqual([
      'Topology systems: 156',
      'Humidity sensors: 45',
      'Flood sensors: 55',
    ])
  })

  it('renders a missing count as zero rather than blank', () => {
    const { container } = render(<SystemsOverviewHero total={10} />)
    const names = [...container.querySelectorAll('[role="img"]')]
      .map((el) => el.getAttribute('aria-label'))
    expect(names).toEqual([
      'Topology systems: 0',
      'Humidity sensors: 0',
      'Flood sensors: 0',
    ])
  })

  it('groups a four-digit chip count', () => {
    const { container } = render(
      <SystemsOverviewHero total={1200} systemTypes={{ topology: 1200 }} />,
    )
    expect(container.textContent).toContain('1,200')
  })
})

describe('SystemsOverviewHero — Figma class fidelity', () => {
  it('keeps the wave geometry and the chip fill', () => {
    const { container } = render(<SystemsOverviewHero total={244} />)
    expect(container.firstElementChild.className).toContain('h-[189px]')

    const chip = container.querySelector('[role="img"]')
    expect(chip.className).toContain('bg-[rgba(241,245,249,0.28)]')
    expect(chip.className).toContain('h-[32px]')
    expect(chip.className).toContain('rounded-[18px]')
  })

  it('paints the wave UP on a dark ground instead of multiplying it away', () => {
    // mix-blend-multiply is `backdrop x source`. On the light ground it is
    // nearly a no-op (backdrop L=0.957); on a dark one it drives the whole
    // raster to black -- the layer measured 1.00:1 of internal range under
    // `dark` against 3.14:1 under `light`, i.e. no picture at all.
    //
    // The variant below is the entire fix, so it is the thing to pin. `light`
    // must still carry the bare multiply (that is what keeps it pixel-identical)
    // and every theme that declares a data-theme other than light must turn it
    // off. A document with no data-theme at all gets the light path, which is
    // what jsdom/happy-dom and SSR see.
    const { container } = render(<SystemsOverviewHero total={244} />)
    const layer = container.querySelector('[data-node-id="199414:130117"]')
    expect(layer, 'the wave layer').toBeTruthy()
    expect(layer.className).toContain('mix-blend-multiply')
    expect(layer.className).toContain('[[data-theme]:not([data-theme=light])_&]:mix-blend-normal')
  })

  it('gives the chip numeral an on-colour ink off the light theme', () => {
    // `text-background` resolved to #F4F6F9 in `light` by coincidence and to
    // the near-black app ground under `dark`, where the numeral disappeared
    // into its own chip (2.3:1). --ink-on-color is the token for ink on a
    // coloured ground; `light` keeps --background only so this stays a
    // zero-pixel change there.
    const { container } = render(<SystemsOverviewHero total={244} systemTypes={{ topology: 103 }} />)
    const numeral = [...container.querySelectorAll('span')].find((n) => n.children.length === 0 && n.textContent === '103')
    expect(numeral, 'the chip numeral').toBeTruthy()
    expect(numeral.className).toContain('[[data-theme]:not([data-theme=light])_&]:text-ink-on-color')
  })

  it('spells leading- AFTER the size, so tailwind-merge keeps it', () => {
    // The repo's standing trap: cn() drops a `leading-` written before a
    // font-size atom, and Figma emits alphabetically — i.e. leading first.
    const { container } = render(<SystemsOverviewHero total={244} />)
    const h = headline(container)
    expect(h.className).toContain('text-[34.646px]')
    expect(h.querySelector('span').className).toContain('leading-[39.37px]')
  })

  it('references no figma.com asset URL', () => {
    // The node fills the wave from an expiring figma.com/api/mcp/asset URL.
    const { container } = render(<SystemsOverviewHero total={244} />)
    expect(container.innerHTML).not.toContain('figma.com')
  })

  it('hides the wave from assistive tech — it is weather, not information', () => {
    const { container } = render(<SystemsOverviewHero total={244} />)
    expect(container.querySelector('[data-node-id="199414:130117"]').getAttribute('aria-hidden'))
      .toBe('true')
  })
})
