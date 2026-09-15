import * as React from "react"

import { cn } from "@/lib/utils"

/* Mobile-tuned card. The canonical shadcn card is desktop-scale
   (py-6 / px-6 / gap-6); at 375px that reads as wasted gutter, so the
   padding, radius and shadow here are deliberately tighter. Keep them.
   CardAction + the grid CardHeader come from canonical shadcn — the
   Figma design places an action button opposite the title, and the
   has-data-[slot=card-action] grid is what makes that work. */

function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-white text-slate-900 flex flex-col gap-3 rounded-2xl border border-slate-200/70 py-4 shadow-[0_2px_6px_rgba(20,21,26,0.05),0_1px_2px_rgba(20,21,26,0.04)]",
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-base font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-slate-500 text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }) {
  return <div data-slot="card-content" className={cn("px-4", className)} {...props} />
}

function CardFooter({ className, ...props }) {
  return (
    <div data-slot="card-footer" className={cn("flex items-center px-4", className)} {...props} />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter }
