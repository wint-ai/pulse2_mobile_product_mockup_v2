// shadcn/ui Checkbox (new-york), JSX rather than TSX to match the rest of ui/.
//
// ── WHY THIS IS ALLOWED, WHEN `select` AND `dropdown-menu` ARE NOT ────────
// `AccountScreenV2.jsx:644-656` forbids adding certain Radix primitives to
// this app, and the reason it gives is specific and mechanical: those
// primitives PORTAL TO `document.body`, and this app draws inside
// `src/components/Phone.jsx` — a fixed 393x852 box with `overflow: hidden`.
// A portal escapes that box and paints across the whole browser window with
// the phone sitting in the middle of it.
//
// `@radix-ui`'s Checkbox renders INLINE and portals nothing: its Root is a
// `<button role="checkbox">` and its Indicator is a `<span>` inside that
// button. It therefore does not engage the rule at all. `radix-ui@^1.6.7` is
// already a dependency and its unified export already carries `Checkbox`, so
// this file adds no package either — `separator.jsx`, `toggle.jsx` and
// `toggle-group.jsx` import from the same place in the same way.
//
// STILL FORBIDDEN, and nothing here changes it: `Select`, `DropdownMenu`,
// `Popover`, Radix `Dialog`, `HoverCard`, `Tooltip` content — anything with a
// Portal. Sheets in this app stay `absolute inset-0` inside the page.
//
// ── TWO DELIBERATE DIVERGENCES FROM CANONICAL SHADCN ─────────────────────
// 1. THE UNCHECKED BOX IS `bg-transparent`, AND `dark:bg-input/30` IS DROPPED.
//    Canonical shadcn gives the unchecked box a faint fill under dark. This
//    app ships FOUR themes, and under `[data-theme='contrast']` every surface
//    token is saturated — the hand-rolled box this replaces used `bg-card`
//    and came out as a filled block, so an UNCHECKED box looked CHECKED. On
//    `ValveManagementScreen` that is a safety defect rather than a cosmetic
//    one: a user who misreads which valves are selected can commit a bulk
//    shutoff over a set they never chose. So the distinction here is
//    FILL vs NO FILL, which survives any theme, instead of one fill against
//    another. The boundary is `--border-strong` (`index.css:135/1099/1514`),
//    which exists so a control edge can meet WCAG 1.4.11's 3:1 — `--border`
//    is a divider colour and is not required to.
// 2. `aria-disabled` IS STYLED ALONGSIDE `disabled`. A control that cannot be
//    used for a REASON the user needs to hear keeps `aria-disabled` and stays
//    focusable, because a truly `disabled` control is skipped outright by some
//    assistive tech and the reason never reaches anyone. It draws as a dashed
//    outline, which neither the checked nor the unchecked state ever is.
//
// `indeterminate` is Radix's own third value (`checked="indeterminate"`),
// which is what emits `aria-checked="mixed"` — the ARIA mixed-checkbox
// convention — so nothing here has to hand-roll it.
"use client"

import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { Check, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({ className, checked, ...props }) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      checked={checked}
      className={cn(
        "peer size-[18px] shrink-0 rounded-[4px] border border-solid border-border-strong bg-transparent outline-none transition-[color,box-shadow]",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-disabled:cursor-default aria-disabled:border-dashed aria-disabled:border-border aria-disabled:opacity-70",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        {checked === "indeterminate" ? (
          <Minus className="size-[12px]" strokeWidth={3} aria-hidden="true" />
        ) : (
          <Check className="size-[12px]" strokeWidth={3} aria-hidden="true" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
