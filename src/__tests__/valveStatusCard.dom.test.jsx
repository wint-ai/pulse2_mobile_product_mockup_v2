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
    const strip = node('199383:141567')
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
  it('draws no action at all when it is a readout', () => {
    render(<ValveStatusCard interactive={false} tone="alert" />)
    expect(screen.queryByRole('button')).toBeNull()
    // Everything else the design draws is still there.
    expect(screen.getByText('Valve status')).toBeTruthy()
    expect(screen.getByText('Open')).toBeTruthy()
    expect(screen.getByText(/Valve handling: Auto shut-off/)).toBeTruthy()
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

describe('ValveStatusCard — the handling panel', () => {
  it('only draws the panel on the alert tone', () => {
    const { rerender } = render(<ValveStatusCard tone="calm" />)
    expect(node('199383:141567')).toBeNull()
    rerender(<ValveStatusCard tone="alert" />)
    expect(node('199383:141567')).toBeTruthy()
  })

  /* The panel used to contradict itself on the overlay: the headline was
     switched on the real policy while the sentence stayed at the card's
     auto-shutoff default, so a manual system read "Valve handling: Manual only
     — ... the valve will automatically shut off". Both halves are props, and
     EventFocusOverlay now drives them off one branch. */
  it('lets the caller state handling and its sentence together', () => {
    render(
      <ValveStatusCard
        tone="alert"
        handling="Manual only"
        handlingDescription="Nothing will close the valve for you."
      />,
    )
    const strip = node('199383:141567')
    expect(strip.textContent).toContain('Valve handling: Manual only')
    expect(strip.textContent).toContain('Nothing will close the valve for you.')
    expect(strip.textContent).not.toMatch(/automatically shut off/)
  })
})
