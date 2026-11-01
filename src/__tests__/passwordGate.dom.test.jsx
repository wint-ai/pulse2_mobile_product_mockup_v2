// @vitest-environment happy-dom
//
// THE DEMO PASSWORD GATE — the reveal toggle, and the behaviour around it
// that the 2026-11-01 restyle was not allowed to move.
//
// WHY THIS FILE EXISTS. The gate was rebuilt from a hand-rolled inline-style
// block onto <Card>/<Input>/<Button>/<Separator>, and a reveal toggle was
// added to the field. Two classes of regression were available in that:
//
//  · THE TOGGLE IS A FORM CONTROL INSIDE A FORM. The old screen had no
//    <form> at all — Enter was an onKeyDown handler. The new one does, which
//    is what makes Enter work without a handler, and which is also what makes
//    a <button> with no `type` default to type="submit". A toggle that
//    submits the form would fire a wrong-password check on every tap to peek
//    at what you typed. That is the single most likely way this control
//    breaks, and it is invisible in a screenshot, so it is asserted here.
//
//  · THE GATE ITSELF. DEMO_PASSWORD, the sessionStorage key, and the
//    disabled-until-input Continue button are load-bearing for the whole
//    suite: src/__tests__/routeSmoke.dom.test.jsx seeds 'pulse2-demo-pw-ok'
//    to get past this screen, and 29 of its cases fail on the gate marker if
//    that stops working. The restyle must not have touched any of it, so the
//    contract is pinned here rather than inferred from routeSmoke going red.
//
// The gate renders ahead of everything, so <App /> with an empty
// sessionStorage IS the gate — there is nothing to mock.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

const PASSWORD = 'WINT2026'
const SESSION_KEY = 'pulse2-demo-pw-ok'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  // PushNotifications opens an EventSource to ntfy.sh on mount. It never
  // mounts here (PasswordGate returns before its children) but the flag is
  // cheap insurance if that ever changes.
  localStorage.setItem('pulse2-bridge-disabled', '1')
  window.history.pushState({}, '', '/')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const field = () => document.getElementById('demo-password')
const toggle = () => screen.getByRole('button', { name: /password$/i })
const submitButton = () => screen.getByRole('button', { name: 'Continue' })

describe('the demo password gate', () => {
  it('is what the app renders with no session', () => {
    render(<App />)
    expect(screen.getByText('Enter demo password')).toBeInTheDocument()
    expect(
      screen.getByText('This is a private preview of the Pulse2 mobile app.'),
    ).toBeInTheDocument()
  })

  it('paints no background of its own, so the app wash shows through', () => {
    // The literal `background:'#fff'` on this subtree was the whole reason
    // the screen read as another app: Phone.jsx hands it var(--app-bg) and
    // the white sheet covered it. Assert the ABSENCE rather than a colour —
    // a colour assertion would have to be rewritten per theme, and happy-dom
    // resolves no var() anyway.
    const { container } = render(<App />)
    const roots = container.querySelectorAll('[style*="background"]')
    for (const el of roots) {
      expect(el.getAttribute('style')).not.toMatch(/#fff|white/i)
    }
  })
})

describe('the reveal toggle', () => {
  it('starts masked, reveals, and re-masks', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(field()).toHaveAttribute('type', 'password')

    await user.click(toggle())
    expect(field()).toHaveAttribute('type', 'text')

    await user.click(toggle())
    expect(field()).toHaveAttribute('type', 'password')
  })

  it('names itself, and the name changes with the state', async () => {
    const user = userEvent.setup()
    render(<App />)

    // A bare icon button would have no accessible name at all and this query
    // would throw.
    const t = toggle()
    expect(t).toHaveAttribute('aria-label', 'Show password')
    expect(t).toHaveAttribute('aria-pressed', 'false')

    await user.click(t)
    expect(toggle()).toHaveAttribute('aria-label', 'Hide password')
    expect(toggle()).toHaveAttribute('aria-pressed', 'true')
  })

  it('does not submit the form', async () => {
    const user = userEvent.setup()
    render(<App />)

    // type="button", not the default type="submit". Tapping it with a wrong
    // password in the field must not run the check — no error, still on the
    // gate, nothing written to sessionStorage.
    expect(toggle()).toHaveAttribute('type', 'button')

    await user.type(field(), 'definitely-not-it')
    await user.click(toggle())

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('Enter demo password')).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('leaves the caret in the field', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(field())
    expect(document.activeElement).toBe(field())

    await user.click(toggle())
    // The toggle prevents its own mousedown so a tap mid-typing does not
    // steal focus out of the field.
    expect(document.activeElement).toBe(field())
  })

  it('keeps the field labelled while it is revealed', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(toggle())
    // type="text" drops the implicit "password field" semantics, so the
    // visually-hidden <label> is the only thing naming it.
    expect(screen.getByLabelText('Password')).toBe(field())
  })
})

describe('the gate behaviour the restyle had to preserve', () => {
  it('disables Continue until something is typed', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(submitButton()).toBeDisabled()
    await user.type(field(), 'x')
    expect(submitButton()).toBeEnabled()
  })

  it('shows the error on a wrong password and clears it on the next keystroke', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(field(), 'wrong')
    await user.click(submitButton())

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Incorrect password.')
    // The field points at the message, which is what makes a screen reader
    // read it when focus is still in the input.
    expect(field()).toHaveAttribute('aria-describedby', alert.id)
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()

    await user.type(field(), 'x')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('lets the right password through and marks the session', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(field(), PASSWORD)
    await user.click(submitButton())

    expect(sessionStorage.getItem(SESSION_KEY)).toBe('1')
    expect(screen.queryByText('Enter demo password')).toBeNull()
  })

  it('still accepts Enter from the field', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Used to be an onKeyDown handler; it is now the <form>'s implicit
    // submission, which only works while Continue is a real type="submit".
    expect(submitButton()).toHaveAttribute('type', 'submit')
    await user.type(field(), `${PASSWORD}{Enter}`)

    expect(sessionStorage.getItem(SESSION_KEY)).toBe('1')
  })

  it('is skipped entirely when the session flag is already set', () => {
    sessionStorage.setItem(SESSION_KEY, '1')
    render(<App />)
    expect(screen.queryByText('Enter demo password')).toBeNull()
  })
})

describe('the shell contract', () => {
  it('declares no viewport height and exactly one scroll body', () => {
    const { container } = render(<App />)
    const gate = within(container).getByText('Enter demo password').closest('.font-sans')

    expect(gate.className).not.toMatch(/\b(min-h-screen|h-screen)\b/)
    expect(gate.className).toMatch(/\bflex-1\b/)
    expect(gate.className).toMatch(/\bmin-h-0\b/)

    const scrollers = [...gate.querySelectorAll('[class*="overflow-y-auto"]')]
    expect(scrollers).toHaveLength(1)
    // min-height:0 is not optional — without it the body refuses to shrink
    // below its content and the scroll never engages.
    expect(scrollers[0].className).toMatch(/\bmin-h-0\b/)
    expect(scrollers[0].className).toMatch(/\bflex-1\b/)
  })

  it('centres with auto margins, not a centred flex line', () => {
    // justify-center clips its own overflow at the top; `m-auto` collapses
    // instead. That is the software-keyboard case — the viewport halves and
    // the wordmark must stay reachable rather than being cut off.
    const { container } = render(<App />)
    const scroller = container.querySelector('[class*="overflow-y-auto"]')
    expect(scroller.className).not.toMatch(/\bjustify-center\b/)
    expect(scroller.firstElementChild.className).toMatch(/\bm-auto\b/)
  })

  it('adds nothing that portals out of the phone frame', () => {
    // Radix Select/DropdownMenu/Sheet portal to document.body and escape
    // Phone.jsx's 393x852 overflow-hidden box. Everything this screen renders
    // must live inside the render container.
    const { container } = render(<App />)
    const stray = [...document.body.children].filter((el) => el !== container)
    expect(stray).toHaveLength(0)
  })
})
