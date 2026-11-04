/**
 * Tabs — shadcn/Radix Tabs, wearing the SEGMENTED CONTROL the design system
 * draws at Figma node 199922:83970.
 *
 * ── WHY THIS FILE CHANGED ──────────────────────────────────────────────────
 * It used to carry shadcn's stock UNDERLINE tab (`border-b-2` on a transparent
 * list). Nothing in the delivery canvas draws that treatment and nothing in the
 * repo imported this file, so it was a primitive matching no design — which is
 * why both v2 pages that needed a tab row hand-rolled a `TabButton` instead,
 * and got no tab semantics with it. It now carries the node, so a page can
 * reach for the real control.
 *
 * ── THE NODE, VALUE BY VALUE ───────────────────────────────────────────────
 *   Track    36px tall, full width, fill #e2e8f0, p-[3px], radius 10px.
 *   Trigger  flex-1 (every trigger the same width), fills the track's content
 *            box, radius 8px, px-[6px] py-[2px], 14px/20px.
 *     · active   white fill, 1px #0b81f8 border, #0b81f8 label at weight 600,
 *                two stacked drop shadows — 0 1px 2px and 0 1px 3px, black 10%.
 *     · resting  no fill, no border, #62748e label at weight 500.
 *   Badge    an OPTIONAL count pill inside a trigger: radius 10px, h 20,
 *            min-w 20, px/py 2, fill #90a1b9, 14px label in #e2e8f0. The frame
 *            puts it on a MIDDLE trigger reading `8`. See TabsCount.
 *
 * The border is drawn INSIDE the box (preflight sets box-sizing: border-box)
 * and every trigger carries a transparent one at rest, so selecting a trigger
 * changes no geometry — it does not grow, and its neighbours do not move.
 *
 * ⚠ ARITHMETIC THE FRAME CANNOT HOLD. The node is quoted as 36px tall WITH
 *   p-[3px] AND a 32px trigger; 36 − 3 − 3 = 30, so those three cannot all be
 *   true. 36 is the number the page layout depends on, and 36/p-3 is also what
 *   stock shadcn ships, so the track is 36 and the trigger fills 30. If the
 *   designer meant a 32px trigger then the track is 38 — the owner's call, not
 *   one to make silently here.
 *
 * ── TOKENS, NOT HEXES ──────────────────────────────────────────────────────
 * Every colour is written as the token that paints it, so the control follows
 * all four themes (`:root`, dark, sand, contrast). A raw hex — or a utility
 * naming a token that does not exist, which falls through to stock Tailwind —
 * freezes identically across the four with no visual tell.
 *     #e2e8f0  → bg-slate-200           (--slate-200; every theme re-picks it)
 *     #ffffff  → bg-card                (--card)
 *     #0b81f8  → border-primary / text-primary   (--primary = wint-blue-accent)
 *     #62748e  → text-muted-foreground  (--slate-500)
 *     #90a1b9  → bg-slate-400           (--slate-400)
 *     10px/8px → rounded-lg / rounded-md  (--radius is 0.625rem = 10px here)
 * The two shadows stay literal rgba black: they are a depth cue rather than a
 * hue, and the repo has no shadow token to point them at.
 *
 * FONT. The node names Geist SemiBold / Geist Medium. The app's global sans is
 * Figtree (--font-sans-stack); Geist is loaded only as --font-mono-label, for
 * the topology and the chart axes. No font-family class is emitted here — the
 * same call PillTabs made for the same reason — so the WEIGHTS and SIZES below
 * are the node's and the family is the app's. That divergence is reported to
 * the owner, not resolved here.
 *
 * ── tailwind-merge: TWO TRAPS THAT HAVE ALREADY BITTEN THIS REPO ───────────
 * `cn()` is tailwind-merge, which
 *   · treats `leading-*` as conflicting with a font-size atom and DELETES
 *     whichever is spelled FIRST. That dropped a design's line-height once
 *     already — the regression is pinned in eventsTimelineCard.dom.test.jsx.
 *     Every class list below therefore spells `text-sm` BEFORE `leading-5`,
 *     and a call site must not pass a text size through `className`.
 *   · eats a backslash, so a Figma token spelling such as
 *     `text-[color:var(--colors\/slate\/500)]` never reaches the DOM. None is
 *     pasted here; if one ever is, resolve it to a utility first.
 *
 * ── RELATIONSHIP TO src/v2/components/PillTabs.jsx ─────────────────────────
 * PillTabs is a DIFFERENT control, from a different node family (199360:129743
 * and its three siblings), and it carries two owner rulings. It is NOT
 * superseded by this file and must not be repointed at it without the owner.
 * Its header argues against using this file, on two grounds that were true when
 * it was written and are not now: that this file drew an underline tab, and
 * that the pill row's classes were Figma's escaped-token spellings. Which
 * control the pixel-matched pages should use is the owner's call, not this
 * file's.
 */

import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

function Tabs({ className, ...props }) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // h-9 is the node's 36px. items-stretch rather than a percentage height
        // on the trigger: the trigger then fills the 30px content box without
        // depending on how a percentage resolves inside a flex row.
        "inline-flex h-9 w-full items-stretch justify-center rounded-lg bg-slate-200 p-[3px]",
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md",
        // The resting border is transparent, not absent, so selection costs no
        // geometry. See the header.
        "border border-transparent px-[6px] py-[2px] font-medium text-muted-foreground",
        "transition-[color,background-color,border-color,box-shadow]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:border-primary data-[state=active]:bg-card",
        "data-[state=active]:font-semibold data-[state=active]:text-primary",
        "data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.1)]",
        // LAST, and in this order — see the tailwind-merge note in the header.
        "text-sm leading-5",
        className,
      )}
      {...props}
    />
  )
}

/**
 * The optional count badge the node draws inside a trigger.
 *
 * ⚠ It is DECORATION ON THE ACCESSIBLE NAME. A tab is found by what it opens,
 *   not by how many things sit behind it, and folding the number into the
 *   trigger's name once renamed "Systems" to "Systems 103" and broke every
 *   lookup by name (see PillTabs' CountBadge, which learned this the hard way).
 *   So a trigger that carries one must spell its own `aria-label`:
 *
 *     <TabsTrigger value="locations" aria-label="Locations">
 *       Locations
 *       <TabsCount label="8 locations">8</TabsCount>
 *     </TabsTrigger>
 *
 *   The count is still announced — as the badge's own label.
 */
function TabsCount({ className, label, children, ...props }) {
  return (
    <span
      data-slot="tabs-count"
      aria-label={label}
      className={cn(
        "inline-flex h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-lg",
        "bg-slate-400 px-[2px] py-[2px] font-normal tabular-nums text-slate-200",
        "text-sm leading-5",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

function TabsContent({ className, ...props }) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsCount }
