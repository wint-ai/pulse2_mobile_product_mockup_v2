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
