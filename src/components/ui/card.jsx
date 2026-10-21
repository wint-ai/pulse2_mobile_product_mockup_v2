import * as React from "react"

import { cn } from "@/lib/utils"

/* Mobile-tuned card. The canonical shadcn card is desktop-scale
   (py-6 / px-6 / gap-6); at 375px that reads as wasted gutter, so the
   padding, radius and shadow here are deliberately tighter. Keep them.
   CardAction + the grid CardHeader come from canonical shadcn — the
   Figma design places an action button opposite the title, and the
   has-data-[slot=card-action] grid is what makes that work.

   PUT BACK ON TOKENS IN PHASE 4, undoing 469314f ("v2/system-page: swap
   broken theme tokens for standard tailwind"). That commit was right at
   the time: the semantic layer was a dead copy, ~1,300 call sites named
   tokens that no file declared, and routing around it with bg-white /
   text-slate-900 / border-slate-200 was the only thing that painted.
   Phase 1 made the layer real and Phase 2 gave it four theme sets, so
   the reason to route around it is gone and `bg-white` is now the
   problem it was the answer to — white is the one surface no theme can
   move. Each swap below is its own exact value in `light`, so this is a
   pixel no-op there and a repaint everywhere else:
     bg-white         -> bg-card              (--card IS #ffffff)
     text-slate-900   -> text-card-foreground (aliases --slate-900)
     border-slate-200 -> border-border        (--border IS --slate-200)
     text-slate-500   -> text-muted-foreground (aliases --slate-500)
   8 v2 importers; see the Phase 4 report for the per-route pass.

   ── WHY THE HAND-ROLLED `CARD…` CONSTANTS DID NOT ALL COLLAPSE ONTO THIS ──
   The Phase 4 plan called collapsing them "the real win — deleting divergent
   copies of one component", on the premise that each was a private
   re-implementation of <Card> written when <Card> was unusable. Measured
   after the tokenisation, that premise only half holds, so half the collapse
   happened and half did not. Both halves are deliberate.

   ALREADY ON <Card>, and left that way: EventsTimelineCard's CARD_ROOT /
   CARD_HEADER / CARD_CONTENT, AccountScreenV2's CARD, and EventOverlay's
   card — whose `style={{ background: CARD_BG }}` inline override is now a
   plain `bg-surface-card` class, one fewer way to paint a card.

   NOT COLLAPSED, and the reason is structural, not inertia. The house
   chassis — ActivePolicyCard, InfoAccordion, SystemHealthCard,
   SystemTypeCard, TriageBand, ValveStatusCard, plus AlertCard's SHELL,
   ActiveWaterEventsCard's ROOT_CLASS, InsightsCard's LIST_SHELL and
   EventFocusOverlay's CARD_SHELL — shares NONE of this component's six base
   declarations except `flex flex-col`:

     <Card>              house chassis
     rounded-2xl (16px)  rounded-[18px] or rounded-[22px], never 16
     gap-3               0, 14, 15, 16, 19, 20px — different per card
     py-4                p-[18px] / pb-16 pt-12 / px-16 py-12 / py-12 / p-0
     border-border/70    border-card (opaque rim, a different colour AND alpha)
     two-layer shadow    no shadow at all
     bg-card (#ffffff)   bg-surface-card (#fafbfc) — a different surface

   Routing those through <Card> means ~13 override classes per call site to
   suppress six base declarations and inherit `flex flex-col`, plus a newly
   applied `text-card-foreground` that none of them sets today. That is more
   code, not less, and it moves pixels — against this phase's own acceptance
   test that `light` is unchanged. They are tokenised IN PLACE instead, which
   is what Phase 4 is actually for; every one now reads bg-surface-card +
   border-card and follows all four themes.

   THE REAL FINDING UNDERNEATH: this app has TWO card surfaces, not one.
   <Card> is white (--card); the house chassis is #fafbfc (--surface-card).
   The plan assumed they were the same surface spelled two ways. They are
   not, and collapsing them would have silently repainted eight importers.
   Whether they SHOULD be one surface is a live design question for the
   owner — it is not settled here, and nothing in Phase 4 depends on it. */

function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-3 rounded-2xl border border-border/70 py-4 shadow-[0_2px_6px_rgba(20,21,26,0.05),0_1px_2px_rgba(20,21,26,0.04)]",
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
      className={cn("text-muted-foreground text-sm", className)}
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
