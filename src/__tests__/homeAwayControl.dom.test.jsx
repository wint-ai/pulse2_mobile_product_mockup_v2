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

/* The Home/Away control belongs to the ALERT frame only — the calm frame
   draws the policy list in the same slot (see the branch at ActivePolicyCard
   :293 and the docblock above it). Every render here passes tone="alert"
   because without it there is no control to test, which is itself worth
   knowing: this surface appears on an alerting system and nowhere else. */

describe('Home / Away carries an icon per mode', () => {
  it('draws a glyph on each side, not text alone', () => {
    render(<ActivePolicyCard tone="alert" mode="home" />)
    for (const r of radios()) expect(r.querySelectorAll('svg').length).toBeGreaterThan(0)
  })

  it('gives the two modes DIFFERENT glyphs', () => {
    // PRD: Home = `home`, Away = `flight_takeoff`. H7 records that Away was
    // `luggage` in the first draft and was changed — so the plane is a
    // decision, not a default.
    const { container } = render(<ActivePolicyCard tone="alert" mode="home" />)
    const [home, away] = [...container.querySelectorAll('[role="radio"]')]
    expect(home.querySelector('svg').innerHTML).not.toBe(away.querySelector('svg').innerHTML)
  })

  it('does not split the two modes by colour', () => {
    /* PRD: "Both Home and Away are equally valid life states… No green for
       Home… No blue for Away… No semantic-color split between the two modes."
       Selection may be coloured; the MODE may not. So whichever side is
       selected must take the same classes. */
    const { container: a } = render(<ActivePolicyCard tone="alert" mode="home" />)
    const homeSelected = [...a.querySelectorAll('[role="radio"]')].find(r => r.getAttribute('aria-checked') === 'true')
    const homeClass = homeSelected.className
    cleanup()
    const { container: b } = render(<ActivePolicyCard tone="alert" mode="away" />)
    const awaySelected = [...b.querySelectorAll('[role="radio"]')].find(r => r.getAttribute('aria-checked') === 'true')
    expect(awaySelected.className).toBe(homeClass)
  })
})

describe('Learn more is a real control', () => {
  it('opens, and says what the CURRENT mode means', () => {
    render(<ActivePolicyCard tone="alert" mode="home" />)
    const btn = screen.getByRole('button', { name: /Learn more/ })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(HOME_COPY)).toBeTruthy()
  })

  it('follows the mode — Away gets Away\'s copy', () => {
    render(<ActivePolicyCard tone="alert" mode="away" />)
    fireEvent.click(screen.getByRole('button', { name: /Learn more/ }))
    expect(screen.getByText(AWAY_COPY)).toBeTruthy()
  })

  it('closes again', () => {
    render(<ActivePolicyCard tone="alert" mode="home" />)
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
    render(<ActivePolicyCard tone="alert" mode="home" onLearnMore={() => { called += 1 }} />)
    const btn = screen.getByRole('button', { name: /Learn more/ })
    fireEvent.click(btn)
    expect(called).toBe(1)
    expect(screen.queryByText(HOME_COPY)).toBeNull()
    expect(btn).not.toHaveAttribute('aria-expanded')
  })
})
