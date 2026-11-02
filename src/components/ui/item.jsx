// shadcn/ui Item (new-york-v4), JSX rather than TSX to match the rest of ui/.
// Ported 2026-11-02 from the REGISTRY source, verbatim except for the four
// mechanical changes listed at the foot of this header:
//   https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/
//   new-york-v4/ui/item.tsx
//
// ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
// The owner on the valve widget, 2026-11-02: "the widget for valves looks too
// messy. Too much information, it's not organized well, it's too big... It
// doesn't feel like the ShadCN components... It needs to be much more clear,
// much more easy to understand to open, close the valves, to see statuses."
//
// The measurable half of "doesn't feel like the ShadCN components" is this:
// the valve surfaces are LISTS OF ROWS, shadcn ships a list-row primitive, and
// this repo did not have it. `ValveManagementCard.jsx` uses exactly ONE shadcn
// component in 906 lines; the audit counted 17 places where hand-rolled markup
// duplicates a primitive that was already available. A hand-rolled row never
// matches — each one re-picks its own gap, padding, radius, focus ring and
// title weight, and they drift apart the moment two people touch them. One
// primitive, imported, is the whole fix.
//
// ── WHY THE REGISTRY SOURCE AND NOT THE DOCS SITE ─────────────────────────
// shadcn's live documentation has migrated its examples to Base UI, which
// spells composition as a `render` prop. This repo is on `radix-ui@1.6.7` and
// composes with `asChild` + `Slot.Root`, exactly as `button.jsx` does. JSX
// copied from the docs site would not build here. The registry source above
// is still the Radix-idiom version and is what was ported.
//
// ── NO PORTAL, SO THE HOUSE RULE IS NOT ENGAGED ───────────────────────────
// `AccountScreenV2.jsx:644-656` forbids Radix primitives that portal to
// `document.body`, because this app draws inside `src/components/Phone.jsx` —
// a fixed 393x852 box with `overflow: hidden`, which a portal escapes. Nothing
// in this file portals: every export is a `<div>`, a `<p>`, or `Slot.Root`.
// `ItemSeparator` wraps the house `separator.jsx`, which is Radix `Separator`
// — inline, no portal — and is already in the tree.
//
// ── THE FOUR CHANGES FROM THE REGISTRY SOURCE, ALL MECHANICAL ─────────────
// 1. TSX -> JSX: the `React.ComponentProps<…>` / `VariantProps<…>` type
//    annotations are dropped. They are the whole of the TypeScript in the
//    file; no runtime behaviour rides on them.
// 2. `import { cn } from "cn"` -> `"@/lib/utils"`, this repo's path.
// 3. `@/registry/new-york-v4/ui/separator` -> `@/components/ui/separator`.
// 4. `import * as React from "react"` is dropped — it existed only to carry
//    those types, and this file never names `React` at runtime.
// Every class string is byte-identical to the registry. Cross-checked against
// the strings quoted in the redesign brief: `Item` base, the three variants,
// the two sizes, `ItemGroup`, `ItemContent`, `ItemTitle`, `ItemDescription`,
// `ItemActions` and `ItemMedia`'s icon variant all match.
//
// ONE UPSTREAM ODDITY, KEPT VERBATIM AND FLAGGED SO IT IS NOT "FIXED": the
// `Item` base carries `[a]:transition-colors [a]:hover:bg-accent/50`. Under
// Tailwind v4 a bracket variant with no `&` is an ATTRIBUTE selector, so this
// compiles to `&[a]:hover` — an element with an attribute literally named `a`
// — not "when rendered as an anchor", which is plainly what upstream meant. It
// is inert either way here: no valve surface renders `<Item asChild>` around
// an `<a>`. Left as-is so this file stays a clean diff against the registry;
// if a row ever does need anchor hover, fix it at the call site.
//
// ── WHAT THE THREE VALVE SURFACES SHOULD TAKE FROM THIS ───────────────────
// `size="sm"` (gap-2.5 px-4 py-3) is the dense row; `size="default"` (gap-4
// p-4) is the roomy one. The management screen has 509px of fixed chrome and
// ~5 visible rows for 103 systems, so rows there want `sm`. `ItemGroup` +
// `ItemSeparator` replaces hand-rolled `divide-y` wrappers. Colour and the
// state word belong to `ValveStateReadout` (`src/v2/components/`), which drops
// into `ItemActions` or alongside `ItemTitle` — not to this file.

import { cva } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

function ItemGroup({ className, ...props }) {
  return (
    <div
      role="list"
      data-slot="item-group"
      className={cn("group/item-group flex flex-col", className)}
      {...props}
    />
  )
}

function ItemSeparator({ className, ...props }) {
  return (
    <Separator
      data-slot="item-separator"
      orientation="horizontal"
      className={cn("my-0", className)}
      {...props}
    />
  )
}

const itemVariants = cva(
  "group/item flex flex-wrap items-center rounded-md border border-transparent text-sm transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors [a]:hover:bg-accent/50",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border-border",
        muted: "bg-muted/50",
      },
      size: {
        default: "gap-4 p-4",
        sm: "gap-2.5 px-4 py-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Item({ className, variant = "default", size = "default", asChild = false, ...props }) {
  const Comp = asChild ? Slot.Root : "div"
  return (
    <Comp
      data-slot="item"
      data-variant={variant}
      data-size={size}
      className={cn(itemVariants({ variant, size, className }))}
      {...props}
    />
  )
}

const itemMediaVariants = cva(
  "flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "size-8 rounded-sm border bg-muted [&_svg:not([class*='size-'])]:size-4",
        image: "size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function ItemMedia({ className, variant = "default", ...props }) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }) {
  return (
    <div
      data-slot="item-content"
      className={cn(
        "flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none",
        className,
      )}
      {...props}
    />
  )
}

function ItemTitle({ className, ...props }) {
  return (
    <div
      data-slot="item-title"
      className={cn("flex w-fit items-center gap-2 text-sm leading-snug font-medium", className)}
      {...props}
    />
  )
}

function ItemDescription({ className, ...props }) {
  return (
    <p
      data-slot="item-description"
      className={cn(
        "line-clamp-2 text-sm leading-normal font-normal text-balance text-muted-foreground",
        "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className,
      )}
      {...props}
    />
  )
}

function ItemActions({ className, ...props }) {
  return (
    <div data-slot="item-actions" className={cn("flex items-center gap-2", className)} {...props} />
  )
}

function ItemHeader({ className, ...props }) {
  return (
    <div
      data-slot="item-header"
      className={cn("flex basis-full items-center justify-between gap-2", className)}
      {...props}
    />
  )
}

function ItemFooter({ className, ...props }) {
  return (
    <div
      data-slot="item-footer"
      className={cn("flex basis-full items-center justify-between gap-2", className)}
      {...props}
    />
  )
}

export {
  Item,
  ItemMedia,
  ItemContent,
  ItemActions,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
  ItemDescription,
  ItemHeader,
  ItemFooter,
}
