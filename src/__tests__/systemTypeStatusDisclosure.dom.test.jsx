// @vitest-environment happy-dom
//
// THE EDGE-DEVICE STATUS ICON OPENS THE DISCLOSURE IT SUMMARISES.
//
// Owner, 2026-11-01: "when the edge device icon gets red or green, when it
// describes the aggregation of all states below this edge device, I want it to
// open the show more when someone click on it, because he wants to understand
// why it's red or why it's green ... once user click on this icon, it needs to
// open the show more."
//
// Three things are pinned here, and the third is the one that will break:
//   1. the icon control opens the body, and `aria-expanded` tracks it;
//   2. the FOOTER "Show more" keeps working exactly as it did — the icon adds
//      a way in, it does not replace one;
//   3. the dot KEEPS its own `role="img"` accessible name. The icon control is
//      a sibling of the dot, not its parent, precisely so that name survives:
//      v2ControlsWired asserts `getAllByRole('img', { name: 'Alerting' })`
//      because on a fault system that name is the only thing telling a screen
//      reader the system is in trouble. Wrap the dot in the button and this
//      file still passes while that one goes red.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import SystemTypeCard from '@/v2/components/SystemTypeCard'

afterEach(cleanup)

const iconControl = container => container.querySelector('[data-name="status-disclosure"]')

describe('the status icon opens "Show more"', () => {
  it('opens the body on a tap, and aria-expanded tracks it', () => {
    const { container } = render(<SystemTypeCard status="alert" tone="alert" />)
    const icon = iconControl(container)

    expect(icon).toBeTruthy()
    expect(icon.tagName).toBe('BUTTON')
    expect(icon.getAttribute('type')).toBe('button')
    expect(icon.getAttribute('aria-expanded')).toBe('false')
    expect(within(container).queryByText('System status')).toBeNull()

    fireEvent.click(icon)

    expect(within(container).getByText('System status')).toBeTruthy()
    expect(iconControl(container).getAttribute('aria-expanded')).toBe('true')
  })

  it('points aria-controls at the panel it actually opens', () => {
    const { container } = render(<SystemTypeCard />)
    const id = iconControl(container).getAttribute('aria-controls')
    expect(id).toBeTruthy()

    fireEvent.click(iconControl(container))

    const panel = container.querySelector(`#${CSS.escape(id)}`)
    expect(panel).toBeTruthy()
    expect(within(panel).getByText('System status')).toBeTruthy()
    // The footer control and the icon drive the SAME panel.
    expect(iconControl(container).getAttribute('aria-controls')).toBe(id)
  })

  it('closes again on a second tap — it is a toggle, not a one-way door', () => {
    const { container } = render(<SystemTypeCard />)

    fireEvent.click(iconControl(container))
    expect(within(container).getByText('System status')).toBeTruthy()

    fireEvent.click(iconControl(container))
    expect(within(container).queryByText('System status')).toBeNull()
    expect(iconControl(container).getAttribute('aria-expanded')).toBe('false')
  })

  it('takes the footer copy for its name rather than inventing one', () => {
    const { container } = render(<SystemTypeCard />)
    expect(iconControl(container).getAttribute('aria-label')).toBe('Show more')

    fireEvent.click(iconControl(container))
    expect(iconControl(container).getAttribute('aria-label')).toBe('Show less')
  })

  it('reports through onToggle when the card is controlled, and does not self-open', () => {
    const onToggle = vi.fn()
    const { container, rerender } = render(
      <SystemTypeCard expanded={false} onToggle={onToggle} />,
    )

    fireEvent.click(iconControl(container))

    expect(onToggle).toHaveBeenCalledWith(true)
    // Controlled: the card did NOT move on its own.
    expect(within(container).queryByText('System status')).toBeNull()

    rerender(<SystemTypeCard expanded onToggle={onToggle} />)
    expect(iconControl(container).getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(iconControl(container))
    expect(onToggle).toHaveBeenLastCalledWith(false)
  })
})

describe('what was already there still works', () => {
  it('the footer "Show more" opens the body, as before', () => {
    const { container } = render(<SystemTypeCard />)
    const footer = within(container)
      .getAllByRole('button', { name: 'Show more' })
      .find(b => b.getAttribute('data-name') !== 'status-disclosure')

    expect(footer).toBeTruthy()
    fireEvent.click(footer)

    expect(within(container).getByText('System status')).toBeTruthy()
    // ...and the body's own "Show less" closes it, as before.
    const less = within(container)
      .getAllByRole('button', { name: 'Show less' })
      .find(b => b.getAttribute('data-name') !== 'status-disclosure')
    fireEvent.click(less)
    expect(within(container).queryByText('System status')).toBeNull()
  })

  it('the dot keeps its own accessible name — the icon control is a sibling', () => {
    const { container } = render(<SystemTypeCard status="alert" tone="alert" />)

    const dot = within(container).getByRole('img', { name: 'Alerting' })
    expect(dot).toBeTruthy()
    // Sibling, not ancestor/descendant: the button must not swallow the name.
    const icon = iconControl(container)
    expect(icon.contains(dot)).toBe(false)
    expect(dot.contains(icon)).toBe(false)
    expect(icon.parentElement).toBe(dot.parentElement)

    // Still true once open, where the status dot is the page's only "Alerting".
    fireEvent.click(icon)
    expect(within(container).getByRole('img', { name: 'Alerting' })).toBeTruthy()
  })

  it('gives the control a real tap area without covering the chip below it', () => {
    const { container } = render(<SystemTypeCard />)
    const cls = iconControl(container).getAttribute('class')

    // 29px box + 7.5px of pseudo-element on every side = 44px.
    expect(cls).toContain('size-[29px]')
    expect(cls).toContain("after:content-['']")
    expect(cls).toContain('after:inset-[-7.5px]')
    /* z-[1] is not cosmetic. Without it the pseudo ring loses hit-testing to
       the pipe elbow below the badge and the branch label to its right, both
       of which are positioned siblings painted later — measured in Chromium,
       all four themes: elementFromPoint on the bottom and right margins
       returned the <svg> and the <p>, so the 44px target was really 29px on
       two sides and taps in the margin did nothing. */
    expect(cls).toContain('z-[1]')
    // Focus is visible, and from the repo's ring token — not a raw colour.
    expect(cls).toContain('focus-visible:ring-ring/50')
    expect(cls).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })
})
