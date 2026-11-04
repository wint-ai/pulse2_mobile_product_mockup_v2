// @vitest-environment happy-dom
/**
 * A FAULTED VALVE MUST NOT READ AS AN OPERABLE ONE — 2026-11-03.
 *
 * `EventFocusOverlay.jsx` derived the valve's state as
 *
 *     hasValve && valveDevices.every(d => d.valve === 'closed') ? 'closed' : 'open'
 *
 * and `SystemPageV2Screen.jsx` had the same shape. `'error'` is not
 * `'closed'`, so a valve that had already failed to respond to a command came
 * out of both as 'open', and `ValveStatusCard` — which knew only open and
 * closed — drew it as a live, filled, full-width "Close valve now".
 *
 * On `ws-10788` that is a LIVE LOW-FLOW LEAK with auto-shutoff Disabled: the
 * screen said the valve was open, offered to close it, and nothing was going
 * to move. `buildTree.js:472` creates that system on purpose — one water
 * event per site is spent on an already-faulted system "to preserve the
 * leak-over-fault case the UI has to draw" — so the case is permanent and
 * deserves a permanent test.
 *
 * WHAT IS PINNED HERE, and why each one:
 *   · the two new card states render at all (they had no caller before, so
 *     `ValveStatus`'s `error` and `unknown` glyphs had never been drawn);
 *   · the error state offers NO enabled way to command the valve, and says
 *     WHY in its accessible name rather than going silent — `aria-disabled`
 *     over `disabled`, the house rule at wint-ui-copy/SKILL.md §5;
 *   · the error state does not state a position it cannot verify;
 *   · the unknown state offers BOTH directions, because neither is implied;
 *   · open and closed are untouched. That last one is the point: the owner
 *     has twice corrected a change that altered a shared card's other
 *     surfaces, so it is asserted rather than left to review.
 *
 * Fixtures come OUT of the live dataset, never hard-coded, so a dataset
 * refresh cannot quietly make these vacuous.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ValveStatusCard from '@/v2/components/ValveStatusCard'
import EventFocusOverlay from '@/v2/components/EventFocusOverlay'
import { SYSTEMS } from '@/data/systems'
import { valveCategoryOf, canActuate } from '@/v2/components/valveScope'

afterEach(cleanup)

const WATER = new Set(['leak-high', 'leak-low'])

/* THE LEAK-OVER-FAULT SYSTEM. `ws-10788` today; found by predicate so the
   test follows the dataset rather than pinning an id that may move. */
const faultedLeakSys = SYSTEMS.find(
  (s) => WATER.has(s.alert?.type) && valveCategoryOf(s) === 'error',
)

/* The error glyph and the unknown glyph share a viewBox, so they are told
   apart by their tint fill — ValveStatus.jsx carries both verbatim from the
   Figma export and both are deliberately non-themeable. */
const errorGlyph = (el) => el.querySelector('svg path[fill="#FCD7DB"]')
const unknownGlyph = (el) => el.querySelector('svg path[fill="#F1F5F9"]')

/* Every state of this card is drawn twice — the System page mounts the
   original and EventFocusOverlay mounts `redraw` — and the defect was
   present in BOTH. Each card assertion therefore runs against each. */
const VARIANTS = [
  { name: 'original (System page)', props: {} },
  { name: 'redraw (event screen)', props: { redraw: true } },
]

describe.each(VARIANTS)('ValveStatusCard · $name', ({ props }) => {
  const mount = (extra = {}) =>
    render(<ValveStatusCard interactive tone="alert" {...props} {...extra} />)

  describe('state="error" — 199683:25996', () => {
    it('offers no enabled way to command the valve', () => {
      const { container } = mount({ state: 'error' })
      const buttons = [...container.querySelectorAll('button')].filter((b) =>
        /valve/i.test(b.textContent),
      )
      expect(buttons).toHaveLength(1)
      expect(buttons[0].getAttribute('aria-disabled')).toBe('true')
    })

    it('uses aria-disabled, NOT the disabled attribute', () => {
      /* wint-ui-copy/SKILL.md §5: `disabled` is skipped outright by some
         assistive tech, so the reason never reaches the user — and on this
         control the reason is the most useful thing it has to say. */
      const { container } = mount({ state: 'error' })
      const button = container.querySelector('button[aria-disabled="true"]')
      expect(button).toBeTruthy()
      expect(button.hasAttribute('disabled')).toBe(false)
      expect(button.getAttribute('type')).toBe('button')
    })

    it('puts the reason in the accessible name', () => {
      mount({ state: 'error' })
      const button = screen.getByRole('button', {
        name: /Close valve\. This action is not available\. The valve reports an error\./,
      })
      expect(button).toBeTruthy()
    })

    it('does not command the valve when it is clicked anyway', () => {
      /* aria-disabled is a promise to the reader, not to the DOM: the click
         still arrives, so the handler is guarded as well. */
      const onToggle = vi.fn()
      const { container } = mount({ state: 'error', onToggle })
      fireEvent.click(container.querySelector('button[aria-disabled="true"]'))
      expect(onToggle).not.toHaveBeenCalled()
    })

    it('draws the RED glyph, not the open one', () => {
      const { container } = mount({ state: 'error' })
      expect(errorGlyph(container)).toBeTruthy()
    })

    it('does not state a position it cannot verify', () => {
      /* The defect in one line. Nothing in the data model records a position
         beside a fault — buildTree.js:524 writes 'error' INTO the position
         field — so with none supplied the card must not say "Open". */
      const { container } = mount({ state: 'error' })
      expect(within(container).queryByText('Open')).toBeNull()
      expect(within(container).queryByText('Unknown')).toBeTruthy()
    })

    it('KEEPS the position when the caller knows one, and mutes it', () => {
      /* The design's own decision: the icon carries the fault, the reading
         survives one step quieter. `text-muted-foreground`, never a slate
         literal — a Tailwind utility naming a token this repo does not define
         falls through to stock Tailwind and freezes in all four themes. */
      const { container } = mount({ state: 'error', position: 'open' })
      /* The original card wraps the word in a box that carries the ink while
         the <p> carries only the line height; the redraw puts both on the
         <p>. Read whichever of the two holds the colour. */
      const word = within(container).getByText('Open')
      const ink = `${word.className} ${word.parentElement.className}`
      expect(ink).toContain('text-muted-foreground')
      expect(ink).not.toMatch(/text-slate-(600|800)/)
      // Still inert, position or no position.
      expect(container.querySelector('button[aria-disabled="true"]')).toBeTruthy()
    })

    it('points the inert action the way the position does', () => {
      const { container } = mount({ state: 'error', position: 'closed' })
      expect(within(container).getByText('Open valve')).toBeTruthy()
    })
  })

  describe('state="unknown" — 199683:25974', () => {
    it('offers TWO actions, both live', () => {
      const close = vi.fn()
      const { container } = mount({ state: 'unknown', onToggle: close })
      const buttons = [...container.querySelectorAll('button')]
      expect(buttons).toHaveLength(2)
      expect(buttons.map((b) => b.textContent)).toEqual(['Close', 'Open'])
      buttons.forEach((b) => expect(b.getAttribute('aria-disabled')).toBeNull())

      fireEvent.click(buttons[0])
      fireEvent.click(buttons[1])
      expect(close.mock.calls.map((c) => c[0])).toEqual(['closed', 'open'])
    })

    it('draws the word at full ink — an unknown position is a fact we are sure of', () => {
      const { container } = mount({ state: 'unknown' })
      const word = within(container).getByText('Unknown')
      expect(word.className).not.toContain('text-muted-foreground')
      expect(unknownGlyph(container)).toBeTruthy()
    })
  })

  describe('open and closed are UNTOUCHED', () => {
    it('open still offers one live close action', () => {
      const onToggle = vi.fn()
      const { container } = mount({ state: 'open', onToggle })
      expect(within(container).getByText('Open')).toBeTruthy()
      const buttons = [...container.querySelectorAll('button')].filter((b) =>
        /valve/i.test(b.textContent),
      )
      expect(buttons).toHaveLength(1)
      expect(buttons[0].getAttribute('aria-disabled')).toBeNull()
      fireEvent.click(buttons[0])
      expect(onToggle).toHaveBeenCalledWith('closed')
    })

    it('closed still offers one live open action', () => {
      const onToggle = vi.fn()
      const { container } = mount({ state: 'closed', onToggle })
      expect(within(container).getByText('Closed')).toBeTruthy()
      const buttons = [...container.querySelectorAll('button')].filter((b) =>
        /valve/i.test(b.textContent),
      )
      expect(buttons).toHaveLength(1)
      expect(buttons[0].getAttribute('aria-disabled')).toBeNull()
      fireEvent.click(buttons[0])
      expect(onToggle).toHaveBeenCalledWith('open')
    })
  })
})

describe('EventFocusOverlay · a live water event on a faulted valve', () => {
  const sys = faultedLeakSys

  const mount = (extra = {}) =>
    render(
      <MemoryRouter>
        <EventFocusOverlay
          open
          systemId={sys.id}
          system={sys}
          alert={sys.alert}
          onClose={() => {}}
          {...extra}
        />
      </MemoryRouter>,
    )

  const valveSection = () => screen.getByRole('region', { name: 'Valve status' })

  it('the dataset still carries the leak-over-fault case at all', () => {
    /* buildTree.js:472 spends one water event per site on an already-faulted
       system ON PURPOSE. If this ever goes null the tests below are vacuous
       and the fixture needs re-picking, not deleting. */
    expect(sys).toBeTruthy()
    expect(sys.valve).toBe('error')
    expect(canActuate(sys)).toBe(false)
  })

  it('does not say a broken valve is open', () => {
    mount()
    expect(within(valveSection()).queryByText('Open')).toBeNull()
  })

  it('offers no enabled close action', () => {
    mount()
    const buttons = [...valveSection().querySelectorAll('button')].filter((b) =>
      /valve/i.test(b.textContent),
    )
    expect(buttons).toHaveLength(1)
    expect(buttons[0].getAttribute('aria-disabled')).toBe('true')
  })

  it('draws the red glyph', () => {
    mount()
    expect(errorGlyph(valveSection())).toBeTruthy()
  })

  it('a caller that claims the valve is open does NOT get to reinstate the defect', () => {
    /* THE SEAM. `valve.state` is the top term of this overlay's precedence
       and always wins, and the System page used to hand it a literal 'open'
       for a faulted system from its own copy of the broken derivation. That
       page is fixed in the same change; the guard stays, because a position
       supplied by a caller is not evidence that the hardware can move. */
    mount({ valve: { state: 'open', onIntent: () => {} } })
    expect(within(valveSection()).queryByText('Open')).toBeNull()
    expect(valveSection().querySelector('button[aria-disabled="true"]')).toBeTruthy()
  })
})
