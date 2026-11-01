/**
 * The app-background picker — a swatch grid.
 *
 * WHY A GRID OF SWATCHES AND NOT A LIST OR A DROPDOWN.
 *
 * Not a dropdown: there is no dropdown component in this repo and
 * AccountScreenV2.jsx:628-641 forbids adding one in writing. Radix `Select`
 * and `DropdownMenu` portal to document.body, which escapes the fixed 393x852
 * frame in src/components/Phone.jsx and renders across the whole browser
 * window with the phone sitting in the middle of it. src/components/ui/ has no
 * select.jsx and is not getting one for this.
 *
 * Not the existing SegmentedPicker: it is a single row of equal-width
 * ToggleGroupItems. Three fit. Nine would be 38px each inside a 345px card,
 * and every label would truncate to two characters.
 *
 * Not a text list either, and this is the real argument. The thing being
 * chosen IS a colour. "Aurora" and "Opal" are names for something the eye
 * decides in half a second and prose cannot settle in a paragraph; a list of
 * nine words asks the user to open each one in turn and remember the last.
 * A grid shows all nine at once and the choice is made by looking.
 *
 * EACH SWATCH IS PAINTED WITH THE OPTION'S OWN GROUND. `swatchVar` on each
 * registry entry names the same custom property the page root reads under that
 * option — --app-bg-option-aurora is literally the value [data-bg='aurora']
 * gives --app-bg. There is no preview colour to maintain and nothing that can
 * drift from the real thing. The one honest difference is GEOMETRY: a swatch
 * is a 100x64 landscape box and the app is a 393x852 portrait one, so an
 * angled gradient crosses it on a different diagonal. The colours are exact;
 * the composition is a thumbnail.
 *
 * KEYBOARD. A radiogroup with roving tabindex: one tab stop for the whole
 * grid, arrows to move between options, Home/End for the ends. The horizontal
 * arrows follow the document direction, because this screen has verified RTL
 * and ArrowRight means "previous" in Hebrew. Nothing here portals, nothing
 * here traps focus, and the grid is nine plain buttons.
 */

import { useRef } from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

/* The swatch. `aspect`-free fixed height so all nine rows line up regardless
   of label length, and overflow-hidden so the rounded corner actually clips
   the gradient. The border is the house --border, not a tinted one: a swatch
   outlined in its own hue reads as selected. */
const SWATCH =
  'block h-[64px] w-full overflow-hidden rounded-[10px] border border-border'

export default function BackgroundPicker({ label, value, options, onChange }) {
  const gridRef = useRef(null)

  /* Roving focus. The buttons are found from the DOM rather than kept in a ref
     array because the list is static and the DOM is already the ordering. */
  function move(from, delta) {
    const count = options.length
    const next = (from + delta + count) % count
    const buttons = gridRef.current?.querySelectorAll('[role="radio"]')
    buttons?.[next]?.focus()
    onChange(options[next].value)
  }

  function onKeyDown(event, index) {
    /* Horizontal arrows are direction-relative. Vertical arrows are not: down
       is down in every script, and the grid is three wide. */
    const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
    const forward = rtl ? -1 : 1
    switch (event.key) {
      case 'ArrowRight': move(index, forward); break
      case 'ArrowLeft': move(index, -forward); break
      case 'ArrowDown': move(index, 3); break
      case 'ArrowUp': move(index, -3); break
      case 'Home': move(index, -index); break
      case 'End': move(index, options.length - 1 - index); break
      default: return
    }
    event.preventDefault()
  }

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value))

  return (
    <div
      ref={gridRef}
      role="radiogroup"
      aria-label={label}
      className="grid grid-cols-3 gap-2"
    >
      {options.map((option, index) => {
        const checked = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            /* Roving tabindex: the grid is ONE tab stop. Without this every
               option is a stop and the settings screen grows eight of them. */
            tabIndex={index === selectedIndex ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'group min-w-0 cursor-pointer rounded-[12px] p-[3px] text-left',
              'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
              /* The selection ring sits OUTSIDE the swatch, on the padding, so
                 it never covers a pixel of the ground it is selecting. */
              checked ? 'bg-primary/15 ring-2 ring-primary' : 'ring-0',
            )}
          >
            <span className="relative block">
              <span className={SWATCH} style={{ background: `var(${option.swatchVar})` }} />
              {checked ? (
                <span
                  className="absolute end-[6px] top-[6px] flex size-[18px] items-center justify-center rounded-full bg-primary"
                  aria-hidden="true"
                >
                  <Check className="size-[12px] text-primary-foreground" strokeWidth={3} />
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                'mt-[5px] block min-w-0 truncate px-[2px] pb-[1px] text-[12px] leading-[16px]',
                checked ? 'font-semibold text-primary' : 'font-medium text-slate-600',
              )}
            >
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
