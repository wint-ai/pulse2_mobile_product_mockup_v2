// @vitest-environment happy-dom
/**
 * THE VALVE STATUS CARD'S `redraw` VARIANT, against Figma 199703:38726
 * (auto-shutoff armed) and 199703:41537 (auto-shutoff disabled).
 *
 * This variant had NO tests of its own, which is how a full structural
 * rewrite of it passed a 1089-case suite untouched. The two frames moved the
 * element ORDER, not just the classes:
 *
 *   before   [ state | button ]            after   [ state | auto-shutoff ]
 *            [ auto-shutoff strip ]                [ attention, if disabled ]
 *                                                  [ button, full width ]
 *
 * so "it still renders" is not the property worth holding. What matters is
 * which of the two states is drawn, that the two never appear at once, and
 * that `redraw` does not leak into the System page's mount.
 *
 * THE LAST ONE IS THE POINT. The owner has twice corrected a change that
 * altered a shared card's other surfaces — "the card in other pages needs to
 * remain as it was" — so the default render is asserted to be untouched here
 * rather than left to review.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'
import ValveStatusCard from '@/v2/components/ValveStatusCard'

afterEach(cleanup)

const mount = (props = {}) =>
  render(<ValveStatusCard redraw interactive state="open" tone="alert" {...props} />)

const clock = (c) => c.querySelector('[data-countdown]')
const attention = (c) => c.querySelector('[data-node-id="199703:42035"]')

describe('auto-shutoff ARMED (199703:38726)', () => {
  it('counts down under an "in" label', () => {
    /* The label carries the preposition ONLY over a clock. That is the whole
       fix for the owner's earlier objection — "i don't like the will activate
       in 10:00 time elapsed this is not clear text" — because "in" on its own
       line above the figure is what stops 02:45 reading as a wall clock. */
    const { container } = mount({ autoCloseState: 'On', activatesIn: { minutes: 2, seconds: 45 } })
    expect(screen.getByText('Auto-shutoff in')).toBeTruthy()
    expect(clock(container)).toBeTruthy()
    expect(clock(container).textContent.replace(/\s+/g, '')).toBe('02:45')
  })

  it('pads both halves to two digits', () => {
    // 199703:39364 / :39366 draw "00" and "00", never "0".
    const { container } = mount({ autoCloseState: 'On', activatesIn: { minutes: 1, seconds: 5 } })
    expect(clock(container).textContent.replace(/\s+/g, '')).toBe('01:05')
  })

  it('draws NO badge while the clock is running', () => {
    /* The node draws one or the other. A badge reading "On" beside a running
       countdown says the same thing twice. */
    const { container } = mount({ autoCloseState: 'On', activatesIn: { minutes: 2, seconds: 0 } })
    expect(within(container).queryByText('On')).toBeNull()
  })

  it('draws no Attention block — there is nothing to warn about', () => {
    const { container } = mount({ autoCloseState: 'On', activatesIn: { minutes: 2, seconds: 0 } })
    expect(attention(container)).toBeNull()
  })

  it('falls back to the badge when armed but with no timing to show', () => {
    /* `activatesIn` is null wherever the data carries no auto-close delay.
       The card then states the SETTING rather than inventing a clock — the
       node's own 00:00 is a placeholder and a zeroed countdown drawn as if
       measured is the invented-number defect. */
    const { container } = mount({ autoCloseState: 'On', activatesIn: null })
    expect(clock(container)).toBeNull()
    expect(screen.getByText('On')).toBeTruthy()
    expect(screen.getByText('Auto-shutoff')).toBeTruthy()
    expect(screen.queryByText('Auto-shutoff in'), 'a dangling preposition').toBeNull()
  })
})

describe('auto-shutoff DISABLED (199703:41537)', () => {
  const disabled = { autoCloseState: 'Disabled', activatesIn: null }

  it('labels the panel without the preposition', () => {
    mount(disabled)
    expect(screen.getByText('Auto-shutoff')).toBeTruthy()
    expect(screen.queryByText('Auto-shutoff in')).toBeNull()
  })

  it('shows the state badge, not a clock', () => {
    const { container } = mount(disabled)
    expect(screen.getByText('Disabled')).toBeTruthy()
    expect(clock(container)).toBeNull()
  })

  it('never draws a countdown even if one is passed', () => {
    /* A disabled valve has nothing to count down to. Passing both is a caller
       bug, and the card must not render a countdown to an event that will not
       happen — that is a lie about safety, not a layout slip. */
    const { container } = mount({ autoCloseState: 'Disabled', activatesIn: { minutes: 5, seconds: 0 } })
    expect(clock(container)).toBeNull()
    expect(screen.getByText('Disabled')).toBeTruthy()
  })

  it('draws the Attention block with the node’s own sentence', () => {
    /* Back on after being hidden: the owner said "hide this dfor now" earlier
       on 2026-10-26, then sent 199703:41537 with "update to latest", and that
       node draws it as a first-class part of this state. */
    const { container } = mount(disabled)
    expect(attention(container)).toBeTruthy()
    expect(screen.getByText('Attention')).toBeTruthy()
    expect(
      screen.getByText('The valve will not automatically shut off and water loss is at risk'),
    ).toBeTruthy()
  })

  it('grounds the Attention block in a TOKEN, so it survives the dark theme', () => {
    /* THE BUG THIS PINS. The panel was `bg-red-50`, and `--red-50` is not
       defined anywhere in src/index.css — Tailwind supplies its own built-in
       #fef2f2 when the repo defines none, so the class resolved silently and
       painted a fixed pale pink that no theme could move. Every ink on top of
       it followed the theme, so under `dark` the panel measured 1.05:1 for
       "Attention" and 1.16:1 for the sentence: the entire warning was
       invisible, on the only state that draws a warning.

       No ink could fix it (the best on a frozen ground was 2.64:1); the
       GROUND had to become a token. --alert-surface-critical is the repo's
       declared critical alert surface and moves with the theme. Measured on
       the live overlay from rasterised pixels, after the fix:
       light 14.63 / dark 18.42 / sand 16.21 / contrast 3.00.

       A class whose token does not exist is the failure mode here, so the
       assertion is on the token NAME, not on a colour. */
    const { container } = mount(disabled)
    const cls = attention(container).className
    expect(cls).toContain('bg-alert-surface-critical')
    expect(cls, 'red-50 is not a token in this repo; it froze under every theme')
      .not.toContain('bg-red-50')
    const label = screen.getByText('Attention')
    expect(label.className).toContain('text-foreground')
    expect(label.className, '--slate-900 is a ramp step, not the declared opposing ink')
      .not.toContain('text-slate-900')
  })

  it('starts COLLAPSED, with the warning itself still visible', () => {
    /* Owner: "the attention takes too much space maybe collapsed it?"

       The thing being collapsed is the SENTENCE. The red panel, the icon and
       the word "Attention" stay on screen in both states, because a safety
       notice you have to discover is not a safety notice. This asserts both
       halves of that: the heading is visible AND the body is hidden. */
    const { container } = mount(disabled)
    expect(attention(container).dataset.collapsed).toBe('true')
    expect(screen.getByText('Attention')).toBeTruthy()
    const body = screen.getByText(
      'The valve will not automatically shut off and water loss is at risk',
    )
    expect(body.hidden, 'the sentence is showing while collapsed').toBe(true)
  })

  it('expands and collapses again from a real button', () => {
    const { container } = mount(disabled)
    const toggle = screen.getByRole('button', { name: /Attention/ })
    expect(toggle.tagName).toBe('BUTTON')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(attention(container).dataset.collapsed).toBe('false')
    expect(
      screen.getByText('The valve will not automatically shut off and water loss is at risk').hidden,
    ).toBe(false)

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps the sentence in the DOM while collapsed', () => {
    /* `hidden`, not unmounted. aria-controls must point at an element that
       exists, and a warning that leaves the DOM drops out of find-in-page. */
    const { container } = mount(disabled)
    const toggle = screen.getByRole('button', { name: /Attention/ })
    const panelId = toggle.getAttribute('aria-controls')
    expect(panelId).toBeTruthy()
    expect(container.querySelector(`#${CSS.escape(panelId)}`)).toBeTruthy()
  })

  it('still hides the Attention block on request', () => {
    // The prop survived the reversal, so hiding it again is one word.
    const { container } = mount({ ...disabled, showAttention: false })
    expect(attention(container)).toBeNull()
    expect(screen.queryByText('Attention')).toBeNull()
  })
})

describe('the action', () => {
  it('is a full-width button that asks rather than acts', () => {
    /* The card ASKS; the caller turns this into a confirm sheet. It must not
       toggle anything itself. */
    const onToggle = vi.fn()
    mount({ onToggle, state: 'open' })
    const btn = screen.getByRole('button', { name: /Close valve now/ })
    fireEvent.click(btn)
    expect(onToggle).toHaveBeenCalledWith('closed')
  })

  it('is a FILLED pill, fully rounded, not the outline it used to be', () => {
    /* 199772:145508 (canonical frame 199772:145451) replaced the outline with
         bg-slate-900 h-[54px] rounded-[458.696px]
         drop-shadow-[0px_2.296px_3.214px_rgba(47,116,237,0.28)] w-full
       458.696 on a 54px element is Figma writing "fully rounded", so the
       class is `rounded-full` - the spelling this codebase already uses.

       THE OLD GUARD, KEPT: `get_design_context` printed
         rounded-[var(--component/button/size-xs/radius,8px)]
       and that 8 is stale - the token resolves to 26. Taken literally it drew
       a nearly square-cornered button and the owner caught it on sight,
       "this is not as in figma / the button". The literal is still wrong
       here, just differently, so the assertion stays. */
    const { container } = mount()
    const cls = within(container).getByRole('button', { name: /Close valve now/ }).className
    expect(cls).toContain('rounded-full')
    expect(cls, 'the stale 8px fallback is back').not.toContain('rounded-[8px]')
    expect(cls, 'Figma’s 458.696 literal is not a third spelling of rounded-full')
      .not.toContain('458.696')
    expect(cls).toContain('h-[54px]')
    expect(cls, 'the outline treatment is gone').not.toContain('border-slate-900')
  })

  it('fills with --foreground and inks with --background, so it survives all four themes', () => {
    /* --slate-900 is the INK ramp step and INVERTS per theme (index.css:825
       makes it zinc-50 under `dark`), so a literal `bg-slate-900` fill is a
       near-WHITE button there and Figma's light label vanishes into it -
       measured 1.01:1 against --ink-on-color, 1.04:1 against white.
       --foreground IS --slate-900 under `light` (index.css:99), so the frame
       is transcribed exactly, and --background is the token declared as its
       opposite in every theme (the pairing tooltip.jsx:36 already uses).
       Measured: light 16.47 / dark 19.05 / sand 18.92 / contrast 4.95. */
    const { container } = mount()
    const btn = within(container).getByRole('button', { name: /Close valve now/ })
    expect(btn.className).toContain('bg-foreground')
    expect(btn.className, '--slate-900 inverts; it cannot be the fill').not.toContain('bg-slate-900')
    const label = btn.querySelector('p')
    expect(label.className).toContain('text-background')
    expect(label.className, '--ink-on-color is 1.01:1 on this ground under dark')
      .not.toContain('text-ink-on-color')
  })

  it('is omitted entirely as a readout, not disabled', () => {
    /* A greyed button still reads as "you may do this here". */
    const { container } = mount({ interactive: false })
    expect(within(container).queryByRole('button')).toBeNull()
  })

  it('offers to open a closed valve', () => {
    mount({ state: 'closed' })
    expect(screen.getByRole('button', { name: /Open valve now/ })).toBeTruthy()
    expect(screen.getByText('Closed')).toBeTruthy()
  })
})

describe('the redraw does not leak into the other mounts', () => {
  it('the default card keeps its own button wording and shape', () => {
    /* Owner, twice: "the card in other pages needs to remain as it was." The
       System page passes no `redraw`, so it must draw the compact inline card
       — "Close valve", not "Close valve now". */
    render(<ValveStatusCard interactive state="open" tone="alert" />)
    expect(screen.getByRole('button', { name: /^Close valve$/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Close valve now/ })).toBeNull()
  })

  it('the default card draws none of the redraw’s nodes', () => {
    const { container } = render(<ValveStatusCard interactive state="open" tone="alert" />)
    expect(container.querySelector('[data-node-id="199703:38731"]'), 'the new row').toBeNull()
    expect(attention(container), 'the new attention block').toBeNull()
  })
})
