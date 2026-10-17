/**
 * The parent-scope control: `←  📍 100 Meridian Pla…  ⌄`
 *
 * WHY THIS REPLACES THE BREADCRUMB
 * The System page used to carry `Home › ⋯ › <parent>`. Three problems:
 *   1. Only `Home` was ever live. The `⋯` was `aria-disabled` and the last
 *      crumb was a plain <div> — so the one thing a breadcrumb exists for,
 *      getting back up the hierarchy, was never implemented.
 *   2. The full chain (Account › Country › Region › City › Building) is ~544px
 *      of 14px text against 357px of usable width. It cannot fit, which is why
 *      it collapsed to an ellipsis that did nothing.
 *   3. In the redesign it landed on the coloured hero wave, where it was
 *      barely legible.
 *
 * A competitive pass over 25 products across smart-water, building-IoT and
 * consumer found NOT ONE showing a multi-level breadcrumb on a mobile detail
 * screen. The ones with real hierarchies show exactly one level of parent,
 * persistently: Honeywell Forge for Buildings and Metron WaterScope use this
 * pill almost exactly; Siemens Building X uses a collapsible identity strip;
 * 75F a second title row; SmartThings and EyeOnWater a two-line title.
 * NN/g's breadcrumb guideline 11 says the same thing — on mobile, "shorten the
 * trail to include only the last level(s)".
 *
 * So: one ancestor, never a chain. Tapping it opens the drawer, which already
 * renders the whole tree, already has search, and already auto-expands to the
 * current system — that is where the middle ancestors live now, and it is more
 * than the `⋯` ever offered.
 *
 * The Figma header bar (199296:50192) centres a location name — "Floor 26" —
 * in exactly this slot, so this is the comp's own layout, made operable.
 */
import { ChevronLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CaretDown, PinLocation03 } from '@/v2/icons'

/* ICONS AND CONTROLS COME FROM THE SYSTEM, NOT FROM HAND-DRAWN PATHS.
 * The first build inlined three <svg> paths (pin, caret, back chevron) and two
 * bare <button>s wearing `bg-white/55` glass. All five are supplied:
 *   pin    @/v2/icons PinLocation03  — Huge Icons / pin-location-03, the glyph
 *          the side menu (198378:73797) already uses for a LOCATION row, which
 *          is exactly what this pill names.
 *   caret  @/v2/icons CaretDown      — Phosphor caret-down, as EventsTimelineCard.
 *   back   lucide-react ChevronLeft  — the same import SystemsFilterSheet uses
 *          for its own back affordance.
 *   both buttons  shadcn <Button variant="ghost">, so the focus ring, the
 *          disabled handling and the [&_svg] sizing come from the library.
 *
 * `size={null}` on the Buttons is cva's documented way of switching a default
 * variant off: these two are pinned to the header bar's 24px / pill geometry,
 * and letting `size="default"` (h-9 px-4) land first would mean overriding it
 * atom by atom. Everything else is a token class.
 *
 * The glass is now `bg-card/55` + `border-card/70` — `--card` is #FFFFFF, so
 * the rendered value is unchanged and the colour is a token rather than a
 * literal `white/55`.
 */

export default function ScopePill({
  /** The immediate parent's display name — ONE level, never a path. */
  label,
  /** Opens the hierarchy tree. This is where the middle ancestors live. */
  onOpenTree,
  /** Pops one level up. Omit when there is nothing above this screen. */
  onBack,
  backLabel = 'Back',
  className,
}) {
  if (!label) return null

  return (
    <div className={cn('flex min-w-0 flex-1 items-center justify-center gap-[6px]', className)}>
      {onBack ? (
        <Button
          type="button"
          variant="ghost"
          size={null}
          onClick={onBack}
          aria-label={backLabel}
          /* 16px glyph, but the pseudo-element pushes the hit area past NN/g's
             ~1cm floor without spending header height on it. */
          className={cn(
            'relative size-[24px] shrink-0 rounded-[8px] p-0',
            String.raw`text-[color:var(--colors\/slate\/700,#314158)]`,
            "before:absolute before:-inset-[10px] before:content-['']",
            'hover:bg-card/40 hover:text-current',
          )}
        >
          <ChevronLeft className="size-[16px]" aria-hidden="true" />
        </Button>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size={null}
        onClick={onOpenTree}
        aria-haspopup="dialog"
        aria-label={`Scope: ${label}. Open the location tree.`}
        className={cn(
          'relative min-w-0 max-w-full justify-start gap-[6px] rounded-[10px] px-[10px] py-[5px]',
          'border border-solid border-card/70 bg-card/55 backdrop-blur-[6px]',
          "before:absolute before:-inset-y-[6px] before:-inset-x-0 before:content-['']",
          String.raw`text-[color:var(--colors\/slate\/900,#0f172b)]`,
          'hover:bg-card/75 hover:text-current',
        )}
      >
        <PinLocation03 className="size-[14px] shrink-0" />
        {/* The one place truncation is correct: a long building name shortens,
            it does not wrap the header or push the caret off the row. */}
        <span
          className={cn(
            String.raw`min-w-0 flex-1 truncate text-left font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif]`,
            String.raw`font-[var(--font\/weight\/font-medium,500)] text-[length:var(--text\/sm\/size,14px)] leading-[var(--text\/sm\/lh-tight,18px)]`,
          )}
        >
          {label}
        </span>
        <CaretDown className="size-[14px] shrink-0" />
      </Button>
    </div>
  )
}
