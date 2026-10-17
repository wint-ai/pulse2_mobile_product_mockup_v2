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
import { cn } from '@/lib/utils'

/* Tabler-style pin, 14px, matching the glyph weight the header bar uses. */
function PinGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-[14px] shrink-0" aria-hidden="true">
      <path
        d="M8 1.8c-2.3 0-4.2 1.85-4.2 4.13 0 3.02 4.2 8.27 4.2 8.27s4.2-5.25 4.2-8.27C12.2 3.65 10.3 1.8 8 1.8Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="5.9" r="1.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function CaretGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-[14px] shrink-0" aria-hidden="true">
      <path d="M4 6.2 8 10.2l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BackGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-[16px]" aria-hidden="true">
      <path d="M10 3.2 5.2 8l4.8 4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          /* 16px glyph, but the pseudo-element pushes the hit area past NN/g's
             ~1cm floor without spending header height on it. */
          className="relative flex size-[24px] shrink-0 items-center justify-center rounded-[8px] text-[color:var(--colors\/slate\/700,#314158)] outline-none before:absolute before:-inset-[10px] before:content-[''] hover:bg-white/40 focus-visible:ring-[3px] focus-visible:ring-white/60"
        >
          <BackGlyph />
        </button>
      ) : null}

      <button
        type="button"
        onClick={onOpenTree}
        aria-haspopup="dialog"
        aria-label={`Scope: ${label}. Open the location tree.`}
        className={cn(
          'relative flex min-w-0 max-w-full items-center gap-[6px] rounded-[10px] px-[10px] py-[5px]',
          'border border-solid border-white/70 bg-white/55 backdrop-blur-[6px]',
          "before:absolute before:-inset-y-[6px] before:-inset-x-0 before:content-['']",
          'text-[color:var(--colors\\/slate\\/900,#0f172b)] outline-none',
          'hover:bg-white/75 focus-visible:ring-[3px] focus-visible:ring-white/60',
        )}
      >
        <PinGlyph />
        {/* The one place truncation is correct: a long building name shortens,
            it does not wrap the header or push the caret off the row. */}
        <span
          className={cn(
            String.raw`min-w-0 flex-1 truncate text-left font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif]`,
            String.raw`font-[var(--font\/weight\/font-medium,500)] text-[14px] leading-[18px]`,
          )}
        >
          {label}
        </span>
        <CaretGlyph />
      </button>
    </div>
  )
}
