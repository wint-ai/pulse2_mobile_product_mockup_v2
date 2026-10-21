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
import { cn } from '@/lib/utils'
import wave from '@/assets/system-hero-wave.png'


/* 199414:130120 / :130123 / :130126 — all three identical but for width, which
   the node sizes to its own numeral. Here they size to content, so a four-digit
   count does not clip. */
const CHIP = String.raw`content-stretch flex gap-[8px] h-[32px] items-center justify-between px-[9px] relative rounded-[18px] bg-[rgba(241,245,249,0.28)]`
const CHIP_NUM = String.raw`[word-break:break-word] font-['Geist:Medium','Geist','Inter',sans-serif] font-medium leading-[22.762px] relative shrink-0 text-[15.933px] text-background whitespace-nowrap`

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
  { key: 'topology', name: 'Topology systems', size: 19.168, glyph: <PhotoSensor3 size="100%" className="absolute inset-0 block" /> },
  { key: 'humidity', name: 'Humidity sensors', size: 18.21, glyph: <BrandDrops size="100%" className="absolute inset-0 block" /> },
  { key: 'flood', name: 'Flood sensors', size: 18.21, glyph: <FloodLine size="100%" className="absolute inset-0 block" /> },
]

export default function SystemsOverviewHero({
  total = 0,
  unitLabel = 'systems',
  /** { topology, humidity, flood } — the counts the page already derives. */
  systemTypes,
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
      {/* 199414:130117. aria-hidden: weather, not information. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 mix-blend-multiply pointer-events-none rounded-[17px] overflow-hidden"
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
        {TYPES.map(({ key, name, glyph, size }) => (
          <span key={key} className={CHIP} role="img" aria-label={`${name}: ${fmt(counts[key])}`}>
            <span
              aria-hidden="true"
              className="relative shrink-0 text-ink-on-color"
              style={{ width: size, height: size }}
            >
              {glyph}
            </span>
            <span className={CHIP_NUM} dir="auto">{fmt(counts[key])}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
