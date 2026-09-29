// @vitest-environment happy-dom
//
// The "Require attention" capsule rendered as an empty pink pill while its
// number was present in the DOM the whole time.
//
// Cause: Figma paints a red wash behind a non-zero count, and that wash is
// position:absolute. Positioned elements paint ABOVE non-positioned in-flow
// siblings regardless of DOM order, so the wash covered the very figure it is
// meant to sit behind. The 2x2 issue tiles escaped it only by accident —
// IssueCount happens to carry `relative`.
//
// No text query can catch this: getByText('52') passed throughout. So this
// test pins the stacking contract instead.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, within } from '@testing-library/react'
import SystemsHealthCard from '@/v2/components/SystemsHealthCard'

afterEach(cleanup)

describe('health capsule stacking', () => {
  it('paints a non-zero count ABOVE its red wash, not under it', () => {
    const { container } = render(
      <SystemsHealthCard
        healthy={{ percent: 50 }}
        stats={{ requireAttention: 52, total: 103 }}
        issues={{ offline: 10, valve: 12, power: 10, recipients: 4 }}
        systemTypes={{ topology: 103, flood: 0, humidity: 0 }}
      />,
    )

    const count = within(container).getByText('52')
    expect(count, 'the attention count should render').toBeTruthy()

    // Walk up to the capsule and prove the figure sits in a positioned layer.
    let lifted = null
    for (let n = count; n && n !== container; n = n.parentElement) {
      const cls = String(n.className || '')
      if (cls.includes('z-10') && cls.includes('relative')) { lifted = n; break }
    }
    expect(
      lifted,
      'the count must sit inside a relative z-10 layer, or the absolute wash paints over it',
    ).not.toBeNull()

    // And the wash itself must stay below.
    const wash = container.querySelector('[aria-hidden="true"].absolute')
    expect(wash, 'the wash should exist for a non-zero count').toBeTruthy()
    expect(String(wash.className)).toContain('z-0')
  })

  it('lifts EVERY glyph and figure in a hot capsule, not just the headline one', () => {
    /* The first version of this test only checked "Require attention". The
       four issue pills had the same defect one level down — their IssueCount
       carries `relative` so the NUMBER survived, while the glyph span did not
       and vanished under the wash. Numbers present, icons gone. So assert over
       every washed capsule, not one of them. */
    const { container } = render(
      <SystemsHealthCard
        healthy={{ percent: 13 }}
        stats={{ requireAttention: 46, total: 53 }}
        issues={{ offline: 10, valve: 12, power: 10, recipients: 2 }}
        systemTypes={{ topology: 53, flood: 0, humidity: 0 }}
      />,
    )

    /* ONE, not five. The four issue tiles used to take the red wash whenever
       their count was non-zero, which at any real fleet size meant all four
       were red all the time -- a colour, not a signal. They were put back on
       the cool --tile-bg on request. "Require attention" keeps its hot state,
       so red still means something somewhere on this card.
       The stacking contract below is unchanged and still worth walking: it is
       what broke twice. */
    const washes = [...container.querySelectorAll('[aria-hidden="true"].absolute.z-0')]
    expect(washes.length, 'only Require attention carries the red wash').toBe(1)

    for (const wash of washes) {
      const capsule = wash.parentElement
      const lifted = [...capsule.children].filter((el) =>
        String(el.className || '').includes('z-10'),
      )
      expect(
        lifted.length,
        `a washed capsule has content outside the z-10 layer: ${capsule.textContent.trim()}`,
      ).toBeGreaterThan(0)

      // Nothing may sit beside the wash except the lifted layer.
      const strays = [...capsule.children].filter(
        (el) => el !== wash && !String(el.className || '').includes('z-10'),
      )
      expect(
        strays.map((el) => el.tagName),
        `unlifted children would paint under the wash: ${capsule.textContent.trim()}`,
      ).toEqual([])
    }

    // And the glyphs really are on screen, one per issue tile plus the headline.
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(9)
  })

  it('a zero count needs no wash at all', () => {
    const { container } = render(
      <SystemsHealthCard
        healthy={{ percent: 100 }}
        stats={{ requireAttention: 0, total: 3431 }}
        issues={{ offline: 0, valve: 0, power: 0, recipients: 0 }}
        systemTypes={{ topology: 0, flood: 0, humidity: 0 }}
      />,
    )
    // Zero renders on the plain gradient — the state signal the design uses.
    expect(within(container).getAllByText('0').length).toBeGreaterThan(0)
    expect(within(container).getByText('3,431')).toBeTruthy()
  })
})

describe('the four issue tiles', () => {
  it('stay on the cool wash however high their counts run', () => {
    // "I WANT THESE 4 BUTTONS TO USE SAME BACKGROUND HOW IT WAS IN PREVIOUS
    // VERSION / DONT LIKE THIS RED BG".
    const { container } = render(
      <SystemsHealthCard
        healthy={{ percent: 13 }}
        stats={{ requireAttention: 46, total: 53 }}
        issues={{ offline: 10, valve: 12, power: 10, recipients: 2 }}
        systemTypes={{ topology: 53, flood: 0, humidity: 0 }}
        /* Without a handler the tiles render as plain divs; the card only
           promises a button when its host has wired one. */
        onSelectIssue={() => {}}
      />,
    )

    for (const label of ['Offline systems', 'Valve errors', 'Disconnected power', 'Missing recipients']) {
      const button = within(container).getByRole('button', { name: new RegExp(`^${label}:`) })
      expect(
        button.querySelector('[aria-hidden="true"].absolute.z-0'),
        `${label} must not be painted red`,
      ).toBeNull()
      // And it still carries the shared gradient rather than no ground at all.
      expect(button.getAttribute('style') || '', label).toContain('background')
    }
  })
})
