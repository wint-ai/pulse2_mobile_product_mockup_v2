// @vitest-environment happy-dom
/**
 * The Home / Away control, against PRD 04e (sandbox repo,
 * docs/PRD/04e-home-away.md, locked 2026-06-08 round 6).
 *
 * Two things were wrong and both are the same kind of wrong — a control that
 * looks finished and is not:
 *   · the two modes were text only, where the PRD differentiates them BY ICON
 *     precisely because it forbids differentiating them by colour;
 *   · "Learn more" called `onLearnMore`, which no caller passed, so the button
 *     rendered and focused and did nothing.
 *
 * The copy here is quoted from the PRD rather than paraphrased. If someone
 * rewrites it in the component these fail, which is the point: it is locked
 * product copy, not a placeholder.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import ActivePolicyCard from '@/v2/components/ActivePolicyCard'

afterEach(cleanup)

const HOME_COPY =
  "Water consumption is expected, like a normal day. If a water event is detected, you'll be alerted but the valve will stay open."
const AWAY_COPY =
  "No water consumption is expected while you're away. If a water event is detected, you'll be alerted and the valve will be closed automatically."

const radios = () => screen.getAllByRole('radio')

/* WHAT SELECTS THE CONTROL CHANGED ON 2026-10-26, and it is worth knowing
   why, because it is a product rule and not a refactor.

   It used to be `tone="alert"`: the card had an alert branch that drew
   Home/Away and a calm branch that drew the policy list, so this control
   appeared on an alerting system and nowhere else. That was never the
   intent — it is a standing policy, not an incident control.

   The redraw against 199539:181835 collapsed the two branches into one card,
   and the owner set the real rule in its place: "Home away is a simple policy
   for apartmants, depends per systms, make it for ressidential onlt."

   So the gate is now RESIDENTIAL, and it is spelled as the presence of
   `onModeChange` — a card with nowhere to send the change does not draw the
   control. SystemPageV2Screen passes it only when the system's division
   (l2Name) is Residential. Every render below therefore passes a handler:
   without one there is no control to test, which is the commercial case and
   is asserted on its own at the bottom of this file. */

describe('Home / Away carries an icon per mode', () => {
  it('draws a glyph on each side, not text alone', () => {
    render(<ActivePolicyCard onModeChange={() => {}} mode="home" />)
    for (const r of radios()) expect(r.querySelectorAll('svg').length).toBeGreaterThan(0)
  })

  it('gives the two modes DIFFERENT glyphs', () => {
    // PRD: Home = `home`, Away = `flight_takeoff`. H7 records that Away was
    // `luggage` in the first draft and was changed — so the plane is a
    // decision, not a default.
    const { container } = render(<ActivePolicyCard onModeChange={() => {}} mode="home" />)
    const [home, away] = [...container.querySelectorAll('[role="radio"]')]
    expect(home.querySelector('svg').innerHTML).not.toBe(away.querySelector('svg').innerHTML)
  })

  it('does not split the two modes by colour', () => {
    /* PRD: "Both Home and Away are equally valid life states… No green for
       Home… No blue for Away… No semantic-color split between the two modes."
       Selection may be coloured; the MODE may not. So whichever side is
       selected must take the same classes. */
    const { container: a } = render(<ActivePolicyCard onModeChange={() => {}} mode="home" />)
    const homeSelected = [...a.querySelectorAll('[role="radio"]')].find(r => r.getAttribute('aria-checked') === 'true')
    const homeClass = homeSelected.className
    cleanup()
    const { container: b } = render(<ActivePolicyCard onModeChange={() => {}} mode="away" />)
    const awaySelected = [...b.querySelectorAll('[role="radio"]')].find(r => r.getAttribute('aria-checked') === 'true')
    expect(awaySelected.className).toBe(homeClass)
  })
})

describe('Learn more is a real control', () => {
  it('opens, and says what the CURRENT mode means', () => {
    render(<ActivePolicyCard onModeChange={() => {}} mode="home" />)
    const btn = screen.getByRole('button', { name: /Learn more/ })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(HOME_COPY)).toBeTruthy()
  })

  it('follows the mode — Away gets Away\'s copy', () => {
    render(<ActivePolicyCard onModeChange={() => {}} mode="away" />)
    fireEvent.click(screen.getByRole('button', { name: /Learn more/ }))
    expect(screen.getByText(AWAY_COPY)).toBeTruthy()
  })

  it('closes again', () => {
    render(<ActivePolicyCard onModeChange={() => {}} mode="home" />)
    const btn = screen.getByRole('button', { name: /Learn more/ })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(HOME_COPY)).toBeNull()
  })

  it('a caller that wants its own sheet still gets the callback', () => {
    // PRD 04e eventually wants a confirmation sheet; `onLearnMore` is the
    // override, and when it is passed the card must NOT also expand inline.
    let called = 0
    render(<ActivePolicyCard onModeChange={() => {}} mode="home" onLearnMore={() => { called += 1 }} />)
    const btn = screen.getByRole('button', { name: /Learn more/ })
    fireEvent.click(btn)
    expect(called).toBe(1)
    expect(screen.queryByText(HOME_COPY)).toBeNull()
    expect(btn).not.toHaveAttribute('aria-expanded')
  })
})

describe('the residential gate', () => {
  it('draws no Home/Away on a system that cannot have one', () => {
    /* The commercial case. A card with no `onModeChange` has nowhere to send
       the change, so it draws the frame's card and stops — nothing stubbed,
       nothing disabled, no radio that silently does nothing. This is the half
       of the owner's rule that is invisible on screen, so it is the half most
       likely to be undone by a later edit that "restores" the control.

       Asserted through the ROLE rather than a class, because that is what a
       keyboard or screen-reader user would find. */
    render(<ActivePolicyCard mode="home" />)
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(screen.queryByRole('button', { name: /Learn more/ })).toBeNull()
    expect(screen.queryByText(HOME_COPY)).toBeNull()
  })

  it('still draws the rest of the card without it', () => {
    /* The gate must hide the control, not the card. */
    render(<ActivePolicyCard mode="home" />)
    expect(screen.getByText('Active policy')).toBeTruthy()
    expect(screen.getByText('Alerts')).toBeTruthy()
  })
})
