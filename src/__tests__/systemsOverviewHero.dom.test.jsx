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
import { render, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SystemsOverviewHero from '@/v2/components/SystemsOverviewHero'

afterEach(cleanup)

const headline = (c) => c.querySelector('[data-node-id="199414:130118"]')
const explainer = (c) => c.querySelector('[data-name="System type explainer"]')
const chip = (c, re) =>
  [...c.querySelectorAll('button')].find((b) => re.test(b.getAttribute('aria-label')))

/* userEvent.click sets `detail`; fireEvent.click does NOT, and a MouseEvent
   built with no init has detail 0 — which is exactly what the component reads
   as "a keyboard synthesised this". So POINTER cases must go through userEvent
   (which also fires the pointerdown the dismiss listener watches for), and a
   bare fireEvent.click is the KEYBOARD path whether or not it was meant to be.
   Both are used below on purpose; neither is interchangeable with the other. */
const hero = (onSelectType, systemTypes = { topology: 156, humidity: 45, flood: 55 }) =>
  render(<SystemsOverviewHero total={244} systemTypes={systemTypes} onSelectType={onSelectType} />)

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

describe('SystemsOverviewHero — the chips are a way into the Systems tab', () => {
  /* Owner, 2026-10-22: "make this clickable — redirect to systems tab filtered
     on those systems". The hero and the table already speak one vocabulary
     (SYSTEM_TYPE via systemTypeOf), so a chip hands over a filter value rather
     than a parallel notion of what a type is.

     THE DESTINATION IS WHAT THESE CASES PIN, and it is unchanged. What moved
     is WHEN it fires — the second tap rather than the first. The two-stage
     block below owns that half. */
  it('reports the type the Systems filter reads, not a label', async () => {
    const picked = []
    const { container } = hero((t) => picked.push(t))
    const buttons = [...container.querySelectorAll('button')]
    expect(buttons).toHaveLength(3)
    for (const b of buttons) {
      await userEvent.click(b) // arms
      await userEvent.click(b) // acts
    }
    expect(picked).toEqual(['flow', 'humidity', 'flood'])
  })

  it('a chip reading zero EXPLAINS, and still never navigates', async () => {
    /* 7bf0f4f made a zero chip inert because navigating would land on an empty
       table — a dead end dressed as a control. THAT HALF STANDS. What changed
       is that the explanation is about the TYPE and not about the data: "what
       is a humidity sensor" has the same answer at 0 as at 45, and the viewer
       looking at the 0 is arguably likelier to be asking. So the chip answers
       and refuses to go anywhere, rather than doing neither. */
    const picked = []
    const { container } = hero((t) => picked.push(t), { topology: 103 })
    expect(container.querySelectorAll('button')).toHaveLength(3)

    const zero = chip(container, /^Humidity sensors: 0/)
    expect(zero, 'the humidity chip').toBeTruthy()
    await userEvent.click(zero)
    expect(explainer(container).textContent).toContain('Humidity sensors')
    await userEvent.click(zero)
    expect(picked).toEqual([])
  })

  it('never names a destination a zero chip will not go to', () => {
    const { container } = hero(() => {}, { topology: 103 })
    const labels = [...container.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))
    expect(labels).toContain('Topology systems: 103. Show these in the Systems tab.')
    expect(labels).toContain('Humidity sensors: 0')
    expect(labels).toContain('Flood sensors: 0')
  })

  it('with no handler every chip stays a picture, as the frame draws it', () => {
    const { container } = render(
      <SystemsOverviewHero total={244} systemTypes={{ topology: 156, humidity: 45, flood: 55 }} />,
    )
    expect(container.querySelectorAll('button')).toHaveLength(0)
    expect(container.querySelectorAll('[role="img"]')).toHaveLength(3)
  })
})

/* ───────────────────────────────────────────────────────────────────────────
   ONE TAP EXPLAINS, TWO TAPS NAVIGATE.

   Owner, 2026-10-22: "one click here showing wht this type is / two clicks
   redirect you as now". The chips carry an icon and a number and no text, so
   until now the cheapest question a viewer can have — what IS this? — had no
   gesture at all, while the expensive one (go there) had the only one.

   The shape is WaterConsumptionCardV2's `armedBucket`, and the cases below are
   its edges, because the edges are the whole of whether this feels right: a
   tap on a DIFFERENT chip must move the reveal rather than navigate, and the
   reveal must not survive the user looking away. Both have been got wrong
   before, which is why each gets its own case rather than a shared one. */
describe('SystemsOverviewHero — one tap explains, two taps navigate', () => {
  it('the first tap explains, and does not navigate', async () => {
    const picked = []
    const { container } = hero((t) => picked.push(t))
    expect(explainer(container), 'nothing is revealed before a tap').toBeNull()

    await userEvent.click(chip(container, /^Topology/))
    expect(picked, 'the first tap must not navigate').toEqual([])
    expect(explainer(container).textContent).toContain('Topology systems')
    expect(explainer(container).textContent).toContain('metered water line')
  })

  it('the second tap on the SAME chip navigates', async () => {
    const picked = []
    const { container } = hero((t) => picked.push(t))
    const topology = chip(container, /^Topology/)
    await userEvent.click(topology)
    await userEvent.click(topology)
    expect(picked).toEqual(['flow'])
  })

  it('a tap on a DIFFERENT chip moves the reveal rather than navigating', async () => {
    /* The case people get wrong: having armed one chip, the next tap is read
       as "the second tap" and fires the action on a chip the viewer has only
       touched once. */
    const picked = []
    const { container } = hero((t) => picked.push(t))
    await userEvent.click(chip(container, /^Topology/))
    await userEvent.click(chip(container, /^Flood/))
    expect(picked, 'a first tap on another chip is still a first tap').toEqual([])
    expect(explainer(container).textContent).toContain('Flood sensors')
    expect(explainer(container).textContent).not.toContain('Topology')
  })

  it('a tap somewhere else puts the reveal away', async () => {
    const { container } = hero(() => {})
    await userEvent.click(chip(container, /^Topology/))
    expect(explainer(container)).toBeTruthy()
    await userEvent.click(document.body)
    expect(explainer(container), 'an armed chip must not outlive the glance').toBeNull()
  })

  it('Escape puts the reveal away', async () => {
    const { container } = hero(() => {})
    await userEvent.click(chip(container, /^Topology/))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(explainer(container)).toBeNull()
  })

  it('a reveal does not survive the counts changing under it', async () => {
    const picked = []
    const { container, rerender } = hero((t) => picked.push(t))
    await userEvent.click(chip(container, /^Topology/))
    expect(explainer(container)).toBeTruthy()

    rerender(
      <SystemsOverviewHero
        total={9}
        systemTypes={{ topology: 9, humidity: 0, flood: 0 }}
        onSelectType={(t) => picked.push(t)}
      />,
    )
    expect(explainer(container), 'a sentence must not stay pinned to numbers that moved').toBeNull()
  })

  it('KEYBOARD navigates in one press, because focus already carries the words', () => {
    /* The ruling WaterConsumptionCardV2 made, for the same reason: a keyboard
       user has the explanation before pressing anything (aria-describedby,
       pinned below), so a second press would buy them nothing and cost them a
       press. detail === 0 is what the browser gives a click synthesised from
       Enter or Space. */
    const picked = []
    const { container } = hero((t) => picked.push(t))
    fireEvent.click(chip(container, /^Topology/), { detail: 0 })
    expect(picked).toEqual(['flow'])
    expect(explainer(container), 'and it opens no reveal on the way past').toBeNull()
  })

  it('puts the explanation on every chip as a description, armed or not', () => {
    /* THE ACCESSIBILITY CONTRACT. The visible band is aria-hidden — it would
       otherwise be announced a second time — so this description is the only
       route a screen reader has to the words, and it must therefore exist
       before anything is tapped and on every chip, including the zeros. */
    const { container } = hero(() => {}, { topology: 103 })
    for (const b of container.querySelectorAll('button')) {
      const id = b.getAttribute('aria-describedby')
      expect(id, 'every chip is described').toBeTruthy()
      expect(container.querySelector('#' + CSS.escape(id)).textContent.length).toBeGreaterThan(20)
    }
  })

  it('tells a screen reader which chip is open', async () => {
    const { container } = hero(() => {})
    const topology = chip(container, /^Topology/)
    expect(topology.getAttribute('aria-expanded')).toBe('false')
    await userEvent.click(topology)
    expect(topology.getAttribute('aria-expanded')).toBe('true')
  })

  it('does not portal, because the phone frame would clip a portal away', async () => {
    /* ValveConfirmSheet:17-25: a Radix portal lands on document.body and
       escapes the 393x852 frame. This repo has been bitten three times, so the
       band is pinned to living INSIDE the hero. */
    const { container } = hero(() => {})
    await userEvent.click(chip(container, /^Topology/))
    const band = explainer(container)
    expect(container.contains(band), 'the band stays inside the hero').toBe(true)
    expect(band.className).toContain('absolute')
  })

  it('paints the band in tokens, so all four themes re-ground it', async () => {
    const { container } = hero(() => {})
    await userEvent.click(chip(container, /^Topology/))
    const band = explainer(container)
    expect(band.className).toContain('bg-card')
    expect(band.className).toContain('border-border')

    /* The ink is on the two paragraphs, not the chassis — heading on
       --foreground, sentence on --muted-foreground. Both are redefined under
       dark / sand / contrast, which is the whole point of asserting them. */
    const [title, body] = band.querySelectorAll('p')
    expect(title.className).toContain('text-foreground')
    expect(body.className).toContain('text-muted-foreground')

    expect(band.innerHTML + band.className, 'no raw hex on a four-theme surface')
      .not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })
})
