/**
 * SystemsOverviewHero — the blue wave at the top of the Location screen, with
 * the fleet count on it and the system-type chips under that.
 *
 * Figma, fetched 2026-10-20 from the four "Accont / location" variants the
 * owner sent as the latest:
 *   199417:131529  all clear
 *   199414:130087  three fault kinds
 *   199417:132861  one fault kind, the other two drawn at zero
 *   199417:134216  one fault kind, drawn alone
 * All four carry the same hero; only the card below it changes. The group is
 * 199414:130115, the wave 199414:130117, the headline 199414:130118 and the
 * chips 199417:131528.
 *
 * WHY THIS EXISTS AT ALL. The fleet count used to live INSIDE the health card,
 * as a slate-100 row reading "103 systems" (199359:128709). These frames take
 * it out of the card and put it on a wave above, with three type chips beside
 * it. SystemHealthCard drops that row in the same change, so the count is
 * moved rather than duplicated — and it is not lost, which is the thing Rule 0
 * cares about.
 *
 * THE CARD OVERLAPS THE WAVE. The node has the wave at h-[189px] and pins the
 * card at top-[152px], i.e. 37px of overlap, inside a fixed h-[398px] group.
 * Reproduced here as flow, not absolutes: the wave is a block and the caller
 * pulls the card up by 37px. A fixed-height group would clip our card, whose
 * height is real data and varies with how many fault kinds are showing.
 *
 * ONE ASSET, NO TINT. The wave is the same raster the System page hero draws
 * (system-hero-wave.png, Figma's 9c2cf.png in both exports). There it sits
 * under a #ff7b7d mix-blend-color layer and reads red; here the node has no
 * tint layer at all, so the raster's own blue comes through. That is the whole
 * difference between the two heroes.
 *
 * TOKENS — Phase 3, docs/TOKENIZATION-PLAN.md (2026-10-21). Every
 * `var(--x, #hex)` in this file has been rewritten to the Tailwind utility
 * that paints the same value, and the fallback DELETED. The fallback was a
 * second, invisible source of truth that won whenever the token was missing,
 * with no warning and no visual tell; removing it makes a missing token fail
 * loudly. Nothing below renders differently — each value was resolved per
 * call site against what it already painted.
 *
 * Any note further down about keeping Figma's escaped `\/` token names
 * VERBATIM, and about String.raw being what carries the backslash, describes
 * the state BEFORE that pass. It is still the rule if an escaped name is ever
 * pasted back in from Figma — but no live class string in this file carries
 * one now, and a fresh paste should resolve the fallback hex to a utility.
 */
import { BrandDrops, FloodLine, PhotoSensor3 } from '@/v2/icons'
import { SYSTEM_TYPE } from '@/data/systemType'
import { cn } from '@/lib/utils'
import wave from '@/assets/system-hero-wave.png'


/* 199414:130120 / :130123 / :130126 — all three identical but for width, which
   the node sizes to its own numeral. Here they size to content, so a four-digit
   count does not clip. */
/* The plate is a translucent veil of the hero's own ink, not a surface in
   its own right: what the numerals actually read against is the blue the
   veil lifts. `light` keeps the literal byte for byte (pixel parity);
   every other theme computes the same 28% veil from --ink-on-color, so
   the value is no longer frozen. Under `contrast` --ink-on-color is dark,
   so the veil goes dark there too and the pair stays coherent. */
const CHIP = String.raw`content-stretch flex gap-[8px] h-[32px] items-center justify-between px-[9px] relative rounded-[18px] bg-[rgba(241,245,249,0.28)] [[data-theme]:not([data-theme=light])_&]:bg-[color-mix(in_oklab,var(--ink-on-color)_28%,transparent)]`
/* `text-background` IS THE WRONG TOKEN AND ALWAYS WAS. This numeral is ink
   sitting on a coloured ground, which is precisely the case src/index.css
   keeps --ink-on-color for; --background happens to be #F4F6F9 in `light`
   and so resolved to the right pixels by coincidence. On `dark` it
   resolves to the near-black app ground and the numerals vanish into the
   veil behind them -- 2.3:1, measured.
   `light` keeps --background so this change is provably zero-pixel there;
   the two differ by (6,5,3) in sRGB, which is why the bug was invisible
   until a theme moved one of them. Reconciling `light` onto
   --ink-on-color is a one-line follow-up for a change that is allowed to
   move light pixels. */
const CHIP_NUM = String.raw`[word-break:break-word] font-['Geist:Medium','Geist','Inter',sans-serif] font-medium leading-[22.762px] relative shrink-0 text-[15.933px] text-background [[data-theme]:not([data-theme=light])_&]:text-ink-on-color whitespace-nowrap`

const fmt = (n) => Number(n ?? 0).toLocaleString('en-US')

/* The chips carry NO text label in the node — an icon and a number, nothing
   else — so the icon is the whole of their meaning. These three glyphs are
   already named in this codebase: SystemsHealthCard draws the same set under
   the heading "Systems types" as Topology / Flood / Humidity, so that is what
   they are, and the accessible name says so even though the pixels cannot. */
/* The glyph is an ELEMENT, not a component reference. eslint here has no react
   plugin, so it does not read JSX: a capitalised binding used only as <Glyph/>
   reads as unused and the build still succeeds, which is how an unimported
   component once shipped and crashed at runtime. Elements keep each icon a
   plain, visible reference. */
const TYPES = [
  { key: 'topology', name: 'Topology systems', type: SYSTEM_TYPE.FLOW, size: 19.168, glyph: <PhotoSensor3 size="100%" className="absolute inset-0 block" /> },
  { key: 'humidity', name: 'Humidity sensors', type: SYSTEM_TYPE.HUMIDITY, size: 18.21, glyph: <BrandDrops size="100%" className="absolute inset-0 block" /> },
  { key: 'flood', name: 'Flood sensors', type: SYSTEM_TYPE.FLOOD, size: 18.21, glyph: <FloodLine size="100%" className="absolute inset-0 block" /> },
]

export default function SystemsOverviewHero({
  total = 0,
  unitLabel = 'systems',
  /** { topology, humidity, flood } — the counts the page already derives. */
  systemTypes,
  /** Called with a SYSTEM_TYPE when a chip is tapped. Omit and the chips stay
      inert, which is what the frame draws. */
  onSelectType,
  className,
}) {
  const counts = systemTypes ?? {}
  const unit = Number(total) === 1 ? unitLabel.replace(/s$/, '') : unitLabel

  return (
    <div
      className={cn('relative shrink-0 w-full h-[189px]', className)}
      data-node-id="199414:130115"
      data-name="Systems overview hero"
    >
      {/* 199414:130117. aria-hidden: weather, not information.

          THE BLEND MODE IS THEME-CONDITIONAL, AND IT HAS TO BE.
          `multiply` is `result = backdrop x source`. In `light` the backdrop
          is --background (#F4F6F9, L=0.957), so the composite works out to
          roughly `0.096 + 0.861 x raster` — i.e. the raster itself, very
          slightly lifted and washed. On a dark ground the backdrop is ~0.09
          and the same expression collapses to `0.009 + 0.081 x raster`: a
          near-black rectangle carrying about 0.3% of a stop. Measured before
          this change, the layer's own internal dynamic range was 1.10:1 under
          dark against 3.14:1 under light. The water art was gone.

          The fix is NOT a scrim and NOT a second asset. Note what the crop of
          this raster actually contains: the <img> below is scaled to 143.88%
          and offset by -17%/-65%, so the visible region is ENTIRELY wave —
          there is no white ground inside this box to knock out. `multiply`
          was never knocking anything out here; it was only tinting the raster
          toward the page. So on every theme but `light` the blend simply goes
          away and the raster paints itself, at the opacity-90 it already has:
          `0.1 x backdrop + 0.9 x raster`.

          That is also, for free, exactly what Apple's HIG asks for -- "if you
          display a content image that includes a white background, consider
          slightly darkening the image to prevent the background from glowing",
          i.e. dim, do not scrim. Compare the two expressions term by term:
          light maps the raster into [0.096, 0.957], dark into [0.009, 0.909].
          The dark composite is UNIFORMLY slightly darker than the light one at
          every input value, so the hero does not glare, and its range widens
          rather than collapsing.

          `light` keeps `mix-blend-multiply` untouched and is pixel-identical.
          The variant is written as "any theme that declares one and is not
          light" rather than naming dark/sand/contrast, so a theme added later
          is handled without editing this file — and a document with no
          data-theme at all (SSR, jsdom) still gets the `light` path. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 mix-blend-multiply [[data-theme]:not([data-theme=light])_&]:mix-blend-normal pointer-events-none rounded-[17px] overflow-hidden"
        data-node-id="199414:130117"
      >
        <img
          alt=""
          src={wave}
          className="absolute h-[180.61%] left-[-17.03%] max-w-none top-[-65.08%] w-[143.88%] opacity-90"
        />
      </div>

      {/* 199414:130118. The node pins this at `left-[calc(50%-64px)]` with a
          -50% translate, which resolves to a left edge of about 36px on its own
          370px box. Expressed as a plain left inset instead: the frame is 402
          wide and ours is 393, so anything tied to 50% lands somewhere the
          design never showed, and the chips below it are left-anchored anyway. */}
      <p
        className={cn(
          '[word-break:break-word] absolute left-[36px] top-[41px] whitespace-nowrap text-ink-on-color text-[34.646px]',
          'font-sans',
          String.raw`font-semibold`,
        )}
        dir="auto"
        data-node-id="199414:130118"
      >
        <span className="leading-[39.37px]">{`${fmt(total)} `}</span>
        <span className={cn('font-sans', 'font-normal leading-[39.37px]')}>{unit}</span>
      </p>

      {/* 199417:131528 — the three chips, left-anchored at the node's own 21px
          inset. They are a row rather than three absolutes at left-21/111/199,
          because those offsets were measured against the node's own numerals;
          a four-digit count would overlap its neighbour. */}
      <div
        className="absolute flex gap-[11px] items-center left-[21px] top-[96px]"
        data-node-id="199417:131528"
      >
        {TYPES.map(({ key, name, type, glyph, size }) => {
          const count = Number(counts[key]) || 0
          /* A chip reading 0 would route to an empty table — a dead end
             dressed as a control. It stays a picture until there is something
             behind it, and keeps its label so assistive tech still reads the
             count. Today that is flood and humidity, which this dataset has
             none of; the chip wakes up on its own when it does. */
          const live = count > 0 && typeof onSelectType === 'function'
          const inner = (
            <>
              <span
                aria-hidden="true"
                className="relative shrink-0 text-ink-on-color"
                style={{ width: size, height: size }}
              >
                {glyph}
              </span>
              <span className={CHIP_NUM} dir="auto">{fmt(count)}</span>
            </>
          )
          return live ? (
            <button
              key={key}
              type="button"
              onClick={() => onSelectType(type)}
              aria-label={`${name}: ${fmt(count)}. Show these in the Systems tab.`}
              className={cn(
                CHIP,
                'cursor-pointer appearance-none border-0 transition-colors',
                'hover:bg-[rgba(241,245,249,0.42)] active:opacity-80',
                'outline-none focus-visible:ring-[3px] focus-visible:ring-white/70',
              )}
            >
              {inner}
            </button>
          ) : (
            <span key={key} className={CHIP} role="img" aria-label={`${name}: ${fmt(count)}`}>
              {inner}
            </span>
          )
        })}
      </div>
    </div>
  )
}
