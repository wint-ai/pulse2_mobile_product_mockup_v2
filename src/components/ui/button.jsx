import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  /* MOTION, 2026-11-07. Two changes, both from the motion research in
     index.css:

     1. `transition-all` is GONE. It is the one transition value that is
        always wrong: it eventually catches a layout property -- width, the
        `h-9` a size variant sets, a padding change from `has-[>svg]` -- and
        drags the whole animation off the compositor onto the main thread.
        Replaced by the explicit list of what a button actually changes.

     2. `active:scale-95` is NEW, and it is the single highest-impact line in
        this pass. Mobile web has NO HOVER: every `hover:` rule above is dead
        on a phone, so until now tapping any button in this app produced no
        feedback whatsoever. A press that does not acknowledge itself inside
        ~100ms is the usual reason an app "feels static" -- it reads as a
        dropped tap, and people tap again.

        Down is fast and linear (contact, not animation); the release
        decelerates over --dur-medium, which is what makes it feel sprung
        rather than snapped back. 95% is enough to read without the control
        appearing to retreat from the finger.

     Press survives prefers-reduced-motion on purpose -- see the note beside
     the `press` utility in index.css. */
  /* `scale` IS IN THE TRANSITION LIST, AND `transform` ALONE IS NOT ENOUGH.
     Tailwind v4 compiles `scale-95` to the INDEPENDENT `scale:` property,
     not to `transform: scale(...)` the way v3 did. A transition list naming
     only `transform` therefore animates nothing, and the press snaps
     instantly to 95% and back with no easing at all. Measured in a real
     browser: computed `transform` stayed `none` through the whole press
     while `scale` did the work. Both are listed so this keeps working
     whichever property a future utility reaches for. */
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap outline-none transition-[scale,transform,color,background-color,border-color,box-shadow,opacity] duration-(--dur-medium) ease-(--ease-out) active:scale-95 active:duration-(--dur-fast) active:ease-linear focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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

           `border-border` IS LOAD-BEARING, 2026-11-08 — the same bug fixed in
           ui/table.jsx's TableRow by 0c684fc, and fixed here the same way. The
           registry source is a bare `border`, which under Tailwind v3
           inherited the framework's default border colour (gray-200). TAILWIND
           V4 REMOVED THAT DEFAULT: a border utility with no colour resolves to
           `currentColor`, so every outline button drew its edge in its own
           near-black text colour. Measured in WebKit before the fix:
           `oklch(0.2084 0.04166 266.359009)` on the /alerts filter chip, on
           /valves' Filters button and on FilterSheet's Cancel, and a flat
           `rgb(0, 0, 0)` on /valves' Show more — against the correct
           `oklch(0.92876 0.01262 255.507996)` on SystemsTableCard's own
           outline buttons, which name the token at their call site and were
           therefore right all along. ~31 call sites app-wide (AlertCard,
           ControlPanel, App, FilterSheet and more); the owner approved the
           sweep. Call sites that set their own border colour (AlertCard's
           `border-primary`, AccountScreenV2's Sign out) are unaffected —
           theirs still wins. `dark:` keeps --border-strong, as above. */
        outline:
          "border border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-border-strong dark:bg-input/30 dark:hover:bg-input/50",
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
