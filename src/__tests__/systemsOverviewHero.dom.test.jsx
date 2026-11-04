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
/* THE CATALOGUE IS THE EXPECTATION, not a literal copied into this file. The
   panel's middle block must be the type's own entry verbatim - which is what
   catches a runtime truncation (a `.split('.')[0]` added to "enforce" one
   sentence) or an extra clause concatenated on, while leaving the WORDING to
   the owner where it belongs. */
import { SYSTEM_TYPE, SYSTEM_TYPE_BLURB } from '@/data/systemType'

afterEach(cleanup)

const headline = (c) => c.querySelector('[data-node-id="199466:17471"]')
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
      'Flow Monitoring systems: 156',
      'Humidity sensors: 45',
      'Flood sensors: 55',
    ])
  })

  it('renders a missing count as zero rather than blank', () => {
    const { container } = render(<SystemsOverviewHero total={10} />)
    const names = [...container.querySelectorAll('[role="img"]')]
      .map((el) => el.getAttribute('aria-label'))
    expect(names).toEqual([
      'Flow Monitoring systems: 0',
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
    // 370x150 since 199922:85244, down from the 189 the 2026-11-01 read gave.
    expect(container.firstElementChild.className).toContain('h-[150px]')

    const chip = container.querySelector('[role="img"]')
    expect(chip.className).toContain('bg-[rgba(241,245,249,0.28)]')
    expect(chip.className).toContain('h-[32px]')
    /* 2026-11-01 refetch: 18px -> 12px, and the node gives the chip a
       hairline it did not have. The stroke is spelled `white` in Figma and
       deliberately NOT written as `white` here -- a literal would freeze
       across all four themes, so it is the same --ink-on-color the veil
       already computes from. Asserting the token is asserting that. */
    expect(chip.className).toContain('rounded-[12px]')
    expect(chip.className).toContain('border-ink-on-color')
    expect(chip.className, 'a literal white would freeze under contrast')
      .not.toMatch(/border-white\b/)
  })

  it('isolates the wave group, so the new tint cannot reach the page ground', () => {
    /* THE REFETCH PUT A TINT INSIDE THE WAVE: a flat #a0ccff at
       mix-blend-multiply over the raster. That is safe only while the group
       is isolated. The wrapper's own `mix-blend-multiply` isolates it for
       free -- but the variant beside it turns the wrapper to
       `mix-blend-normal` on every theme but light, and `normal` creates NO
       stacking context. Without `isolate` the tint's multiply would then
       escape and multiply against the dark app ground, which is exactly the
       1.10:1 collapse the test below exists to prevent, re-entering through
       the tint instead of through the wrapper. So `isolate` is part of that
       fix, not decoration, and it is pinned here with it. */
    const { container } = render(<SystemsOverviewHero total={244} />)
    const layer = container.querySelector('[data-node-id="199466:17470"]')
    expect(layer.className).toContain('isolate')

    const tint = layer.querySelector('.mix-blend-multiply')
    expect(tint, 'the tint layer').toBeTruthy()
    expect(tint.className).toContain('bg-[#a0ccff]')
  })

  it('draws no lifecycle pill — the owner removed it and the frame hides it', () => {
    /* REVERSED 2026-11-04. This test used to assert the "Active" pill the
       2026-11-01 refetch added (199531:80083, word :80085, chevron :80084)
       and to assert it was a label rather than a control.

       It is GONE on two agreeing authorities. The owner: "we want to replace
       the drop-down for the lifecycle with something much less visible. Maybe
       we can just remove it for now." And 199922:85244 carries two
       `Active`+chevron frames, both hidden="true".

       Nothing was wired to it - no state, no handler, no prop, no consumer -
       so nothing had to be kept behind. What the old test guarded is kept and
       is the second half below: the chips stay the only three controls in
       this hero, which is what stops a lifecycle menu being reintroduced by
       accident as a fourth. */
    const { container } = render(
      <SystemsOverviewHero total={244} systemTypes={{ topology: 156 }} onSelectType={() => {}} />,
    )
    expect(container.querySelector('[data-node-id="199531:80083"]')).toBeNull()
    expect(container.textContent).not.toContain('Active')
    expect(container.querySelectorAll('button')).toHaveLength(3)
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
    const layer = container.querySelector('[data-node-id="199466:17470"]')
    expect(layer, 'the wave layer').toBeTruthy()
    expect(layer.className).toContain('mix-blend-multiply')
    expect(layer.className).toContain('[[data-theme]:not([data-theme=light])_&]:mix-blend-normal')
  })

  it('gives the chip numeral an on-colour ink on every theme, not just off light', () => {
    // `text-background` resolved to #F4F6F9 in `light` by coincidence and to
    // the near-black app ground under `dark`, where the numeral disappeared
    // into its own chip (2.3:1). --ink-on-color is the token for ink on a
    // coloured ground. This used to be a light-keeps-`--background` variant
    // pair, so that the fix was provably zero-pixel in light; the 2026-11-01
    // refetch settles it, because the node now spells the numeral
    // `var(--colors/white, white)` and --ink-on-color (#fafbfc) is nearer to
    // white than --background (#F4F6F9) ever was. One token, four themes.
    // What this still guards is the thing that mattered: --background must
    // not paint ink that sits on the wave.
    const { container } = render(<SystemsOverviewHero total={244} systemTypes={{ topology: 103 }} />)
    const numeral = [...container.querySelectorAll('span')].find((n) => n.children.length === 0 && n.textContent === '103')
    expect(numeral, 'the chip numeral').toBeTruthy()
    expect(numeral.className).toContain('text-ink-on-color')
    expect(numeral.className, 'the app ground is not an ink for a coloured surface')
      .not.toMatch(/(^|\s)text-background(\s|$)/)

    // lg/heading/leading-none/semibold -- 18/18/-0.45, Geist via
    // --font-mono-label. Size before leading, the repo's tailwind-merge trap.
    expect(numeral.className).toContain('font-mono-label')
    expect(numeral.className).toContain('text-[18px]')
    expect(numeral.className).toContain('leading-[18px]')
    expect(numeral.className).toContain('tracking-[-0.45px]')
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
    expect(container.querySelector('[data-node-id="199466:17470"]').getAttribute('aria-hidden'))
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
    expect(labels).toContain('Flow Monitoring systems: 103. Show these in the Systems tab.')
    /* The zero names the gesture it DOES have, 2026-11-04. It used to stop at
       the count, which tells a screen-reader user the chip's value and
       nothing about why it is focusable. What stays forbidden is the thing
       this test was written for: a zero chip must never name the Systems tab,
       because it will not go there. */
    expect(labels).toContain('Humidity sensors: 0. What are these?')
    expect(labels).toContain('Flood sensors: 0. What are these?')
    for (const l of labels.filter((x) => /: 0\./.test(x))) {
      expect(l, 'a zero chip names no destination').not.toContain('Systems tab')
    }
  })

  it('a zero chip opens a sales panel, by tap, inside the frame', async () => {
    /* THE ZERO CHIP IS A SALES SURFACE. Owner, rejecting the first draft:
       "This is a bad sentence. I want something more on the sales aspect,
       like contact Wint sales or contact your account manager ... The main
       goal here is to do upsells for systems that not sold yet."

       NOT A TOOLTIP, and twice over. Radix Tooltip portals to document.body
       and escapes the 393x852 frame (ValveConfirmSheet:17-25, three times
       bitten); and a tooltip is a HOVER affordance on a touch device, so
       hover alone reaches nobody. The gesture is the tap the chip already
       takes, and the panel rides the in-frame `absolute` band this component
       already owns.

       THE SHAPE IS WHAT IS PINNED, and the owner has now fixed the count of
       it: "I only want the first one, and the talk to Wint sales, that's it."
       Three blocks - title, one-sentence description, CTA - and the CTA only
       at 0. The WORDING is still NEW COPY awaiting him, so it is deliberately
       not pinned verbatim here. */
    const { container } = hero(() => {}, { topology: 103 })

    const nonZero = chip(container, /^Flow Monitoring/)
    await userEvent.click(nonZero)
    expect(
      explainer(container).querySelector('[data-name="System type sales cta"]'),
      'a chip with systems behind it is not an upsell',
    ).toBeNull()

    const zero = chip(container, /^Flood sensors: 0/)
    await userEvent.click(zero)
    const band = explainer(container)
    expect(band.getAttribute('data-zero')).toBe('true')

    /* THREE BLOCKS AND NO FOURTH. A benefit line stood between the
       description and the CTA until 2026-11-04 and the owner cut it; this
       counts the panel rather than naming what is absent, so any fourth block
       added later fails here whatever it is called. */
    const blocks = [...band.querySelectorAll('p, a')]
    expect(blocks.map((el) => el.tagName)).toEqual(['P', 'P', 'A'])

    const description = band.querySelector('[data-name="System type description"]')
    expect(description, 'the description').toBeTruthy()
    expect(description.textContent, 'hyphens in UI copy, never em-dashes').not.toContain('—')
    /* Rule 4 of the owner's ruling: the absence is the opportunity, not a
       fault. No apology anywhere in the panel. */
    expect(band.textContent).not.toMatch(/\byet\b|unfortunately|you don't have/i)
    expect(container.contains(description), 'no portal: it stays inside the frame').toBe(true)
    expect(description.className, 'tokens, so all four themes re-ground it')
      .not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it('the sales CTA is an external link that says it leaves the app', async () => {
    const { container } = hero(() => {}, { topology: 103 })
    await userEvent.click(chip(container, /^Flood sensors: 0/))
    const cta = explainer(container).querySelector('[data-name="System type sales cta"]')
    expect(cta, 'the sales CTA').toBeTruthy()
    expect(cta.tagName).toBe('A')
    expect(cta.getAttribute('href')).toBe('https://wint.ai/contact/')
    expect(cta.getAttribute('target')).toBe('_blank')
    /* Without `noopener` the opened page gets a handle on this window. */
    expect(cta.getAttribute('rel')).toContain('noopener')
    expect(cta.getAttribute('rel')).toContain('noreferrer')
    /* The arrow cannot tell a screen reader that this leaves the app, so the
       name does: the type, the outcome, and where it goes. */
    const name = cta.getAttribute('aria-label')
    expect(name).toContain('Flood sensors')
    expect(name).toMatch(/new tab/i)

    /* REACHABLE. The panel's prose is aria-hidden because it is duplicated in
       the chip's description - but a focusable element inside an aria-hidden
       subtree is tabbable and invisible to assistive tech at the same time,
       which is the worst of both. The link must sit outside that subtree. */
    expect(cta.closest('[aria-hidden="true"]'), 'the link is not inside the hidden prose').toBeNull()
  })

  it('names the panel per type, with no branch per chip', async () => {
    /* The title, the description and the CTA's name all come from the TYPE,
       so a fourth system type would need one data entry and no new markup.
       Pinned by showing two different zero chips producing two different
       panels - a hardcoded branch per chip would be the way this drifts. */
    const { container } = hero(() => {}, { topology: 103 })
    const panelFor = async (re) => {
      await userEvent.click(chip(container, re))
      const band = explainer(container)
      return {
        title: band.querySelector('p').textContent,
        description: band.querySelector('[data-name="System type description"]').textContent,
        cta: band.querySelector('[data-name="System type sales cta"]').getAttribute('aria-label'),
      }
    }
    const flood = await panelFor(/^Flood sensors: 0/)
    const humidity = await panelFor(/^Humidity sensors: 0/)

    expect(flood.title).toBe('Flood sensors')
    expect(humidity.title).toBe('Humidity sensors')
    expect(flood.description, 'two types must not share one line')
      .not.toBe(humidity.description)
    expect(flood.cta).not.toBe(humidity.cta)
  })

  it('gives all THREE types their own description, not one shared string', async () => {
    /* THE REPORT THAT PROMPTED THIS. The owner sent two screenshots of the
       panel and both showed the FLOOD sentence - which, if the humidity chip
       were drawing it too, would mean the text is not keyed off the system
       type at all. That would be a bug, not a copy question, so it is pinned
       rather than eyeballed: every chip at 0, three panels, three distinct
       sentences, each naming its own subject.
       (Checked against the live app too, and it was two captures of the same
       chip - the keying was never broken. This keeps it that way.) */
    const { container } = hero(() => {}, { topology: 0, humidity: 0, flood: 0 })
    const seen = new Map()
    for (const re of [/^Flow Monitoring/, /^Humidity sensors/, /^Flood sensors/]) {
      await userEvent.click(chip(container, re))
      const band = explainer(container)
      seen.set(
        band.querySelector('p').textContent,
        band.querySelector('[data-name="System type description"]').textContent,
      )
    }
    expect([...seen.keys()]).toEqual([
      'Flow Monitoring systems', 'Humidity sensors', 'Flood sensors',
    ])
    expect(new Set(seen.values()).size, 'three types, three lines').toBe(3)
    /* And each line is the one that belongs to its own type - a shuffled map
       would still give three distinct strings. */
    expect(seen.get('Flood sensors')).toMatch(/water reaching somewhere it should not/)
    expect(seen.get('Humidity sensors')).toMatch(/how damp its own spot is/)
    expect(seen.get('Flow Monitoring systems')).toMatch(/metered water line/)
  })

  it('shows the catalogue description verbatim, and nothing between it and the CTA', async () => {
    /* RE-AIMED TWICE, and the second time is the one that matters.
       It began as "one claim per benefit line"; the benefit line was cut, so
       it became "one sentence of description". Then the owner restored Flow
       Monitoring's second sentence - "just want the description for flow
       monitoring to be as it was before" - and a sentence COUNT stopped being
       the rule at all.

       THE RULE IS NOW EXACTNESS, which is stronger than the count it replaced
       and is what the owner actually ruled on twice over: the middle block is
       the type's catalogue entry, byte for byte, and nothing sits between it
       and the CTA. A stray benefit line fails it (the string would not
       match, and the block list would gain a fourth entry); a runtime
       truncation fails it; and flow's two sentences pass without an exception
       written into the test, because the catalogue is the expectation.
       Counting sentences would have needed a per-type special case here, and
       a special case is exactly what a future paste would slip through. */
    const { container } = hero(() => {}, { topology: 0, humidity: 0, flood: 0 })
    const cases = [
      [/^Flow Monitoring/, SYSTEM_TYPE.FLOW],
      [/^Humidity sensors/, SYSTEM_TYPE.HUMIDITY],
      [/^Flood sensors/, SYSTEM_TYPE.FLOOD],
    ]
    for (const [re, type] of cases) {
      await userEvent.click(chip(container, re))
      const band = explainer(container)
      const description = band.querySelector('[data-name="System type description"]').textContent
      expect(description, `${type} renders its own catalogue entry, unmangled`)
        .toBe(SYSTEM_TYPE_BLURB[type])
      expect(description, 'hyphens, never em-dashes').not.toContain('—')
      /* Three blocks, in this order, and no fourth between the last two. A
         paragraph that WRAPS is still one <p>, so flow's longer entry does
         not move this. */
      expect([...band.querySelectorAll('p, a')].map((el) => el.tagName))
        .toEqual(['P', 'P', 'A'])
    }
  })

  it('puts the type description in the chip description, and never goes empty', () => {
    /* The panel's prose is aria-hidden on purpose (it would otherwise be
       announced twice), so this sr-only run is the ONLY route a screen reader
       has to those words.

       RE-CHECKED after the benefit line was cut. It used to carry the benefit
       for a zero chip and the blurb otherwise; there is nothing left to
       append, so both now read the same and neither is empty. The sales route
       is NOT lost with it - the CTA is a real link with its own accessible
       name, outside the hidden prose. */
    const { container } = hero(() => {}, { topology: 103 })
    const describedText = (re) => {
      const b = chip(container, re)
      return container.querySelector('#' + CSS.escape(b.getAttribute('aria-describedby'))).textContent
    }
    const zero = describedText(/^Flood sensors: 0/)
    const nonZero = describedText(/^Flow Monitoring/)
    expect(zero).toBe(`Flood sensors. ${SYSTEM_TYPE_BLURB[SYSTEM_TYPE.FLOOD]}`)
    expect(nonZero).toBe(`Flow Monitoring systems. ${SYSTEM_TYPE_BLURB[SYSTEM_TYPE.FLOW]}`)
    for (const t of [zero, nonZero]) expect(t.trim().length).toBeGreaterThan(20)
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

    await userEvent.click(chip(container, /^Flow Monitoring/))
    expect(picked, 'the first tap must not navigate').toEqual([])
    expect(explainer(container).textContent).toContain('Flow Monitoring systems')
    expect(explainer(container).textContent).toContain('metered water line')
  })

  it('the second tap on the SAME chip navigates', async () => {
    const picked = []
    const { container } = hero((t) => picked.push(t))
    const topology = chip(container, /^Flow Monitoring/)
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
    await userEvent.click(chip(container, /^Flow Monitoring/))
    await userEvent.click(chip(container, /^Flood/))
    expect(picked, 'a first tap on another chip is still a first tap').toEqual([])
    expect(explainer(container).textContent).toContain('Flood sensors')
    expect(explainer(container).textContent).not.toContain('Flow Monitoring')
  })

  it('a tap somewhere else puts the reveal away', async () => {
    const { container } = hero(() => {})
    await userEvent.click(chip(container, /^Flow Monitoring/))
    expect(explainer(container)).toBeTruthy()
    await userEvent.click(document.body)
    expect(explainer(container), 'an armed chip must not outlive the glance').toBeNull()
  })

  it('Escape puts the reveal away', async () => {
    const { container } = hero(() => {})
    await userEvent.click(chip(container, /^Flow Monitoring/))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(explainer(container)).toBeNull()
  })

  it('a reveal does not survive the counts changing under it', async () => {
    const picked = []
    const { container, rerender } = hero((t) => picked.push(t))
    await userEvent.click(chip(container, /^Flow Monitoring/))
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
    fireEvent.click(chip(container, /^Flow Monitoring/), { detail: 0 })
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
    const topology = chip(container, /^Flow Monitoring/)
    expect(topology.getAttribute('aria-expanded')).toBe('false')
    await userEvent.click(topology)
    expect(topology.getAttribute('aria-expanded')).toBe('true')
  })

  it('does not portal, because the phone frame would clip a portal away', async () => {
    /* ValveConfirmSheet:17-25: a Radix portal lands on document.body and
       escapes the 393x852 frame. This repo has been bitten three times, so the
       band is pinned to living INSIDE the hero. */
    const { container } = hero(() => {})
    await userEvent.click(chip(container, /^Flow Monitoring/))
    const band = explainer(container)
    expect(container.contains(band), 'the band stays inside the hero').toBe(true)
    expect(band.className).toContain('absolute')
  })

  it('paints the band in tokens, so all four themes re-ground it', async () => {
    const { container } = hero(() => {})
    await userEvent.click(chip(container, /^Flow Monitoring/))
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
