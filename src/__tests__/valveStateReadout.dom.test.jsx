// @vitest-environment happy-dom
//
// ValveStateReadout — the shared status atom.
//
// THE THREE THINGS THIS FILE EXISTS TO PIN, in order of how much damage their
// loss does:
//
//  1. ONE COLOUR CUE PER STATE. The atom replaces a swatch-plus-glyph pair
//     that painted the SAME state in TWO DIFFERENT COLOURS (open: #5c9e1a
//     swatch beside a #0B82F8 glyph; the blue glyph for OPEN was the swatch
//     blue for CLOSED). Worse, the error glyph was #FB2C36, the exact hex
//     `index.css:376-381` rejected as the valve error colour because it is
//     delta-E 2.3 from the open green under deuteranopia. So: exactly one
//     mark, and no `ValveStatus` svg anywhere in the output.
//
//  2. THE WORD IS ALWAYS THERE. `index.css:358-367` makes the palette legal
//     ONLY WITH SECONDARY ENCODING, and the label is now the whole of it
//     (WCAG 1.4.1). There is no prop that removes it; these cases prove it for
//     all four categories and all three certainties.
//
//  3. CONNECTIVITY NEVER BECOMES A SECOND COLOUR. An offline system changes
//     the WORD to "Last known: X" and changes NOTHING about the chip. The
//     dimming and the "Offline · last seen …" line belong to the row.
//
// Fixtures are inline and `SYSTEMS` is deliberately not imported, for the
// reason `valveScope.test.js` gives: the demo tree is regenerated whenever
// upstream data changes.
//
// NO APPEARANCE CLAIMS. happy-dom has no layout engine and no cascade, so
// nothing below asserts a rendered colour or a size in pixels — only which
// token utility is on the chip and what text is in the tree.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'

import { ValveStateReadout, ValveSwatch } from '@/v2/components/ValveStateReadout'
import { VALVE_CATEGORIES } from '@/v2/components/valveScope'

afterEach(() => {
  cleanup()
})

/** The shape `buildTree.js:528-552` produces, trimmed to what the atom reads. */
function sys(valve, { comm = 'online' } = {}) {
  return { id: 's1', name: 'System s1', valve, comm, offline: comm === 'offline' }
}

const readout = () => document.querySelector('[data-slot="valve-state"]')
const chips = () => document.querySelectorAll('[data-slot="valve-swatch"]')

describe('ValveStateReadout — one colour cue', () => {
  it('renders exactly ONE mark per state, and no ValveStatus glyph', () => {
    for (const { key } of VALVE_CATEGORIES) {
      render(<ValveStateReadout categoryKey={key} />)
      expect(chips().length).toBe(1)
      // ValveStatus is an <svg>; the atom emits none at all.
      expect(document.querySelectorAll('svg').length).toBe(0)
      cleanup()
    }
  })

  it('takes its fill from the --valve-* token utilities only', () => {
    render(<ValveStateReadout categoryKey="open" />)
    expect(chips()[0].getAttribute('class')).toContain('bg-valve-open')
    cleanup()
    render(<ValveStateReadout categoryKey="closed" />)
    expect(chips()[0].getAttribute('class')).toContain('bg-valve-closed')
    cleanup()
    render(<ValveStateReadout categoryKey="error" />)
    expect(chips()[0].getAttribute('class')).toContain('bg-valve-error')
  })

  it('draws `none` HOLLOW — absent hardware is not a fourth state colour', () => {
    render(<ValveStateReadout categoryKey="none" />)
    const cls = chips()[0].getAttribute('class')
    expect(cls).toContain('bg-transparent')
    expect(cls).toContain('border-border')
    expect(cls).not.toContain('bg-valve-')
  })

  it('hides the chip from assistive tech — the word already says it', () => {
    render(<ValveStateReadout categoryKey="open" />)
    expect(chips()[0]).toHaveAttribute('aria-hidden', 'true')
  })

  it('never paints the WORD in a valve hue (--valve-open is 3.3:1 as ink)', () => {
    render(<ValveStateReadout categoryKey="open" />)
    expect(readout().getAttribute('class')).not.toMatch(/text-valve-/)
  })
})

describe('ValveStateReadout — the word is never optional', () => {
  it("uses VALVE_CATEGORIES' own vocabulary, verbatim, for every category", () => {
    for (const { key, label } of VALVE_CATEGORIES) {
      render(<ValveStateReadout categoryKey={key} />)
      expect(screen.getByText(label)).toBeTruthy()
      cleanup()
    }
  })

  it('still carries a word in every certainty', () => {
    for (const certainty of ['live', 'last-known', 'not-applicable']) {
      render(<ValveStateReadout categoryKey="open" certainty={certainty} />)
      expect(readout().textContent.trim().length).toBeGreaterThan(0)
      cleanup()
    }
  })
})

describe('ValveStateReadout — the two dimensions stay unmerged', () => {
  it('an OFFLINE system reads "Last known: Open", not "Open"', () => {
    render(<ValveStateReadout system={sys('open', { comm: 'offline' })} />)
    expect(screen.getByText('Last known: Open')).toBeTruthy()
    expect(screen.queryByText('Open')).toBeNull()
    expect(readout()).toHaveAttribute('data-certainty', 'last-known')
  })

  it('and its CHIP is byte-identical to the online one — no second colour', () => {
    render(<ValveStateReadout system={sys('open')} />)
    const online = chips()[0].getAttribute('class')
    cleanup()
    render(<ValveStateReadout system={sys('open', { comm: 'offline' })} />)
    expect(chips()[0].getAttribute('class')).toBe(online)
    // and still exactly one mark: no offline dot got added beside it.
    expect(chips().length).toBe(1)
  })

  it('emits no opacity of its own — the ROW owns the dimming', () => {
    render(<ValveStateReadout system={sys('open', { comm: 'offline' })} />)
    expect(readout().getAttribute('class')).not.toMatch(/opacity-/)
  })

  it('an offline system with NO VALVE is not-applicable, not last-known', () => {
    render(<ValveStateReadout system={sys(null, { comm: 'offline' })} />)
    expect(readout()).toHaveAttribute('data-certainty', 'not-applicable')
    expect(screen.getByText('No valve installed')).toBeTruthy()
    expect(readout().textContent).not.toMatch(/Last known/)
  })

  it("counts 'closing' as closed, exactly as valveScope does", () => {
    render(<ValveStateReadout system={sys('closing')} />)
    expect(readout()).toHaveAttribute('data-state', 'closed')
  })
})

describe('ValveStateReadout — API', () => {
  it('derives everything from a system when given one', () => {
    render(<ValveStateReadout system={sys('error')} />)
    expect(readout()).toHaveAttribute('data-state', 'error')
    expect(readout()).toHaveAttribute('data-certainty', 'live')
    expect(screen.getByText('Valve Error')).toBeTruthy()
  })

  it('lets an explicit categoryKey and certainty override the system', () => {
    render(
      <ValveStateReadout
        system={sys('open')}
        categoryKey="closed"
        certainty="last-known"
      />,
    )
    expect(readout()).toHaveAttribute('data-state', 'closed')
    expect(screen.getByText('Last known: Closed')).toBeTruthy()
  })

  it('defaults certainty to live when there is no system', () => {
    render(<ValveStateReadout categoryKey="closed" />)
    expect(readout()).toHaveAttribute('data-certainty', 'live')
  })

  it('merges className and spreads the rest onto the wrapper', () => {
    render(<ValveStateReadout categoryKey="open" className="text-xs" data-name="x" />)
    expect(readout().getAttribute('class')).toContain('text-xs')
    expect(readout()).toHaveAttribute('data-name', 'x')
  })

  it('falls back to `none` for an unknown key rather than throwing', () => {
    render(<ValveStateReadout categoryKey="banana" />)
    expect(readout()).toHaveAttribute('data-state', 'none')
    expect(screen.getByText('No valve installed')).toBeTruthy()
  })

  it('renders with no props at all — a 103-row list must not die on a bad row', () => {
    render(<ValveStateReadout />)
    expect(readout()).toHaveAttribute('data-state', 'none')
  })
})

describe('ValveSwatch — one chip, one size', () => {
  it('is 10px for every category, folding the 10px and 8px copies into one', () => {
    for (const { key } of VALVE_CATEGORIES) {
      render(<ValveSwatch categoryKey={key} />)
      expect(chips()[0].getAttribute('class')).toContain('size-[10px]')
      cleanup()
    }
  })

  it('is the same chip the readout uses', () => {
    render(<ValveSwatch categoryKey="closed" />)
    const alone = chips()[0].getAttribute('class')
    cleanup()
    render(<ValveStateReadout categoryKey="closed" />)
    expect(chips()[0].getAttribute('class')).toBe(alone)
  })
})
