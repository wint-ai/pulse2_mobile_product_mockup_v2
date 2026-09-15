import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ActiveWaterEventsCard from '@/v2/components/ActiveWaterEventsCard'

const EVENTS = [
  { id: 'a', systemName: 'Fire Riser 2', location: 'San Fransisco', address: '1775 Washington St, Hanover MA 2339', type: 'leak-high', detectedAt: 'Apr 02, 2026 08:13:15', duration: '6h 36m' },
  { id: 'b', systemName: '360 Magnolia Row', location: 'Los Angeles', address: '333 Main Street, Tewksbury MA 1876', type: 'leak-high', detectedAt: 'Apr 02, 2026 08:13:15', duration: '6h 36m' },
  { id: 'c', systemName: '751 Poplar Court', location: 'Los Angeles', address: '700 Oak Street, Brockton MA 2301', type: 'leak-high', detectedAt: 'Apr 02, 2026 08:13:15', duration: '6h 36m' },
  { id: 'd', systemName: '751 Poplar Court', location: 'Los Angeles', address: '700 Oak Street, Brockton MA 2301', type: 'leak-low', detectedAt: 'Apr 02, 2026 08:13:15', duration: '6h 36m' },
  { id: 'e', systemName: 'An Extremely Long System Name That Must Never Widen The Row', location: 'Los Angeles', address: '700 Oak Street, Brockton MA 2301', type: 'leak-high', detectedAt: 'Apr 02, 2026 08:13:15', duration: '6h 36m' },
  { id: 'f', systemName: '751 Poplar Court', location: 'Los Angeles', address: '700 Oak Street, Brockton MA 2301', type: 'leak-low', detectedAt: 'Apr 02, 2026 08:13:15', duration: '6h 36m' },
  { id: 'g', systemName: '751 Poplar Court', location: 'Los Angeles', address: '700 Oak Street, Brockton MA 2301', type: 'leak-high', detectedAt: 'Apr 02, 2026 08:13:15', duration: '6h 36m' },
]

function Probe() {
  React.useEffect(() => {
    const t = setTimeout(() => {
      const shell = document.getElementById('shell')
      const card = shell.firstElementChild
      const healthyShell = document.getElementById('shell2')
      const healthy = healthyShell.firstElementChild
      const report = {
        viewport: window.innerWidth,
        docScrollW: document.documentElement.scrollWidth,
        bodyScrollW: document.body.scrollWidth,
        cardClientW: card.clientWidth,
        cardScrollW: card.scrollWidth,
        cardClientH: card.clientHeight,
        cardScrollH: card.scrollHeight,
        rowCount: card.querySelectorAll('p').length,
        healthyClientH: healthy.clientHeight,
        healthyScrollH: healthy.scrollHeight,
        healthyScrollW: healthy.scrollWidth,
        healthyClientW: healthy.clientWidth,
        overflowing: [],
      }
      card.querySelectorAll('*').forEach((el) => {
        if (el.scrollWidth - el.clientWidth > 1 && getComputedStyle(el).textOverflow !== 'ellipsis') {
          report.overflowing.push(el.className + ' | ' + el.scrollWidth + '>' + el.clientWidth)
        }
        if (el.scrollHeight - el.clientHeight > 1) {
          report.overflowing.push('VERT ' + el.className + ' | ' + el.scrollHeight + '>' + el.clientHeight)
        }
      })
      const pre = document.getElementById('probe')
      pre.textContent = JSON.stringify(report, null, 1)
      window.__REPORT__ = report
    }, 800)
    return () => clearTimeout(t)
  }, [])
  return null
}

createRoot(document.getElementById('root')).render(
  <>
    <div id="shell" style={{ width: 375, padding: 8, boxSizing: 'border-box' }}>
      <ActiveWaterEventsCard events={EVENTS} />
    </div>
    <div id="shell2" style={{ width: 375, padding: 8, boxSizing: 'border-box' }}>
      <ActiveWaterEventsCard events={[]} />
    </div>
    <pre id="probe" style={{ font: '11px monospace', whiteSpace: 'pre-wrap', width: 375, background: '#fff' }} />
    <Probe />
  </>
)
