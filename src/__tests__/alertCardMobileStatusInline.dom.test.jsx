// @vitest-environment happy-dom
/**
 * AlertCard `mobile` — the two places this card deliberately leaves the frame.
 *
 * The card is traced from Figma 199961:97452 ("Alert card", 370x126, inside
 * System page_mobile 199961:97439). Every measurement in that frame is honoured
 * EXCEPT the status pill's position, which the owner ruled on twice in one day:
 *
 *   1. "update the event card everywhere — but not as in Figma, keep the state
 *      on top like now."  -> the frame's bottom-right pill slot (199961:97468,
 *      a 67x24 Button right of the duration) is NOT drawn, and that row simply
 *      ends after the duration.
 *   2. "the Ongoing on the new structure needs to be on the right side. On the
 *      same line with the High Flow event. Doesn't need to take more space for
 *      that."  -> the pill is NOT on a row of its own either (where it had been
 *      since 199383:142348). It sits at the right end of the TITLE row.
 *
 * NO NODE DRAWS WHAT THIS FILE PINS. A diff against 199961:97452 shows both as
 * deviations, which is exactly why they are asserted here: a later pass
 * re-importing that frame would "fix" them back and nothing else would notice.
 * The height assertion is the owner's own test — he asked for the pill to cost
 * no extra space, and a row costs 41px (a 24px pill plus the group's 17px gap).
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import AlertCard from '@/v2/components/AlertCard'

const pOf = (c, text) => [...c.querySelectorAll('p')].find((p) => p.textContent === text)
const spanOf = (c, text) => [...c.querySelectorAll('span')].find((s) => s.textContent === text)

/** Walk up to the ancestor whose class string contains `needle`. */
function upTo(el, needle) {
  let node = el
  while (node && !(node.className || '').includes(needle)) node = node.parentElement
  return node
}

describe('AlertCard `mobile` — the status pill sits on the title line', () => {
  it('puts the pill in the SAME row as the title, not a row above it', () => {
    const { container } = render(<AlertCard variant="mobile" actions={false} />)
    const title = pOf(container, 'High flow event')
    const pill = spanOf(container, 'Ongoing')
    expect(title).toBeTruthy()
    expect(pill).toBeTruthy()

    const group = upTo(pill, 'gap-[4px]')
    expect(group).toBeTruthy()
    const row = group.parentElement
    // One row holds both. If the pill ever gets a row of its own again, the
    // title stops being inside the pill's row and this fails.
    expect(row.contains(title)).toBe(true)
    expect(row.className).toContain('justify-between')
  })

  it('pins the pill to the top of a wrapped title rather than centring it', () => {
    // `self-start` against the row's inherited `items-center`: the title is a
    // fixed 170px measure and every real label on the System page
    // ("High/Low Flow Water Event") wraps to two lines, which makes the row
    // 75px rather than 61px tall. Centred, the pill drifts down beside the
    // SECOND line and reads as belonging to it.
    const { container } = render(<AlertCard variant="mobile" actions={false} />)
    const group = upTo(spanOf(container, 'Ongoing'), 'gap-[4px]')
    expect(group.className).toContain('self-start')
  })

  it('spends no row on the pill — the card is title row + meta row', () => {
    const { container } = render(<AlertCard variant="mobile" actions={false} />)
    const stack = pOf(container, 'Detected').parentElement.parentElement
    expect(stack.className).toContain('gap-[17px]')
    // Measured in the browser at 393x852: 179px -> 138px, in all four themes.
    expect(stack.children.length).toBe(2)
  })

  it('keeps the pager live, beside the pill rather than under it', () => {
    // MOCK_EVENT carries pageCount 2, so the default render draws it. It is
    // live functionality (onAction('paginate')) and lost its own row with the
    // pill; it must not have been dropped with it.
    const { container } = render(<AlertCard variant="mobile" actions={false} />)
    const pager = container.querySelector('button[aria-label^="Alert 1 of 2"]')
    expect(pager).toBeTruthy()
    expect(upTo(pager, 'gap-[4px]')).toBe(upTo(spanOf(container, 'Ongoing'), 'gap-[4px]'))
  })
})

describe('AlertCard `mobile` — what the frame DID change', () => {
  it('draws the chip figure in red/700, the duration colour, not red/500', () => {
    // 199961:97461. The only paint 199961:97452 changes on this card, and it
    // makes the three event figures in this file agree (the meta row's
    // duration and the overlay card's FIG_VALUE were already red/700).
    const { container } = render(<AlertCard variant="mobile" actions={false} />)
    const figure = pOf(container, '13,564')
    expect(figure.className).toContain('text-red-700')
    expect(figure.className).not.toContain('text-red-500')
  })

  it('reintroduces no two-argument var() fallback', () => {
    // The file header's standing rule: a `var(--token, #hex)` is a second,
    // invisible source of truth that wins whenever the token is missing. Every
    // fallback was deleted in Phase 3 of docs/TOKENIZATION-PLAN.md and a
    // re-import from Figma — whose emitted code is full of them — is exactly
    // how one comes back.
    const { container } = render(<AlertCard variant="mobile" />)
    expect(container.innerHTML).not.toMatch(/var\(\s*--[^);]*,/)
  })
})
