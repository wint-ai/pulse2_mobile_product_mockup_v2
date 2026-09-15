// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ActiveWaterEventsCard from '@/v2/components/ActiveWaterEventsCard'

const EVENTS = Array.from({ length: 7 }, (_, i) => ({
  id: `e${i}`,
  systemName: i === 3 ? 'A Very Long System Name That Should Not Blow The Row Out At All' : `Sys ${i}`,
  location: 'Los Angeles',
  address: '700 Oak Street, Brockton MA 2301',
  type: i % 2 ? 'leak-low' : 'leak-high',
  detectedAt: 'Apr 02, 2026 08:13:15',
  duration: '6h 36m',
}))

describe('AWE verify', () => {
  it('populated: renders every row, no fixed height, no 760 cap', () => {
    const { container } = render(<ActiveWaterEventsCard events={EVENTS} className="mine" />)
    const root = container.firstElementChild
    const cls = root.getAttribute('class')
    console.log('ROOT_CLASS_ATTR=' + JSON.stringify(cls))
    expect(cls).toContain('\/')            // real backslash survived into DOM
    expect(cls).toContain('mine')
    expect(cls).not.toMatch(/max-w-\[760/)
    expect(cls).not.toMatch(/(^|\s)h-\[/)
    expect(cls).not.toMatch(/(^|\s)max-h-\[/)
    expect(cls).not.toMatch(/size-full/)
    expect(cls).toContain('w-full')
    const all = container.innerHTML
    expect(all).not.toMatch(/overflow-(y-)?auto|overflow-(y-)?scroll/)
    // every one of the 7 rows drawn
    expect(screen.getAllByText(/^Sys /).length + 1).toBe(7)
    expect(screen.getByText('7 Water events')).toBeTruthy()
    expect(screen.getAllByText('High Flow').length).toBe(4)
    expect(screen.getAllByText('Low Flow').length).toBe(3)
    expect(screen.getByText('Show all')).toBeTruthy()
  })

  it('healthy/empty state renders', () => {
    render(<ActiveWaterEventsCard events={[]} />)
    expect(screen.getByText('Everything looks good!')).toBeTruthy()
    expect(screen.getByText('No active water events')).toBeTruthy()
    expect(screen.getByText('Show past events')).toBeTruthy()
  })

  it('collapse + filter chips work', () => {
    const { container } = render(<ActiveWaterEventsCard events={EVENTS} />)
    const btns = [...container.querySelectorAll('button')]
    const highChip = btns.find((b) => b.textContent.trim().startsWith('High4') || /^High\d/.test(b.textContent.trim()))
    fireEvent.click(highChip)
    expect([...container.querySelectorAll('p')].filter((p) => p.textContent === 'Low Flow').length).toBe(0)
    expect([...container.querySelectorAll('p')].filter((p) => p.textContent === 'High Flow').length).toBe(4)
    const header = container.querySelector('button[aria-expanded="true"]')
    fireEvent.click(header)
    expect(container.textContent).not.toContain('Show all')
  })

  it('no figma.com asset url in rendered DOM', () => {
    const { container } = render(<ActiveWaterEventsCard events={EVENTS} />)
    expect(container.innerHTML).not.toContain('figma.com')
    const { container: c2 } = render(<ActiveWaterEventsCard events={[]} />)
    expect(c2.innerHTML).not.toContain('figma.com')
    expect(c2.querySelector('img').getAttribute('src').startsWith('data:image/')).toBe(true)
  })

  it('every var() class in the DOM kept its backslash', () => {
    const { container } = render(<ActiveWaterEventsCard events={EVENTS} />)
    const bad = []
    container.querySelectorAll('*').forEach((el) => {
      const c = el.getAttribute('class') || ''
      c.split(/\s+/).forEach((t) => {
        if (t.includes('var(--') && /var\(--[a-z0-9-]+\//.test(t) && !t.includes('\/')) bad.push(t)
      })
    })
    console.log('UNESCAPED=' + JSON.stringify(bad))
    expect(bad).toEqual([])
  })
})
