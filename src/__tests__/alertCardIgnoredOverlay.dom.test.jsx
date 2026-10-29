// @vitest-environment happy-dom
/**
 * AlertCard's two IGNORED drawings, pinned apart.
 *
 * This card renders in two surfaces with different geometry, and the ignored
 * state is drawn differently in each:
 *
 *   `ignored`          198374:56322  System page — a fixed 308x136 card in the
 *                                    alert carousel, with its pager and a
 *                                    slate-100/400 pill.
 *   `ignored-overlay`  199772:144341 Event overlay (inside 199754:28589) — the
 *                                    overlay geometry with a slate-500 edge
 *                                    instead of the live card's red one, a
 *                                    slate-200/700 pill, and the overlay body
 *                                    (tiles, no pager).
 *
 * WHY THIS FILE EXISTS. `ignored-overlay` was added before any caller passed
 * it, so the whole variant was unreachable from the app and nothing would have
 * gone red if it had silently stopped working. These assertions are the pin.
 * The second half is the one that matters most: changing the overlay's shell
 * must never move the System page's card, and nothing here may start sharing
 * a shell between the two surfaces.
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import AlertCard from '@/v2/components/AlertCard'

/** The card shell is the nearest ancestor of the pill carrying the radius. */
function shellOf(container) {
  let el = container.querySelector('[data-status-pill]')
  while (el && !(el.className || '').includes('rounded-[18px]')) el = el.parentElement
  return el
}

describe('AlertCard — the ignored state, per surface', () => {
  describe('`ignored` — the System page card (198374:56322)', () => {
    it('keeps the fixed 308x136 shell and the neutral card edge', () => {
      const { container } = render(<AlertCard variant="ignored" actions={false} />)
      const shell = shellOf(container)
      expect(shell.className).toContain('h-[136px]')
      expect(shell.className).toContain('w-[308px]')
      expect(shell.className).toContain('border-card')
      // The overlay's edge must never reach this surface.
      expect(shell.className).not.toContain('border-slate-500')
      expect(shell.className).not.toContain('gap-[20px]')
    })

    it('keeps its pager and its slate-100/400 pill', () => {
      const { container } = render(<AlertCard variant="ignored" actions={false} />)
      const pill = container.querySelector('[data-status-pill]')
      expect(pill.className).toContain('bg-slate-100')
      expect(pill.querySelector('span').className).toContain('text-slate-400')
      // The pager is this surface's, and is NOT removed by the overlay redraw.
      expect(container.querySelectorAll('button[aria-label^="Alert 1 of 2"]').length)
        .toBeGreaterThan(0)
    })
  })

  describe('`ignored-overlay` — the event overlay card (199772:144341)', () => {
    it('draws the overlay shell with a slate-500 border, not the red one', () => {
      const { container } = render(<AlertCard variant="ignored-overlay" actions={false} />)
      const shell = shellOf(container)
      expect(shell.className).toContain('border-slate-500')
      expect(shell.className).toContain('gap-[20px]')
      expect(shell.className).toContain('px-[18px]')
      expect(shell.className).toContain('py-[12px]')
      expect(shell.className).toContain('rounded-[18px]')
      expect(shell.className).toContain('w-full')
      // The System page's geometry must not leak back in.
      expect(shell.className).not.toContain('h-[136px]')
      expect(shell.className).not.toContain('w-[308px]')
      // Nor the live card's severity edge: this event is no longer alerting.
      expect(shell.className).not.toContain('border-red-500')
    })

    it('draws the slate-200/700 "Ignored" pill (199772:144519)', () => {
      const { container } = render(<AlertCard variant="ignored-overlay" actions={false} />)
      const pill = container.querySelector('[data-status-pill]')
      expect(pill.className).toContain('bg-slate-200')
      expect(pill.className).toContain('rounded-[26px]')
      expect(pill.querySelector('span').className).toContain('text-slate-700')
      expect(pill.textContent.trim()).toBe('Ignored')
    })

    it('leaves the pill inert — the 2026-10-17 decision, PRD 14', () => {
      const { container } = render(<AlertCard variant="ignored-overlay" actions={false} />)
      const pill = container.querySelector('[data-status-pill]')
      expect(pill.tagName).not.toBe('BUTTON')
      expect(pill.getAttribute('role')).toBeNull()
      expect(pill.getAttribute('tabindex')).toBeNull()
      expect(pill.className).toContain('cursor-default')
    })

    it('draws the overlay BODY — the same one the live overlay card draws', () => {
      const ignored = render(<AlertCard variant="ignored-overlay" actions={false} />)
      const live = render(<AlertCard variant="overlay" actions={false} />)

      // The figures, their captions and the meta row come from the frame.
      for (const slot of ['Flow Rate', 'Duration', 'Detected', 'Event ID']) {
        expect(ignored.container.textContent).toContain(slot)
        expect(live.container.textContent).toContain(slot)
      }
      // The copy affordance is in the frame (199772:144375), not borrowed.
      expect(ignored.container.querySelector('button[aria-label^="Copy event ID"]')).toBeTruthy()

      // NO PAGER on either — this surface is one event, not a paged list, so
      // the two bodies converge rather than the ignored one losing a control.
      // (The System page's `ignored` card above still has one; see that test.)
      expect(ignored.container.querySelector('button[aria-label^="Alert 1 of 2"]')).toBeNull()
      expect(live.container.querySelector('button[aria-label^="Alert 1 of 2"]')).toBeNull()
    })

    it('differs from the live overlay card ONLY in its edge and its pill', () => {
      const ignored = render(<AlertCard variant="ignored-overlay" actions={false} />)
      const live = render(<AlertCard variant="overlay" actions={false} />)
      const a = shellOf(ignored.container).className
      const b = live.container.firstElementChild.className
      // One token apart.
      expect(a.replace('border-slate-500', 'border-red-500')).toBe(b)
    })
  })
})
