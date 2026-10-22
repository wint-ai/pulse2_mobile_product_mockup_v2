import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        /* Two deliberate divergences from stock shadcn, both dark-only so
           `light` is untouched:

           1. `dark:bg-destructive/60` is dropped. Stock shadcn mutes a
              destructive button under dark; in THIS product a destructive
              action (close the valve, dismiss a live water event) is the
              loudest signal on the screen and must not be the quietest
              button on it. The fill stays the full --destructive.
           2. `text-white` becomes `text-destructive-foreground`. A red that
              lightens for dark fails white text — Atlassian's dark
              background-danger-bold #F87168 gives white 2.78:1 and black
              7.55:1, and Material 3's dark `onError` is tone 20, i.e. dark
              ink on a light red. The token is the partner that is allowed to
              flip; `text-white` is not. In `light` --destructive-foreground
              IS #FFFFFF, so this is a no-op there. */
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        /* `dark:border-input` composites white-@15% onto the card and lands at
           ~1.58:1 — a control boundary you cannot see. WCAG 1.4.11 wants 3:1
           for a UI component boundary, which is what --border-strong is for.
           Light keeps `border` → --border untouched. */
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-border-strong dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        /* The `/50` is dropped under dark. Stock shadcn softens the ghost
           hover there, but --accent is already a near-card step on this
           theme, so halving it leaves 1.20:1 against the card — a hover
           state you cannot see. At full alpha it is 1.42:1, which is all
           --accent has to give and is the most this class can honestly do;
           anything brighter is a token decision, not a component one.
           `light` keeps `hover:bg-accent` exactly as it was. */
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }
