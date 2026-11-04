// @vitest-environment happy-dom
//
// SlideToConfirm — the slide that ARMS the bulk valve commit button.
//
// IT DOES NOT COMMIT ANYTHING. The owner, 2026-11-03: "sliding shall be
// confirmation before the user can click on the close button." So a release
// past the threshold calls `onArm`, the CALLER flips `armed`, and the caller's
// button is what dispatches. `armed` is CONTROLLED by the caller on purpose:
// the caller owns the decision, so it owns dropping the arm the moment the
// count, the scope or the direction changes under it.
//
// WHY THIS FILE EXISTS. The sheet's own tests pin the INTEGRATION: which path
// dispatches, which gate holds, which window is spent. This file pins the
// CONTROL, and specifically the three WCAG criteria it touches, because every
// one of them is a property of the gesture rather than of the sheet:
//
//   (a) SC 2.5.2 Pointer Cancellation (Level A) — NOTHING fires on the
//       down-event. The ARM is on RELEASE past the threshold, and a release
//       short of it springs back and fires nothing. That is the criterion's
//       "completion on the up-event" bullet plus its abort. The dispatch is a
//       further press on a different control, so there is no route at all from
//       a single pointer-down to water moving.
//   (b) SC 2.5.1 Pointer Gestures (Level A) — the grip SURVIVES VERTICAL
//       DRIFT. W3C's Understanding: a slider is only a dragging movement
//       "unless [it] is implemented in a way that forces users to precisely
//       follow the path of the track, and straying from the track 'loses' the
//       user's grip on the slider thumb", in which case it "may fail the
//       requirements of both this criterion and Success Criterion 2.5.7".
//       `setPointerCapture`, and `clientY` is never read.
//   (c) SC 2.5.7 Dragging Movements (Level AA) — THIS COMPONENT DOES NOT
//       SATISFY IT AND CANNOT. Failure F108 wants "an alternative single
//       pointer input available to actuate the function", and the alternative
//       lives in the CALLER (the acknowledgement checkbox plus the commit
//       button). What is pinned here is only that the control is announced as
//       a BUTTON and not as a `slider` with a value range, and that it carries
//       a description naming that alternative.
//
// Keyboard support is pinned because it is right, NOT because it discharges
// 2.5.7 — W3C is explicit that "achieving keyboard equivalence for a dragging
// operation does not automatically meet this success criterion."
//
// WHAT THESE TESTS CANNOT DO. happy-dom has no layout engine, so the control's
// travel — which it measures from the live track rect on purpose, rather than
// summing class strings — comes back as 0. The rect is stubbed below. Nothing
// here claims anything about pixels on a 393x852 frame; that is a browser
// measurement and there is no browser here.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import SlideToConfirm from '@/v2/components/SlideToConfirm'

afterEach(cleanup)

/* The component's own constants. Duplicated rather than exported: exporting a
   non-component from a component file trips react-refresh/only-export-components,
   and a test that re-declares the number is the test noticing if it moves. */
const TRACK_W = 300
const THUMB_PX = 48
const PAD_PX = 4
const TRAVEL = TRACK_W - THUMB_PX - 2 * PAD_PX
const COMMIT_RATIO = 0.9

const control = () => screen.getByRole('button')

const thumbOf = () => {
  const root = control()
  root.getBoundingClientRect = () => ({
    width: TRACK_W, height: 56, top: 0, left: 0, right: TRACK_W, bottom: 56, x: 0, y: 0,
  })
  return root.querySelector('[data-name="slide-to-confirm-thumb"]')
}

const drag = (dx, { y = 0, release = true } = {}) => {
  const thumb = thumbOf()
  fireEvent.pointerDown(thumb, { pointerId: 1, clientX: 0, clientY: 0 })
  fireEvent.pointerMove(thumb, { pointerId: 1, clientX: dx, clientY: y })
  if (release) fireEvent.pointerUp(thumb, { pointerId: 1, clientX: dx, clientY: y })
  return thumb
}

const setup = (over = {}) => {
  const onArm = vi.fn()
  render(<SlideToConfirm label="Slide to close 31 valves" onArm={onArm} {...over} />)
  return onArm
}

/** The control is CONTROLLED on the armed axis, so a test that wants the armed
    state renders it armed, exactly as the sheet does after `onArm`. */
const setupArmed = (over = {}) => {
  const onDisarm = vi.fn()
  render(
    <SlideToConfirm
      label="Slide to close 31 valves"
      armedLabel="Slide accepted. Now press the button."
      armed
      onDisarm={onDisarm}
      {...over}
    />,
  )
  return onDisarm
}

describe('SlideToConfirm — nothing happens on the way down (SC 2.5.2)', () => {
  it('does not commit on pointerdown, however far the finger then moves', () => {
    const onArm = setup()
    drag(TRAVEL * 4, { release: false })
    expect(onArm).not.toHaveBeenCalled()
  })

  it('arms on the release, once past the threshold', () => {
    const onArm = setup()
    drag(TRAVEL)
    expect(onArm).toHaveBeenCalledTimes(1)
  })

  it('springs back to the safe end on a release short of the threshold', () => {
    const onArm = setup()
    drag(Math.round(TRAVEL * 0.5))
    expect(onArm).not.toHaveBeenCalled()
    expect(control().getAttribute('data-progress')).toBe('0')
  })

  it('puts the threshold at 90% of travel, not at the far wall', () => {
    const under = setup()
    drag(Math.ceil(TRAVEL * COMMIT_RATIO) - 1)
    expect(under).not.toHaveBeenCalled()
    cleanup()

    const over = setup()
    drag(Math.ceil(TRAVEL * COMMIT_RATIO) + 1)
    expect(over).toHaveBeenCalledTimes(1)
  })

  it('treats a cancelled pointer as a release, and a short one aborts', () => {
    const onArm = setup()
    const thumb = thumbOf()
    fireEvent.pointerDown(thumb, { pointerId: 1, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(thumb, { pointerId: 1, clientX: TRAVEL * 0.3, clientY: 0 })
    fireEvent.pointerCancel(thumb, { pointerId: 1, clientX: TRAVEL * 0.3, clientY: 0 })
    expect(onArm).not.toHaveBeenCalled()
    expect(control().getAttribute('data-progress')).toBe('0')
  })

  it('starts at the resting, safe end', () => {
    setup()
    expect(control().getAttribute('data-progress')).toBe('0')
  })
})

describe('SlideToConfirm — the grip survives drift (SC 2.5.1, Level A)', () => {
  /* A PATH-LOCKED SLIDER WOULD BE A LEVEL A PROBLEM, not only a 2.5.7 one.
     The component never reads clientY; these are the cases that would break
     if someone ever added a vertical tolerance check. */
  it('ignores vertical drift entirely, in both directions', () => {
    const onArm = setup()
    const thumb = thumbOf()
    fireEvent.pointerDown(thumb, { pointerId: 1, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(thumb, { pointerId: 1, clientX: TRAVEL * 0.3, clientY: -400 })
    fireEvent.pointerMove(thumb, { pointerId: 1, clientX: TRAVEL * 0.7, clientY: 900 })
    fireEvent.pointerMove(thumb, { pointerId: 1, clientX: TRAVEL, clientY: -1200 })
    fireEvent.pointerUp(thumb, { pointerId: 1, clientX: TRAVEL, clientY: -1200 })
    expect(onArm).toHaveBeenCalledTimes(1)
  })

  it('takes and releases the pointer capture that makes the grip real', () => {
    setup()
    const thumb = thumbOf()
    const taken = []
    const freed = []
    thumb.setPointerCapture = (id) => taken.push(id)
    thumb.releasePointerCapture = (id) => freed.push(id)

    fireEvent.pointerDown(thumb, { pointerId: 9, clientX: 0, clientY: 0 })
    expect(taken).toEqual([9])
    fireEvent.pointerUp(thumb, { pointerId: 9, clientX: 0, clientY: 0 })
    expect(freed).toEqual([9])
  })

  it('survives a user agent with no pointer capture at all', () => {
    const onArm = setup()
    const thumb = thumbOf()
    thumb.setPointerCapture = () => { throw new Error('unsupported') }
    fireEvent.pointerDown(thumb, { pointerId: 1, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(thumb, { pointerId: 1, clientX: TRAVEL, clientY: 0 })
    fireEvent.pointerUp(thumb, { pointerId: 1, clientX: TRAVEL, clientY: 0 })
    expect(onArm).toHaveBeenCalledTimes(1)
  })

  it('cannot be dragged backwards past the safe end', () => {
    const onArm = setup()
    drag(-500)
    expect(onArm).not.toHaveBeenCalled()
    expect(control().getAttribute('data-progress')).toBe('0')
  })
})

describe('SlideToConfirm — a drag may only start on the thumb', () => {
  /* PRESSING THE FAR END OF THE TRACK AND RELEASING WOULD BE A SINGLE TAP THAT
     COMMITS, which is the one thing this control exists to refuse. */
  it('ignores a press on the track itself', () => {
    const onArm = setup()
    const root = control()
    fireEvent.pointerDown(root, { pointerId: 1, clientX: TRACK_W - 1, clientY: 0 })
    fireEvent.pointerUp(root, { pointerId: 1, clientX: TRACK_W - 1, clientY: 0 })
    expect(onArm).not.toHaveBeenCalled()
  })

  it('does not arm on a plain click, which is the pocket tap', () => {
    const onArm = setup()
    fireEvent.click(control())
    fireEvent.click(thumbOf())
    expect(onArm).not.toHaveBeenCalled()
  })
})

describe('SlideToConfirm — keyboard, which is right and is not the 2.5.7 story', () => {
  it('arms on Enter and on Space', () => {
    for (const key of ['Enter', ' ']) {
      const onArm = setup()
      fireEvent.keyDown(control(), { key })
      expect(onArm).toHaveBeenCalledTimes(1)
      cleanup()
    }
  })

  it('walks the handle in quarters and arms on arrival', () => {
    const onArm = setup()
    const el = control()
    fireEvent.keyDown(el, { key: 'ArrowRight' })
    expect(el.getAttribute('data-progress')).toBe('0.25')
    fireEvent.keyDown(el, { key: 'ArrowRight' })
    fireEvent.keyDown(el, { key: 'ArrowRight' })
    expect(el.getAttribute('data-progress')).toBe('0.75')
    expect(onArm).not.toHaveBeenCalled()
    fireEvent.keyDown(el, { key: 'ArrowRight' })
    expect(onArm).toHaveBeenCalledTimes(1)
  })

  it('walks back down, and Home returns to the safe end', () => {
    const onArm = setup()
    const el = control()
    fireEvent.keyDown(el, { key: 'ArrowUp' })
    fireEvent.keyDown(el, { key: 'ArrowUp' })
    fireEvent.keyDown(el, { key: 'ArrowDown' })
    expect(el.getAttribute('data-progress')).toBe('0.25')
    fireEvent.keyDown(el, { key: 'Home' })
    expect(el.getAttribute('data-progress')).toBe('0')
    expect(onArm).not.toHaveBeenCalled()
  })

  it('arms on End', () => {
    const onArm = setup()
    fireEvent.keyDown(control(), { key: 'End' })
    expect(onArm).toHaveBeenCalledTimes(1)
  })

  it('leaves Tab alone, so the caller keeps its focus trap', () => {
    setup()
    const el = control()
    const ev = new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    el.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(false)
  })

  it('is reachable by Tab in the first place', () => {
    setup()
    expect(control().getAttribute('tabindex')).toBe('0')
  })
})

describe('SlideToConfirm — exactly once, and inert when it should be', () => {
  /* THE CALLER OWNS `armed`, so this component must not fire `onArm` again
     for a control that is already armed, and must not fire it at all while
     disabled. Both would be the caller being told to arm something twice. */
  it('does not ask to be armed twice', () => {
    const onArm = vi.fn()
    const { rerender } = render(
      <SlideToConfirm label="Slide to close 31 valves" onArm={onArm} />,
    )
    drag(TRAVEL)
    expect(onArm).toHaveBeenCalledTimes(1)

    rerender(<SlideToConfirm label="Slide to close 31 valves" armed onArm={onArm} />)
    fireEvent.keyDown(control(), { key: 'End' })
    fireEvent.keyDown(control(), { key: 'ArrowRight' })
    expect(onArm).toHaveBeenCalledTimes(1)
  })

  it('refuses every path while disabled', () => {
    const onArm = setup({ disabled: true })
    drag(TRAVEL)
    fireEvent.keyDown(control(), { key: 'Enter' })
    fireEvent.keyDown(control(), { key: 'ArrowRight' })
    fireEvent.keyDown(control(), { key: 'End' })
    expect(onArm).not.toHaveBeenCalled()
    expect(control().getAttribute('data-progress')).toBe('0')
  })
})

describe('SlideToConfirm — the armed state, and the way back out of it', () => {
  /* A COMPLETED SLIDE LANDS AND STAYS LANDED. It does not spring back, because
     springing back would say the gesture had not counted - and it had. */
  it('sits at the far end, filled, while the caller says it is armed', () => {
    setupArmed()
    const el = control()
    expect(el.getAttribute('data-armed')).toBe('true')
    expect(el.getAttribute('data-progress')).toBe('1')
  })

  it('takes the armed label as its accessible name, and shows it at full strength', () => {
    setupArmed()
    expect(
      screen.getByRole('button', { name: 'Slide accepted. Now press the button.' }),
    ).toBeInTheDocument()
    expect(control().querySelector('span').style.opacity).toBe('1')
  })

  it('falls back to the resting label when the caller supplies no armed one', () => {
    render(<SlideToConfirm label="Slide to close 31 valves" armed />)
    expect(
      screen.getByRole('button', { name: 'Slide to close 31 valves' }),
    ).toBeInTheDocument()
  })

  /* ARMING IS REVERSIBLE and the way back is the cheapest possible one: press
     the confirmed slider. A press there can never commit anything, so there is
     no risk in making it a plain click. */
  it('asks to be disarmed on a press, and on Enter, Space and Home', () => {
    for (const act of ['click', 'Enter', ' ', 'Home']) {
      const onDisarm = setupArmed()
      if (act === 'click') fireEvent.click(control())
      else fireEvent.keyDown(control(), { key: act })
      expect(onDisarm).toHaveBeenCalledTimes(1)
      cleanup()
    }
  })

  it('takes no drag at all while armed, so the handle cannot be walked back', () => {
    const onDisarm = setupArmed()
    const thumb = thumbOf()
    fireEvent.pointerDown(thumb, { pointerId: 1, clientX: TRAVEL, clientY: 0 })
    fireEvent.pointerMove(thumb, { pointerId: 1, clientX: 0, clientY: 0 })
    fireEvent.pointerUp(thumb, { pointerId: 1, clientX: 0, clientY: 0 })
    // the position is the caller's flag, not a drag of ours
    expect(control().getAttribute('data-progress')).toBe('1')
    /* The drag itself asked for nothing. (In a real browser a down+up on the
       same element also raises a click, which IS the documented way back;
       happy-dom does not synthesise one, so that half is asserted with an
       explicit click rather than inferred.) */
    expect(onDisarm).not.toHaveBeenCalled()
    fireEvent.click(control())
    expect(onDisarm).toHaveBeenCalledTimes(1)
  })

  it('swaps the direction chevrons for a check once the gesture is spent', () => {
    const { container } = render(
      <SlideToConfirm label="Slide to close 31 valves" armed />,
    )
    const icon = container.querySelector('[data-name="slide-to-confirm-thumb"] svg')
    expect(icon.getAttribute('class')).toMatch(/check/)
    expect(icon.getAttribute('class')).not.toMatch(/chevrons-right/)
  })

  it('stops inviting a gesture that has already happened', () => {
    const { container } = render(
      <SlideToConfirm label="Slide to close 31 valves" armed />,
    )
    expect(container.querySelector('.stc-sheen')).toBeNull()
  })

  it('refuses to disarm while disabled', () => {
    const onDisarm = vi.fn()
    render(<SlideToConfirm label="Slide to close 31 valves" armed disabled onDisarm={onDisarm} />)
    fireEvent.click(control())
    fireEvent.keyDown(control(), { key: 'Enter' })
    expect(onDisarm).not.toHaveBeenCalled()
  })
})

describe('SlideToConfirm — how assistive tech sees it', () => {
  /* NOT `role="slider"`. That role announces a value in a range and invites
     value adjustment; this control has no value, it is a commit. */
  it('is a button, never a slider, and never a form control', () => {
    const { container } = render(<SlideToConfirm label="Slide to close 31 valves" />)
    expect(screen.queryByRole('slider')).toBeNull()
    expect(screen.getByRole('button', { name: 'Slide to close 31 valves' })).toBeInTheDocument()
    // no native <button>, so nothing can be Enter-submitted or click-activated
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('input')).toBeNull()
  })

  /* .claude/skills/wint-ui-copy/SKILL.md §5: prefer aria-disabled where the
     user needs to learn WHY a control is unavailable, because `disabled` is
     skipped outright by some assistive tech and the reason never arrives. */
  it('says it is disabled without disappearing', () => {
    render(<SlideToConfirm label="Slide to close 31 valves" disabled />)
    const el = screen.getByRole('button', { name: 'Slide to close 31 valves' })
    expect(el.getAttribute('aria-disabled')).toBe('true')
    expect(el.getAttribute('tabindex')).toBe('0')
  })

  it('carries the caller’s description, which is where the no-drag path is named', () => {
    render(<SlideToConfirm label="Slide to close 31 valves" hintId="hint-1" />)
    expect(screen.getByRole('button').getAttribute('aria-describedby')).toBe('hint-1')
  })

  /* THE LABEL IS THE ACCESSIBLE NAME, and the caller is expected to put the
     varying payload in it. That is the one cheap nod to Bravo-Lillo inside a
     control that is otherwise invariant content. */
  it('takes its whole accessible name from the label it is handed', () => {
    render(<SlideToConfirm label="Slide to open 1,200 valves" />)
    expect(screen.getByRole('button', { name: 'Slide to open 1,200 valves' })).toBeInTheDocument()
  })

  it('hides the chevron and the moving parts from the accessible name', () => {
    const { container } = render(<SlideToConfirm label="Slide to close 31 valves" />)
    const thumb = container.querySelector('[data-name="slide-to-confirm-thumb"]')
    expect(thumb.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByRole('button').textContent).toBe('Slide to close 31 valves')
  })
})

describe('SlideToConfirm — tokens, scale and motion', () => {
  /* A Tailwind colour utility naming an undefined token falls through to stock
     Tailwind and then FREEZES across all four themes. Every colour here names
     a token declared in :root and re-pointed by dark, sand and contrast. */
  it('names no ramp step and no arbitrary colour', () => {
    const { container } = render(<SlideToConfirm label="Slide to close 31 valves" />)
    const classes = Array.from(container.querySelectorAll('*'))
      .map((el) => el.getAttribute('class') || '')
      .join(' ')
    expect(classes).not.toMatch(/slate-\d|zinc-\d|red-\d|blue-\d/)
    expect(classes).not.toMatch(/\[#|rgb\(|oklch\(/)
    expect(classes).toMatch(/bg-destructive/)
    expect(classes).toMatch(/border-border-strong/)
  })

  it('takes the primary tone on the open direction, which is not destructive', () => {
    const { container } = render(<SlideToConfirm label="Slide to open 31 valves" tone="primary" />)
    const classes = Array.from(container.querySelectorAll('*'))
      .map((el) => el.getAttribute('class') || '')
      .join(' ')
    expect(classes).toMatch(/bg-primary/)
    expect(classes).not.toMatch(/bg-destructive/)
  })

  it('uses no text-[Npx] and clears the 44px target floor', () => {
    const { container } = render(<SlideToConfirm label="Slide to close 31 valves" />)
    const classes = Array.from(container.querySelectorAll('*'))
      .map((el) => el.getAttribute('class') || '')
      .join(' ')
    expect(classes).not.toMatch(/text-\[\d+px\]/)
    // h-14 track (56px), size-12 thumb (48px)
    expect(classes).toMatch(/\bh-14\b/)
    expect(classes).toMatch(/\bsize-12\b/)
  })

  /* THE SPRING CANNOT BE AN INLINE `transition`: an inline style beats
     Tailwind's motion-reduce variant, so reduced motion would keep the
     animation. It is a scoped stylesheet with its own media query, and the
     class is dropped entirely while a pointer is down. */
  it('declares its motion in CSS with a reduced-motion branch, not inline', () => {
    const { container } = render(<SlideToConfirm label="Slide to close 31 valves" />)
    const css = container.querySelector('style').textContent
    expect(css).toMatch(/prefers-reduced-motion: reduce/)
    expect(css).toMatch(/transition: none/)

    for (const el of container.querySelectorAll('[style]')) {
      expect(el.getAttribute('style') || '').not.toMatch(/transition/)
      expect(el.getAttribute('style') || '').not.toMatch(/position:\s*fixed/)
    }
  })

  it('drops the glide class while a pointer is down, so it cannot fight the finger', () => {
    render(<SlideToConfirm label="Slide to close 31 valves" />)
    const thumb = thumbOf()
    expect(thumb.className).toMatch(/stc-glide/)
    fireEvent.pointerDown(thumb, { pointerId: 1, clientX: 0, clientY: 0 })
    expect(
      control().querySelector('[data-name="slide-to-confirm-thumb"]').className,
    ).not.toMatch(/stc-glide/)
  })

  it('stops the browser scrolling the sheet out from under the gesture', () => {
    const { container } = render(<SlideToConfirm label="Slide to close 31 valves" />)
    expect(container.querySelector('[data-name="slide-to-confirm"]').className)
      .toMatch(/touch-none/)
  })
})

describe('SlideToConfirm — a groove and a handle, not a button in a box', () => {
  /* THE OWNER, 2026-11-03: "it needs a lot of improvements on the visual side.
     I want you to take it like off-the-shelf component for this option. It
     looks very bad now. On the visual side."
     NO OFF-THE-SHELF PACKAGE WAS INSTALLABLE: every published slide-to-confirm
     (Kokonut UI, Ruixen UI, ShadcnSpace) wants `motion` / `framer-motion`,
     this repo has no animation library, and no new dependency was approved.
     The LOOK is ported, the package is not - a one-axis drag does not need a
     physics engine. What is pinned here is the vocabulary that makes it read
     as something to be MOVED rather than PRESSED. */

  it('is a pill-shaped track with a circular, shadowed handle inside it', () => {
    const { container } = render(<SlideToConfirm label="Slide to close 31 valves" />)
    const track = container.querySelector('[data-name="slide-to-confirm"]')
    const handle = container.querySelector('[data-name="slide-to-confirm-thumb"]')

    expect(track.className).toMatch(/\brounded-full\b/)
    expect(track.className).not.toMatch(/\brounded-xl\b/)
    expect(handle.className).toMatch(/\brounded-full\b/)
    expect(handle.className).toMatch(/\bshadow-md\b/)
    // the handle sits IN the groove, inset from both edges
    expect(handle.className).toMatch(/\btop-1\b/)
    expect(handle.className).toMatch(/\babsolute\b/)
  })

  /* THE LABEL FADES OUT AS THE THRESHOLD APPROACHES and reaches 0 exactly AT
     the commit point, so the user can feel where the commit is before they
     get there. Driven by POSITION, not by a timer. */
  it('fades the label towards the commit point', () => {
    render(<SlideToConfirm label="Slide to close 31 valves" />)
    const label = () => screen.getByRole('button').querySelector('span')
    expect(label().style.opacity).toBe('1')

    const thumb = thumbOf()
    fireEvent.pointerDown(thumb, { pointerId: 1, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(thumb, { pointerId: 1, clientX: TRAVEL * 0.45, clientY: 0 })
    expect(Number(label().style.opacity)).toBeLessThan(0.6)
    expect(Number(label().style.opacity)).toBeGreaterThan(0)

    fireEvent.pointerMove(thumb, { pointerId: 1, clientX: TRAVEL * COMMIT_RATIO, clientY: 0 })
    expect(Number(label().style.opacity)).toBe(0)
  })

  /* A RESTING STATE THAT INVITES THE GESTURE. Decorative only - it never
     carries meaning, so reduced motion may remove it outright. */
  it('invites the gesture at rest, and stops the moment the gesture starts', () => {
    const { container } = render(<SlideToConfirm label="Slide to close 31 valves" />)
    expect(container.querySelector('.stc-sheen')).not.toBeNull()

    const thumb = thumbOf()
    fireEvent.pointerDown(thumb, { pointerId: 1, clientX: 0, clientY: 0 })
    expect(container.querySelector('.stc-sheen')).toBeNull()
  })

  it('never invites a gesture it would refuse', () => {
    const { container } = render(<SlideToConfirm label="Slide to close 31 valves" disabled />)
    expect(container.querySelector('.stc-sheen')).toBeNull()
  })

  it('removes the invitation entirely under reduced motion', () => {
    const { container } = render(<SlideToConfirm label="Slide to close 31 valves" />)
    const css = container.querySelector('style').textContent
    const reduced = css.slice(css.indexOf('prefers-reduced-motion'))
    // display:none, so no static artifact is left sitting in the groove
    expect(reduced).toMatch(/\.stc-sheen\s*\{[^}]*display:\s*none/)
    expect(reduced).toMatch(/\.stc-nudge\s*\{[^}]*animation:\s*none/)
  })

  it('points in the direction of travel, from inside the handle', () => {
    const { container } = render(<SlideToConfirm label="Slide to close 31 valves" />)
    const handle = container.querySelector('[data-name="slide-to-confirm-thumb"]')
    const icon = handle.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    // lucide stamps the icon name onto the class list
    expect(icon.getAttribute('class')).toMatch(/chevrons-right/)
  })
})
