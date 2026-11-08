// @vitest-environment happy-dom
//
// ValveStatusCard — Figma "IOT overview" 199383:141553 (sysA) / 199396:84018
// (sysB), the Valve status card on the System page and, read-only, inside
// EventFocusOverlay.
//
// WHY THIS FILE EXISTS. The owner screenshotted the card on the System page:
// "looks odd and not as in figma." What he saw was a proportion, not a colour.
// The node's row is a 215.5px title/value box beside a `flex-[1_0_0]` Button,
// so the Button takes the REMAINDER — about 30% of the row. The box had been
// rewritten as `max-w-[215.5px] shrink-0`, which on a box with no width sizes
// to its CONTENT: the stack collapsed to ~77px and the growing Button swallowed
// 242 of the row's 327 (74%), cramped against the state word and dominating it.
//
// jsdom measures nothing, so these tests pin the ATOMS that decide the
// measurement rather than the pixels: a real width on the title box, and a
// Button that may not shrink below its own label. The pixel check belongs in
// the browser, and the numbers it gave are in the comments below.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, screen } from '@testing-library/react'
import ValveStatusCard from '@/v2/components/ValveStatusCard'

afterEach(cleanup)

const node = (id, root = document.body) => root.querySelector(`[data-node-id="${id}"]`)

describe('ValveStatusCard — the row the owner flagged', () => {
  /* 199383:141556. A `max-w` alone is what let the Button swell; the node
     draws a real width. Measured after the fix, at 393: title box 215.5,
     Button 103.5 of a 327 row (32%). Before: 76.8 and 242.2 (74%). */
  it('gives the title box the node\'s own width, not just a cap', () => {
    render(<ValveStatusCard />)
    const box = node('199383:141556')
    expect(box.className).toContain('w-[215.5px]')
    /* shrink-0 would make the box refuse to give way on a frame narrower than
       the node's, and the Button would be the one to crush. */
    expect(box.className).not.toContain('shrink-0')
  })

  /* `flex-[1_0_0]` is grow 1 / shrink 0 / basis 0, so the Button only ever
     takes free space — 103.5px at 393, 94.3 at 375 and at 360, where
     `min-w-fit` stops it rather than letting the pill crush "Close valve"
     (72.3px of text plus two 10px pads). `min-w-px`, the node's own atom,
     would have let it. */
  it('floors the button at its own label so the pill never crushes it', () => {
    render(<ValveStatusCard />)
    const btn = screen.getByRole('button', { name: 'Close valve' })
    expect(btn.className).toContain('flex-[1_0_0]')
    expect(btn.className).toContain('min-w-fit')
    expect(btn.className).not.toContain('min-w-px')
  })

  it('keeps the whole row inside one card with the handling panel below it', () => {
    render(<ValveStatusCard tone="alert" />)
    const card = node('199383:141553')
    const row = node('199383:141554')
    const strip = node('199683:26037')
    expect(card.contains(row)).toBe(true)
    expect(card.contains(strip)).toBe(true)
    // The Button is IN the row, beside the state — not below it, not in the strip.
    expect(row.contains(screen.getByRole('button', { name: 'Close valve' }))).toBe(true)
    expect(strip.contains(screen.getByRole('button', { name: 'Close valve' }))).toBe(false)
  })
})

describe('ValveStatusCard — one control, and it only asks', () => {
  /* Owner, 2026-10-17: "now we have 2 valve CTA." The overlay mounts this card
     read-only because its footer already carries the primary. */
  /* UPDATED 2026-11-08. It used to assert `queryByRole('button')` is null
     outright. The auto-shutoff strip (199683:26016) that replaced the
     two-line warning block is a TAP TARGET — the owner's "this sentence can
     be added as a tool tip if someone clicks" — so there is now one button on
     a readout card, and it is not a valve action. The assertion is narrowed
     to what the test was actually about: this card offers no way to move the
     valve when it is a readout. */
  it('draws no VALVE action at all when it is a readout', () => {
    render(<ValveStatusCard interactive={false} tone="alert" />)
    expect(screen.queryByRole('button', { name: /valve$/i })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Open' })).toBeNull()
    // Everything else the design draws is still there.
    expect(screen.getByText('Valve status')).toBeTruthy()
    expect(screen.getByText('Open')).toBeTruthy()
    // The strip, with its state badge — the block's replacement.
    expect(screen.getByRole('button', { name: /^Auto-shutoff: On\./ })).toBeTruthy()
  })

  it('reports the next state and mutates nothing of its own', () => {
    const seen = []
    const { rerender } = render(<ValveStatusCard state="open" onToggle={s => seen.push(s)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close valve' }))
    expect(seen).toEqual(['closed'])
    // The card did NOT move to 'closed' by itself — the page owns that.
    expect(screen.getByRole('button', { name: 'Close valve' })).toBeTruthy()
    expect(screen.getByText('Open')).toBeTruthy()

    rerender(<ValveStatusCard state="closed" onToggle={s => seen.push(s)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open valve' }))
    expect(seen).toEqual(['closed', 'open'])
    expect(screen.getByText('Closed')).toBeTruthy()
  })
})

/* ── THE HANDLING PANEL IS NOW THE AUTO-SHUTOFF STRIP — 199683:26016 ──────
   Owner, 2026-11-08, on a screenshot of the two-line warning block: "replace
   this with how it show in figam - this sentence can be added as a tool tip
   if someone clicks".

   The block drew "Valve handling: Auto shut-off" over its sentence. The frame
   draws one 38px strip with a label and a state badge, and marks the sentence
   hidden. These tests moved with it: the strip still only appears on the
   alert tone, and the sentence is still the caller's to state — it just takes
   a tap to see it now. */
describe('ValveStatusCard — the auto-shutoff strip', () => {
  it('only draws the strip on the alert tone', () => {
    const { rerender } = render(<ValveStatusCard tone="calm" />)
    expect(node('199683:26037')).toBeNull()
    rerender(<ValveStatusCard tone="alert" />)
    expect(node('199683:26037')).toBeTruthy()
  })

  /* THE OLD BLOCK'S DEFECT, KEPT AS A TEST — and it RECURRED on the strip
     before it shipped. Caught in the browser on 2026-11-08: the badge read
     "Disabled" and the tapped sentence read "the valve will automatically
     shut off", which is the same panel-contradicts-its-own-headline bug the
     overlay had. The sentence now follows the state.

     Both sentences are the card's own shipped props, and the caller may
     still set either. */
  it('puts the ENABLED sentence behind the tap when auto-shutoff is on', () => {
    render(
      <ValveStatusCard
        tone="alert"
        autoCloseState="On"
        handlingDescription="Nothing will close the valve for you."
      />,
    )
    const strip = node('199683:26037')
    expect(strip.textContent).toContain('Auto-shutoff')
    // The sentence is behind the tap, so it is NOT on the card face.
    expect(strip.textContent).not.toContain('Nothing will close the valve for you.')
    fireEvent.click(screen.getByRole('button', { name: /^Auto-shutoff: On\./ }))
    expect(screen.getByText('Nothing will close the valve for you.')).toBeTruthy()
  })

  it('never says the valve WILL shut off while the badge reads Disabled', () => {
    render(<ValveStatusCard tone="alert" autoCloseState="Disabled" />)
    fireEvent.click(screen.getByRole('button', { name: /^Auto-shutoff: Disabled\./ }))
    const panel = node('199683:26038')
    expect(panel.textContent).toContain('will not automatically shut off')
    expect(panel.textContent).not.toMatch(/In case a Leak is detected/)
  })

  /* A metering-only system has no such setting, so there is no honest
     sentence to put behind a tap. The badge still states the fact. */
  it('offers no explanation at all for N/A', () => {
    render(<ValveStatusCard tone="alert" autoCloseState="N/A" />)
    expect(screen.queryByRole('button', { name: /What does this mean/ })).toBeNull()
    expect(node('199683:26043').textContent).toContain('N/A')
  })

  /* The two-line block is GONE, by name. A regression here would be the
     owner's instruction being quietly undone. */
  it('no longer draws the two-line "Valve handling" warning block', () => {
    render(<ValveStatusCard tone="alert" />)
    expect(screen.queryByText(/Valve handling/)).toBeNull()
    // And the sentence is not on the face either — it is behind the tap.
    expect(screen.queryByText(/In case a Leak is detected/)).toBeNull()
  })

  /* THE DOT IS STATE-BEARING. Red when auto-shutoff will NOT fire, green when
     it will, muted for the metering-only systems that have no such setting.
     Asserted through `data-tone` rather than a class, so a token rename does
     not silently turn this into a test of nothing. */
  it('reads the badge state through the dot, in three tones', () => {
    const { rerender } = render(<ValveStatusCard tone="alert" autoCloseState="On" />)
    expect(node('199683:26043').getAttribute('data-tone')).toBe('on')
    rerender(<ValveStatusCard tone="alert" autoCloseState="Disabled" />)
    expect(node('199683:26043').getAttribute('data-tone')).toBe('off')
    rerender(<ValveStatusCard tone="alert" autoCloseState="N/A" />)
    expect(node('199683:26043').getAttribute('data-tone')).toBe('muted')
  })

  /* A BARE STATUS DOT IS NOT AN ACCESSIBLE NAME. The trigger has to say what
     it is, what state it is in and that it opens something. */
  it('gives the trigger a real name and a real aria-expanded', () => {
    render(<ValveStatusCard tone="alert" autoCloseState="On" />)
    const trigger = screen.getByRole('button', { name: 'Auto-shutoff: On. What does this mean?' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    // aria-controls must point at an element that actually exists.
    expect(document.getElementById(trigger.getAttribute('aria-controls'))).toBeTruthy()
  })

  /* THREE WAYS OUT, AND FOCUS COMES BACK EVERY TIME. An in-frame panel gets
     none of this for free — a Radix popover would have, and a Radix popover
     portals out of the 393x852 frame. */
  it('dismisses on a second tap, on Escape and on the scrim, returning focus', () => {
    render(<ValveStatusCard tone="alert" />)
    const trigger = screen.getByRole('button', { name: /^Auto-shutoff: On\./ })
    const sentence = () => screen.queryByText(/In case a Leak is detected/)

    // 1. second tap
    fireEvent.click(trigger)
    expect(sentence()).toBeTruthy()
    fireEvent.click(trigger)
    expect(sentence()).toBeNull()
    expect(document.activeElement).toBe(trigger)

    // 2. Escape
    fireEvent.click(trigger)
    expect(sentence()).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(sentence()).toBeNull()
    expect(document.activeElement).toBe(trigger)

    // 3. the scrim
    fireEvent.click(trigger)
    expect(sentence()).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close explanation' }))
    expect(sentence()).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  /* NOT A PORTAL. The panel and its scrim must live inside the card, or they
     escape Phone.jsx's fixed frame the way every Radix overlay does. */
  it('keeps the panel and the scrim inside the card, not in a portal', () => {
    render(<ValveStatusCard tone="alert" />)
    fireEvent.click(screen.getByRole('button', { name: /^Auto-shutoff: On\./ }))
    const card = node('199383:141553')
    expect(card.contains(screen.getByText(/In case a Leak is detected/))).toBe(true)
    expect(card.contains(screen.getByRole('button', { name: 'Close explanation' }))).toBe(true)
  })

  /* No sentence, no disclosure. A trigger that opens an empty panel is worse
     than a plain readout. */
  it('draws no trigger at all when there is nothing to explain', () => {
    render(<ValveStatusCard tone="alert" handlingDescription="" />)
    expect(screen.queryByRole('button', { name: /What does this mean/ })).toBeNull()
    expect(node('199683:26043')).toBeTruthy()
  })
})
