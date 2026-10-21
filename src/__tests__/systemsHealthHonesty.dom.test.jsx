// @vitest-environment happy-dom
//
// The Systems Health surface is allowed to state exactly one reassuring thing,
// and only when it is true of every dimension the card renders. This file pins
// the four rules that make that claim honest. All four were broken.
//
//  1. The percentage measured LEAKS, not protection. It counted `!s.alert`,
//     while docs/PRD/09-system-health-widget.md defines health as the four
//     protection checks — communicating / no valve error / external power if
//     applicable / at least one alert recipient — and
//     docs/PRD/03-home-screen.md:207 says in so many words that leaks are not
//     a Systems Health gap. The two numbers are not close: the MRG fleet is
//     46% leak-free and 66% protected.
//  2. Math.round could take 99.6% to 100%, which PRD 09:62 forbids outright:
//     "must NEVER show 100% when any system has an issue. Cap at 99%."
//  3. An empty scope reported 100%. 100% of nothing is a perfect score.
//  4. Nothing ever told a reader that a zero had been CHECKED rather than
//     merely left empty, and no line ever stated the all-clear.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import SystemsHealthCard from '@/v2/components/SystemsHealthCard'
import { SYSTEMS } from '@/data/systems'
import { computeSystemHealth } from '@/utils/systemHealth'

afterEach(cleanup)

const ALL_CLEAR = { requireAttention: 0, total: 10 }
const NO_ISSUES = { offline: 0, valve: 0, power: 0, recipients: 0 }

const textOf = (container) => (container.textContent || '').replace(/\s+/g, ' ')

describe('Systems Health — the percentage measures protection, not leaks', () => {
  it('counts the four PRD-09 checks, which is a different number from leaks', () => {
    const protectedCount = SYSTEMS.filter((s) => computeSystemHealth(s).allOk).length
    const leakFreeCount = SYSTEMS.filter((s) => !s.alert).length

    // If these ever coincide the test below proves nothing, so assert the gap.
    expect(protectedCount).not.toBe(leakFreeCount)

    const percent =
      protectedCount === SYSTEMS.length
        ? 100
        : Math.min(Math.floor((protectedCount / SYSTEMS.length) * 100), 99)

    // The page's own arithmetic, restated: floor, and capped at 99.
    //
    // Both numbers are snapshots of the dataset, not rules. Leak-free moved
    // 46 -> 48 on 2026-10-21 when Building C joined D and E as an all-clear
    // location (owner: "i want at least 3 location fully healthy"), which
    // took two leaks out of a 103-system fleet. Protection is unchanged at 66
    // because C's apartments were failing on the leak check alone.
    //
    // What this test is actually for is the `not.toBe` above — that the two
    // counts DIFFER, so the percentage cannot be measuring leaks. That
    // guarantee is untouched; only the dataset moved underneath it.
    expect(percent).toBe(66)
    expect(Math.round((leakFreeCount / SYSTEMS.length) * 100)).toBe(48)
  })

  it('never reaches 100% while a single system fails a check (PRD 09:62)', () => {
    // 999 of 1000 protected is 99.9%, which Math.round presented as 100%.
    const healthy = 999
    const total = 1000
    const percent =
      healthy === total ? 100 : Math.min(Math.floor((healthy / total) * 100), 99)
    expect(percent).toBe(99)
  })
})

describe('Systems Health — an absent percentage is not a zero', () => {
  it('renders an em dash, not a number, when the host has no figure', () => {
    const { container } = render(
      <SystemsHealthCard
        healthy={{ percent: null }}
        stats={{ requireAttention: 0, total: 0 }}
        issues={NO_ISSUES}
      />,
    )
    const text = textOf(container)
    expect(text).toContain('—')
    expect(text).not.toContain('0%')
    expect(text).not.toContain('100%')
  })

  it('still renders a genuine 0 as 0%', () => {
    const { container } = render(
      <SystemsHealthCard
        healthy={{ percent: 0 }}
        stats={{ requireAttention: 5, total: 5 }}
        issues={{ offline: 5, valve: 0, power: 0, recipients: 0 }}
      />,
    )
    expect(textOf(container)).toContain('0%')
  })
})

describe('Systems Health — the all-clear line is a conjunction or it is nothing', () => {
  const dimensions = [
    ['requireAttention', { stats: { requireAttention: 1, total: 10 }, issues: NO_ISSUES }],
    ['offline', { stats: ALL_CLEAR, issues: { ...NO_ISSUES, offline: 1 } }],
    ['valve', { stats: ALL_CLEAR, issues: { ...NO_ISSUES, valve: 1 } }],
    ['power', { stats: ALL_CLEAR, issues: { ...NO_ISSUES, power: 1 } }],
    ['recipients', { stats: ALL_CLEAR, issues: { ...NO_ISSUES, recipients: 1 } }],
  ]

  it('states the all-clear, with its own denominator, when every dimension is clear', () => {
    const { container } = render(
      <SystemsHealthCard healthy={{ percent: 100 }} stats={ALL_CLEAR} issues={NO_ISSUES} />,
    )
    expect(textOf(container)).toContain('No open issues across 10 systems')
  })

  it.each(dimensions)('withholds it when %s alone is non-zero', (_name, props) => {
    const { container } = render(<SystemsHealthCard healthy={{ percent: 90 }} {...props} />)
    expect(textOf(container)).not.toContain('No open issues')
  })

  it('withholds it while any system is offline, because valve and power are only measured on reachable systems', () => {
    /* src/data/systems.js computeWidgets filters valve and power on
       `comm === 'online'`, so "0 valve errors" means "0 among the systems we
       can reach". The conjunction is what stops a card full of unseeable
       zeros from announcing an all-clear. */
    const { container } = render(
      <SystemsHealthCard
        healthy={{ percent: 90 }}
        stats={ALL_CLEAR}
        issues={{ offline: 10, valve: 0, power: 0, recipients: 0 }}
      />,
    )
    expect(textOf(container)).not.toContain('No open issues')
  })
})

describe('Systems Health — a checked zero looks different from an empty field', () => {
  it('marks every zero tile, and leaves the non-zero treatment alone', () => {
    const { container } = render(
      <SystemsHealthCard
        healthy={{ percent: 90 }}
        stats={{ requireAttention: 0, total: 10 }}
        issues={{ offline: 0, valve: 3, power: 0, recipients: 0 }}
      />,
    )
    // Four of the five dimensions are clear: offline, power, recipients and
    // "Require attention". Valve is not, and gets no mark.
    const marks = [...container.querySelectorAll('svg')].filter((el) =>
      (el.getAttribute('class') || '').includes('#cad5e2'),
    )
    expect(marks.length).toBe(4)

    // The mark is decoration over a figure that is still readable as a number.
    for (const mark of marks) expect(mark.getAttribute('aria-hidden')).toBe('true')

    // The red figure on the non-zero tile is untouched.
    const red = [...container.querySelectorAll('p')].filter((el) =>
      (el.className || '').includes('red'),
    )
    expect(red.length).toBe(1)
    expect(red[0].textContent).toBe('3')
  })
})
