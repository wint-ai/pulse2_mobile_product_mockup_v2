/**
 * TAP PROBE, the read-out. A TEMPORARY DIAGNOSTIC - see tapProbeLog.js for
 * what it is for and exactly how to remove it.
 *
 * Renders nothing unless the URL carried ?debug=tap. `position: fixed` so it
 * never takes part in the card's layout, z-index above the event overlay so it
 * stays readable once one opens, and `pointer-events: none` end to end so it
 * cannot change what it is measuring. No controls, for the same reason.
 */
import { useEffect, useState } from 'react'
import {
  installTapProbe,
  subscribeTapProbe,
  tapDebugOn,
  tapProbe,
  tapProbeLines,
} from './tapProbeLog'

const SHELL = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  /* Above EventFocusOverlay (z-50 inside the frame) and above the tab bar, so
     the trace stays readable whatever opens. */
  zIndex: 2147483000,
  maxHeight: '44vh',
  overflow: 'hidden',
  pointerEvents: 'none',
  background: 'rgba(5,10,20,0.88)',
  color: '#d8f5e0',
  font: '10px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace',
  padding: '6px 8px calc(6px + env(safe-area-inset-bottom)) 8px',
  WebkitUserSelect: 'none',
  userSelect: 'none',
}

export default function TapProbe() {
  const [rows, setRows] = useState(tapProbeLines)

  useEffect(() => {
    if (!tapDebugOn()) return undefined
    const first = installTapProbe()
    const off = subscribeTapProbe(setRows)
    if (first) tapProbe('tap probe armed - tap a water event row')
    return off
  }, [])

  if (!tapDebugOn()) return null

  return (
    <div style={SHELL} aria-hidden="true" data-name="tap-probe">
      <div style={{ color: '#ffd37a', marginBottom: 3 }}>
        TAP PROBE on. Add ?debug=off to the URL to turn it off.
      </div>
      {rows.map((l, i) => (
        <div
          key={`${l.t}-${i}`}
          style={{ whiteSpace: 'pre', color: l.text.startsWith('**') ? '#ffd37a' : undefined }}
        >
          {l.text}
        </div>
      ))}
    </div>
  )
}
